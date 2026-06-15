#!/usr/bin/env python3
# Reusable Meshy text-to-3D (preview, geometry-only — we recolour to the legend
# colour so no texture needed → cheaper) for land-use archetype models.
# Usage: python3 _meshy-archetype.py <CATEGORY>
# Reports credit balance before/after so we know the per-model cost.
import json, pathlib, time, sys, requests

KEY = pathlib.Path.home().joinpath(".meshy-key").read_text().strip()
OUT = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/archetypes")
OUT.mkdir(parents=True, exist_ok=True)
H = {"Authorization": f"Bearer {KEY}"}

# Low-poly, single-colour-readable prompts (geometry must read in ONE colour).
PROMPTS = {
    "HOTEL": (
        "Low-poly architectural massing model of a WIDE rectangular mid-rise hotel "
        "building, clearly wider than tall, flat roof, a dense REGULAR GRID of identical "
        "small square windows arranged in even rows and columns across the entire facade "
        "(hotel room windows), a wide flat cantilevered entrance canopy over the "
        "ground-floor lobby, simple clean blocky geometry, single material, no clutter, "
        "isometric, game-ready low poly, plain white",
        "skyscraper, tall tower, needle, spire, dome, curved walls, organic shapes, "
        "people, trees, cars, ground plane, terrain, base, multiple buildings",
    ),
}

cat = (sys.argv[1] if len(sys.argv) > 1 else "HOTEL").upper()
prompt, negative = PROMPTS[cat]

def balance():
    return requests.get("https://api.meshy.ai/openapi/v1/balance", headers=H, timeout=30).json().get("balance")

bal0 = balance()
print(f"[{cat}] balance before: {bal0}")

payload = {
    "mode": "preview",
    "prompt": prompt,
    "negative_prompt": negative,
    "art_style": "realistic",
    "ai_model": "meshy-5",
    "topology": "triangle",
    "target_polycount": 12000,
    "should_remesh": True,
    "symmetry_mode": "auto",
}
r = requests.post("https://api.meshy.ai/openapi/v2/text-to-3d", headers={**H, "Content-Type": "application/json"},
                  data=json.dumps(payload), timeout=120)
print("submit:", r.status_code, r.text[:300])
r.raise_for_status()
tid = r.json().get("result")
(OUT / f"task_{cat}.txt").write_text(tid)
print("task_id:", tid)

url = f"https://api.meshy.ai/openapi/v2/text-to-3d/{tid}"
t0 = time.time(); last = None
while True:
    j = requests.get(url, headers=H, timeout=30).json()
    st, pr = j.get("status"), j.get("progress", 0)
    if (st, pr) != last:
        print(f"[{int(time.time()-t0):4d}s] {st} {pr}%"); last = (st, pr)
    if st in ("SUCCEEDED", "FAILED", "EXPIRED", "CANCELED"):
        (OUT / f"resp_{cat}.json").write_text(json.dumps(j, indent=2))
        if st != "SUCCEEDED":
            print("FAILED:", j.get("task_error")); sys.exit(2)
        glb_url = j["model_urls"]["glb"]
        glb = requests.get(glb_url, timeout=120).content
        dst = OUT / f"{cat.lower()}_raw.glb"
        dst.write_bytes(glb)
        print(f"GLB saved: {dst} ({len(glb)} bytes)")
        break
    time.sleep(10)

bal1 = balance()
print(f"[{cat}] balance after: {bal1} · credits used: {bal0 - bal1}")
