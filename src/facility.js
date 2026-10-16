// Builds a level: buildings filled solid on a 1 m grid and carved into rooms
// and doors, walls merged into as few boxes as possible, props, the yard
// outside, and a 0.5 m nav grid the guards path-find on.
import * as THREE from '../vendor/three.module.js';

export const CEIL = 3.4;
// the level being played (live bindings: importers always see the current one)
export let SKY = null;
export let SOFT = [];   // breakable walls in this level: { rect, mesh, box, gone }   // sky, stars, moon / sun: kept centred on the player so none of it clips
export let HALF = 34, ROOMS = {}, EXFIL = { x: 0, z: 0, r: 2 }, START = { x: 0, z: 0, yaw: 0 };

// ---------------------------------------------------------------- wall grid
let N = 68, wall = new Uint8Array(N * N);
const ci = (x, z) => (z + HALF) * N + (x + HALF);
const isWall = (x, z) => x >= -HALF && z >= -HALF && x < HALF && z < HALF && wall[ci(x, z)] === 1;
function fill([x0, z0, x1, z1], v) { for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) if (x >= -HALF && z >= -HALF && x < HALF && z < HALF) wall[ci(x, z)] = v; }

// greedy merge of wall cells into rectangles
function wallRects() {
  const used = new Uint8Array(N * N), out = [];
  for (let z = -HALF; z < HALF; z++) for (let x = -HALF; x < HALF; x++) {
    if (!isWall(x, z) || used[ci(x, z)]) continue;
    let x1 = x; while (x1 + 1 < HALF && isWall(x1 + 1, z) && !used[ci(x1 + 1, z)]) x1++;
    let z1 = z;
    grow: while (z1 + 1 < HALF) { for (let k = x; k <= x1; k++) if (!isWall(k, z1 + 1) || used[ci(k, z1 + 1)]) break grow; z1++; }
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
function speckle(g, w, h, n, a, grey = false) {
  for (let i = 0; i < n; i++) {
    const r = Math.random() < 0.5 ? 0 : 255, gg = grey ? r : Math.random() < 0.5 ? 0 : 255, b = grey ? r : Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${r},${gg},${b},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
}
// box whose UVs are in metres / tile, so one material tiles evenly on any size
function boxGeo(w, h, d, tile) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return geo;
}
// interior styles: [wall texture, floor texture]
const STYLES = {
  concrete: () => [canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#7d828a'; c.fillRect(0, 0, w, h); speckle(c, w, h, 1800, 0.08);
    c.strokeStyle = 'rgba(40,44,50,.55)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    c.fillStyle = '#3b4048'; c.fillRect(0, h - 38, w, 38); c.fillStyle = '#c9a227'; c.fillRect(0, h - 44, w, 6);
  }), canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#3a3f46'; c.fillRect(0, 0, w, h); speckle(c, w, h, 2200, 0.1);
    c.strokeStyle = 'rgba(15,17,20,.7)'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); c.strokeRect(0, 0, w / 2, h / 2); c.strokeRect(w / 2, h / 2, w / 2, h / 2);
  })],
  metal: () => [canvasTex(256, 256, (c, w, h) => {   // corrugated sheet
    for (let x = 0; x < w; x += 16) { const gr = c.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#3e5254'); gr.addColorStop(0.5, '#5f7778'); gr.addColorStop(1, '#384a4c'); c.fillStyle = gr; c.fillRect(x, 0, 16, h); }
    c.fillStyle = 'rgba(120,70,30,.3)'; c.fillRect(0, h - 30, w, 30);
  }), canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#4a4a46'; c.fillRect(0, 0, w, h); speckle(c, w, h, 2600, 0.12, true);
    c.fillStyle = 'rgba(210,180,40,.55)'; c.fillRect(0, h / 2 - 3, w, 6);
  })],
  wood: () => [canvasTex(256, 256, (c, w, h) => {   // office panelling
    c.fillStyle = '#b8ad96'; c.fillRect(0, 0, w, h * 0.55);
    for (let x = 0; x < w; x += 32) { c.fillStyle = x % 64 ? '#6e4a2c' : '#62402a'; c.fillRect(x, h * 0.55, 32, h * 0.45); }
    c.fillStyle = '#3e2a18'; c.fillRect(0, h * 0.55 - 4, w, 6);
  }), canvasTex(256, 256, (c, w, h) => {
    for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? '#5a3e26' : '#4e3520'; c.fillRect(0, y, w, 15); }
    speckle(c, w, h, 900, 0.06, true);
  })],
  stucco: () => [canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e4d6bc'; c.fillRect(0, 0, w, h); speckle(c, w, h, 2400, 0.05, true);
    c.fillStyle = '#7a5434'; c.fillRect(0, h - 30, w, 30); c.fillStyle = '#c9a26a'; c.fillRect(0, 40, w, 5);
  }), canvasTex(256, 256, (c, w, h) => {   // terracotta tiles
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { c.fillStyle = (x + y) % 128 ? '#a4573a' : '#94503a'; c.fillRect(x + 1, y + 1, 62, 62); }
    c.fillStyle = '#5a3020'; for (let k = 0; k <= w; k += 64) { c.fillRect(k - 1, 0, 2, h); c.fillRect(0, k - 1, w, 2); }
  })],
};

function propMats() {
  const crate = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#6b5233'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? '#5d4529' : '#76603f'; c.fillRect(0, y, w, 14); }
    c.strokeStyle = '#3d2c17'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.beginPath(); c.moveTo(4, 4); c.lineTo(w - 4, h - 4); c.stroke();
  });
  const L = col => new THREE.MeshLambertMaterial({ color: col });
  const containers = [0x7a2e22, 0x2a4f7a, 0x3c6b3a, 0x8a6a1e].map(col => new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#' + col.toString(16).padStart(6, '0'); c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 10) { c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x, 0, 4, h); }
  }) }));
  return {
    crate: new THREE.MeshLambertMaterial({ map: crate }), containers,
    metal: L(0x4a5560), desk: L(0x5a4a3a), couch: L(0x3d2a2a), bunk: L(0x3e4a3a), tank: L(0x6f8a8f), truck: L(0x3b4733), jeep: L(0x55603f),
    van: L(0x1d2024), sandbag: L(0x8a7c5a), bush: L(0x1f3a1c), hedge: L(0x2a4a22), shelf: L(0x4a3424), bed: L(0xd8d0c0), statue: L(0xc8c4b8),
    car: L(0x101418), lounger: L(0xe8e2d0), fountain: L(0xb8b0a0), palm: L(0x6a4e32), ship: L(0x2a2e34),
    rack: new THREE.MeshLambertMaterial({ map: canvasTex(128, 256, (c, w, h) => {
      c.fillStyle = '#16191d'; c.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 14) { c.fillStyle = '#23282e'; c.fillRect(6, y, w - 12, 10); for (let k = 0; k < 4; k++) { c.fillStyle = Math.random() < 0.6 ? '#38e07b' : '#e0b538'; c.fillRect(12 + k * 8, y + 3, 4, 3); } }
    }) }),
    wheel: L(0x15171a), glass: new THREE.MeshBasicMaterial({ color: 0x89c4ff, transparent: true, opacity: 0.35 }),
    water: new THREE.MeshBasicMaterial({ color: 0x2a6f8a }), leaf: L(0x2f5a24), yellow: L(0xc9a227),
  };
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function addProp(g, boxes, mats, p) {
  if (p[0] === 'crane') {   // a dock crane: four legs you can't walk through, a boom overhead
    const [, x, z] = p;
    for (const sx of [-2, 2]) for (const sz of [-1.5, 1.5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), mats.yellow); leg.position.set(x + sx, 4.5, z + sz); g.add(leg);
      boxes.push({ min: V(x + sx - 0.3, 0, z + sz - 0.3), max: V(x + sx + 0.3, 9, z + sz + 0.3), prop: 'crane' });
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 4), mats.yellow); top.position.set(x, 9.4, z); g.add(top);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 16), mats.yellow); boom.position.set(x, 10, z - 6); g.add(boom);
    return;
  }
  const [x, z, w, d, h, kind] = p;
  const mat = kind === 'container' ? mats.containers[Math.abs(Math.round(x * 7 + z * 3)) % 4] : mats[kind] ?? mats.metal;
  const m = new THREE.Mesh(kind === 'crate' ? boxGeo(w, h, d, Math.min(w, h, d) > 1.5 ? 1.2 : 1.1) : new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, h / 2, z); g.add(m);
  if (kind === 'bush') { m.geometry = new THREE.IcosahedronGeometry(0.95, 1); m.scale.set(1, 0.7, 1); m.position.y = 0.55; }
  if (kind === 'palm') {
    m.geometry = new THREE.CylinderGeometry(0.16, 0.24, h, 8);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2.6), mats.leaf); f.position.set(x, h, z); f.rotation.set(0.35, i * Math.PI / 3, 0); f.translateZ(1.1); g.add(f); }
  }
  if (kind === 'pool') {
    m.material = mats.fountain;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, d - 0.4), new THREE.MeshBasicMaterial({ color: 0x3fa8d8 })); water.rotation.x = -Math.PI / 2; water.position.set(x, h + 0.01, z); g.add(water);
  }
  if (kind === 'fountain') { const top = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.2, 8), mats.fountain); top.position.set(x, h + 0.6, z); g.add(top); }
  if (kind === 'bed') { const pillow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.12, 0.4), mats.lounger); pillow.position.set(x, h + 0.06, z - d / 2 + 0.3); g.add(pillow); }
  if (kind === 'ship') {   // superstructure on the deck
    const br = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4), mats.lounger); br.position.set(x + w / 2 - 5, h + 2, z); g.add(br);
  }
  if (kind === 'truck' || kind === 'jeep' || kind === 'van' || kind === 'car') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.6, d * 0.12), mats.glass); cab.position.set(x, h * 0.75, z - d / 2 - 0.01); g.add(cab);
    for (const sx of [-1, 1]) for (const sz of [-0.33, 0.33]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mats.wheel);
      wh.rotation.z = Math.PI / 2; wh.position.set(x + sx * (w / 2), 0.42, z + sz * d); g.add(wh);
    }
  }
  if (kind !== 'palm') boxes.push({ min: V(x - w / 2, 0, z - d / 2), max: V(x + w / 2, h, z + d / 2), prop: kind });
  else boxes.push({ min: V(x - 0.25, 0, z - 0.25), max: V(x + 0.25, h, z + 0.25), prop: kind });
}

export function buildLevel(g, boxes, L) {
  HALF = L.half; ROOMS = L.rooms; EXFIL = L.exfil; START = L.start;
  N = HALF * 2; wall = new Uint8Array(N * N);
  for (const b of L.buildings) fill(b.box, 1);
  for (const r of Object.values(L.rooms)) fill(r, 0);
  for (const d of L.doors) fill(d, 0);
  for (const r of L.soft ?? []) fill(r, 2);   // soft walls are built on their own so they can be blown open

  buildOutside(g, L);
  // each building: floor, ceiling, roof
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x55595f }), ceilMat = new THREE.MeshLambertMaterial({ color: 0x2b2f35 });
  const styleOf = new Map();
  for (const b of L.buildings) {
    const [x0, z0, x1, z1] = b.box, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const [wallTex, floorTex] = (STYLES[b.style] ?? STYLES.concrete)();
    b.wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const ft = floorTex.clone(); ft.needsUpdate = true; ft.repeat.set(w / 2, d / 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: ft }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.005, cz); g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, CEIL, cz); g.add(ceil);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4), roofMat); roof.position.set(cx, CEIL + 0.2, cz); g.add(roof);
    styleOf.set(b, b.wallMat); b.wallMat.userData.style = b.style;
  }
  const buildingAt = (x, z) => L.buildings.find(b => x >= b.box[0] && x <= b.box[2] && z >= b.box[1] && z <= b.box[3]) ?? L.buildings[0];
  for (const [x0, z0, x1, z1] of wallRects()) {
    const w = x1 - x0, d = z1 - z0;
    const m = new THREE.Mesh(boxGeo(w, CEIL, d, 2), buildingAt((x0 + x1) / 2, (z0 + z1) / 2).wallMat);
    m.position.set((x0 + x1) / 2, CEIL / 2, (z0 + z1) / 2); g.add(m);
    boxes.push({ min: V(x0, 0, z0), max: V(x1, CEIL, z1), wall: true });
  }
  // soft walls: drywall in houses and offices, thin sheet metal in warehouses
  SOFT = [];
  const drywall = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#c9c4b8'; c.fillRect(0, 0, w, h); speckle(c, w, h, 1200, 0.05, true);
    c.strokeStyle = 'rgba(90,85,75,.35)'; c.lineWidth = 2; for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.fillStyle = 'rgba(60,55,50,.5)'; c.fillRect(0, h - 22, w, 22);
  });
  const sheet = canvasTex(256, 256, (c, w, h) => {
    for (let x = 0; x < w; x += 12) { c.fillStyle = x % 24 ? '#8a8f86' : '#70756c'; c.fillRect(x, 0, 12, h); }
    for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(120,60,20,.25)'; c.fillRect(Math.random() * w, Math.random() * h, 6, 14); }
  });
  for (const r of L.soft ?? []) {
    const [x0, z0, x1, z1] = r, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const metal = buildingAt(cx, cz).style === 'metal';
    const mat = new THREE.MeshLambertMaterial({ map: metal ? sheet : drywall });
    // thinner than a real wall, so it reads as flimsy; the gap either side is filled by the frame below
    const thin = w < d ? [0.25, d] : [w, 0.25];
    const m = new THREE.Mesh(boxGeo(thin[0], CEIL, thin[1], 2), mat); m.position.set(cx, CEIL / 2, cz); g.add(m);
    const box = { min: V(cx - thin[0] / 2, 0, cz - thin[1] / 2), max: V(cx + thin[0] / 2, CEIL, cz + thin[1] / 2) };
    const sw = { rect: r, mesh: m, box, gone: false, metal };
    box.soft = sw; boxes.push(box); SOFT.push(sw);
  }

  // a beam over every doorway so they read as doors
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x23272d });
  for (const [x0, z0, x1, z1] of L.doors) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, CEIL - 2.3, z1 - z0), frameMat);
    m.position.set((x0 + x1) / 2, (CEIL + 2.3) / 2, (z0 + z1) / 2); g.add(m);
    boxes.push({ min: V(x0, 2.3, z0), max: V(x1, CEIL, z1), wall: true });
  }
  const mats = propMats();
  for (const p of L.props) addProp(g, boxes, mats, p);
  const wb = waterBox(L); if (wb) boxes.push(wb);
  // ceiling light panels in every room
  const lampMat = new THREE.MeshBasicMaterial({ color: L.look.sky === 'dusk' ? 0xffe6c0 : 0xdfe8ff });
  for (const [x0, z0, x1, z1] of Object.values(L.rooms)) {
    for (let x = x0 + 2.5; x < x1 - 1; x += 5) for (let z = z0 + 1.5; z < z1 - 0.5; z += 5) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.35), lampMat); l.position.set(x, CEIL - 0.03, z); g.add(l);
    }
  }
  for (const [text, x, z, ry] of L.signs ?? []) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#101317'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c547'; c.font = `bold ${text.length > 10 ? 24 : 30}px Helvetica, Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2);
    }) }));
    m.position.set(x, 2.55, z); m.rotation.y = ry; g.add(m);
  }
  buildNav(boxes);
}

// ---------------------------------------------------------------- outside
function buildOutside(g, L) {
  const look = L.look;
  const ground = {
    gravel: (c, w, h) => { c.fillStyle = '#2d2f2a'; c.fillRect(0, 0, w, h); speckle(c, w, h, 5000, 0.12, true); },
    asphalt: (c, w, h) => { c.fillStyle = '#26282b'; c.fillRect(0, 0, w, h); speckle(c, w, h, 4000, 0.1, true); c.fillStyle = 'rgba(220,190,60,.5)'; c.fillRect(0, h / 2 - 2, w / 2, 4); },
    grass: (c, w, h) => { c.fillStyle = '#3c5a2c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '20,40,10' : '110,140,60'},${Math.random() * 0.3})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 3 + Math.random() * 4); } },
  }[look.ground] ?? ((c, w, h) => { c.fillStyle = '#2d2f2a'; c.fillRect(0, 0, w, h); });
  const yard = canvasTex(256, 256, ground); yard.repeat.set(HALF / 2, HALF / 2);
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshLambertMaterial({ map: yard }));
  gm.rotation.x = -Math.PI / 2; g.add(gm);
  // perimeter: a chain-link fence, or a stone wall
  const postMat = new THREE.MeshLambertMaterial({ color: 0x55595f });
  const stone = look.perimeter === 'wall';
  const fenceTex = stone ? canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#b8a888'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 * 32; x < w; x += 64) { c.strokeStyle = '#8a7a5e'; c.lineWidth = 3; c.strokeRect(x, y, 64, 32); }
  }) : canvasTex(128, 128, (c, w, h) => {
    c.strokeStyle = 'rgba(170,175,180,.85)'; c.lineWidth = 2;
    for (let i = -h; i < w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); }
  });
  fenceTex.repeat.set(HALF * 2 / (stone ? 4 : 1.5), stone ? 1 : 2);
  const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: !stone, alphaTest: stone ? 0 : 0.3, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 3), fenceMat);
    f.position.set(-Math.sin(a) * (HALF - 0.05), 1.5, -Math.cos(a) * (HALF - 0.05)); f.rotation.y = a; g.add(f);
    if (!stone) for (let k = -HALF; k <= HALF; k += 4) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 6), postMat);
      p.position.set(-Math.sin(a) * (HALF - 0.05) + Math.cos(a) * k, 1.65, -Math.cos(a) * (HALF - 0.05) - Math.sin(a) * k); g.add(p);
    }
  }
  // floodlights (or garden lamps at the villa)
  const dusk = look.sky === 'dusk';
  const headMat = new THREE.MeshBasicMaterial({ color: dusk ? 0xffd890 : 0xfff2c8 });
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: dusk ? 0.06 : 0.09, depthWrite: false });
  for (const [x, z] of L.lamps ?? []) {
    const hgt = dusk ? 3 : 6;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, hgt, 8), postMat); p.position.set(x, hgt / 2, z); g.add(p);
    const hd = new THREE.Mesh(dusk ? new THREE.SphereGeometry(0.25, 10, 8) : new THREE.BoxGeometry(0.6, 0.25, 0.4), headMat); hd.position.set(x, hgt, z); g.add(hd);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(dusk ? 3.5 : 5, 24), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.01, z); g.add(pool);
  }
  // sky
  SKY = new THREE.Group(); g.add(SKY);
  if (dusk) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(92, 24, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(16, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1c1a3a'); gr.addColorStop(0.35, '#6a3a5a'); gr.addColorStop(0.5, '#e8804a'); gr.addColorStop(0.56, '#f2b070'); gr.addColorStop(1, '#3a2a2a');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    }) }));
    SKY.add(sky);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffd090, fog: false })); sun.position.set(55, 6, -65); SKY.add(sun);
  } else {
    const starPos = [];
    for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.35; starPos.push(Math.cos(a) * Math.cos(e) * 90, Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 90); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    SKY.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 12), new THREE.MeshBasicMaterial({ color: 0xe8ecf2, fog: false })); moon.position.set(-40, 50, 45); SKY.add(moon);
  }
  // the harbor: water past the quay edge, a low wall you can't climb over
  if (look.water) {
    const [x0, z0, x1, z1] = look.water;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 120, z1 - z0 + 60), new THREE.MeshBasicMaterial({ color: 0x0e2a3a }));
    w.rotation.x = -Math.PI / 2; w.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2 - 30); g.add(w);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.25, 0.4), postMat); edge.position.set((x0 + x1) / 2, 0.12, z1 - 0.2); g.add(edge);
  }
  // the insertion point: a glowing ring
  const lz = new THREE.Mesh(new THREE.RingGeometry(EXFIL.r - 0.1, EXFIL.r, 32), new THREE.MeshBasicMaterial({ color: 0x38e07b, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  lz.rotation.x = -Math.PI / 2; lz.position.set(EXFIL.x, 0.02, EXFIL.z); g.add(lz);
}
// the water's edge blocks like a wall (added by the caller after props)
export function waterBox(L) {
  if (!L.look.water) return null;
  const [x0, z0, x1, z1] = L.look.water;
  return { min: V(x0, 0, z0), max: V(x1, 1.1, z1), wall: true };
}

// blow a soft wall open: gone from the world, walkable for the guards
export function breachSoft(sw, boxes) {
  if (sw.gone) return;
  sw.gone = true; sw.mesh.visible = false;
  const i = boxes.indexOf(sw.box); if (i >= 0) boxes.splice(i, 1);
  const [x0, z0, x1, z1] = sw.rect;
  renav(boxes, x0 - 1, z0 - 1, x1 + 1, z1 + 1);
}

// ---------------------------------------------------------------- navigation
const NS = 0.5;
let NN = 0, blocked, gScore, from, stamp, closed, run = 0;
function buildNav(boxes) {
  NN = Math.round(HALF * 2 / NS);
  blocked = new Uint8Array(NN * NN); gScore = new Float32Array(NN * NN); from = new Int32Array(NN * NN); stamp = new Uint32Array(NN * NN); closed = new Uint32Array(NN * NN);
  for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
    const x = -HALF + (i + 0.5) * NS, z = -HALF + (j + 0.5) * NS, m = 0.35;
    for (const b of boxes) {
      if (b.min.y > 1) continue;   // beams are overhead
      if (x > b.min.x - m && x < b.max.x + m && z > b.min.z - m && z < b.max.z + m) { blocked[j * NN + i] = 1; break; }
    }
  }
}
function renav(boxes, x0, z0, x1, z1) {
  for (let j = cell(z0); j <= cell(z1); j++) for (let i = cell(x0); i <= cell(x1); i++) {
    const x = -HALF + (i + 0.5) * NS, z = -HALF + (j + 0.5) * NS, m = 0.35;
    blocked[j * NN + i] = 0;
    for (const b of boxes) {
      if (b.min.y > 1) continue;
      if (x > b.min.x - m && x < b.max.x + m && z > b.min.z - m && z < b.max.z + m) { blocked[j * NN + i] = 1; break; }
    }
  }
}
const cell = v => Math.max(0, Math.min(NN - 1, Math.floor((v + HALF) / NS)));
const free = (i, j) => i >= 0 && j >= 0 && i < NN && j < NN && !blocked[j * NN + i];
export function walkable(x, z) { return free(cell(x), cell(z)); }
// nearest free cell to a point (for posts standing next to a wall)
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
