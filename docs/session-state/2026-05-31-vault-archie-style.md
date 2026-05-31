# Session state — 2026-05-31 (vault refactor + Archie + style unification)

Generated end-of-session by the agent. Snapshot of what shipped, what
the production tree looks like, and what's deferred. Read this first
on the next session before touching anything.

## Health

| Probe | Result |
|---|---|
| `git status --short` | clean of code changes; only `.gitignore` (M) + a pile of untracked `data/`, `docs/research/3d-buildings-pilot/`, screenshots — preexisting noise, none of it on this session's touch list |
| `pnpm exec tsc --noEmit` | ✅ rc=0 |
| `pnpm build` | ✅ rc=0; `/parcels/map` page weighs **506 kB / 1.1 MB** First-Load JS |
| Vercel auto-deploy from `main` | active — each push in this session deployed to `zaahi.io` |
| `main` HEAD | `6333982` — `fix: seed-6458042 projection DLTM not UTM-40N (MAJAN location)` |

## Commits landed this session (newest → oldest)

```
6333982 fix: seed-6458042 projection DLTM not UTM-40N (MAJAN location)
757313c fix: symmetric PMTiles exclusion (no white holes either direction)
e37c3de fix: plot nav arrows follow active set (listings/PPV by lock)
8ab6c6e fix: hover dedup + hide on sidepanel + remove per-plot refresh
3c38519 fix: vault add (+) no reload + no duplicate hover popup
d2f75c3 feat: add-to-vault (+) on all hover cards, plot prefilled
82d26dc fix: vault-only PMTiles fallback (no white holes) + privacy exclusion + no dim
fee9885 feat: PPV hidden by default v2 (conflict markers gated)
37ce8db fix: improve text readability/contrast on glass panels
1290c3e feat: unify auxiliary pages + cleanup (Step 4-5)
21b85e4 feat: unify modals style (Step 3)
edfecf0 feat: unify P0 pages style (Step 2)
af6b08d feat: design tokens + Panel/ChromeBtn (style unification Step 1)
2765e80 feat: archie chat unified style + mobile + draggable launcher
8eaefdf fix: archie open_plot shape + vault routing
```

Pre-session HEAD was `4b64ebe docs: session state snapshot for 2026-05-31`
(see prior snapshot in the same dir for what came before). Three Archie
commits before that (`37b0e66`, `2232f35`, `8907cf2`) shipped the
Phase 2 OpenAI client earlier the same day and are referenced below.

## Branch hygiene

All 12 feature branches created this session are fully merged into
`main` (0 commits ahead of main). Locally:

```
feat/archie-chat-style-mobile-drag
feat/archie-openplot-fix
feat/fix-6458042-projection
feat/hover-refresh-fix
feat/plot-nav-fix
feat/style-unification-v2
feat/text-contrast-fix
feat/vault-add-button
feat/vault-add-button-fix
feat/vault-hidden-by-default-v2
feat/vault-pmtiles-fix
feat/vault-pmtiles-symmetric
```

Safe to delete locally + on origin. Existing pre-session
`feat/style-unification` (from 2026-05-29) is a stale parallel
attempt — was deliberately routed around with the `-v2` suffix this
session. Also safe to retire.

`origin` has **64** non-main branches in total. The whole list is
worth a sweep — the `drafts/investor-package-*` family alone is 6
branches.

## What shipped — by area

### Vault (PPV — Private Plot Vault)

End-to-end flow now reads as one product surface, not three (the
unified Phase 3 rendering from before this session, plus the
behaviour the lock has now):

| Feature | Where | Status |
|---|---|---|
| **Lock OFF default**: only public listings render | `buildZaahiFilter` → `["!=", isVault, true]` | ✅ |
| **Lock ON**: only caller's VAULT_PRIVATE plots render, PMTiles dimmed | direction filter flip + `[vaultOnlyMode]` useEffect | ✅ |
| **Symmetric PMTiles fallback**: whichever side ZAAHI hides, PMTiles paints as background — no white holes either way | `applyZaahiExclusionToTileLayers` reads vaultOnlyModeRef and switches between `vaultPnSet` / `listingsPnSet` | ✅ |
| **lazy-init from localStorage**: lock state + ref both load from `zaahi-vault-only-mode` at first render so reload-in-vault-mode has no flash | `loadVaultOnlyMode()` helper + `useState(loadVaultOnlyMode)` + `useRef(loadVaultOnlyMode())` | ✅ |
| **Conflict markers gated** on lock — never floats in empty air | `layout.visibility` + `[vaultOnlyMode]` useEffect | ✅ |
| **Click routing** isVault → `VaultSidePanelAdapter` (owner mode), else public `SidePanel` | ZAAHI_PLOTS_FILL click handler | ✅ |
| **Add to Vault (+) button** on ALL hover cards (ZAAHI listings + PMTiles DDA plots) | `VaultAddButton` component + `openVaultWizardWith(plotNumber)` helper | ✅ |
| **Plot prefilled in wizard** — Step 1 auto-runs the DDA lookup | `AddPlotWizard.initialPlotNumber` + Step1 mount-only `useEffect` | ✅ |
| **Server-side dup handling**: existing vault entry → "Already in vault" toast | unchanged — `/api/me/vault/plot-lookup` `existing` short-circuit | ✅ |
| **Hover dedup**: ZAAHI > vault-shared > PMTiles + native boundary popup also killed when JSX hover fires | `queryRenderedFeatures` priority checks + `popupRef.current?.remove()` in each JSX handler | ✅ |
| **Hover hidden when SidePanel open** | JSX gate `!selectedParcelId && !selectedVaultEntry` + auto-clear useEffect | ✅ |
| **Plot nav ◀ ▶ pill follows active set** — listings in OFF, PPV in ON; flips index to 0 of new set on lock toggle | `ParcelsNav` activeSet useMemo + branch on target.isVault | ✅ |

### Routes (POST/GET sites of the vault flow)

```
src/app/api/me/vault/conflicts/{,[plotNumber]}/route.ts
src/app/api/me/vault/entries/route.ts
src/app/api/me/vault/entries/[id]/route.ts
src/app/api/me/vault/entries/[id]/promote/route.ts
src/app/api/me/vault/entries/[id]/shares/route.ts
src/app/api/me/vault/map/route.ts
src/app/api/me/vault/plot-lookup/route.ts
src/app/api/me/vault/shares/[id]/revoke/route.ts
src/app/api/vault/entries/[id]/route.ts                   (public read view)
src/app/api/vault/shared-with-me/route.ts
src/app/api/vault/shared-with-me/map/route.ts
src/app/api/vault/shared-with-me/[id]/import/route.ts
```

### Components

```
src/app/vault/page.tsx                       (top-level /vault route)
src/app/vault/VaultListView.tsx              (table view)
src/app/vault/VaultListItem.tsx              (row + delete confirm)
src/app/vault/AttributionBadge.tsx
src/app/vault/ConflictsTab.tsx
src/app/vault/EmptyState.tsx
src/app/vault/PriceEditCell.tsx
src/app/vault/PriceHistoryDropdown.tsx
src/app/parcels/map/AddPlotWizard/{index,Step1PlotLookup,Step2Details,Step3Confirm}.tsx
src/app/parcels/map/AddPlotWizardModal.tsx
src/app/parcels/map/AddPlotChooser.tsx
src/app/parcels/map/VaultSidePanelAdapter.tsx
src/app/parcels/map/ShareModal.tsx
src/app/parcels/map/PromoteToPublicModal.tsx
src/app/parcels/map/ConflictDetailModal.tsx
```

### Archie (assistant)

| Element | Detail |
|---|---|
| Model | `gpt-4o` (Phase 2 server-side call) |
| Endpoint | `POST /api/archie` (dispatch loop) + `GET /api/archie/resolve-district` |
| Tools (6) | `fly_to_district`, `open_plot`, `highlight_plot`, `filter_by_land_use`, `filter_by_status`, `toggle_vault_only` |
| Client | `src/app/parcels/map/ArchibaldChat.tsx` (557 → ~750 lines after style + drag + mobile) |
| Map bridge | `src/lib/archie-tools.ts` (`MapControls` interface, `executeArchieTool`) |
| `open_plot` correctness | both fixes landed this session — `searchPlot` shape mismatch + vault routing (`openVaultEntry`) |
| Map control wiring | `mapControls` useMemo with stable identity passed through `<ArchibaldChat mapControls=…/>` |
| UI | unified glassmorphism header (Georgia uppercase), Mobile bottom-sheet ≤640px (full-width, safe-area, anti iOS-zoom 16px input), Desktop draggable launcher with 8px threshold + `zaahi-archie-launcher-pos` localStorage + 4-quadrant chat window anchor |
| Composability with vault direction | `buildZaahiFilter` folds Archie filters (landUse + status) on top of vault direction via `["all", …]` — verified by hand in `/parcels/map`, no integration test |

### Style unification (5 steps, all merged)

Step 1 — foundation only (new files):
- `src/lib/design-tokens.ts` (PANEL_*, INPUT_*, CHROME_BTN_*, GOLD_*, BG_GRADIENT, HEADING_*, TRANSITION_FAST)
- `src/components/Panel.tsx` (forwardRef glass wrapper)
- `src/components/ChromeBtn.tsx` (extracted from page.tsx)

Step 2 — P0 pages (6 files): SidePanel, Dashboard, root auth (visual
only — auth flow untouched), Vault list view, VaultListItem, Deal
[id] page.

Step 3 — modals (15 files): all the BG_DEEP / BG_GLASS-cluster
modals (Promote / Share / Conflict / AddPlotChooser / WizardModal /
3 Wizard steps), the standalone modals (AddPlot / Offer / Terms /
WelcomeTour), both Feasibility calculators (map + preview), and
SignOutButton.

Step 4 — auxiliary (10 files): refer, check-plot, reset-password,
MapPreview, BuildingCard, SunTimeSlider, LegalNavbar, ParcelCard h3,
register/styles.ts, admin/queue/styles.ts; plus PdfProgressBar,
HeroBuildingsDevPanel, FieldLabel cleanup.

Step 5 — cleanup: deleted dead `src/components/CatChat.tsx`.

Text contrast pass (`37ce8db`) followed Step 5 after the founder
called out unreadable labels on the Layers panel — `TXT_DIM` bumped
0.7 → 0.85, `TXT_FAINT` 0.4 → 0.65, new `TXT_ICON` 0.7; specific
opacities in the Layers panel headers / counts / titles raised in
lock-step.

## CLAUDE.md invariant probes

| Invariant | Probe | State |
|---|---|---|
| `/api/layers/*` public | `src/middleware.ts:44` — `PUBLIC_READS.has(method) && pathname.startsWith('/api/layers/')` returns next | ✅ |
| Public API allow-list still tiny | `PUBLIC_API = […]` at middleware:24 (visual only — was tiny last we checked) | ✅ |
| `src/app/page.tsx` auth flow intact | `signInWithPassword` + `signOut` + `setPending` + `router.replace('/parcels/map')` all present, only visual styling changed this session | ✅ |
| `fill-extrusion-opacity` literal number (not array) | 4 hits, all literal (1, 1, 0.45, 0.55) — no data expressions | ✅ |
| `ZAAHI_LANDUSE_COLOR` 9 categories | all 9 categories present at `page.tsx:253`, same map in `SidePanel.tsx`, same legend at `page.tsx:4789` | ✅ (see note below) |
| Signature 3-tier 3D (podium / body / crown) | `emitSignatureTiers` imported from `src/lib/zaahi-3d-tiers`, `scaleRingFromCentroid` helper present, comments document the ≤4 / 5-10 / >10 floors thresholds | ✅ |
| `AffectionPlan` append-only | seed-6458042 still uses `.create()`; no `deleteMany` introduced | ✅ |
| LOCK-8 (`Parcel.ownerId` immutable) | upsert in `seed-6458042` reuses existing row via `update` block that does NOT touch `ownerId` or `verifiedOwnerUserId`; `ensureVaultPrivateParcel` similarly reuses, does NOT mutate ownership | ✅ |

### Note on land-use colours

The `ZAAHI_LANDUSE_COLOR` constant in code uses a different palette
than the table in CLAUDE.md's "Цвета по Land Use" section.

Example: code says `RESIDENTIAL: "#2D6A4F"` (green), CLAUDE.md table
says Residential `#FFD700` (yellow). All 9 categories drift. The 3
in-code sources (`page.tsx`, `SidePanel.tsx`, legend) are internally
consistent — i.e. the codebase is self-consistent, but CLAUDE.md
documentation is stale.

CLAUDE.md itself says:
> Source-of-truth in code: `ZAAHI_LANDUSE_COLOR` in
> `src/app/parcels/map/page.tsx` … CLAUDE.md is the human-readable
> source of truth — code is the machine-readable one.

So the actual rendered colours follow the code. The CLAUDE.md table
needs a refresh to match. **Not a regression from this session** —
the drift predates it.

### Note on the auth page tabs

CLAUDE.md says:
> The auth page at `src/app/page.tsx` MUST keep both tabs as
> `(['signin', 'signup'] as Mode[]).map(...)` …

The current page is sign-in-only (`// Sign In only — no tabs needed`
at line 255). This is intentional: the **Cohort Pilot v1**
(approved 2026-05-07, documented in CLAUDE.md itself) retired the
public sign-up path in favour of `/register` with admin approval.
The CLAUDE.md two-tabs sentence is outdated relative to its own
Cohort Pilot section.

## Deferred / open

| Item | Where it stands | Notes |
|---|---|---|
| Admin-side bulk "Refresh from DDA" | not built. `triggerDdaFetch` + `DdaFetchProgress` left intact in `SidePanel.tsx` even though the per-plot button is gone (commit `8ab6c6e`) | new task — likely lives at `/admin/refresh-affection-plans` or as a CLI script |
| Vault navigation list doesn't refresh on add | `ParcelsNav` fetches `/api/parcels/map` once on mount. A wizard-driven add doesn't refresh until page reload | OK for now; founder confirmed out-of-scope when the nav fix landed |
| 64 stale branches on origin | full list visible via `git ls-remote --heads origin` — includes `drafts/investor-package-{v2-sunset,v3-equal,v4-final,v5-realistic,v7,monday,final}`, `research/*`, multiple `feat/*` from prior sessions | safe to prune via `git push origin --delete <branch>` per founder discretion |
| CLAUDE.md drift (land-use palette + auth page tabs) | content quoted above. CLAUDE.md is the human-readable source of truth per its own spec; needs a manual refresh | low-priority — it doesn't change behaviour, just confuses future readers |
| Shared-vault popup over PMTiles cards (corner case) | `vaultMove` handler now defers to ZAAHI via `queryRenderedFeatures` and sets `setDdaLandHover(null)`, but there's no symmetric "kill native boundary popup" since the vault hover is itself a JSX surface — handled |
| Phase 2 audio MP3s missing | `public/audio/ambient.mp3` = 0 bytes; `ambient2.mp3` absent | known since 2026-04-15, not touched this session |
| Hospital plot 6854566 | left on single-block render per the 2026-04-15 decision | unchanged |

## Production state

- `zaahi.io` — auto-deployed from `main`, last visible HEAD is `6333982`
- Database: prod Supabase (Frankfurt). Plot 6458042's geometry was
  refreshed via `npx tsx -r dotenv/config scripts/seed-6458042.ts
  dotenv_config_path=/tmp/.env.prod` at the end of session. New
  centroid `55.313536, 25.088259` (MAJAN, Dubai). `status=LISTED`
  retained, `currentValuation` preserved.
- New `AffectionPlan` row appended for that plot (id
  `cmptx5qvl0001qdpy7n64wa1q`). Prior rows kept (append-only).
- `/tmp/.env.prod` was created during the seed run; founder may want
  to `rm /tmp/.env.prod` for security hygiene (the file contains
  full production env vars in plaintext).

## Suggested next-session entry points

1. **Founder visual review on `zaahi.io`** of the full lock-flip
   matrix — both directions × DDA Land Plots on/off — and a quick
   check that Plot 6458042 lands on MAJAN, not the Gulf of Oman.
2. **Branch cleanup** if founder wants — about 64 stale branches on
   origin; quickest win is `git push origin --delete` on the
   `drafts/investor-package-*` cluster + this session's now-merged
   `feat/*` branches.
3. **CLAUDE.md refresh** for the land-use palette and the auth-tabs
   sentence — purely documentation work; behaviour is fine.
4. **Admin bulk-refresh tool** for affection plans (the deferred
   side of the `8ab6c6e` per-plot button removal).
5. **Anything new** — current code is stable, tsc clean, build clean.
