# Publicité TikTok — jeu d'échecs

Vidéo finale : **`out/pub_tiktok_echecs.mp4`**. Elle est en 1080×1920 (9:16), dure 28 s et tourne à 30 i/s. Codage : H.264 + AAC, avec un volume normalisé à −14 LUFS.

## Déroulé

| Temps | Scène | Fonctionnalité montrée |
|---|---|---|
| 0–3 s | « Tu te crois imbattable aux échecs ? » puis une dame tombe du ciel avec une onde de choc : « PROUVE-LE. » | Accroche |
| 3–9 s | Mat de Philidor joué coup par coup en 3D (Db3+ Rh8 Cf7+ Rg8 Ch6++ Rh8 Dg8+!! Txg8 Cf7#), avec les bulles « ÉCHEC ! », le sacrifice de la dame et « ÉCHEC ET MAT » | Parties contre de vrais joueurs |
| 9–11,5 s | Tableau à 8 joueurs, avec « TOI » qui devient champion. Le finaliste reçoit une médaille « 2e » et n'est pas marqué comme perdant | Tournois à élimination directe |
| 11,5–13,5 s | Le joueur passe de #48 à #1, puis « Une défaite ? Ton rang ne bouge pas » | Classement, et le rang est conservé en cas de défaite |
| 13,5–15,5 s | 4 parties « EN DIRECT » | Regarder les parties des autres en direct |
| 15,5–18,5 s | Le robot passe de FACILE à CAUCHEMAR. Les niveaux intermédiaires ne sont ni nommés ni comptés | Bots à plusieurs niveaux |
| 18,5–21 s | Pièces d'or et compteur, « selon tes performances » | Monnaie et récompenses |
| 21–23 s | Pièces dorées, « Achats facultatifs en Robux » | Objets exclusifs |
| 23–28 s | « À TOI DE JOUER », bouton « JOUE MAINTENANT », « Disponible sur Roblox », « Lien en bio » | Appel à l'action |

Les visuels sont créés de toutes pièces : le dépôt ne contient aucune capture du jeu. La musique et les bruitages sont synthétisés par `audio.py`, donc aucun son n'est soumis à une licence.

## Régénérer

Prérequis : Node et Playwright avec Chromium, Python 3 et numpy, ffmpeg.

```bash
./build.sh                                   # ~10-15 min
echo '{"gameName":"Nom du jeu"}' > cfg.json
CONFIG=cfg.json ./build.sh                   # ajoute le nom du jeu sur l'écran final
node render.js /tmp/apercu --times=4.2,8.5   # quelques images d'aperçu
```

Options de `cfg.json` : `gameName` (texte), `platform` (« Roblox » par défaut), `linkInBio` (true/false).

- `src/ad.js` : scènes 3D (three.js), interface, sous-titres, transitions et repères sonores.
- `render.js` : rendu image par image dans Chromium sans affichage.
- `audio.py` : musique trap/phonk à 120 BPM et effets calés sur les repères.

Police Inter (licence OFL, voir `src/fonts/LICENSE-Inter.txt`), three.js (licence MIT).
