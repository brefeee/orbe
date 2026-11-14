#!/usr/bin/env bash
# Assemble les segments rendus (à l'image près) et le mixage audio en un seul film.
# a : 0-1199 · p : 480-899 (point d’origine refait) · b : 1200-2399 · c : 2400-3134 · d : 3135-3404 (révélation) · e : 3405-3599 (carton de sortie)
set -euo pipefail
cd "$(dirname "$0")/../build/seg"
OUT=../../ORBE-bande-annonce.mp4
ffmpeg -y -loglevel error -i a.mp4 -i p.mp4 -i b.mp4 -i c.mp4 -i d.mp4 -i e.mp4 -i ../mix.wav -filter_complex "
 [0:v]trim=start_frame=0:end_frame=480,setpts=PTS-STARTPTS[v0];
 [1:v]trim=start_frame=0:end_frame=420,setpts=PTS-STARTPTS[v1];
 [0:v]trim=start_frame=900:end_frame=1200,setpts=PTS-STARTPTS[v2];
 [2:v]trim=start_frame=0:end_frame=1200,setpts=PTS-STARTPTS[v3];
 [3:v]trim=start_frame=0:end_frame=735,setpts=PTS-STARTPTS[v4];
 [4:v]trim=start_frame=0:end_frame=270,setpts=PTS-STARTPTS[v5];
 [5:v]trim=start_frame=0:end_frame=195,setpts=PTS-STARTPTS[v6];
 [v0][v1][v2][v3][v4][v5][v6]concat=n=7:v=1:a=0,format=yuv420p[v]" \
 -map "[v]" -map 6:a -c:v libx264 -preset slow -crf 18 -tune film -r 30 -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 120 "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,nb_frames -of compact "$OUT"
