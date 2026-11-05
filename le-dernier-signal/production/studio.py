"""Moteur de production de LE DERNIER SIGNAL.

Rendu image par code (PIL), voix de synthèse (espeak-ng + MBROLA),
bande-son de synthèse (numpy), montage et export (ffmpeg).
Partagé par les six parties pour garantir la continuité visuelle et sonore.
"""
import math, os, random, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SR = 1280, 536, 24, 44100
FONT_DIR = '/usr/share/fonts/truetype/dejavu/'


def font(name, size):
    return ImageFont.truetype(FONT_DIR + name, size)


MONO = font('DejaVuSansMono.ttf', 30)
MONO_S = font('DejaVuSansMono.ttf', 18)
MONO_XS = font('DejaVuSansMono.ttf', 14)
SANS = font('DejaVuSans.ttf', 20)
SANS_S = font('DejaVuSans.ttf', 16)
SANS_B = font('DejaVuSans-Bold.ttf', 22)
SUB = font('DejaVuSans.ttf', 23)
TITLE = font('DejaVuSans.ttf', 46)

# ------------------------------------------------------------------ couleurs
# Références visuelles définitives (bible, section 2 et 3)
REF = {
    'nathan': dict(skin=(222, 196, 178), hair=(58, 40, 30), eyes=(120, 140, 125),
                   top=(128, 128, 132), top2=(105, 105, 110), legs=(52, 52, 58)),
    'elise': dict(skin=(176, 128, 96), hair=(18, 14, 14), eyes=(55, 35, 25),
                  top=(214, 162, 38), top2=(20, 20, 22), legs=(22, 22, 26)),
    'futur': dict(skin=(205, 178, 160), hair=(60, 48, 40), eyes=(120, 140, 125),
                  top=(48, 46, 44), top2=(70, 66, 60), legs=(40, 40, 40)),
    'gabriel': dict(skin=(214, 176, 158), hair=(165, 165, 165), eyes=(150, 175, 200),
                    top=(30, 38, 62), top2=(225, 218, 200), legs=(95, 70, 50)),
}


def tint(c, k):
    return tuple(max(0, min(255, int(c[i] * k[i]))) for i in range(3))


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# ------------------------------------------------------------------ personnages
def bust(img, cx, cy, s, who, mouth=0.0, blink=False, hood=False, light=(1, 1, 1),
         look=(0, 0), brow=0.0, rim=None, scar=False, tilt=0, mouth_w=1.0):
    """Buste de face. cy = centre du visage. mouth 0..1 (synchro labiale)."""
    r = REF[who]
    d = ImageDraw.Draw(img)
    L = lambda c: tint(c, light)
    cx += tilt
    # épaules / torse
    sw = 175 * s
    d.rounded_rectangle([cx - sw, cy + 105 * s, cx + sw, cy + 420 * s], radius=int(70 * s), fill=L(r['top']))
    if who == 'elise':  # col roulé noir dans le ciré ouvert
        d.polygon([(cx - 45 * s, cy + 105 * s), (cx + 45 * s, cy + 105 * s), (cx + 20 * s, cy + 420 * s), (cx - 20 * s, cy + 420 * s)], fill=L(r['top2']))
        d.line([(cx - 48 * s, cy + 110 * s), (cx - 30 * s, cy + 420 * s)], fill=L((150, 110, 25)), width=max(1, int(4 * s)))
        d.line([(cx + 48 * s, cy + 110 * s), (cx + 30 * s, cy + 420 * s)], fill=L((150, 110, 25)), width=max(1, int(4 * s)))
    if who == 'gabriel':
        d.polygon([(cx - 55 * s, cy + 105 * s), (cx + 55 * s, cy + 105 * s), (cx + 30 * s, cy + 420 * s), (cx - 30 * s, cy + 420 * s)], fill=L(r['top2']))
    if who == 'nathan':  # cordons du sweat
        d.line([(cx - 25 * s, cy + 115 * s), (cx - 28 * s, cy + 200 * s)], fill=L((200, 200, 200)), width=max(1, int(3 * s)))
        d.line([(cx + 25 * s, cy + 115 * s), (cx + 28 * s, cy + 200 * s)], fill=L((200, 200, 200)), width=max(1, int(3 * s)))
    # cou
    d.rectangle([cx - 30 * s, cy + 60 * s, cx + 30 * s, cy + 120 * s], fill=L(tint(r['skin'], (0.85, 0.85, 0.85))))
    # capuche (arrière)
    if hood:
        d.ellipse([cx - 108 * s, cy - 140 * s, cx + 108 * s, cy + 125 * s], fill=L(r['top2']))
    # cheveux arrière
    if who == 'elise':
        d.ellipse([cx - 92 * s, cy - 112 * s, cx + 92 * s, cy + 70 * s], fill=L(r['hair']))
        d.ellipse([cx + 40 * s, cy + 10 * s, cx + 110 * s, cy + 80 * s], fill=L(r['hair']))  # chignon bas
    # tête
    d.ellipse([cx - 68 * s, cy - 88 * s, cx + 68 * s, cy + 88 * s], fill=L(r['skin']))
    # oreilles
    d.ellipse([cx - 78 * s, cy - 10 * s, cx - 60 * s, cy + 25 * s], fill=L(r['skin']))
    d.ellipse([cx + 60 * s, cy - 10 * s, cx + 78 * s, cy + 25 * s], fill=L(r['skin']))
    if who == 'elise':  # anneau doré oreille gauche du personnage = droite de l'image
        d.ellipse([cx + 66 * s, cy + 22 * s, cx + 78 * s, cy + 34 * s], outline=L((230, 190, 70)), width=max(1, int(3 * s)))
    # cheveux avant
    hc = L(r['hair'])
    if who == 'nathan':
        d.chord([cx - 72 * s, cy - 96 * s, cx + 72 * s, cy + 10 * s], 180, 360, fill=hc)
        d.polygon([(cx - 70 * s, cy - 40 * s), (cx - 10 * s, cy - 50 * s), (cx - 55 * s, cy + 5 * s)], fill=hc)  # mèche œil droit
        for k in range(7):
            x = cx - 60 * s + k * 20 * s
            d.polygon([(x, cy - 60 * s), (x + 14 * s, cy - 108 * s), (x + 22 * s, cy - 60 * s)], fill=hc)
    elif who == 'futur':
        d.chord([cx - 70 * s, cy - 92 * s, cx + 70 * s, cy - 10 * s], 180, 360, fill=hc)
        g = L((150, 150, 150))
        d.rectangle([cx - 70 * s, cy - 50 * s, cx - 60 * s, cy - 10 * s], fill=g)
        d.rectangle([cx + 60 * s, cy - 50 * s, cx + 70 * s, cy - 10 * s], fill=g)
        for k in range(160):  # barbe de quelques jours
            rr = random.Random(k)
            a = rr.uniform(0.15, 0.85) * math.pi
            rad = rr.uniform(0.55, 0.98)
            x = cx + math.cos(a) * 60 * s * rad
            y = cy + 15 * s + math.sin(a) * 70 * s * rad
            d.point((x, y), fill=L((70, 60, 55)))
    elif who == 'elise':
        d.chord([cx - 72 * s, cy - 96 * s, cx + 72 * s, cy - 5 * s], 180, 360, fill=hc)
        for k in range(9):
            rr = random.Random(k + 40)
            x = cx + rr.uniform(-70, 70) * s
            y = cy + rr.uniform(-95, -50) * s
            d.ellipse([x - 12 * s, y - 12 * s, x + 12 * s, y + 12 * s], fill=hc)
        d.arc([cx - 80 * s, cy - 40 * s, cx - 50 * s, cy + 40 * s], 100, 260, fill=hc, width=max(1, int(5 * s)))
    elif who == 'gabriel':
        d.chord([cx - 70 * s, cy - 95 * s, cx + 70 * s, cy - 30 * s], 180, 360, fill=hc)
        d.chord([cx - 62 * s, cy - 10 * s, cx + 62 * s, cy + 95 * s], 0, 180, fill=L((175, 175, 172)))
    if hood:
        d.arc([cx - 100 * s, cy - 132 * s, cx + 100 * s, cy + 120 * s], 190, 350, fill=L(r['top']), width=max(2, int(16 * s)))
    # sourcils
    bc = L(tint(r['hair'], (0.8, 0.8, 0.8)))
    by = cy - 32 * s - brow * 8 * s
    d.line([(cx - 45 * s, by + 3 * s), (cx - 15 * s, by - brow * 4 * s)], fill=bc, width=max(1, int(5 * s)))
    d.line([(cx + 15 * s, by - brow * 4 * s), (cx + 45 * s, by + 3 * s)], fill=bc, width=max(1, int(5 * s)))
    if scar:  # cicatrice sourcil gauche du personnage (droite de l'image)
        d.line([(cx + 30 * s, by - 10 * s), (cx + 33 * s, by + 12 * s)], fill=L((240, 225, 215)), width=max(1, int(3 * s)))
    # yeux
    ey = cy - 12 * s
    for ex in (cx - 30 * s, cx + 30 * s):
        if blink:
            d.line([(ex - 13 * s, ey), (ex + 13 * s, ey)], fill=L((40, 30, 30)), width=max(1, int(3 * s)))
        else:
            d.ellipse([ex - 14 * s, ey - 9 * s, ex + 14 * s, ey + 9 * s], fill=L((238, 236, 232)))
            px, py = ex + look[0] * 5 * s, ey + look[1] * 3 * s
            d.ellipse([px - 7 * s, py - 7 * s, px + 7 * s, py + 7 * s], fill=L(r['eyes']))
            d.ellipse([px - 3 * s, py - 3 * s, px + 3 * s, py + 3 * s], fill=(10, 10, 12))
    # cernes
    if who in ('nathan', 'futur'):
        for ex in (cx - 30 * s, cx + 30 * s):
            d.arc([ex - 14 * s, ey + 4 * s, ex + 14 * s, ey + 16 * s], 20, 160, fill=L(tint(r['skin'], (0.78, 0.74, 0.78))), width=max(1, int(2 * s)))
    # nez
    d.line([(cx, cy - 5 * s), (cx - 6 * s, cy + 25 * s), (cx + 4 * s, cy + 28 * s)], fill=L(tint(r['skin'], (0.75, 0.7, 0.7))), width=max(1, int(3 * s)))
    # bouche (synchro labiale)
    my = cy + 50 * s
    mo = max(0.0, min(1.0, mouth))
    mw = (22 - 4 * mo) * s * mouth_w
    mh = (2 + 18 * mo) * s
    lip = L(tint(r['skin'], (0.72, 0.55, 0.55)))
    if mo < 0.06:
        d.line([(cx - mw, my), (cx + mw, my)], fill=lip, width=max(1, int(4 * s)))
    else:
        d.ellipse([cx - mw, my - mh / 2, cx + mw, my + mh / 2], fill=L((60, 25, 28)), outline=lip, width=max(1, int(3 * s)))
    if rim:
        d.arc([cx - 70 * s, cy - 90 * s, cx + 70 * s, cy + 90 * s], 280, 80, fill=rim, width=max(1, int(4 * s)))


def body(img, x, yb, s, who, phase=0.0, walking=False, light=(1, 1, 1), hood=False, arm=0.0, facing=1):
    """Silhouette en pied. yb = niveau du sol."""
    r = REF[who]
    d = ImageDraw.Draw(img)
    L = lambda c: tint(c, light)
    sw = math.sin(phase) if walking else 0
    bob = abs(math.sin(phase)) * 6 * s if walking else 0
    hip = yb - 90 * s - bob
    d.line([(x - 10 * s, hip), (x - 10 * s + sw * 25 * s, yb)], fill=L(r['legs']), width=max(2, int(18 * s)))
    d.line([(x + 10 * s, hip), (x + 10 * s - sw * 25 * s, yb)], fill=L(r['legs']), width=max(2, int(18 * s)))
    top = hip - 95 * s
    coat = 30 * s if who in ('elise', 'gabriel') else 0
    d.rounded_rectangle([x - 32 * s, top, x + 32 * s, hip + coat], radius=int(14 * s), fill=L(r['top']))
    d.line([(x - 30 * s, top + 10 * s), (x - 34 * s - sw * 15 * s, top + 85 * s)], fill=L(r['top']), width=max(2, int(15 * s)))
    d.line([(x + 30 * s, top + 10 * s), (x + 34 * s + sw * 15 * s + arm * 40 * s, top + 85 * s - arm * 60 * s)], fill=L(r['top']), width=max(2, int(15 * s)))
    hy = top - 30 * s
    if hood:
        d.ellipse([x - 28 * s, hy - 30 * s, x + 28 * s, hy + 30 * s], fill=L(r['top2']))
    else:
        d.ellipse([x - 22 * s, hy - 26 * s, x + 22 * s, hy + 26 * s], fill=L(r['skin']))
        d.chord([x - 24 * s, hy - 30 * s, x + 24 * s, hy + 6 * s], 180, 360, fill=L(r['hair']))
        if who == 'elise':
            d.ellipse([x - 18 * s * facing - 10 * s, hy + 2 * s, x - 18 * s * facing + 10 * s, hy + 22 * s], fill=L(r['hair']))


# ------------------------------------------------------------------ effets
def rain(img, n, color=(120, 130, 150), angle=3, seed=None, length=(14, 36), area=None):
    d = ImageDraw.Draw(img)
    rr = random.Random(seed) if seed is not None else random
    x0, y0, x1, y1 = area or (0, 0, W, H)
    for _ in range(n):
        x = rr.randint(x0 - 30, x1)
        y = rr.randint(y0 - 40, y1)
        l = rr.randint(*length)
        d.line([(x, y), (x + angle, y + l)], fill=color)


def vgrad(w, h, top, bot):
    a = np.linspace(0, 1, h)[:, None, None]
    arr = np.array(top)[None, None, :] * (1 - a) + np.array(bot)[None, None, :] * a
    return Image.fromarray(np.repeat(arr, w, 1).astype(np.uint8))


def glow(img, box, color, radius=40, strength=0.6):
    layer = Image.new('RGB', img.size)
    ImageDraw.Draw(layer).rectangle(box, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius))
    return Image.fromarray(np.clip(np.asarray(img, np.float32) + np.asarray(layer, np.float32) * strength, 0, 255).astype(np.uint8))


def fade(img, k, color=(0, 0, 0)):
    if k >= 1:
        return img
    return Image.blend(Image.new('RGB', img.size, color), img, max(0.0, k))


def grade(img, mult):
    a = np.asarray(img, np.float32) * np.array(mult, np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def vignette(img, strength=0.55):
    y, x = np.ogrid[:H, :W]
    r = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    m = np.clip(1 - strength * (r - 0.45), 0.25, 1)[..., None]
    return Image.fromarray((np.asarray(img, np.float32) * m).astype(np.uint8))


_VIG = None


def finish(img):
    global _VIG
    if _VIG is None:
        y, x = np.ogrid[:H, :W]
        r = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
        _VIG = np.clip(1 - 0.5 * (r - 0.5), 0.35, 1)[..., None].astype(np.float32)
    a = np.asarray(img, np.float32) * _VIG
    a += np.random.default_rng().normal(0, 2.2, (H, W, 1)).astype(np.float32)  # grain
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def pixelate(img, block):
    small = img.resize((max(1, W // block), max(1, H // block)), Image.NEAREST)
    return small.resize((W, H), Image.NEAREST)


def text_c(d, y, txt, fnt, fill):
    w = d.textlength(txt, font=fnt)
    d.text(((W - w) / 2, y), txt, font=fnt, fill=fill)


def subtitle(img, txt):
    if not txt:
        return
    d = ImageDraw.Draw(img)
    lines, cur = [], ''
    for w_ in txt.split():
        t = (cur + ' ' + w_).strip()
        if d.textlength(t, font=SUB) > W - 220:
            lines.append(cur)
            cur = w_
        else:
            cur = t
    lines.append(cur)
    y = H - 22 - 30 * len(lines)
    for ln in lines:
        w = d.textlength(ln, font=SUB)
        for ox, oy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            d.text(((W - w) / 2 + ox, y + oy), ln, font=SUB, fill=(0, 0, 0))
        d.text(((W - w) / 2, y), ln, font=SUB, fill=(240, 236, 220))
        y += 30


# ------------------------------------------------------------------ voix
# Voix neuronales françaises (Piper, modèles hors ligne dans /opt/voix).
# personnage: (modèle, durée des phonèmes, décalage de hauteur en demi-tons, traitement)
VOICE_DIR = '/opt/voix'
VOICES = {
    'nathan': ('fr-gilles-low', 1.12, 0.0, None),
    'futur': ('fr-gilles-low', 1.2, -1.5, 'radio'),
    'elise': ('fr-siwis-medium', 1.05, 0.0, None),
    'maya': ('fr-siwis-low', 1.18, -2.5, 'warm'),
    'radio': ('fr-gilles-low', 0.90, 1.0, 'radio'),
    'gabriel': ('fr-gilles-low', 1.15, -3.5, None),
}


def read_wav(fn):
    w = wave.open(fn)
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    r = w.getframerate()
    out = np.interp(np.arange(0, len(x), r / SR), np.arange(len(x)), x).astype(np.float32)
    # retire silences de début/fin
    nz = np.where(np.abs(out) > 0.01)[0]
    if len(nz):
        out = out[max(0, nz[0] - 200): nz[-1] + 800]
    return out


def tts(who, text, outdir, speed_mult=1.0, emotion='neutre'):
    """Voix d'un personnage par le moteur vocal du film (voir moteur_vocal.py)."""
    import moteur_vocal
    return moteur_vocal.voix(who, text, emotion, outdir, vitesse=speed_mult)


# ------------------------------------------------------------------ audio
def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, len(x)).astype(np.float32)


def smooth_noise(n, hi, seed=0, lo=None):
    rng = np.random.default_rng(seed)
    x = fft_filter(rng.standard_normal(n).astype(np.float32), lo=lo, hi=hi)
    return x / (np.abs(x).max() + 1e-9)


def env_ramp(n, a, r):
    e = np.ones(n, np.float32)
    a, r = int(a), int(r)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def tone(freq, dur, amp=0.2, harmonics=(1,), decay=None):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * freq * h * t) / (i + 1) ** 1.5 for i, h in enumerate(harmonics))
    e = env_ramp(n, 0.01 * SR, 0.08 * SR)
    if decay:
        e *= np.exp(-t / decay)
    return (amp * x * e).astype(np.float32)


def signal_motif(amp=0.16):
    return np.concatenate([tone(f, 0.4, amp) for f in (659.25, 523.25, 440.0)])


def piano(freq, dur=3.0, amp=0.12):
    return tone(freq, dur, amp, harmonics=(1, 2, 3, 4), decay=0.9)


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.bus = {k: np.zeros(self.n, np.float32) for k in ('amb', 'fx', 'mus', 'dia')}
        # niveaux relatifs au dialogue : l'ambiance reste un fond, jamais au premier plan
        self.amb_gain, self.fx_gain, self.mus_gain = 0.16, 0.45, 0.7
        self.dia_lr = np.zeros((self.n, 2), np.float32)

    # acoustique des lieux : (durée de réverbération s, niveau de réverbération, prédélai s)
    ROOMS = {'studio': (0.35, 0.10, 0.008), 'voiture': (0.12, 0.05, 0.003), 'exterieur': (0.25, 0.04, 0.02),
             'labo': (1.4, 0.22, 0.025), 'couloir': (1.1, 0.18, 0.02), 'video': (0.5, 0.12, 0.01), 'sec': None}

    @staticmethod
    def _ir(rt, seed):
        rng = np.random.default_rng(seed)
        n = int(rt * SR)
        t = np.arange(n) / SR
        ir = rng.standard_normal(n) * np.exp(-6.9 * t / rt)
        return fft_filter(ir.astype(np.float32), hi=4500, lo=120) / np.sqrt(np.sum(ir ** 2))

    def add_voice(self, x, t, pan=0.0, room='sec', gain=1.0):
        """Voix placée dans l'espace stéréo (pan -1 gauche, +1 droite) et dans l'acoustique du lieu."""
        x = x * gain
        L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        out_l, out_r = x * L * 1.41, x * R * 1.41
        spec = self.ROOMS.get(room or 'sec')
        if spec:
            rt, lvl, pre = spec
            for ch, seed in ((0, 1), (1, 2)):
                ir = self._ir(rt, seed)
                wet = np.convolve(x, ir)[: len(x) + len(ir)] * lvl
                wet = np.concatenate([np.zeros(int(pre * SR), np.float32), wet])
                if ch == 0:
                    out_l = np.pad(out_l, (0, len(wet) - len(out_l))) + wet
                else:
                    out_r = np.pad(out_r, (0, len(wet) - len(out_r))) + wet
        i = int(t * SR)
        m = min(len(out_l), len(out_r), self.n - i)
        if m <= 0:
            return
        self.dia_lr[i:i + m, 0] += out_l[:m]
        self.dia_lr[i:i + m, 1] += out_r[:m]
        md = min(m, len(x))
        self.bus['dia'][i:i + md] += x[:md]

    def add(self, bus, x, t, gain=1.0):
        i = int(t * SR)
        if i >= self.n or i + len(x) <= 0:
            return
        j0 = max(0, -i)
        seg = x[j0: self.n - i]
        self.bus[bus][max(0, i): max(0, i) + len(seg)] += gain * seg

    def render(self, duck_from_dialogue=True):
        dia = self.bus['dia']
        if duck_from_dialogue:
            env = np.abs(dia)
            k = int(0.25 * SR)
            env = np.convolve(env, np.ones(k) / k, 'same')
            duck = 1 - 0.7 * np.clip(env / 0.02, 0, 1)
        else:
            duck = 1
        bed = self.bus['amb'] * duck * self.amb_gain + self.bus['fx'] * self.fx_gain + self.bus['mus'] * duck * self.mus_gain
        bed = fft_filter(bed, lo=30, hi=11000)
        haas = int(0.011 * SR)  # largeur stéréo de l'ambiance
        out = np.stack([bed, np.concatenate([bed[haas:], np.zeros(haas, np.float32)]) * 0.97 + bed * 0.03], 1)
        out[:, 0] += fft_filter(self.dia_lr[:, 0], lo=70, hi=12000)
        out[:, 1] += fft_filter(self.dia_lr[:, 1], lo=70, hi=12000)
        d = dia[np.abs(dia) > 1e-4]
        ref = np.sqrt(np.mean(d ** 2)) if len(d) else 0.1
        out = out * (0.125 / ref)
        out = np.tanh(out / 0.89) * 0.89  # crête -1 dB
        return out.astype(np.float32)

    @staticmethod
    def write(fn, x):
        w = wave.open(fn, 'wb')
        w.setnchannels(2 if x.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
        w.close()


# ------------------------------------------------------------------ montage
class Timeline:
    """Séquences à durée fixe ; les plans s'ajustent aux répliques réellement prononcées."""

    def __init__(self, voicedir):
        self.voicedir = voicedir
        self.shots = []      # (start, end, fn, kw)
        self.lines = []      # (start, end, who, text, audio)
        self.seqs = []       # (début, fin) de chaque séquence
        self.emo = []        # émotion jouée, par réplique
        self.room = []       # acoustique du lieu, par réplique

    def plan(self, beats, gap=0.3, speed=1.0):
        plans = []
        for b in beats:
            import moteur_vocal
            auds = []
            for ln in b.get('lines', []):
                w, t, note = (tuple(ln) + (None,))[:3]
                emo = moteur_vocal.diriger(w, t, b.get('mood'), note)
                auds.append((w, t, tts(w, t, self.voicedir, speed, emo), emo))
            need = sum(len(a) / SR for _, _, a, _ in auds) + gap * max(0, len(auds) - 1)
            need += b.get('lead', 0.35) + 0.45 if auds else 0
            plans.append([b, auds, need, max(b['min'], need)])
        return plans

    def natural(self, beats, gap=0.3):
        return sum(p[3] for p in self.plan(beats, gap))

    def sequence(self, start, length, beats, gap=0.3):
        """start=None : enchaîne après la séquence précédente."""
        if start is None:
            start = self.seqs[-1][1] if self.seqs else 0.0
        speed = 1.0
        plans = self.plan(beats, gap, speed)
        if length is None:
            length = sum(p[3] for p in plans)
        total = sum(p[3] for p in plans)
        if total > length + 1e-6:
            raise ValueError(f'séquence {start:.1f}+{length:.1f}s trop courte ({total:.1f}s nécessaires)')
        extra = length - total
        fx = lambda b: b.get('flex', 0.15 if b.get('lines') else 1)  # la marge va aux plans muets, pas aux dialogues
        flex = sum(fx(p[0]) * p[0]['min'] for p in plans) or 1
        t = start
        for b, auds, need, dur in plans:
            dur += extra * fx(b) * b['min'] / flex
            self.shots.append((t, t + dur, b['shot'], b.get('kw', {}), dur))
            lt = t + b.get('lead', 0.35) + (max(0, dur - need) * b.get('center', 0.3))
            for w, txt, a, emo in auds:
                if txt.rstrip().endswith('—'):   # réplique coupée : la suivante l'interrompt
                    nxt = len(a) / SR - 0.25
                else:
                    nxt = len(a) / SR + gap
                self.lines.append((lt, lt + len(a) / SR, w, txt, a))
                self.emo.append(emo)
                self.room.append(b.get('room'))
                lt += nxt
            t += dur
        self.seqs.append((start, start + length))
        return speed

    def shot_at(self, t):
        for s in self.shots:
            if s[0] <= t < s[1]:
                return s
        return self.shots[-1]

    def mouth_tracks(self, total):
        """Ouverture de bouche par personnage (et largeur dans self.mouth_width)."""
        import moteur_vocal
        nfr = int(total * FPS)
        tr, wd = {}, {}
        for st, en, w, txt, a in self.lines:
            arr = tr.setdefault(w, np.zeros(nfr, np.float32))
            arw = wd.setdefault(w, np.ones(nfr, np.float32))
            ouv, larg = moteur_vocal.visemes(a, FPS)
            f0 = int(round(st * FPS))
            for k in range(len(ouv)):
                f = f0 + k
                if 0 <= f < nfr and ouv[k] >= arr[f]:
                    arr[f] = ouv[k]
                    arw[f] = larg[k]
        self.mouth_width = wd
        return tr

    def emotion_at(self, who, t, hold=0.8):
        for (st, en, w, txt, a), emo in zip(self.lines, self.emo):
            if w == who and st - 0.3 <= t <= en + hold:
                return emo
        return None

    def sub_at(self, t):
        for st, en, w, txt, a in self.lines:
            if st - 0.1 <= t <= en + 0.4:
                return txt
        return ''


def encode(frames_fn, nframes, out):
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                          '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium',
                          '-crf', '19', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for f in range(nframes):
        p.stdin.write(frames_fn(f).tobytes())
    p.stdin.close()
    p.wait()
