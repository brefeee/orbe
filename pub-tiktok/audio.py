"""Bande-son de la pub : musique originale (trap/phonk 120 BPM) + effets synchronisés.
Tout est synthétisé ici (aucun son sous licence). Usage : python3 audio.py build/cues.json build/audio.wav
"""
import json, sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(7)
cfg = json.load(open(sys.argv[1]))
CUES, MUS = cfg['cues'], cfg['music']
DUR = cfg['duration'] + 0.6
N = int(DUR * SR)
BPM = MUS['bpm']; BEAT = 60 / BPM; STEP = BEAT / 4


def t_(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.002, k=8.0):
    t = t_(d); e = np.exp(-t * k)
    na = max(1, int(a * SR)); e[:na] *= np.linspace(0, 1, na); return e
def noise(d): return rng.standard_normal(int(d * SR))
def fft_filter(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g, len(x))
def place(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n] * g
def note(n): return 440 * 2 ** ((n - 69) / 12)
def reverb(x, d=1.6, mix=0.25):
    ir = noise(d) * np.exp(-t_(d) * 4.5); ir = fft_filter(ir, 200, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + len(ir); y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
    return x * (1 - mix) + y * mix * 0.6

# ------------------------------------------------------------------ instruments
def kick():
    t = t_(0.5); f = 45 + 120 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)
    s[:200] += noise(200 / SR) * np.linspace(1, 0, 200) * 0.5
    return np.tanh(s * 2.2) * 0.9
def clap():
    d = 0.35; x = np.zeros(int(d * SR))
    for o in (0, 0.011, 0.022): place(x, fft_filter(noise(0.3), 900, 5000) * env(0.3, 0.001, 22), o)
    return x * 0.5
def hat(open_=False):
    d = 0.3 if open_ else 0.06
    return fft_filter(noise(d), 7000, None) * env(d, 0.001, 9 if open_ else 70) * 0.35
def bass808(freq, d):
    t = t_(d); f = freq * (1 + 0.5 * np.exp(-t * 40))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    na = 100; s[:na] *= np.linspace(0, 1, na); s[-400:] *= np.linspace(1, 0, 400)
    return np.tanh(s * 2.6) * 0.55
def cowbell(freq, d=0.22):
    t = t_(d); s = np.sign(np.sin(2 * np.pi * freq * t)) + np.sign(np.sin(2 * np.pi * freq * 1.48 * t))
    s = fft_filter(s, 500, 4500) * np.exp(-t * 14)
    return s * 0.16
def pad(freqs, d):
    t = t_(d); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0, 0.12):
            ff = f * 2 ** (det / 12); s += 2 * ((t * ff) % 1) - 1
    s = fft_filter(s, 80, 1400) / (len(freqs) * 3)
    e = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.15)
    return s * e * 0.35

# ------------------------------------------------------------------ musique
music = np.zeros(N)
drums = np.zeros(N)
bass = np.zeros(N)
drop1, drop2 = MUS['drops']
end = MUS['end']
def stopped(t): return any(a <= t < b for a, b in MUS['stops'])
# progression Do mineur : Cm - Ab - Eb - Bb (une mesure = 2 s)
CH = [[48, 51, 55], [44, 48, 51], [51, 55, 58], [46, 50, 53]]
ROOT = [36, 32, 39, 34]
# intro : nappe filtrée + montée
for b in range(int(drop1 / (4 * BEAT)) + 1):
    t0 = b * 4 * BEAT; d = min(4 * BEAT, drop1 - t0)
    if d > 0.05: place(music, pad([note(n + 12) for n in CH[b % 4]], d), t0, 0.8)
r = noise(drop1); r = fft_filter(r, 2000, 9000) * np.linspace(0, 1, len(r)) ** 3 * 0.25
place(music, r, 0)
for t in (0.0, 1.0): place(drums, kick(), t, 0.8)
# couplet / refrain
MEL = [0, None, 3, None, 7, None, 3, 5, 0, None, 10, None, 7, 5, 3, None]  # en demi-tons au-dessus de Do5
for step in range(int((end - drop1) / STEP) + 1):
    t = drop1 + step * STEP
    if t >= end: break
    s16 = step % 16; bar = int((t - drop1) / (4 * BEAT)) % 4
    if stopped(t): continue
    kick_steps = (0, 6, 10) if bar % 2 == 0 else (0, 3, 10, 14)
    if s16 in kick_steps: place(drums, kick(), t, 1.0)
    if s16 in (4, 12): place(drums, clap(), t, 1.0)
    roll = (bar == 3 and s16 >= 12)
    if s16 % 2 == 0 or roll: place(drums, hat(), t, 0.9 if s16 % 4 == 0 else 0.6)
    if roll: place(drums, hat(), t + STEP / 2, 0.5)
    if s16 == 14: place(drums, hat(True), t, 0.5)
    if s16 in (0, 6, 10) or (s16 == 14 and bar % 2):
        place(bass, bass808(note(ROOT[bar]), STEP * (6 if s16 == 0 else 4)), t, 1.0)
    m = MEL[s16]
    if m is not None and (t >= drop1 + 4 * BEAT * 2 or s16 < 8):
        place(music, cowbell(note(72 + m + (0 if bar != 2 else 3))), t, 1.0)
    if s16 == 0: place(music, pad([note(n) for n in CH[bar]], 4 * BEAT), t, 0.55)
# coupure avant le mat, l'écran CAUCHEMAR et la fin : montées
for a, b in MUS['stops']:
    x = fft_filter(noise(b - a), 1500, 10000) * np.linspace(0, 1, int((b - a) * SR)) ** 2 * 0.35
    place(music, x, a)
place(drums, kick(), end, 1.2); place(music, reverb(pad([note(n) for n in CH[0]], 1.0)), end, 1.0)
music = reverb(music, 1.4, 0.3)

# ------------------------------------------------------------------ effets sonores
def sfx(name, p=1.0):
    if name == 'move':
        t = t_(0.18)
        body = (np.sin(2 * np.pi * 240 * p * t) * 0.6 + np.sin(2 * np.pi * 620 * p * t) * 0.35) * np.exp(-t * 45)
        click = fft_filter(noise(0.18), 1200, 5000) * np.exp(-t * 120)
        thump = np.sin(2 * np.pi * 95 * t) * np.exp(-t * 30)
        return (body + click * 0.9 + thump * 0.8) * 0.8
    if name == 'capture':
        base = np.concatenate([sfx('move', 0.8) * 1.1, np.zeros(int(0.22 * SR))])
        return base + fft_filter(noise(0.4), 300, 6000) * env(0.4, 0.001, 12) * 0.5 + boom(0.4, 70) * 0.6
    if name == 'check':
        t = t_(0.7); s = sum(np.sin(2 * np.pi * f * t) * a for f, a in ((1568, 1), (2350, 0.5), (3920, 0.25)))
        return s * np.exp(-t * 6) * 0.25
    if name == 'hit': return boom(0.8, 55 * p) * 0.9 + fft_filter(noise(0.8), 100, 3000) * env(0.8, 0.001, 9) * 0.25
    if name == 'impact':
        return boom(1.4, 42 * p) * 1.1 + fft_filter(noise(1.4), 60, 9000) * env(1.4, 0.001, 5) * 0.4 + np.concatenate([sfx('move', 0.7), np.zeros(int(1.22 * SR))]) * 0.8
    if name == 'mate':
        return boom(2.0, 38) * 1.2 + reverb(fft_filter(noise(2.0), 2000, 12000) * env(2.0, 0.001, 3) * 0.25, 1.5, 0.5) + np.concatenate([sfx('check') * 1.5, np.zeros(int(1.3 * SR))])
    if name == 'sac':
        t = t_(1.0); s = np.sin(2 * np.pi * (300 + 900 * t) * t) * np.exp(-t * 3) * 0.15
        return s + boom(1.0, 60) * 0.5
    if name == 'pop':
        t = t_(0.09); f = 500 + 700 * np.exp(-t * 60); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40) * 0.35
    if name == 'tick':
        t = t_(0.05); return np.sin(2 * np.pi * 2200 * p * t) * np.exp(-t * 120) * 0.4
    if name in ('whoosh', 'fall', 'swipe'):
        d = {'whoosh': 0.45, 'fall': 0.55, 'swipe': 0.3}[name]
        x = noise(d); n = len(x); half = np.linspace(0, 1, n)
        lo = fft_filter(x, 200, 1200); hi = fft_filter(x, 1500, 7000 * p)
        e = np.sin(np.pi * half) ** 2 if name != 'fall' else half ** 2
        return (lo * (1 - half) + hi * half) * e * (0.7 if name != 'swipe' else 0.45)
    if name == 'win':
        out = np.zeros(int(1.3 * SR))
        for i, n in enumerate((72, 76, 79, 84)):
            t = t_(0.9); s = (np.sin(2 * np.pi * note(n) * t) + 0.4 * np.sin(4 * np.pi * note(n) * t)) * np.exp(-t * 4)
            place(out, s * 0.25, i * 0.07)
        return out + boom(1.3, 50) * 0.6
    if name in ('ding', 'shield'):
        t = t_(0.9); f = 1318 if name == 'ding' else 988
        return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 5) * 0.25
    if name == 'live':
        out = np.zeros(int(0.4 * SR))
        for o in (0, 0.13): t = t_(0.1); place(out, np.sin(2 * np.pi * 1000 * t) * np.exp(-t * 30) * 0.3, o)
        return out
    if name == 'blip':
        t = t_(0.35); f = 400 + 400 * np.sin(t * 60); return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 8) * 0.08
    if name == 'riser':
        d = 1.5; t = t_(d); f = 200 * 2 ** (t * 2.5)
        s = (2 * ((np.cumsum(f) / SR) % 1) - 1); s = fft_filter(s, 100, 3000) * (t / d) ** 2 * 0.25
        return s + fft_filter(noise(d), 3000, 12000) * (t / d) ** 3 * 0.25
    if name == 'glitch':
        out = np.zeros(int(0.7 * SR))
        for i in range(10):
            seg = noise(0.04) * (rng.random() * 0.5 + 0.2)
            seg = np.round(seg * 3) / 3; place(out, seg * 0.5, i * 0.06 + rng.random() * 0.02)
        t = t_(0.7); out += np.tanh(np.sin(2 * np.pi * 55 * t) * 4) * np.exp(-t * 3) * 0.4
        return out
    if name == 'coin':
        out = np.zeros(int(0.35 * SR))
        for o, f in ((0, 988 * p), (0.06, 1319 * p)):
            t = t_(0.28); place(out, np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 14) * 0.08, o)
        return out
    if name == 'coinburst':
        out = np.zeros(int(1.0 * SR))
        for i in range(12): place(out, sfx('coin', 0.9 + rng.random() * 0.6) * 0.6, rng.random() * 0.6)
        return out + boom(1.0, 60) * 0.3
    if name == 'cash':
        return sfx('win') * 0.8
    if name in ('shine', 'sparkle'):
        out = np.zeros(int(1.5 * SR))
        for i, n in enumerate((84, 88, 91, 96, 100) if name == 'shine' else (96, 91, 100)):
            t = t_(1.0); place(out, np.sin(2 * np.pi * note(n) * t) * np.exp(-t * 5) * 0.12, i * 0.06)
        return reverb(out, 1.2, 0.5)
    if name == 'button':
        out = sfx('ding') * 0.6; place(out, sfx('pop'), 0.0, 1.5); return out
    if name == 'final':
        out = boom(2.0, 40) * 1.2; place(out, sfx('shine'), 0.0, 1.0); return out
    raise ValueError(name)
def boom(d, f0):
    t = t_(d); f = f0 + f0 * 2 * np.exp(-t * 20)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) * 1.8)

fx = np.zeros(N)
duck = np.ones(N)
for c in CUES:
    x = sfx(c['s'], c['p'])
    place(fx, x, c['t'], c['g'])
    if c['s'] in ('impact', 'mate', 'glitch', 'final', 'hit'):
        i = int(c['t'] * SR); n = int(0.5 * SR)
        seg = 1 - 0.45 * np.exp(-np.arange(n) / SR * 6)
        j = min(N, i + n); duck[i:j] = np.minimum(duck[i:j], seg[:j - i])
fx = reverb(fx, 0.9, 0.15)

mix = (music * 0.9 + drums * 0.85 + bass * 0.9) * duck + fx * 1.0
# légère stéréo : retards différents gauche/droite sur la musique
L = mix + np.roll(music, int(0.011 * SR)) * 0.12
R = mix + np.roll(music, int(0.017 * SR)) * 0.12
st = np.stack([L, R], 1)
fade = int(0.5 * SR); st[-fade:] *= np.linspace(1, 0, fade)[:, None]
st = np.tanh(st / np.max(np.abs(st)) * 1.4) * 0.89
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
print('audio ok', DUR, 's')
