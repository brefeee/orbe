"""Inventaire local des fichiers, en lecture seule : noms, tailles et dates, jamais le contenu."""
from __future__ import annotations

import os
import time
from pathlib import Path

SKIP_DIRS = {"AppData", ".git", "node_modules", "__pycache__", ".ssh", ".gnupg", ".aws", ".azure", ".orbe", ".orbe-public", "$RECYCLE.BIN"}
SENSITIVE = ("password", "motdepasse", "mot de passe", "secret", "credential", "token", "id_rsa", ".pem", ".kdbx", "wallet", "launcher_msa", "cookies", "login data")


def is_sensitive(name: str) -> bool:
    lower = name.lower()
    return lower == ".env" or lower.endswith((".key", ".env")) or any(word in lower for word in SENSITIVE)


def scan(root: Path | None = None) -> tuple[list, int]:
    """Parcourt le dossier personnel. Les fichiers au nom sensible sont comptés mais pas enregistrés."""
    root = Path(root) if root else Path.home()
    rows, skipped = [], 0
    for folder, dirs, names in os.walk(root, onerror=lambda err: None):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in names:
            if is_sensitive(name):
                skipped += 1
                continue
            path = os.path.join(folder, name)
            try:
                info = os.stat(path)
            except OSError:
                continue
            rows.append((path, name, info.st_size, int(info.st_mtime)))
    return rows, skipped


def refresh_if_old(store, max_age: int = 86400) -> None:
    if store.files_consent() != "yes":
        return
    last = store.files_scanned_at()
    if time.time() - last > max_age:
        rows, skipped = scan()
        store.replace_files(rows, skipped)
