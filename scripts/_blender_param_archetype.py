# Parametric hard-surface archetype generator (Blender headless, NO Meshy).
# Guarantees clean straight edges (CSG box modeling) + REAL recessed window
# geometry via boolean (not texture, not a flat block). Outputs a unit-box GLB
# (X,Y ∈ [-0.5,0.5], Z ∈ [0,1] base-on-ground) so archetype-layer scales it to
# the building FOOTPRINT (XY) + data height (Z).
#
# Run: blender -b -P _blender_param_archetype.py -- <CATEGORY> <hexcolor>
# Out: public/glb/archetypes/<cat>.glb  +  docs/research/archetype-shots-v2/<cat>-glb-preview.png
import bpy, bmesh, math, sys, pathlib, mathutils

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["HOTEL", "#7B1E2B"]
cat = argv[0].lower()
hexc = argv[1] if len(argv) > 1 else "#7B1E2B"
ROOT = pathlib.Path("/home/zaahi/zaahi")
out_glb = ROOT / f"public/glb/archetypes/{cat}.glb"
out_png = ROOT / f"docs/research/archetype-shots-v2/{cat}-glb-preview.png"

def hex_rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene

def make_box(name, x0, x1, y0, y1, z0, z1):
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me)
    SC.collection.objects.link(ob)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
    for v in bm.verts:
        v.co.x = v.co.x * sx + cx; v.co.y = v.co.y * sy + cy; v.co.z = v.co.z * sz + cz
    bm.to_mesh(me); bm.free()
    return ob

def make_triprism(x0, x1, zbot, ztop, name):
    # Right-triangle cross-section in X-Z (vertical riser at x0 up to ztop, base
    # at zbot, sloped hypotenuse down to x1) extruded along full Y — one
    # north-light sawtooth tooth. Winding is fixed by recalc_normals later.
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me)
    SC.collection.objects.link(ob)
    y0, y1 = -0.5, 0.5
    verts = [(x0, y0, zbot), (x0, y0, ztop), (x1, y0, zbot),
             (x0, y1, zbot), (x0, y1, ztop), (x1, y1, zbot)]
    faces = [(0, 1, 2), (3, 5, 4), (0, 2, 5, 3), (0, 3, 4, 1), (1, 4, 5, 2)]
    me.from_pydata(verts, [], faces); me.update()
    return ob

def make_gable(x0, x1, y0, y1, zbot, ztop, name):
    # Gable (двускатная) roof: triangular cross-section in X-Z (apex centred at
    # (x0+x1)/2), ridge running along Y. Two sloped faces + two gable-end tris.
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me)
    SC.collection.objects.link(ob)
    ax = (x0 + x1) / 2
    verts = [(x0, y0, zbot), (x1, y0, zbot), (ax, y0, ztop),
             (x0, y1, zbot), (x1, y1, zbot), (ax, y1, ztop)]
    faces = [(0, 1, 2), (3, 5, 4), (0, 1, 4, 3), (0, 2, 5, 3), (1, 4, 5, 2)]
    me.from_pydata(verts, [], faces); me.update()
    return ob

def make_cone(cx, cy, r1, r2, z0, z1, name, seg=20):
    # Vertical cone/cylinder (r1=bottom radius, r2=top radius), centred at (cx,cy).
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me)
    SC.collection.objects.link(ob)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg,
                          radius1=r1, radius2=r2, depth=z1 - z0)
    for v in bm.verts:
        v.co.x += cx; v.co.y += cy; v.co.z += (z0 + z1) / 2
    bm.to_mesh(me); bm.free()
    return ob

def join(objs, name):
    for o in SC.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    return obj

def boolean_diff(target, cutter):
    m = target.modifiers.new("bool", "BOOLEAN")
    m.operation = "DIFFERENCE"; m.solver = "EXACT"; m.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="bool")
    bpy.data.objects.remove(cutter, do_unlink=True)

def linspace(a, b, n):
    if n <= 1: return [(a + b) / 2]
    return [a + (b - a) * i / (n - 1) for i in range(n)]

# ── HOTEL: wide block + podium + cantilever entrance canopy + flat roof with
#    parapet & a small rooftop plant box + a REGULAR boolean-recessed window
#    grid on all four facades (the 🏨 "many identical rooms" signature). ──
def build_hotel():
    parts = []
    parts.append(make_box("podium", -0.49, 0.49, -0.49, 0.49, 0.00, 0.085))
    body = make_box("body", -0.45, 0.45, -0.45, 0.45, 0.085, 0.93)
    parts.append(make_box("parapet", -0.47, 0.47, -0.47, 0.47, 0.93, 0.965))
    parts.append(make_box("roofbox", -0.16, 0.16, -0.12, 0.12, 0.965, 1.00))
    # cantilever entrance canopy over the +Y facade (stays within the unit box)
    parts.append(make_box("canopy", -0.20, 0.20, 0.45, 0.50, 0.085, 0.105))
    # window grid cutters (recess 0.035 into the wall) — rows per "floor", cols per "room"
    nrows, ncols = 9, 11
    ww, wh = 0.045, 0.040
    rec = 0.035
    zr = linspace(0.165, 0.885, nrows)
    cutters = []
    ys = linspace(-0.37, 0.37, ncols)
    xs = linspace(-0.37, 0.37, ncols)
    for zi, z in enumerate(zr):
        for y in ys:
            cutters.append(make_box(f"cx{zi}", 0.45 - rec, 0.46, y - ww / 2, y + ww / 2, z - wh / 2, z + wh / 2))
            cutters.append(make_box(f"cnx{zi}", -0.46, -0.45 + rec, y - ww / 2, y + ww / 2, z - wh / 2, z + wh / 2))
        for x in xs:
            cutters.append(make_box(f"cy{zi}", x - ww / 2, x + ww / 2, 0.45 - rec, 0.46, z - wh / 2, z + wh / 2))
            cutters.append(make_box(f"cny{zi}", x - ww / 2, x + ww / 2, -0.46, -0.45 + rec, z - wh / 2, z + wh / 2))
    cutter = join(cutters, "cutter")
    boolean_diff(body, cutter)
    return join([body] + parts, "hotel")

# ── COMMERCIAL: vertical OFFICE TOWER 🏢 — curtain-wall ribbon glazing (wide
#    recessed horizontal panes split by thin mullions, NOT hotel's square punch
#    grid), full-footprint край-в-край (setback 0), double-height lobby podium,
#    flat roof with a thin parapet + rooftop plant box. ──
def build_commercial():
    parts = []
    parts.append(make_box("podium", -0.50, 0.50, -0.50, 0.50, 0.000, 0.075))  # lobby base, edge-to-edge
    shaft = make_box("shaft", -0.485, 0.485, -0.485, 0.485, 0.075, 0.94)
    parts.append(make_box("parapet", -0.50, 0.50, -0.50, 0.50, 0.94, 0.965))
    parts.append(make_box("roofbox", -0.18, 0.18, -0.14, 0.14, 0.965, 1.00))
    rec = 0.030
    cutters = []

    def paned_band(zc, h, half, ncols, tag):
        z0, z1 = zc - h / 2, zc + h / 2
        mull = 0.012                      # vertical mullion thickness (facade units)
        span = 2 * half
        pane = (span - mull * (ncols + 1)) / ncols
        out = []
        for i in range(ncols):
            a = -half + mull + i * (pane + mull); b = a + pane
            out.append(make_box(f"{tag}px{i}", 0.485 - rec, 0.50, a, b, z0, z1))
            out.append(make_box(f"{tag}nx{i}", -0.50, -0.485 + rec, a, b, z0, z1))
            out.append(make_box(f"{tag}py{i}", a, b, 0.485 - rec, 0.50, z0, z1))
            out.append(make_box(f"{tag}ny{i}", a, b, -0.50, -0.485 + rec, z0, z1))
        return out

    # double-height lobby glazing (taller, wider panes) at the podium
    cutters += paned_band(0.045, 0.052, 0.44, 6, "lob")
    # curtain-wall ribbon floors up the shaft — WIDE panes (office), thin spandrels
    nbands = 13
    zr = linspace(0.135, 0.905, nbands)
    for zi, z in enumerate(zr):
        cutters += paned_band(z, 0.046, 0.43, 8, f"f{zi}")

    cutter = join(cutters, "cutter")
    boolean_diff(shaft, cutter)
    return join([shaft] + parts, "commercial")

# ── EDUCATIONAL: wide LOW school 🏫 — a courtyard RING block (open central
#    court reads from above as a campus), rows of LARGE classroom windows on the
#    outer facades, flat roof + parapet, a projecting entrance portico canopy,
#    a rooftop plant box. Horizontal proportion (height comes from low data H). ──
def build_educational():
    parts = []
    main = make_box("main", -0.50, 0.50, -0.50, 0.50, 0.00, 0.90)
    roofedge = make_box("redge", -0.50, 0.50, -0.50, 0.50, 0.90, 0.925)
    main = join([main, roofedge], "main")
    # open central courtyard (cut through; a thin ground slab stays below z=0.03)
    court = make_box("court", -0.27, 0.27, -0.27, 0.27, 0.03, 1.10)
    boolean_diff(main, court)
    # large classroom windows — 3 tall rows, wide panes, on all 4 outer facades
    rec = 0.03; cutters = []
    half = 0.40; mull = 0.018; ncols = 7; wh = 0.135
    pane = (2 * half - mull * (ncols + 1)) / ncols
    for z in linspace(0.20, 0.74, 3):
        z0, z1 = z - wh / 2, z + wh / 2
        for i in range(ncols):
            a = -half + mull + i * (pane + mull); b = a + pane
            cutters.append(make_box(f"ex", 0.50 - rec, 0.51, a, b, z0, z1))
            cutters.append(make_box(f"enx", -0.51, -0.50 + rec, a, b, z0, z1))
            cutters.append(make_box(f"ey", a, b, 0.50 - rec, 0.51, z0, z1))
            cutters.append(make_box(f"eny", a, b, -0.51, -0.50 + rec, z0, z1))
    boolean_diff(main, join(cutters, "cut"))
    parts.append(make_box("canopy", -0.17, 0.17, 0.40, 0.50, 0.16, 0.195))   # entrance portico
    parts.append(make_box("roofbox", 0.30, 0.44, 0.30, 0.44, 0.925, 0.965))  # rooftop plant
    return join([main] + parts, "educational")

# ── HEALTHCARE: hospital 🏥 — H-PLAN block (two ward wings + central connector,
#    reads as a hospital from above), regular ward-window grid (boolean recessed)
#    on the outer facades, flat roof with mechanical plant + a helipad pad,
#    projecting ambulance entrance canopy in the bottom court. ──
def build_healthcare():
    parts = []
    main = make_box("main", -0.50, 0.50, -0.50, 0.50, 0.00, 0.92)
    redge = make_box("redge", -0.50, 0.50, -0.50, 0.50, 0.92, 0.945)
    main = join([main, redge], "main")
    # H-plan: cut top & bottom centre notches through full height → two wings + bar
    boolean_diff(main, make_box("ntop", -0.18, 0.18, 0.20, 0.62, -0.10, 1.06))
    boolean_diff(main, make_box("nbot", -0.18, 0.18, -0.62, -0.20, -0.10, 1.06))
    # ward window grid on the 4 outer faces (cutters over notch voids are no-ops)
    rec = 0.03; cutters = []; ww = 0.05; wh = 0.045
    grid = linspace(-0.40, 0.40, 9)
    for z in linspace(0.12, 0.86, 8):
        z0, z1 = z - wh / 2, z + wh / 2
        for g in grid:
            cutters.append(make_box("hx", 0.50 - rec, 0.51, g - ww / 2, g + ww / 2, z0, z1))
            cutters.append(make_box("hnx", -0.51, -0.50 + rec, g - ww / 2, g + ww / 2, z0, z1))
            cutters.append(make_box("hy", g - ww / 2, g + ww / 2, 0.50 - rec, 0.51, z0, z1))
            cutters.append(make_box("hny", g - ww / 2, g + ww / 2, -0.51, -0.50 + rec, z0, z1))
    boolean_diff(main, join(cutters, "cut"))
    parts.append(make_box("canopy", -0.16, 0.16, -0.32, -0.20, 0.00, 0.11))   # ambulance entrance canopy
    parts.append(make_box("mech", 0.24, 0.42, 0.06, 0.30, 0.945, 0.99))       # rooftop plant
    parts.append(make_box("helipad", -0.12, 0.12, -0.12, 0.12, 0.945, 0.957)) # helipad pad
    return join([main] + parts, "healthcare")

# ── INDUSTRIAL: low long warehouse/shed 🏭 — SAWTOOTH (north-light) roof (the
#    iconic industrial signature), few windows (one sparse clerestory band high
#    on the long facades), big loading gates on the front. Horizontal/low. ──
def build_industrial():
    parts = []
    body = make_box("body", -0.50, 0.50, -0.50, 0.50, 0.00, 0.86)  # taller body so the roof reads as texture
    rec = 0.025; cutters = []
    # sparse clerestory window band high on both long facades (±Y)
    for yf in ((-0.51, -0.475), (0.475, 0.51)):
        cutters.append(make_box("cl", -0.42, 0.42, yf[0], yf[1], 0.74, 0.79))
    # 3 large loading gates on the -Y front facade
    for gx in linspace(-0.30, 0.30, 3):
        cutters.append(make_box("gate", gx - 0.105, gx + 0.105, -0.51, -0.475, 0.00, 0.42))
    boolean_diff(body, join(cutters, "cut"))
    parts.append(body)
    # sawtooth roof — SMALL north-light teeth (founder 2026-06-15: shorter +
    # more of them so the roof is industrial texture, not a dominant feature).
    nt = 11; dx = 1.0 / nt
    for i in range(nt):
        x0 = -0.5 + i * dx
        parts.append(make_triprism(x0, x0 + dx, 0.86, 1.00, f"tooth{i}"))
    return join(parts, "industrial")

# ── AGRICULTURAL: barn / farm — pitched GABLE roof (distinct from sawtooth &
#    flat), wide barn doors on the gable end, a SILO cylinder beside it. Simple,
#    low. Barn occupies the left of the footprint, silo the right. ──
def build_agricultural():
    parts = []
    body = make_box("body", -0.48, 0.18, -0.46, 0.46, 0.00, 0.42)
    boolean_diff(body, make_box("door", -0.31, -0.01, -0.47, -0.40, 0.00, 0.30))  # wide barn doors
    parts.append(body)
    parts.append(make_gable(-0.48, 0.18, -0.46, 0.46, 0.42, 0.80, "roof"))        # gable roof
    parts.append(make_cone(0.35, 0.00, 0.12, 0.12, 0.00, 0.62, "silo"))           # silo body
    parts.append(make_cone(0.35, 0.00, 0.13, 0.00, 0.62, 0.72, "silocap"))        # silo cap
    return join(parts, "agricultural")

# ── FUTURE_DEVELOPMENT: a construction SITE (not a finished building) — low
#    foundation pad (cleared plot) + perimeter hoarding fence + a tower CRANE
#    marker (mast + horizontal jib + counter-jib + cab) that reads as "здесь
#    будет стройка". The crane dominates the vertical; site elements stay low. ──
def build_future_development():
    # Founder 2026-06-15: NO crane. Cleared/graded foundation PAD with a recessed
    # footing grid (foundations being laid) + a perimeter HOARDING fence at full
    # unit height (so the runtime H = the low fence height). Reads as "under
    # development", low profile. Fence is the tallest element → H = fence height.
    parts = []
    pad = make_box("pad", -0.47, 0.47, -0.47, 0.47, 0.00, 0.16)  # low graded pad
    cutters = []
    for fx in linspace(-0.32, 0.32, 4):
        for fy in linspace(-0.32, 0.32, 4):
            cutters.append(make_box("ft", fx - 0.05, fx + 0.05, fy - 0.05, fy + 0.05, 0.10, 0.17))
    boolean_diff(pad, join(cutters, "cut"))   # recessed foundation-footing grid
    parts.append(pad)
    t = 0.022  # perimeter hoarding fence (full unit height; thin)
    parts.append(make_box("fN", -0.50, 0.50, 0.50 - t, 0.50, 0.0, 1.0))
    parts.append(make_box("fS", -0.50, 0.50, -0.50, -0.50 + t, 0.0, 1.0))
    parts.append(make_box("fE", 0.50 - t, 0.50, -0.50, 0.50, 0.0, 1.0))
    parts.append(make_box("fW", -0.50, -0.50 + t, -0.50, 0.50, 0.0, 1.0))
    return join(parts, "future_development")

# ── RESIDENTIAL: terraced balcony tower — glazed core + projecting BALCONY
#    PLATES per floor (real slabs that cast PBR shadow = the floor rhythm, not
#    lines) + a stepped-back terraced crown. Green. ──
def build_residential():
    parts = []
    parts.append(make_box("core", -0.40, 0.40, -0.40, 0.40, 0.00, 0.90))  # glazed core
    # projecting balcony floor plates (extend past the core → shadow per floor)
    for i, z in enumerate(linspace(0.07, 0.86, 13)):
        parts.append(make_box(f"bal{i}", -0.48, 0.48, -0.48, 0.48, z, z + 0.022))
    # terraced crown — two stepped-back top tiers
    parts.append(make_box("t1", -0.32, 0.32, -0.32, 0.32, 0.90, 0.96))
    parts.append(make_box("t2", -0.22, 0.22, -0.22, 0.22, 0.96, 1.00))
    return join(parts, "residential")

# ── MIXED_USE: podium / body / crown (3 stepped tiers with setbacks, as ratified)
#    + recessed window grids per tier (boolean → PBR shadow, no lines). Purple. ──
def build_mixeduse():
    parts = []
    podium = make_box("podium", -0.50, 0.50, -0.50, 0.50, 0.00, 0.18)   # full
    body = make_box("body", -0.41, 0.41, -0.41, 0.41, 0.18, 0.74)       # ~0.82 inset
    crown = make_box("crown", -0.325, 0.325, -0.325, 0.325, 0.74, 1.00) # ~0.65 inset
    rec = 0.03; ww = 0.05; wh = 0.05

    def grid(half, z0, z1, nrows, ncols, wall, tag):
        out = []
        gx = linspace(-half * 0.86, half * 0.86, ncols)
        for zi, z in enumerate(linspace(z0, z1, nrows)):
            for g in gx:
                out.append(make_box(f"{tag}px", wall - rec, wall + 0.01, g - ww / 2, g + ww / 2, z - wh / 2, z + wh / 2))
                out.append(make_box(f"{tag}nx", -wall - 0.01, -wall + rec, g - ww / 2, g + ww / 2, z - wh / 2, z + wh / 2))
                out.append(make_box(f"{tag}py", g - ww / 2, g + ww / 2, wall - rec, wall + 0.01, z - wh / 2, z + wh / 2))
                out.append(make_box(f"{tag}ny", g - ww / 2, g + ww / 2, -wall - 0.01, -wall + rec, z - wh / 2, z + wh / 2))
        return out

    boolean_diff(body, join(grid(0.41, 0.26, 0.70, 6, 6, 0.41, "b"), "bcut"))     # body windows
    boolean_diff(crown, join(grid(0.325, 0.80, 0.96, 3, 5, 0.325, "c"), "ccut"))  # crown windows
    boolean_diff(podium, join(grid(0.50, 0.05, 0.14, 1, 7, 0.50, "p"), "pcut"))   # podium retail glazing
    return join([podium, body, crown], "mixed_use")

# ── INVESTMENT: AD off-plan = a tower UNDER CONSTRUCTION + a tower CRANE beside
#    it (the off-plan marker — "строится сейчас"). Tower has window grid on the
#    lower BUILT floors, bare top (unfinished). Crane (mast + jib over the tower
#    + counter-jib + cab) reused from the future-dev crane. Teal. ──
def build_investment():
    parts = []
    tx0, tx1, ty0, ty1 = -0.45, 0.26, -0.42, 0.42
    tower = make_box("tower", tx0, tx1, ty0, ty1, 0.00, 0.88)
    rec = 0.03; ww = 0.05; wh = 0.045; cut = []
    gy = linspace(ty0 + 0.07, ty1 - 0.07, 7)
    gx = linspace(tx0 + 0.07, tx1 - 0.07, 6)
    for z in linspace(0.10, 0.64, 8):                     # windows on BUILT floors only
        z0, z1 = z - wh / 2, z + wh / 2
        for y in gy:
            cut.append(make_box("ix", tx1 - rec, tx1 + 0.01, y - ww / 2, y + ww / 2, z0, z1))
            cut.append(make_box("inx", tx0 - 0.01, tx0 + rec, y - ww / 2, y + ww / 2, z0, z1))
        for x in gx:
            cut.append(make_box("iy", x - ww / 2, x + ww / 2, ty1 - rec, ty1 + 0.01, z0, z1))
            cut.append(make_box("iny", x - ww / 2, x + ww / 2, ty0 - 0.01, ty0 + rec, z0, z1))
    boolean_diff(tower, join(cut, "cut"))
    parts.append(tower)
    # tower crane beside the tower, taller than it (mast + jib over tower + counter-jib)
    mx, my, mr = 0.40, 0.08, 0.024
    parts.append(make_box("mast", mx - mr, mx + mr, my - mr, my + mr, 0.00, 0.97))
    parts.append(make_box("cab", mx - 0.04, mx + 0.04, my - 0.04, my + 0.04, 0.84, 0.90))
    parts.append(make_box("jib", -0.12, mx, my - 0.016, my + 0.016, 0.90, 0.945))   # jib over the tower
    parts.append(make_box("cjib", mx, 0.49, my - 0.016, my + 0.016, 0.90, 0.945))   # counter-jib
    parts.append(make_box("apex", mx - 0.012, mx + 0.012, my - 0.012, my + 0.012, 0.945, 1.00))
    return join(parts, "investment")

BUILDERS = {"hotel": build_hotel, "commercial": build_commercial,
            "educational": build_educational, "healthcare": build_healthcare,
            "industrial": build_industrial, "agricultural": build_agricultural,
            "future_development": build_future_development,
            "residential": build_residential, "mixed_use": build_mixeduse,
            "investment": build_investment}
if cat not in BUILDERS:
    print("NO BUILDER for", cat); sys.exit(1)
obj = BUILDERS[cat]()

# clean up: merge coincident verts from the joins, recalc outward normals
bm = bmesh.new(); bm.from_mesh(obj.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(obj.data); bm.free(); obj.data.update()
print("FACES:", len(obj.data.polygons))

# flat legend-colour material (preview only; map layer recolours too)
mat = bpy.data.materials.new(f"{cat}_mat"); mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
r, g, b = hex_rgb(hexc)
bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
bsdf.inputs["Roughness"].default_value = 0.65
mat.diffuse_color = (r, g, b, 1)
obj.data.materials.clear(); obj.data.materials.append(mat)

out_glb.parent.mkdir(parents=True, exist_ok=True)
for o in SC.objects: o.select_set(o is obj)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(filepath=str(out_glb), export_format="GLB", use_selection=True)
print("GLB:", out_glb, out_glb.stat().st_size, "bytes")

# ── preview render (Workbench MATERIAL) ──
SC.render.engine = "BLENDER_WORKBENCH"
SC.render.resolution_x = 900; SC.render.resolution_y = 900
if SC.world is None: SC.world = bpy.data.worlds.new("w")
try: SC.world.use_nodes = False; SC.world.color = (0.04, 0.09, 0.16)
except Exception as e: print("world skip", e)
SC.display.shading.light = "STUDIO"
SC.display.shading.color_type = "MATERIAL"
SC.display.shading.show_shadows = True
cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data)
SC.collection.objects.link(cam); SC.camera = cam
cam.location = (1.7, -1.9, 1.5)
d = mathutils.Vector((0, 0, 0.45)) - cam.location
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
cam_data.lens = 55
out_png.parent.mkdir(parents=True, exist_ok=True)
SC.render.filepath = str(out_png)
bpy.ops.render.render(write_still=True)
print("PNG:", out_png)
