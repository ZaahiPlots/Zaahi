# Submit 5 buildings to Meshy multi-image-to-3d in parallel
import base64, io, json, pathlib, requests, sys
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor

KEY = pathlib.Path.home().joinpath(".meshy-key").read_text().strip()
REF = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/reference-photos")
OUT = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/meshy-test")

# Each building: (slug, [photo filenames in REF/slug/])
BUILDINGS = {
    "marina-101":      ["bayut-cover.jpg", "propsearch-pgsi.jpg"],
    "princess-tower":  ["bayut-view.jpg", "bayut-cover.jpg", "propsearch-harbour.jpg"],
    "23-marina":       ["bayut-building.jpg", "bayut-cover.jpg", "propsearch-construction.jpg"],
    "elite-residence": ["bayut-cover.jpg", "propsearch-gvmzz.jpg", "propsearch-impression.jpg"],
    "ciel-tower":      ["propsearch-ma3dJ.jpg", "propsearch-46WYE.jpg", "propsearch-gBKPi.jpg", "propsearch-v3gyN.jpg"],
}

def prepare(slug, fnames):
    urls = []
    for fname in fnames:
        path = REF / slug / fname
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        if max(im.size) > 1800:
            ratio = 1800 / max(im.size)
            im = im.resize((int(im.size[0] * ratio), int(im.size[1] * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=90)
        urls.append("data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode())
    return urls

def submit(slug, fnames):
    image_urls = prepare(slug, fnames)
    payload = {"image_urls": image_urls, "ai_model": "meshy-6", "topology": "quad",
               "should_texture": True, "enable_pbr": False, "symmetry_mode": "auto"}
    r = requests.post("https://api.meshy.ai/openapi/v1/multi-image-to-3d",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        data=json.dumps(payload), timeout=120)
    if r.status_code in (200, 201, 202):
        tid = r.json().get("result")
        (OUT / f"task_id_{slug}.txt").write_text(tid)
        print(f"[{slug}] {len(image_urls)} photos → task_id {tid}", flush=True)
        return slug, tid
    print(f"[{slug}] FAILED: {r.status_code} {r.text[:200]}", flush=True)
    return slug, None

# Submit in parallel (4 at a time max per founder spec)
with ThreadPoolExecutor(max_workers=4) as ex:
    futures = [ex.submit(submit, slug, fnames) for slug, fnames in BUILDINGS.items()]
    results = [f.result() for f in futures]
print("\nALL SUBMITTED")
for slug, tid in results:
    print(f"  {slug}: {tid}")
