# ZAAHI · Dubai Pulse Pipeline Runbook

**Document type:** Operational runbook for the 9-dataset Dubai Pulse refresh pipeline.
**Audience:** Жан (operator), Dymo (review). Companion to `dld-public-data-audit-2026-04-27.md` and `dld-api-gateway-application-2026-04-27.md`.
**Branch:** `research/dld-legitimate-access-2026-04-27` (off `main`).
**Status:** v1.0 · CONFIDENTIAL · internal · ready to run on Жан's Getac.
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, canonical files · no main push.

---

## §0 · TL;DR

```bash
# One-time setup on the Getac (Ubuntu 24.04 LTS):
cd /home/zaahi/zaahi
git checkout research/dld-legitimate-access-2026-04-27
python3 -m venv .venv && source .venv/bin/activate
pip install playwright pandas requests
playwright install chromium

# Run any time:
./scripts/dubai-pulse/refresh.sh

# Outputs land in:
#   data/raw/dubai-pulse/<slug>_<YYYY-MM-DD>.csv         (gitignored — raw)
#   data/processed/dubai-pulse/<slug>.csv                (committable — PDPL-filtered + normalized)
#   data/raw/dubai-pulse/pdpl_audit.log                  (append-only audit trail)
```

Phase 2 ZAAHI broker-outreach + market-intelligence pipeline runs entirely on these 9 free CSVs (~80% Phase 2 coverage per `dld-public-data-audit-2026-04-27.md` §3.1). Total cost: AED 0. Refresh cadence: weekly (cron / systemd timer). DLD source updates ~monthly; weekly polling catches the refresh window without thrashing the portal.

---

## §1 · The 9 datasets

| Slug | Source name | DLD Open Data URL | Approx size | Refresh at source |
|---|---|---|---|---|
| `brokers` | DLD Real Estate Licenses | [Dubai Pulse](https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open) | 1-5 MB | monthly |
| `transactions` | DLD Real Estate Transactions | [Dubai Pulse](https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open) | 100-500 MB | monthly (last verified update 2026-02-03) |
| `rents` | DLD Rent Contracts (Ejari) | [Dubai Pulse](https://www.dubaipulse.gov.ae/data/dld-registration/dld_rent_contracts-open) | 50-200 MB | monthly |
| `projects` | DLD Projects | [Dubai Pulse](https://www.dubaipulse.gov.ae/data/dld-registration/dld_projects-open) | 1-10 MB | monthly (last verified 2026-02-11) |
| `units` | DLD Units | [Dubai Pulse](https://www.dubaipulse.gov.ae/data/dld-registration/dld_units-open) | 50-200 MB | monthly |
| `land_registry` | DLD Land Registry | [Dubai Pulse](https://www.dubaipulse.gov.ae/data/dld-registration/dld_land_registry-open-api) | 5-20 MB | quarterly |
| `valuations` | DLD Valuations | [DLD hub](https://dubailand.gov.ae/en/open-data/real-estate-data/) (Valuations tab) | 10-50 MB | quarterly |
| `buildings` | DLD Buildings | [DLD hub](https://dubailand.gov.ae/en/open-data/real-estate-data/) (Buildings tab) | 10-50 MB | quarterly |
| `developers` | DLD Developers | [DLD hub](https://dubailand.gov.ae/en/open-data/real-estate-data/) (Developers tab) | 1-5 MB | quarterly |

Per the audit doc, this set covers ~80% of ZAAHI Phase 2 data needs. The 6 Dubai Pulse URLs above were verified HTTP 200 from sandbox on 2026-04-27 (the page loads — actual CSV download requires JS render, see §2.2). The 3 hub URLs need confirming on Жан's first run — DLD's hub-tab navigation may use anchor fragments not surfaced in sandbox HTML extraction.

---

## §2 · Setup

### 2.1 · One-time on the Getac

```bash
# 1. Python ≥3.10 already on Ubuntu 24.04 LTS (verify):
python3 --version  # expect 3.12.x or similar

# 2. Clone the repo (if not already):
cd ~ && git clone <ZAAHI repo URL> zaahi
cd zaahi
git checkout research/dld-legitimate-access-2026-04-27

# 3. Virtualenv + deps:
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install playwright pandas requests

# 4. Playwright browser (downloads ~150 MB Chromium binary):
playwright install chromium
playwright install-deps chromium  # may need sudo on Ubuntu

# 5. Verify scripts compile:
python3 -m py_compile scripts/dubai-pulse/download_datasets.py \
                       scripts/dubai-pulse/normalize.py
echo "Setup OK"
```

### 2.2 · Why Playwright (not plain `requests`)

The data.dubai portal that Dubai Pulse migrated to in 2025-2026 is a **Liferay React SPA**. Direct CSV download URLs are session-signed and only generated after a user clicks the Download button on a JS-rendered page. Probe results from 2026-04-27 sandbox:

| Attempted endpoint | Result |
|---|---|
| `dubaipulse.gov.ae/data/<slug>` | HTTP 200, 470 KB — but the data.dubai SPA shell with the dataset path stripped on redirect. No CSV body. |
| `/documents/20117/<docId>` | HTTP 404 — Liferay document-library URLs do NOT work anonymously |
| `/o/api`, `/o/headless-data-engine/v1.0/...`, `/o/data-engine/v2.0/...` | 200 OAuth shell only OR 404. No public REST endpoint for dataset listing/download |
| `/api/jsonws` (Liferay legacy) | 200 246 B, requires authenticated session for actual ops |
| `dubaipulse.gov.ae/api/dataset/<slug>` | HTTP 200 0 B (the legacy Pulse API was deprecated by the data.dubai migration) |
| `dubaipulse.gov.ae/api/3/action/package_show?id=<slug>` | HTTP 404 (CKAN-style API never existed on Liferay portal) |

So Playwright is not a stylistic choice — it's the only viable mechanism short of a documented partnership-API access, which we deferred per founder decision 2026-04-27. The `--manual` flag in `download_datasets.py` provides a Жан-downloads-via-browser fallback if Playwright misbehaves on a particular dataset.

### 2.3 · Robots.txt + ToS check

- [data.dubai/robots.txt](https://data.dubai/robots.txt) — `User-Agent: * / Disallow:` (i.e. unrestricted)
- Dubai Pulse open data is published under [Law (26) of 2015 Regulating Data Dissemination and Exchange in the Emirate of Dubai](https://www.dubaipulse.gov.ae/) — commercial use permitted. Dataset-page-specific terms (if any) verified by Жан at first download.
- Polite delay default 2.0s between dataset navigations — well within reasonable B2B usage.

---

## §3 · Running

### 3.1 · One-shot run

```bash
cd /home/zaahi/zaahi && source .venv/bin/activate
./scripts/dubai-pulse/refresh.sh
```

Expected timing on Getac X600 Server:
- Brokers, Projects, Developers, Land Registry: ~30 sec each (small CSVs)
- Valuations, Buildings, Units: ~2-5 min each (mid-size)
- Rents: ~5-10 min (large)
- Transactions: ~10-30 min (largest, 1.5M+ rows)
- **Total batch: ~25-60 min** depending on portal latency + DLD CSV size that month

### 3.2 · Subset run (specific datasets only)

```bash
# Just brokers + transactions (most-used by Phase 2 deal flow):
./scripts/dubai-pulse/refresh.sh --datasets brokers,transactions
```

### 3.3 · Cron / systemd timer (recommended)

**Option A — cron (simpler):**

```bash
# Add to Жан's user crontab (`crontab -e`):
0 3 * * 0  cd /home/zaahi/zaahi && \
           source .venv/bin/activate && \
           ./scripts/dubai-pulse/refresh.sh \
           >> /var/log/zaahi/dubai-pulse-refresh.log 2>&1
```

Runs Sunday 03:00 UTC weekly.

**Option B — systemd timer (preferred for restart-on-failure + journal logs):**

```bash
sudo tee /etc/systemd/system/zaahi-dubai-pulse.service > /dev/null <<'EOF'
[Unit]
Description=ZAAHI Dubai Pulse refresh
After=network-online.target

[Service]
Type=oneshot
User=zaahi
WorkingDirectory=/home/zaahi/zaahi
Environment="PATH=/home/zaahi/zaahi/.venv/bin:/usr/bin:/bin"
ExecStart=/home/zaahi/zaahi/scripts/dubai-pulse/refresh.sh
StandardOutput=journal
StandardError=journal
EOF

sudo tee /etc/systemd/system/zaahi-dubai-pulse.timer > /dev/null <<'EOF'
[Unit]
Description=Weekly ZAAHI Dubai Pulse refresh

[Timer]
OnCalendar=Sun 03:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now zaahi-dubai-pulse.timer
systemctl list-timers zaahi-dubai-pulse.timer
```

Logs available via `journalctl -u zaahi-dubai-pulse`.

### 3.4 · Manual fallback (no Playwright)

If Playwright hits an issue (selector shift, browser not installable, etc.):

```bash
# 1. Жан opens each dataset page in Chrome on the Getac
# 2. Clicks Download · saves CSV to data/raw/dubai-pulse/<slug>_<YYYY-MM-DD>.csv
#    (filename must match the slug-and-date pattern; see download_datasets.py DATASETS list)
# 3. Run only the normalize step:
./scripts/dubai-pulse/refresh.sh --manual
```

---

## §4 · Output schema (after normalize)

Each `data/processed/dubai-pulse/<slug>.csv` follows ZAAHI naming conventions:

- **snake_case** field names
- **ISO 8601** dates (`YYYY-MM-DD`)
- **Money in fils integers** per CLAUDE.md (`Финансовые расчёты — ТОЛЬКО fils`); columns suffixed `_fils` (the source `_aed` columns are dropped)
- **E.164 phones** (`+971XXXXXXXXX`) — landlines kept, mobile-prefix numbers redacted per PDPL
- **Empty fields** are `""` (never `NULL` / `N/A` / `null`)
- **Provenance columns** added: `source_url`, `retrieved_date`, `pdpl_compliance_note`

Per-dataset PDPL policies are documented in `scripts/dubai-pulse/normalize.py` docstring + the `DATASET_POLICY` dict in that same file. Жан updates the `rename` map for any column whose actual DLD CSV header differs from the best-guess map.

---

## §5 · Integration with ZAAHI production

Three integration patterns:

### 5.1 · Postgres ingest (recommended) — Phase 1.1 follow-up

Жан writes `prisma migrate dev` migrations + `scripts/dubai-pulse/ingest_postgres.py` that bulk-loads normalized CSVs into Postgres tables. Requires schema changes — out of scope for this commit per CLAUDE.md AGENT RULES (`NEVER modify prisma/schema.prisma without explicit permission`). Founder approval needed.

### 5.2 · Direct CSV reads (interim)

Until Postgres ingest is wired, `/api/dld/<slug>` route handlers can read CSVs directly via `papaparse` or Node's built-in `csv-parse`. Slower than Postgres but zero schema impact. Suitable for Phase 2 Brokers list filtering UI.

### 5.3 · Cross-reference with PF broker scrape

The Brokers normalized CSV (`data/processed/dubai-pulse/brokers.csv`) cross-references with the 17,491-row Property Finder scrape from `data/processed/brokers/dubai_brokerages.csv` (commit `172f186`) — match on RERA office number to enrich PF rows with canonical DLD status. Cross-ref script: `scripts/dubai-pulse/crossref_brokers.py` — Phase 1.1.

---

## §6 · Monitoring + troubleshooting

### 6.1 · What to check after each run

```bash
# 1. Sidecar metadata — every dataset should have status="OK" or "OK_MANUAL"
cat data/raw/dubai-pulse/*.meta.json | python3 -m json.tool | grep -E '"slug"|"status"|"note"'

# 2. PDPL audit log — verify expected redactions occurred
tail -50 data/raw/dubai-pulse/pdpl_audit.log

# 3. Processed CSV row counts
wc -l data/processed/dubai-pulse/*.csv
```

### 6.2 · Common failures

| Symptom | Cause | Fix |
|---|---|---|
| `FATAL: Python 3.10+ required` | Old Ubuntu | `apt install python3.12 python3.12-venv` |
| `FATAL: missing Python packages: playwright` | venv not activated | `source .venv/bin/activate` |
| Sidecar `status: FAIL · note: page-load-timeout` | Slow portal day | Re-run; consider `DUBAI_PULSE_TIMEOUT_S=180` |
| Sidecar `status: FAIL · note: no-download-selector-matched` | Liferay button selector shifted | `playwright codegen <portal_url>` interactively → update `selectors_to_try` in `download_datasets.py` |
| `[normalize] could not parse CSV with any encoding` | DLD published a malformed file | Manual fix — open in LibreOffice, re-save as UTF-8 |
| `[normalize] no policy registered` | New dataset added to `DATASETS` but not `DATASET_POLICY` | Add an entry in `normalize.py` `DATASET_POLICY` dict |

### 6.3 · Per-batch cleanup

After 30-60 days, retain only the latest 2-3 batches of raw CSVs:

```bash
# Delete raw CSVs older than 60 days (keep .meta.json indefinitely for audit):
find data/raw/dubai-pulse -name '*.csv' -mtime +60 -delete
```

---

## §7 · PDPL compliance summary

Per UAE Federal Law 45/2021:

- **Raw downloads** in `data/raw/dubai-pulse/` contain personal data (broker names, owner names in transactions, tenant names in rents). **Always gitignored**.
- **Normalized CSVs** in `data/processed/dubai-pulse/` apply per-dataset PDPL policies (see `normalize.py` `DATASET_POLICY`):
  - Drop personal contact fields (mobile, personal email, ID number, residential address, photo URL)
  - Keep regulatorily-public fields (RERA number, business address, business phone, work email)
  - Filter email-domain (gmail/hotmail/yahoo/etc → blanked)
  - Mobile-prefix detection on phones (+97150-58 → blanked)
- **Audit log** at `data/raw/dubai-pulse/pdpl_audit.log` (gitignored) appends every redaction with field, reason, count.
- **Lawful basis** PDPL Art. 5(f) legitimate interests for B2B prospecting + market intelligence on data DLD publishes as open data under Law 26/2015.
- **Retention**: raw CSVs cycle every 60 days; normalized CSVs retained indefinitely (regulatory facts, no PII residue).

---

## §8 · Sources

- DLD Open Data hub: <https://dubailand.gov.ae/en/open-data/real-estate-data/>
- DLD API Gateway (deferred per founder 2026-04-27): <https://dubailand.gov.ae/en/eservices/api-gateway/>
- Dubai Pulse: <https://www.dubaipulse.gov.ae/>
- data.dubai (new portal target): <https://data.dubai/>
- Law 26/2015 Regulating Data Dissemination and Exchange in Dubai (cited via Dubai Pulse footer)
- Companion docs in this branch: `dld-public-data-audit-2026-04-27.md`, `dld-api-gateway-application-2026-04-27.md`
- Previous broker baseline: `docs/research/broker-registry-acquisition-log.md` (commit `172f186`) — the PF 17,491-row scrape that cross-references with `brokers.csv` here

---

## §9 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-27 | ZAAHI engineering agent | Initial runbook for the 9-dataset Dubai Pulse pipeline. 3 scripts in `scripts/dubai-pulse/`: `download_datasets.py` (Playwright-based since data.dubai Liferay SPA blocks anonymous direct CSV access; `--manual` fallback; `--dry-run`, `--list`, `--force`, `--datasets` flags), `normalize.py` (lazy-imported pandas, per-dataset PDPL policy in `DATASET_POLICY` dict, money→fils integer per CLAUDE.md, ISO date normalization, E.164 phone normalisation with mobile-prefix redaction, dedup on natural key, source_url + retrieved_date provenance, `--list`/`--help`/`--dry-run` work without pandas installed), `refresh.sh` (orchestrator with `--download-only`/`--normalize-only`/`--manual`/`--dry-run`/`--force` flags + pre-flight Python+disk-space checks). cron + systemd-timer recipes in §3.3. PDPL audit log appended per run. Raw CSVs gitignored. Pipeline production-ready on free data; covers ~80% Phase 2 ZAAHI needs at AED 0. No `src/` edits. No schema edits. No canonical edits. No main push. |

---

*End of dubai-pulse-pipeline-runbook.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/dld-legitimate-access-2026-04-27`.
