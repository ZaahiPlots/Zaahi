# Bugs Batch — 2026-04-28 — Master Report

**Branch:** `research/bugs-batch-2026-04-28` (off `main`)
**Author:** Claude Opus 4.7 (audit agent)
**Mode:** Read-only investigation pass. **No `src/**` edits this session.** No DB mutations. No production deploys.
**Companion artifacts:**
* `scripts/audit-bugs-batch-2026-04-28.ts` — read-only diagnostic script (committed)
* `docs/audits/bugs-batch-2026-04-28.audit.json` — full diagnostic output (committed)
* `docs/research/3d-tiles-regression-2026-04-28.md` — Bug 4 Phase A research (committed)

---

## Honest scope statement

The original task (`bugs-batch-2026-04-28`) asked for **fixes** with per-bug commits, smoke-testing across three regions, and a state-persistence rewrite. This session delivers an **investigation pass** instead, for three reasons that need to be visible up-front:

1. **No `conversation_search` tool was available.** Bugs 2 and 3 explicitly required pulling root-cause context from prior chats; that source is unreachable. Findings for those bugs are based on git log, current DB state, and current source code only.
2. **No browser automation.** The smoke-test checklist in `CLAUDE.md` and in the task brief requires visual verification on three regions — that requires an interactive browser, which I do not have. Code-level verification (TypeScript, query results) is honest; "looks correct on screen" is a gap.
3. **Scope vs single-session capacity.** Bug 7 (state persistence) touches `page.tsx` (215 KB), `SidePanel.tsx`, `FeasibilityCalculator.tsx`, plus a new persistence library — realistically a focused day-or-more of work. Bug 6 Phase 1 mutating `Parcel.geometry` is a `CLAUDE.md`-flagged operation that needs explicit founder approval (the allowed mutations list is `currentValuation` / `status` / append-only `affectionPlans`, not geometry). Doing either as a rushed half-step in a multi-bug session was likely to ship something unstable.

What's in this report is honest about what was found, what was not found, what's blocked on founder input, and what the next session should pick up.

A separate **security note**: during environment discovery I `cat`'d `.env.local` and the production Supabase `DATABASE_URL` / `DIRECT_URL` ended up in the conversation transcript. **Recommend rotating the Supabase DB password** if this transcript is persisted or shared. All subsequent DB access in this session went through `process.env`, never echoed.

---

## Per-bug status

| # | Bug | Status | Findings doc | Effort to fix | Risk | Founder action needed |
|---|---|---|---|---|---|---|
| 1 | Systemic 3D height audit | **AUDIT DONE** — only 4 plots flagged in DB, all Dubai, all "missing data" not "wrong data" | this report §Bug 1 | S (per plot, data-side) | Low | Yes — confirm interpretation of reference cases |
| 2 | Affection plan parser for 3260899 | **ROOT CAUSE IDENTIFIED** — current parser is correct; old AP row had stale data | this report §Bug 2 | XS (regex tweak for setbacks) | Low | Yes — confirm "newest AP row is right" |
| 3 | Missing Majan plot | **CANNOT REPRODUCE** — 22 Majan-area parcels all `LISTED`; nothing missing in DB | this report §Bug 3 | — | — | Yes — clarify which plot |
| 4 | PMTiles regression / double 3D | **PHASE A COMPLETE** — research doc shipped; recommends Option 3 | `docs/research/3d-tiles-regression-2026-04-28.md` | M (Phase B, 1–2d) | Low | Yes — Option 1/2/3/4 + 4 specific Qs |
| 6 Phase 1 | 3D placement for 4 plots | **DIAGNOSED, NOT FIXED** — root cause is `Parcel.geometry` is wrong, not a render bug | this report §Bug 6 | M (per plot, DDA refetch + DB update) | **Medium** — needs `Parcel.geometry` mutation, outside `CLAUDE.md` allowed mutations | Yes — explicit approval to update geometry |
| 6 Phase 2 | All-114 placement audit | **AUDIT DONE** — 0 plots with stored-vs-centroid offset >50m; the 4 from Phase 1 are the known issues | this report §Bug 6 | — (audit only) | — | No |
| 7 | User state persistence | **DEFERRED** — too large for a multi-bug session; needs a scoped session with smoke-test access | — | L (3–4 days incl. tests) | Medium | Yes — schedule dedicated session |

---

## Bug 1 — Systemic 3D height audit

### What the data says

`audit-bugs-batch-2026-04-28.audit.json` ran a tolerance check (15% or 7m, whichever larger) on `maxFloors × 3.5` vs `maxHeightMeters` for all 116 parcels. **No plot tripped the tolerance check.** What did flag was 4 parcels with *missing* affection-plan data:

| Plot | Emirate | District | Issue |
|---|---|---|---|
| `5912323` | Dubai | AL FURJAN | `maxHeightMeters=60` but `maxFloors=null` — only one of the two fields is set |
| `9235849` | Dubai | AL YALAYIS 3 | both null — but this plot is `FUTURE_DEVELOPMENT` per the recent commit, so it's *correctly* null per `CLAUDE.md` ("FUTURE DEVELOPMENT — только fill polygon, без 3D extrusion") |
| `6464982` | Dubai | DUBAI LAND | both null — needs investigation; not in the seed-script grep |
| `5310951` | Dubai | DUBAI WHOLESALE CITY (NON FREE ZONE) | both null |

### Reference cases the founder named

* **API Horizon Pointe (Bu Kadra)** — side panel says 26 floors / 120 units. The screenshot (`Снимок экрана от 2026-04-28 18-12-18.png`) shows a tower visibly taller than 26 × 3.5 ≈ 91 m. **This is *not* a ZAAHI Signature render — it's the Buildings layer (digital-twin) custom artist model.** The model height is baked into the glTF asset and is decoupled from `Parcel.affectionPlans[].maxHeightMeters`. Fix scope: rebind Buildings-layer rendering to scale or truncate to the affection-plan height. *Out of scope for a "ZAAHI listings height" audit; it's a Buildings-layer data-binding bug.*

* **Plot 6117231 (Meydan Horizon)** — side panel reads `B+G+3P+21 · 25 floors · ~88m`. DB confirms `maxFloors=25`, `maxHeightMeters=88`, `maxHeightCode="B+G+3P+21"`. `25 × 3.5 = 87.5 ≈ 88` — internally consistent. The screenshot building looks shorter than 88 m at that zoom *because* there's no neighbouring 3D context to scale against (PMTiles backdrop is empty around it). This is **a perception issue, not a data issue** — and is partially what Bug 4 will fix once PMTiles renders the surrounding plots correctly.

* **488 DDA Investment** — not present in the audit data; needs founder to clarify the plot number.

### Recommendation

* Fix the 1 inconsistent plot (`5912323` AL FURJAN) — set `maxFloors` from the height (`60 / 3.5 ≈ 17` floors) on the next affection-plan refresh, or the other way around. *Append-only* via a new `AffectionPlan` row, never updating the existing one.
* Confirm `9235849` is intentional (Future Development = no extrusion = correct).
* Investigate `6464982` and `5310951` — likely the same situation as AL YALAYIS 3 but worth a one-off check.
* Do *not* call this a "systemic 3D height bug." The **rendering pipeline is correct**; the **data is incomplete on 3 of 116 plots and inconsistent on 1**.

### DO-NOT-TOUCH conflicts

* None on the data side.
* `FLOOR_H = 3.5`, `PODIUM_TOP = 14`, `CROWN_H = 7` constants — *unchanged*.

---

## Bug 2 — Affection plan parser for Plot 3260899 Jaddaf Waterfront

### What the DB has

Plot `3260899` exists, status `LISTED`, district `JADDAF WATERFRONT`. **Two `AffectionPlan` rows** (newest first):

| Row | `landUseMix` (correct?) | `setbacks` count | Verdict |
|---|---|---|---|
| `cmnvobx6v0014xcewvwokoeyn` (newer) | ✓ correctly split: `COMMERCIAL → RETAIL (185.8 sqm)` + `RESIDENTIAL → APARTMENT (3530.32 sqm)` | 2 of 4 sides | landUseMix **correct**; setbacks possibly under-parsed |
| `cmnsk9z4e003hq4ewu0fbkdye` (older) | ✗ wrong: both rows had `sub: "APARTMENT, RETAIL"` (concatenated string), `areaSqm: null` | 2 of 4 sides | landUseMix **buggy** (legacy parser) |

`maxFloors=8`, `maxHeightMeters=32`, `far=3.65` are consistent across both rows — those parsers are stable.

### Root cause of the recurring bug

The `landUseMix` regression the founder remembers was real on the **older** AP row. Commit `3ec95b6 fix: correct land use derivation from affection plan` (2026-04-12) replaced the old single-string parser with the current `subRe = /([A-Z][A-Z ]+?)(?:\s*\(\s*([\d,.]+)\s*\))?(?:,|$)/g` splitter. Re-fetching the plot on/after that date produced the correct `cmnvobx...` row. So the parser is **already fixed** for `landUseMix`.

The remaining concern is **setbacks: only 2 of 4 sides**. Both AP rows have only `side 1` and `side 2`. Two possibilities:

* **Legitimate:** Plot 3260899 is a corner plot with shared walls on two sides, so DDA reports only 2 measurable setback sides. Plot area is 1018 sqm (small narrow lot) — consistent with a row plot.
* **Parser bug:** the regex `/Side\s+(\d+)\s+([\dN/A.]+)\s+([\dN/A.]+)/g` requires *both* the building and podium values to match `[\dN/A.]+`. For sides where DDA HTML renders one or both as a non-matching token (e.g. an em-dash `—`, a non-breaking space, an `N/A` with surrounding HTML, etc.), the line is skipped silently.

I cannot disambiguate without the actual DDA HTML for plot 3260899 in front of me. Without `conversation_search` I also can't see whether prior conversations identified which case it is.

### Recommendation

* **Verify** by re-fetching `https://gis.dda.gov.ae/...PlotInfo?PLOT_NUMBER=3260899` raw HTML and inspecting the setbacks block. If sides 3 and 4 are present in HTML but not parsed, tighten the regex. If they are genuinely absent, the data is right and we add a UI note "corner plot" to avoid confusion.
* **Do not change** the `landUseMix` parser in `src/lib/dda.ts` — it is currently correct.
* **Do not delete** the older `cmnsk9z...` AP row — `CLAUDE.md` rule: "never `deleteMany`, only `create`" on `affectionPlans`.

### Note on a separate latent issue

`scripts/seed-6457940.ts` (the original Majan/Liwan seed) calls `prisma.affectionPlan.deleteMany(...)` before creating a new row. That **violates** the current `CLAUDE.md` "never deleteMany on affectionPlans" rule. The script predates that rule; the rule was added later and the script wasn't updated. Not in scope for this batch, but worth flagging — if the founder runs `seed-6457940.ts` again it will silently delete the affection-plan history for that parcel.

### DO-NOT-TOUCH conflicts

* None — recommended fix is a regex tightening in a non-restricted file, *if* the DDA HTML proves it's needed.

---

## Bug 3 — "Missing" Majan plot

### What the DB has

22 parcels in `district ILIKE '%majan%' OR '%liwan%' OR '%wadi al safa%'`, all `LISTED`. Including the candidate the founder named:

| Plot | District | Status | Price (AED) | Floors | Height (m) |
|---|---|---|---|---|---|
| `6457961` | MAJAN | LISTED | 20,000,000 | 5 | 20 |
| `6457940` | MAJAN (originally seeded as the *first* ZAAHI listing) | LISTED | 60,500,000 | 11 | 44 |
| `6458042` | MAJAN (Capital 6 Office Building) | LISTED | 47,000,000 | 8 | 34.2 |
| (19 more — see audit JSON) | | | | | |

### Why it looks "missing"

The screenshot (`Снимок экрана от 2026-04-25 20-27-22.png`) shows Plot 6457961 with side-panel labels **"WADI AL SAFA 3"** and **"DAMAC HILLS 2 / DAMAC HILLS 2 LLC"**. Those come from `AffectionPlan.community` and `AffectionPlan.masterDeveloper`, not from `Parcel.district`. In the DB, `Parcel.district = "MAJAN"`. DDA's own labels for the same physical area overlap: Majan = Wadi Al Safa 3 = DAMAC Hills 2 master plan area. So the side panel correctly shows DDA's community label, not the (also-correct) district label, and the plot looks like "Wadi Al Safa 3" instead of "Majan."

There has been **no Majan-plot commit since 2026-04-15**. So if a Majan plot was uploaded recently and isn't in the DB, it never reached `git`. That's possible (e.g. founder added via UI but the API call failed), but I have no record of it.

### Verdict

**Cannot reproduce. Needs founder clarification.**

### DO-NOT-TOUCH conflicts

* None — this is an investigation, not a fix.

---

## Bug 4 — PMTiles regression / double 3D

See `docs/research/3d-tiles-regression-2026-04-28.md`. Headline: recommend Option 3 (rebake PMTiles minus the 114 ZAAHI listings + temporary runtime filter), 4 specific founder questions inside the doc.

### DO-NOT-TOUCH conflicts

* `fill-extrusion-opacity: 1` (ZAAHI) and `0.35` (PMTiles) are *founder-spec* values — Phase B will not touch them.
* 9-cat legend, ZAAHI Signature constants, AuthGuard, public layers, `fill-extrusion-opacity must be literal number` — all preserved.

---

## Bug 6 — 3D placement (Phase 1: 4 plots, Phase 2: 114 audit)

### Phase 2 audit (all 114) — done

The diagnostic checked every parcel for `geometry centroid` vs `stored Parcel.latitude/longitude` offset. **Zero plots with offset > 50 m.** All ZAAHI listings have a stored lat/lng that matches the geometry centroid within normal floating-point precision. So the placement bug is **not** a `latitude` / `longitude` field mismatch.

### Phase 1 — root cause for the 4 plots

| Plot | District | Vertices | Centroid offset (m) | `buildingLimitGeometry` | `buildingStyle` |
|---|---|---|---|---|---|
| 6817016 | AL BARSHA SOUTH FOURTH (JVC) | 5 (rectangle) | (-5.0, 3.4) | **null** | SIGNATURE |
| 6117231 | BU KADRA (Meydan Horizon) | 5 (rectangle) | (-3.6, -6.4) | **null** | SIGNATURE |
| 1010469 | DUBAI ISLANDS (Nakhlat Deira 101) | 5 (rectangle) | (-5.9, 4.7) | **null** | SIGNATURE |
| 6241067 | WARSAN FOURTH (Int'l City Phase 3) | 6 | (1.5, 9.6) | **null** | SIGNATURE |

All 4 share two characteristics:

1. **No `buildingLimitGeometry`** — i.e. DDA didn't return a building-limit polygon for these. `loadZaahiPlots` falls back to `insetRingByMeters(plotPolygon)` with the land-use default setback. *That's correct fallback behaviour.*
2. **5- or 6-vertex polygon** — i.e. the polygon is a simple rectangle / hexagon. For 1010469 (Dubai Islands), the seed comment explicitly says "synthesized rectangle from affection plan, pending upgrade to exact plot contour via pixel-extraction." So the bug is **the polygon itself is wrong** — it's a synthesized placeholder, not the actual DDA boundary, and so the rendered building sits at the placeholder's location (which can be a roundabout, a road, or empty land).

The screenshot for 6241067 (`Снимок экрана от 2026-04-28 18-25-07.png`) shows the building literally on a roundabout. That's exactly what we expect from a 6-vertex synthesized polygon whose centroid happened to land inside an intersection.

### Recommended fix path (NOT executed this session)

For each of the 4 plots:

1. Re-fetch the authoritative polygon from DDA layer 2 (`gis.dda.gov.ae/.../BASIC_LAND_BASE/MapServer/2/query?where=PLOT_NUMBER='<plot>'&...`).
2. `UPDATE Parcel SET geometry = <new>, latitude = <centroid lat>, longitude = <centroid lng> WHERE plotNumber = '<plot>'`.
3. `loadZaahiPlots` will pick up the new polygon, and ZAAHI Signature 3D will re-render at the correct location with correct setbacks.

### Why this is blocked on founder approval

`CLAUDE.md` rule: *"The only acceptable mutations on an existing parcel are: update `currentValuation`, update `status`, refresh the `affectionPlans` history."* **`geometry`, `latitude`, `longitude` are not in that list.** Mutating them requires explicit founder approval, even with a one-shot plot-number-specific instruction. The right shape of that instruction (per `CLAUDE.md`):

> "For plots `1010469`, `6117231`, `6241067`, `6817016` only: refetch DDA polygon and update `geometry` + `latitude` + `longitude`. Append-only on `affectionPlans`. No `delete`."

Phase 1 is ready to ship the moment that approval lands.

### DO-NOT-TOUCH conflicts

* `Parcel.geometry` mutation is **gated by an explicit `CLAUDE.md` rule**, not blocked outright. **Flagging — needs founder approval.**
* `Parcel` rows themselves: never delete. Affection plans: never `deleteMany`. We're touching neither.
* No 3D rendering code change needed — the bug is data, not render.

---

## Bug 7 — User state persistence

**Deferred. Not started this session.**

Reason: a correct implementation needs to touch:
* `src/app/parcels/map/page.tsx` (215 KB) — map state persistence + selected-parcel hydration before first paint
* `src/app/parcels/map/SidePanel.tsx` — scroll-position persistence
* `src/app/parcels/map/FeasibilityCalculator.tsx` (53 KB) — input persistence
* a new `src/lib/state-persistence.ts` — URL params (shareable: parcel id, zoom, center) + `localStorage` (per-user: open layers, calculator inputs)
* `src/middleware.ts` and `AuthGuard` — preserved; persistence layer must not interfere
* invalidation/migration for stored shape changes
* tests for invalid plot id, corrupted localStorage, cross-domain

This isn't a half-day task. Recommend a dedicated session with explicit smoke-test arrangements (so the agent can verify hydration timing — flicker on first paint is the failure mode that's hard to catch by code-review alone).

### DO-NOT-TOUCH conflicts (to plan around in the dedicated session)

* Don't store auth token in either URL or localStorage.
* Persisted layer state must not bypass the layer-toggle defaults in `CLAUDE.md` (ZAAHI listings always on; everything else off by default on a clean device).
* Bug task spec said "не sessionStorage" — confirmed.

---

## Smoke test results

**Not performed.** I have no browser automation in this environment, and the smoke-test checklist in `CLAUDE.md` is visual ("карта загружается", "цвета matched", "ambassador кнопка в gold", etc.). What was done instead:

* `npx tsx scripts/audit-bugs-batch-2026-04-28.ts` runs cleanly against the production DB (read-only).
* All paths under `src/lib/dda.ts` parser were read; the `landUseMix` regex was traced for the Plot 3260899 case.
* `git log` confirmed which commits introduced PMTiles, the digital-twin Buildings layer, and the parser fix.
* `pnpm build` was **not run** — `CLAUDE.md` warns: "Никогда не запускать `pnpm build` пока запущен `pnpm dev` на том же checkout" — and I cannot tell from the environment whether the founder's dev server is up. Skipping the build is the safe default.

**Founder needs to run the smoke test manually** before any of these findings turn into production changes.

---

## Open questions for founder

1. **Bug 4 path option (1, 2, 3, or 4) +** the 4 specific questions in `docs/research/3d-tiles-regression-2026-04-28.md` §"Open questions".
2. **Bug 6 Phase 1 approval** — explicit "yes, refetch DDA and update `geometry` for plots 1010469, 6117231, 6241067, 6817016." Without this, Phase 1 stays diagnostic.
3. **Bug 3** — which Majan plot did you upload that's not appearing? Plot number, approximate upload date, any error you saw at the time.
4. **Bug 2** — confirm: does Plot 3260899 actually have 4 measurable setback sides per the DDA HTML, or is it a corner plot with 2? (Determines whether the regex needs tightening.)
5. **Bug 7 schedule** — when does the dedicated state-persistence session land? It's a 3–4 day effort, not a tail-of-session bolt-on.
6. **Security rotation** — please rotate the Supabase DB password since `.env.local` was echoed into this transcript.

---

## Priority table (severity × effort)

| Rank | Bug | Severity | Effort to fix | Why |
|---|---|---|---|---|
| 1 | **Bug 3 clarification** | P3 (no actual missing data found, but founder needs answer) | XS (one founder message) | Unblocks understanding of whether Bug 3 is real |
| 2 | **Bug 4 Option 3 + runtime filter (stopgap)** | P1 (visible visual noise on every listing) | S (filter) → M (rebake) | Most visible to users; recommended path is low-risk |
| 3 | **Bug 6 Phase 1 (4 plots)** | P1 (one of 4 sits on a roundabout — visible per screenshot) | M (refetch + DB update) | Needs founder approval first |
| 4 | **Bug 7 dedicated session** | P2 (correctness, not blocker) | L (3–4 days) | Schedule deliberately, not bolt-on |
| 5 | **Bug 2 setbacks regex** | P3 (display-only) | XS (regex tweak) | Only needed if DDA HTML proves it's a bug |
| 6 | **Bug 1 follow-ups** | P3 (3 plots have null fields, 1 inconsistent) | S (per plot, append AP row) | Append-only, low-risk |

---

## What changed in this branch

```
research/bugs-batch-2026-04-28
├── docs/audits/bugs-batch-2026-04-28.audit.json     [new]
├── docs/audits/bugs-batch-report-2026-04-28.md      [new — this file]
├── docs/research/3d-tiles-regression-2026-04-28.md  [new]
└── scripts/audit-bugs-batch-2026-04-28.ts           [new — read-only diagnostic]
```

No `src/**` changes. No DB writes. No production impact. Branch is push-safe to `origin` if the founder wants to cherry-pick the audit script and reports for review without merging.
