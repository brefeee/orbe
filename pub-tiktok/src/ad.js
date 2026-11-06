// Publicité TikTok 9:16 pour le jeu d'échecs.
// Rendu image par image, entièrement déterministe : renderFrame(t) dessine l'instant t
// sans dépendre des images précédentes (le rendu peut donc être parallélisé).
import * as THREE from './three.module.js';

const W = 1080, H = 1920, FPS = 30, DURATION = 28;
const CFG = Object.assign({
  gameName: '',          // nom du jeu affiché sur l'écran final (laisser vide pour ne rien afficher)
  platform: 'Roblox',
  commentWord: 'ÉCHEC',  // mot à commenter pour recevoir le nom du jeu (vide = rien)
}, window.AD_CONFIG || {});

const GOLD = '#FFC93C', CYAN = '#3FE0FF', RED = '#FF3B4E', GREEN = '#45F07A';

// ---------------------------------------------------------------- utilitaires
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const ei = t => t * t * t;
const back = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const DEG = Math.PI / 180;
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash(a * 57 + b * 131 + s * 17);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
function fbm(x, y, s) { let a = 0, f = 1, amp = .5; for (let i = 0; i < 5; i++) { a += amp * vnoise(x * f, y * f, s + i); f *= 2; amp *= .5; } return a; }
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(stops, t) {
  t = clamp(t) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)); const f = t - i;
  const a = hexToRgb(stops[i]), b = hexToRgb(stops[i + 1]);
  return `rgb(${Math.round(lerp(a[0], b[0], f))},${Math.round(lerp(a[1], b[1], f))},${Math.round(lerp(a[2], b[2], f))})`;
}

// ---------------------------------------------------------------- toiles
const out = document.getElementById('out');
const ctx = out.getContext('2d');

const glCanvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const smallCanvas = document.createElement('canvas');
const renderer2 = new THREE.WebGLRenderer({ canvas: smallCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer2.setPixelRatio(1); renderer2.setSize(W / 4, H / 4, false);
renderer2.toneMapping = THREE.ACESFilmicToneMapping; renderer2.toneMappingExposure = 1.1;
renderer2.outputColorSpace = THREE.SRGBColorSpace;
renderer2.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);

// ---------------------------------------------------------------- environnement (reflets)
function makeEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x0b0d14, side: THREE.BackSide })));
  const panel = (w, h, color, k, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  panel(10, 4, 0xffffff, 5, [0, 6.9, 1], [Math.PI / 2, 0, 0]);
  panel(3, 9, 0x40c8ff, 3.2, [-11.9, 2, -2], [0, Math.PI / 2, 0]);
  panel(3, 9, 0xff8a3d, 3.2, [11.9, 2, -2], [0, -Math.PI / 2, 0]);
  panel(14, 1.5, 0xffffff, 1.4, [0, 3, -11.9], [0, 0, 0]);
  panel(14, 1.2, 0xffe2b0, 1.0, [0, 1.5, 11.9], [0, Math.PI, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(env, 0.035).texture;
}
scene.environment = makeEnv();
scene.environmentIntensity = 0.75;

// ---------------------------------------------------------------- lumières
const hemi = new THREE.HemisphereLight(0x9fb4e0, 0x120c08, 0.35); scene.add(hemi);
const key = new THREE.SpotLight(0xfff0dc, 900, 60, Math.PI / 5.2, 0.55, 2);
key.position.set(4, 18, 9); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
key.shadow.camera.near = 6; key.shadow.camera.far = 40;
scene.add(key); scene.add(key.target);
const rimC = new THREE.PointLight(0x35c8ff, 140, 40, 2); rimC.position.set(-9, 5, -7); scene.add(rimC);
const rimW = new THREE.PointLight(0xff7a3a, 140, 40, 2); rimW.position.set(9, 5, -7); scene.add(rimW);
const redL = new THREE.PointLight(0xff2030, 0, 8, 2); scene.add(redL);
const orbitL = new THREE.PointLight(0xffd9a0, 0, 12, 2); scene.add(orbitL);

// ---------------------------------------------------------------- textures procédurales
function marbleTex(base, vein, seed) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  const b = hexToRgb(base), v = hexToRgb(vein);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const n = fbm(x / 110, y / 110, seed);
    let m = Math.abs(Math.sin((x / N * 2.2 + y / N * 1.3 + n * 3.2) * Math.PI));
    m = Math.pow(1 - m, 7) * 0.9 + (n - 0.5) * 0.25;
    const k = clamp(m), i = (y * N + x) * 4;
    img.data[i] = lerp(b[0], v[0], k); img.data[i + 1] = lerp(b[1], v[1], k); img.data[i + 2] = lerp(b[2], v[2], k); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function radialTex(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']], 64);

// ---------------------------------------------------------------- échiquier
const sqPos = (s, y = 0) => new THREE.Vector3((s.charCodeAt(0) - 97) - 3.5, y, 3.5 - (+s[1] - 1));
const boardGroup = new THREE.Group(); scene.add(boardGroup);
{
  const lightM = marbleTex('#f1e9d8', '#b9a98c', 3), darkM = marbleTex('#1f2c42', '#6d8fbd', 9);
  const sqGeo = new THREE.BoxGeometry(1, 0.1, 1);
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const isLight = (f + r) % 2 === 1;
    const map = (isLight ? lightM : darkM).clone(); map.needsUpdate = true;
    map.offset.set(hash(f * 8 + r), hash(f * 8 + r + 99)); map.repeat.set(0.35, 0.35); map.rotation = hash(f + r * 13) * 3;
    const mat = new THREE.MeshPhysicalMaterial({ map, roughness: isLight ? 0.3 : 0.22, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    const m = new THREE.Mesh(sqGeo, mat); m.position.set(f - 3.5, -0.05, 3.5 - r); m.receiveShadow = true; boardGroup.add(m);
  }
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x140e0b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffc35a, metalness: 1, roughness: 0.22 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.36, 9.3), frameMat); frame.position.y = -0.19; frame.receiveShadow = true; frame.castShadow = true; boardGroup.add(frame);
  const trim = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), goldMat); m.position.set(x, 0.0, z); boardGroup.add(m); };
  trim(8.16, 0.05, 0, 4.08); trim(8.16, 0.05, 0, -4.08); trim(0.05, 8.16, 4.08, 0); trim(0.05, 8.16, -4.08, 0);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(9.34, 0.04, 9.34), goldMat); lip.position.y = -0.37; boardGroup.add(lip);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.9, 8.4), frameMat); ped.position.y = -0.84; ped.receiveShadow = true; boardGroup.add(ped);
}
// sol à fondu radial (transparent sur les bords pour laisser voir le décor 2D)
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.35, metalness: 0.2, transparent: true, alphaMap: radialTex([[0, '#fff'], [0.55, '#888'], [1, '#000']]), depthWrite: false });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.29; floor.receiveShadow = true; scene.add(floor);

// ---------------------------------------------------------------- pièces
function lathe(pts) { return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 56); }
const BASE = [[0, 0], [0.38, 0], [0.40, 0.025], [0.40, 0.07], [0.37, 0.09], [0.33, 0.11], [0.33, 0.145], [0.29, 0.175]];
const GEO = {
  P: lathe([...BASE, [0.22, 0.2], [0.16, 0.26], [0.13, 0.36], [0.12, 0.44], [0.20, 0.47], [0.21, 0.5], [0.13, 0.53], [0.15, 0.565], [0.185, 0.62], [0.195, 0.67], [0.185, 0.72], [0.155, 0.77], [0.105, 0.805], [0.05, 0.825], [0, 0.83]]),
  R: lathe([...BASE, [0.27, 0.2], [0.24, 0.28], [0.215, 0.5], [0.21, 0.64], [0.25, 0.68], [0.29, 0.71], [0.29, 0.86], [0.18, 0.86], [0.18, 0.8], [0, 0.8]]),
  B: lathe([...BASE, [0.25, 0.2], [0.18, 0.28], [0.14, 0.45], [0.12, 0.62], [0.21, 0.65], [0.22, 0.68], [0.13, 0.71], [0.15, 0.74], [0.19, 0.82], [0.2, 0.9], [0.17, 0.99], [0.11, 1.07], [0.05, 1.11], [0.065, 1.13], [0.08, 1.16], [0.065, 1.19], [0, 1.2]]),
  Q: lathe([...BASE, [0.27, 0.2], [0.2, 0.3], [0.155, 0.55], [0.13, 0.8], [0.23, 0.84], [0.24, 0.87], [0.15, 0.9], [0.16, 0.94], [0.22, 1.1], [0.27, 1.2], [0.22, 1.22], [0.12, 1.24], [0.1, 1.28], [0, 1.29]]),
  K: lathe([...BASE, [0.28, 0.2], [0.21, 0.3], [0.165, 0.6], [0.145, 0.88], [0.24, 0.92], [0.25, 0.95], [0.16, 0.98], [0.17, 1.02], [0.23, 1.2], [0.245, 1.28], [0.18, 1.3], [0.1, 1.32], [0, 1.33]]),
  Nbase: lathe([...BASE, [0.28, 0.2], [0.27, 0.23], [0, 0.23]]),
  merlon: new THREE.BoxGeometry(0.12, 0.12, 0.1),
  ball: new THREE.SphereGeometry(0.045, 16, 12),
  top: new THREE.SphereGeometry(0.075, 20, 14),
  crossV: new THREE.BoxGeometry(0.08, 0.3, 0.08),
  crossH: new THREE.BoxGeometry(0.25, 0.08, 0.08),
};
{
  const s = new THREE.Shape();
  s.moveTo(-0.24, 0.0); s.lineTo(0.23, 0.0);
  s.quadraticCurveTo(0.21, 0.2, 0.06, 0.31);
  s.quadraticCurveTo(0.03, 0.39, 0.15, 0.44);
  s.lineTo(0.31, 0.45);
  s.quadraticCurveTo(0.4, 0.5, 0.35, 0.59);
  s.quadraticCurveTo(0.23, 0.71, 0.11, 0.78);
  s.lineTo(0.09, 0.9); s.lineTo(0.0, 0.81);
  s.quadraticCurveTo(-0.17, 0.77, -0.23, 0.58);
  s.quadraticCurveTo(-0.31, 0.3, -0.24, 0.0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 18 });
  g.translate(0, 0, -0.08); g.computeVertexNormals(); GEO.Nhead = g;
}
const MAT = {
  w: new THREE.MeshPhysicalMaterial({ color: 0xf6eedf, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
  b: new THREE.MeshPhysicalMaterial({ color: 0x14161d, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 }),
  g: new THREE.MeshPhysicalMaterial({ color: 0xffc457, metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
};
const PS = 1.12; // échelle des pièces
function makePiece(type, mat) {
  const g = new THREE.Group();
  const add = (geo, x = 0, y = 0, z = 0, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); };
  if (type === 'N') { add(GEO.Nbase); add(GEO.Nhead, 0, 0.2, 0); }
  else add(GEO[type]);
  if (type === 'R') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(GEO.merlon, Math.cos(a) * 0.235, 0.9, Math.sin(a) * 0.235, -a - Math.PI / 2); }
  if (type === 'Q') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(GEO.ball, Math.cos(a) * 0.235, 1.235, Math.sin(a) * 0.235); } add(GEO.top, 0, 1.34, 0); }
  if (type === 'K') { add(GEO.crossV, 0, 1.47, 0); add(GEO.crossH, 0, 1.5, 0); }
  g.scale.setScalar(PS);
  return g;
}
function buildSet(list, parent) {
  return list.map(([type, col, sq]) => {
    const obj = makePiece(type, MAT[col]);
    const rotY = type === 'N' ? (col === 'w' ? Math.PI / 2 + 0.75 : -Math.PI / 2 + 0.75) : hash(sq.charCodeAt(0) * 9 + +sq[1]) * 6.28;
    parent.add(obj);
    return { type, col, home: sq, obj, rotY };
  });
}
const expand = (type, col, sqs) => sqs.split(' ').map(s => [type, col, s]);
const GAME_SETUP = [
  ['K', 'w', 'g1'], ['Q', 'w', 'd1'], ['R', 'w', 'e1'], ['B', 'w', 'c1'], ['N', 'w', 'g5'], ...expand('P', 'w', 'a2 b2 c3 f2 g2 h2'),
  ['K', 'b', 'g8'], ['Q', 'b', 'a5'], ['R', 'b', 'a8'], ['R', 'b', 'f8'], ['B', 'b', 'e7'], ...expand('P', 'b', 'a7 b5 c6 g7 h7'),
];
const HERO_SETUP = [
  ...['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'].map((t, i) => [t, 'w', 'abcdefgh'[i] + '1']), ...expand('P', 'w', 'a2 b2 c2 d2 e2 f2 g2 h2'),
  ...['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'].map((t, i) => [t, 'b', 'abcdefgh'[i] + '8']), ...expand('P', 'b', 'a7 b7 c7 d7 e7 f7 g7 h7'),
];
const gameGroup = new THREE.Group(); scene.add(gameGroup);
const heroGroup = new THREE.Group(); scene.add(heroGroup);
const GAME = buildSet(GAME_SETUP, gameGroup);
const HERO = buildSet(HERO_SETUP, heroGroup);
for (const p of HERO) { p.obj.position.copy(sqPos(p.home)); p.obj.rotation.y = p.rotY; }

// trio doré (objets exclusifs)
const goldGroup = new THREE.Group(); scene.add(goldGroup);
{
  const pedMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0f16, roughness: 0.25, clearcoat: 1 });
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc457).multiplyScalar(2.2) });
  const items = [['Q', -1.3, 1.25, 0.0], ['K', 0, 1.55, 0.35], ['N', 1.3, 1.25, 0.0]];
  for (const [type, x, s, z] of items) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.36, 64), pedMat); ped.position.set(x, 0.18, z); ped.receiveShadow = true; ped.castShadow = true; goldGroup.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.625, 0.018, 12, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.36, z); goldGroup.add(ring);
    const p = makePiece(type, MAT.g); p.scale.setScalar(s); p.position.set(x, 0.36, z); p.userData.baseY = 0.36; p.userData.spin = type === 'N' ? -0.6 : 0; goldGroup.add(p);
  }
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x0a0b10, roughness: 0.3, metalness: 0.3, transparent: true, alphaMap: radialTex([[0, '#fff'], [0.4, '#999'], [1, '#000']]), depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true; goldGroup.add(disc);
}

// ---------------------------------------------------------------- effets 3D
const fxGroup = new THREE.Group(); scene.add(fxGroup);
const hlMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
const hlFrom = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hlMat(0xffc93c, 0.3)); hlFrom.rotation.x = -Math.PI / 2;
const hlTo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hlMat(0xffc93c, 0.45)); hlTo.rotation.x = -Math.PI / 2;
const checkGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(255,40,60,1)'], [0.35, 'rgba(255,30,50,0.55)'], [1, 'rgba(255,0,0,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
checkGlow.rotation.x = -Math.PI / 2;
const shock = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
shock.rotation.x = -Math.PI / 2;
fxGroup.add(hlFrom, hlTo, checkGlow, shock);

const MAXP = 900;
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.13, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
sparks.frustumCulled = false; scene.add(sparks);

// ---------------------------------------------------------------- chorégraphie de la partie
// Mat de Philidor (mat à l'étouffée) : 1.Db3+ Rh8 2.Cf7+ Rg8 3.Ch6++ Rh8 4.Dg8+!! Txg8 5.Cf7#
const MOVES = [
  { land: 3.5, from: 'd1', to: 'b3', check: true },
  { land: 4.0, from: 'g8', to: 'h8' },
  { land: 4.5, from: 'g5', to: 'f7', check: true },
  { land: 5.0, from: 'h8', to: 'g8' },
  { land: 5.5, from: 'f7', to: 'h6', check: true },
  { land: 6.0, from: 'g8', to: 'h8' },
  { land: 7.0, from: 'b3', to: 'g8', check: true, sac: true, dur: 0.62 },
  { land: 7.5, from: 'f8', to: 'g8', capture: true },
  { land: 8.0, from: 'h6', to: 'f7', mate: true, dur: 0.42 },
];
for (const m of MOVES) { m.dur = m.dur || 0.3; m.start = m.land - m.dur; }
const QUEEN_DROP = { t0: 1.72, t1: 2.0 };
const BURSTS = [
  { t: 2.0, pos: sqPos('d1', 0.05), n: 160, col: [1, 0.78, 0.4], v: 5.0 },
  { t: 7.0, pos: sqPos('g8', 0.6), n: 110, col: [1, 0.85, 0.5], v: 3.2 },
  { t: 7.5, pos: sqPos('g8', 0.6), n: 140, col: [0.9, 0.95, 1], v: 4.0 },
  { t: 8.0, pos: sqPos('h8', 0.4), n: 240, col: [1, 0.25, 0.15], v: 5.5 },
];

function applyGame(t) {
  for (const p of GAME) { p.obj.visible = true; p.obj.position.copy(sqPos(p.home)); p.obj.rotation.set(0, p.rotY, 0); p.obj.scale.setScalar(PS); p.sq = p.home; }
  const occ = {}; for (const p of GAME) occ[p.home] = p;
  // dame qui tombe du ciel (accroche)
  const q = occ['d1'];
  if (t < QUEEN_DROP.t1) {
    const k = inv(QUEEN_DROP.t0, QUEEN_DROP.t1, t);
    q.obj.position.y = lerp(9, 0, ei(k)); q.obj.visible = t >= QUEEN_DROP.t0;
  } else if (t < QUEEN_DROP.t1 + 0.25) {
    const k = inv(QUEEN_DROP.t1, QUEEN_DROP.t1 + 0.25, t);
    const sq = 1 - 0.22 * Math.sin(k * Math.PI) * (1 - k);
    q.obj.scale.set(PS * (2 - sq), PS * sq, PS * (2 - sq));
  }
  let last = null;
  for (const m of MOVES) {
    if (t < m.start) break;
    const p = occ[m.from], v = occ[m.to];
    const k = clamp((t - m.start) / m.dur), e = eio(k);
    const a = sqPos(m.from), b = sqPos(m.to);
    const dist = a.distanceTo(b);
    const arc = (p.type === 'N' ? 1.0 : 0.3 + dist * 0.07) * (m.sac ? 1.8 : 1);
    p.obj.position.copy(a.clone().lerp(b, e)); p.obj.position.y = Math.sin(Math.PI * k) * arc;
    if (m.sac) p.obj.rotation.y = p.rotY + e * Math.PI * 2;
    delete occ[m.from];
    if (k >= 1) {
      occ[m.to] = p; p.sq = m.to;
      if (v) { // pièce capturée : éjectée en tournoyant
        const dt = t - m.land;
        if (dt < 0.9) {
          v.obj.position.set(b.x + dt * 2.6, dt * 5.5 - 7 * dt * dt + 0.2, b.z - dt * 2.2);
          v.obj.rotation.set(dt * 9, v.rotY + dt * 6, dt * 5);
          v.obj.scale.setScalar(PS * (1 - eo(dt / 0.9)));
        } else v.obj.visible = false;
      }
    }
    last = m;
  }
  // le roi noir bascule après le mat
  const bk = GAME.find(p => p.type === 'K' && p.col === 'b');
  if (t > 8.25) {
    const a = eo(inv(8.25, 8.85, t)) * 1.42 + Math.sin(clamp((t - 8.85) * 9) * Math.PI) * 0.06 * (t > 8.85 ? 1 : 0);
    const P = 0.38 * PS; // pivot sur le bord avant du socle
    bk.obj.rotation.set(a, 0, 0);
    bk.obj.position.y = P * Math.sin(a);
    bk.obj.position.z += P * (1 - Math.cos(a));
  }
  return { last, occ, bk };
}

function updateSparks(t, extra) {
  const pos = sparkGeo.attributes.position.array, col = sparkGeo.attributes.color.array;
  let n = 0;
  const push = (x, y, z, r, g, b) => { if (n >= MAXP) return; pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z; col[n * 3] = r; col[n * 3 + 1] = g; col[n * 3 + 2] = b; n++; };
  for (let bi = 0; bi < BURSTS.length; bi++) {
    const B = BURSTS[bi], dt = t - B.t;
    if (dt < 0 || dt > 1.6) continue;
    for (let i = 0; i < B.n; i++) {
      const s = bi * 1000 + i, life = 0.5 + hash(s + 0.3) * 0.9;
      if (dt > life) continue;
      const th = hash(s) * Math.PI * 2, ph = hash(s + 0.7) * 0.5 * Math.PI, sp = B.v * (0.35 + 0.65 * hash(s + 0.1));
      const vx = Math.cos(th) * Math.cos(ph) * sp, vy = Math.sin(ph) * sp * 1.1, vz = Math.sin(th) * Math.cos(ph) * sp;
      const y = Math.max(0.03, B.pos.y + vy * dt - 4.5 * dt * dt);
      const f = Math.pow(1 - dt / life, 1.6) * 1.6;
      push(B.pos.x + vx * dt, y, B.pos.z + vz * dt, B.col[0] * f, B.col[1] * f, B.col[2] * f);
    }
  }
  if (extra) extra(push);
  for (let i = n; i < MAXP; i++) { pos[i * 3 + 1] = -100; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; }
  sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------- caméra
function setCam(target, R, pol, az, fov) {
  const tg = new THREE.Vector3(...target);
  camera.position.set(tg.x + R * Math.sin(pol * DEG) * Math.sin(az * DEG), tg.y + R * Math.cos(pol * DEG), tg.z + R * Math.sin(pol * DEG) * Math.cos(az * DEG));
  camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(tg);
}
function keyCam(t, keys) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const k = (b.ease || eio)(inv(a.t, b.t, t));
      return { tg: a.tg.map((v, j) => lerp(v, b.tg[j], k)), R: lerp(a.R, b.R, k), pol: lerp(a.pol, b.pol, k), az: lerp(a.az, b.az, k), fov: lerp(a.fov, b.fov, k) };
    }
  }
  return keys[keys.length - 1];
}
const GAME_POSE = { tg: [0, 0, 0.6], R: 17.2, pol: 33, az: -10, fov: 50 };
const CAMS = {
  hookA: [{ t: 0, tg: [2.5, 1.15, -3.5], R: 6.4, pol: 80, az: 18, fov: 40 }, { t: 1.72, tg: [2.5, 1.05, -3.5], R: 4.6, pol: 78, az: 4, fov: 40, ease: eo }],
  hookB: [{ t: 1.72, tg: [-0.5, 0.65, 3.5], R: 4.9, pol: 70, az: -30, fov: 42 }, { t: 2.78, tg: [-0.5, 0.6, 3.5], R: 4.2, pol: 68, az: -22, fov: 42, ease: eo },
  { t: 3.0, ...GAME_POSE }],
  game: [{ t: 3.0, ...GAME_POSE }, { t: 6.35, tg: [0.2, 0, 0.4], R: 16.6, pol: 31, az: 6, fov: 50, ease: x => x },
  { t: 7.15, tg: [2.0, 0.3, -2.6], R: 10.5, pol: 41, az: 14, fov: 50 },
  { t: 7.6, tg: [2.3, 0.35, -2.8], R: 9.6, pol: 43, az: 16, fov: 50, ease: x => x },
  { t: 8.0, tg: [3.2, 0.55, -3.25], R: 5.6, pol: 60, az: 24, fov: 50, ease: eo },
  { t: 9.0, tg: [3.2, 0.45, -3.25], R: 5.0, pol: 62, az: 34, fov: 50, ease: x => x }],
  excl: [{ t: 21, tg: [0, 1.55, 0.1], R: 8.4, pol: 78, az: -26, fov: 40 }, { t: 23, tg: [0, 1.45, 0.1], R: 7.0, pol: 80, az: 16, fov: 40, ease: eo }],
  cta: [{ t: 23, tg: [0, 0.5, 2.2], R: 6.5, pol: 75, az: -40, fov: 44 }, { t: 24.7, tg: [0, 0, 0.6], R: 16.5, pol: 40, az: -12, fov: 50 },
  { t: 28, tg: [0, 0, 0.6], R: 16.0, pol: 37, az: 8, fov: 50, ease: x => x }],
};
const applyCam = c => setCam(c.tg, c.R, c.pol, c.az, c.fov);
function project(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; }

// ---------------------------------------------------------------- découpage
const SCENES = [
  { id: 'hook', t0: 0, t1: 3 }, { id: 'game', t0: 3, t1: 9 }, { id: 'tour', t0: 9, t1: 11.5 }, { id: 'rank', t0: 11.5, t1: 13.5 },
  { id: 'live', t0: 13.5, t1: 15.5 }, { id: 'bots', t0: 15.5, t1: 18.5 }, { id: 'coins', t0: 18.5, t1: 21 }, { id: 'excl', t0: 21, t1: 23 }, { id: 'cta', t0: 23, t1: 28.01 },
];
const CUTS = [3, 9, 11.5, 13.5, 15.5, 18.5, 21, 23];
const SHAKES = [{ t: 2.0, a: 34 }, { t: 7.0, a: 10 }, { t: 7.5, a: 8 }, { t: 8.0, a: 30 }, { t: 10.8, a: 10 }, { t: 17.7, a: 30 }, { t: 23.0, a: 16 }, { t: 27.5, a: 12 }];

// ---------------------------------------------------------------- dessin 2D
const F = (size, w = 900) => `${w} ${size}px InterAd`;
function txt(s, x, y, size, o = {}) {
  ctx.save();
  ctx.globalAlpha *= (o.alpha ?? 1);
  ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  const sc = o.scale ?? 1; ctx.scale(sc, sc);
  ctx.font = o.font || F(size, o.w ?? 900); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = (o.ls ?? 0) + 'px';
  if (o.stroke !== false) {
    ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW ?? Math.max(5, size * 0.15); ctx.strokeStyle = o.stroke ?? 'rgba(0,0,0,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.06;
    ctx.strokeText(s, 0, 0);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }
  if (o.glow) { ctx.shadowColor = o.glowColor ?? o.color; ctx.shadowBlur = o.glow; }
  ctx.fillStyle = o.color ?? '#fff'; ctx.fillText(s, 0, 0);
  ctx.restore();
}
// Sous-titres façon TikTok : les mots apparaissent un par un avec un rebond.
// Syntaxe : *MOT* = mot surligné (couleur de la ligne `hl`), MOT|#hex = couleur imposée.
function caption(t, t0, t1, lines, y0, o = {}) {
  if (t < t0 || t > t1 + 0.2) return;
  let idx = 0, y = y0;
  const stagger = o.stagger ?? 0.075;
  for (const L of lines) {
    const size = L.size, wgt = L.w ?? 900; ctx.font = F(size, wgt); ctx.letterSpacing = '0px';
    const words = L.text.split(' ').map(raw => {
      let c = L.color ?? '#fff', hl = false, w = raw;
      if (w.includes('|')) { const [a, b] = w.split('|'); w = a; c = b; hl = true; }
      if (w.startsWith('*')) { w = w.replace(/\*/g, ''); c = L.hl ?? GOLD; hl = true; }
      return { w, c, hl, width: ctx.measureText(w).width };
    });
    const space = size * 0.27;
    const total = words.reduce((a, b) => a + b.width, 0) + space * (words.length - 1);
    const s = Math.min(1, (o.maxW ?? 900) / total);
    let x = (o.cx ?? 540) - total * s / 2;
    for (const wd of words) {
      const ta = t0 + (L.delay ?? 0) + idx * stagger;
      const k = clamp((t - ta) / 0.22);
      if (k > 0) {
        let sc = lerp(1.9, 1, back(k)), alpha = clamp(k * 4);
        if (t > t1) { const e = clamp((t - t1) / 0.16); alpha *= 1 - e; sc *= 1 + e * 0.3; }
        txt(wd.w, x + wd.width * s / 2, y, size * s, { color: wd.c, scale: sc, alpha, w: wgt, glow: wd.hl ? 34 : 0 });
      }
      x += (wd.width + space) * s; idx++;
    }
    y += size * s * 1.12 + (L.gap ?? 0);
  }
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function glass(x, y, w, h, r, o = {}) {
  ctx.save();
  rr(x, y, w, h, r);
  ctx.fillStyle = o.fill ?? 'rgba(10,14,26,0.72)'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.4, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = o.lw ?? 2; ctx.strokeStyle = o.stroke ?? 'rgba(255,255,255,0.16)'; ctx.stroke();
  ctx.restore();
}
const PAL = [['#ff4d6d', '#8b1e3f'], ['#7b5cff', '#2d1b7a'], ['#2ec4b6', '#0d5c56'], ['#ff9f1c', '#8a4500'], ['#3a86ff', '#12347a'], ['#8ac926', '#3c5a0c'], ['#f15bb5', '#6d1450'], ['#00bbf9', '#004e6b']];
function avatar(x, y, r, seed, letter, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(x, y); const sc = o.scale ?? 1; ctx.scale(sc, sc);
  if (o.ring) { ctx.shadowColor = o.ring; ctx.shadowBlur = o.glow ?? 30; }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  const [a, b] = PAL[seed % PAL.length];
  const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = o.ring ? r * 0.14 : r * 0.07; ctx.strokeStyle = o.ring ?? 'rgba(255,255,255,0.55)'; ctx.stroke();
  ctx.font = `${r * 1.05}px "DejaVu Sans"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(letter, 0, r * 0.06);
  ctx.restore();
}
function trophy(x, y, s, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-60, -70, 60, 70); g.addColorStop(0, '#fff1a8'); g.addColorStop(0.45, '#ffc93c'); g.addColorStop(1, '#b86e00');
  ctx.fillStyle = g; ctx.strokeStyle = g; ctx.shadowColor = '#ffb400'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(-52, -62); ctx.lineTo(52, -62); ctx.quadraticCurveTo(54, 14, 0, 28); ctx.quadraticCurveTo(-54, 14, -52, -62); ctx.fill();
  ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(-52, -34, 22, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(52, -34, 22, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.fillRect(-9, 24, 18, 26); rr(-38, 48, 76, 18, 6); ctx.fill();
  ctx.restore();
}
function shield(x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(40, -36); ctx.quadraticCurveTo(42, 22, 0, 52); ctx.quadraticCurveTo(-42, 22, -40, -36); ctx.closePath();
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 7; ctx.strokeStyle = '#06222b'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-3, 14); ctx.lineTo(19, -12); ctx.stroke();
  ctx.restore();
}
function coin(x, y, r, sx = 1, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y);
  const s = Math.max(0.08, Math.abs(sx));
  ctx.scale(s, 1);
  ctx.beginPath(); ctx.arc(r * (1 - s) * 0.25 / s, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#9a5a00'; ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
  g.addColorStop(0, '#fff6c2'); g.addColorStop(0.45, '#ffcc3d'); g.addColorStop(1, '#c27400');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = '#a86400'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2); ctx.lineWidth = r * 0.05; ctx.strokeStyle = 'rgba(255,240,170,0.9)'; ctx.stroke();
  ctx.font = `${r * 0.95}px "DejaVu Sans"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,245,200,0.7)'; ctx.fillText('♚', -r * 0.03, r * 0.02);
  ctx.fillStyle = '#b36a00'; ctx.fillText('♚', 0, r * 0.05);
  ctx.restore();
}
function star4(x, y, r, alpha, color = '#fff') {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = r;
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill();
  ctx.restore();
}
function bgGradient(c1, c2, c3) {
  const g = ctx.createRadialGradient(540, 900, 50, 540, 960, 1300);
  g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, c3);
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
}
function embers(t, color, n = 46) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = 60 + hash(i + 3) * 160, x = hash(i) * W + Math.sin(t * (0.6 + hash(i + 9)) + i) * 30;
    const y = H + 60 - ((t * sp + hash(i + 5) * (H + 120)) % (H + 120));
    const r = 2 + hash(i + 7) * 5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35 + 0.4 * hash(i + 11); ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  ctx.restore();
}
function topShade(a = 0.6, h = 760) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, h + 100);
}
function vignette(strength = 0.6, color = '0,0,0') {
  const g = ctx.createRadialGradient(540, 960, 520, 540, 960, 1250);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function draw3D(cnv, blur = 0) {
  if (blur) {
    ctx.save(); ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(cnv, -60, -107, W + 120, H + 214);
    ctx.restore();
  } else ctx.drawImage(cnv, 0, 0, W, H);
}

// ---------------------------------------------------------------- scènes
const NAMES = ['NeoKnight', 'Zugzwang', 'TOI', 'LunaRook', 'Gambit42', 'Mat_en_3', 'Pion_Fou', 'Bastion'];
const LETTERS = ['♞', '♜', '♚', '♝', '♛', '♟', '♟', '♜'];

function sceneHook(t) {
  bgGradient('#1a1030', '#090812', '#020205');
  const A = t < QUEEN_DROP.t0;
  gameGroup.visible = true; heroGroup.visible = false; goldGroup.visible = false; boardGroup.visible = true; floor.visible = true;
  const st = applyGame(t);
  hlFrom.visible = hlTo.visible = false; checkGlow.visible = false;
  // onde de choc de la dame
  const ds = t - QUEEN_DROP.t1;
  shock.visible = ds >= 0 && ds < 0.6;
  if (shock.visible) { const p = sqPos('d1', 0.03); shock.position.copy(p); shock.scale.setScalar(0.3 + eo(ds / 0.6) * 4.5); shock.material.opacity = (1 - ds / 0.6) * 0.9; }
  redL.intensity = 0;
  key.intensity = A ? 650 : 900;
  if (A) applyCam(keyCam(t, CAMS.hookA)); else applyCam(keyCam(t, CAMS.hookB));
  updateSparks(t);
  renderer.render(scene, camera); draw3D(glCanvas);
  topShade(0.7, 820);
  // textes
  caption(t, 0.12, 1.62, [{ text: 'TU TE CROIS', size: 96 }, { text: '*IMBATTABLE*', size: 150, delay: 0.45 }, { text: 'AUX ÉCHECS ?', size: 96, delay: 0.75 }], 330, { stagger: 0.12 });
  if (t > 2.05) {
    const k = clamp((t - 2.05) / 0.2), e = t > 2.78 ? clamp((t - 2.78) / 0.15) : 0;
    txt('PROUVE-LE.', 540, 420, 138, { color: '#fff', scale: lerp(1.9, 1, back(k)) * (1 + e * 0.4), alpha: clamp(k * 3) * (1 - e), glow: 0, rot: -0.04 });
  }
}

function sceneGame(t) {
  bgGradient('#14203a', '#080b14', '#020306');
  gameGroup.visible = true; heroGroup.visible = false; goldGroup.visible = false; boardGroup.visible = true; floor.visible = true;
  const st = applyGame(t);
  const m = st.last;
  hlFrom.visible = hlTo.visible = !!m && t < 8.1;
  if (m) {
    hlFrom.position.copy(sqPos(m.from, 0.006)); hlTo.position.copy(sqPos(m.to, 0.006));
    const k = clamp((t - m.start) / 0.15); hlFrom.material.opacity = 0.28 * k; hlTo.material.opacity = 0.42 * k;
  }
  // lueur d'échec sous le roi noir
  let inCheck = false, mate = false;
  if (m && t >= m.land && (m.check || m.mate)) inCheck = true;
  if (m && m.mate && t >= m.land) mate = true;
  checkGlow.visible = inCheck;
  if (inCheck) {
    const kp = st.bk.obj.position; checkGlow.position.set(sqPos(st.bk.sq).x, 0.012, sqPos(st.bk.sq).z);
    const dt = t - m.land; checkGlow.material.opacity = mate ? 0.85 + 0.15 * Math.sin(t * 18) : clamp(1 - dt * 1.3) * 0.95;
    checkGlow.scale.setScalar(mate ? 1.4 + 0.1 * Math.sin(t * 12) : 1 + dt * 0.6);
  }
  redL.intensity = mate ? 60 * (0.7 + 0.3 * Math.sin(t * 16)) : 0; redL.position.copy(sqPos('h8', 1.2));
  shock.visible = mate && t - 8 < 0.7;
  if (shock.visible) { const dt = t - 8; shock.position.copy(sqPos('h8', 0.03)); shock.scale.setScalar(0.3 + eo(dt / 0.7) * 5); shock.material.opacity = (1 - dt / 0.7); }
  key.intensity = 900;
  applyCam(keyCam(t, CAMS.game));
  updateSparks(t);
  renderer.render(scene, camera); draw3D(glCanvas);
  topShade(0.65, 700);
  if (mate) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; vignette(0.45 * (0.6 + 0.4 * Math.sin(t * 16)), '255,20,40'); ctx.restore(); }

  // barres des joueurs (vue de dessus uniquement)
  const hudA = clamp((t - 3.1) / 0.25) * (1 - clamp((t - 6.3) / 0.2));
  if (hudA > 0) {
    const slide = (1 - eo(clamp((t - 3.1) / 0.3))) * 60;
    playerBar(70, 548 - slide, 'Zugzwang', 1, '♜', hudA, false);
    playerBar(70, 1408 + slide, 'TOI', 2, '♚', hudA, true);
  }
  caption(t, 3.05, 6.25, [{ text: 'AFFRONTE DE', size: 84 }, { text: '*VRAIS* *JOUEURS*', size: 116, hl: CYAN }], 270);
  caption(t, 6.45, 7.75, [{ text: 'SACRIFIE TA', size: 84 }, { text: '*DAME*...', size: 130 }], 300, { stagger: 0.1 });
  // bulles "ÉCHEC !" au-dessus du roi noir
  for (const mv of MOVES) {
    if (!(mv.check) || mv.sac) continue;
    const dt = t - mv.land; if (dt < 0 || dt > 0.48) continue;
    const kp = st.bk.obj.position.clone(); kp.y = 1.9;
    const [x, y] = project(kp);
    const k = clamp(dt / 0.14), e = clamp((dt - 0.36) / 0.12);
    badge('ÉCHEC !', x, Math.max(640, y - 30), 54, RED, lerp(1.8, 1, back(k)) * (1 + e * 0.2), 1 - e);
  }
  if (t > 7.0 && t < 7.55) {
    const dt = t - 7.0, k = clamp(dt / 0.14), e = clamp((dt - 0.42) / 0.12);
    const [x, y] = project(sqPos('g8', 2.3));
    badge('!!', x, y, 70, GOLD, lerp(2, 1, back(k)) * (1 + e * 0.2), 1 - e, '#2a1800');
  }
  // ÉCHEC ET MAT
  if (t >= 8.0) {
    const dt = t - 8.0, k = clamp(dt / 0.2);
    const sc = lerp(3.2, 1, back(k));
    const jit = dt < 0.3 ? (hash(Math.floor(t * 60)) - 0.5) * 24 * (1 - dt / 0.3) : 0;
    ctx.save(); ctx.translate(540 + jit, 760); ctx.rotate(-0.05);
    txt('ÉCHEC', 0, -95, 190, { color: '#fff', scale: sc, alpha: clamp(k * 3), glow: 0 });
    txt('ET MAT', 0, 95, 190, { color: RED, scale: sc, alpha: clamp(k * 3), glow: 50, glowColor: '#ff0022' });
    ctx.restore();
  }
}
function badge(s, x, y, size, color, sc = 1, alpha = 1, textColor = '#fff') {
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.font = F(size); ctx.letterSpacing = '0px'; const w = ctx.measureText(s).width + size * 0.9, h = size * 1.45;
  rr(-w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
  ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, size * 0.04);
  ctx.restore();
}
function playerBar(x, y, name, seed, letter, alpha, me) {
  ctx.save(); ctx.globalAlpha *= alpha;
  glass(x, y - 50, 800, 100, 50, { stroke: me ? 'rgba(255,201,60,0.8)' : 'rgba(255,255,255,0.18)', lw: me ? 4 : 2 });
  avatar(x + 50, y, 36, seed, letter, { ring: me ? GOLD : null, glow: 20 });
  txt(name, x + 104, y - 12, 40, { align: 'left', stroke: false, color: me ? GOLD : '#fff', w: 900 });
  ctx.beginPath(); ctx.arc(x + 114, y + 24, 8, 0, Math.PI * 2); ctx.fillStyle = GREEN; ctx.shadowColor = GREEN; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
  txt(me ? 'Joueur réel · toi' : 'Joueur réel · en ligne', x + 132, y + 24, 26, { align: 'left', stroke: false, color: 'rgba(220,230,255,0.85)', w: 600 });
  ctx.restore();
}

// fond flou commun aux écrans d'interface
function uiBackground(t, c1, c2, c3) {
  bgGradient(c1, c2, c3);
  gameGroup.visible = false; heroGroup.visible = true; goldGroup.visible = false; boardGroup.visible = true; floor.visible = false;
  hlFrom.visible = hlTo.visible = checkGlow.visible = shock.visible = false; redL.intensity = 0; key.intensity = 900;
  setCam([0, 0, 0], 14.5, 36, -20 + (t - 9) * 7, 50);
  updateSparks(-10);
  renderer2.render(scene, camera);
  ctx.save(); ctx.globalAlpha = 0.55; draw3D(smallCanvas, 14); ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(4,5,12,0.75)'); g.addColorStop(0.5, 'rgba(4,5,12,0.35)'); g.addColorStop(1, 'rgba(4,5,12,0.8)');
  ctx.fillStyle = g; ctx.fillRect(-100, -100, W + 200, H + 200);
}

function sceneTour(t) {
  const u = t - 9;
  uiBackground(t, '#2a1660', '#0e0a26', '#03030a');
  embers(t, 'rgba(160,120,255,1)');
  caption(t, 9.02, 11.4, [{ text: '*TOURNOIS*', size: 140 }, { text: 'À ÉLIMINATION DIRECTE', size: 62 }], 290, { stagger: 0.09 });
  const R1 = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [155 + i * 110, 1370]);
  const SF = [[210, 1150], [430, 1150], [650, 1150], [870, 1150]];
  const FI = [[320, 930], [760, 930]];
  const CH = [540, 700];
  const r1w = [1, 2, 4, 7], sfw = [2, 4], fw = 2;
  const path = (c, p, r1, r2) => [[c[0], c[1] - r1], [c[0], (c[1] + p[1]) / 2], [p[0], (c[1] + p[1]) / 2], [p[0], p[1] + r2]];
  const drawPath = (pts, prog, color, lw, glow) => {
    let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); L += d; }
    let rem = L * clamp(prog); ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 0; i < seg.length && rem > 0; i++) { const f = Math.min(1, rem / seg[i]); ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)); rem -= seg[i]; }
    ctx.save(); ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; } ctx.stroke(); ctx.restore();
  };
  const base = clamp((u - 0.3) / 0.3) * 0.28;
  ctx.save(); ctx.globalAlpha = base;
  for (let i = 0; i < 8; i++) drawPath(path(R1[i], SF[i >> 1], 46, 46), 1, '#fff', 4);
  for (let i = 0; i < 4; i++) drawPath(path(SF[i], FI[i >> 1], 46, 46), 1, '#fff', 4);
  for (let i = 0; i < 2; i++) drawPath(path(FI[i], CH, 46, 64), 1, '#fff', 4);
  ctx.restore();
  // trajectoires gagnantes
  const T1 = [0.5, 0.82], T2 = [1.02, 1.32], T3 = [1.48, 1.8];
  r1w.forEach((w, j) => drawPath(path(R1[w], SF[j], 46, 46), inv(...T1, u), w === 2 ? GOLD : '#8fdcff', 7, 24));
  sfw.forEach((w, j) => { const si = r1w.indexOf(w); drawPath(path(SF[si], FI[j], 46, 46), inv(...T2, u), w === 2 ? GOLD : '#8fdcff', 7, 24); });
  drawPath(path(FI[0], CH, 46, 64), inv(...T3, u), GOLD, 8, 30);
  const node = (pos, pl, appear, lostAt, r = 44, silver = false) => {
    const k = clamp((u - appear) / 0.22); if (k <= 0) return;
    const lost = lostAt != null && u > lostAt;
    const me = pl === 2;
    avatar(pos[0], pos[1], r, pl, LETTERS[pl], { scale: lerp(0.2, 1, back(k)), alpha: clamp(k * 3) * (lost ? (silver ? 0.95 : 0.32) : 1), ring: me ? GOLD : null, glow: 30 });
    const nm = me ? 'TOI' : NAMES[pl];
    txt(nm, pos[0], pos[1] + r + 26, me ? 30 : 19, { stroke: false, color: me ? GOLD : 'rgba(255,255,255,0.8)', w: me ? 900 : 800, alpha: clamp(k * 3) * (lost && !silver ? 0.4 : 1) });
    if (lost && !silver) { const e = clamp((u - lostAt) / 0.15); txt('✕', pos[0], pos[1], r * 1.3, { color: RED, scale: lerp(2, 1, eo(e)), alpha: e * 0.95, font: `900 ${r * 1.3}px "DejaVu Sans"`, strokeW: 8 }); }
    if (lost && silver) { const e = clamp((u - lostAt) / 0.2); badge('2e', pos[0] + r * 0.8, pos[1] - r * 0.8, 26, '#c9d3e6', lerp(2, 1, back(e)), e, '#1a2233'); }
  };
  for (let i = 0; i < 8; i++) node(R1[i], i, 0.04 + i * 0.045, r1w.includes(i) ? (i === 2 ? null : (sfw.includes(i) ? (i === 4 ? null : null) : null)) : T1[1]);
  r1w.forEach((w, j) => node(SF[j], w, T1[1] - 0.05, sfw.includes(w) ? null : T2[1]));
  sfw.forEach((w, j) => node(FI[j], w, T2[1] - 0.05, w === fw ? null : T3[1], 48, true));
  if (u > 1.8) {
    const k = clamp((u - 1.8) / 0.25);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(CH[0], CH[1], 0, CH[0], CH[1], 260 * k); g.addColorStop(0, 'rgba(255,200,60,0.55)'); g.addColorStop(1, 'rgba(255,160,0,0)');
    ctx.fillStyle = g; ctx.fillRect(CH[0] - 300, CH[1] - 300, 600, 600);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + u; const d = 90 + 120 * eo(k) + 20 * Math.sin(u * 6 + i); star4(CH[0] + Math.cos(a) * d, CH[1] + Math.sin(a) * d, 14 + 8 * hash(i), (1 - clamp((u - 2.0) / 0.5)) * k, '#ffe08a'); }
    ctx.restore();
    trophy(CH[0], CH[1] - 6, 1.35 * lerp(0.3, 1, back(k)), clamp(k * 3) * 0.55);
    avatar(CH[0], CH[1], 62, 2, '♚', { scale: lerp(0.2, 1, back(k)), alpha: clamp(k * 3), ring: GOLD, glow: 50 });
    txt('CHAMPION', CH[0], CH[1] + 100, 44, { color: GOLD, scale: lerp(1.8, 1, back(clamp((u - 1.9) / 0.2))), alpha: clamp((u - 1.9) * 6), glow: 20 });
  }
}

const RANK_ROWS = ['Bastion', 'LunaRook', 'NeoKnight', 'Gambit42', 'Zugzwang', 'Pion_Fou'];
const rankSlotY = k => 668 + k * 92;
const rankToiY = u => lerp(1266, rankSlotY(0), eio(inv(0.3, 1.35, u)));
function sceneRank(t) {
  const u = t - 11.5;
  uiBackground(t, '#0b3a44', '#061a22', '#020608');
  embers(t, 'rgba(80,230,255,1)');
  caption(t, 11.52, 13.4, [{ text: '*GRIMPE*', size: 140, hl: CYAN }, { text: 'DANS LE CLASSEMENT', size: 66 }], 290, { stagger: 0.09 });
  const pk = clamp(u / 0.25);
  ctx.save(); ctx.globalAlpha = clamp(pk * 2); ctx.translate(540, 940); ctx.scale(lerp(0.9, 1, eo(pk)), lerp(0.9, 1, eo(pk))); ctx.translate(-540, -940);
  glass(90, 548, 800, 784, 40);
  trophy(150, 606, 0.36);
  txt('CLASSEMENT', 190, 606, 38, { align: 'left', stroke: false, w: 900, ls: 3 });
  txt('TOP JOUEURS', 860, 606, 26, { align: 'right', stroke: false, w: 800, color: 'rgba(200,220,255,0.6)', ls: 2 });
  const toiY = rankToiY(u);
  const medal = ['#FFD34D', '#D6DEEA', '#E0904E'];
  for (let k = 0; k < 6; k++) {
    const shift = eio(clamp((rankSlotY(k) + 92 - toiY) / 92));
    const y = rankSlotY(k) + shift * 92;
    const a = k === 5 ? 1 - shift * 0.6 : 1;
    const rank = k + 1 + (shift > 0.5 ? 1 : 0);
    rowRank(y, rank, RANK_ROWS[k], k + 3, a, false, medal);
  }
  ctx.save(); ctx.globalAlpha = 1 - eio(clamp((rankSlotY(5) + 92 - toiY) / 92));
  txt('• • •', 490, 1196, 30, { stroke: false, color: 'rgba(255,255,255,0.5)' }); ctx.restore();
  const p = eio(inv(0.3, 1.35, u));
  const rk = Math.max(1, Math.round(lerp(48, 1, p)));
  rowRank(toiY, rk, 'TOI', 2, 1, true, medal, 1 + 0.04 * Math.sin(clamp(u - 0.3) * Math.PI));
  if (u > 1.38) {
    const k = clamp((u - 1.38) / 0.2);
    badge('▲ 47', 760, toiY, 34, GREEN, lerp(2, 1, back(k)), k, '#05240f');
    // couronne
    ctx.save(); ctx.translate(185, toiY - 52); ctx.scale(lerp(0.2, 1, back(k)), lerp(0.2, 1, back(k))); ctx.globalAlpha = k;
    ctx.beginPath(); ctx.moveTo(-26, 14); ctx.lineTo(-30, -12); ctx.lineTo(-14, 0); ctx.lineTo(0, -18); ctx.lineTo(14, 0); ctx.lineTo(30, -12); ctx.lineTo(26, 14); ctx.closePath();
    ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 20; ctx.fill(); ctx.restore();
  }
  ctx.restore();
  // la défaite ne fait pas perdre de rang
  if (u > 0.95) {
    const k = clamp((u - 0.95) / 0.22);
    shield(118, 1440, 0.95 * lerp(0.2, 1, back(k)), CYAN);
  }
  caption(t, 12.45, 13.4, [{ text: 'UNE DÉFAITE ?', size: 50 }, { text: '*TON* *RANG* *NE* *BOUGE* *PAS*', size: 56, hl: CYAN }], 1408, { stagger: 0.06, cx: 585, maxW: 700 });
}
function rowRank(y, rank, name, seed, alpha, me, medal, sc = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(490, y); ctx.scale(sc, sc); ctx.translate(-490, -y);
  if (me) {
    rr(110, y - 42, 760, 84, 24);
    const g = ctx.createLinearGradient(110, 0, 870, 0); g.addColorStop(0, 'rgba(255,201,60,0.95)'); g.addColorStop(1, 'rgba(255,140,30,0.85)');
    ctx.fillStyle = g; ctx.shadowColor = GOLD; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
  } else { rr(110, y - 40, 760, 80, 22); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); }
  const mc = rank <= 3 ? medal[rank - 1] : null;
  if (mc && !me) { ctx.beginPath(); ctx.arc(170, y, 28, 0, Math.PI * 2); ctx.fillStyle = mc; ctx.fill(); }
  txt('#' + rank, 170, y + 1, rank > 9 ? 30 : 34, { stroke: false, color: me ? '#2a1600' : (mc ? '#1a1a22' : '#fff'), w: 900 });
  avatar(250, y, 30, seed, me ? '♚' : LETTERS[seed % 8], { ring: me ? '#fff' : null, glow: 0 });
  txt(name, 300, y + 1, 36, { align: 'left', stroke: false, color: me ? '#2a1600' : '#fff', w: 900 });
  ctx.restore();
}

// --- parties en direct : 4 mini-échiquiers
const START = (() => { const m = {}; const back = 'RNBQKBNR'; for (let i = 0; i < 8; i++) { const f = 'abcdefgh'[i]; m[f + '1'] = 'w' + back[i]; m[f + '2'] = 'wP'; m[f + '7'] = 'bP'; m[f + '8'] = 'b' + back[i]; } return m; })();
const LIVE = [
  'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6',
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6',
  'd2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7',
  'd2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6',
].map(s => s.split(' ').map(m => [m.slice(0, 2), m.slice(2, 4)]));
const liveMoveTime = (b, j) => 0.42 + b * 0.08 + j * 0.31;
const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
function miniBoard(x, y, s, bi, u, sc, alpha) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x + s / 2, y + s / 2); ctx.scale(sc, sc); ctx.translate(-s / 2, -s / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; rr(-10, -10, s + 20, s + 20, 18); ctx.fillStyle = '#140e0b'; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,195,90,0.8)'; ctx.stroke();
  const q = s / 8;
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) { ctx.fillStyle = (f + r) % 2 ? '#ece4d2' : '#40557a'; ctx.fillRect(f * q, (7 - r) * q, q, q); }
  const pos = { ...START }; let anim = null, last = null;
  LIVE[bi].forEach(([a, b], j) => {
    const tm = liveMoveTime(bi, j); if (u < tm - 0.2) return;
    const k = clamp((u - (tm - 0.2)) / 0.2);
    if (k < 1) anim = { a, b, k, pc: pos[a] };
    else { pos[b] = pos[a]; delete pos[a]; }
    last = [a, b];
  });
  const xy = sq => [(sq.charCodeAt(0) - 97) * q, (7 - (+sq[1] - 1)) * q];
  if (last) { ctx.fillStyle = 'rgba(255,205,60,0.45)'; for (const sq of last) { const [px, py] = xy(sq); ctx.fillRect(px, py, q, q); } }
  ctx.font = `${q * 0.86}px "DejaVu Sans"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const drawPc = (pc, px, py) => {
    ctx.lineWidth = q * 0.07; ctx.lineJoin = 'round';
    ctx.strokeStyle = pc[0] === 'w' ? '#1b1b22' : '#e9eef8'; ctx.fillStyle = pc[0] === 'w' ? '#ffffff' : '#111319';
    ctx.strokeText(GLYPH[pc[1]], px + q / 2, py + q * 0.55); ctx.fillText(GLYPH[pc[1]], px + q / 2, py + q * 0.55);
  };
  for (const sq in pos) { if (anim && sq === anim.a) continue; const [px, py] = xy(sq); drawPc(pos[sq], px, py); }
  if (anim) { const [ax, ay] = xy(anim.a), [bx, by] = xy(anim.b), e = eio(anim.k); drawPc(anim.pc, lerp(ax, bx, e), lerp(ay, by, e) - Math.sin(anim.k * Math.PI) * q * 0.3); }
  // pastille EN DIRECT
  const pulse = 0.6 + 0.4 * Math.sin(u * 9 + bi);
  rr(12, 12, 176, 46, 23); ctx.fillStyle = 'rgba(230,20,50,0.95)'; ctx.fill();
  ctx.beginPath(); ctx.arc(36, 35, 8, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${pulse})`; ctx.fill();
  txt('EN DIRECT', 112, 36, 22, { stroke: false, w: 900, ls: 1 });
  ctx.restore();
}
function eye(x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(0, -36, 40, 0); ctx.quadraticCurveTo(0, 36, -40, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function sceneLive(t) {
  const u = t - 13.5;
  uiBackground(t, '#3d0f1c', '#170610', '#050205');
  embers(t, 'rgba(255,80,110,1)');
  caption(t, 13.52, 15.4, [{ text: 'REGARDE LES PARTIES', size: 76 }], 280, { stagger: 0.07 });
  if (u > 0.22) {
    const k = clamp((u - 0.22) / 0.22), e = t > 15.4 ? clamp((t - 15.4) / 0.15) : 0;
    ctx.save(); ctx.translate(540, 410); const sc = lerp(2.2, 1, back(k)) * (1 + e * 0.3); ctx.scale(sc, sc); ctx.globalAlpha = clamp(k * 3) * (1 - e);
    rr(-290, -70, 580, 140, 70); ctx.fillStyle = '#ff1f45'; ctx.shadowColor = '#ff1f45'; ctx.shadowBlur = 60; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(-205, 0, 20, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * Math.sin(u * 10)})`; ctx.fill();
    txt('EN DIRECT', 30, 4, 88, { stroke: false, w: 900 });
    ctx.restore();
  }
  const zoom = 1 + u * 0.03;
  ctx.save(); ctx.translate(540, 1030); ctx.scale(zoom, zoom); ctx.translate(-540, -1030);
  const S = 372, P = [[128, 600], [580, 600], [128, 1052], [580, 1052]];
  P.forEach(([x, y], i) => { const k = clamp((u - 0.1 - i * 0.07) / 0.25); if (k > 0) miniBoard(x, y, S, i, u, lerp(0.6, 1, back(k)), clamp(k * 3)); });
  ctx.restore();
  eye(470, 1500, 0.8, 'rgba(255,255,255,0.85)');
  txt('Spectateur', 510, 1500, 34, { align: 'left', stroke: false, w: 800, color: 'rgba(255,255,255,0.85)', alpha: clamp((u - 0.6) * 4) });
}

// --- bots : de Facile à Cauchemar
const LEVEL_STOPS = ['#45F07A', '#c8f04a', '#ffd23f', '#ff8a1c', '#ff3b4e', '#b81cff'];
function sceneBots(t) {
  const u = t - 15.5;
  const L = eio(inv(0.7, 2.2, u));
  const night = u >= 2.2;
  const col = mixHex(LEVEL_STOPS, L);
  uiBackground(t, night ? '#4a0614' : mixHex(['#0f3a20', '#3a2a0a', '#3d0a12'], L), '#07080d', '#020203');
  embers(t, night ? 'rgba(255,40,60,1)' : col);
  caption(t, 15.52, 18.4, [{ text: 'AFFRONTE DES *BOTS*', size: 96, hl: col }, { text: 'DE FACILE|#45F07A À CAUCHEMAR|#FF3B4E', size: 64, delay: 0.25 }], 280, { stagger: 0.08 });
  const k = clamp((u - 0.12) / 0.3);
  let sx = 0, sy = 0;
  if (L > 0.8) { const a = (L - 0.8) * 30; sx += (hash(Math.floor(t * 60)) - 0.5) * a; sy += (hash(Math.floor(t * 60) + 7) - 0.5) * a; }
  robot(540 + sx, 860 + sy, lerp(0.2, 1, back(k)), L, col, t, night);
  // jauge
  const x0 = 160, x1 = 920, yM = 1250;
  ctx.save(); ctx.globalAlpha = clamp((u - 0.3) * 4);
  rr(x0, yM - 18, x1 - x0, 36, 18);
  const g = ctx.createLinearGradient(x0, 0, x1, 0); LEVEL_STOPS.forEach((c, i) => g.addColorStop(i / (LEVEL_STOPS.length - 1), c));
  ctx.fillStyle = g; ctx.fill();
  const mx = lerp(x0, x1, L);
  ctx.fillStyle = 'rgba(5,5,10,0.65)'; rr(mx, yM - 18, x1 - mx, 36, 18); ctx.fill();
  ctx.beginPath(); ctx.arc(mx, yM, 30, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 8; ctx.strokeStyle = col; ctx.stroke();
  txt('FACILE', x0, yM + 66, 40, { align: 'left', color: GREEN, w: 900, strokeW: 8 });
  txt('CAUCHEMAR', x1, yM + 66, 40, { align: 'right', color: RED, w: 900, strokeW: 8 });
  ctx.restore();
  // étiquette du niveau
  if (u < 1.2) {
    const a = clamp((u - 0.35) * 5) * (1 - clamp((L - 0.05) / 0.12));
    txt('FACILE', 540, 1112, 96, { color: GREEN, alpha: a, glow: 30 });
  }
  if (night) {
    const dt = u - 2.2, kk = clamp(dt / 0.2);
    const sc = lerp(2.6, 1, back(kk));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    vignette(0.75 * (1 - clamp(dt / 0.8)) + 0.3, '255,0,30'); ctx.restore();
    const fr = Math.floor(t * FPS);
    const gl = dt < 0.5 ? 1 : 0.35;
    const ox = (hash(fr) - 0.5) * 26 * gl, oy = (hash(fr + 3) - 0.5) * 10 * gl;
    ctx.save(); ctx.translate(540, 1112); ctx.rotate(-0.03);
    ctx.globalCompositeOperation = 'lighter';
    txt('CAUCHEMAR', ox, oy, 128, { color: 'rgba(0,240,255,0.8)', stroke: false, scale: sc, alpha: clamp(kk * 3) });
    txt('CAUCHEMAR', -ox, -oy, 128, { color: 'rgba(255,0,60,0.9)', stroke: false, scale: sc, alpha: clamp(kk * 3) });
    ctx.globalCompositeOperation = 'source-over';
    txt('CAUCHEMAR', 0, 0, 128, { color: '#fff', scale: sc, alpha: clamp(kk * 3), glow: 40, glowColor: RED });
    // tranches de glitch
    if (hash(fr + 11) > 0.35) for (let i = 0; i < 3; i++) {
      const yy = (hash(fr * 3 + i) - 0.5) * 120, hh = 8 + hash(fr + i * 5) * 20, dx = (hash(fr + i * 9) - 0.5) * 80 * gl;
      ctx.save(); ctx.beginPath(); ctx.rect(-600, yy, 1200, hh); ctx.clip(); ctx.translate(dx, 0);
      txt('CAUCHEMAR', 0, 0, 128, { color: RED, stroke: false, scale: sc }); ctx.restore();
    }
    ctx.restore();
  }
}
function robot(x, y, sc, L, col, t, night) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const bob = Math.sin(t * 4) * 8; ctx.translate(0, bob);
  // halo
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createRadialGradient(0, 0, 40, 0, 0, 380); hg.addColorStop(0, col.replace('rgb', 'rgba').replace(')', ',0.45)')); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(-400, -400, 800, 800); ctx.restore();
  // antenne
  ctx.lineWidth = 12; ctx.strokeStyle = '#3a4560'; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(0, -215); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -228, 22, 0, Math.PI * 2); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 40 + 20 * Math.sin(t * 10); ctx.fill(); ctx.shadowBlur = 0;
  // cornes en mode cauchemar
  if (L > 0.75) {
    const h = clamp((L - 0.75) / 0.25);
    ctx.fillStyle = '#2a0a12';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 120, -140); ctx.quadraticCurveTo(s * 190, -200 - 40 * h, s * (150 + 60 * h), -160 - 110 * h); ctx.quadraticCurveTo(s * 160, -170, s * 165, -130); ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke(); }
  }
  // oreilles
  ctx.fillStyle = '#2a3348'; rr(-232, -50, 50, 110, 18); ctx.fill(); rr(182, -50, 50, 110, 18); ctx.fill();
  // tête
  rr(-195, -155, 390, 300, 80);
  const g = ctx.createLinearGradient(0, -155, 0, 145); g.addColorStop(0, '#3b465f'); g.addColorStop(1, '#161b28');
  ctx.fillStyle = g; ctx.shadowColor = col; ctx.shadowBlur = 50; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 9; ctx.strokeStyle = col; ctx.stroke();
  rr(-160, -115, 320, 220, 60); ctx.fillStyle = '#070910'; ctx.fill();
  // yeux
  const blink = (Math.sin(t * 3.1) > 0.97) ? 0.15 : 1;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 72, -18);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 40;
    if (L < 0.35) { ctx.beginPath(); ctx.ellipse(0, 0, 34, 38 * blink, 0, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.rotate(s * -lerp(0.05, 0.42, clamp((L - 0.35) / 0.6))); rr(-42, -14 - 10 * (1 - L), 84, 30 + 10 * (1 - L), 14); ctx.fill(); }
    ctx.restore();
  }
  // bouche
  ctx.save(); ctx.translate(0, 62); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 25; ctx.lineWidth = 10; ctx.lineCap = 'round';
  if (L < 0.4) { ctx.beginPath(); ctx.arc(0, -20, 52, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  else if (L < 0.7) { ctx.beginPath(); ctx.moveTo(-55, 0); ctx.lineTo(55, 0); ctx.stroke(); }
  else { ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-70, -6); for (let i = 0; i <= 8; i++) ctx.lineTo(-70 + i * 17.5, i % 2 ? 14 : -10); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

// --- récompenses
function sceneCoins(t) {
  const u = t - 18.5;
  uiBackground(t, '#4a3200', '#160f02', '#050301');
  embers(t, 'rgba(255,200,60,1)');
  const C = [540, 905];
  // rayons
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(...C); ctx.rotate(u * 0.5);
  const ka = clamp(u / 0.3);
  for (let i = 0; i < 18; i++) {
    ctx.rotate(Math.PI * 2 / 18);
    const g = ctx.createLinearGradient(0, 0, 0, -620); g.addColorStop(0, `rgba(255,200,70,${0.32 * ka})`); g.addColorStop(1, 'rgba(255,170,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-48, -620); ctx.lineTo(48, -620); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // explosion de pièces
  const burst = (t0, n, seed) => {
    const dt = u - t0; if (dt < 0) return;
    for (let i = 0; i < n; i++) {
      const s = seed + i, a = -Math.PI / 2 + (hash(s) - 0.5) * 2.6, sp = 900 + hash(s + 1) * 1100;
      const x = C[0] + Math.cos(a) * sp * dt, y = C[1] + Math.sin(a) * sp * dt + 1500 * dt * dt;
      if (y > H + 80) continue;
      coin(x, y, 24 + hash(s + 2) * 26, Math.cos(dt * (8 + hash(s + 3) * 10) + s), 1);
    }
  };
  burst(0.12, 34, 100); burst(1.05, 26, 300); burst(1.85, 30, 500);
  const k = clamp(u / 0.3);
  ctx.save(); ctx.translate(...C); ctx.scale(lerp(0.2, 1, back(k)), lerp(0.2, 1, back(k)));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hg = ctx.createRadialGradient(0, 0, 60, 0, 0, 300); hg.addColorStop(0, 'rgba(255,200,60,0.6)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = hg; ctx.fillRect(-320, -320, 640, 640); ctx.restore();
  coin(0, 0, 165, Math.cos(u * 3.2));
  ctx.restore();
  for (let i = 0; i < 6; i++) { const tw = (u * 1.6 + hash(i)) % 1; star4(C[0] + (hash(i + 4) - 0.5) * 420, C[1] + (hash(i + 8) - 0.5) * 380, 22 * Math.sin(tw * Math.PI), Math.sin(tw * Math.PI), '#fff3c4'); }
  caption(t, 18.52, 20.9, [{ text: 'GAGNE DES', size: 80 }, { text: '*RÉCOMPENSES*', size: 124 }, { text: 'selon tes performances', size: 54, w: 800, color: '#ffeec2', delay: 0.1 }], 270, { stagger: 0.09 });
  // compteur
  const pk = clamp((u - 0.25) / 0.25);
  if (pk > 0) {
    ctx.save(); ctx.translate(540, 1205); const sc = lerp(0.4, 1, back(pk)) * (1 + 0.06 * Math.exp(-Math.max(0, u - 1.9) * 8) * (u > 1.9 ? 1 : 0)); ctx.scale(sc, sc); ctx.globalAlpha = clamp(pk * 3);
    glass(-280, -70, 560, 140, 70, { stroke: 'rgba(255,201,60,0.9)', lw: 5 });
    coin(-200, 0, 46, 1);
    const val = Math.round(eo(inv(0.3, 1.9, u)) * 2450);
    txt('+' + val.toLocaleString('fr-FR').replace(/ | /g, ' '), 40, 4, 84, { color: GOLD, stroke: false, glow: 25 });
    ctx.restore();
  }
}

// --- objets exclusifs (3D)
function sceneExcl(t) {
  const u = t - 21;
  bgGradient('#3a2606', '#0c0803', '#020101');
  // rayon de lumière derrière
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(540, 820, 0, 540, 820, 700); g.addColorStop(0, 'rgba(255,190,80,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  gameGroup.visible = false; heroGroup.visible = false; boardGroup.visible = false; floor.visible = false; goldGroup.visible = true;
  hlFrom.visible = hlTo.visible = checkGlow.visible = shock.visible = false; redL.intensity = 0;
  key.intensity = 700;
  orbitL.intensity = 40; orbitL.position.set(Math.cos(u * 2.4) * 3.2, 2.8, Math.sin(u * 2.4) * 3.2 + 1);
  goldGroup.children.forEach(c => { if (c.userData.baseY != null) { c.rotation.y = u * 0.9 + c.userData.spin; } });
  applyCam(keyCam(t, CAMS.excl));
  updateSparks(t, push => {
    for (let i = 0; i < 120; i++) {
      const ph = (u * (0.5 + hash(i) * 0.6) + hash(i + 2)) % 1;
      const a = hash(i + 4) * Math.PI * 2, r = 0.5 + hash(i + 6) * 2.6;
      const f = Math.sin(ph * Math.PI) * 1.4;
      push(Math.cos(a) * r, 0.3 + ph * 3.2, Math.sin(a) * r * 0.6, f, f * 0.8, f * 0.4);
    }
  });
  renderer.render(scene, camera); draw3D(glCanvas);
  orbitL.intensity = 0;
  topShade(0.65, 700);
  caption(t, 21.02, 22.9, [{ text: 'DÉBLOQUE DES', size: 80 }, { text: '*OBJETS* *EXCLUSIFS*', size: 112 }], 290, { stagger: 0.09 });
  // éclats
  const tips = [[0, 2.7, 0.35], [-1.3, 2.1, 0], [1.3, 1.6, 0]];
  tips.forEach((p, i) => { const tw = ((u + i * 0.37) * 1.3) % 1; const [x, y] = project(new THREE.Vector3(...p)); star4(x, y, 46 * Math.sin(tw * Math.PI), Math.sin(tw * Math.PI)); });
  const k = clamp((u - 0.5) / 0.3);
  ctx.save(); ctx.globalAlpha = k;
  rr(255, 1404, 570, 72, 36); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,220,150,0.4)'; ctx.stroke();
  txt('Achats facultatifs en Robux', 540, 1441, 36, { stroke: false, w: 800, color: '#ffe9c0' });
  ctx.restore();
}

// --- appel à l'action
function sceneCta(t) {
  const u = t - 23;
  bgGradient('#1e1440', '#090814', '#020205');
  gameGroup.visible = false; heroGroup.visible = true; goldGroup.visible = false; boardGroup.visible = true; floor.visible = true;
  hlFrom.visible = hlTo.visible = checkGlow.visible = shock.visible = false; redL.intensity = 0; key.intensity = 900;
  applyCam(keyCam(t, CAMS.cta));
  updateSparks(t, push => {
    for (let i = 0; i < 160; i++) {
      const ph = (u * (0.15 + hash(i) * 0.25) + hash(i + 2)) % 1;
      const x = (hash(i + 4) - 0.5) * 16, z = (hash(i + 6) - 0.5) * 16;
      const f = Math.sin(ph * Math.PI) * 0.9;
      push(x, ph * 6, z, f, f * 0.75, f * 0.35);
    }
  });
  renderer.render(scene, camera); draw3D(glCanvas);
  topShade(0.75, 820);
  const bot = ctx.createLinearGradient(0, 1100, 0, H); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = bot; ctx.fillRect(0, 1100, W, H - 1100);
  caption(t, 23.05, 30, [{ text: '*À* *TOI*', size: 180 }, { text: 'DE JOUER', size: 128 }], 330, { stagger: 0.14 });
  if (CFG.gameName) {
    const k = clamp((u - 0.5) / 0.25);
    txt(CFG.gameName.toUpperCase(), 540, 640, 86, { color: '#fff', scale: lerp(1.6, 1, back(k)), alpha: k, glow: 30, glowColor: GOLD, ls: 4 });
  }
  // bouton
  const bk = clamp((u - 0.75) / 0.25);
  if (bk > 0) {
    const beat = Math.max(0, Math.cos((t % 0.5) / 0.5 * Math.PI * 2)) * 0.035 + (t > 27.5 ? 0.12 * Math.exp(-(t - 27.5) * 6) : 0);
    ctx.save(); ctx.translate(540, 1150); const sc = lerp(0.3, 1, back(bk)) * (1 + beat); ctx.scale(sc, sc); ctx.globalAlpha = clamp(bk * 3);
    rr(-360, -82, 720, 164, 82);
    const g = ctx.createLinearGradient(0, -82, 0, 82); g.addColorStop(0, '#ffe680'); g.addColorStop(0.5, '#ffc12e'); g.addColorStop(1, '#ff9a00');
    ctx.fillStyle = g; ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 70; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff6cc'; ctx.stroke();
    // reflet qui balaie
    ctx.save(); ctx.clip(); const sw = ((u - 0.9) % 1.3) / 1.3 * 1200 - 600;
    const sg = ctx.createLinearGradient(sw - 120, 0, sw + 120, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(sw - 160, -100, 320, 200); ctx.restore();
    txt('JOUE MAINTENANT', 0, 4, 68, { color: '#1c1104', stroke: false, w: 900 });
    ctx.restore();
  }
  const pk = clamp((u - 1.15) / 0.25);
  if (pk > 0) txt('DISPONIBLE SUR ' + CFG.platform.toUpperCase(), 540, 1275, 42, { scale: lerp(1.6, 1, back(pk)), alpha: clamp(pk * 3), w: 900, ls: 5, strokeW: 8 });
  if (CFG.commentWord) {
    const lk = clamp((u - 1.45) / 0.25);
    if (lk > 0) {
      const bob = Math.sin(u * Math.PI * 2) * 6;
      ctx.save(); ctx.translate(540, 1395 + bob); const sc = lerp(1.7, 1, back(lk)); ctx.scale(sc, sc); ctx.globalAlpha = clamp(lk * 3);
      // bulle de commentaire
      ctx.font = F(58); ctx.letterSpacing = '0px';
      const label = 'COMMENTE « ' + CFG.commentWord.toUpperCase() + ' »';
      const w = ctx.measureText(label).width + 150, h = 112;
      rr(-w / 2, -h / 2, w, h, 30); ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 60, h / 2 - 2); ctx.lineTo(-w / 2 + 50, h / 2 + 30); ctx.lineTo(-w / 2 + 95, h / 2 - 2); ctx.closePath(); ctx.fill();
      // icône bulle
      ctx.save(); ctx.translate(-w / 2 + 58, 0); ctx.fillStyle = RED;
      ctx.beginPath(); ctx.ellipse(0, -4, 30, 25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(-22, 32); ctx.lineTo(4, 18); ctx.fill();
      ctx.fillStyle = '#fff'; for (const dx of [-12, 0, 12]) { ctx.beginPath(); ctx.arc(dx, -4, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      txt(label, 40, 3, 58, { color: '#14100a', stroke: false, w: 900 });
      ctx.restore();
    }
    const sk = clamp((u - 1.75) / 0.25);
    if (sk > 0) txt('pour recevoir le nom du jeu', 540, 1502, 44, { color: GOLD, scale: lerp(1.5, 1, back(sk)), alpha: clamp(sk * 3), w: 800, strokeW: 8 });
  }
}

const DRAW = { hook: sceneHook, game: sceneGame, tour: sceneTour, rank: sceneRank, live: sceneLive, bots: sceneBots, coins: sceneCoins, excl: sceneExcl, cta: sceneCta };

// ---------------------------------------------------------------- image complète
function renderFrame(t) {
  const sc = SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];
  // zoom de transition + tremblement
  let zoom = 1, sx = 0, sy = 0, streak = 0;
  for (const c of CUTS) {
    const d = t - c;
    if (d >= 0 && d < 0.35) zoom *= 1 + 0.14 * Math.exp(-d * 11);
    if (d < 0 && d > -0.14) { const k = 1 + d / 0.14; zoom *= 1 + 0.22 * k * k; streak = Math.max(streak, k); }
  }
  for (let i = 0; i < SHAKES.length; i++) {
    const d = t - SHAKES[i].t; if (d < 0 || d > 0.7) continue;
    const a = SHAKES[i].a * Math.exp(-d * 7);
    sx += Math.sin(d * 95 + i) * a; sy += Math.cos(d * 77 + i * 2) * a;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(zoom, 0, 0, zoom, 540 - 540 * zoom + sx, 960 - 960 * zoom + sy);
  DRAW[sc.id](t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  vignette(0.55);
  // traits de vitesse avant les coupes
  if (streak > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const a = hash(i) * Math.PI * 2, r0 = 260 + hash(i + 1) * 300, len = (200 + hash(i + 2) * 600) * streak;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * streak})`; ctx.lineWidth = 2 + hash(i + 3) * 5;
      ctx.beginPath(); ctx.moveTo(540 + Math.cos(a) * r0, 960 + Math.sin(a) * r0); ctx.lineTo(540 + Math.cos(a) * (r0 + len), 960 + Math.sin(a) * (r0 + len)); ctx.stroke();
    }
    ctx.restore();
  }
  // flash
  let flash = 0;
  for (const c of CUTS) { const d = t - c; if (d >= 0 && d < 0.3) flash = Math.max(flash, 0.55 * Math.exp(-d * 16)); }
  for (const s of [2.0, 8.0, 17.7, 23.0, 27.5]) { const d = t - s; if (d >= 0 && d < 0.3) flash = Math.max(flash, 0.75 * Math.exp(-d * 13)); }
  if (flash > 0.003) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
  // fondu d'ouverture
  if (t < 0.12) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 0.12})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- repères sonores (pour audio.py)
function buildCues() {
  const c = [];
  const add = (t, s, g = 1, p = 1) => c.push({ t: +t.toFixed(3), s, g, p });
  // accroche
  add(0.12, 'hit', 0.7); add(0.57, 'hit', 1.0, 1.2); add(0.87, 'pop', 0.7);
  add(1.45, 'fall', 1.0); add(2.0, 'impact', 1.2); add(2.05, 'hit', 0.8, 0.8);
  // partie
  for (const m of MOVES) {
    if (m.sac) add(m.start, 'whoosh', 0.8, 0.8);
    add(m.land, m.capture ? 'capture' : 'move', m.capture ? 1 : 0.9, 0.9 + hash(m.land) * 0.2);
    if (m.check && !m.sac) add(m.land + 0.02, 'check', 0.7);
    if (m.sac) add(m.land, 'sac', 1.0);
    if (m.mate) add(m.land, 'mate', 1.2);
  }
  add(3.05, 'pop', 0.5); add(6.45, 'pop', 0.5);
  // transitions
  for (const t of CUTS) add(t - 0.22, 'whoosh', t === 3 || t === 23 ? 1 : 0.75, 1 + hash(t) * 0.3);
  // tournoi
  for (let i = 0; i < 8; i++) add(9.04 + i * 0.045, 'tick', 0.35, 1 + i * 0.06);
  add(9.5, 'swipe', 0.7); add(10.02, 'swipe', 0.7, 1.15); add(10.48, 'swipe', 0.8, 1.3); add(10.8, 'win', 1.0);
  // classement
  for (let k = 5; k >= 0; k--) { let tt = 0; for (let s = 0; s <= 2; s += 0.005) { if (rankToiY(s) <= rankSlotY(k) + 46) { tt = s; break; } } add(11.5 + tt, 'tick', 0.6, 1 + (5 - k) * 0.1); }
  add(12.88, 'ding', 0.9); add(12.45, 'shield', 0.7);
  // direct
  add(13.72, 'live', 0.8);
  for (let b = 0; b < 4; b++) LIVE[b].forEach((_, j) => { const tm = 13.5 + liveMoveTime(b, j); if (tm < 15.45) add(tm, 'move', 0.28, 1.2 + hash(b * 10 + j) * 0.2); });
  // bots
  add(15.62, 'blip', 0.8); add(16.2, 'riser', 0.9); add(17.7, 'glitch', 1.0); add(17.7, 'impact', 1.1, 0.8);
  // récompenses
  add(18.62, 'coinburst', 1.0); add(19.55, 'coinburst', 0.7); add(20.35, 'coinburst', 0.7);
  for (let i = 0; i < 9; i++) add(18.8 + i * 0.17, 'coin', 0.45, 1 + i * 0.05);
  add(20.4, 'cash', 0.9);
  // exclusifs
  add(21.05, 'shine', 1.0); add(21.9, 'sparkle', 0.7);
  // fin
  add(23.0, 'impact', 1.0, 1.1); add(23.75, 'button', 0.9); add(24.15, 'pop', 0.5); add(24.45, 'ding', 0.8); add(24.75, 'pop', 0.5); add(27.5, 'final', 1.1);
  return c.sort((a, b) => a.t - b.t);
}
const MUSIC = { bpm: 120, duration: DURATION, drops: [3.0, 23.0], stops: [[7.62, 8.0], [17.45, 17.7], [22.55, 23.0]], end: 27.5 };

(async () => {
  await document.fonts.load('900 40px InterAd'); await document.fonts.load('800 40px InterAd'); await document.fonts.load('600 40px InterAd');
  await document.fonts.ready;
  renderFrame(0.5); // pré-compilation des shaders
  renderFrame(10); renderFrame(22); renderFrame(25);
  window.AD = { W, H, FPS, DURATION, renderFrame, cues: buildCues(), music: MUSIC, ready: true };
})();
