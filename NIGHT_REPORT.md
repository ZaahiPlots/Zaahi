# ZAAHI Night Report — 2026-04-15 / 2026-04-16

Senior engineer on call overnight. Scope completed: P0 pre-flight, P1 safe
fixes, P2 research, partial P3, P4 report. Everything that shipped was gated
on both `tsc --noEmit` and `pnpm build` (final build fully clean after each
commit, one clean rebuild from an empty `.next`).

---

## Pre-flight

### Work-in-progress handling
Three WIP fragments were live on the working tree when I started. None were
modified, rewritten, or deleted. All three are preserved in the stash so the
founder can restore them in the morning with `git stash pop`.

Current `git stash list`:
```
stash@{0}  user-wip-map-page-2026-04-15-v2: selection paint + applyZaahiExclusion (re-emerged)
stash@{1}  user-wip-site-plan-pdf-2026-04-15: fitBounds padding 180 + zoom-out step for tall 3D extrusions (unit: src/lib/generate-site-plan-pdf.ts)
stash@{2}  user-wip-applyZaahiExclusion-2026-04-15: paint selection tweaks + PMTiles zaahi-exclusion filter (unit: src/app/parcels/map/page.tsx)
```

What each stash contains:

1. **stash@{2}** — `src/app/parcels/map/page.tsx` (first capture):
   - `applySelectionPaint` tweaks: selected-plot `fill-opacity 0.85`,
     others `0.08` (was `0.7 / 0.2`).
   - New crisp-outline handling on `ZAAHI_PLOTS_LINE` — thick line on the
     selected plot, thin and dim elsewhere.
   - New grey-mute expression on `ZAAHI_BUILDINGS_3D` `fill-extrusion-color`
     (selected keeps land-use colour, others become `#7a7a7a`).
     **Note:** `fill-extrusion-opacity` was NOT touched — still literal `1`
     per CLAUDE.md rule.
   - New `applyZaahiExclusionToPmtiles(map)` — hides the PMTiles copy of any
     plot that ZAAHI itself lists, so the Signature 3D model doesn't sit on
     top of a semi-transparent duplicate. Function IS fully defined (reads
     from `zaahiPlotNumbersRef.current`, touches every
     `*_TILES_FILL / _LINE / _3D` layer). The previous-session note that
     this was "undefined" was wrong — `tsc --noEmit` and `pnpm build` both
     pass with the stash applied. I verified this before stashing.
2. **stash@{1}** — `src/lib/generate-site-plan-pdf.ts`:
   - `fitBounds` padding `80 → 180`, `maxZoom 19 → 17.5`, plus a half-step
     zoom-out so tall 3D crowns aren't clipped by the 45° pitch.
3. **stash@{0}** — `src/app/parcels/map/page.tsx` (re-emerged at 01:13):
   - Same functional diff as stash@{2}. Re-emerged on the working tree part
     way through my session — someone else (dev server / external editor /
     concurrent agent?) wrote the file. I stashed it again to keep `main`
     clean. Founder: if you only want one copy, drop stash@{0} after
     verifying it's identical to stash@{2}.

Restore in the morning:
```bash
git stash pop stash@{0}    # (or stash@{2} — identical content)
git stash pop stash@{1}    # site-plan-pdf
# then `git stash drop` the leftover
```

### Baseline
- `tsc --noEmit` clean at HEAD (pre and post my commits).
- `pnpm build` clean at HEAD after a `rm -rf .next && pnpm build` full rebuild.
  (First attempt failed with a stale `pages-manifest.json` — likely residue
  from a concurrent build that was killed — clean rebuild resolved it.)
- No `pnpm dev` was running on this checkout during my build; I took care
  not to stomp on it.
- Working tree clean except for the untracked `data/master-plans/` directory
  (a new batch of KML master plans — see Data inventory below).

---

## Commits made tonight
- `00fe521` — `fix(privacy): redact PII in notify-admin access-request log`
  — `/api/notify-admin` was writing raw name/email/phone/role to Vercel
  logs on every access request. CLAUDE.md rule: **"НЕ пиши PII в
  console.log никогда."** Replaced with redacted variants
  (email → `ab***@domain`, phone → `***1234`, name/role truncated). Zero
  behaviour change for clients; diagnostic value preserved.
- `89a2610` — `fix(ui): replace 'transition: all' with specific properties on legal pages`
  — CLAUDE.md UI STYLE GUIDE explicitly bans `transition: all`. 4
  violations in disclaimer/privacy/terms/LegalNavbar. Replaced each with
  concrete `color 150ms ease, border-color 150ms ease[, background-color …]`.
  Duration normalised 200 → 150 ms.

Both commits pushed to `origin/main`. No reverts.

---

## Bugs found

### Fixed (see commits above)
- `src/app/api/notify-admin/route.ts:9-11` — PII (email/phone) written to
  console.log. **Fixed** in `00fe521`.
- `src/app/disclaimer/page.tsx:133`, `src/app/privacy/page.tsx:130`,
  `src/app/terms/page.tsx:142`, `src/components/LegalNavbar.tsx:60` —
  `transition: 'all 0.2s ease'` violates UI STYLE GUIDE.
  **Fixed** in `89a2610`.

### Documented (not fixed — need founder sign-off or deeper refactor)

1. **`src/hooks/useAuth.ts` (whole file, ~93 lines) — dead, misleading code**
   - References `/api/login`, `/api/logout`, `/api/register`, `/api/user`
     — none of which exist. Platform uses Supabase client-side directly.
   - Not imported anywhere in `src/`. Grep confirms zero consumers.
   - Risk: a future agent imports it, gets a silent 401/404, wastes time.
   - Recommended fix: delete the file. Effort: 1 min. Did not ship tonight
     to avoid deleting user code without explicit approval.

2. **`src/app/api/modules/route.ts` — no approval check**
   - Public signature `export async function GET()` (no `req`), returns a
     directory listing of `core/*.py` filenames.
   - Gated by middleware Bearer token but does NOT call
     `getApprovedUserId`. Any authenticated-but-unapproved account can hit
     it and enumerate internal Python module names.
   - Severity: low (no PII, no data — filenames only), but it violates the
     CLAUDE.md rule "All sensitive API routes MUST call
     getApprovedUserId(req)" and "All NEW API routes MUST use
     getApprovedUserId(req) by default".
   - Recommended fix: add `getApprovedUserId(req)` guard and return `401`
     on missing. Effort: 5 min. Did not ship because CLAUDE.md says
     **"don't fix auth patterns without user sign-off"**.

3. **`src/app/api/cat/chat/route.ts` — no approval check, also placeholder**
   - Returns a hard-coded echo string. No LLM, no DB. Same gap as `modules`:
     middleware enforces Bearer token but handler skips `getApprovedUserId`.
   - Severity: low (placeholder endpoint, harmless response).
   - Recommended fix: gate behind `getApprovedUserId`; consider removing
     entirely if unused.

4. **API input validation — zod used on only 2 of ~23 non-public routes**
   - Only `parcels/submit` and `parcels/[id]/review` validate with zod.
   - Others rely on TypeScript destructuring which happily accepts any JSON
     shape (type-system erased at runtime).
   - Severity: medium. Malformed body → runtime throw → 500. Not a security
     break (Prisma types reject wrong shapes at DB layer) but error UX is
     ugly and logs get noisy.
   - Recommended fix: adopt a shared `parseJson(schema, req)` helper and
     roll out across all POST/PATCH/PUT handlers over several commits.
     Effort: ~2-4 hours. Schedule for a focused pass.

5. **`fill-extrusion-opacity` — correct, but worth documenting**
   - Verified both uses in `src/app/parcels/map/page.tsx` are literal
     numbers (`1` on ZAAHI layer line 2313, `0.35` on PMTiles line 2370).
   - CLAUDE.md-compliant. No action needed. Flagging because the
     user-WIP stashes are close to this area — when they're unstashed,
     double-check these two lines haven't mutated.

6. **`src/app/page.tsx:90`, `:121` — `(window as any).__zaahiPending`**
   - Two `as any` casts on `window` to set a page-local flag. Works, but
     defeats type-checking around auth state. Nit.

---

## Competitor research

Brief scan; not an essay.

### Bayut (bayut.com)
- Landing fetch blocked by bot protection — couldn't pull feature list
  programmatically.
- From general knowledge of the product: listings portal, heatmap of
  transactions, price history per community, mortgage/affordability tool.
  Strengths: scale of inventory (houses / apartments). Weakness for our
  niche: **weak plot-level tools, no affection-plan / building-limit data,
  no 3D**.

### Property Finder (propertyfinder.ae)
Pulled live from landing:
1. **Sale Price Map** — area-by-area price heatmap.
2. **Area Insights** — historical transaction & price-trend analytics.
3. **Land for sale** category listing.
4. **Mortgage Calculator**.
5. **Developers & new-project directory** with payment plans.
Strengths: transaction analytics, broad inventory. Weakness:
**no plot-level building limit / GFA / setback data**, no 3D, no
per-plot feasibility that models JV / BtS / BtR.

### Dubai Land Department (dubailand.gov.ae)
Pulled live from landing:
1. **Property Status Inquiry** (استعلام) — verify live parcel state.
2. **Real-estate transaction dashboard** — sales / mortgages / gifts totals.
3. **Title Deed Verification**.
4. **Developer Project Status** lookup.
5. **Property Valuation Service**.
Strengths: authoritative data (they ARE the registry). Weakness: single-
plot lookups, no portfolio view, no 3D, no feasibility engine, not built
for investor workflows.

### ZAAHI's differentiators (what we already have that none of them do)
- Plot-level DDA affection plan + building-limit geometry per parcel.
- ZAAHI Signature 3D buildings (podium/body/crown) auto-derived from
  land-use + GFA, rendered in-browser with MapLibre GL.
- 9-category canonical land-use legend aligned to DLD categories, not a
  lossy portal mapping.
- Feasibility calculator v5.0 (BtS / BtR / JV, BUA costs, SFA revenue,
  payment plans, JV profit split).
- Plugin architecture: adding a new country/emirate = one config file
  (ready for Abu Dhabi, Oman, Riyadh on Day 1).

### Gaps vs. competitors (things we should close)
- **Area-level price heatmap.** Property Finder's biggest draw for
  investors. We have per-plot prices in `currentValuation` — wiring a
  district-level aggregate into a heatmap overlay is a 4-8 hour job.
- **Transaction history per district.** We have `data/dld-transactions.csv`
  (1.5 MB, ~tens of thousands of rows) sitting on disk, unused by the map.
  Loading this and showing a per-district chart would match / exceed
  PropertyFinder's Area Insights.
- **Mortgage / affordability lane in the calculator.** We have a BtS/BtR/JV
  calculator, but no consumer "can I afford this land?" flow — which is
  Property Finder's core conversion mechanic.
- **Developer-project directory.** We have individual plots, not a
  curated "new off-plan projects" rail.

---

## Data inventory

### Parcels (live DB, read-only queries)
| Metric | Count |
|---|---|
| Total parcels | **114** |
| LISTED | 111 |
| VACANT | 3 |

By emirate:
| Emirate | Total | Priced |
|---|---|---|
| Dubai | 111 | 110 |
| Abu Dhabi | 3 | 2 |

**CLAUDE.md says "101 total" in the 2026-04-12 session snapshot. The DB now
shows 114.** 13 parcels added since then — consistent with recent commits
(`917f623` Meydan, `48c9f38` JVC, `3f19630` Yas Island, `e665eda` Al Ain,
`2691545` Dubai Islands, `1117786` x3 DDA listings, `ff5a388` x2 Warsan,
`eb0db83` x2 Furjan/BuKadra, `f8cd4d9` Hidd Al Saadiyat). CLAUDE.md session
status is stale; not touched (that doc is source-of-truth and I was told
not to modify without a clear reason).

By landUse (derived from latest `AffectionPlan.landUseMix[0].category`):
| Bucket | Count |
|---|---|
| MULTI (Mixed) | 53 |
| RESIDENTIAL | 45 |
| HOSPITALITY | 6 |
| COMMERCIAL | 4 |
| FACILITIES | 3 |
| FUTURE DEVELOPMENT | 2 |
| INDUSTRIAL | 1 |

Observation: **pricing coverage is excellent — 112 of 114 parcels priced
(98%)**. The 2 un-priced parcels are `DUBAI SOUTH` and `AL JAHILI` (latter
is Abu Dhabi). No action required; just worth noting both exist.

Top districts by parcel count:
| District | Count | Priced |
|---|---|---|
| MAJAN | 16 | 16 |
| SAMA AL JADAF | 13 | 13 |
| WARSAN FIRST DEVELOPMENT | 10 | 10 |
| DUBAI SPORTS CITY | 6 | 6 |
| DUBAI PRODUCTION CITY | 6 | 6 |
| CITY OF ARABIA | 6 | 6 |
| JADDAF WATERFRONT | 5 | 5 |
| DUBAI LAND RESIDENCE COMPLEX | 5 | 5 |
| BUSINESS BAY PHASE 1 & 2 | 5 | 5 |
| LIWAN 2 | 5 | 5 |
| (long tail of 1-4 parcels) | … | … |

Coverage gap: the platform is **heavily Dubai-centric** (111/114 = 97%).
Abu Dhabi launch (3 parcels, 2 priced) is barely underway. Oman PMTiles
are loaded but there are 0 Oman parcels in the listing DB.

### Master plan files on disk

`data/layers/` (tracked, served through `/api/layers/masterplans/*`):
- `01_Meydan_Horizon_Master_plan.kml`
- `02_AL_FURJAN_MASTERPLAN_new.kml`
- `03_DUBAI_ISLAND_master_plan.kml`
- `05_Pearl_Jumeirah_master_plan.kml`
- `06_D11_-_Parcel_L_D.kml`
- `07_International_City_Phase_2_3.kml`
- `08_Residential_District_Phase_I_II.kml`
- `Башни.kml` (towers — currently untranslated)
- `zones_masterplan.kml`
- `Community__1_.kml`, `Major_Roads.kml`, `Metro_Lines_…kml`,
  `governorate.kml`, `uae-districts.kml`, `Zaahi_Plots.kml`.

`data/master-plans/kadastr/DUBAI KADASTR/DUBAI KADASTR/` (UNTRACKED,
added to working tree today by the founder — not yet in `git`):
| File | Size | Placemarks |
|---|---|---|
| `01_Meydan Horizon Master plan.kml` | 164 K | 358 |
| `02_AL FURJAN MASTERPLAN new.kml` | 7.0 M | **21,028** |
| `03_DUBAI_ISLAND_master_plan.kml` | 2.1 M | 5,174 |
| `04_Nad Al Hammer - Master Plan.kml` | 96 K | 260 |
| `05_Pearl Jumeirah master plan.kml` | 788 K | 2,184 |
| `06_D11 - Parcel L D.kml` | 32 K | 86 |
| `07_Master Plan of IC3 - International City Phase 2 and 3.kml` | 1.6 M | 4,058 |
| `08_Residential District – Phase I, II Committed Plots.kml` | 3.5 M | 2,670 |
| `010 Red Line Districts_gadm41_ARE_3.kmz` | 72 K | — |
| `09_Metro Dubai.kmz` | 416 K | — |

**Huge new payload** — ~35,800 placemarks in this untracked drop. Items
1 / 2 / 3 / 5 / 6 / 7 / 8 look like more detailed replacements for
existing `data/layers/0X_*` files; item 4 (Nad Al Hammer) is NEW.
I did NOT build PMTiles / GeoJSON from them (destructive data ops require
explicit founder approval and the existing `data/layers/*` files are
the current source-of-truth). Two readme PNGs bundled with the KMLs say
"Как загружать KML где более 10000 объектов" / "… менее 10000 объектов"
— Russian instructions for ingest thresholds; the 21,028-placemark
Al Furjan KML sits squarely in the "more than 10000" bucket.

Recommended pipeline (not executed tonight):
1. Validate each KML parses (the 21K Al Furjan file may need chunking).
2. For each, diff against current `data/layers/0X_*` to confirm it's a
   strict superset before replacing.
3. Generate vector tiles (`tippecanoe`) for the 21K Al Furjan file;
   serve the smaller ones as GeoJSON.
4. Wire new Nad Al Hammer layer into `/api/layers/masterplans/nad-al-hammer`.

Effort: 2-6 hours depending on chunking / tile-generation choices.

### Layers currently served
- `/api/layers/dda/` — **206 district files** (full Dubai coverage).
- `/api/layers/masterplans/` — al-furjan, d11-parcel-ld, intl-city-23,
  meydan-horizon, pearl-jumeirah, residential-12, towers.
- `/api/layers/` flat: abu-dhabi-communities, abu-dhabi-districts,
  abu-dhabi-municipalities, communities, dda-freezones, dda-projects,
  dubai-islands, metro, riyadh-zones, roads, saudi-governorates,
  uae-districts.
- `/tiles/` (PMTiles, served static): dda-land (99K plots), ad-land-adm,
  ad-land-other (together 362K AD plots), oman-land (94K Oman plots).

### Proposed new layers (from untracked data)
- `/api/layers/masterplans/nad-al-hammer` — NEW, 260 placemarks, small
  file, low-effort wire-up.
- Refresh of 7 existing masterplan endpoints from the new kadastr drop
  (bigger, carry validation risk — see pipeline above).

---

## Proposals (not shipped)

1. **District price heatmap overlay** (competitive parity with Property
   Finder's Sale Price Map). We already compute `currentValuation` /
   `plotArea` client-side in `SidePanel`. Aggregating at the district
   level and rendering as a tinted overlay on the existing community
   polygons is cheap. *Effort: 4-8 hours. Risk: low — read-only
   overlay, no DB changes.*
2. **Area Insights card** (transaction history). `data/dld-transactions.csv`
   is already on disk (1.5 MB). Parse once at build time, expose
   `/api/insights/district/[slug]`, render mini chart in SidePanel.
   *Effort: 1 day. Risk: medium — must make sure CSV schema stays stable
   across founder refreshes.*
3. **Kill `src/hooks/useAuth.ts`** (dead misleading code). *Effort: 1 min.
   Risk: zero — zero imports.*
4. **Add `getApprovedUserId` gates to `/api/modules` and `/api/cat/chat`**
   — brings the 2 non-compliant handlers in line with CLAUDE.md security
   rule. *Effort: 5 min. Risk: low, but I was told not to touch auth
   patterns without approval.*
5. **Zod-validate every non-public POST/PATCH**. Uniform error envelope,
   no more 500s from malformed bodies. *Effort: 2-4 hours, one commit
   per route. Risk: low.*
6. **Ingest the new `data/master-plans/kadastr/` KML drop** — 10 files,
   ~35,800 placemarks, one new district (Nad Al Hammer). See pipeline
   above. *Effort: 2-6 hours. Risk: medium — must diff-verify each file
   is a superset before swapping.*
7. **Abu Dhabi parcel push.** We only have 3 AD parcels; PMTiles are
   already loaded (362K plot shapes). Founder-side: pick 20-50 priority
   AD plots with prices, drop them in an Excel for batch-seed. *Effort
   on the agent side: 2-3 hours once the Excel arrives. Risk: low,
   follows the existing `update-prices-from-excel.ts` pattern.*

---

## Open questions for founder

1. **Three stashes — which do you want applied?** Probable answer:
   `stash@{0}` + `stash@{1}` (drop `stash@{2}` if identical to `{0}`).
   Quick way to confirm identity:
   `git stash show -p stash@{0} > /tmp/a; git stash show -p stash@{2} > /tmp/b; diff /tmp/a /tmp/b`.
2. **The new kadastr KML drop** — do you want me to (a) replace the
   existing `data/layers/0X_*` files in-place, (b) keep both and route
   the new layers to different endpoints, or (c) wait for a diff
   review first?
3. **CLAUDE.md SESSION STATUS** section says "101 parcels". DB shows 114.
   Should I refresh that section in CLAUDE.md on your say-so, or do you
   maintain it manually? (I did not edit CLAUDE.md tonight.)
4. **`/api/modules` and `/api/cat/chat`** — are either actively used?
   If not, I can just remove them instead of gating (even cleaner).
5. **Feature priority for next batch:** district heatmap, area insights,
   Abu Dhabi push, or zod-hardening? I'd recommend **district heatmap
   first** — competitor parity on the single biggest "why would I use
   this" demo moment.

---

## Files touched
- `src/app/api/notify-admin/route.ts` (edit, commit `00fe521`)
- `src/app/disclaimer/page.tsx` (edit, commit `89a2610`)
- `src/app/privacy/page.tsx` (edit, commit `89a2610`)
- `src/app/terms/page.tsx` (edit, commit `89a2610`)
- `src/components/LegalNavbar.tsx` (edit, commit `89a2610`)
- `NIGHT_REPORT.md` (this file, new)

No code outside the two commit scopes touched on `main`. Three stashes
preserve the founder's WIP verbatim.

---

*Built with care by the overnight shift. HEAD builds clean; sleep well.*
