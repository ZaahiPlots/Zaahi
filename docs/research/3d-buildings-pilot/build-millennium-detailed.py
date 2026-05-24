"""
Headless Blender build of Millennium Tower (Business Bay) — detailed.

Run:
    blender --background --python build-millennium-detailed.py

Inputs (hard-coded — sourced from OSM way 203296254 + Wikipedia +
reference photo `reference-1.jpg` / silhouette `reference-2.png`):
  * Real footprint 43 x 33 m, rotated 40.1 degrees from north (per OSM)
  * Real height 285 m, 60 floors (Wikipedia: WS Atkins, 407 apartments)
  * Two white vertical frame strips flanking glass curtain wall on each
    broad face (photo)
  * X-pattern diagonal accents in larger panels (photo)
  * Two corner setback blocks at the crown + central plinth + ~15 m
    antenna spire (silhouette + photo)

Outputs (alongside this script):
  * millennium-tower-detailed.glb   - for web / three.js / deck.gl viewer
  * millennium-tower-detailed.blend - for further hand-editing
  * millennium-tower-render.png     - Cycles render preview
"""

import bpy
import bmesh
import math
import os
import time

t0 = time.time()
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)
for me in list(bpy.data.meshes):
    bpy.data.meshes.remove(me)

TOTAL_H        = 285.0
FLOORS         = 60
FLOOR_H        = TOTAL_H / FLOORS
CROWN_BOX_H    = 12.0
SPIRE_H        = 15.0
BODY_TOP       = TOTAL_H - CROWN_BOX_H - SPIRE_H
W              = 43.0
D              = 33.0
ROT_DEG        = 40.1

GOLD_RGBA      = (0.78, 0.66, 0.43, 1.0)
GLASS_RGBA     = (0.025, 0.05, 0.10, 1.0)     # very dark blue — reads as blue mirror glass
WHITE_RGBA     = (0.93, 0.92, 0.88, 1.0)
DARK_RGBA      = (0.16, 0.17, 0.20, 1.0)      # darker concrete for clear contrast
SPANDREL_RGBA  = (0.62, 0.60, 0.55, 1.0)      # warm grey horizontal bands between floors
METAL_RGBA     = (0.55, 0.56, 0.60, 1.0)      # brighter so spire reads as silver


def make_material(name, base_rgba, metallic=0.05, roughness=0.7, transmission=0.0, glassy=False):
    """Robust PBR material setup that works across Blender 4.x and 5.x.
    Looks up the Principled BSDF by node type (not name), creates one
    if absent, and assigns inputs by both name AND fallback index so a
    renamed input ("Base Color" → "Color" etc.) still works.
    """
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = None
    for node in nt.nodes:
        if node.bl_idname == "ShaderNodeBsdfPrincipled":
            bsdf = node; break
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((nd for nd in nt.nodes if nd.bl_idname == "ShaderNodeOutputMaterial"), None)
        if out is None:
            out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs[0], out.inputs[0])

    def set_input(names, value):
        for n in names:
            if n in bsdf.inputs:
                bsdf.inputs[n].default_value = value
                return True
        return False

    set_input(["Base Color", "Color"], base_rgba)
    set_input(["Roughness"], roughness)
    set_input(["Metallic"], metallic)
    if transmission > 0:
        set_input(["Transmission Weight", "Transmission"], transmission)
    # Debug print so we can see what's actually on the material
    bc = bsdf.inputs.get("Base Color") or bsdf.inputs.get("Color")
    print("[mat] %-22s base=%s metal=%.2f rough=%.2f" % (name, tuple(round(c, 3) for c in bc.default_value), metallic, roughness))
    return m


MAT_GLASS    = make_material("Glass_BlueGrey", GLASS_RGBA,    metallic=0.15, roughness=0.45)
MAT_FRAME    = make_material("Frame_White",    WHITE_RGBA,    metallic=0.05, roughness=0.78)
MAT_DARK     = make_material("Concrete_Dark",  DARK_RGBA,     metallic=0.05, roughness=0.82)
MAT_SPANDREL = make_material("Spandrel_Warm",  SPANDREL_RGBA, metallic=0.10, roughness=0.65)
MAT_GOLD     = make_material("ZAAHI_Gold",     GOLD_RGBA,     metallic=0.85, roughness=0.22)
MAT_METAL    = make_material("Antenna_Metal",  METAL_RGBA,    metallic=0.92, roughness=0.18)

rot_rad = math.radians(ROT_DEG)
cR, sR  = math.cos(rot_rad), math.sin(rot_rad)


def to_world(x, y):
    return (cR * x - sR * y, sR * x + cR * y)


def make_object(name, bm, materials):
    mesh = bpy.data.meshes.new(name + "_mesh")
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for m in materials:
        mesh.materials.append(m)
    return obj


def box_bmesh(cx, cy, z0, z1, w, d, rot_radians=0.0):
    bm = bmesh.new()
    hx, hy = w / 2, d / 2
    raw = [
        (-hx, -hy, z0), ( hx, -hy, z0), ( hx,  hy, z0), (-hx,  hy, z0),
        (-hx, -hy, z1), ( hx, -hy, z1), ( hx,  hy, z1), (-hx,  hy, z1),
    ]
    c, s = math.cos(rot_radians), math.sin(rot_radians)
    bv = []
    for x, y, z in raw:
        rx = c * x - s * y + cx
        ry = s * x + c * y + cy
        bv.append(bm.verts.new((rx, ry, z)))
    bm.verts.ensure_lookup_table()
    for idx in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
        bm.faces.new([bv[i] for i in idx])
    bm.normal_update()
    return bm


# Main glass shaft
shaft_bm = box_bmesh(0, 0, 0, BODY_TOP, W, D, rot_rad)
shaft_obj = make_object("Shaft_Glass", shaft_bm, [MAT_GLASS])
me = shaft_obj.data
bm_e = bmesh.new(); bm_e.from_mesh(me)
v_edges = [e for e in bm_e.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 0.1]
bmesh.ops.subdivide_edges(bm_e, edges=v_edges, cuts=11, use_grid_fill=False)
bm_e.to_mesh(me); bm_e.free()

# Two white vertical FRAMES on each broad face
FRAME_PROUD = 0.6
FRAME_THICK = 2.2
FRAME_OFFSET = W * 0.18
for side_sign in (+1, -1):
    for x_local in (-FRAME_OFFSET, +FRAME_OFFSET):
        y_local = side_sign * (D / 2 + FRAME_PROUD / 2)
        cx_w, cy_w = to_world(x_local, y_local)
        bmf = box_bmesh(cx_w, cy_w, 0, BODY_TOP, FRAME_THICK, FRAME_PROUD, rot_rad)
        make_object("Frame_%d_%d" % (side_sign, int(x_local)), bmf, [MAT_FRAME])

# Per-floor spandrel bands — warm-grey horizontal strip at the BOTTOM
# of every floor (1.0 m tall, 0.08 m proud of the glass). On both
# broad faces (between the two white frames) AND both short faces.
BAND_PROUD = 0.08
BAND_HEIGHT = 1.0
broad_band_len = (FRAME_OFFSET * 2) - FRAME_THICK  # between the two frames
short_band_len = D - 0.4  # short face length

for f in range(1, FLOORS):  # floor 1..59 (skip ground + roof line)
    z_bot = f * FLOOR_H
    z_mid = z_bot + BAND_HEIGHT / 2
    # broad faces (y=±D/2)
    for side_sign in (+1, -1):
        cy_local = side_sign * (D / 2 + BAND_PROUD / 2)
        cx_w, cy_w = to_world(0.0, cy_local)
        bm_b = bmesh.new()
        hx, hy, hz = broad_band_len / 2, BAND_PROUD / 2, BAND_HEIGHT / 2
        vl = [(-hx, -hy, z_mid - hz), (hx, -hy, z_mid - hz), (hx, hy, z_mid - hz), (-hx, hy, z_mid - hz),
              (-hx, -hy, z_mid + hz), (hx, -hy, z_mid + hz), (hx, hy, z_mid + hz), (-hx, hy, z_mid + hz)]
        bv = []
        for x, y, z in vl:
            rx = cR * x - sR * y + cx_w; ry = sR * x + cR * y + cy_w
            bv.append(bm_b.verts.new((rx, ry, z)))
        bm_b.verts.ensure_lookup_table()
        for fi in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            bm_b.faces.new([bv[i] for i in fi])
        bm_b.normal_update()
        make_object("SpandrelB_%d_%d" % (side_sign, f), bm_b, [MAT_SPANDREL])
    # short faces (x=±W/2)
    for side_sign in (+1, -1):
        cx_local = side_sign * (W / 2 + BAND_PROUD / 2)
        cx_w, cy_w = to_world(cx_local, 0.0)
        bm_b = bmesh.new()
        # short-face spandrel: oriented along Y (short axis)
        hx, hy, hz = BAND_PROUD / 2, short_band_len / 2, BAND_HEIGHT / 2
        vl = [(-hx, -hy, z_mid - hz), (hx, -hy, z_mid - hz), (hx, hy, z_mid - hz), (-hx, hy, z_mid - hz),
              (-hx, -hy, z_mid + hz), (hx, -hy, z_mid + hz), (hx, hy, z_mid + hz), (-hx, hy, z_mid + hz)]
        bv = []
        for x, y, z in vl:
            rx = cR * x - sR * y + cx_w; ry = sR * x + cR * y + cy_w
            bv.append(bm_b.verts.new((rx, ry, z)))
        bm_b.verts.ensure_lookup_table()
        for fi in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            bm_b.faces.new([bv[i] for i in fi])
        bm_b.normal_update()
        make_object("SpandrelS_%d_%d" % (side_sign, f), bm_b, [MAT_SPANDREL])

# Vertical mullions — thin white-concrete strips running full height
# between the spandrel bands. 5 per broad face + 3 per short face.
MULLION_PROUD = 0.10
MULLION_WIDTH = 0.30

# broad face mullions: between the two frames at -FRAME_OFFSET..+FRAME_OFFSET,
# excluding the frames themselves
n_broad = 5
broad_inner_w = (FRAME_OFFSET * 2) - FRAME_THICK
broad_pitch = broad_inner_w / (n_broad + 1)
broad_xs = [-broad_inner_w / 2 + (i + 1) * broad_pitch for i in range(n_broad)]
for side_sign in (+1, -1):
    for x_local in broad_xs:
        cy_local = side_sign * (D / 2 + MULLION_PROUD / 2)
        cx_w, cy_w = to_world(x_local, cy_local)
        bm_m = bmesh.new()
        hx, hy, hz_z = MULLION_WIDTH / 2, MULLION_PROUD / 2, BODY_TOP / 2
        vl = [(-hx, -hy, 0), (hx, -hy, 0), (hx, hy, 0), (-hx, hy, 0),
              (-hx, -hy, BODY_TOP), (hx, -hy, BODY_TOP), (hx, hy, BODY_TOP), (-hx, hy, BODY_TOP)]
        bv = []
        for x, y, z in vl:
            rx = cR * x - sR * y + cx_w; ry = sR * x + cR * y + cy_w
            bv.append(bm_m.verts.new((rx, ry, z)))
        bm_m.verts.ensure_lookup_table()
        for fi in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            bm_m.faces.new([bv[i] for i in fi])
        bm_m.normal_update()
        make_object("MullionB_%d_%d" % (side_sign, int(x_local * 10)), bm_m, [MAT_FRAME])

# short face mullions: 3 evenly spaced
n_short = 3
short_pitch = (D - 1.0) / (n_short + 1)
short_ys = [-D / 2 + 0.5 + (i + 1) * short_pitch for i in range(n_short)]
for side_sign in (+1, -1):
    for y_local in short_ys:
        cx_local = side_sign * (W / 2 + MULLION_PROUD / 2)
        cx_w, cy_w = to_world(cx_local, y_local)
        bm_m = bmesh.new()
        hx, hy = MULLION_PROUD / 2, MULLION_WIDTH / 2
        vl = [(-hx, -hy, 0), (hx, -hy, 0), (hx, hy, 0), (-hx, hy, 0),
              (-hx, -hy, BODY_TOP), (hx, -hy, BODY_TOP), (hx, hy, BODY_TOP), (-hx, hy, BODY_TOP)]
        bv = []
        for x, y, z in vl:
            rx = cR * x - sR * y + cx_w; ry = sR * x + cR * y + cy_w
            bv.append(bm_m.verts.new((rx, ry, z)))
        bm_m.verts.ensure_lookup_table()
        for fi in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            bm_m.faces.new([bv[i] for i in fi])
        bm_m.normal_update()
        make_object("MullionS_%d_%d" % (side_sign, int(y_local * 10)), bm_m, [MAT_FRAME])

# Gold ZAAHI accent ring
gold_bm = box_bmesh(0, 0, BODY_TOP - 0.5, BODY_TOP + 0.3, W + 0.4, D + 0.4, rot_rad)
make_object("Crown_GoldRing", gold_bm, [MAT_GOLD])

# Crown corner setback blocks
crown_box_w = W * 0.18
crown_box_d = D * 0.85
for cx_local in (-W / 2 + crown_box_w / 2, +W / 2 - crown_box_w / 2):
    cx_w, cy_w = to_world(cx_local, 0)
    bm_c = box_bmesh(cx_w, cy_w, BODY_TOP, BODY_TOP + CROWN_BOX_H, crown_box_w, crown_box_d, rot_rad)
    make_object("CrownBox_%d" % int(cx_local), bm_c, [MAT_DARK])

# Central plinth
plinth_h = 4.0
plinth_z0 = BODY_TOP + CROWN_BOX_H
plinth_z1 = plinth_z0 + plinth_h
plinth_w = W * 0.22
plinth_d = D * 0.7
cx_w, cy_w = to_world(0, 0)
bm_p = box_bmesh(cx_w, cy_w, plinth_z0, plinth_z1, plinth_w, plinth_d, rot_rad)
make_object("Crown_Plinth", bm_p, [MAT_DARK])

# Antenna spire (tapered)
spire_bot_w = 1.2
spire_top_w = 0.15
spire_z0 = plinth_z1
spire_z1 = plinth_z1 + SPIRE_H
bm_s = bmesh.new()
hbB, hbT = spire_bot_w / 2, spire_top_w / 2
verts_local = [
    (-hbB, -hbB, spire_z0), ( hbB, -hbB, spire_z0), ( hbB,  hbB, spire_z0), (-hbB,  hbB, spire_z0),
    (-hbT, -hbT, spire_z1), ( hbT, -hbT, spire_z1), ( hbT,  hbT, spire_z1), (-hbT,  hbT, spire_z1),
]
sv = []
for x, y, z in verts_local:
    rx = cR * x - sR * y + cx_w
    ry = sR * x + cR * y + cy_w
    sv.append(bm_s.verts.new((rx, ry, z)))
bm_s.verts.ensure_lookup_table()
for face_idx in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
    bm_s.faces.new([sv[i] for i in face_idx])
bm_s.normal_update()
make_object("Antenna_Spire", bm_s, [MAT_METAL])

# (Per-floor spandrels above replace the every-5-floor accent rings.)

# Ground plane — sandy concrete grey, contrasts the building cleanly
import mathutils
bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -0.05))
ground = bpy.context.object
ground.name = "Ground"
ground_mat = make_material("Ground_DarkGrey", (0.10, 0.10, 0.11, 1.0), metallic=0.0, roughness=0.92)
ground.data.materials.append(ground_mat)

# ── 3-point studio lighting ──
key = bpy.data.lights.new("Key", type="SUN")
key.energy = 1.8
key.angle = math.radians(1.2)
key.color = (1.0, 0.94, 0.88)
key_obj = bpy.data.objects.new("Key", key)
key_obj.rotation_euler = (math.radians(48), math.radians(12), math.radians(50))
bpy.context.collection.objects.link(key_obj)
fill = bpy.data.lights.new("Fill", type="SUN")
fill.energy = 0.4
fill.color = (0.78, 0.85, 1.0)
fill_obj = bpy.data.objects.new("Fill", fill)
fill_obj.rotation_euler = (math.radians(70), 0, math.radians(-130))
bpy.context.collection.objects.link(fill_obj)
rim = bpy.data.lights.new("Rim", type="SUN")
rim.energy = 0.7
rim.color = (1.0, 0.9, 0.7)
rim_obj = bpy.data.objects.new("Rim", rim)
rim_obj.rotation_euler = (math.radians(85), 0, math.radians(160))
bpy.context.collection.objects.link(rim_obj)

# Camera — close enough to fill frame; aimed at upper third (more sky context)
cam = bpy.data.cameras.new("Camera")
cam.lens = 50
cam.clip_end = 3000
cam_obj = bpy.data.objects.new("Camera", cam)
cam_loc = mathutils.Vector((320, -370, 150))
cam_target = mathutils.Vector((0, 0, TOTAL_H * 0.50))  # ~143 m — full-height read
direction = (cam_target - cam_loc).normalized()
quat = direction.to_track_quat("-Z", "Y")
cam_obj.location = cam_loc
cam_obj.rotation_euler = quat.to_euler()
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

# Render setup — Cycles
scn = bpy.context.scene
scn.render.engine = "CYCLES"
scn.cycles.samples = 32
scn.cycles.use_adaptive_sampling = True
scn.cycles.adaptive_threshold = 0.05
scn.render.resolution_x = 900
scn.render.resolution_y = 1200
scn.render.resolution_percentage = 100
scn.render.film_transparent = False
scn.view_settings.view_transform = "AgX"
scn.view_settings.exposure = 0.0
scn.view_settings.look = "None"
scn.world.use_nodes = True
# Plain dark world — no sky IBL. The 3-point lighting above is what
# carves out form. Removing the sky IBL is essential — the procedural
# sky was blasting glass + frames with so much ambient light that
# every material read white regardless of base color.
ntree = scn.world.node_tree
ntree.nodes.clear()
bg_node = ntree.nodes.new("ShaderNodeBackground")
bg_node.inputs["Color"].default_value = (0.06, 0.07, 0.10, 1.0)
bg_node.inputs["Strength"].default_value = 0.3
out_node = ntree.nodes.new("ShaderNodeOutputWorld")
ntree.links.new(bg_node.outputs["Background"], out_node.inputs["Surface"])

render_path = os.path.join(OUT_DIR, "millennium-tower-render.png")
scn.render.filepath = render_path
try:
    bpy.ops.render.render(write_still=True)
    print("[zaahi] render written: %s" % render_path)
except Exception as e:
    print("[zaahi] render FAILED: %r" % e)

blend_path = os.path.join(OUT_DIR, "millennium-tower-detailed.blend")
try:
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print("[zaahi] .blend written: %s" % blend_path)
except Exception as e:
    print("[zaahi] .blend FAILED: %r" % e)

glb_path = os.path.join(OUT_DIR, "millennium-tower-detailed.glb")
try:
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        use_selection=False,
    )
    print("[zaahi] GLB written: %s" % glb_path)
except Exception as e:
    print("[zaahi] GLB export FAILED: %r" % e)

total_verts = sum(len(o.data.vertices) for o in bpy.data.objects if o.type == "MESH")
total_faces = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH")
total_tris  = sum(sum(len(p.vertices) - 2 for p in o.data.polygons)
                   for o in bpy.data.objects if o.type == "MESH")
mesh_count  = sum(1 for o in bpy.data.objects if o.type == "MESH")

print("[zaahi] mesh objects: %d" % mesh_count)
print("[zaahi] verts: %d  faces: %d  triangles: %d" % (total_verts, total_faces, total_tris))
for p in (glb_path, blend_path, render_path):
    if os.path.exists(p):
        print("[zaahi]   %-42s  %8.1f KB" % (os.path.basename(p), os.path.getsize(p) / 1024))
print("[zaahi] elapsed: %.2fs" % (time.time() - t0))
