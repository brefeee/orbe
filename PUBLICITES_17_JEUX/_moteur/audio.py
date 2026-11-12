"""Bande-son d'une pub : musique originale + bruitages calés sur les repères. Tout est synthétisé ici
(aucun son sous licence). Usage : python3 _moteur/audio.py <build/cues.json> <sortie.wav>

Le bloc `music` de la pub choisit un style (PRESETS) et peut redéfinir n'importe quel champ :
  style     : nom d'un préréglage ci-dessous
  bpm, root (note MIDI de la tonique, 45 à 62), scale, prog (degrés de la gamme, un par mesure), swing (0 à 0.3)
  kick / snare / hat / perc : motifs de 16 pas ('x' fort, 'o' doux ou ouvert, '.' silence) ; liste = un motif par mesure
  bass      : motif de 16 pas ('1' fondamentale, '3' tierce, '5' quinte, '8' octave, '.' silence)
  chords    : 'pad' (accord tenu) ou motif de 16 pas ; arp : motif de 16 pas ; lead : liste de motifs de 16 pas
  kickType, snareType, percType, bassType, chordType, arpType, leadType : timbres (voir plus bas)
  sections  : [[t, 'intro'|'build'|'drop'|'break'|'drop2'|'outro'], ...]  (place les changements sur des débuts de mesure :
              une mesure dure 240 / bpm secondes)
  stops     : [[a, b], ...] silences de la musique (les bruitages restent) ; end : instant de l'accord final
  seed      : graine de la mélodie ; musicGain, sfxGain
"""
import json, sys, wave
import numpy as np

SR = 44100
cfg = json.load(open(sys.argv[1]))
DUR = float(cfg['duration'])
N = int(DUR * SR)

PRESETS = {
    # style: réglages par défaut
    'adventure': dict(bpm=112, root=50, scale='major', prog=[0, 4, 5, 3], kick='x.....x.x.......', snare='....x.......x..x', hat='x.x.x.x.x.x.x.x.', perc='..x...x...x...xx', kickType='soft', snareType='march', percType='tom', bass='1.......5.......', bassType='sub', chords='pad', chordType='strings', arp='x..x..x.x..x..x.', arpType='pluck', lead=['x...x.x.....x.x.', 'x.....x.x.......'], leadType='brass'),
    'chiptune': dict(bpm=140, root=48, scale='major', prog=[0, 5, 3, 4], kick='x...x...x...x...', snare='....x.......x...', hat='x.x.x.x.x.x.x.xx', perc='', kickType='punch', snareType='snare', bass='1.8.1.8.1.8.1.8.', bassType='square', chords='', chordType='chip', arp='xxxxxxxxxxxxxxxx', arpType='chip', lead=['x.x.x..x..x.x...', 'x..x..x.x.x.....'], leadType='chip'),
    'trap': dict(bpm=120, root=48, scale='minor', prog=[0, 5, 2, 6], kick='x.....x...x.....', snare='........x.......', hat=['x.x.x.x.x.x.xxxx', 'x.x.xxx.x.x.x.x.'], perc='...x......x..x..', kickType='808', snareType='clap', percType='cowbell', bass='1.....1...1.....', bassType='808', chords='pad', chordType='pad', arp='', lead=['x..x..x...x.x...', 'x.....x.x.......'], leadType='bell'),
    'synthwave': dict(bpm=118, root=45, scale='minor', prog=[0, 5, 2, 6], kick='x...x...x...x...', snare='....x.......x...', hat='..x...x...x...x.', perc='', kickType='punch', snareType='gated', bass='1.1.1.1.1.1.1.1.', bassType='saw', chords='pad', chordType='pad', arp='x.x.x.x.x.x.x.x.', arpType='pluck', lead=['x.....x...x.....', 'x...x...x.x.....'], leadType='saw'),
    'workout': dict(bpm=128, root=47, scale='minor', prog=[0, 0, 5, 6], kick='x...x...x...x...', snare='....x.......x...', hat='..o...o...o...o.', perc='x.xxx.xxx.xxx.xx', kickType='punch', snareType='clap', percType='shaker', bass='..1...1...1...1.', bassType='saw', chords='x..x..x...x..x..', chordType='stab', arp='', lead=['x.x...x.x...x...', 'x..x..x.........'], leadType='saw'),
    'tropical': dict(bpm=104, root=53, scale='major', prog=[0, 4, 5, 3], kick='x.....x...x.....', snare='....x.......x...', hat='x.xxx.xxx.xxx.xx', perc='..x..x....x..x..', kickType='soft', snareType='rim', percType='tick', bass='1..1..5.1..1..5.', bassType='pluck', chords='..x...x...x...x.', chordType='marimba', arp='x.xx.x.xx.xx.x.x', arpType='marimba', lead=['x..x..x.x...x...', 'x.x..x..x.......'], leadType='whistle'),
    'toybox': dict(bpm=126, root=55, scale='major', prog=[0, 3, 4, 0], kick='x.......x.......', snare='....x.......x.x.', hat='x.x.x.x.x.x.x.x.', perc='..x...x...x..xx.', kickType='soft', snareType='march', percType='tick', bass='1...5...1...5...', bassType='pluck', chords='..x...x...x...x.', chordType='pluck', arp='x.x.x.x.x.x.x.x.', arpType='bell', lead=['x.x.x...x.x.x...', 'x..x..x.x.......'], leadType='marimba'),
    'dnb': dict(bpm=172, root=45, scale='minor', prog=[0, 0, 5, 6], kick='x.........x.....', snare='....x.......x...', hat='x.x.x.x.x.x.x.x.', perc='......x.......x.', kickType='punch', snareType='snare', percType='tick', bass='1.......1..1....', bassType='saw', chords='pad', chordType='pad', arp='', lead=['x.....x.....x...', 'x...x...........'], leadType='square'),
    'sneaky': dict(bpm=108, root=50, scale='harmonic', prog=[0, 3, 4, 0], swing=.22, kick='x.........x.....', snare='....x.......x...', hat='x..xx..xx..xx..x', perc='', kickType='soft', snareType='snap', bass='1..5..8.1..5.3..', bassType='upright', chords='....x.......x...', chordType='piano', arp='', lead=['x..x..x.....x.x.', 'x.....x..x......'], leadType='marimba'),
    'cozy': dict(bpm=92, root=53, scale='major', prog=[0, 5, 3, 4], swing=.14, kick='x.....x...x.....', snare='....x.......x...', hat='x.x.x.x.x.x.x.x.', perc='', kickType='soft', snareType='rim', bass='1.....5...1.....', bassType='sub', chords='x.....x...x.....', chordType='piano', arp='', lead=['x...x..x..x.....', 'x..x....x.......'], leadType='whistle', seventh=True),
    'dreamy': dict(bpm=100, root=52, scale='lydian', prog=[0, 1, 5, 4], kick='x.......x.x.....', snare='....x.......x...', hat='x.x.x.x.x.x.x.x.', perc='', kickType='soft', snareType='rim', bass='1.......1.......', bassType='sub', chords='pad', chordType='pad', arp='x.x.x.x.x.x.x.x.', arpType='bell', lead=['x...x...x.x.....', 'x.....x.........'], leadType='whistle', seventh=True),
    'frantic': dict(bpm=152, root=50, scale='major', prog=[0, 0, 3, 4], kick='x...x...x...x...', snare='..x...x...x...x.', hat='', perc='x.x.x.x.x.x.x.x.', kickType='soft', snareType='rim', percType='shaker', bass='1...5...1...5...', bassType='upright', chords='..x...x...x...x.', chordType='piano', arp='', lead=['x.xxx.x.x.xxx.x.', 'x.x.x.xxx...x...'], leadType='brass'),
    'racing': dict(bpm=160, root=47, scale='minor', prog=[0, 5, 6, 4], kick='x...x...x...x...', snare='....x.......x...', hat='..x...x...x...x.', perc='', kickType='punch', snareType='snare', bass='1.1.1.1.1.1.1.1.', bassType='saw', chords='x..x..x..x..x.x.', chordType='stab', arp='x.x.x.x.x.x.x.x.', arpType='pluck', lead=['x.x.x...x.x...x.', 'x...x.x.x.......'], leadType='saw'),
    'disco': dict(bpm=120, root=52, scale='dorian', prog=[0, 3, 0, 4], kick='x...x...x...x...', snare='....x.......x...', hat='..o...o...o...o.', perc='x.xxx.xxx.xxx.xx', kickType='punch', snareType='clap', percType='shaker', bass='1.8.1.8.1.8.3.5.', bassType='pluck', chords='..x..x....x..x..', chordType='stab', arp='', lead=['x..x..x.x.......', 'x.x...x...x.x...'], leadType='brass', seventh=True),
    'edm': dict(bpm=128, root=48, scale='minor', prog=[5, 6, 0, 0], kick='x...x...x...x...', snare='....x.......x...', hat='..o...o...o...o.', perc='', kickType='punch', snareType='clap', bass='..1...1...1...1.', bassType='saw', chords='x..x..x...x..x..', chordType='stab', arp='x.x.x.x.x.x.x.x.', arpType='pluck', lead=['x..x..x..x..x.x.', 'x..x..x.........'], leadType='saw'),
    'arena': dict(bpm=100, root=45, scale='pentminor', prog=[0, 0, 3, 4], kick='x.x.....x.x.....', snare='....x.......x...', hat='', perc='x.......x.......', kickType='punch', snareType='clap', percType='tom', bass='1.1.....1.1...3.', bassType='saw', chords='x.x.....x.x.....', chordType='brass', arp='', lead=['x.x...x.x.......', 'x...x...x.x.....'], leadType='saw'),
    'spooky': dict(bpm=96, root=48, scale='harmonic', prog=[0, 5, 3, 4], kick='x.........x.....', snare='....x.......x...', hat='x..x..x..x..x.x.', perc='', kickType='soft', snareType='rim', bass='1.....5.....1...', bassType='upright', chords='pad', chordType='organ', arp='x..x..x..x..x.x.', arpType='bell', lead=['x.....x...x.....', 'x...x.....x.....'], leadType='theremin'),
}
SCALES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10], 'lydian': [0, 2, 4, 6, 7, 9, 11],
          'phrygian': [0, 1, 3, 5, 7, 8, 10], 'harmonic': [0, 2, 3, 5, 7, 8, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10], 'pentminor': [0, 3, 5, 7, 10], 'pentmajor': [0, 2, 4, 7, 9]}
LAYERS = {  # couches actives par type de section
    'intro': {'chords', 'arp'}, 'build': {'chords', 'arp', 'hat', 'kick', 'bass'}, 'drop': {'chords', 'arp', 'hat', 'kick', 'snare', 'perc', 'bass', 'lead'},
    'break': {'chords', 'lead', 'perc'}, 'drop2': {'chords', 'arp', 'hat', 'kick', 'snare', 'perc', 'bass', 'lead', 'lead2'}, 'outro': set(), 'silence': set()}

M = dict(PRESETS.get(cfg['music'].get('style', 'edm'), PRESETS['edm'])); M.update(cfg['music'])
BPM = float(M['bpm']); BEAT = 60 / BPM; STEP = BEAT / 4; BAR = 4 * BEAT
rng = np.random.default_rng(int(M.get('seed', 7)))
SC = SCALES[M.get('scale', 'minor')]; ROOT = int(M.get('root', 48))
SECTIONS = sorted(M.get('sections') or [[0, 'intro'], [min(8 * BAR, DUR * .25), 'drop']])
END = float(M.get('end', DUR - 1.2)); STOPS = M.get('stops', [])


def t_(d): return np.arange(max(1, int(d * SR))) / SR
def noise(d): return rng.standard_normal(max(1, int(d * SR)))
def filt(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g, len(x))
def place(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n] * g
def hz(n): return 440 * 2 ** ((n - 69) / 12)
def adsr(d, a=.005, r=.05, k=0.0):
    t = t_(d); e = np.minimum(1, t / max(a, 1e-4)) * np.minimum(1, np.maximum(0, (d - t)) / max(r, 1e-4))
    return e * np.exp(-t * k)
def saw(f, t, ph=0): return 2 * ((t * f + ph) % 1) - 1
def sq(f, t, pw=.5): return np.where((t * f) % 1 < pw, 1.0, -1.0)
def sine(f, t): return np.sin(2 * np.pi * f * t)
def vib(f, t, rate=5.5, depth=.006, delay=.12): return 2 * np.pi * np.cumsum(f * (1 + depth * np.sin(2 * np.pi * rate * t) * np.minimum(1, t / max(delay, 1e-3)))) / SR
def degree(d, octave=0):
    n = len(SC); return ROOT + SC[d % n] + 12 * (d // n) + 12 * octave
def chord(d): return [degree(d), degree(d + 2), degree(d + 4)] + ([degree(d + 6)] if M.get('seventh') else [])

# ------------------------------------------------------------------ timbres
_cache = {}
def inst(kind, f, d):
    key = (kind, round(f, 2), round(d, 3))
    if key in _cache: return _cache[key]
    t = t_(d + .25 if kind in ('pad', 'strings', 'organ', 'piano', 'bell', 'marimba') else d)
    D = len(t) / SR
    if kind == 'pad': x = filt(sum(saw(f * 2 ** (c / 1200), t, i * .31) for i, c in enumerate((-9, 0, 9))), 80, 1500) * adsr(D, .09, .22) * .22
    elif kind == 'strings': x = filt(sum(np.sign(1) * saw(f * 2 ** (c / 1200), t, i * .37) for i, c in enumerate((-7, 0, 7, 1200))), 120, 2600) * adsr(D, .12, .22) * .17
    elif kind == 'organ': x = (sine(f, t) + .5 * sine(2 * f, t) + .3 * sine(3 * f, t) + .15 * sine(4 * f, t)) * adsr(D, .03, .2) * (1 + .12 * sine(5.2, t)) * .16
    elif kind == 'stab': x = filt(saw(f, t) + saw(f * 1.006, t, .4) + .5 * sq(f * 2, t), 150, 3800) * adsr(D, .004, .04, 9) * .26
    elif kind == 'piano': x = sum(sine(f * h, t) * np.exp(-t * (2.2 + h * 1.3)) / h for h in range(1, 7)) * adsr(D, .003, .08) * .34
    elif kind == 'marimba': x = (sine(f, t) * np.exp(-t * 9) + .4 * sine(4 * f, t) * np.exp(-t * 22) + .15 * sine(10 * f, t) * np.exp(-t * 50)) * adsr(D, .002, .03) * .5
    elif kind == 'bell': x = np.sin(2 * np.pi * f * t + 2.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 4)) * np.exp(-t * 3.2) * adsr(D, .002, .05) * .3
    elif kind == 'pluck': x = filt(saw(f, t) + .6 * sq(f, t, .4), 100, 2600) * adsr(D, .003, .03, 8) * .3
    elif kind == 'chip': x = sq(f, t, .25) * adsr(D, .002, .01) * .14
    elif kind == 'brass': x = filt(saw(f, t) + saw(f * 1.004, t, .5), 150, 2100) * adsr(D, .035, .06) * (1 + .05 * sine(5, t)) * .26
    elif kind == 'whistle': x = (np.sin(vib(f * 2, t, 5.5, .007)) + .012 * noise(D)[:len(t)]) * adsr(D, .05, .08) * .22
    elif kind == 'theremin': p = vib(f * 2, t, 6, .013, .05); x = (np.sin(p) + .18 * np.sin(2 * p)) * adsr(D, .09, .12) * .2
    elif kind == 'square': x = filt(np.sign(np.sin(vib(f, t))), 100, 4200) * adsr(D, .005, .03) * .16
    elif kind == 'saw': p = vib(f, t) / (2 * np.pi); x = filt(2 * (p % 1) - 1 + 2 * ((p * 1.007) % 1) - 1, 150, 5200) * adsr(D, .006, .04) * .15
    # basses
    elif kind == 'b_sub': x = np.tanh(sine(f, t) * 1.6) * adsr(D, .008, .05) * .5
    elif kind == 'b_808': ff = f * (1 + .5 * np.exp(-t * 40)); x = np.tanh(np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 1.6) * 2.6) * adsr(D, .003, .03) * .5
    elif kind == 'b_saw': x = (filt(saw(f, t) + saw(f * 1.005, t, .3), 30, 620) * .7 + sine(f, t) * .5) * adsr(D, .004, .03, 2) * .42
    elif kind == 'b_square': x = filt(sq(f, t), 30, 900) * adsr(D, .003, .02) * .34
    elif kind == 'b_pluck': x = (filt(saw(f, t), 30, 1100) * np.exp(-t * 7) + sine(f, t) * np.exp(-t * 4)) * adsr(D, .003, .03) * .55
    elif kind == 'b_upright': x = (sine(f, t) + .35 * sine(2 * f, t) * np.exp(-t * 9) + .1 * sine(3 * f, t) * np.exp(-t * 14)) * np.exp(-t * 3.2) * adsr(D, .004, .04) * .6
    else: raise KeyError(kind)
    _cache[key] = x; return x

def drum(kind):
    if kind in _cache: return _cache[kind]
    if kind == 'k_punch': t = t_(.34); f = 48 + 150 * np.exp(-t * 34); x = np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10) * 2.4) * .95
    elif kind == 'k_808': t = t_(.5); f = 45 + 120 * np.exp(-t * 28); x = np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 2.2) * .9
    elif kind == 'k_soft': t = t_(.28); f = 55 + 80 * np.exp(-t * 30); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 13) * .85
    elif kind == 's_snare': t = t_(.24); x = (filt(noise(.24), 1200, 9000) * np.exp(-t * 20) * .7 + sine(190, t) * np.exp(-t * 26) * .6) * .6
    elif kind == 's_gated': t = t_(.32); x = (filt(noise(.32), 500, 7000) * np.minimum(1, (0.3 - t).clip(0) * 40) * .6 + sine(170, t) * np.exp(-t * 20) * .6) * .55
    elif kind == 's_march': t = t_(.16); x = (filt(noise(.16), 1800, 9500) * np.exp(-t * 34) * .8 + sine(220, t) * np.exp(-t * 40) * .4) * .5
    elif kind == 's_clap':
        x = np.zeros(int(.36 * SR))
        for o in (0, .011, .023): place(x, filt(noise(.3), 900, 5200) * np.exp(-t_(.3) * 22), o)
        x *= .45
    elif kind == 's_rim': t = t_(.07); x = (sine(1750, t) + .5 * sine(820, t)) * np.exp(-t * 70) * .42
    elif kind == 's_snap':
        x = np.zeros(int(.2 * SR))
        for o in (0, .012): place(x, filt(noise(.12), 1800, 4800) * np.exp(-t_(.12) * 45), o)
        x *= .7
    elif kind == 'h_closed': t = t_(.06); x = filt(noise(.06), 7000) * np.exp(-t * 70) * .3
    elif kind == 'h_open': t = t_(.3); x = filt(noise(.3), 6500) * np.exp(-t * 10) * .26
    elif kind == 'p_shaker': t = t_(.1); x = filt(noise(.1), 5000) * np.sin(np.pi * np.minimum(1, t / .1)) ** 2 * .2
    elif kind == 'p_cowbell': t = t_(.22); x = filt(sq(587, t) + sq(869, t), 500, 4500) * np.exp(-t * 14) * .16
    elif kind == 'p_tom': t = t_(.4); f = 95 + 60 * np.exp(-t * 18); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) * .6
    elif kind == 'p_tick': t = t_(.08); x = sine(980, t) * np.exp(-t * 55) * .32
    elif kind == 'p_tamb': t = t_(.16); x = filt(noise(.16), 8000) * np.exp(-t * 24) * .25
    else: raise KeyError(kind)
    _cache[kind] = x; return x

# ------------------------------------------------------------------ séquenceur
def section_at(t):
    cur = 'silence'
    for s, name in SECTIONS:
        if t + 1e-6 >= s: cur = name
    return cur
def stopped(t): return any(a <= t < b for a, b in STOPS)
def pat(p, bar):
    if not p: return '.' * 16
    if isinstance(p, list): p = p[bar % len(p)]
    return (p + '.' * 16)[:16]

drums = np.zeros(N); kickb = np.zeros(N); bass = np.zeros(N); harm = np.zeros(N); lead = np.zeros(N)
nbars = int(np.ceil(END / BAR)) + 1
prog = M['prog']; swing = float(M.get('swing', 0))
# mélodie : motif de 4 mesures (A B A' cadence), répété
def make_melody():
    notes = {}  # (bar%4*16+step) -> degré relatif à l'échelle
    cur = 4
    for b in range(4):
        rhythm = pat(M.get('lead'), b)
        if b == 2:
            for s in range(16):
                if (0 * 16 + s) in notes and rhythm[s] != '.': notes[(b * 16 + s)] = notes[s] + (1 if rng.random() < .25 else 0)
            continue
        for s in range(16):
            if rhythm[s] == '.': continue
            cur = int(np.clip(cur + rng.choice([-2, -1, -1, 1, 1, 2, 0]), 0, 9))
            if s % 8 == 0: cur = min((0, 2, 4, 7, 9), key=lambda c: abs(c - cur))
            notes[b * 16 + s] = cur
    last = max([k for k in notes if k >= 48], default=None)
    if last is not None: notes[last] = 7 if notes[last] > 5 else 0
    return notes
MEL = make_melody()

for b in range(nbars):
    d = prog[b % len(prog)]; ch = chord(d)
    for s in range(16):
        t = b * BAR + s * STEP + (swing * STEP if s % 2 else 0)
        if t >= END - 1e-6 or stopped(t): continue
        L = LAYERS[section_at(t)]
        hum = .85 + .3 * rng.random()
        c = pat(M.get('kick'), b)[s]
        if c != '.' and 'kick' in L:
            x = drum('k_' + M.get('kickType', 'punch')); place(drums, x, t, 1 if c == 'x' else .6); place(kickb, np.ones(int(.2 * SR)), t)
        c = pat(M.get('snare'), b)[s]
        if c != '.' and 'snare' in L: place(drums, drum('s_' + M.get('snareType', 'snare')), t, 1 if c == 'x' else .5)
        c = pat(M.get('hat'), b)[s]
        if c != '.' and 'hat' in L: place(drums, drum('h_open' if c == 'o' else 'h_closed'), t, hum * (1 if s % 4 == 0 else .7))
        c = pat(M.get('perc'), b)[s]
        if c != '.' and 'perc' in L: place(drums, drum('p_' + M.get('percType', 'shaker')), t, hum * (1 if c == 'x' else .5))
        bp = pat(M.get('bass'), b); c = bp[s]
        if c != '.' and 'bass' in L:
            n = 1
            while s + n < 16 and bp[s + n] == '.' and n < 8: n += 1
            off = {'1': 0, '3': degree(d + 2) - degree(d), '5': 7, '8': 12}.get(c, 0)
            bn = degree(d, -1) + off
            while bn > 47: bn -= 12
            while bn < 31: bn += 12
            place(bass, inst('b_' + M.get('bassType', 'sub'), hz(bn), n * STEP * .95), t)
        cp = M.get('chords')
        if cp and 'chords' in L:
            if cp == 'pad':
                if s == 0:
                    for n_ in ch: place(harm, inst(M.get('chordType', 'pad'), hz(n_), BAR), t, .8)
            elif pat(cp, b)[s] != '.':
                for n_ in ch: place(harm, inst(M.get('chordType', 'stab'), hz(n_), STEP * 2.5), t, .75)
        if 'arp' in L and pat(M.get('arp'), b)[s] != '.':
            tones = ch + [ch[0] + 12]; n_ = tones[s % len(tones)] + 12 * int(M.get('arpOct', 1))
            place(harm, inst(M.get('arpType', 'pluck'), hz(n_), STEP * 1.8), t, .5 * hum)
        if 'lead' in L and (b % 4) * 16 + s in MEL:
            lp = pat(M.get('lead'), b % 4 if b % 4 != 2 else 0); n = 1
            while s + n < 16 and lp[s + n] == '.' and n < 6: n += 1
            deg = MEL[(b % 4) * 16 + s]; n_ = degree(deg, 1 + int(M.get('leadOct', 0)) + (1 if 'lead2' in L and M.get('leadType') not in ('whistle', 'theremin') else 0))
            place(lead, inst(M.get('leadType', 'square'), hz(n_), n * STEP * .92), t, .9)

# montées automatiques avant chaque « drop » + impact
fx = np.zeros(N)
def crash(g=1.0): t = t_(1.6); return filt(noise(1.6), 3500) * np.exp(-t * 3.2) * .32 * g
def boom(): t = t_(1.1); f = 38 + 60 * np.exp(-t * 14); return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5) * 2) * .8
if M.get('autoFx', True):
    for s, name in SECTIONS:
        if name in ('drop', 'drop2') and s > BAR * .9:
            d = min(BAR, s); t = t_(d); r = filt(noise(d), 800, 9000) * (t / d) ** 2.2 * .22
            place(fx, r, s - d)
            k = 0
            while k < 16:
                tt = s - BAR + k * STEP
                if tt >= 0 and not stopped(tt): place(drums, drum('s_' + M.get('snareType', 'snare')), tt, .25 + .5 * k / 16)
                k += 2 if k < 8 else 1
            place(fx, crash(), s); place(fx, boom(), s, .6)
# accord final
if END < DUR:
    for n_ in chord(prog[0]) + [degree(prog[0], -1)]: place(harm, inst('piano' if M.get('chordType') in ('piano', 'marimba', 'pluck') else M.get('chordType', 'pad'), hz(n_), min(2.0, DUR - END)), END, 1.0)
    place(drums, drum('k_' + M.get('kickType', 'punch')), END); place(fx, crash(.9), END)

def reverb(x, d=1.4, seed=1, lo=250, hi=6500):
    r = np.random.default_rng(seed); ir = r.standard_normal(int(d * SR)) * np.exp(-t_(d) * 4.2); ir = filt(ir, lo, hi); ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + len(ir); return np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
# compression « pompe » sur la grosse caisse
duck = np.clip(kickb, 0, 1); env = np.convolve(duck, np.exp(-np.arange(int(.12 * SR)) / (.03 * SR)), 'same'); env = np.clip(env / (env.max() + 1e-9) * 1.4, 0, 1)
side = 1 - .55 * env * (1 if M.get('sidechain', True) else 0)
mel = (harm * .9 + lead * .95) * side
musicL = drums * .95 + bass * side * .9 + mel * .78 + reverb(mel, 1.5, 1) * .2 + fx * .8
musicR = drums * .95 + bass * side * .9 + mel * .78 + reverb(mel, 1.5, 2) * .2 + fx * .8
# silences demandés (fondu rapide)
gate = np.ones(N)
for a, b in STOPS:
    i, j = int(a * SR), min(N, int(b * SR)); gate[i:j] = 0
k = int(.02 * SR); gate = np.convolve(gate, np.ones(k) / k, 'same')
mg = float(M.get('musicGain', .8)); musicL *= gate * mg; musicR *= gate * mg

# ------------------------------------------------------------------ bruitages
def sweep(f0, f1, d, k=0): t = t_(d); f = f0 * (f1 / f0) ** (t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(d, .005, d * .3, k)
def sfx(name, dur):
    if name == 'whoosh': d = .5; t = t_(d); return filt(noise(d), 500, 5000) * np.sin(np.pi * t / d) ** 2 * .5
    if name == 'swish': d = .22; t = t_(d); return filt(noise(d), 2000, 9000) * np.sin(np.pi * t / d) ** 2 * .4
    if name == 'impact': t = t_(.7); f = 50 + 110 * np.exp(-t * 22); return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 2.5) * .8 + np.pad(filt(noise(.25), 600, 6000) * np.exp(-t_(.25) * 22) * .45, (0, len(t) - int(.25 * SR)))
    if name == 'boom': return boom() + np.pad(crash(.5), (0, 0))[:len(boom())] if len(crash()) >= len(boom()) else boom()
    if name == 'pop': return sweep(380, 950, .09, 18) * .6
    if name == 'coin': x = np.zeros(int(.5 * SR)); place(x, sq(988, t_(.08)) * adsr(.08, .002, .02) * .22, 0); place(x, sq(1319, t_(.4)) * adsr(.4, .002, .1, 7) * .22, .075); return x
    if name == 'ding': return inst('bell', 1568, .9) * 1.6
    if name == 'bell': return inst('bell', 660, 1.6) * 1.8
    if name == 'chime':
        x = np.zeros(int(1.4 * SR))
        for i, n_ in enumerate((84, 88, 91, 96)): place(x, inst('bell', hz(n_), .9) * 1.2, i * .08)
        return x
    if name == 'click': t = t_(.03); return sine(2400, t) * np.exp(-t * 160) * .5
    if name == 'tick': t = t_(.05); return sine(1300, t) * np.exp(-t * 90) * .5
    if name == 'tap': t = t_(.08); return (sine(420, t) * np.exp(-t * 60) + filt(noise(.08), 1500, 6000) * np.exp(-t * 90) * .4) * .6
    if name == 'laser': return sweep(2200, 280, .26, 6) * .45
    if name == 'zap': d = .3; t = t_(d); return np.sign(sine(90, t)) * filt(noise(d), 1500, 9000) * np.exp(-t * 9) * .45
    if name == 'boing': d = .5; t = t_(d); f = 180 + 240 * np.abs(np.sin(2 * np.pi * 7 * t)) * np.exp(-t * 4) + 200 * t; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .5
    if name == 'splash': d = .9; t = t_(d); return filt(noise(d), 700, 8000) * (np.exp(-t * 5) * np.minimum(1, t / .02)) * .5 + np.pad(sweep(500, 120, .25, 8) * .3, (0, len(t) - int(.25 * SR)))
    if name == 'bubble': return sweep(300, 1200, .12, 10) * .45
    if name == 'thud': t = t_(.3); return np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18) * .9 + filt(noise(.3), 200, 1500) * np.exp(-t * 30) * .4
    if name == 'glass':
        x = filt(noise(.5), 3500) * np.exp(-t_(.5) * 9) * .35
        for i in range(7): place(x, sine(2200 + 600 * i * rng.random(), t_(.2)) * np.exp(-t_(.2) * 20) * .12, rng.random() * .15)
        return x
    if name == 'powerup':
        x = np.zeros(int(.8 * SR))
        for i, n_ in enumerate((72, 76, 79, 84, 88)): place(x, sq(hz(n_), t_(.14)) * adsr(.14, .002, .03) * .18, i * .07)
        return x
    if name == 'fail':
        x = np.zeros(int(1.0 * SR))
        for i, n_ in enumerate((63, 60, 56, 51)): place(x, inst('brass', hz(n_), .26) * .9, i * .2)
        return x
    if name == 'win':
        x = np.zeros(int(1.6 * SR))
        for i, n_ in enumerate((72, 76, 79, 84)): place(x, inst('brass', hz(n_), .16) + inst('bell', hz(n_ + 12), .5), i * .11)
        for n_ in (72, 76, 79, 84): place(x, inst('brass', hz(n_), .8) * .7, .46)
        return x
    if name == 'heartbeat': x = np.zeros(int(.6 * SR)); place(x, drum('k_soft') * 1.0, 0); place(x, drum('k_soft') * .7, .22); return filt(x, None, 180) * 1.6
    if name == 'crowd': d = max(dur, 1.6); t = t_(d); return filt(noise(d), 500, 3500) * (1 + .5 * np.sin(2 * np.pi * (3 + rng.random(len(t)).cumsum() / SR) * t)) * np.minimum(1, t / .25) * np.minimum(1, (d - t) / .6) * .22
    if name == 'whistle': d = .45; t = t_(d); return np.sin(vib(2500 + 0 * t, t, 22, .03, .01)) * adsr(d, .01, .05) * .3
    if name == 'ghost': d = max(dur, 1.4); t = t_(d); f = 420 + 90 * np.sin(2 * np.pi * .9 * t) + 30 * np.sin(2 * np.pi * 5 * t); return (np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * t / d) ** 1.5 * .22
    if name == 'crunch': d = .16; t = t_(d); return filt(noise(d), 900, 5000) * (np.sign(sine(55, t)) * .5 + .5) * np.exp(-t * 14) * .6
    if name == 'engine': d = max(dur, 1.0); t = t_(d); f = 70 + 110 * (t / d) ** 1.4; p = np.cumsum(f) / SR; return filt(2 * (p % 1) - 1 + .5 * np.sign(np.sin(2 * np.pi * p * .5)), 40, 900) * np.minimum(1, t / .08) * np.minimum(1, (d - t) / .15) * .4
    if name == 'horn': d = .5; t = t_(d); return filt(sq(370, t) + sq(466, t), 200, 2400) * adsr(d, .01, .06) * .22
    if name == 'riser': d = max(dur, 1.0); t = t_(d); return filt(noise(d), 700, 9000) * (t / d) ** 2 * .35 + sweep(200, 1400, d) * (t / d) ** 2 * .12
    if name == 'sweepdown': return sweep(1600, 90, .7) * .3 + filt(noise(.7), 400, 5000) * np.exp(-t_(.7) * 4) * .2
    if name == 'scratch': d = .28; t = t_(d); return filt(noise(d), 800, 5000) * np.abs(np.sin(2 * np.pi * 9 * t)) * adsr(d, .005, .05) * .5
    if name == 'slide': return sweep(300, 1100, .3, 2) * .28
    if name == 'roll':
        d = max(dur, .8); x = np.zeros(int(d * SR)); n = int(d / .045)
        for i in range(n): place(x, drum('s_march'), i * .045, .3 + .7 * i / n)
        return x
    return sfx('pop', dur)

sfxbuf = np.zeros(N)
for c in cfg.get('cues', []):
    try: place(sfxbuf, sfx(c['name'], float(c.get('dur') or 0)), float(c['t']), float(c.get('gain', 1)))
    except Exception as e: print('bruitage ignoré', c, e)
sg = float(M.get('sfxGain', .9))
L = musicL + sfxbuf * sg + reverb(sfxbuf, 1.0, 3) * .12 * sg
R = musicR + sfxbuf * sg + reverb(sfxbuf, 1.0, 4) * .12 * sg
st = np.stack([L, R], 1); st = np.tanh(st * 1.15); st /= max(1e-9, np.abs(st).max()) / .9
fo = int(.25 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]; st[:200] *= np.linspace(0, 1, 200)[:, None]
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
rms = float(np.sqrt(np.mean(st ** 2)))
print(f'audio OK : {DUR:.1f} s, {BPM:.0f} BPM (mesure = {BAR:.3f} s), style {M.get("style")}, niveau RMS {20 * np.log10(rms + 1e-9):.1f} dB')
