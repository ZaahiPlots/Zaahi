# data/raw/dubai-pulse/ — raw Dubai Pulse downloads

Raw / unprocessed CSVs from the 9 free DLD open-data datasets at Dubai Pulse / data.dubai. **Gitignored** (large files, contain PDPL personal data that the normalizer strips before committing). Only this README + `.gitkeep` are tracked.

Processed PDPL-filtered CSVs live in `data/processed/dubai-pulse/` and ARE committed.

## Intended contents (after `scripts/dubai-pulse/refresh.sh` runs)

| Filename pattern | Source dataset | Approx size | Refresh cadence at source |
|---|---|---|---|
| `brokers_<YYYY-MM-DD>.csv` | DLD Real Estate Licenses | 1-5 MB | monthly |
| `transactions_<YYYY-MM-DD>.csv` | DLD Real Estate Transactions | 100-500 MB (1.5M+ rows) | monthly |
| `rents_<YYYY-MM-DD>.csv` | DLD Rent Contracts (Ejari) | 50-200 MB | monthly |
| `projects_<YYYY-MM-DD>.csv` | DLD Projects | 1-10 MB | monthly |
| `valuations_<YYYY-MM-DD>.csv` | DLD Valuations | 10-50 MB | monthly |
| `land_<YYYY-MM-DD>.csv` | DLD Land | 5-20 MB | quarterly |
| `land_registry_<YYYY-MM-DD>.csv` | DLD Land Registry (open API) | 5-20 MB | quarterly |
| `buildings_<YYYY-MM-DD>.csv` | DLD Buildings | 10-50 MB | quarterly |
| `units_<YYYY-MM-DD>.csv` | DLD Units | 50-200 MB | monthly |
| `developers_<YYYY-MM-DD>.csv` | DLD Developers | 1-5 MB | quarterly |
| `<slug>_<YYYY-MM-DD>.meta.json` | Sidecar (acquisition state) | <1 KB each | per refresh |
| `pdpl_audit.log` | Append-only redaction trail | grows over time | per normalize run |

Total disk usage estimate: 250 MB – 1 GB per refresh batch. Older batches can be deleted manually after the latest is verified ingested into ZAAHI's production DB.

## Why these files are NOT in git

1. **Size** — `transactions_*.csv` alone is 100-500 MB; git is the wrong store.
2. **PDPL exposure** — raw rows include personal data (broker names, owner names, tenant names, ID-ish fields). The normalizer (`scripts/dubai-pulse/normalize.py`) strips per the PDPL policy in its docstring. Never commit raw with PII.
3. **Regeneratable** — `scripts/dubai-pulse/refresh.sh` re-creates them on demand from the live Dubai Pulse portal.

## Acquisition status as of 2026-04-27

This directory is **empty** (only `.gitkeep` + `README.md` tracked). Жан runs `./scripts/dubai-pulse/refresh.sh` on the Getac X600 Server (per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4) once delivered — first run takes 5-15 minutes for the smaller datasets, 30-60 minutes if Transactions is included.

The Dubai Pulse / data.dubai portal requires a JavaScript-rendered browser session for CSV download (Liferay-based SPA, no anonymous direct CSV URLs as of 2026-04-27 sandbox probe). The download script uses Playwright headless Chromium — see `scripts/dubai-pulse/download_datasets.py` docstring for the auth-free flow + `--manual` fallback.

Full runbook: `docs/research/dubai-pulse-pipeline-runbook.md`.
