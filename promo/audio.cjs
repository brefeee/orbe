// Bande-son synthétisée (aucun échantillon externe) : node audio.cjs sortie.wav
const fs = require('fs');
const SR = 48000;
const N = 18, T_INTRO = 6, D = 3.8, T_CEL = 10, T_OUT = 7.6, IMPACT = 1.3;
const CEL0 = T_INTRO + (N - 1) * D, OUT0 = CEL0 + T_CEL, TOTAL = OUT0 + T_OUT;
const LEN = Math.ceil(TOTAL * SR);
const L = new Float32Array(LEN), R = new Float32Array(LEN), SEND = new Float32Array(LEN);
const TAU = Math.PI * 2;
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const semi = n => 146.83 * Math.pow(2, n / 12);        // ré3

function put(i, l, r, send) { if (i < 0 || i >= LEN) return; L[i] += l; R[i] += r; SEND[i] += (l + r) * 0.5 * send; }

function bell(t0, f, amp, tau, pan = 0, send = 0.5) {
  const n0 = Math.round(t0 * SR), n = Math.round(tau * 7 * SR), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const t = i / SR, e = (1 - Math.exp(-t / 0.006)) * Math.exp(-t / tau);
    const s = amp * e * (Math.sin(TAU * f * t) + 0.32 * Math.sin(TAU * 2.005 * f * t) * Math.exp(-t / (tau * 0.5)) + 0.12 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t / (tau * 0.3)));
    put(n0 + i, s * gl, s * gr, send); }
}
function pad(t0, dur, f, amp, att = 0.9, rel = 1.6, send = 0.4) {
  const n0 = Math.round(t0 * SR), n = Math.round((dur + rel) * SR);
  for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / att) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1), e2 = e * e;
    const a = Math.sin(TAU * f * 0.997 * t) + 0.18 * Math.sin(TAU * f * 2 * t + 1), b = Math.sin(TAU * f * 1.003 * t + 0.7) + 0.18 * Math.sin(TAU * f * 2.004 * t);
    put(n0 + i, amp * e2 * a, amp * e2 * b, send); }
}
function thump(t0, f1, f2, amp, tau) {
  const n0 = Math.round(t0 * SR), n = Math.round(tau * 6 * SR); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = f2 + (f1 - f2) * Math.exp(-t / (tau * 0.25)); ph += TAU * f / SR;
    const s = amp * Math.exp(-t / tau) * Math.min(1, t / 0.003) * Math.sin(ph); put(n0 + i, s, s, 0.15); }
}
function whoosh(tc, rise, fall, amp, f1 = 350, f2 = 3200) {   // bruit filtré (passe-bande balayé)
  const n0 = Math.round((tc - rise) * SR), n = Math.round((rise + fall) * SR); let lo = 0, bd = 0, lo2 = 0, bd2 = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, p = t < rise ? t / rise : 1 - (t - rise) / fall, e = t < rise ? Math.pow(p, 2.6) : Math.pow(Math.max(0, p), 1.8);
    const fc = f1 * Math.pow(f2 / f1, t < rise ? p : 0.4 + 0.6 * p), k = 2 * Math.sin(Math.PI * fc / SR), q = 0.55;
    let x = rnd(); lo += k * bd; const hi = x - lo - q * bd; bd += k * hi;
    x = rnd(); lo2 += k * bd2; const hi2 = x - lo2 - q * bd2; bd2 += k * hi2;
    put(n0 + i, amp * e * bd, amp * e * bd2, 0.35); }
}

// nappe continue (ré / la), qui s'épaissit avec la progression
for (let i = 0; i < LEN; i++) { const t = i / SR;
  const lvl = Math.min(1, Math.max(0, (t - T_INTRO) / (CEL0 + IMPACT - T_INTRO)));
  let e = Math.min(1, t / 2.5) * (0.5 + 0.5 * lvl); if (t > OUT0 + 0.9) e *= 0.55; e *= Math.min(1, Math.max(0, (TOTAL - t) / 2.2));
  if (t > CEL0 && t < CEL0 + IMPACT) e *= 1 - 0.7 * (t - CEL0) / IMPACT;   // respiration avant Celestia
  const trem = 0.85 + 0.15 * Math.sin(TAU * 0.11 * t);
  const a = 0.085 * Math.sin(TAU * 36.71 * t) + 0.075 * Math.sin(TAU * 73.42 * t) + 0.04 * Math.sin(TAU * 110 * t + 0.4) + 0.02 * lvl * Math.sin(TAU * 220.3 * t);
  const b = 0.085 * Math.sin(TAU * 36.71 * t) + 0.075 * Math.sin(TAU * 73.62 * t + 1) + 0.04 * Math.sin(TAU * 110.2 * t) + 0.02 * lvl * Math.sin(TAU * 219.7 * t + 2);
  L[i] += a * e * trem; R[i] += b * e * trem; SEND[i] += (a + b) * 0.1 * e; }

// intro
bell(0.45, semi(12), 0.09, 2.2, -0.2, 0.8); bell(0.45, semi(19), 0.06, 2.2, 0.2, 0.8);
bell(3.15, semi(12), 0.07, 1.8, 0.2, 0.8); bell(3.15, semi(24), 0.05, 1.8, -0.2, 0.8);

// 17 paliers : une gamme qui monte, des impacts qui grossissent
const STEPS = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29, 31, 34, 36, 39];
for (let i = 0; i < N - 1; i++) { const t0 = T_INTRO + i * D, k = i / 16;
  whoosh(t0, 0.5, 0.45, 0.07 + 0.09 * k);
  thump(t0 + 0.02, 95 + 25 * k, 46 - 8 * k, 0.2 + 0.22 * k, 0.28 + 0.2 * k);
  bell(t0 + 0.06, semi(STEPS[i]), 0.11, 1.5, i % 2 ? 0.35 : -0.35, 0.7);
  bell(t0 + 0.06, semi(STEPS[i] + 7), 0.045, 1.2, i % 2 ? -0.35 : 0.35, 0.7);
  bell(t0 + 0.88, semi(STEPS[i] + 12), 0.03, 0.8, 0.5, 0.8);          // tintement du badge −50 %
  pad(t0, D - 0.6, semi(STEPS[i] - 12), 0.028 + 0.02 * k); pad(t0, D - 0.6, semi(STEPS[i] - 5), 0.016 + 0.014 * k); }

// Celestia : montée, impact, accord majeur
whoosh(CEL0 + IMPACT, IMPACT, 1.8, 0.3, 200, 6000);
{ const n0 = Math.round(CEL0 * SR), n = Math.round(IMPACT * SR); let ph = 0;
  for (let i = 0; i < n; i++) { const p = i / n; ph += TAU * (110 * Math.pow(8, p)) / SR; const s = 0.07 * p * p * Math.sin(ph); put(n0 + i, s, s, 0.5); } }
const TI = CEL0 + IMPACT;
thump(TI, 130, 31, 0.6, 1.1);
[[-24, 0.07], [-17, 0.06], [-12, 0.06], [-5, 0.05], [0, 0.05], [4, 0.04], [7, 0.04], [12, 0.03], [14, 0.02]].forEach(([s, a], j) => { pad(TI, T_CEL - IMPACT - 1.2, semi(s), a, 0.25, 2.5, 0.5); });
[[12, 0.1], [16, 0.08], [19, 0.08], [24, 0.07], [28, 0.05], [31, 0.05], [36, 0.035]].forEach(([s, a], j) => bell(TI + j * 0.11, semi(s), a, 3.2, (j % 2 ? 1 : -1) * 0.4, 0.9));
[1.0, 1.25, 1.5].forEach((d, j) => bell(TI + d, semi([24, 28, 31][j]), 0.045, 1.4, [-0.5, 0, 0.5][j], 0.8));
bell(TI + 1.78, semi(36), 0.03, 0.9, 0.3, 0.8);

// conclusion
whoosh(OUT0 + 0.9, 0.9, 0.9, 0.16, 300, 4500); thump(OUT0 + 0.9, 90, 36, 0.35, 0.7);
[[0, 0.05], [7, 0.04], [12, 0.07], [16, 0.05], [19, 0.05], [24, 0.04]].forEach(([s, a], j) => bell(OUT0 + 0.95 + j * 0.07, semi(s), a, 3.0, (j % 2 ? 1 : -1) * 0.3, 0.9));
pad(OUT0 + 0.9, 3.8, semi(-12), 0.04, 0.6, 2.6); pad(OUT0 + 0.9, 3.8, semi(-5), 0.03, 0.6, 2.6); pad(OUT0 + 0.9, 3.8, semi(4), 0.022, 0.6, 2.6);

// réverbération (Schroeder) + limiteur doux
function reverb(inp, combs, aps) { let out = new Float32Array(LEN);
  for (const [d, fb] of combs) { const buf = new Float32Array(d); let p = 0, lp = 0;
    for (let i = 0; i < LEN; i++) { const y = buf[p]; lp = y * 0.72 + lp * 0.28; buf[p] = inp[i] + lp * fb; out[i] += y; if (++p >= d) p = 0; } }
  for (const d of aps) { const buf = new Float32Array(d); let p = 0;
    for (let i = 0; i < LEN; i++) { const b = buf[p], x = out[i], y = -0.5 * x + b; buf[p] = x + 0.5 * y; out[i] = y; if (++p >= d) p = 0; } }
  return out; }
const wl = reverb(SEND, [[1687, 0.86], [1931, 0.85], [2153, 0.84], [2377, 0.83]], [241, 83]);
const wr = reverb(SEND, [[1733, 0.86], [1979, 0.85], [2203, 0.84], [2411, 0.83]], [251, 89]);
let peak = 0;
for (let i = 0; i < LEN; i++) { L[i] = Math.tanh((L[i] + 0.3 * wl[i]) * 1.5); R[i] = Math.tanh((R[i] + 0.3 * wr[i]) * 1.5); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const g = 0.89 / peak, fin = 0.03 * SR, fout = 1.0 * SR;
const pcm = Buffer.alloc(44 + LEN * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + LEN * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(LEN * 4, 40);
for (let i = 0; i < LEN; i++) { const f = Math.min(1, i / fin, (LEN - i) / fout) * g;
  pcm.writeInt16LE(Math.round(L[i] * f * 32767), 44 + i * 4); pcm.writeInt16LE(Math.round(R[i] * f * 32767), 46 + i * 4); }
fs.writeFileSync(process.argv[2] || 'audio.wav', pcm);
console.log('audio', (LEN / SR).toFixed(2) + ' s', 'pic brut', peak.toFixed(3));
