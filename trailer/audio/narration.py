"""Génère la narration phrase par phrase avec une voix neuronale locale (Kokoro, voix féminine française « siwis »),
contrôle chaque phrase, puis place les répliques sur la ligne de temps de la bande-annonce.

Chaque phrase est synthétisée séparément puis assemblée avec des pauses maîtrisées, pour éviter les mots coupés
et les hésitations des longues générations. Usage : python3 narration.py <dossier_modele> <sortie>
"""
import json, sys, re
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
MODEL_DIR, OUT = Path(sys.argv[1]), Path(sys.argv[2])
SR = 24000
SPEED = 0.92            # un peu plus posé qu'à l'ordinaire : voix de narratrice
PAUSE_SENTENCE = 0.42   # silence entre deux phrases d'une même réplique

def trim(sig, thr=0.006, pad=0.03):
    """Retire les silences de début et de fin, en gardant une marge pour ne jamais couper une attaque ou une chute."""
    env = np.convolve(np.abs(sig), np.ones(240) / 240, mode='same')
    idx = np.where(env > thr)[0]
    if not len(idx): return sig[:0]
    a, b = max(0, idx[0] - int(pad * SR)), min(len(sig), idx[-1] + int(pad * SR * 3))
    return sig[a:b]

def fade(sig, ms=12):
    n = int(SR * ms / 1000)
    if len(sig) > 2 * n:
        sig = sig.copy(); sig[:n] *= np.linspace(0, 1, n); sig[-n:] *= np.linspace(1, 0, n)
    return sig

def check(text, sig):
    """Contrôle qualité : rien de vide, pas de saturation, débit plausible, pas de trou anormal au milieu."""
    problems = []
    dur = len(sig) / SR
    letters = len(re.sub(r'[^\wÀ-ÿ]', '', text))
    rate = letters / max(dur, 1e-6)
    if dur < 0.3: problems.append('trop court')
    if letters > 6 and not 6 <= rate <= 22: problems.append(f'débit anormal ({rate:.1f} lettres/s)')
    if np.max(np.abs(sig)) >= 0.999: problems.append('saturation')
    env = np.convolve(np.abs(sig), np.ones(480) / 480, mode='same') > 0.004
    gap, longest = 0, 0
    for v in env:
        gap = 0 if v else gap + 1; longest = max(longest, gap)
    if longest / SR > 0.75: problems.append(f'silence interne de {longest / SR:.2f} s')
    return dur, rate, problems

def main():
    script = json.loads((HERE.parent / 'script.json').read_text())
    k = Kokoro(str(MODEL_DIR / 'kokoro-q8.onnx'), str(MODEL_DIR / 'voices-fr.npz'))
    total = np.zeros(int(600 * SR), dtype=np.float32)
    report, timeline, end_prev = [], [], 0.0
    for line in script['lines']:
        parts = []
        for sentence in line['say']:
            best = None
            for attempt in range(3):   # en cas de défaut détecté, on régénère la phrase (débit légèrement différent)
                sig, sr = k.create(sentence, voice='ff_siwis', speed=SPEED - 0.02 * attempt, lang='fr-fr')
                assert sr == SR
                sig = fade(trim(sig.astype(np.float32)))
                dur, rate, problems = check(sentence, sig)
                if best is None or len(problems) < len(best[3]): best = (sig, dur, rate, problems)
                if not problems: break
            sig, dur, rate, problems = best
            # niveau homogène d'une phrase à l'autre (sonie RMS), sans écrêtage
            rms = np.sqrt(np.mean(sig ** 2)) or 1
            sig = sig * (0.085 / rms)
            pk = np.max(np.abs(sig))
            if pk > 0.95: sig = np.tanh(sig / pk * 1.6) / np.tanh(1.6) * 0.95
            problems = [x for x in problems if x != 'saturation']
            report.append({'line': line['id'], 'text': sentence, 'seconds': round(dur, 2), 'letters_per_s': round(rate, 1),
                           'phonemes': k.tokenizer.phonemize(sentence, 'fr-fr'), 'problems': problems})
            parts.append(sig)
            parts.append(np.zeros(int(PAUSE_SENTENCE * SR), dtype=np.float32))
        clip = np.concatenate(parts[:-1])
        start = round(end_prev + line['gap'], 3)   # placement automatique : silence 'gap' après la réplique précédente
        a = int(start * SR)
        total[a:a + len(clip)] += clip
        end_prev = start + len(clip) / SR
        timeline.append({'id': line['id'], 'start': start, 'end': round(end_prev, 3), 'text': ' '.join(line['say']), 'status': line['status'], 'chapter': line['chapter']})
    duration = round(end_prev + script['tail'], 3)
    total = total[:int(duration * SR)]
    peak = np.max(np.abs(total))
    total *= 0.89 / peak
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(OUT / 'narration.wav', total, SR, subtype='PCM_24')
    (OUT / 'narration.json').write_text(json.dumps({'duration': duration, 'timeline': timeline, 'qc': report}, ensure_ascii=False, indent=1))
    (HERE.parent / 'scene' / 'cues.json').write_text(json.dumps({'duration': duration, 'timeline': timeline}, ensure_ascii=False, indent=1))
    for r in report:
        print(f"{r['line']} {r['seconds']:5.2f}s {r['letters_per_s']:4.1f}l/s {'OK' if not r['problems'] else r['problems']}  {r['text']}")
    for t in timeline: print(f"  {t['id']} {t['start']:6.2f} → {t['end']:6.2f}")
    print('durée totale', duration)

main()
