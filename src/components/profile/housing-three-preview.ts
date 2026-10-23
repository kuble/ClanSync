import * as THREE from "three";
import { createFurniture, disposeObject } from "./housing-three-models";

const IMAGE_SIZE = 384;
const images = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<void> = Promise.resolve();
let renderer: THREE.WebGLRenderer | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let unavailableUntil = 0;

function releaseRenderer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = null;
}

function getRenderer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  if (renderer?.getContext().isContextLost()) releaseRenderer();
  if (!renderer) {
    if (Date.now() < unavailableUntil) throw new Error("Furniture preview unavailable");
    let next: THREE.WebGLRenderer;
    try {
      next = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    } catch (error) {
      // Unsupported devices should keep their illustrations without retrying every card.
      unavailableUntil = Date.now() + 60_000;
      throw error;
    }
    next.setPixelRatio(1);
    next.setSize(IMAGE_SIZE, IMAGE_SIZE, false);
    next.setClearColor(0x000000, 0);
    next.outputColorSpace = THREE.SRGBColorSpace;
    next.toneMapping = THREE.ACESFilmicToneMapping;
    next.toneMappingExposure = 1.15;
    next.shadowMap.enabled = true;
    next.shadowMap.type = THREE.PCFShadowMap;
    renderer = next;
  }
  return renderer;
}

function disposeScene(scene: THREE.Scene) {
  disposeObject(scene);
  scene.traverse((object) => {
    if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
  });
  scene.clear();
}

function contactShadow(width: number, depth: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(48, 48, 4, 48, 48, 48);
  gradient.addColorStop(0, "rgba(71, 69, 50, 0.2)");
  gradient.addColorStop(0.55, "rgba(71, 69, 50, 0.08)");
  gradient.addColorStop(1, "rgba(71, 69, 50, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.45, depth * 1.45), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  return shadow;
}

function frameCamera(bounds: THREE.Box3, wallMounted = false) {
  const center = bounds.getCenter(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
  camera.position.copy(center).add(wallMounted ? new THREE.Vector3(2.8, 1.5, 9) : new THREE.Vector3(8, 6.4, 8));
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const projected = new THREE.Box3();
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
    }
  }
  const size = projected.getSize(new THREE.Vector3());
  const middle = projected.getCenter(new THREE.Vector3());
  const half = Math.max(size.x, size.y, 0.5) * 0.63;
  camera.left = middle.x - half;
  camera.right = middle.x + half;
  camera.top = middle.y + half;
  camera.bottom = middle.y - half;
  camera.updateProjectionMatrix();
  return camera;
}

function renderPreview(code: string, rotation: number) {
  const previewRenderer = getRenderer();
  const scene = new THREE.Scene();
  const wallMounted = code.startsWith("wall-");
  try {
    const model = createFurniture(code);
    model.rotation.y = -rotation * Math.PI / 2;
    scene.add(model);
    let bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y, -center.z);
    bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 1);
    scene.add(new THREE.HemisphereLight(0xfff9e9, 0x9a9d85, 2.5));
    const key = new THREE.DirectionalLight(0xfff4d9, 4);
    key.position.set(-3, 8, 5);
    key.target.position.set(0, size.y / 2, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -span * 1.5;
    key.shadow.camera.right = key.shadow.camera.top = span * 1.5;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 30;
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.00015;
    key.shadow.radius = 3;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xe8f0df, 1.2);
    fill.position.set(8, 5, -2);
    scene.add(fill);
    if (!wallMounted) {
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(span * 5, span * 5), new THREE.ShadowMaterial({ color: 0x6c6951, opacity: 0.2 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.005;
      ground.receiveShadow = true;
      scene.add(ground);
      const contact = contactShadow(size.x, size.z);
      if (contact) scene.add(contact);
    }
    previewRenderer.render(scene, frameCamera(bounds, wallMounted));
    if (previewRenderer.getContext().isContextLost()) throw new Error("Furniture preview context lost");
    return previewRenderer.domElement.toDataURL("image/png");
  } finally {
    disposeScene(scene);
    idleTimer = setTimeout(releaseRenderer, 2_000);
  }
}

export async function getFurniturePreview(code: string, rotation = 0): Promise<string> {
  const turn = ((Math.trunc(rotation) % 4) + 4) % 4;
  const key = `${code}:${turn}`;
  const cached = images.get(key);
  if (cached) return cached;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const result = queue.then(async () => {
    // Yield between thumbnails so opening the shop does not block its controls.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      const image = renderPreview(code, turn);
      images.set(key, image);
      return image;
    } catch (error) {
      releaseRenderer();
      throw error;
    } finally {
      pending.delete(key);
    }
  });
  pending.set(key, result);
  queue = result.then(() => {}, () => {});
  return result;
}
