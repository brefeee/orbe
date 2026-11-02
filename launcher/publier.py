"""Met Orbe en ligne sur Cloudflare Pages (gratuit, sans carte) : atlas, app et launcher.

  python publier.py 1.0.0 --projet orbe --url https://orbe.pages.dev

Le compte est connecté avec « wrangler login ». Ajoute --essai pour tout préparer sans rien envoyer.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402

PAGE = """<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orbe</title>
<body style="font-family:sans-serif;background:#0b2530;color:#eef;max-width:640px;margin:10vh auto;padding:0 16px">
<h1>Orbe</h1><p>Tout ce que tu sais, sur une seule carte en 3D.</p><p><a style="color:#e0b15a" href="/app/Orbe.exe">Télécharger Orbe pour Windows</a></p>
<p><small>Lieux : GeoNames (CC BY 4.0). Titres : Wikipédia, Wikidata et catalogues ouverts.</small></p></body></html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("version")
    parser.add_argument("--projet", required=True)
    parser.add_argument("--url", required=True)
    parser.add_argument("--essai", action="store_true")
    parser.add_argument("--export", type=Path, default=HERE / "export")
    parser.add_argument("--dist", type=Path, default=HERE / "dist")
    args = parser.parse_args()
    base = args.url.rstrip("/")
    if not base.startswith("https://"):
        parser.error("l'adresse doit commencer par https://")
    if not (args.export / "version.txt").exists():
        parser.error("lance d'abord export_atlas.py")

    package = build.build_package(args.version, base, args.dist)
    launcher = build.build_launcher(base + "/app/manifest.json", args.dist)
    app = args.export / "app"
    shutil.rmtree(app, ignore_errors=True)
    app.mkdir()
    for path in (package, launcher, args.dist / "manifest.json"):
        shutil.copy(path, app / path.name)
    (args.export / "index.html").write_text(PAGE, encoding="utf-8")
    (args.export / "404.html").write_text("Introuvable", encoding="utf-8")

    files = [f for f in args.export.rglob("*") if f.is_file()]
    biggest = max(files, key=lambda f: f.stat().st_size)
    print(f"{len(files):,} fichiers, {sum(f.stat().st_size for f in files) / 1024 ** 3:.2f} Go, launcher {launcher.stat().st_size / 1024 ** 2:.1f} Mo, plus gros fichier {biggest.stat().st_size / 1024 ** 2:.1f} Mo")
    if len(files) > 20000 or biggest.stat().st_size > 25 * 1024 ** 2:
        raise SystemExit("Dépasse les limites de Cloudflare Pages.")
    if args.essai:
        print(f"Essai : rien envoyé. Lien de téléchargement prévu : {base}/app/Orbe.exe")
        return
    node = HERE / ".node"
    subprocess.run([str(node / "npx.cmd"), "--yes", "wrangler@4", "pages", "deploy", str(args.export), "--project-name", args.projet, "--branch", "main", "--commit-dirty=true"], check=True, env={**os.environ, "PATH": f"{node}{os.pathsep}{os.environ['PATH']}"})
    print(f"Terminé. Lien de téléchargement : {base}/app/Orbe.exe")


if __name__ == "__main__":
    main()
