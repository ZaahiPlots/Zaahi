#!/usr/bin/env python3
"""
Phase 2.0 minimal proof — read /tmp/parcel.json, project WGS84 → local meters
around the parcel centroid, then drive Blender (via the blender-mcp TCP server
on 127.0.0.1:9876) to build a 30 m extrusion of the footprint and export
/tmp/test-parcel.glb.

Note: host Blender is RU-localized — shader nodes are looked up by
`node.type == "BSDF_PRINCIPLED"`, not by English `.name`.
"""
import json
import math
import socket
import sys

PARCEL_JSON = "/tmp/parcel.json"
OUT_GLB = "/tmp/test-parcel.glb"
HOST, PORT = "127.0.0.1", 9876
HEIGHT_M = 30.0
M_PER_DEG = 111320.0


def project_ring(ring):
    """Equirectangular projection around the ring centroid. Returns list of (x, y) meters."""
    if ring[0] == ring[-1]:
        ring = ring[:-1]
    lng0 = sum(p[0] for p in ring) / len(ring)
    lat0 = sum(p[1] for p in ring) / len(ring)
    lat0_rad = math.radians(lat0)
    return [
        (
            (lng - lng0) * M_PER_DEG * math.cos(lat0_rad),
            (lat - lat0) * M_PER_DEG,
        )
        for (lng, lat) in ring
    ]


def send_to_blender(code: str) -> dict:
    payload = json.dumps({"type": "execute_code", "params": {"code": code}}).encode()
    with socket.create_connection((HOST, PORT), timeout=30) as s:
        s.sendall(payload)
        s.settimeout(60)
        buf = b""
        while True:
            chunk = s.recv(65536)
            if not chunk:
                break
            buf += chunk
            try:
                return json.loads(buf.decode())
            except json.JSONDecodeError:
                continue
    return json.loads(buf.decode())


def main():
    with open(PARCEL_JSON) as f:
        parcel = json.load(f)

    plot = parcel["plotNumber"]
    geom = parcel["geometry"]
    if geom.get("type") != "Polygon":
        print(f"ERROR: expected Polygon, got {geom.get('type')}")
        sys.exit(2)
    coords = project_ring(geom["coordinates"][0])
    n_input = len(coords)

    blender_code = f"""
import bpy, bmesh

for o in list(bpy.data.objects):
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.materials):
    if m.users == 0:
        bpy.data.materials.remove(m, do_unlink=True)

COORDS = {coords!r}
HEIGHT = {HEIGHT_M}

mesh = bpy.data.meshes.new('Parcel_{plot}_mesh')
obj = bpy.data.objects.new('Parcel_{plot}', mesh)
bpy.context.collection.objects.link(obj)

bm = bmesh.new()
verts = [bm.verts.new((x, y, 0.0)) for (x, y) in COORDS]
bm.verts.ensure_lookup_table()
face = bm.faces.new(verts)
bmesh.ops.recalc_face_normals(bm, faces=[face])
ret = bmesh.ops.extrude_face_region(bm, geom=[face])
top_verts = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
bmesh.ops.translate(bm, vec=(0.0, 0.0, HEIGHT), verts=top_verts)
bm.to_mesh(mesh)
bm.free()

mat = bpy.data.materials.new(name='ConcreteGrey')
mat.use_nodes = True
bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
if bsdf is None:
    bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs.get('Base Color').default_value = (0.65, 0.65, 0.65, 1.0)
obj.data.materials.append(mat)

for o in bpy.context.scene.objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)

out_path = '{OUT_GLB}'
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
)

m = obj.data
m.calc_loop_triangles()
print('STATS', len(m.vertices), len(m.polygons), len(m.loop_triangles), out_path)
"""

    print(f"Parcel: plot={plot} input_vertices={n_input}")
    print(f"Centroid-relative coords (m): {coords}")
    resp = send_to_blender(blender_code)
    print(json.dumps(resp, indent=2))


if __name__ == "__main__":
    main()
