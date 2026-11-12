// Moteur commun des 17 publicités (1080x1920, 30 i/s).
// Chaque pub est un module `projet/ad.js` qui appelle registerAd({ duration, music, render }).
// Règle d'or : render(t) dessine l'instant t SANS dépendre des images précédentes
// (pas d'état accumulé, pas de Math.random, pas de Date) : le rendu est parallélisé.
import * as THREE from './three.module.js';
export { THREE };

export const W = 1080, H = 1920, FPS = 30;
// Zone sûre pour les textes (les applis recouvrent le haut, le bas et le bord droit).
export const SAFE = { l: 70, r: 1010, t: 210, b: 1540, w: 940, cx: 540 };

// ------------------------------------------------------------------ maths
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0 avant a, 1 après b, linéaire entre les deux. */
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const ease = {
  io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1,
  bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
};
/** Progression 0→1 entre a et b avec une courbe (par défaut : ease.out). */
export const prog = (t, a, b, f = ease.out) => f(inv(a, b, t));
/** Vaut 1 entre a et b avec un fondu de `f` secondes à l'entrée et à la sortie. */
export const win = (t, a, b, f = .25) => Math.min(inv(a, a + f, t), 1 - inv(b - f, b, t));
export const DEG = Math.PI / 180;
/** Hasard déterministe 0..1 à partir d'un nombre. */
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57), hash(i + 1 + seed * 57), u); }
/** Décalage [dx, dy] d'un tremblement d'écran déclenché à `at`. */
export function shake(t, at, amp = 18, dur = .45) {
  const k = 1 - inv(at, at + dur, t); if (t < at || k <= 0) return [0, 0];
  return [(noise1(t * 40, 1) - .5) * 2 * amp * k * k, (noise1(t * 40, 2) - .5) * 2 * amp * k * k];
}
export function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mixHex(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }
export const rgba = (hex, a) => { const c = hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

// ------------------------------------------------------------------ toile 2D
export const out = document.getElementById('out');
export const ctx = out.getContext('2d');

/** Charge les polices avant le rendu. Familles : Anton, Baloo, Bangers, Bungee, Chewy, Cinzel, Creepster,
 *  Fredoka, Lilita, Luckiest, Orbitron, Pacifico, PressStart, RubikMono, Russo, Titan, Inter (600/800/900). */
export async function loadFonts(families) {
  for (const f of families) await Promise.all([600, 800, 900].map(w => document.fonts.load(`${f === 'Inter' ? w : 400} 60px "${f}"`, 'Éàçœ0')));
}

// ------------------------------------------------------------------ repères sonores
const _cues = [];
/** Déclare un bruitage à l'instant t (à appeler une fois, au chargement, pas dans render).
 *  Noms : whoosh, swish, impact, boom, pop, coin, ding, bell, click, tick, laser, zap, boing, splash, bubble,
 *  thud, glass, powerup, fail, win, heartbeat, crowd, whistle, ghost, crunch, engine, horn, riser, sweepdown,
 *  scratch, chime, slide, tap, roll. `dur` sert pour riser, engine, crowd, ghost, roll. */
export function cue(t, name, gain = 1, dur = 0) { _cues.push({ t, name, gain, dur }); }

// ------------------------------------------------------------------ 3D
let _gl = null, _glCanvas = null;
/** Moteur WebGL partagé (créé à la première demande). */
export function gl3D({ shadows = true, exposure = 1.0, tone = true } = {}) {
  if (_gl) return _gl;
  _glCanvas = document.createElement('canvas');
  const Q = new URLSearchParams(location.search);
  _gl = new THREE.WebGLRenderer({ canvas: _glCanvas, antialias: Q.get('aa') !== '0', alpha: true, preserveDrawingBuffer: true });
  _gl.setPixelRatio(1); _gl.setSize(W, H, false);
  _gl.shadowMap.enabled = shadows && Q.get('sh') !== '0'; _gl.shadowMap.type = Q.get('sh') === 'pcf' ? THREE.PCFShadowMap : Q.get('sh') === 'basic' ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
  if (tone && Q.get('tone') !== '0') { _gl.toneMapping = THREE.ACESFilmicToneMapping; _gl.toneMappingExposure = exposure; }
  _gl.outputColorSpace = THREE.SRGBColorSpace;
  _gl.setClearColor(0x000000, 0);
  return _gl;
}
/** Rend la scène 3D puis la copie sur la toile 2D (fond transparent : dessine le ciel en 2D avant). */
export function draw3D(scene, camera, { alpha = 1, dx = 0, dy = 0, scale = 1 } = {}) {
  const r = gl3D(); r.render(scene, camera);
  ctx.save(); ctx.globalAlpha = alpha;
  if (scale !== 1) { ctx.translate(W / 2, H / 2); ctx.scale(scale, scale); ctx.translate(-W / 2, -H / 2); }
  ctx.drawImage(_glCanvas, dx, dy); ctx.restore();
}
/** Caméra portrait prête à l'emploi. */
export function makeCamera(fov = 45) { return new THREE.PerspectiveCamera(fov, W / H, 0.1, 500); }
/** Place la caméra en `pos` et la fait regarder `target` ([x,y,z]). */
export function camLook(camera, pos, target, fov) {
  camera.position.set(pos[0], pos[1], pos[2]); camera.up.set(0, 1, 0); camera.lookAt(target[0], target[1], target[2]);
  if (fov && camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
const _mats = new Map();
/** Matériau mat en cache. opts : { rough, metal, emissive, emissiveI, flat, opacity, side } */
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o); if (_mats.has(k)) return _mats.get(k);
  const QM = new URLSearchParams(location.search).get('mat');
  const m = QM === 'lambert' ? new THREE.MeshLambertMaterial({ color, flatShading: !!o.flat, emissive: o.emissive ?? 0x000000 }) : QM === 'phong' ? new THREE.MeshPhongMaterial({ color, flatShading: !!o.flat, shininess: 20, specular: 0x222222 }) : new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.75, metalness: Math.min(o.metal ?? 0, .35), flatShading: !!o.flat,   // sans reflets d'ambiance, un métal fort paraît noir : plafonné
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveI ?? 1,
    transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1, side: o.side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
  });
  _mats.set(k, m); return m;
}
function _mesh(geo, color, o) { const m = new THREE.Mesh(geo, typeof color === 'object' && color.isMaterial ? color : mat(color, o)); m.castShadow = o?.cast ?? true; m.receiveShadow = o?.receive ?? true; if (o?.pos) m.position.set(...o.pos); if (o?.rot) m.rotation.set(...o.rot); return m; }
/** Formes de base. `o` accepte les options de mat() plus { pos:[x,y,z], rot:[x,y,z], cast, receive }. */
export const box = (w, h, d, color, o) => _mesh(new THREE.BoxGeometry(w, h, d), color, o);
export const ball = (r, color, o) => _mesh(new THREE.SphereGeometry(r, o?.seg ?? 24, o?.seg2 ?? 16), color, o);
export const cyl = (rTop, rBot, h, color, o) => _mesh(new THREE.CylinderGeometry(rTop, rBot, h, o?.seg ?? 24), color, o);
export const cone = (r, h, color, o) => _mesh(new THREE.ConeGeometry(r, h, o?.seg ?? 16), color, o);
export const torus = (r, tube, color, o) => _mesh(new THREE.TorusGeometry(r, tube, 12, o?.seg ?? 32), color, o);
/** Boîte aux arêtes arrondies (look « jouet »). */
export function rbox(w, h, d, r, color, o) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const b = Math.min(r * .6, d / 2 - 0.001);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * b) / 2); return _mesh(g, color, o);
}
/** Lumières standard : ciel + soleil avec ombres. Renvoie { hemi, sun }. (env:true ajoute des reflets d'ambiance mais TRIPLE le temps de rendu : à éviter.)
 *  Le personnage mesure ~5,2 unités : place la caméra à 18-30 unités pour le voir en entier. */
export function addLights(scene, { sun = '#fff1dc', sunI = 2.6, sky = '#cfe3ff', ground = '#7a6a55', ambI = 1.15, dir = [6, 12, 7], shadowArea = 16, shadowMap = 1536, target = [0, 0, 0], env = false, envI = .45 } = {}) {
  const hemi = new THREE.HemisphereLight(sky, ground, ambI); scene.add(hemi);
  const s = new THREE.DirectionalLight(sun, sunI); s.position.set(dir[0] + target[0], dir[1] + target[1], dir[2] + target[2]);
  s.target.position.set(...target); scene.add(s.target);
  s.castShadow = true; s.shadow.mapSize.set(shadowMap, shadowMap); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.03; s.shadow.radius = 3;
  const c = s.shadow.camera; c.left = -shadowArea; c.right = shadowArea; c.top = shadowArea; c.bottom = -shadowArea; c.near = 0.5; c.far = 80; c.updateProjectionMatrix();
  scene.add(s);
  if (env && new URLSearchParams(location.search).get('env') !== '0') { // reflets doux pour les matériaux métalliques (sinon le métal paraît noir)
    const e = new THREE.Scene(); e.add(new THREE.Mesh(new THREE.SphereGeometry(20, 16, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { a: { value: new THREE.Color(sky) }, b: { value: new THREE.Color(ground) } },
      vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float k = smoothstep(-.25,.45,normalize(p).y); gl_FragColor = vec4(mix(b,a,k) * (1. + 2.5 * smoothstep(.75,1.,normalize(p).y)),1.); }' })));
    scene.environment = new THREE.PMREMGenerator(gl3D()).fromScene(e, 0.04).texture; scene.environmentIntensity = envI;
  }
  return { hemi, sun: s };
}
/** Texture dessinée sur une toile (fn reçoit le contexte 2D et la taille). */
export function canvasTex(size, fn, { repeat } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
/** Panneau plat portant un dessin 2D (pancarte, écran, visage…). */
export function sign(w, h, fn, { res = 256, emissive = false, pos, rot } = {}) {
  const c = document.createElement('canvas'); c.width = res; c.height = Math.round(res * h / w); fn(c.getContext('2d'), c.width, c.height);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = emissive ? new THREE.MeshBasicMaterial({ map: tex, transparent: true }) : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .8 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); if (pos) p.position.set(...pos); if (rot) p.rotation.set(...rot); return p;
}
/** Halo lumineux (sprite additif) : pour étincelles, phares, magie. */
let _glowTex;
export function glow(color = '#ffffff', size = 1, opacity = 1) {
  _glowTex ||= canvasTex(64, (g, n) => { const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); return s;
}

/** Personnage en blocs (silhouette générique de jeu de plateforme en blocs), ~4,3 unités de haut, pieds à y=0.
 *  opts : { skin, shirt, pants, hair, hat:'none'|'cap'|'top'|'chef'|'crown'|'cone'|'helmet', hatColor, face:'smile'|'happy'|'scared'|'angry'|'wow'|'none', scale }
 *  Renvoie un Group avec .parts { head, torso, armL, armR, legL, legR } (bras et jambes pivotent à l'épaule / la hanche). */
export function makeCharacter(o = {}) {
  const skin = o.skin ?? '#f2c6a0', shirt = o.shirt ?? '#2f7de1', pants = o.pants ?? '#2b3350';
  const g = new THREE.Group(), parts = {};
  const torso = rbox(2, 2, 1, .12, shirt); torso.position.y = 3; g.add(torso); parts.torso = torso;
  const head = new THREE.Group(); head.position.y = 4.0; g.add(head); parts.head = head;
  const skull = rbox(1.25, 1.2, 1.25, .3, skin); skull.position.y = .62; head.add(skull);
  const face = o.face ?? 'smile';
  if (face !== 'none') {
    const f = sign(1.1, 1.05, (c, w, h) => {
      c.fillStyle = '#1b1b22'; c.strokeStyle = '#1b1b22'; c.lineWidth = w * .05; c.lineCap = 'round';
      const ex = w * .28, ey = h * .4, er = w * .075;
      if (face === 'happy') { for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * ex, ey + er, er * 1.4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
      else if (face === 'wow' || face === 'scared') { for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * ex, ey, er * 1.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2 + s * ex + er * .4, ey - er * .4, er * .5, 0, 7); c.fill(); c.fillStyle = '#1b1b22'; } }
      else { for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * ex, ey, er, er * 1.35, 0, 0, 7); c.fill(); } }
      if (face === 'angry') { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * (ex + er * 2), ey - er * 3.2); c.lineTo(w / 2 + s * (ex - er * 1.6), ey - er * 1.8); c.stroke(); } }
      c.beginPath();
      if (face === 'wow') { c.ellipse(w / 2, h * .7, w * .08, w * .1, 0, 0, 7); c.fill(); }
      else if (face === 'scared') { c.moveTo(w * .36, h * .74); c.quadraticCurveTo(w / 2, h * .62, w * .64, h * .74); c.stroke(); }
      else if (face === 'angry') { c.moveTo(w * .36, h * .74); c.quadraticCurveTo(w / 2, h * .66, w * .64, h * .74); c.stroke(); }
      else { c.moveTo(w * .32, h * .64); c.quadraticCurveTo(w / 2, h * .86, w * .68, h * .64); c.stroke(); }
    }, { res: 128 });
    f.position.set(0, .62, .632); head.add(f);
  }
  if (o.hair) { const h = rbox(1.36, .55, 1.36, .22, o.hair); h.position.set(0, 1.06, -.03); head.add(h); const b = rbox(1.36, .9, .4, .15, o.hair); b.position.set(0, .7, -.52); head.add(b); }
  const hc = o.hatColor ?? '#e23b3b';
  if (o.hat === 'cap') { const c = cyl(.7, .72, .42, hc); c.position.y = 1.36; head.add(c); const v = box(1.0, .08, .7, hc); v.position.set(0, 1.2, .78); head.add(v); }
  else if (o.hat === 'top') { const b = cyl(1.0, 1.0, .08, hc); b.position.y = 1.24; head.add(b); const c = cyl(.6, .62, .95, hc); c.position.y = 1.72; head.add(c); }
  else if (o.hat === 'chef') { const b = cyl(.62, .62, .5, '#ffffff'); b.position.y = 1.45; head.add(b); const c = ball(.78, '#ffffff'); c.scale.y = .6; c.position.y = 1.95; head.add(c); }
  else if (o.hat === 'crown') { const c = cyl(.66, .6, .45, '#ffc93c', { metal: .8, rough: .3 }); c.position.y = 1.42; head.add(c); for (let i = 0; i < 6; i++) { const s = cone(.14, .32, '#ffc93c', { metal: .8, rough: .3 }); s.position.set(Math.cos(i * 1.047) * .58, 1.78, Math.sin(i * 1.047) * .58); head.add(s); } }
  else if (o.hat === 'cone') { const c = cone(.6, 1.3, hc); c.position.y = 1.85; head.add(c); const p = ball(.16, '#ffffff'); p.position.y = 2.5; head.add(p); }
  else if (o.hat === 'helmet') { const c = ball(.82, hc, { rough: .35 }); c.scale.set(1, .85, 1); c.position.y = .92; head.add(c); }
  const limb = (x, y, color, color2) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = rbox(.96, 2, .96, .1, color); m.position.y = -1; p.add(m); if (color2) { const h = rbox(.98, .5, .98, .1, color2); h.position.y = -1.76; p.add(h); } g.add(p); return p; };
  parts.armL = limb(-1.5, 4, shirt, skin); parts.armR = limb(1.5, 4, shirt, skin);
  parts.legL = limb(-.5, 2, pants); parts.legR = limb(.5, 2, pants);
  g.parts = parts; if (o.scale) g.scale.setScalar(o.scale); return g;
}
/** Poses du personnage (appeler à chaque image). `phase` en radians (ex. t*10). */
export function poseWalk(ch, phase, amp = .7) { const p = ch.parts, s = Math.sin(phase) * amp; p.legL.rotation.set(s, 0, 0); p.legR.rotation.set(-s, 0, 0); p.armL.rotation.set(-s, 0, 0); p.armR.rotation.set(s, 0, 0); p.torso.rotation.set(0, 0, 0); p.head.rotation.set(0, 0, 0); }
export function poseIdle(ch, t) { const p = ch.parts, b = Math.sin(t * 2.2) * .04; p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0); p.armL.rotation.set(0, 0, -.06 - b); p.armR.rotation.set(0, 0, .06 + b); p.head.rotation.set(b * .6, Math.sin(t * .9) * .12, 0); }
export function poseCheer(ch, t) { const p = ch.parts, w = Math.sin(t * 12) * .25; p.armL.rotation.set(0, 0, -2.7 + w); p.armR.rotation.set(0, 0, 2.7 - w); p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0); p.head.rotation.set(-.15, 0, 0); }
export function poseJump(ch, k = 1) { const p = ch.parts; p.armL.rotation.set(-2.6 * k, 0, -.3 * k); p.armR.rotation.set(-2.6 * k, 0, .3 * k); p.legL.rotation.set(.5 * k, 0, 0); p.legR.rotation.set(-.3 * k, 0, 0); }
/** Lève les bras vers l'avant (porter, pousser, tenir un volant) : k de 0 à 1. */
export function poseHold(ch, k = 1) { const p = ch.parts; p.armL.rotation.set(-1.5 * k, 0, 0); p.armR.rotation.set(-1.5 * k, 0, 0); }

/** Décors simples. */
export function tree(h = 4, leaf = '#3fae4a', trunk = '#7a4f2b') { const g = new THREE.Group(); const t = cyl(.28, .36, h * .5, trunk, { seg: 8 }); t.position.y = h * .25; g.add(t); for (let i = 0; i < 3; i++) { const c = cone(1.5 - i * .35, h * .36, leaf, { seg: 8, flat: true }); c.position.y = h * .5 + i * h * .2; g.add(c); } return g; }
export function bushyTree(h = 4, leaf = '#49b356', trunk = '#7a4f2b') { const g = new THREE.Group(); const t = cyl(.3, .4, h * .55, trunk, { seg: 8 }); t.position.y = h * .27; g.add(t); for (const [x, y, z, r] of [[0, .78, 0, .34], [-.22, .66, .1, .26], [.24, .68, -.08, .27], [0, .64, .22, .24]]) { const b = ball(r * h, leaf, { seg: 10, seg2: 8, flat: true }); b.position.set(x * h, y * h, z * h); g.add(b); } return g; }
export function cloud(scale = 1, color = '#ffffff') { const g = new THREE.Group(); for (const [x, y, z, r] of [[0, 0, 0, 1], [1.1, -.1, .1, .75], [-1.1, -.15, 0, .8], [.4, .45, -.1, .7], [-.5, .35, .1, .6]]) { const b = ball(r, color, { seg: 12, seg2: 10, cast: false, receive: false }); b.position.set(x, y, z); g.add(b); } g.scale.setScalar(scale); return g; }
/** Sol plat (disque ou carré) qui reçoit les ombres. */
export function ground(size = 80, color = '#6fc25a', { y = 0, round = false, tex } = {}) {
  const m = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }) : mat(color, { rough: .95 });
  const g = new THREE.Mesh(round ? new THREE.CircleGeometry(size / 2, 48) : new THREE.PlaneGeometry(size, size), m);
  g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = true; return g;
}
/** Affiche seulement un groupe parmi plusieurs (pratique pour changer de scène 3D). */
export function showOnly(groups, active) { for (const g of groups) g.visible = g === active; }

// ------------------------------------------------------------------ fonds et effets 2D
/** Dégradé vertical plein écran. stops : ['#haut', '#bas'] ou [[0,'#..'],[.5,'#..'],[1,'#..']] */
export function bg(stops, angle = 0) {
  const a = angle * DEG, dx = Math.sin(a) * H / 2, dy = Math.cos(a) * H / 2;
  const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  stops.forEach((s, i) => Array.isArray(s) ? g.addColorStop(s[0], s[1]) : g.addColorStop(i / (stops.length - 1), s));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** Rayons tournants (fond d'accroche ou d'écran final). */
export function rays(t, { cx = W / 2, cy = H / 2, n = 16, color = 'rgba(255,255,255,.12)', speed = .25, r = 2400 } = {}) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * speed); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n, b = a + Math.PI / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r); ctx.fill(); }
  ctx.restore();
}
/** Assombrit les bords. */
export function vignette(strength = .55, color = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .32, W / 2, H / 2, H * .72); g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** Éclair blanc (ou coloré) à l'instant `at` : transition par flash. */
export function flash(t, at, dur = .35, color = '255,255,255', peak = 1) {
  if (t < at - .04 || t > at + dur) return; const k = t < at ? inv(at - .04, at, t) : 1 - inv(at, at + dur, t);
  ctx.fillStyle = `rgba(${color},${k * k * peak})`; ctx.fillRect(0, 0, W, H);
}
/** Volet coloré qui traverse l'écran autour de `at` (masque le changement de plan). dir : 'left'|'right'|'up'|'down'. */
export function wipe(t, at, { dur = .5, color = '#ffffff', color2, dir = 'left' } = {}) {
  const a = at - dur / 2, b = at + dur / 2; if (t < a || t > b) return;
  const p = ease.io(inv(a, b, t)); const horiz = dir === 'left' || dir === 'right', L = (horiz ? W : H) * 1.5, s = dir === 'left' || dir === 'up' ? -1 : 1;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate((horiz ? -12 : 0) * DEG);
  const draw = (col, off) => { const pos = s * lerp(-L * 1.25, L * 1.25, clamp(p + off)); ctx.fillStyle = col; if (horiz) ctx.fillRect(pos - L * .62, -H, L * 1.24, H * 2); else ctx.fillRect(-W, pos - L * .62, W * 2, L * 1.24); };
  if (color2) draw(color2, -.06); draw(color, 0); ctx.restore();
}
/** Fondu au noir (ou couleur) : k de 0 à 1. */
export function fade(k, color = '#000000') { if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
/** Traits de vitesse partant du centre. */
export function speedLines(t, { n = 46, color = 'rgba(255,255,255,.55)', cx = W / 2, cy = H * .45, inner = 520, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; const f = Math.floor(t * 15);
  for (let i = 0; i < n; i++) { const a = hash(i * 7.3 + f * 1.7) * 6.283, r0 = inner + hash(i + f) * 260, w = .012 + hash(i * 3 + f) * .02; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a - w) * 2400, cy + Math.sin(a - w) * 2400); ctx.lineTo(cx + Math.cos(a + w) * 2400, cy + Math.sin(a + w) * 2400); ctx.fill(); }
  ctx.restore();
}
/** Confettis lancés à `start` depuis (cx, cy). */
export function confetti(t, start, { n = 110, colors = ['#ff4d6d', '#ffc93c', '#3fe0ff', '#45f07a', '#b388ff', '#ffffff'], cx = W / 2, cy = H * .42, power = 1500, gravity = 1500, life = 3.2 } = {}) {
  const lt = t - start; if (lt < 0 || lt > life) return; ctx.save(); ctx.globalAlpha = 1 - inv(life - .7, life, lt);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hash(i * 1.3) - .5) * 2.6, v = power * (.35 + hash(i * 2.7) * .65), drag = 1 - Math.exp(-lt * 1.6);
    const x = cx + Math.cos(a) * v * drag / 1.6, y = cy + Math.sin(a) * v * drag / 1.6 + .5 * gravity * lt * lt * .35;
    ctx.save(); ctx.translate(x, y); ctx.rotate(lt * (4 + hash(i) * 8) + i); ctx.scale(1, Math.cos(lt * (6 + hash(i * 5) * 6) + i));
    ctx.fillStyle = colors[i % colors.length]; const s = 14 + hash(i * 9) * 16; ctx.fillRect(-s / 2, -s / 4, s, s / 2); ctx.restore();
  }
  ctx.restore();
}
/** Petites étoiles scintillantes dans un rectangle. */
export function sparkles(t, { n = 26, x = 0, y = 0, w = W, h = H, color = '#ffffff', size = 14, seed = 0 } = {}) {
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) { const ph = (t * (.5 + hash(i + seed) * .8) + hash(i * 3 + seed)) % 1, k = Math.sin(ph * Math.PI); const px = x + hash(i * 5 + seed) * w, py = y + hash(i * 11 + seed) * h, s = size * k * (.5 + hash(i * 2) * .8); ctx.globalAlpha = k; ctx.beginPath(); ctx.moveTo(px, py - s); ctx.quadraticCurveTo(px, py, px + s, py); ctx.quadraticCurveTo(px, py, px, py + s); ctx.quadraticCurveTo(px, py, px - s, py); ctx.quadraticCurveTo(px, py, px, py - s); ctx.fill(); }
  ctx.restore();
}
/** Bandes noires de cinéma (k de 0 à 1). */
export function letterbox(k, h = 170) { if (k <= 0) return; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h * k); ctx.fillRect(0, H - h * k, W, h * k); }
export function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ------------------------------------------------------------------ textes
const _measure = (s, font) => { ctx.font = font; return ctx.measureText(s).width; };
/** Texte centré en (x, y), réduit automatiquement pour tenir dans maxW. Lignes séparées par \n.
 *  o : { size, font:'Inter', weight:900, color, stroke, strokeW, shadow:'rgba()', shadowY, maxW, align, lineH, alpha, scale, rot, glow, grad:['#haut','#bas'], spacing } */
export function text(str, x, y, o = {}) {
  const lines = String(str).split('\n'); const fam = o.font ?? 'Inter', wt = o.weight ?? (fam === 'Inter' ? 900 : 400);
  let size = o.size ?? 90; const maxW = o.maxW ?? SAFE.w;
  ctx.save(); if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing ?? 0) + 'px';
  const fontOf = s => `${wt} ${s}px "${fam}", "Inter", sans-serif`;
  let widest = Math.max(...lines.map(l => _measure(l, fontOf(size)))); if (widest > maxW) size = Math.floor(size * maxW / widest);
  const lh = (o.lineH ?? 1.08) * size;
  ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale != null && o.scale !== 1) ctx.scale(o.scale, o.scale);
  ctx.globalAlpha *= clamp(o.alpha ?? 1); ctx.font = fontOf(size); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const y0 = -(lines.length - 1) * lh / 2;
  lines.forEach((l, i) => {
    const ly = y0 + i * lh;
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(l, 0, ly + (o.shadowY ?? size * .08)); if (o.stroke) { ctx.strokeStyle = o.shadow; ctx.lineWidth = o.strokeW ?? size * .14; ctx.strokeText(l, 0, ly + (o.shadowY ?? size * .08)); } }
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = size * .45; }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW ?? size * .14; ctx.strokeText(l, 0, ly); }
    if (o.grad) { const g = ctx.createLinearGradient(0, ly - size * .5, 0, ly + size * .5); g.addColorStop(0, o.grad[0]); g.addColorStop(1, o.grad[1]); ctx.fillStyle = g; } else ctx.fillStyle = o.color ?? '#ffffff';
    ctx.fillText(l, 0, ly); ctx.shadowBlur = 0;
  });
  ctx.restore(); return size;
}
/** Sous-titre animé : apparaît à `a`, disparaît à `b`. anim : 'pop' | 'slam' | 'slide' | 'rise' | 'type' | 'fade'.
 *  o : options de text() + { y (défaut 1320), anim, bg (couleur d'une étiquette derrière le texte), pad, radius, tilt } */
export function caption(t, a, b, str, o = {}) {
  if (t < a || t > b) return; const anim = o.anim ?? 'pop', y = o.y ?? 1320, x = o.x ?? SAFE.cx; const kin = inv(a, a + (o.inDur ?? .28), t), kout = 1 - inv(b - .18, b, t);
  let sc = 1, dx = 0, dy = 0, al = kout, s = str;
  if (anim === 'pop') sc = ease.back(kin) * (.92 + .08 * kout); else if (anim === 'slam') { sc = lerp(2.6, 1, ease.out(kin)); al *= kin; }
  else if (anim === 'slide') { dx = (1 - ease.out(kin)) * -900; } else if (anim === 'rise') { dy = (1 - ease.out(kin)) * 120; al *= kin; }
  else if (anim === 'type') { s = str.slice(0, Math.ceil(str.length * inv(a, a + Math.min(1.2, (b - a) * .5), t))); } else al *= kin;
  ctx.save(); ctx.translate(x + dx, y + dy); if (o.tilt) ctx.rotate(o.tilt * DEG); ctx.scale(sc, sc); ctx.globalAlpha = clamp(al);
  const size = o.size ?? 84, fam = o.font ?? 'Inter', wt = o.weight ?? (fam === 'Inter' ? 900 : 400), maxW = o.maxW ?? (o.bg ? SAFE.w - 90 : SAFE.w);
  if (o.bg) {
    const lines = String(str).split('\n'); let sz = size; const f = z => `${wt} ${z}px "${fam}", "Inter", sans-serif`;
    let wd = Math.max(...lines.map(l => _measure(l, f(sz)))); if (wd > maxW) { sz = Math.floor(sz * maxW / wd); wd = maxW; }
    const pad = o.pad ?? sz * .42, hh = lines.length * sz * (o.lineH ?? 1.08) + pad * 1.3;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; roundRect(-wd / 2 - pad, -hh / 2 + 10, wd + pad * 2, hh, o.radius ?? 28); ctx.fill();
    ctx.fillStyle = o.bg; roundRect(-wd / 2 - pad, -hh / 2, wd + pad * 2, hh, o.radius ?? 28); ctx.fill();
  }
  text(s, 0, 0, { stroke: o.bg ? undefined : '#000000', shadow: o.bg ? undefined : 'rgba(0,0,0,.45)', ...o, size, maxW, alpha: 1, scale: 1, rot: 0 });
  ctx.restore();
}
/** Étiquette arrondie avec texte (HUD, badge, bouton). Renvoie la largeur. */
export function pill(str, x, y, { size = 54, color = '#ffffff', bg = '#111827', pad, font = 'Inter', weight, radius, alpha = 1, scale = 1, border, borderW = 6, maxW = SAFE.w - 80, shadow = true, grad } = {}) {
  const wt = weight ?? (font === 'Inter' ? 800 : 400); let sz = size; const f = z => `${wt} ${z}px "${font}", "Inter", sans-serif`;
  let wd = _measure(str, f(sz)); if (wd > maxW) { sz = Math.floor(sz * maxW / wd); wd = _measure(str, f(sz)); }
  const p = pad ?? sz * .55, hh = sz * 1.7, ww = wd + p * 2;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.globalAlpha *= clamp(alpha);
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(-ww / 2, -hh / 2 + 8, ww, hh, radius ?? hh / 2); ctx.fill(); }
  if (grad) { const g = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2); g.addColorStop(0, grad[0]); g.addColorStop(1, grad[1]); ctx.fillStyle = g; } else ctx.fillStyle = bg;
  roundRect(-ww / 2, -hh / 2, ww, hh, radius ?? hh / 2); ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = borderW; ctx.stroke(); }
  ctx.font = f(sz); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(str, 0, sz * .04);
  ctx.restore(); return ww * scale;
}
/** Barre de progression (vie, XP, chargement). p de 0 à 1. */
export function bar(x, y, w, h, p, { color = '#45f07a', bg = 'rgba(0,0,0,.55)', border = '#ffffff', borderW = 5, radius } = {}) {
  const r = radius ?? h / 2; ctx.save(); ctx.fillStyle = bg; roundRect(x, y, w, h, r); ctx.fill();
  if (p > 0.001) { ctx.save(); roundRect(x, y, w, h, r); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(p), h); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, w * clamp(p), h * .4); ctx.restore(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = borderW; roundRect(x, y, w, h, r); ctx.stroke(); } ctx.restore();
}
/** Nombre qui grimpe de `from` à `to` entre a et b (renvoie une chaîne avec séparateur d'espaces). */
export function count(t, a, b, from, to) { return Math.round(lerp(from, to, ease.out(inv(a, b, t)))).toLocaleString('fr-FR').replace(/ | /g, ' '); }

/** Écran final commun (à dessiner PAR-DESSUS ton propre fond animé). Respecte le statut réel du jeu :
 *  status 'public'  → bouton « JOUE MAINTENANT » + « Disponible sur Roblox » + « Cherche « <titre> » »
 *  status 'bientot' → bouton « BIENTÔT SUR ROBLOX » + « Abonne-toi pour ne pas rater la sortie »
 *  o : { title, tagline, status, font, titleColor, titleGrad, accent (couleur du bouton), accentText, y (centre, défaut 800), search } */
export function endCard(t, start, o) {
  const lt = t - start; if (lt < 0) return; const y = o.y ?? 800, font = o.font ?? 'Inter', pub = o.status === 'public';
  const k1 = ease.back(inv(0, .45, lt)), k2 = ease.out(inv(.35, .75, lt)), k3 = ease.back(inv(.7, 1.1, lt)), k4 = ease.out(inv(1.15, 1.6, lt));
  const lines = o.title.split('\n').length;
  text(o.title, SAFE.cx, y - 180, { font, size: o.titleSize ?? 150, color: o.titleColor ?? '#ffffff', grad: o.titleGrad, stroke: o.titleStroke ?? '#000000', strokeW: 22, shadow: 'rgba(0,0,0,.5)', shadowY: 14, scale: k1, maxW: SAFE.w - 40, lineH: 1.0 });
  if (o.tagline) text(o.tagline, SAFE.cx, y + 30 + (lines - 1) * 70, { font: 'Inter', weight: 800, size: 58, color: '#ffffff', stroke: 'rgba(0,0,0,.85)', strokeW: 12, alpha: k2, maxW: SAFE.w - 60 });
  const pulse = 1 + Math.sin(lt * 7) * .035 * inv(1.1, 1.3, lt), by = y + 230 + (lines - 1) * 70;
  pill(pub ? 'JOUE MAINTENANT' : 'BIENTÔT SUR ROBLOX', SAFE.cx, by, { size: pub ? 78 : 66, bg: o.accent ?? '#22c55e', color: o.accentText ?? '#ffffff', font: 'Inter', weight: 900, scale: k3 * pulse, border: '#ffffff', borderW: 8, radius: 44, pad: 56 });
  text(pub ? 'Disponible sur Roblox' : 'Abonne-toi pour ne pas rater la sortie', SAFE.cx, by + 150, { font: 'Inter', weight: 800, size: 50, color: '#ffffff', stroke: 'rgba(0,0,0,.85)', strokeW: 11, alpha: k4, maxW: SAFE.w - 80 });
  text('Animation d\'illustration', SAFE.cx, 1500, { font: 'Inter', weight: 600, size: 30, color: 'rgba(255,255,255,.78)', stroke: 'rgba(0,0,0,.6)', strokeW: 6, alpha: k4 });
  if (pub) text(`Cherche « ${o.search ?? o.title.replace('\n', ' ')} »`, SAFE.cx, by + 225, { font: 'Inter', weight: 600, size: 44, color: '#ffffff', stroke: 'rgba(0,0,0,.85)', strokeW: 10, alpha: ease.out(inv(1.4, 1.85, lt)), maxW: SAFE.w - 80 });
}

// ------------------------------------------------------------------ enregistrement
/** Déclare la pub. spec : { duration (30 à 60 s), music: {...}, thumbTime, render(t) }. */
export function registerAd(spec) {
  if (!(spec.duration >= 30 && spec.duration <= 60)) throw new Error('duration doit être entre 30 et 60 secondes');
  window.AD = {
    FPS, DURATION: spec.duration, music: spec.music || {}, cues: _cues.slice().sort((a, b) => a.t - b.t), thumbTime: spec.thumbTime ?? 2,
    renderFrame(t) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); spec.render(t); ctx.restore(); },
    ready: true,
  };
}
