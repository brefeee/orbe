"""Mémoire locale d'Orbe : base SQLCipher chiffrée, métadonnées, historique et recherche plein texte."""
from __future__ import annotations

import contextlib
import ctypes
import json
import os
import re
import secrets
import shutil
import sys
import time
import unicodedata
from ctypes import wintypes
from pathlib import Path

from orbe_store import Store, StoreError, _now, default_data_path

try:
    import sqlcipher3 as sqlite
except ImportError:
    sqlite = None

SCHEMA_VERSION = 1
RELIABILITY = ("non vérifié", "probable", "vérifié", "contesté", "faux")
SOURCE_RE = re.compile(r"^(?:[A-Za-z]:\\|https?://)\S*.*$")
SCHEMA = """
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS nodes(id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, color TEXT, atlas TEXT, author TEXT,
    created_at TEXT, updated_at TEXT);
CREATE INDEX IF NOT EXISTS nodes_parent ON nodes(parent_id);
CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, node_id TEXT NOT NULL, position INTEGER, title TEXT, description TEXT, text TEXT NOT NULL,
    author TEXT, origin TEXT, reliability TEXT, discovered_at TEXT, verified_at TEXT, version INTEGER NOT NULL, content TEXT, content_size INTEGER,
    created_at TEXT, updated_at TEXT);
CREATE INDEX IF NOT EXISTS entries_node ON entries(node_id);
CREATE TABLE IF NOT EXISTS sources(entry_id TEXT NOT NULL, position INTEGER NOT NULL, ref TEXT NOT NULL, PRIMARY KEY(entry_id, position));
CREATE TABLE IF NOT EXISTS links(id TEXT PRIMARY KEY, from_id TEXT NOT NULL, to_id TEXT NOT NULL, fn TEXT NOT NULL, note TEXT, author TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS contents(digest TEXT PRIMARY KEY, text TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, version INTEGER, action TEXT NOT NULL,
    actor TEXT, at TEXT NOT NULL, before TEXT, after TEXT);
CREATE INDEX IF NOT EXISTS history_entity ON history(entity, entity_id);
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(path, name, size UNINDEXED, mtime UNINDEXED, tokenize="unicode61 remove_diacritics 2 tokenchars '.-'");
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(entry_id UNINDEXED, title, text, content, tokenize="unicode61 remove_diacritics 2");
"""


class _Blob(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_char))]


def _dpapi(data: bytes, protect: bool) -> bytes:
    """Chiffre avec Windows : seul ce compte, sur ce PC, peut relire la clé."""
    buffer = ctypes.create_string_buffer(data, len(data))
    source = _Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_char)))
    output = _Blob()
    crypt32 = ctypes.windll.crypt32
    action = crypt32.CryptProtectData if protect else crypt32.CryptUnprotectData
    if not action(ctypes.byref(source), None, None, None, None, 0, ctypes.byref(output)):
        raise StoreError("Windows n'a pas pu déverrouiller la clé de la base. Ce fichier appartient peut-être à un autre compte.")
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        ctypes.windll.kernel32.LocalFree(output.pbData)


def load_key(db_path: Path) -> str:
    env = os.environ.get("ORBE_DB_KEY")
    if env:
        return env
    if sys.platform != "win32":
        raise StoreError("Sur ce système, définis ORBE_DB_KEY avec une clé de 64 caractères hexadécimaux.")
    key_file = db_path.with_suffix(".key")
    if key_file.exists():
        return _dpapi(key_file.read_bytes(), False).decode()
    key = secrets.token_hex(32)
    key_file.write_bytes(_dpapi(key.encode(), True))
    return key


class DbStore(Store):
    """Garde l'interface de Store, mais écrit dans la base chiffrée et trace chaque changement."""

    def __init__(self, path: Path | str, key: str | None = None):
        if sqlite is None:
            raise StoreError("Le module de chiffrement manque. Lance Orbe avec « Lancer Orbe.bat ».")
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self._key = key or load_key(path)
        if not re.fullmatch(r"[0-9a-fA-F]{64}", self._key):
            raise StoreError("La clé de la base doit contenir 64 caractères hexadécimaux.")
        self._ready = False
        self.path = path
        self.lock_path = path.with_name(path.name + ".lock")
        with self._locked():
            with self._connect() as db:
                db.executescript(SCHEMA)
                db.execute("INSERT OR IGNORE INTO meta VALUES('schema_version', ?)", (str(SCHEMA_VERSION),))
                db.execute("INSERT OR IGNORE INTO meta VALUES('rev', '0')")
            self._ready = True
            if not self._has_nodes():
                from orbe_store import _seed
                self._write(_seed())
        self._backup()

    @contextlib.contextmanager
    def _connect(self):
        db = sqlite.connect(self.path, timeout=15)
        try:
            # La clé est aléatoire et complète : la forme brute évite un calcul lent à chaque connexion.
            db.execute("PRAGMA cipher_log_level = NONE")
            db.execute(f"""PRAGMA key = "x'{self._key}'" """)
            try:
                db.execute("SELECT count(*) FROM sqlite_master").fetchone()
            except (sqlite.DatabaseError, MemoryError):
                raise StoreError("Impossible d'ouvrir la base : la clé ne correspond pas.")
            db.execute("PRAGMA foreign_keys = ON")
            yield db
            db.commit()
        except sqlite.DatabaseError as err:
            db.rollback()
            if "not a database" in str(err):
                raise StoreError("Impossible d'ouvrir la base : la clé ne correspond pas.")
            raise
        finally:
            db.close()

    def _has_nodes(self) -> bool:
        with self._connect() as db:
            return db.execute("SELECT 1 FROM nodes LIMIT 1").fetchone() is not None

    def _backup(self):
        target = self.path.with_name(self.path.name + ".bak")
        if self.path.exists() and (not target.exists() or time.time() - target.stat().st_mtime > 86400):
            # La copie reste chiffrée avec la même clé.
            with contextlib.suppress(OSError):
                shutil.copyfile(self.path, target)

    # --- Lecture et écriture de la carte -----------------------------------------------

    def load(self) -> dict:
        with self._connect() as db:
            meta = dict(db.execute("SELECT key, value FROM meta"))
            sources = {}
            for entry_id, ref in db.execute("SELECT entry_id, ref FROM sources ORDER BY entry_id, position"):
                sources.setdefault(entry_id, []).append(ref)
            entries = {}
            rows = db.execute("""SELECT id, node_id, title, description, text, author, origin, reliability, discovered_at, verified_at, version,
                                 content, content_size, created_at, updated_at FROM entries ORDER BY node_id, position""")
            for r in rows:
                entry = {"id": r[0], "title": r[2], "description": r[3], "text": r[4], "author": r[5], "origin": r[6], "reliability": r[7],
                         "discoveredAt": r[8], "verifiedAt": r[9], "version": r[10], "createdAt": r[13], "updatedAt": r[14],
                         "sources": sources.get(r[0], [])}
                if r[11]:
                    entry["content"], entry["contentSize"] = r[11], r[12]
                entries.setdefault(r[1], []).append(entry)
            nodes = [{"id": r[0], "name": r[1], "parentId": r[2], "color": r[3], "atlas": r[4], "author": r[5], "createdAt": r[6], "updatedAt": r[7],
                      "entries": entries.get(r[0], [])}
                     for r in db.execute("SELECT id, name, parent_id, color, atlas, author, created_at, updated_at FROM nodes")]
            links = [{"id": r[0], "from": r[1], "to": r[2], "fn": r[3], "note": r[4], "author": r[5], "createdAt": r[6]}
                     for r in db.execute("SELECT id, from_id, to_id, fn, note, author, created_at FROM links")]
        return {"version": 2, "rev": int(meta.get("rev", 0)), "lastChange": json.loads(meta["lastChange"]) if meta.get("lastChange") else None,
                "nodes": nodes, "links": links}

    @staticmethod
    def _complete(entry: dict, node_id: str, actor: str) -> dict:
        """Donne à une information nouvelle ou ancienne toutes ses métadonnées."""
        text = entry["text"]
        lines = text.split("\n")
        if "title" not in entry or entry["title"] is None:
            entry["title"] = lines[0][:200]
        if "sources" not in entry:
            entry["sources"] = [lines[-1]] if len(lines) > 1 and SOURCE_RE.match(lines[-1]) else []
        entry.setdefault("description", "")
        entry.setdefault("origin", "Saisie de l'utilisateur" if entry.get("author") == "user" else "Ajout par une IA")
        entry.setdefault("reliability", "non vérifié")
        entry.setdefault("discoveredAt", entry.get("createdAt"))
        entry.setdefault("verifiedAt", None)
        entry.setdefault("version", 1)
        return entry

    def _write(self, data: dict) -> None:
        change = data.get("lastChange") or {}
        actor = change.get("by") or "system"
        at = _now()
        with self._connect() as db:
            old_nodes = {r[0]: {"name": r[1], "parentId": r[2], "color": r[3], "atlas": r[4]}
                         for r in db.execute("SELECT id, name, parent_id, color, atlas FROM nodes")}
            old_entries = {r[0]: {"nodeId": r[1], "title": r[2], "description": r[3], "text": r[4], "reliability": r[5], "version": r[6], "verifiedAt": r[7]}
                           for r in db.execute("SELECT id, node_id, title, description, text, reliability, version, verified_at FROM entries")}
            old_links = {r[0]: {"from": r[1], "to": r[2], "fn": r[3], "note": r[4]} for r in db.execute("SELECT id, from_id, to_id, fn, note FROM links")}
            old_sources = {}
            for entry_id, ref in db.execute("SELECT entry_id, ref FROM sources ORDER BY entry_id, position"):
                old_sources.setdefault(entry_id, []).append(ref)

            def log(entity, entity_id, action, version=None, before=None, after=None):
                db.execute("INSERT INTO history(entity, entity_id, version, action, actor, at, before, after) VALUES(?,?,?,?,?,?,?,?)",
                           (entity, entity_id, version, action, actor, at, json.dumps(before, ensure_ascii=False) if before is not None else None,
                            json.dumps(after, ensure_ascii=False) if after is not None else None))

            seen_nodes, seen_entries = set(), set()
            for node in data["nodes"]:
                seen_nodes.add(node["id"])
                current = {"name": node["name"], "parentId": node["parentId"], "color": node.get("color"), "atlas": node.get("atlas")}
                if old_nodes.get(node["id"]) != current:
                    db.execute("INSERT OR REPLACE INTO nodes VALUES(?,?,?,?,?,?,?,?)",
                               (node["id"], node["name"], node["parentId"], node.get("color"), node.get("atlas"), node.get("author"), node.get("createdAt"), node.get("updatedAt")))
                    log("category", node["id"], "modifié" if node["id"] in old_nodes else "créé", before=old_nodes.get(node["id"]), after=current)
                for position, entry in enumerate(node["entries"]):
                    self._complete(entry, node["id"], actor)
                    seen_entries.add(entry["id"])
                    before = old_entries.get(entry["id"])
                    sources = entry["sources"]
                    same = before and all(before[k] == v for k, v in (("nodeId", node["id"]), ("title", entry["title"]), ("description", entry["description"]),
                                                                     ("text", entry["text"]), ("reliability", entry["reliability"]), ("verifiedAt", entry["verifiedAt"])))
                    same = same and old_sources.get(entry["id"], []) == sources
                    if same:
                        db.execute("UPDATE entries SET position=? WHERE id=?", (position, entry["id"]))
                        continue
                    if before:
                        entry["version"] = before["version"] + 1
                    db.execute("INSERT OR REPLACE INTO entries VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                               (entry["id"], node["id"], position, entry["title"], entry["description"], entry["text"], entry.get("author"), entry["origin"], entry["reliability"],
                                entry["discoveredAt"], entry["verifiedAt"], entry["version"], entry.get("content"), entry.get("contentSize"), entry.get("createdAt"), entry.get("updatedAt")))
                    db.execute("DELETE FROM sources WHERE entry_id=?", (entry["id"],))
                    db.executemany("INSERT INTO sources VALUES(?,?,?)", [(entry["id"], i, ref) for i, ref in enumerate(sources)])
                    db.execute("DELETE FROM entries_fts WHERE entry_id=?", (entry["id"],))
                    body = ""
                    if entry.get("content"):
                        row = db.execute("SELECT text FROM contents WHERE digest=?", (entry["content"],)).fetchone()
                        body = row[0] if row else ""
                    db.execute("INSERT INTO entries_fts(entry_id, title, text, content) VALUES(?,?,?,?)", (entry["id"], entry["title"], entry["text"], body))
                    log("information", entry["id"], "modifié" if before else "créé", entry["version"], before,
                        {"nodeId": node["id"], "title": entry["title"], "text": entry["text"], "reliability": entry["reliability"], "sources": sources})
            for entry_id in set(old_entries) - seen_entries:
                db.execute("DELETE FROM entries WHERE id=?", (entry_id,))
                db.execute("DELETE FROM sources WHERE entry_id=?", (entry_id,))
                db.execute("DELETE FROM entries_fts WHERE entry_id=?", (entry_id,))
                log("information", entry_id, "supprimé", old_entries[entry_id]["version"], before=old_entries[entry_id])
            for node_id in set(old_nodes) - seen_nodes:
                db.execute("DELETE FROM nodes WHERE id=?", (node_id,))
                log("category", node_id, "supprimé", before=old_nodes[node_id])
            seen_links = set()
            for link in data["links"]:
                seen_links.add(link["id"])
                current = {"from": link["from"], "to": link["to"], "fn": link["fn"], "note": link.get("note", "")}
                if old_links.get(link["id"]) != current:
                    db.execute("INSERT OR REPLACE INTO links VALUES(?,?,?,?,?,?,?)", (link["id"], link["from"], link["to"], link["fn"], link.get("note", ""), link.get("author"), link.get("createdAt")))
                    log("connexion", link["id"], "modifié" if link["id"] in old_links else "créé", before=old_links.get(link["id"]), after=current)
            for link_id in set(old_links) - seen_links:
                db.execute("DELETE FROM links WHERE id=?", (link_id,))
                log("connexion", link_id, "supprimé", before=old_links[link_id])
            db.execute("INSERT OR REPLACE INTO meta VALUES('rev', ?)", (str(data.get("rev", 1)),))
            db.execute("INSERT OR REPLACE INTO meta VALUES('lastChange', ?)", (json.dumps(data.get("lastChange"), ensure_ascii=False),))

    # --- Longs contenus ------------------------------------------------------------------

    def save_content(self, text: str) -> str:
        digest = hashlib_sha1(text)
        with self._connect() as db:
            db.execute("INSERT OR IGNORE INTO contents VALUES(?,?)", (digest, text))
        return digest

    def read_content(self, digest: str) -> str:
        if not re.fullmatch(r"[0-9a-f]{40}", digest or ""):
            raise StoreError("Contenu introuvable.")
        with self._connect() as db:
            row = db.execute("SELECT text FROM contents WHERE digest=?", (digest,)).fetchone()
        if not row:
            raise StoreError("Contenu introuvable.")
        return row[0]

    # --- Métadonnées, historique, recherche ------------------------------------------------

    def replace_files(self, rows, skipped=0):
        with self._connect() as db:
            db.execute("DELETE FROM files_fts")
            db.executemany("INSERT INTO files_fts(path, name, size, mtime) VALUES(?,?,?,?)", rows)
            db.execute("INSERT OR REPLACE INTO meta VALUES('files_scanned_at', ?)", (str(int(time.time())),))
            db.execute("INSERT OR REPLACE INTO meta VALUES('files_skipped', ?)", (str(skipped),))

    def files_scanned_at(self) -> int:
        with self._connect() as db:
            row = db.execute("SELECT value FROM meta WHERE key='files_scanned_at'").fetchone()
        return int(row[0]) if row else 0

    def relay_config(self) -> dict:
        with self._connect() as db:
            row = db.execute("SELECT value FROM meta WHERE key='relay_config'").fetchone()
        return json.loads(row[0]) if row else {}

    def save_relay_config(self, config: dict) -> None:
        with self._connect() as db:
            db.execute("INSERT OR REPLACE INTO meta VALUES('relay_config', ?)", (json.dumps(config),))

    def files_consent(self) -> str | None:
        """« yes », « no » ou None si la question n'a jamais été posée. Un inventaire déjà présent vaut accord."""
        with self._connect() as db:
            row = db.execute("SELECT value FROM meta WHERE key='files_consent'").fetchone()
            if row:
                return row[0]
            return "yes" if db.execute("SELECT 1 FROM meta WHERE key='files_scanned_at'").fetchone() else None

    def set_files_consent(self, allow: bool) -> None:
        """Un refus efface aussi l'inventaire déjà enregistré."""
        with self._connect() as db:
            db.execute("INSERT OR REPLACE INTO meta VALUES('files_consent', ?)", ("yes" if allow else "no",))
            if not allow:
                db.execute("DELETE FROM files_fts")
                db.execute("DELETE FROM meta WHERE key IN ('files_scanned_at', 'files_skipped')")

    def search_files(self, query, limit=30) -> list:
        terms = re.findall(r"[\w.-]+", str(query or ""))
        if not terms:
            return []
        match = " ".join('"' + t + '"*' for t in terms[:12])
        with self._connect() as db:
            rows = db.execute("SELECT path, name, size, mtime FROM files_fts WHERE files_fts MATCH ? ORDER BY bm25(files_fts, 1, 6) LIMIT ?", (match, limit)).fetchall()
        return [{"type": "fichier", "path": r[0], "name": r[1], "size": r[2], "mtime": r[3]} for r in rows]

    def file_known(self, path) -> bool:
        with self._connect() as db:
            return db.execute("SELECT 1 FROM files_fts WHERE path = ? LIMIT 1", (path,)).fetchone() is not None

    def set_entry_details(self, entry_id, by="user", title=None, description=None, reliability=None, sources=None) -> dict:
        with self._mutate(by) as (data, change):
            node, entry = self._find_entry(data, entry_id)
            if title is not None:
                entry["title"] = str(title).strip()[:200] or entry["title"]
            if description is not None:
                entry["description"] = str(description).strip()[:5000]
            if reliability is not None:
                if reliability not in RELIABILITY:
                    raise StoreError("Niveau de fiabilité inconnu.")
                entry["reliability"] = reliability
                entry["verifiedAt"] = _now() if reliability == "vérifié" else None
            if sources is not None:
                if not isinstance(sources, list) or len(sources) > 50:
                    raise StoreError("Indique au plus 50 sources.")
                entry["sources"] = [str(s).strip()[:1000] for s in sources if str(s).strip()]
            change["summary"] = f"a précisé une information dans {node['name']}"
            change["nodeId"] = node["id"]
        return entry

    def history(self, entity_id, limit=100) -> list:
        with self._connect() as db:
            rows = db.execute("SELECT version, action, actor, at, before, after, entity FROM history WHERE entity_id=? ORDER BY id DESC LIMIT ?", (entity_id, limit)).fetchall()
        return [{"version": r[0], "action": r[1], "actor": r[2], "at": r[3], "before": json.loads(r[4]) if r[4] else None,
                 "after": json.loads(r[5]) if r[5] else None, "entity": r[6]} for r in rows]

    def search(self, query, limit=25) -> list:
        terms = re.findall(r"\w+", str(query or ""))
        if not terms:
            raise StoreError("Recherche : ce champ ne peut pas être vide.")
        match = " ".join(f'"{t}"*' for t in terms[:12])
        data = self.load()
        where = {e["id"]: (n, e) for n in data["nodes"] for e in n["entries"]}
        with self._connect() as db:
            rows = db.execute("""SELECT entry_id, snippet(entries_fts, -1, '', '', ' … ', 24) FROM entries_fts
                                 WHERE entries_fts MATCH ? ORDER BY bm25(entries_fts, 0, 8, 4, 1) LIMIT ?""", (match, limit)).fetchall()
        plain = lambda text: "".join(c for c in unicodedata.normalize("NFD", text) if not unicodedata.combining(c)).casefold()
        wanted = [plain(t) for t in terms]
        hits = [{"type": "catégorie", "path": self._path(data, n), "id": n["id"]} for n in data["nodes"]
                if all(t in plain(n["name"]) for t in wanted)][:limit]
        for entry_id, extract in rows:
            if entry_id in where:
                node, entry = where[entry_id]
                hits.append({"type": "information", "path": self._path(data, node), "id": entry_id, "nodeId": node["id"], "title": entry["title"], "text": extract,
                             "author": entry["author"], "reliability": entry["reliability"], "version": entry["version"], "sources": entry["sources"]})
        return hits[:limit]


def hashlib_sha1(text: str) -> str:
    import hashlib
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def default_db_path() -> Path:
    return Path.home() / ".orbe" / "orbe.db"


def migrate_json(source: Path, store: DbStore) -> dict:
    """Copie l'ancienne carte JSON et ses contenus dans la base, puis vérifie que rien ne manque."""
    old = json.loads(source.read_text(encoding="utf-8"))
    folder = source.with_name(source.stem + "-contenus")
    digests = {e["content"] for n in old["nodes"] for e in n["entries"] if e.get("content")}
    missing = 0
    for digest in digests:
        file = folder / f"{digest}.txt"
        if not file.exists():
            missing += 1
            continue
        with store._connect() as db:
            db.execute("INSERT OR IGNORE INTO contents VALUES(?,?)", (digest, file.read_text(encoding="utf-8")))
    with store._locked():
        with store._connect() as db:
            db.execute("DELETE FROM nodes")
            db.execute("DELETE FROM history")
        old["lastChange"] = {"by": "system", "summary": "a migré la carte vers la base chiffrée", "nodeId": None, "at": _now()}
        old["rev"] = old.get("rev", 1) + 1
        store._write(old)
    new = store.load()
    report = {
        "categories": (len(old["nodes"]), len(new["nodes"])),
        "informations": (sum(len(n["entries"]) for n in old["nodes"]), sum(len(n["entries"]) for n in new["nodes"])),
        "connexions": (len(old["links"]), len(new["links"])),
        "contenus": (len(digests), len({e["content"] for n in new["nodes"] for e in n["entries"] if e.get("content")})),
        "contenus_absents": missing,
    }
    bad = {k: v for k, v in report.items() if isinstance(v, tuple) and v[0] != v[1]}
    if bad or missing:
        raise StoreError(f"Migration incomplète : {bad}, {missing} contenus absents.")
    return report


def open_store(path: Path | str | None = None) -> Store:
    """Ouvre la mémoire locale. Un chemin .json garde l'ancien format, utilisé par la version publique."""
    chosen = Path(path) if path else Path(os.environ["ORBE_DATA"]) if os.environ.get("ORBE_DATA") else default_db_path()
    if chosen.suffix == ".json":
        return Store(chosen)
    is_new = not chosen.exists()
    store = DbStore(chosen)
    legacy = default_data_path() if chosen == default_db_path() else chosen.with_suffix(".json")
    if is_new and legacy.exists():
        print(json.dumps(migrate_json(legacy, store), ensure_ascii=False), file=sys.stderr)
    return store
