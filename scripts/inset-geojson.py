#!/usr/bin/env python3
"""
Inset (negative-buffer) every Polygon/MultiPolygon in a GeoJSON by N
metres. Reads WGS84 (EPSG:4326), projects to UTM zone 40N (EPSG:32640
covers Dubai + Abu Dhabi), buffers, and projects back.

For Oman (Muscat ~58° E) the correct zone is 40N as well — same
hemisphere, longitude on the boundary of 40/41N. If Oman tiles ever
need to inset, run this script with the same EPSG:32640 and accept
~10-20 cm of distortion at the eastern edge.

Usage:
  python3 scripts/inset-geojson.py <input.geojson> <output.geojson> [meters]

Default inset is 3 m (matches ZAAHI Signature commercial-side setback
in code; effectively zero for "tight" plots, visible gap for normal
ones).

Per the user's research-script guideline: tiny, single happy path,
no silent recovery from bad data — if the input file is malformed
or has unexpected geometry the script dies loudly.
"""
import json
import sys
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer

# Hardcoded UTM zone 40N covers Dubai + Abu Dhabi. Oman (Muscat ~58° E)
# sits on the 40/41N boundary; 40N is acceptable with sub-metre error
# at the eastern edge of Muscat municipality. NOT correct for KSA or
# wider GCC — re-pick the EPSG if extending.
SRC_EPSG = 4326
UTM_EPSG = 32640

def main():
    if len(sys.argv) < 3:
        print("usage: inset-geojson.py <input> <output> [meters]", file=sys.stderr)
        sys.exit(2)
    in_path, out_path = sys.argv[1], sys.argv[2]
    meters = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0

    to_utm = Transformer.from_crs(SRC_EPSG, UTM_EPSG, always_xy=True).transform
    to_wgs = Transformer.from_crs(UTM_EPSG, SRC_EPSG, always_xy=True).transform

    with open(in_path) as f:
        gj = json.load(f)

    kept, dropped = 0, 0
    for feat in gj.get("features", []):
        geom = shape(feat["geometry"])
        utm_geom = transform(to_utm, geom)
        buffered = utm_geom.buffer(-meters)
        if buffered.is_empty:
            dropped += 1
            feat["geometry"] = None  # marker; we'll filter below
            continue
        feat["geometry"] = mapping(transform(to_wgs, buffered))
        kept += 1

    gj["features"] = [f for f in gj["features"] if f["geometry"] is not None]
    with open(out_path, "w") as f:
        json.dump(gj, f, separators=(",", ":"))
    print(f"kept={kept} dropped(empty after buffer)={dropped} → {out_path}")

if __name__ == "__main__":
    main()
