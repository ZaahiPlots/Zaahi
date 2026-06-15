# Render the RAW Meshy GLB as-is (NO decimate, NO transform) to judge source quality.
# Run: blender -b -P _blender_inspect_raw.py -- <CATEGORY>
# Output: docs/research/archetype-shots-v2/<cat>-RAW-multi.png (4-view turntable)
#         + prints tri count + non-manifold / hole diagnostics.
import bpy, sys, math, pathlib, mathutils

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["HOTEL"]
cat = argv[0].lower()
ROOT = pathlib.Path("/home/zaahi/zaahi")
raw = ROOT / f"docs/research/3d-buildings-pilot/archetypes/{cat}_raw.glb"
out = ROOT / f"docs/research/archetype-shots-v2/{cat}-RAW-multi.png"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(raw))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print("MESH OBJECTS:", len(meshes), [m.name for m in meshes])
for o in bpy.context.scene.objects:
    o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# diagnostics: tris, loose verts, non-manifold edges
import bmesh
bm = bmesh.new(); bm.from_mesh(obj.data)
tris = sum(1 for f in bm.faces)  # post-import faces (may be quads/ngons)
loose = sum(1 for v in bm.verts if not v.link_edges)
nonman = sum(1 for e in bm.edges if not e.is_manifold)
boundary = sum(1 for e in bm.edges if e.is_boundary)
print(f"FACES:{tris}  VERTS:{len(bm.verts)}  loose_verts:{loose}  non_manifold_edges:{nonman}  boundary_edges(holes):{boundary}")
bm.free()
poly_tri = len(obj.data.polygons)
print("POLYGONS(as-stored):", poly_tri)

# neutral matcap-ish material so we see geometry, not Meshy texture
mat = bpy.data.materials.new("raw"); mat.use_nodes = True
b = mat.node_tree.nodes.get("Principled BSDF")
b.inputs["Base Color"].default_value = (0.55, 0.55, 0.58, 1)
b.inputs["Roughness"].default_value = 0.6
obj.data.materials.clear(); obj.data.materials.append(mat)

# normalize size for framing (NON-destructive to topology; just view scaling)
cs = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
xs=[v.x for v in cs]; ys=[v.y for v in cs]; zs=[v.z for v in cs]
ctr = mathutils.Vector(((min(xs)+max(xs))/2,(min(ys)+max(ys))/2,(min(zs)+max(zs))/2))
span = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs), 1e-6)

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.resolution_x = 1600; sc.render.resolution_y = 440
if sc.world is None: sc.world = bpy.data.worlds.new("w")
try: sc.world.use_nodes=False; sc.world.color=(0.04,0.09,0.16)
except Exception as e: print("world skip",e)
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (0.62,0.62,0.66)
sc.display.shading.show_backface_culling = True   # holes show as see-through

cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data)
sc.collection.objects.link(cam); sc.camera = cam
cam_data.type = "ORTHO"; cam_data.ortho_scale = span * 1.5

# 4 yaw angles in a 4-up strip via render border compositing is overkill;
# instead render 4 separate files then montage outside. Simpler: 4 angles.
angles = [0, 90, 180, 315]
files = []
for i, deg in enumerate(angles):
    a = math.radians(deg)
    r = span * 2.2
    cam.location = (ctr.x + r*math.cos(a), ctr.y + r*math.sin(a), ctr.z + span*0.5)
    d = ctr - cam.location
    cam.rotation_euler = d.to_track_quat('-Z','Y').to_euler()
    sc.render.resolution_x = 540; sc.render.resolution_y = 540
    cam_data.ortho_scale = span * 1.5
    f = ROOT / f"docs/research/archetype-shots-v2/{cat}-RAW-{deg:03d}.png"
    sc.render.filepath = str(f); bpy.ops.render.render(write_still=True)
    files.append(str(f)); print("view", deg, "->", f)
print("RAW_VIEWS_DONE")
