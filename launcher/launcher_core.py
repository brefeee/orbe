"""Cœur du launcher d'Orbe : installe, met à jour et lance l'app. Les données de l'utilisateur n'y sont jamais touchées."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import urlopen

MAX_PACKAGE = 1024 ** 3
TIMEOUT = 20
CHUNK = 1 << 16


class LauncherError(Exception):
    pass


def home() -> Path:
    env = os.environ.get("ORBE_HOME")
    return Path(env) if env else Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "Orbe"


def _bundled(name: str) -> Path:
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / name


def manifest_url() -> str | None:
    url = os.environ.get("ORBE_MANIFEST_URL")
    if url is None:
        path = _bundled("manifest_url.txt")
        url = path.read_text(encoding="utf-8") if path.exists() else ""
    return url.strip() or None


def _safe_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme == "https" or (parts.scheme == "http" and parts.hostname in ("127.0.0.1", "localhost")):
        return url
    raise LauncherError(f"Adresse refusée : {url}")


def load_settings() -> dict:
    try:
        return json.loads((home() / "settings.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_settings(settings: dict) -> None:
    home().mkdir(parents=True, exist_ok=True)
    (home() / "settings.json").write_text(json.dumps(settings), encoding="utf-8")


def installed_version() -> str | None:
    try:
        version = (home() / "current.txt").read_text(encoding="utf-8").strip()
    except OSError:
        return None
    return version if (home() / "versions" / version / "app" / "server.py").exists() else None


def fetch_manifest() -> dict:
    url = manifest_url()
    if not url:
        raise LauncherError("Aucune adresse de mise à jour n'est configurée.")
    try:
        with urlopen(_safe_url(url), timeout=TIMEOUT) as res:
            data = json.loads(res.read(1 << 20))
        version, sha, size = data["version"], data["sha256"], int(data["size"])
        package = urljoin(url, data["url"])
    except (OSError, ValueError, KeyError, TypeError) as err:
        raise LauncherError(f"Impossible de lire les mises à jour : {err}") from err
    if not re.fullmatch(r"[0-9A-Za-z.\-]{1,40}", version) or ".." in version or not re.fullmatch(r"[0-9a-f]{64}", sha) or not 0 < size <= MAX_PACKAGE:
        raise LauncherError("Le fichier de mise à jour est invalide.")
    return {"version": version, "sha256": sha, "size": size, "url": _safe_url(package)}


def _extract(archive: Path, target: Path) -> None:
    root = target.resolve()
    with zipfile.ZipFile(archive) as z:
        for member in z.infolist():
            if not (root / member.filename).resolve().is_relative_to(root):
                raise LauncherError("Le paquet contient un chemin dangereux.")
        z.extractall(target)


def _point_current(version_dir: Path) -> None:
    """Le dossier « current » garde le même chemin à chaque mise à jour : une IA connectée reste branchée."""
    link = home() / "current"
    if os.path.lexists(link):
        os.rmdir(link)
    subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(version_dir)], check=True, stdout=subprocess.DEVNULL,
                   creationflags=subprocess.CREATE_NO_WINDOW)


def install(manifest: dict, progress=lambda done, total: None) -> None:
    """Télécharge et vérifie le paquet, puis bascule dessus. Toute erreur laisse la version actuelle en place."""
    root = home()
    versions = root / "versions"
    versions.mkdir(parents=True, exist_ok=True)
    final = versions / manifest["version"]
    handle, name = tempfile.mkstemp(dir=root, suffix=".download")
    download = Path(name)
    work = versions / (manifest["version"] + ".tmp")
    try:
        digest, done = hashlib.sha256(), 0
        try:
            with os.fdopen(handle, "wb") as out, urlopen(manifest["url"], timeout=TIMEOUT) as res:
                while chunk := res.read(CHUNK):
                    done += len(chunk)
                    if done > manifest["size"]:
                        raise LauncherError("Le téléchargement est plus gros que prévu.")
                    digest.update(chunk)
                    out.write(chunk)
                    progress(done, manifest["size"])
        except OSError as err:
            raise LauncherError(f"Téléchargement impossible : {err}") from err
        if done != manifest["size"] or digest.hexdigest() != manifest["sha256"]:
            raise LauncherError("Le fichier téléchargé est abîmé ou modifié : installation annulée.")
        shutil.rmtree(work, ignore_errors=True)
        try:
            _extract(download, work)
        except zipfile.BadZipFile as err:
            raise LauncherError("Le paquet est illisible.") from err
        if not (work / "app" / "server.py").exists() or not (work / "runtime" / "python.exe").exists():
            raise LauncherError("Le paquet est incomplet.")
        shutil.rmtree(final, ignore_errors=True)
        os.replace(work, final)
        temp = root / "current.tmp"
        temp.write_text(manifest["version"], encoding="utf-8")
        os.replace(temp, root / "current.txt")
        _point_current(final)
    finally:
        download.unlink(missing_ok=True)
        shutil.rmtree(work, ignore_errors=True)
    # Une ancienne version encore ouverte sera retirée au prochain passage.
    for old in versions.iterdir():
        if old.name != manifest["version"]:
            shutil.rmtree(old, ignore_errors=True)


def update_if_needed(progress=lambda done, total: None) -> tuple[str | None, str | None]:
    """Renvoie la version utilisable et l'éventuelle erreur : sans réseau, la version installée reste lançable."""
    try:
        manifest = fetch_manifest()
        if manifest["version"] != installed_version():
            install(manifest, progress)
        return installed_version(), None
    except LauncherError as err:
        return installed_version(), str(err)


def launch(version: str, lang: str = "fr") -> subprocess.Popen:
    folder = home() / "versions" / version
    args = [str(folder / "runtime" / "python.exe"), str(folder / "app" / "server.py")]
    if os.environ.get("ORBE_PORT"):
        args += ["--port", os.environ["ORBE_PORT"]]
    if not os.environ.get("ORBE_NO_OPEN"):
        args.append("--open")
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    stable = home() / "current"
    env = {**os.environ, "ORBE_LANG": lang, "ORBE_MCP_PYTHON": str(stable / "runtime" / "python.exe"), "ORBE_MCP_SCRIPT": str(stable / "app" / "mcp_server.py")}
    process = subprocess.Popen(args, cwd=folder, env=env, creationflags=flags,
                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    (home() / "server.pid").write_text(str(process.pid), encoding="utf-8")
    return process
