"""Contrôle qualité d'une ou plusieurs vidéos : python3 _moteur/controle.py fichier.mp4 [...]
Vérifie : existence, MP4/H.264, 1080x1920, 30 i/s, durée 30-60 s, piste audio AAC non muette, décodage complet sans erreur."""
import json, subprocess, sys, os

def check(p):
    errs = []
    if not os.path.isfile(p) or os.path.getsize(p) < 100000: return ['fichier absent ou vide']
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', p], capture_output=True, text=True).stdout or '{}')
    v = next((s for s in j.get('streams', []) if s['codec_type'] == 'video'), None)
    a = next((s for s in j.get('streams', []) if s['codec_type'] == 'audio'), None)
    if 'mp4' not in j.get('format', {}).get('format_name', ''): errs.append('conteneur non MP4')
    if not v: return errs + ['pas de piste vidéo']
    if v['codec_name'] != 'h264': errs.append('codec vidéo ' + v['codec_name'])
    if (v['width'], v['height']) != (1080, 1920): errs.append(f"résolution {v['width']}x{v['height']}")
    if v.get('sample_aspect_ratio', '1:1') not in ('1:1', '0:1'): errs.append('pixels non carrés')
    if v['r_frame_rate'] != '30/1': errs.append('fréquence ' + v['r_frame_rate'])
    if v.get('pix_fmt') != 'yuv420p': errs.append('format de pixel ' + str(v.get('pix_fmt')))
    d = float(j['format']['duration'])
    if not 30 <= d <= 60: errs.append(f'durée {d:.2f} s')
    if not a: errs.append('pas de piste audio')
    else:
        if a['codec_name'] != 'aac': errs.append('codec audio ' + a['codec_name'])
        r = subprocess.run(['ffmpeg', '-v', 'info', '-i', p, '-map', '0:a', '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
        mean = next((float(l.split('mean_volume:')[1].split('dB')[0]) for l in r.splitlines() if 'mean_volume' in l), -99)
        if mean < -35: errs.append(f'son trop faible ou muet ({mean} dB)')
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'null', '-'], capture_output=True, text=True).stderr.strip()
    if r: errs.append('erreurs de décodage : ' + r[:120])
    print(f"{'OK ' if not errs else 'ÉCHEC'}  {os.path.basename(p)}  {v['width']}x{v['height']}  {v['r_frame_rate']} i/s  {d:.1f} s  {os.path.getsize(p) / 1e6:.1f} Mo  {v['codec_name']}+{a['codec_name'] if a else '-'}" + ('  -> ' + ' ; '.join(errs) if errs else ''))
    return errs

bad = sum(bool(check(p)) for p in sys.argv[1:])
sys.exit(1 if bad else 0)
