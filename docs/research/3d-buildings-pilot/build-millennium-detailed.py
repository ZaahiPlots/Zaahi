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
GLASS_RGBA     = (0.03, 0.06, 0.11, 1.0)
WHITE_RGBA     = (0.92, 0.91, 0.87, 1.0)
DARK_RGBA      = (0.32, 0.31, 0.30, 1.0)
METAL_RGBA     = (0.20, 0.20, 0.22, 1.0)


def make_material(name, base_rgba, metallic=0.05, roughness=0.7, transmission=0.0, glassy=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes.get("Principled BSDF")
    if n:
        n.inputs["Base Color"].default_value = base_rgba
        if "Roughness" in n.inputs:
            n.inputs["Roughness"].default_value = roughness
        if "Metallic" in n.inputs:
            n.inputs["Metallic"].default_value = metallic
        for tname in ("Transmission Weight", "Transmission"):
            if tname in n.inputs and transmission > 0:
                n.inputs[tname].default_value = transmission
                break
        if glassy and "Alpha" in n.inputs:
            n.inputs["Alpha"].default_value = 0.55
            m.blend_method = "BLEND"
    return m


MAT_GLASS = make_material("Glass_BlueGrey", (0.10, 0.16, 0.24, 1.0), metallic=0.05, roughness=0.65, transmission=0.0, glassy=False)
MAT_FRAME = make_material("Frame_White",    WHITE_RGBA, metallic=0.05, roughness=0.82)
MAT_DARK  = make_material("Concrete_Dark",  DARK_RGBA,  metallic=0.05, roughness=0.85)
MAT_GOLD  = make_material("ZAAHI_Gold",     GOLD_RGBA,  metallic=0.65, roughness=0.30)
MAT_METAL = make_material("Antenna_Metal",  METAL_RGBA, metallic=0.85, roughness=0.30)

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

# Subtle horizontal floor bands on broad face — light grey spandrels
# every 5 floors, slightly proud of the glass. Reads as "this tower has
# articulated floors", much cleaner than the prior X-bracing experiment.
BAND_PROUD = 0.10
BAND_HEIGHT = 0.6
for f in range(2, FLOORS, 5):
    z_mid = f * FLOOR_H
    for side_sign in (+1, -1):
        cy_local = side_sign * (D / 2 + BAND_PROUD / 2)
        cx_w, cy_w = to_world(0.0, cy_local)
        # Run band only between the two frames (don't overlap them)
        band_len = (FRAME_OFFSET * 2) - FRAME_THICK
        bm_b = bmesh.new()
        hx, hy, hz = band_len / 2, BAND_PROUD / 2, BAND_HEIGHT / 2
        verts_local = [
            (-hx, -hy, z_mid - hz), (hx, -hy, z_mid - hz), (hx, hy, z_mid - hz), (-hx, hy, z_mid - hz),
            (-hx, -hy, z_mid + hz), (hx, -hy, z_mid + hz), (hx, hy, z_mid + hz), (-hx, hy, z_mid + hz),
        ]
        bv = []
        for x, y, z in verts_local:
            rx = cR * x - sR * y + cx_w
            ry = sR * x + cR * y + cy_w
            bv.append(bm_b.verts.new((rx, ry, z)))
        bm_b.verts.ensure_lookup_table()
        for fi in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            bm_b.faces.new([bv[i] for i in fi])
        bm_b.normal_update()
        make_object("FloorBand_%d_%d" % (side_sign, f), bm_b, [MAT_FRAME])

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

# Floor accent lines (every 5 floors)
for f in range(5, FLOORS, 5):
    z = f * FLOOR_H
    bm_l = box_bmesh(0, 0, z - 0.08, z + 0.08, W + 0.12, D + 0.12, rot_rad)
    make_object("FloorLine_%d" % f, bm_l, [MAT_DARK])

# Ground plane — sandy concrete grey, contrasts the building cleanly
import mathutils
bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -0.05))
ground = bpy.context.object
ground.name = "Ground"
ground_mat = make_material("Ground_Sand", (0.28, 0.26, 0.22, 1.0), metallic=0.0, roughness=0.95)
ground.data.materials.append(ground_mat)

# Sun — single key light, moderate energy
sun = bpy.data.lights.new("Sun", type="SUN")
sun.energy = 1.5
sun.angle = math.radians(2.5)
sun_obj = bpy.data.objects.new("Sun", sun)
sun_obj.rotation_euler = (math.radians(50), math.radians(10), math.radians(40))
bpy.context.collection.objects.link(sun_obj)

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
scn.view_settings.exposure = -1.4
scn.world.use_nodes = True
# Replace plain background with a procedural Sky Texture so the scene
# gets proper IBL falloff — that's what makes glass-like materials
# show contrast against the sky (real photo-style lighting).
ntree = scn.world.node_tree
ntree.nodes.clear()
sky_node = ntree.nodes.new("ShaderNodeTexSky")
sky_node.sky_type = "MULTIPLE_SCATTERING"
sky_node.sun_elevation = math.radians(40)
sky_node.sun_rotation = math.radians(120)
sky_node.air_density = 1.2
bg_node = ntree.nodes.new("ShaderNodeBackground")
bg_node.inputs["Strength"].default_value = 0.6
out_node = ntree.nodes.new("ShaderNodeOutputWorld")
ntree.links.new(sky_node.outputs["Color"], bg_node.inputs["Color"])
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
