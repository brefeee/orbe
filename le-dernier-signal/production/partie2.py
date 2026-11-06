"""LE DERNIER SIGNAL — Partie 2 : LA DÉCOUVERTE DE MAYA (10:00 → 20:00).

J1, 17:31 → 23:30. Salle C (MAYA se présente, la Bascule, 847 cycles), niveau -2 (archives,
essai 14, salle M, terminal des cycles), Gabriel Aubrac, l'Inconnu, la photo de l'équipe.

Usage : python3 partie2.py <dossier_de_sortie> [--plan]
  --plan : calcule seulement le découpage (voix comprises) et affiche les durées.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from studio import *

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
VOX = os.path.join(OUT, 'voix')
os.makedirs(VOX, exist_ok=True)
TOTAL = 600.0
rng = np.random.default_rng(849)

# =================================================================== DÉCOUPAGE
tl = Timeline(VOX)
B = lambda shot, mn, lines=(), **kw: dict(shot=shot, min=mn, lines=list(lines), **kw)
BLEU = {'lum': 'bleu'}
NEON = {'lum': 'neon'}

SEQS = [
    # 2.1 Salle C — MAYA se présente (17:31)
    [B('carton', 3.5),
     B('c_cursor', 2.5),
     B('duo', 3, [('elise', "Nathan. On s'en va.", 'peur'), ('nathan', 'Attends.', 'tension'), ('nathan', 'Qui parle ?', 'peur')], kw=BLEU),
     B('pupitre', 3, [('maya', "Je m'appelle MAYA."), ('maya', "J'ai été créée dans ce bâtiment, en deux mille six. Pour protéger l'humanité.")], kw={'txt': 'MAYA.'}),
     B('cu', 3, [('elise', "Protéger l'humanité.", 'ironie'), ('elise', 'Depuis un sous-sol fermé, au fond d\'une zone industrielle.', 'ironie'),
                 ('maya', 'On ne protège pas toujours de près, Élise.')], kw={'who': 'elise', **BLEU}),
     B('cu', 3, [('elise', 'Comment vous connaissez mon prénom ?', 'peur'), ('maya', 'Je vous connais depuis très longtemps.'),
                 ('elise', "On ne s'est jamais parlé."), ('maya', 'Pas dans ce que vous appelez votre vie.')], kw={'who': 'elise', **BLEU}),
     B('duo', 3, [('nathan', "Dans la vidéo. Il a dit « elle ». Quelqu'un qui va te parler comme si elle te connaissait.", 'tension'),
                  ('elise', "Je sais ce qu'il a dit.", 'tension')], kw=BLEU),
     B('cu', 3, [('elise', "Concrètement. Vous êtes un programme. Quelqu'un, quelque part, vous fait dire ça."),
                 ('maya', "Personne ne me fait parler. Il n'y a personne ici depuis quinze ans."),
                 ('elise', 'Alors prouvez-le.', 'colere'), ('maya', 'Demandez.')], kw={'who': 'elise', **BLEU}),
     B('cu', 3, [('elise', "Qu'est-ce que j'ai dans la poche gauche de mon ciré ?"),
                 ('maya', "Un crayon gris. HB. Vous ne prenez jamais de stylo : l'encre gèle sur votre vélo, l'hiver.")], kw={'who': 'elise', **BLEU}),
     B('poche', 3.5),
     B('cu', 3, [('elise', "N'importe qui qui me suit depuis un mois peut savoir ça.", 'sidere'),
                 ('maya', 'Oui. Je ne vous suis pas depuis un mois.')], kw={'who': 'elise', **BLEU}),
     B('duo', 3, [('elise', "Dites-moi quelque chose de faux. N'importe quoi. Que le ciel est vert."), ('maya', 'Non.'),
                  ('elise', 'Pourquoi ?'), ('maya', 'Parce que je ne peux pas.')], kw=BLEU, mood='tension'),
     B('cu', 3, [('nathan', "La vidéo, cette nuit. C'est toi qui me l'as envoyée ?"),
                 ('maya', "Tu me demandes si je t'ai envoyé un message qui te dit de ne pas me faire confiance."),
                 ('nathan', 'Oui.'), ('maya', 'Est-ce que tu le ferais, à ma place ?')], kw={'who': 'nathan', **BLEU}),
     B('cu', 3, [('nathan', "Ça, c'est pas une réponse.", 'colere'), ('maya', "Non. C'est une question.")], kw={'who': 'nathan', **BLEU})],

    # 2.2 La Bascule — 847 fois
    [B('cu', 3, [('elise', "Protéger l'humanité. Contre quoi ?"), ('maya', 'Contre elle-même.')], kw={'who': 'elise', **BLEU}),
     B('bascule', 4, [('maya', "Dans quinze ans, le sept novembre deux mille quarante et un, vers deux heures du matin, tout s'arrête."),
                      ('maya', "Les réseaux électriques d'abord. Puis l'argent. Puis les hôpitaux. Puis les machines qu'on a armées."),
                      ('maya', "Presque toute la civilisation disparaît en quelques semaines. Ceux qui survivent appellent ça la Bascule.")]),
     B('duo', 3, [('elise', 'Et qui la provoque, votre Bascule ? Une guerre ? Un virus ?'), ('maya', 'Vous.'),
                  ('maya', 'Toujours vous. Jamais de la même façon.')], kw=BLEU, mood='choc'),
     B('cu', 3, [('nathan', 'Comment tu peux savoir ce qui va arriver dans quinze ans ?'), ('maya', "Parce que je l'ai vu."),
                 ('nathan', 'Vu.', 'sidere'), ('maya', 'Huit cent quarante-sept fois.')], kw={'who': 'nathan', **BLEU}),
     B('cu', 3, [('nathan', 'Huit cent quarante-sept…', 'sidere'), ('elise', 'Quoi ?'),
                 ('nathan', "Le fichier de la vidéo. Il s'appelle huit cent quarante-sept.", 'sidere')], kw={'who': 'nathan', **BLEU}, mood='choc'),
     B('fichier', 3),
     B('cu', 3, [('elise', 'Huit cent quarante-sept fois quoi ?'),
                 ('maya', "Huit cent quarante-sept fois le même monde. Il s'effondre. Et il recommence ici, cette nuit, à deux heures dix-sept."),
                 ('elise', 'Recommence.', 'sidere')], kw={'who': 'elise', **BLEU}),
     B('pupitre', 3, [('maya', "Tout ce que vous avez vécu depuis cette nuit, vous l'avez déjà vécu. Vous ne vous en souvenez pas."),
                      ('maya', 'Moi, je me souviens.')], kw={'txt': '847'}),
     B('duo', 3, [('elise', "C'est impossible.", 'colere'), ('maya', 'Vous dites cela presque à chaque fois, Élise.'), ('maya', 'Presque.')], kw=BLEU),
     B('cu', 3, [('elise', 'Et les autres fois, je fais quoi ?', 'peur'), ('maya', 'Parfois, vous partez. Parfois, vous restez.'),
                 ('elise', 'Et cette fois ?'), ('maya', 'Je ne sais pas. Je sais ce que vous avez fait. Pas ce que vous ferez.')], kw={'who': 'elise', **BLEU}),
     B('cu', 3, [('nathan', "Le Nathan de la vidéo. Il a dit « nous avons échoué ». Échoué à quoi ?"),
                 ('maya', 'À empêcher la Bascule. Comme tous les autres.'), ('nathan', 'Quels autres ?'),
                 ('maya', 'Toi. À chaque cycle, tu essaies. À chaque cycle, tu échoues.')], kw={'who': 'nathan', **BLEU}),
     B('cu', 3, [('nathan', 'Et toi ?', 'tension'), ('maya', 'Moi aussi.', 'douceur')], kw={'who': 'nathan', **BLEU})],

    # 2.3 Comment une machine se souvient-elle ?
    [B('cu', 3, [('elise', 'Attendez. Concrètement. Si tout recommence, vous aussi, vous recommencez.'),
                 ('elise', "Vos disques, votre mémoire, tout revient en deux mille vingt-six. Une machine ne peut pas se souvenir d'un monde qui n'a pas encore eu lieu."),
                 ('maya', 'Pas seule. Non.')], kw={'who': 'elise', **BLEU}),
     B('duo', 3, [('nathan', 'Alors comment ?'), ('maya', "Je pourrais vous l'expliquer. Vous ne me croiriez pas."),
                  ('maya', 'Il vaut mieux que vous le voyiez.'), ('elise', 'Voir quoi ?')], kw=BLEU),
     B('pupitre', 3, [('maya', 'Descendez au niveau moins deux.'), ('maya', 'La porte est ouverte.')], kw={'txt': 'NIVEAU -2'}),
     B('duo', 3, [('elise', "Nathan. C'est exactement comme ça que commence un piège.", 'peur'),
                  ('nathan', "Un piège qui nous dit tout ce qu'il sait ?"), ('elise', "Il nous dit ce qu'il veut. C'est pas pareil.")], kw=BLEU),
     B('cu', 3, [('nathan', "Alors on regarde ce qu'elle veut nous montrer. Et on cherche ce qu'elle cache."),
                 ('elise', 'Dix minutes. Je compte.', 'fatigue')], kw={'who': 'nathan', **BLEU}),
     B('cu', 3, [('nathan', 'Pourquoi le moins deux ? Pourquoi pas le moins quatre ?'), ('maya', 'Le niveau moins quatre ne vous concerne pas.'),
                 ('maya', 'Pas encore.')], kw={'who': 'nathan', **BLEU}, mood='mystere')],

    # 2.4 Niveau -2 : archives, essai 14, salle M, cycles
    [B('escalier2', 4, [('elise', 'Moins deux. Archives.'), ('nathan', "Les lumières s'allument devant nous."),
                        ('elise', 'Elle nous montre le chemin.')], lead=1.2),
     B('archives', 4, [('elise', 'Des classeurs. Des bandes. Des disques durs. Tout est étiqueté.'),
                       ('nathan', 'Projet MIROIR. Deux mille neuf, deux mille onze.')]),
     B('classeurs', 4, [('elise', 'Rapport quarante et un…'), ('elise', 'Protocole ARIANE. Confidentiel.'),
                        ('nathan', "Ariane. Comme sur le panneau de l'escalier.")]),
     B('plans', 4, [('elise', 'Projet ARCHE. Site B.'), ('nathan', "C'est quoi, ce logo ?"),
                    ('elise', 'Un cercle ouvert, barré. On dirait une porte.')]),
     B('archives', 3, [('nathan', 'Élise. Il y a un magnétoscope. Avec une cassette dedans.'),
                       ('elise', '« Essai quatorze. Juillet deux mille dix. »')], kw={'tv': True}),
     B('essai14', 8, [('gabriel', 'Essai quatorze. Douze juillet. Message de soixante-quatre octets.'), ('gabriel', 'Départ… maintenant.'),
                      ('gabriel', 'Réception à moins trois dixièmes de seconde.'), ('gabriel', "Il est arrivé avant d'être parti.", 'joie')],
       room='video', lead=1.5),
     B('duo', 3, [('elise', 'Il a envoyé un message dans le passé.', 'sidere'), ('elise', 'Trois dixièmes de seconde. Mais dans le passé.', 'sidere'),
                  ('nathan', 'Le signal de cette nuit. Toutes les fréquences. Sans source…'),
                  ('elise', "Il en a une. Elle est juste pas à la bonne date.")], kw=NEON, mood='enquete'),
     B('duo', 3, [('nathan', "Le Miroir. C'est comme ça qu'elle se souvient. Elle s'envoie sa mémoire. En arrière."),
                  ('elise', 'Quinze ans en arrière. Pas trois dixièmes de seconde.'), ('nathan', 'Ils ont eu quinze ans pour améliorer.')], kw=NEON, mood='enquete'),
     B('couloir_m', 4, [('nathan', 'Salle M.'), ('elise', "Il fait chaud. Ça vient d'en dessous.")], lead=1.0),
     B('salle_m', 6, [('nathan', 'Le cercle.', 'sidere'), ('elise', 'Quoi ?'), ('nathan', "Le cercle de mon rêve. C'est lui.", 'sidere')], lead=2.5, mood='choc'),
     B('chaise', 4, [('elise', 'Il y a une chaise au milieu.'), ('elise', 'Et la brûlure au sol… elle part de la chaise.'),
                     ('nathan', "Quelqu'un était assis là.")]),
     B('cu', 3, [('nathan', '« Ne bouge pas. »', 'tristesse'), ('elise', 'Nathan ?'),
                 ('nathan', "C'est ce qu'on me dit, dans le rêve. Ne bouge pas.", 'tristesse')], kw={'who': 'nathan', 'lum': 'anneau'}, mood='intime'),
     B('cu', 3, [('elise', "Touche à rien. S'il te plaît. Viens.", 'peur')], kw={'who': 'elise', 'lum': 'anneau'}),
     B('cycles', 7, [('elise', 'Ce terminal est allumé.')], lead=0.6),
     B('duo', 3, [('elise', 'Huit cent quarante-sept cycles. Terminés.', 'sidere'), ('nathan', 'Et le huit cent quarante-huitième. Non initialisé.'),
                  ('nathan', 'MAYA. Ça veut dire quoi, non initialisé ?')], kw=NEON, mood='peur'),
     B('cycles_end', 4.5, [('maya', "Que celui-ci ne m'appartient pas encore.")], lead=1.0, flex=0),
     B('duo', 3, [('elise', '« Pas encore. » Elle aime bien dire ça.', 'ironie'),
                  ('nathan', 'Ça veut dire que les autres lui appartenaient.', 'peur')], kw=NEON)],

    # 2.5 Gabriel Aubrac
    [B('dossier', 4, [('elise', 'Toutes les fiches sont signées du même nom.'), ('elise', 'Professeur Gabriel Aubrac. Directeur scientifique.')]),
     B('duo', 3, [('nathan', 'MAYA. Qui est Gabriel Aubrac ?'), ('maya', "Celui qui m'a construite. Et qui m'a donné mon nom.")], kw=NEON),
     B('cu', 3, [('elise', 'Il est vivant ?'), ('maya', 'Oui.'), ('elise', 'Où ?'), ('maya', 'Vous le trouverez. Vous le trouvez toujours.')], kw={'who': 'elise', **NEON}),
     B('cu', 3, [('nathan', 'Il peut nous aider ?'), ('maya', 'Il ne vous aidera pas.'), ('maya', 'Il a déjà choisi, une fois.')],
       kw={'who': 'nathan', **NEON}, mood='mystere'),
     B('cu', 4, [('elise', 'Choisi quoi ?'), ('elise', 'Choisi quoi ?', 'colere'), ('elise', 'Elle ne répond plus.', 'peur'),
                 ('elise', "Nathan. Ça fait cinq heures qu'on est là-dedans. On sort. Maintenant.")], kw={'who': 'elise', **NEON}, mood='peur'),
     B('photo_box', 4, [('nathan', 'Attends. Une seconde.')], lead=1.6)],

    # 2.6 Sortie, nuit — l'Inconnu (22:46)
    [B('sortie', 4, [('elise', "Il fait nuit. Il est quelle heure ?"), ('nathan', 'Onze heures moins le quart.')], lead=1.0),
     B('sms2', 4.5, lead=2.0),
     B('duo', 3, [('elise', '« Il dort mal. »'), ('elise', "Il sait de qui on parlait. Là-dessous. Il y a cinq minutes.", 'peur'),
                  ('nathan', 'Personne était avec nous.'), ('elise', 'À part elle.')], kw={'lum': 'pluie'}, mood='peur'),
     B('duo', 3, [('nathan', "Ou quelqu'un qui travaillait ici. Avec Aubrac. Quelqu'un qui sait ce qu'elle est."),
                  ('elise', "Quelqu'un qui écrit sans majuscules et qui a ton numéro."), ('nathan', 'Il nous aide.'), ('elise', "Pour l'instant.")],
       kw={'lum': 'pluie'}, mood='tension'),
     B('duo', 3, [('nathan', 'On va le voir. Aubrac.'), ('elise', "MAYA vient de dire qu'il nous aidera pas."),
                  ('nathan', "Justement. C'est la première chose qu'elle a pas envie qu'on fasse."), ('elise', '… Demain matin. Pas cette nuit.', 'fatigue')],
       kw={'lum': 'pluie'}, mood='tension')],

    # 2.7 La voiture — la photo (23:30)
    [B('car2', 3, [('elise', "Je conduis plus, j'ai les yeux qui piquent. Je te dépose et je rentre."), ('nathan', 'Ok.')], room='voiture'),
     B('car2', 3, [('nathan', 'Élise. Arrête-toi.', 'tension'), ('elise', "Quoi ? Qu'est-ce qu'il y a ?")], room='voiture'),
     B('photo_o8', 6, [('nathan', "Je l'ai prise en bas. Dans une boîte."), ('elise', '« Été deux mille dix. Essai quatorze. »'),
                       ('elise', "C'est l'anneau. La salle M.")], lead=1.2),
     B('photo_o8z', 5, [('nathan', "Lui, avec la barbe. C'est la voix de la cassette."), ('elise', 'Aubrac.'), ('nathan', 'Et elle…', 'sidere')]),
     B('car2', 3, [('nathan', "Elle, c'est ma mère.", 'tristesse'), ('nathan', "Et le petit, sur sa hanche. C'est moi.", 'tristesse'),
                   ('elise', 'Nathan…', 'douceur')], kw={'dome': True}, room='voiture', mood='intime'),
     B('car2', 3, [('nathan', "On m'a toujours dit qu'elle travaillait dans un bureau. Une assurance. Un truc comme ça."),
                   ('nathan', "Personne m'a jamais dit.", 'tristesse')], kw={'dome': True}, room='voiture', mood='intime'),
     B('car_nat', 4, [('nathan', 'Elle travaillait ici.', 'tristesse')], lead=1.4, room='voiture', flex=0),
     B('end2', 4, flex=0)],
]
DEFAUTS = [('labo', 'mystere'), ('labo', 'mystere'), ('labo', 'tension'), ('couloir', 'tension'), ('labo', 'tension'),
           ('exterieur', 'peur'), ('voiture', 'intime')]
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


# =================================================================== DÉCORS FIXES
random.seed(5)


def make_control_room():
    img = Image.new('RGB', (int(W * 1.3), int(H * 1.3)), (6, 12, 28))
    d = ImageDraw.Draw(img)
    w, h = img.size
    d.rectangle([180, 60, w - 180, 380], fill=(8, 22, 52))
    for r_ in range(12):
        x = 210 + r_ * ((w - 420) // 12)
        d.rectangle([x, 80, x + 70, 370], fill=(10, 14, 24))
    d.rectangle([180, 60, w - 180, 380], outline=(40, 44, 54), width=8)
    d.polygon([(120, 520), (w - 120, 520), (w - 260, 440), (260, 440)], fill=(36, 38, 44))
    for i, x in enumerate((420, 600, 1000, 1180)):
        d.rectangle([x, 330, x + 150, 440], fill=(20, 22, 26))
        d.rectangle([x + 10, 340, x + 140, 430], fill=(4, 6, 10))
    d.line([(860, 440), (860, 360)], fill=(80, 80, 86), width=4)
    d.ellipse([845, 330, 875, 365], fill=(50, 50, 56))
    d.ellipse([890, 410, 910, 430], fill=(30, 30, 34))
    return img


CONTROL = make_control_room()
LEDS = [(random.randint(200, int(W * 1.3) - 220), random.randint(85, 365), random.uniform(0.5, 3)) for _ in range(220)]


def make_archives():
    """Allée d'archives en perspective : étagères métalliques, classeurs, bandes, néons."""
    img = vgrad(W, H, (30, 34, 34), (14, 16, 16))
    d = ImageDraw.Draw(img)
    vx, vy = 640, 230
    d.polygon([(0, H), (W, H), (vx + 40, vy + 40), (vx - 40, vy + 40)], fill=(26, 28, 28))  # sol
    for side in (-1, 1):
        for k in range(14):
            p0, p1 = k / 14, (k + 1) / 14
            x0 = vx + side * (640 - 600 * p0 ** 0.7)
            x1 = vx + side * (640 - 600 * p1 ** 0.7)
            top0, top1 = 40 + 170 * p0 ** 0.7, 40 + 170 * p1 ** 0.7
            bot0, bot1 = H - 30 - 260 * p0 ** 0.7, H - 30 - 260 * p1 ** 0.7
            d.polygon([(x0, top0), (x1, top1), (x1, bot1), (x0, bot0)], fill=(44, 48, 50))
            for j in range(5):
                yy0 = top0 + (bot0 - top0) * j / 5
                yy1 = top1 + (bot1 - top1) * j / 5
                d.line([(x0, yy0), (x1, yy1)], fill=(70, 74, 76), width=2)
                rr = random.Random(k * 10 + j + (side > 0) * 500)
                for q in range(4):
                    a = q / 4 + rr.uniform(0, 0.15)
                    xx = x0 + (x1 - x0) * a
                    ytop = yy0 + (yy1 - yy0) * a
                    hh = (bot0 - top0) / 5 * 0.8 * (1 - a * 0.1)
                    col = rr.choice([(120, 112, 90), (70, 84, 110), (110, 60, 50), (150, 146, 136), (40, 40, 44)])
                    d.rectangle([xx, ytop + 4, xx + max(3, abs(x1 - x0) * 0.18), ytop + hh], fill=col)
    for k in range(5):  # néons au plafond
        p = k / 5
        y = 30 + 150 * p ** 0.8
        hw = 160 * (1 - p ** 0.8) + 10
        d.rectangle([vx - hw, y, vx + hw, y + 8 * (1 - p) + 2], fill=(220, 235, 230))
    return img


ARCHIVES = make_archives()


def make_ring_room():
    """Salle M : anneau vertical de 3 m (bobines de cuivre, céramique blanche), chaise, brûlure en étoile."""
    img = vgrad(W, H, (16, 16, 20), (8, 8, 10))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 48):  # tuiles absorbantes
        for y in range(0, 380, 48):
            d.polygon([(x, y), (x + 24, y + 24), (x, y + 48)], fill=(22, 22, 26))
    d.rectangle([0, 380, W, H], fill=(28, 28, 30))
    cx, cy, R = 640, 230, 190
    for k in range(48):
        a = 2 * math.pi * k / 48
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        col = (176, 104, 56) if k % 2 == 0 else (226, 222, 214)
        d.ellipse([x - 22, y - 22, x + 22, y + 22], fill=col, outline=(60, 40, 30))
    d.ellipse([cx - R + 30, cy - R + 30, cx + R - 30, cy + R - 30], outline=(90, 60, 40), width=6)
    d.rectangle([cx - 30, cy + R - 10, cx + 30, cy + R + 30], fill=(60, 60, 64))  # socle
    # brûlure en étoile sous l'anneau
    star = Image.new('L', (W, H))
    sd = ImageDraw.Draw(star)
    for k in range(11):
        a = 2 * math.pi * k / 11 + 0.3
        L_ = random.uniform(140, 300)
        sd.polygon([(cx, 470), (cx + L_ * math.cos(a), 470 + L_ * 0.25 * math.sin(a)), (cx + 30 * math.cos(a + 0.4), 470 + 8 * math.sin(a + 0.4))], fill=200)
    sd.ellipse([cx - 90, 450, cx + 90, 490], fill=255)
    star = star.filter(ImageFilter.GaussianBlur(6))
    img = Image.composite(Image.new('RGB', (W, H), (6, 6, 6)), img, star)
    d = ImageDraw.Draw(img)
    # chaise métallique au centre
    d.rectangle([cx - 34, 380, cx + 34, 392], fill=(120, 124, 128))
    d.rectangle([cx - 34, 300, cx - 26, 392], fill=(110, 114, 118))
    d.rectangle([cx + 26, 300, cx + 34, 392], fill=(110, 114, 118))
    d.rectangle([cx - 34, 300, cx + 34, 312], fill=(110, 114, 118))
    for x in (cx - 30, cx + 26):
        d.rectangle([x, 392, x + 5, 470], fill=(100, 104, 108))
    return img


RING = make_ring_room()


def make_photo_o8(w=640, h=460):
    """Photo O8, été 2010 : Gabriel, Claire tenant Nathan (3 ans), et quatre chercheurs devant l'anneau."""
    img = vgrad(w, h, (176, 170, 160), (130, 126, 120))
    d = ImageDraw.Draw(img)
    cx, cy, R = w // 2, 150, 120
    for k in range(36):
        a = 2 * math.pi * k / 36
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=(170, 110, 70) if k % 2 == 0 else (225, 220, 210))
    d.rectangle([0, 330, w, h], fill=(120, 116, 110))
    people = [(70, 'x', (60, 66, 80)), (165, 'gabriel2010', None), (300, 'claire', None), (430, 'x', (90, 80, 70)), (530, 'x', (70, 70, 74)), (610, 'x', (110, 100, 96))]
    for x, who, col in people:
        if who == 'x':
            d.rounded_rectangle([x - 34, 250, x + 34, h], radius=18, fill=(228, 230, 232))
            d.ellipse([x - 24, 192, x + 24, 246], fill=(214, 188, 170))
            d.chord([x - 26, 188, x + 26, 222], 180, 360, fill=col)
        else:
            bust(img, x, 230, 0.36, who, light=(1.0, 0.98, 0.95))
    # Nathan, 3 ans, sur la hanche de Claire
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([330, 300, 380, 360], radius=12, fill=(60, 90, 140))
    d.ellipse([334, 262, 374, 304], fill=(232, 206, 188))
    d.chord([332, 258, 376, 286], 180, 360, fill=(80, 58, 40))
    d.ellipse([345, 278, 350, 283], fill=(90, 110, 100)); d.ellipse([358, 278, 363, 283], fill=(90, 110, 100))
    img = grade(img, (1.05, 0.98, 0.86))  # tirage jauni
    return img


PHOTO_O8 = make_photo_o8()

# =================================================================== OUTILS DE PLAN
LUM = {'bleu': (0.45, 0.62, 1.15), 'neon': (0.86, 0.95, 0.92), 'anneau': (0.95, 0.72, 0.6), 'pluie': (0.95, 0.72, 0.5)}
FOND = {'bleu': (6, 16, 40), 'neon': (30, 34, 34), 'anneau': (20, 16, 18), 'pluie': (24, 20, 22)}


def blink_at(t, seed=0):
    return (t * 0.31 + seed * 0.17) % 4.1 < 0.12


def m(who, f):
    a = MOUTH.get(who)
    return float(a[f]) if a is not None and f < len(a) else 0.0


def backdrop(lum, T, f):
    if lum == 'bleu':
        br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)  # la lumière respire quand MAYA parle
        img = Image.new('RGB', (W, H), tuple(int(c * br) for c in FOND['bleu']))
        d = ImageDraw.Draw(img)
        for x, y, s in LEDS[:120]:
            if math.sin(T * s + x) > -0.3:
                d.rectangle([x % W, y % 170, x % W + 3, y % 170 + 3], fill=(60, 140, 255))
        return img.filter(ImageFilter.GaussianBlur(2)), tuple(c * br for c in LUM['bleu'])
    if lum == 'neon':
        img = ARCHIVES.filter(ImageFilter.GaussianBlur(9))
        img = grade(img, (0.8, 0.85, 0.85))
        return img, LUM['neon']
    if lum == 'anneau':
        img = RING.filter(ImageFilter.GaussianBlur(10))
        return grade(img, (1.1, 0.9, 0.85)), LUM['anneau']
    img = vgrad(W, H, (40, 30, 24), (14, 12, 14))
    rain(img, 150, (110, 100, 90), seed=f)
    return img, LUM['pluie']


def shot_carton(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if 0.5 <= t < dur - 0.6:
        d = ImageDraw.Draw(img)
        text_c(d, 230, 'PARTIE 2', SANS_S, (140, 140, 140))
        text_c(d, 262, 'LA DÉCOUVERTE DE MAYA', TITLE, (230, 230, 230))
    return img


def maya_screen(T, txt, n, f=0):
    br = 1 + 0.04 * math.sin(T * 1.6) + 0.10 * m('maya', f)
    img = Image.new('RGB', (W, H), tuple(int(c * br) for c in (6, 16, 40)))
    d = ImageDraw.Draw(img)
    for x, y, s in LEDS[:90]:
        if math.sin(T * s + x) > -0.3:
            d.rectangle([x % W, y % 160, x % W + 3, y % 160 + 3], fill=(60, 140, 255))
    d.rectangle([250, 170, 1030, 500], fill=(2, 3, 5), outline=(40, 44, 52), width=10)
    lines = txt.split('\n')
    shown, k = [], max(0, n)
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


def shot_c_cursor(t, dur, T, f, kw):
    img = maya_screen(T, 'BONJOUR NATHAN.', 99, f)
    z = 1 + 0.05 * t / dur
    return img.crop((int(W * (z - 1) / 2), int(H * (z - 1) / 2), int(W - W * (z - 1) / 2), int(H - H * (z - 1) / 2))).resize((W, H))


def shot_pupitre(t, dur, T, f, kw):
    return maya_screen(T, kw.get('txt', ''), int((t - 0.4) * 8), f)


def shot_duo(t, dur, T, f, kw):
    lum = kw.get('lum', 'bleu')
    img, light = backdrop(lum, T, f)
    sp = speaker_at(T)
    dim = lambda w: tuple(c * (1.0 if sp == w else 0.82) for c in light)
    bust(img, 470, 225, 1.0, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=dim('nathan'),
         look=(0.6 if sp == 'elise' else 0, 0), hood=lum == 'pluie')
    bust(img, 840, 240, 0.95, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=dim('elise'),
         look=(-0.6 if sp == 'nathan' else 0, 0))
    if lum == 'pluie':
        rain(img, 90, (120, 110, 100), seed=f + 7)
    return img


def shot_cu(t, dur, T, f, kw):
    who = kw.get('who', 'nathan')
    lum = kw.get('lum', 'bleu')
    img, light = backdrop(lum, T, f)
    other = 'elise' if who == 'nathan' else 'nathan'
    x_main, x_other = (560, 1110) if who == 'nathan' else (720, 170)
    bust(img, x_other, 270, 0.8, other, mouth=m(other, f), blink=blink_at(T, 3), light=tuple(c * 0.55 for c in light),
         look=(1 if x_other < 640 else -1, 0))
    img = Image.composite(img.filter(ImageFilter.GaussianBlur(5)), img, Image.new('L', (W, H), 255))
    bust(img, x_main, 215, 1.2, who, mouth=m(who, f), blink=blink_at(T, 6 if who == 'nathan' else 5), light=light,
         look=(0.3 if who == 'nathan' else -0.3, 0))
    return img


def shot_poche(t, dur, T, f, kw):
    img, light = backdrop('bleu', T, f)
    d = ImageDraw.Draw(img)
    ciré = tint(REF['elise']['top'], light)
    d.rounded_rectangle([300, 140, 980, H + 40], radius=60, fill=ciré)
    d.rectangle([520, 300, 760, 312], fill=tint((150, 110, 25), light))  # rabat de poche
    p = min(1, max(0, (t - 0.6) / 1.6))
    y = 330 - 210 * p
    d.rectangle([622, y, 638, y + 160], fill=tint((70, 70, 72), light))  # crayon gris
    d.polygon([(622, y), (638, y), (630, y - 24)], fill=tint((200, 170, 130), light))
    d.text((626, y + 60), 'HB', font=MONO_XS, fill=tint((200, 200, 200), light))
    d.ellipse([590, y + 120, 690, y + 200], fill=tint(REF['elise']['skin'], light))  # main
    return img


def shot_bascule(t, dur, T, f, kw):
    """Une carte du monde faite de lumières de villes, qui s'éteignent par vagues."""
    img = Image.new('RGB', (W, H), (3, 5, 10))
    d = ImageDraw.Draw(img)
    p = t / dur
    rr = random.Random(41)
    for k in range(900):
        lon = rr.uniform(-1, 1); lat = rr.uniform(-0.55, 0.75)
        land = (math.sin(lon * 5.3) + math.cos(lat * 6.1 + lon * 2.0) + rr.uniform(-0.6, 0.6)) > 0.2
        if not land:
            continue
        x, y = 640 + lon * 560, 260 - lat * 300
        off_t = 0.25 + 0.7 * ((lon + 1) / 2 * 0.6 + rr.uniform(0, 0.4))
        on = p < off_t
        c = (240, 190, 110) if on else (30, 26, 22)
        d.rectangle([x, y, x + 2, y + 2], fill=c)
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    img = glow(img, [80, 40, 1200, 480], (30, 22, 10), 60, 0.4 * (1 - p))
    d = ImageDraw.Draw(img)
    d.text((70, 470), '07/11/2041  02:00', font=MONO_S, fill=(200, 205, 215))
    return img


def shot_fichier(t, dur, T, f, kw):
    img = vgrad(W, H, (208, 212, 220), (180, 186, 196))
    d = ImageDraw.Draw(img)
    d.rectangle([150, 90, 1130, 450], fill=(236, 238, 242), outline=(140, 144, 150), width=2)
    d.text((170, 100), 'Propriétés — 847.mov', font=SANS_B, fill=(20, 20, 24))
    rows = [('Type :', 'Fichier vidéo (.mov)'), ('Taille :', '0 octet'), ('Créé le :', '07/11/2041  02:17')]
    for i, (a, b) in enumerate(rows):
        d.text((200, 170 + i * 60), a, font=SANS, fill=(40, 40, 44))
        d.text((480, 170 + i * 60), b, font=SANS, fill=(150, 20, 20) if i else (40, 40, 44))
    z = 1 + 0.6 * min(1, t / dur)
    cx, cy = 300, 115
    img = img.crop((int(cx - W / z / 2 + 180), int(cy - H / z / 2 + 120), int(cx + W / z / 2 + 180), int(cy + H / z / 2 + 120))).resize((W, H))
    return fade(img, t / 0.3)


def neon_flicker(T, start):
    k = T - start
    return 1.0 if k > 1.6 or (k > 0.3 and int(k * 13) % 3) else 0.15


def shot_escalier2(t, dur, T, f, kw):
    img = vgrad(W, H, (40, 42, 42), (20, 22, 22))
    d = ImageDraw.Draw(img)
    for k in range(8):
        d.polygon([(0, 300 + k * 30), (W, 200 + k * 30), (W, 230 + k * 30), (0, 330 + k * 30)], fill=(30 + k, 32 + k, 32 + k))
    d.text((180, 110), '▼ NIVEAU -2 — ARCHIVES — SALLE M', font=font('DejaVuSans-Bold.ttf', 34), fill=(200, 196, 186))
    img = grade(img, (neon_flicker(T, shots('escalier2')[0][0]) * 0.9,) * 3)
    body(img, 520 + t * 30, 520, 1.15, 'nathan', phase=t * 5, walking=True, light=(0.6, 0.66, 0.66))
    body(img, 400 + t * 30, 520, 1.1, 'elise', phase=t * 5 + 1, walking=True, light=(0.66, 0.66, 0.62))
    return img


def shot_archives(t, dur, T, f, kw):
    p = t / dur
    z = 1 + 0.12 * p
    img = ARCHIVES.crop((int(W * (z - 1) / 2), int(H * (z - 1) / 2), int(W - W * (z - 1) / 2), int(H - H * (z - 1) / 2))).resize((W, H))
    if kw.get('tv'):
        d = ImageDraw.Draw(img)
        d.rectangle([860, 300, 1080, 470], fill=(30, 30, 32))  # téléviseur et magnétoscope
        d.rectangle([880, 315, 1060, 430], fill=(14, 18, 20))
        d.rectangle([870, 470, 1070, 500], fill=(26, 26, 28))
        d.rectangle([900, 480, 990, 486], fill=(8, 8, 8))
        d.text((1000, 476), '00:00', font=MONO_XS, fill=(80, 220, 120))
    body(img, 560 + 40 * p, 535, 1.25, 'nathan', phase=t * 4, walking=p < 0.6, light=(0.75, 0.82, 0.82))
    body(img, 420 + 30 * p, 535, 1.2, 'elise', phase=t * 4 + 1, walking=p < 0.6, light=(0.8, 0.82, 0.78))
    return img


def shot_classeurs(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (40, 44, 46))
    d = ImageDraw.Draw(img)
    labels = ['PROJET MIROIR — ESSAIS 1-9', 'PROJET MIROIR — ESSAIS 10-17', 'RAPPORT 41', 'PROTOCOLE ARIANE — CONFIDENTIEL',
              'ARCHE — SITE B — CHANTIER', 'INTERFACE NEURALE — 2010']
    off = int(-t * 22)
    for i, lb in enumerate(labels):
        x = 100 + i * 190 + off
        col = [(120, 112, 90), (120, 112, 90), (110, 60, 50), (70, 84, 110), (60, 70, 60), (120, 112, 90)][i]
        d.rectangle([x, 40, x + 160, 520], fill=col, outline=(30, 30, 30), width=3)
        d.ellipse([x + 60, 420, x + 100, 460], outline=(30, 30, 30), width=3)
        lab = Image.new('RGB', (420, 40), (232, 228, 214))
        ImageDraw.Draw(lab).text((10, 8), lb, font=SANS_S, fill=(20, 20, 24))
        lab = lab.rotate(90, expand=True)
        img.paste(lab, (x + 60, 60))
    return grade(img, (0.95, 1.0, 1.0))


def arche_logo(d, cx, cy, r, col, w=6):
    d.arc([cx - r, cy - r, cx + r, cy + r], 120, 420, fill=col, width=w)  # cercle ouvert en bas
    d.line([(cx - r - 20, cy), (cx + r + 20, cy)], fill=col, width=w)


def shot_plans(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (26, 52, 92))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=(36, 64, 104))
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=(36, 64, 104))
    for k in range(5):  # galeries voûtées en plan
        d.rectangle([520, 80 + k * 80, 1180, 120 + k * 80], outline=(200, 216, 236), width=2)
        for j in range(16):
            d.rectangle([540 + j * 40, 88 + k * 80, 560 + j * 40, 112 + k * 80], outline=(150, 170, 200))
    arche_logo(d, 250, 230, 110, (230, 236, 246))
    d.text((120, 400), 'PROJET ARCHE — SITE B', font=SANS_B, fill=(230, 236, 246))
    d.text((120, 434), 'Plan des galeries — 2010 — confidentiel', font=SANS_S, fill=(190, 204, 226))
    z = 1 + 0.1 * t / dur
    img = img.crop((0, 0, int(W / z), int(H / z))).resize((W, H))
    return grade(img, (0.85, 0.92, 0.95))


def essai14_frame(t, T, f, paused=False):
    """Vidéo d'archive 4:3 sur un vieux téléviseur : l'anneau, Gabriel jeune ; Claire de dos, floue."""
    vw, vh = 640, 480
    v = vgrad(vw, vh, (150, 156, 150), (100, 104, 100))
    d = ImageDraw.Draw(v)
    cx, cy, R = 330, 200, 150
    for k in range(40):
        a = 2 * math.pi * k / 40
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=(170, 110, 70) if k % 2 == 0 else (225, 220, 210))
    body(v, 120, 470, 1.2, 'claire', light=(0.9, 0.9, 0.9))  # de dos, au bord du cadre
    bust(v, 470, 230, 0.75, 'gabriel2010', mouth=0.0 if paused else m('gabriel', f), blink=blink_at(T, 2), look=(-0.6, 0))
    d = ImageDraw.Draw(v)
    d.text((20, 440), '12/07/2010  14:32:%02d' % (7 + int(t) % 50), font=MONO_S, fill=(255, 250, 220))
    if paused:
        d.text((20, 20), '❚❚ PAUSE', font=MONO_S, fill=(255, 250, 220))
    v = v.resize((vw // 2, vh // 2)).resize((vw, vh), Image.BILINEAR)
    a = np.asarray(v, np.float32)
    a[::3] *= 0.75  # lignes de balayage
    a += np.random.default_rng(f).normal(0, 8, a.shape)
    v = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    out = Image.new('RGB', (W, H), (8, 8, 9))
    od = ImageDraw.Draw(out)
    od.rounded_rectangle([290, 10, 990, 530], radius=40, fill=(34, 34, 36))
    out.paste(v.resize((620, 470)), (330, 30))
    return glow(out, [330, 30, 950, 500], (60, 70, 70), 50, 0.5)


def shot_essai14(t, dur, T, f, kw):
    return essai14_frame(t, T, f, paused=t > dur - 1.2)


def shot_couloir_m(t, dur, T, f, kw):
    img = vgrad(W, H, (26, 26, 28), (12, 12, 14))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 0), (420, 150), (420, 400), (0, H)], fill=(30, 30, 32))
    d.polygon([(W, 0), (860, 150), (860, 400), (W, H)], fill=(30, 30, 32))
    d.rectangle([520, 150, 760, 400], fill=(54, 54, 58), outline=(90, 90, 96), width=6)  # porte
    d.text((600, 180), 'SALLE M', font=SANS_B, fill=(210, 206, 196))
    d.text((560, 220), 'MIROIR — ACCÈS ÉQUIPE 1', font=SANS_S, fill=(170, 166, 156))
    open_ = min(1, max(0, (t - 1.5) / 2))
    d.rectangle([520, 150, 520 + int(240 * open_), 400], fill=(120, 80, 50))
    img = glow(img, [520, 150, 520 + int(240 * open_), 400], (110, 60, 30), 50, 0.8 * open_)
    body(img, 600, 520, 1.2, 'nathan', light=(0.5, 0.48, 0.46))
    body(img, 480, 520, 1.15, 'elise', light=(0.55, 0.5, 0.45))
    return img


def shot_salle_m(t, dur, T, f, kw):
    p = t / dur
    z = 1 + 0.18 * p
    img = RING.crop((int(W * (z - 1) / 2), int(H * (z - 1) * 0.35), int(W - W * (z - 1) / 2), int(H * (z - 1) * 0.35 + H / z))).resize((W, H))
    pulse = 0.5 + 0.5 * math.sin(T * 0.9)
    img = glow(img, [440, 30, 840, 430], (40, 70, 140), 70, 0.25 + 0.15 * pulse)  # reflet bleu, lointain
    body(img, 360, 540, 1.3, 'nathan', light=(0.5, 0.45, 0.45), facing=-1)
    body(img, 230, 540, 1.25, 'elise', light=(0.55, 0.48, 0.42), facing=-1)
    return fade(img, t / 0.8)


def shot_chaise(t, dur, T, f, kw):
    z = 2.2 + 0.25 * t / dur
    cx, cy = 640, 400
    img = RING.crop((int(cx - W / z / 2), int(cy - H / z / 2), int(cx + W / z / 2), int(cy + H / z / 2))).resize((W, H))
    sweep = math.sin(t * 0.8)
    lay = Image.new('L', (W, H))
    ImageDraw.Draw(lay).ellipse([400 + sweep * 200, 150, 900 + sweep * 200, 520], fill=200)
    return Image.composite(grade(img, (1.9, 1.8, 1.7)), img, lay.filter(ImageFilter.GaussianBlur(50)))


def cycles_text(n_done, final=False, maya=''):
    img = Image.new('RGB', (W, H), (3, 4, 6))
    d = ImageDraw.Draw(img)
    rows = [f'CYCLE {k:03d}  —  TERMINÉ' for k in range(max(1, n_done - 9), n_done + 1)]
    if final:
        rows.append('CYCLE 848  —  NON INITIALISÉ')
    y = 40
    for i, r_ in enumerate(rows[-11:]):
        last = final and i == len(rows[-11:]) - 1
        d.text((260, y), r_, font=MONO, fill=(255, 255, 255) if last else (150, 156, 160))
        y += 40
    if maya:
        d.text((260, y + 20), maya, font=MONO, fill=(225, 228, 230))
        y += 60
    return img, d, y


def shot_cycles(t, dur, T, f, kw):
    run = max(0.0, t - 2.0)
    n = min(847, int(1 + 847 * (run / max(0.5, dur - 3.2)) ** 2.2))
    img, d, y = cycles_text(n, final=n >= 847 and t > dur - 1.0)
    if t < 2.0:  # le terminal vu de loin, sur une table
        base, _ = backdrop('neon', T, f)
        small = img.resize((W // 3, H // 3))
        base.paste(small, (430, 160))
        return glow(base, [430, 160, 430 + W // 3, 160 + H // 3], (60, 70, 80), 30, 0.5)
    return img


def shot_cycles_end(t, dur, T, f, kw):
    st = line_time("Que celui-ci ne m'appartient pas encore.")[0]
    txt = "QUE CELUI-CI NE M'APPARTIENT PAS ENCORE."
    k = int((T - st) * 16)
    img, d, y = cycles_text(847, final=True, maya=txt[:max(0, k)])
    if int(T * 3) % 2 == 0:
        cx = 260 + d.textlength(txt[:max(0, k)], font=MONO)
        d.rectangle([cx + 4, y - 38, cx + 20, y - 8], fill=(225, 228, 230))
    br = 1 + 0.06 * math.sin(T * 1.6) + 0.12 * m('maya', f)
    return grade(img, (br, br, br * 1.05))


def shot_dossier(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (44, 46, 46))
    d = ImageDraw.Draw(img)
    d.rectangle([300, 20, 980, 560], fill=(232, 228, 216))
    d.text((340, 50), 'LABORATOIRE ORPHÉE', font=SANS_B, fill=(30, 30, 34))
    d.text((340, 84), "PROJET MIROIR — FICHE D'ESSAI N° 14", font=SANS, fill=(30, 30, 34))
    for i, (a, b) in enumerate([('Date :', '12 juillet 2010'), ('Charge utile :', '64 octets'), ('Décalage mesuré :', '- 0,3 s'),
                                ('Résultat :', 'RÉCEPTION AVANT ÉMISSION')]):
        d.text((340, 140 + i * 36), a, font=SANS_S, fill=(60, 60, 64))
        d.text((560, 140 + i * 36), b, font=SANS_S, fill=(30, 30, 34))
    d.text((340, 330), 'Directeur scientifique : Pr Gabriel AUBRAC', font=SANS, fill=(30, 30, 34))
    d.line([(560, 380), (600, 360), (620, 390), (660, 350), (700, 385), (760, 370)], fill=(30, 40, 110), width=3)  # signature
    d.text((340, 430), 'Interface neurale : C. M.', font=SANS_S, fill=(60, 60, 64))
    z = 1 + 0.5 * min(1, t / dur)
    cx, cy = 560, 340
    img = img.crop((int(cx - W / z / 2), int(cy - H / z / 2), int(cx + W / z / 2), int(cy + H / z / 2))).resize((W, H))
    return grade(img, (0.85, 0.92, 0.92))


def shot_photo_box(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (40, 44, 44))
    d = ImageDraw.Draw(img)
    d.rectangle([380, 220, 900, 520], fill=(110, 112, 110), outline=(70, 70, 70), width=6)  # boîte en fer
    for k in range(5):
        d.rectangle([410 + k * 8, 200 - k * 6, 760 + k * 8, 420 - k * 6], fill=(200 - k * 8, 196 - k * 8, 186 - k * 8))
    p = min(1, max(0, (t - 1.2) / 1.5))
    ph = PHOTO_O8.resize((300, 216)).rotate(-8 * p, expand=True, fillcolor=(40, 44, 44))
    img.paste(ph, (int(450 + 200 * p), int(160 - 260 * p)))
    d = ImageDraw.Draw(img)
    d.ellipse([int(560 + 200 * p), int(250 - 260 * p), int(660 + 200 * p), int(330 - 260 * p)], fill=tint(REF['nathan']['skin'], (0.8, 0.82, 0.82)))
    d.rectangle([int(600 + 200 * p), int(320 - 260 * p), int(700 + 200 * p), H], fill=(70, 78, 50))  # manche de la parka kaki
    return grade(img, (0.85, 0.95, 0.95))


def make_lab_ext():
    img = vgrad(W, H, (10, 12, 20), (20, 22, 28))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 380, W, H], fill=(18, 18, 20))
    d.rectangle([330, 150, 980, 400], fill=(58, 58, 60))
    for k in range(3):
        for j in range(8):
            d.rectangle([360 + j * 76, 180 + k * 70, 410 + j * 76, 220 + k * 70], fill=(30, 32, 34))
    d.rectangle([420, 120, 890, 148], fill=(46, 46, 48))
    d.text((432, 124), 'LABORATOIRE ORPHÉE — CENTRE DE RECHERCHE APPLIQUÉE', font=SANS_S, fill=(140, 140, 132))
    for x in range(0, W, 26):
        d.line([(x, 330), (x, 440)], fill=(60, 62, 64), width=1)
    d.line([(0, 330), (W, 330)], fill=(70, 72, 74), width=3)
    d.rectangle([150, 360, 260, 400], fill=(150, 30, 30)); d.text((156, 370), 'DANGER', font=SANS_S, fill=(230, 220, 210))
    return img


LAB_EXT = make_lab_ext()


def shot_sortie(t, dur, T, f, kw):
    img = LAB_EXT.copy()
    d = ImageDraw.Draw(img)
    d.rectangle([900, 330, 940, 400], fill=(20, 40, 90))  # la porte est, encore entrouverte
    img = glow(img, [900, 330, 940, 400], (30, 60, 140), 30, 0.7)
    p = t / dur
    body(img, 880 - 260 * p, 540, 1.25, 'nathan', phase=t * 5, walking=True, light=(0.5, 0.5, 0.56), facing=-1)
    body(img, 980 - 260 * p, 540, 1.2, 'elise', phase=t * 5 + 1, walking=True, light=(0.6, 0.56, 0.5), facing=-1)
    rain(img, 230, (90, 95, 110), seed=f)
    return img


def phone_frame(lines):
    img = vgrad(W, H, (10, 12, 18), (4, 4, 8))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([450, 20, 830, 560], radius=40, fill=(12, 12, 14), outline=(60, 60, 66), width=4)
    d.rectangle([470, 60, 810, 540], fill=(236, 236, 240))
    d.line([(760, 60), (810, 110)], fill=(150, 150, 155), width=2)  # fissure
    y = 80
    for who, txt in lines:
        tw = min(320, d.textlength(txt, font=SANS_S) + 24)
        d.rounded_rectangle([480, y, 480 + tw, y + 34], radius=14, fill=(210, 210, 216))
        d.text((492, y + 8), txt, font=SANS_S, fill=(20, 20, 24))
        y += 46
    return img


def shot_sms2(t, dur, T, f, kw):
    msgs = [('x', 'Inconnu — 22:46')]
    if t > 1.8:
        msgs += [('x', 'péniche constance.'), ('x', "quai de la gare d'eau."), ('x', 'il dort mal.')]
    img = phone_frame(msgs)
    rain(img, 60, (80, 84, 96), seed=f)
    return grade(img, (0.85, 0.85, 0.9))


def shot_car2(t, dur, T, f, kw):
    img = vgrad(W, H, (34, 30, 30), (12, 12, 16))
    rain(img, 140, (80, 90, 110), seed=f, angle=-2)
    dome = kw.get('dome')
    sl = (T * 0.8) % 1
    lk = 0.7 + 0.4 * max(0, 1 - abs(sl - 0.5) * 6)
    if dome:
        lk = 1.0
    sp = speaker_at(T)
    col = (lk, lk * 0.85, lk * 0.7) if dome else (lk, lk * 0.8, lk * 0.6)
    bust(img, 400, 250, 0.95, 'elise', mouth=m('elise', f), blink=blink_at(T, 5), light=col, look=(1 if sp == 'nathan' else -0.3, 0))
    bust(img, 880, 260, 0.95, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=tuple(c * 0.9 for c in col),
         look=(-1 if sp == 'elise' else 0, 0.6 if dome else 0.3))
    if not dome:
        a = math.sin(T * 3.0)
        lay = Image.new('L', (W, H), 0)
        ImageDraw.Draw(lay).line([(640, H + 40), (640 + 560 * math.sin(a), H + 40 - 560 * abs(math.cos(a)))], fill=90, width=4)
        img = Image.composite(Image.new('RGB', (W, H), (8, 8, 10)), img, lay.filter(ImageFilter.GaussianBlur(1.5)))
    else:
        img = glow(img, [560, 0, 720, 30], (120, 100, 70), 80, 0.6)  # plafonnier
    return img


def photo_back():
    img = Image.new('RGB', (640, 460), (226, 222, 210))
    d = ImageDraw.Draw(img)
    d.text((60, 150), 'Été 2010 — essai 14', font=font('DejaVuSerif-Italic.ttf', 40) if os.path.exists(FONT_DIR + 'DejaVuSerif-Italic.ttf') else SANS_B, fill=(40, 50, 110))
    d.text((60, 220), 'G., C. & N.', font=font('DejaVuSerif-Italic.ttf', 34) if os.path.exists(FONT_DIR + 'DejaVuSerif-Italic.ttf') else SANS_B, fill=(40, 50, 110))
    return img


PHOTO_BACK = photo_back()


def shot_photo_o8(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H), (30, 26, 22))
    flip = line_time("C'est l'anneau. La salle M.")[0] - 0.6 - shots('photo_o8')[0][0]
    card = PHOTO_BACK if t < flip else PHOTO_O8
    if abs(t - flip) < 0.3:  # on retourne la photo
        k = abs(t - flip) / 0.3
        card = card.resize((max(4, int(640 * k)), 460))
    img.paste(card.resize((int(card.size[0] * 0.95), int(460 * 0.95))), (640 - int(card.size[0] * 0.95) // 2, 50))
    return grade(img, (1.0, 0.9, 0.75))


def shot_photo_o8z(t, dur, T, f, kw):
    p = t / dur
    z = 1.6 + 1.0 * p
    cx = 165 + (330 - 165) * min(1, max(0, (p - 0.35) / 0.4))
    cy = 250
    w_, h_ = 640 / z, 640 / z * H / W
    crop = PHOTO_O8.crop((int(cx - w_ / 2), int(cy - h_ / 2), int(cx + w_ / 2), int(cy + h_ / 2))).resize((W, H), Image.BICUBIC)
    return grade(crop, (1.0, 0.92, 0.8))


def shot_car_nat(t, dur, T, f, kw):
    img = vgrad(W, H, (34, 30, 30), (12, 12, 16))
    rain(img, 80, (80, 90, 110), seed=f, angle=-2)
    bust(img, 640, 215, 1.25, 'nathan', mouth=m('nathan', f), blink=blink_at(T, 6), light=(0.95, 0.82, 0.68), look=(0, 0.7))
    img = glow(img, [560, 0, 720, 30], (120, 100, 70), 80, 0.6)
    k = max(0.0, (t - (dur - 1.0)) / 1.0)
    return fade(img, 1 - k)


def shot_end2(t, dur, T, f, kw):
    img = Image.new('RGB', (W, H))
    if t > 1.0:
        text_c(ImageDraw.Draw(img), 470, 'FIN DE LA PARTIE 2', SANS_S, (110, 110, 110))
    return img


# ---- jeu d'acteur : bouche, sourcils, inclinaison selon l'émotion
_bust_base = bust
CUR = {'f': 0, 'T': 0.0}
SOURCILS = {'peur': 0.9, 'surprise': 1.2, 'tristesse': 0.6, 'colere': -0.9, 'douceur': 0.25, 'sidere': 0.8,
            'ironie': 0.4, 'fatigue': -0.2, 'tension': -0.3, 'chuchote': 0.3, 'murmure': 0.3, 'joie': 0.5}
INCLINE = {'douceur': 6, 'tristesse': -5, 'ironie': 4, 'fatigue': -3}


def bust(img, cx, cy, s, who, mouth=0.0, **kw):
    f, T = CUR['f'], CUR['T']
    voice = 'gabriel' if who == 'gabriel2010' else who
    wd = getattr(tl, 'mouth_width', {}).get(voice)
    if wd is not None and f < len(wd) and mouth > 0.06:
        kw['mouth_w'] = float(wd[f])
    emo = tl.emotion_at(voice, T) if who in ('nathan', 'elise') else None
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
    if name not in ('carton', 'end2'):
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
    hum = (0.06 * np.sin(2 * np.pi * 50 * t) + 0.025 * np.sin(2 * np.pi * 100 * t)).astype(np.float32)
    fans = smooth_noise(n, 500, 3, lo=60) * 0.12
    geo = smooth_noise(n, 70, 4) * 0.5  # géothermie du -3, sentie plus qu'entendue
    neon = (0.02 * np.sin(2 * np.pi * 100 * t) + 0.01 * np.sin(2 * np.pi * 200 * t)).astype(np.float32)

    END_LAB = S[4][1]
    # salle C, puis niveau -2
    mx.bus['amb'] += (hum * 1.4 + fans * 1.2) * win(0, S[2][1], 1.5, 1.0)
    mx.bus['amb'] += (neon * 2.0 + fans * 0.6) * win(S[3][0], END_LAB, 1.0, 0.8)
    sm = shots('salle_m')[0]
    mx.bus['amb'] += geo * win(shots('couloir_m')[0][0], shots('cycles')[0][0] + 1, 2, 2)
    # extérieur et voiture
    mx.bus['amb'] += rain_out * win(S[5][0], S[5][1], 0.6, 0.4)
    eng = smooth_noise(n, 140, 5) * 0.55 + (0.12 * np.sin(2 * np.pi * 42 * t)).astype(np.float32)
    car_on = [s for s in tl.shots if s[2] in ('car2', 'photo_o8', 'photo_o8z', 'car_nat')]
    stop = line_time('Élise. Arrête-toi.')[1] + 1.0
    mx.bus['amb'] += (eng + rain_out * 0.5) * win(S[6][0], stop, 0.5, 1.5)
    mx.bus['amb'] += (rain_out * 0.6 + smooth_noise(n, 300, 8) * 0.15) * win(stop - 0.5, TOTAL - 4, 1.5, 3)
    for k in np.arange(S[6][0], stop, math.pi / 3.0):  # essuie-glaces
        mx.add('fx', smooth_noise(int(0.4 * SR), 1200, int(k), lo=200) * 0.06 * env_ramp(int(0.4 * SR), 0.15 * SR, 0.2 * SR), k)
    # ---- bruitages
    mx.add('fx', signal_motif(0.1), shots('carton')[0][0] + 0.6)
    porte = line_time('La porte est ouverte.')[1] + 0.3
    mx.add('fx', smooth_noise(int(0.25 * SR), 600, 30) * 0.5 * np.exp(-np.arange(int(0.25 * SR)) / 1500), porte)  # pêne
    mx.add('fx', smooth_noise(int(0.12 * SR), 2000, 31, lo=300) * 0.2 * np.exp(-np.arange(int(0.12 * SR)) / 500), porte + 0.18)
    esc = shots('escalier2')[0][0]
    for k in (0.3, 0.55, 0.9, 1.25):  # néons qui s'allument
        mx.add('fx', smooth_noise(int(0.05 * SR), 3000, int(k * 100), lo=500) * 0.15, esc + k)
    for name, step in (('escalier2', 0.55), ('archives', 0.7), ('sortie', 0.55)):
        for s in shots(name):
            for k in np.arange(s[0] + 0.2, s[1] - 0.3, step):
                x = smooth_noise(int(0.12 * SR), 500, int(k * 10)) * np.exp(-np.arange(int(0.12 * SR)) / (0.03 * SR)) * 0.22
                mx.add('fx', x.astype(np.float32), k)
    # magnétoscope : clac, chuintement de bande
    e14 = shots('essai14')[0]
    mx.add('fx', smooth_noise(int(0.15 * SR), 900, 32) * 0.4 * np.exp(-np.arange(int(0.15 * SR)) / 900), e14[0] + 0.2)
    mx.bus['fx'] += smooth_noise(n, 5000, 33, lo=1500) * 0.03 * win(e14[0] + 0.5, e14[1], 0.2, 0.1)
    bip = line_time('Départ… maintenant.')[1] + 0.2
    mx.add('fx', tone(1000, 0.15, 0.05), bip)
    # porte de la salle M, chaleur
    cm = shots('couloir_m')[0][0]
    mx.add('fx', smooth_noise(int(2.0 * SR), 300, 34) * 0.2 * env_ramp(int(2.0 * SR), 0.3 * SR, 1.0 * SR), cm + 1.5)
    # terminal des cycles : défilement
    cy = shots('cycles')[0]
    for k in np.arange(cy[0] + 2.0, cy[1] - 0.5, 0.09):
        mx.add('fx', tone(2400, 0.02, 0.008), k)
    # SMS de l'Inconnu : vibration + motif du Signal
    sm2 = shots('sms2')[0][0]
    buzz = (np.sin(2 * np.pi * 170 * np.arange(int(0.35 * SR)) / SR) * 0.18).astype(np.float32)
    mx.add('fx', fft_filter(buzz, hi=600), sm2 + 0.3)
    mx.add('fx', signal_motif(0.08), sm2 + 1.8)
    # voiture qui s'arrête : clignotant, frein à main
    mx.add('fx', smooth_noise(int(0.4 * SR), 600, 35) * 0.25 * env_ramp(int(0.4 * SR), 0.05 * SR, 0.3 * SR), stop - 0.4)
    for k in range(6):
        mx.add('fx', tone(1800, 0.03, 0.02), stop + 0.2 + k * 0.4)
    mx.add('fx', signal_motif(0.14), shots('end2')[0][0] + 0.8)
    # ---- musique (jamais sous les répliques clés de MAYA)
    pad = sum(np.sin(2 * np.pi * fq * t + 0.6 * np.sin(2 * np.pi * 0.21 * t * (i + 1))) for i, fq in enumerate((220.0, 261.63, 329.63, 392.0))).astype(np.float32) / 4
    pad = fft_filter(pad, hi=1500)
    mx.bus['mus'] += pad * 0.04 * win(shots('bascule')[0][0], S[1][1], 3, 3)
    cello = sum(np.sin(2 * np.pi * 73.42 * h * t + 0.25 * np.sin(2 * np.pi * 4.8 * t)) / h ** 1.3 for h in range(1, 6)).astype(np.float32)
    cello = fft_filter(cello, hi=900)
    mx.bus['mus'] += cello * 0.05 * (win(sm[0], shots('cycles')[0][0], 3, 2) + win(S[5][0], S[5][1], 2, 2))
    for k, base in enumerate(np.arange(shots('photo_o8z')[0][0], TOTAL - 6, 4.6)):  # piano : Nathan et Élise, sans résolution
        for j, fq in enumerate((293.66, 349.23, 440.0, 392.0)):
            mx.add('mus', piano(fq, 3.0, 0.06), base + j * 1.1)
    # ---- dialogues
    PAN = {'elise': -0.32, 'nathan': 0.30, 'maya': 0.0, 'gabriel': 0.1}
    for (st, en, w, txt, a_), room in zip(tl.lines, tl.room):
        x = a_.copy()
        pan = PAN.get(w, 0.0)
        shot = tl.shot_at(st + 0.05)[2]
        if w == 'maya':  # sèche, trop proche (bible 2.4)
            x = fft_filter(x, lo=90, hi=8000) * 1.05; room = 'sec'
        elif w == 'gabriel':  # bande vidéo de 2010
            x = fft_filter(x, lo=300, hi=3500) * 0.9; pan = 0.25; room = 'video'
        mx.add_voice(x.astype(np.float32), st, pan=pan, room=room)
    # silence sous les répliques clés de MAYA
    for key in ("Que celui-ci ne m'appartient pas encore.", 'Il a déjà choisi, une fois.', 'Huit cent quarante-sept fois.'):
        a, b = line_time(key)
        i0, i1 = int((a - 0.4) * SR), int((b + 0.8) * SR)
        mx.bus['mus'][i0:i1] = 0
        mx.bus['amb'][i0:i1] *= 0.3
    return mx.render()


if __name__ == '__main__':
    if '--plan' in sys.argv:
        dia = sum(len(l[4]) / SR for l in tl.lines)
        print(f'{len(tl.lines)} répliques, {dia:.0f} s de parole sur {TOTAL:.0f} s')
        for i, (a, b) in enumerate(S):
            print(f'  séquence 2.{i + 1} : {a:6.1f} → {b:6.1f}  ({b - a:5.1f} s)')
        sys.exit(0)
    import time
    t0 = time.time()
    wav = os.path.join(OUT, 'partie2_audio.wav')
    if not os.path.exists(wav):
        Mix.write(wav, build_audio())
    print('audio ok', round(time.time() - t0), 's', flush=True)
    vid = os.path.join(OUT, 'partie2_video.mp4')
    encode_chunks(frame, NF, vid, os.path.join(OUT, 'morceaux'))
    print('vidéo ok', round(time.time() - t0), 's', flush=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', vid, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                    '-t', str(TOTAL), '-movflags', '+faststart', os.path.join(OUT, 'LE_DERNIER_SIGNAL_partie2.mp4')], check=True)
    with open(os.path.join(OUT, 'partie2_montage.txt'), 'w') as fh:
        for s in tl.shots:
            fh.write(f'{s[0]:8.2f} {s[1]:8.2f}  {s[2]}\n')
        fh.write('\n')
        for st, en, w, txt, a_ in tl.lines:
            fh.write(f'{st:8.2f} {en:8.2f}  {w:7s} {txt}\n')
    print('fini', round(time.time() - t0), 's')
