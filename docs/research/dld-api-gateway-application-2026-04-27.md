# ZAAHI · DLD API Gateway Application — Ready-to-Submit Draft

**Document type:** Draft narrative for the DLD API Gateway business-account application form.
**Audience:** Dymo (submitter, post-trade-licence on or after 2026-05-05). Companion to `dld-public-data-audit-2026-04-27.md`.
**Branch:** `research/dld-legitimate-access-2026-04-27` (off `main`).
**Status:** v1.0 · CONFIDENTIAL · internal · Dymo-ready · pending counsel review (~AED 5-10k from line 3 buffer per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2).
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, canonical files · no main push.

---

## §0 · How to use this document

1. **Wait for trade licence issuance** (target W3-W4 per `Y1_LAUNCH_PLAN_2026-04-25.md` cash-flow §3.2).
2. **Open the registration portal:** [DLD API Gateway Registration](https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=2). The general info page is at [DLD API Gateway](https://dubailand.gov.ae/en/eservices/api-gateway/).
3. **Paste the §3 narrative as the use-case description** when prompted. Adjust the company-info section (§2) with the final LLC name + RERA broker registration number.
4. **For each requested API,** copy the per-API justification from §4 into the form's "Reason for use" field.
5. **Counsel pre-review** strongly recommended before submission (AED 5-10k from line 3 buffer). Specifically the data retention + cross-border transfer language in §6.

**Recommended submission scope (per `dld-public-data-audit-2026-04-27.md`):** apply for **two** APIs only on day 1 — Dubai Brokers API + Rental Index API. Combined cost AED 63,000/yr including VAT. Trakheesi/Ejari/Oqood/Mollak APIs remain Phase 3 triggers.

---

## §1 · Application checklist (gate criteria)

Verify each item is satisfied before submission. Anything not ✅ blocks the application.

| # | Requirement | Status | Notes |
|---|---|:-:|---|
| 1 | DLD business account active at [dubailand.gov.ae/en/dubai-rest/](https://dubailand.gov.ae/en/dubai-rest/) | ☐ | Дымо registers — free; uses Emirates ID OR UAE Pass |
| 2 | DED Mainland trade licence issued | ☐ | Per Y1_LAUNCH_PLAN W3-W4 |
| 3 | RERA Company Broker Licence issued | ☐ | Per Y1_LAUNCH_PLAN W6 (line 3 §2.3) |
| 4 | Dubai office address (Ejari'd) | ☐ | Virtual Dubai address per Y1_LAUNCH_PLAN line 11 |
| 5 | Trade licence activities include software-programming AND real-estate brokerage | ☐ | UAE counsel confirms before LLC filing — see §1.1 |
| 6 | UBO declaration filed | ☐ | Per Y1_LAUNCH_PLAN compliance §5.1 |
| 7 | Corporate Tax registration filed via EmaraTax | ☐ | Per Y1_LAUNCH_PLAN §5.1 |
| 8 | goAML registration filed | ☐ | Per Y1_LAUNCH_PLAN §5.1 |
| 9 | Privacy policy + cookie banner live on `zaahi.io` | ☐ | Per Y1_LAUNCH_PLAN §5.2 in-house counsel-template |
| 10 | Bank account opened (Wio Business per Y1_LAUNCH_PLAN §3.2) — for the AED 31,500 × N annual fee | ☐ | |
| 11 | Counsel pre-review of API Gateway terms completed | ☐ | AED 5-10k from line 3 buffer |
| 12 | Founder joint sign-off on the application narrative below | ☐ | Per FOUNDER_DIRECTIVE-2026-04-24 GOV-2 |

### 1.1 · Trade-licence activity codes (counsel verifies)

DLD's API Gateway eligibility for "Software providers" requires specific trade-licence activities. Per public DLD criteria + UAE Mainland LLC norms, verify the LLC application includes at least:

- **Real estate brokerage** activity (DED activity code typically 6820001)
- **Software programming** OR **Information technology consultancy** activity (commonly 6201001 / 6202005)
- **Property consultancy** activity (commonly 6820002)

Counsel confirms the exact activity-code combination required for "Software provider" eligibility. **ASSUMPTION:** the trio above is sufficient. If DLD requires a specific "API integrator" or "real estate technology platform" activity code, add it to the LLC amendment list before §1 row #2.

---

## §2 · Applicant company information (paste-ready)

Replace placeholders [BRACKETED] with confirmed details at submission time.

```
APPLICANT COMPANY:
  Trade Name (English):           ZAAHI [LLC suffix per DED issuance]
  Trade Name (Arabic):            [Per DED Arabic registration]
  Trade Licence Number:           [DED licence number — issued W3-W4]
  RERA Office Number:             [Issued W6]
  Establishment Card Number:      [Issued W3-W4]
  Date of Establishment:          [DED issuance date]
  Legal Form:                     LLC Mainland
  Trade Licence Activities:       Real Estate Brokerage; Software Programming; Property Consultancy
                                  (full activity codes per LLC certificate)
  Registered Address:             [Al Jurf 1st floor — physical] +
                                  [Dubai virtual office address — RERA-compliant]
  P.O. Box:                       [As issued]

PRIMARY CONTACT (Dymo):
  Full Name:                      Dmytro (Dymo) Tsvyk
  Position:                       Co-founder, Operations Principal
  RERA Broker Card Number:        [Issued W5]
  Mobile:                         [Dymo's UAE business mobile]
  Email:                          dymo@zaahi.io  (active W4-W6 post-LLC)
  Alternative Email:              d.tsvyk@gmail.com  (interim until @zaahi.io live)

TECHNICAL CONTACT (Жан):
  Full Name:                      Zharkyn (Zhan) Ryspayev
  Position:                       Founder, CEO/CTO
  RERA Broker Card Number:        [Issued W5]
  Mobile:                         [Zhan's UAE business mobile]
  Email:                          zhan@zaahi.io
  Alternative Email:              zhanrysbayev@gmail.com
  Years in Real Estate:           17
  Engineering Background:         Full-stack platform architect, ZAAHI sole engineer

PRIMARY DOMAIN:                   https://zaahi.io
INFRASTRUCTURE LOCATION:          UAE — production hosted on Vercel (US edge) with active
                                  Spec 05 migration plan to Core42 G42 sovereign cloud
                                  (Abu Dhabi region) targeted for cutover Q1 2027.
                                  Database: Supabase PostgreSQL (eu-central-1 transitional,
                                  migrating to G42 per sovereignty roadmap).
```

---

## §3 · Use case narrative (main application body — paste-ready)

```
ZAAHI — Use case for Dubai Land Department API Gateway

ZAAHI is a sovereignty-first real-estate platform building a regulator-aligned
operating system for the Dubai (and broader UAE) real-estate market. The
platform is RERA-licensed Mainland LLC operations + a 12-block technology
platform spanning land, transactions, valuation, AI-assisted advisory,
metaverse parcel views, blockchain audit trail, and compliance.

We request DLD API Gateway access to integrate the official DLD source-of-truth
data into the ZAAHI platform with the following discrete use cases:

USE CASE 1 — Real-time broker validation in deal flow (Dubai Brokers API)
For every deal initiated on the ZAAHI platform, the platform validates the
RERA office number and broker card of the participating brokerage in real
time against the official DLD register. This prevents:
  - Fraudulent listings by expired-licence brokers
  - Unintentional engagement with delisted brokerage offices
  - Trakheesi-permit validation failures at the listing stage
The validation runs server-side in the ZAAHI deal-engine module per CLAUDE.md
SECURITY RULES (fraud detection on new account + large deal). Anticipated
volume: 10-100 broker lookups per day Y1, scaling to 500-2,000 per day Y2 as
deal-flow ramps.

USE CASE 2 — Real-time rental projection on parcel pages (Rental Index API)
The ZAAHI parcel page (one of the canonical user-facing surfaces) displays a
projected rental yield based on DLD Rental Index for the relevant area, type,
and floor. Today this would run on monthly Dubai Pulse Rents CSV data, which
is sufficient for trend analysis but lags real-time market shifts. The API
unlocks live projections that match current DLD-published index values exactly.
Anticipated volume: 100-1,000 lookups per day Y1 (one per parcel-page view of
the 114 currently-listed plots), scaling with platform user growth.

ZAAHI does NOT request, at this time:
  - Trakheesi API: ZAAHI uses partner-brokerage Trakheesi permits in Phase 2;
    will request the API when ZAAHI publishes listings under its own permit
    in Phase 3 (M18+).
  - Ejari API: ZAAHI does not manage rental contracts in Phase 2 (advisory
    only); will request when operational role triggers.
  - Oqood API: same — Phase 3 trigger when ZAAHI brokers off-plan deals at
    scale.
  - Mollak APIs: ZAAHI is not a Joint Owners' Property association; not in
    scope.

INTEGRATION ARCHITECTURE
The DLD API Gateway will be called from the ZAAHI server-side deal-engine
module (Next.js Route Handlers per CLAUDE.md SECURITY RULES). The Bearer
token issued from the API Gateway dashboard is stored as a server-side
environment variable (.env.local, never committed) per ZAAHI sovereignty
posture. No DLD data is ever proxied through the client — all calls are
server-to-server. ZAAHI's RLS policies on the Postgres data layer ensure
that even logged-in users cannot read another user's DLD-sourced lookup
results. All DLD data accessed via the API is logged in the ZAAHI audit
trail (block L Operations · Spec L1 audit log) for compliance review.

SOVEREIGNTY POSTURE
ZAAHI's long-term sovereignty roadmap (Spec 05 Auth Abstraction · target
cutover Q1 2027) migrates production to Core42 G42 sovereign cloud (Abu
Dhabi region). The DLD API Gateway integration will move with the
migration; tokens will be reissued post-migration. No DLD data crosses
borders out of UAE infrastructure post-migration.
```

---

## §4 · Per-API justification (paste into per-API "Reason for use" field)

### 4.1 · Dubai Brokers API

```
JUSTIFICATION — Dubai Brokers API

ZAAHI requires real-time broker card and broker office validation for every
deal initiated on the platform. The validation prevents fraudulent listings
(expired licence brokers), unintentional engagement with delisted brokerage
offices, and Trakheesi-permit validation failures.

Specific endpoints requested (per [DLD API Gateway] documentation):
  - Broker card lookup by BRN
  - Broker office lookup by RERA office number
  - Status verification (ACTIVE / EXPIRED / SUSPENDED)
  - Real-time updates webhook (if available) for status changes

Volume estimate Y1: 10-100 lookups per day (peak 200 during high deal-flow
weeks). Scaling Y2-Y3: 500-2,000 lookups per day.

Read-only access — ZAAHI never writes to DLD systems via this API. The
canonical broker register remains DLD's; ZAAHI consumes for validation only.

Data-retention: lookup results cached server-side for 24 hours to reduce
duplicate calls; canonical record never persisted beyond cache TTL — for
each new transaction, a fresh lookup is made to ensure status currency.
```

### 4.2 · Rental Index API

```
JUSTIFICATION — Rental Index API

ZAAHI requires real-time rental price index data for parcel-page rental
projections. Today the platform would compute projections from monthly
Dubai Pulse Rents CSV, which lags 7-30 days behind real-time market.

Specific endpoints requested:
  - Rental index lookup by area + property type + bedrooms + floor band
  - Time-series rental index for area-level trend visualisation
  - Source attribution metadata (DLD registration date of underlying contracts)

Volume estimate Y1: 100-1,000 lookups per day (one per parcel-page view of
the 114 currently-listed plots). Scaling: 5,000-20,000 lookups per day at
1,000+ active listings.

Read-only — ZAAHI does not contribute rental data via this API.

Data-retention: index values cached server-side for 1 hour (rental indices
move slower than tick-by-tick); cache ID includes API call parameters so a
subsequent identical lookup returns the cached value without a fresh API
call. Cache invalidates daily at 02:00 UTC to align with DLD's typical
overnight refresh.
```

---

## §5 · Security controls (paste into security/compliance section)

```
SECURITY POSTURE — ZAAHI platform

1. Authentication: Supabase Auth with Email/Password + (Phase 2) UAE Pass
   integration. Sign-up requires admin approval (AuthGuard on every
   protected page; PUBLIC_API allow-list intentionally tiny per CLAUDE.md
   SECURITY RULES). Brute-force protection via rate-limit middleware.

2. Authorisation: Postgres Row-Level Security (RLS) active on all tables
   (CLAUDE.md SECURITY RULES). Server-side `getApprovedUserId()` validation
   on every protected API route (CLAUDE.md). DLD API Gateway tokens scoped
   to a service-account user with no broader DB privileges.

3. Token storage: DLD Bearer JWT stored server-side only as environment
   variable (Vercel Settings → Environment Variables; never committed to
   git, listed in .gitignore). Token rotation on DLD-published cadence
   (assumed 90 days; confirmed at API approval). Token never proxied to
   client-side bundle.

4. Transport: HTTPS-only end-to-end (TLS 1.3 on Vercel edge; HTTP→HTTPS
   redirect at edge). Server-to-server calls to gateway.dubailand.gov.ae
   use Node.js native fetch with explicit Host header validation.

5. Logging: every DLD API call logged to ZAAHI audit trail (Spec L1 audit
   module per Master Tree §44 IoT/Operations). Log retains: timestamp,
   endpoint, response status, calling user-id (if user-initiated), but
   NOT the raw response body to minimise PDPL data residue.

6. Rate-limiting: client-side rate limit per ZAAHI user (max 50 broker
   lookups/hour, 200 rental-index lookups/hour) prevents abuse and
   protects the DLD-side quota.

7. Incident response: any DLD-side 4xx/5xx response triggers ZAAHI
   alerting (PagerDuty or equivalent). Suspicious response patterns
   (e.g. 401 spikes) auto-disable the integration and notify Жан.

8. Cross-border data transfer: while production currently runs on
   Vercel (US edge) and Supabase (eu-central-1 Frankfurt), neither stores
   raw DLD response bodies — only structural metadata. Post-Spec 05
   migration to Core42 G42 sovereign cloud (Q1 2027), DLD data never
   leaves UAE infrastructure.

9. Vendor sovereignty: ZAAHI uses ZERO Vercel-only APIs (per CLAUDE.md
   Sovereignty Readiness Rules) — application is portable to any
   Docker-compatible environment via `docker-compose up`. The DLD API
   integration moves with the platform.
```

---

## §6 · Data-retention + PDPL policy (paste into compliance section)

```
DATA RETENTION & UAE PDPL (Federal Law 45/2021) COMPLIANCE

ZAAHI commits to the following retention + processing policy for DLD
API-sourced data:

A. CACHE RETENTION (technical)
   - Broker lookup results: server-side cache, TTL 24 hours
   - Rental Index values: server-side cache, TTL 1 hour
   - No raw DLD response body persisted beyond cache TTL
   - Cache stored in Postgres with RLS; expires automatically

B. AUDIT LOG RETENTION (compliance)
   - API call metadata (timestamp, endpoint, status, user-id) retained
     for 7 years per UAE Commercial Companies Law document-retention norms
     and PDPL Art. 12 record-keeping
   - Raw API response BODIES are NOT logged (only metadata)
   - Audit logs cross-border-transferred only post-Spec 05 G42 migration
     completion (Q1 2027 target — interim retained on existing
     Frankfurt-region Supabase under PDPL Art. 22-23 'adequate jurisdiction'
     reading or contractual safeguards)

C. ENRICHMENT / DERIVATIVE DATA
   - Broker validation results may be cached as a UI-state flag on
     ZAAHI listing records ("Verified RERA active 2026-04-27"); the
     flag is non-personal-data, derived statistic
   - Rental Index values surface as projections on parcel pages —
     attributed to DLD as source; no third-party sub-licensing

D. PERSONAL DATA HANDLING (PDPL ART. 5)
   - DLD API responses include personal data (broker names, owner names
     in transaction lookups). ZAAHI's lawful basis is contract performance
     (Art. 5(c)) when the user is the broker themselves, OR legitimate
     interests (Art. 5(f)) for due-diligence on counterparty brokers
   - ZAAHI's privacy policy on zaahi.io discloses DLD as a data source
     and the purposes of processing
   - Data subject rights (access, correction, erasure under PDPL Art. 14-17)
     are honoured via the ZAAHI account-settings page; for DLD-sourced
     personal data that ZAAHI does not control upstream, requests are
     forwarded to DLD with a confirmation receipt to the data subject

E. BREACH NOTIFICATION
   - Any incident affecting DLD-sourced data triggers: (i) immediate
     notification to DLD via the API Gateway dashboard support channel;
     (ii) UAE Data Office notification within 72 hours per PDPL Art. 9;
     (iii) affected data subject notification within the same window
   - Breach response runbook held in docs/decisions/incident-response.md
     (post-LLC operationalisation)

F. CORPORATE TAX, AML, COUNTER-TERRORISM COMPLIANCE
   - ZAAHI is registered for UAE Corporate Tax via EmaraTax (W3-W4
     post-LLC per Y1_LAUNCH_PLAN compliance §5.1)
   - goAML registration filed within 30 days of RERA licence issuance
     (W6 per Y1_LAUNCH_PLAN); broker validations via DLD API support
     ZAAHI's AML KYC discipline on transaction counterparties
   - UBO declaration filed within 60 days per Cabinet Decision 58/2020

G. DATA MINIMISATION (PDPL ART. 4)
   - ZAAHI stores only the FIELDS needed for its operational use case
     from DLD responses — not the full API payload
   - For Brokers API: stores only RERA number, name, status, expiry —
     not nationality, photo, or other published fields
   - For Rental Index API: stores only the index value + metadata —
     not the underlying contract IDs or party names
```

---

## §7 · Submission cover note (optional — paste into 'Additional notes' field)

```
ZAAHI is a UAE Mainland LLC building a sovereignty-aligned real-estate
operating platform. We are deliberately requesting only the two APIs
(Dubai Brokers + Rental Index) that match Phase 2 (M10-M17) operational
needs of our launch plan. We commit to add Trakheesi, Ejari, and Oqood
APIs in Phase 3 when our operational role triggers — at that point we
will return to the API Gateway with a phased subscription request.

We have already invested in the legitimate path: 17,491-row PDPL-filtered
broker registry from public Property Finder data is in place as a Phase
1 starting point, and the Dubai Pulse free CSVs (Brokers, Transactions,
Rents, Projects, Developers) are integrated as the public-data baseline.
The API Gateway adds the real-time validation layer that the free CSVs
cannot deliver.

We welcome a brief technical alignment call with the DLD API Gateway team
post-approval to confirm rate limits, token rotation cadence, and any
ZAAHI-specific test endpoints DLD wishes us to use during initial
integration.

Founders are available at:
  Zhan Ryspayev (CEO/CTO)        — zhan@zaahi.io      — [mobile]
  Dymo Tsvyk (Operations Principal) — dymo@zaahi.io     — [mobile]
```

---

## §8 · Open questions for founder (resolve before submission)

1. **Scope confirmation:** Dubai Brokers API + Rental Index API only on day 1 (AED 63,000/yr including VAT)? Or just Dubai Brokers API for v1 (AED 31,500/yr)? See `dld-public-data-audit-2026-04-27.md` §6 question 2.
2. **Trade-licence activity codes:** counsel verifies the trio (real-estate brokerage + software programming + property consultancy) is sufficient for "Software provider" eligibility?
3. **Counsel pre-review of API Gateway terms** — recommend YES at AED 5-10k from line 3 buffer. Specifically validate the §6 retention policy + §5.8 cross-border-transfer language hold up under PDPL Art. 22-23.
4. **`zaahi.io` privacy policy live before submission?** DLD may inspect to verify the data-processing disclosure. Per Y1_LAUNCH_PLAN W4 milestone, this is in scope; verify it's actually live before clicking submit.
5. **Founder sign-off on §3 narrative + §6 retention policy** — joint sign-off per FOUNDER_DIRECTIVE-2026-04-24 GOV-2.
6. **Backup contact email** — keep `zhanrysbayev@gmail.com` / `d.tsvyk@gmail.com` as alternates? Or strictly `@zaahi.io`? Recommend keeping both — DLD may need a back-channel during the LLC issuance gap.
7. **Spec 05 migration timing in the application narrative** — is "Q1 2027 cutover" the right framing, or should it be more conservative (e.g. "by 2027")? Recommend the stated Q1 2027 — matches FOUNDER_DIRECTIVE-2026-04-24 §4.4.

---

## §9 · Sources

- [DLD API Gateway service description](https://dubailand.gov.ae/en/eservices/api-gateway/)
- [DLD API Gateway Registration portal](https://dubailand.gov.ae/en/eservices/api-gateway-registration?appId=2)
- [DLD API Service Portal](https://api.dubailand.gov.ae/)
- [DLD Dubai REST root](https://dubailand.gov.ae/en/dubai-rest/)
- [Dubai Digital Authority Developer Portal](https://developer.dubai.gov.ae/portal/)
- `dld-public-data-audit-2026-04-27.md` (this branch) — for coverage rationale + recommendation for which APIs to request
- `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 — line 3 budget, compliance §5.1, cash-flow §3.2 timing
- `FOUNDER_DIRECTIVE-2026-04-24.md` — GOV-1 (silent-investor), GOV-2 (joint sign-off), §4.4 (Spec 05 timeline)
- `CLAUDE.md` — SECURITY RULES, Sovereignty Readiness Rules
- `broker-registry-acquisition-log.md` (commit `172f186`) — Phase 1 broker baseline already in place

---

## §10 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-27 | ZAAHI engineering agent | Initial paste-ready application narrative for DLD API Gateway. §1 12-row gate checklist (DLD account, trade licence, RERA, UBO, CT, goAML, privacy policy, bank, counsel review, founder sign-off, plus trade-licence activity-code verification). §2 applicant company info template. §3 main use-case narrative justifying Dubai Brokers + Rental Index APIs (deliberately scoped to Phase 2 needs only). §4 per-API justifications with volume estimates (10-100 broker lookups/day Y1, 100-1,000 rental-index lookups/day Y1). §5 9-control security posture (Supabase Auth + RLS, server-side token, HTTPS, audit log, rate limit, incident response, cross-border posture, vendor sovereignty). §6 7-section data-retention + PDPL policy (cache TTL, audit retention, derivative data, personal data handling, breach notification, CT/AML compliance, data minimisation). §7 optional cover note. §8 7 open questions for founder before submission. Counsel pre-review (~AED 5-10k from line 3 buffer) recommended before submission. No `src/` edits. No schema edits. No canonical edits. No main push. |

---

*End of dld-api-gateway-application-2026-04-27.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/dld-legitimate-access-2026-04-27`.
