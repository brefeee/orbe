// Publicité « Simulateur d'Autoroute » : 1080x1920, 17 mesures à 118 bpm (34,6 s). Tout est créé par ce code.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, noise1, shake, DEG, rgba, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, rbox, addLights,
  makeCharacter, poseIdle, poseCheer, tree, bushyTree, ground, glow, sign, canvasTex, ctx, bg, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect,
  text, caption, pill, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Russo', 'Inter']);
const BPM = 118, BAR = 240 / BPM;
const T = { hook: 0, s1: 2 * BAR, s2: 4 * BAR, s3: 6 * BAR, s4: 8 * BAR, s5: 10 * BAR, s6: 12 * BAR, end: 14 * BAR }, DURATION = 17 * BAR;
const C = { pink: '#ff2e88', orange: '#ff8a3c', yellow: '#ffd23f', violet: '#3b1a6e', cyan: '#29e0ff', night: '#120a2e', asphalt: '#30333d', grass: '#63b85c', white: '#f4f6fa' };
const mod = (a, n) => ((a % n) + n) % n;
const wrap = (z, L = 320, lo = -160) => mod(z - lo, L) + lo;
const ss = (a, b, x) => { const k = inv(a, b, x); return k * k * (3 - 2 * k); };

// ====================================================================== scène
gl3D({ exposure: 1.05 });
const scene = new THREE.Scene(), camera = makeCamera(50);
const lights = addLights(scene, { shadowArea: 42, shadowMap: 1536 });
lights.sun.shadow.camera.far = 140; lights.sun.shadow.camera.updateProjectionMatrix();
scene.fog = new THREE.Fog('#d4ecf9', 60, 165);
scene.add(ground(1400, C.grass, { y: -0.05 }));
const roadG = new THREE.Group(), tollG = new THREE.Group(), plotsG = new THREE.Group(); scene.add(roadG, tollG, plotsG);

const lineMat = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .7, emissive: '#000000' });
const edgeMat = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .7, emissive: '#000000' });
const beamTex = canvasTex(64, (g, n) => { const gr = g.createRadialGradient(n / 2, n * .8, 0, n / 2, n * .5, n * .52); gr.addColorStop(0, 'rgba(255,244,200,.9)'); gr.addColorStop(.5, 'rgba(255,240,190,.3)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); });
const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 });
function inst(geo, material, list, { cast = false } = {}) {
  const m = new THREE.InstancedMesh(geo, material, list.length), d = new THREE.Object3D();
  list.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.rotation.set(0, p[3] ?? 0, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; return m;
}

// ---------------------------------------------------------------- autoroute principale (axe Z, on roule vers -Z)
const RL = 720;
roadG.add(box(44, .1, RL, C.asphalt, { rough: .95, pos: [0, 0, 0], cast: false }));
for (const x of [-21.6, 21.6]) roadG.add(box(2.4, .12, RL, '#4a4e5a', { rough: 1, pos: [x, 0, 0], cast: false }));            // bandes d'arrêt
for (const x of [-19.6, -1.6, 1.6, 19.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.34, .05, RL), edgeMat); l.position.set(x, .06, 0); roadG.add(l); }
roadG.add(box(1.5, 1.15, RL, '#b9bec9', { rough: .9, pos: [0, .57, 0] }));                                                      // séparateur central en béton
roadG.add(box(1.0, .12, RL, '#8b909c', { pos: [0, 1.2, 0] }));
const dashList = []; for (let z = -255; z < 255; z += 15) for (const x of [-13, -7, 7, 13]) dashList.push([x, .06, z]);
const dashes = inst(new THREE.BoxGeometry(.34, .05, 5.5), lineMat, dashList); roadG.add(dashes);
const reflList = []; for (let z = -252; z < 252; z += 12) for (const x of [-.78, .78]) reflList.push([x, .8, z]);
const refl = inst(new THREE.BoxGeometry(.08, .32, .9), mat(C.orange, { emissive: C.orange, emissiveI: .6 }), reflList); roadG.add(refl);
for (const x of [-23.2, 23.2]) { roadG.add(box(.16, .5, RL, '#c9ced8', { rough: .4, pos: [x, 1.0, 0] })); roadG.add(box(.2, .12, RL, '#9aa0ad', { pos: [x, 1.32, 0] })); }  // glissières
const postList = []; for (let z = -252; z < 252; z += 6) for (const x of [-23.35, 23.35]) postList.push([x, .6, z]);
const posts = inst(new THREE.BoxGeometry(.22, 1.2, .22), mat('#8e94a1'), postList); roadG.add(posts);
// lampadaires (période 48)
const lampG = new THREE.Group(), lampGlows = []; roadG.add(lampG);
for (let z = -240; z <= 240; z += 48) for (const s of [-1, 1]) {
  const x = s * 25; lampG.add(cyl(.2, .28, 12, '#5d6370', { seg: 8, pos: [x, 6, z] })); lampG.add(box(4.4, .22, .26, '#5d6370', { pos: [x - s * 2.1, 11.9, z] }));
  lampG.add(box(1.5, .22, .7, '#fff3c4', { emissive: '#ffe9a0', emissiveI: 1.3, pos: [x - s * 4.2, 11.72, z], cast: false }));
  const gl = glow('#ffd98a', 7, .8); gl.position.set(x - s * 4.2, 11.4, z); lampG.add(gl); lampGlows.push(gl);
}
// éléments uniques qui reviennent tous les 320 (portique, panneaux, arbres)
const wrapItems = [];
const addWrap = (o, z0) => { roadG.add(o); wrapItems.push({ o, z0 }); };
function gantry() {
  const g = new THREE.Group();
  for (const x of [.0, 24.6]) g.add(box(.7, 11, .7, '#6b7180', { pos: [x, 5.5, 0] }));
  g.add(box(25.3, .5, .6, '#6b7180', { pos: [12.3, 10.9, 0] })); g.add(box(25.3, .3, .5, '#6b7180', { pos: [12.3, 8.3, 0] }));
  const draw = (c, w, h) => {
    c.fillStyle = '#1657c4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = h * .05; c.strokeRect(h * .06, h * .06, w - h * .12, h - h * .12);
    c.fillStyle = '#fff'; c.font = `400 ${h * .4}px "Russo"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PÉAGE', w * .5, h * .36);
    for (let i = 0; i < 3; i++) { const x = w * (.22 + i * .28), y = h * .76, s = h * .13; c.beginPath(); c.moveTo(x - s, y - s * .6); c.lineTo(x + s, y - s * .6); c.lineTo(x, y + s); c.fill(); }
  };
  g.add(box(17.4, 4.6, .25, '#0f3d8c', { pos: [10.4, 9.6, -.05] }));
  g.add(sign(17, 4.25, draw, { res: 512, emissive: true, pos: [10.4, 9.6, .1] }));
  return g;
}
addWrap(gantry(), -70);
function roundSign(label, col = '#e3242b') {
  const g = new THREE.Group(); g.add(cyl(.12, .12, 5, '#7b808c', { seg: 8, pos: [0, 2.5, 0] }));
  g.add(cyl(1.25, 1.25, .12, '#ffffff', { rot: [Math.PI / 2, 0, 0], pos: [0, 5.2, 0] }));
  g.add(sign(2.4, 2.4, (c, w) => { c.fillStyle = col; c.beginPath(); c.arc(w / 2, w / 2, w * .49, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, w / 2, w * .37, 0, 7); c.fill(); c.fillStyle = '#111'; c.font = `400 ${w * .34}px "Russo"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, w * .53); }, { res: 128, pos: [0, 5.2, .08] }));
  return g;
}
{ const s1 = roundSign('130'); s1.position.x = 25.6; addWrap(s1, 40); const s2 = roundSign('130'); s2.position.x = 25.6; addWrap(s2, -130); }
function kmPost() { const g = new THREE.Group(); g.add(box(.5, 1.6, .5, '#ffffff', { pos: [0, .8, 0] })); g.add(box(.52, .5, .52, C.pink, { pos: [0, 1.5, 0] })); return g; }
for (let i = 0; i < 8; i++) { const k = kmPost(); k.position.x = (i % 2 ? -1 : 1) * 24.4; addWrap(k, -150 + i * 40 + 9); }
for (let i = 0; i < 30; i++) {
  const s = i % 2 ? -1 : 1, tr = (hash(i * 3.1) > .45 ? tree : bushyTree)(5 + hash(i) * 4, ['#3fae4a', '#49b356', '#2f9a52', '#5cc06a'][i % 4]);
  tr.position.x = s * (30 + hash(i * 7.7) * 46); tr.scale.setScalar(1.25); addWrap(tr, -160 + i * (320 / 30) + hash(i * 5) * 6);
}
for (let i = 0; i < 12; i++) { const b = ball(1.5 + hash(i) * 1.2, '#4aa651', { seg: 8, seg2: 6, flat: true }); b.scale.y = .7; b.position.set((i % 2 ? -1 : 1) * (27 + hash(i * 9) * 8), .6, 0); addWrap(b, -160 + i * 26.6 + 13); }

// ---------------------------------------------------------------- voitures en blocs (avant vers -Z)
const glassM = mat('#16263f', { rough: .15, emissive: '#0b1d3a', emissiveI: .7 }), DARK = '#15171d';
function makeCar(type, color, accent = '#ffffff') {
  const g = new THREE.Group(); g.wheels = []; g.heads = []; g.tails = []; const R = Math.PI / 2;
  const wheel = (x, z, r = .82, w = .66) => {
    const p = new THREE.Group(); p.position.set(x, r, z); p.userData.r = r;
    p.add(cyl(r, r, w, '#17181d', { rot: [0, 0, R], rough: .95, seg: 18 })); p.add(cyl(r * .6, r * .6, w + .06, '#d9dde6', { rot: [0, 0, R], rough: .3, seg: 12 }));
    p.add(box(w + .12, r * 1.08, r * .24, '#5f6572')); p.add(box(w + .12, r * .24, r * 1.08, '#5f6572')); g.add(p); g.wheels.push(p);
  };
  const lightsAt = (zF, zB, y, xo, big = 1) => {
    for (const s of [-1, 1]) {
      g.add(box(.95, .36, .16, '#fff6cf', { emissive: '#fff0b0', emissiveI: 1.6, pos: [s * xo, y, zF - .04], cast: false }));
      const h = glow('#fff1b8', 3.2 * big, .9); h.position.set(s * xo, y, zF - .35); g.add(h); g.heads.push(h);
      g.add(box(1.0, .3, .16, '#ff2a3a', { emissive: '#ff1a2a', emissiveI: 1.6, pos: [s * xo, y + .05, zB + .04], cast: false }));
      const r = glow('#ff2a3a', 2.6 * big, .9); r.position.set(s * xo, y + .05, zB + .35); g.add(r); g.tails.push(r);
    }
    const b = new THREE.Mesh(new THREE.PlaneGeometry(9, 20), beamMat); b.rotation.x = -R; b.position.set(0, .14, zF - 9.5); g.add(b);
    g.add(box(1.5, .42, .08, '#f7f7f2', { pos: [0, y - .5, zB + .1], cast: false }));
  };
  if (type === 'truck') {
    g.front = 9.6;
    g.add(box(3.4, .7, 18.4, DARK, { pos: [0, 1.15, 0] }));
    const cab = rbox(3.6, 3.5, 4.5, .55, color, { rough: .35 }); cab.rotation.y = R; cab.position.set(0, 3.0, -7.6); g.add(cab);
    g.add(box(4.0, 1.25, .2, glassM, { pos: [0, 3.75, -9.42], cast: false })); for (const s of [-1, 1]) g.add(box(.12, 1.1, 1.7, glassM, { pos: [s * 2.27, 3.75, -8.1], cast: false }));
    g.add(box(4.3, .9, .3, DARK, { pos: [0, 1.5, -9.45] })); g.add(box(4.0, .5, .2, '#8b909c', { pos: [0, 2.5, -9.44] }));
    g.add(box(4.6, 5.0, 13.6, C.white, { rough: .6, pos: [0, 4.05, 2.4] })); g.add(box(4.66, 1.0, 13.62, color, { pos: [0, 2.6, 2.4], cast: false })); g.add(box(4.66, .3, 13.62, accent, { pos: [0, 5.6, 2.4], cast: false }));
    for (const z of [-7.4, 4.6, 6.9]) for (const s of [-1, 1]) wheel(s * 2.0, z, .98, .8);
    lightsAt(-9.6, 9.2, 1.65, 1.55, 1.15);
  } else if (type === 'van') {
    g.front = 4.5;
    const b = rbox(8.8, 3.0, 4.3, .7, color, { rough: .4 }); b.rotation.y = R; b.position.y = 2.25; g.add(b);
    g.add(box(4.36, .32, 8.0, DARK, { pos: [0, .78, 0] }));
    g.add(box(3.7, 1.1, .2, glassM, { pos: [0, 2.95, -4.36], rot: [-.12, 0, 0], cast: false })); for (const s of [-1, 1]) { g.add(box(.1, 1.0, 2.2, glassM, { pos: [s * 2.17, 2.9, -2.6], cast: false })); g.add(box(.1, .35, 8.2, accent, { pos: [s * 2.17, 1.7, 0], cast: false })); }
    for (const z of [-2.9, 2.9]) for (const s of [-1, 1]) wheel(s * 1.85, z);
    lightsAt(-4.42, 4.42, 1.5, 1.45);
  } else {
    const sport = type === 'sport', L = sport ? 9.6 : 9; g.front = L / 2;
    const b = rbox(L, sport ? 1.1 : 1.3, 4.3, .5, color, { rough: .3 }); b.rotation.y = R; b.position.y = sport ? 1.2 : 1.32; g.add(b);
    g.add(box(4.36, .34, L - .9, DARK, { pos: [0, .68, 0] }));
    const cz = sport ? .9 : .55, cy = sport ? 2.15 : 2.42, cl = sport ? 4.2 : (type === 'hatch' ? 5.6 : 4.9), ch = sport ? .95 : 1.15;
    const cab = rbox(cl, ch, 3.7, .48, glassM); cab.rotation.y = R; cab.position.set(0, cy, cz); g.add(cab);
    const roof = rbox(cl - .9, .2, 3.76, .09, color, { rough: .3 }); roof.rotation.y = R; roof.position.set(0, cy + ch / 2 - .02, cz); g.add(roof);
    g.add(box(3.78, ch - .1, .3, color, { pos: [0, cy - .04, cz + .2] }));
    for (const s of [-1, 1]) g.add(box(.3, .22, .45, color, { pos: [s * 2.2, sport ? 1.85 : 2.05, cz - cl / 2 + .5] }));           // rétroviseurs
    g.add(box(2.4, .3, .12, DARK, { pos: [0, sport ? .95 : 1.05, -L / 2 - .02] }));
    if (sport) { for (const s of [-1, 1]) { g.add(box(.5, .04, 3.4, accent, { pos: [s * .5, 1.765, -2.9], cast: false })); g.add(box(.2, .6, .3, DARK, { pos: [s * 1.5, 2.0, 4.2] })); } g.add(box(4.4, .16, 1.0, color, { pos: [0, 2.36, 4.25] })); }
    else g.add(box(.1, .2, L - 1.6, accent, { pos: [2.16, 1.45, 0], cast: false }), box(.1, .2, L - 1.6, accent, { pos: [-2.16, 1.45, 0], cast: false }));
    const wr = sport ? .86 : .82; for (const z of [-L / 2 + 1.9, L / 2 - 1.9]) for (const s of [-1, 1]) wheel(s * 1.88, z, wr);
    lightsAt(-L / 2, L / 2, sport ? 1.3 : 1.45, 1.45);
  }
  scene.add(g); return g;
}
const hero = makeCar('sport', '#ff2e6e', '#ffffff');
const carDefs = [['sedan', '#2f7de1', '#bfe0ff'], ['hatch', '#ffd23f', '#3b2a00'], ['van', '#f4f6fa', C.pink], ['sedan', '#19c37d', '#d6ffe9'], ['sport', '#29e0ff', '#0b2b3a'], ['hatch', '#ff8a3c', '#fff0d6'], ['sedan', '#f4f6fa', '#9aa0ad'],
  ['van', '#7c4dff', '#e6dcff'], ['sedan', '#e23b3b', '#ffd6d6'], ['hatch', '#22b8cf', '#e0fbff'], ['sport', '#ffd23f', '#1b1b22'], ['sedan', '#3a3f4f', '#c0c5d0'], ['hatch', '#ff6fb5', '#fff'], ['van', '#ff8a3c', '#fff']];
const cars = carDefs.map(d => makeCar(...d));
const trucks = [makeCar('truck', '#2f7de1', C.yellow), makeCar('truck', '#e23b3b', '#ffffff'), makeCar('truck', '#19c37d', C.yellow)];
const allCars = [hero, ...cars, ...trucks];
function place(car, x, z, dist, back = false, y = 0) {
  car.visible = true; car.position.set(x, y, z); car.rotation.set(0, back ? Math.PI : 0, 0);
  for (const w of car.wheels) w.rotation.x = -dist / w.userData.r;
}
// trafic des plans roulants : [voiture, voie x, vitesse, z de départ]
const traffic = [[cars[0], 4, 62, -44], [cars[1], 16, 50, -26], [cars[2], 4, 60, -112], [cars[3], 16, 48, -92], [cars[4], 4, 64, 62], [cars[5], 16, 52, 44], [trucks[0], 16, 44, -146], [trucks[1], 16, 45, 112],
  [cars[6], -4, 70, -60], [cars[7], -10, 60, -130], [cars[8], -16, 55, -20], [cars[9], -4, 68, 100], [cars[10], -10, 62, 30], [cars[11], -16, 50, -100], [cars[12], -10, 58, 140], [cars[13], -4, 66, -150], [trucks[2], -16, 46, 70]];

// ---------------------------------------------------------------- gare de péage (z = 0)
const LANES = [4, 10, 16, -4, -10, -16], barriers = [], tollLights = [];
{
  const roofY = 8.6;
  tollG.add(box(47, 1.0, 10, C.white, { pos: [0, roofY, 1.5], rough: .5 }));
  tollG.add(box(47.2, .5, 10.2, C.pink, { pos: [0, roofY - .35, 1.5], emissive: C.pink, emissiveI: .35 }));
  tollG.add(box(47.3, .16, 10.3, C.cyan, { pos: [0, roofY + .58, 1.5], emissive: C.cyan, emissiveI: .5 }));
  const drawP = (c, w, h) => { c.fillStyle = '#12224f'; c.fillRect(0, 0, w, h); c.strokeStyle = C.yellow; c.lineWidth = h * .07; c.strokeRect(h * .07, h * .07, w - h * .14, h - h * .14); c.fillStyle = '#fff'; c.font = `400 ${h * .62}px "Russo"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PÉAGE', w / 2, h * .54); };
  for (const [z, ry] of [[-3.7, Math.PI], [6.7, 0]]) { tollG.add(box(15, 3.6, .3, '#0c1838', { pos: [10, roofY + 2.3, z - Math.sign(z - 1) * .2] })); tollG.add(sign(14.6, 3.3, drawP, { res: 512, emissive: true, pos: [10, roofY + 2.3, z], rot: [0, ry, 0] })); }
  for (const x of [-22, -13, -7, 0, 7, 13, 22]) {
    const isl = rbox(13, .55, 1.7, .25, '#c3c8d2'); isl.rotation.y = Math.PI / 2; isl.position.set(x, .3, 1.5); tollG.add(isl);
    for (const z of [-5.2, 8.2]) { tollG.add(cyl(.5, .6, 1.3, C.yellow, { seg: 10, pos: [x, .95, z] })); tollG.add(cyl(.52, .56, .3, '#1b1b22', { seg: 10, pos: [x, 1.0, z] })); }
    tollG.add(box(.6, roofY, .6, '#aab0bd', { pos: [x, roofY / 2, 5.6] }));
    if (Math.abs(x) < 20) {            // cabine
      tollG.add(rbox(1.5, 3.1, 3.0, .15, '#f1f3f7', { pos: [x, 2.1, 2.6] })); tollG.add(box(1.56, 1.0, 2.4, glassM, { pos: [x, 2.75, 2.6], cast: false }));
      tollG.add(box(1.9, .25, 3.4, C.pink, { pos: [x, 3.75, 2.6] })); tollG.add(box(1.58, .3, 3.04, C.cyan, { pos: [x, 1.0, 2.6], emissive: C.cyan, emissiveI: .3, cast: false }));
    }
  }
  LANES.forEach((cx, i) => {
    const px = cx + 2.55; tollG.add(box(.5, 1.7, .5, '#3a3f4f', { pos: [px, 1.4, 0] }));
    const arm = new THREE.Group(); arm.position.set(px, 2.0, 0);
    for (let k = 0; k < 6; k++) arm.add(box(.86, .26, .2, k % 2 ? '#ffffff' : '#e3242b', { pos: [-.5 - k * .85, 0, 0] }));
    tollG.add(arm); barriers.push(arm);
    const red = ball(.34, '#ff2a3a', { emissive: '#ff1a2a', emissiveI: 2, pos: [cx, roofY - 1.0, -3.6], cast: false, seg: 10, seg2: 8 }), grn = ball(.34, '#3dff7a', { emissive: '#2dff6a', emissiveI: 2, pos: [cx, roofY - 1.0, -3.6], cast: false, seg: 10, seg2: 8 });
    const rb = ball(.34, '#ff2a3a', { emissive: '#ff1a2a', emissiveI: 2, pos: [cx, roofY - 1.0, 6.6], cast: false, seg: 10, seg2: 8 }), gb = ball(.34, '#3dff7a', { emissive: '#2dff6a', emissiveI: 2, pos: [cx, roofY - 1.0, 6.6], cast: false, seg: 10, seg2: 8 });
    tollG.add(box(1.2, 1.2, .3, '#1b1b22', { pos: [cx, roofY - 1.0, -3.4] }), box(1.2, 1.2, .3, '#1b1b22', { pos: [cx, roofY - 1.0, 6.4] }), red, grn, rb, gb); tollLights.push([red, grn, rb, gb]);
  });
}
// passage d'une voiture au péage : u = secondes depuis son arrivée ; a = durée du freinage, w = arrêt
function tollZ(u, a, w, stop) { if (u < a) return stop + 75 * Math.pow(1 - clamp(u / a), 3); const x = Math.max(0, u - a - w); return stop - 30 * x * x - 4 * x; }
const tollOpen = (u, a, w) => ss(a + .03, a + .26, u) * (1 - ss(a + w + .58, a + w + .86, u));

// ---------------------------------------------------------------- emplacements des joueurs (plan « chacun son autoroute »)
const PLOT_X = [6, 26, 46, 66], PLOT_TZ = [0, -8, -19, -30], players = [];
{
  const dl = [], shirts = ['#ff2e88', '#29b6ff', '#ffd23f', '#45d483'], hats = ['cap', 'none', 'helmet', 'cap'];
  PLOT_X.forEach((x, k) => {
    plotsG.add(box(14, .1, 420, C.asphalt, { rough: .95, pos: [x, 0, 0], cast: false }));
    for (const s of [-1, 1]) { plotsG.add(box(.3, .05, 420, '#f4f4f0', { pos: [x + s * 6.4, .06, 0], cast: false })); plotsG.add(box(.16, .5, 420, '#c9ced8', { pos: [x + s * 7.4, 1.0, 0] })); }
    for (let z = -200; z < 200; z += 15) dl.push([x, .06, z]);
    const tz = PLOT_TZ[k];
    plotsG.add(box(17, .8, 6, C.white, { pos: [x, 7.4, tz] })); plotsG.add(box(17.2, .4, 6.2, C.pink, { pos: [x, 7.1, tz], emissive: C.pink, emissiveI: .3 }));
    for (const s of [-1, 0, 1]) { plotsG.add(box(.6, 7, .6, '#aab0bd', { pos: [x + s * 7.9, 3.5, tz] })); if (s) plotsG.add(rbox(1.5, 2.8, 2.6, .15, '#f1f3f7', { pos: [x + s * 7.9, 1.6, tz + 2] })); }
    plotsG.add(sign(9, 2.1, (c, w, h) => { c.fillStyle = '#12224f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `400 ${h * .66}px "Russo"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PÉAGE', w / 2, h * .55); }, { res: 256, emissive: true, pos: [x, 9.0, tz + 3.1] }));
    plotsG.add(box(9.3, 2.4, .3, '#0c1838', { pos: [x, 9.0, tz + 2.9] }));
    for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(x + s * 3.2 + 2.4, 2, tz + 3.2); for (let j = 0; j < 5; j++) arm.add(box(.86, .24, .2, j % 2 ? '#fff' : '#e3242b', { pos: [-.5 - j * .85, 0, 0] })); arm.rotation.z = -1.25; plotsG.add(arm); plotsG.add(box(.45, 1.6, .45, '#3a3f4f', { pos: [x + s * 3.2 + 2.4, 1.3, tz + 3.2] })); }
    const ch = makeCharacter({ shirt: shirts[k], pants: '#27324f', hat: hats[k], hatColor: ['#29e0ff', '', '#ff8a3c', '#ff2e88'][k], hair: k === 1 ? '#3b2a1e' : undefined, face: 'happy' });
    ch.position.set(x - 10.3, 0, tz + 6); plotsG.add(ch); players.push(ch);
    plotsG.add(cyl(2.2, 2.4, .3, ['#ff2e88', '#29b6ff', '#ffd23f', '#45d483'][k], { pos: [x - 10.3, .15, tz + 6], seg: 20 }));
    for (let j = 0; j < 4; j++) { const tr = (j % 2 ? tree : bushyTree)(5 + hash(k * 7 + j) * 3); tr.position.set(x - 10 + (hash(j + k) - .5) * 3, 0, tz - 22 - j * 30 - hash(k + j * 3) * 10); plotsG.add(tr); }
  });
  plotsG.add(inst(new THREE.BoxGeometry(.3, .05, 5.5), lineMat, dl));
}

// ====================================================================== ambiances (jour, doré, coucher de soleil, nuit)
const LOOKS = {
  day: { sky: [[0, '#1f7fe0'], [.6, '#7cc6ff'], [1, '#e2f4ff']], fog: '#d4ecf9', fogN: 70, fogF: 175, sun: '#fff4dd', sunI: 2.9, dir: [9, 15, 7], hs: '#cfe6ff', hg: '#7d8a6a', amb: 1.2, glow: .3, beam: 0, hills: ['#9cc4e4', '#74ad8a'], em: '#000000', sunDisc: 0 },
  gold: { sky: [[0, '#3a7bd5'], [.55, '#ffb98a'], [1, '#ffe7bf']], fog: '#ffe2bd', fogN: 70, fogF: 175, sun: '#ffd9a0', sunI: 2.9, dir: [-10, 9, 6], hs: '#ffe0c0', hg: '#8a7a5a', amb: 1.15, glow: .55, beam: .12, hills: ['#f0a988', '#b98a6a'], em: '#000000', sunDisc: 0 },
  sunset: { sky: [[0, '#24115a'], [.42, '#a02a90'], [.74, '#ff5f5a'], [1, '#ffc65a']], fog: '#ff9f66', fogN: 55, fogF: 170, sun: '#ffb070', sunI: 2.5, dir: [-6, 5.5, -14], hs: '#ffa6cf', hg: '#5a3a6a', amb: 1.35, glow: 1, beam: .5, hills: ['#8a2a7e', '#4b1a5e'], em: '#3a2a10', sunDisc: 1 },
  night: { sky: [[0, '#06041a'], [.5, '#27105c'], [.82, '#8a1f9a'], [1, '#ff4fa0']], fog: '#7a2390', fogN: 55, fogF: 170, sun: '#a9b6ff', sunI: 1.5, dir: [5, 12, 7], hs: '#9a8aff', hg: '#3a1050', amb: 1.5, glow: 1.25, beam: .8, hills: ['#2f1066', '#170a3c'], em: '#18c8ff', sunDisc: 2 },
};
function setLook(L) {
  scene.fog.color.set(L.fog); scene.fog.near = L.fogN; scene.fog.far = L.fogF;
  lights.sun.color.set(L.sun); lights.sun.intensity = L.sunI; const n = 60 / Math.hypot(...L.dir); lights.sun.position.set(L.dir[0] * n, L.dir[1] * n, L.dir[2] * n);
  lights.hemi.color.set(L.hs); lights.hemi.groundColor.set(L.hg); lights.hemi.intensity = L.amb;
  lineMat.emissive.set(L.em); edgeMat.emissive.set(L.sunDisc === 2 ? '#ff2e88' : L.em); beamMat.opacity = L.beam;
  for (const c of allCars) { for (const g of c.heads) g.material.opacity = Math.min(1, L.glow); for (const g of c.tails) g.material.opacity = Math.min(1, L.glow * .9); }
  for (const g of lampGlows) g.material.opacity = L.glow > .9 ? Math.min(1, L.glow * .8) : 0;
}
const _v = new THREE.Vector3(), _f = new THREE.Vector3();
function P(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x + 1) / 2 * W, (1 - _v.y) / 2 * H, _v.z]; }
function sky(L, t) {
  camera.updateMatrixWorld(); camera.getWorldDirection(_f); const hl = Math.hypot(_f.x, _f.z) || 1, yaw = Math.atan2(_f.x, -_f.z);
  const hy = clamp(P(camera.position.x + _f.x / hl * 4000, 0, camera.position.z + _f.z / hl * 4000)[1], -200, H + 200);
  ctx.fillStyle = L.fog; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, hy - 1250, 0, hy); L.sky.forEach(s => g.addColorStop(s[0], s[1])); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, hy));
  if (L.sunDisc === 2) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { const tw = .5 + .5 * Math.sin(t * (2 + hash(i) * 3) + i); ctx.globalAlpha = .35 + .6 * tw; const s = 2 + hash(i * 3) * 4; ctx.fillRect(hash(i * 7.1) * W, hash(i * 2.3) * (hy - 260), s, s); } ctx.globalAlpha = 1; }
  if (L.sunDisc) {                                    // soleil rayé façon synthwave, vers -Z
    const sp = P(camera.position.x - 60, 330, camera.position.z - 4000);
    if (sp[2] < 1) {
      const r = L.sunDisc === 2 ? 250 : 215, sx = sp[0], sy = Math.min(sp[1], hy - r * .35);
      const gl = ctx.createRadialGradient(sx, sy, r * .5, sx, sy, r * 2.6); gl.addColorStop(0, L.sunDisc === 2 ? 'rgba(255,80,170,.55)' : 'rgba(255,220,130,.7)'); gl.addColorStop(1, 'rgba(255,120,120,0)'); ctx.fillStyle = gl; ctx.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip(); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.clip();
      const sg = ctx.createLinearGradient(0, sy - r, 0, sy + r); sg.addColorStop(0, '#fff27a'); sg.addColorStop(.5, '#ff9a3c'); sg.addColorStop(1, '#ff2e88'); ctx.fillStyle = sg; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      ctx.fillStyle = L.sunDisc === 2 ? '#a02597' : '#ff8a5c';
      for (let i = 0; i < 7; i++) { const k = (i + mod(t * .35, 1)) / 7, y = sy + r * (-.05 + k * 1.05), hgt = 4 + k * 22; ctx.fillRect(sx - r, y, r * 2, hgt); }
      ctx.restore();
    }
  } else {                                            // soleil de jour + nuages
    const sp = P(camera.position.x + 1500, 2300, camera.position.z - 4000);
    if (sp[2] < 1) { const gl = ctx.createRadialGradient(sp[0], sp[1], 10, sp[0], sp[1], 330); gl.addColorStop(0, 'rgba(255,255,240,1)'); gl.addColorStop(.18, 'rgba(255,250,210,.85)'); gl.addColorStop(1, 'rgba(255,250,210,0)'); ctx.fillStyle = gl; ctx.fillRect(sp[0] - 340, sp[1] - 340, 680, 680); }
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 7; i++) { const cx = mod(hash(i * 3.3) * 1900 - yaw * 1500 + t * (6 + i), 1900) - 400, cy = hy - 240 - hash(i * 5.1) * 900, s = 60 + hash(i) * 70; for (const [dx, dy, rr] of [[0, 0, 1], [1.1, .1, .75], [-1.1, .12, .8], [.4, -.45, .7], [-.5, -.35, .6]]) { ctx.beginPath(); ctx.ellipse(cx + dx * s, cy + dy * s, rr * s, rr * s * .72, 0, 0, 7); ctx.fill(); } }
  }
  L.hills.forEach((col, li) => {                      // reliefs lointains
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, hy + 6);
    for (let x = -10; x <= W + 30; x += 30) { const u = (x + yaw * 1700) * (li ? .0042 : .0026) + li * 31; ctx.lineTo(x, hy + 4 - (li ? 46 : 120) * (noise1(u, li) * .75 + noise1(u * 2.7, li + 5) * .25) - (li ? 8 : 26)); }
    ctx.lineTo(W + 30, hy + 6); ctx.fill();
  });
}

// ====================================================================== bruitages
const TOLL_A = 1.1, TOLL_W = .5, TOLL_P = 2.2, TOLL_OFF = [0, .7, 1.4, .35, 1.05, 1.75], TOLL_U0 = .9;
const UP_A = .8, UP_W = .3, UP_P = 1.3, UP_U0 = .5;
const tollPays = []; for (let j = 0; j < 3; j++) for (let m = 0; m < 3; m++) { const tt = T.s2 + TOLL_A + .35 - TOLL_U0 + TOLL_OFF[j] + m * TOLL_P; if (tt > T.s2 + .1 && tt < T.s3 - .15) tollPays.push({ t: tt, lane: j, n: tollPays.length }); }
tollPays.sort((a, b) => a.t - b.t).forEach((p, i) => p.n = i);
const upPays = []; for (let m = 0; m < 4; m++) { const tt = T.s3 + UP_A + .15 - UP_U0 + m * UP_P; if (tt < T.s4 - .2) upPays.push({ t: tt, n: m }); }
const upClicks = [T.s3 + 1.1, T.s3 + 2.4];
cue(0, 'engine', .9, 4); cue(.05, 'whoosh'); cue(.15, 'impact', .8); cue(1.25, 'swish', .7); cue(2.4, 'horn', .5); cue(3.1, 'swish', .6);
cue(T.s1, 'impact'); cue(T.s1 + .05, 'engine', .5, 3.5); cue(T.s1 + .3, 'pop'); cue(T.s1 + 1.4, 'swish', .6); cue(T.s1 + 2.6, 'swish', .6); cue(T.s2 - .25, 'whoosh');
cue(T.s2, 'thud', .8); cue(T.s2 + .3, 'pop'); for (const p of tollPays) { cue(p.t - .3, 'slide', .5); cue(p.t, 'coin', .9); }
cue(T.s3 - .2, 'whoosh'); cue(T.s3, 'impact', .8); for (const p of upPays) cue(p.t, 'coin', .9); for (const c of upClicks) { cue(c, 'click'); cue(c + .08, 'powerup', .8); }
cue(T.s4, 'impact'); cue(T.s4 + .05, 'engine', .8, 3.8); cue(T.s4 + .9, 'swish', .7); cue(T.s4 + 1.7, 'horn', .5); cue(T.s4 + 2.5, 'swish', .7); cue(T.s5 - 1.6, 'riser', .9, 1.6);
cue(T.s5, 'boom'); cue(T.s5 + .12, 'win', .9); cue(T.s5 + .1, 'engine', .7, 3.5); cue(T.s5 + 1.5, 'zap', .5); cue(T.s5 + 2.6, 'swish', .6); cue(T.s6 - .25, 'whoosh');
cue(T.s6, 'impact', .8); cue(T.s6 + .35, 'pop'); cue(T.s6 + 1.2, 'ding', .7); cue(T.s6 + 2.0, 'ding', .7); cue(T.s6 + 2.8, 'ding', .7); cue(T.end - .9, 'sweepdown', .7);
cue(T.end, 'impact'); cue(T.end + .15, 'whoosh'); cue(T.end + .85, 'pop'); cue(T.end + 1.3, 'chime'); cue(T.end + 2.2, 'horn', .35);

// ====================================================================== dessin 2D utilitaire
function moneyHud(t, value, a) {
  if (a <= 0) return; const x = SAFE.cx, y = 290; ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(x - 250, y - 52 + 8, 500, 104, 52); ctx.fill(); ctx.fillStyle = '#141034'; roundRect(x - 250, y - 52, 500, 104, 52); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#35d07f'; ctx.beginPath(); ctx.arc(x - 196, y, 38, 0, 7); ctx.fill(); ctx.strokeStyle = '#0c7a45'; ctx.lineWidth = 6; ctx.stroke();
  text('$', x - 196, y + 3, { font: 'Russo', size: 52, color: '#ffffff' });
  text(value, x + 36, y + 3, { font: 'Russo', size: 62, color: '#ffffff', maxW: 330 }); ctx.restore();
}
function popup(t, at, x, y, str, col = '#7dff9e', size = 86) {
  const lt = t - at; if (lt < 0 || lt > .9) return;
  text(str, clamp(x, 170, 910), y - 60 - ease.out(lt / .9) * 150, { font: 'Russo', size, color: col, stroke: '#0a2a14', strokeW: 14, alpha: 1 - inv(.6, .9, lt), scale: ease.back(inv(0, .2, lt)) });
}
const moneyAt = t => { let m = 1200 + 300 * inv(T.s1, T.s2, t); for (const p of tollPays) if (t >= p.t) m += 50 * ss(p.t, p.t + .25, t); for (const p of upPays) if (t >= p.t) m += [100, 250, 600, 600][p.n] * ss(p.t, p.t + .25, t); if (t > T.s4) m += 9000 * ease.out(inv(T.s4, T.s5, t)); return Math.round(m / 5) * 5; };
const fmt = n => n.toLocaleString('fr-FR').replace(/[  ]/g, ' ');

// ====================================================================== rendu
function driveScene(lt, vH, seed = 0, swayA = .7) {      // plan roulant : le héros reste vers z=0, le décor défile
  roadG.visible = true; tollG.visible = false; plotsG.visible = false;
  const s = vH * lt + seed * 53;
  dashes.position.z = mod(s, 15); posts.position.z = mod(s, 6); refl.position.z = mod(s, 12); lampG.position.z = mod(s, 48);
  for (const it of wrapItems) it.o.position.z = wrap(it.z0 + s);
  for (const c of allCars) c.visible = false;
  place(hero, 10 + Math.sin(lt * 1.3 + seed) * swayA, 0, s); hero.rotation.z = Math.cos(lt * 1.3 + seed) * -.012 * swayA; hero.position.y = Math.abs(Math.sin(lt * 17)) * .03;
  for (const [c, x, v, z0] of traffic) { const opp = x < 0; place(c, x, wrap(z0 + seed * 71 + (opp ? vH + v : vH - v) * lt), (opp ? -1 : 1) * v * lt + z0, opp); }
}
function tollScene(lt, a, w, P_, u0, only) {
  roadG.visible = true; tollG.visible = true; plotsG.visible = false;
  dashes.position.z = 0; posts.position.z = 0; refl.position.z = 0; lampG.position.z = 24; for (const it of wrapItems) { it.o.position.z = wrap(it.z0 + 165 + (it.z0 === -70 ? 400 : 0)); it.o.visible = it.z0 !== -70; }
  for (const c of allCars) c.visible = false;
  const pool = [hero, ...cars]; let n = 0;
  LANES.forEach((x, j) => {
    let open = 0; const opp = x < 0, cnt = only != null ? (j === only ? 4 : (opp ? 2 : 1)) : (opp ? 2 : 3);
    for (let m = 0; m < cnt && n < pool.length; m++) {
      const c = pool[n++], u = lt + u0 - (only != null && j !== only ? .4 + j * .45 : TOLL_OFF[j] * (only != null ? 0 : 1)) - m * (only != null && j !== only ? 2.4 : P_), stop = c.front + 1.3, z = tollZ(u, a, w, stop);
      if (u < -.2 || z < -150) { c.visible = false; continue; }
      place(c, x, opp ? -z + 3 : z, opp ? -z : z, opp); open = Math.max(open, tollOpen(u, a, w));
    }
    barriers[j].rotation.z = -open * 1.4; const [r, g, rb, gb] = tollLights[j]; r.visible = rb.visible = open < .5; g.visible = gb.visible = open >= .5;
  });
}
function restoreWrapVis() { for (const it of wrapItems) it.o.visible = true; }

function render(t) {
  let L = LOOKS.day, sx = 0, sy = 0;
  restoreWrapVis(); hero.rotation.z = 0;
  if (t < T.s1) {                                           // 0. accroche : poursuite au coucher du soleil
    L = LOOKS.sunset; driveScene(t, 72, 0);
    const k = prog(t, 0, 3.4, ease.io);
    camLook(camera, [lerp(3.2, 10, k) + Math.sin(t * 2) * .2, lerp(1.7, 6.6, k), lerp(7.5, 19.5, k)], [lerp(9.6, 10, k), lerp(1.7, 2.4, k), lerp(-2, -14, k)], 50);
  } else if (t < T.s2) {                                    // 1. ton autoroute, vue large de jour
    L = LOOKS.day; const lt = t - T.s1; driveScene(lt, 66, 1, .4);
    const k = prog(lt, 0, T.s2 - T.s1, ease.io);
    camLook(camera, [lerp(-9, 1, k), lerp(19, 14.5, k), lerp(-40, -33, k)], [lerp(7, 9, k), 1, lerp(6, 2, k)], 52);
  } else if (t < T.s3) {                                    // 2. le péage
    L = LOOKS.day; const lt = t - T.s2; tollScene(lt, TOLL_A, TOLL_W, TOLL_P, TOLL_U0);
    const k = prog(lt, 0, T.s3 - T.s2, ease.io);
    camLook(camera, [lerp(13, 9, k), lerp(13.5, 11, k), lerp(-46, -38, k)], [9.5, 3.4, 2], 55);
  } else if (t < T.s4) {                                    // 3. améliorations (péage vu de près, lumière dorée)
    L = LOOKS.gold; const lt = t - T.s3; tollScene(lt, UP_A, UP_W, UP_P, UP_U0, 1);
    const k = prog(lt, 0, T.s4 - T.s3, ease.io);
    camLook(camera, [lerp(18.5, 15.5, k), lerp(3.4, 4.6, k), lerp(-17, -20, k)], [9.6, 2.9, 1], 50);
  } else if (t < T.s5) {                                    // 4. trafic non-stop au coucher du soleil
    L = LOOKS.sunset; const lt = t - T.s4; driveScene(lt, 76, 2, .5);
    const a = lerp(-2.55, -.42, prog(lt, 0, T.s5 - T.s4, ease.io)), R = lerp(13.5, 17, inv(0, 4, lt));
    camLook(camera, [hero.position.x + Math.sin(a) * R, lerp(1.6, 4.2, inv(0, 4, lt)), Math.cos(a) * R], [hero.position.x, 1.7, -1], 52);
  } else if (t < T.s6) {                                    // 5. moment fort : rebirth, nuit néon
    L = LOOKS.night; const lt = t - T.s5; driveScene(lt, 120, 3, 1.1);
    [sx, sy] = shake(t, T.s5, 26, .6);
    const k = prog(lt, 0, T.s6 - T.s5, ease.out);
    camLook(camera, [10 + Math.sin(lt * .9) * 2.2, lerp(3.2, 8.5, k), lerp(11, 22, k)], [10, lerp(2, 3, k), -16], lerp(64, 50, k));
  } else if (t < T.end) {                                   // 6. chacun son autoroute
    L = LOOKS.gold; const lt = t - T.s6; roadG.visible = false; tollG.visible = false; plotsG.visible = true;
    const k = prog(lt, 0, T.end - T.s6, ease.io);
    camLook(camera, [lerp(-24, -21, k), lerp(7.5, 10, k), lerp(27, 23, k)], [lerp(16, 20, k), 3.2, lerp(-3, -6, k)], 50);
    for (const c of allCars) c.visible = false;
    const pool = [hero, ...cars, ...trucks]; let n = 0;
    PLOT_X.forEach((x, p) => { for (let m = 0; m < 4; m++) { const c = pool[n++], sp = 24 + hash(p * 5 + m) * 6, z = wrap(-150 + m * 80 + hash(p * 3 + m) * 30 + sp * (lt + 2), 320, -200); place(c, x + (m % 2 ? 3.3 : -3.3), z, z, true); } });
    players.forEach((ch, i) => { ch.rotation.y = Math.atan2(camera.position.x - ch.position.x, camera.position.z - ch.position.z); const on = lt > .5 + i * .35; ch.position.y = on ? .3 + Math.abs(Math.sin((lt + i * .3) * 6.5)) * .8 : .3; on ? poseCheer(ch, t + i) : poseIdle(ch, t + i); });
  } else {                                                  // écran final : la route vers le soleil
    L = LOOKS.sunset; const lt = t - T.end; driveScene(lt, 60, 4, .5);
    camLook(camera, [10 + Math.sin(lt * .5) * 1.5, 8 + lt * .35, 25], [10, 9.5, -40], 50);
  }
  setLook(L); sky(L, t);
  draw3D(scene, camera, { dx: sx, dy: sy });

  // ---------- effets et textes ----------
  if (t < T.s1) {
    speedLines(t, { alpha: .22 * inv(.2, 1, t), cy: H * .42, inner: 620, color: 'rgba(255,220,200,.6)' }); vignette(.5, '30,5,50');
    caption(t, .12, T.s1 - .15, 'PRÊT À PRENDRE\nLA ROUTE ?', { font: 'Russo', size: 112, y: 400, anim: 'slam', grad: ['#fff27a', '#ff8a3c'], stroke: '#1a0838', strokeW: 20 });
  }
  flash(t, T.s1, .35);
  if (t >= T.s1 && t < T.s2) {
    vignette(.25); caption(t, T.s1 + .25, T.s2 - .2, 'TON AUTOROUTE\nRIEN QU\'À TOI', { font: 'Russo', size: 84, y: 1330, bg: C.pink, anim: 'pop', lineH: 1.12 });
  }
  wipe(t, T.s2, { color: C.pink, color2: C.cyan, dur: .5 });
  if (t >= T.s2 && t < T.s3) {
    vignette(.25);
    for (const p of tollPays) { const q = P(LANES[p.lane], 5.2, 2); popup(t, p.t, q[0], q[1], '+50 $'); }
    caption(t, T.s2 + .3, T.s3 - .2, 'ENCAISSE AU PÉAGE', { font: 'Russo', size: 84, y: 1360, bg: '#12224f', color: C.yellow, anim: 'slide' });
  }
  wipe(t, T.s3, { color: C.yellow, color2: C.orange, dir: 'up', dur: .5 });
  if (t >= T.s3 && t < T.s4) {
    vignette(.3, '40,10,0');
    for (const p of upPays) { const q = P(10, 5, 1); popup(t, p.t, q[0], q[1] + 40, ['+100 $', '+250 $', '+600 $', '+600 $'][p.n], ['#7dff9e', '#ffe14d', '#ff9de0', '#ff9de0'][p.n], 86 + p.n * 14); }
    upClicks.forEach((c, i) => { const lt = t - c; if (lt < 0 || lt > 1.1) return; ctx.save(); ctx.globalAlpha = 1 - inv(.7, 1.1, lt); for (let j = 0; j < 9; j++) { const x = 130 + hash(j * 3 + i) * 820, y = 1150 - hash(j * 7 + i) * 500 - ease.out(lt / 1.1) * 330, s = 26 + hash(j) * 22; ctx.fillStyle = j % 2 ? C.cyan : C.yellow; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * .2); ctx.lineTo(x + s * .4, y + s * .2); ctx.lineTo(x + s * .4, y + s); ctx.lineTo(x - s * .4, y + s); ctx.lineTo(x - s * .4, y + s * .2); ctx.lineTo(x - s, y + s * .2); ctx.fill(); } ctx.restore(); });
    const press = Math.max(...upClicks.map(c => 1 - inv(0, .22, Math.abs(t - c)))), a = win(t, T.s3 + .3, T.s4 - .15, .2);
    pill('AMÉLIORER  ▲', SAFE.cx, 1165, { font: 'Russo', size: 60, bg: '#22c55e', color: '#ffffff', border: '#ffffff', borderW: 7, scale: (1 - press * .12) * (1 + Math.sin(t * 8) * .02), alpha: a });
    caption(t, T.s3 + .3, T.s4 - .2, 'AMÉLIORE TON AUTOROUTE', { font: 'Russo', size: 80, y: 1370, bg: C.orange, color: '#1a0838', anim: 'pop' });
  }
  if (t >= T.s1 + .2 && t < T.s5 - .1) moneyHud(t, fmt(moneyAt(t)), Math.min(inv(T.s1 + .2, T.s1 + .6, t), 1 - inv(T.s5 - .5, T.s5 - .1, t)));
  flash(t, T.s4, .4, '255,170,90');
  if (t >= T.s4 && t < T.s5) {
    speedLines(t, { alpha: .16, cy: H * .5, inner: 640, color: 'rgba(255,220,200,.6)' }); vignette(.5, '30,5,50');
    caption(t, T.s4 + .25, T.s5 - .25, 'ÇA ROULE\nNON-STOP', { font: 'Russo', size: 120, y: 1290, anim: 'slam', grad: ['#ffffff', '#ffd23f'], stroke: '#1a0838', strokeW: 20 });
  }
  if (t >= T.s5 && t < T.s6) {
    speedLines(t, { alpha: .3, cy: H * .44, inner: 560, color: 'rgba(120,230,255,.6)' }); vignette(.55, '10,0,40');
    sparkles(t, { y: 240, h: 600, color: '#ffffff', n: 22 }); confetti(t, T.s5 + .1, { colors: [C.pink, C.cyan, C.yellow, '#ffffff'], cy: 620 });
    caption(t, T.s5 + .1, T.s6 - .2, 'FAIS TON\nREBIRTH !', { font: 'Russo', size: 150, y: 480, anim: 'slam', grad: ['#7df3ff', '#ff4fb0'], stroke: '#0a0420', strokeW: 24, glow: C.pink });
  }
  flash(t, T.s5, .55, '255,255,255');
  wipe(t, T.s6, { color: C.cyan, color2: C.pink, dir: 'right', dur: .5 });
  if (t >= T.s6 && t < T.end) {
    vignette(.25, '40,10,0');
    caption(t, T.s6 + .3, T.end - .2, 'CHACUN\nSON AUTOROUTE', { font: 'Russo', size: 96, y: 1330, bg: '#12224f', color: '#ffffff', anim: 'pop', lineH: 1.12 });
  }
  flash(t, T.end, .4, '255,200,150');
  if (t >= T.end) {
    fade(.42 * inv(T.end, T.end + .5, t), '#1a0838'); vignette(.5, '20,0,40'); sparkles(t, { y: 230, h: 520, n: 18, color: '#ffe9a8' });
    endCard(t, T.end + .15, { title: 'SIMULATEUR\nD\'AUTOROUTE', tagline: 'Ton autoroute. Ton péage. Ton argent.', status: 'public', font: 'Russo', titleGrad: ['#fff27a', '#ff5fa2'], titleStroke: '#1a0838', accent: C.pink, y: 800, search: 'Simulateur d\'Autoroute' });
  }
}

registerAd({ duration: DURATION, thumbTime: T.s5 + 1.2, render,
  music: { style: 'synthwave', bpm: BPM, sections: [[0, 'build'], [T.s1, 'drop'], [T.s3, 'break'], [T.s4, 'drop'], [T.s5, 'drop2'], [T.end, 'drop']], end: T.end + 2 * BAR } });
