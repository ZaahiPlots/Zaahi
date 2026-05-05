# Feasibility v6.0 — Distribution, Legal & Moat

**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `03_UX_FULLSCREEN_AND_DIFF.md`
**As of:** 5 May 2026

This file specifies the **public surface** at `zaahi.io/feasibility`,
the **anonymous telemetry** captured for product analytics, the
**three-tier competitive moat** that prevents competitive scraping
from undermining the calculator's commercial value, the **legal
disclaimer + Terms acceptance flow**, and the **RERA approval
pathway research** that determines whether the public methodology
needs Dubai regulator pre-approval.

---

## §1 Public URL architecture

### §1.1 Route

```
Production : https://zaahi.io/feasibility
Development: http://localhost:3000/feasibility
```

- Implemented as `src/app/feasibility/page.tsx` (per `03_UX_FULLSCREEN_AND_DIFF.md` §8.3).
- **No authentication required.** Calculator works for anonymous visitors.
- **No subdirectory** like `/tools/feasibility` or `/calc/feasibility` — top-level slot reserved deliberately to signal product priority.
- **No email gate.** The calculator never blocks calculation behind a "give us your email" wall. The email capture is post-hoc and optional (see §1.3).

### §1.2 Middleware allow-list

`src/middleware.ts` `PUBLIC_API` allow-list (per CLAUDE.md `SECURITY
RULES`) extends with **two** new entries:

```typescript
PUBLIC_API = [
  '/api/auth',                  // existing
  '/api/notify-admin',           // existing
  '/api/referral-waitlist',      // existing (Phase A referral)
  '/api/feasibility/preset',     // NEW — read-only preset lookup
  '/api/feasibility/share',      // NEW — POST to mint share slug
];
```

The preset endpoint serves the lagged-public tier values (per
`02_CONSTRUCTION_COST_DATABASE.md` §4); it does NOT expose the
current-quarter table to anonymous visitors. The share endpoint
accepts a calculation snapshot and returns a slug — no PII required.

### §1.3 Optional account creation flow

After a user runs a calculation, the result panel surfaces a
**soft prompt** (not blocking):

```
[ Save this calculation ]   →   modal: "Sign up to save scenarios
                                          across sessions and access
                                          quarterly fresh data tier.
                                          Free 7-day trial."
                                       [ Sign up ]   [ Skip — keep
                                                       in browser
                                                       only ]
```

Skipping preserves the calculation in `localStorage` and produces a
read-only `/feasibility/r/{slug}` link the user can share. **The
calculator is never blocked behind sign-up.**

### §1.4 Sharing — `/feasibility/r/{slug}`

```
GET /feasibility/r/abc12345

Renders read-only fullscreen view of the calculation.
- All inputs visible
- All diff badges visible (so reviewer sees deviation from market)
- All results visible
- "Open editable copy" button → spawns a new client-side
  calculation seeded from this slug
- No PII shown unless explicitly attached (e.g. the original creator
  signed in and chose to display their name)
```

**Slug format:** `crypto.randomUUID()` truncated to first 8
characters of the base-32 representation. 32^8 ≈ 1.1 trillion
combinations — collision-safe at any conceivable scale.

**Storage:**
- Anonymous slugs: stored in Supabase `SharedFeasibilityCalc` table
  (FOUNDER RATIFY exact schema in §99). No `userId` reference.
- Authenticated slugs: same table, with optional `userId` foreign
  key.
- Retention: anonymous slugs auto-expire after **180 days** of no
  visits. Authenticated slugs persist until user-deleted.

### §1.5 PDF export

Available without authentication. PDF carries the public-tier
disclaimer (§4) on every page. Generated via the same weasyprint
pipeline used in the investor-package Phase C
(`docs/viktor-package/build_pdfs.py`) — proven, idempotent, ~6 s for
a 14-doc set so a single feasibility PDF takes <1 s.

---

## §2 Telemetry — anonymous, no PII

The calculator captures product analytics for prioritisation. **No
PII**, no IP fingerprinting beyond Cloudflare's anti-bot signals.

### §2.1 Events captured

| Event | Captured fields |
|---|---|
| `calc_start` | `engine`, `district` (canonical from list, not free-text), `subClass`, `projectSizeBand`, `tier` (`public` or `paid`), `viewport` (`mobile` / `tablet` / `desktop`), `lang` (`en` / `ar`) |
| `calc_complete` | All `calc_start` fields + `primary_metric_bin` (e.g. ROI 20-25 %, ROI 25-30 %; see §2.2) + `verdict` (`strong` / `moderate` / `below`) + `time_to_complete_ms` |
| `field_override` | `field_slug`, `delta_bin` (`<5%`, `5-15%`, `15-30%`, `>30%` above / below) — never the absolute value |
| `pdf_export` | `engine`, `tier`, `viewport`, `lang` |
| `share_link_created` | `engine`, `tier` |
| `share_link_visited` | `engine` (visitor), `lang` |
| `account_signup_prompted` | (boolean) — to measure conversion funnel |
| `account_signup_completed` | `from_calc` flag |

### §2.2 Binning policy

Aggregate metrics binned, not exact, to prevent re-identification of
specific deals:

```
ROI / Yield bins:    <5%, 5-10%, 10-15%, 15-20%, 20-25%, 25-30%, 30-50%, >50%
NPV bins (AED):      <0, 0-1M, 1-5M, 5-25M, 25-100M, 100-500M, 500M-1B, >1B
Plot area bins (sqft): <5k, 5-10k, 10-25k, 25-50k, 50-100k, 100-500k, >500k
Land cost bins (AED): <1M, 1-5M, 5-15M, 15-50M, 50-200M, 200M-1B, >1B
Delta bins (override vs market): <5%, 5-15%, 15-30%, >30%
```

### §2.3 Storage

Captured by an **internal endpoint** `/api/telemetry/feasibility` —
NOT a third-party analytics service (Google Analytics, Mixpanel,
Hotjar). Data lives in a dedicated Supabase table accessible only by
admin role (Zhan / Dymo per CLAUDE.md). No cookies set beyond the
existing ZAAHI session cookie (which is absent for anonymous
calculations).

### §2.4 Goal — not user tracking

The exclusive purpose: **product-roadmap prioritisation.** Examples
of decisions this telemetry should drive:
- Which districts under-perform → which districts to pull deeper data for.
- Which engines are most-used → which engines deserve UI investment.
- Which fields get overridden most → which auto-fill defaults are wrongest.
- Which calculations end with "below" verdict at high frequency → potential market signal for the platform's own deal-sourcing.

The telemetry is **read by the founders, not by ad networks.** No
data is sold, shared, or syndicated.

---

## §3 Three-tier competitive moat

A public viral calculator is, by design, a public methodology. The
moat assumes competitors will scrape and clone it; the strategy
degrades the value of doing so.

### §3.1 Tier 1 — Technical anti-bot (Cloudflare)

Cloudflare wraps `zaahi.io` already in production (per CLAUDE.md
`DEPLOYMENT` Vercel deployment with `zaahi.io` DNS). The Feasibility
public surface gets these specific hardening rules:

- **Bot Fight Mode: ENABLED.** Cloudflare automatically blocks
  obvious bots (curl, wget, python-requests with no JS).
- **Rate limit: 30 calculations per IP per hour.** Configured via
  Cloudflare WAF rule on `/api/feasibility/preset` and
  `/api/feasibility/share`. Reasonable user ceiling (one calc every
  2 minutes); bot speed is much higher.
- **Honeypot fields.** Hidden form fields styled `display: none` plus
  `autocomplete="off"`. Bots fill them; humans don't. Server flags
  the IP for 24 h shadow-ban.
- **No raw API endpoint exposed publicly.** All calculations are
  rendered as **server-side HTML** (Next.js Server Components or
  Route Handlers returning HTML) — the formulae are never sent to
  the browser as a JSON payload that could be replayed. Scraping
  requires browser automation at full UI cost (Playwright /
  Puppeteer per IP).
- **Cloudflare Turnstile** (CAPTCHA-equivalent, no user-friction
  challenge) injected if rate-limit threshold breached.

**Cost imposed on a scraper:**
- Browser-automation infra (~$500 / month per 10 worker IPs)
- IP rotation (residential proxies, $200+ / month for 100 IPs)
- JS-rendering compute (~10× faster than `curl`, but still
  ~5 calculations / second / worker)
- Captcha-solving service if Turnstile triggers (~$2 / 1000 solves)

Total scrape cost for full district × engine × sub-class matrix
(roughly 50 districts × 8 engines × 4 sub-classes × 4 size bands ≈
6,400 unique presets): ~$1,000–3,000 / quarter to maintain a fresh
mirror. Non-trivial.

### §3.2 Tier 2 — Data freshness gating

Per `02_CONSTRUCTION_COST_DATABASE.md` §6: 90-day lag between paid
and public tier.

```
Public tier (anonymous calculator): laggedPublic = currentQuarter − 90 days
                                    Always 1 quarter behind reality.
Paid tier:                          currentQuarter = current quarter live data.
                                    Subscription tiers (per CLAUDE.md AMBASSADOR
                                    PROGRAM RULES, retired and superseded by
                                    referral / subscription pricing in
                                    drafts/investor-package-v7):
                                    Developer AED 50 k/yr
                                    Broker    AED 20 k/yr
                                    Architect AED 10 k/yr
                                    Investor / Buyer AED 5 k/yr
                                    Land Owner AED 3 k/yr
```

A scraper who maintains a mirror of the public tier always trails
real-quarter pricing by 90 days. For a Q3 2026 deal, the mirror
shows Q2 2026 prices — and Q2 2026 was already 5 % escalated below
Q3 (per Turner & Townsend 2025 forecast cited in
`01_LAND_USE_ENGINES.md` §0.3 [src 1]). The scraper's data
**ages further the longer it sits**.

A subscriber sees current-quarter data. Subscription becomes the
only path to live data. **This is the core commercial moat.**

### §3.3 Tier 3 — Archibald AI personalised advice

The calculator surfaces an "Open in Archibald" button (per
`03_UX_FULLSCREEN_AND_DIFF.md` §4.1) that takes the calculation
into the Archibald AI assistant. Archibald uses contextual
reasoning over (a) the calculation, (b) the parcel-specific
affection plan / DDA limits, and (c) recent district transactions
to produce personalised commentary. Examples:

- *"Your model assumes 28 m maximum height. The DDA affection plan
  for this Dubai Hills sub-zone caps height at 14 m. The 28 m
  scenario would not pass DDA approval; rebuild the calc against
  14 m. Suggested: open the engine and override `far` to 1.6
  (currently 2.5)."*

- *"Your construction PSF BUA at AED 600 sits +25 % above the
  district median. Three explanations are typical: (i) premium
  finish spec, (ii) curtain-wall envelope vs unitised glazing,
  (iii) below-grade carpark. Which is yours? — I can refine the
  cost build accordingly."*

- *"This plot's recent comparables (DLD transactions): 6 closed
  sales in last 12 months at median AED 1,950 / sqft SFA. Your
  sales-price assumption at AED 2,200 is +13 % above. The market
  median would yield ROI 58 % vs your stated 73 %. Both are
  strong; which scenario do you want to present to your investor?"*

This commentary is **not formula-extractable**. Even if a
competitor mirrors every formula and every cost preset, they cannot
mirror the AI commentary without:
- Building a comparable AI integration (significant ongoing cost).
- Maintaining the parcel database (114 ZAAHI plots + 556k PMTiles
  plots).
- Maintaining the affection-plan database (DDA-API-fed, currently
  ZAAHI proprietary).

The AI commentary is what brokers actually use to close client
meetings. The formulae are the floor; the commentary is the
ceiling. **Tier 3 is the decisive moat.**

### §3.4 Defence-in-depth summary

| Tier | Cost imposed on copier | Time delay before workaround | Decisive in the moat? |
|---|---|---|---|
| 1 — Cloudflare anti-bot | $1–3 k / quarter ops | Days — anyone can spin up Playwright | Filters casual scraping |
| 2 — 90-day lag on public data | Subscription cost (AED 5 k – 50 k / yr) | 90 days lagging-data inherent | **Yes — primary commercial differentiator** |
| 3 — Archibald AI commentary | AI infra + parcel database + affection-plan database | Indefinite — full re-build of the platform | **Yes — secondary, harder to displace** |

If a copier defeats tier 1 and accepts tier 2 lag, they get a
free public-tier mirror and slow-data competition. They can't
defeat tier 3 without rebuilding ZAAHI itself.

---

## §4 Legal liability mitigation

### §4.1 Risk surface

The calculator is a **public-facing financial-projection tool**. The
single largest legal risk is **reliance damages**: an investor uses
the calculator's output as the primary basis for a multi-million-
AED commitment, the project under-performs, the investor sues for
the delta. UAE jurisdictions vary on whether such a tool would be
treated as professional advice triggering tort liability.

The mitigation stack — **disclaimer + transparency + tiered access +
counsel sign-off** — is layered to ensure the tool is positioned
as "indicative model, not feasibility study."

### §4.2 Terms of Use — single-click acceptance flow

On a user's **first** visit to `/feasibility`, an unobtrusive
acceptance modal appears:

```
┌─ Welcome to ZAAHI Feasibility ─────────────────────────────┐
│                                                             │
│ This calculator produces indicative estimates from market   │
│ benchmarks. It is NOT a feasibility study under UAE law and │
│ MUST NOT be relied on for investment commitments without a  │
│ professional consultant sign-off.                           │
│                                                             │
│ Sources for every default value are visible in tooltips     │
│ throughout the calculator. You may override any value.      │
│                                                             │
│ [ I understand — start calculating ]                        │
│                                                             │
│ [ Read full Terms of Use ]                                  │
└─────────────────────────────────────────────────────────────┘
```

Click stores `feasibility_terms_accepted_v1` in `localStorage` (and
in Supabase if the user is authenticated). Subsequent visits do
not show the modal unless the version increments.

**English text drafted below; Arabic translation flagged as
PENDING UAE COUNSEL REVIEW per founder direction in this spec set's
00_OVERVIEW.md §6.**

### §4.3 Full Terms of Use draft (English, EXTERNAL COUNSEL TO REVIEW)

```
ZAAHI Feasibility Calculator — Terms of Use

Effective: [DATE]

1. ABOUT THE CALCULATOR

The ZAAHI Feasibility Calculator (the "Calculator") is a software
tool provided by ZAAHI [legal entity] (the "Company") that produces
indicative financial projections for real-estate investments using
publicly available market data and user-supplied inputs. The
Calculator is provided as a free, public service.

2. NOT A FEASIBILITY STUDY

The Calculator's output is NOT a feasibility study, valuation,
investment advice, or professional opinion under United Arab
Emirates law, RERA regulations, or any other regulatory framework.
The Calculator does not replace, supplement, or substitute for the
work of a licensed quantity surveyor, feasibility consultant,
chartered accountant, RERA-licensed broker, or any other regulated
real-estate professional.

3. NO RELIANCE

You acknowledge that:
(a) the Calculator's output is indicative only, based on market
    benchmarks and user inputs;
(b) actual project outcomes will differ, potentially materially,
    from any projection generated by the Calculator;
(c) you will NOT rely on the Calculator's output as the sole or
    primary basis for any investment decision, contractual
    commitment, or financial commitment;
(d) before any such decision, commitment, or transaction, you will
    obtain professional advice from licensed UAE consultants.

4. NO WARRANTY

The Calculator is provided "as-is" without warranty of any kind.
The Company disclaims all warranties, express or implied, including
but not limited to merchantability, fitness for a particular
purpose, non-infringement, accuracy, completeness, or currency of
data. Default values reflect publicly available benchmarks at the
time of calculation; market conditions change continuously.

5. LIMITATION OF LIABILITY

To the fullest extent permitted by UAE law, the Company's aggregate
liability arising from or related to your use of the Calculator
shall not exceed AED 100. The Company shall NOT be liable for any
indirect, incidental, special, consequential, or punitive damages
including lost profits, lost opportunity, or business interruption,
whether arising in contract, tort, or otherwise, and regardless of
whether the Company was advised of the possibility of such damages.

6. INDEMNIFICATION

You agree to indemnify and hold harmless the Company, its founders,
employees, and agents from any claim, demand, loss, or liability
arising from your use of the Calculator, including any third-party
claim that your use of the Calculator caused them harm.

7. NO AGENCY

Use of the Calculator does not establish an agency, brokerage,
fiduciary, or professional-services relationship between you and
the Company. The Company is not your real-estate broker, your
financial advisor, or your investment consultant by virtue of you
using the Calculator.

8. PROFESSIONAL ADVICE RECOMMENDATION

The Company strongly recommends that, before making any property
investment decision based in part on the Calculator's output, you
consult:
(a) a UAE-licensed quantity surveyor for cost build-up;
(b) a UAE-licensed feasibility consultant for income-side
    projection;
(c) a chartered accountant for tax structuring (UAE Corporate Tax,
    VAT, transfer-pricing implications);
(d) a UAE-licensed RERA broker for market-comparable validation;
(e) UAE legal counsel for regulatory and contractual structuring.

9. DATA SOURCES

Default values are sourced from publicly available reports and
indices including Turner & Townsend International Construction
Market Survey, Faithful + Gould BCIS UAE, JLL UAE Market Dynamics,
Knight Frank UAE Hospitality / Residential / Investment Yield
reports, CBRE UAE Real Estate Market Review, Dubai Land
Department transaction registers, RERA official scales, and
supplier price lists from major UAE construction-material
distributors. Sources are disclosed in tooltips beside each field.

10. DATA TIER GATING

The public-tier Calculator displays data lagged by approximately
90 days from the current quarter. Subscribers to the Company's
Developer / Broker / Architect / Investor / Land-Owner tiers may
access current-quarter data. Subscription tier is independent of
this Terms of Use; subscriber-tier terms are governed by separate
subscription agreements.

11. INTELLECTUAL PROPERTY

The Calculator's user interface, formulas, methodology, and
underlying database structure are the intellectual property of the
Company. You may use the Calculator for non-commercial personal
investment evaluation. Commercial reuse, scraping, automated
querying, redistribution, or derivative-tool creation requires
prior written permission from the Company.

12. JURISDICTION

These Terms of Use are governed by the laws of the United Arab
Emirates, with disputes resolved in the courts of Dubai (or, if
the Company's holding entity has been registered in ADGM, ADGM
arbitration).

13. CHANGES

The Company may update these Terms of Use from time to time. Your
continued use after any update constitutes acceptance of the
updated terms.

14. CONTACT

[email contact for legal notices, e.g. legal@zaahi.io]
```

### §4.4 Footer disclaimer on every page + every PDF

A short-form disclaimer appears in the footer of every page on
`/feasibility` and on every page of every exported PDF:

```
"This is an indicative model. It does not constitute a feasibility
 study under UAE law and must not be relied upon for investment
 commitments without professional consultant sign-off. Sources for
 every default value are visible in tooltips."
```

PDF cover-page also carries a more prominent version:

```
INDICATIVE MODEL — NOT A FEASIBILITY STUDY
This document is generated by the ZAAHI Feasibility Calculator and
shows the user-supplied inputs and resulting computations. The
output is NOT a feasibility study under UAE law. Before any
investment commitment, obtain advice from a UAE-licensed quantity
surveyor and feasibility consultant. Default values reflect
publicly available benchmarks at the time of calculation; sources
disclosed inline.
```

### §4.5 Liability mitigation summary

| Layer | Mechanism | Effect |
|---|---|---|
| 1 | Single-click Terms acceptance | User contractually acknowledges no-reliance |
| 2 | Source attribution per field | User informed of basis; defensible against "I didn't know where the number came from" |
| 3 | Override + diff badge | User actively chooses each value or accepts market base; locus of decision is theirs |
| 4 | Public vs paid tiers | Public tier is explicitly 90-days lagged; paid tier is current; tier disclosed in PDF footer |
| 5 | Cover-page disclaimer in PDF | Reviewer of the PDF (lender, buyer, regulator) sees disclaimer first |
| 6 | RERA consultation pathway (§5) | If RERA pre-approval is required, obtain it; if not, document the absence |

---

## §5 RERA approval pathway research

### §5.1 Question

**Does RERA require pre-approval for a public real-estate-related
calculator that exposes a published methodology?**

### §5.2 Initial web research findings (5 May 2026)

Web search across `RERA Dubai feasibility study broker code of
ethics public methodology approval` and adjacent queries surfaced
the following:

1. **RERA's regulatory remit covers brokers, not tools.** RERA's
   Code of Ethics (per Afridi & Angell 2026 inBrief [src 18]) and
   the Federal Law on Real Estate Brokers govern individuals
   licensed as brokers, brokerages as legal entities, and
   broker-conduct in marketing. They do NOT explicitly address
   software calculators that expose published methodologies.

2. **Misleading-advertising prohibition applies, even without
   pre-approval.** RERA mandates that **no broker may make false or
   misleading claims** in advertising — this applies to any tool
   that ZAAHI publishes, even if RERA pre-approval is not
   independently required. Compliance: ZAAHI's calculator must not
   over-state outcomes, must not mislead about risks, must disclose
   sources transparently. **The calculator's design satisfies these
   requirements by default** (source attribution, override
   transparency, disclaimer).

3. **DLD published methodologies set precedent.** DLD itself
   publishes calculators on `dubailand.gov.ae` (Developer
   Calculator, Service Charge Calculator, Mortgage Calculator)
   without separate regulatory approval — they are official
   government tools. ZAAHI as a private developer would not have
   the same standing but the absence of a pre-approval requirement
   for DLD's own public calculators is suggestive that no general
   pre-approval regime exists.

4. **Trakheesi covers advertising, not tools.** Trakheesi (DLD
   advertising permit system) requires every property advertisement
   to be permitted before publication — but the calculator is not
   advertising a specific property. Each *parcel listing* on
   `zaahi.io/parcels` already carries a Trakheesi permit per CLAUDE
   .md `Правила smoke-теста`. The calculator output, which is
   user-generated and self-applied, would not appear to fall under
   Trakheesi.

### §5.3 Research outcome

**No clear pre-approval requirement was identified.** This is a
preliminary finding and **is NOT a substitute for direct UAE legal
counsel consultation.**

### §5.4 Recommended action — Phase B legal-budget allocation

Founder must allocate Phase B legal budget for **a single 1–2 hour
counsel consultation** with one of the following firms (per
CLAUDE.md drafts/investor-package-v7 §"Legal counsel
recommendations"):

- **Crimson Legal** — startup-focused, AED 40–100 k retainer band
- **Kayrouz & Associates** — tokenisation + financial services
  specialist, AED 50–120 k band

The consultation deliverable: a written counsel opinion on three
specific questions:

1. Does the calculator (as specified across `00_OVERVIEW.md`
   through `04_DISTRIBUTION_LEGAL_MOAT.md`) require RERA
   pre-approval as a published methodology?
2. Does any RERA broker-conduct requirement apply to ZAAHI
   developer-platform side?
3. Does the proposed Terms-of-Use (§4.3) cover the company's
   liability adequately under UAE law?

Estimated cost: AED 5,000 – 15,000 (one-off written opinion).
Estimated turnaround: 2 weeks from instruction.

### §5.5 If pre-approval IS required

If counsel returns "yes — RERA pre-approval required":

- **Application path:** RERA submission via DLD eServices, accompanied by methodology document (the four spec files in this folder serve as the methodology submission).
- **Estimated timeline:** 4–8 weeks (per RERA service-level standard for non-broker authorisations).
- **Estimated cost:** legal authorship of the application AED 30–80 k + RERA filing fees TBD.
- **Phase B impact:** Calculator launches in private beta (authenticated subscribers only, no public route) until approval lands. Public route stays disabled.

### §5.6 If pre-approval is NOT required

Most likely outcome based on §5.2:

- Proceed with public launch as specified.
- Counsel-confirmed Terms of Use replaces the placeholder draft in §4.3.
- Document the counsel opinion (engagement letter + written response) in `docs/specs/feasibility-v6/legal/` for audit.
- Subsequent: monitor RERA / DLD publications; if regulator opens a calculator-specific framework, update.

### §5.7 OPEN — FOUNDER RATIFY

The whole §5 is provisional. **No external counsel has been engaged
yet** — Phase A is research-only. Phase B requires founder
authorisation of the counsel-engagement budget and selection of
firm.

---

## §6 Admin update flow

### §6.1 Admin route

`/admin/feasibility-database` per `02_CONSTRUCTION_COST_DATABASE.md`
§5.2.

### §6.2 Access control

Per CLAUDE.md `SECURITY RULES`:

```typescript
// route guard
const userId = await getApprovedUserId(req);
if (!userId) return Response.unauthorized();

const user = await prisma.user.findUnique({ where: { id: userId } });
if (user.role !== 'ADMIN') return Response.forbidden();
```

The `User.role === 'ADMIN'` check is the existing pattern. Zhan and
Dymo are the only admin users by current setup.

### §6.3 Workflow

(Detail in `02_CONSTRUCTION_COST_DATABASE.md` §5.4 — promote staged
quarter to lagged, audit trail per
`CostMaterialVersion`.)

### §6.4 Approval pathway integration

If RERA pre-approval is required (per §5.5), the admin UI gains an
extra panel showing:
- Last counsel-approved methodology version
- Date of next RERA renewal (if any)
- Pending changes that require re-submission

---

## §7 Public-launch checklist (Phase B exit criteria)

Before flipping `/feasibility` from staging to production:

| # | Item | Owner |
|---|---|---|
| 1 | Counsel opinion on RERA pre-approval received and acted on | Zhan + Legal |
| 2 | Terms of Use (English) counsel-reviewed and finalised | Legal |
| 3 | Arabic translation of Terms of Use complete | Translator + Legal |
| 4 | Cloudflare WAF rules deployed (Bot Fight Mode, rate limit, Turnstile) | Zhan |
| 5 | Cron job for quarterly database update tested in staging | Zhan |
| 6 | Admin UI tested with at least 2 admin users (Zhan + Dymo) | Both founders |
| 7 | All 14 land-use × district combinations have populated `CostPreset` rows | Database team |
| 8 | All ~70 tooltips authored in EN + AR | Founder + translator |
| 9 | WCAG AA contrast verification across all surfaces (per `03_UX_FULLSCREEN_AND_DIFF.md` §5) | Designer + dev |
| 10 | PDF export tested on each engine + each language (EN, AR) | Dev + QA |
| 11 | Slug-share read-only flow tested | Dev |
| 12 | Telemetry endpoint live, capturing events to Supabase | Dev |
| 13 | Subscription tier integration (preset endpoint returns `currentQuarter` for paid users) | Dev |
| 14 | Disclaimer modal acceptance flow verified | Dev + Legal |
| 15 | Performance: calculator first paint <2 s on 4G mobile | Dev |
| 16 | Cross-browser test: Chrome / Safari / Firefox / Edge / mobile Safari / mobile Chrome | QA |

---

## §99 Consolidated source matrix (all four spec files)

Same as `01_LAND_USE_ENGINES.md` §99 source list, replicated here
for one-stop reference.

| # | Source | URL | Accessed | Used in |
|---|---|---|---|---|
| 1 | Turner & Townsend GCMI 2025 — Middle East | https://publications.turnerandtownsend.com/global-construction-market-intelligence-2025/middle-east | 2026-05-05 | 01, 02 |
| 2 | Turner & Townsend UAE Market Intelligence 2025 | https://marketintelligence.turnerandtownsend.com/uaemi-2025/construction-cost-performance | 2026-05-05 | 01, 02 |
| 3 | Knight Frank UAE Hospitality Market Review 2025 | https://www.knightfrank.ae/newsroom/article/2025/10/uae-hospitality-market-review-2025 | 2026-05-05 | 01 |
| 4 | Engel & Völkers UAE Construction Cost Dubai 2026 | https://www.engelvoelkers.com/ae/en/resources/construction-cost-dubai | 2026-05-05 | 01, 02 |
| 5 | Habhab Construction Villa Cost Dubai 2025 | https://habhabconstruction.com/villa-construction-cost-dubai/ | 2026-05-05 | 01 |
| 6 | JLL UAE Market Dynamics Q3 2025 (office, living, industrial) | https://www.jll.com/en-ae/insights/market-dynamics/uae-office | 2026-05-05 | 01, 02 |
| 7 | Engel & Völkers Property Transfer in Dubai | https://www.engelvoelkers.com/ae/en/resources/property-transfer-in-dubai-understanding-the-legal-process | 2026-05-05 | 01 |
| 8 | EGS Auditing Trakheesi Permit Compliance 2026 | https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance | 2026-05-05 | 01 |
| 9 | Oliva DLD Fees Title Deed Timeline 2026 | https://joinoliva.com/en/learn/blog/dld-transaction-fees-dubai-rest-app-title-deed-timeline | 2026-05-05 | 01 |
| 10 | Kayrouz & Associates Dubai Real Estate Law Guide | https://www.kayrouzandassociates.com/insights/dubai-property-law-guide-for-investors-and-developers | 2026-05-05 | 01, 04 |
| 11 | CBUAE EIBOR Rates | https://www.centralbank.ae/en/forex-eibor/eibor-rates/ | 2026-05-05 | 01 |
| 12 | LeoCompare UAE Mortgage Rates 2026 | https://www.leocompare.com/home-loans/interest-rate-uae | 2026-05-05 | 01 |
| 13 | Driven Properties Service Charge Index 2026 | https://www.drivenproperties.com/dubai-real-estate-market-guide/service-charge-index | 2026-05-05 | 01 |
| 14 | LuxHabitat Dubai Service Charges Guide 2026 | https://www.luxhabitat.ae/the-journal/dubai-service-charges-guide/ | 2026-05-05 | 01 |
| 15 | FAM Properties Dubai Service Charges 2026 | https://famproperties.com/service-charges-dubai | 2026-05-05 | 01 |
| 16 | LuxuryProperty Dubai Service Charge Index 2025 | https://www.luxuryproperty.com/blog/dubai-service-charge-index-for-2020 | 2026-05-05 | 01 |
| 17 | Knight Frank Investment Yield Guide / Dubai Residential Q3 2025 | https://www.knightfrank.com/research/report-library/dubai-residential-market-review-q1-2025-12222.aspx | 2026-05-05 | 01 |
| 18 | Afridi & Angell Code of Ethics for RE Brokers in Dubai (Lexology) | https://www.lexology.com/library/detail.aspx?g=342448e7-8361-43e3-a251-52a244dcdc8b | 2026-05-05 | 04 |
| 19 | DDA Master Planning Guidelines | https://dda.gov.ae/-/media/Project/TECOM/Media/DDA/Planning-and-development/Master-Planning-Services/pdf/Master-Planning-Guidelines.pdf | 2026-05-05 | 01 |
| 20 | DDA Codes and Guidelines portal | https://dda.gov.ae/en/planning-development/codes-and-guidelines | 2026-05-05 | 01 |
| 21 | Capital Zone Mortgage Rates UAE 2026 | https://www.capitalzone.ae/the-2026-uae-mortgage-blueprint-navigating-interest-rates-rental-shifts-and-market-maturity/ | 2026-05-05 | 01 |
| 22 | Arnifi Construction Cost Dubai 2026 Guide | https://arnifi.com/blog/construction-cost-in-dubai-2026/ | 2026-05-05 | 02 |

---

## §100 FOUNDER RATIFY items in this file

| # | Section | Item | Ask |
|---|---|---|---|
| DLM-1 | §1.4 | `SharedFeasibilityCalc` Prisma table schema | confirm shape |
| DLM-2 | §1.4 | 180-day anonymous-slug retention | confirm |
| DLM-3 | §1.5 | PDF disclaimer text — final wording | sign off |
| DLM-4 | §2.1 | Telemetry events list — confirm capture set, no PII | sign off |
| DLM-5 | §2.2 | Binning thresholds | confirm or refine |
| DLM-6 | §2.3 | Telemetry endpoint = internal Supabase, NOT third-party — confirm | confirm |
| DLM-7 | §3.1 | Cloudflare WAF rule set + rate limit (30 / IP / hour) | confirm |
| DLM-8 | §3.2 | Subscription pricing — confirms tiers from drafts/investor-package-v7 (Developer 50 k, Broker 20 k, Architect 10 k, Investor 5 k, Owner 3 k) | confirm currency / amount mapping |
| DLM-9 | §3.3 | Archibald AI integration scope (LLM provider, latency target) | confirm |
| DLM-10 | §4.3 | Terms of Use draft — counsel review and final | engage counsel |
| DLM-11 | §4.4 | Footer disclaimer text — final wording | sign off |
| DLM-12 | §5.4 | Counsel firm selection (Crimson / Kayrouz / other) and budget | sign off |
| DLM-13 | §5.4 | Counsel-engagement timing (post-Wed 6 May Rudi meeting?) | sign off |
| DLM-14 | §5.7 | RERA approval pathway — final counsel confirmation | engage counsel |
| DLM-15 | §6.4 | Admin role per existing CLAUDE.md — confirm Zhan + Dymo only | confirm |
| DLM-16 | §7 | Public-launch checklist — sign off the 16 items | confirm |

---

*End of distribution / legal / moat spec. End of v6.0 Phase A spec set.*
