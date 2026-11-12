// Publicité « Coinverse » : pièces, argent, victoires, nouvelles pièces débloquées, boosts en échelle (×2 → ×16).
// Animation d'illustration : tout est créé par le code (aucune ressource externe).
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, DEG, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseJump, showOnly, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti,
  text, caption, pill, bar, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['PressStart', 'Inter']);
const BPM = 140, BAR = 240 / BPM;                       // 1,714 s par mesure
const T = { hook: 0, p1: 2 * BAR, p2: 5 * BAR, p3: 8 * BAR, p4: 12 * BAR, p5: 16 * BAR, end: 18 * BAR }, DURATION = 22 * BAR;   // 37,7 s
const PX = 'PressStart';
const C = { night: '#120f3a', violet: '#3b1e7a', gold: '#ffc93c', gold2: '#ff9d1e', green: '#3df07a', cyan: '#3fe0ff', pink: '#ff4d8d', white: '#ffffff', ink: '#0b0a24' };

// ====================================================================== scène 3D (construite une seule fois)
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(42);
addLights(scene, { shadowArea: 24, sunI: 2.5, ambI: 1.25, sky: '#dfe6ff', ground: '#6a5a8a', dir: [7, 13, 10] });

const gold = (c = C.gold, e = .28) => mat(c, { rough: .3, metal: .3, emissive: c, emissiveI: e });

/** Face de pièce dessinée : anneau, cœur, points en couronne, grand symbole. */
function coinFace(d, { rim, core, label, ink = '#5a3a00', small }) {
  return sign(d, d, (c, w) => {
    const r = w / 2;
    c.fillStyle = rim; c.beginPath(); c.arc(r, r, r * .985, 0, 7); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = w * .02; c.beginPath(); c.arc(r, r, r * .93, 0, 7); c.stroke();
    c.fillStyle = core; c.beginPath(); c.arc(r, r, r * .7, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = w * .025; c.beginPath(); c.arc(r, r, r * .64, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.fillRect(r + Math.cos(a) * r * .82 - w * .018, r + Math.sin(a) * r * .82 - w * .018, w * .036, w * .036); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink;
    const fs = w * (label.length > 2 ? .2 : label.length > 1 ? .3 : .42);
    c.font = `400 ${fs}px "${PX}"`; c.fillText(label, r + (label.length === 1 ? w * .02 : 0), r + (small ? -w * .05 : w * .02));
    if (small) { c.font = `400 ${w * .1}px "${PX}"`; c.fillText(small, r, r + w * .2); }
  }, { res: 256 });
}
/** Pièce (axe Z, face vers la caméra). */
function makeCoin({ r = 1, th = .22, rim = C.gold, core = C.gold, label = '', ink, small, e = .28 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(r, r, th, gold(rim, e), { rot: [Math.PI / 2, 0, 0], seg: 40 }));
  g.add(torus(r * .95, th * .56, gold(rim, e), { seg: 40 }));
  const f = coinFace(r * 2, { rim, core, label, ink, small }); f.position.z = th / 2 + .012; g.add(f);
  const b = coinFace(r * 2, { rim, core, label, ink, small }); b.position.z = -th / 2 - .012; b.rotation.y = Math.PI; g.add(b);
  return g;
}
/** Cadenas. */
function makeLock(s = 1) {
  const g = new THREE.Group();
  g.add(torus(.26, .075, mat('#c9d2e6', { rough: .35 }), { pos: [0, .3, 0], seg: 20 }));
  g.add(rbox(.78, .6, .32, .1, mat('#ffb41e', { rough: .4, emissive: '#ffb41e', emissiveI: .2 })));
  g.add(cyl(.09, .09, .05, '#3a2500', { rot: [Math.PI / 2, 0, 0], pos: [0, .03, .17], seg: 12 }));
  g.add(box(.06, .18, .04, '#3a2500', { pos: [0, -.1, .17] }));
  g.scale.setScalar(s); return g;
}
/** Sol en damier (texture pixel). */
function gridFloor(size, a, b, rep = 16) {
  return canvasTex(64, (g, n) => { g.fillStyle = a; g.fillRect(0, 0, n, n); g.fillStyle = b; g.fillRect(0, 0, n / 2, n / 2); g.fillRect(n / 2, n / 2, n / 2, n / 2); }, { repeat: rep });
}
function floor(size, a, b, rep) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: gridFloor(size, a, b, rep), roughness: .9 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; }

// ---- pièces en grand nombre (instances)
const _d = new THREE.Object3D();
function inst(mesh, i, x, y, z, rx, ry, rz, s) { _d.position.set(x, y, z); _d.rotation.set(rx, ry, rz); _d.scale.setScalar(s); _d.updateMatrix(); mesh.setMatrixAt(i, _d.matrix); }
const RAIN_N = 80;
const rainGeo = new THREE.CylinderGeometry(.5, .5, .12, 18); rainGeo.rotateX(Math.PI / 2);
const rain = new THREE.InstancedMesh(rainGeo, gold(C.gold, .45), RAIN_N); rain.frustumCulled = false; rain.castShadow = false; rain.receiveShadow = false; scene.add(rain);
/** Pluie de pièces qui boucle. */
function setRain(t, { n = 60, w = 22, z0 = -9, zd = 6, top = 22, bottom = -3, speed = 6, s = 1, x0 = 0 } = {}) {
  rain.visible = true; const span = top - bottom;
  for (let i = 0; i < RAIN_N; i++) {
    if (i >= n) { inst(rain, i, 0, -99, 0, 0, 0, 0, 0); continue; }
    const ph = (hash(i * 1.7) * span + t * speed * (.7 + hash(i * 3.1) * .7)) % span;
    inst(rain, i, x0 + (hash(i * 5.3) - .5) * w, top - ph, z0 + hash(i * 7.7) * zd, hash(i) * 2, t * (2.5 + hash(i * 2.3) * 4) + i, hash(i * 4) * .6, s * (.7 + hash(i * 9.1) * .7));
  }
  rain.instanceMatrix.needsUpdate = true;
}
/** Fontaine de pièces qui jaillit de (x, y, z). */
function setFountain(t, t0, x, y, z, n = 80) {
  rain.visible = true;
  for (let i = 0; i < RAIN_N; i++) {
    const per = 1.5 + hash(i * 2.9) * .5, lt = t - t0 - hash(i * 1.3) * per; if (i >= n || lt < 0) { inst(rain, i, 0, -99, 0, 0, 0, 0, 0); continue; }
    const u = lt % per, a = hash(i * 6.1 + Math.floor(lt / per)) * 6.283, vr = 1.5 + hash(i * 8.3) * 4.2, vy = 15 + hash(i * 3.7) * 7;
    inst(rain, i, x + Math.cos(a) * vr * u, y + vy * u - 11 * u * u, z + Math.sin(a) * vr * u * .6 - 1.5, u * 5 + i, u * 7 + i, i, .8 + hash(i * 9.1) * .5);
  }
  rain.instanceMatrix.needsUpdate = true;
}

// ---- héros
const hero = makeCharacter({ shirt: '#19b6ff', pants: '#232a55', hair: '#3b2a1e', face: 'happy' }); scene.add(hero);

// ---- plan d'accroche : pièce géante de 2 €
const gHook = new THREE.Group(); scene.add(gHook);
gHook.add(floor(90, '#2a1a66', '#33207a', 22));
const bigCoin = makeCoin({ r: 3.0, th: .55, rim: '#dfe4ee', core: C.gold, label: '2 €', ink: '#6b3f00', e: .2 }); gHook.add(bigCoin);
const hookGlow = glow('#ffd35a', 15, .55); gHook.add(hookGlow);
for (let i = 0; i < 10; i++) { const h = 1 + hash(i * 3) * 3.5, b = box(1.6, h, 1.6, i % 2 ? '#4a2aa0' : '#5b35c0', { pos: [(i < 5 ? -1 : 1) * (6 + hash(i) * 5), h / 2, -4 - hash(i * 7) * 12] }); gHook.add(b); }

// ---- plan 1 : l'argent s'empile
const gMoney = new THREE.Group(); scene.add(gMoney);
gMoney.add(floor(90, '#39c46a', '#45d477', 22));
const STK = [[-4.5, -.6, 12], [-3.1, -1.6, 14], [-5.2, 1.2, 8], [4.5, -.6, 11], [3.1, -1.6, 14], [5.2, 1.2, 9], [-3.4, 2.3, 6], [-1.9, 3.0, 4], [3.4, 2.3, 7], [1.9, 3.0, 5]];
const STK_N = STK.reduce((a, s) => a + s[2], 0);
const stack = new THREE.InstancedMesh(new THREE.CylinderGeometry(.66, .66, .2, 20), new THREE.MeshStandardMaterial({ roughness: .3, metalness: .3, emissive: '#ffb020', emissiveIntensity: .22 }), STK_N);
stack.frustumCulled = false; stack.castShadow = true; stack.receiveShadow = true; gMoney.add(stack);
const STK_ITEMS = []; STK.forEach((s, si) => { for (let k = 0; k < s[2]; k++) STK_ITEMS.push({ si, k, at: .25 + k * .26 + hash(si * 3.3) * .22 + si * .03 }); });
STK_ITEMS.forEach((it, i) => stack.setColorAt(i, new THREE.Color(it.k % 2 ? '#ffc93c' : '#ffb21e')));
for (let i = 0; i < 9; i++) { const h = 1.2 + hash(i * 5) * 2.6, x = (i % 2 ? -1 : 1) * (8 + hash(i * 2) * 7), z = -6 - hash(i * 9) * 14; gMoney.add(box(2.2, h, 2.2, '#2aa35a', { pos: [x, h / 2, z] })); gMoney.add(box(1.5, 1.1, 1.5, '#35c56d', { pos: [x, h + .55, z] })); }
for (let i = 0; i < 5; i++) { const cl = new THREE.Group(); cl.add(box(4, 1, 1, '#ffffff', { cast: false })); cl.add(box(2.2, 1, 1, '#ffffff', { pos: [.3, .9, 0], cast: false })); cl.position.set((hash(i * 4) - .5) * 44, 13 + hash(i) * 7, -24); gMoney.add(cl); }

// ---- plan 2 : la victoire
const gWin = new THREE.Group(); scene.add(gWin);
gWin.add(floor(90, '#7a2a6a', '#8a3378', 22));
gWin.add(cyl(4.2, 4.5, .7, '#ffffff', { pos: [0, .35, 0], seg: 8 }));
gWin.add(cyl(3.1, 3.3, .7, gold(C.gold, .2), { pos: [0, 1.05, 0], seg: 8 }));
gWin.add(cyl(2.1, 2.3, .7, '#ff4d6d', { pos: [0, 1.75, 0], seg: 8 }));
const trophy = new THREE.Group(); gWin.add(trophy);
trophy.add(cyl(.95, .45, 1.1, gold(C.gold, .35), { pos: [0, .9, 0], seg: 20 })); trophy.add(cyl(.16, .16, .55, gold(C.gold2, .3), { pos: [0, .1, 0] }));
trophy.add(cyl(.6, .7, .22, gold(C.gold2, .3), { pos: [0, -.25, 0], seg: 8 })); trophy.add(box(1.3, .3, 1.3, '#3a2a7a', { pos: [0, -.5, 0] }));
for (const s of [-1, 1]) trophy.add(torus(.38, .09, gold(C.gold, .35), { pos: [s * 1.0, .95, 0], seg: 16 }));
const trophyStar = sign(.8, .8, (c, w) => { c.fillStyle = '#fff6c2'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? w * .2 : w * .46; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r); } c.fill(); }, { res: 96, emissive: true, pos: [0, .95, .82] }); trophy.add(trophyStar);
const trophyGlow = glow('#ffe27a', 7, .6); gWin.add(trophyGlow);
for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, k = i % 4, p = cyl(.35, .45, 5 + k * 1.6, i % 2 ? '#ffc93c' : '#ff4d6d', { pos: [s * (6 + k * 1.8), (5 + k * 1.6) / 2, -5 - k * 2.5], seg: 6 }); gWin.add(p); gWin.add(ball(.6, '#ffffff', { pos: [s * (6 + k * 1.8), 5 + k * 1.6 + .4, -5 - k * 2.5], seg: 8, seg2: 6, flat: true, emissive: '#ffe9a0', emissiveI: .6 })); }

// ---- plan 3 : les pièces à débloquer (10, 25, 50, 100, 250, 500 victoires : chiffres du dossier)
const gVault = new THREE.Group(); scene.add(gVault);
const WINS = [10, 25, 50, 100, 250, 500];
const SKIN = [['#d9853f', '#f0a45c', '#5a2a05'], ['#c7cfde', '#eef2f8', '#3c4258'], ['#ffc93c', '#ffe27a', '#6b3f00'], ['#32d67a', '#8bf5b6', '#064a24'], ['#3fb8ff', '#9be0ff', '#063a66'], ['#c86bff', '#ffd0ff', '#4a0a70']];
gVault.add(box(30, 30, 1, '#1b1650', { pos: [0, 6, -1.2] }));
gVault.add(floor(60, '#221a5e', '#2a2170', 14));
const cells = WINS.map((n, i) => {
  const col = i % 3, row = Math.floor(i / 3), x = (col - 1) * 3.0, y = 9.4 - row * 4.3, g = new THREE.Group(); g.position.set(x, y, 0); gVault.add(g);
  g.add(rbox(2.7, 3.9, .5, .25, '#2c2480', { pos: [0, -.35, -.55] })); g.add(rbox(2.4, 2.4, .2, .3, '#161245', { pos: [0, 0, -.3] }));
  const dark = makeCoin({ r: 1.0, rim: '#3a3f66', core: '#2b2f52', label: '?', ink: '#6a70a0', e: .05 }); g.add(dark);
  const lit = makeCoin({ r: 1.0, rim: SKIN[i][0], core: SKIN[i][1], label: '★', ink: SKIN[i][2], e: .35 }); g.add(lit);
  const lock = makeLock(1.05); g.add(lock);
  const gl = glow(SKIN[i][1], 5, 0); g.add(gl);
  const plate = sign(2.3, .95, (c, w, h) => { c.fillStyle = '#0d0b2e'; c.beginPath(); c.roundRect(0, 0, w, h, h * .25); c.fill(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffc93c'; c.font = `400 ${h * .42}px "${PX}"`; c.fillText(String(n), w / 2, h * .36); c.fillStyle = '#ffffff'; c.font = `400 ${h * .2}px "${PX}"`; c.fillText('VICTOIRES', w / 2, h * .78); }, { res: 256, emissive: true, pos: [0, -1.78, -.2] }); g.add(plate);
  return { g, dark, lit, lock, gl, x, y };
});
const UNLOCK = WINS.map((_, i) => T.p3 + 1.25 + i * BAR * .5);

// ---- plan 4 et 5 : l'escalier des boosts (×2, ×4, ×8, ×16 : chaque palier débloque le suivant)
const gStairs = new THREE.Group(); scene.add(gStairs);
gStairs.add(floor(120, '#1c1458', '#241a6a', 30));
const BOOST = [2, 4, 8, 16], STEP_W = 4.2, STEP_H = 1.9;
const stepX = i => -6.3 + i * STEP_W, stepY = i => STEP_H * (i + 1);
const STEPCOL = ['#3fe0ff', '#3df07a', '#ffc93c', '#ff4d8d'];
function stepSign(n, mode, col) {
  return sign(3.5, 1.55, (c, w, h) => {
    c.fillStyle = mode === 'on' ? col : mode === 'ready' ? '#2b2480' : '#15123f'; c.beginPath(); c.roundRect(0, 0, w, h, h * .14); c.fill();
    c.strokeStyle = mode === 'on' ? '#ffffff' : mode === 'ready' ? col : '#3a3570'; c.lineWidth = h * .08; c.beginPath(); c.roundRect(h * .04, h * .04, w - h * .08, h - h * .08, h * .12); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (mode === 'locked') { c.fillStyle = '#6a66a8'; c.fillRect(w / 2 - h * .2, h * .46, h * .4, h * .3); c.strokeStyle = '#6a66a8'; c.lineWidth = h * .07; c.beginPath(); c.arc(w / 2, h * .46, h * .13, Math.PI, 0); c.stroke(); }
    else { c.fillStyle = mode === 'on' ? '#0b0a24' : col; c.font = `400 ${h * .5}px "${PX}"`; c.fillText('×' + n, w / 2, h * .54); }
  }, { res: 384, emissive: true });
}
const steps = BOOST.map((n, i) => {
  const g = new THREE.Group(); g.position.set(stepX(i), 0, 0); gStairs.add(g); const h = stepY(i);
  g.add(box(STEP_W - .12, h, 5, '#2a2180', { pos: [0, h / 2, 0] }));
  const topOff = box(STEP_W - .12, .22, 5.04, '#4a40b0', { pos: [0, h - .1, 0] }); g.add(topOff);
  const topOn = box(STEP_W - .12, .24, 5.06, mat(STEPCOL[i], { rough: .4, emissive: STEPCOL[i], emissiveI: .7 }), { pos: [0, h - .1, 0] }); g.add(topOn);
  const s = {}; for (const m of ['locked', 'ready', 'on']) { s[m] = stepSign(n, m, STEPCOL[i]); s[m].position.set(0, h - 1.05, 2.53); g.add(s[m]); }
  const gl = glow(STEPCOL[i], 9, 0); gl.position.set(0, h + .5, 1); g.add(gl);
  return { g, topOff, topOn, s, gl };
});
for (let i = 0; i < 14; i++) { const h = 2 + hash(i * 3) * 9, b = box(2.4, h, 2.4, i % 2 ? '#2d2390' : '#3a2aa8', { pos: [-18 + i * 3.1 + hash(i) * 1.5, h / 2, -9 - hash(i * 7) * 10] }); gStairs.add(b); }
const LAND = BOOST.map((_, i) => T.p4 + BAR * (i + .78));             // atterrissage sur chaque palier

// ---- écran final : la pièce de 2 € et les six pièces débloquées
const gEnd = new THREE.Group(); scene.add(gEnd);
const endCoin = makeCoin({ r: 1.55, th: .32, rim: '#dfe4ee', core: C.gold, label: '2 €', ink: '#6b3f00', e: .2 }); endCoin.position.set(0, 7.0, 0); gEnd.add(endCoin);
const endGlow = glow('#ffd35a', 8, .5); endGlow.position.set(0, 7.0, -1); gEnd.add(endGlow);
const endRow = SKIN.map((s, i) => { const c = makeCoin({ r: .62, th: .16, rim: s[0], core: s[1], label: '★', ink: s[2], e: .35 }); c.position.set((i - 2.5) * 1.72, -4.85, 0); gEnd.add(c); return c; });
const GROUPS = [gHook, gMoney, gWin, gVault, gStairs, gEnd];

// ====================================================================== repères sonores
cue(0.02, 'whoosh'); cue(.18, 'impact', .9); cue(.2, 'coin'); cue(1.0, 'coin', .6); cue(1.7, 'coin', .6); cue(2.5, 'coin', .6); cue(T.p1 - .5, 'riser', .6, .5);
cue(T.p1, 'impact'); for (let i = 0; i < 12; i++) cue(T.p1 + .35 + i * .33, 'coin', .55); cue(T.p1 + 4.3, 'powerup', .7);
cue(T.p2 - .15, 'swish'); cue(T.p2, 'win'); cue(T.p2 + BAR, 'ding'); cue(T.p2 + BAR * 1.5, 'ding'); cue(T.p2 + BAR * 2, 'ding'); cue(T.p2 + BAR * 2.5, 'chime');
cue(T.p3 - .2, 'sweepdown', .7); cue(T.p3, 'thud'); UNLOCK.forEach((u, i) => { cue(u - .12, 'click', .8); cue(u, i === 5 ? 'powerup' : 'ding', .9); cue(u + .05, 'coin', .6); });
cue(T.p4 - .2, 'whoosh'); cue(T.p4, 'impact', .8); LAND.forEach((l, i) => { cue(l - .5, 'boing', .7); cue(l, 'thud', .8); cue(l + .03, i === 3 ? 'win' : 'powerup', .8); });
cue(T.p5 - .6, 'riser', .8, .6); cue(T.p5, 'boom'); for (let i = 0; i < 9; i++) cue(T.p5 + .2 + i * .34, 'coin', .6);
cue(T.end - .2, 'whoosh'); cue(T.end, 'impact'); cue(T.end + .6, 'coin'); cue(T.end + .95, 'pop'); cue(T.end + 1.6, 'chime', .8);

// ====================================================================== effets 2D maison (style pixel)
function pixelStars(t, { n = 60, color = '#ffffff', seed = 0, y0 = 0, h = H, alpha = 1 } = {}) {
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) { const tw = .35 + .65 * Math.abs(Math.sin(t * (1 + hash(i + seed) * 2) + i)), s = 6 + Math.floor(hash(i * 3 + seed) * 3) * 4; ctx.globalAlpha = tw * alpha; ctx.fillRect(Math.round(hash(i * 5 + seed) * W / 6) * 6, y0 + Math.round(hash(i * 11 + seed) * h / 6) * 6, s, s); }
  ctx.restore();
}
function pixelBurst(t, at, cx, cy, color = '#ffffff', { n = 18, r = 260, life = .7, size = 20 } = {}) {
  const lt = t - at; if (lt < 0 || lt > life) return; const k = lt / life; ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 1 - k * k;
  for (let i = 0; i < n; i++) { const a = i * 6.283 / n + hash(i + at) * .5, d = r * ease.out(k) * (.55 + hash(i * 3 + at) * .6), s = size * (1 - k * .6); ctx.fillRect(Math.round((cx + Math.cos(a) * d) / 4) * 4 - s / 2, Math.round((cy + Math.sin(a) * d) / 4) * 4 - s / 2, s, s); }
  ctx.restore();
}
/** Soleil pixel (disque en bandes) pour le plan de victoire. */
function pixelSun(cx, cy, r, c1, c2) { for (let y = -r; y < r; y += 16) { const w = Math.sqrt(r * r - y * y); ctx.fillStyle = Math.floor((y + r) / 16) % 2 ? c1 : c2; ctx.fillRect(Math.round((cx - w) / 16) * 16, cy + y, Math.round(2 * w / 16) * 16, 16); } }
/** Compteur type jeu : icône de pièce + libellé + valeur. */
function hud(label, value, { x = SAFE.cx, y = 300, color = C.gold, scale = 1, wd = 700 } = {}) {
  const hh = 164; ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-wd / 2 + 10, -hh / 2 + 12, wd, hh);
  ctx.fillStyle = C.ink; ctx.fillRect(-wd / 2, -hh / 2, wd, hh); ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.strokeRect(-wd / 2 + 5, -hh / 2 + 5, wd - 10, hh - 10);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-wd / 2 + 92, 0, 48, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(-wd / 2 + 92, 0, 36, 3.4, 4.9); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
  ctx.fillStyle = C.ink; ctx.fillRect(-wd / 2 + 84, -22, 16, 44);
  ctx.restore();
  text(label, x + (-wd / 2 + 164) * scale, y - 36 * scale, { size: 44 * scale, weight: 800, color: '#ffffff', align: 'left', maxW: (wd - 190) * scale });
  text(value, x + (-wd / 2 + 164) * scale, y + 30 * scale, { font: PX, size: 54 * scale, color, align: 'left', maxW: (wd - 190) * scale });
}
const cap = (t, a, b, s, o = {}) => caption(t, a, b, s, { font: PX, size: 58, lineH: 1.55, strokeW: 16, color: '#ffffff', shadow: 'rgba(0,0,0,.6)', shadowY: 8, y: 1340, ...o });

// ====================================================================== rendu
function render(t) {
  let sx = 0, sy = 0; const addShake = (at, amp) => { const s = shake(t, at, amp); sx += s[0]; sy += s[1]; };
  rain.visible = false; hero.visible = true; hero.scale.setScalar(1); hero.rotation.set(0, 0, 0);
  hero.parts.torso.rotation.set(0, 0, 0); hero.parts.head.rotation.set(0, 0, 0);

  if (t < T.p1) {                                  // ---------- accroche : la pièce de 2 € géante
    showOnly(GROUPS, gHook); bg([C.night, '#4a1f9a', '#c2478f']); pixelStars(t, { n: 70, h: 1100 });
    rays(t, { cy: 440, color: 'rgba(255,210,90,.10)', n: 14, speed: .35 });
    const k = ease.back(inv(0, .45, t)), bob = Math.sin(t * 2.6) * .35;
    bigCoin.position.set(0, 8.7 + bob, 0); bigCoin.scale.setScalar(.82 + .18 * k); bigCoin.rotation.set(0, Math.sin(t * 1.5) * .9 + ease.out(inv(0, .7, t)) * 6.283, Math.sin(t * 1.9) * .06);
    hookGlow.position.set(0, 8.7 + bob, -1.5); hookGlow.scale.setScalar(15 + Math.sin(t * 5) * 1.2);
    hero.scale.setScalar(.85); hero.position.set(0, Math.abs(Math.sin(t * 5.2)) * 1.0, 2.2); poseCheer(hero, t);
    setRain(t, { n: 46, w: 24, z0: -8, zd: 5, top: 24, bottom: -2, speed: 7 });
    camLook(camera, [Math.sin(t * .6) * 2.2, 3.4, 28.5 - prog(t, 0, T.p1, ease.io) * 2.5], [0, 3.1, 0], 42);
    addShake(.18, 16);
  } else if (t < T.p2) {                           // ---------- plan 1 : gagne de l'argent
    showOnly(GROUPS, gMoney); bg(['#27b6ff', '#8fe6ff', '#d6fbff']); const lt = t - T.p1;
    STK_ITEMS.forEach((it, i) => {
      const s = STK[it.si], u = inv(it.at, it.at + .42, lt), y = .1 + it.k * .2 + 8 * (1 - ease.bounce(u));
      inst(stack, i, s[0] + (hash(i * 3.3) - .5) * .09, y, s[1] + (hash(i * 5.1) - .5) * .09, 0, i, 0, lt < it.at ? 0 : 1);
    }); stack.instanceMatrix.needsUpdate = true;
    const hop = lt > 4.3 ? Math.abs(Math.sin((lt - 4.3) * 7)) * 1.2 : 0; hero.position.set(0, hop, 0);
    if (lt > 4.3) poseCheer(hero, t); else { poseIdle(hero, t); hero.parts.head.rotation.set(-.25, Math.sin(lt * 2.2) * .7, 0); hero.parts.armL.rotation.set(0, 0, -.9 - Math.sin(t * 6) * .15); hero.parts.armR.rotation.set(0, 0, .9 + Math.sin(t * 6) * .15); }
    setRain(t, { n: 26, w: 26, z0: -12, zd: 5, top: 22, bottom: -1, speed: 8 });
    const a = -.35 + lt * .13; camLook(camera, [Math.sin(a) * 22, 6.6 - lt * .15, Math.cos(a) * 22], [0, 2.9, 0], 42);
    addShake(T.p1, 14);
  } else if (t < T.p3) {                           // ---------- plan 2 : gagne des parties
    showOnly(GROUPS, gWin); bg(['#2a1466', '#c2337a', '#ff9a3c']); const lt = t - T.p2;
    pixelSun(540, 760, 430, '#ffd23c', '#ffb02e'); rays(t, { cy: 760, color: 'rgba(255,255,255,.10)', n: 12, speed: -.3 }); pixelStars(t, { n: 30, h: 600, seed: 4 });
    const hop = Math.abs(Math.sin(lt * 5.5)) * .9; hero.position.set(0, 2.1 + hop, 0); poseCheer(hero, t);
    trophy.position.set(0, 2.1 + hop + 7.1 + Math.sin(t * 3) * .12, 0); trophy.rotation.y = lt * 1.6; trophy.scale.setScalar(1.15 * ease.back(inv(0, .4, lt)));
    trophyGlow.position.set(0, trophy.position.y + .7, -1); trophyGlow.scale.setScalar(7 + Math.sin(t * 7) * .8);
    const a = .5 - lt * .2; camLook(camera, [Math.sin(a) * 23, 4.2 + lt * .25, Math.cos(a) * 23], [0, 5.6, 0], 42);
    addShake(T.p2, 14);
  } else if (t < T.p4) {                           // ---------- plan 3 : débloque de nouvelles pièces
    showOnly(GROUPS, gVault); hero.visible = false; bg(['#0e0b30', '#1b1650']); const lt = t - T.p3;
    cells.forEach((c, i) => {
      const u = t - UNLOCK[i], on = u >= 0;
      c.dark.visible = !on; c.lit.visible = on; c.lock.visible = u < .55;
      c.dark.rotation.z = !on && u > -.3 ? Math.sin(u * 60) * .08 : 0;
      if (on) { const k = ease.out(inv(0, .7, u)); c.lit.scale.setScalar(.6 + .4 * ease.back(inv(0, .35, u))); c.lit.rotation.y = (1 - k) * 12.566 + Math.sin(t * 1.8 + i) * .28; }
      c.lock.position.set(on ? u * 1.6 * (i % 2 ? 1 : -1) : 0, on ? -.25 + u * 3 - 14 * u * u : -.25 + (u > -.3 ? Math.sin(u * 60) * .04 : 0), .55); c.lock.rotation.z = on ? u * 7 * (i % 2 ? -1 : 1) : 0;
      c.gl.position.set(0, 0, .4); c.gl.material.opacity = on ? .85 * (1 - inv(0, .6, u)) + .16 : 0; c.gl.scale.setScalar(on ? 3.4 + 4 * ease.out(inv(0, .4, u)) : 1);
    });
    const z = lerp(11, 23.5, prog(lt, 0, 1.15, ease.io)), fx = lerp(cells[0].x, 0, prog(lt, 0, 1.15, ease.io)), fy = lerp(cells[0].y, 5.3, prog(lt, 0, 1.15, ease.io));
    camLook(camera, [fx + Math.sin(lt * .55) * 1.3, fy + .2, z - lt * .18], [fx, fy, 0], 42);
    UNLOCK.forEach(u => addShake(u, 7));
  } else if (t < T.end) {                          // ---------- plans 4 et 5 : l'escalier des boosts
    showOnly(GROUPS, gStairs); const lt = t - T.p4, fin = t >= T.p5;
    bg(fin ? ['#ff9d1e', '#ffd23c', '#fff3a8'] : [C.night, '#33168a', '#7a2bb8']);
    if (fin) rays(t, { cy: 800, color: 'rgba(255,255,255,.28)', n: 16, speed: .5 }); else pixelStars(t, { n: 80, h: 1500, seed: 9 });
    let hx = stepX(0) - STEP_W, hy = 0, air = 0, lvl = -1;
    BOOST.forEach((_, i) => { const u = inv(LAND[i] - .5, LAND[i], t); if (u > 0) { const x0 = stepX(i) - STEP_W, y0 = i ? stepY(i - 1) : 0; hx = lerp(x0, stepX(i), u); hy = lerp(y0, stepY(i), u) + Math.sin(u * Math.PI) * 2.6; air = u < 1 ? Math.sin(u * Math.PI) : 0; if (u >= 1) lvl = i; } });
    steps.forEach((s, i) => {
      const on = lvl >= i, ready = !on && lvl >= i - 1;
      s.s.on.visible = on; s.s.ready.visible = ready; s.s.locked.visible = !on && !ready; s.topOn.visible = on; s.topOff.visible = !on;
      const u = t - LAND[i]; s.gl.material.opacity = on ? .75 * (1 - inv(0, .7, u)) + .15 : 0; s.gl.scale.setScalar(on ? 7 + 5 * ease.out(inv(0, .4, u)) : 1);
      s.g.scale.y = on ? 1 + .06 * Math.sin(inv(0, .3, u) * Math.PI) * -1 : 1;
    });
    if (!fin) {
      const rest = air === 0; hero.position.set(hx, hy + (rest && lvl >= 0 ? Math.abs(Math.sin(t * 8)) * .25 : 0), .3); hero.rotation.y = rest ? .55 : 1.2;
      if (rest) { lvl >= 0 ? poseCheer(hero, t) : poseWalk(hero, t * 9, .5); } else poseJump(hero, air);
      setRain(t, { n: 30, w: 44, z0: -9, zd: 4, top: 26, bottom: 0, speed: 5 + lvl * 2 });
      const cx = lerp(stepX(0) - 2.4, stepX(3) - .6, prog(lt, .3, LAND[3] - T.p4, ease.io)), cy = lerp(1.2, stepY(3) + .6, prog(lt, .3, LAND[3] - T.p4, ease.io));
      camLook(camera, [cx + 5, cy + 2.2, 26.5], [cx, cy - 1.3, 0], 42);
      LAND.forEach(l => addShake(l, 12));
    } else {
      const u = t - T.p5; hero.position.set(stepX(3), stepY(3) + Math.abs(Math.sin(u * 6.5)) * 1.5, .3); hero.rotation.y = 0; poseCheer(hero, t);
      setFountain(t, T.p5, stepX(3), stepY(3) + 1, -1.2, 80);
      camLook(camera, [stepX(3) - 1.5 + Math.sin(u * .9) * 2.4, stepY(3) - 1.6, 21 - u * .9], [stepX(3), stepY(3) + 4.0, 0], 44);
      addShake(T.p5, 26);
    }
  } else {                                         // ---------- écran final
    showOnly(GROUPS, gEnd); hero.visible = false; const lt = t - T.end;
    bg([C.night, '#2a1680', '#5a1f9a']); rays(t, { cy: 620, color: 'rgba(255,205,80,.10)', n: 14, speed: .22 }); pixelStars(t, { n: 60, seed: 21, alpha: .8 });
    endCoin.rotation.y = lt * 2.2; endCoin.position.y = 7.0 + Math.sin(lt * 2.4) * .18; endCoin.scale.setScalar(ease.back(inv(0, .5, lt)));
    endGlow.scale.setScalar(8 + Math.sin(lt * 4) * .7);
    endRow.forEach((c, i) => { const k = ease.back(inv(1.5 + i * .12, 1.9 + i * .12, lt)); c.scale.setScalar(k); c.rotation.y = Math.sin(lt * 2 + i * .8) * .5; c.position.y = -4.85 + Math.sin(lt * 3 + i) * .08; });
    setRain(t, { n: 34, w: 24, z0: -14, zd: 5, top: 15, bottom: -15, speed: 4, s: .9 });
    camLook(camera, [0, 0, 30], [0, 0, 0], 40);
    addShake(T.end, 12);
  }
  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(.32, '10,6,40');

  // ---------- textes, compteurs et transitions
  if (t < T.p1) {
    cap(t, .12, T.p1 - .12, 'JUSQU\'OÙ IRA\nTA FORTUNE ?', { anim: 'slam', size: 64, color: C.gold, y: 1410 });
    pixelBurst(t, .18, 540, 440, '#fff3a8', { r: 520, n: 22, size: 26 });
  } else if (t < T.p2) {
    const lt = t - T.p1; hud('ARGENT', count(lt, .3, 4.6, 0, 1250), { color: C.gold });
    cap(t, T.p1 + .25, T.p2 - .15, 'GAGNE\nDE L\'ARGENT', { anim: 'pop', size: 66 });
  } else if (t < T.p3) {
    const lt = t - T.p2, n = Math.min(10, 1 + Math.floor(lt / (BAR * 3) * 10.2)), pulse = 1 + .12 * (1 - inv(0, .2, (lt / (BAR * 3) * 10.2) % 1));
    hud('VICTOIRES', String(n), { color: C.green, wd: 600, scale: pulse });
    confetti(t, T.p2 + .05, { cy: 700, n: 90, colors: [C.gold, C.pink, C.cyan, C.green, '#ffffff'] });
    pixelBurst(t, T.p2 + .1, 540, 520, '#ffffff', { r: 420 }); pixelBurst(t, T.p2 + BAR, 250, 560, C.cyan); pixelBurst(t, T.p2 + BAR * 1.5, 830, 520, C.pink); pixelBurst(t, T.p2 + BAR * 2, 300, 420, C.gold); pixelBurst(t, T.p2 + BAR * 2.5, 800, 640, C.green);
    cap(t, T.p2 + .2, T.p2 + BAR * 1.5 - .1, 'GAGNE\nDES PARTIES', { anim: 'slam', size: 66 });
    cap(t, T.p2 + BAR * 1.5, T.p3 - .15, 'CHAQUE VICTOIRE\nCOMPTE', { anim: 'pop', size: 56, color: C.gold });
  } else if (t < T.p4) {
    let n = 0; UNLOCK.forEach((u, i) => { if (t >= u) n = WINS[i]; });
    const last = Math.max(...UNLOCK.filter(u => t >= u), -9), pulse = 1 + .12 * (1 - inv(0, .25, t - last));
    hud('VICTOIRES', String(n), { color: C.green, wd: 600, scale: pulse, y: 300 });
    cap(t, T.p3 + .25, T.p3 + BAR * 2.4, 'DE NOUVELLES\nPIÈCES', { anim: 'pop', size: 62, y: 1420 });
    cap(t, T.p3 + BAR * 2.4 + .05, T.p4 - .15, '6 PIÈCES\nÀ DÉBLOQUER', { anim: 'slam', size: 62, y: 1420, color: C.gold });
  } else if (t < T.p5) {
    let lvl = -1; LAND.forEach((l, i) => { if (t >= l) lvl = i; });
    const last = lvl >= 0 ? LAND[lvl] : -9, pulse = 1 + .16 * (1 - inv(0, .25, t - last));
    hud('BOOST D\'ARGENT', lvl >= 0 ? '×' + BOOST[lvl] : '×1', { color: lvl >= 0 ? STEPCOL[lvl] : '#ffffff', wd: 720, scale: pulse, y: 300 });
    cap(t, T.p4 + .2, T.p4 + BAR * 1.75, 'BOOSTE\nTON ARGENT', { anim: 'pop', size: 64, y: 1420 });
    cap(t, T.p4 + BAR * 1.78, T.p5 - .15, 'CHAQUE PALIER\nDÉBLOQUE\nLE SUIVANT', { anim: 'slide', size: 52, y: 1410, color: C.gold });
    LAND.forEach((l, i) => flash(t, l, .22, i === 3 ? '255,255,255' : '255,240,180', .35));
  } else if (t < T.end) {
    const u = t - T.p5; speedLines(t, { alpha: .35, color: 'rgba(255,255,255,.7)', inner: 620 });
    confetti(t, T.p5 + .05, { cy: 760, n: 120, colors: [C.cyan, C.pink, '#ffffff', C.green, '#7a2bb8'] });
    cap(t, T.p5 + .05, T.end - .12, 'BOOST ×16 !', { anim: 'slam', size: 84, y: 420, color: '#ffffff', strokeW: 22 });
    hud('ARGENT', count(u, 0, BAR * 2, 1250, 96000), { color: C.gold, y: 1400, scale: 1.1 });
  }
  wipe(t, T.p1, { color: C.gold, color2: C.gold2, dur: .4 });
  flash(t, T.p2, .3, '255,244,200');
  wipe(t, T.p3, { color: '#1b1650', color2: C.cyan, dur: .45, dir: 'down' });
  wipe(t, T.p4, { color: C.pink, color2: C.gold, dur: .42, dir: 'right' });
  flash(t, T.p5, .4, '255,255,255');
  flash(t, T.end, .35, '255,230,140');
  if (t >= T.end) endCard(t, T.end + .12, { title: 'COINVERSE', tagline: 'Gagne. Débloque. Booste.', status: 'public', font: PX, titleSize: 104, titleGrad: ['#fff3a8', '#ffb21e'], titleStroke: '#2a1200', accent: '#22c55e', search: 'Coinverse' });
}

registerAd({ duration: DURATION, thumbTime: T.p5 + .9, render,
  music: { style: 'chiptune', bpm: BPM, root: 50, prog: [0, 5, 3, 4], seed: 12,
    sections: [[0, 'build'], [T.p1, 'drop'], [T.p3, 'build'], [T.p4, 'drop'], [T.p5, 'drop2'], [T.end, 'drop2']], end: T.end + 2 * BAR } });
