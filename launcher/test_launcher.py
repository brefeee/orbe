"""Teste le vrai Orbe.exe de bout en bout : installation, données gardées, mise à jour, paquet abîmé, hors ligne."""
import functools
import hashlib
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import zipfile
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402

work = Path(tempfile.mkdtemp(prefix="orbel_"))
site = work / "site"
home = work / "home"
PORT = 4893
EXE = HERE / "dist" / "Orbe.exe"
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(site))
handler.log_message = lambda *a: None
web = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=web.serve_forever, daemon=True).start()
ENV = {**os.environ, "ORBE_HOME": str(home), "ORBE_MANIFEST_URL": f"http://127.0.0.1:{web.server_address[1]}/manifest.json",
       "ORBE_NO_OPEN": "1", "ORBE_PORT": str(PORT), "ORBE_DATA": str(work / "donnees" / "orbe.db"), "ORBE_ATLAS_URL": ""}
(work / "donnees").mkdir()


def api(path, body=None):
    req = Request(f"http://127.0.0.1:{PORT}{path}", method="POST" if body else "GET",
                  data=json.dumps(body).encode() if body else None, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def stop():
    pid = home / "server.pid"
    if pid.exists():
        subprocess.run(["taskkill", "/F", "/PID", pid.read_text()], capture_output=True)
        pid.unlink()
        time.sleep(1)


def run():
    stop()
    code = subprocess.run([str(EXE), "--auto"], env=ENV, timeout=240).returncode
    if code:
        return code
    for _ in range(60):
        try:
            api("/api/stats")
            return 0
        except (URLError, OSError):
            time.sleep(0.5)
    raise SystemExit("le serveur installé ne répond pas")


current = lambda: (home / "current.txt").read_text()
versions = lambda: sorted(p.name for p in (home / "versions").iterdir())
try:
    assert run() == 2, "sans serveur et sans installation : erreur propre"
    print("rien d'installé, pas de réseau : erreur propre")

    build.build_package("1.0.0", None, site)
    t = time.time()
    assert run() == 0 and current() == "1.0.0"
    print(f"installation 1.0.0 : {time.time() - t:.0f} s, paquet {(site / 'orbe-1.0.0.zip').stat().st_size / 1024 ** 2:.1f} Mo")
    size = sum(f.stat().st_size for f in (home / "versions").rglob("*") if f.is_file())
    print(f"taille installée : {size / 1024 ** 2:.1f} Mo")
    assert not (home / "versions" / "1.0.0" / "app" / "atlas").exists()

    before = api("/api/stats")["map"]
    data = (work / "donnees" / "orbe.db")
    assert data.exists(), "base chiffrée créée avec sqlcipher"
    print("app lancée avec Python portable, base créée, points carte :", before)
    stamp = data.read_bytes()[:16]

    stop()
    build.build_package("2.0.0", None, site)
    assert run() == 0 and current() == "2.0.0" and versions() == ["2.0.0"], versions()
    assert api("/api/stats")["map"] == before and data.read_bytes()[:16] == stamp
    print("mise à jour 2.0.0 : ancienne version retirée, données gardées")

    info = api("/api/connection")
    python = json.loads(info["desktop"])["mcpServers"]["orbe"]["command"]
    script = json.loads(info["desktop"])["mcpServers"]["orbe"]["args"][0]
    assert "current" in python and "current" in script and "2.0.0" not in python, python
    assert "claude mcp add orbe" in info["code"] and python in info["code"]
    calls = ['{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}',
             '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"open_category","arguments":{"category":"Tout"}}}']
    res = subprocess.run([python, script], input="\n".join(calls) + "\n", capture_output=True, text=True, encoding="utf-8", env=ENV, timeout=60)
    answers = [json.loads(l) for l in res.stdout.splitlines()]
    assert answers[0]["result"]["serverInfo"]["name"] == "orbe", res.stderr
    assert "Public" in answers[1]["result"]["content"][0]["text"], answers[1]
    print("connexion IA : commande stable après mise à jour, connecteur répond avec le Python portable")

    build.build_package("3.0.0", None, site)
    m = json.loads((site / "manifest.json").read_text())
    m["sha256"] = "0" * 64
    (site / "manifest.json").write_text(json.dumps(m))
    assert run() == 0 and current() == "2.0.0" and versions() == ["2.0.0"]
    assert "abîmé" in (home / "launcher.log").read_text(encoding="utf-8").splitlines()[-1]
    print("paquet modifié : refusé, 2.0.0 reste en place")

    evil = site / "evil.zip"
    with zipfile.ZipFile(evil, "w") as z:
        z.writestr("../../pirate.txt", "x")
    raw = evil.read_bytes()
    (site / "manifest.json").write_text(json.dumps({"version": "4.0.0", "url": "evil.zip", "sha256": hashlib.sha256(raw).hexdigest(), "size": len(raw)}))
    assert run() == 0 and current() == "2.0.0" and not (home.parent / "pirate.txt").exists()
    print("paquet avec chemin dangereux : refusé")

    (site / "manifest.json").unlink()
    web.shutdown()
    web.server_close()
    assert run() == 0 and current() == "2.0.0"
    print("hors ligne : la version installée se lance")
    print("OK")
finally:
    stop()
    shutil.rmtree(work, ignore_errors=True)
