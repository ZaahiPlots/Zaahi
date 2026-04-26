# data/raw/mole/ — raw Mole Agent subsurface downloads

This directory holds raw / unprocessed subsurface datasets used by the §41 Mole Agent. Contents are **gitignored** (large files, regeneratable from cited sources) — only this README is tracked.

Processed, vector-tile-ready GeoJSONs live in `data/processed/mole/` and ARE committed.

## Intended contents (when v0.2 acquisition unblocks)

| Filename | Source | Approx size | When |
|---|---|---:|---|
| `geo2bg.zip` | USGS Open-File Report 97-470B (Arabian Peninsula bedrock geology shapefile) — DOI 10.5066/P9GI9NS4 — public domain | ~5 MB | When Жан retries USGS download from non-sandbox network |
| `sentinel1_dubai_*.zip` | Sentinel-1 SLC products via Copernicus Data Space Ecosystem — free | 1-5 GB per scene | When SNAP-StaMPS pipeline runs on Getac X600 Server |
| `licsbas_dubai_velocity.h5` | LiCSBAS time-series output (HDF5) | 50-500 MB | After PS-InSAR processing |
| `moccae_groundwater_*.zip` | MoCCAE Environmental Geospatial Platform export — pending Dymo BD partnership | unknown | Phase 2 |
| `bayanat_uae_*.geojson` | Bayanat.ae national open data extract | unknown | Phase 1.1 (catalog scan) |

## Acquisition status as of 2026-04-26

This directory is currently **empty** — no raw downloads succeeded in the agent acquisition session of 2026-04-26 due to sandbox CDN restrictions on USGS / MoCCAE / OneGeology endpoints. Per `docs/research/mole-data-acquisition-log.md` §1, all v0.1 layers were instead built from cited academic-literature descriptions with explicit `precision: "APPROXIMATE"` flags.

The full Phase 1 v0.2 acquisition path is documented in `docs/research/mole-data-acquisition-log.md` §6.
