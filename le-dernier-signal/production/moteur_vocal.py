"""MOTEUR VOCAL — LE DERNIER SIGNAL

Ce module est le moteur de jeu vocal du film. Il fabrique la voix de chaque personnage
à partir d'un texte et d'une situation dramatique.

Architecture (de l'amont vers l'aval) :

  1. DIRECTION   — infère l'émotion de chaque réplique à partir du contexte de la scène
                   (humeur du plan, personnage, ponctuation, place dans l'échange), comme
                   une note de mise en scène, avec intensité.
  2. PHONÉTIQUE  — découpe le texte en groupes de souffle (points de suspension, phrases),
                   décide des pauses, des hésitations et des respirations.
  3. SOCLE ACOUSTIQUE (composant préexistant, NON développé ici) :
                   modèle neuronal Piper (VITS) pré-entraîné : « fr-siwis-medium »
                   (corpus SIWIS, voix féminine) et « fr-gilles-low » (voix masculine).
                   Il fournit la prononciation française et une prosodie brute, avec un
                   débit et une variabilité que le moteur pilote.
  4. IDENTITÉ VOCALE (développé ici) — analyse/resynthèse WORLD (bibliothèque DSP
                   pyworld, sans aucune voix) : le moteur remplace la hauteur, la longueur
                   du conduit vocal (formants), le souffle, la raucité, le vibrato et
                   l'énergie, pour créer une voix propre à chaque personnage, distincte
                   de la voix du socle.
  5. JEU ÉMOTIONNEL (développé ici) — courbe de hauteur (déclinaison, montée
                   interrogative, étendue), tremblement, voix chuchotée, débit, intensité.
  6. RESPIRATIONS (développé ici) — inspirations synthétisées (bruit mis en forme par
                   des formants), adaptées au personnage et à l'émotion.
  7. EXTENSION DE BANDE (développé ici) — reconstruit les aigus (8-12 kHz) absents
                   d'un socle à 16 kHz, pour une voix moins « téléphone ».

Sortie : signal mono 44,1 kHz, plus des pistes de synchro labiale (ouverture et
arrondi de la bouche) calculées sur la voix finale.
"""
import hashlib, json, os, re, subprocess, wave
import numpy as np
import pyworld

SR = 44100
VOICE_DIR = '/opt/voix'
FRAME = 5.0  # ms

# ---------------------------------------------------------------- 1. identités vocales
# Chaque personnage : socle, hauteur moyenne (Hz), étendue de hauteur, facteur de conduit
# vocal (>1 : plus court, plus jeune/clair ; <1 : plus long, plus grave/mûr), souffle (0-1),
# raucité (irrégularité de hauteur), débit, et s'il respire de façon audible.
IDENTITES = {
    'nathan':  dict(socle='fr-gilles-low',   f0=122, etendue=1.05, conduit=1.06, souffle=0.18, raucite=0.004, debit=0.86, respire=True,  air=0.9),
    'futur':   dict(socle='fr-gilles-low',   f0=104, etendue=0.85, conduit=1.00, souffle=0.28, raucite=0.012, debit=0.95, respire=True,  air=0.6),
    'gabriel': dict(socle='fr-gilles-low',   f0=86,  etendue=0.80, conduit=0.91, souffle=0.32, raucite=0.02, debit=1.02, respire=True,  air=0.7, vibrato=(5.2, 0.006)),
    'radio':   dict(socle='fr-gilles-low',   f0=128, etendue=1.10, conduit=1.03, souffle=0.05, raucite=0.002, debit=0.92, respire=False, air=0.5),
    'elise':   dict(socle='fr-siwis-medium', f0=212, etendue=1.10, conduit=1.03, souffle=0.20, raucite=0.004, debit=0.92, respire=True,  air=1.0),
    'maya':    dict(socle='fr-siwis-medium', f0=176, etendue=0.80, conduit=0.92, souffle=0.08, raucite=0.0,   debit=1.02, respire=False, air=1.1),
}

# ---------------------------------------------------------------- 2. émotions
# debit : multiplicateur de durée (>1 plus lent) ; demi_tons : décalage de hauteur ;
# etendue : amplitude de la courbe ; gain : dB ; souffle : ajout ; pause : facteur sur les
# silences internes ; tremble : tremblement de hauteur ; chuchote : voix sans voisement.
EMOTIONS = {
    'neutre':    dict(debit=1.00, demi_tons=0.0,  etendue=1.00, gain=0.0,  souffle=0.00, pause=1.0, tremble=0.0),
    'tension':   dict(debit=0.97, demi_tons=0.6,  etendue=1.15, gain=1.0,  souffle=0.05, pause=0.9, tremble=0.0),
    'peur':      dict(debit=0.93, demi_tons=1.5,  etendue=1.25, gain=-2.0, souffle=0.25, pause=1.3, tremble=0.018),
    'tristesse': dict(debit=1.14, demi_tons=-1.5, etendue=0.70, gain=-4.0, souffle=0.30, pause=1.4, tremble=0.008),
    'colere':    dict(debit=0.90, demi_tons=1.2,  etendue=1.50, gain=3.0,  souffle=0.00, pause=0.8, tremble=0.0),
    'joie':      dict(debit=0.95, demi_tons=1.8,  etendue=1.40, gain=1.5,  souffle=0.05, pause=0.9, tremble=0.0),
    'surprise':  dict(debit=0.95, demi_tons=2.5,  etendue=1.60, gain=2.0,  souffle=0.10, pause=1.0, tremble=0.0),
    'douceur':   dict(debit=1.10, demi_tons=-0.6, etendue=0.90, gain=-3.0, souffle=0.25, pause=1.2, tremble=0.0),
    'ironie':    dict(debit=1.00, demi_tons=0.5,  etendue=1.30, gain=0.0,  souffle=0.05, pause=1.0, tremble=0.0),
    'fatigue':   dict(debit=1.12, demi_tons=-1.0, etendue=0.75, gain=-2.0, souffle=0.20, pause=1.3, tremble=0.0),
    'sidere':    dict(debit=1.18, demi_tons=-1.0, etendue=0.60, gain=-3.0, souffle=0.20, pause=1.5, tremble=0.006),
    'mystere':   dict(debit=1.08, demi_tons=0.0,  etendue=0.85, gain=-1.0, souffle=0.00, pause=1.2, tremble=0.0),
    'chuchote':  dict(debit=1.05, demi_tons=0.0,  etendue=0.90, gain=-8.0, souffle=1.00, pause=1.2, tremble=0.0, chuchote=True),
    'murmure':   dict(debit=1.06, demi_tons=-0.5, etendue=0.85, gain=-6.0, souffle=0.55, pause=1.2, tremble=0.0),
}

# Humeur d'un plan -> émotion par défaut de chaque personnage (la « note » du réalisateur)
HUMEURS = {
    'intime':    {'*': 'douceur'},
    'inquiet':   {'*': 'douceur', 'nathan': 'fatigue'},
    'humour':    {'elise': 'ironie', 'nathan': 'fatigue', '*': 'neutre'},
    'enquete':   {'elise': 'joie', 'nathan': 'tension', '*': 'tension'},
    'tension':   {'*': 'tension'},
    'peur':      {'*': 'peur'},
    'choc':      {'*': 'sidere'},
    'exploration': {'*': 'murmure'},
    'nuit':      {'*': 'fatigue'},
    'mystere':   {'maya': 'mystere', '*': 'peur'},
    'aveu':      {'*': 'tristesse'},
}


def diriger(qui, texte, humeur=None, note=None):
    """Émotion d'une réplique : la note explicite prime, sinon l'humeur du plan, puis le texte."""
    if note:
        return note
    emo = 'neutre'
    if humeur in HUMEURS:
        h = HUMEURS[humeur]
        emo = h.get(qui, h.get('*', 'neutre'))
    if qui == 'maya' and emo not in ('mystere', 'neutre', 'douceur', 'tension'):
        emo = 'mystere'  # MAYA ne perd jamais son calme
    if texte.strip().endswith('!') and emo in ('neutre', 'tension'):
        emo = 'colere' if humeur == 'tension' else 'surprise'
    return emo


# ---------------------------------------------------------------- 3. socle acoustique
def _socle(texte, modele, duree, variabilite, out):
    subprocess.run(['python3', '-m', 'piper', '-m', f'{VOICE_DIR}/{modele}/{modele}.onnx', '-f', out,
                    '--length-scale', f'{duree:.3f}', '--noise-scale', f'{variabilite:.3f}',
                    '--noise-w-scale', '0.8', '--sentence-silence', '0.0'],
                   input=texte.encode(), check=True, stderr=subprocess.DEVNULL)
    w = wave.open(out)
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    fs = w.getframerate()
    w.close()
    os.remove(out)
    nz = np.where(np.abs(x) > 0.004)[0]
    if len(nz):
        x = x[max(0, nz[0] - int(0.01 * fs)): nz[-1] + int(0.03 * fs)]
    return x, fs


# ---------------------------------------------------------------- 4-5-7. identité + jeu
def _transformer(x, fs, ident, emo, question, groupe_final, rng):
    f0, t = pyworld.harvest(x, fs, frame_period=FRAME, f0_floor=60, f0_ceil=500)
    sp = pyworld.cheaptrick(x, f0, t, fs)
    ap = pyworld.d4c(x, f0, t, fs)
    n = len(f0)
    v = f0 > 0
    # --- hauteur : identité du personnage + jeu émotionnel
    if v.sum() > 3:
        lf = np.log(np.where(v, f0, 1.0))
        moy = lf[v].mean()
        cible = np.log(ident['f0']) + emo['demi_tons'] * np.log(2) / 12
        lf2 = cible + ident['etendue'] * emo['etendue'] * (lf - moy)
        tt = np.arange(n) * FRAME / 1000
        lf2 += -np.log(2) / 12 * 1.2 * (tt / max(tt[-1], 0.1))         # déclinaison naturelle
        if question:                                                   # montée interrogative
            idx = np.where(v)[0]
            fin = idx[-1]
            deb = max(idx[0], fin - int(280 / FRAME))
            lf2[deb:fin + 1] += np.linspace(0, 4.5, fin + 1 - deb) * np.log(2) / 12
        elif groupe_final:                                             # chute de fin d'énoncé
            idx = np.where(v)[0]
            fin = idx[-1]
            deb = max(idx[0], fin - int(220 / FRAME))
            lf2[deb:fin + 1] -= np.linspace(0, 2.0, fin + 1 - deb) * np.log(2) / 12
        trem = emo['tremble']
        vib = ident.get('vibrato')
        mod = np.zeros(n)
        if trem:
            mod += trem * np.sin(2 * np.pi * 6.0 * tt + rng.uniform(0, 6))
        if vib:
            mod += vib[1] * np.sin(2 * np.pi * vib[0] * tt)
        if ident['raucite']:
            mod += ident['raucite'] * np.convolve(rng.standard_normal(n), np.ones(3) / 3, 'same')
        f0 = np.where(v, np.exp(lf2) * (1 + mod), 0.0)
    if emo.get('chuchote'):
        f0 = np.zeros_like(f0)
    # --- conduit vocal (formants) : déformation de l'axe des fréquences
    a = ident['conduit']
    nb = sp.shape[1]
    src = np.arange(nb)
    sp = np.array([np.interp(src / a, src, row, right=row[-1] * 0.3) for row in sp])
    # --- souffle
    b = min(0.95, ident['souffle'] + emo['souffle'])
    ap = ap ** (1 - b) if b > 0 else ap
    if emo.get('chuchote'):
        ap = np.ones_like(ap)
    # --- énergie
    sp *= 10 ** (emo['gain'] / 10)
    # --- 7. resynthèse directe à 44,1 kHz avec extension de bande
    fft = 2048
    nb2 = fft // 2 + 1
    f_src = np.linspace(0, fs / 2, nb)
    f_out = np.linspace(0, SR / 2, nb2)
    nyq = fs / 2 * 0.96
    sp2 = np.empty((n, nb2))
    ap2 = np.ones((n, nb2))
    ref_band = (f_src > nyq * 0.6) & (f_src < nyq)
    for i in range(n):
        sp2[i] = np.interp(f_out, f_src, sp[i])
        ap2[i] = np.interp(f_out, f_src, ap[i])
        hi = f_out > nyq
        lvl = sp[i, ref_band].mean() * 0.25 * ident['air']
        sp2[i, hi] = lvl * np.exp(-(f_out[hi] - nyq) / 2600)
        ap2[i, hi] = np.maximum(ap2[i, hi], 0.85)
    y = pyworld.synthesize(np.ascontiguousarray(f0), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), SR, FRAME)
    return y


# ---------------------------------------------------------------- 6. respirations
def respiration(ident_nom, force=1.0, seed=0):
    rng = np.random.default_rng(seed)
    d = rng.uniform(0.28, 0.42)
    n = int(d * SR)
    bruit = rng.standard_normal(n)
    X = np.fft.rfft(bruit)
    f = np.fft.rfftfreq(n, 1 / SR)
    femme = IDENTITES[ident_nom]['socle'].startswith('fr-siwis')
    centres = (1100, 2400, 3600) if femme else (850, 1900, 3000)
    g = sum(np.exp(-((f - c) / 450) ** 2) for c in centres) + 0.15 * np.exp(-f / 6000)
    y = np.fft.irfft(X * g, n)
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.6 * np.linspace(0.6, 1.0, n)
    y = y * env
    return (y / (np.abs(y).max() + 1e-9) * 0.035 * force).astype(np.float32)


# ---------------------------------------------------------------- 2. découpage
def _groupes(texte):
    """Groupes de souffle : coupe aux points de suspension et entre les phrases longues."""
    t = texte.replace('—', '').replace('«', '').replace('»', '').strip()
    hesitation_initiale = t.startswith('…')
    t = t.lstrip('… ,')
    morceaux = [m.strip(' ,') for m in re.split(r'…', t)]
    out = []
    for i, m in enumerate(morceaux):
        if not m:
            continue
        phrases = re.findall(r'[^.!?]+[.!?]?', m)
        bloc = ''
        for ph in phrases:
            ph = ph.strip()
            if not ph:
                continue
            if len((bloc + ' ' + ph).split()) > 14 and bloc:
                out.append((bloc.strip(), 'phrase'))
                bloc = ph
            else:
                bloc = (bloc + ' ' + ph).strip()
        if bloc:
            out.append((bloc, 'suspension' if i < len(morceaux) - 1 else 'fin'))
    return out, hesitation_initiale


# ---------------------------------------------------------------- API
CACHE_VERSION = 'mv3'


def voix(qui, texte, emotion='neutre', outdir='/tmp', vitesse=1.0, seed=None):
    """Génère la réplique. Retourne un tableau float32 mono 44,1 kHz (niveau dialogue ~ -20 dBFS RMS)."""
    ident = IDENTITES[qui]
    emo = EMOTIONS[emotion]
    cle = hashlib.md5(json.dumps([CACHE_VERSION, qui, texte, emotion, vitesse, ident, emo], sort_keys=True).encode()).hexdigest()[:16]
    fn = os.path.join(outdir, f'{qui}_{emotion}_{cle}.wav')
    if os.path.exists(fn):
        w = wave.open(fn)
        y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return y
    rng = np.random.default_rng(int(cle[:8], 16) if seed is None else seed)
    groupes, hes = _groupes(texte)
    parts = []
    if ident['respire'] and (len(texte.split()) > 12 or emotion in ('peur', 'tristesse', 'sidere', 'colere', 'surprise')):
        parts.append(respiration(qui, 1.3 if emotion in ('peur', 'colere') else 1.0, seed=int(cle[:6], 16)))
        parts.append(np.zeros(int(0.06 * SR), np.float32))
    if hes:
        parts.append(np.zeros(int(0.35 * emo['pause'] * SR), np.float32))
    for i, (g, kind) in enumerate(groupes):
        duree = ident['debit'] * emo['debit'] / vitesse
        variab = 0.62 + 0.25 * min(1.5, abs(emo['etendue'] - 1) * 2)
        x, fs = _socle(g, ident['socle'], duree, variab, fn + f'.{i}.tmp.wav')
        y = _transformer(x, fs, ident, emo, question=g.endswith('?'), groupe_final=(kind == 'fin'), rng=rng)
        parts.append(y.astype(np.float32))
        if i < len(groupes) - 1:
            p = {'suspension': 0.42, 'phrase': 0.22}.get(kind, 0.2) * emo['pause'] * rng.uniform(0.85, 1.2)
            parts.append(np.zeros(int(p * SR), np.float32))
            if kind == 'phrase' and ident['respire'] and len(g.split()) > 8:
                parts.append(respiration(qui, 0.7, seed=i + 7))
    y = np.concatenate(parts)
    # niveau : la voix sonne plus fort ou plus doucement selon l'émotion, autour de -20 dBFS
    voc = y[np.abs(y) > 1e-3]
    rms = np.sqrt(np.mean(voc ** 2)) if len(voc) else 1
    y = y / rms * 0.1 * 10 ** (emo['gain'] / 40)
    y = np.clip(y, -0.98, 0.98).astype(np.float32)
    w = wave.open(fn, 'wb')
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y * 32767).astype(np.int16).tobytes())
    w.close()
    return y


def visemes(y, fps=24):
    """Synchro labiale : ouverture (énergie) et largeur (brillance du spectre : i/é larges, o/ou arrondis)."""
    hop = SR // fps
    n = len(y) // hop
    ouv = np.zeros(n, np.float32)
    larg = np.ones(n, np.float32)
    for k in range(n):
        seg = y[k * hop:(k + 1) * hop]
        e = np.sqrt(np.mean(seg ** 2))
        ouv[k] = min(1.0, e * 7)
        if e > 0.01:
            S = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
            f = np.fft.rfftfreq(len(seg), 1 / SR)
            c = (S * f).sum() / (S.sum() + 1e-9)
            larg[k] = float(np.clip(0.75 + (c - 900) / 2500, 0.7, 1.3))
    return ouv, larg
