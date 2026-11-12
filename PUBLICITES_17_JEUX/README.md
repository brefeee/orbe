# Publicités des 17 jeux

17 vidéos verticales (1080×1920, 30 i/s, MP4 H.264 + son AAC, 34 à 38 s), une par jeu.
Les MP4 sont à la racine de ce dossier et aussi dans le dossier de chaque jeu.

| N° | Fichier | Statut utilisé dans la pub |
|---|---|---|
| 01 | 01_Simulator_de_Simulator.mp4 | Bientôt sur Roblox |
| 02 | 02_Coinverse.mp4 | Joue maintenant |
| 03 | 03_Echecs_Royaux.mp4 | Joue maintenant |
| 04 | 04_Simulateur_Autoroute.mp4 | Joue maintenant |
| 05 | 05_Gym.mp4 | Joue maintenant |
| 06 | 06_Raft_Crew.mp4 | Bientôt sur Roblox |
| 07 | 07_Backyard_Defenders.mp4 | Bientôt sur Roblox |
| 08 | 08_Tumble_Tower.mp4 | Bientôt sur Roblox |
| 09 | 09_Who_Ate_the_Cake.mp4 | Bientôt sur Roblox |
| 10 | 10_Tiny_Town_Life.mp4 | Bientôt sur Roblox |
| 11 | 11_Sky_Sprouts.mp4 | Bientôt sur Roblox |
| 12 | 12_Chaos_Cafe.mp4 | Bientôt sur Roblox |
| 13 | 13_Snail_Rally.mp4 | Bientôt sur Roblox |
| 14 | 14_Costume_Clash.mp4 | Bientôt sur Roblox |
| 15 | 15_Beat_Bounce.mp4 | Bientôt sur Roblox |
| 16 | 16_Bumper_Ball_Arena.mp4 | Bientôt sur Roblox |
| 17 | 17_Lights_Out_Mansion.mp4 | Bientôt sur Roblox |

## Dans chaque dossier de jeu

- `<nom>.mp4` : la vidéo finale
- `miniature.jpg` : la miniature verticale
- `projet/ad.js` : le projet modifiable
- `script.md` : le script de la pub
- `publication.md` : le texte de publication conseillé
- `ressources/README.md` : couleurs, polices, musique, bruitages

## Important

- Les images sont des animations d'illustration créées pour la pub, pas des captures du jeu. La mention est affichée à la fin de chaque vidéo.
- Les chiffres des compteurs à l'écran (argent, score…) sont des exemples.
- Rien n'a été publié. Aucune campagne, aucun Robux dépensé.

## Refaire une vidéo

```bash
bash _moteur/build.sh 05_Gym                 # rendu + son + encodage + contrôle
python3 _moteur/controle.py *.mp4            # contrôle qualité seul
```
