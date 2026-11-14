# ORBE — bande-annonce

Bande-annonce de deux minutes, entièrement générée dans ce dossier : images 3D, musique et narration. Aucune capture de l'ancienne interface n'y figure.

## Déroulé

| Temps | Acte | Image | Narration |
|---|---|---|---|
| 0:00 | I — Le monde actuel | Des fragments de documents dérivent sans lien, puis se dissolvent | « Chaque jour, nous cherchons… » |
| 0:15 | II — L'apparition | Noir et silence, un point d'or s'allume, se divise (Public, Privé), puis une galaxie de connaissances se forme et se relie | « Et si tout partait d'un seul point ? » |
| 0:36 | III — Les capacités | Les familles du savoir ; le ciel de Gaia ; les sources ; l'information qui se range par niveau de fiabilité ; trois IA qui se répartissent le travail ; la coque qui protège le Privé | Faits réels d'ORBE |
| 1:28 | IV — La vision | Services, ordinateur et voix rejoignent le système, annoncés comme une ambition en développement | « Demain, Orbe ira plus loin… » |
| 1:44 | V — La révélation | Impact, emblème d'ORBE, phrase finale, « Bientôt disponible » | « Tout ce que tu sais, en un seul point. » |

## Ce qui est affirmé, et pourquoi

Chaque phrase s'appuie sur la version actuelle d'ORBE (dossier `app/`) :

- **Carte en 3D**, organisée à partir d'un point « Tout », relié à Public et Privé : `app/public/scene.js`, `public_seed.json`.
- **Familles du savoir** affichées (Univers, Matière et énergie, Formes et calcul, Terre, Vivant, Humain et société, Économie, Technique, Arts et loisirs) : ce sont les catégories réelles de `public_seed.json`.
- **1 811 709 771 objets du catalogue ESA Gaia DR3, lus en direct** : `app/orbe_gaia.py` (constante `TOTAL`).
- **Sources** Wikipédia, GeoNames et ESA Gaia : citées dans `README.md` et `server.py`.
- **Fiabilité, origine et historique** de chaque information : `app/orbe_db.py` (niveaux « non vérifié, probable, vérifié, contesté, faux », table d'historique).
- **Plusieurs IA qui travaillent ensemble** : `app/orbe_relay.py` (une IA reformule la demande en objectif, contexte, contraintes et format ; une autre fait le travail ; une troisième crée les images).
- **L'IA lit et complète la carte, et ses ajouts sont visibles** : serveur MCP `app/mcp_server.py`, filtre par auteur dans l'interface.
- **Privé chiffré sur l'ordinateur ; rien de public sans décision** : `app/orbe_db.py` (SQLCipher, clé protégée par Windows).

L'acte IV (services externes, contrôle de l'ordinateur, voix) n'existe pas encore dans ORBE. Il est présenté comme une ambition (« Demain », « Une ambition · en développement »), jamais comme une fonction disponible. « Bientôt disponible » correspond à l'état réel du projet : la version publique n'est pas encore en ligne.

## Fabrication

| Élément | Outil | Fichier |
|---|---|---|
| Narration | Voix neuronale Kokoro-82M, voix féminine française « ff_siwis », exécutée en local (onnxruntime). Chaque phrase est générée séparément, contrôlée (débit, saturation, silences internes), régénérée en cas de défaut, puis placée sur la ligne de temps. | `audio/narration.py`, `script.json` |
| Musique | Synthèse orchestrale et électronique en Python : cordes, chœur, cuivres, cloches, pulsation, percussions, montées, impacts, réverbération par convolution. Calée sur le montage, avec deux silences voulus (avant le point d'or, avant l'impact final). | `audio/music.py` |
| Images | Three.js (WebGL), rendu image par image et de façon déterministe dans Chromium, halo lumineux, étalonnage, grain. | `scene/main.js` |
| Montage et encodage | ffmpeg : H.264 1080p 30 i/s, AAC 48 kHz. | `render/` |

## Refaire la bande-annonce

```
cd trailer/scene && npm install
# Modèle de voix : kokoro-q8.onnx (paquet npm kokoro-q8-shards) et voices-fr.npz (voix ff_siwis du paquet npm kokoro-js), dans trailer/build/
pip install kokoro-onnx onnxruntime numpy scipy soundfile
python3 audio/narration.py build build
python3 audio/music.py build
node render/render.cjs 0 3600 build/video.mp4
ffmpeg -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 256k ORBE-bande-annonce.mp4
```

## Limites connues

- La voix Kokoro est une vraie voix neuronale, mais d'un niveau inférieur aux services commerciaux (ElevenLabs, Microsoft Azure). Ces services n'étaient pas joignables depuis l'environnement de fabrication. Pour remplacer la voix, il suffit de régénérer `build/narration.wav` avec la même ligne de temps (`build/narration.json`).
- La musique est entièrement synthétisée : elle évoque un orchestre sans en avoir le grain. Un compositeur, ou une banque de sons sous licence, peut remplacer `build/music.wav` sans toucher au montage.
- Ni la voix ni la musique n'ont pu être écoutées pendant la fabrication. Elles ont été contrôlées par mesures (niveaux, silences, débit, saturation). Une écoute humaine reste nécessaire avant toute diffusion.
