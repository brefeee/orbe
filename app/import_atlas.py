"""Construit atlas/import.db à partir d'exports GeoNames et Open Library déjà téléchargés.

Exemple :
  python import_atlas.py --limit 50000000 --geonames allCountries.zip --works works.txt.gz --authors authors.txt.gz

La base est construite à côté puis mise en place à la fin : une erreur ne touche pas à l'atlas existant.
"""
from __future__ import annotations

import argparse
import contextlib
import gzip
import io
import json
import os
import shutil
import sqlite3
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from orbe_store import _norm  # noqa: E402

BATCH = 50_000
MIN_FREE = 5 * 1024 ** 3
MAX_NAME = 200


def read_geonames(path: Path):
    """Colonnes de allCountries : 2 = nom, 7 = classe (P lieu habité, H eau...), 9 = pays."""
    with zipfile.ZipFile(path) as archive:
        with archive.open("allCountries.txt") as raw:
            for line in io.TextIOWrapper(raw, encoding="utf-8", newline="\n"):
                cols = line.rstrip("\n").split("\t")
                if len(cols) >= 9 and cols[1]:
                    yield cols[1], f"Lieux / {cols[8] or '?'}"


def read_openlibrary(path: Path, field: str, label: str):
    """Lignes : type, clé, révision, date, JSON. Les lignes illisibles sont ignorées."""
    with gzip.open(path, "rt", encoding="utf-8", errors="replace", newline="\n") as lines:
        for line in lines:
            cols = line.rstrip("\n").split("\t", 4)
            if len(cols) < 5:
                continue
            try:
                name = json.loads(cols[4]).get(field)
            except ValueError:
                continue
            if isinstance(name, str) and name.strip():
                yield name, label


def build(target: Path, sources, limit: int) -> int:
    temp = target.with_name(target.name + ".tmp")
    temp.unlink(missing_ok=True)
    total = 0
    with contextlib.closing(sqlite3.connect(temp)) as db:
        db.execute("PRAGMA journal_mode = OFF")
        db.execute("PRAGMA synchronous = OFF")
        db.execute("CREATE TABLE items(id INTEGER PRIMARY KEY, norm TEXT NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL)")
        db.execute("CREATE TABLE meta(key TEXT PRIMARY KEY, value)")
        batch = []
        for rows in sources:
            for name, path in rows:
                name = " ".join(name.split())[:MAX_NAME]
                norm = _norm(name)
                if not norm:
                    continue
                batch.append((norm, name, path))
                total += 1
                if len(batch) >= BATCH:
                    db.executemany("INSERT INTO items(norm, name, path) VALUES(?,?,?)", batch)
                    batch.clear()
                    print(f"{total:,} points lus", flush=True)
                    if shutil.disk_usage(temp.parent).free < MIN_FREE:
                        raise SystemExit("Arrêt : il reste moins de 5 Go sur le disque.")
                if total >= limit:
                    break
            if total >= limit:
                break
        db.executemany("INSERT INTO items(norm, name, path) VALUES(?,?,?)", batch)
        print("Construction des index...", flush=True)
        db.execute("CREATE INDEX items_norm ON items(norm)")
        db.execute("""CREATE VIRTUAL TABLE items_fts USING fts5(norm, content='items', content_rowid='id', tokenize="unicode61 remove_diacritics 2")""")
        db.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')")
        db.execute("INSERT INTO meta VALUES('count', ?)", (total,))
        db.commit()
    os.replace(temp, target)
    return total


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=50_000_000)
    parser.add_argument("--geonames", type=Path)
    parser.add_argument("--works", type=Path)
    parser.add_argument("--authors", type=Path)
    parser.add_argument("--db", type=Path, default=Path(__file__).resolve().parent / "atlas" / "import.db")
    args = parser.parse_args()
    sources = []
    if args.geonames:
        sources.append(read_geonames(args.geonames))
    if args.authors:
        sources.append(read_openlibrary(args.authors, "name", "Auteurs"))
    if args.works:
        sources.append(read_openlibrary(args.works, "title", "Livres"))
    if not sources:
        parser.error("indique au moins une source")
    print(f"{build(args.db, sources, args.limit):,} points importés dans {args.db}")


if __name__ == "__main__":
    main()
