// ORBE — bande-annonce : moteur commun (rendu, matériaux, textes, caméra).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const W = 1920, H = 1080;
export const GOLD = new THREE.Color('#F2C14E'), GOLD_HI = new THREE.Color('#FFE7A3'), SKY = new THREE.Color('#7FD1FF'),
  ROSE = new THREE.Color('#FF8FA3'), VIOLET = new THREE.Color('#A98BFF'), WHITE = new THREE.Color('#F4F6FF'), MINT = new THREE.Color('#7BE0B5');

// ---------- outils ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
/** Opacité d'un élément visible de a à b, avec fondus d'entrée et de sortie. */
export const win = (t, a, b, fi = .6, fo = .6) => Math.min(smooth(a, a + fi, t), 1 - smooth(b - fo, b, t));
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
export const gauss = r => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- rendu ----------
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);
export const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 5000);
export const composer = new EffectComposer(renderer);
export const renderPass = new RenderPass(new THREE.Scene(), camera);
composer.addPass(renderPass);
export const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 1.2, 0.6, 0.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());
export const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFade: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 }, uAberr: { value: .0012 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFade, uFlash, uTime, uAberr; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453); }
    void main(){
      vec2 d = vUv - .5; float r = length(d);
      vec3 c; c.r = texture2D(tDiffuse, vUv + d * uAberr * r * 4.).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv - d * uAberr * r * 4.).b;
      c *= smoothstep(1.05, .32, r * 1.18);                 // vignette
      c = mix(c, c * vec3(.96, 1., 1.06), .5);              // légère dominante froide
      c += (h(vUv * 1000.) - .5) * .028;                    // grain
      c = c * (1. - uFade) + vec3(uFlash);
      gl_FragColor = vec4(c, 1.);
    }`,
});
composer.addPass(grade);

// ---------- matériaux ----------
export const pointVS = `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uScale, uTime, uAlpha;
  varying vec3 vColor; varying float vA;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
    float tw = .78 + .22 * sin(uTime * 1.7 + aSeed * 61.);
    gl_PointSize = aSize * uScale * tw / -mv.z; vColor = aColor; vA = uAlpha; }`;
export const pointFS = `varying vec3 vColor; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a *= a; gl_FragColor = vec4(vColor * a * vA * .42, 1.); }`;
export function pointsMaterial(extraUniforms = {}, vs = pointVS, fs = pointFS) {
  return new THREE.ShaderMaterial({ uniforms: { uScale: { value: H * .55 }, uTime: { value: 0 }, uAlpha: { value: 1 }, ...extraUniforms },
    vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}
export function geo(attrs) { const g = new THREE.BufferGeometry(); for (const [k, [arr, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(arr, n)); return g; }
export function makeStars(n, radius, seed, size = 1.6, alpha = .8) {
  const r = rng(seed), p = new Float32Array(n * 3), c = new Float32Array(n * 3), s = new Float32Array(n), e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rr = radius * (.6 + .4 * r());
    p.set([rr * Math.sqrt(1 - u * u) * Math.cos(th), rr * u, rr * Math.sqrt(1 - u * u) * Math.sin(th)], i * 3);
    const col = WHITE.clone().lerp(r() < .5 ? SKY : GOLD_HI, r() * .5).multiplyScalar(.35 + .65 * r());
    c.set([col.r, col.g, col.b], i * 3); s[i] = size * (.4 + r() * r() * 2.2); e[i] = r();
  }
  const m = pointsMaterial({ uScale: { value: H * .55 } });
  m.uniforms.uAlpha.value = alpha;
  // Étoiles très lointaines : taille fixe à l'écran
  m.vertexShader = m.vertexShader.replace('/ -mv.z', '* 1.0 / 900.');
  return new THREE.Points(geo({ position: [p, 3], aColor: [c, 3], aSize: [s, 1], aSeed: [e, 1] }), m);
}
export function glowTexture(stops = [[0, 'rgba(255,255,255,1)'], [.2, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const GLOW = glowTexture();
export function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}
export function lineMaterial(color, opacity) { return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }); }

// ---------- textes à l'écran ----------
const ui = document.getElementById('ui');
const texts = [];
/** Texte affiché entre a et b. pos : {x, y} en px, ou 'center'. drift : léger mouvement vertical (px). */
export function text(cls, html, a, b, { x = W / 2, y = H / 2, fi = .8, fo = .8, drift = 10, track = 0 } = {}) {
  const el = document.createElement('div'); el.className = `t ${cls}`; el.innerHTML = html; ui.appendChild(el);
  const item = { el, a, b, x, y, fi, fo, drift, track, anchor: null }; texts.push(item); return item;
}
export function updateTexts(t) {
  for (const it of texts) {
    const o = win(t, it.a, it.b, it.fi, it.fo);
    it.el.style.opacity = o.toFixed(3);
    if (o <= 0) continue;
    const k = clamp((t - it.a) / Math.max(.01, it.b - it.a));
    let x = it.x, y = it.y;
    if (it.anchor || it.anchorFn) { const p = (it.anchorFn ? it.anchorFn() : it.anchor).clone().project(camera); x = (p.x * .5 + .5) * W; y = (-p.y * .5 + .5) * H + (it.dy ?? 0); if (p.z > 1) { it.el.style.opacity = 0; continue; } }
    const ls = it.track ? `letter-spacing:${(lerp(it.track, it.track * .7, easeOut(k))).toFixed(3)}em;` : '';
    it.el.style.cssText += `;left:${x}px;top:${y}px;transform:translate(-50%,-50%) translateY(${((1 - k) * it.drift).toFixed(2)}px) scale(${lerp(1.02, 1, easeOut(k)).toFixed(4)});${ls}`;
  }
}

// ---------- caméra : images clés lissées ----------
export function cameraPath(keys) {
  return t => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const [t0, p0, q0, f0] = keys[i], [t1, p1, q1, f1] = keys[i + 1];
    const k = ease(clamp((t - t0) / (t1 - t0)));
    camera.position.lerpVectors(p0, p1, k);
    camera.lookAt(new THREE.Vector3().lerpVectors(q0, q1, k));
    camera.fov = lerp(f0 ?? 42, f1 ?? 42, k); camera.updateProjectionMatrix();
  };
}


// ---------- outils supplémentaires ----------
export const C = {
  CYAN: new THREE.Color('#6FC2FF'), ICE: new THREE.Color('#EAF6FF'), DEEP: new THREE.Color('#2B5C9E'),
  ROSE, SKY, GOLD, GOLD_HI, VIOLET, WHITE, MINT, AMBER: new THREE.Color('#FFB454'), RED: new THREE.Color('#FF6B7A'),
};
/** Ligne droite ou brisée, additive. */
export function polyline(points, color, opacity = 0) { return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial(color, opacity)); }
/** Sphère de points régulièrement répartis (emblème d'ORBE). */
export function dotSphere(N, R, seed = 3, { size = .21, back = .28 } = {}) {
  const r = rng(seed), sp = new Float32Array(N * 3), from = new Float32Array(N * 3), sd = new Float32Array(N);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
    sp.set([Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R], i * 3);
    const u = r() * 2 - 1, a2 = r() * 6.283, d = R * 6 + r() * R * 12;
    from.set([Math.sqrt(1 - u * u) * Math.cos(a2) * d, u * d, Math.sin(a2) * Math.sqrt(1 - u * u) * d], i * 3); sd[i] = r();
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 }, uT: { value: 0 }, uScale: { value: H * .55 }, uA: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aFrom; attribute float aSeed; uniform float uK, uT, uScale; varying float vA; varying float vRim;
      void main(){ float k = smoothstep(aSeed * .5, aSeed * .5 + .5, uK); k = 1. - pow(1. - k, 3.);
        vec3 p = mix(aFrom, position, k); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        vec3 n = normalize(normalMatrix * position); float facing = dot(n, normalize(-mv.xyz));
        vRim = pow(1. - abs(facing), 2.6); vA = (facing > 0. ? 1. : ${back.toFixed(2)}) * (.55 + .45 * sin(uT * 2. + aSeed * 40.)) * smoothstep(0., .2, k);
        gl_PointSize = (1.0 + vRim * .5) * ${size.toFixed(3)} * uScale / -mv.z; }`,
    fragmentShader: `uniform float uA; varying float vA; varying float vRim; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .05, d);
      vec3 c = mix(vec3(.32, .7, 1.), vec3(.82, .95, 1.), vRim); gl_FragColor = vec4(c * a * vA * uA * (1.05 + vRim * .7), 1.); }` });
  const pts = new THREE.Points(geo({ position: [sp, 3], aFrom: [from, 3], aSeed: [sd, 1] }), mat); pts.frustumCulled = false;
  return pts;
}
/** Panneau de verre dessiné sur un canvas (cartes, publications, fenêtres). draw(g, w, h) dessine le contenu. */
export function card(wPx, hPx, worldW, draw) {
  const cv = document.createElement('canvas'); cv.width = wPx; cv.height = hPx; const g = cv.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  rr(2, 2, wPx - 4, hPx - 4, 28); g.fillStyle = 'rgba(12,18,42,0.82)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(140,205,255,0.55)'; g.stroke();
  const grad = g.createLinearGradient(0, 0, 0, hPx * .5); grad.addColorStop(0, 'rgba(160,215,255,0.10)'); grad.addColorStop(1, 'rgba(160,215,255,0)'); rr(2, 2, wPx - 4, hPx - 4, 28); g.fillStyle = grad; g.fill();
  draw(g, wPx, hPx, rr);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldW * hPx / wPx), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(.72, .74, .78), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  return m;
}
export function paintImage(g, x, y, w, h, seed = 1) {
  // Image abstraite et colorée (nébuleuse), pour représenter une illustration ou une photo
  const r = rng(seed); const grad = g.createLinearGradient(x, y, x + w, y + h);
  const hues = [[30, 60, 140], [60, 120, 220], [240, 190, 110], [220, 110, 160]];
  grad.addColorStop(0, `rgb(${hues[(seed) % 4]})`); grad.addColorStop(1, `rgb(${hues[(seed + 1) % 4]})`);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = grad; g.fillRect(x, y, w, h);
  for (let i = 0; i < 26; i++) { const cx = x + r() * w, cy = y + r() * h, rad = 10 + r() * w * .25; const gg = g.createRadialGradient(cx, cy, 0, cx, cy, rad); gg.addColorStop(0, `rgba(255,${200 + r() * 55 | 0},${150 + r() * 100 | 0},${.25 + r() * .35})`); gg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gg; g.fillRect(x, y, w, h); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${r() * .8})`; g.fillRect(x + r() * w, y + r() * h, 2, 2); }
  g.restore();
}
export function textLines(g, x, y, w, n, { gap = 22, alpha = .35, thick = 9 } = {}) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(200,220,250,${alpha})`; g.fillRect(x, y + i * gap, w * (i === n - 1 ? .55 : .85 + (i % 2) * .15), thick); }
}
export function avatarDisc(g, cx, cy, rad, hue) {
  const gg = g.createRadialGradient(cx - rad * .3, cy - rad * .3, 2, cx, cy, rad); gg.addColorStop(0, `hsl(${hue},80%,78%)`); gg.addColorStop(1, `hsl(${hue + 30},65%,40%)`);
  g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fillStyle = gg; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(234,246,255,.8)'; g.stroke();
}
/** Points qui voyagent le long de segments (impulsions sur des liens). */
export function pulses(segs, count, color, seed, size = 2.4) {
  const r = rng(seed), a = new Float32Array(count * 3), b = new Float32Array(count * 3), d = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { const [p, q] = segs[i % segs.length]; a.set(p.toArray(), i * 3); b.set(q.toArray(), i * 3); d.set([.35 + r() * .5, r()], i * 2); }
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 }, uScale: { value: H * .55 }, uC: { value: color.clone() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aB; attribute vec2 aD; uniform float uT, uScale; varying float vA; void main(){ float f = fract(uT * aD.x + aD.y); vec4 mv = modelViewMatrix * vec4(mix(position, aB, f), 1.); gl_Position = projectionMatrix * mv; gl_PointSize = ${size.toFixed(2)} * uScale / -mv.z; vA = sin(f * 3.14159); }`,
    fragmentShader: `uniform float uA; uniform vec3 uC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(uC * a * a * vA * uA, 1.); }` });
  const p = new THREE.Points(geo({ position: [a, 3], aB: [b, 3], aD: [d, 2] }), mat); p.frustumCulled = false; return p;
}
