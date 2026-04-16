# Pre-Demo Audit — Investor Meeting Tomorrow
Date: 2026-04-16
Meeting: 2026-04-17 afternoon (~18h from audit)
Duration: ~45 min research (read-only, no code changes)
Branch: `audit/pre-demo-2026-04-16`
Build: PASS (`npm run build` exit 0, zero warnings)

---

## TL;DR

### BLOCKERS (must fix before demo)

**B1. Phase 1 migration NOT DEPLOYED to production DB.** `npx prisma migrate status` reports 1 pending: `20260416160000_user_dashboards_phase_1`. Tables `SavedParcel`, `Notification`, `ActivityLog`, `ParcelView`, `SavedSearch` do not exist on prod. Every endpoint shipped in commit `8e4df1b` that touches them will return 500.
- Affected endpoints: `/api/me/favorites` (POST/DELETE/GET), `/api/me/notifications/*`, `/api/me/plots` (30d view stats query), `/api/me/saved-searches`, `/api/parcels/:id/view`.
- UI surfaces that break: ♡ favorite button in `src/app/parcels/map/SidePanel.tsx:275` (optimistic update rolls back on 500 but user sees nothing happen), `/dashboard` Properties/Favorites/SavedSearches/Notifications tabs (`src/app/dashboard/page.tsx:75-87`).
- Fix time: 2 min (`npx prisma migrate deploy` against prod DB). Requires founder approval per existing policy — Zhan is the founder, green light is in-scope.

**B2. `ANTHROPIC_API_KEY` is a placeholder locally; Vercel prod value unverified from this machine.** `.env.local` contains the literal `sk-ant-REPLACE_ME`. `vercel` CLI not installed on dev box, so production key presence cannot be confirmed from here. If Vercel prod also has a placeholder, Archibald chat widget hits the 500 branch at `src/app/api/chat/route.ts:49-54` which returns the "⚠️ Archibald is sleeping" fallback (`src/app/parcels/map/ArchibaldChat.tsx:55`).
- Fix time: 2 min — open Vercel dashboard → project settings → env vars, confirm `ANTHROPIC_API_KEY` is set for Production. If missing, paste key + redeploy.

### Workarounds (obfuscate in demo script, don't fix tonight)

- **W1. Only 1 user in production `User` table.** Don't open /admin/ambassadors or /dashboard if the investor can see pending applications list is empty / single user. If asked about traction, say "closed private beta, we're gating access while we validate listings with DLD."
- **W2. `DJAZ2MED18RES033` (Jebel Ali) not in DB** (of the 3 pending backlog plots, 2 landed, this one didn't). Don't navigate to Jebel Ali on the demo map. Demo Meydan 6117231 and Warsan 6241067 which ARE loaded.
- **W3. Dubai Islands plot 1010469 misaligned geometry** (pre-existing known issue). Don't pan to Dubai Islands during the 3D fly-over. Start in Business Bay / Meydan.
- **W4. PMTiles background layer has no ZAAHI-plot exclusion filter** (`src/app/parcels/map/page.tsx:2504` filter is `["!=", ["get", "tier"], "flat"]` only). Code agent says mitigated by opacity 0.35 vs ZAAHI 1.0 + render order — no visible duplication expected, but don't orbit close to a listed ZAAHI plot at high zoom where a tiny z-fight could be visible. Keep camera altitude high during plot showcase.

### Safe to ignore

- **I1. Untracked `docs/research/ARCHITECT_PORTAL.md`** — 87-line skeleton doc, all TBDs, not imported anywhere. No runtime impact.
- **I2. Glassmorphism "inconsistency"** on HeaderBar and MiniMap — confirmed intentional design choice per code review; HeaderBar sits above the map, MiniMap sits inside dock's glass panel.
- **I3. `/auth` returns 404** — expected; auth route is `/login` (confirmed in build output).
- **I4. Russian comments in `src/app/parcels/map/page.tsx:189,2075,2999-3001`** — code comments, not user-visible strings. No Cyrillic leaks in UI.

---

## Demo Journey Status

| # | Step | Status | Notes |
|---|------|--------|-------|
| 1 | https://www.zaahi.io landing | WORKS | Returns HTML, no errors, English only. |
| 2 | Sign In flow (`/login`) | NOT_TESTED (prod) — CODE CLEAN | /auth is 404, correct route is /login (confirmed in build). |
| 3 | /parcels/map map + 3D | WORKS | 189 kB bundle, prerendered static. |
| 4 | Click plot → SidePanel | WORKS | Glassmorphism confirmed `SidePanel.tsx:199-201`. |
| 5 | ♡ Favorite button | **BROKEN (BLOCKER)** | Code wired correctly (`SidePanel.tsx:166-177`, `api/me/favorites/[parcelId]/route.ts:16,53`), but `SavedParcel` table missing in prod → 500s. See B1. |
| 6 | Archibald chat | **DEGRADED (BLOCKER)** | Code wired correctly (`api/chat/route.ts:73`), but API key placeholder locally. See B2. Verify Vercel. |
| 7 | Layers panel toggle | WORKS | Glassmorphism applied per commit `1e06dbf`. |
| 8 | Calculator v5.0 (BTS/BTR/JV) | WORKS | Three tabs confirmed `FeasibilityCalculator.tsx:617-621`, state at line 228, render blocks at 730/778/823. |
| 9 | Site Plan PDF | NOT_TESTED — CODE PRESENT | Route `/api/parcels/[id]/pdf` exists; jspdf in deps. |
| 10 | Drone Mode (WASD) | NOT_TESTED — CODE CLEAN | No reports of regression. |
| 11 | MiniMap | WORKS | Rendering confirmed `MiniMap.tsx:329-332`. |
| 12 | /dashboard Phase 1 | **BROKEN (BLOCKER)** | Overview/Profile tabs hydrate from `/api/me` and work. Properties/Favorites/SavedSearches/Notifications/Deals/Financials all call tables that don't exist in prod → 500. See B1. |
| 13 | /join Ambassador (Silver/Gold/Platinum) | WORKS | Verified LIVE on prod: AED 1,000/5,000/15,000 tiers render, USDT TRC-20 payment mentioned, Gold marked "popular". `join/page.tsx:122-163,268-270`. |
| 14 | /admin/ambassadors | WORKS | Auth-gated via `admin/layout.tsx:30,43`; admin email check via `ADMIN_EMAIL` env var (`ambassador/register/route.ts:144`). Works if founder email matches. |

---

## Known Issues Status

| Issue | Status | Detail |
|-------|--------|--------|
| 3D duplication on listing plots | MITIGATED, not fixed | PMTiles filter: `["!=", ["get", "tier"], "flat"]` only; no ZAAHI-plot exclusion. Opacity 0.35 vs 1.0 + z-order prevents visible doubling. Low risk. |
| Glassmorphism coverage | CLEAN | All panels use `backdrop-filter: blur(24px) saturate(150%)`; HeaderBar + MiniMap exclusions are by design. |
| Dubai Islands 1010469 misaligned | UNCHANGED | Not on demo path. Avoid panning there. |
| Meydan 6117231 | FOUND in DB (district BU KADRA, status LISTED). |
| Jebel Ali DJAZ2MED18RES033 | NOT FOUND in DB. |
| Warsan 6241067 | FOUND in DB (district WARSAN FOURTH, status LISTED). |
| Untracked files | 1: `docs/research/ARCHITECT_PORTAL.md` — safe to leave. |

---

## Technical Health

| Check | Result |
|-------|--------|
| `npm run build` | PASS (exit 0, zero warnings) |
| `npm run typecheck` | N/A (no typecheck script in package.json; tsc runs via next build) |
| `npx prisma migrate status` | 1 migration pending on prod (see B1) |
| DB connectivity (Supabase pooler eu-central-1) | OK |
| `Parcel` row count | 114 |
| `User` row count | 1 |
| `SavedParcel`, `Notification`, `ActivityLog` | TABLES DO NOT EXIST |
| Production landing HTTP | 200 |
| Production /join HTTP | 200 (3 tier cards render) |
| Production /parcels/map HTTP | 200 |
| Env vars present locally | DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY (placeholder) |
| Env vars missing locally | SUPABASE_SERVICE_ROLE_KEY |
| Vercel prod env | UNVERIFIED (no CLI on dev box) |

---

## Recommendations for tonight

### Fix tonight (P0 — only critical) — total ~10 min

1. **[5 min] Deploy Phase 1 migration to prod.** Founder approval already exists (commit `8e4df1b` header: "founder approval received in-session 2026-04-16"). Run:
   ```bash
   npx prisma migrate deploy
   ```
   against production `DATABASE_URL`. After deploy, re-run the three count queries to confirm tables exist. This unblocks favorites, notifications, dashboard Properties/Favorites tabs, and the Archibald activity logger if wired.
   Owner: Zhan.

2. **[2 min] Confirm `ANTHROPIC_API_KEY` in Vercel Production.** Log in to Vercel → zaahi project → Settings → Environment Variables. Verify `ANTHROPIC_API_KEY` is set for Production scope and is NOT the placeholder. If missing/placeholder, paste real key, trigger redeploy from dashboard.
   Owner: Zhan.

3. **[1 min] Smoke test live prod** after both above: open https://www.zaahi.io/parcels/map, sign in as founder, click a plot → click ♡ → check network tab shows 200 on `/api/me/favorites/:id`; open Archibald → send "hello" → confirm real reply, not "sleeping".

### Don't touch tonight — risk > reward

- **3D duplication filter.** Mitigated by opacity/z-order. Touching `loadZaahiPlots` or PMTiles filter expression at 10pm night-before = classic footgun. Keep camera high during demo instead.
- **ARCHITECT_PORTAL.md.** Leave untracked. Don't commit skeleton docs tonight.
- **Dubai Islands 1010469 geometry.** Requires source-data fix, not a code change. Avoid the area in demo.
- **Jebel Ali `DJAZ2MED18RES033`.** Adding a plot to prod DB at night with no test is how demos break. Cut from script.
- **Glassmorphism "consistency" pass.** All flagged panels already conform. No work needed.
- **Russian comments in source.** Not user-visible. Cosmetic cleanup, not a fix.

### Demo script adjustments

- **Start the map in Business Bay or Meydan**, not Dubai Islands. Fly-over should stay above 500m altitude until over a clean listed plot.
- **Pre-stage a favorited plot.** Before demo, sign in as founder, favorite Meydan 6117231 and Warsan 6241067. During demo, open them to show the "filled heart" state — avoids live click-to-save risk.
- **Pre-open Archibald once** ~30 min before demo to warm the Claude API connection and confirm key is real. If "sleeping" appears, you know to retry B2 fix.
- **Demo /join with real URL** https://www.zaahi.io/join — already confirmed LIVE with correct tiers. Strong closer.
- **If investor asks about user count**: pivot to "closed private beta pending DLD listing validation." Don't open /admin/ambassadors or any admin list view.
- **Calculator demo**: switch between all 3 modes (BTS → BTR → JV) — confirmed working, visual storytelling for the economics.

---

## Appendix: Evidence Inventory

- Commit `8e4df1b` — Phase 1 schema + API + `/dashboard` overview/profile working (hydrates `/api/me`). All new tables confirmed in migration folder `prisma/migrations/20260416160000_user_dashboards_phase_1/`.
- `Parcel` table columns verified (schema uses `district`, not `communityName` — docs-level nit).
- Admin layout auth: `src/app/admin/layout.tsx:30,43`.
- Favorite API: `src/app/api/me/favorites/[parcelId]/route.ts:16` (POST), `:53` (DELETE).
- Chat API: `src/app/api/chat/route.ts:46` (auth), `:49-54` (key check), `:73` (upstream call).
- Calculator tabs: `src/app/parcels/map/FeasibilityCalculator.tsx:228,617-621,730,778,823`.
- /join tiers: `src/app/join/page.tsx:122-163,268-270,281-290`.
- PMTiles filter: `src/app/parcels/map/page.tsx:2504` (opacity `:2509`).
- SidePanel favorite: `src/app/parcels/map/SidePanel.tsx:166-177,253,275`.

— End of audit.
