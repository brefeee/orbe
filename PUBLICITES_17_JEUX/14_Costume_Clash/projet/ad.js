// Publicité « Costume Clash » (statut : bientôt sur Roblox). Animation d'illustration, tout est créé par ce code.
// Boucle montrée (cahier des charges) : thème annoncé -> 3 minutes de création -> défilé -> votes -> résultats et récompenses.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, ground, showOnly, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, confetti, sparkles, roundRect,
  text, caption, pill, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Pacifico', 'Lilita', 'Inter']);
const BAR = 240 / 120;                                   // 2 s par mesure (disco, 120 bpm)
const T = { hook: 0, theme: 4, atelier: 8, color: 11, runway: 14, poses: 17, votes: 20, win: 24, reward: 27, end: 30 }, DURATION = 18 * BAR;   // 36 s

// ---------- palette ----------
const C = { pink: '#ff3d9a', violet: '#7b2ff7', night: '#1a0b3a', gold: '#ffc93c', turq: '#24e0d0', peach: '#ffd9c2', green: '#45f07a', orange: '#ff6b35', white: '#ffffff' };
const GOLD = mat('#ffc93c', { rough: .3, emissive: '#b06a00', emissiveI: .45 });
const DARK = mat('#1c1c26', { rough: .6 });

// ---------- pictogrammes 2D (sert pour les textures 3D et pour les affichages) ----------
function picto(c, kind, x, y, s, color = '#fff', color2 = '#ffc93c') {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = color; c.beginPath();
  const poly = pts => { pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .45 : 1; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }
  else if (kind === 'heart') { c.moveTo(0, .9); c.bezierCurveTo(-1.5, -.1, -.75, -1.15, 0, -.38); c.bezierCurveTo(.75, -1.15, 1.5, -.1, 0, .9); }
  else if (kind === 'note') { c.ellipse(-.28, .58, .4, .3, -.3, 0, 7); c.rect(-.02, -.85, .16, 1.45); c.rect(-.02, -.85, .7, .32); }
  else if (kind === 'bolt') poly([[.2, -1], [-.6, .15], [-.05, .15], [-.3, 1], [.6, -.25], [.05, -.25]]);
  else if (kind === 'flower') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.moveTo(Math.cos(a) * .55 + .4, Math.sin(a) * .55); c.arc(Math.cos(a) * .55, Math.sin(a) * .55, .4, 0, 7); } }
  else if (kind === 'crown') poly([[-.9, .6], [-.9, -.5], [-.45, 0], [0, -.8], [.45, 0], [.9, -.5], [.9, .6]]);
  else if (kind === 'hat') { c.rect(-.5, -.8, 1, 1.12); c.rect(-.95, .3, 1.9, .3); }
  else if (kind === 'shirt') poly([[-.45, -.8], [.45, -.8], [1, -.35], [.72, .05], [.48, -.15], [.48, .85], [-.48, .85], [-.48, -.15], [-.72, .05], [-1, -.35]]);
  else if (kind === 'pants') poly([[-.6, -.85], [.6, -.85], [.7, .85], [.15, .85], [0, -.1], [-.15, .85], [-.7, .85]]);
  else if (kind === 'shoe') poly([[-.9, -.5], [-.2, -.5], [0, 0], [.9, .2], [.9, .6], [-.9, .6]]);
  else if (kind === 'cape') poly([[-.35, -.85], [.35, -.85], [.95, .85], [-.95, .85]]);
  c.fill();
  if (kind === 'flower') { c.fillStyle = color2; c.beginPath(); c.arc(0, 0, .32, 0, 7); c.fill(); }
  c.restore();
}

// ---------- personnage à costumes : makeCharacter du moteur + pièces et accessoires colorables ----------
const Y0 = 1.34;                                          // sommet des cheveux dans le repère de la tête
function buildHat(kind, hm, am) {                         // hm : matière du chapeau, am : matière d'accent
  const g = new THREE.Group(), add = m => (g.add(m), m);
  if (kind === 'tricorne') {
    const b = add(cyl(1.15, 1.15, .1, hm, { pos: [0, Y0 + .03, 0] })); b.scale.z = .92; add(cyl(.62, .74, .52, hm, { pos: [0, Y0 + .3, 0] }));
    for (const a of [Math.PI / 3, Math.PI, -Math.PI / 3]) { const f = new THREE.Group(); f.position.set(Math.sin(a) * .86, Y0 + .26, Math.cos(a) * .86); f.rotation.y = a; f.add(box(1.75, .44, .1, hm, { rot: [.25, 0, 0] })); f.add(box(1.75, .08, .13, GOLD, { pos: [0, .21, -.05], rot: [.25, 0, 0] })); g.add(f); }
    add(ball(.13, GOLD, { pos: [0, Y0 + .32, .78] }));
  } else if (kind === 'wizard') {
    add(cyl(1.22, 1.22, .08, hm, { pos: [0, Y0, 0] })); const c = add(cone(.74, 1.9, hm, { pos: [.1, Y0 + .95, 0], rot: [0, 0, -.1] })); c.castShadow = true;
    add(cyl(.72, .76, .18, GOLD, { pos: [0, Y0 + .13, 0] })); add(ball(.15, GOLD, { pos: [.2, Y0 + 1.9, 0] }));
    for (let i = 0; i < 4; i++) add(ball(.07, GOLD, { pos: [Math.sin(i * 1.7 + .4) * (.5 - i * .09), Y0 + .5 + i * .3, Math.cos(i * 1.7 + .4) * (.5 - i * .09) + .02] }));
  } else if (kind === 'crown') {
    add(cyl(.74, .68, .45, GOLD, { pos: [0, Y0 + .2, 0] }));
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; add(cone(.15, .36, GOLD, { pos: [Math.sin(a) * .64, Y0 + .58, Math.cos(a) * .64] })); add(ball(.09, hm, { pos: [Math.sin(a) * .72, Y0 + .2, Math.cos(a) * .72] })); }
  } else if (kind === 'tophat') {
    add(cyl(1.05, 1.05, .08, hm, { pos: [0, Y0, 0] })); add(cyl(.68, .64, 1.0, hm, { pos: [0, Y0 + .54, 0] })); add(cyl(.69, .67, .22, am, { pos: [0, Y0 + .17, 0] }));
  } else if (kind === 'catears') {
    add(box(1.42, .09, .22, hm, { pos: [0, Y0 + .02, 0] }));
    for (const s of [-1, 1]) { add(cone(.32, .62, hm, { seg: 4, pos: [s * .42, Y0 + .32, 0], rot: [0, Math.PI / 4, 0] })); add(cone(.17, .36, am, { seg: 4, pos: [s * .42, Y0 + .27, .12], rot: [0, Math.PI / 4, 0] })); }
  } else if (kind === 'flowers') {
    for (let i = 0; i < 9; i++) { const a = i * 2 * Math.PI / 9; add(ball(.24, i % 2 ? am : hm, { seg: 10, seg2: 8, pos: [Math.sin(a) * .7, Y0 - .1, Math.cos(a) * .7] })); }
  } else if (kind === 'antennae') {
    add(box(1.42, .09, .22, DARK, { pos: [0, Y0 + .02, 0] }));
    for (const s of [-1, 1]) { add(cyl(.04, .04, .7, DARK, { seg: 6, pos: [s * .38, Y0 + .36, 0], rot: [0, 0, -s * .2] })); add(ball(.19, hm, { pos: [s * .46, Y0 + .74, 0] })); }
  } else if (kind === 'cowboy') {
    const b = add(cyl(1.32, 1.32, .08, hm, { pos: [0, Y0, 0] })); b.scale.z = .82; add(cyl(.52, .72, .68, hm, { pos: [0, Y0 + .36, 0] })); add(cyl(.74, .74, .14, am, { pos: [0, Y0 + .1, 0] }));
    for (const s of [-1, 1]) add(box(.12, .22, 1.7, hm, { pos: [s * 1.24, Y0 + .1, 0], rot: [0, 0, s * .5] }));
  }
  return g;
}
const HATS = ['tricorne', 'wizard', 'crown', 'tophat', 'catears', 'flowers', 'antennae', 'cowboy'];
function makeDoll(o) {
  const ch = makeCharacter({ skin: o.skin, hair: o.hair, face: o.face ?? 'happy', shirt: '#ffffff', pants: '#ffffff' });
  const std = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7 });
  const M = { top: std(), bot: std(), shoe: std(), hat: std(), acc: std() }, p = ch.parts, A = {};
  p.torso.material = M.top; p.armL.children[0].material = M.top; p.armR.children[0].material = M.top; p.legL.children[0].material = M.bot; p.legR.children[0].material = M.bot;
  const grp = (parent, name, ...ms) => { const g = new THREE.Group(); ms.forEach(m => g.add(m)); parent.add(g); A[name] = g; return g; };
  for (const k of HATS) { const h = buildHat(k, M.hat, M.acc); p.head.add(h); A[k] = h; }
  grp(p.head, 'shades', box(.52, .3, .1, DARK, { pos: [-.31, .78, .65] }), box(.52, .3, .1, DARK, { pos: [.31, .78, .65] }), box(1.34, .08, .08, M.acc, { pos: [0, .9, .64] }));
  // pièces portées sur le buste (repère du buste : centre à y = 0, haut à +1)
  grp(p.torso, 'cape', box(2.5, 3.1, .09, M.acc, { pos: [0, -.55, -.66], rot: [.13, 0, 0] }), rbox(2.3, .34, 1.2, .12, M.acc, { pos: [0, .95, 0] }), ball(.14, GOLD, { pos: [0, .92, .62] }));
  grp(p.torso, 'scarf', rbox(1.6, .4, 1.28, .16, M.acc, { pos: [0, .98, 0] }), box(.42, 1.05, .12, M.acc, { pos: [.48, .42, .57], rot: [0, 0, -.08] }));
  grp(p.torso, 'bowtie', cone(.26, .5, M.acc, { seg: 4, pos: [-.3, .72, .56], rot: [0, 0, -Math.PI / 2] }), cone(.26, .5, M.acc, { seg: 4, pos: [.3, .72, .56], rot: [0, 0, Math.PI / 2] }), ball(.13, GOLD, { pos: [0, .72, .58] }));
  grp(p.torso, 'medal', box(.08, .75, .05, GOLD, { pos: [-.27, .55, .53], rot: [0, 0, .42] }), box(.08, .75, .05, GOLD, { pos: [.27, .55, .53], rot: [0, 0, -.42] }), cyl(.3, .3, .08, GOLD, { pos: [0, .1, .56], rot: [Math.PI / 2, 0, 0] }));
  grp(p.torso, 'belt', box(2.06, .3, 1.06, DARK, { pos: [0, -.85, 0] }), box(.44, .4, .1, GOLD, { pos: [0, -.85, .55] }));
  grp(p.torso, 'skirt', cyl(1.06, 1.8, 1.05, M.bot, { pos: [0, -1.42, 0] }), cyl(1.82, 1.82, .12, M.acc, { pos: [0, -1.94, 0] }));
  grp(p.torso, 'epaul', rbox(1.06, .24, 1.1, .08, GOLD, { pos: [-1.5, 1.08, 0] }), rbox(1.06, .24, 1.1, .08, GOLD, { pos: [1.5, 1.08, 0] }));
  const shoes = new THREE.Group(), boots = new THREE.Group();
  for (const leg of [p.legL, p.legR]) { const s = rbox(1.04, .46, 1.32, .12, M.shoe); s.position.set(0, -1.78, .15); leg.add(s); const b = rbox(1.07, .95, 1.07, .1, M.shoe); b.position.set(0, -1.3, 0); leg.add(b); b.userData.boot = true; (leg.userData.boot = b); }
  const fx = new THREE.Group(); ch.add(fx); for (let i = 0; i < 8; i++) fx.add(glow('#fff7b0', .9, .95));
  ch.doll = { M, A, fx };
  return ch;
}
/** Habille le personnage (appelé à chaque image : aucune mémoire). o : { top, bot, shoe, hat, hatC, acc:[...], accC, boots, fx } */
function dress(ch, o, t = 0) {
  const { M, A, fx } = ch.doll;
  M.top.color.set(o.top); M.bot.color.set(o.bot); M.shoe.color.set(o.shoe ?? '#8a8fa3'); M.hat.color.set(o.hatC ?? '#ffffff'); M.acc.color.set(o.accC ?? '#ffffff');
  for (const k in A) A[k].visible = k === o.hat || !!o.acc?.includes(k);
  ch.parts.legL.userData.boot.visible = ch.parts.legR.userData.boot.visible = !!o.boots;
  fx.visible = !!o.fx;
  if (o.fx) fx.children.forEach((s, i) => { const a = t * 2.2 + i * Math.PI / 4, y = 1 + ((t * .9 + i * .37) % 1) * 5.6; s.position.set(Math.cos(a) * 2.1, y, Math.sin(a) * 2.1); s.scale.setScalar(.5 + .5 * Math.abs(Math.sin(t * 6 + i))); });
}
const OUT = {
  blank: { top: '#eceaf4', bot: '#c2c4d6', shoe: '#9a9eb4' },
  pirate: { top: '#d81f3c', bot: '#2b2b3a', shoe: '#3a2415', hat: 'tricorne', hatC: '#22222c', acc: ['belt', 'scarf'], accC: '#ffc93c', boots: true },
  royal: { top: '#ff3d9a', bot: '#ffd1e8', shoe: '#ffc93c', hat: 'crown', hatC: '#24e0d0', acc: ['skirt', 'epaul', 'cape'], accC: '#9b5cff' },
  cowboy: { top: '#e08a2e', bot: '#2f5fb3', shoe: '#6b3d1c', hat: 'cowboy', hatC: '#8a5a2b', acc: ['scarf', 'belt'], accC: '#e23b3b', boots: true },
  cat: { top: '#24e0d0', bot: '#22305e', shoe: '#ff3d9a', hat: 'catears', hatC: '#ffffff', acc: ['bowtie', 'skirt'], accC: '#ff3d9a' },
  dandy: { top: '#20202c', bot: '#20202c', shoe: '#ffffff', hat: 'tophat', hatC: '#20202c', acc: ['bowtie', 'shades', 'medal'], accC: '#ffc93c' },
  flower: { top: '#6fd44a', bot: '#ff8fc7', shoe: '#ffffff', hat: 'flowers', hatC: '#ff5fa8', acc: ['skirt', 'scarf'], accC: '#ffe14d' },
  space: { top: '#cfd6ff', bot: '#7b2ff7', shoe: '#45f07a', hat: 'antennae', hatC: '#45f07a', acc: ['shades', 'epaul', 'belt'], accC: '#45f07a', boots: true },
  // costume créé dans l'atelier (plan 3), porté ensuite par le personnage A
  star: { top: '#7b2ff7', bot: '#24e0d0', shoe: '#ffc93c', hat: 'wizard', hatC: '#ff3d9a', acc: ['cape', 'medal'], accC: '#ffc93c', fx: true },
};
const HOOK_SEQ = [OUT.royal, OUT.pirate, OUT.cat, OUT.cowboy, OUT.flower, OUT.dandy, OUT.space, OUT.star];

/** Poses de défilé (illustration : bras et jambes tendus, comme le personnage en blocs). */
function pose(ch, n, t) {
  const p = ch.parts, w = Math.sin(t * 5) * .05;
  p.torso.rotation.set(0, 0, 0); p.head.rotation.set(0, 0, 0); p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0);
  if (n === 0) { p.armL.rotation.set(0, 0, -2.3 + w); p.armR.rotation.set(0, 0, 2.3 - w); p.legL.rotation.set(0, 0, -.32); p.legR.rotation.set(0, 0, .32); p.head.rotation.set(-.15, 0, 0); }
  else if (n === 1) { p.armL.rotation.set(0, 0, -.75); p.armR.rotation.set(0, 0, 2.9 + w); p.legR.rotation.set(0, 0, .3); p.head.rotation.set(0, .25, .12); }
  else if (n === 2) { p.armL.rotation.set(-2.5, 0, -.45 + w); p.armR.rotation.set(0, 0, .8); p.legL.rotation.set(-.35, 0, 0); p.head.rotation.set(-.1, -.3, 0); }
  else if (n === 3) { p.armL.rotation.set(-.3, 0, -1.6 + w); p.armR.rotation.set(-.3, 0, 1.6 - w); p.legL.rotation.set(0, 0, -.15); p.legR.rotation.set(0, 0, .15); p.head.rotation.set(0, 0, -.12); }
  else { p.armL.rotation.set(-1.5, 0, .5); p.armR.rotation.set(0, 0, 2.6 + w); p.legL.rotation.set(.35, 0, 0); p.legR.rotation.set(-.2, 0, 0); p.head.rotation.set(-.2, 0, 0); }
}

// ---------- scène 3D ----------
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(42);
const L = addLights(scene, { shadowArea: 24, dir: [5, 14, 10], sunI: 2.5, ambI: 1.15 });
const dA = makeDoll({ skin: '#f2c6a0', hair: '#5a3418' }), dB = makeDoll({ skin: '#a86b45', hair: '#1c1c26' }), dC = makeDoll({ skin: '#ffd9b8', hair: '#e2792a', face: 'smile' });
const dolls = [dA, dB, dC]; dolls.forEach(d => scene.add(d));
const place = (d, x, y, z, ry = 0, s = 1) => { d.visible = true; d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.setScalar(s); };

function makeSpot(color, len = 16, rad = 2.8) {            // faisceau de projecteur (cône lumineux additif)
  const g = new THREE.Group(), geo = new THREE.ConeGeometry(rad, len, 20, 1, true); geo.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(m); g.add(cyl(.45, .6, .9, '#2a2a36', { pos: [0, .2, 0] })); const gl = glow(color, 2.4, .9); g.add(gl); return g;
}
function makeDiscoBall(r = 1.4) {
  const g = new THREE.Group(); g.add(cyl(.05, .05, 4, '#888899', { pos: [0, r + 2, 0], seg: 6 }));
  const b = ball(r, '#e8ecff', { flat: true, seg: 14, seg2: 10, rough: .2, emissive: '#7f8fd8', emissiveI: .45 }); g.add(b); g.ball = b;
  g.glows = []; for (let i = 0; i < 7; i++) { const s = glow(['#ffffff', '#ff9ad0', '#9af4ff', '#fff3a0'][i % 4], 1.3, .9); g.add(s); g.glows.push(s); }
  return g;
}
function animDisco(d, t, r = 1.45) { d.ball.rotation.y = t * 1.1; d.glows.forEach((s, i) => { const a = t * 1.1 + i * 2.4, e = (hash(i * 3.1) - .5) * 2.2; s.position.set(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); s.scale.setScalar(.7 + .9 * Math.abs(Math.sin(t * 4 + i * 1.7))); }); }
function curtain(w, h, color, n = 7) { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(cyl(w / n * .55, w / n * .55, h, color, { seg: 10, pos: [-w / 2 + (i + .5) * w / n, h / 2, 0], rough: .9 })); return g; }

// --- décor 1 : podium de défilé (accroche, défilé, votes, écran final) ---
const gRun = new THREE.Group(); scene.add(gRun);
gRun.add(ground(160, '#1c0d40'));
gRun.add(box(5, 1, 30, '#f6eefc', { pos: [0, .5, -1], rough: .35 }));                      // piste, dessus à y = 1
for (const s of [-1, 1]) gRun.add(box(.22, .14, 30, '#ff7ac8', { pos: [s * 2.42, 1.04, -1], emissive: '#ff3d9a', emissiveI: 1.4 }));
for (let i = 0; i < 9; i++) gRun.add(box(4.2, .03, .18, '#e3d2f5', { pos: [0, 1.015, -14 + i * 3.4] }));
gRun.add(box(18, 1, 7, '#efe2fb', { pos: [0, .5, -17.5], rough: .4 }));                    // scène du fond
gRun.add(box(18, .16, .2, '#ff7ac8', { pos: [0, 1.04, -14.05], emissive: '#ff3d9a', emissiveI: 1.4 }));
gRun.add(box(20, 15, .6, '#3a1578', { pos: [0, 8.5, -21], rough: .9 }));                   // mur du fond
gRun.add(rbox(6.2, 8.4, .5, 1.2, '#16072f', { pos: [0, 5.2, -20.7] }));                    // entrée des coulisses
gRun.add(rbox(6.9, 9.0, .3, 1.4, GOLD, { pos: [0, 5.3, -20.76] }));
for (const s of [-1, 1]) { const c = curtain(5, 13, '#c2187a'); c.position.set(s * 7, 1, -20.4); gRun.add(c); }
gRun.add(sign(13, 3.6, (c, w, h) => {
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `400 ${h * .6}px "Pacifico"`; c.lineJoin = 'round';
  c.shadowColor = '#ff3d9a'; c.shadowBlur = h * .18; c.strokeStyle = '#ff3d9a'; c.lineWidth = h * .09; c.strokeText('Costume Clash', w / 2, h * .48);
  c.shadowBlur = 0; c.fillStyle = '#fff6c9'; c.fillText('Costume Clash', w / 2, h * .48);
}, { res: 1024, emissive: true, pos: [0, 12.6, -20.6] }));
gRun.add(box(22, .5, .5, '#2a2a36', { pos: [0, 16.4, -6] })); gRun.add(box(22, .5, .5, '#2a2a36', { pos: [0, 16.4, 6] }));
for (const s of [-1, 1]) gRun.add(box(.5, .5, 30, '#2a2a36', { pos: [s * 6.5, 16.4, 0] }));
const runSpots = [];
[[-6.5, -10, C.pink], [6.5, -10, C.turq], [-6.5, -2, C.gold], [6.5, -2, C.pink], [-6.5, 6, C.turq], [6.5, 6, C.gold]].forEach(([x, z, col], i) => { const s = makeSpot(col, 19, 3.2); s.position.set(x, 16, z); s.userData = { i, bx: -x / 22 }; gRun.add(s); runSpots.push(s); });
const disco = makeDiscoBall(); disco.position.set(0, 13.2, -8); gRun.add(disco);
for (const s of [-1, 1]) for (let r = 0; r < 3; r++) gRun.add(box(1.5, .7 * r + .05, 28, '#2a1258', { pos: [s * (3.9 + r * 1.5), (.7 * r + .05) / 2, 0] }));
// public en blocs (instances) : 2 côtés x 3 rangs x 15
const NC = 90, crowdBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.05, 1.5, .75), new THREE.MeshStandardMaterial({ roughness: .8 }), NC), crowdHead = new THREE.InstancedMesh(new THREE.BoxGeometry(.78, .78, .78), new THREE.MeshStandardMaterial({ roughness: .8 }), NC);
const crowdArm = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, 1.2, .3), new THREE.MeshStandardMaterial({ roughness: .8 }), NC * 2);
const crowdPos = [], _d = new THREE.Object3D(), _c = new THREE.Color();
{ const shirts = ['#ff3d9a', '#24e0d0', '#ffc93c', '#7b2ff7', '#45f07a', '#ff6b35', '#f2f2f8', '#3d7bff'], skins = ['#f2c6a0', '#a86b45', '#ffd9b8', '#7a4a2c', '#e8b088'];
  for (let i = 0; i < NC; i++) { const side = i % 2 ? 1 : -1, r = Math.floor(i / 2) % 3, k = Math.floor(i / 6); crowdPos.push([side * (3.9 + r * 1.5), .7 * r + .05, -13 + k * 1.85 + (r % 2) * .5]);
    crowdBody.setColorAt(i, _c.set(shirts[Math.floor(hash(i * 1.7) * 8)])); const sk = skins[Math.floor(hash(i * 4.3) * 5)]; crowdHead.setColorAt(i, _c.set(sk)); crowdArm.setColorAt(i * 2, _c.set(sk)); crowdArm.setColorAt(i * 2 + 1, _c.set(sk)); } }
[crowdBody, crowdHead, crowdArm].forEach(m => { m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; gRun.add(m); });
function animCrowd(t, energy = .5) {
  for (let i = 0; i < NC; i++) {
    const [x, y, z] = crowdPos[i], b = Math.abs(Math.sin(t * Math.PI * 2 + hash(i) * 6.28)) * .35 * energy * (.5 + hash(i * 7)), up = hash(i * 9.1) < energy ? 1 : 0;
    _d.rotation.set(0, 0, 0); _d.scale.setScalar(1); _d.position.set(x, y + .75 + b, z); _d.updateMatrix(); crowdBody.setMatrixAt(i, _d.matrix);
    _d.position.set(x, y + 1.9 + b, z); _d.updateMatrix(); crowdHead.setMatrixAt(i, _d.matrix);
    for (const s of [-1, 1]) { _d.position.set(x + s * .66, y + (up ? 2.0 : .95) + b, z); _d.rotation.set(0, 0, up ? s * -.25 + Math.sin(t * 9 + i) * .12 : 0); _d.updateMatrix(); crowdArm.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), _d.matrix); }
  }
  crowdBody.instanceMatrix.needsUpdate = crowdHead.instanceMatrix.needsUpdate = crowdArm.instanceMatrix.needsUpdate = true;
}
function animRun(t, energy) {
  runSpots.forEach(s => { const i = s.userData.i; s.rotation.set(Math.sin(t * 1.1 + i * 1.3) * .32, 0, s.userData.bx * 1.1 + Math.sin(t * 1.5 + i * 2.1) * .3); });
  animDisco(disco, t); animCrowd(t, energy);
}

// --- décor 2 : annonce du thème (grand panneau lumineux) ---
const gTheme = new THREE.Group(); scene.add(gTheme);
gTheme.add(ground(120, '#12305a'));
gTheme.add(cyl(9, 9.4, .5, '#1d4a86', { pos: [0, .25, 0], seg: 40 })); gTheme.add(torus(9.1, .14, '#24e0d0', { pos: [0, .52, 0], rot: [Math.PI / 2, 0, 0], emissive: '#24e0d0', emissiveI: 1.2, seg: 48 }));
for (const s of [-1, 1]) { gTheme.add(cyl(.3, .4, 4.6, '#2a2a36', { pos: [s * 2.6, 2.6, -3.2] })); const c = curtain(4.5, 15, '#7b2ff7'); c.position.set(s * 7.6, 0, -6); gTheme.add(c); }
gTheme.add(rbox(8.2, 8.6, .7, .7, '#ff3d9a', { pos: [0, 8.6, -3.2] })); gTheme.add(rbox(7.1, 7.5, .3, .5, '#1a0b3a', { pos: [0, 8.6, -2.95] }));
gTheme.add(sign(6.2, 1.5, (c, w, h) => { c.fillStyle = '#ffc93c'; c.beginPath(); c.roundRect(0, 0, w, h, h * .3); c.fill(); c.fillStyle = '#3a0b5e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `400 ${h * .74}px "Lilita"`; c.fillText('THÈME', w / 2, h * .54); }, { res: 512, emissive: true, pos: [0, 11.35, -2.7] }));
const themeIcons = ['heart', 'bolt', 'star', 'note', 'crown', 'flower'].map((k, i) => { const cols = ['#ff3d9a', '#ff6b35', '#7b2ff7', '#24b8e0', '#e09a00', '#2fbf71'];
  const s = sign(5.2, 5.2, (c, w, h) => { c.fillStyle = cols[i]; c.beginPath(); c.roundRect(0, 0, w, h, w * .12); c.fill(); c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(w / 2, h / 2, w * .42, 0, 7); c.fill(); picto(c, k, w / 2, h / 2, w * .3, '#ffffff', '#ffe14d'); }, { res: 512, emissive: true, pos: [0, 7.85, -2.7] }); gTheme.add(s); return s; });
const NB = 36, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NB); bulbs.frustumCulled = false; gTheme.add(bulbs);
for (let i = 0; i < NB; i++) { const u = i / NB * 4, e = Math.floor(u), f = u - e, hw = 3.85, hh = 4.05; const p = e === 0 ? [-hw + f * 2 * hw, hh] : e === 1 ? [hw, hh - f * 2 * hh] : e === 2 ? [hw - f * 2 * hw, -hh] : [-hw, -hh + f * 2 * hh];
  _d.position.set(p[0], 8.6 + p[1], -2.78); _d.rotation.set(0, 0, 0); _d.updateMatrix(); bulbs.setMatrixAt(i, _d.matrix); bulbs.setColorAt(i, _c.set('#ffffff')); }
const themeSpots = [-1, 1].map(s => { const sp = makeSpot(s < 0 ? C.turq : C.gold, 20, 3); sp.position.set(s * 7, 17, 6); gTheme.add(sp); return sp; });
for (let i = 0; i < 10; i++) { const st = cyl(.5, .5, .12, GOLD, { seg: 5, pos: [(hash(i * 3.3) - .5) * 15, 1.2 + hash(i * 5.1) * 13, -5.4], rot: [Math.PI / 2, hash(i) * 3, 0] }); gTheme.add(st); }

// --- décor 3 : l'atelier de création ---
const gAtelier = new THREE.Group(); scene.add(gAtelier);
gAtelier.add(ground(70, '#fff', { tex: canvasTex(128, (c, n) => { c.fillStyle = '#ffe9f3'; c.fillRect(0, 0, n, n); c.fillStyle = '#ffc2dc'; c.fillRect(0, 0, n / 2, n / 2); c.fillRect(n / 2, n / 2, n / 2, n / 2); }, { repeat: 14 }) }));
{ const wall = new THREE.Mesh(new THREE.PlaneGeometry(48, 24), new THREE.MeshStandardMaterial({ roughness: .95, map: canvasTex(128, (c, n) => { c.fillStyle = '#8fe3dc'; c.fillRect(0, 0, n, n); c.fillStyle = '#7bd6ce'; c.fillRect(0, 0, n / 2, n); }, { repeat: 12 }) })); wall.position.set(0, 12, -7.5); wall.receiveShadow = true; gAtelier.add(wall); }
gAtelier.add(box(48, .7, .3, '#ffffff', { pos: [0, .35, -7.3] }));
gAtelier.add(cyl(2.5, 2.8, .6, '#ffffff', { pos: [0, .3, 0], seg: 36 })); gAtelier.add(torus(2.62, .1, GOLD, { pos: [0, .62, 0], rot: [Math.PI / 2, 0, 0], seg: 40 }));
gAtelier.add(rbox(6.6, 10.4, .4, .9, GOLD, { pos: [0, 6.3, -7.0] })); gAtelier.add(rbox(5.7, 9.5, .2, .7, '#d6f3ff', { pos: [0, 6.3, -6.82], rough: .15, emissive: '#9fdcf5', emissiveI: .45 }));
for (let i = 0; i < 3; i++) gAtelier.add(box(.35 + i * .25, 11, .02, '#ffffff', { pos: [-1.2 + i * 1.1, 6.3, -6.68], rot: [0, 0, -.5], opacity: .45, cast: false }));
for (let i = 0; i < 18; i++) { const side = i < 7 ? -1 : i < 14 ? 1 : 0, p = side ? [side * 3.55, 2.1 + (i % 7) * 1.4] : [-2.4 + (i - 14) * 1.6, 11.75]; gAtelier.add(ball(.24, '#fff7c2', { pos: [p[0], p[1], -6.75], emissive: '#ffe680', emissiveI: 1.6, seg: 10, seg2: 8, cast: false })); }
// portant de vêtements (gauche)
{ const rk = new THREE.Group(); rk.position.set(-4.5, 0, -3.6); gAtelier.add(rk);
  for (const x of [-1.6, 1.6]) { rk.add(cyl(.09, .09, 6.2, '#b9bccb', { pos: [x, 3.1, 0], seg: 8 })); rk.add(box(.9, .14, 1.4, '#b9bccb', { pos: [x, .07, 0] })); }
  rk.add(cyl(.09, .09, 3.4, '#b9bccb', { pos: [0, 6.1, 0], rot: [0, 0, Math.PI / 2], seg: 8 }));
  ['#ff3d9a', '#ffc93c', '#7b2ff7', '#45f07a', '#ff6b35'].forEach((col, i) => { const x = -1.2 + i * .6; rk.add(torus(.14, .03, '#888899', { pos: [x, 6.05, 0], seg: 10 })); rk.add(rbox(.32, 2.4 + (i % 2) * .7, 1.5, .1, col, { pos: [x, 4.6 - (i % 2) * .35, 0] })); rk.add(box(.34, .3, 1.9, col, { pos: [x, 5.55, 0] })); }); }
// étagère à chapeaux (droite)
{ const sh = new THREE.Group(); sh.position.set(4.5, 0, -5.6); gAtelier.add(sh);
  const cols = [['tophat', '#20202c', '#ff3d9a'], ['cowboy', '#8a5a2b', '#e23b3b'], ['crown', '#24e0d0', '#fff'], ['tricorne', '#7b2ff7', '#fff']];
  cols.forEach(([k, a, b], i) => { sh.add(box(3, .16, 1.6, '#ffffff', { pos: [0, 1.6 + i * 2.2, 0] })); const hgrp = buildHat(k, mat(a), mat(b)); hgrp.position.set(-.3, 1.72 + i * 2.2 - Y0, .1); hgrp.rotation.y = -.4; sh.add(hgrp); });
  for (const x of [-1.42, 1.42]) sh.add(box(.16, 9.2, 1.6, '#ffffff', { pos: [x, 4.6, 0] })); }
// pots de couleur et rouleaux de tissu
['#ff3d9a', '#24e0d0', '#ffc93c', '#7b2ff7', '#45f07a', '#ff6b35'].forEach((col, i) => { const x = (i < 3 ? -1 : 1) * (3.1 + (i % 3) * 1.0), z = 2.4 + (i % 3) * .5; gAtelier.add(cyl(.42, .36, .62, '#f4f4fa', { pos: [x, .31, z] })); gAtelier.add(cyl(.38, .38, .06, col, { pos: [x, .63, z], rough: .3 })); });
[['#ff8fc7', -6.3, 0], ['#ffe14d', -6.9, .9], ['#9b5cff', 6.4, -1.2]].forEach(([col, x, z], i) => gAtelier.add(cyl(.42, .42, 4.6, col, { pos: [x, 2.3, z - 2], rot: [0, 0, (i - 1) * .12], seg: 14 })));
for (let i = 0; i < 13; i++) { const u = i / 12, f = cone(.42, .85, ['#ff3d9a', '#ffc93c', '#7b2ff7', '#ffffff'][i % 4], { seg: 3, pos: [-7.2 + u * 14.4, 13.4 - Math.sin(u * Math.PI) * 1.3, -7.1], rot: [Math.PI, 0, 0], cast: false }); gAtelier.add(f); }

// --- décor 4 : podium des gagnants ---
const gGala = new THREE.Group(); scene.add(gGala);
gGala.add(ground(120, '#2a0f55'));
gGala.add(cyl(8.5, 9, .5, '#4a1f96', { pos: [0, .25, 0], seg: 40 })); gGala.add(torus(8.6, .14, GOLD, { pos: [0, .52, 0], rot: [Math.PI / 2, 0, 0], seg: 48 }));
const podDef = [[0, 2.6, '#ffc93c', '1'], [-3.15, 1.8, '#cfd6e6', '2'], [3.15, 1.2, '#e08a4a', '3']];
podDef.forEach(([x, h, col, n]) => { gGala.add(box(3.1, h, 2.8, col, { pos: [x, .5 + h / 2, 0], rough: .4, emissive: col, emissiveI: .12 })); gGala.add(box(3.25, .18, 2.95, '#ffffff', { pos: [x, .5 + h + .09, 0] }));
  gGala.add(sign(1.3, 1.3, (c, w, hh) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w / 2, hh / 2, w * .46, 0, 7); c.fill(); c.fillStyle = '#3a0b5e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `400 ${hh * .7}px "Lilita"`; c.fillText(n, w / 2, hh * .55); }, { res: 128, pos: [x, .5 + Math.min(h / 2 + .1, h - .75), 1.42] })); });
{ const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ map: canvasTex(512, (c, n) => { c.fillStyle = '#7b2ff7'; c.fillRect(0, 0, n, n); c.translate(n / 2, n / 2); for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#ff3d9a' : '#ffb347'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, n, i * Math.PI / 12, (i + 1) * Math.PI / 12); c.fill(); } c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(0, 0, n * .16, 0, 7); c.fill(); }) }));
  sun.position.set(0, 8.5, -7); gGala.add(sun); gGala.sun = sun; }
gGala.add(box(40, 26, .4, '#3a1578', { pos: [0, 13, -7.4] }));
for (const s of [-1, 1]) { const c = curtain(5, 20, '#ffb020'); c.position.set(s * 9.2, 0, -6.4); gGala.add(c); }
const trophy = new THREE.Group(); trophy.add(cyl(.9, 1.1, .5, '#3a0b5e', { pos: [0, .25, 0] }), cyl(.22, .32, 1.1, GOLD, { pos: [0, 1.05, 0] }), cyl(1.15, .45, 1.6, GOLD, { pos: [0, 2.4, 0] }), cyl(1.2, 1.2, .14, GOLD, { pos: [0, 3.24, 0] }));
for (const s of [-1, 1]) trophy.add(torus(.5, .11, GOLD, { pos: [s * 1.25, 2.55, 0], seg: 20 })); trophy.position.set(0, 9.2, -4.2); trophy.scale.setScalar(1.25); gGala.add(trophy);
const balloons = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(), col = [C.pink, C.turq, C.gold, '#ffffff', C.violet][i % 5]; const b = ball(.75, col, { rough: .3, seg: 14, seg2: 10 }); b.scale.y = 1.2; g.add(b); g.add(cyl(.02, .02, 3, '#ffffff', { pos: [0, -2.3, 0], seg: 4, cast: false })); g.userData = { x: (i % 2 ? 1 : -1) * (4.6 + hash(i * 2.2) * 2.6), y: 5 + hash(i * 3.7) * 9, z: -2 - hash(i * 5.3) * 3.5, i }; gGala.add(g); balloons.push(g); }
const galaSpots = [-1, 1].map(s => { const sp = makeSpot(s < 0 ? C.pink : C.turq, 22, 3.4); sp.position.set(s * 6.5, 19, 5); gGala.add(sp); return sp; });
const disco2 = makeDiscoBall(1.1); disco2.position.set(0, 17.5, -1); gGala.add(disco2);
const DECORS = [gRun, gTheme, gAtelier, gGala];

// ---------- repères sonores ----------
cue(.05, 'whoosh'); for (let i = 1; i < 8; i++) cue(i * .5, 'pop', .55);
cue(T.theme - .22, 'whoosh', .8); cue(T.theme, 'impact');
const ROUL = [4.15, 6.0], NSTEP = 14; for (let k = 2; k < NSTEP; k += 2) cue(lerp(ROUL[0], ROUL[1], 1 - Math.cbrt(1 - k / NSTEP)), 'tick', .7);
cue(ROUL[1], 'ding'); cue(ROUL[1] + .05, 'crowd', .5, 1.6);
cue(T.atelier - .2, 'swish'); cue(T.atelier, 'bell', .7); for (let i = 1; i <= 5; i++) cue(T.atelier + i * .5, 'pop', .7);
cue(T.color, 'swish', .8); for (let i = 1; i <= 4; i++) cue(T.color + i * .5, 'bubble', .7);
cue(13, 'tick'); cue(13.33, 'tick'); cue(13.66, 'tick'); cue(T.runway - .25, 'whoosh', .8);
cue(T.runway, 'impact'); cue(T.runway + .1, 'crowd', .6, 2.6);
cue(T.poses, 'swish'); cue(T.poses + .05, 'chime', .8); cue(T.poses + .75, 'pop', .6); cue(T.poses + 1.5, 'chime', .8); cue(T.poses + 2.25, 'pop', .6);
cue(T.votes - .2, 'whoosh', .8); for (let i = 0; i < 5; i++) cue(T.votes + .95 + i * .5, 'ding', .55);
cue(T.win - 1.1, 'riser', .8, 1.1); cue(T.win, 'win'); cue(T.win, 'boom', .8); cue(T.win + .1, 'crowd', .8, 2.8);
cue(T.reward, 'powerup', .8); cue(T.reward + .3, 'coin', .7); cue(T.reward + .7, 'coin', .7); cue(T.reward + 1.1, 'coin', .7);
cue(T.end, 'impact'); cue(T.end + .85, 'pop'); cue(T.end + 1.5, 'chime', .7);

// ---------- aides 2D ----------
function project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; }
function burst(x, y, k, color = '255,255,255', R = 420) {                    // éclat lors d'un changement de costume (k : 0 -> 1)
  if (k <= 0 || k >= 1) return; ctx.save(); ctx.translate(x, y); ctx.globalAlpha = (1 - k) * .9; ctx.strokeStyle = `rgb(${color})`; ctx.lineCap = 'round'; ctx.lineWidth = 14 * (1 - k) + 3;
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + .2, r0 = R * (.35 + .55 * ease.out(k)), r1 = R * (.5 + .75 * ease.out(k)); ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 1.25); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 1.25); ctx.stroke(); }
  ctx.restore();
}
function camFlashes(t, a, b, n = 9, seed = 0) {                              // flashs des photographes
  if (t < a || t > b) return; ctx.save();
  for (let i = 0; i < n; i++) { const per = .55 + hash(i + seed) * .5, ph = ((t + hash(i * 3 + seed) * 2) % per) / .16; if (ph > 1) continue; const cyc = Math.floor((t + hash(i * 3 + seed) * 2) / per);
    const x = hash(i * 7 + cyc * 1.3 + seed) < .5 ? 60 + hash(i + cyc) * 260 : W - 60 - hash(i + cyc) * 260, y = 620 + hash(i * 5 + cyc * 2.1) * 620, k = Math.sin(ph * Math.PI), r = 90 * k;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r + 1); g.addColorStop(0, `rgba(255,255,255,${k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.fillRect(x - r * 1.6, y - 3, r * 3.2, 6); ctx.fillRect(x - 3, y - r * 1.6, 6, r * 3.2); }
  ctx.restore();
}
function clubBg(t, a = '#12062e', b = '#4a1380', c = '#a01f8a') { bg([a, b, c]); sparkles(t, { n: 30, y: 0, h: 900, color: '#ffd6f2', size: 10, seed: 3 }); }
function timerPill(sec, y = 292) {                                           // chrono de création
  const s = Math.max(0, Math.ceil(sec)), str = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, hot = s <= 3, sc = hot ? 1 + .12 * (1 - (sec % 1)) : 1;
  ctx.save(); ctx.translate(SAFE.cx, y); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-190, -58 + 8, 380, 116, 58); ctx.fill(); ctx.fillStyle = hot ? '#ff2d55' : '#3a0b5e'; roundRect(-190, -58, 380, 116, 58); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-118, 0, 34, 0, 7); ctx.fill(); ctx.strokeStyle = hot ? '#ff2d55' : '#3a0b5e'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-118, 0); ctx.lineTo(-118, -20); ctx.moveTo(-118, 0); ctx.lineTo(-118 + Math.sin(sec * 2) * 16, -Math.cos(sec * 2) * 16); ctx.stroke();
  ctx.restore(); text(str, SAFE.cx + 36, y + 4, { font: 'Lilita', size: 84 * sc, color: '#ffffff' });
}
function tray(x, kinds, sel, t, colors) {                                    // colonne de catégories de pièces (affichage type jeu)
  const y0 = 560, dy = 142; ctx.save(); ctx.fillStyle = 'rgba(26,11,58,.72)'; roundRect(x - 78, y0 - 88, 156, dy * (kinds.length - 1) + 176, 44); ctx.fill();
  kinds.forEach((k, i) => { const on = i === sel, y = y0 + i * dy, s = on ? 1.12 + Math.sin(t * 10) * .04 : 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = on ? '#ffc93c' : '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 58, 0, 7); ctx.fill(); if (on) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.stroke(); }
    if (colors) { ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); ctx.fill(); } else picto(ctx, k, 0, 0, 32, on ? '#3a0b5e' : '#7b2ff7', '#ffc93c');
    ctx.restore(); });
  ctx.restore();
}
function heart(x, y, s, color = '#ff3d9a', alpha = 1) { ctx.save(); ctx.globalAlpha = alpha; picto(ctx, 'heart', x, y + s * .12, s * 1.08, '#ffffff'); picto(ctx, 'heart', x, y + s * .1, s * .86, color); ctx.restore(); }

// ---------- plans ----------
const lights = (sunI, ambI, sky = '#cfe3ff', gr = '#7a6a55') => { L.sun.intensity = sunI; L.hemi.intensity = ambI; L.hemi.color.set(sky); L.hemi.groundColor.set(gr); };
const popK = (t, at, d = .28) => (t >= at && t < at + d) ? 1 - ease.out((t - at) / d) : 0;

function shotHook(t) {                                    // accroche : un costume différent à chaque temps
  showOnly(DECORS, gRun); lights(2.6, 1.25, '#e2c8ff', '#6a3a8a'); animRun(t, .5);
  const z = -7 + t * 1.9, i = Math.min(7, Math.floor(t / .5)), k = popK(t, i * .5);
  dB.visible = dC.visible = false; place(dA, 0, 1 + Math.abs(Math.sin(t * Math.PI * 2)) * .18, z, 0, 1 + k * .13); poseWalk(dA, t * Math.PI * 2, .6); dress(dA, HOOK_SEQ[i], t);
  camLook(camera, [.9 + Math.sin(t * .8) * .5, 3.1, z + 17.5], [0, 3.2, z], 42);
  clubBg(t); draw3D(scene, camera); vignette(.4);
  burst(540, 860, 1 - k > 0 && k > 0 ? 1 - k : 0, '255,240,180'); camFlashes(t, 0, 4, 7, 1);
  caption(t, .12, T.theme - .15, 'QUI AURA LE PLUS\nBEAU COSTUME ?', { font: 'Lilita', size: 104, y: 1410, anim: 'slam', grad: ['#fff6a8', '#ffc93c'], stroke: '#3a0b5e', strokeW: 20, lineH: 1.05 });
}
function shotTheme(t) {                                   // un thème est annoncé (20 thèmes dans le jeu)
  showOnly(DECORS, gTheme); lights(2.4, 1.3, '#bfe6ff', '#3a5a8a');
  const u = inv(ROUL[0], ROUL[1], t), step = Math.min(NSTEP, Math.floor(NSTEP * (1 - Math.pow(1 - u, 3)) + 1e-6)), done = t >= ROUL[1], idx = step % 6;
  themeIcons.forEach((s, i) => { s.visible = i === idx; const p = done ? 1 + .1 * ease.elastic(inv(ROUL[1], ROUL[1] + .7, t)) - .1 + Math.sin(t * 6) * .012 : .94; s.scale.setScalar(p); });
  for (let i = 0; i < NB; i++) bulbs.setColorAt(i, _c.set((i + Math.floor(t * (done ? 12 : 6))) % 3 === 0 ? '#fff7c2' : done ? '#ffb347' : '#a05a18')); bulbs.instanceColor.needsUpdate = true;
  themeSpots.forEach((s, i) => s.rotation.set(-.35 + Math.sin(t * 1.3 + i) * .12, 0, (i ? 1 : -1) * (.3 + Math.sin(t * 1.7 + i * 2) * .15)));
  dolls.forEach((d, i) => { const x = (i - 1) * 3.1, j = done ? Math.abs(Math.sin((t - ROUL[1]) * 6 + i)) * 1.0 * (1 - inv(7.2, 8, t) * .5) : 0, turn = done ? prog(t, ROUL[1] + .1, ROUL[1] + .5) : 0;
    place(d, x, .5 + j, 5.4 + (i === 1 ? .8 : 0), Math.PI * (1 - turn)); done ? poseCheer(d, t + i) : poseIdle(d, t + i); if (!done) d.parts.head.rotation.x = -.35; dress(d, OUT.blank, t); });
  camLook(camera, [Math.sin(t * .7) * 1.2, 5.6, 25.5 - prog(t, T.theme, T.atelier, ease.io) * 2.5], [0, 6.3, 0], 42);
  bg(['#0b1e4a', '#1c4f9a', '#35b6c9']); sparkles(t, { n: 24, y: 0, h: 700, color: '#d6f6ff', size: 10, seed: 5 }); draw3D(scene, camera); vignette(.38);
  if (done) confetti(t, ROUL[1], { cy: 700, n: 70, power: 1100, life: 2 });
  caption(t, T.theme + .3, ROUL[1] - .05, 'UN THÈME EST ANNONCÉ', { font: 'Lilita', size: 84, y: 318, anim: 'pop', bg: '#ff3d9a' });
  caption(t, ROUL[1], T.atelier - .15, '20 THÈMES DANS LE JEU', { font: 'Lilita', size: 84, y: 318, anim: 'slam', bg: '#ffc93c', color: '#3a0b5e' });
}
const A_STEPS = ['hat', 'shirt', 'pants', 'shoe', 'cape'];
function atelierOutfit(t) {                               // le costume se construit pièce par pièce, puis se colore
  const n = Math.floor((t - T.atelier) / .5), o = { ...OUT.blank, acc: [] };
  if (n >= 1) { o.hat = 'wizard'; o.hatC = '#f4f4fa'; } if (n >= 2) o.top = '#ff6b35'; if (n >= 3) o.bot = '#3d7bff'; if (n >= 4) o.shoe = '#ffc93c'; if (n >= 5) { o.acc = ['cape', 'medal']; o.accC = '#f4f4fa'; }
  const m = Math.floor((t - T.color) / .5);
  if (m >= 1) o.hatC = OUT.star.hatC; if (m >= 2) o.accC = OUT.star.accC; if (m >= 3) o.top = OUT.star.top; if (m >= 4) o.bot = OUT.star.bot; if (m >= 5) o.fx = true;
  return o;
}
const SWATCH = ['#ff3d9a', '#ffc93c', '#7b2ff7', '#24e0d0', '#45f07a', '#ff6b35'];
function shotAtelier(t) {                                 // 3 minutes pour créer : 80 pièces à colorer
  showOnly(DECORS, gAtelier); lights(2.7, 1.45, '#fff2e6', '#c9a08a');
  const B = t >= T.color, n = Math.floor((t - T.atelier) / .5), k = n >= 1 ? popK(t, T.atelier + n * .5) : 0, last = t >= 13.5;
  dB.visible = dC.visible = false; place(dA, 0, .6 + (last ? Math.abs(Math.sin((t - 13.5) * 9)) * .5 : 0), 0, B ? -.25 + Math.sin(t * 1.2) * .25 : Math.sin(t * 1.6) * .35, 1 + k * .12);
  last ? poseCheer(dA, t) : poseIdle(dA, t); dress(dA, atelierOutfit(t), t);
  if (!B) camLook(camera, [Math.sin(t * .5) * 1.5 + .6, 5.2, 20 - (t - T.atelier) * .5], [.25, 2.75, 0], 42);
  else camLook(camera, [-5.5 + (t - T.color) * .7, 4.6, 14.6], [-.2, 2.95, 0], 42);
  bg(['#bff0ea', '#ffe3ee']); draw3D(scene, camera); vignette(.22, '90,30,80');
  const [hx, hy] = project(0, 3.6, 0); burst(hx, hy, k > 0 ? 1 - k : 0, B ? '255,255,255' : '255,220,120', 400);
  const rem = t < T.color ? lerp(180, 96, inv(T.atelier, T.color, t)) : t < 13 ? lerp(96, 3.2, ease.in(inv(T.color, 13, t)) * .35 + inv(T.color, 13, t) * .65) : Math.max(0, 3 - (t - 13) * 3.2);
  timerPill(rem);
  if (!B) { tray(152, A_STEPS, clamp(n - 1, -1, 4), t); caption(t, T.atelier + .25, T.color - .1, '3 MINUTES POUR CRÉER', { font: 'Lilita', size: 88, y: 1425, anim: 'pop', bg: '#7b2ff7' }); }
  else { const m = Math.floor((t - T.color) / .5); tray(928, SWATCH, [0, 0, 1, 2, 3, 3][clamp(m, 0, 5)], t, SWATCH); caption(t, T.color + .2, T.runway - .15, '80 PIÈCES À COLORER', { font: 'Lilita', size: 88, y: 1425, anim: 'slide', bg: '#ff3d9a' }); }
}
function shotRunway(t) {                                  // le défilé
  showOnly(DECORS, gRun); lights(2.6, 1.25, '#e2c8ff', '#6a3a8a'); animRun(t, .75);
  if (t < T.poses) {
    const lt = t - T.runway, z = -11 + lt * 4.2; dB.visible = dC.visible = false;
    place(dA, 0, 1 + Math.abs(Math.sin(t * Math.PI * 2)) * .2, z, 0); poseWalk(dA, t * Math.PI * 2, .75); dress(dA, OUT.star, t);
    camLook(camera, [6.5 - lt * .9, 6.4 - lt * .5, z + 13.5], [0, 3.5, z + .5], 42);
    clubBg(t); draw3D(scene, camera); vignette(.4); camFlashes(t, T.runway, T.poses, 8, 4);
    caption(t, T.runway + .25, T.poses - .1, 'DÉFILE SUR LE PODIUM', { font: 'Lilita', size: 88, y: 1425, anim: 'pop', bg: '#ffc93c', color: '#3a0b5e' });
  } else {
    const lt = t - T.poses, second = lt >= 1.5, d = second ? dC : dB, n = Math.floor(lt / .75), k = popK(t, T.poses + n * .75, .22);
    dA.visible = false; (second ? dB : dC).visible = false;
    place(d, 0, 1, 9, Math.sin(lt * 2) * .15, 1 + k * .1); pose(d, n % 4 + (second ? 1 : 0), t); dress(d, second ? OUT.dandy : OUT.cat, t);
    const a = (second ? .55 : -.55) + (lt - (second ? 1.5 : 0)) * (second ? -.35 : .35);
    camLook(camera, [Math.sin(a) * 15.5, 2.3, 9 + Math.cos(a) * 15.5], [0, 3.75, 9], 42);
    clubBg(t, '#1a0733', '#5a1590', '#c0257f'); draw3D(scene, camera); vignette(.4); camFlashes(t, T.poses, T.votes, 12, 9);
    burst(540, 900, k > 0 ? 1 - k : 0, '255,255,255', 440);
    caption(t, T.poses + .15, T.votes - .15, '12 POSES POUR BRILLER', { font: 'Lilita', size: 88, y: 1425, anim: 'pop', bg: '#24e0d0', color: '#12305a' });
  }
}
const VOTES = [4, 7, 5], NH = 16;
function shotVotes(t) {                                   // les votes
  showOnly(DECORS, gRun); lights(2.6, 1.3, '#e2c8ff', '#6a3a8a'); animRun(t, .9);
  const outs = [OUT.cat, OUT.star, OUT.dandy], order = [dB, dA, dC];
  order.forEach((d, i) => { place(d, (i - 1) * 3.3, 1, -15.5); i === 1 ? pose(d, 0, t) : i === 0 ? pose(d, 1, t) : pose(d, 3, t); d.position.y = 1 + Math.abs(Math.sin(t * Math.PI * 2 + i)) * .15; dress(d, outs[i], t); });
  camLook(camera, [Math.sin(t * .6) * .8, 5.6, 8.5 - (t - T.votes) * .5], [0, 4.9, -15.5], 42);
  clubBg(t); draw3D(scene, camera); vignette(.4);
  const land = i => T.votes + .45 + i * .2 + .7, tgt = order.map((d, i) => { const p = project((i - 1) * 3.3, 8.6, -15.5); return [p[0], p[1]]; });
  for (let i = 0; i < NH; i++) { const s = land(i) - .7, k = inv(s, s + .7, t); if (k <= 0 || k >= 1) continue; const j = [1, 0, 2, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 0, 1, 2][i], e = ease.io(k), x0 = 120 + hash(i * 3.3) * 840;
    heart(lerp(x0, tgt[j][0], e) + Math.sin(k * Math.PI) * (hash(i) - .5) * 260, lerp(1620, tgt[j][1], e), 34 + 14 * Math.sin(k * Math.PI), i % 2 ? '#ff3d9a' : '#ff6b9d'); }
  tgt.forEach(([x, y], j) => { const seq = [1, 0, 2, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 0, 1, 2]; let n = 0, lastT = -9; seq.forEach((q, i) => { if (q === j && t >= land(i)) { n++; lastT = land(i); } });
    const pk = 1 + popK(t, lastT, .25) * .25, a = inv(T.votes + .25, T.votes + .55, t); ctx.save(); ctx.translate(x, y); ctx.scale(pk * a, pk * a);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-104, -50, 208, 112, 54); ctx.fill(); ctx.fillStyle = '#ffffff'; roundRect(-104, -58, 208, 112, 54); ctx.fill(); ctx.restore();
    if (a > .5) { heart(x - 48 * pk, y - 4, 30 * pk); text(String(n), x + 42, y + 2, { font: 'Lilita', size: 76 * pk, color: '#3a0b5e' }); } });
  // mains du public au premier plan
  for (let i = 0; i < 5; i++) { const x = 130 + i * 205, up = Math.sin(t * 5 + i * 1.9) * 26, y = 1640 + (i % 2) * 40 + up; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * .08);
    ctx.fillStyle = ['#f2c6a0', '#a86b45', '#ffd9b8', '#7a4a2c', '#e8b088'][i]; roundRect(-36, 40, 72, 420, 22); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -10, 78, 0, 7); ctx.fill(); picto(ctx, 'heart', 0, -4, 46, i % 2 ? '#ff3d9a' : '#7b2ff7'); ctx.restore(); }
  caption(t, T.votes + .25, T.win - .15, 'TOUT LE MONDE VOTE', { font: 'Lilita', size: 88, y: 1400, anim: 'pop', bg: '#ff3d9a' });
}
const CARDS = [['hat', '#7b2ff7'], ['shirt', '#ff3d9a'], ['cape', '#24b8e0']];
function shotWin(t) {                                     // résultats, podium des gagnants, récompenses
  showOnly(DECORS, gGala); lights(2.7, 1.35, '#ffe9c8', '#7a4a9a');
  const lt = t - T.win, R = t >= T.reward;
  place(dA, 0, 3.28 + Math.abs(Math.sin(lt * 6.5)) * .9, 0); poseCheer(dA, t); dress(dA, OUT.star, t);
  place(dB, -3.15, 2.48 + Math.abs(Math.sin(lt * 6.5 + 1)) * .25, 0, .2); poseCheer(dB, t * .7 + 1); dress(dB, OUT.cat, t);
  place(dC, 3.15, 1.88, 0, -.2); pose(dC, 1, t); dress(dC, OUT.dandy, t);
  gGala.sun.rotation.z = t * .25; trophy.rotation.y = t * 1.2; trophy.position.y = 10.2 + Math.sin(t * 2) * .25;
  balloons.forEach(b => { const u = b.userData; b.position.set(u.x + Math.sin(t * .8 + u.i) * .3, u.y + Math.sin(t * 1.1 + u.i * 2) * .5, u.z); });
  galaSpots.forEach((s, i) => s.rotation.set(-.2 + Math.sin(t * 1.2 + i) * .1, 0, (i ? 1 : -1) * (.33 + Math.sin(t * 1.6 + i * 2) * .14))); animDisco(disco2, t, 1.15);
  const [sx, sy] = shake(t, T.win, 20);
  if (!R) camLook(camera, [Math.sin(lt * .5) * 2, 5.6, lerp(15, 27.5, prog(t, T.win, T.win + 1.6, ease.out))], [0, lerp(6.2, 6.0, inv(T.win, T.win + 1.6, t)), 0], 42);
  else camLook(camera, [3.2 - (t - T.reward) * 1.6, 5.2, 28], [0, 7.3, 0], 42);
  bg(['#3a0b5e', '#a0257f', '#ffb347']); rays(t, { cy: 760, color: 'rgba(255,255,255,.07)' }); draw3D(scene, camera, { dx: sx, dy: sy }); vignette(.35);
  confetti(t, T.win, { cy: 620, n: 150, power: 1700, life: 3.4, colors: ['#ff3d9a', '#ffc93c', '#24e0d0', '#ffffff', '#9b5cff'] }); confetti(t, T.reward, { cy: 500, n: 80, power: 1200, life: 2.6 });
  if (!R) caption(t, T.win + .05, T.reward - .15, 'GAGNE LE DÉFILÉ !', { font: 'Lilita', size: 118, y: 1410, anim: 'slam', grad: ['#fff6a8', '#ffc93c'], stroke: '#3a0b5e', strokeW: 22 });
  else {
    CARDS.forEach(([k, col], i) => { const a = ease.back(inv(T.reward + .15 + i * .4, T.reward + .5 + i * .4, t)); if (a <= 0) return; const x = 240 + i * 300, y = 420 + Math.sin(t * 3 + i) * 10;
      ctx.save(); ctx.translate(x, y); ctx.rotate((i - 1) * .07); ctx.scale(a, a); ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-125, -150 + 10, 250, 310, 34); ctx.fill(); ctx.fillStyle = '#ffffff'; roundRect(-125, -150, 250, 310, 34); ctx.fill();
      ctx.fillStyle = col; roundRect(-107, -132, 214, 196, 24); ctx.fill(); picto(ctx, k, 0, -34, 66, '#ffffff'); ctx.restore();
      text('NOUVEAU', x + (i - 1) * -7, y + 108, { font: 'Lilita', size: 46 * a, color: col, rot: (i - 1) * .07 }); });
    caption(t, T.reward + .25, T.end - .15, 'DÉBLOQUE DE\nNOUVELLES PIÈCES', { font: 'Lilita', size: 88, y: 1400, anim: 'pop', bg: '#7b2ff7', lineH: 1.1 });
  }
}
function shotEnd(t) {                                     // écran final sur le podium de défilé
  showOnly(DECORS, gRun); lights(2.4, 1.2, '#e2c8ff', '#6a3a8a'); animRun(t, .8);
  const lt = t - T.end;
  [[dB, OUT.cat, -1.6, 2.5, 1], [dA, OUT.star, 0, 5.5, 0], [dC, OUT.dandy, 1.6, 2.5, 3]].forEach(([d, o, x, z, n], i) => { place(d, x, 1, z, (1 - i) * .25); pose(d, (n + Math.floor(lt / 1.5 + i * .3)) % 5, t); dress(d, o, t); });
  camLook(camera, [3 - lt * .5, 3.4 + lt * .1, 21 - lt * .35], [0, 9.2, 0], 44);
  clubBg(t); draw3D(scene, camera); fade(.42 * inv(T.end, T.end + .4, t), '#1a0b3a'); rays(t, { cy: 640, color: 'rgba(255,122,200,.10)' }); vignette(.45);
  sparkles(t, { n: 34, y: 230, h: 900, color: '#fff3b0', size: 16, seed: 8 });
  endCard(t, T.end + .15, { title: 'Costume Clash', tagline: 'Crée ton costume, défile, fais voter !', status: 'bientot', font: 'Pacifico', titleSize: 138, titleGrad: ['#fff6a8', '#ff8fd0'], titleStroke: '#3a0b5e', accent: '#ff3d9a', y: 790 });
}

function render(t) {
  if (t < T.theme) shotHook(t); else if (t < T.atelier) shotTheme(t); else if (t < T.runway) shotAtelier(t); else if (t < T.votes) shotRunway(t); else if (t < T.win) shotVotes(t); else if (t < T.end) shotWin(t); else shotEnd(t);
  wipe(t, T.theme, { color: C.pink, color2: C.gold, dur: .45 });
  wipe(t, T.atelier, { color: C.turq, color2: '#ffffff', dir: 'right', dur: .45 });
  flash(t, T.color, .22, '255,255,255', .7);
  wipe(t, T.runway, { color: C.violet, color2: C.pink, dir: 'up', dur: .45 });
  flash(t, T.poses, .25); flash(t, T.poses + 1.5, .22, '255,255,255', .8);
  wipe(t, T.votes, { color: C.gold, color2: C.pink, dur: .45 });
  flash(t, T.win, .45); flash(t, T.reward, .2, '255,240,180', .5); flash(t, T.end, .35, '255,122,200');
}

registerAd({ duration: DURATION, thumbTime: T.win + 1.9, render,
  music: { style: 'disco', bpm: 120, sections: [[0, 'build'], [T.theme, 'drop'], [T.atelier, 'drop'], [T.runway, 'drop2'], [T.votes, 'build'], [T.win, 'drop2']], end: T.end + 2 } });
