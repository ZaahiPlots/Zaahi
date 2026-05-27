"""Submit Como Residences to Meshy multi-image-to-3d.
3 photos: como4 (primary elevation), como2 (water side), como3 (rooftop detail).
"""
import base64, io, json, pathlib, requests
from PIL import Image, ImageOps

KEY = pathlib.Path.home().joinpath(".meshy-key").read_text().strip()
REF = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/reference-photos/como-residences")
OUT = pathlib.Path("/home/zaahi/zaahi/docs/research/3d-buildings-pilot/meshy-test")

PHOTOS = ["como4.png", "como2.png", "como3.png"]

def to_data_uri(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(im.size) > 1800:
        ratio = 1800 / max(im.size)
        im = im.resize((int(im.size[0] * ratio), int(im.size[1] * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

urls = [to_data_uri(REF / p) for p in PHOTOS]
payload = {
    "image_urls": urls,
    "ai_model": "meshy-6",
    "topology": "quad",
    "should_texture": True,
    "enable_pbr": False,
    "symmetry_mode": "auto",
}
r = requests.post(
    "https://api.meshy.ai/openapi/v1/multi-image-to-3d",
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    data=json.dumps(payload),
    timeout=120,
)
if r.status_code in (200, 201, 202):
    tid = r.json().get("result")
    (OUT / "task_id_como-residences.txt").write_text(tid)
    print(f"como-residences {len(urls)} photos → {tid}")
else:
    print(f"FAILED {r.status_code} {r.text[:300]}")
