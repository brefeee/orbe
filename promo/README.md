# Film promotionnel ORBE — NITRO · VORTEX · APETZ

`orbe-modeles-ia.mp4` : 60 s, 1920×1080, 30 i/s, musique originale synthétisée.

Régénérer :

    python3 extract_logo.py <image-du-logo>   # logo-mark.png + dots.js
    python3 music.py                          # build/music.wav
    node render.js 30 0 60                    # build/frames/*.jpg
    ffmpeg -framerate 30 -i build/frames/f%05d.jpg -i build/music.wav -c:v libx264 -preset slow -crf 21 \
           -pix_fmt yuv420p -c:a aac -b:a 224k -movflags +faststart -t 60 orbe-modeles-ia.mp4

`film.html` s'ouvre aussi directement dans un navigateur pour un aperçu en direct (sans le son).
