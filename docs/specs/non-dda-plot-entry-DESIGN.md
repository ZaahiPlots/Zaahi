# Non-DDA Plot Entry — Full Design

**Status:** Design ratified by founder 2026-06-01. Not yet implemented.

**Branches consulted:**
- `research/non-dda-coords-design` — UI / projection / polygon recon
- `research/non-dda-listing` — public listing flow recon

**Audience:** Future implementer (likely Sonnet 4.6 / Opus 4.x).
Pick this doc up as the single source of truth before reading the
broken code paths it describes.

---

## 1. Intent (founder ratified)

The platform must accept plots that are **not in the DDA registry**.
They land in two surfaces in parallel:

1. **PPV / Vault** — private, the broker / owner tracks the plot
   for their own pipeline. Visible only to the caller.
2. **Public Listings** — same shape as DDA listings: 3D building
   on the map, full SidePanel card, hover popup, search /
   compare / get-details via Archie. Visible to all approved
   users.

For both surfaces, a supporting document is **mandatory** — Affection
Plan (DDA-equivalent reference), Site Plan, or DCR. The document
serves two jobs at once:

- **Data source:** plot area, FAR, floors, height, land use,
  setbacks. Either parsed (Sprint 3) or typed in by the user
  (Sprint 1).
- **Verification artefact (Listing only):** admin reviews the
  uploaded PDF before flipping `PENDING_REVIEW → LISTED`.

The plot's **geometry** comes from explicit corner coordinates
(min 3, typically 4-6 points). The corners arrive one of two
ways:

- **Auto-extracted** from the uploaded document when the document
  contains a structured coordinate table (Sprint 3 capability).
- **Manual entry** — user bulk-pastes coordinates into a textarea,
  picks the projection from a dropdown, and the polygon previews
  on the map (Sprint 1 capability — covers 100 % of plots in MVP).

Once persisted, the non-DDA plot **renders identically** to a DDA
plot — same ZAAHI Signature 3D (podium / body / crown by floor
count), same SidePanel, same hover, same Archie behaviour. Users
should not be able to tell the difference between a DDA-sourced
plot and a manually-entered one on the public surface.

**Why this approach over PDF-zone UTM extraction:** the founder
previously considered parsing the UTM polygon embedded in
Affection Plan PDFs. That polygon describes the **master plan
zone**, not the individual plot — the Al Furjan disaster
2026-05-26 showed plots landing on neighbours. User-entered
corner coordinates bypass the zone-disambiguation problem
entirely. The document still feeds the *data* fields (area /
FAR / floors / height) where the master-zone vs plot ambiguity
doesn't apply.

---

## 2. Current broken state — what users hit today

The non-DDA path technically exists but silently fails to render
the plot. Confirmed reading the code 2026-06-01:

### 2.1 Vault wizard (`src/app/parcels/map/AddPlotWizard/`)

- `Step1PlotLookup.tsx:235-306` — branch "not_found" shows a
  manual-entry form (district, area, lat/lng, landUse).
- Inline UI warning: *"⚠ This plot isn't in DDA. Add it manually
  for now — Phase 2.2 will support Affection Plan PDF upload to
  auto-build the 3D geometry."*
- `WizardState.source: "dda" | "manual" | null` already supports
  the manual branch.
- `handleContinueManual` sends `source: "manual"`, **`geometry:
  null`**.

### 2.2 Vault POST (`src/app/api/me/vault/entries/route.ts`)

- Line 202: `if (body.ddaSnapshot != null && body.emirate ===
  "DUBAI")` — manual entries (no ddaSnapshot) skip
  `ensureVaultPrivateParcel` entirely → `publicParcelId = null`.
- VaultEntry row is created, but it has **no linked Parcel**.
- Line 451: `emirate: "Dubai"` hardcoded — non-Dubai entries
  even with DDA hit fail.

### 2.3 Vault map render (`src/app/api/me/vault/map/route.ts`)

- Line 98: when a VaultEntry has lat/lng but no real polygon,
  `synthesizePlaceholderPolygon(lat, lng, 5)` makes a **5-metre
  square** placeholder around the point.
- `src/lib/vault-geometry.ts:5` header: *"Phase 2.2 (affection-
  plan PDF upload) replaces these placeholders with real parsed
  geometries."*
- Plot appears as a flat 2D square on the vault map. **No 3D
  extrusion** (no AffectionPlan with `maxFloors`).

### 2.4 Listing flow (`src/app/parcels/map/AddPlotModal.tsx`)

- Phases: `entry → pickRole → broker | owner | pathC`.
- `/api/parcels/submit` always attempts DDA enrichment from
  `BASIC_LAND_BASE/MapServer/2`.
- DDA miss fallbacks: `geometry: null`, `district: "UNKNOWN"`,
  `areaSqft: 0`, `lat: null`, `lng: null`.
- Parcel is **created anyway** with `status: PENDING_REVIEW` +
  emirate hardcoded `"Dubai"`.

### 2.5 Admin review (`/api/parcels/[id]/review`)

- Admin can only `APPROVE` → status `LISTED` or `REJECT` →
  status `REJECTED`.
- **Admin cannot add or edit geometry.** An approved non-DDA
  parcel with `geometry: null` is permanently un-rendered on
  the public map.

### 2.6 Promote (`/api/me/vault/entries/[id]/promote`)

- Bridges Vault → public listing via shared
  `createParcelFromSubmission`.
- Manual vault entries (no geometry) take the same DDA-miss
  fallback path as direct submit → end up as
  `PENDING_REVIEW + geometry: null + LISTED` later → invisible.

### 2.7 What the user actually sees today

| Surface | Non-DDA plot today |
|---|---|
| Vault wizard | Manual form accepts lat/lng, no polygon |
| Vault map | 5-metre flat square at the user's lat/lng |
| Vault SidePanel | Plot info partial, no 3D, no DDA fields |
| Listing submit | Accepts the submission, creates `PENDING_REVIEW` Parcel |
| Listing on public map after admin approve | **Invisible** (no geometry) |
| Listing SidePanel after approve | Hollow card with "UNKNOWN" district + 0 sqft area |
| Non-Dubai emirate (any non-DDA) | Silent failure path on both Vault and Listing |

---

## 3. Decisions (founder ratified 2026-06-01)

These collapse Q1-Q7 from both recon branches into a single
table the implementer can pin against the code:

| ID | Decision | Rationale |
|---|---|---|
| **D1 — projection default** | WGS84 (lat / lng decimal). Override per emirate via dropdown when the user picks emirate first: Dubai → DLTM (EPSG:3997), Sharjah / Abu Dhabi / RAK → UTM Zone 40N (EPSG:32640). User can always change. | Capital 6 disaster 2026-05-31 — `lon_0=57°` vs `lon_0=55.333°` shifted a plot 200 km into the sea. **Explicit user choice, not auto-detect.** |
| **D2 — projection list** | Three options: WGS84 (4326), DLTM (3997, Dubai municipality), UTM 40N (32640, rest of UAE). Each with one-line UI hint. | Covers >95 % of UAE plot charts. Other projections deferred. |
| **D3 — minimum corner count** | 3 points (triangle). Typical plot is 4-6. Max 50 (sanity). | Triangular plots exist (corner lots, awkward subdivisions). 50 cap prevents pathological pastes. |
| **D4 — manual coords UI v1** | Bulk-paste textarea, one corner per line, comma-separated `lat, lng` (or `X, Y` in projection units). Auto-close the ring on submit. Live map preview as the user types. | Lowest engineering cost. Power users copy from CAD / Excel. Beat A2-A4 (table editor / click-on-map / hybrid) on time-to-V1. |
| **D5 — click-on-map** | Deferred to Sprint 1.5 / Wave B-vault polish. | Precision issues + cancellation flow add complexity. Textarea covers MVP. |
| **D6 — listing identity docs** | Title Deed (owner flow) OR RERA Contract (broker flow) **remains mandatory** for the public listing path. Affection Plan PDF is the third required upload for non-DDA listings (admin verifies geometry against it). Vault path does NOT require identity docs (private). | Identity proof gates the public surface. Vault is self-declared. |
| **D7 — 3D field minimum** | `landUse` (color) + `maxFloors` OR `maxHeightCode` ("G+7") are **required** for listings (drive ZAAHI Signature tiers). Vault treats both as optional. When floors are missing on vault, render flat polygon (no extrusion). | CLAUDE.md "Правила 3D моделей" — tiers depend on floor count. |
| **D8 — admin geometry editing** | Admin cannot edit geometry in `/api/parcels/[id]/review` for V1. Admin REJECTs with a reason; the user re-submits with the fix. Geometry editing on the admin side is Sprint 3 / V3. | Keeps the review surface narrow. Avoids leaking admin-edit semantics through the audit trail. |
| **D9 — promote pass-through** | `/api/me/vault/entries/[id]/promote` passes user-supplied geometry straight through to `createParcelFromSubmission`. No re-prompt for coordinates if the vault row already has them. | One coordinate entry per plot. Promote is "convert visibility", not "redo data". |
| **D10 — DDA enrichment behaviour** | `/api/parcels/submit` keeps the DDA enrichment fallback BUT: if the request body already carries `geometry`, **user geometry wins**. DDA never overrides explicit user input. | Convenience for DDA plots without breaking the manual path. |
| **D11 — emirate handling** | Drop the `emirate === "DUBAI"` hardcode in both submit + `ensureVaultPrivateParcel`. Add `emirate` as an explicit submit-body field; default the projection dropdown by emirate (D1). | Listing must work for any of the seven emirates. |

---

## 4. Architecture

### 4.1 Shared components (Vault + Listing reuse — 100 %)

```
src/lib/coords-projection.ts          ← NEW
  - proj4 wrappers for the three projections (D2)
  - registerCoordsProjections() initialiser (call once on the client)
  - convertToWgs84(points: [num,num][], from: ProjectionKey): [num,num][]
  - sanityCheckBbox(polygon, expectedEmirate): { ok, distanceKm }
    → flags Capital-6-style projection misses (centroid > 100 km
      from the expected emirate's bbox)

src/lib/polygon-validation.ts         ← NEW
  - parsePointsText(text: string): [num,num][]   (textarea → points)
  - closeRing(points): points  (append first point if not closed)
  - hasSelfIntersection(ring): boolean  (Turf.js `kinks` or hand-rolled)
  - polygonAreaSqft(polygon): number   (Turf.area → × 10.7639)
  - buildPolygon(rawText, projection, emirateForSanity): {
      polygon: GeoJSON.Polygon,
      areaSqft: number,
      warnings: string[],   // "ring auto-closed", "area looks small", …
    }

src/components/CoordsEntry.tsx        ← NEW
  - Props: emirate (drives default projection),
           value: GeoJSON.Polygon | null,
           onChange(polygon, areaSqft, warnings)
  - Renders:
      1. Projection dropdown (WGS84 / DLTM / UTM 40N + per-emirate
         default + hints)
      2. Bulk-paste textarea (one corner per line)
      3. Live map preview (lightweight MapLibre instance OR
         delegate to existing main map via a ref)
      4. Warning strip (auto-close, self-intersect, far-from-emirate,
         area-out-of-range)
      5. Computed area hint
  - Used by Vault wizard Step1 AND AddPlotModal Broker/Owner flows.
```

### 4.2 Vault wiring

```
src/app/parcels/map/AddPlotWizard/Step1ManualCoords.tsx   ← NEW (or
                                                             merged
                                                             into the
                                                             existing
                                                             Step1)
  - Hosts <CoordsEntry> + manual 3D fields (landUse, maxFloors,
    FAR, height — all optional for vault per D7)
  - Optional Affection Plan PDF upload (Supabase Storage, no
    parsing in Sprint 1)

src/app/api/me/vault/entries/route.ts
  - L202 gate change: drop `body.ddaSnapshot != null &&
    body.emirate === "DUBAI"`. New condition: `body.geometry !=
    null` (DDA hit also produces geometry, so both branches work).
  - L451 hardcode: emirate "Dubai" → args.emirate (D11)
```

### 4.3 Listing wiring

```
src/app/parcels/map/AddPlotModal.tsx
  - BrokerFlow + OwnerFlow: after the existing identity-doc upload,
    show <CoordsEntry> + 3D fields when the probe missed the DDA
    enrichment (signalled by a new boolean from probe response).
  - Submit body gains: emirate, geometry, plotAreaSqft,
    landUse, maxFloors, maxHeightCode, far, maxHeightMeters,
    affectionPlanPath (Supabase Storage path).

src/app/api/parcels/submit/route.ts
  - SubmitSchema gains emirate, geometry, 3D fields.
  - DDA enrichment branch: skip when body.geometry is present (D10).
  - Drop emirate "Dubai" hardcode (D11).

src/lib/parcel-create.ts
  - createParcelFromSubmission signature gains optional geometry +
    3D fields. Threads them into the Parcel + AffectionPlan create.

src/app/api/parcels/[id]/review/route.ts
  - PATCH: when APPROVE-ing, refuse if Parcel.geometry is null AND
    no DDA hit available (so we don't approve invisible parcels).
    Surface `{ error: "no_geometry", message: "Reject and ask
    re-submit." }`.

src/app/admin/queue/  (admin UI)
  - PlotClaim / Title Deed tabs: surface a "no geometry" warning
    on pending non-DDA submissions. Reject reasons UI gains a
    "missing_geometry" preset.
```

### 4.4 Promote (Vault → Listing)

```
src/app/parcels/map/PromoteToPublicModal.tsx
  - If the vault entry already has a real polygon (manual coords),
    skip the CoordsEntry step in the promote modal — pass through.

src/app/api/me/vault/entries/[id]/promote/route.ts
  - Read the vault entry's geometry (or its linked Parcel's geometry)
    and forward to createParcelFromSubmission via the existing
    bridge. No new Wave needed for promote-from-DDA; only the
    promote-from-manual path is new.
```

---

## 5. Differences — Vault vs Listing

Single source of truth for what diverges between the two surfaces:

| Aspect | Vault (private) | Listing (public) |
|---|---|---|
| Visibility | Only the caller | All approved users |
| Coord precision | 5 m placeholder OK until manual entry lands | Real polygon **required** (D7) |
| Identity documents | Not required | Title Deed (owner) OR RERA Contract (broker) — **required** (D6) |
| Affection Plan upload | Optional file (no parsing in Sprint 1) | Required file (admin verifies geometry against it) (D6) |
| Verification gate | None — straight to `VAULT_PRIVATE` | `PENDING_REVIEW → admin → LISTED / REJECTED` |
| District | "UNKNOWN" acceptable | Must be filled (filter / search rely on it) |
| Area | Optional | Required (drives per-sqft price math) |
| `landUse` | Optional | Required (D7) |
| `maxFloors` / `maxHeightCode` | Optional (no 3D on placeholder) | Required (D7 — drives 3D tiers) |
| Source of truth | Self-declared | Admin-verified |
| Coord entry UX | Same `<CoordsEntry>` component, used inside the wizard | Same component, used inside AddPlotModal post-probe |

---

## 6. Sprint plan

### Sprint 1 — Vault non-DDA (Wave A + B-Vault)

| Step | Files |
|---|---|
| 1 | NEW `src/lib/coords-projection.ts` |
| 2 | NEW `src/lib/polygon-validation.ts` |
| 3 | NEW `src/components/CoordsEntry.tsx` |
| 4 | NEW `src/app/parcels/map/AddPlotWizard/Step1ManualCoords.tsx` (or merge into existing Step1) |
| 5 | MODIFIED `src/app/api/me/vault/entries/route.ts` — drop Dubai+ddaSnapshot gate (D11), accept emirate (D11) |
| 6 | MODIFIED `src/lib/vault-geometry.ts` — keep placeholder helper but mark "deprecated for vault entries with real polygon" in the docstring |
| 7 | MODIFIED `src/app/parcels/map/AddPlotWizard/Step1PlotLookup.tsx` — when probe says "not_found", route the user into the new manual coords flow instead of the lat/lng stub. Remove the "Phase 2.2 will support PDF upload" warning. |

**Time:** ~3-4 implementer-days.

**Deliverable:** vault user can enter a non-DDA plot with real
coordinates, see it as a proper 3D building on their vault map,
get accurate per-sqft pricing.

### Sprint 2 — Listing non-DDA (Wave B-Listing + C-admin)

| Step | Files |
|---|---|
| 1 | MODIFIED `src/app/api/parcels/submit/route.ts` — extend SubmitSchema (emirate, geometry, 3D fields), bypass DDA enrichment when geometry present (D10), drop Dubai hardcode (D11) |
| 2 | MODIFIED `src/lib/parcel-create.ts` — extend signature for geometry + 3D fields |
| 3 | MODIFIED `src/app/parcels/map/AddPlotModal.tsx` BrokerFlow + OwnerFlow — after the identity doc step, when probe signals "no DDA", render `<CoordsEntry>` + 3D fields + Affection Plan upload |
| 4 | MODIFIED `src/app/api/parcels/[id]/review/route.ts` — block APPROVE when geometry is null, surface clear admin reason |
| 5 | MODIFIED `src/app/admin/queue/...` — flag non-DDA `PENDING_REVIEW` rows with "no geometry" status badge; new reject reason preset "missing_geometry" |

**Time:** ~5-7 implementer-days (admin UI work is the long tail).

**Deliverable:** broker / owner submits a non-DDA listing with
coordinates + docs; admin reviews + approves; the plot appears
on the public map with full 3D + SidePanel.

### Sprint 3 — Polish + parse

| Step | What |
|---|---|
| 1 | MODIFIED `PromoteToPublicModal.tsx` + `/api/me/vault/entries/[id]/promote/route.ts` — geometry pass-through for manual vault entries (D9) |
| 2 | NEW `/api/parcels/parse-affection-plan` — Claude Sonnet 4.6 vision over uploaded Affection Plan PDF → extract `plotAreaSqft / FAR / maxFloors / maxHeightCode / maxHeightMeters / setbacks` for the broker/owner to review-then-accept (mirrors `/api/parcels/parse-title-deed` pattern) |
| 3 | NEW `/api/parcels/parse-site-plan` if Site Plan PDFs include a coordinates table — extract corners and prefill the textarea |
| 4 | MODIFIED admin queue UI — surface parsed-vs-typed diffs so the admin can spot a mismatch between document and user input |
| 5 | Mobile UX pass on `<CoordsEntry>` — textarea + projection dropdown + map preview need to fit on a 360 px viewport |

**Time:** ~5-8 implementer-days.

**Deliverable:** auto-extracted data from uploaded documents
where the document is structured enough; mobile-friendly
coordinate entry.

---

## 7. ⚠ Open question for founder before Sprint 1

**Q: Document parsing (auto-read corner points + data fields from
the uploaded PDF) — is it required in Sprint 1, or is Sprint 1
manual-only with the file stored for admin review, and parsing
moves to Sprint 3?**

Implication tree:

- **Option A (parsing in Sprint 1):** ~+3-5 days to Sprint 1.
  Claude Sonnet 4.6 vision on Affection Plan + Site Plan + DCR.
  Requires per-document-type prompts (Affection plans look very
  different from DCRs). Higher accuracy ceiling, lower input
  effort for the user.
- **Option B (parsing in Sprint 3, recommended):** Sprint 1
  stays ~3-4 days. User types in the data fields. File is
  uploaded + stored verbatim in Supabase Storage; admin sees
  the PDF during review. Sprint 1 ships fast; parsing
  iteratively improves Sprint 3.

**Recommendation: Option B.** Ship Sprint 1 with manual entry +
file storage. Parsing accuracy on user-supplied PDFs is brittle
in the first iteration — better to validate the rest of the
pipeline first.

---

## 8. Smoke test prompts

These exercise the three projections — same Capital 6 mistake
should not happen twice. Each prompt names a real plot location
so we can verify the polygon lands in the right city, not in the
sea.

### Sprint 1 (vault wizard)

| # | Prompt | Coordinates the user pastes | Projection | Expected outcome |
|---|---|---|---|---|
| 1 | "Plot 8888888 in Dubai, not in DDA — got 4 corners from Google Maps, residential 5 floors" | `25.123456, 55.234567` × 4 lines | **WGS84** | Polygon renders in Dubai. 3D extrusion 5 floors podium-only. Vault map shows the building. |
| 2 | "Plot 7777777 in Sharjah from a site plan, UTM Zone 40N" | `355123.4, 2812345.6` × 4 lines | **UTM 40N (32640)** | proj4 converts X / Y → WGS84 lat / lng around 25.4° N, 55.5° E. Polygon lands in Sharjah, not the sea. |
| 3 | "Plot 6666666 Dubai DLTM coordinates, 4 corners 497981, 2775845 etc" | `497981, 2775845` (Capital 6 numbers) × 4 | **DLTM (3997)** | proj4 converts → ~25.088° N, 55.313° E. Polygon lands in MAJAN — the Capital 6 success case. |
| 4 | Mistake test: pastes DLTM corners but picks WGS84 from the dropdown | DLTM numbers | WGS84 (wrong) | Sanity check flags "centroid 500 km from Dubai" — UI warning, user picks correct projection. |
| 5 | Triangle plot (3 corners) | 3 valid lines | WGS84 | Closes the ring, accepts the triangle, computes area. |
| 6 | Self-intersecting bow-tie | 4 corners forming a figure-8 | WGS84 | `hasSelfIntersection` returns true, UI blocks submit until user fixes. |
| 7 | Non-Dubai (Abu Dhabi) | WGS84 corners in AD | WGS84 | Without D11 fix, drops silently; with D11, parcel is created with `emirate: "AD"`. |

### Sprint 2 (public listing flow)

| # | Prompt | Outcome |
|---|---|---|
| 1 | Broker submits 8888888 with coords + RERA contract + Affection Plan PDF | `PENDING_REVIEW` Parcel created with real geometry + 3D fields. Admin queue lists it. Admin approves → status `LISTED` → appears on public map with 3D building. |
| 2 | Owner submits 7777777 in Sharjah, UTM 40N + Title Deed + Affection Plan | Same flow, emirate `Sharjah`, polygon converted server-side checks pass. |
| 3 | Bad submit: no geometry, no DDA hit | Parcel created `PENDING_REVIEW + geometry: null`. Admin sees "no geometry" warning. APPROVE blocked. REJECT with reason `missing_geometry`. |
| 4 | Verifier mismatch: user types `maxFloors=5`, admin sees Affection Plan says 12 | Admin sees the uploaded PDF side-by-side. Admin can REJECT with "data mismatch" reason. |

### Sprint 3 (promote + parse)

| # | Prompt | Outcome |
|---|---|---|
| 1 | Promote manual vault entry → public listing | Geometry passes through; user just adds Title Deed / RERA + asking price. Skips the coords entry step. |
| 2 | Upload Affection Plan PDF + click "Auto-fill from document" | Claude vision returns parsed `plotAreaSqft`, `FAR`, `maxFloors`, etc. User reviews + accepts → form prefilled. |
| 3 | Site Plan PDF with coordinates table | Claude vision extracts corners; prefills the textarea. User confirms projection + accepts. |

---

## 9. References — code paths that need touching

When the implementer reads this, these are the files to open
first:

```
src/app/parcels/map/AddPlotWizard/types.ts                  (D7: 3D field requirements)
src/app/parcels/map/AddPlotWizard/Step1PlotLookup.tsx       (L235-306: stub branch to replace)
src/app/parcels/map/AddPlotWizard/Step3Confirm.tsx          (body payload)
src/app/parcels/map/AddPlotModal.tsx                        (BrokerFlow L432+, OwnerFlow L546+)
src/app/api/me/vault/entries/route.ts                       (L202 gate, L451 emirate hardcode)
src/app/api/me/vault/entries/[id]/promote/route.ts          (D9 pass-through)
src/app/api/me/vault/map/route.ts                           (L98 placeholder rendering)
src/app/api/vault/shared-with-me/map/route.ts               (same placeholder pattern)
src/app/api/parcels/submit/route.ts                         (DDA enrichment + D10/D11)
src/app/api/parcels/[id]/review/route.ts                    (D8 admin can't edit geometry)
src/app/api/parcels/parse-title-deed/route.ts               (pattern for Sprint 3 parsers)
src/app/admin/queue/                                        (Sprint 2 step 5 admin UI)
src/lib/parcel-create.ts                                    (createParcelFromSubmission signature extension)
src/lib/vault-geometry.ts                                   (synthesizePlaceholderPolygon helper)
src/lib/dda.ts                                              (parseAffectionPlan — HTML parser, NOT a PDF parser)
src/lib/dda-plot-lookup.ts                                  (fetchFullDdaData reference for the DDA path)
scripts/seed-6458042.ts                                     (proj4 DLTM working example for Capital 6)
```

CLAUDE.md rules that constrain this work:

- **AffectionPlan is append-only.** Never `deleteMany`.
- **NEVER delete parcels.** Reject (status `REJECTED`) instead.
- **NEVER add duplicate parcels.** Check `plotNumber` before
  insert.
- **Prices are owner-set only.** Never auto-derive
  `currentValuation`.
- **Plot in fils (BigInt).** Convert at the boundary.
- **Land use palette is 9 categories, frozen.** Use existing
  colors.
- **3D rules — `loadZaahiPlots` reads geometry + landUse +
  maxFloors and applies setbacks per CLAUDE.md "Правила 3D
  моделей".** Don't fork.
