"""Application locale d'Orbe : sert l'interface 3D et l'API sur 127.0.0.1 uniquement."""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import threading
import time
import webbrowser
import functools
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from orbe_db import open_store
import orbe_relay
from orbe_files import refresh_if_old
from orbe_gaia import TOTAL as GAIA_TOTAL
from orbe_remote import fetch_atlas, remote_stats
from orbe_store import Store, StoreError, atlas_search

HERE = Path(__file__).resolve().parent
PUBLIC = HERE / "public"
PAGES = {"/": "accueil.html", "/carte": "index.html", "/ia": "ia.html"}
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
         ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml"}
MAX_BODY = 1_000_000


def wikicat_nodes(key: str) -> dict:
    """Lit un dossier des catégories de Wikipédia : ses sous-catégories, puis ses articles."""
    db_path = HERE / "atlas" / "wikicat.db"
    if not db_path.exists():
        return {"nodes": []}
    with contextlib.closing(sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)) as db:
        if key == "wc-root":
            cat = db.execute("SELECT id FROM cat WHERE parent IS NULL").fetchone()[0]
        elif key[3:].isdigit():
            cat = int(key[3:])
        else:
            return {"nodes": []}
        nodes = [{"i": f"{key}~s{i}", "n": title[:80], "a": f"wc-{i}"} for i, title in db.execute("SELECT id, title FROM cat WHERE parent=? ORDER BY title", (cat,))]
        nodes += [{"i": f"{key}~a{n}", "n": row[0][:80]} for n, row in enumerate(db.execute("SELECT title FROM art WHERE cat=? ORDER BY title LIMIT 20000", (cat,)))]
    return {"nodes": nodes}


@functools.lru_cache(maxsize=None)
def _count_lines(name: str) -> int:
    target = HERE / "atlas" / name
    if not target.exists():
        return 0
    total = 0
    with open(target, "rb") as f:
        while chunk := f.read(1 << 24):
            total += chunk.count(b"\n")
    return total


def _count_imported() -> int:
    target = HERE / "atlas" / "import.db"
    if not target.exists():
        return 0
    try:
        with contextlib.closing(sqlite3.connect(f"file:{target.as_posix()}?mode=ro", uri=True)) as db:
            return db.execute("SELECT value FROM meta WHERE key='count'").fetchone()[0]
    except (sqlite3.Error, TypeError):
        return 0


def knowledge_stats(store: Store) -> dict:
    """Compte ce qui existe vraiment : la carte, l'atlas et les titres de Wikipédia."""
    data = store.load()
    own = len(data["nodes"]) + sum(len(n["entries"]) for n in data["nodes"])
    atlas, wiki = _count_lines("index.tsv") + _count_lines("index_plus.tsv") + _count_imported(), _count_lines("wiki_titles.tsv")
    if not atlas:
        far = remote_stats()
        atlas, wiki = far["atlas"], far["wiki"]
    return {"total": own + atlas + wiki + GAIA_TOTAL, "map": own, "atlas": atlas, "wiki": wiki, "gaia": GAIA_TOTAL}


def connection_info(store: Store) -> dict:
    python = os.environ.get("ORBE_MCP_PYTHON") or str(Path(sys.executable))
    script = os.environ.get("ORBE_MCP_SCRIPT") or str(HERE / "mcp_server.py")
    env = {"ORBE_DATA": str(store.path)}
    return {
        "code": f'claude mcp add orbe --scope user -e ORBE_DATA="{store.path}" -- "{python}" "{script}"',
        "desktop": json.dumps({"mcpServers": {"orbe": {"command": python, "args": [script], "env": env}}},
                              ensure_ascii=False, indent=2),
        "dataPath": str(store.path),
    }


class Handler(BaseHTTPRequestHandler):
    store: Store
    port: int
    server_version = "Orbe"

    def log_message(self, *args):
        pass

    def _prepare(self, method: str, path: str):
        """Point d'extension de la version publique : renvoie le chemin à traiter, ou None si déjà traité."""
        return path

    def _hosts(self) -> set:
        return {f"127.0.0.1:{self.port}", f"localhost:{self.port}"}

    def _allowed(self) -> bool:
        # Empêche un site web ouvert ailleurs de lire ou modifier la carte locale.
        hosts = self._hosts()
        if self.headers.get("Host") not in hosts:
            return False
        origin = self.headers.get("Origin")
        return not origin or urlsplit(origin).netloc in hosts

    def _json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            raise StoreError("Ce contenu est trop long.")
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            raise StoreError("Format de requête non pris en charge.")
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            raise StoreError("Requête illisible.")
        if not isinstance(data, dict):
            raise StoreError("Requête illisible.")
        return data

    def _dispatch(self, method: str):
        if not self._allowed():
            self._json({"error": "Accès refusé."}, 403)
            return
        try:
            path = self._prepare(method, urlsplit(self.path).path)
            if path is None:
                return
            if method == "GET":
                self._get(path)
            else:
                self._write(method, path)
        except StoreError as err:
            self._json({"error": str(err)}, 400)
        except ConnectionError:
            pass

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def do_PATCH(self):
        self._dispatch("PATCH")

    def do_DELETE(self):
        self._dispatch("DELETE")

    def _get(self, path: str):
        if path == "/api/graph":
            self._json(self.store.load())
        elif path == "/api/stats":
            self._json(knowledge_stats(self.store))
        elif path == "/api/relay" and hasattr(self.store, "relay_config"):
            self._json(orbe_relay.public_view(self.store.relay_config()))
        elif path == "/api/lang":
            self._json({"lang": os.environ.get("ORBE_LANG", "fr")})
        elif path == "/api/files/consent" and hasattr(self.store, "files_consent"):
            self._json({"consent": self.store.files_consent()})
        elif path == "/api/connection":
            self._json(connection_info(self.store))
        elif path == "/api/events":
            self._events()
        elif re.fullmatch(r"/api/content/[0-9a-f]{40}", path):
            self._json({"text": self.store.read_content(path.rsplit("/", 1)[1])})
        elif re.fullmatch(r"/api/atlas/[\w-]+", path):
            self._atlas_file(path.rsplit("/", 1)[1])
        elif re.fullmatch(r"/api/entries/\w+/history", path) and hasattr(self.store, "history"):
            self._json(self.store.history(path.split("/")[3]))
        elif path == "/api/search" and hasattr(self.store, "history"):
            query = parse_qs(urlsplit(self.path).query).get("q", [""])[0]
            self._json((self.store.search(query, 30) + self.store.search_files(query, 30)) if query.strip() else [])
        elif path == "/api/atlas-search":
            query = parse_qs(urlsplit(self.path).query).get("q", [""])[0]
            self._json(atlas_search(query))
        elif path.startswith("/api/"):
            self._json({"error": "Adresse inconnue."}, 404)
        else:
            self._static(path)

    def _write(self, method: str, path: str):
        s = self.store
        body = self._body() if method in ("POST", "PATCH") else {}
        if method == "POST" and path == "/api/files/reveal" and hasattr(self.store, "file_known"):
            target = str(body.get("path") or "")
            if not self.store.file_known(target) or not os.path.exists(target):
                raise StoreError("Ce fichier n'existe plus à cet endroit.")
            subprocess.Popen(["explorer", "/select,", target])
            self._json({"ok": True})
            return
        if method == "POST" and path == "/api/files/consent" and hasattr(self.store, "files_consent"):
            allow = body.get("allow") is True
            self.store.set_files_consent(allow)
            if allow:
                threading.Thread(target=refresh_if_old, args=(self.store,), daemon=True).start()
            self._json({"consent": "yes" if allow else "no"})
            return
        if method == "POST" and path.startswith("/api/relay/") and hasattr(s, "relay_config"):
            config = s.relay_config()
            if path == "/api/relay/config":
                config = orbe_relay.merge(config, body)
                s.save_relay_config(config)
                self._json(orbe_relay.public_view(config))
            elif path == "/api/relay/suggest":
                config = orbe_relay.merge(config, {"roles": orbe_relay.suggest(config)})
                s.save_relay_config(config)
                self._json(orbe_relay.public_view(config))
            elif path == "/api/relay/run":
                self._json({"steps": orbe_relay.run(config, body.get("task"))})
            else:
                self._json({"error": "Adresse inconnue."}, 404)
            return
        match = re.fullmatch(r"/api/entries/(\w+)/details", path)
        if method == "POST" and match and hasattr(self.store, "set_entry_details"):
            self._json(s.set_entry_details(match[1], title=body.get("title"), description=body.get("description"),
                                           reliability=body.get("reliability"), sources=body.get("sources")))
            return
        routes = [
            ("POST", r"/api/categories", lambda: s.create_category(body.get("name"), body.get("parent"))),
            ("PATCH", r"/api/categories/(\w+)", lambda i: s.update_category(
                i, name=body.get("name"), parent=body.get("parent"), color=body.get("color"))),
            ("DELETE", r"/api/categories/(\w+)", lambda i: s.delete_category(i)),
            ("POST", r"/api/categories/(\w+)/entries", lambda i: s.add_entry(i, body.get("text"))),
            ("PATCH", r"/api/entries/(\w+)", lambda i: s.update_entry(i, body.get("text"))),
            ("DELETE", r"/api/entries/(\w+)", lambda i: s.delete_entry(i)),
            ("POST", r"/api/links", lambda: s.connect(
                body.get("from"), body.get("to"), body.get("fn"), note=body.get("note", ""))),
            ("DELETE", r"/api/links/(\w+)", lambda i: s.disconnect(i)),
        ]
        for verb, pattern, action in routes:
            match = re.fullmatch(pattern, path)
            if verb == method and match:
                self._json(action(*match.groups()))
                return
        self._json({"error": "Adresse inconnue."}, 404)

    def _atlas_file(self, key: str):
        if key.startswith("wc-") and (HERE / "atlas" / "wikicat.db").exists():
            self._json(wikicat_nodes(key))
            return
        target = HERE / "atlas" / f"{key}.json"
        body = target.read_bytes() if target.is_file() else fetch_atlas(key)
        if body is None:
            self._json({"error": "Dossier introuvable ou connexion impossible."}, 404)
            return
        if key == "univers":
            content = json.loads(body)
            content["nodes"].append({"i": "univers~gaia", "n": "Étoiles de la Voie lactée (Gaia)", "a": "gaia-root", "t": [
                f"{GAIA_TOTAL:,}".replace(",", " ") + " objets réels mesurés par le satellite Gaia de l'ESA, surtout des étoiles de notre galaxie. Ils ne sont pas stockés sur ce PC : chaque zone du ciel est lue en direct quand tu l'ouvres.",
                "Source : ESA, mission Gaia, catalogue DR3 (licence CC BY-NC 3.0 IGO)."]})
            body = json.dumps(content, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _static(self, path: str):
        relative = PAGES.get(path) or path.lstrip("/")
        target = (PUBLIC / relative).resolve()
        if not target.is_relative_to(PUBLIC) or not target.is_file() or target.suffix not in TYPES:
            self._json({"error": "Fichier introuvable."}, 404)
            return
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", TYPES[target.suffix])
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _events(self):
        # Prévient l'interface dès que le fichier change, y compris quand c'est Claude qui écrit.
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        last = None
        beat = time.monotonic()
        while True:
            try:
                stamp = self.store.path.stat().st_mtime_ns
            except OSError:
                stamp = last
            if stamp != last:
                last = stamp
                self.wfile.write(b"data: changed\n\n")
                self.wfile.flush()
            elif time.monotonic() - beat > 15:
                beat = time.monotonic()
                self.wfile.write(b": ping\n\n")
                self.wfile.flush()
            time.sleep(0.4)


def open_window(url: str) -> None:
    """Ouvre Orbe dans sa propre fenêtre avec Edge si possible, sinon dans le navigateur."""
    if sys.platform == "win32":
        try:
            import winreg
            key = r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key) as handle:
                edge = winreg.QueryValue(handle, None)
            subprocess.Popen([edge, f"--app={url}"])
            return
        except OSError:
            pass
    webbrowser.open(url)


def main():
    parser = argparse.ArgumentParser(description="Orbe")
    parser.add_argument("--port", type=int, default=4747)
    parser.add_argument("--data", help="chemin du fichier de données")
    parser.add_argument("--open", action="store_true", help="ouvrir la fenêtre au démarrage")
    args = parser.parse_args()

    store = open_store(args.data)
    url = f"http://127.0.0.1:{args.port}"
    handler = type("BoundHandler", (Handler,), {"store": store, "port": args.port})
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError:
        if args.open:  # Orbe tourne déjà : on rouvre simplement la fenêtre
            open_window(url)
            return
        raise SystemExit(f"Le port {args.port} est déjà utilisé.")
    server.daemon_threads = True
    if hasattr(store, "replace_files"):
        threading.Thread(target=refresh_if_old, args=(store,), daemon=True).start()
    print(f"Orbe est ouvert sur {url}\nDonnées : {store.path}\nFerme cette fenêtre pour arrêter Orbe.", flush=True)
    if args.open:
        open_window(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
