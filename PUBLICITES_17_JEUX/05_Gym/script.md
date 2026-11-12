# Script : SIMULATOR DE SALLE DE MUSCULATION (GYM)

- **Durée** : 35,6 s (19 mesures à 128 bpm, une mesure = 1,875 s)
- **Statut** : `public`. Fin : « JOUE MAINTENANT / Disponible sur Roblox ».
- **Concept** : tu gères ta salle de sport et tu t'entraînes : machines à fusionner, clients qui paient, corps de plus en plus musclés, rolls d'auras, rebirth, 12 joueurs par serveur. Machines et personnages en blocs, ambiance sombre et vert citron.
- **Police** : Anton (+ Inter). **Moment fort** : le rebirth à 23,4 s.

| Temps | Plan (ce qu'on voit) | Texte à l'écran | Fonction réelle du jeu montrée |
|---|---|---|---|
| 0,0 à 1,9 s | Un personnage maigre et apeuré devant une barre lourde | « MAIGRE AUJOURD'HUI… » ; « Trop lourd ? » | Accroche (aucune fonction précise) |
| 1,9 à 3,8 s | Le personnage gonfle en un instant, ambiance de salle | « ÉNORME DEMAIN ? » ; « TA SALLE. TES MUSCLES. » | Tu gères ta salle et tu gagnes du muscle (l.1619, l.1813) |
| 3,8 à 7,5 s | Le héros s'entraîne sur une machine, étiquette au-dessus | Étiquette « GAIN PAR RÉPÉTITION +1 MUSCLE » ; bouton « S'ENTRAÎNER » ; « ENTRAÎNE-TOI » | Bouton « S'entraîner » et muscle gagné par répétition (l.1619, l.1620) |
| 7,5 à 11,3 s | Deux machines identiques fusionnent, la qualité monte de ROUILLÉ à MYTHIQUE | « FUSIONNE… » ; « …ET AMÉLIORE ! » ; « 30 QUALITÉS DE MACHINES » | Fusion d'objets identiques, 30 qualités (l.1788, l.1814) |
| 11,3 à 15,0 s | Des clients arrivent et paient à l'entrée, compteur de clients | Pastille « CLIENTS n » ; « ATTIRE DES CLIENTS » ; « TU FIXES LE PRIX D'ENTRÉE » | Clients qui paient un prix d'entrée que tu fixes (l.1623, l.1815) |
| 15,0 à 18,8 s | Le héros passe de corps en corps, de plus en plus musclé | Pastille « CORPS n » ; « REMPLIS TES MUSCLES » ; « DEVIENS ÉNORME » | Corps suivant en remplissant les muscles (l.1816) |
| 18,8 à 22,5 s | Podium avec auras animées (flammes, cristaux, étoiles), roll | Pastille « ROLL… », « NOUVELLE AURA ! », « AURA RARE ! » ; « TENTE TON ROLL » ; « 12 AURAS À COLLECTIONNER » | Rolls d'auras, 12 auras (l.1954, l.1971) |
| 22,5 à 26,3 s | Bouton REBIRTH pressé, éclair, confettis (moment fort à 23,4 s) | « REBIRTH » ; « Prêt ? » ; « REBIRTH ! » ; « ARGENT ▲ » ; « MUSCLE ▲ » ; « BONUS PERMANENT » ; « Tu gardes tes muscles » | Rebirth : remise à zéro de l'argent et de la salle, bonus permanents d'argent et de muscle, muscles conservés (l.1625, l.1817) |
| 26,3 à 30,0 s | 12 salles vues d'en haut, chacune avec son joueur | « 12 JOUEURS PAR SERVEUR » ; « CHACUN SA SALLE » ; « JOUABLE À LA MANETTE » | 12 joueurs max, chacun sa salle (l.1626) ; manette publiée le 05/11 (l.1994) |
| 30,0 à 35,6 s | Écran final | « SIMULATOR DE SALLE DE MUSCULATION » ; « Entraîne-toi. Gère ta salle. Deviens énorme. » ; « JOUE MAINTENANT / Disponible sur Roblox » | Titre du jeu |

**Musique** : style `workout`, 128 bpm ; sections build, drop, break, drop2, drop (avec un silence juste avant le clic du rebirth).
**Appel à l'action** : « JOUE MAINTENANT », « Disponible sur Roblox » (recherche : Simulator de salle de musculation).

## Points à nuancer (vérification du 12/11/2026)
- « +1 MUSCLE » (étiquette de la machine) : le gain varie selon la qualité de la machine (l.1620), la valeur « +1 » n'est pas donnée. Illustratif.
- « JOUABLE À LA MANETTE » : publié le 05/11 mais « non vérifié avec une vraie manette » (l.1996) ; l'option Console n'est pas confirmée (l.38).
- Qualités de machines affichées de ROUILLÉ à MYTHIQUE (8 noms, l.1621) alors que le jeu en compte 30 (l.1814).
- Nombre de corps (50 aujourd'hui, objectif 150, l.1816) : la vidéo n'affiche que des petits numéros.
