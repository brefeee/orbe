// Effets sonores synthétisés dans la page : aucun fichier à télécharger, et rien ne passe par le serveur ni par les IA.
const KEY = 'orbe-son';
const VOLUME = 0.16;
let ctx = null, master = null;
let on = true;
try { on = localStorage.getItem(KEY) !== 'non'; } catch {}

// Le navigateur n'autorise le son qu'après un premier geste de l'utilisateur.
function wake() {
  if (!ctx) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}
addEventListener('pointerdown', wake, { capture: true, passive: true });
addEventListener('keydown', wake, { capture: true, passive: true });

function ready() {
  return on && ctx && ctx.state === 'running';
}

function tone(freq, { at = 0, length = 0.25, level = 1, type = 'sine', slide = null } = {}) {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(master);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

function breath(length, from, to, level) {
  const size = Math.floor(ctx.sampleRate * length);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  const now = ctx.currentTime;
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + length);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(level, now + length * 0.35);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
  source.connect(filter).connect(gain).connect(master);
  source.start();
}

let lastHover = 0;
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export const sfx = {
  // Plus on descend dans la carte, plus la note est haute.
  select(depth = 0) {
    if (!ready()) return;
    const note = SCALE[Math.min(depth, SCALE.length - 1)];
    tone(note, { length: 0.5, level: 0.6 });
    tone(note * 1.5, { at: 0.06, length: 0.55, level: 0.3 });
    tone(note * 2.01, { at: 0.02, length: 0.3, level: 0.12 });
  },
  hover() {
    const now = performance.now();
    if (!ready() || now - lastHover < 70) return;
    lastHover = now;
    tone(1320, { length: 0.05, level: 0.08 });
  },
  whoosh() {
    if (ready()) breath(0.55, 280, 1700, 0.5);
  },
  add() {
    if (!ready()) return;
    [659.25, 783.99, 1046.5].forEach((n, i) => tone(n, { at: i * 0.075, length: 0.35, level: 0.42 }));
  },
  remove() {
    if (ready()) tone(392, { length: 0.3, level: 0.4, slide: 196 });
  },
  error() {
    if (!ready()) return;
    tone(196, { length: 0.16, level: 0.42, type: 'triangle' });
    tone(164.81, { at: 0.13, length: 0.24, level: 0.42, type: 'triangle' });
  },
  found() {
    if (ready()) tone(987.77, { length: 0.1, level: 0.14 });
  },
  isOn: () => on,
  toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? 'oui' : 'non'); } catch {}
    wake();
    if (on && ctx) setTimeout(() => sfx.add(), 40);
    return on;
  },
};
