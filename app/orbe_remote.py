"""Atlas à la demande : ce qui manque sur le PC vient d'un stockage en ligne, dans un cache de taille limitée.

Disposition du stockage (voir launcher/export_atlas.py) :
  version.txt, stats.json, atlas/<n>.json.gz, wc/root.json.gz, wc/<n>.json.gz, search/index.json, search/<n>.tsv.gz
"""
from __future__ import annotations

import bisect
import json
import os
import re
import shutil
import tempfile
import threading
import zlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import urlopen

from orbe_gaia import nodes_for

MAX_CACHE = 500 * 1024 ** 2
MAX_RESPONSE = 100 * 1024 ** 2
TIMEOUT = 10
WC_PACK = 500
ATLAS_PACKS = 4096
_synced = threading.Lock()
_sync_done = False


def remote_url() -> str | None:
    """L'adresse vient de ORBE_ATLAS_URL ou de atlas_url.txt ; sans adresse, tout reste local."""
    url = os.environ.get("ORBE_ATLAS_URL")
    if url is None:
        with_file = Path(__file__).resolve().parent / "atlas_url.txt"
        url = with_file.read_text(encoding="utf-8") if with_file.exists() else ""
    url = url.strip().rstrip("/")
    parts = urlsplit(url)
    if parts.scheme == "https" or (parts.scheme == "http" and parts.hostname in ("127.0.0.1", "localhost")):
        return url
    return None


def cache_dir() -> Path:
    env = os.environ.get("ORBE_CACHE")
    return Path(env) if env else Path.home() / ".orbe" / "cache-atlas"


def full_dir() -> Path:
    """L'atlas complet installé par « Tout voir » : il n'est jamais vidé par la limite du cache."""
    return cache_dir().parent / "atlas-complet"


def _get(path: str, timeout: int = TIMEOUT) -> bytes | None:
    if path.startswith(("atlas/", "wc/", "search/")) and (full_dir() / path).is_file():
        return (full_dir() / path).read_bytes()
    base = remote_url()
    if not base:
        return None
    try:
        with urlopen(base + "/" + path, timeout=timeout) as res:
            body = res.read(MAX_RESPONSE + 1)
    except (URLError, OSError, ValueError):
        return None
    return body if len(body) <= MAX_RESPONSE else None


def _get_gz(path: str) -> bytes | None:
    body = _get(path)
    if body is None:
        return None
    try:
        out = zlib.decompressobj(31)
        data = out.decompress(body, MAX_RESPONSE)
        return data if out.eof else None
    except zlib.error:
        return None


def _sync_version() -> None:
    """Vide le cache quand l'atlas en ligne a changé, une seule fois par lancement."""
    global _sync_done
    with _synced:
        if _sync_done:
            return
        body = _get("version.txt", timeout=3)
        if body is None:
            return
        _sync_done = True
        folder = cache_dir()
        mark = folder / "version.txt"
        online = body.decode("utf-8", "replace").strip()
        if mark.exists() and mark.read_text(encoding="utf-8").strip() != online:
            shutil.rmtree(folder, ignore_errors=True)
        folder.mkdir(parents=True, exist_ok=True)
        mark.write_text(online, encoding="utf-8")


def _trim(folder: Path, keep: Path, limit: int) -> None:
    """Supprime les dossiers visités il y a le plus longtemps quand le cache dépasse sa limite."""
    files = sorted(folder.glob("*.json"), key=lambda f: f.stat().st_mtime)
    total = sum(f.stat().st_size for f in files)
    for old in files:
        if total <= limit:
            return
        if old != keep:
            total -= old.stat().st_size
            old.unlink(missing_ok=True)


def _store(name: str, body: bytes, limit: int = MAX_CACHE) -> None:
    folder = cache_dir()
    folder.mkdir(parents=True, exist_ok=True)
    handle, temp = tempfile.mkstemp(dir=folder, suffix=".tmp")
    with os.fdopen(handle, "wb") as out:
        out.write(body)
    target = folder / name
    os.replace(temp, target)
    _trim(folder, target, limit)


def _cached(name: str) -> bytes | None:
    target = cache_dir() / name
    if not target.exists():
        return None
    os.utime(target)
    return target.read_bytes()


def atlas_pack(key: str) -> int:
    """Les dossiers sont regroupés par paquets : l'hébergement gratuit limite le nombre de fichiers."""
    return zlib.crc32(key.encode("utf-8")) % ATLAS_PACKS


def _download_atlas(key: str) -> bytes | None:
    if key == "wc-root":
        return _get_gz("wc/root.json.gz")
    if key.startswith("wc-"):
        if not key[3:].isdigit():
            return json.dumps({"nodes": []}).encode()
        pack = _get_gz(f"wc/{int(key[3:]) // WC_PACK}.json.gz")
        if pack is None:
            return None
        try:
            nodes = json.loads(pack).get(key[3:], [])
        except (ValueError, AttributeError):
            return None
        return json.dumps({"nodes": nodes}, ensure_ascii=False).encode("utf-8")
    pack = _get_gz(f"atlas/{atlas_pack(key)}.json.gz")
    if pack is None:
        return None
    try:
        nodes = json.loads(pack).get(key)
    except (ValueError, AttributeError):
        return None
    return None if nodes is None else json.dumps(nodes, ensure_ascii=False).encode("utf-8")


def fetch_atlas(key: str, limit: int = MAX_CACHE) -> bytes | None:
    """Renvoie un dossier de l'atlas : depuis le cache, sinon en ligne. None si c'est impossible."""
    if not re.fullmatch(r"[\w-]+", key):
        return None
    _sync_version()
    name = f"{key}.json"
    body = _cached(name)
    if body is not None:
        return body
    if key.startswith("gaia-"):
        found = nodes_for(key)
        body = None if found is None else json.dumps(found, ensure_ascii=False).encode("utf-8")
    else:
        body = _download_atlas(key)
    if body is None:
        return None
    try:
        if not isinstance(json.loads(body).get("nodes"), list):
            return None
    except (ValueError, AttributeError):
        return None
    _store(name, body, limit)
    return body


def _search_shard(n: int) -> list[str]:
    name = f"search-{n}.json"
    body = _cached(name)
    if body is None:
        data = _get_gz(f"search/{n}.tsv.gz")
        if data is None:
            return []
        body = json.dumps(data.decode("utf-8", "replace").splitlines()).encode("utf-8")
        _store(name, body)
    return json.loads(body)


def remote_search(wanted: str, limit: int = 40) -> list:
    """Cherche les noms qui commencent par le texte voulu, dans les morceaux triés de l'index en ligne."""
    if len(wanted) < 2:
        return []
    _sync_version()
    body = _cached("search-index.json")
    if body is None:
        body = _get("search/index.json")
        if body is None:
            return []
        _store("search-index.json", body)
    try:
        starts = json.loads(body)
    except ValueError:
        return []
    results = []
    # Le morceau d'avant peut encore contenir le début des noms voulus.
    for n in range(max(bisect.bisect_left(starts, wanted) - 1, 0), len(starts)):
        if starts[n] > wanted and not starts[n].startswith(wanted):
            break
        for line in _search_shard(n):
            cols = line.split("\t")
            if len(cols) == 5 and cols[0].startswith(wanted):
                results.append({"name": cols[1], "path": cols[2], "id": cols[3] or None, "chain": cols[4].split(",")})
                if len(results) >= limit:
                    return results
    return results


_full = {"running": False, "done": 0, "error": None}
_full_lock = threading.Lock()


def _full_list() -> dict | None:
    body = _get("files.json")
    try:
        data = json.loads(body) if body else None
        return data if data and isinstance(data.get("files"), list) else None
    except ValueError:
        return None


def full_status(local: bool = False) -> dict:
    """État de l'atlas complet. local : tout est déjà sur ce PC, il n'y a rien à installer."""
    data = None if local else _full_list()
    mark = full_dir() / "complet.txt"
    complete = local or mark.exists()
    return {"available": bool(data), "complete": complete, "size": data["size"] if data else 0, "done": _full["done"],
            "running": _full["running"], "error": _full["error"], "free": shutil.disk_usage(cache_dir().parent).free}


def _full_worker(data: dict) -> None:
    target = full_dir()
    try:
        if shutil.disk_usage(target.parent).free < data["size"] + 1024 ** 3:
            raise OSError("Pas assez de place sur le disque.")

        def one(item):
            relative, size = item
            path = (target / relative).resolve()
            if not path.is_relative_to(target.resolve()):
                raise OSError("Chemin refusé.")
            if not (path.is_file() and path.stat().st_size == size):  # ce qui est déjà installé n'est pas retéléchargé
                with urlopen(remote_url() + "/" + relative, timeout=60) as res:
                    body = res.read(MAX_RESPONSE + 1)
                if len(body) != size:
                    raise OSError(f"Fichier incomplet : {relative}")
                path.parent.mkdir(parents=True, exist_ok=True)
                temp = path.with_name(path.name + ".tmp")
                temp.write_bytes(body)
                os.replace(temp, path)
            with _full_lock:
                _full["done"] += size

        with ThreadPoolExecutor(6) as pool:
            list(pool.map(one, data["files"]))
        (target / "complet.txt").write_text(str(data.get("version", "")), encoding="utf-8")
    except (OSError, ValueError) as err:
        _full["error"] = str(err)
    finally:
        _full["running"] = False


def start_full_install() -> dict:
    with _full_lock:
        if _full["running"]:
            return full_status()
        data = _full_list()
        if not data:
            return {**full_status(), "error": "L'atlas complet n'est pas disponible pour le moment."}
        full_dir().mkdir(parents=True, exist_ok=True)
        _full.update(running=True, done=0, error=None)
    threading.Thread(target=_full_worker, args=(data,), daemon=True).start()
    return full_status()


def remote_stats() -> dict:
    _sync_version()
    body = _cached("stats.json")
    if body is None:
        body = _get("stats.json", timeout=3)
        if body:
            _store("stats.json", body)
    try:
        stats = json.loads(body) if body else {}
        return {"atlas": int(stats.get("atlas", 0)), "wiki": int(stats.get("wiki", 0))}
    except (ValueError, TypeError, AttributeError):
        return {"atlas": 0, "wiki": 0}
