#!/usr/bin/env bash
# Assemble les trois segments rendus et le mixage audio en un seul film.
set -euo pipefail
cd "$(dirname "$0")/../build/seg"
OUT=../../ORBE-bande-annonce.mp4
DUR=$(python3 -c "import json; print(json.load(open('../narration.json'))['duration'])")
printf "file 'a.mp4'\nfile 'b.mp4'\nfile 'c.mp4'\n" > list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -i ../mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -tune film -r 30 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t "$DUR" "$OUT"
ffmpeg -y -loglevel error -i "$OUT" -c:v libx264 -preset slow -crf 24 -tune film -c:a copy -movflags +faststart ../../ORBE-bande-annonce-web.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,nb_frames -of compact "$OUT"
