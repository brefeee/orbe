// Publicité « Beat Bounce » (jeu de rythme, statut : bientôt). 19 mesures à 128 bpm = 35,6 s.
// Tout est calé sur le temps de la musique : un temps = 60 / 128 s, chaque rebond retombe pile sur un temps.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseIdle, poseCheer, showOnly, glow, sign, canvasTex, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles, roundRect, rgba,
  text, caption, pill, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Orbitron', 'Inter']);
const BPM = 128, BEAT = 60 / BPM, BAR = 4 * BEAT;
const T = { hook: 0, songs: 2 * BAR, diff: 5 * BAR, play: 8 * BAR, result: 12 * BAR, lead: 14 * BAR, end: 16 * BAR }, DURATION = 19 * BAR;
const C = { cyan: '#22e6ff', pink: '#ff3df0', yellow: '#ffe14d', green: '#4dff9a', violet: '#8a5cff', night: '#07031a', deep: '#160a3a' };
const NEON = [C.cyan, C.pink, C.yellow, C.green, C.violet];
const TITLE = 'Orbitron';
/** Impulsion de 1 à 0 qui repart à chaque temps. */
const pulse = (t, k = 5) => Math.exp(-((t / BEAT) % 1) * k);
const frac = x => x - Math.floor(x);

// =====================================================================================  3D
gl3D({ exposure: 1.1 });
const scene = new THREE.Scene(), camera = makeCamera(42);
scene.fog = new THREE.Fog('#0b0424', 34, 120);
const lights = addLights(scene, { sun: '#ffffff', sunI: 2.3, sky: '#b9c6ff', ground: '#ff5fd8', ambI: 1.05, dir: [5, 13, 9], shadowArea: 18 });

const emis = (color, i = 1.6) => mat('#101018', { emissive: color, emissiveI: i, rough: .5 });
const ownEmis = color => new THREE.MeshStandardMaterial({ color: '#0d0d16', emissive: color, emissiveIntensity: 1, roughness: .45 });
const basic = (color, opacity = 1, add = false) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1 || add, opacity, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !add, side: THREE.DoubleSide, fog: !add });

// sol : grille néon (non éclairée, toujours visible)
const gridTex = canvasTex(256, (g, n) => {
  g.fillStyle = '#090522'; g.fillRect(0, 0, n, n);
  g.strokeStyle = '#3b1d8f'; g.lineWidth = 5; g.strokeRect(0, 0, n, n);
  g.strokeStyle = 'rgba(255,61,240,.5)'; g.lineWidth = 1.5; g.strokeRect(0, 0, n, n);
  g.fillStyle = 'rgba(34,230,255,.75)'; for (const [x, y] of [[0, 0], [n, 0], [0, n], [n, n]]) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
}, { repeat: 90 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), new THREE.MeshBasicMaterial({ map: gridTex }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.02; scene.add(floor);

/** Faisceau de projecteur (cône additif, sommet à l'origine du groupe). */
function makeBeam(color, len = 34, r = 3.2) {
  const g = new THREE.ConeGeometry(r, len, 20, 1, true); g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, basic(color, .16, true)); m.castShadow = m.receiveShadow = false;
  const grp = new THREE.Group(); grp.add(m); const head = glow(color, 5, .9); grp.add(head); grp.userData.m = m; return grp;
}
/** Dalle lumineuse : socle sombre, plaque émissive propre (intensité animée), liseré, halo. */
function makeTile(color, size = 2.6) {
  const g = new THREE.Group();
  g.add(rbox(size, size, .5, .16, '#221a5e', { rough: .4, pos: [0, -.25, 0], rot: [Math.PI / 2, 0, 0] }));
  const m = ownEmis(color); const plate = new THREE.Mesh(new THREE.BoxGeometry(size * .86, .08, size * .86), m); plate.position.y = .03; plate.receiveShadow = true; g.add(plate);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(size * .96, .05, size * .96), emis(color, .9)); rim.position.y = -.02; g.add(rim);
  const h = glow(color, size * 2.4, .3); h.position.y = .35; g.add(h);
  g.userData = { m, h, size }; return g;
}
function lightTile(tile, k) { tile.userData.m.emissiveIntensity = k; tile.userData.h.material.opacity = clamp(.1 + k * .22, 0, .95); }
/** Enceinte de scène. */
function makeSpeaker(color) {
  const g = new THREE.Group(); g.add(rbox(3, 5, 2.2, .18, '#17142e', { rough: .6, pos: [0, 2.5, 0] }));
  const cones = [];
  for (const [y, r] of [[1.55, 1.05], [3.75, .7]]) {
    const ring = torus(r, .1, color, { emissive: color, emissiveI: 1.6, pos: [0, y, 1.12] }); g.add(ring);
    const c = cyl(r * .9, r * .5, .25, '#0a0a14', { rough: .3, rot: [Math.PI / 2, 0, 0], pos: [0, y, 1.1] }); g.add(c);
    const d = ball(r * .32, '#2a2a44', { pos: [0, y, 1.15], rough: .3 }); g.add(d); cones.push([ring, c, d]);
  }
  g.userData.cones = cones; return g;
}
function pumpSpeaker(s, k) { for (const [ring, c, d] of s.userData.cones) { const z = 1 + k * .14; ring.scale.setScalar(z); c.scale.set(z, 1, z); d.position.z = 1.15 + k * .16; } }

/** Héros : personnage en blocs avec casque audio néon. */
function makeDancer(shirt, hair, cup) {
  const ch = makeCharacter({ shirt, pants: '#232a63', hair, face: 'happy', skin: '#f2c6a0' });
  const band = new THREE.Mesh(new THREE.TorusGeometry(.78, .09, 8, 18, Math.PI), mat('#f4f6ff', { rough: .4 })); band.position.set(0, .7, 0); ch.parts.head.add(band);
  for (const s of [-1, 1]) { ch.parts.head.add(cyl(.34, .34, .24, cup, { emissive: cup, emissiveI: 1.2, rot: [0, 0, Math.PI / 2], pos: [s * .76, .62, 0] })); }
  return ch;
}
/** Pose de rebond : p = avancement du saut (0 = appui, 1 = réception), h = hauteur. */
function hop(ch, p, h, baseY = 0, S = 1) {
  const s = Math.sin(Math.PI * p), P = ch.parts;
  ch.position.y = baseY + 4 * h * p * (1 - p);
  const sq = 1 - .16 * Math.exp(-p * 10) - .1 * Math.exp(-(1 - p) * 14), wd = 1 + (1 - sq) * .7;
  ch.scale.set(S * wd, S * sq, S * wd);
  P.armL.rotation.set(0, 0, -(.25 + 2.1 * s)); P.armR.rotation.set(0, 0, .25 + 2.1 * s);
  P.legL.rotation.set(.55 * s, 0, 0); P.legR.rotation.set(-.4 * s, 0, 0);
  P.head.rotation.set(-.18 * s, 0, 0); P.torso.rotation.set(0, 0, 0);
}

// ---------------------------------------------------------------- piste (accroche, partie, écran final)
const G_track = new THREE.Group(); scene.add(G_track);
const NT = 46, DZ = 3.2, ZIG = [0, 1.7, 0, -1.7];
const tileX = i => ZIG[((i % 4) + 4) % 4], tileZ = i => i * DZ;
const tiles = [];
for (let i = 0; i < NT; i++) { const tl = makeTile(NEON[i % 5]); tl.position.set(tileX(i), .5, tileZ(i)); G_track.add(tl); tiles.push(tl); }
// colonnes d'égaliseur le long de la piste
const eqCols = [];
for (let i = 0; i < NT; i++) for (const s of [-1, 1]) {
  const col = NEON[(i + (s > 0 ? 2 : 0)) % 5]; const b = box(1.1, 1, 1.1, col, { emissive: col, emissiveI: .9, rough: .5, cast: false });
  b.position.set(s * (8.6 + (i % 2) * 1.8), .5, i * DZ + 1.6); G_track.add(b); eqCols.push(b);
}
// arches néon au-dessus de la piste
for (let i = 0; i < 12; i++) { const col = NEON[(i * 2 + 1) % 5]; const a = torus(11, .22, col, { emissive: col, emissiveI: 1.5, seg: 40, cast: false }); a.position.set(0, 0, i * DZ * 4 + 6.4); G_track.add(a); }
// ondes de choc à chaque réception
const rings = []; for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1, .07, 8, 40), basic('#ffffff', 1, true)); r.rotation.x = Math.PI / 2; G_track.add(r); rings.push(r); }
const hero = makeDancer(C.pink, C.cyan, C.cyan); scene.add(hero);
const heroGlow = glow(C.pink, 9, .35); scene.add(heroGlow);
// projecteurs qui suivent la partie (le nombre allumé grandit avec le combo)
const rig = new THREE.Group(); scene.add(rig); const beams = [];
for (let i = 0; i < 8; i++) { const b = makeBeam(NEON[i % 5]); b.position.set((i % 2 ? 1 : -1) * (5 + (i >> 1) * 1.7), 24, -6 - (i >> 1) * 4); rig.add(b); beams.push(b); }

// ---------------------------------------------------------------- scène ronde (chansons, résultat, classement)
const G_stage = new THREE.Group(); scene.add(G_stage);
G_stage.add(cyl(8.2, 8.8, .7, '#141033', { rough: .45, pos: [0, .35, 0], seg: 48 }));
for (const [r, col] of [[7.9, C.cyan], [5.4, C.pink], [2.9, C.yellow]]) G_stage.add(torus(r, .1, col, { emissive: col, emissiveI: 1.6, rot: [Math.PI / 2, 0, 0], pos: [0, .72, 0], seg: 64, cast: false }));
const stageEq = [];
for (let i = 0; i < 17; i++) { const a = (i - 8) * .17, col = NEON[i % 5]; const b = box(1.25, 1, 1.25, col, { emissive: col, emissiveI: 1, cast: false }); b.position.set(Math.sin(a) * 15, .5, -Math.cos(a) * 15 + 2); b.rotation.y = -a; G_stage.add(b); stageEq.push(b); }
const spk = [makeSpeaker(C.cyan), makeSpeaker(C.pink)]; spk[0].position.set(-5.6, .7, -5.5); spk[0].rotation.y = .35; spk[1].position.set(5.6, .7, -5.5); spk[1].rotation.y = -.35; G_stage.add(...spk);
const stageBeams = []; for (let i = 0; i < 6; i++) { const b = makeBeam(NEON[(i + 1) % 5], 36, 3); b.position.set((i - 2.5) * 4.2, 26, -9); G_stage.add(b); stageBeams.push(b); }
// podium lumineux
const podium = new THREE.Group(); podium.add(cyl(2.3, 2.6, .9, '#1b1648', { rough: .4, pos: [0, 1.15, 0], seg: 32 }));
const podiumTop = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, .08, 32), ownEmis(C.yellow)); podiumTop.position.y = 1.62; podium.add(podiumTop);
podium.add(torus(2.35, .09, C.yellow, { emissive: C.yellow, emissiveI: 1.6, rot: [Math.PI / 2, 0, 0], pos: [0, 1.6, 0], cast: false })); G_stage.add(podium);
// carrousel des 5 chansons : 5 disques néon numérotés
const discs = [], G_discs = new THREE.Group(); G_stage.add(G_discs);
for (let i = 0; i < 5; i++) {
  const col = NEON[i], g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  spin.add(cyl(1.5, 1.5, .14, '#0b0b16', { rough: .25, rot: [Math.PI / 2, 0, 0], seg: 40 }));
  for (const r of [1.3, 1.1, .9]) spin.add(torus(r, .018, '#3a3a5c', { pos: [0, 0, .075], cast: false }));
  spin.add(cyl(.62, .62, .17, col, { emissive: col, emissiveI: 1.1, rot: [Math.PI / 2, 0, 0], seg: 32 }));
  spin.add(ball(.09, '#ffffff', { pos: [.42, 0, .09], emissive: '#ffffff', emissiveI: 1 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.58, .08, 8, 48), ownEmis(col)); g.add(rim);
  g.add(sign(.8, .8, (c, w, h) => { c.fillStyle = '#0b0b16'; c.font = `900 ${h * .8}px "Orbitron"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), w / 2, h * .54); }, { res: 128, emissive: true, pos: [0, 0, .1] }));
  const h = glow(col, 6, .3); g.add(h); g.userData = { spin, rim: rim.material, h }; G_discs.add(g); discs.push(g);
}

// ---------------------------------------------------------------- 3 couloirs (difficultés)
const G_diff = new THREE.Group(); scene.add(G_diff);
const LANES = [
  { name: 'FACILE', color: C.green, x: -3.9, d: 4.6, hopBeats: 2, h: 2.5, size: 3.0, n: 9 },
  { name: 'NORMAL', color: C.cyan, x: 0, d: 3.3, hopBeats: 1, h: 1.9, size: 2.4, n: 12 },
  { name: 'DIFFICILE', color: C.pink, x: 3.9, d: 2.3, hopBeats: .5, h: 1.0, size: 1.7, n: 17 },
];
for (const L of LANES) {
  L.tiles = []; for (let i = 0; i < L.n; i++) { const tl = makeTile(L.color, L.size); tl.position.x = L.x; G_diff.add(tl); L.tiles.push(tl); }
  L.ch = makeDancer(L.color, '#2b1a55', '#ffffff'); L.ch.position.x = L.x; G_diff.add(L.ch);
  L.beam = makeBeam(L.color, 30, 2.6); L.beam.position.set(L.x, 27, -1); G_diff.add(L.beam);
  for (const s of [-1, 1]) { const rail = box(.12, .12, 90, L.color, { emissive: L.color, emissiveI: 1.1, cast: false }); rail.position.set(L.x + s * 1.85, .06, -22); G_diff.add(rail); }
}
const diffEq = []; for (let i = 0; i < 13; i++) { const col = NEON[i % 5]; const b = box(1.3, 1, 1.3, col, { emissive: col, emissiveI: .9, cast: false }); b.position.set((i - 6) * 2.1, .5, -30); G_diff.add(b); diffEq.push(b); }

const GROUPS = [G_track, G_stage, G_diff];

// =====================================================================================  parcours du héros sur la piste
/** Avancement (en dalles) pour un nombre de temps b : 1 dalle par temps, puis double cadence après `dbl` temps. */
const steps = (b, dbl = 1e9) => b < dbl ? b : dbl + (b - dbl) * 2;
function runTrack(t, t0, first, dbl, h = 2.1) {
  const b = Math.max(0, (t - t0) / BEAT), u = steps(b, dbl), k = Math.floor(u), p = u - k, fast = b >= dbl;
  const i0 = first + k, x = lerp(tileX(i0), tileX(i0 + 1), ease.io(p)), z = lerp(tileZ(i0), tileZ(i0 + 1), p);
  hero.visible = true; hero.position.set(x, 0, z); hop(hero, p, fast ? h * .55 : h, .55);
  hero.rotation.set(0, (tileX(i0 + 1) - tileX(i0)) * .12, Math.sin(Math.PI * p) * (tileX(i0) - tileX(i0 + 1)) * .05);
  heroGlow.visible = true; heroGlow.position.set(x, hero.position.y + 2.6, z - 1.2);
  const dtLand = (fast ? BEAT / 2 : BEAT) * p;                         // temps écoulé depuis la dernière réception
  tiles.forEach((tl, i) => {
    const d = i - i0; let kI = .5 + .25 * pulse(t);
    if (d === 0) kI = 1.2 + 3.2 * Math.exp(-dtLand * 6); else if (d < 0) kI = .35 + 1.2 * Math.exp(-(dtLand - d * BEAT) * 2.2); else if (d === 1) kI = .9 + .5 * p;
    lightTile(tl, kI); tl.position.y = .5 - (d === 0 ? .22 * Math.exp(-dtLand * 12) : 0);
  });
  rings.forEach((r, j) => {                                            // l'onde j sert les réceptions k ≡ j (mod 4)
    const kk = k - (((k - j) % 4) + 4) % 4, age = (u - kk) * (fast ? BEAT / 2 : BEAT);
    r.visible = kk >= 0 && age < .5; if (!r.visible) return;
    r.position.set(tileX(first + kk), .62, tileZ(first + kk)); r.scale.setScalar(1.2 + age * 9); r.material.opacity = (1 - age / .5) ** 2; r.material.color.set(NEON[(first + kk) % 5]);
  });
  return { b, u, k, p, x, z, zLin: (first + u) * DZ, fast };
}
function animEq(list, t, gain = 1, seed = 0) {
  const k = Math.floor(t / BEAT), p = frac(t / BEAT);
  list.forEach((b, i) => { const a = hash(i * 3.1 + k * 17.3 + seed), a0 = hash(i * 3.1 + (k - 1) * 17.3 + seed); const hgt = .6 + gain * (lerp(a0 * .35, a, inv(0, .12, p)) * Math.exp(-p * 2.4) * 9 + 1.2); b.scale.y = hgt; b.position.y = hgt / 2; });
}
function swingBeams(list, t, n = list.length, spread = .5) {
  list.forEach((b, i) => { b.visible = i < n; b.rotation.z = Math.sin(t * 1.7 + i * 1.3) * spread + (b.position.x > 0 ? .25 : -.25); b.rotation.x = .28 + Math.sin(t * 1.1 + i) * .16; b.userData.m.material.opacity = .1 + .1 * pulse(t, 4); });
}
function followSun(x, z) { lights.sun.position.set(x + 5, 13, z + 9); lights.sun.target.position.set(x, 0, z); }

// =====================================================================================  bruitages
cue(0, 'whoosh', .8); for (const b of [0, 2, 4, 6]) cue(b * BEAT, 'pop', .5);
cue(T.songs, 'impact', .9); for (const b of [2, 4, 6, 8]) cue(T.songs + b * BEAT - .08, 'scratch', .45); cue(T.songs + 8 * BEAT, 'chime', .9); cue(T.songs + 8 * BEAT, 'powerup', .5);
cue(T.diff - .2, 'whoosh', .8); for (let i = 0; i < 3; i++) cue(T.diff + i * BAR, 'tick', .9); cue(T.diff + BAR, 'swish', .6); cue(T.diff + 2 * BAR, 'swish', .6);
cue(T.play - BAR, 'riser', 1, BAR);
cue(T.play, 'boom', 1); for (const b of [4, 8]) cue(T.play + b * BEAT, 'ding', .6); cue(T.play + 12 * BEAT, 'zap', .7); cue(T.play + 12 * BEAT, 'laser', .5); cue(T.play + 14 * BEAT, 'ding', .6);
cue(T.result, 'impact', 1); cue(T.result + .02, 'win', 1); cue(T.result + .1, 'crowd', .9, 3.4); cue(T.result + 2 * BEAT, 'ding', .7);
cue(T.lead - .2, 'whoosh', .8); for (const b of [1, 2, 3]) cue(T.lead + b * BEAT, 'slide', .7); cue(T.lead + 4 * BEAT, 'ding', .9); cue(T.lead + 4 * BEAT, 'coin', .6);
cue(T.end, 'boom', .9); cue(T.end + .15, 'sweepdown', .6); cue(T.end + .85, 'pop', .8); cue(T.end + 1.3, 'chime', .6);

// =====================================================================================  dessin 2D
function backdrop(t, tint = C.pink, power = 1) {
  bg([[0, '#05021a'], [.45, '#150a3d'], [.72, '#3b1168'], [1, '#0a0424']]);
  const p = pulse(t, 4);
  const g = ctx.createRadialGradient(W / 2, H * .62, 40, W / 2, H * .62, 900 + p * 120); g.addColorStop(0, rgba(tint, (.28 + .2 * p) * power)); g.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  sparkles(t, { n: 34, y: 60, h: 900, color: '#bfe9ff', size: 9, seed: 3 });
}
function beatEdges(t, color, k = .3) {                                    // les bords de l'image battent avec la musique
  const p = pulse(t, 5) * k; if (p < .01) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .36, W / 2, H / 2, H * .68); g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, p));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function hudBox(x, y, w, h, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = color; ctx.shadowBlur = 26; ctx.fillStyle = 'rgba(9,5,34,.86)'; roundRect(x, y, w, h, 26); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = color; ctx.lineWidth = 5; roundRect(x, y, w, h, 26); ctx.stroke(); ctx.restore();
}
/** Petit repère de temps : 4 pastilles, celle du temps courant s'allume. */
function beatDots(t, cx, y, color) {
  const b = Math.floor(t / BEAT) % 4, p = pulse(t, 6);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + (i - 1.5) * 46, y, i === b ? 13 + p * 7 : 11, 0, 7); ctx.fillStyle = i === b ? color : 'rgba(255,255,255,.28)'; ctx.fill(); }
}

function render(t) {
  let sx = 0, sy = 0, a;
  for (const at of [T.play, T.result, T.end]) { a = shake(t, at, 20); sx += a[0]; sy += a[1]; }
  hero.visible = heroGlow.visible = false; rig.visible = false; hero.rotation.set(0, 0, 0); hero.scale.setScalar(1);
  let combo = 0;

  // ------------------------------------------------------------------ 3D : un plan par bloc
  if (t < T.songs) {                                                    // 1. accroche : le héros rebondit vers nous, pile sur les temps
    showOnly(GROUPS, G_track); backdrop(t, C.pink);
    const r = runTrack(t, 0, 2, 1e9, 1.8); animEq(eqCols, t, .8); rig.visible = true; rig.position.set(0, 0, r.zLin); swingBeams(beams, t, 4);
    followSun(0, r.zLin);
    const k = prog(t, 0, T.songs, ease.io);
    camLook(camera, [Math.sin(t * .9) * 2.2, 3.4 + k * 1.2, r.zLin + 25 - k * 2], [0, 4.3, r.zLin + 1], 42);
  } else if (t < T.diff) {                                              // 2. choix de la chanson : carrousel de 5 disques
    showOnly(GROUPS, G_stage); backdrop(t, C.violet); const lt = t - T.songs, b = lt / BEAT;
    G_discs.visible = true; podium.visible = false;
    let rot = 0; for (const bb of [2, 4, 6, 8]) rot += prog(b, bb - .45, bb, ease.io);          // un cran tous les 2 temps, fini pile sur le temps
    const chosen = b >= 8, kc = prog(b, 8, 8.8, ease.back);
    discs.forEach((d, i) => {
      const ang = (i - rot) * (2 * Math.PI / 5), front = Math.cos(ang) > .95, sel = front && chosen;
      d.position.set(Math.sin(ang) * 4.5, 8.3 + Math.cos(ang) * .5 + (front ? pulse(t) * .25 : 0) + (sel ? kc * .2 : 0), Math.cos(ang) * 4.5);
      d.scale.setScalar((.72 + .28 * (Math.cos(ang) * .5 + .5)) * (sel ? 1 + kc * .2 : 1));
      d.userData.spin.rotation.z = -t * 3; d.userData.rim.emissiveIntensity = front ? 2.2 + pulse(t) * 2 : .8; d.userData.h.material.opacity = front ? .55 + pulse(t) * .3 : .15;
    });
    hero.visible = true; hero.position.set(0, .7, 0);
    if (chosen) { hop(hero, frac(b), 1.3, .7); poseCheer(hero, t); }
    else { poseIdle(hero, t); hero.position.y = .7 + pulse(t, 7) * .28; hero.parts.armR.rotation.set(0, 0, 2.5 + Math.sin(b * Math.PI) * .2); hero.parts.head.rotation.set(-.25, 0, 0); }
    animEq(stageEq, t, .9, 5); spk.forEach(s => pumpSpeaker(s, pulse(t, 7))); swingBeams(stageBeams, t, 6, .45); followSun(0, 0);
    camLook(camera, [Math.sin(lt * .35) * 4, 4.6, 29 - prog(t, T.songs, T.diff, ease.io) * 1.5], [0, 4.1, 0], 42);
  } else if (t < T.play) {                                              // 3. trois difficultés : trois couloirs, trois cadences
    showOnly(GROUPS, G_diff); backdrop(t, C.cyan, .8); const lt = t - T.diff, act = Math.min(2, Math.floor(lt / BAR));
    LANES.forEach((L, li) => {
      const hopT = L.hopBeats * BEAT, u = lt / hopT, p = frac(u), on = li === act, glowK = on ? 1 : .32;
      const span = L.n * L.d, back = Math.floor(L.n * .6) * L.d;
      L.tiles.forEach((tl, i) => {
        const z = ((((i * L.d - u * L.d + back) % span) + span) % span) - back; tl.position.z = z;
        const under = Math.abs(z) < L.d * .5; lightTile(tl, glowK * (under ? 1.1 + 3 * Math.exp(-p * hopT * 6) : .55 + .2 * pulse(t)));
        tl.position.y = .5 - (under ? .2 * Math.exp(-p * hopT * 12) : 0);
      });
      hop(L.ch, p, L.h, .55, .82); L.ch.rotation.y = 0;
      L.beam.visible = on; L.beam.userData.m.material.opacity = .2 + .08 * pulse(t);
    });
    animEq(diffEq, t, .8, 9); followSun(0, 0);
    const fx = lerp(LANES[Math.max(0, act - 1)].x, LANES[act].x, prog(lt, act * BAR - .001, act * BAR + .4, ease.io));
    camLook(camera, [fx * .55, 10.5 - lt * .25, 27.5 - lt * .35], [fx * .3, 2.6, 0], 42);
  } else if (t < T.result) {                                            // 4. la partie : combo qui monte, lumières qui grandissent
    showOnly(GROUPS, G_track); const lt = t - T.play; backdrop(t, lt < 2 * BAR ? C.cyan : C.pink, 1 + lt * .08);
    const r = runTrack(t, T.play, 12, 12, 1.9); combo = r.k + 1;
    animEq(eqCols, t, .7 + combo * .035); rig.visible = true; rig.position.set(0, 0, r.zLin); swingBeams(beams, t, clamp(2 + Math.floor(combo / 2), 2, 8), .55); followSun(0, r.zLin);
    const ang = -.42 + prog(lt, 0, 4 * BAR, ease.io) * .84, dist = 23 + (r.fast ? prog(r.b, 12, 13) * 3 : 0);
    camLook(camera, [Math.sin(ang) * dist, 4.6 + Math.sin(lt * .8) * .8, r.zLin + Math.cos(ang) * dist], [0, 3.6, r.zLin + .5], 42);
  } else if (t < T.end) {                                               // 5. résultat (note S) puis 6. classement par chanson
    showOnly(GROUPS, G_stage); const res = t < T.lead; backdrop(t, res ? C.yellow : C.cyan, res ? 1.2 : .9);
    G_discs.visible = false; podium.visible = true; podiumTop.material.emissiveIntensity = 1.2 + 2.5 * pulse(t);
    const b = t / BEAT; hero.visible = true; hero.position.set(0, 0, 0); hop(hero, frac(b), res ? 1.0 : .5, 1.66); poseCheer(hero, t); hero.rotation.y = res ? Math.sin(t * 2) * .3 : 0;
    animEq(stageEq, t, 1.2, 2); spk.forEach(s => pumpSpeaker(s, pulse(t, 7))); swingBeams(stageBeams, t, 6, .6); followSun(0, 0);
    if (res) { const lt = t - T.result, an = -.5 + lt * .26; camLook(camera, [Math.sin(an) * 28, 3.4, Math.cos(an) * 28], [0, 5.3, 0], 42); }
    else { const lt = t - T.lead; camLook(camera, [Math.sin(lt * .3) * 3, 6.5, 40 - lt * .4], [0, 7.3, 0], 42); }
  } else {                                                              // 7. écran final : la piste continue de battre en fond
    showOnly(GROUPS, G_track); backdrop(t, C.pink, 1.1); const lt = t - T.end;
    const r = runTrack(t, T.end, 26, 1e9, 1.9); animEq(eqCols, t, 1); rig.visible = true; rig.position.set(0, 0, r.zLin); swingBeams(beams, t, 8, .6); followSun(0, r.zLin);
    camLook(camera, [Math.sin(lt * .5) * 3, 13, r.zLin + 44], [0, -7.6, r.zLin], 42);
  }
  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(.5, '4,0,20');
  beatEdges(t, t < T.songs ? C.pink : t < T.diff ? C.violet : t < T.play ? C.cyan : C.pink, t >= T.play && t < T.result ? .38 : .24);

  // ------------------------------------------------------------------ textes et affichages
  if (t < T.songs) {                                                    // accroche visible dès la première image
    const out = 1 - inv(T.songs - .2, T.songs, t), sc = 1 + .5 * (1 - ease.out(inv(0, .3, t))) + .035 * pulse(t, 6);
    text('TU AS LE\nRYTHME ?', SAFE.cx, 380, { font: TITLE, weight: 900, size: 124, grad: ['#ffffff', C.cyan], stroke: '#0a0430', strokeW: 20, shadow: 'rgba(255,61,240,.85)', shadowY: 9, scale: sc, alpha: out, lineH: 1.12 });
    caption(t, 4 * BEAT, T.songs - .1, 'Rebondis pile sur le temps', { y: 1450, size: 62, bg: C.pink, color: '#ffffff', anim: 'pop' });
  }
  flash(t, T.songs, .3, '255,61,240', .9);
  if (t >= T.songs && t < T.diff) {
    const b = (t - T.songs) / BEAT, n = 1 + Math.min(4, Math.floor(b / 2)), chosen = b >= 8;
    if (!chosen) pill(`CHANSON ${n} / 5`, SAFE.cx, 290, { font: TITLE, weight: 800, size: 50, bg: 'rgba(9,5,34,.88)', color: NEON[(n - 1) % 5], border: NEON[(n - 1) % 5], borderW: 5, scale: 1 + .08 * Math.exp(-frac(b / 2) * 2 * 6) });
    else pill('CHANSON CHOISIE', SAFE.cx, 290, { font: TITLE, weight: 800, size: 50, bg: C.violet, color: '#ffffff', border: '#ffffff', borderW: 5, scale: ease.back(inv(8, 8.7, b)) });
    caption(t, T.songs + .25, T.songs + 8 * BEAT - .1, '5 CHANSONS\nORIGINALES', { font: TITLE, weight: 900, size: 88, y: 1425, anim: 'slam', grad: ['#ffffff', C.yellow], stroke: '#0a0430', strokeW: 16, lineH: 1.14 });
    caption(t, T.songs + 8 * BEAT, T.diff - .25, 'Choisis ta chanson', { y: 1430, size: 74, bg: C.violet, color: '#ffffff', anim: 'pop' });
  }
  wipe(t, T.diff, { color: C.cyan, color2: C.pink, dur: .5 });
  if (t >= T.diff + .25 && t < T.play) {
    const lt = t - T.diff, act = Math.min(2, Math.floor(lt / BAR)), L = LANES[act], k = lt - act * BAR;
    pill('3 DIFFICULTÉS', SAFE.cx, 290, { font: TITLE, weight: 800, size: 54, bg: 'rgba(9,5,34,.88)', color: '#ffffff', border: L.color, borderW: 5, scale: ease.back(inv(.25, .6, lt)) });
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(SAFE.cx + (i - 1) * 60, 392, i === act ? 17 : 12, 0, 7); ctx.fillStyle = i <= act ? LANES[i].color : 'rgba(255,255,255,.3)'; ctx.fill(); }
    const s0 = act * BAR + (act ? 0 : .3);
    caption(t, T.diff + s0, T.diff + (act + 1) * BAR - (act === 2 ? .2 : .02), L.name, { font: TITLE, weight: 900, size: 118, y: 1370, anim: 'slam', inDur: .2, color: L.color, stroke: '#0a0430', strokeW: 20, shadow: 'rgba(0,0,0,.6)' });
  }
  flash(t, T.play, .4, '255,255,255', 1);
  if (t >= T.play && t < T.result) {
    const lt = t - T.play, b = lt / BEAT, u = steps(b, 12), since = (u - Math.floor(u)) * (b >= 12 ? BEAT / 2 : BEAT), kick = Math.exp(-since * 9);
    if (b >= 12) speedLines(t, { alpha: .35, color: 'rgba(160,240,255,.6)', inner: 640 });
    const score = Math.round((combo * 300 + combo * combo * 12) * 1);
    hudBox(90, 232, 400, 150, C.cyan); text('SCORE', 290, 272, { font: TITLE, weight: 700, size: 34, color: C.cyan, spacing: 4 });
    text(score.toLocaleString('fr-FR').replace(/ | /g, ' '), 290, 334, { font: TITLE, weight: 900, size: 62, color: '#ffffff', maxW: 360 });
    const cc = combo >= 16 ? C.yellow : combo >= 8 ? C.pink : C.cyan;
    hudBox(590, 232, 400, 150, cc); text('COMBO', 790, 272, { font: TITLE, weight: 700, size: 34, color: cc, spacing: 4 });
    text('x' + combo, 790, 334, { font: TITLE, weight: 900, size: 70, color: '#ffffff', scale: 1 + .35 * kick, glow: cc });
    beatDots(t, SAFE.cx, 440, cc);
    caption(t, T.play + .2, T.play + 2 * BAR - .1, 'SAUTE SUR\nLE TEMPS', { font: TITLE, weight: 900, size: 92, y: 1425, anim: 'slam', grad: ['#ffffff', C.cyan], stroke: '#0a0430', strokeW: 18, lineH: 1.14 });
    caption(t, T.play + 2 * BAR, T.result - .12, 'GARDE TON\nCOMBO', { font: TITLE, weight: 900, size: 92, y: 1425, anim: 'slam', grad: ['#ffffff', C.pink], stroke: '#0a0430', strokeW: 18, lineH: 1.14 });
  }
  flash(t, T.result, .45, '255,225,77', 1);
  if (t >= T.result && t < T.lead) {
    const lt = t - T.result; rays(t, { cy: 560, color: 'rgba(255,225,77,.07)', n: 14 }); confetti(t, T.result + .05, { colors: NEON.concat('#ffffff'), cy: 700, n: 130, life: 3.6 });
    text('NOTE', SAFE.cx, 262, { font: TITLE, weight: 800, size: 58, color: '#ffffff', stroke: '#0a0430', strokeW: 12, spacing: 14, alpha: inv(.1, .35, lt) });
    text('S', SAFE.cx, 470, { font: TITLE, weight: 900, size: 300, grad: ['#fff7b0', '#ff9d2e'], stroke: '#0a0430', strokeW: 30, shadow: 'rgba(255,61,240,.9)', shadowY: 14, glow: 'rgba(255,225,77,.9)', scale: lerp(3, 1, ease.out(inv(0, .28, lt))) * (1 + .04 * pulse(t, 6)), alpha: inv(0, .15, lt) });
    caption(t, T.result + .5, T.lead - .2, 'VISE LA NOTE S', { font: TITLE, weight: 900, size: 92, y: 1440, anim: 'pop', color: '#ffffff', stroke: '#0a0430', strokeW: 18 });
  }
  wipe(t, T.lead, { color: C.yellow, color2: C.violet, dir: 'up', dur: .5 });
  if (t >= T.lead + .2 && t < T.end) {
    const lt = t - T.lead, b = lt / BEAT, ain = ease.back(inv(.2, .6, lt)), px = 150, pw = 780, py = 240, rowH = 90;
    ctx.save(); ctx.translate(SAFE.cx, 570); ctx.scale(ain, ain); ctx.translate(-SAFE.cx, -570);
    hudBox(px, py, pw, 660, C.cyan);
    text('CLASSEMENT', SAFE.cx, py + 62, { font: TITLE, weight: 900, size: 62, color: '#ffffff', spacing: 3 });
    pill('CHANSON  « SAUT NÉON »', SAFE.cx, py + 138, { size: 38, bg: C.pink, color: '#ffffff', weight: 900, shadow: false });
    let pos = 4; for (const bb of [1, 2, 3, 4]) pos -= prog(b, bb - .3, bb, ease.io);         // « TOI » grimpe d'une place par temps
    const y0 = py + 200, rowY = s => y0 + s * rowH;
    for (let j = 0; j < 4; j++) {                                       // autres lignes : silhouettes neutres (aucun faux pseudo)
      const y = rowY(j + clamp(j - pos + 1));
      ctx.fillStyle = 'rgba(255,255,255,.07)'; roundRect(px + 30, y, pw - 60, rowH - 16, 18); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; roundRect(px + 150, y + 24, 250 - j * 30, 26, 13); ctx.fill(); roundRect(px + pw - 220, y + 24, 150, 26, 13); ctx.fill();
    }
    const yT = rowY(pos), first = b >= 4, hl = first ? C.yellow : C.cyan, pp = first ? pulse(t, 5) : 0;
    ctx.save(); ctx.shadowColor = hl; ctx.shadowBlur = 24 + pp * 30; ctx.fillStyle = hl; roundRect(px + 18 - pp * 8, yT - 6, pw - 36 + pp * 16, rowH - 4, 20); ctx.fill(); ctx.restore();
    text('TOI', px + 250, yT + rowH / 2 - 6, { font: TITLE, weight: 900, size: 58, color: '#0a0430' });
    if (first) text('1re PLACE', px + pw - 190, yT + rowH / 2 - 6, { font: 'Inter', weight: 900, size: 40, color: '#0a0430', alpha: inv(4, 4.4, b) });
    for (let s = 0; s < 5; s++) { const mine = Math.round(pos) === s; text(String(s + 1), px + 86, rowY(s) + rowH / 2 - 8, { font: TITLE, weight: 900, size: 50, color: mine ? '#0a0430' : 'rgba(255,255,255,.75)' }); }
    ctx.restore();
    caption(t, T.lead + .45, T.end - .2, 'UN CLASSEMENT\nPAR CHANSON', { font: TITLE, weight: 900, size: 76, y: 1440, anim: 'rise', grad: ['#ffffff', C.cyan], stroke: '#0a0430', strokeW: 16, lineH: 1.14 });
  }
  flash(t, T.end, .4, '255,255,255', 1);
  if (t >= T.end) {
    const lt = t - T.end; fade(.5 * inv(0, .4, lt), '#07031a'); rays(t, { cy: 760, color: 'rgba(255,61,240,.06)', n: 14, speed: .18 });
    sparkles(t, { y: 480, h: 850, color: '#ffffff', size: 12, n: 22, seed: 8 });
    endCard(t, T.end + .12, { title: 'BEAT\nBOUNCE', tagline: '5 chansons · 3 difficultés · ton rythme', status: 'bientot', font: TITLE, titleSize: 158, titleGrad: ['#ffffff', C.cyan], titleStroke: '#0a0430', accent: C.pink, y: 870 });
  }
}

registerAd({ duration: DURATION, thumbTime: T.play + 9.5 * BEAT, render,
  music: { style: 'edm', bpm: BPM, seed: 15, sections: [[0, 'build'], [T.songs, 'drop'], [T.diff, 'build'], [T.play, 'drop2'], [T.lead, 'drop'], [T.end, 'outro']], end: T.end } });
