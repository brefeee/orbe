"""Rend les catégories de Wikipédia cherchables : écrit atlas/index_cats.tsv depuis wikicat.db."""
from __future__ import annotations

import contextlib
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "app"))
from orbe_store import _norm  # noqa: E402

ATLAS = HERE.parent / "app" / "atlas"


def main():
    with contextlib.closing(sqlite3.connect(f"file:{(ATLAS / 'wikicat.db').as_posix()}?mode=ro", uri=True)) as db:
        cats = db.execute("SELECT id, title, parent FROM cat").fetchall()
    by_id = {c[0]: c for c in cats}
    root = next(c[0] for c in cats if c[2] is None)
    key = lambda cat: "wc-root" if cat == root else f"wc-{cat}"
    temp = ATLAS / "index_cats.tsv.tmp"
    count = 0
    with open(temp, "w", encoding="utf-8", newline="\n") as out:
        for cat, title, parent in cats:
            if parent is None:
                continue
            chain, seen, up = [], set(), parent
            while up is not None and up in by_id and up not in seen:
                seen.add(up)
                chain.append(key(up))
                up = by_id[up][2]
            clean = title[:80].replace("\t", " ")
            out.write(f"{_norm(clean)}\t{clean}\tCatégories de Wikipédia\t{key(parent)}~s{cat}\t{','.join(reversed(chain))}\n")
            count += 1
    temp.replace(ATLAS / "index_cats.tsv")
    print(count, "catégories")


if __name__ == "__main__":
    main()
