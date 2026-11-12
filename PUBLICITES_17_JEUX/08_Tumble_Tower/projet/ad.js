// Publicité « Tumble Tower » (statut : bientôt). Tour d'obstacles du jour : on grimpe, on tombe, on repart du point de sauvegarde.
// Tout est créé par le code (formes du moteur) : aucune ressource externe.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, DEG, hexToRgb, rgba, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseIdle, poseCheer, poseJump, tree, bushyTree, cloud, ground, showOnly, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect,
  text, caption, pill, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['RubikMono', 'Inter']);
const BPM = 172, BAR = 240 / BPM, BEAT = BAR / 4;          // mesure = 1,395 s ; temps = 0,349 s
const T = { hook: 0, day: 2 * BAR, move: 5 * BAR, bars: 8 * BAR, ice: 9.5 * BAR, vanish: 11 * BAR, fall: 14 * BAR, climb: 17 * BAR, rank: 20 * BAR, end: 22 * BAR };
const DURATION = 26 * BAR;                                  // 36,3 s
const TITLE = 'RubikMono';

// ---------- palette ----------
const C = { pink: '#ff3d81', yellow: '#ffc21f', cyan: '#2ee6ff', lime: '#6dfc4b', violet: '#a66bff', orange: '#ff7a2e', navy: '#141a3c', navy2: '#222a5c', ice: '#bff3ff', green: '#2bff8a', white: '#ffffff' };
const BAND = [C.pink, C.yellow, C.cyan, C.lime, C.violet, C.orange];
const colOf = n => BAND[Math.floor(Math.max(0, n - 1) / 3) % BAND.length];
const neon = (c, o = {}) => mat(c, { rough: .45, emissive: c, emissiveI: .22, ...o });

// ---------- géométrie de la tour ----------
const FH = 5, PZ = 6.2, NF = 36;
const mainX = n => n % 2 ? -2.7 : 2.7;
const P = n => [mainX(n), n * FH, PZ];                      // plateforme principale de l'étage n (dessus)
const S = n => [0, n * FH + 2.5, PZ];                       // marche entre n et n+1
const fixed = p => () => p;

gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(42);
const L = addLights(scene, { shadowArea: 17, dir: [7, 13, 9], ambI: 1.25, sunI: 2.5 });
const towerG = new THREE.Group(), miniG = new THREE.Group(); scene.add(towerG, miniG);

// cœur de la tour : panneaux sombres, fenêtres éclairées, un liseré néon par étage
const coreTex = canvasTex(256, (g, n) => {
  g.fillStyle = '#161d45'; g.fillRect(0, 0, n, n);
  g.strokeStyle = '#0c1130'; g.lineWidth = 6; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * n / 4, 0); g.lineTo(i * n / 4, n); g.stroke(); }
  g.beginPath(); g.moveTo(0, n * .5); g.lineTo(n, n * .5); g.stroke();
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#ffd76a' : '#27336f'; g.fillRect(i * n / 4 + 20, n * .16, 24, 44); g.fillStyle = i % 2 ? '#27336f' : '#7fe9ff'; g.fillRect(i * n / 4 + 20, n * .62, 24, 44); }
  g.fillStyle = '#2ee6ff'; g.fillRect(0, n - 10, n, 10);
});
coreTex.wrapS = coreTex.wrapT = THREE.RepeatWrapping; coreTex.repeat.set(2, NF + 3);
const core = new THREE.Mesh(new THREE.BoxGeometry(8, (NF + 3) * FH, 8), new THREE.MeshStandardMaterial({ map: coreTex, roughness: .8 }));
core.position.y = (NF + 3) * FH / 2 - FH; core.receiveShadow = true; core.castShadow = true; towerG.add(core);
for (const [x, z] of [[-4, 4], [4, 4], [-4, -4], [4, -4]]) towerG.add(box(.5, (NF + 3) * FH, .5, mat(C.cyan, { emissive: C.cyan, emissiveI: .7 }), { pos: [x, core.position.y, z], cast: false }));

const SKIP_MAIN = new Set([13, 15, 20]), SKIP_STEP = new Set([7, 8, 13, 15, 18, 19, 20]);
for (let n = 0; n <= NF; n++) {
  const c = colOf(n);
  towerG.add(box(9.4, .35, 9.4, neon(c), { pos: [0, n * FH - 1.2, 0] }));                      // corniche colorée
  if (n >= 1 && !SKIP_MAIN.has(n)) towerG.add(rbox(3.7, .7, 3.4, .22, n % 3 === 0 ? neon('#eafff2', { emissiveI: .1 }) : neon(c), { pos: [mainX(n), n * FH - .35, PZ], rot: [Math.PI / 2, 0, 0] }));
  if (n >= 1 && n < NF && !SKIP_STEP.has(n)) towerG.add(rbox(2.2, .6, 2.6, .2, neon(colOf(n + 1)), { pos: [0, n * FH + 2.2, PZ], rot: [Math.PI / 2, 0, 0] }));
  if (n >= 1) {                                                                                 // numéro d'étage peint sur le mur
    towerG.add(sign(2.6, 1.7, (g, w, h) => { g.font = `400 ${h * .78}px "RubikMono"`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(String(n), w / 2, h * .54); }, { res: 192, emissive: true, pos: [-mainX(n) * .92, n * FH + 1.0, 4.03] }));
    for (const s of [-1, 1]) {                                                                  // plateformes décoratives sur les côtés
      const d = rbox(3, .6, 2.6, .2, neon(BAND[(n + (s > 0 ? 2 : 4)) % 6]), { rot: [Math.PI / 2, 0, 0] }); d.position.set(s * 5.5, n * FH + hash(n * 3 + s) * 3 - .5, (hash(n * 7 + s) - .5) * 5); towerG.add(d);
    }
  }
}
// points de sauvegarde tous les 3 étages : anneau lumineux + drapeau
const flagTex = (g, w, h) => { g.fillStyle = '#18c964'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = h * .16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w * .26, h * .52); g.lineTo(w * .44, h * .72); g.lineTo(w * .76, h * .28); g.stroke(); };
for (let n = 3; n <= NF; n += 3) {
  const g = new THREE.Group(); g.position.set(mainX(n), n * FH, PZ);
  const ring = torus(1.25, .14, mat(C.green, { emissive: C.green, emissiveI: .9 }), { rot: [Math.PI / 2, 0, 0], pos: [0, .1, 0], cast: false }); g.add(ring);
  g.add(cyl(.09, .09, 3.6, '#e8ecff', { pos: [1.45 * Math.sign(mainX(n)), 1.8, -1.3], seg: 8 }));
  const f = sign(1.5, .95, flagTex, { res: 128, pos: [1.45 * Math.sign(mainX(n)) - .78 * Math.sign(mainX(n)), 3.05, -1.3] }); f.material.side = THREE.DoubleSide; g.add(f);
  towerG.add(g);
}
// point de sauvegarde vedette (étage 18) : faisceau + halo animés
const beamMat = new THREE.MeshBasicMaterial({ color: C.green, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 9, 24, 1, true), beamMat); beam.position.set(2.7, 18 * FH + 4.5, PZ); towerG.add(beam);
const cpGlow = glow(C.green, 7, 0); cpGlow.position.set(2.7, 18 * FH + 1.2, PZ + .5); towerG.add(cpGlow);

// obstacles vedettes
const arrowTex = canvasTex(256, (g, n) => { g.fillStyle = C.yellow; g.fillRect(0, 0, n, n); g.fillStyle = '#1b1f4a'; for (let i = 0; i < 8; i++) { g.save(); g.translate(n / 2, n / 2); g.rotate(i * Math.PI / 4); g.fillRect(-10, n * .18, 20, n * .3); g.restore(); } g.beginPath(); g.arc(n / 2, n / 2, n * .12, 0, 7); g.fill(); });
const movPlat = new THREE.Group(); { movPlat.add(rbox(2.8, .6, 2.8, .2, neon(C.cyan), { pos: [0, -.3, 0], rot: [Math.PI / 2, 0, 0] })); for (const s of [-1, 1]) movPlat.add(cone(.35, .7, '#ffffff', { pos: [s * 1.75, -.3, 0], rot: [0, 0, -s * Math.PI / 2], seg: 4 })); towerG.add(movPlat); }
const rail = box(7.6, .16, .3, '#0c1130', { pos: [0, 7 * FH + 1.85, PZ] }); towerG.add(rail);
const disc = new THREE.Group(); { const top = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, .5, 32), [neon(C.orange), new THREE.MeshStandardMaterial({ map: arrowTex, roughness: .6 }), neon(C.orange)]); top.position.y = -.25; top.castShadow = top.receiveShadow = true; disc.add(top); disc.add(cyl(.5, .7, 1.6, '#0c1130', { pos: [0, -1.3, 0] })); disc.position.set(0, 8 * FH + 2.5, PZ + .3); towerG.add(disc); }
// barre tournante (étage 13)
const BARC = [-.6, 13 * FH, 7.0];
towerG.add(rbox(7.2, .7, 5.2, .22, neon(C.violet), { pos: [BARC[0], 13 * FH - .35, 7.1], rot: [Math.PI / 2, 0, 0] }));
towerG.add(cyl(.42, .55, 1.7, '#e8ecff', { pos: [BARC[0], 13 * FH + .85, BARC[2]] }));
const spinner = new THREE.Group(); spinner.position.set(BARC[0], 13 * FH + 1.15, BARC[2]); towerG.add(spinner);
{ const b = cyl(.3, .3, 5.8, C.pink, { rot: [0, 0, Math.PI / 2], emissive: C.pink, emissiveI: .35, seg: 12 }); spinner.add(b); for (let i = -3; i <= 3; i++) if (i) spinner.add(cyl(.33, .33, .32, '#ffffff', { pos: [i * .8, 0, 0], rot: [0, 0, Math.PI / 2], seg: 12 })); for (const s of [-1, 1]) spinner.add(ball(.48, C.yellow, { pos: [s * 2.9, 0, 0], emissive: C.yellow, emissiveI: .3 })); spinner.add(ball(.6, '#e8ecff', { pos: [0, .5, 0] })); }
// glace (étage 15)
const iceMat = new THREE.MeshStandardMaterial({ color: C.ice, roughness: .08, transparent: true, opacity: .86, emissive: '#3aa8ff', emissiveIntensity: .25 });
{ const slab = rbox(9, .7, 3.6, .25, iceMat, { pos: [0, 15 * FH - .35, PZ], rot: [Math.PI / 2, 0, 0] }); towerG.add(slab);
  towerG.add(box(8.2, .03, .5, mat('#ffffff', { opacity: .7 }), { pos: [0, 15 * FH + .02, PZ + .7], cast: false }));
  for (let i = 0; i < 9; i++) towerG.add(cone(.22 + hash(i) * .16, .8 + hash(i * 3) * 1.1, iceMat, { pos: [-4 + i * 1, 15 * FH - 1.1 - hash(i * 3) * .5, PZ + 1.2 - hash(i * 5) * 2.2], rot: [Math.PI, 0, 0], seg: 6, cast: false })); }
// rebond (entre 18 et 19)
const bouncer = new THREE.Group(), cap = new THREE.Group(); bouncer.position.set(0, 18 * FH + 2.5, PZ); towerG.add(bouncer);
{ bouncer.add(cyl(1.0, 1.2, .4, '#0c1130', { pos: [0, -1.5, 0] })); for (let i = 0; i < 3; i++) bouncer.add(torus(.55, .1, '#e8ecff', { pos: [0, -1.2 + i * .28, 0], rot: [Math.PI / 2, 0, 0], seg: 16 }));
  const c = cyl(1.35, 1.35, .45, C.pink, { pos: [0, -.23, 0], emissive: C.pink, emissiveI: .3 }); cap.add(c); cap.add(cyl(.8, .8, .47, '#ffffff', { pos: [0, -.22, 0] })); cap.add(cyl(.38, .38, .49, C.pink, { pos: [0, -.21, 0] })); bouncer.add(cap); }
// plateformes qui disparaissent (19,5 / 20 / 20,5)
const VAN = [S(19), P(20), S(20)].map((p, i) => { const m = new THREE.MeshStandardMaterial({ color: C.violet, roughness: .4, emissive: C.violet, emissiveIntensity: .3, transparent: true }); const o = rbox(i === 1 ? 3.4 : 2.4, .6, 2.8, .2, m, { pos: [p[0], p[1] - .3, p[2]], rot: [Math.PI / 2, 0, 0] }); towerG.add(o); const e = new THREE.Mesh(new THREE.BoxGeometry(i === 1 ? 3.5 : 2.5, .66, 2.9), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: .0 })); e.position.copy(o.position); towerG.add(e); return { o, m, e }; });

// décor : île de départ, arbres, nuages
towerG.add(ground(70, '#5fc76a', { y: -1.4, round: true }));
for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .3, r = 12 + hash(i) * 14; const tr = (i % 2 ? tree : bushyTree)(4 + hash(i * 3) * 3, i % 3 ? '#3fae4a' : '#58c96a'); tr.position.set(Math.cos(a) * r, -1.4, Math.sin(a) * r * .8 - 2); towerG.add(tr); }
for (let i = 0; i < 16; i++) { const c = cloud(1.8 + hash(i) * 2.2, i > 9 ? '#cbb8ff' : '#ffffff'); const s = i % 2 ? 1 : -1; c.position.set(s * (11 + hash(i * 5) * 12), 12 + i * 8.5 + hash(i * 2) * 4, -6 - hash(i * 9) * 16); towerG.add(c); }

// héros (deux visages) + traînée lumineuse
const HERO = { shirt: '#ff7a2e', pants: '#1f2a5a', hat: 'cap', hatColor: '#2ee6ff', hair: '#3b2a1e' };
const hero = makeCharacter({ ...HERO, face: 'happy' }), heroS = makeCharacter({ ...HERO, face: 'scared' }); towerG.add(hero, heroS);
const TRAIL = Array.from({ length: 12 }, (_, i) => { const g = glow(BAND[i % 6], 2.6 - i * .15, .8 - i * .055); towerG.add(g); return g; });

// ---------- maquette « tour du jour » (plan 2) ----------
miniG.add(ground(70, '#5fc76a', { round: true }));
miniG.add(cyl(5.2, 5.6, .7, '#e8ecff', { pos: [0, .35, 0], seg: 40 })); miniG.add(cyl(4.4, 4.4, .2, C.navy2, { pos: [0, .78, 0], seg: 40 }));
const NS = 12, SLABS = [];
for (let i = 0; i < NS; i++) {
  const g = new THREE.Group(); g.add(box(3.4, 1.1, 3.4, '#1b2352')); g.add(box(3.75, .22, 3.75, neon(BAND[Math.floor(i / 2) % 6]), { pos: [0, -.5, 0] }));
  g.add(sign(1.1, .7, (c, w, h) => { c.fillStyle = '#ffd76a'; c.fillRect(w * .1, h * .15, w * .3, h * .7); c.fillStyle = '#7fe9ff'; c.fillRect(w * .6, h * .15, w * .3, h * .7); }, { res: 64, emissive: true, pos: [0, .08, 1.71] }));
  const nubs = []; for (let j = 0; j < 3; j++) { const nb = rbox(1.5, .32, 1.1, .1, neon(BAND[(i + j * 2 + 1) % 6]), { rot: [Math.PI / 2, 0, 0] }); g.add(nb); nubs.push(nb); }
  miniG.add(g); SLABS.push({ g, nubs });
}
const miniTop = new THREE.Group(); { miniTop.add(cyl(.08, .08, 2.2, '#e8ecff', { pos: [0, 1.1, 0], seg: 8 })); const f = sign(1.5, .95, flagTex, { res: 128, pos: [.78, 1.7, 0] }); f.material.side = THREE.DoubleSide; miniTop.add(f); miniTop.add(glow(C.yellow, 4, .7)); miniG.add(miniTop); }
const FANS = [['#ff3d81', 'crown', '#f2c6a0'], ['#2ee6ff', 'cone', '#c98f62'], ['#6dfc4b', 'helmet', '#f2c6a0'], ['#ffc21f', 'top', '#8a5a3c']].map(([shirt, hat, skin], i) => { const c = makeCharacter({ shirt, hat, skin, hatColor: BAND[(i + 3) % 6], face: i % 2 ? 'wow' : 'happy', scale: .62 }); const a = [-2.3, -1.9, -1.25, -.85][i]; c.position.set(Math.cos(a) * 7.6, 0, -Math.sin(a) * 6.2 + 1); c.rotation.y = Math.atan2(-c.position.x, -c.position.z + 0) ; miniG.add(c); return c; });
for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI + Math.PI * 1.02, r = 15 + hash(i) * 9; const tr = (i % 2 ? tree : bushyTree)(4 + hash(i * 3) * 3); tr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); miniG.add(tr); }
for (let i = 0; i < 5; i++) { const c = cloud(2 + hash(i) * 1.5); c.position.set((i - 2) * 9 + hash(i) * 3, 14 + hash(i * 3) * 9, -22); miniG.add(c); }

// ---------- déplacements du héros : suites de sauts (fonctions pures du temps) ----------
function runSeq(seq, t) {
  if (t < seq[0].a) return { p: seq[0].from(t), air: 0, dir: seq[0].dir ?? 1, since: 9 };
  for (let i = 0; i < seq.length; i++) {
    const s = seq[i], nx = seq[i + 1];
    if (t <= s.b) { const k = inv(s.a, s.b, t), A = s.from(t), B = s.to(t); return { p: [lerp(A[0], B[0], k), lerp(A[1], B[1], k) + (s.h ?? 1.5) * 4 * k * (1 - k), lerp(A[2], B[2], k)], air: Math.sin(k * Math.PI), dir: s.dir ?? (Math.sign(B[0] - A[0]) || 1), since: 0 }; }
    if (!nx || t < nx.a) return { p: s.to(t), air: 0, dir: nx ? (nx.dir ?? (Math.sign(nx.to(t)[0] - nx.from(t)[0]) || 1)) : (s.dir ?? 0), since: t - s.b };
  }
}
/** Montée en zigzag standard : étage n0, un saut par temps. */
function climbSeq(t0, n0, hops, period = BEAT, dur = .3) {
  const seq = []; for (let i = 0; i < hops; i++) { const n = n0 + Math.floor(i / 2), A = i % 2 ? S(n) : P(n), B = i % 2 ? P(n + 1) : S(n); seq.push({ a: t0 + i * period, b: t0 + i * period + dur, from: fixed(A), to: fixed(B), h: 1.3 }); } return seq;
}
const movX = t => Math.sin((t - T.move) * Math.PI / (2 * BEAT) - 1.1) * 2.6, movPos = t => [movX(t), 7 * FH + 2.5, PZ];
const discA = t => (t - T.move) * 2.6, discPos = t => { const a = discA(t) + 2.2; return [Math.cos(a) * 1.35, 8 * FH + 2.5, PZ + .3 - Math.sin(a) * 1.35]; };
const barA = t => (t - T.bars) * Math.PI / (2 * BEAT);            // la barre passe devant le héros tous les 2 temps
const SEQ = {
  hook: climbSeq(-.12, 1, 9),
  move: [{ a: T.move + .42, b: T.move + .8, from: fixed(P(7)), to: movPos }, { a: T.move + 1.55, b: T.move + 1.95, from: movPos, to: fixed(P(8)) },
    { a: T.move + 2.3, b: T.move + 2.7, from: fixed(P(8)), to: discPos }, { a: T.move + 3.55, b: T.move + 3.95, from: discPos, to: fixed(P(9)), h: 1.8 }],
  bars: [0, 1, 2, 3].map(i => ({ a: T.bars + (i + 1) * 2 * BEAT - .2, b: T.bars + (i + 1) * 2 * BEAT + .2, from: fixed([-2.7, 13 * FH, 7.3]), to: fixed([-2.7, 13 * FH, 7.3]), h: i === 1 ? 2.6 : 2.0, dir: 1 })),
  vanish: [{ a: T.vanish - .25, b: T.vanish + .15, from: fixed(S(17)), to: fixed(P(18)) }, { a: T.vanish + .7, b: T.vanish + 1.05, from: fixed(P(18)), to: fixed(S(18)), h: 1.2 },
    { a: T.vanish + 1.05, b: T.vanish + 1.85, from: fixed(S(18)), to: fixed(P(19)), h: 4.6 }, { a: T.vanish + 2.1, b: T.vanish + 2.42, from: fixed(P(19)), to: fixed(S(19)) },
    { a: T.vanish + 2.62, b: T.vanish + 2.94, from: fixed(S(19)), to: fixed(P(20)) }, { a: T.vanish + 3.14, b: T.vanish + 3.46, from: fixed(P(20)), to: fixed(S(20)) }],
  back: [{ a: T.fall + 3.3, b: T.fall + 3.65, from: fixed(P(18)), to: fixed(S(18)), h: 1.2 }, { a: T.fall + 3.65, b: T.fall + 4.5, from: fixed(S(18)), to: fixed(P(19)), h: 4.6 }],
  climb: climbSeq(T.climb - .1, 24, 13),
  rank: [{ a: T.rank - .2, b: T.rank + .12, from: fixed(S(30)), to: fixed(P(31)) }],
  end: climbSeq(T.end - .1, 26, 17),
};
const VAN_OFF = [T.vanish + 2.95, T.vanish + 3.4, T.vanish + 3.62];  // instants où chaque plateforme disparaît
const DROP = T.vanish + 3.62;                                          // début de la chute
const RESPAWN = T.fall + 1.3;

function setHero(st, t, { scared = false, cheer = false, flail = false, lean = 0 } = {}) {
  const h = scared ? heroS : hero; h.visible = true; (scared ? hero : heroS).visible = false;
  h.position.set(st.p[0], st.p[1], st.p[2]); h.rotation.set(0, st.dir * .85, lean);
  const sq = st.air > 0 ? 1 + st.air * .06 : 1 - .16 * (1 - inv(0, .14, st.since)); h.scale.set(1 + (1 - sq) * .6, sq, 1 + (1 - sq) * .6);
  poseIdle(h, t); if (cheer) poseCheer(h, t); else if (flail) { const p = h.parts, w = Math.sin(t * 26); p.armL.rotation.set(0, 0, -2.2 + w * .7); p.armR.rotation.set(0, 0, 2.2 + w * .7); p.legL.rotation.set(w * .7, 0, 0); p.legR.rotation.set(-w * .7, 0, 0); } else if (st.air > 0) poseJump(h, st.air);
  return h;
}

// ---------- repères sonores ----------
cue(0, 'whoosh'); for (let i = 1; i < 8; i += 2) cue(i * BEAT + .15, 'tap', .5);
cue(T.day, 'impact'); cue(T.day + .05, 'roll', .6, .5); cue(T.day + BAR, 'thud'); cue(T.day + BAR + .1, 'pop', .7); cue(T.day + 2 * BAR, 'thud'); cue(T.day + 2 * BAR + .1, 'pop', .7);
cue(T.move - .15, 'whoosh'); cue(T.move + .8, 'tap', .6); cue(T.move + 1.2, 'slide', .5); cue(T.move + 1.95, 'tap', .6); cue(T.move + 2.7, 'tap', .6); cue(T.move + 2.9, 'roll', .6, .7); cue(T.move + 3.95, 'ding', .8);
cue(T.bars, 'impact', .8); for (let i = 1; i <= 2; i++) cue(T.bars + i * 2 * BEAT - .05, 'swish', .9);
cue(T.ice, 'glass', .7); cue(T.ice + .15, 'slide', .9); cue(T.ice + 1.55, 'boing', .5);
cue(T.vanish - .12, 'whoosh'); cue(T.vanish + .18, 'chime'); cue(T.vanish + 1.05, 'boing'); cue(T.vanish + 1.85, 'tap', .6); for (const v of VAN_OFF) cue(v, 'pop', .8); cue(DROP + .05, 'fail', .8);
cue(T.fall, 'sweepdown'); cue(T.fall + .1, 'whistle', .5); cue(RESPAWN, 'powerup'); cue(RESPAWN + .05, 'impact', .7); cue(T.fall + 2.75, 'chime', .7); cue(T.fall + 3.65, 'boing', .8);
cue(T.climb - .5, 'riser', .7, .5); cue(T.climb, 'boom', .8); for (let i = 1; i < 12; i += 2) cue(T.climb + i * BEAT + .2, 'tick', .5); cue(T.climb + 2 * BAR, 'whoosh', .7);
cue(T.rank, 'impact'); cue(T.rank + .5, 'slide', .6); for (let i = 0; i < 3; i++) cue(T.rank + .95 + i * .22, 'coin', .6); cue(T.rank + 1.62, 'win'); cue(T.rank + 1.7, 'crowd', .6, 1.1);
cue(T.end, 'boom'); cue(T.end + .15, 'whoosh', .7); cue(T.end + .85, 'pop'); cue(T.end + 1.3, 'ding', .7);

// ---------- affichages 2D ----------
const mix3 = (a, b, c, k) => { const A = hexToRgb(a), B = hexToRgb(b), Cc = hexToRgb(c), u = k < .5 ? k * 2 : (k - .5) * 2, X = k < .5 ? A : B, Y = k < .5 ? B : Cc; return `rgb(${X.map((v, i) => Math.round(lerp(v, Y[i], u))).join(',')})`; };
function sky(t, y) {
  const k = clamp(y / 150); bg([mix3('#2f8fff', '#5a2ba8', '#070b2a', k), mix3('#8fd4ff', '#ff6fa8', '#2a1c7a', k), mix3('#d9f4ff', '#ffc98a', '#5a3fc0', k)]);
  if (k > .45) { ctx.save(); ctx.globalAlpha = inv(.45, .8, k); sparkles(t, { n: 60, size: 9, seed: 4 }); ctx.restore(); }
}
function hudFloor(t, n, { saved } = {}) {
  pill('ÉTAGE ' + n, 250, 275, { size: 50, bg: '#10163a', color: C.yellow, border: C.cyan, borderW: 5, font: TITLE, pad: 30 });
  pill('TOUR DU JOUR', 770, 275, { size: 36, bg: C.pink, color: '#ffffff', weight: 900, pad: 26 });
  if (saved != null && saved > 0) pill('✔ SAUVEGARDÉ : ÉTAGE 18', SAFE.cx, 385, { size: 40, bg: '#0f9d58', color: '#ffffff', weight: 900, scale: ease.back(clamp(saved * 3)), alpha: 1 });
}
const floorOf = y => Math.max(1, Math.floor((y + .6) / FH));
const DAYS = ['LUNDI', 'MARDI', 'MERCREDI'];
function calendar(t) {
  const lt = t - T.day, d = clamp(Math.floor(lt / BAR), 0, 2), u = lt / BAR - d, flip = d > 0 ? ease.back(inv(0, .16, u)) : ease.back(inv(0, .25, lt));
  ctx.save(); ctx.translate(SAFE.cx, 370); ctx.scale(1, Math.max(.02, flip)); ctx.rotate(-3 * DEG);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-250, -108, 500, 236, 30); ctx.fill();
  ctx.fillStyle = '#ffffff'; roundRect(-250, -120, 500, 236, 30); ctx.fill();
  ctx.save(); roundRect(-250, -120, 500, 236, 30); ctx.clip(); ctx.fillStyle = C.pink; ctx.fillRect(-250, -120, 500, 84); ctx.restore();
  for (const s of [-1, 1]) { ctx.fillStyle = '#10163a'; roundRect(s * 150 - 12, -146, 24, 56, 12); ctx.fill(); }
  text('TOUR DU JOUR', 0, -76, { size: 44, weight: 900, color: '#ffffff', maxW: 440 });
  text(DAYS[d], 0, 40, { font: TITLE, size: 74, color: '#10163a', maxW: 440 });
  ctx.restore();
}
const BOARD = [['Joueur A', 30], ['Joueur B', 29], ['Joueur C', 27], ['Joueur D', 26]];
function leaderboard(t) {
  const lt = t - T.rank, kin = ease.back(inv(.15, .6, lt)), x0 = 120, w = 840, y0 = 300, rowH = 108;
  const me = lerp(25, 31, ease.io(inv(.8, 1.6, lt)));
  ctx.save(); ctx.translate(0, (1 - kin) * -900);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(x0, y0 + 12, w, 150 + 5 * rowH + 30, 40); ctx.fill();
  ctx.fillStyle = '#10163a'; roundRect(x0, y0, w, 150 + 5 * rowH + 30, 40); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 8; ctx.stroke();
  text('CLASSEMENT', SAFE.cx, y0 + 58, { font: TITLE, size: 58, color: C.yellow, maxW: w - 80 });
  text('DU JOUR', SAFE.cx, y0 + 118, { size: 40, weight: 900, color: '#ffffff', spacing: 6 });
  const rows = BOARD.map(([n, s], i) => ({ n, s, r: i + clamp(me - s + .5) })); rows.push({ n: 'TOI', s: Math.round(me), r: BOARD.reduce((a, [, s]) => a + clamp(s - me + .5), 0), me: true });
  rows.sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0));
  for (const r of rows) {
    const y = y0 + 165 + r.r * rowH, first = r.r < .5;
    ctx.fillStyle = r.me ? (first ? C.yellow : C.pink) : '#222a5c'; roundRect(x0 + 24, y, w - 48, rowH - 14, 24); ctx.fill();
    const col = r.me && first ? '#10163a' : '#ffffff';
    text(String(Math.round(r.r) + 1), x0 + 80, y + 48, { font: TITLE, size: 50, color: col });
    text(r.n, x0 + 140, y + 48, { size: 46, weight: 900, color: col, align: 'left', maxW: 400 });
    text('ÉTAGE ' + r.s, x0 + w - 60, y + 48, { size: 42, weight: 800, color: col, align: 'right', maxW: 300 });
  }
  ctx.restore();
}
const LBL = { size: 70, weight: 900, color: '#ffffff', anim: 'pop', y: 1380 };

// ---------- rendu ----------
function render(t) {
  let focusY = 0, sx = 0, sy = 0;
  showOnly([towerG, miniG], t >= T.day && t < T.move ? miniG : towerG);
  hero.visible = heroS.visible = false; for (const g of TRAIL) g.visible = false;
  // obstacles animés (toujours des fonctions de t)
  movPlat.position.set(...movPos(t)); disc.rotation.y = discA(t); spinner.rotation.y = barA(t);
  const bl = t - (T.vanish + 1.05), bl2 = t - (T.fall + 3.65), bk = Math.max(bl >= 0 ? Math.exp(-bl * 7) * Math.cos(bl * 30) : 0, bl2 >= 0 ? Math.exp(-bl2 * 7) * Math.cos(bl2 * 30) : 0);
  cap.scale.set(1 + bk * .25, 1, 1 + bk * .25); cap.position.y = -bk * .55;
  VAN.forEach((v, i) => { const off = VAN_OFF[i], back = t > T.fall + 1 ; const warn = inv(off - .5, off, t), gone = t >= off && !back; v.o.visible = !gone; v.m.opacity = gone ? 0 : 1 - warn * (.45 + .4 * Math.sin(t * 40)); v.e.material.opacity = gone ? .55 * (1 - inv(off, off + .5, t)) : 0; v.e.visible = gone; });
  const cpk = t >= RESPAWN && t < T.climb ? 1 : t >= T.vanish + .15 && t < T.fall ? .6 : 0, cpPulse = Math.max(1 - inv(T.vanish + .15, T.vanish + .8, t), t >= RESPAWN ? 1 - inv(RESPAWN, RESPAWN + .9, t) : 0);
  beamMat.opacity = cpk * (.16 + .1 * Math.sin(t * 9)) + (t >= T.vanish + .15 ? cpPulse * .4 : 0); cpGlow.material.opacity = cpk * .5 + (t >= T.vanish + .15 ? cpPulse * .5 : 0); beam.scale.set(1, 1, 1);

  if (t < T.day) {                                            // ---- accroche : ça grimpe dès la première image
    const st = runSeq(SEQ.hook, t), ys = 5 + (t + .12) / (2 * BEAT) * FH, a = .45 - t * .16; setHero(st, t);
    focusY = ys; camLook(camera, [Math.sin(a) * 25, ys + .5, Math.cos(a) * 25 + 3], [0, ys + 4.6, 4], 42);
  } else if (t < T.move) {                                    // ---- la tour du jour se reconstruit chaque jour
    const lt = t - T.day, d = clamp(Math.floor(lt / BAR), 0, 2), u = lt / BAR - d;
    SLABS.forEach(({ g, nubs }, i) => {
      const drop = d === 0 ? 1 - ease.bounce(inv(i * .035, i * .035 + .45, lt)) : 0, hopK = d > 0 ? Math.sin(inv(0, .22, u) * Math.PI) * .5 * (1 + (i % 3) * .3) : 0;
      g.position.set(0, 1.45 + i * 1.32 + drop * 26 + hopK + i * hopK * .12, 0); g.rotation.y = (d + ease.io(inv(.78, 1, u))) * Math.PI / 2 * (i % 2 ? 1 : -1) + i * .0;
      const k = Math.min(ease.back(inv(.04 + i * .012, .26 + i * .012, d === 0 ? lt * .7 - .3 : u)), 1 - inv(.72, .8, u) * (d < 2 ? 1 : 0));
      nubs.forEach((nb, j) => { const hs = hash(d * 31.7 + i * 7.3 + j * 13.1), f = Math.floor(hash(d * 17.3 + i * 3.1 + j * 5.7) * 4), o = (hs - .5) * 2.2, r = 1.7 + .62 * k; nb.position.set(f === 0 ? o : f === 1 ? r : f === 2 ? o : -r, -.1 + (j - 1) * .3, f === 0 ? r : f === 1 ? o : f === 2 ? -r : o); nb.rotation.z = f % 2 ? Math.PI / 2 : 0; nb.scale.setScalar(Math.max(.001, k)); });
    });
    miniTop.position.set(0, 1.45 + NS * 1.32 - .55 + (d === 0 ? (1 - ease.bounce(inv(.5, 1, lt))) * 26 : 0), 0);
    FANS.forEach((c, i) => { (i + d) % 2 ? poseCheer(c, t + i) : poseIdle(c, t + i); c.position.y = (i + d) % 2 ? Math.abs(Math.sin(t * 9 + i)) * .5 : 0; c.parts.head.rotation.x = -.45; });
    const a = -.35 + lt * .17; focusY = 8; [sx, sy] = shake(t, T.day + (d > 0 ? d * BAR : .5), 12, .3);
    camLook(camera, [Math.sin(a) * 33, 7.5 + lt * .5, Math.cos(a) * 33], [0, 9.2, 0], 42);
  } else if (t < T.bars) {                                    // ---- plateformes mobiles et tournantes
    const lt = t - T.move, st = runSeq(SEQ.move, t); const onDisc = t > T.move + 2.7 && t < T.move + 3.55; setHero(st, t, { cheer: lt > 4.0 }); if (onDisc) hero.rotation.y = discA(t) + 2.2 + 1.6;
    const fy = 7 * FH + lerp(2.2, 6.3, prog(t, T.move + 1.4, T.move + 3.2, ease.io)), a = .42 - lt * .17; focusY = fy;
    camLook(camera, [Math.sin(a) * 25, fy + 3.5, Math.cos(a) * 25 + 3], [0, fy + 1.8, 5], 42);
  } else if (t < T.ice) {                                     // ---- barre tournante : saute au bon moment
    const lt = t - T.bars, st = runSeq(SEQ.bars, t); setHero(st, t); hero.rotation.y = .5;
    const a = .25 + lt * .12; focusY = 13 * FH; camLook(camera, [Math.sin(a) * 19 - .6, 13 * FH + 8.5 - lt * .5, Math.cos(a) * 19 + 5], [-.8, 13 * FH + 1.2, 6.5], 42);
  } else if (t < T.vanish) {                                  // ---- glace : ça glisse
    const lt = t - T.ice, x = lerp(-3.9, 3.3, ease.out(inv(.05, 1.75, lt))), stop = inv(1.5, 1.9, lt);
    setHero({ p: [x, 15 * FH, PZ + .1], air: 0, dir: 1, since: 9 }, t, { scared: true, flail: true, lean: -.22 * (1 - stop) + Math.sin(t * 13) * .12 });
    const a = -.3 + lt * .2; focusY = 15 * FH; camLook(camera, [Math.sin(a) * 21 + x * .3, 15 * FH + 4.2, Math.cos(a) * 21 + 4], [x * .45, 15 * FH + 2.0, 5.5], 42);
  } else if (t < T.fall) {                                    // ---- rebond, plateformes qui disparaissent… et chute
    const lt = t - T.vanish; let st = runSeq(SEQ.vanish, t); const falling = t >= DROP;
    if (falling) { const f = t - DROP; st = { p: [S(20)[0], S(20)[1] - 26 * f * f, PZ], air: 0, dir: 1, since: 9 }; }
    setHero(st, t, { scared: lt > 2.9, flail: falling });
    const fy = lerp(18 * FH + 2.5, 20 * FH + .5, prog(t, T.vanish + 1.0, T.vanish + 2.6, ease.io)), a = .3 - lt * .12; focusY = fy;
    camLook(camera, [Math.sin(a) * 27, fy + 2.5, Math.cos(a) * 27 + 3], [0, fy + 1.6, 5], 42);
  } else if (t < T.climb) {                                   // ---- chute, puis retour au point de sauvegarde
    const lt = t - T.fall;
    if (t < RESPAWN) {
      const f = t - DROP, y = S(20)[1] - 26 * f * f; setHero({ p: [0, y, PZ + 1.2], air: 0, dir: 1, since: 9 }, t, { scared: true, flail: true, lean: Math.sin(t * 7) * .5 });
      heroS.rotation.x = t * 5; focusY = y; camLook(camera, [10, y - 7, 21], [0, y + 3.2, 6], 46);
    } else {
      const st = runSeq(SEQ.back, t), pop = ease.elastic(inv(RESPAWN, RESPAWN + .5, t)); const h = setHero(st, t, { cheer: lt > 1.9 && lt < 3.0 }); if (t < T.fall + 3.3) { h.scale.multiplyScalar(Math.max(.01, pop)); h.rotation.y = .35; }
      const a = -.55 + (lt - 1.3) * .3; focusY = 18 * FH; const up = lerp(0, 2.2, prog(t, T.fall + 3.4, T.climb, ease.io));
      camLook(camera, [2.2 + Math.sin(a) * 20, 18 * FH + 5 + up, PZ + Math.cos(a) * 20], [1.6, 18 * FH + 2.9 + up, PZ], 42);
    }
  } else if (t < T.rank) {                                    // ---- montée express : toujours plus haut
    const lt = t - T.climb, st = runSeq(SEQ.climb, t), ys = 24 * FH + (lt + .1) / (2 * BEAT) * FH; setHero(st, t);
    TRAIL.forEach((g, i) => { const p = runSeq(SEQ.climb, t - (i + 1) * .028).p; g.visible = true; g.position.set(p[0], p[1] + 2.4, p[2] - .2); });
    const a = -.5 + lt * .24; focusY = ys; camLook(camera, [Math.sin(a) * 25, ys - 4.5, Math.cos(a) * 25 + 3], [0, ys + 4.6, 4], 44);
  } else if (t < T.end) {                                     // ---- classement du jour
    const lt = t - T.rank, st = runSeq(SEQ.rank, t), top = lt > 1.6; const h = setHero(st, t, { cheer: top }); h.rotation.y = .3; if (top) h.position.y += Math.abs(Math.sin((lt - 1.6) * 9)) * .9;
    const a = .5 - lt * .1; focusY = 31 * FH; camLook(camera, [-2.7 + Math.sin(a) * 15, 31 * FH + 3.5, PZ + Math.cos(a) * 15], [-2.7, 31 * FH + 9.8, PZ], 44);
  } else {                                                    // ---- écran final : la montée continue derrière le titre
    const lt = t - T.end, st = runSeq(SEQ.end, t), ys = 26 * FH + (lt + .1) / (2 * BEAT) * FH; setHero(st, t);
    TRAIL.forEach((g, i) => { const p = runSeq(SEQ.end, t - (i + 1) * .028).p; g.visible = true; g.position.set(p[0], p[1] + 2.4, p[2] - .2); });
    const a = .6 - lt * .1; focusY = ys; camLook(camera, [Math.sin(a) * 30, ys - 9, Math.cos(a) * 30 + 3], [0, ys - 3.5, 4], 44);
  }
  L.sun.position.set(7, focusY + 13, 9 + (t >= T.day && t < T.move ? -3 : 5)); L.sun.target.position.set(0, focusY, t >= T.day && t < T.move ? 0 : 5); L.sun.target.updateMatrixWorld();

  sky(t, t >= T.day && t < T.move ? 0 : focusY);
  if (t >= T.fall && t < RESPAWN) [sx, sy] = [0, 0]; else if (t >= RESPAWN && t < T.climb) [sx, sy] = shake(t, RESPAWN, 16, .35);
  if (t >= T.rank && t < T.end) [sx, sy] = shake(t, T.rank + 1.62, 14, .4);
  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(.3);

  // ---------- textes, affichages, transitions ----------
  if (t < T.day) {
    hudFloor(t, floorOf(runSeq(SEQ.hook, t).p[1]));
    caption(t, .08, T.day - .1, "JUSQU'OÙ\nTU MONTES ?", { font: TITLE, size: 104, y: 560, anim: 'slam', inDur: .2, grad: ['#fff58a', C.yellow], stroke: '#10163a', strokeW: 20, lineH: 1.12 });
  }
  flash(t, T.day, .3);
  if (t >= T.day && t < T.move) {
    calendar(t);
    caption(t, T.day + .25, T.move - .12, 'NOUVELLE TOUR\nCHAQUE JOUR', { font: TITLE, size: 74, y: 1380, anim: 'pop', color: '#ffffff', stroke: '#10163a', strokeW: 18, lineH: 1.15 });
    for (const d of [1, 2]) flash(t, T.day + d * BAR, .22, '255,255,255', .45);
  }
  wipe(t, T.move, { color: C.pink, color2: C.cyan, dir: 'up', dur: .42 });
  if (t >= T.move && t < T.bars) {
    hudFloor(t, floorOf(runSeq(SEQ.move, t).p[1]));
    caption(t, T.move + .22, T.move + 2.15, "18 SORTES\nD'OBSTACLES", { font: TITLE, size: 82, y: 1370, anim: 'slam', grad: ['#ffffff', C.cyan], stroke: '#10163a', strokeW: 18, lineH: 1.15 });
    caption(t, T.move + 2.3, T.bars - .1, 'Ça bouge, ça tourne !', { ...LBL, bg: C.orange });
  }
  flash(t, T.bars, .25);
  if (t >= T.bars && t < T.ice) { hudFloor(t, 13); caption(t, T.bars + .12, T.ice - .08, 'Barres tournantes', { ...LBL, bg: C.pink }); }
  wipe(t, T.ice, { color: '#e9fbff', color2: C.cyan, dir: 'right', dur: .36 });
  if (t >= T.ice && t < T.vanish) { hudFloor(t, 15); sparkles(t, { n: 22, y: 500, h: 700, color: '#e9fbff', size: 16, seed: 9 }); caption(t, T.ice + .15, T.vanish - .1, 'Glace qui glisse', { ...LBL, bg: '#1d8fe0' }); }
  flash(t, T.vanish, .25);
  if (t >= T.vanish && t < T.fall) {
    const lt = t - T.vanish; hudFloor(t, t >= DROP ? 20 : floorOf(runSeq(SEQ.vanish, t).p[1]), { saved: lt < 2.0 ? lt - .18 : 0 });
    caption(t, T.vanish + .75, T.vanish + 2.0, 'Ça rebondit !', { ...LBL, bg: C.pink });
    caption(t, T.vanish + 2.1, DROP, 'Ça disparaît !', { ...LBL, bg: C.violet });
    caption(t, DROP + .02, T.fall, 'OUPS !', { font: TITLE, size: 150, y: 1340, anim: 'slam', inDur: .15, color: '#ffffff', stroke: C.pink, strokeW: 26, tilt: -5 });
  }
  if (t >= T.fall && t < RESPAWN) {
    speedLines(t, { alpha: .55, cy: H * .5, inner: 430 });
    caption(t, T.fall + .08, RESPAWN - .05, 'TU TOMBES ?', { font: TITLE, size: 100, y: 1360, anim: 'slam', inDur: .16, color: '#ffffff', stroke: '#10163a', strokeW: 20 });
  }
  flash(t, RESPAWN, .4, '43,255,138', .9);
  if (t >= RESPAWN && t < T.climb) {
    hudFloor(t, t > T.fall + 4.1 ? 19 : 18);
    caption(t, RESPAWN + .1, T.fall + 2.7, 'Retour au point\nde sauvegarde', { ...LBL, size: 72, bg: '#0f9d58', y: 1370 });
    caption(t, T.fall + 2.78, T.climb - .1, '1 point tous\nles 3 étages', { ...LBL, size: 72, bg: '#10163a', color: C.green, y: 1370 });
  }
  wipe(t, T.climb, { color: C.yellow, color2: C.pink, dir: 'up', dur: .4 });
  if (t >= T.climb && t < T.rank) {
    speedLines(t, { alpha: .3, cy: H * .5, inner: 600, n: 30 });
    hudFloor(t, floorOf(runSeq(SEQ.climb, t).p[1]));
    caption(t, T.climb + .2, T.rank - .1, 'MONTE\nPLUS HAUT', { font: TITLE, size: 104, y: 1340, anim: 'slam', grad: ['#fff58a', C.orange], stroke: '#10163a', strokeW: 20, lineH: 1.12 });
  }
  flash(t, T.rank, .3);
  if (t >= T.rank && t < T.end) {
    leaderboard(t);
    confetti(t, T.rank + 1.62, { cy: 900, n: 130, colors: BAND.concat('#ffffff') });
    caption(t, T.rank + 1.66, T.end - .06, '1ER DU JOUR ?', { font: TITLE, size: 86, y: 1455, anim: 'slam', inDur: .16, grad: ['#fff58a', C.yellow], stroke: '#10163a', strokeW: 18 });
  }
  flash(t, T.end, .35);
  if (t >= T.end) {
    fade(.5 * inv(T.end, T.end + .4, t), '#0a0f2e'); rays(t, { cy: 660, color: 'rgba(166,107,255,.14)', n: 14 }); sparkles(t, { y: 230, h: 1150, n: 34, color: '#fff7c2' });
    endCard(t, T.end + .12, { title: 'TUMBLE\nTOWER', tagline: 'Une nouvelle tour chaque jour', status: 'bientot', font: TITLE, titleSize: 138, titleGrad: ['#fff58a', C.orange], titleStroke: '#10163a', accent: C.pink, y: 790 });
  }
}

registerAd({ duration: DURATION, thumbTime: T.climb + 1.2, render,
  music: { style: 'dnb', bpm: BPM, root: 45, sections: [[0, 'drop'], [T.day, 'build'], [T.move, 'drop'], [T.fall, 'break'], [T.climb, 'drop2']], end: T.end, seed: 8 } });
