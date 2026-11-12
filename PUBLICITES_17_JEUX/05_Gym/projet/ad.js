// Publicité « Simulator de salle de musculation » (Gym) : 19 mesures à 128 bpm = 35,6 s.
// Tout est créé par le code (formes du moteur) : aucune ressource externe. Animation d'illustration, pas une capture du jeu.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, canvasTex, showOnly, glow, sign, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect,
  text, caption, pill, bar, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Anton', 'Inter']);
const BPM = 128, BAR = 240 / BPM, B = BAR / 4;
const T = { hook: 0, hook2: BAR, train: 2 * BAR, fuse: 4 * BAR, clients: 6 * BAR, body: 8 * BAR, aura: 10 * BAR, rebirth: 12 * BAR, multi: 14 * BAR, end: 16 * BAR };
const DURATION = 19 * BAR;                       // 35,625 s
const CLICK = T.rebirth + 2 * B;                 // instant du rebirth (moment fort)

// ---------- palette ----------
const C = { night: '#12141b', slate: '#2a2f3d', lime: '#b6ff2e', orange: '#ff6a1a', yellow: '#ffd60a', red: '#ff3b4e', cyan: '#39d5ff', violet: '#c04dff', white: '#ffffff' };
// Qualités des machines (noms du jeu) et leur couleur dans la pub
const Q = [['ROUILLÉ', '#9a5630'], ['BASIQUE', '#9aa3ad'], ['ACIER', '#5d7fa8'], ['ARGENT', '#e3e8f0'], ['OR', '#ffc21a'], ['PLATINE', '#9ff0e4'], ['DIAMANT', '#3fd0ff'], ['MYTHIQUE', '#c04dff']];
const QC = Q.map(q => new THREE.Color(q[1]));
const TANK = ['#b6ff2e', '#ff6a1a', '#39d5ff', '#ff4fa3', '#ffd60a'].map(c => new THREE.Color(c));   // une couleur par corps

// ---------- scène ----------
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(42);
addLights(scene, { sun: '#fff3e0', sunI: 2.5, sky: '#dfe8ff', ground: '#5a5560', ambI: 1.25, dir: [5, 14, 9], shadowArea: 20 });
const gym = new THREE.Group(), show = new THREE.Group(), multi = new THREE.Group(); scene.add(gym, show, multi);
const SETS = [gym, show, multi];
const qmat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .25 });
const steel = mat('#cfd6e0', { rough: .3, metal: .3 }), rubber = mat('#17181d', { rough: .9 }), padRed = mat('#d92b3a', { rough: .55 }), padDark = mat('#1d2029', { rough: .6 });

// ---------- objets emblématiques ----------
function plate(r, col, th = .2) { const g = new THREE.Group(); g.add(cyl(r, r, th, col, { rough: .5, seg: 20 }), cyl(r * .32, r * .32, th + .05, steel, { seg: 12 })); g.rotation.z = Math.PI / 2; return g; }
function barbell(len = 5, r = .7, cols = [C.orange, '#22252e']) {
  const g = new THREE.Group(); g.add(cyl(.08, .08, len, steel, { seg: 10, rot: [0, 0, Math.PI / 2] }));
  for (const s of [-1, 1]) { cols.forEach((c, i) => { const p = plate(r * (1 - i * .16), c); p.position.x = s * (len / 2 - .5 - i * .25); g.add(p); }); const e = cyl(.13, .13, .16, steel, { seg: 10, rot: [0, 0, Math.PI / 2] }); e.position.x = s * (len / 2 - .22); g.add(e); }
  return g;
}
function dumbbell(col = '#22252e', s = 1) {
  const g = new THREE.Group(); g.add(cyl(.07 * s, .07 * s, .95 * s, steel, { seg: 8, rot: [0, 0, Math.PI / 2] }));
  for (const k of [-1, 1]) { const h = cyl(.3 * s, .3 * s, .34 * s, col, { seg: 6, rough: .5, rot: [0, 0, Math.PI / 2] }); h.position.x = k * .42 * s; g.add(h); }
  return g;
}
function kettlebell(col) { const g = new THREE.Group(); const b = ball(.42, col, { rough: .45 }); b.position.y = .4; b.scale.y = .92; const h = torus(.24, .07, col, { seg: 16 }); h.position.y = .86; g.add(b, h); return g; }
function benchPress(fm) {
  const g = new THREE.Group();
  g.add(rbox(1.3, .3, 3.4, .1, padRed, { pos: [0, 1.12, .7] }), rbox(1.1, .2, .9, .08, padDark, { pos: [0, 1.3, -.7] }));
  g.add(box(.22, 1, .22, fm, { pos: [0, .5, 2.1] }), box(.22, 1, .22, fm, { pos: [0, .5, -.4] }), box(1.4, .14, .22, fm, { pos: [0, .07, 2.1] }), box(.22, .14, 3.8, fm, { pos: [0, .07, .6] }));
  for (const s of [-1, 1]) g.add(box(.24, 3.5, .24, fm, { pos: [s * 1.35, 1.75, -.9] }), box(.24, .14, .6, fm, { pos: [s * 1.35, 3.0, -.62] }), box(.24, .4, .12, fm, { pos: [s * 1.35, 3.2, -.36] }), box(.3, .14, 1.4, fm, { pos: [s * 1.35, .07, -.6] }));
  g.add(box(2.94, .2, .22, fm, { pos: [0, 2.2, -.9] }));
  const bb = barbell(5, .68); bb.position.set(0, 3.2, -.62); g.add(bb); g.bar = bb; return g;
}
function dumbbellRack(fm) {
  const g = new THREE.Group(), cols = ['#22252e', C.orange, C.cyan, C.lime];
  for (const s of [-1, 1]) g.add(box(.22, 2.5, 1.1, fm, { pos: [s * 2, 1.25, 0] }), box(.34, .14, 1.5, fm, { pos: [s * 2, .07, 0] }));
  [1.0, 2.05].forEach((y, r) => { const sh = box(4, .14, 1, fm, { pos: [0, y, 0], rot: [.18, 0, 0] }); g.add(sh); for (let i = 0; i < 4; i++) { const d = dumbbell(cols[(i + r * 2) % 4], .9 - r * .1 + i * .04); d.position.set(-1.45 + i * .97, y + .38, .08); d.rotation.y = Math.PI / 2; g.add(d); } });
  return g;
}
const beltTex = canvasTex(128, (c, n) => { c.fillStyle = '#17181d'; c.fillRect(0, 0, n, n); c.fillStyle = '#343844'; for (let i = 0; i < 4; i++) c.fillRect(0, i * 32 + 4, n, 6); }, { repeat: 1 });
beltTex.repeat.set(1, 3);
function treadmill(fm) {
  const g = new THREE.Group();
  g.add(rbox(1.8, .42, 4, .12, fm, { pos: [0, .3, 0] }));
  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.4, .08, 3.5), new THREE.MeshStandardMaterial({ map: beltTex, roughness: .9 })); belt.position.set(0, .53, .1); belt.receiveShadow = true; g.add(belt);
  for (const s of [-1, 1]) g.add(box(.16, 2.9, .16, fm, { pos: [s * .86, 1.9, -1.55], rot: [-.16, 0, 0] }), box(.12, .12, 1.7, steel, { pos: [s * .86, 2.6, -.75] }));
  g.add(rbox(2, .8, .3, .1, padDark, { pos: [0, 3.35, -1.8], rot: [-.3, 0, 0] }));
  g.add(sign(1.6, .55, (c, w, h) => { c.fillStyle = '#0b0d12'; c.fillRect(0, 0, w, h); c.fillStyle = C.lime; for (let i = 0; i < 9; i++) { const hh = h * (.25 + hash(i * 3.1) * .6); c.fillRect(8 + i * (w - 16) / 9, h - 8 - hh, (w - 16) / 9 - 5, hh); } }, { emissive: true, pos: [0, 3.36, -1.63], rot: [-.3, 0, 0] }));
  return g;
}
function latMachine(fm) {
  const g = new THREE.Group();
  g.add(box(2.4, .16, 2.6, fm, { pos: [0, .08, 0] }), box(2.4, .22, .3, fm, { pos: [0, 5.3, -.9] }), box(.26, .22, 2, fm, { pos: [0, 5.3, 0] }));
  for (const s of [-1, 1]) g.add(box(.24, 5.3, .24, fm, { pos: [s * 1.08, 2.65, -.9] }));
  for (let i = 0; i < 9; i++) g.add(box(1.3, .2, .5, i === 3 ? C.lime : '#22252e', { pos: [0, .35 + i * .24, -.9], rough: .5 }));
  g.add(cyl(.03, .03, 2.7, steel, { seg: 6, pos: [0, 3.9, -.9] }), cyl(.03, .03, 1.1, steel, { seg: 6, pos: [0, 4.7, .9] }));
  g.add(cyl(.07, .07, 2.6, steel, { seg: 8, pos: [0, 4.15, .9], rot: [0, 0, Math.PI / 2] }));
  g.add(rbox(1.1, .26, 1.1, .1, padRed, { pos: [0, 1.25, .8] }), box(.22, 1.2, .22, fm, { pos: [0, .6, .8] }));
  return g;
}

// ---------- personnage qui grossit ----------
function makeAthlete(o) {
  const ch = makeCharacter(o), p = ch.parts, skinM = mat(o.skin ?? '#f2c6a0');
  ch.tank = new THREE.MeshStandardMaterial({ color: o.shirt, roughness: .7 }); p.torso.material = ch.tank;
  for (const a of [p.armL, p.armR]) { a.children[0].material = skinM; a.userData.m = a.children.slice(); const d = ball(.62, skinM, { seg: 12, seg2: 10 }); d.position.y = -.25; a.add(d); a.userData.delt = d; }
  for (const l of [p.legL, p.legR]) l.userData.m = l.children.slice();
  ch.pecs = [-1, 1].map(s => { const b = rbox(.86, .66, .3, .12, ch.tank, { pos: [s * .47, .42, .46] }); p.torso.add(b); return b; });
  ch.abs = sign(1.1, .9, (c, w, h) => { c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = w * .04; c.lineCap = 'round'; c.beginPath(); c.moveTo(w / 2, h * .05); c.lineTo(w / 2, h * .95); for (const y of [.33, .64]) { c.moveTo(w * .14, h * y); c.lineTo(w * .86, h * y); } c.stroke(); }, { res: 128, pos: [0, -.42, .515] }); p.torso.add(ch.abs);
  ch.db = [p.armL, p.armR].map(a => { const d = dumbbell(o.dbColor ?? '#22252e', 1.15); d.position.set(0, -2.02, 0); d.visible = false; a.add(d); return d; });
  setBuff(ch, o.buff ?? 0); return ch;
}
/** k : -0,3 (tout maigre) … 0 (normal) … 1,25 (énorme). Change l'échelle du torse, des bras et des jambes. */
function setBuff(ch, k) {
  const p = ch.parts, tw = 1 + .72 * k, aw = 1 + .78 * k, lw = 1 + .32 * k, ty = 1 + .12 * k, top = 3 + ty;
  p.torso.scale.set(tw, ty, 1 + .5 * k); p.head.position.y = top; ch.k = k; ch.armY = top;
  [p.armL, p.armR].forEach((a, i) => { a.userData.m.forEach(m => m.scale.set(aw, 1, aw)); a.position.set((i ? 1 : -1) * (tw + .5 * aw), top, 0); const d = a.userData.delt; d.visible = k > .25; d.scale.setScalar(.6 + .55 * k); });
  [p.legL, p.legR].forEach((l, i) => { l.userData.m.forEach(m => m.scale.set(lw, 1, lw)); l.position.x = (i ? 1 : -1) * .5 * lw; });
  ch.pecs.forEach(b => b.visible = k > .35); ch.abs.visible = k > .55;
  ch.scale.setScalar(1 + .1 * Math.max(0, k));
}
const arms = (ch, l, r, zl = 0, zr = 0) => { ch.parts.armL.rotation.set(l, 0, zl); ch.parts.armR.rotation.set(r, 0, zr); };
/** Place une barre dans les mains (bras tendus à l'angle a). */
function holdBar(ch, bb, a, tilt = 0) {
  arms(ch, a, a); const s = ch.scale.x, ry = ch.rotation.y, dz = -Math.sin(a) * 2.0 * s;
  bb.visible = true; bb.position.set(ch.position.x + Math.sin(ry) * dz, ch.position.y + s * (ch.armY - Math.cos(a) * 2.0), ch.position.z + Math.cos(ry) * dz); bb.rotation.set(0, ry, tilt);
}
const rep = (t, per = B) => .5 - .5 * Math.cos(2 * Math.PI * t / per);

const hero = makeAthlete({ shirt: '#b6ff2e', pants: '#1d2029', hair: '#3b2a1e', face: 'happy', dbColor: C.orange }); scene.add(hero);
const weak = makeAthlete({ shirt: '#9aa3ad', pants: '#1d2029', hair: '#3b2a1e', face: 'scared', buff: -.3 }); scene.add(weak);
const bbS = barbell(4.6, .62, ['#9a5630', '#6e3d22']), bbB = barbell(7, 1.0, [C.yellow, C.red, '#22252e']); scene.add(bbS, bbB);

// ---------- décor 1 : la salle ----------
const gymQ = qmat(Q[0][1]);
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(16, 24), new THREE.MeshStandardMaterial({ roughness: .92, map: canvasTex(1024, (c, n) => {
    c.fillStyle = '#20232c'; c.fillRect(0, 0, n, n); const cw = n / 4, chh = n / 6;
    for (let r = 0; r < 6; r++) for (let q = 0; q < 4; q++) { c.fillStyle = (r + q) % 2 ? '#2f7d3c' : '#37904a'; c.fillRect(q * cw + 7, r * chh + 5, cw - 14, chh - 10); c.save(); c.translate(q * cw + cw / 2, r * chh + chh / 2); c.scale(1, 2 / 3); c.fillStyle = 'rgba(255,255,255,.34)'; c.font = '900 92px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(r * 4 + q + 1), 0, 0); c.restore(); }
  }) }));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; gym.add(fl);
  const out = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat('#181a21', { rough: 1 })); out.rotation.x = -Math.PI / 2; out.position.y = -.03; out.receiveShadow = true; gym.add(out);
  // murs
  gym.add(box(6.5, 9, .5, C.slate, { pos: [-4.75, 4.5, -12.25] }), box(6.5, 9, .5, C.slate, { pos: [4.75, 4.5, -12.25] }), box(3, 4.2, .5, C.slate, { pos: [0, 6.9, -12.25] }));
  gym.add(box(.5, 9, 24.5, '#343a4b', { pos: [-8.25, 4.5, 0] }), box(.5, 9, 24.5, '#343a4b', { pos: [8.25, 4.5, 0] }));
  gym.add(box(6.5, .5, .1, C.orange, { pos: [-4.75, 3.4, -11.97], emissive: C.orange, emissiveI: .35 }), box(6.5, .5, .1, C.orange, { pos: [4.75, 3.4, -11.97], emissive: C.orange, emissiveI: .35 }));
  gym.add(box(.1, .5, 24, C.orange, { pos: [-7.97, 3.4, 0], emissive: C.orange, emissiveI: .35 }), box(.1, .5, 24, C.orange, { pos: [7.97, 3.4, 0], emissive: C.orange, emissiveI: .35 }));
  // porte (extérieur lumineux) + enseigne
  gym.add(box(3, 4.8, .1, '#bfe6ff', { pos: [0, 2.4, -12.4], emissive: '#9fd4ff', emissiveI: .9, cast: false }), box(.3, 4.9, .7, C.orange, { pos: [-1.6, 2.45, -12.1] }), box(.3, 4.9, .7, C.orange, { pos: [1.6, 2.45, -12.1] }), box(3.5, .3, .7, C.orange, { pos: [0, 4.95, -12.1] }));
  gym.add(sign(9, 2.1, (c, w, h) => { c.fillStyle = '#12141b'; c.beginPath(); c.roundRect(0, 0, w, h, 26); c.fill(); c.strokeStyle = C.lime; c.lineWidth = 10; c.beginPath(); c.roundRect(8, 8, w - 16, h - 16, 20); c.stroke(); c.fillStyle = C.lime; c.font = `400 ${h * .6}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SALLE DE MUSCU', w / 2, h * .54); }, { res: 1024, emissive: true, pos: [0, 7.1, -11.95] }));
  // miroirs (mur gauche) et fenêtres (mur droit)
  for (let i = 0; i < 4; i++) { gym.add(box(.08, 4.4, 4.6, '#9fc4d8', { pos: [-7.96, 6.1 - 2.3 + 2.4, -8.6 + i * 5.6], rough: .15, emissive: '#6fa3c0', emissiveI: .35, cast: false })); gym.add(box(.08, 3, 3.6, '#ffe9b0', { pos: [7.96, 6.6, -8.6 + i * 5.6], emissive: '#ffd98a', emissiveI: .8, cast: false })); }
  // accueil : tourniquet + comptoir
  gym.add(rbox(3.2, 1.5, 1.2, .15, '#1d2029', { pos: [-3.3, .75, -9.3] }), box(3.3, .14, 1.3, C.lime, { pos: [-3.3, 1.55, -9.3] }));
  gym.add(sign(2.6, .8, (c, w, h) => { c.fillStyle = C.orange; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `400 ${h * .7}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ENTRÉE', w / 2, h * .55); }, { res: 256, emissive: true, pos: [-3.3, .8, -8.68] }));
  for (const s of [-1, 1]) gym.add(cyl(.16, .2, 1.5, steel, { seg: 10, pos: [s * 1.45, .75, -8.6] }), box(.9, .1, .1, C.lime, { pos: [s * 1.0, 1.25, -8.6], emissive: C.lime, emissiveI: .4 }));
  // tapis + kettlebells + plantes
  gym.add(rbox(4.6, .1, 3, .05, '#3b2f6b', { pos: [-4.6, .05, 8.6], rot: [0, 0, 0] }));
  [C.orange, C.cyan, C.lime, C.red].forEach((c, i) => { const k = kettlebell(c); k.position.set(-6.2 + i * 1.05, .1, 8.6 + (i % 2) * .5); k.scale.setScalar(.85 + i * .1); gym.add(k); });
}
// Machines de la salle : la n° 0 est la machine de départ (rouillée)
const MACH = [];
const addM = (g, x, z, ry = 0, s = 1) => { g.position.set(x, 0, z); g.rotation.y = ry; g.userData.s = s; gym.add(g); MACH.push(g); return g; };
addM(dumbbellRack(gymQ), 3.1, .6, -.35);
addM(treadmill(gymQ), -5.6, -6.2, Math.PI / 2); addM(treadmill(gymQ), -5.6, -2.9, Math.PI / 2);
addM(benchPress(gymQ), 5.0, -6.6, -.25); addM(latMachine(gymQ), 5.6, -1.6, -.5); addM(benchPress(gymQ), 5.0, 6.2, -.3); addM(dumbbellRack(gymQ), -6.9, 3.2, Math.PI / 2);
const label = sign(3.6, 1.1, (c, w, h) => { c.fillStyle = '#12141b'; c.beginPath(); c.roundRect(0, 0, w, h, 30); c.fill(); c.strokeStyle = C.orange; c.lineWidth = 10; c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 24); c.stroke(); c.fillStyle = '#fff'; c.font = `900 ${h * .3}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('GAIN PAR RÉPÉTITION', w / 2, h * .3); c.fillStyle = C.lime; c.font = `400 ${h * .44}px Anton`; c.fillText('+1 MUSCLE', w / 2, h * .7); }, { res: 512, emissive: true });
gym.add(label);
function setMachines(n, kPop = 1, q = 0) { MACH.forEach((m, i) => { m.visible = i < n; m.scale.setScalar(i === 0 ? 1 : Math.max(.001, kPop)); }); gymQ.color.copy(QC[q]); gymQ.emissive.copy(QC[q]).multiplyScalar(q >= 4 ? .16 : 0); }

// Clients PNJ
const CL = [[-5.6, -6.2, 'run'], [5.0, -4.3, 'press'], [-5.6, -2.9, 'run'], [5.5, .3, 'pull'], [-5.3, 3.2, 'curl'], [5.0, 8.4, 'press'], [-3.2, 8.2, 'curl'], [1.2, 7.6, 'cheer']];
const SHIRTS = ['#39d5ff', '#ff4fa3', '#ffd60a', '#ff6a1a', '#8b6bff', '#45f07a', '#ff3b4e', '#ffffff'], SKINS = ['#f2c6a0', '#c98a5e', '#8d5a3b', '#f6d2b4'];
const clients = CL.map((c, i) => { const ch = makeAthlete({ shirt: SHIRTS[i], skin: SKINS[i % 4], pants: i % 2 ? '#2b3350' : '#1d2029', hair: i % 3 ? '#2a1c12' : '#d8b25a', hat: i === 3 ? 'cap' : 'none', hatColor: C.orange, face: i % 2 ? 'happy' : 'smile', buff: hash(i * 4.7) * .5 - .1 }); ch.scale.multiplyScalar(.92); gym.add(ch); return ch; });
const coinsG = clients.map(() => { const c = cyl(.42, .42, .1, C.yellow, { rough: .3, emissive: '#8a6a00', emissiveI: .6, rot: [Math.PI / 2, 0, 0], cast: false }); gym.add(c); return c; });
const SPEED = 6.4, T0 = i => T.clients - 1.5 + i * .42;
function placeClient(i, t) {
  const ch = clients[i], [tx, tz, mode] = CL[i], u = (t - T0(i)) * SPEED, d1 = tz + 11.6, d2 = Math.abs(tx), py = mode === 'run' ? .55 : 0;
  ch.visible = u > 0; if (u <= 0) return;
  if (u < d1) { ch.position.set(0, 0, -11.6 + u); ch.rotation.y = 0; poseWalk(ch, u * 1.6, .75); }
  else if (u < d1 + d2) { ch.position.set(Math.sign(tx) * (u - d1), py * inv(d2 - 1.2, d2, u - d1), tz); ch.rotation.y = Math.sign(tx) * Math.PI / 2; poseWalk(ch, u * 1.6, .75); }
  else { ch.position.set(tx, py, tz); clientPose(ch, mode, t, i, tx); }
}
function clientPose(ch, mode, t, i, tx) {
  poseIdle(ch, t + i);
  if (mode === 'run') { ch.rotation.y = -Math.PI / 2; poseWalk(ch, t * 11 + i, .85); ch.position.y = .55 + Math.abs(Math.sin(t * 11 + i)) * .12; }
  else if (mode === 'press') { ch.rotation.y = -.3; const a = lerp(-1.9, -3.0, rep(t + i * .2, 2 * B)); arms(ch, a, a); ch.db.forEach(d => d.visible = true); }
  else if (mode === 'pull') { ch.rotation.y = -.5; const a = lerp(-3.0, -2.1, rep(t + i * .2, 2 * B)); arms(ch, a, a, -.25, .25); }
  else if (mode === 'curl') { ch.rotation.y = tx < -4 ? .9 : .3; arms(ch, -1.9 * rep(t + i * .3, 2 * B), -1.9 * rep(t + i * .3 + B, 2 * B)); ch.db.forEach(d => d.visible = true); }
  else { ch.rotation.y = -.2; poseCheer(ch, t + i); }
}

// ---------- décor 2 : le podium (fusion, auras) ----------
const fuseM = qmat(Q[0][1]), rustM = qmat(Q[0][1]);
const fMain = benchPress(fuseM), fA = benchPress(rustM), fB = benchPress(rustM);
const ring = torus(5.2, .16, C.lime, { emissive: C.lime, emissiveI: .9, seg: 48, rot: [Math.PI / 2, 0, 0], cast: false });
{
  const g = new THREE.Mesh(new THREE.CircleGeometry(40, 48), mat('#1a1d27', { rough: .95 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; show.add(g);
  show.add(cyl(5.2, 5.6, .4, '#262a37', { seg: 48, pos: [0, .2, 0], rough: .6 }), cyl(4.4, 4.4, .08, '#343a4b', { seg: 48, pos: [0, .43, 0] })); ring.position.y = .42; show.add(ring);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, s = box(.5, 1.2 + hash(i) * 3, .5, i % 2 ? '#2a2f3d' : '#343a4b'); s.position.set(Math.cos(a) * 11, s.geometry.parameters.height / 2, Math.sin(a) * 11 - 6); show.add(s); }
  show.add(fMain, fA, fB);
}
const burst = []; for (let i = 0; i < 14; i++) { const s = glow('#ffffff', .9, 1); show.add(s); burst.push(s); }
// Auras (objets animés autour du personnage) : flammes, cristaux, étoiles
const auraF = new THREE.Group(), auraC = new THREE.Group(), auraS = new THREE.Group(); show.add(auraF, auraC, auraS);
for (let i = 0; i < 14; i++) { const c = cone(.42, 1.5, i % 3 ? '#ff7a1a' : '#ffd60a', { seg: 7, emissive: i % 3 ? '#ff4a00' : '#ffb000', emissiveI: 1.1, cast: false, flat: true }); auraF.add(c); }
auraF.add(glow('#ff7a1a', 12, .55));
const octa = (r, col, em) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(r), mat(col, { rough: .2, emissive: em, emissiveI: .9, flat: true })); m.castShadow = false; return m; };
for (let i = 0; i < 9; i++) auraC.add(octa(.34 + hash(i) * .3, '#7fe8ff', '#1aa7e0'));
auraC.add(glow('#39d5ff', 12, .5));
const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .22 : .52; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: .16, bevelEnabled: false }); starGeo.translate(0, 0, -.08);
for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(starGeo, mat('#ffe14d', { rough: .3, emissive: '#ffb000', emissiveI: 1 })); m.castShadow = false; auraS.add(m); }
auraS.add(glow('#ffd60a', 13, .6), torus(3.3, .06, '#ffe14d', { emissive: '#ffd60a', emissiveI: 1, seg: 48, rot: [Math.PI / 2 - .35, 0, 0], cast: false }));
function animAuras(t, which, cy) {
  auraF.visible = which === 0; auraC.visible = which === 1; auraS.visible = which === 2;
  auraF.children.forEach((c, i) => { if (i > 13) { c.position.set(0, cy + 2, 0); return; } const a = i / 14 * 6.283 + t * .8, f = .7 + .5 * Math.abs(Math.sin(t * 9 + i * 2.1)); c.position.set(Math.cos(a) * 2.9, cy + .75 * f, Math.sin(a) * 2.9); c.scale.set(1, f, 1); });
  auraC.children.forEach((c, i) => { if (i > 8) { c.position.set(0, cy + 3, 0); return; } const a = i / 9 * 6.283 - t * 1.6; c.position.set(Math.cos(a) * 3.2, cy + 1.2 + (i % 3) * 1.8 + Math.sin(t * 3 + i) * .4, Math.sin(a) * 3.2); c.rotation.set(t * 2 + i, t * 3, 0); });
  auraS.children.forEach((c, i) => { if (i > 9) { c.position.set(0, cy + 3.2, 0); return; } const a = i / 10 * 6.283 + t * 2.2; c.position.set(Math.cos(a) * 3.3, cy + 3.2 + Math.sin(a) * 1.25, Math.sin(a) * 3.3); c.rotation.set(0, -a + Math.PI / 2, t * 3 + i); c.scale.setScalar(.8 + .3 * Math.sin(t * 6 + i)); });
}

// ---------- décor 3 : les 12 salles d'un serveur ----------
const PCOL = ['#b6ff2e', '#ff6a1a', '#39d5ff', '#ff4fa3', '#ffd60a', '#8b6bff', '#45f07a', '#ff3b4e', '#ffffff', '#00d1b2', '#ff9d2e', '#5d7fa8'];
const minis = [];
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat('#1a1d27', { rough: 1 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; multi.add(g);
  for (let i = 0; i < 12; i++) {
    const c = i % 3, r = Math.floor(i / 3), p = new THREE.Group(); p.position.set((c - 1) * 5.7, 0, (r - 1.5) * 5.7); multi.add(p);
    p.add(rbox(5, .3, 5, .12, '#262a37', { pos: [0, .15, 0], rot: [Math.PI / 2, 0, 0] }));
    p.children[0].rotation.x = Math.PI / 2;
    p.add(box(4.5, .06, 4.5, i % 2 ? '#2f7d3c' : '#37904a', { pos: [0, .33, 0] }), box(4.9, 1.9, .25, PCOL[i], { pos: [0, 1.25, -2.35], rough: .6 }), box(.25, 1.1, 4.9, '#343a4b', { pos: [-2.35, .85, 0] }), box(.25, 1.1, 4.9, '#343a4b', { pos: [2.35, .85, 0] }));
    const qm = mat(Q[(i * 3 + 1) % 8][1], { rough: .5, metal: .25 });
    p.add(box(.5, .16, 1.5, padRed, { pos: [-1.3, .8, -.8] }), box(.12, .5, .12, qm, { pos: [-1.3, .55, -.2] }), box(.12, 1.3, .12, qm, { pos: [-1.8, .95, -1.4] }), box(.12, 1.3, .12, qm, { pos: [-.8, .95, -1.4] }));
    const mb = barbell(2, .3, [PCOL[(i + 4) % 12]]); mb.position.set(-1.3, 1.6, -1.4); p.add(mb);
    p.add(box(.8, .2, 1.6, qm, { pos: [1.4, .45, -.9] }), box(.08, 1.2, .08, qm, { pos: [1.4, 1, -1.6] }));
    const ch = makeAthlete({ shirt: PCOL[i], skin: SKINS[i % 4], pants: '#1d2029', hair: i % 2 ? '#2a1c12' : '#d8b25a', face: 'happy', buff: -.1 + hash(i * 9.1) * 1.2 }); ch.userData.s = ch.scale.x * .5; ch.scale.setScalar(ch.userData.s); ch.position.set(.2, .36, .8); p.add(ch); minis.push(ch);
  }
}

// ---------- repères sonores ----------
cue(0, 'whoosh'); cue(.1, 'thud', .7); cue(.9, 'slide', .5); cue(T.hook2 - .5, 'riser', .7, .5); cue(T.hook2, 'boom'); cue(T.hook2 + .05, 'powerup', .8);
cue(T.hook2 + B * 1.5, 'thud', .6); cue(T.hook2 + B * 3.5, 'thud', .6);
cue(T.train - .15, 'whoosh'); cue(T.train, 'impact');
for (let i = 0; i < 7; i++) cue(T.train + (i + .5) * B, 'pop', .55);
cue(T.train + 6.5 * B, 'ding', .8);
cue(T.fuse - .15, 'swish'); cue(T.fuse + .35, 'slide', .6); cue(T.fuse + 2 * B, 'impact'); cue(T.fuse + 2 * B, 'powerup', .7);
for (let i = 0; i < 6; i++) cue(T.fuse + (3 + i * .85) * B, i === 5 ? 'chime' : 'ding', .6 + i * .07);
cue(T.clients - .15, 'whoosh'); cue(T.clients, 'bell', .7);
for (let i = 0; i < 8; i++) { const tc = T0(i) + 3.4 / SPEED; if (tc > T.clients + .1) cue(tc, 'coin', .65); }
cue(T.body - .15, 'swish'); cue(T.body, 'impact', .8);
for (let i = 0; i < 4; i++) { cue(T.body + (i * 2 + 1.5) * B, 'powerup', .7); cue(T.body + (i * 2 + 1.5) * B, 'boing', .45); }
cue(T.aura - .15, 'whoosh'); for (let i = 0; i < 7; i++) cue(T.aura + i * .13, 'tick', .6); cue(T.aura + 2 * B, 'chime'); cue(T.aura + 2 * B, 'zap', .5);
for (let i = 0; i < 7; i++) cue(T.aura + 4 * B + i * .13, 'tick', .6); cue(T.aura + 6 * B, 'win', .8); cue(T.aura + 6 * B, 'chime');
cue(T.rebirth - 1.0, 'riser', .9, 1.0); cue(T.rebirth, 'sweepdown', .7); cue(T.rebirth + B, 'heartbeat', .9); cue(CLICK - .08, 'click'); cue(CLICK, 'boom', 1.1); cue(CLICK + .05, 'win'); cue(CLICK + .3, 'crowd', .5, 2.2);
cue(CLICK + 2 * B, 'pop'); cue(CLICK + 3 * B, 'pop');
cue(T.multi - .15, 'whoosh'); cue(T.multi, 'impact', .8); for (let i = 0; i < 12; i++) cue(T.multi + .25 + i * .1, 'pop', .4);
cue(T.multi + 4 * B, 'ding', .7);
cue(T.end - .7, 'riser', .7, .7); cue(T.end, 'boom'); cue(T.end + .25, 'whoosh', .6); cue(T.end + .95, 'pop'); cue(T.end + 1.4, 'chime', .7);

// ---------- outils 2D ----------
const v3 = new THREE.Vector3();
const scr = (x, y, z) => { v3.set(x, y, z).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; };
function popup(t, at, str, x, y, o = {}) { const lt = t - at; if (lt < 0 || lt > (o.life ?? .8)) return; const k = lt / (o.life ?? .8); text(str, x, y - ease.out(k) * (o.rise ?? 130), { font: 'Anton', size: o.size ?? 84, color: o.color ?? C.lime, stroke: '#0b0d12', strokeW: 14, alpha: 1 - k * k, scale: .6 + ease.back(inv(0, .25, k)) * .5 }); }
function moneyPill(str, x, y, scale = 1) {
  const w = pill('     ' + str, x, y, { size: 56, bg: '#0b0d12', color: C.yellow, border: C.yellow, borderW: 5, scale });
  ctx.save(); ctx.translate(x - w / 2 + 58 * scale, y); ctx.scale(scale, scale); ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.arc(0, 0, 27, 0, 7); ctx.fill(); ctx.fillStyle = '#b98600'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill(); ctx.fillStyle = C.yellow; ctx.font = '900 26px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 2); ctx.restore();
}
/** Barre de muscle avec les échelons 25 / 50 / 75 / 100 %. */
function muscleBar(p, y, title, color = C.lime) {
  text(title, 110, y - 52, { size: 44, weight: 900, align: 'left', color: '#fff', stroke: '#0b0d12', strokeW: 10 });
  text(Math.round(clamp(p) * 100) + ' %', 970, y - 52, { size: 44, weight: 900, align: 'right', color, stroke: '#0b0d12', strokeW: 10 });
  bar(110, y - 22, 860, 50, p, { color, border: '#ffffff', borderW: 5 });
  for (const m of [.25, .5, .75]) { ctx.fillStyle = p >= m ? '#0b0d12' : '#ffffff'; ctx.fillRect(110 + 860 * m - 3, y - 22, 6, 50); }
}
const cap = (t, a, b, s, o = {}) => caption(t, a, b, s, { font: 'Anton', size: 96, y: 1360, ...o });

// ---------- rendu ----------
function render(t) {
  // remise à zéro de l'état des objets (aucune mémoire entre deux images)
  weak.visible = false; hero.visible = true; bbS.visible = bbB.visible = false; label.visible = false;
  hero.db.forEach(d => d.visible = false); hero.rotation.set(0, 0, 0); hero.tank.color.copy(TANK[0]);
  clients.forEach(c => { c.visible = false; c.db.forEach(d => d.visible = false); }); coinsG.forEach(c => c.visible = false);
  burst.forEach(s => s.visible = false); auraF.visible = auraC.visible = auraS.visible = false; fMain.visible = fA.visible = fB.visible = false;
  let sx = 0, sy = 0, sc = 1;

  if (t < T.hook2) {                                             // ACCROCHE 1 : tout maigre, la barre tremble
    showOnly(SETS, gym); bg(['#1b1f2b', '#0e1016']); setMachines(1, 1, 0); hero.visible = false; weak.visible = true;
    MACH[0].visible = false;
    weak.position.set(0, 0, 2); poseIdle(weak, t); weak.parts.legL.rotation.z = -.08; weak.parts.legR.rotation.z = .08;
    const a = -2.25 - .35 * Math.abs(Math.sin(t * 3.2)) + Math.sin(t * 37) * .04; weak.rotation.z = Math.sin(t * 21) * .025;
    holdBar(weak, bbS, a, Math.sin(t * 5.3) * .16 + Math.sin(t * 31) * .03);
    camLook(camera, [lerp(3.5, 1.5, prog(t, 0, T.hook2)), 3.4, lerp(26, 22.5, prog(t, 0, T.hook2))], [0, 4.1, 2], 42);
  } else if (t < T.train) {                                      // ACCROCHE 2 : énorme, salle en or
    showOnly(SETS, gym); bg(['#3a2a10', '#12141b']); setMachines(7, 1, 4); const lt = t - T.hook2;
    setBuff(hero, 1.2); hero.tank.color.copy(TANK[4]); hero.position.set(0, 0, 2); poseIdle(hero, t);
    holdBar(hero, bbB, lerp(-2.15, -3.05, rep(lt + B * .5, 2 * B)), 0);
    CL.forEach((c, i) => { if (i === 0 || i === 2 || i === 4) { clients[i].visible = true; clients[i].position.set(c[0], c[2] === 'run' ? .55 : 0, c[1]); clientPose(clients[i], c[2], t, i, c[0]); } });
    camLook(camera, [lerp(-3, -1, prog(t, T.hook2, T.train)), 2.2, lerp(27, 24.5, prog(t, T.hook2, T.train))], [0, 4.9, 2], 42);
    [sx, sy] = shake(t, T.hook2, 26);
  } else if (t < T.fuse) {                                       // PLAN 1 : s'entraîner
    showOnly(SETS, gym); bg(['#1b1f2b', '#0e1016']); setMachines(1, 1, 0); const lt = t - T.train;
    setBuff(hero, lerp(-.12, .12, inv(0, 3.6, lt))); hero.position.set(-1.1, 0, 3); hero.rotation.y = .12; poseIdle(hero, t);
    hero.db.forEach(d => d.visible = true); arms(hero, -2.0 * rep(lt, 2 * B), -2.0 * rep(lt + B, 2 * B), -.08, .08);
    label.visible = true; label.position.set(3.1, 4.6 + Math.sin(t * 3) * .08, .6); label.rotation.y = -.25;
    camLook(camera, [lerp(3.2, 1.4, prog(t, T.train, T.fuse, ease.io)), 4.2, lerp(21.5, 19.5, prog(t, T.train, T.fuse, ease.io))], [.9, 2.9, 2.6], 42);
    [sx, sy] = shake(t, T.train, 14);
  } else if (t < T.clients) {                                    // PLAN 2 : fusion puis qualités
    showOnly(SETS, show); const lt = t - T.fuse, tf = 2 * B, step = clamp(Math.floor((lt - tf) / (.85 * B)) , -1, 5), qi = lt < tf ? 0 : Math.min(7, 2 + step);
    const tq = lt < tf ? 0 : (step < 0 ? tf : tf + (step + 1) * .85 * B) + (step < 0 ? 0 : .15 * B);   // instant du dernier changement
    const tLast = lt < tf ? -9 : (step < 0 ? tf : tf + B + step * .85 * B);
    bg([[0, '#0e1016'], [.55, mixHex2(Q[lt < tf ? 0 : (step < 0 ? 1 : qi)][1], '#0e1016', .62)], [1, '#0e1016']]);
    hero.visible = false; ring.material.emissive.copy(QC[lt < tf ? 0 : (step < 0 ? 1 : qi)]); ring.material.color.copy(ring.material.emissive);
    if (lt < tf) { const k = ease.in(inv(.25, tf, lt)); fA.visible = fB.visible = true; for (const [m, s] of [[fA, -1], [fB, 1]]) { m.scale.setScalar(.62); m.position.set(s * lerp(2.75, .3, k), .45 + Math.sin(inv(0, .3, lt) * Math.PI) * .5, 0); m.rotation.y = s * lerp(-.5, .2, k); } }
    else { const cur = step < 0 ? 1 : qi; fuseM.color.copy(QC[cur]); fuseM.emissive.copy(QC[cur]).multiplyScalar(cur >= 4 ? .2 : .03); fMain.visible = true; const p = inv(0, .32, lt - tLast); fMain.scale.setScalar(.9 * (1 + .22 * Math.sin(p * Math.PI))); fMain.position.set(0, .45 + .7 * Math.sin(p * Math.PI), 0); fMain.rotation.y = -.5 + (lt - tf) * .42;
      burst.forEach((s, i) => { const k = inv(0, .5, lt - tLast); s.visible = k < 1; const a = i / 14 * 6.283 + cur; s.position.set(Math.cos(a) * (1 + 5 * ease.out(k)), 2.4 + Math.sin(a * 3 + i) * 1.6 * k + 2 * ease.out(k) * hash(i), Math.sin(a) * (1 + 4 * ease.out(k))); s.material.color.copy(QC[cur]); s.material.opacity = 1 - k; s.scale.setScalar(1.3 - k * .6); }); }
    camLook(camera, [Math.sin(.25 + lt * .1) * 21, 7.5, Math.cos(.25 + lt * .1) * 21], [0, 3.0, 0], 42);
    for (let i = -1; i < 6; i++) { const s = shake(t, T.fuse + tf + (i < 0 ? 0 : B + i * .85 * B), i < 0 ? 22 : 9, .3); sx += s[0]; sy += s[1]; }
  } else if (t < T.body) {                                       // PLAN 3 : les clients arrivent et paient
    showOnly(SETS, gym); bg(['#1b1f2b', '#0e1016']); setMachines(7, 1, 2); const lt = t - T.clients;
    setBuff(hero, .3); hero.position.set(.6, 0, 3.6); hero.rotation.y = .2; poseIdle(hero, t); hero.db.forEach(d => d.visible = true); arms(hero, -2.0 * rep(lt, 2 * B), -2.0 * rep(lt + B, 2 * B));
    clients.forEach((c, i) => { placeClient(i, t); const u = t - (T0(i) + 3.4 / SPEED), cg = coinsG[i]; cg.visible = u > 0 && u < .7; if (cg.visible) { cg.position.set(-.2, 3.2 + ease.out(u / .7) * 3.6, -8.2); cg.rotation.y = u * 14; cg.scale.setScalar(1.5 * (1 - u / .7 * .4)); } });
    camLook(camera, [lerp(-2.5, 2, prog(t, T.clients, T.body, ease.io)), lerp(21, 23.5, prog(t, T.clients, T.body, ease.io)), 20.5], [0, 0, -2.3], 42);
  } else if (t < T.aura) {                                       // PLAN 4 : nouveaux corps
    showOnly(SETS, gym); bg(['#1b1f2b', '#0e1016']); setMachines(7, 1, 4); const lt = t - T.body;
    const n = clamp(Math.floor((lt - 1.5 * B) / (2 * B)) + 1, 0, 4), tn = 1.5 * B + (n - 1) * 2 * B, pk = n ? ease.elastic(inv(0, .55, lt - tn)) : 1;
    setBuff(hero, lerp(Math.max(0, (n - 1) * .3), n * .3, pk)); hero.tank.color.copy(TANK[n]); hero.position.set(0, 0, 2.5); poseIdle(hero, t);
    const flex = n ? win(lt, tn, tn + .8, .15) : 0; hero.db.forEach(d => d.visible = flex < .5);
    arms(hero, lerp(-2.0 * rep(lt, B), 0, flex), lerp(-2.0 * rep(lt + B / 2, B), 0, flex), -2.2 * flex, 2.2 * flex);
    hero.position.y = n ? Math.sin(inv(0, .35, lt - tn) * Math.PI) * .7 : 0;
    CL.forEach((c, i) => { if (i < 6) { clients[i].visible = true; clients[i].position.set(c[0], c[2] === 'run' ? .55 : 0, c[1]); clientPose(clients[i], c[2], t, i, c[0]); } });
    camLook(camera, [lerp(2.5, -2, prog(t, T.body, T.aura, ease.io)), 3.0, lerp(22, 24.5, prog(t, T.body, T.aura, ease.io))], [0, 3.9, 2.5], 42);
    for (let i = 0; i < 4; i++) { const s = shake(t, T.body + 1.5 * B + i * 2 * B, 14, .3); sx += s[0]; sy += s[1]; }
  } else if (t < T.rebirth) {                                    // PLAN 5 : roll d'auras
    showOnly(SETS, show); const lt = t - T.aura, r2 = lt >= 4 * B, rolling = (lt % (4 * B)) < 2 * B;
    const which = rolling ? Math.floor(lt / .13) % 3 : (r2 ? 2 : 1);
    bg([[0, '#0e1016'], [.5, rolling ? '#2a1b4d' : (which === 2 ? '#5a4300' : '#0d3a52')], [1, '#0e1016']]);
    ring.material.emissive.set(which === 0 ? '#ff7a1a' : which === 1 ? '#39d5ff' : '#ffd60a'); ring.material.color.copy(ring.material.emissive);
    setBuff(hero, 1.05); hero.tank.color.copy(TANK[3]); hero.position.set(0, .45, 0); hero.rotation.y = rolling ? lt * 6 : Math.sin(lt * 2) * .35; poseIdle(hero, t);
    if (!rolling) { const f = .5 + .5 * ease.back(inv(0, .3, (lt % (4 * B)) - 2 * B)); arms(hero, 0, 0, -2.3 * f, 2.3 * f); }
    animAuras(t, which, .45);
    camLook(camera, [Math.sin(-.3 + lt * .12) * 24, 6.5, Math.cos(-.3 + lt * .12) * 24], [0, 3.5, 0], 42);
    for (const k of [2, 6]) { const s = shake(t, T.aura + k * B, 16, .3); sx += s[0]; sy += s[1]; }
  } else if (t < T.multi) {                                      // PLAN 6 : REBIRTH (moment fort)
    showOnly(SETS, gym); const lt = t - T.rebirth, after = t >= CLICK, k = after ? 1 - ease.in(inv(0, .3, t - CLICK)) : 1;
    bg(after ? ['#5a2a00', '#12141b'] : ['#1b1f2b', '#0e1016']); setMachines(after && k <= 0 ? 1 : 7, k, after && k <= 0 ? 0 : 7);
    if (after) MACH[0].scale.setScalar(k > 0 ? 1 : ease.back(inv(.3, .7, t - CLICK)));
    setBuff(hero, 1.1); hero.tank.color.copy(TANK[3]); hero.position.set(0, after ? Math.abs(Math.sin((t - CLICK) * 6.7)) * 1.1 * (1 - inv(1.6, 2.4, t - CLICK)) : 0, 2.5);
    if (after) poseCheer(hero, t); else { poseIdle(hero, t); arms(hero, -1.2, -1.2, -.2, .2); }
    if (!after) CL.forEach((c, i) => { if (i < 6) { clients[i].visible = true; clients[i].position.set(c[0], c[2] === 'run' ? .55 : 0, c[1]); clientPose(clients[i], c[2], t, i, c[0]); } });
    const back = after ? ease.out(inv(0, .5, t - CLICK)) : 0;
    camLook(camera, [lerp(-2, 2.5, prog(t, T.rebirth, T.multi, ease.io)), lerp(4.5, 5.5, back), lerp(23, 28, back) - (after ? 0 : lt * 1.5)], [0, lerp(3.4, 4.3, back), 1.5], 42);
    [sx, sy] = shake(t, CLICK, 40, .7);
  } else if (t < T.end) {                                        // PLAN 7 : 12 joueurs, chacun sa salle
    showOnly(SETS, multi); bg(['#101a2e', '#0e1016']); hero.visible = false; const lt = t - T.multi;
    minis.forEach((m, i) => { const k = ease.back(inv(.2 + i * .1, .5 + i * .1, lt)); m.scale.setScalar(Math.max(.001, m.userData.s * k)); poseIdle(m, t + i); m.rotation.y = Math.sin(t * 1.3 + i) * .5;
      if (i % 3 === 0) poseCheer(m, t + i); else { m.db.forEach(d => d.visible = true); arms(m, -2.0 * rep(lt + i * .1, 2 * B), -2.0 * rep(lt + i * .1 + B, 2 * B)); }
      m.position.y = .36 + (i % 3 === 0 ? Math.abs(Math.sin(t * 6.7 + i)) * .5 : 0); });
    camLook(camera, [lerp(-7, 7, prog(t, T.multi, T.end, ease.io)), lerp(27, 31, prog(t, T.multi, T.end)), 27], [0, 0, -.6], 42);
  } else {                                                       // ÉCRAN FINAL
    showOnly(SETS, gym); bg(['#3a2a10', '#12141b']); setMachines(7, 1, 4); const lt = t - T.end;
    setBuff(hero, 1.2); hero.tank.color.copy(TANK[0]); hero.position.set(0, Math.abs(Math.sin(lt * 6.7)) * .5, 2.5); poseCheer(hero, t);
    CL.forEach((c, i) => { if (i < 6) { clients[i].visible = true; clients[i].position.set(c[0], c[2] === 'run' ? .55 : 0, c[1]); clientPose(clients[i], c[2], t, i, c[0]); } });
    camLook(camera, [Math.sin(lt * .12 - .3) * 9, 3.2, 21 - lt * .4], [0, 11.5, 0], 42);
    [sx, sy] = shake(t, T.end, 18);
  }
  camera.updateMatrixWorld();
  draw3D(scene, camera, { dx: sx, dy: sy, scale: sc });
  vignette(.42);

  // ================= couche 2D =================
  if (t < T.hook2) {
    speedLines(t, { alpha: .14, cy: 820, inner: 640 });
    for (let i = 0; i < 3; i++) { const u = (t * 1.3 + i * .37) % 1, [x, y] = scr(i ? 1.4 : -1.5, 4.9 + i * .3, 2); ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI); ctx.fillStyle = '#8fd6ff'; ctx.beginPath(); ctx.ellipse(x + (i - 1) * 40, y + u * 90, 11, 17, 0, 0, 7); ctx.fill(); ctx.restore(); }   // gouttes de sueur
    caption(t, .08, T.hook2 - .08, 'MAIGRE AUJOURD\'HUI…', { font: 'Anton', size: 118, y: 330, anim: 'slam', color: '#ffffff' });
    cap(t, .5, T.hook2 - .08, 'Trop lourd ?', { font: 'Inter', size: 72, anim: 'rise', y: 1340 });
  } else if (t < T.train) {
    rays(t, { cy: 800, color: 'rgba(255,214,10,.07)' }); speedLines(t, { alpha: .3 * (1 - inv(T.hook2, T.hook2 + 1, t)), cy: 800 });
    caption(t, T.hook2, T.train - .1, 'ÉNORME DEMAIN ?', { font: 'Anton', size: 140, y: 330, anim: 'slam', grad: ['#fff27a', '#ff9d2e'] });
    cap(t, T.hook2 + .35, T.train - .1, 'TA SALLE. TES MUSCLES.', { bg: C.orange, size: 80, anim: 'pop' });
  } else if (t < T.fuse) {
    const lt = t - T.train, reps = clamp(Math.floor(lt / B + .5), 0, 7);
    muscleBar(.04 + reps * .037 + inv(0, 3.75, lt) * .02, 330, 'MUSCLE');
    for (let i = 0; i < 7; i++) { const [x, y] = scr(i % 2 ? .4 : -2.6, 5.6, 3); popup(t, T.train + (i + .5) * B, '+1', x, y - 40); }
    if (reps >= 7) popup(t, T.train + 6.5 * B, '25 % : BONUS DE REVENUS !', 540, 520, { size: 64, color: C.yellow, life: 1.2, rise: 50 });
    const press = 1 - .08 * Math.sin(clamp((lt / B + .5) % 1 / .3) * Math.PI);
    pill('S\'ENTRAÎNER', 540, 1175, { size: 58, bg: C.lime, color: '#0b0d12', font: 'Inter', weight: 900, border: '#0b0d12', borderW: 6, scale: press * ease.back(inv(.15, .5, lt)), alpha: 1 - inv(3.5, 3.7, lt) });
    cap(t, T.train + .25, T.fuse - .12, 'ENTRAÎNE-TOI', { size: 120, anim: 'slam', color: '#ffffff' });
  } else if (t < T.clients) {
    const lt = t - T.fuse, tf = 2 * B, step = clamp(Math.floor((lt - tf) / (.85 * B)), -1, 5), cur = lt < tf ? 0 : (step < 0 ? 1 : Math.min(7, 2 + step)), tLast = lt < tf ? 0 : (step < 0 ? tf : tf + B + step * .85 * B);
    rays(t, { cy: 780, color: rgbaQ(cur, .08), n: 14 });
    const p = ease.back(inv(0, .22, lt - tLast));
    pill(Q[cur][0], 540, 330, { font: 'Anton', size: 110, bg: Q[cur][1], color: cur === 3 || cur === 5 || cur === 4 || cur === 1 || cur === 6 ? '#0b0d12' : '#ffffff', border: '#ffffff', borderW: 8, scale: lt < tf ? 1 : .7 + .3 * p, radius: 30 });
    if (lt < tf) { text('+', 540, 800, { font: 'Anton', size: 150, color: '#fff', stroke: '#0b0d12', alpha: 1 - inv(tf - .3, tf - .1, lt), scale: 1 + .15 * Math.sin(t * 12) }); }
    else for (let i = 0; i < 3; i++) { const u = ((lt - tLast) * 2.2 + i * .33) % 1; ctx.save(); ctx.globalAlpha = Math.sin(u * Math.PI) * .9; ctx.fillStyle = Q[cur][1]; ctx.translate(170 + i * 370, 1050 - u * 330); ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(42, 14); ctx.lineTo(16, 14); ctx.lineTo(16, 48); ctx.lineTo(-16, 48); ctx.lineTo(-16, 14); ctx.lineTo(-42, 14); ctx.closePath(); ctx.fill(); ctx.restore(); }
    cap(t, T.fuse + .12, T.fuse + tf + .1, 'FUSIONNE…', { size: 120, anim: 'pop' });
    cap(t, T.fuse + tf + .12, T.clients - .12, '…ET AMÉLIORE !', { size: 120, anim: 'slam', color: '#ffffff' });
    pill('30 QUALITÉS DE MACHINES', 540, 1500, { size: 46, bg: '#0b0d12', color: C.lime, border: C.lime, borderW: 4, alpha: inv(tf + .5, tf + .8, lt), weight: 900 });
    flash(t, T.fuse + tf, .3, '255,255,255', .9);
  } else if (t < T.body) {
    const lt = t - T.clients; let nb = 0; for (let i = 0; i < 8; i++) if (t > T0(i) + 3.4 / SPEED) nb++;
    moneyPill(count(t, T.clients, T.body, 1250, 1250 + 0) === '' ? '' : (1250 + nb * 150 + Math.floor(lt * 40)).toLocaleString('fr-FR').replace(/[  ]/g, ' '), 300, 300);
    pill('CLIENTS  ' + nb, 790, 300, { size: 56, bg: '#0b0d12', color: C.cyan, border: C.cyan, borderW: 5 });
    for (let i = 0; i < 8; i++) { const tc = T0(i) + 3.4 / SPEED, [x, y] = scr(-.2, 4.5, -8.2); if (tc > T.clients) popup(t, tc, '+150', x + 120, y, { color: C.yellow, size: 70 }); }
    cap(t, T.clients + .2, T.clients + 1.95, 'ATTIRE DES CLIENTS', { bg: C.orange, size: 96 });
    cap(t, T.clients + 2.05, T.body - .12, 'TU FIXES LE PRIX\nD\'ENTRÉE', { size: 96, anim: 'slam', color: '#ffffff', y: 1340 });
  } else if (t < T.aura) {
    const lt = t - T.body, n = clamp(Math.floor((lt - 1.5 * B) / (2 * B)) + 1, 0, 4), tn = 1.5 * B + (n - 1) * 2 * B, next = 1.5 * B + n * 2 * B;
    const fill = n >= 4 ? inv(tn, tn + 1.5, lt) * .6 : inv(n ? tn + .1 : -.4, next, lt);
    rays(t, { cy: 820, color: 'rgba(255,255,255,.045)' });
    muscleBar(fill, 420, 'TOUS LES MUSCLES', '#' + TANK[n].getHexString());
    pill('CORPS ' + (n + 1), 540, 275, { font: 'Anton', size: 84, bg: '#' + TANK[n].getHexString(), color: '#0b0d12', border: '#ffffff', borderW: 7, scale: n ? .75 + .25 * ease.back(inv(0, .25, lt - tn)) : 1, radius: 26 });
    for (let i = 1; i <= 4; i++) { const at = T.body + 1.5 * B + (i - 1) * 2 * B; flash(t, at, .22, '255,255,255', .55); popup(t, at, 'NOUVEAU CORPS !', 540, 640, { size: 92, color: '#ffffff', life: .75, rise: 60 }); }
    cap(t, T.body + .2, T.body + 1.9, 'REMPLIS TES MUSCLES', { bg: C.lime, color: '#0b0d12', size: 88 });
    cap(t, T.body + 2.0, T.aura - .12, 'DEVIENS ÉNORME', { size: 130, anim: 'slam', grad: ['#fff27a', '#ff9d2e'] });
  } else if (t < T.rebirth) {
    const lt = t - T.aura, ph = lt % (4 * B), rolling = ph < 2 * B, r2 = lt >= 4 * B;
    rays(t, { cy: 800, color: rolling ? 'rgba(192,77,255,.09)' : (r2 ? 'rgba(255,214,10,.12)' : 'rgba(57,213,255,.1)'), speed: rolling ? 1.6 : .3 });
    sparkles(t, { y: 430, h: 760, color: r2 && !rolling ? '#ffe14d' : '#bfe9ff', n: 22 });
    if (rolling) pill('ROLL' + '.'.repeat(1 + Math.floor(ph / .13) % 3), 540, 320, { font: 'Anton', size: 100, bg: C.violet, color: '#ffffff', border: '#ffffff', borderW: 8, radius: 30, scale: 1 + .05 * Math.sin(t * 40) });
    else pill(r2 ? 'AURA RARE !' : 'NOUVELLE AURA !', 540, 320, { font: 'Anton', size: 100, bg: r2 ? C.yellow : C.cyan, color: '#0b0d12', border: '#ffffff', borderW: 8, radius: 30, scale: .7 + .3 * ease.back(inv(0, .25, ph - 2 * B)) });
    flash(t, T.aura + 2 * B, .3, '255,255,255', .85); flash(t, T.aura + 6 * B, .35, '255,240,170', 1);
    if (r2 && !rolling) confetti(t, T.aura + 6 * B, { n: 60, cy: 760, life: 1.6, colors: ['#ffd60a', '#ffffff', '#ff9d2e'] });
    cap(t, T.aura + .15, T.aura + 4 * B - .05, 'TENTE TON ROLL', { size: 120, anim: 'pop', color: '#ffffff' });
    cap(t, T.aura + 4 * B + .05, T.rebirth - .12, '12 AURAS À COLLECTIONNER', { bg: C.violet, size: 76, anim: 'slide' });
  } else if (t < T.multi) {
    const lt = t - T.rebirth, after = t >= CLICK;
    if (!after) {
      letterbox(inv(0, .3, lt), 190);
      moneyPill('999.9T', 540, 330, 1.15);
      const pr = 1 + .06 * Math.sin(t * 16) - .14 * inv(CLICK - .12, CLICK, t);
      pill('REBIRTH', 540, 1250, { font: 'Anton', size: 130, grad: ['#ff9d2e', '#ff3b4e'], color: '#ffffff', border: '#ffffff', borderW: 10, radius: 36, scale: pr * ease.back(inv(.05, .4, lt)), pad: 90 });
      text('Prêt ?', 540, 1440, { size: 64, weight: 800, color: '#fff', stroke: '#0b0d12', strokeW: 12, alpha: inv(.3, .5, lt) });
    } else {
      const la = t - CLICK; rays(t, { cy: 820, color: 'rgba(255,157,46,.14)', speed: .9 }); speedLines(t, { alpha: .55 * (1 - inv(.2, 1.6, la)), cy: 820 });
      confetti(t, CLICK, { cy: 820, n: 130, colors: [C.lime, C.orange, C.yellow, '#ffffff', C.cyan] });
      caption(t, CLICK, T.multi - .12, 'REBIRTH !', { font: 'Anton', size: 230, y: 380, anim: 'slam', grad: ['#fff27a', '#ff6a1a'], strokeW: 30 });
      pill('ARGENT  ▲', 300, 1130, { size: 60, bg: '#0b0d12', color: C.yellow, border: C.yellow, borderW: 5, weight: 900, scale: ease.back(inv(2 * B, 2 * B + .3, la)) });
      pill('MUSCLE  ▲', 780, 1130, { size: 60, bg: '#0b0d12', color: C.lime, border: C.lime, borderW: 5, weight: 900, scale: ease.back(inv(3 * B, 3 * B + .3, la)) });
      cap(t, CLICK + .5, T.multi - .12, 'BONUS PERMANENT', { bg: C.orange, size: 100, anim: 'pop', y: 1340 });
      pill('Tu gardes tes muscles', 540, 1500, { size: 46, bg: '#0b0d12', color: '#ffffff', border: '#ffffff', borderW: 4, alpha: inv(1.3, 1.6, la) * (1 - inv(T.multi - .3, T.multi - .12, t)) });
    }
    flash(t, CLICK, .55, '255,255,255', 1);
  } else if (t < T.end) {
    const lt = t - T.multi;
    caption(t, T.multi + .15, T.end - .12, '12 JOUEURS\nPAR SERVEUR', { font: 'Anton', size: 130, y: 380, anim: 'slam', color: '#ffffff' });
    cap(t, T.multi + .5, T.multi + 4 * B - .05, 'CHACUN SA SALLE', { bg: C.lime, color: '#0b0d12', size: 100 });
    cap(t, T.multi + 4 * B + .05, T.end - .12, 'JOUABLE À LA MANETTE', { bg: C.cyan, color: '#0b0d12', size: 84, anim: 'slide' });
  } else {
    const lt = t - T.end;
    fade(.5 * inv(0, .4, lt), '#0b0d12'); rays(t, { cy: 700, color: 'rgba(182,255,46,.08)', n: 18 }); sparkles(t, { y: 240, h: 1250, color: '#eaffb0', n: 24 });
    endCard(t, T.end + .15, { title: 'SIMULATOR DE SALLE\nDE MUSCULATION', search: 'Simulator de salle de musculation', tagline: 'Entraîne-toi. Gère ta salle. Deviens énorme.', status: 'public', font: 'Anton', titleGrad: ['#eaff8a', '#b6ff2e'], accent: C.orange, y: 800 });
  }

  // transitions
  flash(t, T.hook2, .4, '255,236,170', 1);
  flash(t, T.train, .3);
  wipe(t, T.fuse, { color: C.orange, color2: C.lime, dur: .42 });
  wipe(t, T.clients, { color: C.lime, color2: '#0b0d12', dir: 'right', dur: .42 });
  wipe(t, T.body, { color: C.orange, color2: C.yellow, dir: 'up', dur: .42 });
  wipe(t, T.aura, { color: C.violet, color2: C.cyan, dur: .42 });
  fade(inv(T.rebirth - .12, T.rebirth, t) * (1 - inv(T.rebirth, T.rebirth + .18, t)), '#0b0d12');
  wipe(t, T.multi, { color: C.cyan, color2: C.lime, dir: 'down', dur: .42 });
  flash(t, T.end, .45, '255,255,255', 1);
}
function mixHex2(a, b, k) { const A = parseInt(a.slice(1), 16), Bc = parseInt(b.slice(1), 16), f = s => Math.round(lerp((A >> s) & 255, (Bc >> s) & 255, k)); return `rgb(${f(16)},${f(8)},${f(0)})`; }
function rgbaQ(i, a) { const n = parseInt(Q[i][1].slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function letterbox(k, h) { if (k <= 0) return; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h * k); ctx.fillRect(0, H - h * k, W, h * k); }

registerAd({ duration: DURATION, thumbTime: CLICK + 1.2, render,
  music: { style: 'workout', bpm: BPM, seed: 5, sections: [[0, 'build'], [T.hook2, 'drop'], [T.aura, 'break'], [T.rebirth, 'drop2'], [T.end, 'drop']], stops: [[T.rebirth, CLICK]], end: T.end + BAR } });
