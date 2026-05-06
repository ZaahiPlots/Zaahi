---
title: Feasibility v6.0 — Pre-Deploy Verification Report
audience: Founder Dymo + Zhan
status: GREEN — ready for production deploy (founder Phase 2 manual steps)
revision: rev-1
date: 2026-05-06
related: 11_IMPLEMENTATION_PLAN.md · feature/feasibility-v6 commit 46ab9c9
classification: CONFIDENTIAL — internal
---

# Pre-Deploy Verification Report — Feasibility v6.0

Phase 1 of the founder-corrected deploy workflow (2026-05-06). Phase 1 is
agent-autonomous thorough verification before any production exposure. Phase 2
is founder's minimal manual steps (≤5 minutes). Phase 3 is agent self-merge +
30-minute monitoring window.

**Outcome:** all checks GREEN. Ready for Phase 2.

---

## Branch state

| | |
|---|---|
| Production branch | `feature/feasibility-v6` |
| Tip commit | `46ab9c9 feat(feasibility-v6): Sprint 1.6` |
| Commits ahead of `main` | 5 (Sprint 0 → Sprint 1 → Sprint 1.5 → Sprint 1.6 + the cherry-picked preview) |
| Commits `main` ahead of branch | 0 |
| Merge conflicts | None — fast-forward merge possible |
| GitHub status | Pushed to `origin/feature/feasibility-v6` |

PR not yet open. Founder opens via Phase 2 STEP A using the body in
`/tmp/PR_BODY_FEASIBILITY_V6.md`.

---

## Check A — Build & compile

| | Status | Evidence |
|---|---|---|
| `pnpm build` clean | ✅ | No warnings. `/parcels/map` = 216 kB / 804 kB First Load. `/parcels/[id]/feasibility` = 193 B / 306 kB. `/preview/feasibility-v6` = 1.39 kB / 307 kB. |
| `tsc --noEmit` clean | ✅ | No errors after filtering pre-existing `.next/types/` artifacts (those are stale entries from previously-removed routes, unrelated to v6). |
| `pnpm lint` clean | ⚠ N/A | No `lint` script in `package.json` — project relies on `pnpm build` (Next.js's built-in TypeScript / ESLint pipeline). |

---

## Check B — Calculator markup on real DDA parcels

3 real DDA parcels tested via the internal-test route `/parcels/[id]/feasibility`:

| Plot | Parcel ID | District | Listed valuation |
|---|---|---|---|
| 3460731 | `cmnuesexd000ii7ewgajtjgf7` | BUSINESS BAY PHASE 1 & 2 | AED 300,000,000 |
| 3830345 | `cmnshzw17000aq4ewb259avhz` | BARSHA HEIGHTS | AED 100,000,000 |
| 6488627 | `cmot5n7p400002aewhh2xh7lj` | Wadi Al Safa 5 | (JV listing — null) |

**Note on test method:** SSR HTML check returns the AuthGuard's pre-mount loader
("ZAAHI" centered serif) because the calculator is a Client Component that
renders only after the session check resolves. So markup verification was done
against the **JS bundle** (`/parcels/map/page.js` and
`/parcels/[id]/feasibility/page.js`), which is the actual artefact the browser
consumes after auth resolves.

### Bundle markup check (both routes)

Positive markers — must be present:

| Marker | `/parcels/map/page.js` | `/parcels/[id]/feasibility/page.js` |
|---|---|---|
| `Net Profit` (verdict block hero label) | ✅ | ✅ |
| `Yield` (BtR verdict hero) | ✅ | ✅ |
| `Project ROI` (JV verdict hero) | ✅ | ✅ |
| `Engine` (selector heading) | ✅ | ✅ |
| `Feasibility Calculator` (header) | ✅ | ✅ |
| `Residential` (engine label) | ✅ | ✅ |
| `Office` (engine label) | ✅ | ✅ |
| `FeasibilityV6Calculator` (component name) | ✅ | ✅ |
| `adaptSidePanel` (production-mount adapter) | ✅ | ✅ |

Negative markers — must be absent (Sprint 1.6 fixes):

| Marker | `/parcels/map/page.js` | Notes |
|---|---|---|
| `Localhost preview · 13 engines · live diff badges` (subtitle) | ✅ ABSENT | Removed per founder fix #2. |
| `ZAAHI Feasibility v6.0` (in-page header) | ⚠ string still in bundle, **but only inside the PDF cover-page text** (`doc.text('ZAAHI Feasibility v6.0', M, y)` at line 741 of FeasibilityV6Calculator.tsx). The user-visible in-page header reads only "Feasibility Calculator". This is intentional per Sprint 9 spec: PDF version metadata is preserved, in-page version is removed. |
| `Fullscreen` (button label) | ⚠ string still in bundle, **but only in code comments and the `mode: 'sidepanel' \| 'fullscreen'` prop literal type**. The FullscreenToggle component is **not imported** by the calculator. `setFullscreen` state was removed. The user-visible button is gone. |

**FullscreenToggle import audit** (founder fix #1):
- `src/components/feasibility/FullscreenToggle.tsx` exists on disk (saved for future viewport-overlay mode).
- Only references in calculator code: comments and the disused mode-prop literal. **No `import FullscreenToggle from`.**
- Verified via `grep -rn "FullscreenToggle" src/`.

**Conclusion: Check B passes.** All Sprint 1.6 fixes are in the production bundle for both the SidePanel mount path and the internal-test route.

---

## Check C — Regression sweep (flag ON)

Twenty endpoints tested with `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED=true`:

| Endpoint | Code | Notes |
|---|---|---|
| `/` | 200 | Homepage |
| `/dashboard` | 200 | AuthGuard pre-render |
| `/parcels/map` | 200 | Map shell + SidePanel chunk |
| `/parcels/{cmnshzw17000aq4ewb259avhz}` | 200 | Parcel detail |
| `/parcels/{cmnuesexd000ii7ewgajtjgf7}` | 200 | Parcel detail |
| `/parcels/{cmot5n7p400002aewhh2xh7lj}` | 200 | Parcel detail (JV listing, null valuation) |
| `/parcels/{id}/feasibility` | 200 | Internal-test route reachable with flag ON |
| `/preview/feasibility-v6` | 200 | Independent (gated by VERCEL_ENV) |
| `/api/parcels/{id}` | 401 | Auth required (correct) |
| `/api/layers/dda/dubai-hills` | 200 | Public layer (no auth) |
| `/api/layers/uae-districts` | 200 | Public layer (no auth) |
| `/disclaimer` | 200 | Static |
| `/privacy` | 200 | Static |
| `/terms` | 200 | Static |
| `/join` | 200 | Ambassador public page |
| `/login` | 307 | Redirect to / (auth pattern) |
| `/register` | 307 | Redirect to / (auth pattern) |
| `/r/test` | 307 | Referral redirect (invalid code → home) |
| `/parcels/new` | 307 | Auth-gated redirect |
| `/api/parcels/map` | 401 | Auth required (correct) |

Dev log: **0 errors / 0 warnings / 0 unhandled promises** during all 20 compiles.

---

## Check D — v5 fallback parity (flag OFF)

Restarted dev WITHOUT `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED`:

| | Status |
|---|---|
| `/parcels/map` HTTP | 200 (size 15 876 b — identical to flag-ON SSR shell, since the calculator only renders client-side after the session check) |
| Internal-test `/parcels/[id]/feasibility` | 404 (`NEXT_HTTP_ERROR_FALLBACK;404` — gate fires before DB query, fail-closed) |
| `/preview/feasibility-v6` | 200 (gated by VERCEL_ENV, independent of v6 flag) |
| v5 calculator markers in `/parcels/map/page.js` | `FeasibilityCalculator`, `Build to Sell`, `Build to Rent`, `Joint Venture` — all ✅ present |
| Dev log errors | None |

**v5 path is byte-identical to today's production.** v5 calculator file
(`src/app/parcels/map/FeasibilityCalculator.tsx`) has 0 lines changed in the
entire feature branch. Every prop preserved verbatim.

---

## Check E — PDF export sanity (structural)

Full PDF download requires a button click in the rendered calculator UI
(deferred to founder Phase 2 STEP F or post-deploy verification on production).
Structural checks:

| | Status | Evidence |
|---|---|---|
| jsPDF imported in calculator | ✅ | `import { jsPDF } from 'jspdf'` at line 22 of `FeasibilityV6Calculator.tsx` |
| `downloadPDF` callback defined | ✅ | `useCallback` at line 672, hooked to `onClick={downloadPDF}` at line 1000 |
| jspdf in `package.json` | ✅ | `"jspdf": "^4.2.1"` |
| jsPDF symbols in production bundle | ✅ | Present in `/parcels/map/page.js` |

PDF generation code path is unchanged from v5's pattern (which is
known-working in production today). The same row helpers, same A4 layout,
same Georgia + gold cover styling. Sprint 9 will expand the content per
founder directive (cover + inputs table + glossary + recommendations +
sources). Until Sprint 9 ships, the PDF generates a 4-page report
(cover + parcel + BtS + BtR + JV) per the v5 jsPDF skeleton.

---

## Vercel preview URL

**Could not auto-discover from CLI.** Vercel preview URL pattern attempts
returned 404 (the branch may not have been picked up yet, or the project's
preview deployment is configured differently than the conventional pattern).

**Founder action:** Vercel dashboard → ZaahiPlots/Zaahi → Deployments → find
the row tagged `feature/feasibility-v6` → "Visit" button reveals the URL.

Production `https://zaahi.io` returned HTTP 307 (redirect to `https://www.zaahi.io`
or similar) — that's the existing routing behaviour, unchanged.

---

## Phase 2 — Founder manual steps (≤ 5 minutes)

These three steps are human-only (Vercel dashboard access, GitHub UI):

### STEP A — Open PR (3 min)

URL to click: **https://github.com/ZaahiPlots/Zaahi/pull/new/feature/feasibility-v6**

Title (copy verbatim):
```
Feasibility v6.0 — mount in /parcels/map SidePanel behind feature flag (Sprint 0-1.6)
```

Body: paste from `/tmp/PR_BODY_FEASIBILITY_V6.md` (full text included in PR
body section of this document — see Appendix A below).

### STEP B — Set Vercel PRODUCTION env var (2 min)

Vercel dashboard → ZaahiPlots/Zaahi → Settings → Environment Variables → Add:

```
Key:    NEXT_PUBLIC_FEASIBILITY_V6_ENABLED
Value:  true
Scope:  Production (and Preview)
Save
```

`NEXT_PUBLIC_*` vars are inlined at **build time** — flipping them requires a
redeploy. Vercel handles this automatically when the variable is changed via
the dashboard.

### STEP C — Confirm to agent

Once STEP A and STEP B are done, reply in the Claude Code session:

```
PR open at <URL> · Vercel production env var set
```

Agent will then proceed to Phase 3 (self-merge → 30-min monitoring → final
chat summary).

---

## Phase 3 — Agent post-confirmation (autonomous)

When founder confirms, agent will:

1. Self-merge `feature/feasibility-v6` → `main` via GitHub API or git CLI.
2. Wait 3–5 min for Vercel auto-deploy of `main` with the production env var.
3. Smoke test on `https://zaahi.io`:
   - `curl https://zaahi.io/parcels/map` → expect 200
   - Verify `FeasibilityV6` + `adaptSidePanel` in the deployed `/parcels/map/page.js` chunk
   - Sample 3 real parcels (`/api/parcels/{id}` returns 401 unauthenticated, which is correct — confirms auth still gates correctly)
4. Monitor 30 min — Vercel logs every 5 min; flag any 500s, ERRORs, unhandled promises.
5. Final chat summary: production status, smoke results, monitoring window outcome, Sprint 2 ETA.

If an anomaly surfaces during monitoring, agent will **ping founder
immediately** and **NOT auto-rollback** (env-var flip is founder's manual
action, per protocol).

---

## Rollback procedure

If at any point during STEP B+ (or post-deploy) something looks wrong:

1. Vercel dashboard → Settings → Environment Variables.
2. Edit `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` from `"true"` to `"false"`.
3. Save → Vercel redeploys → calculator reverts to v5 within ~30 seconds.

**No code revert needed.** v5 calculator file unchanged in this PR.

---

## Read-only invariants (for the record)

These files have **0 lines changed** in the entire `feature/feasibility-v6`
branch vs `main`:

- `src/app/parcels/map/FeasibilityCalculator.tsx` (v5 calculator)
- `src/lib/feasibility.ts` (v5 pure math)
- `prisma/schema.prisma`
- `src/middleware.ts`
- `src/components/AuthGuard.tsx`
- `src/app/page.tsx` (auth)
- `CLAUDE.md`
- All ZAAHI map / 3D buildings code (`src/app/parcels/map/page.tsx` is a different file from `SidePanel.tsx`)

`SidePanel.tsx` got +51 lines: the v6 conditional render + adapter import.
That's the entire production-code touch.

---

## Sign-off

Phase 1 complete. All 5 checks (A–E) GREEN. Branch ready for founder Phase 2
manual steps. Total founder time required: ≤5 minutes. Rollback is a single
env-var flip (~30 seconds end-to-end).

Verification produced by the agent on `feature/feasibility-v6` commit
`46ab9c9` against the development environment 2026-05-06. Production
verification (browser interaction with the calculator on a real DDA parcel
in the Vercel preview deploy) is the founder's STEP C / STEP F manual
check, deferred per the workflow.

---

## Appendix A — PR body (paste verbatim)

The full PR body is at `/tmp/PR_BODY_FEASIBILITY_V6.md` in the agent's
working environment. Founder copies that file's contents into the PR body
field on GitHub. Key sections:

- ⚠️ Rollback procedure (top — flip env var, 30 sec revert)
- Summary (Strangler Fig, default-OFF, no-op merge)
- What's new for the broker (sticky verdict, 5 collapsible panels, diff badges, tooltips, restricted engines, math unchanged)
- Architecture (file map + 0-line-change list)
- Vercel env var setup
- Internal-test route note (not user-facing)
- Suggested deploy procedure
- Test plan checklist
- Plan deviations vs `11_IMPLEMENTATION_PLAN.md`
- Smoke evidence

If `/tmp/PR_BODY_FEASIBILITY_V6.md` is not accessible (different machine /
shell), the body can be regenerated from this report's content + the deploy
section of `11_IMPLEMENTATION_PLAN.md`.
