import * as THREE from "three";
import { getHousingFootprint } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem } from "@/lib/housing/types";
import { createFurniture, createResident, createRoomShell } from "./housing-three-models";

export type RoomView = {
  inventory: HousingInventoryItem[];
  catalog: HousingCatalogItem[];
  wallpaper: string;
  floor: string;
  selectedId: string | null;
  editing: boolean;
};
export type ProjectedArea = { left: number; top: number; width: number; height: number; polygon?: string };
export type RoomProjection = { furniture: Record<string, ProjectedArea>; tiles: ProjectedArea[] };

function dispose(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
    material.dispose();
  });
}

/** One on-demand renderer per room. No animation loop or network assets. */
export function createHousingScene(host: HTMLDivElement, onProjection: (value: RoomProjection) => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, .1, 80);
  camera.position.set(12, 10, 12);
  camera.lookAt(3, .9, 3);
  scene.add(new THREE.HemisphereLight(0xfff9e9, 0x9a9d85, 2.5));
  const sun = new THREE.DirectionalLight(0xfff4d9, 4);
  sun.position.set(-3, 8, 5);
  sun.target.position.set(3, 0, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 30 });
  sun.shadow.normalBias = .035;
  sun.shadow.bias = -.00015;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xe8f0df, 1.2);
  fill.position.set(8, 5, -2);
  scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.31;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(6, 6, 0x82927b, 0xa0ac94);
  grid.position.set(3, .045, 3);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = .28;
  gridMaterial.depthWrite = false;
  scene.add(grid);
  const resident = createResident();
  scene.add(resident);
  const selection = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x9ab57d, transparent: true, opacity: .35, depthWrite: false }));
  selection.rotation.x = -Math.PI / 2;
  scene.add(selection);
  let room: THREE.Group | undefined;
  let roomKey = "";
  let view: RoomView | undefined;
  let disposed = false;
  let failed = false;
  let frame = 0;
  const objects = new Map<string, THREE.Group>();
  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.045);

  function project(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x + 1) * 50, y: (1 - v.y) * 50 };
  }
  function area(points: { x: number; y: number }[], polygon = false): ProjectedArea {
    const left = Math.min(...points.map((v) => v.x));
    const top = Math.min(...points.map((v) => v.y));
    const width = Math.max(...points.map((v) => v.x)) - left;
    const height = Math.max(...points.map((v) => v.y)) - top;
    return { left, top, width, height, ...(polygon ? { polygon: `polygon(${points.map((p) => `${(p.x - left) / width * 100}% ${(p.y - top) / height * 100}%`).join(",")})` } : {}) };
  }
  function draw() {
    frame = 0;
    if (disposed || failed || !view) return;
    try {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      const vertical = Math.max(8.7, 10.5 / aspect);
      camera.left = -vertical * aspect / 2;
      camera.right = vertical * aspect / 2;
      camera.top = vertical / 2;
      camera.bottom = -vertical / 2;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
      const furniture: Record<string, ProjectedArea> = {};
      objects.forEach((object, id) => {
        const bounds = new THREE.Box3().setFromObject(object);
        const points = [];
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) points.push(project(x, y, z));
        furniture[id] = area(points);
      });
      const tiles = Array.from({ length: 36 }, (_, i) => {
        const x = i % 6, z = Math.floor(i / 6);
        return area([project(x, .045, z), project(x + 1, .045, z), project(x + 1, .045, z + 1), project(x, .045, z + 1)], true);
      });
      onProjection({ furniture, tiles });
    } catch { fail(); }
  }
  function schedule() { if (!frame && !disposed && !failed) frame = requestAnimationFrame(draw); }
  function fail() { if (!disposed && !failed) { failed = true; onFailure(); } }
  function contextLost(event: Event) { event.preventDefault(); fail(); }
  canvas.addEventListener("webglcontextlost", contextLost);
  const observer = new ResizeObserver(schedule);
  observer.observe(host);

  return {
    pick(clientX: number, clientY: number): { inventoryId: string } | { x: number; y: number } | null {
      if (disposed || failed) return null;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = raycaster.intersectObjects([...objects.values()], true)[0];
      if (hit) {
        let object: THREE.Object3D | null = hit.object;
        while (object) {
          const inventoryId = object.userData.inventoryId;
          if (typeof inventoryId === "string") return { inventoryId };
          object = object.parent;
        }
      }
      const floorPoint = raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
      if (!floorPoint || floorPoint.x < 0 || floorPoint.z < 0 || floorPoint.x >= 6 || floorPoint.z >= 6) return null;
      return { x: Math.floor(floorPoint.x), y: Math.floor(floorPoint.z) };
    },
    update(next: RoomView) {
      if (disposed || failed) return;
      view = next;
      const nextRoomKey = `${next.wallpaper}/${next.floor}`;
      if (roomKey !== nextRoomKey) {
        if (room) { scene.remove(room); dispose(room); }
        room = createRoomShell(next.wallpaper, next.floor);
        scene.add(room);
        roomKey = nextRoomKey;
      }
      const placed = new Set<string>();
      const occupied = new Set<string>();
      selection.visible = false;
      for (const item of next.inventory) {
        if (item.x === null || item.y === null) continue;
        const catalog = next.catalog.find((entry) => entry.id === item.catalogId);
        if (!catalog) continue;
        placed.add(item.id);
        const size = getHousingFootprint(catalog, item.rotation);
        let model = objects.get(item.id);
        if (!model) { model = createFurniture(catalog.visualKey); model.userData.inventoryId = item.id; objects.set(item.id, model); scene.add(model); }
        model.position.set(item.x + size.width / 2, 0, item.y + size.depth / 2);
        model.rotation.y = -item.rotation * Math.PI / 2;
        for (let dx = 0; dx < size.width; dx++) for (let dz = 0; dz < size.depth; dz++) occupied.add(`${item.x + dx}/${item.y + dz}`);
        if (item.id === next.selectedId) {
          selection.visible = true;
          selection.scale.set(size.width - .05, size.depth - .05, 1);
          selection.position.set(model.position.x, .05, model.position.z);
        }
      }
      objects.forEach((model, id) => { if (!placed.has(id)) { scene.remove(model); dispose(model); objects.delete(id); } });
      // The resident stands on a free tile, so furniture can occupy every tile.
      const free = [[3, 4], [2, 4], [3, 3], ...Array.from({ length: 36 }, (_, i) => [i % 6, Math.floor(i / 6)])].find(([x, z]) => !occupied.has(`${x}/${z}`));
      resident.visible = !!free;
      if (free) resident.position.set(free[0] + .5, 0, free[1] + .5);
      grid.visible = next.editing;
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      dispose(scene);
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
