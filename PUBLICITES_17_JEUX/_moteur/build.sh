#!/usr/bin/env bash
# Fabrique la vidéo finale d'un jeu :  _moteur/build.sh <dossier_du_jeu>
#   -> <dossier>/<dossier>.mp4 (1080x1920, 30 i/s, H.264 + AAC), <dossier>/miniature.jpg, copie du MP4 à la racine.
# SKIP_RENDER=1 pour refaire seulement le son et l'encodage.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="$(basename "$1")"; DIR="$ROOT/$NAME"; B="$DIR/projet/build"
mkdir -p "$B/frames"
if [ -z "${SKIP_RENDER:-}" ]; then
  rm -f "$B"/frames/*.jpg
  node "$ROOT/_moteur/render.js" "$DIR" --workers="${WORKERS:-4}"
fi
python3 "$ROOT/_moteur/audio.py" "$B/cues.json" "$B/audio.wav"
DUR=$(python3 -c "import json;print(json.load(open('$B/cues.json'))['duration'])")
TH=$(python3 -c "import json;print(json.load(open('$B/cues.json'))['thumbTime'])")
ffmpeg -v error -y -framerate 30 -i "$B/frames/f_%05d.jpg" -i "$B/audio.wav" -t "$DUR" \
  -c:v libx264 -preset medium -crf 19 -maxrate 9M -bufsize 18M -pix_fmt yuv420p -profile:v high -level 4.1 -r 30 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 44100 -ac 2 \
  -movflags +faststart "$DIR/$NAME.mp4"
FR=$(python3 -c "print(round($TH*30))")
cp "$B/frames/f_$(printf %05d "$FR").jpg" "$DIR/miniature.jpg"
cp "$DIR/$NAME.mp4" "$ROOT/$NAME.mp4"
python3 "$ROOT/_moteur/controle.py" "$DIR/$NAME.mp4"
