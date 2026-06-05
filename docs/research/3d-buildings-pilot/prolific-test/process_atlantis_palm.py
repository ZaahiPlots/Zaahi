# Decimate-only pipeline for the Prolific-sourced Atlantis The Palm GLB.
#
# Why this differs from pipeline_simple.py / pipeline_force_zup.py:
# - Source is architectural CAD (named-mesh, 7 procedural materials, 0
#   textures) at near-real-world scale, NOT Meshy AI reconstruction.
# - Axis auto-detect in pipeline_simple.py picks the longest axis as
#   "vertical" — for Atlantis, longest axis is X (308m wing-to-wing),
#   not Z (154m height). That would rotate the wings vertical.
#   Solution: skip rotation entirely. Source is already Y-up per glTF
#   spec; Blender import flips to Z-up; export_yup=True restores.
# - Source proportions are CAD-correct; non-uniform scale to
#   advertised real dims would distort. Skip scale, keep source meters,
#   let founder dev-panel sizeScale handle final tuning.
#
# Output target: < 15 MB, < 300 K tris, axis preserved.
#
# Usage:
#   blender --background --python process_atlantis_palm.py -- <ratio>

import bpy, os, sys
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DECIMATE_RATIO = float(args[0]) if args else 0.40

SRC = "/home/zaahi/Downloads/Atlantis_plam_Hotel.glb"
DST = "/home/zaahi/zaahi/public/glb/buildings/atlantis-palm.glb"
META = "/home/zaahi/zaahi/docs/research/3d-buildings-pilot/prolific-test/process_meta_atlantis_palm.txt"
TEXTURE_MAX_DIM = 1024

print(f"== atlantis-palm == decimate-only ratio={DECIMATE_RATIO}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
faces_imported = sum(len(o.data.polygons) for o in mesh_objs)
verts_imported = sum(len(o.data.vertices) for o in mesh_objs)
print(f"imported: {faces_imported} faces, {verts_imported} verts, {len(mesh_objs)} meshes")

# Decimate every mesh
for o in mesh_objs:
    mod = o.modifiers.new(name="decimate", type="DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = DECIMATE_RATIO
    mod.use_collapse_triangulate = True
    mod.delimit = {"UV"}
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
faces_after = sum(len(o.data.polygons) for o in mesh_objs)
verts_after = sum(len(o.data.vertices) for o in mesh_objs)
print(f"after decimate: {faces_after} faces, {verts_after} verts")

# Bbox stats (no transforms — diagnostic only)
mins = Vector((float("inf"),)*3); maxs = Vector((float("-inf"),)*3)
for o in mesh_objs:
    for v in o.bound_box:
        w = o.matrix_world @ Vector(v)
        for i in range(3):
            mins[i] = min(mins[i], w[i]); maxs[i] = max(maxs[i], w[i])
size = maxs - mins
print(f"bbox after decimate (Blender Z-up): {tuple(round(x,2) for x in size)}")

# Texture cap (no-op for Atlantis — 0 textures, procedural only)
for img in bpy.data.images:
    if img.size[0] > TEXTURE_MAX_DIM or img.size[1] > TEXTURE_MAX_DIM:
        print(f"resize tex '{img.name}' {img.size[0]}x{img.size[1]} -> {TEXTURE_MAX_DIM}")
        img.scale(min(img.size[0], TEXTURE_MAX_DIM), min(img.size[1], TEXTURE_MAX_DIM))

os.makedirs(os.path.dirname(DST), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for o in mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = mesh_objs[0]
bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
)
size_bytes = os.path.getsize(DST)
print(f"EXPORTED {DST}  {size_bytes} bytes  ({round(size_bytes/1024/1024, 2)} MB)")

with open(META, "w") as f:
    f.write(f"name=atlantis-palm\n")
    f.write(f"source=Prolific (vendor eval 2026-06-05)\n")
    f.write(f"faces_imported={faces_imported}\n")
    f.write(f"verts_imported={verts_imported}\n")
    f.write(f"faces_final={faces_after}\n")
    f.write(f"verts_final={verts_after}\n")
    f.write(f"decimate_ratio={DECIMATE_RATIO}\n")
    f.write(f"scale=preserved (CAD source already near real-world meters)\n")
    f.write(f"rotation=preserved (source Y-up per glTF spec)\n")
    f.write(f"bbox_blender_zup={tuple(round(x,2) for x in size)}\n")
    f.write(f"size_bytes={size_bytes}\n")
