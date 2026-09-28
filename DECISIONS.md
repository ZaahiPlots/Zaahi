# ZAAHI — Decision Log
Здесь агент записывает все архитектурные решения.

- **2026-09-26** — Vault DDA lookup, two follow-on branches after the
  token-restore Phase A stop (above didn't ship in this file yet — see
  `docs/agent-log/2026-09-26-dda-token-restore.md`):
  1. `fix/vault-dda-lookup-errors` (PR #7): `fetchDdaPlotByNumber` /
     `fetchFullDdaData` now return `hit | not_found | unavailable` instead of
     `T | null`, so a DDA 499 error body can't be misread as "plot doesn't
     exist" again. Wizard shows "DDA lookup is unavailable" instead of "This
     plot isn't in DDA" on a real outage. Same fix in `seed-dda`,
     `parcels/submit`, `parcel-create.ts`. Test: `scripts/dda-plot-lookup-error-handling.test.ts`.
  2. `feat/vault-local-plot-fallback` (off #7): added a third lookup step
     between the Parcel table and live DDA — `lookupStoredDdaPlot`, reading
     `data/dda-plot-index.json` (new, ~9.8 MB, committed — built by
     `scripts/build-dda-plot-index.ts` from the 206 already-public
     `data/layers/dda/*.geojson` files, 99,126 Dubai plots, enriched with
     land use baked in from the gitignored `docs/research/data-dubai/raw/land_registry.json`
     dump so that 233 MB file itself never ships). Confirmed plot 6489099 is
     a real, active DDA plot (Dubai Land Residence Complex, Hospitality/Hotel)
     via live tokenless PlotInfo — independent of the BASIC_LAND_BASE wall.
     Noted: the stored land-use classification (from land_registry.json) can
     be coarser/staler than DDA's live zoning (6489099: stored says
     "Commercial", live PlotInfo says "Hospitality: Hotel") — surfaced via a
     dated "from ZAAHI stored DDA data" note in the wizard, not silently
     trusted. Test: `scripts/dda-stored-plot-lookup.test.ts`.
  Preview screenshots for both branches not taken — needs a signed-in
  session and the Vercel preview isn't a local dev host (credential-entry
  rule); founder decision open on how to get one. Full log:
  `docs/agent-log/2026-09-26-vault-local-fallback.md`.

## 2026-09-28 — map UX batch 1 (`fix/map-ux-batch-1`)
- DONE: (1) filter range no longer swaps/rewrites min/max while typing — `DualRange` (FilterPanel.tsx) keeps local text, validates on blur/Enter, flags min>max (not applied, not swapped). (2) sun-time slider + dock button + Archie `sun_slider` action removed; light fixed at the 08:15 default. (3) hover card: land-use subtype (DDA tile prop `subLandUse`; ZAAHI/vault from `landUseMix` when a single category), plan Issued/Expires rows; `/api/parcels/map` + `/api/vault/shared-with-me/map` now also return `sitePlanExpiry` (read-only select, no migration). Plan-issue row no longer falls back to `fetchedAt` (download date ≠ plan date). (4) gold hover highlight on ZAAHI, vault-shared and DDA/AD PMTiles plots (`hover-highlight.ts`).
- NOT DONE / decided against: hover-card HEIGHT for DDA/AD PMTiles and DDA plan dates — need a tile rebuild + R2 upload (or new DDA fetch); plan in `docs/research/hover-card-fields.md`.
- OPEN: `tests/e2e/admin-pause.spec.ts:96` (sign-out race) flips red from the sun-slider commit onward; not patched (see PR).
