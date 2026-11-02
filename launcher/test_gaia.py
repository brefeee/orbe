"""Vérifie en direct chez l'ESA : découpage du ciel, position des étoiles et fiches sans valeur inventée."""
import math
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "app"))
import orbe_gaia as g  # noqa: E402


def separation(a, b):
    ra1, de1, ra2, de2 = map(math.radians, (*a, *b))
    return math.degrees(math.acos(min(1, math.sin(de1) * math.sin(de2) + math.cos(de1) * math.cos(de2) * math.cos(ra1 - ra2))))


assert len(g.nodes_for("gaia-root")["nodes"]) == 12
assert len(g.nodes_for("gaia-0-3")["nodes"]) == 64
assert g.nodes_for("gaia-0-3")["nodes"][1]["a"] == "gaia-3-193"
assert g.nodes_for("gaia-12-999999999999")["nodes"] == []
assert g.nodes_for("gaia-5-1")["nodes"] == []

# Descend vers des pixels répartis sur le ciel : chaque étoile doit tomber dans sa zone.
checked = shown = 0
times = []
for face in range(12):
    pixel = (face << 24) + 4_000_000 + face * 1000
    start = time.time()
    data = g.nodes_for(f"gaia-12-{pixel}")
    times.append(time.time() - start)
    assert data is not None, f"aucun service ne répond pour {pixel}"
    stars = g.query_stars(pixel << 35, (pixel + 1) << 35)
    assert stars is not None
    for s in stars:
        assert s["source_id"] >> 35 == pixel
        assert separation((s["ra"], s["dec"]), g.center(12, pixel)) < 0.03, (s, g.center(12, pixel))
        checked += 1
    if stars and not shown:
        shown = 1
        print("\n".join(g.star_sheet(stars[0])))
assert checked, "aucune étoile dans les zones testées"
print("étoiles vérifiées dans leur zone :", checked)
print(f"temps par zone : médian {sorted(times)[6]:.1f} s, maximum {max(times):.1f} s")

# Si le premier service tombe, le second prend le relais avec les mêmes champs.
real_ari = g.ARI
g.ARI = "https://127.0.0.1:9/tap"
pixel = (3 << 24) + 4_000_000 + 3000
fallback = g.query_stars(pixel << 35, (pixel + 1) << 35)
g.ARI = real_ari
assert fallback, "le service de secours ne répond pas"
assert fallback[0]["bp_rp"] is not None and "parallax_over_error" in fallback[0]
assert g.star_sheet(fallback[0])
print("service de secours : OK,", len(fallback), "objets")

bare = g.star_sheet({"ra": 10.0, "dec": -5.0})
text = " ".join(bare)
assert "pas assez bien mesurée" in text and "Température" not in text and "Éclat" not in text and "Vitesse" not in text
print("OK")
