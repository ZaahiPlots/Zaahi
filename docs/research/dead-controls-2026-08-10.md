# Dead / broken interactive controls — inventory

**Date:** 2026-08-10 · **Branch:** `fix/dead-controls-2026-08-10` · **Base:** `main` @ `e5300af`
**Phase A — inventory only. No control was fixed.**

Rule applied throughout: no element is called WORKS without a file path + line proving it. Anything I could not prove statically is **NEEDS BROWSER**, not "works".

---

## Counts

| Class | Count | Meaning |
|---|---:|---|
| **BROKEN** | **2** | handler/target exists but provably fails (401 / 404) |
| **DEAD** | **4** | no handler — but all 4 are in a component with zero importers (never mounts) |
| **STUB** | **15** | inert by design, sitting under an explicit "Coming Soon" banner or disabled |
| **NEEDS BROWSER** | **~440** | statically wired (handler present, target resolves); runtime behaviour unproven |
| **UNKNOWN** | **0** | — |

Interactive surface measured: 66 files · 176 `<button>` · 266 `onClick` · 28 `<Link>` · 20 `<a>` · 225 `onChange` · 5 `<form onSubmit>` · 109 `input/select/textarea`.

---

## BROKEN — 2

Both are in the same file, in the same button row, and both were introduced as plain server-rendered links on a page that is reachable from the dashboard (`src/app/dashboard/page.tsx` links to `/parcels/${p.id}` and `/parcels/${f.parcel.id}`).

### B1 · "Download Official PDF" → guaranteed 401

**`src/app/parcels/[id]/page.tsx:54-61`**

```tsx
<a
  href={`/api/parcels/${parcel.id}/pdf`}
  target="_blank"
  rel="noreferrer"
  className="text-xs px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
>
  Download Official PDF
</a>
```

**Proof it fails:**
- `src/app/api/parcels/[id]/pdf/route.ts:10` — `const userId = await getApprovedUserId(req);` → the route is auth-gated.
- `src/middleware.ts:47-50` — any `/api/*` request without an `Authorization: Bearer` header returns `401 {"error":"unauthorized"}`. `/api/parcels/*` is not in `PUBLIC_API` and is not `/api/layers/*`.
- A plain `<a href>` navigation cannot attach a Bearer token. The browser sends no `Authorization` header.
- **`src/lib/download.ts:7-9` documents this exact failure mode verbatim:** *"Plain `<a href="/api/...">` doesn't work for any endpoint that goes through `getApprovedUserId(req)` — the browser sends the request without an Authorization header and the middleware returns 401."*

The repo already contains the fix: `downloadFile(url, filename)` at `src/lib/download.ts:18`, which routes through `apiFetch` and triggers a native save dialog. This callsite never adopted it.

**Blast radius:** every user who opens any plot detail page and clicks Download Official PDF gets a blank tab / 401 JSON.

### B2 · "Open in 3D →" → 404, route does not exist

**`src/app/parcels/[id]/page.tsx:63-68`**

```tsx
{has3d && (
  <Link
    href={`/parcels/${parcel.id}/3d`}
    className="text-xs px-3 py-1 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400"
  >
    Open in 3D →
  </Link>
)}
```

**Proof it fails:** the only route directory under `src/app/parcels/[id]/` is `feasibility/`. Full enumeration of page routes under `src/app/parcels`:

```
src/app/parcels/check-plot/page.tsx
src/app/parcels/[id]/feasibility/page.tsx
src/app/parcels/[id]/page.tsx
src/app/parcels/map/page.tsx
src/app/parcels/new/page.tsx
```

There is **no `src/app/parcels/[id]/3d/page.tsx`**. The link renders a prominent amber CTA and navigates to a 404.

**Render condition:** `has3d` is `plan?.maxFloors != null && buildingGeom != null` (`src/app/parcels/[id]/page.tsx:28`) — so it only appears for plots that have both a floor count and a building-limit geometry. It is not always visible, but when it is visible it is always broken.

---

## DEAD — 4 (all in a component that never mounts)

### D1–D4 · `src/components/Navbar.tsx:8-11` — four `href="#"` links

```tsx
<li><a href="#" className="text-white hover:text-gray-300">Dashboard</a></li>   // :8
<li><a href="#" className="text-white hover:text-gray-300">Parcels</a></li>     // :9
<li><a href="#" className="text-white hover:text-gray-300">Listings</a></li>    // :10
<li><a href="#" className="text-white hover:text-gray-300">Deals</a></li>       // :11
```

`href="#"` scrolls to top and does nothing else. All four targets exist as real routes (`/dashboard`, `/parcels/map`, `/deals`, and a listings surface), so these are unwired links, not missing pages.

**However — this component is imported by nothing.** Proof:

```
$ grep -rn "Navbar" src/ --include='*.tsx' | grep -v "LegalNavbar" | grep -v "^src/components/Navbar.tsx"
(no output)
```

`LegalNavbar` (a different component, `src/components/LegalNavbar.tsx`) is the one actually mounted, by `terms`, `disclaimer`, `privacy`, and `refer`. So `Navbar.tsx` never renders and **no user can encounter these four dead links today.**

Classification note: these satisfy "DEAD (no handler)" structurally but fail the task's framing of "renders but does nothing" — they do not render. The correct Phase B action is almost certainly **delete the file**, not wire up four links into a nav nobody mounts. Flagging for your decision rather than assuming.

---

## STUB — 15 (inert by design)

The dashboard is disciplined about this: seven `ComingSoonBanner` declarations (`src/app/dashboard/page.tsx:568, 1248, 1385, 1491, 1530, 1712, 1910`) label each unfinished section. These are listed for completeness, not as defects.

| # | Element | Location | Why STUB |
|---|---|---|---|
| S1 | `<GoldBtn>Upload Document</GoldBtn>` | `src/app/dashboard/page.tsx:1489` | `GoldBtn`'s `onClick` is optional (`:416`) and is **omitted here**. Covered by the banner at `:1491` which names "upload" explicitly. ⚠️ **See caveat below.** |
| S2 | `<ActionBtn>Download</ActionBtn>` | `src/app/dashboard/page.tsx:1508` | `ActionBtn` (`:1275`) has **no `onClick` in its prop signature at all** — `{ children, danger }`. Banner at `:1491` states the list is "illustrative placeholder data". |
| S3 | `<ActionBtn danger>Delete</ActionBtn>` | `src/app/dashboard/page.tsx:1509` | same as S2 |
| S4–S5 | Email / Push checkboxes, ×5 rows | `src/app/dashboard/page.tsx:1723-1724` | banner `:1712`: *"Preferences toggles below are UI-only."* Two `<input type="checkbox" defaultChecked>` inside a `.map` over 5 event types. |
| S6–S8 | Zoom input, Style select, Default mode select | `src/app/dashboard/page.tsx:1900-1906` | banner `:1910`: *"Map defaults, language/currency switching live in UI but aren't wired yet — Phase 2."* |
| S9–S10 | "Export My Data (PDPL)", "Delete Account" | `src/app/dashboard/page.tsx:1930, 1936` | Honest stubs — each fires an `alert()` telling the user to email `privacy@zaahi.io`. They communicate, so not silent. |
| S11–S15 | 5 × "Soon" emirate rows (Sharjah, RAK, Ajman, Fujairah, UAQ) | `src/app/parcels/map/page.tsx:1519-1523` | `comingSoon: true`; comment at `:1516-1518` — *"UI-only 'Soon' rows… the toggle is disabled and excluded from on/total counts."* |

**Caveat on S1 (`Upload Document`):** unlike every other stub here, this one has **no inert affordance**. It renders at full CTA strength — `background: GOLD_CTA`, `color: white`, `cursor: "pointer"` (`src/app/dashboard/page.tsx:423, 424, 429`) — because `disabled` is also omitted. `GoldBtn` already supports a `disabled` prop (`:416`) that paints the muted/`not-allowed` state. Clicking it is a silent no-op with zero feedback. It is STUB by intent but reads as DEAD to a user. This is the one item in the STUB list I'd argue belongs in Phase B.

---

## Checks run, and what they proved

Every check below ran across **all** `src/**/*.tsx`, not a sample.

| Check | Result |
|---|---|
| `<button>` tags with no `onClick` / `type=submit` / other handler | **2 flagged**, of which 1 was a false positive (`src/components/ChromeBtn.tsx:24` — the match is inside the JSDoc block; the real tag passes `onClick={onClick}` at `:137`). Real hit: `ActionBtn` (`src/app/dashboard/page.tsx:1276`). |
| Empty handlers — `onClick={() => {}}`, `=> null`, `=> undefined` | **0** |
| Handlers that only `alert()` / `console.log()` | 2 — both intentional (S9, S10) |
| Every `fetch` / `apiFetch` target vs real routes in `src/app/api/**` | **64 targets, 63 matched, 0 dangling.** The single non-match (`/api/deals/${dealId}/messages${since…}`) is an artifact of my extraction regex truncating a template literal; the route exists at `src/app/api/deals/[id]/messages/route.ts`. |
| Every `href` (literal **and** template-literal) vs real page routes | **34 distinct hrefs; 1 dangling** → B2 `/parcels/[id]/3d`. |
| Direct `/api/` navigations that bypass `apiFetch` (would 401) | **1** → B1. |
| Components declaring an **optional** `onClick`, used without one | 2 declared (`ChromeBtn:62`, `GoldBtn:416`). All **20** `ChromeBtn` callsites pass `onClick` or `href` (audited individually). 1 `GoldBtn` callsite omits it → S1. |
| Elements styled `cursor: pointer` with no handler (look clickable, aren't) | **7 flagged, 0 real.** 3 × `<summary>` (native `<details>` disclosure — `disclaimer:189`, `privacy:186`, `terms:182`); 3 × `<label>` wrapping an `<input>` (native activation — `AddPlotModal:837` also carries drag handlers, `Step1Basics:225` wraps a radio at `:236`, `Step3Review:145` wraps an input at `:155`); 1 × `<Card>` at `dashboard:1446` wrapped in `<Link href={/deals/${d.id}}>` at `:1445`. |
| `<form onSubmit>` missing `preventDefault` (page-reload bug) | **0 real.** 25 raw hits were the prop name `onSubmitted`. The one true candidate, `src/app/parcels/map/page.tsx:7579 onSubmit={doFind}`, is a **prop passed to `<FindLauncher>`**, not a form attribute — `FindLauncher` has no `<form>` and calls `e.preventDefault()` in its `onKeyDown` at `:7801`. |
| TypeScript strict, `tsc --noEmit` | **0 errors** — so no `onClick={someUndefinedFn}` can exist anywhere in the tree. This is what lets me rule out the entire "handler references a missing function" class without inspecting 266 handlers by hand. |

---

## What I did NOT verify — ~440 controls

Roughly 440 control sites passed every automated failure-class check above: a handler is present, and its target resolves. **I am not calling them WORKS.** Static wiring does not prove runtime behaviour. Things that remain unproven and need a browser:

- whether a handler's API call returns 2xx with real session state (all my live probes were unauthenticated)
- whether a modal actually opens, a toggle actually repaints, a toast actually fires
- conditional render paths gated on data I did not have (e.g. admin queue tabs with pending rows, deal-room states, vault conflict banners)
- touch/mobile-only affordances
- anything behind `AuthGuard`

**Highest-value browser passes**, in order, if you want that gap closed: `/parcels/map` control rail and Layers panel (the densest surface — 39 `onClick` in one file), `/admin/queue` four detail panels (~33 buttons across `ApplicationDetail`, `PlotClaimDetail`, `TitleDeedDetail` and their lists), `/vault` list actions, `/deals/[id]` deal-room actions, and the 3-step `/register` flow.

---

## Adjacent findings (not controls — no action taken)

- **`src/components/Navbar.tsx` has 0 importers** — see D1–D4.
- **Doc/code drift:** `CLAUDE.md`'s smoke checklist says *"click on badge открывает /join#gold"*, but `LockBadge` (`src/app/parcels/map/page.tsx:7052-7056`) is now a non-interactive `<span>`, documented in-code as *"Non-interactive (the upgrade flow target was the now-removed /join page)"*. The code is self-consistent; the canonical doc is stale. **I did not touch `CLAUDE.md`** — canonical docs are out of scope per the constraints.
- **`/api/modules`** remains reachable with any syntactically valid Bearer string (no handler-level auth). Out of scope here — it is an endpoint, not a UI control — and already recorded in `~/agent-responses/zaahi-diagnostic-2026-08-10.md`.

---

## Proposed Phase B order (awaiting your go)

| Order | Item | File:line | Change | Risk |
|---|---|---|---|---|
| 1 | B1 Download Official PDF | `src/app/parcels/[id]/page.tsx:54-61` | swap the `<a>` for a client button calling `downloadFile()` from `src/lib/download.ts:18` | Low — helper already exists and is used elsewhere. Requires making this leaf a client component or extracting a small client child; the page is currently a server component. |
| 2 | B2 Open in 3D | `src/app/parcels/[id]/page.tsx:63-68` | **needs your decision** — remove the link, or point it at the existing `/parcels/[id]/feasibility`, or leave it pending a real `3d` route | Low to remove; needs product intent otherwise |
| 3 | S1 Upload Document | `src/app/dashboard/page.tsx:1489` | add `disabled` so the existing muted / `not-allowed` styling in `GoldBtn` applies — matches how every other stub in the file reads | Very low, presentational only |
| 4 | D1–D4 Navbar | `src/components/Navbar.tsx` | **needs your decision** — delete the unmounted file, or wire the 4 links if it is meant to ship | Low either way |

Items 2 and 4 are genuine product decisions, not mechanical fixes — I'd rather ask than guess. Items 1 and 3 I can do exactly as specified, one commit each.
