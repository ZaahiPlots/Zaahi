# Read-only: sweep DDA z18 tiles over the DLRC bbox, collect HOTEL plots.
import math, json, subprocess, sys
from collections import OrderedDict

TILES = "public/tiles/dda-land.pmtiles"
# DLRC / Wadi Al Safa 5 bbox (from curated DB DLRC-proper parcels, padded).
LAT_MIN, LAT_MAX = 25.073, 25.102
LNG_MIN, LNG_MAX = 55.366, 55.395
Z = 18

def xtile(lng): return int((lng + 180) / 360 * (2 ** Z))
def ytile(lat):
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * (2 ** Z))

x0, x1 = xtile(LNG_MIN), xtile(LNG_MAX)
y0, y1 = ytile(LAT_MAX), ytile(LAT_MIN)  # y grows southward
hotels = OrderedDict()
all_lu = {}
tiles = 0
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        tiles += 1
        try:
            out = subprocess.run(["tippecanoe-decode", TILES, str(Z), str(x), str(y)],
                                 capture_output=True, text=True, timeout=30).stdout
        except Exception:
            continue
        if not out.strip():
            continue
        try:
            d = json.loads(out)
        except Exception:
            continue
        feats = []
        for sub in d.get("features", []):
            if isinstance(sub, dict):
                feats += sub.get("features", [])
        for f in feats:
            p = f.get("properties", {})
            lu = str(p.get("landUse") or "")
            all_lu[lu] = all_lu.get(lu, 0) + 1
            if "HOTEL" in lu.upper() or "HOSPITALITY" in lu.upper():
                pn = p.get("plotNumber")
                if pn and pn not in hotels:
                    ring = f["geometry"]["coordinates"][0]
                    clng = sum(c[0] for c in ring) / len(ring)
                    clat = sum(c[1] for c in ring) / len(ring)
                    hotels[pn] = {
                        "plot": pn, "lat": round(clat, 6), "lng": round(clng, 6),
                        "mainLandUse": p.get("mainLandUse"), "subLandUse": p.get("subLandUse"),
                        "areaSqft": p.get("areaSqft"), "status": p.get("status"),
                    }

print(f"tiles scanned: {tiles}  ({x0}-{x1} x, {y0}-{y1} y)")
print("landUse histogram in bbox:", json.dumps(all_lu))
print(f"\nDISTINCT HOTEL plots in DLRC bbox: {len(hotels)}")
for h in hotels.values():
    print("  ", json.dumps(h))
