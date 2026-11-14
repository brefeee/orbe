# ORBE 2 — état des lieux et architecture

## 1. Ce qui existait (version 1.0.1, dossiers `app/` et `launcher/`)

| Élément | Réalité constatée |
|---|---|
| Nature | Un serveur Python local (`app/server.py`, bibliothèque standard) qui sert trois pages web séparées (`/`, `/carte`, `/ia`) ouvertes dans une fenêtre Edge « --app ». Ce n'est pas une application : c'est un site local. |
| Données | Une carte par ordinateur, dans une base SQLCipher locale. Un seul utilisateur, aucun compte. |
| Comptes | L'interface appelle `/api/auth/*`, `/api/me/*`, `/api/public/*`, `/api/admin/*` : **ce serveur « public » n'est pas dans le dépôt**. La connexion n'a donc jamais fonctionné dans la version distribuée. |
| IA | `orbe_relay.py` enchaîne réellement des fournisseurs (reformuler → exécuter → image) avec les clés de l'utilisateur. Pas de conversation sauvegardée, pas de suivi de tâches, pas de voix. |
| Fichiers | `orbe_files.py` ne fait qu'un **inventaire** (nom, taille, date). Le contenu n'est jamais lu : aucune connaissance n'en est extraite. |
| Réseau social, recherche globale, profil | Inexistants. |
| Données personnelles | Le dépôt et `public_seed.json` ne contiennent pas de données privées (vérifié : 180 catégories publiques, 3 liens). Les informations personnelles signalées vivent dans la base locale du créateur, hors dépôt. Le risque venait de l'absence totale de séparation entre comptes. |
| Distribution | Un lanceur Tkinter/PyInstaller qui télécharge un zip (Python embarqué + pages). |

Ces dossiers sont **conservés tels quels** (rien n'est supprimé) le temps que leurs données publiques — l'atlas GeoNames/Wikipédia/Gaia — soient reprises dans ORBE 2.

## 2. Architecture cible

```
┌────────────────────────── Application ORBE (Tauri 2) ──────────────────────────┐
│  client/   interface unique React : accueil, 5 espaces, navigation interne     │
│  desktop/  coque native : fenêtre, accès aux fichiers autorisés, mises à jour  │
└──────────────────────────────────┬─────────────────────────────────────────────┘
                     HTTPS + WebSocket (jeton de session)
┌──────────────────────────────────▼─────────────────────────────────────────────┐
│  server/   Node 22 + Fastify + SQLite (WAL, FTS5)                              │
│  core · carte · reseau · ia · recherche  — un dossier par module               │
│  Permissions appliquées dans les requêtes SQL, secrets chiffrés (AES‑256‑GCM)  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Pourquoi Tauri 2 plutôt qu'Electron** : un seul projet produit Windows, macOS, Linux, **Android et iOS** (Electron n'a pas de version mobile) ; l'installateur pèse quelques Mo car il utilise le moteur web du système ; le système de mise à jour signé est intégré ; l'accès au disque passe par des permissions déclarées, ce qui convient à un logiciel qui lit les fichiers de l'utilisateur.

**Pourquoi un serveur** : comptes, réseau social, partage et synchronisation exigent un point central. Local = fichiers de l'ordinateur (jamais envoyés en entier : seul le texte extrait des fichiers autorisés part à l'analyse), préférences d'affichage, jeton de session. Distant = compte, carte, conversations, réseau, clés d'IA chiffrées.

**Pourquoi SQLite pour démarrer** : un seul fichier, une seule image Docker, aucune administration. Tout l'accès passe par `server/src/db.ts` ; le passage à PostgreSQL se fera à cet endroit quand la charge le demandera (au-delà de quelques milliers d'utilisateurs actifs simultanés).

## 3. Règles communes (à respecter dans tout nouveau code)

### Serveur
- Un module = `server/src/modules/<nom>/index.ts` exportant un `OrbeModule` (`context.ts`). Il est chargé automatiquement. Ses tables portent son préfixe (`carte_…`, `reseau_…`, `ia_…`).
- Un module ne lit **jamais** les tables d'un autre module, sauf `users` (via `modules/core/users.ts`). Il passe par `ctx.registry` (`registry.ts`) : `searchProviders`, `aiTools`, `social`, `accountDeleteHooks`, `exporters`, `mediaAccess`.
- Toute route commence par `const user = ctx.requireUser(req)` et **filtre par `user.id` dans le SQL**. Une ressource d'autrui inaccessible répond 404, pas 403 (on ne révèle pas son existence).
- Erreurs : `throw` d'un `HttpError` (`errors.ts`), message en français lisible par l'utilisateur. Validation avec `str`, `int`, `oneOf`, `obj`.
- TypeScript exécuté directement par Node (suppression des types) : pas d'`enum`, pas de propriétés de paramètre, imports avec l'extension `.ts`.
- Temps réel : `ctx.hub.send(userId, { type: 'module.evenement', … })`. Notifications persistantes : `ctx.notify(userId, type, data)`.
- Secrets d'utilisateur : `seal(ctx.config.secretKey, valeur)` avant stockage ; jamais dans une réponse, jamais dans un journal.
- Médias : envoi par `POST /api/media`, puis `attachMedia(ctx, id, ownerId, scopeType, scopeId)` (`modules/core/media.ts`) et un contrôle `ctx.registry.mediaAccess[scopeType]`.
- Tests : `server/src/modules/<nom>/<nom>.test.ts` avec `test/helpers.ts` (`startTestApp`, `signup`). Chaque module prouve qu'un utilisateur B ne peut ni lire ni modifier les données de A, y compris via la recherche.

### Client
- Un espace = `client/src/spaces/<nom>/` (export par défaut = composant routé sous `/<nom>/*`). Il n'importe rien d'un autre espace ; pour y renvoyer, il navigue vers sa route.
- Composants et styles communs : `@/ui/index.tsx`, variables de `styles/tokens.css` (aucune couleur en dur). Icônes : `lucide-react`.
- Appels : `api` (`@/lib/api.ts`), temps réel : `realtime` (`@/lib/realtime.ts`), compte : `useMe()`.
- Textes : `registerMessages('<nom>', { fr, en, es })` puis `t('<nom>.cle')` — les trois langues sont fournies.
- Aucune donnée d'exemple : un écran sans données affiche un état vide qui explique quoi faire.
- Tout bouton visible fonctionne. Ce qui dépend d'un service non configuré est affiché comme « non configuré » avec l'explication, jamais simulé.

### Routes internes réservées (liens entre espaces et résultats de recherche)
`/ia/c/:conversationId` · `/carte/n/:nodeId` · `/carte/partages` · `/reseau/u/:handle` · `/reseau/s/:serverId` · `/reseau/s/:serverId/:channelId` · `/reseau/mp/:userId` · `/reseau/p/:postId` · `/profil/parametres` · `/profil/connexions`

## 4. Lancer et vérifier
```
cd server && npm install && npm test          # tests du serveur
cd client && npm install && npm run build     # interface
cd server && ORBE_WEB_DIR=../client/dist npm start   # http://127.0.0.1:4780
cd e2e && node shell.e2e.mjs                  # parcours réel dans un navigateur
```
