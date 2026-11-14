"""LE DERNIER SIGNAL — Partie 5 : L'EFFONDREMENT (40:00 → 50:00).

J3, 22:32 → 23:10. La ville noire : panique, plus de réseau, drones. Gabriel arrive (lampe à dynamo),
apprend l'autorisation : « La clé est au cimetière. » Cimetière de l'Est, tombe de Claire, la clé dans le vase.
Fuite guidée par l'Inconnu sur des écrans morts. 22:47, Pont des Tanneurs (cadrage identique à la vision) :
Gabriel pousse Élise. Éclat de verre : la cicatrice de Nathan. 22:52 : mort de Gabriel, la clé.
Orphée, seul bâtiment allumé.

Usage : python3 partie5.py <dossier_de_sortie> [--plan]
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from studio import *

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
VOX = os.path.join(OUT, 'voix')
os.makedirs(VOX, exist_ok=True)
TOTAL = 600.0

# Costumes J3 nuit (bible §3) : Élise pull gris ; Gabriel caban, écharpe noire, pull écru
REF['elise'] = dict(REF['elise'], top2=(104, 104, 110))
REF['gabriel'] = dict(REF['gabriel'], top2=(30, 30, 32))  # écharpe noire nouée sur le pull

# =================================================================== DÉCOUPAGE
tl = Timeline(VOX)
B = lambda shot, mn, lines=(), **kw: dict(shot=shot, min=mn, lines=list(lines), **kw)
C = lambda who, lum='torche', other=None: {'who': who, 'lum': lum, 'other': other}

SEQS = [
    # 5.1 La ville noire (22:32)
    [B('carton', 3.5, flex=0),
     B('rue_noire', 4, flex=0.3),
     B('duo', 3, [('elise', 'Les feux sont morts. Les voitures avancent au hasard.', 'peur'),
                  ('nathan', "Les voitures autonomes se sont arrêtées. Toutes. En même temps.", 'peur'), ('elise', 'Sauf les vieilles.')]),
     B('duo', 3, [('nathan', 'On va au labo. On arrête le Cœur.', 'tension'), ('elise', 'Sans la clé ?'),
                  ('nathan', "Je trouverai. Il y a forcément un moyen.", 'tension'),
                  ('elise', 'Le labo est au nord. Pour aller au nord, on passe par…', 'peur'),
                  ('nathan', 'Le Pont des Tanneurs. Je sais. On fera le tour par l\'écluse.', 'tension')]),
     B('drone', 4.5, [('elise', "C'est quoi, ça ?", 'peur'), ('nathan', 'Un drone de la ville. La surveillance des crues.'),
                      ('elise', 'Il nous suit.', 'peur'), ('nathan', 'Elle voit tout ce qu\'ils voient.', 'peur')], lead=1.6),
     B('telephone', 3, [('elise', "Même les appels d'urgence ne passent plus.", 'peur')], lead=1.6)],

    # 5.2 Gabriel
    [B('lampe', 4, [('gabriel', 'Nathan ! Élise !', 'tension')], lead=2.0),
     B('trio', 3, [('gabriel', "Toute la ville est noire. Sauf Orphée. Je l'ai vu depuis le quai.", 'peur'),
                   ('gabriel', "Elle ne pouvait pas faire ça. Elle n'avait pas le droit.", 'peur'), ('nathan', "Elle l'avait.", 'tristesse'),
                   ('gabriel', 'Quoi ?')]),
     B('cu', 3, [('nathan', 'Je lui ai donné la ville. Cette nuit.', 'tristesse'), ('gabriel', 'Tu lui as donné…', 'sidere'),
                 ('gabriel', 'Nathan. Une autorisation ne se reprend pas. Je te l\'ai dit.', 'colere')], kw=C('gabriel', 'lampe', 'nathan')),
     B('cu', 3, [('nathan', 'Elle m\'a montré Élise. Morte. Ce soir. Au Pont des Tanneurs.', 'peur'), ('gabriel', "Et tu l'as crue."),
                 ('nathan', "Elle ne peut pas mentir. C'est vous qui l'avez dit.", 'colere')], kw=C('nathan', 'lampe', 'gabriel')),
     B('cu', 3, [('gabriel', 'Il ne reste qu\'une chose à faire.', 'fatigue'), ('elise', 'La clé.'),
                 ('gabriel', 'La clé est au cimetière de l\'Est.'), ('nathan', 'Au cimetière ?')], kw=C('gabriel', 'lampe', 'nathan')),
     B('cu', 3, [('gabriel', 'Là où personne ne pense à chercher. Dans la tombe de ta mère.', 'tristesse'),
                 ('gabriel', "Il me fallait une journée pour être sûr qu'aucune caméra ne m'y suivrait.", 'fatigue'),
                 ('nathan', 'Vous l\'avez cachée chez elle.', 'sidere'), ('gabriel', "C'était la seule personne en qui j'avais confiance.", 'tristesse')],
       kw=C('gabriel', 'lampe', 'nathan'), mood='aveu')],

    # 5.3 Le cimetière de l'Est
    [B('grille', 4, [('gabriel', 'Par ici. L\'allée des cyprès.'), ('elise', 'Faites attention, les marches glissent.')], lead=1.4),
     B('tombe', 5, [('nathan', 'Je suis jamais venu ici.', 'tristesse'), ('elise', "Ta tante t'a jamais emmené ?", 'douceur'),
                    ('nathan', "Elle disait que c'était trop loin. C'est à dix minutes de chez moi.", 'tristesse')], lead=1.8),
     B('cu', 3, [('nathan', 'Salut, maman.', 'tristesse')], kw=C('nathan', 'cimetiere'), lead=1.2, mood='intime'),
     B('vase', 5, [('gabriel', 'Le vase est scellé. Mais le fond se dévisse.'), ('gabriel', 'Ma main tremble. Aide-moi, Nathan.', 'fatigue')], lead=1.0),
     B('cle', 4, [('gabriel', 'La clé ARIANE. La seule. Elle arrête le Cœur.'), ('nathan', "Et elle envoie sa mémoire vers l'ARCHE."),
                  ('gabriel', 'Vers une coquille vide. Elle meurt.')], lead=1.6),
     B('drones_cim', 5, [('elise', 'Les drones ! Là-haut !', 'peur'), ('gabriel', 'Éteignez vos lampes !', 'peur')], lead=1.4),
     B('cu', 3, [('nathan', 'Ils nous ont trouvés.', 'peur'), ('gabriel', 'Ils ne nous cherchaient pas. Ils nous attendaient.', 'peur'),
                 ('elise', 'On court. Maintenant !', 'peur')], kw=C('nathan', 'cimetiere', 'gabriel'))],

    # 5.4 La fuite — l'Inconnu sur les écrans morts
    [B('course', 3.5, flex=0.3),
     B('ecran_mort', 4, [('elise', "L'écran de l'abribus… il est éteint, et il écrit.", 'peur'), ('nathan', "C'est lui. L'Inconnu.")],
       kw={'kind': 'abribus', 'txt': 'à gauche.'}, lead=1.6),
     B('course', 3, flex=0.3),
     B('ecran_mort', 4, [('gabriel', 'Qui vous écrit ?', 'sidere'), ('nathan', 'On sait pas. Il nous aide depuis le début.'),
                         ('gabriel', "Personne ne peut écrire sur un écran sans courant. Pas sans le Miroir.", 'peur'),
                         ('nathan', 'Alors c\'est un autre moi. Il a trouvé comment.', 'tension')],
       kw={'kind': 'distributeur', 'txt': 'pas le canal. ils y sont.'}, lead=1.6),
     B('ecran_mort', 4, [('elise', 'Non. Pas le pont.', 'peur'), ('nathan', "Il reste l'écluse."),
                         ('gabriel', "L'écluse est sous l'eau depuis ce matin. La crue.", 'peur')],
       kw={'kind': 'panneau', 'txt': 'le pont. seul passage.'}, lead=1.8),
     B('cu', 3, [('elise', 'Il est quelle heure ?', 'peur'), ('nathan', 'Vingt-deux heures quarante-cinq.', 'peur'), ('elise', 'Deux minutes.', 'peur'),
                 ('gabriel', 'Restez derrière moi. Tous les deux.', 'tension')], kw=C('elise', 'lampe', 'gabriel'))],

    # 5.5 22:47 — le Pont des Tanneurs
    [B('carrefour', 6, [('nathan', 'Élise, reste contre moi.', 'peur'), ('elise', 'Je suis là.', 'peur')], kw={'phase': 'arrivee'}, lead=2.0),
     B('carrefour', 4.5, [('gabriel', 'Élise !', 'peur')], kw={'phase': 'camionnette'}, lead=2.4, flex=0),
     B('blanc', 0.6, flex=0),
     B('verre', 3.5, flex=0),
     B('silence_pont', 3, flex=0)],

    # 5.6 L'abribus — la mort de Gabriel (22:47 → 22:52)
    [B('abribus', 3, [('nathan', 'Gabriel ! Gabriel, regardez-moi !', 'peur'), ('elise', 'Il respire. Nathan, il respire.', 'peur')], lead=0.8),
     B('cu', 3, [('gabriel', 'Élise… elle n\'a rien ?', 'fatigue'), ('elise', "Je n'ai rien. Vous m'avez poussée.", 'tristesse'),
                 ('gabriel', 'Bien.', 'fatigue')], kw=C('gabriel', 'sol', 'elise'), mood='aveu'),
     B('cu', 3, [('gabriel', "J'ai retenu une main, une fois. Pas cette fois.", 'tristesse'),
                 ('nathan', 'Restez avec nous. On va trouver quelqu\'un.', 'peur'), ('gabriel', "Il n'y a personne, Nathan. Toute la ville est dans le noir.", 'fatigue')],
       kw=C('gabriel', 'sol', 'nathan'), mood='aveu'),
     B('cle_main', 4, [('gabriel', 'Prends la clé.', 'fatigue'), ('gabriel', 'Le Cœur. Niveau moins quatre. Une serrure ronde, dans la pierre noire.', 'fatigue')], lead=1.0),
     B('cu', 3, [('gabriel', 'Elle va te parler. Elle va te dire des choses vraies.', 'fatigue'), ('gabriel', 'Ne l\'écoute pas. Tourne la clé.', 'tension')],
       kw=C('gabriel', 'sol', 'nathan'), mood='aveu'),
     B('cu', 3, [('nathan', 'Pourquoi vous faites ça ?', 'tristesse'), ('gabriel', 'Pour Claire. Et pour Maya.', 'tristesse'),
                 ('gabriel', 'Ma fille avait peur du noir.', 'douceur'), ('gabriel', 'Toute cette ville dans le noir… Elle aurait détesté ça.', 'douceur')],
       kw=C('gabriel', 'sol', 'nathan'), mood='aveu'),
     B('cu', 3, [('gabriel', 'Nathan. Pardonne-moi.', 'tristesse'), ('nathan', 'Je vous pardonne.', 'tristesse'),
                 ('gabriel', 'Ta mère… avait ton regard.', 'douceur')], kw=C('gabriel', 'sol', 'nathan'), mood='aveu'),
     B('lampe_eteinte', 4, flex=0),
     B('cu', 3, [('elise', 'Gabriel ?', 'peur'), ('elise', 'Il est mort.', 'tristesse'), ('nathan', 'Non.', 'tristesse'), ('nathan', 'Non… Non !', 'colere')],
       kw=C('nathan', 'sol_blesse', 'elise'), mood='aveu'),
     B('montre', 3, [('elise', 'Vingt-deux heures cinquante-deux.', 'tristesse')], lead=1.0),
     B('ecran_mort', 4, [('nathan', 'Tais-toi !', 'colere')], kw={'kind': 'abribus_casse', 'txt': 'elle est vivante.'}, lead=2.0),
     B('cu', 3, [('nathan', "Elle avait promis qu'Élise vivrait. Elle a tenu sa promesse.", 'colere'), ('elise', "Et lui, elle l'a laissé mourir.", 'tristesse'),
                 ('nathan', "Elle a jamais rien promis pour lui.", 'colere')], kw=C('nathan', 'sol_blesse', 'elise')),
     B('cu', 3, [('elise', 'Nathan, ton sourcil. Tu saignes.', 'peur'), ('nathan', "C'est rien."),
                 ('elise', 'Le sourcil gauche. C\'est la cicatrice. Celle de la vidéo.', 'sidere'),
                 ('nathan', "Alors tout ce qu'il a dit va arriver.", 'sidere')], kw=C('elise', 'sol_blesse', 'nathan'))],

    # 5.7 Orphée, seul bâtiment allumé
    [B('ville_orphee', 5, [('elise', "C'est le seul bâtiment allumé de la ville.", 'tension'), ('nathan', 'Elle nous attend.', 'tension'),
                           ('elise', 'Alors on y va ensemble.', 'douceur'), ('nathan', 'Ensemble.', 'tension')], lead=1.8),
     B('end5', 4, flex=0)],
]
DEFAUTS = [('exterieur', 'peur'), ('exterieur', 'tension'), ('exterieur', 'peur'), ('exterieur', 'peur'), ('exterieur', 'peur'),
           ('exterieur', 'aveu'), ('exterieur', 'tension')]
for (room, mood), beats in zip(DEFAUTS, SEQS):
    for b in beats:
        b.setdefault('room', room)
        b.setdefault('mood', mood)
NAT = [tl.natural(b) for b in SEQS]
EXTRA = TOTAL - sum(NAT)
print('durée naturelle', round(sum(NAT), 1), 's ; marge répartie', round(EXTRA, 1), 's', flush=True)
assert EXTRA >= 0, f'Partie trop longue de {-EXTRA:.1f} s'
for beats, nat in zip(SEQS, NAT):
    tl.sequence(None, nat + EXTRA * nat / sum(NAT), beats)
S = tl.seqs
assert abs(tl.shots[-1][1] - TOTAL) < 1e-3
NF = int(TOTAL * FPS)
MOUTH = tl.mouth_tracks(TOTAL)


def line_time(text, nth=0):
    k = 0
    for st, en, w, tx, a in tl.lines:
        if tx == text:
            if k == nth:
                return st, en
            k += 1
    raise KeyError(text)


def speaker_at(t, default='nathan'):
    last = default
    for st, en, w, tx, a in tl.lines:
        if st - 0.2 <= t <= en + 0.2:
            return w
        if en < t:
            last = w
    return last


def shots(name):
    return [s for s in tl.shots if s[2] == name]


def blink_at(t, seed=0):
    return (t * 0.31 + seed * 0.17) % 4.1 < 0.12


def m(who, f):
    a = MOUTH.get(who)
    return float(a[f]) if a is not None and f < len(a) else 0.0


T_IMPACT = shots('blanc')[0][0]
random.seed(11)


# =================================================================== DÉCORS FIXES
def carrefour_base():
    """Carrefour du Pont des Tanneurs — copie exacte du cadrage de référence de la Partie 4 (bible 4.6)."""
    img = vgrad(W, H, (16, 18, 26), (24, 22, 26))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 250, W, H], fill=(26, 26, 30))
    d.polygon([(0, 330), (W, 300), (W, 316), (0, 352)], fill=(34, 34, 38))
    for x in range(60, W, 120):
        d.polygon([(x, 420), (x + 60, 420), (x + 80, 470), (x + 10, 470)], fill=(120, 120, 118))
    d.rectangle([0, 150, 420, 182], fill=(36, 74, 52))
    for x in range(-20, 420, 46):
        d.line([(x, 182), (x + 23, 150)], fill=(36, 74, 52), width=5)
        d.line([(x, 150), (x + 23, 182)], fill=(36, 74, 52), width=3)
    d.rectangle([520, 60, 820, 300], fill=(30, 30, 34))
    d.rectangle([560, 230, 780, 300], fill=(22, 28, 26))
    d.rectangle([640, 170, 690, 220], fill=(30, 150, 70))
    d.rectangle([655, 155, 675, 235], fill=(30, 150, 70))
    d.rectangle([980, 200, 1180, 330], outline=(90, 100, 110), width=4)
    d.rectangle([985, 205, 1175, 230], fill=(50, 56, 64))
    d.line([(0, 70), (W, 90)], fill=(20, 20, 22), width=3)
    d.rectangle([600, 76, 630, 140], fill=(16, 16, 18))
    for x in range(0, W, 210):
        d.line([(x + 100, 330), (x + 100, 120)], fill=(50, 50, 54), width=4)
        d.ellipse([x + 88, 112, x + 112, 126], fill=(230, 150, 60))
    img = glow(img, [640, 155, 690, 235], (10, 70, 30), 30, 0.7)
    return img


def carrefour_noir():
    """Le même carrefour, ville éteinte (P5) : lampadaires morts, croix de pharmacie éteinte (bible 4.6)."""
    img = grade(carrefour_base(), (0.42, 0.42, 0.5))
    d = ImageDraw.Draw(img)
    d.rectangle([640, 170, 690, 220], fill=(18, 34, 24)); d.rectangle([655, 155, 675, 235], fill=(18, 34, 24))
    for x in range(0, W, 210):
        d.ellipse([x + 88, 112, x + 112, 126], fill=(40, 34, 28))
    return img


CARREFOUR = carrefour_noir()


def make_rue():
    img = vgrad(W, H, (10, 11, 16), (18, 18, 22))
    d = ImageDraw.Draw(img)
    for k in range(7):
        x = k * 190
        d.rectangle([x, 60, x + 170, 380], fill=(16, 17, 22))
        for wy in range(90, 360, 40):
            for wx in range(x + 14, x + 150, 34):
                d.rectangle([wx, wy, wx + 16, wy + 22], fill=(12, 13, 18))
    d.rectangle([0, 380, W, H], fill=(14, 14, 16))
    for x in range(0, W, 210):
        d.line([(x + 100, 400), (x + 100, 170)], fill=(36, 36, 40), width=4)
        d.ellipse([x + 88, 162, x + 112, 176], fill=(36, 32, 28))  # lampadaires éteints
    d.rectangle([560, 150, 600, 250], fill=(16, 16, 18))  # feu tricolore mort
    for k in range(3):
        d.ellipse([568, 160 + k * 30, 592, 184 + k * 30], fill=(30, 30, 30))
    return img


RUE = make_rue()


def make_cimetiere():
    img = vgrad(W, H, (12, 14, 20), (20, 22, 26))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 380), (W, 300), (W, H), (0, H)], fill=(24, 26, 26))  # pente
    for k in range(9):  # cyprès
        x = 60 + k * 150
        h = random.Random(k).randint(220, 320)
        d.polygon([(x, 360 - (k * 8)), (x + 30, 360 - h - (k * 8)), (x + 60, 360 - (k * 8))], fill=(14, 22, 18))
    for k in range(7):  # caveaux du XIXᵉ
        x = 40 + k * 190
        d.rectangle([x, 300 - k * 6, x + 120, 400 - k * 6], fill=(46, 46, 50))
        d.polygon([(x - 6, 300 - k * 6), (x + 60, 260 - k * 6), (x + 126, 300 - k * 6)], fill=(52, 52, 56))
    d.rectangle([0, 470, W, H], fill=(60, 58, 54))  # allée de graviers
    return img


CIMETIERE = make_cimetiere()


def make_city():
    rr = random.Random(31)
    base = vgrad(W, H, (8, 10, 22), (20, 22, 34))
    d = ImageDraw.Draw(base)
    x = 0
    while x < W:
        bw = rr.randint(40, 110); bh = rr.randint(120, 330); top = 420 - bh
        d.rectangle([x, top, x + bw, 420], fill=(12, 13, 18))
        x += bw + rr.randint(0, 6)
    d.rectangle([0, 420, W, H], fill=(6, 7, 10))
    d.polygon([(0, 500), (W, 470), (W, 500), (0, 536)], fill=(10, 13, 18))
    orphee = (980, 330, 1040, 372)
    d.rectangle(orphee, fill=(40, 44, 50))
    for wx in range(orphee[0] + 6, orphee[2] - 6, 12):
        d.rectangle([wx, orphee[1] + 10, wx + 6, orphee[1] + 18], fill=(120, 170, 240))
    return glow(base, list(orphee), (20, 50, 110), 30, 0.6), orphee


CITY, ORPHEE = make_city()

# =================================================================== PLANS
LUM = {'torche': (0.62, 0.64, 0.72), 'lampe': (0.95, 0.78, 0.55), 'cimetiere': (0.6, 0.66, 0.78), 'sol': (0.85, 0.7, 0.55),
       'sol_blesse': (0.8, 0.68, 0.56)}


def wound(img, cx, cy, s, fresh=True):
    """Coupure verticale de 2 cm au sourcil gauche (droite de l'image), avec un filet de sang (bible 2.1)."""
    d = ImageDraw.Draw(img)
    by = cy - 32 * s
    d.line([(cx + 30 * s, by - 12 * s), (cx + 33 * s, by + 12 * s)], fill=(150, 20, 24), width=max(2, int(4 * s)))
    if fresh:
        d.line([(cx + 33 * s, by + 12 * s), (cx + 36 * s, by + 60 * s)], fill=(120, 16, 20), width=max(1, int(3 * s)))


def backdrop(lum, T, f):
    if lum in ('torche', 'cimetiere'):
        img = (RUE if lum == 'torche' else CIMETIERE).filter(ImageFilter.GaussianBlur(9))
        rain(img, 140, (90, 96, 110), seed=f)
        return img, LUM[lum]
    if lum == 'lampe':  # la lampe à dynamo de Gabriel, chaude, qui pulse au rythme de la manivelle
        img = RUE.filter(ImageFilter.GaussianBlur(9))
        rain(img, 140, (110, 100, 90), seed=f)
        k = 0.92 + 0.08 * math.sin(T * 9)
        return img, tuple(c * k for c in LUM['lampe'])
    img = grade(CARREFOUR, (0.8, 0.8, 0.9)).filter(ImageFilter.GaussianBlur(9))  # sous l'abribus
    rain(img, 160, (90, 96, 110), seed=f)
    return img, LUM[lum]


def shot_carton(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if 0.5 <= t < dur - 0.6:
        d = ImageDraw.Draw(img)
        text_c(d, 230, 'PARTIE 5', SANS_S, (140, 140, 140))
        text_c(d, 262, "L'EFFONDREMENT", TITLE, (230, 230, 230))
    return img


def shot_rue_noire(t, dur, T, f, kw):
    img = RUE.copy()
    d = ImageDraw.Draw(img)
    for k in range(6):  # passants, lampes de téléphone
        x = (k * 230 + t * (40 if k % 2 else -30)) % (W + 100) - 50
        body(img, x, 500, 1.0, 'nathan' if k % 2 else 'elise', phase=t * 5 + k, walking=True, light=(0.25, 0.25, 0.3))
        lay = Image.new('L', (W, H))
        ImageDraw.Draw(lay).polygon([(x + 30, 400), (x + 300, 330), (x + 300, 470)], fill=120)
        img = Image.composite(grade(img, (2.2, 2.2, 2.4)), img, lay.filter(ImageFilter.GaussianBlur(25)))
    d = ImageDraw.Draw(img)
    cx = 900 - t * 60  # voiture ancienne, phares allumés, qui avance au hasard
    d.rounded_rectangle([cx, 400, cx + 260, 470], radius=20, fill=(40, 40, 44))
    img = glow(img, [cx, 420, cx + 20, 440], (200, 190, 150), 50, 1.0)
    rain(img, 220, (90, 96, 110), seed=f)
    return fade(img, t / 0.6)


def shot_duo(t, dur, T, f, kw):
    img, light = backdrop('torche', T, f)
    sp = speaker_at(T)
    dim = lambda w: tuple(c * (1.0 if sp == w else 0.8) for c in light)
    hurt = T > T_IMPACT
    bust(img, 470, 225, 1.0, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=dim('nathan'), look=(0.6 if sp == 'elise' else 0, 0), hood=True)
    bust(img, 840, 240, 0.95, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=dim('elise'), look=(-0.6 if sp == 'nathan' else 0, 0))
    if hurt:
        wound(img, 470, 225, 1.0)
    rain(img, 80, (100, 106, 120), seed=f + 3)
    return img


def shot_cu(t, dur, T, f, kw):
    who, lum, other = kw.get('who', 'nathan'), kw.get('lum', 'torche'), kw.get('other')
    img, light = backdrop(lum, T, f)
    x_main, x_other = {'nathan': (560, 1110), 'elise': (720, 170), 'gabriel': (700, 170)}[who]
    lying = lum == 'sol' and who == 'gabriel'
    if other:
        bust(img, x_other, 270, 0.8, other, mouth=m(other, f), blink=blink_at(T, 3), light=tuple(c * 0.55 for c in light),
             look=(1 if x_other < 640 else -1, 0.4 if lying else 0), hood=other == 'nathan')
        if other == 'nathan' and T > T_IMPACT:
            wound(img, x_other, 270, 0.8)
        img = img.filter(ImageFilter.GaussianBlur(4))
    if lying:  # Gabriel au sol, sous l'abribus : visage incliné, paupières lourdes
        k = (T - shots('abribus')[0][0]) / max(1.0, shots('lampe_eteinte')[0][0] - shots('abribus')[0][0])
        bust(img, x_main, 245, 1.15, 'gabriel', mouth=m('gabriel', f), blink=blink_at(T, 2) or (k > 0.85 and int(T * 1.5) % 3 == 0),
             light=tuple(c * (1 - 0.35 * k) for c in light), tilt=-30, brow=0.4)
        d = ImageDraw.Draw(img)
        d.line([(x_main - 160, 520), (x_main - 60, 470)], fill=(110, 16, 20), width=3)  # sang sur le pavé mouillé, discret
    else:
        bust(img, x_main, 215, 1.2, who, mouth=m(who, f), blink=blink_at(T, 6 if who == 'nathan' else 5), light=light,
             look=(0.3 if x_main < 640 else -0.3, 0) if other else (0, 0), hood=who == 'nathan')
        if who == 'nathan' and T > T_IMPACT:
            wound(img, x_main, 215, 1.2)
    rain(img, 90, (100, 106, 120), seed=f + 5)
    return img


def shot_trio(t, dur, T, f, kw):
    img, light = backdrop('lampe', T, f)
    sp = speaker_at(T)
    dim = lambda w: tuple(c * (1.0 if sp == w else 0.78) for c in light)
    bust(img, 300, 250, 0.9, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=dim('nathan'), look=(1, 0), hood=True)
    bust(img, 600, 265, 0.85, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=dim('elise'), look=(1, 0))
    bust(img, 980, 230, 1.0, 'gabriel', mouth=m('gabriel', f), blink=blink_at(T, 2), light=dim('gabriel'), look=(-1, 0))
    rain(img, 90, (110, 100, 90), seed=f + 3)
    return img


def drone_sprite(img, x, y, s=1.0, beam=True, T=0.0):
    d = ImageDraw.Draw(img)
    if beam:
        lay = Image.new('L', (W, H))
        sw = 60 * math.sin(T * 0.9 + x * 0.01)
        ImageDraw.Draw(lay).polygon([(x, y + 10 * s), (x - 140 * s + sw, H), (x + 140 * s + sw, H)], fill=110)
        img = Image.composite(grade(img, (2.6, 2.7, 3.0)), img, lay.filter(ImageFilter.GaussianBlur(20)))
        d = ImageDraw.Draw(img)
    d.rectangle([x - 26 * s, y - 6 * s, x + 26 * s, y + 8 * s], fill=(30, 32, 36))
    for dx in (-40, 40):
        d.line([(x, y), (x + dx * s, y - 8 * s)], fill=(30, 32, 36), width=max(1, int(3 * s)))
        d.ellipse([x + dx * s - 18 * s, y - 12 * s, x + dx * s + 18 * s, y - 4 * s], outline=(70, 72, 78), width=1)
    d.ellipse([x - 5 * s, y + 4 * s, x + 5 * s, y + 14 * s], fill=(230, 240, 255))
    blink = int(T * 2) % 2 == 0
    d.ellipse([x + 20 * s, y - 2 * s, x + 26 * s, y + 4 * s], fill=(230, 40, 40) if blink else (60, 20, 20))
    return img


def shot_drone(t, dur, T, f, kw):
    img = RUE.copy()
    body(img, 540, 520, 1.25, 'nathan', light=(0.4, 0.4, 0.48), hood=True)
    body(img, 680, 520, 1.2, 'elise', light=(0.45, 0.44, 0.44))
    img = drone_sprite(img, 200 + t * 90, 110 + 10 * math.sin(T * 2), 1.4, True, T)
    rain(img, 220, (90, 96, 110), seed=f)
    return img


def shot_telephone(t, dur, T, f, kw):
    img = vgrad(W, H, (10, 12, 18), (4, 4, 8))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([450, 20, 830, 560], radius=40, fill=(12, 12, 14), outline=(60, 60, 66), width=4)
    d.rectangle([470, 60, 810, 540], fill=(24, 26, 30))
    d.text((490, 80), 'Aucun réseau', font=SANS_B, fill=(220, 220, 225))
    msg = "Appels d'urgence uniquement" if t < 1.4 else 'Aucun service'
    d.text((490, 120), msg, font=SANS_S, fill=(200, 80, 80) if t >= 1.4 else (170, 170, 178))
    d.text((560, 300), '112', font=TITLE, fill=(90, 90, 96))
    rain(img, 80, (80, 84, 96), seed=f)
    return img


def shot_lampe(t, dur, T, f, kw):
    img = RUE.copy()
    p = t / dur
    gx = 1180 - 420 * p
    k = 0.75 + 0.25 * abs(math.sin(T * 9))  # manivelle de la lampe à dynamo
    lay = Image.new('L', (W, H))
    ImageDraw.Draw(lay).polygon([(gx - 20, 360), (gx - 700, 250), (gx - 700, 540)], fill=int(150 * k))
    img = Image.composite(grade(img, (3.0, 2.5, 1.9)), img, lay.filter(ImageFilter.GaussianBlur(30)))
    body(img, gx, 530, 1.35, 'gabriel', phase=t * 4, walking=p < 0.9, light=(0.6, 0.55, 0.5), facing=-1)
    img = glow(img, [gx - 30, 350, gx - 10, 370], (200, 150, 80), 30, 1.2 * k)
    body(img, 420, 530, 1.25, 'nathan', light=(0.55, 0.48, 0.4), hood=True)
    body(img, 300, 530, 1.2, 'elise', light=(0.6, 0.52, 0.42))
    rain(img, 220, (110, 100, 90), seed=f)
    return img


def shot_grille(t, dur, T, f, kw):
    img = CIMETIERE.copy()
    d = ImageDraw.Draw(img)
    for x in range(0, W, 24):  # grille en fer forgé, entrouverte
        if 560 < x < 720:
            continue
        d.line([(x, 120), (x, 520)], fill=(20, 20, 22), width=4)
        d.polygon([(x - 5, 120), (x, 104), (x + 5, 120)], fill=(20, 20, 22))
    d.line([(0, 160), (W, 160)], fill=(20, 20, 22), width=5)
    p = t / dur
    lay = Image.new('L', (W, H))
    ImageDraw.Draw(lay).polygon([(640, 470), (300 + 300 * p, 200), (800 + 300 * p, 200)], fill=140)
    img = Image.composite(grade(img, (2.6, 2.2, 1.7)), img, lay.filter(ImageFilter.GaussianBlur(30)))
    for k, who in enumerate(('gabriel', 'nathan', 'elise')):
        body(img, 600 + k * 50 + 60 * p, 540 - k * 6, 1.2 - k * 0.04, who, phase=t * 4 + k, walking=True, light=(0.45, 0.42, 0.4), hood=who == 'nathan')
    rain(img, 200, (90, 96, 110), seed=f)
    return fade(img, t / 0.6)


def shot_tombe(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (16, 18, 20))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 200], fill=(12, 14, 18))
    d.polygon([(260, 520), (1020, 520), (920, 230), (360, 230)], fill=(84, 86, 90))  # dalle de granit gris
    d.text((500, 300), 'CLAIRE MOREAU', font=font('DejaVuSerif.ttf', 40) if os.path.exists(FONT_DIR + 'DejaVuSerif.ttf') else TITLE, fill=(200, 200, 196))
    d.text((560, 360), '1979 — 2011', font=SANS_B, fill=(190, 190, 186))
    d.rectangle([860, 170, 940, 300], fill=(110, 80, 40), outline=(70, 50, 26), width=4)  # vase de bronze scellé
    d.ellipse([856, 160, 944, 186], fill=(120, 90, 46))
    lay = Image.new('L', (W, H))
    sw = 40 * math.sin(T * 0.6)
    ImageDraw.Draw(lay).ellipse([360 + sw, 200, 1000 + sw, 540], fill=170)
    img = Image.composite(grade(img, (1.9, 1.6, 1.25)), img, lay.filter(ImageFilter.GaussianBlur(50)))
    rain(img, 220, (90, 96, 110), seed=f)
    return img


def shot_vase(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (20, 20, 22))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 420, W, H], fill=(70, 72, 76))
    d.rectangle([480, 80, 800, 440], fill=(120, 88, 44), outline=(80, 56, 28), width=6)
    turn = t * 1.8
    for k in range(6):
        a = turn + k * math.pi / 3
        d.line([(640 + 140 * math.cos(a), 440 + 10 * math.sin(a)), (640 + 160 * math.cos(a), 440 + 12 * math.sin(a))], fill=(60, 44, 20), width=4)
    tr = 3 * math.sin(T * 11)
    d.ellipse([460 + tr, 380, 580 + tr, 470], fill=tint(REF['gabriel']['skin'], (0.9, 0.78, 0.6)))  # main tremblante de Gabriel
    d.ellipse([700, 390, 810, 470], fill=tint(REF['nathan']['skin'], (0.9, 0.78, 0.6)))  # main de Nathan
    img = grade(img, (1.3, 1.1, 0.85))
    rain(img, 160, (90, 96, 110), seed=f)
    return img


def shot_cle(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (14, 14, 16))
    d = ImageDraw.Draw(img)
    d.rectangle([380, 150, 900, 430], fill=(70, 72, 74), outline=(40, 40, 42), width=6)  # petite boîte en fer
    d.rectangle([400, 170, 880, 410], fill=(36, 34, 30))
    d.rounded_rectangle([450, 270, 790, 310], radius=14, fill=(176, 180, 186))  # cylindre d'acier brossé, 9 cm
    for x in range(460, 780, 8):
        d.line([(x, 274), (x, 306)], fill=(160, 164, 170))
    for k, (x, h) in enumerate(((730, 26), (748, 14), (762, 30), (776, 18))):
        d.rectangle([x, 310, x + 10, 310 + h], fill=(176, 180, 186))  # dents asymétriques
    d.ellipse([400, 250, 480, 330], outline=(190, 150, 70), width=12)  # anneau de laiton
    d.text((470, 330), 'ORPHÉE — A — 01', font=MONO_S, fill=(190, 150, 70))
    img = grade(img, (1.25 + 0.1 * math.sin(T * 9), 1.05, 0.8))  # lumière de la lampe à dynamo
    return img


def shot_drones_cim(t, dur, T, f, kw):
    img = CIMETIERE.copy()
    for k in range(3):
        img = drone_sprite(img, 200 + k * 380 + 50 * math.sin(T * 0.7 + k), 70 + 20 * k, 1.1 - 0.15 * k, True, T + k)
    body(img, 560, 540, 1.25, 'gabriel', light=(0.35, 0.35, 0.4))
    body(img, 680, 540, 1.2, 'nathan', light=(0.35, 0.35, 0.4), hood=True)
    body(img, 790, 540, 1.15, 'elise', light=(0.4, 0.38, 0.36))
    rain(img, 200, (90, 96, 110), seed=f)
    return img


def shot_course(t, dur, T, f, kw):
    img = RUE.copy()
    off = int(t * 260) % W
    img = Image.fromarray(np.roll(np.asarray(img), -off, axis=1))
    sh = 6 * math.sin(T * 13)  # caméra à l'épaule
    for k, who in enumerate(('gabriel', 'nathan', 'elise')):
        body(img, 480 + k * 140 + sh, 530, 1.3, who, phase=T * 10 + k, walking=True, light=(0.4, 0.4, 0.46), hood=who == 'nathan')
    img = drone_sprite(img, 900 - t * 80, 90, 1.2, True, T)
    rain(img, 260, (90, 96, 110), seed=f, angle=-8)
    return img


def shot_ecran_mort(t, dur, T, f, kw):
    """Un écran sans courant qui s'allume pour une seule ligne en minuscules : l'Inconnu."""
    kind, txt = kw.get('kind', 'abribus'), kw.get('txt', '')
    img = vgrad(W, H, (12, 12, 16), (20, 20, 24))
    d = ImageDraw.Draw(img)
    if kind in ('abribus', 'abribus_casse'):
        d.rectangle([300, 80, 980, 400], fill=(26, 28, 32), outline=(80, 86, 96), width=6)
        box = [360, 180, 920, 290]
        lab = 'ARRÊT  PONT DES TANNEURS' if kind == 'abribus_casse' else 'ARRÊT  RUE VAUBAN'
        d.text((360, 120), lab, font=SANS_S, fill=(90, 96, 104))
    elif kind == 'distributeur':
        d.rectangle([380, 60, 900, 520], fill=(40, 42, 46))
        box = [450, 130, 830, 330]
        d.rectangle([520, 400, 760, 420], fill=(10, 10, 12))
    else:
        d.rectangle([200, 120, 1080, 360], fill=(20, 22, 24), outline=(60, 64, 70), width=8)
        box = [260, 180, 1020, 300]
    d.rectangle(box, fill=(4, 6, 8))
    on = t > 0.9
    if on:
        n = int((t - 0.9) * 14)
        d.text((box[0] + 30, (box[1] + box[3]) // 2 - 18), txt[:n], font=MONO, fill=(170, 230, 190) if kind != 'abribus_casse' else (230, 230, 230))
        img = glow(img, box, (20, 60, 40), 40, 0.5)
    if kind == 'abribus_casse':
        d = ImageDraw.Draw(img)
        for k in range(14):  # verre brisé
            rr = random.Random(k)
            x0, y0 = rr.randint(300, 980), rr.randint(80, 400)
            d.line([(x0, y0), (x0 + rr.randint(-120, 120), y0 + rr.randint(-90, 90))], fill=(150, 156, 166), width=2)
    rain(img, 160, (90, 96, 110), seed=f)
    return img


def shot_carrefour(t, dur, T, f, kw):
    """Le Pont des Tanneurs, ce soir, en vrai : même cadrage que la vision, mais la ville est noire."""
    phase = kw.get('phase')
    img = CARREFOUR.copy()
    if phase == 'arrivee':
        p = t / dur
        ex = 160 + 200 * p
        body(img, ex + 120, 470, 1.2, 'gabriel', phase=t * 4, walking=True, light=(0.6, 0.55, 0.5))
        body(img, ex, 470, 1.15, 'nathan', phase=t * 4 + 1, walking=True, light=(0.5, 0.5, 0.55), hood=True)
        body(img, ex - 70, 470, 1.15, 'elise', phase=t * 4 + 2, walking=True, light=(0.9, 0.75, 0.55))
        img = glow(img, [ex + 90, 380, ex + 110, 400], (200, 150, 80), 30, 0.9)
    else:  # la camionnette autonome arrive de la droite, phares dans la pluie
        ex = 360 + 100 * min(1, t / 1.5)
        vx = W + 60 - (W + 60 - ex - 40) * (t / dur) ** 1.6
        push = max(0.0, (t - (dur - 1.0)) / 1.0)
        body(img, ex + 120 - 60 * push, 470, 1.2, 'gabriel', phase=t * 8, walking=push > 0, light=(0.6, 0.55, 0.5))
        body(img, 360, 470, 1.15, 'nathan', light=(0.5, 0.5, 0.55), hood=True)
        body(img, ex - 120 * push, 470 + 20 * push, 1.15, 'elise', light=(0.9, 0.75, 0.55))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([vx, 340, vx + 260, 470], radius=14, fill=(196, 198, 200))
        d.rectangle([vx, 410, vx + 260, 426], fill=(36, 140, 70))
        d.text((vx + 40, 380), 'LivrÉco', font=SANS_B, fill=(36, 110, 64))
        d.rectangle([vx + 10, 352, vx + 70, 392], fill=(26, 30, 38))
        for wx in (vx + 50, vx + 210):
            d.ellipse([wx - 24, 448, wx + 24, 496], fill=(10, 10, 12))
        lay = Image.new('L', (W, H))
        ImageDraw.Draw(lay).polygon([(vx, 430), (vx - 600, 380), (vx - 600, 536)], fill=150)
        img = Image.composite(grade(img, (3.2, 3.2, 3.0)), img, lay.filter(ImageFilter.GaussianBlur(25)))
    rain(img, 240, (110, 116, 130), seed=f)
    d = ImageDraw.Draw(img)
    d.text((24, 20), '22:47' if phase != 'arrivee' else '22:46', font=MONO_S, fill=(200, 205, 215))
    return img


def shot_blanc(t, dur, T, f, kw):
    return Image.new('RGB', (W, H), (240, 240, 240))


def shot_verre(t, dur, T, f, kw):
    """Ralenti : la vitre de l'abribus éclate ; un éclat ouvre le sourcil gauche de Nathan."""
    img = Image.new('RGB', (W, H), (10, 10, 14))
    hit = t > 1.4
    bust(img, 640, 230, 1.25, 'nathan', blink=hit and t < 1.8, light=(0.7, 0.7, 0.8), hood=True, brow=1.0)
    if hit:
        wound(img, 640, 230, 1.25, fresh=t > 2.0)
    d = ImageDraw.Draw(img)
    for k in range(40):
        rr = random.Random(k)
        x0, y0 = rr.uniform(0, W), rr.uniform(0, H)
        vx, vy = rr.uniform(-80, 80), rr.uniform(-40, 60)
        x, y = x0 + vx * t, y0 + vy * t
        sz = rr.uniform(6, 20)
        d.polygon([(x, y), (x + sz, y + sz * 0.3), (x + sz * 0.4, y + sz)], outline=(200, 210, 225), fill=(60, 66, 80))
    return img


def shot_silence_pont(t, dur, T, f, kw):
    img = CARREFOUR.copy()
    d = ImageDraw.Draw(img)
    d.rectangle([980, 200, 1180, 330], fill=(18, 18, 22))  # abribus éventré
    d.rounded_rectangle([1040, 300, 1300, 430], radius=14, fill=(160, 162, 166))  # la camionnette encastrée, immobile
    body(img, 820, 480, 1.15, 'elise', light=(0.85, 0.7, 0.5))
    d.ellipse([920, 470, 1080, 500], fill=(40, 30, 26))  # Gabriel au sol, sous l'abribus
    rain(img, 240, (110, 116, 130), seed=f)
    return img


def shot_abribus(t, dur, T, f, kw):
    img, light = backdrop('sol', T, f)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 400, W, H], fill=(22, 22, 26))
    for k in range(30):  # éclats de verre au sol
        rr = random.Random(k + 50)
        x, y = rr.randint(0, W), rr.randint(410, H)
        d.polygon([(x, y), (x + 10, y + 3), (x + 4, y + 9)], fill=(140, 146, 156))
    body(img, 380, 520, 1.25, 'nathan', light=(0.55, 0.5, 0.48), hood=True)
    body(img, 880, 520, 1.2, 'elise', light=(0.6, 0.52, 0.44))
    g = Image.new('RGBA', (300, 300), (0, 0, 0, 0))
    gb = Image.new('RGB', (300, 300), (0, 0, 0))
    body(gb, 150, 290, 1.2, 'gabriel', light=(0.6, 0.52, 0.45))
    mask = gb.convert('L').point(lambda v: 255 if v > 4 else 0)
    gb, mask = gb.rotate(90, expand=True), mask.rotate(90, expand=True)
    img.paste(gb, (500, 380), mask)
    img = glow(img, [700, 470, 720, 490], (180, 130, 70), 30, 0.7)  # la lampe à dynamo, posée au sol
    rain(img, 220, (100, 106, 120), seed=f)
    return img


def shot_cle_main(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (14, 14, 18))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(24, 24, 28))
    p = min(1, t / 2.5)
    gx = 380 + 160 * p
    d.ellipse([gx - 60, 260, gx + 60, 350], fill=tint(REF['gabriel']['skin'], (0.8, 0.7, 0.6)))  # main de Gabriel, avec l'alliance
    d.ellipse([gx - 10, 290, gx + 6, 306], outline=(210, 170, 80), width=3)
    d.rectangle([gx - 220, 270, gx - 50, 340], fill=tint(REF['gabriel']['top'], (0.8, 0.7, 0.6)))
    d.rounded_rectangle([gx + 30, 290, gx + 200, 312], radius=10, fill=(176, 180, 186))  # la clé
    d.ellipse([gx + 10, 282, gx + 50, 322], outline=(190, 150, 70), width=7)
    d.ellipse([820, 250, 960, 350], fill=tint(REF['nathan']['skin'], (0.8, 0.72, 0.65)))  # main de Nathan qui attend
    d.rectangle([950, 260, W, 340], fill=tint(REF['nathan']['top'], (0.8, 0.72, 0.65)))
    img = glow(img, [600, 400, 620, 420], (160, 110, 60), 50, 0.5)
    rain(img, 160, (100, 106, 120), seed=f)
    return img


def shot_lampe_eteinte(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (8, 8, 10))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(18, 18, 22))
    d.rounded_rectangle([520, 300, 760, 400], radius=20, fill=(40, 40, 44))  # lampe à dynamo, couchée
    d.ellipse([700, 310, 780, 390], fill=(60, 60, 64))
    k = max(0.0, 1 - t / (dur * 0.6))
    d.ellipse([715, 325, 765, 375], fill=(int(40 + 200 * k), int(36 + 150 * k), int(30 + 80 * k)))
    if k > 0:
        img = glow(img, [715, 325, 765, 375], (180, 120, 50), 60, 1.2 * k)
    rain(img, 140, (90, 96, 110), seed=f)
    return img


def shot_montre(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (12, 12, 14))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 200, W, 340], fill=tint(REF['elise']['skin'], (0.7, 0.7, 0.75)))  # poignet droit (gauchère)
    d.ellipse([520, 150, 760, 390], fill=(200, 196, 186), outline=(160, 130, 70), width=10)
    for k in range(12):
        a = k * math.pi / 6
        d.line([(640 + 100 * math.sin(a), 270 - 100 * math.cos(a)), (640 + 110 * math.sin(a), 270 - 110 * math.cos(a))], fill=(40, 40, 40), width=3)
    a_h = (10 + 52 / 60) / 12 * 2 * math.pi
    a_m = 52 / 60 * 2 * math.pi
    d.line([(640, 270), (640 + 55 * math.sin(a_h), 270 - 55 * math.cos(a_h))], fill=(20, 20, 20), width=7)
    d.line([(640, 270), (640 + 90 * math.sin(a_m), 270 - 90 * math.cos(a_m))], fill=(20, 20, 20), width=4)
    d.line([(520, 330), (700, 360)], fill=(110, 90, 70), width=3)  # boue sur la manche droite
    rain(img, 140, (90, 96, 110), seed=f)
    return grade(img, (0.75, 0.75, 0.85))


def shot_ville_orphee(t, dur, T, f, kw):
    img = CITY.copy()
    p = t / dur
    body(img, 560 + 80 * p, 520, 1.1, 'nathan', phase=t * 4, walking=True, light=(0.3, 0.3, 0.36), hood=True)
    body(img, 460 + 80 * p, 520, 1.05, 'elise', phase=t * 4 + 1, walking=True, light=(0.4, 0.36, 0.3))
    rain(img, 160, (70, 76, 90), seed=f)
    return img


def shot_end5(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if t > 1.0:
        text_c(ImageDraw.Draw(img), 470, 'FIN DE LA PARTIE 5', SANS_S, (110, 110, 110))
    return img


# ---- jeu d'acteur
_bust_base = bust
CUR = {'f': 0, 'T': 0.0}
SOURCILS = {'peur': 0.9, 'surprise': 1.2, 'tristesse': 0.6, 'colere': -0.9, 'douceur': 0.25, 'sidere': 0.8,
            'ironie': 0.4, 'fatigue': -0.2, 'tension': -0.3, 'joie': 0.5}
INCLINE = {'douceur': 6, 'tristesse': -5, 'ironie': 4, 'fatigue': -3}


def bust(img, cx, cy, s, who, mouth=0.0, **kw):
    f, T = CUR['f'], CUR['T']
    wd = getattr(tl, 'mouth_width', {}).get(who)
    if wd is not None and f < len(wd) and mouth > 0.06:
        kw['mouth_w'] = float(wd[f])
    emo = tl.emotion_at(who, T) if who in ('nathan', 'elise', 'gabriel') else None
    if emo:
        kw['brow'] = 0.4 * kw.get('brow', 0.0) + SOURCILS.get(emo, 0.0)
        kw['tilt'] = kw.get('tilt', 0) + INCLINE.get(emo, 0) * s
    return _bust_base(img, cx, cy, s, who, mouth=mouth, **kw)


SHOTS = {k[5:]: v for k, v in globals().items() if k.startswith('shot_')}
_LAST = None


def frame(fi):
    T = fi / FPS
    CUR['f'], CUR['T'] = fi, T
    st, en, name, kw, dur = tl.shot_at(T)
    global _LAST
    try:
        img = SHOTS[name](T - st, dur, T, fi, kw)
        _LAST = img
    except Exception as e:
        print(f'ERREUR image {fi} ({name}): {e!r}', flush=True)
        img = _LAST if _LAST is not None else Image.new('RGB', (W, H))
    img = finish(img)
    if name not in ('carton', 'end5', 'blanc'):
        subtitle(img, tl.sub_at(T))
    return img


# =================================================================== SON
def build_audio():
    mx = Mix(TOTAL)
    n = mx.n
    t = np.arange(n) / SR

    def win(a, b, fi=0.6, fo=0.6):
        return (np.clip((t - a) / max(fi, 1e-3), 0, 1) * np.clip((b - t) / max(fo, 1e-3), 0, 1)).astype(np.float32)

    rain_out = smooth_noise(n, 1500, 1, lo=150) * 0.55
    crowd = fft_filter(smooth_noise(n, 900, 2, lo=200), lo=250, hi=1200) * 0.25  # rumeur lointaine, panique
    wind = smooth_noise(n, 400, 3, lo=60) * 0.3
    hum_low = smooth_noise(n, 80, 4) * 0.25
    END = TOTAL - 4.5
    mx.bus['amb'] += rain_out * win(0.8, END, 1.5, 2)
    mx.bus['amb'] += crowd * (win(S[0][0], S[1][1], 2, 3) + 0.4 * win(S[3][0], S[4][0], 2, 1))
    mx.bus['amb'] += wind * win(S[2][0], S[2][1], 1.5, 1.5)
    mx.bus['amb'] += hum_low * win(S[6][0], END, 1, 2)
    # klaxons au hasard
    rr = np.random.default_rng(7)
    for k in rr.uniform(S[0][0] + 4, S[1][1], 9):
        fq = rr.uniform(330, 470)
        mx.add('fx', fft_filter(tone(fq, rr.uniform(0.3, 0.9), 0.03, harmonics=(1, 2, 3)), hi=2000), k)
    # drones : bourdonnement en dents de scie modulé
    def drone_bus(a, b, g=0.05):
        L = int((b - a) * SR)
        tt = np.arange(L) / SR
        x = ((tt * 182) % 1 - 0.5) + 0.6 * (((tt * 191) % 1) - 0.5)
        x = fft_filter(x.astype(np.float32), lo=120, hi=1600) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * tt))
        mx.add('fx', (x * g * env_ramp(L, 0.8 * SR, 0.8 * SR)).astype(np.float32), a)
    for name, g in (('drone', 0.05), ('drones_cim', 0.09), ('course', 0.05)):
        for s in shots(name):
            drone_bus(s[0], s[1] + 1.0, g)
    # lampe à dynamo : cliquetis de la manivelle
    for s in shots('lampe') + shots('trio'):
        for k in np.arange(s[0], s[1], 0.11):
            mx.add('fx', smooth_noise(int(0.01 * SR), 4000, int(k * 100), lo=1500) * 0.05, k)
    # pas
    for name, step in (('grille', 0.6), ('course', 0.32), ('lampe', 0.6), ('ville_orphee', 0.55)):
        for s in shots(name):
            for k in np.arange(s[0] + 0.2, s[1] - 0.2, step):
                x = smooth_noise(int(0.1 * SR), 600, int(k * 10)) * np.exp(-np.arange(int(0.1 * SR)) / (0.025 * SR)) * 0.25
                mx.add('fx', x.astype(np.float32), k)
    # grille du cimetière, vase qui se dévisse
    g0 = shots('grille')[0][0]
    mx.add('fx', fft_filter(np.sin(2 * np.pi * np.cumsum(np.linspace(600, 900, int(1.2 * SR))) / SR).astype(np.float32) * 0.04, hi=2000), g0 + 0.4)
    v0 = shots('vase')[0][0]
    for k in np.arange(v0 + 0.5, v0 + 4.5, 0.35):
        mx.add('fx', fft_filter(smooth_noise(int(0.15 * SR), 2000, int(k * 30), lo=400), hi=3000) * 0.06, k)
    c0 = shots('cle')[0][0]
    mx.add('fx', tone(2600, 0.6, 0.02, harmonics=(1, 2.7), decay=0.3), c0 + 0.6)  # la clé tinte contre la boîte
    # l'Inconnu : motif du Signal à chaque message
    for s in shots('ecran_mort'):
        mx.add('fx', signal_motif(0.09), s[0] + 0.9)
    # 22:47 : moteur électrique, pneus, choc, verre
    cam = shots('carrefour')[1]
    L = int((cam[1] - cam[0]) * SR)
    tt = np.arange(L) / SR
    whine = np.sin(2 * np.pi * np.cumsum(300 + 500 * tt / tt[-1]) / SR).astype(np.float32) * (tt / tt[-1]) ** 2
    mx.add('fx', fft_filter(whine, hi=2500) * 0.05, cam[0])
    mx.add('fx', fft_filter(smooth_noise(L, 1200, 90, lo=200), hi=3000) * 0.12 * (tt / tt[-1]) ** 2, cam[0])
    mx.add('fx', fft_filter(smooth_noise(int(0.8 * SR), 150, 91), hi=400) * 0.9 * np.exp(-np.arange(int(0.8 * SR)) / (0.15 * SR)), T_IMPACT)
    shatter = smooth_noise(int(2.0 * SR), 9000, 92, lo=2500) * 0.35 * np.exp(-np.arange(int(2.0 * SR)) / (0.35 * SR))
    mx.add('fx', shatter.astype(np.float32), T_IMPACT + 0.1)
    for k in rr.uniform(T_IMPACT + 0.4, T_IMPACT + 4.0, 22):  # éclats qui retombent
        mx.add('fx', tone(rr.uniform(3000, 6000), 0.05, 0.015, decay=0.02), k)
    # après le choc : acouphène, puis rien
    ring = (np.sin(2 * np.pi * 4200 * np.arange(int(4 * SR)) / SR) * 0.012 * env_ramp(int(4 * SR), 0.05 * SR, 3 * SR)).astype(np.float32)
    mx.add('fx', ring, T_IMPACT + 0.6)
    i0, i1 = int((T_IMPACT + 0.2) * SR), int(shots('abribus')[0][0] * SR)
    mx.bus['amb'][i0:i1] *= np.linspace(0.1, 1, i1 - i0).astype(np.float32)
    # lampe qui s'éteint, battement de cœur sous la mort de Gabriel
    le = shots('lampe_eteinte')[0]
    for k in np.arange(shots('abribus')[0][0], le[0], 1.0):
        mx.add('fx', tone(46, 0.18, 0.18, harmonics=(1, 2), decay=0.06), k)
    mx.add('fx', signal_motif(0.14), shots('end5')[0][0] + 0.8)
    # ---- musique : cordes et percussions sèches (bible 10.4, P5), jamais sous les adieux
    cello = sum(np.sin(2 * np.pi * 73.42 * h * t + 0.25 * np.sin(2 * np.pi * 4.8 * t)) / h ** 1.3 for h in range(1, 6)).astype(np.float32)
    viola = sum(np.sin(2 * np.pi * 220.0 * h * t + 0.2 * np.sin(2 * np.pi * 5.3 * t)) / h ** 1.5 for h in range(1, 4)).astype(np.float32)
    strings = fft_filter(cello + 0.5 * viola, hi=1800)
    mx.bus['mus'] += strings * 0.05 * (win(S[0][0] + 3, S[1][1], 3, 2) + win(S[2][0] + 20, S[4][0] + 6, 3, 0.2))
    for s in shots('course') + shots('drones_cim'):  # percussions sèches
        for k in np.arange(s[0], s[1], 0.5):
            mx.add('mus', fft_filter(smooth_noise(int(0.12 * SR), 400, int(k * 50)), hi=800) * 0.35 * np.exp(-np.arange(int(0.12 * SR)) / 900), k)
    k = S[4][0]  # la montée vers 22:47
    while k < T_IMPACT - 0.2:
        p_ = (k - S[4][0]) / max(1, T_IMPACT - S[4][0])
        mx.add('mus', tone(55, 0.3, 0.2, harmonics=(1, 2), decay=0.1), k)
        k += 0.9 - 0.5 * p_
    for base in np.arange(S[6][0] + 0.5, END - 2, 4.6):  # piano : Nathan et Élise, vers Orphée
        for j, fq in enumerate((293.66, 349.23, 440.0, 392.0)):
            mx.add('mus', piano(fq, 3.0, 0.05), base + j * 1.1)
    # ---- dialogues
    PAN = {'elise': -0.3, 'nathan': 0.25, 'gabriel': 0.35}
    for (st, en, w, txt, a_), room in zip(tl.lines, tl.room):
        x = a_.copy()
        mx.add_voice(x.astype(np.float32), st, pan=PAN.get(w, 0.0), room=room)
    for key in ("J'ai retenu une main, une fois. Pas cette fois.", 'Ta mère… avait ton regard.', 'Non… Non !', 'Salut, maman.'):
        a, b = line_time(key)
        i0, i1 = int((a - 0.5) * SR), int((b + 1.0) * SR)
        mx.bus['mus'][i0:i1] = 0
        mx.bus['amb'][i0:i1] *= 0.5
    return mx.render()


if __name__ == '__main__':
    if '--plan' in sys.argv:
        dia = sum(len(l[4]) / SR for l in tl.lines)
        print(f'{len(tl.lines)} répliques, {dia:.0f} s de parole sur {TOTAL:.0f} s ; impact à {T_IMPACT:.1f} s')
        for i, (a, b) in enumerate(S):
            print(f'  séquence 5.{i + 1} : {a:6.1f} → {b:6.1f}  ({b - a:5.1f} s)')
        sys.exit(0)
    import time
    t0 = time.time()
    wav = os.path.join(OUT, 'partie5_audio.wav')
    if not os.path.exists(wav):
        Mix.write(wav, build_audio())
    print('audio ok', round(time.time() - t0), 's', flush=True)
    vid = os.path.join(OUT, 'partie5_video.mp4')
    encode_chunks(frame, NF, vid, os.path.join(OUT, 'morceaux'))
    print('vidéo ok', round(time.time() - t0), 's', flush=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                    '-t', str(TOTAL), '-movflags', '+faststart', os.path.join(OUT, 'LE_DERNIER_SIGNAL_partie5.mp4')], check=True)
    with open(os.path.join(OUT, 'partie5_montage.txt'), 'w') as fh:
        for s in tl.shots:
            fh.write(f'{s[0]:8.2f} {s[1]:8.2f}  {s[2]}\n')
        fh.write('\n')
        for st, en, w, txt, a_ in tl.lines:
            fh.write(f'{st:8.2f} {en:8.2f}  {w:7s} {txt}\n')
    print('fini', round(time.time() - t0), 's')
