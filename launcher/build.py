"""Construit le paquet de l'app (sans atlas) et le launcher.

  python build.py paquet 1.0.0 --atlas-url https://...      -> dist/orbe-1.0.0.zip et dist/manifest.json
  python build.py launcher --manifest-url https://.../manifest.json  -> dist/Orbe.exe
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORBE = HERE.parent
EMBED = HERE / "cache" / "python-3.14.0-embed-amd64.zip"
LOGO = ORBE / "app" / "public"
SKIP_DIRS = {"atlas", "__pycache__"}
SKIP_FILES = {"import_atlas.py", "atlas_url.txt"}


def build_package(version: str, atlas_url: str | None, dist: Path) -> Path:
    dist.mkdir(parents=True, exist_ok=True)
    target = dist / f"orbe-{version}.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as out, zipfile.ZipFile(EMBED) as embed:
        for item in embed.infolist():
            data = embed.read(item)
            if item.filename == "python314._pth":
                data = data.replace(b".\r\n", b".\r\nLib\\site-packages\r\n..\\app\r\n", 1)
                if b"site-packages" not in data:
                    raise SystemExit("Le fichier _pth n'a pas le format attendu.")
            out.writestr("runtime/" + item.filename, data)
        for name in ("sqlcipher3", "sqlcipher3_wheels-0.5.7.dist-info"):
            folder = ORBE / "venv" / "Lib" / "site-packages" / name
            for path in folder.rglob("*"):
                if path.is_file() and "__pycache__" not in path.parts:
                    out.write(path, "runtime/Lib/site-packages/" + path.relative_to(folder.parent).as_posix())
        app = ORBE / "app"
        for path in app.rglob("*"):
            relative = path.relative_to(app)
            if path.is_file() and not SKIP_DIRS & set(relative.parts) and path.name not in SKIP_FILES:
                out.write(path, "app/" + relative.as_posix())
        if atlas_url:
            out.writestr("app/atlas_url.txt", atlas_url)
    data = target.read_bytes()
    (dist / "manifest.json").write_text(json.dumps({
        "version": version, "url": target.name, "sha256": hashlib.sha256(data).hexdigest(), "size": len(data), "atlas": atlas_url or ""}), encoding="utf-8")
    return target


def build_launcher(url: str | None, dist: Path) -> Path:
    with tempfile.TemporaryDirectory() as temp:
        config = Path(temp) / "manifest_url.txt"
        config.write_text(url or "", encoding="utf-8")
        subprocess.run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--onefile", "--windowed", "--name", "Orbe",
                        "--distpath", str(dist), "--workpath", str(HERE / ".work"), "--specpath", str(HERE / ".work"),
                        "--icon", str(LOGO / "logo.ico"), "--add-data", f"{LOGO / 'logo.ico'};.", "--add-data", f"{LOGO / 'logo.png'};.",
                        "--add-data", f"{config};.", str(HERE / "launcher.py")], check=True, cwd=HERE)
    return dist / "Orbe.exe"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cible", choices=["paquet", "launcher"])
    parser.add_argument("version", nargs="?")
    parser.add_argument("--atlas-url")
    parser.add_argument("--manifest-url")
    parser.add_argument("--dist", type=Path, default=HERE / "dist")
    args = parser.parse_args()
    if args.cible == "paquet":
        if not args.version:
            parser.error("indique la version")
        made = build_package(args.version, args.atlas_url, args.dist)
    else:
        made = build_launcher(args.manifest_url, args.dist)
    print(f"{made} : {made.stat().st_size / 1024 ** 2:.1f} Mo")


if __name__ == "__main__":
    main()
