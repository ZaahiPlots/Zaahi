# data/raw/brokers/ — raw broker registry downloads

This directory holds raw / unprocessed broker registry data from DLD (Dubai)
and ADREC (Abu Dhabi). Contents are **gitignored** (large JSON dumps,
PDPL-audit logs containing redacted-value snippets) — only this README is tracked.

Processed PDPL-filtered CSVs live in `data/processed/brokers/` and ARE committed.

## Intended contents (after Жан runs the local scrapers)

| Filename | Source | When |
|---|---|---|
| `dld_brokerages_raw_<YYYY-MM-DD>.json` | DLD gateway `classification/api/brokerage/office/...` | After scripts/brokers/dld_brokers_scraper.py |
| `dld_agents_raw_<YYYY-MM-DD>.json` | DLD gateway `classification/api/brokerage/card/...` | Same script |
| `adrec_agents_raw_<YYYY-MM-DD>.json` | ADREC SPA via Playwright headless render | After scripts/brokers/adrec_brokers_scraper.py |
| `pdpl_audit.log` | Both scrapers — every redaction logged with field+reason+truncated-value+row-id | Append-on-each-run; rotate manually if it grows |

## Why these files are NOT in git

1. **Size:** raw JSON dumps from DLD likely 10-50 MB depending on row count
   (3,000-8,000 brokerages + 25,000-50,000 individual brokers in 2026 estimates).
2. **PDPL exposure:** raw API responses include personal mobile numbers,
   personal email addresses, ID numbers, photo URLs that were stripped from
   the processed CSVs. Never commit raw-with-PII to a versioned repo.
3. **Regeneratable:** `scripts/brokers/dld_brokers_scraper.py` re-creates them
   on demand from the live DLD gateway with the auth flow documented in that
   script's docstring.

## Acquisition status as of 2026-04-26

This directory is **empty** — no raw downloads succeeded in the agent
acquisition session of 2026-04-26 because:

- DLD gateway endpoints (https://gateway.dubailand.gov.ae/classification/...,
  https://gateway.dubailand.gov.ae/TABURESTAPI/...) all returned **HTTP 401
  Unauthorized** to anonymous requests. Per DLD documentation, programmatic
  access requires a registered DLD business account + API Gateway token.
- ADREC public agents page (https://adrec.gov.ae/en/re_agents) is a
  JavaScript-rendered SPA. Static `requests.get()` returns the empty
  shell. Playwright headless render is required, which is not feasible
  in the agent sandbox.

Full diagnostic in `docs/research/broker-registry-acquisition-log.md`.

The script + CSV pipeline IS in place — Жан runs it locally on the Getac
X600 Server (per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 equipment) once
delivered + the DLD business account is approved.
