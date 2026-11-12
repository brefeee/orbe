// Publicité « Backyard Defenders » : défense stratégique, des jouets contre des vagues d'insectes.
// Statut : bientôt sur Roblox. Musique : toybox. Police de titre : Luckiest.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseIdle, poseCheer, bushyTree, tree, ground, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, confetti, sparkles, letterbox, roundRect,
  text, caption, pill, bar, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Luckiest', 'Inter']);
const BAR = 240 / 126;                                   // une mesure = 1,905 s
const T = { hook: 0, place: 2 * BAR, auto: 4 * BAR, up: 6 * BAR, coop: 8 * BAR, waves: 10 * BAR, boss: 12 * BAR, win: 14 * BAR, end: 15 * BAR };
const DURATION = 18 * BAR;                               // 34,3 s
const T_UP = T.up + 2.0;                                 // instant où l'amélioration est choisie

// Palette
const C = { grass: '#69c24c', grass2: '#78d05a', path: '#e6c88e', pathEdge: '#b98f55', red: '#ff4d4d', blue: '#2f8cff', yellow: '#ffd23f', orange: '#ff8a2a',
  green: '#3ccf6e', violet: '#7b3fe4', steel: '#c9d2df', dark: '#1c1c26', wood: '#c98f4e', white: '#ffffff' };
const M = (c, o) => mat(c, o);

// ====================================================================== scène
gl3D({ exposure: 1.05 });
const scene = new THREE.Scene(), camera = makeCamera(44);
const lights = addLights(scene, { shadowArea: 24, shadowMap: 2048, ambI: 1.25, sunI: 2.5, dir: [7, 14, 8] });
const world = new THREE.Group(); scene.add(world);

// ---------- pelouse tondue en bandes ----------
const grassTex = canvasTex(512, (g, n) => {
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? C.grass : C.grass2; g.fillRect(0, i * n / 4, n, n / 4); }
  for (let i = 0; i < 1400; i++) { g.fillStyle = hash(i) > .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,60,0,.08)'; g.fillRect(hash(i * 3) * n, hash(i * 7) * n, 3, 9); }
}, { repeat: 19 });
world.add(ground(300, C.grass, { tex: grassTex }));

// ---------- chemin sinueux ----------
const curve = new THREE.CatmullRomCurve3([[-6, -37], [-6, -18], [6, -13], [6, -3], [-6, 2], [-6, 12], [5, 17], [5, 36]].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
const L = curve.getLength();
const pathAt = (d, out = new THREE.Vector3()) => curve.getPointAt(clamp(d / L, 0, 1), out);
const SAMPLES = []; for (let i = 0; i <= 400; i++) SAMPLES.push(curve.getPointAt(i / 400));
function nearestD(x, z) { let b = 0, bd = 1e9; SAMPLES.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = i; } }); return b / 400 * L; }
function distToPath(x, z) { let bd = 1e9; for (const p of SAMPLES) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) bd = d; } return bd; }
function ribbon(width, y, color) {
  const n = 300, pos = [], idx = [], nor = [], tg = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i <= n; i++) { curve.getPointAt(i / n, p); curve.getTangentAt(i / n, tg); const nx = tg.z, nz = -tg.x; pos.push(p.x + nx * width / 2, y, p.z + nz * width / 2, p.x - nx * width / 2, y, p.z - nz * width / 2); nor.push(0, 1, 0, 0, 1, 0); if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: .95, side: THREE.DoubleSide })); m.receiveShadow = true; return m;
}
world.add(ribbon(4.5, .03, C.pathEdge)); world.add(ribbon(3.7, .06, C.path));

function instanced(geo, material, list, cast = true) {
  const im = new THREE.InstancedMesh(geo, material, list.length), o = new THREE.Object3D();
  list.forEach((e, i) => { o.position.set(...e.p); o.rotation.set(...(e.r ?? [0, 0, 0])); o.scale.set(...(e.s ?? [1, 1, 1])); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = cast; im.receiveShadow = true; return im;
}
// cailloux le long du chemin
{ const l = []; for (let i = 0; i < 150; i++) { const u = (i + hash(i) * .6) / 150, p = curve.getPointAt(u), tg = curve.getTangentAt(u), s = i % 2 ? 1 : -1, o = 2.15 + hash(i * 5) * .25, r = .16 + hash(i * 9) * .16; l.push({ p: [p.x + tg.z * o * s, .1, p.z - tg.x * o * s], s: [r, r * .6, r * 1.2], r: [0, hash(i) * 6, 0] }); }
  world.add(instanced(new THREE.SphereGeometry(1, 8, 6), M('#f1ece2', { rough: .8 }), l, false)); }

// ---------- positions des jouets (au bord du chemin) ----------
const TOYPOS = [[.5, -8], [0, 7.5], [11, -8], [-11.5, 7], [0, 22.5], [-.5, -23], [10.5, 22]];
const RANGE = 8.5;
const DECOR = [[-11.5, -9, 4.6], [11.5, 8, 4.4], [10.5, -25, 4.6], [-12, 25, 3.6], [-6, -35, 4]];       // zones occupées (x, z, rayon)
const freeSpot = (x, z, m = 0) => distToPath(x, z) > 3.3 + m && TOYPOS.every(([a, b]) => Math.hypot(a - x, b - z) > 3 + m) && DECOR.every(([a, b, r]) => Math.hypot(a - x, b - z) > r + m);
for (const [x, z] of TOYPOS) { const p = cyl(1.95, 2.05, .1, M(C.wood, { rough: .9 }), { pos: [x, .05, z], cast: false }); world.add(p); const r = torus(1.95, .09, M('#8a5a2c'), { pos: [x, .1, z], rot: [Math.PI / 2, 0, 0], cast: false }); world.add(r); }

// ---------- clôture blanche (3 côtés) ----------
{ const FX = 17.5, FZ = 35.5, l = [];
  for (let x = -FX; x <= FX; x += .82) if (Math.abs(x + 6) > 2.6) l.push({ p: [x, .85, -FZ] });
  for (let z = -FZ; z <= FZ + 4; z += .82) { l.push({ p: [-FX, .85, z], r: [0, Math.PI / 2, 0] }); l.push({ p: [FX, .85, z], r: [0, Math.PI / 2, 0] }); }
  world.add(instanced(new THREE.BoxGeometry(.56, 1.7, .14), M('#fbfbf5', { rough: .7 }), l));
  const rm = M('#eeeee4');
  for (const y of [.55, 1.2]) { world.add(box(.1, .16, FZ * 2 + 4, rm, { pos: [-FX, y, 2] })); world.add(box(.1, .16, FZ * 2 + 4, rm, { pos: [FX, y, 2] })); world.add(box(8.8, .16, .1, rm, { pos: [-13, y, -FZ] })); world.add(box(20.8, .16, .1, rm, { pos: [7, y, -FZ] })); }
}
// terrier d'où sortent les insectes
{ const m = ball(3.2, M('#8a5a2c', { rough: 1 }), { pos: [-6, -.6, -36.4], seg: 18 }); m.scale.set(1.25, .85, 1); world.add(m);
  const h = ball(1.7, M('#1a1008', { rough: 1 }), { pos: [-6, .5, -34.6], seg: 16, cast: false }); h.scale.set(1.05, .95, .5); world.add(h);
  for (let i = 0; i < 7; i++) world.add(ball(.3 + hash(i) * .3, M('#7a4f2b', { rough: 1 }), { pos: [-6 + (hash(i * 3) - .5) * 7, .15, -33.2 + hash(i * 5) * 1.6], seg: 8, seg2: 6 })); }

// ---------- fleurs, buissons, arbres, champignons ----------
{ const stems = [], heads = [[], [], []], hearts = []; let n = 0;
  for (let i = 0; i < 400 && n < 90; i++) { const x = (hash(i * 1.7) - .5) * 33, z = (hash(i * 4.3) - .5) * 68; if (!freeSpot(x, z, .4)) continue; const h = .7 + hash(i * 9) * .5; n++;
    stems.push({ p: [x, h / 2, z], s: [1, h, 1] }); heads[i % 3].push({ p: [x, h, z], s: [1, .45, 1], r: [.25, hash(i) * 6, 0] }); hearts.push({ p: [x, h + .1, z] }); }
  world.add(instanced(new THREE.CylinderGeometry(.05, .05, 1, 6), M('#2e9140'), stems, false));
  ['#ff6fa5', '#ffffff', '#ffb02e'].forEach((c, k) => world.add(instanced(new THREE.SphereGeometry(.34, 10, 8), M(c, { rough: .6 }), heads[k], false)));
  world.add(instanced(new THREE.SphereGeometry(.15, 8, 6), M('#ffd23f'), hearts, false));
  const bl = []; for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, z = -33 + i * 2.7 + hash(i) * 1.2, r = 1 + hash(i * 3) * .6; bl.push({ p: [side * (16 - hash(i * 5) * .6), r * .6, z], s: [r, r * .8, r] }); }
  for (let i = 0; i < 6; i++) { const x = 1 + i * 3.2, r = 1.1 + hash(i * 7) * .5; bl.push({ p: [x, r * .6, -34 + hash(i) * .5], s: [r, r * .8, r] }); }
  world.add(instanced(new THREE.SphereGeometry(1, 10, 8), M('#3f9f45', { rough: .9, flat: true }), bl));
  for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, tr = (i % 3 ? bushyTree : tree)(7 + hash(i) * 3, i % 2 ? '#49b356' : '#3a9a4c'); tr.position.set(side * (22 + hash(i * 3) * 6), 0, -42 + i * 9); world.add(tr); }
  for (let i = 0; i < 5; i++) { const tr = bushyTree(8 + hash(i * 5) * 3); tr.position.set(-18 + i * 9, 0, -44 - hash(i) * 5); world.add(tr); }
  let k = 0; for (let i = 0; i < 80 && k < 9; i++) { const x = (hash(i * 2.9 + 40) - .5) * 30, z = (hash(i * 6.1 + 40) - .5) * 62; if (!freeSpot(x, z, .8)) continue; k++; const s = .6 + hash(i) * .5;
    world.add(cyl(.16 * s, .2 * s, .55 * s, M('#fff4dc'), { pos: [x, .27 * s, z], seg: 8 })); const c = ball(.5 * s, M('#ef3b3b', { rough: .5 }), { pos: [x, .55 * s, z], seg: 12, seg2: 8 }); c.scale.y = .6; world.add(c); }
}
// ---------- piscine gonflable + canard ----------
{ const g = new THREE.Group(); g.position.set(-11.5, 0, -9); world.add(g);
  g.add(torus(3.3, .62, M('#ff6fa5', { rough: .4 }), { pos: [0, .55, 0], rot: [Math.PI / 2, 0, 0] })); g.add(torus(3.3, .5, M('#ffd23f', { rough: .4 }), { pos: [0, 1.25, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(cyl(3.3, 3.3, .1, M('#4fc3ff', { rough: .15, emissive: '#1668b8', emissiveI: .35 }), { pos: [0, 1.05, 0], cast: false, seg: 32 }));
  const d = new THREE.Group(); d.position.set(.8, 1.1, -.4); g.add(d); const yb = M('#ffd23f', { rough: .4 });
  const b = ball(.7, yb, { pos: [0, .35, 0] }); b.scale.set(1, .75, 1.25); d.add(b); d.add(ball(.45, yb, { pos: [0, 1.0, .55] })); d.add(cone(.2, .45, M(C.orange), { pos: [0, .95, 1.05], rot: [Math.PI / 2, 0, 0], seg: 8 }));
  for (const s of [-1, 1]) d.add(ball(.08, M(C.dark), { pos: [s * .22, 1.12, .9], seg: 6, seg2: 6, cast: false })); world.userData.duck = d; }
// ---------- bac à sable ----------
{ const g = new THREE.Group(); g.position.set(11.5, 0, 8); g.rotation.y = .15; world.add(g); const wd = M('#d79a55', { rough: .85 });
  g.add(box(6.4, .7, .5, wd, { pos: [0, .35, 2.95] })); g.add(box(6.4, .7, .5, wd, { pos: [0, .35, -2.95] })); g.add(box(.5, .7, 6.4, wd, { pos: [2.95, .35, 0] })); g.add(box(.5, .7, 6.4, wd, { pos: [-2.95, .35, 0] }));
  g.add(box(5.6, .4, 5.6, M('#f4dc9c', { rough: 1 }), { pos: [0, .25, 0] })); const s = ball(1.1, M('#f0d38c', { rough: 1 }), { pos: [-1, .35, -.8], seg: 12 }); s.scale.y = .6; g.add(s);
  g.add(cyl(.75, .55, 1.1, M(C.red, { rough: .45 }), { pos: [1.2, 1.0, .9] })); g.add(torus(.6, .06, M(C.white), { pos: [1.2, 1.6, .9], seg: 16 }));
  g.add(box(.18, .12, 1.6, M(C.blue), { pos: [-.6, .55, 1.4], rot: [0, .7, 0] })); g.add(rbox(.6, .1, .7, .1, M(C.blue), { pos: [-1.2, .55, .9], rot: [0, .7, 0] })); }
// ---------- nappe de pique-nique ----------
{ const g = new THREE.Group(); g.position.set(10.5, 0, -25); g.rotation.y = -.2; world.add(g);
  const tx = canvasTex(128, (c, n) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#ff5a5a' : '#fff5f0'; c.fillRect(i * n / 8, j * n / 8, n / 8, n / 8); } });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 6), new THREE.MeshStandardMaterial({ map: tx, roughness: .9 })); p.rotation.x = -Math.PI / 2; p.position.y = .07; p.receiveShadow = true; g.add(p);
  g.add(rbox(2, 1.2, 1.4, .2, M('#b97a3d', { rough: .9 }), { pos: [-1.6, .7, -.8] })); g.add(torus(.7, .08, M('#8a5a2c'), { pos: [-1.6, 1.35, -.8], seg: 16 }));
  g.add(cyl(.9, .9, .12, M(C.white), { pos: [1.3, .15, .6] })); const cake = cyl(.6, .6, .5, M('#ff9ec4'), { pos: [1.3, .45, .6] }); g.add(cake); g.add(ball(.16, M(C.red), { pos: [1.3, .78, .6], seg: 8, seg2: 6 }));
  g.add(ball(.45, M('#7ed957', { rough: .4 }), { pos: [1.9, .5, -1.6] })); }
// ---------- arrosoir + tuyau ----------
{ const g = new THREE.Group(); g.position.set(-12, 0, 25); g.rotation.y = .8; world.add(g); const gm = M('#35b8a6', { rough: .4 });
  g.add(cyl(1.0, 1.1, 1.8, gm, { pos: [0, .9, 0] })); g.add(cyl(.14, .22, 2.0, gm, { pos: [1.5, 1.3, 0], rot: [0, 0, -.9] })); g.add(cyl(.42, .2, .3, M(C.yellow), { pos: [2.35, 1.95, 0], rot: [0, 0, -.9] }));
  g.add(torus(.7, .1, gm, { pos: [-1.0, 1.1, 0], seg: 16 }));
  for (let i = 0; i < 3; i++) g.add(torus(1.5 - i * .25, .16, M('#2e9140', { rough: .5 }), { pos: [-.4, .16 + i * .22, 3.2], rot: [Math.PI / 2, 0, 0] })); }
// ---------- terrasse + coffre à jouets (au bout du chemin) ----------
{ const tx = canvasTex(128, (c, n) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#c58d52' : '#b77f47'; c.fillRect(0, i * n / 8, n, n / 8 - 2); } }, { repeat: 4 });
  const d = new THREE.Mesh(new THREE.BoxGeometry(36, .5, 14), new THREE.MeshStandardMaterial({ map: tx, roughness: .85 })); d.position.set(0, .12, 43.5); d.receiveShadow = true; world.add(d);
  const ch = new THREE.Group(); ch.position.set(-4, .4, 40); ch.rotation.y = .3; world.add(ch);
  ch.add(rbox(4, 2, 2.4, .25, M(C.blue, { rough: .5 }), { pos: [0, 1, 0] })); ch.add(rbox(4.1, .5, 2.5, .2, M(C.red, { rough: .5 }), { pos: [0, 2.5, -.9], rot: [-.9, 0, 0] })); ch.add(ball(.35, M(C.yellow), { pos: [0, 1.3, 1.25], seg: 10 })); }

// ---------- zones de couleur des 4 joueurs (plan coopération) ----------
const ZONES = [[0, -8, C.red], [1.5, 8, C.blue], [-12, 8.5, C.yellow], [-1.5, 23, C.green]];
const zoneG = new THREE.Group(); world.add(zoneG);
for (const [x, z, c] of ZONES) { const m = new THREE.Mesh(new THREE.RingGeometry(4.3, 5, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9 })); m.rotation.x = -Math.PI / 2; m.position.set(x, .12, z); zoneG.add(m);
  const f = new THREE.Mesh(new THREE.CircleGeometry(4.3, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .28 })); f.rotation.x = -Math.PI / 2; f.position.set(x, .11, z); zoneG.add(f); }
const players = [
  makeCharacter({ shirt: C.red, pants: '#27324f', hair: '#3b2a1e', face: 'happy', scale: .8 }), makeCharacter({ shirt: C.blue, pants: '#2b3350', hat: 'cap', hatColor: C.yellow, face: 'happy', scale: .8 }),
  makeCharacter({ shirt: C.yellow, pants: '#5a3d2b', hair: '#e2863b', face: 'smile', scale: .8 }), makeCharacter({ shirt: C.green, pants: '#27324f', hat: 'cone', hatColor: C.violet, face: 'happy', scale: .8 })];
players.forEach(p => world.add(p));
const PLAYERPOS = [[-2.6, -5.6], [3.6, 9.6], [-13.6, 11.2], [-3.8, 25]];

// ---------- cercle de portée (placement) ----------
const rangeG = new THREE.Group(); world.add(rangeG);
{ const r = new THREE.Mesh(new THREE.RingGeometry(RANGE - .3, RANGE, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9 })); r.rotation.x = -Math.PI / 2; rangeG.add(r);
  const f = new THREE.Mesh(new THREE.CircleGeometry(RANGE - .3, 64), new THREE.MeshBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: .25, depthWrite: false })); f.rotation.x = -Math.PI / 2; rangeG.add(f); rangeG.position.y = .14; }

// ====================================================================== insectes
const mBlack = M(C.dark, { rough: .5 }), mWhite = M('#ffffff', { rough: .4 });
function addEyes(g, dx, y, z, r) { for (const s of [-1, 1]) { g.add(ball(r, mWhite, { pos: [s * dx, y, z], seg: 10, seg2: 8, cast: false })); g.add(ball(r * .55, mBlack, { pos: [s * dx * .95, y + r * .08, z + r * .62], seg: 8, seg2: 6, cast: false })); } }
function addLegs(g, w, zs) { return zs.map(z => { const l = box(w, .1, .14, mBlack, { pos: [0, .16, z], cast: false }); g.add(l); return l; }); }
function ladybug() { const g = new THREE.Group(); const b = ball(.8, M('#f23838', { rough: .3 }), { pos: [0, .55, 0], seg: 18, seg2: 12 }); b.scale.set(1, .7, 1.15); g.add(b);
  const s = ball(.81, mBlack, { pos: [0, .55, 0], seg: 12, seg2: 10, cast: false }); s.scale.set(.06, .71, 1.16); g.add(s); g.add(ball(.44, mBlack, { pos: [0, .5, .85], seg: 12, seg2: 10 }));
  for (const sx of [-1, 1]) { g.add(ball(.17, mBlack, { pos: [sx * .42, .96, .3], seg: 8, seg2: 6, cast: false })); g.add(ball(.17, mBlack, { pos: [sx * .5, .86, -.45], seg: 8, seg2: 6, cast: false })); g.add(cyl(.03, .03, .5, mBlack, { pos: [sx * .18, 1.0, 1.05], rot: [.5, 0, -sx * .3], seg: 5, cast: false })); }
  addEyes(g, .2, .72, 1.15, .17); g.userData.legs = addLegs(g, 2.0, [-.45, .05, .55]); return g; }
function ant() { const g = new THREE.Group(), m = M('#9a4f2a', { rough: .45 }); const a = ball(.55, m, { pos: [0, .62, -.85], seg: 14, seg2: 10 }); a.scale.z = 1.3; g.add(a); g.add(ball(.38, m, { pos: [0, .52, 0], seg: 12, seg2: 8 })); g.add(ball(.5, m, { pos: [0, .74, .72], seg: 14, seg2: 10 }));
  for (const sx of [-1, 1]) g.add(cyl(.03, .03, .6, mBlack, { pos: [sx * .22, 1.3, .9], rot: [.5, 0, -sx * .35], seg: 5, cast: false }));
  addEyes(g, .24, .85, 1.1, .19); g.userData.legs = addLegs(g, 1.9, [-.35, .05, .45]); return g; }
function beetle() { const g = new THREE.Group(); const b = ball(.78, M('#17b7a5', { rough: .2, emissive: '#06443c', emissiveI: .4 }), { pos: [0, .55, -.1], seg: 18, seg2: 12 }); b.scale.set(1, .75, 1.2); g.add(b);
  const s = ball(.79, M('#0c6b60'), { pos: [0, .55, -.1], seg: 12, seg2: 10, cast: false }); s.scale.set(.06, .76, 1.21); g.add(s); g.add(ball(.42, M('#0c4f48', { rough: .4 }), { pos: [0, .5, .85], seg: 12, seg2: 10 }));
  g.add(cone(.14, .7, M(C.yellow, { rough: .4 }), { pos: [0, .95, 1.1], rot: [.7, 0, 0], seg: 8 })); addEyes(g, .22, .68, 1.17, .16); g.userData.legs = addLegs(g, 2.0, [-.5, 0, .5]); return g; }
function caterpillar() { const g = new THREE.Group(), segs = []; for (let i = 0; i < 5; i++) { const b = ball(.46, M(i % 2 ? '#5fc02f' : '#9be33f', { rough: .5 }), { pos: [0, .46, -1.5 + i * .55], seg: 12, seg2: 10 }); g.add(b); segs.push(b); }
  const h = ball(.56, M('#b6f04f', { rough: .5 }), { pos: [0, .62, 1.15], seg: 14, seg2: 10 }); g.add(h);
  for (const sx of [-1, 1]) { g.add(cyl(.03, .03, .5, mBlack, { pos: [sx * .2, 1.25, 1.2], rot: [.2, 0, -sx * .3], seg: 5, cast: false })); g.add(ball(.09, M(C.orange), { pos: [sx * .28, 1.5, 1.25], seg: 6, seg2: 6, cast: false })); }
  addEyes(g, .24, .78, 1.6, .2); g.userData.segs = segs; return g; }
const NI = 36, KIND = [ladybug, ant, beetle, ladybug, caterpillar, ant], insects = [];
for (let i = 0; i < NI; i++) { const g = KIND[i % 6](); g.userData.s = 1.25 + hash(i * 13) * .25; world.add(g); insects.push(g); }

// ---------- la Reine Scarabée ----------
const queen = new THREE.Group(); world.add(queen);
{ const body = new THREE.Group(); queen.add(body); queen.userData.body = body; const gold = M('#ffcf3a', { rough: .25, emissive: '#b97800', emissiveI: .45 });
  const sh = ball(2.3, M(C.violet, { rough: .2, emissive: '#2c0f73', emissiveI: .5 }), { pos: [0, 2.5, -.4], seg: 32, seg2: 20 }); sh.scale.set(1, .82, 1.3); body.add(sh);
  const ln = ball(2.32, M('#3d1b8f'), { pos: [0, 2.5, -.4], seg: 16, seg2: 12, cast: false }); ln.scale.set(.04, .825, 1.305); body.add(ln);
  for (const sx of [-1, 1]) for (const [x, y, z, r] of [[1.0, 4.05, .2, .32], [1.45, 3.6, -1.2, .36], [.8, 3.9, -1.8, .26], [1.75, 3.25, .5, .24]]) { const d = ball(r, gold, { pos: [sx * x, y, z], seg: 10, seg2: 8, cast: false }); d.scale.y = .5; body.add(d); }
  const head = new THREE.Group(); head.position.set(0, 2.1, 2.7); body.add(head); queen.userData.head = head;
  head.add(ball(1.3, M('#4a2399', { rough: .3 }), { seg: 20, seg2: 14 }));
  head.add(cone(.42, 2.0, gold, { pos: [0, .9, 1.35], rot: [.75, 0, 0], seg: 10 }));
  for (const sx of [-1, 1]) { head.add(cone(.26, 1.3, M('#2a1260'), { pos: [sx * .6, -.55, 1.5], rot: [Math.PI / 2, 0, sx * .35], seg: 8 }));
    head.add(ball(.42, mWhite, { pos: [sx * .55, .35, 1.0], seg: 12, seg2: 10, cast: false })); head.add(ball(.21, M('#d0153a', { emissive: '#d0153a', emissiveI: .6 }), { pos: [sx * .52, .37, 1.33], seg: 8, seg2: 6, cast: false }));
    head.add(box(.75, .16, .2, M('#1d0b47'), { pos: [sx * .55, .82, 1.15], rot: [0, 0, -sx * .45], cast: false })); }
  // couronne
  head.add(cyl(.85, .7, .6, gold, { pos: [0, 1.45, -.1], seg: 16 })); for (let i = 0; i < 6; i++) head.add(cone(.2, .55, gold, { pos: [Math.cos(i * 1.047) * .72, 2.0, -.1 + Math.sin(i * 1.047) * .72], seg: 6 }));
  head.add(ball(.2, M('#ff3b6b', { emissive: '#ff3b6b', emissiveI: .8 }), { pos: [0, 1.5, .72], seg: 8, seg2: 6 }));
  const legs = []; for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const p = new THREE.Group(); p.position.set(sx * 1.7, 1.9, -1.9 + i * 1.6); const up = box(2.0, .34, .34, M('#2a1260'), { pos: [sx * .8, .15, 0], rot: [0, 0, sx * .25] }); const lo = box(.3, 2.2, .3, M('#2a1260'), { pos: [sx * 1.75, -.85, 0], rot: [0, 0, sx * .12] }); p.add(up, lo); body.add(p); legs.push(p); }
  queen.userData.legs = legs; queen.scale.setScalar(1.05); }
const bossGlows = [0, 1, 2, 3].map(() => { const g = glow('#fff2a8', 3); world.add(g); return g; });

// ====================================================================== jouets
function toyBase(g, color) { g.add(cyl(1.5, 1.7, .4, M(color, { rough: .45 }), { pos: [0, .28, 0] })); g.add(cyl(1.3, 1.3, .1, M(C.white, { rough: .5 }), { pos: [0, .5, 0], cast: false })); }
function makeWaterGun() { const g = new THREE.Group(); toyBase(g, C.blue); g.add(cyl(.28, .38, 1.4, M(C.yellow, { rough: .4 }), { pos: [0, 1.2, 0] }));
  const piv = new THREE.Group(); piv.position.y = 2.3; g.add(piv); const gun = new THREE.Group(); gun.rotation.x = .1; piv.add(gun); const or = M(C.orange, { rough: .35 });
  gun.add(rbox(1.0, 1.1, 2.7, .3, or, { pos: [0, 0, .1] })); gun.add(cyl(.32, .32, 1.5, M(C.blue, { rough: .35 }), { pos: [0, .15, 2.1], rot: [Math.PI / 2, 0, 0] })); gun.add(cyl(.36, .2, .4, M(C.yellow, { rough: .35 }), { pos: [0, .15, 3.0], rot: [Math.PI / 2, 0, 0] }));
  const tank = ball(.78, M('#6fd6ff', { opacity: .8, rough: .1, emissive: '#1a86d8', emissiveI: .45 }), { pos: [0, 1.05, -.25] }); tank.scale.set(1, 1.1, 1.25); gun.add(tank); gun.add(cyl(.26, .26, .3, M(C.red), { pos: [0, 1.95, -.25] }));
  gun.add(rbox(.62, 1.3, .8, .2, or, { pos: [0, -1.0, -.95], rot: [.3, 0, 0] })); gun.add(rbox(.74, .5, 1.1, .2, M(C.green, { rough: .4 }), { pos: [0, -.5, 1.55] })); gun.add(box(.2, .45, .2, M(C.yellow), { pos: [0, -.7, -.25] }));
  g.userData = { piv, gun, muzzle: [0, 2.35, 3.2], kind: 'water' }; return g; }
function makeRobot() { const g = new THREE.Group(); toyBase(g, C.red); const piv = new THREE.Group(); piv.position.y = .5; g.add(piv); const st = M(C.steel, { rough: .35 }), rd = M(C.red, { rough: .35 }), bl = M(C.blue, { rough: .35 });
  for (const s of [-1, 1]) piv.add(rbox(.6, .9, .75, .12, st, { pos: [s * .45, .45, 0] }));
  piv.add(rbox(1.8, 1.6, 1.25, .22, rd, { pos: [0, 1.7, 0] }));
  piv.add(sign(1.2, .85, (c, w, h) => { c.fillStyle = '#20263a'; c.beginPath(); c.roundRect(0, 0, w, h, 18); c.fill(); c.fillStyle = '#45f07a'; c.beginPath(); c.arc(w * .25, h * .4, w * .13, 0, 7); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(w * .55, h * .4, w * .1, 0, 7); c.fill(); c.fillStyle = '#ff4d6d'; c.fillRect(w * .72, h * .2, w * .16, h * .4); c.fillStyle = '#c9d2df'; for (let i = 0; i < 4; i++) c.fillRect(w * (.14 + i * .2), h * .74, w * .12, h * .1); }, { res: 128, pos: [0, 1.75, .64] }));
  const head = new THREE.Group(); head.position.y = 3.05; piv.add(head); head.add(rbox(1.4, 1.05, 1.15, .22, st));
  for (const s of [-1, 1]) { head.add(ball(.21, M('#fff27a', { emissive: '#ffd23f', emissiveI: 1.6 }), { pos: [s * .32, .08, .58], seg: 10, seg2: 8, cast: false })); head.add(cyl(.2, .2, .22, bl, { pos: [s * .8, 0, 0], rot: [0, 0, Math.PI / 2] })); }
  head.add(box(.62, .1, .06, M('#2b3350'), { pos: [0, -.28, .58], cast: false })); head.add(cyl(.05, .05, .6, st, { pos: [0, .8, 0], seg: 6 })); head.add(ball(.17, M(C.red, { emissive: C.red, emissiveI: .9 }), { pos: [0, 1.15, 0], seg: 8, seg2: 6 }));
  const arms = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 1.22, 2.2, 0); a.add(ball(.32, bl, { seg: 10, seg2: 8 })); a.add(rbox(.48, .48, 1.5, .15, st, { pos: [0, 0, .7] })); a.add(cyl(.22, .32, .4, M(C.yellow, { rough: .35 }), { pos: [0, 0, 1.6], rot: [Math.PI / 2, 0, 0] })); piv.add(a); return a; });
  piv.add(cyl(.08, .08, .5, st, { pos: [0, 1.8, -.85], rot: [Math.PI / 2, 0, 0], seg: 6 })); const key = torus(.32, .09, M(C.yellow, { rough: .35 }), { pos: [0, 1.8, -1.2], seg: 14 }); piv.add(key);
  const extra = new THREE.Group(); piv.add(extra);                                            // pièces ajoutées par l'amélioration
  for (const s of [-1, 1]) { extra.add(cyl(.27, .27, 1.5, bl, { pos: [s * 1.25, 3.0, .25], rot: [Math.PI / 2, 0, 0] })); extra.add(cyl(.34, .2, .3, M(C.yellow), { pos: [s * 1.25, 3.0, 1.1], rot: [Math.PI / 2, 0, 0] })); }
  extra.add(torus(.45, .07, M(C.yellow, { emissive: '#b97800', emissiveI: .5 }), { pos: [0, 3.95, 0], rot: [Math.PI / 2, 0, 0], seg: 16 }));
  g.userData = { piv, arms, key, extra, head, muzzle: [0, 2.7, 2.3], kind: 'robot' }; return g; }
const ballTex = canvasTex(256, (c, n) => { [C.red, '#ffffff', C.blue, '#ffffff', C.yellow, '#ffffff', C.green, '#ffffff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * n / 8, 0, n / 8 + 1, n); }); });
function makeBalloon() { const g = new THREE.Group(); toyBase(g, C.yellow); const piv = new THREE.Group(); g.add(piv);
  piv.add(cyl(1.05, .7, .9, M('#b388ff', { rough: .4 }), { pos: [0, .95, 0] })); piv.add(torus(1.05, .12, M(C.white), { pos: [0, 1.4, 0], rot: [Math.PI / 2, 0, 0], seg: 20 }));
  const bb = new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 18), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .3 })); bb.castShadow = true; bb.position.y = 2.6; bb.rotation.z = .35; piv.add(bb);
  g.userData = { piv, bb, muzzle: [0, 3.9, 0], kind: 'balloon' }; return g; }
function makePlane() { const g = new THREE.Group(); toyBase(g, C.green); g.add(cyl(.12, .18, 4.3, M(C.steel), { pos: [0, 2.6, 0], seg: 10 })); g.add(ball(.25, M(C.yellow), { pos: [0, 4.8, 0], seg: 10 }));
  const orbit = new THREE.Group(); orbit.position.y = 4.8; g.add(orbit); orbit.add(box(3.0, .05, .05, M(C.steel), { pos: [1.5, 0, 0], cast: false }));
  const pl = new THREE.Group(); pl.position.set(3.0, 0, 0); pl.rotation.set(0, Math.PI, .35); orbit.add(pl); const rd = M(C.red, { rough: .35 }), yl = M(C.yellow, { rough: .4 });
  pl.add(rbox(.75, .75, 2.5, .32, rd)); pl.add(cyl(.12, .36, .5, yl, { pos: [0, 0, 1.45], rot: [Math.PI / 2, 0, 0] })); const prop = box(1.6, .14, .06, M('#2b3350'), { pos: [0, 0, 1.75] }); pl.add(prop);
  pl.add(box(3.6, .1, .85, yl, { pos: [0, .12, .3] })); pl.add(box(1.4, .08, .5, yl, { pos: [0, .1, -1.05] })); pl.add(box(.08, .65, .5, M(C.blue), { pos: [0, .42, -1.05] })); pl.add(ball(.32, M('#6fd6ff', { rough: .15 }), { pos: [0, .42, .25], seg: 10 }));
  for (const s of [-1, 1]) pl.add(ball(.2, M(C.dark), { pos: [s * .42, -.52, .5], seg: 8, seg2: 6 }));
  g.userData = { orbit, prop, kind: 'plane' }; return g; }
const TOYS = [makeWaterGun(), makeRobot(), makeBalloon(), makePlane(), makeWaterGun(), makeRobot(), makeBalloon()];
const mDrop = M('#8fe1ff', { rough: .1, emissive: '#2a9dff', emissiveI: .9 }), mBolt = M('#fff7b0', { emissive: '#ffd23f', emissiveI: 2 }), PCOL = [C.red, C.blue, C.green, C.orange];
TOYS.forEach((g, k) => { world.add(g); const u = g.userData, pr = [];
  if (u.kind === 'water') { for (let j = 0; j < 12; j++) pr.push(ball(.26, mDrop, { seg: 8, seg2: 6, cast: false })); u.splash = glow('#c9f1ff', 2.4, .9); world.add(u.splash); }
  else if (u.kind === 'robot') for (let j = 0; j < 2; j++) { const b = ball(.26, mBolt, { seg: 8, seg2: 6, cast: false }); b.add(glow('#ffe27a', 1.8, .9)); pr.push(b); }
  else if (u.kind === 'balloon') for (let j = 0; j < 2; j++) pr.push(ball(.42, M(PCOL[(k + j) % 4], { rough: .3 }), { seg: 12, seg2: 8 }));
  else for (let j = 0; j < 2; j++) pr.push(ball(.24, M(C.orange, { emissive: C.orange, emissiveI: .8 }), { seg: 8, seg2: 6, cast: false }));
  pr.forEach(p => { p.visible = false; world.add(p); }); u.pr = pr; });

// ====================================================================== mise en scène (qui est posé, quand)
const ALL = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
const BOSSSET = { 0: {}, 1: {}, 2: {}, 3: { x: -1.5, z: 14 }, 4: { x: -.5, z: 25 }, 5: { x: 11, z: 27 }, 6: { x: 10.8, z: 19.5 } };
const SHOTS = [
  { n: 'hook', a: 0, toys: {} },
  { n: 'place', a: T.place, toys: { 0: { drop: T.place + .4 }, 2: { drop: T.place + 1.35 }, 1: { drop: T.place + 2.3 } } },
  { n: 'auto', a: T.auto, toys: { 0: {}, 1: {}, 2: {} } },
  { n: 'up', a: T.up, toys: { 0: {}, 1: {}, 2: {}, 3: {} } },
  { n: 'coop', a: T.coop, toys: ALL }, { n: 'waves', a: T.waves, toys: ALL },
  { n: 'boss', a: T.boss, toys: BOSSSET }, { n: 'win', a: T.win, toys: BOSSSET }, { n: 'end', a: T.end, toys: BOSSSET }];
const shotAt = t => { let s = SHOTS[0]; for (const x of SHOTS) if (t >= x.a) s = x; return s; };
const toyXZ = (k, st) => [st?.x ?? TOYPOS[k][0], st?.z ?? TOYPOS[k][1]];
const toyFrom = st => st.drop != null ? st.drop + .55 : -1;

// Vagues d'insectes : position = fonction du temps ; instant de disparition calculé une fois (quand un jouet actif les a à portée).
const _p = new THREE.Vector3();
function scenario(a, b, n, d0, speed, toys, kdelay) {
  const s = { a, b, n, speed, d0: [], kt: [], kp: [] };
  for (let i = 0; i < NI; i++) {
    if (i >= n) { s.d0.push(-1e9); s.kt.push(Infinity); s.kp.push(null); continue; }
    const start = d0(i); let kt = Infinity, kp = null;
    if (toys) for (let tk = a + kdelay(i); tk < b + 4; tk += .06) {
      const d = start + speed * (tk - a); if (d < 3) continue; if (d > L - 1) break; pathAt(d, _p); let ok = false;
      for (const k in toys) { if (tk < toyFrom(toys[k])) continue; const [x, z] = toyXZ(k, toys[k]); if (Math.hypot(_p.x - x, _p.z - z) < RANGE * .86) { ok = true; break; } }
      if (ok) { kt = tk; kp = _p.clone(); break; }
    }
    s.d0.push(start); s.kt.push(kt); s.kp.push(kp);
  }
  return s;
}
const D_BOSS0 = nearestD(5, 16.5), BOSS_SPEED = 1.35;
const SCN = [
  scenario(0, T.auto, 18, i => nearestD(-6, -25) - i * 3.1, 3.4, SHOTS[1].toys, i => T.place + 1.0 + i * .42),
  scenario(T.auto, T.up, 20, i => nearestD(6, -4.5) - i * 2.7, 3.0, SHOTS[2].toys, i => .45 + i * .4),
  scenario(T.up, T.coop, 14, i => nearestD(-6, 11.5) - i * 3.0, 2.6, SHOTS[3].toys, i => .7 + i * .55),
  scenario(T.coop, T.waves, 30, i => L - 5 - i * 2.8, 3.0, ALL, i => .3 + hash(i * 7) * 3.6),
  scenario(T.waves, T.boss, 36, i => L - 3 - i * 2.35, 5.0, ALL, i => .3 + hash(i * 3) * 3.4),
  scenario(T.boss, T.win, 6, i => D_BOSS0 - 6.5 - i * 2.3, BOSS_SPEED, BOSSSET, i => 1.0 + i * .5),
];
const scnAt = t => SCN.find(s => t >= s.a && t < s.b);

// ====================================================================== bruitages
cue(0.02, 'whoosh'); cue(.15, 'impact', .9); for (let i = 0; i < 6; i++) cue(.5 + i * .5, 'tick', .5); cue(T.place - .25, 'whoosh', .8);
for (const k of [0, 2, 1]) { const d = SHOTS[1].toys[k].drop; cue(d - .05, 'slide', .6); cue(d + .18, 'thud', .9); cue(d + .3, 'boing', .6); }
cue(T.place + 1.1, 'splash', .7); cue(T.place + 2.6, 'splash', .6); cue(T.place + 3.1, 'laser', .5);
cue(T.auto, 'impact', .8); for (let i = 0; i < 7; i++) { cue(T.auto + .5 + i * .45, i % 2 ? 'pop' : 'splash', .6); } cue(T.auto + 3.0, 'coin', .9); cue(T.auto + 3.12, 'coin', .7);
cue(T.up - .2, 'swish'); cue(T.up + .3, 'click', .7); cue(T.up + .45, 'click', .7); cue(T.up + .6, 'click', .7); cue(T_UP, 'powerup'); cue(T_UP + .1, 'ding', .8); cue(T_UP + .9, 'laser', .6); cue(T_UP + 1.4, 'laser', .6);
cue(T.coop - .2, 'whoosh'); cue(T.coop, 'pop'); cue(T.coop + .5, 'crowd', .5, 2.5); cue(T.coop + 1.2, 'pop', .6); cue(T.coop + 2.2, 'splash', .6);
cue(T.waves - .3, 'riser', .7, .5); cue(T.waves, 'impact'); for (let i = 0; i < 9; i++) cue(T.waves + .3 + i * .38, ['pop', 'laser', 'splash'][i % 3], .5); cue(T.boss - .9, 'riser', .9, .9);
cue(T.boss, 'boom'); for (let i = 1; i < 4; i++) cue(T.boss + i * .952, 'thud', 1); cue(T.boss + .3, 'horn', .6); for (let i = 0; i < 6; i++) cue(T.boss + 1 + i * .45, i % 2 ? 'laser' : 'splash', .45);
cue(T.win - .12, 'zap', .8); cue(T.win, 'boom'); cue(T.win + .1, 'win'); cue(T.win + .5, 'crowd', .7, 1.4); for (let i = 0; i < 4; i++) cue(T.win + .4 + i * .15, 'coin', .7);
cue(T.end - .15, 'whoosh'); cue(T.end + .15, 'impact', .9); cue(T.end + .95, 'pop'); cue(T.end + 1.4, 'chime', .8);

// ====================================================================== rendu
const _v = new THREE.Vector3();
let _sx = 0, _sy = 0;
function scr(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x + 1) * W / 2 + _sx, (1 - _v.y) * H / 2 + _sy]; }
function coin2D(x, y, r) { ctx.fillStyle = '#b97800'; ctx.beginPath(); ctx.arc(x, y + r * .12, r, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff3a8'; ctx.beginPath(); ctx.arc(x, y, r * .62, 0, 7); ctx.fill(); ctx.fillStyle = '#e0a400'; ctx.beginPath(); ctx.arc(x, y, r * .3, 0, 7); ctx.fill(); }
function burst2D(x, y, k, col = '#ffffff') { ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 1 - k; const r = 26 + 80 * ease.out(k); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 12 * (1 - k) + 2;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .45, Math.sin(a) * r * .45); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
  ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.arc(0, 0, 22 * (1 - k), 0, 7); ctx.fill(); ctx.restore(); }
function hud(t, wave, coins, a = 1) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
  pill(`VAGUE ${wave} / 20`, 290, 285, { size: 50, bg: '#1d3b24', color: '#ffffff', border: '#9bf07a', borderW: 5, font: 'Luckiest' });
  const w = pill('      ' + coins, 800, 285, { size: 50, bg: '#1d3b24', color: '#ffd23f', border: '#ffd23f', borderW: 5, font: 'Luckiest' }); coin2D(800 - w / 2 + 62, 285, 27); ctx.restore(); }
function card(x, y, k, col, icon, sel, dim) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k * (1 + sel * .12), k * (1 + sel * .12)); ctx.globalAlpha = 1 - dim * .55; const w = 262, h = 290;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-w / 2, -h / 2 + 12, w, h, 34); ctx.fill(); ctx.fillStyle = col; roundRect(-w / 2, -h / 2, w, h, 34); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(-w / 2, -h / 2, w, h * .45, 34); ctx.fill(); ctx.lineWidth = sel > .5 ? 12 : 8; ctx.strokeStyle = sel > .5 ? '#ffd23f' : '#ffffff'; roundRect(-w / 2, -h / 2, w, h, 34); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (icon === 0) { ctx.beginPath(); ctx.moveTo(22, -100); ctx.lineTo(-45, -5); ctx.lineTo(-4, -5); ctx.lineTo(-24, 62); ctx.lineTo(48, -38); ctx.lineTo(6, -38); ctx.closePath(); ctx.fill(); }
  else if (icon === 1) { for (const r of [70, 38]) { ctx.beginPath(); ctx.arc(0, -22, r, 0, 7); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, -22, 12, 0, 7); ctx.fill(); }
  else { for (const dy of [-60, -5]) { ctx.beginPath(); ctx.moveTo(-52, dy + 30); ctx.lineTo(0, dy - 22); ctx.lineTo(52, dy + 30); ctx.stroke(); } }
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 0 || sel > .5 && i === 1 ? '#ffd23f' : 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(-50 + i * 50, 104, 15, 0, 7); ctx.fill(); }
  ctx.restore(); }

const alive = [];
function render(t) {
  const S = shotAt(t), sc = scnAt(t), n = S.n;
  // ---------------- caméra
  let look = [0, 0, 0];
  if (n === 'hook') { const z = lerp(-25, -17, prog(t, 0, T.place, ease.io)); look = [-1.5, 0, z]; camLook(camera, [-1.5 + Math.sin(t * .8) * .6, 27, z + 15], look, 44); }
  else if (n === 'place') { const k = prog(t, T.place, T.auto, ease.io); look = [lerp(4.5, 4, k), 0, lerp(-8, -3, k)]; camLook(camera, [lerp(6, 9, k), lerp(26, 33, k), lerp(8, 20, k)], look, 44); }
  else if (n === 'auto') { const k = inv(T.auto, T.up, t); look = [4.2, 1.2, -8.5]; camLook(camera, [lerp(-7, -4.5, k), lerp(9, 8, k), lerp(4.5, 3, k)], look, 46); }
  else if (n === 'up') { const k = inv(T.up, T.coop, t), a = lerp(.75, 1.05, k); look = [-.6, 2.5, 7.2]; camLook(camera, [look[0] + Math.sin(a) * 14, 6.2, look[2] + Math.cos(a) * 14], look, 42); }
  else if (n === 'coop') { const k = prog(t, T.coop, T.waves, ease.io); look = [-3.5, 0, lerp(8, 6, k)]; camLook(camera, [lerp(-1, -5, k), lerp(40, 44, k), lerp(42, 38, k)], look, 44); }
  else if (n === 'waves') { const z = lerp(-24, 17, inv(T.waves, T.boss, t)); look = [0, 0, z]; camLook(camera, [Math.sin(t * 1.3) * 1.2, 30, z + 13], look, 46); }
  else if (n === 'boss') { const k = inv(T.boss, T.win, t); look = [5, 2.8, lerp(19, 23.5, k)]; camLook(camera, [lerp(7.5, 3.5, k), lerp(5.5, 7.5, k), lerp(40, 42, k)], look, 44); }
  else if (n === 'win') { const k = prog(t, T.win, T.end); look = [5, 2.2, 24]; camLook(camera, [lerp(3.5, 6, k), lerp(7.5, 12, k), lerp(42, 45, k)], look, 44); }
  else { const a = .5 + (t - T.end) * .1; look = [0, 0, 6]; camLook(camera, [Math.sin(a) * 34, 30, 6 + Math.cos(a) * 34], [0, 14, 6], 46); }
  camera.updateMatrixWorld();
  lights.sun.position.set(look[0] + 7, 15, look[2] + 8); lights.sun.target.position.set(look[0], 0, look[2]); lights.sun.target.updateMatrixWorld();
  const sh = [shake(t, T.boss, 24, .5), shake(t, T.boss + .952, 14, .35), shake(t, T.boss + 1.904, 14, .35), shake(t, T.boss + 2.856, 14, .35), shake(t, T.win, 30, .6)];
  _sx = sh.reduce((s, v) => s + v[0], 0); _sy = sh.reduce((s, v) => s + v[1], 0);
  for (const k of [0, 2, 1]) { const d = SHOTS[1].toys[k].drop + .18; const q = shake(t, d, 9, .25); _sx += q[0]; _sy += q[1]; }

  // ---------------- insectes
  alive.length = 0;
  insects.forEach((g, i) => {
    if (!sc) { g.visible = false; return; }
    const d = sc.d0[i] + sc.speed * (t - sc.a), kt = sc.kt[i];
    if (d < 1.2 || d > L - .5 || t > kt + .14) { g.visible = false; return; }
    g.visible = true; pathAt(d, g.position); pathAt(d + .6, _p); g.rotation.set(0, Math.atan2(_p.x - g.position.x, _p.z - g.position.z), Math.sin(t * 9 + i * 2) * .09);
    const ph = t * 14 + i * 1.7; let s = g.userData.s * ease.out(inv(1.2, 3, d));
    if (t > kt) s *= 1 + inv(kt, kt + .14, t) * .5; else alive.push(g);
    g.scale.setScalar(s); g.position.y = Math.abs(Math.sin(ph * .5)) * .14;
    if (g.userData.legs) g.userData.legs.forEach((l, j) => l.rotation.y = Math.sin(ph + j * 2.1) * .4);
    if (g.userData.segs) g.userData.segs.forEach((b, j) => b.position.y = .46 + Math.max(0, Math.sin(ph * .6 - j * 1.1)) * .3);
  });
  // ---------------- reine
  const bossOn = n === 'boss'; queen.visible = bossOn; let bossP = null;
  if (bossOn) { const d = D_BOSS0 + (t - T.boss) * BOSS_SPEED; pathAt(d, queen.position); pathAt(d + 1, _p); queen.rotation.y = Math.atan2(_p.x - queen.position.x, _p.z - queen.position.z);
    const st = (t - T.boss) / .952, f = st - Math.floor(st); queen.userData.body.position.y = Math.sin(Math.min(1, f * 2.2) * Math.PI) * .45; queen.userData.body.rotation.z = Math.sin(st * Math.PI) * .07;
    queen.userData.legs.forEach((l, j) => { l.rotation.y = Math.sin(st * Math.PI * 2 + (j % 2 ? 0 : Math.PI)) * .35; });
    queen.userData.head.rotation.x = Math.sin(t * 5) * .08; const dk = inv(T.win - .25, T.win, t); queen.scale.setScalar(1.05 * (1 + dk * .25)); queen.userData.body.rotation.y = Math.sin(t * 60) * .12 * dk;
    bossP = queen.position; }
  bossGlows.forEach((g, j) => { g.visible = bossOn && t > T.boss + .9; if (g.visible) { const f = Math.floor(t * 12) + j * 17; g.position.set(bossP.x + (hash(f) - .5) * 4.5, 1.5 + hash(f * 3) * 3.5, bossP.z + 1 + hash(f * 5) * 3); g.scale.setScalar(1.5 + hash(f * 7) * 2.5); } });

  // ---------------- jouets
  TOYS.forEach((g, k) => {
    const st = S.toys[k], u = g.userData; u.pr.forEach(p => p.visible = false); if (u.splash) u.splash.visible = false;
    if (!st || (st.drop != null && t < st.drop)) { g.visible = false; return; }
    g.visible = true; const [x, z] = toyXZ(k, st); let y = 0, sy = 1, s = 1;
    if (st.drop != null) { const q = inv(st.drop, st.drop + .55, t); y = (1 - ease.bounce(q)) * 15; sy = 1 - Math.sin(inv(st.drop + .16, st.drop + .45, t) * Math.PI) * .2; }
    if (k === 1 && t >= T_UP) s = 1 + .22 * ease.back(inv(T_UP, T_UP + .4, t));
    if (n === 'win' || n === 'end') y = Math.abs(Math.sin((t - T.win) * 6 + k * 1.3)) * (n === 'win' ? 1.0 : .35);
    g.position.set(x, y, z); g.scale.set(s * (2 - sy), s * sy, s * (2 - sy)); if (u.extra) u.extra.visible = t >= T_UP;
    // cible : l'insecte vivant le plus proche à portée (ou la reine)
    const active = t >= toyFrom(st) && n !== 'win' && n !== 'end'; let tx = 0, ty = .7, tz = 0, has = false;
    if (active && bossP && t > T.boss + .7 && k >= 3) { tx = bossP.x; ty = 2.6; tz = bossP.z + .5; has = true; }
    else if (active) { let bd = RANGE; for (const a of alive) { const d = Math.hypot(a.position.x - x, a.position.z - z); if (d < bd) { bd = d; tx = a.position.x; tz = a.position.z; has = true; } } }
    const yaw = has ? Math.atan2(tx - x, tz - z) : (k * 1.9 + Math.sin(t * 1.1 + k) * .5), cy = Math.cos(yaw), syw = Math.sin(yaw);
    const muz = (m) => [x + (m[0] * cy + m[2] * syw) * s, y + m[1] * s, z + (-m[0] * syw + m[2] * cy) * s];
    if (u.kind === 'water') { u.piv.rotation.y = yaw; u.gun.rotation.x = .1 + (has ? Math.sin(t * 40) * .015 : 0); u.gun.position.z = has ? -.08 - Math.sin(t * 30) * .04 : 0;
      if (has) { const m = muz(u.muzzle); u.pr.forEach((p, j) => { const q = (t * 2.4 + j / 12) % 1; p.visible = true; p.position.set(lerp(m[0], tx, q), lerp(m[1], ty, q) + Math.sin(q * Math.PI) * 1.1, lerp(m[2], tz, q)); p.scale.setScalar(.75 + hash(j * 3) * .6); });
        u.splash.visible = true; u.splash.position.set(tx, ty + .3, tz); u.splash.scale.setScalar(2 + Math.sin(t * 30) * .5); } }
    else if (u.kind === 'robot') { u.piv.rotation.y = yaw; u.key.rotation.z = t * 5; u.head.rotation.y = has ? 0 : Math.sin(t * 2) * .3;
      u.arms.forEach((a, j) => { const q = (t / .5 + j * .5) % 1; a.position.z = has ? -.3 * (1 - inv(0, .25, q)) : 0; if (has && q < .5) { const f = q / .5, m = muz([j ? 1.22 : -1.22, 2.7, 2.3]), p = u.pr[j]; p.visible = true; p.position.set(lerp(m[0], tx, f), lerp(m[1], ty, f), lerp(m[2], tz, f)); } }); }
    else if (u.kind === 'balloon') { const q = (t / .9 + k * .37) % 1; u.bb.rotation.y = t * 1.5; const bump = has ? 1 - inv(0, .3, q) : 0; u.bb.scale.set(1 + bump * .15, 1 - bump * .25, 1 + bump * .15); u.bb.position.y = 2.6 + (has ? Math.sin(inv(.3, .9, q) * Math.PI) * .7 : Math.abs(Math.sin(t * 3 + k)) * .3);
      if (has && q < .65) { const f = q / .65, m = muz(u.muzzle), p = u.pr[0]; p.visible = true; p.position.set(lerp(m[0], tx, f), lerp(m[1], ty, f) + Math.sin(f * Math.PI) * 3, lerp(m[2], tz, f)); } }
    else { const ang = t => t * 2.6 + k; u.orbit.rotation.y = ang(t); u.prop.rotation.z = t * 40;
      if (has) u.pr.forEach((p, j) => { const q = (t / .6 + j * .5) % 1; if (q < .55) { const f = q / .55, a0 = ang(t - q * .6); p.visible = true; p.position.set(lerp(x + Math.cos(a0) * 3, tx, f), lerp(y + 4.6, ty, f * f), lerp(z - Math.sin(a0) * 3, tz, f)); } }); }
  });
  // cercle de portée pendant le placement
  rangeG.visible = false;
  if (n === 'place') for (const k of [0, 2, 1]) { const d = SHOTS[1].toys[k].drop, a = win(t, d - .4, d + .75, .15); if (a > 0) { rangeG.visible = true; rangeG.position.set(TOYPOS[k][0], .14, TOYPOS[k][1]); rangeG.scale.setScalar((.9 + .1 * ease.back(inv(d - .4, d - .1, t))) * (1 + Math.sin(t * 12) * .012)); rangeG.children[0].material.opacity = a * .9; rangeG.children[1].material.opacity = a * .25; } }
  // joueurs
  zoneG.visible = n === 'coop';
  players.forEach((p, i) => {
    p.visible = n === 'coop' || n === 'win' || n === 'end';
    if (!p.visible) return;
    if (n === 'coop') { const k = ease.back(inv(T.coop + .15 + i * .22, T.coop + .5 + i * .22, t)); p.scale.setScalar(.8 * Math.max(.001, k)); p.position.set(PLAYERPOS[i][0], Math.abs(Math.sin(t * 7 + i * 1.6)) * .5, PLAYERPOS[i][1]); p.rotation.y = .1; i % 2 ? poseCheer(p, t + i) : poseIdle(p, t + i); if (!(i % 2)) { p.parts.armR.rotation.set(0, 0, 2.6 + Math.sin(t * 10) * .25); } }
    else { const px = [[1.2, 30], [8.8, 30.5], [-2.8, 32.5], [12.2, 33]][i]; p.scale.setScalar(.8); p.position.set(px[0], Math.abs(Math.sin((t - T.win) * 8 + i * 1.4)) * (n === 'win' ? 1.3 : .5), px[1]); p.rotation.y = Math.PI + (i % 2 ? -.4 : .4) + Math.sin(t * 3 + i) * .3; poseCheer(p, t + i * .4); }
  });
  world.userData.duck.rotation.y = t * .6; world.userData.duck.position.y = 1.1 + Math.sin(t * 2.5) * .05;

  // ---------------- dessin
  if (n === 'boss') bg(['#4a2a8a', '#ff9d6b', '#ffd9a0']); else bg(['#59b7ff', '#c9ecff']);
  draw3D(scene, camera, { dx: _sx, dy: _sy });
  if (n === 'boss') vignette(.6, '40,10,90'); else vignette(.28);

  // éclats quand un insecte est éliminé
  if (sc) for (let i = 0; i < NI; i++) { const kt = sc.kt[i]; if (t >= kt && t < kt + .4) { const p = sc.kp[i], [x, y] = scr(p.x, .8, p.z); burst2D(x, y, (t - kt) / .4, ['#ffffff', '#fff27a', '#9bf07a'][i % 3]); } }

  // ---------------- textes et affichages
  // accroche
  caption(t, .1, 1.85, 'ALERTE AUX\nINSECTES !', { font: 'Luckiest', size: 150, y: 470, anim: 'slam', grad: ['#fff27a', '#ff9d2e'], stroke: '#3a1404', strokeW: 22, lineH: 1.0 });
  caption(t, 1.95, T.place - .12, 'DÉFENDS\nTON JARDIN !', { font: 'Luckiest', size: 140, y: 470, anim: 'pop', color: '#ffffff', stroke: '#14401f', strokeW: 22, lineH: 1.0 });
  if (t < T.place) { const a = .5 + .5 * Math.sin(t * 14); ctx.save(); ctx.globalAlpha = .16 * a * (1 - inv(1.4, 1.9, t)); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  wipe(t, T.place, { color: C.yellow, color2: C.red, dur: .45 });
  // placement
  if (n === 'place') { const dr = [0, 2, 1].map(k => SHOTS[1].toys[k].drop + .18), c = 100 - 30 * inv(dr[0], dr[0] + .2, t) - 30 * inv(dr[1], dr[1] + .2, t) - 30 * inv(dr[2], dr[2] + .2, t); hud(t, 1, Math.round(c), inv(T.place + .2, T.place + .45, t)); }
  caption(t, T.place + .3, T.auto - .15, 'PLACE TES JOUETS', { font: 'Luckiest', size: 96, bg: C.red, anim: 'pop', y: 1340 });
  flash(t, T.auto, .3);
  // attaque automatique
  if (n === 'auto') { const tw = T.auto + 3.0; hud(t, t < tw ? 2 : 3, count(t, tw, tw + .5, 10, 60)); const k = win(t, tw, tw + .75, .12); if (k > 0) { const yy = 390 - prog(t, tw, tw + .75) * 30; ctx.save(); ctx.globalAlpha = k; coin2D(700, yy, 30); ctx.restore(); text('+50', 810, yy, { font: 'Luckiest', size: 72, color: '#ffd23f', stroke: '#3a2a00', strokeW: 14, alpha: k }); } }
  caption(t, T.auto + .3, T.up - .2, 'ILS ATTAQUENT\nTOUT SEULS', { font: 'Luckiest', size: 92, bg: C.blue, anim: 'slide', y: 1330, lineH: 1.05 });
  wipe(t, T.up, { color: C.violet, color2: C.yellow, dur: .45, dir: 'right' });
  // améliorations
  if (n === 'up') { const cs = ['#2f8cff', '#ff5a5a', '#2fbf71']; for (let i = 0; i < 3; i++) { const k = ease.back(inv(T.up + .3 + i * .15, T.up + .6 + i * .15, t)), se = inv(T_UP, T_UP + .2, t); card(250 + i * 290, 450, k, cs[i], i, i === 1 ? se : 0, i === 1 ? 0 : se); }
    if (t > T_UP) { sparkles(t, { n: 30, x: 150, y: 620, w: 780, h: 640, color: '#fff27a', size: 26 }); const k = (t - T_UP) / .5; if (k < 1) { const [x, y] = scr(-.6, 2.8, 7.2); burst2D(x, y, k, '#fff27a'); } } }
  flash(t, T_UP, .3, '255,240,170', .7);
  caption(t, T.up + .35, T.coop - .2, '3 BRANCHES\nD\'AMÉLIORATION', { font: 'Luckiest', size: 88, bg: C.violet, anim: 'pop', y: 1335, lineH: 1.05 });
  wipe(t, T.coop, { color: C.green, color2: C.white, dur: .45 });
  // coopération
  if (n === 'coop') { hud(t, 9, 220, inv(T.coop + .25, T.coop + .5, t)); PLAYERPOS.forEach((p, i) => { const k = ease.back(inv(T.coop + .5 + i * .22, T.coop + .8 + i * .22, t)); if (k > 0) { const [x, y] = scr(p[0], 5.4, p[1]); pill('J' + (i + 1), x, y, { size: 46, bg: ZONES[i][2], color: i === 2 ? '#3a2a00' : '#ffffff', font: 'Luckiest', scale: k, border: '#ffffff', borderW: 5 }); } }); }
  caption(t, T.coop + .35, T.waves - .2, 'DE 1 À 4 JOUEURS', { font: 'Luckiest', size: 96, bg: '#1f9d55', anim: 'pop', y: 1340 });
  flash(t, T.waves, .3);
  // vagues
  if (n === 'waves') { const w = Math.min(19, 10 + Math.floor(inv(T.waves, T.boss - .5, t) * 9.99)); hud(t, w, count(t, T.waves, T.boss, 250, 640));
    const f = (inv(T.waves, T.boss - .5, t) * 9.99) % 1; text('VAGUE ' + w, SAFE.cx, 480, { font: 'Luckiest', size: 150, grad: ['#ffffff', '#b9ffa0'], stroke: '#14401f', strokeW: 22, shadow: 'rgba(0,0,0,.4)', scale: 1 + .18 * (1 - inv(0, .25, f)) }); }
  caption(t, T.waves + .3, T.boss - .25, '20 VAGUES À ARRÊTER', { font: 'Luckiest', size: 84, bg: C.orange, anim: 'slide', y: 1340 });
  // boss
  fade(win(t, T.boss - .12, T.boss + .12, .12), '#1a0838');
  if (n === 'boss') { letterbox(inv(T.boss, T.boss + .3, t) * (1 - inv(T.win - .2, T.win, t)), 190); const a = inv(T.boss + .25, T.boss + .55, t), hp = 1 - .97 * inv(T.boss + .9, T.win - .1, t);
    ctx.save(); ctx.globalAlpha = a; pill('VAGUE 20 / 20', SAFE.cx, 265, { size: 44, bg: '#3a1a7a', color: '#ffffff', border: '#ffd23f', borderW: 5, font: 'Luckiest' });
    bar(170, 330, 740, 58, hp, { color: hp > .35 ? '#ff4d6d' : '#ff9d2e', border: '#ffffff', borderW: 7 }); text('BOSS', SAFE.cx, 361, { font: 'Luckiest', size: 40, color: '#ffffff', stroke: 'rgba(0,0,0,.6)', strokeW: 8 }); ctx.restore();
    caption(t, T.boss + .3, T.win - .15, 'LA REINE SCARABÉE', { font: 'Luckiest', size: 104, y: 1330, anim: 'slam', grad: ['#ffe27a', '#ff8ad0'], stroke: '#2a0e66', strokeW: 22 }); }
  flash(t, T.win, .45);
  // victoire
  if (n === 'win') { const lt = t - T.win, [bx, by] = scr(5, 3, 23.5); if (lt < .6) for (let j = 0; j < 3; j++) burst2D(bx + (j - 1) * 150, by + (j % 2) * 120 - 60, clamp(lt / .6 - j * .12), ['#ffffff', '#ffd23f', '#ff8ad0'][j]);
    ctx.save(); ctx.globalAlpha = 1 - inv(1.4, 1.8, lt); for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (hash(i * 1.9) - .5) * 2.4, v = 500 + hash(i * 4.1) * 900, x = bx + Math.cos(a) * v * lt, y = by + Math.sin(a) * v * lt + 1300 * lt * lt; coin2D(x, y, 22 + hash(i) * 12); } ctx.restore();
    confetti(t, T.win + .05, { cy: 700, n: 130 }); rays(t, { cy: 480, color: 'rgba(255,255,255,.10)' });
    caption(t, T.win + .05, T.end - .1, 'VICTOIRE !', { font: 'Luckiest', size: 190, y: 480, anim: 'slam', grad: ['#fff27a', '#ff9d2e'], stroke: '#3a1404', strokeW: 26 }); }
  wipe(t, T.end, { color: '#1f9d55', color2: C.yellow, dur: .5, dir: 'up' });
  // écran final
  if (n === 'end') { fade(.42, '#0d2e16'); rays(t, { cy: 640, color: 'rgba(255,255,255,.09)' }); sparkles(t, { y: 240, h: 1200, n: 30, color: '#fff7b0' }); confetti(t, T.end + .3, { cy: 520, n: 80, life: 3.6 });
    endCard(t, T.end + .2, { title: 'BACKYARD\nDEFENDERS', tagline: 'Tes jouets contre les insectes !', status: 'bientot', font: 'Luckiest', titleGrad: ['#fff27a', '#ff9d2e'], titleStroke: '#14401f', accent: '#ff4d4d' }); }
}

registerAd({ duration: DURATION, thumbTime: T.boss + 2.2, render,
  music: { style: 'toybox', bpm: 126, seed: 11, sections: [[0, 'build'], [T.place, 'drop'], [T.up, 'break'], [T.coop, 'drop'], [T.boss, 'drop2'], [T.end, 'drop']], end: T.end + 2 * BAR } });
