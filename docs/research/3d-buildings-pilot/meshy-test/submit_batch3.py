import base64, io, json, pathlib, requests
from PIL import Image, ImageOps
from concurrent.futures import ThreadPoolExecutor

KEY = pathlib.Path.home().joinpath(".meshy-key").read_text().strip()
REF = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/reference-photos")
OUT = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/meshy-test")

MULTI = {
    "index-tower":   ["wiki-main.jpg", "bayut1.jpg", "bayut2.jpg"],
    "cayan-tower":   ["wiki-main.jpg", "bayut1.jpg", "bayut2.jpg"],
    "damac-heights": ["wiki-main.jpg", "bayut1.jpg", "bayut2.jpg"],
    "the-torch":     ["bayut1.jpg", "bayut2.jpg"],
}
SINGLE = {
    "ocean-heights": "wiki-main.jpg",
}

def to_data_uri(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(im.size) > 1800:
        ratio = 1800 / max(im.size)
        im = im.resize((int(im.size[0] * ratio), int(im.size[1] * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def submit_multi(slug, fnames):
    urls = [to_data_uri(REF / slug / f) for f in fnames]
    payload = {"image_urls": urls, "ai_model": "meshy-6", "topology": "quad",
               "should_texture": True, "enable_pbr": False, "symmetry_mode": "auto"}
    r = requests.post("https://api.meshy.ai/openapi/v1/multi-image-to-3d",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        data=json.dumps(payload), timeout=120)
    if r.status_code in (200, 201, 202):
        tid = r.json().get("result")
        (OUT / f"task_id_{slug}.txt").write_text(tid)
        print(f"[{slug}] multi-image → {tid}", flush=True)
    else:
        print(f"[{slug}] FAILED {r.status_code} {r.text[:200]}", flush=True)

def submit_single(slug, fname):
    url = to_data_uri(REF / slug / fname)
    payload = {"image_url": url, "ai_model": "meshy-6", "topology": "quad",
               "should_texture": True, "enable_pbr": False, "symmetry_mode": "auto"}
    r = requests.post("https://api.meshy.ai/openapi/v1/image-to-3d",
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        data=json.dumps(payload), timeout=120)
    if r.status_code in (200, 201, 202):
        tid = r.json().get("result")
        (OUT / f"task_id_{slug}.txt").write_text(tid)
        print(f"[{slug}] single-image → {tid}", flush=True)
    else:
        print(f"[{slug}] FAILED {r.status_code} {r.text[:200]}", flush=True)

with ThreadPoolExecutor(max_workers=4) as ex:
    [ex.submit(submit_multi, s, fs) for s, fs in MULTI.items()]
    ex.submit(submit_single, list(SINGLE.keys())[0], list(SINGLE.values())[0])
print("BATCH 3 SUBMITTED")
