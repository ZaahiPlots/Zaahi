# Blender headless: normalize a raw Meshy archetype GLB and render a preview.
# Run: blender -b -P _blender_normalize_archetype.py -- <CATEGORY> <hexcolor>
# Output: public/glb/archetypes/<cat>.glb  +  docs/research/archetype-shots-v2/<cat>-glb-preview.png
# Normalized to a unit box: X,Y ∈ [-0.5,0.5] centred, Z ∈ [0,1] (base on ground),
# so the map layer scales by (footprintW, footprintD, dataHeight) at runtime.
import bpy, sys, math, pathlib

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["HOTEL", "#7B1E2B"]
cat = argv[0].lower()
hexc = argv[1] if len(argv) > 1 else "#7B1E2B"
ROOT = pathlib.Path("/home/zaahi/zaahi")
raw = ROOT / f"docs/research/3d-buildings-pilot/archetypes/{cat}_raw.glb"
out_glb = ROOT / f"public/glb/archetypes/{cat}.glb"
out_png = ROOT / f"docs/research/archetype-shots-v2/{cat}-glb-preview.png"

def hex_rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(raw))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not meshes:
    print("NO MESH"); sys.exit(1)
# join into one
for o in bpy.context.scene.objects:
    o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ── MESH REPAIR (root-cause fix for the torn decimate) ──────────────────
# Meshy exports split (unwelded) vertices → every edge reads as a boundary,
# so decimate collapses disconnected triangles into holes. Weld FIRST, then
# recalc normals + fill holes + strip the rooftop flagpole artifact.
import bmesh, mathutils as _mu
def _bbox(o):
    cs = [o.matrix_world @ _mu.Vector(c) for c in o.bound_box]
    xs=[v.x for v in cs]; ys=[v.y for v in cs]; zs=[v.z for v in cs]
    return min(xs),max(xs),min(ys),max(ys),min(zs),max(zs)
minx,maxx,miny,maxy,minz,maxz = _bbox(obj)
spanXY = max(maxx-minx, maxy-miny, 1e-6); spanZ = max(maxz-minz,1e-6)
cx0=(minx+maxx)/2; cy0=(miny+maxy)/2

bm = bmesh.new(); bm.from_mesh(obj.data)
b0 = sum(1 for e in bm.edges if e.is_boundary)
# 1) weld coincident verts → restores shared topology
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=spanXY*0.0008)
# 2) delete the rooftop flag/antenna spike — data-driven: scan Z slabs from the
#    top down; the pole has a tiny XY cross-section until we reach the real roof,
#    where the occupied area jumps. Cut everything above that jump.
footArea = max((maxx-minx)*(maxy-miny), 1e-9)
areaCut = footArea * 0.06     # roof considered "real" when slab area > 6% of footprint
roofTop = maxz
N = 80
for i in range(N):                       # descend from the very top
    t = maxz - (spanZ * i / N)
    vs = [v for v in bm.verts if v.co.z >= t]
    if len(vs) < 3: continue
    axs=[v.co.x for v in vs]; ays=[v.co.y for v in vs]
    area = (max(axs)-min(axs))*(max(ays)-min(ays))
    if area > areaCut:                   # first real (wide) slab from the top = roof
        roofTop = t
        break
kill=[f for f in bm.faces if f.calc_center_median().z > roofTop + spanZ*0.002]
if kill: bmesh.ops.delete(bm, geom=kill, context="FACES")
print(f"FLAG-CUT roofTop_frac={(roofTop-minz)/spanZ:.3f} faces_killed={len(kill)}")
# 3) fill any genuine holes left after welding / flag removal
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=8)
# 4) recompute consistent outward normals
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
b1 = sum(1 for e in bm.edges if e.is_boundary)
print(f"REPAIR boundary_edges {b0} -> {b1}  faces_removed(flag):{len(kill)}  faces_now:{len(bm.faces)}")
bm.to_mesh(obj.data); bm.free(); obj.data.update()

# world-space bbox
import mathutils
cs = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
xs = [v.x for v in cs]; ys = [v.y for v in cs]; zs = [v.z for v in cs]
minx, maxx = min(xs), max(xs); miny, maxy = min(ys), max(ys); minz, maxz = min(zs), max(zs)
w = max(maxx - minx, 1e-6); d = max(maxy - miny, 1e-6); ht = max(maxz - minz, 1e-6)
# center XY, base to 0
obj.location.x -= (minx + maxx) / 2
obj.location.y -= (miny + maxy) / 2
obj.location.z -= minz
bpy.ops.object.transform_apply(location=True)
# scale to unit box: X,Y span 1 (→ ±0.5), Z span 1 (0..1)
obj.scale = (1.0 / w, 1.0 / d, 1.0 / ht)
bpy.ops.object.transform_apply(scale=True)

# decimate ONLY if genuinely heavy — and use PLANAR (angle-limited) decimation
# which merges coplanar faces without distorting shape/boundaries. We are NOT
# on mobile: keep a generous budget so the mesh stays intact.
tri0 = len(obj.data.polygons)
TRI_BUDGET = 30000
if tri0 > TRI_BUDGET:
    m = obj.modifiers.new("dec", "DECIMATE")
    m.decimate_type = "DISSOLVE"      # planar — preserves silhouette & window grid
    m.angle_limit = math.radians(1.0)
    m.use_dissolve_boundaries = False
    bpy.ops.object.modifier_apply(modifier="dec")
print("tris:", tri0, "->", len(obj.data.polygons))

# flat single-colour material (legend hex) — preview only; map layer recolours too
mat = bpy.data.materials.new(f"{cat}_mat"); mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
r, g, b = hex_rgb(hexc)
bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
bsdf.inputs["Roughness"].default_value = 0.7
mat.diffuse_color = (r, g, b, 1)   # Workbench MATERIAL viewport colour (preview render)
obj.data.materials.clear(); obj.data.materials.append(mat)

out_glb.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out_glb), export_format="GLB", use_selection=False)
print("GLB:", out_glb, out_glb.stat().st_size, "bytes")

# ── preview render (Workbench, fast, no GPU needed) ──
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.render.resolution_x = 900; sc.render.resolution_y = 900
sc.render.film_transparent = False
if sc.world is None:
    sc.world = bpy.data.worlds.new("w")
try:
    sc.world.use_nodes = False
    sc.world.color = (0.04, 0.09, 0.16)
except Exception as e:
    print("world color skip:", e)
# iso-ish camera framing the unit box
cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data)
sc.collection.objects.link(cam); sc.camera = cam
cam.location = (1.8, -1.8, 1.6);
look = mathutils.Vector((0, 0, 0.5))
direction = look - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
cam_data.lens = 50
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
out_png.parent.mkdir(parents=True, exist_ok=True)
sc.render.filepath = str(out_png)
bpy.ops.render.render(write_still=True)
print("PNG:", out_png)
