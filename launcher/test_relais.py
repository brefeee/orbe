"""Teste le relais entre IA avec de faux services locaux : aucune vraie clé, aucune vraie demande."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

APP = Path(__file__).resolve().parent.parent / "app"
PORT = 4902
calls = []


class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        calls.append((self.path, self.headers.get("x-api-key") or self.headers.get("Authorization"), body))
        if "mauvais" in json.dumps(body):
            self.send_response(401)
            self.end_headers()
            return
        if self.path == "/v1/messages":
            out = {"content": [{"type": "text", "text": "Voici le résultat.\nIMAGE: un chat bleu\nFin."}]}
        elif self.path == "/v1/images/generations":
            out = {"data": [{"b64_json": "QUJD"}]}
        else:
            out = {"choices": [{"message": {"content": "PROMPT PRECIS"}}]}
        raw = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


fake = ThreadingHTTPServer(("127.0.0.1", 0), Fake)
threading.Thread(target=fake.serve_forever, daemon=True).start()
work = Path(tempfile.mkdtemp(prefix="orber_"))
env = {**os.environ, "USERPROFILE": str(work), "HOME": str(work), "ORBE_DATA": str(work / "o.db"), "ORBE_ATLAS_URL": "", "ORBE_RELAY_BASE": f"http://127.0.0.1:{fake.server_address[1]}"}
srv = subprocess.Popen([sys.executable, str(APP / "server.py"), "--port", str(PORT)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def api(path, body=None):
    req = Request(f"http://127.0.0.1:{PORT}{path}", method="POST" if body is not None else "GET", data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read())
    except HTTPError as e:
        return e.code, json.loads(e.read())


try:
    for _ in range(60):
        try:
            api("/api/stats")
            break
        except OSError:
            time.sleep(0.3)
    code, off = api("/api/relay/run", {"task": "x"})
    assert code != 200 and "désactivée" in off["error"], off
    print("désactivé par défaut : refus")

    _, view = api("/api/relay/config", {"accounts": {"openai": {"key": "cle-openai-secrete", "model": "m1", "imageModel": "img1"}, "anthropic": {"key": "cle-claude-secrete", "model": "m2"}}})
    assert "secrete" not in json.dumps(view), "une clé est renvoyée à la page"
    assert "secrete" not in json.dumps(api("/api/relay")[1])
    print("les clés ne reviennent jamais vers la page")

    _, view = api("/api/relay/suggest", {})
    assert view["roles"] == {"reformuler": "openai", "executer": "anthropic", "image": "openai"}, view["roles"]
    print("répartition suggérée :", view["roles"])

    api("/api/relay/config", {"enabled": True})
    code, res = api("/api/relay/run", {"task": "Fais-moi une fiche"})
    assert code == 200, res
    steps = res["steps"]
    assert [s["role"] for s in steps] == ["reformuler", "executer", "image"], steps
    assert steps[0]["text"] == "PROMPT PRECIS" and steps[1]["text"] == "Voici le résultat.\nFin." and steps[2]["image"] == "data:image/png;base64,QUJD"
    assert calls[-2][0] == "/v1/messages" and calls[-2][1] == "cle-claude-secrete" and calls[-2][2]["messages"][0]["content"].startswith("PROMPT PRECIS")
    assert calls[-3][1] == "Bearer cle-openai-secrete" and calls[-1][1] == "Bearer cle-openai-secrete" and calls[-1][2]["model"] == "img1"
    print("relais complet : reformulation, travail, image")

    code, res = api("/api/relay/config", {"roles": {"reformuler": "gemini"}})
    code, res = api("/api/relay/run", {"task": "x"})
    assert code != 200 and "Gemini" in res["error"], res
    print("IA sans clé : erreur claire")
    api("/api/relay/config", {"roles": {"reformuler": ""}})
    n = len(calls)
    code, res = api("/api/relay/run", {"task": "sans reformulation"})
    assert code == 200 and res["steps"][0]["role"] == "executer" and calls[n][0] == "/v1/messages"
    print("tâche retirée à une IA : elle est sautée")

    code, res = api("/api/relay/config", {"roles": {"image": "anthropic"}})
    assert code != 200, res
    code, res = api("/api/relay/run", {"task": "mauvais service"})
    assert code != 200 and "refusé" in res["error"] and "secrete" not in res["error"], res
    print("service qui refuse : erreur claire, sans la clé")

    _, view = api("/api/relay/config", {"accounts": {"anthropic": {"remove": True}}})
    assert view["roles"]["executer"] == "" and not next(p for p in view["providers"] if p["id"] == "anthropic")["hasKey"]
    assert b"secrete" not in (work / "o.db").read_bytes(), "clé lisible dans le fichier"
    print("clé retirée, et la base reste illisible en clair")
    print("OK")
finally:
    srv.kill()
    srv.wait()
    shutil.rmtree(work, ignore_errors=True)
