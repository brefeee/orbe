"""Importe les adresses mondiales d'Overture Maps dans atlas/adresses.db, un fichier à la fois, sans garder les fichiers source.

Reprend là où il s'est arrêté, et s'arrête proprement s'il reste moins de MIN_FREE sur le disque.
"""
from __future__ import annotations

import shutil
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

import duckdb

RELEASE = "2026-10-21.0"
BUCKET = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com"
PREFIX = f"release/{RELEASE}/theme=addresses/type=address/"
OUT = Path.home() / ".orbe" / "app" / "atlas" / "adresses.db"
MIN_FREE = 8 * 1024 ** 3
NS = "{http://s3.amazonaws.com/doc/2006-03-01/}"

SQL = """
SELECT coalesce(country, '') AS country,
       CASE WHEN len(address_levels) >= 2 THEN address_levels[1].value ELSE '' END AS region,
       coalesce(address_levels[len(address_levels)].value, postal_city, '') AS city,
       street,
       string_agg(coalesce(number, '') || CASE WHEN unit IS NULL THEN '' ELSE chr(31) || unit END, chr(30)) AS numbers
FROM read_parquet(?)
WHERE street IS NOT NULL
GROUP BY 1, 2, 3, 4
"""


def keys() -> list[tuple[str, int]]:
    url = f"{BUCKET}/?list-type=2&prefix={PREFIX}"
    root = ET.fromstring(urllib.request.urlopen(url, timeout=60).read())
    found = [(c.find(NS + "Key").text, int(c.find(NS + "Size").text)) for c in root.findall(NS + "Contents")]
    if root.find(NS + "IsTruncated").text == "true":
        raise SystemExit("Liste tronquée : pagination nécessaire.")
    return sorted(found)


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    db = sqlite3.connect(OUT)
    db.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS streets(country TEXT, region TEXT, city TEXT, street TEXT, count INTEGER, numbers BLOB);
        CREATE TABLE IF NOT EXISTS done(key TEXT PRIMARY KEY, streets INTEGER, addresses INTEGER, at INTEGER);
    """)
    done = {r[0] for r in db.execute("SELECT key FROM done")}
    todo = keys()
    print(f"{len(todo)} fichiers, {sum(s for _, s in todo) / 1024 ** 3:.1f} Go, déjà faits : {len(done)}", flush=True)
    work = Path(tempfile.mkdtemp(prefix="orbe-adresses-"))
    duck = duckdb.connect()
    duck.execute("SET threads=4; SET memory_limit='4GB'; SET preserve_insertion_order=false;")
    duck.execute(f"SET temp_directory='{work.as_posix()}/duck'")
    try:
        for index, (key, size) in enumerate(todo, 1):
            if key in done:
                continue
            if limit is not None and limit <= 0:
                break
            if shutil.disk_usage(OUT.parent).free < MIN_FREE + size * 2:
                raise SystemExit(f"Arrêt : moins de {MIN_FREE // 1024 ** 3} Go libres. Relancer reprendra ici.")
            start = time.time()
            local = work / "part.parquet"
            subprocess.run(["curl.exe", "-sS", "--fail", "--retry", "8", "--retry-all-errors", "--retry-delay", "15", "-C", "-", "-o", str(local), f"{BUCKET}/{key}"], check=True)
            if local.stat().st_size != size:
                raise SystemExit(f"Taille inattendue pour {key}")
            cursor = duck.execute(SQL, [str(local)])
            streets = addresses = 0
            while True:
                rows = cursor.fetchmany(20000)
                if not rows:
                    break
                batch = []
                for country, region, city, street, numbers in rows:
                    n = numbers.count("\x1e") + 1
                    batch.append((country, region, city, street, n, zlib.compress(numbers.encode("utf-8"), 6)))
                    addresses += n
                db.executemany("INSERT INTO streets VALUES(?,?,?,?,?,?)", batch)
                streets += len(batch)
            db.execute("INSERT INTO done VALUES(?,?,?,?)", (key, streets, addresses, int(time.time())))
            db.commit()
            local.unlink()
            if limit is not None:
                limit -= 1
            print(f"{index}/{len(todo)} : {addresses:,} adresses, {streets:,} rues, {time.time() - start:.0f} s, base {OUT.stat().st_size / 1024 ** 3:.2f} Go", flush=True)
        if limit is None:
            print("Index…", flush=True)
            db.executescript("""
                CREATE INDEX IF NOT EXISTS streets_place ON streets(country, region, city, street);
                PRAGMA wal_checkpoint(TRUNCATE);
            """)
            print("Terminé :", db.execute("SELECT count(*), sum(count) FROM streets").fetchone(), flush=True)
    finally:
        db.close()
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
