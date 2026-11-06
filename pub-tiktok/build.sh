#!/usr/bin/env bash
# Produit out/pub_tiktok_echecs.mp4 (1080x1920, 30 i/s, H.264 + AAC, ~28 s).
# Option : CONFIG=config.json ./build.sh   (ex. {"gameName":"Mon Jeu"})
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build/frames out
rm -f build/frames/*.jpg
node render.js build/frames --workers=${WORKERS:-3} ${CONFIG:+--config=$CONFIG}
python3 audio.py build/cues.json build/audio.wav
ffmpeg -v error -y -framerate 30 -i build/frames/f_%05d.jpg -i build/audio.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.2 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 44100 \
  -shortest -movflags +faststart out/pub_tiktok_echecs.mp4
ffmpeg -v error -y -ss 8.4 -i out/pub_tiktok_echecs.mp4 -frames:v 1 out/miniature.jpg
echo "OK -> out/pub_tiktok_echecs.mp4"
