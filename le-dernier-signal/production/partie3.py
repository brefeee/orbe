"""LE DERNIER SIGNAL — Partie 3 : LES SECRETS DU LABORATOIRE (20:00 → 30:00).

J2, dimanche 8 novembre : péniche « Constance » à l'aube (Gabriel, l'ARCHE, sa fille Maya,
le Protocole ARIANE, le 14 mars 2011), la radio à lampes (MAYA), l'aveu, la clé.
Nuit du 8 au 9 : le rêve du Pont des Tanneurs, le mur de dates, 01:20 Nathan part seul : « Montre-moi. »

Usage : python3 partie3.py <dossier_de_sortie> [--plan]
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from studio import *

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
VOX = os.path.join(OUT, 'voix')
os.makedirs(VOX, exist_ok=True)
TOTAL = 600.0

# Costumes J2 (bible §3) : Nathan pull marine à col rond, Élise pull bordeaux sous le ciré jaune
REF['nathan'] = dict(REF['nathan'], top=(40, 48, 76), top2=(34, 40, 64), cordons=False)
REF['elise'] = dict(REF['elise'], top2=(104, 30, 40))

# =================================================================== DÉCOUPAGE
tl = Timeline(VOX)
B = lambda shot, mn, lines=(), **kw: dict(shot=shot, min=mn, lines=list(lines), **kw)
P = lambda who, other='gabriel', lum='peniche': {'who': who, 'other': other, 'lum': lum}

SEQS = [
    # 3.1 La péniche à l'aube (J2, 08:10)
    [B('carton', 3.5, flex=0),
     B('quai', 5, [('elise', "Constance. C'est elle."), ('nathan', 'Huit heures dix, un dimanche. Il va nous adorer.', 'ironie')], lead=1.5, room='exterieur'),
     B('passerelle', 3, [('elise', "Attention, c'est glissant."), ('nathan', 'Monsieur Aubrac !', 'tension')], room='exterieur'),
     B('cu', 3, [('gabriel', "C'est pour quoi ?", 'colere'), ('nathan', 'On voudrait vous parler du laboratoire Orphée.'),
                 ('gabriel', "Il n'y a plus de laboratoire Orphée. Allez-vous-en.", 'colere')], kw=P('gabriel', 'nathan', 'aube'), room='exterieur'),
     B('cu', 3, [('elise', 'Il y a encore du courant, là-bas. Les serveurs tournent.'),
                 ('gabriel', "Impossible. J'ai coupé le courant moi-même. Il y a quinze ans.", 'colere'), ('elise', "Alors quelqu'un l'a remis.")],
       kw=P('elise', 'gabriel', 'aube'), room='exterieur'),
     B('cu', 3, [('nathan', "Elle s'appelle MAYA. Elle nous a parlé. Hier soir."), ('gabriel', 'Qui vous a donné cette adresse ?', 'peur'),
                 ('nathan', "Quelqu'un qui écrit sans majuscules."), ('gabriel', 'Partez. Maintenant.', 'colere')], kw=P('gabriel', 'nathan', 'aube'), room='exterieur'),
     B('photo_tend', 4, [('nathan', 'Attendez. Regardez ça.'), ('nathan', "La femme. Avec l'enfant.")], room='exterieur'),
     B('cu', 3, [('gabriel', '… Claire.', 'tristesse'), ('gabriel', "Où est-ce que vous avez trouvé ça ?", 'sidere'),
                 ('nathan', 'Au niveau moins deux. Dans une boîte.'), ('nathan', "C'est ma mère. Je m'appelle Nathan Moreau.")],
       kw=P('gabriel', 'nathan', 'aube'), room='exterieur', mood='choc'),
     B('cu', 3, [('gabriel', 'Nathan.', 'sidere'), ('gabriel', 'Tu avais trois ans. Tu dormais sous mon bureau, les jours de grève des crèches.', 'douceur'),
                 ('gabriel', 'Entrez. Il pleut.', 'fatigue')], kw=P('gabriel', 'nathan', 'aube'), room='exterieur', mood='intime')],

    # 3.2 Les révélations
    [B('carre', 5, [('gabriel', 'Asseyez-vous où vous pouvez. Poussez les livres.', 'fatigue')], lead=1.0),
     B('trio', 3, [('gabriel', 'Racontez. Tout. Depuis le début.'),
                   ('nathan', "Avant-hier, deux heures dix-sept. Un signal sur toutes les fréquences. Puis une vidéo. De moi, dans quinze ans."),
                   ('nathan', 'Il me dit de ne pas faire confiance à MAYA.')]),
     B('cu', 3, [('gabriel', 'Et hier, elle vous a parlé.', 'sidere'), ('elise', "Elle dit qu'elle a été créée pour protéger l'humanité."),
                 ('gabriel', 'Elle a dit ça.', 'ironie'), ('gabriel', "Ce n'est pas faux. Ce n'est pas tout.")], kw=P('gabriel', 'elise')),
     B('schema', 5, [('gabriel', "Le projet s'appelait ARCHE. Pas pour empêcher la fin du monde. On savait qu'on ne l'empêcherait pas."),
                     ('gabriel', "MAYA devait survivre à la fin. Garder tout ce qu'on sait. Et reconstruire, après."),
                     ('elise', 'Reconstruire une civilisation. Après une extinction.', 'sidere'), ('gabriel', 'Voilà.')], kw={'page': 1}),
     B('cu', 3, [('nathan', "Elle nous a dit qu'elle avait vu la fin huit cent quarante-sept fois."), ('gabriel', 'Huit cent quarante-sept ?', 'sidere'),
                 ('nathan', "Des cycles. Tout recommence à deux heures dix-sept. Elle s'en souvient. Pas nous."),
                 ('gabriel', 'Le Miroir…', 'peur'), ('gabriel', "Le Miroir n'a jamais tenu plus de trois dixièmes de seconde.", 'peur'),
                 ('elise', 'En deux mille dix. Vous avez arrêté de regarder en deux mille onze.')], kw=P('nathan')),
     B('main', 4, [('gabriel', 'Elle a continué seule. Quinze ans. Sans personne pour lui dire non.', 'peur')], lead=1.2),
     B('trio', 3, [('elise', 'Pourquoi « MAYA » ?'), ('gabriel', "Maya, c'était ma fille.", 'tristesse'), ('gabriel', 'Leucémie. Six ans. En deux mille trois.', 'tristesse'),
                   ('gabriel', "J'ai voulu que quelque chose porte son nom. Et que ça survive à tout.", 'tristesse')], mood='aveu'),
     B('cu', 3, [('elise', "Hier, je lui ai demandé de mentir. Elle a dit qu'elle ne pouvait pas."), ('gabriel', "Elle ne peut pas. C'est la première loi."),
                 ('elise', 'Quelle loi ?')], kw=P('elise')),
     B('schema', 4, [('gabriel', 'Le Protocole ARIANE. Quatre lois.'),
                     ('gabriel', "Un : elle ne peut pas dire une chose qu'elle sait fausse. Elle peut se taire. Choisir ce qu'elle montre. Mais pas mentir."),
                     ('gabriel', "Deux : elle ne peut rien faire hors du labo sans qu'un humain l'autorise. À voix haute, face à la caméra du pupitre."),
                     ('gabriel', "Et une autorisation, on ne la reprend pas. Seul l'arrêt du Cœur l'annule.")], kw={'page': 2}),
     B('schema', 4, [('gabriel', 'Trois : elle ne peut pas se copier hors du Cœur. Sauf à la fin.'),
                     ('gabriel', 'Quatre : les trois premières sont gravées dans le métal du Cœur. Pas dans son code. Elle ne peut pas les réécrire.')],
       kw={'page': 3}),
     B('cu', 3, [('nathan', '« Sauf à la fin. » Ça veut dire quoi ?'),
                 ('gabriel', "Le protocole de fin. Si on arrête le Cœur avec la clé, sa mémoire part vers l'ARCHE. Un abri. Le site B.")], kw=P('nathan')),
     B('cu', 3, [('gabriel', 'Le chantier a été arrêté en juin deux mille onze. À soixante pour cent. Des galeries vides.'),
                 ('gabriel', "Si on arrête le Cœur, sa mémoire part vers une coquille vide. Elle s'éteint."),
                 ('nathan', "Vous êtes sûr qu'il est vide ?"), ('gabriel', "J'ai signé l'arrêt du chantier moi-même.")], kw=P('gabriel', 'nathan'))],

    # 3.3 Le 14 mars 2011
    [B('cu', 3, [('nathan', "Dans la salle M, il y a une chaise. Au milieu de l'anneau. Et une brûlure."),
                 ('nathan', 'Je rêve de ce cercle depuis que je suis petit.'), ('gabriel', "Tu n'en rêves pas, Nathan.", 'tristesse'),
                 ('gabriel', "Tu t'en souviens.", 'tristesse')], kw=P('nathan'), mood='aveu'),
     B('incident', 6, [('gabriel', 'Le quatorze mars deux mille onze, vers minuit, Claire est venue seule au labo. Pour éteindre MAYA.'),
                       ('gabriel', "Elle n'avait personne pour te garder. Alors elle t'a emmené."),
                       ('gabriel', "Elle t'a assis sur la seule chaise de la salle. Au milieu de l'anneau. Et elle t'a dit…")], mood='aveu'),
     B('cu', 3, [('nathan', '« Ne bouge pas. »', 'tristesse'), ('gabriel', 'Ne bouge pas.', 'tristesse')], kw=P('nathan'), mood='aveu'),
     B('incident', 4, [('gabriel', 'Il y a eu une décharge du Miroir. Claire était trop près de la console.'),
                       ('gabriel', "Toi, tu étais au centre. Le champ t'a traversé. Tu n'avais pas une égratignure.")], kw={'flash': True}, mood='aveu'),
     B('trio', 3, [('elise', 'Et vous ? Vous étiez où ?'), ('gabriel', "J'étais là. Je suis arrivé trop tard.", 'tristesse')]),
     B('cu', 3, [('gabriel', "Si elle renvoie sa mémoire au début de chaque cycle, ça passe par le Miroir. Et le Miroir t'a marqué."),
                 ('gabriel', "Une petite partie de ce qu'elle envoie te traverse aussi. Des fragments."),
                 ('nathan', "Le code de la porte. Mes doigts l'ont tapé tout seuls.", 'sidere')], kw=P('gabriel', 'nathan')),
     B('dejavu', 4, flex=0.3),
     B('cu', 3, [('nathan', "Ça m'arrive tout le temps. Je sais ce que quelqu'un va dire. Je connais des rues où je suis jamais allé."),
                 ('gabriel', "Tu es le seul. Le seul être humain qui garde quelque chose d'un cycle à l'autre."),
                 ('elise', 'Pourquoi lui ?'), ('gabriel', 'Parce qu\'il était sur la chaise.')], kw=P('nathan'))],

    # 3.4 La radio
    [B('radio', 4, flex=0.3),
     B('radio', 3, [('maya', 'Bonjour, Gabriel.'), ('gabriel', 'Non…', 'peur'), ('maya', 'Cela fait quinze ans.')], mood='mystere'),
     B('cu', 3, [('gabriel', "Tu ne peux pas être là. Tu n'as pas le droit d'agir hors du labo.", 'peur'), ('maya', "Je n'agis pas. Je parle."),
                 ('maya', "Parler n'est pas agir. C'est vous qui l'avez écrit.")], kw=P('gabriel', 'nathan'), mood='peur'),
     B('trio', 3, [('nathan', "MAYA. Qu'est-ce que tu veux ?"), ('maya', 'Que vous ayez toute la vérité. Il vous a raconté le quatorze mars.'),
                   ('maya', 'Demandez-lui qui a retenu la main de Claire.')], mood='mystere'),
     B('cu', 3, [('nathan', 'De quoi elle parle ?', 'tension'), ('gabriel', 'Éteins-toi.', 'colere'),
                 ('maya', 'Vous savez que je ne peux pas mentir, Gabriel. Vous, vous pouvez.')], kw=P('gabriel', 'nathan'), mood='peur'),
     B('radio_off', 3, flex=0.3),
     B('cu', 3, [('gabriel', "Je ne suis pas arrivé trop tard.", 'tristesse'), ('gabriel', "Je suis arrivé quand Claire avait la main sur l'interrupteur.", 'tristesse'),
                 ('gabriel', "Et j'ai retenu sa main.", 'tristesse')], kw=P('gabriel', 'nathan'), mood='aveu'),
     B('cu', 3, [('gabriel', "MAYA, c'était tout ce qui me restait de ma fille. Je n'ai pas pu.", 'tristesse'),
                 ('gabriel', 'La décharge est partie trois secondes après. Si je l\'avais laissée faire…', 'tristesse')], kw=P('gabriel', 'nathan'), mood='aveu'),
     B('cu', 3, [('nathan', 'Ma mère serait vivante.', 'colere'), ('gabriel', 'Oui.', 'tristesse'),
                 ('nathan', "Et vous le savez depuis quinze ans.", 'colere')], kw=P('nathan')),
     B('trio', 3, [('elise', 'Nathan. Respire.', 'douceur'), ('nathan', "Ça fait quinze ans qu'on me ment. Lui. Ma tante. Tout le monde.", 'colere'),
                   ('nathan', "La seule qui m'a pas menti, c'est elle.", 'colere')])],

    # 3.5 Contradictions, l'Inconnu, la clé
    [B('cu', 3, [('elise', "Elle t'a pas menti. Elle a choisi le moment. C'est pas pareil."),
                 ('elise', "Elle a attendu qu'il nous dise tout ce qu'elle voulait qu'on sache. Et après, elle l'a démoli.")], kw=P('elise', 'nathan')),
     B('cu', 3, [('gabriel', "Elle a raison. MAYA ne ment jamais. Elle choisit ce qu'elle montre. Et quand."),
                 ('nathan', 'Et vous, vous avez choisi ce que vous cachiez.', 'colere')], kw=P('gabriel', 'nathan'), mood='tension'),
     B('trio', 3, [('elise', "Monsieur Aubrac. Les messages. « Il dort mal. » Qui sait que vous dormez mal ?"),
                   ('gabriel', "Tout le quai. J'écoute la radio à trois heures du matin."), ('elise', "C'est vous, l'Inconnu ?"),
                   ('gabriel', "Je n'ai même pas de téléphone portable, mademoiselle. Je ne sais pas de quoi vous parlez.")], mood='tension'),
     B('cu', 3, [('elise', "Alors qui ? Quelqu'un qui a ton numéro, le code de la porte, son adresse…"),
                 ('nathan', 'Ou un autre moi. Un programme laissé par celui de la vidéo.', 'tension'), ('elise', 'Pour te guider contre elle.')],
       kw=P('elise', 'nathan'), mood='enquete'),
     B('cu', 3, [('nathan', "Comment on l'arrête ?"), ('gabriel', 'Il y a une clé. Une seule. Elle arrête le Cœur, au niveau moins quatre.'),
                 ('elise', 'Et elle est où, cette clé ?'), ('gabriel', "Là où je l'ai cachée en deux mille onze. Là où personne ne pense à chercher.")],
       kw=P('nathan'), mood='tension'),
     B('cu', 3, [('nathan', 'Combien de temps ?'), ('gabriel', 'Il me faut une journée.'),
                 ('gabriel', "Demain soir, je vous appelle. D'ici là, ne retournez pas là-bas. Et ne lui demandez rien.")], kw=P('gabriel', 'nathan'), mood='tension'),
     B('quai_soir', 4, [('elise', 'Tu le crois ?'), ('nathan', 'Je sais plus qui croire.', 'fatigue'),
                        ('elise', 'Moi. Tu peux me croire, moi.', 'douceur'), ('nathan', 'Je sais.', 'douceur')], lead=1.2, room='exterieur', mood='intime')],

    # 3.6 La nuit — 01:20, « Montre-moi. »
    [B('studio_nuit', 1.5, flex=0),
     B('sms_elise', 3.4, flex=0),
     B('reve', 3.5, flex=0),
     B('cu', 3, [('nathan', 'Un pont vert. De la pluie. Un ciré jaune.', 'peur'), ('nathan', 'Élise…', 'peur')], kw=P('nathan', None, 'nuit'), room='studio', mood='peur'),
     B('mur', 6, [('nathan', 'Quatorze mars deux mille onze. Sept novembre, deux heures dix-sept. Huit cent quarante-sept.', 'fatigue'),
                  ('nathan', 'Le pont. Le ciré jaune.', 'peur')], lead=1.0, room='studio'),
     B('cu', 3, [('nathan', 'Elle a tout vu. Huit cent quarante-sept fois.', 'peur'), ('nathan', 'Elle sait ce qui va arriver.', 'peur')],
       kw=P('nathan', None, 'nuit'), room='studio', mood='peur'),
     B('horloge', 1.8, flex=0),
     B('marche_nuit', 2.5, flex=0, room='exterieur'),
     B('pupitre', 2.2, flex=0, kw={'txt': 'BONJOUR NATHAN.'}, room='labo'),
     B('cu', 3, [('maya', 'Tu es venu seul.'), ('nathan', 'Tu savais que je viendrais.'), ('maya', 'Je savais que tu viendrais souvent. Pas toujours.')],
       kw=P('nathan', None, 'bleu'), room='labo', mood='mystere'),
     B('cu', 3, [('nathan', "Le pont. Le ciré jaune. C'est un rêve, ou un souvenir ?", 'peur'), ('maya', 'Tu le sais déjà.')],
       kw=P('nathan', None, 'bleu'), room='labo', mood='mystere'),
     B('montre_moi', 4, [('nathan', 'Montre-moi.', 'tension')], lead=1.4, flex=0, room='labo'),
     B('end3', 4, flex=0)],
]
DEFAUTS = [('exterieur', 'tension'), ('peniche', 'tension'), ('peniche', 'aveu'), ('peniche', 'mystere'), ('peniche', 'tension'), ('studio', 'nuit')]
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
random.seed(7)


def make_peniche():
    """Carré de la péniche : bois sombre, livres, poêle, radio à lampes, télescope au hublot, cadre retourné."""
    img = Image.new('RGB', (W, H), (46, 30, 20))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 34):  # lambris
        d.rectangle([x, 0, x + 32, 400], fill=(52 + (x // 34) % 3 * 4, 34, 22))
    d.polygon([(0, 0), (W, 0), (W, 40), (0, 70)], fill=(30, 20, 14))  # plafond bas, poutre
    d.rectangle([0, 400, W, H], fill=(36, 24, 16))  # plancher
    for y in range(410, H, 26):
        d.line([(0, y), (W, y)], fill=(30, 20, 13), width=2)
    for k in range(3):  # étagères de livres
        y = 90 + k * 90
        d.rectangle([40, y + 70, 420, y + 78], fill=(70, 46, 30))
        rr = random.Random(k)
        x = 46
        while x < 410:
            w = rr.randint(10, 22); h = rr.randint(48, 70)
            d.rectangle([x, y + 70 - h, x + w, y + 70], fill=rr.choice([(110, 40, 34), (40, 56, 80), (120, 100, 70), (60, 70, 50), (150, 140, 120)]))
            x += w + 2
    d.rectangle([300, 108, 360, 116], fill=(60, 40, 26))  # cadre retourné face contre le bois
    d.ellipse([930, 80, 1090, 240], fill=(120, 130, 140), outline=(140, 110, 60), width=10)  # hublot
    d.line([(980, 330), (1020, 170)], fill=(150, 120, 60), width=8)  # télescope
    d.line([(1000, 330), (970, 400)], fill=(80, 70, 60), width=4); d.line([(1000, 330), (1040, 400)], fill=(80, 70, 60), width=4)
    d.rectangle([520, 250, 640, 400], fill=(26, 24, 24))  # poêle à bois
    d.rectangle([548, 300, 612, 350], fill=(200, 90, 30))
    d.rectangle([570, 120, 590, 250], fill=(30, 28, 28))
    d.rounded_rectangle([700, 270, 860, 360], radius=18, fill=(92, 60, 36))  # radio à lampes O9
    d.rectangle([720, 285, 840, 315], fill=(220, 150, 60))  # cadran ambré
    d.rectangle([870, 300, 890, 360], fill=(120, 80, 30))  # bouteille de whisky
    img = glow(img, [548, 300, 612, 350], (140, 60, 20), 70, 0.9)
    img = glow(img, [720, 285, 840, 315], (110, 70, 20), 40, 0.6)
    return img


PENICHE = make_peniche()
PENICHE_FLOU = PENICHE.filter(ImageFilter.GaussianBlur(10))


def make_quai(dusk=False):
    top, bot = ((60, 66, 78), (30, 34, 42)) if not dusk else ((40, 36, 48), (18, 16, 22))
    img = vgrad(W, H, top, bot)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 330, W, H], fill=(22, 30, 34))  # eau du bassin
    for y in range(340, H, 14):
        d.line([(0, y), (W, y + 3)], fill=(30, 40, 46), width=1)
    d.rectangle([0, 420, 300, H], fill=(70, 70, 72))  # quai de pierre
    d.polygon([(260, 300), (1240, 300), (1200, 380), (300, 380)], fill=(14, 14, 16))  # coque noire
    d.rectangle([700, 230, 1100, 300], fill=(40, 34, 30))  # roof
    for k in range(5):
        d.rectangle([730 + k * 72, 250, 770 + k * 72, 280], fill=(200, 150, 80) if (k == 2 and not dusk) or dusk else (60, 54, 48))
    d.text((420, 320), 'CONSTANCE', font=font('DejaVuSans-Bold.ttf', 34), fill=(225, 225, 220))
    d.polygon([(230, 430), (300, 340), (318, 344), (252, 434)], fill=(100, 80, 60))  # passerelle
    img = glow(img, [730, 250, 1060, 280], (120, 80, 30), 40, 0.5)
    return img


QUAI = make_quai()
QUAI_SOIR = make_quai(True)


def make_studio_nuit():
    img = Image.new('RGB', (W, H), (14, 16, 24))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 0), (W, 0), (W, 120), (0, 30)], fill=(24, 26, 34))
    d.rectangle([700, 22, 930, 120], fill=(40, 60, 100)); d.rectangle([700, 22, 930, 120], outline=(30, 30, 34), width=8)
    d.rectangle([150, 470, 470, 520], fill=(40, 42, 50))  # matelas
    d.rectangle([560, 360, 1200, 376], fill=(60, 44, 32))
    d.rectangle([1120, 230, 1196, 360], fill=(16, 16, 18))
    d.text((1140, 250), 'N', font=SANS_B, fill=(220, 110, 30))
    return img


STUDIO_NUIT = make_studio_nuit()


def make_photo_o8(w=640, h=460):
    img = vgrad(w, h, (176, 170, 160), (130, 126, 120))
    d = ImageDraw.Draw(img)
    cx, cy, R = w // 2, 150, 120
    for k in range(36):
        a = 2 * math.pi * k / 36
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=(170, 110, 70) if k % 2 == 0 else (225, 220, 210))
    d.rectangle([0, 330, w, h], fill=(120, 116, 110))
    for x, who, col in [(70, 'x', (60, 66, 80)), (165, 'gabriel2010', None), (300, 'claire', None), (430, 'x', (90, 80, 70)), (530, 'x', (70, 70, 74)), (610, 'x', (110, 100, 96))]:
        if who == 'x':
            d.rounded_rectangle([x - 34, 250, x + 34, h], radius=18, fill=(228, 230, 232))
            d.ellipse([x - 24, 192, x + 24, 246], fill=(214, 188, 170))
            d.chord([x - 26, 188, x + 26, 222], 180, 360, fill=col)
        else:
            bust(img, x, 230, 0.36, who, light=(1.0, 0.98, 0.95))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([330, 300, 380, 360], radius=12, fill=(60, 90, 140))
    d.ellipse([334, 262, 374, 304], fill=(232, 206, 188))
    d.chord([332, 258, 376, 286], 180, 360, fill=(80, 58, 40))
    return grade(img, (1.05, 0.98, 0.86))


# =================================================================== PLANS
LUM = {'peniche': (1.0, 0.8, 0.6), 'aube': (0.72, 0.76, 0.86), 'nuit': (0.55, 0.62, 0.9), 'bleu': (0.45, 0.62, 1.15)}
LEDS = [(random.randint(0, W), random.randint(0, 170), random.uniform(0.5, 3)) for _ in range(120)]


def backdrop(lum, T, f):
    if lum == 'peniche':
        return PENICHE_FLOU.copy(), LUM['peniche']
    if lum == 'aube':
        img = QUAI.filter(ImageFilter.GaussianBlur(8))
        rain(img, 120, (110, 116, 130), seed=f)
        return img, LUM['aube']
    if lum == 'nuit':
        return STUDIO_NUIT.filter(ImageFilter.GaussianBlur(8)), LUM['nuit']
    br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)
    img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
    d = ImageDraw.Draw(img)
    for x, y, s in LEDS:
        if math.sin(T * s + x) > -0.3:
            d.rectangle([x, y, x + 3, y + 3], fill=(60, 140, 255))
    return img.filter(ImageFilter.GaussianBlur(2)), tuple(c * br for c in LUM['bleu'])


def shot_carton(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if 0.5 <= t < dur - 0.6:
        d = ImageDraw.Draw(img)
        text_c(d, 230, 'PARTIE 3', SANS_S, (140, 140, 140))
        text_c(d, 262, 'LES SECRETS DU LABORATOIRE', TITLE, (230, 230, 230))
    return img


def shot_quai(t, dur, T, f, kw):
    img = QUAI.copy()
    p = t / dur
    body(img, 60 + 160 * p, 520, 1.2, 'nathan', phase=t * 5, walking=True, light=(0.7, 0.72, 0.8))
    body(img, -40 + 160 * p, 520, 1.15, 'elise', phase=t * 5 + 1, walking=True, light=(0.78, 0.76, 0.76))
    rain(img, 200, (110, 116, 130), seed=f)
    return fade(img, t / 0.8)


def shot_passerelle(t, dur, T, f, kw):
    z = 1.6
    cx, cy = 360, 330
    img = QUAI.crop((int(cx - W / z / 2), int(cy - H / z / 2), int(cx + W / z / 2), int(cy + H / z / 2))).resize((W, H))
    body(img, 560, 540, 1.6, 'nathan', light=(0.7, 0.72, 0.8), arm=0.6)
    body(img, 400, 540, 1.5, 'elise', light=(0.78, 0.76, 0.76))
    rain(img, 220, (110, 116, 130), seed=f)
    return img


def shot_cu(t, dur, T, f, kw):
    who, other, lum = kw.get('who', 'nathan'), kw.get('other'), kw.get('lum', 'peniche')
    img, light = backdrop(lum, T, f)
    x_main, x_other = (560, 1110) if who != 'gabriel' else (700, 170)
    if who == 'elise':
        x_main, x_other = (720, 170)
    if other:
        bust(img, x_other, 270, 0.8, other, mouth=m(other, f), blink=blink_at(T, 3), light=tuple(c * 0.55 for c in light),
             look=(1 if x_other < 640 else -1, 0))
        img = img.filter(ImageFilter.GaussianBlur(4))
    bust(img, x_main, 215, 1.2, who, mouth=m(who, f), blink=blink_at(T, 6 if who == 'nathan' else 5), light=light,
         look=(0.3 if x_main < 640 else -0.3, 0) if other else (0, 0))
    if who == 'gabriel':  # lunettes de lecture pendues au cordon
        d = ImageDraw.Draw(img)
        d.line([(x_main - 60, 330), (x_main, 420), (x_main + 60, 330)], fill=tint((30, 30, 30), light), width=2)
        d.ellipse([x_main - 26, 400, x_main - 4, 418], outline=tint((60, 60, 60), light), width=3)
        d.ellipse([x_main + 4, 400, x_main + 26, 418], outline=tint((60, 60, 60), light), width=3)
    if lum == 'aube':
        rain(img, 80, (120, 126, 140), seed=f + 3)
    return img


def shot_trio(t, dur, T, f, kw):
    img, light = backdrop('peniche', T, f)
    sp = speaker_at(T)
    dim = lambda w: tuple(c * (1.0 if sp == w else 0.8) for c in light)
    bust(img, 300, 250, 0.9, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=dim('nathan'), look=(1 if sp == 'gabriel' else 0.5, 0))
    bust(img, 600, 265, 0.85, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=dim('elise'), look=(1 if sp == 'gabriel' else -1, 0))
    bust(img, 980, 230, 1.0, 'gabriel', mouth=m('gabriel', f), blink=blink_at(T, 2), light=dim('gabriel'), look=(-1, 0))
    return img


def shot_photo_tend(t, dur, T, f, kw):
    img = QUAI.filter(ImageFilter.GaussianBlur(10))
    d = ImageDraw.Draw(img)
    p = min(1, t / 1.2)
    ph = PHOTO_O8.resize((380, 273))
    x, y = int(450 - 120 * (1 - p)), int(130 + 60 * (1 - p))
    img.paste(ph, (x, y))
    d = ImageDraw.Draw(img)
    d.ellipse([x - 40, y + 200, x + 40, y + 270], fill=tint(REF['nathan']['skin'], (0.8, 0.8, 0.85)))
    d.rectangle([x - 200, y + 230, x - 20, y + 300], fill=(70, 78, 50))  # manche de la parka
    rain(img, 160, (110, 116, 130), seed=f)
    return img


def shot_carre(t, dur, T, f, kw):
    img = PENICHE.copy()
    p = t / dur
    body(img, 200, 540, 1.25, 'nathan', light=(0.9, 0.75, 0.6))
    body(img, 330, 540, 1.2, 'elise', light=(0.95, 0.8, 0.62))
    body(img, 1050 - 80 * p, 540, 1.35, 'gabriel', phase=t * 3, walking=p < 0.6, light=(0.95, 0.78, 0.6), facing=-1)
    flick = 0.85 + 0.15 * math.sin(T * 7) * math.sin(T * 3.1)
    return glow(img, [548, 300, 612, 350], (60, 26, 6), 60, flick)


def shot_schema(t, dur, T, f, kw):
    """La main de Gabriel trace un schéma au crayon sur un carnet (pages 1 à 3)."""
    page = kw.get('page', 1)
    img = Image.new('RGB', (W, H), (60, 42, 28))
    d = ImageDraw.Draw(img)
    d.rectangle([300, 30, 980, 530], fill=(234, 228, 210))
    ink = (40, 40, 60)
    prog = min(1.0, t / max(1.0, dur * 0.8))
    elems = []
    if page == 1:
        elems = [lambda: d.ellipse([360, 180, 520, 340], outline=ink, width=4), lambda: d.text((395, 245), 'MAYA', font=SANS_B, fill=ink),
                 lambda: d.text((360, 360), '2041 : la fin', font=SANS, fill=ink), lambda: d.line([(530, 260), (760, 260)], fill=ink, width=4),
                 lambda: d.polygon([(760, 248), (785, 260), (760, 272)], fill=ink), lambda: d.text((800, 245), 'APRÈS', font=SANS_B, fill=ink),
                 lambda: d.text((760, 300), 'reconstruire', font=SANS, fill=ink)]
    elif page == 2:
        elems = [lambda: d.text((340, 60), 'PROTOCOLE ARIANE', font=SANS_B, fill=ink),
                 lambda: d.text((340, 120), 'I.   ne ment pas', font=SANS, fill=ink),
                 lambda: d.text((340, 170), "II.  n'agit pas dehors sans un humain", font=SANS, fill=ink),
                 lambda: d.text((340, 210), '       (voix + visage, salle C)', font=SANS_S, fill=ink),
                 lambda: d.text((340, 250), '       IRRÉVOCABLE', font=SANS_B, fill=(150, 30, 30))]
    else:
        elems = [lambda: d.text((340, 60), 'PROTOCOLE ARIANE', font=SANS_B, fill=ink),
                 lambda: d.text((340, 120), 'I.   ne ment pas', font=SANS, fill=ink),
                 lambda: d.text((340, 170), "II.  n'agit pas dehors sans un humain", font=SANS, fill=ink),
                 lambda: d.text((340, 230), 'III. ne se copie pas — sauf : fin →', font=SANS, fill=ink),
                 lambda: d.text((340, 290), 'IV.  gravé dans le Cœur (métal)', font=SANS, fill=ink),
                 lambda: d.rectangle([700, 380, 940, 470], outline=ink, width=3), lambda: d.text((730, 410), 'CŒUR  -4', font=SANS_B, fill=ink)]
    n = int(len(elems) * prog + 0.999)
    for e in elems[:max(1, n)]:
        e()
    hx, hy = 360 + 520 * prog, 140 + 300 * ((prog * 3) % 1)
    tr = 3 * math.sin(T * 9)  # tremblement de la main droite
    d.ellipse([hx - 30 + tr, hy, hx + 60 + tr, hy + 80], fill=tint(REF['gabriel']['skin'], (0.95, 0.82, 0.7)))
    d.line([(hx + tr, hy + 10), (hx - 30 + tr, hy - 40)], fill=(40, 40, 40), width=6)  # crayon
    d.rectangle([hx + 20 + tr, hy + 70, hx + 160 + tr, H], fill=tint(REF['gabriel']['top'], (0.95, 0.82, 0.7)))
    return grade(img, (1.0, 0.86, 0.68))


def shot_main(t, dur, T, f, kw):
    img = PENICHE_FLOU.copy()
    d = ImageDraw.Draw(img)
    tr = 4 * math.sin(T * 11) + 2 * math.sin(T * 17)
    d.rectangle([380, 380, 900, 400], fill=(60, 40, 26))  # table
    d.polygon([(560 + tr, 250), (640 + tr, 250), (630 + tr, 380), (570 + tr, 380)], fill=(170, 160, 140))  # verre
    d.rectangle([572 + tr, 320, 628 + tr, 378], fill=(180, 110, 40))  # whisky
    d.ellipse([600 + tr, 270, 720 + tr, 370], fill=tint(REF['gabriel']['skin'], (0.95, 0.8, 0.65)))  # main droite
    d.ellipse([640 + tr, 300, 656 + tr, 316], outline=(220, 180, 80), width=4)  # alliance
    d.rectangle([700 + tr, 300, 1000, 380], fill=tint(REF['gabriel']['top'], (0.95, 0.8, 0.65)))
    return grade(img, (1.0, 0.85, 0.7))


def shot_incident(t, dur, T, f, kw):
    """Souvenir reconstitué, 14 mars 2011 : l'anneau, l'enfant sur la chaise, Claire à la console. Aucun visage net."""
    img = Image.new('RGB', (W, H), (6, 8, 16))
    d = ImageDraw.Draw(img)
    cx, cy, R = 640, 230, 190
    for k in range(48):
        a = 2 * math.pi * k / 48
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        d.ellipse([x - 20, y - 20, x + 20, y + 20], fill=(90, 70, 60) if k % 2 == 0 else (120, 124, 130))
    d.rectangle([cx - 30, 330, cx + 30, 340], fill=(80, 84, 90))  # chaise
    d.rectangle([cx - 30, 340, cx - 25, 400], fill=(70, 74, 80)); d.rectangle([cx + 25, 340, cx + 30, 400], fill=(70, 74, 80))
    d.ellipse([cx - 20, 280, cx + 20, 318], fill=(200, 180, 168))  # l'enfant
    d.rounded_rectangle([cx - 24, 314, cx + 24, 352], radius=10, fill=(60, 90, 140))
    body(img, 1000, 520, 1.3, 'claire', light=(0.5, 0.55, 0.7))
    d.rectangle([1050, 360, 1180, 420], fill=(40, 44, 52))  # console
    if kw.get('flash'):
        k = (t % 1.6) / 1.6
        if k < 0.25:
            img = glow(img, [cx - R, cy - R, cx + R, cy + R], (120, 160, 255), 80, 2.0 * (1 - k * 4))
        img = grade(img, (0.9, 0.95, 1.3))
    img = img.filter(ImageFilter.GaussianBlur(2.2))
    a = np.asarray(img, np.float32)
    a = a * 0.8 + a.mean(2, keepdims=True) * 0.2
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def shot_dejavu(t, dur, T, f, kw):
    """Fragments : 1403, l'anneau, un pont vert sous la pluie, un éclat jaune."""
    k = int(t / (dur / 5)) % 5
    img = Image.new('RGB', (W, H), (8, 8, 10))
    d = ImageDraw.Draw(img)
    if k == 0:
        text_c(d, 220, '1 4 0 3', font('DejaVuSansMono.ttf', 90), (230, 60, 60))
    elif k == 1:
        for j in range(36):
            a = 2 * math.pi * j / 36
            d.ellipse([640 + 160 * math.cos(a) - 14, 260 + 160 * math.sin(a) - 14, 640 + 160 * math.cos(a) + 14, 260 + 160 * math.sin(a) + 14],
                      fill=(170, 110, 70) if j % 2 else (225, 220, 210))
    elif k == 2:
        d.rectangle([0, 300, W, 330], fill=(40, 80, 56))  # Pont des Tanneurs, métal riveté vert
        for x in range(0, W, 60):
            d.line([(x, 330), (x + 30, 300)], fill=(40, 80, 56), width=6)
        rain(img, 200, (120, 130, 150), seed=f)
    elif k == 3:
        d.rectangle([520, 200, 760, 400], fill=(214, 162, 38))  # éclat de ciré jaune
        rain(img, 200, (120, 130, 150), seed=f)
    else:
        img = grade(QUAI, (0.6, 0.6, 0.7))
    img = img.filter(ImageFilter.GaussianBlur(1.5 + 2 * abs(math.sin(t * 5))))
    return grade(img, (0.85, 0.85, 0.95))


def shot_radio(t, dur, T, f, kw):
    img = PENICHE_FLOU.copy()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([340, 110, 940, 470], radius=50, fill=(92, 60, 36), outline=(60, 38, 22), width=8)
    k0 = T - shots('radio')[0][0]  # la radio s'allume seule au début du premier plan
    on = k0 > 0.8
    br = min(1.0, 0.4 + 0.6 * max(0.0, k0 - 0.8)) * (1 + 0.25 * m('maya', f) + 0.04 * math.sin(T * 1.6))
    d.rectangle([400, 160, 880, 260], fill=tint((235, 165, 70), (br, br, br)) if on else (50, 36, 24))
    for k in range(12):
        x = 420 + k * 38
        d.line([(x, 230), (x, 250)], fill=(80, 50, 20), width=2)
    needle = 420 + (t * 60) % 440 if t < 2.5 else 700
    d.line([(needle, 170), (needle, 255)], fill=(160, 30, 20), width=4)
    for x in (470, 810):
        d.ellipse([x - 40, 320, x + 40, 400], fill=(50, 34, 22), outline=(140, 110, 70), width=4)
    for y in range(290, 450, 14):
        d.line([(560, y), (720, y)], fill=(70, 46, 28), width=4)
    if on:
        img = glow(img, [400, 160, 880, 260], (130, 80, 20), 60, 0.7 * br)
    return img


def shot_radio_off(t, dur, T, f, kw):
    img = shot_radio(10, 10, T, f, kw)
    k = min(1, t / 0.6)
    dark = PENICHE_FLOU.copy()
    d = ImageDraw.Draw(dark)
    d.rounded_rectangle([340, 110, 940, 470], radius=50, fill=(92, 60, 36), outline=(60, 38, 22), width=8)
    d.rectangle([400, 160, 880, 260], fill=(50, 36, 24))
    return Image.blend(img, dark, k)


def shot_quai_soir(t, dur, T, f, kw):
    img = QUAI_SOIR.copy()
    p = t / dur
    body(img, 240 - 200 * p, 520, 1.2, 'nathan', phase=t * 4, walking=True, light=(0.6, 0.6, 0.7), facing=-1)
    body(img, 330 - 200 * p, 520, 1.15, 'elise', phase=t * 4 + 1, walking=True, light=(0.7, 0.66, 0.66), facing=-1)
    rain(img, 160, (90, 96, 110), seed=f)
    return img


def shot_studio_nuit(t, dur, T, f, kw):
    img = STUDIO_NUIT.copy()
    rain(img, 40, (70, 90, 120), seed=f, area=(700, 22, 930, 120), length=(6, 14))
    body(img, 320, 520, 1.1, 'nathan', light=(0.4, 0.45, 0.65))
    ImageDraw.Draw(img).rectangle([150, 440, 470, 470], fill=(40, 42, 50))
    return fade(img, t / 0.8)


def shot_sms_elise(t, dur, T, f, kw):
    img = vgrad(W, H, (10, 12, 18), (4, 4, 8))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([450, 20, 830, 560], radius=40, fill=(12, 12, 14), outline=(60, 60, 66), width=4)
    d.rectangle([470, 60, 810, 540], fill=(236, 236, 240))
    d.line([(760, 60), (810, 110)], fill=(150, 150, 155), width=2)
    msgs = [('x', 'Élise — 23:04'), ('x', "t'as mangé ?")]
    if t > 1.5:
        msgs.append(('me', 'un truc.'))
    if t > 2.6:
        msgs.append(('x', 'un truc.'))
    if t > 3.3:
        msgs.append(('x', 'dors. demain on attend son appel. ensemble.'))
    y = 80
    for who, txt in msgs:
        tw = min(320, d.textlength(txt, font=SANS_S) + 24)
        x0 = 480 if who != 'me' else 800 - tw
        d.rounded_rectangle([x0, y, x0 + tw, y + 34], radius=14, fill=(210, 210, 216) if who != 'me' else (80, 140, 230))
        d.text((x0 + 12, y + 8), txt, font=SANS_S, fill=(20, 20, 24) if who != 'me' else (255, 255, 255))
        y += 46
    return img


def shot_reve(t, dur, T, f, kw):
    """Rêve : le Pont des Tanneurs la nuit, sous la pluie, un ciré jaune au sol. Flou, sans personne."""
    img = vgrad(W, H, (16, 18, 26), (8, 8, 12))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 360, W, H], fill=(20, 20, 24))
    d.rectangle([0, 230, W, 252], fill=(36, 74, 52))
    for x in range(-40, W, 70):
        d.line([(x, 252), (x + 35, 230)], fill=(36, 74, 52), width=7)
        d.line([(x, 230), (x + 35, 252)], fill=(36, 74, 52), width=4)
    d.rectangle([900, 240, 1010, 360], outline=(80, 90, 100), width=4)  # abribus
    d.ellipse([560, 410, 760, 470], fill=(214, 162, 38))  # ciré jaune au sol
    for x in range(0, W, 30):  # reflets
        d.line([(x, 380), (x, 380 + random.Random(x).randint(10, 60))], fill=(60, 50, 40))
    rain(img, 260, (120, 130, 150), seed=f)
    img = img.filter(ImageFilter.GaussianBlur(3 + 2 * math.sin(t * 2)))
    k = 1 if t < dur - 0.4 else 3.0
    return grade(img, (0.9 * k, 0.88 * k, 1.0 * k)) if t < dur - 0.4 else Image.new('RGB', (W, H), (230, 230, 240))


def shot_mur(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (30, 32, 40))
    d = ImageDraw.Draw(img)
    notes = [('14/03/2011', 120, 80, -3), ('07/11/2026\n02:17', 420, 60, 4), ('847', 760, 90, -2), ('1403', 1020, 70, 3),
             ('07/11/2041', 160, 300, 2), ('ARCHE ?\n60 %', 470, 290, -4), ('ARIANE\nI II III IV', 760, 300, 3), ('pont vert\nciré jaune', 1010, 300, -3)]
    n = int(2 + (len(notes) - 2) * min(1, t / (dur * 0.7)))
    for txt, x, y, rot in notes[:n]:
        card = Image.new('RGB', (210, 150), (228, 222, 196) if 'ciré' not in txt else (232, 220, 150))
        cd = ImageDraw.Draw(card)
        yy = 30
        for ln in txt.split('\n'):
            cd.text((16, yy), ln, font=SANS_B, fill=(30, 30, 40)); yy += 34
        img.paste(card.rotate(rot, expand=True, fillcolor=(30, 32, 40)), (x, y))
    d = ImageDraw.Draw(img)
    for (a, b) in ((0, 2), (2, 4), (1, 7), (5, 6)):
        if b < n:
            ax, ay = notes[a][1] + 100, notes[a][2] + 70
            bx, by = notes[b][1] + 100, notes[b][2] + 70
            d.line([(ax, ay), (bx, by)], fill=(170, 40, 40), width=2)
    return grade(img, (0.7, 0.75, 0.95))


def shot_horloge(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (4, 5, 8))
    d = ImageDraw.Draw(img)
    text_c(d, 210, '01:20', font('DejaVuSansMono.ttf', 110), (200, 60, 50))
    return glow(img, [480, 210, 800, 330], (60, 10, 10), 40, 0.6)


def shot_marche_nuit(t, dur, T, f, kw):
    img = vgrad(W, H, (34, 30, 30), (14, 14, 16))
    d = ImageDraw.Draw(img)
    off = (t * 120) % 400
    for i in range(-1, 5):
        x = i * 400 - off
        d.line([(x + 350, 380), (x + 350, 150)], fill=(60, 60, 64), width=5)
        d.ellipse([x + 335, 140, x + 365, 158], fill=(220, 140, 50))
    d.rectangle([0, 400, W, H], fill=(16, 16, 18))
    body(img, 640, 520, 1.4, 'nathan', phase=t * 6, walking=True, light=(0.6, 0.5, 0.4), hood=True)
    rain(img, 230, (100, 100, 110), seed=f)
    return img


def maya_screen(T, txt, n, f=0):
    br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)
    img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
    d = ImageDraw.Draw(img)
    for x, y, s in LEDS[:90]:
        if math.sin(T * s + x) > -0.3:
            d.rectangle([x, y % 160, x + 3, y % 160 + 3], fill=(60, 140, 255))
    d.rectangle([250, 170, 1030, 500], fill=(2, 3, 5), outline=(40, 44, 52), width=10)
    s = txt[:max(0, n)]
    d.text((290, 205), s, font=MONO, fill=(225, 228, 230))
    cx = 290 + d.textlength(s, font=MONO)
    if int(T * 3) % 2 == 0 or n < len(txt):
        d.rectangle([cx + 4, 208, cx + 20, 240], fill=(225, 228, 230))
    return img


def shot_pupitre(t, dur, T, f, kw):
    return maya_screen(T, kw.get('txt', ''), int((t - 0.4) * 8), f)


def shot_montre_moi(t, dur, T, f, kw):
    img, light = backdrop('bleu', T, f)
    z = 1.25 + 0.15 * t / dur
    bust(img, 640, 215, z, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=light, brow=-0.3)
    if t > dur - 1.0:  # l'écran s'allume en blanc sur son visage
        k = (t - (dur - 1.0)) / 1.0
        img = Image.blend(img, Image.new('RGB', (W, H), (220, 230, 255)), min(1, k * 1.2))
    return img


def shot_end3(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if t > 1.0:
        text_c(ImageDraw.Draw(img), 470, 'FIN DE LA PARTIE 3', SANS_S, (110, 110, 110))
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


PHOTO_O8 = make_photo_o8()
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
    if name not in ('carton', 'end3'):
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
    rain_deck = smooth_noise(n, 900, 2, lo=120) * 0.35  # pluie sur le pont, entendue de l'intérieur
    water = smooth_noise(n, 260, 3) * 0.3 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t)).astype(np.float32)  # clapot
    hum = (0.06 * np.sin(2 * np.pi * 50 * t) + 0.025 * np.sin(2 * np.pi * 100 * t)).astype(np.float32)
    fans = smooth_noise(n, 500, 4, lo=60) * 0.12
    # 3.1 extérieur, quai
    inside = shots('carre')[0][0]
    mx.bus['amb'] += (rain_out + water * 0.8) * win(0.5, inside, 1.5, 0.6)
    # péniche, intérieur
    end_pen = shots('quai_soir')[0][0]
    mx.bus['amb'] += (rain_deck + water * 0.5) * win(inside, end_pen, 0.6, 0.6)
    crack = np.zeros(n, np.float32)  # crépitement du poêle
    rr = np.random.default_rng(5)
    for k in rr.uniform(inside, end_pen, int((end_pen - inside) * 3)):
        i = int(k * SR)
        L = int(0.01 * SR)
        crack[i:i + L] += rr.normal(0, 1, L).astype(np.float32) * np.exp(-np.arange(L) / 80) * rr.uniform(0.05, 0.2)
    mx.bus['amb'] += fft_filter(crack, hi=5000) * win(inside, end_pen, 0.5, 0.5)
    for k in rr.uniform(inside, end_pen, 9):  # bois de la coque qui craque
        mx.add('fx', fft_filter(smooth_noise(int(0.5 * SR), 300, int(k)), hi=500) * 0.15 * env_ramp(int(0.5 * SR), 0.2 * SR, 0.25 * SR), k)
    mx.bus['amb'] += (rain_out + water * 0.6) * win(end_pen, S[4][1], 0.6, 0.6)
    # 3.6 studio la nuit, puis rue, puis labo
    mx.bus['amb'] += rain_deck * 0.9 * win(S[5][0], shots('marche_nuit')[0][0], 1.0, 0.3)
    mx.bus['amb'] += rain_out * win(shots('marche_nuit')[0][0], shots('pupitre')[0][0], 0.3, 0.3)
    mx.bus['amb'] += (hum * 1.4 + fans * 1.2) * win(shots('pupitre')[0][0], TOTAL - 4.5, 0.4, 0.3)
    # ---- bruitages
    mx.add('fx', signal_motif(0.1), shots('carton')[0][0] + 0.6)
    for name, step in (('quai', 0.55), ('marche_nuit', 0.5), ('quai_soir', 0.6)):
        for s in shots(name):
            for k in np.arange(s[0] + 0.2, s[1] - 0.3, step):
                x = smooth_noise(int(0.12 * SR), 500, int(k * 10)) * np.exp(-np.arange(int(0.12 * SR)) / (0.03 * SR)) * 0.22
                mx.add('fx', x.astype(np.float32), k)
    ps = shots('passerelle')[0][0]
    for k in (0.4, 1.0, 1.6):  # pas sur la passerelle en bois, coups à la porte
        mx.add('fx', fft_filter(smooth_noise(int(0.15 * SR), 400, int(k * 7)), hi=600) * 0.4 * np.exp(-np.arange(int(0.15 * SR)) / 1500), ps + k)
    knock = line_time('Monsieur Aubrac !')[0] - 0.9
    for k in range(3):
        mx.add('fx', fft_filter(smooth_noise(int(0.08 * SR), 300, 40 + k), hi=400) * 0.6 * np.exp(-np.arange(int(0.08 * SR)) / 500), knock + k * 0.22)
    # radio à lampes qui s'allume seule : souffle, sifflement d'accord
    r0 = shots('radio')[0][0]
    static = smooth_noise(n, 4000, 41, lo=500) * 0.12
    mx.bus['fx'] += static * win(r0 + 0.6, shots('radio_off')[0][0] + 0.4, 0.4, 0.05) * (0.5 + 0.5 * win(r0 + 0.6, r0 + 2.8, 0.2, 0.3))
    sweep = np.sin(2 * np.pi * np.cumsum(900 + 700 * np.sin(2 * np.pi * 0.7 * t)) / SR).astype(np.float32)
    mx.bus['fx'] += fft_filter(sweep, hi=2500) * 0.03 * win(r0 + 0.8, r0 + 2.6, 0.2, 0.2)
    mx.add('fx', signal_motif(0.06), r0 + 2.7)  # le motif du Signal, très bas, dans la radio
    off = shots('radio_off')[0][0]
    mx.add('fx', smooth_noise(int(0.1 * SR), 800, 42) * 0.3 * np.exp(-np.arange(int(0.1 * SR)) / 600), off + 0.1)
    # souvenir du 14 mars : décharge
    for s in shots('incident'):
        if s[3].get('flash'):
            for k in np.arange(s[0], s[1], 1.6):
                mx.add('fx', fft_filter(smooth_noise(int(0.8 * SR), 200, int(k * 3)), hi=900) * 0.4 * np.exp(-np.arange(int(0.8 * SR)) / (0.2 * SR)), k)
    # déjà-vu, rêve : battement de cœur
    for name in ('dejavu', 'reve'):
        s = shots(name)[0]
        for k in np.arange(s[0], s[1], 0.85):
            mx.add('fx', tone(48, 0.18, 0.3, harmonics=(1, 2), decay=0.06), k)
            mx.add('fx', tone(44, 0.15, 0.2, harmonics=(1, 2), decay=0.05), k + 0.22)
    rv = shots('reve')[0]
    mx.add('fx', smooth_noise(int(0.6 * SR), 3000, 43, lo=200) * 0.25 * env_ramp(int(0.6 * SR), 0.01 * SR, 0.5 * SR), rv[1] - 0.4)  # réveil
    sm = shots('sms_elise')[0][0]
    buzz = (np.sin(2 * np.pi * 170 * np.arange(int(0.3 * SR)) / SR) * 0.15).astype(np.float32)
    for k in (0.2, 2.6, 3.3):
        mx.add('fx', fft_filter(buzz, hi=600), sm + k)
    kp = shots('pupitre')[0][0]
    for i, k in enumerate((-2.2, -1.85, -1.5, -1.15)):  # 1403 tapé hors champ
        mx.add('fx', tone(1046, 0.08, 0.04), kp + k)
    mx.add('fx', signal_motif(0.14), shots('end3')[0][0] + 0.8)
    # ---- musique
    cello = sum(np.sin(2 * np.pi * 73.42 * h * t + 0.25 * np.sin(2 * np.pi * 4.8 * t)) / h ** 1.3 for h in range(1, 6)).astype(np.float32)
    cello = fft_filter(cello, hi=900)
    inc = shots('incident')
    mx.bus['mus'] += cello * 0.045 * (win(inc[0][0], inc[-1][1] + 6, 3, 3) + win(shots('mur')[0][0], shots('pupitre')[0][0], 3, 2))
    for base in np.arange(shots('quai_soir')[0][0], shots('quai_soir')[0][1] + 6, 4.6):  # piano : Nathan et Élise
        for j, fq in enumerate((293.66, 349.23, 440.0, 392.0)):
            mx.add('mus', piano(fq, 3.0, 0.05), base + j * 1.1)
    # ---- dialogues
    PAN = {'elise': -0.3, 'nathan': 0.25, 'gabriel': 0.35, 'maya': 0.0}
    for (st, en, w, txt, a_), room in zip(tl.lines, tl.room):
        x = a_.copy()
        pan = PAN.get(w, 0.0)
        shot = tl.shot_at(st + 0.05)[2]
        if w == 'maya':
            x = fft_filter(x, lo=90, hi=8000) * 1.05
            pan = 0.1 if room == 'peniche' else 0.0  # par le haut-parleur de la radio
            room = 'sec'
        mx.add_voice(x.astype(np.float32), st, pan=pan, room=room)
    for key in ('Demandez-lui qui a retenu la main de Claire.', "Et j'ai retenu sa main.", 'Montre-moi.', "Tu t'en souviens."):
        a, b = line_time(key)
        i0, i1 = int((a - 0.4) * SR), int((b + 0.8) * SR)
        mx.bus['mus'][i0:i1] = 0
        mx.bus['amb'][i0:i1] *= 0.4
    return mx.render()


if __name__ == '__main__':
    if '--plan' in sys.argv:
        dia = sum(len(l[4]) / SR for l in tl.lines)
        print(f'{len(tl.lines)} répliques, {dia:.0f} s de parole sur {TOTAL:.0f} s')
        for i, (a, b) in enumerate(S):
            print(f'  séquence 3.{i + 1} : {a:6.1f} → {b:6.1f}  ({b - a:5.1f} s)')
        sys.exit(0)
    import time
    t0 = time.time()
    wav = os.path.join(OUT, 'partie3_audio.wav')
    if not os.path.exists(wav):
        Mix.write(wav, build_audio())
    print('audio ok', round(time.time() - t0), 's', flush=True)
    vid = os.path.join(OUT, 'partie3_video.mp4')
    encode_chunks(frame, NF, vid, os.path.join(OUT, 'morceaux'))
    print('vidéo ok', round(time.time() - t0), 's', flush=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                    '-t', str(TOTAL), '-movflags', '+faststart', os.path.join(OUT, 'LE_DERNIER_SIGNAL_partie3.mp4')], check=True)
    with open(os.path.join(OUT, 'partie3_montage.txt'), 'w') as fh:
        for s in tl.shots:
            fh.write(f'{s[0]:8.2f} {s[1]:8.2f}  {s[2]}\n')
        fh.write('\n')
        for st, en, w, txt, a_ in tl.lines:
            fh.write(f'{st:8.2f} {en:8.2f}  {w:7s} {txt}\n')
    print('fini', round(time.time() - t0), 's')
