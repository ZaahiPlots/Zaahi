# ZAAHI — May-parity regression audit & P0 fixes

**Branch:** `fix/may-parity-2026-08-26` (off `main` @ `e5300af`)
**BASELINE:** `2d08560` — *feat: archie AD-2 — Abu Dhabi knowledge + district transliteration*
**Current:** `e5300af` — *fix(map): dynamic listings counter* (main HEAD, 2026-06-16)
**Date:** 2026-08-26

---

## Method, and three things worth knowing before the table

**1. The baseline command returns a June commit.**
`git log --before="2026-06-01" --after="2026-05-01" --oneline main` returns `2d08560` as its
newest entry, but that commit is dated **2026-06-01 16:33 +0400** — not May. The genuinely last
May commit is `9e3f2ad` (2026-05-31, *currency toggle AED/USD*), 20 commits earlier. Per your
direction the command's output is used as BASELINE. Consequence: the Abu Dhabi AD-P0 emirate
fixes, non-DDA plot-entry waves A/B, and Archie AD-2 are **inside** the baseline and therefore
not visible as changes in this audit.

**2. Three of the eleven flows are not regressions.** Detailed in
[Deliberate removals](#deliberate-removals-not-regressions-not-restored). Reported, not restored,
per your direction.

**3. Nothing here was smoke-tested.** `DATABASE_URL` points at the production Supabase instance
and there is no dev/staging database, so per your direction verification was gates-only:
`tsc --noEmit`, `next build`, `eslint src/`. Every fix below is reasoned from code with a
`path:line` proof, and **none has been exercised against a running app.**
[What still needs manual verification](#what-still-needs-manual-verification) lists exactly what
to click.

---

## 1 · Audit table

`path:line` refers to the **current** tree unless stated otherwise.

| Flow | May behaviour (`2d08560`) | Current behaviour (`e5300af`) | Broken? | Root cause |
|---|---|---|---|---|
| **Map load** | Map initialises once; overlays attach once. | Initialises **twice**. The `[baseMap]` effect runs in the same mount commit as the map-init effect, sees `mapRef.current` already set, and calls `setStyle` on the still-loading initial style → MapLibre full style rebuild → every loader runs a second time. `/api/parcels/map` ×3, `/api/layers/*` ×2, 197 parcels / 456 extrusions built twice. | **No — same defect at baseline** | `page.tsx:5142-5145` (effect), `:4964` (`mapRef.current = map`). Identical structure at `2d08560:4340/:4943`. Full analysis: `docs/research/perf-2026-08-21.md` |
| **Plot hover / tooltip** | Hover card on ZAAHI plots, PMTiles, communities; mutual-exclusion dedup. | Unchanged. 12 `mousemove` + 12 `mouseleave` delegated bindings, deduped by `_layerEventRegistry`. | No | — |
| **Plot click** | Click routes to SidePanel, or VaultSidePanelAdapter when `isVault`. | Same routing, but see **P0 1.1** — other entry points could open both panels at once. | **Yes (pre-existing)** | `page.tsx:4806-4810` routes correctly; the carousel / list / hover / Archie paths did not. **Fixed** — `de19f54` |
| **3D extrusions** | Single `fill-extrusion` layer; podium/body/crown tiers; opacity literals. | Unchanged geometry and tiering. Colours changed (see below). | No | — |
| **· extrusion opacity invariant** | ZAAHI `1`, PMTiles `0.45`, vault `1`, all literal numbers. | Identical — `1` / `1` / `0.45`, no data expressions. | No | `page.tsx:3596`, `:3893`, `:4139`. ⚠️ `0.45` is outside the 0.35–0.4 band you specified and CLAUDE.md's stated `0.35`; it reads the same at baseline, so it is a **pre-existing deviation, not a regression**. Not changed — it is a founder-visible value. |
| **· land-use palette** | Commercial `#1B4965`, Hotel `#9B2226`. 9 categories. | Commercial `#1B3A5C`, Hotel `#7B1E2B`. 10 categories (INVESTMENT added). | No — intentional | `570f8f9` (2026-06-07, fixes bug-master P0-3 Hotel/Healthcare indistinguishability) and CLAUDE.md's 2026-06-03 INVESTMENT addition. ⚠️ CLAUDE.md's own table (`#4A90D9` / `#E67E22`) matches **neither** tree — open governance item **BUG-031**. |
| **Layer toggles — Metro, DDA, Free Zones, AD Muni** | `metro`, `ddaProjects`, `ddaFreeZones`, `adMunicipalities` registered and lazily loaded. | All four present. `LayersState` type **byte-identical** to baseline; registry key set identical. | No | `page.tsx:2639`, `:2660`, `:2733`, `:2751` |
| **SidePanel** | Renders; drag-resize; Site Plan PDF, `/pdf`, plot-guidelines all wired. | All four paths intact. Calculator moved position in the JSX (`11d6c9f`). | **Partly (pre-existing)** | Slide animation never ran — see **P0 1.1** second half. **Fixed** — `de19f54` |
| **Calculator PDF** | `FeasibilityCalculator` (v5-era) mounted in SidePanel; `generateSitePlanPdf` wired. | Same component, same PDF entry points, moved in JSX. | No | `SidePanel.tsx:585`, `:889`, `:924`, `:1005`. ⚠️ **There is no "Calculator v4.0"** anywhere in history — see [Naming](#naming-discrepancies). |
| **Auth flow** | `AuthGuard` wraps the map page; `getApprovedUserId` gates APIs. | Identical `AuthGuard` usage. | No | `page.tsx:7981-7988` |
| **Listing flow** | Add Plot chooser → listing / vault wizard → `/api/parcels/submit`. | Unchanged; `submit` gained emirate normalisation (in baseline). | No | — |
| **MiniMap** | **Already unmounted at baseline** — 0 render sites. | Still 0 render sites; component file remains as dead code. | **No — removed before the baseline** | Removed `163542f` (2026-05-31, founder spec). Dead file tracked as **BUG-029**. |
| **Drone mode** | Present — `DroneHUD.tsx` (507 lines) + `drone-controls.ts` (286 lines), 6 refs in `page.tsx`. | **Deleted.** 0 refs. Replaced by always-on keyboard nav. | **No — deliberate removal** | `3bac358` added → `6e87fd4` reverted → `6d02f28` removed → `be1bac2` keyboard nav. Postmortem: `docs/research/drone-fps-postmortem-2026-06-11.md` |

### Summary

**Zero regressions were introduced between `2d08560` and `e5300af` in the eleven audited flows.**

Every defect found is either (a) present identically at the baseline, or (b) a deliberate,
documented removal. The three P0s you asked for are all in category (a) — long-standing defects,
not May→August regressions. That is the single most important result in this report: the fixes
below are still worth shipping, but "restore May behaviour" would not have produced any of them.

---

## 2 · Fixes

| # | Item | Commit | Files |
|---|---|---|---|
| 1 | P0 **1.25** — parcels list always "No parcels match." | `de19f54` | `ParcelsPortalPanel.tsx` |
| 2 | P0 **2.2** — Find plot silently discards a valid plot number | `de19f54` | `page.tsx` |
| 3 | P0 **1.1** — closing the drawer leaves a second drawer over the map | `de19f54` | `page.tsx`, `SidePanel.tsx` |
| 4 | Console cleanup + `/api/notify-admin` PII leak | `0b51bdb` | 27 files + new `src/lib/debug.ts` |
| 5 | Remove stray `pnpm-workspace.yaml` stub | *(no commit — file was untracked)* | — |

### P0 1.25 — the list dropped every row it could not name

`STATUS_ORDER` was a three-element **whitelist** (`LISTED`, `VERIFIED`, `IN_DEAL`) and `grouped`
iterated only over it, so any parcel with another status was silently discarded from the body
while the header — which counts `items.length` (`ParcelsPortalPanel.tsx:160`) — still reported the
full total. `/api/parcels/map` also returns the caller's own `VAULT_PRIVATE` rows
(`src/app/api/parcels/map/route.ts:52-57`), and `VAULT_PRIVATE` was not in the list.

Fixed by making `STATUS_ORDER` a *preferred order* rather than a whitelist: known statuses render
first in order, anything else is appended, and a parcel with no status falls into an `OTHER`
bucket. A row can no longer vanish because the display list has not heard of its status. The two
empty states are now distinct — `No parcels match "<query>"` vs `No parcels available`.

> **Honest limit:** I could not query the database, so I cannot confirm the *observed* production
> case was all-`VAULT_PRIVATE`. The whitelist is a proven defect by inspection; whether it was the
> whole story needs the check in [What still needs manual verification](#what-still-needs-manual-verification).

### P0 2.2 — four silent-failure branches in one function

`page.tsx` `doFind`:

1. **`r.ok` was never checked** before `r.json()`. A 401 parsed to `{error:'unauthorized'}`,
   `data.items` was `undefined`, and `.find()` threw a `TypeError` caught by the outer handler as
   the generic `"Network error"` — indistinguishable from a genuine miss.
2. **Strict `===` on untrimmed free text.** A trailing space or a pasted value missed silently.
3. **Found-but-no-geometry reported "Plot not found."** Two different outcomes, one message.
4. **`onFly` was the only `flyTo` in the file without `essential: true`** (`page.tsx:5619-5628`;
   compare `:5367`, `:5542`, `:5690`, `:6540`). MapLibre skips non-essential camera animation
   entirely under `prefers-reduced-motion`, so the map would not move at all.

All four closed. Errors now name the plot number.

### P0 1.1 — two drawers, no mutex

`selectedParcelId` and `selectedVaultEntry` were independent state atoms, and the source comment
explicitly intended that "both can be open at once via separate z-index layers"
(`2d08560:page.tsx:1643-1644`). Both render a right-edge `<aside>` at the same user-resizable
width — SidePanel at `z-20`, VaultSidePanelAdapter `position:fixed` at `zIndex:30` — so when both
were set the two tiled across ~85% of the viewport and the close button, which clears only one
atom, left the other swallowing every pointer event over the map.

Only the map click handler routed one XOR the other (`page.tsx:4806-4810`). The carousel, parcels
list, hover card and Archie tool paths each set their own atom without clearing the sibling. All
**13** call sites now route through `openParcelPanel` / `openVaultPanel`, which are mutually
exclusive by construction.

The audit's empty second drawer showing only a `×` is `VaultSidePanelAdapter`'s
`error || !view` branch (`VaultSidePanelAdapter.tsx:294-312`).

**Second half — the animation that never ran.** `SidePanel.tsx` set an inline
`transition: "transform 300ms ease-out, width 150ms ease"`, which **overrides** the
`transition-transform` class. Tailwind v4 (4.2.2 installed) compiles `translate-x-full` to the
standalone **`translate`** property, not `transform`:

```css
.sm\:translate-x-full{translate:var(--tw-translate-x) var(--tw-translate-y)}
.transition-transform{transition-property:transform,translate,scale,rotate}
```

The class covered `translate`; the inline override did not. So the panel snapped between states
and `getComputedStyle(el).transform` read `none` in both — which the original audit misread as
"the panel is positioned with `left`". It is not; it is positioned with `translate`, and the
transition simply named the wrong property. Fixed by naming `translate` explicitly.

> Present identically at the baseline (`2d08560:SidePanel.tsx:403-408`; now `:416-418`) — introduced with
> drag-resize in `f014f91`, which is itself inside the baseline.

---

## 3 · Console cleanup

New `src/lib/debug.ts` exposes `debugLog` / `debugWarn`, silent unless
`NEXT_PUBLIC_ZAAHI_DEBUG=true` (build time, server + browser) **or** `?debug=1` on the URL
(browser only, no rebuild — support can ask a user to reload with the trace on).

Rules applied uniformly:

| Before | After | Count |
|---|---|---|
| `console.log` (any runtime) | `debugLog` — gated | **38 → 0** |
| `console.warn` on an expected / recoverable path | `debugWarn` — gated | **5** |
| `console.warn` on a genuine failure | `console.error` — kept, always on | **31** |
| `console.error` | untouched | 74 (now 105) |

**`src/` now contains zero `console.log` and zero `console.warn` outside `debug.ts` itself.**

### PII leak fixed along the way

`src/app/api/notify-admin/route.ts` carried the comment *"Log a redacted summary only — never raw
PII (CLAUDE.md rule)"* directly above a line that logged the applicant's **full name verbatim**.
Email and phone were redacted; the name was not. A full name is PII under PDPL, and CLAUDE.md
rule 5 is unconditional. This route is in the middleware `PUBLIC_API` allow-list, so it is
unauthenticated — any caller could write attacker-chosen strings into Vercel logs on every
request. Name is now redacted to a first initial, and the six unconditional lines collapse to one
gated entry.

### Per-file counts

| File | Sites changed |
|---|---|
| `src/app/parcels/map/buildings/useBuildingsLayer.ts` | 13 |
| `src/app/parcels/map/page.tsx` | 11 |
| `src/app/parcels/map/buildings/BuildingGlbLayer.ts` | 7 |
| `src/app/api/notify-admin/route.ts` | 6 |
| `src/lib/dda-plot-lookup.ts` | 5 |
| `src/lib/district-boundaries.ts` | 5 |
| `src/app/api/archie/feedback/route.ts` | 3 |
| `src/lib/generate-site-plan-pdf.ts` | 3 |
| `src/app/api/admin/registration/[id]/approve/route.ts` | 2 |
| `src/app/api/registration/submit/route.ts` | 2 |
| `src/app/api/admin/registration/[id]/resend-verification/route.ts` | 1 |
| `src/app/api/admin/registration/[id]/route.ts` | 1 |
| `src/app/api/admin/registration/route.ts` | 1 |
| `src/app/api/archie/route.ts` | 1 |
| `src/app/api/me/vault/map/route.ts` | 1 |
| `src/app/api/parcels/submit/route.ts` | 1 |
| `src/app/api/users/sync/route.ts` | 1 |
| `src/app/api/vault/shared-with-me/map/route.ts` | 1 |
| `src/lib/auth.ts` | 1 |
| `src/lib/blockchain.ts` | 1 |
| `src/lib/email.ts` | 1 |
| `src/lib/parcel-create.ts` | 1 |
| `src/lib/storage-signed-url.ts` | 1 |
| `src/lib/supabase.ts` | 1 |
| `src/lib/telegram.ts` | 1 |
| `src/lib/vault-activity.ts` | 1 |
| `src/lib/vault-notifications.ts` | 1 |
| **Total** | **74** |

### Statements now gated behind DEBUG (were unconditional in production)

> Line numbers in the two tables below are **pre-change**, at `e5300af`, so they point at the
> statement as it was. API-route paths are shown relative to `src/app/api/`.

Client-side — these fired in **every visitor's browser console**:

| Location | Statement |
|---|---|
| `useBuildingsLayer.ts:158` | `[BUILDINGS] fetching /api/buildings …` |
| `useBuildingsLayer.ts:165` | `[BUILDINGS] fetch ok — items: …` *(also `.map()`s every item into a throwaway object array purely to log it)* |
| `useBuildingsLayer.ts:194` | `[BUILDINGS] effect skipped — no map instance yet` |
| `useBuildingsLayer.ts:198` | `[BUILDINGS] effect skipped — map style not ready yet` |
| `useBuildingsLayer.ts:210` | `[BUILDINGS] effect run — enabled: … filter: … buildings loaded: …` |
| `useBuildingsLayer.ts:231` | `[BUILDINGS] installing footprint source + fill/line layers` |
| `useBuildingsLayer.ts:287` | `[BUILDINGS] footprint click` |
| `useBuildingsLayer.ts:324` | `[BUILDINGS] footprint handlers installed (click + hover)` |
| `useBuildingsLayer.ts:339/353/363/383` | `[BUILDINGS] removing layer` / `building` / `addLayer for` / `layer added —` |
| `useBuildingsLayer.ts:417` | `[BUILDINGS] unmount cleanup` |
| `BuildingGlbLayer.ts:100/125/153/199/226/237/331` | `[GLB]` lifecycle trace incl. **per-frame download percentage** |
| `page.tsx:3460-3465` | `[ZAAHI] plotFeatures: … buildingFeatures: … (of … parcels)` |
| `page.tsx:3564` | `[ZAAHI] buildingFeatures count: …` |
| `page.tsx:3572` | `[ZAAHI] addSource: zaahi-plots-buildings` |
| `page.tsx:3578` | `[ZAAHI] addLayer: zaahi-plots-buildings-3d fill-extrusion features: …` |
| `page.tsx:5048` | `[GLB] MapboxOverlay attached (deferred init)` |
| `page.tsx:5654/5674/5703` | `[zaahi] submitted parcel` / `vault entry created` / `vault entry already exists` |
| `page.tsx:4248` | `[amenity-icon] failed to load …` → `debugWarn` |

Server-side (Vercel logs):

| Location | Statement |
|---|---|
| `notify-admin/route.ts:23-28` | 6-line `=== NEW ACCESS REQUEST ===` banner incl. **unredacted name** |
| `archie/feedback/route.ts:134/142/183` | `dedup` / `rate-limited` / `sent category=…` traces |
| `archie/route.ts:781` | `[archie] finish: … tools: …` |
| `users/sync/route.ts:59` | `ambassador application link skipped` → `debugWarn` (expected legacy no-op) |
| `parcels/submit/route.ts:294` | `plotclaim duplicate (race)` → `debugWarn` (race is handled) |
| `parcel-create.ts:250` | `plotclaim duplicate (race)` → `debugWarn` |
| `telegram.ts:59` | `TELEGRAM_BOT_TOKEN … missing — skipping` → `debugWarn` (optional integration) |

### Promoted `console.warn` → `console.error` (real failures, still always on)

> Pre-change line numbers, at `e5300af`.

`admin/registration/[id]/route.ts:49` · `admin/.../approve/route.ts:196,221` ·
`admin/.../resend-verification/route.ts:57` · `admin/registration/route.ts:122` ·
`registration/submit/route.ts:401,406` · `me/vault/map/route.ts:134` ·
`vault/shared-with-me/map/route.ts:135` · `page.tsx:3777` (`[vault-shared]` non-401) ·
`page.tsx:5050` (`[deckgl-spike]` overlay init failed) · `generate-site-plan-pdf.ts:129,259,401` ·
`vault-activity.ts:133` · `vault-notifications.ts:56` · `supabase.ts:9` ·
`storage-signed-url.ts:33` · `blockchain.ts:80` · `auth.ts:80` · `email.ts:37` ·
`district-boundaries.ts:273-277` (5) · `dda-plot-lookup.ts:166,174,201,205,213` (5)

---

## 4 · `pnpm-workspace.yaml`

The untracked file was a **pnpm-generated stub with placeholder values**, not a config:

```yaml
allowBuilds:
  '@prisma/engines': set this to true or false
  core-js: set this to true or false
  ...
```

Those are literal strings where pnpm expects booleans. Deleted from the working tree. It was
**untracked**, so its removal produces no commit and no diff — the only durable evidence is this
report. `next build` verified green both before and after removal, so nothing depended on it.

**`10b2ced` is the correct tracked fix and was NOT merged** — it lives on
`fix/dead-controls-2026-08-10`, and your constraint forbids merging other branches in this task.
It carries real booleans plus `prisma generate` in the `build` script, which is the durable fix
for pnpm 11 ignoring `package.json`'s `pnpm.onlyBuiltDependencies` (that dead field is still in
`package.json:35-40` and still warns on every pnpm command). **Deferred — see below.**

---

## 5 · Deferred to unmerged branches — NOT merged

| Item | Lives on | Why deferred |
|---|---|---|
| **`pnpm-workspace.yaml` proper config** + `prisma generate` in the build script + removal of the dead `package.json` `pnpm` field | `fix/dead-controls-2026-08-10` @ **`10b2ced`** | Your constraint: *"One branch off main… No merges of other branches inside this task."* The stray stub is removed here; the durable fix needs that commit cherry-picked or re-authored in a follow-up. |
| **vault-conflict-fix** | `research/vault-conflict-fix` | Not merged. No audited flow traced to it — recorded because you named it. |
| **landuse-archetypes** | `research/landuse-archetypes` | Not merged. The land-use palette change that *did* land came via `570f8f9` on main, not from this branch. |
| **Founder backlog #7, #10, #13, #33** — area 1:1 no rounding, Floors row, PMTiles search, UI sounds | `feat/backlog-batch-2` @ `e27bb84` | Per bug-master F-15, complete but never merged (last commit 2026-06-12). Outside this task's scope. |

---

## 6 · Pre-existing defects found but NOT fixed

Recorded rather than fixed — each is either outside the audited scope, or a founder-visible value
I should not change unilaterally.

| Item | Where | Why not fixed here |
|---|---|---|
| **Double map init** — the single largest load-time cost on `/parcels/map` | `page.tsx:5142-5145` | Present identically at baseline, so not a regression. It is a 4-line fix with a large payoff; full analysis and proposed patch in `docs/research/perf-2026-08-21.md`. Not taken here because it is a behavioural change to map init that deserves its own smoke test. |
| **Every mousemove re-renders the ~6,300-line page component** | `page.tsx:4408` → `:1924`, consumed only at `:5910` | Same reason. The in-repo fix pattern already exists (`MapZoomReadout.tsx`). |
| **No WebGL context-loss handler** — a lost context is unrecoverable, presents as a hang | 0 hits for `webglcontextlost` in `src/` | Same reason; highest value-per-line item in the perf doc. |
| **PMTiles extrusion opacity `0.45`** vs your stated 0.35–0.4 and CLAUDE.md's `0.35` | `page.tsx:4139` | Founder-visible value, identical at baseline. Needs sign-off, not a silent edit. |
| **CLAUDE.md palette drift (BUG-031)** — doc table matches neither tree | `CLAUDE.md` vs `page.tsx:291-306` | Governance item; canonical doc, founder ratification required. |
| **CLAUDE.md documents drone mode as live** — including a smoke-test checklist item for the drone toggle | `CLAUDE.md` §"Навигация по карте" and §SMOKE TEST | Same class of drift. The feature was removed by `6d02f28` on 2026-06-11. The doc should be updated to describe keyboard nav; that is a founder-doc edit. |
| **`ensureDistrictNamesLayer` cache is a check-then-fetch race** | `page.tsx:4296-4318` | Adjacent to the double-init defect above; fix them together. |

---

## Deliberate removals — not regressions, not restored

| Flow | What happened | Evidence |
|---|---|---|
| **MiniMap** | Removed **before** BASELINE — 0 render sites at `2d08560` already. The component file survives as dead code. | `163542f` (2026-05-31) *"feat: remove minimap dock, restore drone + sun controls to rails"*; `page.tsx:2249` *"MiniMap dock removed 2026-06-01 (founder spec)"*. Dead file = **BUG-029**. |
| **Drone mode** | Added `3bac358` → reverted same day `6e87fd4` → removed entirely `6d02f28` → replaced by always-on keyboard nav `be1bac2` + `b142ce1` + `40060d8`. `DroneHUD.tsx` (507 lines) and `drone-controls.ts` (286 lines) deleted. | `docs/research/drone-fps-postmortem-2026-06-11.md` |

Restoring either would revert a documented founder decision, so both are reported only.

### Naming discrepancies

- **"Calculator v4.0" does not exist** in any branch or commit. The lineage is v5.0 (`5083e42`)
  → v6.0 (spec `32fa932`, sprints `55de57b` … `5e97e78`). The component live on `/parcels/map`
  is `src/app/parcels/map/FeasibilityCalculator.tsx` (v5-era). `FeasibilityV6Calculator.tsx`
  exists but is dark: `IS_FEASIBILITY_V6_ENABLED` defaults false
  (`src/lib/feasibility-v6/featureFlag.ts:24-25`), matching full-audit **D-3**. Audited the live
  v5 calculator's PDF paths — all intact.
- **"9 land use categories"** — CLAUDE.md now approves **10**; INVESTMENT was added 2026-06-03
  and is present in the code (3 refs). No category was removed.

---

## What still needs manual verification

Nothing below was exercised. In priority order:

1. **P0 1.25** — open the parcels list with an empty search. Confirm the row count matches the
   header. Then confirm a `VAULT_PRIVATE` parcel appears under its own group. *If the list is
   still empty, log one item from `/api/parcels/map` and check the `status` field is present on
   the wire* — the whitelist was a proven defect, but I could not confirm it was the only one.
2. **P0 1.1** — select a vault plot, then a listing from the bottom carousel. Assert
   `document.querySelectorAll('aside').length === 1` throughout. Close it and assert
   `document.elementFromPoint(innerWidth - 60, innerHeight / 2).tagName === 'CANVAS'`.
3. **P0 1.1 animation** — confirm the panel now *slides* rather than snapping, in both directions,
   at desktop and < 640 px.
4. **P0 2.2** — Find plot with a known-good number (map flies, drawer opens ~2 s later); with a
   bad number (explicit `No plot found for "…"`); and with `prefers-reduced-motion: reduce` set,
   where the camera should now jump rather than do nothing.
5. **Console** — cold-load `/parcels/map` in production and confirm the console is clean. Then
   reload with `?debug=1` and confirm the full `[ZAAHI]`/`[BUILDINGS]`/`[GLB]` trace returns.
6. **Regression sweep** — CLAUDE.md's SMOKE TEST checklist, skipping its drone-mode line (that
   control no longer exists).

---

## Gates

Run before each of the three commits, all green:

```
tsc --noEmit -p tsconfig.json     exit 0
next build                        exit 0   (291/291 static pages)
eslint src/                       exit 0   12 warnings, 0 errors
```

Lint warnings went **13 → 12** vs `main`; `page.tsx` holds at 4, unchanged. The mutex added
`openParcelPanel`/`openVaultPanel` to two existing `exhaustive-deps` warnings and introduced a new
one on the `mapControls` `useMemo`, which was closed by adding both (stable `useCallback([])`
identities) to its dependency array rather than left as new noise.

**Not run:** any smoke test. No dev server was started and no database query was issued — see the
note at the top.
