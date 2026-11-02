"""Connecteur MCP d'Orbe : donne à Claude accès à la carte, via stdio et sans dépendance."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from orbe_db import open_store  # noqa: E402
from orbe_store import Store, StoreError, atlas_search  # noqa: E402

SERVER_INFO = {"name": "orbe", "version": "1.0.0"}
LATEST_PROTOCOL = "2025-06-18"
INSTRUCTIONS = (
    "Orbe est la carte de connaissances 3D partagée entre l'utilisateur et toi. Tout part du point « Tout », "
    "relié à Public (savoirs généraux) et Privé (Moi, Créations, Proches, Ordinateur, Loisirs). Pour économiser des tokens, avance dossier par dossier avec "
    "open_category (par exemple Privé, puis Privé/Créations), ou utilise search si tu sais ce que tu cherches ; "
    "garde get_map pour quand tu as besoin de toute la carte. Avant de chercher une information ailleurs, regarde si "
    "elle est déjà dans Orbe avec search. Si tu en trouves une nouvelle, durable et utile à d'autres IA, ajoute-la avec "
    "ses sources pour éviter de refaire la recherche ; marque-la « non vérifié » tant qu'elle n'a pas été contrôlée, et n'y mets rien de "
    "privé sans que l'utilisateur le demande. Range chaque "
    "information dans la catégorie la plus précise, crée une catégorie seulement si aucune ne convient, et "
    "relie les catégories de dossiers différents avec une fonction courte (par exemple « finance »). "
    "Tes ajouts sont marqués comme venant de Claude. Les catégories s'indiquent par identifiant, chemin "
    "(Privé/Moi) ou nom. N'enregistre pas de mots de passe ni de numéros de carte."
)


def _text(description):
    return {"type": "string", "description": description}


CATEGORY = _text("Catégorie : identifiant, chemin (Privé/Moi) ou nom sans ambiguïté")


def _tool(name, description, props, required=(), read_only=False, destructive=False, call=None):
    return {
        "definition": {
            "name": name,
            "description": description,
            "inputSchema": {"type": "object", "properties": props, "required": list(required),
                            "additionalProperties": False},
            "annotations": {"readOnlyHint": read_only, "destructiveHint": destructive},
        },
        "call": call,
    }


def build_tools(store: Store) -> dict:
    tools = [
        _tool("get_map", "Affiche l'arbre complet des catégories et toutes les connexions. Réponse longue : préfère open_category ou search.", {},
              read_only=True, call=lambda a: store.outline()),
        _tool("open_category", "Ouvre une catégorie : informations, sous-catégories et connexions.",
              {"category": CATEGORY}, ["category"], read_only=True, call=lambda a: store.describe(a["category"])),
        _tool("search", "Cherche un mot dans les noms de catégories et le texte des informations.",
              {"query": _text("Texte à chercher")}, ["query"], read_only=True,
              call=lambda a: store.search(a["query"])),
        _tool("trace_connections", "Liste tout ce qui découle d'une catégorie, de proche en proche.",
              {"category": CATEGORY}, ["category"], read_only=True, call=lambda a: store.trace(a["category"])),
        _tool("read_content", "Lit le code ou le long contenu rattaché à une information (champ content), par tranches.",
              {"content_id": _text("Valeur du champ content de l'information"),
               "offset": {"type": "integer", "description": "Position de départ, 0 par défaut"}},
              ["content_id"], read_only=True,
              call=lambda a: store.read_content_slice(a["content_id"], a.get("offset", 0))),
        _tool("search_atlas", "Cherche un lieu, un astre, un jeu ou un logiciel dans l'atlas public en lecture seule.",
              {"query": _text("Nom à chercher")}, ["query"], read_only=True, call=lambda a: atlas_search(a["query"])),
        _tool("add_info", "Range une information dans une catégorie.",
              {"category": CATEGORY, "text": _text("L'information à ranger")}, ["category", "text"],
              call=lambda a: store.add_entry(a["category"], a["text"], by="claude")),
        _tool("create_category", "Crée une catégorie à l'intérieur d'une autre.",
              {"name": _text("Nom de la nouvelle catégorie"), "parent": CATEGORY}, ["name", "parent"],
              call=lambda a: store.create_category(a["name"], a["parent"], by="claude")),
        _tool("connect", "Relie deux catégories, même de dossiers différents, avec une fonction précise.",
              {"from": CATEGORY, "to": CATEGORY,
               "function": _text("Rôle de la connexion, en quelques mots : finance, inspire, dépend de"),
               "note": _text("Précision facultative")},
              ["from", "to", "function"],
              call=lambda a: store.connect(a["from"], a["to"], a["function"], by="claude", note=a.get("note", ""))),
        _tool("update_category", "Renomme une catégorie ou la déplace dans une autre.",
              {"category": CATEGORY, "name": _text("Nouveau nom"), "parent": CATEGORY}, ["category"],
              call=lambda a: store.update_category(a["category"], by="claude", name=a.get("name"),
                                                   parent=a.get("parent"))),
        _tool("update_info", "Remplace le texte d'une information.",
              {"entry_id": _text("Identifiant de l'information"), "text": _text("Nouveau texte")},
              ["entry_id", "text"], destructive=True,
              call=lambda a: store.update_entry(a["entry_id"], a["text"], by="claude")),
        _tool("delete_info", "Supprime une information.", {"entry_id": _text("Identifiant de l'information")},
              ["entry_id"], destructive=True, call=lambda a: store.delete_entry(a["entry_id"], by="claude")),
        _tool("disconnect", "Retire une connexion.", {"link_id": _text("Identifiant de la connexion")},
              ["link_id"], destructive=True, call=lambda a: store.disconnect(a["link_id"], by="claude")),
        _tool("delete_category", "Supprime une catégorie avec tout son contenu et ses connexions.",
              {"category": CATEGORY}, ["category"], destructive=True,
              call=lambda a: store.delete_category(a["category"], by="claude")),
    ]
    if hasattr(store, "set_entry_details"):
        tools.append(_tool("set_info_details", "Précise une information : titre, description, fiabilité et sources. La fiabilité vaut non vérifié, probable, vérifié, contesté ou faux.",
                           {"entry_id": _text("Identifiant de l'information"), "title": _text("Titre"), "description": _text("Description"),
                            "reliability": _text("Fiabilité"), "sources": {"type": "array", "items": {"type": "string"}, "description": "Sources"}},
                           ["entry_id"], call=lambda a: store.set_entry_details(a["entry_id"], by="claude", title=a.get("title"), description=a.get("description"),
                                                                                reliability=a.get("reliability"), sources=a.get("sources"))))
        tools.append(_tool("search_files", "Cherche un fichier du PC par son nom dans l'inventaire local. Renvoie le chemin, pas le contenu.",
                           {"query": _text("Nom à chercher")}, ["query"], read_only=True, call=lambda a: store.search_files(a["query"])))
        tools.append(_tool("info_history", "Montre l'historique des versions d'une information.", {"entry_id": _text("Identifiant de l'information")},
                           ["entry_id"], read_only=True, call=lambda a: store.history(a["entry_id"])))
    return {t["definition"]["name"]: t for t in tools}


def handle(message: dict, tools: dict):
    method = message.get("method")
    params = message.get("params") or {}
    if method == "initialize":
        return {"protocolVersion": params.get("protocolVersion") or LATEST_PROTOCOL,
                "capabilities": {"tools": {}}, "serverInfo": SERVER_INFO, "instructions": INSTRUCTIONS}
    if method == "ping":
        return {}
    if method == "tools/list":
        return {"tools": [t["definition"] for t in tools.values()]}
    if method == "tools/call":
        tool = tools.get(params.get("name"))
        if not tool:
            return {"content": [{"type": "text", "text": f"Outil inconnu : {params.get('name')}"}], "isError": True}
        try:
            result = tool["call"](params.get("arguments") or {})
        except (StoreError, KeyError) as err:
            text = f"Paramètre manquant : {err}" if isinstance(err, KeyError) else str(err)
            return {"content": [{"type": "text", "text": text}], "isError": True}
        return {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=2)}]}
    raise LookupError(method)


def main():
    tools = build_tools(open_store())
    for raw in sys.stdin.buffer:
        if not raw.strip():
            continue
        try:
            message = json.loads(raw)
        except ValueError:
            reply = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "JSON illisible"}}
        else:
            if "id" not in message:  # notification
                continue
            reply = {"jsonrpc": "2.0", "id": message["id"]}
            try:
                reply["result"] = handle(message, tools)
            except LookupError as err:
                reply["error"] = {"code": -32601, "message": f"Méthode inconnue : {err}"}
        sys.stdout.buffer.write(json.dumps(reply, ensure_ascii=False).encode("utf-8") + b"\n")
        sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
