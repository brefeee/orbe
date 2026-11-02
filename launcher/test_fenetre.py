"""Pilote la vraie fenêtre du launcher : change la langue, attend la fin, clique sur le bouton."""
import os
import sys
import tempfile
import tkinter as tk
from pathlib import Path
from tkinter import ttk

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ["ORBE_HOME"] = tempfile.mkdtemp(prefix="orbef_")
os.environ["ORBE_MANIFEST_URL"] = "http://127.0.0.1:9/manifest.json"
import launcher  # noqa: E402
import launcher_core as core  # noqa: E402

launched = []
core.launch = lambda version, lang: launched.append((version, lang))
real_loop = tk.Tk.mainloop
seen = {}


def widgets(root, kind):
    return [w for w in root.winfo_children()[0].winfo_children() if isinstance(w, kind)]


def scenario(window):
    box = widgets(window, ttk.Combobox)[0]
    label, status = widgets(window, ttk.Label)
    button = widgets(window, ttk.Button)[0]
    seen["none"] = status.cget("text")
    seen["btn_fr"] = button.cget("text")
    box.set("Español")
    box.event_generate("<<ComboboxSelected>>")
    window.update()
    seen["label_es"] = label.cget("text")
    seen["status_es"] = status.cget("text")
    assert core.load_settings()["lang"] == "es"
    # Version installée simulée : le bouton lance Orbe.
    folder = core.home() / "versions" / "1.0.0" / "app"
    folder.mkdir(parents=True)
    (folder / "server.py").write_text("")
    (core.home() / "current.txt").write_text("1.0.0")
    button.invoke()
    window.after(1500, lambda: click_open(window, button, status))


def click_open(window, button, status):
    seen["ready"] = status.cget("text")
    seen["btn_es"] = button.cget("text")
    button.invoke()


def fake_loop(window, n=0):
    window.after(1500, lambda: scenario(window))
    real_loop(window, n)


tk.Tk.mainloop = fake_loop
launcher.run_window()
print(seen, launched)
assert seen["label_es"] == "Idioma" and seen["status_es"] == "Buscando actualizaciones…"
assert seen["btn_fr"] == "Mettre à jour" and seen["btn_es"] == "Abrir Orbe"
assert "1.0.0" in seen["ready"]
assert launched == [("1.0.0", "es")]
print("OK")
