"""Vérifie sur un faux dossier personnel qu'aucun fichier n'est listé sans accord, et qu'un refus efface la liste."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

APP = Path(__file__).resolve().parent.parent / "app"
PORT = 4895
work = Path(tempfile.mkdtemp(prefix="orbea_"))
(work / "home" / "Documents").mkdir(parents=True)
(work / "home" / "Documents" / "photo-unique.txt").write_text("x")
(work / "home" / "mon-password.txt").write_text("x")
env = {**os.environ, "USERPROFILE": str(work / "home"), "HOME": str(work / "home"), "ORBE_DATA": str(work / "orbe.db"), "ORBE_ATLAS_URL": ""}


def api(path, body=None):
    req = Request(f"http://127.0.0.1:{PORT}{path}", method="POST" if body is not None else "GET",
                  data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def start():
    p = subprocess.Popen([sys.executable, str(APP / "server.py"), "--port", str(PORT)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            api("/api/stats")
            return p
        except OSError:
            time.sleep(0.3)
    raise SystemExit("serveur muet")


def names(q="photo"):
    return [r["name"] for r in api("/api/search?q=" + quote(q)) if r.get("type") == "fichier"]


def wait_for(cond):
    for _ in range(40):
        if cond():
            return True
        time.sleep(0.25)
    return False


p = start()
try:
    assert api("/api/files/consent") == {"consent": None}
    time.sleep(2)
    assert names() == [], "aucun scan avant la réponse"
    print("sans réponse : aucun fichier listé")

    assert api("/api/files/consent", {"allow": False})["consent"] == "no"
    time.sleep(1)
    assert names() == []
    p.kill(); p.wait(); p = start()
    time.sleep(2)
    assert api("/api/files/consent")["consent"] == "no" and names() == []
    print("refus : gardé après redémarrage, aucun fichier listé")

    api("/api/files/consent", {"allow": True})
    assert wait_for(lambda: names() == ["photo-unique.txt"]), names()
    assert names("password") == []
    print("accord : fichier listé, nom sensible ignoré")

    api("/api/files/consent", {"allow": False})
    assert names() == []
    p.kill(); p.wait(); p = start()
    assert api("/api/files/consent")["consent"] == "no" and names() == []
    print("changement d'avis : liste effacée")

    api("/api/files/consent", {"allow": "oui"})
    assert api("/api/files/consent")["consent"] == "no"
    print("réponse invalide : compte comme un refus")
    print("OK")
finally:
    p.kill()
    p.wait()
    shutil.rmtree(work, ignore_errors=True)
