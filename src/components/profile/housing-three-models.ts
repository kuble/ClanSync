import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Point = readonly [number, number, number];
const C = {
  oak: "#c8a779", lightOak: "#dfc7a1", edge: "#b18a5e", ivory: "#f4eee0",
  linen: "#e5dfcc", sage: "#a7b99c", sageDark: "#879d7d", olive: "#65765b",
  coral: "#d6a18b", clay: "#bd8266", charcoal: "#424940", dark: "#293b35",
  gold: "#c8aa64", paper: "#f7f0da", soil: "#6a5340", green: "#719068",
};

/** Each model owns its materials, so changing one item never invalidates another. */
class Model {
  readonly group = new THREE.Group();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();

  material(color: string, roughness = .8, metalness = 0) {
    const key = `${color}:${roughness}:${metalness}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      this.materials.set(key, material);
    }
    return material;
  }

  mesh(geometry: THREE.BufferGeometry, color: string, position: Point, roughness = .8, metalness = 0) {
    const mesh = new THREE.Mesh(geometry, this.material(color, roughness, metalness));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  box(size: Point, position: Point, color: string, radius = .025) {
    const geometry = radius > 0
      ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((value) => value / 3)))
      : new THREE.BoxGeometry(...size);
    return this.mesh(geometry, color, position);
  }

  cylinder(top: number, bottom: number, height: number, position: Point, color: string, segments = 24) {
    return this.mesh(new THREE.CylinderGeometry(top, bottom, height, segments), color, position);
  }

  sphere(scale: Point, position: Point, color: string) {
    const sphere = this.mesh(new THREE.SphereGeometry(1, 20, 14), color, position);
    sphere.scale.set(...scale);
    return sphere;
  }

  rod(start: Point, end: Point, radius: number, color: string) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const rod = this.cylinder(radius, radius, direction.length(), [0, 0, 0], color, 12);
    rod.position.copy(a.add(b).multiplyScalar(.5));
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return rod;
  }

  ring(radius: number, tube: number, position: Point, color: string) {
    return this.mesh(new THREE.TorusGeometry(radius, tube, 8, 32), color, position);
  }
}

function legs(m: Model, width: number, depth: number, height: number, color = C.edge) {
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      m.rod([x, height, z], [x * 1.06, .03, z * 1.06], .035, color);
    }
  }
}

function mug(m: Model, x: number, y: number, z: number, color = C.ivory, size = 1) {
  m.cylinder(.058 * size, .049 * size, .1 * size, [x, y + .05 * size, z], color);
  m.cylinder(.047 * size, .047 * size, .004, [x, y + .103 * size, z], "#73523b");
  const handle = m.ring(.034 * size, .009 * size, [x + .065 * size, y + .058 * size, z], color);
  handle.rotation.y = Math.PI / 2;
}

function book(m: Model, x: number, y: number, z: number, width: number, height: number, color: string) {
  m.box([width, height, .2], [x, y + height / 2, z], color, .006);
  m.box([width * .6, .012, .003], [x, y + height * .72, z + .102], C.paper, .001);
  m.box([width * .6, .008, .003], [x, y + height * .66, z + .102], C.paper, .001);
}

function bookRow(m: Model, x: number, y: number, z: number, count = 5, scale = 1) {
  const colors = [C.sage, C.coral, C.paper, "#849c9a", C.edge, "#bfc3a6"];
  for (let i = 0; i < count; i++) {
    book(m, x + i * .115 * scale, y, z, .085 * scale, (.3 + (i % 3) * .07) * scale, colors[i % colors.length]);
  }
}

function plant(m: Model, x: number, y: number, z: number, scale = 1, potColor = C.clay) {
  m.cylinder(.2 * scale, .14 * scale, .32 * scale, [x, y + .16 * scale, z], potColor);
  m.cylinder(.214 * scale, .214 * scale, .055 * scale, [x, y + .3 * scale, z], potColor);
  m.cylinder(.183 * scale, .183 * scale, .008, [x, y + .33 * scale, z], C.soil);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4;
    const height = (.57 + (i % 3) * .17) * scale;
    const spread = (.17 + (i % 2) * .07) * scale;
    const end: Point = [x + Math.cos(angle) * spread, y + height, z + Math.sin(angle) * spread];
    m.rod([x, y + .3 * scale, z], end, .012 * scale, C.olive);
    const leaf = m.sphere([.09 * scale, .23 * scale, .033 * scale], end, i % 2 ? C.sageDark : C.green);
    leaf.rotation.set(.38 * Math.sin(angle), -angle, -.5 * Math.cos(angle));
    const vein = m.rod(
      [end[0], end[1] - .13 * scale, end[2] + .025 * scale],
      [end[0], end[1] + .12 * scale, end[2] + .025 * scale],
      .004 * scale, "#9faf83",
    );
    vein.rotation.z = -.4 * Math.cos(angle);
  }
}

function screen(m: Model, x: number, y: number, z: number, width = .78, height = .49) {
  m.box([width * .43, .035, .27], [x, y, z + .04], C.charcoal);
  m.box([.045, .2, .045], [x, y + .1, z], C.charcoal);
  m.box([width, height, .065], [x, y + .2 + height / 2, z], C.charcoal);
  m.box([width - .055, height - .055, .008], [x, y + .2 + height / 2, z + .036], C.dark, .008);
  for (let i = 0; i < 5; i++) {
    m.box([width * (.24 + (i % 3) * .15), .012, .003],
      [x - width * .12, y + .2 + height * (.28 + i * .11), z + .043],
      i % 2 ? "#c3d3ae" : "#7aa599", .001);
  }
  m.sphere([.009, .009, .004], [x + width * .42, y + .22, z + .037], C.sage);
}

function deskBase(m: Model) {
  legs(m, 1.57, .61, .78);
  m.box([1.86, .09, .88], [0, .82, 0], C.lightOak, .04);
  m.box([1.58, .1, .055], [0, .7, -.31], C.oak, .012);
}

function trophy(m: Model, x: number, y: number, z: number, scale = 1) {
  m.box([.22 * scale, .055 * scale, .18 * scale], [x, y + .027 * scale, z], C.dark, .012);
  m.cylinder(.05 * scale, .08 * scale, .08 * scale, [x, y + .09 * scale, z], C.gold);
  m.cylinder(.022 * scale, .025 * scale, .13 * scale, [x, y + .18 * scale, z], C.gold);
  m.cylinder(.12 * scale, .045 * scale, .16 * scale, [x, y + .31 * scale, z], C.gold);
  m.cylinder(.1 * scale, .1 * scale, .008, [x, y + .395 * scale, z], "#8f7437");
  for (const side of [-1, 1]) {
    const ring = m.ring(.072 * scale, .012 * scale, [x + side * .115 * scale, y + .31 * scale, z], C.gold);
    ring.scale.y = 1.1;
  }
}

/** Origin is the footprint center, +Y is up, +Z is the front of the furniture. */
export function createFurniture(code: string): THREE.Group {
  const m = new Model();
  m.group.name = code;
  switch (code) {
    case "mint-sofa": {
      legs(m, 1.5, .58, .21);
      m.box([1.82, .22, .85], [0, .3, 0], C.sageDark, .09);
      m.box([1.67, .55, .19], [0, .68, -.31], C.sage, .085);
      for (const side of [-1, 1]) {
        m.box([.22, .4, .84], [side * .8, .51, .01], C.sage, .085);
        m.box([.66, .15, .65], [side * .35, .46, .035], "#bdc9aa", .065);
        m.box([.66, .37, .14], [side * .35, .7, -.18], "#b2c1a2", .065).rotation.x = -.11;
      }
      const pillow = m.box([.33, .33, .13], [-.46, .72, .02], C.ivory, .09);
      pillow.rotation.set(-.16, .14, -.15);
      const pillow2 = m.box([.28, .28, .13], [.5, .69, .025], C.coral, .08);
      pillow2.rotation.set(-.12, -.2, .18);
      m.box([.31, .025, .56], [.22, .55, .1], C.linen, .015);
      m.box([.31, .19, .025], [.22, .45, .39], C.linen, .01);
      for (let i = 0; i < 7; i++) m.rod([.09 + i * .043, .36, .405], [.09 + i * .043, .32, .405], .005, C.linen);
      break;
    }
    case "low-table": {
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        m.rod([Math.cos(a) * .23, .4, Math.sin(a) * .23], [Math.cos(a) * .3, .03, Math.sin(a) * .3], .035, C.edge);
      }
      m.cylinder(.43, .43, .075, [0, .44, 0], C.lightOak, 48);
      m.cylinder(.418, .418, .008, [0, .481, 0], "#e5cfac", 48);
      const magazine = m.box([.27, .024, .19], [-.12, .5, -.05], C.sage, .003);
      magazine.rotation.y = -.15;
      m.box([.19, .005, .13], [-.12, .515, -.05], C.paper, .002);
      mug(m, .18, .485, .12, C.ivory, 1.05);
      break;
    }
    case "small-plant":
      plant(m, 0, 0, 0, 1.05);
      break;
    case "oak-desk": {
      deskBase(m);
      m.box([.5, .22, .64], [-.55, .67, 0], C.oak);
      m.box([.43, .17, .025], [-.55, .67, .337], C.lightOak, .012);
      m.box([.13, .018, .025], [-.55, .7, .36], C.edge, .008);
      m.box([.43, .025, .3], [-.1, .882, .07], C.sage, .007).rotation.y = -.12;
      m.box([.36, .01, .25], [-.1, .901, .07], C.paper, .004).rotation.y = -.12;
      m.rod([.16, .909, -.04], [.3, .909, .15], .009, C.charcoal);
      bookRow(m, -.72, .87, -.22, 3, .75);
      mug(m, .63, .865, .13, C.ivory);
      plant(m, .62, .87, -.23, .3, C.ivory);
      break;
    }
    case "reading-lamp": {
      m.cylinder(.25, .27, .055, [0, .035, 0], C.ivory);
      m.cylinder(.18, .2, .035, [0, .08, 0], C.gold);
      m.rod([0, .09, 0], [0, 1.16, 0], .023, C.gold);
      m.sphere([.08, .1, .08], [0, 1.17, 0], "#fff3cf");
      m.cylinder(.18, .33, .33, [0, 1.3, 0], C.ivory, 48);
      m.cylinder(.326, .326, .015, [0, 1.135, 0], "#f8e6ba", 48);
      m.cylinder(.185, .185, .015, [0, 1.465, 0], C.linen, 48);
      m.rod([.04, 1.17, .03], [.09, 1, .07], .006, C.gold);
      m.sphere([.017, .025, .017], [.09, 1, .07], C.gold);
      break;
    }
    case "bookcase": {
      legs(m, 1.5, .56, .16);
      m.box([1.8, 1.65, .075], [0, .97, -.3], "#bc9b70");
      for (const x of [-.86, .86]) m.box([.075, 1.68, .68], [x, .98, 0], C.lightOak);
      for (const y of [.17, .69, 1.22, 1.82]) m.box([1.8, .065, .7], [0, y, 0], C.lightOak);
      m.box([.06, 1.55, .64], [.15, 1, 0], C.oak);
      bookRow(m, -.69, .205, .07, 6, 1);
      bookRow(m, .31, .725, .07, 4, 1);
      bookRow(m, -.67, 1.255, .07, 5, 1.05);
      m.box([.48, .26, .41], [-.38, .85, .06], C.sage, .025);
      m.box([.14, .075, .01], [-.38, .88, .272], C.paper, .003);
      m.cylinder(.12, .08, .24, [.52, 1.4, .03], C.coral);
      m.sphere([.13, .17, .13], [.52, 1.53, .03], C.coral);
      m.box([.36, .07, .3], [.48, .24, .1], C.coral, .006);
      m.box([.31, .05, .28], [.45, .3, .11], C.paper, .006);
      break;
    }
    case "single-bed": {
      legs(m, 1.51, 2.5, .2);
      m.box([1.8, .24, 2.76], [0, .3, 0], C.oak, .055);
      m.box([1.84, .94, .14], [0, .65, -1.29], C.lightOak, .08);
      m.box([1.69, .22, 2.56], [0, .53, .02], C.ivory, .095);
      m.box([1.72, .09, 1.75], [0, .67, .42], C.sage, .07);
      m.box([1.74, .13, .24], [0, .69, -.34], "#b8c5a7", .05);
      for (const x of [-.42, .42]) m.box([.66, .16, .47], [x, .73, -.85], C.paper, .09).rotation.y = x * .04;
      m.box([1.76, .055, .36], [0, .74, .94], C.linen, .025);
      for (let i = 0; i < 8; i++) m.box([.025, .008, .35], [-.77 + i * .22, .771, .94], "#c4bea8", .002);
      break;
    }
    case "gaming-chair": {
      m.rod([0, .14, 0], [0, .5, 0], .045, C.charcoal);
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5;
        m.rod([0, .16, 0], [Math.cos(angle) * .32, .08, Math.sin(angle) * .32], .027, C.charcoal);
        const wheel = m.cylinder(.048, .048, .04, [Math.cos(angle) * .32, .05, Math.sin(angle) * .32], C.charcoal, 16);
        wheel.rotation.z = Math.PI / 2;
      }
      m.box([.59, .13, .61], [0, .49, 0], C.sageDark, .07);
      m.box([.56, .73, .16], [0, .89, -.23], C.sage, .07).rotation.x = -.1;
      m.box([.32, .19, .09], [0, 1.13, -.11], C.ivory, .05);
      for (const x of [-.37, .37]) {
        m.rod([x, .47, -.1], [x, .73, -.1], .025, C.charcoal);
        m.box([.09, .055, .36], [x, .75, -.015], C.charcoal, .025);
      }
      m.box([.33, .14, .09], [0, .7, -.095], C.sageDark, .03);
      break;
    }
    case "dual-monitor": {
      deskBase(m);
      screen(m, -.43, .88, -.16, .79, .48);
      screen(m, .43, .88, -.16, .79, .48);
      m.box([.64, .024, .2], [-.08, .882, .25], C.ivory, .01);
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) m.box([.046, .006, .038], [-.35 + col * .067, .897, .196 + row * .052], C.linen, .003);
      }
      m.box([.25, .009, .28], [.58, .87, .23], C.sageDark, .015);
      m.sphere([.055, .033, .082], [.58, .89, .22], C.ivory);
      m.box([.25, .48, .44], [.63, .28, -.01], C.charcoal);
      m.box([.2, .41, .013], [.63, .28, .219], C.dark, .008);
      for (let i = 0; i < 3; i++) m.box([.12, .008, .004], [.63, .4 - i * .03, .228], C.sage, .002);
      break;
    }
    case "trophy-cabinet": {
      legs(m, 1.52, .56, .13);
      m.box([1.8, 1.5, .06], [0, .92, -.32], C.sageDark);
      for (const x of [-.86, .86]) m.box([.075, 1.53, .69], [x, .93, 0], C.oak);
      for (const y of [.16, .68, 1.21, 1.71]) m.box([1.81, .065, .7], [0, y, 0], C.lightOak);
      trophy(m, -.46, 1.25, 0, .8);
      trophy(m, .4, 1.25, 0, .9);
      trophy(m, 0, .72, 0, .95);
      m.box([.41, .37, .08], [-.51, .94, .08], C.gold, .01);
      m.box([.34, .3, .015], [-.51, .94, .128], C.paper, .003);
      m.sphere([.065, .065, .014], [-.51, .95, .139], C.gold);
      m.box([.47, .32, .37], [-.43, .35, .07], C.ivory, .025);
      m.box([.47, .32, .37], [.43, .35, .07], C.ivory, .025);
      for (const x of [-.43, .43]) m.box([.16, .05, .012], [x, .4, .263], C.oak, .004);
      break;
    }
    case "cat-cushion": {
      m.sphere([.43, .12, .36], [0, .13, 0], C.coral);
      m.sphere([.32, .11, .25], [0, .22, -.01], C.ivory);
      m.sphere([.19, .16, .16], [.19, .3, .12], "#e4c6a2");
      for (const x of [.08, .29]) {
        const ear = m.mesh(new THREE.ConeGeometry(.077, .14, 3), "#e4c6a2", [x, .45, .1]);
        ear.rotation.y = Math.PI / 6;
      }
      for (const x of [.13, .25]) m.rod([x - .025, .327, .26], [x + .025, .32, .265], .006, C.charcoal);
      m.sphere([.019, .012, .012], [.19, .29, .282], C.clay);
      const tail = m.ring(.15, .045, [-.16, .28, .11], "#e4c6a2");
      tail.rotation.x = Math.PI / 2;
      break;
    }
    case "arcade-machine": {
      m.box([.69, .73, .69], [0, .4, 0], C.sageDark, .035);
      m.box([.71, .59, .4], [0, 1.04, -.13], C.sage, .03);
      m.box([.56, .4, .025], [0, 1.04, .087], C.charcoal, .018);
      m.box([.49, .33, .009], [0, 1.04, .105], "#394f47", .01);
      for (let i = 0; i < 4; i++) m.box([.045, .045, .006], [-.15 + i * .1, 1.1, .113], i % 2 ? C.coral : C.gold, .002);
      m.box([.14, .025, .006], [.08, .94, .113], C.ivory, .002);
      m.box([.73, .13, .75], [0, .78, .03], C.lightOak, .03);
      m.rod([-.18, .84, .2], [-.18, .95, .2], .012, C.charcoal);
      m.sphere([.036, .036, .036], [-.18, .95, .2], C.coral);
      for (let i = 0; i < 3; i++) m.cylinder(.027, .027, .016, [.06 + i * .072, .853, .23 - (i % 2) * .07], i % 2 ? C.gold : C.coral, 16);
      m.box([.74, .2, .43], [0, 1.4, -.13], C.lightOak, .035);
      m.box([.56, .105, .01], [0, 1.4, .092], C.ivory, .008);
      for (let i = 0; i < 5; i++) m.box([.043, .05, .006], [-.17 + i * .086, 1.4, .1], C.sageDark, .005);
      m.box([.12, .14, .015], [0, .48, .355], C.charcoal, .008);
      m.box([.055, .009, .005], [0, .5, .366], C.gold, .002);
      break;
    }
    case "speaker": {
      m.box([.59, 1.14, .57], [0, .59, 0], C.oak, .045);
      m.box([.51, 1.04, .028], [0, .6, .294], C.charcoal, .022);
      for (const [y, radius] of [[.39, .18], [.88, .1]]) {
        const cone = m.cylinder(radius, radius, .035, [0, y, .323], "#60685b", 32);
        cone.rotation.x = Math.PI / 2;
        const ring = m.ring(radius * .91, .018, [0, y, .347], C.dark);
        ring.receiveShadow = true;
        m.sphere([radius * .37, radius * .37, .038], [0, y, .35], C.charcoal);
      }
      m.box([.13, .024, .007], [0, .12, .316], C.gold, .002);
      break;
    }
    case "coffee-cart": {
      for (const x of [-.76, .76]) {
        for (const z of [-.29, .29]) {
          m.rod([x, .1, z], [x, .86, z], .026, C.gold);
          const wheel = m.cylinder(.055, .055, .04, [x, .07, z], C.charcoal, 16);
          wheel.rotation.z = Math.PI / 2;
        }
      }
      m.box([1.76, .06, .78], [0, .28, 0], C.lightOak);
      m.box([1.8, .075, .84], [0, .86, 0], C.lightOak);
      m.box([.6, .39, .4], [-.39, 1.1, -.09], C.ivory, .035);
      m.box([.51, .2, .055], [-.39, 1.09, .14], "#b9bfb1", .015);
      m.cylinder(.035, .035, .04, [-.53, 1.21, .154], C.charcoal).rotation.x = Math.PI / 2;
      m.cylinder(.035, .035, .04, [-.25, 1.21, .154], C.charcoal).rotation.x = Math.PI / 2;
      m.rod([-.4, 1.12, .2], [-.4, 1.12, .31], .025, C.charcoal);
      mug(m, -.39, .91, .24, C.paper, .8);
      mug(m, .28, .901, .14, C.sage, 1.1);
      mug(m, .53, .901, .14, C.coral, 1.1);
      m.cylinder(.12, .12, .23, [.5, 1.02, -.2], C.charcoal);
      m.cylinder(.13, .13, .035, [.5, 1.15, -.2], C.oak);
      bookRow(m, -.61, .315, .09, 4, .8);
      m.box([.51, .23, .44], [.43, .43, .02], C.sage, .02);
      break;
    }
    case "record-player": {
      legs(m, .58, .56, .52);
      m.box([.8, .07, .78], [0, .52, 0], C.lightOak);
      m.box([.7, .11, .59], [0, .61, 0], C.oak, .025);
      m.cylinder(.238, .238, .018, [-.06, .676, 0], C.charcoal, 48);
      for (const radius of [.12, .16, .2]) {
        const ring = m.ring(radius, .002, [-.06, .687, 0], "#606357");
        ring.rotation.x = Math.PI / 2;
      }
      m.cylinder(.067, .067, .004, [-.06, .69, 0], C.coral, 24);
      m.cylinder(.008, .008, .025, [-.06, .705, 0], C.gold, 12);
      m.rod([.27, .72, -.2], [.17, .72, .16], .009, C.gold);
      m.box([.04, .025, .055], [.16, .716, .17], C.charcoal, .004);
      m.box([.71, .43, .035], [0, .89, -.28], C.oak, .015).rotation.x = -.13;
      m.box([.61, .34, .015], [0, .89, -.25], C.linen, .006).rotation.x = -.13;
      m.box([.56, .08, .48], [0, .25, 0], C.coral, .008);
      break;
    }
    case "star-sculpture": {
      m.cylinder(.3, .32, .085, [0, .05, 0], C.lightOak);
      m.cylinder(.21, .24, .08, [0, .13, 0], C.ivory);
      m.rod([0, .16, 0], [0, .49, 0], .025, C.gold);
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const angle = Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 ? .16 : .34;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      const star = m.mesh(new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .022, bevelThickness: .02 }), C.gold, [0, .7, -.04], .42, .28);
      star.rotation.y = -.1;
      break;
    }
    default:
      m.box([.65, .6, .65], [0, .3, 0], C.lightOak, .06);
  }
  return m.group;
}

/** Decorative frame created in local XY, with its face pointing toward +Z. */
function wallFrame(width: number, height: number, variant: number) {
  const m = new Model();
  m.box([width, height, .055], [0, 0, 0], variant % 2 ? C.edge : C.lightOak, .008);
  m.box([width - .065, height - .065, .008], [0, 0, .032], C.paper, .001);
  const artColor = [C.sageDark, C.coral, "#c6b183"][variant % 3];
  if (variant % 2 === 0) {
    m.rod([0, -height * .28, .042], [0, height * .24, .042], .006, artColor);
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const leaf = m.sphere([width * .16, height * .09, .003], [side * width * .1, (i - 1.5) * height * .12, .043], artColor);
      leaf.rotation.z = side * .55;
    }
  } else {
    m.sphere([width * .22, width * .22, .003], [0, height * .1, .043], artColor);
    m.box([width * .49, .011, .003], [0, -height * .19, .043], C.edge, .001);
    m.box([width * .3, .007, .003], [0, -height * .24, .043], C.edge, .001);
  }
  return m.group;
}

export function createRoomShell(wallpaper: string, floor: string): THREE.Group {
  const m = new Model();
  m.group.name = "room-shell";
  const wallColors: Record<string, string> = { cream: "#e8e6d5", sage: "#c4d0b9", rose: "#e1c6bb", midnight: "#606f72" };
  const floorColors: Record<string, string[]> = {
    oak: ["#e0cda9", "#e8d6b4", "#ddc8a0", "#e4d2b0", "#dfcaa6"],
    walnut: ["#9b7759", "#aa8664", "#a27e5c", "#b18e6d", "#a88262"],
    ivory: ["#e7dfcc", "#f0e8d8", "#e8e2d2", "#eee5d2", "#e5ddca"],
  };
  const colors = floorColors[floor] ?? floorColors.oak;
  const wallColor = wallColors[wallpaper] ?? wallColors.cream;
  m.box([6.24, .22, 6.24], [3, -.18, 3], C.edge, .035);
  m.box([6.18, .09, 6.18], [3, -.035, 3], C.lightOak, .015);
  if (floor === "ivory") {
    m.box([6, .015, 6], [3, .016, 3], "#d8d0bb", .001);
    for (let row = 0; row < 12; row++) {
      for (let column = 0; column < 12; column++) {
        m.box([.486, .025, .486], [column * .5 + .25, .027, row * .5 + .25], colors[(row * 3 + column * 2) % colors.length], .005);
      }
    }
  } else {
    for (let row = 0; row < 12; row++) {
      const start = row % 2 ? -.75 : 0;
      for (let segment = 0; segment < 5; segment++) {
        const from = Math.max(0, start + segment * 1.5);
        const to = Math.min(6, start + (segment + 1) * 1.5);
        if (to <= from) continue;
        m.box([to - from - .012, .025, .485], [(from + to) / 2, .022, row * .5 + .25], colors[(row + segment * 2) % colors.length], .004);
        if ((row + segment) % 3 === 0) {
          m.box([(to - from) * .58, .001, .008], [(from + to) / 2, .036, row * .5 + .18], colors[(row + segment * 2 + 1) % colors.length], .001);
        }
      }
    }
  }
  m.box([6.2, 2.8, .15], [3, 1.4, -.065], wallColor, .018);
  m.box([.15, 2.8, 6.2], [-.065, 1.4, 3], wallColor, .018);
  m.box([6.05, .115, .055], [3, .105, .035], C.ivory, .008);
  m.box([.055, .115, 6.05], [.035, .105, 3], C.ivory, .008);
  m.box([6.17, .055, .19], [3, 2.806, -.06], C.linen, .009);
  m.box([.19, .055, 6.17], [-.06, 2.806, 3], C.linen, .009);

  // A recessed, glazed garden window: its view is modeled, never downloaded.
  const wx = 2.04;
  m.box([1.88, 1.67, .075], [wx, 1.72, .05], C.oak, .008);
  m.box([1.72, 1.51, .015], [wx, 1.72, .094], "#d9e4d4", .001);
  m.box([1.7, .61, .018], [wx, 1.28, .105], "#c8d3ac", .001);
  for (let i = 0; i < 6; i++) {
    const shrub = m.sphere([.21, .28 + (i % 3) * .08, .013], [wx - .71 + i * .29, 1.34, .121], i % 2 ? "#b1c29b" : "#a4b893");
    shrub.castShadow = false;
  }
  for (const x of [wx - .86, wx, wx + .86]) m.box([.055, 1.51, .065], [x, 1.72, .154], C.ivory, .006);
  for (const y of [.98, 1.72, 2.46]) m.box([1.76, .055, .065], [wx, y, .154], C.ivory, .006);
  m.box([2.02, .06, .3], [wx, .93, .16], C.lightOak, .015);
  m.rod([wx - 1.08, 2.6, .19], [wx + 1.08, 2.6, .19], .022, C.oak);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const curtain = m.box([.1, 1.62, .055], [wx + side * (.83 + i * .065), 1.77, .22 + (i % 2) * .03], i % 2 ? C.linen : C.ivory, .022);
      curtain.castShadow = false;
    }
  }

  const shelf = new Model();
  shelf.box([1.73, .07, .33], [0, 0, 0], C.lightOak, .012);
  for (const x of [-.57, .57]) shelf.rod([x, -.2, -.11], [x, -.035, .11], .015, C.gold);
  bookRow(shelf, -.64, .04, 0, 4, .72);
  plant(shelf, .63, .04, .015, .33, C.ivory);
  const photo = wallFrame(.35, .31, 3);
  photo.position.set(.2, .2, .03);
  photo.rotation.x = -.08;
  shelf.group.add(photo);
  shelf.group.position.set(4.56, 1.97, .17);
  m.group.add(shelf.group);

  for (const [z, y, width, height, variant] of [[2.18, 1.96, .63, .82, 0], [3.13, 1.91, .4, .49, 1], [4.05, 1.54, .32, .43, 3]]) {
    const frame = wallFrame(width, height, variant);
    frame.rotation.y = Math.PI / 2;
    frame.position.set(.06, y, z);
    m.group.add(frame);
  }
  const clock = new Model();
  clock.cylinder(.18, .18, .045, [0, 0, 0], C.lightOak, 40).rotation.x = Math.PI / 2;
  clock.cylinder(.154, .154, .005, [0, 0, .025], C.ivory, 40).rotation.x = Math.PI / 2;
  clock.rod([0, 0, .033], [0, .102, .033], .007, C.olive);
  clock.rod([0, 0, .034], [.076, -.022, .034], .009, C.olive);
  clock.group.rotation.y = Math.PI / 2;
  clock.group.position.set(.06, 2.27, 1.14);
  m.group.add(clock.group);
  return m.group;
}

export function createResident(): THREE.Group {
  const m = new Model();
  m.group.name = "resident";
  for (const x of [-.09, .09]) {
    m.box([.13, .065, .22], [x, .055, .035], C.charcoal, .028);
    m.box([.11, .25, .13], [x, .2, -.006], C.olive, .035);
  }
  m.box([.35, .29, .23], [0, .42, 0], C.ivory, .08);
  m.box([.35, .035, .23], [0, .295, 0], C.linen, .015);
  for (const x of [-.21, .21]) {
    const sleeve = m.box([.12, .23, .14], [x, .4, .005], C.ivory, .045);
    sleeve.rotation.z = x > 0 ? .14 : -.14;
    m.sphere([.057, .067, .055], [x * 1.05, .29, .02], "#dbb99a");
  }
  m.cylinder(.064, .065, .09, [0, .59, 0], "#dbb99a");
  m.sphere([.21, .22, .19], [0, .75, 0], "#e6c6a4");
  m.sphere([.217, .155, .199], [0, .88, -.026], C.charcoal);
  m.sphere([.19, .07, .13], [-.055, .88, .115], C.charcoal).rotation.z = -.2;
  for (const x of [-.21, .21]) m.sphere([.035, .057, .04], [x, .75, 0], "#dbb99a");
  for (const x of [-.07, .07]) m.sphere([.012, .019, .008], [x, .758, .177], C.charcoal);
  m.sphere([.024, .021, .022], [0, .717, .185], "#d7ac88");
  return m.group;
}

export function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
