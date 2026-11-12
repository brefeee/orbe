// Publicité « Bumper Ball Arena » (statut : bientôt). Tout est créé par le code : aucune ressource externe.
// Les 3 modes (Dernier survivant, Foot-boules, Roi de la colline), les 3 arènes (Île qui rétrécit, Lac gelé,
// Parc à ressorts), les 3 bonus (aimant, super saut, géant) et les 12 joueurs viennent du dossier du jeu.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseCheer, poseJump, tree, cloud, showOnly, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles,
  text, caption, pill, bar, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Anton', 'Inter']);
const BPM = 100, BAR = 240 / BPM;                         // 2,4 s par mesure
const T = { hook: 0, s1: BAR, s2: 3 * BAR, s3: 5 * BAR, s4: 7 * BAR, s5: 9 * BAR, win: 11 * BAR, end: 12 * BAR }, DURATION = 14 * BAR;   // 33,6 s
const B4 = [T.s4, T.s4 + 1.6, T.s4 + 3.2];                // les 3 mini-plans des bonus
const PI = Math.PI, R = 2;                                // rayon d'une boule
const PAL = { navy: '#0a1030', red: '#ff3b3b', gold: '#ffd23f', blue: '#2f7bff', orange: '#ff8a1f', cyan: '#22d3ee', white: '#ffffff' };

// =====================================================================================  scène
gl3D({ exposure: 1.08 });
const scene = new THREE.Scene(), camera = makeCamera(45);
const lights = addLights(scene, { shadowArea: 24, dir: [7, 16, 9], ambI: 1.25, sunI: 2.5 });

// ---------- nuages sous les arènes (le vide)
const clouds = new THREE.Group(); scene.add(clouds);
for (let i = 0; i < 11; i++) { const c = cloud(3 + hash(i * 3) * 3.5); const a = i / 11 * 2 * PI + hash(i) * .5, r = 24 + hash(i * 7) * 26; c.position.set(Math.cos(a) * r, -11 - hash(i * 5) * 12, Math.sin(a) * r - 6); clouds.add(c); }

// ---------- boule de joueur : coque translucide + cerceaux (montrent le roulement) + personnage en blocs
function makeBumper(color, o = {}) {
  const g = new THREE.Group();
  const shell = new THREE.Group(); shell.rotation.order = 'YXZ'; g.add(shell);
  shell.add(ball(R, color, { opacity: .36, rough: .12, seg: 32, seg2: 20, receive: false, emissive: color, emissiveI: .22 }));
  const r1 = torus(R * .995, .13, '#ffffff', { rough: .3, seg: 40, cast: false }); r1.rotation.y = PI / 2; shell.add(r1);
  const r2 = torus(R * .995, .13, color, { rough: .3, seg: 40, cast: false, emissive: color, emissiveI: .35 }); r2.rotation.x = PI / 2; shell.add(r2);
  for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) { const d = ball(.34, '#ffffff', { seg: 10, seg2: 8, cast: false, rough: .3 }); d.position.set(x * R * .7071, y, z * R * .7071); d.position.y = (x ? 1 : -1) * R * .7071; shell.add(d); }
  const ch = makeCharacter({ shirt: color, pants: o.pants ?? '#232a4a', hair: o.hair, hat: o.hat ?? 'none', hatColor: o.hatColor, face: o.face ?? 'happy', skin: o.skin, scale: .56 });
  ch.position.y = -1.52; ch.traverse(m => { if (m.isMesh) m.castShadow = false; }); g.add(ch);
  g.shell = shell; g.ch = ch; g.visible = false; scene.add(g); return g;
}
const COLS = ['#ff3b3b', '#35d07f', '#ffd23f', '#a05cff', '#22d3ee', '#ff6fb5', '#ff8a1f', '#3b82f6', '#b6f03c', '#f1f5f9', '#e94bd8', '#14b8a6'];
const HAIRS = ['#3b2a1e', '#1b1b22', '#7a4a21', '#e8c16a', null, '#5a2d82'], FACES = ['happy', 'smile', 'wow', 'smile', 'happy', 'wow'], SKINS = ['#f2c6a0', '#c98f64', '#8d5a3b', '#f7d7b5'];
const P = COLS.map((c, i) => makeBumper(c, { hair: i === 0 ? '#3b2a1e' : HAIRS[i % 6], face: i === 0 ? 'happy' : FACES[i % 6], skin: SKINS[i % 4], hat: i === 0 ? 'cap' : (i % 5 === 3 ? 'helmet' : 'none'), hatColor: i === 0 ? '#ffd23f' : '#ffffff' }));
const TB = [0, 1, 2].map(i => makeBumper('#2f7bff', { hair: HAIRS[i], skin: SKINS[i], face: 'happy', hat: i === 0 ? 'cap' : 'none', hatColor: '#ffffff' }));
const TO = [0, 1, 2].map(i => makeBumper('#ff8a1f', { hair: HAIRS[i + 2], skin: SKINS[i + 1], face: i === 0 ? 'wow' : 'smile' }));
const ALLB = [...P, ...TB, ...TO], HERO = P[0];

function resetPose(ch) { for (const k of ['head', 'torso', 'armL', 'armR', 'legL', 'legR']) ch.parts[k].rotation.set(0, 0, 0); }
/** Place une boule. o : { h (cap), roll, pose:'run'|'idle'|'cheer'|'fall', t, s (taille) } */
function put(b, x, y, z, o = {}) {
  const h = o.h ?? 0, t = o.t ?? 0;
  b.visible = true; b.position.set(x, y, z); b.scale.setScalar(o.s ?? 1);
  b.shell.rotation.set(o.roll ?? 0, h, 0); b.ch.rotation.set(0, o.chH ?? h, 0);
  resetPose(b.ch);
  const pose = o.pose ?? 'run';
  if (pose === 'run') poseWalk(b.ch, (o.roll ?? 0) * 2.2, .8);
  else if (pose === 'cheer') poseCheer(b.ch, t);
  else if (pose === 'fall') { poseJump(b.ch, 1); b.ch.parts.armL.rotation.z = -.6 + Math.sin(t * 22) * .5; b.ch.parts.armR.rotation.z = .6 - Math.sin(t * 22) * .5; b.ch.rotation.x = Math.sin(t * 9) * .5; }
  else { b.ch.parts.armL.rotation.z = -.1; b.ch.parts.armR.rotation.z = .1; b.ch.parts.head.rotation.y = Math.sin(t * 1.4) * .25; }
}
/** Trajectoire par points clés [t, x, z, courbe?] → { x, z, h, d } (position, cap, distance roulée). */
function trk(keys, t) {
  const n = keys.length;
  const P2 = tt => { if (tt <= keys[0][0]) return [keys[0][1], keys[0][2]]; if (tt >= keys[n - 1][0]) return [keys[n - 1][1], keys[n - 1][2]];
    for (let i = 0; i < n - 1; i++) { const a = keys[i], b = keys[i + 1]; if (tt < b[0]) { let k = inv(a[0], b[0], tt); if (b[3]) k = ease[b[3]](k); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } } };
  const [x, z] = P2(t), [x1, z1] = P2(t + .04), [x0, z0] = P2(t - .04);
  let dx = x1 - x0, dz = z1 - z0, d = 0, h = 0, found = Math.hypot(dx, dz) > 1e-3;
  for (let i = 0; i < n - 1; i++) {
    const a = keys[i], b = keys[i + 1], L = Math.hypot(b[1] - a[1], b[2] - a[2]);
    let k = inv(a[0], b[0], t); if (b[3]) k = ease[b[3]](k); d += L * k;
    if (!found && L > 1e-3 && t >= a[0]) { dx = b[1] - a[1]; dz = b[2] - a[2]; }
  }
  if (!found && Math.hypot(dx, dz) < 1e-3) { dx = keys[1][1] - keys[0][1]; dz = keys[1][2] - keys[0][2]; }
  h = Math.atan2(dx, dz); return { x, z, h, d };
}
const roll = (b, k, t, o = {}) => put(b, k.x, (o.y ?? R * (o.s ?? 1)), k.z, { h: k.h, roll: k.d / R, t, ...o });
/** Éjection : arc puis chute dans le vide. */
function fly(b, x0, z0, dx, dz, lt, t, o = {}) {
  const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; const sp = o.sp ?? 16, vy = o.vy ?? 10;
  const y = (o.y0 ?? R) + vy * lt - 16 * lt * lt; if (y < -42) { b.visible = false; return; }
  put(b, x0 + dx * sp * lt, y, z0 + dz * sp * lt, { h: Math.atan2(dx, dz), roll: lt * 9, pose: 'fall', t, chH: Math.atan2(-dx, -dz) + lt * 3 });
}
const bump = (t, at, up = .12, down = .4) => t < at ? inv(at - up, at, t) : 1 - ease.out(inv(at, at + down, t));

// ---------- ARÈNE 1 : Île qui rétrécit (3 anneaux qui tombent l'un après l'autre)
const isle = new THREE.Group(); scene.add(isle);
const ISLE_R = [12, 9.5, 6.5], isleRings = [];
ISLE_R.forEach((r, k) => {
  const g = new THREE.Group();
  const body = cyl(r, r * .9, 1.5, ['#b7793f', '#9c6434', '#8a5a3c'][k], { seg: 48, flat: false }); body.position.y = -.75; g.add(body);
  const lip = cyl(r + .02, r + .02, .34, ['#ffb347', '#8fe05a', '#4cc96a'][k], { seg: 48 }); lip.position.y = -.17; g.add(lip);
  const m = new THREE.MeshStandardMaterial({ color: ['#ffc45e', '#9be865', '#58d477'][k], roughness: .85, emissive: '#ff2200', emissiveIntensity: 0 });
  if (k === 2) m.map = canvasTex(512, (c, n) => {
    c.fillStyle = '#58d477'; c.fillRect(0, 0, n, n); c.translate(n / 2, n / 2);
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#4fca6e' : '#63dd82'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, n / 2, i * PI / 6, (i + 1) * PI / 6); c.fill(); }
    c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, n * .2, 0, 7); c.stroke(); c.fillStyle = '#ffffff';
    c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? n * .055 : n * .13, a = i * PI / 5 - PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
  }), m.color.set('#ffffff');
  const top = new THREE.Mesh(new THREE.CircleGeometry(r, 48), m); top.rotation.x = -PI / 2; top.position.y = .004; top.receiveShadow = true; g.add(top);
  g.userData.m = m; g.userData.y0 = -(2 - k) * .05; g.position.y = g.userData.y0; isle.add(g); isleRings.push(g);
});
{ const rock = cone(6.2, 11, '#7a4f33', { seg: 9, flat: true }); rock.rotation.x = PI; rock.position.y = -7; isle.add(rock);
  for (let i = 0; i < 6; i++) { const s = cone(1 + hash(i) * 1.2, 3 + hash(i * 3) * 3, '#8a5a3c', { seg: 6, flat: true }); s.rotation.x = PI; const a = i * 1.05; s.position.set(Math.cos(a) * 4, -3.2, Math.sin(a) * 4); isle.add(s); } }
/** fall : instants de chute des 2 anneaux extérieurs (null = intact). */
function setIsle(t, f0, f1) {
  [f0, f1].forEach((f, k) => {
    const g = isleRings[k], lt = f == null ? -9 : t - f;
    g.userData.m.emissiveIntensity = f != null && lt > -1.1 && lt < 0 ? (Math.sin(lt * 26) > 0 ? .75 : .1) : 0;
    g.position.y = g.userData.y0 - (lt > 0 ? 17 * lt * lt : 0); g.rotation.set(lt > 0 ? lt * .25 : 0, 0, lt > 0 ? lt * (k ? -.2 : .18) : 0); g.visible = lt < 1.7;
  });
}

// ---------- ARÈNE 2 : Lac gelé (patinoire flottante + 2 buts)
const ice = new THREE.Group(); scene.add(ice);
{ ice.add(box(18, 1.5, 30, '#9fd4f5', { pos: [0, -.76, 0], rough: .3 }));
  const tex = canvasTex(1024, (c, n) => {
    const g = c.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#e9f8ff'); g.addColorStop(.5, '#c4eaff'); g.addColorStop(1, '#e2f6ff'); c.fillStyle = g; c.fillRect(0, 0, n, n);
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; for (let i = 0; i < 90; i++) { const x = hash(i) * n, y = hash(i * 3) * n, a = hash(i * 7) * 6.28, l = 30 + hash(i * 5) * 120; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * .6); c.stroke(); }
    c.save(); c.scale(n / 18, n / 30); c.strokeStyle = '#3aa0ff'; c.lineWidth = .22; c.strokeRect(.5, .5, 17, 29); c.beginPath(); c.moveTo(.5, 15); c.lineTo(17.5, 15); c.stroke(); c.beginPath(); c.arc(9, 15, 3.4, 0, 7); c.stroke();
    c.strokeStyle = '#ff8a1f'; c.strokeRect(4, .5, 10, 4.2); c.strokeStyle = '#2f7bff'; c.strokeRect(4, 25.3, 10, 4.2); c.restore();
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(18, 30), new THREE.MeshStandardMaterial({ map: tex, roughness: .18 })); top.rotation.x = -PI / 2; top.position.y = .006; top.receiveShadow = true; ice.add(top);
  for (let i = 0; i < 16; i++) { const s = cone(.7 + hash(i) * 1.1, 2.5 + hash(i * 3) * 4.5, '#bfe9ff', { seg: 6, flat: true, rough: .25, emissive: '#3aa0ff', emissiveI: .12 }); s.rotation.x = PI; s.position.set((hash(i * 5) - .5) * 15, -1.5 - s.geometry.parameters.height / 2, (hash(i * 9) - .5) * 26); ice.add(s); }
  const net = (w, h) => sign(w, h, (c, cw, chh) => { c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; for (let x = 0; x <= cw; x += cw / Math.round(w * 1.4)) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, chh); c.stroke(); } for (let y = 0; y <= chh; y += chh / Math.round(h * 1.4)) { c.beginPath(); c.moveTo(0, y); c.lineTo(cw, y); c.stroke(); } }, { res: 256 });
  const goal = (col, z, dir) => {
    const g = new THREE.Group(); g.position.z = z; g.rotation.y = dir > 0 ? 0 : PI;
    g.add(box(11.5, 1.5, 4.6, col, { pos: [0, -.76, -2.3], rough: .5 }));
    for (const s of [-1, 1]) { g.add(cyl(.3, .3, 6.6, col, { pos: [s * 4.8, 3.3, 0], emissive: col, emissiveI: .3 })); g.add(cyl(.2, .2, 6.6, '#ffffff', { pos: [s * 4.8, 3.3, -4] })); g.add(cyl(.2, .2, 4, '#ffffff', { pos: [s * 4.8, 6.6, -2], rot: [PI / 2, 0, 0] })); const sn = net(4, 6.6); sn.position.set(s * 4.8, 3.3, -2); sn.rotation.y = PI / 2; sn.material.side = THREE.DoubleSide; g.add(sn); }
    g.add(cyl(.3, .3, 9.9, col, { pos: [0, 6.6, 0], rot: [0, 0, PI / 2], emissive: col, emissiveI: .3 })); g.add(cyl(.2, .2, 9.8, '#ffffff', { pos: [0, 6.6, -4], rot: [0, 0, PI / 2] }));
    const bn = net(9.6, 6.6); bn.position.set(0, 3.3, -4); bn.material.side = THREE.DoubleSide; g.add(bn);
    const tn = net(9.6, 4); tn.position.set(0, 6.6, -2); tn.rotation.x = -PI / 2; tn.material.side = THREE.DoubleSide; g.add(tn);
    ice.add(g);
  };
  goal('#ff8a1f', -15, 1); goal('#2f7bff', 15, -1);
  for (const [x, y, z, s] of [[-15, -3, -24, 1.3], [14, -2, -30, 1.6], [-17, -5, -2, 1], [17, -6, 4, 1.1], [-13, -1, -40, 1.8]]) {     // icebergs décoratifs
    const g = new THREE.Group(); const c1 = cone(4, 7, '#a8dcf7', { seg: 7, flat: true, rough: .3 }); c1.rotation.x = PI; c1.position.y = -3.5; g.add(c1); g.add(cyl(4, 4, .5, '#ffffff', { seg: 7, pos: [0, .2, 0] }));
    const tr = tree(4.4, '#eaf7ff', '#6b4a2e'); tr.position.set(-1, .4, 0); g.add(tr); const tr2 = tree(3.2, '#d6efff', '#6b4a2e'); tr2.position.set(1.6, .4, .8); g.add(tr2);
    const k = cone(.9, 3.4, '#8fd8ff', { seg: 5, flat: true, emissive: '#3aa0ff', emissiveI: .3 }); k.position.set(1.2, 2, -1.6); k.rotation.z = -.25; g.add(k);
    g.position.set(x, y, z); g.scale.setScalar(s); ice.add(g); }
}
// gros ballon du Foot-boules
const bigBall = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 20), new THREE.MeshStandardMaterial({ roughness: .4, map: canvasTex(512, (c, n) => {
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, n, n); for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { c.fillStyle = (i + j) % 2 ? '#ffd23f' : '#1b2a6b'; c.beginPath(); c.ellipse((i + (j % 2) * .5) / 6 * n + n / 12, (j + .5) / 4 * n, n * .05, n * .075, 0, 0, 7); c.fill(); }
}) })); bigBall.castShadow = true; bigBall.rotation.order = 'YXZ'; scene.add(bigBall);

// ---------- ARÈNE 3 : Parc à ressorts (trampolines + zone dorée du Roi de la colline)
const park = new THREE.Group(); scene.add(park);
const TR = [[6, 6], [-6, 6], [-6, -6], [6, -6]], pads = [];
const goldZone = new THREE.Group();
{ park.add(cyl(12, 11, 1.5, '#4a2fc4', { seg: 48, pos: [0, -.76, 0] })); park.add(cyl(12.05, 12.05, .36, '#ffd23f', { seg: 48, pos: [0, -.2, 0], emissive: '#ffb300', emissiveI: .25 }));
  const tex = canvasTex(1024, (c, n) => {
    c.translate(n / 2, n / 2); for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#7c5cff' : '#5f43e6'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, n / 2, i * PI / 8, (i + 1) * PI / 8); c.fill(); }
    c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, n * .46, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 5; c.setLineDash([22, 16]); c.beginPath(); c.arc(0, 0, n * .2, 0, 7); c.stroke();
  });
  const top = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: .8 })); top.rotation.x = -PI / 2; top.position.y = .006; top.receiveShadow = true; park.add(top);
  const rock = cone(8, 9, '#33208f', { seg: 10, flat: true }); rock.rotation.x = PI; rock.position.y = -6; park.add(rock);
  TR.forEach(([x, z], i) => {
    const g = new THREE.Group(), col = ['#ff4d6d', '#22d3ee', '#45f07a', '#ff8a1f'][i]; g.position.set(x, 0, z);
    const rim = torus(2.5, .34, col, { seg: 32, emissive: col, emissiveI: .25 }); rim.rotation.x = PI / 2; rim.position.y = .62; g.add(rim);
    const pad = cyl(2.4, 2.4, .1, '#1b2350', { seg: 32, rough: .5 }); pad.position.y = .58; g.add(pad);
    const st = sign(2.6, 2.6, (c, w) => { c.fillStyle = '#ffffff'; c.translate(w / 2, w / 2); c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? w * .16 : w * .4, a = k * PI / 5 - PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill(); }, { res: 128 }); st.rotation.x = -PI / 2; st.position.y = .64; g.add(st);
    for (let k = 0; k < 6; k++) { const a = k * PI / 3; g.add(cyl(.16, .16, .62, '#d9dde8', { seg: 8, pos: [Math.cos(a) * 2.5, .31, Math.sin(a) * 2.5] })); }
    g.userData.pad = pad; g.userData.st = st; park.add(g); pads.push(g);
  });
  for (let i = 0; i < 8; i++) {                         // mâts et ballons de fête sur le bord
    const a = i * PI / 4 + PI / 8, x = Math.cos(a) * 11.3, z = Math.sin(a) * 11.3, col = ['#ff4d6d', '#ffd23f', '#22d3ee', '#45f07a'][i % 4];
    park.add(cyl(.09, .09, 4.4, '#ffffff', { seg: 6, pos: [x, 2.2, z] })); const b = ball(.8, col, { seg: 14, seg2: 10, rough: .25, emissive: col, emissiveI: .2 }); b.scale.y = 1.15; b.position.set(x, 4.9, z); park.add(b);
  }
  const gd = cyl(4, 4, .12, '#ffd23f', { seg: 40, emissive: '#ffb300', emissiveI: .7, rough: .35, pos: [0, .07, 0] }); goldZone.add(gd);
  const gr = torus(4, .2, '#fff3a0', { seg: 48, emissive: '#ffd23f', emissiveI: 1 }); gr.rotation.x = PI / 2; gr.position.y = .22; goldZone.add(gr);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 9, 40, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 4.5; goldZone.add(beam);
  goldZone.userData.beam = beam; park.add(goldZone);
}
function setPads(times, t) { pads.forEach((g, i) => { let k = 0; for (const tt of (times[i] || [])) k = Math.max(k, bump(t, tt, .1, .35)); g.userData.pad.position.y = .58 - .42 * k; g.userData.st.position.y = .64 - .42 * k; }); }

// ---------- objets : bonus, couronne, aimant, halos
function makePickup(col, draw) {
  const g = new THREE.Group(); g.add(rbox(1.7, 1.7, 1.7, .32, col, { emissive: col, emissiveI: .45, rough: .3 }));
  for (let i = 0; i < 4; i++) { const s = sign(1.45, 1.45, (c, w) => { c.lineCap = 'round'; c.lineJoin = 'round'; draw(c, w); }, { res: 128, emissive: true }); s.position.set(Math.sin(i * PI / 2) * .86, 0, Math.cos(i * PI / 2) * .86); s.rotation.y = i * PI / 2; g.add(s); }
  const gl = glow(col, 6, .7); g.add(gl); g.visible = false; scene.add(g); return g;
}
const drawMagnet = (c, w) => { c.strokeStyle = '#ff3b3b'; c.lineWidth = w * .2; c.beginPath(); c.moveTo(w * .26, w * .2); c.lineTo(w * .26, w * .5); c.arc(w * .5, w * .5, w * .24, PI, 0, true); c.lineTo(w * .74, w * .2); c.stroke(); c.lineCap = 'butt'; c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(w * .26, w * .12); c.lineTo(w * .26, w * .28); c.moveTo(w * .74, w * .12); c.lineTo(w * .74, w * .28); c.stroke(); };
const drawJump = (c, w) => { c.strokeStyle = '#ffffff'; c.lineWidth = w * .13; for (const y of [.28, .56]) { c.beginPath(); c.moveTo(w * .22, w * (y + .24)); c.lineTo(w * .5, w * y); c.lineTo(w * .78, w * (y + .24)); c.stroke(); } };
const drawGiant = (c, w) => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(w * .56, w * .46, w * .32, 0, 7); c.fill(); c.beginPath(); c.arc(w * .2, w * .74, w * .11, 0, 7); c.fill(); };
const pkMag = makePickup('#22b8ff', drawMagnet), pkJump = makePickup('#35d07f', drawJump), pkBig = makePickup('#ff5fa2', drawGiant);
function setPickup(pk, x, z, t, until) { pk.visible = t < until; if (!pk.visible) return; pk.position.set(x, 2.4 + Math.sin(t * 5) * .3, z); pk.rotation.y = t * 2.4; pk.scale.setScalar(1 - .9 * inv(until - .1, until, t)); }
const crown = new THREE.Group(); { crown.add(cyl(1.0, .9, .6, '#ffd23f', { emissive: '#ffb300', emissiveI: .6, rough: .3 })); for (let i = 0; i < 6; i++) { const s = cone(.22, .6, '#ffd23f', { emissive: '#ffb300', emissiveI: .6, rough: .3, seg: 8 }); s.position.set(Math.cos(i * PI / 3) * .88, .55, Math.sin(i * PI / 3) * .88); crown.add(s); const j = ball(.13, i % 2 ? '#ff3b6b' : '#22d3ee', { seg: 8, seg2: 6, emissive: i % 2 ? '#ff3b6b' : '#22d3ee', emissiveI: .6 }); j.position.set(Math.cos(i * PI / 3 + .52) * .97, 0, Math.sin(i * PI / 3 + .52) * .97); crown.add(j); } crown.add(glow('#ffd23f', 5, .5)); scene.add(crown); }
const magnet = new THREE.Group(); { const a = new THREE.Mesh(new THREE.TorusGeometry(.7, .26, 10, 20, PI), mat('#ff3b3b', { rough: .3, emissive: '#ff3b3b', emissiveI: .3 })); a.rotation.z = PI; magnet.add(a); for (const s of [-1, 1]) { magnet.add(box(.52, .5, .52, '#ff3b3b', { pos: [s * .7, .25, 0], emissive: '#ff3b3b', emissiveI: .3 })); magnet.add(box(.54, .42, .54, '#ffffff', { pos: [s * .7, .7, 0] })); } scene.add(magnet); }
const magRings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, .07, 8, 48), new THREE.MeshBasicMaterial({ color: '#7fe6ff', transparent: true, opacity: .8 })); m.rotation.x = PI / 2; scene.add(m); return m; });
const sparks = [0, 1, 2, 3, 4].map(() => { const g = glow('#fff6c0', 1, 1); g.visible = false; scene.add(g); return g; });
const ARENAS = [isle, ice, park];

// =====================================================================================  chorégraphies (tout est fonction de t)
const IMP = [];                                     // chocs : { t, p:[x,y,z], amp, size }
const hit = (t, p, amp = 20, size = 300, snd = 'impact') => { IMP.push({ t, p, amp, size }); cue(t, snd, 1); };

// --- accroche (île) : choc à 1,0 s
const K_H = { red: [[0, 1.2, 10], [1.0, .3, 2], [1.5, .5, 3.4, 'out']], blue: [[0, -.6, -7.5], [1.0, 0, -2]],
  y: [[0, -7, -3], [2.4, -5, 1]], p: [[0, 7, -5], [2.4, 6.5, -1]] };
hit(1.0, [.15, 2.2, 0], 30, 380, 'boom');
// --- plan 1 : Dernier survivant sur l'Île qui rétrécit
const S1F = [T.s1 + 1.4, T.s1 + 3.4];               // chutes des anneaux
const K1 = { red: [[0, 0, 4.5], [1.0, -2, 1], [1.6, -4, -2, 'in'], [2.4, -1.5, -.5, 'out'], [3.2, 2.5, 1.5, 'in'], [4.8, 0, 0, 'io']],
  green: [[0, -7.5, -2], [1.6, -6.83, -4.83]], yellow: [[0, 8.5, 2], [2.3, 6.4, -2.6], [3.0, 8.2, -.6, 'out']], cyan: [[0, 0, -8], [2.3, 3.6, -5.4], [3.1, 1.6, -4.2, 'out'], [4.8, 2.4, -3.4]],
  purple: [[0, 2, 6.5], [3.2, 5.93, 3.56]], pink: [[0, -6.5, 5], [1.2, -4.5, 4.5], [4.8, -3, 3.2]] };
hit(T.s1 + 1.6, [-5.4, 2, -3.4], 22, 300); hit(T.s1 + 2.3, [5, 2, -4], 12, 220, 'thud'); hit(T.s1 + 3.2, [4.2, 2, 2.5], 22, 300);
// --- plan 2 : Foot-boules sur le Lac gelé
const K2 = { b0: [[0, 1, 12], [1.2, .5, 6.5, 'in'], [2.0, .3, 5.2, 'out'], [3.6, 0, 2.5]], ball: [[0, 0, 1.5], [1.2, 0, 1.5], [2.4, -2.5, -6, 'out'], [3.6, 1.6, -15.5], [4.1, 1.9, -17.4, 'out']],
  b1: [[0, -7, 7], [1.4, -7, 3], [2.4, -5.5, -2, 'in'], [3.1, -5, -3.4, 'out']], b2: [[0, 5, 11], [1.8, 6, 6], [2.5, 6.5, 8.5, 'out'], [4.8, 5.5, 6.5]],
  o0: [[0, .5, -12.5], [2.4, -1, -12.5], [3.3, -5.9, -12.2, 'out']], o1: [[0, 5, -6], [2.4, 2.5, .5], [3.6, 3.5, -3], [4.8, 3.2, -4]], o2: [[0, 8, -3], [1.8, 7, 2.1], [2.5, 7.4, -1, 'out'], [4.8, 6.5, -3]] };
hit(T.s2 + 1.2, [.2, 2.4, 4.4], 18, 280); hit(T.s2 + 1.8, [6.5, 2, 4], 8, 180, 'thud'); hit(T.s2 + 2.4, [-4.2, 2.4, -3.6], 20, 300);
// --- plan 3 : Roi de la colline sur le Parc à ressorts
const S3 = { g0: T.s3 + .6, g1: T.s3 + 1.8, y0: T.s3 + 2.4, y1: T.s3 + 3.6, y2: T.s3 + 4.2 };
hit(S3.g1, [-1.5, 2.2, 1.5], 24, 320); hit(S3.y1, [1.5, 2.2, -1.5], 24, 320);
const PADT = [[], [S3.g0], [], [S3.y0, S3.y2]];
for (let k = 0; k < 4; k++) { PADT[0].push(T.s3 + .3 + k * 1.2); PADT[2].push(T.s3 + .9 + k * 1.2); }
// --- plan 4 : bonus
hit(B4[2] + 1.0, [0, 3, 2], 30, 420, 'boom');
// --- plan 5 : mêlée à 12, puis victoire
const S5E = [], ORDER = [0, 3, 6, 1, 4, 7, 2, 5];
const base5 = (i, t) => { const u = t - T.s5; if (i < 4) { const a = i * PI / 2 - .55 * u + .4, r = 3.4 + .3 * Math.sin(t * 3 + i * 2); return [Math.cos(a) * r, Math.sin(a) * r]; } const a = (i - 4) * PI / 4 + .28 * u, r = 8.6 + .45 * Math.sin(t * 2.2 + i); return [Math.cos(a) * r, Math.sin(a) * r]; };
ORDER.forEach((o, k) => {                                                   // 8 boules du tour extérieur
  const e = T.s5 + 1.2 + k * .375, v = base5(4 + o, e), L = Math.hypot(v[0], v[1]), c = [v[0] * (L - 4) / L, v[1] * (L - 4) / L];
  let best = 1, bd = 1e9; for (let j = 0; j < 4; j++) { const b = base5(j, e), d = Math.hypot(b[0] - c[0], b[1] - c[1]) + (S5E.some(x => x.h === j && e - x.e < .7) ? 50 : 0); if (d < bd) { bd = d; best = j; } }
  S5E.push({ e, v: 4 + o, h: best, c, p: v, d: [v[0] / L, v[1] / L] });
});
[[1, T.win - .75], [2, T.win - .375], [3, T.win]].forEach(([j, e]) => {      // les 3 dernières, éjectées par le héros
  const v = base5(j, e), hb = base5(0, e), d = [v[0] - hb[0], v[1] - hb[1]], L = Math.hypot(d[0], d[1]); d[0] /= L; d[1] /= L;
  S5E.push({ e, v: j, h: 0, c: [v[0] - d[0] * 4, v[1] - d[1] * 4], p: v, d });
});
S5E.forEach((x, k) => hit(x.e, [x.p[0] - x.d[0] * 2, 2, x.p[1] - x.d[1] * 2], k >= 8 ? 22 : 10, k >= 8 ? 320 : 230, k % 3 === 0 || k >= 8 ? 'impact' : 'thud'));
const S5F = [T.s5 + 2.4, T.win - .6];
function pos5(i, t) {
  const tt = Math.min(t, T.win); let p = base5(i, tt), w = 0, c = null;
  for (const x of S5E) if (x.h === i) { const k = tt < x.e ? ease.in(inv(x.e - .3, x.e, tt)) : 1 - ease.io(inv(x.e, x.e + .42, tt)); if (k > w) { w = k; c = x.c; } }
  if (c) p = [lerp(p[0], c[0], w), lerp(p[1], c[1], w)];
  if (i === 0 && t > T.win) { const k = ease.io(inv(T.win, T.win + .6, t)); p = [lerp(p[0], 0, k), lerp(p[1], 0, k)]; }
  return p;
}

// ---------- bruitages (déclarés une fois)
cue(0, 'whoosh', .9); cue(.02, 'roll', .7, .95); cue(1.25, 'sweepdown', .8); cue(1.5, 'crowd', .5, .9);
cue(T.s1, 'whistle', .8); cue(S1F[0] - 1.0, 'tick', .7); cue(S1F[0] - .5, 'tick', .7); cue(S1F[0], 'crunch', .9); cue(T.s1 + 1.85, 'sweepdown', .6); cue(S1F[1] - .5, 'tick', .7); cue(S1F[1], 'crunch', .9); cue(S1F[1] + .1, 'sweepdown', .6);
cue(T.s2 - .15, 'whoosh', .8); cue(T.s2, 'whistle', .8); cue(T.s2 + .1, 'slide', .6); cue(T.s2 + 3.6, 'win', .9); cue(T.s2 + 3.65, 'crowd', .8, 1.1); cue(T.s2 + 3.6, 'horn', .6);
cue(T.s3 - .15, 'whoosh', .8); cue(S3.g0, 'boing', .9); cue(S3.y0, 'boing', .9); cue(S3.y2, 'boing', 1); cue(T.s3 + .3, 'boing', .35); cue(T.s3 + 1.5, 'boing', .35); cue(T.s3 + 2.7, 'boing', .35); cue(S3.g1 + .3, 'sweepdown', .5); cue(T.s3 + 3.0, 'chime', .6);
cue(B4[0], 'swish', .8); cue(B4[0] + .45, 'powerup', .9); cue(B4[0] + .6, 'zap', .5); cue(B4[1], 'swish', .8); cue(B4[1] + .35, 'powerup', .9); cue(B4[1] + .5, 'boing', 1); cue(B4[2], 'swish', .8); cue(B4[2] + .22, 'powerup', .9); cue(B4[2] + .3, 'riser', .6, .7);
cue(T.s5 - .2, 'whoosh', .9); cue(T.s5, 'whistle', .9); cue(T.s5 + .1, 'roll', .6, 1.1); cue(S5F[0], 'crunch', .8); cue(S5F[1], 'crunch', .8); cue(T.win - 1.5, 'riser', .7, 1.5);
cue(T.win + .05, 'win', 1); cue(T.win + .1, 'crowd', .9, 2.2); cue(T.win + .5, 'pop', .7); cue(T.win + .9, 'pop', .6);
cue(T.end, 'boom', .9); cue(T.end + .15, 'whoosh', .7); cue(T.end + .85, 'pop', .8); cue(T.end + 1.3, 'ding', .7);

// =====================================================================================  aides 2D
const _v = new THREE.Vector3();
function scr(p) { _v.set(p[0], p[1], p[2]).project(camera); return [(_v.x * .5 + .5) * W, (-_v.y * .5 + .5) * H]; }
function burst(t, at, p, size) {
  const lt = t - at; if (lt < 0 || lt > .36) return; const [x, y] = scr(p), k = ease.out(inv(0, .14, lt)), a = 1 - inv(.2, .36, lt);
  ctx.save(); ctx.translate(x, y); ctx.rotate(hash(at * 3.3) * 6); ctx.globalAlpha = a;
  for (const [rr, col] of [[1, '#ffffff'], [.72, '#ffe14d'], [.4, '#ff7a1a']]) { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 24; i++) { const r2 = (i % 2 ? .52 : 1) * size * .5 * k * rr * (1 + (hash(i + at) - .5) * .25), an = i * PI / 12; ctx.lineTo(Math.cos(an) * r2, Math.sin(an) * r2); } ctx.fill(); }
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const an = i * PI / 4 + .3, r0 = size * (.55 + .5 * inv(0, .3, lt)), r1 = r0 + size * .22; ctx.beginPath(); ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); ctx.stroke(); }
  ctx.restore();
}
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const HUDBG = 'rgba(10,16,48,.86)';
function hudArena(name, a = 1) { pill('ARÈNE · ' + name, SAFE.cx, 262, { size: 40, bg: HUDBG, color: '#ffffff', border: 'rgba(255,255,255,.55)', borderW: 4, alpha: a }); }
function hudTimer(sec, x = 250, a = 1) { pill(mmss(sec), x, 356, { size: 50, bg: HUDBG, color: '#ffd23f', alpha: a, font: 'Anton', pad: 34 }); }
function hudAlive(n, popAt, t, a = 1) { pill('EN JEU  ' + n, 790, 356, { size: 50, bg: HUDBG, color: '#ffffff', alpha: a, font: 'Anton', pad: 34, scale: 1 + .22 * bump(t, popAt, .05, .3) }); }
function modeTitle(t, a, b, n, name, grad) {
  if (t < a || t > b) return;
  pill('MODE ' + n + ' / 3', SAFE.cx, 1168, { size: 42, bg: '#ffffff', color: PAL.navy, weight: 900, alpha: win(t, a + .1, b, .18), scale: ease.back(inv(a + .1, a + .4, t)) });
  caption(t, a, b, name, { font: 'Anton', size: 138, y: 1310, anim: 'slam', grad, stroke: PAL.navy, strokeW: 22, spacing: 5, tilt: -4, maxW: SAFE.w - 60 });
}
const sub = (t, a, b, s, bgc, o = {}) => caption(t, a, b, s, { bg: bgc, size: 66, y: 1322, anim: 'slide', tilt: -2, color: '#ffffff', ...o });
function sky(stops, t, sunY = 620, sunCol = 'rgba(255,255,255,.2)') {
  bg(stops); const g = ctx.createRadialGradient(W / 2, sunY, 0, W / 2, sunY, 760); g.addColorStop(0, sunCol); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  rays(t, { cy: sunY, color: 'rgba(255,255,255,.055)', speed: .08, n: 14 });
}

// =====================================================================================  rendu
function render(t) {
  for (const b of ALLB) b.visible = false;
  for (const o of [pkMag, pkJump, pkBig, crown, magnet, bigBall, ...magRings, ...sparks]) o.visible = false;
  goldZone.visible = true; setPads([], t);
  let arena = isle, hudA = 0, sx = 0, sy = 0, a3 = 1;
  for (const m of IMP) { const s = shake(t, m.t, m.amp, .4); sx += s[0]; sy += s[1]; }
  clouds.position.set(Math.sin(t * .1) * 2, 0, 0);

  if (t < T.s1) {                                                              // ---- ACCROCHE : le choc
    arena = isle; setIsle(t, null, null); sky(['#1565d8', '#58b8ff', '#d9f3ff'], t);
    const r = trk(K_H.red, t), b = trk(K_H.blue, t);
    if (t < 1.6) roll(HERO, r, t); else put(HERO, r.x, R + Math.abs(Math.sin((t - 1.6) * 7)) * .8, r.z, { h: .25, roll: r.d / R, pose: 'cheer', t });
    if (t < 1.0) roll(P[7], b, t); else fly(P[7], 0, -2, -.12, -1, t - 1.0, t, { sp: 15, vy: 13 });
    roll(P[2], trk(K_H.y, t), t); roll(P[3], trk(K_H.p, t), t);
    const k = prog(t, 0, 1.0, ease.io), k2 = prog(t, 1.0, 2.4);
    camLook(camera, [lerp(7, 5, k) + k2 * 1.5, lerp(7.5, 6.5, k) + k2 * 3.5, lerp(27, 21, k) + k2 * 5], [0, 2.4 + k2 * 2.2, lerp(1.5, -1, k) - k2 * 3], 46);
  } else if (t < T.s2) {                                                       // ---- PLAN 1 : Dernier survivant / Île qui rétrécit
    const u = t - T.s1; arena = isle; setIsle(t, S1F[0], S1F[1]); sky(['#1565d8', '#58b8ff', '#d9f3ff'], t); hudA = 1;
    roll(HERO, trk(K1.red, u), t);
    u < 1.6 ? roll(P[1], trk(K1.green, u), t) : fly(P[1], -6.83, -4.83, -1, -1, u - 1.6, t);
    if (u < 3.4) roll(P[2], trk(K1.yellow, u), t); else { const lt = u - 3.4; put(P[2], 8.2, R - 17 * lt * lt, -.6, { pose: 'fall', t, roll: lt * 3, h: 1 }); }
    roll(P[4], trk(K1.cyan, u), t);
    u < 3.2 ? roll(P[3], trk(K1.purple, u), t) : fly(P[3], 5.93, 3.56, .857, .514, u - 3.2, t);
    roll(P[5], trk(K1.pink, u), t);
    const a = .55 + u * .1, d = lerp(27, 21, prog(u, 0, 4.8, ease.io));
    camLook(camera, [Math.sin(a) * d, lerp(27, 21, prog(u, 0, 4.8, ease.io)), Math.cos(a) * d], [0, -1.5, .5], 54);
  } else if (t < T.s3) {                                                       // ---- PLAN 2 : Foot-boules / Lac gelé
    const v = t - T.s2; arena = ice; sky(['#0b2a6b', '#3f8be0', '#d6f3ff'], t, 560, 'rgba(210,240,255,.3)'); hudA = 1;
    const goalT = 3.6, kb = trk(K2.ball, v);
    bigBall.visible = true; bigBall.position.set(kb.x, 3, kb.z); bigBall.rotation.set(kb.d / 3, kb.h, 0);
    const cheer = (b, k, i) => v > goalT + .15 ? put(b, k.x, R + Math.abs(Math.sin((v - goalT) * 7 + i)) * .9, k.z, { h: PI, chH: 0, roll: k.d / R, pose: 'cheer', t }) : roll(b, k, t);
    cheer(TB[0], trk(K2.b0, v), 0); cheer(TB[1], trk(K2.b1, v), 1); cheer(TB[2], trk(K2.b2, v), 2);
    roll(TO[0], trk(K2.o0, v), t); roll(TO[1], trk(K2.o1, v), t); roll(TO[2], trk(K2.o2, v), t);
    const k = prog(v, 0, 3.6, ease.io);
    camLook(camera, [lerp(4, -2.5, k), lerp(15, 12, k), lerp(33, 27, k)], [0, 1.5, lerp(-2, -7, k)], 48);
  } else if (t < T.s4) {                                                       // ---- PLAN 3 : Roi de la colline / Parc à ressorts
    const w = t - T.s3; arena = park; sky(['#3b1a8f', '#b04cd8', '#ffb37a'], t, 700, 'rgba(255,220,160,.3)'); hudA = 1; setPads(PADT, t);
    const rc = bump(t, S3.g1, .02, .5), rc2 = bump(t, S3.y1, .02, .5), hx = .8 * rc - .8 * rc2, hz = -.8 * rc + .8 * rc2;
    put(HERO, hx, R, hz, { h: t < S3.y0 ? -.78 : 2.36, roll: t * .6, pose: w > 3.8 ? 'cheer' : 'idle', t });
    crown.visible = true; crown.position.set(hx, 2 * R + 1 + Math.sin(t * 4) * .2, hz); crown.rotation.y = t * 1.6;
    goldZone.userData.beam.material.opacity = .11 + .05 * Math.sin(t * 5);
    const arc = (b, p0, p1, s, Hh, y0, y1, pose = 'fall') => put(b, lerp(p0[0], p1[0], s), lerp(y0, y1, s) + Hh * 4 * s * (1 - s), lerp(p0[1], p1[1], s), { h: Math.atan2(p1[0] - p0[0], p1[1] - p0[1]), roll: s * 7, pose, t });
    const YP = R + .62;
    if (t < S3.g0) roll(P[1], trk([[0, -10.2, 1.5], [.6, -6, 6]], w), t, { y: lerp(R, YP, inv(.35, .6, w)) });           // vert : trampoline → zone → éjecté
    else if (t < S3.g1) arc(P[1], [-6, 6], [-2.83, 2.83], inv(S3.g0, S3.g1, t), 7, YP, R);
    else fly(P[1], -2.83, 2.83, -1, 1, t - S3.g1, t, { sp: 15, vy: 12 });
    if (t < S3.y0) roll(P[2], trk([[1.2, 10.6, -2.5], [2.4, 6, -6]], w), t, { y: lerp(R, YP, inv(2.15, 2.4, w)) });      // jaune : rebondit deux fois
    else if (t < S3.y1) arc(P[2], [6, -6], [2.83, -2.83], inv(S3.y0, S3.y1, t), 7, YP, R);
    else if (t < S3.y2) arc(P[2], [2.83, -2.83], [6, -6], inv(S3.y1, S3.y2, t), 1.6, R, YP);
    else fly(P[2], 6, -6, 1, -1, t - S3.y2, t, { sp: 8, vy: 21, y0: YP });
    [[P[4], 0, .3], [P[5], 2, .9]].forEach(([b, i, ph]) => { const s = (((w - ph) / 1.2) % 1 + 1) % 1; put(b, TR[i][0], YP + 5 * 4 * s * (1 - s), TR[i][1], { h: i ? .6 : -2.4, roll: w * 2, pose: s > .1 && s < .9 ? 'cheer' : 'idle', t }); });
    const a = -.12 + w * .06;
    camLook(camera, [Math.sin(a) * 29, lerp(15, 12.5, prog(w, 0, 4.8, ease.io)), Math.cos(a) * 29], [0, 3.2, -.5], 50);
  } else if (t < T.s5) {                                                       // ---- PLAN 4 : les 3 bonus
    hudA = 0;
    if (t < B4[1]) {                                                           // aimant (Lac gelé)
      const x = t - B4[0]; arena = ice; sky(['#0b2a6b', '#3f8be0', '#d6f3ff'], t, 560, 'rgba(210,240,255,.3)');
      const k = trk([[0, -5.5, 9], [.45, 0, 5, 'out'], [1.6, 2, 2.5]], x); roll(HERO, k, t); setPickup(pkMag, 0, 5, t, B4[0] + .45);
      roll(P[4], trk([[0, 6.5, -1], [1.6, 4.8, 1.2]], x), t); roll(P[8], trk([[0, -6, -3], [1.6, -3.8, -.6]], x), t);
      if (x > .45) { const kk = ease.back(inv(.45, .75, x)); magnet.visible = true; magnet.position.set(k.x, 2 * R + 1.1 + Math.sin(t * 6) * .15, k.z); magnet.rotation.set(0, t * 3, 0); magnet.scale.setScalar(1.5 * kk);
        magRings.forEach((m, i) => { const ph = ((x - .45) * 1.6 + i / 3) % 1; m.visible = true; m.position.set(k.x, .25, k.z); m.scale.setScalar(2.2 + ph * 5.5); m.material.opacity = .85 * (1 - ph); }); }
      camLook(camera, [5 - x * .8, 8.5, 23 - x], [.5, 2.8, 4], 46);
    } else if (t < B4[2]) {                                                    // super saut (Parc à ressorts)
      const x = t - B4[1]; arena = park; goldZone.visible = false; sky(['#3b1a8f', '#b04cd8', '#ffb37a'], t, 700, 'rgba(255,220,160,.3)');
      setPickup(pkJump, -1, 1, t, B4[1] + .35);
      const s = inv(.5, 1.55, x), k = trk([[0, -5, 1], [.4, -1, 1, 'out']], x), jy = 10.5 * 4 * s * (1 - s);
      put(HERO, k.x + s * 2.2, R + jy, 1, { h: PI / 2, roll: k.d / R + s * 5, pose: s > 0 && s < 1 ? 'cheer' : 'run', t });
      roll(P[3], trk([[.15, 11, 1], [1.45, -8.5, 1]], x), t);
      if (s > 0 && s < 1) sparks.slice(0, 3).forEach((g, i) => { g.visible = true; g.position.set(k.x + s * 2.2, R + jy - 2.2 - i * 1.3, 1); g.scale.setScalar(3.2 - i * .8); g.material.opacity = .8 - i * .2; g.material.color.set('#8dffb0'); });
      camLook(camera, [1.5, 6 + jy * .22, 27], [.3, 4.6 + jy * .32, 1], 50);
    } else {                                                                   // géant (Île qui rétrécit)
      const x = t - B4[2]; arena = isle; setIsle(t, null, null); sky(['#1565d8', '#58b8ff', '#d9f3ff'], t);
      setPickup(pkBig, 0, 2, t, B4[2] + .22);
      const s = 1 + 1.35 * ease.elastic(inv(.22, .85, x));
      put(HERO, 0, R * s, 2, { h: 0, roll: 0, pose: x > 1 ? 'cheer' : 'idle', t, s });
      [[P[1], 2.5], [P[6], .2], [P[10], -2.1]].forEach(([b, an]) => { const dx = Math.sin(an), dz = Math.cos(an), r1 = R * 2.35 + R + .1;
        if (x < 1) { const r = lerp(11, r1, ease.in(inv(0, 1, x))); put(b, dx * r, R, 2 + dz * r, { h: an + PI, roll: -r / R * 1.0, t }); } else fly(b, dx * r1, 2 + dz * r1, dx, dz, x - 1, t, { sp: 19, vy: 14 }); });
      camLook(camera, [3, 9.5, 29 - x * 1.2], [0, 4.2, 1], 50);
    }
  } else if (t < T.end) {                                                      // ---- PLAN 5 : mêlée à 12 puis victoire
    arena = isle; setIsle(t, S5F[0], S5F[1]); sky(['#101a52', '#e0527d', '#ffc46b'], t, 760, 'rgba(255,230,170,.35)'); hudA = t < T.win + .2 ? 1 : 0;
    for (let i = 0; i < 12; i++) {
      const ev = S5E.find(x => x.v === i);
      if (ev && t >= ev.e) { fly(P[i], ev.p[0], ev.p[1], ev.d[0], ev.d[1], t - ev.e, t, { sp: i < 4 ? 15 : 17, vy: 11 }); continue; }
      const p = pos5(i, t), q = pos5(i, t - .05), h = Math.atan2(p[0] - q[0], p[1] - q[1]);
      if (i === 0 && t > T.win + .3) put(P[0], p[0], R + Math.abs(Math.sin((t - T.win) * 7)) * 1.1, p[1], { h: .2, roll: 0, pose: 'cheer', t });
      else put(P[i], p[0], R, p[1], { h, roll: t * (i < 4 ? 3.5 : 2.6), t });
    }
    const k = prog(t, T.s5 + 1.6, T.win, ease.io), kw = prog(t, T.win, T.win + .9, ease.io), a = (t - T.s5) * .09;
    const hp = pos5(0, t), cx = Math.sin(a) * lerp(20, 27, k), cz = Math.cos(a) * lerp(20, 27, k);
    camLook(camera, [lerp(cx, 3.5, kw), lerp(lerp(33, 17, k), 6, kw), lerp(cz, 17 - (t - T.win) * .8, kw)], [lerp(0, hp[0], kw), lerp(-1, 3.2, kw), lerp(0, hp[1], kw)], lerp(55, 46, kw));
  } else {                                                                     // ---- ÉCRAN FINAL : fond animé (Parc à ressorts)
    const e = t - T.end; arena = park; sky(['#2a1378', '#a044cf', '#ff9f6b'], t, 640, 'rgba(255,220,160,.3)');
    const times = [[], [], [], []];
    [[P[4], 0, .1], [P[7], 1, .7], [P[2], 2, .4], [P[5], 3, 1.0]].forEach(([b, i, ph]) => { const s = (((e + ph) / 1.2) % 1 + 1) % 1; for (let n = 0; n < 6; n++) times[i].push(T.end - ph + n * 1.2); put(b, TR[i][0], R + .62 + 6 * 4 * s * (1 - s), TR[i][1], { h: e + i, roll: e * 2, pose: 'cheer', t }); });
    setPads(times, t); put(HERO, 0, R + Math.abs(Math.sin(e * 6)) * .9, 0, { h: e * .5, roll: 0, pose: 'cheer', t });
    const a = .3 + e * .12; camLook(camera, [Math.sin(a) * 27, 8 + e * .25, Math.cos(a) * 27], [0, 8.5, 0], 50);
  }
  showOnly(ARENAS, arena);

  // halos 3D des chocs
  let si = 3; for (const m of IMP) { const lt = t - m.t; if (lt >= 0 && lt < .3 && si < 5) { const g = sparks[si++]; g.visible = true; g.position.set(...m.p); g.scale.setScalar(m.size / 40 * (.5 + lt * 3)); g.material.opacity = 1 - lt / .3; g.material.color.set('#fff2b0'); } }

  draw3D(scene, camera, { dx: sx, dy: sy });
  for (const m of IMP) burst(t, m.t, m.p, m.size);
  vignette(.3);

  // ------------------------------------------------------------------ textes et affichages
  // accroche
  caption(t, .08, T.s1 - .12, 'TU TIENS\nSUR L\'ARÈNE ?', { font: 'Anton', size: 150, y: 470, anim: 'slam', grad: ['#ffffff', '#ffe14d'], stroke: PAL.navy, strokeW: 24, spacing: 6, tilt: -5, lineH: 1.12, inDur: .2 });
  if (t > 1.0 && t < T.s1) speedLines(t, { alpha: .35 * (1 - inv(1.0, 1.6, t)), cy: H * .5 });
  flash(t, 1.0, .22, '255,255,255', .7);
  flash(t, T.s1, .3);

  // plan 1
  if (t >= T.s1 && t < T.s2) {
    const u = t - T.s1, a = win(t, T.s1 + .15, T.s2 - .05, .2), alive = 6 - (u > 1.6) - (u > 3.2) - (u > 3.4);
    hudArena('ÎLE QUI RÉTRÉCIT', a); hudTimer(52 - u, 250, a); hudAlive(alive, T.s1 + (u > 3.4 ? 3.4 : u > 3.2 ? 3.2 : 1.6), t, a);
    modeTitle(t, T.s1 + .12, T.s1 + 2.2, 1, 'DERNIER SURVIVANT', ['#ffffff', '#ff8f6b']);
    sub(t, T.s1 + 2.35, T.s2 - .15, 'Éjecte tout le monde !', PAL.red);
  }
  wipe(t, T.s2, { color: '#2f7bff', color2: '#ffffff', dur: .42 });

  // plan 2
  if (t >= T.s2 && t < T.s3) {
    const v = t - T.s2, a = win(t, T.s2 + .15, T.s3 - .05, .2), sc = v > 3.6 ? 1 : 0, pop = 1 + .3 * bump(t, T.s2 + 3.6, .05, .4);
    hudArena('LAC GELÉ', a);
    pill('BLEUS', 318, 356, { size: 46, bg: PAL.blue, color: '#fff', font: 'Anton', alpha: a, pad: 30 });
    pill(sc + '  -  0', SAFE.cx, 356, { size: 54, bg: HUDBG, color: '#ffd23f', font: 'Anton', alpha: a, pad: 30, scale: pop });
    pill('ORANGES', 782, 356, { size: 46, bg: PAL.orange, color: '#fff', font: 'Anton', alpha: a, pad: 30 });
    modeTitle(t, T.s2 + .15, T.s2 + 2.2, 2, 'FOOT-BOULES', ['#ffffff', '#8fd0ff']);
    sub(t, T.s2 + 2.3, T.s2 + 3.5, 'Pousse le gros ballon', PAL.blue);
    if (v > 3.6) { confetti(t, T.s2 + 3.6, { colors: ['#2f7bff', '#8fd0ff', '#ffffff', '#ffd23f'], cy: H * .36 }); caption(t, T.s2 + 3.6, T.s3 - .1, 'BUT !', { font: 'Anton', size: 260, y: 1250, anim: 'slam', grad: ['#ffffff', '#ffd23f'], stroke: PAL.navy, strokeW: 30, spacing: 10, tilt: -6 }); }
    flash(t, T.s2 + 3.6, .25, '255,255,255', .6);
  }
  wipe(t, T.s3, { color: '#ffd23f', color2: '#a05cff', dur: .42, dir: 'right' });

  // plan 3
  if (t >= T.s3 && t < T.s4) {
    const w = t - T.s3, a = win(t, T.s3 + .15, T.s4 - .05, .2);
    hudArena('PARC À RESSORTS', a);
    ctx.save(); ctx.globalAlpha = a; pill('ZONE DORÉE', 300, 356, { size: 44, bg: PAL.gold, color: PAL.navy, font: 'Anton', pad: 28 }); bar(470, 328, 470, 56, .12 + .8 * inv(0, 4.8, w), { color: '#ffd23f' }); ctx.restore();
    modeTitle(t, T.s3 + .15, T.s3 + 2.2, 3, 'ROI DE LA COLLINE', ['#ffffff', '#ffd23f']);
    sub(t, T.s3 + 2.35, T.s4 - .15, 'Reste seul dans la zone dorée', '#7c3aed', { size: 60 });
  }
  flash(t, T.s4, .25);

  // plan 4 : bonus
  if (t >= T.s4 && t < T.s5) {
    const i = t < B4[1] ? 0 : t < B4[2] ? 1 : 2, a = B4[i], b = a + 1.6;
    pill('BONUS ' + (i + 1) + ' / 3', SAFE.cx, 300, { size: 50, bg: '#ffffff', color: PAL.navy, weight: 900, scale: ease.back(inv(a, a + .25, t)) });
    caption(t, a + .05, b - .04, ['AIMANT', 'SUPER SAUT', 'GÉANT !'][i], { font: 'Anton', size: 170, y: 1300, anim: 'slam', inDur: .18, grad: [['#ffffff', '#7fe6ff'], ['#ffffff', '#8dffb0'], ['#ffffff', '#ff9ac6']][i], stroke: PAL.navy, strokeW: 26, spacing: 8, tilt: -5 });
    if (i > 0) flash(t, a, .2, '255,255,255', .8);
  }
  wipe(t, T.s5, { color: '#ff3b3b', color2: '#ffd23f', dur: .42 });

  // plan 5 : mêlée et victoire
  if (t >= T.s5 && t < T.end) {
    const a = win(t, T.s5 + .15, T.win + .2, .2); let n = 12, last = -9; for (const x of S5E) if (t >= x.e) { n--; last = x.e; }
    if (a > 0) { hudArena('ÎLE QUI RÉTRÉCIT', a); hudTimer(Math.max(0, 21 - (t - T.s5)), 250, a); hudAlive(n, last, t, a); }
    caption(t, T.s5 + .15, T.s5 + 2.25, 'JUSQU\'À 12 JOUEURS', { font: 'Anton', size: 132, y: 1310, anim: 'slam', grad: ['#ffffff', '#ffe14d'], stroke: PAL.navy, strokeW: 22, spacing: 5, tilt: -4, maxW: SAFE.w - 60 });
    sub(t, T.s5 + 2.4, T.win - .12, 'Manches de 90 secondes', PAL.red);
    if (t >= T.win) {
      speedLines(t, { alpha: .3 * (1 - inv(T.win, T.win + 1.2, t)) }); confetti(t, T.win, { n: 150, cy: H * .38 }); confetti(t, T.win + .5, { n: 70, cx: 240, cy: H * .45, power: 1100 }); confetti(t, T.win + .9, { n: 70, cx: 840, cy: H * .45, power: 1100 });
      caption(t, T.win + .05, T.end - .1, 'VICTOIRE !', { font: 'Anton', size: 220, y: 450, anim: 'slam', grad: ['#fff7b0', '#ffb01f'], stroke: PAL.navy, strokeW: 28, spacing: 8, tilt: -5 });
      sub(t, T.win + .6, T.end - .12, 'Dernière boule sur l\'arène', '#16a34a', { anim: 'pop' });
    }
    flash(t, T.win, .3);
  }
  flash(t, T.end, .35);

  // écran final
  if (t >= T.end) {
    fade(.5 * inv(T.end, T.end + .4, t), PAL.navy); rays(t, { cy: 640, color: 'rgba(255,210,63,.09)' }); sparkles(t, { y: 240, h: 1000, color: '#ffe9a0' });
    ctx.save(); ctx.translate(SAFE.cx, 800); ctx.rotate(-2.5 * DEGR); ctx.translate(-SAFE.cx, -800);
    endCard(t, T.end + .12, { title: 'BUMPER BALL\nARENA', tagline: 'Pousse. Rebondis. Marque !', status: 'bientot', font: 'Anton', titleGrad: ['#ffffff', '#ffd23f'], titleStroke: PAL.navy, titleSize: 170, accent: PAL.red });
    ctx.restore();
  }
}
const DEGR = PI / 180;

registerAd({ duration: DURATION, thumbTime: T.win + .7, render,
  music: { style: 'arena', bpm: BPM, sections: [[0, 'build'], [T.s1, 'drop'], [T.s4, 'build'], [T.s5, 'drop2'], [T.end, 'outro']], end: T.end } });
