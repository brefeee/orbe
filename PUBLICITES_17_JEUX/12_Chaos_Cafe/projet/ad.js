// Publicité « Chaos Café » : service chaotique, monstres affamés, coopération. Statut : bientôt.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, noise1, shake, DEG, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseHold, canvasTex, ground, glow, sign, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect,
  text, caption, pill, bar, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Titan', 'Inter']);
const BAR = 240 / 152, BEAT = BAR / 4;      // 152 bpm : une mesure = 1,58 s
const T = { hook: 0, s1: 2 * BAR, s2: 5 * BAR, s3: 8 * BAR, s4: 10 * BAR, s5: 13 * BAR, s6: 15 * BAR, end: 18 * BAR }, DURATION = 22 * BAR;   // 34,7 s
const C = { red: '#e8503a', cream: '#fff3dc', teal: '#1fb6a6', sun: '#ffc23c', wood: '#b9764a', dark: '#3a2318', green: '#6fd44f', purple: '#8f5be0', orange: '#ff8a2b', blue: '#3b9bff', pink: '#ff7eb0' };
const TITAN = 'Titan';

// =====================================================================================
// DÉCOR : le café (construit une seule fois)
// =====================================================================================
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(42);
addLights(scene, { sun: '#fff0d8', sunI: 2.3, sky: '#fff6e8', ground: '#b98f6a', ambI: 1.3, dir: [5, 15, 10], shadowArea: 22, target: [0, 0, 2] });
const set = new THREE.Group(); scene.add(set);

const checker = (a, b) => canvasTex(64, (g, n) => { g.fillStyle = a; g.fillRect(0, 0, n, n); g.fillStyle = b; g.fillRect(0, 0, n / 2, n / 2); g.fillRect(n / 2, n / 2, n / 2, n / 2); }, { repeat: 12 });
const floors = [checker('#fbe9cb', '#e7a877'), checker('#fbe6f0', '#c99be6'), checker('#f0fbf6', '#7fd6c2')].map(tex => { const f = ground(48, '#fff', { tex }); set.add(f); return f; });
const wallMat = new THREE.MeshStandardMaterial({ color: '#ffd49a', roughness: .9 }), wainMat = new THREE.MeshStandardMaterial({ color: C.teal, roughness: .8 });
const CAFES = [['#ffd49a', '#1fb6a6'], ['#ffc2d6', '#8f5be0'], ['#a9ead9', '#e8503a']];   // [mur, soubassement] des cafés montrés
set.add(box(48, 24, .5, wallMat, { pos: [0, 12, -9.75], cast: false }));
set.add(box(48, 3.6, .3, wainMat, { pos: [0, 1.8, -9.4], cast: false }));
set.add(box(48, .3, .5, '#fff3dc', { pos: [0, 3.7, -9.35], cast: false }));
for (const s of [-1, 1]) { set.add(box(.5, 24, 40, wallMat, { pos: [s * 16.25, 12, 8], cast: false })); set.add(box(.3, 3.6, 40, wainMat, { pos: [s * 15.9, 1.8, 8], cast: false })); }

// comptoir rayé
const counter = new THREE.Group(); counter.position.set(-5.5, 0, -4); set.add(counter);
counter.add(rbox(13, 2.6, 2.1, .15, C.wood, { pos: [0, 1.3, 0] }));
counter.add(rbox(13.6, .28, 2.7, .1, '#fff3dc', { pos: [0, 2.74, 0], rough: .4 }));
counter.add(sign(13, 2.3, (g, w, h) => { const n = 13; for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fff3dc' : C.red; g.fillRect(i * w / n, 0, w / n + 1, h); } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, h * .9, w, h * .1); }, { res: 512, pos: [0, 1.25, 1.07] }));
// machine à café
const machine = new THREE.Group(); machine.position.set(1.6, 2.88, -.1); counter.add(machine);
machine.add(rbox(2.4, 1.9, 1.5, .22, C.red, { pos: [0, .95, 0], rough: .35 }));
machine.add(rbox(2.6, .3, 1.7, .12, '#3a3f4a', { pos: [0, 2.0, 0] }));
machine.add(box(1.9, .12, 1.0, '#3a3f4a', { pos: [0, .1, .5] }));
for (const x of [-.5, .5]) { machine.add(cyl(.09, .07, .4, '#dfe6ee', { pos: [x, .95, .82], rough: .3 })); machine.add(ball(.13, C.sun, { pos: [x, 1.55, .78], emissive: '#7a5200', rough: .3 })); }
machine.add(cyl(.34, .34, .08, '#fff3dc', { pos: [0, 1.5, .76], rot: [Math.PI / 2, 0, 0] }));
machine.add(cyl(.5, .5, .5, '#dfe6ee', { pos: [.7, 2.4, 0], rough: .3 })); machine.add(cyl(.42, .5, .35, '#6b3f26', { pos: [.7, 2.8, 0] }));
// caisse, sonnette, pile de tasses
counter.add(rbox(1.5, 1.0, 1.2, .15, '#3a3f4a', { pos: [-3.6, 3.4, 0] })); counter.add(rbox(1.2, .8, .12, .08, '#9fe8ff', { pos: [-3.6, 4.2, -.2], rot: [-.25, 0, 0], emissive: '#2a8fb0' }));
counter.add(cyl(.5, .55, .08, '#3a3f4a', { pos: [-1.2, 2.92, .6] })); { const b = new THREE.Mesh(new THREE.SphereGeometry(.38, 18, 10, 0, 6.283, 0, Math.PI / 2), mat(C.sun, { rough: .25, emissive: '#6a4700' })); b.position.set(-1.2, 2.95, .6); counter.add(b); counter.add(ball(.08, '#fff3dc', { pos: [-1.2, 3.36, .6] })); }
for (let i = 0; i < 4; i++) counter.add(cyl(.3, .24, .34, [C.teal, C.sun, '#ffffff', C.pink][i], { pos: [4.6, 3.06 + i * .3, .1] }));
for (let i = 0; i < 5; i++) counter.add(cyl(.55, .4, .07, '#ffffff', { pos: [-5.6, 2.92 + i * .08, .2] }));

// cuisine : cuisinière, poêle, hotte, frigo
const stove = new THREE.Group(); stove.position.set(8, 0, -7.5); set.add(stove);
stove.add(rbox(3.2, 2.8, 2.4, .12, '#e9eef4', { pos: [0, 1.4, 0], rough: .4 }));
stove.add(box(3.3, .16, 2.5, '#2b2f38', { pos: [0, 2.86, 0] }));
stove.add(rbox(2.3, 1.4, .1, .1, '#2b2f38', { pos: [0, 1.15, 1.2] })); stove.add(rbox(1.7, .8, .06, .08, '#ffb45e', { pos: [0, 1.15, 1.26], emissive: '#a34a00' })); stove.add(box(2.1, .1, .16, '#c9d2dd', { pos: [0, 2.0, 1.32] }));
for (let i = 0; i < 4; i++) stove.add(cyl(.14, .14, .14, C.red, { pos: [-1.05 + i * .7, 2.45, 1.24], rot: [Math.PI / 2, 0, 0] }));
for (const x of [-.8, .8]) stove.add(torus(.5, .07, '#555b66', { pos: [x, 2.96, .1], rot: [Math.PI / 2, 0, 0] }));
const PAN = [7.2, 3.2, -7.4];
stove.add(cyl(.85, .7, .3, '#3a3f4a', { pos: [-.8, 3.12, .1] })); stove.add(box(1.1, .1, .18, '#3a3f4a', { pos: [-1.95, 3.2, .1] }));
stove.add(cyl(.6, .6, .7, C.teal, { pos: [.8, 3.3, .1] })); stove.add(cyl(.64, .64, .08, '#dfe6ee', { pos: [.8, 3.7, .1] })); stove.add(ball(.1, '#3a3f4a', { pos: [.8, 3.82, .1] }));
set.add(box(3.6, 1.1, 2.2, '#c9d2dd', { pos: [8, 9.2, -8.4] })); set.add(box(1.2, 14, 1.2, '#c9d2dd', { pos: [8, 16.7, -8.9], cast: false }));
set.add(rbox(2.6, 6.2, 2.2, .2, '#bfe9f5', { pos: [12.3, 3.1, -8.2], rough: .35 })); set.add(box(.12, 1.6, .12, '#7b8794', { pos: [11.3, 4.4, -7.05] })); set.add(box(2.5, .06, .06, '#7b8794', { pos: [12.3, 2.5, -7.08] }));

// mur du fond : enseigne ronde, ardoise, étagère de tasses, fenêtre, fanions
set.add(cyl(2.55, 2.55, .25, '#fff3dc', { pos: [-5.5, 11.0, -9.35], rot: [Math.PI / 2, 0, 0], cast: false }));
set.add(sign(4.7, 4.7, (g, w) => {
  g.fillStyle = C.red; g.beginPath(); g.arc(w / 2, w / 2, w * .48, 0, 7); g.fill(); g.strokeStyle = C.sun; g.lineWidth = w * .03; g.beginPath(); g.arc(w / 2, w / 2, w * .42, 0, 7); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w * .36, w * .3); g.lineTo(w * .64, w * .3); g.lineTo(w * .6, w * .5); g.lineTo(w * .4, w * .5); g.closePath(); g.fill();
  g.lineWidth = w * .035; g.strokeStyle = '#fff'; g.beginPath(); g.arc(w * .66, w * .39, w * .06, -1.4, 1.4); g.stroke();
  g.lineWidth = w * .02; for (const x of [.44, .5, .56]) { g.beginPath(); g.moveTo(w * x, w * .26); g.quadraticCurveTo(w * (x + .03), w * .21, w * x, w * .16); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `400 ${w * .15}px "Titan"`; g.fillStyle = '#fff'; g.fillText('CHAOS', w / 2, w * .62); g.fillStyle = C.sun; g.fillText('CAFÉ', w / 2, w * .77);
}, { res: 512, pos: [-5.5, 11.0, -9.2] }));
set.add(rbox(3.4, 4.4, .2, .15, '#7a4f2b', { pos: [-11.3, 8.4, -9.4], cast: false }));
set.add(sign(3.0, 4.0, (g, w, h) => {
  g.fillStyle = '#23463c'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `400 ${w * .2}px "Titan"`; g.fillText('MENU', w / 2, h * .16);
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = w * .025; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const y = h * (.28 + i * .11); g.beginPath(); g.arc(w * .16, y, w * .045, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w * .3, y); g.lineTo(w * (.6 + hash(i) * .28), y); g.stroke(); }
}, { res: 256, pos: [-11.3, 8.4, -9.28] }));
set.add(box(5.4, .22, .9, '#7a4f2b', { pos: [-.2, 7.0, -9.1] }));
for (let i = 0; i < 6; i++) { const c = cyl(.32, .25, .5, [C.teal, C.sun, C.pink, '#ffffff', C.blue, C.red][i], { pos: [-2.2 + i * .8, 7.37, -9.1] }); set.add(c); }
set.add(rbox(4.6, 5.2, .25, .2, '#fff3dc', { pos: [2.6, 11.6, -9.4], cast: false }));
set.add(sign(4.0, 4.6, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(1, '#e6f7ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (const [x, y, r] of [[.3, .3, .12], [.45, .27, .15], [.6, .32, .11], [.7, .62, .1], [.82, .6, .12]]) { g.beginPath(); g.arc(w * x, h * y, w * r, 0, 7); g.fill(); } g.fillStyle = '#fff3dc'; g.fillRect(w * .47, 0, w * .06, h); g.fillRect(0, h * .47, w, h * .06); }, { res: 256, emissive: true, pos: [2.6, 11.6, -9.25] }));
for (let i = 0; i < 22; i++) { const f = cone(.55, 1.0, [C.red, C.sun, C.teal, C.pink, C.blue][i % 5], { seg: 3, cast: false }); f.scale.z = .15; f.rotation.set(0, 0, Math.PI); f.position.set(-15 + i * 1.43, 15.6 - Math.abs(Math.sin(i * .9)) * .5, -9.3); set.add(f); }
// lampes suspendues, plantes
for (const [x, z] of [[-6, -1], [0, 0], [6, -1]]) { set.add(cyl(.04, .04, 11, C.dark, { pos: [x, 18.5, z], cast: false })); set.add(cone(1.1, .9, C.red, { pos: [x, 12.7, z], cast: false })); set.add(ball(.35, '#fff6c8', { pos: [x, 12.2, z], emissive: '#ffe9a0', cast: false })); const gl = glow('#ffd98a', 4.5, .5); gl.position.set(x, 12.1, z); set.add(gl); }
for (const [x, z] of [[-13.5, -6], [14, 2], [-14, 9]]) { set.add(cyl(.8, .6, 1.3, C.red, { pos: [x, .65, z] })); for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.1], [-.7, 1.9, .2, .8], [.7, 2.0, -.2, .85], [.1, 3.4, .1, .7]]) set.add(ball(r, '#3fae4a', { pos: [x + dx, dy, z + dz], seg: 10, seg2: 8, flat: true })); }

// =====================================================================================
// ACCESSOIRES : tasse, plat sous cloche, plateau, table
// =====================================================================================
function makeCup(color = '#ffffff') {
  const g = new THREE.Group();
  g.add(cyl(.5, .38, .07, '#ffffff', { pos: [0, .035, 0] })); g.add(cyl(.34, .26, .5, color, { pos: [0, .33, 0], rough: .4 })); g.add(cyl(.3, .3, .03, '#5b3521', { pos: [0, .575, 0], cast: false }));
  g.add(torus(.15, .05, color, { pos: [.38, .33, 0], seg: 14 }));
  g.steam = [0, 1].map(i => { const s = ball(.13, '#ffffff', { opacity: .7, cast: false, seg: 8, seg2: 6 }); g.add(s); return s; });
  return g;
}
function makeCloche() {
  const g = new THREE.Group(); g.add(cyl(.72, .55, .08, '#ffffff', { pos: [0, .04, 0] }));
  const d = new THREE.Mesh(new THREE.SphereGeometry(.56, 20, 10, 0, 6.283, 0, Math.PI / 2), mat('#dfe6ee', { rough: .25, emissive: '#3a4450', emissiveI: .5 })); d.position.y = .08; d.castShadow = true; g.add(d);
  g.add(ball(.1, C.sun, { pos: [0, .7, 0], emissive: '#6a4700' })); return g;
}
function animCup(c, t) { c.steam.forEach((s, i) => { const p = (t * .9 + i * .5) % 1; s.position.set(Math.sin(p * 6 + i) * .1, .7 + p * .8, 0); s.scale.setScalar(.6 + p); s.visible = true; }); }
function makeTray() {
  const g = new THREE.Group(); g.add(cyl(1.05, .95, .1, '#8d99a8', { rough: .4 })); g.add(torus(1.03, .06, '#c9d2dd', { rot: [Math.PI / 2, 0, 0], pos: [0, .06, 0] }));
  g.cup = makeCup(C.sun); g.cup.position.set(-.42, .06, .1); g.cup.scale.setScalar(1.15); g.add(g.cup);
  g.cloche = makeCloche(); g.cloche.position.set(.42, .06, -.1); g.cloche.scale.setScalar(.85); g.add(g.cloche); return g;
}
const TABLE_Y = 2.42;
function makeTable(cloth) {
  const g = new THREE.Group();
  g.add(cyl(1.0, 1.15, .16, C.dark, { pos: [0, .08, 0] })); g.add(cyl(.22, .22, 2.2, C.dark, { pos: [0, 1.2, 0] }));
  g.add(cyl(2.3, 2.3, .18, '#fff3dc', { pos: [0, 2.33, 0], seg: 36 })); g.add(cyl(2.34, 2.5, .5, cloth, { pos: [0, 2.05, 0], seg: 36 }));
  g.add(cyl(.16, .22, .5, '#ffffff', { pos: [.2, TABLE_Y + .25, -.9] })); g.add(ball(.2, C.sun, { pos: [.2, TABLE_Y + .75, -.9], emissive: '#6a4700' })); g.add(cyl(.03, .03, .3, '#3fae4a', { pos: [.2, TABLE_Y + .55, -.9] }));
  g.cup = makeCup('#ffffff'); g.cup.scale.setScalar(1.35); g.cup.position.set(-.5, TABLE_Y, .9); g.add(g.cup);
  g.cloche = makeCloche(); g.cloche.scale.setScalar(1.1); g.cloche.position.set(.5, TABLE_Y, .8); g.add(g.cloche);
  scene.add(g); return g;
}
const tables = [C.red, C.teal, C.sun, C.purple].map(makeTable);

// =====================================================================================
// LES 5 MONSTRES (mignons, pas effrayants) : chacun a .inner .eyes .mouth .armL .armR .h
// =====================================================================================
function eye(r, lidColor) {
  const g = new THREE.Group(); g.add(ball(r, '#ffffff', { rough: .25, cast: false }));
  const pup = new THREE.Group(); g.add(pup);
  const iris = ball(r * .5, '#1b1b22', { rough: .3, cast: false }); iris.scale.z = .45; iris.position.z = r * .8; pup.add(iris);
  const sp = ball(r * .15, '#ffffff', { emissive: '#ffffff', cast: false, seg: 8, seg2: 6 }); sp.position.set(r * .2, r * .22, r * 1.0); pup.add(sp);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.07, 20, 10, 0, Math.PI * 2, 0, Math.PI * .45), mat(lidColor, { rough: .6 })); g.add(lid);
  g.pup = pup; g.lid = lid; return g;
}
function mouthG(w, top = [], bottom = []) {
  const g = new THREE.Group(); const m = ball(w / 2, '#4a0f2a', { rough: .6, cast: false }); m.scale.set(1, .55, .32); g.add(m);
  const tg = ball(w * .24, '#ff6b8e', { rough: .5, cast: false }); tg.scale.set(1, .5, .5); tg.position.set(0, -w * .13, w * .08); g.add(tg);
  const edge = x => .275 * w * Math.sqrt(Math.max(0, 1 - 4 * x * x));
  for (const x of top) { const tt = rbox(w * .14, w * .17, w * .08, w * .03, '#ffffff', { cast: false }); tt.position.set(x * w, edge(x) - w * .08, w * .11); g.add(tt); }
  for (const x of bottom) { const tt = cone(w * .07, w * .17, '#ffffff', { cast: false, seg: 8 }); tt.position.set(x * w, -edge(x) + w * .08, w * .11); g.add(tt); }
  return g;
}
function utensil(kind) {
  const g = new THREE.Group(), m = { rough: .3, emissive: '#56606c', emissiveI: .5 }; g.add(cyl(.07, .07, .9, '#e8eef5', { ...m, pos: [0, .45, 0], seg: 8 }));
  if (kind === 'fork') { g.add(box(.36, .12, .07, '#e8eef5', { ...m, pos: [0, .95, 0] })); for (const x of [-.14, 0, .14]) g.add(box(.07, .42, .07, '#e8eef5', { ...m, pos: [x, 1.2, 0] })); }
  else g.add(rbox(.24, .85, .06, .1, '#e8eef5', { ...m, pos: [0, 1.3, 0] }));
  return g;
}
function arm(len, r, color, tool) {
  const p = new THREE.Group(); p.add(cyl(r, r * .9, len, color, { pos: [0, -len / 2, 0], seg: 10 })); p.add(ball(r * 1.7, color, { pos: [0, -len, 0], seg: 12, seg2: 10 }));
  if (tool) { const u = utensil(tool); u.position.y = -len; u.rotation.x = 1.5; p.add(u); } return p;
}
function monsterBase(h, seed) { const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); g.inner = inner; g.eyes = []; g.h = h; g.seed = seed; scene.add(g); return g; }
function addEye(m, r, lid, x, y, z) { const e = eye(r, lid); e.position.set(x, y, z); m.inner.add(e); m.eyes.push(e); return e; }
function addArms(m, len, r, color, x, y, z, tools) { m.armL = arm(len, r, color, tools && 'fork'); m.armL.position.set(-x, y, z); m.armR = arm(len, r, color, tools && 'knife'); m.armR.position.set(x, y, z); m.inner.add(m.armL, m.armR); }

function makeBlob() {                                   // 1 : la gelée verte à un œil
  const m = monsterBase(3.3, 1), c = C.green, d = '#4fb23a', o = { rough: .3 };
  const b = ball(1.6, c, { ...o, seg: 32, seg2: 24 }); b.scale.set(1, .92, 1); b.position.y = 1.4; m.inner.add(b);
  const base = ball(1.85, c, o); base.scale.set(1, .28, 1); base.position.y = .3; m.inner.add(base);
  m.inner.add(ball(.42, c, { ...o, pos: [.1, 2.85, 0] })); m.inner.add(ball(.26, c, { ...o, pos: [.65, 2.6, .2] })); m.inner.add(ball(.2, c, { ...o, pos: [-.7, 2.5, -.3] }));
  for (const s of [-1, 1]) { m.inner.add(cone(.2, .55, C.sun, { pos: [s * .95, 2.75, .1], rot: [0, 0, -s * .5], seg: 10 })); const ch = ball(.26, '#ff9bb0', { cast: false }); ch.scale.set(1, .6, .3); ch.position.set(s * 1.0, 1.25, 1.2); m.inner.add(ch); }
  for (const [x, y, z, r] of [[-1.2, 1.9, .7, .2], [1.25, 2.0, .5, .16], [-.9, .8, 1.25, .14], [1.3, 1.0, .9, .18]]) { const sp = ball(r, d, { cast: false }); sp.scale.z = .35; sp.position.set(x, y, z); sp.lookAt(0, 1.4, 0); m.inner.add(sp); }
  addEye(m, .64, d, 0, 2.0, 1.2); m.mouth = mouthG(1.5, [-.16, .16]); m.mouth.position.set(0, 1.0, 1.5); m.inner.add(m.mouth);
  addArms(m, .8, .2, c, 1.5, 1.5, .4, false); return m;
}
function makeFur() {                                    // 2 : la boule de poils violette
  const m = monsterBase(4.0, 2), c = C.purple, l = '#a97cf2';
  m.inner.add(ball(1.5, c, { pos: [0, 2.0, 0], seg: 28, seg2: 20 }));
  const up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
  for (let i = 0; i < 70; i++) { const y = 1 - (i + .5) / 35, r = Math.sqrt(1 - y * y), a = i * 2.39996; n.set(Math.cos(a) * r, y, Math.sin(a) * r); if (n.z > .5 && n.y > -.55 && n.y < .7) continue;
    const tf = cone(.3, .75, i % 3 ? l : c, { seg: 6, cast: false }); tf.position.set(n.x * 1.55, 2.0 + n.y * 1.55, n.z * 1.55); tf.quaternion.setFromUnitVectors(up, n); m.inner.add(tf); }
  for (const s of [-1, 1]) { m.inner.add(cyl(.18, .18, .6, c, { pos: [s * .65, .45, .1] })); const f = ball(.5, C.orange); f.scale.set(1, .5, 1.5); f.position.set(s * .65, .22, .35); m.inner.add(f);
    m.inner.add(cone(.3, 1.0, '#fff3dc', { pos: [s * 1.0, 3.45, .2], rot: [0, 0, -s * .55], seg: 12 })); }
  addEye(m, .44, c, -.52, 2.45, 1.22); addEye(m, .44, c, .52, 2.45, 1.22);
  m.inner.add(ball(.17, '#ff9bb0', { pos: [0, 2.05, 1.5], cast: false })); m.mouth = mouthG(1.05, [-.12]); m.mouth.position.set(0, 1.5, 1.36); m.mouth.rotation.x = .3; m.inner.add(m.mouth);
  addArms(m, 1.25, .16, c, 1.5, 2.2, .3, true); return m;
}
function makeCyclops() {                                // 3 : le grand cyclope orange à antennes
  const m = monsterBase(5.0, 3), c = C.orange, d = '#e0661a';
  m.inner.add(cyl(1.15, 1.3, 2.3, c, { pos: [0, 1.95, 0], seg: 28 })); m.inner.add(ball(1.15, c, { pos: [0, 3.1, 0], seg: 28, seg2: 20 }));
  const bt = ball(1.3, c); bt.scale.set(1, .5, 1); bt.position.y = .8; m.inner.add(bt);
  const belly = ball(.95, '#ffe0a8', { cast: false }); belly.scale.set(1, 1.15, .3); belly.position.set(0, 1.55, 1.02); m.inner.add(belly);
  for (const s of [-1, 1]) { m.inner.add(cyl(.28, .28, .6, c, { pos: [s * .55, .3, 0] })); const f = ball(.42, d); f.scale.set(1, .5, 1.4); f.position.set(s * .55, .2, .3); m.inner.add(f);
    m.inner.add(cyl(.05, .05, 1.0, d, { pos: [s * .5, 4.55, 0], rot: [0, 0, -s * .3], seg: 6 })); m.inner.add(ball(.2, C.sun, { pos: [s * .65, 5.05, 0], emissive: '#7a5200' }));
    for (const [y, z] of [[2.6, -.2], [1.6, .2]]) { const sp = ball(.24, d, { cast: false }); sp.scale.x = .3; sp.position.set(s * 1.2, y, z); m.inner.add(sp); } }
  addEye(m, .72, d, 0, 3.3, .82); m.mouth = mouthG(1.3, [-.27, -.09, .09, .27]); m.mouth.position.set(0, 2.3, 1.14); m.inner.add(m.mouth);
  addArms(m, 1.8, .17, c, 1.35, 2.9, .1, true); return m;
}
function makeTri() {                                    // 4 : le gros bleu à trois yeux sur tiges
  const m = monsterBase(4.7, 4), c = C.blue, l = '#86c6ff', d = '#2277d6';
  m.inner.add(rbox(3.4, 2.4, 2.4, .9, c, { pos: [0, 1.7, 0] }));
  for (const [x, z] of [[-1, .6], [1, .6], [-1, -.6], [1, -.6]]) { m.inner.add(cyl(.3, .26, .6, d, { pos: [x, .3, z] })); }
  [[-1.05, .8], [0, 1.35], [1.05, .8]].forEach(([x, hh]) => { m.inner.add(cyl(.12, .17, hh + .3, c, { pos: [x, 2.75 + hh / 2, .3], seg: 10 })); addEye(m, .44, d, x, 2.95 + hh, .4); });
  for (const [x, y, r] of [[-1.25, 2.45, .22], [1.2, 2.5, .28], [1.35, .95, .18], [-1.35, 1.0, .15]]) { const sp = cyl(r, r, .04, l, { cast: false, pos: [x, y, 1.21], rot: [Math.PI / 2, 0, 0] }); m.inner.add(sp); }
  m.mouth = mouthG(2.3, [-.32, -.16, 0, .16, .32], [-.24, .24]); m.mouth.position.set(0, 1.55, 1.2); m.inner.add(m.mouth);
  m.inner.add(cone(.4, 1.2, d, { pos: [0, 1.4, -1.5], rot: [-1.9, 0, 0], seg: 10 }));
  addArms(m, 1.15, .2, c, 1.85, 2.0, .3, true); return m;
}
function makePink() {                                   // 5 : la petite rose volante à pois
  const m = monsterBase(3.4, 5), c = C.pink, l = '#ffc4dc', d = '#e85a94'; m.float = true;
  m.inner.add(ball(1.15, c, { pos: [0, 1.4, 0], seg: 28, seg2: 20 }));
  for (let i = 0; i < 12; i++) { const y = 1 - (i + .5) / 6, r = Math.sqrt(1 - y * y), a = i * 2.39996 + 1; const nx = Math.cos(a) * r, nz = Math.sin(a) * r; if (nz > .45 && Math.abs(y) < .6) continue; const sp = ball(.2, l, { cast: false, seg: 10, seg2: 8 }); sp.scale.z = .3; sp.position.set(nx * 1.13, 1.4 + y * 1.13, nz * 1.13); sp.lookAt(0, 1.4, 0); m.inner.add(sp); }
  m.wings = [];
  for (const s of [-1, 1]) {
    const e = cone(.45, 1.1, c, { seg: 12 }); e.scale.z = .45; e.position.set(s * .8, 2.55, 0); e.rotation.z = -s * .5; m.inner.add(e);
    const ei = cone(.26, .7, l, { seg: 12, cast: false }); ei.scale.z = .3; ei.position.set(s * .78, 2.5, .16); ei.rotation.z = -s * .5; m.inner.add(ei);
    const wp = new THREE.Group(); wp.position.set(s * .8, 1.7, -.75); const w = cone(.6, 1.5, '#b05cff', { seg: 3 }); w.scale.z = .2; w.rotation.z = -s * 1.75; w.position.x = s * .75; wp.add(w); m.inner.add(wp); m.wings.push(wp);
    const f = ball(.24, d); f.scale.set(1, .6, 1.3); f.position.set(s * .42, .28, .25); m.inner.add(f);
    const ch = ball(.17, '#ff4f86', { cast: false }); ch.scale.z = .3; ch.position.set(s * .72, 1.2, .86); m.inner.add(ch);
  }
  addEye(m, .4, d, -.44, 1.7, .9); addEye(m, .4, d, .44, 1.7, .9);
  m.mouth = mouthG(.72, [.12]); m.mouth.position.set(0, 1.02, 1.08); m.mouth.rotation.x = .25; m.inner.add(m.mouth);
  addArms(m, .55, .13, c, 1.05, 1.35, .45, false); return m;
}
const M = { blob: makeBlob(), fur: makeFur(), cyc: makeCyclops(), tri: makeTri(), pink: makePink() };
const monsters = [M.blob, M.fur, M.cyc, M.tri, M.pink];

/** Humeurs : 'hungry' (tape sur la table), 'angry' (s'impatiente), 'happy' (saute de joie), 'idle'. */
function animM(m, t, mood, look = [0, 0]) {
  const s = m.seed * 1.7; let sq = Math.sin(t * 3 + s) * .03, mo = .35, lid = -.62, jump = 0, shx = 0, aL = [0, 0, -.3], aR = [0, 0, .3];
  if (mood === 'hungry') { sq = Math.sin(t * 11 + s) * .06; mo = .65 + .35 * Math.sin(t * 9 + s); lid = -.5; aL = [-1.45 + Math.sin(t * 15 + s) * .5, 0, -.15]; aR = [-1.45 - Math.sin(t * 15 + s) * .5, 0, .15]; }
  else if (mood === 'angry') { sq = Math.sin(t * 16 + s) * .05; shx = Math.sin(t * 38 + s) * .08; mo = .55 + .3 * Math.sin(t * 20); lid = -.15; aL = [-1.45 + Math.sin(t * 22 + s) * .6, 0, -.15]; aR = [-1.45 - Math.sin(t * 22 + s) * .6, 0, .15]; }
  else if (mood === 'happy') { jump = Math.abs(Math.sin(t * 7 + s)) * .7; sq = Math.sin(t * 14 + s) * .05; mo = 1.05; lid = -.85; const w = Math.sin(t * 12 + s) * .25; aL = [0, 0, -2.5 + w]; aR = [0, 0, 2.5 - w]; }
  m.inner.scale.set(1 - sq * .6, 1 + sq, 1 - sq * .6); m.inner.position.set(shx, jump + (m.float ? .75 + Math.sin(t * 3.2) * .2 : 0), 0);
  m.mouth.scale.set(1, Math.max(.12, mo), 1); m.armL.rotation.set(...aL); m.armR.rotation.set(...aR);
  const blink = (t * .45 + m.seed * .37) % 1 > .96;
  for (const e of m.eyes) { e.lid.rotation.x = blink ? .35 : lid; e.pup.rotation.set(-look[1], look[0], 0); }
  if (m.wings) m.wings.forEach((w, i) => w.rotation.y = (i ? -1 : 1) * Math.sin(t * 22) * .6);
}
function put(m, x, y, z, ry = 0, sc = 1) { m.visible = true; m.position.set(x, y, z); m.rotation.set(0, ry, 0); m.scale.setScalar(sc); }

// =====================================================================================
// SERVEURS EN BLOCS, ROBOT ASSISTANT, FEU, EXTINCTEUR
// =====================================================================================
function makeServer(o) {
  const ch = makeCharacter(o);
  const ap = rbox(1.72, 1.75, .14, .1, '#ffffff'); ap.position.set(0, -.12, .5); ch.parts.torso.add(ap);
  const pk = rbox(.8, .5, .06, .08, o.hatColor ?? C.red); pk.position.set(0, -.45, .6); ch.parts.torso.add(pk);
  ch.tray = makeTray(); ch.tray.position.set(1.5, 6.12, .5); ch.add(ch.tray); scene.add(ch); return ch;
}
const servers = [
  makeServer({ shirt: C.red, pants: '#2b3350', hat: 'chef', face: 'happy', hatColor: C.red }),
  makeServer({ shirt: C.teal, pants: '#3a2318', hat: 'cap', hatColor: C.sun, face: 'smile', skin: '#c98a5e' }),
  makeServer({ shirt: C.sun, pants: '#2b3350', hair: '#5a2d1a', face: 'happy', hatColor: C.teal, skin: '#f7d2b0' }),
  makeServer({ shirt: C.purple, pants: '#2b3350', hat: 'cap', hatColor: C.pink, face: 'smile', skin: '#8d5a3b' }),
];
// extincteur tenu à deux mains par le serveur 0
const ext = new THREE.Group(); ext.add(cyl(.42, .42, 1.5, '#e02b2b', { rot: [Math.PI / 2, 0, 0], rough: .35 })); ext.add(cyl(.44, .44, .4, '#ffffff', { rot: [Math.PI / 2, 0, 0] }));
ext.add(cyl(.2, .3, .3, '#2b2f38', { rot: [Math.PI / 2, 0, 0], pos: [0, 0, .9] })); ext.add(cone(.26, .7, '#2b2f38', { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, 1.35] })); ext.add(box(.16, .5, .5, '#2b2f38', { pos: [0, .5, -.3] }));
ext.position.set(0, 3.75, 1.75); servers[0].add(ext);

function animServer(ch, t, moving, mode) {                 // mode : 'tray' | 'ext' | 'cheer' | 'work' | 'idle'
  const ph = t * 15 + ch.id; ch.tray.visible = mode === 'tray'; if (ch === servers[0]) ext.visible = mode === 'ext';
  if (mode === 'cheer') { poseCheer(ch, t + ch.id); return; }
  if (moving) { poseWalk(ch, ph, .85); ch.position.y = Math.abs(Math.sin(ph)) * .28; } else { poseIdle(ch, t); ch.position.y = 0; }
  if (mode === 'tray') { ch.parts.armR.rotation.set(-2.9, 0, 0); ch.tray.rotation.set(Math.sin(ph * .5) * (moving ? .09 : .02), 0, Math.cos(ph * .5) * (moving ? .09 : .02)); animCup(ch.tray.cup, t); }
  if (mode === 'ext') poseHold(ch, 1);
  if (mode === 'work') { ch.parts.armL.rotation.set(-1.2 + Math.sin(t * 9) * .35, 0, 0); ch.parts.armR.rotation.set(-1.2 - Math.sin(t * 9) * .35, 0, 0); }
}
/** Trajet par étapes [t, x, z, orientation à l'arrêt] : renvoie { x, z, ry, moving }. */
function along(t, pts) {
  let i = 0; while (i < pts.length - 2 && t > pts[i + 1][0]) i++; const a = pts[i], b = pts[i + 1], k = inv(a[0], b[0], t);
  const dx = b[1] - a[1], dz = b[2] - a[2], moving = t >= a[0] && t < b[0] && dx * dx + dz * dz > .01;
  let ry = Math.atan2(dx, dz); if (!moving) { const hld = t >= b[0] ? b[3] : a[3]; if (hld != null) ry = hld; }
  return { x: lerp(a[1], b[1], k), z: lerp(a[2], b[2], k), ry, moving };
}
function walk(ch, t, pts, mode) { const p = along(t, pts); ch.visible = true; ch.position.set(p.x, 0, p.z); ch.rotation.y = p.ry; animServer(ch, t, p.moving, mode); return p; }

// robot assistant du mode solo
const robot = new THREE.Group(); scene.add(robot);
{
  const w = '#eef3f8', g = '#8d99a8';
  robot.add(ball(.6, '#2b2f38', { pos: [0, .6, 0] })); robot.add(cyl(.34, .34, .3, C.sun, { pos: [0, .6, 0], rot: [0, 0, Math.PI / 2] }));
  robot.add(cyl(.95, .6, .6, g, { pos: [0, 1.25, 0] }));
  robot.body = new THREE.Group(); robot.add(robot.body);
  robot.body.add(rbox(2.0, 1.9, 1.5, .4, w, { pos: [0, 2.45, 0], rough: .35 })); robot.body.add(rbox(1.2, .7, .1, .15, C.teal, { pos: [0, 2.5, .76], emissive: '#0b5c54' }));
  for (const [x, c] of [[-.3, C.red], [0, C.sun], [.3, '#ffffff']]) robot.body.add(ball(.1, c, { pos: [x, 2.5, .83], emissive: c, emissiveI: .5, cast: false }));
  for (const s of [-1, 1]) { const b = cone(.3, .5, C.red, { seg: 4, cast: false }); b.scale.z = .4; b.rotation.z = s * Math.PI / 2; b.position.set(s * .3, 3.42, .72); robot.body.add(b); }
  robot.head = new THREE.Group(); robot.head.position.y = 3.6; robot.body.add(robot.head);
  robot.head.add(rbox(1.9, 1.35, 1.45, .4, w, { pos: [0, .75, 0], rough: .35 }));
  robot.head.add(sign(1.5, .95, (c, ww, hh) => { c.fillStyle = '#12202c'; c.beginPath(); c.roundRect(0, 0, ww, hh, hh * .25); c.fill(); c.fillStyle = '#5ff2ff'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(ww / 2 + s * ww * .22, hh * .42, ww * .09, hh * .2, 0, 0, 7); c.fill(); } c.strokeStyle = '#5ff2ff'; c.lineWidth = hh * .08; c.lineCap = 'round'; c.beginPath(); c.arc(ww / 2, hh * .55, ww * .14, .25, Math.PI - .25); c.stroke(); }, { res: 256, emissive: true, pos: [0, .75, .735] }));
  for (const s of [-1, 1]) robot.head.add(cyl(.22, .22, .2, C.teal, { pos: [s * 1.0, .75, 0], rot: [0, 0, Math.PI / 2] }));
  robot.head.add(cyl(.56, .56, .4, '#ffffff', { pos: [0, 1.6, 0] })); const hat = ball(.7, '#ffffff'); hat.scale.y = .6; hat.position.y = 2.0; robot.head.add(hat);
  robot.head.add(cyl(.04, .04, .6, g, { pos: [.75, 1.6, 0] })); robot.head.add(ball(.14, C.red, { pos: [.75, 1.95, 0], emissive: '#ff2a2a' })); robot.light = glow('#ff5a4a', 1.4, .8); robot.light.position.set(.75, 1.95, 0); robot.head.add(robot.light);
  robot.arms = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 1.15, 3.0, 0); p.add(cyl(.13, .13, 1.4, g, { pos: [0, -.7, 0], seg: 10 })); p.add(ball(.24, C.teal, { pos: [0, -1.4, 0] })); p.add(ball(.2, g, { pos: [0, 0, 0] })); robot.body.add(p); return p; });
  robot.tray = makeTray(); robot.tray.position.set(0, 3.35, 1.55); robot.body.add(robot.tray);
}
function animRobot(t, moving, mode) {
  robot.body.position.y = Math.sin(t * 9) * .06; robot.body.rotation.z = moving ? Math.sin(t * 9) * .05 : 0; robot.head.rotation.y = Math.sin(t * 2.4) * .18; robot.light.material.opacity = .4 + .6 * (Math.sin(t * 14) > 0);
  robot.tray.visible = mode === 'tray';
  if (mode === 'tray') robot.arms.forEach(a => a.rotation.set(-1.5, 0, 0)); else robot.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * (2.5 + Math.sin(t * 13) * .3)));
  animCup(robot.tray.cup, t);
}

// feu sur la cuisinière + jet de l'extincteur
const fire = new THREE.Group(); fire.position.set(...PAN); scene.add(fire);
const flames = []; { const fm = c => new THREE.MeshBasicMaterial({ color: c });
  const defs = [[0, 0, 1.0, 3.2, '#ff4d1a'], [-.75, -.1, .7, 2.3, '#ff4d1a'], [.8, -.1, .75, 2.5, '#ff5a1a'], [1.6, 0, .6, 1.9, '#ff4d1a'], [-.3, .3, .65, 2.3, '#ff9a1a'], [.5, .3, .6, 2.0, '#ff9a1a'], [1.3, .3, .45, 1.5, '#ff9a1a'], [.05, .55, .38, 1.4, '#ffe14d'], [.75, .55, .3, 1.1, '#ffe14d']];
  defs.forEach(([x, z, r, h, c], i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), fm(c)); f.geometry.translate(0, h / 2, 0); f.position.set(x, 0, z); fire.add(f); flames.push(f); }); }
const fireGlow = glow('#ff8a2b', 9, .7); fireGlow.position.set(.3, 1.4, .6); fire.add(fireGlow);
const smokes = []; for (let i = 0; i < 7; i++) { const s = ball(.6, '#59606b', { opacity: .55, cast: false, seg: 10, seg2: 8 }); scene.add(s); smokes.push(s); }
const sprays = []; { const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9 }); for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), sm); scene.add(s); sprays.push(s); } }

// =====================================================================================
// OUTILS 2D : projection, bulles de commande, pièces
// =====================================================================================
const _v = new THREE.Vector3();
function scr(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x * .5 + .5) * W, (-_v.y * .5 + .5) * H]; }
function cup2D(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = C.dark; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(27, 6, 13, -1.3, 1.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-28, -14); ctx.lineTo(28, -14); ctx.lineTo(20, 30); ctx.lineTo(-20, 30); ctx.closePath(); ctx.fillStyle = C.red; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -14, 28, 8, 0, 0, 7); ctx.fillStyle = '#6b3f26'; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#9aa7b5'; ctx.lineWidth = 5; for (const dx of [-10, 10]) { ctx.beginPath(); ctx.moveTo(dx, -30); ctx.quadraticCurveTo(dx + 9, -40, dx, -50); ctx.stroke(); }
  ctx.restore();
}
function heart2D(x, y, s, col = '#ff3d6e') { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 26); ctx.bezierCurveTo(-46, -8, -22, -40, 0, -16); ctx.bezierCurveTo(22, -40, 46, -8, 0, 26); ctx.fill(); ctx.restore(); }
function coin2D(x, y, r) { ctx.fillStyle = '#b8780a'; ctx.beginPath(); ctx.arc(x, y + r * .12, r, 0, 7); ctx.fill(); ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(x, y, r * .62, 0, 7); ctx.fill(); ctx.fillStyle = '#ffc93c'; ctx.beginPath(); ctx.arc(x, y, r * .45, 0, 7); ctx.fill(); }
/** Bulle de commande au-dessus d'un client + barre de patience (p de 0 à 1, ou null). */
function orderBubble(x, y, s, kind, p, k = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * k, s * k);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; roundRect(-70, -132, 140, 120, 34); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = C.dark; ctx.lineWidth = 6; roundRect(-70, -140, 140, 120, 34); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, -23); ctx.lineTo(0, 4); ctx.lineTo(16, -23); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.beginPath(); ctx.moveTo(-16, -21); ctx.lineTo(0, 4); ctx.lineTo(16, -21); ctx.stroke();
  if (kind === 'cup') cup2D(-4, -78, 1.0); else if (kind === 'heart') heart2D(0, -80, 1.25);
  else { ctx.fillStyle = '#dfe6ee'; ctx.strokeStyle = C.dark; ctx.beginPath(); ctx.arc(0, -66, 38, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -108, 7, 0, 7); ctx.fillStyle = C.sun; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-48, -62); ctx.lineTo(48, -62); ctx.stroke(); }
  ctx.restore();
  if (p != null) bar(x - 80 * s, y - 185 * s, 160 * s, 30 * s, p, { color: p > .5 ? '#45f07a' : p > .25 ? '#ffb02e' : '#ff3d3d', borderW: 5 });
}
function coinBurst(t, t0, x0, y0, x1, y1, n = 7) { for (let i = 0; i < n; i++) { const lt = t - t0 - i * .05; if (lt < 0 || lt > .7) continue; const k = ease.io(lt / .7), a = Math.sin(k * Math.PI); coin2D(lerp(x0, x1, k) + a * (hash(i * 3.1) - .5) * 300, lerp(y0, y1, k) - a * 140, 26); } }
function hud(t, level, coins) {
  pill('NIVEAU ' + level, 235, 285, { size: 46, bg: C.dark, color: '#ffffff', border: C.sun, borderW: 5 });
  pill('      ' + coins, 820, 285, { size: 46, bg: C.dark, color: '#ffc93c', border: C.sun, borderW: 5 }); coin2D(758, 285, 24);
}
function warn2D(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.fillStyle = '#ffd400'; ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(78, 60); ctx.lineTo(-78, 60); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1b1b22'; roundRect(-9, -30, 18, 50, 8); ctx.fill(); ctx.beginPath(); ctx.arc(0, 40, 10, 0, 7); ctx.fill(); ctx.restore(); }

// =====================================================================================
// TEMPS FORTS ET BRUITAGES
// =====================================================================================
const TD = T.s2 + 1.5 * BAR;                                   // la tasse est servie
const D = [1, 3, 5, 7].map(b => T.s3 + b * BEAT);              // 4 livraisons du plan « combo »
const SPRAY0 = T.s4 + 1.0 * BAR, FIRE_OUT = T.s4 + 2.5 * BAR;  // extincteur
const TR = T.s5 + 1.2 * BAR;                                   // le robot sert
const PARTY = T.s6 + .5 * BAR;

cue(0.02, 'whoosh'); for (const x of [.25, .65, 1.05]) cue(x, 'tap', .8); cue(1.45, 'impact'); cue(2.2, 'swish', .7);
cue(T.s1, 'impact'); for (let i = 0; i < 5; i++) cue(T.s1 + i * 3 * BAR / 5 + .08, i % 2 ? 'boing' : 'pop', .8);
cue(T.s2 - .2, 'whoosh'); for (const k of [.45, .7, .88]) cue(lerp(T.s2, TD, k), 'tick', .8); cue(TD, 'ding'); cue(TD + .18, 'coin'); cue(TD + .34, 'coin', .8); cue(TD + .7, 'pop', .6);
cue(T.s3 - .2, 'swish'); D.forEach((d, i) => { cue(d, 'ding', .8); cue(d + .1, 'coin', .7 + i * .08); });
cue(T.s4, 'boom'); cue(T.s4 + .12, 'bell'); cue(T.s4 + .6, 'bell', .8); cue(SPRAY0, 'whoosh', 1, 1.2); cue(SPRAY0 + .7, 'whoosh', .7); cue(FIRE_OUT, 'sweepdown'); cue(FIRE_OUT + .1, 'chime');
cue(T.s5 - .2, 'whoosh'); cue(T.s5 + .1, 'zap', .7); cue(T.s5 + .2, 'roll', .6, 1.5); cue(TR, 'ding'); cue(TR + .15, 'coin'); cue(TR + .5, 'powerup', .7);
cue(T.s6 - .3, 'riser', .7, .3); cue(T.s6, 'impact'); cue(PARTY, 'win'); cue(PARTY, 'crowd', .7, 3); cue(PARTY + .05, 'pop'); cue(T.s6 + 1.6 * BAR, 'pop');
cue(T.end, 'impact'); cue(T.end + .15, 'whoosh', .7); cue(T.end + .85, 'pop'); cue(T.end + 1.3, 'chime');

// =====================================================================================
// RENDU
// =====================================================================================
function setCafe(i) { floors.forEach((f, k) => f.visible = k === i); wallMat.color.set(CAFES[i][0]); wainMat.color.set(CAFES[i][1]); }
function tab(i, x, z, cup = false, cloche = false) { const tb = tables[i]; tb.visible = true; tb.position.set(x, 0, z); tb.cup.visible = cup; tb.cloche.visible = cloche; if (cup) animCup(tb.cup, 0); }
const X1 = i => (i - 2) * 5.5;                                  // défilé des 5 monstres
const SEG = 3 * BAR / 5;

function render(t) {
  // ---- remise à zéro (aucune mémoire d'une image à l'autre) ----
  for (const m of monsters) m.visible = false; for (const s of servers) { s.visible = false; s.position.y = 0; } for (const tb of tables) tb.visible = false;
  robot.visible = false; fire.visible = false; for (const s of smokes) s.visible = false; for (const s of sprays) s.visible = false; ext.visible = false;
  const shot = t < T.s1 ? 0 : t < T.s2 ? 1 : t < T.s3 ? 2 : t < T.s4 ? 3 : t < T.s5 ? 4 : t < T.s6 ? 5 : t < T.end ? 6 : 7;
  setCafe(shot === 5 ? 1 : shot >= 6 ? 2 : 0);
  let sx = 0, sy = 0;

  if (shot === 0) {                                           // ACCROCHE : trois monstres affamés tapent sur la table
    tab(0, 0, 5.6);
    put(M.fur, -2.9, .9, 2.3, .28); put(M.cyc, 0, .25, 1.1, 0); put(M.blob, 2.9, .9, 2.3, -.28);
    animM(M.fur, t, 'hungry', [.3, 0]); animM(M.cyc, t, t > 1.45 ? 'angry' : 'hungry'); animM(M.blob, t, 'hungry', [-.3, 0]);
    walk(servers[0], t, [[-.2, -9, -1.3], [1.55, 9, -1.3]], 'tray'); walk(servers[1], t, [[1.2, 9.5, -.6], [3.3, -9, -.6]], 'tray');
    const k = prog(t, 0, T.s1, ease.out);
    camLook(camera, [Math.sin(t * .9) * .8, 7.0 - k * .6, 25.5 - k * 6], [0, 3.9, 3], 42);
    [sx, sy] = shake(t, 1.45, 16, .35);
  } else if (shot === 1) {                                    // PLAN 1 : le défilé des 5 monstres
    const lt = t - T.s1, f = Math.min(4, Math.floor(lt / SEG)), fr = lt / SEG - f;
    const cx = lerp(X1(f), X1(Math.min(4, f + 1)), ease.io(inv(.74, 1, fr)));
    monsters.forEach((m, i) => { put(m, X1(i), 0, 3, 0); const on = i === f; animM(m, t, on ? 'happy' : 'hungry'); if (on) m.inner.position.y += Math.sin(Math.PI * inv(0, .5, fr)) * 1.1; m.rotation.y = on ? Math.sin(t * 5) * .12 : 0; });
    camLook(camera, [cx + 1.6 - fr * .8, 4.9, 18.2 - fr * .9], [cx, 3.0, 3], 40);
  } else if (shot === 2) {                                    // PLAN 2 : servir avant que la patience tombe à zéro
    const served = t >= TD; tab(0, 1.2, 5.3, served, false);
    put(M.blob, 1.2, .9, 1.9, -.12); const p = lerp(1, .1, inv(T.s2, TD, t));
    animM(M.blob, t, served ? 'happy' : p < .45 ? 'angry' : 'hungry', served ? [0, 0] : [-.45, 0]);
    walk(servers[0], t, [[T.s2 - .15, -9.5, 7.6], [TD - .12, -2.5, 6.1, 1.25], [TD + 1.0, -2.5, 6.1, 1.25], [TD + 2.4, -11, 8.5]], 'tray'); servers[0].tray.cup.visible = !served;
    const k = prog(t, T.s2, T.s3, ease.io);
    camLook(camera, [2.8 - k * 1.2, 6.9, 20.5 - k * 1.5], [-.4, 3.7, 4], 42);
    [sx, sy] = shake(t, TD, 10, .25);
  } else if (shot === 3) {                                    // PLAN 3 : quatre tables, les livraisons s'enchaînent (combo)
    const TB = [[-4.4, 0], [4.4, 0], [-4.4, 8], [4.4, 8]], got = [t >= D[0], t >= D[3], t >= D[2], t >= D[1]], cl = [false, false, true, true];
    const who = [M.fur, M.cyc, M.tri, M.pink], when = [D[0], D[3], D[2], D[1]];
    TB.forEach(([x, z], i) => { tab(i, x, z, got[i] && !cl[i], got[i] && cl[i]); put(who[i], x, i === 1 ? .25 : .9, z - 3.2, x < 0 ? .25 : -.25); animM(who[i], t, got[i] ? 'happy' : (i % 2 ? 'angry' : 'hungry')); });
    walk(servers[0], t, [[T.s3 - .3, -1.4, 5], [D[0] - .05, -1.7, 1.0, -1.57], [D[0] + .12, -1.7, 1.0, -1.57], [D[2] - .05, -1.7, 9.0, -1.57], [D[2] + .15, -1.7, 9.0, -1.57], [T.s4 + .3, -1.2, 16]], 'tray');
    walk(servers[1], t, [[T.s3 - .3, 1.4, 15], [D[1] - .05, 1.7, 9.0, 1.57], [D[1] + .12, 1.7, 9.0, 1.57], [D[3] - .05, 1.7, 1.0, 1.57], [T.s4, 1.7, 1.0, 1.57]], 'tray');
    servers[0].tray.cup.visible = !got[0]; servers[0].tray.cloche.visible = !got[2]; servers[1].tray.cloche.visible = !got[3]; servers[1].tray.cup.visible = !got[1];
    const k = prog(t, T.s3, T.s4, ease.io);
    camLook(camera, [0, 23 - k * 1.5, 27 - k * 1.5], [0, 1.6, 3.4], 44);
    for (const d of D) { const s = shake(t, d, 9, .2); sx += s[0]; sy += s[1]; }
  } else if (shot === 4) {                                    // PLAN 4 : imprévu ! le feu sur la cuisinière
    const ry = 1.86, fk = 1 - prog(t, SPRAY0 + .3, FIRE_OUT, ease.io), out = t > FIRE_OUT + .1;
    walk(servers[0], t, [[T.s4 - .1, .2, 3.2], [T.s4 + .85 * BAR, 2.2, -5.4, ry], [T.s5, 2.2, -5.4, ry]], out ? 'cheer' : 'ext'); if (out) servers[0].position.y = Math.abs(Math.sin((t - FIRE_OUT) * 8)) * .7;
    put(M.pink, 5.0, 0, -1.2, -2.2, .9); animM(M.pink, t, out ? 'happy' : 'angry'); M.pink.position.x += out ? 0 : Math.sin(t * 9) * .5;
    fire.visible = fk > .02; fire.scale.setScalar(.25 + .75 * fk * (inv(T.s4 - .3, T.s4 + .4, t) * .25 + .75));
    flames.forEach((f, i) => { f.scale.set(1 + (noise1(t * 7, i) - .5) * .5, .7 + noise1(t * 9, i + 20) * .7, 1); f.rotation.z = (noise1(t * 6, i + 40) - .5) * .5; });
    fireGlow.material.opacity = .5 + .3 * noise1(t * 12, 3);
    smokes.forEach((s, i) => { const p = (t * .55 + i / 7) % 1; s.visible = true; s.position.set(PAN[0] + .4 + Math.sin(p * 5 + i) * .7, PAN[1] + 2.2 + p * 5.5, PAN[2] + .3); s.scale.setScalar((.5 + p * 1.5) * (out ? 1.2 * (1 - inv(FIRE_OUT, T.s5, t)) + .01 : .5 + fk * .5)); });
    if (t > SPRAY0 && t < FIRE_OUT + .15) { const nz = [2.2 + Math.sin(ry) * 3.3, 3.75, -5.4 + Math.cos(ry) * 3.3]; sprays.forEach((s, i) => { const p = (t * 2.6 + i / 18) % 1; s.visible = true; s.position.set(lerp(nz[0], PAN[0] + .4, p) + (hash(i * 2.3) - .5) * p * 1.2, lerp(nz[1], PAN[1] + .9, p) + Math.sin(p * Math.PI) * .5 + (hash(i * 4.1) - .5) * p * 1.4, lerp(nz[2], PAN[2] + .4, p) + (hash(i * 6.7) - .5) * p); s.scale.setScalar(.5 + p * 1.8); }); }
    const k = prog(t, T.s4, T.s5, ease.io);
    camLook(camera, [3.2 + k * .8, 7.6, 14.5 - k * 2.2], [5.0, 4.0, -6.2], 44);
    [sx, sy] = shake(t, T.s4, 26, .5);
  } else if (shot === 5) {                                    // PLAN 5 : en solo, le robot assistant
    const served = t >= TR; tab(0, 1.4, 5.0, served, false);
    put(M.tri, 1.4, .9, 1.6, -.1); animM(M.tri, t, served ? 'happy' : 'hungry', [-.4, 0]);
    const p = along(t, [[T.s5 - .15, -7.5, -.6], [TR - .1, -2.5, 6.3, 1.2], [TR + .45, -2.5, 6.3, 1.2], [TR + .75, -2.5, 6.3, .15], [T.s6, -2.5, 6.3, .15]]);
    robot.visible = true; robot.position.set(p.x, 0, p.z); robot.rotation.y = t > TR + .45 ? lerp(1.2, .15, prog(t, TR + .45, TR + .8, ease.io)) : p.ry; animRobot(t, p.moving, served && t > TR + .5 ? 'cheer' : 'tray'); robot.tray.cup.visible = !served; robot.tray.cloche.visible = false;
    servers[0].visible = true; servers[0].position.set(-3.6, 0, -6.4); servers[0].rotation.y = 0; animServer(servers[0], t, false, 'work');
    const k = prog(t, T.s5, T.s6, ease.io);
    camLook(camera, [-2.2 + k * 1.2, 6.2, 21 - k * 2], [-.7, 3.5, 4], 42);
  } else {                                                    // PLAN 6 + ÉCRAN FINAL : l'équipe de 4 et les 5 monstres font la fête
    const party = t >= PARTY;
    servers.forEach((s, i) => { const x = (i - 1.5) * 2.7, side = i < 2 ? -1 : 1; const p = walk(s, t, [[T.s6 - .1 + i * .03, side * 11, 7.5], [PARTY - .08, x, 6.5, 0], [DURATION + 1, x, 6.5, 0]], party ? 'cheer' : 'tray'); if (party) s.position.y = Math.abs(Math.sin((t - PARTY) * 7 + i * .9)) * 1.1; });
    const MX = [[-4.6, 1.8, M.blob, 1.45], [-2.3, .6, M.fur, 1.4], [0, -.4, M.cyc, 1.35], [2.3, .6, M.tri, 1.3], [4.6, 1.8, M.pink, 1.5]];
    for (const [x, z, m, sc] of MX) { put(m, x, 0, z, -x * .05, sc); animM(m, t + (shot === 7 ? .3 : 0), party ? 'happy' : 'hungry'); }
    if (shot === 6) { const a = lerp(-.32, .2, prog(t, T.s6, T.end, ease.io)); camLook(camera, [Math.sin(a) * 26, 7.8, 5 + Math.cos(a) * 26], [0, 4.4, 4], 42); [sx, sy] = shake(t, PARTY, 14, .3); }
    else { const lt = t - T.end, a = .2 + lt * .035; camLook(camera, [Math.sin(a) * 29, 8.5 + lt * .2, 5 + Math.cos(a) * 29], [0, 10.2, 4], 42); }
  }

  // ---- dessin : fond, 3D, effets ----
  bg(['#3a2318', '#7a4f2b']);
  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(.32);

  // ---- affichages et textes par plan ----
  if (shot === 0) {
    caption(t, .08, 1.4, 'TES CLIENTS ?', { font: TITAN, size: 124, y: 430, anim: 'slam', color: '#ffffff', stroke: C.dark, strokeW: 20, inDur: .18 });
    caption(t, 1.45, T.s1 - .08, 'DES MONSTRES !', { font: TITAN, size: 132, y: 430, anim: 'slam', grad: ['#fff27a', '#ff9d2e'], stroke: C.dark, strokeW: 22, inDur: .16, tilt: -3 });
    caption(t, 1.9, T.s1 - .08, 'Et ils ont TRÈS faim', { bg: C.red, anim: 'pop', size: 70, y: 1340 });
  } else if (shot === 1) {
    const lt = t - T.s1, f = Math.min(4, Math.floor(lt / SEG)), fr = lt / SEG - f;
    pill(`MONSTRE ${f + 1} / 5`, SAFE.cx, 300, { size: 58, bg: [C.green, C.purple, C.orange, C.blue, C.pink][f], color: '#ffffff', border: '#ffffff', borderW: 7, scale: ease.back(inv(0, .25, fr)), font: TITAN });
    caption(t, T.s1 + .15, T.s2 - .1, '5 MONSTRES AFFAMÉS', { font: TITAN, size: 92, y: 1330, anim: 'pop', color: '#ffffff', stroke: C.dark, strokeW: 18 });
  } else if (shot === 2) {
    const served = t >= TD, p = lerp(1, .1, inv(T.s2, TD, t)), [bx, by] = scr(1.2, 5.6, 1.9);
    hud(t, '1', count(t, TD + .2, TD + .9, 0, 12));
    if (!served) { const wob = p < .45 ? Math.sin(t * 40) * 6 : 0; orderBubble(bx + wob, by, 1.25, 'cup', p, ease.back(inv(T.s2 + .1, T.s2 + .4, t))); }
    else { orderBubble(bx, by - ease.out(inv(TD, TD + .5, t)) * 40, 1.25, 'heart', null, ease.back(inv(TD, TD + .25, t)) * (1 - inv(TD + 1.6, TD + 1.9, t))); coinBurst(t, TD + .1, bx, by + 120, 760, 285); }
    caption(t, T.s2 + .25, TD - .05, 'SA PATIENCE FOND…', { font: TITAN, size: 84, y: 1340, anim: 'pop', stroke: C.dark, strokeW: 16 });
    caption(t, TD, T.s3 - .12, 'SERS-LE VITE !', { font: TITAN, size: 104, y: 1340, anim: 'slam', grad: ['#eaffd0', '#45f07a'], stroke: C.dark, strokeW: 18 });
  } else if (shot === 3) {
    const n = D.filter(d => t >= d).length; hud(t, '1', count(t, T.s3, T.s4 - .2, 12, 96));
    const P = [[-4.4, 5.6, -3.2, D[0], 'cup'], [4.4, 6.6, -3.2, D[3], 'cup'], [-4.4, 6.2, 4.8, D[2], 'cl'], [4.4, 5.6, 4.8, D[1], 'cl']];
    for (const [x, y, z, d, kd] of P) { const [bx, by] = scr(x, y, z); if (t < d) orderBubble(bx, by, .8, kd, lerp(.75, .2, inv(T.s3 - 1, d, t))); else if (t < d + .7) { heart2D(bx, by - 60 - (t - d) * 90, 1.3 * ease.back(inv(d, d + .2, t))); coinBurst(t, d, bx, by, 760, 285, 4); } }
    if (n > 0) { const last = D[n - 1], pk = 1 + .5 * (1 - inv(last, last + .22, t)); text('COMBO x' + (n + 1), SAFE.cx, 470, { font: TITAN, size: 130, scale: pk, rot: -.05, grad: n >= 3 ? ['#fff27a', '#ff5a1a'] : ['#ffffff', '#ffc93c'], stroke: C.dark, strokeW: 22, shadow: 'rgba(0,0,0,.45)' }); }
    caption(t, T.s3 + .2, T.s4 - .1, 'ENCHAÎNE LES COMMANDES', { bg: C.teal, anim: 'pop', size: 62, y: 1380 });
  } else if (shot === 4) {
    const burning = t < FIRE_OUT;
    if (burning) { const pl = .5 + .5 * Math.sin(t * 16); vignette(.35 + .25 * pl, '255,40,0'); }
    if (t < T.s4 + BAR) { const k = ease.back(inv(T.s4 + .05, T.s4 + .3, t)); ctx.save(); ctx.translate(SAFE.cx, 430); ctx.rotate(-.04); ctx.scale(k, k); ctx.fillStyle = '#1b1b22'; roundRect(-420, -100, 840, 200, 36); ctx.fill(); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 10; ctx.stroke(); warn2D(-300, -4, .95 + .08 * Math.sin(t * 20)); text('IMPRÉVU !', 70, 4, { font: TITAN, size: 110, color: '#ffd400', maxW: 560 }); ctx.restore(); }
    caption(t, T.s4 + BAR, FIRE_OUT, 'ÉTEINS LE FEU !', { font: TITAN, size: 118, y: 430, anim: 'slam', grad: ['#fff27a', '#ff5a1a'], stroke: C.dark, strokeW: 22 });
    if (!burning) { sparkles(t, { n: 18, x: 300, y: 500, w: 600, h: 500, color: '#ffffff', size: 20 }); caption(t, FIRE_OUT, T.s5 - .1, 'OUF, SAUVÉ !', { font: TITAN, size: 118, y: 430, anim: 'pop', grad: ['#eaffd0', '#45f07a'], stroke: C.dark, strokeW: 22 }); }
  } else if (shot === 5) {
    const [bx, by] = scr(1.4, 6.0, 1.6);
    if (t < TR) orderBubble(bx, by, 1.05, 'cup', lerp(.8, .3, inv(T.s5, TR, t)), ease.back(inv(T.s5 + .1, T.s5 + .35, t))); else if (t < TR + 1) { heart2D(bx, by - 70 - (t - TR) * 80, 1.5 * ease.back(inv(TR, TR + .2, t))); }
    caption(t, T.s5 + .15, T.s5 + 1.15 * BAR, 'TU JOUES EN SOLO ?', { font: TITAN, size: 96, y: 430, anim: 'slam', stroke: C.dark, strokeW: 18 });
    caption(t, T.s5 + 1.15 * BAR, T.s6 - .1, 'UN ROBOT T\'AIDE !', { font: TITAN, size: 108, y: 430, anim: 'slam', grad: ['#d5fbff', '#3fe0ff'], stroke: C.dark, strokeW: 20 });
  } else if (shot === 6) {
    if (t >= PARTY) { speedLines(t, { alpha: .28 * (1 - inv(PARTY, PARTY + 1.2, t)), cy: H * .5 }); confetti(t, PARTY, { n: 130, cy: H * .5, colors: [C.red, C.sun, C.teal, C.pink, C.blue, '#ffffff'] }); confetti(t, T.s6 + 1.6 * BAR, { n: 80, cy: H * .45, power: 1300 }); }
    caption(t, T.s6 + .1, T.s6 + 1.55 * BAR, 'JUSQU\'À 4 JOUEURS', { font: TITAN, size: 108, y: 430, anim: 'slam', grad: ['#fff27a', '#ff9d2e'], stroke: C.dark, strokeW: 20 });
    caption(t, T.s6 + 1.6 * BAR, T.end - .1, '10 NIVEAUX · 4 CAFÉS', { font: TITAN, size: 100, y: 430, anim: 'slam', color: '#ffffff', stroke: C.dark, strokeW: 20 });
    caption(t, T.s6 + 1.75 * BAR, T.end - .1, 'Et un mode détente', { bg: C.purple, anim: 'pop', size: 62, y: 1380 });
  } else {
    const lt = t - T.end; fade(.5 * inv(0, .4, lt), '#2a1230'); rays(t, { cy: 660, color: 'rgba(255,194,60,.13)', n: 14, speed: .2 });
    sparkles(t, { n: 30, y: 230, h: 1000, color: '#fff1a8', size: 16 }); confetti(t, T.end + .2, { n: 90, cy: 500, power: 1300, life: 4.5, colors: [C.red, C.sun, C.teal, C.pink, '#ffffff'] });
    endCard(t, T.end + .15, { title: 'CHAOS CAFÉ', tagline: 'Sers les monstres, survis au chaos !', status: 'bientot', font: TITAN, titleGrad: ['#fff6b8', '#ffb02e'], titleStroke: C.dark, accent: C.red, y: 790 });
  }

  // ---- transitions ----
  flash(t, T.s1, .3);
  wipe(t, T.s2, { color: C.red, color2: C.sun, dur: .42 });
  wipe(t, T.s3, { color: C.teal, color2: '#fff3dc', dir: 'up', dur: .4 });
  flash(t, T.s4, .45, '255,90,20');
  wipe(t, T.s5, { color: '#3fe0ff', color2: C.purple, dir: 'right', dur: .42 });
  flash(t, T.s6, .35);
  flash(t, PARTY, .25, '255,240,180', .6);
  flash(t, T.end, .4);
}

registerAd({
  duration: DURATION, thumbTime: PARTY + .9, render,
  music: { style: 'frantic', bpm: 152, seed: 12, sections: [[0, 'build'], [T.s1, 'drop'], [T.s4, 'break'], [T.s4 + BAR, 'build'], [T.s5, 'drop'], [T.s6, 'drop2']], end: T.end },
});
