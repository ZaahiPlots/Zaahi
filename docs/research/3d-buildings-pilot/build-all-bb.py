"""
Autonomous overnight build — all Business Bay buildings as one
combined GLB + individual hero GLBs.

Run:
    blender --background --python build-all-bb.py

Inputs (alongside this script):
  * business-bay-osm.json   — 454 ways + 17 relations from Overpass
  * business-bay-roads.json — 1202 vehicle ways (fetched 2026-05-25)

Outputs:
  * business-bay-all.glb               — combined, all buildings
  * heroes/<slug>.glb                  — one per named hero building
  * business-bay-all.stats.json        — sidecar coverage stats

Orientation rule:
  * OSM building footprints are real-world accurate — long-axis
    already matches the road. We DO NOT bake per-building rotation
    in Blender; we project lng/lat → local metres (X=east, Y=north)
    as-is. The same deck.gl `getOrientation: [0, -50, 90]` correction
    that worked for Millennium Tower aligns every building because
    they all came through the same Blender→glTF→deck.gl transform.

Height resolution priority per building:
  1. tag "height" (parse first number, treat as metres)
  2. tag "building:levels" × 3.5 m
  3. fallback 15 m (~ 4 floors)

ZAAHI Signature massing tiers (per CLAUDE.md, identical to the
loadZaahiPlots client-side algorithm):
  * height ≤ 14 m  → podium only (1.00 × footprint, 0–height)
  * 14 < height ≤ ~35 m → podium + body (1.00 / 0.70)
  * height > 35 m → podium + body + crown (1.00 / 0.70 / 0.50)
"""
import bpy
import bmesh
import math
import json
import os
import time

t0 = time.time()
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
HERO_DIR = os.path.join(OUT_DIR, "heroes")
os.makedirs(HERO_DIR, exist_ok=True)

# ── Inputs ─────────────────────────────────────────────────────────
with open(os.path.join(OUT_DIR, "business-bay-osm.json")) as f:
    OSM = json.load(f)
print("[zaahi] loaded OSM: %d elements" % len(OSM.get("elements", [])))

# ── Bbox + projection origin (same as the prior pipeline) ─────────
BBOX = (25.180, 55.260, 25.195, 55.282)
LAT0 = (BBOX[0] + BBOX[2]) / 2
LNG0 = (BBOX[1] + BBOX[3]) / 2
MPD_LAT = 111_320.0
MPD_LNG = 111_320.0 * math.cos(math.radians(LAT0))

def lnglat_to_xy(lng, lat):
    # Local frame: X = east (+lng), Y = north (+lat). No rotation
    # baked in — the OSM bearing is already the real-world bearing.
    return ((lng - LNG0) * MPD_LNG, (lat - LAT0) * MPD_LAT)

# ── Height parsing ────────────────────────────────────────────────
DEFAULT_HEIGHT_M = 15.0
LEVEL_HEIGHT_M = 3.5
PODIUM_TOP_M = 14.0
CROWN_H_M = 7.0
SIGNATURE_BODY_FLOOR = 14.0   # podium-only when height ≤ this

def parse_height(tags):
    h = tags.get("height")
    if h:
        s = str(h).replace(",", ".").lower()
        for tok in s.replace("m", " ").split():
            try:
                return max(3.0, float(tok))
            except ValueError:
                continue
    lvl = tags.get("building:levels")
    if lvl:
        try:
            return max(3.0, float(str(lvl).split()[0]) * LEVEL_HEIGHT_M)
        except ValueError:
            pass
    return DEFAULT_HEIGHT_M

# ── Heroes (founder's list) ───────────────────────────────────────
HERO_NAMES = [
    "Millennium Tower",
    "Millenium Tower",          # OSM has the misspelled variant
    "Bay Gate Tower",
    "Bay Gate",
    "Executive Tower M",
    "Executive Tower B",
    "Executive Tower K",
    "Churchill Tower",
    "Churchill Towers",
    "Ubora Tower",
    "Ubora Towers",
    "Vision Tower",
    "The Opus",
    "Opus by Omniyat",
    "Marasi Business Bay",
    # Bonus high-rises from the named set with explicit height ≥ 200 m
    "Opera Grand",
    "Grande Signature Residences",
    "Paramount Hotel Midtown",
    "Manazel Al Safa Tower",
    "Tiara United Tower 2",
    "MBK Tower",
    "BLVD Heights Tower 1",
]
HERO_KEYS = set(s.lower() for s in HERO_NAMES)

# ── Per-hero overrides (from Wikipedia research 2026-05-25) ───────
# Use OSM way_id as the key when the building IS in OSM; for missing
# heroes (The Opus etc.) see MANUAL_BUILDINGS below.
HERO_OVERRIDES_BY_OSM_ID = {
    # Vision Tower — OSM has 92 m but Wikipedia & tvsdesign datasheet
    # both confirm 260 m (60 floors). Patch the height. Found via
    # Wikipedia search for "Vision Tower Dubai".
    532853132: {"height_override": 260.0, "note": "OSM 92m → Wikipedia 260m"},
}

# Lookup by OSM name in case the id changes between Overpass refreshes.
HERO_OVERRIDES_BY_NAME = {
    "vision tower": {
        "height_override": 260.0,
        "shape_override": "vision_bent",  # per Dewan / Architizer "bent glass façade"
        "note": "OSM 92m → Wikipedia 260m; shape per research (double-tilted glass)",
    },
}

# ── Manual buildings (founder-listed heroes that have NO OSM `name` tag) ──
# Coordinates approximated from Wikipedia + general BB knowledge. Sizes
# from Wikipedia where present, otherwise estimated from "20-storey
# mixed-use" / "12-tower complex" descriptions.
MANUAL_BUILDINGS = [
    {
        # The Opus — Zaha Hadid 2019. v3 research: "two 20-story
        # towers connected by a bridge" + "fluid void sweeps through
        # the heart" + "melted-ice" inner glass. Modelled as two
        # parallel slabs with a curved-approximation void between
        # them, capped by a bridge near the top.
        "name": "The Opus",
        "lng": 55.2760, "lat": 25.1870,
        "footprint_w": 73.0, "footprint_d": 73.0,
        "height": 93.0,
        "shape": "opus_two_towers",
        "rotation_deg": 0.0,
    },
    {
        # Ubora Towers — Aedas / Andrew Bromberg, 2010-11. Tower 1
        # (Commercial) 263 m / 58 floors. Exact coords from Wikipedia.
        "name": "Ubora Tower 1",
        "lng": 55.2710278, "lat": 25.1805778,
        "footprint_w": 40.0, "footprint_d": 40.0,
        "height": 263.0,
        "shape": "standard_3tier",
        "rotation_deg": 25.0,
    },
    {
        # Ubora Tower 2 (Residential) — same complex, lower
        "name": "Ubora Tower 2",
        "lng": 55.2716, "lat": 25.1810,
        "footprint_w": 32.0, "footprint_d": 28.0,
        "height": 70.0,
        "shape": "standard_2tier",
        "rotation_deg": 25.0,
    },
    {
        # Churchill Residence — DAR, 2010. 235 m / 61 floors.
        # Art Deco facade inspired by Chrysler Building → stepped
        # crown. Footprint from typical BB residential slab.
        "name": "Churchill Tower",
        "lng": 55.2640, "lat": 25.1840,
        "footprint_w": 38.0, "footprint_d": 32.0,
        "height": 235.0,
        "shape": "art_deco_stepped_crown",
        "rotation_deg": 50.0,
    },
    {
        # Bay Gate Tower — 2014. 221 m / 53 floors. Limited Wikipedia
        # data on facade; standard 3-tier slab. Position estimated.
        "name": "Bay Gate Tower",
        "lng": 55.2735, "lat": 25.1880,
        "footprint_w": 38.0, "footprint_d": 28.0,
        "height": 221.0,
        "shape": "standard_3tier",
        "rotation_deg": 40.0,
    },
    {
        # Marasi Business Bay — yacht-marina development along
        # Dubai Canal. Not a tower; a low-rise promenade. We model
        # as a single 8 m podium block to mark presence.
        "name": "Marasi Business Bay",
        "lng": 55.2650, "lat": 25.1860,
        "footprint_w": 120.0, "footprint_d": 25.0,
        "height": 8.0,
        "shape": "low_rise_podium",
        "rotation_deg": 130.0,
    },
]
MANUAL_NAMES = set(b["name"].lower() for b in MANUAL_BUILDINGS)

def slugify(name):
    out = []
    for c in name.lower():
        if c.isalnum():
            out.append(c)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).strip("-") or "untitled"

# ── Clear default scene ───────────────────────────────────────────
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)
for me in list(bpy.data.meshes):
    bpy.data.meshes.remove(me)

# ── Shared PBR materials (from build-millennium-detailed) ──────────
def make_material(name, base_rgba, metallic=0.05, roughness=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = None
    for node in nt.nodes:
        if node.bl_idname == "ShaderNodeBsdfPrincipled":
            bsdf = node
            break
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((nd for nd in nt.nodes if nd.bl_idname == "ShaderNodeOutputMaterial"), None)
        if out is None:
            out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs[0], out.inputs[0])

    def s(names, value):
        for n in names:
            if n in bsdf.inputs:
                bsdf.inputs[n].default_value = value
                return
    s(["Base Color", "Color"], base_rgba)
    s(["Roughness"], roughness)
    s(["Metallic"], metallic)
    return m

MAT_GLASS    = make_material("Glass_BlueGrey",  (0.025, 0.05, 0.10, 1.0), metallic=0.15, roughness=0.45)
MAT_FRAME    = make_material("Frame_White",     (0.93, 0.92, 0.88, 1.0),  metallic=0.05, roughness=0.78)
MAT_DARK     = make_material("Concrete_Dark",   (0.16, 0.17, 0.20, 1.0),  metallic=0.05, roughness=0.82)
MAT_SPANDREL = make_material("Spandrel_Warm",   (0.62, 0.60, 0.55, 1.0),  metallic=0.10, roughness=0.65)
MAT_GOLD     = make_material("ZAAHI_Gold",      (0.78, 0.66, 0.43, 1.0),  metallic=0.85, roughness=0.22)
MAT_METAL    = make_material("Antenna_Metal",   (0.55, 0.56, 0.60, 1.0),  metallic=0.92, roughness=0.18)
# Per-hero materials (research-driven, v3 2026-05-25)
MAT_OPUS_GLASS    = make_material("Opus_FluidGlass",  (0.42, 0.46, 0.52, 1.0), metallic=0.65, roughness=0.10)  # silver "melted ice"
MAT_OPUS_BRIDGE   = make_material("Opus_Bridge",      (0.85, 0.86, 0.84, 1.0), metallic=0.55, roughness=0.18)
MAT_CHURCHILL_BEIGE = make_material("Churchill_Stone", (0.78, 0.71, 0.58, 1.0), metallic=0.05, roughness=0.75)  # warm Chrysler-stone
MAT_VISION_GLASS  = make_material("Vision_BentGlass", (0.10, 0.15, 0.22, 1.0), metallic=0.40, roughness=0.20)  # cooler / more reflective

# ── Geometry helpers ──────────────────────────────────────────────
def ring_strip_closing(ring):
    """OSM frequently repeats the first node at the end. Drop it."""
    if len(ring) >= 2 and ring[0] == ring[-1]:
        return ring[:-1]
    return ring

def signed_area(ring_xy):
    n = len(ring_xy)
    s = 0.0
    for i in range(n):
        x1, y1 = ring_xy[i]
        x2, y2 = ring_xy[(i + 1) % n]
        s += (x1 * y2) - (x2 * y1)
    return s / 2.0

def scale_ring(ring, factor):
    """Uniform scale of every vertex relative to the centroid."""
    cx = sum(p[0] for p in ring) / len(ring)
    cy = sum(p[1] for p in ring) / len(ring)
    return [(cx + (x - cx) * factor, cy + (y - cy) * factor) for (x, y) in ring]

def extrude_prism(bm, ring_xy, z0, z1, materials_by_face=None, default_mat_index=0):
    """Add a prism (top + bottom + side walls) on `ring_xy` from z0 to z1."""
    n = len(ring_xy)
    bot = [bm.verts.new((x, y, z0)) for (x, y) in ring_xy]
    top = [bm.verts.new((x, y, z1)) for (x, y) in ring_xy]
    bm.verts.ensure_lookup_table()
    # Bottom face — reverse to point down
    f_bot = bm.faces.new(list(reversed(bot)))
    # Top face
    f_top = bm.faces.new(top)
    # Sides
    sides = []
    for i in range(n):
        j = (i + 1) % n
        try:
            f = bm.faces.new([bot[i], bot[j], top[j], top[i]])
            sides.append(f)
        except ValueError:
            # Degenerate face (collinear / duplicate vertex) — skip
            pass
    if materials_by_face is not None:
        materials_by_face.setdefault("bottom", []).append(f_bot)
        materials_by_face.setdefault("top", []).append(f_top)
        materials_by_face.setdefault("side", []).extend(sides)
    return f_bot, f_top, sides

# ── Window grid helpers ───────────────────────────────────────────
def long_edge_axis(ring_xy):
    """Return (longest_edge_index, edge_length). Used to decide which
    side gets the vertical mullions ("broad face"). For non-rectangular
    footprints picks the longest edge."""
    n = len(ring_xy)
    best_i, best_len = 0, 0.0
    for i in range(n):
        x1, y1 = ring_xy[i]
        x2, y2 = ring_xy[(i + 1) % n]
        L = math.hypot(x2 - x1, y2 - y1)
        if L > best_len:
            best_len = L
            best_i = i
    return best_i, best_len

def add_horizontal_floor_band(parent_collection, ring_xy, z, height, proud, mat):
    """A thin spandrel band tracing the footprint at level z. Built as
    an outward-inflated narrow prism for cheap geometry."""
    cx = sum(p[0] for p in ring_xy) / len(ring_xy)
    cy = sum(p[1] for p in ring_xy) / len(ring_xy)
    inflated = []
    for (x, y) in ring_xy:
        dx, dy = x - cx, y - cy
        L = math.hypot(dx, dy)
        if L < 1e-6:
            inflated.append((x, y))
        else:
            inflated.append((x + (dx / L) * proud, y + (dy / L) * proud))
    bm = bmesh.new()
    extrude_prism(bm, inflated, z - height / 2, z + height / 2)
    mesh = bpy.data.meshes.new("band_mesh")
    bm.to_mesh(mesh); bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new("band", mesh)
    parent_collection.objects.link(obj)
    return obj

def add_vertical_mullions(parent_collection, ring_xy, edge_idx, z0, z1,
                          count=5, mullion_w=0.4, mullion_proud=0.15, mat=MAT_FRAME):
    """N evenly spaced thin vertical strips on the longest edge of the
    footprint, slightly proud of the glass."""
    n = len(ring_xy)
    p1 = ring_xy[edge_idx]
    p2 = ring_xy[(edge_idx + 1) % n]
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    L = math.hypot(dx, dy)
    if L < 1.0:
        return
    # Tangent + outward normal (perpendicular pointing away from centroid)
    tx, ty = dx / L, dy / L
    nx, ny = ty, -tx
    cx_all = sum(p[0] for p in ring_xy) / n
    cy_all = sum(p[1] for p in ring_xy) / n
    mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
    if (cx_all - mx) * nx + (cy_all - my) * ny > 0:
        nx, ny = -nx, -ny

    pitch = L / (count + 1)
    for i in range(count):
        t = (i + 1) * pitch
        center_x = p1[0] + tx * t + nx * (mullion_proud / 2)
        center_y = p1[1] + ty * t + ny * (mullion_proud / 2)
        bm = bmesh.new()
        hx, hy = mullion_w / 2, mullion_proud / 2
        local_quad = [
            (-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)
        ]
        # Rotate local quad so its long edge aligns with mullion_w axis
        cos_a, sin_a = tx, ty
        world_quad = []
        for (lx, ly) in local_quad:
            rx = cos_a * lx - sin_a * ly + center_x
            ry = sin_a * lx + cos_a * ly + center_y
            world_quad.append((rx, ry))
        extrude_prism(bm, world_quad, z0, z1)
        mesh = bpy.data.meshes.new("mullion_mesh")
        bm.to_mesh(mesh); bm.free()
        mesh.materials.append(mat)
        obj = bpy.data.objects.new("mullion", mesh)
        parent_collection.objects.link(obj)

# ── Build one building ────────────────────────────────────────────
def build_building(way):
    geom = way.get("geometry")
    tags = way.get("tags", {})
    if not geom or len(geom) < 4:
        return None, None
    ring_lnglat = [(p["lon"], p["lat"]) for p in geom]
    ring_lnglat = ring_strip_closing(ring_lnglat)
    if len(ring_lnglat) < 3:
        return None, None

    ring_xy = [lnglat_to_xy(lng, lat) for (lng, lat) in ring_lnglat]
    if signed_area(ring_xy) < 0:
        ring_xy.reverse()

    h = parse_height(tags)
    name = tags.get("name") or tags.get("name:en")
    way_id = way["id"]
    # Apply overrides (height, etc.)
    ovr = HERO_OVERRIDES_BY_OSM_ID.get(way_id) or HERO_OVERRIDES_BY_NAME.get((name or "").lower())
    if ovr:
        if "height_override" in ovr:
            h = ovr["height_override"]
    is_hero = (name or "").lower() in HERO_KEYS
    is_tall_named = bool(name) and h >= 50.0

    # Custom-shape override: divert to manual builder for OSM-matched
    # heroes that we know have a non-rectangular silhouette.
    if ovr and "shape_override" in ovr:
        # Build via manual builder using OSM centroid + footprint bbox
        centroid_x = sum(p[0] for p in ring_xy) / len(ring_xy)
        centroid_y = sum(p[1] for p in ring_xy) / len(ring_xy)
        xs = [p[0] for p in ring_xy]
        ys = [p[1] for p in ring_xy]
        bbox_w = max(xs) - min(xs)
        bbox_d = max(ys) - min(ys)
        spec = {
            "name": name,
            "lng": LNG0 + centroid_x / MPD_LNG,
            "lat": LAT0 + centroid_y / MPD_LAT,
            "footprint_w": max(bbox_w, 20.0),
            "footprint_d": max(bbox_d, 20.0),
            "height": h,
            "shape": ovr["shape_override"],
            "rotation_deg": 0.0,
        }
        trunk, objs, info = build_manual_building(spec)
        return trunk, {
            "way_id": way_id,
            "name": name,
            "height_m": h,
            "hero": True,
            "tall_named": True,
            "tier": ovr["shape_override"],
            "detail_level": "custom_shape",
            "objs": objs,
        }
    coll = bpy.context.collection  # everything in scene collection

    # ── 1. Core massing ──
    bm = bmesh.new()
    if h <= SIGNATURE_BODY_FLOOR:
        extrude_prism(bm, ring_xy, 0.0, h)
        tier = "podium"
        body_top_z = h
    else:
        extrude_prism(bm, ring_xy, 0.0, PODIUM_TOP_M)
        body_ring = scale_ring(ring_xy, 0.70)
        if h > 35.0:
            body_top_z = h - CROWN_H_M
            extrude_prism(bm, body_ring, PODIUM_TOP_M, body_top_z)
            crown_ring = scale_ring(ring_xy, 0.50)
            extrude_prism(bm, crown_ring, body_top_z, h)
            tier = "three"
        else:
            extrude_prism(bm, body_ring, PODIUM_TOP_M, h)
            body_top_z = h
            tier = "two"

    obj_name = "B_%d_%s" % (way_id, slugify(name) if name else "unnamed")
    mesh = bpy.data.meshes.new(obj_name + "_mesh")
    bm.to_mesh(mesh); bm.free()
    mesh.materials.append(MAT_GLASS)
    obj = bpy.data.objects.new(obj_name, mesh)
    coll.objects.link(obj)
    parent_objs = [obj]

    # ── 2. Window articulation ──
    if is_hero:
        # Every-floor spandrel + mullions on broadest edge
        floor_h = 4.0 if h < 80 else 4.5
        n_floors = max(2, int(h / floor_h))
        body_ring = scale_ring(ring_xy, 0.70)
        for f in range(1, n_floors):
            z = f * floor_h
            if z >= body_top_z - 1.0:
                break
            ring_for_band = ring_xy if z < PODIUM_TOP_M else body_ring
            band = add_horizontal_floor_band(coll, ring_for_band, z, height=0.7, proud=0.10, mat=MAT_SPANDREL)
            parent_objs.append(band)
        # Vertical mullions on longest edge — on body section (above podium)
        if h > 35.0:
            edge_idx, _ = long_edge_axis(scale_ring(ring_xy, 0.70))
            n_old = len(bpy.data.objects)
            add_vertical_mullions(coll, scale_ring(ring_xy, 0.70), edge_idx,
                                  PODIUM_TOP_M, body_top_z, count=5,
                                  mullion_w=0.5, mullion_proud=0.18, mat=MAT_FRAME)
            for o in list(bpy.data.objects)[n_old:]:
                parent_objs.append(o)
        # Gold accent ring at body→crown joint
        if h > 35.0:
            bm_g = bmesh.new()
            ring_infl = scale_ring(ring_xy, 1.02)
            extrude_prism(bm_g, ring_infl, body_top_z - 0.5, body_top_z + 0.3)
            mg = bpy.data.meshes.new(obj_name + "_gold_mesh")
            bm_g.to_mesh(mg); bm_g.free()
            mg.materials.append(MAT_GOLD)
            og = bpy.data.objects.new(obj_name + "_gold", mg)
            coll.objects.link(og)
            parent_objs.append(og)

    elif is_tall_named:
        # Sparser articulation: spandrel every 5 floors
        floor_h = 4.5
        n_floors = max(2, int(h / floor_h))
        body_ring = scale_ring(ring_xy, 0.70)
        for f in range(5, n_floors, 5):
            z = f * floor_h
            if z >= body_top_z - 1.0:
                break
            ring_for_band = ring_xy if z < PODIUM_TOP_M else body_ring
            band = add_horizontal_floor_band(coll, ring_for_band, z, height=0.5, proud=0.06, mat=MAT_SPANDREL)
            parent_objs.append(band)

    # ── 3. Group: parent ancillaries to the main building object ──
    for p in parent_objs[1:]:
        p.parent = obj

    info = {
        "way_id": way_id,
        "name": name,
        "height_m": h,
        "hero": is_hero,
        "tall_named": is_tall_named,
        "tier": tier,
        "detail_level": "hero" if is_hero else ("tall_named" if is_tall_named else "basic"),
        # parent_objs[0] is the main building; the rest are spandrels,
        # mullions, gold accent. Captured so individual-hero export
        # can select the full set, not just the trunk.
        "objs": parent_objs,
    }
    return obj, info

# ── Custom shape builders ─────────────────────────────────────────
def rect_ring_centered(cx, cy, w, d, rot_rad=0.0):
    """Axis-aligned rectangle centred at (cx, cy), rotated rot_rad."""
    hx, hy = w / 2, d / 2
    corners = [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]
    c, s = math.cos(rot_rad), math.sin(rot_rad)
    return [(c * x - s * y + cx, s * x + c * y + cy) for (x, y) in corners]

def build_opus_two_towers(centroid_xy, w, d, h, rot_rad):
    """Opus v3: two parallel slabs (the two 20-storey towers) sharing
    the cube outline, with a curved-approximation void between them
    and a bridge cap near the top. Per Koltay Facades + Wikipedia
    descriptions: 'two structures forming a single cube eroded by a
    fluid void'.

    Geometry:
      - Slab L: occupies left third of cube
      - Slab R: occupies right third of cube
      - Centre: 8-segment polygonal arc approximating the curved void
      - Bridge: top 18% of height closing the gap (the 'connected at top')
    """
    cx, cy = centroid_xy
    objs = []
    half_w, half_d = w / 2, d / 2
    slab_w = w * 0.32   # each tower is ~1/3 of cube width
    bridge_h_frac = 0.18
    void_w = w - 2 * slab_w

    # Inner-edge curve (8-segment arc, approximates "fluid void")
    arc_x_amp = void_w * 0.18  # how much the inner edge bows inward
    arc_segments = 8
    def inner_edge_xs(side_sign):
        # For each of arc_segments+1 points along the depth, compute
        # an X that bows inward then back out. side_sign=+1 means
        # left tower's right edge; -1 means right tower's left edge.
        pts = []
        for i in range(arc_segments + 1):
            t = i / arc_segments
            # cosine bow — symmetric arc, max amplitude at t=0.5
            bow = math.sin(t * math.pi) * arc_x_amp * side_sign
            y = -half_d + t * d
            x_outer = side_sign * (half_w - slab_w)   # straight inner edge would sit here
            pts.append((x_outer - bow, y))
        return pts

    c, s = math.cos(rot_rad), math.sin(rot_rad)
    def world(pts_local):
        return [(c * x - s * y + cx, s * x + c * y + cy) for (x, y) in pts_local]

    # ── Left tower polygon (outer left edge + curved inner edge) ──
    left_outer = [(-half_w, -half_d), (-half_w, half_d)]
    left_inner = list(reversed(inner_edge_xs(+1)))   # walk back along depth from +half_d to -half_d
    left_ring_local = left_outer + left_inner
    left_ring_world = world(left_ring_local)
    bm_l = bmesh.new()
    extrude_prism(bm_l, left_ring_world, 0.0, h)
    me = bpy.data.meshes.new("opus_left_mesh")
    bm_l.to_mesh(me); bm_l.free()
    me.materials.append(MAT_OPUS_GLASS)
    o = bpy.data.objects.new("opus_left", me)
    bpy.context.collection.objects.link(o)
    objs.append(o)

    # ── Right tower polygon ──
    right_inner = inner_edge_xs(-1)   # forward depth -d/2 → +d/2
    right_outer = [(half_w, half_d), (half_w, -half_d)]
    right_ring_local = right_inner + right_outer
    right_ring_world = world(right_ring_local)
    bm_r = bmesh.new()
    extrude_prism(bm_r, right_ring_world, 0.0, h)
    me = bpy.data.meshes.new("opus_right_mesh")
    bm_r.to_mesh(me); bm_r.free()
    me.materials.append(MAT_OPUS_GLASS)
    o = bpy.data.objects.new("opus_right", me)
    bpy.context.collection.objects.link(o)
    objs.append(o)

    # ── Bridge connecting the two towers at the top (closes the void) ──
    bridge_z0 = h * (1.0 - bridge_h_frac)
    bridge_ring_local = rect_ring_centered(0, 0, w * 0.96, d * 0.94, 0)
    bridge_ring_world = world(bridge_ring_local)
    bm_br = bmesh.new()
    extrude_prism(bm_br, bridge_ring_world, bridge_z0, h)
    me = bpy.data.meshes.new("opus_bridge_mesh")
    bm_br.to_mesh(me); bm_br.free()
    me.materials.append(MAT_OPUS_BRIDGE)
    o = bpy.data.objects.new("opus_bridge", me)
    bpy.context.collection.objects.link(o)
    objs.append(o)

    return objs

def build_vision_bent(centroid_xy, w, d, h, rot_rad):
    """Vision Tower v3: double-tilted bent glass façade per Dewan +
    Architizer description. Two parallelepipeds tilted slightly
    inward, sharing a meeting edge at the front.
    """
    cx, cy = centroid_xy
    objs = []
    half_w, half_d = w / 2, d / 2
    tilt = 0.06   # 6% lean toward each other at the front face
    c, s = math.cos(rot_rad), math.sin(rot_rad)

    # Two slabs sharing the back wall, meeting at the front centre.
    # Each slab is a trapezoid in plan (back wider, front converging).
    for side_sign in (+1, -1):
        x_back  = side_sign * (-half_w + (1.0 - tilt) * half_w * 0)  # back-outer X
        x_front = side_sign * half_w * tilt                            # front-inner X
        x_outer_back = side_sign * half_w
        x_outer_front = side_sign * (half_w * (1 - tilt))
        # plan: 4 corners (back-outer, back-inner=meeting, front-meeting, front-outer)
        ring_local = [
            (x_outer_back, -half_d),   # back outer
            (0.0,          -half_d),   # back middle (meeting at back)
            (0.0,           half_d),   # front middle (meeting at front)
            (x_outer_front, half_d),   # front outer
        ]
        # Reverse for CCW depending on side
        if side_sign < 0:
            ring_local = list(reversed(ring_local))
        ring_world = [(c * x - s * y + cx, s * x + c * y + cy) for (x, y) in ring_local]
        bm = bmesh.new()
        extrude_prism(bm, ring_world, 0.0, h)
        me = bpy.data.meshes.new("vision_slab_mesh")
        bm.to_mesh(me); bm.free()
        me.materials.append(MAT_VISION_GLASS)
        o = bpy.data.objects.new("vision_slab_%d" % side_sign, me)
        bpy.context.collection.objects.link(o)
        objs.append(o)

    # Subtle crown — small set-back top
    top_ring = rect_ring_centered(cx, cy, w * 0.6, d * 0.7, rot_rad)
    bm_t = bmesh.new()
    extrude_prism(bm_t, top_ring, h - 8.0, h)
    me = bpy.data.meshes.new("vision_crown_mesh")
    bm_t.to_mesh(me); bm_t.free()
    me.materials.append(MAT_DARK)
    o = bpy.data.objects.new("vision_crown", me)
    bpy.context.collection.objects.link(o)
    objs.append(o)
    return objs

def build_art_deco_crown(centroid_xy, ring_xy, body_top_z, h, mat=MAT_FRAME):
    """Stepped Art Deco crown — three concentric setbacks above the
    body, each smaller than the last. Stand-in for the Chrysler-
    inspired Churchill Tower silhouette."""
    objs = []
    crown_h = h - body_top_z
    steps = 3
    step_h = crown_h / steps
    for i in range(steps):
        scale = 0.85 - i * 0.20
        z0 = body_top_z + i * step_h
        z1 = body_top_z + (i + 1) * step_h
        step_ring = scale_ring(ring_xy, scale)
        bm = bmesh.new()
        extrude_prism(bm, step_ring, z0, z1)
        mesh = bpy.data.meshes.new("artdeco_step_mesh")
        bm.to_mesh(mesh); bm.free()
        mesh.materials.append(mat)
        obj = bpy.data.objects.new("artdeco_step_%d" % i, mesh)
        bpy.context.collection.objects.link(obj)
        objs.append(obj)
    return objs

def build_manual_building(spec):
    """Build a building from MANUAL_BUILDINGS spec (no OSM way)."""
    cx, cy = lnglat_to_xy(spec["lng"], spec["lat"])
    w, d = spec["footprint_w"], spec["footprint_d"]
    h = spec["height"]
    rot_rad = math.radians(spec.get("rotation_deg", 0.0))
    shape = spec.get("shape", "standard_3tier")
    name = spec["name"]
    coll = bpy.context.collection
    parent_objs = []

    if shape == "opus_two_towers":
        parent_objs.extend(build_opus_two_towers((cx, cy), w, d, h, rot_rad))
        trunk = parent_objs[0]
    elif shape == "vision_bent":
        parent_objs.extend(build_vision_bent((cx, cy), w, d, h, rot_rad))
        trunk = parent_objs[0]
    elif shape == "art_deco_stepped_crown":
        # Churchill — warm Chrysler-stone trunk + stepped crown
        ring = rect_ring_centered(cx, cy, w, d, rot_rad)
        bm = bmesh.new()
        extrude_prism(bm, ring, 0.0, PODIUM_TOP_M)
        body_ring = scale_ring(ring, 0.85)
        body_top_z = h - 30.0  # 30 m of stepped crown
        extrude_prism(bm, body_ring, PODIUM_TOP_M, body_top_z)
        mesh = bpy.data.meshes.new("artdeco_trunk_mesh")
        bm.to_mesh(mesh); bm.free()
        mesh.materials.append(MAT_GLASS)
        trunk = bpy.data.objects.new(slugify(name) + "_trunk", mesh)
        coll.objects.link(trunk)
        parent_objs.append(trunk)
        # Per-floor spandrels using warm Chrysler-stone material
        for f in range(1, int(h / 4.5)):
            z = f * 4.5
            if z >= body_top_z - 1: break
            ring_for_band = ring if z < PODIUM_TOP_M else body_ring
            band = add_horizontal_floor_band(coll, ring_for_band, z, height=0.6, proud=0.10, mat=MAT_CHURCHILL_BEIGE)
            parent_objs.append(band)
        # Stepped crown — beige stone
        parent_objs.extend(build_art_deco_crown((cx, cy), body_ring, body_top_z, h, mat=MAT_CHURCHILL_BEIGE))
    elif shape == "low_rise_podium":
        ring = rect_ring_centered(cx, cy, w, d, rot_rad)
        bm = bmesh.new()
        extrude_prism(bm, ring, 0.0, h)
        mesh = bpy.data.meshes.new("podium_mesh")
        bm.to_mesh(mesh); bm.free()
        mesh.materials.append(MAT_DARK)
        trunk = bpy.data.objects.new(slugify(name) + "_podium", mesh)
        coll.objects.link(trunk)
        parent_objs.append(trunk)
    else:
        # standard_3tier or standard_2tier
        ring = rect_ring_centered(cx, cy, w, d, rot_rad)
        bm = bmesh.new()
        if h <= SIGNATURE_BODY_FLOOR:
            extrude_prism(bm, ring, 0.0, h)
            body_top_z = h
        else:
            extrude_prism(bm, ring, 0.0, PODIUM_TOP_M)
            body_ring = scale_ring(ring, 0.70)
            if h > 35.0:
                body_top_z = h - CROWN_H_M
                extrude_prism(bm, body_ring, PODIUM_TOP_M, body_top_z)
                crown_ring = scale_ring(ring, 0.50)
                extrude_prism(bm, crown_ring, body_top_z, h)
            else:
                extrude_prism(bm, body_ring, PODIUM_TOP_M, h)
                body_top_z = h
        mesh = bpy.data.meshes.new("manual_mesh")
        bm.to_mesh(mesh); bm.free()
        mesh.materials.append(MAT_GLASS)
        trunk = bpy.data.objects.new(slugify(name) + "_trunk", mesh)
        coll.objects.link(trunk)
        parent_objs.append(trunk)
        # Hero detail: per-floor spandrels + mullions
        if h > 35.0:
            for f in range(1, int(h / 4.5)):
                z = f * 4.5
                if z >= body_top_z - 1: break
                ring_for_band = ring if z < PODIUM_TOP_M else scale_ring(ring, 0.70)
                band = add_horizontal_floor_band(coll, ring_for_band, z, height=0.6, proud=0.10, mat=MAT_SPANDREL)
                parent_objs.append(band)
            # Gold ZAAHI accent ring
            bm_g = bmesh.new()
            ring_infl = scale_ring(ring, 1.02)
            extrude_prism(bm_g, ring_infl, body_top_z - 0.5, body_top_z + 0.3)
            mg = bpy.data.meshes.new("gold_mesh")
            bm_g.to_mesh(mg); bm_g.free()
            mg.materials.append(MAT_GOLD)
            og = bpy.data.objects.new(slugify(name) + "_gold", mg)
            coll.objects.link(og)
            parent_objs.append(og)

    # Rename trunk for hero export matching
    trunk.name = "M_%s" % slugify(name)
    for p in parent_objs[1:]:
        p.parent = trunk

    return trunk, parent_objs, {"name": name, "height_m": h, "shape": shape}

# ── Process all ways ──────────────────────────────────────────────
ways = [e for e in OSM["elements"] if e["type"] == "way"]
print("[zaahi] processing %d ways" % len(ways))

per_building_info = []
hero_objs = {}      # slug → list of objects (main + gold)

bt0 = time.time()
for w in ways:
    obj, info = build_building(w)
    if obj is None:
        continue
    per_building_info.append(info)
    if info["hero"] and info["name"]:
        slug = slugify(info["name"])
        hero_objs.setdefault(slug, []).extend(info["objs"])

# ── Add manual buildings (founder-listed heroes missing from OSM) ─
print("[zaahi] adding %d manual buildings" % len(MANUAL_BUILDINGS))
for spec in MANUAL_BUILDINGS:
    trunk, objs, info = build_manual_building(spec)
    per_building_info.append({
        "way_id": None,
        "name": info["name"],
        "height_m": info["height_m"],
        "hero": True,
        "tall_named": info["height_m"] >= 50,
        "tier": info["shape"],
        "detail_level": "manual_hero",
        "objs": objs,
    })
    slug = slugify(info["name"])
    hero_objs[slug] = objs

build_secs = time.time() - bt0
print("[zaahi] geometry built: %d objects in %.1fs" % (len(per_building_info), build_secs))

# ── Combined GLB ──────────────────────────────────────────────────
combined_path = os.path.join(OUT_DIR, "business-bay-all.glb")
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.data.objects:
    if obj.type == "MESH":
        obj.select_set(True)

try:
    bpy.ops.export_scene.gltf(
        filepath=combined_path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        use_selection=False,
    )
    print("[zaahi] combined GLB: %s (%.1f KB)" % (combined_path, os.path.getsize(combined_path) / 1024))
except Exception as e:
    print("[zaahi] combined GLB FAILED: %r" % e)

# ── Hero individual GLBs ──────────────────────────────────────────
hero_results = []
for slug, objs in hero_objs.items():
    if not objs:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    out_path = os.path.join(HERO_DIR, "%s.glb" % slug)
    try:
        bpy.ops.export_scene.gltf(
            filepath=out_path,
            export_format="GLB",
            export_apply=True,
            export_yup=True,
            use_selection=True,
        )
        size_kb = os.path.getsize(out_path) / 1024
        print("[zaahi] hero: %-40s  %6.1f KB" % (os.path.basename(out_path), size_kb))
        hero_results.append({"slug": slug, "objs": len(objs), "kb": size_kb})
    except Exception as e:
        print("[zaahi] hero %s FAILED: %r" % (slug, e))

# ── Stats sidecar ─────────────────────────────────────────────────
named_count = sum(1 for x in per_building_info if x["name"])
explicit_h = sum(1 for x in per_building_info if x["height_m"] != DEFAULT_HEIGHT_M)
fallback_h = sum(1 for x in per_building_info if x["height_m"] == DEFAULT_HEIGHT_M)
heroes_matched = sum(1 for x in per_building_info if x["hero"])
total_verts = sum(len(o.data.vertices) for o in bpy.data.objects if o.type == "MESH")
total_tris  = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == "MESH")

stats = {
    "buildings_kept": len(per_building_info),
    "named": named_count,
    "with_explicit_height": explicit_h,
    "fallback_height_15m": fallback_h,
    "heroes_matched": heroes_matched,
    "total_vertices": total_verts,
    "total_triangles": total_tris,
    "combined_glb_kb": round(os.path.getsize(combined_path) / 1024, 1) if os.path.exists(combined_path) else None,
    "heroes": hero_results,
    "build_seconds": round(build_secs, 1),
    "elapsed_total_seconds": round(time.time() - t0, 1),
}
stats_path = os.path.join(OUT_DIR, "business-bay-all.stats.json")
with open(stats_path, "w") as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)
print("[zaahi] stats: %s" % stats_path)
print("[zaahi] total elapsed: %.1fs" % (time.time() - t0))
print("[zaahi] verts: %d  triangles: %d  combined: %.1f KB" % (
    total_verts, total_tris,
    stats["combined_glb_kb"] or 0,
))
