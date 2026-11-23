"""Bande-son originale du film ORBE : électronique cinématique, 60 s, 120 BPM, ré mineur.
Entièrement synthétisée (aucun échantillon tiers) → build/music.wav"""
import numpy as np, wave
from scipy.signal import butter, sosfilt, fftconvolve

SR, DUR = 44100, 60.0
N = int(SR * DUR)
rs = np.random.RandomState(4)
dry = np.zeros((N, 2)); wet = np.zeros((N, 2)); drums = np.zeros((N, 2)); duck = np.ones(N)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def filt(x, fc, kind='low', order=2): return sosfilt(butter(order, np.asarray(fc) / (SR / 2), kind, output='sos'), x, axis=0)
def put(bus, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[:N - i]
    bus[i:i + len(sig), 0] += sig * gain * min(1, 1 - pan); bus[i:i + len(sig), 1] += sig * gain * min(1, 1 + pan)
def tt(d): return np.arange(int(d * SR)) / SR
def saw(f, d, det=0.0, ph=0.0): return 2 * (((f * (1 + det)) * tt(d) + ph) % 1) - 1
def env(d, a=.01, r=.1):
    n = int(d * SR); e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e

def pad(t, d, notes, gain, fc=1400, a=1.2, r=1.5):
    for ch, sgn in ((0, -1), (1, 1)):
        x = sum(saw(hz(n), d, sgn * .004 * (k % 3 + 1), rs.rand()) + saw(hz(n), d, -sgn * .006, rs.rand()) for k, n in enumerate(notes))
        x = filt(x, fc) * env(d, a, r) / len(notes)
        i = int(t * SR); x = x[:N - i]; wet[i:i + len(x), ch] += x * gain; dry[i:i + len(x), ch] += x * gain * .5
def pluck(t, note, gain, dec=.16, fc=3200, pan=0.0, bus=None):
    d = dec * 5; x = (saw(hz(note), d) + .5 * np.sign(saw(hz(note) * 1.003, d))) * np.exp(-tt(d) / dec)
    x = filt(x, fc); x[:60] *= np.linspace(0, 1, 60); put(dry, t, x, gain, pan); put(wet, t, x, gain * .6, -pan)
def bell(t, note, gain, pan=0.0):
    d = 3.0; ti = tt(d); x = (np.sin(2 * np.pi * hz(note) * ti) + .4 * np.sin(2 * np.pi * hz(note) * 2.01 * ti) * np.exp(-ti * 3) + .2 * np.sin(2 * np.pi * hz(note) * 3.98 * ti) * np.exp(-ti * 6)) * np.exp(-ti / .7)
    x[:40] *= np.linspace(0, 1, 40); put(wet, t, x, gain, pan); put(dry, t, x, gain * .4, pan)
def bass(t, note, d, gain, fc=220, growl=0.0):
    ti = tt(d); x = np.sin(2 * np.pi * hz(note) * ti) + .6 * filt(saw(hz(note), d) + saw(hz(note), d, .007), fc * 3)
    if growl: x *= 1 - growl * (.5 + .5 * np.sin(2 * np.pi * 4 * ti))
    put(dry, t, np.tanh(x * 1.4) * env(d, .008, min(.08, d / 3)), gain)
def kick(t, gain=1.0, deep=1.0):
    d = .45; ti = tt(d); f = 46 * deep + 110 * np.exp(-ti / .035); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-ti / (.16 * (2 - deep) + .02))
    x[:200] += rs.randn(200) * .25 * np.linspace(1, 0, 200); put(drums, t, np.tanh(x * 1.6), gain)
    i = int(t * SR); n = int(.3 * SR); e = 1 - .6 * np.exp(-np.arange(n) / (.09 * SR)); duck[i:i + n] = np.minimum(duck[i:i + n], e[:max(0, min(n, N - i))])
def snare(t, gain=1.0, d=.28):
    ti = tt(d); x = filt(rs.randn(len(ti)), [900, 7000], 'band') * np.exp(-ti / (d / 4)) + .5 * np.sin(2 * np.pi * 185 * ti) * np.exp(-ti / .05)
    put(drums, t, x, gain * .6); put(wet, t, x, gain * .22)
def hat(t, gain=1.0, d=.05, pan=.2):
    ti = tt(d * 4); put(drums, t, filt(rs.randn(len(ti)), 7500, 'high') * np.exp(-ti / d), gain * .22, pan)
def impact(t, gain=1.0):
    d = 3.2; ti = tt(d); f = 34 + 60 * np.exp(-ti / .12); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-ti / .9)
    nz = filt(rs.randn(len(ti)), 2600) * np.exp(-ti / .35)
    put(drums, t, np.tanh(x * 2) * .95, gain); put(wet, t, nz, gain * .55); put(dry, t, nz, gain * .3)
def riser(t, d, gain=1.0, lo=300, hi=9000):
    ti = tt(d); k = ti / d; nz = rs.randn(len(ti)); out = np.zeros(len(ti))
    for j in range(6):      # balayage de filtre approximé par fondus entre bandes
        fc = lo * (hi / lo) ** (j / 5); band = filt(nz, [fc * .6, min(fc * 1.5, 20000)], 'band'); out += band * np.clip(1 - np.abs(k * 5 - j), 0, 1)
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (k * 2)) / SR) * .25
    x = (out + tone) * k ** 2.2; x[-200:] *= np.linspace(1, 0, 200)
    put(wet, t, x, gain * .5, -.3); put(dry, t, x, gain * .5, .3)
def whoosh(t, d=.5, gain=.5):
    ti = tt(d); put(wet, t - d / 2, filt(rs.randn(len(ti)), [1200, 6000], 'band') * np.sin(np.pi * ti / d) ** 2, gain)

D2, F2, G2, A2, Bb1, C2 = 38, 41, 43, 45, 34, 36
CH = {'Dm': (38, [50, 57, 62, 65, 69]), 'Bb': (34, [46, 53, 58, 62, 65]), 'F': (41, [53, 57, 60, 65, 69]), 'C': (36, [48, 55, 60, 64, 67]),
      'Gm': (43, [55, 58, 62, 67, 70]), 'A': (45, [57, 61, 64, 69, 73]), 'Dsus': (38, [50, 57, 62, 64, 69])}
def arp(t0, t1, ch, step, gain, octs=(12, 24), dec=.14, fc=3200):
    notes = [n + o for o in octs for n in CH[ch][1][1:]]; pat = [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 4, 5, 3]
    for k in range(int(round((t1 - t0) / step))):
        pluck(t0 + k * step, notes[pat[k % 16] % len(notes)], gain * (1.15 if k % 4 == 0 else .8), dec, fc, pan=.5 * (-1) ** k)

# ---- 0–8 : introduction — nappe, cloches, montée
pad(0, 5, CH['Dm'][1][:4], .16, 700, 2.5, 1.5); pad(4, 4.6, CH['Bb'][1][:4], .2, 1100, 1.2, .8)
bass(0, 26, 8, .16, 120)
bell(.4, 74, .1); bell(3.3, 81, .2, .2)
for k, n in enumerate((74, 77, 81)): bell(4.7 + .8 * k, n, .2, -.3 + .3 * k)
riser(5.5, 2.5, .9)
# ---- 8–22 : NITRO — rapide, vif, quatre temps
impact(8, .9)
for t0, ch in ((8, 'Dm'), (12, 'Bb'), (16, 'F'), (20, 'C')):
    t1 = min(t0 + 4, 22); pad(t0, t1 - t0 + .3, CH[ch][1][:4], .1, 2200, .05, .4); arp(t0, t1, ch, .125, .16)
    for k in range(int((t1 - t0) / .25)):
        if not (13 <= t0 + k * .25 < 13.0): bass(t0 + k * .25, CH[ch][0], .2, .26 if k % 2 else .2)
for k in range(28):
    t = 8 + k * .5; kick(t, .95); hat(t + .25, 1.0); hat(t + .125, .4, .03, -.3); hat(t + .375, .4, .03, .3)
    if k % 2: snare(t, .55, .16)
whoosh(13); whoosh(17.5); riser(20, 2, .9)
# ---- 22–38 : VORTEX — plus lourd, plus profond, demi-tempo
impact(22, 1.0)
for t0, ch in ((22, 'Dm'), (26, 'Bb'), (30, 'Gm'), (34, 'A')):
    d = 4 if t0 < 34 else 3.6
    pad(t0, d + .4, CH[ch][1], .2, 2600 if t0 < 30 else 3200, .08, .6); pad(t0, d + .3, [n - 12 for n in CH[ch][1][:3]], .14, 900, .05, .5)
    bass(t0, CH[ch][0] - 12, d, .5, 200, growl=.35); bass(t0, CH[ch][0], d, .22, 300, growl=.5)
    arp(t0, t0 + d, ch, .25, .09, (12,), .22, 2400)
for b in range(8):
    t = 22 + b * 2
    if t >= 37.5: break
    kick(t, 1.0, .8); kick(t + .75, .8, .8); snare(t + 1.0, 1.0, .4); kick(t + 1.5, .7, .8) if b % 2 else None
    for k in range(8): hat(t + k * .25, .55 if k % 2 else .3, .04, .25 * (-1) ** k)
whoosh(28, .6); whoosh(33, .6); impact(28, .5); impact(33, .5)
riser(36.2, 1.55, .8, 200, 5000)
# ---- 38–52 : APETZ — ample, lumineux
impact(38, 1.0); bell(38, 86, .22); bell(38.02, 74, .2, -.3)
for t0, ch in ((38, 'Bb'), (42, 'C'), (46, 'Dm'), (50, 'C')):
    d = min(4, 52 - t0)
    pad(t0, d + .5, CH[ch][1], .22, 3600, .15, .8); pad(t0, d + .5, [n + 12 for n in CH[ch][1][2:]], .07, 5000, .6, .8)
    bass(t0, CH[ch][0] - 12, d, .42, 180); arp(t0, t0 + d, ch, .125, .1 if t0 < 40 else .13, (12, 24), .2, 4200)
    if t0 >= 40 or True:
        for k in range(int(d / .5)):
            t = t0 + k * .5
            if t < 40: continue
            kick(t, .9); hat(t + .25, .9); bass(t + .25, CH[ch][0], .2, .2)
            if k % 2: snare(t, .7, .3)
for k, n in enumerate((86, 84, 81, 84, 86, 89, 88)): bell(40 + k * 1.5, n, .15, .3 * (-1) ** k)
riser(50, 2, 1.0)
# ---- 52–60 : conclusion
impact(52, 1.0); pad(52, 4.4, CH['Dm'][1], .22, 3000, .05, 1.2); bass(52, 26, 4, .4, 160)
for k in range(8): pluck(52 + k * .5, [74, 81, 86, 81][k % 4], .1, .3, 3000, .4 * (-1) ** k)
whoosh(55.7, .8, .5); impact(56, .7)
pad(56, 4, CH['Dsus'][1], .2, 2400, .1, 3.0); pad(56, 4, [74, 81, 86], .08, 5000, .4, 3.0); bass(56, 26, 3.8, .3, 140)
for k, n in enumerate((86, 81, 78, 74)): bell(56 + k * .7, n if n != 78 else 77, .2, .25 * (-1) ** k)

# ---- mixage : réverbération, pompage, limiteur
n_ir = int(2.6 * SR); ti = np.arange(n_ir) / SR
ir = np.stack([filt(rs.randn(n_ir), 6000) * np.exp(-ti / .55) for _ in range(2)], 1); ir /= np.sqrt((ir ** 2).sum(0))
rev = np.stack([fftconvolve(wet[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = (dry + rev * .55) * duck[:, None] + drums
mix = filt(mix, 28, 'high')
mix[int(37.78 * SR):int(38 * SR)] *= np.linspace(1, 0, int(38 * SR) - int(37.78 * SR))[:, None] ** 2   # silence avant APETZ
fo = int(1.6 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5; mix[:int(.3 * SR)] *= np.linspace(0, 1, int(.3 * SR))[:, None]
mix = np.tanh(mix * 1.5 / np.percentile(np.abs(mix), 99.9)); mix *= .89 / np.abs(mix).max()
w = wave.open('build/music.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes()); w.close()
for a, b in ((0, 8), (8, 22), (22, 38), (38, 52), (52, 60)): print(a, b, 'rms %.3f' % np.sqrt((mix[a * SR:b * SR] ** 2).mean()))
