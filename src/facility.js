// The facility: rooms and corridors carved out of a solid 1 m grid, walls merged
// into as few boxes as possible, cover props, and a 0.5 m nav grid the guards
// path-find on.
import * as THREE from '../vendor/three.module.js';

export const HALF = 34, CEIL = 3.4;   // HALF: the fenced compound; the building is B either side of the middle
const B = 22, N = B * 2;   // 1 m wall cells

// x0, z0, x1, z1 in world metres
export const ROOMS = {
  staging: [-4, -5, 5, 5], corridor: [-20, -9, 20, -6], office: [-20, -20, -7, -10], server: [-6, -20, 6, -10],
  lab: [7, -20, 20, -10], barracks: [-20, -5, -5, 5], warehouse: [6, -5, 20, 5], back: [-20, 6, 20, 9], garage: [-20, 10, 20, 21],
};
const DOORS = [
  [-1, -6, 1, -5], [-15, -10, -13, -9], [-1, -10, 1, -9], [13, -10, 15, -9], [-7, -14, -6, -12], [6, -14, 7, -12],
  [-14, -6, -12, -5], [12, -6, 14, -5], [-10, 5, -8, 6], [-1, 5, 1, 6], [15, 5, 17, 6],
  [-16, 9, -14, 10], [2, 9, 4, 10], [14, 9, 16, 10],
  // ways in from outside: the vehicle gate, a side door, the loading door
  [-10, 21, -6, 22], [-22, -1, -20, 1], [20, 1, 22, 4],
];
// props: [x, z, w, d, h, kind]  (centre, size). Low ones are cover you can crouch behind.
const PROPS = [
  // staging: lockers along the east wall
  [4.3, -2, 0.6, 3, 2, 'metal'],
  // main corridor: crates and barrier blocks to duck behind
  [-17, -8.2, 1.2, 1, 1.1, 'crate'], [-6, -6.7, 1.2, 1, 1.1, 'crate'], [7, -8.3, 1.4, 1, 1.1, 'metal'], [17.5, -6.8, 1.2, 1, 1.1, 'crate'],
  // server room: rows of racks
  ...[-4.2, -1.4, 1.4, 4.2].map(x => [x, -15.5, 0.8, 5, 2.2, 'rack']),
  [0, -19, 2.2, 0.9, 0.8, 'desk'],
  // office: the commander's desk, filing cabinets, a couch
  [-13.5, -17, 2.4, 1, 0.8, 'desk'], [-19.4, -15, 0.6, 3, 1.4, 'metal'], [-9, -11.2, 3, 0.9, 0.5, 'couch'], [-17, -11, 1.4, 0.9, 0.8, 'desk'],
  // lab: benches and tanks
  [10, -15, 3, 1, 0.9, 'desk'], [16, -15, 3, 1, 0.9, 'desk'], [19.3, -18.5, 1.2, 2.5, 2.4, 'tank'], [9, -19.3, 3, 1, 0.9, 'desk'],
  // barracks: bunks
  ...[-18, -15, -12, -9].map(x => [x, -3.6, 1, 2, 1.6, 'bunk']), ...[-18, -15, -12].map(x => [x, 3.6, 1, 2, 1.6, 'bunk']), [-7, 0, 1.6, 1, 0.8, 'desk'],
  // warehouse: crate stacks, some tall
  [9, -2.5, 2, 2, 1.2, 'crate'], [9, 2.5, 2, 2, 2.4, 'crate'], [13, 0, 2, 2, 1.2, 'crate'], [17, -2.8, 2, 1.6, 2.4, 'crate'], [17, 2.5, 2, 2, 1.2, 'crate'],
  // back corridor
  [-4, 8.2, 1.2, 1, 1.1, 'crate'], [10, 6.8, 1.2, 1, 1.1, 'metal'],
  // outside: shipping containers, sandbags, crates, a parked van, bushes
  [-28, -12, 2.5, 6, 2.6, 'container'], [27, -18, 6, 2.5, 2.6, 'container'], [12, 28, 6, 2.5, 2.6, 'container'], [-14, -28, 6, 2.5, 2.6, 'container'],
  [-12, 25.5, 3, 0.6, 1.0, 'sandbag'], [-4, 25.5, 3, 0.6, 1.0, 'sandbag'], [25, 7, 0.6, 3, 1.0, 'sandbag'], [-25, -3.5, 0.6, 3, 1.0, 'sandbag'],
  [-24, 14, 1.2, 1.2, 1.2, 'crate'], [24, 18, 1.2, 1.2, 1.2, 'crate'], [5, -26, 1.2, 1.2, 1.2, 'crate'], [28, -4, 1.2, 1.2, 1.2, 'crate'],
  [-31, 23.5, 2.2, 4.8, 2.2, 'van'],
  ...[[-20, 30], [-8, 31], [4, 30.5], [18, 31], [30, 22], [31, 8], [30.5, -8], [31, -26], [18, -31], [-2, -31], [-25, -30], [-31, -20], [-30.5, 2], [-31, 12]].map(([x, z]) => [x, z, 1.6, 1.6, 1.1, 'bush']),
  // garage: trucks and jeeps
  [-12, 15, 2.4, 5.5, 2.5, 'truck'], [-4, 14.5, 2.2, 4.4, 1.6, 'jeep'], [7, 15, 2.4, 5.5, 2.5, 'truck'], [14, 18.5, 1.2, 1, 1.1, 'crate'], [-17, 19, 2, 2, 1.2, 'crate'],
];
export const EXFIL = { x: -27.5, z: 27.5, r: 2.2 };   // the insertion van
export const START = { x: -26.5, z: 28.5, yaw: -Math.PI / 4 };

// ---------------------------------------------------------------- wall grid
const wall = new Uint8Array(N * N).fill(1);
const ci = (x, z) => (z + B) * N + (x + B);
function carve([x0, z0, x1, z1]) { for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) wall[ci(x, z)] = 0; }
for (const r of Object.values(ROOMS)) carve(r);
for (const d of DOORS) carve(d);
const isWall = (x, z) => x < -B || z < -B || x >= B || z >= B || wall[ci(x, z)] === 1;

// greedy merge of wall cells into rectangles
function wallRects() {
  const used = new Uint8Array(N * N), out = [];
  for (let z = -B; z < B; z++) for (let x = -B; x < B; x++) {
    if (!isWall(x, z) || used[ci(x, z)]) continue;
    let x1 = x; while (x1 + 1 < B && isWall(x1 + 1, z) && !used[ci(x1 + 1, z)]) x1++;
    let z1 = z;
    grow: while (z1 + 1 < B) { for (let k = x; k <= x1; k++) if (!isWall(k, z1 + 1) || used[ci(k, z1 + 1)]) break grow; z1++; }
    for (let zz = z; zz <= z1; zz++) for (let k = x; k <= x1; k++) used[ci(k, zz)] = 1;
    out.push([x, z, x1 + 1, z1 + 1]);
  }
  return out;
}

// ---------------------------------------------------------------- looks
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function speckle(g, w, h, n, a) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? 255 : 0},${Math.random() < 0.5 ? 255 : 0},${Math.random() < 0.5 ? 255 : 0},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
}
// box whose UVs are in metres / tile, so one material tiles evenly on any size
function boxGeo(w, h, d, tile) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return geo;
}

export function buildFacility(g, boxes) {
  const wallMat = new THREE.MeshLambertMaterial({ map: canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#7d828a'; c.fillRect(0, 0, w, h); speckle(c, w, h, 1800, 0.08);
    c.strokeStyle = 'rgba(40,44,50,.55)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    c.fillStyle = '#3b4048'; c.fillRect(0, h - 38, w, 38);   // dark skirting band (bottom of each 2 m tile)
    c.fillStyle = '#c9a227'; c.fillRect(0, h - 44, w, 6);
  }) });
  const floorTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#3a3f46'; c.fillRect(0, 0, w, h); speckle(c, w, h, 2200, 0.1);
    c.strokeStyle = 'rgba(15,17,20,.7)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.strokeRect(0, 0, w / 2, h / 2); c.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });
  floorTex.repeat.set(B, B);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(B * 2, B * 2), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.005; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(B * 2, B * 2), new THREE.MeshLambertMaterial({ color: 0x2b2f35 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = CEIL; g.add(ceil);
  buildOutside(g);

  for (const [x0, z0, x1, z1] of wallRects()) {
    const w = x1 - x0, d = z1 - z0;
    const m = new THREE.Mesh(boxGeo(w, CEIL, d, 2), wallMat);
    m.position.set((x0 + x1) / 2, CEIL / 2, (z0 + z1) / 2); g.add(m);
    boxes.push({ min: new THREE.Vector3(x0, 0, z0), max: new THREE.Vector3(x1, CEIL, z1), wall: true });
  }
  // a lintel over every doorway so they read as doors
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x23272d });
  for (const [x0, z0, x1, z1] of DOORS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, CEIL - 2.3, z1 - z0), frameMat);
    m.position.set((x0 + x1) / 2, (CEIL + 2.3) / 2, (z0 + z1) / 2); g.add(m);
    boxes.push({ min: new THREE.Vector3(x0, 2.3, z0), max: new THREE.Vector3(x1, CEIL, z1), wall: true });
  }

  // props
  const mats = {
    crate: new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#6b5233'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? '#5d4529' : '#76603f'; c.fillRect(0, y, w, 14); }
      c.strokeStyle = '#3d2c17'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.beginPath(); c.moveTo(4, 4); c.lineTo(w - 4, h - 4); c.stroke();
    }) }),
    metal: new THREE.MeshLambertMaterial({ color: 0x4a5560 }), desk: new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
    couch: new THREE.MeshLambertMaterial({ color: 0x3d2a2a }), bunk: new THREE.MeshLambertMaterial({ color: 0x3e4a3a }),
    tank: new THREE.MeshLambertMaterial({ color: 0x6f8a8f }), van: new THREE.MeshLambertMaterial({ color: 0x1d2024 }),
    sandbag: new THREE.MeshLambertMaterial({ color: 0x8a7c5a }), bush: new THREE.MeshLambertMaterial({ color: 0x1f3a1c }),
    container: new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#7a2e22'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) { c.fillStyle = '#5e2219'; c.fillRect(x, 0, 4, h); }
    }) }), truck: new THREE.MeshLambertMaterial({ color: 0x3b4733 }), jeep: new THREE.MeshLambertMaterial({ color: 0x55603f }),
    rack: new THREE.MeshLambertMaterial({ map: canvasTex(128, 256, (c, w, h) => {
      c.fillStyle = '#16191d'; c.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 14) { c.fillStyle = '#23282e'; c.fillRect(6, y, w - 12, 10); for (let k = 0; k < 4; k++) { c.fillStyle = Math.random() < 0.6 ? '#38e07b' : '#e0b538'; c.fillRect(12 + k * 8, y + 3, 4, 3); } }
    }) }),
  };
  const glass = new THREE.MeshBasicMaterial({ color: 0x89c4ff, transparent: true, opacity: 0.35 });
  for (const [x, z, w, d, h, kind] of PROPS) {
    const m = new THREE.Mesh(kind === 'crate' ? boxGeo(w, h, d, Math.min(w, h, d) > 1.5 ? 1.2 : 1.1) : new THREE.BoxGeometry(w, h, d), mats[kind]);
    m.position.set(x, h / 2, z); g.add(m);
    if (kind === 'bush') { m.geometry = new THREE.IcosahedronGeometry(0.95, 1); m.scale.set(1, 0.7, 1); m.position.y = 0.55; }
    if (kind === 'truck' || kind === 'jeep' || kind === 'van') {   // a cab and wheels, so they read as vehicles
      const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.6, d * 0.12), glass); cab.position.set(x, h * 0.75, z - d / 2 - 0.01); g.add(cab);
      for (const sx of [-1, 1]) for (const sz of [-0.33, 0.33]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mats.metal);
        wh.rotation.z = Math.PI / 2; wh.position.set(x + sx * (w / 2), 0.42, z + sz * d); g.add(wh);
        wh.material = new THREE.MeshLambertMaterial({ color: 0x15171a });
      }
    }
    boxes.push({ min: new THREE.Vector3(x - w / 2, 0, z - d / 2), max: new THREE.Vector3(x + w / 2, h, z + d / 2), prop: kind });
  }

  // ceiling light panels in every room (they glow; the hemisphere light does the real lighting)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ff });
  for (const [x0, z0, x1, z1] of Object.values(ROOMS)) {
    for (let x = x0 + 2.5; x < x1 - 1; x += 5) for (let z = z0 + 1.5; z < z1 - 0.5; z += 5) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.35), lampMat); l.position.set(x, CEIL - 0.03, z); g.add(l);
    }
  }
  /* exfil is outside now

  const exfilMat = new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#26402c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) { c.fillStyle = '#1c3022'; c.fillRect(0, y, w, 3); }
    c.fillStyle = '#7dff9c'; c.font = 'bold 40px Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXFIL', w / 2, h / 2);
  }) });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), exfilMat); door.position.set(EXFIL.x, 1.4, 20.99); door.rotation.y = Math.PI; g.add(door); */
  // room signs over the doors from the main corridor
  const sign = (text, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#101317'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c547'; c.font = 'bold 30px Helvetica, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2);
    }) }));
    m.position.set(x, 2.55, z); m.rotation.y = ry; g.add(m);
  };
  sign('COMMAND', -14, -8.98, 0); sign('SERVERS', 0, -8.98, 0); sign('R&D LAB', 14, -8.98, 0);
  sign('BARRACKS', -13, -6.02, Math.PI); sign('STORAGE', 13, -6.02, Math.PI); sign('ARMORY', 0, -6.02, Math.PI);
  sign('MOTOR POOL', 3, 8.98, 0);
  buildNav(boxes);
}

// ---------------------------------------------------------------- outside
// Night. Gravel yard, a chain-link fence round the edge, floodlights on poles.
function buildOutside(g) {
  const yard = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#2d2f2a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = Math.random() < 0.5 ? 0 : 255; c.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 2, 2 + Math.random() * 2); } });
  yard.repeat.set(HALF / 2, HALF / 2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshLambertMaterial({ map: yard }));
  ground.rotation.x = -Math.PI / 2; g.add(ground);
  // the building's roof slab and a parapet, seen from outside
  const roof = new THREE.Mesh(new THREE.BoxGeometry(B * 2 + 0.4, 0.4, B * 2 + 0.4), new THREE.MeshLambertMaterial({ color: 0x55595f }));
  roof.position.y = CEIL + 0.2; g.add(roof);
  const fence = canvasTex(128, 128, (c, w, h) => {
    c.strokeStyle = 'rgba(170,175,180,.85)'; c.lineWidth = 2;
    for (let i = -h; i < w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
  });
  fence.repeat.set(HALF * 2 / 1.5, 2);
  const fenceMat = new THREE.MeshLambertMaterial({ map: fence, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  const postMat = new THREE.MeshLambertMaterial({ color: 0x55595f });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 3), fenceMat);
    f.position.set(-Math.sin(a) * (HALF - 0.05), 1.5, -Math.cos(a) * (HALF - 0.05)); f.rotation.y = a; g.add(f);
    for (let k = -HALF; k <= HALF; k += 4) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 6), postMat);
      p.position.set(-Math.sin(a) * (HALF - 0.05) + Math.cos(a) * k, 1.65, -Math.cos(a) * (HALF - 0.05) - Math.sin(a) * k); g.add(p);
    }
  }
  // floodlights: poles with glowing heads and a pool of light on the ground
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8 });
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.09, depthWrite: false });
  for (const [x, z] of [[-24, -24], [24, -24], [24, 24], [-24, 24], [-8, 24], [24, 2.5], [-24, 0]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), postMat); p.position.set(x, 3, z); g.add(p);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.4), headMat); hd.position.set(x, 6, z); g.add(hd);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 24), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.01, z); g.add(pool);
  }
  // stars and a moon
  const starPos = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.35; starPos.push(Math.cos(a) * Math.cos(e) * 90, Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 90); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, fog: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 12), new THREE.MeshBasicMaterial({ color: 0xe8ecf2, fog: false })); moon.position.set(-40, 50, 45); g.add(moon);
  // the insertion point: a glowing ring by the van
  const lz = new THREE.Mesh(new THREE.RingGeometry(EXFIL.r - 0.1, EXFIL.r, 32), new THREE.MeshBasicMaterial({ color: 0x38e07b, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  lz.rotation.x = -Math.PI / 2; lz.position.set(EXFIL.x, 0.02, EXFIL.z); g.add(lz);
}

// ---------------------------------------------------------------- navigation
const NS = 0.5, NN = Math.round(HALF * 2 / NS);   // covers the whole compound
const blocked = new Uint8Array(NN * NN);
function buildNav(boxes) {
  blocked.fill(0);
  for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
    const x = -HALF + (i + 0.5) * NS, z = -HALF + (j + 0.5) * NS, m = 0.35;
    for (const b of boxes) {
      if (b.min.y > 1) continue;   // lintels are overhead
      if (x > b.min.x - m && x < b.max.x + m && z > b.min.z - m && z < b.max.z + m) { blocked[j * NN + i] = 1; break; }
    }
  }
}
const cell = v => Math.max(0, Math.min(NN - 1, Math.floor((v + HALF) / NS)));
const free = (i, j) => i >= 0 && j >= 0 && i < NN && j < NN && !blocked[j * NN + i];
export function walkable(x, z) { return free(cell(x), cell(z)); }
// nearest free cell to a point (for targets standing next to a wall)
function nearestFree(i, j) {
  if (free(i, j)) return [i, j];
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (free(i + di, j + dj)) return [i + di, j + dj];
  return [i, j];
}
// a straight walk from a to b stays on free cells
export function clearWalk(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2);
  for (let k = 0; k <= n; k++) { const t = k / (n || 1); if (!walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}
// A* over the nav grid; returns a smoothed list of {x, z} waypoints (without the start)
const gScore = new Float32Array(NN * NN), from = new Int32Array(NN * NN), stamp = new Uint32Array(NN * NN), closed = new Uint32Array(NN * NN);
let run = 0;
export function findPath(ax, az, bx, bz) {
  run++;
  const [si, sj] = nearestFree(cell(ax), cell(az)), [ti, tj] = nearestFree(cell(bx), cell(bz));
  const start = sj * NN + si, goal = tj * NN + ti;
  const open = [start]; gScore[start] = 0; stamp[start] = run; from[start] = -1;
  const h = k => { const i = k % NN, j = (k / NN) | 0, dx = Math.abs(i - ti), dz = Math.abs(j - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const fOf = new Map([[start, h(start)]]);
  let found = false, iters = 0;
  while (open.length && iters++ < 40000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (fOf.get(open[k]) < fOf.get(open[bi])) bi = k;
    const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (cur === goal) { found = true; break; }
    if (closed[cur] === run) continue;
    closed[cur] = run;
    const ci0 = cur % NN, cj0 = (cur / NN) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci0 + di, nj = cj0 + dj;
      if (!free(ni, nj) || (di && dj && (!free(ci0 + di, cj0) || !free(ci0, cj0 + dj)))) continue;   // no corner cutting
      const nk = nj * NN + ni, g2 = gScore[cur] + (di && dj ? 1.414 : 1);
      if (closed[nk] === run) continue;
      if (stamp[nk] !== run || g2 < gScore[nk]) { stamp[nk] = run; gScore[nk] = g2; from[nk] = cur; fOf.set(nk, g2 + h(nk)); open.push(nk); }
    }
  }
  if (!found) return null;
  const raw = [];
  for (let k = goal; k !== -1 && k !== start; k = from[k]) raw.push({ x: -HALF + (k % NN + 0.5) * NS, z: -HALF + (((k / NN) | 0) + 0.5) * NS });
  raw.reverse();
  // string-pull: skip ahead to the furthest waypoint we can walk to in a straight line
  const out = []; let px = ax, pz = az, i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !clearWalk(px, pz, raw[j].x, raw[j].z)) j--;
    out.push(raw[j]); px = raw[j].x; pz = raw[j].z; i = j + 1;
  }
  return out;
}
