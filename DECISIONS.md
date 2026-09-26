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
