"""Bande originale de la bande-annonce ORBE, entièrement synthétisée et calée sur le montage.

Cordes (ensembles de dents de scie désaccordées), cuivres filtrés, chœur, cloches FM, pulsation électronique,
percussions, montées et impacts, puis réverbération par convolution. Aucun échantillon externe.
Usage : python3 music.py <dossier_build>   → music.wav (48 kHz stéréo) et envelope.json (enveloppe de la voix, pour l'image)
"""
import json, sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import soundfile as sf

SR = 48000
BUILD = Path(sys.argv[1])
CUES = json.loads((BUILD / 'narration.json').read_text())
DUR = CUES['duration']
N = int(DUR * SR)
rng = np.random.default_rng(2026)
L = np.zeros(N); R = np.zeros(N)          # bus « sec »
RL = np.zeros(N); RR = np.zeros(N)        # envoi vers la réverbération

def hz(note):
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    n, o = (note[:-1], int(note[-1]))
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)

def tt(d): return np.arange(int(d * SR)) / SR

def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.full(n, s, dtype=float)
    a = min(a, n); e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    if a < n: dd = min(d, n - a); e[a:a + dd] = np.linspace(1, s, dd, endpoint=False)
    if r and n > r: e[-r:] *= np.linspace(1, 0, r) ** 1.5
    return e

def polyblep_saw(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt; x = ph[m] / dt[m]; y[m] -= x + x - x * x - 1
    m = ph > 1 - dt; x = (ph[m] - 1) / dt[m]; y[m] -= x * x + x + x + 1
    return y

def lp(x, fc, order=2): return sosfilt(butter(order, min(fc, SR * .45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)

def place(sig, at, gain=1.0, pan=0.0, rev=0.3):
    """Ajoute un signal mono ou stéréo à l'instant at (s) ; pan -1..1 ; rev = part envoyée à la réverbération."""
    a = int(at * SR)
    if a >= N: return
    if sig.ndim == 1: l, r = sig * np.sqrt((1 - pan) / 2) * 1.414, sig * np.sqrt((1 + pan) / 2) * 1.414
    else: l, r = sig[0], sig[1]
    n = min(len(l), N - a)
    L[a:a + n] += l[:n] * gain; R[a:a + n] += r[:n] * gain
    RL[a:a + n] += l[:n] * gain * rev; RR[a:a + n] += r[:n] * gain * rev

# ------------------------------------------------------------------ instruments
def strings(notes, at, dur, gain=.12, attack=1.2, release=1.8, bright=2600, vib=.004):
    n = int((dur + release) * SR); t = np.arange(n) / SR
    outL = np.zeros(n); outR = np.zeros(n)
    for note in notes:
        f0 = hz(note)
        for k in range(7):
            det = (k - 3) * .0045 + rng.normal(0, .0008)
            f = f0 * (1 + det) * (1 + vib * np.sin(2 * np.pi * (4.6 + k * .23) * t + rng.random() * 6))
            s = polyblep_saw(f, n, rng.random())
            p = (k - 3) / 3 * .8
            outL += s * np.sqrt((1 - p) / 2); outR += s * np.sqrt((1 + p) / 2)
    e = env_adsr(n, attack, .5, .9, release)
    cut = lambda x: lp(lp(x, bright), bright * 1.4)
    place(np.vstack([cut(outL) * e, cut(outR) * e]) / (len(notes) * 4), at, gain, rev=.55)

def choir(notes, at, dur, gain=.1, attack=2.0, release=2.5):
    n = int((dur + release) * SR); t = np.arange(n) / SR; out = np.zeros((2, n))
    for i, note in enumerate(notes):
        f0 = hz(note)
        for k in range(3):
            f = f0 * (1 + (k - 1) * .003) * (1 + .005 * np.sin(2 * np.pi * 5.1 * t + k + i))
            ph = 2 * np.pi * np.cumsum(f) / SR
            s = np.sin(ph) + .32 * np.sin(2 * ph) + .18 * np.sin(3 * ph) + .08 * np.sin(5 * ph)
            s = bp(s, 300, 3200, 1)                       # formant « ah » approché
            out[k % 2] += s; out[(k + 1) % 2] += s * .6
    e = env_adsr(n, attack, 1, .85, release)
    place(out * e / (len(notes) * 3), at, gain, rev=.7)

def brass(notes, at, dur, gain=.12, attack=.08):
    n = int((dur + .9) * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for note in notes:
        for k in range(3): out += polyblep_saw(hz(note) * (1 + (k - 1) * .003), n, rng.random())
    fenv = 600 + 3800 * np.exp(-t * 3.5) * (1 - np.exp(-t * 40))
    y = np.zeros(n); chunk = 2400
    for i in range(0, n, chunk):                         # filtre qui s'ouvre puis se referme (attaque cuivrée)
        y[i:i + chunk] = lp(out[max(0, i - 4800):i + chunk], fenv[i])[-len(out[i:i + chunk]):]
    e = env_adsr(n, attack, .3, .7, .8)
    place(y * e / (len(notes) * 3), at, gain, rev=.45)

def bell(note, at, gain=.1, dur=4.0, pan=0.0, ratio=3.5, index=2.2):
    t = tt(dur); f = hz(note) if isinstance(note, str) else note
    mod = index * np.exp(-t * 2.2) * np.sin(2 * np.pi * f * ratio * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.4) + .3 * np.sin(2 * np.pi * f * 2.001 * t) * np.exp(-t * 2.5)
    s[:120] *= np.linspace(0, 1, 120)
    place(s, at, gain, pan, rev=.75)

def pluck(note, at, gain=.06, cutoff=2400, pan=0.0, dur=.5):
    t = tt(dur); s = polyblep_saw(hz(note), len(t), rng.random()) + polyblep_saw(hz(note) * 1.004, len(t), rng.random())
    s = lp(s, cutoff) * np.exp(-t * 9)
    s[:60] *= np.linspace(0, 1, 60)
    place(s, at, gain, pan, rev=.35)

def kick(at, gain=.5):
    t = tt(.6); f = 42 + 90 * np.exp(-t * 28); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    s += lp(rng.normal(0, 1, len(t)), 3000) * np.exp(-t * 60) * .2
    place(s, at, gain, rev=.05)

def hat(at, gain=.04, pan=.2):
    t = tt(.09); s = hp(rng.normal(0, 1, len(t)), 7000) * np.exp(-t * 55); place(s, at, gain, pan, rev=.15)

def snare(at, gain=.12):
    t = tt(.25); s = bp(rng.normal(0, 1, len(t)), 900, 7000) * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * .5
    place(s, at, gain, rev=.3)

def sub(note, at, dur, gain=.18):
    t = tt(dur); s = np.sin(2 * np.pi * hz(note) * t) * env_adsr(len(t), .02, .1, .85, .15); place(s, at, gain, rev=0)

def boom(at, gain=.9, length=4.0):
    t = tt(length); f = 26 + 70 * np.exp(-t * 4)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    s += lp(rng.normal(0, 1, len(t)), 900) * np.exp(-t * 4) * .5
    s += hp(rng.normal(0, 1, len(t)), 2500) * np.exp(-t * 9) * .12
    place(s, at, gain, rev=.6)

def timpani(note, at, gain=.25):
    t = tt(1.8); f = hz(note) * (1 + .04 * np.exp(-t * 20))
    s = (np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * np.exp(-t * 2.4)
    s += lp(rng.normal(0, 1, len(t)), 400) * np.exp(-t * 18) * .4
    place(s, at, gain, rev=.5)

def riser(at, dur, gain=.12, f0=200, f1=6000):
    t = tt(dur); k = t / dur
    noise = rng.normal(0, 1, len(t)); y = np.zeros(len(t)); chunk = 2400
    for i in range(0, len(t), chunk):
        fc = f0 * (f1 / f0) ** k[i]; y[i:i + chunk] = bp(noise[max(0, i - 2400):i + chunk], fc * .7, min(fc * 1.4, 20000))[-len(noise[i:i + chunk]):]
    tone = np.sin(2 * np.pi * np.cumsum(110 * 4 ** k) / SR) * .3
    place((y + tone) * k ** 2.2, at, gain, rev=.4)

def reverse_swell(at, dur, gain=.15):
    t = tt(dur); s = hp(rng.normal(0, 1, len(t)), 3000) * (t / dur) ** 3; place(s, at, gain, rev=.5)

def wind(at, dur, gain=.05):
    t = tt(dur); n = rng.normal(0, 1, len(t)); y = lp(n, 500); y *= .6 + .4 * np.sin(2 * np.pi * .07 * t) ; y *= env_adsr(len(t), 3, 1, 1, 2)
    place(y, at, gain, rev=.6)

def click(at, gain=.05, pan=0.0):
    t = tt(.03); s = hp(rng.normal(0, 1, len(t)), 2000) * np.exp(-t * 300); place(s, at, gain, pan, rev=.2)

def drone(notes, at, dur, gain=.08):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for note in notes: s += np.sin(2 * np.pi * hz(note) * t + .3 * np.sin(2 * np.pi * .1 * t))
    place(s * env_adsr(n, 3, 1, 1, 2.5) / len(notes), at, gain, rev=.3)

# ------------------------------------------------------------------ repères (identiques à scene/main.js)
LN = {l['id']: l for l in CUES['timeline']}
S_ = lambda i: LN[i]['start']
E_ = lambda i: LN[i]['end']
import re as _re
def sentence(i, n):
    line = LN[i]; parts = _re.findall(r'[^.?!:]+[.?!:]+', line['text']) or [line['text']]
    total = line['end'] - line['start'] - .42 * (len(parts) - 1)
    letters = [len(_re.sub(r'[^\w]', '', p_)) + 4 for p_ in parts]; sm = sum(letters); t = line['start']
    for k in range(min(n, len(parts))): t += total * letters[k] / sm + .42
    return t
T = dict(black=E_('L02') + 2.0, point=S_('L03') - 1.3, burst=E_('L03') + 1.7, map=S_('L05') - .45, sources=S_('L07') - .4, share=S_('L08') - .4,
         chat=S_('L09') - .55, ai=S_('L10') - .35, agents=S_('L12') - .5, pc=S_('L13') - .35, media=S_('L14') - .35, people=S_('L15') - .55,
         posts=S_('L16') - .3, feed=S_('L17') - .3, collab=S_('L18') - .3, eco=S_('L19') - .55, privacy=S_('L20') - .3, converge=S_('L21') - .4, impact=S_('L22') - 3.0)

# ------------------------------------------------------------------ partition
BEAT = 0.6  # 100 pulsations par minute

def bar_section(t0, t1, prog, drums=True, hats=False, arp_notes=None, arp_gain=.035, cutoff=(1500, 4000), bass=True, str_gain=.09, kick_gain=.42, half=False):
    nbar = max(1, int(round((t1 - t0) / (4 * BEAT))))
    for b_ in range(nbar):
        ch, root = prog[b_ % len(prog)]; tb = t0 + b_ * 4 * BEAT
        if tb >= t1 - .3: break
        strings(ch, tb, min(4 * BEAT, t1 - tb), str_gain, attack=.4, release=.9)
        for q in range(4):
            tq = tb + q * BEAT
            if tq >= t1: break
            if drums and (not half or q % 2 == 0): kick(tq, kick_gain)
            if hats: hat(tq + BEAT / 2, .035, pan=.3)
            if bass: sub(root, tq, BEAT * .45, .16); sub(root, tq + BEAT / 2, BEAT * .4, .11)
        if arp_notes:
            for k in range(16):
                tk = tb + k * BEAT / 4
                if tk >= t1: break
                fc = cutoff[0] + (cutoff[1] - cutoff[0]) * ((b_ * 16 + k) / (nbar * 16))
                pluck(arp_notes[(b_ * 16 + k) % len(arp_notes)], tk, arp_gain, fc, pan=(-.35, .35)[k % 2], dur=.32)

Dm = [(['D3', 'A3', 'F4'], 'D2'), (['Bb2', 'F3', 'D4'], 'Bb1'), (['F3', 'C4', 'A4'], 'F2'), (['C3', 'G3', 'E4'], 'C2')]
AI = [(['Bb2', 'F3', 'D4', 'A4'], 'Bb1'), (['F3', 'C4', 'A4'], 'F2'), (['C3', 'G3', 'E4', 'G4'], 'C2'), (['D3', 'A3', 'F4', 'A4'], 'D2')]
WARM = [(['F3', 'C4', 'A4'], 'F2'), (['C3', 'G3', 'E4'], 'C2'), (['D3', 'A3', 'F4'], 'D2'), (['Bb2', 'F3', 'D4'], 'Bb1')]
BUILD_P = [(['Bb2', 'F3', 'D4', 'F4'], 'Bb1'), (['C3', 'G3', 'E4', 'G4'], 'C2'), (['D3', 'A3', 'F4', 'A4'], 'D2'), (['F3', 'C4', 'A4', 'C5'], 'F2')]
ARP_A = ['D5', 'A4', 'F5', 'A4', 'C6', 'A4', 'F5', 'A4']
ARP_B = ['F5', 'A5', 'C6', 'A5', 'D6', 'C6', 'A5', 'G5']
ARP_C = ['A4', 'C5', 'F5', 'C5', 'G5', 'E5', 'C5', 'E5']

# Acte I — le monde éparpillé
B0 = T['black']
drone(['D1', 'A1'], 0, B0, .16); wind(0, B0, .05)
for i, tm in enumerate(np.arange(1.0, B0 - 1.5, 1.6)): bell(['A4', 'F5', 'E5', 'C5', 'D5', 'A4', 'F5', 'G5'][i % 8], float(tm), .05, 5, pan=(-.6, .6)[i % 2], ratio=3.51, index=1.5)
for tm in rng.uniform(1, B0 - .5, 46): click(float(tm), .03 + rng.random() * .03, float(rng.uniform(-.8, .8)))
strings(['D4', 'Eb4', 'A4'], B0 - 6.5, 6.4, .07, attack=5, release=.08, bright=1800)
reverse_swell(B0 - 2.0, 1.9, .05)
# Acte II — le point, la naissance
P0, BU = T['point'], T['burst']
bell('A6', P0, .09, 6, ratio=2.0, index=.8); bell('D6', P0 + .05, .05, 6, ratio=2.0, index=.6)
choir(['D3', 'A3', 'D4'], P0 + .6, BU - P0 - .6, .10, attack=3.0, release=1)
reverse_swell(BU - 2.6, 2.6, .14)
boom(BU, .95, 5)
strings(['Bb2', 'F3', 'D4', 'F4', 'C5'], BU, 6.2, .16, attack=.6, release=2.5, bright=3200); choir(['Bb3', 'D4', 'F4'], BU + .15, 6.0, .08, attack=1.2)
for i, (ch, root) in enumerate(Dm * 2):
    tb = BU + 6.0 + i * 2.0
    if tb >= T['map'] - .5: break
    strings(ch, tb, 2.1, .3, attack=.8, release=1.2); sub(root, tb, 2.0, .12)
k = 0
while BU + 7.5 + k * BEAT / 4 < T['map'] - .3:
    pluck(['D5', 'F5', 'A5', 'C6', 'A5', 'F5'][k % 6], BU + 7.5 + k * BEAT / 4, .06 * min(1, k / 20), 3500, pan=(-.4, .4)[k % 2], dur=.35); k += 1

# 01 La carte
bar_section(T['map'], T['sources'], Dm, arp_notes=ARP_A, cutoff=(1200, 3000))
timpani('D2', T['sources'], .25); bell('A5', T['sources'] + .05, .045, 4, ratio=2.0, index=.6)
bar_section(T['sources'], T['share'], Dm, hats=True, arp_notes=ARP_A, cutoff=(2400, 3600))
bar_section(T['share'], T['chat'] - .5, Dm[2:] + Dm[:2], hats=True, arp_notes=ARP_A, cutoff=(2600, 3800))
reverse_swell(T['chat'] - 1.6, 1.4, .07)

# 02 L'intelligence
chat_b = sentence('L09', 1)
choir(['D4', 'F4', 'A4'], T['chat'], chat_b - T['chat'] + .5, .06, attack=1.2)
for i in range(5): bell(['A5', 'E6', 'C#6', 'F#6', 'D6'][i], chat_b + 1.4 + i * .15, .05, 4, pan=(-.6, .6, 0, -.3, .3)[i], ratio=1.5, index=1.2)
bar_section(chat_b + 1.2, T['ai'], AI, drums=False, arp_notes=ARP_B, arp_gain=.025, cutoff=(1800, 3000), bass=True)
for i in range(3): bell(['A5', 'E6', 'C#6'][i], S_('L10') + .1 + i * .4, .06, 4, pan=(-.6, .6, 0)[i], ratio=1.5, index=1.2)
bar_section(T['ai'], T['agents'], AI, hats=True, arp_notes=ARP_B, arp_gain=.032, cutoff=(2500, 4800), str_gain=.1)
bar_section(T['agents'], T['pc'], [(['D3', 'A3', 'D4', 'F4'], 'D2'), (['G2', 'D3', 'Bb3', 'D4'], 'G1'), (['A2', 'E3', 'A3', 'C#4'], 'A1')], hats=True, arp_notes=['D5', 'E5', 'F5', 'A5', 'D6', 'A5', 'F5', 'E5'], cutoff=(2000, 4200))
for i in range(6): bell(['D5', 'E5', 'F5', 'G5', 'A5', 'C6'][i], sentence('L12', 1) + 1.0 + i * .15, .03, 3, pan=-.5 + i * .2, ratio=2.0, index=.7)
bar_section(T['pc'], T['media'], AI[::-1], drums=True, half=True, arp_notes=None, str_gain=.08, kick_gain=.3)
for i, tm in enumerate([S_('L13') + 2.3, S_('L13') + 2.9]): bell('E5' if i else 'A4', tm, .06, 3, ratio=1.41, index=2.2)
choir(['F#4', 'A4', 'D5'], T['media'], T['people'] - T['media'], .07, attack=1.5)
strings(['D3', 'A3', 'F#4'], T['media'], T['people'] - T['media'], .1, attack=1.4, release=1)
for k_ in range(int((T['people'] - T['media']) / (BEAT / 2))): pluck(['F#5', 'A5', 'D6', 'A5'][k_ % 4], T['media'] + k_ * BEAT / 2, .02, 3000, pan=(-.3, .3)[k_ % 2], dur=.4)
reverse_swell(T['people'] - 1.6, 1.5, .07)

# 03 Le réseau
choir(['F3', 'A3', 'C4'], T['people'], 4.0, .06, attack=1.5)
bar_section(T['people'] + 2.0, T['posts'], WARM, drums=False, arp_notes=ARP_C, arp_gain=.03, cutoff=(1800, 3000))
bar_section(T['posts'], T['feed'], WARM, hats=True, arp_notes=ARP_C, arp_gain=.034, cutoff=(2600, 4200), str_gain=.1)
for i, tm in enumerate([S_('L16'), S_('L16') + .55, S_('L16') + 1.05]): bell(['C6', 'E6', 'G6'][i], tm, .045, 2.5, pan=(-.4, 0, .4)[i], ratio=2.0, index=.8)
bar_section(T['feed'], T['collab'], WARM[1:] + WARM[:1], hats=True, arp_notes=ARP_C, cutoff=(3000, 4400), str_gain=.1)
for k_ in range(int((T['collab'] - S_('L17')) / 1.25)): bell('F6', S_('L17') + .2 + k_ * 1.25, .02, 1.5, ratio=2.0, index=.5)
bar_section(T['collab'], T['eco'] - .5, WARM, hats=True, arp_notes=ARP_C, cutoff=(3200, 4800), str_gain=.12)
reverse_swell(T['eco'] - 1.6, 1.4, .07)

# 04 L'écosystème
bar_section(T['eco'], T['privacy'], BUILD_P, hats=True, arp_notes=['D5', 'F5', 'A5', 'D6', 'F6', 'D6', 'A5', 'F5'], arp_gain=.03, cutoff=(2600, 5000), str_gain=.11)
for b_, (ch, _) in enumerate(BUILD_P * 3):
    tb = T['eco'] + b_ * 4 * BEAT
    if tb < T['privacy'] - 1.6: brass(ch[:3], tb, 1.6, .07)
# Privé : retrait, battements, verrouillage
tLock, tSweep = sentence('L20', 1) + .2, sentence('L20', 2)
choir(['F#4', 'A4', 'C#5'], T['privacy'], T['converge'] - T['privacy'], .07, attack=1.5); drone(['D2'], T['privacy'], T['converge'] - T['privacy'] + .4, .08)
k_ = 0
while T['privacy'] + .3 + k_ * 1.2 < T['converge'] - .3: kick(T['privacy'] + .3 + k_ * 1.2, .2); kick(T['privacy'] + .3 + k_ * 1.2 + .24, .12); k_ += 1
for k_ in range(24): bell(['C#7', 'E7', 'A6', 'F#7'][k_ % 4], S_('L20') + .8 + k_ * .1, .012, 1.5, pan=float(rng.uniform(-.8, .8)), ratio=2.76, index=1.0)
boom(tLock, .45, 3); bell('A4', tLock, .1, 5, ratio=1.41, index=3); bell('E5', tSweep, .06, 4, ratio=1.41, index=2.5)

# Convergence : un accent par mot, puis la montée
I = T['impact']
for i, (tm, nt) in enumerate([(S_('L21'), 'D2'), (sentence('L21', 1), 'F2'), (sentence('L21', 2), 'A2')]):
    timpani(nt, tm, .32); strings([['D3', 'A3', 'D4'], ['F3', 'C4', 'F4'], ['A3', 'E4', 'A4']][i], tm, .9 if i < 2 else 1.4, .16, attack=.05, release=.8); bell(['D5', 'F5', 'A5'][i], tm, .05, 3, ratio=2.0, index=.8)
w4 = sentence('L21', 3)
strings(['D4', 'F4', 'A4', 'D5', 'F5'], w4, I - .5 - w4, .38, attack=I - w4 - .6, release=.05, bright=3800)
strings(['D2', 'A2', 'D3'], w4, I - .5 - w4, .3, attack=I - w4 - .6, release=.05, bright=2000)
riser(w4, I - .5 - w4, .55)
n_roll = 28
for k_ in range(n_roll):
    tm = w4 + .2 + (I - .7 - w4) * (1 - (1 - k_ / n_roll) ** 1.6)
    snare(tm, .08 + .22 * k_ / n_roll)
# Révélation
boom(I, 1.0, 6); timpani('D2', I, .45)
strings(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'E4', 'F#4', 'A4'], I, 7.5, .22, attack=.05, release=4.5, bright=4200)
brass(['D3', 'A3', 'D4', 'F#4'], I, 4.5, .14); choir(['D4', 'F#4', 'A4', 'D5'], I + .1, 7.5, .12, attack=.4, release=4); bell('D6', I + .05, .08, 7, ratio=2.0, index=1)
strings(['G2', 'D3', 'B3', 'D4'], S_('L23') - 1.0, 3.0, .16, attack=1.5, release=1.5)
strings(['D3', 'A3', 'F#4', 'A4'], S_('L24') - 1.0, DUR - S_('L24') + .5, .18, attack=1.2, release=2)
for tm, nt in [(S_('L22') + .9, 'F#5'), (S_('L22') + 2.1, 'A5'), (S_('L23'), 'E5'), (S_('L23') + 1.4, 'D5'), (S_('L24'), 'A5'), (S_('L24') + 1.2, 'F#5'), (DUR - 1.8, 'D6')]: bell(nt, tm, .045, 5, pan=float(rng.uniform(-.4, .4)), ratio=2.0, index=.9)

# ------------------------------------------------------------------ réverbération et mixage
def impulse(seconds=3.6, seed=0):
    g = np.random.default_rng(seed); t = np.arange(int(seconds * SR)) / SR
    ir = g.normal(0, 1, len(t)) * np.exp(-t * 6.9 / seconds); ir = lp(ir, 7000) ; ir[:int(.012 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2))
wetL = fftconvolve(RL, impulse(3.6, 1))[:N]; wetR = fftconvolve(RR, impulse(3.6, 2))[:N]
mix = np.vstack([L + wetL * .9, R + wetR * .9])
mix = hp(mix, 28)
# fenêtres de silence voulues (le noir avant le point, la respiration avant l'impact)
gate = np.ones(N)
for a, b in [(T['black'] - .15, T['point'] - .05), (I - .5, I - .02)]:
    i, j = int(a * SR), int(b * SR); gate[i:j] = 0; gate[i - 2400:i] *= np.linspace(1, 0, 2400); gate[j:j + 240] *= np.linspace(0, 1, 240)
mix *= gate

# voix : enveloppe et effacement musical (ducking) sous la narration
voice, vsr = sf.read(BUILD / 'narration.wav', dtype='float64')
from scipy.signal import resample_poly
voice = resample_poly(voice, SR, vsr)[:N]; voice = np.pad(voice, (0, N - len(voice)))
venv = np.sqrt(np.convolve(voice ** 2, np.ones(2400) / 2400, mode='same'))
active = (venv > .01).astype(float)
duck = np.convolve(active, np.ones(int(.25 * SR)) / int(.25 * SR), mode='same')
duck = 1 - .5 * np.clip(duck * 1.4, 0, 1)
seg = mix[:, int(I * SR):int((I + 5.5) * SR)].mean(0)
music_peak = np.sqrt(np.mean(seg ** 2))
mix = mix * (10 ** (-13 / 20) / music_peak)   # l'impact final sert de référence : c'est le sommet du film
mix = np.tanh(mix * 1.2) / 1.2                 # limiteur doux de la musique seule
sf.write(BUILD / 'music.wav', mix.T.astype(np.float32), SR, subtype='FLOAT')
voice_st = np.vstack([voice, voice]) * 1.0
full = mix * duck + hp(voice_st, 80) * 1.0
# limiteur doux
full = np.tanh(full * 1.1) / np.tanh(1.1)
full *= .95 / np.max(np.abs(full))
sf.write(BUILD / 'mix.wav', full.T.astype(np.float32), SR, subtype='FLOAT')
# enveloppe vocale par image (30 i/s) pour l'anneau de la voix
fr = 30; env = [float(np.mean(venv[int(i / fr * SR):int((i + 1) / fr * SR)])) for i in range(int(DUR * fr))]
m = max(env) or 1; (BUILD / 'envelope.json').write_text(json.dumps([round(min(1, e / m * 1.6), 3) for e in env]))
print('ok', 'pic musique', round(music_peak, 3), 'durée', DUR)
