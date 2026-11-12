// Publicité « Sky Sprouts » : îles flottantes pastel, graines d'étoile, Sprouts, œufs, décoration.
// Statut du jeu : bientôt (jamais « disponible »). Tout est créé par le code, aucune ressource externe.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, rbox, torus, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseJump, poseHold, bushyTree, cloud, showOnly, glow, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, confetti, sparkles,
  text, caption, pill, bar, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Baloo', 'Inter']);
const BAR = 240 / 100;                       // 2,4 s par mesure (dreamy, 100 bpm)
const T = { hook: 0, catch: BAR, plant: 3 * BAR, dust: 5 * BAR, mut: 6.5 * BAR, egg: 8 * BAR, hatch: 9 * BAR, deco: 10 * BAR, trade: 11 * BAR, end: 12 * BAR };
const DURATION = 15 * BAR;                   // 36 s

// ---------- palette ----------
const C = { rose: '#ff6fb5', roseP: '#ffc4e4', lav: '#b79cff', violet: '#6a4be0', encre: '#3a2a78', ciel: '#8fd3ff', menthe: '#22b8a0', herbe: '#a6e89a', or: '#ffd84a', creme: '#fff6e0', orange: '#ff9f2e' };

// ---------- scène ----------
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(42);
const lights = addLights(scene, { sun: '#fff3e0', sunI: 2.4, sky: '#efe6ff', ground: '#d9b3e0', ambI: 1.35, dir: [7, 13, 9], shadowArea: 15 });

// ---------- briques de base ----------
const UNIT = new THREE.SphereGeometry(1, 28, 20), UNIT_LO = new THREE.SphereGeometry(1, 9, 6);
function blob(m, sx, sy, sz, x, y, z, geo = UNIT) {
  const me = new THREE.Mesh(geo, typeof m === 'string' ? mat(m, { rough: .6 }) : m);
  me.scale.set(sx, sy, sz); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}
const STAR_GEO = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .52 : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .18, bevelEnabled: true, bevelThickness: .14, bevelSize: .13, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -.09); return g;
})();
const GOLD = mat('#ffd84a', { rough: .3, emissive: '#ff9d00', emissiveI: .55 });
function star3D(s, m = GOLD) { const me = new THREE.Mesh(STAR_GEO, m); me.scale.setScalar(s); me.castShadow = true; return me; }
function sprig(color = '#56d06f', s = 1) {
  const g = new THREE.Group(); g.add(cyl(.05, .07, .45, '#3fae5a', { seg: 6, pos: [0, .22, 0] }));
  for (const d of [-1, 1]) { const p = new THREE.Group(); p.position.y = .42; p.rotation.z = d > 0 ? .55 : Math.PI - .55; p.add(blob(color, .34, .07, .2, .34, 0, 0)); g.add(p); }
  g.scale.setScalar(s); return g;
}

// ---------- graine d'étoile ----------
function makeSeed() {
  const g = new THREE.Group(), core = new THREE.Group(); g.add(core); g.core = core;
  core.add(star3D(.62));
  for (const d of [-1, 1]) { core.add(blob('#4a2f1a', .06, .085, .05, d * .17, .02, .25)); }
  core.add(blob('#ff9fb8', .07, .04, .03, -.31, -.1, .22)); core.add(blob('#ff9fb8', .07, .04, .03, .31, -.1, .22));
  const sp = sprig('#7be08a', .55); sp.position.y = .5; core.add(sp);
  const gl = glow('#ffe9a0', 3.2, .75); g.add(gl); g.halo = gl;
  return g;
}

// ---------- Sprouts (créatures) ----------
const RAINBOW = new THREE.MeshStandardMaterial({ roughness: .4, map: canvasTex(128, (c, n) => { const cols = ['#ff6b8b', '#ffa94d', '#ffe066', '#7be08a', '#6fc8ff', '#b79cff', '#ff8fd0']; cols.forEach((k, i) => { c.fillStyle = k; c.fillRect(0, i * n / 7, n, n / 7 + 1); }); }) });
RAINBOW.emissive = new THREE.Color('#ffffff'); RAINBOW.emissiveMap = RAINBOW.map; RAINBOW.emissiveIntensity = .22;
const HALF_GEO = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
function makeSprout({ body = '#9be7a8', belly = '#f1fff0', kind = 'leaf', leafC = '#56d06f', acc = '#ffffff', mut = null } = {}) {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.body = b; g.eyes = [];
  let bm = mat(body, { rough: .55 }), geo = UNIT, cheek = '#ff9fb8';
  if (mut === 'gold') { bm = mat('#ffcf3a', { rough: .22, metal: .3, emissive: '#d68a00', emissiveI: .5 }); belly = '#fff2a8'; leafC = '#ffe680'; acc = '#fff2a8'; body = '#ffcf3a'; }
  if (mut === 'rainbow') { bm = RAINBOW; belly = '#ffffff'; body = '#ff8fd0'; }
  if (mut === 'crystal') { bm = mat('#aeeeff', { rough: .12, flat: true, emissive: '#3aa8e0', emissiveI: .4 }); geo = UNIT_LO; belly = '#e8fbff'; leafC = '#8fe6ff'; body = '#8fdcff'; acc = '#e8fbff'; }
  const CY = .98;
  b.add(blob(bm, 1, .94, .96, 0, CY, 0, geo));
  if (mut !== 'crystal') b.add(blob(mat(belly, { rough: .7 }), .66, .6, .5, 0, .72, .5));
  const on = (dx, dy, dz, k = 1) => { const l = Math.hypot(dx, dy, dz); return [dx / l * k, CY + dy / l * k * .94, dz / l * k * .96]; };
  for (const d of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(...on(d * .36, .2, .9, .95)); e.add(blob(mat('#2a1c3d', { rough: .2 }), .17, .21, .12, 0, 0, 0)); e.add(blob(mat('#ffffff', { emissive: '#ffffff', emissiveI: .6 }), .065, .065, .05, d * .02 + .05, .08, .1)); b.add(e); g.eyes.push(e);
    const ck = on(d * .64, -.1, .76, 1); b.add(blob(cheek, .15, .1, .06, ck[0], ck[1], ck[2]));
    b.add(blob(body, .27, .15, .36, d * .42, .13, .3));                                   // pieds
    const arm = blob(body, .17, .24, .17, d * .97, .82, .22); b.add(arm);                  // petits bras
  }
  const mo = on(0, -.08, 1, 1.0); b.add(blob('#8a2f52', .1, .07, .05, mo[0], mo[1], mo[2]));
  let top = 1.9, sp = 1;
  if (kind === 'bunny') { for (const d of [-1, 1]) { const e = blob(body, .2, .62, .14, d * .38, 2.25, -.05); e.rotation.z = -d * .2; b.add(e); const i = blob('#ffc4e4', .11, .45, .06, d * .38, 2.25, .06); i.rotation.z = -d * .2; b.add(i); } sp = .75; }
  else if (kind === 'cat') { for (const d of [-1, 1]) { const e = cone(.32, .55, body, { seg: 4, pos: [d * .55, 1.82, 0], rot: [0, Math.PI / 4, -d * .4] }); b.add(e); } sp = .8; b.add(cone(.16, .9, acc, { seg: 8, pos: [0, .55, -1.05], rot: [-1.2, 0, 0] })); }
  else if (kind === 'cloud') { for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; b.add(blob('#ffffff', .36, .3, .36, Math.cos(a) * .86, .42, Math.sin(a) * .8)); } for (const [x, y, z, r] of [[-.35, 1.85, 0, .3], [.3, 1.9, .05, .34], [0, 2.05, -.1, .3]]) b.add(blob('#ffffff', r, r, r, x, y, z)); top = 2.25; sp = .8; }
  else if (kind === 'star') { const s = star3D(1.75, mat(acc, { rough: .4, emissive: '#ffb300', emissiveI: .35 })); s.position.set(0, 1.02, -.3); b.add(s); sp = .9; }
  else if (kind === 'moon') { const m = new THREE.Mesh(new THREE.TorusGeometry(.48, .12, 10, 20, Math.PI * 1.25), mat(acc, { rough: .3, emissive: '#ffd84a', emissiveI: .5 })); m.rotation.z = Math.PI * .875; m.position.set(0, 2.25, 0); m.castShadow = true; b.add(m); sp = 0; const st = star3D(.2); st.position.set(0, 2.3, 0); b.add(st); }
  else if (kind === 'mush') { const cap = new THREE.Mesh(HALF_GEO, mat(acc, { rough: .5 })); cap.scale.set(1.32, .9, 1.32); cap.position.y = 1.42; cap.castShadow = true; b.add(cap); b.add(cyl(1.3, 1.3, .08, '#fff3e0', { pos: [0, 1.42, 0] }));
    for (const [a, e] of [[.3, .5], [1.6, .75], [2.9, .45], [4.2, .8], [5.3, .5], [0, 1.4]]) b.add(blob('#ffffff', .17, .1, .17, Math.cos(a) * Math.cos(e) * 1.3, 1.42 + Math.sin(e) * .9, Math.sin(a) * Math.cos(e) * 1.3)); top = 2.3; sp = .7; }
  else if (kind === 'dragon') { for (const d of [-1, 1]) { b.add(cone(.15, .5, '#fff3c4', { seg: 8, pos: [d * .42, 1.98, .05], rot: [0, 0, -d * .3] })); const w = new THREE.Group(); w.position.set(d * .8, 1.25, -.55); w.rotation.set(0, -d * .5, d * .35); w.add(blob(acc, .62, .42, .07, d * .55, .25, 0)); w.add(blob(acc, .4, .3, .06, d * .5, -.2, 0)); b.add(w); (g.wings ||= []).push(w); }
    for (let i = 0; i < 3; i++) b.add(cone(.14, .32, acc, { seg: 6, pos: [0, 1.7 - i * .42, -.62 - i * .22], rot: [-.7 - i * .4, 0, 0] })); b.add(cone(.2, 1.0, body, { seg: 8, pos: [0, .5, -1.1], rot: [-1.25, 0, 0] })); const st = star3D(.2); st.position.set(...on(0, .62, .8, 1.02)); b.add(st); sp = .7; top = 1.95; }
  else sp = 1.25;
  if (sp) { const s = sprig(leafC, sp); s.position.y = top; b.add(s); g.sprig = s; }
  return g;
}
function put(sp, x, y, z, ry = 0, s = .85) { sp.visible = true; sp.position.set(x, y, z); sp.rotation.set(0, ry, 0); sp.scale.setScalar(s); sp.body.scale.set(1, 1, 1); sp.body.rotation.set(0, 0, 0); }
function hop(sp, t, amp = .45, freq = 6, ph = 0) { const s = Math.sin(t * freq + ph); sp.position.y += Math.max(0, s) * amp; const q = s < 0 ? 1 + s * .14 : 1 + s * .07, r = 1 / Math.sqrt(q); sp.body.scale.set(r, q, r); }
function live(sp, t, i) { const ph = (t * .42 + hash(i * 3.1) * 5) % 1, k = ph < .045 ? .12 : 1; for (const e of sp.eyes) e.scale.y = k; if (sp.sprig) sp.sprig.rotation.z = Math.sin(t * 5 + i) * .18; if (sp.wings) sp.wings.forEach((w, j) => w.rotation.y = (j ? .5 : -.5) * (1 + Math.sin(t * 14) * .5)); }

// ---------- île flottante ----------
function flower(color, h = .5) { const g = new THREE.Group(); g.add(cyl(.035, .035, h, '#4fbf62', { seg: 5, pos: [0, h / 2, 0], cast: false })); g.add(blob(color, .2, .07, .2, 0, h, 0)); g.add(blob('#fff2a0', .09, .09, .09, 0, h + .04, 0)); return g; }
function makeIsland(r, { grass = '#a6e89a', rim = '#86d68c', rock = '#c3a3e6', rock2 = '#a184d1', deep = 1.35, seed = 1, flowers = 8 } = {}) {
  const g = new THREE.Group();
  g.add(cyl(r, r * .97, .5, grass, { seg: 40, pos: [0, -.25, 0], rough: .95 }));
  g.add(cyl(r * 1.03, r * .86, .55, rim, { seg: 40, pos: [0, -.74, 0] }));
  g.add(cone(r * .9, r * deep, rock, { seg: 9, flat: true, rot: [Math.PI, seed, 0], pos: [0, -1 - r * deep / 2, 0] }));
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + seed, rr = r * (.45 + hash(i + seed) * .25), hh = r * (.5 + hash(i * 3 + seed) * .5); g.add(cone(r * (.22 + hash(i * 7 + seed) * .12), hh, i % 2 ? rock2 : rock, { seg: 6, flat: true, rot: [Math.PI, a, 0], pos: [Math.cos(a) * rr, -1 - hh / 2, Math.sin(a) * rr] })); }
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + seed * 2; g.add(cone(r * .05, r * .22, '#ff9fd8', { seg: 5, flat: true, emissive: '#ff5fb0', emissiveI: .7, rot: [Math.PI, 0, 0], pos: [Math.cos(a) * r * .7, -1.1 - r * .1, Math.sin(a) * r * .7] })); }
  for (let i = 0; i < 3; i++) { const a = i * 2.2 + seed; const p = ball(r * (.06 + hash(i + seed * 9) * .05), rock2, { seg: 6, seg2: 5, flat: true }); p.position.set(Math.cos(a) * r * 1.15, -r * (.35 + hash(i * 5 + seed) * .5), Math.sin(a) * r * 1.0); g.add(p); }
  const fc = ['#ff8fc7', '#ffffff', '#ffd84a', '#b79cff', '#ff9f6b'];
  for (let i = 0; i < flowers; i++) { const a = hash(i * 2.3 + seed) * 6.283, rr = r * (.72 + hash(i * 5.1 + seed) * .22); const f = flower(fc[i % 5], .3 + hash(i) * .3); f.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); g.add(f); }
  return g;
}

// ---------- décor commun : ciel lointain ----------
const far = new THREE.Group(); scene.add(far);
const farIsles = [[-17, 5, -24, 3.2], [16, 10, -30, 3.6], [-13, -7, -18, 2.4], [19, -5, -22, 2.8], [2, 17, -44, 4], [-24, 15, -38, 3.4]].map(([x, y, z, r], i) => {
  const il = makeIsland(r, { seed: i + 3, flowers: 3, grass: i % 2 ? '#b4ecc4' : '#a6e89a' }); const tr = bushyTree(r * .9, ['#ffb3d9', '#c9a6ff', '#9be7d0'][i % 3], '#b08968'); tr.position.set(-r * .2, 0, 0); il.add(tr);
  il.position.set(x, y, z); il.userData = { y, i }; far.add(il); return il;
});
const clouds = [[-9, 9, -16, 1.5], [10, 4, -14, 1.3], [-14, -3, -10, 1.8], [13, 14, -26, 2.2], [0, -9, -8, 2.4], [-6, 20, -30, 2], [22, 2, -30, 2.4], [-24, 2, -28, 2.2], [7, -12, -16, 2]].map(([x, y, z, s], i) => {
  const c = cloud(s, i % 3 === 1 ? '#ffe3f2' : '#ffffff'); c.position.set(x, y, z); c.userData = { x, i }; far.add(c); return c;
});

// ---------- île du joueur ----------
const home = new THREE.Group(); scene.add(home);
home.add(makeIsland(7, { seed: 1, flowers: 14 }));
{ const t1 = bushyTree(4.6, '#ffb3d9', '#b08968'); t1.position.set(-4.9, 0, -3.5); home.add(t1); const t2 = bushyTree(5.2, '#c9a6ff', '#b08968'); t2.position.set(5, 0, -3.7); home.add(t2); const t3 = bushyTree(2.6, '#9be7d0', '#b08968'); t3.position.set(-5.9, 0, .4); home.add(t3); }
// fontaine d'étoiles (cristal violet)
const fountain = new THREE.Group(); fountain.position.set(0, 0, -1.6); home.add(fountain);
fountain.add(cyl(1.75, 1.95, .55, '#c9b6ff', { pos: [0, .27, 0], rough: .35 })); fountain.add(torus(1.72, .14, '#e6dbff', { rot: [Math.PI / 2, 0, 0], pos: [0, .56, 0] }));
const dustPool = cyl(1.6, 1.6, .08, '#ffe27a', { pos: [0, .52, 0], emissive: '#ffb300', emissiveI: .8, rough: .3, cast: false }); fountain.add(dustPool);
fountain.add(cyl(.28, .42, 1.5, '#b79cff', { pos: [0, 1.25, 0], rough: .3 })); fountain.add(cyl(.95, .5, .36, '#c9b6ff', { pos: [0, 2.1, 0], rough: .35 }));
fountain.add(cyl(.82, .82, .06, '#ffe27a', { pos: [0, 2.27, 0], emissive: '#ffb300', emissiveI: .8, cast: false }));
const fCrystal = new THREE.Group(); fCrystal.position.y = 3.05; fountain.add(fCrystal);
fCrystal.add(cone(.36, .7, '#d4b8ff', { seg: 6, flat: true, emissive: '#8a5cff', emissiveI: .6, pos: [0, .35, 0] })); fCrystal.add(cone(.36, .45, '#d4b8ff', { seg: 6, flat: true, emissive: '#8a5cff', emissiveI: .6, pos: [0, -.22, 0], rot: [Math.PI, 0, 0] }));
const fGlow = glow('#ffe9a0', 5, .5); fGlow.position.y = 2.6; fountain.add(fGlow);
// parcelles
const PLOTS = [[-3.1, 2.3], [0, 2.9], [3.1, 2.3]];
const sprigs = PLOTS.map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0, z); p.add(rbox(2.3, 2.3, .34, .16, '#d6a06a', { rot: [Math.PI / 2, 0, 0], pos: [0, .17, 0] })); p.add(cyl(.95, .95, .1, '#7a5540', { pos: [0, .33, 0], seg: 20, rough: 1 })); p.add(cyl(.5, .7, .16, '#8a6248', { pos: [0, .4, 0], seg: 14, rough: 1 })); home.add(p);
  const s = sprig('#7be08a', 1.6); s.position.set(x, .45, z); home.add(s); return s; });
// décorations (apparaissent une à une dans le plan « décore »)
const decos = [];
function deco(g, x, y, z, ry = 0) { g.position.set(x, y, z); g.rotation.y = ry; home.add(g); decos.push(g); return g; }
{ // arche fleurie
  const a = new THREE.Group(); for (const d of [-1, 1]) a.add(cyl(.16, .2, 3, '#fff6e0', { pos: [d * 1.7, 1.5, 0], seg: 10 }));
  const arc = new THREE.Mesh(new THREE.TorusGeometry(1.7, .17, 10, 24, Math.PI), mat('#fff6e0')); arc.position.y = 3; arc.castShadow = true; a.add(arc);
  for (let i = 0; i < 9; i++) { const an = i / 8 * Math.PI; a.add(blob(['#ff8fc7', '#ffd84a', '#b79cff'][i % 3], .26, .26, .26, Math.cos(an) * 1.7, 3 + Math.sin(an) * 1.7, .12)); }
  const st = star3D(.5); st.position.set(0, 5.15, 0); a.add(st); deco(a, 0, 0, -5.3);
}
function lamp() { const g = new THREE.Group(); g.add(cyl(.09, .13, 2.6, '#8f7bd6', { pos: [0, 1.3, 0], seg: 8 })); g.add(cyl(.3, .22, .12, '#8f7bd6', { pos: [0, .06, 0], seg: 10 })); const s = star3D(.45); s.position.y = 3; g.add(s); const gl = glow('#ffe9a0', 2.6, .7); gl.position.y = 3; g.add(gl); return g; }
deco(lamp(), -4.9, 0, 2.2); deco(lamp(), 4.9, 0, 2.2);
{ // fanions entre deux mâts
  const g = new THREE.Group(); for (const d of [-1, 1]) { g.add(cyl(.1, .12, 5.4, '#fff6e0', { pos: [d * 5.3, 2.7, 0], seg: 8 })); g.add(blob('#ffd84a', .2, .2, .2, d * 5.3, 5.5, 0)); }
  for (let i = 0; i < 13; i++) { const u = i / 12, x = lerp(-5.1, 5.1, u), y = 5.25 - Math.sin(u * Math.PI) * 1.25; g.add(cone(.3, .55, ['#ff8fc7', '#8fd3ff', '#ffd84a', '#9df0c8', '#b79cff'][i % 5], { seg: 3, pos: [x, y, 0], rot: [Math.PI, 0, 0] })); }
  deco(g, 0, 0, -2.9);
}
{ // banc
  const g = new THREE.Group(); g.add(rbox(1.9, .16, .7, .06, '#ffb3d9', { pos: [0, .62, 0] })); g.add(rbox(1.9, .7, .14, .06, '#ffb3d9', { pos: [0, 1.05, -.3] })); for (const d of [-1, 1]) g.add(box(.14, .6, .6, '#fff6e0', { pos: [d * .78, .3, 0] })); deco(g, -4.3, 0, -.9, .9);
}
{ // statue étoile
  const g = new THREE.Group(); g.add(cyl(.6, .75, .5, '#e6dbff', { pos: [0, .25, 0], seg: 8 })); g.add(cyl(.4, .5, .5, '#d4c4ff', { pos: [0, .75, 0], seg: 8 })); const s = star3D(.85); s.position.y = 1.95; g.add(s); g.star = s; deco(g, 4.4, 0, -.9);
}
{ // petite clôture à l'arrière + massifs de fleurs
  const g = new THREE.Group(); for (let i = 0; i < 11; i++) { const a = Math.PI * (1.12 + i * .076), x = Math.cos(a) * 6.4, z = Math.sin(a) * 6.4; g.add(rbox(.2, .9, .2, .06, '#fff6e0', { pos: [x, .45, z] })); g.add(blob('#ffc4e4', .14, .14, .14, x, .95, z)); } deco(g, 0, 0, 0);
  const f = new THREE.Group(); const fc = ['#ff8fc7', '#ffd84a', '#ffffff', '#b79cff']; for (let i = 0; i < 16; i++) { const fl = flower(fc[i % 4], .35 + hash(i) * .3); const side = i % 2 ? 1 : -1; fl.position.set(side * (1.3 + hash(i * 3) * .6), 0, 4.6 + hash(i * 7) * 1.4); f.add(fl); } deco(f, 0, 0, 0);
}

// ---------- créatures, graines, joueurs (réserves déplacées à chaque plan) ----------
const sprouts = [
  makeSprout({ body: '#9be7a8', kind: 'leaf' }),
  makeSprout({ body: '#ffb3d9', belly: '#fff0f7', kind: 'bunny' }),
  makeSprout({ body: '#bfe6ff', belly: '#ffffff', kind: 'cloud', leafC: '#7be08a' }),
  makeSprout({ body: '#ffe27a', belly: '#fffbe0', kind: 'star', acc: '#ffc43a' }),
  makeSprout({ body: '#c9b0ff', belly: '#f6efff', kind: 'cat', acc: '#c9b0ff' }),
  makeSprout({ body: '#fff0e0', belly: '#ffffff', kind: 'mush', acc: '#ff7fa8' }),
  makeSprout({ body: '#8fb8ff', belly: '#eaf2ff', kind: 'moon', acc: '#fff2a8' }),
  makeSprout({ body: '#ffb089', belly: '#fff0e6', kind: 'leaf', leafC: '#ffd84a' }),
];
const legend = makeSprout({ body: '#ff8fb0', belly: '#fff2c9', kind: 'dragon', acc: '#ffd84a' });
sprouts.forEach(s => scene.add(s)); scene.add(legend);
const legGlow = glow('#fff2a0', 9, .0); scene.add(legGlow);
const seeds = Array.from({ length: 9 }, () => { const s = makeSeed(); scene.add(s); return s; });
const dust = Array.from({ length: 40 }, () => { const s = star3D(.17); s.castShadow = false; scene.add(s); return s; });
const hero = makeCharacter({ shirt: '#ff8fc7', pants: '#5b4bb5', hair: '#5a3a2a', face: 'happy', scale: .8 }); scene.add(hero);
const friend = makeCharacter({ shirt: '#6fd6c0', pants: '#3d4a8a', hat: 'cap', hatColor: '#ffd84a', face: 'happy', scale: .8 }); scene.add(friend);

// ---------- plan « mutations » ----------
const gMut = new THREE.Group(); scene.add(gMut);
const MUT = [['gold', 'bunny', 'DORÉE', '#ffb300', '#3a2a78'], ['rainbow', 'cloud', 'ARC-EN-CIEL', '#ff6fb5', '#ffffff'], ['crystal', 'cat', 'CRISTAL', '#3ab8e8', '#ffffff']];
const MUTY = [1.6, -1.4, 1.6];
const muts = MUT.map(([m, k], i) => {
  const x = (i - 1) * 2.75, il = makeIsland(1.45, { seed: i + 11, flowers: 4, deep: 1.1 }); il.position.set(x, MUTY[i], 0); gMut.add(il);
  const gl = glow(['#ffe27a', '#ffb3e6', '#a8ecff'][i], 7, .0); gl.position.set(x, MUTY[i] + 1, -1.2); gMut.add(gl);
  const s = makeSprout({ kind: k, mut: m, acc: '#c9b0ff' }); gMut.add(s); s.userData = { x, gl }; return s;
});

// ---------- plan « œuf » ----------
const gEgg = new THREE.Group(); scene.add(gEgg);
gEgg.add(makeIsland(3.6, { seed: 21, flowers: 9 }));
{ const n = torus(1.25, .36, '#e3c08a', { rot: [Math.PI / 2, 0, 0], pos: [0, .3, 0], flat: true, seg: 14 }); gEgg.add(n); gEgg.add(cyl(1.2, 1.2, .2, '#c9a06a', { pos: [0, .2, 0], seg: 14 }));
  for (let i = 0; i < 10; i++) { const a = i * .63; gEgg.add(cyl(.04, .04, .9, '#f0d6a0', { seg: 4, pos: [Math.cos(a) * 1.3, .5, Math.sin(a) * 1.3], rot: [hash(i) * 2, a, 1.2] })); } }
const EGG_MAT = new THREE.MeshStandardMaterial({ roughness: .35, side: THREE.DoubleSide, map: canvasTex(256, (c, n) => {
  c.fillStyle = '#fff3dc'; c.fillRect(0, 0, n, n); const cols = ['#ffb3d9', '#b79cff', '#8fd3ff', '#ffd84a'];
  for (let i = 0; i < 26; i++) { const x = hash(i * 3.3) * n, y = n * (.12 + hash(i * 7.7) * .76), r = n * (.03 + hash(i * 1.9) * .035); c.fillStyle = cols[i % 4]; c.save(); c.translate(x, y); c.scale(.5, 1); c.beginPath();
    if (i % 3 === 0) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .7 : r * 1.5; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } } else c.arc(0, 0, r, 0, 7);
    c.fill(); c.restore(); }
}) });
EGG_MAT.emissive = new THREE.Color('#ffe9a0'); EGG_MAT.emissiveIntensity = 0;
const eggPivot = new THREE.Group(); eggPivot.position.set(0, .45, 0); gEgg.add(eggPivot);
const eggIn = new THREE.Group(); eggIn.scale.set(1.12, 1.45, 1.12); eggIn.position.y = 1.45; eggPivot.add(eggIn);
const eggTop = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI * .46), EGG_MAT), eggBot = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, Math.PI * .46, Math.PI * .54), EGG_MAT);
eggTop.castShadow = eggBot.castShadow = true; eggIn.add(eggTop, eggBot);
const eggSeam = torus(.995, .035, '#fff7c0', { rot: [Math.PI / 2, 0, 0], pos: [0, Math.cos(Math.PI * .46), 0], emissive: '#ffe066', emissiveI: 2, cast: false }); eggIn.add(eggSeam);
const eggGlow = glow('#fff2a0', 8, 0); eggGlow.position.set(0, 2, -.5); gEgg.add(eggGlow);

// ---------- outils 2D ----------
const _v = new THREE.Vector3();
function scr(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x * .5 + .5) * W, (-_v.y * .5 + .5) * H]; }
function star2D(x, y, r, rot, color, alpha = 1) { ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .5 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function burst(t, at, x, y, { n = 12, color = '#fff2a0', r = 170, dur = .6, size = 22 } = {}) { const k = inv(at, at + dur, t); if (t < at || k >= 1) return; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + hash(i + at) * .5, d = ease.out(k) * r * (.6 + hash(i * 3 + at) * .6); star2D(x + Math.cos(a) * d, y + Math.sin(a) * d, size * (1 - k) * (.6 + hash(i * 7) * .7), k * 3 + i, i % 3 ? color : '#ffffff', 1 - k * k); } }
function streaks(t, alpha = 1, n = 7) { ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const per = 1.5 + hash(i * 3.7) * 1.4, c = t / per + hash(i * 9.1), u = c % 1, cyc = Math.floor(c); const x0 = 80 + hash(i * 5 + cyc * 13) * (W + 200), x = x0 - u * 420, y = -120 + u * (H * .95), a = alpha * Math.sin(u * Math.PI);
    const g = ctx.createLinearGradient(x, y, x + 150, y - 340); g.addColorStop(0, `rgba(255,246,190,${.8 * a})`); g.addColorStop(1, 'rgba(255,246,190,0)'); ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 150, y - 340); ctx.stroke(); star2D(x, y, 15, t * 3 + i, '#fff6be', a); }
  ctx.restore(); }
function sunDisc(x, y, r, color, a = 1) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(.25, `rgba(${color},${a * .55})`); g.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
function hud(label, value, x = SAFE.cx, y = 290, bgc = 'rgba(58,42,120,.88)') { const w = pill('     ' + label + '  ' + value, x, y, { size: 52, bg: bgc, color: '#ffffff', border: '#ffe27a', borderW: 5 }); star2D(x - w / 2 + 62, y, 27, 0, '#ffd84a'); }
function setLight(sunI, ambI, skyC = '#efe6ff', sunC = '#fff3e0') { lights.sun.intensity = sunI; lights.hemi.intensity = ambI; lights.hemi.color.set(skyC); lights.sun.color.set(sunC); }

// ---------- repères temporels des actions ----------
const catchT = [T.catch + 1.25, T.catch + 2.55, T.catch + 3.85], catchX = [-2.5, 2.3, -.3], HZ = 4.4;
const plantT = [T.plant + .55, T.plant + 1.1, T.plant + 1.65], GROW = 1.35;      // graine posée -> pousse -> Sprout
const mutT = [T.mut + .25, T.mut + .95, T.mut + 1.65];
const decoT = decos.map((_, i) => T.deco + .2 + i * .26);
const swapT = T.trade + .7;

// ---------- sons ----------
cue(0, 'chime'); cue(.05, 'whoosh', .6); cue(.5, 'sweepdown', .5); cue(1.1, 'chime', .7); cue(1.7, 'sweepdown', .4);
cue(T.catch, 'swish'); catchT.forEach((c, i) => { cue(c - .38, 'boing', .6); cue(c, 'coin'); cue(c + .08, 'ding', .6); });
cue(T.plant - .15, 'whoosh'); plantT.forEach(p => { cue(p, 'thud', .5); cue(p + .15, 'slide', .4); cue(p + GROW, 'pop'); cue(p + GROW + .08, 'chime', .6); });
cue(T.dust, 'powerup', .7); for (let i = 0; i < 7; i++) cue(T.dust + .5 + i * .4, 'coin', .45); cue(T.dust + 1.2, 'bubble', .5);
cue(T.mut - .2, 'sweepdown'); mutT.forEach((m, i) => { cue(m, 'pop'); cue(m + .05, ['ding', 'chime', 'glass'][i], .8); });
cue(T.egg, 'swish'); for (let i = 0; i < 5; i++) cue(T.egg + .5 + i * .36, 'tick', .5 + i * .1); cue(T.egg + .6, 'riser', .8, T.hatch - T.egg - .65); cue(T.hatch - .5, 'crunch', .7); cue(T.hatch - .2, 'crunch', .9);
cue(T.hatch, 'boom', .8); cue(T.hatch + .02, 'win'); cue(T.hatch + .3, 'chime'); cue(T.hatch + 1.2, 'boing', .5);
cue(T.deco - .15, 'whoosh'); decoT.forEach((d, i) => cue(d, i % 2 ? 'pop' : 'tap', .7));
cue(T.trade, 'swish', .7); cue(swapT, 'whoosh', .6); cue(swapT + .75, 'ding'); cue(swapT + .8, 'pop', .7);
cue(T.end, 'impact', .7); cue(T.end + .1, 'chime'); cue(T.end + .6, 'pop', .6); cue(T.end + .95, 'bell', .6); cue(T.end + 2.4, 'chime', .5); cue(T.end + 4.8, 'chime', .4);

// ---------- états communs ----------
function reset(t) {
  for (const s of sprouts) s.visible = false; legend.visible = false; legGlow.material.opacity = 0;
  for (const s of seeds) s.visible = false; for (const d of dust) d.visible = false; for (const s of sprigs) s.visible = false;
  hero.visible = friend.visible = false; home.visible = true; gMut.visible = gEgg.visible = false; far.visible = true;
  for (const d of decos) d.visible = false;
  for (const il of farIsles) { il.position.y = il.userData.y + Math.sin(t * .7 + il.userData.i * 2) * .5; il.rotation.y = t * .05 + il.userData.i; }
  for (const c of clouds) c.position.x = c.userData.x + Math.sin(t * .25 + c.userData.i) * 1.5 + t * .12;
  fCrystal.rotation.y = t * 1.5; fCrystal.position.y = 3.05 + Math.sin(t * 2.4) * .12; fGlow.material.opacity = .35 + Math.sin(t * 3) * .1;
  home.position.y = Math.sin(t * .9) * .12;
  sprouts.forEach((s, i) => live(s, t, i)); live(legend, t, 9); muts.forEach((s, i) => live(s, t, i + 12));
}
function seedAt(s, x, y, z, t, i, sc = 1) { s.visible = true; s.position.set(x, y, z); s.scale.setScalar(sc); s.core.rotation.set(0, Math.sin(t * 3 + i) * .5, Math.sin(t * 2.2 + i * 2) * .35); s.halo.material.opacity = .6 + Math.sin(t * 9 + i) * .15; }
function rain(t, n, { speed = 7, zMin = -5, zMax = 3, xr = 9, top = 24, span = 34, from = 0 } = {}) {
  for (let i = from; i < from + n; i++) { const u = ((t * speed + hash(i * 4.3) * span) % span); const x = (hash(i * 2.9 + 1) - .5) * 2 * xr - u * .12, z = lerp(zMin, zMax, hash(i * 6.1)); seedAt(seeds[i], x, top - u, z, t, i, .9); }
}
function heroX(t) { let x = .8, t0 = T.catch; for (let i = 0; i < 3; i++) { const t1 = catchT[i] - .12; if (t < t1) return lerp(x, catchX[i], ease.io(inv(t0, t1, t))); x = catchX[i]; t0 = catchT[i] + .3; } return x; }

// ================================================================== rendu
function render(t) {
  reset(t);
  const P = t < T.catch ? 'hook' : t < T.plant ? 'catch' : t < T.dust ? 'plant' : t < T.mut ? 'dust' : t < T.egg ? 'mut' : t < T.deco ? 'egg' : t < T.end ? 'deco' : 'end';
  let sx = 0, sy = 0;

  // ---------------- 3D ----------------
  if (P === 'hook') {
    setLight(2.4, 1.35);
    const k = prog(t, 0, T.catch, ease.io);
    camLook(camera, [lerp(-7, 2, k), lerp(-3.5, 3.5, k), lerp(27, 24, k)], [0, lerp(4.2, 3.4, k), 0], 44);
    rain(t, 8, { speed: 8, zMin: -4, zMax: 6, xr: 7, top: 20, span: 26 });
    const hs = Math.max(.6, 13 - t * 9.5 + 0); seedAt(seeds[8], .3 + Math.max(0, 1.3 - t) * 1.2, hs + (t > 1.3 ? Math.abs(Math.sin((t - 1.3) * 7)) * .5 * (1 - inv(1.3, 2.3, t)) : 0), 5, t, 8, 1.15);
    [[0, -2.3, 4.4], [1, 2.4, 4.3], [3, -.2, 3.2]].forEach(([id, x, z], i) => { put(sprouts[id], x, 0, z, (i - 1) * -.3); hop(sprouts[id], t, .55, 7, i * 1.3); sprouts[id].body.rotation.x = -.28; });
  } else if (P === 'catch') {
    setLight(2.5, 1.35);
    const hx = heroX(t), lt = t - T.catch;
    hero.visible = true; let jy = 0, jk = 0, caught = 0;
    catchT.forEach((c, i) => { const d = (t - c) / .4; if (Math.abs(d) < 1) { jy = 1.5 * (1 - d * d); jk = 1 - Math.abs(d); } if (t >= c) caught++; });
    hero.position.set(hx, jy, HZ); const nxt = catchX[Math.min(caught, 2)], moving = caught < 3 && Math.abs(nxt - hx) > .08;
    hero.rotation.y = moving ? Math.sign(nxt - hx) * .9 : 0;
    if (jk > 0) { poseWalk(hero, 0, 0); poseJump(hero, clamp(jk * 2.5)); } else if (moving) poseWalk(hero, t * 13, .8); else if (caught >= 3) poseCheer(hero, t); else poseIdle(hero, t);
    if (caught >= 3) hero.position.y = Math.abs(Math.sin((t - catchT[2]) * 7)) * .5 * inv(catchT[2] + .4, catchT[2] + .5, t) + jy;
    catchT.forEach((c, i) => { const u = inv(c - 1.5, c, t); if (t > c - 1.5 && t < c) seedAt(seeds[i], catchX[i] + (1 - u) * 2.2 * (i % 2 ? 1 : -1), lerp(19, 6.3, u), HZ, t, i, 1.1); });
    rain(t, 5, { from: 3, speed: 6, zMin: -8, zMax: -1, xr: 8 });
    [[2, -4.6, 1.2], [4, 4.7, .9]].forEach(([id, x, z], i) => { put(sprouts[id], x, 0, z, i ? -.5 : .5, .8); hop(sprouts[id], t, .3, 6, i * 2); });
    camLook(camera, [2.5 + hx * .35, 4.2 + lt * .15, 23.5], [hx * .55, 2.6, HZ], 42);
  } else if (P === 'plant') {
    setLight(2.5, 1.4, '#e6fff2');
    const k = prog(t, T.plant, T.dust, ease.io);
    camLook(camera, [lerp(-3.5, 2.5, k), lerp(8.5, 6.5, k), lerp(19, 17.5, k)], [0, .6, 1.8], 40);
    plantT.forEach((p, i) => {
      const [x, z] = PLOTS[i], id = [0, 1, 3][i], sp = sprouts[id];
      if (t < p) { const u = inv(p - .5, p, t); if (u > 0) seedAt(seeds[i], x, lerp(9, .7, ease.in(u)), z, t, i, 1); }
      else if (t < p + GROW) { const g = inv(p, p + GROW, t), s = sprigs[i]; s.visible = true; s.scale.setScalar(1.7 * (.15 + .85 * ease.out(g)) * (1 + Math.sin(t * 16) * .05)); s.rotation.z = Math.sin(t * 9 + i) * .12 * g; seedAt(seeds[i], x, .55, z, t, i, 1 - g * .75); seeds[i].visible = g < .5; }
      else { put(sp, x, .42, z, 0, .85 * ease.back(inv(p + GROW, p + GROW + .35, t))); hop(sp, t, .5, 7, i * 1.1); }
    });
    hero.visible = true; hero.position.set(-5.2, 0, 4.2); hero.rotation.y = .8; t > plantT[2] + GROW ? poseCheer(hero, t) : poseIdle(hero, t);
    rain(t, 3, { from: 5, speed: 5, zMin: -10, zMax: -5, xr: 9 });
  } else if (P === 'dust') {
    setLight(2.3, 1.3, '#ffe9d6', '#ffe2b8');
    const k = prog(t, T.dust, T.mut, ease.io), a = lerp(-.55, .25, k);
    camLook(camera, [Math.sin(a) * 21, lerp(9.5, 8, k), Math.cos(a) * 21 + .5], [0, 1.1, .6], 40);
    const src = [[0, PLOTS[0][0], .42, PLOTS[0][1]], [1, PLOTS[1][0], .42, PLOTS[1][1]], [3, PLOTS[2][0], .42, PLOTS[2][1]], [5, -3.5, 0, -.8], [6, 3.5, 0, -.8]];
    src.forEach(([id, x, y, z], i) => { put(sprouts[id], x, y, z, Math.atan2(-x, 6 - z) * .4); hop(sprouts[id], t, .35, 8, i * 1.4); });
    const lt = t - T.dust;
    dust.forEach((d, i) => { const s = src[i % 5], u = (lt * .75 + hash(i * 1.7)) % 1; if (lt * .75 + hash(i * 1.7) < 1 && u > lt * .75 + .0001) return; if (lt * .75 < 1 - hash(i * 1.7) && hash(i * 1.7) > lt * .75 + hash(i * 1.7)) return;
      d.visible = lt > .15; const e = ease.io(u); d.position.set(lerp(s[1], 0, e) + Math.sin(u * 6 + i) * .35, lerp(s[2] + 1.8, 2.7, e) + Math.sin(u * Math.PI) * 2.4, lerp(s[3], -1.6, e) + Math.cos(u * 5 + i) * .35); d.scale.setScalar(.24 * Math.sin(u * Math.PI) + .04); d.rotation.set(0, t * 4 + i, t * 3 + i); });
    fGlow.material.opacity = .5 + .3 * k;
  } else if (P === 'mut') {
    setLight(1.9, 1.0, '#c9b8ff', '#ffe9ff'); home.visible = false; gMut.visible = true;
    const k = prog(t, T.mut, T.egg, ease.io);
    camLook(camera, [lerp(-1.6, 1.6, k), 2.4, lerp(21.5, 19.5, k)], [0, 1.6, 0], 42);
    muts.forEach((s, i) => { const kk = ease.back(inv(mutT[i], mutT[i] + .35, t)); put(s, s.userData.x, MUTY[i] + Math.sin(t * 2 + i * 2) * .12, 0, Math.sin(t * 1.6 + i) * .45, .98 * kk); s.visible = t > mutT[i]; hop(s, t, .3, 7, i * 2); s.userData.gl.material.opacity = .55 * inv(mutT[i], mutT[i] + .3, t) * (.8 + Math.sin(t * 5 + i) * .2); });
    gMut.children.forEach((c, i) => { if (c.type === 'Group' && i % 3 === 0) c.position.y = MUTY[i / 3] + Math.sin(t * 2 + (i / 3) * 2) * .12; });
  } else if (P === 'egg') {
    home.visible = false; gEgg.visible = true;
    const pre = t < T.hatch, w = inv(T.egg + .3, T.hatch, t), lh = t - T.hatch;
    setLight(pre ? 1.9 : 2.5, pre ? 1.0 : 1.35, '#cdbcff', '#fff0e0');
    if (pre) { const k = prog(t, T.egg, T.hatch, ease.io); camLook(camera, [lerp(3.5, 0, k), lerp(4.6, 3.6, k), lerp(17, 12.2, k)], [0, 2.3, 0], 42); }
    else { const k = prog(t, T.hatch, T.deco, ease.out); camLook(camera, [Math.sin(lh * .35) * 3, 3.8, lerp(12.2, 15.5, k)], [0, lerp(2.3, 2.9, k), 0], 42); [sx, sy] = shake(t, T.hatch, 26, .5); }
    eggPivot.rotation.z = pre ? Math.sin(t * (10 + w * 12)) * .3 * w * w : 0; eggPivot.position.y = .45 + (pre ? Math.abs(Math.sin(t * (10 + w * 12))) * .25 * w : 0);
    EGG_MAT.emissiveIntensity = pre ? w * w * .55 : 0; eggSeam.visible = pre && w > .35; eggSeam.scale.setScalar(1 + w * .03);
    eggGlow.material.opacity = pre ? w * .7 : .8 * (1 - inv(0, 1.6, lh)) + .25; eggGlow.scale.setScalar(pre ? 6 + w * 5 : 12);
    if (pre) { eggTop.position.set(0, 0, 0); eggTop.rotation.set(0, 0, 0); eggTop.visible = true; eggTop.scale.setScalar(1); }
    else { eggTop.position.set(lh * 1.6, lh * 2.6 - lh * lh * 1.6, -lh * 1.2); eggTop.rotation.set(lh * 3, 0, -lh * 4); eggTop.visible = lh < 1.5; eggTop.scale.setScalar(1 - inv(.9, 1.5, lh));
      const kk = ease.back(inv(0, .45, lh)); put(legend, 0, 1.0 + ease.out(inv(0, .5, lh)) * 1.25 + Math.sin(lh * 3) * .15, .15, Math.sin(lh * 1.4) * .4, 1.15 * kk); hop(legend, t, .22, 8); legGlow.position.set(0, 3.4, -1); legGlow.material.opacity = .55 + Math.sin(t * 6) * .12; }
    [[2, -2.5, 1.3], [7, 2.5, 1.3]].forEach(([id, x, z], i) => { put(sprouts[id], x, 0, z, i ? -.7 : .7, .62); hop(sprouts[id], t, pre ? .15 : .7, pre ? 5 : 9, i * 2); sprouts[id].body.rotation.x = pre ? 0 : -.25; });
  } else {   // deco, trade, end : l'île complète
    const end = P === 'end';
    end ? setLight(2.3, 1.3, '#ffe6f2', '#ffe9c9') : setLight(2.6, 1.4);
    decos.forEach((d, i) => { const kk = end ? 1 : ease.back(inv(decoT[i], decoT[i] + .32, t)); d.visible = kk > 0.001; d.scale.setScalar(Math.max(.001, kk)); });
    decos[5].star.rotation.y = t * 1.5;
    const spots = [[0, PLOTS[0][0], .42, PLOTS[0][1]], [1, PLOTS[1][0], .42, PLOTS[1][1]], [3, PLOTS[2][0], .42, PLOTS[2][1]], [5, -3.4, 0, -.2], [6, 3.3, 0, .2], [2, -1.6, 0, -4.2], [7, 1.7, 0, -4.2]];
    spots.forEach(([id, x, y, z], i) => { put(sprouts[id], x, y, z, Math.sin(t * 1.3 + i) * .5); hop(sprouts[id], t, .5, 7.5, i * 1.3); });
    hero.visible = true; friend.visible = true;
    if (!end) {
      const kt = prog(t, T.trade - .5, T.trade + .5, ease.io), a = lerp(.55, -.15, prog(t, T.deco, T.trade, ease.io));
      const p0 = [Math.sin(a) * 27, 11, Math.cos(a) * 27], p1 = [1.5, 4.6, 19.5];
      camLook(camera, [lerp(p0[0], p1[0], kt), lerp(p0[1], p1[1], kt), lerp(p0[2], p1[2], kt)], [0, lerp(1.6, 2.5, kt), lerp(0, 5, kt)], 42);
      const wk = inv(T.deco, T.trade - .2, t);
      hero.position.set(lerp(-5, -2.3, wk), 0, 5.2); hero.rotation.y = Math.PI / 2 * (wk < 1 ? 1 : .75); friend.position.set(lerp(5, 2.3, wk), 0, 5.2); friend.rotation.y = -Math.PI / 2 * (wk < 1 ? 1 : .75);
      if (wk < 1) { poseWalk(hero, t * 11, .6); poseWalk(friend, t * 11 + 1, .6); } else { poseIdle(hero, t); poseIdle(friend, t + 1); poseHold(hero, .9); poseHold(friend, .9); if (t > swapT + .8) { poseCheer(hero, t); poseCheer(friend, t + .4); } }
      // échange : deux Sprouts changent de mains
      const su = ease.io(inv(swapT, swapT + .75, t)), arc = Math.sin(su * Math.PI);
      const hx = hero.position.x + 1.15, fx = friend.position.x - 1.15;
      put(sprouts[4], lerp(hx, fx, su), 2.0 + arc * 2.2, 5.25 + arc * .5, lerp(.6, -.6, su) + su * 6.283, .5);
      put(sprouts[2], lerp(fx, hx, su), 2.0 + arc * 1.2, 5.25 - arc * .5, lerp(-.6, .6, su) - su * 6.283, .5);
      if (t > swapT + .8) { hop(sprouts[4], t, .25, 12); hop(sprouts[2], t, .25, 12, 1); }
      if (wk < 1) { sprouts[4].position.y = 2.0 + Math.sin(t * 11) * .08; sprouts[2].position.y = 2.0 + Math.sin(t * 11 + 1) * .08; }
    } else {
      const le = t - T.end;
      camLook(camera, [Math.sin(le * .12 - .3) * 9, 2.2 + le * .12, 30], [0, 8.4, 0], 42);
      hero.position.set(-1.8, Math.abs(Math.sin(t * 6)) * .5, 5.2); hero.rotation.y = .2; poseCheer(hero, t);
      friend.position.set(1.9, Math.abs(Math.sin(t * 6 + 1)) * .5, 5.2); friend.rotation.y = -.2; poseCheer(friend, t + .4);
      put(sprouts[4], -4.3, 0, 4.4, .3, .7); hop(sprouts[4], t, .5, 7, 2); put(legend, 4.3, 0, 4.4, -.3, .8); hop(legend, t, .5, 7, 3);
      rain(t, 8, { speed: 6, zMin: -6, zMax: 4, xr: 8, top: 26, span: 30 });
    }
  }

  // ---------------- fond 2D ----------------
  const SKY = {
    hook: [[0, '#86b4ff'], [.5, '#f7bfe6'], [1, '#ffe6bf']], catch: [[0, '#6fbcff'], [.6, '#c4e4ff'], [1, '#ffd3ea']], plant: [[0, '#7fdde6'], [.6, '#d2f6e2'], [1, '#fff2c4']],
    dust: [[0, '#ff96b9'], [.5, '#ffc39a'], [1, '#ffe7a3']], mut: [[0, '#251b63'], [.55, '#6646b5'], [1, '#e48ccd']], egg: [[0, '#1b1856'], [.6, '#4636a3'], [1, '#b173de']],
    deco: [[0, '#62b9ff'], [.6, '#bbe6ff'], [1, '#ffefcc']], end: [[0, '#6f5fe8'], [.5, '#ff97cc'], [1, '#ffd69a']] }[P];
  bg(SKY);
  if (P === 'mut' || P === 'egg') { sparkles(t, { n: 80, h: 1500, size: 10, color: '#fff6c9', seed: 3 }); sunDisc(820, 380, 300, '255,240,200', .5); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(820, 380, 70, 0, 7); ctx.fill(); }
  else if (P === 'dust') sunDisc(540, 1250, 900, '255,244,190', .75);
  else if (P === 'end') { sunDisc(540, 700, 1000, '255,240,210', .6); sparkles(t, { n: 40, h: 700, size: 9, color: '#fff6c9', seed: 5 }); }
  else sunDisc(P === 'catch' ? 200 : 860, 420, 520, '255,255,235', .7);
  if (P === 'egg' && t >= T.hatch) { const [ex, ey] = scr(0, 3, 0); rays(t, { cx: ex, cy: ey, n: 18, color: `rgba(255,236,150,${.3 * (1 - inv(T.deco - .4, T.deco, t))})`, speed: .5 }); }
  if (P === 'hook' || P === 'catch' || P === 'end') streaks(t, P === 'end' ? .8 : 1, P === 'catch' ? 5 : 8);
  else if (P === 'plant' || P === 'deco') streaks(t, .5, 3);

  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(P === 'mut' || P === 'egg' ? .4 : .16, P === 'mut' || P === 'egg' ? '20,10,60' : '90,50,140');

  // ---------------- 2D par-dessus ----------------
  if (P === 'hook') {
    sparkles(t, { n: 18, y: 250, h: 1100, color: '#fff6c9', size: 16, seed: 9 });
    caption(t, .08, T.catch - .12, 'ET SI TU PLANTAIS\nDES ÉTOILES ?', { font: 'Baloo', size: 122, y: 470, anim: 'slam', color: '#fff6c9', stroke: C.encre, shadow: 'rgba(58,42,120,.5)', lineH: 1.02 });
    if (t > 1.3) { const [x, y] = scr(.3, .8, 5); burst(t, 1.3, x, y, { n: 14, r: 220 }); }
  }
  if (P === 'catch') {
    let n = 0; catchT.forEach((c, i) => { if (t >= c) n++; const [x, y] = scr(catchX[i], 7.6, HZ); burst(t, c, x, y, { n: 14, r: 200 }); const k = inv(c, c + .8, t); if (t >= c && k < 1) text('+1', x + 90, y - 40 - k * 120, { font: 'Baloo', size: 96, color: '#fff2a0', stroke: C.encre, alpha: 1 - k * k, scale: ease.back(inv(c, c + .2, t)) }); });
    const pk = Math.max(...catchT.map(c => 1 - inv(c, c + .25, t) * 1)); ctx.save(); ctx.translate(SAFE.cx, 290); const s = 1 + (catchT.some(c => t >= c && t < c + .25) ? .12 * pk : 0); ctx.scale(s, s); ctx.translate(-SAFE.cx, -290);
    hud('GRAINES', n + ' / 30'); ctx.restore();
    caption(t, T.catch + .25, T.plant - .2, 'ATTRAPE LES\nGRAINES D\'ÉTOILE', { font: 'Baloo', size: 92, y: 1385, bg: C.rose, anim: 'pop', lineH: 1.0 });
  }
  if (P === 'plant') {
    plantT.forEach((p, i) => { const [x, z] = PLOTS[i]; const g = inv(p, p + GROW, t);
      if (t >= p && t < p + GROW) { const [px, py] = scr(x, 3.4, z); bar(px - 95, py - 16, 190, 32, g, { color: '#7be08a', borderW: 4 }); }
      const [bx, by] = scr(x, 1.6, z); burst(t, p + GROW, bx, by, { n: 12, r: 160, color: '#c9ffd6' }); });
    caption(t, T.plant + .3, T.plant + 2.75, 'PLANTE-LES\nSUR TON ÎLE', { font: 'Baloo', size: 96, y: 1385, bg: C.menthe, anim: 'pop', lineH: 1.0 });
    caption(t, T.plant + 2.95, T.dust - .2, 'ET VOILÀ\nTES SPROUTS !', { font: 'Baloo', size: 96, y: 1385, bg: C.violet, anim: 'pop', lineH: 1.0 });
  }
  if (P === 'dust') {
    hud('POUSSIÈRE', count(t, T.dust + .4, T.mut - .2, 0, 250));
    const [fx, fy] = scr(0, 2.9, -1.6); sparkles(t, { n: 14, x: fx - 160, y: fy - 200, w: 320, h: 330, color: '#fff2a0', size: 18, seed: 2 });
    caption(t, T.dust + .3, T.mut - .2, 'RÉCOLTE LA\nPOUSSIÈRE D\'ÉTOILE', { font: 'Baloo', size: 88, y: 1385, bg: C.orange, anim: 'pop', lineH: 1.0 });
  }
  if (P === 'mut') {
    caption(t, T.mut + .15, T.egg - .15, 'DÉCOUVRE\nLES MUTATIONS', { font: 'Baloo', size: 104, y: 400, anim: 'rise', color: '#fff6c9', stroke: C.encre, lineH: 1.0 });
    muts.forEach((s, i) => { if (t < mutT[i]) return; const [x, y] = scr(s.userData.x, MUTY[i] - .55, 1.4); const [bx, by] = scr(s.userData.x, MUTY[i] + 1, 0); burst(t, mutT[i], bx, by, { n: 12, r: 190, color: ['#ffe27a', '#ffb3e6', '#a8ecff'][i] });
      pill(MUT[i][2], clamp(x, 190, 890), y + 40, { size: 46, font: 'Baloo', bg: MUT[i][3], color: MUT[i][4], border: '#ffffff', borderW: 5, scale: ease.back(inv(mutT[i] + .1, mutT[i] + .4, t)) * (1 - inv(T.egg - .2, T.egg - .05, t)) }); });
  }
  if (P === 'egg') {
    if (t < T.hatch) { caption(t, T.egg + .25, T.hatch - .1, 'OUVRE DES ŒUFS…', { font: 'Baloo', size: 104, y: 1385, bg: C.violet, anim: 'pop' }); const w = inv(T.egg + .3, T.hatch, t); const [ex, ey] = scr(0, 2.2, 0); sparkles(t, { n: 12, x: ex - 260, y: ey - 330, w: 520, h: 600, color: '#fff2a0', size: 12 + w * 10, seed: 4 }); }
    else { const [ex, ey] = scr(0, 2.6, 0); burst(t, T.hatch, ex, ey, { n: 22, r: 520, dur: .9, size: 40 }); confetti(t, T.hatch + .05, { cy: ey, colors: ['#ffd84a', '#ff8fc7', '#b79cff', '#8fd3ff', '#ffffff', '#9df0c8'], n: 120 });
      caption(t, T.hatch + .05, T.deco - .15, 'LÉGENDAIRE !', { font: 'Baloo', size: 150, y: 430, anim: 'slam', grad: ['#fff7b0', '#ffb52e'], stroke: C.encre, glow: 'rgba(255,220,120,.9)' });
      caption(t, T.hatch + .5, T.deco - .15, 'Fais éclore des Sprouts', { size: 64, y: 1400, bg: C.rose, anim: 'rise' }); }
  }
  if (P === 'deco') {
    decoT.forEach((d, i) => { const g = decos[i]; if (i > 5) return; const [x, y] = scr(g.position.x, 2.2, g.position.z); burst(t, d, x, y, { n: 8, r: 110, size: 16, dur: .45 }); });
    caption(t, T.deco + .25, T.trade - .15, 'DÉCORE TON ÎLE', { font: 'Baloo', size: 108, y: 1400, bg: C.rose, anim: 'pop' });
    caption(t, T.trade + .15, T.end - .2, 'ÉCHANGE AVEC\nTES AMIS', { font: 'Baloo', size: 96, y: 1385, bg: C.menthe, anim: 'pop', lineH: 1.0 });
    if (t > swapT) { const [x, y] = scr(0, 4.6, 5.25); burst(t, swapT + .75, x, y + 120, { n: 16, r: 260, color: '#ffc4e4' }); }
  }
  if (P === 'end') {
    const le = t - T.end; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(70,45,150,.5)'); g.addColorStop(.55, 'rgba(70,45,150,.34)'); g.addColorStop(.78, 'rgba(70,45,150,0)'); ctx.save(); ctx.globalAlpha = inv(0, .5, le); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    rays(t, { cy: 640, color: 'rgba(255,255,255,.07)', speed: .15 }); sparkles(t, { n: 24, y: 230, h: 1000, color: '#fff6c9', size: 15, seed: 7 });
    endCard(t, T.end + .15, { title: 'SKY SPROUTS', tagline: 'Attrape, plante, collectionne !', status: 'bientot', font: 'Baloo', titleSize: 160, titleGrad: ['#fffbd0', '#ffd0ec'], titleStroke: C.encre, accent: C.rose, y: 760 });
  }

  // ---------------- transitions ----------------
  flash(t, T.catch, .3, '255,230,245', .9);
  wipe(t, T.plant, { color: '#9df0c8', color2: '#ffc4e4', dir: 'left' });
  flash(t, T.dust, .35, '255,240,190', .9);
  wipe(t, T.mut, { color: '#3a2a78', color2: '#b79cff', dir: 'up' });
  flash(t, T.egg, .3, '200,180,255', .85);
  flash(t, T.hatch, .5, '255,250,220', 1);
  wipe(t, T.deco, { color: '#8fd3ff', color2: '#fff2a0', dir: 'right' });
  flash(t, T.end, .45, '255,240,250', 1);
}

registerAd({ duration: DURATION, thumbTime: T.hatch + 1.0, render,
  music: { style: 'dreamy', bpm: 100, sections: [[0, 'intro'], [T.catch, 'build'], [T.plant, 'drop'], [T.mut, 'break'], [T.egg, 'build'], [T.hatch, 'drop2'], [T.end, 'break']], end: T.end + BAR } });
