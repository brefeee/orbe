# Orbe

Créé par **brefeee**.

Tout ce que tu sais, sur une seule carte en 3D. Orbe part d'un point « Tout », relié à Public (les savoirs généraux) et Privé (tes informations). L'application tourne sur ton PC, sur `127.0.0.1` uniquement, et une IA peut lire et compléter la carte grâce à son serveur MCP.

## Lancer

Sous Windows, avec Python :

```bash
python -m venv venv
venv\Scripts\pip install -r app\requirements.txt
cd app
..\venv\Scripts\python server.py --port 4747
```

Puis ouvre http://127.0.0.1:4747.

## Contenu

- `app/` : le site local, le stockage et le serveur MCP (`mcp_server.py`).
- `launcher/` : la construction du launcher Windows et la mise en ligne.

L'atlas (environ 2 Go) n'est pas dans ce dépôt, et aucune donnée personnelle non plus.

## Sources

Lieux : GeoNames (CC BY 4.0). Titres : Wikipédia, Wikidata et catalogues ouverts.
