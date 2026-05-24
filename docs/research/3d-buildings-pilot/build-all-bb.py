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
    is_hero = (name or "").lower() in HERO_KEYS
    is_tall_named = bool(name) and h >= 50.0
    way_id = way["id"]
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
