"""Prépare l'atlas pour un stockage en ligne sans serveur (disposition décrite dans app/orbe_remote.py)."""
from __future__ import annotations

import argparse
import contextlib
import gzip
import json
import re
import shutil
import sqlite3
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "app"))
from orbe_remote import WC_PACK, atlas_pack  # noqa: E402

SHARD = 20000
MAX_FILE = 25 * 1024 ** 2
MAX_FILES = 20000


def _write_gz(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".tmp")
    with open(temp, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", compresslevel=6, mtime=0) as out:
        out.write(data)
    temp.replace(path)


def export_files(atlas: Path, out: Path) -> int:
    groups = {}
    for path in atlas.glob("*.json"):
        groups.setdefault(atlas_pack(path.stem), []).append(path)
    count = 0
    for pack, paths in groups.items():
        target = out / "atlas" / f"{pack}.json.gz"
        body = b"{" + b",".join(json.dumps(p.stem).encode() + b":" + p.read_bytes() for p in paths) + b"}"
        _write_gz(target, body)
        count += len(paths)
    print(f"{count:,} dossiers exportés dans {len(groups):,} paquets", flush=True)
    return count


def export_wikicat(atlas: Path, out: Path) -> None:
    source = atlas / "wikicat.db"
    if not source.exists():
        return
    with contextlib.closing(sqlite3.connect(f"file:{source.as_posix()}?mode=ro", uri=True)) as db:
        root = db.execute("SELECT id FROM cat WHERE parent IS NULL").fetchone()[0]
        last = db.execute("SELECT MAX(id) FROM cat").fetchone()[0]

        def nodes(key, cat):
            found = [{"i": f"{key}~s{i}", "n": t[:80], "a": f"wc-{i}"} for i, t in db.execute("SELECT id, title FROM cat WHERE parent=? ORDER BY title", (cat,))]
            found += [{"i": f"{key}~a{n}", "n": r[0][:80]} for n, r in enumerate(db.execute("SELECT title FROM art WHERE cat=? ORDER BY title LIMIT 20000", (cat,)))]
            return found

        _write_gz(out / "wc" / "root.json.gz", json.dumps({"nodes": nodes("wc-root", root)}, ensure_ascii=False).encode("utf-8"))
        for pack in range(last // WC_PACK + 1):
            target = out / "wc" / f"{pack}.json.gz"
            if target.exists():
                continue
            ids = db.execute("SELECT id FROM cat WHERE id >= ? AND id < ?", (pack * WC_PACK, (pack + 1) * WC_PACK)).fetchall()
            _write_gz(target, json.dumps({str(i): nodes(f"wc-{i}", i) for (i,) in ids}, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            if pack % 100 == 0:
                print(f"catégories : {pack}/{last // WC_PACK}", flush=True)


def _rows(atlas: Path):
    for name in ("index.tsv", "index_plus.tsv", "index_cats.tsv"):
        path = atlas / name
        if path.exists():
            with open(path, encoding="utf-8", errors="replace", newline="\n") as lines:
                for line in lines:
                    cols = line.rstrip("\r\n").split("\t")
                    if len(cols) == 5:
                        yield cols
    path = atlas / "wiki_titles.tsv"
    if path.exists():
        with open(path, encoding="utf-8", errors="replace", newline="\n") as lines:
            for line in lines:
                cols = line.rstrip("\r\n").split("\t")
                if len(cols) == 3:
                    yield cols[0], cols[1], "Wikipédia", "", cols[2]
    path = atlas / "import.db"
    if path.exists():
        with contextlib.closing(sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)) as db:
            for i, norm, name, where in db.execute("SELECT id, norm, name, path FROM items"):
                yield norm, name, where, f"im-{i}", "import"


def export_search(atlas: Path, out: Path, work: Path) -> tuple[int, int]:
    """Trie tous les noms, puis les découpe en morceaux de taille égale : aucune recherche ne lit tout."""
    folder = out / "search"
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True)
    sort_db = work / "tri.db"
    sort_db.unlink(missing_ok=True)
    wiki = total = names = 0
    starts = []
    with contextlib.closing(sqlite3.connect(sort_db)) as db:
        db.execute("PRAGMA journal_mode = OFF")
        db.execute("PRAGMA synchronous = OFF")
        db.execute("CREATE TABLE r(norm TEXT, name TEXT, path TEXT, id TEXT, chain TEXT)")
        batch = []
        for row in _rows(atlas):
            batch.append(row)
            names += row[2] != "Catégories de Wikipédia"
            wiki += row[2] == "Wikipédia" and row[3] == ""
            # Chaque mot du nom ouvre aussi une entrée : « eiffel » doit trouver « Tour Eiffel ».
            for word in re.finditer(r"\w{3,}", row[0]):
                if word.start():
                    batch.append((row[0][word.start():], *row[1:]))
            if len(batch) >= 100_000:
                db.executemany("INSERT INTO r VALUES(?,?,?,?,?)", batch)
                total += len(batch)
                batch.clear()
                print(f"{total:,} noms lus", flush=True)
        db.executemany("INSERT INTO r VALUES(?,?,?,?,?)", batch)
        total += len(batch)
        db.commit()
        print("Tri...", flush=True)
        shard = []
        for row in db.execute("SELECT norm, name, path, id, chain FROM r ORDER BY norm COLLATE BINARY"):
            shard.append("\t".join(c.replace("\t", " ") for c in row))
            if len(shard) >= SHARD:
                starts.append(shard[0].split("\t", 1)[0])
                _write_gz(folder / f"{len(starts) - 1}.tsv.gz", "\n".join(shard).encode("utf-8"))
                shard = []
        if shard:
            starts.append(shard[0].split("\t", 1)[0])
            _write_gz(folder / f"{len(starts) - 1}.tsv.gz", "\n".join(shard).encode("utf-8"))
    sort_db.unlink(missing_ok=True)
    (folder / "index.json").write_text(json.dumps(starts, ensure_ascii=False), encoding="utf-8")
    print(f"{names:,} noms, {total:,} entrées, {len(starts):,} morceaux", flush=True)
    return names - wiki, wiki


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--atlas", type=Path, default=HERE.parent / "app" / "atlas")
    parser.add_argument("--out", type=Path, default=HERE / "export")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    export_files(args.atlas, args.out)
    export_wikicat(args.atlas, args.out)
    atlas, wiki = export_search(args.atlas, args.out, args.out)
    (args.out / "stats.json").write_text(json.dumps({"atlas": atlas, "wiki": wiki}), encoding="utf-8")
    (args.out / "version.txt").write_text(str(int(time.time())), encoding="utf-8")
    files = [f for f in args.out.rglob("*") if f.is_file()]
    size = sum(f.stat().st_size for f in files)
    biggest = max(files, key=lambda f: f.stat().st_size)
    print(f"Export terminé : {len(files):,} fichiers, {size / 1024 ** 3:.2f} Go, le plus gros {biggest.stat().st_size / 1024 ** 2:.1f} Mo ({biggest.name})")
    if len(files) > MAX_FILES or biggest.stat().st_size > MAX_FILE:
        raise SystemExit(f"Dépasse les limites de Cloudflare Pages ({MAX_FILES} fichiers, 25 Mo par fichier).")


if __name__ == "__main__":
    main()
