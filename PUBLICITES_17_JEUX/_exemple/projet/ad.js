// EXEMPLE de structure d'une pub (sert de modèle et de test du moteur). Ce n'est pas un des 17 jeux.
import { THREE, W, H, SAFE, clamp, lerp, inv, ease, prog, win, hash, shake, loadFonts, cue, gl3D, draw3D, makeCamera, camLook, mat, box, ball, cyl, cone, rbox, addLights,
  makeCharacter, poseWalk, poseIdle, poseCheer, poseJump, tree, bushyTree, cloud, ground, showOnly, glow, sign, ctx, bg, rays, vignette, flash, wipe, fade, speedLines, confetti, sparkles,
  text, caption, pill, bar, count, endCard, registerAd } from '/_moteur/kit.js';

await loadFonts(['Luckiest', 'Inter']);
const BAR = 240 / 126;                      // durée d'une mesure : cale les changements de plan dessus
const T = { hook: 0, s1: 2 * BAR, s2: 6 * BAR, s3: 10 * BAR, end: 13 * BAR }, DURATION = 16 * BAR;   // 30,5 s

// ---------- scène 3D : tout est construit une seule fois ----------
gl3D({ exposure: 1.05 });
const scene = new THREE.Scene(), camera = makeCamera(45);
addLights(scene, { shadowArea: 22 });
const world = new THREE.Group(); scene.add(world);
world.add(ground(120, '#74c95c'));
for (let i = 0; i < 14; i++) { const tr = (i % 2 ? tree : bushyTree)(4 + hash(i) * 2); tr.position.set((hash(i * 3) - .5) * 50, 0, -8 - hash(i * 7) * 30); world.add(tr); }
for (let i = 0; i < 5; i++) { const c = cloud(1.6 + hash(i)); c.position.set((hash(i * 5) - .5) * 60, 14 + hash(i * 2) * 6, -30); world.add(c); }
const hero = makeCharacter({ shirt: '#ff5a3c', pants: '#27324f', hair: '#3b2a1e', face: 'happy' }); world.add(hero);
const pal = makeCharacter({ shirt: '#3ccf6e', hat: 'cap', hatColor: '#ffc93c' }); pal.position.set(4, 0, -2); world.add(pal);
const coins = []; for (let i = 0; i < 8; i++) { const c = cyl(.6, .6, .14, '#ffc93c', { metal: .9, rough: .25, rot: [Math.PI / 2, 0, 0] }); c.position.set(-7 + i * 2, 1.4, 3); world.add(c); coins.push(c); }

// ---------- repères sonores (déclarés une fois) ----------
cue(0.05, 'whoosh'); cue(T.s1, 'impact'); for (let i = 0; i < 8; i++) cue(T.s1 + 1 + i * .25, 'coin', .7);
cue(T.s2 - .2, 'whoosh'); cue(T.s3, 'win'); cue(T.end, 'impact'); cue(T.end + .8, 'pop');

function render(t) {
  // fond 2D (ciel), puis 3D par-dessus, puis textes et effets
  bg(['#59b7ff', '#c9ecff']);
  const [sx, sy] = shake(t, T.s1, 22);
  if (t < T.s2) {                                   // plan 1 : le héros court, travelling
    hero.position.set(-8 + (t - T.hook) * 2.2, Math.abs(Math.sin(t * 9)) * .25, 3); hero.rotation.y = Math.PI / 2; poseWalk(hero, t * 9);
    poseIdle(pal, t);
    coins.forEach((c, i) => { c.visible = hero.position.x < c.position.x - .4; c.rotation.z = t * 3 + i; });
    camLook(camera, [hero.position.x + 4, 6 + Math.sin(t) * .4, 27 - prog(t, 0, T.s2, ease.io) * 5], [hero.position.x + 1, 3.2, 0], 42);
  } else if (t < T.end) {                           // plan 2 : victoire, caméra tournante
    const a = (t - T.s2) * .5; hero.position.set(0, t > T.s3 ? Math.abs(Math.sin((t - T.s3) * 6)) * 1.2 : 0, 0); hero.rotation.y = 0;
    t > T.s3 ? poseCheer(hero, t) : poseIdle(hero, t); poseCheer(pal, t + .3); coins.forEach(c => c.visible = false);
    camLook(camera, [Math.sin(a) * 22, 7, Math.cos(a) * 22], [2, 3.4, -1], 40);
  } else {                                          // écran final : fond 3D lent
    hero.position.set(0, 0, 0); poseCheer(hero, t); poseCheer(pal, t + .3);
    camLook(camera, [8, 6 + (t - T.end) * .3, 26], [2, 9, 0], 40);
  }
  draw3D(scene, camera, { dx: sx, dy: sy });
  vignette(.35);

  // accroche
  caption(t, .15, T.s1 - .1, 'ET SI TOUT\nCOMMENÇAIT ICI ?', { font: 'Luckiest', size: 120, y: 520, anim: 'slam', color: '#ffe14d' });
  flash(t, T.s1);
  // HUD factice du plan 1
  if (t > T.s1 && t < T.s2) { pill('PIÈCES  ' + count(t, T.s1 + 1, T.s1 + 3, 0, 8), 300, 300, { bg: '#1c2541', color: '#ffc93c' }); bar(560, 270, 400, 56, inv(T.s1, T.s2, t), { color: '#45f07a' }); }
  caption(t, T.s1 + .3, T.s1 + 3.4, 'Ramasse tout', { bg: '#ff5a3c', anim: 'pop' });
  caption(t, T.s1 + 3.6, T.s2 - .3, 'Avec tes amis', { bg: '#3ccf6e', anim: 'slide' });
  wipe(t, T.s2, { color: '#ffc93c', color2: '#ff5a3c' });
  caption(t, T.s2 + .4, T.s3 - .2, 'Deviens le meilleur', { anim: 'rise', size: 96 });
  if (t > T.s3 && t < T.end) { speedLines(t, { alpha: .5 }); confetti(t, T.s3); caption(t, T.s3, T.end - .2, 'VICTOIRE !', { font: 'Luckiest', size: 170, y: 430, anim: 'slam', grad: ['#fff27a', '#ff9d2e'] }); }
  flash(t, T.end);
  if (t >= T.end) { fade(.45 * inv(T.end, T.end + .4, t), '#0b1030'); rays(t, { cy: 640 }); sparkles(t, { y: 250, h: 900 }); endCard(t, T.end + .15, { title: 'NOM DU JEU', tagline: 'Une phrase qui donne envie', status: 'bientot', font: 'Luckiest', titleGrad: ['#fff27a', '#ff9d2e'], accent: '#ff5a3c' }); }
}

registerAd({ duration: DURATION, thumbTime: T.s3 + .6, render,
  music: { style: 'toybox', bpm: 126, sections: [[0, 'intro'], [T.s1, 'drop'], [T.s2, 'break'], [T.s3, 'drop2']], end: T.end } });
