// Publicité « Échecs Royaux » (38 s, 19 mesures à 120 bpm). Tout est créé par le code : aucune ressource externe.
// Chaque plan montre une fonction publiée du jeu (voir ../script.md pour les sources).
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, rgba, mixHex, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox,
  addLights, ground, showOnly, glow, sign, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect, text, caption, pill, bar, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Cinzel', 'Inter']);
const BAR = 240 / 120;                                   // 2 s par mesure
const T = { hook: 0, bots: 2 * BAR, puzzle: 4 * BAR, c960: 6 * BAR, duel: 8 * BAR, tour: 12 * BAR, rank: 14 * BAR, end: 16 * BAR }, DURATION = 19 * BAR;
const MATE = 22;                                         // l'échec et mat tombe sur un début de mesure
const C = { gold: '#ffc83d', goldL: '#ffe9a0', goldD: '#a8660f', ivory: '#f6ecd6', obs: '#2a2347', red: '#ff3b4e', cyan: '#5fe1ff', light: '#efe0bb', dark: '#6b4fb5', night: '#0a0920', violet: '#33246e' };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// ================================================================== scène 3D (construite une seule fois)
gl3D({ exposure: 1.12 });
const scene = new THREE.Scene(), camera = makeCamera(42);
addLights(scene, { sun: '#ffe7c0', sunI: 2.9, sky: '#c4bcff', ground: '#43306e', ambI: 1.25, dir: [5, 11, 6], shadowArea: 12, target: [0, 0, -1] });
const GOLD = mat(C.gold, { rough: .22, metal: .35, emissive: '#8a4f00', emissiveI: .55 });
const basic = (color, opacity, add = true) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
const flat = (geo, m, y = .012) => { const p = new THREE.Mesh(geo, m); p.rotation.x = -Math.PI / 2; p.position.y = y; return p; };

// ---------- échiquier
const boardG = new THREE.Group(); scene.add(boardG);
boardG.add(ground(120, '#141031', { round: true, y: -.56 }));
boardG.add(box(9.5, .5, 9.5, '#191437', { rough: .4, pos: [0, -.31, 0] }));
boardG.add(box(8.28, .1, 8.28, GOLD, { pos: [0, -.085, 0] }));
for (const s of [-1, 1]) { boardG.add(box(9.62, .1, .16, GOLD, { pos: [0, -.1, s * 4.75] })); boardG.add(box(.16, .1, 9.62, GOLD, { pos: [s * 4.75, -.1, 0] })); }
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boardG.add(ball(.2, GOLD, { pos: [sx * 4.75, -.02, sz * 4.75] }));
{
  const g = new THREE.BoxGeometry(1, .12, 1), m4 = new THREE.Matrix4();
  for (const [col, par] of [[C.dark, 0], [C.light, 1]]) {
    const im = new THREE.InstancedMesh(g, mat(col, { rough: .42 }), 32); let n = 0;
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) if ((f + r) % 2 === par) { m4.makeTranslation(f - 3.5, -.06, 3.5 - r); im.setMatrixAt(n++, m4); }
    im.receiveShadow = true; boardG.add(im);
  }
}
const sqX = sq => sq.charCodeAt(0) - 97 - 3.5, sqZ = sq => 3.5 - (+sq[1] - 1);

// ---------- pièces tournées (profils en tour de potier, cavalier extrudé)
const lathe = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 36);
const BASE = [[0, 0], [.38, 0], [.40, .025], [.40, .07], [.37, .09], [.33, .11], [.33, .145], [.29, .175]];
const GEO = {
  P: lathe([...BASE, [.22, .2], [.16, .26], [.13, .36], [.12, .44], [.20, .47], [.21, .5], [.13, .53], [.15, .565], [.185, .62], [.195, .67], [.185, .72], [.155, .77], [.105, .805], [.05, .825], [0, .83]]),
  R: lathe([...BASE, [.27, .2], [.24, .28], [.215, .5], [.21, .64], [.25, .68], [.29, .71], [.29, .86], [.18, .86], [.18, .8], [0, .8]]),
  B: lathe([...BASE, [.25, .2], [.18, .28], [.14, .45], [.12, .62], [.21, .65], [.22, .68], [.13, .71], [.15, .74], [.19, .82], [.2, .9], [.17, .99], [.11, 1.07], [.05, 1.11], [.065, 1.13], [.08, 1.16], [.065, 1.19], [0, 1.2]]),
  Q: lathe([...BASE, [.27, .2], [.2, .3], [.155, .55], [.13, .8], [.23, .84], [.24, .87], [.15, .9], [.16, .94], [.22, 1.1], [.27, 1.2], [.22, 1.22], [.12, 1.24], [.1, 1.28], [0, 1.29]]),
  K: lathe([...BASE, [.28, .2], [.21, .3], [.165, .6], [.145, .88], [.24, .92], [.25, .95], [.16, .98], [.17, 1.02], [.23, 1.2], [.245, 1.28], [.18, 1.3], [.1, 1.32], [0, 1.33]]),
  Nb: lathe([...BASE, [.28, .2], [.27, .23], [0, .23]]),
  merlon: new THREE.BoxGeometry(.12, .12, .1), pearl: new THREE.SphereGeometry(.045, 10, 8), top: new THREE.SphereGeometry(.075, 14, 10),
  cv: new THREE.BoxGeometry(.08, .3, .08), ch: new THREE.BoxGeometry(.25, .08, .08), eye: new THREE.SphereGeometry(.035, 8, 6),
};
{
  const s = new THREE.Shape(); s.moveTo(-.24, 0); s.lineTo(.23, 0); s.quadraticCurveTo(.21, .2, .06, .31); s.quadraticCurveTo(.03, .39, .15, .44); s.lineTo(.31, .45);
  s.quadraticCurveTo(.4, .5, .35, .59); s.quadraticCurveTo(.23, .71, .11, .78); s.lineTo(.09, .9); s.lineTo(0, .81); s.quadraticCurveTo(-.17, .77, -.23, .58); s.quadraticCurveTo(-.31, .3, -.24, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelThickness: .05, bevelSize: .04, bevelSegments: 3, curveSegments: 12 }); g.translate(0, 0, -.08); g.computeVertexNormals(); GEO.Nh = g;
}
const PS = 1.12;
function makePiece(type, m, accent) {
  const g = new THREE.Group(), add = (geo, x = 0, y = 0, z = 0, ry = 0, mm = m) => { const o = new THREE.Mesh(geo, mm); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); };
  if (type === 'N') { add(GEO.Nb); add(GEO.Nh, 0, .2, 0); for (const s of [-1, 1]) add(GEO.eye, .2, .86, s * .125, 0, accent); } else add(GEO[type]);
  if (type === 'R') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(GEO.merlon, Math.cos(a) * .235, .9, Math.sin(a) * .235, -a - Math.PI / 2); }
  if (type === 'Q') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(GEO.pearl, Math.cos(a) * .235, 1.235, Math.sin(a) * .235, 0, accent); } add(GEO.top, 0, 1.34, 0, 0, accent); }
  if (type === 'K') { add(GEO.cv, 0, 1.47, 0, 0, accent); add(GEO.ch, 0, 1.5, 0, 0, accent); }
  g.scale.setScalar(PS); return g;
}
const MATP = { w: mat(C.ivory, { rough: .3 }), b: mat(C.obs, { rough: .26, emissive: '#0e0a26' }) };
const ACC = { w: GOLD, b: mat('#b79bff', { rough: .3, emissive: '#3a2a8a', emissiveI: .7 }) };
const pool = [];
for (const col of ['w', 'b']) for (const type of 'KQRRBBNNPPPPPPPP') { const obj = makePiece(type, MATP[col], ACC[col]); boardG.add(obj); pool.push({ type, col, obj, rot: type === 'N' ? (col === 'w' ? Math.PI / 2 : -Math.PI / 2) : 0 }); }
const parse = s => s.trim().split(/\s+/).map(x => [x[1], x[0], x.slice(2)]);
const START = parse('wRa1 wNb1 wBc1 wQd1 wKe1 wBf1 wNg1 wRh1 wPa2 wPb2 wPc2 wPd2 wPe2 wPf2 wPg2 wPh2 bRa8 bNb8 bBc8 bQd8 bKe8 bBf8 bNg8 bRh8 bPa7 bPb7 bPc7 bPd7 bPe7 bPf7 bPg7 bPh7');
const HOOK = START.filter(p => !(p[0] === 'Q' && p[1] === 'w')).concat([['Q', 'w', 'd4']]);
// Problème du jour (mat en un coup) : 1.Te8# (mat du couloir). Vérifié : f8 et h8 sont contrôlées par la tour, rien ne peut prendre ni s'interposer.
const PUZZLE = parse('wKg1 wRe1 wPf2 wPg2 wPh2 bKg8 bPf7 bPg7 bPh7 bPa7 bQb2 bNc6');
// Duel : mat à l'étouffée. 1.Db3+ Rh8 2.Cf7+ Rg8 3.Ch6++ Rh8 4.Dg8+!! Txg8 5.Cf7#
const DUEL = parse('wKg1 wQd1 wRe1 wBc1 wNg5 wPa2 wPb2 wPc3 wPf2 wPg2 wPh2 bKg8 bQa5 bRa8 bRf8 bBe7 bPa7 bPb5 bPc6 bPg7 bPh7');
const mv = (land, from, to, o = {}) => ({ land, from, to, dur: .3, ...o, start: land - (o.dur ?? .3) });
const DUEL_MOVES = [mv(17, 'd1', 'b3', { check: 1 }), mv(17.5, 'g8', 'h8'), mv(18, 'g5', 'f7', { check: 1 }), mv(18.5, 'h8', 'g8'), mv(19, 'f7', 'h6', { check: 1 }), mv(19.5, 'g8', 'h8'),
  mv(20.5, 'b3', 'g8', { check: 1, sac: 1, dur: .6 }), mv(21, 'f8', 'g8'), mv(MATE, 'h6', 'f7', { mate: 1, dur: .42 })];
const BOT_MOVES = [mv(4.8, 'e2', 'e4'), mv(5.45, 'e7', 'e5'), mv(6.0, 'g1', 'f3'), mv(6.75, 'b8', 'c6'), mv(7.35, 'f1', 'c4')];
const PUZ_MOVES = [mv(10, 'e1', 'e8', { mate: 1, dur: .4 })];

/** Pose une position ; renvoie { case: pièce }. */
function lay(list) {
  for (const p of pool) { p.used = false; p.obj.visible = false; }
  const occ = {};
  for (const [type, col, sq] of list) { const p = pool.find(q => !q.used && q.type === type && q.col === col); p.used = true; p.sq = sq; p.obj.visible = true; p.obj.position.set(sqX(sq), 0, sqZ(sq)); p.obj.rotation.set(0, p.rot, 0); p.obj.scale.setScalar(PS); occ[sq] = p; }
  return occ;
}
/** Joue les coups jusqu'à l'instant t (pièce qui se soulève en glissant, prise qui éclate). */
function play(t, occ, moves) {
  let last = null;
  for (const m of moves) {
    if (t < m.start) break;
    const p = occ[m.from], v = occ[m.to], k = clamp((t - m.start) / m.dur), e = ease.io(k);
    const ax = sqX(m.from), az = sqZ(m.from), bx = sqX(m.to), bz = sqZ(m.to), dist = Math.hypot(bx - ax, bz - az);
    const arc = (p.type === 'N' ? 1 : .28 + dist * .06) * (m.sac ? 1.7 : 1);
    p.obj.position.set(lerp(ax, bx, e), Math.sin(Math.PI * k) * arc, lerp(az, bz, e));
    if (m.sac) p.obj.rotation.y = p.rot + e * Math.PI * 2;
    delete occ[m.from];
    if (k >= 1) {
      occ[m.to] = p; p.sq = m.to;
      const dt = t - m.land, sq = dt < .22 ? 1 - .16 * Math.sin(dt / .22 * Math.PI) : 1; p.obj.scale.set(PS * (2 - sq), PS * sq, PS * (2 - sq));
      if (v) { if (dt < .8) { v.obj.position.set(bx + dt * 2.8, dt * 5.5 - 7 * dt * dt + .2, bz - dt * 2.4); v.obj.rotation.set(dt * 9, dt * 6, dt * 5); v.obj.scale.setScalar(PS * (1 - ease.out(dt / .8))); } else v.obj.visible = false; }
    }
    last = m;
  }
  return last;
}
function topple(p, k) { const a = ease.out(k) * 1.45, P = .38 * PS; p.obj.rotation.set(-a, 0, 0); p.obj.position.y = P * Math.sin(a); p.obj.position.z = sqZ(p.sq) - P * (1 - Math.cos(a)); }

// ---------- effets posés sur le plateau
const hlFrom = flat(new THREE.PlaneGeometry(.96, .96), basic(C.gold, .3)), hlTo = flat(new THREE.PlaneGeometry(.96, .96), basic(C.gold, .45));
const checkRing = flat(new THREE.RingGeometry(.33, .47, 40), basic('#ff2a44', .9), .016);
const shock = flat(new THREE.RingGeometry(.84, 1, 64), basic('#fff2c0', 1), .03);
const selGlow = glow(C.gold, 2.2, .9);
const dots = []; for (let i = 0; i < 7; i++) { const d = flat(new THREE.CircleGeometry(.17, 20), basic('#3df0a2', .9, false), .02); dots.push(d); boardG.add(d); }
boardG.add(hlFrom, hlTo, checkRing, shock, selGlow);

// ---------- robot adversaire (plan des bots)
const robotG = new THREE.Group(); scene.add(robotG);
const R = {};
{
  const steel = '#565c9a', dk = '#2d3160';
  robotG.add(rbox(3.4, 2.6, 1.8, .35, steel, { pos: [0, 1.5, 0] }));
  robotG.add(rbox(2.2, 1.2, .2, .1, dk, { pos: [0, 1.7, .9] }));
  R.core = ball(.34, '#ffffff', { pos: [0, 1.7, 1.02] }); R.core.material = new THREE.MeshBasicMaterial({ color: '#5fe1ff' }); robotG.add(R.core);
  robotG.add(cyl(.5, .6, .5, dk, { pos: [0, 3.0, 0] }));
  R.head = new THREE.Group(); R.head.position.y = 3.2; robotG.add(R.head);
  R.head.add(rbox(3.9, 2.6, 2.2, .45, steel, { pos: [0, 1.3, 0] }));
  R.head.add(rbox(3.3, 2.0, .2, .2, '#0c0d22', { pos: [0, 1.3, 1.08] }));
  const face = (col, evil) => sign(3.0, 1.75, (c, w, h) => {
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = h * .09; c.lineCap = 'round'; c.shadowColor = col; c.shadowBlur = h * .12;
    for (const s of [-1, 1]) {
      c.beginPath();
      if (evil) { c.moveTo(w / 2 + s * w * .34, h * .22); c.lineTo(w / 2 + s * w * .1, h * .44); c.lineTo(w / 2 + s * w * .32, h * .5); c.closePath(); c.fill(); }
      else { c.arc(w / 2 + s * w * .22, h * .42, h * .13, 0, 7); c.fill(); }
    }
    c.beginPath();
    if (evil) { c.moveTo(w * .22, h * .78); for (let i = 1; i <= 8; i++) c.lineTo(w * (.22 + i * .07), h * (i % 2 ? .68 : .82)); }
    else { c.moveTo(w * .36, h * .7); c.quadraticCurveTo(w / 2, h * .86, w * .64, h * .7); }
    c.stroke();
  }, { res: 384, emissive: true, pos: [0, 1.3, 1.2] });
  R.calm = face('#5fe1ff', false); R.evil = face('#ff3b4e', true); R.head.add(R.calm, R.evil);
  R.head.add(cyl(.07, .07, .9, dk, { pos: [0, 3.0, 0] }));
  R.bulbA = ball(.24, '#fff', { pos: [0, 3.5, 0] }); R.bulbA.material = new THREE.MeshBasicMaterial({ color: '#5fe1ff' });
  R.bulbB = ball(.24, '#fff', { pos: [0, 3.5, 0] }); R.bulbB.material = new THREE.MeshBasicMaterial({ color: '#ff3b4e' }); R.head.add(R.bulbA, R.bulbB);
  for (const s of [-1, 1]) { R.head.add(cyl(.34, .34, .5, dk, { pos: [s * 2.1, 1.3, 0], rot: [0, 0, Math.PI / 2] })); robotG.add(ball(.62, dk, { pos: [s * 2.15, 2.3, 0] })); robotG.add(cyl(.3, .26, 1.9, steel, { pos: [s * 2.5, 1.3, .25], rot: [.25, 0, -s * .22] })); }
  R.aura = glow('#ff2a44', 15, 0); R.aura.position.set(0, 4, -1.5); robotG.add(R.aura);
  R.hand = new THREE.Group(); R.hand.add(ball(.42, steel)); R.hand.add(cyl(.2, .3, .6, dk, { pos: [0, .5, 0] }));
  for (let i = 0; i < 3; i++) { const a = i * 2.094; R.hand.add(cone(.13, .7, '#c9ceff', { pos: [Math.cos(a) * .3, -.5, Math.sin(a) * .3], rot: [Math.sin(a) * .35, 0, Math.PI - Math.cos(a) * .35] })); }
  scene.add(R.hand);
}

// ---------- podium du tournoi
const tourG = new THREE.Group(); scene.add(tourG);
tourG.add(ground(120, '#141031', { round: true }));
tourG.add(cyl(2.3, 2.6, .5, '#1d1742', { pos: [0, .25, 0], seg: 48 })); tourG.add(cyl(1.7, 1.9, .6, '#2a2160', { pos: [0, .8, 0], seg: 48 }));
{ const r1 = torus(2.3, .07, GOLD, { pos: [0, .5, 0], rot: [Math.PI / 2, 0, 0], seg: 48 }), r2 = torus(1.7, .07, GOLD, { pos: [0, 1.1, 0], rot: [Math.PI / 2, 0, 0], seg: 48 }); tourG.add(r1, r2); }
const champ = makePiece('K', GOLD, mat('#fff3c4', { emissive: '#ffd36a', emissiveI: .9 })); champ.position.y = 1.1; champ.scale.setScalar(2.9); tourG.add(champ);
const champGlow = glow('#ffd36a', 12, .6); champGlow.position.set(0, 3.4, -1.2); tourG.add(champGlow);
const fallen = []; for (let i = 0; i < 6; i++) { const a = -2.2 + i * .88, p = makePiece('P', MATP[i % 2 ? 'w' : 'b']); p.position.set(Math.cos(a) * 4.2, 0, Math.sin(a) * 2.4 - 1.5); p.scale.setScalar(1.5); tourG.add(p); fallen.push(p); }

// ---------- escalier des rangs et porte du rebirth
const rankG = new THREE.Group(); scene.add(rankG);
rankG.add(ground(120, '#141031', { round: true }));
const stepPos = i => i < 0 ? [0, 0, 5.9] : [0, .5 * (i + 1), 4.5 - 1.2 * i];
for (let i = 0; i < 10; i++) {
  const col = mixHex('#8a4f22', '#f0b068', i / 9);
  rankG.add(box(3.8, .5 * (i + 1), 1.2, col, { rough: .45, pos: [0, .25 * (i + 1), 4.5 - 1.2 * i] }));
  rankG.add(box(3.9, .07, .1, GOLD, { pos: [0, .5 * (i + 1), 5.1 - 1.2 * i] }));
  rankG.add(sign(1.5, .42, (c, w, h) => { c.fillStyle = '#fff3d0'; c.font = `900 ${h * .9}px "Cinzel", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ROMAN[i], w / 2, h * .55); }, { res: 256, emissive: true, pos: [0, .5 * i + .25, 5.105 - 1.2 * i] }));
  for (const s of [-1, 1]) { rankG.add(box(.3, .5 * (i + 1) + .7, 1.2, '#221a4d', { pos: [s * 2.05, .25 * (i + 1) + .35, 4.5 - 1.2 * i] })); if (i % 3 === 0) rankG.add(ball(.22, GOLD, { pos: [s * 2.05, .5 * (i + 1) + .9, 4.5 - 1.2 * i] })); }
}
rankG.add(box(7, 5, 5.2, '#2a2160', { rough: .5, pos: [0, 2.5, -9.5] }));
rankG.add(box(7.1, .1, 5.3, GOLD, { pos: [0, 4.96, -9.5] }));
const gate = { doors: [] };
for (const s of [-1, 1]) {
  rankG.add(box(.9, 5.2, .9, '#1d1742', { pos: [s * 2.15, 7.6, -8.4] })); rankG.add(box(1.1, .25, 1.1, GOLD, { pos: [s * 2.15, 10.3, -8.4] })); rankG.add(box(1.1, .25, 1.1, GOLD, { pos: [s * 2.15, 5.12, -8.4] }));
  const d = new THREE.Group(); d.position.set(s * 1.7, 5, -8.4); d.add(box(1.7, 4.6, .2, '#4a2f8f', { pos: [-s * .85, 2.3, 0] })); d.add(box(1.3, 3.9, .26, '#5d3fb0', { pos: [-s * .85, 2.3, 0] }));
  d.add(box(.12, 4.6, .3, GOLD, { pos: [-s * 1.64, 2.3, 0] })); d.add(ball(.16, GOLD, { pos: [-s * 1.35, 2.3, .2] })); rankG.add(d); gate.doors.push(d);
}
rankG.add(box(5.3, 1, 1, '#1d1742', { pos: [0, 10.9, -8.4] })); rankG.add(box(5.5, .2, 1.2, GOLD, { pos: [0, 11.5, -8.4] }));
for (let i = -2; i <= 2; i++) rankG.add(cone(.3, .9 - Math.abs(i) * .15, GOLD, { pos: [i * .85, 12 - Math.abs(i) * .07, -8.4], seg: 4 }));
gate.light = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.6), new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true })); gate.light.position.set(0, 7.3, -8.7); rankG.add(gate.light);
gate.glow = glow('#ffe9a0', 14, 0); gate.glow.position.set(0, 7.4, -8); rankG.add(gate.glow);
gate.lock = new THREE.Group(); gate.lock.add(rbox(.9, .75, .3, .12, GOLD)); gate.lock.add(torus(.3, .08, GOLD, { pos: [0, .5, 0], seg: 16 })); gate.lock.position.set(0, 7.3, -8.2); rankG.add(gate.lock);
const climber = makePiece('P', MATP.w); climber.scale.setScalar(2.3); rankG.add(climber);
const climbGlow = glow(C.gold, 5, 0); rankG.add(climbGlow);

// ================================================================== outils 2D
const _v = new THREE.Vector3();
const proj = (x, y, z) => { _v.set(x, y, z).project(camera); return [(_v.x + 1) / 2 * W, (1 - _v.y) / 2 * H]; };
function camKeys(t, keys) {
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], k = ease.io(inv(a[0], b[0], t)), L = (p, q) => p.map((v, j) => lerp(v, q[j], k));
  camLook(camera, L(a[1], b[1]), L(a[2], b[2]), lerp(a[3], b[3], k)); camera.updateMatrixWorld();
}
/** Gerbe d'étincelles 3D projetée en 2D (sans mémoire). */
function burst(t, t0, p, { n = 70, color = '#ffd76a', v = 4.5, life = 1.1, size = 11, seed = 0 } = {}) {
  const dt = t - t0; if (dt < 0 || dt > life) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const s = seed * 100 + i, l = life * (.45 + .55 * hash(s + .3)); if (dt > l) continue;
    const th = hash(s) * 6.283, ph = hash(s + .7) * 1.45, sp = v * (.35 + .65 * hash(s + .1));
    const [x, y] = proj(p[0] + Math.cos(th) * Math.cos(ph) * sp * dt, Math.max(.03, p[1] + Math.sin(ph) * sp * 1.1 * dt - 4.5 * dt * dt), p[2] + Math.sin(th) * Math.cos(ph) * sp * dt);
    const f = Math.pow(1 - dt / l, 1.4); ctx.globalAlpha = f; ctx.beginPath(); ctx.arc(x, y, size * (.4 + .6 * f), 0, 7); ctx.fill();
  }
  ctx.restore();
}
/** Fond « Nuit royale » : dégradé, lueurs qui dérivent, étoiles. */
function night(t, top = '#07061a', mid = '#221a55', bot = '#0c0a26', tint = '#7a5cff') {
  bg([[0, top], [.5, mid], [1, bot]]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const x = W * (.5 + Math.sin(t * .23 + i * 2.1) * .45), y = H * (.18 + i * .15 + Math.cos(t * .19 + i) * .05), r = 380 + i * 60; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(i % 2 ? '#ffc83d' : tint, .16)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) { const tw = .35 + .65 * Math.abs(Math.sin(t * (1 + hash(i) * 2) + i)); ctx.globalAlpha = tw * .6; ctx.beginPath(); ctx.arc(hash(i * 3.1) * W, hash(i * 7.7) * H * .62, 1.2 + hash(i * 5) * 2.4, 0, 7); ctx.fill(); }
  ctx.restore();
}
/** Bannière type jeu au-dessus d'un point 3D. */
function tag(str, p, t, t0, dur, o = {}) {
  const dt = t - t0; if (dt < 0 || dt > dur) return; const [x, y] = proj(p[0], p[1], p[2]);
  pill(str, clamp(x, 230, W - 230), Math.max(430, y), { size: 62, bg: C.red, border: '#ffffff', weight: 900, ...o, scale: ease.back(inv(0, .16, dt)) * (1 + .15 * inv(dur - .1, dur, dt)), alpha: 1 - inv(dur - .1, dur, dt) });
}
function pawnIcon(x, y, s, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y - s * .42, s * .3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - s * .16, y - s * .2); ctx.lineTo(x + s * .16, y - s * .2); ctx.lineTo(x + s * .4, y + s * .5); ctx.lineTo(x - s * .4, y + s * .5); ctx.closePath(); ctx.fill(); roundRect(x - s * .5, y + s * .42, s, s * .2, s * .08); ctx.fill(); }
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function fx(last, t, king) {                                   // surbrillances communes aux plans de partie
  hlFrom.visible = hlTo.visible = !!last; checkRing.visible = false;
  if (last) { hlFrom.position.set(sqX(last.from), .012, sqZ(last.from)); hlTo.position.set(sqX(last.to), .014, sqZ(last.to)); const k = inv(last.start, last.start + .15, t); hlFrom.material.opacity = .3 * k; hlTo.material.opacity = .5 * k; }
  if (last && king && t >= last.land && (last.check || last.mate)) { const dt = t - last.land; checkRing.visible = true; checkRing.position.set(sqX(king.sq), .02, sqZ(king.sq)); checkRing.scale.setScalar(last.mate ? 1.25 + .12 * Math.sin(t * 14) : 1 + .25 * Math.sin(dt * 12)); checkRing.material.opacity = last.mate ? 1 : clamp(1.2 - dt * 1.6); }
}
function ring(t, t0, x, z, size = 6, dur = .7) { const dt = t - t0; shock.visible = dt >= 0 && dt < dur; if (shock.visible) { shock.position.set(x, .03, z); shock.scale.setScalar(.3 + ease.out(dt / dur) * size); shock.material.opacity = 1 - dt / dur; } }

// ================================================================== repères sonores
cue(.02, 'whoosh'); cue(.15, 'impact', .8); cue(1.2, 'riser', .7, .8); cue(2, 'boom'); cue(2.05, 'glass', .5); cue(3.7, 'swish');
cue(T.bots, 'impact'); for (const m of BOT_MOVES) cue(m.land, 'tap', .9); for (let i = 1; i < 8; i++) cue(4.4 + i * .257, 'tick', .6); cue(6.2, 'zap'); cue(6.25, 'boom', .7); cue(7.75, 'whoosh');
cue(T.puzzle, 'chime'); cue(8.4, 'click'); for (let i = 0; i < 7; i++) cue(8.55 + i * .1, 'pop', .45); cue(9.6, 'slide'); cue(10, 'impact'); cue(10.05, 'ding'); cue(10.4, 'powerup', .8); cue(11.75, 'swish');
cue(T.c960, 'impact', .8); cue(12.55, 'roll', .7, .6); cue(13.15, 'thud'); cue(14.15, 'roll', .7, .6); cue(14.75, 'thud'); cue(15.3, 'riser', .8, .7);
cue(T.duel, 'boom'); for (const m of DUEL_MOVES) cue(m.land, m.check ? 'impact' : 'tap', m.check ? .75 : .9); cue(19.9, 'whoosh'); cue(20.5, 'glass', .7); cue(21, 'crunch'); cue(21.2, 'heartbeat'); cue(21.6, 'heartbeat');
cue(MATE, 'boom', 1.2); cue(MATE + .05, 'bell'); cue(MATE + .5, 'thud'); cue(MATE + .7, 'win'); cue(MATE + .8, 'crowd', .6, 1.2);
cue(T.tour - .2, 'whoosh'); for (let i = 0; i < 8; i++) cue(24.2 + i * .06, 'pop', .5); cue(25, 'click'); cue(25.7, 'click'); cue(26.4, 'impact'); cue(26.45, 'win', .8); cue(26.5, 'chime');
cue(T.rank - .2, 'whoosh'); for (let i = 0; i < 10; i++) cue(28.3 + (i + 1) * .16, 'tap', .6); cue(29.92, 'thud'); cue(30, 'powerup'); cue(30.02, 'boom', .8); cue(30.3, 'slide'); for (let i = 0; i < 10; i++) cue(30.25 + (i + 1) * .09, 'tick', .5); cue(31.3, 'chime');
cue(T.end - .25, 'sweepdown'); cue(T.end, 'boom'); cue(T.end + .15, 'bell', .8); cue(T.end + .85, 'pop'); cue(T.end + 1.3, 'ding', .7);

// ================================================================== plans
const GROUPS = [boardG, tourG, rankG];
function resetFx() { hlFrom.visible = hlTo.visible = checkRing.visible = shock.visible = selGlow.visible = false; for (const d of dots) d.visible = false; robotG.visible = false; R.hand.visible = false; }

function sHook(t) {
  night(t); showOnly(GROUPS, boardG); resetFx();
  const occ = lay(HOOK), q = occ.d4, d = t - 2;
  q.obj.visible = t > 1.72; q.obj.position.y = lerp(11, 0, ease.in(inv(1.72, 2, t)));
  if (d >= 0) { const sq = d < .3 ? 1 - .22 * Math.sin(d / .3 * Math.PI) : 1; q.obj.scale.set(PS * 1.25 * (2 - sq), PS * 1.25 * sq, PS * 1.25 * (2 - sq)); for (const p of pool) if (p.used && p !== q) { const dist = Math.hypot(p.obj.position.x - q.obj.position.x, p.obj.position.z - q.obj.position.z), k = (d - dist * .05) / .32; if (k > 0 && k < 1) p.obj.position.y = Math.sin(k * Math.PI) * .5; } }
  else q.obj.scale.setScalar(PS * 1.25);
  ring(t, 2, sqX('d4'), sqZ('d4'), 9, .8);
  if (t < 2) camKeys(t, [[0, [-6.2, 1.9, 6.4], [.2, 2.6, 1.6], 44], [2, [-2.6, 2.6, 8.6], [0, 2.9, .5], 44]]);
  else camKeys(t, [[2, [0, 7.4, 12], [0, 2.4, 0], 42], [4, [1.6, 6.2, 10.6], [0, 2.2, 0], 42]]);
  const [sx, sy] = shake(t, 2, 30, .5); draw3D(scene, camera, { dx: sx, dy: sy });
  burst(t, 2, [sqX('d4'), .1, sqZ('d4')], { n: 110, v: 6, seed: 1 });
  vignette(.5);
  caption(t, .12, 1.9, 'TU TE CROIS\nIMBATTABLE ?', { font: 'Cinzel', size: 112, y: 500, anim: 'slam', grad: ['#ffffff', C.goldL], lineH: 1.12 });
  caption(t, 2, 3.85, 'PROUVE-LE.', { font: 'Cinzel', size: 150, y: 470, anim: 'slam', grad: [C.goldL, C.gold] });
  flash(t, 2, .3, '255,236,180', .9);
}

function sBots(t) {
  const nm = inv(6.05, 6.45, t);                           // passage en « Cauchemar »
  night(t, '#07061a', nm > 0 ? mixHex('#221a55', '#5a1030', nm) : '#221a55', '#0c0a26', nm > .5 ? '#ff3b4e' : '#7a5cff');
  showOnly(GROUPS, boardG); resetFx(); robotG.visible = true; R.hand.visible = true;
  const occ = lay(START), last = play(t, occ, BOT_MOVES); fx(last, t);
  robotG.position.set(0, -.5 + Math.sin(t * 2.4) * .12, -7.6); robotG.scale.setScalar(1 + .22 * ease.back(nm));
  R.head.rotation.set(.12 + .2 * nm + Math.sin(t * 1.7) * .03, Math.sin(t * 1.3) * .12 * (1 - nm), 0);
  R.calm.visible = R.bulbA.visible = nm < .5; R.evil.visible = R.bulbB.visible = nm >= .5; R.core.material.color.set(nm < .5 ? '#5fe1ff' : '#ff3b4e'); R.aura.material.opacity = nm * (.55 + .15 * Math.sin(t * 15));
  let hx = 2.6, hy = 3.2 + Math.sin(t * 3) * .15, hz = -5.6;   // main flottante : accompagne les coups du bot
  for (const m of BOT_MOVES) { const p = pool.find(q => q.used && (q.sq === m.to || q.sq === m.from)); if (sqZ(m.from) < 0) { const k = win(t, m.start - .3, m.land + .3, .25), o = occ[m.to] && t >= m.land ? occ[m.to] : pool.find(q => q.used && q.obj.visible && q.col === 'b' && Math.abs(q.obj.position.x - lerp(sqX(m.from), sqX(m.to), ease.io(clamp((t - m.start) / m.dur)))) < .01 && q.obj.position.z < 0 && (q.type === (m.from === 'b8' ? 'N' : 'P'))); if (k > 0 && o) { hx = lerp(hx, o.obj.position.x, k); hy = lerp(hy, o.obj.position.y + (o.type === 'N' ? 2.1 : 1.75), k); hz = lerp(hz, o.obj.position.z, k); } } }
  R.hand.position.set(hx, hy, hz); R.hand.rotation.y = t * 2;
  camKeys(t, [[4, [-1.2, 8.6, 12.2], [0, 2.6, -2.2], 42], [6, [0, 7.6, 11.4], [0, 2.9, -2.6], 42], [6.5, [0, 6.4, 10.2], [0, 3.3, -3], 42], [8, [.8, 6, 9.8], [0, 3.4, -3], 42]]);
  const [sx, sy] = shake(t, 6.2, 26, .5); draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(.45); if (nm > 0) vignette(.4 * nm * (.75 + .25 * Math.sin(t * 14)), '255,20,50');
  // jauge de difficulté : 8 bots
  const lvl = 1 + Math.floor(7 * inv(4.4, 6.2, t)), a = inv(4.1, 4.4, t), gx = 150, gw = 780, gy = 300;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,7,28,.82)'; roundRect(gx - 40, gy - 78, gw + 80, 190, 34); ctx.fill(); ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 4; ctx.stroke();
  for (let i = 0; i < 8; i++) { const on = i < lvl, col = mixHex('#3df0a2', '#ff3b4e', i / 7), w = gw / 8 - 12, pop = on && i === lvl - 1 ? 1 + .25 * (1 - inv(0, .2, (t - (4.4 + i * .257)))) : 1; ctx.fillStyle = on ? col : 'rgba(255,255,255,.14)'; const hgt = 44 * pop; roundRect(gx + i * gw / 8 + 6, gy + 38 - hgt / 2 + 22, w, hgt, 12); ctx.fill(); }
  ctx.restore();
  text(lvl === 1 ? 'BOT : FACILE' : lvl === 8 ? 'BOT : CAUCHEMAR' : `BOT : NIVEAU ${lvl} / 8`, SAFE.cx, gy - 22, { size: 54, weight: 900, color: lvl === 8 ? '#ff6b7a' : '#ffffff', alpha: a, glow: lvl === 8 ? '#ff0030' : undefined });
  caption(t, 4.25, 6.05, 'AFFRONTE 8 BOTS', { bg: C.gold, color: '#1a1033', size: 88, anim: 'pop' });
  caption(t, 6.2, 7.85, 'JUSQU\'AU CAUCHEMAR', { bg: C.red, size: 84, anim: 'slam' });
  flash(t, 6.2, .3, '255,40,70', .7);
}

function sPuzzle(t) {
  night(t, '#06101f', '#123a5c', '#0a0f26', '#3df0a2'); showOnly(GROUPS, boardG); resetFx();
  const occ = lay(PUZZLE), rook = occ.e1, king = occ.g8, last = play(t, occ, PUZ_MOVES); fx(last, t, king);
  const sel = inv(8.4, 8.55, t) * (1 - inv(9.6, 9.75, t)); selGlow.visible = sel > 0; selGlow.position.set(rook.obj.position.x, .5, rook.obj.position.z); selGlow.material.opacity = sel * (.7 + .2 * Math.sin(t * 9));
  if (t < 9.6) rook.obj.position.y = .22 * inv(8.4, 8.6, t);
  dots.forEach((d, i) => { const k = ease.back(inv(8.55 + i * .1, 8.75 + i * .1, t)) * (1 - inv(9.6 + i * .04, 9.7 + i * .04, t)); d.visible = k > 0; d.position.set(sqX('e1'), .02, sqZ('e1') - 1 - i); d.scale.setScalar(Math.max(.01, k) * (i === 6 ? 1.7 : 1)); });
  if (t > 10.3) topple(king, inv(10.3, 10.9, t));
  ring(t, 10, sqX('g8'), sqZ('g8'), 5);
  camKeys(t, [[8, [0, 11.5, 7.2], [0, 0, .7], 42], [9.6, [.6, 10.6, 6.2], [.3, 0, .2], 42], [10.4, [2.6, 6.8, 4.2], [1.6, .3, -2.2], 42], [12, [3.4, 5.6, 3.2], [1.8, .4, -2.6], 42]]);
  const [sx, sy] = shake(t, 10, 16, .35); draw3D(scene, camera, { dx: sx, dy: sy });
  burst(t, 10, [sqX('e8'), .4, sqZ('e8')], { n: 80, color: '#7dffc8', seed: 2 }); vignette(.45);
  // carte « Problème du jour »
  const a = ease.back(inv(8.05, 8.4, t));
  pill('PROBLÈME DU JOUR', SAFE.cx, 290, { size: 60, weight: 900, bg: '#0d2a3f', color: '#7dffc8', border: '#3df0a2', borderW: 5, scale: a });
  tag('MAT !', [sqX('g8'), 2, sqZ('g8')], t, 10.02, 1.2, { bg: '#16a36a' });
  caption(t, 8.3, 9.95, 'MAT EN 1 COUP ?', { font: 'Cinzel', size: 104, anim: 'pop', grad: ['#ffffff', '#b8ffe2'] });
  caption(t, 10.15, 11.85, '+20 POINTS PAR JOUR', { bg: '#3df0a2', color: '#06281c', size: 80, anim: 'pop' });
  flash(t, 10, .25, '180,255,225', .6);
}

const ARR = ['RNBQKBNR', 'BBQNNRKR', 'RKNBBQNR'];              // départ classique puis deux positions 960 valides (fous de couleurs opposées, roi entre les tours)
const ARRX = ARR.map(s => [...ARR[0]].map((c, j) => { const o = [...ARR[0]].slice(0, j).filter(x => x === c).length; let n = -1; for (let i = 0; i < 8; i++) if (s[i] === c && ++n === o) return i; }));
function s960(t) {
  night(t, '#0b061c', '#3a1a5c', '#0c0a26', '#c56bff'); showOnly(GROUPS, boardG); resetFx();
  const occ = lay(START);
  const seg = t < 13.6 ? 0 : 1, t0 = seg ? 14.15 : 12.55;
  for (let j = 0; j < 8; j++) for (const r of ['1', '8']) {
    const p = occ['abcdefgh'[j] + r], k = inv(t0 + j * .025, t0 + .42 + j * .025, t), e = ease.io(k), x = lerp(ARRX[seg][j], ARRX[seg + 1][j], e);
    p.obj.position.x = x - 3.5; p.obj.position.y = Math.sin(k * Math.PI) * (1.1 + hash(j + seg * 9) * 1.3); if (k > 0 && k < 1 && p.type !== 'N') p.obj.rotation.y = e * Math.PI * 2;
    const dl = t - (t0 + .42 + j * .025); if (dl > 0 && dl < .2) { const sq = 1 - .15 * Math.sin(dl / .2 * Math.PI); p.obj.scale.set(PS * (2 - sq), PS * sq, PS * (2 - sq)); }
  }
  camKeys(t, [[12, [-4.6, 4.2, 9.6], [0, 1.9, .6], 42], [14, [0, 6.6, 11.2], [0, 2, 0], 42], [16, [4.4, 4.4, 9.4], [0, 1.9, .6], 42]]);
  const s1 = shake(t, 13.15, 12, .3), s2 = shake(t, 14.75, 12, .3); draw3D(scene, camera, { dx: s1[0] + s2[0], dy: s1[1] + s2[1] });
  for (const [tb, sd] of [[13.0, 3], [14.6, 4]]) for (const z of [3.5, -3.5]) burst(t, tb, [0, .1, z], { n: 36, color: '#e0a8ff', v: 5, life: .7, seed: sd + z });
  vignette(.45);
  caption(t, 12.15, 13.95, 'ÉCHECS 960', { font: 'Cinzel', size: 150, y: 470, anim: 'slam', grad: ['#ffffff', '#e0a8ff'] });
  caption(t, 12.5, 13.95, 'Les pièces changent de place', { bg: '#c56bff', color: '#1a0830', size: 62, anim: 'slide' });
  caption(t, 14.1, 15.85, '960 POSITIONS\nDE DÉPART', { font: 'Cinzel', size: 104, y: 480, anim: 'pop', grad: ['#ffffff', '#e0a8ff'], lineH: 1.12 });
  caption(t, 14.3, 15.85, 'Contre l\'ordi ou tes amis', { bg: '#c56bff', color: '#1a0830', size: 62, anim: 'slide' });
}

function sDuel(t) {
  const mate = t >= MATE, dm = t - MATE;
  night(t, '#07061a', mate ? '#4a1030' : '#1b2a6a', '#0c0a26', mate ? '#ff3b4e' : '#5fe1ff'); showOnly(GROUPS, boardG); resetFx();
  if (mate) rays(t, { cy: 620, color: 'rgba(255,200,90,.10)', speed: .5 });
  const occ = lay(DUEL), king = pool.find(p => p.used && p.type === 'K' && p.col === 'b'), last = play(t, occ, DUEL_MOVES); fx(last, t, king);
  if (dm > .3) topple(king, inv(.3, .9, dm));
  ring(t, MATE, sqX('h8'), sqZ('h8'), 7);
  camKeys(t, [[16, [-3.4, 8.2, 10.4], [0, 1.2, -.2], 42], [17.4, [1.4, 9.6, 8.6], [.6, .6, -1], 42], [19.6, [3.6, 7.8, 5.6], [2, .5, -2.4], 42], [20.2, [5.6, 5, 3], [2.6, .7, -3], 42],
    [21.6, [6.6, 4.2, 1.4], [2.8, .8, -3.2], 42], [22.3, [7.2, 3.3, .4], [3, 1, -3.4], 40], [24, [6.2, 3, 1.4], [3, 1.1, -3.4], 40]]);
  const sa = shake(t, 20.5, 14, .3), sb = shake(t, MATE, 34, .6); draw3D(scene, camera, { dx: sa[0] + sb[0], dy: sa[1] + sb[1] });
  burst(t, 20.5, [sqX('g8'), .6, sqZ('g8')], { n: 60, seed: 5 }); burst(t, 21, [sqX('g8'), .6, sqZ('g8')], { n: 70, color: '#d9d2ff', seed: 6 });
  burst(t, MATE, [sqX('h8'), .5, sqZ('h8')], { n: 150, color: '#ff6a5a', v: 6, life: 1.4, seed: 7 });
  vignette(.45); if (mate) vignette(.35 * (.7 + .3 * Math.sin(t * 14)) * (1 - inv(1.2, 2, dm)), '255,20,50');
  // bandeau des joueurs et chronomètres (30 minutes par joueur)
  const a = inv(16.1, 16.4, t) * (1 - inv(MATE - .3, MATE - .1, t)), wTurn = !last || sqZ(last.from) < 0 && t >= last.land || sqZ(last.from) >= 0 && t < last.land;
  if (a > 0) {
    ctx.save(); ctx.globalAlpha = a; const y = 286;
    for (const [x, name, tm, on, col] of [[SAFE.l + 6, 'TOI', clock(1466 - Math.floor((t - 16) * .6)), wTurn, C.ivory], [SAFE.cx + 44, 'RIVAL', clock(1391 - Math.floor((t - 16) * .4)), !wTurn, '#3a3166']]) {
      ctx.fillStyle = 'rgba(8,7,28,.85)'; roundRect(x, y - 62, 420, 124, 30); ctx.fill(); ctx.strokeStyle = on ? C.gold : 'rgba(255,255,255,.25)'; ctx.lineWidth = on ? 7 : 3; ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 62, y, 40, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); pawnIcon(x + 62, y, 44, col === C.ivory ? '#1a1033' : '#d9d2ff');
      text(name, x + 118, y - 4, { size: 46, weight: 900, align: 'left', color: '#fff' }); text(tm, x + 400, y - 2, { size: 50, weight: 800, align: 'right', color: on ? C.gold : '#b9b4d8' });
    }
    ctx.restore();
    text('VS', SAFE.cx + 25, 286, { font: 'Cinzel', size: 46, color: C.gold, stroke: '#000', alpha: a });
  }
  for (const m of DUEL_MOVES) if (m.check && !m.sac) tag('ÉCHEC !', [sqX(king.sq), 2.1, sqZ(king.sq)], t, m.land + .02, .46);
  tag('!!', [sqX('g8'), 2.5, sqZ('g8')], t, 20.52, .48, { bg: C.gold, color: '#1a1033', size: 84 });
  caption(t, 16.25, 19.45, 'DUELS CLASSÉS', { bg: C.cyan, color: '#06142b', size: 90, anim: 'pop' });
  caption(t, 19.65, 21.6, 'SACRIFIE TA DAME…', { font: 'Cinzel', size: 96, anim: 'rise', grad: ['#ffffff', C.goldL] });
  if (mate) {
    sparkles(t, { y: 240, h: 700, color: C.goldL, n: 30 }); confetti(t, MATE + .25, { colors: [C.gold, C.goldL, '#ffffff', C.red, '#b79bff'], cy: 700 });
    caption(t, MATE, T.tour - .12, 'ÉCHEC\nET MAT', { font: 'Cinzel', size: 190, y: 520, anim: 'slam', grad: ['#ffffff', '#ff6a7a'], lineH: 1.02, stroke: '#2a0010' });
    caption(t, MATE + .75, T.tour - .12, 'VICTOIRE ! TON RANG GRIMPE', { bg: C.gold, color: '#1a1033', size: 62, anim: 'pop' });
  }
  flash(t, MATE, .4, '255,240,220', 1);
}

// tableau à élimination directe : 8 joueurs, « TOI » = case 2
const TOI = 2, WIN1 = [1, 2, 4, 7], WIN2 = [2, 7], RT = [25, 25.7, 26.4];
function sTour(t) {
  night(t, '#0b0820', '#3a2a12', '#0c0a26', '#ffc83d'); showOnly(GROUPS, tourG); resetFx();
  const won = inv(RT[2], RT[2] + .3, t);
  champ.rotation.y = t * 1.3; champ.position.y = 1.1 + .25 * ease.back(won) + Math.sin(t * 2) * .05; champ.scale.setScalar(2.5 + .5 * ease.back(won)); champGlow.material.opacity = .35 + .5 * won + .1 * Math.sin(t * 6);
  fallen.forEach((p, i) => { const k = ease.out(inv(24.6 + i * .3, 25.1 + i * .3, t)); p.rotation.set(0, i, (i % 2 ? 1 : -1) * 1.45 * k); p.position.y = .5 * k; });
  camKeys(t, [[24, [-2.4, 3.4, 12.5], [0, 6.6, 0], 42], [26.4, [0, 3, 10.6], [0, 6.2, 0], 42], [28, [1.6, 2.8, 9.6], [0, 6, 0], 42]]);
  const [sx, sy] = shake(t, RT[2], 20, .4); draw3D(scene, camera, { dx: sx, dy: sy });
  if (won > 0) { rays(t, { cy: 1150, color: 'rgba(255,200,90,.09)', speed: .5 }); }
  burst(t, RT[2], [0, 3.5, 0], { n: 130, v: 6.5, life: 1.3, seed: 9 }); vignette(.45);
  // arbre 2D
  const X = i => 128 + i * 117.7, Y = [330, 520, 700, 880], r = 46;
  const pos = [[...Array(8)].map((_, i) => [X(i), Y[0]]), [...Array(4)].map((_, i) => [(X(2 * i) + X(2 * i + 1)) / 2, Y[1]]), [...Array(2)].map((_, i) => [(X(4 * i) + X(4 * i + 3)) / 2, Y[2]]), [[SAFE.cx, Y[3]]]];
  const who = [[0, 1, 2, 3, 4, 5, 6, 7], WIN1, WIN2, [TOI]];
  const line = (a, b, k, gold) => { if (k <= 0) return; const my = (a[1] + b[1]) / 2; ctx.strokeStyle = gold ? C.gold : 'rgba(255,255,255,.4)'; ctx.lineWidth = gold ? 9 : 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1] + r); const tot = 3, kk = k * tot; ctx.lineTo(a[0], lerp(a[1] + r, my, clamp(kk))); if (kk > 1) ctx.lineTo(lerp(a[0], b[0], clamp(kk - 1)), my); if (kk > 2) ctx.lineTo(b[0], lerp(my, b[1] - r, clamp(kk - 2))); ctx.stroke(); };
  for (let lv = 0; lv < 3; lv++) for (let i = 0; i < who[lv].length; i++) { const p = who[lv][i], ni = Math.floor(i / 2), adv = who[lv + 1][ni] === p; line(pos[lv][i], pos[lv + 1][ni], adv ? inv(RT[lv] - .35, RT[lv], t) : inv(24.5, 24.8, t) * .34, adv && p === TOI); }
  for (let lv = 0; lv < 4; lv++) for (let i = 0; i < who[lv].length; i++) {
    const p = who[lv][i], t0 = lv === 0 ? 24.15 + i * .06 : RT[lv - 1], k = ease.back(inv(t0, t0 + .25, t)); if (k <= 0) continue;
    const out = lv < 3 && who[lv + 1][Math.floor(i / 2)] !== p && t > RT[lv], me = p === TOI, [x, y] = pos[lv][i], rr = r * k * (lv === 3 ? 1.5 : 1);
    ctx.save(); ctx.globalAlpha = out ? .38 : 1; ctx.fillStyle = me ? C.gold : ['#5b6bd6', '#b85bd6', '#d65b7a', '#5bb8d6', '#6bd68a', '#d6975b', '#8a7be0', '#d65bb0'][p]; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.strokeStyle = me ? '#fff' : 'rgba(255,255,255,.7)'; ctx.lineWidth = me ? 7 : 4; ctx.stroke();
    pawnIcon(x, y, rr * 1.05, me ? '#1a1033' : '#ffffff'); ctx.restore();
    if (me && lv === 0) text('TOI', x, y - r - 34, { size: 48, weight: 900, color: C.gold, stroke: '#000', alpha: k });
  }
  if (won > 0) pill('CHAMPION : TOI !', SAFE.cx, Y[3] + 118, { size: 60, weight: 900, bg: C.gold, color: '#1a1033', border: '#fff', scale: ease.back(won) });
  caption(t, 24.2, 26.3, 'TOURNOIS À ÉLIMINATION', { bg: '#1a1033', color: C.gold, size: 70, y: 1400, anim: 'pop' });
  caption(t, 26.45, 27.88, 'GAGNE LE TABLEAU', { font: 'Cinzel', size: 100, y: 1400, anim: 'slam', grad: [C.goldL, C.gold] });
  flash(t, RT[2], .3, '255,236,180', .8);
}

function sRank(t) {
  night(t, '#07061a', '#2a1a55', '#0c0a26', '#ffc83d'); showOnly(GROUPS, rankG); resetFx();
  const reb = t >= 30, t0 = reb ? 30.25 : 28.3, per = reb ? .09 : .16, f = (t - t0) / per, i = clamp(Math.floor(f), 0, 10), k = t < t0 ? 0 : clamp(f - i);
  const a = stepPos(i - 1), b = stepPos(Math.min(i, 9)), e = i >= 10 ? 1 : ease.io(k);
  let px = 0, py = lerp(a[1], b[1], e) + (i < 10 ? Math.sin(k * Math.PI) * .7 : 0), pz = lerp(a[2], b[2], e);
  const thru = ease.io(inv(31.2, 31.95, t)); if (reb && thru > 0) { py = lerp(5, 5, thru) + Math.abs(Math.sin(thru * 9)) * .25 * (1 - thru); pz = lerp(-6.3, -9.6, thru); }
  climber.position.set(px, py, pz); const land = i < 10 && k < .3 ? 1 - .12 * Math.sin(k / .3 * Math.PI) : 1; climber.scale.set(2.3 * (2 - land), 2.3 * land, 2.3 * (2 - land));
  climbGlow.position.set(px, py + 1, pz); climbGlow.material.opacity = reb ? .55 + .15 * Math.sin(t * 12) : 0;
  const open = ease.out(inv(30, 30.5, t)); gate.doors.forEach((d, j) => d.rotation.y = (j ? 1 : -1) * 1.9 * open * -1); gate.lock.visible = !reb; gate.lock.rotation.z = Math.sin(t * 30) * .12 * win(t, 29.9, 30, .04);
  gate.light.material.opacity = open; gate.glow.material.opacity = open * (.75 + .15 * Math.sin(t * 5));
  const cp = reb ? [3.4, py + 3.4, pz + 9.4] : [3.8, py + 3, pz + 8.6], ct = [0, py + 2.9, pz - 3];
  camLook(camera, [cp[0] + Math.sin(t) * .3, cp[1], cp[2]], ct, 44); camera.updateMatrixWorld();
  const [sx, sy] = shake(t, 30, 24, .45); draw3D(scene, camera, { dx: sx, dy: sy });
  burst(t, 30, [0, 1, 5.9], { n: 110, v: 6, seed: 11 }); if (reb) speedLines(t, { alpha: .22 * (1 - thru), color: 'rgba(255,220,140,.5)', cy: H * .5 });
  vignette(.45);
  // affichage du rang
  const div = clamp(t < t0 ? 0 : i - (k < .5 && i > 0 ? 1 : 0), 0, 9), ha = inv(28.05, 28.3, t), past = reb && thru > .6;
  ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = 'rgba(8,7,28,.85)'; roundRect(SAFE.l + 40, 226, SAFE.w - 80, 150, 34); ctx.fill(); ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  text(past ? 'CATÉGORIE SUIVANTE' : 'BRONZE ' + ROMAN[div], reb ? SAFE.cx - 110 : SAFE.cx, 278, { font: 'Cinzel', size: 60, color: past ? C.goldL : '#f0b068', alpha: ha, maxW: reb ? 560 : 760 });
  bar(SAFE.l + 80, 322, SAFE.w - 160, 30, past ? 1 : clamp((t < t0 ? 0 : f) / 10), { color: past ? C.goldL : '#f0b068', borderW: 3 });
  if (reb) pill('POINTS ×2', SAFE.r - 190, 276, { size: 46, weight: 900, bg: C.gold, color: '#1a1033', scale: ease.back(inv(30.05, 30.35, t)) });
  caption(t, 28.2, 29.95, '180 RANGS À GRAVIR', { font: 'Cinzel', size: 96, y: 1380, anim: 'pop', grad: ['#ffffff', '#f0b068'] });
  caption(t, 30.03, 31.88, 'REBIRTH : POINTS ×2', { bg: C.gold, color: '#1a1033', size: 84, y: 1380, anim: 'slam' });
  flash(t, 30, .35, '255,236,180', 1);
}

function sEnd(t) {
  const lt = t - T.end; night(t, '#07061a', '#2a1c66', '#0c0a26'); showOnly(GROUPS, boardG); resetFx(); lay(START);
  const a = -.6 + lt * .12; camLook(camera, [Math.sin(a) * 11.5, 3.2 + lt * .12, Math.cos(a) * 11.5], [0, 5.4, 0], 44);
  draw3D(scene, camera);
  fade(.5 * inv(0, .5, lt), '#080620'); rays(t, { cy: 640, color: 'rgba(255,200,90,.08)', speed: .18 }); sparkles(t, { y: 230, h: 1000, color: C.goldL, n: 30 }); vignette(.55);
  pill('PC · MOBILE · MANETTE', SAFE.cx, 330, { size: 46, weight: 800, bg: 'rgba(8,7,28,.85)', color: C.goldL, border: C.gold, borderW: 4, alpha: inv(1.2, 1.6, lt), scale: ease.back(inv(1.2, 1.6, lt)) });
  endCard(t, T.end + .12, { title: 'ÉCHECS\nROYAUX', tagline: 'Grimpe les rangs. Deviens le roi.', status: 'public', font: 'Cinzel', titleGrad: ['#fff6cf', C.gold], titleStroke: '#1a0f33', accent: C.gold, accentText: '#1a1033', y: 800, search: 'Échecs Royaux' });
}

function render(t) {
  if (t < T.bots) sHook(t); else if (t < T.puzzle) sBots(t); else if (t < T.c960) sPuzzle(t); else if (t < T.duel) s960(t); else if (t < T.tour) sDuel(t); else if (t < T.rank) sTour(t); else if (t < T.end) sRank(t); else sEnd(t);
  // transitions entre plans (toujours sur un début de mesure)
  wipe(t, T.bots, { color: C.gold, color2: '#1a1033', dur: .4 }); flash(t, T.puzzle, .3, '125,255,200', .8); wipe(t, T.c960, { color: '#c56bff', color2: '#1a0830', dir: 'right', dur: .4 });
  flash(t, T.duel, .35, '95,225,255', .9); wipe(t, T.tour, { color: C.gold, color2: '#ffffff', dir: 'up', dur: .4 }); wipe(t, T.rank, { color: '#f0b068', color2: '#1a1033', dur: .4 }); flash(t, T.end, .45, '255,236,180', 1);
}

registerAd({ duration: DURATION, thumbTime: MATE + .9, render,
  music: { style: 'trap', bpm: 120, root: 45, seed: 11,
    sections: [[0, 'build'], [T.bots, 'drop'], [T.puzzle, 'break'], [T.c960, 'build'], [T.duel, 'drop2'], [T.tour, 'drop'], [T.rank, 'drop2'], [T.end, 'outro']],
    stops: [[MATE - .5, MATE]], end: T.end } });
