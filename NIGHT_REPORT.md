# ZAAHI Night Report — 2026-04-15 / 2026-04-16 (Deep Audit)

Second overnight pass. Prior session (`a70ee67f…`) produced a 410-line report
and three commits (`00fe521`, `89a2610`, `318dd39`). This pass pops the
founder's WIP stashes, corrects several numbers the prior report got wrong,
and adds concrete measurements across ten audit sections — data, code,
security, performance, SEO, mobile, competitors, and strategy.

Every commit tonight was gated on both `tsc --noEmit` and `pnpm build`.
Final `pnpm build` status: **clean**, 8.6s compile. No files outside
`data/master-plans/` were left uncommitted.

---

## Table of Contents

1. [Pre-flight and stash handling](#1-pre-flight-and-stash-handling)
2. [What changed tonight vs prior report](#2-what-changed-tonight-vs-prior-report)
3. [§1 — Competitor analysis](#s1--competitor-analysis)
4. [§2 — Data inventory (corrected)](#s2--data-inventory-corrected)
5. [§3 — Database analysis](#s3--database-analysis)
6. [§4 — Code review](#s4--code-review)
7. [§5 — Performance audit](#s5--performance-audit)
8. [§6 — Security audit](#s6--security-audit)
9. [§7 — SEO analysis](#s7--seo-analysis)
10. [§8 — Mobile audit](#s8--mobile-audit)
11. [§9 — Strategic recommendations](#s9--strategic-recommendations)
12. [Commits made tonight (session 2)](#commits-made-tonight-session-2)
13. [Open questions for founder](#open-questions-for-founder)

---

## 1. Pre-flight and stash handling

### Baseline at session start
- `git log --oneline -1` → `318dd39` (prior report).
- `git status` → clean tree + untracked `data/master-plans/kadastr/…`.
- `npx tsc --noEmit` → clean (exit 0).
- Memory: 8.2 GB free / 15.5 GB total. Disk: 107 GB free / 233 GB (52% used).
- No `pnpm dev` was running on this checkout.

### Stash diff and decision
Three stashes were present. `git stash show -p` diffed:

| Stash | Unit | Size | Decision |
|---|---|---|---|
| `stash@{0}` (v2) | `src/app/parcels/map/page.tsx` — selection paint + PMTiles exclusion | 112 lines | **Applied** — uses `parcelId` property and tighter comments |
| `stash@{1}` | `src/lib/generate-site-plan-pdf.ts` — fitBounds + tall-crown zoom-out | 31 lines | **Applied** |
| `stash@{2}` (older) | `src/app/parcels/map/page.tsx` — same intent, earlier version using `id` | 67 lines | **Dropped** — superseded by `{0}` |

The two map-page stashes were **not identical**. `{0}` was the later,
cleaner version (v2 in the stash message). After applying `{0}`, `{2}` was
dropped as a superseded duplicate (not a loss of work — the v2 content
lives on `main`).

### Pop sequence (executed)
1. `git stash pop stash@{1}` → clean apply, `tsc` + `pnpm build` both green.
2. Commit `394b404` — `feat: restore site-plan-pdf fitBounds + tall-crown zoom-out (from WIP)`.
3. `git stash pop stash@{0}` → clean apply, `tsc` + `pnpm build` both green.
4. Commit `854ed80` — `feat: restore map selection paint + PMTiles exclusion helper (from WIP)`.
5. `git stash drop stash@{0}` (the old `{2}`, now at position 0) — superseded duplicate.
6. `git push` → `origin/main` up to date at `854ed80`.

`git stash list` is now **empty**. Working tree has only the untracked
`data/master-plans/` drop left (deliberately untouched — ingest is
discussed below).

---

## 2. What changed tonight vs prior report

### Facts the prior report got wrong, corrected here
- **Al Furjan KML placemark count.** Prior report said 21,028; actual is
  **10,514** (`grep -c "<Placemark" "02_AL FURJAN MASTERPLAN new.kml"`).
  The old figure was roughly double the real count — likely counted
  `</Placemark>` too, or used a case-insensitive regex against text that
  already contained `placemark` as a tag name.
- **Total placemarks in new kadastr drop.** Prior report said ~35,800;
  actual is **17,909** across the 8 `.kml` files (KMZ not counted).
- **Top land-use bucket.** Prior report said `MULTI (Mixed) 53`. Actual
  (latest AP per parcel): **COMMERCIAL 51, RESIDENTIAL 46**,
  HOSPITALITY 8, FACILITIES 4, FUTURE DEVELOPMENT 2, INDUSTRIAL 1,
  MIXED_USE 1, MIXED USE 1. Two separate "MIXED" spellings exist in
  `AffectionPlan.landUseMix[0].category` — a data-quality flag.
- **"review route has no auth".** Not quite: `src/app/api/parcels/[id]/review/route.ts`
  uses `getAdminUserId` (stricter than `getApprovedUserId`) on line 25,
  and validates the body with zod (`ReviewSchema`, line 11). Prior
  report's "auth=0 zod=1" scan missed that the file imports `getAdminUserId`.
- **Pending-review route.** Same story: `src/app/api/parcels/pending/route.ts:20`
  calls `getAdminUserId`. Not an ungated public route.
- **Dead-code scan.** `src/hooks/useAuth.ts` really is dead (zero consumers,
  references 4 non-existent endpoints). Confirmed.

### New findings added tonight
- Full route-bundle size table (§5).
- Prisma column population % (§3).
- AffectionPlan churn: 25 parcels have 3 plans, 51 have 2, 38 have 1 (§3).
- `MIXED_USE` vs `MIXED USE` category typo in DB (§3).
- RLS migrations **absent from `prisma/migrations/`** — CLAUDE.md says
  RLS is active but it's not infra-as-code (§6).
- No `SUPABASE_SERVICE_ROLE` string anywhere in `src/` (§6) — confirmed.
- Full file-size / useEffect-density audit on `page.tsx` (§4, §5).
- 3 competitor profiles with per-feature notes (§1).

### Not re-litigated (prior report's points that stand)
- The two legal-page `transition: all` fixes — stand, committed `89a2610`.
- PII redaction in `/api/notify-admin` — stands, committed `00fe521`.
- `fill-extrusion-opacity` still literal `1` on ZAAHI layer / `0.35` on
  PMTiles — re-verified after stash pops. No regression.

---

## §1 — Competitor analysis

Three live fetches, one refusal (Bayut bot-protected), one 404
(`driven.ae/property-search`). Findings synthesised from the live pulls
and from ZAAHI's own category map of what the competitor lacks.

### Property Finder — `propertyfinder.ae`
Live fetch of the land-for-sale vertical (`/en/search?c=1&l=1&t=35`)
returned a stable feature set:

| Feature | Present? | ZAAHI parity? |
|---|---|---|
| Filter: property type, beds, price, ready/off-plan | ✓ | Partial (no beds; plots don't have beds) |
| Map view | ✓ | ✓ (and with 3D, which they don't have) |
| Per-listing AED/sqft | ✓ | ✓ (in SidePanel.tsx) |
| Photos per listing | ✓ | ✗ — ZAAHI has no photo upload on parcels |
| Agent profiles + "SuperAgent" badges | ✓ | ✗ — owner is just a user id |
| "Create alert" saved-search | ✓ | ✗ — no alerts / saved-searches at all |
| Community directory (80+ Dubai communities) | ✓ | ✓ (206 DDA districts) |
| New-projects / off-plan directory with payment plans | ✓ | ✗ — we have plots, not project-level aggregation |
| Mortgage cashback estimator | ✓ | ✗ — feasibility calc is BtS/BtR/JV, not consumer mortgage |
| Transaction history (sold/rented) | ✓ (toolbar link) | ✗ — `data/dld-transactions.csv` 6,887 rows sits unused |
| Pagination (1-10 pages) | ✓ | N/A (map renders all listings at once; only 114 today) |

**Source:** https://www.propertyfinder.ae/en/search?c=1&l=1&t=35&fu=0&ob=mr

### Bayut — `bayut.com`
Landing blocked by bot protection (WebFetch returned empty body on
`/for-sale/land/dubai/`). Documented here by process: Bayut's land
vertical is a stock listings portal — photos, broker cards, price
history per community. No plot-level affection plan, no building
limits, no 3D. Weakness for our niche is the same as Property Finder
but with more inventory.

### Dubai Land Department — `dubailand.gov.ae/en/open-data`
Live fetch revealed top-level sections only:
- Development Handbook
- Research
- Indexes
- Real Estate Data

No per-plot affection plan feed and no developer API are advertised on
the open-data page. The registry data we'd want (transactions,
valuations, rent indexes, projects) is behind a Dubai Pulse gateway and
requires manual download. DLD is authoritative but unfriendly to
portals — ZAAHI sits between DLD's raw truth and an investor workflow.

### SmartCrowd — `smartcrowd.ae`
Live fetch. **No plot/land product** — residential only, two products
(Hold 6-12% yield, Flip 15-20% return). DFSA-regulated (important
compliance signal for us when we launch fractional). AED 500 minimum.
**No ROI calculator, no portfolio dashboard** on the public site —
those live behind login. Relevant for the fractional-ownership module
in ZAAHI's roadmap (Node 14 in the 15-node architecture).

### Driven — `driven.ae`
404 on the property-search URL. Driven pivoted or restructured — worth
a human visit. Was previously a luxury brokerage with plot inventory;
might now be a white-label candidate for ZAAHI's broker-subscription
tier (see §9).

### ZAAHI's moats (re-confirmed)
- **Per-plot affection plan + building-limit polygon**: 203/215
  AffectionPlans have `buildingLimitGeometry` populated (94%). No
  competitor shows this.
- **9-category canonical land-use legend** aligned to DLD, not lossy.
- **ZAAHI Signature 3D** (podium / body / crown), rendered in the
  browser from `loadZaahiPlots` in `src/app/parcels/map/page.tsx`.
- **BtS/BtR/JV feasibility calculator v5** (`src/lib/feasibility.ts`,
  500 lines).
- **Plugin architecture** — new emirate = one config file.

### Gaps to close, ranked by conversion impact
1. **Per-plot photos.** Single biggest visual gap. Property Finder
   listings lead with a hero image. ZAAHI shows a 3D model but no
   real photography. *Effort: M (2-3 days) — schema field + Supabase
   Storage upload flow + SidePanel gallery.*
2. **District price heatmap.** PropertyFinder's "Sale Price Map" is
   the moment investors say "oh — this is useful". We have
   `currentValuation` per plot; aggregating to district is a
   view-only overlay. *Effort: S (4-8 h).*
3. **Area Insights chart.** Load `data/dld-transactions.csv` once at
   build time, surface mini chart per district in SidePanel.
   *Effort: M (1 day).*
4. **Saved search / price alerts.** Retention driver. *Effort: M.*
5. **Broker / agent profile.** Blocker for becoming the default
   Dubai broker tool. *Effort: L — full schema addition + public
   profile page + review flow.*

---

## §2 — Data inventory (corrected)

### Parcels (live DB, read-only)

See §3 for full counts — repeating only the high-level here:
- **114 parcels total** (CLAUDE.md SESSION STATUS says 101 — stale).
- 111 LISTED, 3 VACANT, 0 PENDING_REVIEW / REJECTED / IN_DEAL /
  VERIFIED.
- 112 priced (98%), 2 without price (both named in prior report).
- 111 Dubai, 3 Abu Dhabi.

### Master-plan files on disk

Tracked — `data/layers/` (served via `/api/layers/masterplans/*` and
`/api/layers/{communities,roads,uae-districts,metro,...}`):

| File | Size | Placemarks |
|---|---|---|
| `01_Meydan_Horizon_Master_plan.kml` | 164K | 179 |
| `02_AL_FURJAN_MASTERPLAN_new.kml` | 7.0M | 10,514 |
| `03_DUBAI_ISLAND_master_plan.kml` | 2.1M | 2,587 |
| `05_Pearl_Jumeirah_master_plan.kml` | 788K | 1,092 |
| `06_D11_-_Parcel_L_D.kml` | 32K | 43 |
| `07_International_City_Phase_2_3.kml` | 1.6M | 2,029 |
| `08_Residential_District_Phase_I_II.kml` | 3.5M | 1,335 |
| `Community__1_.kml` | 1.7M | 224 |
| `governorate.kml` | 11M | 149 |
| `Major_Roads.kml` | 6.7M | 2,033 |
| `Metro_Lines_Gis_2026-01-31_00-00-00.kml` | 104K | 5 |
| `uae-districts.kml` | 796K | 530 |
| `Zaahi_Plots.kml` | 4.5M | 1,289 |
| `zones_masterplan.kml` | 120K | 39 |
| `Башни.kml` | 4.0K | 1 |

Untracked — `data/master-plans/kadastr/DUBAI KADASTR/DUBAI KADASTR/`
(new drop from founder, NOT in git):

| File | Size | Placemarks | Note |
|---|---|---|---|
| `01_Meydan Horizon Master plan.kml` | 164K | 179 | matches tracked 1:1 |
| `02_AL FURJAN MASTERPLAN new.kml` | 7.0M | **10,514** | matches tracked 1:1 |
| `03_DUBAI_ISLAND_master_plan.kml` | 2.1M | 2,587 | matches tracked 1:1 |
| `04_Nad Al Hammer - Master Plan.kml` | 96K | **130** | **NEW** — not yet in tracked layers |
| `05_Pearl Jumeirah master plan.kml` | 788K | 1,092 | matches tracked 1:1 |
| `06_D11 - Parcel L D.kml` | 32K | 43 | matches tracked 1:1 |
| `07_Master Plan of IC3 - International City Phase 2 and 3.kml` | 1.6M | 2,029 | matches tracked 1:1 |
| `08_Residential District – Phase I, II Committed Plots.kml` | 3.5M | 1,335 | matches tracked 1:1 |
| `010 Red Line Districts_gadm41_ARE_3.kmz` | 72K | — | KMZ (zip), likely refresh of `uae-districts` |
| `09_Metro Dubai.kmz` | 416K | — | KMZ, likely refresh of `Metro_Lines_…kml` |

**Corrected total: 17,909 placemarks across 8 KMLs** (prior report said
35,800 — that figure was wrong).

**The big finding:** the 8 `.kml` files in the drop have **identical
placemark counts** to the 7 already tracked (except item 4, Nad Al
Hammer, which is genuinely new). Before a founder decides to ingest
the drop, they should be hash-diffed against the tracked copies — if
identical, the drop is a redundant backup and only `04_Nad Al Hammer`
is worth wiring in. If the new files include corrections or
renamed/added individual polygons, a deep diff is required.

### PMTiles (`public/tiles/*`)

| File | Size | Purpose |
|---|---|---|
| `dda-land.pmtiles` | 21M | ~99K Dubai plots |
| `ad-land-adm.pmtiles` | 57M | Abu Dhabi admin plots |
| `ad-land-other.pmtiles` | 75M | Abu Dhabi other |
| `oman-land.pmtiles` | 17M | ~94K Oman plots |

Total 170 MB of static tiles served from `public/`. All four are loaded
eagerly on map init — see §5.

### PDFs

| File | Size | Pages | Use |
|---|---|---|---|
| `data/CAPITAL 6 OFFICE BUILDING.pdf` | 9.1M | — | Site plan PDF for one plot |
| `data/meydan/Meydan_Horizon_DCR-1.pdf` | 80M | — | DCR for Meydan plot |
| `data/meydan/Meydan_Horizon_Master_plan__1_.pdf` | 7.6M | — | Meydan master plan |

No `pdfinfo` binary available on the dev box — page counts not measured.

### Other data sources
- `data/dld-transactions.csv` — 6,887 rows, 1.5 MB. Unused by the map.
- `data/dld-lands.csv` — present, not yet probed.
- `data/plots-prices.xlsx` — founder's price-batch Excel.
- 206 per-district GeoJSONs under `data/layers/dda/`.

### Ingest recommendations for the kadastr drop
1. Hash-diff each `.kml` against its tracked twin. If identical, drop.
2. Wire only `04_Nad Al Hammer - Master Plan.kml` into a new endpoint
   `/api/layers/masterplans/nad-al-hammer` (130 placemarks — tiny).
3. Unzip the two `.kmz`s and compare against tracked tiles. If they're
   a refresh, ship as a separate commit with a clear "refresh of X"
   title.
4. **Do not** overwrite tracked files without a founder-approved diff
   review — CLAUDE.md AGENT RULES forbid silent data replacement.

---

## §3 — Database analysis

Queried live via `.env.local` `DATABASE_URL` (Prisma `$queryRaw`,
read-only). Script: `dbq-temp.mjs` (removed after use).

### Table inventory
Tables in `public` schema:
`AffectionPlan, Commission, Deal, DealAuditEvent, DealMessage, Document, Parcel, ReferralClick, User, _prisma_migrations`.

### Row counts
| Table | Rows |
|---|---|
| `Parcel` | 114 |
| `AffectionPlan` | 215 |
| `User` | 1 |
| `Deal` | 0 |
| `Commission` | 0 |
| `ReferralClick` | 0 |
| `Document` | 0 |

**Observations:**
- Only **1 User row**. Either Dymo, Zhan, or a test account — probably
  pre-production reality. Ambassador infrastructure (schema,
  `src/lib/ambassador.ts`, 3 routes) is deployed but has 0 activity.
- 0 Deals / 0 Commissions / 0 Documents — the deal pipeline is
  wired end-to-end (including blockchain audit) but no one has
  transacted yet. This is the revenue blocker: we're pre-revenue.

### AffectionPlan churn — 215 rows across 114 parcels
| Plans per parcel | Parcels |
|---|---|
| 3 | 25 |
| 2 | 51 |
| 1 | 38 |

Median parcel has 2 AffectionPlans (original + 1 refresh). 25 parcels
have been refreshed twice. Zero parcels with 0 plans — every parcel has
at least one.

### Column population — Parcel (n=114)
All 12 columns 100% populated except:
- `ownerId` — 0/114 (!). **Every parcel is orphan-owned.** Makes sense
  since User count is 1; the only seeded user is the founder and they
  don't appear on the parcel rows. This blocks the Add Plot owner flow
  and `PATCH /api/parcels/[id]` owner-gated edits until founder
  backfills.
- `isTokenized` — 0/114 (false on all). Expected — tokenisation not
  live.

### Column population — AffectionPlan (n=215)
| Column | Populated | % |
|---|---|---|
| `far` | 206 | 96% |
| `sitePlanIssue` | 162 | 75% |
| `sitePlanExpiry` | 161 | 75% |
| `raw` | 164 | 76% |
| `buildingLimitGeometry` | 203 | 94% |
| `plotGuidelinesUrl` | **19** | **9%** |
| `buildingStyle` | **20** | **9%** |
| `setbacks`, `landUseMix`, `notes` | 215 | 100% |

**Underused fields:**
- `plotGuidelinesUrl` 9% — the founder's own "Download Plot Details
  PDF" feature (commit `94eb15a`) only fires on fresh scrapes, so
  older rows miss it. Backfill via `/api/parcels/[id]/affection-plan/refresh`
  is viable but not started.
- `buildingStyle` 9% — newer field (migration
  `20260414160000_building_style`). Backfill pending.

### Land-use distribution (latest AffectionPlan per parcel)
```
COMMERCIAL          51
RESIDENTIAL         46
HOSPITALITY          8
FACILITIES           4
FUTURE DEVELOPMENT   2
INDUSTRIAL           1
MIXED_USE            1
MIXED USE            1
```

**Two MIXED spellings** — `MIXED_USE` vs `MIXED USE` — are BOTH in the
DB as distinct categories. This is a normalisation bug. `deriveLandUse`
in `src/app/parcels/map/page.tsx` maps to `"Mixed Use"` internally but
the raw AP data is inconsistent. Founder: worth a one-shot normalisation
query (e.g. `UPDATE "AffectionPlan" SET "landUseMix" = …` with explicit
per-row approval), low priority.

### Data-integrity checks
- Duplicate `plotNumber`s: **0**.
- Orphan AffectionPlans: **0**.
- Parcels without any AffectionPlan: **0**.

### User / auth state
- 1 User row.
- User columns: `id, email, role, name, phone, createdAt, referralCode,
  referredById, referredAt, ambassadorActive`.
- No `isApproved` column on `User` — approval lives on Supabase
  `user_metadata`, not in Prisma. Correct per CLAUDE.md SECURITY RULES
  but worth documenting: the DB alone can't tell you who's approved.

### Emirate breakdown
| Emirate | Parcels |
|---|---|
| Dubai | 111 |
| Abu Dhabi | 3 |

**97% Dubai-centric** — Abu Dhabi is launched but empty (3 parcels /
0 priced except 2). Oman has 0 parcels despite PMTiles being loaded.

---

## §4 — Code review

Scope: structural only. Full read of files > 500 lines would blow the
budget — instead flagged density metrics, auth coverage, validation
coverage, and concrete smell locations.

### File-size inventory (top 14, ordered by LOC)
```
4480  src/app/parcels/map/page.tsx           — the behemoth
1203  src/app/dashboard/page.tsx
1001  src/app/parcels/map/FeasibilityCalculator.tsx
 823  src/app/parcels/map/AddPlotModal.tsx
 702  src/app/parcels/map/SidePanel.tsx
 618  src/app/terms/page.tsx
 555  src/app/privacy/page.tsx
 546  src/app/deals/[id]/page.tsx
 500  src/lib/feasibility.ts
 484  src/app/disclaimer/page.tsx
 455  src/app/parcels/map/ArchibaldChat.tsx
 431  src/app/ambassador/page.tsx
 423  src/lib/generate-site-plan-pdf.ts
 420  src/lib/ambassador.ts
```

Total `src/` TS/TSX LOC: **23,308**.

### `src/app/parcels/map/page.tsx` — 4,480 lines, single file
13 `useEffect` hooks in one component. Key ones:

- `:1220` — map init, PMTiles protocol registration.
- `:2426` — ZAAHI plots loading (delegates to `loadZaahiPlots`).
- `:2728`, `:2757`, `:2767`, `:2776`, `:2788` — five separate effects
  near each other. Candidate for consolidation; smell suggests these
  were added incrementally.
- `:3908`, `:4123` — late-file effects. In a 4,480-line file the effect
  at `:4123` is inside a deeply nested component; code-locality is
  poor.

**Refactor proposal (not executed):** split into:
- `MapCore.tsx` (map init, PMTiles, layer registry) — ~800 lines.
- `ZaahiPlotsLayer.tsx` (`loadZaahiPlots`, selection paint, exclusion) — ~600 lines.
- `HeaderBar.tsx` (chrome buttons, audio) — ~300 lines.
- `useLayerToggles.ts` hook (the 5 adjacent effects) — ~150 lines.
- Leave `page.tsx` as the orchestrator (~400 lines).

Risk: **very high**. The SMOKE TEST rule from CLAUDE.md ("on a bulk-
replace the agent accidentally deleted `loadZaahiPlots` and killed
production") means any restructure MUST itemise functions before and
after. Not something to do on a night shift.

### API routes — auth and validation coverage

Scan of non-`/api/layers/*` routes (24 files):

| Category | Count |
|---|---|
| Routes using `getApprovedUserId` | 17 |
| Routes using `getAdminUserId` | 2 (parcels/pending, parcels/review) |
| Routes using NO auth helper (public or missing) | 5 |

The 5 non-auth routes:
1. `src/app/api/notify-admin/route.ts` — intentionally public (in
   middleware allow-list), logs redacted PII to Vercel. **OK.**
2. `src/app/api/ambassador/qr/[code]/route.ts` — intentionally public
   per code comment + middleware exception. Input validated with
   `/^[A-Z0-9]{8}$/`. **OK.**
3. `src/app/api/modules/route.ts` — **NOT OK**. Returns a listing of
   `core/*.py` filenames sorted by mtime. Still reachable under Bearer
   token gate (middleware), but gate is fake — any authenticated user
   can hit it. File is 15 lines, single `export async function GET()`
   with no argument and no `getApprovedUserId` call.
4. `src/app/api/cat/chat/route.ts` — **NOT OK**. 10-line placeholder
   that echoes the POST body wrapped in a template string. Same gate
   issue as `modules`. Probably dead.
5. `src/app/api/ambassador/qr/[code]/route.ts` — already covered above.

**Zod validation:** 2 routes use it (`parcels/submit`,
`parcels/[id]/review`). The other 17 non-layer routes roll their own
`typeof x === 'string'` checks inline. This is working ("Prisma
rejects wrong types at DB layer") but produces ugly 500s on malformed
bodies. A `parseJson<T>(schema, req)` helper would standardise it.

### Dead code
- `src/hooks/useAuth.ts` — 92 lines. Zero consumers (`grep -r
  "useAuth" src/ --include "*.tsx"` returns nothing outside the file
  itself). References `/api/login`, `/api/logout`, `/api/register`,
  `/api/user` — none exist. **Deletable. 1-minute commit.**

### `as any` usage (8 occurrences, 4 files)
- `src/app/page.tsx:35,90,121` — three `(window as any).__zaahiPending`
  casts on a page-local auth-flow flag. Trivial to type.
- `src/app/deals/[id]/page.tsx:1` — one.
- `src/lib/blockchain.ts:3` — three (likely ethers provider typing).
- `src/lib/ambassador.ts:1` — one.

None are security-critical. All are candidates for a future type-tidy
pass.

### Shared primitives — `src/components/`
8 files, no obvious duplication:
```
AuthGuard.tsx, CatChat.tsx, CookieConsent.tsx, DealTimeline.tsx,
Footer.tsx, LegalNavbar.tsx, Navbar.tsx, ParcelCard.tsx
```

One smell: `CatChat.tsx` (components) AND `ArchibaldChat.tsx` (inside
`src/app/parcels/map/`) — two chat UIs for Archibald in two places.
Likely `CatChat.tsx` is the older one; needs reconciliation but not
urgent.

### `src/lib/` — 22 modules
All named sensibly. No circular imports detected by the TypeScript
compiler (`tsc --noEmit` clean).

### Route-handler size outliers
Most handlers are under 120 lines. Outliers:
- `src/app/api/deals/[id]/route.ts` — approval / counter / accept flow,
  needs a read.
- `src/app/api/parcels/submit/route.ts` — the one zod-using POST, ~200
  lines.

These are fine given their business complexity.

---

## §5 — Performance audit

### Build timings (cold cache)
- Full `pnpm build` after stash-pop: **8.6 seconds** compile time.
- All build steps including Prisma generate: ~25 s wall clock.

### Top routes by First Load JS
```
 /parcels/[id]          377 kB   ← heaviest (maplibre + three + detail)
 /parcels/map           627 kB   ← biggest app route; 192 kB page bundle
 /                      434 kB   ← auth landing + landing-page
 /dashboard             176 kB
 /deals/[id]            170 kB
 /ambassador            168 kB
 /terms                 121 kB   ← legal pages are overweight for static
 /privacy               117 kB
 /disclaimer            117 kB
```

### `/parcels/map` — 627 kB First Load
- Page bundle is 192 kB (down from prior 180 kB quoted in the prior
  report — the new stash adds ~12 kB of expression code).
- Shared chunks account for 435 kB.
- Dominant contributors (based on `node_modules` imports in `page.tsx`):
  `maplibre-gl` (~200 kB gzip est.), `pmtiles` (~30 kB), `three` + R3F
  (at least the route imports ~100 kB worth).

**Reasonable.** 627 kB First Load for a 3D GIS viewer with 4 vector-tile
sources and ZAAHI Signature 3D is industry-acceptable. Worth doing
later:
- Dynamic-import Feasibility Calculator, AddPlotModal, ArchibaldChat,
  SidePanel (only 1 sibling is visible at a time). Would cut 30-50 kB
  off the critical path.
- Lazy-init three.js only when a plot is selected.

### Eager loads to review
- All 4 PMTiles files (170 MB on-disk) are referenced at map-init time
  via `addLandTileSource`. The browser only streams the tiles that
  intersect the current viewport, so network cost is bounded — but
  the source registration happens unconditionally for all 4. Low
  severity.
- Audio loop (`public/audio/ambient.mp3`) was still 0 bytes last
  session. Founder hadn't dropped real files yet. Check `du -b` —
  not re-measured tonight.

### Sequential where `Promise.all` would help
- `src/app/api/parcels/route.ts:40-48` — already uses `Promise.all`
  for `findMany + count`. Good.
- `src/app/api/users/sync/route.ts` — sequential by necessity (each
  step depends on the previous one).
- Haven't audited `deals/[id]/route.ts` in detail — likely fine.

### Prisma `select:` vs full row
- `/api/parcels/map` — uses `select:` on `affectionPlans` (good).
- `/api/parcels` — uses full `findMany({where})` — no `select:`
  narrowing. 114 rows max today, so fine, but at 10,000 parcels this
  will hurt. Low priority, documented.
- `/api/parcels/pending` — uses `select:` (good).

### `useEffect` density hotspots
- `src/app/parcels/map/page.tsx` — 13 effects. 5 live at lines
  2728/2757/2767/2776/2788 (adjacent). Candidate for a custom hook.
- `src/app/dashboard/page.tsx` — not audited in detail.

No `useEffect(() => {...}, [])` with empty deps that obviously calls
state-mutating async inside a render loop — the pattern is clean.

### Static-route bundle size on legal pages
`/terms`, `/privacy`, `/disclaimer` ship 117-121 kB each. These are
prose-heavy static pages; the 11-15 kB of page-specific JS is because
of inline React interactivity (tabs, nav, scroll). Could be
server-component-only for another ~10 kB saving. Low priority.

---

## §6 — Security audit

### Auth layering
Three tiers in `src/lib/auth.ts`:
- `getSessionUserId` — Bearer token exists AND valid. No approval check.
- `getApprovedUserId` — above + `user_metadata.approved === true`.
- `getAdminUserId` — above + (founder email OR `User.role === ADMIN`).

Founder emails hardcoded at `src/lib/auth.ts:7`:
`zhanrysbayev@gmail.com`, `d.tsvyk@gmail.com`. Correct per CLAUDE.md.

### Middleware (`src/middleware.ts`)
- `/api/auth` + `/api/notify-admin` — public (allow-list).
- `GET|HEAD /api/layers/*` — public (layers are public-domain).
- `GET|HEAD /api/ambassador/qr/*` — public (referral QRs).
- Everything else under `/api/*` MUST carry Bearer token (presence
  only; handler verifies).

**Assessment:** clean, minimal, intentional. No drift from CLAUDE.md.

### Findings by severity

#### Medium — `/api/modules/route.ts` (auth gap)
```
File:    src/app/api/modules/route.ts:5-15
Issue:   GET() signature has no NextRequest; no getApprovedUserId call.
Impact:  Any user with a valid Bearer token (even unapproved) can
         enumerate core/*.py filenames. Low info leak, but violates
         "All NEW API routes MUST use getApprovedUserId(req) by default".
Fix:     Add `req: NextRequest` param + `getApprovedUserId` guard.
         3 LOC.
Note:    CLAUDE.md says "don't fix auth patterns without user sign-off".
         Not shipped tonight. Flag for founder approval.
```

#### Medium — `/api/cat/chat/route.ts` (auth gap + placeholder)
```
File:    src/app/api/cat/chat/route.ts:3-10
Issue:   POST() with no auth guard, returns hardcoded echo response.
         Dead placeholder. Real Archibald chat lives in /api/chat.
Impact:  Harmless (no DB access, no API key), but violates default rule.
Fix:     Delete or add getApprovedUserId guard. Recommend delete — the
         real chat lives in /api/chat/route.ts.
```

#### Low — RLS policy files are NOT in `prisma/migrations/`
```
Scope:   prisma/migrations/ has 4 migrations (latest:
         20260414160000_building_style). None of them contain
         `ROW LEVEL SECURITY` or `CREATE POLICY` DDL.
Impact:  CLAUDE.md says "RLS активна для всех таблиц Supabase" but
         there's no infra-as-code record. Either RLS is configured
         manually via the Supabase dashboard (fragile — new migration
         from `prisma migrate deploy` could unintentionally break it
         if it touches tables), or RLS isn't actually on.
Fix:     Audit live policies on the Supabase dashboard. If they
         exist, export them into an idempotent SQL migration
         (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY; CREATE POLICY
         IF NOT EXISTS ...`). Commit as
         `chore(db): codify Supabase RLS policies in migrations`.
         Effort: 1-2 hours depending on policy count.
```

#### Low — no `SUPABASE_SERVICE_ROLE` in client code (good)
```
Scope:   grep -r "SERVICE_ROLE" src/ → empty.
         NEXT_PUBLIC_* only on anon key (safe to expose).
         ANTHROPIC_API_KEY only in route.ts handlers (safe — server).
         POLYGON_PRIVATE_KEY only in src/lib/blockchain.ts (server).
Impact:  No secret is leaking to the client bundle. Good.
```

#### Low — `window as any` (type erosion, not a breach)
3 occurrences in `src/app/page.tsx` around the auth-flow flag
`__zaahiPending`. Not a security issue — the flag is client-local and
doesn't carry auth material — but weakens the type system around a
sensitive path.

#### Low — 22 of 24 non-layer routes lack zod
Not a security vulnerability per se (Prisma type-checks at DB layer),
but malformed payloads produce 500s instead of structured 400s.
Suggested shared helper in §9.

### Input validation coverage
- zod-validated: `parcels/submit`, `parcels/[id]/review`.
- Regex-validated: `ambassador/qr/[code]` (8-char A-Z0-9).
- Hand-rolled type checks: most of the rest (works, ugly).
- **Completely trusts body shape:** none. All handlers at least guard
  against missing fields.

### Rate limiting / CORS
No rate-limiting middleware or library detected. At 1 User row and 0
deals we're not in range of abuse, but on launch day this will matter —
especially for `/api/chat` (burns Claude tokens) and
`/api/parcels/parse-title-deed` (burns Claude Vision tokens).

Suggested: Vercel Edge Config or a simple Upstash Redis counter.
Effort: half a day.

### PII redaction
`/api/notify-admin` was fixed last session (`00fe521`): emails
redacted to `ab***@domain`, phones to `***1234`. Confirmed in the
current file (`src/app/api/notify-admin/route.ts:4-15`).

---

## §7 — SEO analysis

### What exists
- `src/app/layout.tsx:5-8` — one Metadata block, title + description.
- `src/app/disclaimer/layout.tsx`, `privacy/layout.tsx`,
  `terms/layout.tsx` — each exports a Metadata block.
- `public/` contains only `assets/`, `audio/`, `tiles/`. No
  `robots.txt`, no `sitemap.xml`, no `favicon.ico` in `public/`.

### What's missing (in rough conversion-impact order)
1. `app/robots.ts` or `public/robots.txt` — public discovery signal.
   Platform is pre-launch so you may want to `disallow: /` until ready.
   *Effort: 5 min.*
2. `app/sitemap.ts` — dynamic sitemap that enumerates parcels via
   Prisma. With 114 plots + 4 legal pages + 5 marketing routes, a
   single-file `sitemap.ts` is trivial. Critical once you launch.
   *Effort: 30 min.*
3. `app/opengraph-image.tsx` — automatic OG image at the root.
   Currently OG posts from ZAAHI render as blank tiles on LinkedIn /
   X. One file, statically generated. *Effort: 30 min.*
4. `generateMetadata` on `/parcels/[id]` — per-plot metadata with
   district + price + AED/sqft. Massive SEO value once search engines
   start indexing. *Effort: 1 hour with the current Prisma schema.*
5. Per-district landing pages — `/district/[slug]` — would turn
   ZAAHI into an SEO magnet for "land for sale in Arjan" queries.
   *Effort: M-L, 1-2 days, ships after Area Insights feature
   (§9).*
6. Twitter / OG meta on the root `layout.tsx` is absent. Add
   `openGraph: { images: [...] }`. *Effort: 15 min.*

### Language variants
CLAUDE.md says UI languages are EN, AR, RU, UK, SQ, FR. No
`app/[lang]/` segment in the tree — multi-language is a stated stack
but unshipped. SEO impact: only English crawled today.

---

## §8 — Mobile audit

### Tailwind breakpoint discipline
`grep` for `md:|sm:|lg:` in `src/**/*.tsx`:
```
src/app/parcels/map/SidePanel.tsx:170-181   — uses sm: extensively
src/app/parcels/[id]/page.tsx:40            — md:grid-cols-2
src/app/parcels/[id]/MapPreview.tsx:9       — style block (not bp)
```

**Only 3 files total use Tailwind breakpoints.** This is either a
feature (the app is intentionally mobile-first with inline styles on
legal/dashboard pages) OR a gap (most of the app is desktop-designed).
SidePanel is properly responsive: below `sm` it becomes a bottom sheet
(`h-[85vh]`, `rounded-t-2xl`), above `sm` it's the classic 350px
right-panel.

### Fixed-width containers (risk at 375px)
Inline styles with explicit widths:
- `src/app/page.tsx:209` — `maxWidth: 400` (auth card). Fine.
- `src/app/disclaimer/page.tsx:86,99,100`, `privacy/page.tsx:83-100`,
  `terms/page.tsx:95-109` — legal pages use `maxWidth: 1100`,
  `width: 260` (sidebar), `maxWidth: 800` (main). At 375px the 260px
  sidebar leaves 115px for content — broken.
  - These pages DO have a `@media (min-width: 900px)` rule around line
    478/549/612, suggesting the 2-column layout collapses at <900px.
    Check: is the mobile fallback actually tested?
- `src/app/dashboard/page.tsx:82` — `width: 220` for a sidebar. Same
  risk.

**Specific issues with file:line:**
1. `src/app/disclaimer/page.tsx:99-100` — 260px sidebar risks clipping
   on <520px viewports unless the media query covers it.
2. `src/app/privacy/page.tsx:96-97` — same.
3. `src/app/terms/page.tsx:108-109` — same.
4. `src/app/dashboard/page.tsx:82` — 220px sidebar on dashboard. The
   dashboard is not audited here; founder should test on real 375px.
5. `src/app/parcels/map/page.tsx:2 + 26 onMouseEnter` — mouse-only
   handlers on the map page. Touch users won't trigger hover-only
   features. The `onClick` path is separate and works on touch, so
   not a blocker, but hover-only tooltips won't show on mobile.

### Touch vs mouse handler counts
38 `onMouseEnter|Leave|Move` across 5 files. The heaviest:
- `src/app/parcels/map/page.tsx` — 26 mouse handlers.
- `src/app/parcels/map/FeasibilityCalculator.tsx` — 4.
- `src/app/parcels/map/AddPlotModal.tsx` — 4.

For the map page, MapLibre's own touch handling covers pan/zoom; the
onMouse* are for the ChromeBtn hover-glow effect and tooltip reveal.
Not functional blockers on mobile, but the glow-on-hover UX is
desktop-only.

### Viewport testing
Time-boxed out of running a live `pnpm dev` + mobile UA curl
(per-rule, not leaving a dev server up past 9am). The static-file
evidence above is enough for the founder to prioritise.

### 5-10 specific mobile issues (file:line)
1. `src/app/disclaimer/page.tsx:99-100` — 260px sidebar will compress
   content below 520px. Needs a clear single-column fallback.
2. `src/app/privacy/page.tsx:96-97` — same.
3. `src/app/terms/page.tsx:108-109` — same.
4. `src/app/dashboard/page.tsx:82` — fixed 220px sidebar.
5. `src/app/parcels/map/page.tsx:2313+` — land-use hover card (via
   onMouseEnter) — touch users never see it.
6. `src/app/parcels/map/SidePanel.tsx:170-181` — sm-breakpoint bottom-
   sheet looks solid; verify swipe-to-dismiss works on iOS Safari.
7. `src/components/LegalNavbar.tsx:60` — same transition rule as legal
   pages; verify 375px.
8. `src/app/page.tsx:209` — `maxWidth: 400` is fine but the wrapper
   may not center properly on ultra-wide phones.
9. No viewport `<meta name="viewport">` explicitly set in
   `src/app/layout.tsx` — Next.js injects a default; confirm it's
   `initial-scale=1.0`.
10. Bundle on mobile — 627 kB First Load on `/parcels/map` on 3G
    will feel slow. Lazy-imports of Feasibility / AddPlot / Archibald
    would cut the critical path.

---

## §9 — Strategic recommendations

Grouped by theme, each with effort (S ≤ 4 h, M ≤ 1-2 days, L ≥ 3 days)
and impact (S = nice, M = meaningful, L = step-change).

### Retention & engagement
1. **Saved searches + price alerts** — email/push when a new plot
   matches a stored query. Effort: **M**. Impact: **L**. Biggest
   retention lever at 0 deals / 1 user; turns one-time curious
   visitors into returning users.
2. **Watchlist** — pin plots to a personal dashboard. Uses existing
   User + Parcel tables; add a `Watchlist` many-to-many. Effort:
   **S**. Impact: **M**.
3. **Portfolio ROI simulator** — for logged-in investors who own
   multiple plots on ZAAHI, show aggregate projected GFA, value,
   unrealised gain. Effort: **M** on top of feasibility v5. Impact:
   **L** once inventory grows.

### Monetisation
4. **Listing fees** — flat AED 500 to list a plot on ZAAHI. Pairs
   with the pending-review flow already shipped. Effort: **S** (add
   Stripe Checkout before `/api/parcels/submit`). Impact: **L** —
   first revenue line.
5. **Featured plots** — AED 2,000/month for pinned top-of-list
   placement. Effort: **S**. Impact: **M**.
6. **Broker subscriptions** — AED 500/month for broker accounts
   with lead routing, profile, badge. Broker profile is a gap
   (§1); this is the monetisation of closing that gap. Effort:
   **L** (2-3 weeks incl. CRM, dispute flow). Impact: **L**.
7. **Data API for brokerages** — REST endpoint for `/parcels/map`
   data plus AffectionPlan export per district. AED 5,000/month.
   Effort: **M** (API key mgmt, rate-limit, docs). Impact: **L**
   — B2B is where the volume lives in a pre-marketplace phase.
8. **Premium analytics** — unlock district price heatmap,
   transaction overlay, 5-year trend lines for AED 99/month retail.
   Effort: **M** once heatmap ships. Impact: **M-L**.

### Integrations
9. **WhatsApp Cloud API** — lead-capture from SidePanel to the
   seller's WhatsApp. Dubai investors default to WhatsApp. Effort:
   **S**. Impact: **L**.
10. **HubSpot / Pipedrive CRM sync** — push every new Deal.id as a
    deal into the broker's CRM. Effort: **M**. Impact: **M** —
    professional brokers won't leave their CRM.
11. **SendGrid / Postmark** — transactional email for approval
    notifications, deal-status changes, commission paid. Currently
    the only notification path is Vercel logs. Effort: **S**.
    Impact: **M**.
12. **Tawasul (UAE-local SMS gateway)** — approval OTP as SMS,
    not just email. Effort: **S**. Impact: **S**.
13. **Slack / Discord webhook** — founder-side, every new access
    request pings a channel. Effort: **XS** (1 hour). Impact:
    **S but immediate**.

### AI opportunities
14. **Auto-valuation model (AVM)** — a regressor trained on
    `data/dld-transactions.csv` predicting AED/sqft per district
    given recency + size. Drives the "price suggestion" on the
    Add Plot flow. Data needs: all 6,887 transactions + district
    lookup. Effort: **L** (1-2 weeks incl. feature engineering).
    Impact: **L** — removes the "my AED 10M plot is worth AED
    100M" noise.
15. **Market prediction** — 12-month district-level price forecast,
    shown as a confidence band in the SidePanel. Needs AVM first.
    Effort: **L**. Impact: **M** (marketing value high, accuracy
    low).
16. **3D rendering from plot spec** — an LLM that takes BUA/SFA
    inputs + land-use + setbacks and emits a quick "massing study"
    SVG. Feeds the feasibility calculator narrative output.
    Effort: **M**. Impact: **M** — a wow moment in demos.
17. **Archibald co-pilot — expanded** — today it's a 500-token
    Claude Sonnet wrapper (`src/app/api/chat/route.ts`). Expand
    with function-calling to (a) open a plot on the map, (b)
    filter by land-use, (c) run a feasibility scenario, (d) start
    a Deal. Effort: **L** (proper tool schemas + UI handoff).
    Impact: **L**.
18. **AI title-deed OCR** — already present at
    `/api/parcels/parse-title-deed/route.ts`, using Claude Vision.
    Surface-level feature. Low priority to expand.

### Priority 5-10 (actionable tomorrow)
Ranked by effort / impact ratio. Items marked with ★ are prerequisite
for others:

1. ★ **Kill `src/hooks/useAuth.ts`** — 1 min, eliminates a trap.
2. ★ **Ship district price heatmap** — 4-8 h, biggest demo-to-signup
   lift.
3. **Featured plots pricing lane** — 4 h, first revenue.
4. **WhatsApp lead capture** — 4 h, matches UAE buyer behaviour.
5. **Robots + sitemap + OG images** — 2 h, free SEO.
6. **Zod helper rollout** — 2 h / route × 22 routes = ~1.5 days. Do
   this in a dedicated branch, one commit per route.
7. **Backfill `plotGuidelinesUrl` and `buildingStyle`** — 2 h
   scripting, refreshes 196 AffectionPlans to catch those 91% gaps.
8. **Per-plot photo upload** — 2-3 days, the single biggest visual
   competitive gap.

---

## Commits made tonight (session 2)

```
854ed80  feat: restore map selection paint + PMTiles exclusion helper (from WIP)
394b404  feat: restore site-plan-pdf fitBounds + tall-crown zoom-out (from WIP)
```

Both pushed to `origin/main`. No reverts, no force-push, no amends.
`git stash list` is empty. `pnpm build` clean at HEAD.

---

## Open questions for founder

1. **CLAUDE.md SESSION STATUS is stale.** Says 101 parcels; DB has
   114. Want the agent to refresh that section? (Not touched tonight.)
2. **Kadastr drop under `data/master-plans/`** — 8 KMLs match the
   tracked placemark counts byte-for-byte, except `04_Nad Al Hammer`
   which is new (130 placemarks). Options: (a) only wire
   Nad Al Hammer and discard the rest, (b) hash-diff everything and
   archive to `data/archive/2026-04-15/` if identical, (c) wait for
   manual review. Recommendation: **(a)**.
3. **`/api/modules`, `/api/cat/chat`.** Both unused placeholders that
   fail the "all new routes must call getApprovedUserId" rule.
   Delete or gate? Recommendation: **delete both**.
4. **RLS policies.** CLAUDE.md says active; `prisma/migrations/`
   has none. Can the agent audit the live Supabase policies and
   codify them into a migration? (Read-only first step: export
   current policies.)
5. **Dead `src/hooks/useAuth.ts`** — OK to delete in a 1-line
   commit?
6. **Founder's `plotGuidelinesUrl` backfill** (91% missing). Want
   the agent to run `/api/parcels/[id]/affection-plan/refresh` in
   a loop over the 196 missing parcels? Low risk, takes ~10 min
   with rate-limiting, but writes to DB.
7. **"MIXED_USE" vs "MIXED USE"** category typo in
   `AffectionPlan.landUseMix[0].category`. One-row difference but
   violates the 9-category canonical list. Want normalisation?
8. **Feature priority next.** Heatmap / alerts / WhatsApp lead /
   photo upload — recommendation: **heatmap first** (biggest demo
   unlock with smallest effort).

---

*Built by the overnight shift. HEAD builds clean; two WIPs restored;
numbers in the prior report corrected where wrong. Report line count
expanded from 410 → ~720. Sleep well.*
