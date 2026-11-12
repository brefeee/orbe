// Publicité « Who Ate the Cake? » : mystère, humour, déduction. Statut : bientôt.
// Tout est créé par le code (formes 3D du moteur, textures dessinées, musique synthétisée).
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseJump, poseHold, canvasTex, sign, glow, showOnly, ctx, bg, rays, vignette, flash, wipe, fade, confetti, sparkles,
  text, caption, pill, bar, roundRect, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Chewy', 'Inter']);
const B = 240 / 108;                                   // une mesure (108 bpm)
const T = { hook: 0, roles: 2 * B, eat: 4 * B, task: 6 * B, hall: 8 * B, vote: 10 * B, rev: 11.5 * B, end: 13.5 * B }, DURATION = 16 * B;   // 35,6 s
const P = { plum: '#3a1d5c', violet: '#8e44d6', pink: '#ff5fa2', yellow: '#ffd23f', teal: '#2ec4b6', cream: '#fff3e0', choco: '#6b3e26', orange: '#ff7a3c', red: '#e8434f', night: '#170b2e' };

// ====================================================================== outils 3D
gl3D({ exposure: 1.05 });
const scene = new THREE.Scene(), camera = makeCamera(42);
const L = addLights(scene, { sun: '#fff0d8', sunI: 2.4, sky: '#fff0f6', ground: '#6a4a7a', ambI: 1.2, dir: [5, 13, 9], shadowArea: 20 });
const _v = new THREE.Vector3();
function cam(pos, look, fov = 42) { camLook(camera, pos, look, fov); camera.updateMatrixWorld(true); }
/** Position écran d'un point 3D (après cam()). */
function scr(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x * .5 + .5) * W, (-_v.y * .5 + .5) * H]; }
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function texMat(size, fn, rx, ry, rough = .95) { const t = canvasTex(size, fn, { repeat: 1 }); t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: rough }); }
const stripes = (a, b) => (c, n) => { c.fillStyle = a; c.fillRect(0, 0, n, n); c.fillStyle = b; c.fillRect(0, 0, n / 2, n); };
const dots = (a, b) => (c, n) => { c.fillStyle = a; c.fillRect(0, 0, n, n); c.fillStyle = b; for (const [x, y] of [[.25, .25], [.75, .75]]) { c.beginPath(); c.arc(x * n, y * n, n * .09, 0, 7); c.fill(); } };
const checker = (a, b) => (c, n) => { c.fillStyle = a; c.fillRect(0, 0, n, n); c.fillStyle = b; c.fillRect(0, 0, n / 2, n / 2); c.fillRect(n / 2, n / 2, n / 2, n / 2); };
const planks = (a, b) => (c, n) => { c.fillStyle = a; c.fillRect(0, 0, n, n); c.strokeStyle = b; c.lineWidth = n * .02; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, i * n / 4); c.lineTo(n, i * n / 4); c.stroke(); const x = ((i * .37) % 1) * n; c.beginPath(); c.moveTo(x, i * n / 4); c.lineTo(x, (i + 1) * n / 4); c.stroke(); } };
const tiles = (a, b) => (c, n) => { c.fillStyle = a; c.fillRect(0, 0, n, n); c.strokeStyle = b; c.lineWidth = n * .05; c.strokeRect(0, 0, n, n); };

/** Pièce : sol + mur du fond + plinthe + murs de côté. */
function shell(g, wallMat, floorMat, { w = 48, h = 24, zb = -9, side = '#4a2a6a', base = P.cream } = {}) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 44), floorMat); f.rotation.x = -Math.PI / 2; f.position.z = zb + 22; f.receiveShadow = true; g.add(f);
  g.add(box(w, h, .6, wallMat, { pos: [0, h / 2, zb - .3], cast: false }));
  g.add(box(w, .7, .3, base, { pos: [0, .35, zb + .15], cast: false }));
  for (const s of [-1, 1]) g.add(box(.6, h, 44, side, { pos: [s * w / 2, h / 2, zb + 22], cast: false }));
}
function crumbPile(n, spread, seed) {
  const g = new THREE.Group(), cols = ['#e8b877', '#c98a4b', '#f6dcae', '#ff9ec4'];
  for (let i = 0; i < n; i++) { const s = .1 + hash(seed + i * 3.1) * .17, a = hash(seed + i * 7.7) * 6.283, r = Math.sqrt(hash(seed + i * 1.3)) * spread; const b = box(s, s * .7, s, cols[i % 4], { pos: [Math.cos(a) * r, s * .35, Math.sin(a) * r], rot: [0, a, 0] }); g.add(b); }
  return g;
}
/** Gâteau à deux étages : .body (ce qui se mange) et .crumbs (ce qui reste). */
function makeCake(sponge, frost, top, seed = 0) {
  const g = new THREE.Group();
  g.add(cyl(1.3, 1.05, .14, '#ffffff', { rough: .3, pos: [0, .07, 0] }));
  const body = new THREE.Group(); body.position.y = .14; g.add(body);
  body.add(cyl(1, 1, .85, sponge, { pos: [0, .425, 0] }));
  body.add(cyl(1.06, 1.06, .2, frost, { rough: .45, pos: [0, .92, 0] }));
  for (let i = 0; i < 10; i++) { const a = i * .6283 + seed, d = ball(.17, frost, { rough: .45, seg: 10, seg2: 8, pos: [Math.cos(a) * 1.01, .78 - hash(seed + i) * .2, Math.sin(a) * 1.01] }); d.scale.y = 1.3 + hash(seed + i * 2) * .9; body.add(d); }
  body.add(cyl(.62, .62, .6, sponge, { pos: [0, 1.3, 0] }));
  body.add(cyl(.68, .68, .16, frost, { rough: .45, pos: [0, 1.66, 0] }));
  for (let i = 0; i < 7; i++) { const a = i * .8976 + seed, d = ball(.13, frost, { rough: .45, seg: 10, seg2: 8, pos: [Math.cos(a) * .64, 1.56 - hash(seed + i * 5) * .12, Math.sin(a) * .64] }); d.scale.y = 1.4; body.add(d); }
  const sc = ['#ff5fa2', '#ffd23f', '#2ec4b6', '#ffffff', '#8e44d6'];
  for (let i = 0; i < 9; i++) { const a = i * .698 + seed * 2; body.add(box(.16, .06, .06, sc[(i + (seed | 0)) % 5], { pos: [Math.cos(a) * .86, 1.04, Math.sin(a) * .86], rot: [0, a * 3, 0] })); }
  if (top === 'cherry') { body.add(ball(.22, '#e8232f', { rough: .25, pos: [0, 1.93, 0] })); body.add(cyl(.02, .02, .3, '#3c7a2a', { seg: 5, pos: [.05, 2.2, 0], rot: [0, 0, -.3] })); }
  else if (top === 'candles') { for (let i = 0; i < 3; i++) { const a = i * 2.094; body.add(cyl(.06, .06, .5, sc[i], { seg: 8, pos: [Math.cos(a) * .3, 1.99, Math.sin(a) * .3] })); const f = glow('#ffb347', .55, .95); f.position.set(Math.cos(a) * .3, 2.36, Math.sin(a) * .3); body.add(f); } }
  else { for (let i = 0; i < 5; i++) { const a = i * 1.2566; body.add(ball(.15, top === 'berries' ? '#e8232f' : '#5b3ea8', { rough: .3, seg: 10, seg2: 8, pos: [Math.cos(a) * .38, 1.86, Math.sin(a) * .38] })); } }
  const cr = crumbPile(13, 1.0, seed * 9 + 2); cr.position.y = .14; cr.visible = false; g.add(cr);
  g.body = body; g.crumbs = cr; return g;
}
const eat = (cake, k) => { cake.body.visible = k < 1; cake.body.scale.setScalar(Math.max(.001, 1 - k)); cake.crumbs.visible = k >= 1; };   // k : 0 entier → 1 mangé
function balloon(color, len = 3) {
  const g = new THREE.Group(), b = ball(.8, color, { rough: .3, seg: 18, seg2: 14 }); b.scale.set(1, 1.2, 1); g.add(b);
  g.add(cone(.14, .22, color, { seg: 8, pos: [0, -1.02, 0] })); g.add(cyl(.025, .025, len, '#ffffff', { seg: 5, cast: false, pos: [0, -1.1 - len / 2, 0] })); return g;
}
function gift(w, h, d, c, r) {
  const g = new THREE.Group(); g.add(rbox(w, h, d, .08, c, { pos: [0, h / 2, 0] })); g.add(box(w + .04, h + .02, d * .18, r, { pos: [0, h / 2, 0] })); g.add(box(w * .18, h + .02, d + .04, r, { pos: [0, h / 2, 0] }));
  for (const s of [-1, 1]) { const b = ball(.22, r, { seg: 10, seg2: 8, pos: [s * .2, h + .12, 0] }); b.scale.set(1.2, .7, .7); g.add(b); } return g;
}
function bunting(g, x0, x1, y, z, n = 11) {
  const cols = [P.pink, P.yellow, P.teal, P.orange, '#ffffff', P.violet];
  for (let i = 0; i < n; i++) { const k = i / (n - 1), x = lerp(x0, x1, k), yy = y - Math.sin(k * Math.PI) * 1.6; const f = cone(.62, 1.1, cols[i % 6], { seg: 3, cast: false, pos: [x, yy - .55, z], rot: [Math.PI, 0, 0] }); f.scale.z = .12; g.add(f); }
  for (let i = 0; i < n - 1; i++) { const k0 = i / (n - 1), k1 = (i + 1) / (n - 1), xa = lerp(x0, x1, k0), xb = lerp(x0, x1, k1), ya = y - Math.sin(k0 * Math.PI) * 1.6, yb = y - Math.sin(k1 * Math.PI) * 1.6; const s = box(Math.hypot(xb - xa, yb - ya), .06, .06, '#ffffff', { cast: false, pos: [(xa + xb) / 2, (ya + yb) / 2, z], rot: [0, 0, Math.atan2(yb - ya, xb - xa)] }); g.add(s); }
}
function frame(g, x, y, z, w, h, c, inner) { g.add(box(w, h, .2, c, { pos: [x, y, z], cast: false })); g.add(box(w - .5, h - .5, .22, inner, { pos: [x, y, z + .02], cast: false })); }
function makeBell() {
  const g = new THREE.Group(), o = { rough: .25, emissive: '#7a5200', emissiveI: .55 };
  g.add(cyl(.1, .1, .3, '#8a6a2a', { seg: 8, pos: [0, -.15, 0] })); g.add(ball(.32, '#ffc93c', { ...o, pos: [0, -.42, 0] })); g.add(cyl(.3, .86, 1.0, '#ffc93c', { ...o, pos: [0, -.9, 0] }));
  g.add(torus(.86, .09, '#ffb000', { ...o, pos: [0, -1.4, 0], rot: [Math.PI / 2, 0, 0] })); g.add(ball(.2, '#a8760b', { pos: [0, -1.55, 0] })); return g;
}

// ====================================================================== personnages (un seul jeu d'acteurs, replacés à chaque plan)
const GS = [
  { shirt: '#8e44d6', pants: '#2b2440', hatColor: '#ffd23f', hair: '#2a1c14', face: 'smile' },                       // 0 : le gourmand
  { shirt: '#ff7a3c', pants: '#27324f', hatColor: '#2ec4b6', hair: '#5a3a22', face: 'happy' },                       // 1 : le héros
  { shirt: '#3aa0ff', pants: '#22304f', hatColor: '#ff5fa2', hair: '#15131a', face: 'smile', skin: '#c98d62' },      // 2
  { shirt: '#45c96b', pants: '#3b2f2f', hatColor: '#ff5a3c', hair: '#d9a441', face: 'happy' },                       // 3
  { shirt: '#ff5fa2', pants: '#3a2a55', hatColor: '#6c5ce7', hair: '#7a3b1e', face: 'wow', skin: '#8d5a3c' },        // 4
  { shirt: '#ffd23f', pants: '#284b63', hatColor: '#3aa0ff', hair: '#b5532a', face: 'smile' },                       // 5
  { shirt: '#e8434f', pants: '#23232e', hatColor: '#45c96b', hair: '#333340', face: 'wow', skin: '#e0ac80' },        // 6
];
const G = GS.map(s => makeCharacter({ ...s, hat: 'cone' }));
const chef = makeCharacter({ shirt: '#ffffff', pants: '#3a3350', hat: 'chef', hair: '#7a3b1e', face: 'happy' });
const gRev = makeCharacter({ ...GS[0], hat: 'cone', face: 'wow' });                                                  // le gourmand démasqué (crème sur la bouche)
for (const [x, y] of [[-.22, .3], [.02, .24], [.25, .31], [.36, .5], [-.36, .46]]) gRev.parts.head.add(ball(.12, '#fffdf5', { seg: 10, seg2: 8, pos: [x, y, .66] }));
for (let i = 0; i < 7; i++) gRev.parts.torso.add(box(.13, .13, .06, i % 2 ? '#e8b877' : '#ff9ec4', { pos: [(hash(i * 3) - .5) * 1.4, .7 - hash(i * 5) * .9, .52] }));
const ALL = [...G, chef, gRev]; for (const c of ALL) scene.add(c);
// accessoires de rôle (illustration) : loupe du détective, petit gâteau du pâtissier
const loupe = new THREE.Group(); loupe.add(cyl(.09, .09, .9, '#5a3a22', { seg: 8, pos: [0, -1.95, .55], rot: [Math.PI / 2, 0, 0] })); loupe.add(torus(.5, .09, '#ffc93c', { rough: .3, emissive: '#7a5200', emissiveI: .5, pos: [0, -1.95, 1.45], rot: [Math.PI / 2, 0, 0] }));
loupe.add(cyl(.46, .46, .04, '#bfe9ff', { opacity: .45, pos: [0, -1.95, 1.45] })); G[2].parts.armR.add(loupe);
const chefCake = makeCake('#f6dcae', P.pink, 'cherry', 4); chefCake.scale.setScalar(.62); chefCake.position.set(0, 2.25, 1.75); chef.add(chefCake);
const revCake = makeCake('#8a5a3c', '#fffdf5', 'cherry', 2); revCake.scale.setScalar(.6); revCake.position.set(0, 2.25, 1.75); gRev.add(revCake); revCake.body.children[0].scale.set(1, 1, 1);
function put(c, x, y, z, ry = 0) { c.visible = true; c.position.set(x, y, z); c.rotation.set(0, ry, 0); const p = c.parts; for (const k in p) p[k].rotation.set(0, 0, 0); }

// ====================================================================== décors (un groupe par lieu)
const gParty = new THREE.Group(), gStage = new THREE.Group(), gKitchen = new THREE.Group(), gSalon = new THREE.Group(), gHall = new THREE.Group(), gMeet = new THREE.Group();
const GROUPS = [gParty, gStage, gKitchen, gSalon, gHall, gMeet]; for (const g of GROUPS) scene.add(g);

// ---- salle de fête : table et 6 gâteaux
shell(gParty, texMat(64, stripes('#5b2a86', '#6c38a0'), 14, 1), texMat(128, planks('#c98a55', '#a56c3c'), 8, 8, .8));
gParty.add(rbox(8.2, .3, 4.8, .12, P.cream, { pos: [0, 2.3, 0], rot: [0, 0, 0] })); gParty.children.at(-1).rotation.x = 0;
{ const top = gParty.children.at(-1); top.geometry.rotateX(Math.PI / 2); }
gParty.add(box(8.0, 1.2, 4.6, P.pink, { pos: [0, 1.6, 0] }));
for (let i = 0; i < 12; i++) gParty.add(ball(.36, '#ff8fbd', { seg: 10, seg2: 8, pos: [-3.7 + i * .673, 1.0, 2.3], cast: false }));
for (const [x, z] of [[-3.6, -1.9], [3.6, -1.9], [-3.6, 1.9], [3.6, 1.9]]) gParty.add(cyl(.18, .18, 1.2, '#8a5a3c', { seg: 8, pos: [x, .6, z] }));
const CAKES = [['#f6dcae', P.pink, 'cherry'], ['#8a5a3c', '#fffdf5', 'candles'], ['#ffe9a8', P.teal, 'berries'], ['#f7b6d0', '#fffdf5', 'berries'], ['#f6dcae', P.yellow, 'cherry'], ['#8a5a3c', P.pink, 'blue']];
const cakes = CAKES.map((c, i) => { const k = makeCake(c[0], c[1], c[2], i + 1); k.position.set((i % 3 - 1) * 2.6, 2.45, i < 3 ? -1.15 : 1.1); gParty.add(k); return k; });
const MISSING = 4;                                                                         // le gâteau du milieu, devant
bunting(gParty, -11, 11, 15.5, -8.6, 13); bunting(gParty, -9, 9, 12.4, -8.5, 11);
gParty.add(sign(9, 2.1, (c, w, h) => { c.fillStyle = P.cream; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 26); c.fill(); c.strokeStyle = P.pink; c.lineWidth = 8; c.stroke(); c.fillStyle = P.plum; c.font = `400 ${h * .62}px "Chewy"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BONNE FÊTE !', w / 2, h * .54); }, { res: 768, pos: [0, 9.3, -8.55] }));
const partyBalloons = []; [[-6.4, 9.5, -6, P.pink], [-5.2, 11.2, -7, P.yellow], [-7.4, 11.6, -6.5, P.teal], [6.3, 9.8, -6, P.orange], [5.3, 11.6, -7, P.violet], [7.5, 11.3, -6.5, P.pink], [-9.5, 8.5, -4, P.yellow], [9.5, 8.7, -4, P.teal]].forEach(([x, y, z, c], i) => { const b = balloon(c, y - 1.2); b.position.set(x, y, z); b.userData = { x, y, i }; gParty.add(b); partyBalloons.push(b); });
[[-8.2, -6.6, 1.6, 1.3, P.teal, P.yellow], [-6.6, -7.2, 1.2, 1.0, P.orange, '#ffffff'], [8.0, -6.8, 1.5, 1.6, P.yellow, P.red], [6.6, -7.3, 1.1, .9, P.violet, P.yellow]].forEach(([x, z, w, h, c, r]) => { const p = gift(w, h, w, c, r); p.position.set(x, 0, z); gParty.add(p); });
gParty.add(cyl(5.4, 5.4, .06, '#7b3fb0', { seg: 40, pos: [0, .03, 0], cast: false }));

// ---- scène des rôles : 4 socles
shell(gStage, texMat(64, stripes('#12807a', '#16968f'), 16, 1), texMat(64, checker('#fff3e0', '#ffc2d9'), 12, 11, .7), { side: '#0e5f5b' });
const RX = [-9, -3, 3, 9], RCOL = ['#45c96b', '#3aa0ff', P.orange, P.violet];
RX.forEach((x, i) => { gStage.add(cyl(2.3, 2.5, .5, RCOL[i], { pos: [x, .25, 0], seg: 32 })); gStage.add(cyl(2.0, 2.0, .08, '#ffffff', { pos: [x, .52, 0], seg: 32 })); for (let k = 0; k < 2; k++) { const s = sign(1.8, 1.8, (c, w) => { c.fillStyle = k ? P.yellow : '#ffffff'; c.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? w * .2 : w * .46, a = j * .6283 - 1.5708; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } c.fill(); }, { res: 96, pos: [x + (k ? 2.1 : -2.2), k ? 10.5 : 8.4, -8.5] }); gStage.add(s); } });
bunting(gStage, -14, 14, 14.5, -8.6, 17);

// ---- cuisine : le coin du gourmand
shell(gKitchen, texMat(64, tiles('#bfe9df', '#ffffff'), 24, 12, .5), texMat(64, checker('#f4efe6', '#4a3f6b'), 12, 11, .6), { side: '#7fbfb3' });
gKitchen.add(box(30, 2.6, 2.6, P.cream, { pos: [0, 1.3, -7.6] })); gKitchen.add(box(30, .26, 2.9, '#8b5a3c', { pos: [0, 2.73, -7.55] }));
for (let i = 0; i < 9; i++) { gKitchen.add(box(2.6, 1.9, .1, '#ffe1b8', { pos: [-12 + i * 3, 1.3, -6.26], cast: false })); gKitchen.add(ball(.13, '#8b5a3c', { seg: 8, seg2: 6, pos: [-11 + i * 3, 1.6, -6.18], cast: false })); }
gKitchen.add(rbox(3.6, 8, 3, .3, '#eef4f8', { pos: [7.2, 4, -7.2], rough: .35 })); gKitchen.add(box(.14, 2.2, .14, '#9aa7b3', { pos: [5.9, 5.2, -5.62] })); gKitchen.add(box(3.4, .06, .06, '#b8c4cf', { pos: [7.2, 3.1, -5.66] }));
gKitchen.add(box(3, .9, .2, '#2b2b3a', { pos: [-6, 1.5, -6.2], cast: false })); gKitchen.add(box(2.4, .5, .22, '#ff9a3c', { pos: [-6, 1.5, -6.19], emissive: '#ff7a1a', emissiveI: .8, cast: false }));
frame(gKitchen, -2.2, 9.2, -8.5, 5, 5, '#ffffff', '#1b1446'); gKitchen.add(box(.16, 4.6, .24, '#ffffff', { pos: [-2.2, 9.2, -8.4], cast: false })); gKitchen.add(box(4.6, .16, .24, '#ffffff', { pos: [-2.2, 9.2, -8.4], cast: false }));
gKitchen.add(ball(.7, '#fff6c9', { emissive: '#fff0a0', emissiveI: .9, pos: [-1.1, 10.3, -8.6], cast: false }));
gKitchen.add(box(7, .22, 1.1, '#8b5a3c', { pos: [4.5, 9.6, -8.3] })); [[2.2, P.pink], [3.4, P.yellow], [4.6, P.teal], [5.8, P.orange], [6.9, P.violet]].forEach(([x, c]) => { gKitchen.add(cyl(.38, .38, .9, c, { pos: [x, 10.16, -8.3], rough: .4 })); gKitchen.add(cyl(.42, .42, .16, '#ffffff', { pos: [x, 10.68, -8.3] })); });
gKitchen.add(cyl(.5, .4, .9, '#d8dde3', { pos: [-10, 3.3, -7.4], rough: .3 })); gKitchen.add(cyl(.7, .7, .1, '#ffffff', { pos: [1.5, 2.9, -7.5] })); gKitchen.add(cyl(.72, .72, .1, '#ffffff', { pos: [1.5, 3.0, -7.5] }));
gKitchen.add(cyl(1.9, 1.9, .26, P.cream, { pos: [2.9, 2.3, 0], seg: 32 })); gKitchen.add(cyl(1.95, 1.95, .12, P.pink, { pos: [2.9, 2.12, 0], seg: 32 })); gKitchen.add(cyl(.26, .4, 2.1, '#8b5a3c', { pos: [2.9, 1.05, 0], seg: 10 })); gKitchen.add(cyl(1.1, 1.2, .16, '#8b5a3c', { pos: [2.9, .08, 0] }));
const kCake = makeCake('#f6dcae', P.yellow, 'cherry', 5); kCake.position.set(2.9, 2.43, 0); kCake.scale.setScalar(1.12); gKitchen.add(kCake);

// ---- salon : mini-jeu des ballons
shell(gSalon, texMat(64, dots('#ffc94d', '#ffe08a'), 20, 10), texMat(128, planks('#b97b4a', '#96602f'), 8, 8, .8), { side: '#e0a02e' });
gSalon.add(rbox(2.2, .5, 1.6, .12, P.red, { pos: [2.0, .25, 0] })); gSalon.add(cyl(.34, .34, 1.7, '#d8dde3', { rough: .3, pos: [2.0, 1.35, 0] })); gSalon.add(cyl(.12, .12, .5, '#8a8f99', { pos: [2.0, 2.4, 0], seg: 8 }));
const pumpH = new THREE.Group(); pumpH.add(cyl(.07, .07, 1.0, '#8a8f99', { seg: 8, pos: [-.9, .5, 0] })); pumpH.add(box(1.3, .18, .3, '#2b2b3a', { pos: [-.9, 1.05, 0] })); pumpH.position.set(2.0, 1.2, 0); gSalon.add(pumpH); gSalon.add(cyl(.2, .2, 1.2, '#b8c0c8', { pos: [1.1, .9, 0], seg: 10 }));
const tBalloon = new THREE.Group(); { const b = ball(.8, P.pink, { rough: .3, seg: 20, seg2: 16 }); b.scale.set(1, 1.2, 1); tBalloon.add(b); tBalloon.add(cone(.14, .22, P.pink, { seg: 8, pos: [0, -1.02, 0] })); } gSalon.add(tBalloon);
const salonBalloons = []; [[-4.6, 13.6, -4, P.teal], [-2.4, 14.3, -5, P.yellow], [4.6, 14.1, -4.5, P.violet], [5.8, 13.2, -3, P.orange], [-6.2, 12.8, -2, P.red]].forEach(([x, y, z, c], i) => { const b = balloon(c, 2.2); b.position.set(x, y, z); b.userData = { x, y, i }; gSalon.add(b); salonBalloons.push(b); });
gSalon.add(rbox(5.4, 1.5, 2.4, .3, '#7b3fb0', { pos: [-5.2, .95, -6.6] })); gSalon.add(rbox(5.4, 2.4, .8, .3, '#8e4fc6', { pos: [-5.2, 2.2, -7.6] })); for (const s of [-1, 1]) gSalon.add(rbox(.8, 2.0, 2.4, .3, '#8e4fc6', { pos: [-5.2 + s * 2.7, 1.3, -6.6] }));
[[4.2, -6.4, 1.8, 1.5, P.teal, P.yellow], [6.2, -6.9, 1.4, 1.1, P.pink, '#ffffff'], [5.0, -5.0, 1.1, .8, P.orange, P.red]].forEach(([x, z, w, h, c, r]) => { const p = gift(w, h, w, c, r); p.position.set(x, 0, z); gSalon.add(p); }); { const p = gift(1.1, .9, 1.1, P.violet, P.yellow); p.position.set(4.3, 1.5, -6.4); gSalon.add(p); }
frame(gSalon, 0.5, 10, -8.5, 4.4, 3.4, '#ffffff', '#ff9ec4'); bunting(gSalon, -11, 11, 17.2, -8.6, 13);
gSalon.add(cyl(4.6, 4.6, .06, P.teal, { seg: 40, pos: [.4, .03, 0], cast: false })); gSalon.add(cyl(3.6, 3.6, .07, '#fff3e0', { seg: 40, pos: [.4, .035, 0], cast: false }));

// ---- couloir : piste de miettes et cloche
shell(gHall, texMat(64, stripes('#2f7d5b', '#389068'), 16, 1), texMat(128, planks('#8f5c38', '#6f4326'), 8, 8, .8), { side: '#235f45' });
gHall.add(box(40, .06, 4.6, '#c0392b', { pos: [0, .03, 0], cast: false })); for (const s of [-1, 1]) gHall.add(box(40, .07, .25, P.yellow, { pos: [0, .035, s * 1.9], cast: false }));
for (const x of [-9.5, .5, 12]) { gHall.add(box(3.6, 8.2, .3, '#fff3e0', { pos: [x, 4.1, -8.8], cast: false })); gHall.add(box(3.0, 7.6, .32, '#8b5a3c', { pos: [x, 3.9, -8.75], cast: false })); gHall.add(ball(.2, P.yellow, { pos: [x + 1.1, 3.8, -8.5], seg: 10, seg2: 8, cast: false })); }
frame(gHall, -4.6, 8.4, -8.5, 3, 3.8, P.yellow, '#ffd9e8'); frame(gHall, 5.6, 8.8, -8.5, 3.6, 2.8, P.yellow, '#bfe9ff'); gHall.add(ball(.7, P.pink, { pos: [-4.6, 8.3, -8.45], cast: false })); gHall.add(cone(1.1, 1.5, P.teal, { seg: 3, pos: [5.6, 8.5, -8.5], cast: false }));
const TRAIL = []; for (let i = 0; i < 9; i++) { const x = -6.6 + i * 1.2, z = Math.sin(i * 1.7) * .7 + .9; const p = crumbPile(7, .42, i * 13 + 5); p.position.set(x, .07, z); gHall.add(p); const gl = glow('#fff2b0', 1.7, .5); gl.position.set(x, .35, z); gHall.add(gl); TRAIL.push({ x, z, gl }); }
gHall.add(cyl(1.25, 1.25, .2, P.cream, { pos: [5.2, 2.2, -1.9], seg: 24 })); gHall.add(cyl(.2, .34, 2.1, '#8b5a3c', { pos: [5.2, 1.05, -1.9], seg: 10 })); gHall.add(cyl(1.0, .82, .14, '#ffffff', { rough: .3, pos: [5.2, 2.37, -1.9] })); { const p = crumbPile(14, .75, 77); p.position.set(5.2, 2.44, -1.9); gHall.add(p); }
gHall.add(cyl(1.0, 1.15, .3, '#6f4326', { pos: [7.4, .15, 0], seg: 20 })); gHall.add(cyl(.17, .2, 5.6, '#8b5a3c', { pos: [7.4, 3.0, 0], seg: 10 })); gHall.add(box(1.7, .22, .22, '#8b5a3c', { pos: [6.75, 5.7, 0] })); gHall.add(ball(.26, P.yellow, { pos: [7.4, 5.9, 0], seg: 10, seg2: 8 }));
const bell = makeBell(); bell.position.set(6.2, 5.6, 0); gHall.add(bell);
bunting(gHall, -14, 14, 15.5, -8.6, 17);

// ---- salle de réunion : tapis rond, preuve au milieu
shell(gMeet, texMat(64, dots('#1d1647', '#3a2f86'), 22, 11), texMat(64, checker('#3d2a6b', '#4a3580'), 12, 11, .7), { side: '#150f36' });
gMeet.add(cyl(8.6, 8.6, .06, P.yellow, { seg: 48, pos: [0, .03, -1], cast: false })); gMeet.add(cyl(6.8, 6.8, .07, P.orange, { seg: 48, pos: [0, .035, -1], cast: false })); gMeet.add(cyl(5.0, 5.0, .08, P.yellow, { seg: 48, pos: [0, .04, -1], cast: false })); gMeet.add(cyl(3.2, 3.2, .09, P.pink, { seg: 48, pos: [0, .045, -1], cast: false }));
gMeet.add(cyl(.9, .9, .2, P.cream, { pos: [0, 1.6, 1.2], seg: 20 })); gMeet.add(cyl(.16, .3, 1.5, '#8b5a3c', { pos: [0, .75, 1.2], seg: 10 })); gMeet.add(cyl(.8, .66, .12, '#ffffff', { rough: .3, pos: [0, 1.76, 1.2] })); { const p = crumbPile(12, .6, 31); p.position.set(0, 1.82, 1.2); gMeet.add(p); }
bunting(gMeet, -13, 13, 16.5, -8.6, 15);
const SLOT_A = [-75, -50, -25, 0, 25, 50, 75], SLOT_WHO = [6, 3, 1, 4, 0, 2, 5];           // qui se tient où (indice dans G)
const SLOT = SLOT_A.map(a => { const r = a * Math.PI / 180; return { x: 6.1 * Math.sin(r), z: -6.1 * Math.cos(r) + 2.2, ry: -r * .55 }; });
const GL = 4;                                                                             // emplacement du gourmand
const VOTES = [[2, GL, .45], [1, GL, .85], [0, 5, 1.25], [3, GL, 1.65], [6, -1, 2.05], [5, GL, 2.45]];   // [votant, cible (-1 = passe), instant]

// ====================================================================== bruitages
cue(.02, 'crowd', .6, 1); cue(.1, 'pop', .8); cue(.72, 'swish'); cue(.95, 'crunch', 1.1); cue(1.08, 'crunch', .9); cue(1.25, 'impact'); cue(2.5, 'pop', .7); cue(2.75, 'pop', .6); cue(3.0, 'pop', .6);
cue(T.roles - .22, 'whoosh'); for (let i = 0; i < 4; i++) { cue(T.roles + i * B / 2 + .04, i === 3 ? 'ghost' : 'ding', i === 3 ? .7 : .7, .8); if (i) cue(T.roles + i * B / 2 - .18, 'swish', .7); }
cue(T.eat - .05, 'sweepdown', .8); for (let i = 0; i < 6; i++) cue(T.eat + .25 + i * .27, 'tap', .55); cue(T.eat + 2.35, 'crunch'); cue(T.eat + 2.65, 'crunch'); cue(T.eat + 2.95, 'crunch', 1.1); cue(T.eat + 3.05, 'pop', .8); cue(T.eat + 3.5, 'whistle', .7);
cue(T.task - .22, 'whoosh'); cue(T.task + .35, 'riser', .5, 1.6); cue(T.task + 2.0, 'ding'); cue(T.task + 2.08, 'powerup', .7); cue(T.task + 2.5, 'boing', .7);
cue(T.hall - .05, 'swish'); for (let i = 0; i < 7; i++) cue(T.hall + .2 + i * .34, 'tap', .5); cue(T.hall + 2.95, 'bell', 1.2); cue(T.hall + 3.45, 'bell', .8); cue(T.hall + 3.95, 'bell', .6);
cue(T.vote - .2, 'whoosh'); cue(T.vote + .02, 'impact', .8); for (const v of VOTES) cue(T.vote + v[2] + .25, 'click', .9); for (let i = 0; i < 6; i++) cue(T.vote + .5 + i * .5, 'tick', .45);
cue(T.rev, 'roll', .9, 1.0); cue(T.rev, 'tick'); cue(T.rev + .33, 'tick'); cue(T.rev + .66, 'tick'); cue(T.rev + 1.0, 'boom'); cue(T.rev + 1.05, 'win'); cue(T.rev + 1.2, 'crowd', .8, 2); cue(T.rev + 2.85, 'chime'); cue(T.rev + 3.0, 'coin', .7); cue(T.rev + 3.2, 'coin', .7); cue(T.rev + 3.4, 'coin', .7);
cue(T.end - .15, 'whoosh'); cue(T.end + .02, 'impact'); cue(T.end + .85, 'pop'); cue(T.end + 1.3, 'chime');

// ====================================================================== dessins 2D
function cakeIcon(x, y, s, eaten, wob = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(wob);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 24, 34, 8, 0, 0, 7); ctx.fill();
  if (!eaten) { ctx.fillStyle = '#e8b877'; roundRect(-24, -6, 48, 30, 6); ctx.fill(); ctx.fillStyle = P.pink; roundRect(-27, -13, 54, 15, 7); ctx.fill(); for (const dx of [-16, 0, 16]) { ctx.beginPath(); ctx.arc(dx, 2, 6, 0, 7); ctx.fill(); } ctx.fillStyle = '#e8232f'; ctx.beginPath(); ctx.arc(0, -20, 8, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#e8b877'; for (const [dx, dy, r] of [[-14, 16, 4], [2, 18, 5], [14, 15, 3.5], [-4, 10, 3], [9, 9, 2.5]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, 7); ctx.fill(); } }
  ctx.restore();
}
/** Affichage « 6 gâteaux » : n mangés, tremble à `hit`. */
function hudCakes(t, eaten, hit, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; const k = hit != null ? 1 - inv(hit, hit + .5, t) : 0, y = 286;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(540 - 290, y - 52 + 8, 580, 104, 52); ctx.fill(); ctx.fillStyle = P.plum; roundRect(540 - 290, y - 52, 580, 104, 52); ctx.fill(); ctx.strokeStyle = P.yellow; ctx.lineWidth = 5; ctx.stroke();
  for (let i = 0; i < 6; i++) { const e = i === 4 && eaten; cakeIcon(540 - 225 + i * 90, y - 2, 1.05 * (e ? 1 + k * .5 : 1), e, e ? Math.sin(t * 40) * .25 * k : 0); }
  ctx.restore();
}
function burst(x, y, r, color, n = 12, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * .68 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
/** Bulle « CROC ! » à l'instant `at`. */
function croc(t, at, x, y, str = 'CROC !', rot = -.15) { const k = inv(at, at + .45, t); if (t < at || k >= 1) return; const s = ease.back(inv(0, .35, k)) * (1 - inv(.75, 1, k)); burst(x, y, 150 * s, '#ffffff', 11, rot); burst(x, y, 132 * s, P.yellow, 11, rot); text(str, x, y + 4, { font: 'Chewy', size: 74, color: P.red, stroke: '#ffffff', strokeW: 8, scale: s, rot, maxW: 300 }); }
function crumbsFly(t, at, x, y, n = 12) { const lt = t - at; if (lt < 0 || lt > .7) return; ctx.save(); ctx.globalAlpha = 1 - inv(.4, .7, lt); for (let i = 0; i < n; i++) { const a = -1.57 + (hash(i * 3.3 + at) - .5) * 3.4, v = 260 + hash(i * 1.9 + at) * 420; ctx.fillStyle = i % 3 ? '#e8b877' : '#ff9ec4'; const s = 9 + hash(i + at) * 12; ctx.fillRect(x + Math.cos(a) * v * lt - s / 2, y + Math.sin(a) * v * lt + 900 * lt * lt - s / 2, s, s); } ctx.restore(); }
function ring(x, y, r, p, color, wd = 22) { ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = wd + 10; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); if (p > 0.005) { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + p * 6.2832); ctx.stroke(); } ctx.restore(); }
function check(x, y, s, color = '#ffffff') { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-42, 2); ctx.lineTo(-12, 32); ctx.lineTo(44, -30); ctx.stroke(); ctx.restore(); }
function spot(x, y, r, a) { const g = ctx.createRadialGradient(x, y, r * .75, x, y, r * 1.5); g.addColorStop(0, 'rgba(12,4,34,0)'); g.addColorStop(1, `rgba(12,4,34,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function badge(x, y, str, color, s = 1, txt = '#ffffff') { if (s <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(0, 6, 46, 0, 7); ctx.fill(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 46, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.stroke(); ctx.restore(); text(str, x, y + 3 * s, { font: 'Chewy', size: 62 * s, color: txt, maxW: 80 * s }); }

// ====================================================================== les plans
const CAP = { font: 'Inter', size: 76 };
const sway = (list, t) => { for (const b of list) { const u = b.userData; b.position.x = u.x + Math.sin(t * 1.1 + u.i * 2.1) * .28; b.position.y = u.y + Math.sin(t * 1.6 + u.i) * .18; b.rotation.z = Math.sin(t * 1.1 + u.i * 2.1) * .08; } };
const PARTY_POS = [[4.4, -4.3, -.25], [0, -4.4, 0], [-4.4, -4.3, .25], [-2.2, -6.7, .1], [2.2, -6.7, -.1], [-6.4, -.6, 1.0], [6.4, -.6, -1.0]];   // [x, z, ry] pour G[0..6]

function partySetup(t, mode) {       // mode 0 : fête, 1 : soupçons, 2 : final
  showOnly(GROUPS, gParty); sway(partyBalloons, t);
  G.forEach((c, i) => { const p = PARTY_POS[i]; put(c, p[0], 0, p[1], p[2]);
    if (mode === 1) { poseIdle(c, t + i); c.parts.head.rotation.set(0, Math.sin(t * 3.2 + i * 1.9) * .75, 0); if (i % 3 === 0) { c.parts.armR.rotation.set(-2.2, 0, .5); } }
    else { poseCheer(c, t + i * .4); c.position.y = Math.abs(Math.sin(t * 6.5 + i * 1.3)) * (mode === 2 ? .7 : .5); } });
}
function sHook(t) {
  const gone = t >= .95; partySetup(t, gone ? 1 : 0); cakes.forEach((c, i) => eat(c, i === MISSING && gone ? 1 : 0));
  const k1 = prog(t, .95, 1.45), k2 = prog(t, 2.3, 3.1, ease.io), p = inv(0, T.roles, t);
  const A = [[lerp(-2.5, -1, inv(0, .95, t)), 9.5, 21], [0, 4.2, -1.2]], Bz = [[1.3, 6.4 - (t - 1) * .25, 9.6 - (t - 1) * .5], [.1, 2.9, .9]], C = [[lerp(-3, 3, p), 9.2, 23], [lerp(-1, 1, p), 4.6, -2.5]];
  cam(mix3(mix3(A[0], Bz[0], k1), C[0], k2), mix3(mix3(A[1], Bz[1], k1), C[1], k2));
  return () => {
    caption(t, .04, .9, 'UNE FÊTE.\n6 GÂTEAUX.', { font: 'Chewy', size: 132, y: 470, anim: 'pop', inDur: .18, color: P.yellow, lineH: 1.02 });
    wipe(t, .95, { dur: .46, color: P.pink, color2: P.yellow, dir: 'up' });
    if (t > 1.1) hudCakes(t, true, 1.15, inv(1.1, 1.3, t));
    caption(t, 1.2, T.roles - .25, 'QUI A MANGÉ\nLE GÂTEAU ?', { font: 'Chewy', size: 140, y: 520, anim: 'slam', grad: ['#fff6a8', P.yellow], lineH: 1.02 });
    if (t > 2.45) G.forEach((c, i) => { if (i > 4) return; const [x, y] = scr(c.position.x, 7.6, c.position.z), s = ease.back(inv(2.45 + i * .12, 2.75 + i * .12, t)); if (s > 0) text('?', x, y + Math.sin(t * 6 + i) * 8, { font: 'Chewy', size: 96, color: '#ffffff', stroke: P.plum, strokeW: 14, scale: s, rot: Math.sin(t * 4 + i) * .15 }); });
    caption(t, 2.6, T.roles - .25, 'Un gourmand se cache ici…', { ...CAP, bg: P.violet, anim: 'rise' });
  };
}
const ROLE = [['INVITÉ', '#2fa653'], ['DÉTECTIVE', '#2577d8'], ['PÂTISSIER', '#e8641f'], ['GOURMAND ?', P.violet]];
function sRoles(t) {
  showOnly(GROUPS, gStage); const lt = t - T.roles, seg = B / 2, u = lt / seg, i = Math.min(3, Math.floor(u)), f = u - i;
  const who = [G[3], G[2], chef, G[0]]; who.forEach((c, k) => put(c, RX[k], .52, 0, 0)); loupe.visible = true;
  poseIdle(who[0], t); who[0].parts.armR.rotation.set(0, 0, 2.6 + Math.sin(t * 11) * .35);
  poseIdle(who[1], t); who[1].parts.armR.rotation.set(-1.5 + Math.sin(t * 5) * .12, 0, 0); who[1].parts.head.rotation.set(.1, Math.sin(t * 5) * .25, 0);
  poseHold(chef, 1); chef.position.y = .52 + Math.abs(Math.sin(t * 7)) * .12;
  poseIdle(who[3], t); who[3].parts.head.rotation.set(0, Math.sin(t * 9) * .8, 0); who[3].parts.armL.rotation.set(.5, 0, .25); who[3].parts.armR.rotation.set(.5, 0, -.25); who[3].rotation.y = Math.sin(t * 9) * .12;
  const cx = i < 3 ? lerp(RX[i], RX[i + 1], ease.io(inv(.8, 1, f))) : RX[3], punch = 1 - prog(f, 0, .3);
  cam([cx + Math.sin(t * 1.3) * .3, 5.2, 16.2 + punch * 2.2 - (i === 3 ? f * 1.5 : 0)], [cx, 3.75, 0]);
  return () => {
    text('4 RÔLES', SAFE.cx, 330, { font: 'Chewy', size: 128, grad: ['#ffffff', P.yellow], stroke: P.plum, strokeW: 20, shadow: 'rgba(0,0,0,.4)', scale: ease.back(inv(.05, .4, lt)) });
    ROLE.forEach((r, k) => caption(t, T.roles + k * seg + .04, T.roles + (k + 1) * seg - .08, r[0], { font: 'Chewy', size: 124, y: 1330, bg: r[1], anim: 'pop', inDur: .2, tilt: k % 2 ? 2 : -2 }));
  };
}
function sEat(t) {
  showOnly(GROUPS, gKitchen); const lt = t - T.eat, g = G[0];
  const x = lerp(-8, .75, inv(0, 1.7, lt)); put(g, x, 0, 0, 1.25);
  if (lt < 1.7) { poseWalk(g, lt * 11.6, .42); g.position.y = Math.abs(Math.sin(lt * 11.6)) * .2; g.parts.torso.rotation.x = 0; g.parts.head.rotation.set(0, -.5, 0); }
  else if (lt < 2.3) { g.parts.head.rotation.set(0, Math.sin((lt - 1.7) * 10.5) * 1.0 - .3, 0); g.rotation.y = lerp(1.25, 1.5708, inv(1.7, 2.3, lt)); }
  else if (lt < 3.25) { g.rotation.y = 1.5708; poseHold(g, 1); const b = Math.sin((lt - 2.35) / .3 * 6.2832); g.parts.head.rotation.set(.25 + b * .2, 0, 0); g.parts.armL.rotation.x = g.parts.armR.rotation.x = -1.45 + b * .15; }
  else { const k = prog(lt, 3.25, 3.6); g.rotation.y = lerp(1.5708, .15, k); g.parts.armL.rotation.set(.5 * k, 0, .2); g.parts.armR.rotation.set(.5 * k, 0, -.2); g.parts.head.rotation.set(-.25 * k, Math.sin(lt * 5) * .25, Math.sin(lt * 5) * .08); g.position.y = Math.abs(Math.sin((lt - 3.25) * 5)) * .18; }
  const bites = (lt > 2.35) + (lt > 2.65) + (lt > 2.95); eat(kCake, bites / 3); if (bites < 3) kCake.body.rotation.z = Math.sin(lt * 50) * .05 * (1 - inv(0, .2, (lt - 2.35) % .3)) * (lt > 2.35);
  const k = prog(lt, .3, 2.5, ease.io); cam(mix3([-2.5, 7.2, 21], [2.6, 5.4, 13.6], k), mix3([-2.2, 3.4, 0], [1.9, 3.3, 0], k));
  return () => {
    ctx.fillStyle = 'rgba(40,12,90,.20)'; ctx.fillRect(0, 0, W, H); vignette(.75, '20,6,50');
    hudCakes(t, lt > 2.95, T.eat + 2.95);
    const [cx, cy] = scr(2.9, 3.6, 0); [2.35, 2.65, 2.95].forEach((b, i) => { crumbsFly(t, T.eat + b, cx, cy); croc(t, T.eat + b, cx + [-150, 170, -40][i], cy - 250 - i * 30, i === 2 ? 'MIAM !' : 'CROC !', [-.2, .18, -.08][i]); });
    caption(t, T.eat + .25, T.eat + 2.2, 'C\'est toi, le gourmand ?', { ...CAP, bg: P.violet, anim: 'slide' });
    caption(t, T.eat + 3.1, T.vote > 0 ? T.task - .25 : 0, 'Mange en cachette !', { font: 'Chewy', size: 108, bg: P.yellow, color: P.plum, anim: 'pop', tilt: -2 });
  };
}
function sTask(t) {
  showOnly(GROUPS, gSalon); const lt = t - T.task, h = G[1], done = lt >= 2.0; sway(salonBalloons, t);
  put(h, -.9, 0, .3, 1.2); const pump = Math.sin(lt * 15);
  if (!done) { poseHold(h, 1); h.parts.armL.rotation.x = h.parts.armR.rotation.x = -1.1 + pump * .22; h.parts.torso.rotation.x = 0; h.position.y = 0; pumpH.position.y = 1.35 + pump * .3; h.parts.head.rotation.set(-.1, 0, 0); }
  else { poseCheer(h, t); h.rotation.y = lerp(1.2, .1, prog(lt, 2, 2.4)); h.position.y = Math.abs(Math.sin((lt - 2) * 5.5)) * 1.0; pumpH.position.y = 1.2; }
  const grow = ease.out(inv(.3, 2.0, lt)), r = lerp(.3, 1.75, grow) * (1 + (done ? 0 : pump * .02)), fly = done ? lt - 2 : 0;
  tBalloon.scale.setScalar(r); tBalloon.position.set(2.0 + Math.sin(fly * 3) * .5 * Math.min(1, fly), 2.75 + r * .98 + ease.io(inv(0, 1.9, fly)) * 7.6, -fly * .6); tBalloon.rotation.z = Math.sin(fly * 3) * .15;
  const k = prog(lt, 1.9, 3.6, ease.io); cam([lerp(2.8, -1.5, inv(0, B * 2, lt)), 6.4 + k * 1.2, 19.5 + k * 2.5], [.6, 4.4 + k * 1.6, 0]);
  return () => {
    pill('TÂCHES  ' + (done ? 3 : 2) + ' / 8', 330, 286, { font: 'Inter', size: 50, bg: P.plum, color: P.yellow, border: P.yellow, borderW: 5, scale: 1 + .18 * (1 - inv(2, 2.4, lt)) * done });
    bar(600, 258, 380, 56, lerp(2 / 8, 3 / 8, prog(lt, 2, 2.4)), { color: '#45f07a', border: '#ffffff' });
    const [bx, by] = scr(tBalloon.position.x, tBalloon.position.y, tBalloon.position.z);
    if (!done) { ring(bx, by, 215, inv(.3, 2.0, lt), P.yellow); }
    else { const s = ease.back(inv(2, 2.3, lt)) * (1 - inv(3.0, 3.3, lt)); if (s > 0) { burst(bx, by, 150 * s, '#ffffff', 12, lt); burst(bx, by, 128 * s, '#2fbf5b', 12, lt); check(bx, by, s); } confetti(t, T.task + 2.0, { n: 50, cx: bx, cy: by, power: 900, life: 1.8 }); }
    caption(t, T.task + .2, T.task + 2.0, '8 mini-jeux dans la maison', { ...CAP, bg: P.teal, color: '#0c2f2c', anim: 'slide' });
    caption(t, T.task + 2.15, T.hall - .25, 'Termine tes tâches !', { font: 'Chewy', size: 108, bg: P.orange, anim: 'pop', tilt: 2 });
  };
}
const RING_AT = T.hall + 2.95;
function sHall(t) {
  showOnly(GROUPS, gHall); const lt = t - T.hall, h = G[1], walk = inv(0, 2.5, lt), hx = lerp(-7.5, 4.3, walk);
  put(h, hx, 0, -.1, 1.5708);
  if (lt < 2.5) { poseWalk(h, lt * 9.2, .6); h.position.y = Math.abs(Math.sin(lt * 9.2)) * .15; h.parts.head.rotation.set(.38, .35, 0); h.rotation.y = 1.3; }
  else { const up = prog(lt, 2.5, 2.9), hit = lt > 2.9 ? Math.sin((lt - 2.9) * 12.6) * Math.exp(-(lt - 2.9) * 1.2) * .6 : 0; h.parts.armR.rotation.set(-2.25 * up + hit, 0, 0); h.parts.head.rotation.set(-.3 * up, 0, 0); h.position.y = lt > 2.95 ? Math.abs(Math.sin((lt - 2.95) * 6.3)) * .35 : 0; }
  const sw = t > RING_AT ? Math.sin((t - RING_AT) * 12.6) * .6 * Math.exp(-(t - RING_AT) * .9) : 0; bell.rotation.z = sw;
  TRAIL.forEach((c, i) => { c.gl.material.opacity = (hx > c.x - .5 ? .12 : .5 + .3 * Math.sin(t * 6 + i)); });
  const k = prog(lt, 2.2, 3.0, ease.io); cam(mix3([hx + 2.6, 5.6, 17.5], [6.9, 5.6, 13.2], k), mix3([hx + 1.6, 2.6, 0], [5.7, 4.2, 0], k));
  return () => {
    if (t > RING_AT) { const [bx, by] = scr(6.2, 4.5, 0); for (let i = 0; i < 4; i++) { const p = ((t - RING_AT) * 1.5 - i * .22); if (p > 0 && p < 1) { ctx.strokeStyle = `rgba(255,224,90,${(1 - p) * .9})`; ctx.lineWidth = 16 * (1 - p) + 4; ctx.beginPath(); ctx.arc(bx, by, 90 + p * 520, 0, 7); ctx.stroke(); } } }
    caption(t, T.hall + .2, T.hall + 2.5, 'Suis les miettes…', { ...CAP, size: 84, bg: '#2f7d5b', anim: 'slide' });
    caption(t, RING_AT, T.vote - .25, 'SONNE LA CLOCHE !', { font: 'Chewy', size: 118, bg: P.yellow, color: P.plum, anim: 'slam', tilt: -2 });
  };
}
function meetSetup(t, lt, revealK) {
  showOnly(GROUPS, gMeet);
  SLOT.forEach((s, i) => { const c = G[SLOT_WHO[i]]; put(c, s.x, 0, s.z, s.ry); poseIdle(c, t * .25 + i); });
  for (const [from, to, at] of VOTES) { if (lt < at || to < 0) continue; const c = G[SLOT_WHO[from]], a = SLOT[from], b = SLOT[to], k = prog(lt, at, at + .25); c.rotation.y = lerp(a.ry, Math.atan2(b.x - a.x, b.z - a.z), k); c.parts.armR.rotation.set(-1.5 * k, 0, 0); }
}
const MEET_CAM = [[0, 14.5, 26.5], [0, 2.6, -1.6]];
function sVote(t) {
  const lt = t - T.vote; meetSetup(t, lt);
  cam([Math.sin(lt * .5) * 1.5, MEET_CAM[0][1] - lt * .25, MEET_CAM[0][2] - lt * .5], MEET_CAM[1]);
  return () => {
    const count = new Array(7).fill(0);
    for (const [from, to, at] of VOTES) {
      const k = inv(at, at + .28, lt); if (k <= 0) continue; const a = SLOT[from], [ax, ay] = scr(a.x, 7.3, a.z);
      if (to < 0) { pill('PASSE', ax, ay, { font: 'Inter', size: 40, bg: '#6b6b80', color: '#ffffff', scale: ease.back(k), border: '#ffffff', borderW: 4 }); continue; }
      const b = SLOT[to], [bx, by] = scr(b.x, 7.6, b.z);
      if (k < 1) { const e = ease.io(k), x = lerp(ax, bx, e), y = lerp(ay, by, e) - Math.sin(e * Math.PI) * 130; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.fillStyle = P.red; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); } else count[to]++;
    }
    count.forEach((n, i) => { if (!n) return; const last = Math.max(...VOTES.filter(v => v[1] === i && lt >= v[2] + .28).map(v => v[2] + .28)); const [x, y] = scr(SLOT[i].x, 7.7, SLOT[i].z); badge(x, y - 10, String(n), i === GL ? P.red : '#6c5ce7', 1 + .5 * (1 - inv(last, last + .3, lt))); });
    text('RÉUNION !', SAFE.cx, 320, { font: 'Chewy', size: 128, grad: ['#ffffff', P.yellow], stroke: P.plum, strokeW: 20, shadow: 'rgba(0,0,0,.4)', scale: ease.back(inv(.05, .4, lt)) });
    bar(240, 420, 600, 40, 1 - lt / (T.rev - T.vote), { color: lt > 2.2 ? P.red : P.yellow, border: '#ffffff' });
    caption(t, T.vote + .25, T.rev - .1, 'Vote avec tes amis !', { ...CAP, size: 84, bg: P.pink, anim: 'pop' });
  };
}
const LOCK = T.rev + 1.0;
function sReveal(t) {
  const lt = t - T.rev; meetSetup(t, 99); const s = SLOT[GL];
  if (lt < 1) {
    cam(mix3([0, 13.7, 24.8], [1.2, 11.5, 21], ease.in(lt)), mix3(MEET_CAM[1], [1, 3, -2], lt));
    return () => {
      const i = [5, 1, GL][Math.min(2, Math.floor(lt * 3))], [x, y] = scr(SLOT[i].x, 3.6, SLOT[i].z); spot(x, y, 190, .82);
      caption(t, T.rev + .02, LOCK - .02, 'Et le gourmand est…', { ...CAP, size: 84, bg: P.plum, anim: 'fade', inDur: .12 });
    };
  }
  G[0].visible = false; put(gRev, s.x, 0, s.z + .6, -.1); const j = lt - 1; poseHold(gRev, 1); gRev.position.y = Math.max(0, Math.sin(Math.min(j, .5) * 6.2832) * 1.5) + (j > .5 ? Math.abs(Math.sin((j - .5) * 5)) * .25 : 0);
  gRev.parts.head.rotation.set(0, Math.sin(j * 7) * .35 * Math.exp(-j * .6), Math.sin(j * 9) * .08); gRev.rotation.y = -.1 + Math.sin(j * 7) * .12 * Math.exp(-j);
  SLOT.forEach((p, i) => { if (i === GL) return; const c = G[SLOT_WHO[i]]; c.rotation.y = Math.atan2(s.x - p.x, s.z + .6 - p.z); if (i % 2) { poseCheer(c, t + i); c.position.y = Math.abs(Math.sin(t * 6 + i)) * .5; } else c.parts.armR.rotation.set(-1.5, 0, 0); });
  const a = j * .16; cam([s.x + 1.8 + Math.sin(a) * 3, 5.6 + j * .15, s.z + 13.6 - prog(j, 0, .5) * 1.4 + j * .25], [s.x - .1, 3.9, s.z]);
  return () => {
    const [x, y] = scr(s.x, 3.6, s.z + .6); spot(x, y, 520, .5); confetti(t, LOCK, { cy: 700, n: 130 });
    caption(t, LOCK, LOCK + 1.75, 'DÉMASQUÉ !', { font: 'Chewy', size: 190, y: 430, anim: 'slam', grad: ['#fff6a8', P.yellow], tilt: -4 });
    if (lt > 2.8) sparkles(t, { n: 30, y: 260, h: 1000, color: P.yellow, size: 22, seed: 3 });
    caption(t, LOCK + 1.85, T.end - .2, 'Gagne des Paillettes !', { font: 'Chewy', size: 108, bg: P.pink, anim: 'pop', tilt: 2 });
  };
}
function sEnd(t) {
  const lt = t - T.end; partySetup(t, 2); cakes.forEach((c, i) => eat(c, i === MISSING ? 1 : 0));
  cam([Math.sin(lt * .25) * 4, 8.5 + lt * .25, 24 - lt * .4], [0, 7.2, -2]);
  return () => {
    fade(.52 * inv(0, .4, lt), P.night); rays(t, { cy: 640, color: 'rgba(255,95,162,.13)', n: 14 }); sparkles(t, { y: 230, h: 1000, color: '#fff2b0', n: 30 }); confetti(t, T.end + .1, { n: 90, cy: 500, life: 3.4 });
    endCard(t, T.end + .15, { title: 'WHO ATE\nTHE CAKE?', tagline: 'Démasque le gourmand !', status: 'bientot', font: 'Chewy', titleGrad: ['#fff6a8', P.yellow], titleStroke: P.plum, accent: P.pink, y: 760 });
  };
}

function render(t) {
  for (const c of ALL) c.visible = false; loupe.visible = false;
  const dark = t >= T.eat && t < T.task, meet = t >= T.vote && t < T.end;
  L.sun.intensity = dark ? 1.35 : meet ? 2.0 : 2.4; L.hemi.intensity = dark ? .8 : meet ? 1.0 : 1.2;
  bg(dark ? ['#241048', '#0f0724'] : [P.plum, P.night]);
  const over = t < T.roles ? sHook(t) : t < T.eat ? sRoles(t) : t < T.task ? sEat(t) : t < T.hall ? sTask(t) : t < T.vote ? sHall(t) : t < T.rev ? sVote(t) : t < T.end ? sReveal(t) : sEnd(t);
  const s1 = shake(t, 1.2, 14), s2 = shake(t, RING_AT, 16), s3 = shake(t, LOCK, 24), s4 = shake(t, T.eat + 2.95, 10);
  draw3D(scene, camera, { dx: s1[0] + s2[0] + s3[0] + s4[0], dy: s1[1] + s2[1] + s3[1] + s4[1] });
  if (!dark && t < T.end) vignette(.32, '30,8,60');
  over();
  wipe(t, T.roles, { dur: .44, color: P.yellow, color2: P.pink, dir: 'left' });
  flash(t, T.eat, .4, '36,12,80');
  wipe(t, T.task, { dur: .44, color: P.teal, color2: P.yellow, dir: 'right' });
  flash(t, T.hall, .3);
  wipe(t, T.vote, { dur: .44, color: P.plum, color2: P.yellow, dir: 'down' });
  flash(t, LOCK, .4);
  wipe(t, T.end, { dur: .44, color: P.pink, color2: P.yellow, dir: 'up' });
}

registerAd({ duration: DURATION, thumbTime: LOCK + .7, render,
  music: { style: 'sneaky', bpm: 108, sections: [[0, 'build'], [T.roles, 'drop'], [T.eat, 'break'], [T.task, 'drop'], [T.vote, 'build'], [LOCK, 'drop2']], stops: [[T.rev + .05, LOCK]], end: T.end + .1 } });
