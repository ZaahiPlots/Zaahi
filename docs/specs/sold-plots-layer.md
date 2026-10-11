# Sold plots layer — Phase A research & spec

**Audience:** Dymo (approval), then one Sonnet build session (Phase B).
**Branch:** `research/sold-plots-layer` (docs only, from `origin/main` `ed3e022`).
**Date:** 2026-10-11. **Status:** Phase A complete — awaiting founder decisions (§9).
**Companion:** `docs/research/dxb-enrichment-audit.md` (field inventory + registered-project link test).
**Measurement scripts:** throwaway, in the session scratchpad (not committed). Every number below is
measured unless marked **assumed**. Every derived value states its formula.

Maps to canon: **§01 Land** ("transaction history, location coordinates, valuation metrics" are
required data points) and **§66 Market Intelligence** ("transaction volume tracking, pricing history,
geospatial market segmentation"). Canonical docs are not edited.

---

## 0. TL;DR

1. **Sold-land volume.** Dubai has **107,063** registered land *sale* transactions in the DLD open
   dump (1997 → 2026-04; Sales group only, gifts 6,145 and mortgages 37,605 excluded). DXB Interact,
   filtered Dubai-wide to Type = Plot, shows **46,819** sales for 2012 → 2026-10-11 (UI date picker
   stops at 2012). The DLD dump carries **no plot identifier on transactions** — row-level placement
   is only possible from DXB Interact rows (land number per sale) or the DLD xlsx registry exports.
2. **What we hold.** ≈ 25.9k DXB land-sale rows (~24 % of the 107k) and **11,327 plots** whose sale
   resolves to a plot id; **4,231** of those are DDA plots (4.3 % of 99,126) and can be pinned on the
   DDA centroid today. A further ~1,645 non-DDA plots (JVC, JVT, Dubai South, Meydan Horizon) have a
   harvested lat/lng. Everything else we hold (~10.9k DXB location/plot pairs) cannot be placed yet.
3. **Closing the gap** under the 300-row export cap costs **437 exports** (89 DLD areas that contain a
   DDA plot) to **813 exports** (all 238 areas, all years), formula in §3.5 — plus one detail-page
   fetch per sale in developer-coded communities (JVC, Palm, Dubai Hills, DAMAC) for coordinates.
   DXB Interact now advertises an MCP connector ("Add to Claude") — untested, could replace exports.
4. **Registered project.** The **Old Numbers hypothesis fails: 0 / 2,623** matches against any RERA
   project identifier. The working key is `DDA PLOT_NUMBER = land_registry.parcel_id →
   land_registry.project_id → projects.json → developers.json`: **66.1 % of DDA plots** reach a DLD
   land row, **45.1 % reach a RERA project** (76 % for Under-Construction / Pre-Construction plots),
   with status, % complete, cancellation date and developer at 100 % coverage on the matched set.
5. **Gating.** On `main` there is **no server-side tier enforcement at all** — GOLD is a visual badge.
   The branch `feat/masterplans-layer` enforces GOLD = founders + ADMIN inside the tile route.
   `getAdminUserId` on main has identical membership. A sold-plots route must call it itself;
   `/api/layers/*` is public by middleware and must not be used.
6. **Build shape.** Static JSON under a tracked `data/` dir behind a founder-gated route, no schema
   change, GeoJSON point source with `cluster: true` for low zoom. Prisma tables deferred until the
   layer graduates past founder research.
7. **Dependency.** Commit 2 (tile click → side panel) was never written. Build the sold layer on
   `main` with its own click binding + the `SidePanel directData` adapter that commit 2 was going to
   introduce; the master-plans branch then reuses it.

---

## 1. Sources and gap (task 1)

### 1.1 Identity facts that drive everything

- **DDA `PLOT_NUMBER` (7–8 digits) = DLD municipality number = `land_registry.parcel_id` = Intel-kit
  `municipality_number`.** Measured: 65,478 / 99,126 DDA plot numbers exist as `parcel_id` (66.1 %);
  0 match `munc_number`, `land_number` or `property_id`.
- **DXB Interact "Plot No." is NOT the DDA number.** It is the DLD land number inside an area
  (`251` in Al Hudaiba) or a developer code (`JVC15AMRH006`, `JAH-PA-11-087`, `DH-B212B`). Direct
  string match to DDA = 0. The only bridge is `(area_name, land_number) → land_registry.parcel_id`
  (219,150 entries, 3,158 conflicts), and it fails in developer-coded communities.
- **DLD `transactions` has no plot key at all** (47 fields: area, master project, project number,
  procedure, worth, area m²; no parcel_id / land_number / munc). Confirms the 2026-05-11 finding.

### 1.2 What each source holds

| Source | Rows | Land sales | Distinct plot ids | Has coords | Has DDA id | Has tx type |
|---|---|---|---|---|---|---|
| `~/Intel/dxb/dxb_master.db` (DXB exports) | 88,130 tx (404 PDFs) | **22,479** Plot rows, 2009-12 → 2026-07 | 11,955 plot_no / 17,208 (location, plot_no) | no | no (bridge) | no — export is sales-only |
| JVC/JVT/Majan Plot PDFs (not ingested) | 2,662 rows | 2,662 | JVC 942, JVT 167 plots | detail-page harvest | no | no |
| `~/Intel/intel/kit/db.sqlite` (DLD xlsx registry, PII) | 99,631 party rows / 27,295 deals | 30,187 deals | **5,060 munc** (25,564 area/plot keys) | no | **3,123 in DDA** | yes (procedure_name) |
| data.dubai `transactions.json` | 1,697,782 | **107,063** Land ∧ Sales | **none** | no | no | yes (group 1/2/3) |
| data.dubai `land_registry.json` | 253,659 land rows | — | 221,206 parcel_id | no | 65,478 DDA | — |
| DDA `data/dda-plot-index.json` + `data/layers/dda/*.geojson` | 99,126 plots / 206 layers | — | all | **polygon → centroid** | yes | — |

"Sold" definition applied (default until the founder rules): DLD transaction group 1 = Sales
(procedures Sell 33,827 · Delayed Sell 70,432 · Development Registration 1,518 · Sell Development 609
· Lease-to-Own 427 · Adding Land By Sell 136 · others < 50). Group 2 Mortgages (37,605 land rows) and
group 3 Gifts (6,145) are counted separately and never shown as sales. DXB "Sales History" exports
contain sales only, so DXB-sourced pins inherit that definition automatically.

Volume by year (DLD land sales): ≤ 1.1k/yr before 2008 · 2021 6,214 · 2022 12,361 · 2023 13,503 ·
2024 14,656 · **2025 21,527** · 2026 (→ Apr) 4,117. 2020–2026 = 69.5 % of all rows.

**DXB vs DLD count reconciliation — open.** DXB 46,819 (2012 →) vs DLD ≈ 100k (2012 →, pro-rata).
Likely cause: DXB "Plot" is a narrower class than DLD "Land" (DLD "Delayed Sell" = 70k off-plan land
rows, many of which DXB files under Villa/Townhouse when the plot carries a unit). **Assumed**, not
measured; does not change the design.

### 1.3 The gap

| Quantity | Value | How |
|---|---|---|
| Dubai land sale transactions (DLD, 1997 → 2026-04) | **107,063** | stream count, Land ∧ group 1 |
| Distinct plots those sales touch | **unknown** (no plot id); size-fingerprint `(area, procedure_area)` = 41,662 | — |
| DXB land-sale rows held | ≈ 25.9k (22,479 + 2,662 + DS 292 + Meydan ≈ 439) = **~24 %** | row counts |
| Plots held with sale-level detail **and** a resolvable plot id | DXB-bridged 6,285 + kit 5,060 − 18 overlap = **11,327** | set ops |
| …of which DDA plots (placeable on a DDA centroid today) | **4,231** (4.3 % of DDA) | int match |
| …non-DDA with harvested lat/lng (JVC 942, JVT 167, DS 235, Meydan 301) | **~1,645** | coords.db rows |
| DXB pairs held with **no** resolvable id or coordinate | **~10.9k** (17,208 − 6,289) | bridge miss |
| DDA plots that *could* be placed once their land number is exported | 65,478 | land_registry ∩ DDA |

The two local stores are near-disjoint (only 18 municipality numbers in both), so they add, not overlap.

### 1.4 Cost to close under the 300-row cap

DXB caps one export at 300 rows; a community is pulled as overlapping date windows sized with the
page-1 "Transactions" counter (counter = row count when the window is uncapped — verified 151 = 151,
224 = 224 in the Intel pipeline). 357 of the 404 ingested files hit exactly 300 rows.

Formula: `exports(area) = ceil(DLD_land_sale_rows(area) / 300)`; total × **1.5** safety for window
overlap and re-pulls of exactly-300 files (**assumed**). Operator time 2–4 min per export (**assumed**).
Assumes a DXB Plot-filtered export per DLD area ≈ the DLD land-sale count for that area (**assumed
±50 %**: JVC check gave 2,662 DXB rows vs 1,272 DLD rows under master project JVC because DXB's
community spans plots DLD registers under Al Barsha South Fourth).

| Scope | DLD land-sale rows | min exports | × 1.5 |
|---|---|---|---|
| All 238 areas, all years | 107,063 | 542 | **813** |
| 89 areas containing ≥ 1 DDA plot | 68,039 | 291 | **437** |
| All areas, 2020–2026 only | ~74,400 | ~377 | **~566** |

Largest areas: Al Hebiah Fifth 42 exports (7,600 DDA parcels) · Madinat Hind 4 29 (3,764) · Al Yelayiss 1
22 (6,795) · Jabal Ali First 21 (0 DDA) · Al Hebiah Third 15 · Saih Shuaib 1 14 · Wadi Al Safa 5 12.
Communities already pulled (Dubai South 158 exports, JLT 61, Jumeirah Park 26) were pulled as *all
property types*; a Plot-filtered re-pull is 5–10× cheaper and is the recommended path.
After export, the `(area, land_number)` bridge resolves ~95 % of rows in DLD-numbered areas
(Hor Al Anz 278/284, Al Warsan Third 204/204) but a polygon follows only where a DDA layer exists.
Developer-coded communities need **one `dxb.is` detail-page fetch per sale** for lat/lng
(JVC precedent: 1,978 pages → 1,812 with coordinates, 91.6 %).

**Alternative to measure first:** DXB Interact's footer offers "Use DXB Interact data inside Claude —
Add to Claude" (`https://go.ly/AI`), an MCP connector. Not tested in Phase A (would need the founder's
account to authorise it). If it exposes transaction rows with plot numbers, the 300-row cap and the
PDF parser disappear. Also seen: `/dubai-projects-construction-progress` (project tracker with
"% Completed (As of Mon-YYYY)", Launch, Completion per project) and `/download-dubai-property-data`
("Downloads restricted to developer accounts", unit-level only).

---

## 2. Placement (task 2)

| Source | Pin coordinate comes from | Match to DDA by plot number | Spatial check |
|---|---|---|---|
| Intel kit (DLD xlsx, munc present) | DDA polygon centroid via `municipality_number` | **3,123 / 5,060 munc (61.7 %)**; 12 % of area/plot keys (most rows lack munc) | not needed — id is exact |
| DXB exports, DLD-numbered areas | `(area, land_number)` → `parcel_id` → DDA centroid | 6,289 / 17,208 pairs bridge (36.5 %) → **1,114 in DDA (6.5 %)** | not needed |
| DXB exports, developer-coded areas (JVC, Palm, Dubai Hills, DAMAC, PJA, Dubai South) | `dxb.is` detail page → Google-Maps link → lat/lng | ≈ 0 % by number (Palm 573 → 0, JVC 308 → 0, Dubai Hills 284 → 0, Saih Shuaib 1 1,189 → 3) | **required**: point-in-DDA-polygon or nearest master-plan polygon |
| Master-plan sets (JVC/JVT/DS/Meydan) | `plot_bridge.csv` (plot_no → munc / dld_land_no), `ds_plot_master.csv` lat/lng + far, `mh_plot_master.csv` pin_lat/lng | JVC/JVT plots are not DDA; they map to the master-plan tiles on `feat/masterplans-layer` (981 polygons, `mun`/`dld` props) | polygon id |
| data.dubai `transactions` | **none** — group level only (area + master project) | 0 row-level | n/a |

Spatial check of harvested pins: not re-measured in Phase A. The Intel notes hold one 98-pin
sample from advert links (not DXB detail pages): median 907 m to the nearest DDA plot, 26 within
50 m, tail to 241 km. **Treat `gmaps_q` pins as "approximate" until a DXB-specific sample is measured**
(Phase B step 2 does this on 50 JVC pins against the master-plan polygons).

**Share that cannot be placed at all (today):** of the 17,208 DXB pairs, placeable ≈ 1,114 (DDA) +
~1,645 (harvested) ≈ 2,759 → **~84 % unplaced**. Of the kit's 5,060 munc, 62 % placeable (DDA);
the remaining 38 % are DM / Trakhees parcels for which the platform holds no polygon — **no
coordinate source exists for them** short of DXB detail pages or a DM cadastre.

**Non-DDA pin placement rule (proposed):** (1) `parcel_id` → DDA centroid; else (2) master-plan
polygon via `plot_bridge.csv` (JVC/JVT) or `ds_plots.geojson` / `mh_plot_master.csv`; else (3)
harvested lat/lng flagged `approx`; else (4) **not shown**, counted in a per-community "unplaced"
figure on the layer legend so the founder sees the hole.

---

## 3. Registered project (task 3) — summary; full test in the audit doc

- **Old Numbers → RERA project: REJECTED.** 0 / 2,623 against `projects.project_number`,
  `project_id`, `property_id`, `land_registry.land_number`, `munc_number`, `parcel_id`, `property_id`.
  It is the developer's pre-registration plot code (`AR3.3C.18`, `VN.P13.223`); matches
  `land_registry.pre_registration_number` in 32.6 % (854 / 2,623), of which 45 point to a
  *different* parcel (code collisions `E129`, `CA184`). Keep as display-only.
- **Working chain:** `DDA PLOT_NUMBER = land_registry.parcel_id → land_registry.project_id →
  projects.project_id → developers.developer_id`. Full index: 99,126 → in registry 65,478 (66.1 %)
  → has project 46,454 (46.9 %) → resolves in `projects.json` **44,701 (45.1 %)**. Cached 3,172
  sample: 63.0 %. By DDA status: Under Construction 76.5 %, Pre-Construction 76.3 %, Completed
  55.3 %, Suspended 51.5 %. 0 plots map to > 1 project.
- 425 cached plots sit in the registry with no project (Arabian Ranches I, Dubai Industrial City,
  The Villa) — a correct "no RERA project", not a join failure.
- **Attributes per matched project (100 % coverage on 1,999 pairs):** `project_status`
  (FINISHED / ACTIVE / NOT_STARTED / PENDING / CONDITIONAL_ACTIVATING / FRIEZED), `percent_completed`,
  developer `developer_name_en` (+ licence no., registration date, legal status), escrow agent (99 %),
  start / end / completion dates. **No explicit "suspended" flag**; proxies: status
  CONDITIONAL_ACTIVATING or FRIEZED, `cancellation_date` (33 projects), DDA `Suspended` / `IS_FROZEN`.
  DDA "Suspended" ↔ RERA CONDITIONAL_ACTIVATING in 97 / 103 matched cases — the two agree.
- `projects.json` snapshot is 2025-10-02 vs `land_registry` 2026-04-10: 364 project ids missing;
  a refresh adds +1.4 pp. `project_name` in `projects.json` is Arabic — take `project_name_en`
  from `land_registry`.

---

## 4. Gating (task 4)

Verified on `main` (`ed3e022`) and on `feat/masterplans-layer`:

| Layer | Where enforced | Membership | Verdict |
|---|---|---|---|
| GOLD rows on `main` (DDA plots, 7 master-plan KMLs, AD plots) | **nowhere** — `catalog.ts:344-346` "UX only", `LockBadge` visual, `useAccess` does not exist; data served from public R2 / public `/api/layers/*` | — | visual badge only |
| Master plans tiles (branch) | `src/app/api/tiles/masterplans-land.pmtiles/route.ts:37-49`: middleware Bearer presence → `getApprovedUserId` (approved, not PAUSED) → `getUserTier` ≠ GOLD → **403 TIER_REQUIRED** | `src/lib/tier.ts:18-25`: `isFounderEmail` ∨ `role === ADMIN` (flagged ASSUMED) | enforced in the route |
| `getAdminUserId` on `main` | `src/lib/auth.ts:148-168` | `FOUNDER_EMAILS` ∨ `role === ADMIN` — **same membership** as branch GOLD | existing founder-or-ADMIN gate |

**Can another signed-in approved user reach the data?**
- Master-plans tiles: no — the 403 in the route stops them; hiding the Layers row is cosmetic.
- A new `/api/sold-plots/*`: **yes, unless the handler itself calls `getAdminUserId`** (or
  `getAccessState` + `isFounderEmail` for strict founders-only). `getApprovedUserId` alone admits every
  approved cohort user. Middleware only checks that a Bearer header exists (`src/middleware.ts:5-9,
  48-51`). `/api/layers/*` is public for GET/HEAD by rule and by `.claude/rules/security.md` — the
  sold-plots routes must live outside it.
- No strict founders-only (excluding ADMIN) gate exists on main; it is a one-liner if wanted.

**Rule for this layer:** pins file and card API both behind `getAdminUserId`; the pins payload carries
ids and coordinates only (no price); the card API returns the history. Same shape as D6 on the
master-plans spec (never bake price/ppsf/history into anything public). Client probe: a
`/api/me/tier`-style endpoint (branch) or a new `/api/me/access` returning `{ isAdmin }`; Layers row
hidden otherwise. The pins route is not cacheable publicly (`cache-control: private`).

---

## 5. Build shape (task 5)

| | **S — static files behind a gated route** (recommended) | **P — Prisma tables** |
|---|---|---|
| Schema | none | `SoldPlot`, `LandSale` (+ indexes) — needs founder assignment + `migrate deploy` on prod |
| Storage | `data/sold-plots/pins.json` (points, ids) + `data/sold-plots/cards/<id>.json` or one `cards.json`; **tracked in git** (gitignored `data/tiles/` does not deploy — the branch pmtiles route 404s on Vercel for that reason) | Postgres rows, RLS |
| Route | `/api/sold-plots/pins` (GeoJSON) and `/api/sold-plots/[id]` — one literal `path.join(process.cwd(),'data','sold-plots',…)` per route so Next's implicit tracing bundles it (`next.config.ts:4-17`); `getAdminUserId`; `cache-control: private` | same routes, Prisma select with pagination |
| Size today | ~6k pins ≈ 0.4 MB; cards for 11k plots ≈ 2–3 MB (**assumed**, 200 B/sale) — fine for one file; split per community above ~10 MB | n/a |
| Low-zoom rendering | GeoJSON source `cluster: true, clusterRadius: 40, clusterMaxZoom: 13`; `circle` layer for clusters with `point_count` label + `circle` for singles (first clustered source on the platform; the `VAULT_CONFLICT_MARKERS` Point-source rule applies). Above ~30k pins switch to PMTiles behind the branch's Range/ETag route with `FetchSource` auth | same client |
| Refresh | `scripts/build-sold-plots.ts` reads `~/Intel` DBs + `land_registry` + `projects` → regenerates the JSON → commit → Vercel deploy. Monthly, manual | ingestion script + `prisma` upserts; no deploy |
| Reaches `SidePanel` for Prisma listings | no (research layer only) | yes — the only path to show sold history on regular listings |
| Verdict | **ship Phase B on S**; zero migration risk, matches the master-plans pattern, reversible | adopt when the layer graduates to paying users (P3) |

Tile/pin contract (S): `pins.json` features `{ id, lng, lat, src: "dda"|"mp"|"geo", approx: bool,
n: salesCount, last: "YYYY-MM" }` — no price. The card API returns everything else.

---

## 6. Dependency on commit 2 (task 6)

- `feat/masterplans-layer` tip = `37d815e`; commits: B.1 docs → B.2 commit 1 (tiles + hover + GOLD
  gate) → two OHR tile fixes. **Commit 2 (tile click → `SidePanel`) does not exist.** Branch is
  31 commits behind main and its tileset route cannot deploy on Vercel (gitignored `data/tiles/`).
- What commit 2 was going to add (spec §5.5): `bindLayerEvent(map,"click",fillId,…)` inside
  `addLandTileSource` and a **`directData` adapter** (tile props → `ParcelDetail`,
  `hasBackingParcel:false`) feeding the existing `SidePanel.tsx` (`:213` accepts `directData`;
  `VaultSidePanelAdapter.tsx:212` already uses that path).
- **Reuse plan:** the sold layer needs exactly that adapter. Build it once, generically
  (`src/app/parcels/map/plot-detail-adapter.ts`: `{plot fields, plan, sales[]} → ParcelDetail`), with
  a new optional `sales` block rendered by `SidePanel` ("Transaction history" section, hidden when
  absent). Commit 2 then becomes a 30-line change on the master-plans branch (bind click, call the
  adapter with tile props).
- **Recommended build order:** (1) Phase B sold layer on a branch off `main` (does not wait for the
  master-plans merge; founder-only, no public surface); (2) rebase/finish the master-plans branch and
  write commit 2 using the adapter; (3) when the master-plans tiles move to a deployable location,
  DDA-tile click can also open the sold history for the clicked plot via `/api/sold-plots/[id]`.

---

## 7. Recommended design

**Layer.** Catalog key `soldPlots`, category `vault` (Dubai › Founder research), label "Sold plots",
default off, row rendered only when `/api/me/access` says admin. Persisted in `zaahi-map-layers`
like every other toggle.

**Pin.** `circle` layer on a clustered GeoJSON source: singles 6 px, clusters sized by `point_count`
with a label; colour from the design tokens (one accent for "sale in last 24 months", muted for
older — the only data-driven styling; no price in the pins file). Hover: plot id + `n sales ·
last YYYY-MM` via the existing `PmtilesHoverRow` pieces. Approx pins (`approx: true`) get the dashed
ring already used for "estimated" on the master-plans layer.

**Card (click → `SidePanel` via `directData`).**

| Field | DDA plot | Non-DDA plot |
|---|---|---|
| Plot id | DDA plot number (= municipality number) | DLD land number + area, or developer code; municipality number when bridged |
| Community / district | DDA `community`, `PROJECT_NAME` (master development) | DLD `area_name_en`, `master_project_en` |
| Area | `AREA_SQFT` / sqm from DDA | `actual_area` from `land_registry`, else DXB "sqft" |
| Land use | DDA `MAIN_LANDUSE` / `SUB_LANDUSE` | `land_registry.land_type_en` (Commercial / Residential / …) |
| Transaction history | date · price AED · price/sqft (= price ÷ plot sqft) · seller type · procedure (DLD) or Developer/Individual (DXB) · capital gain % when DXB gives it | same |
| Registered project | via chain §3: name EN, status, % complete, cancellation date, developer, escrow agent; "no RERA project" when the registry row has none; "unknown" when the plot is not in the registry | via `land_registry.project_id` when bridged; else none |
| FAR / GFA | DDA `GFA_SQM` / `GFA_SQFT` (`data/layers/dda-plots/`), FAR = GFA_SQM ÷ AREA_SQM (DDA publishes no FAR) | not shown unless derived |
| Derived GFA (label "derived") | when DDA GFA is empty: `GFA = FAR × plot area`, FAR from the DCR / affection plan if we hold it | JVC/JVT: `far_overrides.csv` (Trakhees site plans, 7 rows today); Dubai South: `ds_plot_master.csv` `far` with `far_provenance`; Meydan Horizon: **no FAR held** (permit heights only) → not derivable |
| Price per sqft of GFA | `price ÷ GFA_sqft` (derived when GFA is derived; both labelled) | same when GFA exists |
| Source + freshness | "DXB Interact export of YYYY-MM-DD" / "DLD registry xlsx" / "DLD open data YYYY-MM" | same |

Prices are shown as AED integers; stored in fils (integer) in the card files per code rule 3.
Seller/buyer names from the Intel kit are **never** copied into the platform files (PII).

---

## 8. Phase B build plan (one Sonnet session, or three steps)

**Step 1 — data build (script only, 2–3 h).** `scripts/build-sold-plots.ts` (+ a python helper if
the DBs are easier from python): read `dxb_master.db` Plot rows + JVC/JVT/DS/Meydan transaction
tables + Intel-kit land-sale deals (deals only, no party tables); normalise `(area, plot_no)`;
bridge to `parcel_id` via `land_registry`; attach DDA centroid (from `data/layers/dda/*.geojson`),
else master-plan polygon, else harvested lat/lng (`approx`); attach registered project via §3 chain;
attach GFA/FAR; write `data/sold-plots/pins.json` + `data/sold-plots/cards.json`. Emit a build
report (placed / approx / unplaced per community). Unit test on 20 known plots (JVC15AMRH006 →
JVC master-plan polygon; a kit munc → DDA centroid; a plot with a CONDITIONAL_ACTIVATING project).

**Step 2 — routes + gate (1 h).** `/api/sold-plots/pins`, `/api/sold-plots/[id]`, `/api/me/access`
(`{ isAdmin }`); all three call `getAdminUserId`; e2e: 401 without token, **403 for an approved FREE
fixture**, 200 for the founder fixture (harness already has a FREE-tier fixture on the branch).

**Step 3 — map (3–4 h).** Catalog row + persistence; clustered GeoJSON source + circle layers;
hover row; click → `plot-detail-adapter.ts` → `SidePanel` with a new "Transaction history" section
(collapsible, newest first, derived values labelled). Style per `.claude/rules/ui-style-guide.md`.
Smoke test per `.claude/commands/smoke-test.md`; `pnpm build`; PR.

**Out of Phase B:** new DXB exports (founder runs them), the MCP connector test, Prisma tables,
showing sold history on public listings.

---

## 9. Founder decisions (≤ 6, with recommended defaults)

| # | Decision | Options | **Recommended default** |
|---|---|---|---|
| D1 | What counts as "sold" | (a) DLD group 1 Sales incl. Delayed Sell / Development Registration; (b) Sell + Delayed Sell only; (c) also show gifts/mortgages as separate pin styles | **(a)**, all years; gifts and mortgages counted in the card footer ("+2 mortgages, 1 gift"), never as sales |
| D2 | Who sees the layer | (a) founders + ADMIN via `getAdminUserId`; (b) strict founders (`isFounderEmail`) | **(a)** — matches the brief and the branch GOLD definition; no new helper |
| D3 | Build shape | (a) static JSON behind gated routes, no migration; (b) Prisma tables now | **(a)**; revisit (b) when sold history must appear on public listings |
| D4 | Scope of data for Phase B | (a) ship what we hold (~5.9k placeable plots, ~84 % of DXB pairs unplaced); (b) first close the gap: 437 Plot-filtered exports on the 89 DDA areas; (c) test the DXB MCP connector before any export | **(a) now, then (c)**, then a 10-export pilot on Al Hebiah Fifth + Wadi Al Safa 5 to measure real per-area yield before committing to 437 |
| D5 | Non-DDA placement | (a) show harvested `gmaps_q` pins flagged approximate; (b) show only id-resolved pins | **(a)** with the dashed "approx" ring, and a 50-pin precision sample in Step 1 |
| D6 | Registered-project key | (a) adopt `parcel_id → land_registry → projects` chain, Old Numbers display-only, refresh `projects.json`; (b) keep testing Old Numbers | **(a)** |

**Ratified 2026-10-11:** D1 (a) · D2 (a) · D3 (a) · D4 (a) · D5 (a) · D6 (a) — all at the recommended defaults.

---

## 10. Risks

- **Coverage optics.** 4.3 % of DDA plots have a placeable sale today; the map will look sparse
  outside the four deliberately pulled communities. Mitigation: legend shows "N sales held / M
  unplaced" per view so sparsity reads as a data gap, not a market fact.
- **DXB terms.** DXB Interact's T&C require attribution and restrict re-use; the layer is founder-only
  research and carries a "Source: DXB Interact" line. Public exposure would need a licence check.
- **PII.** The Intel kit carries names, phones, Emirates IDs. The build script reads `deals` only;
  a test asserts no `name|mobile|emirates_id` key reaches `data/sold-plots/*`.
- **Pin precision** for harvested coordinates is unmeasured for DXB pages (advert sample: median 907 m).
- **Stale registries.** `projects.json` 2025-10, `land_registry` 2026-04, DXB rows to 2026-07.
  Freshness line on every card; refresh script is the only remedy.
- **Vercel bundle size.** Tracked JSON must stay well under the function size limit (one literal
  path, split per community if > ~10 MB).
- **Count reconciliation** DXB 46,819 vs DLD ~100k (2012 →) is unexplained; if DXB under-reports land
  sales, the export route cannot reach the DLD total and the DLD xlsx route (Intel kit) matters more.
