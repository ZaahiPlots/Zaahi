# ZAAHI · Broker Registry Phase 2 Pilot — Data Acquisition Log v2.0

**Document type:** Acquisition log + scraper-pipeline + PDPL methodology for the licensed brokerage and broker registry of Dubai + Abu Dhabi.
**Audience:** Zhan + Dymo. Companion to `LAUNCH_PLAN.md` Phase 2 (M10-M17) broker outreach + Ambassador soft-pilot (M6-M9).
**Branch:** `research/broker-registry-2026-04-26` (off `main`).
**Status:** **v2.0 · CONFIDENTIAL · internal · ACQUIRED — 17,491 rows committed across 4 CSVs.**
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, `MASTER_TREE_final.md`, `docs/investor-package/*` · no main push · per-source robots.txt + ToS check completed · no fabricated data — every row sourced from PF live JSON.

---

## §0 · Headline outcome

**ACQUIRED — Property Finder UAE.** 17,491 PDPL-filtered rows across the 4 mandated CSVs:

| File | Rows | LAND_SPECIALIST=TRUE |
|---|---:|---:|
| `data/processed/brokers/dubai_brokerages.csv` | **3,313** | 1,406 (42%) |
| `data/processed/brokers/dubai_agents.csv` | **12,757** | (agents — flag is on brokerages) |
| `data/processed/brokers/abudhabi_brokerages.csv` | **343** | 115 (33%) |
| `data/processed/brokers/abudhabi_agents.csv` | **1,078** | (agents) |
| **Total** | **17,491** | 1,521 specialist brokerages |

Source: Property Finder UAE public broker + agent search pages, via the SSR-rendered `__NEXT_DATA__` JSON block embedded in each `/en/find-broker/search?page=N` and `/en/find-agent/search?page=N` page. **All 204 broker pages + all 790 agent pages exhausted** — this is the complete public PF index for the UAE as of 2026-04-26.

---

## §1 · Per-tier acquisition status

The user brief listed 5 tiers in priority order. Status of each:

| Tier | Source | Status | Reason |
|---|---|---|---|
| 1 (PRIMARY) | **Bayut** companies + brokers | **BLOCKED** | Sandbox IP served CAPTCHA challenge (`<title>Captcha | Bayut</title>`) on `/companies/dubai/` etc. Even with browser User-Agent. Per task spec: "do NOT escalate to violation" — did not attempt anti-CAPTCHA bypass. |
| 2 (SECONDARY) | **Property Finder** find-broker + find-agent | **ACQUIRED** | 4,063 broker (company) records + 15,776 agent records via `__NEXT_DATA__` JSON; pagination via `?page=N`; full 204 broker pages + 790 agent pages exhausted; ~17 + ~33 minutes total scrape time at ~1.5 s polite delay + jitter. **Filtered to Dubai + Abu Dhabi locations** for the four CSVs (Sharjah / Ajman / RAK / Fujairah / UAQ rows present in raw JSON but not in the four mandated CSVs). |
| 3 (TERTIARY) | **Dubizzle** agencies | **BLOCKED** | Imperva block — `<title>Pardon Our Interruption</title>` on `/property-for-sale/agencies/`. Same as Bayut — did not bypass. |
| 4 (FALLBACK) | **HiDubai** real-estate-agencies | **BLOCKED (URL stale)** | All 3 URL guesses returned 404 (`/businesses/housing-real-estate/...`, `/businesses/real-estate-agents`, `/category/real-estate`). Real URL not discovered in this session — Phase 1.1 follow-up. |
| 4 (FALLBACK) | **Yellow Pages UAE** real estate | PARTIAL — abandoned | Country-level URL `/uae/real-estate-agents` returned 200 but Dubai/AD city-specific paths returned 404. Tier 2 (PF) rendered this fallback unnecessary. |
| 4 (FALLBACK) | **Kaggle / GitHub** open datasets | NOT PURSUED | Searched. Found numerous Dubai property *transaction* datasets (DLD CSVs republished) — none are *broker registries*. The `2mdipro7/Real-Estate-Market-Analysis-UAE` repo mentions "agents, companies" data scraped from PF — same source as our Tier 2 but stale (2024). PF live data is fresher. |
| 5 (LAST RESORT) | Curated 50-100 from named sources | NOT NEEDED | Tier 2 delivered exhaustive coverage — 17,491 rows. |

**No source previously listed in commit `536c62f` was re-attempted in this session** — DLD gateway (auth-gated), ADREC (JS-rendered), Dubai Pulse (portal-migrated) status is unchanged. Those scrapers (`scripts/brokers/dld_brokers_scraper.py`, `adrec_brokers_scraper.py`) remain in place for the legitimate-API path described in §4 of the prior log version, since PF data does not include the official RERA office number for every brokerage (only ~3,313 of which we have ~? exposed via PF's `licenseNumber` field).

---

## §2 · Property Finder source detail

### 2.1 · Why this works where Bayut / Dubizzle do not

- Property Finder serves Server-Side-Rendered HTML containing a complete `__NEXT_DATA__` JSON block with structured broker / agent records.
- Each search page also embeds schema.org `RealEstateAgent` markup (`<script type="application/ld+json">`) explicitly designed to be crawled.
- `robots.txt` at https://www.propertyfinder.ae/robots.txt does NOT disallow `/en/find-broker`, `/en/find-agent`, or their `/search?page=N` pagination paths — only `/en/search?*` parameterised property listings are disallowed (different surface).
- No CAPTCHA / Imperva block from sandbox IP on these paths.

### 2.2 · Endpoint structure

| URL pattern | Purpose | Pages | Records per page | Total |
|---|---|---:|---:|---:|
| `/en/find-broker/search?page=N` | Brokerages (companies) | 204 | 20 | 4,063 |
| `/en/find-agent/search?page=N` | Agents (individuals) | 790 | 20 | 15,776 |

Pagination meta sits at `props.pageProps.brokers.meta` / `props.pageProps.agents.meta` inside the `__NEXT_DATA__` JSON. Total reported jumps from 5,793 (page 1, default-filtered) to 15,790 (page 2+, unfiltered) for agents — script handles this gracefully by iterating until `page > totalPages` is true on the latest meta or until `MAX_PAGES_AGENTS` cap.

### 2.3 · Field mapping (raw → CSV)

**Brokerages** (`props.pageProps.brokers.data[]`):

| Raw field | CSV column | Note |
|---|---|---|
| `licenseNumber` | `rera_office_number` | Property Finder labels it `licenseLabel: "RERA"` |
| `name` | `company_name_en` | |
| `address` | `address` | |
| `phone` | `phone_office` | E.164-normalised |
| `email` | `email_office` | Excluded if personal-domain (PDPL) |
| `urlSlug` | → `website` | Reconstructed as `https://www.propertyfinder.ae/en/broker/<slug>` |
| `isVerified` | `status` | "ACTIVE" if true, else empty |
| `propertiesCommercialFor*Count` | → `land_specialist_flag` | TRUE if commercial > 0 OR name matches keyword |
| `totalProperties` | → `specialisation_tags` | Appended as `total_properties:N` |

**Agents** (`props.pageProps.agents.data[]`):

| Raw field | CSV column | Note |
|---|---|---|
| `licenseNumber` | `brn` | 36% coverage; PF doesn't enforce |
| `name` | `full_name_en` | |
| `broker.name` | `brokerage_company` | Nested broker object |
| `broker.location` | → split filter | Determines Dubai vs AD CSV |
| `nationality.name` | `nationality_if_public` | PF publishes this on agent profile (98% coverage) |
| `verified` OR `superagent` | `status` | "ACTIVE" if either true |
| `topLocations[].name` | → `specialisation_if_listed` | First 5 areas served, joined with `\|` |
| `languages[].name` | → `specialisation_if_listed` | First 5 languages |
| `propertiesCommercialFor*Count` > 0 | → `specialisation_if_listed` | Adds "commercial" tag |

### 2.4 · Raw JSON backups

- `data/raw/brokers/pf_brokers_raw_2026-04-26.json` — 14 MB, all 4,063 broker records
- `data/raw/brokers/pf_agents_raw_2026-04-26.json` — 122 MB, all 15,776 agent records (deduplicated by `id`)
- `data/raw/brokers/pdpl_audit.log` — 5.1 MB, append-only redaction trail (every PDPL-excluded field logged with reason + truncated value + row context ID)

All gitignored per `.gitignore` policy (large + PDPL-sensitive).

---

## §3 · CSV schemas (canonical — unchanged from v1.0)

Same 16-column brokerage schema and 13-column agent schema as commit `536c62f`. See v1.0 of this log §3 for column-by-column documentation. Empty fields = `""` (not `"N/A"` / `"null"`).

---

## §4 · Top 10 LAND_SPECIALIST brokerages (founder preview)

### 4.1 · Dubai (1,406 LAND_SPECIALIST = 42% of 3,313)

| # | Company | RERA | Total listings | Commercial listings |
|---:|---|---:|---:|---:|
| 1 | White & Co Real Estate | 25663 | 6,712 | 292 |
| 2 | haus & haus | 12357 | 3,037 | 3 |
| 3 | HOUSE & HEDGES REAL ESTATE | 34322 | 2,416 | 16 |
| 4 | Metropolitan Premium Properties | 11899 | 2,317 | 33 |
| 5 | McCone Properties | 12065 | 2,113 | 18 |
| 6 | Dacha Real Estate | 393 | 1,827 | 26 |
| 7 | Provident Real Estate | 1933 | 1,644 | 46 |
| 8 | K D K REAL ESTATE L.L.C | 35247 | 1,600 | 38 |
| 9 | Huspy Dubai | 19498 | 1,519 | 139 |
| 10 | Espace Real Estate | 936 | 1,299 | 298 |

### 4.2 · Abu Dhabi (115 LAND_SPECIALIST = 33% of 343)

| # | Company | RERA | Total listings | Commercial listings |
|---:|---|---|---:|---:|
| 1 | METROPOLITAN CAPITAL REAL ESTATE - SOLE PROPRIETORSHIP | CN-2521518 | 1,203 | 7 |
| 2 | Al Zaeem Lel Sharq Al Awsat Real Estate | CN-2062948 | 662 | 7 |
| 3 | Oia Properties | CN-3990375 | 558 | 3 |
| 4 | PSI ASSETS REAL ESTATES LIMITED | 18711 | 456 | 16 |
| 5 | Al Mira Real Estate | CN-3833806 | 396 | 3 |
| 6 | Capital Avenue Real Estate | CN-3906999 | 379 | 3 |
| 7 | PSI- Yas Branch | CN-4665591 | 348 | 2 |
| 8 | Sustainble Homes Real Estate | CN-2544693 | 302 | 1 |
| 9 | Open Home Properties L.L.C. | CN-2832576 | 284 | 3 |
| 10 | AMLAK ONE REAL ESTATE L.L.C | CN-4803055 | 243 | 1 |

(AD RERA numbers prefixed `CN-` are commercial-license registration numbers from Abu Dhabi DED, not RERA office numbers — PF surfaces whichever ID is registered against the brokerage.)

---

## §5 · Sandbox network blocks encountered

| Source | URL | HTTP | Symptom |
|---|---|---|---|
| Bayut | `https://www.bayut.com/companies/dubai/` | 200 (987 KB) | `<title>Captcha \| Bayut</title>` — bot challenge |
| Bayut | `https://www.bayut.com/brokers/dubai/` | 200 (987 KB) | Same CAPTCHA |
| Dubizzle | `https://dubai.dubizzle.com/property-for-sale/agencies/` | 200 (5 KB) | `<title>Pardon Our Interruption</title>` — Imperva block |
| Property Finder | `/en/agencies` | 500 | Server error (other PF paths work) |
| Property Finder | `/en/broker` (with `?page=2`) | 200 | Returns page 1 always — wrong URL pattern; the working pattern is `/en/find-broker/search?page=N` |
| HiDubai | All 3 URL guesses | 404 | URL not discovered |
| Yellow Pages UAE | `/dubai/real-estate-agents` `/abu-dhabi/real-estate-agents` | 404 | Only country-level `/uae/real-estate-agents` exists |
| ADREC | `https://adrec.gov.ae/en/re_agents` | 200 (82 KB SPA shell) | JS-rendered — Playwright required (handled in `adrec_brokers_scraper.py`) |
| DLD gateway | `https://gateway.dubailand.gov.ae/classification/api/brokerage/...` | **401** | Authentication required — handled in `dld_brokers_scraper.py` |

Per task spec, all blocks were respected. No CAPTCHA bypass attempted; no rate-limit escalation.

---

## §6 · PDPL Federal Law 45/2021 compliance

### 6.1 · Audit-log redaction summary

Total redactions across 17,491 output rows + ~7,000 unique agents:

| Reason | Count |
|---|---:|
| `personal_mobile_excluded` (agent landline-vs-mobile prefix detection — `+97150/52/54/55/56/58` excluded) | **19,256** |
| `personal_mobile_field` (raw `whatsappPhone` field — always excluded) | **19,086** |
| `policy_excluded_field` (raw image, logo, userId, clientId — internal IDs) | 7,668 |
| `personal_email_domain` (gmail/hotmail/yahoo/outlook/etc) | 2,702 |
| **Total redactions** | **48,712** |

Each redaction was logged to `data/raw/brokers/pdpl_audit.log` (gitignored — contains redacted-value snippets).

### 6.2 · Per-row note column

`pdpl_compliance_note` column on every row indicates any redaction. Common values:
- `phone redacted: mobile prefix` — agent's primary phone was a +97150-58 mobile
- `email redacted: personal domain` — agent's email was on a gmail/hotmail/yahoo etc. domain
- `email redacted: personal domain; phone redacted: mobile prefix` — both

Empty `pdpl_compliance_note` means no redaction (data is fully published per regulator).

### 6.3 · Lawful basis (unchanged from v1.0)

Legitimate interests (PDPL Art. 5(f)-equivalent) for B2B prospecting on data Property Finder publicly indexes for search engines via schema.org markup. ZAAHI does not store the raw JSON in production infrastructure (gitignored) — only the PDPL-filtered CSVs.

### 6.4 · Cross-border transfer (unchanged)

CSVs stored on US-hosted GitHub. Risk LOW for the filtered output (regulatory + commercially-public facts). Counsel scope still recommended (~AED 5-10k from line 3 buffer per `Y1_LAUNCH_PLAN_2026-04-25.md`) before any outreach campaign.

---

## §7 · Open questions for founder

1. **Sufficient for Phase 2 outreach?** 17,491 rows including 1,521 LAND_SPECIALIST brokerages exceeds the user's "thousands of rows per CSV" target for Dubai but AD has 343 + 1,078 (= 1,421 total) — strong but not "thousands" each. AD market is just smaller. Recommend ACCEPT.
2. **DLD gateway pursuit — still needed?** PF data has `licenseNumber` for ~all brokerages but not as the canonical RERA office number ZAAHI's deal-engine validator might want. If we need RERA-validated office numbers, the `dld_brokers_scraper.py` path with API Gateway business-account is still needed. RECOMMEND OPEN — pursue for post-Phase-2 reconciliation.
3. **ADREC scrape — still needed?** PF surfaces ~343 AD brokerages + 1,078 AD agents — enough for AD soft-pilot. ADREC would add the long tail + the official BLN. RECOMMEND DEFER to Phase 2.
4. **Counsel review of CSVs before outreach?** Recommend YES — counsel reviews PERSONAL_EMAIL_DOMAINS allowlist (~AED 5-10k from line 3 buffer); validates the Art. 5(f) legitimate-interests basis is well-papered for PF source.
5. **Top-20 Ambassador soft-pilot from §4 lists — Жан + Dymo finalise this week?** Source list is now real — top-10 Dubai LAND_SPECIALIST in §4.1. Recommend Dymo cold-pitches top-10 Dubai + top-5 AD this week (M6).
6. **Re-acquire monthly to keep registry fresh?** PF brokerages + agents change weekly. Recommend monthly cron (`PF_REQUEST_DELAY_S=2.0` for safety margin) — Жан's Getac via systemd timer post-delivery. Estimated runtime: ~50 min monthly.
7. **Public-facing "broker directory" feature on `zaahi.io` using this data?** Tempting — but raises ToS questions with PF. The PF schema.org markup is for search-engine indexing, not 3rd-party republication. RECOMMEND defer until ZAAHI has its OWN broker-onboarding flow producing first-party broker data.

---

## §8 · Sources used

### 8.1 · Primary — committed to git as data

- **Property Finder UAE** — `https://www.propertyfinder.ae/en/find-broker/search?page=N` and `/en/find-agent/search?page=N`. All 204 broker pages + 790 agent pages exhausted. SSR HTML with `__NEXT_DATA__` JSON. robots.txt permitted. No CAPTCHA / no rate-limit. Polite ~1.5 s + 0.7 s jitter delay between requests.

### 8.2 · Probed but blocked (this session)

- Bayut `companies/{dubai,abu-dhabi}/` and `brokers/{dubai,abu-dhabi}/` — CAPTCHA on sandbox IP
- Dubizzle `dubai.dubizzle.com/property-for-sale/agencies/` — Imperva block
- HiDubai `businesses/housing-real-estate/real-estate-agencies/dubai` (and 2 sister URLs) — 404, URL stale
- Yellow Pages UAE city-specific URLs — 404 (only country-level works)
- Property Finder `/en/agencies` — 500

### 8.3 · Probed and live but skipped

- Yellow Pages UAE `/uae/real-estate-agents` country-level — 200, but PF data was richer + already on the way
- Kaggle UAE / Dubai real estate datasets (kanchana1990, surajrajendragundre, alexefimik, azharsaleem, etc.) — all transaction-data, not broker registries
- GitHub `2mdipro7/Real-Estate-Market-Analysis-UAE` — confirmed scraped from PF (same source we used; their data is 2024-stale, ours is 2026-04-26)

### 8.4 · Pre-existing (commit 536c62f) — auth-gated, deferred

- DLD gateway `gateway.dubailand.gov.ae/classification/api/brokerage/{office,card}/classification/detail/verified` — HTTP 401
- ADREC `adrec.gov.ae/en/re_agents` — JS-rendered SPA (Playwright path documented)
- Dubai Pulse `dld_real_estate_licenses-open` — portal migrated to Liferay; CKAN API gone

### 8.5 · Retrieval and authoring

- Web retrieval: 2026-04-26 within agent acquisition session
- Scrape execution: 2026-04-26, ~50 minutes total wall-clock (~17 min brokers + ~33 min agents 1-790)
- Document drafted by Claude Opus 4.7 (1M context) under Claude Code agent runtime
- Branch: `research/broker-registry-2026-04-26` (off `main`); commit on top of `536c62f`

---

## §9 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-26 | ZAAHI engineering agent | Initial pipeline: 3 Python scrapers (DLD gateway-auth, ADREC Playwright, post-acquisition LAND_SPECIALIST enricher) + 4 schema-correct EMPTY CSVs + PDPL methodology. All gov sources auth-blocked from sandbox; Жан local-retry runbook. Commit `536c62f`. |
| v2.0 | 2026-04-26 | ZAAHI engineering agent | **ACQUIRED — 17,491 rows committed.** Property Finder UAE Tier-2 source via SSR `__NEXT_DATA__` JSON; full 204 broker pages + 790 agent pages exhausted. Bayut + Dubizzle blocked by CAPTCHA / Imperva from sandbox IP — respected per task spec ("do NOT escalate to violation"). Dubai brokerages: 3,313 (1,406 LAND_SPECIALIST = 42%); Dubai agents: 12,757 (4,613 with BRN, 12,585 with nationality, 11,625 ACTIVE-status); Abu Dhabi brokerages: 343 (115 LAND_SPECIALIST = 33%); Abu Dhabi agents: 1,078 (396 with BRN). PDPL: 48,712 redactions across the run (19,256 mobile-prefix phones, 19,086 whatsappPhone fields, 7,668 internal-ID fields, 2,702 personal-email-domain emails) — all logged to `data/raw/brokers/pdpl_audit.log`. New scraper script: `scripts/brokers/pf_scraper.py` (extends existing `dld_brokers_scraper.py` + `adrec_brokers_scraper.py` from v1.0 — those remain in place for the long-tail / RERA-canonical follow-up). Top-10 Dubai LAND_SPECIALIST + top-10 AD LAND_SPECIALIST tables for founder preview (§4). Sandbox blocks documented in §5; PDPL audit summary in §6. 7 open questions for founder in §7. No `src/` edits. No schema edits. No canonical edits. No main push. |

---

*End of broker-registry-acquisition-log.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/broker-registry-2026-04-26`.
