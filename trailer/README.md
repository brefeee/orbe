# ORBE — bande-annonce

Bande-annonce de 3 min 08 qui présente ORBE dans son ensemble : la carte de connaissances, l'intelligence artificielle, le réseau social et l'écosystème. Tout est généré dans ce dossier (images 3D, musique, narration), sans capture d'écran.

## Déroulé et statut de chaque fonction

Chaque scène affiche en haut à gauche son chapitre et un statut : **Disponible aujourd'hui** (présent dans le code d'ORBE) ou **En développement** (prévu, pas encore livré). La narration parle au futur de ce qui est en développement.

| Chapitre | Ce qui est montré | Statut |
|---|---|---|
| Ouverture | Des fragments d'information éparpillés, puis un point qui devient une galaxie de connaissances | — |
| 01 · La carte | Connaissances en points, relations nommées (ex. Terre — satellite de — Lune), navigation Dossier / Tout voir, recherche dont le chemin s'illumine | Disponible |
| | Sources, images, schémas, fiabilité et historique ; lieux GeoNames et 1 811 709 771 objets du catalogue ESA Gaia DR3 | Disponible |
| | Partage des connaissances non personnelles avec d'autres utilisateurs | En développement |
| 02 · L'intelligence | Plusieurs IA connectées (Claude, ChatGPT, Gemini, Le Chat, DeepSeek, Grok, Perplexity) ; l'une reformule la demande, une autre fait le travail, une troisième crée les images | Disponible |
| | La carte comme mémoire des IA : elles la lisent, la complètent, et leurs ajouts sont visibles | Disponible |
| | Agents et sous-agents ; missions attribuées selon les capacités ; vérification | En développement |
| | Contrôle de l'ordinateur avec accord, étape par étape | En développement |
| | Création de vidéos ; voix naturelle pour parler avec ORBE | En développement |
| 03 · Le réseau | Réseau social : publier, réagir, commenter, amis, messages privés, communautés, flux de découverte, création collective | En développement |
| 04 · L'écosystème | Connexions aux applications et services, automatisations, gestion des accès | En développement |
| | Données personnelles chiffrées sur l'ordinateur ; rien ne devient public sans décision | Disponible |
| Révélation | Emblème d'ORBE, « Tout ce que tu sais, en un seul point. », sortie le 1er décembre 2026 | — |

Sources dans le code pour les fonctions disponibles : carte et relations (`app/orbe_store.py`, `app/public/scene.js`), recherche et chemin (`search`, `trace`), sources, fiabilité et historique (`app/orbe_db.py`), atlas et Gaia (`app/orbe_remote.py`, `app/orbe_gaia.py`), IA connectées et répartition (`app/orbe_relay.py`), mémoire via MCP (`app/mcp_server.py`), chiffrement local (`app/orbe_db.py`, SQLCipher). La date de sortie a été communiquée par le créateur d'ORBE.

Pour changer un statut (par exemple quand le réseau social sera livré), il suffit de modifier `status` dans `script.json`, d'ajuster la phrase concernée, puis de relancer la fabrication.

## Fabrication

| Élément | Outil | Fichier |
|---|---|---|
| Narration | Voix neuronale Kokoro-82M, voix féminine française « ff_siwis », exécutée en local. Chaque phrase est générée séparément, contrôlée (débit, silences internes), égalisée en volume, puis placée automatiquement sur la ligne de temps. | `script.json`, `audio/narration.py` → `scene/cues.json` |
| Musique | Synthèse orchestrale et électronique, un thème par chapitre, calée sur la ligne de temps ; deux silences voulus (avant le point d'origine, avant l'impact final). | `audio/music.py` |
| Images | Three.js (WebGL), rendu image par image et déterministe dans Chromium. Toutes les scènes lisent `cues.json` : si la narration change, le montage suit. | `scene/main.js`, `scene/core.js` |
| Encodage | ffmpeg : H.264 1080p 30 i/s, AAC 48 kHz. | `render/render.cjs`, `render/assemble.sh` |

## Refaire la bande-annonce

```
cd trailer/scene && npm install
pip install kokoro-onnx onnxruntime numpy scipy soundfile
# Modèle de voix dans trailer/build/ : kokoro-q8.onnx (paquet npm kokoro-q8-shards) et voices-fr.npz (voix ff_siwis du paquet npm kokoro-js)
python3 audio/narration.py build build
python3 audio/music.py build
node render/render.cjs 0 <nombre d'images> build/seg/a.mp4     # ou en plusieurs morceaux a, b, c
bash render/assemble.sh
```

## Limites connues

- La voix Kokoro est une vraie voix neuronale, mais d'un niveau inférieur aux services commerciaux (ElevenLabs, Microsoft Azure), injoignables depuis l'environnement de fabrication. On peut remplacer `build/narration.wav` en gardant la ligne de temps.
- La musique est synthétisée : elle évoque un orchestre sans en avoir le grain. Elle peut être remplacée par une musique sous licence sans toucher aux images.
- Ni la voix ni la musique n'ont pu être écoutées pendant la fabrication ; elles ont été contrôlées par mesures. Une écoute humaine reste nécessaire avant diffusion.
