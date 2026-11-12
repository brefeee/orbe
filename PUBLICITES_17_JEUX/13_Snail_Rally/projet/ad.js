// Publicité « Snail Rally » : courses d'escargots à fusée. Statut : bientôt sur Roblox.
// Tout est créé par le code (modèles 3D, textures, textes, repères sonores). Aucune ressource externe.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, noise1, shake, DEG, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, rbox, addLights,
  tree, bushyTree, ground, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect,
  text, caption, pill, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Bangers', 'Inter']);
const BAR = 240 / 160;                       // 1,5 s par mesure
const T = { hook: 0, grid: 2 * BAR, go: 3 * BAR, aerial: 4 * BAR, drift: 5 * BAR, turbo: 8 * BAR, items: 11 * BAR, itemsB: 12 * BAR, itemsC: 13 * BAR,
  mush: 14 * BAR, fin: 16 * BAR, cross: 17 * BAR, podium: 18 * BAR, end: 20 * BAR }, DURATION = 24 * BAR;   // 36 s
const CUTS = [T.hook, T.grid, T.aerial, T.drift, T.turbo, T.items, T.mush, T.fin, T.podium, T.end];
const planStart = t => { let s = 0; for (const c of CUTS) if (t >= c) s = c; return s; };

// Palette
const C = { red: '#ff4a2e', yellow: '#ffd23f', orange: '#ff8a1f', cyan: '#27e0ff', navy: '#14182b', slime: '#7dff3c', violet: '#7a4bff', pink: '#ff5fa8' };
const SHELL = ['#ff4a2e', '#2f8bff', '#3ddc5a', '#a25bff', '#ffd23f', '#ff5fa8', '#27e0ff', '#ff9a3c'];   // 0 = toi
const BODY = ['#ffe08a', '#bfe3ff', '#d9f7a8', '#e6d0ff', '#fff1b0', '#ffd3e4', '#c8f6ff', '#ffe0c2'];

// ------------------------------------------------------------------ circuit (courbe fermée)
const K = 1.4;
const CP = [[-80, 0], [-30, 0], [30, 0], [80, 0], [120, -25], [125, -70], [90, -100], [40, -90], [0, -115], [-50, -120], [-100, -100], [-125, -55], [-115, -15]].map(([x, z]) => new THREE.Vector3(x * K, 0, z * K));
const curve = new THREE.CatmullRomCurve3(CP, true, 'centripetal'); curve.arcLengthDivisions = 3000;
const LEN = curve.getLength();
const _p = new THREE.Vector3(), _tg = new THREE.Vector3();
/** Repère sur la piste : s = distance le long du circuit, lat = écart vers la droite. */
function fr(s, lat = 0) {
  const u = (((s / LEN) % 1) + 1) % 1; curve.getPointAt(u, _p); curve.getTangentAt(u, _tg);
  const n = Math.hypot(_tg.x, _tg.z) || 1, tx = _tg.x / n, tz = _tg.z / n;
  return { x: _p.x - tz * lat, z: _p.z + tx * lat, tx, tz, a: Math.atan2(-tz, tx) };
}
const P = (s, lat, h) => { const f = fr(s, lat); return [f.x, h, f.z]; };
const PATH = []; for (let i = 0; i < 600; i++) { const f = fr(i / 600 * LEN); PATH.push([f.x, f.z, i / 600 * LEN]); }
function sNear(x, z) { let b = 0, bd = 1e9; for (const q of PATH) { const d = (q[0] - x * K) ** 2 + (q[1] - z * K) ** 2; if (d < bd) { bd = d; b = q[2]; } } return b; }
const distPath = (x, z) => { let bd = 1e9; for (const q of PATH) { const d = (q[0] - x) ** 2 + (q[1] - z) ** 2; if (d < bd) bd = d; } return Math.sqrt(bd); };

const S0 = sNear(-40, 0);                    // ligne de départ / d'arrivée
const SH = sNear(-125, -55) - 45;            // accroche et écran final
const SA = sNear(60, -95);                   // vue aérienne
const SD = sNear(95, -8);                    // virage du dérapage
const SU = S0 + 20;                          // ligne droite des zones de turbo
const SI = sNear(95, -100);                  // objets
const SM = sNear(-50, -120) - 10;            // champignons
const SP = S0 + 45;                          // podium
const HW = 8;                                // demi-largeur de la piste

// ------------------------------------------------------------------ scène
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(45);
const L = addLights(scene, { shadowArea: 34, shadowMap: 2048, dir: [9, 16, 7] });
scene.fog = new THREE.Fog('#cfeaff', 90, 430);
const world = new THREE.Group(); scene.add(world);

// sol
const groundTex = canvasTex(256, (g, n) => {
  g.fillStyle = '#63c257'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 260; i++) { g.fillStyle = ['#58b84e', '#70cc62', '#5ab552', '#7fd56c'][i % 4]; g.globalAlpha = .55; g.beginPath(); g.arc(hash(i) * n, hash(i * 3.3) * n, 5 + hash(i * 7) * 16, 0, 7); g.fill(); }
}, { repeat: 60 });
const gr = ground(1500, '#63c257', { tex: groundTex }); gr.position.set(0, 0, -84 * K * .5); world.add(gr);

// ruban de piste
const roadTex = canvasTex(256, (g, n) => {
  g.fillStyle = '#3d4258'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 500; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.10)'; g.fillRect(hash(i) * n, hash(i * 5.1) * n, 3, 3); }
  for (const x of [0, n - 20]) { g.fillStyle = '#ff3b3b'; g.fillRect(x, 0, 20, n / 2); g.fillStyle = '#ffffff'; g.fillRect(x, n / 2, 20, n / 2); }
  g.fillStyle = '#ffffff'; g.fillRect(24, 0, 5, n); g.fillRect(n - 29, 0, 5, n);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(n / 2 - 3, 0, 6, n * .45);
});
roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
{
  const n = 1400, pos = [], uv = [], nor = [], idx = [];
  for (let j = 0; j <= n; j++) {
    const s = j / n * LEN, a = fr(s, -HW - .9), b = fr(s, HW + .9);
    pos.push(a.x, .03, a.z, b.x, .03, b.z); uv.push(0, s / 9, 1, s / 9); nor.push(0, 1, 0, 0, 1, 0);
    if (j < n) { const k = j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: roadTex, roughness: .85 })); road.receiveShadow = true; world.add(road);
}
// bordures : plots rouges et blancs (instances)
const dummy = new THREE.Object3D();
{
  const n = Math.floor(LEN / 6), im = new THREE.InstancedMesh(new THREE.CylinderGeometry(.42, .5, 1.1, 10), new THREE.MeshStandardMaterial({ roughness: .5 }), n * 2);
  const col = new THREE.Color();
  for (let j = 0; j < n; j++) for (const sd of [0, 1]) {
    const f = fr(j * 6, sd ? HW + 1.9 : -HW - 1.9); dummy.position.set(f.x, .55, f.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    im.setMatrixAt(j * 2 + sd, dummy.matrix); im.setColorAt(j * 2 + sd, col.set(j % 2 ? '#ffffff' : '#ff3b3b'));
  }
  im.castShadow = true; world.add(im);
}
// collines lointaines
for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .3, h = ball(1, ['#4fae58', '#57b85f', '#479e52'][i % 3], { seg: 14, seg2: 8, cast: false, receive: false }); h.scale.set(70 + hash(i) * 50, 26 + hash(i * 3) * 26, 70 + hash(i * 5) * 40); h.position.set(Math.cos(a) * 330, -4, -84 * K * .5 + Math.sin(a) * 330); world.add(h); }

// champignon (rebondissant sur la piste, géant dans le décor)
function mushroom(cap = '#ff3b4f', glowing = false) {
  const g = new THREE.Group();
  g.add(cyl(.55, .75, 1.2, '#fff3d6', { pos: [0, .6, 0], seg: 12 }));
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cap, { rough: .4, emissive: cap, emissiveI: glowing ? .55 : .12 }));
  top.scale.y = .78; top.position.y = 1.05; top.castShadow = true; g.add(top);
  g.add(cyl(1.45, 1.3, .16, '#ffe9c4', { pos: [0, 1.02, 0], seg: 20 }));
  for (let i = 0; i < 6; i++) { const a = i * 1.047 + .4, r = i % 2 ? .95 : .55, d = ball(.24, '#ffffff', { seg: 8, seg2: 6, cast: false }); d.scale.y = .45; d.position.set(Math.cos(a) * r, 1.05 + Math.sqrt(Math.max(0, 1.45 * 1.45 - r * r)) * .78, Math.sin(a) * r); g.add(d); }
  return g;
}
// décor dispersé le long du circuit (jamais sur la piste)
{
  const inForest = s => { const d = ((s - SI) % LEN + LEN) % LEN; return d < (SM + 130 - SI); };
  let placed = 0;
  for (let i = 0; i < 400 && placed < 105; i++) {
    const s = hash(i * 1.7) * LEN, side = hash(i * 2.9) > .5 ? 1 : -1, lat = side * (13 + hash(i * 4.3) ** 1.6 * 60), f = fr(s, lat);
    if (distPath(f.x, f.z) < 12.5) continue;
    let o;
    if (inForest(s) && hash(i * 9.1) > .3) { o = mushroom(['#ff3b4f', '#a25bff', '#27c7e0', '#ff8a1f'][i % 4], true); o.scale.setScalar(1.6 + hash(i * 6.1) * 2.6); }
    else if (hash(i * 8.3) > .82) { o = ball(1, '#9aa3b5', { seg: 7, seg2: 5, flat: true }); o.scale.set(1.2 + hash(i) * 1.6, .9 + hash(i * 2) * .9, 1.2 + hash(i * 3) * 1.4); }
    else o = (i % 2 ? tree : bushyTree)(5 + hash(i * 5.7) * 4, ['#3fae4a', '#49b356', '#2f9a4a', '#58c264'][i % 4]);
    o.position.x = f.x; o.position.z = f.z; o.rotation.y = hash(i * 12.1) * 6; world.add(o); placed++;
  }
  // fleurs (instances)
  const n = 420, im = new THREE.InstancedMesh(new THREE.SphereGeometry(.32, 7, 5), new THREE.MeshStandardMaterial({ roughness: .6 }), n), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const s = hash(i * 3.3 + 5) * LEN, lat = (hash(i * 7.7) > .5 ? 1 : -1) * (11.5 + hash(i * 1.9) * 26), f = fr(s, lat), ok = distPath(f.x, f.z) > 11;
    dummy.position.set(f.x, ok ? .3 : -5, f.z); dummy.scale.set(1, .7, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    im.setColorAt(i, col.set(['#ffffff', '#ffd23f', '#ff7ab8', '#ff5a3c', '#b79bff'][i % 5]));
  }
  world.add(im);
}

// arche de départ / d'arrivée
{
  const f = fr(S0), g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.a; world.add(g);
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 6; k++) g.add(cyl(.6, .6, 1.5, k % 2 ? '#ffffff' : C.red, { pos: [0, .75 + k * 1.5, sd * 11], seg: 14 }));
    for (let k = 0; k < 5; k++) { const b = ball(.85, [C.yellow, C.cyan, C.pink, '#3ddc5a', C.orange][(k + (sd > 0 ? 2 : 0)) % 5], { rough: .3, seg: 12, seg2: 10 }); b.position.set(Math.cos(k * 1.3) * .9, 12.4 + (k % 3) * .9, sd * 11 + Math.sin(k * 1.3) * .9); g.add(b); }
  }
  g.add(box(.7, 3.2, 23.4, C.navy, { pos: [0, 10.2, 0] }));
  const banner = (c, w, h) => {
    const q = h / 5; for (let i = 0; i < Math.ceil(w / q); i++) for (const r of [0, 4]) { c.fillStyle = (i + r) % 2 ? '#ffffff' : '#111319'; c.fillRect(i * q, r * q, q, q); }
    c.fillStyle = C.navy; c.fillRect(0, q, w, q * 3);
    c.font = `400 ${q * 2.5}px "Bangers"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = q * .35; c.strokeStyle = '#000'; c.strokeText('SNAIL RALLY', w / 2, h / 2 + q * .1);
    const gd = c.createLinearGradient(0, q, 0, q * 4); gd.addColorStop(0, '#fff27a'); gd.addColorStop(1, '#ff8a1f'); c.fillStyle = gd; c.fillText('SNAIL RALLY', w / 2, h / 2 + q * .1);
  };
  g.add(sign(23.4, 3.2, banner, { res: 1024, pos: [-.37, 10.2, 0], rot: [0, -Math.PI / 2, 0] }));
  g.add(sign(23.4, 3.2, banner, { res: 1024, pos: [.37, 10.2, 0], rot: [0, Math.PI / 2, 0] }));
  const chk = canvasTex(128, (c, n) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 16; j++) { c.fillStyle = (i + j) % 2 ? '#ffffff' : '#111319'; c.fillRect(i * n / 4, j * n / 16, n / 4, n / 16); } });
  const line = new THREE.Mesh(new THREE.PlaneGeometry(3.2, HW * 2), new THREE.MeshStandardMaterial({ map: chk, roughness: .7 })); line.rotation.x = -Math.PI / 2; line.position.y = .06; line.receiveShadow = true; g.add(line);
  // cases de la grille de départ
  for (let s = 0; s < 8; s++) { const row = s >> 1, col = s & 1; const m = box(.25, .04, 2.6, '#ffffff', { pos: [-1.6 - row * 5.5 - col * 2.2, .06, col ? 3.3 : -3.3], cast: false }); g.add(m); }
  // bottes de paille
  for (const [x, z] of [[4, 12.5], [6.4, 12.7], [5.2, 12.6], [-5, -12.6], [-7.4, -12.5]]) g.add(rbox(2.2, 1.3, 1.4, .25, '#f2c14e', { pos: [x, .65, z] }));
}
// panneaux fléchés du virage
{
  const arrow = (c, w, h) => { c.fillStyle = '#ffd23f'; c.fillRect(0, 0, w, h); c.fillStyle = '#111319'; for (const o of [0, .33, .66]) { c.beginPath(); c.moveTo(w * (.30 + o), h * .12); c.lineTo(w * (.08 + o), h * .5); c.lineTo(w * (.30 + o), h * .88); c.lineTo(w * (.42 + o), h * .88); c.lineTo(w * (.20 + o), h * .5); c.lineTo(w * (.42 + o), h * .12); c.fill(); } };
  for (let k = 0; k < 9; k++) {
    const f = fr(SD + 14 + k * 12, HW + 4), g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.a; world.add(g);
    g.add(cyl(.14, .14, 2, '#555c70', { pos: [0, 1, 0], seg: 6 })); g.add(box(.2, 2, 3.6, '#22252e', { pos: [0, 2.8, 0] }));
    g.add(sign(3.4, 1.8, arrow, { res: 128, pos: [-.11, 2.8, 0], rot: [0, -Math.PI / 2, 0] }));
  }
}
// zones de turbo
const chevTex = canvasTex(128, (c, n) => {
  c.fillStyle = '#0a2a6b'; c.fillRect(0, 0, n, n); c.fillStyle = '#27e0ff';
  for (const o of [0, .5]) { c.beginPath(); c.moveTo(n * (o + .05), n * .1); c.lineTo(n * (o + .25), n * .1); c.lineTo(n * (o + .45), n * .5); c.lineTo(n * (o + .25), n * .9); c.lineTo(n * (o + .05), n * .9); c.lineTo(n * (o + .25), n * .5); c.fill(); }
}); chevTex.wrapS = chevTex.wrapT = THREE.RepeatWrapping; chevTex.repeat.set(2.5, 1);
const padMat = new THREE.MeshBasicMaterial({ map: chevTex });
const PADS = [[SU + 42, -3], [SU + 93, 2.5], [SA + 30, 0], [SD - 30, 3]];
const padGlows = [];
for (const [s, lat] of PADS) {
  const f = fr(s, lat), g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.a; world.add(g);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2), padMat); m.rotation.x = -Math.PI / 2; m.position.y = .08; g.add(m);
  g.add(box(9.4, .14, .3, '#eaffff', { pos: [0, .09, 2.75], emissive: '#27e0ff', emissiveI: 1, cast: false })); g.add(box(9.4, .14, .3, '#eaffff', { pos: [0, .09, -2.75], emissive: '#27e0ff', emissiveI: 1, cast: false }));
  for (const [x, z] of [[-4.5, 2.75], [4.5, 2.75], [-4.5, -2.75], [4.5, -2.75]]) { const gl = glow('#27e0ff', 2.4, .8); gl.position.set(x, .5, z); g.add(gl); padGlows.push(gl); }
}
// bulles d'objets à ramasser
const qTex = canvasTex(128, (c, n) => { const gd = c.createLinearGradient(0, 0, n, n); gd.addColorStop(0, '#ffd23f'); gd.addColorStop(1, '#ff8a1f'); c.fillStyle = gd; c.fillRect(0, 0, n, n); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, n - 12, n - 12); c.font = '900 96px "Inter"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.strokeStyle = '#7a3a00'; c.lineWidth = 10; c.lineJoin = 'round'; c.strokeText('?', n / 2, n / 2 + 6); c.fillText('?', n / 2, n / 2 + 6); });
const qMat = new THREE.MeshStandardMaterial({ map: qTex, roughness: .4, emissive: '#ff8a1f', emissiveIntensity: .35 });
const bubMat = new THREE.MeshStandardMaterial({ color: '#bff6ff', transparent: true, opacity: .32, roughness: .1 });
const bubbles = [];
for (const [s0, lats] of [[SI + 22, [-5, -1.7, 1.7, 5]], [SI + 150, [-4, 0, 4]], [SD + 120, [-4, 0, 4]]]) for (const lat of lats) {
  const f = fr(s0, lat), g = new THREE.Group(); g.position.set(f.x, 1.7, f.z); world.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), qMat); b.castShadow = true; g.add(b);
  const sp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12), bubMat); g.add(sp);
  bubbles.push({ g, b, k: bubbles.length });
}
const T_POP = T.items + .79;
// champignons rebondissants sur la piste
const MUSH = [[34, -3.2], [47, 3.4], [60, -.8], [72, 4.8], [88, -4], [100, 1.5]];
const T_BOING1 = T.mush + 1.03, T_BOING2 = T.mush + 2.01;
const mushes = MUSH.map(([ds, lat], k) => { const m = mushroom(k % 2 ? '#ff5fa8' : '#ff3b4f', true); const f = fr(SM + ds, lat); m.position.set(f.x, 0, f.z); m.scale.setScalar(.95); world.add(m); return m; });
// flaque de bave glissante
const T_SLIME = T.items + 1.85, S_SLIME = SI + 26 * 1.85 - 2.2;
const slime = new THREE.Group();
{
  const sm = mat('#7dff3c', { rough: .12, emissive: '#3fc400', emissiveI: .45 });
  const b = ball(1, sm, { cast: false }); b.scale.set(2.3, .16, 1.9); slime.add(b);
  for (let i = 0; i < 7; i++) { const a = i * .9, r = 1.7 + hash(i) * .9, d = ball(.45 + hash(i * 3) * .35, sm, { cast: false, seg: 10, seg2: 8 }); d.scale.y = .25; d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * .8); slime.add(d); }
  for (let i = 0; i < 3; i++) { const d = ball(.22, '#eaffd0', { cast: false, seg: 8, seg2: 6, emissive: '#ffffff', emissiveI: .5 }); d.scale.y = .3; d.position.set(-.6 + i * .6, .15, -.3 + (i % 2) * .5); slime.add(d); }
  const f = fr(S_SLIME, -1.7); slime.position.set(f.x, .1, f.z); slime.rotation.y = f.a; world.add(slime);
}

// ------------------------------------------------------------------ escargot de course à fusée
const stripeTex = canvasTex(64, (c, n) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, n, n); c.fillStyle = '#8d8d8d'; c.fillRect(0, 0, n * .36, n); c.fillStyle = '#dcdcdc'; c.fillRect(n * .36, 0, n * .08, n); });
stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
function shellGeo(R = .85, turns = 2.6, k = .13, seg = 96, ring = 10) {
  const pos = [], uv = [], idx = [], th = turns * 2 * Math.PI, phiEnd = -1.25;
  for (let i = 0; i <= seg; i++) {
    const q = i / seg, theta = q * th, Rr = R * Math.exp(k * (theta - th)), phi = phiEnd - (th - theta), r = Math.max(.05, .43 * Rr);
    const cx = Rr * Math.cos(phi), cy = Rr * Math.sin(phi), nx = Math.cos(phi), ny = Math.sin(phi);
    for (let j = 0; j <= ring; j++) { const a = j / ring * 2 * Math.PI; pos.push(cx + r * Math.cos(a) * nx, cy + r * Math.cos(a) * ny, r * 1.5 * Math.sin(a)); uv.push(q * 13, j / ring); }
    if (i < seg) for (let j = 0; j < ring; j++) { const a = i * (ring + 1) + j, b = a + ring + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const SHELL_GEO = shellGeo();
const flameMatA = new THREE.MeshBasicMaterial({ color: '#ff6a14', transparent: true, opacity: .92, fog: false });
const flameMatB = new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: .95, fog: false });
function makeRocket(band) {
  const g = new THREE.Group(), R2 = Math.PI / 2;
  g.add(cyl(.3, .3, 1.4, '#eef1f7', { rot: [0, 0, R2], rough: .3, seg: 14 }));
  g.add(cone(.3, .65, '#ff3b3b', { rot: [0, 0, -R2], pos: [1.02, 0, 0], rough: .3, seg: 14 }));
  g.add(cyl(.32, .32, .24, band, { rot: [0, 0, R2], pos: [.3, 0, 0], seg: 14, rough: .4 }));
  g.add(cyl(.32, .32, .12, '#2a2f3d', { rot: [0, 0, R2], pos: [-.35, 0, 0], seg: 14 }));
  for (let k = 0; k < 3; k++) { const a = k * 2.094 + .5; const f = box(.55, .5, .07, '#ff3b3b', { pos: [-.5, Math.cos(a) * .42, Math.sin(a) * .42], rot: [a, 0, 0], rough: .4 }); g.add(f); }
  g.add(cyl(.33, .2, .34, '#3a3f4a', { rot: [0, 0, R2], pos: [-.86, 0, 0], seg: 14, rough: .5 }));
  const fl = new THREE.Group(); fl.position.x = -1.0; g.add(fl);
  const a = new THREE.Mesh(new THREE.ConeGeometry(.3, 1.7, 12), flameMatA); a.rotation.z = R2; a.position.x = -.85; fl.add(a);
  const b = new THREE.Mesh(new THREE.ConeGeometry(.17, 1.0, 10), flameMatB); b.rotation.z = R2; b.position.x = -.5; fl.add(b);
  const gl = glow('#ffb347', 2.4, .85); gl.position.x = -.35; fl.add(gl);
  g.flame = fl; return g;
}
function makeSnail(i) {
  const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
  const bc = BODY[i], bm = { rough: .5 };
  const foot = ball(1, bc, { ...bm, seg: 20, seg2: 12 }); foot.scale.set(1.75, .42, .66); foot.position.set(-.15, .42, 0); tilt.add(foot);
  const tail = cone(.4, 1.3, bc, { ...bm, rot: [0, 0, Math.PI / 2], pos: [-2.0, .3, 0], seg: 12 }); tail.scale.z = 1.2; tilt.add(tail);
  tilt.add(cyl(.34, .44, 1.35, bc, { ...bm, rot: [0, 0, -.5], pos: [1.22, .95, 0], seg: 14 }));
  const head = ball(.52, bc, { ...bm, seg: 18, seg2: 14 }); head.scale.set(1.1, .95, 1); head.position.set(1.6, 1.62, 0); tilt.add(head);
  const stalks = [];
  for (const sd of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(1.58, 1.98, sd * .26); pv.rotation.x = sd * .28; tilt.add(pv); stalks.push(pv);
    pv.add(cyl(.065, .085, .9, bc, { ...bm, pos: [0, .45, 0], seg: 8 }));
    pv.add(ball(.24, '#ffffff', { pos: [0, 1.0, 0], rough: .2, seg: 14, seg2: 10 }));
    pv.add(ball(.125, '#1b1b22', { pos: [.16, 1.02, 0], rough: .2, seg: 10, seg2: 8 }));
    pv.add(ball(.045, '#ffffff', { pos: [.26, 1.08, .04], seg: 6, seg2: 5, emissive: '#ffffff' }));
    tilt.add(cyl(.04, .055, .32, bc, { ...bm, rot: [0, 0, -1.9], pos: [2.12, 1.42, sd * .2], seg: 6 }));
    const ck = ball(.11, '#ff8fa3', { pos: [2.02, 1.52, sd * .34], seg: 8, seg2: 6, cast: false }); ck.scale.x = .5; tilt.add(ck);
  }
  const sg = new THREE.Group(); sg.position.set(2.15, 1.56, 0); sg.rotation.y = Math.PI / 2; tilt.add(sg);
  const sm = new THREE.Mesh(new THREE.TorusGeometry(.19, .04, 6, 14, Math.PI), mat('#3a2a2a')); sm.rotation.z = Math.PI; sg.add(sm);
  // coquille spirale
  const shellMat = new THREE.MeshStandardMaterial({ map: stripeTex, color: SHELL[i], roughness: .28, emissive: SHELL[i], emissiveIntensity: .14 });
  const shell = new THREE.Mesh(SHELL_GEO, shellMat); shell.castShadow = true; shell.position.set(-.35, 1.66, 0); tilt.add(shell);
  const core = ball(.5, SHELL[i], { rough: .4, seg: 12, seg2: 10 }); core.scale.set(1.5, 1.5, .55); core.position.copy(shell.position); tilt.add(core);
  const sGlow = glow('#ffe27a', 6, 0); sGlow.position.set(-.35, 1.7, 0); tilt.add(sGlow);
  // fusées jumelles
  tilt.add(box(.34, .22, 2.0, '#2a2f3d', { pos: [-.35, 1.6, 0] }));
  const rockets = [];
  for (const sd of [-1, 1]) { const r = makeRocket(SHELL[i]); r.position.set(-.3, 1.6, sd * .98); tilt.add(r); rockets.push(r); }
  world.add(root);
  return { root, tilt, stalks, rockets, shellMat, sGlow, shell, core };
}
const snails = SHELL.map((_, i) => makeSnail(i));

// fumée des fusées et étincelles de dérapage (instances)
const NP = 6, puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .5 }), 8 * NP); puffs.frustumCulled = false; world.add(puffs);
const NS = 40, sparksM = new THREE.InstancedMesh(new THREE.BoxGeometry(.14, .14, .5), new THREE.MeshBasicMaterial({ color: '#ffe066', fog: false }), NS); sparksM.frustumCulled = false; world.add(sparksM);

// ------------------------------------------------------------------ trajectoires (fonctions pures du temps)
const launch = (u, v) => u > 0 ? v * (u - .45 * (1 - Math.exp(-u / .45))) : 0;
function seq(x, keys) { if (x <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (x <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease.io(inv(keys[i - 1][0], keys[i][0], x))); return keys[keys.length - 1][1]; }
const pulse = u => u < 0 ? 0 : Math.exp(-u * 1.5) * Math.min(1, u * 8);
const boostK = t => pulse(t - T.turbo - 1.5) + pulse(t - T.turbo - 3);
const driftK = u => ease.io(inv(.3, .9, u)) * (1 - ease.io(inv(3.7, 4.4, u)));
const HOOK_D = [0, -6, -10.5, -15, -20, -25, -30, -35], HOOK_L = [0, 3.6, -3.8, 1.4, -2.6, 4.6, -5, .4];
const GRID_SLOT = [3, 0, 1, 2, 4, 5, 6, 7];
const AER_D = [0, 12, 8, 4, -4.5, -9, -13.5, -18];
const DR_D = [0, 16, 11, 5, -7, -11.5, -16, -21], DR_L = [0, 2, -2.5, 4.4, 1, -3, 3.5, -1];
const TB_D = [0, 30, 9, -7, -12, -17, -22, -27], TB_L = [0, -1, 5.2, .5, -4, 3, -2.5, 4.5];
const IT_D = [0, 22, -18, -9, -13, 7, -23, -28], IT_L = [-1.7, 2, 5.5, -1.5, 4.4, -5, -4.5, 1];
const MU_D = [0, 20, -15, -19, -4.5, -24, 7, -29], MU_L = [0, -6, 1.2, -5.5, 3.4, 1.5, -3.2, -5.8];
const FI_D = [0, 0, -8, -13, -17, -22, -26, -31], FI_L = [-2.2, 2.6, 5, -5, .5, -4, 3.5, -1];
const PO = [[0, 0], [-4.5, 4.8], [-5, -4.8], [-10, -2.4], [-10, 2.4], [-11.5, -6.6], [-11.5, 6.6], [-15, 0]];

function st(i, t) {
  const o = { s: 0, lat: 0, y: 0, yaw: 0, roll: 0, pitch: 0, flame: 1.1 };
  const wob = (f, sd) => (noise1(t * f, i * 7 + sd) - .5) * 2;
  if (t < T.grid || t >= T.end) {                                   // accroche et écran final : le peloton fonce vers la caméra
    const u = t < T.grid ? t : t - T.end, v = t < T.grid ? 27 : 24;
    o.s = SH + v * u + HOOK_D[i] + (i ? wob(.7, 1) * 1.3 : 0); o.lat = HOOK_L[i] + (i ? wob(.8, 2) * .9 : Math.sin(u * 1.7) * .9);
    o.roll = i ? wob(1.1, 3) * .05 : Math.cos(u * 1.7) * .09; o.flame = 1.25;
  } else if (t < T.aerial) {                                        // grille de départ puis départ
    const g = GRID_SLOT[i], row = g >> 1, col = g & 1, u = t - T.go;
    o.s = S0 - 3.5 - row * 5.5 - col * 2.2 + launch(u, i ? 25 + hash(i * 3.1) * 4 : 28.5);
    o.lat = (col ? 3.3 : -3.3) + (u < 0 ? wob(16, 3) * .07 : 0);
    o.pitch = u < 0 ? wob(13, 4) * .04 : .22 * Math.exp(-u * 2.2);
    o.flame = u < 0 ? .3 + .22 * noise1(t * 9, i) : 1.1 + 1.0 * Math.exp(-u * 1.5);
  } else if (t < T.drift) {                                         // vue aérienne
    o.s = SA + 28 * (t - T.aerial) + AER_D[i]; o.lat = (i % 2 ? 2.8 : -2.8) + wob(.9, 5) * 1.2;
  } else if (t < T.turbo) {                                         // dérapage
    const u = t - T.drift, d = i === 3 ? 5 - 2.4 * u : DR_D[i], k = driftK(u + d / 24);
    o.s = SD + 24 * u + d; o.lat = i ? DR_L[i] + wob(.6, 6) * .6 - 1.5 * k : seq(u, [[0, 3.6], [2.2, -4.2], [4.5, .5]]);
    o.yaw = (i ? .34 : .58) * k + Math.sin(t * 7 + i) * .05 * k; o.roll = -.15 * k; o.flame = 1.1 + .3 * k;
  } else if (t < T.items) {                                         // zones de turbo
    const u = t - T.turbo;
    o.s = SU + 26 * u + TB_D[i] + (i ? 0 : 12 * ease.io(inv(1.5, 2.6, u)) + 12 * ease.io(inv(3.0, 4.1, u)));
    o.lat = i ? TB_L[i] + wob(.5, 7) * .5 : seq(u, [[1.9, -3], [2.8, 2.5]]);
    if (!i) { const b = boostK(t); o.flame = 1.1 + 1.9 * b; o.pitch = .1 * b; }
  } else if (t < T.mush) {                                          // objets
    const u = t - T.items; let d = IT_D[i]; o.lat = IT_L[i] + (i ? wob(.5, 8) * .4 : 0);
    if (i === 3) { const w = u - 2.11; if (w > 0) { o.yaw = 4 * Math.PI * ease.out(inv(0, 1.4, w)); d -= 13 * ease.out(inv(0, 1.8, w)); o.lat = -1.5 + 2.6 * ease.out(inv(0, 1.2, w)); o.roll = Math.sin(w * 9) * .15 * (1 - inv(0, 1.4, w)); o.flame = .5; } }
    if (!i) { d += 13 * ease.io(inv(3.15, 4.4, u)); o.flame = 1.1 + 1.7 * win(u, 3.1, 4.45, .2); o.pitch = .08 * win(u, 3.1, 4.4, .2); }
    o.s = SI + 26 * u + d;
  } else if (t < T.fin) {                                           // champignons rebondissants
    const u = t - T.mush; let d = MU_D[i]; o.lat = MU_L[i];
    if (!i) { o.lat = seq(u, [[0, -.5], [1.2, 1.2], [1.8, 0], [2.4, 2.9], [3, .5]]); o.roll = Math.sin(u * 2.6) * .08; }
    if (i === 6) { const w = (u - 1.03) / 1.15; if (w > 0) { const k = clamp(w); o.y = 4.4 * Math.sin(Math.PI * k); o.pitch = 2 * Math.PI * k; d -= 13 * ease.out(k); o.lat = -3.2 - 2.6 * ease.out(k); o.flame = k < 1 ? .3 : 1.1; } }
    if (i === 4) { const w = (u - 2.01) / .95; if (w > 0) { const k = clamp(w); o.y = 3.4 * Math.sin(Math.PI * k); o.roll = 2 * Math.PI * k; d -= 9 * ease.out(k); o.lat = 3.4 + 2.8 * ease.out(k); o.flame = k < 1 ? .3 : 1.1; } }
    o.s = SM + 25 * u + d;
  } else if (t < T.podium) {                                        // sprint final
    const u = t - T.fin, w = u - 1.5, base = u < 1.5 ? S0 - 40.5 + 27 * u : S0 + 27 * (w - w * w / 4.8);
    const d = i === 1 ? 3.2 - 4.6 * ease.io(inv(0, 1.5, u)) : FI_D[i];
    o.s = base + d; o.lat = FI_L[i] + (i ? wob(.7, 9) * .4 : 0); o.flame = w < 0 ? 1.5 : 1.3 - .6 * inv(0, 1.2, w);
    if (!i && w > 0) { o.y = Math.abs(Math.sin(w * 6.3)) * .8 * inv(0, .2, w); o.roll = Math.sin(w * 6.3) * .1; }
  } else {                                                          // podium
    const u = t - T.podium; o.s = SP + PO[i][0]; o.lat = PO[i][1]; o.flame = 0;
    o.y = Math.abs(Math.sin(u * 5.2 + i * 1.3)) * (i ? .3 : .95); o.yaw = i ? (i === 1 ? .35 : i === 2 ? -.35 : 0) : Math.sin(u * 3) * .3; o.roll = i ? 0 : Math.sin(u * 5.2) * .12;
  }
  return o;
}

// ------------------------------------------------------------------ repères sonores
cue(0, 'engine', .7, 3); cue(.05, 'whoosh'); cue(1.5, 'impact', .9); cue(T.grid - .12, 'whoosh', .8);
cue(T.grid, 'impact', .7); cue(T.grid + .1, 'riser', .8, 1.35); for (let k = 0; k < 3; k++) cue(T.grid + .2 + k * .4, 'tick', .7);
cue(T.go, 'boom'); cue(T.go, 'horn', .8); cue(T.go + .05, 'engine', .9, 1.4); cue(T.aerial - .1, 'swish'); cue(T.aerial, 'crowd', .5, 1.4);
cue(T.drift, 'impact', .8); cue(T.drift + .4, 'slide'); cue(T.drift + 1.6, 'scratch', .5); cue(T.drift + 2.1, 'ding', .7); cue(T.drift + 2.8, 'slide', .8);
cue(T.turbo - .15, 'whoosh'); cue(T.turbo, 'engine', .7, 1.5); cue(T.turbo + 1.5, 'powerup'); cue(T.turbo + 1.5, 'boom', .7); cue(T.turbo + 2.35, 'ding', .7); cue(T.turbo + 3, 'powerup'); cue(T.turbo + 3, 'zap', .7);
cue(T.items, 'impact', .8); cue(T_POP, 'pop'); cue(T_POP + .05, 'chime', .8); cue(T.itemsB, 'swish'); cue(T_SLIME, 'splash'); cue(T.items + 2.11, 'slide'); cue(T.items + 2.3, 'fail', .6);
cue(T.itemsC, 'powerup'); cue(T.itemsC + .1, 'whoosh'); cue(T.itemsC + .9, 'ding', .7);
cue(T.mush - .15, 'sweepdown', .8); cue(T_BOING1, 'boing'); cue(T_BOING1 + 1.1, 'thud', .7); cue(T_BOING2, 'boing'); cue(T.mush + 1.25, 'ding', .7);
cue(T.fin, 'impact'); cue(T.fin, 'riser', .9, 1.45); cue(T.fin + .05, 'engine', .8, 1.4); cue(T.cross, 'win'); cue(T.cross, 'boom', .8); cue(T.cross + .1, 'crowd', .9, 2.6); cue(T.cross + .15, 'horn', .6);
cue(T.podium - .15, 'whoosh'); cue(T.podium + .35, 'pop'); for (let k = 0; k < 8; k++) cue(T.podium + .5 + k * .09, 'tap', .5); cue(T.podium + 1.55, 'coin'); cue(T.podium + 1.75, 'coin', .8); cue(T.podium + 1.95, 'chime');
cue(T.end, 'impact'); cue(T.end + .15, 'whoosh'); cue(T.end + .85, 'pop'); cue(T.end + 1.3, 'ding', .7);

// ------------------------------------------------------------------ ambiances (3 identités visuelles)
const MOODS = {
  day: { sky: [[0, '#1f7cf0'], [.42, '#7cc6ff'], [.6, '#d6f0ff'], [1, '#d6f0ff']], fog: '#d6f0ff', sun: '#fff1dc', sunI: 2.7, hs: '#cfe3ff', hg: '#7fae6a', amb: 1.2 },
  sunset: { sky: [[0, '#5a2fb0'], [.3, '#ff6a4d'], [.55, '#ffc46b'], [1, '#ffd58a']], fog: '#ffcf85', sun: '#ffb26b', sunI: 2.9, hs: '#ffd0a8', hg: '#a8804a', amb: 1.15 },
  dusk: { sky: [[0, '#120b4a'], [.35, '#5b2a9d'], [.58, '#ff7ab8'], [1, '#c96ad0']], fog: '#b56ad0', sun: '#e2c8ff', sunI: 2.2, hs: '#b9a0ff', hg: '#6a4a8a', amb: 1.35 },
};
function setMood(name, target) {
  const m = MOODS[name]; scene.fog.color.set(m.fog); L.sun.color.set(m.sun); L.sun.intensity = m.sunI; L.hemi.color.set(m.hs); L.hemi.groundColor.set(m.hg); L.hemi.intensity = m.amb;
  L.sun.position.set(target[0] + 9, 16, target[2] + 7); L.sun.target.position.set(target[0], 0, target[2]);
  bg(m.sky);
}

// ------------------------------------------------------------------ dessins 2D (affichages type jeu)
const ord = n => n === 1 ? '1er' : n + 'e';
function hud(t, a, b, pos, lap, popAt = -9) {
  if (t < a || t > b) return; ctx.save(); ctx.globalAlpha = win(t, a, b, .18);
  const sc = 1 + .4 * (t >= popAt ? 1 - inv(popAt, popAt + .4, t) : 0);
  pill(ord(pos) + ' / 8', 215, 292, { size: 70, font: 'Bangers', bg: C.navy, color: pos === 1 ? C.yellow : '#ffffff', border: C.yellow, borderW: 6, scale: sc, pad: 36 });
  pill('TOUR ' + lap + ' / 4', 540, 292, { size: 46, bg: 'rgba(20,24,43,.88)', color: '#ffffff', pad: 30 });
  ctx.restore();
}
function iconSlime(x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#2f9a10'; ctx.beginPath(); ctx.ellipse(0, r * .22, r * .95, r * .5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#7dff3c'; ctx.beginPath(); ctx.ellipse(0, r * .1, r * .85, r * .45, 0, 0, 7); ctx.fill();
  for (const [dx, dy, rr] of [[-.55, -.25, .28], [.1, -.42, .36], [.6, -.2, .24]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, rr * r, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-r * .3, -r * .05, r * .2, r * .09, -.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(r * .16, -r * .5, r * .09, 0, 7); ctx.fill(); ctx.restore();
}
function iconShell(x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.arc(0, 0, r * .8, 0, 7); ctx.fill();
  ctx.strokeStyle = '#a84300'; ctx.lineWidth = r * .13; ctx.lineCap = 'round'; ctx.beginPath(); for (let a = 0; a < 15; a += .2) { const rr = r * .05 * a; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke();
  ctx.fillStyle = '#fff27a'; ctx.strokeStyle = '#14182b'; ctx.lineWidth = r * .09; ctx.lineJoin = 'round'; ctx.beginPath();
  for (const [px, py] of [[.25, -1], [-.35, .05], [.02, .05], [-.25, 1], [.5, -.2], [.1, -.2]]) ctx.lineTo(px * r * .85 + r * .42, py * r * .8); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
}
function itemSlot(t, a, b, kind, usedAt = 99) {
  if (t < a || t > b) return; const x = 885, y = 300, r = 82, k = ease.back(inv(a, a + .25, t)) * (1 - inv(b - .15, b, t));
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(0, 8, r, 0, 7); ctx.fill();
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.stroke();
  const al = t > usedAt ? 1 - inv(usedAt, usedAt + .3, t) : 1; ctx.globalAlpha *= al; if (t > usedAt) { const s = 1 + inv(usedAt, usedAt + .3, t) * .8; ctx.scale(s, s); }
  if (kind === 'q') text('?', 0, 4, { size: 110, font: 'Bangers', color: [C.yellow, C.cyan, C.slime, C.pink][Math.floor(t * 14) % 4], stroke: '#000', strokeW: 10 });
  else if (kind === 'slime') iconSlime(0, 0, 58); else iconShell(0, 0, 58);
  ctx.restore();
}
function leaf(x, y, s, rot, al = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= al; ctx.fillStyle = '#3ddc5a'; ctx.strokeStyle = '#0f6a2a'; ctx.lineWidth = s * .09; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * .8, -s * .3, 0, s); ctx.quadraticCurveTo(-s * .8, -s * .3, 0, -s); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -s * .7); ctx.lineTo(0, s * 1.25); ctx.stroke(); ctx.restore();
}
function ranking(t, a) {
  const lt = t - a; if (lt < 0) return; const k = ease.back(inv(0, .35, lt)), x0 = 150, y0 = 400, w = 780, h = 470;
  ctx.save(); ctx.translate(540, y0 + h / 2); ctx.scale(k, k); ctx.translate(-540, -(y0 + h / 2));
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(x0, y0 + 12, w, h, 40); ctx.fill(); ctx.fillStyle = 'rgba(20,24,43,.93)'; roundRect(x0, y0, w, h, 40); ctx.fill(); ctx.strokeStyle = C.yellow; ctx.lineWidth = 8; ctx.stroke();
  text('CLASSEMENT', 540, y0 + 62, { font: 'Bangers', size: 76, grad: ['#fff27a', '#ff8a1f'], stroke: '#000', strokeW: 10 });
  for (let i = 0; i < 8; i++) {
    const col = i >> 2, row = i & 3, cx = x0 + 40 + col * 360, cy = y0 + 150 + row * 78, ka = inv(.15 + i * .09, .3 + i * .09, lt); if (ka <= 0) continue;
    ctx.save(); ctx.globalAlpha = ka; ctx.translate((1 - ease.out(ka)) * 60, 0);
    if (i === 0) { ctx.fillStyle = C.yellow; roundRect(cx - 14, cy - 34, 350, 68, 20); ctx.fill(); }
    ctx.fillStyle = SHELL[i]; ctx.beginPath(); ctx.arc(cx + 150, cy, 24, 0, 7); ctx.fill(); ctx.strokeStyle = i ? '#ffffff' : C.navy; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 4; ctx.beginPath(); for (let q = 0; q < 11; q += .3) ctx.lineTo(cx + 150 + Math.cos(q) * q * 1.7, cy + Math.sin(q) * q * 1.7); ctx.stroke();
    text(ord(i + 1), cx + 55, cy + 2, { font: 'Bangers', size: 56, color: i ? '#ffffff' : C.navy });
    if (i === 0) text('TOI', cx + 250, cy + 2, { font: 'Bangers', size: 56, color: C.navy });
    ctx.restore();
  }
  ctx.restore();
  // récompense : des feuilles
  const kr = ease.back(inv(1.5, 1.85, lt));
  if (kr > 0) { ctx.save(); ctx.translate(540, y0 + h + 90); ctx.scale(kr, kr); pill('+ FEUILLES', 30, 0, { size: 64, font: 'Bangers', bg: '#0f6a2a', color: '#ffffff', border: '#7dff3c', borderW: 6, pad: 70 }); leaf(-155, 0, 30, -.5); ctx.restore(); }
  for (let i = 0; i < 16; i++) { const u = lt - 1.5 - hash(i * 3.1) * .9; if (u < 0) continue; const x = 120 + hash(i * 7.7) * 840, y = 180 + u * (420 + hash(i) * 260) + Math.sin(u * 4 + i) * 20; if (y > 1750) continue; leaf(x + Math.sin(u * 3 + i) * 50, y, 26 + hash(i * 5) * 14, u * 3 + i, .95); }
}

// ------------------------------------------------------------------ rendu d'une image
const cap = { font: 'Bangers', size: 112, color: '#ffffff', lineH: 1.02 };
function render(t) {
  // 1) état des 8 escargots
  const S = snails.map((_, i) => st(i, t)), F = S.map(o => fr(o.s, o.lat)), hs = S[0].s, hl = S[0].lat;
  snails.forEach((sn, i) => {
    const o = S[i], f = F[i]; sn.root.position.set(f.x, 0, f.z); sn.root.rotation.y = f.a + o.yaw;
    sn.tilt.position.y = o.y + Math.abs(Math.sin(t * 13 + i * 2.1)) * .05; sn.tilt.rotation.set(o.roll, 0, o.pitch);
    const fast = clamp(o.flame);
    sn.stalks.forEach((p, k) => { p.rotation.z = .45 * fast + Math.sin(t * 11 + i + k) * .08; p.rotation.x = (k ? 1 : -1) * .28 + Math.sin(t * 7 + i * 3 + k) * .06; });
    const fk = o.flame * (.82 + .36 * hash(Math.floor(t * 30) * 1.3 + i * 13.7));
    sn.rockets.forEach((r, k) => { r.flame.visible = o.flame > .02; r.flame.scale.set(Math.max(.01, fk), .75 + .3 * Math.min(fk, 2), .75 + .3 * Math.min(fk, 2)); });
    sn.shellMat.emissiveIntensity = .14; sn.sGlow.material.opacity = 0;
  });
  const gk = win(t, T.itemsC + .08, T.mush - .05, .22);              // carapace turbo : la coquille brille
  snails[0].shellMat.emissiveIntensity = .14 + 1.5 * gk; snails[0].sGlow.material.opacity = gk * (.75 + .2 * Math.sin(t * 30));
  const spinShell = t >= T.itemsC && t < T.mush ? (t - T.itemsC) * 9 : 0; snails[0].shell.rotation.z = -spinShell; snails[0].core.rotation.z = -spinShell;

  // 2) accessoires
  chevTex.offset.x = -((t * 1.6) % 1); padGlows.forEach((g, k) => g.material.opacity = .55 + .4 * Math.sin(t * 10 + k));
  bubbles.forEach(({ g, b, k }) => { g.position.y = 1.7 + Math.sin(t * 3 + k) * .2; b.rotation.set(t * 1.4 + k, t * 1.9 + k, 0); const hit = k === 1 && t >= T_POP && t < T.fin; g.visible = !(hit && t > T_POP + .16); g.scale.setScalar(hit ? 1 + inv(T_POP, T_POP + .16, t) * .9 : 1); });
  mushes.forEach((m, k) => { const th = k === 0 ? T_BOING1 : k === 1 ? T_BOING2 : -99, u = t - th; const sq = u > 0 && u < 1.5 ? .5 * Math.exp(-u * 5) * Math.cos(u * 24) : 0; m.scale.set(.95 * (1 + sq * .5), .95 * (1 - sq) * (1 + Math.sin(t * 5 + k) * .03), .95 * (1 + sq * .5)); });
  slime.visible = t >= T_SLIME && t < T.mush; slime.scale.setScalar(ease.back(inv(T_SLIME, T_SLIME + .25, t)) || .001);
  // fumée
  const p0 = planStart(t);
  for (let i = 0; i < 8; i++) for (let j = 0; j < NP; j++) {
    const age = ((t * 2.2 + j / NP + i * .37) % 1) * .42, t0 = t - age; let sc = 0;
    if (t0 >= p0) { const o = st(i, t0); if (o.flame > .25) { const f = fr(o.s, o.lat); sc = (.3 + age * 2.6) * Math.sqrt(1 - age / .42) * Math.min(1.5, o.flame); dummy.position.set(f.x - f.tx * 2.6, 1.5 + o.y + age * 1.6, f.z - f.tz * 2.6); } }
    if (sc <= 0) dummy.position.set(0, -50, 0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(Math.max(sc, .001)); dummy.updateMatrix(); puffs.setMatrixAt(i * NP + j, dummy.matrix);
  }
  puffs.instanceMatrix.needsUpdate = true;
  // étincelles de dérapage
  for (let j = 0; j < NS; j++) {
    const ph = t * 2.6 + j / NS, age = (ph % 1) * .38, t0 = t - age, cyc = Math.floor(ph); let on = false;
    if (t >= T.drift && t < T.turbo && t0 >= T.drift) {
      const who = j % 4 === 3 ? 3 : 0, o = st(who, t0), k = driftK(t0 - T.drift + (who ? (5 - 2.4 * (t0 - T.drift)) / 24 : 0));
      if (k > .4) { const f = fr(o.s, o.lat), r1 = hash(j * 3.1 + cyc * 7.7), r2 = hash(j * 5.3 + cyc * 1.9), sd = j % 2 ? 1 : -1;
        const vx = -f.tx * 7 * r1 - f.tz * (4 + 5 * r2), vz = -f.tz * 7 * r1 + f.tx * (4 + 5 * r2), vy = 3 + 5 * r2;
        dummy.position.set(f.x - f.tx * 1.4 - f.tz * sd * .5 + vx * age, .15 + vy * age - 16 * age * age, f.z - f.tz * 1.4 + f.tx * sd * .5 + vz * age);
        dummy.rotation.set(r1 * 6, r2 * 6, 0); dummy.scale.setScalar(1.3 * (1 - age / .38) + .2); on = dummy.position.y > 0; }
    }
    if (!on) { dummy.position.set(0, -50, 0); dummy.scale.setScalar(.001); } dummy.updateMatrix(); sparksM.setMatrixAt(j, dummy.matrix);
  }
  sparksM.instanceMatrix.needsUpdate = true;

  // 3) caméra et ambiance selon le plan
  let sx = 0, sy = 0, mood = 'day', tgt;
  const add = (a) => { sx += a[0]; sy += a[1]; };
  if (t < T.grid) {
    const k = prog(t, 0, T.grid, ease.io); tgt = P(hs + .6, hl * .5, 1.55);
    camLook(camera, P(hs + lerp(7.6, 10.5, k), 2.6 - k * 1.2, 1.5 + k * .9), tgt, 44); add(shake(t, 1.5, 14));
  } else if (t < T.aerial) {
    const u = t - T.go, d = launch(u, 28.5), k = ease.io(inv(0, 1.5, u)); tgt = P(S0 - 9 + d * .9, 0, 1.5);
    camLook(camera, P(S0 - 41 + d * .62, 0, 12.5 - 6 * k), tgt, 50); add(shake(t, T.go, 26, .6));
  } else if (t < T.drift) {
    const u = t - T.aerial, c = fr(hs - 3, 0); tgt = [c.x, 0, c.z];
    camLook(camera, [c.x + 16 - u * 5, 40 - u * 3, c.z + 30], tgt, 46);
  } else if (t < T.turbo) {
    mood = 'sunset'; const k = prog(t, T.drift, T.turbo, ease.io); tgt = P(hs - .5, hl * .7, 1.3);
    camLook(camera, P(hs + lerp(13.5, 9, k), 6.6, 1.7 + k * 1.1), tgt, 46);
  } else if (t < T.items) {
    mood = 'sunset'; const b = boostK(t); tgt = P(hs + 7, hl * .8, 1.7);
    camLook(camera, P(hs - 9.5 - 1.5 * b, hl * .7, 3.5 - .5 * b), tgt, 46 + 15 * b);
    add(shake(t, T.turbo + 1.5, 20, .5)); add(shake(t, T.turbo + 3, 20, .5));
  } else if (t < T.itemsB) {
    mood = 'dusk'; tgt = P(hs + 6, -1.7, 1.6); camLook(camera, P(hs - 8.5, -1.2, 3.3), tgt, 46);
  } else if (t < T.itemsC) {
    mood = 'dusk'; tgt = P(hs - 5, -.8, .9); camLook(camera, P(hs + 9.5, 2.4, 3.6 + (t - T.itemsB) * .5), tgt, 48);
  } else if (t < T.mush) {
    mood = 'dusk'; tgt = P(hs - .3, hl, 1.6); camLook(camera, P(hs + 2.5 - (t - T.itemsC) * 1.2, 7.4, 2.1), tgt, 50); add(shake(t, T.itemsC, 14));
  } else if (t < T.fin) {
    mood = 'dusk'; tgt = P(hs + 7.5, 0, 1); camLook(camera, P(hs - 12.5, hl * .35 + .8, 7.2), tgt, 48); add(shake(t, T_BOING1, 12, .3)); add(shake(t, T_BOING2, 12, .3));
  } else if (t < T.podium) {
    tgt = P(hs + .3, hl, 1.5); camLook(camera, P(S0 + 9, -6.4, 1.5 + inv(T.cross, T.podium, t) * 1.2), tgt, 46); add(shake(t, T.cross, 24, .5));
  } else if (t < T.end) {
    const a = -.55 + (t - T.podium) * .32; tgt = P(SP, 0, 2.6); camLook(camera, P(SP + Math.cos(a) * 11.5, Math.sin(a) * 11.5 * .6, 2.6), tgt, 46);
  } else {
    mood = 'sunset'; const u = t - T.end; tgt = P(hs, 0, 1.5); camLook(camera, P(hs + 11.5, 1.2 + Math.sin(u * .5) * .8, 1.9), P(hs + 1, 0, 5.3), 46);
  }
  setMood(mood, tgt);
  if (t >= T.end) rays(t, { cy: 640, color: 'rgba(255,255,255,.13)', n: 18 });
  if (mood === 'dusk') sparkles(t, { n: 30, y: 0, h: 800, size: 9, color: '#fff6c8', seed: 3 });
  draw3D(scene, camera, { dx: sx, dy: sy });

  // 4) effets 2D
  if (t < T.grid) speedLines(t, { alpha: .28, inner: 620 });
  if (t >= T.turbo && t < T.items) speedLines(t, { alpha: Math.min(.85, boostK(t) * 1.1), color: 'rgba(160,245,255,.7)', inner: 560 });
  if (t >= T.itemsC && t < T.mush) speedLines(t, { alpha: .5, color: 'rgba(255,230,140,.6)', inner: 600, cy: H * .5 });
  if (t >= T.fin && t < T.cross) speedLines(t, { alpha: .3, inner: 640 });
  vignette(mood === 'dusk' ? .42 : .3);
  if (t >= T.cross && t < T.end) confetti(t, T.cross, { n: 140, life: 4.4, cy: H * .36 });
  if (t >= T.cross && t < T.end) confetti(t, T.podium + .2, { n: 90, life: 3, cy: H * .2, power: 1200 });

  // 5) affichages type jeu
  hud(t, T.drift + .25, T.turbo - .15, t < T.drift + 2.1 ? 4 : 3, 1, T.drift + 2.1);
  hud(t, T.turbo + .2, T.items - .15, t < T.turbo + 2.35 ? 3 : 2, 2, T.turbo + 2.35);
  hud(t, T.items + .2, T.mush - .15, t < T.itemsC + .9 ? 3 : 2, 2, T.itemsC + .9);
  hud(t, T.mush + .2, T.fin - .15, t < T.mush + 1.25 ? 3 : 2, 3, T.mush + 1.25);
  hud(t, T.fin + .15, T.podium - .15, t < T.cross ? 2 : 1, 4, T.cross);
  itemSlot(t, T.items + .2, T_POP + .3, 'q'); if (t < T_POP) { /* case vide avant la bulle */ }
  itemSlot(t, T_POP + .3, T.itemsB + .75, 'slime', T_SLIME); itemSlot(t, T.itemsB + .9, T.itemsC, 'q'); itemSlot(t, T.itemsC, T.mush - .15, 'shell', T.itemsC + .25);

  // 6) textes (un message à la fois)
  caption(t, -1, 1.42, 'DES ESCARGOTS…', { ...cap, size: 128, y: 400, color: C.yellow, anim: 'pop', tilt: -4 });
  caption(t, 1.5, T.grid - .12, '…À FUSÉE ?!', { ...cap, size: 190, y: 420, anim: 'slam', grad: ['#fff27a', '#ff6a14'], tilt: -4 });
  caption(t, T.grid + .2, T.go - .08, '8 ESCARGOTS PAR COURSE', { ...cap, size: 96, bg: C.navy, color: C.yellow, y: 1330 });
  caption(t, T.go, T.aerial - .12, 'PARTEZ !', { ...cap, size: 210, y: 470, anim: 'slam', grad: ['#ffffff', '#ffd23f'] });
  caption(t, T.aerial + .12, T.drift - .1, '3 CIRCUITS DÉLIRANTS', { ...cap, size: 104, bg: C.red, y: 1330, inDur: .2 });
  caption(t, T.drift + .3, T.turbo - .2, 'DÉRAPE DANS\nLES VIRAGES', { ...cap, size: 124, y: 1300, anim: 'slide', color: C.yellow, tilt: -3 });
  caption(t, T.turbo + .25, T.turbo + 1.42, 'VISE LES ZONES DE TURBO', { ...cap, size: 96, bg: '#0a2a6b', color: '#8ff3ff', y: 1330 });
  caption(t, T.turbo + 1.5, T.items - .15, 'TURBO !', { ...cap, size: 220, y: 500, anim: 'slam', grad: ['#eaffff', '#27c7ff'], tilt: -5, scale: 1 });
  caption(t, T.items + .2, T.itemsB - .1, '6 OBJETS À RAMASSER', { ...cap, size: 100, bg: C.orange, y: 1330 });
  caption(t, T.itemsB + .1, T.itemsC - .08, 'BAVE GLISSANTE !', { ...cap, size: 112, bg: '#2f9a10', y: 1330 });
  caption(t, T.itemsC + .1, T.mush - .12, 'CARAPACE TURBO !', { ...cap, size: 112, bg: C.orange, y: 1330 });
  caption(t, T.mush + .25, T.fin - .15, 'GARE AUX CHAMPIGNONS\nREBONDISSANTS !', { ...cap, size: 96, y: 1320, anim: 'rise', color: '#ffd9f0' });
  caption(t, T.fin + .2, T.cross - .08, 'DERNIER TOUR !', { ...cap, size: 130, y: 1320, color: C.yellow, tilt: -3 });
  caption(t, T.cross, T.podium - .15, '1ER !', { ...cap, size: 300, y: 520, anim: 'slam', grad: ['#fff27a', '#ff8a1f'], tilt: -5 });
  if (t >= T.podium && t < T.end) { ctx.save(); ctx.globalAlpha = 1 - inv(T.end - .2, T.end, t); ranking(t, T.podium + .3); ctx.restore(); }
  caption(t, T.podium + .4, T.end - .15, 'CLASSEMENT ET RÉCOMPENSES', { ...cap, size: 84, bg: C.navy, color: C.yellow, y: 1400 });

  // 7) transitions
  flash(t, T.grid, .3); wipe(t, T.aerial, { dur: .36, color: C.yellow, color2: C.red }); flash(t, T.drift, .3, '255,170,90');
  wipe(t, T.turbo, { dur: .4, color: C.cyan, color2: '#ffffff', dir: 'right' }); flash(t, T.turbo + 1.5, .3, '160,245,255', .6); flash(t, T.turbo + 3, .3, '160,245,255', .5);
  flash(t, T.items, .3, '200,150,255'); flash(t, T.itemsB, .16, '255,255,255', .6); flash(t, T.itemsC, .3, '255,220,120', .9);
  wipe(t, T.mush, { dur: .4, color: C.violet, color2: C.pink, dir: 'up' }); flash(t, T.fin, .3); flash(t, T.cross, .45, '255,255,255', .9);
  wipe(t, T.podium, { dur: .4, color: C.yellow, color2: '#ffffff' }); flash(t, T.end, .4);

  // 8) écran final
  if (t >= T.end) {
    const k = inv(T.end, T.end + .5, t), g = ctx.createLinearGradient(0, 0, 0, 1250); g.addColorStop(0, `rgba(20,14,60,${.72 * k})`); g.addColorStop(.75, `rgba(20,14,60,${.45 * k})`); g.addColorStop(1, 'rgba(20,14,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1250);
    sparkles(t, { n: 22, y: 230, h: 760, size: 13, color: '#fff3b0', seed: 9 });
    endCard(t, T.end + .15, { title: 'SNAIL RALLY', tagline: 'La course d\'escargots à fusée', status: 'bientot', font: 'Bangers', titleSize: 190, titleGrad: ['#fff27a', '#ff8a1f'], accent: C.red, y: 690 });
  }
}

registerAd({ duration: DURATION, thumbTime: T.turbo + 1.9, render,
  music: { style: 'racing', bpm: 160, sections: [[0, 'build'], [T.grid, 'break'], [T.go, 'drop'], [T.drift, 'drop'], [T.turbo, 'drop2'], [T.items, 'drop'], [T.mush, 'build'], [T.fin, 'drop2'], [T.podium, 'drop']], end: T.end, seed: 13 } });
