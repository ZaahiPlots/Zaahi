# Feasibility v6.0 — Distribution, Legal & Moat (rev-2)

**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `02_CONSTRUCTION_COST_DATABASE.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `06_MASTER_TREE_ALIGNMENT.md` · `07_METHODOLOGY.md`
**As of:** 5 May 2026

> **rev-2 changes:**
> - **Subscription tier prices inlined** (resolves audit 04-1 cross-branch ref).
> - **IP claim §11 refined** to reflect the public-methodology design (resolves audit 04-3).
> - **Liability cap §5 multi-tier** counsel-aware draft (resolves audit 04-2).
> - **Preset count + scrape cost recomputed** with realistic combinatorial coverage (resolves audit 04-5).
> - **Captcha-solving cost cited** (resolves audit 04-6).
> - **Anonymous-claim mechanism** documented (resolves audit 04-7).
> - **Cost-imposed-on-copier framing** for tier 2 (resolves audit 04-4).
> - **Client-vs-server architecture** disambiguated (resolves audit 04-8).
> - **Turner & Townsend Dubai citation replaced** (resolves audit 04-10 / RE-4).
> - **VARA Fractional compliance pathway** added (rev-2 expansion §6 NEW).
> - **Counsel firm names inlined** (resolves audit 04-9 cross-branch ref).

---

## §1 Public URL architecture

### §1.1 Route

```
Production : https://zaahi.io/feasibility
Development: http://localhost:3000/feasibility
```

- Implemented as `src/app/feasibility/page.tsx` (per `03 §8.3`).
- **No authentication required** for the calculation itself.
- **No subdirectory** like `/tools/feasibility` — top-level slot reserved deliberately to signal product priority.
- **No email gate.** The calculator never blocks calculation behind a "give us your email" wall.

### §1.2 Middleware allow-list

`src/middleware.ts` `PUBLIC_API` allow-list (per CLAUDE.md `SECURITY RULES`) extends with **two** new entries:

```typescript
PUBLIC_API = [
  '/api/auth',                  // existing
  '/api/notify-admin',           // existing
  '/api/referral-waitlist',      // existing (Phase A referral)
  '/api/feasibility/preset',     // NEW — read-only preset lookup (lagged tier)
  '/api/feasibility/share',      // NEW — POST to mint share slug
  '/api/telemetry/feasibility',  // NEW — anonymous event capture
];
```

The preset endpoint serves the lagged-public tier values; it does NOT expose currentQuarter to anonymous visitors.

### §1.3 Optional account creation flow

After a user runs a calculation, the result panel surfaces a **soft prompt** (not blocking):

```
[ Save this calculation ]   →   modal: "Sign up to save scenarios across
                                          sessions and access quarterly fresh
                                          data tier. Free 7-day trial."
                                       [ Sign up ]   [ Skip — keep in browser ]
```

Skipping preserves the calculation in `localStorage` and produces a read-only `/feasibility/r/{slug}` link the user can share. **The calculator is never blocked behind sign-up.**

### §1.4 Sharing — `/feasibility/r/{slug}` (rev-2 — anonymous-claim mechanism documented per audit 04-7)

```
GET /feasibility/r/abc12345

Renders read-only fullscreen view of the calculation.
- All inputs visible
- All diff badges visible (so reviewer sees deviation from market)
- All results visible
- "Open editable copy" button → spawns a new client-side calculation seeded from this slug
- No PII shown unless explicitly attached
```

**Slug format:** `crypto.randomUUID()` truncated to first 8 characters of base-32 representation. 32^8 ≈ 1.1 trillion combinations.

**Storage:** `SharedFeasibilityCalc` Prisma table (`02 §2.5`). RLS per `02 §2.7.3` — read public by slug, write only owner.

**Anonymous-claim mechanism (rev-2 NEW):**

```
1. Anonymous user creates calc → row inserted with userId = NULL,
   slug = abc12345 stored in localStorage.
2. User signs up later. Sign-up handler:
   - Reads localStorage for any saved feasibility slugs
   - For each slug, attempts to claim:
     UPDATE SharedFeasibilityCalc
     SET userId = newUserId, claimedByUserId = newUserId, claimedAt = NOW()
     WHERE slug = X AND userId IS NULL;
3. After claim, calc shows in user's saved-scenarios list.
4. Race condition: if two users sign up and both have the slug in localStorage
   (unlikely — slug is local), only first claim wins (claimedByUserId IS NULL
   pre-condition).
```

**Retention:** anonymous slugs auto-expire after **180 days** of no visits. Authenticated slugs persist until user-deleted.

### §1.5 PDF export

Available without authentication via the **weasyprint** server route (per Zhan-ratified hybrid pipeline 5 May 2026 Q2). PDF carries the public-tier disclaimer (§4) on every page.

Generated via the same weasyprint pipeline used in the investor-package Phase C (`docs/viktor-package/build_pdfs.py`) — proven, idempotent, ~6 s for a 14-doc set so a single feasibility PDF takes <2 s.

**Hybrid PDF pipeline:**
- **`/parcels/map` SidePanel mode:** jsPDF client-side (preserves v5 instant feedback)
- **`/feasibility` public route:** weasyprint server-side (branded cover, Georgia serif, gold accents — viktor-package consistent)
- **Admin reports:** weasyprint
- **Investor exports:** weasyprint with RICS NRM / USALI / IVS appendices

Per `00 §1` and `03 §4.2`.

---

## §2 Telemetry — anonymous, no PII

The calculator captures product analytics for prioritisation. **No PII**, no IP fingerprinting beyond Cloudflare's anti-bot signals.

### §2.1 Events captured

| Event | Captured fields |
|---|---|
| `calc_start` | `engineId`, `district` (canonical), `subClass`, `projectSizeBand`, `tier` (`public` / `paid`), `viewport` (`mobile` / `tablet` / `desktop`), `lang` (`en` / `ar`) |
| `calc_complete` | All `calc_start` fields + `primary_metric_bin` (e.g. ROI 20–25 %; see §2.2) + `verdict` (`strong` / `moderate` / `below`) + `time_to_complete_ms` |
| `field_override` | `field_slug`, `delta_bin` (`<5%`, `5-15%`, `15-30%`, `>30%`) — never the absolute value |
| `pdf_export` | `engineId`, `tier`, `viewport`, `lang` |
| `share_link_created` | `engineId`, `tier` |
| `share_link_visited` | `engineId` (visitor), `lang` |
| `account_signup_prompted` | (boolean) — to measure conversion funnel |
| `account_signup_completed` | `from_calc` flag |
| `engine_modifier_toggle` | `engineId`, `modifier` (`offplan` / `fractional`), `state` (`on` / `off`) |

### §2.2 Binning policy

Aggregate metrics binned to prevent re-identification:

```
ROI / Yield bins:    <5%, 5-10%, 10-15%, 15-20%, 20-25%, 25-30%, 30-50%, >50%
NPV bins (AED):      <0, 0-1M, 1-5M, 5-25M, 25-100M, 100-500M, 500M-1B, >1B
Plot area bins (sqft): <5k, 5-10k, 10-25k, 25-50k, 50-100k, 100-500k, >500k
Land cost bins (AED): <1M, 1-5M, 5-15M, 15-50M, 50-200M, 200M-1B, >1B
Delta bins (override vs market): <5%, 5-15%, 15-30%, >30%
Engine-specific:
  Hospitality EBITDAR margin bins: <15%, 15-25%, 25-35%, 35-45%, >45%
  Data Center capex / MW bins (USD M): <8, 8-10, 10-12, 12-15, >15
  Healthcare cost / bed bins (AED M): <2, 2-3, 3-4, 4-6, >6
```

### §2.3 Storage

Captured by an **internal endpoint** `/api/telemetry/feasibility` — NOT a third-party analytics service (no GA, no Mixpanel, no Hotjar). Data lives in `FeasibilityTelemetryEvent` Supabase table per `02 §2.6`. RLS per `02 §2.7.4` — write public, read admin only (Zhan + Dymo).

No cookies set beyond the existing ZAAHI session cookie (absent for anonymous).

### §2.4 Goal — not user tracking

Exclusive purpose: **product-roadmap prioritisation.**

Examples:
- Which districts most-queried → which to pull deeper data for.
- Which engines most-used → which deserve UI investment.
- Which fields get overridden most → which auto-fill defaults are weakest.
- Which calculations end with "below" verdict at high frequency → potential market signal for ZAAHI's own deal-sourcing.

Telemetry is **read by the founders, not by ad networks.** No data sold, shared, or syndicated.

Telemetry data feeds Master Tree §70 ANALYTICS ENGINE — the founder dashboard layer that is part of the platform's broader business-intelligence stack (per `06_MASTER_TREE_ALIGNMENT.md`).

---

## §3 Three-tier competitive moat (rev-2 — costs reframed per audit 04-4 / 04-5 / 04-6)

A public viral calculator is by design a public methodology. The moat assumes competitors will scrape and clone it; the strategy degrades the value of doing so.

### §3.1 Tier 1 — Technical anti-bot (Cloudflare)

Cloudflare wraps `zaahi.io` already in production (per CLAUDE.md `DEPLOYMENT`). The Feasibility public surface gets these specific hardening rules:

- **Bot Fight Mode: ENABLED.** Cloudflare automatically blocks obvious bots (`curl`, `wget`, `python-requests` with no JS).
- **Rate limit: 30 calculations per IP per hour.** Configured via Cloudflare WAF rule on `/api/feasibility/preset` and `/api/feasibility/share`.
- **Honeypot fields.** Hidden form fields styled `display: none` plus `autocomplete="off"`. Bots fill them; humans don't. Server flags the IP for 24 h shadow-ban.
- **No raw API endpoint exposed publicly.** All public-route calculations are rendered as **server-side HTML** on `/feasibility/page.tsx` (Next.js Server Components or Route Handlers returning HTML). The SidePanel mode (`/parcels/map`) remains client-rendered as in v5 — but it's auth-gated behind `<AuthGuard>` so scraping it requires authentication anyway. (rev-2 architectural disambiguation per audit 04-8.)
- **Cloudflare Turnstile** (CAPTCHA-equivalent, no user friction) injected if rate-limit threshold breached.

**Realistic preset count for scraping (rev-2 — recomputed per audit 04-5):**

```
Engine 1 (Residential): ~50 districts × 4 sub-classes × 4 size bands = 800
Engine 2 (Office):      ~50 districts × 5 sub-classes × 4 size bands = 1,000
Engine 3 (Retail):      ~50 districts × 5 sub-classes × 4 size bands = 1,000
Engine 4 (Hospitality): ~30 districts × 5 sub-classes (3-7★) × 3 size bands = 450
Engine 5 (Industrial):  ~10 districts × 7 sub-classes × 3 size bands = 210
Engine 6 (Healthcare):  ~20 districts × 6 sub-classes × 3 size bands = 360
Engine 7 (Educational): ~30 districts × 9 sub-classes × 3 size bands = 810
Engine 8 (Senior Living): ~10 districts × 4 sub-classes × 2 size bands = 80
Engine 9 (Data Center): ~8 districts × 4 sub-classes × 3 size bands = 96
Engine 10 (Mixed-Use):  cross-cutting; uses underlying engine presets
Engine 11 (Infrastructure): no district-level presets (project-specific) — exempt
Engine 12 (Off-Plan):   wraps engines 1-9 with timing — uses base presets
Engine 13 (Land-Hold):  ~50 districts × 4 sub-classes × 4 size bands = 800

Total realistic preset count ≈ 5,610 unique tuples (vs rev-1 inflated 6,400).
```

**Cost imposed on a scraper:**
- Browser-automation infra (~USD 500 / month per 10 worker IPs)
- IP rotation (residential proxies, USD 200+ / month for 100 IPs per Bright Data 2025 published rates)
- JS-rendering compute (~10× faster than `curl`, but still ~5 calculations / second / worker)
- Captcha-solving service if Turnstile triggers (~USD 2 / 1000 solves per [Anti-Captcha](https://anti-captcha.com/mainpage) 2025 published rates and [2Captcha](https://2captcha.com/2captcha-api) 2025 public pricing)

Total scrape cost for full 5,610-preset matrix (assuming Turnstile triggers on 5 % of requests, requiring ~280 captcha solves per pass): **USD 800–2,400 / quarter to maintain a fresh mirror** (vs rev-1 estimate USD 1,000–3,000). Non-trivial. Filters casual scraping.

### §3.2 Tier 2 — Data freshness gating (rev-2 — cost-imposed reframed)

90-day lag between paid and public tier per `02 §6`.

```
Public tier (anonymous calculator): laggedPublic = currentQuarter − 90 days
                                    Always 1 quarter behind reality.
Paid tier:                          currentQuarter = current quarter live data.
                                    Subscription tiers (rev-2 inlined):
                                    Developer AED 50,000 / yr
                                    Broker    AED 20,000 / yr
                                    Architect AED 10,000 / yr
                                    Investor / Buyer AED 5,000 / yr
                                    Land Owner AED 3,000 / yr
                                    (per investor package P&L baseline; available
                                    on this branch independent of any cross-branch
                                    reference.)
```

A scraper who maintains a mirror of the public tier always trails real-quarter pricing by 90 days. For a Q3 2026 deal, the mirror shows Q2 2026 prices — and Q2 was already 5 % escalated below Q3 per Turner & Townsend escalation forecast [src 2]. The scraper's data **ages further the longer it sits**.

**Cost imposed on the copier (rev-2 reframed per audit 04-4):**

The cost imposed is not subscription fees (those are the legitimate user's cost) but **lost data freshness** — the scraper's mirror is perpetually 90 days behind. Decisions made on 90-day-stale data under-perform decisions made on current-quarter data, especially in a 5 %-escalating cost market like UAE 2025–2026. This is a **structural commercial differentiator** that doesn't degrade over time — the longer the scraper relies on stale data, the more decisions they get wrong.

A subscriber sees current-quarter data. Subscription becomes the only path to live data. **This is the core commercial moat.**

### §3.3 Tier 3 — Archibald AI personalised advice

The calculator surfaces an "Open in Archibald" button (per `03 §4.1`) that takes the calculation into the Archibald AI assistant. Archibald uses contextual reasoning over (a) the calculation, (b) the parcel-specific affection plan / DDA limits, and (c) recent district transactions to produce personalised commentary. Examples:

- *"Your model assumes 28 m maximum height. The DDA affection plan for this Dubai Hills sub-zone caps height at 14 m. The 28 m scenario would not pass DDA approval; rebuild the calc against 14 m. Suggested: open the engine and override `far` to 1.6 (currently 2.5)."*

- *"Your construction PSF BUA at AED 600 sits +25 % above the district median. Three explanations are typical: (i) premium finish spec, (ii) curtain-wall envelope vs unitised glazing, (iii) below-grade carpark. Which is yours? — I can refine the cost build accordingly."*

- *"This plot's recent comparables (DLD transactions): 6 closed sales in last 12 months at median AED 1,950 / sqft SFA. Your sales-price assumption at AED 2,200 is +13 % above. The market median would yield ROI 58 % vs your stated 73 %. Both are strong; which scenario do you want to present to your investor?"*

This commentary is **not formula-extractable**. Building a comparable AI integration + maintaining the parcel database (114 ZAAHI plots + 556k PMTiles plots) + maintaining the affection-plan database (DDA-API-fed, currently ZAAHI proprietary) is a multi-year rebuild. **Tier 3 is the decisive moat.**

### §3.4 Defence-in-depth summary (rev-2 — costs corrected)

| Tier | Cost imposed on copier | Time delay before workaround | Decisive in the moat? |
|---|---|---|---|
| 1 — Cloudflare anti-bot | USD 800–2.4 k / quarter ops + captcha + IP rotation | Days — anyone can spin up Playwright | Filters casual scraping |
| 2 — 90-day lag on public data | Lost data freshness — perpetual 90-day lag; under-performs current-quarter decisions | Inherent — no workaround without subscription | **Yes — primary commercial differentiator** |
| 3 — Archibald AI commentary | AI infra + parcel database + affection-plan database | Indefinite — full re-build of the platform | **Yes — secondary, harder to displace** |

If a copier defeats tier 1 and accepts tier 2 lag, they get a free public-tier mirror and slow-data competition. They can't defeat tier 3 without rebuilding ZAAHI itself.

---

## §4 Legal liability mitigation

### §4.1 Risk surface

The calculator is a **public-facing financial-projection tool**. The single largest legal risk is **reliance damages**: an investor uses the calculator's output as the primary basis for a multi-million-AED commitment, the project under-performs, the investor sues for the delta. UAE jurisdictions vary on whether such a tool would be treated as professional advice triggering tort liability.

### §4.2 Terms of Use — single-click acceptance flow

On a user's **first** visit to `/feasibility`, an unobtrusive acceptance modal appears:

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

Click stores `feasibility_terms_accepted_v1` in `localStorage` (and in Supabase if authenticated). Subsequent visits do not show the modal unless the version increments.

**English text drafted below; Arabic translation flagged as PENDING UAE COUNSEL REVIEW** per `00 §6`.

### §4.3 Full Terms of Use draft — counsel-reviewable English (rev-2 — multi-tier liability cap, refined IP claim)

> **Status:** EXTERNAL COUNSEL TO REVIEW — engagement budget per §5.4.

```
ZAAHI Feasibility Calculator — Terms of Use

Effective: [DATE]

1. ABOUT THE CALCULATOR

The ZAAHI Feasibility Calculator (the "Calculator") is a software
tool provided by ZAAHI [legal entity] (the "Company") that produces
indicative financial projections for real-estate investments using
publicly available market data and user-supplied inputs. The
Calculator is provided as a free, public service with optional
subscription tiers granting access to current-quarter data.

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

5. LIMITATION OF LIABILITY (rev-2 — multi-tier draft pending counsel review)

To the fullest extent permitted by UAE law:

(a) For indirect, incidental, special, consequential, or punitive
    damages (including lost profits, lost opportunity, business
    interruption, or reputational damage), the Company's aggregate
    liability arising from or related to your use of the Calculator
    shall not exceed AED 100, regardless of the legal theory.

(b) For direct damages, the Company's aggregate liability shall not
    exceed the greater of (i) AED 5,000 or (ii) the total
    consideration paid by you for any subscription to the Calculator
    in the 12 months preceding the event giving rise to the claim.

(c) The limitations above do not apply to the Company's liability
    for: (i) fraud or fraudulent misrepresentation; (ii) gross
    negligence; (iii) wilful misconduct; (iv) death or personal
    injury caused by negligence; or (v) any liability that cannot
    be excluded by UAE law.

(d) The Company shall NOT be liable for any third-party claim, loss,
    or damage arising from your use of the Calculator's output to
    inform any contract, transaction, or relationship with such
    third party.

6. INDEMNIFICATION

You agree to indemnify and hold harmless the Company, its founders,
employees, and agents from any claim, demand, loss, or liability
arising from your use of the Calculator, including any third-party
claim that your use of the Calculator caused them harm.

7. NO AGENCY

Use of the Calculator does not establish an agency, brokerage,
fiduciary, or professional-services relationship between you and
the Company.

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
indices including Turner & Townsend Global Construction Market
Intelligence, Faithful + Gould BCIS UAE, JLL UAE Market Dynamics,
Knight Frank UAE Hospitality / Residential / Investment Yield
reports, CBRE UAE Real Estate Market Review, Cushman & Wakefield UAE
reports, Dubai Land Department transaction registers, RERA official
scales, and supplier price lists from major UAE construction-
material distributors. Methodology aligned with RICS NRM 1, USALI
12th Edition, IVS 2025, and ICMS 3. Sources are disclosed in
tooltips beside each field; full citations in the Calculator's
Methodology document available on request.

10. DATA TIER GATING

The public-tier Calculator displays data lagged by approximately
90 days from the current quarter. Subscribers to the Company's
Developer / Broker / Architect / Investor / Land-Owner tiers may
access current-quarter data. Subscription tier is independent of
this Terms of Use; subscriber-tier terms are governed by separate
subscription agreements.

11. INTELLECTUAL PROPERTY (rev-2 — refined per audit 04-3)

(a) The Calculator's user interface design, brand assets (including
    the ZAAHI wordmark, logo, colour palette, and visual identity),
    database aggregation, and curated default-value selection are
    the exclusive intellectual property of the Company.

(b) The underlying mathematical formulas applied by the Calculator
    are industry-standard real-estate finance methods (NPV, IRR,
    DCF, Cap Rate, ROI, RevPAR-based EBITDAR projection, etc.) and
    are not separately proprietary. The methodology document
    referenced in §9 is publicly visible.

(c) The individually-cited public-source default values surfaced
    in the Calculator's tooltips (such as JLL cap-rate ranges,
    Knight Frank ADR data, RICS NRM 1 elemental categories) are
    third-party intellectual property not owned by the Company; the
    Company makes them visible to you for reference only and
    encourages you to consult the original sources.

(d) Notwithstanding the above, you may NOT:
    (i) commercially reuse the Calculator's aggregated output, the
        underlying database, or any substantial portion of the UI;
    (ii) scrape, automate, or systematically extract data from the
         Calculator at scale;
    (iii) create a derivative tool that mirrors the Calculator's
          curated default-value selection;
    (iv) re-publish the Calculator's tooltip text, source-attribution
         data, or worked examples without written permission.

(e) Use of the Calculator for non-commercial personal investment
    evaluation is permitted.

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

### §4.4 Footer disclaimer

A short-form disclaimer appears in the footer of every page on `/feasibility` and on every page of every exported PDF:

```
"This is an indicative model. It does not constitute a feasibility
 study under UAE law and must not be relied upon for investment
 commitments without professional consultant sign-off. Sources for
 every default value are visible in tooltips."
```

PDF cover-page also carries:

```
INDICATIVE MODEL — NOT A FEASIBILITY STUDY
This document is generated by the ZAAHI Feasibility Calculator and
shows the user-supplied inputs and resulting computations. The
output is NOT a feasibility study under UAE law. Before any
investment commitment, obtain advice from a UAE-licensed quantity
surveyor and feasibility consultant. Default values reflect
publicly available benchmarks at the time of calculation; sources
disclosed inline. Methodology aligned with RICS NRM 1, USALI 12th
Edition, IVS 2025, and ICMS 3.
```

### §4.5 Liability mitigation summary (rev-2)

| Layer | Mechanism | Effect |
|---|---|---|
| 1 | Single-click Terms acceptance | User contractually acknowledges no-reliance |
| 2 | Source attribution per field | User informed of basis; defensible against "I didn't know where the number came from" |
| 3 | Override + diff badge | User actively chooses each value or accepts market base; locus of decision is theirs |
| 4 | Public vs paid tiers | Public tier is explicitly 90-days lagged; paid tier is current; tier disclosed in PDF footer |
| 5 | Cover-page disclaimer in PDF | Reviewer of the PDF (lender, buyer, regulator) sees disclaimer first |
| 6 | Multi-tier liability cap (rev-2) | Indirect / consequential capped at AED 100; direct at greater of AED 5,000 or 12-month subscription paid; carve-outs for fraud / gross negligence / personal injury |
| 7 | Refined IP claim (rev-2) | UI / brand exclusive; formulas + cited sources publicly visible (no contradiction with transparency mandate); commercial scraping / derivatives restricted |
| 8 | RERA consultation pathway (§5) | If RERA pre-approval is required, obtain it; if not, document the absence |

---

## §5 RERA approval pathway research

### §5.1 Question

**Does RERA require pre-approval for a public real-estate-related calculator that exposes a published methodology?**

### §5.2 Web research findings (5 May 2026)

1. **RERA's regulatory remit covers brokers, not tools.** RERA's Code of Ethics (Afridi & Angell 2026 inBrief [src 18]) and Federal Law on Real Estate Brokers govern individuals licensed as brokers, brokerages as legal entities, and broker-conduct in marketing. They do NOT explicitly address software calculators that expose published methodologies.

2. **Misleading-advertising prohibition applies, even without pre-approval.** RERA mandates that **no broker may make false or misleading claims** in advertising — applies to any tool ZAAHI publishes, even if RERA pre-approval isn't independently required. Compliance: ZAAHI's calculator must not over-state outcomes, must not mislead about risks, must disclose sources transparently. **The calculator's design satisfies these requirements by default** (source attribution, override transparency, disclaimer).

3. **DLD published methodologies set precedent.** DLD itself publishes calculators on `dubailand.gov.ae` (Developer Calculator, Service Charge Calculator, Mortgage Calculator) without separate regulatory approval — they are official government tools. The absence of a pre-approval requirement for DLD's own public calculators is suggestive.

4. **Trakheesi covers advertising, not tools.** Trakheesi (DLD advertising permit system) requires every property advertisement to be permitted — but the calculator is not advertising a specific property.

### §5.3 Research outcome

**No clear pre-approval requirement was identified.** This is a preliminary finding and is **NOT** a substitute for direct UAE legal counsel consultation.

### §5.4 Recommended action — Phase B legal-budget allocation (rev-2 — counsel firms inlined per audit 04-9)

Founder must allocate Phase B legal budget for **a single 1–2 hour counsel consultation** with one of:

- **Crimson Legal** — startup-focused UAE practice, AED 40–100 k typical retainer band.
- **Kayrouz & Associates** — tokenisation + financial services specialist, AED 50–120 k retainer band.

(Both firms previously identified in ZAAHI investor-package counsel-recommendation list; inlined here per audit finding 04-9 to ensure this spec lives independently on this branch.)

The consultation deliverable: a written counsel opinion on three specific questions:

1. Does the calculator (as specified across `00_OVERVIEW.md` through `04_DISTRIBUTION_LEGAL_MOAT.md`) require RERA pre-approval as a published methodology?
2. Does any RERA broker-conduct requirement apply to ZAAHI developer-platform side?
3. Does the proposed Terms of Use (§4.3) — including the rev-2 multi-tier liability cap and refined IP claim — adequately limit the Company's liability under UAE consumer-protection law (Federal Law No. 15 of 2020)?

Estimated cost: AED 5,000 – 15,000 (one-off written opinion). Estimated turnaround: 2 weeks from instruction.

### §5.5 If pre-approval IS required

If counsel returns "yes — RERA pre-approval required":

- **Application path:** RERA submission via DLD eServices, accompanied by methodology document (the seven spec files in this folder serve as the methodology submission).
- **Estimated timeline:** 4–8 weeks (per RERA service-level standard).
- **Estimated cost:** legal authorship of the application AED 30–80 k + RERA filing fees TBD.
- **Phase B impact:** Calculator launches in private beta (authenticated subscribers only, no public route) until approval lands.

### §5.6 If pre-approval is NOT required

Most likely outcome based on §5.2. Proceed with public launch. Counsel-confirmed Terms of Use replaces the placeholder draft. Document the counsel opinion (engagement letter + written response) in `docs/specs/feasibility-v6/legal/` for audit. Subsequently: monitor RERA / DLD publications.

### §5.7 OPEN — FOUNDER RATIFY

The whole §5 is provisional. **No external counsel has been engaged yet** — Phase A is research-only. Phase B requires founder authorisation of the counsel-engagement budget and selection of firm.

---

## §6 Fractional / VARA tokenisation pathway (rev-2 NEW)

When the **Fractional / VARA modifier** flag is enabled on any engine 1–13 (per `01 §14`), the Calculator's output panel surfaces a **VARA Compliance Pathway** sub-section.

### §6.1 VARA Virtual Asset Issuance Rulebook 2025 framework

Per [VARA Virtual Asset Issuance Rulebook 2025, latest update 19 June 2025](https://rulebooks.vara.ae/), Asset-Referenced Virtual Assets (ARVAs) — digital tokens backed by real assets including real estate — must comply with:

1. **Issuer licence:** Category 1 Virtual Asset Service Provider (VASP) licence required for any entity issuing tokenised RWAs in Dubai.
2. **Whitepaper:** Compliant whitepaper published, audited, registered with VARA.
3. **Audited asset backing:** Tokens fully backed by audited underlying real-estate assets.
4. **Secondary market:** Separate VARA approval if secondary trading enabled.

### §6.2 Compliance pathway for ZAAHI users (Phase B implementation)

When user enables `Fractional` modifier on a base engine:

1. **Pre-flight check:** Calculator surfaces a VARA compliance checklist.
2. **Issuer status:** User confirms whether they hold VARA Category 1 VASP licence (boolean toggle).
3. **If no licence:** Calculator suggests partner pathway through PRYPCO (the Dubai Land Department's pilot tokenisation partner — May 2025 launched MENA's first tokenised real-estate project; deals only in AED, no crypto-token currency).
4. **Whitepaper draft helper:** Phase B deliverable — calculator pre-fills a whitepaper template with computed asset valuation, token count, audit-confirmation status placeholder.

### §6.3 Pricing for Fractional modifier

The Fractional modifier is a **subscription-tier-gated feature** (rev-2 — defined here):

- **Free public tier:** Fractional toggle disabled; informational-only display "VARA Category 1 issuer licence required — see compliance pathway."
- **Developer subscription (AED 50k/yr):** Fractional toggle enabled; full VARA compliance pathway calculator + whitepaper helper; 5 fractional projects / yr modelling capacity.
- **Higher tiers (TBD):** unlimited fractional modelling + PRYPCO integration.

### §6.4 VARA regulatory fees

Per `02 §3.13` `reg_vara_category_1_licence` line — RATIFY exact figures:

- **Initial application:** Substantial 6-figure AED setup (RATIFY — Crypto Lawyers / VARA Rulebook Section 4 published guidance required).
- **Annual licence renewal:** AED RATIFY.
- **Whitepaper review fee:** AED RATIFY.
- **Audit-of-asset-backing:** Independent audit firm engagement, ~AED 50k–150k per project.

VARA fees to be sourced from public Rulebook + counsel sign-off in Phase B legal-budget consultation (per §5.4).

---

## §7 Admin update flow

### §7.1 Admin route

`/admin/feasibility-database` per `02 §5.2`.

### §7.2 Access control

Per CLAUDE.md `SECURITY RULES`:

```typescript
const userId = await getApprovedUserId(req);
if (!userId) return Response.unauthorized();
const user = await prisma.user.findUnique({ where: { id: userId } });
if (user.role !== 'ADMIN') return Response.forbidden();
```

The `User.role === 'ADMIN'` check is the existing pattern. Zhan and Dymo are the only admin users by current setup.

RLS-policied per `02 §2.7` — table-level access enforced by Postgres regardless of application-layer logic.

### §7.3 Workflow

Detail in `02 §5.4`.

### §7.4 Approval pathway integration

If RERA pre-approval is required (per §5.5), the admin UI gains an extra panel showing:
- Last counsel-approved methodology version
- Date of next RERA renewal (if any)
- Pending changes that require re-submission

---

## §8 Public-launch checklist (Phase B exit criteria)

Before flipping `/feasibility` from staging to production:

| # | Item | Owner |
|---|---|---|
| 1 | Counsel opinion on RERA pre-approval received and acted on | Zhan + Legal |
| 2 | Terms of Use (English) counsel-reviewed and finalised — including rev-2 multi-tier liability cap and refined IP claim | Legal |
| 3 | Arabic translation of Terms of Use complete | Translator + Legal |
| 4 | Cloudflare WAF rules deployed (Bot Fight Mode, rate limit, Turnstile) | Zhan |
| 5 | Cron job for quarterly database update tested in staging | Zhan |
| 6 | Admin UI tested with at least 2 admin users (Zhan + Dymo) | Both founders |
| 7 | All 13 land-use × district × sub-class combinations have populated `CostPreset` rows (5,610 tuples per §3.1) | Database team |
| 8 | All ~84 tooltips authored in EN + AR | Founder + translator |
| 9 | WCAG AA contrast verification across all surfaces (per `03 §5`) | Designer + dev |
| 10 | PDF export tested via hybrid pipeline (jsPDF + weasyprint) on each engine + each language | Dev + QA |
| 11 | Slug-share read-only flow tested + anonymous-claim mechanism | Dev |
| 12 | Telemetry endpoint live, capturing events to Supabase with RLS enforced | Dev |
| 13 | Subscription tier integration (preset endpoint returns `currentQuarter` for paid users) | Dev |
| 14 | Disclaimer modal acceptance flow verified | Dev + Legal |
| 15 | Performance: calculator first paint <2 s on 4G mobile | Dev |
| 16 | Cross-browser test: Chrome / Safari / Firefox / Edge / mobile Safari / mobile Chrome | QA |
| 17 | VARA Fractional modifier compliance pathway functional (rev-2 NEW) | Dev + Legal |
| 18 | RU translation queued for v6.1 release (1–2 weeks post-launch) | Translator |

---

## §99 Consolidated source matrix

Same as `01 §99` source list, cross-referenced and rev-2 corrected. The Turner & Townsend Dubai $1,926/m² citation (audit finding 04-10 / RE-4) is REPLACED — the supporting URL didn't contain that figure; what the URL actually supports is "Riyadh $3,112/m² + Dubai 5 % escalation forecast for major markets." Spec text in `01 §0.5` updated accordingly.

Full institutional citation list in `07_METHODOLOGY.md` §99.

---

## §100 RATIFY items (rev-2)

DLM-1 through DLM-16 from rev-1 retained. rev-2 status:

| # | Status | Notes |
|---|---|---|
| DLM-1 | RESOLVED | Model name unified `SharedFeasibilityCalc` per `02 §2.5` and `03 §4.3` |
| DLM-2 | OPEN | 180-day anonymous-slug retention — confirm |
| DLM-3 | OPEN | PDF disclaimer text — final wording |
| DLM-4 | OPEN | Telemetry events list — confirm capture set |
| DLM-5 | OPEN | Binning thresholds — refine |
| DLM-6 | RESOLVED | Telemetry endpoint = internal Supabase, NOT third-party — confirmed in `02 §2.6` |
| DLM-7 | OPEN | Cloudflare WAF rule set + rate limit — confirm |
| DLM-8 | RESOLVED | Subscription pricing inlined — Developer 50k / Broker 20k / Architect 10k / Investor / Buyer 5k / Owner 3k AED / yr |
| DLM-9 | OPEN | Archibald AI integration scope (LLM provider, latency target) |
| DLM-10 | OPEN — counsel | Terms of Use draft — counsel review and final |
| DLM-11 | OPEN | Footer disclaimer text — final wording |
| DLM-12 | OPEN — counsel | Counsel firm selection (Crimson / Kayrouz / other) and budget |
| DLM-13 | OPEN — counsel | Counsel-engagement timing |
| DLM-14 | OPEN — counsel | RERA approval pathway final |
| DLM-15 | RESOLVED | Admin role per CLAUDE.md — Zhan + Dymo only — confirmed in §7.2 |
| DLM-16 | OPEN | Public-launch checklist — sign off the 18 items (rev-2 added items 17, 18) |

**rev-2 NEW RATIFY items:**

| # | Section | Item | Ask |
|---|---|---|---|
| DLM-17 | §3.1 | Captcha-solving service cost reference 2025 | RATIFY — confirm Anti-Captcha + 2Captcha rates |
| DLM-18 | §3.1 | Realistic preset count 5,610 vs rev-1 6,400 | RATIFY |
| DLM-19 | §6.4 | VARA Category 1 VASP licence fee schedule | RATIFY — counsel + VARA Rulebook Section 4 |
| DLM-20 | §6.3 | Fractional modifier subscription gating — Developer tier minimum | RATIFY |

---

*End of distribution / legal / moat spec rev-2. Next: `06_MASTER_TREE_ALIGNMENT.md` (NEW).*
