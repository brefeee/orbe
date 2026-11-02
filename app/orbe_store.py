"""Stockage d'Orbe : un fichier JSON partagé entre l'application et le connecteur Claude."""
from __future__ import annotations

import contextlib
import hashlib
import json
import mmap
import os
import re
import shutil
import sqlite3
import tempfile
import time
import unicodedata
import uuid
from datetime import datetime, timezone
from pathlib import Path

from orbe_gaia import search as gaia_search
from orbe_remote import remote_search

AUTHORS ={"user", "claude"}
MAX_NAME = 80
MAX_FN = 60
MAX_TEXT = 20000


class StoreError(Exception):
    """Erreur destinée à être affichée telle quelle à l'utilisateur ou à Claude."""


def default_data_path() -> Path:
    env = os.environ.get("ORBE_DATA")
    return Path(env) if env else Path.home() / ".orbe" / "orbe.json"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _norm(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).casefold().strip()


def _clean(value, label: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise StoreError(f"{label} : ce champ ne peut pas être vide.")
    value = value.strip()
    if len(value) > limit:
        raise StoreError(f"{label} : {limit} caractères au maximum.")
    return value


def _seed() -> dict:
    # Une nouvelle installation part de la carte publique, avec ses accès à l'atlas.
    public = Path(__file__).resolve().parent / "public_seed.json"
    if public.exists():
        return json.loads(public.read_text(encoding="utf-8"))
    now = _now()

    def node(name, parent=None, color=None):
        return {"id": _new_id(), "name": name, "parentId": parent, "color": color, "author": "user",
                "createdAt": now, "updatedAt": now, "entries": []}

    root = node("Tout", color="#F4F1DE")
    branches = [("Public", "#7FD1FF"), ("Privé", "#FF8FA3")]
    return {"version": 1, "rev": 1, "lastChange": None,
            "nodes": [root] + [node(name, root["id"], color) for name, color in branches], "links": []}


def _scan_index(path: Path, wanted: str, cap: int = 2000):
    """Parcourt un index sans le décoder entier. Le nom exact et les noms qui commencent par le texte passent
    avant la limite : sinon un mot courant ferait disparaître le point exact, s'il est loin dans le fichier."""
    words = re.findall(r"\w+", wanted)
    needles = [(b"\n" + wanted.encode("utf-8") + b"\t", 1 << 20), (b"\n" + wanted.encode("utf-8"), cap)]
    if len(wanted) >= 2 and words:
        needles.append((max(words, key=len).encode("utf-8"), cap))
    seen = set()
    with open(path, "rb") as handle, mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
        for needle, limit in needles:
            position, found = 0, 0
            if needle[:1] == b"\n" and data[:len(needle) - 1] == needle[1:]:
                position = -1  # la première ligne n'a pas de saut de ligne devant elle
            while found < limit:
                hit = 0 if position < 0 else data.find(needle, position)
                if hit < 0:
                    break
                start = 0 if position < 0 else data.rfind(b"\n", 0, hit + (needle[:1] == b"\n")) + 1
                end = data.find(b"\n", start)
                end = len(data) if end < 0 else end
                position = end
                if start in seen:
                    continue
                line = data[start:end].decode("utf-8", "replace").rstrip("\r")
                name = line[:line.find("\t")]
                if wanted in name or (words and all(w in name for w in words)):
                    seen.add(start)
                    found += 1
                    yield line.split("\t")


def _rank(norm: str, wanted: str, name: str) -> tuple:
    """Le nom exact d'abord, puis le début du nom, puis le début d'un mot, puis le reste."""
    tier = 0 if norm == wanted else 1 if norm.startswith(wanted) else 2 if re.search(r"\b" + re.escape(wanted), norm) else 3
    return tier, len(norm), name


def _search_import(path: Path, wanted: str, limit: int) -> list:
    """Cherche dans import.db : d'abord le début du nom, puis les mots du nom."""
    try:
        with contextlib.closing(sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)) as db:
            rows = db.execute("SELECT id, name, path FROM items WHERE norm >= ? AND norm < ? ORDER BY norm LIMIT ?",
                              (wanted, wanted + "\U0010ffff", limit)).fetchall()
            if len(rows) < limit:
                words = " ".join('"' + w.replace('"', "") + '"*' for w in wanted.split())
                seen = {r[0] for r in rows}
                more = db.execute("SELECT i.id, i.name, i.path FROM items_fts f JOIN items i ON i.id = f.rowid WHERE items_fts MATCH ? LIMIT ?",
                                  (words, limit * 2)).fetchall()
                rows += [r for r in more if r[0] not in seen][:limit - len(rows)]
    except sqlite3.Error:
        return []
    return [{"name": r[1], "path": r[2], "id": f"im-{r[0]}", "chain": ["import"]} for r in rows]


def atlas_search(query: str, limit: int = 40) -> list:
    """Cherche dans l'atlas public (univers, monde, jeux, logiciels, titres de Wikipédia)."""
    wanted = _norm(query or "")
    folder = Path(__file__).resolve().parent / "atlas"
    if not wanted:
        return []
    sky = gaia_search(wanted)
    if not (folder / "index.tsv").exists():
        return (sky + remote_search(wanted, limit))[:limit]
    # Toutes les sources sont classées ensemble : une source pleine ne doit jamais en cacher une autre.
    ranked = [(_rank(_norm(r["name"]), wanted, r["name"]), r) for r in sky]
    for name in ("index.tsv", "index_plus.tsv", "index_cats.tsv"):
        if (folder / name).exists():
            ranked += [(_rank(c[0], wanted, c[1]), {"name": c[1], "path": c[2], "id": c[3], "chain": c[4].split(",")})
                       for c in _scan_index(folder / name, wanted) if len(c) == 5]
    if (folder / "wiki_titles.tsv").exists():
        ranked += [(_rank(c[0], wanted, c[1]), {"name": c[1], "path": "Wikipédia", "id": None, "chain": c[2].split(",")})
                   for c in _scan_index(folder / "wiki_titles.tsv", wanted) if len(c) == 3]
    imported = folder / "import.db"
    if imported.exists():
        ranked += [(_rank(_norm(r["name"]), wanted, r["name"]), r) for r in _search_import(imported, wanted, limit)]
    ranked.sort(key=lambda item: item[0])
    results, seen = [], set()
    for _, result in ranked:
        key = (result["name"], result["path"])
        if key not in seen:
            seen.add(key)
            results.append(result)
            if len(results) >= limit:
                break
    return results

class Store:
    def __init__(self, path: Path | str | None = None):
        self.path = Path(path) if path else default_data_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock_path = self.path.with_name(self.path.name + ".lock")
        with self._locked():
            if not self.path.exists():
                self._write(_seed())

    # --- Fichier -----------------------------------------------------------------

    @contextlib.contextmanager
    def _locked(self):
        deadline = time.monotonic() + 8
        while True:
            try:
                fd = os.open(self.lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                break
            except (FileExistsError, PermissionError):
                with contextlib.suppress(OSError):
                    if time.time() - self.lock_path.stat().st_mtime > 10:
                        self.lock_path.unlink()  # verrou laissé par un processus interrompu
                        continue
                if time.monotonic() > deadline:
                    raise StoreError("Le fichier de données est occupé. Réessaie dans quelques secondes.")
                time.sleep(0.02)
        try:
            yield
        finally:
            os.close(fd)
            with contextlib.suppress(OSError):
                self.lock_path.unlink()

    def _retry(self, action):
        # Windows refuse brièvement l'accès pendant qu'un autre processus remplace le fichier.
        for attempt in range(40):
            try:
                return action()
            except PermissionError:
                if attempt == 39:
                    raise
                time.sleep(0.025)

    def load(self) -> dict:
        def read():
            with open(self.path, encoding="utf-8") as handle:
                return json.load(handle)
        return self._retry(read)

    def _write(self, data: dict) -> None:
        if self.path.exists():
            self._retry(lambda: shutil.copyfile(self.path, self.path.with_name(self.path.name + ".bak")))
        fd, tmp = tempfile.mkstemp(dir=self.path.parent, prefix=".orbe-", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(data, handle, ensure_ascii=False, indent=1)
            self._retry(lambda: os.replace(tmp, self.path))
        finally:
            with contextlib.suppress(OSError):
                os.unlink(tmp)

    @contextlib.contextmanager
    def _mutate(self, by: str, summary: str = "", node_id: str | None = None):
        if by not in AUTHORS:
            raise StoreError("Auteur inconnu.")
        with self._locked():
            data = self.load()
            change = {"by": by, "summary": summary, "nodeId": node_id, "at": _now()}
            yield data, change
            data["rev"] += 1
            data["lastChange"] = change
            self._write(data)

    # --- Recherche d'une catégorie ----------------------------------------------------

    @staticmethod
    def _index(data):
        return {n["id"]: n for n in data["nodes"]}

    @staticmethod
    def _path(data, node) -> str:
        by_id = Store._index(data)
        parts = []
        while node:
            parts.append(node["name"])
            node = by_id.get(node["parentId"])
        return "/".join(reversed(parts))

    @staticmethod
    def _root(data):
        return next(n for n in data["nodes"] if n["parentId"] is None)

    def _resolve(self, data, ref):
        """Accepte un identifiant, un chemin (Argent/Épargne) ou un nom sans ambiguïté."""
        if not isinstance(ref, str) or not ref.strip():
            raise StoreError("Indique une catégorie.")
        ref = ref.strip()
        for node in data["nodes"]:
            if node["id"] == ref:
                return node
        wanted = _norm(ref.strip("/"))
        paths = {n["id"]: self._path(data, n) for n in data["nodes"]}
        root_name = self._root(data)["name"]
        for node in data["nodes"]:
            full = _norm(paths[node["id"]])
            if wanted == full or f"{_norm(root_name)}/{wanted}" == full:
                return node
        matches = [n for n in data["nodes"]
                   if _norm(n["name"]) == wanted or _norm(paths[n["id"]]).endswith("/" + wanted)]
        if len(matches) == 1:
            return matches[0]
        if matches:
            listed = ", ".join(paths[n["id"]] for n in matches)
            raise StoreError(f"« {ref} » est ambigu : {listed}. Utilise le chemin complet.")
        raise StoreError(f"Catégorie introuvable : « {ref} ».")

    @staticmethod
    def _find_entry(data, entry_id):
        for node in data["nodes"]:
            for entry in node["entries"]:
                if entry["id"] == entry_id:
                    return node, entry
        raise StoreError("Information introuvable.")

    @staticmethod
    def _check_sibling(data, parent_id, name, ignore=None):
        for node in data["nodes"]:
            if node["parentId"] == parent_id and node["id"] != ignore and _norm(node["name"]) == _norm(name):
                raise StoreError(f"« {name} » existe déjà à cet endroit.")

    # --- Catégories -------------------------------------------------------------------

    def create_category(self, name, parent, by="user", color=None) -> dict:
        name = _clean(name, "Nom de la catégorie", MAX_NAME)
        with self._mutate(by, f"a créé la catégorie {name}") as (data, change):
            parent_node = self._resolve(data, parent)
            self._check_sibling(data, parent_node["id"], name)
            now = _now()
            node = {"id": _new_id(), "name": name, "parentId": parent_node["id"], "color": color,
                    "author": by, "createdAt": now, "updatedAt": now, "entries": []}
            data["nodes"].append(node)
            change["nodeId"] = node["id"]
            return_value = dict(node, path=self._path(data, node))
        return return_value

    def update_category(self, ref, by="user", name=None, parent=None, color=None) -> dict:
        with self._mutate(by) as (data, change):
            node = self._resolve(data, ref)
            change["nodeId"] = node["id"]
            if name is not None:
                name = _clean(name, "Nom de la catégorie", MAX_NAME)
                self._check_sibling(data, node["parentId"], name, node["id"])
                change["summary"] = f"a renommé {node['name']} en {name}"
                node["name"] = name
            if parent is not None:
                if node["parentId"] is None:
                    raise StoreError("Le point de départ ne peut pas être déplacé.")
                target = self._resolve(data, parent)
                by_id = self._index(data)
                cursor = target
                while cursor:
                    if cursor["id"] == node["id"]:
                        raise StoreError("Une catégorie ne peut pas être rangée dans elle-même.")
                    cursor = by_id.get(cursor["parentId"])
                self._check_sibling(data, target["id"], node["name"], node["id"])
                node["parentId"] = target["id"]
                change["summary"] = f"a déplacé {node['name']} dans {target['name']}"
            if color is not None:
                node["color"] = color or None
                change["summary"] = change["summary"] or f"a changé la couleur de {node['name']}"
            node["updatedAt"] = _now()
            result = dict(node, path=self._path(data, node))
        return result

    def delete_category(self, ref, by="user") -> dict:
        with self._mutate(by) as (data, change):
            node = self._resolve(data, ref)
            if node["parentId"] is None:
                raise StoreError("Le point de départ ne peut pas être supprimé.")
            removed = {node["id"]}
            grew = True
            while grew:
                grew = False
                for item in data["nodes"]:
                    if item["parentId"] in removed and item["id"] not in removed:
                        removed.add(item["id"])
                        grew = True
            entries = sum(len(n["entries"]) for n in data["nodes"] if n["id"] in removed)
            data["nodes"] = [n for n in data["nodes"] if n["id"] not in removed]
            before = len(data["links"])
            data["links"] = [l for l in data["links"] if l["from"] not in removed and l["to"] not in removed]
            change["summary"] = f"a supprimé la catégorie {node['name']}"
            change["nodeId"] = node["parentId"]
            result = {"parentId": node["parentId"], "categories": len(removed), "entries": entries,
                      "links": before - len(data["links"])}
        return result

    # --- Informations -----------------------------------------------------------------

    def add_entry(self, ref, text, by="user") -> dict:
        text = _clean(text, "Information", MAX_TEXT)
        with self._mutate(by) as (data, change):
            node = self._resolve(data, ref)
            now = _now()
            entry = {"id": _new_id(), "text": text, "author": by, "createdAt": now, "updatedAt": now}
            node["entries"].append(entry)
            node["updatedAt"] = now
            change["summary"] = f"a rangé une information dans {node['name']}"
            change["nodeId"] = node["id"]
        return dict(entry, categoryPath=self._path(self.load(), node))

    def update_entry(self, entry_id, text, by="user") -> dict:
        text = _clean(text, "Information", MAX_TEXT)
        with self._mutate(by) as (data, change):
            node, entry = self._find_entry(data, entry_id)
            entry["text"] = text
            entry["updatedAt"] = _now()
            change["summary"] = f"a modifié une information dans {node['name']}"
            change["nodeId"] = node["id"]
        return entry

    def delete_entry(self, entry_id, by="user") -> dict:
        with self._mutate(by) as (data, change):
            node, entry = self._find_entry(data, entry_id)
            node["entries"].remove(entry)
            change["summary"] = f"a supprimé une information dans {node['name']}"
            change["nodeId"] = node["id"]
        return {"deleted": entry_id}

    # --- Connexions -------------------------------------------------------------------

    def connect(self, source, target, fn, by="user", note="") -> dict:
        fn = _clean(fn, "Fonction de la connexion", MAX_FN)
        note = note.strip() if isinstance(note, str) else ""
        with self._mutate(by) as (data, change):
            a = self._resolve(data, source)
            b = self._resolve(data, target)
            if a["id"] == b["id"]:
                raise StoreError("Une catégorie ne peut pas être reliée à elle-même.")
            for link in data["links"]:
                if link["from"] == a["id"] and link["to"] == b["id"] and _norm(link["fn"]) == _norm(fn):
                    raise StoreError("Cette connexion existe déjà.")
            link = {"id": _new_id(), "from": a["id"], "to": b["id"], "fn": fn, "note": note,
                    "author": by, "createdAt": _now()}
            data["links"].append(link)
            change["summary"] = f"a relié {a['name']} à {b['name']} ({fn})"
            change["nodeId"] = a["id"]
            result = dict(link, fromPath=self._path(data, a), toPath=self._path(data, b))
        return result

    def disconnect(self, link_id, by="user") -> dict:
        with self._mutate(by) as (data, change):
            link = next((l for l in data["links"] if l["id"] == link_id), None)
            if not link:
                raise StoreError("Connexion introuvable.")
            data["links"].remove(link)
            change["summary"] = "a retiré une connexion"
            change["nodeId"] = link["from"]
        return {"deleted": link_id}

    # --- Longs contenus : gardés hors du fichier principal pour qu'il reste rapide -----

    @property
    def content_dir(self) -> Path:
        return self.path.with_name(self.path.stem + "-contenus")

    def save_content(self, text: str) -> str:
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
        self.content_dir.mkdir(exist_ok=True)
        target = self.content_dir / f"{digest}.txt"
        if not target.exists():
            target.write_text(text, encoding="utf-8")
        return digest

    def read_content(self, digest: str) -> str:
        if not re.fullmatch(r"[0-9a-f]{40}", digest or ""):
            raise StoreError("Contenu introuvable.")
        try:
            return (self.content_dir / f"{digest}.txt").read_text(encoding="utf-8")
        except OSError:
            raise StoreError("Contenu introuvable.")

    def read_content_slice(self, digest: str, offset: int = 0, size: int = 50000) -> dict:
        text = self.read_content(digest)
        offset = max(0, int(offset))
        return {"total": len(text), "offset": offset, "text": text[offset:offset + size]}

    # --- Lecture pour Claude ----------------------------------------------------------

    def outline(self) -> dict:
        data = self.load()
        children = {}
        for node in data["nodes"]:
            children.setdefault(node["parentId"], []).append(node)

        lines = []

        def walk(node, depth):
            count = len(node["entries"])
            suffix = f" ({count} info{'s' if count > 1 else ''})" if count else ""
            lines.append("  " * depth + node["name"] + suffix)
            for child in sorted(children.get(node["id"], []), key=lambda n: _norm(n["name"])):
                walk(child, depth + 1)

        walk(self._root(data), 0)
        by_id = self._index(data)
        links = [f"{self._path(data, by_id[l['from']])} --{l['fn']}--> {self._path(data, by_id[l['to']])}"
                 for l in data["links"]]
        return {"arbre": "\n".join(lines), "connexions": links}

    def describe(self, ref) -> dict:
        data = self.load()
        node = self._resolve(data, ref)
        by_id = self._index(data)
        return {
            "id": node["id"],
            "path": self._path(data, node),
            "subcategories": [n["name"] for n in data["nodes"] if n["parentId"] == node["id"]],
            "entries": node["entries"],
            "outgoing": [{"linkId": l["id"], "fn": l["fn"], "note": l["note"],
                          "to": self._path(data, by_id[l["to"]])} for l in data["links"] if l["from"] == node["id"]],
            "incoming": [{"linkId": l["id"], "fn": l["fn"], "note": l["note"],
                          "from": self._path(data, by_id[l["from"]])} for l in data["links"] if l["to"] == node["id"]],
        }

    def search(self, query, limit=25) -> list:
        wanted = _norm(_clean(query, "Recherche", 200))
        data = self.load()
        hits = []
        for node in data["nodes"]:
            path = self._path(data, node)
            if wanted in _norm(node["name"]):
                hits.append({"type": "catégorie", "path": path, "id": node["id"]})
            for entry in node["entries"]:
                in_content = entry.get("content") and wanted in _norm(self.read_content(entry["content"]))
                if wanted in _norm(entry["text"]) or in_content:
                    hits.append({"type": "information", "path": path, "id": entry["id"],
                                 "text": entry["text"], "author": entry["author"]})
        return hits[:limit]

    def trace(self, ref) -> dict:
        """Tout ce qui découle d'une catégorie : ses sous-catégories et ses connexions sortantes."""
        data = self.load()
        start = self._resolve(data, ref)
        by_id = self._index(data)
        seen = {start["id"]: 0}
        queue = [start["id"]]
        steps = []
        while queue:
            current = queue.pop(0)
            nexts = [(n["id"], "contient") for n in data["nodes"] if n["parentId"] == current]
            nexts += [(l["to"], l["fn"]) for l in data["links"] if l["from"] == current]
            for target, how in nexts:
                steps.append({"from": self._path(data, by_id[current]), "via": how,
                              "to": self._path(data, by_id[target])})
                if target not in seen:
                    seen[target] = seen[current] + 1
                    queue.append(target)
        return {"start": self._path(data, start), "reached": len(seen) - 1, "steps": steps}
