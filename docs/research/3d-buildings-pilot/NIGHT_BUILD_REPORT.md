# Business Bay — overnight batch build report

**Date:** 2026-05-25 (night session)
**Branch:** `research/3d-buildings-pilot`
**Script:** `build-all-bb.py` (autonomous, headless Blender 5.1.2)
**Total build runtime:** 3.8 s for 454 buildings
**Output:** `business-bay-all.glb` (3.2 MB) + 12 individual hero GLBs in `heroes/`

---

## Honest scope statement (read first)

The founder's brief asked for "minimum 80 % similarity" per building, with
web-search-for-facade-photos research on every named tower. **That target
was not reached in this batch.** This run delivers a parametric ZAAHI
Signature massing for every OSM building in Business Bay, with extra
window-grid + crown detail on a hero list — a meaningful improvement on
the prior single-tier OSM extrusion (35-40 % similarity for Millennium
alone) but far short of the photogrammetric "the human looks at it and
recognises this specific tower" bar that 80 % implies.

Realistic per-class similarity in this batch:

| Building class | Count | Similarity (estimate) |
|---|---:|---:|
| Heroes (window grid + spandrels + gold ring + crown setbacks) | 12 | 50–60 % |
| Tall named non-heroes (h ≥ 50 m, sparse spandrels) | ~70 | 40–45 % |
| Short named / unnamed with real height | 87 | 30–40 % |
| Fallback 15 m extrusions | 275 | 20–25 % |
| **Whole scene impression** | **454** | **~40–45 %** |

What blocks 80 %:

1. **No per-building facade photos**. Tooling available to me (WebFetch
   on known URLs only — no Google Images / Street View browser) cannot
   harvest facade reference at the rate of "100+ buildings per night".
2. **No per-building hand-modelling**. Heroes use the same parametric
   3-tier as every other named tower — just denser articulation. Real
   Burj Vista / Address / Damac silhouettes need building-specific
   geometry (curved corners, podium articulation, unique crown forms)
   that has to be drawn by hand.
3. **Materials are uniform**. All 454 buildings share the same 5-PBR
   palette. Reality has glass / stone / metal panel mixes that vary
   per facade.

**What I did instead** is push the parametric massing as far as it goes
without per-building knowledge:

- Real OSM footprint (43 different rectangles + a handful of complex
  shapes — the OSM contributors in Dubai actually got the building
  outlines right at the building-edge level).
- Real heights for 209 / 454 buildings (46 %); 15 m fallback for 245.
- ZAAHI Signature 3-tier — same algorithm as `loadZaahiPlots` runs
  client-side. Podium / body / crown scale 1.00 / 0.70 / 0.50.
- Window grid on heroes (per-floor spandrel band on all 4 sides +
  vertical mullions on the broad face).
- Sparse spandrel articulation on tall named non-heroes.
- Gold ZAAHI accent ring at the body→crown joint on all heroes ≥ 35 m.
- One shared 5-material PBR palette (Glass blue-grey · Frame white ·
  Concrete dark · Spandrel warm-grey · Gold).

For a Phase B "real 80 %" pass: see *Recommended next steps* below.

---

## Pipeline

```
business-bay-osm.json (519 KB)            business-bay-roads.json (1.1 MB)
  471 elements                              1202 vehicle ways
  454 ways + 17 relations                   fetched 2026-05-25
        │                                          │
        └───────── build-all-bb.py ────────────────┘
                  (headless Blender 5.1.2)
                          │
            ┌─────────────┼──────────────┐
            ▼             ▼              ▼
   business-bay-all   heroes/*.glb   business-bay-all
        .glb         (12 files)        .stats.json
       3.2 MB        14-183 KB           sidecar
   57 k triangles
```

### Orientation rule

OSM building footprints encode real-world bearing — the long axis of a
typical BB tower already runs parallel to the road it fronts. The script
does **not** bake per-building rotation in Blender; it projects each
footprint's lng / lat → local metres around the bbox centre, preserving
the OSM bearing.

When the combined GLB is loaded into deck.gl on the live map, the same
`getOrientation: [0, -50, 90]` correction the founder dialled in for
Millennium Tower (commit cd74604) aligns every building. The −50° yaw is
a consequence of the deck.gl coord-system transform (glTF Y-up → deck.gl
Z-up via the +90° roll), not a per-building factor.

### Height resolution per building

| Source | Buildings | % |
|---|---:|---:|
| OSM `height` tag (explicit metres) | 172 | 38 % |
| OSM `building:levels` × 3.5 m | 37 | 8 % |
| 15 m fallback | 275 | 54 % |

The fallback dominates because OSM contributors in BB tagged the tall
towers (those visually important) carefully, and left small ancillary
buildings (cooling plants, mosque annexes, parking garages) untagged.
This is the right priority order — the visible skyline reads correctly.

### Tier assignment

| Tier | Geometry | Condition |
|---|---|---|
| Podium only | One prism at footprint × height | h ≤ 14 m |
| Two-tier | Podium (100 %, 0–14 m) + body (70 %, 14–h) | 14 < h ≤ 35 m |
| Three-tier | Podium (100 %) + body (70 %, 14 m → h−7 m) + crown (50 %, h−7 → h) | h > 35 m |

---

## Heroes — what got built and what didn't

Founder's hero list vs. OSM coverage:

| Hero (founder's list) | OSM name match | OSM height | Status |
|---|---|---:|---|
| **Millennium Tower** | ✅ "Millenium Tower" | 285 m | Detailed model, render-tested |
| Bay Gate Tower | ❌ not tagged in OSM bbox | — | Not in this batch |
| Executive Towers (B / K / M) | ✅ matched all three | 190 / 186 / 210 m | Heroes |
| Churchill Towers | ❌ not tagged in OSM bbox | — | Not in this batch |
| Ubora Tower | ❌ not tagged in OSM bbox | — | Not in this batch |
| Vision Tower | ✅ matched | 92 m (OSM); 260 m per Wikipedia (Atkins design, tvsdesign, completed 2011) | Hero; OSM height too low — using OSM value, would benefit from `height` tag correction |
| The Opus (Zaha Hadid) | ❌ not tagged in OSM bbox | — | Not in this batch |
| Marasi Business Bay | ❌ not tagged in OSM bbox | — | Not in this batch |

Of the founder's 8 named heroes, **4 matched OSM** (Millennium + 3
Executive variants + Vision). The other 4 famous BB landmarks (Bay Gate,
Churchill, Ubora, Opus, Marasi) are missing from OSM's `name` tagging in
this bbox — they exist as `building=yes` ways but lack a name tag, so
the script falls back to anonymous massing for them.

Recovering those four requires either (a) OSM contribution effort, (b)
manual override map of OSM way-id → canonical name, or (c) cross-
referencing with a different dataset (DDA / Trakhees / Wikipedia). Out
of scope for the overnight batch.

Bonus heroes added from the named-height-≥-200 m set (these came
through OSM and got the full hero treatment automatically):

| Bonus hero | OSM height | OSM way |
|---|---:|---:|
| Opera Grand | 288 m | 1047612078 |
| Grande Signature Residences | 267 m | 1047612077 |
| Paramount Hotel Midtown | 258 m | 1146969101 |
| Manazel Al Safa Tower | 248 m | 532853133 |
| Tiara United Tower 2 | 225 m | 399867027 |
| MBK Tower | 200 m | 532853124 |
| BLVD Heights Tower 1 | 200 m | 723559993 |

**Total heroes in this batch: 12** (out of 8 requested; 4 OSM-named
heroes the founder asked for that aren't tagged in OSM are missing; 8
bonus named-high-rises filled in).

### Per-hero output

| Hero (slug) | Triangles (heroized obj count) | GLB |
|---|---:|---:|
| millennium-tower | 68 objs | **75.9 KB** |
| opera-grand | 70 objs | **182.8 KB** (most complex footprint — 15 nodes) |
| grande-signature-residences | 64 objs | 71.5 KB |
| paramount-hotel-midtown | 62 objs | 69.4 KB |
| manazel-al-safa-tower | 60 objs | 67.4 KB |
| tiara-united-tower-2 | 55 objs | 62.1 KB |
| executive-tower-m | 51 objs | 64.7 KB |
| mbk-tower | 49 objs | 55.5 KB |
| blvd-heights-tower-1 | 49 objs | 55.4 KB |
| executive-tower-b | 47 objs | 53.2 KB |
| executive-tower-k | 46 objs | 52.1 KB |
| vision-tower | 7 objs | **14.0 KB** (OSM height 92 m → smaller hero treatment; real height is 260 m, the GLB underbuilds it) |

The Vision Tower outlier flags a real OSM-data quality issue worth a
follow-up edit: its OSM tags say 92 m when public sources (Wikipedia,
SkyscraperCenter) say 260 m. Easy fix — patch the height in a
script-local override map.

---

## Combined GLB

| Metric | Value |
|---|---:|
| File | `business-bay-all.glb` |
| Size | **3.2 MB** |
| Vertices | 32,746 |
| Triangles | 57,860 |
| Buildings | 454 (out of 471 OSM elements; 17 multipolygon relations skipped) |
| glTF version | 2.0 (magic `glTF` verified) |
| Materials | 5 shared (Glass · Frame · Concrete_Dark · Spandrel · Gold), 1 hero-only (none baked into combined yet) |

When dropped into deck.gl with `getOrientation: [0, -50, 90]` at the
bbox-centre anchor `[55.271, 25.1875]`, every building should land at
its real-world position.

---

## What it would take to actually hit 80 %

This batch is the cheap parametric pass. Pushing past 60 % needs:

1. **Per-hero hand-modelling** in Blender GUI by a 3D artist with a
   binder of facade reference photos. Founder-rule-of-thumb: ~2-3 hours
   per hero. For 15-20 BB icons, that's a 30-60 hour project.
2. **Building-specific massing**:
   - Burj Vista's twisted geometry
   - Address Downtown's curved facade
   - Damac Heights' arched podium
   - The Opus's cube-with-void (Zaha Hadid)
   None of which the parametric 3-tier captures.
3. **Per-facade texture maps**. Bake one curtain-wall PBR per major
   visual style: blue-tinted glass / bronze panel / off-white stone /
   etc. ~5-10 texture sets covers most of BB.
4. **OSM data quality pass** to fill in the missing names (Bay Gate,
   Churchill, Ubora, Opus, Marasi) plus correct heights (Vision Tower's
   92 → 260 m). Either contribute back upstream or maintain a local
   override map.
5. **Web research pipeline** — would need an MCP server or scripted
   harvester that can pull SkyscraperPage / SkyscraperCenter / Wikipedia
   for any building name and extract height + facade material in
   structured form. WebFetch alone is too manual.

Effort breakdown for a true 80 % pass: ~80-120 hours for an artist +
~10-20 hours of pipeline work for an agent to ingest the per-building
overrides. Out of scope for a single overnight run.

---

## Files in this commit

| File | Status | Purpose |
|---|---|---|
| `build-all-bb.py` | new | Reproducible build script — Blender headless |
| `business-bay-roads.json` | new (1.1 MB) | Overpass-fetched vehicle ways for orientation reference; cached |
| `business-bay-all.glb` | new (3.2 MB) | Combined — 454 buildings as one GLB |
| `business-bay-all.stats.json` | new | Sidecar coverage stats |
| `heroes/` | new dir | 12 individual hero GLBs |
| `NIGHT_BUILD_REPORT.md` | new | This document |

Pre-existing files on this branch (untouched, kept for context):
- `business-bay-osm.json` — Overpass building cache
- `business-bay-buildings.glb` — original 396 KB single-tier OSM extrusion
- `millennium-tower-detailed.{glb,blend}` — the hand-tuned hero
- `reference-1.jpg`, `reference-2.png` — Wikipedia source images
- Older spike artifacts (`blender-hero-building.glb`, etc.)

---

## Constraints honoured

- ✅ `blender --background --python` (Path B headless)
- ✅ Branch `research/3d-buildings-pilot` only — no main edits, no push
- ✅ No DB query (per `feedback_no_credential_commands`)
- ✅ No edits to `src/`, prod, schema, dashboard, ZAAHI Signature 3D,
  fill-extrusion-opacity literals, big-map 5×5 stacks, or mini-dock
- ✅ Ground plane explicitly NOT exported in any GLB
- ✅ All GLBs are valid glTF 2.0 (magic byte verified)
- ⚠ "80 % similarity target" NOT reached — see honest scope statement
  above. This batch achieves ~40–45 % scene-impression similarity; the
  reachable ceiling without per-building hand-art is ~55 %.

---

## Decision points for the founder

1. **Accept this batch as the BB baseline** and ship the combined GLB
   into the deck.gl spike on `/parcels/map`? Net: 454 buildings instead
   of 1, ~3.2 MB extra asset, same `getOrientation` rule.
2. **Phase B hand-art** on the top 15 heroes — founder commissions a
   3D artist with the OSM footprints + heights as their starting point;
   the result drops into `heroes/` as drop-in replacements.
3. **OSM contribution pass** — fix the missing names + Vision Tower's
   height in OSM itself. Self-correcting; benefits everyone using OSM.
4. **Override map** — keep OSM as-is, maintain a small local JSON of
   `way-id → canonical name + override height + override yaw` for the
   buildings OSM gets wrong. Cheapest fix; ~30 min to set up.

I recommend (4) + (1) for the next 24 hours: ship this batch + add a
small OSM override map that fills in the 4-5 missing hero names and
patches Vision Tower's height. Hand-art (2) only after the deck.gl
integration is wired up end-to-end and we know whether the volume of
hand-art is actually worth the visual win.

Awaiting founder review.
