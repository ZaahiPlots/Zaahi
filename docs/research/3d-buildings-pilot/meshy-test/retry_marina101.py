import base64, io, json, pathlib, requests
from PIL import Image, ImageOps

KEY = pathlib.Path.home().joinpath(".meshy-key").read_text().strip()
REF = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/reference-photos/marina-101")
OUT = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/meshy-test")

# Use best single photo (bayut-cover) — cleaner background
im = ImageOps.exif_transpose(Image.open(REF / "bayut-cover.jpg")).convert("RGB")
if max(im.size) > 1600:
    ratio = 1600 / max(im.size)
    im = im.resize((int(im.size[0] * ratio), int(im.size[1] * ratio)), Image.LANCZOS)
buf = io.BytesIO()
im.save(buf, format="JPEG", quality=88)
url = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

payload = {"image_url": url, "ai_model": "meshy-6", "topology": "quad",
           "should_texture": True, "enable_pbr": False, "symmetry_mode": "auto"}
r = requests.post("https://api.meshy.ai/openapi/v1/image-to-3d",
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    data=json.dumps(payload), timeout=120)
if r.status_code in (200, 201, 202):
    tid = r.json().get("result")
    (OUT / "task_id_marina-101.txt").write_text(tid)
    print(f"marina-101 retry single-image: {tid}")
else:
    print(f"FAILED {r.status_code} {r.text[:200]}")
