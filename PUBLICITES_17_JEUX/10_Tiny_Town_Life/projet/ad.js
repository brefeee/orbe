// Publicité « Tiny Town Life » (jeu de vie en petite ville). Statut : bientôt sur Roblox.
// Tout est créé par le code : aucune ressource externe. Les images sont des animations d'illustration.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, mixHex, rgba, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseHold, bushyTree, tree, cloud, ground, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles,
  roundRect, text, caption, pill, bar, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Fredoka', 'Inter']);

// ---------- temps (une mesure = 240 / 92 = 2,609 s) ----------
const BAR = 240 / 92;
const T = { hook: 0, town: BAR, jobs: 2.5 * BAR, house: 4 * BAR, car: 5.5 * BAR, photo: 7 * BAR, fire: 8 * BAR, party: 9.5 * BAR, end: 11.5 * BAR };
const DURATION = 14 * BAR;                       // 36,5 s
const SNAP = T.photo + 1.25;                     // déclenchement de la photo
const FIRE_OUT = T.fire + 3.0;                   // incendie éteint

// ---------- palette ----------
const C = { sky: '#58b9ff', sky2: '#c4ecff', grass: '#8fd67a', road: '#596173', walk: '#ddd6c8', plaza: '#f5e4c3', cream: '#fff4dc',
  coral: '#ff7a6b', sun: '#ffd24d', teal: '#36c6b0', lav: '#b79cff', pink: '#ff9ec4', blue: '#4aa8ff', wood: '#a8713f', night: '#2b2350' };

// ---------- scène ----------
gl3D({ exposure: 1.05 });
const scene = new THREE.Scene(), camera = makeCamera(44);
const { hemi, sun } = addLights(scene, { shadowArea: 34, shadowMap: 2048, dir: [9, 16, 10] });
const town = new THREE.Group(), jobsSet = new THREE.Group(), houseSet = new THREE.Group(), fireFx = new THREE.Group(), partyFx = new THREE.Group();
scene.add(town, houseSet); town.add(jobsSet, fireFx, partyFx);

// matériaux animés (fenêtres et lampes qui s'allument le soir, murs de la maison qui changent de couleur)
const winMat = new THREE.MeshStandardMaterial({ color: '#bfe9ff', roughness: .3, emissive: '#ffd27a', emissiveIntensity: 0 });
const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', roughness: .4, emissive: '#ffd98a', emissiveIntensity: .2 });
const wallMat = new THREE.MeshStandardMaterial({ color: '#ffe3c2', roughness: .9 });
const glassMat = new THREE.MeshStandardMaterial({ color: '#cfefff', roughness: .2, transparent: true, opacity: .45 });
const stripeMats = {};
function stripes(color) {
  return stripeMats[color] ||= new THREE.MeshStandardMaterial({ roughness: .8, map: canvasTex(128, (g, n) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); g.fillStyle = color; for (let i = 0; i < 4; i++) g.fillRect(i * n / 4, 0, n / 8, n); }) });
}
function prism(w, h, d, color) {                 // toit à deux pentes
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(g, mat(color, { rough: .8 })); m.castShadow = true; m.receiveShadow = true; return m;
}
function label(w, h, str, bgc, fg = '#ffffff') {
  return sign(w, h, (c, cw, ch) => {
    c.fillStyle = bgc; c.beginPath(); c.roundRect(2, 2, cw - 4, ch - 4, ch * .3); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = ch * .08; c.stroke();
    c.fillStyle = fg; c.font = `400 ${ch * .62}px "Fredoka"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, cw / 2, ch * .54, cw * .88);
  }, { res: 384 });
}
function flowerBox(w) { const g = new THREE.Group(); g.add(box(w, .3, .4, C.wood)); for (let i = 0; i < 4; i++) g.add(ball(.2, [C.coral, C.sun, C.pink, '#ffffff'][i], { seg: 8, seg2: 6, pos: [-w / 2 + .25 + i * (w - .5) / 3, .3, 0] })); return g; }
function windowAt(x, y, z, w = 1.4, h = 1.4) { const g = new THREE.Group(); g.add(box(w + .3, h + .3, .12, '#ffffff'), box(w, h, .18, winMat), box(.1, h, .22, '#ffffff'), box(w, .1, .22, '#ffffff')); g.position.set(x, y, z); return g; }

function house(wall, roof, door) {               // maison : façade vers +z
  const g = new THREE.Group(), w = 7, h = 4.6, d = 6;
  g.add(box(w, h, d, wall, { pos: [0, h / 2, 0] }));
  const r = prism(w + 1, 2.7, d + .9, roof); r.position.y = h; g.add(r);
  g.add(box(.9, 1.8, .9, '#d86a5c', { pos: [2.1, h + 1.7, -1] }), box(1.1, .25, 1.1, '#fff4dc', { pos: [2.1, h + 2.7, -1] }));
  g.add(rbox(1.4, 2.5, .2, .15, door, { pos: [-1.6, 1.25, d / 2 + .06] }), ball(.1, C.sun, { pos: [-1.15, 1.25, d / 2 + .2] }), box(2, .25, .9, C.walk, { pos: [-1.6, .12, d / 2 + .45] }));
  g.add(windowAt(1.5, 2.6, d / 2 + .02)); const fb = flowerBox(1.8); fb.position.set(1.5, 1.6, d / 2 + .25); g.add(fb);
  g.add(windowAt(0, h + 1.05, d / 2 + .47, .9, .9));
  return g;
}
function shop(wall, awn, name) {                 // commerce : vitrine, store rayé, enseigne
  const g = new THREE.Group(), w = 8, h = 5.6, d = 7;
  g.add(box(w, h, d, wall, { pos: [0, h / 2, 0] }), box(w + .6, .5, d + .6, '#fff4dc', { pos: [0, h + .25, 0] }));
  g.add(box(4.4, 2.5, .18, '#ffffff', { pos: [-1.3, 2.05, d / 2 + .02] }), box(4.1, 2.2, .22, winMat, { pos: [-1.3, 2.05, d / 2 + .04] }));
  g.add(rbox(1.5, 2.7, .2, .15, awn, { pos: [2.6, 1.35, d / 2 + .06] }), box(.9, .9, .24, winMat, { pos: [2.6, 1.95, d / 2 + .08] }));
  const a = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .2, 2.3), stripes(awn)); a.position.set(0, 3.75, d / 2 + 1.0); a.rotation.x = .32; a.castShadow = true; g.add(a);
  const s = label(5.2, 1.1, name, awn); s.position.set(0, 4.85, d / 2 + .03); g.add(s);
  for (let i = 0; i < 3; i++) g.add(ball(.3, [C.coral, C.sun, C.teal][i], { seg: 10, seg2: 8, pos: [-2.5 + i * 1.2, 1.25, d / 2 - .25] }));   // objets en vitrine
  return g;
}
function lampPost(x, z) { const g = new THREE.Group(); g.add(cyl(.14, .2, 6.2, '#3b4256', { seg: 8, pos: [0, 3.1, 0] }), cyl(.4, .25, .3, '#3b4256', { seg: 8, pos: [0, 6.2, 0] })); const b = new THREE.Mesh(new THREE.SphereGeometry(.48, 12, 10), lampMat); b.position.y = 6.75; g.add(b); g.position.set(x, 0, z); return g; }
function bench(x, z, ry = 0) { const g = new THREE.Group(); g.add(box(2.6, .2, .8, C.wood, { pos: [0, .9, 0] }), box(2.6, .9, .15, C.wood, { pos: [0, 1.5, -.38] }), box(.2, .9, .7, '#3b4256', { pos: [-1.1, .45, 0] }), box(.2, .9, .7, '#3b4256', { pos: [1.1, .45, 0] })); g.position.set(x, 0, z); g.rotation.y = ry; return g; }

// ----- sol, routes, place -----
town.add(ground(320, C.grass));
town.add(box(140, .1, 8, C.road, { pos: [0, .05, 0], cast: false }), box(140, .22, 3, C.walk, { pos: [0, .11, -5.5], cast: false }), box(140, .22, 3, C.walk, { pos: [0, .11, 5.5], cast: false }));
town.add(box(18, .26, 24, C.plaza, { pos: [0, .13, -19], cast: false }), box(14, .28, 20, '#fbeed5', { pos: [0, .14, -19], cast: false }));
for (let i = 0; i < 34; i++) { const x = -66 + i * 4; if (Math.abs(x) < 3) continue; town.add(box(2, .03, .28, '#ffffff', { pos: [x, .115, 0], cast: false })); }
for (let i = 0; i < 6; i++) town.add(box(.7, .03, 6.6, '#ffffff', { pos: [-2.5 + i, .118, 0], cast: false }));          // passage piéton
// ----- bâtiments -----
const SHOPS = [[-23, '#ffd9a8', C.coral, 'BOUTIQUE'], [-14, '#c9f0e4', C.teal, 'MARCHÉ'], [14, '#ffe2ec', '#ff6f9d', 'MAGASIN'], [23, '#e3dbff', '#8f6bff', 'BAZAR']];
for (const [x, w, a, n] of SHOPS) { const s = shop(w, a, n); s.position.set(x, 0, -11); town.add(s); }
const HOUSES = [[-32, -10.5, '#fff0b8', '#e2574c', C.teal, 0], [32, -10.5, '#cdeeff', '#3f7fd6', C.coral, 0], [-41, -10.5, '#ffd2dc', '#8a5fd0', '#ffffff', 0], [41, -10.5, '#d8f5c4', '#e08a2e', C.blue, 0],
  [-15, -27, '#ffd2dc', '#7a56c9', C.sun, 0], [-25, -27, '#d8f5c4', '#e2574c', C.blue, 0], [-35, -27, '#cdeeff', '#e08a2e', C.coral, 0], [15, -27, '#fff0b8', '#2fa58f', C.coral, 0], [25, -27, '#ffe0c2', '#3f7fd6', C.teal, 0], [35, -27, '#e3dbff', '#e2574c', C.sun, 0],
  [-24, 13, '#cdeeff', '#e2574c', C.sun, Math.PI], [-34, 13, '#fff0b8', '#7a56c9', C.teal, Math.PI], [24, 13, '#ffd2dc', '#2fa58f', C.blue, Math.PI], [34, 13, '#d8f5c4', '#3f7fd6', C.coral, Math.PI]];
for (const [x, z, w, r, d, ry] of HOUSES) { const h = house(w, r, d); h.position.set(x, 0, z); h.rotation.y = ry; town.add(h); }
// hôtel de ville avec horloge, au fond de la place
{ const g = new THREE.Group(); g.add(box(13, 7, 6, C.cream, { pos: [0, 3.5, 0] }), box(14, .6, 7, '#e9b44c', { pos: [0, 7.3, 0] }));
  const p = prism(9, 2.4, 6.6, '#e2574c'); p.position.set(0, 7.6, 0); g.add(p);
  for (let i = 0; i < 4; i++) g.add(cyl(.4, .45, 5.2, '#ffffff', { seg: 12, pos: [-3.9 + i * 2.6, 2.9, 3.5] }));
  g.add(box(11, .5, 1.6, '#ffffff', { pos: [0, 5.7, 3.4] }), box(12, .3, 3, C.walk, { pos: [0, .3, 4] }), rbox(2.2, 3.4, .2, .5, '#8a5a35', { pos: [0, 1.9, 3.05] }));
  g.add(windowAt(-3.6, 3.2, 3.02, 1.3, 1.9), windowAt(3.6, 3.2, 3.02, 1.3, 1.9));
  g.add(box(3.2, 5, 3.2, C.cream, { pos: [0, 10.8, -.5] }), cone(2.6, 2.6, '#e2574c', { seg: 4, pos: [0, 14.6, -.5], rot: [0, Math.PI / 4, 0] }));
  const ck = sign(2.2, 2.2, (c, w) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, w / 2, w * .46, 0, 7); c.fill(); c.strokeStyle = '#3b4256'; c.lineWidth = w * .06; c.stroke(); c.lineCap = 'round'; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2, w * .2); c.moveTo(w / 2, w / 2); c.lineTo(w * .7, w * .58); c.stroke(); }); ck.position.set(0, 11.3, 1.12); g.add(ck);
  g.position.set(0, 0, -34); town.add(g); }
// fontaine
const drops = [];
{ const g = new THREE.Group(); g.add(cyl(3.1, 3.3, .9, '#efe6d2', { pos: [0, .7, 0] }), cyl(2.75, 2.75, .2, '#6fd3ff', { pos: [0, 1.12, 0], rough: .2, emissive: '#2a8fd0', emissiveI: .25 }), cyl(.45, .6, 2.6, '#efe6d2', { pos: [0, 2.2, 0] }), cyl(1.4, .5, .45, '#efe6d2', { pos: [0, 3.5, 0] }), ball(.5, '#6fd3ff', { pos: [0, 4.0, 0], emissive: '#2a8fd0', emissiveI: .3 }));
  for (let i = 0; i < 14; i++) { const d = ball(.16, '#bfeeff', { seg: 8, seg2: 6, cast: false, emissive: '#6fd3ff', emissiveI: .5 }); g.add(d); drops.push(d); }
  g.position.set(0, 0, -17); town.add(g); }
// mobilier urbain, arbres, parc
const LAMPS = [[-8, -8], [8, -8], [-8, -29], [8, -29], [-19, -4.6], [19, -4.6], [-30, -4.6], [30, -4.6], [-12, 4.6], [12, 4.6]];
for (const [x, z] of LAMPS) town.add(lampPost(x, z));
town.add(bench(-6.5, -14, Math.PI / 2), bench(6.5, -14, -Math.PI / 2), bench(-6.5, -21, Math.PI / 2), bench(6.5, -21, -Math.PI / 2));
for (const [x, z, s] of [[-9.6, -19, 4.2], [9.6, -19, 4.2], [-9.8, -26, 4.6], [9.8, -26, 4.6], [-19, -19, 5], [19, -19, 5], [-29, -19, 4.4], [29, -19, 4.6], [-45, -18, 5.4], [45, -20, 5.4], [-18, 24, 5], [18, 24, 5.2], [-6, 27, 5.6], [7, 28, 5], [-40, 22, 5.4], [41, 24, 5], [-30, -38, 6], [30, -38, 6], [-10, -42, 6.4], [12, -43, 6]])
  { const t = (hash(x * 3 + z) > .35 ? bushyTree : tree)(s, hash(x) > .5 ? '#49b356' : '#5cc46a'); t.position.set(x, 0, z); town.add(t); }
{ const pond = cyl(5, 5, .12, '#6fd3ff', { pos: [-4, .08, 17], rough: .2, emissive: '#2a8fd0', emissiveI: .2, cast: false }); pond.scale.z = .65; town.add(pond);
  for (let i = 0; i < 26; i++) { const x = (hash(i * 7.1) - .5) * 40, z = 9 + hash(i * 3.3) * 14; if (Math.hypot((x + 4) / 5.6, (z - 17) / 3.8) < 1) continue; town.add(ball(.22, [C.coral, C.sun, C.pink, '#ffffff', C.lav][i % 5], { seg: 8, seg2: 6, pos: [x, .22, z], cast: false })); }
  for (let i = 0; i < 9; i++) town.add(box(.25, 1.1, .25, '#ffffff', { pos: [-16 + i * 4, .55, 7.6] }), box(4, .18, .12, '#ffffff', { pos: [-14 + i * 4, .85, 7.6] })); }
for (const [x, z, sx] of [[-48, -85, 1.2], [5, -95, 1.6], [55, -82, 1.1]]) { const hgl = ball(34, '#7ccb6c', { seg: 20, seg2: 12, cast: false }); hgl.scale.set(sx, .32, .6); hgl.position.set(x, -2, z); town.add(hgl); }
const clouds = []; for (let i = 0; i < 7; i++) { const c = cloud(2 + hash(i) * 1.6); c.position.set((hash(i * 5) - .5) * 110, 24 + hash(i * 2) * 9, -50 - hash(i * 9) * 30); town.add(c); clouds.push(c); }

// ----- voiture (décapotable « jouet ») -----
function makeCar(color, driverOpts) {
  const g = new THREE.Group(); g.wheels = [];
  g.add(rbox(6.4, 1.25, 3.0, .4, color, { pos: [0, 1.3, 0], rough: .35 }), rbox(6.7, .45, 3.2, .18, '#fff4dc', { pos: [0, .8, 0] }));
  g.add(rbox(2.1, .35, 2.6, .15, color, { pos: [2.0, 2.0, 0], rough: .35 }), rbox(1.5, .4, 2.6, .15, color, { pos: [-2.4, 2.05, 0], rough: .35 }));
  const ws = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.15, 2.6), glassMat); ws.position.set(1.05, 2.55, 0); ws.rotation.z = -.3; g.add(ws);
  g.add(box(.16, 1.25, .14, '#fff4dc', { pos: [1.05, 2.55, 1.3], rot: [0, 0, -.3] }), box(.16, 1.25, .14, '#fff4dc', { pos: [1.05, 2.55, -1.3], rot: [0, 0, -.3] }));
  g.add(rbox(.5, 1.3, 2.5, .18, '#fff4dc', { pos: [-1.35, 2.35, 0] }));
  for (const s of [-1, 1]) g.add(ball(.3, '#fff6c0', { pos: [3.15, 1.45, s * 1.0], emissive: '#ffe27a', emissiveI: .9 }), box(.2, .35, .6, '#ff4d5e', { pos: [-3.2, 1.45, s * 1.0], emissive: '#ff2a3c', emissiveI: .5 }));
  g.add(rbox(.35, .4, 3.2, .12, '#e6e9ef', { pos: [3.25, .8, 0] }), rbox(.35, .4, 3.2, .12, '#e6e9ef', { pos: [-3.25, .8, 0] }));
  for (const [x, z] of [[2, 1.5], [2, -1.5], [-2, 1.5], [-2, -1.5]]) { const p = new THREE.Group(); p.position.set(x, .75, z);
    p.add(cyl(.75, .75, .55, '#2b2f3a', { rot: [Math.PI / 2, 0, 0], seg: 18 }), cyl(.4, .4, .6, '#f1f3f7', { rot: [Math.PI / 2, 0, 0], seg: 12 }), box(.75, .14, .64, '#c9ced8'), box(.14, .75, .64, '#c9ced8')); g.add(p); g.wheels.push(p); }
  const d = makeCharacter({ ...driverOpts, scale: .6 }); d.position.set(-.35, .4, 0); d.rotation.y = Math.PI / 2; g.add(d); g.driver = d;
  return g;
}
const HERO = { shirt: C.coral, pants: '#2f4a7a', hair: '#5a3a22', face: 'happy' };
const car = makeCar('#ff5d5d', HERO); town.add(car);
function driveCar(x, z, t, dir = 1) { car.position.set(x, Math.sin(t * 22) * .03, z); car.rotation.y = dir > 0 ? 0 : Math.PI; for (const w of car.wheels) w.rotation.z = -x * dir / .75; poseIdle(car.driver, t); poseHold(car.driver, .95); car.driver.parts.head.rotation.set(0, Math.sin(t * 1.6) * .25, 0); }

// ----- habitants -----
const hero = makeCharacter(HERO);
const LOOKS = [{ shirt: C.teal, pants: '#3a3f5c', hat: 'cap', hatColor: C.sun, face: 'happy' }, { shirt: C.lav, pants: '#4a3b6b', hair: '#22202a', skin: '#b9815a', face: 'smile' }, { shirt: C.sun, pants: '#3d6b4a', hair: '#e8b84a', face: 'happy' },
  { shirt: '#ff9ec4', pants: '#5a4a7a', hair: '#7a3b1e', skin: '#e2a878', face: 'smile' }, { shirt: C.blue, pants: '#2b3350', hat: 'cap', hatColor: C.coral, skin: '#8f5d3c', face: 'happy' }, { shirt: '#7ad66a', pants: '#40506a', hair: '#2a2a33', face: 'smile' }, { shirt: '#ffffff', pants: '#c2553f', hair: '#b5651d', skin: '#f6d2b0', face: 'happy' }];
const folks = LOOKS.map(o => makeCharacter(o)); town.add(hero, ...folks);
const everyone = [hero, ...folks];

// ----- postes de métier (4 métiers de la version actuelle ; le dossier ne nomme pas lesquels : ils restent numérotés) -----
const JOBC = [C.coral, C.teal, '#8f6bff', '#f5a623'], jobX = i => (i - 1.5) * 5.2, jobChars = [], jobCoins = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group(); g.position.set(jobX(i), 0, -10.6);
  g.add(rbox(4.4, 6.6, .5, .4, JOBC[i], { pos: [0, 3.3, -1.6] }), rbox(3.6, 5.6, .2, .3, '#fff4dc', { pos: [0, 3.2, -1.3] }), cyl(2, 2.1, .3, JOBC[i], { pos: [0, .28, .3] }), cyl(1.6, 1.6, .34, '#fff4dc', { pos: [0, .3, .3] }));
  const a = new THREE.Mesh(new THREE.BoxGeometry(4.8, .2, 1.8), stripes(JOBC[i])); a.position.set(0, 6.5, -.7); a.rotation.x = .3; a.castShadow = true; g.add(a);
  const s = label(3.6, 1.0, 'MÉTIER ' + (i + 1), JOBC[i]); s.position.set(0, 7.75, -1.3); g.add(s, box(.15, .9, .15, '#3b4256', { pos: [-1.4, 7.2, -1.4] }), box(.15, .9, .15, '#3b4256', { pos: [1.4, 7.2, -1.4] }));
  g.add(rbox(.9, .9, .9, .12, C.wood, { pos: [-1.75, .7, -.6] }), cyl(.4, .3, .6, '#d86a5c', { pos: [1.8, .55, -.6], seg: 10 }), ball(.5, '#49b356', { pos: [1.8, 1.2, -.6], seg: 8, seg2: 6, flat: true }));
  const ch = makeCharacter({ shirt: JOBC[i], pants: '#33405e', hat: 'cap', hatColor: JOBC[i], hair: ['#5a3a22', '#22202a', '#e8b84a', '#7a3b1e'][i], skin: ['#f2c6a0', '#b9815a', '#f6d2b0', '#8f5d3c'][i], face: 'happy' });
  ch.position.set(0, .46, .3); g.add(ch); jobChars.push(ch);
  for (let k = 0; k < 3; k++) { const c = cyl(.42, .42, .12, '#ffcf3a', { rot: [Math.PI / 2, 0, 0], rough: .3, emissive: '#c98a00', emissiveI: .5, seg: 16, cast: false }); g.add(c); jobCoins.push(c); }
  jobsSet.add(g);
}

// ----- incendie -----
const FIRE = [14, -11], flames = [], smokes = [], jets = [];
for (const [x, y, z, s] of [[-2.6, 6.1, 1, 1.5], [-.6, 6.1, -.5, 1.9], [1.6, 6.1, .8, 1.6], [3, 6.1, -1, 1.2], [.2, 6.1, 2.2, 1.3], [-1.3, 2.3, 3.9, 1.1], [2.6, 2.9, 3.8, .8]]) {
  const g = new THREE.Group(); g.add(cone(.85, 2.4, '#ff6a1a', { seg: 7, emissive: '#ff4a00', emissiveI: 1.5, cast: false, pos: [0, 1.2, 0] }), cone(.5, 1.5, '#ffd23a', { seg: 7, emissive: '#ffb400', emissiveI: 1.6, cast: false, pos: [0, .8, .15] }));
  g.position.set(FIRE[0] + x, y, FIRE[1] + z); g.userData.s = s; fireFx.add(g); flames.push(g);
}
for (let i = 0; i < 9; i++) { const s = ball(1, '#55535e', { seg: 10, seg2: 8, flat: true, cast: false, receive: false }); fireFx.add(s); smokes.push(s); }
const fireGlow = glow('#ff8a2a', 20, .55); fireGlow.position.set(FIRE[0], 6.5, FIRE[1] + 3); fireFx.add(fireGlow);
const SPRAY = [[10.2, -1.2], [13.4, -.4], [16.6, -1.2], [19.2, -2.6]];
for (let i = 0; i < 4; i++) for (let k = 0; k < 9; k++) { const d = ball(.24, '#8fdcff', { seg: 8, seg2: 6, cast: false, emissive: '#3aa8ff', emissiveI: .6 }); fireFx.add(d); jets.push(d); }
const hoses = SPRAY.map(() => { const h = cyl(.2, .26, 1.1, '#e23b3b', { seg: 8 }); fireFx.add(h); return h; });

// ----- fête -----
const balloons = [], flags = [], partyGlows = [];
const BCOL = [C.coral, C.sun, C.teal, C.lav, C.pink, C.blue];
for (let i = 0; i < 16; i++) { const g = new THREE.Group(); const b = ball(.62, BCOL[i % 6], { rough: .3, seg: 14, seg2: 10, emissive: BCOL[i % 6], emissiveI: .25 }); b.scale.y = 1.2; g.add(b, cone(.12, .2, BCOL[i % 6], { seg: 6, pos: [0, -.8, 0] }), cyl(.02, .02, 2.4, '#ffffff', { seg: 4, pos: [0, -2.05, 0], cast: false })); partyFx.add(g); balloons.push(g); }
function bunting(a, b, n) { for (let i = 0; i < n; i++) { const u = (i + .5) / n, f = cone(.34, .75, BCOL[(i + flags.length) % 6], { seg: 3, cast: false, emissive: BCOL[(i + flags.length) % 6], emissiveI: .3 }); f.rotation.x = Math.PI; f.position.set(lerp(a[0], b[0], u), 6.3 - Math.sin(u * Math.PI) * 1.1, lerp(a[1], b[1], u)); partyFx.add(f); flags.push(f); } }
bunting([-8, -8], [8, -8], 13); bunting([-8, -29], [8, -29], 13); bunting([-8, -8], [-8, -29], 15); bunting([8, -8], [8, -29], 15);
for (const [x, z] of LAMPS) { const g = glow('#ffd98a', 5, .8); g.position.set(x, 6.75, z); partyFx.add(g); partyGlows.push(g); }

// ----- maison à décorer (vue « maison de poupée ») -----
houseSet.add(ground(200, C.grass));
{ const tex = canvasTex(512, (g, n) => { g.fillStyle = '#ecc99a'; g.fillRect(0, 0, n, n); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(160,110,60,.10)' : 'rgba(255,255,255,.10)'; g.fillRect(0, i * n / 16, n, n / 16); } g.strokeStyle = 'rgba(120,80,40,.38)'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * n / 8, 0); g.lineTo(i * n / 8, n); g.moveTo(0, i * n / 8); g.lineTo(n, i * n / 8); g.stroke(); } });
  const fl = new THREE.Mesh(new THREE.BoxGeometry(10, .3, 10), new THREE.MeshStandardMaterial({ map: tex, roughness: .8 })); fl.position.y = .15; fl.receiveShadow = true; houseSet.add(fl);
  houseSet.add(box(11.2, .3, 11.2, '#b98a5a', { pos: [-.2, .02, -.2] }));
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(10.8, 6, .4), wallMat); w1.position.set(-.2, 3.3, -5.2); w1.receiveShadow = true; const w2 = new THREE.Mesh(new THREE.BoxGeometry(.4, 6, 10.4), wallMat); w2.position.set(-5.2, 3.3, .2); w2.receiveShadow = true; houseSet.add(w1, w2);
  houseSet.add(box(10.4, .35, .12, '#ffffff', { pos: [0, .47, -4.95] }), box(.12, .35, 10, '#ffffff', { pos: [-4.95, .47, 0] }));
  houseSet.add(windowAt(2.6, 3.9, -4.96, 2, 1.8)); const pic = windowAt(0, 0, 0, 1.3, 1); pic.rotation.y = Math.PI / 2; pic.position.set(-4.96, 4.2, 2.2); houseSet.add(pic);
  for (const [x, z, s] of [[-12, -9, 5], [9, -12, 5.6], [-10, 8, 4.4], [-16, -1, 5.2], [2, -15, 4.8]]) { const t = bushyTree(s); t.position.set(x, 0, z); houseSet.add(t); } }
const furn = [];
function addFurn(x, z, build) { const g = new THREE.Group(); build(g); g.position.set(x, .3, z); g.userData.p = [x, z]; houseSet.add(g); furn.push(g); }
addFurn(.9, 1.0, g => g.add(cyl(2.4, 2.4, .08, C.coral, { pos: [0, .04, 0], seg: 28 }), cyl(1.7, 1.7, .1, '#fff4dc', { pos: [0, .05, 0], seg: 28 }), cyl(1, 1, .12, C.sun, { pos: [0, .06, 0], seg: 24 })));       // tapis
addFurn(-3.1, -2.9, g => g.add(rbox(2.5, .7, 3.7, .15, C.wood, { pos: [0, .35, 0] }), rbox(2.3, .45, 3.5, .15, '#ffffff', { pos: [0, .85, 0] }), rbox(2.36, .5, 2.2, .15, C.teal, { pos: [0, .9, .7] }), rbox(1.5, .35, .8, .15, '#fff4dc', { pos: [0, 1.15, -1.25] }), rbox(2.5, 1.9, .3, .2, C.wood, { pos: [0, .95, -1.8] })));   // lit
addFurn(-4.0, 2.4, g => g.add(rbox(1.5, .8, 3.4, .25, C.lav, { pos: [0, .5, 0] }), rbox(.55, 1.7, 3.4, .25, '#9c7ef0', { pos: [-.5, .95, 0] }), rbox(1.5, 1.2, .5, .2, '#9c7ef0', { pos: [0, .7, 1.6] }), rbox(1.5, 1.2, .5, .2, '#9c7ef0', { pos: [0, .7, -1.6] }), rbox(.7, .5, .7, .2, C.sun, { pos: [.1, 1.1, .7] })));   // canapé
addFurn(.9, 1.0, g => g.add(cyl(1.1, 1.1, .16, '#fff4dc', { pos: [0, 1.25, 0] }), cyl(.16, .3, 1.2, C.wood, { pos: [0, .6, 0], seg: 10 }), cyl(.42, .42, .7, C.teal, { pos: [1.55, .35, .2], seg: 14 }), cyl(.42, .42, .7, C.coral, { pos: [-.3, .35, 1.6], seg: 14 }), cyl(.2, .14, .34, '#ffffff', { pos: [0, 1.5, 0], seg: 10 }), ball(.22, C.pink, { pos: [0, 1.8, 0], seg: 8, seg2: 6 })));   // table et tabourets
addFurn(3.9, -3.9, g => g.add(cyl(.55, .4, .9, '#d86a5c', { pos: [0, .45, 0], seg: 12 }), ball(.8, '#49b356', { pos: [0, 1.6, 0], seg: 8, seg2: 6, flat: true }), ball(.55, '#5cc46a', { pos: [.4, 2.3, .1], seg: 8, seg2: 6, flat: true }), ball(.5, '#5cc46a', { pos: [-.4, 2.2, -.1], seg: 8, seg2: 6, flat: true })));   // plante
addFurn(.3, -4.3, g => { g.add(rbox(2.6, 3.4, .9, .12, C.wood, { pos: [0, 1.7, 0] })); for (let r = 0; r < 3; r++) { g.add(box(2.3, .85, .2, '#6b4526', { pos: [0, .65 + r * 1.05, .4] })); for (let k = 0; k < 6; k++) g.add(box(.26, .55 + hash(r * 7 + k) * .22, .3, BCOL[(k + r) % 6], { pos: [-.9 + k * .36, .55 + r * 1.05, .5] })); } });   // bibliothèque
addFurn(-4.2, -.3, g => { g.add(cyl(.5, .55, .12, '#3b4256', { pos: [0, .06, 0], seg: 14 }), cyl(.07, .07, 3, '#3b4256', { pos: [0, 1.5, 0], seg: 8 }), cyl(.4, .75, .8, C.sun, { pos: [0, 3.2, 0], seg: 14, emissive: '#ffb400', emissiveI: .7 })); const gl = glow('#ffd98a', 3.2, .7); gl.position.y = 3; g.add(gl); });   // lampadaire
addFurn(3.6, 3.4, g => g.add(rbox(1.6, 1.1, 1.1, .2, C.blue, { pos: [0, .55, 0] }), rbox(1.7, .3, 1.2, .12, '#2f7fd6', { pos: [0, 1.15, 0] }), box(.3, .3, .1, C.sun, { pos: [0, .7, .56] }), ball(.42, '#c98a5a', { pos: [0, 1.7, 0], seg: 10, seg2: 8 }), ball(.3, '#c98a5a', { pos: [0, 2.25, 0], seg: 10, seg2: 8 }), ball(.12, '#c98a5a', { pos: [-.22, 2.5, 0], seg: 6, seg2: 6 }), ball(.12, '#c98a5a', { pos: [.22, 2.5, 0], seg: 6, seg2: 6 })));   // coffre à jouets et ourson
const FURN_T = i => T.house + .3 + i * .33;
const cursor = new THREE.Group(); for (const [x, z, w, d] of [[0, 1.25, 2.7, .2], [0, -1.25, 2.7, .2], [1.25, 0, .2, 2.7], [-1.25, 0, .2, 2.7]]) cursor.add(box(w, .12, d, '#ffe14d', { pos: [x, 0, z], emissive: '#ffc400', emissiveI: 1.2, cast: false })); houseSet.add(cursor);
const homeHero = makeCharacter({ ...HERO, scale: .62 }); homeHero.position.set(2.2, .3, 1.2); houseSet.add(homeHero);
const WALLS = ['#ffe3c2', '#bfeee0', '#ffd1e0'];

// ---------- repères sonores ----------
cue(0.02, 'whoosh'); cue(0.15, 'chime'); cue(0.1, 'engine', .35, 2.2); cue(1.2, 'horn', .5);
cue(T.town, 'pop'); cue(T.town + .5, 'tap', .5); cue(T.town + 1.0, 'tap', .5); cue(T.town + 1.5, 'tap', .5); cue(T.town + 1.9, 'chime', .8); cue(T.town + 2.5, 'tap', .5); cue(T.town + 3.0, 'tap', .5);
cue(T.jobs - .2, 'swish');
for (let i = 0; i < 4; i++) { const a = T.jobs + i * (1.5 * BAR / 4); cue(a + .38, 'ding', .8); cue(a + .46, 'coin', .7); cue(a + .6, 'coin', .5); if (i) cue(a - .2, 'slide', .4); }
cue(T.house - .2, 'swish'); for (let i = 0; i < 8; i++) cue(FURN_T(i), i % 2 ? 'pop' : 'thud', .7); cue(T.house + 3.05, 'powerup', .7);
cue(T.car - .2, 'whoosh'); cue(T.car, 'engine', .6, 3.6); cue(T.car + .5, 'horn', .7); cue(T.car + 2.4, 'horn', .5);
cue(T.photo, 'click'); cue(T.photo + .2, 'slide', .6); cue(SNAP, 'click', 1.2); cue(SNAP + .05, 'glass', .25); cue(SNAP + .3, 'chime', .8);
cue(T.fire, 'impact'); cue(T.fire + .05, 'bell', .9); cue(T.fire + .7, 'bell', .7); cue(T.fire + .4, 'splash', .7); cue(T.fire + 1.2, 'splash', .7); cue(T.fire + 2.0, 'splash', .7); cue(T.fire + 2.6, 'bubble', .7); cue(FIRE_OUT, 'ding'); cue(FIRE_OUT + .1, 'crowd', .7, 1.4);
cue(T.party - .25, 'riser', .5, .3); cue(T.party, 'win'); cue(T.party + .1, 'pop'); cue(T.party + .2, 'crowd', .6, 3); cue(T.party + 1.3, 'pop', .7); cue(T.party + BAR, 'pop'); cue(T.party + BAR + .1, 'whistle', .5); cue(T.party + BAR + 1.3, 'boing', .5);
cue(T.end - .15, 'whoosh'); cue(T.end, 'impact', .8); cue(T.end + .2, 'chime'); cue(T.end + .9, 'pop'); cue(T.end + 1.4, 'ding', .7);

// ---------- aides de mise en scène ----------
function mood(k) {                               // 0 = plein jour, 1 = soir de fête
  hemi.intensity = lerp(1.15, .95, k); sun.intensity = lerp(2.6, 1.7, k); sun.color.set(mixHex('#fff1dc', '#ffb48a', k));
  winMat.emissiveIntensity = k * 1.5; lampMat.emissiveIntensity = .2 + k * 2.4;
}
function sunAt(x, z) { sun.position.set(x + 9, 16, z + 10); sun.target.position.set(x, 0, z); }
function wave(ch, t) { poseIdle(ch, t); ch.parts.armR.rotation.set(0, 0, 2.5 + Math.sin(t * 11) * .35); }
function dance(ch, t, i) { poseCheer(ch, t + i * .7); ch.position.y = Math.abs(Math.sin(t * 5.2 + i * 1.3)) * .9; ch.parts.legL.rotation.x = Math.sin(t * 5.2 + i) * .35; ch.parts.legR.rotation.x = -Math.sin(t * 5.2 + i) * .35; }
function put(ch, x, z, ry = 0, y = 0) { ch.visible = true; ch.position.set(x, y, z); ch.rotation.y = ry; }
function fountain(t) { drops.forEach((d, i) => { const u = (t * .9 + i / drops.length) % 1, a = i * 2.4; d.position.set(Math.cos(a) * u * 2.1, 4.1 + 1.6 * Math.sin(u * Math.PI) - u * 3, Math.sin(a) * u * 2.1); }); }
function stroll(t) {                             // passants sur les trottoirs (plans larges)
  folks.forEach((f, i) => { if (i < 3) return; const dir = i % 2 ? 1 : -1, x = ((t * 3 * dir + i * 23 + 400) % 80 + 80) % 80 - 40; put(f, x, i % 2 ? -5.4 : 5.4, dir > 0 ? Math.PI / 2 : -Math.PI / 2); f.position.y = Math.abs(Math.sin(t * 8 + i)) * .12; poseWalk(f, t * 8 + i); });
}
const PARTY = [[0, -8.2], [-2.7, -9.6], [2.7, -9.6], [-5.1, -11.6], [5.1, -11.6], [-1.4, -12.2], [1.5, -12.4], [-4.3, -7.6]];
function partyOn(t) {
  everyone.forEach((c, i) => { put(c, PARTY[i][0], PARTY[i][1], Math.sin(t * 1.7 + i * 2) * .5); dance(c, t, i); });
  balloons.forEach((b, i) => { const free = i >= 10, a = i * 2.4, r = 5.5 + hash(i * 3) * 3.5; const up = free ? ((t - T.party) * (1.2 + hash(i) * .8) + hash(i * 7) * 9) % 14 : 0;
    b.position.set(free ? (hash(i * 5) - .5) * 15 : Math.cos(a) * r, (free ? 3.5 + up : 5.2 + hash(i * 9) * 1.6) + Math.sin(t * 2 + i) * .22, -15 + (free ? (hash(i * 11) - .5) * 12 : Math.sin(a) * r * .9)); b.rotation.z = Math.sin(t * 1.6 + i) * .12; });
  partyGlows.forEach((g, i) => g.material.opacity = .65 + Math.sin(t * 5 + i * 1.9) * .2);
}

// ---------- affichages 2D ----------
function hud(str, color, a) { pill(str, SAFE.cx, 290, { size: 50, bg: '#ffffff', color, font: 'Fredoka', border: color, borderW: 6, alpha: a, scale: .9 + .1 * ease.back(clamp(a)) }); }
function phoneUI(t) {
  const X0 = 130, Y0 = 440, X1 = 950, Y1 = 1500, k = ease.back(inv(T.photo, T.photo + .35, t)), sc = lerp(1.25, 1, clamp(k));
  ctx.save(); ctx.translate(W / 2, (Y0 + Y1) / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -(Y0 + Y1) / 2);
  ctx.fillStyle = rgba(C.night, .78); ctx.beginPath(); ctx.rect(-400, -400, W + 800, H + 800); ctx.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 60); ctx.fill('evenodd');
  const after = t >= SNAP;
  if (after) { ctx.fillStyle = `rgba(255,255,255,${.95 * (1 - inv(SNAP, SNAP + .45, t)) ** 2})`; roundRect(X0, Y0, X1 - X0, Y1 - Y0, 60); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 22 * inv(SNAP, SNAP + .2, t); roundRect(X0 + 24, Y0 + 24, X1 - X0 - 48, Y1 - Y0 - 48, 40); ctx.stroke(); }
  ctx.strokeStyle = '#1d1a33'; ctx.lineWidth = 34; roundRect(X0 - 14, Y0 - 14, X1 - X0 + 28, Y1 - Y0 + 28, 74); ctx.stroke();
  ctx.strokeStyle = '#4b4670'; ctx.lineWidth = 5; roundRect(X0 - 30, Y0 - 30, X1 - X0 + 60, Y1 - Y0 + 60, 88); ctx.stroke();
  ctx.fillStyle = '#1d1a33'; roundRect(W / 2 - 90, Y0 - 6, 180, 40, 20); ctx.fill();
  if (!after) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 8; ctx.lineCap = 'round'; const L = 70, m = 70;
    for (const [cx, cy, sx, sy] of [[X0 + m, Y0 + m + 30, 1, 1], [X1 - m, Y0 + m + 30, -1, 1], [X0 + m, Y1 - m - 150, 1, -1], [X1 - m, Y1 - m - 150, -1, -1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * L); ctx.stroke(); } }
  const press = 1 - .2 * win(t, SNAP - .12, SNAP + .2, .1);
  ctx.fillStyle = 'rgba(29,26,51,.55)'; roundRect(X0 + 40, Y1 - 190, X1 - X0 - 80, 150, 75); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(W / 2, Y1 - 115, 56, 0, 7); ctx.stroke(); ctx.fillStyle = after ? C.sun : '#ffffff'; ctx.beginPath(); ctx.arc(W / 2, Y1 - 115, 44 * press, 0, 7); ctx.fill();
  pill('PHOTO', W / 2 - 250, Y1 - 115, { size: 38, bg: C.coral, color: '#ffffff', font: 'Fredoka', shadow: false });
  pill('CARTE', W / 2 + 250, Y1 - 115, { size: 38, bg: 'rgba(255,255,255,.25)', color: '#ffffff', font: 'Fredoka', shadow: false });
  ctx.restore();
}

// ---------- rendu ----------
function render(t) {
  const s = t < T.town ? 'hook' : t < T.jobs ? 'town' : t < T.house ? 'jobs' : t < T.car ? 'house' : t < T.photo ? 'car' : t < T.fire ? 'photo' : t < T.party ? 'fire' : t < T.end ? 'party' : 'end';
  town.visible = s !== 'house'; houseSet.visible = s === 'house'; jobsSet.visible = s === 'jobs'; fireFx.visible = s === 'fire'; partyFx.visible = s === 'party' || s === 'end';
  const evening = s === 'party' || s === 'end';
  mood(evening ? 1 : 0); sunAt(0, -8); car.visible = true; everyone.forEach(c => c.visible = false);
  clouds.forEach((c, i) => c.position.x = ((hash(i * 5) - .5) * 110 + t * (.5 + hash(i) * .5) + 55) % 110 - 55);
  fountain(t);
  let sky = [C.sky, C.sky2], sx = 0, sy = 0;

  if (s === 'hook') {                            // vue d'ensemble de la ville, la voiture passe
    driveCar(-16 + t * 8, 1.8, t); stroll(t);
    put(hero, -1.5, -9, .3); wave(hero, t); put(folks[0], 1.6, -9.5, -.3); poseCheer(folks[0], t); put(folks[1], 4.5, -13, -1.2); poseIdle(folks[1], t); put(folks[2], -4.8, -12, 1.2); poseIdle(folks[2], t);
    const k = prog(t, 0, T.town, ease.out);
    camLook(camera, [lerp(34, 22, k), lerp(34, 22, k), lerp(38, 30, k)], [lerp(4, 1, k), 2, -9], 44);
  } else if (s === 'town') {                     // promenade devant les commerces
    const lt = t - T.town, hx = -25.5 + lt * 3.7;
    put(hero, hx, -5.4, Math.PI / 2, Math.abs(Math.sin(t * 9)) * .16); poseWalk(hero, t * 9);
    put(folks[0], -13.5, -6.2, .25); wave(folks[0], t);
    put(folks[1], -9 - lt * 2.6, -4.6, -Math.PI / 2, Math.abs(Math.sin(t * 8)) * .12); poseWalk(folks[1], t * 8);
    put(folks[3], -20.5, -6.4, .5); poseIdle(folks[3], t);
    car.visible = false; sunAt(-16, -6);
    camLook(camera, [hx + 4.5, 4.6 + Math.sin(t * 1.3) * .2, 15.5 - lt * .5], [hx + 2, 3.7, -6], 44);
  } else if (s === 'jobs') {                     // les 4 métiers et leurs mini-jeux
    const seg = (T.house - T.jobs) / 4, lt = t - T.jobs, i = Math.min(3, Math.floor(lt / seg)), f = lt / seg - i;
    const cx = i < 3 ? lerp(jobX(i), jobX(i + 1), ease.io(inv(.62, 1, f))) : jobX(3);
    jobChars.forEach((c, j) => { const lj = lt - j * seg; poseIdle(c, t + j); c.position.y = .46;
      if (lj > .36) { poseCheer(c, t + j); c.position.y = .46 + Math.abs(Math.sin((lj - .36) * 7)) * .7 * (1 - inv(.36, 1.6, lj)); }
      else { poseHold(c, .8); c.parts.armL.rotation.x = -1.3 + Math.sin(t * 16) * .5; c.parts.armR.rotation.x = -1.3 - Math.sin(t * 16) * .5; }
      for (let k = 0; k < 3; k++) { const m = jobCoins[j * 3 + k], u = inv(.36 + k * .09, 1.15 + k * .09, lj); m.visible = u > 0 && u < 1; m.position.set((k - 1) * 1.15, 5.6 + ease.out(u) * 2.2, 1.2); m.rotation.y = lj * 9 + k; m.scale.setScalar(Math.sin(u * Math.PI) ** .5 || .001); } });
    car.visible = false; sunAt(0, -10);
    camLook(camera, [cx, 4.6, 8.8 + Math.sin(lt * 1.6) * .3], [cx, 4.25, -10.6], 43);
  } else if (s === 'house') {                    // maison à décorer : curseur de case, meubles, couleurs
    const lt = t - T.house;
    furn.forEach((g, i) => { const u = inv(FURN_T(i), FURN_T(i) + .3, t); g.visible = u > 0; g.scale.setScalar(Math.max(.001, ease.back(u))); g.position.y = .3 + (1 - ease.out(u)) * 2.5; });
    const fi = clamp((t - FURN_T(0)) / .33 + 1, 0, 7.999), a = furn[Math.max(0, Math.floor(fi) - 1)].userData.p, b = furn[Math.floor(fi)].userData.p, cu = ease.io(inv(.15, .8, fi % 1));
    cursor.position.set(lerp(a[0], b[0], cu), .42 + Math.sin(t * 9) * .04, lerp(a[1], b[1], cu)); cursor.visible = t < FURN_T(7) + .25; cursor.scale.setScalar(1 + Math.sin(t * 9) * .05);
    const wk = (lt - 3.0) / .45; wallMat.color.set(wk < 0 ? WALLS[0] : mixHex(WALLS[0], WALLS[1], ease.io(clamp(wk))));
    homeHero.rotation.y = -2.2 + Math.sin(t * 1.4) * .3; homeHero.position.y = .3;
    if (lt > 3.0) { poseCheer(homeHero, t); homeHero.position.y = .3 + Math.abs(Math.sin((lt - 3) * 7)) * .5; } else { poseIdle(homeHero, t); poseHold(homeHero, .6); }
    sunAt(0, 0); const an = lerp(.52, .86, prog(t, T.house, T.car, ease.io));
    camLook(camera, [Math.sin(an) * 25, 16.5, Math.cos(an) * 25], [-.4, 1.4, -.6], 50);
  } else if (s === 'car') {                      // au volant dans la rue
    const lt = t - T.car, x = -24 + lt * 10.5;
    driveCar(x, 1.8, t); sunAt(x + 4, -4);
    put(folks[0], -6, -5.6, 0); wave(folks[0], t); put(folks[2], 8, -5.6, 0); wave(folks[2], t + 1); put(folks[4], 17, -5.4, 0); poseCheer(folks[4], t);
    camLook(camera, [x - 5 + lt * 1.6, 5.2 + Math.sin(t * 2) * .15, 13.5 - lt * .6], [x + 1.2, 2.1, 0], 44);
  } else if (s === 'photo') {                    // téléphone en jeu : appareil photo
    const ta = Math.min(t, SNAP);
    put(hero, -1.5, -8.6, .12, Math.abs(Math.sin(ta * 6)) * .5); poseCheer(hero, ta);
    put(folks[0], 1.6, -8.9, -.12); wave(folks[0], ta); put(folks[2], -4.2, -10.4, .3, Math.abs(Math.sin(ta * 6 + 1)) * .7); poseCheer(folks[2], ta + .5);
    put(folks[1], 4.2, -10.6, -.3); wave(folks[1], ta + .4);
    driveCar(30, 1.8, ta); fountain(ta);
    camLook(camera, [0, 4.3, 5.2 - prog(ta, T.photo, SNAP, ease.out) * 1.2], [0, 4.0, -12], 40);
  } else if (s === 'fire') {                     // incendie à éteindre ensemble
    const lt = t - T.fire, I = 1 - prog(t, T.fire + .9, FIRE_OUT, ease.io), out = t >= FIRE_OUT;
    flames.forEach((f, i) => { const k = f.userData.s * I * (.8 + .28 * Math.sin(t * 17 + i * 2.1)); f.visible = I > .03; f.scale.set(Math.max(.001, k), Math.max(.001, k * (1 + .2 * Math.sin(t * 23 + i))), Math.max(.001, k)); f.rotation.z = Math.sin(t * 9 + i) * .14; });
    smokes.forEach((m, i) => { const u = (t * .32 + i / smokes.length) % 1; m.position.set(FIRE[0] + Math.sin(i * 2.3) * 2.6 + u * 2.5, 7 + u * 13, FIRE[1] + Math.cos(i * 3.1) * 1.6); m.scale.setScalar((.7 + u * 2) * (1 - u ** 3) * (.35 + .65 * I)); });
    fireGlow.material.opacity = .6 * I * (.85 + .15 * Math.sin(t * 20)); fireGlow.visible = I > .02;
    const team = [folks[0], hero, folks[1], folks[2]];
    team.forEach((c, i) => { const [x, z] = SPRAY[i]; put(c, x, z, Math.PI + (FIRE[0] - x) * -.05);
      if (out) { poseCheer(c, t + i); c.position.y = Math.abs(Math.sin((t - FIRE_OUT) * 8 + i)) * .8; } else { poseIdle(c, t); poseHold(c, .85); }
      const hx = x + (FIRE[0] - x) * .08, hy = 3.1, hz = z - 1.35, tx = FIRE[0] + (i - 1.5) * 1.9, ty = 4.6 + (i % 2) * 1.4, tz = FIRE[1] + 3.6;
      hoses[i].position.set(hx, hy, hz + .3); hoses[i].rotation.set(-1.1, 0, 0); hoses[i].visible = !out;
      for (let k = 0; k < 9; k++) { const d = jets[i * 9 + k], u = (k + (t * 2.6 + i * .37) % 1) / 9; d.visible = !out && lt > .25 + u * .3; d.position.set(lerp(hx, tx, u), lerp(hy, ty, u) + Math.sin(u * Math.PI) * 2.4, lerp(hz, tz, u)); d.scale.setScalar(.8 + u * .9); } });
    car.visible = false; sunAt(14, -6);
    hemi.intensity = 1.15 - .12 * I; sun.color.set(mixHex('#fff1dc', '#ffc9a0', I)); sky = [mixHex(C.sky, '#8f8fb0', I * .7), mixHex(C.sky2, '#ffd2a8', I)];
    [sx, sy] = shake(t, T.fire, 16, .5);
    camLook(camera, [lerp(27, 25, prog(t, T.fire, T.party)), 8.2, 12.5], [14.2, 4.6, -6.5], 46);
  } else if (s === 'party') {                    // fête sur la place
    partyOn(t); driveCar(-24, 1.8, t); car.visible = false;
    const a = lerp(-.42, .42, prog(t, T.party, T.end, ease.io));
    camLook(camera, [Math.sin(a) * 23, 4.2 + prog(t, T.party, T.end) * 1.4, -11 + Math.cos(a) * 23], [0, 5.1, -12], 46);
    sky = ['#3d2f8f', '#ff8fb0', '#ffd49a'];
  } else {                                       // écran final : la ville en fête vue d'en haut
    partyOn(t); driveCar(-30 + (t - T.end) * 6, 1.8, t);
    const a = .55 + (t - T.end) * .06;
    camLook(camera, [Math.sin(a) * 44, 25 - (t - T.end) * .5, -12 + Math.cos(a) * 44], [0, 12, -14], 44);
    sky = ['#3d2f8f', '#ff8fb0', '#ffd49a'];
  }

  bg(sky);
  if (evening) sparkles(t, { n: 30, y: 0, h: 700, size: 9, color: '#fff6c9', seed: 3 });
  draw3D(scene, camera, { dx: sx, dy: sy });
  if (s === 'fire') { const I = 1 - prog(t, T.fire + .9, FIRE_OUT, ease.io); vignette(.5 * I, '255,90,20'); }
  vignette(evening ? .38 : .22, evening ? '30,16,70' : '0,0,0');

  // --- accroche ---
  caption(t, 0, T.town - .12, 'ET SI TU VIVAIS\nDANS CETTE VILLE ?', { font: 'Fredoka', size: 108, y: 430, anim: 'pop', inDur: .22, color: '#ffffff', stroke: '#2b2350', strokeW: 20, shadow: 'rgba(43,35,80,.55)', lineH: 1.05 });
  // --- ville ---
  if (s === 'town') { caption(t, T.town + .25, T.jobs - .25, 'EXPLORE TA PETITE VILLE', { bg: C.coral, size: 74, anim: 'pop', font: 'Fredoka' }); hud('CADEAU DU JOUR  ★', '#e08a00', win(t, T.town + 1.9, T.jobs - .3, .2)); }
  // --- métiers ---
  if (s === 'jobs') { const seg = (T.house - T.jobs) / 4, lt = t - T.jobs, i = Math.min(3, Math.floor(lt / seg)), f = lt / seg - i;
    hud(`MÉTIER ${i + 1} / 4`, JOBC[i], win(t, T.jobs + .2, T.house - .2, .15));
    const bx = 250, bw = 580, by = 368, a = win(t, T.jobs + .2, T.house - .2, .15); ctx.save(); ctx.globalAlpha = a; bar(bx, by, bw, 44, inv(0, .36, f), { color: f > .36 ? '#45d07a' : C.sun, border: '#ffffff' }); ctx.restore();
    if (f > .36 && f < .92) text('MINI-JEU RÉUSSI !', SAFE.cx, 480, { font: 'Fredoka', size: 62, color: '#ffffff', stroke: '#1f7a45', strokeW: 14, scale: ease.back(inv(.36, .52, f)), alpha: 1 - inv(.8, .92, f) });
    caption(t, T.jobs + .3, T.house - .25, '4 MÉTIERS, 4 MINI-JEUX', { bg: C.teal, size: 74, anim: 'slide', font: 'Fredoka' }); }
  // --- maison ---
  if (s === 'house') { const n = furn.filter((_, i) => t >= FURN_T(i)).length;
    hud(`MEUBLES  ${n} / 30`, '#8f6bff', win(t, T.house + .2, T.car - .2, .15));
    caption(t, T.house + .3, T.house + 2.9, 'DÉCORE TA MAISON', { bg: '#8f6bff', size: 80, anim: 'pop', font: 'Fredoka' });
    caption(t, T.house + 3.0, T.car - .2, 'CHANGE LES COULEURS', { bg: C.teal, size: 72, anim: 'pop', font: 'Fredoka' }); }
  // --- véhicules ---
  if (s === 'car') { speedLines(t, { alpha: .16, cy: H * .5, inner: 760, n: 26 }); caption(t, T.car + .3, T.photo - .2, '3 VÉHICULES À CONDUIRE', { bg: '#ff5d5d', size: 72, anim: 'slide', font: 'Fredoka' }); }
  // --- photo ---
  if (s === 'photo') { phoneUI(t); caption(t, T.photo + .15, T.fire - .15, t < SNAP ? 'TON TÉLÉPHONE EN JEU' : 'CLIC ! PHOTO SOUVENIR', { bg: C.sun, color: '#2b2350', size: 66, y: 310, anim: t < SNAP ? 'pop' : 'fade', inDur: t < SNAP ? .28 : .01, font: 'Fredoka' }); }
  // --- incendie ---
  if (s === 'fire') { const I = 1 - prog(t, T.fire + .9, FIRE_OUT, ease.io), a = win(t, T.fire + .15, FIRE_OUT + .1, .15);
    pill('INCENDIE EN VILLE !', SAFE.cx, 290, { size: 50, bg: '#e23b3b', color: '#ffffff', font: 'Fredoka', border: '#ffffff', alpha: a, scale: 1 + Math.sin(t * 14) * .03 });
    ctx.save(); ctx.globalAlpha = a; bar(250, 368, 580, 44, I, { color: '#ff7a1a', border: '#ffffff' }); ctx.restore();
    caption(t, T.fire + .3, FIRE_OUT - .05, 'ÉTEINS-LE AVEC TES AMIS', { bg: '#e23b3b', size: 70, anim: 'pop', font: 'Fredoka' });
    caption(t, FIRE_OUT, T.party - .1, 'ÉTEINT ! BRAVO !', { font: 'Fredoka', size: 130, y: 470, anim: 'slam', grad: ['#ffffff', '#b8ffd0'], stroke: '#1f7a45', strokeW: 22 }); }
  // --- fête ---
  if (s === 'party') { confetti(t, T.party, { cy: H * .5 }); confetti(t, T.party + BAR, { cy: H * .55, n: 90, power: 1700 });
    caption(t, T.party + .1, T.party + BAR - .15, 'PLACE À LA FÊTE !', { font: 'Fredoka', size: 124, y: 430, anim: 'slam', grad: ['#fff6c9', '#ffd24d'], stroke: '#2b2350', strokeW: 22 });
    caption(t, T.party + BAR, T.end - .2, 'CRÉE TES HISTOIRES\nAVEC TES AMIS', { bg: '#ff6f9d', size: 70, anim: 'pop', font: 'Fredoka' }); }
  // --- écran final ---
  if (s === 'end') { const lt = t - T.end; fade(.5 * inv(0, .4, lt), '#231a52'); rays(t, { cy: 640, color: 'rgba(255,220,140,.10)', speed: .15 }); sparkles(t, { y: 240, h: 1100, color: '#fff6c9', seed: 9 });
    confetti(t, T.end + .2, { cy: 560, n: 80, life: 3.6 });
    endCard(t, T.end + .15, { title: 'TINY TOWN\nLIFE', tagline: 'Ton métier, ta maison, ta ville', status: 'bientot', font: 'Fredoka', titleGrad: ['#fffbe0', '#ffd24d'], titleStroke: '#2b2350', accent: C.coral }); }

  // --- transitions ---
  flash(t, T.town, .3);
  wipe(t, T.jobs, { color: C.sun, color2: C.coral, dur: .45 });
  wipe(t, T.house, { color: C.lav, color2: C.teal, dir: 'right', dur: .45 });
  wipe(t, T.car, { color: '#ff5d5d', color2: C.sun, dur: .45 });
  flash(t, T.photo, .25);
  flash(t, T.fire, .35, '255,120,40');
  flash(t, T.party, .4);
  flash(t, T.end, .35, '255,240,200');
}

registerAd({ duration: DURATION, thumbTime: T.party + 1.2, render,
  music: { style: 'cozy', bpm: 92, sections: [[0, 'intro'], [T.town, 'build'], [T.jobs, 'drop'], [T.photo, 'break'], [T.fire, 'build'], [T.party, 'drop2']], end: T.end + .1 } });
