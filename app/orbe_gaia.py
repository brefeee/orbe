"""1,8 milliard d'objets sans les stocker : le ciel est découpé en zones et chaque zone est lue en direct chez l'ESA.

Le numéro Gaia contient la position : source_id / 2^35 donne le pixel HEALPix (niveau 12, schéma « nested »).
"""
from __future__ import annotations

import csv
import io
import math
import re
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

TOTAL = 1_811_709_771
ARI = "https://gaia.ari.uni-heidelberg.de/tap/sync"
GAVO = "https://dc.g-vo.org/tap/sync"
LEAF = 12
STEP = 3  # chaque zone se divise en 4^3 = 64 zones
MAX_STARS = 500
TIMEOUT = 10
LIGHT_YEARS_PER_PC = 3.26156
CREDIT = "Source : ESA, mission Gaia, catalogue DR3 (licence CC BY-NC 3.0 IGO), lu via ARI Heidelberg ou GAVO."


def _compress(value: int) -> int:
    out = 0
    for bit in range(16):
        out |= ((value >> (2 * bit)) & 1) << bit
    return out


def center(level: int, pixel: int) -> tuple[float, float]:
    """Centre d'un pixel HEALPix nested, en degrés (ascension droite, déclinaison)."""
    nside = 1 << level
    face = pixel >> (2 * level)
    local = pixel & (nside * nside - 1)
    ix, iy = _compress(local), _compress(local >> 1)
    jr = (2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4)[face] * nside - ix - iy - 1
    if jr < nside:
        ring, z, shift = jr, 1 - jr * jr / (3 * nside * nside), 0
    elif jr > 3 * nside:
        ring = 4 * nside - jr
        z, shift = -1 + ring * ring / (3 * nside * nside), 0
    else:
        ring, z, shift = nside, (2 * nside - jr) * 2 / (3 * nside), (jr - nside) & 1
    jp = ((1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7)[face] * ring + ix - iy + 1 + shift) / 2
    if jp > 4 * nside:
        jp -= 4 * nside
    elif jp < 1:
        jp += 4 * nside
    phi = (jp - (shift + 1) * 0.5) * math.pi / (2 * ring)
    return math.degrees(phi), math.degrees(math.asin(z))


def _zone_name(level: int, pixel: int) -> str:
    ra, dec = center(level, pixel)
    digits = max(1, level // 3 + 1)  # plus la zone est petite, plus son nom doit être précis
    return f"Zone du ciel {ra / 15:.{digits}f} h, {dec:+.{digits}f}°"


def _zones(key: str, level: int, parent: int | None) -> list:
    if parent is None:
        children = [(0, p) for p in range(12)]
    else:
        count = 4 ** STEP
        children = [(level + STEP, (parent << (2 * STEP)) + i) for i in range(count)]
    return [{"i": f"{key}~{lv}-{p}", "n": _zone_name(lv, p), "a": f"gaia-{lv}-{p}",
             "t": [CREDIT, f"Une zone du ciel autour de l'ascension droite {center(lv, p)[0]:.1f}° et de la déclinaison {center(lv, p)[1]:+.1f}°. Ouvre-la pour descendre jusqu'aux étoiles."]}
            for lv, p in children]


def _number(value: float, digits: int = 0) -> str:
    text = f"{value:,.{digits}f}"
    return text.replace(",", " ").replace(".", ",")


def star_sheet(row: dict) -> list:
    """Écrit la fiche seulement avec ce qui a été mesuré : une valeur absente n'est jamais devinée."""
    ra, dec = row["ra"], row["dec"]
    lines = [f"Objet du catalogue Gaia, situé à l'ascension droite {ra:.5f}° et à la déclinaison {dec:+.5f}°. La plupart de ces objets sont des étoiles de notre galaxie, certains sont des galaxies lointaines ou des quasars."]
    parallax, quality = row.get("parallax"), row.get("parallax_over_error")
    if parallax and parallax > 0 and quality and quality >= 5:
        lines.append(f"Distance : environ {_number(1000 / parallax * LIGHT_YEARS_PER_PC)} années-lumière, calculée à partir de sa parallaxe (son léger déplacement apparent quand la Terre tourne autour du Soleil).")
    elif row.get("distance_gspphot"):
        lines.append(f"Distance : environ {_number(row['distance_gspphot'] * LIGHT_YEARS_PER_PC)} années-lumière, estimée d'après sa lumière. Cette valeur est moins sûre qu'une mesure de parallaxe.")
    else:
        lines.append("Distance : pas assez bien mesurée pour donner un chiffre fiable.")
    mag = row.get("phot_g_mean_mag")
    if mag is not None:
        seen = "visible à l'œil nu dans un ciel très noir" if mag < 6 else "visible avec des jumelles" if mag < 10 else "visible seulement avec un télescope"
        lines.append(f"Éclat vu depuis la Terre : magnitude {_number(mag, 2)}, {seen}. Plus ce nombre est petit, plus l'objet paraît brillant.")
    teff = row.get("teff_gspphot")
    if teff:
        lines.append(f"Température de surface estimée, si c'est bien une étoile : environ {_number(round(teff - 273, -2))} °C. Le Soleil est à environ 5 500 °C.")
    color = row.get("bp_rp")
    if color is not None:
        tint = "bleutée" if color < 0.5 else "blanche à jaune" if color < 1.2 else "orangée" if color < 2 else "rouge"
        lines.append(f"Couleur mesurée : {tint} (indice BP-RP {_number(color, 2)}). La poussière entre elle et nous peut la rougir.")
    if row.get("pmra") is not None and row.get("pmdec") is not None:
        lines.append(f"Déplacement dans le ciel : {_number(math.hypot(row['pmra'], row['pmdec']), 1)} millisecondes d'arc par an.")
    if row.get("radial_velocity") is not None:
        way = "se rapproche de nous" if row["radial_velocity"] < 0 else "s'éloigne de nous"
        lines.append(f"Vitesse le long de notre ligne de visée : elle {way} à {_number(abs(row['radial_velocity']), 1)} km/s.")
    lines.append(CREDIT)
    return lines[::-1]  # la carte affiche les informations de la dernière à la première


def _tap(url: str, adql: str) -> list | None:
    body = urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": adql}).encode()
    try:
        with urlopen(url, data=body, timeout=TIMEOUT) as res:
            text = res.read(50 * 1024 * 1024).decode("utf-8")
    except (URLError, OSError, UnicodeDecodeError):
        return None
    rows = list(csv.DictReader(io.StringIO(text)))
    if not text.startswith("source_id"):
        return None
    try:
        return [{k: (int(v) if k == "source_id" else float(v)) if v else None for k, v in row.items()} for row in rows]
    except (TypeError, ValueError):
        return None


def query_stars(low: int, high: int) -> list | None:
    where = f"source_id >= {low} AND source_id < {high} ORDER BY phot_g_mean_mag ASC"
    stars = _tap(ARI, f"SELECT TOP {MAX_STARS} source_id,ra,dec,parallax,parallax_over_error,pmra,pmdec,phot_g_mean_mag,bp_rp,radial_velocity,teff_gspphot,distance_gspphot FROM gaiadr3.gaia_source WHERE {where}")
    if stars is not None:
        return stars
    stars = _tap(GAVO, f"SELECT TOP {MAX_STARS} source_id,ra,dec,parallax,parallax_error,pmra,pmdec,phot_g_mean_mag,phot_bp_mean_mag,phot_rp_mean_mag,radial_velocity FROM gaia.dr3lite WHERE {where}")
    if stars is None:
        return None
    for s in stars:
        bp, rp, err = s.pop("phot_bp_mean_mag"), s.pop("phot_rp_mean_mag"), s.pop("parallax_error")
        s["bp_rp"] = bp - rp if bp is not None and rp is not None else None
        s["parallax_over_error"] = s["parallax"] / err if s["parallax"] is not None and err else None
    return stars


def _chain(level: int, pixel: int) -> list:
    """Les dossiers à ouvrir pour descendre jusqu'à une zone, depuis la carte."""
    steps = [f"gaia-{lv}-{pixel >> (2 * (level - lv))}" for lv in range(0, level + 1, STEP)]
    return ["univers", "gaia-root", *steps]


def _zone_id(level: int, pixel: int) -> str:
    parent = "gaia-root" if level == 0 else f"gaia-{level - STEP}-{pixel >> (2 * STEP)}"
    return f"{parent}~{level}-{pixel}"


def _find_zone(ra: float, dec: float, level: int) -> int:
    """Descend de zone en zone vers les coordonnées demandées, en gardant à chaque fois la plus proche."""
    def gap(lv, p):
        r, d = center(lv, p)
        turn = abs(r - ra) % 360
        return (min(turn, 360 - turn) * math.cos(math.radians(dec))) ** 2 + (d - dec) ** 2
    pixel = min(range(12), key=lambda p: gap(0, p))
    for lv in range(STEP, level + 1, STEP):
        pixel = min(((pixel << (2 * STEP)) + i for i in range(4 ** STEP)), key=lambda p: gap(lv, p))
    return pixel


def search(wanted: str) -> list:
    """Les objets ne sont pas stockés : on les retrouve par ce qui les désigne, leur numéro ou leurs coordonnées."""
    root = "etoiles de la voie lactee (gaia)"
    results = []
    if wanted in root or wanted in ("gaia", "gaia dr3", "esa gaia"):
        results.append({"name": "Étoiles de la Voie lactée (Gaia)", "path": "Univers", "id": "univers~gaia", "chain": ["univers"]})
    star = re.fullmatch(r"(?:gaia\s*(?:dr3)?\s*)?(\d{1,19})", wanted)
    if star and (wanted[0] == "g" or len(star[1]) >= 15):
        source = int(star[1])
        pixel = source >> 35
        if pixel < 12 * 4 ** LEAF:
            results.append({"name": f"Gaia DR3 {source}", "path": "Univers / Gaia", "id": f"gaia-{LEAF}-{pixel}~{source}",
                            "chain": _chain(LEAF, pixel), "star": source})
    zone = re.fullmatch(r"(?:zone du ciel\s*)?(\d+(?:[.,]\d+)?)\s*h\s*,?\s*([+-]?\d+(?:[.,]\d+)?)\s*°?", wanted)
    if zone:
        ra, dec = float(zone[1].replace(",", ".")) * 15, float(zone[2].replace(",", "."))
        if 0 <= ra <= 360 and -90 <= dec <= 90:
            digits = len(zone[1].replace(",", ".").partition(".")[2])
            level = min(LEAF, max(0, (digits - 1) * STEP))
            pixel = _find_zone(ra, dec, level)
            results.append({"name": _zone_name(level, pixel), "path": "Univers / Gaia", "id": _zone_id(level, pixel), "chain": _chain(level, pixel)[:-1]})
    elif wanted and "zone du ciel".startswith(wanted) and len(wanted) >= 3:
        results += [{"name": _zone_name(0, p), "path": "Univers / Gaia", "id": _zone_id(0, p), "chain": ["univers", "gaia-root"]} for p in range(12)]
    return results


def nodes_for(key: str) -> dict | None:
    """Renvoie le contenu d'un dossier gaia-*, ou None si l'ESA ne répond pas."""
    if key == "gaia-root":
        return {"nodes": _zones(key, 0, None)}
    single = re.fullmatch(r"gaia-star-(\d{1,19})", key)
    if single:
        source = int(single[1])
        stars = query_stars(source, source + 1)
        if stars is None:
            return None
        parent = f"gaia-{LEAF}-{source >> 35}"
        return {"nodes": [{"i": f"{parent}~{s['source_id']}", "n": f"Gaia DR3 {s['source_id']}", "t": star_sheet(s)} for s in stars]}
    match = re.fullmatch(r"gaia-(\d+)-(\d+)", key)
    if not match:
        return {"nodes": []}
    level, pixel = int(match[1]), int(match[2])
    if level > LEAF or level % STEP or pixel >= 12 * 4 ** level:
        return {"nodes": []}
    if level < LEAF:
        return {"nodes": _zones(key, level, pixel)}
    stars = query_stars(pixel << 35, (pixel + 1) << 35)
    if stars is None:
        return None
    return {"nodes": [{"i": f"{key}~{s['source_id']}", "n": f"Gaia DR3 {s['source_id']}", "t": star_sheet(s)} for s in stars]}
