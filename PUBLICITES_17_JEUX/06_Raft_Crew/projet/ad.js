// Publicité « Raft Crew » : océan animé, radeau qui s'agrandit case par case, crochet, artisanat, équipe de 4, requin, îles.
// Statut du jeu : bientôt (publié en privé). Tout est dessiné par le code, aucune ressource externe.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseJump, poseHold, bushyTree, cloud, showOnly, glow, sign, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles,
  text, caption, pill, bar, roundRect, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Lilita', 'Inter']);
const BPM = 104, BAR = 240 / BPM;                                   // une mesure = 2,31 s
const T = { hook: 0, croc: 2 * BAR, build: 4 * BAR, craft: 6 * BAR, crew: 8 * BAR, shark: 10 * BAR, isle: 12 * BAR, end: 14 * BAR }, DURATION = 16 * BAR;   // 36,9 s

// ---------- palette ----------
const C = { sea: '#17a6c9', seaDeep: '#0b76a8', seaLight: '#7fe3ee', sky: '#3fb4f0', skyLow: '#d6f5ff', wood: ['#c98d4e', '#b97c3f', '#d9a05f', '#a86f36', '#cf9655'], woodDark: '#7a4a22',
  sand: '#f6d98c', coral: '#ff5a3c', sun: '#ffd23f', leaf: '#35b863', shark: '#5f7488', belly: '#eef3f6', navy: '#0d3b53', rope: '#ecdcae' };
const col = h => new THREE.Color(h);
const MOOD = {
  day: { deep: col('#0c7fb4'), mid: col('#19a9cc'), light: col('#8be9f0'), fog: '#cfefff', amp: 1 },
  storm: { deep: col('#0a4f7c'), mid: col('#157fa6'), light: col('#6fc6d8'), fog: '#9fc3d6', amp: 1.45 },
  sunset: { deep: col('#2a4f9c'), mid: col('#3f7fc4'), light: col('#ffc59a'), fog: '#ffd0a0', amp: .9 },
};

// ---------- scène 3D : tout est construit une seule fois ----------
gl3D({ exposure: 1.05 });
const scene = new THREE.Scene(), camera = makeCamera(45);
scene.fog = new THREE.Fog('#cfefff', 42, 118);
const lights = addLights(scene, { shadowArea: 20, dir: [8, 14, 9], sunI: 2.5, ambI: 1.2, sky: '#d8f1ff', ground: '#3b8fb0' });
const world = new THREE.Group(); scene.add(world);

// --- océan : grille resserrée au centre, hauteur et couleur recalculées à chaque image à partir de t ---
function wave(x, z, t, a = 1) { return a * (.36 * Math.sin(x * .33 + t * 1.25) + .28 * Math.sin(z * .27 + x * .11 - t * .95) + .12 * Math.sin((x - z) * .62 + t * 1.9)); }
const SEG = 96, SEA = 150, NV = (SEG + 1) * (SEG + 1);
const seaPos = new Float32Array(NV * 3), seaCol = new Float32Array(NV * 3), seaIdx = [];
for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) {
  const u = i / SEG * 2 - 1, v = j / SEG * 2 - 1, k = (j * (SEG + 1) + i) * 3;
  seaPos[k] = Math.sign(u) * Math.pow(Math.abs(u), 1.6) * SEA; seaPos[k + 2] = Math.sign(v) * Math.pow(Math.abs(v), 1.6) * SEA;
}
for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) { const a = j * (SEG + 1) + i, b = a + 1, c = a + SEG + 1, d = c + 1; seaIdx.push(a, c, b, b, c, d); }
const seaGeo = new THREE.BufferGeometry();
seaGeo.setAttribute('position', new THREE.BufferAttribute(seaPos, 3)); seaGeo.setAttribute('color', new THREE.BufferAttribute(seaCol, 3)); seaGeo.setIndex(seaIdx);
seaGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SEA * 1.5);
const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .38, metalness: 0 }));
sea.receiveShadow = true; sea.frustumCulled = false; world.add(sea);
function updateSea(t, m, ox = 0, oz = 0) {
  for (let k = 0; k < NV * 3; k += 3) {
    const x = seaPos[k], z = seaPos[k + 2], h = wave(x + ox, z + oz, t, m.amp); seaPos[k + 1] = h;
    const q = clamp(h / (m.amp * .62) * .5 + .5), a = q < .55 ? m.deep : m.mid, b = q < .55 ? m.mid : m.light, f = q < .55 ? q / .55 : Math.pow((q - .55) / .45, 1.6);
    seaCol[k] = lerp(a.r, b.r, f); seaCol[k + 1] = lerp(a.g, b.g, f); seaCol[k + 2] = lerp(a.b, b.b, f);
  }
  seaGeo.attributes.position.needsUpdate = true; seaGeo.attributes.color.needsUpdate = true; scene.fog.color.set(m.fog);
}

// --- radeau : grille 4 x 4 de cases de 3 unités (planches + traverses) ---
const CELL = 3, DECK = .33;
const raft = new THREE.Group(); world.add(raft);
function makeCell(seed) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) { const p = rbox(.7, .22, 2.84 + hash(seed * 7 + k) * .12, .05, C.wood[Math.floor(hash(seed * 3.1 + k * 1.7) * 5)], { rough: .85 }); p.rotation.x = Math.PI / 2; p.rotation.z = 0; p.position.set(-1.125 + k * .75, .2 + hash(seed + k * 5) * .03, 0); p.scale.set(1, 1, 1); g.add(p); }
  for (const z of [-.95, .95]) g.add(box(2.96, .2, .34, C.woodDark, { pos: [0, 0, z], rough: .9 }));
  for (const [x, z] of [[-1.2, -1.2], [1.2, 1.2]]) g.add(cyl(.07, .07, .1, '#5b3413', { pos: [x * .93, .33, z * .8], seg: 6 }));
  return g;
}
// (les planches sont des boîtes arrondies extrudées : on les couche pour que leur longueur suive z)
const CELLS = [];
const ORDER = [[-1, -1], [0, -1], [-1, 0], [0, 0], [-2, -2], [-1, -2], [0, -2], [1, -2], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-2, 1], [-2, 0], [-2, -1]];
ORDER.forEach(([i, j], k) => { const c = makeCell(k + 1); c.userData = { x: (i + .5) * CELL, z: (j + .5) * CELL }; c.position.set(c.userData.x, 0, c.userData.z); raft.add(c); CELLS.push(c); });
const ghost = box(2.86, .34, 2.86, '#52ff8f', { opacity: .5, emissive: '#1fae55', emissiveI: .7, cast: false, receive: false }); raft.add(ghost);

// --- équipements : établi (poste d'artisanat), mât avec fanion, caisse et tonneau ---
function makeBarrel(r = .62, h = 1.3) { const g = new THREE.Group(); g.add(cyl(r * .86, r * .86, h, '#b57a3c', { seg: 12 })); const mid = cyl(r, r, h * .5, '#c08544', { seg: 12 }); g.add(mid); for (const y of [-.34, .34]) g.add(cyl(r * .97, r * .97, .09, '#4a3a2a', { pos: [0, y * h, 0], seg: 12 })); g.add(cyl(r * .78, r * .78, .04, '#8a5a2a', { pos: [0, h / 2 + .01, 0], seg: 12 })); return g; }
function makeCrate(s = 1.2) { const g = new THREE.Group(); g.add(box(s, s, s, '#c99455', { rough: .9 })); for (const y of [-1, 1]) for (const z of [-1, 1]) g.add(box(s * 1.05, s * .14, s * .14, '#8a5a2a', { pos: [0, y * s * .45, z * s * .47] })); for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(box(s * .14, s * 1.05, s * .14, '#8a5a2a', { pos: [x * s * .47, 0, z * s * .47] })); return g; }
function makeBench() {
  const g = new THREE.Group();
  g.add(rbox(2.6, .26, 1.4, .06, '#d9a05f', { pos: [0, 1.75, 0] }));
  for (const x of [-1.1, 1.1]) for (const z of [-.5, .5]) g.add(box(.22, 1.65, .22, C.woodDark, { pos: [x, .82, z] }));
  g.add(box(2.3, .12, 1.1, '#a86f36', { pos: [0, .5, 0] }));
  g.add(box(2.6, 1.5, .14, '#b97c3f', { pos: [0, 2.6, -.66] }));                                   // panneau à outils
  g.add(box(.12, .9, .06, '#6b7785', { pos: [-.8, 2.75, -.56], rot: [0, 0, .35] })); g.add(box(.5, .3, .1, '#6b7785', { pos: [-.95, 3.12, -.56], rot: [0, 0, .35] }));     // marteau accroché
  g.add(box(.9, .34, .05, '#cfd6dd', { pos: [.55, 2.75, -.56], rot: [0, 0, -.2] })); g.add(box(.32, .3, .08, '#a8442e', { pos: [1.02, 2.66, -.56], rot: [0, 0, -.2] }));    // scie
  g.add(box(.8, .34, .5, '#55606c', { pos: [-.7, 2.05, .1], rough: .4 })); g.add(box(.5, .18, .34, '#3d4650', { pos: [-.7, 1.9, .1] }));                                  // enclume
  const log = cyl(.2, .2, 1.1, '#c08544', { seg: 8, pos: [.6, 2.07, .15], rot: [0, .3, Math.PI / 2] }); g.add(log);
  g.add(makeBarrel(.3, .6).translateX(.7).translateY(.86));
  return g;
}
const bench = makeBench(); bench.position.set(-4.5, DECK, 4.55); bench.rotation.y = Math.PI; raft.add(bench);
const mast = new THREE.Group(); mast.position.set(0, DECK, 0); raft.add(mast);
mast.add(cyl(.16, .2, 7.4, '#8a5a2a', { seg: 8, pos: [0, 3.7, 0] })); mast.add(cyl(.34, .4, .3, '#6a4520', { seg: 8, pos: [0, .15, 0] })); mast.add(ball(.24, C.sun, { pos: [0, 7.45, 0], rough: .3, emissive: '#7a5a00' }));
const flagGeo = new THREE.BufferGeometry(); flagGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 1.5, 0, 2.6, .75, 0]), 3)); flagGeo.computeVertexNormals();
const flagPivot = new THREE.Group(); flagPivot.position.set(0, 5.7, 0); mast.add(flagPivot);
flagPivot.add(new THREE.Mesh(flagGeo, mat(C.coral, { side: 'double', rough: .8 })));
const stock = new THREE.Group(); stock.position.set(4.5, DECK, -4.5); raft.add(stock);
stock.add(makeCrate(1.25).translateY(.63).translateX(-.3)); const sb = makeBarrel(); sb.position.set(.75, .65, .7); stock.add(sb);

// --- équipage de 4 (personnages en blocs du moteur) ---
const SC = .72;
const mk = o => { const c = makeCharacter({ scale: SC, ...o }); raft.add(c); return c; };
const hero = mk({ shirt: C.coral, pants: '#27456b', hair: '#4a2f1a', face: 'happy' });
const heroScared = mk({ shirt: C.coral, pants: '#27456b', hair: '#4a2f1a', face: 'scared' });
const heroWow = mk({ shirt: C.coral, pants: '#27456b', hair: '#4a2f1a', face: 'wow' });
const p2 = mk({ shirt: C.sun, pants: '#2d5a3d', hat: 'cap', hatColor: '#1f8fd6', skin: '#c98d5e', face: 'happy' });
const p3 = mk({ shirt: '#35c979', pants: '#5a3a1e', hair: '#e8b23a', face: 'smile', skin: '#f7d3b0' });
const p4 = mk({ shirt: '#9a6bff', pants: '#2b3350', hair: '#22222c', face: 'happy', skin: '#8a5a3c' });
const CREW = [hero, p2, p3, p4], ALLCH = [hero, heroScared, heroWow, p2, p3, p4];
function addTools(ch) {
  const hammer = new THREE.Group(); hammer.add(cyl(.09, .09, 1.5, '#8a5a2a', { seg: 6, rot: [Math.PI / 2, 0, 0], pos: [0, 0, .55] })); hammer.add(box(.42, .42, .7, '#6b7785', { pos: [0, 0, 1.3], rough: .4 })); hammer.position.set(0, -1.85, .1); ch.parts.armR.add(hammer);
  const paddle = new THREE.Group(); paddle.add(cyl(.1, .1, 3.2, '#a86f36', { seg: 6, rot: [Math.PI / 2, 0, 0], pos: [0, 0, 1.3] })); paddle.add(rbox(.8, .12, 1.4, .05, '#d9a05f', { pos: [0, 0, 3.3] })); paddle.position.set(0, -1.85, .1); ch.parts.armR.add(paddle);
  ch.tools = { hammer, paddle };
}
ALLCH.forEach(addTools);

// --- crochet et corde ---
const hook = new THREE.Group(); world.add(hook);
{ const m = mat('#dfe6ec', { rough: .3, emissive: '#39424a', emissiveI: .5 });
  hook.add(cyl(.08, .08, .9, m, { seg: 8, pos: [0, .45, 0] }));
  const arc = new THREE.Mesh(new THREE.TorusGeometry(.36, .085, 8, 18, Math.PI * 1.15), m); arc.rotation.z = Math.PI; arc.position.set(.36, 0, 0); arc.castShadow = true; hook.add(arc);
  hook.add(cone(.14, .34, m, { seg: 8, pos: [.74, .2, 0] })); hook.add(torus(.12, .04, m, { pos: [0, .98, 0], seg: 12 })); hook.scale.setScalar(1.5); }
const ROPE = []; for (let i = 0; i < 6; i++) { const r = cyl(.055, .055, 1, C.rope, { seg: 6, receive: false }); world.add(r); ROPE.push(r); }
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3();
function between(m, a, b) { _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); _d.subVectors(_b, _a); const L = Math.max(.001, _d.length()); m.position.copy(_a).addScaledVector(_d, .5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(_up, _d.normalize()); }
function setRope(a, b, sag) { let prev = a; for (let i = 0; i < ROPE.length; i++) { const u = (i + 1) / ROPE.length, p = [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * sag, lerp(a[2], b[2], u)]; between(ROPE[i], prev, p); ROPE[i].visible = true; prev = p; } }
/** Position écran d'un point 3D (pour coller un effet 2D sur un objet). */
function proj(x, y, z) { _p.set(x, y, z).project(camera); return [(_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H]; }

// --- objets flottants ---
function makePlank() { const g = new THREE.Group(); g.add(rbox(2.4, .22, .7, .06, C.wood[2])); g.add(rbox(2.1, .22, .6, .06, C.wood[0], { pos: [.2, .12, .5], rot: [0, .25, 0] })); return g; }
function makeLeaf() { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const l = cone(.3, 2.2, C.leaf, { seg: 4, flat: true }); l.scale.set(1, 1, .15); l.rotation.set(Math.PI / 2, 0, (i - 2) * .5); l.position.set(Math.sin((i - 2) * .5) * -1, 0, 0); l.rotation.set(Math.PI / 2, 0, 0); l.rotation.y = (i - 2) * .45; l.position.set(Math.sin((i - 2) * .45) * .9, 0, Math.cos((i - 2) * .45) * .9); g.add(l); } return g; }
const TARGETS = [{ m: makePlank(), x: -3.4, z: -11.5, dy: .1 }, { m: (() => { const b = makeBarrel(.7, 1.5); b.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(b); return g; })(), x: 3.2, z: -14, dy: .25 }, { m: makeCrate(1.3), x: -.4, z: -10.5, dy: .3 }];
TARGETS.forEach(o => world.add(o.m));
const DEBRIS = []; for (let i = 0; i < 12; i++) { const k = i % 4, m = k === 0 ? makePlank() : k === 1 ? makeCrate(1) : k === 2 ? (() => { const b = makeBarrel(.6, 1.3); b.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(b); return g; })() : makeLeaf();
  const a = hash(i * 3.3) * 6.283, r = 10 + hash(i * 5.1) * 22; DEBRIS.push({ m, x: Math.cos(a) * r, z: Math.sin(a) * r - 6, ph: hash(i) * 6, dy: k === 3 ? .12 : .18 }); world.add(m); }
function setDebris(t, on, amp, dx = 0, dz = 0) { DEBRIS.forEach((o, i) => { o.m.visible = on; if (!on) return; const x = o.x + dx, z = o.z + dz; o.m.position.set(x, wave(x, z, t, amp) + o.dy, z); o.m.rotation.set(Math.sin(t * 1.3 + o.ph) * .12, o.ph + t * .1, Math.cos(t * 1.1 + o.ph) * .12); }); }

// --- éclaboussures et ronds dans l'eau ---
function makeSplash() { const g = new THREE.Group(); g.drops = []; for (let i = 0; i < 14; i++) { const d = ball(.2, '#ffffff', { seg: 8, seg2: 6, cast: false, receive: false, emissive: '#9adfff', emissiveI: .4 }); g.add(d); g.drops.push(d); } g.ring = torus(1, .07, '#ffffff', { rot: [Math.PI / 2, 0, 0], cast: false, receive: false, seg: 28 }); g.add(g.ring); world.add(g); return g; }
const SPL = [makeSplash(), makeSplash(), makeSplash(), makeSplash()];
function splash(sp, lt, x, y, z, pw = 1) {
  if (lt < 0 || lt > 1) { sp.visible = false; return; } sp.visible = true; sp.position.set(x, y, z);
  sp.drops.forEach((d, i) => { const a = i / 14 * 6.283 + hash(i) * .5, vr = (1.2 + hash(i * 3) * 2.2) * pw, vy = (4.5 + hash(i * 7) * 4) * pw; d.position.set(Math.cos(a) * vr * lt, Math.max(-.3, vy * lt - 9 * lt * lt * pw), Math.sin(a) * vr * lt); d.scale.setScalar((1 - lt * .7) * (.7 + hash(i * 2) * .8) * pw); });
  const rs = (.6 + lt * 3.2) * pw; sp.ring.scale.set(rs, rs, Math.max(.05, 1 - lt)); sp.ring.visible = lt < .8;
}

// --- requin ---
function finGeo(draw, th = .16) { const s = new THREE.Shape(); draw(s); const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -th / 2); g.rotateY(-Math.PI / 2); return g; }
const shark = new THREE.Group(), sharkIn = new THREE.Group(); shark.add(sharkIn); world.add(shark);
const sharkTail = new THREE.Group(), sharkJaw = new THREE.Group(), sharkWake = new THREE.Group();
{ const gm = mat(C.shark, { rough: .5 }), wm = mat(C.belly, { rough: .6 });
  const body = ball(1, gm, { seg: 28, seg2: 18 }); body.scale.set(1.12, 1.0, 4.2); sharkIn.add(body);
  const belly = ball(1, wm, { seg: 24, seg2: 16 }); belly.scale.set(1.0, .9, 3.95); belly.position.set(0, -.24, .1); sharkIn.add(belly);
  const dorsal = new THREE.Mesh(finGeo(s => { s.moveTo(1.1, 0); s.quadraticCurveTo(.2, 1.7, -1.15, 2.3); s.quadraticCurveTo(-.5, 1.0, -.95, 0); s.closePath(); }, .2), gm); dorsal.position.set(0, .8, .2); dorsal.castShadow = true; sharkIn.add(dorsal);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(finGeo(q => { q.moveTo(.8, 0); q.quadraticCurveTo(.1, 1.2, -1.0, 1.8); q.quadraticCurveTo(-.4, .8, -.6, 0); q.closePath(); }, .14), gm); f.rotation.z = -s * 2.0; f.position.set(s * .85, -.35, 1.0); sharkIn.add(f); }
  sharkTail.position.set(0, 0, -3.75); sharkIn.add(sharkTail);
  const lobe = q => { q.moveTo(.5, 0); q.quadraticCurveTo(-.5, 1.3, -1.8, 2.4); q.quadraticCurveTo(-1.0, .9, -.6, 0); q.closePath(); };
  const tu = new THREE.Mesh(finGeo(lobe, .16), gm); sharkTail.add(tu); const tl = new THREE.Mesh(finGeo(lobe, .16), gm); tl.scale.y = -.62; sharkTail.add(tl);
  for (const s of [-1, 1]) { sharkIn.add(ball(.24, '#ffffff', { pos: [s * .68, .26, 3.08], seg: 12, seg2: 10 })); sharkIn.add(ball(.14, '#12161c', { pos: [s * .78, .27, 3.24], seg: 10, seg2: 8, rough: .2 })); sharkIn.add(box(.5, .08, .5, '#3d4d5c', { pos: [s * .72, .52, 3.12], rot: [0, 0, s * .5] })); }
  sharkIn.add(ball(1, '#b3262c', { pos: [0, -.74, 2.95], seg: 16, seg2: 10 }).translateY(0)); sharkIn.children[sharkIn.children.length - 1].scale.set(.74, .26, 1.0);
  for (let i = 0; i < 9; i++) { const a = (i - 4) * .3; sharkIn.add(cone(.09, .26, '#ffffff', { seg: 6, pos: [Math.sin(a) * .66, -.98, 2.95 + Math.cos(a) * .92], rot: [Math.PI, 0, 0] })); }
  sharkJaw.position.set(0, -.86, 2.0); sharkIn.add(sharkJaw);
  const jaw = ball(1, wm, { seg: 18, seg2: 10 }); jaw.scale.set(.8, .22, 1.1); jaw.position.set(0, -.16, .95); sharkJaw.add(jaw);
  for (let i = 0; i < 9; i++) { const a = (i - 4) * .3; sharkJaw.add(cone(.09, .26, '#ffffff', { seg: 6, pos: [Math.sin(a) * .64, .06, .95 + Math.cos(a) * .9] })); }
  for (const s of [-1, 1]) sharkWake.add(box(.16, .06, 3.4, '#ffffff', { pos: [s * .8, 0, -2.2], rot: [0, -s * .32, 0], cast: false, receive: false, emissive: '#bfefff', emissiveI: .5 }));
  sharkWake.position.y = 1.38; shark.add(sharkWake); shark.scale.setScalar(.9); }
function setShark(x, y, z, yaw, pitch = 0, roll = 0, jawOpen = 0, tailPh = 0, wake = false) { shark.visible = true; shark.position.set(x, y, z); shark.rotation.set(0, yaw, 0); sharkIn.rotation.set(pitch, 0, roll); sharkJaw.rotation.x = jawOpen; sharkTail.rotation.y = Math.sin(tailPh) * .45; sharkWake.visible = wake; }
const hitGlow = glow('#fff2a8', 6, 1); world.add(hitGlow);
const sparks = []; for (let i = 0; i < 5; i++) { const s = glow('#ffd23f', 1.2, 1); world.add(s); sparks.push(s); }

// --- îles (2 dans la version du jeu) ---
function palm(h = 7, lean = .3) {
  const g = new THREE.Group(); let x = 0, y = 0; const n = 6, L = h / n;
  for (let s = 0; s < n; s++) { const a = lean * (s / (n - 1)) * 1.5, seg = cyl(.26 - s * .02, .3 - s * .02, L + .12, s % 2 ? '#9a6b3f' : '#8a5d34', { seg: 7 }); seg.position.set(x + Math.sin(a) * L / 2, y + Math.cos(a) * L / 2, 0); seg.rotation.z = -a; g.add(seg); x += Math.sin(a) * L; y += Math.cos(a) * L; }
  const top = new THREE.Group(); top.position.set(x, y, 0); g.add(top); g.top = top;
  for (let i = 0; i < 8; i++) { const piv = new THREE.Group(); piv.rotation.y = i * Math.PI / 4 + .2; const l = cone(.55, 3.8, i % 2 ? '#2fa858' : C.leaf, { seg: 4, flat: true }); l.scale.set(1, 1, .16); l.rotation.x = Math.PI / 2 + .5; l.position.set(0, -.55, 1.6); piv.add(l); top.add(piv); }
  for (let i = 0; i < 3; i++) top.add(ball(.3, '#6b4423', { pos: [Math.cos(i * 2.1) * .35, -.3, Math.sin(i * 2.1) * .35], seg: 8, seg2: 6 }));
  return g;
}
const isles = new THREE.Group(); world.add(isles);
const isleA = new THREE.Group(), isleB = new THREE.Group(); isles.add(isleA, isleB);
{ const sandM = mat(C.sand, { rough: .95, flat: true });
  const s1 = ball(1, sandM, { seg: 18, seg2: 10 }); s1.scale.set(10, 2.4, 7.5); s1.position.y = -.9; isleA.add(s1);
  const g1 = ball(1, '#58c46a', { seg: 14, seg2: 8, flat: true }); g1.scale.set(5.5, 1.5, 4); g1.position.set(-1, .6, -1); isleA.add(g1);
  const pa = palm(8, .32); pa.position.set(-3.2, .9, 0); isleA.add(pa); const pb = palm(6.5, -.28); pb.position.set(2.8, .9, -.5); isleA.add(pb); const pc = palm(5.5, .2); pc.position.set(.2, 1.4, -2.4); pc.rotation.y = 1; isleA.add(pc);
  isleA.palms = [pa, pb, pc];
  for (let i = 0; i < 6; i++) { const r = ball(.5 + hash(i) * .6, '#8b949c', { seg: 6, seg2: 5, flat: true }); r.position.set(-7 + hash(i * 3) * 14, .5, 3.5 + hash(i * 7) * 2.4); r.scale.y = .7; isleA.add(r); }
  const b1 = bushyTree(2.4, '#2fa858'); b1.position.set(5.6, .7, .8); isleA.add(b1);
  const sign1 = new THREE.Group(); sign1.add(box(.16, 1.6, .16, C.woodDark, { pos: [0, .8, 0] })); sign1.add(rbox(1.3, .6, .12, .08, C.wood[2], { pos: [0, 1.5, 0] })); sign1.position.set(.6, 1.1, 3.2); isleA.add(sign1);
  // île B : piton rocheux et jungle
  const s2 = ball(1, sandM, { seg: 18, seg2: 10 }); s2.scale.set(11, 2, 9); s2.position.y = -.8; isleB.add(s2);
  isleB.add(cone(6, 11, '#8d8478', { seg: 7, flat: true, pos: [0, 5.5, -1] })); isleB.add(cone(3.3, 5.5, '#a59c8f', { seg: 6, flat: true, pos: [3.4, 3.3, .6] }));
  isleB.add(cone(4.6, 4, '#3fae5a', { seg: 7, flat: true, pos: [0, 2.4, -1] })); isleB.add(cone(1.5, 2.2, '#f5f7fa', { seg: 7, flat: true, pos: [0, 10, -1] }));
  for (let i = 0; i < 6; i++) { const b = bushyTree(2.6 + hash(i) * 1.4, i % 2 ? '#2fa858' : '#49b356'); b.position.set(-7 + i * 2.7, .8, 3.2 + hash(i * 3) * 2.5); isleB.add(b); }
  const pd = palm(7, .3); pd.position.set(-6.5, .8, 2); isleB.add(pd); const pe = palm(6, -.3); pe.position.set(7, .8, 1.5); isleB.add(pe); isleB.palms = [pd, pe]; }
const CLOUDS = []; for (let i = 0; i < 6; i++) { const c = cloud(3 + hash(i) * 2.5); c.userData = { x: (hash(i * 5) - .5) * 110, y: 22 + hash(i * 2) * 14, z: -70 - hash(i * 9) * 20 }; world.add(c); CLOUDS.push(c); }

// ---------- repères sonores (déclarés une fois) ----------
const CROC = [T.croc + .3, T.croc + 1.68, T.croc + 3.06], CYC = 1.34;         // 3 lancers de crochet
const BUILD = i => T.build + .45 + i * .26;                                     // pose de la case i (0 à 11)
const SLOT = i => T.craft + .55 + i * .33;                                      // recette i (0 à 9)
const JOIN = i => T.crew + .15 + i * .42;                                       // arrivée du joueur i
const SH = { lunge: T.shark + 1.5, hit: T.shark + 2.72, dive: T.shark + 3.15 };
cue(0.02, 'splash', .8); cue(.12, 'whoosh'); cue(.9, 'heartbeat', .7); cue(1.5, 'heartbeat', .7); cue(2.35, 'pop');
cue(T.croc - .15, 'whoosh'); cue(T.croc, 'impact', .8);
CROC.forEach(c => { cue(c + .22, 'swish'); cue(c + .6, 'splash', .8); cue(c + CYC - .08, 'coin', .8); });
cue(T.build - .2, 'whoosh'); for (let i = 0; i < 12; i++) cue(BUILD(i), i % 2 ? 'tap' : 'thud', .75); cue(T.build + 3.75, 'pop'); cue(T.build + 4.05, 'ding');
cue(T.craft - .2, 'slide'); for (let i = 0; i < 10; i++) cue(SLOT(i), 'tick', .8); cue(SLOT(9) + .25, 'powerup');
cue(T.crew, 'impact', .8); for (let i = 0; i < 4; i++) cue(JOIN(i) + .3, 'pop'); cue(T.crew + 2.35, 'chime');
cue(T.shark - .25, 'sweepdown'); cue(T.shark, 'boom', .8); cue(T.shark + .1, 'riser', .8, 1.35); cue(T.shark + .35, 'heartbeat'); cue(T.shark + .95, 'heartbeat');
cue(SH.lunge, 'splash'); cue(SH.lunge + .05, 'boom'); cue(SH.lunge + .45, 'crunch'); cue(SH.lunge + .85, 'crunch', .8); cue(SH.hit - .12, 'swish'); cue(SH.hit, 'impact'); cue(SH.hit + .05, 'boing', .6); cue(SH.dive, 'splash'); cue(SH.dive + .35, 'win');
cue(T.isle - .15, 'whoosh'); cue(T.isle, 'chime'); cue(T.isle + 2.55, 'ding'); cue(T.isle + 2.7, 'pop');
cue(T.end - .2, 'whoosh'); cue(T.end, 'impact'); cue(T.end + .2, 'splash', .6); cue(T.end + .95, 'pop'); cue(T.end + 1.4, 'chime');

// ---------- aides de mise en scène ----------
function resetAll() {
  for (const c of ALLCH) { c.visible = false; c.position.set(0, DECK, 0); c.rotation.set(0, 0, 0); c.scale.setScalar(SC); const p = c.parts; for (const k in p) p[k].rotation.set(0, 0, 0); c.tools.hammer.visible = false; c.tools.paddle.visible = false; }
  CELLS.forEach(c => { c.visible = true; c.scale.setScalar(1); c.position.set(c.userData.x, 0, c.userData.z); c.rotation.set(0, 0, 0); });
  ghost.visible = false; bench.visible = mast.visible = stock.visible = true; bench.scale.setScalar(1); mast.scale.setScalar(1); stock.scale.setScalar(1);
  hook.visible = false; ROPE.forEach(r => r.visible = false); TARGETS.forEach(o => o.m.visible = false); SPL.forEach(s => s.visible = false);
  shark.visible = false; hitGlow.visible = false; sparks.forEach(s => s.visible = false); isles.visible = false;
}
function setRaft(t, n, amp, { equip = n >= 16, tilt = 1 } = {}) {
  CELLS.forEach((c, k) => c.visible = k < n); bench.visible = mast.visible = stock.visible = equip;
  const e = .6, hx = (wave(e, 0, t, amp) - wave(-e, 0, t, amp)) / (2 * e), hz = (wave(0, e, t, amp) - wave(0, -e, t, amp)) / (2 * e);
  raft.position.set(0, wave(0, 0, t, amp) * .5 + .12, 0); raft.rotation.set(hz * .45 * tilt, 0, -hx * .45 * tilt);
  flagPivot.rotation.y = -.5 + Math.sin(t * 5) * .35;
}
function setSky(t, far = 0) { CLOUDS.forEach((c, i) => { c.visible = true; c.position.set(c.userData.x + t * .5, c.userData.y, c.userData.z - far); }); }
function hammering(ch, t, sp = 14) { ch.tools.hammer.visible = true; ch.parts.armR.rotation.set(-1.25 + Math.max(0, Math.sin(t * sp)) * .75, 0, 0); ch.parts.armL.rotation.set(-.5, 0, .1); }
function setLight(sunI, ambI, sunCol = '#fff1dc') { lights.sun.intensity = sunI; lights.hemi.intensity = ambI; lights.sun.color.set(sunCol); }
function sunDisc(x, y, r, c1, c2) { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2); g.addColorStop(0, c1); g.addColorStop(.3, c2); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
const CAP = { font: 'Lilita', size: 96, stroke: C.navy, strokeW: 16, shadow: 'rgba(0,0,0,.4)' };
const hud = (str, x, y, o = {}) => pill(str, x, y, { size: 46, bg: C.navy, color: '#ffffff', border: C.sun, borderW: 5, ...o });

function render(t) {
  resetAll();
  let sx = 0, sy = 0, mood = MOOD.day;

  if (t < T.croc) {
    // ===== PLAN 0 : accroche. Un naufragé seul sur un petit radeau, l'aileron tourne =====
    const lt = t; bg([[0, '#2f9fe6'], [.42, '#bfeaff'], [1, '#bfeaff']]); sunDisc(830, 330, 70, '#fff6c9', 'rgba(255,240,170,.5)');
    updateSea(t, mood); setSky(t); setLight(2.5, 1.2); setRaft(t, 4, 1); setDebris(t, true, 1, -lt * .5);
    const ch = lt < 2.35 ? heroScared : hero; ch.visible = true; ch.position.set(0, DECK, 0);
    const a = 2.2 + lt * 1.5, R = 7.2;                                         // aileron qui tourne autour
    setShark(Math.cos(a) * R, -1.3 + wave(Math.cos(a) * R, Math.sin(a) * R, t) * .4, Math.sin(a) * R, -a, 0, 0, 0, t * 9, true);
    if (lt < 2.35) { ch.rotation.y = Math.atan2(Math.cos(a), Math.sin(a)) * .0 + Math.sin(lt * 2.4) * .7; ch.parts.armL.rotation.set(0, 0, -.9 + Math.sin(t * 16) * .15); ch.parts.armR.rotation.set(0, 0, .9 - Math.sin(t * 16) * .15); ch.parts.legL.rotation.x = Math.sin(t * 16) * .12; ch.parts.legR.rotation.x = -Math.sin(t * 16) * .12; ch.position.y = DECK + Math.abs(Math.sin(t * 8)) * .12; }
    else { const k = prog(t, 2.35, 2.7, ease.back); ch.rotation.y = .25; ch.parts.armR.rotation.set(0, 0, 2.6 * k); ch.parts.armL.rotation.set(0, 0, -.2); ch.position.y = DECK + Math.sin(inv(2.35, 2.8, t) * Math.PI) * .7; hook.visible = true; hook.position.set(1.55, raft.position.y + 5.5 + ch.position.y - DECK, .1); hook.rotation.set(0, 0, 0); }
    const k = prog(t, 0, T.croc, ease.io);
    camLook(camera, [lerp(3.5, 11, k) + Math.sin(t * .8) * .4, lerp(4.6, 14, k), lerp(11, 23, k)], [0, lerp(2.6, 1.6, k), 0], 44);
  } else if (t < T.build) {
    // ===== PLAN 1 : le crochet. Lancer, trajectoire, prise, retour =====
    const lt = t - T.croc; bg([[0, '#2f9fe6'], [.36, '#c9efff'], [1, '#c9efff']]); sunDisc(250, 330, 60, '#fff6c9', 'rgba(255,240,170,.5)');
    updateSea(t, mood); setSky(t); setLight(2.5, 1.2); setRaft(t, 4, 1); setDebris(t, true, 1, 4 - lt * .4, -6);
    hero.visible = true; hero.position.set(0, DECK, -1.9); hero.rotation.y = Math.PI;
    const ry = raft.position.y, hand = [-1.08, ry + 2.95, -3.35]; let armX = -1.3, any = false, yaw = 0;
    TARGETS.forEach((o, i) => {
      const c = CROC[i], u = t - c, by = wave(o.x, o.z, t) + o.dy; o.m.visible = u < CYC - .02; o.m.position.set(o.x, by, o.z); o.m.rotation.set(Math.sin(t * 1.4 + i) * .1, i * 1.3 + t * .15, Math.cos(t * 1.2 + i) * .1); o.m.scale.setScalar(1);
      splash(SPL[i], u - .6, o.x, by, o.z, .8);
      if (u < 0 || u >= CYC) return; any = true; yaw = Math.atan2(o.x, -o.z) * .6;
      const P = [o.x, by + .5, o.z], R = [-.4, ry + .7, -3.7]; let hp;
      if (u < .22) { armX = lerp(-1.3, -3.0, ease.out(u / .22)); hp = [hand[0], hand[1] + 1.3, hand[2] + 1.6]; }
      else if (u < .6) { const f = (u - .22) / .38; armX = lerp(-3.0, -1.1, ease.out(clamp(f * 3))); hp = [lerp(hand[0], P[0], f), lerp(hand[1], P[1], f) + Math.sin(f * Math.PI) * 3.6, lerp(hand[2], P[2], f)]; hook.rotation.set(-1.2 + f * 2.2, 0, f * 9); }
      else { const f = ease.io(inv(.6, CYC - .06, u)); armX = -1.1 + Math.sin(u * 20) * .28; hp = [lerp(P[0], R[0], f), lerp(P[1], R[1], f) + Math.sin(f * Math.PI) * .5, lerp(P[2], R[2], f)]; hook.rotation.set(1.2, 0, 0);
        o.m.position.set(hp[0], hp[1] - .45 + wave(hp[0], hp[2], t) * .3, hp[2]); o.m.scale.setScalar(1 - inv(.85, 1, f) * .95); }
      hook.visible = true; hook.position.set(hp[0], hp[1], hp[2]); if (u >= .22) setRope(hand, [hp[0], hp[1] + .9, hp[2]], u < .6 ? .5 : .15);
    });
    if (!any) { hook.visible = true; hook.position.set(hand[0], hand[1] - .2, hand[2]); hook.rotation.set(.4, 0, 0); }
    hero.rotation.y = Math.PI - yaw; hero.parts.armR.rotation.set(armX, 0, 0); hero.parts.armL.rotation.set(-.4, 0, -.15); hero.parts.legL.rotation.x = .25; hero.parts.legR.rotation.x = -.25;
    camLook(camera, [3.4 + Math.sin(lt * .7) * .6, 9.2 - lt * .15, 12.5 - lt * .25], [0, 1.4, -7.5], 46);
  } else if (t < T.craft) {
    // ===== PLAN 2 : construction sur grille. Le radeau s'agrandit case par case =====
    const lt = t - T.build; bg([[0, '#39aaf0'], [.3, '#c9efff'], [1, '#c9efff']]);
    updateSea(t, mood); setSky(t); setLight(2.6, 1.25); setRaft(t, 16, .8, { equip: true, tilt: .6 }); setDebris(t, true, .8, 0, 0);
    let cur = 0;
    for (let i = 0; i < 12; i++) { const c = CELLS[4 + i], bt = BUILD(i), k = inv(bt, bt + .26, t); c.visible = t >= bt; c.scale.setScalar(Math.max(.001, ease.back(k))); c.position.y = (1 - ease.bounce(k)) * 2.2; if (t >= bt - .13) cur = i; }
    const nx = CELLS[4 + cur], gk = inv(BUILD(cur) - .22, BUILD(cur), t);
    if (t < BUILD(11) && t > BUILD(0) - .3) { ghost.visible = t < BUILD(cur); ghost.position.set(nx.userData.x, .22, nx.userData.z); ghost.scale.setScalar(.9 + Math.sin(t * 30) * .04 + gk * .08); }
    const kb = prog(t, T.build + 3.7, T.build + 4.0, ease.back), km = prog(t, T.build + 3.95, T.build + 4.3, ease.back), ks = prog(t, T.build + 3.8, T.build + 4.1, ease.back);
    bench.visible = kb > 0; bench.scale.setScalar(Math.max(.001, kb)); mast.visible = km > 0; mast.scale.set(1, Math.max(.001, km), 1); stock.visible = ks > 0; stock.scale.setScalar(Math.max(.001, ks));
    hero.visible = true; const ang = Math.atan2(nx.userData.x, nx.userData.z);
    hero.position.set(Math.sin(ang) * .9 - .6, DECK, Math.cos(ang) * .9 - .6); hero.rotation.y = ang;
    if (t < BUILD(11) + .3) hammering(hero, t, 24); else poseCheer(hero, t);
    p2.visible = t > BUILD(5); if (p2.visible) { const kj = prog(t, BUILD(5), BUILD(5) + .35, ease.out); p2.position.set(3.2, DECK + (1 - ease.bounce(kj)) * 3, -1.4); p2.rotation.y = Math.atan2(nx.userData.x - 3.2, nx.userData.z + 1.4); if (t < BUILD(11) + .3) hammering(p2, t + .13, 24); else poseCheer(p2, t + .2); }
    const k = prog(t, T.build, T.craft, ease.io);
    camLook(camera, [lerp(9, 15, k), lerp(15, 25, k), lerp(13, 21, k)], [0, lerp(.5, 0, k), lerp(-.5, 1, k)], 44);
  } else if (t < T.crew) {
    // ===== PLAN 3 : artisanat. L'établi et les 10 recettes =====
    const lt = t - T.craft; bg([[0, '#39aaf0'], [.34, '#d2f3ff'], [1, '#d2f3ff']]);
    updateSea(t, mood); setSky(t); setLight(2.6, 1.25); setRaft(t, 16, .8, { tilt: .5 }); setDebris(t, true, .8);
    hero.visible = true; hero.position.set(-4.5, DECK, 2.75); hero.rotation.y = 0; hammering(hero, t, 14); hero.parts.head.rotation.x = .25;
    p3.visible = true; p3.position.set(-1.6, DECK, 3.6); p3.rotation.y = -.9; poseHold(p3, 1); p3.parts.head.rotation.y = -.3;
    const hit = Math.max(0, Math.sin(t * 14 - 1.2));
    sparks.forEach((s, i) => { s.visible = true; const ph = (t * 2.33 + i * .2) % 1; s.position.set(-5.2 + Math.cos(i * 2.4) * ph * 1.3, raft.position.y + 2.5 + ph * 1.8 - ph * ph * 1.5, 4.3 + Math.sin(i * 2.4) * ph * .8); s.scale.setScalar((1 - ph) * 1.5); });
    camLook(camera, [-1.2 + Math.sin(lt * .6) * 1.2, 5.6, 15.5 - lt * .35], [-4.1, 1.5, 3.4], 44);
  } else if (t < T.shark) {
    // ===== PLAN 4 : coopération. L'équipage de 4 =====
    const lt = t - T.crew; bg([[0, '#39aaf0'], [.26, '#d2f3ff'], [1, '#d2f3ff']]);
    updateSea(t, mood); setSky(t); setLight(2.6, 1.25); setRaft(t, 16, .85, { tilt: .6 }); setDebris(t, true, .85);
    const POS = [[-2.6, -2.4, .4], [2.8, -1.2, -.5], [-2.2, 2.9, .9], [2.6, 3.2, -.2]], party = t > T.crew + 2.35;
    CREW.forEach((c, i) => {
      const j = JOIN(i), k = inv(j, j + .38, t); c.visible = t >= j; if (!c.visible) return;
      c.position.set(POS[i][0], DECK + (1 - ease.bounce(k)) * 6 + (party ? Math.abs(Math.sin((t - T.crew) * 6.5 + i * 1.1)) * .8 : 0), POS[i][1]); c.rotation.y = POS[i][2] + lt * .28 + .5;
      if (party) poseCheer(c, t + i * .3); else if (k < 1) poseJump(c, 1 - k); else if (i === 0) hammering(c, t, 14); else if (i === 1) { c.parts.armR.rotation.set(-2.4 + Math.sin(t * 5) * .5, 0, 0); c.parts.armL.rotation.set(-.4, 0, 0); } else if (i === 2) poseHold(c, 1); else { c.parts.armR.rotation.set(0, 0, 2.5 + Math.sin(t * 10) * .3); }
    });
    const a = .55 + lt * .28;
    camLook(camera, [Math.sin(a) * 25, 19 - lt * .5, Math.cos(a) * 25], [0, 1.2, .6], 42);
  } else if (t < T.isle) {
    // ===== PLAN 5 : le requin attaque, l'équipage le repousse (moment fort) =====
    const lt = t - T.shark; mood = MOOD.storm; bg([[0, '#2a6f9e'], [.34, '#a9cfe0'], [1, '#a9cfe0']]);
    updateSea(t, mood); setSky(t); setLight(2.0, .95, '#ffe9d0'); setRaft(t, 16, 1.1, { tilt: .8 }); setDebris(t, true, 1.3);
    const bite = win(t, SH.lunge + .1, SH.hit, .12); raft.rotation.z += -.07 * bite + Math.sin(t * 38) * .02 * bite; raft.position.x = Math.sin(t * 44) * .08 * bite;
    const AX = 9.0;                                                            // le requin surgit côté +x
    if (t < SH.lunge) { const f = ease.io(inv(T.shark, SH.lunge, t)), x = lerp(27, AX + 1.6, f), z = lerp(-9, .6, f) + Math.sin(f * 5) * 1.2; setShark(x, -1.3 + wave(x, z, t, 1.4) * .4, z, -Math.PI / 2 - (1 - f) * .5, 0, 0, 0, t * 12, true); }
    else if (t < SH.hit) { const f = prog(t, SH.lunge, SH.lunge + .32, ease.out), ch = Math.sin((t - SH.lunge) * 15); setShark(lerp(AX + 1.6, AX, f) + ch * .12, lerp(-1.3, .55, f), .6, -Math.PI / 2 + ch * .06, -.5 * f, ch * .08, .25 + (.5 + .5 * ch) * .55 * f, t * 16, false); }
    else if (t < SH.dive + .35) { const f = inv(SH.hit, SH.dive + .35, t); setShark(lerp(AX, AX + 5, ease.out(f)), lerp(.55, -2.6, ease.in(f)) + Math.sin(f * Math.PI) * 1.6, .6 + f * 1.5, -Math.PI / 2 + f * 1.4, lerp(-.5, .7, f), f * 2.2, .5 * (1 - f), t * 20, false); }
    else { const f = ease.in(inv(SH.dive + .35, T.isle, t)), x = lerp(AX + 6, 34, f), z = lerp(2, -6, f); setShark(x, -1.3 + wave(x, z, t, 1.4) * .4, z, Math.PI / 2 + .2, 0, 0, 0, t * 22, true); }
    splash(SPL[0], t - SH.lunge, AX - 2.4, .1, .6, 1.9); splash(SPL[1], t - SH.dive, AX + 3.5, 0, 1.5, 1.7); splash(SPL[2], t - SH.hit, AX - 2.6, 1.2, .6, 1.1);
    hitGlow.visible = t >= SH.hit && t < SH.hit + .3; hitGlow.position.set(AX - 3.3, 2.6, .9); hitGlow.scale.setScalar(4 + inv(SH.hit, SH.hit + .3, t) * 9);
    // équipage : peur, puis course vers le bord, coup de pagaie, joie
    const won = t > SH.dive + .25, hw = t < SH.lunge + .5 && t > SH.lunge - .8 ? heroWow : hero; hw.visible = true;
    const run = prog(t, SH.lunge + .15, SH.hit - .2, ease.io); hw.position.set(lerp(1.2, 3.9, run), DECK, lerp(1.6, .9, run)); hw.rotation.y = Math.PI / 2;
    if (won) { poseCheer(hw, t); hw.position.y = DECK + Math.abs(Math.sin(t * 8)) * .7; hw.rotation.y = .9; }
    else if (t > SH.lunge + .15) { hw.tools.paddle.visible = true; if (run < 1) poseWalk(hw, t * 18, .8); const sw = inv(SH.hit - .2, SH.hit, t); hw.parts.armR.rotation.set(lerp(-2.9, -.9, ease.in(sw)), 0, 0); hw.parts.armL.rotation.set(-.6, 0, 0); }
    else { hw.parts.armL.rotation.set(0, 0, -1.1); hw.parts.armR.rotation.set(0, 0, 1.1); hw.parts.head.rotation.y = .2; }
    [[p2, 1.6, -2.6], [p3, -1.6, 3.2], [p4, -2.8, -.6]].forEach(([c, x, z], i) => { c.visible = true; c.position.set(x, DECK, z); c.rotation.y = Math.PI / 2 - (z * .12);
      if (won) { poseCheer(c, t + i * .4); c.position.y = DECK + Math.abs(Math.sin(t * 8 + i)) * .6; c.rotation.y = .7; } else { c.parts.armL.rotation.set(0, 0, -1.0 - Math.sin(t * 18 + i) * .2); c.parts.armR.rotation.set(0, 0, 1.0 + Math.sin(t * 18 + i) * .2); c.position.y = DECK + Math.abs(Math.sin(t * 9 + i * 2)) * .15; } });
    [sx, sy] = shake(t, SH.lunge, 26, .6); const s2 = shake(t, SH.hit, 30, .4); sx += s2[0]; sy += s2[1];
    const kc = prog(t, T.shark + .9, SH.lunge + .2, ease.io), kz = prog(t, SH.dive, T.isle, ease.io);
    camLook(camera, [lerp(13, 15.5, kc) + kz * 2, lerp(5, 6.4, kc) + kz * 2, lerp(19, 15, kc) + kz * 3], [lerp(9, 5.6, kc), lerp(.8, 1.9, kc), lerp(-1, .8, kc)], 46);
  } else if (t < T.end) {
    // ===== PLAN 6 : exploration. Le radeau arrive en vue des 2 îles =====
    const lt = t - T.isle; bg([[0, '#2f9fe6'], [.36, '#d8f6ff'], [1, '#d8f6ff']]); sunDisc(830, 300, 62, '#fff6c9', 'rgba(255,240,170,.5)');
    updateSea(t, mood, 0, -lt * 2.5); setSky(t, -20); setLight(2.6, 1.25); setRaft(t, 16, .85, { tilt: .6 }); setDebris(t, false, 1);
    isles.visible = true; const ap = lt * 2.2; isleA.position.set(-7.5, 0, -30 + ap); isleA.rotation.y = .3; isleB.position.set(10.5, 0, -56 + ap); isleB.rotation.y = -.25; isleB.scale.setScalar(1.15);
    [...isleA.palms, ...isleB.palms].forEach((p, i) => p.top.rotation.set(Math.sin(t * 1.7 + i) * .08, 0, Math.cos(t * 1.4 + i) * .08));
    [[hero, -1.2, -3.6, Math.PI + .2], [p2, 2.4, -3.2, Math.PI - .3], [p3, -3.6, -1.2, Math.PI + .5], [p4, 1.6, 2.6, .1]].forEach(([c, x, z, r], i) => { c.visible = true; c.position.set(x, DECK, z); c.rotation.y = r;
      if (i === 0) { c.parts.armR.rotation.set(-1.75, 0, -.25); c.parts.armL.rotation.set(0, 0, -.2); c.position.y = DECK + Math.abs(Math.sin(t * 6)) * .2; }      // montre l'île
      else if (i === 3) { poseCheer(c, t); c.position.y = DECK + Math.abs(Math.sin(t * 7)) * .9; } else if (i === 1) { c.parts.armL.rotation.set(-2.9, 0, -.5); c.parts.armR.rotation.set(0, 0, .2); c.parts.head.rotation.x = -.15; } else poseCheer(c, t + .5); });
    camLook(camera, [5.5 - lt * .5, 9.5 + lt * .25, 21 - lt * .4], [0, 3.2, -12], 46);
  } else {
    // ===== ÉCRAN FINAL : coucher de soleil, équipage qui fête sur le radeau =====
    const lt = t - T.end; mood = MOOD.sunset; bg([[0, '#2b4fb3'], [.22, '#8a63c9'], [.42, '#ff9a6b'], [.56, '#ffd28a'], [1, '#ffd28a']]); sunDisc(540, 1010, 150, '#fff3c4', 'rgba(255,200,120,.55)');
    updateSea(t, mood); setSky(t); setLight(2.3, 1.15, '#ffd2a0'); setRaft(t, 16, .8, { tilt: .6 }); setDebris(t, true, .8);
    isles.visible = true; isleA.position.set(-17, 0, -46); isleA.rotation.y = .3; isleB.position.set(22, 0, -62); isleB.rotation.y = -.25; isleB.scale.setScalar(1.1);
    [[hero, -1.5, 3.4], [p2, 1.7, 3.6], [p3, -4.2, 2.2], [p4, 4.3, 2.4]].forEach(([c, x, z], i) => { c.visible = true; c.position.set(x, DECK + Math.abs(Math.sin(t * 6.5 + i * 1.3)) * .8, z); c.rotation.y = .2 - x * .06; poseCheer(c, t + i * .3); });
    const a = .32 + lt * .05; camLook(camera, [Math.sin(a) * 27, 4.6 + lt * .25, Math.cos(a) * 27], [0, 9.2, 0], 44);
  }

  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(t >= T.shark && t < T.isle ? .5 : .28, t >= T.shark && t < T.isle ? '5,25,45' : '0,30,60');

  // ---------- textes, affichages type jeu, transitions ----------
  if (t < T.croc) {
    caption(t, .12, 2.2, 'PERDU EN\nPLEIN OCÉAN ?', { ...CAP, size: 132, y: 450, anim: 'slam', grad: ['#ffffff', '#ffe27a'] });
    caption(t, 2.45, T.croc - .12, 'ATTRAPE TON CROCHET !', { ...CAP, size: 86, y: 1360, anim: 'pop', bg: C.coral, stroke: undefined, shadow: undefined, color: '#ffffff' });
  }
  flash(t, T.croc, .3);
  if (t >= T.croc && t < T.build) {
    const n = CROC.filter(c => t >= c + CYC - .08).length, last = Math.max(...CROC.map(c => c + CYC - .08).filter(c => t >= c), -9), pk = 1 + (1 - inv(last, last + .25, t)) * .18;
    hud('SAC : ' + n + (n > 1 ? ' OBJETS' : ' OBJET'), SAFE.cx, 290, { scale: pk, size: 52 });
    CROC.forEach(c => { const u = t - (c + CYC - .08); if (u >= 0 && u < .7) text('+1', 540 - 60, 1080 - u * 220, { font: 'Lilita', size: 110, color: C.sun, stroke: C.navy, strokeW: 14, alpha: 1 - inv(.4, .7, u), scale: ease.back(inv(0, .2, u)) }); });
    caption(t, T.croc + .25, T.build - .2, 'LANCE TON CROCHET', { ...CAP, y: 1400, anim: 'pop' });
  }
  wipe(t, T.build, { color: C.sun, color2: C.coral, dur: .45 });
  if (t >= T.build + .22 && t < T.craft) {
    const n = 4 + Array.from({ length: 12 }, (_, i) => BUILD(i)).filter(b => t >= b).length;
    hud('RADEAU : ' + n + ' CASES', SAFE.cx, 290, { size: 52, scale: 1 + (n < 16 ? Math.max(0, Math.sin((t - T.build - .45) / .26 * Math.PI * 2)) * .04 : 0) });
    caption(t, T.build + .3, T.craft - .22, 'AGRANDIS TON RADEAU', { ...CAP, y: 1400, anim: 'pop' });
  }
  wipe(t, T.craft, { color: '#19a9cc', color2: '#ffffff', dur: .45, dir: 'up' });
  if (t >= T.craft + .22 && t < T.crew) {
    // panneau d'artisanat : 10 cases numérotées qui se valident une par une
    const kp = prog(t, T.craft + .22, T.craft + .55, ease.back) * (1 - inv(T.crew - .25, T.crew - .08, t));
    ctx.save(); ctx.translate(SAFE.cx, 440); ctx.scale(kp, kp); ctx.translate(-SAFE.cx, -440);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; roundRect(118, 258, 844, 396, 40); ctx.fill(); ctx.fillStyle = '#8a5a2a'; roundRect(118, 246, 844, 396, 40); ctx.fill(); ctx.fillStyle = '#f3dfb4'; roundRect(134, 262, 812, 364, 28); ctx.fill();
    const done = Array.from({ length: 10 }, (_, i) => SLOT(i)).filter(s => t >= s).length;
    text('ARTISANAT', 330, 312, { font: 'Lilita', size: 58, color: '#7a4a22' }); text(done + ' / 10', 800, 312, { font: 'Lilita', size: 58, color: done === 10 ? '#1f9d55' : '#7a4a22', scale: 1 + (done === 10 ? Math.sin(t * 10) * .05 : 0) });
    for (let i = 0; i < 10; i++) { const x = 171 + (i % 5) * 152, y = 356 + Math.floor(i / 5) * 132, k = inv(SLOT(i), SLOT(i) + .2, t), s = 1 + Math.sin(k * Math.PI) * .16;
      ctx.save(); ctx.translate(x + 61, y + 56); ctx.scale(s, s); ctx.fillStyle = k > 0 ? '#35c979' : '#d9bd88'; roundRect(-61, -56, 122, 112, 20); ctx.fill(); ctx.strokeStyle = k > 0 ? '#1f9d55' : '#b3915a'; ctx.lineWidth = 6; ctx.stroke();
      if (k > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-28, 2); ctx.lineTo(-8, 24); ctx.lineTo(30, -22); ctx.stroke(); } else text(String(i + 1), 0, 4, { font: 'Lilita', size: 60, color: '#8a6a3a' });
      ctx.restore(); }
    ctx.restore();
    caption(t, T.craft + .35, T.crew - .22, '10 RECETTES À FABRIQUER', { ...CAP, size: 84, y: 1400, anim: 'pop' });
  }
  flash(t, T.crew, .3);
  if (t >= T.crew && t < T.shark) {
    const n = Array.from({ length: 4 }, (_, i) => JOIN(i) + .3).filter(j => t >= j).length;
    const cols = [C.coral, C.sun, '#35c979', '#9a6bff']; const wd = 520; ctx.fillStyle = 'rgba(0,0,0,.28)'; roundRect(SAFE.cx - wd / 2, 250, wd, 96, 48); ctx.fill(); ctx.fillStyle = C.navy; roundRect(SAFE.cx - wd / 2, 242, wd, 96, 48); ctx.fill(); ctx.strokeStyle = C.sun; ctx.lineWidth = 5; ctx.stroke();
    text('ÉQUIPAGE', SAFE.cx - 110, 292, { font: 'Inter', weight: 800, size: 42, color: '#ffffff' });
    for (let i = 0; i < 4; i++) { const k = ease.back(inv(JOIN(i) + .3, JOIN(i) + .5, t)); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(SAFE.cx + 40 + i * 58, 290, 22, 0, 7); ctx.fill(); if (i < n) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(SAFE.cx + 40 + i * 58, 290, 22 * k, 0, 7); ctx.fill(); } }
    caption(t, T.crew + .3, T.crew + 2.25, 'JOUE AVEC TES AMIS', { ...CAP, y: 1400, anim: 'pop' });
    caption(t, T.crew + 2.4, T.shark - .25, 'JUSQU\'À 4 JOUEURS', { ...CAP, size: 104, y: 1400, anim: 'slam', grad: ['#ffffff', '#ffe27a'] });
    if (t > T.crew + 2.35) confetti(t, T.crew + 2.35, { n: 70, cy: 700, power: 1200, life: 2.2, colors: [C.coral, C.sun, '#35c979', '#9a6bff', '#ffffff'] });
  }
  wipe(t, T.shark, { color: '#0a3552', color2: '#c0392b', dur: .5, dir: 'right' });
  if (t >= T.shark + .25 && t < T.isle) {
    if (t < SH.lunge) { const k = win(t, T.shark + .25, SH.lunge, .2); fade(.12 * k * (.5 + .5 * Math.sin(t * 12)), '#c0392b'); }
    caption(t, T.shark + .3, SH.hit - .1, 'LE REQUIN ATTAQUE !', { ...CAP, size: 100, y: 430, anim: 'slam', color: '#ffffff', stroke: '#b3262c', grad: ['#ffffff', '#ffd0c4'] });
    // bouton « FRAPPER » (présent dans le jeu) : pressé au moment du coup
    if (t > SH.lunge + .1 && t < SH.hit + .35) { const k = ease.back(inv(SH.lunge + .1, SH.lunge + .35, t)) * (1 - inv(SH.hit + .2, SH.hit + .35, t)), press = 1 - win(t, SH.hit - .12, SH.hit + .12, .08) * .16;
      pill('FRAPPER', SAFE.cx, 1370, { size: 76, font: 'Lilita', bg: C.coral, color: '#ffffff', border: '#ffffff', borderW: 8, pad: 70, scale: k * press * (1 + Math.sin(t * 14) * .04) }); }
    if (t >= SH.hit && t < SH.hit + .5) { const [px, py] = proj(9 - 3.3, 2.6, .9), u = inv(SH.hit, SH.hit + .5, t); ctx.save(); ctx.translate(px + sx, py + sy); ctx.rotate(u * .6); ctx.globalAlpha = 1 - u; ctx.fillStyle = '#fff6b0'; ctx.beginPath(); for (let i = 0; i < 20; i++) { const r = (i % 2 ? 60 : 170) * (.5 + u * 1.1), a = i * Math.PI / 10; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); }
    flash(t, SH.hit, .25, '255,255,255', .7);
    caption(t, SH.hit + .4, T.isle - .2, 'REPOUSSÉ !', { ...CAP, size: 150, y: 1380, anim: 'slam', grad: ['#fff27a', '#ff9d2e'] });
    if (t > SH.dive + .3) confetti(t, SH.dive + .3, { n: 60, cy: 760, power: 1100, life: 1.6, colors: [C.coral, C.sun, '#35c979', '#ffffff'] });
  }
  flash(t, T.isle, .35);
  if (t >= T.isle && t < T.end) {
    caption(t, T.isle + .3, T.end - .22, '2 ÎLES À EXPLORER', { ...CAP, size: 100, y: 1400, anim: 'pop' });
    const k = ease.back(inv(T.isle + 2.55, T.isle + 2.85, t)) * (1 - inv(T.end - .3, T.end - .15, t)); if (k > 0) hud('JOURNAL : NOUVELLE DÉCOUVERTE', SAFE.cx, 290, { size: 44, scale: k, bg: '#8a5a2a' });
    sparkles(t, { n: 10, x: 150, y: 520, w: 780, h: 330, color: '#fff6c9', size: 16, seed: 3 });
  }
  wipe(t, T.end, { color: '#ff9a6b', color2: C.sun, dur: .5, dir: 'up' });
  if (t >= T.end) {
    rays(t, { cx: 540, cy: 1010, color: 'rgba(255,240,190,.10)', n: 14, speed: .12 }); fade(.16 * inv(T.end, T.end + .5, t), '#1a2a6b'); sparkles(t, { n: 18, y: 240, h: 520, color: '#fff6c9', size: 13, seed: 9 });
    endCard(t, T.end + .25, { title: 'RAFT CREW', tagline: 'Construis. Pêche. Survis en équipe.', status: 'bientot', font: 'Lilita', titleSize: 190, titleGrad: ['#fff6c4', '#ffb13d'], titleStroke: C.navy, accent: C.coral, y: 640 });
  }
}

registerAd({ duration: DURATION, thumbTime: T.shark + 2.0, render,
  music: { style: 'tropical', bpm: BPM, sections: [[0, 'build'], [T.croc, 'drop'], [T.craft, 'break'], [T.crew, 'drop2'], [T.shark, 'build'], [T.isle, 'drop2']], end: T.end } });
