// Publicité « Lights Out Mansion » : horreur douce coopérative (statut : bientôt sur Roblox).
// Tout est créé par le code (aucune ressource externe). Animation d'illustration, pas une capture du jeu.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, torus, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseHold, ground, showOnly, glow, sign, canvasTex, ctx, bg, vignette, flash, wipe, fade, sparkles, roundRect,
  text, caption, pill, bar, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Creepster', 'Inter']);
const PI = Math.PI;
const BAR = 240 / 96;                                   // 2,5 s par mesure
const T = { hook: 0, explore: BAR, map: 3 * BAR, items: 4 * BAR, ghosts: 6 * BAR, grognon: 7 * BAR, hide: 8 * BAR, revive: 9.5 * BAR, escape: 11 * BAR, win: 12 * BAR, end: 13 * BAR };
const DURATION = 15 * BAR;                              // 37,5 s
const C = { wood: '#3a2748', wood2: '#5b3d70', dark: '#231640', gold: '#ffd23c', lamp: '#ffe9a0', cyan: '#7dffe0', violet: '#a78bff', carpet: '#9c2f6b', orange: '#ff8a2a' };

// =====================================================================================  scène, lumières
gl3D({ exposure: 1.25 });
const scene = new THREE.Scene(), camera = makeCamera(42);
const LG = addLights(scene, { sun: '#b9c6ff', sunI: 1.5, sky: '#a9a6ff', ground: '#4a3384', ambI: 1.55, dir: [5, 14, 10], shadowArea: 26 });
const spot = new THREE.SpotLight('#fff0b8', 0, 46, .44, .7, 0); scene.add(spot, spot.target);           // vraie lumière de la lampe (sans ombres)
const gLight = new THREE.PointLight('#7dffe0', 0, 18, 0); scene.add(gLight);                            // lueur des fantômes
const wLight = new THREE.PointLight('#ffc070', 0, 26, 0); scene.add(wLight);                            // lumière chaude (porte, victoire)

// =====================================================================================  textures
const texWall = canvasTex(256, (g, n) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#5646a6' : '#4a3b92'; g.fillRect(i * n / 8, 0, n / 8, n); }
  g.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = (x + .5 + (y % 2) * .5) * n / 4, cy = (y + .5) * n / 4; g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx + 9, cy); g.lineTo(cx, cy + 16); g.lineTo(cx - 9, cy); g.fill(); }
});
const texWallTeal = canvasTex(256, (g, n) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#3a6f96' : '#326188'; g.fillRect(i * n / 8, 0, n / 8, n); }
  g.fillStyle = 'rgba(255,255,255,.09)'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc((x + .5 + (y % 2) * .5) * n / 4, (y + .5) * n / 4, 7, 0, 7); g.fill(); }
});
const texWallRose = canvasTex(256, (g, n) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7a4a9c' : '#6c3f8e'; g.fillRect(i * n / 8, 0, n / 8, n); }
  g.fillStyle = 'rgba(255,255,255,.08)'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillRect((x + .4 + (y % 2) * .5) * n / 4, (y + .4) * n / 4, 12, 12); }
});
const texWood = canvasTex(256, (g, n) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = ['#6a4a78', '#5e4070', '#73527f', '#644674'][i % 4]; g.fillRect(0, i * n / 8, n, n / 8); g.fillStyle = 'rgba(20,8,40,.55)'; g.fillRect(0, i * n / 8, n, 3); g.fillRect((hash(i) * .8 + .1) * n, i * n / 8, 3, n / 8); }
});
const texChecker = canvasTex(256, (g, n) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#7d74b8' : '#3d3470'; g.fillRect(x * n / 4, y * n / 4, n / 4, n / 4); } });
const texStone = canvasTex(256, (g, n) => {
  g.fillStyle = '#5b5196'; g.fillRect(0, 0, n, n); g.strokeStyle = 'rgba(25,15,60,.5)'; g.lineWidth = 4;
  for (let y = 0; y < 8; y++) { g.beginPath(); g.moveTo(0, y * 32); g.lineTo(n, y * 32); g.stroke(); for (let x = 0; x < 4; x++) { const px = (x + (y % 2) * .5) * 64; g.beginPath(); g.moveTo(px, y * 32); g.lineTo(px, y * 32 + 32); g.stroke(); } }
});
const beamTex = canvasTex(128, (g, n) => { const gr = g.createLinearGradient(0, 0, 0, n); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.2, '#b8b8b8'); gr.addColorStop(.65, '#4a4a4a'); gr.addColorStop(1, '#000000'); g.fillStyle = gr; g.fillRect(0, 0, n, n); });
function tmat(tex, rx, ry) { const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: .9 }); }
const basic = c => new THREE.MeshBasicMaterial({ color: c });
function plane(w, h, m, pos, rotY = 0) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.rotation.y = rotY; p.receiveShadow = true; return p; }

// =====================================================================================  mobilier
const flick = [];                                        // halos de bougies qui vacillent
function flame(size = 3) { const g = new THREE.Group(); const f = ball(.16, '#ffd27a', { emissive: '#ff9a2e', emissiveI: 2.5, cast: false }); f.scale.y = 1.7; g.add(f); const h = glow('#ffb347', size, .7); g.add(h); flick.push([h, size, flick.length]); return g; }
function room(w, d, h, floorTex, wallTex, sides = true) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tmat(floorTex, w / 5, d / 5)); f.rotation.x = -PI / 2; f.receiveShadow = true; g.add(f);
  g.add(plane(w, h, tmat(wallTex, w / 5, h / 5), [0, h / 2, -d / 2]));
  g.add(box(w, 2.2, .3, C.wood, { pos: [0, 1.1, -d / 2 + .15] }), box(w, .22, .42, C.wood2, { pos: [0, 2.3, -d / 2 + .2] }), box(w, .5, .4, C.dark, { pos: [0, h - .25, -d / 2 + .2] }));
  if (sides) for (const s of [-1, 1]) {
    g.add(plane(d, h, tmat(wallTex, d / 5, h / 5), [s * w / 2, h / 2, 0], -s * PI / 2));
    g.add(box(.3, 2.2, d, C.wood, { pos: [s * (w / 2 - .15), 1.1, 0] }), box(.42, .22, d, C.wood2, { pos: [s * (w / 2 - .2), 2.3, 0] }));
  }
  return g;
}
function door(color = '#7a4a34') {
  const g = new THREE.Group();
  g.add(box(3.7, 7.3, .3, C.dark, { pos: [0, 3.65, 0] }), box(3.1, 6.9, .2, color, { pos: [0, 3.45, .12] }));
  for (const y of [1.9, 5.1]) g.add(box(2.3, 2.4, .1, '#8b5a40', { pos: [0, y, .24] }));
  g.add(ball(.2, C.gold, { pos: [1.15, 3.4, .36], rough: .3, emissive: '#7a5200' }));
  return g;
}
function painting(i) {
  const g = new THREE.Group(); g.add(box(2.7, 3.3, .2, '#c79a3a', { rough: .4, emissive: '#3a2600' }));
  g.add(sign(2.25, 2.85, (c, w, h) => {
    c.fillStyle = ['#2c5a6e', '#6e2c4f', '#3c6e3a', '#6e5a2c'][i % 4]; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.88)'; c.beginPath(); c.arc(w / 2, h * .42, w * .26, PI, 0); c.lineTo(w * .76, h * .8);
    for (let k = 0; k < 4; k++) c.quadraticCurveTo(w * (.76 - k * .13 - .065), h * .68, w * (.76 - (k + 1) * .13), h * .8); c.fill();
    c.fillStyle = '#1c1238'; c.beginPath(); c.arc(w * .41, h * .42, w * .05, 0, 7); c.arc(w * .59, h * .42, w * .05, 0, 7); c.fill();
    if (i % 2) { c.beginPath(); c.ellipse(w / 2, h * .56, w * .05, w * .07, 0, 0, 7); c.fill(); } else { c.strokeStyle = '#1c1238'; c.lineWidth = w * .03; c.beginPath(); c.arc(w / 2, h * .52, w * .09, .2, PI - .2); c.stroke(); }
  }, { res: 128, pos: [0, 0, .11] }));
  return g;
}
function windowMoon(s = 1) {
  const g = new THREE.Group();
  g.add(box(3.3, 5.7, .25, C.dark, { pos: [0, 0, 0] })); const p = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 5.3), basic('#a9c8ff')); p.position.z = .14; g.add(p);
  g.add(box(.16, 5.3, .2, C.dark, { pos: [0, 0, .12] }), box(2.9, .16, .2, C.dark, { pos: [0, .6, .12] }), box(2.9, .16, .2, C.dark, { pos: [0, -1.2, .12] }));
  for (const sx of [-1, 1]) g.add(box(.7, 6.1, .22, '#7a2f5a', { pos: [sx * 1.85, 0, .2] }));
  g.add(box(4.6, .3, .35, C.gold, { pos: [0, 3.15, .2], rough: .4, emissive: '#5a3c00' }));
  const h = glow('#a9c8ff', 9, .32); h.position.z = .6; g.add(h); g.scale.setScalar(s); return g;
}
function sconce() { const g = new THREE.Group(); g.add(box(.5, .9, .2, '#c79a3a', { rough: .4, emissive: '#3a2600' }), box(.2, .16, .7, '#c79a3a', { pos: [0, -.2, .35] }), cyl(.13, .13, .7, '#fff3d6', { pos: [0, .25, .62] })); const f = flame(3.4); f.position.set(0, .78, .62); g.add(f); return g; }
const BOOKS = ['#c0392b', '#2e86c1', '#27ae60', '#d4a017', '#8e44ad', '#d35400', '#16a085', '#b03a6e'];
function bookshelf(seed = 0, w = 5, h = 9.5) {
  const g = new THREE.Group();
  g.add(box(w, h, .25, '#2a1a3a', { pos: [0, h / 2, -.5] }), box(.3, h, 1.3, C.wood2, { pos: [-w / 2 + .15, h / 2, 0] }), box(.3, h, 1.3, C.wood2, { pos: [w / 2 - .15, h / 2, 0] }), box(w + .3, .4, 1.5, C.wood2, { pos: [0, h + .1, 0] }));
  for (let s = 0; s < 5; s++) {
    const y = .2 + s * (h - .3) / 5; g.add(box(w - .5, .22, 1.2, C.wood2, { pos: [0, y, 0] }));
    let x = -w / 2 + .45, k = 0;
    while (x < w / 2 - .7) { const r = hash(seed * 31 + s * 7 + k), bw = .24 + r * .22, bh = 1.05 + hash(seed + s * 3 + k * 5) * .5; if (hash(seed * 3 + s * 11 + k * 2.3) > .13) g.add(box(bw, bh, .85, BOOKS[Math.floor(hash(seed * 5 + s * 13 + k * 3.7) * BOOKS.length)], { pos: [x + bw / 2, y + .11 + bh / 2, .05], cast: false })); x += bw + .04; k++; }
  }
  return g;
}
function roundTable(h = 2.4) { const g = new THREE.Group(); g.add(cyl(1.3, 1.3, .2, C.wood2, { pos: [0, h, 0] }), cyl(.2, .3, h, C.wood, { pos: [0, h / 2, 0] }), cyl(.8, .9, .15, C.wood, { pos: [0, .08, 0] }), cyl(1.36, 1.36, .08, '#9c2f6b', { pos: [0, h + .13, 0] })); return g; }
function lectern() { const g = new THREE.Group(); g.add(cyl(.22, .3, 3, C.wood, { pos: [0, 1.5, 0] }), cyl(.8, .9, .2, C.wood, { pos: [0, .1, 0] }), box(2, .18, 1.5, C.wood2, { pos: [0, 3.1, 0], rot: [.35, 0, 0] })); return g; }
function dresser() { const g = new THREE.Group(); g.add(rbox(3, 2.6, 1.6, .1, C.wood2, { pos: [0, 1.4, 0] }), box(3.2, .18, 1.8, C.wood, { pos: [0, 2.78, 0] })); for (const y of [.75, 1.5, 2.25]) { g.add(box(2.6, .55, .1, '#6f4c86', { pos: [0, y, .82] }), ball(.1, C.gold, { pos: [-.6, y, .9], emissive: '#7a5200' }), ball(.1, C.gold, { pos: [.6, y, .9], emissive: '#7a5200' })); } return g; }
function armchair(col = '#a03a5c') { const g = new THREE.Group(); g.add(rbox(2.6, 1.1, 2.2, .25, col, { pos: [0, 1.15, 0] }), rbox(2.6, 3.4, .6, .25, col, { pos: [0, 2.6, -.85] }), rbox(.6, 1.9, 2.2, .22, col, { pos: [-1.3, 1.5, 0] }), rbox(.6, 1.9, 2.2, .22, col, { pos: [1.3, 1.5, 0] })); for (const [x, z] of [[-1.1, .8], [1.1, .8], [-1.1, -.8], [1.1, -.8]]) g.add(cyl(.12, .1, .6, C.wood, { pos: [x, .3, z] })); return g; }
function cobweb(s = 3) { return sign(s, s, (c, w) => { c.strokeStyle = 'rgba(235,235,255,.75)'; c.lineWidth = 2.5; for (let i = 0; i <= 5; i++) { const a = i * PI / 10; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * w, Math.sin(a) * w); c.stroke(); } for (let r = 1; r <= 4; r++) { c.beginPath(); for (let i = 0; i <= 5; i++) { const a = i * PI / 10, rr = r * w / 4.6; if (i === 0) c.moveTo(rr, 0); else { const am = a - PI / 20; c.quadraticCurveTo(Math.cos(am) * rr * .86, Math.sin(am) * rr * .86, Math.cos(a) * rr, Math.sin(a) * rr); } } c.stroke(); } }, { res: 256, emissive: true }); }
function chandelier() { const g = new THREE.Group(); g.add(cyl(.06, .06, 5, '#c79a3a', { pos: [0, 2.9, 0] }), torus(1.8, .12, '#c79a3a', { rot: [PI / 2, 0, 0], rough: .4, emissive: '#3a2600' }), ball(.35, '#c79a3a', { pos: [0, .2, 0] })); for (let i = 0; i < 6; i++) { const a = i * PI / 3; g.add(cyl(.1, .1, .6, '#fff3d6', { pos: [Math.cos(a) * 1.8, .4, Math.sin(a) * 1.8] })); const f = flame(2.6); f.position.set(Math.cos(a) * 1.8, .9, Math.sin(a) * 1.8); g.add(f); } return g; }

// =====================================================================================  les 5 objets à retrouver (illustration) + pile
function itemKey() { const g = new THREE.Group(), o = { rough: .3, emissive: '#8a5c00', emissiveI: .9 }; g.add(torus(.38, .12, C.gold, { ...o, pos: [0, .55, 0] }), cyl(.1, .1, 1.1, C.gold, { ...o, pos: [0, -.35, 0] }), box(.38, .14, .14, C.gold, { ...o, pos: [.2, -.7, 0] }), box(.3, .14, .14, C.gold, { ...o, pos: [.16, -.42, 0] })); return g; }
function itemBook() { const g = new THREE.Group(); g.add(rbox(1.15, 1.5, .34, .06, '#c0303f', { emissive: '#4a0a12', emissiveI: .8 }), box(1.02, 1.36, .28, '#fff3d6', { pos: [.06, 0, 0] }), box(.55, .55, .04, C.gold, { pos: [-.02, .15, .18], emissive: '#8a5c00' }), box(.12, 1.5, .36, C.gold, { pos: [-.52, 0, 0], emissive: '#8a5c00' })); g.rotation.z = .12; return g; }
function itemCandle() { const g = new THREE.Group(), o = { rough: .3, emissive: '#8a5c00', emissiveI: .9 }; g.add(cyl(.5, .6, .14, C.gold, { ...o, pos: [0, -.7, 0] }), cyl(.1, .14, .7, C.gold, { ...o, pos: [0, -.3, 0] }), cyl(.34, .2, .16, C.gold, { ...o, pos: [0, .1, 0] }), cyl(.15, .15, .7, '#fff3d6', { pos: [0, .5, 0], emissive: '#6a5a40' })); const f = flame(2.2); f.position.y = 1.02; g.add(f); return g; }
function itemClock() {
  const g = new THREE.Group(), o = { rough: .3, emissive: '#1d6a60', emissiveI: .8 };
  g.add(cyl(.72, .72, .4, '#39d6c2', { ...o, rot: [PI / 2, 0, 0] }), ball(.2, C.gold, { pos: [-.45, .72, 0], emissive: '#8a5c00' }), ball(.2, C.gold, { pos: [.45, .72, 0], emissive: '#8a5c00' }), cyl(.07, .07, .4, C.gold, { pos: [-.4, -.75, 0], rot: [0, 0, -.4] }), cyl(.07, .07, .4, C.gold, { pos: [.4, -.75, 0], rot: [0, 0, .4] }));
  g.add(sign(1.2, 1.2, (c, w) => { c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(w / 2, w / 2, w * .48, 0, 7); c.fill(); c.strokeStyle = '#231640'; c.lineCap = 'round'; c.lineWidth = w * .07; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2, w * .17); c.moveTo(w / 2, w / 2); c.lineTo(w * .72, w * .6); c.stroke(); c.fillStyle = '#231640'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(w / 2 + Math.cos(i * PI / 6) * w * .39, w / 2 + Math.sin(i * PI / 6) * w * .39, w * .025, 0, 7); c.fill(); } }, { res: 128, emissive: true, pos: [0, 0, .21] }));
  return g;
}
function itemTeddy() {
  const g = new THREE.Group(), b = '#c98a4b', o = { emissive: '#4a2a0c', emissiveI: .7, seg: 14, seg2: 10 };
  g.add(ball(.55, b, { ...o, pos: [0, -.35, 0] }), ball(.45, b, { ...o, pos: [0, .42, 0] }), ball(.17, b, { ...o, pos: [-.36, .82, 0] }), ball(.17, b, { ...o, pos: [.36, .82, 0] }), ball(.2, '#f3d9b0', { ...o, pos: [0, .34, .36] }),
    ball(.2, b, { ...o, pos: [-.58, -.15, .1] }), ball(.2, b, { ...o, pos: [.58, -.15, .1] }), ball(.23, b, { ...o, pos: [-.34, -.85, .2] }), ball(.23, b, { ...o, pos: [.34, -.85, .2] }),
    ball(.06, '#1b1b22', { pos: [-.16, .52, .4] }), ball(.06, '#1b1b22', { pos: [.16, .52, .4] }), ball(.07, '#1b1b22', { pos: [0, .4, .55] }), box(.5, .16, .1, '#e23b5a', { pos: [0, .05, .5] }));
  return g;
}
function pile() { const g = new THREE.Group(); g.add(cyl(.34, .34, .9, '#2ecc71', { emissive: '#0d6a34', emissiveI: 1, rough: .35 }), cyl(.345, .345, .28, '#ffd23c', { pos: [0, .5, 0], emissive: '#7a5200' }), cyl(.13, .13, .16, '#d7dbe6', { pos: [0, .72, 0] }), glow('#7dff9a', 3.4, .75)); g.rotation.z = .25; return g; }

// =====================================================================================  explorateurs et lampes
function makeExplorer(o, beamColor = C.lamp) {
  const ch = makeCharacter(o), fl = new THREE.Group(); fl.position.y = -2.2; ch.parts.armR.add(fl);
  fl.add(cyl(.17, .17, .8, '#e0473a', { pos: [0, -.1, 0] }), cyl(.2, .33, .45, '#c9ccd6', { pos: [0, -.7, 0], rough: .4 }));
  const lens = cyl(.29, .29, .06, '#fff7c0', { pos: [0, -.95, 0], emissive: '#fff2a0', emissiveI: 2 }); fl.add(lens);
  const bm = new THREE.MeshBasicMaterial({ map: beamTex, color: beamColor, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const geo = new THREE.ConeGeometry(3.3, 12, 28, 1, true); geo.translate(0, -6, 0);
  const beam = new THREE.Mesh(geo, bm); beam.position.y = -.95; beam.castShadow = false; beam.receiveShadow = false; fl.add(beam);
  const gl = glow(beamColor, 2.4, .9); gl.position.y = -1.05; fl.add(gl);
  ch.lamp = { lens, beam, bm, gl }; return ch;
}
function setLamp(ch, k) { ch.lamp.bm.opacity = .5 * k; ch.lamp.gl.material.opacity = .9 * k; ch.lamp.beam.visible = k > .01; }
/** Bras droit levé qui tient la lampe (à appeler après la pose). */
function lampArm(ch, pitch = -1.45, side = 0) { ch.parts.armR.rotation.set(pitch, 0, side); }
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function aimSpot(ch, intensity) { ch.updateWorldMatrix(true, true); ch.lamp.lens.getWorldPosition(_v1); _v2.set(0, -1, 0).transformDirection(ch.lamp.lens.matrixWorld); spot.position.copy(_v1); spot.target.position.copy(_v1).addScaledVector(_v2, 10); spot.intensity = intensity; }
const hero = makeExplorer({ shirt: '#ff8a2a', pants: '#2b3350', hair: '#3b2a1e', face: 'smile' });
const heroS = makeExplorer({ shirt: '#ff8a2a', pants: '#2b3350', hair: '#3b2a1e', face: 'scared' });
const mateA = makeExplorer({ shirt: '#22c7b8', pants: '#27324f', hat: 'cap', hatColor: '#178a80', face: 'wow' }, '#9be8ff');
const mateB = makeExplorer({ shirt: '#ff5fa2', pants: '#3a2a55', hair: '#f2c14e', face: 'happy' }, '#ffb3e0');
const mateC = makeExplorer({ shirt: '#ffd23c', pants: '#2b3350', hair: '#1b1b22', face: 'happy' }, '#c8ffb0');
const people = [hero, heroS, mateA, mateB, mateC]; for (const p of people) scene.add(p);

// =====================================================================================  les 2 fantômes
function makeGrognon() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#ebe4ff', roughness: .6, emissive: '#6b50d6', emissiveIntensity: .62 });
  const head = ball(1.7, m); head.scale.set(1, 1.05, .92); g.add(head);
  const body = cyl(1.7, 1.95, 1.9, m, { pos: [0, -1, 0] }); body.scale.z = .92; g.add(body);
  g.fringe = []; for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * PI, b = ball(.66, m, { seg: 12, seg2: 10 }); b.position.set(Math.cos(a) * 1.42, -2, Math.sin(a) * 1.3); g.add(b); g.fringe.push(b); }
  const a1 = ball(.55, m, { seg: 12, seg2: 10 }); a1.scale.set(2, .8, .8); a1.position.set(-.5, -1.0, 1.62); a1.rotation.z = .3; g.add(a1);
  const a2 = ball(.55, m, { seg: 12, seg2: 10 }); a2.scale.set(2, .8, .8); a2.position.set(.5, -1.2, 1.7); a2.rotation.z = -.3; g.add(a2);
  g.add(sign(2.3, 1.7, (c, w, h) => {
    c.fillStyle = 'rgba(255,120,170,.5)'; c.beginPath(); c.arc(w * .1, h * .68, w * .08, 0, 7); c.arc(w * .9, h * .68, w * .08, 0, 7); c.fill();
    c.fillStyle = '#231640'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * w * .2, h * .5, w * .085, h * .17, 0, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * w * .2 + w * .025, h * .44, w * .028, 0, 7); c.fill(); }
    c.strokeStyle = '#231640'; c.lineCap = 'round'; c.lineWidth = w * .075; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * w * .36, h * .14); c.lineTo(w / 2 + s * w * .09, h * .34); c.stroke(); }
    c.lineWidth = w * .05; c.beginPath(); c.moveTo(w * .36, h * .9); c.quadraticCurveTo(w / 2, h * .72, w * .64, h * .9); c.stroke();
  }, { res: 256, emissive: true, pos: [0, .25, 1.6] }));
  g.add(cyl(1.15, 1.15, .1, '#2a1c3d', { pos: [.25, 1.66, 0], rot: [0, 0, -.14] }), cyl(.72, .76, .75, '#2a1c3d', { pos: [.32, 2.02, 0], rot: [0, 0, -.14] }), cyl(.78, .78, .16, '#b0303a', { pos: [.28, 1.78, 0], rot: [0, 0, -.14] }));
  const halo = glow('#a78bff', 11, .42); halo.position.z = -.6; g.add(halo); g.halo = halo; return g;
}
function makeFollet() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#c4fff0', roughness: .5, emissive: '#19d9a8', emissiveIntensity: 1.05 });
  g.add(ball(.85, m)); const tip = cone(.66, 1.6, m, { pos: [.1, 1.0, 0], rot: [0, 0, -.18] }); g.add(tip); g.tip = tip;
  g.add(cone(.3, .8, m, { pos: [-.62, .72, 0], rot: [0, 0, .55] }), cone(.26, .7, m, { pos: [.72, .6, 0], rot: [0, 0, -.75] }));
  g.add(sign(1.3, 1.0, (c, w, h) => {
    c.fillStyle = '#0f3d3a'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * w * .2, h * .4, w * .1, h * .17, 0, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * w * .2 + w * .03, h * .34, w * .035, 0, 7); c.fill(); }
    c.strokeStyle = '#0f3d3a'; c.lineCap = 'round'; c.lineWidth = w * .05; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * w * .33, h * .1); c.lineTo(w / 2 + s * w * .1, h * .2); c.stroke(); }
    c.fillStyle = '#0f3d3a'; c.beginPath(); c.moveTo(w * .28, h * .64); c.quadraticCurveTo(w / 2, h * 1.05, w * .72, h * .64); c.closePath(); c.fill();
    c.fillStyle = '#ff7aa8'; c.beginPath(); c.ellipse(w / 2, h * .82, w * .09, h * .08, 0, 0, 7); c.fill();
  }, { res: 128, emissive: true, pos: [0, -.02, .84] }));
  g.add(glow('#5dffd0', 5.5, .7), glow('#ffffff', 1.9, .35)); return g;
}
const grog = makeGrognon(), foll = makeFollet(); scene.add(grog, foll);
const trail = []; for (let i = 0; i < 7; i++) { const s = glow('#5dffd0', 2.2 - i * .24, .55 - i * .07); scene.add(s); trail.push(s); }
const qMark = sign(1.6, 1.9, (c, w, h) => { c.font = `900 ${h * .95}px "Inter", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.strokeStyle = '#231640'; c.lineWidth = w * .16; c.strokeText('?', w / 2, h * .54); c.fillStyle = '#ffe27a'; c.fillText('?', w / 2, h * .54); }, { res: 128, emissive: true }); scene.add(qMark);
function poseGrog(t, amp = 1) { grog.fringe.forEach((b, i) => { b.position.y = -2 + Math.sin(t * 5 + i * 1.7) * .16 * amp; }); grog.halo.material.opacity = .38 + Math.sin(t * 3) * .08; }
function placeFollet(t, path, show = true) {
  foll.visible = show; const p = path(t); foll.position.set(p[0], p[1], p[2]); foll.tip.rotation.z = -.18 + Math.sin(t * 11) * .25; foll.rotation.z = Math.sin(t * 6) * .15;
  trail.forEach((s, i) => { const q = path(t - (i + 1) * .055); s.visible = show; s.position.set(q[0], q[1] + .3, q[2]); });
}

// =====================================================================================  décor 1 : couloir
const cor = room(64, 9, 13, texWood, texWall, false);
cor.add(box(64, .06, 3.4, C.carpet, { pos: [0, .03, 0], cast: false }), box(64, .07, .25, C.gold, { pos: [0, .035, 1.7], cast: false, emissive: '#5a3c00' }), box(64, .07, .25, C.gold, { pos: [0, .035, -1.7], cast: false, emissive: '#5a3c00' }));
for (let i = 0; i < 9; i++) {
  const x = -28 + 7 * i, k = i % 3;
  if (k === 0) { const d = door(i % 2 ? '#7a4a34' : '#5f3f7a'); d.position.set(x, 0, -4.3); cor.add(d); }
  else if (k === 1) { const p = painting(i); p.position.set(x, 6.2, -4.25); cor.add(p); for (const s of [-1, 1]) { const sc = sconce(); sc.position.set(x + s * 2.3, 6.0, -4.3); cor.add(sc); } }
  else { const w = windowMoon(); w.position.set(x, 6.3, -4.3); cor.add(w); const tb = roundTable(2.2); tb.scale.setScalar(.8); tb.position.set(x, 0, -3.2); cor.add(tb); const c = itemCandle(); c.scale.setScalar(.8); c.position.set(x, 2.75, -3.2); cor.add(c); }
}
const cw1 = cobweb(3.2); cw1.position.set(-4.6, 11.2, -4.2); cw1.rotation.z = -PI / 2; cor.add(cw1);
const corFront = new THREE.Group(); cor.add(corFront);                 // mur avant + plafond + fond (seulement pour la vue en enfilade)
corFront.add(plane(64, 13, tmat(texWall, 64 / 5, 13 / 5), [0, 6.5, 4.5], PI), box(64, 2.2, .3, C.wood, { pos: [0, 1.1, 4.35] }), box(64, .22, .42, C.wood2, { pos: [0, 2.3, 4.3] }));
{ const ce = new THREE.Mesh(new THREE.PlaneGeometry(64, 9), mat('#2c2260', { rough: 1 })); ce.rotation.x = PI / 2; ce.position.y = 13; corFront.add(ce); }
corFront.add(plane(9, 13, tmat(texWall, 9 / 5, 13 / 5), [-32, 6.5, 0], PI / 2));
{ const w = windowMoon(1.25); w.rotation.y = PI / 2; w.position.set(-31.8, 6.6, 0); corFront.add(w); }
for (let i = 0; i < 9; i++) { const x = -24.5 + 7 * i; if (i % 2) { const w = windowMoon(); w.rotation.y = PI; w.position.set(x, 6.3, 4.3); corFront.add(w); } else { const sc = sconce(); sc.rotation.y = PI; sc.position.set(x, 6.2, 4.3); corFront.add(sc); } }
for (let i = 0; i < 7; i++) { corFront.add(box(.5, .5, 9, C.dark, { pos: [-28 + i * 7 + 3.5, 12.75, 0] })); }
const pileObj = pile(); pileObj.scale.setScalar(1.25); cor.add(pileObj);

// =====================================================================================  décor 2 : plan du manoir (4×3 pièces qui changent de place)
const brd = new THREE.Group();
brd.add(rbox(10.4, 13.5, .5, .4, '#1c1440', { pos: [0, -.3, 0], rot: [PI / 2, 0, 0] }));
brd.add(box(10.9, .3, .35, C.gold, { pos: [0, .05, 6.95], emissive: '#5a3c00' }), box(10.9, .3, .35, C.gold, { pos: [0, .05, -6.95], emissive: '#5a3c00' }), box(.35, .3, 14.2, C.gold, { pos: [5.4, .05, 0], emissive: '#5a3c00' }), box(.35, .3, 14.2, C.gold, { pos: [-5.4, .05, 0], emissive: '#5a3c00' }));
const TILE = ['#8a6ad8', '#3f9fd0', '#c45f9a', '#4fbe98', '#d89a48', '#6a7fe6', '#b85f7a', '#3fb7b0', '#a07a48', '#5a8fe0', '#aa6cd0', '#d07a5a'];
const slot = i => [((i % 3) - 1) * 3.2, 0, (Math.floor(i / 3) - 1.5) * 3.2];
const PERM = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [7, 3, 10, 0, 8, 1, 11, 5, 2, 6, 9, 4], [4, 9, 1, 6, 2, 11, 0, 10, 7, 3, 5, 8]];
const tiles = [];
for (let i = 0; i < 12; i++) {
  const g = new THREE.Group(); g.add(rbox(2.8, 2.8, .4, .12, TILE[i], { rot: [PI / 2, 0, 0], pos: [0, .2, 0] }));
  for (const [x, z, w, d] of [[0, -1.32, 2.8, .16], [0, 1.32, 2.8, .16], [-1.32, 0, .16, 2.8], [1.32, 0, .16, 2.8]]) g.add(box(w, .75, d, '#f1ecff', { pos: [x, .7, z] }));
  const k = i % 4; if (k === 0) g.add(box(1.1, .5, .8, '#7a4a34', { pos: [-.3, .65, -.4] })); else if (k === 1) g.add(cyl(.5, .5, .5, '#c0303f', { pos: [.3, .65, .2] })); else if (k === 2) g.add(box(.5, .9, 1.6, '#3a2748', { pos: [-.8, .85, 0] })); else g.add(box(1.4, .4, .9, '#fff3d6', { pos: [.2, .6, .4] }));
  brd.add(g); tiles.push(g);
}
const links = [];
for (let i = 0; i < 12; i++) for (const j of [i + 1, i + 3]) { if (j > 11 || (j === i + 1 && i % 3 === 2)) continue; if (hash(i * 7 + j * 3) < .22) continue; const a = slot(i), b = slot(j); const m = box(j === i + 1 ? .7 : .9, .5, j === i + 1 ? .9 : .7, '#ffe27a', { emissive: '#ffb020', emissiveI: 1.4, cast: false, pos: [(a[0] + b[0]) / 2, .75, (a[2] + b[2]) / 2] }); brd.add(m); links.push(m); }
const brdGlow = glow('#a78bff', 30, .35); brdGlow.position.set(0, -2, 0); brd.add(brdGlow);

// =====================================================================================  décor 3 : bibliothèque (les 5 objets)
const lib = room(40, 12, 13, texWood, texWallRose);
for (let i = 0; i < 7; i++) { const b = bookshelf(i + 1); b.position.set(-18 + i * 6, 0, -5.2); lib.add(b); }
for (let i = 0; i < 6; i++) { const s = sconce(); s.position.set(-15 + i * 6, 6.4, -5.7); lib.add(s); }
lib.add(box(40, .06, 5, '#3f5fae', { pos: [0, .03, 1.5], cast: false }), box(40, .07, .3, C.gold, { pos: [0, .035, 4], cast: false, emissive: '#5a3c00' }), box(40, .07, .3, C.gold, { pos: [0, .035, -1], cast: false, emissive: '#5a3c00' }));
const ITEM_X = [-8, -4, 0, 4, 8], ITEM_T = ITEM_X.map((_, i) => T.items + .6 + i * .85), ITEM_Y = [3.75, 4.35, 4.0, 3.55, 3.55];
const stands = [roundTable(2.4), lectern(), dresser(), roundTable(2.0), armchair()];
stands.forEach((s, i) => { s.position.set(ITEM_X[i], 0, -2); lib.add(s); });
const items = [itemKey(), itemBook(), itemCandle(), itemClock(), itemTeddy()], itemGlow = [];
items.forEach((it, i) => { const g = new THREE.Group(); g.add(it); const h = glow('#ffe27a', 4.6, .6); h.position.z = -.4; g.add(h); itemGlow.push(h); it.scale.setScalar(1.25); g.position.set(ITEM_X[i], ITEM_Y[i], -2 + (i === 4 ? .5 : 0)); lib.add(g); items[i] = g; });
const cw2 = cobweb(3); cw2.position.set(-18.4, 11.4, -5.8); cw2.rotation.z = -PI / 2; lib.add(cw2);

// =====================================================================================  décor 4 : grand hall (fantômes, réanimation)
const hall = room(34, 18, 19, texChecker, texWall);
for (let i = 0; i < 8; i++) { hall.add(box(9, .56, 1.02, C.wood2, { pos: [0, .28 + i * .56, -1.5 - i] })); hall.add(box(3.8, .06, 1.02, C.carpet, { pos: [0, .59 + i * .56, -1.5 - i], cast: false })); if (i % 2 === 0) for (const s of [-1, 1]) hall.add(cyl(.12, .12, 2.2, '#c79a3a', { pos: [s * 4.3, 1.6 + i * .56, -1.5 - i], emissive: '#3a2600' })); }
for (const s of [-1, 1]) { hall.add(box(.3, .3, 9, C.wood, { pos: [s * 4.3, 4.75, -5], rot: [.51, 0, 0] })); hall.add(cyl(.3, .3, 3, C.wood, { pos: [s * 4.3, 1.5, -.7] }), ball(.45, C.gold, { pos: [s * 4.3, 3.3, -.7], emissive: '#7a5200' })); }
hall.add(box(34, 4.5, .6, C.wood2, { pos: [0, 2.25, -8.7] }));
{ const w = windowMoon(1.9); w.position.set(0, 11.6, -8.8); hall.add(w); }
for (const s of [-1, 1]) {
  hall.add(cyl(.85, .85, 19, '#6a5fb0', { pos: [s * 8, 9.5, -4] }), box(2.4, .8, 2.4, '#3d3470', { pos: [s * 8, .4, -4] }), box(2.4, .8, 2.4, '#3d3470', { pos: [s * 8, 18.6, -4] }));
  const p = painting(s > 0 ? 1 : 2); p.scale.setScalar(1.3); p.position.set(s * 12.5, 9.2, -8.3); hall.add(p);
  const sc = sconce(); sc.position.set(s * 10.2, 8.6, -8.3); hall.add(sc); const sc2 = sconce(); sc2.position.set(s * 14.8, 8.6, -8.3); hall.add(sc2);
  const d = door('#5f3f7a'); d.rotation.y = -s * PI / 2; d.position.set(s * 16.8, 0, 2); hall.add(d);
  const ac = armchair(s > 0 ? '#3f7fae' : '#a03a5c'); ac.position.set(s * 12.6, 0, -6.4); hall.add(ac);
}
const chand = chandelier(); chand.position.set(0, 13, 1); hall.add(chand);
const cw3 = cobweb(3.6); cw3.position.set(16.8, 18.6, -8.6); cw3.rotation.z = PI; hall.add(cw3);
const stars3 = []; for (let i = 0; i < 4; i++) { const s = new THREE.Group(); s.add(ball(.2, '#ffe27a', { emissive: '#ffb020', emissiveI: 2, seg: 8, seg2: 6, flat: true, cast: false }), glow('#ffe27a', 1.4, .8)); hall.add(s); stars3.push(s); }
const reviveGlow = glow('#7dffb0', 9, 0); hall.add(reviveGlow);

// =====================================================================================  décor 5 : chambre (cachette dans l'armoire)
const bed = room(24, 12, 13, texWood, texWallTeal);
bed.add(cyl(4.2, 4.2, .06, '#7a2f5a', { pos: [-1.5, .03, 1.6], cast: false, seg: 40 }), cyl(3.5, 3.5, .07, '#a8457a', { pos: [-1.5, .035, 1.6], cast: false, seg: 40 }));
{ // lit à baldaquin
  const g = new THREE.Group(); g.add(box(4.8, 1, 6.2, C.wood, { pos: [0, .7, 0] }), rbox(4.5, .7, 5.9, .25, '#fff3d6', { pos: [0, 1.5, 0] }), rbox(4.6, .5, 3.8, .2, '#7a5cc7', { pos: [0, 1.75, 1.1] }), rbox(1.9, .5, 1.1, .22, '#ffffff', { pos: [-1.05, 2, -2.2] }), rbox(1.9, .5, 1.1, .22, '#ffffff', { pos: [1.05, 2, -2.2] }), box(4.8, 4.2, .4, C.wood2, { pos: [0, 2.6, -3.1] }));
  for (const [x, z] of [[-2.3, -3], [2.3, -3], [-2.3, 3], [2.3, 3]]) g.add(cyl(.16, .16, 8, C.wood, { pos: [x, 4, z] }));
  g.add(box(5.2, .3, 6.6, '#7a2f5a', { pos: [0, 8.1, 0] }), box(5.2, 1, .12, '#9c2f6b', { pos: [0, 7.5, 3.25] }));
  g.position.set(-8.2, 0, -2.6); bed.add(g);
}
{ const n = dresser(); n.scale.setScalar(.75); n.position.set(-4.3, 0, -5); bed.add(n); const c = itemCandle(); c.position.set(-4.3, 2.95, -5); bed.add(c); }
{ const w = windowMoon(1.1); w.position.set(9, 6.8, -5.8); bed.add(w); const p = painting(3); p.position.set(-3.6, 7.6, -5.8); bed.add(p); const cw = cobweb(3); cw.position.set(11.8, 12.6, -5.8); cw.rotation.z = PI; bed.add(cw); }
{ const d = door(); d.rotation.y = PI / 2; d.position.set(-11.8, 0, 2.5); bed.add(d); }
const WX = 3.2, WZ = -4.6;                               // armoire
const wardrobe = new THREE.Group(); wardrobe.position.set(WX, 0, WZ); bed.add(wardrobe);
wardrobe.add(box(4.8, 8.8, .2, '#1a0f2c', { pos: [0, 4.4, -1.1] }), box(.28, 8.8, 2.4, '#7a4f8f', { pos: [-2.3, 4.4, 0] }), box(.28, 8.8, 2.4, '#7a4f8f', { pos: [2.3, 4.4, 0] }), box(5.3, .45, 2.8, '#8b5fa3', { pos: [0, 9, 0] }), box(4.8, .5, 2.4, '#7a4f8f', { pos: [0, .25, 0] }), box(4.4, 8, 1.9, '#140a22', { pos: [0, 4.5, -.1], cast: false }));
wardrobe.add(box(3.4, .7, .3, '#8b5fa3', { pos: [0, 9.55, .9] }), ball(.3, C.gold, { pos: [0, 10.05, .9], emissive: '#7a5200' }));
const wDoorL = new THREE.Group(), wDoorR = new THREE.Group(); wDoorL.position.set(-2.2, 4.5, 1.2); wDoorR.position.set(2.2, 4.5, 1.2); wardrobe.add(wDoorL, wDoorR);
for (const [dg, s] of [[wDoorL, 1], [wDoorR, -1]]) { dg.add(box(2.17, 8, .2, '#9a6cb4', { pos: [s * 1.085, 0, 0] }), box(1.5, 3.1, .08, '#b488cc', { pos: [s * 1.085, 1.9, .12] }), box(1.5, 3.1, .08, '#b488cc', { pos: [s * 1.085, -1.9, .12] }), ball(.16, C.gold, { pos: [s * 1.95, 0, .22], emissive: '#7a5200' })); }
const eyes = sign(1.1, .55, (c, w, h) => { for (const s of [-1, 1]) { c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(w / 2 + s * w * .24, h / 2, w * .19, h * .42, 0, 0, 7); c.fill(); c.fillStyle = '#1b1b22'; c.beginPath(); c.arc(w / 2 + s * w * .24, h / 2, w * .09, 0, 7); c.fill(); } }, { res: 128, emissive: true }); wardrobe.add(eyes);

// =====================================================================================  décor 6 : extérieur du manoir (fuite + écran final)
const ext = new THREE.Group();
ext.add(ground(240, '#2c3f6e'));
ext.add(box(5.4, .08, 40, '#7d77ad', { pos: [0, .04, 17], cast: false }));
ext.add(new THREE.Mesh(new THREE.BoxGeometry(26, 13, 8), tmat(texStone, 6, 3)));
ext.children[ext.children.length - 1].position.set(0, 6.5, -8);
{ const geo = new THREE.CylinderGeometry(5.4, 5.4, 27, 3); geo.rotateZ(PI / 2); geo.rotateX(-PI / 2); const r = new THREE.Mesh(geo, mat('#2f2763', { rough: .9, flat: true })); r.scale.y = .8; r.position.set(0, 15.1, -8); ext.add(r); }
{ const tw = new THREE.Mesh(new THREE.BoxGeometry(7.4, 25, 7), tmat(texStone, 2, 6)); tw.position.set(0, 12.5, -6.5); ext.add(tw); const r = cone(6.3, 8.5, '#2f2763', { seg: 4, flat: true, pos: [0, 29.2, -6.5], rot: [0, PI / 4, 0] }); ext.add(r); ext.add(box(8.2, .6, 7.8, '#3d3470', { pos: [0, 25, -6.5] }), ball(.4, C.gold, { pos: [0, 33.6, -6.5], emissive: '#7a5200' })); }
for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 19, 16), tmat(texStone, 3, 5)); t.position.set(s * 13, 9.5, -5.2); ext.add(t); ext.add(cone(3.4, 7, '#2f2763', { seg: 16, pos: [s * 13, 22.5, -5.2] }), cyl(3, 3, .5, '#3d3470', { pos: [s * 13, 19, -5.2] })); }
const winMat = basic('#ffd76a'), winMat2 = basic('#ffb347');
function extWin(x, y, z, w = 2.2, h = 3.4, m = winMat) { const g = new THREE.Group(); g.add(box(w + .5, h + .5, .2, '#231640')); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.z = .11; g.add(p); g.add(box(.14, h, .16, '#231640', { pos: [0, 0, .1] }), box(w, .14, .16, '#231640', { pos: [0, .3, .1] })); const gl = glow('#ffcf70', w * 2.6, .3); gl.position.z = .5; g.add(gl); g.position.set(x, y, z); ext.add(g); return g; }
for (const x of [-10, -6, 6, 10]) { extWin(x, 4.2, -3.95, 2.2, 3.4, x === 6 ? winMat2 : winMat); extWin(x, 9.6, -3.95, 2.2, 3, x === -10 ? winMat2 : winMat); }
extWin(0, 13, -2.95, 2.6, 4); extWin(0, 19.5, -2.95, 2.6, 4, winMat2);
for (const s of [-1, 1]) { const w = extWin(s * 13, 13, -2.55, 1.6, 2.8); extWin(s * 13, 6, -2.55, 1.6, 2.8, winMat2); }
// porte d'entrée
ext.add(box(6.2, 8.6, .5, '#231640', { pos: [0, 4.3, -2.95] })); { const p = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 7.8), basic('#ffd98a')); p.position.set(0, 3.9, -2.68); ext.add(p); }
ext.add(box(7, .8, .9, '#3d3470', { pos: [0, 8.9, -2.8] }));
const eDoorL = new THREE.Group(), eDoorR = new THREE.Group(); eDoorL.position.set(-2.6, 3.9, -2.6); eDoorR.position.set(2.6, 3.9, -2.6); ext.add(eDoorL, eDoorR);
for (const [dg, s] of [[eDoorL, 1], [eDoorR, -1]]) { dg.add(box(2.58, 7.8, .22, '#7a4a34', { pos: [s * 1.29, 0, 0] }), box(1.8, 3, .08, '#8b5a40', { pos: [s * 1.29, 1.9, .14] }), box(1.8, 3, .08, '#8b5a40', { pos: [s * 1.29, -1.9, .14] }), ball(.2, C.gold, { pos: [s * 2.25, 0, .25], emissive: '#7a5200' })); }
ext.add(box(7.4, .35, 2.4, '#7d77ad', { pos: [0, .17, -1.5] }), box(8.4, .18, 3.4, '#6a6498', { pos: [0, .09, -1.3] }));
for (const s of [-1, 1]) { ext.add(cyl(.14, .18, 5, '#231640', { pos: [s * 4, 2.5, -1] }), box(.7, .9, .7, '#ffd98a', { pos: [s * 4, 5.3, -1], emissive: '#ffb347', emissiveI: 1.6, cast: false }), cone(.6, .5, '#231640', { seg: 4, pos: [s * 4, 6, -1], rot: [0, PI / 4, 0] })); const g = glow('#ffcf70', 5, .6); g.position.set(s * 4, 5.3, -.6); ext.add(g); flick.push([g, 5, flick.length]); }
function deadTree(h = 9) { const g = new THREE.Group(), c = '#1c1642'; g.add(cyl(.28, .6, h, c, { pos: [0, h / 2, 0], seg: 8 })); for (const [y, rz, l] of [[.55, .9, .5], [.7, -.8, .42], [.85, .6, .3], [.92, -.5, .26], [.45, -1.1, .3]]) { const b = cyl(.08, .2, h * l, c, { seg: 6 }); b.position.set(-Math.sin(rz) * h * l / 2, y * h + Math.cos(rz) * h * l / 2, 0); b.rotation.z = rz; g.add(b); } return g; }
for (const [x, z, h, r] of [[-11, 5, 10, .3], [11.5, 7, 11, 2], [-17, -1, 13, 1], [18, 1, 12, 4], [-8.5, 14, 8, 5], [9, 17, 8.5, 3], [-22, 10, 12, 2], [23, 12, 11, 1]]) { const t = deadTree(h); t.position.set(x, 0, z); t.rotation.y = r; ext.add(t); }
function pumpkin() { const g = new THREE.Group(); const b = ball(.7, '#ff8a2a', { emissive: '#b84a00', emissiveI: .8, seg: 14, seg2: 10 }); b.scale.y = .8; g.add(b, cyl(.08, .12, .3, '#3f7f3a', { pos: [0, .65, 0] })); g.add(sign(1, .7, (c, w, h) => { c.fillStyle = '#ffe27a'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * w * .3, h * .35); c.lineTo(w / 2 + s * w * .1, h * .35); c.lineTo(w / 2 + s * w * .2, h * .1); c.fill(); } c.beginPath(); c.moveTo(w * .2, h * .55); c.quadraticCurveTo(w / 2, h * 1.05, w * .8, h * .55); c.quadraticCurveTo(w / 2, h * .75, w * .2, h * .55); c.fill(); }, { res: 64, emissive: true, pos: [0, .02, .68] })); const gl = glow('#ffa040', 2.6, .5); g.add(gl); return g; }
for (const [x, z] of [[-3.6, 3], [3.6, 5], [-3.7, 9], [3.7, 12], [-3.6, 16], [3.6, 19], [-5.2, .6], [5.2, .6]]) { const p = pumpkin(); p.position.set(x, .55, z); p.rotation.y = -x * .08; ext.add(p); }
const moon = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 20), basic('#fff6cf')); moon.position.set(11, 36, -44); ext.add(moon);
{ const g = glow('#cfd8ff', 36, .5); g.position.copy(moon.position); ext.add(g); const c1 = new THREE.Mesh(new THREE.SphereGeometry(.9, 12, 8), basic('#ece2b4')); c1.position.set(9.6, 37.2, -40.2); ext.add(c1); const c2 = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), basic('#ece2b4')); c2.position.set(12.4, 34.8, -40.1); ext.add(c2); }
const doorGlow = glow('#ffd98a', 16, 0); doorGlow.position.set(0, 4, -1.6); ext.add(doorGlow);
const flies = []; for (let i = 0; i < 30; i++) { const s = glow('#e4ff7a', .55 + hash(i) * .5, .9); ext.add(s); flies.push(s); }

const SETS = [cor, brd, lib, hall, bed, ext]; for (const s of SETS) scene.add(s);

// =====================================================================================  bruitages
cue(0.02, 'ghost', .8, 2.2); cue(.1, 'whoosh', .7); for (let i = 0; i < 4; i++) cue(.35 + i * .5, 'tap', .5); cue(1.55, 'swish', .8); cue(1.95, 'boing', .6);
cue(T.explore, 'click', 1); cue(T.explore + .02, 'impact', .7); for (let i = 0; i < 9; i++) cue(T.explore + .4 + i * .45, 'tap', .4);
cue(T.explore + 2.3, 'sweepdown', .6); cue(T.explore + 2.6, 'tick', .7); cue(T.explore + 2.9, 'tick', .7); cue(T.explore + 3.2, 'tick', .7); cue(T.explore + 3.75, 'powerup', .9);
cue(T.map - .2, 'whoosh', .8); cue(T.map + .5, 'slide', .8); cue(T.map + 1.3, 'slide', .8); cue(T.map + 1.95, 'ding', .8);
cue(T.items - .2, 'whoosh', .8); ITEM_T.forEach((t, i) => cue(t, i === 4 ? 'chime' : 'coin', .8)); cue(ITEM_T[4] + .35, 'ding', .9);
cue(T.ghosts, 'zap', .7); cue(T.ghosts + .05, 'ghost', .8, 1.6); cue(T.ghosts + .9, 'swish', .7); cue(T.ghosts + 1.7, 'swish', .7);
cue(T.grognon, 'boom', .9); cue(T.grognon + .1, 'ghost', 1, 2); cue(T.grognon + 1.25, 'boing', .7); for (let i = 0; i < 4; i++) cue(T.grognon + 1.4 + i * .22, 'tap', .6);
cue(T.hide - .2, 'whoosh', .8); for (let i = 0; i < 3; i++) cue(T.hide + .1 + i * .22, 'tap', .6); cue(T.hide + 1.0, 'thud', .9); cue(T.hide + 1.3, 'ghost', .7, 2); cue(T.hide + 1.5, 'heartbeat', .9); cue(T.hide + 2.2, 'heartbeat', .9); cue(T.hide + 2.9, 'heartbeat', .8); cue(T.hide + 2.35, 'pop', .6);
cue(T.revive - .2, 'whoosh', .8); for (let i = 0; i < 3; i++) cue(T.revive + .15 + i * .22, 'tap', .6); cue(T.revive + .9, 'riser', .7, 1.4); cue(T.revive + 2.3, 'powerup', 1); cue(T.revive + 2.45, 'pop', .8); cue(T.revive + 2.9, 'ding', .7);
cue(T.escape, 'boom', 1); cue(T.escape + .05, 'whoosh', .8); for (let i = 0; i < 8; i++) cue(T.escape + .45 + i * .2, 'tap', .5); cue(T.escape + 1.7, 'ghost', .6, 1.5);
cue(T.win, 'win', 1); cue(T.win + .15, 'pop', .7); cue(T.win + 1.2, 'chime', .7);
cue(T.end, 'impact', .9); cue(T.end + .6, 'pop', .7); cue(T.end + 1.0, 'bell', .7); cue(T.end + 2.2, 'ghost', .5, 2);

// =====================================================================================  affichages 2D type jeu
function hudBattery(p, t, alpha = 1) {
  const x = 96, y = 262, w = 300, h = 96; ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(18,10,48,.82)'; roundRect(x, y, w, h, 30); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; roundRect(x, y, w, h, 30); ctx.stroke();
  // petite lampe
  ctx.save(); ctx.translate(x + 56, y + h / 2); ctx.rotate(-.5); ctx.fillStyle = '#e0473a'; ctx.fillRect(-26, -9, 30, 18); ctx.fillStyle = '#d7dbe6'; ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(20, -17); ctx.lineTo(20, 17); ctx.lineTo(4, 9); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(24, -12); ctx.lineTo(44, -22); ctx.lineTo(44, 22); ctx.lineTo(24, 12); ctx.globalAlpha *= .4 + .6 * p; ctx.fill(); ctx.restore();
  const low = p < .25, col = low ? (Math.sin(t * 16) > 0 ? '#ff4d5e' : '#8a1d2a') : p < .5 ? '#ffc93c' : '#45f07a';
  const bx = x + 112, by = y + 26, bw = 150, bh = 44; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; roundRect(bx, by, bw, bh, 9); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw + 3, by + 12, 9, 20);
  for (let i = 0; i < 4; i++) { if (p > i / 4 + .02) { ctx.fillStyle = col; ctx.globalAlpha = alpha * clamp((p - i / 4) * 4, .35, 1); roundRect(bx + 8 + i * 35, by + 8, 29, bh - 16, 4); ctx.fill(); } }
  ctx.restore();
}
const ICONS = ['🔑', '', '', '', ''];
function drawItemIcon(i, x, y, s, on) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = on ? '#3b2a00' : 'rgba(255,255,255,.35)'; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = s * .16; ctx.lineCap = 'round';
  if (i === 0) { ctx.beginPath(); ctx.arc(-s * .3, 0, s * .26, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * .04, 0); ctx.lineTo(s * .6, 0); ctx.moveTo(s * .34, 0); ctx.lineTo(s * .34, s * .3); ctx.moveTo(s * .56, 0); ctx.lineTo(s * .56, s * .26); ctx.stroke(); }
  else if (i === 1) { ctx.fillRect(-s * .42, -s * .5, s * .84, s); ctx.fillStyle = on ? '#ffd23c' : 'rgba(20,10,50,.6)'; ctx.fillRect(-s * .2, -s * .3, s * .4, s * .3); }
  else if (i === 2) { ctx.fillRect(-s * .13, -s * .25, s * .26, s * .6); ctx.fillRect(-s * .4, s * .35, s * .8, s * .16); ctx.beginPath(); ctx.ellipse(0, -s * .45, s * .13, s * .22, 0, 0, 7); ctx.fill(); }
  else if (i === 3) { ctx.beginPath(); ctx.arc(0, s * .04, s * .44, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, s * .04); ctx.lineTo(0, -s * .24); ctx.moveTo(0, s * .04); ctx.lineTo(s * .2, s * .14); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, s * .1, s * .4, 0, 7); ctx.arc(-s * .34, -s * .34, s * .19, 0, 7); ctx.arc(s * .34, -s * .34, s * .19, 0, 7); ctx.fill(); }
  ctx.restore();
}
function hudItems(n, t, lastT = -9, alpha = 1) {
  const cx = SAFE.cx, y = 300, w = 640, h = 132; ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(18,10,48,.82)'; roundRect(cx - w / 2, y - h / 2, w, h, 36); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; roundRect(cx - w / 2, y - h / 2, w, h, 36); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const x = cx - w / 2 + 70 + i * 94, on = i < n, pop = on && i === n - 1 ? 1 + .45 * (1 - inv(lastT, lastT + .35, t)) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.fillStyle = on ? '#ffd23c' : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, 7); ctx.fill(); ctx.strokeStyle = on ? '#fff6c8' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 4; ctx.stroke(); drawItemIcon(i, 0, 0, 40, on); ctx.restore();
  }
  ctx.restore();
  text(`${n}/5`, cx + w / 2 - 78, y + 2, { size: 60, color: n === 5 ? '#ffe27a' : '#ffffff', alpha, maxW: 130 });
}
function label(str, y, o = {}) { pill(str, SAFE.cx, y, { size: 46, bg: 'rgba(18,10,48,.85)', border: 'rgba(255,255,255,.9)', borderW: 4, ...o }); }
function stars2D(t, a = 1) { ctx.save(); for (let i = 0; i < 70; i++) { const k = .5 + .5 * Math.sin(t * (1 + hash(i) * 2) + i); ctx.globalAlpha = a * (.25 + .6 * k); ctx.fillStyle = '#ffffff'; const s = 2 + hash(i * 3) * 3.5; ctx.fillRect(hash(i * 7) * W, hash(i * 13) * H * .62, s, s); } ctx.restore(); }

// =====================================================================================  rendu
const CAP = { font: 'Inter', size: 84, y: 1330 };
function hidePeople() { for (const p of people) { p.visible = false; p.position.y = 0; p.rotation.set(0, 0, 0); p.scale.setScalar(1); setLamp(p, 0); } }
function render(t) {
  // ---- remise à zéro (aucune mémoire d'une image à l'autre)
  hidePeople(); grog.visible = false; grog.scale.setScalar(1); grog.rotation.set(0, 0, 0); foll.visible = false; foll.scale.setScalar(1); trail.forEach(s => s.visible = false); qMark.visible = false;
  spot.intensity = 0; gLight.intensity = 0; wLight.intensity = 0; corFront.visible = false; pileObj.visible = false; LG.hemi.intensity = 1.55; LG.sun.intensity = 1.5;
  flick.forEach(([h, s, i]) => h.scale.setScalar(s * (1 + .13 * Math.sin(t * 13 + i * 2.1) + .07 * Math.sin(t * 29 + i))));
  let sx = 0, sy = 0, scale = 1;

  if (t < T.explore) { // ------------------------------------------------ accroche : couloir, Grognon dans le dos
    showOnly(SETS, cor); bg(['#1a1450', '#2c1d6a']);
    const hx = -1.2 + t * 1.1, turn = prog(t, 1.75, 2.0, ease.io), h = turn > .5 ? heroS : hero;
    h.visible = true; h.position.set(hx, 0, .6); h.rotation.y = PI / 2 - turn * 1.0; poseWalk(h, t * 7, .45 * (1 - turn)); lampArm(h, -1.4 + Math.sin(t * 3) * .08); setLamp(h, 1); h.parts.head.rotation.y = -turn * .5;
    aimSpot(h, 7);
    grog.visible = true; grog.scale.setScalar(1.12); grog.position.set(hx - 2.9 + turn * .3, 5.3 + Math.sin(t * 3.4) * .25, -1.6); grog.rotation.y = .5; grog.rotation.z = Math.sin(t * 3.4) * .06; poseGrog(t);
    gLight.color.set('#a78bff'); gLight.intensity = 1.6; gLight.position.set(hx - 2.5, 5, 1.5);
    placeFollet(t, tt => { const k = inv(.9, 2.2, tt); return [lerp(9, -8, k), 7.2 + Math.sin(k * 9) * 1.1, 2.4]; }, t > .9 && t < 2.3);
    camLook(camera, [hx + .2, 5.3, 20.5 - prog(t, 0, 2.5, ease.out) * 2.2], [hx - .5, 4.3, 0], 42);
  } else if (t < T.map) { // --------------------------------------------- explorer à la lampe, trouver des piles
    showOnly(SETS, cor); corFront.visible = true; bg(['#141046', '#241a5c']);
    const lt = t - T.explore, hx = -6 + lt * 2.4, pickT = T.explore + 3.75;
    const battery = t < pickT ? lerp(.62, .06, inv(T.explore, pickT - .2, t)) : lerp(.06, 1, prog(t, pickT, pickT + .5));
    const low = battery < .25, fl = low ? (.4 + .35 * (hash(Math.floor(t * 22)) > .4 ? 1 : 0)) : .55 + .45 * battery;
    hero.visible = true; hero.position.set(hx, Math.abs(Math.sin(t * 6.5)) * .12, 0); hero.rotation.y = PI / 2 + Math.sin(lt * 1.6) * .28; poseWalk(hero, t * 6.5, .55); lampArm(hero, -1.32 + Math.sin(lt * 2.3) * .12); setLamp(hero, fl); aimSpot(hero, 8 * fl);
    pileObj.visible = t < pickT + .25; const pk = inv(pickT, pickT + .25, t); pileObj.position.set(3, 2.6 + Math.sin(t * 3) * .2 + pk * 1.6, 0); pileObj.rotation.y = t * 2.4; pileObj.scale.setScalar(1.25 * (1 - pk));
    placeFollet(t, tt => [hx - 12 + Math.sin(tt * 2.2) * 1.6, 5.5 + Math.sin(tt * 3.1) * 1.3, -1.5 + Math.cos(tt * 2.2) * 1.5], true);
    gLight.color.set('#7dffe0'); gLight.intensity = 1.5; gLight.position.set(hx - 12, 5.5, 0);
    wLight.color.set('#7dff9a'); wLight.intensity = 2.2 * inv(pickT - .1, pickT + .1, t) * (1 - inv(pickT + .3, pickT + .9, t)); wLight.position.set(hx + 1, 4, 2);
    camLook(camera, [hx + 16.5 - lt * .3, 4.9 + Math.sin(lt * .8) * .2, 1.1], [hx, 3.7, 0], 42);
  } else if (t < T.items) { // ------------------------------------------- les pièces changent de place
    showOnly(SETS, brd); bg(['#1b1458', '#3a2380']); LG.hemi.intensity = 1.9; LG.sun.intensity = 2.0;
    const lt = t - T.map, k1 = prog(lt, .5, 1.15, ease.io), k2 = prog(lt, 1.3, 1.9, ease.io);
    tiles.forEach((g, i) => {
      const a = slot(PERM[0][i]), b = slot(PERM[1][i]), c = slot(PERM[2][i]); const x = lerp(lerp(a[0], b[0], k1), c[0], k2), z = lerp(lerp(a[2], b[2], k1), c[2], k2);
      g.position.set(x, Math.sin(k1 * PI) * (1.2 + hash(i) * 3.2) + Math.sin(k2 * PI) * (1.2 + hash(i + 20) * 3.2), z); g.rotation.y = (k1 + k2) * PI * (i % 2 ? 1 : -1) * 2;
    });
    links.forEach((m, i) => { const k = ease.back(inv(1.95 + i * .025, 2.15 + i * .025, lt)); m.visible = k > .01; m.scale.setScalar(Math.max(k, .01)); });
    camLook(camera, [Math.sin(lt * .5) * 3, 25 - lt * .6, 15], [0, 0, 2.2], 42);
  } else if (t < T.ghosts) { // ------------------------------------------ les 5 objets
    showOnly(SETS, lib); bg(['#1d1250', '#35206e']);
    const hx = -9.2 + (t - ITEM_T[0]) * (4 / .85);
    hero.visible = true; hero.position.set(hx, Math.abs(Math.sin(t * 8)) * .15, 2.4); hero.rotation.y = PI / 2 + .55; poseWalk(hero, t * 8, .65); lampArm(hero, -1.3); setLamp(hero, 1); aimSpot(hero, 8);
    items.forEach((g, i) => {
      const k = inv(ITEM_T[i], ITEM_T[i] + .45, t); g.visible = k < 1; g.position.y = ITEM_Y[i] + Math.sin(t * 3 + i) * .14 + ease.out(k) * 2.6; g.rotation.y = Math.sin(t * 1.6 + i) * .5 + k * 9;
      g.scale.setScalar(k <= 0 ? 1 : (1 + Math.sin(k * PI) * .5) * (1 - ease.in(k))); itemGlow[i].material.opacity = .5 + .2 * Math.sin(t * 5 + i) + k * .4;
    });
    wLight.color.set('#ffe27a'); wLight.intensity = 1.2; wLight.position.set(hx + 2, 5, 1);
    camLook(camera, [hx + 1.4, 5.6, 19.5], [hx + 1.4, 3.9, 0], 42);
  } else if (t < T.grognon) { // ----------------------------------------- fantôme 1 : Feu Follet
    showOnly(SETS, hall); bg(['#151048', '#2b1c66']);
    const lt = t - T.ghosts, w = 2 * PI / 1.7, path = tt => { const a = (tt - T.ghosts) * w + .6; return [Math.sin(a) * 3.3, 5.6 + Math.sin(a * 2) * 1.5, 4.6 + Math.cos(a) * 1.6]; };
    placeFollet(t, path); foll.scale.setScalar(1.35);
    const p = path(t); heroS.visible = true; heroS.position.set(0, 0, 3.2); heroS.rotation.y = clamp(p[0] * .32, -.9, .9); poseIdle(heroS, t); lampArm(heroS, -1.75 - (p[1] - 5.6) * .12); setLamp(heroS, 1); aimSpot(heroS, 6);
    heroS.parts.armL.rotation.set(-.6, 0, -.5 + Math.sin(t * 14) * .08); heroS.position.x = Math.sin(t * 30) * .03;
    gLight.color.set('#7dffe0'); gLight.intensity = 3; gLight.position.set(p[0], p[1], p[2] + 1.5);
    camLook(camera, [Math.sin(lt * .6) * 1.5, 4.8, 22 - lt * .5], [0, 4.4, 2], 42);
  } else if (t < T.hide) { // -------------------------------------------- fantôme 2 : Grognon
    showOnly(SETS, hall); bg(['#1c1050', '#3a1f70']);
    const lt = t - T.grognon, run = prog(lt, 1.35, 2.5, ease.in);
    grog.visible = true; grog.scale.setScalar(1.55); grog.position.set(-.6 + run * 1.5, 6.6 + Math.sin(t * 3) * .3 - prog(lt, 0, .8) * .6, -3.2 + prog(lt, 0, 1.3) * 3.6 + run * 1.5); grog.rotation.z = Math.sin(t * 9) * .05 * (1 + run * 2); grog.rotation.x = .12; poseGrog(t, 1.5);
    heroS.visible = true; const turn = prog(lt, 1.2, 1.45, ease.io); heroS.position.set(1.4 + run * 9, Math.abs(Math.sin(t * 11)) * .2 * turn, 5.2); heroS.rotation.y = turn * PI / 2;
    if (turn > 0) { poseWalk(heroS, t * 13, .9); lampArm(heroS, -1.3); } else { poseIdle(heroS, t); lampArm(heroS, -1.35); heroS.parts.armL.rotation.set(0, 0, -.9 + Math.sin(t * 20) * .08); heroS.position.x += Math.sin(t * 34) * .04; }
    setLamp(heroS, 1); aimSpot(heroS, 5);
    gLight.color.set('#a78bff'); gLight.intensity = 3; gLight.position.set(0, 6, 3);
    camLook(camera, [2.6 - lt * .3, 2.6, 19 - lt * .5], [.3, 5.2, 0], 46);
  } else if (t < T.revive) { // ------------------------------------------ cachette : l'armoire
    showOnly(SETS, bed); bg(['#10183e', '#1f2f5e']);
    const lt = t - T.hide, runK = prog(lt, 0, .8, ease.io), inside = lt > .8;
    heroS.visible = !inside; heroS.position.set(lerp(-1.5, WX, runK), Math.abs(Math.sin(t * 12)) * .2, lerp(4.2, WZ + 1.6, runK)); heroS.rotation.y = Math.atan2(WX + 1.5, WZ + 1.6 - 4.2); poseWalk(heroS, t * 13, .9); lampArm(heroS, -1.2); setLamp(heroS, 1 - inv(.5, .8, lt)); aimSpot(heroS, 5 * (1 - inv(.5, .8, lt)));
    const open = lt < .8 ? prog(lt, 0, .35, ease.out) * 1.75 : lerp(1.75, .2, prog(lt, .8, 1.05, ease.in));
    wDoorL.rotation.y = -open * (lt < .8 ? 1 : .15); wDoorR.rotation.y = open;
    if (lt >= .8) wDoorL.rotation.y = -lerp(1.75, 0, prog(lt, .8, 1.05, ease.in));
    const gk = inv(1.0, 3.75, lt), gx = gk < .42 ? lerp(-14, 1.6, ease.out(gk / .42)) : gk < .72 ? 1.6 : lerp(1.6, 15, ease.in((gk - .72) / .28)), pause = gk >= .42 && gk < .72;
    grog.visible = lt > .95; grog.scale.setScalar(1.15); grog.position.set(gx, 4.6 + Math.sin(t * 3) * .25, 1.2); grog.rotation.y = pause ? Math.sin((gk - .42) / .3 * PI * 2) * .7 : .75; poseGrog(t);
    qMark.visible = pause; qMark.position.set(gx + 1.4, 8.2 + Math.sin(t * 8) * .12, 1.4); qMark.rotation.z = Math.sin(t * 6) * .15;
    eyes.visible = lt > 1.1; eyes.position.set(1.72, 4.75, 1.02); eyes.scale.set(1, Math.sin(t * 3.1) > .93 ? .1 : 1, 1);
    gLight.color.set('#a78bff'); gLight.intensity = grog.visible ? 2.4 : 0; gLight.position.set(gx, 5, 3.5);
    camLook(camera, [1.6, 5.6, 22.5 - prog(lt, 0, 3.75, ease.io) * 3.5], [1.6, 4.6, -2], 42);
  } else if (t < T.escape) { // ------------------------------------------ réanimer un coéquipier
    showOnly(SETS, hall); bg(['#101a44', '#1f3a5c']);
    const lt = t - T.revive, done = lt > 2.3, up = prog(lt, 2.3, 2.6, ease.out), arrive = prog(lt, 0, .8, ease.out);
    mateA.visible = true; mateA.rotation.y = -.35;
    if (!done) { mateA.position.set(9.5, -1.5, 3); const p = mateA.parts; p.legL.rotation.set(-1.5, 0, .12); p.legR.rotation.set(-1.5, 0, -.12); p.armL.rotation.set(-.5, 0, -.2); p.armR.rotation.set(-.5, 0, .2); p.head.rotation.set(.1, Math.sin(t * 3) * .25, Math.sin(t * 2.2) * .2); p.torso.rotation.set(0, 0, 0); }
    else { mateA.position.set(9.5, -1.5 + up * 1.5 + Math.abs(Math.sin((lt - 2.3) * 7)) * .9 * up, 3); poseCheer(mateA, t); mateA.parts.head.rotation.set(-.1, 0, 0); setLamp(mateA, 0); }
    stars3.forEach((s, i) => { const a = t * 4 + i * PI / 2; s.visible = !done; s.position.set(9.5 + Math.cos(a) * 1.1, 5.0 + Math.sin(a * 2) * .12, 3 + Math.sin(a) * 1.1); s.rotation.y = t * 5; });
    hero.visible = true; hero.position.set(lerp(-1, 6.3, arrive), done ? Math.abs(Math.sin((lt - 2.3) * 7 + 1)) * .8 : Math.abs(Math.sin(t * 12)) * .18 * (1 - arrive), 3.4); hero.rotation.y = PI / 2 - .25;
    if (done) { poseCheer(hero, t + .4); hero.rotation.y = .5; } else if (arrive < 1) { poseWalk(hero, t * 13, .9); lampArm(hero, -1.3); } else { poseIdle(hero, t); poseHold(hero, 1); hero.parts.armL.rotation.x += Math.sin(t * 9) * .12; hero.parts.armR.rotation.x -= Math.sin(t * 9) * .12; hero.parts.torso.rotation.set(0, 0, 0); }
    setLamp(hero, done ? 0 : .8); aimSpot(hero, done ? 0 : 4);
    const rk = inv(.9, 2.3, lt); reviveGlow.position.set(9.3, 2.6, 3.6); reviveGlow.material.opacity = done ? .8 * (1 - inv(2.3, 3.1, lt)) : rk * .55; reviveGlow.scale.setScalar(6 + rk * 5 + up * 6);
    wLight.color.set('#7dffb0'); wLight.intensity = rk * 2.5; wLight.position.set(9, 4, 6);
    camLook(camera, [10.2 - lt * .25, 4.2, 20.5 - lt * .6], [7.9, 3.3, 2], 42);
  } else { // ------------------------------------------------------------- fuite, victoire, écran final
    showOnly(SETS, ext); bg([[0, '#0c1040'], [.5, '#2a1f72'], [.78, '#5a3a8e'], [1, '#2c3f6e']]); stars2D(t);
    const lt = t - T.escape, won = t >= T.win, end = t >= T.end, open = prog(lt, 0, .45, ease.back) * 1.9;
    eDoorL.rotation.y = -open; eDoorR.rotation.y = open;
    doorGlow.material.opacity = .75 * inv(0, .4, lt); doorGlow.scale.setScalar(16 + Math.sin(t * 5) * 1);
    wLight.color.set('#ffc070'); wLight.intensity = 3 * inv(0, .4, lt); wLight.position.set(0, 5, 5);
    const team = [hero, mateA, mateB, mateC], tx = [-1.1, 1.3, -3.4, 3.5], tz = [9.5, 8.6, 7.2, 6.6];
    team.forEach((p, i) => {
      const t0 = .25 + i * .22, k = inv(t0, t0 + 1.7, lt), ke = ease.out(k); p.visible = lt > t0; setLamp(p, 0);
      p.position.set(lerp(tx[i] * .35, tx[i], ke), 0, lerp(-3.2, tz[i], ke)); p.rotation.y = lerp(0, tx[i] * .06, ke);
      if (won) { poseCheer(p, t + i * .7); p.position.y = Math.abs(Math.sin((t - T.win) * 6.5 + i * 1.1)) * 1.0; }
      else if (k < 1) { poseWalk(p, t * 14 + i * 1.3, 1); p.position.y = Math.abs(Math.sin(t * 14 + i * 1.3)) * .25; ; p.parts.armR.rotation.set(Math.sin(t * 14 + i * 1.3), 0, 0); }
      else poseIdle(p, t + i);
    });
    const gk = prog(lt, 1.6, 2.2, ease.back); grog.visible = gk > .02; grog.scale.setScalar(Math.max(.02, 1.18 * gk)); grog.position.set(Math.sin(t * 13) * .12, 4.3 + Math.sin(t * 3) * .2, -2.2); grog.rotation.z = Math.sin(t * 13) * .07; poseGrog(t, 1.4);
    placeFollet(t, tt => { const a = tt * 3.4; return [Math.cos(a) * 4.6, 10.4 + Math.sin(a * 2) * 1.0, -1.4 + Math.sin(a) * .9]; }, lt > 1.2);
    gLight.color.set('#7dffe0'); gLight.intensity = lt > 1.2 ? 1.5 : 0; gLight.position.set(0, 10, 0);
    flies.forEach((s, i) => { const a = t * (.3 + hash(i * 3) * .5) + i; s.position.set((hash(i * 5) - .5) * 26 + Math.sin(a) * 1.6, 1.2 + hash(i * 7) * (end ? 24 : 9) + Math.sin(a * 1.7) * .8, 1 + hash(i * 11) * 16 + Math.cos(a) * 1.4); s.material.opacity = .45 + .5 * Math.sin(t * 3 + i * 2); });
    const ke = prog(t, T.end - .1, T.end + 2.2, ease.io), pull = prog(lt, 0, 5, ease.io);
    camLook(camera, [lerp(Math.sin(lt * .5) * .8, 0, ke), lerp(4.6, 7.5, ke), lerp(21.5 + pull * 5, 52 + (t - T.end) * .7, ke)], [0, lerp(4.2 + pull * .4, 15.5, ke), lerp(0, -6, ke)], 42);
    [sx, sy] = shake(t, T.escape, 20, .5);
  }
  draw3D(scene, camera, { dx: sx, dy: sy, scale });
  vignette(.5, '10,4,40');

  // ---------------------------------------------------------------------- textes, affichages, transitions
  if (t < T.explore) { caption(t, 0, T.explore - .12, 'OSERAS-TU\nENTRER ?', { font: 'Creepster', size: 150, y: 470, anim: 'pop', inDur: .12, grad: ['#fff6b0', '#ffb347'], stroke: '#1a0f3d', strokeW: 22, shadow: 'rgba(10,4,40,.6)', lineH: 1.0 }); }
  flash(t, T.explore, .4, '255,240,170', .9);
  if (t >= T.explore && t < T.map) {
    const pickT = T.explore + 3.75, battery = t < pickT ? lerp(.62, .06, inv(T.explore, pickT - .2, t)) : lerp(.06, 1, prog(t, pickT, pickT + .5));
    hudBattery(battery, t, inv(T.explore + .1, T.explore + .4, t));
    if (t > pickT && t < pickT + .9) text('+ PILE', 246, 410 - prog(t, pickT, pickT + .9) * 50, { size: 56, color: '#7dff9a', stroke: '#0d2a1a', strokeW: 10, alpha: 1 - inv(pickT + .5, pickT + .9, t) });
    caption(t, T.explore + .3, T.explore + 2.35, 'EXPLORE À LA LAMPE', { ...CAP, bg: '#ffd23c', color: '#231640', anim: 'pop' });
    caption(t, T.explore + 2.5, T.map - .3, 'TROUVE DES PILES !', { ...CAP, bg: '#2ecc71', color: '#0d2a1a', anim: 'slide' });
  }
  wipe(t, T.map, { color: '#7c3aed', color2: '#231640', dir: 'left' });
  if (t >= T.map && t < T.items) { caption(t, T.map + .3, T.items - .3, 'UN MANOIR DIFFÉRENT\nÀ CHAQUE PARTIE', { ...CAP, size: 78, y: 1360, bg: '#7c3aed', anim: 'pop' }); label('LES PIÈCES CHANGENT DE PLACE', 300, { alpha: inv(T.map + .3, T.map + .6, t) }); }
  wipe(t, T.items, { color: '#ffd23c', color2: '#7c3aed', dir: 'right' });
  if (t >= T.items && t < T.ghosts) {
    const n = ITEM_T.filter(x => t > x + .3).length, last = n ? ITEM_T[n - 1] + .3 : -9; hudItems(n, t, last, inv(T.items + .15, T.items + .45, t));
    ITEM_T.forEach((x, i) => { if (t > x && t < x + .6) sparkles(t * 3, { n: 10, x: 400, y: 620, w: 400, h: 400, color: '#ffe27a', size: 22, seed: i * 9 }); });
    caption(t, T.items + .3, T.ghosts - .3, 'TROUVE LES 5 OBJETS', { ...CAP, bg: '#ffd23c', color: '#231640', anim: 'pop' });
  }
  flash(t, T.ghosts, .4, '125,255,224', .9);
  if (t >= T.ghosts && t < T.grognon) { label('FANTÔME 1 SUR 2', 300, { alpha: inv(T.ghosts + .15, T.ghosts + .4, t) }); caption(t, T.ghosts + .25, T.grognon - .15, 'FEU FOLLET', { font: 'Creepster', size: 170, y: 1330, anim: 'slam', grad: ['#eafff8', '#3df0c0'], stroke: '#0f3d3a', strokeW: 22, shadow: 'rgba(0,0,0,.5)' }); }
  flash(t, T.grognon, .4, '190,160,255', .95);
  if (t >= T.grognon && t < T.hide) { label('FANTÔME 2 SUR 2', 300, { alpha: inv(T.grognon + .15, T.grognon + .4, t) }); caption(t, T.grognon + .25, T.hide - .3, 'GROGNON', { font: 'Creepster', size: 190, y: 1330, anim: 'slam', grad: ['#f3ecff', '#a78bff'], stroke: '#231640', strokeW: 24, shadow: 'rgba(0,0,0,.5)' }); }
  wipe(t, T.hide, { color: '#1f2f5e', color2: '#7dffe0', dir: 'left' });
  if (t >= T.hide && t < T.revive) caption(t, T.hide + .3, T.revive - .3, 'CACHE-TOI !', { ...CAP, size: 110, bg: '#3a6f96', anim: 'pop' });
  wipe(t, T.revive, { color: '#2ecc71', color2: '#231640', dir: 'up' });
  if (t >= T.revive && t < T.escape) {
    const lt = t - T.revive;
    if (lt > .85 && lt < 2.45) { const a = win(lt, .85, 2.45, .15); ctx.save(); ctx.globalAlpha = a; label('RÉANIMATION', 440, { size: 44 }); bar(SAFE.cx - 250, 492, 500, 46, inv(.9, 2.3, lt), { color: '#7dffb0' }); ctx.restore(); }
    if (lt > 2.3) sparkles(t * 2, { n: 18, x: 240, y: 500, w: 600, h: 600, color: '#b8ffd0', size: 24 });
    flash(t, T.revive + 2.3, .3, '125,255,176', .6);
    caption(t, T.revive + .3, T.escape - .3, 'RÉANIME TES AMIS', { ...CAP, bg: '#2ecc71', color: '#0d2a1a', anim: 'pop' });
  }
  flash(t, T.escape, .45, '255,225,160', 1);
  if (t >= T.escape && t < T.end) {
    hudItems(5, t, -9, inv(T.escape + .2, T.escape + .5, t));
    caption(t, T.escape + .3, T.win - .15, 'SORS AVEC LES 5 OBJETS', { ...CAP, size: 78, bg: '#ff8a2a', color: '#231640', anim: 'pop' });
    if (t >= T.win) { sparkles(t, { n: 30, y: 420, h: 900, color: '#ffe27a', size: 20 }); caption(t, T.win, T.end - .15, 'ÉCHAPPÉS !', { font: 'Creepster', size: 200, y: 1330, anim: 'slam', grad: ['#fff6b0', '#ffb347'], stroke: '#1a0f3d', strokeW: 24, shadow: 'rgba(0,0,0,.5)' }); }
  }
  flash(t, T.win, .35, '255,240,170', .7);
  flash(t, T.end, .4, '200,180,255', .9);
  if (t >= T.end) {
    fade(.42 * inv(T.end, T.end + .5, t), '#0c0a34'); sparkles(t, { n: 16, y: 240, h: 500, color: '#e4ff7a', size: 12 });
    endCard(t, T.end + .15, { title: 'LIGHTS OUT\nMANSION', tagline: '5 objets. 2 fantômes. 1 lampe.', status: 'bientot', font: 'Creepster', titleSize: 170, titleGrad: ['#fff6b0', '#ffb347'], titleStroke: '#1a0f3d', accent: '#7c3aed' });
  }
}

registerAd({ duration: DURATION, thumbTime: T.grognon + .9, render,
  music: { style: 'spooky', bpm: 96, sections: [[0, 'intro'], [T.explore, 'build'], [T.map, 'break'], [T.items, 'drop'], [T.hide, 'break'], [T.revive, 'build'], [T.escape, 'drop2']], end: T.end } });
