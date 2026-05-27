# Submit Almas + Gevora + JW Marriott (multi-image). Emirates separately.
import base64, io, json, pathlib, requests
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor

KEY = pathlib.Path.home().joinpath(".meshy-key").read_text().strip()
REF = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/reference-photos")
OUT = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/meshy-test")

BUILDINGS = {
    "almas-tower":         ["wiki-main.jpg", "bayut1.jpg", "bayut2.jpg"],
    "gevora-hotel":        ["wiki-main.jpg", "bayut.jpg"],
    "jw-marriott-marquis": ["wiki-main.jpg", "bayut.jpg"],
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
        print(f"[{slug}] {len(image_urls)} → {tid}", flush=True)
        return slug, tid
    print(f"[{slug}] FAILED {r.status_code} {r.text[:200]}", flush=True)
    return slug, None

with ThreadPoolExecutor(max_workers=3) as ex:
    futures = [ex.submit(submit, slug, fnames) for slug, fnames in BUILDINGS.items()]
    [f.result() for f in futures]
print("\nBATCH 2 PARTIAL SUBMITTED")
