// Rendu 3D : sphères, lignes, étiquettes et transitions entre la vue Dossier et la vue large.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { flowFrom, hash, LARGE_LIMIT, layoutFocus, layoutLarge, neighbours } from './graph.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BACKGROUND = 0x0b2a33;
const BRASS = 0xe0b768;
const MAX_PARTICLES = 500;
const SPRING = 34;
const DAMPING = 9.5;
const v = new THREE.Vector3();

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,.75)');
  grad.addColorStop(0.3, 'rgba(255,255,255,.2)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createScene(stage, labels, { onPick, onOpen, onHover }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.fog = new THREE.FogExp2(BACKGROUND, 0.0028);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.02, 2000);
  camera.position.set(14, 12, 46);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.3;
  controls.maxDistance = 600;
  controls.autoRotate = !REDUCED;
  controls.autoRotateSpeed = 0.28;

  scene.add(new THREE.HemisphereLight(0xfff4d6, 0x0b3a4a, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(20, 30, 25);
  scene.add(sun);

  // Fond d'étoiles discret, pour donner de la profondeur quand on tourne.
  const starCount = 700;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const y = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
    const d = 500 + Math.random() * 500;
    starPos.set([r * Math.cos(a) * d, y * d, r * Math.sin(a) * d], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x9fb9b5, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.55 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Sphère armillaire : trois anneaux de laiton autour du dossier sélectionné.
  const armillary = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: BRASS, transparent: true, opacity: 0.95, fog: false });
  const rings = [[0, 0, 0], [Math.PI / 2, 0.4, 0], [Math.PI / 2, 0, Math.PI / 2.6]].map(rot => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), ringMat);
    ring.rotation.set(...rot);
    armillary.add(ring);
    return ring;
  });
  scene.add(armillary);

  const glowTexture = radialTexture();
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  const nodes = new Map();
  const edges = new Map();
  let idx = null;
  let view = { mode: 'focus', selectedId: null, hideRest: false };
  let largePositions = null;
  let lastActiveKey = '';
  let flow = null;
  let lastFitKey = '';
  let flight = null;
  let moving = true;
  let inset = { right: 0, bottom: 0, top: 0 };
  let hoverId = null;

  // Particules qui suivent le sens des connexions dans la vue large.
  const particleGeo = new THREE.BufferGeometry();
  const particlePos = new Float32Array(MAX_PARTICLES * 3);
  const particleCol = new Float32Array(MAX_PARTICLES * 3);
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleCol, 3));
  const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
    size: 0.62, map: glowTexture, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  particles.frustumCulled = false;
  scene.add(particles);

  // Quand on arrive sur un point : une onde qui s'élargit et des étincelles qui s'échappent.
  const WAVES = 3, SPARKS = 48;
  const waves = Array.from({ length: WAVES }, () => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, age: 1, size: 1, node: null };
  });
  let nextWave = 0;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ size: 0.42, map: glowTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.visible = false;
  scene.add(sparks);
  let sparkAge = 1;
  let armSpin = 0;

  function celebrate(node) {
    if (REDUCED) return;
    const color = new THREE.Color(idx.color.get(node.id));
    [0, 1].forEach(i => {
      const wave = waves[nextWave++ % WAVES];
      wave.age = -i * 0.12;
      wave.size = node.radius * 1.65;
      wave.node = node;
      wave.mesh.material.color.copy(color);
    });
    sparkAge = 0;
    sparkMat.color.copy(color).lerp(new THREE.Color(0xffffff), 0.35);
    const speed = 2 + node.radius * 3;
    for (let i = 0; i < SPARKS; i++) {
      const y = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y), s = speed * (0.4 + Math.random());
      sparkPos.set([node.target.x, node.target.y, node.target.z], i * 3);
      sparkVel.set([r * Math.cos(a) * s, y * s, r * Math.sin(a) * s], i * 3);
    }
    armSpin = 1;
  }

  function nodeRadius(id) {
    const d = idx.depth.get(id) ?? 3;
    const base = d === 0 ? 1.35 : d === 1 ? 1.05 : d === 2 ? 0.66 : 0.46;
    return base + Math.min(0.35, idx.byId.get(id).entries.length * 0.04);
  }

  function makeNode(data) {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.15, transparent: true });
    const mesh = new THREE.Mesh(sphere, material);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(mesh, glow);
    const label = document.createElement('div');
    label.className = 'node-label';
    label.append(document.createElement('span'), document.createElement('small'));
    labels.append(label);
    return {
      id: data.id, mesh, glow, label, pos: new THREE.Vector3(), target: new THREE.Vector3(), vel: new THREE.Vector3(), delay: 0, hover: 0, scaleVel: 0, opacity: 0, targetOpacity: 0,
      scale: 1, targetScale: 1, pulse: 0, priority: 0, labelText: null, labelClass: '', w: 0, h: 0, sx: 0, sy: 0, sr: 0, shown: false,
    };
  }

  function makeEdge(key, kind, from, to, text) {
    const segments = kind === 'link' ? 24 : 1;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segments + 1) * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
    line.frustumCulled = false;
    scene.add(line);
    const h = hash(key);
    const edge = {
      key, kind, from, to, line, segments, opacity: 0, targetOpacity: 0, inFlow: false, particles: 0,
      bend: new THREE.Vector3(((h & 255) / 255 - 0.5), (((h >> 8) & 255) / 255 - 0.5), (((h >> 16) & 255) / 255 - 0.5)).normalize(),
      label: null, w: 0, h: 12, sx: 0, sy: 0, shown: false, phase: (h % 1000) / 1000,
    };
    if (kind === 'link') {
      edge.label = document.createElement('div');
      edge.label.className = 'link-label';
      edge.label.textContent = text;
      labels.append(edge.label);
    }
    return edge;
  }

  function pointOnEdge(edge, t, target) {
    const a = nodes.get(edge.from).pos, b = nodes.get(edge.to).pos;
    if (edge.kind !== 'link') return target.lerpVectors(a, b, t);
    const dist = a.distanceTo(b);
    const u = 1 - t;
    const cx = (a.x + b.x) / 2 + edge.bend.x * dist * 0.22;
    const cy = (a.y + b.y) / 2 + edge.bend.y * dist * 0.22;
    const cz = (a.z + b.z) / 2 + edge.bend.z * dist * 0.22;
    return target.set(u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * a.y + 2 * u * t * cy + t * t * b.y, u * u * a.z + 2 * u * t * cz + t * t * b.z);
  }

  function disposeNode(node) {
    scene.remove(node.mesh, node.glow);
    node.mesh.material.dispose();
    node.glow.material.dispose();
    node.label.remove();
  }

  function disposeEdge(edge) {
    scene.remove(edge.line);
    edge.line.geometry.dispose();
    edge.line.material.dispose();
    edge.label?.remove();
  }

  function styleNode(node) {
    const data = idx.byId.get(node.id);
    const color = new THREE.Color(idx.color.get(node.id));
    node.mesh.material.color.copy(color);
    node.mesh.material.emissive.copy(color).multiplyScalar(0.55);
    node.glow.material.color.copy(color);
    node.radius = nodeRadius(node.id);
    const kids = idx.children.get(node.id).length;
    const count = data.entries.length ? String(data.entries.length) : data.atlas && !kids ? '+' : '';
    const text = data.name + '|' + count;
    if (node.labelText !== text) {
      node.labelText = text;
      node.label.children[0].textContent = data.name;
      node.label.children[1].textContent = count;
      node.w = 0;
    }
  }

  function dropEdgesOf(id) {
    for (const [key, edge] of edges) {
      if (edge.from === id || edge.to === id) { disposeEdge(edge); edges.delete(key); }
    }
  }

  // Seuls les objets réellement visibles existent en 3D, même si la carte contient des centaines de milliers d'éléments.
  function syncObjects() {
    for (const [id, node] of nodes) {
      if (!idx.byId.has(id)) { dropEdgesOf(id); disposeNode(node); nodes.delete(id); } else styleNode(node);
    }
    const links = new Map(idx.graph.links.map(l => [l.id, l]));
    for (const [key, edge] of edges) {
      const id = key.slice(1);
      const valid = edge.kind === 'tree' ? idx.byId.get(id)?.parentId === edge.from : links.get(id)?.from === edge.from && links.get(id)?.to === edge.to;
      if (!valid) { disposeEdge(edge); edges.delete(key); }
    }
  }

  function ensureActive(active) {
    for (const id of active) {
      if (nodes.has(id)) continue;
      const created = makeNode(idx.byId.get(id));
      const parent = nodes.get(idx.byId.get(id).parentId);
      if (parent) created.pos.copy(parent.pos);
      nodes.set(id, created);
      styleNode(created);
    }
    for (const id of active) {
      const parent = idx.byId.get(id).parentId;
      if (parent && active.has(parent) && !edges.has('t' + id)) edges.set('t' + id, makeEdge('t' + id, 'tree', parent, id, ''));
    }
    for (const link of idx.graph.links) {
      if (active.has(link.from) && active.has(link.to) && !edges.has('l' + link.id)) edges.set('l' + link.id, makeEdge('l' + link.id, 'link', link.from, link.to, link.fn));
    }
    for (const edge of edges.values()) edge.line.material.color.set(edge.kind === 'link' ? BRASS : 0xdce8e0);
  }

  function pickLarge(sel) {
    const active = new Set([sel, ...flow.ancestors, ...flow.sources]);
    for (const id of flow.level.keys()) {
      if (active.size >= LARGE_LIMIT) break;
      active.add(id);
    }
    if (!view.hideRest) {
      const shallow = [idx.root.id];
      while (shallow.length && active.size < LARGE_LIMIT + 60) {
        const id = shallow.shift();
        active.add(id);
        if ((idx.depth.get(id) ?? 9) < 3) shallow.push(...idx.children.get(id).map(n => n.id));
      }
    }
    return active;
  }

  function apply() {
    if (!idx || !view.selectedId || !idx.byId.has(view.selectedId)) return;
    const sel = view.selectedId;
    const visible = [];
    flow = view.mode === 'large' ? flowFrom(idx, sel) : null;

    if (view.mode === 'focus') {
      const layout = layoutFocus(idx, sel);
      const active = new Set(layout.keys());
      ensureActive(active);
      const center = nodes.get(sel);
      const { parent } = neighbours(idx, sel);
      let order = 0;
      for (const node of nodes.values()) {
        const p = layout.get(node.id);
        if (p) {
          // Les points jaillissent du dossier l'un après l'autre, sans attendre trop longtemps.
          if (node.opacity < 0.03) { node.pos.copy(center.pos); node.vel.set(0, 0, 0); node.delay = REDUCED ? 0 : Math.min(order++ * 0.014, 0.32); node.scale = 0.15; }
          node.target.set(...p);
          node.targetOpacity = 1;
          node.targetScale = node.id === sel ? 1.65 : 1;
          node.priority = node.id === sel ? 1000 : parent.includes(node.id) ? 500 : 100;
          visible.push(node);
        } else {
          node.target.set(0, 0, 0);
          node.targetOpacity = 0;
          node.targetScale = 0.4;
          node.priority = -1;
        }
      }
      for (const edge of edges.values()) {
        const both = layout.has(edge.from) && layout.has(edge.to);
        const touches = edge.from === sel || edge.to === sel;
        edge.targetOpacity = !both ? 0 : touches ? (edge.kind === 'link' ? 1 : 0.8) : 0.22;
        edge.inFlow = false;
        edge.particles = both && touches && edge.kind === 'link' ? 3 : 0;
      }
    } else {
      const active = pickLarge(sel);
      ensureActive(active);
      const key = [...active].join();
      if (key !== lastActiveKey) {
        lastActiveKey = key;
        largePositions = new Map([...(largePositions || []), ...layoutLarge(idx, largePositions, active)]);
      }
      for (const node of nodes.values()) {
        if (!active.has(node.id)) { node.targetOpacity = 0; node.priority = -1; continue; }
        node.target.set(...largePositions.get(node.id));
        const level = flow.level.get(node.id);
        let opacity;
        if (level !== undefined) opacity = 1;
        else if (flow.sources.has(node.id)) opacity = 0.75;
        else if (flow.ancestors.has(node.id)) opacity = 0.9;
        else opacity = view.hideRest ? 0 : 0.3;
        node.targetOpacity = opacity;
        node.targetScale = node.id === sel ? 2.1 : 1.45;
        node.priority = node.id === sel ? 1000 : level !== undefined ? 300 - level * 20 - (idx.depth.get(node.id) || 0) : opacity > 0.4 ? 80 : 1 - (idx.depth.get(node.id) || 0);
        if (opacity >= 0.5) visible.push(node);
      }
      for (const edge of edges.values()) {
        const id = edge.key.slice(1);
        const both = active.has(edge.from) && active.has(edge.to);
        const lit = both && (edge.kind === 'tree' ? flow.treeEdges.has(id) : flow.linkEdges.has(id));
        const into = both && edge.kind === 'link' && flow.incoming.has(id);
        // Le chemin depuis « Tout » reste aussi visible que la suite : chaque point montre d'où il vient.
        const before = both && edge.kind === 'tree' && flow.ancestors.has(edge.from) && (flow.ancestors.has(edge.to) || edge.to === sel);
        edge.inFlow = lit;
        edge.targetOpacity = !both ? 0 : lit ? (edge.kind === 'link' ? 1 : 0.72) : before ? 0.8 : into ? 0.6 : view.hideRest ? 0 : 0.2;
        edge.particles = REDUCED ? 0 : lit ? (edge.kind === 'link' ? 4 : 2) : 0;
      }
    }

    const fitKey = [view.mode, sel, view.hideRest, visible.length].join('/');
    if (fitKey !== lastFitKey) {
      lastFitKey = fitKey;
      fit(visible);
    }
    moving = true;
  }

  function fit(visible) {
    if (!visible.length) return;
    const box = new THREE.Box3();
    visible.forEach(n => box.expandByPoint(n.target));
    const middle = box.getCenter(new THREE.Vector3());
    let radius = 13;
    visible.forEach(n => { radius = Math.max(radius, n.target.distanceTo(middle) + 2); });
    const width = Math.max(innerWidth - inset.right, 200), height = Math.max(innerHeight - inset.bottom - inset.top, 120);
    const vfov = THREE.MathUtils.degToRad(camera.fov / 2);
    const hfov = Math.atan(Math.tan(vfov) * width / height);
    const dist = radius / Math.sin(Math.min(vfov, hfov)) * 1.04;
    flight = { target: middle, dist };
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, inset.right / 2, (inset.bottom - inset.top) / 2, w, h);
    camera.updateProjectionMatrix();
    lastFitKey = '';
    apply();
  }

  function placeLabels() {
    camera.updateMatrixWorld();
    const W = innerWidth, H = innerHeight;
    const scale = H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const placed = [];
    const candidates = [];
    for (const node of nodes.values()) {
      node.shown = false;
      if (node.opacity < 0.1) { node.label.style.opacity = 0; continue; }
      v.copy(node.pos).project(camera);
      if (v.z > 1) { node.label.style.opacity = 0; continue; }
      node.sx = (v.x + 1) / 2 * W;
      node.sy = (1 - v.y) / 2 * H;
      const dist = camera.position.distanceTo(node.pos);
      node.sr = node.radius * node.scale * scale / dist;
      const cls = node.id === view.selectedId ? 'node-label current' : (idx.depth.get(node.id) <= 1 ? 'node-label major' : 'node-label');
      if (node.labelClass !== cls) { node.label.className = cls; node.labelClass = cls; node.w = 0; }
      if (!node.w) { node.w = node.label.offsetWidth; node.h = node.label.offsetHeight; }
      candidates.push(node);
    }
    candidates.sort((a, b) => b.priority - a.priority);
    for (const node of candidates) {
      const x = node.sx - node.w / 2, y = node.sy + node.sr + 5;
      const free = node.priority >= 1000 || !placed.some(r => x < r[2] && x + node.w > r[0] && y < r[3] && y + node.h > r[1]);
      const eligible = node.opacity > 0.3 || placed.length < 8;
      if (free && eligible && x + node.w > 0 && x < W && y < H) {
        placed.push([x - 4, y - 2, x + node.w + 4, y + node.h + 2]);
        node.shown = true;
        node.label.style.opacity = Math.min(1, node.opacity * 1.25);
        node.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      } else node.label.style.opacity = 0;
    }
    const mid = new THREE.Vector3();
    for (const edge of edges.values()) {
      if (!edge.label) continue;
      if (edge.opacity < 0.4) { edge.label.style.opacity = 0; continue; }
      pointOnEdge(edge, 0.5, mid).project(camera);
      if (mid.z > 1) { edge.label.style.opacity = 0; continue; }
      if (!edge.w) { edge.w = edge.label.offsetWidth; edge.h = edge.label.offsetHeight; }
      const x = (mid.x + 1) / 2 * W - edge.w / 2, y = (1 - mid.y) / 2 * H - edge.h / 2;
      if (placed.some(r => x < r[2] && x + edge.w > r[0] && y < r[3] && y + edge.h > r[1])) { edge.label.style.opacity = 0; continue; }
      placed.push([x, y, x + edge.w, y + edge.h]);
      edge.label.style.opacity = edge.opacity;
      edge.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  const clock = new THREE.Clock();
  let time = 0;
  const point = new THREE.Vector3();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    const k = REDUCED ? 1 : 1 - Math.exp(-dt * 5);
    let delta = 0;
    if (!REDUCED) {
      stars.rotation.y += dt * 0.004;
      starMat.opacity = 0.5 + Math.sin(time * 0.7) * 0.08;
    }

    for (const node of nodes.values()) {
      delta = Math.max(delta, node.pos.distanceToSquared(node.target), node.vel.lengthSq() * 0.01);
      if (node.delay > 0) { node.delay -= dt; delta = Math.max(delta, 1); }
      else if (REDUCED) { node.pos.copy(node.target); node.scale = node.targetScale; }
      else {
        // Un ressort plutôt qu'un simple glissement : le mouvement démarre en douceur et se pose avec un léger rebond.
        node.vel.x += ((node.target.x - node.pos.x) * SPRING - node.vel.x * DAMPING) * dt;
        node.vel.y += ((node.target.y - node.pos.y) * SPRING - node.vel.y * DAMPING) * dt;
        node.vel.z += ((node.target.z - node.pos.z) * SPRING - node.vel.z * DAMPING) * dt;
        node.pos.addScaledVector(node.vel, dt);
        node.scaleVel += ((node.targetScale - node.scale) * 120 - node.scaleVel * 13) * dt;
        node.scale = Math.max(0.01, node.scale + node.scaleVel * dt);
      }
      if (node.delay <= 0) node.opacity += (node.targetOpacity - node.opacity) * k;
      node.hover += ((node.id === hoverId ? 1 : 0) - node.hover) * (REDUCED ? 1 : 1 - Math.exp(-dt * 14));
      node.pulse = Math.max(0, node.pulse - dt * 0.7);
      const show = node.opacity > 0.008;
      node.mesh.visible = show;
      node.glow.visible = show && (nodes.size < 120 || node.id === view.selectedId);
      if (!show) continue;
      const size = node.radius * node.scale * (1 + Math.sin(node.pulse * Math.PI * 3) * node.pulse * 0.5) * (1 + node.hover * 0.16);
      node.mesh.position.copy(node.pos);
      node.mesh.scale.setScalar(size);
      node.mesh.material.opacity = node.opacity;
      node.glow.position.copy(node.pos);
      node.glow.scale.setScalar(size * 4.2);
      node.glow.material.opacity = node.opacity * (0.3 + node.hover * 0.35);
    }

    // Libère ce qui a fini de disparaître.
    for (const [id, node] of nodes) {
      if (node.targetOpacity === 0 && node.opacity < 0.01 && id !== view.selectedId) { dropEdgesOf(id); disposeNode(node); nodes.delete(id); }
    }

    for (const edge of edges.values()) {
      edge.opacity += (edge.targetOpacity - edge.opacity) * k;
      edge.line.visible = edge.opacity > 0.008;
      if (!edge.line.visible) continue;
      edge.line.material.opacity = edge.opacity;
      if (moving) {
        const attr = edge.line.geometry.attributes.position;
        for (let i = 0; i <= edge.segments; i++) {
          pointOnEdge(edge, i / edge.segments, point);
          attr.setXYZ(i, point.x, point.y, point.z);
        }
        attr.needsUpdate = true;
      }
    }
    moving = delta > 0.0001;

    let used = 0;
    if (!REDUCED) {
      const color = new THREE.Color();
      for (const edge of edges.values()) {
        if (!edge.particles || edge.opacity < 0.3) continue;
        color.set(edge.kind === 'link' ? BRASS : idx.color.get(edge.to));
        for (let i = 0; i < edge.particles && used < MAX_PARTICLES; i++, used++) {
          const t = (time * 0.16 + edge.phase + i / edge.particles) % 1;
          pointOnEdge(edge, t, point);
          particlePos.set([point.x, point.y, point.z], used * 3);
          particleCol.set([color.r, color.g, color.b], used * 3);
        }
      }
    }
    particleGeo.setDrawRange(0, used);
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;

    const current = nodes.get(view.selectedId);
    armillary.visible = !!current;
    if (current) {
      armillary.position.copy(current.pos);
      armillary.scale.setScalar(current.radius * current.scale * 1.75);
      if (!REDUCED) {
        // Les anneaux tournent vite à l'arrivée, puis reprennent leur lente rotation.
        armSpin = Math.max(0, armSpin - dt * 0.9);
        const spin = 1 + armSpin * armSpin * 14;
        rings[0].rotation.z += dt * 0.25 * spin;
        rings[1].rotation.y += dt * 0.18 * spin;
        rings[2].rotation.x += dt * 0.13 * spin;
      }
    }

    for (const wave of waves) {
      if (wave.age >= 1) { wave.mesh.visible = false; continue; }
      wave.age += dt / 0.85;
      if (wave.age < 0 || !nodes.has(wave.node?.id)) continue;
      const t = Math.min(wave.age, 1), out = 1 - (1 - t) ** 3;
      wave.mesh.visible = true;
      wave.mesh.position.copy(wave.node.pos);
      wave.mesh.quaternion.copy(camera.quaternion);
      wave.mesh.scale.setScalar(wave.size * (1 + out * 3.4));
      wave.mesh.material.opacity = (1 - t) ** 2 * 0.55;
    }
    sparks.visible = sparkAge < 1;
    if (sparks.visible) {
      sparkAge += dt / 1.1;
      const drag = Math.exp(-dt * 2.6);
      for (let i = 0; i < SPARKS * 3; i++) {
        sparkVel[i] *= drag;
        sparkPos[i] += sparkVel[i] * dt;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = (1 - Math.min(sparkAge, 1)) ** 1.5 * 0.9;
    }

    if (flight) {
      // Le départ est progressif, pour que la caméra ne saute jamais d'un coup.
      flight.age = (flight.age || 0) + dt;
      const ramp = Math.min(flight.age / 0.4, 1);
      const camK = REDUCED ? 1 : (1 - Math.exp(-dt * 3.4)) * (0.15 + 0.85 * ramp * ramp * (3 - 2 * ramp));
      controls.target.lerp(flight.target, camK);
      const offset = camera.position.clone().sub(controls.target);
      const dist = offset.length();
      offset.setLength(dist + (flight.dist - dist) * camK);
      camera.position.copy(controls.target).add(offset);
      if (Math.abs(dist - flight.dist) < 0.05 && controls.target.distanceTo(flight.target) < 0.05) flight = null;
    }
    controls.update();
    placeLabels();
    renderer.render(scene, camera);
  }

  // Sélection : on compare la position du clic aux sphères et aux étiquettes projetées à l'écran.
  function pick(x, y) {
    let best = null, bestDist = Infinity;
    for (const node of nodes.values()) {
      if (node.opacity < 0.1 || !node.sr) continue;
      const hitSphere = Math.hypot(x - node.sx, y - node.sy) <= node.sr + 7;
      const top = node.sy + node.sr + 5;
      const hitLabel = node.shown && x >= node.sx - node.w / 2 && x <= node.sx + node.w / 2 && y >= top && y <= top + node.h;
      if (!hitSphere && !hitLabel) continue;
      const dist = camera.position.distanceToSquared(node.pos);
      if (dist < bestDist) { best = node; bestDist = dist; }
    }
    return best?.id ?? null;
  }

  const el = renderer.domElement;
  let down = null;
  el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) {
      const id = pick(e.clientX, e.clientY);
      if (id) onPick(id);
    }
    down = null;
  });
  el.addEventListener('dblclick', e => {
    const id = pick(e.clientX, e.clientY);
    if (id) onOpen(id);
  });
  el.addEventListener('pointermove', e => {
    if (e.buttons) return;
    const over = pick(e.clientX, e.clientY);
    el.style.cursor = over ? 'pointer' : 'grab';
    if (over !== hoverId) {
      hoverId = over;
      if (over) onHover?.(over);
    }
    controls.autoRotate = !REDUCED && !over;
  });
  controls.addEventListener('start', () => { flight = null; });
  addEventListener('resize', resize);

  frame();

  return {
    setData(newIndex, structureChanged) {
      idx = newIndex;
      syncObjects();
      apply();
    },
    setView(next) {
      const changed = next.selectedId && next.selectedId !== view.selectedId;
      view = { ...view, ...next };
      apply();
      if (changed && nodes.has(view.selectedId)) celebrate(nodes.get(view.selectedId));
    },
    setInset(next) {
      inset = next;
      resize();
    },
    pulse(id) {
      const node = nodes.get(id);
      if (node) node.pulse = 1;
    },
    flowStats() {
      if (!flow) return null;
      return { categories: flow.level.size - 1, links: flow.linkEdges.size };
    },
  };
}
