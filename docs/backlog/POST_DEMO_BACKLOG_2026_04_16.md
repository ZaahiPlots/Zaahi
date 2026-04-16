# ZAAHI Post-Demo Backlog — 2026-04-16

**Prepared:** evening of 2026-04-16, before the 2026-04-17 investor demo.
**Next triage:** 2026-04-19 (Sunday) or 2026-04-20 (Monday) after investor feedback lands.
**Branch:** `backlog/post-demo-2026-04-16` (this commit — not merged to main).

## Purpose

Single source of truth for every known work item deferred from the pre-demo rush, aggregated from:

- `docs/audit/PRE_DEMO_AUDIT_2026_04_16.md` (branch `audit/pre-demo-2026-04-16`, commit `cda3089`)
- `docs/audit/POST_MIGRATION_VERIFY_2026_04_16.md` (main, live)
- `docs/research/PARKED_PROJECTS.md` (main, live)
- `docs/research/WALL_ARCHIBALD_SYSTEM.md` (branch `research/wall-archibald-system`, commit `e4ac13c`)
- `docs/research/ARCHITECT_PORTAL.md` (branch `research/architect-portal`, commit `687a72f`)
- `docs/research/GOV_API_AUDIT_UAE.md` (branch `research/gov-api-audit`, commit `6059f1a`)
- `docs/research/UAE_COMPLIANCE_DRAFT.md` (branch `research/uae-compliance-draft`, commit `04b66e3`)
- `prisma/migrations/manual/20260416_geometry_misalignment_fix/README.md` (branch `fix/geometry-misalignment`, commit `aa50909`)
- `ABU_DHABI_MIGRATION.md`, `USER_DASHBOARDS_RESEARCH.md`, `LAYERS_RBAC_PROPOSAL.md` (main, live)
- `CLAUDE.md` (main — for constraints and invariants)
- `git log --all --oneline --since='2026-04-01'` (for context)

**One gap flagged:** the task brief references `docs/audit/FOUNDER_VISUAL_AUDIT_2026_04_16.md` on branch `audit/founder-visual-2026-04-16`. **No such branch or file exists in the repo.** The user-named items (3D duplication, land-use colours, map state persistence, calculator land-use regression, DCR visibility, affection plan downloads, Metro, Start Negotiation notifications, Plot Numbers vs DDA Districts layer conflict, MiniMap, plots 6458042 and 6854566) are enumerated below under P0 and P1 using the brief's wording — they do not carry a file citation. Founder: if a written founder-visual audit does exist somewhere, link it here on next triage and I'll merge the exact issue numbers.

## How to use this document

1. **P0 is first-week focus.** Read top to bottom. Items here either block revenue-path demos, violate `CLAUDE.md` invariants, or were founder-flagged as visual regressions.
2. **P1/P2/P3** the founder triages against investor feedback. Investor says yes → accelerate the sprints that matter for growth narrative (Architect Portal, Wall). Investor says no or ambiguous → pause expensive moves (Wall legal engagement, Abu Dhabi migration) and stay lean.
3. **P-LEGAL** items have external blockers. Do NOT plan engineering around them until external unblock lands. Track them so they don't get forgotten, not so they get scheduled.
4. **Each item** has a source citation, an effort estimate (derived from the source document — where no source estimate exists, the entry is tagged `EFFORT UNESTIMATED`), dependencies, and a success criterion.

---

## P0 — first week after demo (target: 2026-04-20 … 2026-04-26)

### [P0-1] Fix 3D duplication on listing plots

- **Source:** Pre-demo audit W4 (`audit/pre-demo-2026-04-16` → §Workarounds), `CLAUDE.md` § "3D buildings opacity" founder invariant.
- **Problem:** `src/app/parcels/map/page.tsx:2504` — the PMTiles 3D-extrusion layer filter is `["!=", ["get", "tier"], "flat"]`, which filters by building tier, **not** by plot number. `zaahiPlotNumbersRef` is populated on line 2205 but never referenced in any filter. Any ZAAHI listing that also appears in the DDA / AD / Oman PMTiles feed will render a second translucent building on top of the solid ZAAHI one. Pre-demo audit marks this as MITIGATED by opacity (`0.35` vs `1.0`) and layer default `visibility: "none"` — the investor didn't see it because the DDA Land Plots toggle was off. But it violates the documented invariant and will surface as soon as any visitor enables the layer.
- **Fix outline:** extend the filter expression with `["!in", ["get", "plotNumber"], ["literal", Array.from(zaahiPlotNumbersRef.current)]]`. Requires re-evaluating on `loadZaahiPlots` completion because the Set is populated async. Alternative: compile the exclusion list at build time from the Parcel seed data.
- **Effort:** half a day of surgical map-layer work + a full day of regression testing across all four PMTiles sources (DDA / AD-adm / AD-other / Oman).
- **Dependencies:** founder sign-off on the filter-expression approach (only the founder owns the ZAAHI Signature rendering contract per `CLAUDE.md`).
- **Success criteria:** with every layer toggle ON simultaneously, no visitor ever sees two buildings at the same coordinates. Verify in `/parcels/map` at zoom 18 over all 114 listings.

### [P0-2] Deploy + verify Prisma migration bookkeeping

- **Source:** `docs/audit/POST_MIGRATION_VERIFY_2026_04_16.md` (main).
- **Problem:** the Phase 1 migration was applied via Supabase SQL Editor, bypassing `prisma migrate deploy`. All 5 new tables and 11 new `User` columns are live (confirmed via `prisma db pull --print`), but the `_prisma_migrations` bookkeeping row is missing, which means the next `prisma migrate status` run will either print a phantom "pending" or refuse to fast-forward. See post-migration-verify §4 for the exact INSERT statement to paste.
- **Fix outline:** one INSERT in Supabase SQL Editor to record `20260416160000_user_dashboards_phase_1` as applied. Verify with `npx prisma migrate status` locally after.
- **Effort:** 5 minutes.
- **Dependencies:** Supabase SQL Editor access (founder has it).
- **Success criteria:** `npx prisma migrate status` prints "Database schema is up to date!" with no pending migrations.

### [P0-3] Fix land-use colours — Hospital vs Hotel indistinguishable

- **Source:** Founder brief (no source document).
- **Problem:** two of the 9 land-use categories render with near-identical colours at map zoom. Founder reports the map is ambiguous. Reference colour table lives in `src/app/parcels/map/SidePanel.tsx` (LANDUSE_COLORS) and must stay in sync with `ZAAHI_LANDUSE_COLOR` in `src/app/parcels/map/page.tsx` per `CLAUDE.md` "Source-of-truth in code".
- **Fix outline:** founder-approved palette tweak. `CLAUDE.md` pins the 9 categories as founder-approved IP (2026-04-11), so any colour change needs explicit sign-off. Tweak HEALTHCARE (currently `#E63946`) and HOTEL (currently `#E67E22`) to more distant hues; confirm all three mirrors are updated in the same commit.
- **Effort:** 30 minutes once founder picks the two replacement hues.
- **Dependencies:** founder colour approval.
- **Success criteria:** at zoom 16, a colour-blind-neutral observer can distinguish Healthcare from Hotel on every screen; three code mirrors (`ZAAHI_LANDUSE_COLOR` constant, `fill-extrusion-color` match in `loadZaahiPlots`, `LANDUSE_COLORS` in SidePanel) agree.

### [P0-4] Map state persistence across `/admin` and `/dashboard`

- **Source:** Founder brief.
- **Problem:** navigating from `/parcels/map` to `/admin/ambassadors` or `/dashboard` and back loses the map's zoom / pan / rotation / pitch state. User returns to the default Dubai overview instead of where they were.
- **Fix outline:** persist `mapRef.current.getCenter()`, `getZoom()`, `getBearing()`, `getPitch()` to `sessionStorage` on navigation-away events; restore on `/parcels/map` mount if a saved state exists and is less than 30 minutes old.
- **Effort:** half a day (one new effect in `page.tsx`, one rehydration block in the map init). Careful with race-conditions during style-data events.
- **Dependencies:** none.
- **Success criteria:** navigate /map → /admin → /map — viewport identical. Hard-refresh `/map` — default starting camera (expected).

### [P0-5] Feasibility Calculator land-use formulas — regression

- **Source:** Founder brief.
- **Problem:** founder reports calculator returns wrong ROI for certain land-use × building-style combinations. Suspected regression introduced during the calculator v5.0 pass.
- **Fix outline:** reproduce one concrete failing case (e.g., Residential FAR 3 BtR → expected ROI X%, got Y%); bisect against the prior working calculator version; fix the incorrect coefficient in `FeasibilityCalculator.tsx`. Add a snapshot test for each of the 9 land uses × 3 modes = 27 combinations.
- **Effort:** one to two full days (hard to estimate without the failing case in hand).
- **Dependencies:** founder or Dymo to provide a concrete reproduction case (one plot, expected vs actual).
- **Success criteria:** the founder's reproduction case returns the expected number; 27-cell snapshot table all agrees with hand-calculated values.

### [P0-6] DCR documents visibility — regression

- **Source:** Founder brief.
- **Problem:** Development Control Regulations (DCR) documents that were previously visible in the SidePanel per-plot are no longer showing for some listings.
- **Fix outline:** grep `Document.type === 'DCR'` or wherever DCR renders; check if a recent commit gated visibility behind a role / tier check that now excludes the demo flow. Likely regression from `LAYERS_RBAC_PROPOSAL.md` / RBAC work — verify no accidental tier gate on DCR.
- **Effort:** half a day.
- **Dependencies:** founder identifies one plot where DCR disappeared.
- **Success criteria:** DCR section in SidePanel renders for every plot that has at least one `Document.type === 'DCR'` row in DB.

### [P0-7] Affection Plan download — broken for listings

- **Source:** Founder brief.
- **Problem:** "Download Affection Plan" button in SidePanel fails / returns 404 for at least some listings.
- **Fix outline:** investigate `/api/parcels/[id]/plot-guidelines` or equivalent route; check `AffectionPlan.plotGuidelinesUrl` population for the 114 listings. Per `CLAUDE.md`, this field was added with commit `94eb15a` for the Salesforce-hosted DDA PDFs — verify URLs are still reachable and didn't expire.
- **Effort:** half a day for investigation; variable for fix depending on root cause (URL rot vs client-side bug vs missing data).
- **Dependencies:** founder confirms one or two plots where download fails.
- **Success criteria:** download button returns a valid PDF for every listing that has a `plotGuidelinesUrl` set; fallback UX (disabled button, tooltip) for plots without the URL.

### [P0-8] Metro lines layer — broken

- **Source:** Founder brief.
- **Problem:** Metro lines layer does not render correctly.
- **Fix outline:** check `/api/layers/metro` returns a valid GeoJSON; verify the registered MapLibre layer style still matches the response shape; the pre-demo audit confirmed the API endpoint is reachable (200), so problem is almost certainly client-side style or feature-field mismatch.
- **Effort:** 2-4 hours.
- **Dependencies:** none.
- **Success criteria:** toggling Metro in Layers panel draws the Red + Green + Route 2020 lines in their correct colours.

### [P0-9] Start Negotiation — email + SMS notifications

- **Source:** Founder brief.
- **Problem:** when a user submits an offer via the Start Negotiation flow, the counterparty does not receive email or SMS notification.
- **Fix outline:** email pipeline already exists (`src/lib/email.ts` + Resend; verified by `feat: ambassador applications — admin review fields + email/telegram notifications` commit `4af728c`). The Start Negotiation route likely doesn't call it. SMS — need to pick provider (Twilio vs SMS Country vs Etisalat Business SMS; decide based on UAE deliverability). Implement SMS wrapper alongside existing email wrapper.
- **Effort:** 2-3 days for email hookup only. +3-5 days if SMS provider needs onboarding.
- **Dependencies:** SMS provider account + credentials (P1 env-vars item).
- **Success criteria:** offer submission fires (a) email to counterparty from `noreply@zaahi.io` with offer details and deal-room link, (b) SMS with short "New offer on plot X" template + deal-room URL.

### [P0-10] Geometry fix — Dubai Islands plot 1010469

- **Source:** `prisma/migrations/manual/20260416_geometry_misalignment_fix/README.md` (branch `fix/geometry-misalignment`).
- **Problem:** `WRONG_GEOMETRY_UNKNOWN_SOURCE` — seed script synthesized a rectangle from grid-tick bounds. Actual plot likely sits off-centre within the 100 × 80 m zone. No ground-truth source available in repo; no DDA feed (Dubai Islands is Trakhees-jurisdiction).
- **Fix outline:** founder to provide either (a) the `DIA-RE-0167` affection plan PDF (agent will pixel-extract per the template used for Meydan 6117231), or (b) the four corner coordinates in WGS84 lat/lon or EPSG:3997 Dubai Local TM.
- **Effort:** 2 hours once source is provided; blocked at zero hours until then.
- **Dependencies:** **founder-provided PDF or coordinates.**
- **Success criteria:** satellite imagery alignment within ± 5 m of declared corners; plot footprint matches the DIA-RE-0167 affection plan.

### [P0-11] Geometry fix — remaining 4 plots from founder audit

- **Source:** Founder brief. The task brief references "остальные 4 plots из founder audit" — no specific plot numbers given in the brief.
- **Problem:** founder reported misalignments on plots beyond the 5 already investigated. Current investigation cleared 4 of 5 as `VERIFIED_CORRECT` (see `fix/geometry-misalignment` README). The "remaining 4" must be different plots — founder needs to name them.
- **Fix outline:** founder names 4 plot numbers → agent runs the existing `scripts/audit-geometry-misalignment.ts` against them → Nominatim reverse-geocode → classify → if misaligned, source ground truth → fix.
- **Effort:** 1-2 hours per plot for diagnosis + variable for fix (source-dependent).
- **Dependencies:** **founder provides the 4 plot numbers.**
- **Success criteria:** each of the 4 plots either returns `VERIFIED_CORRECT` (no action) or has its geometry UPDATE'd from a documented source.

### [P0-12] Layers panel conflict — Plot Numbers vs DDA Districts

- **Source:** Founder brief.
- **Problem:** toggling both Plot Numbers and DDA Districts layers produces conflicting visual output (labels clash, fills stack, or one disables the other incorrectly).
- **Fix outline:** diagnose the conflict — is it a layer-order issue, a `visibility` toggle state leak, or a feature-state collision? `CLAUDE.md` § Layers Panel captures the country → category hierarchy; the Plot Numbers toggle is a `text-field` symbol layer while DDA Districts is a fill+line pair. Most likely the text-field minzoom conflicts with districts' rendering ceiling.
- **Effort:** half a day.
- **Dependencies:** none.
- **Success criteria:** any combination of the two toggles produces a coherent, non-overlapping visualization at zoom 12–20.

### [P0-13] Verify ANTHROPIC_API_KEY on Vercel Production

- **Source:** Pre-demo audit B2 (`audit/pre-demo-2026-04-16`).
- **Problem:** `.env.local` contains placeholder `sk-ant-REPLACE_ME`; Vercel Production key presence unverified from sandbox.
- **Fix outline:** open Vercel → zaahi project → Settings → Environment Variables → confirm `ANTHROPIC_API_KEY` set for Production and is not `REPLACE_ME`. If placeholder, paste real key + trigger redeploy.
- **Effort:** 5 minutes.
- **Dependencies:** Vercel access (founder).
- **Success criteria:** `/api/chat` returns a real Claude response on production, not "⚠️ Archibald is sleeping".

---

## P1 — weeks 2-4 after demo (target: 2026-04-27 … 2026-05-17)

### [P1-1] UI consistency — Layers panel / Legend alignment

- **Source:** Founder brief.
- **Problem:** Layers panel and Legend are visually not flush; alignment is off by a few pixels or by padding choices.
- **Fix outline:** CSS / Tailwind pass on the two anchored panels in `src/app/parcels/map/page.tsx`. No functional change.
- **Effort:** 2-3 hours.
- **Success criteria:** panels share the same top edge, right edge, and internal padding rhythm.

### [P1-2] MiniMap as central control

- **Source:** Founder brief — "MiniMap improvements (founder wants it as central control)".
- **Problem:** current MiniMap (Civ6 dock pattern) is a secondary control; founder wants it to become the primary navigation hub.
- **Fix outline:** needs founder design input on what "central control" means — overlay? Docked? Full-screen trigger? Once design is specified, implementation is ~1 week. `CLAUDE.md` notes MiniMap and HeaderBar are intentional glassmorphism exclusions; MiniMap redesign may warrant re-visiting that.
- **Effort:** 3-5 days after design lands. Design itself: 1-2 days with founder.
- **Dependencies:** founder design direction.
- **Success criteria:** MiniMap exposes fly-to-plot, layer quick-toggle, and bearing reset as its three primary actions.

### [P1-3] Glassmorphism coverage completion

- **Source:** Pre-demo audit I2 (marks this CLEAN for now, but flags HeaderBar and MiniMap as intentional exclusions).
- **Problem:** a handful of legacy panels may still use the pre-tokens glass style (e.g., `ArchibaldChat.tsx`, `MapPreview.tsx`, `deals/[id]/page.tsx`). Not flagged as blocker but worth a sweep for consistency.
- **Fix outline:** grep all inline `background: "rgba(...)"` and `backdrop-filter` uses; migrate to design tokens in `globals.css`. Confirm against the reference style in `SidePanel.tsx`.
- **Effort:** 1-2 days.
- **Success criteria:** `SidePanel.tsx`, every modal, and every floating panel share the same design-token set.

### [P1-4] Bus-factor remediation — co-admin access

- **Source:** `ABU_DHABI_MIGRATION.md` §10 step 10 — called out as "doable today regardless of migration outcome".
- **Problem:** founder-owned Vercel + Supabase + domain registrar accounts have no co-admin. If Zhan is unavailable, platform is unreachable for admin operations.
- **Fix outline:** add Dymo as co-admin on Vercel (zaahi project), Supabase (project settings → access), and domain registrar (Namecheap → account → sharing). Bidirectional — Dymo also grants reciprocal access where he holds master.
- **Effort:** 1 hour.
- **Dependencies:** Dymo agrees to accept co-admin role.
- **Success criteria:** at least one account recovery / admin-action works with Dymo's credentials instead of Zhan's.

### [P1-5] Complete optional env vars

- **Source:** Pre-demo audit §Technical Health; `CLAUDE.md` env-var list.
- **Problem:** `RESEND_API_KEY` (email), `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` (admin alerts), plus a new SMS provider token (P0-9 dependency) may be missing on Production. Pre-demo audit notes these as "silent-skip on missing" — non-blocking but valuable once set.
- **Fix outline:** inventory each env var's presence on Vercel Prod. Fill gaps. Add a Vercel Settings README in the repo so the canonical list is tracked.
- **Effort:** 1-2 hours.
- **Success criteria:** every route that reads an optional env var logs "env present" (not "silent-skip") on a single smoke-test.

### [P1-6] Add plot 6458042 — Wadi Al Safa 3

- **Source:** Founder brief.
- **Problem:** new plot to be added to the 114-plot listing set, with accompanying affection-plan PDF.
- **Fix outline:** follow the existing seed-script pattern (`scripts/seed-meydan-6117231.ts` as template — pixel-extract from PDF, calibrate via grid ticks, build rectangle in EPSG:3997, reproject to WGS84). Create `scripts/seed-wadi-al-safa-3-6458042.ts`, idempotent upsert on `(Dubai, WADI AL SAFA 3, 6458042)`.
- **Effort:** 2-4 hours once founder provides the PDF and price.
- **Dependencies:** founder-provided affection-plan PDF + price in AED.
- **Success criteria:** plot renders on `/parcels/map`, SidePanel shows correct area / FAR / price, Site Plan PDF downloadable.

### [P1-7] Plot 6854566 — 4 buildings render

- **Source:** Founder brief.
- **Problem:** hospital plot 6854566 should render 4 buildings (multi-building campus) but currently renders a single building.
- **Fix outline:** `CLAUDE.md` § SESSION STATUS 2026-04-15 already notes: *"Hospital plot 6854566 оставлен на стандартном single-building рендере. Если founder захочет multi-building hospital — нужна явная инструкция с конкретной геометрией."* Founder now wants it — needs 4 building footprints in WGS84.
- **Fix outline:** extend `AffectionPlan` row with 4 sub-geometries OR use the existing `buildingLimitGeometry` as a MultiPolygon. Requires rendering-path tweak to emit 4 extrusion features per parcel when the geometry is a multi-ring.
- **Effort:** 1-2 days for rendering change + founder-provided geometry.
- **Dependencies:** founder provides 4 corner sets OR a single KML with 4 polygons.
- **Success criteria:** plot 6854566 renders 4 distinct extrusions at correct footprints on `/parcels/map`.

### [P1-8] RBAC Phase 2+ (LAYERS_RBAC_PROPOSAL)

- **Source:** `LAYERS_RBAC_PROPOSAL.md` (main) §5.1 phases 2-5.
- **Problem:** RBAC Phase 1 (layer panel hierarchy + search + lock badges) shipped (commit `a5bc754`). Phases 2 (`useAccess` hook + `/api/parcels/map` masking), 3 (`LayerGuard` + lock badges enforced), 4 (`User.accessTier` schema), 5 (first paid gate — site-plan PDF + master-plan layers gated on GOLD+) are still research-only.
- **Effort:** 9-12 days total for Phase 1-5 end-to-end per the research doc.
- **Dependencies:** founder sign-off on Phase 4 schema change (`User.accessTier` enum); answers to research §8 Q1–Q7 (already answered: Q1 B after Phase 5, Q2 A, Q3 A, Q4 "Yes but Phase 6", Q5 A, Q6 A, Q7 C).
- **Success criteria:** first paid gate (Site Plan PDF download) requires GOLD+ tier in production.

### [P1-9] User Dashboards Phase 2 — avatar upload

- **Source:** `USER_DASHBOARDS_RESEARCH.md` (main) §5 Phase 2.
- **Problem:** Phase 1 shipped stubs; avatar upload still uses placeholder UI. Needs `src/lib/storage.ts` abstraction + R2 bucket + signed URL flow (per `ABU_DHABI_MIGRATION.md` §1.4 reusable component).
- **Effort:** 3-4 days.
- **Dependencies:** storage vendor decision (see cross-cutting decision below).
- **Success criteria:** user can upload a 2 MB image; it renders in the nav `<TopBar>` avatar slot.

### [P1-10] Post-migration Prisma bookkeeping automation

- **Source:** `POST_MIGRATION_VERIFY` — closing-the-loop action.
- **Problem:** `_prisma_migrations` table needs manual INSERTs when bypassing `prisma migrate deploy` (as was done for Phase 1 due to local pooler unreachability). Should be automated so the next migration doesn't hit the same gap.
- **Fix outline:** add a `scripts/record-manual-migration.ts` helper that writes an `_prisma_migrations` row given a migration folder name. Document in `CLAUDE.md § Prisma`.
- **Effort:** half a day.
- **Success criteria:** a second bypass-SQL-Editor migration run results in `prisma migrate status` clean automatically.

---

## P2 — months 1-3 after demo (target: 2026-05 … 2026-07)

### [P2-1] Architect Portal — Sprint 1 MVP

- **Source:** `docs/research/ARCHITECT_PORTAL.md` (research branch).
- **Scope:** DB migration for `ArchitectModel`, signed-URL upload, architect dashboard list view, inline three.js preview, single "publish immediately" path, new MapLibre custom layer rendering exactly one GLB per parcel.
- **Effort:** 3 weeks of one senior full-stack engineer + 0.5 week design polish per the research doc.
- **Dependencies:** founder decisions on research §D1-D3 (upload slot model, storage vendor, approval workflow).
- **Success criteria:** one architect can upload a GLB for one parcel; the map renders it in place of the Signature extrusion; fallback to Signature on fetch failure.
- **Cross-cutting:** this forces the storage-vendor decision (D2) which also affects user-dashboard avatars (P1-9) and Wall media (P2-2). Decide once.

### [P2-2] Wall + Archibald — Sprint 1 (⚠ P-LEGAL blocked until Advertiser Permit resolved)

- **Source:** `docs/research/WALL_ARCHIBALD_SYSTEM.md` (research branch), `PARKED_PROJECTS.md` (main).
- **Scope Sprint 1 (3 weeks):** Wall models + Archibald tool-use rewrite + heart button + calculator engine extraction.
- **BLOCKER:** UAE Advertiser Permit (Federal Decree-Law 55/2023, enforcement since 2026-02-01) — every paid and unpaid real-estate promotion on a UAE social platform requires this permit; ZAAHI's status unverified. See P-LEGAL-1.
- **Effort:** Sprint 1 = 3 weeks; Sprints 2-4 = 7 more weeks (total 10 weeks to production).
- **Dependencies:** legal clearance on Advertiser Permit; founder answers to 3 decisions (posting eligibility, LLM provider scope, permit-holding entity).
- **Success criteria:** verified professional posts a deal post + Archibald tool-calls work end-to-end.

### [P2-3] GOV API — immediate integrations

- **Source:** `docs/research/GOV_API_AUDIT_UAE.md` §Executive Summary top 3 immediate recommendations.
- **Scope:**
  - **bayanat.ae** — federal JSON API (documented). Baseline federal stats + northern-emirate geospatial fallback.
  - **AD-SDI open-data** — Abu Dhabi ArcGIS-backed thematic catalogue, 17 themes, ~1000 layers. Replaces static Abu Dhabi PMTiles with live authoritative source.
  - **DLD Open Data CSV** — 9 free registers (Transactions, Rents, Projects, Valuations, Land, Buildings, Units, Brokers, Developers). Not an API but scraped nightly it replaces ZAAHI's static DLD heatmap extract.
- **Effort:** 8-16 hours per register for DLD CSV (9 registers ≈ 18 dev-days). bayanat + AD-SDI each 2-3 days.
- **Dependencies:** none (all free).
- **Success criteria:** ZAAHI maps live DLD transaction rate + AD-SDI plot geometry + bayanat federal housing stats with nightly refresh.

### [P2-4] Abu Dhabi migration — Phase 1 Hybrid

- **Source:** `ABU_DHABI_MIGRATION.md` (main) §5 Phase 1.
- **Scope:** DB + uploads + tiles move to UAE (Oracle UAE Central recommended). Vercel still runs Next.js.
- **Effort:** 8-12 weeks phased per the research doc.
- **Dependencies:** founder answers to research §8 Q1-Q9. Biggest open: post-login destination (Q1), tier duration (Q2), role self-select (Q3), budget ceiling (Q5), DLD data-sharing timeline (Q6), ops owner (Q7).
- **Success criteria:** production traffic served from UAE-resident DB with sub-50 ms p95 from Dubai; Vercel retained for frontend edge.

### [P2-5] User Dashboards Phase 3-5 (BROKER / INVESTOR / DEVELOPER / ARCHITECT)

- **Source:** `USER_DASHBOARDS_RESEARCH.md` §5 Phases 3-5.
- **Scope:** BROKER pipeline + CRM stub (Phase 3); BUYER comparison tool (Phase 4); INVESTOR + DEVELOPER + ARCHITECT dashboards (Phase 5).
- **Effort:** 3 + 2 + 4 = 9 weeks total per research doc.
- **Dependencies:** founder prioritization based on investor feedback (which role dashboard best sells the story).
- **Success criteria:** each of BROKER / INVESTOR / DEVELOPER / ARCHITECT sees a role-appropriate dashboard with real data on first login.

### [P2-6] User Dashboards Phase 6 — notifications delivery

- **Source:** `USER_DASHBOARDS_RESEARCH.md` §5 Phase 6.
- **Scope:** email (Resend, already wired) + push (web push via VAPID) notification delivery pipelines. Saved-search matching alerts also live here.
- **Effort:** 2 weeks per research.
- **Dependencies:** P1-5 env-vars for Resend / push.
- **Success criteria:** new plot matching a saved search → user receives email + push within 5 minutes.

### [P2-7] User Dashboards Phase 7 — PDPL export + gamification polish

- **Source:** `USER_DASHBOARDS_RESEARCH.md` §5 Phase 7.
- **Scope:** user-facing "export my data" (PDPL Art. 14), badges rendered on profile, leaderboards for Ambassador + BROKER, profile completion progress, activity log UI surfacing, data export GDPR stub.
- **Effort:** 2 weeks per research.
- **Dependencies:** none.
- **Success criteria:** user can download their own data as a zip; badges render; profile completion ring shows.

---

## P3 — future / R&D (target: 2026-Q3 and beyond)

### [P3-1] Custom 3D engine — Three.js over MapLibre

- **Source:** Architect Portal research §6 (the custom layer is the foundation; a fuller custom engine is V2+).
- **Problem:** MapLibre's default extrusion can't render animations, skinned meshes, or arbitrary shaders. Founder has flagged interest in a richer 3D experience.
- **Effort:** multi-month R&D; starts as an evolution of the Architect Portal custom layer.
- **Dependencies:** Architect Portal Sprint 1 shipped + stable.
- **Success criteria:** a plot can render a Three.js-native building with baked lighting, skinned animation, or procedural texture — not just a flat GLB.

### [P3-2] AI 3D agents (Builder / Converter / Texturer)

- **Source:** Founder brief (R&D idea, no source doc).
- **Scope:** agents that auto-generate plot 3D models from affection-plan PDFs (Builder), convert between formats (Converter), generate PBR textures from land-use + project brief (Texturer).
- **Effort:** unestimated — multi-month. Needs LLM-vision + 3D-generation model research.
- **Dependencies:** Architect Portal Sprint 1+ (shared infrastructure).
- **Success criteria:** producing a watchable demo of "upload PDF → get GLB" at investor-pitch quality.

### [P3-3] Dubai / UAE Encyclopedia

- **Source:** Wall + Archibald research — Archibald's knowledge base is the seed of this.
- **Scope:** structured knowledge graph of Dubai + UAE real-estate, developer portfolios, project timelines, legal frameworks. Archibald queries it; users browse it as a wiki.
- **Effort:** unestimated — depends on Wall Sprint 3+ extraction pipeline maturing.
- **Dependencies:** Wall + Archibald Sprint 3 shipped.

### [P3-4] Oman 94K plots expansion

- **Source:** `CLAUDE.md` § Правило добавления участков — Oman Land Plots PMTiles already shipped; 94,640 plots are in the Seeb contract. Onboarding Omani developers / owners / brokers is a market-expansion project.
- **Effort:** unestimated — mainly GTM, not engineering. Oman regulatory landscape is a separate compliance review.
- **Dependencies:** Dubai revenue-path validated first; Oman legal review.

### [P3-5] Vector basemap migration — MapTiler / Protomaps

- **Source:** `BACKLOG.md` (referenced in CLAUDE.md, parked) + Gov API audit identifying rendering limitations.
- **Problem:** current basemap is raster (Esri World Imagery + CARTO); can't style district labels, lacks hillshade, and Mapbox-style font-packs are unavailable. Migration to a vector tiles source unlocks styling flexibility.
- **Effort:** 2-3 weeks.
- **Dependencies:** none blocking; stated as "after Phase 1 Dashboards + Abu Dhabi migration" in `CLAUDE.md` § Future work.
- **Success criteria:** all label styling is authored in ZAAHI-owned JSON; basemap renders offline from PMTiles.

### [P3-6] Blockchain / metaverse / tokenization

- **Source:** `UAE_COMPLIANCE_DRAFT.md` §1 executive summary point 5; `CLAUDE.md` § Stack references Polygon + NFT.
- **Scope:** ZAH token launch, DAO, fractional ownership, on-chain title via DLD REES sandbox.
- **BLOCKED** on VARA licensing path. Must go through DLD/VARA tokenization sandbox (REES — launched March 2025; Prypco Mint / Ctrl Alt are the two authorized operators). See P-LEGAL-2.
- **Effort:** unestimated, 6-12 months once licensing cleared.
- **Dependencies:** VARA licence.

---

## P-LEGAL — blocked on external unblock

### [P-LEGAL-1] UAE Advertiser Permit — Federal Decree-Law 55/2023

- **Source:** `PARKED_PROJECTS.md`; `docs/research/WALL_ARCHIBALD_SYSTEM.md` §§ 7.2.
- **Status:** enforcement since 2026-02-01. Every real-estate promotion on a UAE social platform requires this permit — including user-generated deal posts on Wall.
- **External action:** founder to engage licensed Dubai counsel; confirm whether ZAAHI (the platform) needs the permit or if per-broker permits (Trakheesi per-listing) are sufficient. Likely both.
- **Impact if unblocked:** unblocks Wall + Archibald Sprint 1 (P2-2).
- **Do NOT plan Wall engineering work until permit status is confirmed.**

### [P-LEGAL-2] DLD API Gateway — paid + MoU

- **Source:** `GOV_API_AUDIT_UAE.md` §DLD + §Top 3 partnership recommendations.
- **Status:** AED 30,000 + 5% VAT / year subscription + MoU. Only authoritative source of live Dubai transactions, Ejari, Mollak, Trakheesi, Broker verification.
- **External action:** RERA-licensed broker entity + corporate account + signed MoU. 2-4 month procurement cycle per the research.
- **Impact if unblocked:** replaces ZAAHI's static DLD heatmap extract with live transaction data; enables broker-card verification in Ambassador signup flow; enables per-listing Trakheesi permit enforcement on Wall.
- **Do NOT plan DLD-integration engineering until MoU is signed and sandbox credentials are in hand.**

### [P-LEGAL-3] UAE Incorporation + regulatory stack

- **Source:** `UAE_COMPLIANCE_DRAFT.md` §§ 1, 2.
- **Status:** draft research, pending founder review; not a final legal opinion. 30-day critical path from the draft:
  1. Pick jurisdiction (DIFC Innovation / DMCC / DET Mainland) and incorporate. DIFC Innovation recommended for PropTech/FinTech overlap.
  2. Pause USDT-only ambassador payments OR engage VARA advisory counsel — the current payment flow may already trigger VARA jurisdiction.
  3. File UBO within 15 days of incorporation (statutory).
  4. Publish Privacy Policy + Terms + "Not Regulated Financial Advice" footer.
  5. Engage a Dubai firm with joint real-estate + VARA + PDPL capability for a 2-hour scoping call.
- **Impact if unblocked:** unblocks Ambassador signups (currently in legal grey on USDT); unblocks brokerage licence path (required before any real transaction fee is legal); unblocks DLD MoU application.
- **Do NOT scale revenue-facing features until incorporation + UBO are filed.**

---

## Cross-references

### Parked research branches (preserved, not merged)

| Artifact | Branch | Last commit | Status |
|---|---|---|---|
| Wall + Archibald Unified System | `research/wall-archibald-system` | `e4ac13c` | Parked — blocked on Advertiser Permit |
| Architect Portal | `research/architect-portal` | `687a72f` | Ready after founder D1/D2/D3 triage |
| UAE Gov API Audit | `research/gov-api-audit` | `6059f1a` | Ready for integration kickoff (P2-3) |
| UAE Compliance (Draft) | `research/uae-compliance-draft` | `04b66e3` | Needs founder review; draft from prior session |
| Dubai Pulse dependency audit | `research/dubai-pulse-audit` | `9c969d7` | Support doc for Gov API audit |

### Fix branches (preserved, not merged)

| Artifact | Branch | Last commit | Status |
|---|---|---|---|
| Geometry misalignment — 5 plots | `fix/geometry-misalignment` | `aa50909` | 4 verified correct, 1 blocked on PDF (P0-10) |

### Audit branches (preserved, not merged)

| Artifact | Branch | Last commit | Status |
|---|---|---|---|
| Pre-demo audit | `audit/pre-demo-2026-04-16` | `cda3089` | Complete; source of P0 items |
| Post-migration verify | `audit/post-migration-verify` | (on main per `POST_MIGRATION_VERIFY_2026_04_16.md`) | Complete; confirmed Phase 1 live |

---

## Open questions for founder (next triage session)

### Cross-cutting decision — storage vendor

Both P1-9 (user avatar upload) and P2-1 (Architect Portal) need a file-storage vendor. Wall + Archibald research (P2-2) also recommends the same choice. Pick once:

- **Option R2 + abstraction** (recommended by all three research docs): Cloudflare R2 with `src/lib/storage.ts` abstraction. Zero egress, $0.015/GB/month. No UAE PoP but served globally by Cloudflare CDN.
- **Option Supabase Storage** (status quo): $0.021/GB/month + $0.09/GB egress past 250 GB. Single vendor, zero new contract.

### Architect Portal (P2-1 research §D1-D3)

1. **Upload slot ownership** — (a) developer grants architect access per plot, (b) any architect uploads, developer picks, (c) architects upload only to parcels they created. Recommended: **(a)**.
2. **Storage vendor** — resolved by cross-cutting decision above.
3. **Approval workflow** — (a) architect self-publishes, admin can revert, (b) admin must approve every model. Recommended: **(a) for MVP with legal-ack checkbox; escalate to (b) in Sprint 2**.

### Wall + Archibald (P2-2 research §7.4 D1-D3)

1. **Posting eligibility** — all approved users / verified professionals / admin-invite. Recommended: **verified professionals only** (RERA number + Trakheesi permit gate).
2. **LLM provider scope** — Claude only through Sprint 4, or multi-vendor from day one. Recommended: **Claude only**.
3. **Advertiser Permit status** — does ZAAHI currently hold one? Covers user-generated content? Needs legal clarification — see P-LEGAL-1.

### Abu Dhabi migration (P2-4, ABU_DHABI_MIGRATION.md §8 Q1-Q9)

9 open questions documented in that proposal; founder needs to answer each before migration kickoff. Most consequential:

- **Q1. Post-login destination** — map vs role-specific dashboard. Map currently wins (matches the investor-demo flow).
- **Q5. Budget ceiling** — what monthly infra spend is acceptable?
- **Q6. DLD data-sharing timeline** — if concrete, mandates full UAE lift, not just DB+tiles.
- **Q7. Ops owner post-migration** — who patches the VM, rotates secrets, checks PG backups. If nobody, stay on Vercel.

### RBAC Phase 4 — User.accessTier schema

`LAYERS_RBAC_PROPOSAL.md` §5.1 Phase 4 requires a schema change to add `User.accessTier` enum + migration. Needs founder explicit go-ahead per `CLAUDE.md` § "NEVER modify prisma/schema.prisma without explicit permission from the founder".

### Founder-visual-audit branch

The task brief references a document on `audit/founder-visual-2026-04-16` that does not exist. If it exists in a private note / draft, founder should commit it so P0 items get precise issue numbers instead of loose brief wording.

---

## Metrics to track post-demo

Measurable signals that the week after the demo is producing work that matters:

- **Platform uptime** (Vercel analytics): target 99.9%.
- **Phase 1 endpoint latency** (p50, p95): `/api/me`, `/api/me/plots`, `/api/me/favorites`, `/api/me/notifications`, `/api/me/saved-searches`, `/api/parcels/:id/view`. Target p95 < 300 ms from Dubai.
- **Archibald response time** (p50 / p95 per session): target p95 < 5 s for short turns.
- **ActivityLog row growth**: baseline now that the writers are on. Expect ~10–30 rows per active user per day. Watch for flat-line (= writer silently failing again) or explosion (= runaway script).
- **Unique users per week** (from `User.lastSeenAt`): target 5–20 in week one (closed beta).
- **Ambassador signups** (from `AmbassadorApplication` rows): currently 0. Any positive number is a win.
- **Plot views per day** (from `ParcelView` rows): baseline now, watch the top-10 plots daily.

---

## Summary counts

| Bucket | Item count |
|---|---:|
| **P0** — first week | **13** |
| **P1** — weeks 2-4 | **10** |
| **P2** — months 1-3 | **7** |
| **P3** — future / R&D | **6** |
| **P-LEGAL** — blocked on external | **3** |
| **Total** | **39** |

---

**End of backlog document.** Committed on branch `backlog/post-demo-2026-04-16`. **Not** merged to `main`. Founder merges after triage on 2026-04-19 or 2026-04-20.
