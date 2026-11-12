// Publicité « Simulator de Simulator » (la Carte du monde) : découverte, exploration, un monde qui relie les jeux.
// Statut : bientôt (le jeu est repassé en privé après son transfert au groupe).
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, DEG, rgba, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, bushyTree, cloud, ground, showOnly, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles,
  text, caption, pill, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Bungee', 'Inter']);

// ---------- temps (112 bpm : une mesure = 2,143 s) ----------
const BAR = 240 / 112;
const T = { hook: 0, fr: 2 * BAR, frB: 3.5 * BAR, paris: 5 * BAR, doors: 7 * BAR, doorsB: 8.5 * BAR, reb: 10 * BAR, coin: 11 * BAR, boost: 12 * BAR, end: 13 * BAR };
const DURATION = 16 * BAR;                                   // 34,3 s

// ---------- palette ----------
const C = { navy: '#0b1a3a', ocean: '#1466b8', sea: '#1fa3d6', turq: '#19c5c9', parch: '#f6e6bd', land: '#58c26a', gold: '#ffc93c', gold2: '#ff9d2e', red: '#ff4d5a', cream: '#f3e3c3',
  roof: '#56657d', stone: '#d9d2c2', chess: '#8b5cf6', gym: '#ff5a3c', coinv: '#ffc93c', road: '#3b82f6' };

gl3D({ exposure: 1.06 });
const scene = new THREE.Scene(), camera = makeCamera(42);
const L = addLights(scene, { shadowArea: 24, dir: [7, 14, 9] });
const Y = new THREE.Vector3(0, 1, 0);
function beam(a, b, th, color, o) {                          // poutre entre deux points
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), m = box(th, d.length(), th, color, o);
  m.position.copy(va).add(vb).multiplyScalar(.5); m.quaternion.setFromUnitVectors(Y, d.normalize()); return m;
}

// ======================================================================== emblèmes des jeux reliés
function coinModel(r = 1) {
  const g = new THREE.Group(), k = new THREE.Group(); g.add(k); k.rotation.x = Math.PI / 2;
  k.add(cyl(r, r, r * .2, '#ffb81f', { rough: .3, emissive: '#7a4a00', emissiveI: .5, seg: 32 }));
  k.add(cyl(r * .78, r * .78, r * .24, '#ffe27a', { rough: .25, emissive: '#8a6a10', emissiveI: .55, seg: 32 }));
  for (const s of [-1, 1]) { const st = sign(r * 1.1, r * 1.1, (c, w) => { c.fillStyle = '#e08a00'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? w * .2 : w * .46; c.lineTo(w / 2 + Math.cos(a) * q, w / 2 + Math.sin(a) * q); } c.fill(); }, { res: 128 }); st.position.z = s * r * .125; if (s < 0) st.rotation.y = Math.PI; g.add(st); }
  return g;
}
function kingModel() {
  const g = new THREE.Group(), w = '#f4f1ff', o = { rough: .35 };
  g.add(cyl(.85, .95, .28, w, { ...o, pos: [0, .14, 0] })); g.add(cyl(.62, .8, .22, w, { ...o, pos: [0, .39, 0] }));
  g.add(cyl(.3, .55, 1.25, w, { ...o, pos: [0, 1.1, 0] })); g.add(cyl(.5, .5, .14, w, { ...o, pos: [0, 1.76, 0] }));
  g.add(cyl(.46, .32, .42, w, { ...o, pos: [0, 2.03, 0] })); g.add(box(.14, .6, .14, C.gold, { rough: .3, emissive: '#7a4a00', emissiveI: .5, pos: [0, 2.52, 0] }));
  g.add(box(.44, .14, .14, C.gold, { rough: .3, emissive: '#7a4a00', emissiveI: .5, pos: [0, 2.58, 0] }));
  g.position.y = -1.3; const h = new THREE.Group(); h.add(g); return h;
}
function dumbbellModel() {
  const g = new THREE.Group(); g.add(cyl(.13, .13, 2.3, '#cfd6e2', { rough: .3, rot: [0, 0, Math.PI / 2] }));
  for (const s of [-1, 1]) { g.add(cyl(.72, .72, .3, '#2a2f3d', { rough: .5, rot: [0, 0, Math.PI / 2], pos: [s * .85, 0, 0] })); g.add(cyl(.52, .52, .26, C.gym, { rough: .45, rot: [0, 0, Math.PI / 2], pos: [s * 1.14, 0, 0] })); }
  g.rotation.z = .35; const h = new THREE.Group(); h.add(g); return h;
}
function carModel() {
  const g = new THREE.Group(); g.add(box(2.7, .16, 1.9, '#3a4150', { pos: [0, -.62, 0] }));
  for (let i = -1; i <= 1; i++) g.add(box(.5, .02, .12, '#ffffff', { pos: [i * .9, -.53, 0], cast: false }));
  const car = new THREE.Group(); car.add(rbox(1.7, .5, .9, .16, C.road, { rough: .35, pos: [0, 0, 0] })); car.add(rbox(.9, .42, .78, .16, '#cfe8ff', { rough: .2, pos: [-.08, .42, 0] }));
  for (const [x, z] of [[-.55, .46], [.55, .46], [-.55, -.46], [.55, -.46]]) car.add(cyl(.22, .22, .16, '#1b1e27', { rot: [Math.PI / 2, 0, 0], pos: [x, -.26, z], seg: 14 }));
  car.add(box(.08, .16, .5, '#fff3a0', { emissive: '#fff3a0', emissiveI: 1, pos: [.86, 0, 0] })); car.position.set(0, -.05, .42); g.add(car); g.userData.car = car;
  g.rotation.x = .25; const h = new THREE.Group(); h.add(g); h.userData.car = car; return h;
}
const GAMES = [
  { name: 'ÉCHECS ROYAUX', color: C.chess, make: kingModel },
  { name: 'GYM', color: C.gym, make: dumbbellModel },
  { name: 'COINVERSE', color: C.coinv, make: () => coinModel(1) },
  { name: 'AUTOROUTE', color: C.road, make: carModel },
];

// ======================================================================== plan 0 et écran final : le globe
const G_globe = new THREE.Group(); scene.add(G_globe);
const R = 6;
const CONT = [
  [[-165, 65], [-140, 70], [-95, 72], [-75, 62], [-55, 50], [-75, 35], [-80, 26], [-97, 18], [-105, 22], [-118, 33], [-125, 48], [-150, 58]],
  [[-97, 18], [-88, 16], [-78, 9], [-82, 8], [-92, 14]],
  [[-80, 10], [-60, 8], [-35, -7], [-40, -22], [-58, -38], [-70, -54], [-74, -40], [-70, -18], [-81, -5]],
  [[-17, 15], [-10, 30], [-5, 35], [10, 37], [32, 31], [43, 11], [51, 11], [40, -5], [35, -22], [20, -35], [12, -17], [9, 3], [-8, 5]],
  [[-9, 37], [-9, 43], [-2, 43.5], [-1.5, 46], [-4.5, 48], [-1.5, 49], [2, 51], [5, 53], [8, 57], [5, 59], [6, 62], [15, 69], [30, 71], [70, 73], [110, 76], [170, 68], [178, 65], [160, 58], [140, 50], [128, 38], [121, 28], [108, 20], [104, 10], [98, 8], [95, 17], [88, 22], [80, 9], [72, 20], [60, 25], [50, 28], [44, 13], [35, 28], [35, 36], [27, 37], [22, 38], [15, 40], [12, 44], [3, 43], [0, 38]],
  [[114, -22], [131, -12], [142, -11], [153, -27], [146, -38], [131, -32], [116, -34]],
  [[-52, 60], [-22, 70], [-25, 82], [-60, 81], [-70, 76]], [[-6, 50], [1, 51], [-1, 55], [-3, 58], [-6, 57], [-4, 54]], [[44, -14], [50, -16], [47, -25], [44, -22]],
  [[130, 32], [140, 36], [142, 42], [139, 41], [133, 34]], [[100, 2], [118, 2], [120, -8], [106, -7]], [[166, -46], [174, -40], [178, -38], [172, -44]],
];
{
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2a8fe0'); gr.addColorStop(.5, '#1fb0e6'); gr.addColorStop(1, '#1a79cf'); c.fillStyle = gr; c.fillRect(0, 0, 1024, 512);
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1.5; for (let i = 1; i < 12; i++) { c.beginPath(); c.moveTo(i * 1024 / 12, 0); c.lineTo(i * 1024 / 12, 512); c.stroke(); } for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(0, i * 512 / 6); c.lineTo(1024, i * 512 / 6); c.stroke(); }
  const P = ([lo, la]) => [(lo + 180) / 360 * 1024, (90 - la) / 180 * 512];
  CONT.forEach((poly, i) => { c.beginPath(); poly.forEach((p, j) => { const [x, y] = P(p); j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.lineJoin = 'round'; c.strokeStyle = '#f9efc4'; c.lineWidth = 7; c.stroke(); c.fillStyle = ['#63cf6f', '#58c26a', '#7bd66b', '#f0d47a', '#63cf6f', '#f2c56b', '#f4f7fb'][i] ?? '#63cf6f'; c.fill(); });
  c.fillStyle = '#f4f7fb'; c.fillRect(0, 478, 1024, 34); c.fillRect(0, 0, 1024, 14);
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(hash(i) * 1024, 60 + hash(i * 3) * 390, 18 + hash(i * 7) * 40, 5 + hash(i * 5) * 7, 0, 0, 7); c.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  var globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: .7, emissive: '#0a2b55', emissiveIntensity: .35 }));
  globe.castShadow = false; globe.receiveShadow = false;
}
const globeTilt = new THREE.Group(); globeTilt.add(globe); G_globe.add(globeTilt);
function onGlobe(lon, lat, r = R) { const ph = (lon + 180) / 360 * 2 * Math.PI, th = (90 - lat) * DEG; return new THREE.Vector3(-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th)); }
const gPin = new THREE.Group(); { const p = onGlobe(2.3, 46.6); gPin.position.copy(p); gPin.quaternion.setFromUnitVectors(Y, p.clone().normalize());
  gPin.add(cone(.3, .9, C.red, { rot: [Math.PI, 0, 0], pos: [0, .45, 0], rough: .4, emissive: '#7a0010', emissiveI: .6, cast: false })); gPin.add(ball(.42, C.red, { pos: [0, 1.05, 0], rough: .35, emissive: '#7a0010', emissiveI: .6, cast: false })); gPin.add(ball(.16, '#ffffff', { pos: [0, 1.05, .34], cast: false }));
  var gPinGlow = glow('#ffd34d', 3.4, .9); gPinGlow.position.y = .9; gPin.add(gPinGlow); globe.add(gPin); }
const halo = glow('#58c8ff', 21, .5); halo.position.z = -3; G_globe.add(halo);
const orbiters = GAMES.map((gm, i) => { const m = gm.make(); m.scale.setScalar(.95); const gl = glow(gm.color, 4.2, .55); m.add(gl); G_globe.add(m); return m; });
const gClouds = []; for (let i = 0; i < 6; i++) { const cl = cloud(.5 + hash(i) * .3); gClouds.push(cl); globeTilt.add(cl); }

// ======================================================================== plan 1 : la carte de France
const G_fr = new THREE.Group(); scene.add(G_fr);
const S = 1.7, M = (lon, lat) => [(lon - 2.3) * .68 * S + .65, -(lat - 46.6) * S];           // lon/lat -> x, z
const FR = [[2.4, 51.1], [4.2, 50.0], [5.8, 49.5], [8.2, 49.0], [7.6, 47.6], [6.1, 46.3], [7.0, 45.9], [6.7, 44.2], [7.6, 43.8], [6.2, 43.1], [4.6, 43.4], [3.1, 43.1], [3.1, 42.4], [1.7, 42.5], [-0.3, 42.8], [-1.8, 43.4], [-1.2, 44.6], [-1.1, 46.0], [-2.2, 47.1], [-4.5, 47.9], [-4.7, 48.4], [-3.0, 48.8], [-1.6, 48.6], [-1.6, 49.6], [-1.2, 49.4], [0.2, 49.5], [1.5, 50.1]];
{
  const sh = new THREE.Shape(); FR.forEach((p, i) => { const [x, z] = M(...p); i ? sh.lineTo(x, -z) : sh.moveTo(x, -z); }); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .7, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 2 }); geo.rotateX(-Math.PI / 2);
  const base = new THREE.Mesh(geo, mat('#e9cf8f', { rough: .8 })); base.castShadow = true; base.receiveShadow = true; G_fr.add(base);
  // dessus : mosaïque de zones colorées (motif décoratif)
  const X0 = -9.2, X1 = 9.2, Z0 = -9.2, Z1 = 9.2, N = 640, px = x => (x - X0) / (X1 - X0) * N, pz = z => (z - Z0) / (Z1 - Z0) * N;
  const top = sign(X1 - X0, Z1 - Z0, (c) => {
    const seeds = []; for (let i = 0; i < 46; i++) seeds.push([hash(i * 3.1) * N, hash(i * 7.7 + 2) * N, i]);
    const cols = [[111, 208, 122], [88, 194, 106], [141, 220, 107], [73, 179, 122], [166, 224, 122], [63, 174, 138], [201, 226, 126], [120, 200, 96]];
    const im = c.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let b1 = 1e9, b2 = 1e9, bi = 0; for (const s of seeds) { const q = (x - s[0]) ** 2 + (y - s[1]) ** 2; if (q < b1) { b2 = b1; b1 = q; bi = s[2]; } else if (q < b2) b2 = q; }
      const edge = Math.sqrt(b2) - Math.sqrt(b1) < 2.6, col = edge ? [247, 239, 200] : cols[bi % cols.length], o = (y * N + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    c.putImageData(im, 0, 0);
    const path = () => { c.beginPath(); FR.forEach((p, i) => { const [x, z] = M(...p); i ? c.lineTo(px(x), pz(z)) : c.moveTo(px(x), pz(z)); }); c.closePath(); };
    c.strokeStyle = '#4aa9e6'; c.lineWidth = 5; c.lineCap = 'round';                                        // fleuves stylisés
    for (const riv of [[[2.35, 48.86], [3.6, 48.2], [4.6, 47.8]], [[2.35, 48.86], [1.1, 49.3], [0.2, 49.5]], [[-2.2, 47.2], [0.5, 47.4], [2.6, 47.6], [3.8, 46.0]], [[4.8, 43.4], [4.8, 45.7], [5.9, 46.2]], [[-1.0, 45.0], [0.5, 44.5], [1.4, 43.6]]]) { c.beginPath(); riv.forEach((p, i) => { const [x, z] = M(...p); i ? c.lineTo(px(x), pz(z)) : c.moveTo(px(x), pz(z)); }); c.stroke(); }
    c.globalCompositeOperation = 'destination-in'; path(); c.fillStyle = '#000'; c.fill(); c.globalCompositeOperation = 'source-over';
    path(); c.strokeStyle = '#fff6d2'; c.lineWidth = 9; c.lineJoin = 'round'; c.stroke();
  }, { res: N });
  top.material.alphaTest = .5; top.material.transparent = false; top.rotation.x = -Math.PI / 2; top.position.set((X0 + X1) / 2, .835, (Z0 + Z1) / 2); top.receiveShadow = true; G_fr.add(top);
}
const seaTex = canvasTex(256, (c, n) => { c.fillStyle = '#1b93d6'; c.fillRect(0, 0, n, n); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 14; i++) { const x = hash(i) * n, y = hash(i * 3) * n; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 12, y - 8, x + 24, y); c.quadraticCurveTo(x + 36, y + 8, x + 48, y); c.stroke(); } }, { repeat: 10 });
G_fr.add(ground(140, C.sea, { tex: seaTex }));
// reliefs (montagnes) et petits arbres
for (const [lo, la, h] of [[6.6, 45.3, 1.5], [6.9, 44.8, 1.2], [6.3, 45.8, 1.1], [6.5, 44.4, .9], [0.2, 42.9, 1.1], [1.2, 42.8, .9], [-0.7, 43.1, .8], [2.9, 45.2, .8], [3.2, 45.6, .7]]) { const [x, z] = M(lo, la); const m = cone(h * .75, h, '#9aa7b5', { seg: 6, flat: true, pos: [x, .83 + h / 2, z] }); G_fr.add(m); G_fr.add(cone(h * .32, h * .42, '#ffffff', { seg: 6, flat: true, pos: [x, .83 + h * .8, z] })); }
for (let i = 0; i < 16; i++) { const lo = -1 + hash(i * 2.3) * 6.5, la = 43.8 + hash(i * 5.1) * 5.2; const [x, z] = M(lo, la); const tr = bushyTree(.75 + hash(i) * .35, i % 2 ? '#2f9a4e' : '#3fae4a'); tr.position.set(x, .83, z); G_fr.add(tr); }
// épingles de villes (sans nom) + grande épingle « PARIS »
function pin(h, color, r) { const g = new THREE.Group(); g.add(cone(r * .7, h, color, { rot: [Math.PI, 0, 0], pos: [0, h / 2, 0], rough: .4 })); g.add(ball(r, color, { pos: [0, h + r * .55, 0], rough: .3 })); g.add(ball(r * .38, '#ffffff', { pos: [0, h + r * .55, r * .78] })); return g; }
const CITY = [[4.83, 45.76], [5.37, 43.3], [1.44, 43.6], [-0.58, 44.84], [-1.55, 47.22], [3.06, 50.63], [7.75, 48.58], [-1.68, 48.11], [7.26, 43.7], [3.88, 43.61], [-4.2, 48.2], [5.04, 47.32]];
const cityPins = CITY.map(([lo, la], i) => { const p = pin(1.0, [C.turq, '#ff9d2e', '#b388ff', '#ffffff'][i % 4], .34); const [x, z] = M(lo, la); p.position.set(x, .83, z); G_fr.add(p); return p; });
const [PX, PZ] = M(2.35, 48.86);
const parisPin = pin(2.3, C.red, .75); parisPin.position.set(PX, .83, PZ); G_fr.add(parisPin);
const parisGlow = glow('#ffd34d', 6, .8); parisGlow.position.set(PX, 3.6, PZ); G_fr.add(parisGlow);
const parisLabel = sign(4.2, 1.5, (c, w, h) => { c.fillStyle = '#10214a'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, h * .3); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.stroke(); c.fillStyle = C.gold; c.font = `400 ${h * .56}px "Bungee"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PARIS', w / 2, h * .54); }, { res: 512, emissive: true }); G_fr.add(parisLabel);
// rose des vents, voiliers, nuages
const compass = sign(6, 6, (c, w) => { c.translate(w / 2, w / 2); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, w * .42, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); c.fillStyle = i % 2 ? 'rgba(255,255,255,.8)' : (i ? '#fff6d2' : C.red); const l = i % 2 ? w * .24 : w * .4; c.beginPath(); c.moveTo(0, -l); c.lineTo(w * .05, 0); c.lineTo(-w * .05, 0); c.fill(); c.restore(); } c.fillStyle = '#fff'; c.font = `400 ${w * .13}px "Bungee"`; c.textAlign = 'center'; c.fillText('N', 0, -w * .43 + 6); }, { res: 256 });
compass.rotation.x = -Math.PI / 2; compass.position.set(-6.6, .06, 7.6); G_fr.add(compass);
function boat(col) { const g = new THREE.Group(); g.add(rbox(1.5, .4, .6, .18, '#8a5a34', { pos: [0, .2, 0] })); g.add(cyl(.04, .04, 1.5, '#5b3a22', { pos: [0, 1, 0], seg: 6 })); const s = cone(.6, 1.2, col, { seg: 3, pos: [.02, 1.1, 0] }); s.scale.z = .15; g.add(s); return g; }
const boats = [boat('#ffffff'), boat('#ffdf6b'), boat('#ff8f8f')]; boats.forEach(b => G_fr.add(b));
const frClouds = []; for (let i = 0; i < 5; i++) { const cl = cloud(1.1 + hash(i * 3) * .6); frClouds.push(cl); G_fr.add(cl); }
const heroFr = makeCharacter({ shirt: '#ff7a2f', pants: '#2b3350', hair: '#4a2f1d', hat: 'cap', hatColor: '#19a7b8', face: 'happy', scale: .42 });
heroFr.parts.torso.add(rbox(1.3, 1.5, .6, .2, '#7a4f2b', { pos: [0, 0, -.75] })); G_fr.add(heroFr);
const [HX0, HZ0] = M(0.4, 44.6);

// ======================================================================== plan 2 : Paris
const G_paris = new THREE.Group(); scene.add(G_paris);
const paveTex = canvasTex(256, (c, n) => { c.fillStyle = '#cfc8ba'; c.fillRect(0, 0, n, n); c.strokeStyle = '#a9a294'; c.lineWidth = 3; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * n / 4); c.lineTo(n, i * n / 4); c.stroke(); for (let j = 0; j < 2; j++) { c.beginPath(); c.moveTo((j + (i % 2) * .5) * n / 2, i * n / 4); c.lineTo((j + (i % 2) * .5) * n / 2, (i + 1) * n / 4); c.stroke(); } } }, { repeat: 30 });
G_paris.add(ground(180, '#cfc8ba', { tex: paveTex }));
G_paris.add(box(180, .1, 9, '#3c4250', { pos: [0, .0, 8.5], cast: false }));
for (let i = -12; i <= 12; i++) G_paris.add(box(2.2, .04, .28, '#f5f0e0', { pos: [i * 5, .07, 8.5], cast: false }));
G_paris.add(box(180, .3, .5, '#a39c8e', { pos: [0, .15, 3.9] }));
function facade(wd, ht, seed) {
  return sign(wd, ht, (c, w, h) => {
    c.fillStyle = ['#f3e3c3', '#efdcb6', '#f6ead0'][seed % 3]; c.fillRect(0, 0, w, h); const fl = Math.round(ht / 2.3), cols = Math.max(3, Math.round(wd / 1.7));
    c.fillStyle = 'rgba(120,90,50,.18)'; for (let f = 1; f < fl; f++) c.fillRect(0, h - f * h / fl - 4, w, 8);
    for (let f = 1; f < fl; f++) for (let k = 0; k < cols; k++) { const x = (k + .5) * w / cols, y = h - (f + .55) * h / fl, ww = w / cols * .42, hh = h / fl * .62; const lit = hash(seed * 31 + f * 7 + k) > .45;
      c.fillStyle = lit ? '#ffd98a' : '#5d7fa6'; c.fillRect(x - ww / 2, y - hh / 2, ww, hh); c.strokeStyle = '#fffaf0'; c.lineWidth = 3; c.strokeRect(x - ww / 2, y - hh / 2, ww, hh); c.beginPath(); c.moveTo(x, y - hh / 2); c.lineTo(x, y + hh / 2); c.stroke();
      c.fillStyle = '#2b3040'; c.fillRect(x - ww * .7, y + hh / 2 - 2, ww * 1.4, 5); }
    const sh = ['#c0392b', '#1f7a5c', '#27467a', '#b8860b'][seed % 4]; c.fillStyle = '#3a2c22'; c.fillRect(0, h - h / fl, w, h / fl);
    c.fillStyle = '#ffe2a0'; for (let k = 0; k < 2; k++) c.fillRect(w * (.1 + k * .5), h - h / fl * .78, w * .3, h / fl * .6);
    for (let k = 0; k < 10; k++) { c.fillStyle = k % 2 ? '#fff8ea' : sh; c.fillRect(k * w / 10, h - h / fl * 1.02, w / 10 + 1, h / fl * .26); }
  }, { res: 256 });
}
const BLD = [[-27, 7, 11], [-19.5, 7.6, 12.5], [-12, 7, 10.5], [-4.6, 7.4, 12], [17.6, 7.4, 11.5], [25, 7, 12.6], [32.4, 7.4, 10.8]];
BLD.forEach(([x, wd, ht], i) => {
  G_paris.add(box(wd, ht, 8, C.cream, { pos: [x, ht / 2, -6] })); const f = facade(wd, ht, i + 1); f.position.set(x, ht / 2, -1.98); f.receiveShadow = true; G_paris.add(f);
  const roof = cyl(wd * .62, wd * .72, 1.7, C.roof, { seg: 4, pos: [x, ht + .85, -6], rot: [0, Math.PI / 4, 0], flat: true }); roof.scale.z = 1.05; G_paris.add(roof);
  for (let k = -1; k <= 1; k++) { G_paris.add(box(.8, .9, .5, '#f6ead0', { pos: [x + k * wd * .27, ht + .75, -2.4] })); G_paris.add(box(.5, .55, .1, '#ffd98a', { emissive: '#ffb648', emissiveI: .7, pos: [x + k * wd * .27, ht + .75, -2.12] })); }
  G_paris.add(box(.7, 1.6, .7, '#a85b3c', { pos: [x + wd * .3, ht + 2.2, -6.5] }));
});
for (let i = -5; i <= 5; i++) {                                   // lampadaires et arbres
  const x = i * 6.2 + 2; const lp = new THREE.Group(); lp.add(cyl(.09, .13, 4.2, '#20242e', { pos: [0, 2.1, 0], seg: 8 })); lp.add(box(.5, .6, .5, '#ffe9a8', { emissive: '#ffcf5a', emissiveI: 1.2, pos: [0, 4.4, 0], cast: false })); lp.add(cone(.42, .3, '#20242e', { seg: 4, pos: [0, 4.85, 0], rot: [0, Math.PI / 4, 0] })); const gl = glow('#ffd77a', 2.6, .55); gl.position.y = 4.4; lp.add(gl); lp.position.set(x, 0, 3.2); G_paris.add(lp);
  if (i % 2 && (x < 2 || x > 15)) { const tr = bushyTree(3.6, '#5cb85f'); tr.position.set(x + 3.1, 0, 2.6); G_paris.add(tr); G_paris.add(box(1.3, .25, 1.3, '#6a5a48', { pos: [x + 3.1, .12, 2.6] })); }
}
// grande tour en treillis au fond de l'avenue
const tower = new THREE.Group(); { const tc = '#7b5f48', o = { rough: .6 };
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { tower.add(beam([sx * 6, 0, sz * 6], [sx * 2.6, 12, sz * 2.6], 1.3, tc, o)); tower.add(beam([sx * 2.5, 12.6, sz * 2.5], [sx * 1.2, 23, sz * 1.2], .95, tc, o)); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const ar = new THREE.Mesh(new THREE.TorusGeometry(3.6, .45, 8, 20, Math.PI), mat(tc, o)); ar.position.set(Math.sin(a) * 4.6, 4.6, Math.cos(a) * 4.6); ar.rotation.y = a; tower.add(ar);
    for (let j = 1; j < 6; j++) { const y = j * 2, r = lerp(6, 2.6, y / 12); tower.add(beam([Math.cos(a + .785) * r * 1.414, y, Math.sin(a + .785) * r * 1.414], [Math.cos(a + 2.356) * r * 1.414, y + (j % 2 ? 1.6 : -1.6) * .0 + 0, Math.sin(a + 2.356) * r * 1.414], .28, tc, o)); } }
  tower.add(box(6.6, .7, 6.6, tc, { ...o, pos: [0, 12.3, 0] })); tower.add(box(3.4, .6, 3.4, tc, { ...o, pos: [0, 23.2, 0] }));
  tower.add(cyl(.35, 1.5, 15, tc, { ...o, seg: 4, pos: [0, 31, 0], rot: [0, Math.PI / 4, 0] })); tower.add(box(1.5, .5, 1.5, tc, { ...o, pos: [0, 36.5, 0] })); tower.add(cyl(.06, .14, 4, tc, { pos: [0, 40.4, 0], seg: 6 }));
  const tg = glow('#ffe7a0', 5, .9); tg.position.y = 42.4; tower.add(tg); tower.userData.tip = tg; tower.position.set(6.6, 0, -42); tower.traverse(m => { if (m.isMesh) m.castShadow = false; }); G_paris.add(tower); }
G_paris.add(box(13, .05, 70, '#d9d2c2', { pos: [6.6, .03, -32], cast: false }));
for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const tr = bushyTree(3 + hash(i) * .8, '#4cae58'); tr.position.set(6.6 + s * 5.4, 0, -6 - i * 5); G_paris.add(tr); }
const pClouds = []; for (let i = 0; i < 5; i++) { const cl = cloud(2 + hash(i * 9) * 1.4, '#ffe9dc'); pClouds.push(cl); G_paris.add(cl); }
const heroP = makeCharacter({ shirt: '#ff7a2f', pants: '#2b3350', hair: '#4a2f1d', hat: 'cap', hatColor: '#19a7b8', face: 'wow' });
heroP.parts.torso.add(rbox(1.3, 1.5, .6, .2, '#7a4f2b', { pos: [0, 0, -.75] })); G_paris.add(heroP);
const passers = [makeCharacter({ shirt: '#3ccf6e', pants: '#394a6d', hair: '#222', face: 'smile' }), makeCharacter({ shirt: '#c084fc', pants: '#2b3350', hat: 'top', hatColor: '#222a3a', face: 'happy' })]; passers.forEach(p => G_paris.add(p));

// ======================================================================== plan 3 et 4 : la place des portes
const G_doors = new THREE.Group(); scene.add(G_doors);
const plazaTex = canvasTex(256, (c, n) => { c.fillStyle = '#39406b'; c.fillRect(0, 0, n, n); c.strokeStyle = '#555e96'; c.lineWidth = 4; for (let i = 0; i <= 2; i++) { c.beginPath(); c.moveTo(0, i * n / 2); c.lineTo(n, i * n / 2); c.moveTo(i * n / 2, 0); c.lineTo(i * n / 2, n); c.stroke(); } c.fillStyle = '#434b7c'; c.fillRect(8, 8, n / 2 - 16, n / 2 - 16); c.fillRect(n / 2 + 8, n / 2 + 8, n / 2 - 16, n / 2 - 16); }, { repeat: 22 });
G_doors.add(ground(160, '#39406b', { tex: plazaTex }));
const TY = 8.2;                                                    // hauteur de la terrasse
G_doors.add(box(15, TY, 9, '#5a5f8f', { pos: [0, TY / 2, -7.6] })); G_doors.add(box(15.6, .5, 9.6, '#8087bd', { pos: [0, TY + .1, -7.6] }));
for (const s of [-1, 1]) { G_doors.add(box(1.4, TY + 9.5, 1.4, '#4a4f7c', { pos: [s * 7.4, (TY + 9.5) / 2, -9] })); G_doors.add(cone(1.3, 2.4, '#ffc93c', { seg: 4, pos: [s * 7.4, TY + 10.7, -9], rot: [0, Math.PI / 4, 0], emissive: '#7a4a00', emissiveI: .5 })); const g = glow('#ffd77a', 4, .7); g.position.set(s * 7.4, TY + 12.3, -9); G_doors.add(g); }
const DOORPOS = [[-3.5, 0, -2.6], [3.5, 0, -2.6], [-3.4, TY + .35, -8.6], [3.4, TY + .35, -8.6]];
const doors = GAMES.map((gm, i) => {
  const g = new THREE.Group(), st = '#d8d3ee', o = { rough: .7 };
  for (const s of [-1, 1]) { g.add(box(.75, 4.6, .9, st, { ...o, pos: [s * 1.85, 2.3, 0] })); g.add(box(1.05, .4, 1.15, '#f1eeff', { ...o, pos: [s * 1.85, .2, 0] })); g.add(box(1.0, .3, 1.1, '#f1eeff', { ...o, pos: [s * 1.85, 4.55, 0] })); }
  const ar = new THREE.Mesh(new THREE.TorusGeometry(1.85, .42, 10, 24, Math.PI), mat(st, o)); ar.position.y = 4.6; ar.castShadow = true; g.add(ar);
  g.add(box(.7, .8, 1.0, gm.color, { rough: .4, emissive: gm.color, emissiveI: .5, pos: [0, 6.55, 0] }));
  const portal = sign(3.3, 6.3, (c, w, h) => { const r = w / 2; c.beginPath(); c.moveTo(0, h); c.lineTo(0, r); c.arc(r, r, r, Math.PI, 0); c.lineTo(w, h); c.closePath(); c.clip();
    const gr = c.createRadialGradient(w / 2, h * .45, 4, w / 2, h * .45, h * .7); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, gm.color); gr.addColorStop(1, '#141a3d'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 5; for (let k = 0; k < 3; k++) { c.beginPath(); for (let a = 0; a < 9; a += .1) { const q = 6 + a * (w * .06), x = w / 2 + Math.cos(a + k * 2.1) * q, y = h * .45 + Math.sin(a + k * 2.1) * q * 1.3; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); } }, { res: 256, emissive: true });
  portal.position.set(0, 3.15, -.1); g.add(portal);
  const swirl = sign(2.6, 2.6, (c, w) => { c.translate(w / 2, w / 2); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 7; c.lineCap = 'round'; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.arc(0, 0, w * .36, 0, 1.0); c.stroke(); c.beginPath(); c.arc(0, 0, w * .22, .4, 1.5); c.stroke(); } }, { res: 128, emissive: true }); swirl.position.set(0, 3.0, .02); g.add(swirl);
  const gl = glow(gm.color, 7.5, .6); gl.position.set(0, 3.2, .5); g.add(gl);
  const plate = sign(4.6, 1.15, (c, w, h) => { c.fillStyle = '#10163a'; c.beginPath(); c.roundRect(3, 3, w - 6, h - 6, h * .3); c.fill(); c.strokeStyle = gm.color; c.lineWidth = 8; c.stroke(); c.fillStyle = '#ffffff'; let fs = h * .5; c.font = `400 ${fs}px "Bungee"`; const tw = c.measureText(gm.name).width; if (tw > w * .86) { fs *= w * .86 / tw; c.font = `400 ${fs}px "Bungee"`; } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(gm.name, w / 2, h * .54); }, { res: 512, emissive: true });
  plate.position.set(0, 7.75, .1); g.add(plate);
  const em = gm.make(); em.position.set(0, 2.6, 1.7); em.scale.setScalar(.92); g.add(em);
  g.add(cyl(.9, 1.05, .5, '#8087bd', { pos: [0, .25, 1.7], seg: 8 }));
  g.position.set(...DOORPOS[i]); G_doors.add(g); return { g, em, swirl, gl, plate };
});
for (let i = 0; i < 6; i++) { const x = (i % 2 ? 1 : -1) * (8.6 + (i >> 1) * 2.6), z = 2 + (i >> 1) * 4.5; const lp = new THREE.Group(); lp.add(cyl(.1, .14, 3.4, '#262b52', { pos: [0, 1.7, 0], seg: 8 })); lp.add(ball(.36, '#fff0b8', { emissive: '#ffd77a', emissiveI: 1.3, pos: [0, 3.6, 0], cast: false })); const g = glow('#ffd77a', 3, .6); g.position.y = 3.6; lp.add(g); lp.position.set(x, 0, z); G_doors.add(lp); }
const heroD = makeCharacter({ shirt: '#ff7a2f', pants: '#2b3350', hair: '#4a2f1d', hat: 'cap', hatColor: '#19a7b8', face: 'wow' });
heroD.parts.torso.add(rbox(1.3, 1.5, .6, .2, '#7a4f2b', { pos: [0, 0, -.75] })); G_doors.add(heroD);
const bigCoin = coinModel(1.5); G_doors.add(bigCoin); const coinGlow = glow('#ffd34d', 9, .8); G_doors.add(coinGlow);
const orbs = []; for (let i = 0; i < 5; i++) { const o = new THREE.Group(); o.add(ball(.3, '#ffffff', { emissive: C.chess, emissiveI: 1.5, cast: false })); o.add(glow('#c4a8ff', 2.8, .95)); G_doors.add(o); orbs.push(o); }
const NC = 70, coinInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(.34, .34, .08, 16), mat('#ffc31f', { rough: .3, emissive: '#8a5a00', emissiveI: .7 }), NC); coinInst.castShadow = false; coinInst.frustumCulled = false; G_doors.add(coinInst);
const _m = new THREE.Object3D();
const GROUPS = [G_globe, G_fr, G_paris, G_doors];

// ---------- repères sonores ----------
const ORB_T = i => T.reb + .55 + i * ((BAR - .55) / 4);             // arrivée de chaque rebirth sur la pièce ; le 5e tombe sur T.coin
const DOOR_T = i => T.doors + .25 + i * .42;
cue(0.02, 'whoosh'); cue(0.1, 'riser', .7, T.fr - .3); cue(1.0, 'chime', .7); cue(T.fr - .5, 'swish');
cue(T.fr, 'impact'); CITY.forEach((_, i) => cue(T.fr + .45 + i * .14, 'pop', .5)); cue(T.fr + 2.3, 'bell', .8);
cue(T.frB, 'whoosh', .8); for (let i = 0; i < 5; i++) cue(T.frB + .35 + i * .5, 'tap', .5); cue(T.paris - .55, 'riser', .6, .55);
cue(T.paris, 'boom', .8); cue(T.paris + .5, 'chime'); for (let i = 0; i < 6; i++) cue(T.paris + .9 + i * .5, 'tap', .45); cue(T.paris + 2.4, 'ding', .7);
cue(T.doors - .25, 'whoosh'); cue(T.doors, 'impact', .8); for (let i = 0; i < 4; i++) { cue(DOOR_T(i), 'powerup', .7); cue(DOOR_T(i) + .2, 'pop', .6); }
cue(T.doorsB, 'swish'); for (let i = 0; i < 4; i++) cue(T.doorsB + .12 + i * .8, 'ding', .7);
cue(T.reb, 'whoosh'); for (let i = 0; i < 5; i++) { cue(ORB_T(i) - .55, 'zap', .45); cue(ORB_T(i), 'tick', .9); }
cue(T.coin, 'boom'); cue(T.coin, 'win'); for (let i = 0; i < 6; i++) cue(T.coin + .2 + i * .14, 'coin', .7);
for (let i = 0; i < 5; i++) cue(T.boost + .1 + i * .36, 'powerup', .55 + i * .08); cue(T.end - .5, 'riser', .7, .5);
cue(T.end, 'impact'); cue(T.end + .2, 'chime'); cue(T.end + .9, 'pop'); cue(T.end + 1.3, 'ding', .7);

// ---------- aides 2D ----------
function stars(t, alpha = 1, n = 110) { ctx.save(); for (let i = 0; i < n; i++) { const x = hash(i * 3.3) * W, y = hash(i * 7.1) * H, s = 1.5 + hash(i * 5) * 3.5, k = .45 + .55 * Math.sin(t * (1.5 + hash(i) * 3) + i); ctx.globalAlpha = alpha * k; ctx.fillStyle = i % 5 ? '#ffffff' : '#ffe9a0'; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); } ctx.restore(); }
function setLight(sun, sunI, sky, gnd, ambI) { L.sun.color.set(sun); L.sun.intensity = sunI; L.hemi.color.set(sky); L.hemi.groundColor.set(gnd); L.hemi.intensity = ambI; }
const bez = (a, b, c, k) => a.map((_, j) => (1 - k) * (1 - k) * a[j] + 2 * k * (1 - k) * b[j] + k * k * c[j]);
const mixv = (a, b, k) => a.map((_, j) => lerp(a[j], b[j], k));
const FACE = -Math.PI / 2 - 2.3 * DEG;                              // rotation du globe qui met la France face à la caméra

function globeFrame(t, spin, tilt) {
  globe.rotation.y = FACE + spin; globeTilt.rotation.x = tilt;
  gPin.scale.setScalar(1 + Math.sin(t * 6) * .08); gPinGlow.material.opacity = .65 + .3 * Math.sin(t * 6);
  gClouds.forEach((cl, i) => { const p = onGlobe(-160 + i * 62 + t * 6, -35 + hash(i * 4) * 80, R + .55); cl.position.copy(p); cl.quaternion.setFromUnitVectors(Y, p.clone().normalize()); });
}

function render(t) {
  let sx = 0, sy = 0; const add = s => { sx += s[0]; sy += s[1]; };
  add(shake(t, T.fr, 14)); add(shake(t, T.paris, 14)); add(shake(t, T.coin, 26, .6)); add(shake(t, T.end, 12));

  if (t < T.fr) {                                                   // ---------- accroche : le globe, on plonge vers la France
    showOnly(GROUPS, G_globe); bg([[0, '#050b24'], [.55, '#0d2a63'], [1, '#12458f']]); stars(t); rays(t, { cy: 760, color: 'rgba(120,190,255,.06)', speed: .12 });
    setLight('#fff4de', 2.6, '#bfe0ff', '#27407a', 1.25);
    const k = prog(t, 0, T.fr - .7, ease.out), z = prog(t, T.fr - .9, T.fr, ease.in);
    globeFrame(t, (1 - k) * -5.2, .68); orbiters.forEach(o => o.visible = false); halo.material.opacity = .5;
    camLook(camera, [0, 2 - z * 1.2, lerp(27, 17.5, k) - z * 9], [0, -1.6 + z * 1.6, 0], 42);
  } else if (t < T.paris) {                                         // ---------- la carte de France
    showOnly(GROUPS, G_fr); bg(['#8fd6ff', '#d9f3ff']); setLight('#fff1dc', 2.7, '#d4ecff', '#3b84b8', 1.2);
    const hk = prog(t, T.frB + .2, T.paris - .7, ease.io), hx = lerp(HX0, PX - .7, hk), hz = lerp(HZ0, PZ + 1.2, hk);
    heroFr.position.set(hx, .83 + Math.abs(Math.sin(t * 10)) * .08 * (hk > 0 && hk < 1 ? 1 : 0), hz); heroFr.rotation.y = Math.atan2(PX - .7 - HX0, PZ + 1.2 - HZ0);
    hk > 0 && hk < 1 ? poseWalk(heroFr, t * 10) : (t > T.paris - .7 ? poseCheer(heroFr, t) : poseIdle(heroFr, t));
    cityPins.forEach((p, i) => { const a = T.fr + .45 + i * .14, q = inv(a, a + .45, t); p.visible = q > 0; p.position.y = .83 + (1 - ease.bounce(q)) * 5; });
    const pq = inv(T.fr + 2.2, T.fr + 2.8, t); parisPin.visible = pq > 0; parisPin.position.y = .83 + (1 - ease.bounce(pq)) * 8; parisPin.scale.setScalar(1 + Math.sin(t * 5) * .05);
    parisGlow.visible = pq >= 1; parisGlow.material.opacity = .55 + .3 * Math.sin(t * 5); parisGlow.scale.setScalar(6 + Math.sin(t * 5) * .8);
    parisLabel.visible = pq >= 1; parisLabel.position.set(PX, 5.6 + Math.sin(t * 2.2) * .12, PZ); parisLabel.scale.setScalar(ease.back(inv(T.fr + 2.8, T.fr + 3.1, t)) || .001);
    boats.forEach((b, i) => { const a = t * .12 + i * 2.1; b.position.set([-9.5, 9.8, -4][i] + Math.sin(a) * 1.2, .05 + Math.sin(t * 2 + i) * .06, [-3, 3.5, 9.8][i] + Math.cos(a) * 1.2); b.rotation.set(Math.sin(t * 1.7 + i) * .06, a + 1.5, 0); });
    frClouds.forEach((cl, i) => cl.position.set(-13 + ((i * 6.3 + t * .7) % 26), 7.5 + hash(i) * 2, -8 + i * 3.6));
    if (t < T.frB) { const k = inv(T.fr, T.frB, t), a = -.35 + k * .7; camLook(camera, [Math.sin(a) * 21 - .3, lerp(33, 28, ease.out(k)), Math.cos(a) * 21], [-.3, 0, -.6], 42); }
    else { const k = inv(T.frB, T.paris, t), z = prog(t, T.paris - .6, T.paris, ease.in); const tg = [lerp(hx, PX, .35 + z * .65), 2.2 + z * 1.2, lerp(hz, PZ, .35 + z * .65)];
      camLook(camera, [tg[0] + 5.5 - k * 2.5 - z * 3, 5.2 - k * .8 - z * 1, tg[2] + 12.5 - k * 2.5 - z * 7], tg, 42); parisLabel.lookAt(camera.position); }
    if (t < T.frB) parisLabel.rotation.set(-1.0, 0, 0);
  } else if (t < T.doors) {                                         // ---------- Paris
    showOnly(GROUPS, G_paris); bg([[0, '#5f8fe0'], [.42, '#ffb98a'], [.62, '#ffe1b0'], [1, '#ffe9c6']]); setLight('#ffd9a8', 2.7, '#ffe6d0', '#8a7460', 1.15);
    const k = inv(T.paris, T.doors, t), hx = lerp(-9, 3.5, k);
    heroP.position.set(hx, Math.abs(Math.sin(t * 9)) * .22, 1.4); heroP.rotation.y = Math.PI / 2 - .25; poseWalk(heroP, t * 9); heroP.parts.head.rotation.set(-.25, -.5, 0);
    passers[0].position.set(14 - k * 7, 0, -.3); passers[0].rotation.y = -Math.PI / 2; poseWalk(passers[0], t * 8 + 1, .55);
    passers[1].position.set(-16 + k * 5, 0, 0); passers[1].rotation.y = Math.PI / 2; poseWalk(passers[1], t * 7, .5);
    pClouds.forEach((cl, i) => cl.position.set(-30 + ((i * 14 + t * 1.2) % 70), 34 + hash(i) * 12, -70));
    tower.userData.tip.material.opacity = .6 + .4 * Math.sin(t * 8);
    const e = ease.io(k); camLook(camera, [lerp(-8, 5.5, e), lerp(2.6, 3.4, e), lerp(21, 25, e)], [lerp(-5, 5.4, e), lerp(6.5, 10.5, e), -6], 46);
  } else if (t < T.end) {                                           // ---------- la place des portes, puis rebirths -> pièce
    showOnly(GROUPS, G_doors); bg([[0, '#0c1238'], [.5, '#3a2a7a'], [.8, '#b0508f'], [1, '#ff9a6a']]); stars(t, .8 * (1 - inv(900, 1500, 0)), 80);
    setLight('#ffe2c8', 2.2, '#b9b6ff', '#4a3f7a', 1.25);
    doors.forEach((d, i) => { const q = ease.back(inv(DOOR_T(i), DOOR_T(i) + .4, t)); d.g.scale.setScalar(Math.max(q, .001)); d.g.visible = t >= DOOR_T(i);
      d.em.position.y = 2.75 + Math.sin(t * 2.4 + i) * .16; d.em.rotation.y = t * 1.6 + i; d.swirl.rotation.z = -t * 2.2; d.gl.material.opacity = .45 + .2 * Math.sin(t * 3 + i * 1.7); if (d.em.userData.car) d.em.userData.car.position.x = Math.sin(t * 2.5) * .35; });
    const reb = t >= T.reb, COIN = [1.9, 7.2, 4.2];
    bigCoin.visible = coinGlow.visible = t >= T.coin - .05; coinInst.visible = t >= T.coin;
    orbs.forEach((o, i) => { const a = ORB_T(i) - .62, q = inv(a, ORB_T(i), t); o.visible = reb && q > 0 && q < 1; if (o.visible) { const p = bez([-3.5, 3.2, -2.2], [-2.5 + i * .5, 9.5, 3], [COIN[0], COIN[1], COIN[2]], ease.io(q)); o.position.set(...p); o.scale.setScalar(.7 + q * .6); } });
    if (!reb) {
      heroD.position.set(0, 0, 5.2); heroD.rotation.y = Math.PI + Math.sin(t * 1.3) * .5; t < T.doorsB ? poseIdle(heroD, t) : poseCheer(heroD, t); heroD.visible = t < T.doorsB;
      if (t < T.doorsB) { const k = inv(T.doors, T.doorsB, t), e = ease.out(k); camLook(camera, [Math.sin(-.25 + k * .5) * 6, lerp(11, 13.5, e), lerp(36, 31.5, e)], [0, lerp(7.4, 8.4, e), -5], 44); }
      else {                                                         // visite rapide de chaque porte
        const u = (t - T.doorsB) / .8, i = clamp(Math.floor(u), 0, 3), f = ease.io(clamp((u - i) / .42)), order = [0, 1, 3, 2];
        const P = j => { const d = DOORPOS[order[clamp(j, 0, 3)]]; return [d[0], d[1] + 3.9, d[2]]; }, a = P(i - 1), b = P(i), p = i ? mixv(a, b, f) : b, push = (u - i) * .9;
        camLook(camera, [p[0] * .82, p[1] + .7, p[2] + 15.5 - push], [p[0], p[1] + .25, p[2]], 44);
      }
    } else {
      heroD.visible = true; heroD.position.set(2.6, t > T.coin ? Math.abs(Math.sin((t - T.coin) * 7)) * .9 : 0, 4.6); heroD.rotation.y = -.35; t > T.coin ? poseCheer(heroD, t) : poseIdle(heroD, t); heroD.parts.head.rotation.set(-.3, t > T.coin ? 0 : -.5, 0);
      const pop = t < T.boost ? ease.elastic(inv(T.coin - .05, T.coin + .7, t)) : 1; let bst = 0; for (let i = 0; i < 5; i++) bst += ease.back(inv(T.boost + .1 + i * .36, T.boost + .32 + i * .36, t)) * .09;
      bigCoin.position.set(COIN[0], COIN[1] + Math.sin(t * 2.6) * .15, COIN[2]); bigCoin.scale.setScalar(Math.max(.001, pop * (1 + bst))); bigCoin.rotation.y = (t - T.coin) * 3.2;
      coinGlow.position.set(COIN[0], COIN[1], COIN[2] - .6); coinGlow.scale.setScalar((8 + Math.sin(t * 5) * 1) * (1 + bst)); coinGlow.material.opacity = .75 * inv(T.coin - .05, T.coin + .2, t);
      const lt = t - T.coin; for (let i = 0; i < NC; i++) { const a = hash(i * 1.7) * 6.283, v = 3 + hash(i * 3.3) * 5.5, vy = 7 + hash(i * 5.1) * 8, d = lt - hash(i * 9.1) * .5;
        if (d <= 0 || lt < 0) _m.scale.setScalar(.0001); else { _m.scale.setScalar(1); _m.position.set(COIN[0] + Math.cos(a) * v * d * .8, Math.max(.1, COIN[1] + vy * d - 9 * d * d), COIN[2] + Math.sin(a) * v * d * .55 + 1); _m.rotation.set(d * (5 + hash(i) * 6), i, d * (3 + hash(i * 2) * 5)); }
        _m.updateMatrix(); coinInst.setMatrixAt(i, _m.matrix); } coinInst.instanceMatrix.needsUpdate = true;
      const k = inv(T.reb, T.end, t), e = prog(t, T.reb, T.reb + .8, ease.out); camLook(camera, [lerp(0, .6, e) + k * 1.2, lerp(11, 5.2, e), lerp(26, 22.5, e) - k * 1.2], [-.4, lerp(8, 5.3, e), 0], 44);
    }
  } else {                                                          // ---------- écran final : le globe et les jeux en orbite
    showOnly(GROUPS, G_globe); bg([[0, '#050b24'], [.5, '#0e2f6e'], [1, '#1466b8']]); stars(t); rays(t, { cy: 1250, color: 'rgba(130,200,255,.07)', speed: .15 });
    setLight('#fff4de', 2.6, '#bfe0ff', '#27407a', 1.25);
    const lt = t - T.end; globeFrame(t, lt * .22 - .5, .5); halo.material.opacity = .55;
    orbiters.forEach((o, i) => { o.visible = true; const a = lt * .7 + i * Math.PI / 2, q = ease.back(inv(.3 + i * .15, .8 + i * .15, lt)); o.position.set(Math.cos(a) * 8.6, Math.sin(a * 1 + i) * .5 + Math.sin(a) * 1.5, Math.sin(a) * 8.6); o.rotation.y = t * 1.5; o.scale.setScalar(Math.max(.001, q * .95)); });
    camLook(camera, [0, 3.5, 30 - ease.out(inv(0, 1.5, lt)) * 3], [0, 9.2, 0], 42);
  }
  draw3D(scene, camera, { dx: sx, dy: sy });

  // ================================================================= 2D par-dessus
  if (t < T.fr) {
    vignette(.45, '2,6,26');
    caption(t, .12, T.fr - .25, 'ET SI TES JEUX\nFORMAIENT UN MONDE ?', { font: 'Bungee', size: 92, y: 1330, anim: 'slam', color: '#ffffff', stroke: '#06143a', strokeW: 18, grad: ['#ffffff', '#ffe27a'], lineH: 1.12 });
    const z = inv(T.fr - .8, T.fr, t); if (z > 0) speedLines(t, { alpha: z * .7, cy: H * .44, color: 'rgba(200,235,255,.6)' });
  } else if (t < T.paris) {
    vignette(.25, '6,40,80');
    if (t < T.frB) pill('CARTE DE FRANCE', SAFE.cx, 290, { font: 'Bungee', size: 46, bg: '#10214a', color: '#ffffff', border: C.gold, alpha: inv(T.fr + .2, T.fr + .5, t) });
    caption(t, T.fr + .25, T.frB - .12, 'EXPLORE LA CARTE', { font: 'Bungee', size: 92, y: 1360, anim: 'pop', bg: '#ff7a2f', color: '#ffffff' });
    caption(t, T.frB + .15, T.paris - .2, 'CAP SUR PARIS !', { font: 'Bungee', size: 96, y: 1360, anim: 'slide', bg: '#10214a', color: C.gold });
    const z = inv(T.paris - .5, T.paris, t); if (z > 0) speedLines(t, { alpha: z * .6, cy: H * .42 });
  } else if (t < T.doors) {
    vignette(.3, '60,20,10');
    pill('PARIS', SAFE.cx, 290, { font: 'Bungee', size: 50, bg: '#10214a', color: C.gold, border: '#ffffff', scale: ease.back(inv(T.paris + .15, T.paris + .5, t)) });
    caption(t, T.paris + .3, T.doors - .3, 'DÉCOUVRE LA VILLE', { font: 'Bungee', size: 90, y: 1380, anim: 'rise', color: '#ffffff', stroke: '#3a1d10', strokeW: 16 });
  } else if (t < T.reb) {
    vignette(.4, '8,6,40'); sparkles(t, { n: 18, y: 300, h: 800, color: '#ffe9a0', size: 12, seed: 3 });
    caption(t, T.doors + .3, T.doorsB - .12, 'DES PORTES\nVERS TES JEUX', { font: 'Bungee', size: 88, y: 1370, anim: 'pop', color: '#ffffff', stroke: '#150c40', strokeW: 16, grad: ['#ffffff', '#c9b6ff'] });
    caption(t, T.doorsB + .15, T.reb - .2, 'UN MONDE,\nPLUSIEURS JEUX', { font: 'Bungee', size: 88, y: 1370, anim: 'slam', color: '#ffffff', stroke: '#150c40', strokeW: 16, grad: ['#fff27a', '#ff9d2e'] });
  } else if (t < T.end) {
    vignette(.4, '8,6,40');
    let n = 0; for (let i = 0; i < 5; i++) if (t >= ORB_T(i)) n++;
    // affichage type jeu : compteur de rebirths
    const ha = inv(T.reb + .15, T.reb + .45, t) * (1 - inv(T.boost - .25, T.boost, t));
    if (ha > 0) { ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.roundRect(140, 238, 800, 150, 40); ctx.fill(); ctx.fillStyle = '#10163a'; ctx.beginPath(); ctx.roundRect(140, 230, 800, 150, 40); ctx.fill(); ctx.strokeStyle = C.chess; ctx.lineWidth = 7; ctx.stroke();
      text('REBIRTHS', 330, 306, { font: 'Bungee', size: 52, color: '#ffffff', maxW: 330 });
      for (let i = 0; i < 5; i++) { const on = i < n, pp = on ? 1 + (1 - inv(ORB_T(i), ORB_T(i) + .25, t)) * .5 : 1; ctx.beginPath(); ctx.arc(560 + i * 76, 305, 27 * pp, 0, 7); ctx.fillStyle = on ? '#b794ff' : '#2a3168'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke(); }
      ctx.restore(); }
    if (t >= T.boost - .1) pill('BOOSTS DE PIÈCES', SAFE.cx, 300, { font: 'Bungee', size: 52, bg: '#10163a', color: C.gold, border: C.gold, scale: ease.back(inv(T.boost - .1, T.boost + .25, t)) });
    caption(t, T.reb + .25, T.coin - .08, '5 REBIRTHS\nDANS UN JEU…', { font: 'Bungee', size: 88, y: 1370, anim: 'pop', color: '#ffffff', stroke: '#150c40', strokeW: 16 });
    if (t >= T.coin) { confetti(t, T.coin, { cy: 700, colors: ['#ffc93c', '#fff27a', '#ff9d2e', '#ffffff', '#b794ff'], n: 90 }); if (t < T.boost) speedLines(t, { alpha: .35 * (1 - inv(T.coin, T.coin + 1.2, t)), cy: 760, color: 'rgba(255,230,140,.7)' }); }
    caption(t, T.coin + .02, T.boost - .12, '= 1 PIÈCE\nSUR LA CARTE !', { font: 'Bungee', size: 100, y: 1370, anim: 'slam', grad: ['#fff27a', '#ff9d2e'], stroke: '#3a1a00', strokeW: 18 });
    if (t >= T.boost) { let k = 0; for (let i = 0; i < 5; i++) if (t >= T.boost + .1 + i * .36) k = i + 1; if (k) { const a = T.boost + .1 + (k - 1) * .36;
      text('×' + [2, 4, 8, 16, 32][k - 1], SAFE.cx, 1345, { font: 'Bungee', size: 150 + k * 14, grad: ['#fff27a', '#ff9d2e'], stroke: '#3a1a00', strokeW: 22, shadow: 'rgba(0,0,0,.45)', scale: lerp(1.5, 1, ease.out(inv(a, a + .2, t))), alpha: 1 - inv(T.end - .15, T.end, t) }); } }
  } else {
    fade(.25 * inv(T.end, T.end + .5, t), '#050b24'); sparkles(t, { n: 22, y: 240, h: 700, color: '#ffe9a0', size: 12 });
    endCard(t, T.end + .15, { title: 'SIMULATOR\nDE SIMULATOR', tagline: 'Un seul monde pour relier tes jeux', status: 'bientot', font: 'Bungee', titleSize: 118, titleGrad: ['#ffffff', '#ffd34d'], titleStroke: '#06143a', accent: '#ff7a2f', y: 640 });
  }
  flash(t, T.fr, .35); flash(t, T.paris, .4, '255,240,210'); wipe(t, T.doors, { color: C.gold, color2: '#ff7a2f', dur: .5 }); wipe(t, T.reb, { color: C.chess, color2: '#10163a', dur: .4, dir: 'up' });
  flash(t, T.coin, .45, '255,225,120', .85); flash(t, T.end, .4);
}

registerAd({ duration: DURATION, thumbTime: T.coin + .7, render,
  music: { style: 'adventure', bpm: 112, sections: [[0, 'intro'], [T.fr, 'build'], [T.paris, 'drop'], [T.reb, 'break'], [T.coin, 'drop2'], [T.end + BAR, 'outro']], end: T.end + BAR } });
