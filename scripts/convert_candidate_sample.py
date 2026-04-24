"""Convert the candidate's building_1.obj/.mtl into a production-ready .glb.

- Loads OBJ + MTL via trimesh
- Merges the 105 sub-meshes into one per material (7 draw calls instead of 105)
- Maps MTL Kd (Phong diffuse) into glTF PBR baseColorFactor (best-effort)
- PATTERN material: solid-color fallback (texture on unreachable Windows path)
- Writes a single .glb; coordinates preserved (caller scales in R3F)
"""

from __future__ import annotations

import pathlib
import sys

import numpy as np
import trimesh

SRC_OBJ = pathlib.Path("/home/zaahi/Загрузки/building 1.obj")
OUT_GLB = pathlib.Path("/home/zaahi/zaahi/public/models/candidate-sample.glb")


def kd_to_basecolor(kd: np.ndarray) -> list[float]:
    r, g, b = (float(c) for c in kd[:3])
    return [r, g, b, 1.0]


def main() -> int:
    if not SRC_OBJ.exists():
        print(f"source OBJ missing: {SRC_OBJ}", file=sys.stderr)
        return 1

    scene = trimesh.load(SRC_OBJ, process=False, force="scene")
    if not isinstance(scene, trimesh.Scene):
        scene = trimesh.Scene(scene)

    sub_meshes = list(scene.geometry.values())
    raw_vert_total = sum(len(m.vertices) for m in sub_meshes)
    raw_face_total = sum(len(m.faces) for m in sub_meshes)
    print(f"loaded {len(sub_meshes)} sub-meshes, {raw_vert_total} verts, {raw_face_total} faces")

    by_material: dict[str, list[trimesh.Trimesh]] = {}
    fallback_idx = 0
    for mesh in sub_meshes:
        mat = getattr(mesh.visual, "material", None)
        if mat is not None and getattr(mat, "name", None):
            key = mat.name
        else:
            key = f"_nomat_{fallback_idx}"
            fallback_idx += 1
        by_material.setdefault(key, []).append(mesh)

    merged_meshes: list[trimesh.Trimesh] = []
    for mat_name, meshes in by_material.items():
        if len(meshes) == 1:
            combined = meshes[0]
        else:
            combined = trimesh.util.concatenate(meshes)

        kd = None
        src_material = getattr(meshes[0].visual, "material", None)
        if src_material is not None:
            for attr in ("diffuse", "baseColorFactor"):
                val = getattr(src_material, attr, None)
                if val is not None:
                    arr = np.asarray(val, dtype=float).flatten()
                    if arr.max() > 1.5:
                        arr = arr / 255.0
                    if arr.size >= 3:
                        kd = arr[:3]
                        break

        if kd is None:
            kd = np.array([0.75, 0.75, 0.75])

        pbr = trimesh.visual.material.PBRMaterial(
            name=mat_name,
            baseColorFactor=kd_to_basecolor(kd),
            metallicFactor=0.0,
            roughnessFactor=0.85,
        )
        combined.visual = trimesh.visual.TextureVisuals(material=pbr)
        combined.metadata["name"] = mat_name
        merged_meshes.append(combined)
        print(f"  material {mat_name}: {len(meshes)} -> 1 mesh, {len(combined.vertices)} verts, baseColor={pbr.baseColorFactor}")

    out_scene = trimesh.Scene()
    for mesh in merged_meshes:
        out_scene.add_geometry(mesh, node_name=mesh.metadata.get("name", "part"))

    bounds = out_scene.bounds
    size = bounds[1] - bounds[0]
    print(f"bounds min={bounds[0]}, max={bounds[1]}, size={size}")

    OUT_GLB.parent.mkdir(parents=True, exist_ok=True)
    out_scene.export(OUT_GLB, file_type="glb")
    size_kb = OUT_GLB.stat().st_size / 1024.0
    print(f"wrote {OUT_GLB} ({size_kb:.1f} KB)")
    print(
        f"summary: {len(sub_meshes)} sub-meshes -> {len(merged_meshes)} merged mesh-groups "
        f"(one per material)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
