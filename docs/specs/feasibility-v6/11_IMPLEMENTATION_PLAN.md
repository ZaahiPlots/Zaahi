---
title: Feasibility v6.0 — Implementation Plan
audience: Founder Dymo (non-technical) + Zhan (technical reviewer)
status: DRAFT — awaiting "go execute" from founder + Zhan
revision: rev-1
date: 2026-05-06
related: 00_OVERVIEW.md · 01_LAND_USE_ENGINES.md · 03_UX_FULLSCREEN_AND_DIFF.md · 08_RATIFY_TRIAGE.md · 10_FOUNDER_RATIFY_P0.md · phase-1/FEASIBILITY_STYLE_GUIDE.md
classification: CONFIDENTIAL — internal
---

# Feasibility v6.0 — Implementation Plan

This is the plan only. No production code, no migrations, no flag flip. Founder + Zhan read, approve, then I execute.

---

## §1 One-paragraph summary (Dymo, plain Russian)

После имплементации v6.0 на zaahi.io калькулятор Feasibility получит **13 специализированных движков** (Residential, Office, Retail, Hospitality, Industrial, Healthcare, Educational, Senior Living, Data Center, Mixed-Use, Infrastructure, Off-Plan, Land-Hold) вместо одного универсального — каждый со своими дефолтами и подсказками. Появятся **живые delta-бэйджи** (показывают отклонение от рыночной нормы зелёным/жёлтым/красным цветом, клик = сброс), **подсказки на 30 главных полях** (на английском, наведение мыши), **полноэкранный режим** для презентаций клиенту, и **выделенный URL** `/parcels/[id]/feasibility` чтобы можно было поделиться ссылкой на расчёт. Стиль остаётся **тот же самый** — glassmorphism, золотой `#C8A96E`, Georgia для заголовков, Inter для текста — потому что я переиспользую существующие дизайн-токены из `src/app/globals.css`, ничего нового не изобретаю. Карточка участка, карта, auth, ambassador-флоу, все остальные фичи **не трогаются**. Существующий v5-калькулятор остаётся живым во время раскатки за feature flag, в любой момент можно вернуться на v5 одним кликом. **Срок:** ~5 календарных недель при двух чек-пойнтах в неделю с тобой и Жаном. Go-live на zaahi.io — целевая дата **9 июня 2026**, при условии что блокирующие вопросы (§8) закрыты до 13 мая.

---

## §2 Visual consistency guarantee

### §2.1 What stays the same

Every visual decision flows from `src/app/globals.css` design tokens (founder-spec 2026-04-16) and `phase-1/FEASIBILITY_STYLE_GUIDE.md`. **No new fonts, no new color palette, no Material UI, no shadcn, no Tailwind utility-color drift.** v6 looks like part of zaahi.io, not a separate product.

| Surface | v5 (production) | v6 | How |
|---|---|---|---|
| Card backdrop | `rgba(10,22,40,0.5)` + blur 24 px + saturate 150 % | identical | `var(--glass-bg)` + `var(--glass-blur)` |
| Border | gold-tinted `rgba(200,169,110,0.15)` | identical | `var(--glass-border)` |
| Shadow | 12 px / 32 px / inset 1 px | identical | `var(--glass-shadow)` |
| Radius | 14 px (cards) · 8 px (inputs) · 12 px (buttons) | identical | `var(--radius-lg/sm/md)` |
| Headings | Georgia serif 700, uppercase, letter-spaced 0.08 em, gold | identical | `.zaahi-label` utility |
| Body | system-ui / Apple system / Roboto, weight 400 | identical | inherit (no override) |
| Numbers | `font-variant-numeric: tabular-nums`, 800 weight for hero | identical | `<ResultRow hero>` reused |
| Primary CTA | gold soft bg `rgba(200,169,110,0.2)` + gold border 0.4 + uppercase 11 px | identical | `.zaahi-btn-primary` utility |
| Ghost button | glass bg + gold-tinted border + transparent | identical | `.zaahi-btn-secondary` utility |
| Transitions | enumerated properties, 150–200 ms ease | identical | no `transition: all` ever |
| Text colour | warm `#f5f1e8` primary, `rgba(245,241,232,0.55)` secondary | identical | `var(--text-primary/--text-secondary)` |
| Verdict colours | green `#4CAF50` strong / amber `#E67E22` moderate / red `#E63946` below | identical | unchanged from v5 |

### §2.2 New UI elements — every one uses existing tokens

The four new elements introduced by v6 (Engine selector, Diff badge, Tooltip popup, Fullscreen toggle) must compose existing tokens — no new design language.

**Engine selector** — `<select>` styled with `.zaahi-glass` background + `var(--glass-border)` + `var(--text-primary)` + Georgia heading "Engine" above. Sits in the parcel header strip alongside the existing tab bar. Same drop-down pattern as the existing community filter on `/dashboard`.

**Diff badge** — pill button, 9 px micro-label, 0.04 em letter-spacing, transparent background, 1 px border in one of four existing palette colours: green `#2D6A4F` (≤15 %), amber `#E67E22` (15–30 %), amber-bold `#D35400` (30–50 %, this is just amber at 90 % saturation), red `#E63946` (≥50 %). Click = reset to engine default. **No new colours.** "amber-bold" = same hue as amber, deeper saturation — established in CLAUDE.md `#D35400` already used elsewhere.

**Tooltip popup** — `.zaahi-glass-deep` (denser glass for sticky overlays), 280 px width, 11 px body text, 8 px padding, gold-tinted border (`var(--glass-border-active)`), positioned absolute below the field's `ⓘ` icon. Same overlay pattern as the existing parcel-detail hover card on `/parcels/map`. Hover-only on desktop; tap-to-show on touch (added in Sprint 10 a11y pass).

**Fullscreen toggle** — `.zaahi-btn-secondary` ghost button that flips into `.zaahi-btn-primary` gold when fullscreen is active. Same toggle pattern as the existing 2D / 3D switch on the map. Aria-pressed attribute mirrors visual state.

### §2.3 Side-by-side description (v5 SidePanel vs v6 dedicated route)

**v5 today** — calculator embedded in the right-side `SidePanel` over `/parcels/map`. 350 px wide. Three tabs (BtS / BtR / JV). One generic mapping from 9 land-use categories to defaults. No tooltips, no diff badges, no fullscreen, no save/load, no shareable URL. PDF via existing v5 jsPDF route.

**v6 cutover** — new route `/parcels/[id]/feasibility`. Two-column desktop layout (inputs left, results right), single-column mobile. Same glass shell, same gold accents, same Georgia headings. Engine selector + parcel summary in a sticky header strip. Diff badges next to construction / brand / consultancy / infra / sales / rent rows. Hover tooltips on top 30 fields. Fullscreen toggle in header. PDF same jsPDF pipeline (different cover layout). Save / load scenarios in a left rail (Sprint 8). v5 stays alive on `/parcels/map` SidePanel until cutover, gated by feature flag.

The `/parcels/[id]` parcel detail page gets a new "Run feasibility" CTA (`.zaahi-btn-primary`) that links to `/parcels/[id]/feasibility`. v5's "Open feasibility" inside the SidePanel becomes a v5/v6 toggle controlled by the same flag.

---

## §3 Architecture overview (Zhan)

### §3.1 Branch strategy

Single feature branch off `main`: `feature/feasibility-v6`. PR review by Zhan, merge to `main` triggers Vercel auto-deploy. Every sprint ends with a commit on this branch; no force-push, no rebase that rewrites already-pushed commits. The current `research/feasibility-v6-spec` is the spec branch and stays separate — it is not merged to main; its outputs live in `docs/specs/feasibility-v6/`.

### §3.2 File structure changes

```
NEW
src/app/parcels/[id]/feasibility/
  page.tsx                              # server-resolved route + AuthGuard
  FeasibilityV6Calculator.tsx           # main client component (~1,500 lines)
  layout.tsx                            # full-bleed shell, no SidePanel chrome
src/lib/feasibility-v6/
  engines.ts                            # 13 engines + 2 modifiers (move from preview)
  tooltips.ts                           # top 30 EN tooltips (move from preview)
  scenarios.ts                          # save/load helpers (Sprint 8)
  diffBadge.ts                          # 4-tone diff function (move from preview)
  pdf.ts                                # jsPDF report generator (extract + extend v5)
src/components/feasibility/
  EngineSelector.tsx                    # dropdown, ~100 lines
  DiffBadge.tsx                         # pill button, ~50 lines
  FieldLabel.tsx                        # label + ⓘ + tooltip, ~80 lines
  FullscreenToggle.tsx                  # button, ~40 lines
  ScenarioRail.tsx                      # save/load list, Sprint 8
prisma/migrations/<ts>_feasibility_scenarios/
  migration.sql                         # FeasibilityScenario table, Sprint 8

MODIFIED
src/app/parcels/[id]/page.tsx           # add "Run feasibility" CTA
src/app/parcels/map/SidePanel.tsx       # gate v5 calculator on feature flag
src/app/parcels/map/FeasibilityCalculator.tsx  # NO CHANGES (read-only invariant; v5 stays as-is)
prisma/schema.prisma                    # add FeasibilityScenario model (Sprint 8)
src/middleware.ts                       # NO CHANGES (auth flow unchanged)

DELETED — none. v5 calculator stays alive in production until Sprint 11 cutover; even then we deprecate, not delete (one-release safety net).

PRESERVED — preview build at src/app/preview/feasibility-v6/ stays as-is
during execution. It is the founder-evaluation surface. Once v6 ships to
production, the preview route can be removed in a follow-up cleanup commit.
```

### §3.3 Database changes

**One new table only.** Added in Sprint 8, gated behind founder approval (Q4 BLOCKING).

```prisma
model FeasibilityScenario {
  id          String   @id @default(cuid())
  userId      String
  parcelId    String?  // nullable — scenarios can exist without a parcel
  name        String
  engineId    String   // residential / office / ... — string not enum to allow growth
  inputs      Json     // full input snapshot
  resultsCache Json?   // last computed results — for fast list rendering
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  parcel Parcel? @relation(fields: [parcelId], references: [id], onDelete: SetNull)

  @@index([userId, updatedAt])
  @@index([parcelId])
}
```

**RLS policy:**

```sql
-- User can only read / write their own scenarios.
ALTER TABLE "FeasibilityScenario" ENABLE ROW LEVEL SECURITY;
CREATE POLICY scenario_owner_all ON "FeasibilityScenario"
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");
```

No other schema changes. No `Parcel` modifications. No new auth tables.

### §3.4 API endpoints added

All gated by `getApprovedUserId(req)` per CLAUDE.md security rules. None are public.

| Route | Method | Purpose | Body |
|---|---|---|---|
| `/api/feasibility/scenarios` | `GET` | List user's scenarios (paginated 50) | — |
| `/api/feasibility/scenarios` | `POST` | Create scenario | `{ name, parcelId?, engineId, inputs }` |
| `/api/feasibility/scenarios/[id]` | `GET` | Read scenario | — |
| `/api/feasibility/scenarios/[id]` | `PATCH` | Update name / inputs | `{ name?, inputs? }` |
| `/api/feasibility/scenarios/[id]` | `DELETE` | Soft-delete | — |
| `/api/feasibility/compute` | `POST` | Server-validated compute (PII-free) | full inputs JSON |

The `/compute` endpoint is server-side because per CLAUDE.md "Финансовые расчёты — ТОЛЬКО server-side" — but the live UI uses client-side `src/lib/feasibility.ts` for instant feedback (acceptable because client-side is unauthoritative). `/compute` is the source of truth for PDF generation, scenario `resultsCache`, and any future server-emitted artifact. **Sums are stored in fils as `BigInt`** in scenarios.inputs JSON, never floats — matches the existing money-handling rule.

### §3.5 Feature flag strategy

Two-layer kill switch.

**Layer 1 — environment variable** `FEASIBILITY_V6_ENABLED` (`true` / `false`). Read by middleware on every request to `/parcels/[id]/feasibility` — if `false`, redirect to `/parcels/[id]?feasibility-v6=disabled`. Default `false` in production until Sprint 11 cutover.

**Layer 2 — Supabase user-metadata override** `feasibility_v6_preview = true`. If set on a user, the v6 route is accessible regardless of Layer 1. Used during Sprint 1–10 so Zhan + Dymo can preview without flipping the global. Removed in Sprint 11.

**Failure mode:** if Vercel env var is unreachable (build-time), default to `false`. Fail closed, never expose v6 by accident.

### §3.6 Migration strategy — Strangler Fig (chosen)

**Decision: Strangler Fig.** Keep v5 alive in production. Build v6 alongside on a new route. Flip flag when v6 is feature-complete + smoke-passing + Zhan-reviewed. Deprecate v5 entry point one release after cutover. Remove v5 code one release after that.

**Why not Big Bang:**
- v5 is in production with active deal flow. A single-PR replace-everything carries unbounded regression risk. Strangler isolates blast radius.
- Stream 2's localhost preview already proved v6 works as a separate route with mock data. Production path is the same architectural pattern, just with real data.
- Rollback is one env-var flip (~30 seconds end-to-end via Vercel). Big Bang rollback would require a full deploy cycle (~5 minutes minimum, more if a migration ran).

**Why not Branch-by-Abstraction (mid-ground):**
- Would force me to refactor v5 to extract abstractions it doesn't have (engine concept). v5 was written without the engine abstraction. Retrofitting risks v5 regressions for no gain since v6 already has the engines designed.

### §3.7 PDF approach — jsPDF (chosen)

**Decision: jsPDF, client-side, single pipeline.** Per task constraint and 04_DISTRIBUTION_LEGAL_MOAT.md.

**Why not weasyprint:**
- Weasyprint is server-side Python; introducing it would mean a Python runtime in the Next.js Vercel deploy or a separate worker container. Both violate Sovereignty Readiness rules ("avoid Vercel-only APIs", "Docker-ready").
- jsPDF is already a dep (`^4.2.1` in `package.json`), already battle-tested in the v5 calculator's `downloadPDF` callback, already produces a clean A4 report with cover banner / sections / numbered totals.
- PDF aesthetics (Georgia headings, gold accent rule, page footer "ZAAHI Real Estate OS — Confidential") are already encoded in v5's helper functions. Sprint 9 extends this, doesn't replace it.

**Why not hybrid:**
- Hybrid means jsPDF for SidePanel quick-export + weasyprint for "branded" report. We can ship one polished jsPDF pipeline that is already 90 % of weasyprint's quality — for the founder evaluation phase, that's enough. If a 200-page institutional brief is needed later, we revisit; today it's not on the critical path.

### §3.8 v5 → v6 logic reuse

Every formula in `src/lib/feasibility.ts` is reused **unchanged** by v6. The 13 engines wrap the same primitives:

```
deriveArea, deriveLand, deriveConstruction, deriveFinance,
deriveBtSRevenue, computeBtS, btsVerdict,
deriveBtRRental, computeBtR, btrVerdict,
computeJv, fmtAed*, parseNumberInput, fmtInputNumber
```

What v6 adds on top:
- **Engine-specific seeding** — each engine pre-fills `constructionPsfBua` / `salesPsfSfa` / `monthlyRentPsfSfa` etc. instead of the v5 generic 9-category mapper.
- **Per-bed / per-student / per-MW revenue paths** for Healthcare, Educational, Senior Living, Data Center — these don't fit the psf-driven `BtSRevenueInputs` shape, so they get **new revenue functions** in `src/lib/feasibility-v6/revenue-non-psf.ts` (additive, doesn't modify the existing file).
- **Diff baselines** — each engine records its own defaults so the diff badge can compute deviation.
- **Modifiers** — Off-Plan and Awqaf (if approved Q0) wrap an existing engine and adjust outputs. Implementation: function composition, not subclassing.

`src/lib/feasibility.ts` is **READ-ONLY** for the entire v6 execution (matches the read-only invariant the preview already proved).

---

## §4 Execution sequence

**Twelve sprints.** Each sprint is 1–3 working days. Estimates are agent-hours, not Zhan-hours. Founder check is the human gate that must close before the next sprint starts. "Smoke" means the SMOKE TEST checklist from CLAUDE.md plus sprint-specific items.

### Sprint 0 — Foundation extraction (4 h)
- Extract `engines.ts`, `tooltips.ts`, `diffBadge` from preview into `src/lib/feasibility-v6/`. No behaviour change.
- Create `src/components/feasibility/` directory with `EngineSelector`, `DiffBadge`, `FieldLabel`, `FullscreenToggle` lifted from preview.
- **Smoke:** `pnpm build` clean · v5 calculator unchanged · `/preview/feasibility-v6` still loads (now imports from new lib path).
- **Founder check:** no.

### Sprint 1 — Route shell + Residential engine (8 h)
- Create `src/app/parcels/[id]/feasibility/page.tsx` with AuthGuard + feature flag check.
- Build `FeasibilityV6Calculator` for the Residential engine end-to-end on a real parcel (via Prisma fetch by `[id]` URL param).
- Wire diff badges + tooltips for all 30 fields against Residential defaults.
- **Smoke:** real parcel page loads · `pnpm build` clean · ESLint clean · `tsc --noEmit` clean (project-wide) · feature-flag OFF returns 404 / redirect · feature-flag ON renders · v5 SidePanel still works on `/parcels/map`.
- **Founder check:** YES — first cross-check that v6 visual matches v5 SidePanel + style guide.

### Sprint 2 — Commercial cluster: Office, Retail, Mixed-Use (8 h)
- Three engine implementations on top of Sprint 1 chassis.
- Mixed-Use needs blended-revenue split (residential + retail + office) — implemented as engine-internal weighting, not as separate revenue panels.
- **Smoke:** all three engines verdict-tested against 08_RATIFY_TRIAGE.md numbers · diff badges show green for default psf · pnpm build clean.
- **Founder check:** no.

### Sprint 3 — Industrial + Hospitality (8 h)
- Industrial reuses standard psf-driven path.
- **Hospitality is the first non-psf revenue engine.** Add new revenue panel: ADR × occupancy × keys × 365 + ancillary, per HVS Middle East 2025 method. New code in `revenue-non-psf.ts`.
- **Smoke:** all engines so far still load · Hospitality verdict bands recalibrated (yield 6–8 % strong, not 8 %+ residential) · pnpm build clean.
- **Founder check:** YES — Hospitality is a new revenue pattern, founder confirms ADR seed values from 08_RATIFY_TRIAGE.md LU-8.

### Sprint 4 — Healthcare + Educational + Senior Living (12 h)
- Three per-unit revenue engines: per-bed (Healthcare), per-student (Educational), per-key (Senior Living).
- Per-unit revenue panel pattern from Sprint 3 reused.
- **DEPENDS ON Q1 + Q2** answered (BLOCKING in §8) — without those, defaults are placeholders and engines can't ship.
- **Smoke:** all engines load · per-unit math reconciles against 01_LAND_USE_ENGINES.md cited examples · pnpm build clean.
- **Founder check:** YES — three new asset classes, founder validates output magnitudes against domain intuition.

### Sprint 5 — Data Center + Infrastructure + Land-Hold (8 h)
- Data Center: capex/MW pattern, colocation revenue per kW (new panel).
- Infrastructure: unit-rate pattern (no psf, no per-unit) — minimal UI, mostly used as a cost layer for future master-plan-level analysis.
- Land-Hold: speculative no-construction CAGR-driven exit. Simplest engine.
- **DEPENDS ON Q7** (Data Center capex/MW default) BLOCKING.
- **Smoke:** Data Center verdict shows reasonable IRR · Infrastructure renders unit-rate library reference · Land-Hold computes CAGR exit · pnpm build clean.
- **Founder check:** no (numeric defaults all closed in 08_RATIFY_TRIAGE.md).

### Sprint 6 — Modifiers: Off-Plan, Awqaf-if-approved (4 h)
- Off-Plan modifier wraps Residential, applies +12 % sales premium per LU-4.
- Awqaf modifier wraps any engine, only if Q0 = "yes". If Q0 = "no" or "defer", skip Awqaf in Sprint 6, modifiers ship Off-Plan only.
- **DEPENDS ON Q0** BLOCKING.
- **Smoke:** Off-Plan modifier on Residential shows +12 % sales psf vs base · Awqaf surfaces tier-2 distribution waterfall (if approved) · pnpm build clean.
- **Founder check:** YES — modifier semantics are subtle, Dymo verifies wording.

### Sprint 7 — Fullscreen route + dedicated layout (6 h)
- `src/app/parcels/[id]/feasibility/layout.tsx` strips sidebar / nav chrome for a focused workspace.
- Fullscreen toggle uses browser-native `requestFullscreen` API plus internal full-bleed CSS state.
- Mobile two-column → single-column at < 768 px.
- **Smoke:** mobile responsive verified (Chrome DevTools 320 / 768 / 1440 / 1920) · keyboard ESC exits fullscreen · pnpm build clean.
- **Founder check:** YES — mobile is the dealmaker layout for Dymo on the road.

### Sprint 8 — Save / Load scenarios + DB (10 h)
- Prisma migration: add `FeasibilityScenario` table (per §3.3).
- API endpoints (per §3.4) with `getApprovedUserId` auth.
- `ScenarioRail` left-rail component (collapsible, scrollable list, search by name).
- Auto-save on input pause (3-second debounce, per-scenario).
- **DEPENDS ON Q5** (save/load Phase 1 vs Phase 2) — if Phase 2, defer Sprint 8 to a future PR.
- **Smoke:** migration applies cleanly to staging · RLS verified (user A cannot read user B scenarios) · API smoke (POST 201 / GET 200 / PATCH 200 / DELETE 204) · pnpm build clean.
- **Founder check:** YES — scenarios surface user-saved data; founder approves the storage model.

### Sprint 9 — PDF expanded scope (8 h, +4 h vs original) — REVISED 2026-05-06

Founder Dymo Sprint 1.6 directive: the PDF is the broker's client-facing
artefact. It must stand alone — broker hands it to a buyer who wasn't in the
room and the buyer can read it cover to cover and understand both the
verdict AND how to argue it down.

PDF must include:
- **Cover page** — verdict (Net Profit + ROI + Verdict band) + parcel summary
  + engine name. Georgia ZAAHI 44 px logo, gold rule line. ZAAHI brand colours
  per FEASIBILITY_STYLE_GUIDE §6.1.
- **Inputs table** — every input value the user typed, side-by-side with the
  engine default, with the diff-badge tone in colour (green / amber / red).
  Buyer sees at a glance which assumptions are aggressive and which are
  conservative.
- **Results breakdown** — calculations shown step-by-step. Not just the
  verdict; the math from BUA → SFA → Gross Revenue → Net Revenue → Net Profit,
  with each line annotated. Mirrors the v5 PDF's row helpers but adds inline
  formula references.
- **Glossary** — every field / term explained in plain language. Saleable
  Floor Area, BUA, FAR, ROI, contingency, etc. Aimed at a non-developer buyer
  who needs the math intelligible. Pulled from `src/lib/feasibility-v6/
  tooltips.ts` (EN-only top-30) plus extended PDF-specific terms (verdict
  bands, payment-plan mechanics).
- **Optimization recommendations** — auto-generated savings advice based on
  user input vs market defaults. Examples:
  - "Your construction psf is 18 % above the engine default. AED 12 M savings
    if aligned to baseline. Consider RICS NRM 1 unit-rate review."
  - "Sales psf is 8 % below LU-4 Dubai Hills median. AED 4 M revenue uplift
    achievable if pricing aligns to secondary comp."
  - "Contingency 8 % is above 5 % spec. AED 2 M reserve releasable post-tender."
  - Algorithm: walk every input vs `engine.<field>` baseline; for each
    |Δ| ≥ 15 % emit a one-line recommendation tied to the AED magnitude.
    Conservative tone — flag opportunities, not prescriptions.
- **Disclaimer + sources** — page-footer disclaimer (calculations are
  feasibility estimates, not appraisals; per FEASIBILITY_STYLE_GUIDE legal-tail
  if it exists, otherwise an inline ZAAHI-standard disclaimer). Citations to
  08_RATIFY_TRIAGE.md research closures (DLD secondary Q1 2026, CBRE / JLL /
  Knight Frank / etc.) printed at the bottom of the relevant inputs.
- **Footer** — "Generated by ZAAHI Feasibility v6.0 · {date} · zaahi.io" on
  every page. Version metadata moved here from the in-page header per
  Sprint 1.6 (the in-page calculator no longer carries a version number).

**Smoke:** PDF generates < 1.2 s on a single engine (was < 800 ms; expanded
scope adds ~500 ms for glossary + recommendation engine) · file size < 1 MB
(was 500 KB; the inputs table + glossary roughly double the page count) ·
all currency formatted with `toLocaleString` thousand separators · pnpm build
clean · optimization recommendations produce 3-8 lines on a typical parcel
(no spam).

**Founder check:** YES — Dymo hands the PDF to a real broker / prospective
buyer in a live conversation, confirms it stands alone.

**Hours note:** original Sprint 9 was 4 h jsPDF polish. Expanded scope is 8 h.
The +4 h delta is roughly offset by Sprint 7 dedicated-route work removed
(-4 h) per Sprint 1.5 plan correction. Net delta on total: ~0 h. Timeline
9 June 2026 still on track.

### Sprint 10 — A11y + tooltip pass (8 h)
- Per Q4 (10-item a11y block, see 10_FOUNDER_RATIFY_P0.md): WCAG AA contrast 4.5:1 verified via axe-core dev plugin · keyboard tab order linear · all inputs have screen-reader labels · diff badges have `aria-live="polite"` updates · tooltip dismissal via Esc · focus rings visible · color is not the only diff signal (text label too) · 200 % zoom doesn't break layout · `prefers-reduced-motion` honoured.
- Tooltip top-30 review with Dymo: any wording reads "AI-generated" gets rewritten in his voice.
- **Smoke:** axe-core 0 critical / 0 serious · Lighthouse a11y > 95 · pnpm build clean.
- **Founder check:** YES — final visual + wording review before cutover.

### Sprint 11 — Cutover (4 h)
- Flip `FEASIBILITY_V6_ENABLED = true` on Vercel production env.
- v5 SidePanel calculator entry replaced with v6 link (one-line change).
- v5 code stays in repo for one release as safety net.
- Update CLAUDE.md SESSION STATUS section to note v6 is live.
- **Smoke:** end-to-end on production (`zaahi.io/parcels/<real-id>/feasibility`) · v5 fallback verified by setting flag back to false locally · monitoring tab on Vercel for 24 hours.
- **Founder check:** YES — explicit "go live" approval before flag flip.

### Sprint 12 — v5 deprecation (2 h, 1–2 weeks after Sprint 11)
- Delete `src/app/parcels/map/FeasibilityCalculator.tsx`.
- Remove the v5 fallback path in `SidePanel.tsx`.
- Remove `FEASIBILITY_V6_ENABLED` env var (no longer needed).
- **Smoke:** pnpm build clean · `/parcels/map` SidePanel still loads (just without legacy calculator) · all v5 import sites cleaned up.
- **Founder check:** no (cleanup only).

---

## §5 Engine implementation order

**Order is by risk + dependency, not by alphabetic.** The first engine validates the entire chassis (Sprint 1); later engines slot in without architectural change.

| # | Engine | Sprint | Reuses v5 logic | Risk | Why this position |
|---:|---|:---:|:---:|---|---|
| 1 | Residential | S1 | full | low | Validates chassis; v5 already supports it; numeric defaults closed in LU-4 |
| 2 | Office | S2 | full | low | Same psf pattern; LU-5 closed |
| 3 | Retail | S2 | full | low | Same psf pattern; JLL data closed |
| 4 | Mixed-Use | S2 | full | medium | Blended weighting is new logic but additive |
| 5 | Industrial / Logistics | S3 | full | low | Long lease tenor only behavioural change; psf works |
| 6 | Hospitality | S3 | partial | high | First non-psf revenue (ADR-driven) — proves new pattern |
| 7 | Healthcare | S4 | partial | medium | Per-bed revenue; needs Q1 default |
| 8 | Educational | S4 | partial | medium | Per-student revenue; needs Q2 default |
| 9 | Senior Living | S4 | partial | medium | Per-key revenue; UAE class is nascent so verdict bands need calibration |
| 10 | Data Center | S5 | minimal | high | Capex/MW + colocation revenue/kW — almost entirely new code path |
| 11 | Infrastructure | S5 | minimal | low | Unit-rate pattern, minimal UI; used by master-plan analysis later |
| 12 | Land-Hold | S5 | minimal | low | Simplest engine; CAGR-driven exit only |
| 13 | Off-Plan modifier | S6 | full | low | Residential + 12 % overlay; trivial |
| 14 | Awqaf modifier | S6 | partial | high | **Conditional on Q0**; tier-2 waterfall is novel; counsel review may add scope |

**v5-pure engines (5):** Residential, Office, Retail, Mixed-Use, Industrial — all use existing `deriveBtSRevenue` / `deriveBtRRental` / `computeBtS` / `computeBtR` / `computeJv` unchanged. Default values change per engine; math doesn't.

**Partial v5 reuse (5):** Hospitality, Healthcare, Educational, Senior Living, Off-Plan — share `deriveArea` / `deriveLand` / `deriveConstruction` / `deriveFinance` / `computeJv` but introduce a new revenue function per asset class in `revenue-non-psf.ts`.

**Mostly new (3):** Data Center (capex/MW + colocation/kW), Infrastructure (unit-rate library), Awqaf (tier-2 waterfall).

**Land-Hold (1)** is structurally simplest — only land cost + CAGR + exit DLD, no construction at all. Land-Hold tests the engine framework's ability to disable entire input sections without breaking layout.

---

## §6 Risk register

Top 5 risks. Founder reads §6 + §8 to decide what blocks execution.

### R1 — Awqaf 14th engine scope creep [HIGH]
If Q0 = "yes", Awqaf adds a tier-2 distribution waterfall, Sharia oversight wording, and probably counsel review (Crimson / Kayrouz Q3 in 09_COUNSEL_OUTREACH.md). That can extend Sprint 6 from 4 h to 12+ h and may pull a counsel-opinion cycle (4 weeks) into the critical path.
**Mitigation:** if Q0 = "yes", Awqaf ships in a follow-up PR after Sprint 11. v6 cutover does not wait for it.
**Founder decision needed before execution:** YES (Q0).

### R2 — Per-unit revenue calibration uncertainty [MEDIUM]
Healthcare cost/bed and Educational cost/student have wide bands (AED 3–5 M and AED 350–600 k respectively). If founder defaults are too low, verdicts mislead users into thinking a project is more profitable than reality.
**Mitigation:** verdict bands per engine recalibrated in Sprint 4. Diff badges flag deviation from the conservative midpoint. PDF cover banner notes "Defaults are conservative midpoints; user input should reflect specific project specifications".
**Founder decision needed before execution:** YES (Q1, Q2).

### R3 — RLS regression on FeasibilityScenario [MEDIUM]
Bad RLS policy on the new table could leak user A's saved scenarios to user B. The platform's RLS testing is light.
**Mitigation:** Sprint 8 includes explicit two-user RLS smoke test (create scenario as user A, attempt to fetch as user B → 404) before staging deploy. PR review by Zhan with focus on RLS lines.
**Founder decision needed before execution:** no (engineering practice).

### R4 — Visual drift across 13 engines [MEDIUM]
Each engine has a slightly different input surface (per-bed, per-MW, etc.). Risk that one engine's panel ends up looking different from the rest because a contributor reaches for a different border or radius value.
**Mitigation:** All inputs flow through the same `<Row>` + `<NumberInput>` + `<FieldLabel>` + `<DiffBadge>` primitives. No engine renders raw `<input>` or `<select>`. Sprint 10 final pass with side-by-side screenshots of all 13 engines.
**Founder decision needed before execution:** no (engineering practice).

### R5 — Feature-flag misconfiguration on Vercel [LOW]
If `FEASIBILITY_V6_ENABLED` is set to `true` in production before Sprint 11, partial code paths could be reachable. If set to `false` after cutover, v6 disappears from production.
**Mitigation:** Default-false in code if env var unset. Sprint 11 includes explicit "verify Vercel dashboard shows correct value in correct scope" step. Founder + Zhan double-check.
**Founder decision needed before execution:** no.

---

## §7 Rollback plan

**Target rollback time: < 30 seconds end-to-end.**

### §7.1 Routine rollback (most likely scenario)
v6 ships, telemetry shows a regression (e.g., one engine returns NaN, layout breaks on iPad, PDF crashes Safari).

1. Vercel dashboard → zaahi project → Settings → Environment Variables.
2. Edit `FEASIBILITY_V6_ENABLED` from `true` → `false` in Production scope.
3. Click "Save" → triggers a redeployment of just the env-var change (~30 seconds on Vercel).
4. Production traffic to `/parcels/[id]/feasibility` immediately redirects users back to `/parcels/[id]?feasibility-v6=disabled` and v5 SidePanel calculator on `/parcels/map` becomes the canonical path again.
5. No code revert, no migration revert — v5 is still in `main` and serving.

### §7.2 Hard rollback (if env-var flip is not enough)
Hypothetical: a v6 commit broke shared code that v5 also imports.

1. `git revert <Sprint-11-merge-commit>` on `main` → push.
2. Vercel auto-redeploys (~3 minutes for full build).
3. v5 production restored as if v6 cutover never happened.
4. Migration on `FeasibilityScenario` table stays — orphaned but harmless. Drop in a follow-up PR.

### §7.3 Database rollback (if migration broke production)
The Sprint 8 migration is **additive only** — adds a new table, no schema mutation on existing tables. Cannot break v5 by definition (v5 doesn't read `FeasibilityScenario`). If somehow needed:

1. `BEGIN; DROP TABLE "FeasibilityScenario"; COMMIT;` against production DB.
2. Remove the `FeasibilityScenario` model from `prisma/schema.prisma`.
3. `npx prisma migrate deploy` against production.

The migration plan never touches `Parcel`, `User`, `Deal`, `Commission`, `AffectionPlan`, or any existing table. This is the deliberate safety guarantee of additive-only migrations.

---

## §8 Open questions for founder

Five BLOCKING (must answer before execution starts) + nine NON-BLOCKING (can answer mid-execution).

### BLOCKING (5)

**Q1 — Healthcare cost per bed default**
Range AED 3–5 M for private 5★. Recommend AED 3.0 M (conservative midpoint of LU-21).
A) AED 3.0 M ★ recommended
B) AED 4.0 M
C) AED 5.0 M
D) Other (specify)

**Q2 — Educational cost per student default**
Range AED 350–600 k for ultra-premium. Recommend AED 400 k (conservative midpoint of LU-23).
A) AED 350 k
B) AED 400 k ★ recommended
C) AED 500 k
D) Other (specify)

**Q3 — Awqaf 14th engine — yes / no / defer**
Adds Sharia tier-2 distribution waterfall + counsel review. Adds 8+ h to Sprint 6 + up to 4 weeks counsel-opinion cycle if approved.
A) Yes — ship Awqaf as 14th engine in v6
B) No — exclude permanently
C) Defer — ship v6 with 13 engines, revisit Awqaf in v6.1 ★ recommended

**Q4 — Save/load scenarios in v6 launch?**
Sprint 8 = 10 h with database migration + new RLS policy. Adds value but adds risk.
A) Phase 1 — ship in v6 ★ recommended (12 % more user value, 25 % more risk)
B) Phase 2 — defer to v6.1, ship Sprint 8 separately

**Q5 — Cutover strategy**
A) Hard switch — Sprint 11 flips flag, all users on v6 ★ recommended
B) Gradual rollout — flip for 10 % of users, monitor 48 h, scale up
Gradual requires building a user-bucket helper in middleware (~2 h additional). Hard switch + fast rollback (§7.1) is operationally simpler.

### NON-BLOCKING (9)

**N1 — PDF cover style**
A) Brand cover (Georgia 44 px ZAAHI logo + gold rule + parcel summary) ★ recommended
B) Plain cover (just title + date)

**N2 — AR translations phase**
A) Same PR as v6 launch ★ recommended (Stream 5 integrates AR for top 30 fields)
B) v6.1 follow-up

**N3 — Feature flag override channel**
A) Env var only ★ recommended (simplest)
B) Env var + DB-toggle for kill-switch (extra code path)

**N4 — Tooltip interaction model**
A) Hover-only desktop, tap-to-show mobile ★ recommended (matches existing parcel hover-card pattern)
B) Click-to-pin (more deliberate but less discoverable)

**N5 — Mobile breakpoint priority**
A) Phone first 320 px ★ recommended (Dymo on the road)
B) Tablet first 768 px

**N6 — Scenario sharing across users**
A) Phase 1 — owner-only ★ recommended (RLS as written above)
B) Phase 2 — add `sharedWithUserIds[]` later

**N7 — Engine-usage telemetry**
A) PostHog event on engine select + scenario save ★ recommended (build adoption signal)
B) None for v6 launch

**N8 — v5 deprecation timeline**
A) Sprint 12 happens 2 weeks after Sprint 11 ★ recommended
B) Sprint 12 happens 4 weeks after (longer safety net)

**N9 — Live diff badge: pure live or 300 ms debounce?**
A) 300 ms debounce ★ recommended (matches v5 calc debounce; avoids badge flicker on fast typing)
B) Live (every keystroke)

---

## §9 Estimated timeline

### Agent-hours by sprint
| Sprint | Hours |
|---:|---:|
| S0 — Foundation extraction | 4 |
| S1 — Route shell + Residential | 8 |
| S2 — Commercial cluster | 8 |
| S3 — Industrial + Hospitality | 8 |
| S4 — Healthcare + Educational + Senior Living | 12 |
| S5 — Data Center + Infrastructure + Land-Hold | 8 |
| S6 — Modifiers (Off-Plan + Awqaf if approved) | 4–12 |
| S7 — Fullscreen + dedicated layout | 6 |
| S8 — Save/load + DB (if Q4 = A) | 10 |
| S9 — PDF polish | 4 |
| S10 — A11y + tooltip pass | 8 |
| S11 — Cutover | 4 |
| S12 — v5 deprecation | 2 |
| **Total agent-hours (recommended path)** | **~86 h** |
| Total range (Q3 = yes adds 8 h, Q4 = B subtracts 10 h) | **76–96 h** |

### Calendar weeks

Assuming agent works ~12 h/week on this (rest is platform maintenance, ambassador work, parcel curation), and founder + Zhan have **two 30-minute checkpoints per week** (Tuesday + Friday):

| Week | Sprints | Founder checks |
|---|---|---|
| 1 (May 11–15) | S0 + S1 | S1 review Friday |
| 2 (May 18–22) | S2 + S3 | S3 review Friday |
| 3 (May 25–29) | S4 + S5 | S4 review Friday |
| 4 (Jun 1–5) | S6 + S7 + S8 | S6 + S7 + S8 reviews |
| 5 (Jun 8–12) | S9 + S10 + S11 cutover | S9 + S10 + S11 reviews |
| 6 (Jun 15+) | S12 deprecation | none |

**Production zaahi.io go-live target: Tuesday 9 June 2026** (Sprint 11 cutover at start of Week 5). This date is conditional on:
- §8 BLOCKING questions answered by **Wednesday 13 May 2026** (before Sprint 1 starts).
- No counsel-induced scope expansion if Q3 = "yes" (Awqaf approval); if "yes" go-live slips ~2 weeks to **23 June 2026**.
- No production incidents pulling agent-hours away during Weeks 1–5.

**Earliest possible go-live (if Q3 = "defer", Q4 = "Phase 2"): Friday 5 June 2026** — 4 calendar weeks instead of 5, by skipping Awqaf and Save/Load.

**Latest realistic go-live (Q3 = "yes", Q4 = "Phase 1", one founder-check delay): Tuesday 30 June 2026** — 7 calendar weeks.

---

**End of plan.** Awaiting "go execute" from founder + Zhan.
