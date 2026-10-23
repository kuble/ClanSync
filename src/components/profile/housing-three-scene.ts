import * as THREE from "three";
import { getHousingFootprint } from "@/lib/housing/domain";
import type { HousingCatalogItem, HousingInventoryItem, HousingSurface } from "@/lib/housing/types";
import { createFurniture, createResident, createRoomShell } from "./housing-three-models";

export type RoomView = {
  inventory: HousingInventoryItem[];
  catalog: HousingCatalogItem[];
  wallpaper: string;
  floor: string;
  selectedId: string | null;
  editing: boolean;
  theme: "light" | "dark";
};
export type ProjectedArea = { left: number; top: number; width: number; height: number; polygon?: string };
export type RoomProjection = { furniture: Record<string, ProjectedArea>; tiles: ProjectedArea[]; wallTiles: Record<"wall-left" | "wall-right", ProjectedArea[]> };
export type HousingDragPreview = { inventoryId: string; x: number; y: number; surface: HousingSurface; valid: boolean };
export type HousingSurfacePoint = { x: number; y: number; surface: HousingSurface };

const WALL_BOTTOM = .3;
const WALL_ROW_HEIGHT = .7;

function surfacePosition(surface: HousingSurface, x: number, y: number, offset = .045): THREE.Vector3 {
  if (surface === "wall-left") return new THREE.Vector3(offset, WALL_BOTTOM + y * WALL_ROW_HEIGHT, 6 - x);
  if (surface === "wall-right") return new THREE.Vector3(x, WALL_BOTTOM + y * WALL_ROW_HEIGHT, offset);
  return new THREE.Vector3(x, offset, y);
}

function positionFurniture(model: THREE.Group, item: { x: number; y: number; rotation: number; surface: HousingSurface }, catalog: HousingCatalogItem, ghost = false) {
  const size = getHousingFootprint(catalog, item.rotation);
  const isWall = item.surface !== "floor";
  const offset = isWall ? (catalog.wallLayer === "curtain" ? .2 : .035) : 0;
  model.position.copy(surfacePosition(item.surface, item.x + size.width / 2, item.y + size.depth / 2, offset + (ghost ? .035 : 0)));
  model.rotation.set(0, item.surface === "wall-left" ? Math.PI / 2 : isWall ? 0 : -item.rotation * Math.PI / 2, 0);
}

function positionFootprint(footprint: THREE.Mesh, surface: HousingSurface, x: number, y: number, width: number, depth: number) {
  footprint.position.copy(surfacePosition(surface, x + width / 2, y + depth / 2, .052));
  footprint.rotation.set(surface === "floor" ? -Math.PI / 2 : 0, surface === "wall-left" ? Math.PI / 2 : 0, 0);
  footprint.scale.set(width - .035, (surface === "floor" ? depth : depth * WALL_ROW_HEIGHT) - .035, 1);
}

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
  camera.lookAt(3, 1.2, 3);
  const ambient = new THREE.HemisphereLight(0xfff9e9, 0x9a9d85, 2.5);
  scene.add(ambient);
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
  const nightLamp = new THREE.PointLight(0xffc58a, 0, 9, 1.5);
  nightLamp.position.set(3.3, 2.9, 3.7);
  scene.add(nightLamp);
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
  const wallGrids = new THREE.Group();
  for (const surface of ["wall-left", "wall-right"] as const) {
    const points: THREE.Vector3[] = [];
    for (let x = 0; x <= 6; x++) points.push(surfacePosition(surface, x, 0, .025), surfacePosition(surface, x, 4, .025));
    for (let y = 0; y <= 4; y++) points.push(surfacePosition(surface, 0, y, .025), surfacePosition(surface, 6, y, .025));
    wallGrids.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xa0ac94, transparent: true, opacity: .25, depthWrite: false })));
  }
  scene.add(wallGrids);
  const resident = createResident();
  scene.add(resident);
  const selection = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x9ab57d, transparent: true, opacity: .35, depthWrite: false }));
  selection.rotation.x = -Math.PI / 2;
  scene.add(selection);
  const dragFootprint = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x72965b, transparent: true, opacity: .5, depthWrite: false }));
  dragFootprint.rotation.x = -Math.PI / 2;
  dragFootprint.visible = false;
  scene.add(dragFootprint);
  let room: THREE.Group | undefined;
  let roomKey = "";
  let view: RoomView | undefined;
  let disposed = false;
  let failed = false;
  let frame = 0;
  let dragPreview: HousingDragPreview | null = null;
  let dragGhost: THREE.Group | undefined;
  let dragGhostKey: string | undefined;
  const objects = new Map<string, THREE.Group>();
  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.045);
  const leftPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -.045);
  const rightPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.045);

  function pointerRay(clientX: number, clientY: number) {
    if (disposed || failed) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
    return true;
  }
  function wallIntersection(): { point: HousingSurfacePoint; distance: number } | null {
    let nearest: { point: HousingSurfacePoint; distance: number } | null = null;
    for (const [surface, plane] of [["wall-left", leftPlane], ["wall-right", rightPlane]] as const) {
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) continue;
      const x = surface === "wall-left" ? 6 - hit.z : hit.x;
      const y = (hit.y - WALL_BOTTOM) / WALL_ROW_HEIGHT;
      if (x < 0 || x >= 6 || y < 0 || y >= 4) continue;
      const distance = raycaster.ray.origin.distanceToSquared(hit);
      if (!nearest || distance < nearest.distance) nearest = { point: { x, y, surface }, distance };
    }
    return nearest;
  }

  function restoreSelection() {
    const selectedId = view?.selectedId;
    const item = view?.inventory.find((entry) => entry.id === selectedId);
    const model = item ? objects.get(item.id) : undefined;
    const catalog = item ? view?.catalog.find((entry) => entry.id === item.catalogId) : undefined;
    selection.visible = !!(item && model && catalog);
    if (!item || !model || !catalog) return;
    const size = getHousingFootprint(catalog, item.rotation);
    positionFootprint(selection, item.surface ?? "floor", item.x!, item.y!, size.width, size.depth);
  }
  function clearPreview() {
    dragPreview = null;
    if (dragGhost) { scene.remove(dragGhost); dispose(dragGhost); }
    dragGhost = undefined;
    dragGhostKey = undefined;
    dragFootprint.visible = false;
    objects.forEach((model) => { model.visible = true; });
    restoreSelection();
  }
  function applyPreview() {
    if (!dragPreview || !view?.editing) { clearPreview(); return; }
    const preview = dragPreview;
    const item = view.inventory.find((entry) => entry.id === preview.inventoryId);
    const catalog = item ? view.catalog.find((entry) => entry.id === item.catalogId) : undefined;
    if (!item || !catalog || !Number.isFinite(dragPreview.x) || !Number.isFinite(dragPreview.y)) { clearPreview(); return; }
    const nextGhostKey = `${item.id}/${catalog.visualKey === "wall-window" ? view.theme : ""}`;
    if (dragGhostKey !== nextGhostKey) {
      if (dragGhost) { scene.remove(dragGhost); dispose(dragGhost); }
      dragGhost = createFurniture(catalog.visualKey, view.theme);
      dragGhostKey = nextGhostKey;
      const materials = new Set<THREE.Material>();
      dragGhost.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = false;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      });
      materials.forEach((material) => { material.transparent = true; material.opacity *= .75; material.depthWrite = false; });
      scene.add(dragGhost);
    }
    // Original models remain in place for stable keyboard targets and picking.
    objects.forEach((model, id) => { model.visible = id !== item.id; });
    const size = getHousingFootprint(catalog, item.rotation);
    positionFurniture(dragGhost!, { ...preview, rotation: item.rotation }, catalog, true);
    dragFootprint.visible = true;
    positionFootprint(dragFootprint, preview.surface, preview.x, preview.y, size.width, size.depth);
    dragFootprint.material.color.set(dragPreview.valid ? 0x72965b : 0xc96054);
    selection.visible = false;
  }

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
      const vertical = Math.max(9.6, 10.5 / aspect);
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
      const wallTiles = Object.fromEntries((["wall-left", "wall-right"] as const).map((surface) => [surface, Array.from({ length: 24 }, (_, i) => {
        const x = i % 6, y = Math.floor(i / 6);
        return area([[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([px, py]) => {
          const point = surfacePosition(surface, px, py);
          return project(point.x, point.y, point.z);
        }), true);
      })])) as RoomProjection["wallTiles"];
      onProjection({ furniture, tiles, wallTiles });
    } catch { fail(); }
  }
  function schedule() { if (!frame && !disposed && !failed) frame = requestAnimationFrame(draw); }
  function fail() { if (!disposed && !failed) { failed = true; clearPreview(); onFailure(); } }
  function contextLost(event: Event) { event.preventDefault(); fail(); }
  canvas.addEventListener("webglcontextlost", contextLost);
  const observer = new ResizeObserver(schedule);
  observer.observe(host);

  return {
    floorPoint(clientX: number, clientY: number): { x: number; y: number } | null {
      if (!pointerRay(clientX, clientY)) return null;
      const point = raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
      return point ? { x: point.x, y: point.z } : null;
    },
    placementPoint(clientX: number, clientY: number, mount: "floor" | "wall"): HousingSurfacePoint | null {
      if (!pointerRay(clientX, clientY)) return null;
      if (mount === "wall") return wallIntersection()?.point ?? null;
      const point = raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
      return point ? { x: point.x, y: point.z, surface: "floor" } : null;
    },
    preview(next: HousingDragPreview | null) {
      if (disposed || failed) return;
      dragPreview = next;
      applyPreview();
      schedule();
    },
    pick(clientX: number, clientY: number): { inventoryId: string } | HousingSurfacePoint | null {
      if (!pointerRay(clientX, clientY)) return null;
      const hit = raycaster.intersectObjects([...objects.values()], true)[0];
      if (hit) {
        let object: THREE.Object3D | null = hit.object;
        while (object) {
          const inventoryId = object.userData.inventoryId;
          if (typeof inventoryId === "string") return { inventoryId };
          object = object.parent;
        }
      }
      const wallPoint = wallIntersection();
      const floorPoint = raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
      if (floorPoint && floorPoint.x >= 0 && floorPoint.z >= 0 && floorPoint.x < 6 && floorPoint.z < 6
        && (!wallPoint || raycaster.ray.origin.distanceToSquared(floorPoint) < wallPoint.distance)) {
        return { x: Math.floor(floorPoint.x), y: Math.floor(floorPoint.z), surface: "floor" };
      }
      return wallPoint ? { ...wallPoint.point, x: Math.floor(wallPoint.point.x), y: Math.floor(wallPoint.point.y) } : null;
    },
    update(next: RoomView) {
      if (disposed || failed) return;
      view = next;
      const night = next.theme === "dark";
      renderer.setClearColor(night ? 0x151e2d : 0xe6ebdf, 1);
      renderer.toneMappingExposure = night ? 1.1 : 1.15;
      ambient.color.set(night ? 0x8b9ac5 : 0xfff9e9);
      ambient.groundColor.set(night ? 0x293341 : 0x9a9d85);
      ambient.intensity = night ? 1.5 : 2.5;
      sun.color.set(night ? 0xb3c6f1 : 0xfff4d9);
      sun.intensity = night ? 1.6 : 4;
      fill.color.set(night ? 0xffc58a : 0xe8f0df);
      fill.intensity = night ? .9 : 1.2;
      nightLamp.intensity = night ? 5 : 0;
      ground.material.opacity = night ? .26 : .12;
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
        if (model && catalog.visualKey === "wall-window" && model.userData.theme !== next.theme) {
          scene.remove(model); dispose(model); objects.delete(item.id); model = undefined;
        }
        if (!model) {
          model = createFurniture(catalog.visualKey, next.theme);
          model.userData.inventoryId = item.id; model.userData.theme = next.theme;
          objects.set(item.id, model); scene.add(model);
        }
        positionFurniture(model, { ...item, x: item.x, y: item.y, surface: item.surface ?? "floor" }, catalog);
        if (!item.surface || item.surface === "floor") {
          for (let dx = 0; dx < size.width; dx++) for (let dz = 0; dz < size.depth; dz++) occupied.add(`${item.x + dx}/${item.y + dz}`);
        }
      }
      objects.forEach((model, id) => { if (!placed.has(id)) { scene.remove(model); dispose(model); objects.delete(id); } });
      // The resident stands on a free tile, so furniture can occupy every tile.
      const free = [[3, 4], [2, 4], [3, 3], ...Array.from({ length: 36 }, (_, i) => [i % 6, Math.floor(i / 6)])].find(([x, z]) => !occupied.has(`${x}/${z}`));
      resident.visible = !!free;
      if (free) resident.position.set(free[0] + .5, 0, free[1] + .5);
      grid.visible = next.editing;
      wallGrids.visible = next.editing;
      applyPreview();
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      clearPreview();
      dispose(scene);
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
