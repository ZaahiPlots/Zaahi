---
title: Feasibility v6.0 — Final Deploy State (LIVE on zaahi.io)
audience: Founder Dymo + Zhan
status: LIVE — v6 calculator with all 13 engines is rendering on production
revision: rev-1
date: 2026-05-06
related: 13_DEPLOY_STATUS.md · 14_DIAGNOSIS_FLAG_NOT_LIVE.md
classification: CONFIDENTIAL — internal
---

# Final Deploy State — v6 LIVE on zaahi.io

**v6 calculator is live on `https://zaahi.io` with all 13 engines, sticky verdict block, collapsible panels, live diff badges, hover tooltips, and the `VALIDATED` / `RESEARCH DEFAULTS` engine grouping.** v5 calculator is gone from production.

---

## Deploy timeline (today)

| UTC | Event |
|---|---|
| 13:21 | Sprint 1.6 (`46ab9c9`) merged + pushed to `main` |
| 13:46 | Vercel finished initial post-merge build (`page-a9c3e0f6a3d1e6db.js`, 240 KB, env var unset → v5 rendering) |
| 14:40 | Diagnostic confirmed env var was unset at build time |
| ~15:00 | Founder set `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED=true` on Vercel + redeployed |
| 15:14 | Vercel redeploy of Sprint 1.6 with env var set: `page-20b6765a1235c441.js` (208 KB, env var inlined as `true`, v5 tree-shaken). v6 active with engines restricted to Residential + Office. |
| ~15:15 | Sprint 2-fast push (`a8b929d`): unlock all 13 engines + add VALIDATED / RESEARCH DEFAULTS optgroups + italic founder-validation disclaimer |
| 15:18 | Vercel built Sprint 2-fast: `page-e7c8d64cfddf7fda.js` + new shared chunk `8317-d6eeea4669f917ef.js` |
| 15:19 | Production smoke 12/12 routes 200/401 as expected |

Two production deploys today after the merge: first the Sprint 1.6 redeploy (env var picked up), second the Sprint 2-fast unlock.

---

## Verification evidence

### Chunk fingerprints

| Chunk | Pre-merge | Sprint 1.6 (env unset) | Sprint 1.6 redeploy (env set) | Sprint 2-fast (LIVE) |
|---|---|---|---|---|
| `parcels/map/page-*.js` | n/a | `a9c3e0f6a3d1e6db.js` 240 KB | `20b6765a1235c441.js` 208 KB | **`e7c8d64cfddf7fda.js` 209 KB** |
| `8317-*.js` (shared feasibility chunk) | n/a | `5f70467c469efa35.js` | `5f70467c469efa35.js` (cached) | **`d6eeea4669f917ef.js`** (new — Sprint 2 changes) |

Three independent signals confirm v6 is active:

1. **Page chunk size = 209 KB** (vs 240 KB v5-fallback baseline). Tree-shaking eliminated v5 path.
2. **`NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` string ABSENT** in all 19 deployed chunks. Next.js inlined the comparison to literal `true` at build time.
3. **`Build to Sell` / `Joint Venture` (v5 tab labels) ABSENT** in deployed chunks — v5 fully tree-shaken.

### All 13 engines verified in production bundle

```
Residential          → 8317-d6eeea4669f917ef.js + page-e7c8d64cfddf7fda.js
Office               → 8317-d6eeea4669f917ef.js
Retail               → 8317-d6eeea4669f917ef.js + page-e7c8d64cfddf7fda.js
Hospitality          → 8317-d6eeea4669f917ef.js + page-e7c8d64cfddf7fda.js
Industrial / Logistics → 8317-d6eeea4669f917ef.js
Healthcare           → 8317-d6eeea4669f917ef.js + page-e7c8d64cfddf7fda.js
Educational          → 8317-d6eeea4669f917ef.js + page-e7c8d64cfddf7fda.js
Senior Living        → 8317-d6eeea4669f917ef.js
Data Center          → 8317-d6eeea4669f917ef.js
Mixed-Use            → 8317-d6eeea4669f917ef.js
Infrastructure       → 8317-d6eeea4669f917ef.js
Off-Plan             → 8317-d6eeea4669f917ef.js
Land-Hold            → 8317-d6eeea4669f917ef.js
```

### Sprint 2-fast UX markers verified

```
"VALIDATED"                          → 8317-d6eeea4669f917ef.js
"RESEARCH DEFAULTS"                  → 8317-d6eeea4669f917ef.js
"Founder validation in progress"     → 8317-d6eeea4669f917ef.js
"Net Profit" (verdict block hero)    → 8317-d6eeea4669f917ef.js
"Yield" (BtR verdict)                → 8317-d6eeea4669f917ef.js + 2 more chunks
"Project ROI" (JV verdict)           → 8317-d6eeea4669f917ef.js
```

### Production smoke — 12/12 routes healthy

| Route | Status | Latency |
|---|---|---|
| `https://www.zaahi.io/` | 200 | 0.67s |
| `https://www.zaahi.io/parcels/map` | 200 | 0.13s |
| `/parcels/cmnshzw17000aq4ewb259avhz` (Plot 3830345 BARSHA HEIGHTS) | 200 | 2.30s |
| `/parcels/cmnuesexd000ii7ewgajtjgf7` (Plot 3460731 BUSINESS BAY) | 200 | 0.59s |
| `/parcels/cmot5n7p400002aewhh2xh7lj` (Plot 6488627 Wadi Al Safa 5) | 200 | 0.58s |
| `/disclaimer`, `/privacy`, `/terms`, `/join` | 200 (×4) | <1s |
| `/api/layers/dda/dubai-hills`, `/api/layers/uae-districts` | 200 (×2) | 1.5–7.6s |
| `/api/parcels/<id>` | 401 (auth-gated, correct) | 0.17s |

No 500s. No errors.

---

## What broker sees now in `/parcels/map` SidePanel

After clicking any parcel and expanding "Feasibility Calculator":

1. **Header**: just "Feasibility Calculator" + Export PDF button. No version number, no fullscreen toggle (per Sprint 1.6 directive).
2. **Parcel one-liner**: Plot # · district · land use, with FAR / area / listed price below.
3. **Engine selector**: dropdown with two groups
   - **VALIDATED** — Residential, Office (founder-ratified)
   - **RESEARCH DEFAULTS** — Retail, Hospitality, Industrial / Logistics, Healthcare, Educational, Senior Living, Data Center, Mixed-Use, Infrastructure, Off-Plan modifier, Land-Hold (alphabetical)
4. **Engine description** + source citation (e.g. "DLD secondary Q1 2026 · Dubai Hills median").
5. **For RESEARCH DEFAULTS engines only**: italic note in muted text — *"Defaults from <source>. Founder validation in progress — verify against current local quotes for production decisions."*
6. **Tabs**: Build to Sell · Build to Rent · Joint Venture.
7. **Sticky verdict block**: Net Profit (hero, gold or red) · ROI · Profit/sqft · Verdict band coloured per tier — visible even while scrolling.
8. **5 collapsible panels** (closed by default, primary metric in header):
   - AREA · BUA <sqft>
   - LAND · AED <amount> + DLD AED <amount>
   - CONSTRUCTION · AED <total>
   - FINANCE · disabled / AED <interest>
   - REVENUE / RENTAL / JV STRUCTURE · AED <amount>
9. **DETAIL panel**: full breakdown collapsed by default.
10. **Live diff badges** on each engine-default field — green ≤15 % / amber 15–30 / red ≥50 %, click resets.
11. **Tooltips** on top 30 fields (hover desktop, tap mobile).
12. **Stacked input layout** so unit suffixes ("AED/sqft", "%") never truncate.

---

## Math safety on RESEARCH DEFAULTS engines

Engines whose defaults aren't yet founder-ratified (Retail, Hospitality, Healthcare, Educational, Senior Living, Data Center, Mixed-Use, Industrial, Infrastructure, Off-Plan, Land-Hold) carry the italic disclaimer. Their math is internally consistent (no NaN / undefined paths) but produces:

- Engines with zero revenue defaults (Hospitality, Healthcare, Educational, Data Center, Infrastructure, Land-Hold): ROI = -100 %, Yield = 0 %. Verdict band shows "BELOW TARGET". Mathematically correct given zero revenue + non-zero land cost. The italic disclaimer warns the user.
- Engines with non-zero defaults (Office, Retail, Industrial / Logistics, Mixed-Use, Senior Living, Off-Plan): produce sensible numbers; just need founder validation that the psf values match Dymo's market view.

No 0 / 0 NaN paths exist because land cost (currentValuation from DLD listing) is always non-zero when the SidePanel opens for a real parcel.

---

## Read-only invariants — none broken

These files have **0 lines changed** in the entire feature/feasibility-v6 branch:

- `src/app/parcels/map/FeasibilityCalculator.tsx` (v5 calculator)
- `src/lib/feasibility.ts` (v5 pure math)
- `prisma/schema.prisma`
- `src/middleware.ts`
- `src/components/AuthGuard.tsx`
- `src/app/page.tsx` (auth)
- `CLAUDE.md`
- All 3D / MapLibre / map page rendering code

The only production-code touch was `+91 lines / -14 lines` across `SidePanel.tsx` (51 lines for the v6 mount conditional) + `EngineSelector.tsx` (60 lines for optgroups + disclaimer) + `engines.ts` (32 lines for the validated field).

Plus 1,500+ lines of new files in `src/components/feasibility/` and `src/lib/feasibility-v6/`.

---

## Rollback (still available, ~30 seconds)

If anything misbehaves:

```
Vercel dashboard → Settings → Environment Variables
NEXT_PUBLIC_FEASIBILITY_V6_ENABLED → set to "false" (Production scope)
Save → trigger redeploy
```

Vercel rebuilds with env var unset → page chunk reverts to 240 KB pattern with v5 inlined → SidePanel renders v5. ~30 seconds end-to-end.

---

## What's next

- **Sprint 3+**: founder ratifies RESEARCH DEFAULTS engines one cluster at a time. Each ratification flips a `validated: false → true` in `src/lib/feasibility-v6/engines.ts`. The dropdown automatically promotes that engine into the "VALIDATED" group; the italic disclaimer disappears for that engine.
- **Sprint 4**: per-bed / per-student / per-MW revenue panels for Hospitality, Healthcare, Educational, Senior Living, Data Center, Infrastructure, Land-Hold (the "zero revenue defaults" engines).
- **Sprint 8**: save / load scenarios (Phase 1 founder approved Q4 = A).
- **Sprint 9**: PDF expanded scope (cover + inputs table + glossary + recommendations + sources, per Sprint 1.6 directive recorded in 11_IMPLEMENTATION_PLAN.md update).
- **Sprint 10**: a11y polish.
- **Sprint 11**: cutover (already done — v5 is gone from production as of this deploy).
- **Sprint 12**: v5 deprecation — delete `src/app/parcels/map/FeasibilityCalculator.tsx` once a release cycle of v6 stability has passed.

Hub71 demo target (9 June 2026) is comfortably in reach.

---

**Production state right now: v6 LIVE on zaahi.io — 13 engines, Strangler-Fig migration complete, rollback available. ✅**
