# Land-Use Archetypes v2 — per-type building morphology

Branch `research/landuse-archetypes`. Date 2026-06-13.
**STOP for founder verdict. Tiles / map renderer NOT touched.**

## Founder redirect (2026-06-13)

v1 was wrong: all 8 archetypes used one mechanic (podium/body/crown tiers with
different proportions) → variations of one box. **v2: each land use is its OWN
geometry constructor** shaped after the morphology of the REAL building type. The
ZAAHI podium/body/crown tier style is **not** applied. Still low-poly massing
("болванка"), still translucent + the canonical 9-category colours (unchanged).

## Important: this is NOT MapLibre-renderable as-is

These morphologies use sloped / sawtooth roofs, L-shapes, wings and stacked
distinct volumes. MapLibre `fill-extrusion` can only flat-top-extrude a 2D
polygon, so gable/sawtooth roofs and true multi-volume massing **cannot** be
shown by the current map layer. v2 is rendered with a standalone Three.js harness
(low-poly meshes). Wiring it onto the map would require a Three.js custom layer
(the deferred `feat/signature-v2` track) — that is a **separate decision after
founder approves the silhouettes**, hence STOP here.

## Constructor functions — one per archetype

`scripts/archetype-builders.ts` — each returns a list of low-poly solids
(`prism` / `gable` / `sawtooth`) in metre-space; `scripts/_compute-v2.ts` feeds
each builder a **real plot footprint** (DDA building-limit or setback inset) +
its PCA oriented-bounding-box, and writes `massing.json`. The harness
(`_harness.html`) renders the solids.

| Archetype | Constructor | Morphology (recognisable silhouette) | Real plot |
|---|---|---|---|
| RESIDENTIAL | `buildResidential` | body with stacked **balcony bands** + terraced setback top — not a smooth tower | 6117231 (Bu Kadra, 25 fl) |
| HOTEL | `buildHotel` | **L-shaped** tower on a wide low lobby podium | 6757711 (Studio City, 16 fl) |
| EDUCATIONAL | `buildEducational` | low **campus** — long main bar + two wings (U / courtyard) + central entrance, flat roofs | 6850743 (Production City) |
| HEALTHCARE | `buildHealthcare` | hospital **H-plan** — central spine + two ward wings + entrance canopy | 6455948 (Majan) |
| COMMERCIAL | `buildCommercial` | office **tower** with a distinct entrance plinth + parapet crown + floor rhythm | 202-613-000-C9 (AD, 60 fl) |
| MIXED_USE | `buildMixedUse` | wide **retail podium** + a clearly separate **slim tower** (two volumes) | 6460178 (City of Arabia, 66 fl) |
| INDUSTRIAL | `buildIndustrial` | warehouse shed — **sawtooth (north-light) roof** + loading dock | 6854560 (Production City) |
| AGRICULTURAL | `buildAgricultural` | **barn** — long low body + **gable roof**, large setback (in its field) | synthetic farm (no curated parcel) |
| FUTURE_DEVELOPMENT | `buildFuture` | flat fill, **no 3D massing** (CLAUDE.md rule) | representative flat land |

INVESTMENT (AD off-plan, no morphology specified in the redirect) maps to the
COMMERCIAL office-tower constructor for now.

## Shots

`docs/research/archetype-shots-v2/<CAT>.png` — one per archetype, real footprint,
translucent canonical colour, gold plot boundary showing the setback gap.

Re-render: `python3 -m http.server 8088` at repo root, then headless-chrome
`--screenshot` of `_harness.html?cat=<CAT>` (add `&view=flat` for FUTURE_DEV).

## Constraints honoured

Colours / legend / opacity unchanged. `main`, `page.tsx` auth, prod DB and the
tiles were not touched. App code unchanged — all v2 code lives under `scripts/`
and `docs/research/`. The v1 lib archetype work (`emitArchetypeTiers`) stays on
the branch but is **superseded** by this morphology approach for the map visual.

## Open for founder

1. Verdict per archetype on the **silhouette** (shape), tune any constructor.
2. After approval: decide the **renderer path** — a Three.js custom layer is
   required to show these on the map (fill-extrusion can't). Then, separately,
   the tile/data question. Both STOP-gated.
3. INVESTMENT morphology — keep as commercial tower, or define its own?
