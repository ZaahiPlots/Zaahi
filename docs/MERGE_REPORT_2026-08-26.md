# ZAAHI — branch integration, 2026-08-26

**Base:** `main` @ `e5300af` · **Safety tag:** `pre-merge-2026-08-26` → `e5300af`
**Result:** `76add60` · 6 merge commits + 2 follow-ups
**Status: NOT PUSHED.** Gates are green; the smoke checklist has not been run —
see [Smoke checklist](#smoke-checklist-a-g--not-run).

---

## Preflight

| Check | Result |
|---|---|
| `git fetch --all --prune` | clean |
| `main == e5300af` | ✅ (`origin/main` identical) |
| Safety tag `pre-merge-2026-08-26` | created on `e5300af` |
| `fix/may-parity-2026-08-26` | ✅ on origin @ `25fd121` |
| `fix/plot-click-2026-08-19` | ✅ on origin @ `e004f5f` (= `552e708` + `e004f5f`, as specified) |
| `research/perf-2026-08-21` | ❌ **missing from origin** — stopped and reported |
| `fix/dead-controls-2026-08-10` | ✅ on origin @ `cbc750f`, contains `10b2ced` |
| `research/vault-conflict-fix` | ✅ on origin @ `c24657b` |
| `feat/landuse-archetypes` | ✅ on origin @ `4f8072f` |

`research/perf-2026-08-21` existed only locally at `c49f25c` (doc-only, 426 lines,
zero `src/` files). Per your direction it was pushed to origin first, then step 3's
doc-only path was followed. Not merged: `research/dda-tiles-v2`, `research/parcel-export`.

---

## Merge order and hashes

| # | Branch | Merge commit | Conflicts |
|---|---|---|---|
| 1 | `fix/may-parity-2026-08-26` | `84d7aae` | none |
| 2 | `fix/plot-click-2026-08-19` | `83ce50b` | **1 hunk** — `page.tsx` |
| 3 | `research/perf-2026-08-21` | `5d0a752` | none (doc only) |
| — | *implementation of perf items 1, 2, 5* | `78e6612` | — |
| 4 | `fix/dead-controls-2026-08-10` | `fbff650` | none |
| 5 | `research/vault-conflict-fix` | `61e717e` | none |
| 6 | `feat/landuse-archetypes` | `09d4306` | **1 hunk** — `page.tsx` |
| — | *palette follow-up* | `ee9a766` | — |
| — | *CLAUDE.md housekeeping* | `76add60` | — |

---

## Conflict hunks and how each was resolved

### Hunk 1 — merge 2, `src/app/parcels/map/page.tsx` (ZAAHI plot hover/click handlers)

Region: the `mousemove` / `mouseleave` / `click` bindings on `ZAAHI_PLOTS_FILL`.

- **HEAD (may-parity):** handlers nested inside an `if (...) { … }` block, using the new
  mutex calls `openVaultPanel(…)` / `openParcelPanel(…)`.
- **`fix/plot-click`:** handlers hoisted out of the `if` so they bind **unconditionally**
  (audit 1.17 — the guard was always false, so plot clicks silently did nothing), plus a
  new hover-priority block (`setDdaLandHover(null)`, `setVaultHover(null)`,
  `popupRef.current?.remove()`) that HEAD does not have. Uses the **old** setters
  `setSelectedVaultEntry` / `setSelectedParcelId`.

The two sides fix **orthogonal** defects: plot-click fixes handler *wiring*, may-parity
fixes panel *mutex logic*. Dropping either would reintroduce a shipped bug.

**Resolved:** took `fix/plot-click`'s structure wholesale (unconditional binding + the
hover-priority block — a strict superset of HEAD's body), then grafted may-parity's two
mutex calls back in over the old setters. Per your conflict rule: perf/structure wins on
handler wiring, may-parity wins on defect logic. Nothing dropped.

Verified after resolution: `grep setSelectedParcelId\|setSelectedVaultEntry` returns only
the 4 lines **inside** `openParcelPanel` / `openVaultPanel` themselves — every other call
site routes through the mutex.

**Follow-on caught in the same step:** `e004f5f` added a new
`console.log("[BUILDINGS] effect skipped — 0 buildings, nothing installed")` that the
may-parity log sweep had never seen. Per the rule ("may-parity wins on log removals") it
was gated to `debugLog` before the merge was committed.

### Hunk 2 — merge 6, `src/app/parcels/map/page.tsx` (archetype block vs conflict markers)

Region: immediately after the `ZAAHI_BUILDINGS_3D` layer definition.

- **HEAD (vault-conflict-fix, merge 5):** the new centroid-based conflict-marker source —
  `markerData` + `addSource(VAULT_CONFLICT_MARKERS_SRC)` / `setData` — which replaced the
  old per-vertex rendering.
- **`feat/landuse-archetypes`:** the archetype morphology block
  (`resolveArchetypeFlag`, `installArchetypeLayer`, LOD wiring), followed by the **stale**
  comment header for the conflict markers describing the pre-merge-5 design
  (*"Migrated off the old VAULT_MINE_SRC onto ZAAHI_PLOTS_SRC"*).

Both additions are independent, and the shared tail below the hunk
(`if (!map.getLayer(VAULT_CONFLICT_MARKERS_LAYER))`) references
`VAULT_CONFLICT_MARKERS_SRC` — i.e. it **depends on HEAD's block existing**.

**Resolved:** kept **both** — archetype block first, then HEAD's centroid marker source.
Dropped only the archetype side's trailing comment, because merge 5 had just replaced the
design it describes; HEAD's comment is the accurate one. No code from either side removed.

**Follow-on:** the archetype branch reintroduced **5** `console.log` calls
(`page.tsx` ×4 including one commented *"ALWAYS log … so flag activation is observable"*,
`src/lib/archetypes/archetype-layer.ts` ×1). All gated to `debugLog` per the conflict rule;
they remain observable via `?debug=1`, which suits a preview-gated feature.

**No hunk required guessing. Nothing was dropped from either side in either conflict.**

---

## Perf items implemented on the integration state (`78e6612`)

`research/perf-2026-08-21` carried the analysis only, so items 1, 2 and 5 of the doc were
implemented directly, per step 3's second path.

**Item 1 — first-mount guard on the `[baseMap]` effect.** React flushes passive effects in
hook-declaration order, and the map-init effect assigns `mapRef.current = map`
synchronously in its own body — so on the first commit this effect already saw a non-null
map and its `if (!map) return` could never fire. It called `setStyle` on the freshly built
map while the initial style was still loading; MapLibre has no style-equality shortcut, so
`_diffStyle` → `setState` → `_checkLoaded()` threw *"Style is not done loading."* and
MapLibre answered by rebuilding the style from scratch, re-running every loader.
Guarded with `baseMapInitRef`; `baseMap` only ever changes on a user click, so the mount
run has nothing to do.

**Item 2 — cursor readout extracted** to `src/app/parcels/map/MapCoordsReadout.tsx`, built
on the existing `MapZoomReadout` pattern (own listener + rAF loop, one span's
`textContent`). The page-level `cursor` state and its `map.on("mousemove", … setCursor)`
feeder are deleted. The handler built a fresh object per event so `Object.is` never
matched and React re-rendered the ~6,300-line `ParcelsMapPageInner` at pointer rate.
Writes go to a ref and the rAF loop does the DOM update, so updates are capped at one per
frame even when the pointer samples faster than the display refreshes.

**Item 5 — `webglcontextlost` / `webglcontextrestored`** registered on the map canvas in
the init effect, removed in its cleanup. `preventDefault()` on loss is what allows the
browser to fire the restore event at all. The restore path rebuilds style, the three
PMTiles sources, amenity icons, overlays, ZAAHI plots and the shared-vault overlay, reading
`baseMapRef` (the init effect has `[]` deps and would otherwise rebuild the mount-time
basemap). A fixed overlay tells the user *"MAP INTERRUPTED — The graphics context was lost.
Restoring…"* instead of leaving a blank canvas under interactive chrome.

Items 3 (delegated `queryRenderedFeatures` consolidation) and 4 (60 Hz `setPaintProperty`
pulse) were **not** implemented — the doc sequences them behind a Performance profile, and
they are not in this task's scope.

---

## Step 4 — `pnpm-workspace.yaml`

`10b2ced` arrived with merge 4 and brought the **tracked** config (real booleans) plus
`prisma generate` in the build script. There was no stray untracked stub left to delete —
it had already been removed from the working tree in the prior session, and `git status`
was clean immediately after the merge.

pnpm warnings confirmed gone:

```
$ pnpm install --frozen-lockfile
Already up to date
Done in 672ms using pnpm v11.21.0      exit 0
```

Both previous warnings are absent — `[WARN] The "pnpm" field in package.json is no longer
read by pnpm` (the dead `pnpm.onlyBuiltDependencies` field is removed) and
`ERR_PNPM_IGNORED_BUILDS`. `package.json` `build` is now `prisma generate && next build`,
and `pnpm build` completes green.

---

## Step 6 — land-use palette consistency

CLAUDE.md was updated (2026-06-15, founder sanction) to a ratified palette and explicitly
named the surfaces still carrying the April 2026-04-11 values. Audit of all four surfaces:

| Category | CLAUDE.md | `ZAAHI_LANDUSE_COLOR` | `filter-state.ts` (before) | `SidePanel.tsx` (before) |
|---|---|---|---|---|
| Residential | `#2D6A4F` | `#2D6A4F` | ❌ `#FFD700` | `#2D6A4F` |
| Commercial | `#1B3A5C` | `#1B3A5C` | `#1B3A5C` | `#1B3A5C` |
| Mixed Use | `#6B4C9A` | `#6B4C9A` | ❌ `#9B59B6` | `#6B4C9A` |
| Hotel | `#E8732A` | `#E8732A` | `#E8732A` | `#E8732A` |
| Industrial | `#495057` | `#495057` | ❌ `#708090` | `#495057` |
| Educational | `#0077B6` | `#0077B6` | ❌ `#1ABC9C` | `#0077B6` |
| Healthcare | `#E63946` | `#E63946` | ❌ `#E74C3C` | `#E63946` |
| Agricultural | `#606C38` | `#606C38` | ❌ `#6B8E23` | `#606C38` |
| Future Dev | `#A8926E` | `#A8926E` | ❌ `#84CC16` | ❌ `#C8A96E` |
| Investment | `#14B8A6` | `#14B8A6` | `#14B8A6` | `#14B8A6` |

**Map fill layers were already correct.** `filter-state.ts` carried the April palette for
**7 of 10** chips — so a filter chip's colour did not match the plot it filtered.
`SidePanel.tsx` carried the brand gold `#C8A96E` for Future Development, which CLAUDE.md
flags by name: sandstone must stay distinct from the gold used for district outlines.

Both aligned in `ee9a766` (a separate follow-up commit, not folded into the merge).
**All ten categories now agree across all four surfaces** — verified programmatically.

**Deferred:** `scripts/prepare-tiles.ts` still has `FUTURE_DEVELOPMENT: "#C8A96E"`.
CLAUDE.md says to change it only alongside a tile rebuild ("менять только при ребилде
тайлов"); no rebuild is in scope, so it is left as-is and remains the last drifted surface.

---

## Gates — integrated `main` @ `76add60`

| Gate | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` | **exit 0** |
| `pnpm build` (`prisma generate && next build`) | **exit 0** — 291/291 static pages |
| `eslint src/` | **exit 0** — 12 warnings, 0 errors |

Run after every merge step, not only at the end. Two fix-forwards were needed inside their
own steps (both log-gating, described above); no gate was left failing between steps.

### Invariants re-verified on the final tree

| Invariant | Result |
|---|---|
| `fill-extrusion-opacity` is a literal number, never an array | ✅ only `1` and `0.45` present; `0` array-valued occurrences |
| PMTiles `0.45` unchanged | ✅ untouched |
| ZAAHI listings opacity `1` | ✅ |
| `console.log` / `console.warn` in `src/` outside `debug.ts` | ✅ **0** |
| No plot deletions / DB writes | ✅ no DB access of any kind this session |
| No rebase / force-push / squash | ✅ 6 plain `--no-ff` merge commits, history preserved |
| 3D opacity values in CLAUDE.md | ✅ untouched, as instructed |

---

## Smoke checklist (a–g) — NOT RUN

Per your direction I did not run these; the script below is for you. **`main` is unpushed
until you report back.**

The blocker: `/parcels/map` is wrapped in `AuthGuard`, which redirects to `/` unless a
Supabase session exists with `user_metadata.approved === true`. I have no credentials, and
creating an account is a write you forbade.

| # | Check | Status |
|---|---|---|
| a | Parcels list row count == header count, every status filter | ⏳ not run |
| b | Find plot: found / not-found / geometryless / untrimmed input | ⏳ not run |
| c | Exactly one drawer open at a time from all five paths | ⏳ not run |
| d | `/api/parcels/map` once from the map page, metro once, single styledata rebuild | ⏳ not run — **see the note below** |
| e | Cursor readout works, no full-page re-render on mousemove | ⏳ not run |
| f | Console clean in production mode | ⏳ not run |
| g | `NEXT_PUBLIC_ZAAHI_DEBUG=true` re-enables gated logs | ⏳ not run |

### ⚠️ Expect **two** `/api/parcels/map` requests on check (d), not one

Static trace of the integrated tree, cold load:

| Caller | Fires on cold load? |
|---|---|
| `page.tsx:3387` inside `loadZaahiPlots`, called from the map-init `load` handler (`:4945`) | **yes — 1×** |
| `loadZaahiPlots` from the `[baseMap]` styledata handler (`:5599`) | **no** — mount guard (was the duplicate) |
| `loadZaahiPlots` from `webglcontextrestored` (`:5358`) | no — only on context loss |
| `loadZaahiPlots` from the archetypes toggle (`:1814`) / vault add (`:6112`) | no — user actions |
| `ParcelsNav.tsx:84` — its own independent fetch on mount | **yes — 1×** |
| `ParcelsPortalPanel.tsx:60` | no — gated on first panel open |
| `page.tsx:7970` (`doFind`) | no — user action |
| `MiniMap.tsx:210` | no — MiniMap is unmounted |

So **the map page's own loader fetches exactly once** (down from 2 — that is the mount-guard
win), but the total network count is **2** because `ParcelsNav` deliberately keeps a
separate fetch. Reaching a literal 1 means lifting that fetch to a shared parent, which is a
refactor excluded by this task's constraints. Treat (d) as **PASS at 2 requests, 1 from the
map loader**; flag it only if you see 3+, which would mean the mount guard regressed.

`attachOverlays` is now called once on cold load (`:4939`), so **metro loads once** ✅, and
the forced style rebuild is gone, so there should be **one** styledata pass ✅.

### The script

Run `pnpm dev`, sign in with an approved account, open `/parcels/map`. **Read-only
throughout** — no listing create/edit, no status change, no sign-up, no POST to
`/api/notify-admin` or any mutating endpoint.

**(d) first, on a cold load — do this before touching anything.**
1. DevTools → Network, filter `parcels/map`. Hard reload (Ctrl+Shift+R).
2. Expect **2** requests (see the note above). More than 2 → mount guard regressed.
3. Filter `layers/metro` → expect **1** (was 2).
4. Console: expect **no** `Unable to perform style diff … Rebuilding the style from scratch`.
   That warning appearing means the duplicate `setStyle` is back.
5. Watch the canvas: the basemap should paint promptly rather than staying blank for
   several seconds.

**(f) console clean.** Same cold load, production mode (`pnpm build && pnpm start`).
Expect **zero** `log`/`warn`. Then pan, zoom, switch basemap, open every panel, click a
plot. Still zero. Any `console.error` should correspond to a real failure.

**(g) debug gate.** Reload with `?debug=1` — the full `[ZAAHI]` / `[BUILDINGS]` / `[GLB]` /
`[ZAAHI archetypes]` trace should return. Or rebuild with
`NEXT_PUBLIC_ZAAHI_DEBUG=true`. Drop the flag → silent again.

**(a) list vs header.** Open the parcels list (bottom carousel centre). With an **empty**
search, count rendered rows and compare to the header `Parcels (N)`. They must be equal —
this was the P0 1.25 failure, where the body dropped every row whose status was not one of
three hardcoded values while the header still counted them. Confirm a `VAULT_PRIVATE`
parcel appears under its own group. Then each status filter in turn; every row must land in
a group. Empty state copy should read `No parcels match "<query>"` when searching and
`No parcels available` when not.

**(b) Find plot.** Toolbar 🔍:
- known-good plot number → map flies, drawer opens ~2 s later;
- nonsense number → explicit `No plot found for "<x>"`, field stays open;
- plot with no polygon → `Plot <x> has no mapped boundary` (distinct from not-found);
- valid number with **leading/trailing spaces** → still found;
- with OS "reduce motion" on → camera should now **jump** to the plot rather than do
  nothing (`essential: true` was missing).

**(c) one drawer at a time.** After each of these, run
`document.querySelectorAll('aside').length` — must be **1**:
map plot click · bottom carousel ◀ ▶ · parcels-list row · hover-card click · Archie
`openParcel` / `openVaultEntry`. Critical case: open a **vault** plot, then a **listing**
from the carousel — previously both drawers mounted and tiled across ~85% of the viewport.
Close the drawer, then confirm the map is live again:
`document.elementFromPoint(innerWidth - 60, innerHeight/2).tagName === 'CANVAS'`.
Also confirm the panel now **slides** rather than snapping, both directions, desktop and
< 640 px.

**(e) no re-render on mousemove.** React DevTools → Profiler → "Highlight updates when
components render". Move the cursor across the map for ~10 s. The lat/lng readout must keep
updating while **no** component highlight fires. Any highlight on the page root means the
extraction regressed. Optionally record 10 s in the Profiler: commit count should be ~0.

---

## Deferred / not done

| Item | Why |
|---|---|
| Smoke checklist a–g | Needs an approved session; no credentials, and account creation is a write you forbade. `main` left unpushed. |
| `scripts/prepare-tiles.ts` FutureDev `#C8A96E` | CLAUDE.md: change only alongside a tile rebuild. Last drifted palette surface. |
| `/api/parcels/map` down to 1 request | Needs `ParcelsNav`'s independent fetch lifted to a shared parent — a refactor, excluded by constraints. |
| perf doc items 3 and 4 | Delegated-listener consolidation and the 60 Hz `setPaintProperty` pulse; the doc sequences both behind a Performance profile. |
| `research/dda-tiles-v2`, `research/parcel-export` | Excluded by instruction. dda-tiles-v2 is blocked on an unbuilt `dda-land-v2.pmtiles`. |
| Branch deletion | None deleted, as instructed. |

## Rollback

`git reset --hard pre-merge-2026-08-26` returns `main` to `e5300af`. Nothing has been
pushed, so no remote state depends on any of this.
