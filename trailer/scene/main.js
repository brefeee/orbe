// ORBE — bande-annonce. Rendu entièrement déterministe : window.renderAt(t) dessine l'image à l'instant t (secondes).
// Aucune capture de l'ancienne interface : toutes les images sont générées ici, en 3D.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1920, H = 1080;
const GOLD = new THREE.Color('#F2C14E'), GOLD_HI = new THREE.Color('#FFE7A3'), SKY = new THREE.Color('#7FD1FF'),
  ROSE = new THREE.Color('#FF8FA3'), VIOLET = new THREE.Color('#A98BFF'), WHITE = new THREE.Color('#F4F6FF'), MINT = new THREE.Color('#7BE0B5');

// ---------- outils ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
/** Opacité d'un élément visible de a à b, avec fondus d'entrée et de sortie. */
const win = (t, a, b, fi = .6, fo = .6) => Math.min(smooth(a, a + fi, t), 1 - smooth(b - fo, b, t));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const gauss = r => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- rendu ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 5000);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 1.2, 0.6, 0.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
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
const pointVS = `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uScale, uTime, uAlpha;
  varying vec3 vColor; varying float vA;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
    float tw = .78 + .22 * sin(uTime * 1.7 + aSeed * 61.);
    gl_PointSize = aSize * uScale * tw / -mv.z; vColor = aColor; vA = uAlpha; }`;
const pointFS = `varying vec3 vColor; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a *= a; gl_FragColor = vec4(vColor * a * vA * .42, 1.); }`;
function pointsMaterial(extraUniforms = {}, vs = pointVS, fs = pointFS) {
  return new THREE.ShaderMaterial({ uniforms: { uScale: { value: H * .55 }, uTime: { value: 0 }, uAlpha: { value: 1 }, ...extraUniforms },
    vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}
function geo(attrs) { const g = new THREE.BufferGeometry(); for (const [k, [arr, n]] of Object.entries(attrs)) g.setAttribute(k, new THREE.BufferAttribute(arr, n)); return g; }
function makeStars(n, radius, seed, size = 1.6, alpha = .8) {
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
function glowTexture(stops = [[0, 'rgba(255,255,255,1)'], [.2, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();
function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}
function lineMaterial(color, opacity) { return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }); }

// ---------- textes à l'écran ----------
const ui = document.getElementById('ui');
const texts = [];
/** Texte affiché entre a et b. pos : {x, y} en px, ou 'center'. drift : léger mouvement vertical (px). */
function text(cls, html, a, b, { x = W / 2, y = H / 2, fi = .8, fo = .8, drift = 10, track = 0 } = {}) {
  const el = document.createElement('div'); el.className = `t ${cls}`; el.innerHTML = html; ui.appendChild(el);
  const item = { el, a, b, x, y, fi, fo, drift, track, anchor: null }; texts.push(item); return item;
}
function updateTexts(t) {
  for (const it of texts) {
    const o = win(t, it.a, it.b, it.fi, it.fo);
    it.el.style.opacity = o.toFixed(3);
    if (o <= 0) continue;
    const k = clamp((t - it.a) / Math.max(.01, it.b - it.a));
    let x = it.x, y = it.y;
    if (it.anchor) { const p = it.anchor.clone().project(camera); x = (p.x * .5 + .5) * W; y = (-p.y * .5 + .5) * H + (it.dy ?? 0); if (p.z > 1) { it.el.style.opacity = 0; continue; } }
    const ls = it.track ? `letter-spacing:${(lerp(it.track, it.track * .7, easeOut(k))).toFixed(3)}em;` : '';
    it.el.style.cssText += `;left:${x}px;top:${y}px;transform:translate(-50%,-50%) translateY(${((1 - k) * it.drift).toFixed(2)}px) scale(${lerp(1.02, 1, easeOut(k)).toFixed(4)});${ls}`;
  }
}

// ---------- caméra : images clés lissées ----------
function cameraPath(keys) {
  return t => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const [t0, p0, q0, f0] = keys[i], [t1, p1, q1, f1] = keys[i + 1];
    const k = ease(clamp((t - t0) / (t1 - t0)));
    camera.position.lerpVectors(p0, p1, k);
    camera.lookAt(new THREE.Vector3().lerpVectors(q0, q1, k));
    camera.fov = lerp(f0 ?? 42, f1 ?? 42, k); camera.updateProjectionMatrix();
  };
}

// ===================================================================================
// ACTE I — Le monde éparpillé : des fragments d'information qui dérivent sans lien.
// ===================================================================================
const SC = {};
{
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#05070f', .012);
  const r = rng(11), N = 900;
  // Texture d'un « document » : quelques lignes de texte abstraites
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(160,180,220,.10)'; g.fillRect(0, 0, 256, 320); g.strokeStyle = 'rgba(190,205,240,.55)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 318);
  g.fillStyle = 'rgba(200,215,245,.75)'; g.fillRect(22, 26, 120, 12);
  for (let i = 0; i < 11; i++) { g.fillStyle = `rgba(190,205,240,${.25 + (i % 3) * .1})`; g.fillRect(22, 62 + i * 21, 210 - (i * 37 % 90), 6); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uT: { value: 0 }, uDissolve: { value: 0 } },
    vertexShader: `attribute vec4 aData; uniform float uT, uDissolve; varying vec2 vUv; varying float vA;
      void main(){ vUv = uv; float s = aData.x; vec3 p = position;
        float ang = uT * (.05 + .1 * aData.y) + s * 6.28;
        mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); p.xy = R * p.xy;
        vec4 w = instanceMatrix * vec4(p, 1.);
        w.xyz += vec3(sin(uT * .13 + s * 40.), cos(uT * .11 + s * 23.), 0.) * 1.6;
        w.xyz += normalize(w.xyz + vec3(.001)) * uDissolve * (6. + 30. * aData.z) * smoothstep(aData.w * .7, aData.w * .7 + .3, uDissolve);
        float flick = .55 + .45 * step(.15, fract(sin(floor(uT * 7. + s * 90.)) * 9137.));
        vA = flick * (1. - smoothstep(aData.w * .7, aData.w * .7 + .3, uDissolve));
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vA; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb * vA * .2, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 3), mat, N);
  const data = new Float32Array(N * 4), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const p = v3((r() - .5) * 90, (r() - .5) * 46, -r() * 160 + 20);
    e.set((r() - .5) * 1.2, (r() - .5) * 1.4, (r() - .5) * .6); q.setFromEuler(e);
    m4.compose(p, q, v3(1, 1, 1).multiplyScalar(.6 + r() * 1.1)); mesh.setMatrixAt(i, m4);
    data.set([r(), r(), r(), r()], i * 4);
  }
  mesh.geometry.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
  scene.add(mesh, makeStars(3000, 600, 3, 1.2, .35));
  // Liens qui tentent de se former puis se rompent
  const L = 60, lp = new Float32Array(L * 6);
  const lines = new THREE.LineSegments(geo({ position: [lp, 3] }), lineMaterial(SKY, .0));
  for (let i = 0; i < L; i++) { const a = v3((r() - .5) * 70, (r() - .5) * 36, -r() * 90), b = a.clone().add(v3((r() - .5) * 14, (r() - .5) * 8, (r() - .5) * 6)); lp.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); }
  scene.add(lines);
  const cam = cameraPath([[0, v3(0, 2, 46), v3(0, 0, -40), 46], [15.6, v3(3, -1, 4), v3(6, 0, -90), 40]]);
  SC.frag = { scene, update(t) {
    mat.uniforms.uT.value = t; mat.uniforms.uDissolve.value = smooth(12.2, 15.4, t);
    lines.material.opacity = .18 * (.5 + .5 * Math.sin(t * 9)) * smooth(3, 5, t) * (1 - smooth(9, 12, t));
    cam(t); bloom.strength = .6; bloom.radius = .45; bloom.threshold = .3;
  } };
  text('eyebrow', 'Aujourd’hui', 1.2, 6.4, { y: 900 });
}

// ===================================================================================
// ACTE II — Un point. Puis une galaxie de connaissances qui prend vie.
// ===================================================================================
const galaxy = new THREE.Group();
const NET = { nodes: [] };
{
  const r = rng(7), N = 170000, R = 70;
  const end = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x, y, z, c;
    if (i < 9000) { // Privé : un noyau rose, personnel, proche du centre
      const rr = Math.abs(gauss(r)) * 3.2; const th = r() * 6.283; const ph = Math.acos(2 * r() - 1);
      x = 13 + rr * Math.sin(ph) * Math.cos(th); y = rr * Math.cos(ph) * .7; z = 7 + rr * Math.sin(ph) * Math.sin(th);
      c = ROSE.clone().lerp(WHITE, r() * .35);
    } else {
      const arm = Math.floor(r() * 3), rad = R * Math.pow(r(), .62) + 2;
      const th = arm * 2.094 + Math.log(rad) * 2.1 + gauss(r) * (.32 - rad / R * .12);
      const sp = 1 + rad * .06;
      x = Math.cos(th) * rad + gauss(r) * sp; z = Math.sin(th) * rad + gauss(r) * sp; y = gauss(r) * (2.2 * Math.exp(-rad / 30) + .5);
      const k = rad / R; c = GOLD_HI.clone().lerp(WHITE, smooth(.05, .35, k)).lerp(SKY, smooth(.3, .9, k));
      if (r() < .08) c.lerp(VIOLET, .7);
    }
    end.set([x, y, z], i * 3); c.multiplyScalar(.55 + r() * .45); col.set([c.r, c.g, c.b], i * 3);
    size[i] = .35 + r() * r() * 1.6; seed[i] = r();
  }
  const mat = pointsMaterial({ uBirth: { value: 0 } },
    `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uScale, uTime, uAlpha, uBirth; varying vec3 vColor; varying float vA;
     void main(){ float rad = length(position.xz); float delay = clamp(rad / 75., 0., 1.) * .55 + aSeed * .2;
       float p = clamp((uBirth - delay) / .35, 0., 1.); float e = 1. - pow(1. - p, 3.);
       float a = (1. - e) * 3.2; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
       vec3 pos = position; pos.xz = R * pos.xz; pos = mix(pos * .015, pos, e);
       vec4 mv = modelViewMatrix * vec4(pos, 1.); gl_Position = projectionMatrix * mv;
       float tw = .75 + .25 * sin(uTime * 1.9 + aSeed * 71.);
       gl_PointSize = aSize * uScale * tw / -mv.z * (1. + (1. - e) * 1.5); vColor = aColor * .2 * (1. + (1. - e) * 1.5); vA = uAlpha * smoothstep(0., .15, p); }`);
  const pts = new THREE.Points(geo({ position: [end, 3], aColor: [col, 3], aSize: [size, 1], aSeed: [seed, 1] }), mat);
  pts.frustumCulled = false;
  galaxy.add(pts);
  // Réseau : des nœuds reliés à leurs voisins, des liens qui s'allument progressivement
  const M = 1500, nodes = [];
  for (let i = 0; i < M; i++) { const j = 9000 + Math.floor(r() * (N - 9000)); nodes.push(v3(end[j * 3], end[j * 3 + 1], end[j * 3 + 2])); }
  for (let i = 0; i < 160; i++) { const j = Math.floor(r() * 9000); nodes.push(v3(end[j * 3], end[j * 3 + 1], end[j * 3 + 2])); }
  NET.nodes = nodes;
  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    const best = [];
    for (let j = 0; j < nodes.length; j++) if (j !== i) { const d = nodes[i].distanceToSquared(nodes[j]); if (best.length < 3 || d < best[2][0]) { best.push([d, j]); best.sort((a, b) => a[0] - b[0]); best.length = Math.min(best.length, 3); } }
    for (const [, j] of best) if (j > i) links.push([i, j]);
  }
  const LP = new Float32Array(links.length * 6), LR = new Float32Array(links.length * 2), LC = new Float32Array(links.length * 6);
  links.forEach(([a, b], k) => {
    LP.set([nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z], k * 6);
    const rev = 23.5 + (nodes[a].length() / 75) * 5 + r() * 3; LR.set([rev, rev], k * 2);
    const c = (a >= 1500 ? ROSE : nodes[a].length() < 25 ? GOLD : SKY); LC.set([c.r, c.g, c.b, c.r, c.g, c.b], k * 6);
  });
  const lmat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aRev; attribute vec3 aColor; uniform float uT; varying float vA; varying vec3 vC; void main(){ vA = smoothstep(aRev, aRev + 1.2, uT); vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uAlpha; varying float vA; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * vA * uAlpha * .22, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lineObj = new THREE.LineSegments(geo({ position: [LP, 3], aRev: [LR, 1], aColor: [LC, 3] }), lmat); lineObj.frustumCulled = false;
  galaxy.add(lineObj);
  // Impulsions lumineuses qui circulent le long des liens
  const P = 2600, pa = new Float32Array(P * 3), pb = new Float32Array(P * 3), pd = new Float32Array(P * 3), pp = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) { const [a, b] = links[Math.floor(r() * links.length)]; pa.set(nodes[a].toArray(), i * 3); pb.set(nodes[b].toArray(), i * 3); pd.set([.25 + r() * .6, r(), 23.5 + r() * 9], i * 3); }
  const pmat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uScale: { value: H * .55 }, uAlpha: { value: 1 } },
    vertexShader: `attribute vec3 aB; attribute vec3 aD; uniform float uT, uScale; varying float vA;
      void main(){ float f = fract(uT * aD.x + aD.y); vec3 p = mix(position, aB, f); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = 2.6 * uScale / -mv.z; vA = smoothstep(aD.z, aD.z + 1.5, uT) * sin(f * 3.14159); }`,
    fragmentShader: `uniform float uAlpha; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .92, .72) * a * a * vA * uAlpha * .9, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pulses = new THREE.Points(geo({ position: [pa, 3], aB: [pb, 3], aD: [pd, 3] }), pmat); pulses.frustumCulled = false;
  galaxy.add(pulses);
  NET.update = (t, alpha = 1) => { mat.uniforms.uTime.value = t; lmat.uniforms.uT.value = t; pmat.uniforms.uT.value = t; mat.uniforms.uAlpha.value = alpha; lmat.uniforms.uAlpha.value = alpha; pmat.uniforms.uAlpha.value = alpha; };
  NET.setBirth = b => { mat.uniforms.uBirth.value = b; };
  NET.lineMat = lmat;
}
{
  const scene = new THREE.Scene();
  scene.add(makeStars(8000, 1400, 21, 1.4, .7));
  const point = glow(new THREE.Color('#EAF6FF'), 1, 1), halo = glow(new THREE.Color('#6FC2FF'), 1, .5);
  const pub = glow(SKY, 1, 0), priv = glow(ROSE, 1, 0);
  const core = new THREE.Group(); core.add(halo, point, pub, priv); scene.add(core);
  // Rayons d'étincelle au moment de l'apparition
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ vec2 p = vUv - .5; float h = exp(-abs(p.y) * 260.) * smoothstep(.5, 0., abs(p.x)); float v = exp(-abs(p.x) * 420.) * smoothstep(.5, 0., abs(p.y)) * .5; gl_FragColor = vec4(vec3(.75, .9, 1.) * (h + v) * uA, 1.); }' }));
  scene.add(flare);
  // Amas de connaissances publiques : les grandes familles du savoir
  const DOMAINS = ['Univers', 'Matière et énergie', 'Formes et calcul', 'Terre', 'Vivant', 'Humain et société', 'Économie', 'Technique', 'Arts et loisirs'];
  const domainNodes = DOMAINS.map((name, i) => {
    const th = i / DOMAINS.length * Math.PI * 2 + .4, rad = 30 + (i % 3) * 9;
    const p = v3(Math.cos(th) * rad, (i % 2 ? 2.5 : -2), Math.sin(th) * rad);
    const s = glow(SKY.clone().lerp(WHITE, .4), 3.2, 0); s.position.copy(p); scene.add(s);
    const lab = text('label', name, 37.4 + i * .42, 43.6, { fi: .5, fo: .5, drift: 0 }); lab.anchor = p.clone(); lab.dy = -26;
    return { s, a: 37.4 + i * .42 };
  });
  const cam = cameraPath([
    [15.6, v3(0, 0, 9), v3(0, 0, 0), 40], [21.5, v3(0, .6, 7.5), v3(0, 0, 0), 40],
    [23.0, v3(0, 3, 16), v3(0, 0, 0), 46], [28.5, v3(40, 60, 150), v3(0, 0, 0), 48],
    [36.4, v3(-95, 78, 130), v3(0, -4, 0), 46], [43.9, v3(-40, 60, 115), v3(0, -2, 0), 46],
  ]);
  SC.galaxy = { scene, update(t) {
    if (galaxy.parent !== scene) scene.add(galaxy);
    galaxy.scale.setScalar(1); galaxy.position.set(0, 0, 0);
    galaxy.rotation.y = t * .018;
    const birth = smooth(22.4, 30.5, t);
    NET.setBirth(birth); NET.update(t, 1); galaxy.visible = t > 22.3;
    // le point d'origine
    const on = smooth(16.5, 17.0, t), breathe = 1 + .06 * Math.sin(t * 2.2);
    point.scale.setScalar((.45 + 1.2 * smooth(16.5, 16.62, t) * (1 - smooth(16.62, 18, t))) * breathe * on);
    halo.scale.setScalar(2.6 * on * breathe * (1 + 1.2 * smooth(21.6, 23, t)));
    halo.material.opacity = .4 * on * (1 - .5 * smooth(28, 34, t));
    point.material.opacity = on;
    flare.scale.set(30, 30, 1); flare.material.uniforms.uA.value = .55 * smooth(16.5, 16.62, t) * (1 - smooth(16.62, 18.4, t)) + .45 * smooth(22.2, 22.5, t) * (1 - smooth(22.5, 24.5, t));
    flare.lookAt(camera.position);
    // séparation Public / Privé
    const sp = easeOut(smooth(20.6, 22.4, t)), fadeSplit = 1 - smooth(25, 29, t);
    pub.position.set(-1.6 * sp, .15 * sp, 0); priv.position.set(1.6 * sp, -.15 * sp, 0);
    pub.scale.setScalar(1.1 * sp); priv.scale.setScalar(.9 * sp);
    pub.material.opacity = sp * fadeSplit; priv.material.opacity = sp * fadeSplit;
    domainNodes.forEach(d => { d.s.material.opacity = .8 * win(t, d.a, 43.8, .4, .5); });
    cam(t);
    bloom.strength = .85 + .9 * smooth(22.2, 22.45, t) * (1 - smooth(22.5, 24, t)); bloom.radius = .5; bloom.threshold = .35;
  } };
  text('wordmark', 'ORBE', 25.4, 28.4, { fi: 1.0, fo: 1.0, drift: 0, track: .62 });
}

// ===================================================================================
// ACTE III-a — Gaia : le ciel réel, lu en direct.
// ===================================================================================
{
  const scene = new THREE.Scene();
  const r = rng(99), N = 230000, p = new Float32Array(N * 3), c = new Float32Array(N * 3), s = new Float32Array(N), e = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (r() - .5) * 900, band = gauss(r) * (22 + 10 * Math.sin(x * .01)), z = -r() * 600 + 120;
    const dust = Math.sin(x * .02 + band * .15) * .5 + .5;
    p.set([x, band + Math.sin(x * .006) * 18, z], i * 3);
    const col = WHITE.clone().lerp(r() < .55 ? GOLD_HI : SKY, r() * .6).multiplyScalar((.12 + .5 * r()) * (.4 + .6 * dust));
    c.set([col.r, col.g, col.b], i * 3); s[i] = .5 + r() * r() * 2.2; e[i] = r();
  }
  const mat = pointsMaterial(); const stars = new THREE.Points(geo({ position: [p, 3], aColor: [c, 3], aSize: [s, 1], aSeed: [e, 1] }), mat); stars.frustumCulled = false;
  scene.add(stars, makeStars(6000, 1600, 5, 1.2, .5));
  // Nébulosité diffuse
  for (let i = 0; i < 26; i++) { const g = glow(i % 3 ? SKY : VIOLET, 140 + r() * 160, .015 + r() * .02); g.position.set((r() - .5) * 800, (r() - .5) * 40, -r() * 400 - 60); scene.add(g); }
  const star = glow(GOLD_HI, 3, 0); star.position.set(30, 4, -40); scene.add(star);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.75, 96), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.copy(star.position); scene.add(ring);
  const cam = cameraPath([[44.0, v3(-120, 6, 60), v3(-40, 0, -60), 52], [49.6, v3(-10, 5, 30), v3(20, 3, -50), 46], [52.6, v3(22, 5, -10), v3(30, 4, -40), 40]]);
  const sources = [['ESA · Gaia DR3', 0, -1], ['Wikipédia', -1, .55], ['GeoNames', 1, .55]].map(([name, dx, dy], i) => {
    const it = text('tag', name, 50.0 + i * .3, 52.4, { fi: .45, fo: .4, drift: 6 }); it.anchor = star.position.clone().add(v3(dx * 7.5, dy * -6, 0)); return it;
  });
  void sources;
  SC.gaia = { scene, update(t) {
    mat.uniforms.uTime.value = t; cam(t); ring.lookAt(camera.position);
    star.material.opacity = smooth(49.4, 50.2, t); star.scale.setScalar(3 + .6 * Math.sin(t * 3));
    ring.material.opacity = .8 * smooth(49.8, 50.4, t); ring.scale.setScalar(1 + .04 * Math.sin(t * 2));
    bloom.strength = .8; bloom.radius = .5; bloom.threshold = .4;
  } };
  text('big-num', '1 811 709 771', 44.6, 49.6, { y: 470, fi: 1, fo: .7, drift: 14 });
  text('eyebrow', 'objets célestes · catalogue ESA Gaia DR3 · lus en direct', 45.3, 49.6, { y: 575, fi: 1, fo: .7, drift: 8 });
}

// ===================================================================================
// ACTE III-b — L'information s'organise : du chaos vers des orbites ordonnées.
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(5000, 1400, 41, 1.3, .55));
  const LEVELS = [['non vérifié', new THREE.Color('#9AA3BF')], ['probable', SKY], ['vérifié', MINT], ['contesté', new THREE.Color('#FFB454')], ['faux', new THREE.Color('#FF6B7A')]];
  const r = rng(5), N = 9000, chaos = new Float32Array(N * 3), order = new Float32Array(N * 4), col = new Float32Array(N * 3), s = new Float32Array(N), e = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1, th = r() * 6.283, rr = 18 + r() * 40;
    chaos.set([rr * Math.sqrt(1 - u * u) * Math.cos(th), rr * u * .6, rr * Math.sqrt(1 - u * u) * Math.sin(th)], i * 3);
    const lv = Math.min(4, Math.floor(Math.pow(r(), 1.6) * 5)); // davantage d'éléments sur les premiers niveaux
    order.set([lv, r() * 6.283, (r() - .5) * .9, r()], i * 4);
    const cc = LEVELS[lv][1].clone().multiplyScalar(.75 + r() * .35); col.set([cc.r, cc.g, cc.b], i * 3); s[i] = .9 + r() * 1.6; e[i] = r();
  }
  const mat = pointsMaterial({ uOrder: { value: 0 } },
    `attribute vec3 aColor; attribute float aSize; attribute float aSeed; attribute vec4 aOrd; uniform float uScale, uTime, uAlpha, uOrder; varying vec3 vColor; varying float vA;
     void main(){ float lv = aOrd.x; float rad = 7. + lv * 4.6; float tilt = (lv - 2.) * .22;
       float ang = aOrd.y + uTime * (.5 / (1. + lv * .5));
       vec3 o = vec3(cos(ang) * rad, aOrd.z + sin(ang) * rad * tilt, sin(ang) * rad);
       vec3 c = position + vec3(sin(uTime * .7 + aSeed * 40.), cos(uTime * .5 + aSeed * 17.), sin(uTime * .6 + aSeed * 9.)) * 3.;
       float k = smoothstep(aOrd.w * .6, aOrd.w * .6 + .4, uOrder); k = k * k * (3. - 2. * k);
       vec4 mv = modelViewMatrix * vec4(mix(c, o, k), 1.); gl_Position = projectionMatrix * mv;
       gl_PointSize = aSize * uScale / -mv.z; vColor = mix(vec3(.55, .6, .75), aColor, k); vA = uAlpha; }`);
  const pts = new THREE.Points(geo({ position: [chaos, 3], aOrd: [order, 4], aColor: [col, 3], aSize: [s, 1], aSeed: [e, 1] }), mat); pts.frustumCulled = false;
  const center = glow(GOLD_HI, 3, .9), centerHalo = glow(GOLD, 10, .18);
  const orbits = LEVELS.map(([, c], lv) => {
    const rad = 7 + lv * 4.6, pts2 = [];
    for (let k = 0; k <= 128; k++) { const a = k / 128 * 6.283; pts2.push(v3(Math.cos(a) * rad, Math.sin(a) * rad * (lv - 2) * .22, Math.sin(a) * rad)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMaterial(c, 0)); scene.add(l); return l;
  });
  scene.add(pts, center, centerHalo);
  const cam = cameraPath([[52.6, v3(0, 30, 70), v3(0, 0, 0), 46], [60.2, v3(22, 44, 40), v3(0, -1, 0), 44]]);
  SC.struct = { scene, update(t) {
    mat.uniforms.uTime.value = t; const o = smooth(53.2, 57.5, t); mat.uniforms.uOrder.value = o;
    orbits.forEach((l, i) => { l.material.opacity = .2 * smooth(55.2 + i * .25, 56.4 + i * .25, t); });
    center.scale.setScalar(2.4 + 1 * o + .3 * Math.sin(t * 3)); cam(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('legend', LEVELS.map(([n, c]) => `<span><i style="color:${'#' + c.getHexString()};background:${'#' + c.getHexString()}"></i>${n}</span>`).join(''), 56.2, 60.0, { y: 960, fi: .8, fo: .5, drift: 8 });
}

// ===================================================================================
// ACTE III-c — Plusieurs intelligences qui collaborent.
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 61, 1.3, .6));
  const mk = (g, c) => {
    const grp = new THREE.Group();
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMaterial(c, 0));
    const inner = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const h = glow(c, 7, 0); grp.add(inner, wire, h); scene.add(grp); return { grp, wire, inner, h, c };
  };
  const E = [mk(new THREE.IcosahedronGeometry(3, 0), SKY), mk(new THREE.OctahedronGeometry(3.4, 0), GOLD), mk(new THREE.DodecahedronGeometry(3, 0), VIOLET)];
  const P = [v3(-16, 6, 0), v3(16, 6, 0), v3(0, -12, 0)];
  E.forEach((en, i) => en.grp.position.copy(P[i]));
  // Faisceaux entre les intelligences
  const beams = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([P[a], P[b]]), lineMaterial(WHITE, 0)); scene.add(l); return l;
  });
  // Particules qui circulent sur les faisceaux (le travail transmis)
  const r = rng(77), F = 900, fa = new Float32Array(F * 3), fb = new Float32Array(F * 3), fd = new Float32Array(F * 3);
  for (let i = 0; i < F; i++) { const k = i % 3; fa.set(P[k].toArray(), i * 3); fb.set(P[(k + 1) % 3].toArray(), i * 3); fd.set([.25 + r() * .35, r(), k], i * 3); }
  const fmat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uScale: { value: H * .55 }, uA: { value: new THREE.Vector3() } },
    vertexShader: `attribute vec3 aB; attribute vec3 aD; uniform float uT, uScale; uniform vec3 uA; varying float vA;
      void main(){ float f = fract(uT * aD.x + aD.y); vec3 p = mix(position, aB, f) + vec3(0., sin(f * 3.14) * 1.5, 0.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = 1.8 * uScale / -mv.z; float on = aD.z < .5 ? uA.x : aD.z < 1.5 ? uA.y : uA.z; vA = on * sin(f * 3.14159); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .94, .8) * a * a * vA * .32, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const flow = new THREE.Points(geo({ position: [fa, 3], aB: [fb, 3], aD: [fd, 3] }), fmat); flow.frustumCulled = false; scene.add(flow);
  // L'exécutante construit une structure : un arbre de nœuds qui pousse
  const tree = [], tp = [];
  (function grow(p, dir, depth, t0) {
    if (depth > 5) return;
    const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const d = dir.clone().applyAxisAngle(v3(0, 0, 1), (i - (n - 1) / 2) * .7 + (r() - .5) * .3).applyAxisAngle(v3(0, 1, 0), (r() - .5) * 1.2).normalize();
      const q = p.clone().add(d.multiplyScalar(4.2 - depth * .45)); tree.push([p, q, t0 + depth * .28 + r() * .12]); grow(q, d, depth + 1, t0);
    }
  })(P[1].clone().add(v3(2.5, 3.5, 0)), v3(.4, 1, 0).normalize(), 0, 69.1);
  const TP = new Float32Array(tree.length * 6), TR = new Float32Array(tree.length * 2);
  tree.forEach(([a, b, rev], k) => { TP.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6); TR.set([rev, rev], k * 2); tp.push([b, rev]); });
  const tmat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uFade: { value: 1 } },
    vertexShader: `attribute float aRev; uniform float uT; varying float vA; void main(){ vA = smoothstep(aRev, aRev + .3, uT); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uFade; varying float vA; void main(){ gl_FragColor = vec4(vec3(1., .82, .45) * vA * uFade * .6, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const treeObj = new THREE.LineSegments(geo({ position: [TP, 3], aRev: [TR, 1] }), tmat); scene.add(treeObj);
  const leaves = tp.map(([p, rev]) => { const g = glow(GOLD_HI, .9, 0); g.position.copy(p); scene.add(g); return [g, rev]; });
  // La créatrice d'images : une image qui émerge du bruit
  const img = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uD: { value: 0 }, uA: { value: 0 } },
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT, uD, uA; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 6; i++){ v += a * n(p); p *= 2.03; a *= .5; } return v; }
      void main(){ vec2 p = vUv * vec2(16., 9.) / 3.;
        float q = fbm(p + fbm(p + uT * .05) * 1.8);
        vec3 a = mix(vec3(.04, .05, .16), vec3(.25, .45, .95), smoothstep(.25, .7, q));
        a = mix(a, vec3(1., .78, .4), smoothstep(.62, .9, q)); a = mix(a, vec3(.95, .45, .6), smoothstep(.55, .8, fbm(p * 1.7 - 3.)) * .45);
        float stars = step(.996, h(floor(vUv * vec2(640., 360.)))) * smoothstep(.4, .9, q);
        a += stars;
        vec3 noise = vec3(h(floor(vUv * vec2(320., 180.)) + floor(uT * 24.)));
        float d = smoothstep(0., 1., uD); vec3 c = mix(noise * .6, a, d);
        float edge = smoothstep(0., .02, vUv.x) * smoothstep(1., .98, vUv.x) * smoothstep(0., .03, vUv.y) * smoothstep(1., .97, vUv.y);
        gl_FragColor = vec4(c * edge, uA * edge); }` }));
  img.position.set(0, -3, 6); scene.add(img);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(16.3, 9.3)), lineMaterial(VIOLET, 0)); frame.position.copy(img.position); scene.add(frame);
  // Une petite carte : les intelligences y ajoutent des connaissances (en or)
  const mapG = new THREE.Group(); scene.add(mapG); mapG.position.set(0, -2, -18);
  const mp = [], mpos = new Float32Array(420 * 3), mcol = new Float32Array(420 * 3), msz = new Float32Array(420), mse = new Float32Array(420);
  for (let i = 0; i < 420; i++) { const a = r() * 6.283, rr = 4 + Math.pow(r(), .7) * 28; const p = v3(Math.cos(a) * rr, gauss(r) * 1.2, Math.sin(a) * rr * .55); mp.push(p); mpos.set(p.toArray(), i * 3); const c = SKY.clone().lerp(WHITE, r() * .4).multiplyScalar(1.2); mcol.set([c.r, c.g, c.b], i * 3); msz[i] = 2 + r() * 2; mse[i] = r(); }
  const mmat = pointsMaterial(); mmat.uniforms.uAlpha.value = 0;
  mapG.add(new THREE.Points(geo({ position: [mpos, 3], aColor: [mcol, 3], aSize: [msz, 1], aSeed: [mse, 1] }), mmat));
  const added = [v3(-9, 1, 3), v3(6, .5, -4), v3(14, 1.5, 6), v3(-3, -.5, -8), v3(2, 1, 9)].map((p, i) => {
    const g = glow(GOLD_HI, 2.2, 0); g.position.copy(p); mapG.add(g);
    const from = P[i % 3].clone().sub(mapG.position); return { g, p, from, t0: 74.6 + i * .5 };
  });
  const tag = text('tag', 'Ajouté par l’IA · visible et vérifiable', 76.2, 79.9, { fi: .5, fo: .5, drift: 6 }); tag.anchor = v3(14, 5.5, 6).add(mapG.position);
  const cam = cameraPath([
    [60.2, v3(0, 2, 70), v3(0, 0, 0), 44], [64.8, v3(0, 0, 56), v3(0, 0, 0), 44],
    [68.8, v3(-8, 4, 48), v3(-6, 2, 0), 44], [70.9, v3(22, 15, 50), v3(16, 13, 0), 44],
    [73.6, v3(2, -2, 32), v3(0, -3, 6), 44], [76.0, v3(0, 26, 30), v3(0, -3, -16), 46], [80.3, v3(-14, 18, 20), v3(2, -2, -18), 48],
  ]);
  SC.ai = { scene, update(t) {
    const ons = [smooth(60.6, 61.4, t), smooth(61.4, 62.2, t), smooth(62.2, 63.0, t)];
    E.forEach((en, i) => {
      en.grp.rotation.set(t * .3 + i, t * .45 + i * 2, 0);
      const active = [win(t, 65.0, 69.0, .4, .6), win(t, 69.0, 71.0, .3, .5), win(t, 71.0, 73.8, .3, .6)][i];
      en.wire.material.opacity = ons[i] * (.75 + .25 * active); en.inner.material.opacity = ons[i] * (.07 + .2 * active);
      en.h.material.opacity = ons[i] * (.25 + .4 * active); en.h.scale.setScalar(7 + 4 * active);
    });
    const recede = 1 - .75 * smooth(74.0, 75.6, t);
    beams.forEach((b, i) => { b.material.opacity = .22 * smooth(62.6 + i * .3, 63.6 + i * .3, t) * recede; });
    fmat.uniforms.uT.value = t; fmat.uniforms.uA.value.set(smooth(63.4, 64.5, t) * recede, smooth(69, 69.6, t) * recede, smooth(71, 71.6, t) * recede);
    tmat.uniforms.uT.value = t; tmat.uniforms.uFade.value = 1 - smooth(73.5, 74.6, t) * .7;
    leaves.forEach(([g, rev]) => { g.material.opacity = smooth(rev, rev + .3, t) * (1 - smooth(73.5, 75, t) * .7); });
    img.material.uniforms.uT.value = t; img.material.uniforms.uD.value = smooth(71.4, 73.4, t); img.material.uniforms.uA.value = win(t, 71.0, 75.4, .4, .8);
    frame.material.opacity = .7 * win(t, 71.0, 75.4, .4, .8);
    mmat.uniforms.uTime.value = t; mmat.uniforms.uAlpha.value = smooth(73.8, 75.2, t);
    added.forEach(a => { const k = easeOut(smooth(a.t0, a.t0 + 1.1, t)); a.g.position.lerpVectors(a.from, a.p, k); a.g.material.opacity = smooth(a.t0, a.t0 + .2, t); a.g.scale.setScalar(2.2 + .6 * Math.sin(t * 4 + a.t0)); });
    cam(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  // La question devient une demande structurée (les rubriques réelles de la reformulation d'ORBE)
  const q = 'Comment naissent les étoiles ?';
  const qEl = text('question', '', 64.9, 67.6, { y: 860, fi: .3, fo: .5, drift: 0 });
  qEl.type = { from: 65.0, to: 66.2, text: q };
  const blocks = [['Objectif', 'Expliquer la formation des étoiles'], ['Contexte', 'Pour un public curieux, sans prérequis'], ['Contraintes', 'Sources fiables, étapes dans l’ordre'], ['Format', 'Explication structurée et illustrée']];
  blocks.forEach(([h, b], i) => text('block', `<b>${h}</b>${b}`, 67.0 + i * .22, 69.2, { x: 330 + i * 420, y: 870, fi: .35, fo: .5, drift: 18 }));
  SC.ai.typing = qEl;
}

// ===================================================================================
// ACTE III-d — Ce qui est privé reste privé.
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(5000, 1400, 81, 1.2, .5));
  const core = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 64), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uT; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 2.2);
      vec3 c = mix(vec3(.55, .12, .22), vec3(1., .55, .66), f) + vec3(1., .8, .85) * pow(f, 6.) * 1.5; c *= .8 + .2 * sin(uT * 2. + vN.y * 6.); gl_FragColor = vec4(c, 1.); }` }));
  const coreGlow = glow(ROSE, 22, .2); scene.add(core, coreGlow);
  // Bouclier : une coque géodésique dont les facettes viennent s'assembler
  const ico = new THREE.IcosahedronGeometry(11, 2); const pos = ico.attributes.position; const cnt = pos.count;
  const cen = new Float32Array(cnt * 3), rnd = new Float32Array(cnt);
  const r = rng(13);
  for (let i = 0; i < cnt; i += 3) {
    const c = v3(0, 0, 0); for (let k = 0; k < 3; k++) c.add(v3(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k))); c.divideScalar(3);
    const rv = r(); for (let k = 0; k < 3; k++) { cen.set(c.toArray(), (i + k) * 3); rnd[i + k] = rv; }
  }
  ico.setAttribute('aC', new THREE.BufferAttribute(cen, 3)); ico.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
  const shellMat = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uT: { value: 0 }, uPulse: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aC; attribute float aR; uniform float uK, uT; varying float vA; varying vec3 vB; varying vec3 vN; varying vec3 vV;
      void main(){ float k = smoothstep(aR * .55, aR * .55 + .45, uK); vec3 p = position - aC; p *= .92; vec3 dir = normalize(aC);
        vec3 c = aC + dir * (1. - k) * (22. + aR * 30.); float a = (1. - k) * 4. * (aR - .5); mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a)); p.xy = R * p.xy;
        vec3 w = c + p; vec4 mv = modelViewMatrix * vec4(w, 1.); gl_Position = projectionMatrix * mv; vA = k; vN = normalize(normalMatrix * dir); vV = normalize(-mv.xyz);
        int id = int(mod(float(gl_VertexID), 3.)); vB = vec3(id == 0, id == 1, id == 2); }`,
    fragmentShader: `uniform float uPulse; varying float vA; varying vec3 vB; varying vec3 vN; varying vec3 vV; void main(){ float e = min(min(vB.x, vB.y), vB.z); float edge = smoothstep(.05, 0., e);
      float f = pow(1. - abs(dot(vN, vV)), 2.); vec3 c = vec3(1., .82, .55) * edge * (.55 + uPulse * 1.5) + vec3(1., .55, .7) * f * .08; gl_FragColor = vec4(c * vA, 1.); }` });
  const shell = new THREE.Mesh(ico, shellMat); scene.add(shell);
  // Flux extérieurs : ils approchent et sont déviés par le bouclier
  const N = 4200, dir = new Float32Array(N * 3), dat = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const u = r() * 2 - 1, th = r() * 6.283; dir.set([Math.sqrt(1 - u * u) * Math.cos(th), u * .8, Math.sqrt(1 - u * u) * Math.sin(th)], i * 3); dat.set([.12 + r() * .15, r(), r()], i * 3); }
  const smat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 }, uScale: { value: H * .55 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aD; uniform float uT, uScale; varying float vA;
      void main(){ vec3 d = normalize(position); float s = fract(uT * aD.x + aD.y); vec3 tng = normalize(cross(d, vec3(0., 1., .2)));
        vec3 p = s < .5 ? d * mix(70., 12.6, s * 2.) : normalize(d + tng * (1.2 + aD.z)) * mix(12.6, 80., (s - .5) * 2.);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = 1.7 * uScale / -mv.z; vA = sin(s * 3.14159); }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(.62, .82, 1.) * a * a * vA * uA * .55, 1.); }` });
  const streams = new THREE.Points(geo({ position: [dir, 3], aD: [dat, 3] }), smat); streams.frustumCulled = false; scene.add(streams);
  const sweep = new THREE.Mesh(new THREE.TorusGeometry(13, .06, 8, 160), new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(sweep);
  const cam = cameraPath([[80.3, v3(0, 6, 34), v3(0, 0, 0), 46], [84.0, v3(-24, 10, 44), v3(0, 0, 0), 46], [88.6, v3(10, 4, 58), v3(0, 0, 0), 44]]);
  SC.privacy = { scene, update(t) {
    core.material.uniforms.uT.value = t; core.rotation.y = t * .2; coreGlow.material.opacity = .18 + .05 * Math.sin(t * 2.4);
    shellMat.uniforms.uK.value = smooth(82.0, 84.4, t); shell.rotation.y = t * .08; shell.rotation.x = .2;
    shellMat.uniforms.uPulse.value = Math.exp(-Math.max(0, t - 84.4) * 3) * smooth(84.2, 84.4, t) + .6 * Math.exp(-Math.max(0, t - 85.8) * 2.5) * smooth(85.6, 85.8, t);
    smat.uniforms.uT.value = t; smat.uniforms.uA.value = smooth(84.6, 86.0, t);
    const sw = smooth(85.6, 87.4, t); sweep.scale.setScalar(.6 + sw * .9); sweep.material.opacity = (1 - sw) * smooth(85.6, 85.8, t); sweep.rotation.x = Math.PI / 2 - .2;
    cam(t); bloom.strength = .9; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('eyebrow', 'Privé · chiffré · sur ton ordinateur', 83.0, 88.2, { y: 930, fi: .8, fo: .6, drift: 8 });
}

// ===================================================================================
// ACTE IV — La vision : connaissances, intelligences et outils réunis.
// ===================================================================================
let ENV = null; // enveloppe de la voix (une valeur par image) pour animer l'anneau vocal
{
  const scene = new THREE.Scene(); scene.add(makeStars(9000, 1600, 91, 1.4, .7));
  const sys = new THREE.Group(); scene.add(sys);
  const rings = [[44, .25, SKY], [60, -.18, GOLD], [76, .12, VIOLET]].map(([rad, tilt, c]) => {
    const pts = []; for (let k = 0; k <= 200; k++) { const a = k / 200 * 6.283; pts.push(v3(Math.cos(a) * rad, 0, Math.sin(a) * rad)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMaterial(c, 0)); const g = new THREE.Group(); g.rotation.x = tilt; g.add(l); sys.add(g);
    return { g, l, rad, c };
  });
  // Anneau 1 : services et applications (satellites)
  const sats = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.LineSegments(new THREE.EdgesGeometry(i % 2 ? new THREE.BoxGeometry(2.6, 2.6, 2.6) : new THREE.OctahedronGeometry(2, 0)), lineMaterial(SKY, 0));
    const h = glow(SKY, 5, 0); const g = new THREE.Group(); g.add(m, h); rings[0].g.add(g);
    const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(0, 0, 0), v3(0, 0, 0)]), lineMaterial(SKY, 0)); rings[0].g.add(beam);
    sats.push({ g, m, h, beam, a0: i / 9 * 6.283 });
  }
  // Anneau 2 : l'ordinateur (une fenêtre et un curseur qui agit)
  const comp = new THREE.Group(); rings[1].g.add(comp);
  comp.scale.setScalar(1.8);
  const screen = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(12, 7.5)), lineMaterial(GOLD, 0)); comp.add(screen);
  const bar = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(-6, 2.6, 0), v3(6, 2.6, 0)]), lineMaterial(GOLD, 0)); comp.add(bar);
  const cursor = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, -1.4), new THREE.Vector2(.38, -1.05), new THREE.Vector2(.95, -1.0)])), new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  comp.add(cursor);
  const clickRing = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 48), new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); comp.add(clickRing);
  const compBeam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(0, 0, 0), v3(0, 0, 0)]), lineMaterial(GOLD, 0)); rings[1].g.add(compBeam);
  // Anneau 3 : la voix (une onde circulaire qui suit la narration)
  const VN = 360, vpos = new Float32Array((VN + 1) * 3);
  const voice = new THREE.Line(geo({ position: [vpos, 3] }), lineMaterial(VIOLET, 0)); scene.add(voice);
  const voice2 = new THREE.Line(geo({ position: [new Float32Array((VN + 1) * 3), 3] }), lineMaterial(ROSE, 0)); scene.add(voice2);
  const cam = cameraPath([[88.6, v3(0, 50, 175), v3(0, 0, 0), 44], [93.0, v3(-60, 36, 125), v3(0, 0, 0), 44], [97.5, v3(48, 26, 110), v3(0, 0, 0), 44], [101.5, v3(0, 34, 150), v3(0, 0, 0), 46], [104.5, v3(0, 6, 22), v3(0, 0, 0), 60]]);
  SC.vision = { scene, update(t, frame) {
    if (galaxy.parent !== scene) scene.add(galaxy);
    NET.setBirth(1); const conv = smooth(101.2, 104.4, t);
    galaxy.scale.setScalar(.55 * (1 - conv * .97)); galaxy.rotation.y = t * .03 + conv * 4; NET.update(t, .8 + conv * .8);
    sys.rotation.y = t * .05 + conv * conv * 6; sys.scale.setScalar(1 - conv * .985);
    rings.forEach((rg, i) => { rg.l.material.opacity = .4 * smooth(89.4 + i * 2.6, 90.6 + i * 2.6, t) * (1 + conv); });
    const sOn = smooth(90.6, 91.6, t);
    sats.forEach((s, i) => {
      const a = s.a0 + t * .12; s.g.position.set(Math.cos(a) * 44, 0, Math.sin(a) * 44); s.g.rotation.set(t * .5 + i, t * .7, 0);
      s.m.material.opacity = sOn * .9; s.h.material.opacity = sOn * .3;
      const b = smooth(91.0 + i * .12, 91.6 + i * .12, t); s.beam.geometry.setFromPoints([v3(0, 0, 0), s.g.position.clone().multiplyScalar(b)]); s.beam.material.opacity = .45 * b;
    });
    const cOn = smooth(93.4, 94.2, t), ca = 2.2 + t * .08; comp.position.set(Math.cos(ca) * 60, 0, Math.sin(ca) * 60); comp.lookAt(camera.position.clone().applyMatrix4(rings[1].g.matrixWorld.clone().invert()));
    screen.material.opacity = cOn * .9; bar.material.opacity = cOn * .6; cursor.material.opacity = cOn;
    const ck = clamp((t - 94.0) / 2.4), cx = lerp(-3.5, 3.2, ease(clamp(ck * 1.4))), cy = lerp(-2.2, 1.4, ease(clamp(ck * 1.4)));
    cursor.position.set(cx, cy, .1); clickRing.position.set(3.2, 1.4, .1);
    const click = clamp((t - 95.1) / .7); clickRing.scale.setScalar(1 + click * 4); clickRing.material.opacity = cOn * (click > 0 && click < 1 ? 1 - click : 0);
    const cb = smooth(94.2, 94.9, t); compBeam.geometry.setFromPoints([v3(0, 0, 0), comp.position.clone().multiplyScalar(cb)]); compBeam.material.opacity = .5 * cb;
    const vOn = smooth(95.6, 96.4, t);
    const env = ENV ? (ENV[frame] ?? 0) : 0;
    for (const [line, base, ph, amp] of [[voice, 30, 0, 1], [voice2, 31.5, 1.7, .7]]) {
      const arr = line.geometry.attributes.position.array;
      for (let k = 0; k <= VN; k++) { const a = k / VN * 6.283; const rr = (base + Math.sin(a * 12 + t * 6 + ph) * env * 5 * amp + Math.sin(a * 31 - t * 9) * env * 2 * amp) * (1 - conv * .98); arr.set([Math.cos(a) * rr, Math.sin(a * 3 + t) * .6, Math.sin(a) * rr], k * 3); }
      line.geometry.attributes.position.needsUpdate = true; line.material.opacity = vOn * .85 * (1 + conv);
    }
    cam(t);
    bloom.strength = .85 + conv * .8; bloom.radius = .5; bloom.threshold = .35 - conv * .2;
  } };
  text('eyebrow', 'Services · applications', 90.8, 93.4, { y: 960, fi: .5, fo: .5, drift: 6 });
  text('eyebrow', 'Ordinateur · avec ton accord', 93.6, 95.8, { y: 960, fi: .5, fo: .5, drift: 6 });
  text('eyebrow', 'Voix', 96.0, 98.2, { y: 960, fi: .5, fo: .5, drift: 6 });
  text('eyebrow', 'Une ambition · en développement', 88.9, 97.6, { y: 120, fi: .8, fo: .8, drift: 0 });
  text('tagline', 'Connaissances&nbsp;&nbsp;·&nbsp;&nbsp;Intelligences&nbsp;&nbsp;·&nbsp;&nbsp;Outils', 99.0, 103.0, { y: 940, fi: .9, fo: .7, drift: 10 });
}

// ===================================================================================
// ACTE V — La révélation : l'emblème d'ORBE (sphère de points lumineux, deux orbites, lettres fines).
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(9000, 1600, 101, 1.2, .55));
  const logo = new THREE.Group(); scene.add(logo);
  // Sphère de points répartis régulièrement (spirale de Fibonacci), plus lumineuse sur le pourtour
  const NS = 5200, R = 5, r = rng(3);
  const sp = new Float32Array(NS * 3), from = new Float32Array(NS * 3), sd = new Float32Array(NS);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NS; i++) {
    const y = 1 - (i / (NS - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
    sp.set([Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R], i * 3);
    const u = r() * 2 - 1, a2 = r() * 6.283, d = 30 + r() * 60;
    from.set([Math.sqrt(1 - u * u) * Math.cos(a2) * d, u * d, Math.sin(a2) * Math.sqrt(1 - u * u) * d], i * 3); sd[i] = r();
  }
  const smat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uT: { value: 0 }, uScale: { value: H * .55 }, uA: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aFrom; attribute float aSeed; uniform float uK, uT, uScale; varying float vA; varying float vRim;
      void main(){ float k = smoothstep(aSeed * .5, aSeed * .5 + .5, uK); k = 1. - pow(1. - k, 3.);
        vec3 p = mix(aFrom, position, k); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        vec3 n = normalize(normalMatrix * position); float facing = dot(n, normalize(-mv.xyz));
        vRim = pow(1. - abs(facing), 2.6); vA = (facing > 0. ? 1. : .28) * (.55 + .45 * sin(uT * 2. + aSeed * 40.)) * smoothstep(0., .2, k);
        gl_PointSize = (1.0 + vRim * .5) * .21 * uScale / -mv.z; }`,
    fragmentShader: `uniform float uA; varying float vA; varying float vRim; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .05, d);
      vec3 c = mix(vec3(.32, .7, 1.), vec3(.82, .95, 1.), vRim); gl_FragColor = vec4(c * a * vA * uA * (1.05 + vRim * .7), 1.); }` });
  const sphere = new THREE.Points(geo({ position: [sp, 3], aFrom: [from, 3], aSeed: [sd, 1] }), smat); sphere.frustumCulled = false;
  const coreGlow = glow(new THREE.Color('#3E8BD6'), 14, 0), coreWarm = glow(new THREE.Color('#9A6BB8'), 5, 0), outer = glow(new THREE.Color('#2B5C9E'), 34, 0);
  logo.add(outer, coreGlow, coreWarm, sphere);
  // Deux orbites fines qui se croisent, chacune portant un petit point lumineux
  const orbits = [[9.4, 1.18, .16], [10.4, 1.27, -.13]].map(([rad, rx, rz]) => {
    const pts = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * 6.283; pts.push(v3(Math.cos(a) * rad, Math.sin(a) * rad, 0)); }
    const g = new THREE.Group(); g.rotation.set(rx, 0, rz);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMaterial(new THREE.Color('#BFD9F2'), 0));
    const dot = glow(new THREE.Color('#DDEEFF'), .6, 0); g.add(line, dot); logo.add(g); return { line, dot, rad };
  });
  // Poussière lumineuse
  const D = 3000, dp = new Float32Array(D * 3), dc = new Float32Array(D * 3), ds = new Float32Array(D), de = new Float32Array(D);
  for (let i = 0; i < D; i++) { dp.set([(r() - .5) * 120, (r() - .5) * 70, (r() - .5) * 60 - 10], i * 3); const c = SKY.clone().lerp(WHITE, r()).multiplyScalar(.25 + r() * .4); dc.set([c.r, c.g, c.b], i * 3); ds[i] = .5 + r() * 1.3; de[i] = r(); }
  const dmat = pointsMaterial(); const dust = new THREE.Points(geo({ position: [dp, 3], aColor: [dc, 3], aSize: [ds, 1], aSeed: [de, 1] }), dmat); scene.add(dust);
  const cam = cameraPath([[104.5, v3(0, 0, 12), v3(0, 0, 0), 52], [108.0, v3(0, .4, 23), v3(0, 0, 0), 40], [120, v3(0, .5, 25.5), v3(0, 0, 0), 40]]);
  SC.reveal = { scene, update(t) {
    const k = smooth(104.5, 107.2, t); smat.uniforms.uK.value = k; smat.uniforms.uT.value = t;
    sphere.rotation.y = t * .12; sphere.rotation.x = .18;
    const on = smooth(105.4, 107.0, t);
    coreGlow.material.opacity = .32 * on; coreWarm.material.opacity = .12 * on; outer.material.opacity = .08 * on;
    orbits.forEach((o, i) => { o.line.material.opacity = .32 * smooth(106.0 + i * .3, 107.4 + i * .3, t); const a = t * (.35 + i * .12) + i * 2.4; o.dot.position.set(Math.cos(a) * o.rad, Math.sin(a) * o.rad, 0); o.dot.material.opacity = smooth(106.4, 107.4, t); });
    dmat.uniforms.uTime.value = t; dust.position.y = -(t - 104.5) * .5;
    cam(t); bloom.strength = .75 + 1.4 * Math.exp(-Math.max(0, t - 104.5) * 1.6); bloom.radius = .55; bloom.threshold = .3;
  } };
  text('logo-word', 'ORBE', 106.4, 120, { y: 540, fi: 1.8, fo: 1.2, drift: 0, track: .8 });
  text('tagline', 'Tout ce que tu sais, en un seul point.', 108.4, 113.2, { y: 905, fi: .9, fo: .7, drift: 10 });
  text('eyebrow', 'Disponible le', 113.7, 120, { y: 868, fi: .9, fo: 1.2, drift: 8 });
  text('release', '1<sup>er</sup> décembre 2026', 114.0, 120, { y: 922, fi: .9, fo: 1.2, drift: 8 });
  text('cta', 'Découvre ORBE', 117.0, 120, { y: 990, fi: .8, fo: 1.0, drift: 6 });
}

// ---------- montage : quelle scène à quel instant, transitions ----------
const CUTS = [[0, 'frag'], [15.6, 'galaxy'], [44.0, 'gaia'], [52.6, 'struct'], [60.2, 'ai'], [80.3, 'privacy'], [88.6, 'vision'], [104.5, 'reveal']];
const DIPS = [44.0, 52.6, 60.2, 80.3, 88.6];
function fadeAt(t) {
  let f = 1 - smooth(0, 1.6, t);                         // ouverture au noir
  f = Math.max(f, smooth(13.8, 15.5, t) * (1 - smooth(15.6, 15.7, t)));
  for (const d of DIPS) f = Math.max(f, 1 - smooth(.0, .38, Math.abs(t - d)));
  f = Math.max(f, smooth(118.6, 120, t));                // fermeture au noir
  return f;
}
const flashAt = t => .9 * smooth(104.1, 104.5, t) * (1 - smooth(104.5, 105.4, t));

let typingCache = '';
window.renderAt = function (t, frame = Math.round(t * 30)) {
  let id = CUTS[0][1]; for (const [at, name] of CUTS) if (t >= at) id = name;
  const sc = SC[id];
  sc.update(t, frame);
  renderPass.scene = sc.scene;
  grade.uniforms.uFade.value = fadeAt(t); grade.uniforms.uFlash.value = flashAt(t); grade.uniforms.uTime.value = frame * .37;
  // effet machine à écrire pour la question
  const ty = SC.ai.typing; if (ty?.type) { const n = Math.round(ty.type.text.length * clamp((t - ty.type.from) / (ty.type.to - ty.type.from))); const s = ty.type.text.slice(0, n) + '<span class="caret"></span>'; if (s !== typingCache) { ty.el.innerHTML = s; typingCache = s; } }
  updateTexts(t);
  composer.render();
};
window.loadEnvelope = arr => { ENV = arr; };
window.sceneReady = document.fonts.ready.then(() => true);
