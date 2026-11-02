"""Fenêtre du launcher d'Orbe : présentation, langue, mise à jour, lancement et installation complète. --auto fait tout sans fenêtre."""
from __future__ import annotations

import math
import random
import sys
import threading

import launcher_core as core

LANGS = {"fr": "Français", "en": "English", "es": "Español"}
TEXT = {
    "fr": {"tag": "Tout ce que tu sais, sur une carte en 3D.", "by": "Créé par brefeee", "check": "Recherche de mises à jour…", "get": "Téléchargement : {} %", "ready": "Orbe {} est prêt.", "open": "Ouvrir Orbe", "update": "Réessayer", "none": "Orbe n'est pas encore installé. Vérifie ta connexion puis réessaie.", "offline": "Mise à jour impossible : Orbe {} reste utilisable.",
           "points": "points de connaissance", "places": "lieux, astres, œuvres", "wiki": "titres Wikipédia", "stars": "étoiles Gaia",
           "f1": "Une carte 3D pour explorer tes connaissances", "f2": "Un espace privé qui reste sur ton PC", "f3": "Seul ce que tu explores est installé", "f4": "Claude et d'autres IA peuvent s'y connecter",
           "all": "Tout installer ({})", "allnone": "Tout l'atlas : bientôt disponible", "alldone": "Tout l'atlas est installé", "allask": "Installer tout l'atlas ?\n\n{} seront téléchargés et installés sur ce PC. Ce n'est pas obligatoire : sans ça, Orbe installe seulement ce que tu explores.", "alltitle": "Tout installer", "allget": "Installation de l'atlas : {} %", "allerr": "Installation interrompue : relance-la, elle reprendra où elle s'est arrêtée."},
    "en": {"tag": "Everything you know, on a 3D map.", "by": "Made by brefeee", "check": "Checking for updates…", "get": "Downloading: {}%", "ready": "Orbe {} is ready.", "open": "Open Orbe", "update": "Try again", "none": "Orbe is not installed yet. Check your connection and try again.", "offline": "Could not update: Orbe {} can still be used.",
           "points": "knowledge points", "places": "places, stars, works", "wiki": "Wikipedia titles", "stars": "Gaia stars",
           "f1": "A 3D map to explore what you know", "f2": "A private space that stays on your PC", "f3": "Only what you explore gets installed", "f4": "Claude and other AIs can connect to it",
           "all": "Install everything ({})", "allnone": "Full atlas: coming soon", "alldone": "The full atlas is installed", "allask": "Install the full atlas?\n\n{} will be downloaded and installed on this PC. This is optional: without it, Orbe only installs what you explore.", "alltitle": "Install everything", "allget": "Installing the atlas: {}%", "allerr": "Installation stopped: start it again and it will resume."},
    "es": {"tag": "Todo lo que sabes, en un mapa 3D.", "by": "Creado por brefeee", "check": "Buscando actualizaciones…", "get": "Descargando: {} %", "ready": "Orbe {} está listo.", "open": "Abrir Orbe", "update": "Reintentar", "none": "Orbe aún no está instalado. Comprueba tu conexión e inténtalo de nuevo.", "offline": "No se pudo actualizar: Orbe {} sigue disponible.",
           "points": "puntos de conocimiento", "places": "lugares, astros, obras", "wiki": "títulos de Wikipedia", "stars": "estrellas Gaia",
           "f1": "Un mapa 3D para explorar lo que sabes", "f2": "Un espacio privado que se queda en tu PC", "f3": "Solo se instala lo que exploras", "f4": "Claude y otras IA pueden conectarse",
           "all": "Instalar todo ({})", "allnone": "Atlas completo: próximamente", "alldone": "El atlas completo está instalado", "allask": "¿Instalar todo el atlas?\n\nSe descargarán e instalarán {} en este PC. Es opcional: sin ello, Orbe solo instala lo que exploras.", "alltitle": "Instalar todo", "allget": "Instalando el atlas: {} %", "allerr": "Instalación interrumpida: vuelve a iniciarla y continuará."},
}
WIDTH, HEIGHT = 960, 620
INK, DIM, GOLD, BLUE, CARD = "#F4F1DE", "#9AA5C8", "#F2C14E", "#7FD1FF", "#161C3D"


def run_auto() -> int:
    core.home().mkdir(parents=True, exist_ok=True)
    version, error = core.update_if_needed()
    with open(core.home() / "launcher.log", "a", encoding="utf-8") as log:
        log.write(f"version={version} erreur={error}\n")
    if not version:
        return 2
    core.launch(version, core.load_settings().get("lang", "fr"))
    return 0


def short_number(value: int, lang: str) -> str:
    """1868263422 -> « 1,87 Md », pour que les grands nombres restent lisibles."""
    comma = "." if lang == "en" else ","
    for size, unit in ((10 ** 9, {"fr": "Md", "en": "B", "es": "mM"}[lang]), (10 ** 6, "M"), (10 ** 3, "k")):
        if value >= size:
            return f"{value / size:.2f}".replace(".", comma) + " " + unit
    return str(value)


def size_text(bytes_count: int, lang: str) -> str:
    return f"{bytes_count / 1024 ** 3:.1f}".replace(".", "." if lang == "en" else ",") + (" GB" if lang == "en" else " Go")


def run_window() -> None:
    import tkinter as tk
    from tkinter import messagebox

    settings = core.load_settings()
    if settings.get("lang") not in LANGS:
        settings["lang"] = "fr"
    window = tk.Tk()
    window.title("Orbe")
    window.resizable(False, False)
    window.configure(bg="#090C20")
    x, y = (window.winfo_screenwidth() - WIDTH) // 2, max((window.winfo_screenheight() - HEIGHT) // 2 - 30, 0)
    window.geometry(f"{WIDTH}x{HEIGHT}+{x}+{y}")
    try:
        window.iconbitmap(core._bundled("logo.ico"))
    except tk.TclError:
        pass
    canvas = tk.Canvas(window, width=WIDTH, height=HEIGHT, bg="#090C20", highlightthickness=0)
    canvas.pack()
    for band in range(30):  # dégradé de nuit, du bleu au noir
        shade = 1 - band / 30
        color = f"#{int(9 + 12 * shade):02x}{int(12 + 16 * shade):02x}{int(32 + 40 * shade):02x}"
        canvas.create_rectangle(0, band * HEIGHT / 30, WIDTH, (band + 1) * HEIGHT / 30, fill=color, outline=color)
    rng = random.Random(7)
    stars = []
    for _ in range(140):
        sx, sy, radius = rng.uniform(0, WIDTH), rng.uniform(0, HEIGHT), rng.choice((1, 1, 1, 1.5, 2))
        stars.append((canvas.create_oval(sx - radius, sy - radius, sx + radius, sy + radius, fill="#3a4470", outline=""), rng.uniform(0, 6.28), rng.uniform(0.6, 1.8)))
    state = {"version": None, "busy": False, "message": ("check", None), "full": None, "tick": 0.0}

    logo_big = None
    try:
        logo_big = tk.PhotoImage(file=str(core._bundled("logo.png"))).subsample(3, 3)
        logo_item = canvas.create_image(150, 150, image=logo_big)
    except tk.TclError:
        logo_item = None
    orbit = canvas.create_oval(0, 0, 10, 10, fill=INK, outline="")
    title = canvas.create_text(290, 90, text="ORBE", anchor="w", fill=INK, font=("Segoe UI Light", 58))
    tagline = canvas.create_text(294, 158, anchor="w", fill=INK, font=("Segoe UI", 18))
    author = canvas.create_text(294, 192, anchor="w", fill=BLUE, font=("Segoe UI", 12))

    cards = []
    for index, value in enumerate(("points", "places", "wiki", "stars")):
        left = 40 + index * 224
        canvas.create_rectangle(left, 268, left + 208, 362, fill=CARD, outline="#2B3566")
        cards.append((value, canvas.create_text(left + 18, 298, anchor="w", fill=GOLD, font=("Segoe UI Semibold", 24)),
                      canvas.create_text(left + 18, 338, anchor="w", fill=DIM, font=("Segoe UI", 11))))
    features = [canvas.create_text(58 + (i % 2) * 440, 396 + (i // 2) * 30, anchor="w", fill=INK, font=("Segoe UI", 12)) for i in range(4)]
    for i in range(4):
        cx, cy = 44 + (i % 2) * 440, 396 + (i // 2) * 30
        canvas.create_oval(cx - 4, cy - 4, cx + 4, cy + 4, fill=GOLD, outline="")

    status = canvas.create_text(40, 478, anchor="w", fill=DIM, font=("Segoe UI", 11), width=880)
    canvas.create_rectangle(40, 496, 920, 504, fill=CARD, outline="")
    bar = canvas.create_rectangle(40, 496, 40, 504, fill=GOLD, outline="")

    def set_bar(percent):
        canvas.coords(bar, 40, 496, 40 + 880 * max(0, min(percent, 100)) / 100, 504)

    def text(key):
        return TEXT[settings["lang"]][key]

    open_button = tk.Button(window, command=lambda: press(), bg=GOLD, fg="#141832", activebackground="#FFD97A", relief="flat", cursor="hand2", font=("Segoe UI Semibold", 15), bd=0)
    full_button = tk.Button(window, command=lambda: install_all(), bg=CARD, fg=INK, activebackground="#2B3566", activeforeground=INK, disabledforeground=DIM, relief="flat", cursor="hand2", font=("Segoe UI", 12), bd=0)
    canvas.create_window(920, 560, anchor="e", window=open_button, width=240, height=56)
    canvas.create_window(660, 560, anchor="e", window=full_button, width=300, height=56)
    choice = tk.StringVar(value=LANGS[settings["lang"]])
    menu = tk.OptionMenu(window, choice, *LANGS.values(), command=lambda _v: pick())
    menu.config(bg=CARD, fg=INK, activebackground="#2B3566", activeforeground=INK, relief="flat", highlightthickness=0, bd=0, font=("Segoe UI", 11))
    canvas.create_window(40, 560, anchor="w", window=menu, width=130, height=40)

    def show(key, value=None):
        state["message"] = (key, value)
        canvas.itemconfig(status, text=text(key).format(value))

    def draw():
        lang = settings["lang"]
        canvas.itemconfig(tagline, text=text("tag"))
        canvas.itemconfig(author, text=text("by"))
        stats = settings.get("stats") or {}
        atlas, wiki, gaia = int(stats.get("atlas", 0)), int(stats.get("wiki", 0)), int(stats.get("gaia", 0))
        values = {"points": atlas + wiki + gaia, "places": atlas, "wiki": wiki, "stars": gaia}
        for key, number, label in cards:
            canvas.itemconfig(number, text=short_number(values[key], lang) if values[key] else "—")
            canvas.itemconfig(label, text=text(key))
        for i, item in enumerate(features):
            canvas.itemconfig(item, text=text(f"f{i + 1}"))
        open_button.config(text=text("open") if state["version"] else text("update"))
        if core.has_local_atlas():
            full_button.config(text=text("alldone"), state="disabled")
        elif state["full"]:
            full_button.config(text=text("all").format(size_text(state["full"]["size"], lang)), state="normal")
        else:
            full_button.config(text=text("allnone"), state="disabled")
        show(*state["message"])

    def finish(version, error):
        state.update(version=version, busy=False)
        set_bar(100 if version else 0)
        show("offline" if version and error else "ready" if version else "none", version)
        open_button.config(state="normal")
        draw()

    def work():
        def progress(done, total):
            window.after(0, lambda: (set_bar(done * 100 / total), show("get", done * 100 // total)))
        version, error = core.update_if_needed(progress)
        core.remember_atlas()
        settings.update({k: v for k, v in core.load_settings().items() if k in ("atlas", "stats")})
        state["full"] = core.full_list()
        window.after(0, lambda: finish(version, error))

    def check():
        if state["busy"]:
            return
        state["busy"] = True
        open_button.config(state="disabled")
        show("check")
        threading.Thread(target=work, daemon=True).start()

    def press():
        if state["version"]:
            core.launch(state["version"], settings["lang"])
            window.destroy()
        else:
            check()

    def install_all():
        data = state["full"]
        if not data or state["busy"]:
            return
        if not messagebox.askyesno(text("alltitle"), text("allask").format(size_text(data["size"], settings["lang"])), parent=window):
            return
        state["busy"] = True
        open_button.config(state="disabled")
        full_button.config(state="disabled")

        def job():
            def progress(done, total):
                window.after(0, lambda: (set_bar(done * 100 / total), show("allget", done * 100 // total)))
            try:
                core.install_full(data, progress)
                window.after(0, lambda: finish(state["version"], None))
            except core.LauncherError:
                window.after(0, lambda: (finish(state["version"], None), show("allerr")))
        threading.Thread(target=job, daemon=True).start()

    def pick():
        settings["lang"] = next(code for code, name in LANGS.items() if name == choice.get())
        current = core.load_settings()
        current["lang"] = settings["lang"]
        core.save_settings(current)
        draw()

    def animate():
        state["tick"] += 0.04
        tick = state["tick"]
        for item, phase, speed in stars:
            level = 0.5 + 0.5 * math.sin(tick * speed + phase)
            canvas.itemconfig(item, fill=f"#{int(50 + 150 * level):02x}{int(60 + 150 * level):02x}{int(100 + 130 * level):02x}")
        ax, ay = 63 * math.cos(tick * 0.9), 23 * math.sin(tick * 0.9)
        tilt = math.radians(-28)
        ox, oy = 150 + ax * math.cos(tilt) - ay * math.sin(tilt), 150 + ax * math.sin(tilt) + ay * math.cos(tilt)
        canvas.coords(orbit, ox - 5, oy - 5, ox + 5, oy + 5)
        if logo_item is not None:
            canvas.tag_raise(orbit if ay >= 0 else logo_item)
        window.after(50, animate)

    draw()
    check()
    animate()
    window.mainloop()


if __name__ == "__main__":
    if "--auto" in sys.argv:
        sys.exit(run_auto())
    run_window()
