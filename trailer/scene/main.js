// ORBE — bande-annonce intégrale. Rendu déterministe : window.renderAt(t) dessine l'image à l'instant t.
// Toutes les durées viennent de la narration (cues.json) : chaque scène est calée sur les répliques qu'elle illustre.
import * as THREE from 'three';
import {
  W, H, C, GOLD, GOLD_HI, SKY, ROSE, VIOLET, WHITE, MINT, clamp, lerp, smooth, ease, easeOut, win, rng, gauss, v3,
  renderPass, composer, bloom, grade, camera, pointsMaterial, geo, makeStars, glow, lineMaterial, text, updateTexts, cameraPath,
  polyline, dotSphere, card, paintImage, textLines, avatarDisc, pulses,
} from './core.js';

await document.fonts.load('400 20px Inter'); await document.fonts.load('600 20px Inter');
const CUES = await (await fetch('cues.json')).json();
const L = Object.fromEntries(CUES.timeline.map(l => [l.id, l]));
const S = id => L[id].start, E = id => L[id].end;
const DUR = CUES.duration;
const SENT_PAUSE = .42;
/** Instant où commence la phrase n (0, 1, …) d'une réplique, estimé d'après la longueur des phrases. */
function sentence(id, n) {
  const line = L[id]; const parts = line.text.match(/[^.?!:]+[.?!:]+/g) ?? [line.text];
  const total = line.end - line.start - SENT_PAUSE * (parts.length - 1);
  const letters = parts.map(p => p.replace(/[^\p{L}]/gu, '').length + 4); const sum = letters.reduce((a, b) => a + b, 0);
  let t = line.start; for (let i = 0; i < n && i < parts.length; i++) t += total * letters[i] / sum + SENT_PAUSE;
  return t;
}
const typers = [];
/** Texte tapé lettre par lettre entre from et to. */
function typer(it, from, to, txt) { it.type = { from, to, text: txt }; typers.push(it); return it; }

// ---------- repères du montage ----------
const T = {
  dissolve: E('L02') + .1, black: E('L02') + 2.0, point: S('L03') - 1.3, split: E('L03') + .35, burst: E('L03') + 1.7,
  map: S('L05') - .45, sources: S('L07') - .4, share: S('L08') - .4,
  chat: S('L09') - .55, ai: S('L10') - .35, agents: S('L12') - .5, pc: S('L13') - .35, media: S('L14') - .35,
  people: S('L15') - .55, posts: S('L16') - .3, feed: S('L17') - .3, collab: S('L18') - .3,
  eco: S('L19') - .55, privacy: S('L20') - .3, converge: S('L21') - .4, impact: S('L22') - 3.0,
};
const SC = {};
let ENV = null;
window.loadEnvelope = arr => { ENV = arr; };
const envAt = frame => (ENV ? ENV[frame] ?? 0 : 0);

// ===================================================================================
// I — Le monde éparpillé
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2('#05070f', .012);
  const r = rng(11), N = 900;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(160,180,220,.10)'; g.fillRect(0, 0, 256, 320); g.strokeStyle = 'rgba(190,205,240,.55)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 318);
  g.fillStyle = 'rgba(200,215,245,.75)'; g.fillRect(22, 26, 120, 12);
  for (let i = 0; i < 11; i++) { g.fillStyle = `rgba(190,205,240,${.25 + (i % 3) * .1})`; g.fillRect(22, 62 + i * 21, 210 - (i * 37 % 90), 6); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uT: { value: 0 }, uDissolve: { value: 0 } },
    vertexShader: `attribute vec4 aData; uniform float uT, uDissolve; varying vec2 vUv; varying float vA;
      void main(){ vUv = uv; float s = aData.x; vec3 p = position; float ang = uT * (.05 + .1 * aData.y) + s * 6.28;
        mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); p.xy = R * p.xy; vec4 w = instanceMatrix * vec4(p, 1.);
        w.xyz += vec3(sin(uT * .13 + s * 40.), cos(uT * .11 + s * 23.), 0.) * 1.6;
        float dis = smoothstep(aData.w * .7, aData.w * .7 + .3, uDissolve);
        w.xyz += normalize(w.xyz + vec3(.001)) * uDissolve * (6. + 30. * aData.z) * dis;
        float flick = .55 + .45 * step(.15, fract(sin(floor(uT * 7. + s * 90.)) * 9137.));
        vA = flick * (1. - dis); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vA; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb * vA * .2, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 3), mat, N);
  const data = new Float32Array(N * 4), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    e.set((r() - .5) * 1.2, (r() - .5) * 1.4, (r() - .5) * .6); q.setFromEuler(e);
    m4.compose(v3((r() - .5) * 90, (r() - .5) * 46, -r() * 160 + 20), q, v3(1, 1, 1).multiplyScalar(.6 + r() * 1.1)); mesh.setMatrixAt(i, m4);
    data.set([r(), r(), r(), r()], i * 4);
  }
  mesh.geometry.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4));
  scene.add(mesh, makeStars(3000, 600, 3, 1.2, .35));
  const cam = cameraPath([[0, v3(0, 2, 46), v3(0, 0, -40), 46], [T.black, v3(3, -1, 4), v3(6, 0, -90), 40]]);
  SC.frag = { scene, update(t) { mat.uniforms.uT.value = t; mat.uniforms.uDissolve.value = smooth(T.dissolve, T.black - .2, t); cam(t); bloom.strength = .6; bloom.radius = .45; bloom.threshold = .3; } };
  text('eyebrow', 'Aujourd’hui', 1.0, E('L01') + .3, { y: 900 });
}

// ===================================================================================
// La galaxie de connaissances (partagée par plusieurs scènes)
// ===================================================================================
const galaxy = new THREE.Group();
const NET = {};
{
  const r = rng(7), N = 170000, R = 70;
  const end = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x, y, z, c;
    if (i < 9000) {
      const rr = Math.abs(gauss(r)) * 3.2, th = r() * 6.283, ph = Math.acos(2 * r() - 1);
      x = 13 + rr * Math.sin(ph) * Math.cos(th); y = rr * Math.cos(ph) * .7; z = 7 + rr * Math.sin(ph) * Math.sin(th); c = ROSE.clone().lerp(WHITE, r() * .35);
    } else {
      const arm = Math.floor(r() * 3), rad = R * Math.pow(r(), .62) + 2;
      const th = arm * 2.094 + Math.log(rad) * 2.1 + gauss(r) * (.32 - rad / R * .12), sp = 1 + rad * .06;
      x = Math.cos(th) * rad + gauss(r) * sp; z = Math.sin(th) * rad + gauss(r) * sp; y = gauss(r) * (2.2 * Math.exp(-rad / 30) + .5);
      const k = rad / R; c = GOLD_HI.clone().lerp(WHITE, smooth(.05, .35, k)).lerp(SKY, smooth(.3, .9, k)); if (r() < .08) c.lerp(VIOLET, .7);
    }
    end.set([x, y, z], i * 3); c.multiplyScalar(.55 + r() * .45); col.set([c.r, c.g, c.b], i * 3); size[i] = .35 + r() * r() * 1.6; seed[i] = r();
  }
  const mat = pointsMaterial({ uBirth: { value: 0 } },
    `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uScale, uTime, uAlpha, uBirth; varying vec3 vColor; varying float vA;
     void main(){ float rad = length(position.xz); float delay = clamp(rad / 75., 0., 1.) * .55 + aSeed * .2;
       float p = clamp((uBirth - delay) / .35, 0., 1.); float e = 1. - pow(1. - p, 3.);
       float a = (1. - e) * 3.2; mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a)); vec3 pos = position; pos.xz = R * pos.xz; pos = mix(pos * .015, pos, e);
       vec4 mv = modelViewMatrix * vec4(pos, 1.); gl_Position = projectionMatrix * mv;
       float tw = .75 + .25 * sin(uTime * 1.9 + aSeed * 71.);
       gl_PointSize = aSize * uScale * tw / -mv.z * (1. + (1. - e) * 1.5); vColor = aColor * .2 * (1. + (1. - e) * 1.5); vA = uAlpha * smoothstep(0., .15, p); }`);
  const pts = new THREE.Points(geo({ position: [end, 3], aColor: [col, 3], aSize: [size, 1], aSeed: [seed, 1] }), mat); pts.frustumCulled = false; galaxy.add(pts);
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
    LP.set([...nodes[a].toArray(), ...nodes[b].toArray()], k * 6);
    const rev = (nodes[a].length() / 75) * 5 + r() * 3; LR.set([rev, rev], k * 2);
    const c = a >= 1500 ? ROSE : nodes[a].length() < 25 ? GOLD : SKY; LC.set([c.r, c.g, c.b, c.r, c.g, c.b], k * 6);
  });
  const lmat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: `attribute float aRev; attribute vec3 aColor; uniform float uT; varying float vA; varying vec3 vC; void main(){ vA = smoothstep(aRev, aRev + 1.2, uT); vC = aColor; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uAlpha; varying float vA; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * vA * uAlpha * .22, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const lineObj = new THREE.LineSegments(geo({ position: [LP, 3], aRev: [LR, 1], aColor: [LC, 3] }), lmat); lineObj.frustumCulled = false; galaxy.add(lineObj);
  const segs = []; for (let i = 0; i < 2600; i++) { const [a, b] = links[Math.floor(r() * links.length)]; segs.push([nodes[a], nodes[b]]); }
  const pl = pulses(segs, 2600, new THREE.Color(1, .92, .72), 17, 2.6); galaxy.add(pl);
  NET.update = (t, tl, alpha = 1, birth = 1) => { mat.uniforms.uTime.value = t; mat.uniforms.uBirth.value = birth; mat.uniforms.uAlpha.value = alpha; lmat.uniforms.uT.value = tl; lmat.uniforms.uAlpha.value = alpha; pl.material.uniforms.uT.value = t; pl.material.uniforms.uA.value = .9 * alpha * smooth(1.5, 4, tl); };
  NET.nearest = p => { let best = 0, bd = 1e9; nodes.forEach((n, i) => { const d = n.distanceToSquared(p); if (d < bd && i < 1500) { bd = d; best = i; } }); return best; };
}
function adoptGalaxy(scene) { if (galaxy.parent !== scene) scene.add(galaxy); }

// Amas « Terre » : une connaissance et ses relations nommées
const cluster = new THREE.Group(); galaxy.add(cluster);
const CL = {};
{
  const center = NET.nodes[NET.nearest(v3(-28, 0, 14))].clone().add(v3(0, 1.5, 0));
  cluster.position.copy(center);
  const items = [['Terre', v3(0, 0, 0)], ['Système solaire', v3(-6.5, 2.4, -2)], ['Soleil', v3(5.5, 3.2, -3)], ['Lune', v3(6.8, -1.2, 2.5)], ['Géologie', v3(-5, -2.6, 3)], ['Astronomie', v3(-1.2, 4.6, 3.5)], ['Planètes', v3(1.8, -4, -3.4)]];
  const rel = [[1, 0, 'contient'], [0, 2, 'tourne autour'], [3, 0, 'satellite de'], [4, 0, 'étudie'], [5, 2, 'observe'], [6, 1, 'font partie de']];
  CL.nodes = items.map(([name, p], i) => { const s = glow(i === 0 ? GOLD_HI : C.CYAN, i === 0 ? 2.6 : 1.6, 0); s.position.copy(p); cluster.add(s); return { name, p, s }; });
  CL.lines = rel.map(([a, b]) => { const l = polyline([items[a][1], items[b][1]], C.ICE, 0); cluster.add(l); return l; });
  CL.rel = rel; CL.items = items;
  const target = center.clone().add(items[3][1]); const path = [v3(0, 0, 0)]; let cur = v3(0, 0, 0);
  for (let k = 1; k <= 7; k++) { const want = cur.clone().lerp(target, 1 / (8 - k)); const j = NET.nearest(want); cur = NET.nodes[j].clone(); path.push(cur); }
  path.push(target);
  CL.path = path; CL.pathLine = polyline(path, GOLD_HI, 0); galaxy.add(CL.pathLine);
  CL.pathGlows = path.map(p => { const s = glow(GOLD_HI, 1.6, 0); s.position.copy(p); galaxy.add(s); return s; });
}
function hideMapExtras() { cluster.visible = false; CL.pathLine.visible = false; CL.pathGlows.forEach(s => (s.visible = false)); }

// ===================================================================================
// II — Le point, puis la naissance de la galaxie
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(8000, 1400, 21, 1.4, .7));
  const point = glow(C.ICE, 1, 1), halo = glow(C.CYAN, 1, .5), pub = glow(SKY, 1, 0), priv = glow(ROSE, 1, 0);
  scene.add(halo, point, pub, priv);
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ vec2 p = vUv - .5; float h = exp(-abs(p.y) * 260.) * smoothstep(.5, 0., abs(p.x)); float v = exp(-abs(p.x) * 420.) * smoothstep(.5, 0., abs(p.y)) * .5; gl_FragColor = vec4(vec3(.75, .9, 1.) * (h + v) * uA, 1.); }' }));
  scene.add(flare);
  const P = T.point, B = T.burst;
  const cam = cameraPath([[T.black, v3(0, 0, 9), v3(0, 0, 0), 40], [T.split, v3(0, .6, 7.5), v3(0, 0, 0), 40], [B + .6, v3(0, 3, 16), v3(0, 0, 0), 46], [S('L04') - .3, v3(40, 60, 150), v3(0, 0, 0), 48], [T.map, v3(-95, 78, 130), v3(0, -4, 0), 46]]);
  SC.galaxy = { scene, update(t) {
    adoptGalaxy(scene); hideMapExtras();
    galaxy.scale.setScalar(1); galaxy.position.set(0, 0, 0); galaxy.rotation.y = t * .018;
    NET.update(t, t - B - .8, 1, smooth(B, B + 8, t)); galaxy.visible = t > B - .1;
    const on = smooth(P, P + .5, t), breathe = 1 + .06 * Math.sin(t * 2.2);
    point.scale.setScalar((.45 + 1.2 * smooth(P, P + .12, t) * (1 - smooth(P + .12, P + 1.5, t))) * breathe * on); point.material.opacity = on;
    halo.scale.setScalar(2.6 * on * breathe * (1 + 1.2 * smooth(B - .8, B + .6, t))); halo.material.opacity = .4 * on * (1 - .5 * smooth(B + 5, B + 11, t));
    flare.scale.set(30, 30, 1); flare.lookAt(camera.position);
    flare.material.uniforms.uA.value = .55 * smooth(P, P + .12, t) * (1 - smooth(P + .12, P + 1.9, t)) + .45 * smooth(B - .2, B + .1, t) * (1 - smooth(B + .1, B + 2, t));
    const sp = easeOut(smooth(T.split, T.split + 1.6, t)), fade = 1 - smooth(B + 2.5, B + 6, t);
    pub.position.set(-1.6 * sp, .15 * sp, 0); priv.position.set(1.6 * sp, -.15 * sp, 0); pub.scale.setScalar(1.1 * sp); priv.scale.setScalar(.9 * sp);
    pub.material.opacity = sp * fade; priv.material.opacity = sp * fade;
    cam(t); bloom.strength = .85 + .9 * smooth(B - .2, B + .05, t) * (1 - smooth(B + .1, B + 1.6, t)); bloom.radius = .5; bloom.threshold = .35;
  } };
  text('eyebrow', 'Public', T.split + .5, B - .1, { x: W / 2 - 150, y: 610, fi: .4, fo: .3, drift: 0 });
  text('eyebrow', 'Privé', T.split + .5, B - .1, { x: W / 2 + 150, y: 610, fi: .4, fo: .3, drift: 0 });
  text('logo-word', 'ORBE', S('L04') - 3.0, S('L04') + 1.6, { fi: 1.0, fo: 1.0, drift: 0, track: .9 });
}

// ===================================================================================
// 01 · LA CARTE — points, relations, navigation, recherche
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(8000, 1400, 23, 1.3, .65));
  const s2 = sentence('L05', 1), s3 = sentence('L05', 2), a6 = S('L06'), back = sentence('L06', 0) + 1.6, search = sentence('L06', 1);
  CL.nodes.forEach((n, i) => { const it = text(i === 0 ? 'node-main' : 'node', n.name, s2 + i * .18, back - .2, { fi: .4, fo: .5, drift: 0 }); it.anchorFn = () => n.s.getWorldPosition(new THREE.Vector3()); it.dy = -24; });
  CL.rel.forEach(([a, b, label], k) => { const it = text('rel', label, s3 + .2 + k * .2, back - .2, { fi: .4, fo: .5, drift: 0 }); it.anchorFn = () => cluster.localToWorld(CL.items[a][1].clone().lerp(CL.items[b][1], .5)); });
  text('view-toggle', '<span>Dossier</span><span class="on">Tout voir</span>', back - .3, search - .2, { y: 150, fi: .4, fo: .4, drift: 0 });
  typer(text('searchbar', '', search - .1, T.sources - .1, { y: 150, fi: .35, fo: .4, drift: 0 }), search + .1, search + .9, 'Lune');
  SC.map = { scene, update(t) {
    adoptGalaxy(scene); galaxy.scale.setScalar(1); galaxy.position.set(0, 0, 0); galaxy.rotation.y = t * .018; galaxy.visible = true;
    const close = smooth(s2 - .8, s2 + .4, t) * (1 - smooth(back - .6, back + .6, t));
    NET.update(t, 40, 1 - .6 * close, 1); cluster.visible = true;
    const focus = cluster.getWorldPosition(new THREE.Vector3()), far = v3(0, 0, 0);
    CL.nodes.forEach((n, i) => { n.s.material.opacity = smooth(s2 + i * .18, s2 + i * .18 + .4, t) * (1 - .6 * smooth(back - .4, back + .6, t)); });
    CL.lines.forEach((l, k) => { l.material.opacity = .7 * smooth(s3 + k * .2, s3 + k * .2 + .5, t) * (1 - .6 * smooth(back - .4, back + .6, t)); });
    const pk = smooth(search + 1.0, search + 2.4, t), n = CL.path.length;
    CL.pathLine.visible = true; CL.pathLine.geometry.setDrawRange(0, Math.max(2, Math.ceil(pk * n))); CL.pathLine.material.opacity = .95 * smooth(search + .9, search + 1.1, t);
    CL.pathGlows.forEach((s, i) => { s.visible = true; s.material.opacity = smooth(search + 1 + i / n * 1.4, search + 1.15 + i / n * 1.4, t); s.scale.setScalar(1.6 + .5 * Math.sin(t * 5 + i)); });
    cameraPath([
      [T.map, v3(-95, 78, 130), far, 46], [s2 - .2, focus.clone().add(v3(-10, 14, 34)), focus, 44], [a6, focus.clone().add(v3(4, 7, 22)), focus, 44],
      [sentence('L06', 0) + .9, focus.clone().add(v3(2, 3, 10)), focus, 46], [back + 1.2, v3(20, 150, 175), far, 46], [search + .8, v3(-30, 120, 150), far, 44], [T.sources, focus.clone().add(v3(-10, 40, 70)), focus.clone().lerp(far, .5), 44],
    ])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
}

// ===================================================================================
// 01 · LA CARTE — sources, images, schémas, fiabilité ; les savoirs du monde
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 31, 1.2, .55));
  const a = S('L07'), b = sentence('L07', 1);
  const node = glow(GOLD_HI, 2.4, 0), nodeHalo = glow(GOLD, 5, 0); scene.add(nodeHalo, node);
  const cImg = card(520, 380, 7.2, (g, w, h) => { g.font = '600 26px Inter'; g.fillStyle = '#9FD8FF'; g.fillText('IMAGE', 32, 52); paintImage(g, 32, 76, w - 64, h - 110, 2); });
  const cSch = card(520, 380, 7.2, (g) => {
    g.font = '600 26px Inter'; g.fillStyle = '#9FD8FF'; g.fillText('SCHÉMA', 32, 52); g.strokeStyle = 'rgba(234,246,255,.8)'; g.lineWidth = 3;
    const P = [[260, 210], [110, 140], [410, 140], [130, 310], [390, 310]]; P.slice(1).forEach(([x, y]) => { g.beginPath(); g.moveTo(260, 210); g.lineTo(x, y); g.stroke(); });
    P.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, i ? 16 : 26, 0, 7); g.fillStyle = i ? '#6FC2FF' : '#F2C14E'; g.fill(); });
  });
  const cSrc = card(520, 380, 7.2, (g) => {
    g.font = '600 26px Inter'; g.fillStyle = '#9FD8FF'; g.fillText('SOURCES', 32, 52);
    ['Wikipédia', 'GeoNames', 'ESA · Gaia DR3'].forEach((s, i) => { g.strokeStyle = 'rgba(242,193,78,.7)'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(32, 90 + i * 84, 300, 58, 29); g.stroke(); g.fillStyle = '#F6DDA0'; g.font = '500 28px Inter'; g.fillText(s, 58, 129 + i * 84); });
  });
  const cRel = card(520, 380, 7.2, (g) => {
    g.font = '600 26px Inter'; g.fillStyle = '#9FD8FF'; g.fillText('FIABILITÉ', 32, 52);
    const lv = [['non vérifié', '#9AA3BF'], ['probable', '#7FD1FF'], ['vérifié', '#7BE0B5'], ['contesté', '#FFB454'], ['faux', '#FF6B7A']];
    lv.forEach(([n, c], i) => { g.fillStyle = c; g.globalAlpha = i === 2 ? 1 : .35; g.fillRect(32 + i * 92, 100, 80, 14); g.globalAlpha = 1; g.font = `${i === 2 ? 600 : 400} 22px Inter`; g.fillStyle = i === 2 ? c : 'rgba(220,230,250,.6)'; g.fillText(n, 32 + i * 92, 150 + (i % 2) * 30); });
    g.font = '500 24px Inter'; g.fillStyle = 'rgba(220,230,250,.75)'; g.fillText('Historique : v1 · v2 · v3', 32, 290);
  });
  const cards = [cSrc, cImg, cSch, cRel].map((m, i) => { const grp = new THREE.Group(); grp.add(m); scene.add(grp); return { m, grp, a0: i / 4 * 6.283 + .4, t0: a + .3 + i * .45 }; });
  const r = rng(41), GN = 26000, gp = new Float32Array(GN * 3), gc = new Float32Array(GN * 3), gs = new Float32Array(GN), ge = new Float32Array(GN);
  for (let i = 0; i < GN; i++) {
    let x = 0, y = 0, z = 0, ok = false;
    while (!ok) { const u = r() * 2 - 1, th = r() * 6.283; x = Math.sqrt(1 - u * u) * Math.cos(th); y = u; z = Math.sqrt(1 - u * u) * Math.sin(th); const land = Math.sin(x * 4.1 + Math.sin(z * 3)) + Math.cos(y * 3.3 + x * 2) + Math.sin(z * 5 + y); ok = land > .9 || r() < .03; }
    gp.set([x * 9, y * 9, z * 9], i * 3); const c = C.CYAN.clone().lerp(WHITE, r() * .5).multiplyScalar(.9); gc.set([c.r, c.g, c.b], i * 3); gs[i] = .5 + r() * .6; ge[i] = r();
  }
  const globe = new THREE.Points(geo({ position: [gp, 3], aColor: [gc, 3], aSize: [gs, 1], aSeed: [ge, 1] }), pointsMaterial()); globe.position.set(-27, 0, -10); scene.add(globe);
  const SN = 90000, sp = new Float32Array(SN * 3), sc = new Float32Array(SN * 3), ss = new Float32Array(SN), se = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { const x = (r() - .5) * 500; sp.set([x, gauss(r) * 16 + Math.sin(x * .01) * 10, -60 - r() * 200], i * 3); const c = WHITE.clone().lerp(r() < .5 ? GOLD_HI : SKY, r() * .6).multiplyScalar(.15 + r() * .45); sc.set([c.r, c.g, c.b], i * 3); ss[i] = .5 + r() * r() * 2; se[i] = r(); }
  const band = new THREE.Points(geo({ position: [sp, 3], aColor: [sc, 3], aSize: [ss, 1], aSeed: [se, 1] }), pointsMaterial()); band.frustumCulled = false; scene.add(band);
  SC.sources = { scene, update(t) {
    const on = smooth(a - .2, a + .4, t), out = smooth(b - .5, b + .6, t);
    node.material.opacity = on * (1 - out); nodeHalo.material.opacity = .15 * on * (1 - out); node.scale.setScalar(2.4 + .2 * Math.sin(t * 3));
    cards.forEach(c => {
      const ang = c.a0 + (t - a) * .16; c.grp.position.set(Math.cos(ang) * 9.5, Math.sin(ang * 2) * 1.2 + (c.a0 > 3 ? -2.5 : 2.5), Math.sin(ang) * 4);
      c.grp.lookAt(camera.position); c.m.material.opacity = smooth(c.t0, c.t0 + .5, t) * (1 - out); c.m.scale.setScalar(lerp(.85, 1, easeOut(smooth(c.t0, c.t0 + .6, t))));
    });
    globe.rotation.y = t * .25; globe.material.uniforms.uTime.value = t; globe.material.uniforms.uAlpha.value = .45 * smooth(b + .1, b + 1.2, t);
    band.material.uniforms.uTime.value = t; band.material.uniforms.uAlpha.value = smooth(b + 1.6, b + 2.8, t);
    cameraPath([[T.sources, v3(0, 2, 30), v3(0, 0, 0), 44], [b - .3, v3(4, 3, 24), v3(0, 0, 0), 44], [b + 1.4, v3(-6, 2, 34), v3(-14, 0, -10), 44], [T.share, v3(18, 4, 44), v3(0, 0, -30), 46]])(t);
    bloom.strength = .7; bloom.radius = .5; bloom.threshold = .55;
  } };
  text('label', 'Lieux de la Terre · GeoNames', b + .5, T.share - .2, { x: 520, y: 820, fi: .5, fo: .4, drift: 0 });
  text('big-num', '1 811 709 771', b + 1.8, T.share - .1, { x: 1380, y: 420, fi: .7, fo: .4, drift: 10 });
  text('eyebrow', 'objets célestes · catalogue ESA Gaia DR3', b + 2.1, T.share - .1, { x: 1380, y: 510, fi: .7, fo: .4, drift: 6 });
}

// ===================================================================================
// 01 · LA CARTE — partager les connaissances non personnelles (en développement)
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(7000, 1400, 51, 1.3, .6));
  const r = rng(53), minis = [];
  const spots = [v3(70, 18, -30), v3(80, -22, 10), v3(40, 30, 40), v3(55, -30, -55)];
  spots.forEach((p, k) => {
    const n = 4000, pp = new Float32Array(n * 3), pc = new Float32Array(n * 3), ps = new Float32Array(n), pe = new Float32Array(n);
    for (let i = 0; i < n; i++) { const rad = 9 * Math.pow(r(), .6), th = Math.floor(r() * 2) * 3.14 + Math.log(rad + 1) * 2.2 + gauss(r) * .3; pp.set([Math.cos(th) * rad, gauss(r) * .5, Math.sin(th) * rad], i * 3); const c = SKY.clone().lerp(WHITE, r() * .5).multiplyScalar(.55); pc.set([c.r, c.g, c.b], i * 3); ps[i] = .5 + r(); pe[i] = r(); }
    const m = new THREE.Points(geo({ position: [pp, 3], aColor: [pc, 3], aSize: [ps, 1], aSeed: [pe, 1] }), pointsMaterial()); m.position.copy(p); m.rotation.set(.4 * k, k, .2); scene.add(m); minis.push(m);
  });
  const lines = spots.map(p => { const mid = p.clone().multiplyScalar(.5).add(v3(0, 14, 0)); const curve = new THREE.QuadraticBezierCurve3(v3(-14, 0, -12), mid, p); return { curve, l: polyline(curve.getPoints(60), GOLD_HI, 0) }; });
  lines.forEach(o => scene.add(o.l));
  const flow = pulses(lines.flatMap(o => { const pts = o.curve.getPoints(12); return pts.slice(1).map((q, i) => [pts[i], q]); }), 700, GOLD_HI, 55, 2.2); scene.add(flow);
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(6.5, 1)), lineMaterial(ROSE, 0)); scene.add(shell);
  const a = S('L08');
  SC.share = { scene, update(t) {
    adoptGalaxy(scene); hideMapExtras();
    galaxy.scale.setScalar(.6); galaxy.position.set(-14, 0, -12); galaxy.rotation.y = t * .02; galaxy.visible = true; NET.update(t, 40, .9, 1);
    galaxy.updateMatrixWorld(); shell.position.copy(galaxy.localToWorld(v3(13, 0, 7))); shell.rotation.y = t * .2; shell.material.opacity = .6 * smooth(a + .2, a + 1, t);
    minis.forEach((m, i) => { m.material.uniforms.uTime.value = t; m.material.uniforms.uAlpha.value = smooth(a + .4 + i * .3, a + 1.2 + i * .3, t); });
    lines.forEach((o, i) => { o.l.material.opacity = .55 * smooth(a + 1.4 + i * .35, a + 2.2 + i * .35, t); });
    flow.material.uniforms.uT.value = t; flow.material.uniforms.uA.value = smooth(a + 2, a + 3, t);
    cameraPath([[T.share, v3(-30, 70, 120), v3(10, 0, -10), 46], [T.chat, v3(20, 50, 150), v3(25, 0, -5), 48]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('tag', 'Connaissances publiques · partagées', a + 2.0, T.chat - .2, { fi: .5, fo: .4, drift: 4 }).anchor = v3(28, 16, 0);
  text('tag tag-rose', 'Privé · jamais partagé', a + 1.0, T.chat - .2, { fi: .5, fo: .4, drift: 4 }).anchorFn = () => shell.position.clone().add(v3(0, -9, 0));
}

// ===================================================================================
// 02 · L'INTELLIGENCE — plus qu'un chatbot
// ===================================================================================
const PROVIDERS = ['Claude', 'ChatGPT', 'Gemini', 'Le Chat', 'DeepSeek', 'Grok', 'Perplexity'];
function entity(scene, geometry, color) {
  const grp = new THREE.Group();
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial(color, 0));
  const inner = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const h = glow(color, 7, 0); grp.add(inner, wire, h); scene.add(grp);
  return { grp, set(o, act = 0) { wire.material.opacity = o * (.75 + .25 * act); inner.material.opacity = o * (.07 + .2 * act); h.material.opacity = o * (.25 + .4 * act); h.scale.setScalar(7 + 4 * act); } };
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 61, 1.3, .6));
  const a = S('L09'), b = sentence('L09', 1);
  const r = rng(63), N = 6000, from = new Float32Array(N * 3), to = new Float32Array(N * 3), sd = new Float32Array(N);
  const targets = [v3(-16, 6, 0), v3(16, 6, 0), v3(0, -12, 0), v3(-28, -6, -14), v3(28, -6, -14)];
  for (let i = 0; i < N; i++) { from.set([(r() - .5) * 26, (r() - .5) * 1.6 - 8, (r() - .5) * .6], i * 3); const tg = targets[i % 5]; const u = r() * 2 - 1, th = r() * 6.283, rr = 2.6 * Math.cbrt(r()); to.set([tg.x + Math.sqrt(1 - u * u) * Math.cos(th) * rr, tg.y + u * rr, tg.z + Math.sqrt(1 - u * u) * Math.sin(th) * rr], i * 3); sd[i] = r(); }
  const pm = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uT: { value: 0 }, uScale: { value: H * .55 }, uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aTo; attribute float aSeed; uniform float uK, uT, uScale; varying float vA; void main(){ float k = smoothstep(aSeed * .4, aSeed * .4 + .6, uK); k = k * k * (3. - 2. * k);
      vec3 p = mix(position, aTo, k) + vec3(sin(uT * 2. + aSeed * 30.), cos(uT * 1.7 + aSeed * 20.), 0.) * .25 * (1. - k); p.y += sin(k * 3.14159) * 4. * (aSeed - .5);
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = 1.4 * uScale / -mv.z; vA = .7 + .3 * sin(uT * 3. + aSeed * 50.); }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(.65, .85, 1.) * a * a * vA * uA * .6, 1.); }` });
  const parts = new THREE.Points(geo({ position: [from, 3], aTo: [to, 3], aSeed: [sd, 1] }), pm); parts.frustumCulled = false; scene.add(parts);
  const geoms = [new THREE.IcosahedronGeometry(3, 0), new THREE.OctahedronGeometry(3.4, 0), new THREE.DodecahedronGeometry(3, 0), new THREE.TetrahedronGeometry(3, 0), new THREE.BoxGeometry(3.6, 3.6, 3.6)];
  const cols = [SKY, GOLD, VIOLET, MINT, ROSE];
  const ents = targets.map((p, i) => { const e = entity(scene, geoms[i], cols[i]); e.grp.position.copy(p); return e; });
  const links = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { const l = polyline([targets[i], targets[j]], WHITE, 0); scene.add(l); links.push(l); }
  SC.chat = { scene, update(t) {
    pm.uniforms.uT.value = t; pm.uniforms.uK.value = smooth(b - .3, b + 2.2, t); pm.uniforms.uA.value = smooth(b - .5, b - .1, t) * (1 - smooth(b + 2.2, b + 3.2, t));
    ents.forEach((e, i) => { e.grp.rotation.set(t * .3 + i, t * .45 + i * 2, 0); e.set(smooth(b + 1.4 + i * .15, b + 2.4 + i * .15, t)); });
    links.forEach((l, i) => { l.material.opacity = .12 * smooth(b + 2.4 + i * .05, b + 3.2 + i * .05, t); });
    cameraPath([[T.chat, v3(0, -6, 34), v3(0, -7, 0), 44], [b, v3(0, -4, 40), v3(0, -5, 0), 44], [T.ai, v3(0, 2, 74), v3(0, 0, 0), 44]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('chat chat-user', 'Résume ce que je sais sur la Lune.', a - .2, b - .1, { x: W / 2 + 180, y: 560, fi: .4, fo: .3, drift: 8 });
  typer(text('chat chat-orbe', '', a + .9, b - .1, { x: W / 2 - 160, y: 680, fi: .4, fo: .3, drift: 8 }), a + 1.1, b - .6, 'D’après ta carte : la Lune, satellite de la Terre, et ses sources…');
}

// ===================================================================================
// 02 · L'INTELLIGENCE — plusieurs IA qui se répartissent le travail ; la carte comme mémoire
// ===================================================================================
function imageShader(seed) {
  return new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uD: { value: 0 }, uA: { value: 0 }, uSeed: { value: seed } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT, uD, uA, uSeed; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 13.1) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 6; i++){ v += a * n(p); p *= 2.03; a *= .5; } return v; }
      void main(){ vec2 p = vUv * vec2(16., 9.) / 3.; float q = fbm(p + fbm(p + uT * .05) * 1.8);
        vec3 a = mix(vec3(.04, .05, .16), vec3(.25, .45, .95), smoothstep(.25, .7, q)); a = mix(a, vec3(1., .78, .4), smoothstep(.62, .9, q)); a = mix(a, vec3(.95, .45, .6), smoothstep(.55, .8, fbm(p * 1.7 - 3.)) * .45);
        a += step(.996, h(floor(vUv * vec2(640., 360.)))) * smoothstep(.4, .9, q);
        vec3 noise = vec3(h(floor(vUv * vec2(320., 180.)) + floor(uT * 24.))); vec3 c = mix(noise * .6, a, smoothstep(0., 1., uD));
        float edge = smoothstep(0., .02, vUv.x) * smoothstep(1., .98, vUv.x) * smoothstep(0., .03, vUv.y) * smoothstep(1., .97, vUv.y); gl_FragColor = vec4(c * edge, uA * edge); }` });
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 71, 1.3, .6));
  const a = S('L10'), s2 = sentence('L10', 1), aExec = s2 + 2.8, aImg = s2 + 4.6, m = S('L11');
  const P = [v3(-16, 6, 0), v3(16, 6, 0), v3(0, -12, 0)];
  const E3 = [entity(scene, new THREE.IcosahedronGeometry(3, 0), SKY), entity(scene, new THREE.OctahedronGeometry(3.4, 0), GOLD), entity(scene, new THREE.DodecahedronGeometry(3, 0), VIOLET)];
  E3.forEach((e, i) => e.grp.position.copy(P[i]));
  PROVIDERS.forEach((p, i) => { const ang = i / PROVIDERS.length * 6.283; text('provider', p, a + .2 + i * .12, s2 + .4, { fi: .35, fo: .4, drift: 0 }).anchor = v3(Math.cos(ang) * 30, Math.sin(ang) * 15 - 1, 0); });
  const beams = [[0, 1], [1, 2], [2, 0]].map(([x, y]) => { const l = polyline([P[x], P[y]], WHITE, 0); scene.add(l); return l; });
  const flow = [0, 1, 2].map(i => { const f = pulses([[P[i], P[(i + 1) % 3]]], 260, new THREE.Color(1, .94, .8), 70 + i, 1.8); scene.add(f); return f; });
  const r = rng(77), tree = [];
  (function grow(p, dir, depth, t0) { if (depth > 5) return; const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) { const d = dir.clone().applyAxisAngle(v3(0, 0, 1), (i - (n - 1) / 2) * .7 + (r() - .5) * .3).applyAxisAngle(v3(0, 1, 0), (r() - .5) * 1.2).normalize(); const q = p.clone().add(d.multiplyScalar(4.2 - depth * .45)); tree.push([p, q, t0 + depth * .26 + r() * .1]); grow(q, d, depth + 1, t0); } })(P[1].clone().add(v3(2.5, 3.5, 0)), v3(.4, 1, 0).normalize(), 0, aExec + .1);
  const tmat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uFade: { value: 1 } },
    vertexShader: `attribute float aRev; uniform float uT; varying float vA; void main(){ vA = smoothstep(aRev, aRev + .3, uT); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uFade; varying float vA; void main(){ gl_FragColor = vec4(vec3(1., .82, .45) * vA * uFade * .6, 1.); }`, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const TP = new Float32Array(tree.length * 6), TR = new Float32Array(tree.length * 2); tree.forEach(([p, q, rev], k) => { TP.set([...p.toArray(), ...q.toArray()], k * 6); TR.set([rev, rev], k * 2); });
  scene.add(new THREE.LineSegments(geo({ position: [TP, 3], aRev: [TR, 1] }), tmat));
  const img = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), imageShader(4)); img.position.set(0, -3, 6); scene.add(img);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(16.3, 9.3)), lineMaterial(VIOLET, 0)); frame.position.copy(img.position); scene.add(frame);
  const mapG = new THREE.Group(); mapG.position.set(0, -2, -18); scene.add(mapG);
  const mpos = new Float32Array(420 * 3), mcol = new Float32Array(420 * 3), msz = new Float32Array(420), mse = new Float32Array(420);
  for (let i = 0; i < 420; i++) { const an = r() * 6.283, rr = 4 + Math.pow(r(), .7) * 28; mpos.set([Math.cos(an) * rr, gauss(r) * 1.2, Math.sin(an) * rr * .55], i * 3); const c = SKY.clone().lerp(WHITE, r() * .4).multiplyScalar(1.2); mcol.set([c.r, c.g, c.b], i * 3); msz[i] = 2 + r() * 2; mse[i] = r(); }
  const mmat = pointsMaterial(); mapG.add(new THREE.Points(geo({ position: [mpos, 3], aColor: [mcol, 3], aSize: [msz, 1], aSeed: [mse, 1] }), mmat));
  const reads = pulses(P.map(p => [v3(0, -2, -18).add(v3((r() - .5) * 30, 0, (r() - .5) * 10)), p]), 300, C.CYAN, 79, 1.6); scene.add(reads);
  const addT = sentence('L11', 0) + 3.4;
  const added = [v3(-9, 1, 3), v3(6, .5, -4), v3(14, 1.5, 6), v3(-3, -.5, -8), v3(2, 1, 9)].map((p, i) => { const g = glow(GOLD_HI, 2.2, 0); g.position.copy(p); mapG.add(g); return { g, p, from: P[i % 3].clone().sub(mapG.position), t0: addT + i * .35 }; });
  text('tag', 'Ajouté par l’IA · visible et vérifiable', added[2].t0 + .6, T.agents - .2, { fi: .5, fo: .4, drift: 6 }).anchor = v3(14, 5.5, 6).add(mapG.position);
  text('eyebrow', 'La carte · mémoire des IA', m + .3, T.agents - .2, { y: 960, fi: .6, fo: .4, drift: 6 });
  SC.ai = { scene, update(t) {
    const ons = [0, 1, 2].map(i => smooth(a + .1 + i * .4, a + .8 + i * .4, t)), recede = 1 - .75 * smooth(m - .2, m + 1.2, t);
    E3.forEach((e, i) => { e.grp.rotation.set(t * .3 + i, t * .45 + i * 2, 0); e.set(ons[i], [win(t, s2, aExec, .3, .5), win(t, aExec, aImg, .3, .5), win(t, aImg, m + .4, .3, .6)][i]); });
    beams.forEach((l, i) => { l.material.opacity = .22 * smooth(a + 1.4 + i * .3, a + 2.2 + i * .3, t) * recede; });
    flow.forEach((f, i) => { f.material.uniforms.uT.value = t; f.material.uniforms.uA.value = .4 * smooth([s2 + .3, aExec, aImg][i], [s2 + .9, aExec + .6, aImg + .6][i], t) * recede; });
    tmat.uniforms.uT.value = t; tmat.uniforms.uFade.value = 1 - smooth(m - .3, m + .8, t) * .7;
    img.material.uniforms.uT.value = t; img.material.uniforms.uD.value = smooth(aImg + .3, aImg + 2.2, t); img.material.uniforms.uA.value = win(t, aImg, m + 1.6, .4, .8); frame.material.opacity = .7 * win(t, aImg, m + 1.6, .4, .8);
    mmat.uniforms.uTime.value = t; mmat.uniforms.uAlpha.value = smooth(m - .2, m + 1, t);
    reads.material.uniforms.uT.value = t; reads.material.uniforms.uA.value = .8 * win(t, m + .6, addT, .5, .5);
    added.forEach(o => { const k = easeOut(smooth(o.t0, o.t0 + 1, t)); o.g.position.lerpVectors(o.from, o.p, k); o.g.material.opacity = smooth(o.t0, o.t0 + .2, t); o.g.scale.setScalar(2.2 + .6 * Math.sin(t * 4 + o.t0)); });
    cameraPath([[T.ai, v3(0, 2, 74), v3(0, 0, 0), 44], [s2, v3(0, 0, 58), v3(0, 0, 0), 44], [aExec - .2, v3(-8, 4, 48), v3(-6, 2, 0), 44], [aImg - .2, v3(22, 15, 50), v3(16, 13, 0), 44], [m, v3(2, -2, 32), v3(0, -3, 6), 44], [m + 2.2, v3(0, 26, 30), v3(0, -3, -16), 46], [T.agents, v3(-14, 18, 20), v3(2, -2, -18), 48]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  typer(text('question', '', s2 - .1, s2 + 1.6, { y: 860, fi: .3, fo: .4, drift: 0 }), s2, s2 + .9, 'Comment naissent les étoiles ?');
  [['Objectif', 'Expliquer la formation des étoiles'], ['Contexte', 'Public curieux, sans prérequis'], ['Contraintes', 'Sources fiables, étapes dans l’ordre'], ['Format', 'Explication structurée et illustrée']]
    .forEach(([hd, bd], i) => text('block', `<b>${hd}</b>${bd}`, s2 + 1.4 + i * .2, aExec + .2, { x: 330 + i * 420, y: 870, fi: .35, fo: .4, drift: 18 }));
}

// ===================================================================================
// 02 · L'INTELLIGENCE — agents et sous-agents (en développement)
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 81, 1.3, .6));
  const a = sentence('L12', 1);
  const mission = new THREE.Group(); const mCore = glow(GOLD_HI, 4, 0), mRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, .06, 8, 96), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  mission.add(mCore, mRing); mission.position.set(0, 14, 0); scene.add(mission);
  const TASKS = ['Recherche', 'Analyse', 'Rédaction', 'Code', 'Images', 'Vérification'];
  const MODELS = [['Raisonnement', SKY, new THREE.IcosahedronGeometry(2.4, 0)], ['Code', MINT, new THREE.TetrahedronGeometry(2.6, 0)], ['Vision', VIOLET, new THREE.DodecahedronGeometry(2.4, 0)], ['Images', ROSE, new THREE.BoxGeometry(3, 3, 3)], ['Vérification', GOLD, new THREE.OctahedronGeometry(2.7, 0)]];
  const assign = [0, 2, 0, 1, 3, 4];
  const mp = MODELS.map((_, i) => v3((i - 2) * 15, -12, (i % 2 ? -4 : 2)));
  const models = MODELS.map(([name, col, g], i) => { const e = entity(scene, g, col); e.grp.position.copy(mp[i]); text('label', name, a + .6 + i * .12, T.pc - .2, { fi: .4, fo: .4, drift: 0 }).anchor = mp[i].clone().add(v3(0, -5, 0)); return e; });
  const tp = TASKS.map((_, i) => v3((i - 2.5) * 9, 3, 4));
  const tasks = TASKS.map((name, i) => {
    const s = glow(C.ICE, 2, 0); scene.add(s); const l1 = polyline([mission.position, tp[i]], C.ICE, 0), l2 = polyline([tp[i], mp[assign[i]]], MODELS[assign[i]][1], 0); scene.add(l1, l2);
    text('task', name, a + 1.1 + i * .15, T.pc - .2, { fi: .35, fo: .4, drift: 0 }).anchorFn = () => s.position.clone().add(v3(0, 2.6, 0));
    return { s, l1, l2, t0: a + 1.0 + i * .15, t1: a + 2.4 + i * .2, t2: a + 3.6 + i * .18 };
  });
  tasks.forEach((tk, i) => { text('check', i === 5 ? '↺ corrigé' : '✓', tk.t2 + .4, T.pc - .2, { fi: .25, fo: .4, drift: 0 }).anchorFn = () => tk.s.position.clone().add(v3(1.9, .6, 0)); });
  text('label', 'Mission', a - .1, T.pc - .2, { fi: .4, fo: .4, drift: 0 }).anchor = v3(0, 18.2, 0);
  SC.agents = { scene, update(t) {
    mCore.material.opacity = smooth(T.agents, T.agents + .8, t); mCore.scale.setScalar(4 + .4 * Math.sin(t * 3)); mRing.material.opacity = .8 * smooth(T.agents + .3, T.agents + 1, t); mRing.lookAt(camera.position);
    models.forEach((e, i) => { e.grp.rotation.set(t * .3 + i, t * .4 + i, 0); const busy = tasks.some((tk, k) => assign[k] === i && t > tk.t1 + .4 && t < tk.t2); e.set(smooth(a + .4 + i * .12, a + 1 + i * .12, t), busy ? 1 : 0); });
    tasks.forEach((tk, i) => {
      const toModel = easeOut(smooth(tk.t1, tk.t1 + .8, t)), back = easeOut(smooth(tk.t2, tk.t2 + .7, t));
      const p = mission.position.clone().lerp(tp[i], easeOut(smooth(tk.t0, tk.t0 + .7, t)));
      if (t > tk.t1) p.copy(tp[i].clone().lerp(mp[assign[i]].clone().add(v3(0, 4, 0)), toModel * (1 - back)));
      tk.s.position.copy(p); tk.s.material.opacity = smooth(tk.t0, tk.t0 + .3, t); tk.s.material.color.copy(t > tk.t2 + .3 ? (i === 5 && t < tk.t2 + 1.2 ? C.AMBER : MINT) : C.ICE);
      tk.l1.material.opacity = .4 * smooth(tk.t0, tk.t0 + .5, t); tk.l2.material.opacity = .5 * smooth(tk.t1, tk.t1 + .5, t) * (1 - .6 * back);
    });
    cameraPath([[T.agents, v3(0, 14, 44), v3(0, 10, 0), 46], [a + 1.5, v3(0, 4, 62), v3(0, 2, 0), 46], [T.pc, v3(-12, 0, 58), v3(0, -2, 0), 46]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
}

// ===================================================================================
// 02 · L'INTELLIGENCE — agir sur l'ordinateur, avec ton accord (en développement)
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(5000, 1400, 91, 1.2, .5));
  const a = S('L13');
  const desk = new THREE.Group(); scene.add(desk);
  const rect = (w, h, x, y, col) => { const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), lineMaterial(col, 0)); l.position.set(x, y, 0); desk.add(l); return l; };
  const screen = rect(40, 24, 0, 0, C.CYAN); const taskbar = polyline([v3(-20, -10.5, 0), v3(20, -10.5, 0)], C.CYAN, 0); desk.add(taskbar);
  const folders = [[-15, 6], [-15, 1], [-15, -4]].map(([x, y]) => rect(3.4, 2.6, x, y, C.ICE));
  const win1 = rect(22, 14, 4, 1, C.ICE); const winBar = polyline([v3(-7, 6.3, 0), v3(15, 6.3, 0)], C.ICE, 0); desk.add(winBar);
  const fileLines = [0, 1, 2, 3, 4].map(i => { const l = polyline([v3(-5, 3.6 - i * 2, 0), v3(9 - (i % 3) * 3, 3.6 - i * 2, 0)], C.ICE, 0); desk.add(l); return l; });
  const cursor = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, -1.6), new THREE.Vector2(.42, -1.2), new THREE.Vector2(1.1, -1.15)])), new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  desk.add(cursor);
  const click = new THREE.Mesh(new THREE.RingGeometry(.35, .45, 48), new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); desk.add(click);
  const tAsk = a + 1.0, tOk = a + 2.3, tOpen = a + 2.9, tRead = a + 3.8, tDone = a + 4.8;
  SC.pc = { scene, update(t) {
    const on = smooth(T.pc, T.pc + .8, t);
    screen.material.opacity = .8 * on; taskbar.material.opacity = .5 * on; folders.forEach((f, i) => { f.material.opacity = on * (i === 1 && t > tOpen ? 1 : .6); });
    const wo = smooth(tOpen, tOpen + .5, t); win1.material.opacity = .8 * wo; winBar.material.opacity = .6 * wo; win1.scale.setScalar(lerp(.6, 1, easeOut(wo)));
    fileLines.forEach((l, i) => { l.material.opacity = .6 * smooth(tRead + i * .15, tRead + .3 + i * .15, t); });
    let cx = lerp(10, -15, ease(smooth(T.pc + .3, tAsk, t))), cy = lerp(-6, 1, ease(smooth(T.pc + .3, tAsk, t)));
    if (t > tOpen) { const k = ease(smooth(tRead - .3, tRead + .5, t)); cx = lerp(-15, -3, k); cy = lerp(1, 3.6, k); }
    cursor.position.set(cx, cy, .2); cursor.material.opacity = on;
    const ck = clamp((t - tOk) / .6); click.position.set(-15, 1, .2); click.scale.setScalar(1 + ck * 3.5); click.material.opacity = ck > 0 && ck < 1 ? 1 - ck : 0;
    desk.rotation.y = -.18 + Math.sin(t * .2) * .03;
    cameraPath([[T.pc, v3(-6, 3, 40), v3(0, 0, 0), 44], [T.media, v3(4, 1, 34), v3(2, 0, 0), 44]])(t);
    bloom.strength = .8; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('consent', '<b>ORBE souhaite ouvrir le dossier « Rapports »</b><span class="btns"><i>Refuser</i><i class="on">Autoriser</i></span>', tAsk, tOpen + .2, { x: 760, y: 760, fi: .35, fo: .35, drift: 10 });
  [['Ouvrir le dossier', tOpen], ['Lire le fichier', tRead + .6], ['Résumer dans la carte', tDone]]
    .forEach(([s, t0], i) => text('step', `<i>✓</i>${s}`, t0, T.media - .2, { x: 1560, y: 360 + i * 64, fi: .3, fo: .4, drift: 0 }));
}

// ===================================================================================
// 02 · L'INTELLIGENCE — vidéos et voix (en développement)
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 101, 1.3, .55));
  const a = S('L14'), v = sentence('L14', 1);
  const strip = new THREE.Group(); scene.add(strip);
  const frames = [0, 1, 2, 3, 4].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.4), imageShader(10 + i)); const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(9.8, 5.6)), lineMaterial(ROSE, 0)); const g = new THREE.Group(); g.add(m, fr); g.position.set((i - 2) * 10.6, 0, -Math.abs(i - 2) * 1.6); g.rotation.y = -(i - 2) * .12; strip.add(g); return { m, fr, t0: a + .1 + i * .28 }; });
  const play = polyline([v3(0, -3.6, 0), v3(0, 3.6, 0)], GOLD_HI, 0); strip.add(play);
  const VN = 360, rings = [[C.CYAN, 13, 0], [VIOLET, 14.2, 1.7]].map(([col, base, ph]) => { const l = new THREE.Line(geo({ position: [new Float32Array((VN + 1) * 3), 3] }), lineMaterial(col, 0)); scene.add(l); return { l, base, ph }; });
  const orb = dotSphere(2600, 7, 9, { size: .2 }); scene.add(orb);
  SC.media = { scene, update(t, frame) {
    const out = smooth(v - .4, v + .5, t);
    frames.forEach(f => { f.m.material.uniforms.uT.value = t; f.m.material.uniforms.uD.value = smooth(f.t0 + .2, f.t0 + 1.1, t); f.m.material.uniforms.uA.value = smooth(f.t0, f.t0 + .3, t) * (1 - out); f.fr.material.opacity = .6 * smooth(f.t0, f.t0 + .3, t) * (1 - out); });
    play.position.x = lerp(-21, 21, smooth(a + .4, a + 2.2, t)); play.material.opacity = .9 * win(t, a + .3, v - .3, .2, .3);
    const vo = smooth(v - .2, v + .6, t), env = envAt(frame);
    orb.material.uniforms.uT.value = t; orb.material.uniforms.uA.value = vo; orb.rotation.y = t * .15;
    rings.forEach(({ l, base, ph }, j) => { const arr = l.geometry.attributes.position.array; for (let k = 0; k <= VN; k++) { const an = k / VN * 6.283; const rr = base + Math.sin(an * 12 + t * 6 + ph) * env * 2.4 + Math.sin(an * 31 - t * 9) * env * 1.1; arr.set([Math.cos(an) * rr, Math.sin(an) * rr, Math.sin(an * 3 + t) * .4], k * 3); } l.geometry.attributes.position.needsUpdate = true; l.material.opacity = vo * (.7 - j * .2); });
    cameraPath([[T.media, v3(0, 2, 40), v3(0, 0, 0), 44], [v - .3, v3(0, 1, 36), v3(0, 0, 0), 44], [T.people, v3(0, 0, 44), v3(0, 0, 0), 44]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('eyebrow', 'Vidéo', a + .2, v - .3, { y: 860, fi: .4, fo: .3, drift: 6 });
  text('caption', '« Qu’est-ce que tu veux explorer aujourd’hui ? »', v + .8, T.people - .3, { y: 920, fi: .5, fo: .4, drift: 6 });
}

// ===================================================================================
// 03 · LE RÉSEAU — personnes, publications, échanges, communautés, découverte, création collective
// ===================================================================================
const PEOPLE = {};
{
  const r = rng(111), N = 130, pos = [];
  for (let i = 0; i < N; i++) pos.push(v3((r() - .5) * 150, gauss(r) * 14, (r() - .5) * 90));
  PEOPLE.pos = pos; PEOPLE.hue = pos.map(() => Math.floor(r() * 360));
  const edges = []; pos.forEach((p, i) => { pos.map((q, j) => [p.distanceToSquared(q), j]).filter(([, j]) => j !== i).sort((x, y) => x[0] - y[0]).slice(0, 2).forEach(([, j]) => { if (j > i) edges.push([i, j]); }); });
  PEOPLE.edges = edges;
}
const RING_TEX = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.strokeStyle = 'rgba(234,246,255,.9)'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function makePeople(parent, seed) {
  const r = rng(seed), grp = new THREE.Group(); parent.add(grp);
  const avatars = PEOPLE.pos.map((p, i) => {
    const col = new THREE.Color().setHSL(PEOPLE.hue[i] / 360, .7, .65);
    const core = glow(col, 2.6, 0), ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: RING_TEX, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.scale.set(2.4, 2.4, 1); core.position.copy(p); ring.position.copy(p); grp.add(core, ring); return { core, ring };
  });
  const LP = new Float32Array(PEOPLE.edges.length * 6); PEOPLE.edges.forEach(([a, b], k) => LP.set([...PEOPLE.pos[a].toArray(), ...PEOPLE.pos[b].toArray()], k * 6));
  const lines = new THREE.LineSegments(geo({ position: [LP, 3] }), lineMaterial(C.CYAN, 0)); grp.add(lines);
  const K = PEOPLE.pos.length * 14, kp = new Float32Array(K * 3), kd = new Float32Array(K * 4);
  for (let i = 0; i < K; i++) { kp.set(PEOPLE.pos[Math.floor(i / 14)].toArray(), i * 3); kd.set([1.6 + r() * 1.8, r() * 6.283, (r() - .5) * 1.2, .3 + r() * .7], i * 4); }
  const kmat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 }, uScale: { value: H * .55 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aD; uniform float uT, uScale; void main(){ float an = aD.y + uT * aD.w; vec3 p = position + vec3(cos(an) * aD.x, aD.z, sin(an) * aD.x); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = .9 * uScale / -mv.z; }`,
    fragmentShader: `uniform float uA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .86, .55) * a * a * uA * .7, 1.); }` });
  const know = new THREE.Points(geo({ position: [kp, 3], aD: [kd, 4] }), kmat); know.frustumCulled = false; grp.add(know);
  return { grp, set(t, o, lo = .25, ko = 1) { avatars.forEach(a => { a.core.material.opacity = o * .9; a.ring.material.opacity = o * .55; }); lines.material.opacity = lo * o; kmat.uniforms.uT.value = t; kmat.uniforms.uA.value = o * ko; } };
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(7000, 1400, 121, 1.3, .6));
  const ppl = makePeople(scene, 123), a = S('L15'), b = sentence('L15', 1);
  const src = 40, nb = PEOPLE.edges.filter(([x, y]) => x === src || y === src).map(([x, y]) => (x === src ? y : x));
  const share = pulses(nb.map(j => [PEOPLE.pos[src], PEOPLE.pos[j]]), 160, GOLD_HI, 125, 2); scene.add(share);
  SC.people = { scene, update(t) {
    ppl.set(t, smooth(T.people, T.people + 1.6, t), .22 * smooth(b - .5, b + 1.5, t) + .05);
    share.material.uniforms.uT.value = t; share.material.uniforms.uA.value = win(t, a + .6, b + 1.5, .5, .6);
    const sp = PEOPLE.pos[src];
    cameraPath([[T.people, sp.clone().add(v3(4, 4, 16)), sp, 44], [b - .3, sp.clone().add(v3(-10, 16, 50)), sp.clone().lerp(v3(0, 0, 0), .4), 46], [T.posts, v3(30, 50, 150), v3(0, 0, 0), 48]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(7000, 1400, 131, 1.3, .6));
  const ppl = makePeople(scene, 133), a = S('L16'), b = sentence('L16', 1);
  const tPub = a, tReact = a + .55, tComment = a + 1.05, tFriends = b, tDM = b + 1.15, tComm = b + 2.3;
  const author = 57, ap = PEOPLE.pos[author];
  const post = card(520, 640, 9, (g, w) => {
    avatarDisc(g, 70, 70, 34, 200); g.fillStyle = 'rgba(234,246,255,.9)'; g.fillRect(120, 50, 160, 14); g.fillStyle = 'rgba(200,220,250,.45)'; g.fillRect(120, 78, 100, 10);
    textLines(g, 36, 130, w - 72, 2, { gap: 26, alpha: .5 }); paintImage(g, 36, 200, w - 72, 300, 7);
    g.strokeStyle = 'rgba(234,246,255,.8)'; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(70, 590); g.bezierCurveTo(70, 560, 40, 560, 40, 578); g.bezierCurveTo(40, 595, 70, 610, 70, 618); g.bezierCurveTo(70, 610, 100, 595, 100, 578); g.bezierCurveTo(100, 560, 70, 560, 70, 590); g.stroke();
    g.beginPath(); g.arc(190, 585, 24, 0, 7); g.stroke(); g.beginPath(); g.moveTo(300, 600); g.lineTo(340, 570); g.lineTo(340, 586); g.lineTo(370, 586); g.stroke();
  });
  const postG = new THREE.Group(); postG.add(post); scene.add(postG);
  const comments = [0, 1, 2].map(i => { const c = card(440, 120, 6.2, (g) => { avatarDisc(g, 50, 60, 24, 40 + i * 90); textLines(g, 90, 44, 300, 2, { gap: 26, alpha: .5, thick: 8 }); }); const grp = new THREE.Group(); grp.add(c); scene.add(grp); return { c, grp }; });
  const R = 700, hp = new Float32Array(R * 3), hd = new Float32Array(R * 4); const r = rng(137);
  for (let i = 0; i < R; i++) hd.set([(r() - .5) * 2, .6 + r() * 1.4, (r() - .5) * 2, r()], i * 4);
  const hmat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uO: { value: new THREE.Vector3() }, uScale: { value: H * .55 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aD; uniform float uT, uScale; uniform vec3 uO; varying float vA; void main(){ float k = clamp(uT - aD.w * .6, 0., 2.); vec3 p = uO + vec3(aD.x * k * 4., aD.y * k * 5. - k * k * .8, aD.z * k * 4.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = .8 * uScale / -mv.z; vA = (k > 0. ? 1. : 0.) * (1. - k / 2.); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .5, .62) * a * a * vA * .35, 1.); }` });
  const hearts = new THREE.Points(geo({ position: [hp, 3], aD: [hd, 4] }), hmat); hearts.frustumCulled = false; scene.add(hearts);
  const friendIdx = PEOPLE.edges.map((e, i) => i).filter(i => PEOPLE.edges[i].includes(author) || i % 9 === 0).slice(0, 18);
  const friendLines = friendIdx.map(i => { const [x, y] = PEOPLE.edges[i]; const l = polyline([PEOPLE.pos[x], PEOPLE.pos[y]], GOLD_HI, 0); scene.add(l); return l; });
  const dmA = 57, dmB = 88, dm = pulses([[PEOPLE.pos[dmA], PEOPLE.pos[dmB]], [PEOPLE.pos[dmB], PEOPLE.pos[dmA]]], 140, C.ICE, 139, 2.4); scene.add(dm);
  const dmLine = polyline([PEOPLE.pos[dmA], PEOPLE.pos[dmB]], C.ICE, 0); scene.add(dmLine);
  const comms = [[v3(-50, 4, -20), 'Communauté · Astronomie'], [v3(48, -2, 18), 'Communauté · Création']].map(([c, name]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(14, .08, 8, 128), new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); ring.position.copy(c); ring.rotation.x = Math.PI / 2 - .3; scene.add(ring);
    text('tag tag-violet', name, tComm + .3, T.feed - .2, { fi: .4, fo: .4, drift: 4 }).anchor = c.clone().add(v3(0, 9, 0)); return ring;
  });
  SC.posts = { scene, update(t) {
    ppl.set(t, smooth(T.posts, T.posts + .6, t), .14);
    const po = easeOut(smooth(tPub, tPub + .8, t)), off = smooth(b - .3, b + .5, t);
    postG.position.copy(ap.clone().add(v3(0, lerp(0, 8, po), lerp(0, 6, po)))); postG.lookAt(camera.position); post.material.opacity = po * (1 - off); post.scale.setScalar(lerp(.2, 1, po));
    hmat.uniforms.uT.value = Math.max(0, t - tReact) * 1.2; hmat.uniforms.uO.value.copy(postG.position.clone().add(v3(-3, -4, .5))); hearts.visible = t > tReact && t < b + .4;
    comments.forEach((c, i) => { const k = easeOut(smooth(tComment + i * .2, tComment + .5 + i * .2, t)); c.grp.position.copy(postG.position.clone().add(v3(6.5, 2.5 - i * 2, 1))); c.grp.lookAt(camera.position); c.c.material.opacity = k * (1 - off); });
    friendLines.forEach((l, i) => { l.material.opacity = .7 * smooth(tFriends + i * .04, tFriends + .4 + i * .04, t) * (1 - smooth(tDM + .8, tComm, t) * .6); });
    dm.material.uniforms.uT.value = t; dm.material.uniforms.uA.value = win(t, tDM, T.feed, .3, .4); dmLine.material.opacity = .5 * win(t, tDM, T.feed, .3, .4);
    comms.forEach((ring, i) => { ring.material.opacity = .7 * smooth(tComm + i * .3, tComm + .7 + i * .3, t); ring.rotation.z = t * .1; });
    cameraPath([[T.posts, ap.clone().add(v3(4, 9, 26)), ap.clone().add(v3(2, 6, 0)), 44], [b - .4, ap.clone().add(v3(2, 9, 24)), ap.clone().add(v3(2, 6, 0)), 44], [tDM - .3, v3(10, 50, 120), v3(0, 0, 0), 46], [T.feed, v3(-20, 40, 140), v3(0, 0, 0), 48]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('label', 'Message privé', tDM + .3, tComm, { fi: .3, fo: .3, drift: 0 }).anchor = PEOPLE.pos[dmA].clone().lerp(PEOPLE.pos[dmB], .5).add(v3(0, 4, 0));
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(6000, 1400, 141, 1.3, .55));
  const a = S('L17');
  const KINDS = [['Publication', 1], ['Créateur', 2], ['Connaissance', 3], ['Communauté', 4], ['Publication', 1], ['Connaissance', 3], ['Créateur', 2], ['Communauté', 4]];
  const col = new THREE.Group(); scene.add(col);
  const cards = KINDS.map(([kind, k], i) => {
    const m = card(540, 960, 9, (g, w) => {
      g.font = '600 26px Inter'; g.fillStyle = '#9FD8FF'; g.fillText(kind.toUpperCase(), 36, 64);
      if (k === 1) { paintImage(g, 36, 96, w - 72, 560, 20 + i); textLines(g, 36, 700, w - 72, 3, { gap: 30, alpha: .5 }); }
      if (k === 2) { avatarDisc(g, w / 2, 320, 130, (i * 70) % 360); g.fillStyle = 'rgba(234,246,255,.9)'; g.fillRect(w / 2 - 120, 500, 240, 18); textLines(g, 80, 580, w - 160, 3, { gap: 30, alpha: .4 }); g.strokeStyle = '#F2C14E'; g.lineWidth = 3; g.beginPath(); g.roundRect(w / 2 - 110, 760, 220, 64, 32); g.stroke(); }
      if (k === 3) { g.strokeStyle = 'rgba(234,246,255,.7)'; g.lineWidth = 3; const P = [[270, 340], [140, 220], [400, 210], [110, 470], [420, 480], [270, 590]]; P.slice(1).forEach(([x, y]) => { g.beginPath(); g.moveTo(270, 340); g.lineTo(x, y); g.stroke(); }); P.forEach(([x, y], j) => { g.beginPath(); g.arc(x, y, j ? 18 : 30, 0, 7); g.fillStyle = j ? '#6FC2FF' : '#F2C14E'; g.fill(); }); textLines(g, 36, 700, w - 72, 3, { gap: 30, alpha: .5 }); }
      if (k === 4) { for (let j = 0; j < 40; j++) { g.fillStyle = `rgba(200,180,255,${.3 + (j % 5) * .12})`; g.beginPath(); g.arc(80 + (j * 97) % 380, 140 + (j * 53) % 460, 4 + (j % 3) * 3, 0, 7); g.fill(); } textLines(g, 36, 680, w - 72, 2, { gap: 30, alpha: .5 }); g.fillStyle = '#A98BFF'; g.beginPath(); g.roundRect(36, 800, w - 72, 70, 35); g.fill(); }
    });
    m.position.set(0, -i * 17, 0); col.add(m); return m;
  });
  const STEP = 1.25;
  SC.feed = { scene, update(t) {
    const u = Math.max(0, t - a - .2), idx = Math.floor(u / STEP), f = clamp((u - idx * STEP) / .55);
    col.position.y = Math.min((idx + ease(f)) * 17, (cards.length - 1) * 17);
    cards.forEach((m, i) => { const d = Math.abs(i * 17 - col.position.y) / 17; m.material.opacity = smooth(T.feed, T.feed + .6, t) * clamp(1 - d * .55); m.scale.setScalar(1 - Math.min(d, 1.5) * .08); m.position.z = -Math.min(d, 2) * 3; });
    col.rotation.y = -.22; col.position.x = 2;
    cameraPath([[T.feed, v3(-6, 0, 24), v3(0, 0, 0), 44], [T.collab, v3(-9, 0, 22), v3(0, 0, 0), 44]])(t);
    bloom.strength = .7; bloom.radius = .45; bloom.threshold = .45;
  } };
  text('eyebrow', 'Découvrir', T.feed + .3, T.collab - .2, { x: 1440, y: 540, fi: .6, fo: .4, drift: 0 });
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(7000, 1400, 151, 1.3, .6));
  const a = S('L18'), r = rng(153);
  const users = [0, 1, 2, 3, 4].map(i => { const an = i / 5 * 6.283 + .3; const p = v3(Math.cos(an) * 20, Math.sin(an * 2) * 3, Math.sin(an) * 14); const col = new THREE.Color().setHSL(((i * 70 + 190) % 360) / 360, .7, .65); const s = glow(col, 3.4, 0); s.position.copy(p); scene.add(s); return { p, col, s }; });
  const NN = 42, nodes = [], segs = [];
  for (let i = 0; i < NN; i++) {
    const u = r() * 2 - 1, th = r() * 6.283, rr = 6 * Math.cbrt(r()); const p = v3(Math.sqrt(1 - u * u) * Math.cos(th) * rr, u * rr * .8, Math.sin(th) * Math.sqrt(1 - u * u) * rr);
    const who = i % 5; const s = glow(users[who].col, 1.5, 0); s.position.copy(p); scene.add(s); const t0 = a + .2 + i * .085; nodes.push({ p, s, who, t0 });
    if (i) { let best = 0, bd = 1e9; for (let j = 0; j < i; j++) { const d = nodes[j].p.distanceToSquared(p); if (d < bd) { bd = d; best = j; } } const l = polyline([nodes[best].p, p], WHITE, 0); scene.add(l); segs.push({ l, t0 }); }
  }
  const beams = nodes.map(n => { const l = polyline([users[n.who].p, n.p], users[n.who].col, 0); scene.add(l); return { l, t0: n.t0 }; });
  const seedNode = nodes[30], dest = v3(36, 10, -18); const traveler = glow(GOLD_HI, 2.4, 0); scene.add(traveler);
  const tTravel = sentence('L18', 0) + 2.6;
  const branch = []; for (let i = 0; i < 14; i++) { const p = dest.clone().add(v3((r() - .5) * 10, (r() - .5) * 6, (r() - .5) * 8)); const s = glow(C.CYAN, 1.2, 0); s.position.copy(p); scene.add(s); const l = polyline([dest, p], C.CYAN, 0); scene.add(l); branch.push({ s, l, t0: tTravel + .9 + i * .07 }); }
  SC.collab = { scene, update(t) {
    users.forEach(u => { u.s.material.opacity = smooth(T.collab, T.collab + .5, t); });
    nodes.forEach(n => { n.s.material.opacity = smooth(n.t0, n.t0 + .2, t); });
    segs.forEach(s => { s.l.material.opacity = .4 * smooth(s.t0, s.t0 + .3, t); });
    beams.forEach(b => { b.l.material.opacity = .6 * win(t, b.t0 - .1, b.t0 + .5, .05, .3); });
    const k = easeOut(smooth(tTravel, tTravel + .9, t)); traveler.position.lerpVectors(seedNode.p, dest, k); traveler.material.opacity = smooth(tTravel, tTravel + .1, t);
    branch.forEach(b => { b.s.material.opacity = smooth(b.t0, b.t0 + .2, t); b.l.material.opacity = .5 * smooth(b.t0, b.t0 + .3, t); });
    cameraPath([[T.collab, v3(0, 7, 34), v3(0, 0, 0), 44], [tTravel, v3(8, 9, 44), v3(8, 2, -2), 44], [T.eco, v3(26, 12, 40), v3(22, 6, -10), 46]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('tag', 'Point de départ d’une nouvelle carte', tTravel + .9, T.eco - .2, { fi: .4, fo: .4, drift: 4 }).anchor = dest.clone().add(v3(0, 7, 0));
}

// ===================================================================================
// 04 · L'ÉCOSYSTÈME — connexions, automatisations, gestion des accès (en développement)
// ===================================================================================
function iconTexture(kind) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'); g.strokeStyle = 'rgba(234,246,255,.95)'; g.fillStyle = 'rgba(234,246,255,.95)'; g.lineWidth = 6; g.lineJoin = 'round';
  if (kind === 'mail') { g.strokeRect(22, 36, 84, 58); g.beginPath(); g.moveTo(22, 36); g.lineTo(64, 70); g.lineTo(106, 36); g.stroke(); }
  if (kind === 'cal') { g.strokeRect(24, 30, 80, 72); g.beginPath(); g.moveTo(24, 52); g.lineTo(104, 52); g.stroke(); for (let i = 0; i < 6; i++) g.fillRect(36 + (i % 3) * 22, 62 + Math.floor(i / 3) * 18, 10, 8); }
  if (kind === 'cloud') { g.beginPath(); g.arc(48, 72, 18, Math.PI * .5, Math.PI * 1.5); g.arc(66, 52, 22, Math.PI, Math.PI * 1.9); g.arc(86, 70, 18, Math.PI * 1.5, Math.PI * .5); g.closePath(); g.stroke(); }
  if (kind === 'folder') { g.beginPath(); g.moveTo(20, 40); g.lineTo(52, 40); g.lineTo(60, 50); g.lineTo(108, 50); g.lineTo(108, 98); g.lineTo(20, 98); g.closePath(); g.stroke(); }
  if (kind === 'chat') { g.beginPath(); g.roundRect(20, 30, 88, 56, 14); g.stroke(); g.beginPath(); g.moveTo(40, 86); g.lineTo(34, 104); g.lineTo(58, 86); g.stroke(); }
  if (kind === 'film') { g.strokeRect(22, 34, 84, 60); for (let i = 0; i < 5; i++) { g.fillRect(28 + i * 16, 40, 8, 6); g.fillRect(28 + i * 16, 82, 8, 6); } }
  if (kind === 'social') { g.beginPath(); g.arc(44, 50, 14, 0, 7); g.stroke(); g.beginPath(); g.arc(84, 50, 14, 0, 7); g.stroke(); g.beginPath(); g.arc(44, 100, 26, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(84, 100, 26, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  if (kind === 'doc') { g.strokeRect(34, 22, 60, 84); for (let i = 0; i < 4; i++) g.fillRect(44, 40 + i * 14, 40 - (i % 2) * 12, 5); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
{
  const scene = new THREE.Scene(); scene.add(makeStars(8000, 1400, 161, 1.3, .6));
  const a = S('L19'), s2 = sentence('L19', 1), tAuto = s2 + 3.0, tManage = s2 + 4.6;
  const core = dotSphere(2400, 5, 11, { size: .2 }); scene.add(core);
  const KINDS = ['mail', 'cal', 'cloud', 'folder', 'chat', 'film', 'social', 'doc'];
  const icons = KINDS.map((k, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(k), color: C.ICE, transparent: true, opacity: 0, depthWrite: false })); s.scale.set(3.6, 3.6, 1); const h = glow(C.CYAN, 6, 0); scene.add(s, h); const beam = polyline([v3(0, 0, 0), v3(0, 0, .01)], C.CYAN, 0); scene.add(beam); return { s, h, beam, a0: i / KINDS.length * 6.283, t0: s2 + .2 + i * .14 }; });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(19, .05, 8, 200), new THREE.MeshBasicMaterial({ color: C.CYAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); ring.rotation.x = Math.PI / 2 - .25; scene.add(ring);
  const chainP = [v3(-34, -14, 6), v3(-22, -14, 6), v3(-10, -14, 6)];
  const chainG = chainP.map((p, i) => { const s = glow(i ? MINT : GOLD_HI, 2.6, 0); s.position.copy(p); scene.add(s); return s; });
  const chainL = polyline(chainP, MINT, 0); scene.add(chainL); const chainF = pulses([[chainP[0], chainP[1]], [chainP[1], chainP[2]]], 80, MINT, 163, 2); scene.add(chainF);
  ['Nouveau fichier', 'Analyse', 'Ajout à la carte'].forEach((s, i) => { text('label', s, tAuto + i * .2, T.privacy - .2, { fi: .3, fo: .4, drift: 0 }).anchor = chainP[i].clone().add(v3(0, -3.2, 0)); });
  SC.eco = { scene, update(t) {
    core.material.uniforms.uT.value = t; core.material.uniforms.uA.value = smooth(T.eco, T.eco + .8, t); core.rotation.y = t * .15;
    ring.material.opacity = .35 * smooth(a + .4, a + 1.4, t);
    icons.forEach(ic => { const an = ic.a0 + t * .1; const p = v3(Math.cos(an) * 19, 0, Math.sin(an) * 19).applyAxisAngle(v3(1, 0, 0), -.25); ic.s.position.copy(p); ic.h.position.copy(p); const o = smooth(a + .5, a + 1.3, t); ic.s.material.opacity = o; ic.h.material.opacity = .25 * o; const bk = smooth(ic.t0, ic.t0 + .4, t); ic.beam.geometry.setFromPoints([v3(0, 0, 0), p.clone().multiplyScalar(Math.max(.001, bk))]); ic.beam.material.opacity = .45 * bk; });
    chainG.forEach((s, i) => { s.material.opacity = smooth(tAuto + i * .2, tAuto + .3 + i * .2, t); }); chainL.material.opacity = .5 * smooth(tAuto, tAuto + .6, t);
    chainF.material.uniforms.uT.value = t; chainF.material.uniforms.uA.value = smooth(tAuto + .4, tAuto + .8, t);
    cameraPath([[T.eco, v3(0, 12, 44), v3(0, 0, 0), 46], [tAuto - .3, v3(-10, 8, 56), v3(-6, -3, 0), 46], [T.privacy, v3(-18, 5, 54), v3(-8, -4, 0), 46]])(t);
    bloom.strength = .85; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('panel', '<b>Connexions</b><p><i class="ok"></i>Messagerie<span>autorisée</span></p><p><i class="ok"></i>Agenda<span>autorisé</span></p><p><i class="wait"></i>Stockage<span>en attente</span></p><p><i class="off"></i>Réseaux sociaux<span>révoqué</span></p>', tManage, T.privacy - .1, { x: 1520, y: 560, fi: .45, fo: .4, drift: 12 });
}

// ===================================================================================
// 04 · L'ÉCOSYSTÈME — ce qui est privé reste privé (disponible)
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(5000, 1400, 171, 1.2, .5));
  const a = S('L20'), s2 = sentence('L20', 1), s3 = sentence('L20', 2);
  const core = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 64), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform float uT; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - max(dot(vN, vV), 0.), 2.2); vec3 c = mix(vec3(.55, .12, .22), vec3(1., .55, .66), f) + vec3(1., .8, .85) * pow(f, 6.) * 1.5; c *= .8 + .2 * sin(uT * 2. + vN.y * 6.); gl_FragColor = vec4(c, 1.); }` }));
  const coreGlow = glow(ROSE, 22, .2); scene.add(core, coreGlow);
  const ico = new THREE.IcosahedronGeometry(11, 2); const pos = ico.attributes.position; const cnt = pos.count; const cen = new Float32Array(cnt * 3), rnd = new Float32Array(cnt); const r = rng(13);
  for (let i = 0; i < cnt; i += 3) { const c = v3(0, 0, 0); for (let k = 0; k < 3; k++) c.add(v3(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k))); c.divideScalar(3); const rv = r(); for (let k = 0; k < 3; k++) { cen.set(c.toArray(), (i + k) * 3); rnd[i + k] = rv; } }
  ico.setAttribute('aC', new THREE.BufferAttribute(cen, 3)); ico.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
  const shellMat = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 }, uPulse: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aC; attribute float aR; uniform float uK; varying float vA; varying vec3 vB; varying vec3 vN; varying vec3 vV;
      void main(){ float k = smoothstep(aR * .55, aR * .55 + .45, uK); vec3 p = (position - aC) * .92; vec3 dir = normalize(aC); vec3 c = aC + dir * (1. - k) * (22. + aR * 30.);
        float a = (1. - k) * 4. * (aR - .5); mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a)); p.xy = R * p.xy; vec4 mv = modelViewMatrix * vec4(c + p, 1.); gl_Position = projectionMatrix * mv;
        vA = k; vN = normalize(normalMatrix * dir); vV = normalize(-mv.xyz); int id = int(mod(float(gl_VertexID), 3.)); vB = vec3(id == 0, id == 1, id == 2); }`,
    fragmentShader: `uniform float uPulse; varying float vA; varying vec3 vB; varying vec3 vN; varying vec3 vV; void main(){ float e = min(min(vB.x, vB.y), vB.z); float edge = smoothstep(.05, 0., e); float f = pow(1. - abs(dot(vN, vV)), 2.); vec3 c = vec3(1., .82, .55) * edge * (.55 + uPulse * 1.5) + vec3(1., .55, .7) * f * .08; gl_FragColor = vec4(c * vA, 1.); }` });
  const shell = new THREE.Mesh(ico, shellMat); scene.add(shell);
  const N = 4200, dir = new Float32Array(N * 3), dat = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = r() * 2 - 1, th = r() * 6.283; dir.set([Math.sqrt(1 - u * u) * Math.cos(th), u * .8, Math.sqrt(1 - u * u) * Math.sin(th)], i * 3); dat.set([.12 + r() * .15, r(), r()], i * 3); }
  const smat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 }, uScale: { value: H * .55 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aD; uniform float uT, uScale; varying float vA; void main(){ vec3 d = normalize(position); float s = fract(uT * aD.x + aD.y); vec3 tng = normalize(cross(d, vec3(0., 1., .2)));
      vec3 p = s < .5 ? d * mix(70., 12.6, s * 2.) : normalize(d + tng * (1.2 + aD.z)) * mix(12.6, 80., (s - .5) * 2.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = 1.7 * uScale / -mv.z; vA = sin(s * 3.14159); }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(.62, .82, 1.) * a * a * vA * uA * .55, 1.); }` });
  const streams = new THREE.Points(geo({ position: [dir, 3], aD: [dat, 3] }), smat); streams.frustumCulled = false; scene.add(streams);
  const sweep = new THREE.Mesh(new THREE.TorusGeometry(13, .06, 8, 160), new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(sweep);
  const tLock = s2 + .2, tSweep = s3;
  SC.privacy = { scene, update(t) {
    core.material.uniforms.uT.value = t; core.rotation.y = t * .2; coreGlow.material.opacity = .18 + .05 * Math.sin(t * 2.4);
    shellMat.uniforms.uK.value = smooth(a + .8, tLock, t); shell.rotation.y = t * .08; shell.rotation.x = .2;
    shellMat.uniforms.uPulse.value = Math.exp(-Math.max(0, t - tLock) * 3) * smooth(tLock - .2, tLock, t) + .6 * Math.exp(-Math.max(0, t - tSweep) * 2.5) * smooth(tSweep - .2, tSweep, t);
    smat.uniforms.uT.value = t; smat.uniforms.uA.value = smooth(tLock + .2, tLock + 1.4, t);
    const sw = smooth(tSweep, tSweep + 1.8, t); sweep.scale.setScalar(.6 + sw * .9); sweep.material.opacity = (1 - sw) * smooth(tSweep, tSweep + .2, t); sweep.rotation.x = Math.PI / 2 - .2;
    cameraPath([[T.privacy, v3(0, 6, 34), v3(0, 0, 0), 46], [tLock, v3(-24, 10, 44), v3(0, 0, 0), 46], [T.converge, v3(10, 4, 58), v3(0, 0, 0), 44]])(t);
    bloom.strength = .9; bloom.radius = .5; bloom.threshold = .35;
  } };
  text('eyebrow', 'Privé · chiffré · sur ton ordinateur', tLock, T.converge - .2, { y: 930, fi: .8, fo: .5, drift: 8 });
}

// ===================================================================================
// Convergence : connaissances, intelligences, communauté — un seul univers
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(9000, 1600, 181, 1.4, .7));
  const w1 = S('L21'), w2 = sentence('L21', 1), w3 = sentence('L21', 2), w4 = sentence('L21', 3), I = T.impact;
  const aiG = new THREE.Group(); scene.add(aiG);
  const ents = [[SKY, new THREE.IcosahedronGeometry(2.4, 0)], [GOLD, new THREE.OctahedronGeometry(2.6, 0)], [VIOLET, new THREE.DodecahedronGeometry(2.4, 0)]].map(([c, g], i) => { const e = entity(aiG, g, c); e.grp.position.set(Math.cos(i * 2.094) * 5, Math.sin(i * 2.094) * 5, 0); return e; });
  const pplG = new THREE.Group(); scene.add(pplG); const ppl = makePeople(pplG, 183);
  const core = glow(C.ICE, 6, 0); scene.add(core);
  SC.converge = { scene, update(t) {
    adoptGalaxy(scene); hideMapExtras(); galaxy.visible = true;
    const conv = smooth(w4 - .2, I - .1, t), spin = conv * conv * 8;
    galaxy.scale.setScalar(.22 * (1 - conv * .97)); galaxy.position.set(-46 * (1 - conv), 0, 0); galaxy.rotation.y = t * .05 + spin; NET.update(t, 40, .16 * smooth(w1 - .3, w1 + .5, t) * Math.pow(1 - conv, 3), 1);
    core.position.copy(galaxy.position); core.material.opacity = .7 * conv * (1 - smooth(I - .5, I, t) * .5); core.scale.setScalar(6 * (1 - conv * .6));
    ents.forEach((e, i) => { e.grp.rotation.set(t * .4 + i, t * .5, 0); e.set(.4 * smooth(w2 - .3, w2 + .4, t)); });
    aiG.rotation.z = t * .3 + spin; aiG.scale.setScalar(1.6 * (1 - conv * .97));
    ppl.set(t, .3 * smooth(w3 - .3, w3 + .5, t), .5, .15); pplG.position.set(46 * (1 - conv), 0, 0); pplG.scale.setScalar(.18 * (1 - conv * .97)); pplG.rotation.y = t * .1 + spin;
    cameraPath([[T.converge, v3(0, 10, 110), v3(0, 0, 0), 46], [w4, v3(0, 6, 96), v3(0, 0, 0), 46], [I, v3(0, 2, 14), v3(0, 0, 0), 60]])(t);
    bloom.strength = .8 + conv * .4; bloom.radius = .5; bloom.threshold = .4;
  } };
  text('eyebrow', 'Connaissances', w1 - .1, I - .6, { x: 410, y: 820, fi: .4, fo: .5, drift: 0 });
  text('eyebrow', 'Intelligences', w2 - .1, I - .6, { x: 960, y: 820, fi: .4, fo: .5, drift: 0 });
  text('eyebrow', 'Communauté', w3 - .1, I - .6, { x: 1510, y: 820, fi: .4, fo: .5, drift: 0 });
}

// ===================================================================================
// Révélation : l'emblème d'ORBE
// ===================================================================================
{
  const scene = new THREE.Scene(); scene.add(makeStars(9000, 1600, 191, 1.2, .55));
  const I = T.impact, logo = new THREE.Group(); scene.add(logo);
  const sphere = dotSphere(5200, 5, 3); logo.add(sphere);
  const coreGlow = glow(new THREE.Color('#3E8BD6'), 14, 0), coreWarm = glow(new THREE.Color('#9A6BB8'), 5, 0), outer = glow(new THREE.Color('#2B5C9E'), 34, 0); logo.add(outer, coreGlow, coreWarm);
  const orbits = [[9.4, 1.18, .16], [10.4, 1.27, -.13]].map(([rad, rx, rz]) => {
    const pts = []; for (let k = 0; k <= 256; k++) { const an = k / 256 * 6.283; pts.push(v3(Math.cos(an) * rad, Math.sin(an) * rad, 0)); }
    const g = new THREE.Group(); g.rotation.set(rx, 0, rz); const line = polyline(pts, new THREE.Color('#BFD9F2'), 0); const dot = glow(new THREE.Color('#DDEEFF'), .6, 0); g.add(line, dot); logo.add(g); return { line, dot, rad };
  });
  const r = rng(3), D = 3000, dp = new Float32Array(D * 3), dc = new Float32Array(D * 3), ds = new Float32Array(D), de = new Float32Array(D);
  for (let i = 0; i < D; i++) { dp.set([(r() - .5) * 120, (r() - .5) * 70, (r() - .5) * 60 - 10], i * 3); const c = SKY.clone().lerp(WHITE, r()).multiplyScalar(.25 + r() * .4); dc.set([c.r, c.g, c.b], i * 3); ds[i] = .5 + r() * 1.3; de[i] = r(); }
  const dmat = pointsMaterial(); const dust = new THREE.Points(geo({ position: [dp, 3], aColor: [dc, 3], aSize: [ds, 1], aSeed: [de, 1] }), dmat); scene.add(dust);
  SC.reveal = { scene, update(t) {
    sphere.material.uniforms.uK.value = smooth(I, I + 2.7, t); sphere.material.uniforms.uT.value = t; sphere.rotation.y = t * .12; sphere.rotation.x = .18;
    const on = smooth(I + .9, I + 2.5, t); coreGlow.material.opacity = .32 * on; coreWarm.material.opacity = .12 * on; outer.material.opacity = .08 * on;
    orbits.forEach((o, i) => { o.line.material.opacity = .32 * smooth(I + 1.5 + i * .3, I + 2.9 + i * .3, t); const an = t * (.35 + i * .12) + i * 2.4; o.dot.position.set(Math.cos(an) * o.rad, Math.sin(an) * o.rad, 0); o.dot.material.opacity = smooth(I + 1.9, I + 2.9, t); });
    dmat.uniforms.uTime.value = t; dust.position.y = -(t - I) * .5;
    cameraPath([[I, v3(0, 0, 12), v3(0, 0, 0), 52], [I + 3.5, v3(0, .4, 23), v3(0, 0, 0), 40], [DUR, v3(0, .5, 25.5), v3(0, 0, 0), 40]])(t);
    bloom.strength = .75 + 1.4 * Math.exp(-Math.max(0, t - I) * 1.6); bloom.radius = .55; bloom.threshold = .3;
  } };
  text('logo-word', 'ORBE', I + 1.9, DUR, { y: 540, fi: 1.8, fo: 1.2, drift: 0, track: .8 });
  text('tagline', 'Tout ce que tu sais, en un seul point.', sentence('L22', 1) - .1, S('L23') - .3, { y: 905, fi: .8, fo: .6, drift: 10 });
  text('eyebrow', 'Disponible le', S('L23') - .1, DUR, { y: 868, fi: .8, fo: 1.2, drift: 8 });
  text('release', '1<sup>er</sup> décembre 2026', S('L23') + .2, DUR, { y: 922, fi: .8, fo: 1.2, drift: 8 });
  text('cta', 'Découvre ORBE', S('L24') - .1, DUR, { y: 990, fi: .7, fo: 1.0, drift: 6 });
}

// ---------- indicateur de chapitre et de statut (Disponible / En développement) ----------
{
  const tl = CUES.timeline, segs = [];
  tl.forEach((l, idx) => {
    if (!l.chapter) return;
    const from = l.start - .5, next = tl[idx + 1], to = next ? next.start - .5 : l.end + .5, last = segs[segs.length - 1];
    if (last && last.chapter === l.chapter && last.status === l.status && Math.abs(last.to - from) < .01) last.to = to; else segs.push({ chapter: l.chapter, status: l.status, from, to });
  });
  const chapters = []; for (const s of segs) { const last = chapters[chapters.length - 1]; if (last && last.chapter === s.chapter && Math.abs(last.to - s.from) < .01) last.to = s.to; else chapters.push({ ...s }); }
  const num = { 'La carte': '01', "L'intelligence": '02', 'Le réseau': '03', "L'écosystème": '04' };
  chapters.forEach(c => text('hud-chapter', `<span>${num[c.chapter] ?? ''}</span>${c.chapter.replace("'", '’')}`, c.from, c.to, { x: 96, y: 92, fi: .5, fo: .4, drift: 0 }));
  segs.forEach(s => text(`hud-status ${s.status}`, s.status === 'available' ? 'Disponible aujourd’hui' : 'En développement', s.from + .1, s.to, { x: 96, y: 138, fi: .35, fo: .3, drift: 0 }));
}

// ---------- montage ----------
const CUTS = [[0, 'frag'], [T.black, 'galaxy'], [T.map, 'map'], [T.sources, 'sources'], [T.share, 'share'], [T.chat, 'chat'], [T.ai, 'ai'], [T.agents, 'agents'], [T.pc, 'pc'], [T.media, 'media'],
  [T.people, 'people'], [T.posts, 'posts'], [T.feed, 'feed'], [T.collab, 'collab'], [T.eco, 'eco'], [T.privacy, 'privacy'], [T.converge, 'converge'], [T.impact, 'reveal']];
const DIPS = CUTS.slice(2, -1).map(c => c[0]);
const BIG = [T.chat, T.people, T.eco];
function fadeAt(t) {
  let f = 1 - smooth(0, 1.6, t);
  f = Math.max(f, smooth(T.black - 1.6, T.black - .1, t) * (1 - smooth(T.black, T.black + .1, t)));
  for (const d of DIPS) { const w = BIG.includes(d) ? .7 : .34; f = Math.max(f, 1 - smooth(0, w, Math.abs(t - d))); }
  return Math.max(f, smooth(DUR - 1.5, DUR, t));
}
const flashAt = t => .9 * smooth(T.impact - .4, T.impact, t) * (1 - smooth(T.impact, T.impact + .9, t));

window.renderAt = function (t, frame = Math.round(t * 30)) {
  let id = 'frag'; for (const [at, name] of CUTS) if (t >= at) id = name;
  const sc = SC[id]; sc.update(t, frame); renderPass.scene = sc.scene;
  grade.uniforms.uFade.value = fadeAt(t); grade.uniforms.uFlash.value = flashAt(t); grade.uniforms.uTime.value = frame * .37;
  sc.scene.updateMatrixWorld(); camera.updateMatrixWorld();
  for (const ty of typers) { const n = Math.round(ty.type.text.length * clamp((t - ty.type.from) / (ty.type.to - ty.type.from))); const s = ty.type.text.slice(0, n) + '<span class="caret"></span>'; if (s !== ty.cache) { ty.el.innerHTML = s; ty.cache = s; } }
  updateTexts(t);
  composer.render();
};
window.TIMES = T; window.DURATION = DUR;
window.sceneReady = Promise.resolve(true);
