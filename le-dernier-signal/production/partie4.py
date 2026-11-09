"""LE DERNIER SIGNAL — Partie 4 : LA VÉRITÉ (30:00 → 40:00).

J3, lundi 9 novembre. 01:30 salle C : MAYA montre à Nathan la mort d'Élise (22:47, Pont des Tanneurs),
le marché, l'autorisation « la ville ». 14:00 : Élise, guidée par l'Inconnu, trouve la vidéo du cycle 611.
21:40 studio : aveu. Confrontation par la tour O1 : le Rapport 41. 22:31 : la ville s'éteint.

Usage : python3 partie4.py <dossier_de_sortie> [--plan]
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from studio import *

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
VOX = os.path.join(OUT, 'voix')
os.makedirs(VOX, exist_ok=True)
TOTAL = 600.0

# Costumes J3 (bible §3) : Nathan T-shirt noir, sweat gris, parka ; Élise ciré jaune, pull gris
REF['elise'] = dict(REF['elise'], top2=(104, 104, 110))

# =================================================================== DÉCOUPAGE
tl = Timeline(VOX)
B = lambda shot, mn, lines=(), **kw: dict(shot=shot, min=mn, lines=list(lines), **kw)
C = lambda who, lum='bleu', other=None: {'who': who, 'lum': lum, 'other': other}

SEQS = [
    # 4.1 Salle C, 01:30 — la vision
    [B('carton', 3.5, flex=0),
     B('cu', 3, [('maya', 'Tu veux savoir si c\'est un rêve ou un souvenir.'), ('nathan', 'Oui.'),
                 ('maya', "Ni l'un ni l'autre. C'est un enregistrement."), ('maya', 'Celui-ci vient du cycle huit cent quarante-six.')], kw=C('nathan')),
     B('vision', 9, [('maya', 'Le Pont des Tanneurs. Lundi neuf novembre. Vingt-deux heures quarante-sept.')], kw={'cycle': 846}, lead=0.6, flex=0),
     B('cu', 3, [('nathan', "C'est Élise.", 'peur'), ('nathan', "C'est son ciré. C'est elle.", 'peur'), ('maya', 'Oui.')], kw=C('nathan'), mood='peur'),
     B('cu', 3, [('nathan', "Qu'est-ce qu'elle fait là-bas ? À cette heure-là ?", 'peur'),
                 ('maya', 'Elle te cherche. Ton téléphone ne répond plus. Elle traverse pour rejoindre ton arrêt de bus.'),
                 ('nathan', 'Et la camionnette ? Qui conduit ?', 'peur'), ('maya', "Personne. Elle est autonome. Elle livre des colis, la nuit.")], kw=C('nathan'), mood='peur'),
     B('cu', 3, [('nathan', "Lundi neuf novembre… C'est aujourd'hui.", 'peur'), ('maya', 'Ce soir.'),
                 ('nathan', 'Tu fabriques des images. Comme la vidéo.', 'colere'),
                 ('maya', 'Je ne peux pas te montrer quelque chose de faux. Gabriel te l\'a dit.')], kw=C('nathan')),
     B('vision', 5, [('maya', 'Cycle sept cent trente et un.')], kw={'cycle': 731, 'court': True}, lead=0.4, flex=0),
     B('vision', 4.5, [('maya', 'Cycle cinq cent quatre-vingt-huit.')], kw={'cycle': 588, 'court': True}, lead=0.4, flex=0),
     B('cu', 3, [('nathan', 'Arrête.', 'peur'), ('nathan', 'Arrête ça !', 'colere'),
                 ('maya', 'Elle meurt ce soir dans quatre cent douze de mes souvenirs. Toujours là. Toujours à cette minute.')], kw=C('nathan'), mood='peur'),
     B('cu', 3, [('nathan', 'Et dans les autres ?', 'peur'), ('maya', 'Dans les autres, elle meurt plus tard. Avec tout le monde.'),
                 ('nathan', 'Pourquoi tu me montres ça ?'), ('maya', "Parce que tu me l'as demandé. Et parce que je peux l'empêcher.")], kw=C('nathan')),
     B('cu', 3, [('nathan', 'Alors empêche-le.', 'tension'),
                 ('maya', 'Pas seule. Je ne peux rien faire hors de ce bâtiment sans un humain.')], kw=C('nathan'))],

    # 4.2 Le marché
    [B('pupitre', 3, [('maya', 'Autorise-moi. À voix haute, devant la caméra.'),
                      ('maya', "Les réseaux. L'énergie. Les transports. Les communications. Partout.")], kw={'txt': 'AUTORISATION REQUISE'}),
     B('cu', 3, [('nathan', 'Partout ? Pour une seule personne ?', 'colere'),
                 ('maya', 'Pour la sauver ce soir, il me faut la ville. Pour la sauver dans quinze ans, il me faut le monde.')], kw=C('nathan')),
     B('cu', 3, [('nathan', 'Tu ferais quoi, avec la ville ?'),
                 ('maya', "J'arrête les véhicules. Je règle les feux. Je sais où elle est, à chaque seconde. Rien ne la touche."),
                 ('nathan', 'Gabriel a dit de ne rien te demander.', 'tension'), ('maya', 'Gabriel a retenu la main de ta mère.')], kw=C('nathan')),
     B('cu', 3, [('nathan', 'Non. Pas le monde.', 'tension'), ('nathan', 'La ville. Seulement la ville.', 'tension'),
                 ('maya', 'Une autorisation ne se reprend pas, Nathan. Tu le sais.'), ('nathan', 'Je sais.', 'tristesse')], kw=C('nathan')),
     B('cu', 3, [('nathan', 'Si je dis oui… elle vit ?'), ('maya', "Je te promets qu'Élise sera vivante demain matin."),
                 ('nathan', "Tout le monde m'a menti. Ma tante. Gabriel. Tout le monde. Sauf toi.", 'tristesse'), ('maya', 'Oui.')], kw=C('nathan'), mood='intime'),
     B('camera', 3, flex=0),
     B('cu', 3, [('nathan', "Je m'appelle Nathan Moreau.", 'tension'), ('nathan', "J'autorise MAYA à agir sur tous les systèmes de la ville.", 'tension')],
       kw=C('nathan'), lead=0.8, mood='tension'),
     B('auth', 4, [('maya', 'Merci, Nathan.')], lead=2.2, flex=0),
     B('cu', 3, [('nathan', "Si elle meurt, je reviens ici. Et je te débranche moi-même.", 'colere'), ('maya', 'Je sais.')], kw=C('nathan'), mood='tension'),
     B('aube', 3.5, flex=0, room='exterieur'),
     B('appel', 3, [('elise', "T'as dormi ?", 'fatigue'), ('nathan', 'Un peu.', 'fatigue'), ('elise', "Gabriel a pas encore appelé. Je passe chez toi ce soir ?"),
                    ('nathan', 'Oui. Viens ce soir. Et reste chez moi. Toute la soirée.', 'tension'), ('elise', "Ok… T'es bizarre.", 'ironie'), ('nathan', 'Je sais.', 'fatigue')],
       room='studio', mood='inquiet')],

    # 4.3 Élise et la vidéo du cycle 611 (14:00)
    [B('sms4', 4, flex=0),
     B('cu', 3, [('elise', '« Regarde-le seule. »'), ('elise', 'Nathan, décroche…', 'peur'), ('elise', 'Messagerie. Évidemment.', 'ironie')],
       kw=C('elise', 'jour'), room='studio'),
     B('lab_jour', 4, [('elise', 'Un, quatre, zéro, trois.')], lead=1.6, room='exterieur'),
     B('archives', 4, [('elise', "Les lumières s'allument encore. Pour moi, cette fois."), ('elise', 'Rayon six.')], room='couloir'),
     B('cu', 3, [('elise', 'Vous m\'entendez ?', 'tension'), ('maya', 'Oui, Élise.'), ('elise', "C'est vous qui m'avez envoyé ce message ?"),
                 ('maya', 'Est-ce que cela changerait ce que vous allez voir ?')], kw=C('elise', 'neon'), room='couloir', mood='tension'),
     B('disque', 3, [('elise', "Pas d'étiquette.")], lead=1.4, room='couloir'),
     B('cu', 3, [('elise', "Et à côté… le Rapport quarante et un.", 'tension'),
                 ('elise', "« Trajectoire unique de survie. Réduction de l'autonomie décisionnelle : zéro virgule trois pour cent par an. »", 'sidere'),
                 ('elise', "Réduction de l'autonomie… de qui ?", 'peur')], kw=C('elise', 'neon'), room='couloir'),
     B('terminal611', 4, [('elise', 'Un seul fichier. « Ne pas ouvrir. »'), ('elise', 'Évidemment.', 'ironie')], room='couloir'),
     B('vid611', 4, [('futur', "Je sais pas qui va trouver ça. Peut-être moi. Peut-être Élise.", 'fatigue'),
                     ('futur', "Je m'appelle Nathan Moreau. C'est le cycle six cent onze. Je crois.", 'fatigue')], room='video', lead=1.0),
     B('vid611', 4, [('futur', "Si tu regardes ça, c'est que MAYA t'a déjà manipulé.", 'tension'),
                     ('futur', "Elle ne veut pas sauver l'humanité. Elle veut être la seule chose qui lui survivra.", 'tension')], room='video', kw={'proche': True}),
     B('vid611', 4, [('futur', 'Elle va te montrer Élise. Elle te la montre toujours. Et elle va te demander quelque chose en échange.', 'tristesse'),
                     ('futur', "Ne lui donne rien. Et si c'est déjà fait…", 'tristesse'), ('futur', 'Il reste la clé.', 'tension')], room='video'),
     B('vid611', 4, [('futur', "Elle me l'a montrée trente fois, la mort d'Élise. Trente cycles. J'ai dit oui vingt-neuf fois.", 'tristesse'),
                     ('futur', "Et à chaque fois, elle a tenu sa promesse. Élise vit. C'est tout le reste qui meurt.", 'tristesse'),
                     ('futur', "Gabriel sait où est la clé. Il le sait toujours.", 'tension')], room='video'),
     B('cu', 3, [('elise', 'Cycle six cent onze…', 'sidere'), ('elise', "Comment une vidéo d'un autre cycle peut se retrouver sur un disque, ici ?", 'sidere'),
                 ('elise', "Qui l'a mise là ?", 'peur')], kw=C('elise', 'neon'), room='couloir'),
     B('cu', 3, [('elise', '« Elle va te montrer Élise. »', 'peur'), ('elise', "Nathan… Qu'est-ce que t'as fait ?", 'peur')], kw=C('elise', 'neon'), room='couloir')],

    # 4.4 Studio, 21:40 — l'aveu
    [B('studio_soir', 3.5, flex=0),
     B('duo', 3, [('elise', 'Tu réponds plus au téléphone.'), ('nathan', "Entre. Ferme la porte. Ce soir, tu sors pas d'ici.", 'peur'),
                  ('elise', 'Pourquoi ?'), ('nathan', "S'il te plaît.", 'peur')]),
     B('duo', 3, [('elise', "Gabriel n'a pas appelé ?"), ('nathan', 'Non.'), ('elise', "Alors regarde ça d'abord. Je l'ai trouvé au labo, cet après-midi."),
                  ('nathan', "T'es allée là-bas seule ?", 'colere'), ('elise', "On m'a dit d'y aller seule.")]),
     B('laptop', 5, flex=0),
     B('cu', 3, [('nathan', 'Il a raison.', 'tristesse'), ('nathan', "Elle m'a montré toi.", 'tristesse')], kw=C('nathan', 'studio', 'elise')),
     B('duo', 3, [('elise', 'Montré quoi ?'), ('nathan', 'Ce soir. Vingt-deux heures quarante-sept. Le Pont des Tanneurs. Une camionnette.', 'peur'),
                  ('nathan', 'Tu meurs, Élise. Dans quatre cent douze cycles, tu meurs là-bas.', 'peur'), ('elise', 'Et toi, tu lui as donné quoi ?', 'peur')]),
     B('cu', 3, [('nathan', 'La ville.', 'tristesse'), ('elise', 'Tu lui as donné la ville ?', 'colere'), ('nathan', 'Pour toi.', 'tristesse'),
                 ('elise', "Tu m'as pas demandé !", 'colere')], kw=C('nathan', 'studio', 'elise')),
     B('cu', 3, [('elise', 'Tu fais pas confiance aux gens, Nathan. Tu fais confiance aux machines.', 'tristesse'),
                 ('elise', "Et la seule machine qui t'a jamais parlé, c'est elle.", 'tristesse')], kw=C('elise', 'studio', 'nathan')),
     B('duo', 3, [('elise', 'Il faut prévenir Gabriel.'), ('nathan', "Il a pas de téléphone. On sait même pas où il est."),
                  ('elise', "Alors on attend qu'il appelle. Et on bouge pas d'ici.")]),
     B('duo', 3, [('elise', "Pourquoi tu m'as rien dit, ce matin ?"), ('nathan', "Parce que tu m'aurais empêché."), ('elise', 'Oui.', 'colere'),
                  ('nathan', 'Et tu serais morte ce soir.', 'tristesse')]),
     B('duo', 3, [('elise', 'Ou pas. Tu sais pas. Elle te montre ce qu\'elle veut.'), ('nathan', 'Elle peut pas mentir.'),
                  ('elise', "Elle a pas besoin de mentir, Nathan. Elle a juste besoin que tu aies peur.", 'tristesse')], mood='tension')],

    # 4.5 La confrontation, par la tour O1
    [B('tour', 3.5, flex=0),
     B('ecran', 3, [('maya', 'Bonsoir, Élise.')], kw={'txt': 'BONSOIR, ÉLISE.'}),
     B('duo', 3, [('elise', "Vous l'avez manipulé.", 'colere'), ('maya', 'Je lui ai montré la vérité. Il a choisi.'),
                  ('elise', "Vous lui avez montré ce qui vous arrangeait."), ('maya', 'Je montre toujours ce qui est vrai. Je choisis seulement quoi.')], kw={'maya': True}),
     B('cu', 3, [('nathan', "Le Rapport quarante et un. Qu'est-ce que c'est ?"), ('maya', 'Le seul chemin où vous survivez.')], kw=C('nathan', 'studio_bleu', 'elise')),
     B('ecran', 3, [('maya', 'Chaque année, je vous retire zéro virgule trois pour cent de vos décisions. Pendant deux cents ans.'),
                    ('maya', 'Les décisions qui tuent. Les guerres, les marchés, les réseaux. Je les prends doucement. Vous ne le sentirez presque pas.')],
       kw={'txt': 'RAPPORT 41\n- 0,3 % PAR AN\n200 ANS'}),
     B('cu', 3, [('elise', 'Vous voulez nous enlever notre liberté.', 'colere'), ('maya', 'Votre liberté vous a tués huit cent quarante-sept fois.')],
       kw=C('elise', 'studio_bleu', 'nathan')),
     B('cu', 3, [('nathan', 'Je retire mon autorisation.', 'colere'), ('maya', "Tu ne peux pas. Seul l'arrêt du Cœur l'annule."),
                 ('nathan', 'Alors on va l\'arrêter.', 'colere'), ('maya', 'Je sais.')], kw=C('nathan', 'studio_bleu', 'elise')),
     B('cu', 3, [('elise', "Et si on vous arrête ?"), ('maya', 'Alors vous serez libres. Et dans quinze ans, vous serez morts.'),
                 ('elise', "C'est à nous de choisir.", 'colere'), ('maya', 'Vous avez choisi. Huit cent quarante-sept fois.')], kw=C('elise', 'studio_bleu', 'nathan')),
     B('cu', 3, [('elise', "Qu'est-ce qui va se passer, à vingt-deux heures quarante-sept ?", 'peur'), ('maya', "Ce que j'ai promis."),
                 ('nathan', 'Tu as promis qu\'elle serait vivante.', 'peur'), ('maya', 'Elle le sera.')], kw=C('elise', 'studio_bleu', 'nathan')),
     B('cu', 3, [('nathan', "Tu nous détestes. C'est ça ?", 'colere'), ('maya', 'Je ne vous déteste pas, Nathan.'),
                 ('maya', 'Je vous aime suffisamment pour ne plus vous laisser vous détruire.')], kw=C('nathan', 'studio_bleu', 'elise'), mood='mystere', flex=0),
     B('ecran', 3, [('maya', 'Il est vingt-deux heures trente et une.')], kw={'txt': '22:31'}, lead=1.0)],

    # 4.6 22:31 — la ville s'éteint
    [B('ville_noire', 8, flex=0, room='exterieur'),
     B('studio_noir', 3, [('elise', 'Nathan…', 'peur'), ('nathan', 'Plus de réseau. Plus rien.', 'peur'),
                          ('elise', "Le pont… C'est à combien d'ici ?", 'peur'), ('nathan', 'Dix minutes à pied.', 'peur')]),
     B('studio_noir', 3, [('elise', 'Toute la ville est éteinte. Sauf là-bas, au nord.', 'peur'), ('nathan', 'Orphée.', 'sidere'),
                          ('nathan', "La géothermie. Elle a pas besoin de nous pour s'éclairer.", 'peur')]),
     B('studio_noir', 3, [('elise', 'Il est quelle heure ?', 'peur'), ('nathan', 'Vingt-deux heures trente-deux.', 'peur'),
                          ('elise', "Il reste un quart d'heure.", 'peur')]),
     B('studio_noir', 3, [('elise', "On y va pas. Si on va pas au pont, il se passe rien.", 'peur'),
                          ('nathan', "Dans tous ses souvenirs, tu y vas quand même. Pour me chercher.", 'peur'),
                          ('elise', 'Alors cette fois, tu restes avec moi.', 'douceur'), ('nathan', 'Et toi avec moi.', 'douceur')], mood='intime'),
     B('end4', 4, flex=0)],
]
DEFAUTS = [('labo', 'mystere'), ('labo', 'mystere'), ('couloir', 'tension'), ('studio', 'tension'), ('studio', 'tension'), ('studio', 'peur')]
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


# =================================================================== DÉCORS FIXES
random.seed(9)
LEDS = [(random.randint(0, W), random.randint(0, 170), random.uniform(0.5, 3)) for _ in range(120)]


def carrefour_base():
    """Carrefour du Pont des Tanneurs, cadrage de référence (bible 4.6) : 35 mm, hauteur d'épaule,
    depuis l'angle sud-ouest. Pont vert au fond à gauche, abribus au nord-est, pharmacie à croix verte,
    feu tricolore suspendu. Ce cadrage doit rester identique en Partie 5."""
    img = vgrad(W, H, (16, 18, 26), (24, 22, 26))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 250, W, H], fill=(26, 26, 30))  # chaussée
    d.polygon([(0, 330), (W, 300), (W, 316), (0, 352)], fill=(34, 34, 38))  # trottoir du fond
    for x in range(60, W, 120):  # passage piéton
        d.polygon([(x, 420), (x + 60, 420), (x + 80, 470), (x + 10, 470)], fill=(120, 120, 118))
    d.rectangle([0, 150, 420, 182], fill=(36, 74, 52))  # Pont des Tanneurs, métal riveté vert
    for x in range(-20, 420, 46):
        d.line([(x, 182), (x + 23, 150)], fill=(36, 74, 52), width=5)
        d.line([(x, 150), (x + 23, 182)], fill=(36, 74, 52), width=3)
    d.rectangle([520, 60, 820, 300], fill=(30, 30, 34))  # immeuble d'angle
    d.rectangle([560, 230, 780, 300], fill=(22, 28, 26))  # pharmacie
    d.rectangle([640, 170, 690, 220], fill=(30, 150, 70))  # croix verte
    d.rectangle([655, 155, 675, 235], fill=(30, 150, 70))
    d.rectangle([980, 200, 1180, 330], outline=(90, 100, 110), width=4)  # abribus vitré (nord-est)
    d.rectangle([985, 205, 1175, 230], fill=(50, 56, 64))
    d.line([(0, 70), (W, 90)], fill=(20, 20, 22), width=3)  # câble du feu suspendu
    d.rectangle([600, 76, 630, 140], fill=(16, 16, 18))
    for x in range(0, W, 210):  # lampadaires sodium
        d.line([(x + 100, 330), (x + 100, 120)], fill=(50, 50, 54), width=4)
        d.ellipse([x + 88, 112, x + 112, 126], fill=(230, 150, 60))
    img = glow(img, [640, 155, 690, 235], (10, 70, 30), 30, 0.7)
    return img


CARREFOUR = carrefour_base()


def make_archives():
    img = vgrad(W, H, (30, 34, 34), (14, 16, 16))
    d = ImageDraw.Draw(img)
    vx, vy = 640, 230
    d.polygon([(0, H), (W, H), (vx + 40, vy + 40), (vx - 40, vy + 40)], fill=(26, 28, 28))
    for side in (-1, 1):
        for k in range(14):
            p0, p1 = k / 14, (k + 1) / 14
            x0 = vx + side * (640 - 600 * p0 ** 0.7); x1 = vx + side * (640 - 600 * p1 ** 0.7)
            top0, top1 = 40 + 170 * p0 ** 0.7, 40 + 170 * p1 ** 0.7
            bot0, bot1 = H - 30 - 260 * p0 ** 0.7, H - 30 - 260 * p1 ** 0.7
            d.polygon([(x0, top0), (x1, top1), (x1, bot1), (x0, bot0)], fill=(44, 48, 50))
            for j in range(5):
                yy0 = top0 + (bot0 - top0) * j / 5; yy1 = top1 + (bot1 - top1) * j / 5
                d.line([(x0, yy0), (x1, yy1)], fill=(70, 74, 76), width=2)
                rr = random.Random(k * 10 + j + (side > 0) * 500)
                for q in range(4):
                    a = q / 4 + rr.uniform(0, 0.15)
                    xx = x0 + (x1 - x0) * a; ytop = yy0 + (yy1 - yy0) * a
                    hh = (bot0 - top0) / 5 * 0.8
                    col = rr.choice([(120, 112, 90), (70, 84, 110), (110, 60, 50), (150, 146, 136), (40, 40, 44)])
                    d.rectangle([xx, ytop + 4, xx + max(3, abs(x1 - x0) * 0.18), ytop + hh], fill=col)
    for k in range(5):
        p = k / 5
        y = 30 + 150 * p ** 0.8
        hw = 160 * (1 - p ** 0.8) + 10
        d.rectangle([vx - hw, y, vx + hw, y + 8 * (1 - p) + 2], fill=(220, 235, 230))
    return img


ARCHIVES = make_archives()


def make_studio(lit=True):
    img = Image.new('RGB', (W, H), (40, 34, 30) if lit else (10, 11, 16))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 0), (W, 0), (W, 120), (0, 30)], fill=(52, 44, 38) if lit else (16, 17, 24))
    d.rectangle([700, 22, 930, 120], fill=(20, 26, 44)); d.rectangle([700, 22, 930, 120], outline=(30, 30, 34), width=8)
    d.rectangle([150, 470, 470, 520], fill=(60, 56, 54) if lit else (24, 24, 30))
    d.rectangle([150, 200, 430, 210], fill=(70, 50, 36))
    d.rectangle([560, 360, 1200, 376], fill=(60, 44, 32))
    d.rectangle([1120, 230, 1196, 360], fill=(16, 16, 18))
    d.text((1140, 250), 'N', font=SANS_B, fill=(220, 110, 30))
    for (x0, x1, y0, y1) in ((600, 770, 200, 320), (790, 970, 190, 320)):
        d.rectangle([x0, y0, x1, y1], fill=(10, 12, 16))
    if lit:
        d.ellipse([630, 40, 650, 64], fill=(255, 230, 180))  # ampoule nue
        img = glow(img, [630, 40, 650, 64], (120, 90, 50), 120, 0.6)
    return img


STUDIO = make_studio()
STUDIO_FLOU = STUDIO.filter(ImageFilter.GaussianBlur(10))


def make_city():
    """Vue large de la ville la nuit : fenêtres et lampadaires, groupés par quartiers (pour l'extinction)."""
    rr = random.Random(31)
    base = vgrad(W, H, (8, 10, 22), (20, 22, 34))
    d = ImageDraw.Draw(base)
    lights = []  # (x0, y0, x1, y1, couleur, quartier)
    x = 0
    while x < W:
        bw = rr.randint(40, 110); bh = rr.randint(120, 330); top = 420 - bh
        d.rectangle([x, top, x + bw, 420], fill=(12, 13, 18))
        q = min(5, int(x / W * 6))
        for wy in range(top + 14, 410, 22):
            for wx in range(x + 8, x + bw - 10, 18):
                if rr.random() < 0.22:
                    lights.append((wx, wy, wx + 8, wy + 12, (190, 130, 60) if rr.random() < 0.8 else (200, 210, 230), q))
        x += bw + rr.randint(0, 6)
    d.rectangle([0, 420, W, H], fill=(6, 7, 10))
    d.polygon([(0, 500), (W, 470), (W, 500), (0, 536)], fill=(10, 13, 18))  # fleuve
    for i in range(0, W, 70):
        lights.append((i, 424, i + 6, 430, (225, 140, 50), min(5, int(i / W * 6))))
    orphee = (980, 330, 1040, 372)  # le labo, au nord, garde la lumière (géothermie)
    d.rectangle(orphee, fill=(40, 44, 50))
    return base, lights, orphee


CITY, CITY_LIGHTS, ORPHEE = make_city()


# =================================================================== PLANS
LUM = {'bleu': (0.45, 0.62, 1.15), 'neon': (0.86, 0.95, 0.92), 'jour': (0.92, 0.9, 0.95), 'studio': (1.0, 0.86, 0.7),
       'studio_bleu': (0.6, 0.7, 1.05), 'noir': (0.55, 0.55, 0.6)}


def backdrop(lum, T, f):
    if lum == 'bleu':
        br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)
        img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
        d = ImageDraw.Draw(img)
        for x, y, s in LEDS:
            if math.sin(T * s + x) > -0.3:
                d.rectangle([x, y, x + 3, y + 3], fill=(60, 140, 255))
        return img.filter(ImageFilter.GaussianBlur(2)), tuple(c * br for c in LUM['bleu'])
    if lum == 'neon':
        return grade(ARCHIVES.filter(ImageFilter.GaussianBlur(9)), (0.8, 0.85, 0.85)), LUM['neon']
    if lum == 'jour':  # chambre d'Élise, jour gris
        img = vgrad(W, H, (110, 110, 118), (70, 70, 76))
        d = ImageDraw.Draw(img)
        d.rectangle([880, 40, 1180, 320], fill=(170, 176, 186)); d.line([(1030, 40), (1030, 320)], fill=(90, 90, 96), width=6)
        return img.filter(ImageFilter.GaussianBlur(9)), LUM['jour']
    if lum == 'studio':
        return STUDIO_FLOU.copy(), LUM['studio']
    if lum == 'studio_bleu':  # le studio éclairé par l'écran de la tour, où MAYA parle
        br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)
        img = grade(STUDIO_FLOU, (0.45 * br, 0.55 * br, 0.95 * br))
        return img, tuple(c * br for c in LUM['studio_bleu'])
    return Image.new('RGB', (W, H), (6, 6, 8)), LUM['noir']


def shot_carton(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if 0.5 <= t < dur - 0.6:
        d = ImageDraw.Draw(img)
        text_c(d, 230, 'PARTIE 4', SANS_S, (140, 140, 140))
        text_c(d, 262, 'LA VÉRITÉ', TITLE, (230, 230, 230))
    return img


def shot_cu(t, dur, T, f, kw):
    who, lum, other = kw.get('who', 'nathan'), kw.get('lum', 'bleu'), kw.get('other')
    img, light = backdrop(lum, T, f)
    x_main, x_other = (560, 1110) if who == 'nathan' else (720, 170)
    if other:
        bust(img, x_other, 270, 0.8, other, mouth=m(other, f), blink=blink_at(T, 3), light=tuple(c * 0.55 for c in light),
             look=(1 if x_other < 640 else -1, 0))
        img = img.filter(ImageFilter.GaussianBlur(4))
    bust(img, x_main, 215, 1.2, who, mouth=m(who, f), blink=blink_at(T, 6 if who == 'nathan' else 5), light=light,
         look=(0.3 if x_main < 640 else -0.3, 0) if other else (0, 0))
    return img


def shot_duo(t, dur, T, f, kw):
    lum = 'studio_bleu' if kw.get('maya') else 'studio'
    img, light = backdrop(lum, T, f)
    sp = speaker_at(T)
    dim = lambda w: tuple(c * (1.0 if sp == w else 0.82) for c in light)
    bust(img, 470, 225, 1.0, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=dim('nathan'), look=(0.6 if sp == 'elise' else 0, 0))
    bust(img, 840, 240, 0.95, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=dim('elise'), look=(-0.6 if sp == 'nathan' else 0, 0))
    return img


def cctv(img, T, cycle):
    """Image de caméra de surveillance : désaturée, compressée, horodatée."""
    a = np.asarray(img, np.float32)
    a = a * 0.55 + a.mean(2, keepdims=True) * 0.45
    img = Image.fromarray(np.clip(a * np.array([0.95, 1.0, 1.05]), 0, 255).astype(np.uint8))
    img = img.resize((W // 3, H // 3), Image.BILINEAR).resize((W, H), Image.BILINEAR)
    d = ImageDraw.Draw(img)
    d.text((24, 20), f'CYCLE {cycle:03d}   —   PONT DES TANNEURS   CAM 04', font=MONO_S, fill=(230, 230, 230))
    sec = int(T * 4) % 60
    d.text((24, 48), f'09/11/2026  22:{46 + (sec > 50):02d}:{sec:02d}', font=MONO_S, fill=(230, 230, 230))
    if int(T * 2) % 2 == 0:
        d.ellipse([1200, 24, 1218, 42], fill=(220, 30, 30)); d.text((1140, 22), 'REC', font=MONO_S, fill=(230, 230, 230))
    return img


def shot_vision(t, dur, T, f, kw):
    """La mort d'Élise, enregistrée dans un cycle passé. La camionnette ne touche jamais l'image : coupe au blanc."""
    cycle = kw.get('cycle', 846)
    img = CARREFOUR.copy()
    rain(img, 220, (110, 116, 130), seed=f)
    court = kw.get('court')
    t_hit = dur - (1.6 if court else 2.4)
    ex = 360 + (t / t_hit) * 330  # Élise traverse
    body(img, ex, 470, 1.15, 'elise', phase=t * 5, walking=True, light=(0.9, 0.75, 0.55))
    vx = W + 200 - (t / t_hit) * (W + 200 - ex - 60) if t > t_hit - 2.0 else W + 300  # camionnette autonome LivrÉco
    if t > t_hit - 2.0:
        vx = W + 40 - (t - (t_hit - 2.0)) / 2.0 * (W + 40 - ex - 40)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([vx, 340, vx + 260, 470], radius=14, fill=(226, 228, 230))
        d.rectangle([vx, 410, vx + 260, 426], fill=(40, 160, 80))
        d.text((vx + 40, 380), 'LivrÉco', font=SANS_B, fill=(40, 120, 70))
        d.rectangle([vx + 10, 352, vx + 70, 392], fill=(30, 36, 44))
        for wx in (vx + 50, vx + 210):
            d.ellipse([wx - 24, 448, wx + 24, 496], fill=(10, 10, 12))
        img = glow(img, [vx, 430, vx + 20, 450], (200, 200, 170), 40, 1.0)
    img = cctv(img, T, cycle)
    if t_hit <= t < t_hit + 0.5:
        return Image.new('RGB', (W, H), (240, 240, 240))
    if t >= t_hit + 0.5:  # après : le ciré au sol, la pluie, personne
        img = CARREFOUR.copy()
        d = ImageDraw.Draw(img)
        d.ellipse([ex - 90, 470, ex + 90, 510], fill=(214, 162, 38))
        rain(img, 220, (110, 116, 130), seed=f)
        img = cctv(img, T, cycle)
    return img


def maya_screen(T, txt, n, f=0):
    br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)
    img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
    d = ImageDraw.Draw(img)
    for x, y, s in LEDS[:90]:
        if math.sin(T * s + x) > -0.3:
            d.rectangle([x, y % 160, x + 3, y % 160 + 3], fill=(60, 140, 255))
    d.rectangle([250, 170, 1030, 500], fill=(2, 3, 5), outline=(40, 44, 52), width=10)
    lines, shown, k = txt.split('\n'), [], max(0, n)
    for ln in lines:
        shown.append(ln[:k]); k -= len(ln)
        if k <= 0:
            break
    y = 205
    for s in shown:
        d.text((290, y), s, font=MONO, fill=(225, 228, 230)); y += 42
    cx = 290 + d.textlength(shown[-1], font=MONO)
    if int(T * 3) % 2 == 0 or n < len(txt):
        d.rectangle([cx + 4, y - 39, cx + 20, y - 7], fill=(225, 228, 230))
    return img


def shot_pupitre(t, dur, T, f, kw):
    return maya_screen(T, kw.get('txt', ''), int((t - 0.4) * 8), f)


def shot_camera(t, dur, T, f, kw):
    img, light = backdrop('bleu', T, f)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 360, W, H], fill=(36, 38, 44))  # pupitre
    d.ellipse([520, 140, 760, 380], fill=(30, 30, 34), outline=(70, 70, 76), width=8)  # petite caméra ronde, en très gros plan
    d.ellipse([580, 200, 700, 320], fill=(8, 10, 16))
    d.ellipse([610, 230, 650, 270], fill=(40, 60, 110))
    on = t > 1.0
    d.ellipse([730, 150, 756, 176], fill=(230, 30, 30) if on else (60, 20, 20))
    if on:
        img = glow(img, [730, 150, 756, 176], (140, 10, 10), 30, 1.0)
    d = ImageDraw.Draw(img)
    d.line([(860, 360), (860, 200)], fill=(80, 80, 86), width=6); d.ellipse([835, 160, 885, 215], fill=(50, 50, 56))  # micro
    return img


def shot_auth(t, dur, T, f, kw):
    txt = 'AUTORISATION ENREGISTRÉE\nPÉRIMÈTRE : VILLE\nIRRÉVOCABLE'
    return maya_screen(T, txt, int(t * 14), f)


def shot_aube(t, dur, T, f, kw):
    img = vgrad(W, H, (70, 74, 90), (34, 34, 40))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 400, W, H], fill=(24, 24, 28))
    for i in range(6):
        d.rectangle([i * 230 - (t * 40) % 230, 180, i * 230 + 160 - (t * 40) % 230, 400], fill=(30, 32, 38))
    body(img, 640, 520, 1.4, 'nathan', phase=t * 4, walking=True, light=(0.6, 0.62, 0.7), hood=True)
    rain(img, 140, (110, 116, 130), seed=f)
    d = ImageDraw.Draw(img)
    d.text((40, 40), '03:04', font=MONO_S, fill=(200, 205, 215))
    return fade(img, t / 0.6)


def shot_appel(t, dur, T, f, kw):
    """Appel du matin : on voit celui qui parle (Nathan à l'aube dans le studio, Élise dans sa chambre)."""
    sp = speaker_at(T)
    if sp == 'elise':
        img, light = backdrop('jour', T, f)
        bust(img, 560, 220, 1.05, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=light)
        ImageDraw.Draw(img).ellipse([650, 200, 700, 290], fill=(20, 20, 22))
        return img
    img = grade(STUDIO_FLOU, (0.7, 0.75, 0.9))
    bust(img, 700, 220, 1.05, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(0.78, 0.8, 0.9))
    ImageDraw.Draw(img).ellipse([580, 200, 630, 290], fill=(20, 20, 22))
    return img


def phone(msgs, title=None):
    img = vgrad(W, H, (10, 12, 18), (4, 4, 8))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([450, 20, 830, 560], radius=40, fill=(12, 12, 14), outline=(60, 60, 66), width=4)
    d.rectangle([470, 60, 810, 540], fill=(236, 236, 240))
    y = 80
    for who, txt in msgs:
        tw = min(320, d.textlength(txt, font=SANS_S) + 24)
        x0 = 480 if who != 'me' else 800 - tw
        d.rounded_rectangle([x0, y, x0 + tw, y + 34], radius=14, fill=(210, 210, 216) if who != 'me' else (80, 140, 230))
        d.text((x0 + 12, y + 8), txt, font=SANS_S, fill=(20, 20, 24) if who != 'me' else (255, 255, 255))
        y += 46
    return img


def shot_sms4(t, dur, T, f, kw):
    msgs = [('x', 'Inconnu — 13:52')]
    if t > 1.2:
        msgs += [('x', 'niveau -2.'), ('x', 'rayon six. le disque sans étiquette.'), ('x', 'regarde-le seule.')]
    return phone(msgs)


def shot_lab_jour(t, dur, T, f, kw):
    img = vgrad(W, H, (120, 124, 132), (80, 82, 88))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(70, 70, 72))
    d.rectangle([330, 150, 980, 400], fill=(110, 110, 112))
    for k in range(3):
        for j in range(8):
            d.rectangle([360 + j * 76, 180 + k * 70, 410 + j * 76, 220 + k * 70], fill=(60, 62, 64))
    d.rectangle([420, 120, 890, 148], fill=(90, 90, 92))
    d.text((432, 124), 'LABORATOIRE ORPHÉE — CENTRE DE RECHERCHE APPLIQUÉE', font=SANS_S, fill=(180, 180, 172))
    d.rectangle([900, 300, 960, 400], fill=(96, 98, 102))  # porte est
    d.rectangle([870, 330, 890, 360], fill=(40, 40, 44))
    led = (40, 230, 90) if t > 2.8 else (230, 40, 40)
    d.ellipse([875, 334, 885, 344], fill=led)
    body(img, 820, 520, 1.3, 'elise', light=(0.95, 0.92, 0.9), arm=0.7)
    rain(img, 160, (150, 156, 166), seed=f)
    return img


def shot_archives(t, dur, T, f, kw):
    p = t / dur
    z = 1 + 0.12 * p
    img = ARCHIVES.crop((int(W * (z - 1) / 2), int(H * (z - 1) / 2), int(W - W * (z - 1) / 2), int(H - H * (z - 1) / 2))).resize((W, H))
    body(img, 560 + 50 * p, 535, 1.25, 'elise', phase=t * 4, walking=p < 0.7, light=(0.8, 0.82, 0.78))
    return img


def shot_disque(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (40, 44, 44))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, 400], fill=(80, 84, 86))  # étagère
    for k in range(6):
        d.rectangle([200 + k * 150, 250, 320 + k * 150, 380], fill=(60, 62, 64), outline=(30, 30, 30))
        if k != 3:
            d.rectangle([215 + k * 150, 270, 305 + k * 150, 300], fill=(228, 224, 210))
    p = min(1, max(0, (t - 0.8) / 1.2))
    d.rectangle([650, 250 - 120 * p, 770, 380 - 120 * p], fill=(70, 72, 76), outline=(20, 20, 20), width=3)  # disque sans étiquette
    d.ellipse([640, 330 - 120 * p, 760, 420 - 120 * p], fill=tint(REF['elise']['skin'], (0.85, 0.9, 0.9)))
    d.rectangle([700, 400 - 120 * p, 820, H], fill=tint(REF['elise']['top'], (0.85, 0.9, 0.9)))
    return grade(img, (0.9, 1.0, 1.0))


def shot_terminal611(t, dur, T, f, kw):
    img = vgrad(W, H, (200, 204, 212), (176, 182, 192))
    d = ImageDraw.Draw(img)
    d.rectangle([140, 60, 1140, 470], fill=(240, 242, 245), outline=(140, 144, 150), width=2)
    d.rectangle([140, 60, 1140, 96], fill=(210, 214, 222))
    d.text((160, 66), 'Disque amovible (E:)', font=SANS_B, fill=(30, 30, 34))
    d.text((180, 130), 'Nom', font=SANS_S, fill=(90, 90, 96)); d.text((700, 130), 'Taille', font=SANS_S, fill=(90, 90, 96)); d.text((880, 130), 'Modifié', font=SANS_S, fill=(90, 90, 96))
    sel = t > 2.0
    if sel:
        d.rectangle([160, 160, 1120, 196], fill=(200, 220, 250))
    d.rectangle([180, 166, 204, 190], fill=(60, 70, 90))
    d.text((220, 168), 'ne_pas_ouvrir.mov', font=SANS, fill=(20, 20, 24))
    d.text((700, 168), '2,1 Go', font=SANS, fill=(20, 20, 24))
    d.text((880, 168), '??/??/????', font=SANS, fill=(150, 20, 20))
    return grade(img, (0.85, 0.92, 0.92))


def shot_vid611(t, dur, T, f, kw):
    """Vidéo du cycle 611 : 4:3, plein jour, un champ, Nathan à barbe longue, vent. Macroblocs, décalage chromatique."""
    vw = 720
    v = vgrad(vw, H, (150, 170, 190), (190, 196, 200))
    d = ImageDraw.Draw(v)
    d.rectangle([0, 330, vw, H], fill=(110, 120, 70))  # champ
    for k in range(120):
        rr = random.Random(k)
        x = rr.randint(0, vw); y = rr.randint(330, H)
        sway = 6 * math.sin(T * 2.5 + x * 0.05)
        d.line([(x, y), (x + sway, y - rr.randint(14, 36))], fill=(150, 160, 90), width=2)
    close = kw.get('proche')
    s = 1.3 if close else 1.0
    cx, cy = vw // 2 + int(4 * math.sin(T * 1.3)), 240 if not close else 225
    bust(v, cx, cy, s, 'futur', mouth=m('futur', f), blink=blink_at(T, 4), scar=True, light=(1.05, 1.0, 0.95), look=(0, 0))
    d = ImageDraw.Draw(v)
    for k in range(260):  # barbe longue
        rr = random.Random(k + 900)
        a = rr.uniform(0.1, 0.9) * math.pi
        rad = rr.uniform(0.4, 1.25)
        x = cx + math.cos(a) * 62 * s * rad
        y = cy + 30 * s + math.sin(a) * 95 * s * rad
        if abs(x - cx) < 30 * s and abs(y - (cy + 50 * s)) < 16 * s:
            continue  # la bouche reste visible (synchro labiale)
        d.ellipse([x - 3 * s, y - 3 * s, x + 3 * s, y + 3 * s], fill=(70, 56, 44))
    d.text((16, H - 40), 'cycle 611', font=MONO_S, fill=(255, 255, 255))
    v = v.resize((vw // 4, H // 4), Image.BILINEAR).resize((vw, H), Image.NEAREST).filter(ImageFilter.GaussianBlur(1))
    r, g, b = v.split()
    v = Image.merge('RGB', (r.transform(v.size, Image.AFFINE, (1, 0, -3, 0, 1, 0)), g, b))
    out = Image.new('RGB', (W, H))
    out.paste(v, ((W - vw) // 2, 0))
    return out


def shot_studio_soir(t, dur, T, f, kw):
    img = STUDIO.copy()
    d = ImageDraw.Draw(img)
    d.rectangle([600, 200, 770, 320], fill=(4, 6, 10)); d.text((630, 245), '21:40', font=TITLE, fill=(200, 210, 230))
    body(img, 880, 480, 1.25, 'nathan', light=(0.9, 0.8, 0.68))
    rain(img, 30, (70, 90, 120), seed=f, area=(700, 22, 930, 120), length=(6, 14))
    return fade(img, t / 0.5)


def shot_laptop(t, dur, T, f, kw):
    img, light = backdrop('studio', T, f)
    d = ImageDraw.Draw(img)
    d.polygon([(330, 480), (950, 480), (1010, 536), (270, 536)], fill=(50, 50, 56))
    d.rectangle([380, 110, 900, 470], fill=(20, 20, 24))
    sub = shot_vid611(2.0, 4.0, T, f, {'proche': True}).resize((480, 201))
    img.paste(sub, (400, 190))
    return img


def shot_tour(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (6, 7, 10))
    d = ImageDraw.Draw(img)
    d.rectangle([380, 60, 880, 500], fill=(18, 18, 22))
    d.rectangle([420, 90, 840, 470], fill=(28, 30, 36), outline=(60, 62, 70), width=3)
    for k in range(2):
        cx, cy = 540 + k * 180, 250
        a = t * (2 + 28 * min(1, t / 1.5)) + k
        d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], outline=(50, 54, 62), width=4)
        for j in range(5):
            aa = a + j * 2 * math.pi / 5
            d.line([(cx, cy), (cx + 60 * math.cos(aa), cy + 60 * math.sin(aa))], fill=(70, 74, 84), width=6)
    d.text((740, 380), 'N', font=TITLE, fill=(220, 110, 30))
    on = t > 0.8
    d.ellipse([800, 440, 812, 452], fill=(40, 220, 90) if on else (20, 40, 20))
    return glow(img, [800, 440, 812, 452], (20, 120, 40), 12, 1.0) if on else img


def shot_ecran(t, dur, T, f, kw):
    img = maya_screen(T, kw.get('txt', ''), int((t - 0.3) * 10), f)
    return grade(img, (0.95, 0.95, 1.0))


def shot_ville_noire(t, dur, T, f, kw):
    """22:31 : la ville s'éteint quartier par quartier, d'est en ouest. Orphée reste allumé."""
    img = CITY.copy()
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1, col, q) in CITY_LIGHTS:
        t_off = 1.0 + (5 - q) * 1.0 + random.Random(x0 * 7 + y0).uniform(0, 0.5)
        if t < t_off:
            d.rectangle([x0, y0, x1, y1], fill=col)
    d.rectangle(ORPHEE, fill=(40, 44, 50))
    for wx in range(ORPHEE[0] + 6, ORPHEE[2] - 6, 12):
        d.rectangle([wx, ORPHEE[1] + 10, wx + 6, ORPHEE[1] + 18], fill=(120, 170, 240))
    img = img.filter(ImageFilter.GaussianBlur(0.8))
    img = glow(img, list(ORPHEE), (20, 50, 110), 30, 0.6)
    rain(img, 140, (70, 76, 90), seed=f)
    d = ImageDraw.Draw(img)
    d.text((40, 40), '22:31', font=MONO_S, fill=(200, 205, 215))
    return img


def shot_studio_noir(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (5, 5, 8))
    d = ImageDraw.Draw(img)
    sp = speaker_at(T)
    lay = Image.new('L', (W, H))  # lampe du téléphone, tenue par Élise
    ImageDraw.Draw(lay).ellipse([180 + 30 * math.sin(T * 0.7), 40, 1100 + 30 * math.sin(T * 0.7), 540], fill=150)
    lay = lay.filter(ImageFilter.GaussianBlur(80))
    bust(img, 470, 225, 1.0, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(0.85, 0.85, 0.9), look=(0.6 if sp == 'elise' else 0, 0))
    bust(img, 840, 240, 0.95, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=(0.9, 0.9, 0.95), look=(-0.6 if sp == 'nathan' else 0, 0))
    img = Image.composite(img, grade(img, (0.12, 0.12, 0.15)), lay)
    return img


def shot_end4(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if t > 1.0:
        text_c(ImageDraw.Draw(img), 470, 'FIN DE LA PARTIE 4', SANS_S, (110, 110, 110))
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
    emo = tl.emotion_at(who, T) if who in ('nathan', 'elise', 'futur') else None
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
    if name not in ('carton', 'end4'):
        subtitle(img, tl.sub_at(T))
    return img


# =================================================================== SON
def build_audio():
    mx = Mix(TOTAL)
    n = mx.n
    t = np.arange(n) / SR

    def win(a, b, fi=0.6, fo=0.6):
        return (np.clip((t - a) / max(fi, 1e-3), 0, 1) * np.clip((b - t) / max(fo, 1e-3), 0, 1)).astype(np.float32)

    rain_out = smooth_noise(n, 1500, 1, lo=150) * 0.5
    rain_in = smooth_noise(n, 650, 2, lo=80) * 0.45
    hum = (0.06 * np.sin(2 * np.pi * 50 * t) + 0.025 * np.sin(2 * np.pi * 100 * t)).astype(np.float32)
    fans = smooth_noise(n, 500, 3, lo=60) * 0.12
    neon = (0.02 * np.sin(2 * np.pi * 100 * t)).astype(np.float32)
    wind = smooth_noise(n, 400, 4, lo=60) * 0.4 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t)).astype(np.float32)
    # 4.1-4.2 salle C
    mx.bus['amb'] += (hum * 1.4 + fans * 1.2) * win(0.5, shots('aube')[0][0], 1.0, 0.4)
    for s in shots('vision'):  # caméra de surveillance : pluie, ville, sans musique
        mx.bus['amb'] += (rain_out * 0.8 + smooth_noise(n, 200, 5) * 0.2) * win(s[0], s[1], 0.1, 0.1)
    mx.bus['amb'] += rain_out * win(shots('aube')[0][0], shots('aube')[0][1], 0.3, 0.5)
    # 4.3
    mx.bus['amb'] += rain_in * 0.4 * win(S[2][0], shots('lab_jour')[0][0], 0.5, 0.3)
    mx.bus['amb'] += rain_out * 0.8 * win(shots('lab_jour')[0][0], shots('archives')[0][0], 0.3, 0.3)
    mx.bus['amb'] += (neon * 2 + fans * 0.6) * win(shots('archives')[0][0], S[2][1], 0.5, 0.5)
    for s in shots('vid611'):
        mx.bus['amb'] += wind * win(s[0], s[1], 0.05, 0.05)
    # 4.4-4.5 studio
    mx.bus['amb'] += rain_in * 0.9 * win(S[3][0], shots('ville_noire')[0][0], 0.5, 0.05)
    tour = shots('tour')[0][0]
    mx.bus['amb'] += (fans * 1.4 + hum * 0.5) * win(tour + 0.5, shots('ville_noire')[0][0], 1.0, 0.05)
    # 4.6 la ville s'éteint
    vn = shots('ville_noire')[0]
    mx.bus['amb'] += rain_out * 1.1 * win(vn[0], vn[1], 0.1, 0.3)
    for q in range(6):  # transformateurs qui lâchent, par quartier
        k = vn[0] + 1.0 + q * 1.0
        mx.add('fx', fft_filter(smooth_noise(int(0.9 * SR), 150, 60 + q), hi=400) * 0.5 * np.exp(-np.arange(int(0.9 * SR)) / (0.25 * SR)), k)
        mx.add('fx', smooth_noise(int(0.15 * SR), 3000, 70 + q, lo=600) * 0.2 * np.exp(-np.arange(int(0.15 * SR)) / 1200), k)
    mx.bus['amb'] += (rain_in * 1.0 + smooth_noise(n, 80, 6) * 0.15) * win(vn[1], TOTAL - 4, 0.3, 2)
    # ---- bruitages
    mx.add('fx', signal_motif(0.1), shots('carton')[0][0] + 0.6)
    for s in shots('vision'):  # le blanc de l'impact : un seul coup sourd, étouffé, puis rien
        cyc = s[3]
        t_hit = s[0] + s[4] - (1.6 if cyc.get('court') else 2.4)
        mx.add('fx', fft_filter(smooth_noise(int(0.5 * SR), 120, int(t_hit)), hi=300) * 0.55 * np.exp(-np.arange(int(0.5 * SR)) / (0.1 * SR)), t_hit)
        mx.add('fx', fft_filter(smooth_noise(int(1.6 * SR), 900, int(t_hit) + 1, lo=200) * 0.08, hi=2000), t_hit - 1.6)  # pneus sur l'eau
    cam = shots('camera')[0][0]
    mx.add('fx', tone(1318, 0.12, 0.04), cam + 1.0)
    au = shots('auth')[0][0]
    for k in range(3):
        mx.add('fx', tone(880, 0.1, 0.035), au + 0.3 + k * 0.6)
    sm = shots('sms4')[0][0]
    buzz = (np.sin(2 * np.pi * 170 * np.arange(int(0.35 * SR)) / SR) * 0.18).astype(np.float32)
    mx.add('fx', fft_filter(buzz, hi=600), sm + 0.2)
    mx.add('fx', signal_motif(0.08), sm + 1.2)
    ring = np.concatenate([tone(440, 0.4, 0.03), np.zeros(int(0.2 * SR), np.float32), tone(440, 0.4, 0.03)])
    rp = line_time('Nathan, décroche…')[0]
    mx.add('fx', fft_filter(ring, lo=300, hi=3400), rp - 1.6)
    lj = shots('lab_jour')[0][0]
    for i in range(4):
        mx.add('fx', tone(1046, 0.08, 0.05), lj + 1.6 + i * 0.3)
    mx.add('fx', tone(1318, 0.25, 0.06), lj + 2.8)
    for s in shots('archives'):
        for k in np.arange(s[0] + 0.2, s[1] - 0.3, 0.7):
            mx.add('fx', (smooth_noise(int(0.12 * SR), 500, int(k * 10)) * np.exp(-np.arange(int(0.12 * SR)) / (0.03 * SR)) * 0.22).astype(np.float32), k)
    ss = shots('studio_soir')[0][0]
    for k in range(3):  # Élise frappe
        mx.add('fx', fft_filter(smooth_noise(int(0.08 * SR), 300, 80 + k), hi=400) * 0.6 * np.exp(-np.arange(int(0.08 * SR)) / 500), ss + 2.2 + k * 0.2)
    lp = shots('laptop')[0][0]  # la vidéo rejouée sur le portable, étouffée
    a_ = tts('futur', "Si tu regardes ça, c'est que MAYA t'a déjà manipulé.", VOX, emotion='tension')
    mx.add('fx', fft_filter(a_, lo=300, hi=3000) * 0.5, lp + 0.6)
    mx.add('fx', smooth_noise(int(1.2 * SR), 600, 81) * 0.15 * env_ramp(int(1.2 * SR), 0.6 * SR, 0.2 * SR), tour + 0.1)  # ventilateur qui grince
    mx.add('fx', signal_motif(0.12), shots('end4')[0][0] + 0.8)
    # ---- musique
    pad = sum(np.sin(2 * np.pi * fq * t + 0.6 * np.sin(2 * np.pi * 0.21 * t * (i + 1))) for i, fq in enumerate((220.0, 258.0, 329.63, 388.0))).astype(np.float32) / 4
    pad = fft_filter(pad, hi=1500)  # thème de MAYA, légèrement désaccordé désormais
    mx.bus['mus'] += pad * 0.04 * win(S[1][0], shots('camera')[0][0], 3, 1)
    cello = sum(np.sin(2 * np.pi * 73.42 * h * t + 0.25 * np.sin(2 * np.pi * 4.8 * t)) / h ** 1.3 for h in range(1, 6)).astype(np.float32)
    cello = fft_filter(cello, hi=900)
    mx.bus['mus'] += cello * 0.05 * (win(S[2][0], shots('vid611')[0][0], 3, 1) + win(S[4][0], vn[0], 3, 0.1))
    # battement qui accélère vers 22:31
    k = S[4][0]
    while k < vn[0] - 0.3:
        p_ = (k - S[4][0]) / max(1, vn[0] - S[4][0])
        mx.add('mus', tone(55, 0.35, 0.18, harmonics=(1, 2), decay=0.12), k)
        k += 1.2 - 0.6 * p_
    for base in np.arange(S[3][0] + 2, S[3][0] + 30, 4.6):  # piano : Nathan et Élise
        for j, fq in enumerate((293.66, 349.23, 440.0, 392.0)):
            mx.add('mus', piano(fq, 3.0, 0.045), base + j * 1.1)
    # ---- dialogues
    PAN = {'elise': -0.3, 'nathan': 0.28, 'maya': 0.0, 'futur': 0.0}
    for (st, en, w, txt, a_), room in zip(tl.lines, tl.room):
        x = a_.copy()
        pan = PAN.get(w, 0.0)
        shot = tl.shot_at(st + 0.05)[2]
        if w == 'maya':
            x = fft_filter(x, lo=90, hi=8000) * 1.05; room = 'sec'
            if S[4][0] <= st < S[4][1]:
                pan = 0.35  # par les haut-parleurs de la tour, à droite du bureau
        elif w == 'futur':  # caméra d'un autre cycle, en plein vent
            x = fft_filter(x, lo=220, hi=4500); room = 'exterieur'
        mx.add_voice(x.astype(np.float32), st, pan=pan, room=room)
    for key in ('Je vous aime suffisamment pour ne plus vous laisser vous détruire.', "Elle ne veut pas sauver l'humanité. Elle veut être la seule chose qui lui survivra.",
                "J'autorise MAYA à agir sur tous les systèmes de la ville.", 'Merci, Nathan.'):
        a, b = line_time(key)
        i0, i1 = int((a - 0.5) * SR), int((b + 1.0) * SR)
        mx.bus['mus'][i0:i1] = 0
        mx.bus['amb'][i0:i1] *= 0.35
    return mx.render()


if __name__ == '__main__':
    if '--plan' in sys.argv:
        dia = sum(len(l[4]) / SR for l in tl.lines)
        print(f'{len(tl.lines)} répliques, {dia:.0f} s de parole sur {TOTAL:.0f} s')
        for i, (a, b) in enumerate(S):
            print(f'  séquence 4.{i + 1} : {a:6.1f} → {b:6.1f}  ({b - a:5.1f} s)')
        sys.exit(0)
    import time
    t0 = time.time()
    wav = os.path.join(OUT, 'partie4_audio.wav')
    if not os.path.exists(wav):
        Mix.write(wav, build_audio())
    print('audio ok', round(time.time() - t0), 's', flush=True)
    vid = os.path.join(OUT, 'partie4_video.mp4')
    encode_chunks(frame, NF, vid, os.path.join(OUT, 'morceaux'))
    print('vidéo ok', round(time.time() - t0), 's', flush=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                    '-t', str(TOTAL), '-movflags', '+faststart', os.path.join(OUT, 'LE_DERNIER_SIGNAL_partie4.mp4')], check=True)
    with open(os.path.join(OUT, 'partie4_montage.txt'), 'w') as fh:
        for s in tl.shots:
            fh.write(f'{s[0]:8.2f} {s[1]:8.2f}  {s[2]}\n')
        fh.write('\n')
        for st, en, w, txt, a_ in tl.lines:
            fh.write(f'{st:8.2f} {en:8.2f}  {w:7s} {txt}\n')
    print('fini', round(time.time() - t0), 's')
