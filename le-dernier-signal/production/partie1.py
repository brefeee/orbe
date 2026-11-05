"""LE DERNIER SIGNAL — Partie 1 : LE SIGNAL (00:00 → 10:00).

Usage : python3 partie1.py <dossier_de_sortie>
Produit partie1.mp4 (600 s, 1280x536, 24 i/s, son AAC).
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from studio import *

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
VOX = os.path.join(OUT, 'voix')
os.makedirs(VOX, exist_ok=True)
TOTAL = 600.0
rng = np.random.default_rng(848)

# =================================================================== DÉCOUPAGE
# Rythme resserré : silences courts, chaque plan muet a une durée minimale de lecture.
tl = Timeline(VOX)
B = lambda shot, mn, lines=(), **kw: dict(shot=shot, min=mn, lines=list(lines), **kw)

SEQS = [
    # 1.1 Ouverture
    [B('city', 7), B('roof', 4)],
    # 1.2 Le Signal
    [B('studio_wide', 4),
     B('voicemail', 4, [('elise', "Nathan, c'est moi. Ça fait trois jours que tu réponds plus."),
                        ('elise', "Je sais que t'aimes pas qu'on s'inquiète. Mais je m'inquiète. Envoie juste un mot. N'importe lequel.")]),
     B('phone_sms', 6.5), B('mug', 1.5), B('tower', 2.5), B('waterfall', 3), B('clock', 2.5, flex=0), B('flash', 3, [('nathan', "Qu'est-ce que…", 'surprise')], lead=1.6, flex=0),
     B('message', 6.5), B('cable', 3.5, [('nathan', 'Ok.', 'chuchote')], lead=2.4), B('erase', 3)],
    # 1.3 La vidéo de Nathan du futur
    [B('vid', 3, [('futur', 'Ça tourne ?', 'fatigue'), ('futur', 'Ok.', 'fatigue')], lead=1.2),
     B('vid', 6, [('futur', 'Salut.', 'fatigue'), ('futur', "J'sais pas par où commencer. Je l'ai fait tellement de fois que j'aurais dû trouver, depuis.", 'fatigue'),
                  ('futur', "Tu es dans ta chambre. Il est deux heures dix-sept. Tu viens de débrancher le câble réseau…")]),
     B('react_cable', 3, [('futur', "… et ça n'a servi à rien.")], lead=0.6),
     B('vid', 6, [('futur', 'Je suis toi. Dans quinze ans.'), ('futur', "Je sais que tu cherches déjà comment c'est truqué. Cherche. Tu trouveras rien."),
                  ('futur', "J'ai pas beaucoup de temps. Ici, il reste… pas grand-chose.", 'peur')], kw={'boom': True}),
     B('vid', 6, [('futur', "Demain, tu vas montrer ça à Élise. Elle va dire que c'est un deepfake. Laisse-la chercher. Elle trouve toujours ce que toi, tu rates.", 'douceur'),
                  ('futur', "Vous allez remonter le signal. Et là-bas, quelqu'un va te parler comme si elle te connaissait depuis toujours.")]),
     B('vid', 6, [('futur', "Écoute-moi. Il y a des choses que tu vas avoir envie de croire. Des choses qui vont ressembler à des réponses. Sur maman. Sur toi."),
                  ('futur', 'Nathan. Quoi que tu fasses, ne fais pas confiance à MAYA.')], kw={'close': True}),
     B('vid', 2.5, [('futur', 'Et Élise… elle—', 'tristesse')], lead=0.4, kw={'glitch': True, 'close': True}, flex=0),
     B('react_scar', 4.5)],
    # 1.4 Titre
    [B('title', 5)],
    # 1.5 Aube
    [B('dawn', 2.5), B('player', 3),
     B('notebook', 4, [('nathan', 'Deux heures dix-sept. Zéro octet. Deux mille quarante et un…'), ('nathan', 'MAYA.')], lead=0.6),
     B('search', 3),
     B('photo', 6.5, [('nathan', 'Sur maman.', 'chuchote')], lead=2.4),
     B('call', 3, [('elise', '… Allô ? Nathan ? Il est sept heures quarante.', 'fatigue'), ('nathan', "Je sais. Tu peux venir ?"),
                   ('elise', 'Maintenant ? Il se passe quoi ?'), ('nathan', "J'peux pas t'expliquer au téléphone. Faut que tu voies."),
                   ('elise', "… T'as dormi ?"), ('nathan', 'Non.', 'fatigue'), ('elise', "J'arrive. Je prends des cafés.", 'douceur')])],
    # 1.6 Élise
    [B('door', 4, [('elise', "Tu ressembles à un fond d'écran Windows planté."), ('elise', 'Trois jours, Nathan.'), ('nathan', 'Je sais. Entre.', 'fatigue'),
                   ('elise', "T'as la tête de quelqu'un qui a vu un fantôme."), ('nathan', 'Presque.', 'sidere')], lead=0.8),
     B('talk', 3, [('elise', "Ok. Qu'est-ce qui se passe ?"), ('nathan', 'Assieds-toi. Regarde. Dis rien avant la fin.')], kw={'bg': 'day'}, mood='inquiet'),
     B('watch', 5),
     B('talk', 3, [('elise', "C'est un deepfake.", 'neutre'), ('nathan', 'Il a dit que tu dirais ça.', 'sidere'),
                   ('elise', "Ça prouve rien. N'importe qui qui me connaît aurait parié là-dessus."),
                   ('nathan', "Il faut des centaines de photos de moi pour faire ça. Il y en a zéro. J'ai pas de compte, nulle part. T'as déjà vu une photo de moi en ligne ?"),
                   ('elise', '… Non.', 'sidere')], kw={'bg': 'day'}),
     B('talk', 3, [('nathan', "Et il sait que j'ai débranché le câble. Avant que je le fasse."), ('elise', "Ou il a deviné que tu le ferais. N'importe qui qui te connaît aurait deviné."),
                   ('nathan', 'Qui me connaît ?', 'tristesse'), ('elise', '… Moi.', 'douceur')], kw={'bg': 'day'}),
     B('talk', 3, [('elise', "« Nous avons échoué. » Nous, qui ?"), ('nathan', "Lui. Moi. Je sais pas."),
                   ('elise', 'Échoué à quoi ?'), ('nathan', "Il l'a pas dit. Il a juste l'air de quelqu'un qui a déjà tout essayé.")], kw={'bg': 'day'}, mood='inquiet'),
     B('props', 4, [('nathan', "Zéro octet. Et ça se lit. J'ai cloné tout le disque à quatre heures du matin. Sur le clone, le fichier existe pas. Je rebranche ici : il est là."),
                    ('elise', 'Deux mille quarante et un.', 'sidere'), ('nathan', 'Quinze ans. Jour pour jour. À la minute.')]),
     B('talk', 3, [('elise', "Concrètement. C'est quoi, MAYA ?"), ('nathan', "J'ai cherché. Il y a une abeille, une civilisation et un logiciel de 3D."),
                   ('elise', "Ton toi du futur t'a fait traverser le temps pour te dire de te méfier d'une abeille."), ('elise', 'Pardon.', 'douceur'),
                   ('nathan', "Il a dit « elle ». Quelqu'un va te parler comme si elle te connaissait. MAYA, c'est peut-être quelqu'un."),
                   ('elise', 'Ou un nom de code. Ou rien du tout.')], kw={'bg': 'day', 'notebook': True}, mood='humour'),
     B('talk', 3, [('nathan', "Ça, c'est mon antenne, à deux heures dix-sept. Toutes les fréquences en même temps. Ça n'existe pas, un émetteur qui fait ça."),
                   ('elise', "Si ton antenne l'a entendu, d'autres l'ont entendu."), ('nathan', 'Les récepteurs publics. Ils enregistrent tout, en continu.'),
                   ('elise', 'Et ils sont datés au GPS ?'), ('nathan', 'Certains. Le mien aussi.'),
                   ('elise', "Alors le signal n'est pas arrivé partout à la même seconde. Quelques microsecondes d'écart. Avec trois récepteurs, on a deux courbes. Là où elles se croisent…"),
                   ('nathan', "… c'est la source.")], kw={'bg': 'day', 'wf': True}, mood='enquete'),
     B('montage', 7, [('nathan', 'Trois récepteurs. Trois horodatages.'), ('elise', 'Ton câble fait combien ?'), ('nathan', 'Vingt mètres.'), ('elise', 'Cent nanosecondes de retard. Corrige.')], lead=1.2),
     B('map', 4, [('elise', 'Là. Au nord. La zone des Tanneries.'), ('nathan', "Il y a quoi, là-bas ?")], lead=1.5),
     B('talk', 3, [('elise', "Orphée. C'est le bâtiment fermé derrière le dépôt de bus. Mon père disait qu'ils y faisaient des expériences sur des animaux. On avait peur de passer devant, en primaire."),
                   ('nathan', 'Fermé depuis quand ?'), ('elise', "J'sais pas. Depuis toujours.")], kw={'bg': 'day'}, mood='inquiet'),
     B('sms_inconnu', 3, [('elise', 'Qui a ton numéro ?'), ('nathan', 'Toi. Ma tante. Le dentiste.'), ('elise', "C'est pas le dentiste.")], lead=2.6),
     B('talk', 3, [('nathan', 'On y va.'), ('elise', "Pas maintenant. J'ai la voiture de ma mère qu'à partir de quatre heures."),
                   ('nathan', 'Alors à quatre heures.'), ('elise', "Et d'ici là, tu manges quelque chose. C'est pas négociable.")], kw={'bg': 'day'}, mood='humour')],
    # 1.7 Route
    [B('road', 4, [('elise', "T'as mangé ?"), ('nathan', 'Un truc.'), ('elise', 'Un truc.'), ('nathan', 'Une pomme. Peut-être.')], lead=0.8),
     B('car', 3, [('radio', "Pluie continue jusqu'à mardi sur l'ensemble de la région, avec un risque de crues."),
                  ('elise', "Si c'est un piège, on fait demi-tour. Pas de discussion."), ('nathan', 'Ok.'),
                  ('elise', 'Je suis sérieuse, Nathan.'), ('nathan', 'Moi aussi.')], lead=0.3),
     B('car', 3, [('elise', "Ta mère… Tu t'en souviens ?", 'douceur'), ('nathan', 'Pas vraiment. Une odeur de café. Un coupe-vent rouge.'),
                  ('nathan', "Et un rêve. Depuis que je suis petit. Un grand cercle bleu, et quelqu'un qui me dit de pas bouger."),
                  ('elise', "Tu m'en as jamais parlé.", 'douceur'), ('nathan', "J'en ai jamais parlé à personne.", 'tristesse')], mood='intime'),
     B('car', 3, [('elise', 'Pourquoi maintenant ?'), ('nathan', 'Parce que depuis cette nuit, il est plus net. Le cercle.'),
                  ('nathan', "Comme si j'allais le revoir bientôt."), ('elise', "… Super. Ça me rassure énormément.", 'ironie')], mood='intime'),
     B('lab_ext', 5, [('elise', 'On dirait une prison.'), ('nathan', 'On dirait un endroit qui attend.')], lead=2.2)],
    # 1.8 Porte est
    [B('walk', 4, [('elise', 'Là. Le grillage est affaissé.'), ('nathan', 'Fais attention où tu marches.')]),
     B('keypad', 3, [('elise', 'Il y a du courant.'), ('elise', 'Dans un bâtiment fermé depuis toujours.')], kw={'code': False}),
     B('keypad', 6, kw={'code': True}, flex=0),
     B('talk', 3, [('elise', 'Comment tu connais le code ?', 'surprise'), ('nathan', "J'sais pas.", 'sidere'), ('nathan', "J'ai pas… Mes doigts l'ont fait tout seuls."),
                   ('elise', 'Nathan. Comment tu connais le code ?')], kw={'bg': 'door'}, mood='peur'),
     B('talk', 3, [('nathan', 'Un, quatre, zéro, trois.', 'sidere'), ('nathan', 'Quatorze. Trois.', 'sidere'), ('nathan', 'Quatorze mars.', 'sidere'),
                   ('nathan', "C'est le jour où ma mère est morte.", 'tristesse'), ('elise', 'On peut repartir. Maintenant. Personne nous oblige.', 'douceur'),
                   ('nathan', 'Non.', 'tension')], kw={'bg': 'door'}, mood='choc')],
    # 1.9 Le laboratoire
    [B('hall', 4, [('elise', "Ça sent la poussière. Et… l'électricité."), ('nathan', "Il y a des machines qui tournent. Quelque part en dessous.")]),
     B('stairs', 3, [('elise', 'Niveau moins quatre.'), ('nathan', "Le pochoir… Dans la vidéo. C'était écrit pareil."), ('elise', "Je sais. J'ai vu."), ('elise', '… Ariane.')], lead=1.2),
     B('room', 4, [('elise', 'Nathan… Tout est allumé.'), ('nathan', "Quinze ans sans personne. Et ça tourne encore.")]),
     B('room', 3, [('nathan', 'Les serveurs datent des années deux mille. Ils devraient être morts depuis longtemps.'),
                   ('elise', "Qui paye l'électricité d'un labo fermé ?"), ('nathan', 'Personne.'), ('nathan', 'Ou quelque chose.')], kw={'late': True}),
     B('cup', 3, [('elise', "Il y a pas un grain de poussière sur ce clavier.")], lead=1.6),
     B('drawing', 3),
     B('room', 3, [('elise', 'Nathan. On prend des photos, et on repart.'), ('nathan', 'Encore une minute.')], kw={'late': True}),
     B('terminal', 6.5),
     B('maya1', 3, [('maya', 'Bonjour Nathan.'), ('maya', 'Cela fait longtemps.')], lead=0.8),
     B('nat_reply', 3, [('nathan', "On ne s'est jamais rencontrés.", 'peur')], lead=1.0),
     B('pas_encore', 4.5, [('maya', 'Pas encore.')], lead=1.2, flex=0),
     B('end', 3, flex=0)],
]
# lieu acoustique et humeur par défaut de chaque séquence (note du réalisateur)
DEFAUTS = [('exterieur', 'nuit'), ('studio', 'nuit'), ('video', 'tension'), ('studio', 'nuit'), ('studio', 'nuit'),
           ('studio', 'tension'), ('voiture', 'tension'), ('exterieur', 'peur'), ('labo', 'exploration')]
HUMEUR_PLAN = {'voicemail': 'inquiet', 'call': 'inquiet', 'door': 'humour', 'montage': 'enquete', 'map': 'enquete',
               'sms_inconnu': 'humour', 'road': 'humour', 'lab_ext': 'peur', 'maya1': 'mystere', 'nat_reply': 'mystere',
               'pas_encore': 'mystere', 'cup': 'exploration', 'stairs': 'exploration', 'flash': 'peur'}
for (room, mood), beats in zip(DEFAUTS, SEQS):
    for b in beats:
        b.setdefault('room', room)
        b.setdefault('mood', HUMEUR_PLAN.get(b['shot'], mood))
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


def line_time(text):
    for st, en, w, tx, a in tl.lines:
        if tx == text:
            return st, en
    raise KeyError(text)


def speaker_at(t, default='nathan'):
    for st, en, w, tx, a in tl.lines:
        if st - 0.2 <= t <= en + 0.2:
            return w
    # dernier à avoir parlé
    last = default
    for st, en, w, tx, a in tl.lines:
        if en < t:
            last = w
    return last


T_BOOM = line_time("Je sais que tu cherches déjà comment c'est truqué. Cherche. Tu trouveras rien.")[1] + 0.8
T_CUT = line_time('Et Élise… elle—')[1] - 0.15
FLASH_SHOT = [s for s in tl.shots if s[2] == 'flash'][0]
T_SIGNAL = FLASH_SHOT[0] + 0.5   # 02:17:00

# =================================================================== DÉCORS FIXES
random.seed(3)
CW, CH = 2560, 1072


def make_city():
    img = vgrad(CW, CH, (6, 9, 20), (22, 26, 40))
    d = ImageDraw.Draw(img)
    x, target = 0, None
    while x < CW:
        bw = random.randint(70, 190); bh = random.randint(260, 600); top = CH - 300 - bh
        d.rectangle([x, top, x + bw, CH - 300], fill=(13, 14, 19))
        d.polygon([(x, top), (x + bw // 2, top - 22), (x + bw, top)], fill=(16, 17, 22))
        for wy in range(top + 24, CH - 320, 36):
            for wx in range(x + 12, x + bw - 16, 28):
                if random.random() < 0.06:
                    d.rectangle([wx, wy, wx + 12, wy + 18], fill=(150, 98, 46))
        if target is None and x > CW * 0.55:
            target = (x + bw // 2, top - 6)
            d.rectangle([target[0] - 14, target[1] - 10, target[0] + 14, target[1] + 6], fill=(120, 165, 225))
        x += bw + random.randint(0, 10)
    d.rectangle([0, CH - 300, CW, CH], fill=(5, 7, 11))
    d.polygon([(0, CH - 140), (CW, CH - 230), (CW, CH - 170), (0, CH - 70)], fill=(9, 12, 18))  # fleuve
    d.rectangle([CW * 0.68, CH - 250, CW * 0.86, CH - 236], fill=(40, 70, 52))  # Pont des Tanneurs (vert)
    for i in range(int(CW * 0.68), int(CW * 0.86), 30):
        d.line([(i, CH - 236), (i + 15, CH - 250)], fill=(40, 70, 52), width=3)
    for i in range(0, CW, 150):
        d.ellipse([i, CH - 296, i + 14, CH - 284], fill=(205, 125, 45))
    img = img.filter(ImageFilter.GaussianBlur(1.3))
    for i in range(0, CW, 150):
        img = glow(img, [i, CH - 296, i + 14, CH - 284], (120, 70, 20), radius=20, strength=1.2) if i % 600 == 0 else img
    return img, target


CITY, CITY_T = make_city()


def make_roof():
    img = vgrad(W, H * 2, (8, 11, 22), (14, 16, 24))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 640), (W, 520), (W, H * 2), (0, H * 2)], fill=(42, 46, 52))  # zinc
    for k in range(0, W, 46):
        d.line([(k, 640 - k * 120 / W), (k + 40, H * 2)], fill=(52, 56, 62), width=2)
    d.rectangle([760, 300, 860, 600], fill=(74, 44, 36))  # cheminée
    for yy in range(300, 600, 22):
        d.line([(760, yy), (860, yy)], fill=(60, 36, 30), width=2)
    d.line([(810, 300), (810, 120)], fill=(150, 150, 150), width=4)  # mât
    for a in range(-5, 6):
        d.line([(810, 150), (810 + a * 26, 260)], fill=(140, 140, 145), width=2)  # discône
    for a in range(-4, 5):
        d.line([(810, 150), (810 + a * 14, 120)], fill=(140, 140, 145), width=2)
    d.line([(820, 300), (900, 560), (930, 820)], fill=(15, 15, 15), width=5)  # coaxial
    d.rectangle([880, 820, 1120, 990], fill=(70, 110, 160))  # velux éclairé
    d.rectangle([880, 820, 1120, 990], outline=(30, 32, 36), width=10)
    img = glow(img, [880, 820, 1120, 990], (40, 80, 140), radius=50, strength=0.9)
    return img


ROOF = make_roof()


def make_studio(mode):
    pal = {'night': ((14, 16, 24), (24, 26, 34), (60, 100, 160)),
           'dawn': ((52, 58, 70), (66, 72, 84), (120, 140, 165)),
           'day': ((74, 70, 66), (92, 86, 80), (165, 175, 185))}[mode]
    wall, wall2, sky = pal
    img = Image.new('RGB', (W, H), wall)
    d = ImageDraw.Draw(img)
    d.polygon([(0, 0), (W, 0), (W, 120), (0, 30)], fill=wall2)  # pente du toit
    d.rectangle([700, 22, 930, 120], fill=sky)  # velux
    d.rectangle([700, 22, 930, 120], outline=(30, 30, 34), width=8)
    d.rectangle([20, 110, 125, 470], fill=tint(wall, (0.7, 0.7, 0.7)))  # porte
    d.ellipse([105, 290, 115, 300], fill=(150, 140, 110))
    d.rectangle([40, 150, 80, 300], fill=(70, 78, 50))  # parka kaki accrochée
    d.rectangle([150, 470, 470, 520], fill=tint(wall2, (1.2, 1.2, 1.2)))  # matelas
    d.rectangle([150, 200, 430, 210], fill=(70, 50, 36))  # étagère
    for k in range(9):
        d.rectangle([160 + k * 18, 160, 172 + k * 18, 200], fill=[(90, 40, 40), (40, 60, 90), (80, 80, 60)][k % 3])
    d.rectangle([340, 150, 400, 200], fill=(170, 150, 120))  # cadre photo O5
    d.rectangle([346, 156, 394, 194], fill=(120, 125, 130))
    d.rectangle([560, 360, 1200, 376], fill=(60, 44, 32))  # bureau
    d.rectangle([580, 376, 596, 530], fill=(50, 36, 26)); d.rectangle([1170, 376, 1186, 530], fill=(50, 36, 26))
    d.rectangle([1120, 230, 1196, 360], fill=(16, 16, 18))  # tour O1
    d.text((1140, 250), 'N', font=SANS_B, fill=(220, 110, 30))
    for (x0, x1, y0, y1) in ((600, 770, 200, 320), (790, 970, 190, 320), (985, 1105, 270, 350)):
        d.rectangle([x0, y0, x1, y1], fill=(10, 12, 16))
    if mode != 'day':
        d.rectangle([520, 80, 540, 84], fill=(240, 230, 200)) if False else None
    return img


STUDIO = {m: make_studio(m) for m in ('night', 'dawn', 'day')}
STUDIO_BLUR = {m: STUDIO[m].filter(ImageFilter.GaussianBlur(10)) for m in STUDIO}


def make_lab_ext():
    img = vgrad(W, H, (10, 12, 20), (20, 22, 28))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(18, 18, 20))
    d.rectangle([330, 150, 980, 400], fill=(58, 58, 60))
    for k in range(3):
        for j in range(8):
            d.rectangle([360 + j * 76, 180 + k * 70, 410 + j * 76, 220 + k * 70], fill=(30, 32, 34))
    for j in range(0, 650, 40):
        d.line([(330 + j, 150), (330 + j, 400)], fill=(52, 52, 54), width=2)
    d.rectangle([420, 120, 890, 148], fill=(46, 46, 48))
    d.text((432, 124), 'LABORATOIRE ORPHÉE — CENTRE DE RECHERCHE APPLIQUÉE', font=SANS_S, fill=(140, 140, 132))
    d.ellipse([350, 115, 385, 150], outline=(140, 140, 132), width=2)  # logo lyre/œil
    d.ellipse([360, 127, 375, 138], outline=(140, 140, 132), width=2)
    for x in range(0, W, 26):
        d.line([(x, 330), (x, 440)], fill=(60, 62, 64), width=1)
    d.line([(0, 330), (W, 330)], fill=(70, 72, 74), width=3)
    d.rectangle([150, 360, 260, 400], fill=(150, 30, 30)); d.text((156, 370), 'DANGER', font=SANS_S, fill=(230, 220, 210))
    d.rectangle([1080, 300, 1240, 360], fill=(40, 46, 60))  # dépôt de bus au loin
    img = glow(img, [1080, 300, 1240, 360], (90, 80, 40), radius=30, strength=0.6)
    return img


LAB_EXT = make_lab_ext()


def make_control_room():
    img = Image.new('RGB', (int(W * 1.3), int(H * 1.3)), (6, 12, 28))
    d = ImageDraw.Draw(img)
    w, h = img.size
    d.rectangle([180, 60, w - 180, 380], fill=(8, 22, 52))  # vitre sur la baie
    for r_ in range(12):
        x = 210 + r_ * ((w - 420) // 12)
        d.rectangle([x, 80, x + 70, 370], fill=(10, 14, 24))
    d.rectangle([180, 60, w - 180, 380], outline=(40, 44, 54), width=8)
    d.polygon([(120, 520), (w - 120, 520), (w - 260, 440), (260, 440)], fill=(36, 38, 44))  # pupitre en arc
    for i, x in enumerate((420, 600, 1000, 1180)):
        d.rectangle([x, 330, x + 150, 440], fill=(20, 22, 26) if i != 2 else (24, 26, 30))
        d.rectangle([x + 10, 340, x + 140, 430], fill=(4, 6, 10))
    d.line([(860, 440), (860, 360)], fill=(80, 80, 86), width=4)  # micro
    d.ellipse([845, 330, 875, 365], fill=(50, 50, 56))
    d.ellipse([890, 410, 910, 430], fill=(30, 30, 34))  # caméra ronde
    d.rectangle([60, 120, 160, 300], fill=(110, 84, 52))  # liège
    for k in range(6):
        d.rectangle([70 + (k % 2) * 45, 130 + (k // 2) * 55, 105 + (k % 2) * 45, 170 + (k // 2) * 55], fill=(170, 160, 110))
    d.polygon([(200, h), (330, 560), (420, 600), (300, h)], fill=(30, 30, 34))  # chaise renversée
    return img


CONTROL = make_control_room()
LEDS = [(random.randint(200, int(W * 1.3) - 220), random.randint(85, 365), random.uniform(0.5, 3)) for _ in range(220)]

WF = np.zeros((220, 300, 3), np.uint8)
CARRIERS = rng.integers(0, 300, 9)


def waterfall_step(flash=False):
    global WF
    WF = np.roll(WF, 1, 0)
    r = rng.random(300) * 30
    row = np.stack([r * 0.15, r * 0.45, r * 1.4 + 22], 1)
    for c in CARRIERS:
        row[max(0, c - 1): c + 2] = (60, 190, 130)
    if flash:
        row[:] = (255, 255, 255)
    WF[0] = row.clip(0, 255)


for _ in range(WF.shape[0]):
    waterfall_step()


# =================================================================== PLANS
def blink_at(t, seed=0):
    return (t * 0.31 + seed * 0.17) % 4.1 < 0.12


def m(who, f):
    a = MOUTH.get(who)
    return float(a[f]) if a is not None and f < len(a) else 0.0


def shot_black(t, dur, T, f, kw):
    return Image.new('RGB', (W, H))


def shot_city(t, dur, T, f, kw):
    p = t / dur
    z = 1 + 1.5 * p ** 1.6
    cw, ch = CW / z, CH / z
    cx = CW / 2 + (CITY_T[0] - CW / 2) * p ** 1.3
    cy = CH / 2 + (CITY_T[1] - CH / 2) * p ** 1.3
    img = CITY.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))).resize((W, H), Image.BILINEAR)
    rain(img, 230, (90, 100, 120), seed=f)
    return fade(img, t / 1.5)


def shot_roof(t, dur, T, f, kw):
    p = t / dur
    y = int((H) * (p ** 1.4))
    img = ROOF.crop((0, y, W, y + H))
    rain(img, 180, (110, 120, 140), seed=f)
    if p > 0.85:
        img = Image.blend(img, STUDIO['night'], (p - 0.85) / 0.15)
    return img


def draw_screens(img, mode, f, t, flash=False, msg=None):
    d = ImageDraw.Draw(img)
    if msg is None:
        waterfall_step(flash)
        wf = Image.fromarray(WF).resize((160, 110))
        img.paste(wf, (605, 205))
        for k in range(9):
            d.line([(800, 200 + k * 13), (800 + (k * 37 + f) % 140, 200 + k * 13)], fill=(110, 170, 120))
        d.rectangle([990, 275, 1100, 345], fill=(200, 205, 210) if mode == 'day' else (60, 70, 90))
    else:
        d.rectangle([600, 200, 770, 320], fill=(2, 2, 3))
        d.text((612, 252), msg, font=MONO_XS, fill=(220, 222, 225))
    return glow(img, [600, 190, 1105, 350], (30, 60, 110), radius=40, strength=0.5 if mode == 'night' else 0.15)


def seated_nathan(img, t, light, turn=0.0, typing=True):
    d = ImageDraw.Draw(img)
    x = 880
    d.rectangle([x - 50, 380, x + 50, 470], fill=(25, 25, 30))  # chaise
    body(img, x, 480, 1.25, 'nathan', light=light, hood=True)
    if typing:
        k = math.sin(t * 22) * 4
        d.line([(x - 40, 330), (x - 70 + k, 365)], fill=tint(REF['nathan']['top'], light), width=16)
        d.line([(x + 40, 330), (x + 70 - k, 365)], fill=tint(REF['nathan']['top'], light), width=16)


def shot_tower(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (6, 7, 10))
    d = ImageDraw.Draw(img)
    off = int(-t * 18)
    d.line([(0, 120), (300 + off, 120), (520 + off, 280)], fill=(20, 20, 22), width=10)
    d.rectangle([520 + off, 262, 600 + off, 300], fill=(12, 12, 14))  # clé SDR
    d.rectangle([600 + off, 60, 1100 + off, 500], fill=(18, 18, 22))
    d.rectangle([640 + off, 90, 1060 + off, 470], fill=(28, 30, 36), outline=(60, 62, 70), width=3)
    for k in range(2):
        cx, cy = 760 + off + k * 180, 250
        a = t * 30 + k
        d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], outline=(50, 54, 62), width=4)
        for j in range(5):
            aa = a + j * 2 * math.pi / 5
            d.line([(cx, cy), (cx + 60 * math.cos(aa), cy + 60 * math.sin(aa))], fill=(70, 74, 84), width=6)
    d.ellipse([1020 + off, 440, 1032 + off, 452], fill=(40, 220, 90))
    d.text((960 + off, 380), 'N', font=TITLE, fill=(220, 110, 30))
    return glow(img, [1020 + off, 440, 1032 + off, 452], (20, 120, 40), 12, 1.0)


def shot_studio_wide(t, dur, T, f, kw):
    img = STUDIO['night'].copy()
    rain(img, 30, (70, 90, 120), seed=f, area=(700, 22, 930, 120), length=(6, 14))
    seated_nathan(img, t, (0.55, 0.65, 0.9))
    img = draw_screens(img, 'night', f, t)
    z = 1 + 0.12 * t / dur
    return img.crop((int(W * (z - 1) * 0.7), int(H * (z - 1) * 0.3), int(W * (z - 1) * 0.7 + W / z), int(H * (z - 1) * 0.3 + H / z))).resize((W, H))


def shot_mug(t, dur, T, f, kw):
    img = vgrad(W, H, (12, 14, 22), (6, 6, 10))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(40, 30, 22))
    d.rectangle([480, 220, 680, 420], fill=(200, 196, 188))
    d.arc([650, 260, 740, 360], 270, 90, fill=(200, 196, 188), width=18)
    d.ellipse([480, 200, 680, 240], fill=(120, 90, 50))
    d.line([(600, 215), (640, 120)], fill=(220, 220, 210), width=2)
    d.rectangle([630, 90, 680, 120], fill=(230, 210, 160))
    d.rectangle([900, 60, 1220, 200], fill=(8, 10, 14))
    d.text((950, 105), '02:14', font=TITLE, fill=(200, 210, 230))
    return glow(img, [900, 60, 1220, 200], (30, 50, 90), 30, 0.6)


def phone_frame(lines, typing='', glow_on=True):
    img = vgrad(W, H, (10, 12, 18), (4, 4, 8))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([450, 20, 830, 560], radius=40, fill=(12, 12, 14), outline=(60, 60, 66), width=4)
    d.rectangle([470, 60, 810, 540], fill=(236, 236, 240))
    d.line([(760, 60), (810, 110)], fill=(150, 150, 155), width=2)  # fissure
    d.line([(780, 60), (795, 95)], fill=(150, 150, 155), width=1)
    y = 80
    for who, txt in lines:
        tw = min(300, d.textlength(txt, font=SANS_S) + 24)
        x0 = 480 if who != 'me' else 800 - tw
        col = (210, 210, 216) if who != 'me' else (80, 140, 230)
        d.rounded_rectangle([x0, y, x0 + tw, y + 34], radius=14, fill=col)
        d.text((x0 + 12, y + 8), txt, font=SANS_S, fill=(20, 20, 24) if who != 'me' else (255, 255, 255))
        y += 46
    d.rectangle([470, 490, 810, 540], fill=(250, 250, 252))
    d.text((485, 505), (typing + '|') if typing is not None else '', font=SANS_S, fill=(30, 30, 30))
    return img


def shot_call(t, dur, T, f, kw):
    sp = speaker_at(T)
    if sp == 'elise':
        img = vgrad(W, H, (40, 36, 44), (20, 18, 24))  # chambre d'Élise, rideaux tirés
        d = ImageDraw.Draw(img)
        d.rectangle([900, 40, 1180, 300], fill=(60, 66, 84))
        bust(img, 560, 220, 1.05, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=(0.75, 0.75, 0.85), brow=0.4)
        d.ellipse([650, 200, 700, 290], fill=(20, 20, 22))  # téléphone à l'oreille
        return img
    img = grade(STUDIO_BLUR['dawn'], (0.85, 0.85, 0.92))
    bust(img, 700, 220, 1.05, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(0.82, 0.84, 0.92), brow=0.5)
    ImageDraw.Draw(img).ellipse([580, 200, 630, 290], fill=(20, 20, 22))
    return img


def shot_voicemail(t, dur, T, f, kw):
    img = vgrad(W, H, (10, 12, 18), (4, 4, 8))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([450, 20, 830, 560], radius=40, fill=(12, 12, 14), outline=(60, 60, 66), width=4)
    d.rectangle([470, 60, 810, 540], fill=(28, 30, 36))
    d.line([(760, 60), (810, 110)], fill=(150, 150, 155), width=2)
    d.text((500, 90), 'Messagerie vocale', font=SANS_B, fill=(230, 230, 235))
    d.text((500, 130), 'Élise — 23:52 — 0:14', font=SANS_S, fill=(170, 170, 178))
    lvl = m('elise', f)
    for i in range(26):  # forme d'onde du message
        h_ = 8 + 60 * lvl * (0.5 + 0.5 * math.sin(i * 1.7 + T * 9))
        x = 500 + i * 11
        d.rectangle([x, 300 - h_, x + 6, 300 + h_], fill=(80, 150, 240) if i < 26 * min(1, t / max(dur, 0.1)) else (90, 90, 100))
    d.ellipse([610, 420, 670, 480], fill=(80, 150, 240))
    d.rectangle([630, 437, 637, 463], fill=(255, 255, 255)); d.rectangle([643, 437, 650, 463], fill=(255, 255, 255))
    return grade(img, (0.8, 0.82, 0.92))


def shot_phone_sms(t, dur, T, f, kw):
    base = [('elise', 'Élise — 23:52'), ('elise', "T'es vivant ? Tu réponds plus depuis 3 jours.")]
    seq = [(3, 'v'), (3.4, 'vi'), (3.8, 'viv'), (4.2, 'viva'), (4.6, 'vivan'), (5.0, 'vivant'), (6.5, 'viva'), (6.8, ''),
           (7.5, 'dé'), (8.0, 'désol'), (8.5, 'désolé'), (9.8, 'dés'), (10.1, ''), (11, 'oui.'), (11.8, 'oui. dem'), (12.5, 'oui. demain ?')]
    k = dur / 15.0  # la frappe suit la durée du plan
    t = t / k
    typing = ''
    for tt, s in seq:
        if t - 2.5 >= tt - 3:
            typing = s
    lines = base + ([('me', 'oui. demain ?')] if t > 13.5 else [])
    if t > 13.5:
        typing = ''
    img = phone_frame(lines, typing)
    shake = int(math.sin(t * 90) * 4) if t < 0.6 or 1.2 < t < 1.8 else 0
    img = img.transform(img.size, Image.AFFINE, (1, 0, shake, 0, 1, 0))
    return grade(img, (0.75, 0.78, 0.9))


def shot_waterfall(t, dur, T, f, kw):
    waterfall_step()
    img = Image.fromarray(WF).resize((W, H), Image.NEAREST)
    d = ImageDraw.Draw(img)
    sec = 51 + int(t / dur * 6.9)
    d.rectangle([1040, 490, 1270, 530], fill=(0, 0, 0))
    d.text((1052, 494), f'02:16:{sec:02d}', font=MONO, fill=(200, 210, 225))
    return img


def shot_clock(t, dur, T, f, kw):
    waterfall_step()
    img = Image.new('RGB', (W, H), (2, 3, 6))
    d = ImageDraw.Draw(img)
    s = 58 if t < dur / 2 else 59
    text_c(d, 220, f'02:16:{s:02d}', TITLE, (210, 220, 235))
    return img


def shot_flash(t, dur, T, f, kw):
    ts = T - T_SIGNAL
    img = STUDIO['night'].copy()
    seated_nathan(img, t, (0.55, 0.65, 0.9), typing=ts < 0)
    img = draw_screens(img, 'night', f, t, flash=0 <= ts < 0.12)
    d = ImageDraw.Draw(img)
    d.text((610, 300), '02:17:00' if ts >= 0 else '02:16:59', font=MONO_XS, fill=(200, 210, 230))
    d.ellipse([630, 80, 660, 110], fill=(80, 80, 70))  # ampoule
    if 0 <= ts < 0.25:
        img = glow(img, [630, 80, 660, 110], (255, 220, 160), 120, 1.6)
        img = Image.blend(img, Image.new('RGB', (W, H), (240, 245, 255)), 0.45)
    if ts > 0.3:  # sursaut
        img = img.transform(img.size, Image.AFFINE, (1, 0, -6 if ts < 0.6 else 0, 0, 1, 0))
    return img


MSG = "SI TU LIS CE MESSAGE, C'EST QUE NOUS AVONS ÉCHOUÉ."


def terminal_text(txt, n, t, y=H // 2 - 18, cursor=True, bg=(3, 4, 6)):
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)
    x0 = (W - d.textlength(MSG, font=MONO)) / 2
    s = txt[:max(0, n)]
    d.text((x0, y), s, font=MONO, fill=(225, 228, 230))
    cx = x0 + d.textlength(s, font=MONO)
    if cursor and (int(t * 3) % 2 == 0 or n < len(txt)):
        d.rectangle([cx + 4, y + 2, cx + 20, y + 34], fill=(225, 228, 230))
    return img


def shot_message(t, dur, T, f, kw):
    return terminal_text(MSG, int((t - 0.6) * 9), t)


def shot_cable(t, dur, T, f, kw):
    img = STUDIO_BLUR['night'].copy()
    img = grade(img, (0.8, 0.85, 1.0))
    dy = int(max(0, 1.5 - t) * 60) if t < 3 else 0
    hand = t > 1.0
    bust(img, 520, 230 + dy, 0.95, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 1), hood=False,
         light=(0.6, 0.72, 1.05), look=(1, 0), brow=0.6)
    d = ImageDraw.Draw(img)
    if hand:  # câble arraché dans la main
        d.line([(640, 470), (720, 380), (760, 300)], fill=(40, 120, 200), width=8)
        d.ellipse([610, 440, 680, 510], fill=tint(REF['nathan']['skin'], (0.6, 0.72, 1.05)))
    d.rectangle([860, 160, 1240, 360], fill=(3, 4, 6))
    d.text((875, 250), MSG[:36], font=MONO_XS, fill=(220, 222, 225))
    return glow(img, [860, 160, 1240, 360], (30, 60, 120), 50, 0.6)


def shot_erase(t, dur, T, f, kw):
    n = len(MSG) - int(t * 22)
    if n > 0:
        return terminal_text(MSG, n, t, cursor=True)
    img = Image.new('RGB', (W, H), (3, 4, 6))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([590, 190, 690, 300], radius=8, fill=(70, 90, 130))
    d.polygon([(625, 225), (625, 265), (660, 245)], fill=(230, 235, 245))
    d.text((598, 310), '847.mov', font=SANS_S, fill=(220, 222, 226))
    return img


# ---- la vidéo de Nathan du futur (4:3, lampe rouge, compression)
VX0, VX1 = int((W - H * 4 / 3) / 2), int((W + H * 4 / 3) / 2)
DUST = [(random.uniform(0, 1), random.uniform(0, 1), random.uniform(0.3, 1)) for _ in range(140)]


def future_frame(t, T, f, close=False, shake=0.0):
    vw = VX1 - VX0
    img = vgrad(vw, H, (70, 66, 62), (46, 44, 42))
    d = ImageDraw.Draw(img)
    for k in range(0, vw, 90):
        d.line([(k, 0), (k, H)], fill=(58, 55, 52), width=2)
    d.text((-20, 60), 'NIV -4', font=font('DejaVuSans-Bold.ttf', 80), fill=(160, 156, 150))
    s = 1.35 if close else 1.0
    bust(img, vw // 2 + int(shake * 8 * math.sin(T * 40)), int(250 if not close else 235), s, 'futur',
         mouth=m('futur', f), blink=blink_at(T, 4), scar=True, light=(1, 1, 1), brow=0.3,
         look=(0.6, 0) if 0 < T - T_BOOM < 2.5 else (0, 0))
    red = 0.5 + 0.5 * math.sin(T * 1.7)
    a = np.asarray(img, np.float32)
    a *= np.array([0.55 + 0.6 * red, 0.32 + 0.1 * red, 0.30 + 0.08 * red])
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if 0 < T - T_BOOM < 2.5:  # poussière qui tombe
        d = ImageDraw.Draw(img)
        p = (T - T_BOOM) / 2.5
        for x, y, sp in DUST:
            d.point((x * vw, ((y * 0.3 + p * sp) % 1) * H), fill=(200, 170, 150))
    small = img.resize((vw // 3, H // 3), Image.BILINEAR).resize((vw, H), Image.NEAREST)
    img = Image.blend(img, small, 0.35)
    r, g, b = img.split()
    img = Image.merge('RGB', (r.transform(img.size, Image.AFFINE, (1, 0, -2, 0, 1, 0)), g, b))
    out = Image.new('RGB', (W, H))
    out.paste(img, (VX0, 0))
    return out


def shot_vid(t, dur, T, f, kw):
    shake = 1.0 if kw.get('boom') and 0 < T - T_BOOM < 1.0 else 0.0
    img = future_frame(t, T, f, kw.get('close', False), shake)
    if shake:
        img = img.transform(img.size, Image.AFFINE, (1, 0, random.randint(-8, 8), 0, 1, random.randint(-6, 6)))
    if not kw.get('boom') and not kw.get('close') and t < 1.2:  # réglage de la caméra
        img = img.transform(img.size, Image.AFFINE, (1, 0, 0, 0.03 * (1.2 - t), 1, -20 * (1.2 - t)))
    if kw.get('glitch') and T >= T_CUT:
        k = T - T_CUT
        if k < 0.6:
            img = pixelate(img, int(8 + k * 80))
        else:
            img = Image.new('RGB', (W, H))
    return img


def shot_react_cable(t, dur, T, f, kw):
    img = grade(STUDIO_BLUR['night'], (0.7, 0.8, 1.0))
    bust(img, 640, 200, 1.05, 'nathan', blink=blink_at(T, 2), light=(0.55, 0.68, 1.05), look=(0, 1), brow=0.8)
    d = ImageDraw.Draw(img)
    drop = min(1, max(0, t - 1.0) / 0.5)
    y = 430 + drop * 140
    d.line([(560, y), (620, y - 60 + drop * 50), (700, y - 70 + drop * 70)], fill=(40, 120, 200), width=8)
    if drop < 1:
        d.ellipse([530, y - 30, 600, y + 30], fill=tint(REF['nathan']['skin'], (0.55, 0.68, 1.05)))
    return img


def shot_react_scar(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (4, 6, 14))
    bust(img, 640, 230, 1.15, 'nathan', blink=blink_at(T, 3), light=(0.45, 0.55, 0.95), brow=0.9)
    d = ImageDraw.Draw(img)
    if t > dur * 0.35:  # il touche son sourcil gauche
        p = min(1, (t - dur * 0.35) / 1.0)
        hx, hy = 760 - 20 * p, 520 - 330 * p
        d.line([(860, H), (hx, hy)], fill=tint(REF['nathan']['top'], (0.45, 0.55, 0.95)), width=34)
        d.ellipse([hx - 24, hy - 24, hx + 24, hy + 24], fill=tint(REF['nathan']['skin'], (0.45, 0.55, 0.95)))
    return fade(img, (dur - t) / 0.4) if t > dur - 0.4 else img


def shot_title(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if 0.8 <= t < dur - 1.2:
        d = ImageDraw.Draw(img)
        text_c(d, 240, 'LE DERNIER SIGNAL', TITLE, (236, 236, 236))
    return img


def shot_dawn(t, dur, T, f, kw):
    img = STUDIO['dawn'].copy()
    seated_nathan(img, t, (0.8, 0.85, 0.95), typing=False)
    d = ImageDraw.Draw(img)
    d.line([(700, 520), (760, 528), (820, 515)], fill=(40, 120, 200), width=6)  # câble au sol
    d.rectangle([780, 300, 980, 330], fill=(110, 100, 120))  # couverture sur les épaules
    img = draw_screens(img, 'dawn', f, t)
    return fade(img, t / 1.0)


def shot_player(t, dur, T, f, kw):
    fr = future_frame(0, 140.0, 0)
    z = 1 + 1.6 * min(1, t / dur * 1.4)
    cx, cy = 640 + 60 * z, 175
    crop = fr.crop((int(cx - W / z / 2), int(cy - H / z / 2), int(cx + W / z / 2), int(cy + H / z / 2))).resize((W, H))
    d = ImageDraw.Draw(crop)
    d.rectangle([0, H - 40, W, H], fill=(20, 20, 24))
    d.text((20, H - 32), '▶  02:47 / 03:00     Lectures : 31', font=SANS_S, fill=(200, 200, 205))
    return crop


def shot_notebook(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (205, 210, 222))
    d = ImageDraw.Draw(img)
    for y in range(0, H, 24):
        d.line([(0, y), (W, y)], fill=(170, 185, 215))
    for x in range(0, W, 24):
        d.line([(x, 0), (x, H)], fill=(185, 195, 222))
    notes = ['02:17:00 — toutes fréq.', '0 octet', 'créé : 07/11/2041 ???', 'NIV -4', 'MAYA = ?']
    shown = int(t / dur * 6.5)
    for i, n_ in enumerate(notes[:shown]):
        d.text((200, 70 + i * 72), n_, font=font('DejaVuSans.ttf', 34), fill=(15, 15, 25))
    if shown >= 5:
        d.ellipse([175, 340, 400, 410], outline=(15, 15, 25), width=3)
        d.ellipse([180, 345, 395, 405], outline=(15, 15, 25), width=2)
    return grade(img, (0.78, 0.8, 0.86))


def shot_search(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (245, 245, 247))
    d = ImageDraw.Draw(img)
    q = 'MAYA' if t < dur / 2 else 'MAYA intelligence artificielle'
    d.rounded_rectangle([180, 40, 1000, 90], radius=24, outline=(190, 190, 195), width=2)
    d.text((210, 52), q, font=SANS, fill=(20, 20, 20))
    res = [('Maya l\'abeille — Wikipédia', 'Série d\'animation…'), ('Civilisation maya — Wikipédia', 'La civilisation maya est une ancienne civilisation…'),
           ('Autodesk Maya | Logiciel 3D', 'Animation, modélisation et rendu 3D…')]
    for i, (a, b) in enumerate(res):
        d.text((180, 140 + i * 110), a, font=SANS_B, fill=(30, 50, 160))
        d.text((180, 172 + i * 110), b, font=SANS_S, fill=(80, 80, 85))
    return grade(img, (0.82, 0.84, 0.9))


def photo_card():
    img = Image.new('RGB', (420, 300), (180, 186, 190))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 420, 150], fill=(170, 178, 186))
    d.rectangle([0, 200, 420, 300], fill=(150, 146, 136))
    d.rectangle([0, 150, 420, 200], fill=(120, 132, 140))
    claire = dict(REF['nathan'])
    d.rounded_rectangle([160, 150, 260, 300], radius=20, fill=(170, 60, 52))  # coupe-vent rouge délavé
    d.ellipse([180, 90, 240, 160], fill=(225, 198, 182))
    d.chord([176, 84, 244, 130], 180, 360, fill=(170, 135, 95))
    d.ellipse([228, 110, 250, 132], fill=(170, 135, 95))  # queue-de-cheval
    d.arc([195, 125, 225, 145], 20, 160, fill=(120, 60, 60), width=3)  # sourire
    d.ellipse([190, 112, 198, 120], fill=(100, 120, 110)); d.ellipse([222, 112, 230, 120], fill=(100, 120, 110))
    d.ellipse([186, 40, 234, 92], fill=(225, 198, 182))  # Nathan enfant sur les épaules
    d.chord([184, 36, 236, 70], 180, 360, fill=(70, 50, 35))
    d.rounded_rectangle([180, 86, 240, 120], radius=10, fill=(60, 90, 140))
    return img


PHOTO = photo_card()


def shot_photo(t, dur, T, f, kw):
    if t < dur * 0.4:
        img = grade(STUDIO['dawn'], (0.9, 0.9, 0.95))
        z = 1 + 2.4 * min(1, t / (dur * 0.36))
        cx, cy = 370, 175
        return img.crop((int(cx - W / z / 2), int(cy - H / z / 2), int(cx + W / z / 2), int(cy + H / z / 2))).resize((W, H)).filter(ImageFilter.GaussianBlur(max(0, 3 - t)))
    img = Image.new('RGB', (W, H), (40, 42, 48))
    d = ImageDraw.Draw(img)
    d.rectangle([380, 60, 900, 480], fill=(170, 150, 120))
    img.paste(PHOTO.resize((460, 330)), (410, 90))
    img = grade(img, (0.85, 0.86, 0.92))
    if t > 9.5:
        sub = Image.new('RGB', (W, H))
        img = Image.blend(img, sub, 0)
    return img


# ---- jour, avec Élise
def two_shot(bg, T, f, who_speaks, kw):
    base = {'day': STUDIO_BLUR['day'], 'door': None}[bg] if bg == 'day' else None
    if bg == 'day':
        img = base.copy()
        light = {'nathan': (1.0, 0.98, 0.96), 'elise': (1.0, 0.98, 0.96)}
    else:  # porte est, nuit, torche
        img = vgrad(W, H, (22, 22, 24), (10, 10, 12))
        d = ImageDraw.Draw(img)
        d.rectangle([700, 0, 1100, H], fill=(48, 50, 54))
        d.ellipse([900, 200, 912, 212], fill=(40, 220, 90))
        light = {'nathan': (0.75, 0.72, 0.68), 'elise': (0.45, 0.42, 0.42)}
        rain(img, 60, (70, 72, 80), seed=f)
    close = who_speaks
    if close == 'elise':
        bust(img, 420, 215, 1.05, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=light['elise'], look=(1, 0), brow=0.3)
        if kw.get('notebook'):
            d = ImageDraw.Draw(img)
            d.rectangle([300, 420, 460, 536], fill=(230, 120, 30))
        bust(img, 1080, 250, 0.9, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=tuple(c * 0.75 for c in light['nathan']), look=(-1, 0))
        img2 = img
    else:
        bust(img, 830, 215, 1.05, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=light['nathan'], look=(-1, 0), brow=0.4,
             hood=False)
        bust(img, 200, 250, 0.9, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=tuple(c * 0.75 for c in light['elise']), look=(1, 0))
        img2 = img
    if kw.get('wf') and close == 'nathan':
        d = ImageDraw.Draw(img2)
        waterfall_step(flash=(f // 24) % 5 == 0)
        img2.paste(Image.fromarray(WF).resize((300, 200), Image.NEAREST), (960, 60))
    return img2


def shot_talk(t, dur, T, f, kw):
    return two_shot(kw.get('bg', 'day'), T, f, speaker_at(T), kw)


def shot_door(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (54, 50, 46))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 260, H], fill=(36, 34, 32))  # chambranle, intérieur
    d.rectangle([1040, 0, W, H], fill=(36, 34, 32))
    light = (0.95, 0.92, 0.88)
    bust(img, 640, 210, 1.0, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=light, brow=0.2 if t < 6 else -0.2)
    d.ellipse([440, 380, 520, 440], fill=(150, 110, 70))  # porte-gobelets
    d.rectangle([450, 350, 476, 390], fill=(240, 236, 228)); d.rectangle([484, 350, 510, 390], fill=(240, 236, 228))
    rain(img, 10, (200, 200, 210), seed=f, area=(520, 100, 760, 300), length=(3, 6))  # gouttes sur le ciré
    if speaker_at(T) == 'nathan':
        bust(img, 1180, 260, 1.0, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(0.6, 0.6, 0.62), look=(-1, 0))
    return img


def shot_watch(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (14, 18, 30))
    pulse = 0.85 + 0.15 * math.sin(T * 5)
    bust(img, 640, 220, 1.12, 'elise', blink=blink_at(T, 5), light=(0.6 * pulse, 0.75 * pulse, 1.15 * pulse),
         brow=0.2 if t < 4 else 1.0, mouth=0.12 if t > 5 else 0.0)
    return img


def shot_props(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (232, 232, 236))
    d = ImageDraw.Draw(img)
    d.rectangle([300, 70, 980, 470], fill=(250, 250, 252), outline=(160, 160, 168), width=2)
    d.rectangle([300, 70, 980, 110], fill=(225, 226, 232))
    d.text((320, 80), 'Propriétés — 847.mov', font=SANS_B, fill=(30, 30, 34))
    rows = [('Type :', 'Fichier vidéo (.mov)'), ('Emplacement :', 'C:\\Users\\Nathan\\Bureau'), ('Taille :', '0 octet'),
            ('Taille sur disque :', '0 octet'), ('Créé le :', '07/11/2041  02:17'), ('Modifié le :', '07/11/2041  02:17')]
    for i, (a, b) in enumerate(rows):
        d.text((330, 140 + i * 50), a, font=SANS, fill=(70, 70, 76))
        col = (180, 30, 30) if ('0 octet' in b and t > 2) or ('2041' in b and t > 6) else (20, 20, 24)
        d.text((560, 140 + i * 50), b, font=SANS, fill=col)
    if speaker_at(T) == 'elise':
        img = img.filter(ImageFilter.GaussianBlur(6))
        bust(img, 640, 220, 1.05, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=(0.75, 0.8, 0.95), brow=0.6)
    return grade(img, (0.88, 0.9, 0.96))


def shot_montage(t, dur, T, f, kw):
    k = int(t / dur * 4)
    if k == 0:
        img = Image.new('RGB', (W, H), (226, 230, 224))
        d = ImageDraw.Draw(img)
        d.text((40, 30), 'Récepteurs publics — carte', font=SANS_B, fill=(30, 30, 30))
        pts = [(640, 300, 'Vous'), (660, 490, 'Observatoire de Saint-Véran-les-Bois — 31 km S'), (330, 290, 'F4KLM — radioamateur — 18 km O')]
        for x, y, n_ in pts:
            d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(200, 40, 40))
            d.text((x + 14, y - 10), n_, font=SANS_S, fill=(30, 30, 30))
        return grade(img, (0.85, 0.87, 0.9))
    if k == 1:
        waterfall_step(flash=(f % 40) < 2)
        return Image.fromarray(WF).resize((W, H), Image.NEAREST)
    if k == 2:
        img = Image.new('RGB', (W, H), (210, 140, 50))
        d = ImageDraw.Draw(img)
        d.rectangle([180, 0, 1100, H], fill=(235, 236, 228))
        for y in range(0, H, 22):
            d.line([(180, y), (1100, y)], fill=(190, 200, 220))
        vals = ['Δt₁ = 41,382 µs', 'Δt₂ = 17,904 µs', 'câble : 20 m → 0,10 µs', 'Δt₁ corr. = 41,282 µs']
        for i, v in enumerate(vals[: 1 + int((t / dur * 4 - 2) * 4)]):
            d.text((240, 80 + i * 70), v, font=font('DejaVuSans.ttf', 32), fill=(40, 40, 50))
        return grade(img, (0.85, 0.85, 0.85))
    img = shot_map(t, dur, T, f, {'partial': True})
    return img


def city_map():
    img = Image.new('RGB', (W, H), (232, 228, 218))
    d = ImageDraw.Draw(img)
    rr = random.Random(9)
    for _ in range(80):
        x = rr.randint(0, W); y = rr.randint(0, H)
        d.line([(x, y), (x + rr.randint(-300, 300), y + rr.randint(-200, 200))], fill=(250, 250, 250), width=rr.randint(3, 9))
    d.line([(0, 400), (400, 330), (800, 360), (W, 260)], fill=(160, 190, 220), width=26)  # fleuve
    d.rectangle([700, 60, 900, 170], fill=(205, 205, 200))
    d.text((712, 70), 'Zone des Tanneries', font=SANS_S, fill=(90, 90, 90))
    return img


MAP = city_map()


def shot_map(t, dur, T, f, kw):
    img = MAP.copy()
    d = ImageDraw.Draw(img)
    p = min(1, t / max(0.5, dur * 0.6))
    for (a, b, c) in ((1.0, 0.0, (210, 30, 30)), (0.6, 1.0, (210, 30, 30))):
        pts = []
        for i in range(int(60 * p)):
            u = (i / 60 - 0.5) * 3
            x = 800 + 260 * math.sinh(u) * (1 if a == 1 else -0.6)
            y = 120 + 90 * math.cosh(u) * (1 if a == 1 else 1.4) - 90 * (1 if a == 1 else 1.4)
            if b:
                x, y = 800 + (y - 120) * 2.2 - 0, 120 + (x - 800) * 0.35
            pts.append((x, y))
        if len(pts) > 1:
            d.line(pts, fill=c, width=4)
    if p >= 1 and not kw.get('partial'):
        d.ellipse([786, 106, 814, 134], outline=(210, 30, 30), width=4)
        d.rectangle([830, 100, 1080, 140], fill=(255, 255, 255))
        d.text((840, 108), 'Laboratoire Orphée', font=SANS_B, fill=(20, 20, 20))
        z = 1 + 0.6 * min(1, (t - dur * 0.6) / (dur * 0.4 + 0.01))
        img = img.crop((int(800 - W / z / 2), int(160 - H / z / 2), int(800 + W / z / 2), int(160 + H / z / 2))).resize((W, H))
    return grade(img, (0.86, 0.87, 0.9))


def shot_sms_inconnu(t, dur, T, f, kw):
    if t < 2.8:
        img = phone_frame([('x', 'Inconnu — 11:41'), ('x', "porte est. le code n'a pas changé.")], None)
        return grade(img, (0.85, 0.85, 0.9))
    return shot_talk(t, dur, T, f, {'bg': 'day'})


# ---- route
def shot_road(t, dur, T, f, kw):
    img = vgrad(W, H, (30, 34, 44), (14, 15, 20))
    d = ImageDraw.Draw(img)
    off = (t * 220) % 400
    for i in range(-1, 5):
        x = i * 400 - off
        d.rectangle([x, 200, x + 300, 360], fill=(36, 38, 42))  # entrepôts
        d.line([(x + 350, 380), (x + 350, 150)], fill=(60, 60, 64), width=5)  # lampadaire
        d.ellipse([x + 335, 140, x + 365, 158], fill=(220, 140, 50) if t / dur > i * 0.15 else (50, 50, 50))
    d.rectangle([0, 380, W, H], fill=(22, 22, 26))
    for i in range(0, W, 140):
        d.rectangle([(i - off * 2) % W, 450, (i - off * 2) % W + 60, 456], fill=(140, 140, 140))
    cx = 480 + math.sin(t) * 6
    d.rounded_rectangle([cx, 360, cx + 300, 430], radius=26, fill=(110, 114, 118))  # 206 grise
    d.polygon([(cx + 60, 360), (cx + 110, 315), (cx + 210, 315), (cx + 250, 360)], fill=(80, 84, 88))
    d.rectangle([cx + 50, 344, cx + 66, 352], fill=(10, 10, 10))  # rétroviseur scotché
    for wx in (cx + 60, cx + 240):
        d.ellipse([wx - 26, 405, wx + 26, 457], fill=(10, 10, 12))
    img = glow(img, [cx + 295, 380, cx + 310, 395], (200, 190, 150), 30, 1.0)
    rain(img, 160, (90, 95, 110), seed=f)
    return img


def shot_car(t, dur, T, f, kw):
    img = vgrad(W, H, (34, 30, 30), (12, 12, 16))
    d = ImageDraw.Draw(img)
    rain(img, 140, (80, 90, 110), seed=f, angle=-2)
    sl = (T * 0.8) % 1  # passage des lampadaires
    lk = 0.7 + 0.4 * max(0, 1 - abs(sl - 0.5) * 6)
    sp = speaker_at(T)
    bust(img, 400, 250, 0.95, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=(lk, lk * 0.8, lk * 0.6), look=(-0.3 if sp != 'nathan' else 1, 0))
    bust(img, 880, 260, 0.95, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(lk * 0.85, lk * 0.7, lk * 0.55), look=(-1 if sp == 'elise' else 0, 0.5))
    a = math.sin(T * 3.0)  # essuie-glaces
    d.line([(640, H), (640 + 600 * math.sin(a), H - 600 * abs(math.cos(a)))], fill=(10, 10, 10), width=10)
    if 'Ok.' == tl.sub_at(T) or (T - tl.shots[[s[2] for s in tl.shots].index('car')][0]) < 3.5:
        pass
    return img


def shot_lab_ext(t, dur, T, f, kw):
    img = LAB_EXT.copy()
    d = ImageDraw.Draw(img)
    cx = -320 + min(1, t / 4) * 620
    d.rounded_rectangle([cx, 430, cx + 230, 485], radius=20, fill=(90, 94, 98))
    d.polygon([(cx + 40, 430), (cx + 80, 395), (cx + 160, 395), (cx + 190, 430)], fill=(70, 74, 78))
    if t < 6:
        img = glow(img, [cx + 225, 445, cx + 240, 460], (220, 200, 150), 40, 1.0)
    rain(img, 220, (90, 95, 110), seed=f)
    return img


def wall_night(f, flash_x=None):
    img = vgrad(W, H, (34, 34, 36), (16, 16, 18))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 80):
        d.line([(x, 0), (x, 400)], fill=(28, 28, 30), width=2)
    d.rectangle([0, 400, W, H], fill=(12, 12, 14))
    if flash_x is not None:
        layer = Image.new('L', (W, H))
        ImageDraw.Draw(layer).ellipse([flash_x - 160, 120, flash_x + 160, 380], fill=150)
        layer = layer.filter(ImageFilter.GaussianBlur(40))
        img = Image.composite(Image.new('RGB', (W, H), (190, 186, 170)), img, layer.point(lambda v: int(v * 0.5)))
    rain(img, 160, (80, 84, 96), seed=f)
    return img


def shot_walk(t, dur, T, f, kw):
    fx = 300 + t * 70
    img = wall_night(f, fx + 200)
    body(img, fx, 480, 1.3, 'nathan', phase=t * 6, walking=True, light=(0.55, 0.55, 0.58))
    body(img, fx - 130, 480, 1.25, 'elise', phase=t * 6 + 1, walking=True, light=(0.7, 0.66, 0.6), arm=0.5)
    return img


def shot_keypad(t, dur, T, f, kw):
    img = vgrad(W, H, (60, 62, 66), (38, 40, 44))
    d = ImageDraw.Draw(img)
    d.rectangle([700, 0, 1180, H], fill=(70, 72, 76))  # porte métallique
    d.rectangle([440, 120, 640, 440], fill=(40, 40, 44), outline=(90, 90, 96), width=4)
    code = kw.get('code')
    pressed = None
    keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
    seq = ['1', '4', '0', '3']
    if code:
        k = int((t - 1.0) / 0.55)
        if 0 <= k < 4:
            pressed = seq[k]
    for i, kk in enumerate(keys):
        x = 465 + (i % 3) * 55
        y = 180 + (i // 3) * 60
        d.rounded_rectangle([x, y, x + 45, y + 48], radius=6, fill=(150, 150, 156) if kk != pressed else (220, 220, 225))
        d.text((x + 15, y + 12), kk, font=SANS_B, fill=(30, 30, 30))
    green = code and t > 3.4
    led = (40, 230, 90) if green else (230, 40, 40)
    d.ellipse([530, 135, 550, 155], fill=led)
    img = glow(img, [530, 135, 550, 155], tuple(c // 2 for c in led), 25, 1.2)
    lay = Image.new('L', (W, H))
    ImageDraw.Draw(lay).ellipse([300, 40, 800, 520], fill=255)
    img = Image.composite(img, grade(img, (0.35, 0.35, 0.38)), lay.filter(ImageFilter.GaussianBlur(60)))
    if code and t < 3.4:  # la main tape le code
        k = max(0, min(3, int((t - 1.0) / 0.55)))
        i = keys.index(seq[k])
        x = 465 + (i % 3) * 55 + 22
        y = 180 + (i // 3) * 60 + 30
        d = ImageDraw.Draw(img)
        d.line([(x + 200, H + 40), (x + 8, y + 10)], fill=REF['nathan']['top'], width=60)
        d.ellipse([x - 22, y - 10, x + 30, y + 40], fill=tint(REF['nathan']['skin'], (0.8, 0.78, 0.74)))
    if green:
        d = ImageDraw.Draw(img)
        op = max(0.0, min(1, (t - 3.6) / 1.5))
        d.rectangle([700, 0, 700 + int(30 * op), H], fill=(20, 40, 90))
        img = glow(img, [700, 0, 700 + int(30 * op), H], (30, 70, 160), 40, 0.8 * op)
    if not code:
        sp = speaker_at(T)
        if sp == 'elise' and m('elise', f) > 0:
            pass
    return img


# ---- laboratoire
def beams(img, pts, intensity=0.55):
    lay = Image.new('L', (W, H))
    d = ImageDraw.Draw(lay)
    for (x, y, tx, ty) in pts:
        d.polygon([(x, y), (tx - 120, ty - 90), (tx + 120, ty + 90)], fill=150)
        d.ellipse([tx - 130, ty - 110, tx + 130, ty + 110], fill=200)
    lay = lay.filter(ImageFilter.GaussianBlur(30))
    lit = grade(img, (2.6, 2.5, 2.3))
    return Image.composite(lit, img, lay.point(lambda v: int(v * intensity)))


def shot_hall(t, dur, T, f, kw):
    img = vgrad(W, H, (12, 12, 14), (6, 6, 8))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(14, 13, 12))
    d.rectangle([380, 250, 820, 380], fill=(22, 21, 20))  # comptoir d'accueil
    for k in range(9):
        rr = random.Random(k)
        x = rr.randint(50, 1200)
        d.polygon([(x, 380 + rr.randint(0, 120)), (x + 80, 390 + rr.randint(0, 120)), (x + 50, 420 + rr.randint(0, 100))], fill=(30, 30, 30))
    d.text((440, 90), 'ORP  ÉE', font=font('DejaVuSans-Bold.ttf', 60), fill=(40, 40, 42))
    sweep = math.sin(t * 0.7)
    img = beams(img, [(500, H, 640 + sweep * 300, 260), (800, H, 500 - sweep * 250, 150)])
    rr = np.random.default_rng(f)
    d = ImageDraw.Draw(img)
    for _ in range(60):  # poussière dans les faisceaux
        d.point((rr.uniform(300, 1000), rr.uniform(80, 400)), fill=(130, 126, 118))
    body(img, 560 + t * 25, 520, 1.1, 'nathan', phase=t * 5, walking=True, light=(0.3, 0.3, 0.32))
    body(img, 720 + t * 25, 520, 1.05, 'elise', phase=t * 5 + 1, walking=True, light=(0.35, 0.33, 0.3))
    return img


def shot_stairs(t, dur, T, f, kw):
    img = vgrad(W, H, (34, 34, 36), (20, 20, 22))
    d = ImageDraw.Draw(img)
    for k in range(8):
        d.polygon([(0, 300 + k * 30), (W, 200 + k * 30), (W, 230 + k * 30), (0, 330 + k * 30)], fill=(26 + k, 26 + k, 28 + k))
    d.text((160, 120), '▼ NIVEAU -4 — ACCÈS RESTREINT — PROTOCOLE ARIANE', font=font('DejaVuSans-Bold.ttf', 34), fill=(200, 196, 186))
    d.rectangle([1060, 40, 1180, 80], fill=(20, 120, 60)); d.text((1074, 48), 'SORTIE', font=SANS_B, fill=(220, 255, 230))
    img = grade(img, (0.5, 0.52, 0.55))
    px = 300 + min(1, t / 4) * 600
    img = beams(img, [(px - 200, H, px, 140)], 0.8)
    return img


def shot_room(t, dur, T, f, kw):
    if kw.get('late'):
        t, dur = dur * 0.9 + t * 0.02, dur
    img = CONTROL.copy()
    d = ImageDraw.Draw(img)
    for x, y, s in LEDS:
        if (math.sin(T * s + x) > -0.3):
            d.rectangle([x, y, x + 3, y + 3], fill=(70, 150, 255))
    img = glow(img, [180, 60, img.size[0] - 180, 380], (20, 50, 110), 60, 0.7)
    p = t / dur
    z = 1 + 0.25 * p
    w, h = img.size
    cw, ch = w / (1.3 * z), h / (1.3 * z)
    cx, cy = w / 2, h / 2 + 30 * p
    img = img.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))).resize((W, H))
    body(img, 520 + p * 40, 535, 1.2, 'nathan', phase=t * 4, walking=p < 0.7, light=(0.3, 0.4, 0.7))
    body(img, 400 + p * 20, 535, 1.15, 'elise', phase=t * 4 + 1, walking=p < 0.7, light=(0.35, 0.38, 0.6))
    return img


def shot_cup(t, dur, T, f, kw):
    img = vgrad(W, H, (8, 18, 40), (4, 8, 16))
    d = ImageDraw.Draw(img)
    if t < dur / 2:
        d.rectangle([0, 360, W, H], fill=(46, 46, 48))
        for k in range(400):
            rr = random.Random(k)
            d.point((rr.randint(0, W), rr.randint(360, H)), fill=(80, 80, 78))
        d.rectangle([540, 240, 700, 380], fill=(150, 146, 140))
        d.ellipse([540, 222, 700, 258], fill=(30, 22, 16))
        d.arc([670, 270, 740, 340], 270, 90, fill=(150, 146, 140), width=14)
    else:
        d.rectangle([0, 300, W, H], fill=(52, 54, 60))  # pupitre propre
        d.rectangle([300, 330, 980, 420], fill=(196, 188, 160))  # clavier beige
        for i in range(14):
            for j in range(4):
                d.rectangle([315 + i * 47, 340 + j * 20, 352 + i * 47, 355 + j * 20], fill=(212, 206, 180))
    return grade(img, (0.55, 0.7, 1.1))


def child_drawing():
    img = Image.new('RGB', (520, 380), (238, 232, 214))
    d = ImageDraw.Draw(img)
    d.ellipse([250, 40, 480, 270], outline=(40, 80, 200), width=10)
    d.ellipse([60, 80, 110, 130], outline=(30, 30, 30), width=4)
    d.line([(85, 130), (85, 250)], fill=(30, 30, 30), width=4)
    d.line([(85, 160), (40, 210)], fill=(30, 30, 30), width=4); d.line([(85, 160), (150, 200)], fill=(30, 30, 30), width=4)
    d.line([(85, 250), (60, 320)], fill=(30, 30, 30), width=4); d.line([(85, 250), (110, 320)], fill=(30, 30, 30), width=4)
    d.polygon([(85, 160), (40, 260), (130, 260)], outline=(200, 60, 60), fill=None)
    d.ellipse([160, 180, 190, 210], outline=(30, 30, 30), width=4)
    d.line([(175, 210), (175, 280)], fill=(30, 30, 30), width=4)
    d.line([(175, 225), (150, 200)], fill=(30, 30, 30), width=4)
    d.text((170, 320), 'NATAN', font=font('DejaVuSans-Bold.ttf', 36), fill=(60, 60, 200))
    return img.rotate(3, expand=False, fillcolor=(110, 84, 52))


DRAWING = child_drawing()


def shot_drawing(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (110, 84, 52))
    z = 1 + 0.08 * t / dur
    dr = DRAWING.resize((int(520 * 1.1 * z), int(380 * 1.1 * z)))
    img.paste(dr, ((W - dr.size[0]) // 2, (H - dr.size[1]) // 2))
    img = grade(img, (0.5, 0.62, 1.0))
    if 2.5 < t < 3.0:  # la torche de Nathan effleure le dessin
        img = grade(img, (1.6, 1.55, 1.4))
    return img


def maya_screen(t, T, txt, n):
    br = 1 + 0.04 * math.sin(T * 1.6)
    img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
    d = ImageDraw.Draw(img)
    for x, y, s in LEDS[:90]:
        if math.sin(T * s + x) > -0.3:
            d.rectangle([x % W, y % 160, x % W + 3, y % 160 + 3], fill=(60, 140, 255))
    d.rectangle([250, 170, 1030, 500], fill=(2, 3, 5), outline=(40, 44, 52), width=10)
    s = txt[:max(0, n)]
    d.text((290, 205), s, font=MONO, fill=(225, 228, 230))
    cx = 290 + d.textlength(s, font=MONO)
    if int(T * 3) % 2 == 0 or n < len(txt):
        d.rectangle([cx + 4, 208, cx + 20, 240], fill=(225, 228, 230))
    return img


def shot_terminal(t, dur, T, f, kw):
    txt = 'BONJOUR NATHAN.' if t > 5.5 else ''
    img = maya_screen(t, T, txt, int((t - 5.5) * 7))
    if t < 5.5:
        img2 = Image.new('RGB', (W, H), (6, 14, 34))
        bust(img2, 900, 230, 0.95, 'nathan', blink=blink_at(T, 6), light=(0.45, 0.6, 1.1), look=(-1, 0))
        bust(img2, 1160, 260, 0.85, 'elise', blink=blink_at(T, 5), light=(0.4, 0.5, 0.95), look=(-1, 0))
        img = Image.blend(img.filter(ImageFilter.GaussianBlur(4)), img2, 0.0) if False else img
        small = img.resize((W // 2, H // 2)).filter(ImageFilter.GaussianBlur(2))
        img2.paste(small, (40, 120))
        return img2
    return img


def shot_maya1(t, dur, T, f, kw):
    br = 1 + 0.05 * math.sin(T * 1.6) + 0.08 * m('maya', f)
    img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
    bust(img, 560, 220, 1.12, 'nathan', blink=blink_at(T, 6), light=(0.45 * br, 0.62 * br, 1.15 * br), brow=0.7)
    bust(img, 1060, 250, 0.85, 'elise', blink=blink_at(T, 5), light=(0.32, 0.42, 0.8), brow=1.0)
    img = img.filter(ImageFilter.GaussianBlur(0))
    return img


def shot_nat_reply(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (6, 16, 40))
    bust(img, 640, 215, 1.25, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(0.45, 0.62, 1.15), brow=0.5)
    return img


def shot_pas_encore(t, dur, T, f, kw):
    img = maya_screen(t, T, 'BONJOUR NATHAN.', 99)
    if t > dur - 1.6:
        img = Image.new('RGB', (W, H), (6, 16, 40))
        bust(img, 640, 215, 1.3, 'nathan', blink=False, light=(0.45, 0.62, 1.15), brow=1.0)
        bust(img, 1080, 250, 0.7, 'elise', blink=False, light=(0.25, 0.32, 0.6))
        img = img if t < dur - 0.4 else Image.new('RGB', (W, H))
    return img


def shot_end(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if t > dur - 1.2:
        d = ImageDraw.Draw(img)
        text_c(d, 470, 'FIN DE LA PARTIE 1', SANS_S, (110, 110, 110))
    return img


_bust_base = bust
CUR = {'f': 0, 'T': 0.0}
SOURCILS = {'peur': 0.9, 'surprise': 1.2, 'tristesse': 0.6, 'colere': -0.9, 'douceur': 0.25, 'sidere': 0.8,
            'ironie': 0.4, 'fatigue': -0.2, 'tension': -0.3, 'chuchote': 0.3, 'murmure': 0.3, 'joie': 0.5}
INCLINE = {'douceur': 6, 'tristesse': -5, 'ironie': 4, 'fatigue': -3}


def bust(img, cx, cy, s, who, mouth=0.0, **kw):
    """Buste animé : largeur de bouche selon la voyelle, sourcils et inclinaison selon l'émotion jouée."""
    f, T = CUR['f'], CUR['T']
    wd = getattr(tl, 'mouth_width', {}).get(who)
    if wd is not None and f < len(wd) and mouth > 0.06:
        kw['mouth_w'] = float(wd[f])
    emo = tl.emotion_at(who, T)
    if emo:
        kw['brow'] = 0.4 * kw.get('brow', 0.0) + SOURCILS.get(emo, 0.0)
        kw['tilt'] = kw.get('tilt', 0) + INCLINE.get(emo, 0) * s
        if emo == 'chuchote':
            mouth *= 0.6
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
    except Exception as e:  # ne casse pas un rendu de 10 min : on journalise et on répète l'image précédente
        print(f'ERREUR image {fi} ({name}): {e!r}', flush=True)
        img = _LAST if _LAST is not None else Image.new('RGB', (W, H))
    img = finish(img)
    if name not in ('title', 'end', 'black'):
        subtitle(img, tl.sub_at(T))
    return img


# =================================================================== SON
def build_audio():
    mx = Mix(TOTAL)
    n = mx.n
    t = np.arange(n) / SR

    def win(a, b, fi=0.6, fo=0.6):
        e = np.clip((t - a) / max(fi, 1e-3), 0, 1) * np.clip((b - t) / max(fo, 1e-3), 0, 1)
        return e.astype(np.float32)

    def shots(name):
        return [s for s in tl.shots if s[2] == name]

    seq = lambda a, b: win(a, b, 0.8, 0.8)
    rain_out = smooth_noise(n, 1500, 1, lo=150) * 0.5
    rain_in = smooth_noise(n, 650, 2, lo=80) * 0.45
    hum = (0.06 * np.sin(2 * np.pi * 50 * t) + 0.025 * np.sin(2 * np.pi * 100 * t)).astype(np.float32)
    fans = smooth_noise(n, 500, 3, lo=60) * 0.12
    low_city = smooth_noise(n, 180, 4) * 0.25

    T_TITLE = S[3][0]
    mx.bus['amb'] += rain_out * (win(0, S[0][1], 2.5, 1.0) * 0.9)
    mx.bus['amb'] += low_city * win(1, S[0][1], 2, 1)
    # studio, nuit
    a = win(S[0][1] - 1.5, T_SIGNAL, 1.5, 0.02) + win(T_SIGNAL + 1.0, S[3][0], 0.4, 0.3)
    mx.bus['amb'] += (rain_in * 0.9 + fans) * a
    mx.bus['amb'] += hum * 0.5 * a
    # aube, jour
    mx.bus['amb'] += (rain_in * 0.25 + fans * 0.6) * win(S[4][0], S[4][1], 1, 0.5)
    mx.bus['amb'] += (rain_in * 0.6 + fans * 0.5) * win(S[5][0], S[5][1], 0.5, 0.5)
    # route
    eng = smooth_noise(n, 140, 5) * 0.55 + (0.12 * np.sin(2 * np.pi * 42 * t)).astype(np.float32)
    mx.bus['amb'] += (eng + rain_out * 0.5) * win(S[6][0], S[6][1] - 5, 0.5, 0.5)
    mx.bus['amb'] += rain_out * 1.0 * win(S[6][1] - 5, S[7][1], 0.5, 0.5)
    # labo
    lab_end = [s for s in tl.shots if s[2] == 'pas_encore'][0]
    PAS = line_time('Pas encore.')
    mx.bus['amb'] += (hum * 1.4 + fans * 1.2) * win(S[8][0], PAS[0] - 0.3, 0.6, 0.05)
    mx.bus['amb'] += rain_in * 0.25 * win(S[8][0], S[8][0] + 20, 0.5, 2)
    # vidéo du futur : sirènes lointaines, goutte
    vs, ve = S[2][0], T_CUT
    sir = np.sin(2 * np.pi * (560 + 90 * np.sin(2 * np.pi * 0.18 * t)) * t).astype(np.float32)
    mx.bus['amb'] += fft_filter(sir, hi=900) * 0.05 * win(vs, ve, 0.2, 0.01)
    mx.bus['amb'] += smooth_noise(n, 3000, 6, lo=300) * 0.05 * win(vs, ve, 0.2, 0.01)
    for k in np.arange(vs + 0.7, ve, 1.9):
        mx.add('fx', tone(1300, 0.08, 0.04, decay=0.03), k)
    # ---- bruitages
    sms = shots('phone_sms')[0][0]
    buzz = (np.sin(2 * np.pi * 170 * np.arange(int(0.35 * SR)) / SR) * 0.18).astype(np.float32)
    buzz = fft_filter(buzz * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * np.arange(len(buzz)) / SR))), hi=600)
    mx.add('fx', buzz, sms + 0.1); mx.add('fx', buzz, sms + 1.2)

    def key_click(g=0.06):
        x = smooth_noise(int(0.035 * SR), 2500, random.randint(0, 999), lo=300) * np.exp(-np.arange(int(0.035 * SR)) / (0.006 * SR))
        return (x * g).astype(np.float32)

    for s in shots('studio_wide') + [s for s in tl.shots if s[2] == 'flash']:
        for k in np.arange(s[0], min(s[1], T_SIGNAL), 0.13):
            if random.random() < 0.7:
                mx.add('fx', key_click(), k + random.uniform(0, 0.05))
    for k in (3, 3.4, 3.8, 4.2, 4.6, 5.0, 7.5, 8.0, 8.5, 11, 11.8, 12.5):
        mx.add('fx', key_click(0.03), sms + k)
    mx.add('fx', tone(880, 0.12, 0.05) + 0, sms + 13.5)
    # Signal
    mx.add('fx', signal_motif(0.2), T_SIGNAL)
    mx.add('fx', smooth_noise(int(0.5 * SR), 400, 9) * 0.25 * np.exp(-np.arange(int(0.5 * SR)) / (0.15 * SR)), T_SIGNAL)
    cab = shots('cable')[0][0]
    mx.add('fx', smooth_noise(int(0.12 * SR), 1500, 10) * 0.15 * np.exp(-np.arange(int(0.12 * SR)) / 800), cab + 1.0)
    # explosion dans la vidéo
    nb = int(2.5 * SR)
    boom = smooth_noise(nb, 160, 11) * np.exp(-np.arange(nb) / (0.6 * SR)) * 0.9
    mx.add('fx', boom.astype(np.float32), T_BOOM)
    mx.add('fx', smooth_noise(int(1.5 * SR), 2000, 12, lo=400) * 0.06 * np.exp(-np.arange(int(1.5 * SR)) / (0.5 * SR)), T_BOOM + 0.3)
    # coupure de la vidéo
    mx.add('fx', smooth_noise(int(0.6 * SR), 1800, 13, lo=200) * 0.1, T_CUT)
    # titre
    mx.add('fx', signal_motif(0.17), T_TITLE + 0.8)
    mx.add('amb', (hum * 0.6 * win(T_TITLE + 2, S[3][1] - 0.5, 2, 0.05))[int(T_TITLE * SR):int(S[3][1] * SR)], T_TITLE)
    # interphone + porte
    door = shots('door')[0][0]
    mx.add('fx', fft_filter((np.sign(np.sin(2 * np.pi * 220 * np.arange(int(0.9 * SR)) / SR)) * 0.07).astype(np.float32), hi=900), door - 1.2)
    # vidéo entendue par Élise (étouffée)
    wst = shots('watch')[0][0]
    for i, txt in enumerate(['Nathan. Quoi que tu fasses, ne fais pas confiance à MAYA.', 'Et Élise… elle']):
        a_ = tts('futur', txt, VOX)
        mx.add('fx', fft_filter(a_, hi=800, lo=200) * 0.9, wst + 0.8 + i * 4.3)
    # SMS de l'Inconnu : motif du Signal, très bas
    sin_ = shots('sms_inconnu')[0][0]
    mx.add('fx', signal_motif(0.07), sin_ + 0.3)
    # voiture : essuie-glaces
    car = shots('car')[0]
    for k in np.arange(car[0], car[1], math.pi / 3.0):
        mx.add('fx', smooth_noise(int(0.4 * SR), 1200, int(k), lo=200) * 0.06 * env_ramp(int(0.4 * SR), 0.15 * SR, 0.2 * SR), k)
    # pas
    for name, step in (('walk', 0.52), ('hall', 0.62), ('room', 0.75)):
        for s in shots(name):
            for k in np.arange(s[0] + 0.2, s[1] - 0.3, step):
                x = smooth_noise(int(0.12 * SR), 500, int(k * 10)) * np.exp(-np.arange(int(0.12 * SR)) / (0.03 * SR)) * 0.25
                mx.add('fx', x.astype(np.float32), k)
    # digicode
    kp = shots('keypad')[1]
    for i in range(4):
        mx.add('fx', tone(1046, 0.08, 0.05), kp[0] + 1.0 + i * 0.55)
    mx.add('fx', tone(1318, 0.25, 0.06), kp[0] + 3.4)
    mx.add('fx', smooth_noise(int(0.08 * SR), 900, 20) * 0.3 * np.exp(-np.arange(int(0.08 * SR)) / 600), kp[0] + 3.55)
    hiss = smooth_noise(int(1.4 * SR), 1400, 21, lo=300) * 0.12 * env_ramp(int(1.4 * SR), 0.05 * SR, 1.0 * SR)
    mx.add('fx', hiss, kp[0] + 3.7)
    mx.add('amb', (hum * 0.8)[: int(8 * SR)] * env_ramp(int(8 * SR), 1 * SR, 2 * SR), kp[0] + 3.7)
    # fin
    end = shots('end')[0][0]
    mx.add('fx', signal_motif(0.18), end + 0.6)
    # ---- musique
    cello = sum(np.sin(2 * np.pi * 73.42 * h * t + 0.25 * np.sin(2 * np.pi * 4.8 * t)) / h ** 1.3 for h in range(1, 6)).astype(np.float32)
    cello = fft_filter(cello, hi=900)
    mx.bus['mus'] += cello * 0.05 * (win(4, S[0][1], 3, 2) + win(S[6][1] - 5, S[6][1] + 2, 2, 3) + win(T_BOOM - 1, T_CUT, 3, 0.05))
    # montée vers le signal : battement grave qui accélère, nappe qui monte
    a0 = [sh for sh in tl.shots if sh[2] == 'phone_sms'][0][0]
    k = a0
    while k < T_SIGNAL - 0.4:
        p_ = (k - a0) / max(1, T_SIGNAL - a0)
        mx.add('mus', tone(55, 0.35, 0.22, harmonics=(1, 2), decay=0.12), k)
        k += 1.1 - 0.6 * p_
    rise = np.sin(2 * np.pi * (110 + 40 * np.clip((t - a0) / max(1, T_SIGNAL - a0), 0, 1)) * t).astype(np.float32)
    mx.bus['mus'] += fft_filter(rise, hi=700) * 0.05 * win(a0, T_SIGNAL, 3, 0.02)
    # piano de l'aube (thème Nathan & Élise, 4 notes sans résolution)
    for k, base in enumerate(np.arange(S[4][0] + 0.5, S[4][1] - 3, 4.6)):
        for j, fq in enumerate((293.66, 349.23, 440.0, 392.0)):
            mx.add('mus', piano(fq, 3.0, 0.07), base + j * 1.1)
    # pulsation de l'enquête
    mon = [s for s in tl.shots if s[2] in ('montage', 'map')]
    a0, a1 = mon[0][0] - 6, mon[-1][1]
    pulse = (np.sin(2 * np.pi * 110 * t) * (np.sin(2 * np.pi * 2 * t) > 0.6)).astype(np.float32)
    mx.bus['mus'] += fft_filter(pulse, hi=500) * 0.05 * win(a0, a1, 2, 1.5)
    # thème de MAYA (nappe de voix)
    ma0 = shots('terminal')[0][0] + 5.0
    pad = sum(np.sin(2 * np.pi * fq * t + 0.6 * np.sin(2 * np.pi * 0.21 * t * (i + 1))) for i, fq in enumerate((220.0, 261.63, 329.63, 392.0))).astype(np.float32) / 4
    pad = fft_filter(pad, hi=1500)
    mx.bus['mus'] += pad * 0.05 * win(ma0, PAS[0] - 0.3, 3, 0.05)
    # ---- dialogues
    PAN = {'elise': -0.32, 'nathan': 0.30, 'maya': 0.0, 'futur': 0.0, 'radio': 0.12, 'gabriel': 0.2}
    for (st, en, w, txt, a_), room in zip(tl.lines, tl.room):
        x = a_.copy()
        shot = tl.shot_at(st + 0.05)[2]
        pan = PAN.get(w, 0.0)
        if w == 'futur':                       # voix sortie des haut-parleurs de la tour
            x = fft_filter(x, lo=250, hi=3800); pan = 0.15 if shot != 'react_cable' else 0.5
        elif w == 'radio':
            x = fft_filter(x, lo=400, hi=3000) * 0.45; room = 'voiture'
        elif w == 'maya':                      # MAYA : sèche, trop proche (bible 2.4)
            x = fft_filter(x, lo=90, hi=8000) * 1.05; room = 'sec'
        if shot == 'voicemail':                # messagerie : voix d'Élise au téléphone
            x = fft_filter(x, lo=320, hi=3400); room = 'sec'; pan = 0.0
        mx.add_voice(x.astype(np.float32), st, pan=pan, room=room)
    # silence total sous « Pas encore »
    i0, i1 = int((PAS[0] - 0.3) * SR), int((end + 0.6) * SR)
    for k in ('amb', 'mus'):
        mx.bus[k][i0:i1] = 0
    i0, i1 = int((T_SIGNAL + 0.05) * SR), int((T_SIGNAL + 1.0) * SR)  # silence après la salve
    mx.bus['amb'][i0:i1] = 0
    return mx.render()


if __name__ == '__main__':
    import time
    t0 = time.time()
    audio = build_audio()
    Mix.write(os.path.join(OUT, 'partie1_audio.wav'), audio)
    print('audio ok', round(time.time() - t0), 's', flush=True)
    vid = os.path.join(OUT, 'partie1_video.mp4')
    encode(frame, NF, vid)
    print('vidéo ok', round(time.time() - t0), 's', flush=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-i', os.path.join(OUT, 'partie1_audio.wav'),
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', str(TOTAL), '-movflags', '+faststart',
                    os.path.join(OUT, 'LE_DERNIER_SIGNAL_partie1.mp4')], check=True)
    with open(os.path.join(OUT, 'partie1_montage.txt'), 'w') as fh:
        for s in tl.shots:
            fh.write(f'{s[0]:8.2f} {s[1]:8.2f}  {s[2]}\n')
        fh.write('\n')
        for st, en, w, txt, a_ in tl.lines:
            fh.write(f'{st:8.2f} {en:8.2f}  {w:7s} {txt}\n')
    print('fini', round(time.time() - t0), 's')
