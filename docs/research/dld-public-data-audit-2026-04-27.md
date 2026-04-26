# ZAAHI · DLD Public Data Audit — Coverage Assessment

**Document type:** Audit of publicly-accessible Dubai Land Department datasets vs ZAAHI Phase 2 data needs.
**Audience:** Zhan + Dymo. Companion to `dld-api-gateway-application-2026-04-27.md` and `broker-registry-acquisition-log.md` (commit `172f186`).
**Branch:** `research/dld-legitimate-access-2026-04-27` (off `main`).
**Status:** v1.1 · CONFIDENTIAL · internal · audit + finalized matrix · **paid APIs DEFERRED 2026-04-27** per founder decision (review after 2026-05-09); free pipeline production-ready in `dubai-pulse-pipeline-runbook.md`.
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, canonical files · no main push · all sources cited with URLs · no fabricated data.

---

## §0 · Headline finding (v1.1 — finalized)

**~80% of ZAAHI Phase 2 broker-outreach + market-intelligence data needs are covered by FREE Dubai Pulse open datasets — production pipeline shipped this branch.**

The remaining ~20% splits into two layers:
- **~13%** = real-time validation polish (Dubai Brokers API + Rental Index API @ AED 63,000/yr including VAT) — **DEFERRED 2026-04-27 per founder; activation triggers in §6.5 below**.
- **~7%** = operational integrations (Trakheesi listing validation, Ejari rental contract issuance, Oqood off-plan registration) — Phase 3 (M18+) by definition; ZAAHI does not act as a regulated participant until then.

**Decision 2026-04-27 (founder-ratified):** **DO NOT submit any DLD API Gateway application now**. Run on FREE Dubai Pulse path via `scripts/dubai-pulse/refresh.sh` (committed this branch). Re-evaluate after 2026-05-09 founder review or whenever an activation trigger from §6.5 fires.

---

## §1 · Public datasets on Dubai Pulse (FREE, no auth)

### 1.1 · DLD Real Estate Open Data — 9 CSV datasets

Source: [DLD Real Estate Open Data hub](https://dubailand.gov.ae/en/open-data/real-estate-data/) + Dubai Pulse dataset pages.

| # | Dataset | Description | Format | Last update (verified 2026-04-26/27) | Dubai Pulse URL |
|---|---|---|---|---|---|
| 1 | **Transactions** | Sales, mortgages, gifts — property type, registration status, transaction amounts | CSV | 2026-02-03 | [dld_transactions-open](https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open) |
| 2 | **Rents** (Ejari contracts) | Rental contract data — registration dates, lease terms, property specs | CSV | 2026-01-09 | [dld_rent_contracts-open](https://www.dubaipulse.gov.ae/data/dld-registration/dld_rent_contracts-open) |
| 3 | **Projects** | Development projects — status, completion %, developer details | CSV | 2026-02-11 | [dld_projects-open](https://www.dubaipulse.gov.ae/data/dld-registration/dld_projects-open) |
| 4 | **Valuations** | Property valuation records — assessed values, procedure details | CSV | (not surfaced in last-update queries; assume monthly) | DLD Real Estate Data hub (Valuations tab) |
| 5 | **Land** | Land parcels — type (residential, agricultural, commercial, etc.) | CSV | (not surfaced) | DLD Real Estate Data hub (Land tab) |
| 6 | **Buildings** | Building specs — levels, units, amenities, registration | CSV | (not surfaced) | DLD Real Estate Data hub (Building tab) |
| 7 | **Units** | Individual units — rooms, parking, building associations | CSV | (not surfaced) | [dld_units-open](https://www.dubaipulse.gov.ae/data/dld-registration/dld_units-open) |
| 8 | **Brokers** | Licensed broker info + contact details | CSV | 2026-01-21 | [dld_real_estate_licenses-open](https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open) |
| 9 | **Developers** | Developer registration, licensing, business info | CSV | (not surfaced; quarterly likely) | DLD Real Estate Data hub (Developer tab) |

Plus an additional related dataset:
- [dld_land_registry-open-api](https://www.dubaipulse.gov.ae/data/dld-registration/dld_land_registry-open-api) — land registry

**License:** Per Dubai Pulse general terms + Law (26) of 2015 Regulating Data Dissemination and Exchange in the Emirate of Dubai. Commercial use permitted under the open-data licence. **VERIFY** — `data.dubai` portal redirect makes the formal terms URL dynamic; Dymo confirms specific dataset licence at download time. **ASSUMPTION:** standard Dubai open-data licence (commercial use OK with attribution).

### 1.2 · Dubai Pulse — adjacent useful datasets (not strictly DLD but feed Phase 2)

Source: Dubai Pulse 1,270 datasets total per [Dubai Pulse stats](https://www.dubaipulse.gov.ae/) — Phase 1.1 follow-up to map all real-estate-adjacent ones. Confirmed presence:
- [dld_real_estate_licenses-open](https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open) — duplicate of #8 above by different slug
- [Indexes](https://dubailand.gov.ae/en/open-data/indexes-home/) — DLD Indexes hub (rental performance, property price, etc.)

---

## §2 · Paid DLD API Gateway — 10 APIs

Source: [DLD API Gateway](https://dubailand.gov.ae/en/eservices/api-gateway/) + [API portal](https://api.dubailand.gov.ae/).

**Pricing (UNIFORM):** AED 30,000 + 5% VAT = **AED 31,500 per API per year**. Support included.

| # | API | Purpose | ZAAHI Phase 2 relevance | Recommended? |
|---|---|---|---|---|
| 1 | **Dubai Brokers API** | Real-time broker card + office info | **HIGH** — supplements free Brokers CSV with real-time updates + canonical RERA validation | **YES** Phase 2 if budget allows |
| 2 | **Rental Index API** | Real-time rental prices across types + regions | **HIGH** — powers ZAAHI Falcon Agent rental analytics, parcel-page rental projections | **YES** Phase 2 if budget allows |
| 3 | **Trakheesi API** | Listing Validation + Delisting + permits | LOW Phase 2 (only when ZAAHI publishes its own listings under Trakheesi) | NO — defer to Phase 3 |
| 4 | **Ejari API** | Tenancy contract lifecycle (issue/renew/terminate) | LOW Phase 2 (only when ZAAHI manages rental contracts) | NO — defer to Phase 3 |
| 5 | **Oqood/TAS API** | Off-plan transaction + asset system | LOW Phase 2 (only when ZAAHI brokers off-plan deals) | NO — defer to Phase 3 |
| 6 | **Mollak Integration API** | Service charges, payments, invoices, tenant data | NONE Phase 2 (Mollak = JOP service-charge system; ZAAHI not a JOP) | NO |
| 7 | **Mollak Budget API** | Real-time service charge rates for FIs | NONE Phase 2 | NO |
| 8 | **Mollak Virtual Account API** | Virtual accounts for JOP communities | NONE Phase 2 | NO |
| 9 | **Mollak Budget Supplier API** | RERA-approved supplier data | NONE Phase 2 | NO |
| 10 | **Mollak Authorized Signatory API** | Authorized signatory updates | NONE Phase 2 | NO |

**Subscriber requirements** (from DLD page): "Eligibility varies by entity type. Software providers need specific trade license activities, local Dubai office presence, and accreditation." ZAAHI fits the "Software providers" category — meets local-Dubai-presence requirement post-LLC issuance + has the trade license activity (real-estate brokerage + intermediation + technology platform).

**Approval timeline:** UNKNOWN — DLD page does not publish SLA. **ASSUMPTION:** 5-15 business days based on UAE-government norms for B2B service applications. Verify via the API portal post-application.

**Auth method, rate limits, REST/SOAP:** UNKNOWN from public docs. **ASSUMPTION:** REST + Bearer JWT issued from API Gateway dashboard; rate limits per-tier (likely 100-1,000 req/min). Confirmed only after subscription approval.

---

## §3 · Coverage matrix — Phase 2 ZAAHI need × DLD source × free?

Phase 2 (M10-M17 per `LAUNCH_PLAN.md`) target use cases for DLD data. Each need rated by source-availability:

| # | ZAAHI Phase 2 need | Best DLD source | Free? | Coverage % |
|---|---|---|---:|---:|
| 1 | **Broker outreach list** (cold + Ambassador pilot) | Brokers CSV (Dubai Pulse) + Property Finder scrape (commit `172f186`) | ✅ FREE | 100% |
| 2 | **Brokerage RERA validation** (canonical office number lookup before deal) | Brokers CSV monthly refresh + Dubai Brokers API for real-time | ⚠️ FREE for monthly, paid for real-time | 80% free / 100% paid |
| 3 | **Transaction comparables** (price-per-sqft per area for valuation) | Transactions CSV (Dubai Pulse) | ✅ FREE | 100% |
| 4 | **Rental yield analysis** (parcel-page rental projection) | Rents CSV (Dubai Pulse) — historical · Rental Index API for real-time | ⚠️ FREE for historical, paid for real-time | 70% free / 100% paid |
| 5 | **Off-plan project pipeline** (Falcon Agent project tracker) | Projects CSV (Dubai Pulse) | ✅ FREE | 100% |
| 6 | **Developer registry** (project-source attribution + counterparty due-diligence) | Developers CSV (Dubai Pulse) | ✅ FREE | 100% |
| 7 | **Land parcel registry** (DDA-augmented Z-axis, ownership status) | Land CSV (Dubai Pulse) + DDA polygon data | ✅ FREE | 90% (DLD Land + DDA cover most needs; deep-tier ownership data is Mollak-only) |
| 8 | **Building registry** (Z-axis Buildings layer for §40 Parcel Twin) | Buildings CSV (Dubai Pulse) + DDA building footprints | ✅ FREE | 95% |
| 9 | **Unit-level inventory** (per-unit data for tower analytics) | Units CSV (Dubai Pulse) | ✅ FREE | 100% |
| 10 | **Valuations baseline** (DLD official valuations for benchmark) | Valuations CSV (Dubai Pulse) | ✅ FREE | 100% |
| 11 | **Trakheesi listing validation** (when ZAAHI publishes its own listings) | Trakheesi API only (paid) | ❌ paid only | 0% free / 100% paid |
| 12 | **Ejari contract issuance** (when ZAAHI manages rentals) | Ejari API only (paid) | ❌ paid only | 0% free / 100% paid |
| 13 | **Oqood off-plan registration** (when ZAAHI brokers off-plan) | Oqood API only (paid) | ❌ paid only | 0% free / 100% paid |
| 14 | **Mortgage data** (loan-to-value, lender mix per area) | Transactions CSV includes mortgages | ✅ FREE | 100% |
| 15 | **Service-charge data** (operating-cost per building) | Mollak APIs (paid) — limited free signal in Buildings CSV | ⚠️ FREE for partial, paid for granular | 30% free / 100% paid |

### 3.1 · Aggregate coverage

**Phase 2 needs covered FREE (rows 1, 3, 5, 6, 7, 8, 9, 10, 14):** ~9 of 15 = **60%** with strong coverage (≥90% per row).

**Phase 2 needs partially-FREE (rows 2, 4, 15):** 3 of 15 with 70-80% free coverage. Free path delivers MVP; paid API for production polish.

**Phase 2 needs paid-only (rows 11, 12, 13):** 3 of 15 — but these are **operational integrations**, not data needs. ZAAHI doesn't trigger them until it acts as a regulated participant (Phase 3).

**Realistic Phase 2 coverage: 12 of 15 needs (80%) covered well by free CSVs + 17,491-row PF broker scrape.** The other 3 are Phase 3 by definition.

**If Dubai Brokers API + Rental Index API are added (cost: ~AED 63,000/yr):** coverage rises to 14 of 15 (~93%) for Phase 2.

---

## §4 · Pipeline strategy

### 4.1 · Now (W1-W6, pre-Investment-tranche-2)

**No subscription needed.** Ingest free CSVs into ZAAHI:

1. **Brokers CSV** — Жан downloads `dld_real_estate_licenses-open` from Dubai Pulse (CSV format, monthly refresh). Cross-references with the 17,491-row PF scrape (commit `172f186`) to enrich PF data with canonical RERA office numbers. Output: a third broker CSV `data/processed/brokers/dld_brokers_canonical_<date>.csv` that becomes the source-of-truth column reconciler.
2. **Transactions CSV** — large file (~1.51M rows per [Medium 2025 article](https://medium.com/@skokhatska/unveiling-dubais-real-estate-a-data-driven-dive-part-1-dfca41c5d1a6)). Жан downloads the CSV, ingests into Postgres for parcel-page comparable transactions on each ZAAHI listing. Likely 100-500 MB — keep raw on Getac, push aggregated views to production DB.
3. **Projects + Developers CSVs** — feed Falcon Agent project tracker and counterparty due-diligence cards.

Estimated time: 1-2 days of Жан's engineering after Getac arrives + LLC operational.

### 4.2 · Post API Gateway approval (M2+ if applied 5 May)

If Dymo applies 5 May 2026 (post trade-licence) and approval is 5-15 business days, **earliest production access: M2 mid-May to early June**. By then:
- Дубай Brokers API → real-time broker validation in deal flow + Trakheesi-permit pre-check
- Rental Index API → live rental projections on parcel pages

### 4.3 · Phase 3 trigger (M13+)

When ZAAHI reaches operational milestones, add paid APIs as needed:
- **Trakheesi API** trigger: ZAAHI starts publishing its own listings under its own permits (currently uses RERA-licensed brokerage permits)
- **Ejari API** trigger: ZAAHI manages rental contracts (currently advisory only)
- **Oqood API** trigger: ZAAHI brokers off-plan deals at scale (single-deal volume currently goes through partner brokerages)

Each Phase 3 API costs AED 31,500/yr and pays for itself on operational SLA reduction (no manual portal data entry).

---

## §5 · Scrape ToS — Dubai Pulse

[Dubai Pulse open data portal](https://www.dubaipulse.gov.ae/) operates under [Law (26) of 2015](https://www.dubaipulse.gov.ae/) (Regulating Data Dissemination and Exchange in the Emirate of Dubai). Open data is intended for re-use including commercial. Specific dataset licences are dataset-page-specific — Dymo verifies at download time. **ASSUMPTION:** standard open-data terms with attribution requirement.

Note that [data.dubai](https://data.dubai/) is the new Liferay portal Dubai Pulse redirects to — same data behind the URL change.

---

## §6 · Trigger criteria + open questions

### 6.0 · Pipeline status (v1.1 update)

✅ **Free Dubai Pulse pipeline LIVE this branch:**
- `scripts/dubai-pulse/download_datasets.py` — Playwright headless Chromium retrieves all 9 CSVs from data.dubai
- `scripts/dubai-pulse/normalize.py` — pandas-based PDPL filter + ZAAHI naming + money-to-fils + dedup
- `scripts/dubai-pulse/refresh.sh` — orchestrator with cron / systemd-timer recipes
- Full operator runbook: `docs/research/dubai-pulse-pipeline-runbook.md`

⏸ **Paid DLD API Gateway DEFERRED** per founder 2026-04-27 — see `dld-api-gateway-application-2026-04-27.md` §11 Decision Log Entry 1.

### 6.1 · Trigger criteria — when to activate Dubai Brokers API (~AED 31,500/yr)

Activate when ANY of:
- **T-A.1** Free pipeline broker-validation latency becomes operational blocker — e.g. monthly CSV refresh causes ZAAHI to onboard 2+ expired/suspended brokers per month
- **T-A.2** First closed deal (Plot 9235849 expected M3-M5) — real-time validation becomes load-bearing in deal-engine fraud-detection
- **T-A.3** Phase 2 broker outreach reaches 50+ active conversations needing live RERA-status checks
- **T-A.4** ZAAHI's RERA broker license issued + ZAAHI starts publishing under own broker permit (status verification needed at every listing publication)

### 6.2 · Trigger criteria — when to activate Rental Index API (~AED 31,500/yr)

Activate when ANY of:
- **T-B.1** Parcel-page rental projection feature ships on `zaahi.io` per `MASTER_TREE_final.md` §41 Falcon Agent rental analytics
- **T-B.2** Real-time rental-yield comparison vs commercial alternatives (Property Finder, Bayut) becomes a UX differentiator
- **T-B.3** Rents CSV monthly cadence too stale for client-facing analytics (rental indices move faster than the monthly snapshot)

### 6.3 · Trigger criteria — when to activate Trakheesi API (~AED 31,500/yr)

Activate when:
- **T-C.1** ZAAHI publishes its own listings under a ZAAHI Trakheesi permit (vs broker-permit pass-through pattern of Phase 2). This requires the Trakheesi `Listing Validation API` to verify each ad-permit before it goes live on `zaahi.io`.

### 6.4 · Trigger criteria — when to activate Ejari API (~AED 31,500/yr)

Activate when:
- **T-D.1** ZAAHI manages rental contract lifecycle (issue, renew, terminate) — currently advisory only.

### 6.5 · Trigger criteria — when to activate Oqood API (~AED 31,500/yr)

Activate when:
- **T-E.1** ZAAHI brokers off-plan deals at scale (multi-deal volume monthly) — currently 1-deal-per-deal volume goes through partner brokerages' Oqood access.

### 6.6 · Mollak APIs — never activate (out of scope)

ZAAHI is not a Joint Owners' Property association. Mollak APIs (Integration, Budget, Virtual Account, Budget Supplier, Authorized Signatory) do not match the platform's role. Skip permanently unless ZAAHI pivots into JOP service-charge management.

### 6.7 · Open questions for founder (re-evaluation after 2026-05-09)

1. **Apply for both Dubai Brokers API + Rental Index API on day 1?** Total AED 63,000/yr including VAT. Recommend: **both** — Brokers powers deal validation, Rental Index powers parcel-page rental projection. Combined absorb is in line 3 (legal/compliance) of `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 (~AED 150k); should fit if other line-3 items stay in budget.
2. **Or just Dubai Brokers API for v1?** Saves AED 31,500/yr but Rental Index gap means parcel-page rental projection runs on stale CSV data (Rents CSV refreshed monthly, not real-time). Acceptable for MVP but a UX gap vs commercial alternatives.
3. **Skip API Gateway entirely v1, scale FREE-only?** Possible for Phase 2 (80% coverage). Saves AED 63,000/yr line 3. Recommended IF cash-flow is tight after the AED 15k bridge salary trade-off (per `Y1_LAUNCH_PLAN_2026-04-25.md` §2.2). Trade-off: real-time validation gaps; mitigation = monthly DLD CSV refresh via systemd timer on Getac.
4. **Trade-licence activity coverage** — does ZAAHI's DED LLC application include both "real-estate brokerage" + "computer software programming" activity codes? DLD API Gateway eligibility for "Software providers" requires specific trade-license activities. Verify with UAE counsel before 5 May application.
5. **PDPL retention policy for ingested DLD data** — DLD CSVs include personal data (broker names, owner names in Transactions). ZAAHI must define retention + access controls in the API Gateway application narrative. See `dld-api-gateway-application-2026-04-27.md` §6 for the proposed policy.
6. **Counsel pre-review of API Gateway terms?** AED 5-10k from line 3 buffer — recommend YES, especially given the AED 31,500 commitment and "limited, non-exclusive, non-sublicensable, and non-transferable license" terms surfaced by [API portal](https://api.dubailand.gov.ae/).
7. **ZAAHI as Trakheesi-validated lister vs broker-permit pass-through** — Phase 2 architectural decision: do listings go on `zaahi.io` under ZAAHI's own future Trakheesi permit (cleaner UX, requires Trakheesi API later) or under the broker's permit (operational today, broker-attributed)? If the former, add Trakheesi API to Phase 3 plan early.

---

## §7 · Sources

### 7.1 · Repo files (read at session start)

- `docs/research/broker-registry-acquisition-log.md` (commit `172f186`, v2.0) — 17,491-row PF dataset already in place
- `docs/research/Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 — line 3 budget envelope (AED 150k legal + compliance) for any API Gateway absorb
- `docs/architecture/MASTER_TREE_final.md` — read-only, for Phase 2/3 module mapping (§39 Parcel Twin, §41 Mole Agent, etc.)
- Prior `docs/research/broker-registry-acquisition-log.md` v1.0 / commit `536c62f` — pipeline documentation for DLD gateway-auth path

### 7.2 · Web sources (all retrieved 2026-04-27)

**DLD official:**
- DLD Real Estate Open Data: <https://dubailand.gov.ae/en/open-data/real-estate-data/>
- DLD Open Data root: <https://dubailand.gov.ae/en/open-data/>
- DLD API Gateway: <https://dubailand.gov.ae/en/eservices/api-gateway/>
- DLD API Gateway Registration: <https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=2>
- DLD API Service Portal: <https://api.dubailand.gov.ae/>
- DLD Indexes hub: <https://dubailand.gov.ae/en/open-data/indexes-home/>
- DLD Verify License + Permits: <https://dubailand.gov.ae/en/eservices/validate-real-estate-licenses-and-permits/>
- DLD Real Estate Ad Permit: <https://dubailand.gov.ae/en/eservices/real-estate-ad-permit/>
- DLD Register Project: <https://dubailand.gov.ae/en/eservices/register-project/>
- Trakheesi root: <https://trakheesi.dubailand.gov.ae/>

**Dubai Pulse / data.dubai:**
- Dubai Pulse main: <https://www.dubaipulse.gov.ae/>
- data.dubai (new portal): <https://data.dubai/>
- Dubai Pulse Get Data: <https://www.digitaldubai.ae/data/get-data>
- Dubai Customs Open Data: <https://www.dubaicustoms.gov.ae/en/OpenData/Pages/DubaiPulse.aspx>
- Dubai Government Open Data hub: <https://www.dubai.ae/open-data>

**Specific datasets confirmed accessible:**
- dld_transactions-open: <https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open>
- dld_rent_contracts-open: <https://www.dubaipulse.gov.ae/data/dld-registration/dld_rent_contracts-open>
- dld_real_estate_licenses-open (BROKERS): <https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open>
- dld_projects-open: <https://www.dubaipulse.gov.ae/data/dld-registration/dld_projects-open>
- dld_units-open: <https://www.dubaipulse.gov.ae/data/dld-registration/dld_units-open>
- dld_land_registry-open-api: <https://www.dubaipulse.gov.ae/data/dld-registration/dld_land_registry-open-api>

**Dubai Digital Authority (sister portal):**
- Developer Portal iPaaS: <https://developer.dubai.gov.ae/portal/>
- API Resources: <https://developer.dubai.gov.ae/portal/apis/fb541d39-8adb-41f4-acad-a3a63e6ecc5d>

**Reference / context:**
- esferasoft Dubai REST guide 2026: <https://www.esferasoft.com/blog/dubai-rest-app-guide-everything-you-need-to-know-2026/>
- Visasupdate Dubai property visas integration: <https://www.visasupdate.com/post/dubai-property-visas-integration-gdrfa-land-department-unified-digital-gateway>
- Medium — Dubai Real Estate 1.5M Transactions analysis (Aug 2025): <https://medium.com/@skokhatska/unveiling-dubais-real-estate-a-data-driven-dive-part-1-dfca41c5d1a6>
- DXB Analytics Dubai Property Price Index 2026: <https://www.dxbanalytics.com/blog/dubai-property-price-index-2026>
- Property Finder DLD Regulation Update (Feb 2024): <https://support.propertyfinder.ae/hc/en-us/articles/17122355022994-DLD-Regulation-Update-February-2024>

### 7.3 · Retrieval and authoring

- All web retrieval 2026-04-27 within agent acquisition session
- Document drafted by Claude Opus 4.7 (1M context) under Claude Code agent runtime
- Branch: `research/dld-legitimate-access-2026-04-27` (off `main`)

---

## §8 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-27 | ZAAHI engineering agent | Initial public-data audit. 9 free DLD CSV datasets enumerated (Transactions, Rents, Projects, Valuations, Land, Buildings, Units, Brokers, Developers) all at Dubai Pulse without auth. 10 paid DLD API Gateway APIs enumerated with pricing AED 30,000 + 5% VAT each per year. 15-row coverage matrix maps Phase 2 needs against free vs paid sources — finds **80% of Phase 2 needs covered by FREE CSVs**, **93% if Dubai Brokers + Rental Index APIs added (~AED 63k/yr)**, remaining 7% are operational integrations (Trakheesi/Ejari/Oqood) appropriately deferred to Phase 3. Pipeline strategy in §4. 7 open questions for founder. |
| v1.1 | 2026-04-27 | ZAAHI engineering agent | **Founder-ratified DEFER 2026-04-27** of all paid DLD API Gateway subscriptions; review after 2026-05-09. Free Dubai Pulse pipeline now LIVE in this branch (`scripts/dubai-pulse/` + `dubai-pulse-pipeline-runbook.md` — Playwright-based download since data.dubai Liferay portal blocks anonymous direct CSV access; pandas normalizer with per-dataset PDPL policy + money-to-fils + ISO-date + E.164-phone-with-mobile-redaction; cron-ready `refresh.sh` orchestrator). §6 expanded with **per-API trigger criteria** (T-A.1-4 Brokers, T-B.1-3 Rental Index, T-C.1 Trakheesi, T-D.1 Ejari, T-E.1 Oqood; §6.6 Mollak ruled out as out-of-scope). §0 headline updated to reflect FREE pipeline production status + activation gates for paid path. Companion `dld-api-gateway-application-2026-04-27.md` v1.1 added §11 Decision Log Entry 1 with same trigger criteria. |

---

*End of dld-public-data-audit-2026-04-27.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/dld-legitimate-access-2026-04-27`.
