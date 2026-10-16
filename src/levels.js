// Every mission: its map (buildings carved into rooms, doors, props), where you
// start and leave, the people in it and what you're there to take.
// Coordinates are world metres; yaw 0 faces +z (south), PI faces -z (north).
//
// buildings: { box: [x0, z0, x1, z1], style }   solid until rooms / doors carve it out
// props:     [x, z, w, d, h, kind]             centre and size; low ones are cover
// guards:    [path, opts]                      opts: wait (s at each stop), look (yaw at a post), sleep
// targets:   { name, path, wait, civ, o }      o: looks (shirt, pants, gear...) and pistol
// intel:     { name, pos: [x, y, z], kind }    kind: drive, case, docs, laptop
const P2 = Math.PI / 2, P4 = Math.PI / 4;
const bushes = pts => pts.map(([x, z]) => [x, z, 1.6, 1.6, 1.1, 'bush']);

export const LEVELS = [
  // ------------------------------------------------------------------ 1
  {
    key: 'blacksite', name: 'BLACK SITE', op: 'OPERATION NIGHTGLASS', half: 34,
    brief: 'Kill 2 targets · steal 2 intel · get out',
    story: [
      'A black site is holding two people we want gone:',
      'COL. VARGA in the command office, DR. HALE in the R&D lab.',
      'Take them out, steal the server drive and the prototype case,',
      'then get back out to the van you came in on.',
    ],
    exfilText: 'Get back to the van',
    look: { sky: 'night', bg: 0x0b0d10, hemi: [0xc4d0e4, 0x2a2622, 1.35], sun: [0xaab8d0, 0.45], fog: [0x0b0d10, 16, 42], ground: 'gravel', perimeter: 'fence' },
    guardLook: 'soldier',
    buildings: [{ box: [-22, -22, 22, 22], style: 'concrete' }],
    rooms: {
      armory: [-4, -5, 5, 5], corridor: [-20, -9, 20, -6], office: [-20, -20, -7, -10], server: [-6, -20, 6, -10],
      lab: [7, -20, 20, -10], barracks: [-20, -5, -5, 5], warehouse: [6, -5, 20, 5], back: [-20, 6, 20, 9], garage: [-20, 10, 20, 21],
    },
    doors: [
      [-1, -6, 1, -5], [-15, -10, -13, -9], [-1, -10, 1, -9], [13, -10, 15, -9], [-7, -14, -6, -12], [6, -14, 7, -12],
      [-14, -6, -12, -5], [12, -6, 14, -5], [-10, 5, -8, 6], [-1, 5, 1, 6], [15, 5, 17, 6],
      [-16, 9, -14, 10], [2, 9, 4, 10], [14, 9, 16, 10],
      [-10, 21, -6, 22], [-22, -1, -20, 1], [20, 1, 22, 4],   // ways in: vehicle gate, side door, loading door
    ],
    props: [
      [4.3, -2, 0.6, 3, 2, 'metal'],
      [-17, -8.2, 1.2, 1, 1.1, 'crate'], [-6, -6.7, 1.2, 1, 1.1, 'crate'], [7, -8.3, 1.4, 1, 1.1, 'metal'], [17.5, -6.8, 1.2, 1, 1.1, 'crate'],
      ...[-4.2, -1.4, 1.4, 4.2].map(x => [x, -15.5, 0.8, 5, 2.2, 'rack']), [0, -19, 2.2, 0.9, 0.8, 'desk'],
      [-13.5, -17, 2.4, 1, 0.8, 'desk'], [-19.4, -15, 0.6, 3, 1.4, 'metal'], [-9, -11.2, 3, 0.9, 0.5, 'couch'], [-17, -11, 1.4, 0.9, 0.8, 'desk'],
      [10, -15, 3, 1, 0.9, 'desk'], [16, -15, 3, 1, 0.9, 'desk'], [19.3, -18.5, 1.2, 2.5, 2.4, 'tank'], [9, -19.3, 3, 1, 0.9, 'desk'],
      ...[-18, -15, -12, -9].map(x => [x, -3.6, 1, 2, 1.6, 'bunk']), ...[-18, -15, -12].map(x => [x, 3.6, 1, 2, 1.6, 'bunk']), [-7, 0, 1.6, 1, 0.8, 'desk'],
      [9, -2.5, 2, 2, 1.2, 'crate'], [9, 2.5, 2, 2, 2.4, 'crate'], [13, 0, 2, 2, 1.2, 'crate'], [17, -2.8, 2, 1.6, 2.4, 'crate'], [17, 2.5, 2, 2, 1.2, 'crate'],
      [-4, 8.2, 1.2, 1, 1.1, 'crate'], [10, 6.8, 1.2, 1, 1.1, 'metal'],
      [-28, -12, 2.5, 6, 2.6, 'container'], [27, -18, 6, 2.5, 2.6, 'container'], [12, 28, 6, 2.5, 2.6, 'container'], [-14, -28, 6, 2.5, 2.6, 'container'],
      [-12, 25.5, 3, 0.6, 1.0, 'sandbag'], [-4, 25.5, 3, 0.6, 1.0, 'sandbag'], [25, 7, 0.6, 3, 1.0, 'sandbag'], [-25, -3.5, 0.6, 3, 1.0, 'sandbag'],
      [-24, 14, 1.2, 1.2, 1.2, 'crate'], [24, 18, 1.2, 1.2, 1.2, 'crate'], [5, -26, 1.2, 1.2, 1.2, 'crate'], [28, -4, 1.2, 1.2, 1.2, 'crate'],
      [-31, 23.5, 2.2, 4.8, 2.2, 'van'],
      ...bushes([[-20, 30], [-8, 31], [4, 30.5], [18, 31], [30, 22], [31, 8], [30.5, -8], [31, -26], [18, -31], [-2, -31], [-25, -30], [-31, -20], [-30.5, 2], [-31, 12]]),
      [-12, 15, 2.4, 5.5, 2.5, 'truck'], [-4, 14.5, 2.2, 4.4, 1.6, 'jeep'], [7, 15, 2.4, 5.5, 2.5, 'truck'], [14, 18.5, 1.2, 1, 1.1, 'crate'], [-17, 19, 2, 2, 1.2, 'crate'],
    ],
    signs: [['COMMAND', -14, -8.98, 0], ['SERVERS', 0, -8.98, 0], ['R&D LAB', 14, -8.98, 0], ['BARRACKS', -13, -6.02, Math.PI], ['STORAGE', 13, -6.02, Math.PI], ['ARMORY', 0, -6.02, Math.PI], ['MOTOR POOL', 3, 8.98, 0]],
    lamps: [[-24, -24], [24, -24], [24, 24], [-24, 24], [-8, 24], [24, 2.5], [-24, 0]],
    start: { x: -26.5, z: 28.5, yaw: -P4 }, exfil: { x: -27.5, z: 27.5, r: 2.2 },
    armory: { x: -1.9, z: -1.4 },
    guards: [
      [[[-18, -7.5], [-3, -7.5]], { wait: 3 }],
      [[[18, -7.5], [3, -7.5]], { wait: 3 }],
      [[[-5.3, -11], [5.3, -11], [5.3, -19.2], [-5.3, -19.2]], { wait: 1.5 }],
      [[[2.6, -18.8]], { look: 0 }],
      [[[-17, -13], [-10, -13], [-10, -18.5]], { wait: 2.5 }],
      [[[9, -11.5], [18.5, -11.5], [18.5, -13.5], [12.5, -17.5], [8, -17.5]], { wait: 2 }],
      [[[13, -12.6]], { look: 0 }],
      [[[-18.5, -1], [-5.8, -2], [-5.8, 2], [-18.5, 1.5]], { wait: 2 }],
      [[[-15, 1.2]], { sleep: true }],
      [[[7.2, -4.3], [19.3, -4.3], [19.3, 4.3], [11, 4.3]], { wait: 2 }],
      [[[-18, 7.5], [18, 7.5]], { wait: 3 }],
      [[[-18, 11.5], [18, 11.5], [18, 20], [-18, 20]], { wait: 2 }],
      [[[2.6, 18.6]], { look: Math.PI }],
      [[[-8, 18], [0, 12], [10, 19.5]], { wait: 3 }],
      [[[-29, -29], [29, -29], [29, 29], [-20, 29], [-29, 18]], { wait: 2 }],
      [[[29, 29], [29, -29], [-29, -29], [-29, -12]], { wait: 2 }],
      [[[-8, 24]], { look: 0 }],
      [[[23.8, 2.5]], { look: P2 }],
      [[[3, 3.5], [3, -3.5]], { wait: 4 }],
    ],
    targets: [
      { name: 'COL. VARGA', path: [[-13.5, -18.6], [-16, -18.6], [-11, -15]], wait: 4,
        o: { hp: 100, shirt: 0x2f3a2a, pants: 0x2f3a2a, sleeves: true, skin: 0xd9b28c, hair: 0x8a8a86, gear: { cap: 0x2f3a2a, gloves: false }, pistol: true } },
      { name: 'DR. HALE', path: [[10, -16.6], [16, -16.6], [13, -13.5]], wait: 5, civ: true,
        o: { hp: 70, shirt: 0xd8dde3, pants: 0x3a3f4a, sleeves: true, skin: 0xe8c4a0, hair: 0x4a3020, gear: { coat: true, glasses: true, gloves: false } } },
    ],
    intel: [
      { name: 'Server drive', pos: [0, 0.82, -19], kind: 'drive' },
      { name: 'Prototype case', pos: [16, 0.92, -15], kind: 'case' },
    ],
  },

  // ------------------------------------------------------------------ 2
  {
    key: 'harbor', name: 'HARBOR', op: 'OPERATION SALT LINE', half: 36,
    brief: 'Kill the dealer and the broker · steal 2 intel · get out',
    story: [
      'An arms deal closes on the docks tonight.',
      'VIKTOR KASH is in the strong room of Warehouse B. THE BROKER',
      'is on the quay waiting for the ship. Take them both out, lift the',
      'shipping manifest from the harbor office and the warhead casing',
      'from Warehouse A, then get back to your van.',
    ],
    exfilText: 'Get back to the van',
    look: { sky: 'night', bg: 0x070a10, hemi: [0xa8b8d8, 0x1e2228, 1.2], sun: [0x8fa4cc, 0.4], fog: [0x070a10, 14, 46], ground: 'asphalt', perimeter: 'fence',
      water: [-36, -36, 36, -28] },
    guardLook: 'pmc',
    buildings: [
      { box: [-30, -24, -18, -13], style: 'wood' },      // harbor office
      { box: [-10, -22, 12, -6], style: 'metal' },       // warehouse A
      { box: [18, -20, 32, -4], style: 'metal' },        // warehouse B
      { box: [-6, 24, 0, 30], style: 'concrete' },       // gate hut
    ],
    rooms: {
      office: [-29, -23, -24, -14], records: [-23, -23, -19, -14], whA: [-9, -21, 11, -7],
      whB: [19, -19, 31, -11], backoffice: [19, -10, 25, -5], strongroom: [26, -10, 31, -5], hut: [-5, 25, -1, 29],
    },
    doors: [
      [-24, -20, -23, -18], [-27, -14, -25, -13], [-19, -21, -18, -19],
      [-2, -7, 2, -6], [-10, -16, -9, -14], [6, -22, 8, -21],
      [21, -11, 23, -10], [28, -11, 30, -10], [18, -16, 19, -14], [21, -5, 23, -4],
      [-4, 24, -2, 25],
    ],
    props: [
      [-6, -33, 30, 5, 4.5, 'ship'], ['crane', -14, -25.5], ['crane', 14, -25.5],
      // harbor office
      [-26.5, -21.5, 2, 0.9, 0.8, 'desk'], [-21, -18, 1.6, 0.9, 0.8, 'desk'], [-19.5, -22.2, 0.6, 1.5, 1.6, 'metal'], [-28.5, -16, 0.6, 2.5, 1.6, 'metal'],
      // warehouse A: pallets and stacks
      [1, -14, 2, 2, 1.2, 'crate'], [-5, -18, 2, 2, 2.4, 'crate'], [-5, -10, 2, 2, 1.2, 'crate'], [7, -17, 2.4, 2, 2.4, 'crate'], [7, -10, 2, 2, 1.2, 'crate'], [9.5, -19.5, 1.2, 1.2, 1.2, 'crate'],
      // warehouse B
      [22, -15, 2, 2, 1.2, 'crate'], [28, -16, 2, 2, 2.4, 'crate'], [25, -13, 1.2, 1.2, 1.2, 'crate'],
      [21, -8, 1.8, 0.9, 0.8, 'desk'], [24.4, -9.4, 0.6, 1, 1.6, 'metal'], [30.4, -7.5, 0.6, 3, 1.8, 'metal'], [28, -9.4, 1.6, 0.6, 0.9, 'desk'],
      // container yard
      [-28, 4, 2.5, 6, 2.6, 'container'], [-24, 4, 2.5, 6, 2.6, 'container'], [-28, 13, 2.5, 6, 5.2, 'container'], [-20, 12, 2.5, 6, 2.6, 'container'],
      [-12, 6, 2.5, 6, 2.6, 'container'], [-12, 16, 2.5, 6, 5.2, 'container'],
      [2, 4, 6, 2.5, 2.6, 'container'], [10, 4, 6, 2.5, 5.2, 'container'], [2, 12, 6, 2.5, 2.6, 'container'], [18, 8, 6, 2.5, 2.6, 'container'],
      [26, 12, 6, 2.5, 2.6, 'container'], [10, 18, 6, 2.5, 2.6, 'container'], [24, 22, 6, 2.5, 5.2, 'container'],
      [-4, -3, 1.2, 1.2, 1.2, 'crate'], [14, -2, 1.2, 1.2, 1.2, 'crate'], [30, 0, 1.2, 1.2, 1.2, 'crate'], [-16, -10, 1.2, 1.2, 1.2, 'crate'], [-30, -8, 1.2, 1.2, 1.1, 'metal'],
      [-8, 31, 3, 0.6, 1.0, 'sandbag'], [33, 29, 2.2, 4.8, 2.2, 'van'],
    ],
    signs: [['WAREHOUSE A', 0, -5.98, 0], ['HARBOR OFFICE', -26, -12.98, 0], ['WAREHOUSE B', 17.98, -12, -P2], ['GATE', -3, 23.98, Math.PI]],
    lamps: [[-20, -26], [0, -25], [20, -24], [-20, 0], [0, 0], [20, 0], [-3, 22], [32, 20]],
    start: { x: 32.5, z: 33, yaw: P4 }, exfil: { x: 31, z: 32, r: 2.4 },
    armory: { x: -7.5, z: -17 },
    guards: [
      [[[-26, -26], [16, -26]], { wait: 3 }],
      [[[16, -26.5], [-10, -26.5]], { wait: 3 }],
      [[[-2, -26.2]], { look: 0 }],
      [[[-8, -20], [10, -20], [10, -8], [-8, -8]], { wait: 2 }],
      [[[3.5, -15]], { look: 0 }],
      [[[20, -18], [30, -18], [30, -12], [20, -12]], { wait: 2 }],
      [[[22, -6.5]], { look: Math.PI }],
      [[[16.5, -15]], { look: -P2 }],
      [[[-28, -22], [-25, -15]], { wait: 3 }],
      [[[-30, 0], [-30, 20], [-18, 20], [-18, 0]], { wait: 2 }],
      [[[0, 8], [22, 6], [22, 16], [0, 16]], { wait: 2 }],
      [[[6, 0], [30, 2], [30, 26], [6, 26]], { wait: 2 }],
      [[[-3, 27]], { sleep: true }],
      [[[2, 26]], { look: 0 }],
      [[[-33, 33], [18, 33]], { wait: 3 }],
      [[[-6, -24.4]], { look: 0 }],
      [[[6, -24.4]], { look: 0 }],
    ],
    targets: [
      { name: 'VIKTOR KASH', path: [[28.5, -7.5], [27, -6], [29.5, -8.5]], wait: 4,
        o: { hp: 110, shirt: 0x24262c, pants: 0x24262c, sleeves: true, skin: 0xd9b28c, hair: 0x1a1a1a, gear: { glasses: true, gloves: false }, pistol: true } },
      { name: 'THE BROKER', path: [[-4, -25.6], [4, -25.6], [0, -24]], wait: 5, civ: true,
        o: { hp: 80, shirt: 0x6b5a3a, pants: 0x3a3226, sleeves: true, skin: 0xc69c72, hair: 0x3a2a1a, gear: { coat: 0x5a4a30, gloves: false } } },
    ],
    intel: [
      { name: 'Shipping manifest', pos: [-21, 0.82, -18], kind: 'docs' },
      { name: 'Warhead casing', pos: [1, 1.22, -14], kind: 'case' },
    ],
  },

  // ------------------------------------------------------------------ 3
  {
    key: 'villa', name: 'THE VILLA', op: 'OPERATION GILDED CAGE', half: 32,
    brief: 'Kill Salazar and his accountant · steal 2 intel · get out',
    story: [
      'Cartel boss DON SALAZAR is hosting at his hillside villa.',
      'He sleeps in the master suite; his ACCOUNTANT works late in',
      'the study. Take them both, grab the ledger from the study and',
      'the encrypted laptop from the security house,',
      'then get back over the wall where you came in.',
    ],
    exfilText: 'Back over the wall where you came in',
    look: { sky: 'dusk', bg: 0x2a1e2a, hemi: [0xffd6b0, 0x3a2e2a, 1.6], sun: [0xffb070, 0.9], fog: [0x2a1e2a, 22, 60], ground: 'grass', perimeter: 'wall' },
    guardLook: 'cartel',
    buildings: [
      { box: [-14, -20, 14, -2], style: 'stucco' },      // the house
      { box: [16, 6, 28, 16], style: 'concrete' },       // security house
      { box: [-28, 4, -16, 14], style: 'concrete' },     // garage
    ],
    rooms: {
      foyer: [-3, -10, 3, -3], living: [-13, -10, -4, -3], dining: [4, -10, 13, -3],
      study: [-13, -19, -6, -11], hall: [-5, -19, 4, -11], master: [5, -19, 13, -11],
      security: [17, 7, 22, 15], armory: [23, 7, 27, 15], garage: [-27, 5, -17, 13],
    },
    doors: [
      [-1, -3, 1, -2], [-4, -7, -3, -5], [3, -7, 4, -5], [-1, -11, 1, -10], [-6, -16, -5, -14], [4, -16, 5, -14],
      [-14, -7, -13, -5], [13, -7, 14, -5], [8, -20, 10, -19],
      [18, 15, 20, 16], [22, 10, 23, 12],
      [-24, 13, -20, 14], [-22, 4, -20, 5],
    ],
    props: [
      // house
      [-9, -8.6, 3, 0.9, 0.5, 'couch'], [-9, -5.5, 1.4, 0.8, 0.4, 'desk'], [8.5, -6.5, 3, 1.2, 0.8, 'desk'],
      [-9.5, -17, 2, 0.9, 0.8, 'desk'], [-12.6, -15, 0.6, 3, 2, 'shelf'], [9, -16, 2, 2.2, 0.6, 'bed'], [12.4, -12.5, 0.6, 1.4, 1.6, 'shelf'],
      [-0.5, -14, 1, 1, 1.2, 'statue'],
      // security house
      [19.5, 9, 2, 0.9, 0.8, 'desk'], [17.5, 12, 0.6, 3, 1.8, 'rack'],
      // garage
      [-24.5, 9, 2.2, 4.4, 1.3, 'car'], [-19, 8.5, 2.2, 4.4, 1.6, 'jeep'],
      // gardens and pool
      [0, 6, 8, 4, 0.45, 'pool'], [-5.5, 6, 1, 2, 0.4, 'lounger'], [5.5, 6, 1, 2, 0.4, 'lounger'], [0, 16, 2, 2, 0.9, 'fountain'],
      [-8, 1.5, 6, 0.8, 1.3, 'hedge'], [8, 1.5, 6, 0.8, 1.3, 'hedge'], [-20, 20, 8, 0.8, 1.3, 'hedge'], [20, 22, 8, 0.8, 1.3, 'hedge'],
      [-10, 24, 0.8, 6, 1.3, 'hedge'], [10, 24, 0.8, 6, 1.3, 'hedge'], [-24, -8, 0.8, 8, 1.3, 'hedge'], [24, -10, 0.8, 8, 1.3, 'hedge'],
      [-6, 22, 2.2, 4.4, 1.6, 'jeep'], [6, 22, 2.2, 4.4, 1.3, 'car'],
      ...[[-6, 11], [6, 11], [-18, -24], [18, -26], [-28, -14], [28, 0], [-14, 26], [14, 28]].map(([x, z]) => [x, z, 0.5, 0.5, 5, 'palm']),
    ],
    signs: [['SECURITY', 19, 16.02, 0]],
    lamps: [[-12, 0], [12, 0], [0, 26], [-24, 18], [24, 0], [-20, -24], [20, -24]],
    start: { x: -29, z: 29, yaw: -P4 }, exfil: { x: -28.5, z: 28.5, r: 2.2 },
    armory: { x: 25, z: 11 },
    guards: [
      [[[0, -0.8]], { look: 0 }],
      [[[-6, 3], [6, 3], [6, 9.2], [-6, 9.2]], { wait: 2 }],
      [[[0, 28]], { look: Math.PI }],
      [[[-20, -8], [-30, -8], [-30, 18], [-20, 18]], { wait: 3 }],
      [[[18, -8], [30, -8], [30, 20], [18, 20]], { wait: 3 }],
      [[[-12, -24], [12, -24]], { wait: 3 }],
      [[[-12, -9], [-5, -4]], { wait: 3 }],
      [[[5, -9], [12, -4]], { wait: 3 }],
      [[[-0.5, -17.5]], { look: 0 }],
      [[[6, -12.5]], { look: -P2 }],
      [[[19, 13], [21, 8.2]], { wait: 4 }],
      [[[18, 17.5]], { look: 0 }],
      [[[-25, 6], [-19, 12]], { wait: 3 }],
      [[[-5.5, 6]], { sleep: true }],
      [[[-30, -30], [30, -30], [30, 30], [-14, 30]], { wait: 2 }],
    ],
    targets: [
      { name: 'DON SALAZAR', path: [[9, -12.5], [11.5, -18.3], [6.5, -18.3]], wait: 5,
        o: { hp: 110, shirt: 0xe8e2d0, pants: 0xe8e2d0, sleeves: true, skin: 0xc69c72, hair: 0x2a2a2a, gear: { gloves: false }, pistol: true } },
      { name: 'THE ACCOUNTANT', path: [[-9.5, -18.4], [-8, -12.5]], wait: 6, civ: true,
        o: { hp: 70, shirt: 0x5a6a8a, pants: 0x2a2d33, sleeves: true, skin: 0xe8c4a0, hair: 0x6a5a4a, gear: { glasses: true, gloves: false } } },
    ],
    intel: [
      { name: 'Cartel ledger', pos: [-9.5, 0.82, -17], kind: 'docs' },
      { name: 'Encrypted laptop', pos: [19.5, 0.82, 9], kind: 'laptop' },
    ],
  },
];

// how each side dresses their guards
export const GUARD_LOOKS = {
  soldier: { shirts: [0x4f5640, 0x535a45, 0x48503c], pants: 0x3f4434, sleeves: true, hair: () => null, gear: k => ({ helmet: true, vest: true, kit: k }), kits: [0x3f4636, 0x4a4d3a, 0x3a4034] },
  pmc: { shirts: [0x23272e, 0x2a2e36, 0x1e2126], pants: 0x2a2d33, sleeves: true, hair: () => null, gear: k => ({ beanie: 0x1a1c20, vest: true, kit: k }), kits: [0x2a2d33, 0x33363d, 0x3a3f36] },
  cartel: { shirts: [0x1e1e22, 0x7a2a2a, 0xe8e8e8, 0x3a4a6a], pants: 0x2e3b52, sleeves: false, hair: () => [0x1a1a1a, 0x2a1b10, 0x3a2a1a][Math.floor(Math.random() * 3)],
    gear: k => ({ vest: true, kit: k, gloves: false }), kits: [0x2b2b2b, 0x3a3a30] },
};
