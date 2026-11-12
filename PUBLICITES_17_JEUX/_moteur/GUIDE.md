# Guide de fabrication d'une publicité (à lire en entier avant de coder)

Tu fabriques UNE publicité vidéo verticale (1080×1920, 30 i/s, 30 à 40 s) pour UN jeu Roblox de Luka.
La vidéo est une animation 3D + textes + musique, calculée image par image par le moteur de ce dossier.

## Ce que tu livres, dans le dossier de ton jeu (`PUBLICITES_17_JEUX/<NN_Nom>/`)

| Fichier | Contenu |
|---|---|
| `projet/ad.js` | Le module de la pub (scènes 3D, textes, repères sonores, musique). C'est le projet modifiable. |
| `script.md` | Le script publicitaire : tableau « temps / plan / texte à l'écran / fonction réelle du jeu montrée / source dans le dossier ». |
| `publication.md` | Le texte de publication conseillé en français (TikTok, Reels, Shorts) : une légende courte, 2 variantes, 6 à 10 hashtags, et le statut du jeu. |
| `ressources/README.md` | Les ressources utilisées : palette (codes couleur), polices, style musical, liste des bruitages, modèles 3D créés. Tout est créé par le code : aucune ressource externe. |

Tu ne lances PAS `build.sh` (le rendu complet dure 10 minutes et sera fait plus tard, à la chaîne). Tu ne fais aucun commit git.
Tu ne modifies rien dans `_moteur/` ni dans le dossier d'un autre jeu. S'il te manque une fonction, écris-la dans ton `ad.js`.

## Vérité avant tout (règles de Luka)

- Lis d'abord les passages du dossier indiqués dans ta mission. Ne montre QUE des fonctions décrites comme existantes
  (« fait », « programmé », « version minimale », « testé »). Rien de ce qui est « reste à faire », « plus tard », « pas encore codé », « futur ».
- Les chiffres affichés (nombre de niveaux, de circuits, de joueurs…) doivent être ceux du dossier. Aucun faux avis, aucun faux
  nombre de joueurs, aucune note, aucune date de sortie, aucun « n° 1 ». Pas de prix en Robux.
- Les images sont des animations créées pour la pub, pas des captures du jeu : n'écris jamais « images du jeu » ou « gameplay réel ».
  L'écran final du moteur affiche tout seul la mention « Animation d'illustration ».
- Statut du jeu (donné dans ta mission) : `public` → « JOUE MAINTENANT / Disponible sur Roblox » ; `bientot` → « BIENTÔT SUR ROBLOX ».
  Ne dis jamais qu'un jeu `bientot` est disponible, jouable ou « ouvert ».
- Pas de logo Roblox, pas de marque réelle, pas de personnage ou de musique d'un jeu existant. Pas de corps humain réaliste
  (les personnages en blocs du moteur conviennent). Contenu adapté aux enfants.
- Si une information manque, cherche dans le dossier (Grep) avant de supposer. Si elle n'existe pas, reste général plutôt que d'inventer,
  et signale-le dans ton compte rendu final.

## Structure attendue de la pub

- Durée : 30 à 40 s (vise 32 à 38 s), de préférence un nombre entier de mesures (une mesure = 240 / bpm secondes) ; cale les changements de plan sur les débuts de mesure.
- **Accroche dans les 2 premières secondes** : de l'action à l'écran dès la première image (jamais d'écran noir ou vide), et une phrase choc ou une question.
- 5 à 8 plans de 3 à 5 s. Chaque plan montre UNE mécanique réelle du jeu, avec un texte court (2 à 6 mots). Aucun temps mort.
- Une transition entre chaque plan (`flash`, `wipe`, coupe sur un impact sonore, mouvement de caméra).
- Un moment fort vers les deux tiers (victoire, boss, record…).
- **Écran final d'au moins 4 s** avec `endCard()` (titre du jeu, phrase d'accroche, bouton selon le statut) sur un fond animé à toi.
- Identité propre : ta palette, ta police de titre, ton style de musique (imposés dans ta mission pour que les 17 pubs soient différentes),
  et surtout tes modèles 3D : construis avec soin les objets emblématiques du jeu à partir des formes du moteur.

## Textes

- Français simple, tutoiement, accents corrects (É, È, À, Ç). Majuscules pour les titres.
- Tout texte doit tenir dans la zone sûre `SAFE` (x de 70 à 1010, y de 210 à 1540). Taille minimale 44 px ; sous-titres 70 à 110 px.
- `caption()` et `text()` réduisent tout seuls un texte trop large, mais vérifie sur les images que rien n'est coupé ni superposé.
- Un seul message à la fois à l'écran (plus un éventuel petit affichage type score en haut).

## Technique (voir `_moteur/kit.js`, tout y est commenté, et `_exemple/projet/ad.js` comme modèle)

- `render(t)` doit dessiner l'instant `t` sans mémoire : aucune variable qui s'accumule d'une image à l'autre, pas de `Math.random()`
  (utilise `hash(n)`), pas d'horloge. Toute position est une fonction de `t`. Le rendu est fait en parallèle et dans le désordre.
- Construis tous les objets 3D UNE fois au chargement du module ; dans `render(t)`, change seulement positions, rotations, visibilité.
  Ne crée jamais de géométrie, de matériau ou de texture dans `render`. Utilise des groupes par plan et `showOnly()`.
- Ordre de dessin : fond 2D (`bg`) → `draw3D(scene, camera)` → effets 2D → textes → transitions.
- Les bruitages se déclarent une fois avec `cue(t, nom)` au chargement (pas dans `render`). Mets-en sur chaque coupe et chaque action visible (15 à 40 au total).
- La musique se règle dans `registerAd({ music })` : `style` imposé, `sections` calées sur tes plans, `end` = début de l'écran final
  ou un peu après. Tu peux ajuster `bpm`, `root`, `prog`, les motifs (voir l'en-tête de `_moteur/audio.py`).
- Cadrage portrait : le cadre est étroit. Le personnage du moteur mesure 5,2 unités ; à 22 unités de distance avec un angle de 42°,
  on voit environ 9 unités de large et 16 de haut. Garde le sujet au centre, entre 25 % et 70 % de la hauteur de l'image.
- Performances : moins de 1 500 objets visibles, un seul soleil avec ombres (`addLights`), pas d'autres lumières à ombres.
  Le métal est plafonné (pas de reflets d'ambiance) : pour un objet doré ou brillant, prends une couleur vive, `rough` bas et un peu d'`emissive`. N'utilise pas `MeshPhysicalMaterial`, ni `scene.environment`, ni de lumières supplémentaires à ombres : le rendu deviendrait trois fois plus lent. Pour répéter beaucoup d'objets identiques, utilise `THREE.InstancedMesh`.
- Le rendu est fait par un moteur logiciel : les shaders personnalisés complexes sont à éviter.

## Vérifier ton travail (obligatoire)

Depuis `PUBLICITES_17_JEUX/` :

```bash
node _moteur/render.js <NN_Nom> --sheet=24                 # planche de 24 vignettes -> <NN_Nom>/projet/build/planche.jpg
node _moteur/render.js <NN_Nom> --sheet --times=0,0.5,1,2  # planche à des instants choisis
node _moteur/render.js <NN_Nom> --times=1.2,30.5           # images pleine taille -> projet/build/t_1.20.jpg
python3 _moteur/audio.py <NN_Nom>/projet/build/cues.json <NN_Nom>/projet/build/audio.wav   # vérifie que la bande-son se génère
```

Regarde les images avec l'outil Read. À chaque passe, contrôle :
1. le sujet est visible, entier, bien éclairé, pas caché par un texte ; aucun plan vide ou raté ;
2. les textes sont lisibles, sans chevauchement, dans la zone sûre ;
3. les plans sont variés (décors, angles, couleurs) et on comprend le jeu sans le son ;
4. la première image (t = 0) est déjà intéressante ; l'écran final est propre.

Fais au moins 3 passes « planche → corrections ». Regarde aussi 3 images pleine taille (accroche, un sous-titre, écran final).
Toute erreur affichée par `render.js` (« ERREUR PAGE ») doit être corrigée.

## Compte rendu final (court)

Durée, liste des plans avec la fonction réelle montrée, statut utilisé, points du dossier restés incertains, limites connues.
