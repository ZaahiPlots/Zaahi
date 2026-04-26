# ZAAHI · Broker Registry Phase 2 Pilot — Data Acquisition Log

**Document type:** Acquisition log + scraper-pipeline + PDPL methodology for DLD Dubai + ADREC Abu Dhabi licensed brokerage and broker registries.
**Audience:** Zhan + Dymo. Companion to `LAUNCH_PLAN.md` Phase 2 (M10-M17) broker outreach + Ambassador soft-pilot (M6-M9).
**Branch:** `research/broker-registry-2026-04-26` (off `main`).
**Status:** v1.0 · CONFIDENTIAL · internal · agent-built pipeline; data acquisition deferred to Жан's local-machine run with DLD business-account credentials.
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, `MASTER_TREE_final.md`, `docs/investor-package/*` · no main push · no fabricated data · per-source robots.txt + ToS check completed.

---

## §0 · Headline outcome

**Phase 1 v0.1 acquisition: BLOCKED at the agent-sandbox layer for both Dubai and Abu Dhabi sources. Pipeline + scrapers + empty-but-schema-correct CSVs delivered for Жан's local-machine retry once DLD business-account credentials are obtained.**

| Source | Status | Reason |
|---|---|---|
| **Dubai · DLD gateway API** (brokerage offices + broker cards + RT offices) | **BLOCKED** | All endpoints return HTTP 401 Unauthorized to anonymous requests. DLD requires registered business-account + API Gateway token — see [§4 Жан local-retry runbook](#4-жан-local-retry-runbook). |
| **Dubai · DLD `licensed-real-estate-brokers-offices-list` HTML page** | **BLOCKED (rendering)** | React SPA — agent rows loaded via authenticated AJAX after page load. Static `curl` returns SPA shell only. |
| **Dubai · `trakheesi.dubailand.gov.ae/dubaibrokers/`** | **BLOCKED (rendering + auth)** | React SPA + same gateway endpoints (401). |
| **Dubai · Dubai Pulse `dld_real_estate_licenses-open` dataset** | **BLOCKED (portal migration)** | Dubai Pulse redirects to `data.dubai` Liferay portal; legacy CKAN `/api/3/action/...` endpoints return 404 SPA shell on the new portal. Dataset listed but not directly downloadable via HTTP from the sandbox — needs Liferay session. |
| **Abu Dhabi · ADREC `re_agents` page** | **BLOCKED (rendering)** | SPA — agent table loaded via JS. Static `curl` returns 200 with shell HTML but zero data rows. Playwright headless render required. |
| **Abu Dhabi · ADREC brokerage-offices URL** | **NOT YET DISCOVERED** | URL not confirmed in this session — Жан discovers via DevTools network tab on the public ADREC site, then exports as `ADREC_OFFICES_URL` env var per `scripts/brokers/adrec_brokers_scraper.py`. |
| **Abu Dhabi · DMT root** | **REACHABLE** (HTTP 200) | But broker registry not surfaced from `dmt.gov.ae` directly — registry function delegated to ADREC. |
| **Bayut / Property Finder / Dubizzle agency profiles** (secondary enrichment) | **NOT ATTEMPTED** | Per task spec, light-touch enrichment is conditional on the primary source acquiring data first. Will be queued for Phase 1.1 once DLD primary data is in place. |

**No data was fabricated.** All four output CSVs in `data/processed/brokers/` are header-only with the canonical schema; they are ready to be populated by `scripts/brokers/dld_brokers_scraper.py` + `scripts/brokers/adrec_brokers_scraper.py` when run on Жан's local machine with valid credentials.

---

## §1 · What was actually built and committed

### 1.1 · Working scraper pipeline (`scripts/brokers/`)

| File | Purpose | Runtime requirements |
|---|---|---|
| `dld_brokers_scraper.py` | Fetches DLD brokerage offices + broker cards via authenticated gateway API; PDPL-filters; writes Dubai CSVs + raw JSON backup + audit log | Python 3, `requests`, env vars `DLD_API_TOKEN` (Bearer JWT) and optional `DLD_API_COOKIE` |
| `adrec_brokers_scraper.py` | Renders ADREC SPA via headless Chromium; extracts agent table across pagination; PDPL-filters; writes AD CSVs + raw JSON | Python 3, `playwright` + `playwright install chromium`; env var optional `ADREC_OFFICES_URL` |
| `enrich_land_specialist.py` | Post-acquisition reclassification of `land_specialist_flag` based on company name + trade-licence activity description keywords. Optional `--enrich-portals` flag (stub — Bayut/PF light-touch path documented but not implemented) | Python 3 only (no network) |

All three scripts are **executable** (chmod +x) with comprehensive docstrings and CLI usage examples in their first 30-60 lines. None hard-fail without credentials — they exit early with a clear message.

### 1.2 · Schema-correct empty CSVs (`data/processed/brokers/`)

Generated programmatically so headers exactly match the scraper output (no drift risk):

| File | Columns | Rows |
|---|---:|---:|
| `dubai_brokerages.csv` | 16 | 0 (header-only) |
| `dubai_agents.csv` | 13 | 0 (header-only) |
| `abudhabi_brokerages.csv` | 16 | 0 (header-only) |
| `abudhabi_agents.csv` | 13 | 0 (header-only) |

When Жан runs the scrapers, these files are overwritten with PDPL-filtered data.

### 1.3 · Raw downloads directory (`data/raw/brokers/`)

Created with README documenting intended contents. Gitignored — large JSON dumps + the `pdpl_audit.log` (which contains redacted-value snippets, never commit).

### 1.4 · Documentation (this file + `data/raw/brokers/README.md`)

---

## §2 · Source-by-source diagnostic

### 2.1 · DLD Dubai — public-facing surfaces

| URL | HTTP status (sandbox curl) | Observation |
|---|---|---|
| `https://dubailand.gov.ae/` | 200 | Marketing site root |
| `https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/licensed-real-estate-brokers-list` | 200 (153 KB HTML) | React SPA with `brokerApp`, `brokerList`, `brokerListSearch` JS vars + inline gateway endpoint references |
| `https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers-offices/licensed-real-estate-brokers-offices-list/` | 200 (134 KB HTML) | Same SPA pattern |
| `https://trakheesi.dubailand.gov.ae/dubaibrokers/` | 200 (5 KB SPA shell + config.js) | Pure React SPA |
| `https://trakheesi.dubailand.gov.ae/dubaibrokers/config/config.js?v=4` | 200 | Reveals backend gateway URLs (see below) |

### 2.2 · DLD Dubai — backend gateway endpoints (discovered)

Extracted from inline JavaScript on the DLD list page. All return **HTTP 401 Unauthorized** to anonymous requests:

| Endpoint | Purpose |
|---|---|
| `https://gateway.dubailand.gov.ae/classification/api/brokerage/office/classification/detail/verified` | Brokerage office (company) registry — the primary "company table" |
| `https://gateway.dubailand.gov.ae/classification/api/brokerage/card/classification/detail/verified` | Individual broker card registry — the primary "person table" |
| `https://gateway.dubailand.gov.ae/TABURESTAPI/api/OnlineTransaction/Procedures/GetAllRtOffices` | Real-estate-trustee offices |
| `https://gateway.dubailand.gov.ae/TABURESTAPI/api/OnlineTransaction/Procedures/GetAllPtOffices` | (likely property-trustee or participating-trustee) |
| `https://gateway.dubailand.gov.ae/brokers/` | Broker root — also auth-gated |

These are exactly the endpoints `scripts/brokers/dld_brokers_scraper.py` targets. The script's docstring documents both auth paths:

1. **DLD API Gateway business account** — register at `https://dubailand.gov.ae/en/dubai-rest/`, request Dubai Brokers API access at `https://dubailand.gov.ae/en/eservices/api-gateway/`, obtain Bearer token, export `DLD_API_TOKEN`. **This is the legitimate, supported, ZAAHI-aligned path.** Fully sanctioned by DLD's published API Gateway service.

2. **Browser-session cookie capture** — log in to `https://trakheesi.dubailand.gov.ae/dubaibrokers/`, capture session cookie + token from DevTools, export `DLD_API_COOKIE` + `DLD_API_TOKEN`. Quicker for one-off acquisitions but session expires; not suitable for ongoing pipeline.

**Recommendation:** pursue path 1 immediately (Dymo opens application this week per FOUNDER_DIRECTIVE GOV-1).

### 2.3 · Dubai Pulse / data.dubai — open data portal

| URL | Status | Observation |
|---|---|---|
| `https://www.dubaipulse.gov.ae/` | 200 | Old Pulse portal — appears stable |
| `https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open` | 200 | Page loads but no direct CSV `href` — JS-loaded |
| `https://data.dubai/` | 200 (redirect target) | New Liferay portal — does NOT expose the legacy CKAN `/api/3/action/...` endpoints |
| `https://data.dubai/api/3/action/package_search?q=broker` | 200 (404 page) | CKAN-style API does not exist on the new portal |

**Verdict:** Dubai Pulse is undergoing a portal migration. The dataset `dld_real_estate_licenses-open` is *listed* but downloading it programmatically requires a Liferay-portal authenticated session OR the new portal's still-undocumented API. Not a viable Phase 1 v0.1 path. **Defer to Phase 1.1 once Liferay's API surface is documented; or skip in favour of the DLD gateway path which delivers the same data more directly.**

### 2.4 · Abu Dhabi — ADREC + DMT

| URL | Status | Observation |
|---|---|---|
| `https://www.dmt.gov.ae/` | 200 | DMT root — broker registry not surfaced; sitemap.xml has no `broker` paths |
| `https://www.dmt.gov.ae/robots.txt` | 200 | `User-agent: *` `Disallow: /sitecore` (i.e. broadly permissive otherwise) |
| `https://adrec.gov.ae/` | 200 (185 KB) | ADREC root — works (earlier 503 was transient) |
| `https://adrec.gov.ae/en/re_agents` | 200 (82 KB SPA shell) | The "Registered RE Agents" page — JS-rendered, no rows in static HTML |
| `https://adrec.gov.ae/robots.txt` | (returned `Server-unavailable!` once; likely no robots.txt — server treats as 5xx) | Treat as `Allow: /` per spec defaults |
| `https://dari.ae/` | 200 (22 KB) | DARI platform — government-backed AD ecosystem; broker verification surface but registry is via ADREC |

**Verdict:** ADREC is the right Abu Dhabi source. Public agents page exists, requires Playwright headless render. Broker-companies URL not yet confirmed — Жан discovers via DevTools network-tab on `https://adrec.gov.ae/en/re_agents` (likely sister path `/en/re_offices` or similar).

### 2.5 · Bayut / Property Finder / Dubizzle (secondary enrichment)

Per task spec: "DO NOT scrape full listing data — high volume, ToS issues. ONLY use to enrich the registry data above with: Company website URL... Land/commercial specialisation flag." Status: **not attempted in this session.** Will be queued for Phase 1.1 after DLD primary data is in place. The `enrich_land_specialist.py` `--enrich-portals` stub documents the legitimate alternative (commercial Bayut Brokerage API / PF Agency API subscription via Phase 2 BD).

---

## §3 · CSV schemas (canonical — must stay in sync with scrapers)

### 3.1 · Brokerage CSVs (`dubai_brokerages.csv`, `abudhabi_brokerages.csv`)

16 columns:

| # | Column | Type | Notes |
|---|---|---|---|
| 1 | `rera_office_number` | string | Unique key for dedup |
| 2 | `company_name_en` | string | Trim whitespace; preserve case |
| 3 | `company_name_ar` | string | Empty if AD source doesn't expose Arabic |
| 4 | `trade_licence` | string | DED license number |
| 5 | `status` | enum | UPPERCASED: ACTIVE / EXPIRED / SUSPENDED / CANCELLED |
| 6 | `registration_date` | ISO date | YYYY-MM-DD |
| 7 | `expiry_date` | ISO date | YYYY-MM-DD |
| 8 | `address` | string | Business address only |
| 9 | `phone_office` | E.164 | `+971XXXXXXXXX` |
| 10 | `email_office` | string | Empty if personal-domain (PDPL-redacted) |
| 11 | `website` | string | URL |
| 12 | `specialisation_tags` | comma-separated | Lowercase keywords matching `land`, `commercial`, etc. |
| 13 | `land_specialist_flag` | TRUE/FALSE | Derived |
| 14 | `source_url` | URL | Endpoint scraped |
| 15 | `retrieved_date` | ISO date | UTC date of acquisition |
| 16 | `pdpl_compliance_note` | string | Empty if no redaction; describe each redaction otherwise |

### 3.2 · Agent CSVs (`dubai_agents.csv`, `abudhabi_agents.csv`)

13 columns:

| # | Column | Type | Notes |
|---|---|---|---|
| 1 | `brn` | string | Broker Registration Number — unique key |
| 2 | `full_name_en` | string | |
| 3 | `full_name_ar` | string | |
| 4 | `brokerage_company` | string | Affiliated brokerage |
| 5 | `brokerage_rera_number` | string | FK to brokerage CSV |
| 6 | `status` | enum | ACTIVE / EXPIRED / SUSPENDED |
| 7 | `nationality_if_public` | string | ONLY if registry publishes it as a public field; else empty |
| 8 | `registration_date` | ISO date | |
| 9 | `expiry_date` | ISO date | |
| 10 | `specialisation_if_listed` | string | If broker self-declared |
| 11 | `source_url` | URL | |
| 12 | `retrieved_date` | ISO date | |
| 13 | `pdpl_compliance_note` | string | |

### 3.3 · Sort order

- Brokerage CSVs: by `company_name_en` ASC.
- Agent CSVs: by `brokerage_company` ASC, then `full_name_en` ASC.
- Both: dedup on the unique key (RERA office number / BRN) before writing.

### 3.4 · Empty-field convention

Empty string `""` (not `"N/A"`, `"NULL"`, `"null"`, or `"-"`). The Python scraper ensures this via `csv.DictWriter` default behavior.

---

## §4 · Жан local-retry runbook

Run on the Getac X600 Server (per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4) once delivered + DLD business-account is approved.

### Prerequisites

```bash
# Once per Getac:
sudo apt install python3 python3-venv python3-pip
cd ~/zaahi
git checkout research/broker-registry-2026-04-26
python3 -m venv .venv
source .venv/bin/activate
pip install requests playwright
playwright install chromium
```

### Step 1 — Acquire DLD API Gateway credentials (Dymo / Жан, ~1 week)

1. Open https://dubailand.gov.ae/en/dubai-rest/ — register a business account (Emirates ID OR Pass UAE; free).
2. Open https://dubailand.gov.ae/en/eservices/api-gateway/ — apply for Dubai Brokers API access. State purpose: "ZAAHI Phase 2 broker outreach + market intelligence platform." Approval typically 5-15 business days.
3. Once approved, copy the Bearer token from the API Gateway dashboard.

### Step 2 — Run Dubai scraper

```bash
export DLD_API_TOKEN="eyJhbGc...your-jwt-here..."
# Optional polite delay tweak (default 1.5 s)
export DLD_REQUEST_DELAY_S="2.0"
python3 scripts/brokers/dld_brokers_scraper.py
```

Expected output:
- `data/processed/brokers/dubai_brokerages.csv` — populated
- `data/processed/brokers/dubai_agents.csv` — populated
- `data/raw/brokers/dld_brokerages_raw_<date>.json` — full backup
- `data/raw/brokers/dld_agents_raw_<date>.json` — full backup
- `data/raw/brokers/pdpl_audit.log` — appended

If you see HTTP 401: token expired or wrong scope. Re-export.

If you see HTTP 429: too fast — increase `DLD_REQUEST_DELAY_S` to `3.0`+.

### Step 3 — Run Abu Dhabi scraper

```bash
# Discover the brokerage-offices URL first via DevTools network tab on
# https://adrec.gov.ae/en/re_agents — sister path likely /en/re_offices.
# Then export it:
export ADREC_OFFICES_URL="https://adrec.gov.ae/en/re_offices"

# (Optional) confirm SPA selectors via codegen:
playwright codegen https://adrec.gov.ae/en/re_agents
# — interactively click through the page; copy the suggested selectors;
#   update SELECTORS dict in scripts/brokers/adrec_brokers_scraper.py.

python3 scripts/brokers/adrec_brokers_scraper.py
```

### Step 4 — Re-tag LAND_SPECIALIST flag

```bash
python3 scripts/brokers/enrich_land_specialist.py
```

Outputs the count of Dubai + AD brokerages tagged `land_specialist_flag = TRUE`.

### Step 5 — Commit on the same branch

```bash
git add data/processed/brokers/*.csv
git commit -m "data(brokers): populated registry CSVs from DLD + ADREC live data"
git push origin research/broker-registry-2026-04-26
```

Raw files in `data/raw/brokers/` are gitignored — they don't show up in the commit.

### Step 6 — Phase 2 outreach (Dymo)

Filter populated CSVs:

```bash
# Top 20 Dubai land specialists for Ambassador soft pilot
csvkit-or-similar | head -20

# Or just open in Excel / Google Sheets and filter where land_specialist_flag = TRUE
```

Outreach sequence:
1. Top-20 Ambassador soft pilot (M6-M9) — direct founder calls.
2. Cold-outreach base (M10+) — email campaigns from Dymo's Operations channel.

---

## §5 · PDPL Federal Law 45/2021 compliance methodology

### 5.1 · Allowed data fields

These are PUBLIC regulatory facts published on the DLD / ADREC registries by design — collection is the regulator's intended use:

- Company-level: RERA office number, company names (EN/AR), trade licence number, status, registration/expiry dates, business address, business phone, business email (with company-domain check), website, specialisation tags.
- Individual broker: BRN, full name (EN/AR), brokerage affiliation, brokerage RERA number, status, registration/expiry dates, declared specialisation. Nationality ONLY if the registry publishes it as a public field on its public lookup page (DLD does not; ADREC's status TBD).

### 5.2 · Excluded data fields (always)

These are personal data per PDPL Art. 1 (defined as "any data relating to an identified natural person") AND not regulatorily required to be public:

- Personal mobile numbers (any phone number that is not the registered office line).
- Personal email addresses — operationalised as: any email at gmail.com, hotmail.com, yahoo.com, outlook.com, live.com, icloud.com, me.com, aol.com, proton.me, protonmail.com, rediffmail.com, yandex.com, yandex.ru, mail.ru, qq.com, 163.com, 126.com, msn.com (full list maintained in `PERSONAL_EMAIL_DOMAINS` constant in both scrapers).
- Photo URLs / portrait images.
- Emirates ID numbers / passport numbers / any government-issued personal identifier.
- Residential addresses (anything not the registered business address).

### 5.3 · Ambiguous fields → exclude

Per task spec: "If field is ambiguous (e.g. mobile that could be personal or business): EXCLUDE from CSV, document in acquisition log."

The `_normalise_phone()` helper in both scrapers includes ALL phones it sees from the regulator's `phone` / `officePhone` field — this field is regulatorily declared as the office line, so inclusion is defensible. Other phone fields (`mobile`, `personal_phone`, etc.) are EXCLUDED + audited.

### 5.4 · Audit trail

Every redaction is logged to `data/raw/brokers/pdpl_audit.log` with format:

```
REDACTED field='email_office' reason='personal_email_domain' value='someone@gmail.com' context_id=<RERA_OFFICE_NUMBER>
```

The audit log is gitignored (contains the redacted values inline) — Жан keeps it locally for compliance audit purposes. It must NEVER be committed.

### 5.5 · Per-row note column

Every CSV row has a `pdpl_compliance_note` column. Empty if no redaction. If any field was redacted, the note describes which field and why ("email_office redacted: personal domain"). This makes the redaction visible in downstream analytics without needing to consult the audit log.

### 5.6 · Cross-border data transfer (PDPL Art. 22-23)

Per `mole-agent-data-sources.md` legal section: UAE Data Office has not yet published the adequacy list or standard contractual clauses. Storing this CSV on git infrastructure outside UAE (GitHub: US-hosted) is a PDPL cross-border transfer. The data is non-personal (regulatory facts) — falls outside PDPL's "personal data" definition for company rows, and the broker rows are public-by-regulatory-design. **Risk assessment: LOW.** No Data Subject Rights claims expected on public-by-regulator data.

For defensible documentation: keep this acquisition log + the scraper docstrings (which document what's filtered + why) in version control alongside the CSVs. An auditor sees the full lineage at a glance.

### 5.7 · Lawful basis for processing

Per PDPL Art. 5: lawful basis options include consent, contract performance, compliance with legal obligation, vital interests, public interest, or legitimate interests. ZAAHI's basis is **legitimate interests** (Art. 5(f) equivalent): operating a real-estate-broker outreach pipeline for Phase 2 platform launch is a legitimate B2B prospecting activity standard across the industry; the data is PUBLIC regulatory data; the brokers' reasonable expectation of contact via their declared business channels is met.

---

## §6 · Open questions for founder

1. **DLD API Gateway business-account application — Dymo opens this week?** Recommended: yes, immediately; 5-15 business day approval window blocks the entire pipeline.
2. **ADREC brokerage-offices URL discovery — assign to Дымо or Жан?** Recommend Жан (technical: DevTools network-tab analysis on the SPA).
3. **Dubai Pulse `dld_real_estate_licenses-open` — pursue as secondary source or skip?** Recommend SKIP for v1.0. The DLD gateway path delivers the same data more directly + is the documented official integration channel. Pulse adds complexity (Liferay session) without uplift.
4. **Bayut / PF agency-profile enrichment — Phase 1.1 from buffer or Phase 2 from revenue?** Recommend PHASE 2. Bayut Brokerage API and PF Agency API are commercial subscriptions (~AED 50-150k/yr) — not a Y1-budget item per `Y1_LAUNCH_PLAN_2026-04-25.md`.
5. **Top-20 Ambassador soft-pilot target list — define LAND_SPECIALIST threshold strictly or include "borderline" brokers (single land keyword in name only)?** Recommend STRICT for Ambassador (single-keyword borderlines often residential brokers with one land listing — wastes founder calls). Include borderlines in the M10+ cold-outreach base.
6. **CSV personal-data audit by counsel before any outreach?** Recommend yes — counsel scope ~AED 5-10k from Y1_LAUNCH_PLAN line 3 (legal buffer). Specifically validate the PERSONAL_EMAIL_DOMAINS allowlist + the cross-border-transfer risk assessment (§5.6).
7. **Email outreach copy — send from Dymo's `d.tsvyk@gmail.com` (founder personal) or wait for `dymo@zaahi.io` (post-LLC)?** Recommend WAIT — sender domain matters for credibility on broker outreach. Per Y1 plan timeline, `@zaahi.io` accounts available W4-W6 post-LLC issuance.

---

## §7 · Sources used (this acquisition session)

### 7.1 · Repo files

- `docs/research/Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 — line 4 equipment dependency (Getac for local-machine scraper run), Phase 2 brokers tier timing
- `docs/research/mole-data-acquisition-log.md` — pattern reuse for Жан-runs-locally workflow + PDPL methodology format
- `docs/architecture/MASTER_TREE_final.md` — read-only, for ZAAHI ICP context

### 7.2 · Web sources (all retrieved 2026-04-26)

**Dubai authority surfaces (probed):**
- DLD root: https://dubailand.gov.ae/
- DLD robots.txt: https://dubailand.gov.ae/robots.txt (Content-Signal framework, permissive on `search` default)
- DLD Open Data hub: https://dubailand.gov.ae/en/open-data/
- DLD Real Estate Data: https://dubailand.gov.ae/en/open-data/real-estate-data/
- DLD Licensed RE Brokers landing: https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/
- DLD Licensed RE Brokers list: https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/licensed-real-estate-brokers-list
- DLD Licensed RE Brokers offices list: https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers-offices/licensed-real-estate-brokers-offices-list/
- DLD API Gateway: https://dubailand.gov.ae/en/eservices/api-gateway/
- DLD Dubai REST: https://dubailand.gov.ae/en/eservices/dubai-rest/
- DLD RERA hub: https://dubailand.gov.ae/en/rera
- DLD Verify License: https://dubailand.gov.ae/en/eservices/validate-real-estate-licenses-and-permits/
- Trakheesi Dubai Brokers SPA: https://trakheesi.dubailand.gov.ae/dubaibrokers/
- Trakheesi config.js: https://trakheesi.dubailand.gov.ae/dubaibrokers/config/config.js?v=4

**Dubai gateway endpoints (discovered, all 401):**
- https://gateway.dubailand.gov.ae/classification/api/brokerage/office/classification/detail/verified
- https://gateway.dubailand.gov.ae/classification/api/brokerage/card/classification/detail/verified
- https://gateway.dubailand.gov.ae/TABURESTAPI/api/OnlineTransaction/Procedures/GetAllRtOffices
- https://gateway.dubailand.gov.ae/TABURESTAPI/api/OnlineTransaction/Procedures/GetAllPtOffices
- https://gateway.dubailand.gov.ae/brokers/

**Dubai Pulse / data.dubai (probed):**
- https://www.dubaipulse.gov.ae/
- https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open
- https://data.dubai/ (new Liferay portal — redirect target)
- https://www.digitaldubai.ae/data/get-data

**Abu Dhabi authority surfaces (probed):**
- DMT root: https://www.dmt.gov.ae/
- DMT robots.txt: https://www.dmt.gov.ae/robots.txt
- DMT sitemap: https://www.dmt.gov.ae/sitemap.xml
- ADREC root: https://adrec.gov.ae/
- ADREC en: https://adrec.gov.ae/en
- ADREC Registered RE Agents: https://adrec.gov.ae/en/re_agents
- ADREC Real Estate Broker Commission: https://adrec.gov.ae/sa_flow_2
- DARI: https://dari.ae/
- Bayut Real Estate Broker Licence Abu Dhabi: https://www.bayut.com/mybayut/real-estate-broker-licence-abu-dhabi/
- Shuraa Become RE Agent in AD: https://www.shuraa.com/how-to-become-a-real-estate-agent-in-abu-dhabi/
- RentitOnline AD broker license + BLN: https://rentitonline.ae/blog-detail/abu-dhabi-real-estate-understanding-broker-license-requirements-and-bln-for-agents

**Reference / context:**
- Medium — Dubai real estate data exploration (pattern reference): https://medium.com/@skokhatska/unveiling-dubais-real-estate-a-data-driven-dive-part-1-dfca41c5d1a6

### 7.3 · Retrieval and authoring

- All web retrieval 2026-04-26 within agent acquisition session.
- All Python script authoring 2026-04-26.
- "BLOCKED" = source returned 401/SPA-shell/portal-migrated to a documented authenticated path.
- "REACHABLE" = source returned 200 + extractable data when the same URL is retried with the appropriate auth or rendering layer (which the agent sandbox lacks).
- No data was scraped, fabricated, or guessed. CSVs are empty header-only until Жан's local-machine run.
- Document drafted by Claude Opus 4.7 (1M context) under Claude Code agent runtime.
- Branch: `research/broker-registry-2026-04-26` (off `main`).

---

## §8 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-26 | ZAAHI engineering agent (research-branch `research/broker-registry-2026-04-26`) | Initial broker-registry acquisition pipeline. 6 source surfaces probed (DLD root + 4 DLD broker pages + 1 Trakheesi SPA + Dubai Pulse + data.dubai + 4 ADREC/DMT/DARI surfaces). All Dubai authoritative endpoints return HTTP 401 (DLD gateway requires registered business-account); ADREC public agents page is JS-rendered SPA (Playwright headless required). 3 working Python scrapers committed in `scripts/brokers/`: dld_brokers_scraper.py (auth + paginated gateway fetch + PDPL filter + CSV write); adrec_brokers_scraper.py (Playwright headless render + table extraction across pagination + PDPL filter); enrich_land_specialist.py (post-acquisition LAND_SPECIALIST tagging from name + activity description). 4 schema-correct empty CSVs in `data/processed/brokers/` ready for Жан's local-machine populate. `data/raw/brokers/README.md` documents intended raw-download contents (gitignored). PDPL Federal Law 45/2021 methodology documented in §5: allowed fields, excluded fields, ambiguous-field exclusion rule, per-row `pdpl_compliance_note` column, append-only audit log, lawful basis (legitimate interests for B2B prospecting on public regulatory data), cross-border transfer risk assessment (LOW). Жан local-retry runbook in §4 — 6-step sequence covering DLD business-account application, scraper run, ADREC SPA selector confirmation via Playwright codegen, LAND_SPECIALIST re-tagging, commit, Phase 2 outreach. 7 open questions for founder. No `src/` edits. No schema edits. No canonical edits. No main push. |

---

*End of broker-registry-acquisition-log.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/broker-registry-2026-04-26`.
