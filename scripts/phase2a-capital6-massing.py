#!/usr/bin/env python3
"""
Phase 2.A — CAPITAL 6 Office Building real-plot massing.

Build a 34.2 m extrusion of plot 6458042 (Wadi Al Safa 3) from the 6 surveyed
corner points on the SETTING OUT PLAN. Visual proof in Blender; no .glb
export. Saves the scene as docs/research/capital6-massing.blend.

Source: CVTEC setting-out plan A 13.001.00, page 10 of
~/Загрузки/CAPITAL 6 OFFICE BUILDING.pdf — Dubai local grid (metres),
projection assumed DCS-95 / Dubai LTM (datum to be confirmed by founder).

This is a research-only demonstration. Not a listing for AAMANI Real Estate
Investments Ltd; not for production deployment.
"""
import json
import math
import socket
import sys

HOST, PORT = "127.0.0.1", 9876
HEIGHT_M = 34.2
BLEND_PATH = "/home/zaahi/zaahi/docs/research/capital6-massing.blend"

# 6 surveyed plot corners (Dubai local grid, metres)
POINTS = [
    ("P1", 497981.778, 2775843.719),
    ("P2", 497984.989, 2775853.574),
    ("P3", 498011.996, 2775864.909),
    ("P4", 498033.477, 2775813.873),
    ("P5", 498006.410, 2775802.537),
    ("P6", 497998.555, 2775805.762),
]


def signed_area(poly):
    """Shoelace signed area. Positive = CCW (math convention, +x right, +y up)."""
    n = len(poly)
    s = 0.0
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return 0.5 * s


def is_simple_polygon(poly):
    """Verify no two non-adjacent edges intersect. O(n^2) — fine for n=6."""
    n = len(poly)

    def ccw(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    def strict_cross(p1, p2, q1, q2):
        d1 = ccw(q1, q2, p1)
        d2 = ccw(q1, q2, p2)
        d3 = ccw(p1, p2, q1)
        d4 = ccw(p1, p2, q2)
        return ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
               ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0))

    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if strict_cross(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n]):
                return False
    return True


def send_to_blender(code: str) -> dict:
    payload = json.dumps({"type": "execute_code", "params": {"code": code}}).encode()
    with socket.create_connection((HOST, PORT), timeout=30) as s:
        s.sendall(payload)
        s.settimeout(120)
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
    labels = [p[0] for p in POINTS]
    raw = [(p[1], p[2]) for p in POINTS]

    cE = sum(e for e, _ in raw) / len(raw)
    cN = sum(n for _, n in raw) / len(raw)
    local = [(e - cE, n - cN) for (e, n) in raw]

    a_signed = signed_area(local)
    winding = "CCW" if a_signed > 0 else "CW"
    if a_signed < 0:
        local = list(reversed(local))
        labels = list(reversed(labels))
    area = abs(a_signed)
    simple = is_simple_polygon(local)

    print(f"Plot 6458042 — Wadi Al Safa 3 — CAPITAL 6 Office Building")
    print(f"Input order: {[p[0] for p in POINTS]}  →  CCW order: {labels}")
    print(f"Centroid (E, N) m: ({cE:.3f}, {cN:.3f})")
    print(f"Local coords (m, around centroid):")
    for lbl, (x, y) in zip(labels, local):
        print(f"  {lbl}: ({x:+9.3f}, {y:+9.3f})")
    print(f"Polygon area (shoelace): {area:.2f} m²  (cover sheet: 1,917.28 m²)")
    print(f"Original winding: {winding}  →  passed to Blender as CCW")
    print(f"Simple polygon (no self-intersection): {simple}")
    print(f"Vertex count: {len(local)}")
    print(f"Building height: {HEIGHT_M} m  (top of parapet, elevations p.23-26)")

    if not simple:
        print("ERROR: polygon is self-intersecting — abort.", file=sys.stderr)
        sys.exit(2)

    blender_code = f"""
import bpy, bmesh

# Clear meshes only — keep Camera + Light
for o in list(bpy.data.objects):
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.materials):
    if m.users == 0:
        bpy.data.materials.remove(m, do_unlink=True)

COORDS = {local!r}
HEIGHT = {HEIGHT_M}

mesh = bpy.data.meshes.new('CAPITAL6_Plot_mesh')
obj = bpy.data.objects.new('CAPITAL6_Plot', mesh)
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

# Concrete-grey Principled BSDF (RU-localized: lookup by node.type)
mat = bpy.data.materials.new('CAPITAL6_ConcreteGrey')
mat.use_nodes = True
bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
if bsdf is None:
    bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs.get('Base Color').default_value = (0.6, 0.6, 0.6, 1.0)
rough = bsdf.inputs.get('Roughness')
if rough is not None:
    rough.default_value = 0.7
obj.data.materials.append(mat)

# Frame view
for o in bpy.context.scene.objects:
    o.select_set(False)
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for region in area.regions:
            if region.type == 'WINDOW':
                with bpy.context.temp_override(area=area, region=region):
                    bpy.ops.view3d.view_selected(use_all_regions=False)
                    space = area.spaces.active
                    space.shading.type = 'MATERIAL'
        break

# Save .blend
bpy.ops.wm.save_as_mainfile(filepath={BLEND_PATH!r})

m = obj.data
m.calc_loop_triangles()
print('STATS', len(m.vertices), len(m.polygons), len(m.loop_triangles), {BLEND_PATH!r})
"""

    resp = send_to_blender(blender_code)
    print(json.dumps(resp, indent=2))


if __name__ == "__main__":
    main()
