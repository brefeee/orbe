"""Fenêtre du launcher d'Orbe : choix de la langue, mise à jour et lancement. --auto fait tout sans fenêtre."""
from __future__ import annotations

import sys
import threading

import launcher_core as core

LANGS = {"fr": "Français", "en": "English", "es": "Español"}
TEXT = {
    "fr": {"lang": "Langue", "check": "Recherche de mises à jour…", "get": "Téléchargement : {} %", "ready": "Orbe {} est prêt.", "open": "Ouvrir Orbe", "update": "Mettre à jour", "none": "Orbe n'est pas encore installé. Vérifie ta connexion puis réessaie.", "offline": "Mise à jour impossible : Orbe {} reste utilisable."},
    "en": {"lang": "Language", "check": "Checking for updates…", "get": "Downloading: {}%", "ready": "Orbe {} is ready.", "open": "Open Orbe", "update": "Update", "none": "Orbe is not installed yet. Check your connection and try again.", "offline": "Could not update: Orbe {} can still be used."},
    "es": {"lang": "Idioma", "check": "Buscando actualizaciones…", "get": "Descargando: {} %", "ready": "Orbe {} está listo.", "open": "Abrir Orbe", "update": "Actualizar", "none": "Orbe aún no está instalado. Comprueba tu conexión e inténtalo de nuevo.", "offline": "No se pudo actualizar: Orbe {} sigue disponible."},
}


def run_auto() -> int:
    core.home().mkdir(parents=True, exist_ok=True)
    version, error = core.update_if_needed()
    with open(core.home() / "launcher.log", "a", encoding="utf-8") as log:
        log.write(f"version={version} erreur={error}\n")
    if not version:
        return 2
    core.launch(version, core.load_settings().get("lang", "fr"))
    return 0


def run_window() -> None:
    import tkinter as tk
    from tkinter import ttk

    settings = core.load_settings()
    lang = settings.get("lang") if settings.get("lang") in LANGS else "fr"
    window = tk.Tk()
    window.title("Orbe")
    window.geometry("420x210")
    window.resizable(False, False)
    frame = ttk.Frame(window, padding=20)
    frame.pack(fill="both", expand=True)
    label = ttk.Label(frame)
    label.pack(anchor="w")
    choice = ttk.Combobox(frame, values=list(LANGS.values()), state="readonly")
    choice.set(LANGS[lang])
    choice.pack(fill="x", pady=(4, 12))
    status = ttk.Label(frame, wraplength=370)
    status.pack(anchor="w")
    bar = ttk.Progressbar(frame, maximum=100)
    bar.pack(fill="x", pady=8)
    state = {"version": None, "busy": False, "message": ("check", None)}

    def text(key):
        return TEXT[settings.get("lang", lang)][key]

    def show(key, value=None):
        state["message"] = (key, value)
        status.config(text=text(key).format(value))

    def draw():
        label.config(text=text("lang"))
        button.config(text=text("open") if state["version"] else text("update"))
        show(*state["message"])

    def finish(version, error):
        state.update(version=version, busy=False)
        bar["value"] = 100 if version else 0
        show("offline" if version and error else "ready" if version else "none", version)
        button.config(state="normal")
        draw()

    def work():
        def progress(done, total):
            window.after(0, lambda: (bar.configure(value=done * 100 / total), show("get", done * 100 // total)))
        version, error = core.update_if_needed(progress)
        window.after(0, lambda: finish(version, error))

    def check():
        if state["busy"]:
            return
        state["busy"] = True
        button.config(state="disabled")
        show("check")
        threading.Thread(target=work, daemon=True).start()

    def press():
        if state["version"]:
            core.launch(state["version"], settings.get("lang", lang))
            window.destroy()
        else:
            check()

    def pick(_event):
        settings["lang"] = next(code for code, name in LANGS.items() if name == choice.get())
        core.save_settings(settings)
        draw()

    button = ttk.Button(frame, command=press)
    button.pack(anchor="e")
    choice.bind("<<ComboboxSelected>>", pick)
    draw()
    check()
    window.mainloop()


if __name__ == "__main__":
    if "--auto" in sys.argv:
        sys.exit(run_auto())
    run_window()
