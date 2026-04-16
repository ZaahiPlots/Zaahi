# UAE Compliance — Desk Research Draft
Status: DRAFT — not reviewed by founder, not merged to main
Author: Unknown prior Claude session (pre-2026-04-16)
Archived: 2026-04-16 by parking agent
Action required: Founder review before any integration into production knowledge or legal decisions

---

# ZAAHI — UAE Legal & Regulatory Compliance Research

**Version:** 1.0
**Date compiled:** 2026-04-16
**Author:** Claude Code agent (desk research)
**Audience:** Founders Zhan Ryspayev & Dymo Tsvyk — to brief licensed Dubai counsel

---

## 0. Disclaimer

**This document is NOT legal advice.** It is desk research compiled on 2026-04-16 by the ZAAHI Claude Code engineering agent from publicly available sources (regulator websites, law-firm commentary, media). It is intended solely to orient founders Zhan Ryspayev and Dymo Tsvyk for their next conversations with licensed Dubai counsel. Every finding below **must be validated** by a UAE-qualified lawyer (mainland) and, where applicable, a DIFC-registered practitioner before any operational, financial, or commercial decision is made on the back of it. UAE regulation in the areas of virtual assets, data protection, and real estate has moved faster than most public commentary — primary sources (`.gov.ae`, `vara.ae`, `dld.gov.ae`, `tax.gov.ae`, `centralbank.ae`, DIFC / ADGM rulebooks) must be re-verified on the date any action is taken. Items flagged `⚠ VERIFY` are findings where 2025-2026 primary sources could not be confirmed in the research window and require explicit legal validation.

---

## 1. Executive Summary

Five things the founders need to internalise before the next counsel meeting:

- **The USDT TRC-20 ambassador wallet is the single biggest regulatory exposure on the platform.** Taking one-time lifetime payments in USDT from individuals in Dubai (or targeted at Dubai) with a 3-level commission tree almost certainly triggers both (a) VARA jurisdiction over "virtual asset" activities and marketing, and (b) CBUAE Payment Token Services Regulation (PTSR, effective July 2024 with one-year transition to July 2025) restrictions on foreign-currency stablecoin acceptance for non-virtual-asset goods/services. Unlicensed VASP activity fines have ranged from AED 50,000 to AED 600,000 per firm in VARA's 2024-2025 enforcement sweep ([CryptoNews / VARA enforcement summary](https://cryptonews.com/news/dubai-regulator-vara-sanctions-19-crypto-firms-operating-without-licenses-fines-up-to-163k-each/), [Solidus Labs on VARA 2025 Rulebook v2.0](https://www.soliduslabs.com/post/vara-2025-rulebook-update-vasp-compliance)). **P0 action: either (a) switch ambassador tier payments to AED fiat rails before any further paid sign-ups, or (b) engage VARA advisory counsel to scope a licence path and pause USDT intake until cleared.**

- **ZAAHI today is legally an unlicensed platform that looks like a brokerage.** Listing 114 plots at advertised prices in Dubai, running a deal engine with escrow, and charging a 2% service fee on completion, without a RERA brokerage licence and without Trakheesi ad permits, exposes the company to Bylaw 85/2006 enforcement (suspension, blacklist, cancellation) and RERA ad fines starting at AED 50,000 per violation ([Dubai Land Department — Licensed Real Estate Brokers](https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/), [EGSH on Trakheesi fines](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance)). **P0 action: decide now whether ZAAHI is a broker, a pure SaaS marketplace, or a listings portal — the answer decides the whole licence stack.**

- **Data sits in Frankfurt (`eu-central-1`) — this is a cross-border transfer under UAE PDPL (Federal Decree-Law 45/2021) and also falls under EU GDPR because Supabase's processor is in the EU.** Germany is not on a published UAE adequacy list (no list has been issued; Executive Regulations remain unpublished as of early 2025 per [Clyde & Co](https://www.clydeco.com/en/insights/2025/02/data-protection-privacy-landscape-in-me)), so ZAAHI must rely on explicit consent + PDPL-compliant contractual safeguards with Supabase. **P1 action:** publish a Privacy Policy that names Supabase (Frankfurt) as sub-processor, gets explicit PDPL Article 22 consent for cross-border transfer, and adds a Data Processing Addendum.

- **Corporate + tax footprint must be fixed before revenue scales.** UAE CIT (9% above AED 375k taxable income, effective 1 June 2023 onwards; DMTT 15% for MNE groups >EUR 750m from 1 Jan 2025 — not applicable to ZAAHI yet) plus VAT 5% and UBO filing under Cabinet Decision 58/2020 + Resolution 109/2023 are live obligations. Unregistered companies cannot enforce the 2% service fee, issue tax invoices, or open escrow accounts ([PwC UAE Corporate Taxes summary](https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income), [Cabinet Decision 58/2020 — CBUAE](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures)). **P0: incorporate, file UBO, register for CIT.**

- **Roadmap items (ZAH token, DAO, fractional ownership, tokenization, sovereign bank) are VARA / SCA / CBUAE-regulated the moment they launch.** The DLD/VARA tokenization sandbox (REES, Prypco Mint, Ctrl Alt — launched March 2025) is the *only* compliant way to tokenise Dubai real-estate title, and it requires a VARA licence before listing ([DLD REES announcement](https://dubailand.gov.ae/en/news-media/dubai-land-department-launches-pilot-phase-of-the-real-estate-tokenisation-project), [Gulf Business on Prypco Mint](https://gulfbusiness.com/en/2025/real-estate/dld-tokenised-property-project-via-prypco-mint/)). **P2: do not ship ZAH token, fractional ownership or DAO features outside a licensed sandbox path.**

### 30-day critical path (what must move before 2026-05-16)

1. Pick jurisdiction (DIFC Innovation vs DMCC vs DET mainland) and incorporate (P0).
2. Pause USDT-only ambassador payments; implement AED fiat rail OR pause `/join` sign-ups until VARA counsel engaged (P0).
3. Publish Privacy Policy + Terms + "Not Regulated Financial Advice" footer + `legal@zaahi.io` mailbox (P1).
4. File UBO within 15 days of incorporation (P0 — statutory).
5. Engage a Dubai firm with joint real-estate + VARA + PDPL capability for a 2-hour scoping call. Candidates: Al Tamimi, Hadef & Partners, Bird & Bird, Galadari, Fichte & Co, DLA Piper (Section 5).

---

## 2. Licences ZAAHI Needs

Licences are stacked. Reading left-to-right: you need a *business* licence before anything; a *real-estate activity* licence if you broker, list, or advertise property; a *VARA VASP* licence if you handle virtual assets (USDT); and a *DLD integration MoU* + *Trakheesi permit* to pull DDA data and advertise individual listings.

| Licence | Regulator | Scope | Est. cost (AED) | Timeline | Who issues | Renewal | Source |
|---|---|---|---:|---|---|---|---|
| **Commercial Licence — DIFC Innovation** | DIFC Authority | Holding + tech activities for PropTech/FinTech/RegTech; 0% CIT till Jun 2029; access to DIFC PropTech Hub | ~USD 1,500/yr (~5.5k AED) for the subsidised innovation licence; realistic all-in (licence + desk + visas) ~40–70k AED yr 1 | 2–4 weeks | DIFC Registrar of Companies | Annual | [DIFC Innovation Licence](https://www.difc.com/business/establish-a-business/innovation-licence), [Arnifi 2025 guide](https://arnifi.com/blog/difc-innovation-license/) |
| **Commercial Licence — DMCC Free Zone** | DMCC Authority | Tech + trading + crypto-friendly zone (proprietary crypto trading still requires VARA NOC) | ~34k AED base licence; ~70k AED typical package with flexi-desk + 2 visas | 2–4 weeks | DMCC Registration | Annual | [Profound UAE free zone comparison 2025](https://profounduae.com/dubai-free-zones-dmcc-jafza-difc-2025/), [TaxAdepts DMCC 2025](https://taxadepts.com/dmcc-vs-other-free-zones-uae) |
| **Commercial Licence — DET Mainland** | Dubai Dept of Economy & Tourism (DET, formerly DED) | Required if you want to carry out DLD-regulated *brokerage* or serve UAE onshore retail | Licence ~15k AED + trade name + office lease (Ejari) — realistic ~25–40k AED yr 1 | 2–6 weeks | DET | Annual | [Alnaya — Real Estate Licence 2025](https://alnaya.ae/real-estate-license-in-uae-2025-complete-guide-for-investors-agents/), [DLD Real Estate Activity Licence](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/) |
| **RERA Real-Estate Activity Licence + Broker cards** | RERA (under DLD) | Required to broker real estate, earn brokerage commission, or sign a sales agreement. 100% foreign ownership since 2023 | Per-activity licence ~5,020 AED (DLD); broker exam + DREI training 2,500–3,000 AED per individual; office + staff separate | 4–8 weeks incl. DREI course + RERA exam (≥75%) | RERA via Trakheesi portal | Annual (CPD required) | [DLD — Real Estate Activity License](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/), [Krezko RERA 2025](https://krezko.ae/how-to-get-rera-license-in-dubai-an-detailed-guide/), [RaesAssociates](https://www.raesassociates.com/post/how-much-is-the-rera-license-in-dubai/) |
| **Trakheesi Ad Permit** (per listing / per campaign) | DLD via Trakheesi | Required for every property advertisement in Dubai (online, social, print). Primary Unit permit required per unit from April 2024 | AED 1,020 per permit (1,000 + 20 Knowledge & Innovation fees) | 1 working day | DLD — Trakheesi | Per listing / campaign — time-limited | [EGSH Trakheesi 2026](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance) |
| **DLD API / Open Data access** | DLD | API Gateway to pull broker-card, transactions, Ejari, Mollak, Oqood data. Requires corporate account, MoU | Access contract / subscription — **⚠ VERIFY fee schedule with DLD commercial** | Weeks–months (MoU negotiation) | DLD API Gateway | Contract-based | [DLD API Gateway](https://dubailand.gov.ae/en/eservices/api-gateway/), [Dubai Pulse](https://www.dubaipulse.gov.ae/) |
| **VARA Advisory Services Licence** (minimum — if ZAAHI keeps crypto flows) | VARA | Advice on virtual assets. Does not itself permit custody/exchange/broker-dealer | Application fee 100k AED + AED 50k each additional category; annual supervision ~100k AED for Advisory; min paid-up capital 100k AED | 6–12 months typical | VARA | Annual | [VARA Schedule 2 — Fees](https://rulebooks.vara.ae/rulebook/schedule-2-supervision-and-authorisation-fees), [DexMorning VARA 2025](https://dexmorning.com/dubai-vara-crypto-licensing-guide-2025-fees-rules-restrictions), [10Leaves VARA guide](https://10leaves.ae/publications/blockchain-crypto/guide-to-vara-licenses) |
| **VARA Broker-Dealer Licence** (if ZAAHI intermediates USDT purchases) | VARA | Buy/sell/match virtual assets for clients | 100k AED app fee; annual supervision 200k AED+; min capital AED 400k–600k depending on custody arrangement | 9–15 months | VARA | Annual | [10Leaves VARA guide](https://10leaves.ae/publications/blockchain-crypto/guide-to-vara-licenses), [DexMorning](https://dexmorning.com/dubai-vara-crypto-licensing-guide-2025-fees-rules-restrictions) |
| **CBUAE Payment Token Services auth** (if ZAAHI accepts AED-backed stablecoin or processes payments) | Central Bank of the UAE | Issue / convert / custody / transfer payment tokens. Foreign stablecoins (USDT) cannot be accepted as payment for goods/services — only for buying virtual assets | ⚠ VERIFY fee schedule | 6–12 months | CBUAE | Annual | [CBUAE Payment Token Services Regulation](https://rulebook.centralbank.ae/en/rulebook/payment-token-services-regulation), [Financier Worldwide PTSR review](https://www.financierworldwide.com/assessing-the-uae-payment-token-services-regulation) |
| **Trademark — Nice Classes 9, 36, 42** | Ministry of Economy & Tourism (MOET) | ZAAHI™ word + logo in software (9), real-estate services (36), SaaS/tech services (42) | 6,500 AED government fee per class ⇒ ~19,500 AED for 3 classes; SME 50% reduction available under Cabinet Res. 102/2025 | 4–6 months incl. 30-day opposition | MOET | 10 years | [ICLG UAE Trade Marks 2025-2026](https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae), [EGSH Trademark 2026](https://egsh.ae/insights/trademark-registration-uae) |
| **VAT registration** | Federal Tax Authority | Mandatory if taxable supplies > AED 375k/yr; voluntary > 187.5k | 0 fee to register | 20 business days | FTA e-services | n/a | [tax.gov.ae](https://tax.gov.ae/) |
| **Corporate Tax registration** | FTA | Mandatory for all legal persons (incl. free-zone). First return 9 months after fiscal year-end | 0 fee | 30 days of activity | FTA | n/a | [PwC UAE CIT summary](https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income) |
| **UBO filing (Cabinet Decision 58/2020 + Res 109/2023)** | Licensing authority (DET / free-zone Registrar) | Declare natural persons owning ≥25% or exercising control; update within 15 days of any change | 0 fee — penalties up to 100k AED for non-compliance | Continuous | Licensing authority | Ongoing — update within 15 days | [CBUAE Rulebook — Cabinet Decision 58/2020](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures), [Audit Firms Dubai UBO 2025](https://auditfirmsdubai.ae/en/resources/blog/ubo-register-uae-2025) |
| **goAML registration (DNFBP)** | UAE Financial Intelligence Unit (UAEFIU) / Ministry of Economy | Mandatory for real-estate brokers and agents (DNFBP) under AML Decree-Law 20/2018 + Cabinet Decision 10/2019. STR filing platform | 0 fee — failure can trigger 50k–1m AED AML fines | ~30 days | MoE / UAEFIU | Ongoing | [Tamimi — DNFBP AML](https://www.tamimi.com/law-update-articles/circling-back-to-basics-anti-money-laundering-regulations-for-designated-non-financial-businesses-and-professions-in-the-uae/), [UAEFIU real-estate typologies PDF](https://www.uaefiu.gov.ae/media/omqb4a1z/real-estate-money-laundering-typologies-and-patterns-dec-2023.pdf) |

**Read this table with Section 3.** The order of operations matters: you cannot apply for RERA licensing without a commercial licence, you cannot apply for a commercial licence without a clean UBO structure, and you cannot fix the USDT flow without either (a) a VARA licence or (b) a fiat rail under a licensed payments processor.

---

## 3. Action Items with Deadlines

Sorted by the ZAAHI P-scale (P0 = BLOCKS paying user; P1 = REVENUE PATH; P2 = INFRA; P3 = USER FEATURE). Deadlines are business-days from 2026-04-16 unless stated.

| # | Priority | Action | Owner | Deadline | Blocker / dependency | Est. cost (AED) |
|---|---|---|---|---|---|---|
| 1 | **P0** | **Pause new USDT ambassador sign-ups on `/join`** (throw a "under regulatory review" modal) until either (a) fiat AED rail live or (b) VARA counsel greenlights interim path | Zhan | 2026-04-17 (next working day) | None — code-only change | 0 |
| 2 | **P0** | **Decide jurisdiction**: DET mainland vs DIFC Innovation vs DMCC. Write one-pager answering: do we broker? do we need VARA? do we want the DIFC PropTech Hub? | Zhan + Dymo | 2026-04-22 | Section 7 choices | 0 |
| 3 | **P0** | **Incorporate the operating entity** (`ZAAHI FZCO` or equivalent). Appoint Zhan + Dymo shareholders per decision in #2 | Dymo (local presence) | 2026-05-07 | #2 | 25k–70k (one-time, depending on zone) |
| 4 | **P0** | **File UBO** with the licensing authority within 15 days of incorporation (Cabinet Dec 58/2020 + 109/2023) | Corp-services provider | 15 days after #3 | #3 | 0 (internal) |
| 5 | **P0** | **Register for CIT + VAT** with FTA within 30 days of licence issue | Corp-services | 30 days after #3 | #3 | 0 |
| 6 | **P0** | **Engage Dubai counsel** for a 2-hour scoping retainer covering: (i) brokerage licence scope, (ii) VARA exposure, (iii) PDPL compliance, (iv) ambassador-program structure. Shortlist in Section 5 | Zhan | 2026-04-30 | None | ~5k–15k (scoping call) |
| 7 | **P1** | **Publish Privacy Policy + Terms of Service + `legal@zaahi.io` mailbox** citing PDPL (Federal Decree-Law 45/2021), naming Supabase (Frankfurt) as sub-processor, documenting cross-border transfer basis (Art. 22 consent + DPA) | Zhan | 2026-04-23 | Draft via counsel or template | 0 (internal draft) + 3k for legal review |
| 8 | **P1** | **Add "Not regulated financial advice" / "ZAAHI is not a licensed broker — listings informational only" footer** on every parcel page until RERA cover is in place | Zhan | 2026-04-18 | None | 0 |
| 9 | **P1** | **Sign DPA with Supabase** (they publish a GDPR DPA — also covers PDPL under Art. 23 processor obligations) and store the executed copy in `data/contracts/` | Zhan | 2026-04-30 | None | 0 |
| 10 | **P1** | **Replace USDT-only ambassador payments with AED fiat rail** (bank transfer invoice, or a Stripe / Telr / PayTabs route) — OR keep USDT but restructure as VARA-licensed sale of virtual-asset "access token". Counsel must pick the lane | Zhan + counsel | 2026-05-31 | #6 | Depends on lane — see Section 4 |
| 11 | **P1** | **File trademark ZAAHI™ in Nice classes 9, 36, 42** with MOET | Zhan | 2026-05-15 | None | ~19.5k (3 classes; 50% SME discount if eligible under Cabinet Res 102/2025) |
| 12 | **P2** | **Appoint DPO (or external DPO-as-a-service)** — PDPL requires DPO for "high-risk" processing: systematic monitoring, large-scale PII, or sensitive data. ZAAHI is borderline high-risk (financial + ID data + ambassador profiling). Safer to appoint | Zhan | 2026-06-15 | #6 | 24k–60k / yr for outsourced DPO |
| 13 | **P2** | **Register on goAML** as DNFBP — mandatory once RERA licence is live; also prudent earlier under broad AML Decree-Law 20/2018 | Counsel + Compliance | 30 days after RERA licence | #17 | 0 (platform free) |
| 14 | **P2** | **Write + adopt AML/CFT policy, KYC procedure, STR process** (for deals ≥ AED 55k cash or any real-estate freehold transaction) | Counsel + Zhan | 2026-06-30 | #6 | 15k–40k (policy drafting) |
| 15 | **P2** | **Add UBO disclosure + sanctions screening + PEP screening into the signup/approval flow** — today `user_metadata.approved` is a human gate with no KYC artefacts stored. At minimum store Emirates ID / passport, sanctions-screening result, date of screening | Zhan | 2026-07-31 | #14 | 0–3k/mo (screening API) |
| 16 | **P2** | **Decide on tokenization path** — if ZAH token / fractional ownership still on roadmap, either (a) apply to DLD/VARA REES sandbox (Prypco Mint / Ctrl Alt path) or (b) drop tokenization from public roadmap until licensed | Zhan + counsel | 2026-09-30 | #6 | REES sandbox — contact DLD directly |
| 17 | **P2** | **Apply for RERA Real Estate Activity Licence** + register at least 1 licensed broker (DREI course + RERA exam ≥75%) if ZAAHI intermediates deals | Dymo (local presence; candidate for first broker card) | 2026-08-31 | #3, #14 | ~10k–30k incl. licence + training + broker card + office Ejari |
| 18 | **P2** | **Take out Professional Indemnity + Cyber Liability insurance** — PI is a DLD broker requirement and standard under proptech listings model | Zhan | 2026-07-31 | #3 | 15k–60k / yr depending on cover |
| 19 | **P3** | **Scrape / copyright review of DDA master-plan & affection-plan PDFs** (see `/api/parcels/[id]/plot-guidelines` proxy). Confirm terms-of-use of DDA portal permit redistribution on a paywalled platform (Gold/Platinum tiers) | Counsel | 2026-08-31 | #6 | 5k–15k (IP opinion) |
| 20 | **P3** | **Emirates ID / KYC tooling for ambassadors** — today any USDT payer becomes an ambassador after manual admin gate. Add AML Tier-1 KYC for Silver, Tier-2 for Gold, Tier-3 for Platinum | Zhan | 2026-09-30 | #15 | Included in #15 |

---

## 4. Budget Estimates

Two stacks below. "Lean" = minimum to operate legally as a SaaS/listings platform without crypto. "VARA-ready" = can run USDT ambassador flow and touch fractional/tokenization.

### 4.1 Lean Stack — SaaS/listings platform, AED fiat ambassador payments (~150k AED yr 1)

| Item | One-time (AED) | Recurring / year (AED) | Source |
|---|---:|---:|---|
| DIFC Innovation Licence (subsidised) + desk + 2 visas | 25,000 | 25,000 | [DIFC Innovation](https://www.difc.com/business/establish-a-business/innovation-licence) |
| RERA real-estate activity licence (per activity) + DREI + RERA exam + 1 broker card | 15,000 | 5,020 | [DLD](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/) |
| Trakheesi permits (assume 114 listings / yr × AED 1,020) | — | ~116,280 **if** each listing re-permit is needed — in practice ZAAHI may only permit promotional campaigns. ⚠ VERIFY with DLD | — |
| UBO filing / corp-services retainer | 5,000 | 10,000 | [Cabinet Decision 58/2020](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures) |
| Trademark — Nice 9/36/42 (3 classes) | 19,500 | — (10 yrs valid) | [ICLG UAE 2025-2026](https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae) |
| Legal retainer — Dubai boutique (4 hrs/mo) | 5,000 (onboarding) | 36,000 | Section 5 |
| External DPO-as-a-service (part-time) | — | 24,000 | market estimate |
| Privacy policy + T&Cs drafted + reviewed | 10,000 | — | Section 5 |
| Professional Indemnity + Cyber insurance (mid cover, ~AED 2m limit) | — | 25,000 | [CoverB / Howden UAE](https://www.howdengroup.com/ae-en/cover/professional-indemnity) |
| CIT / VAT registration + first return prep | 2,000 | 8,000 | FTA |
| Accountancy & audit (free-zone auditor mandatory for QFZP status) | — | 20,000 | [Alpha Partners QFZP](https://www.alphapartners.co/blog/qualifying-free-zone-person-rules-in-the-uae-corporate-tax-system) |
| AML policy drafting + goAML onboarding | 20,000 | 6,000 | [Tamimi DNFBP AML](https://www.tamimi.com/law-update-articles/circling-back-to-basics-anti-money-laundering-regulations-for-designated-non-financial-businesses-and-professions-in-the-uae/) |
| **Subtotal, Lean** | **~101,500** | **~158,000** | — |
| **Year-1 total (Lean)** | | **~260k** | Reduces in yr 2 to ~160k ongoing |

Note: The CLAUDE.md prompt targeted "~150k AED" for Lean — a tighter reading is achievable if (a) Trakheesi permits are per-campaign rather than per-listing, (b) ZAAHI defers RERA licensing by formally not brokering, (c) DPO is deferred 6 months. The ~150k figure is realistic as a *recurring* budget once year 1 one-time costs are behind.

### 4.2 VARA-Ready Stack — can hold USDT, run ambassador crypto flow, ship tokenization (~500k+ AED yr 1)

| Additional item over Lean | One-time (AED) | Recurring / year (AED) | Source |
|---|---:|---:|---|
| VARA Advisory application fee (1 activity) | 100,000 | — | [VARA Schedule 2](https://rulebooks.vara.ae/rulebook/schedule-2-supervision-and-authorisation-fees) |
| VARA Advisory annual supervision fee | — | 100,000 | Ibid |
| Additional VARA category (Broker-Dealer if intermediating crypto) | 50,000 | 200,000 | Ibid |
| VARA min paid-up capital — Advisory | 100,000 (locked) | — | [DexMorning](https://dexmorning.com/dubai-vara-crypto-licensing-guide-2025-fees-rules-restrictions) |
| VARA min paid-up capital — Broker-Dealer | 400,000 (locked, up from Advisory) | — | Ibid |
| VARA legal + compliance officer + MLRO (in-house or outsourced) | — | 120,000–240,000 | market estimate |
| VARA external counsel for licence application | 150,000 | 50,000 | boutique firm quote estimate |
| Travel-rule compliance tooling (Notabene / Sumsub) | — | 30,000 | [Notabene Dubai Travel Rule](https://notabene.id/world/dubai) |
| CBUAE PTSR advisory (if payment-token custody/transfer arises) | 50,000 | 50,000 | ⚠ VERIFY |
| REES tokenization sandbox application (if fractional ownership live) | ⚠ VERIFY — sandbox access TBD | — | [DLD REES](https://dubailand.gov.ae/en/news-media/dubai-land-department-launches-pilot-phase-of-the-real-estate-tokenisation-project) |
| Additional DPI/cyber cover (higher limits for regulated firm) | — | +30,000 | market |
| **Delta over Lean** | **~800,000** locked capital + **~350k** operating | **~750,000** ongoing | — |
| **Year-1 total (VARA-Ready)** | | **~1.1–1.4m** | Drops to ~900k ongoing by yr 3 |

**Interpretation:** VARA-Ready is a founder decision. If the founders' conviction is that USDT ambassador flow + ZAH token + fractional ownership are core to the ZAAHI thesis, VARA is unavoidable. If not — pivot to AED rails and DIFC Innovation + RERA covers 95% of today's product.

---

## 5. Recommended Dubai Lawyers

Shortlist, verified via Chambers / Legal 500 / firm websites. Pick one full-service (for brokerage licensing and day-to-day corporate) + one boutique (for VARA / fintech). All URLs verified 2026-04-16.

| Firm | Specialty | Website | Contact (public) | Notes |
|---|---|---|---|---|
| **Al Tamimi & Company** | Largest regional firm — real-estate, corporate, M&A, regulatory. Deep DLD/RERA relationships. Publishes authoritative DNFBP AML guidance | [tamimi.com](https://www.tamimi.com/) | Dubai HQ via contact form; real-estate partner Samir Kantaria referenced publicly s.kantaria@tamimi.com | Expensive but the default choice for "I want it right the first time" ([Chambers UAE Real Estate](https://chambers.com/legal-rankings/real-estate-united-arab-emirates-2:11:223:1)) |
| **Baker McKenzie (Habib Al Mulla & Partners)** | Global firm with solid real-estate + fintech + Islamic finance | [bakermckenzie.com/en/locations/emea/united-arab-emirates](https://www.bakermckenzie.com/en/locations/emea/united-arab-emirates) | Dubai office via website | Good for multi-jurisdiction matters (UAE + KZ/UA where founders come from) |
| **DLA Piper Middle East** | Global, strong real-estate, data & cyber, proptech. Published digital-asset series 2025 | [dlapiper.com](https://www.dlapiper.com/en-us/insights/publications/the-uae-cryptocurrency-and-digital-asset-regulation-series) | Dubai + Abu Dhabi offices | Good if ADGM pivot ever considered |
| **Bird & Bird (Dubai & Abu Dhabi)** | Tech + data protection focus. One of the first law firms to publish detailed UAE PDPL analysis. Covers DIFC DPL amendments 2025 | [twobirds.com](https://www.twobirds.com/) | Dubai office via website | Best for PDPL + IP (data scraping, DDA terms review) + SaaS T&Cs |
| **Hadef & Partners** | UAE-founded firm. FinTech licensing, crypto (VARA/DFSA/FSRA), open banking, data protection. Acted as UAE co-counsel in FTX Chapter 11 | [hadefpartners.com/expertise/fintech](https://hadefpartners.com/expertise/fintech/) | Abu Dhabi + Dubai; contact via website | Very strong crypto credentials; boutique pricing |
| **Galadari Advocates & Legal Consultants** | UAE firm. Fintech, regulatory & compliance. Published analyses of DLD REES tokenization sandbox | [galadarilaw.com/practice/fintech](https://galadarilaw.com/practice/fintech/) | Dubai HQ | Good middle-ground between full-service and boutique |
| **Fichte & Co** | Shipping + fintech + crypto. Published CBUAE Payment Token Services Regulation analysis | [fichtelegal.com](https://fichtelegal.com/) | Dubai | Strong on stablecoin / PTSR angle — directly relevant to USDT question |
| **CMS Cameron McKenna Nabarro Olswang** | Global firm. TMT, cloud computing, data privacy. Compact but well-regarded Dubai team | [cms.law](https://cms.law/) | Dubai office | Good for cloud / Supabase hosting / cross-border transfer opinion |
| **Kayrouz & Associates** | Boutique, publishes strong 2025-2026 guides on fintech setup and PDPL cross-border transfers | [kayrouzandassociates.com](https://www.kayrouzandassociates.com/) | Dubai | Good for startup-scale retainers |

**Recommended engagement pattern for ZAAHI:**
- **Primary (monthly retainer):** one of Hadef, Galadari, or Kayrouz — boutique for day-to-day.
- **Specialist (one-off scoping):** Bird & Bird for PDPL + data protection opinion; Fichte for CBUAE PTSR / USDT opinion; Al Tamimi if you want the DLD conversation taken seriously by the regulator.

---

## 6. Risk Matrix

Scoring: L=Low, M=Medium, H=High. "Status" = as of 2026-04-16 based on CLAUDE.md + deployed code. "Owner" names the human who fixes it.

| # | Risk | Likelihood | Impact | Current status | Mitigation | Owner |
|---|---|:---:|:---:|---|---|---|
| R1 | USDT ambassador flow triggers unlicensed VASP finding (VARA enforcement fines 50k–600k AED per firm in 2024-2025) | **H** | **H** | Live on prod; single wallet `TELi…4j7` accepting funds daily | **P0** pause intake; engage VARA counsel; switch to fiat rail OR apply Advisory licence | Zhan |
| R2 | Platform operates as de-facto broker without RERA licence (Bylaw 85/2006 — suspension, blacklist, cancellation; fines up to 1m AED under Exec Council Res 25/2009) | **M** | **H** | 114 plots listed at specific prices, deal engine + escrow + commission flow; no RERA cover | **P0** apply RERA (needs Dymo or hired broker); OR relabel as "listings informational platform" with explicit legal disclaimer | Zhan + Dymo |
| R3 | PII stored in Frankfurt (`eu-central-1`) violates PDPL cross-border transfer rules (consent not captured, adequacy list not published by UAE Data Office) | **H** | **M** | Supabase config; no privacy policy live; no documented consent | **P1** publish Privacy Policy; get Art. 22 explicit consent checkbox on signup; sign Supabase DPA; consider standard contractual clauses (model TBD under Executive Regs) | Zhan |
| R4 | Advertising plots without Trakheesi permit (DLD fines from AED 50,000 per violation; can escalate to licence cancellation) | **H** | **M** | Map shows 114 plots with prices on zaahi.io — arguably advertising | **P1** Trakheesi permits per promotional campaign; OR take plot prices off public view until permits in place | Zhan |
| R5 | No UBO filed (Cabinet Dec 58/2020 + Res 109/2023 — penalties up to 100k AED, licence suspension) | **H** (auto-triggered on incorporation) | **M** | No operating entity yet | **P0** file within 15 days of incorporation | Corp-services provider |
| R6 | No DPO appointed (PDPL Art. 10 thresholds ambiguous pending Exec Regs; ZAAHI is borderline high-risk — financial + ID + profiling data) | **M** | **M** | No DPO | **P2** appoint external DPO-as-a-service | Zhan |
| R7 | Scraping / redistributing DDA affection plans + master plans + PMTiles behind paywalled Gold/Platinum tiers (potential copyright / terms-of-use breach) | **M** | **M** | `/api/parcels/[id]/plot-guidelines` proxies DDA PDFs; `data/` contains GeoJSON from DDA | **P3** IP opinion on DDA portal terms; consider moving public-domain geographic data (UAE gov works are generally non-copyright) vs commercial data; attribute "Source: DDA" everywhere | Zhan |
| R8 | AML/CFT exposure — DNFBP status when ZAAHI brokers freehold real-estate transactions ≥ AED 55k triggers STR filing, KYC, goAML registration (Decree-Law 20/2018) | **H** (once revenue starts) | **H** | No AML policy, no KYC artefacts, no goAML | **P1–P2** policy drafting + goAML registration + KYC tooling | Zhan + counsel |
| R9 | Marketing virtual assets to UAE audiences without VARA registration (VARA Marketing Rulebook 2024 applies to "sponsored posts, referral links, influencer content") — `/join` with USDT wallet arguably qualifies | **M** | **H** | `/join` is public, promotes USDT payment | **P0** add geo-blocking of UAE audience OR pause `/join` until VARA scoped | Zhan |
| R10 | Accepting foreign stablecoin (USDT) for non-virtual-asset goods/services violates CBUAE PTSR 2024 (effective July 2024, transition to July 2025) — merchant acceptance of USDT restricted to purchases of virtual assets only | **H** | **H** | SILVER/GOLD/PLATINUM tiers are memberships, not virtual assets | **P0** switch to AED or structure tier purchase as virtual-asset sale (risky) | Zhan + counsel |
| R11 | Ambassador program looks like MLM → pyramid-scheme scrutiny (UAE MoE + DED enforcement; compensation must be product-based not recruitment-based) | **M** | **M** | 3-level commission but tied to platform service fee on deal closure (product-based revenue) — defensible but needs cleanup | **P2** ensure commission is *only* paid on deal completion, not on downline sign-up alone; document in T&Cs | Zhan |
| R12 | Cybercrime Law 34/2021 exposure — platform duty to remove illegal content, user-generated listings, misleading ads; corporate liability expanded | **L–M** | **M** | No user-generated content yet; 114 plots curated | **P2** content-moderation policy; takedown workflow for misleading listings; named officer for regulator response | Zhan |
| R13 | Corporate tax filing missed (9% CIT above AED 375k; filing 9 months after FY end) | **M** (depending on ops launch) | **M** | No entity yet | **P0** register for CIT within 30 days of licence | Accountant |
| R14 | Ambassador tier payments not displaying AED equivalents on `/join` — UAE Consumer Protection Law 15/2020 + advertising rules require AED pricing to UAE audiences | **L** | **L** | CLAUDE.md notes approx USDT conversions; AED is canonical | **Quick win:** ensure `/join` displays "1,000 AED" as primary with USDT approx secondary | Zhan |
| R15 | No trademark on ZAAHI™ — squatter risk; cannot enforce brand in UAE or Madrid system | **L** (but growing) | **M** | Not filed | **P1** file Nice 9/36/42 within 30 days | Zhan |
| R16 | Founder immigration — Zhan (Kazakhstan origin, CEO/CTO) may not have UAE residency yet; free-zone licence requires either residency or establishment card route; mainland requires local service agent in some cases | **⚠ VERIFY** | **M** | Unknown | Confirm visa + Emirates ID for both founders; free-zone typically resolves this | Dymo |
| R17 | DIFC vs ADGM data-law arbitrage — if ZAAHI ever incorporates in DIFC, DIFC DPL (amended 15 Jul 2025) applies with SCCs + data-transfer impact assessment duty | **L** | **L** | N/A until DIFC chosen | DIFC DPL 2025 amendments impose documented transfer-assessment duty ([Bird & Bird](https://www.twobirds.com/en/insights/2025/united-arab-emirates/difc-enacts-amendments-to-data-protection-law)) | Counsel |

---

## 6A. Deep-Dive: The 11 Research Topics

This section walks each regulatory area end-to-end: **(a) the rule**, **(b) what it means for ZAAHI specifically**, **(c) source URL**, **(d) last-verified date (all 2026-04-16 for this version)**.

### 6A.1 RERA — Real Estate Regulatory Agency

**(a) The rule.** Dubai Bylaw 85/2006 ("Bylaw Regulating the Real Estate Brokers Register in the Emirate of Dubai") is the foundational text. Article 3 prohibits any unlicensed person from engaging in brokerage activities or receiving compensation for them ([legaladviceme summary](https://legaladviceme.com/legislation/115/bylaw-85-of-2006-regulating-real-estate-brokers-register-in-dubai)). The executive fines schedule is Executive Council Resolution 25/2009, which caps individual violation fines at AED 1,000,000 (doubled on repetition within 12 months) ([dlp.dubai.gov.ae](https://dlp.dubai.gov.ae/Legislation%20Reference/2010/Executive%20Council%20Resolution%20No.%20(25)%20of%202009.html)). To be a licensed broker, a natural person must be 21+, hold valid UAE residency, obtain a Police Certificate of Good Conduct, complete the DREI (Dubai Real Estate Institute) Certified Training, and pass the RERA exam with ≥75%. The brokerage firm itself obtains the Real Estate Activity Licence via the **Trakheesi** portal at a DLD-set cost of ~AED 5,020 per activity; 100% foreign ownership has been permitted since 2023 ([DLD Real Estate Activity Licence](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/), [Krezko RERA 2025](https://krezko.ae/how-to-get-rera-license-in-dubai-an-detailed-guide/)). Individual agent licences are ~AED 2,500–3,000 all-in and renew annually with CPD hours. Each *advertised* listing additionally requires a **Trakheesi Ad Permit** at AED 1,020 per permit; DLD's rolling 2024-2025 reform split "Primary Project" and "Primary Unit" permits into separate categories — a separate permit now required per unit advertised on any platform ([EGSH Trakheesi guide](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance)). DLD publicly enforces: in one 2024 sweep alone DLD fined 10 real-estate companies and warned 30 more for advertising non-compliance ([DLD news](https://dubailand.gov.ae/en/news-media/dld-fines-10-real-estate-companies-and-warns-another-30-for-not-adhering-to-advertising-requirements/)). Typical Trakheesi fines start at AED 50,000 per violation and escalate to licence cancellation; categories cited publicly include (i) advertising without a permit, (ii) manipulating / reusing permit numbers, (iii) using expired permits.

**(b) What it means for ZAAHI.** Today ZAAHI lists 114 plots at defined prices (see `Parcel.currentValuation` in `prisma/schema.prisma`, seeded per CLAUDE.md §SESSION STATUS). The home page and `/parcels/map` make those prices publicly visible. The definitional test for "brokerage" under Bylaw 85/2006 is not merely who touches the money but *whether the platform holds itself out as intermediating a real-estate transaction and earns a fee on completion*. The ZAAHI 2% service fee on `DEAL_COMPLETED` (`ZAAHI_SERVICE_FEE_RATE = 0.02` in `src/lib/ambassador.ts`) is the fingerprint of a brokerage. Three possible legal postures, ordered by risk:
  1. **Broker (highest coverage, highest cost):** Obtain RERA Real Estate Activity Licence, register at least one individual broker (likely Dymo given his 2018+ Dubai tenure), apply for Trakheesi permits per promotional campaign, file goAML as DNFBP. Revenue becomes defensible. 2% service fee becomes a "brokerage commission".
  2. **Listings portal (lower coverage, ambiguous):** Take Bayut / Property Finder posture — "we publish listings, do not intermediate". Still need Trakheesi permit for each listed unit (Bayut and Property Finder do obtain these). No deal engine, no escrow, no commission. Would require turning off ZAAHI's deal engine core functionality — likely a non-starter given revenue model.
  3. **SaaS to licensed brokers (cleanest separation):** ZAAHI is a B2B SaaS licensed to RERA-registered brokers who in turn use ZAAHI's deal engine for their own (already-permitted) listings. 2% becomes a SaaS subscription fee, not a brokerage commission. Clean from RERA but loses retail/consumer reach.
  The founders' answer to Q4 in Section 8 dictates which posture is pursued.

**(c) Source URLs (last verified 2026-04-16):**
- https://dubailand.gov.ae/en/eservices/real-estate-activity-license/
- https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/
- https://legaladviceme.com/legislation/115/bylaw-85-of-2006-regulating-real-estate-brokers-register-in-dubai
- https://krezko.ae/how-to-get-rera-license-in-dubai-an-detailed-guide/
- https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance
- https://dubailand.gov.ae/en/news-media/dld-fines-10-real-estate-companies-and-warns-another-30-for-not-adhering-to-advertising-requirements/

### 6A.2 DLD — Dubai Land Department

**(a) The rule.** DLD is the registrar + regulator of all real-estate activity in Dubai. It operates the "Dubai REST" digital platform (the primary consumer app — 320,000+ transactions in 2025 covering ~78% of non-developer property transactions), the Trakheesi portal (brokers + ads), Oqood (off-plan registration), Ejari (tenancy), and Mollak (OA / service-charge). Title deeds have been fully digital since March 2024 — no new paper deeds issued since then; the digital title deed includes owner name, property description, plot number, community, area sqft, transaction date, DLD registration number, and is stored on DLD's blockchain-backed ledger with real-time verification and tamper-proof records ([Dubai Title Deed guide](https://egsh.ae/insights/title-deed-dubai-guide), [DLD REST app guide](https://realestateclubdubai.com/blog/buying-guide/the-dubai-rest-app-complete-guide-to-managing-your-property-digitally-in-2026)). DLD publishes the **Open Data portal** via Dubai Pulse ([dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/)), offering queryable datasets on freehold units, projects, transactions, valuations — free for research use but subject to terms restricting commercial redistribution. DLD also runs a commercial **API Gateway** ([DLD API Gateway](https://dubailand.gov.ae/en/eservices/api-gateway/)) with real-time access to broker cards, broker office data, Ejari, Mollak, Trakheesi — subscription / MoU-based, pricing private and negotiated per integrator. Separately, DLD launched the **Real Estate Evolution Space (REES)** tokenization sandbox in March 2025, with Prypco Mint as the first licensed pilot and Ctrl Alt as the second ([DLD REES announcement](https://dubailand.gov.ae/en/news-media/dubai-land-department-launches-pilot-phase-of-the-real-estate-tokenisation-project), [Gulf Business on Prypco Mint](https://gulfbusiness.com/en/2025/real-estate/dld-tokenised-property-project-via-prypco-mint/)). REES transactions are AED-settled (not crypto); only UAE ID holders may buy in Phase 1/2; minimum investment AED 2,000; blockchain layer is XRPL; tokens are VARA-regulated Asset-Referenced Virtual Assets (ARVA) backed by DLD title deed. DLD projects AED 60bn market value by 2033 (~7% of Dubai transactions). For off-plan, **Oqood** is the mandatory pre-registration platform — no off-plan sale can be legally concluded without an Oqood entry against the title.

**(b) What it means for ZAAHI.** Three integration routes are on the table:
  1. **Open Data Portal (free, low-fidelity):** pull bulk datasets (transactions, valuations, district-level stats) for analytics / comparables. Fine for the `/analytics` module of ZAAHI, attribution required, no real-time verification possible.
  2. **DLD API Gateway (paid, high-fidelity):** required if ZAAHI wants to verify title deeds in-flow, pull Ejari / Mollak / Trakheesi records, integrate broker cards. Gateway access is MoU-based; practically requires corporate licence + probably a RERA activity licence as prerequisite to be taken seriously by DLD commercial team. Fee structure not public — `⚠ VERIFY`.
  3. **REES sandbox (regulated, long lead time):** the only legal path for ZAAHI's fractional-ownership / ZAH-token ambitions. Requires VARA licence + DLD MoU + bank partner (Zand is Prypco's partner — suggests a short list of banks DLD will countenance). Not a 2026 deliverable.
  For the plot-listing product, DLD mandatory disclosures on any listed property include: plot number, community, area sqft, land use, plot owner status (if ZAAHI is not the owner, this must be disclosed with the broker-card number — which requires a RERA licence first). The master-plan / affection-plan proxy (CLAUDE.md notes `/api/parcels/[id]/plot-guidelines`) exposes ZAAHI to terms-of-use risk — see Section 6A.10.

**(c) Sources (last verified 2026-04-16):**
- https://dubailand.gov.ae/en/eservices/api-gateway/
- https://dubailand.gov.ae/en/open-data/
- https://www.dubaipulse.gov.ae/
- https://dubailand.gov.ae/en/eservices/real-estate-tokenization/
- https://dubailand.gov.ae/en/news-media/dubai-land-department-launches-pilot-phase-of-the-real-estate-tokenisation-project
- https://egsh.ae/insights/title-deed-dubai-guide

### 6A.3 TDRA — Telecommunications & Digital Government Regulatory Authority

**(a) The rule.** TDRA is the federal regulator for telecom + digital services + `.ae` domain allocation. Its compliance-adjacent instrument is Federal Decree-Law 34/2021 (Cybercrimes Law, effective 2 January 2022), which creates corporate liability for platforms that host illegal content, fail to remove false information harmful to UAE interests, or enable unauthorised access to government systems ([uaelegislation.gov.ae](https://uaelegislation.gov.ae/en/legislations/1526/download), [u.ae cyber-safety page](https://u.ae/en/information-and-services/justice-safety-and-the-law/cyber-safety-and-digital-security)). TDRA additionally publishes the "UAE Information Assurance Regulation" establishing minimum security baselines for information assets across UAE entities. The law applies extraterritorially to any platform targeting UAE users — `.io` or `.com` hosting does not exempt a platform from corporate liability if it markets to UAE residents. There is no blanket ".ae domain required" rule, but failing to remove unlawful user-generated content after notice exposes the platform to fines and operational restrictions ([Kayrouz cybercrime guide 2026](https://www.kayrouzandassociates.com/insights/guide-to-cybercrime-law-in-the-uae)).

**(b) What it means for ZAAHI.** `zaahi.io` operated from Vercel + Supabase (EU) targets UAE users — within scope. Practical implications:
  - Designate a **content takedown / notice address** (`legal@zaahi.io` recommended in Section 7) with SLA for response.
  - Keep moderation logs for any user-generated listing, comment, or ambassador content (currently ZAAHI has none — 114 plots are curated, `/join` is static marketing — but this changes the moment ambassadors can share custom content).
  - Under Cybercrime Law 34/2021 Art. 48 onwards, misleading statements about UAE economy / real-estate market could attract scrutiny. ZAAHI marketing copy on `/` and `/join` should avoid absolute financial claims ("guaranteed returns", "risk-free").
  - Information Assurance Regulation is primarily aimed at critical-infrastructure operators — ZAAHI is not one today, but a future sovereign-bank module would be in scope.

**(c) Sources (last verified 2026-04-16):**
- https://uaelegislation.gov.ae/en/legislations/1526
- https://u.ae/en/information-and-services/justice-safety-and-the-law/cyber-safety-and-digital-security
- https://www.kayrouzandassociates.com/insights/guide-to-cybercrime-law-in-the-uae
- https://tdra.gov.ae (regulator portal)

### 6A.4 PDPL — Personal Data Protection Law (Federal Decree-Law 45/2021)

**(a) The rule.** Federal Decree-Law 45/2021 was issued 20 September 2021, enacted 28 November 2021, and in force from 2 January 2022 ([Securiti summary](https://securiti.ai/uae-personal-data-protection-law/), [u.ae data-protection-laws](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws)). It applies to any processing of personal data of UAE data subjects regardless of where the controller/processor sits. The UAE Data Office is the regulator. **Executive Regulations remain unpublished as of 6 January 2025** ([Clyde & Co Middle East Data Protection 2025](https://www.clydeco.com/en/insights/2025/02/data-protection-privacy-landscape-in-me)). Consequences: several PDPL articles are "subject to Executive Regulations" and cannot yet be enforced with precision (DPO thresholds, specific breach-notification deadlines, adequacy country lists, official SCC templates). Once Executive Regulations are issued, entities have 6 months to comply. Publicly cited maximum fine is **AED 5,000,000** ([uaepdpl.com](https://uaepdpl.com/) and law-firm summaries — exact statutory text is in pending Executive Regulations; cross-check when published). Key substantive rules in the primary law:
  - **Lawful bases (Art. 4):** consent is primary; other bases include contract, legal obligation, vital interests, legitimate interests, public interest.
  - **Consent (Art. 6):** explicit, specific, informed, freely given; may be withdrawn at any time without detriment.
  - **Data subject rights (Arts. 13-19):** access, rectification, erasure ("right to be forgotten"), restriction, portability, objection, and right to object to automated decision-making / profiling.
  - **Cross-border transfers (Arts. 22-23):** permitted to (i) countries with adequacy (UAE Data Office maintains a list — **not yet published**); (ii) under contractual safeguards (standard clauses or BCR-equivalent); (iii) with explicit consent; (iv) for contract performance; (v) for international judicial cooperation; (vi) for public interest ([China Briefing on UAE cross-border data flows](https://www.china-briefing.com/china-outbound-news/uae-data-protection-obligations-and-cross-border-data-transfer-for-businesses)).
  - **Breach notification (Art. 9):** controllers must notify Data Office without undue delay; 72-hour rule referenced but exact trigger pending Executive Regulations.
  - **DPO (Art. 10):** must be appointed where processing involves (i) large-scale systematic monitoring, (ii) large-scale sensitive data, or (iii) systematic automated profiling. Otherwise optional ([uaepdpl.com Article 10](https://uaepdpl.com/article-10/)).

  **Parallel regimes inside UAE financial free zones:**
  - **DIFC Data Protection Law No. 5/2020**, amended by **Amendment Law 1/2025** effective 15 July 2025. Closely modelled on EU GDPR. DIFC publishes its own Standard Contractual Clauses based on EU model clauses + UK IDTA ([DIFC Commissioner of Data Protection](https://www.difc.com/business/registrars-and-commissioners/commissioner-of-data-protection/data-export-and-sharing), [Bird & Bird on 2025 amendments](https://www.twobirds.com/en/insights/2025/united-arab-emirates/difc-enacts-amendments-to-data-protection-law)). 2025 amendment adds a **documented transfer-impact assessment** requirement — controller/processor must assess recipient-jurisdiction protections and remedies before exporting data.
  - **ADGM Data Protection Regulations 2021** — also GDPR-modelled; has its own SCCs + adequacy list that tracks European Commission decisions; EU SCC users can append the ADGM Addendum instead of re-papering ([ADGM Data Transfers brochure May 2025](https://assets.adgm.com/download/assets/ADGM+Data+Transfers+Brochure.pdf/d0458c2c58a611efa409e27828504259)).

**(b) What it means for ZAAHI.**
  - **Frankfurt hosting = cross-border transfer.** Supabase `eu-central-1` is in Germany. Germany is GDPR-adequate from the EU side. From the UAE side there is no adequacy list, so ZAAHI must rely on either (i) explicit Art. 22 consent from each data subject at signup (best practice: a distinct checkbox on the UAE-resident signup flow — NOT bundled with the Terms of Service checkbox), or (ii) contractual safeguards via a Data Processing Addendum with Supabase. Supabase publishes a GDPR-compliant DPA; ZAAHI must execute and store it.
  - **Signup consent capture:** today the signup flow only gates `user_metadata.approved`; no PDPL-compliant consent capture. P1 fix: add consent text + timestamp + IP + version fields to the user record; store consent artefacts immutably.
  - **DPO threshold:** ZAAHI processes (a) financial data (commissions, deal values), (b) ID-adjacent data (approved/rejected users), (c) downline-ambassador profiles — this is close to systematic profiling. Safer to appoint external DPO than argue the edge case post-breach.
  - **DIFC route dividend:** incorporating the ZAAHI holding entity in DIFC would activate DIFC DPL rather than federal PDPL for DIFC-resident data. DIFC DPL is mature, with published SCCs, a real Commissioner office, and clear enforcement. Trade-off: federal PDPL still applies to any UAE-resident user data that sits outside DIFC systems — in practice ZAAHI would have both regimes running in parallel.
  - **Data-subject request (DSR) workflow:** today there is no intake path for "delete my data", "export my data", "rectify my data". Build a `legal@zaahi.io` mailbox + a DSR handler module before first public launch campaign.

**(c) Sources (last verified 2026-04-16):**
- https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws
- https://securiti.ai/uae-personal-data-protection-law/
- https://uaepdpl.com/article-10/
- https://www.clydeco.com/en/insights/2025/02/data-protection-privacy-landscape-in-me
- https://www.china-briefing.com/china-outbound-news/uae-data-protection-obligations-and-cross-border-data-transfer-for-businesses
- https://www.twobirds.com/en/insights/2025/united-arab-emirates/difc-enacts-amendments-to-data-protection-law
- https://assets.adgm.com/download/assets/ADGM+Data+Transfers+Brochure.pdf/d0458c2c58a611efa409e27828504259
- https://www.difc.com/business/registrars-and-commissioners/commissioner-of-data-protection

### 6A.5 AML / CFT — Federal Decree-Law 20/2018 (as amended)

**(a) The rule.** The primary instrument is Federal Decree-Law 20/2018 ("AML Law") + Cabinet Decision 10/2019 (regulations + DNFBP scope). Real-estate brokers and agents are explicitly named as **Designated Non-Financial Businesses and Professions (DNFBPs)** ([Tamimi DNFBP AML](https://www.tamimi.com/law-update-articles/circling-back-to-basics-anti-money-laundering-regulations-for-designated-non-financial-businesses-and-professions-in-the-uae/), [BSA Law DNFBP](https://bsalaw.com/insight/overview-of-the-dnfbp-aml-requirements-in-the-uae-with-a-specific-focus-on-real-estate-brokers/)). Core obligations for DNFBPs:
  - **Register on the goAML portal** (operated by the UAE FIU) — mandatory, no cost ([Elevate Auditing goAML](https://elevateauditing.com/goaml-registration-uae/)).
  - **Customer Due Diligence (CDD):** ID + beneficial owner + source of funds for every counterparty.
  - **Enhanced Due Diligence (EDD):** for PEPs, high-risk jurisdictions, unusual transaction patterns.
  - **Transaction monitoring:** ongoing; risk-rated.
  - **Suspicious Transaction Report (STR)** within prescribed time of suspicion; **Suspicious Activity Report (SAR)** for patterns.
  - **AED 55,000 threshold:** real-estate professionals must report any purchase/sale of freehold real estate involving single or aggregated cash transactions ≥ AED 55,000 — the **Real Estate Activity Report (REAR)** ([UAEFIU real-estate typologies PDF Dec 2023](https://www.uaefiu.gov.ae/media/omqb4a1z/real-estate-money-laundering-typologies-and-patterns-dec-2023.pdf)). This is a *proactive* report, independent of whether suspicion exists.
  - **UBO disclosure** under Cabinet Decision 58/2020 (amended by Res 109/2023): register natural persons owning ≥25% or exercising control; update within 15 days of change; penalties up to AED 100,000 plus licence suspension ([CBUAE Rulebook — Cabinet Decision 58/2020](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures), [Audit Firms Dubai UBO 2025](https://auditfirmsdubai.ae/en/resources/blog/ubo-register-uae-2025)).
  - **2025 intensification:** MoE inspections in H1 2025 produced AED 42m+ in fines, majority on real-estate and precious-metals dealers ([Clyde & Co AML July 2025](https://www.clydeco.com/en/insights/2025/07/navigating-the-uae-s-aml-framework)). October 2025 AML law explicitly extends to VASPs — this captures ZAAHI's USDT flow if not captured already under VARA ([UAE Advisor Guide Feb 2026](https://www.uaeadvisorguide.com/2026/02/uae-tightens-aml-rules-for-real-estate.html)).

**(b) What it means for ZAAHI.**
  - **ZAAHI is a DNFBP the moment it brokers a freehold transaction.** Once RERA-licensed under Section 6A.1, goAML registration is mandatory within ~30 days. Even *before* RERA licensing, facilitating deals on-platform + taking a 2% fee arguably makes ZAAHI a DNFBP under a broad reading.
  - **KYC artefacts:** today `user_metadata.approved` is a manual admin flag. No ID docs stored. No sanctions screening. No PEP flag. No source-of-funds attestation. All of these are CDD minimum for a DNFBP.
  - **REAR threshold:** 114 plots, prices in the millions of AED → every single on-platform transaction will exceed AED 55,000 several times over. Every transaction is a REAR trigger by default.
  - **USDT inflow via ambassador program = a money-in event.** Whether from inside or outside UAE, once the legal entity exists, those inflows must be reconciled with CDD on the payer. "Single wallet, many payers, no KYC" is the textbook AML red flag — FATF typology reports describe exactly this pattern.
  - **VASP captured by Oct 2025 amendment:** the AML framework is now explicit that VASPs are DNFBPs. If ZAAHI's crypto flow is not under a VARA licence, it is an unregistered VASP from AML perspective also — double exposure.

**(c) Sources (last verified 2026-04-16):**
- https://www.centralbank.ae/media/05mli3jt/federal-decree-law-no-20-of-2018.pdf
- https://www.uaefiu.gov.ae/media/omqb4a1z/real-estate-money-laundering-typologies-and-patterns-dec-2023.pdf
- https://www.tamimi.com/law-update-articles/circling-back-to-basics-anti-money-laundering-regulations-for-designated-non-financial-businesses-and-professions-in-the-uae/
- https://bsalaw.com/insight/overview-of-the-dnfbp-aml-requirements-in-the-uae-with-a-specific-focus-on-real-estate-brokers/
- https://elevateauditing.com/goaml-registration-uae/
- https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures
- https://www.clydeco.com/en/insights/2025/07/navigating-the-uae-s-aml-framework

### 6A.6 Crypto — VARA + CBUAE + tax

**(a) The rule.** Two primary onshore Dubai regulators, plus a federal layer:
  - **VARA (Virtual Assets Regulatory Authority)** — established 2022; regulates VASPs operating in or from Dubai (excluding DIFC, which is DFSA territory). Rulebook v2.0 effective 19 June 2025 after a 30-day transition from May 2025 ([Solidus Labs on v2.0](https://www.soliduslabs.com/post/vara-2025-rulebook-update-vasp-compliance)). Seven licensed activity categories: VA Issuance, Advisory, Broker-Dealer, Custody, Exchange, Lending & Borrowing, Management & Investment. Application fees: AED 100,000 first activity + AED 50,000 each additional. Annual supervision fees range from AED 100,000 (Advisory) to AED 300,000 (Exchange) ([VARA Schedule 2](https://rulebooks.vara.ae/rulebook/schedule-2-supervision-and-authorisation-fees), [10Leaves VARA guide 2026](https://10leaves.ae/publications/blockchain-crypto/guide-to-vara-licenses)). Minimum capital: Advisory AED 100,000; Broker-Dealer AED 400,000–600,000 (depending on custody arrangement); Custody min of AED 800,000 or 15% of fixed annual overheads; Exchange up to AED 1.5m. All VASPs must maintain liquid capital ≥ 1.2× monthly operational expenses. Enforcement is active: between August 2024 and August 2025 VARA issued enforcement notices against 36 firms for unlicensed activity and unauthorised marketing; fines AED 50,000–600,000 per entity ([CryptoNews VARA 19-firm sweep](https://cryptonews.com/news/dubai-regulator-vara-sanctions-19-crypto-firms-operating-without-licenses-fines-up-to-163k-each/)). Anonymity-enhanced cryptocurrencies (Monero, Zcash) are **strictly prohibited** — issuance, trading, and marketing.
  - **VARA Marketing Regulations 2024** (effective October 2024) capture referral links, influencer content, sponsored posts, and geo-blocked campaigns that still use Arabic / AED / Dubai visuals. Only VARA-licensed VASPs may promote regulated services. Record-keeping 8 years ([VARA Rulebook — Marketing](https://rulebooks.vara.ae/rulebook/regulations-marketing-virtual-assets-and-related-activities-2024), [Linklaters summary](https://techinsights.linklaters.com/post/102jo1d/dubais-vara-issues-new-crypto-marketing-regulations-and-guidance), [Neos Legal summary](https://neoslegal.co/crypto-marketing-regulations/)).
  - **CBUAE Payment Token Services Regulation (PTSR)** — issued 2024, effective July 2024, 12-month transition to July 2025 ([CBUAE Rulebook](https://rulebook.centralbank.ae/en/rulebook/payment-token-services-regulation), [Financier Worldwide](https://www.financierworldwide.com/assessing-the-uae-payment-token-services-regulation)). Three activity categories: issuance, conversion, custody & transfer. **Foreign-currency stablecoins (USDT, USDC) may only be used to pay for virtual assets or their derivatives — they cannot be used as merchant payment for goods or services.** AED-denominated payment tokens may be issued only by CBUAE licensees. Stablecoin distinct from Stored Value Facility regulation.
  - **Tax:** UAE has no personal income tax; crypto held by individuals for personal investment is not taxed. Corporate CIT at 9% above AED 375k applies to business crypto income. 5% VAT on most crypto-related services, with FTA May 2024 guidance offering limited exemptions for crypto-to-crypto transfers; mining is taxable business income, subject to 9% CIT but outside VAT scope (per FTA Jan 2025 clarification). DMTT 15% applies to MNE groups over EUR 750m consolidated revenue from 1 January 2025 — not relevant to ZAAHI ([Lexology — How UAE taxes crypto](https://www.lexology.com/library/detail.aspx?g=b21a1dc2-bacf-46bc-9e36-37f8d0e5eec8), [tax.gov.ae](https://tax.gov.ae/)).

**(b) What it means for ZAAHI.** The ambassador USDT flow fails three tests simultaneously:
  1. **VARA scope test** — accepting USDT as payment for an ambassador membership, running a referral/commission network, and marketing via `/join` likely brings ZAAHI into VARA-regulated activity. A defensible interpretation is "the membership is not a virtual asset" — but the act of *accepting* USDT from the public is still a VASP-adjacent activity (Transfer & Settlement / Broker-Dealer readings possible). At a minimum, the marketing (`/join` with USDT logo, wallet, QR code, referral links) falls within VARA Marketing Regulations for *anyone* who targets UAE audiences.
  2. **CBUAE PTSR test** — the ambassador tier is a service/membership, not a virtual asset. Accepting USDT as payment for a service is **restricted** under PTSR. Structuring the tier as a "virtual access token" to argue the VA exemption is creative but high-risk; counsel must opine.
  3. **AML test** — single wallet, anonymous payers, no KYC at purchase — classic AML red flag.
  
  Concretely, two routes:
  - **Route 1 (recommended, clean):** Switch `/join` payments to AED fiat via licensed processor. Preserve "pay once, lifetime access" model. Commission ledger unchanged. USDT discussion deferred to post-Series A.
  - **Route 2 (brave):** Apply for VARA Advisory Licence (cheapest at AED 100k capital + AED 100k app + AED 100k/yr supervision + ~AED 250k/yr compliance overhead, realistic minimum AED 700k/yr budget). Restructure tier purchase as a licensed virtual-asset issuance (an ARVA-style membership token). This is essentially rebuilding ZAAHI as a VASP — founder-consequential decision.
  For crypto tax: even if ZAAHI takes USDT today, CIT applies on net income from membership sales once incorporated. VAT applicability on crypto-denominated service revenue is the subject of ongoing FTA guidance — conservative posture is "5% VAT applies until FTA says otherwise".

**(c) Sources (last verified 2026-04-16):**
- https://www.vara.ae/
- https://rulebooks.vara.ae/
- https://rulebooks.vara.ae/rulebook/schedule-2-supervision-and-authorisation-fees
- https://rulebooks.vara.ae/rulebook/regulations-marketing-virtual-assets-and-related-activities-2024
- https://rulebook.centralbank.ae/en/rulebook/payment-token-services-regulation
- https://rulebook.centralbank.ae/en/rulebook/stored-value-facilities
- https://www.soliduslabs.com/post/vara-2025-rulebook-update-vasp-compliance
- https://cryptonews.com/news/dubai-regulator-vara-sanctions-19-crypto-firms-operating-without-licenses-fines-up-to-163k-each/
- https://www.financierworldwide.com/assessing-the-uae-payment-token-services-regulation
- https://www.lexology.com/library/detail.aspx?g=b21a1dc2-bacf-46bc-9e36-37f8d0e5eec8

### 6A.7 Business registration — Mainland vs Free Zone vs Offshore

**(a) The rule.** Since 2021 (Commercial Companies Law), 100% foreign ownership is permitted for most mainland activities — removing one historic advantage of free zones ([Alnaya guide](https://alnaya.ae/real-estate-license-in-uae-2025-complete-guide-for-investors-agents/)). Residual reasons to choose a specific jurisdiction:
  - **Mainland (DET, formerly DED):** required if the business directly engages with UAE retail customers outside a free zone AND for specific regulated activities including real-estate brokerage (which is only issued via DLD/RERA on the mainland). Licence costs ~AED 15,000 base + Ejari (office lease) starts ~AED 8,000/yr; realistic yr-1 all-in AED 25,000–40,000 ([DLD Real Estate Activity Licence](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/), [Alnaya](https://alnaya.ae/real-estate-license-in-uae-2025-complete-guide-for-investors-agents/)).
  - **DIFC (Dubai International Financial Centre):** special economic zone with its own common-law legal system, DFSA regulator, DIFC DPL, DIFC Courts. **DIFC Innovation Licence** at ~USD 1,500/yr subsidised (AED 5,500 equivalent) for tech firms in 14 sectors including PropTech, FinTech, RegTech ([DIFC Innovation Licence](https://www.difc.com/business/establish-a-business/innovation-licence), [Arnifi 2025](https://arnifi.com/blog/difc-innovation-license/)). 0% CIT until June 2029 for DIFC entities meeting QFZP conditions. **Dubai PropTech Hub** launched July 2025 by DIFC + DLD ([DIFC + DLD PropTech Hub announcement](https://www.mediaoffice.ae/en/news/2025/july/03-07/difc-and-dld-unveil-dubai-proptech-hub)) — 200+ PropTech startups targeted, USD 300m investment by 2030. Strong IP/fintech regime. **Innovation Testing Licence** — regulatory sandbox allowing real customers + real money for up to 2 years before full authorisation.
  - **DMCC (Dubai Multi Commodities Centre):** free zone. Historically crypto-friendlier: crypto, commodities, and tech activities all permitted; 3-6 visa allocation on flexi-desk; licence from ~AED 34,140 base, typical AED 70,000 package with flexi-desk + 2 visas ([Profound UAE 2025](https://profounduae.com/dubai-free-zones-dmcc-jafza-difc-2025/), [TaxAdepts DMCC](https://taxadepts.com/dmcc-vs-other-free-zones-uae)). Note: crypto operational activities in DMCC still require VARA licence if onshore Dubai.
  - **IFZA (International Free Zone Authority):** inexpensive generalist zone; licence AED 10,000–30,000; visas AED 3,800–4,800 each; 100% ownership; no paid-up capital; remote setup possible ([Radiantbiz IFZA 2026](https://www.radiantbiz.com/blog/ifza-free-zone-in-uae)). Suitable for lightweight SaaS — but lacks the specialist ecosystem of DIFC or DMCC.
  - **DWTC (Dubai World Trade Centre Free Zone):** central-business-district zone, 2000+ companies, IPS 2026 PropTech Zone ([DWTC](https://www.dwtc.com/en/), [AGBI on DWTC 2025](https://www.agbi.com/finance/2025/11/dwtc-free-zone-share-class-offer-sets-new-industry-standard/)). Middle-of-the-road for proptech.
  - **ADGM (Abu Dhabi Global Market):** common-law financial free zone in Abu Dhabi, FSRA regulator. If ZAAHI's centre of gravity shifts to Abu Dhabi (per `ABU_DHABI_MIGRATION.md` roadmap work), ADGM becomes a live option; otherwise DIFC is closer to the Dubai product.
  - **Offshore (RAK ICC, JAFZA Offshore):** pure holding vehicles, no operational staff, no Emirates-ID visas, not for a customer-facing proptech platform.

**(b) What it means for ZAAHI.** The founders' likely best structure is a two-entity split:
  - **ZAAHI Tech FZ-LLC (DIFC Innovation Licence)** — holds the tech stack, SaaS, software IP, ambassador program contract stack, analytics, 3D engine. 0% CIT within QFZP conditions. Benefits from DIFC DPL compliance + DIFC PropTech Hub ecosystem.
  - **ZAAHI Realty LLC (DET mainland with RERA activity licence)** — the regulated broker entity. Owns the deal engine, takes the 2% service fee, holds escrow arrangements, files goAML as DNFBP. 9% CIT above AED 375k (likely minimal in year 1).
  - **Intercompany agreement** between the two governs fee split + data flows — standard structure. Subject to UAE transfer-pricing rules (arm's-length principle; documentation required once group revenues cross thresholds).
  Visa strategy: Dymo is Dubai-based since 2018 and a natural candidate for the residency anchor. Zhan (Kazakhstan origin, CEO/CTO) likely onboards via the free-zone investor visa route; golden-visa eligibility triggers on share value / salary thresholds — `⚠ VERIFY` with immigration counsel.

**(c) Sources (last verified 2026-04-16):**
- https://www.difc.com/business/establish-a-business/innovation-licence
- https://www.mediaoffice.ae/en/news/2025/july/03-07/difc-and-dld-unveil-dubai-proptech-hub
- https://profounduae.com/dubai-free-zones-dmcc-jafza-difc-2025/
- https://taxadepts.com/dmcc-vs-other-free-zones-uae
- https://www.radiantbiz.com/blog/ifza-free-zone-in-uae
- https://alnaya.ae/real-estate-license-in-uae-2025-complete-guide-for-investors-agents/
- https://arnifi.com/blog/difc-innovation-license/

### 6A.8 Taxation — CIT, VAT, Free Zone, DMTT

**(a) The rule.**
  - **Corporate Income Tax (CIT):** federal, 9% on taxable income above AED 375,000, effective for financial years starting 1 June 2023 or later ([PwC UAE CIT](https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income), [Farahat & Co 2025 guide](https://auditfirmsdubai.ae/en/corporate-tax-uae), [tax.gov.ae](https://tax.gov.ae/)). Free-zone entities can be **Qualifying Free Zone Persons (QFZPs)** and earn 0% CIT on *qualifying income* — conditions include (i) adequate substance in the UAE, (ii) qualifying activity, (iii) not electing to be subject to the 9% rate, (iv) compliant transfer-pricing + audited financials. Non-qualifying income is taxed at 9% ([Alpha Partners QFZP](https://www.alphapartners.co/blog/qualifying-free-zone-person-rules-in-the-uae-corporate-tax-system)). September 2025: MoF decisions broadened qualifying-commodity definitions (industrial chemicals, carbon credits, metals, energy, agricultural goods). From 2025, all QFZPs must file **audited accounts** with CIT return.
  - **VAT:** federal, 5% standard rate ([FTA](https://tax.gov.ae/)). Registration mandatory above AED 375k taxable supplies; voluntary above AED 187.5k. Most services, including SaaS and real-estate brokerage, are standard-rated; residential leasing + first residential sale are zero/exempt; commercial real estate is standard-rated.
  - **Withholding tax:** 0% domestic; partner-country treaties govern inbound payments.
  - **Domestic Minimum Top-Up Tax (DMTT):** 15% floor for Multinational Enterprise groups with consolidated revenue ≥ EUR 750m, effective 1 January 2025, under Cabinet Decision 142/2024 ([PwC UAE CIT](https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income)). Not applicable to ZAAHI.
  - **Transfer pricing:** OECD-aligned; arm's-length principle; documentation (Master File + Local File) required for groups above CbCR thresholds.
  - **Tax residency certificates:** available from FTA for treaty access.

**(b) What it means for ZAAHI.**
  - **CIT year-1 likely minimal:** if the entity is loss-making or below AED 375,000 taxable income, CIT = 0. Still must register + file annually.
  - **QFZP status is worth targeting:** for the DIFC Tech entity, QFZP would keep CIT at 0% on qualifying income (software licensing, intellectual-property royalties, services to overseas group affiliates). Brokerage revenue from UAE counterparties is NOT qualifying income — it would be taxed at 9% if invoiced by the DIFC entity. This is another argument for the two-entity split.
  - **VAT registration:** inevitable once revenues cross AED 375k. Voluntary registration earlier lets ZAAHI recover input VAT on setup costs (legal fees, licences, software, AWS/Vercel). For ambassador tier payments, VAT treatment depends on counterparty location + nature of service — need FTA-opinion call before first AED of revenue.
  - **Place-of-supply for global ambassadors:** if ambassadors sit outside UAE, place-of-supply rules may mean 0% VAT (export of services) — conservative position until confirmed: treat as standard-rated.
  - **Crypto revenue:** 5% VAT applies absent an FTA exemption; 9% CIT on net income. USDT inflows must be converted to AED at receipt-date spot rate for bookkeeping (FTA expects AED-denominated books).
  - **DMTT:** not applicable. Mentioned for roadmap completeness if ZAAHI ever hits an MNE-group scale.

**(c) Sources (last verified 2026-04-16):**
- https://tax.gov.ae/
- https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income
- https://auditfirmsdubai.ae/en/corporate-tax-uae
- https://www.alphapartners.co/blog/qualifying-free-zone-person-rules-in-the-uae-corporate-tax-system
- https://www.china-briefing.com/china-outbound-news/understanding-uaes-new-free-zone-tax-regulations

### 6A.9 Foreign investment + inbound payments

**(a) The rule.** The UAE has no foreign-exchange controls; AED is freely convertible. Inbound payments are regulated for AML purposes (Decree-Law 20/2018) and, from 2024-2025, payment-token specific rules under CBUAE PTSR. Standard bank on-boarding requires corporate licence + UBO + director ID + business plan + AML policy. Banks apply their own risk appetite: crypto-linked revenue streams trigger enhanced diligence, often refusal. Account opening for free-zone entities typically takes 4-12 weeks. Remittances: no cap on outbound AED conversion; crypto outbound must comply with VARA + PTSR.

**(b) What it means for ZAAHI.** The ambassador program accepts funds globally via one USDT wallet. That wallet is currently *not* a bank account; there is no KYC on payer; no source-of-funds; no sanctions screening. Once ZAAHI is incorporated, all those inflows become corporate income that must be:
  - Reconciled to the payer (who paid? where from? what level? is this a PEP? is this a sanctioned country?).
  - Converted to AED for accounting (spot rate at receipt).
  - Reported as revenue for CIT + VAT.
  - Any withholding counterparty-country impact — generally no UAE-side impact, but ambassadors in some jurisdictions (US, EU) may have local tax obligations when "earning" commissions; ZAAHI's T&Cs should disclaim local tax responsibility on ambassadors.
  
  Repatriation: if a USDT-paying ambassador later requests a refund, the refund path is USDT-back. If the entity has since converted to AED, exchange risk is on ZAAHI — refund policy must address this.

**(c) Sources (last verified 2026-04-16):**
- https://www.centralbank.ae/
- https://rulebook.centralbank.ae/en/rulebook/payment-token-services-regulation

### 6A.10 IP — Trademark + scraping + copyright on government data

**(a) The rule.**
  - **Trademark Law:** Federal Decree-Law 36/2021, administered by MOET. Single-class application: AED 6,500 government fee (AED 750 app + AED 750 publication + AED 5,000 registration). Multi-class applications incur the full fee per class. Cabinet Resolution 102/2025 (effective 14 Nov 2025) introduced expedited-examination fees + a 50% fee reduction for SMEs on the National SME Programme. Timeline 4-6 months including a 30-day public opposition window. As of 27 Jan 2026 all new filings must use **13th Edition Nice Classification** ([ICLG UAE 2025-2026](https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae), [EGSH Trademark 2026](https://egsh.ae/insights/trademark-registration-uae)). Relevant classes for ZAAHI: **Class 9** (downloadable software, mobile apps), **Class 36** (real-estate services, financial services), **Class 42** (SaaS, software-as-a-service, software design and development).
  - **Copyright:** Federal Decree-Law 38/2021 (copyright law) — covers original works of authorship; government works are generally exempt from copyright but may be subject to terms-of-use restrictions on the portal that delivers them.
  - **Data scraping:** no standalone UAE "anti-scraping" statute; scraping legality turns on (i) portal terms of use, (ii) database right claims, (iii) Computer Misuse / Cybercrime Law 34/2021 if scraping involves circumventing authentication, (iv) competition law for parasitic copying. DDA portal and Dubai Pulse have terms of use restricting commercial redistribution of downloaded datasets — need per-portal review ([DDA codes & guidelines](https://dda.gov.ae/en/planning-development/codes-and-guidelines), [dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/)).
  - **KML / GeoJSON of Dubai districts:** most DDA master-plan geometries are derivative of publicly-viewable plans; pure geographic coordinates are not copyrightable in most common-law readings but a *compilation* (a curated GeoJSON file with metadata) may be protected.
  - **Affection plans + master-plan PDFs:** these are produced by Dubai Municipality / DDA and made available to the registered owner or authorised party for a per-request fee (typically AED 500-1,000). Redistributing them at scale to unauthorised third-parties — particularly behind a paywall — is the classic unauthorised-republication risk.

**(b) What it means for ZAAHI.**
  - **Trademark (P1):** file ZAAHI™ in classes 9, 36, 42 — ~AED 19,500 for three classes (50% SME discount possible under Cabinet Res 102/2025 if ZAAHI qualifies under MoE's SME programme — `⚠ VERIFY` qualification). Without a registered trademark, ZAAHI has no exclusive right in the UAE and cannot enforce against squatters. The scope should cover the word mark "ZAAHI" and the logomark (separate application, separate fee, same classes).
  - **Scraping / redistribution (R7):** the `/api/parcels/[id]/plot-guidelines` proxy re-serves DDA master-plan / affection-plan PDFs. Depending on the source portal's terms:
    - If fetched under a public-data scheme with open-license terms → attribution required, redistribution generally allowed.
    - If fetched under an authenticated owner/registered-party scheme → redistribution to third parties (especially paid Gold/Platinum tiers) may breach the portal terms and create both a contract claim and a copyright claim.
    - Legal opinion needed; in the interim (a) always display "Source: Dubai Development Authority" attribution, (b) restrict access to tiers where ZAAHI has the plot owner's written authority, (c) add the plot's DDA-issued reference number to every served PDF.
  - **PMTiles layer data:** community boundaries, DDA districts, road network, master plans. Most of this is public-domain geographic data (see CLAUDE.md §SECURITY RULES — `/api/layers/*` is explicitly kept public because of this analysis). The PMTiles blobs themselves are ZAAHI-generated tilesets from source data — the tileset as a compilation is ZAAHI's work product; the underlying coordinates remain public.
  - **Open source compliance:** MapLibre GL JS, Three.js, Next.js, React, Prisma, Supabase JS — all either MIT or Apache-2.0. Keep a NOTICE file or `/licenses` endpoint listing dependencies to stay clean.

**(c) Sources (last verified 2026-04-16):**
- https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae
- https://egsh.ae/insights/trademark-registration-uae
- https://dda.gov.ae/en/planning-development/codes-and-guidelines
- https://www.dubaipulse.gov.ae/

### 6A.11 Specific risks — penalties cheat-sheet

A one-page cheat-sheet of the specific AED exposures the founders should memorise:

| Risk | Enforcing authority | Stated penalty | Primary source |
|---|---|---|---|
| Brokerage without RERA licence | RERA / DLD | Individual fines up to AED 1,000,000 under Exec Council Res 25/2009 (doubled on repeat within 12 months); suspension, blacklist, licence cancellation under Bylaw 85/2006 | [DLP Dubai — Res 25/2009](https://dlp.dubai.gov.ae/Legislation%20Reference/2010/Executive%20Council%20Resolution%20No.%20(25)%20of%202009.html) |
| Advertising without Trakheesi permit | DLD | AED 50,000 per violation minimum; escalating to licence cancellation | [EGSH Trakheesi](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance) |
| Fake / misleading real-estate ad | DLD | Listing removed + up to AED 50,000 + brokerage repercussions | [EGSH Trakheesi](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance) |
| PDPL violation | UAE Data Office | Up to AED 5,000,000 (specific tiering in pending Executive Regulations) | [uaepdpl.com](https://uaepdpl.com/) — `⚠ VERIFY` exact amounts once Executive Regulations published |
| UBO non-disclosure | Licensing authority | Up to AED 100,000 + licence suspension | [CBUAE Cabinet Decision 58/2020](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures) |
| AML violation (Decree-Law 20/2018) | MoE / UAEFIU | AED 50,000 to AED 5,000,000 depending on violation + licence suspension; MoE H1 2025 fines exceeded AED 42m sector-wide | [Clyde & Co AML](https://www.clydeco.com/en/insights/2025/07/navigating-the-uae-s-aml-framework) |
| Unlicensed VASP (VARA) | VARA | AED 50,000 to AED 600,000 per entity (2024-2025 sweep) | [CryptoNews 19-firm sweep](https://cryptonews.com/news/dubai-regulator-vara-sanctions-19-crypto-firms-operating-without-licenses-fines-up-to-163k-each/) |
| Unauthorised crypto marketing | VARA | Per Marketing Regulations 2024 — multi-million-dirham fines already levied | [VARA Marketing Rulebook 2024](https://rulebooks.vara.ae/rulebook/regulations-marketing-virtual-assets-and-related-activities-2024) |
| Acceptance of foreign stablecoin for goods/services | CBUAE | Enforcement action under PTSR — penalties in CBUAE regulation | [CBUAE PTSR](https://rulebook.centralbank.ae/en/rulebook/payment-token-services-regulation) |
| Cybercrime Law 34/2021 violations | Public Prosecution | Criminal + corporate liability; fines dependent on offence type | [uaelegislation.gov.ae](https://uaelegislation.gov.ae/en/legislations/1526) |
| Trademark infringement (no cover) | Civil courts | Damages; interim injunctions possible | [ICLG UAE 2025-2026](https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae) |

---

## 7. Quick Wins — Ship This Week

Everything here is code or copy. All can land before 2026-04-23 without external parties:

1. **Add Privacy Policy + Cookies page** at `/privacy` referencing Federal Decree-Law 45/2021 (UAE PDPL), naming Supabase (Frankfurt, `eu-central-1`) as sub-processor, documenting cross-border transfer basis. Link from footer globally. Draft template available from UAE-gov-aligned sources; get counsel to redline before final.
2. **Add "Not Regulated Financial Advice" + "ZAAHI is not currently a licensed real-estate broker — listings are informational" disclosure** in a persistent footer on every parcel page and on `/join`. Explicit disclaimer reduces regulatory posture.
3. **Add UBO disclosure / sanctions-screening step** into the admin approval flow for new users. Store the admin action + timestamp in `user_metadata`. Even a minimal "admin verified identity via Emirates ID on DATE" stamp meaningfully hardens posture.
4. **Display AED amounts as primary on ambassador tiers** — current `/join` per CLAUDE.md lists AED + approx USDT. Ensure AED is large, bold, primary typographic anchor; USDT is smaller/secondary — this matches UAE consumer-protection guidance.
5. **Publish `legal@zaahi.io`** mailbox and add to footer + Privacy Policy. This is the address regulators and data-subjects write to; without it you are invisible to lawful process.
6. **Add `/terms` Terms of Service** with: jurisdiction (Dubai courts or DIFC courts depending on entity), disputes clause, prohibition on self-referral (already in code), prohibition on misleading listings, takedown / notice process for third-party content.
7. **Rate-limit `/join` registrations from UAE IPs** until counsel confirms VARA position. Lightweight geo-check in middleware. This reduces exposure without shutting down global ambassador acquisition.
8. **Add a machine-readable `robots.txt` + `security.txt`** (`/.well-known/security.txt`) with `legal@zaahi.io` — good-faith signal to researchers and regulators.
9. **Add "Dubai Land Department source attribution" on master-plan/affection-plan downloads.** Currently proxied from DDA with no attribution — attribution is the cheapest IP insurance.
10. **Wire a kill-switch env var `AMBASSADOR_USDT_PAYMENTS_ENABLED=false`** so the USDT accept flow can be turned off by config without a code deploy. Good hygiene even before any legal action.

---

## 8. Open Questions for Founder

Answer these before the counsel meeting. Each is a binary/choice question — not open-ended.

1. **Jurisdiction:** DIFC Innovation Licence + Registrar of Companies (FinTech/PropTech-friendly, data-protection law closer to GDPR, 0% CIT till Jun 2029, DLD/VARA partnership via PropTech Hub) **vs** DMCC (crypto-friendlier, cheaper base licence) **vs** DET mainland (required if ZAAHI actually brokers DLD-regulated deals and wants onshore retail)?
   - **Recommendation:** DIFC Innovation Licence for the tech entity + a separate DET mainland entity for the brokerage arm once RERA licence is on the table. This is the standard "holding + operator" split for Dubai proptech. Counsel to confirm.

2. **Crypto strategy:** (A) Drop USDT. Switch to AED fiat ambassador payments via licensed processor (Telr / PayTabs / Checkout.com). Kills VARA exposure in one move. (B) Keep USDT. Apply for VARA Advisory (min ~100k AED capital + 100k AED app fee + 100k AED annual) and restructure tier purchase as a sale of a virtual-asset "access NFT". (C) Geo-block UAE audience from `/join` and only take USDT from outside UAE — still VARA-exposed if marketing includes Arabic/AED/Dubai visuals, per VARA marketing rulebook.
   - **Recommendation:** (A) for yr 1. Revisit (B) when MRR justifies the ~1m AED/yr VARA budget.

3. **Founder cap table + control:** Zhan + Dymo as 50/50 shareholders **vs** founder-majority (Zhan majority, Dymo minority with veto per CLAUDE.md) **vs** dual-class (founder voting shares + non-voting to eventual employees). Decision affects UBO filing (both are UBOs at 25%+), and visa strategy (golden visa requires shareholder proof).

4. **ZAAHI legal identity:** Is ZAAHI a (a) regulated real-estate broker, (b) a SaaS + listings portal (marketplace, not broker), or (c) both via two separate entities? This single question decides whether RERA licensing is a P0 or a P3.

5. **Geography of service:** Is the product today Dubai-only, UAE-only, or global-to-Dubai? If it accepts ambassadors from outside UAE, the commission flow, tax treatment, and VARA marketing rules all change.

6. **Fractional ownership + ZAH token + DAO:** Ship only through DLD REES sandbox (Prypco Mint / Ctrl Alt competitor path)? Or drop from public roadmap until VARA-licensed?
   - **Recommendation:** Drop from public roadmap until at least Series A or licensed sandbox access. Keep internally on BACKLOG.md only.

7. **DPO model:** In-house DPO hire (~300k AED/yr senior) vs external DPO-as-a-service (~24-60k AED/yr) vs "accountability" stance (no formal DPO, director-level accountability, justified by scale). PDPL thresholds for mandatory DPO still ambiguous pending Executive Regulations.

8. **Data residency:** Stay on Supabase Frankfurt (current) vs migrate to AWS Middle East (Bahrain / UAE region) to simplify cross-border transfer analysis? Vercel KV/Postgres ruled out by Sovereignty Readiness Rules in CLAUDE.md — AWS Bahrain self-hosted Postgres is the clean answer if data residency becomes a blocker.

9. **Ambassador tier tax treatment:** Tier purchase (1k/5k/15k AED) → is it (a) revenue (subject to 5% VAT + 9% CIT above 375k) or (b) refundable capital contribution (no VAT) or (c) "digital services" subject to different VAT place-of-supply rules? This must be in the ledger correctly from first payment — FTA audits go back 5 years.

10. **Insurance cover level:** Lean cover (PI AED 1m limit + Cyber AED 1m) or regulated-firm cover (PI AED 5m + Cyber AED 5m + D&O AED 2m)? DLD/RERA insurance minimums are ⚠ VERIFY — but counsel will insist on at least AED 2m PI for brokerage licensing.

---

## Appendix A — Key Legal Instruments Cited

| Instrument | Title | Year | Primary URL |
|---|---|---|---|
| Federal Decree-Law 45/2021 | Personal Data Protection (PDPL) | 2021 (effective Jan 2022; Exec Regs pending as of 2025) | [u.ae data-protection-laws](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws) |
| Federal Decree-Law 20/2018 (amended 2023) | Anti-Money Laundering & CFT | 2018 | [centralbank.ae PDF](https://www.centralbank.ae/media/05mli3jt/federal-decree-law-no-20-of-2018.pdf) |
| Federal Decree-Law 34/2021 | Countering Rumours & Cybercrimes | 2021 (effective Jan 2022) | [uaelegislation.gov.ae](https://uaelegislation.gov.ae/en/legislations/1526) |
| Federal Decree-Law 36/2021 | Trademarks | 2021 | [ICLG summary](https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae) |
| Cabinet Decision 58/2020 (amended by Res 109/2023) | Beneficial Owner Procedures | 2020/2023 | [CBUAE Rulebook](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures) |
| Cabinet Decision 10/2019 | DNFBP AML obligations | 2019 | [Tamimi analysis](https://www.tamimi.com/law-update-articles/circling-back-to-basics-anti-money-laundering-regulations-for-designated-non-financial-businesses-and-professions-in-the-uae/) |
| Cabinet Decision 142/2024 | Domestic Minimum Top-Up Tax (DMTT) — 15% for MNEs | 2024 (effective 1 Jan 2025) | [PwC summary](https://taxsummaries.pwc.com/united-arab-emirates/corporate/taxes-on-corporate-income) |
| Cabinet Resolution 102/2025 | MOET trademark fee amendments + SME 50% discount | 2025 (effective 14 Nov 2025) | [ICLG UAE 2025-2026](https://iclg.com/practice-areas/trade-marks-laws-and-regulations/uae) |
| Dubai Law 85/2006 | Bylaw regulating Real Estate Brokers Register | 2006 | [legaladviceme](https://legaladviceme.com/legislation/115/bylaw-85-of-2006-regulating-real-estate-brokers-register-in-dubai) |
| Executive Council Resolution 25/2009 | RERA fees & fines schedule | 2009 | [Dubai DLP](https://dlp.dubai.gov.ae/Legislation%20Reference/2010/Executive%20Council%20Resolution%20No.%20(25)%20of%202009.html) |
| CBUAE Payment Token Services Regulation | PTSR — stablecoins, payment tokens | 2024 (effective Jul 2024, transition to Jul 2025) | [CBUAE Rulebook](https://rulebook.centralbank.ae/en/rulebook/payment-token-services-regulation) |
| CBUAE Stored Value Facilities Regulation | SVF | in force | [CBUAE Rulebook](https://rulebook.centralbank.ae/en/rulebook/stored-value-facilities) |
| VARA Rulebook v2.0 | Virtual Asset Service Providers framework | v2.0 effective 19 Jun 2025 | [Solidus Labs summary](https://www.soliduslabs.com/post/vara-2025-rulebook-update-vasp-compliance), [VARA Rulebooks](https://rulebooks.vara.ae/) |
| VARA Marketing Regulations 2024 | Advertising & influencer rules for VA | Oct 2024 | [VARA Rulebook — Marketing](https://rulebooks.vara.ae/rulebook/regulations-marketing-virtual-assets-and-related-activities-2024) |
| DIFC Data Protection Law + Amendment Law 1/2025 | DIFC DPL — amendments effective 15 Jul 2025 | 2025 | [Bird & Bird analysis](https://www.twobirds.com/en/insights/2025/united-arab-emirates/difc-enacts-amendments-to-data-protection-law) |
| ADGM Data Protection Regulations 2021 | ADGM DPR — SCCs + adequacy list | 2021 | [ADGM Data Transfers May 2025 brochure (PDF)](https://assets.adgm.com/download/assets/ADGM+Data+Transfers+Brochure.pdf/d0458c2c58a611efa409e27828504259) |
| DLD Real Estate Innovation Initiative (REES) | Tokenization sandbox — Prypco Mint pilot launched Mar 2025 | 2025 | [DLD press release](https://dubailand.gov.ae/en/news-media/dubai-land-department-launches-pilot-phase-of-the-real-estate-tokenisation-project) |

---

## Appendix B — Cross-References to ZAAHI Code & Data

For every finding in the risk matrix, the specific file / state in the ZAAHI codebase that is affected:

- **Ambassador USDT flow (R1, R9, R10, R11):** `src/lib/ambassador.ts` — `PLAN_COMMISSION_RATES`, `ZAAHI_SERVICE_FEE_RATE = 0.02`, `MAX_LEVEL = 3`. USDT wallet in CLAUDE.md §AMBASSADOR PROGRAM RULES: `TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7`. Routes: `/join` (public), `/api/ambassador/register`, `/ambassador` (auth-gated).
- **Broker posture (R2, R4):** `src/app/parcels/map/page.tsx` (`loadZaahiPlots`, 114 listings rendered with prices); `/api/parcels/*`; `Parcel.currentValuation` (BigInt, fils). Currently shows prices without Trakheesi permits.
- **Cross-border PII (R3):** Supabase region per CLAUDE.md §DEPLOYMENT: "Database: Supabase PostgreSQL (region `eu-central-1`, Frankfurt)". Identity layer: Supabase Auth, isolated in `src/lib/supabase-browser.ts` and `src/lib/supabase.ts`.
- **PII scope (R3, R6):** `User` model in `prisma/schema.prisma` — email, phone, name, `user_metadata.approved`, `referralCode`, `referredById`. Commission history, deal participation, plot ownership.
- **No DPO (R6):** no DPO field in schema, no `legal@zaahi.io` in CLAUDE.md §FOUNDER CONTACTS.
- **UBO filing (R5, Q3):** no ownership structure documented in repo — pure code repo.
- **AML / KYC (R8):** `user_metadata.approved` is a manual admin boolean in Supabase. No KYC document storage, no sanctions screening, no goAML. See CLAUDE.md §SECURITY RULES.
- **Scraping / IP (R7):** `/api/parcels/[id]/plot-guidelines` proxies DDA "Plot Details PDF" per CLAUDE.md §SESSION STATUS item 9. `data/` directory stores DDA GeoJSON + KML + PDF assets.
- **Marketing / content moderation (R12):** `/join` public per CLAUDE.md §AMBASSADOR PROGRAM RULES. No moderation workflow documented.
- **Tax (R13, Q9):** `Commission` rows + `Deal.platformFeeFils` frozen at `DEAL_COMPLETED` — good for revenue recognition but no VAT invoice flow documented.
- **Sovereignty (Q8):** CLAUDE.md §Sovereignty Readiness Rules requires portability → Frankfurt Supabase can be replaced with Docker-Compose Postgres if residency becomes a P0.

---

## Appendix C — Items flagged `⚠ VERIFY`

These findings could not be confirmed against primary 2025-2026 sources in the research window. Treat as open questions for counsel:

1. **⚠ VERIFY** DLD API Gateway commercial fee schedule — no public price list found; MoU terms negotiated individually.
2. **⚠ VERIFY** Trakheesi permit model for a 114-listing platform (per-listing vs per-campaign) — source guidance is ambiguous; permits may be per-advertisement, making the "~116k AED/yr" figure in Section 4 a worst case.
3. **⚠ VERIFY** CBUAE PTSR application fee schedule — not published.
4. **⚠ VERIFY** DLD REES tokenization sandbox application process — sandbox appears to accept only VARA-licensed entities (Prypco + Ctrl Alt so far).
5. **⚠ VERIFY** Zhan's UAE residency status and path (Kazakhstan origin) for shareholder eligibility + golden-visa track.
6. **⚠ VERIFY** PDPL Executive Regulations — as of 6 Jan 2025 not published; monitor Data Office issuances for DPO thresholds, breach-notification timelines (72-hour rule referenced in PDPL Art. 9 but unexercised).
7. **⚠ VERIFY** DLD/RERA minimum PI insurance requirement — typical market view is AED 2m+ but confirm current DLD bylaw.
8. **⚠ VERIFY** ZAAHI ambassador program classification under UAE Direct Selling Association rules (MLM product-focus test).

---

## Appendix D — Primary Government Sources (bookmark these)

| Regulator / Portal | URL |
|---|---|
| UAE Government Portal | https://u.ae |
| Ministry of Economy & Tourism (MOET) | https://www.moec.gov.ae / https://www.economy.gov.ae |
| Federal Tax Authority (FTA) | https://tax.gov.ae |
| Ministry of Finance | https://mof.gov.ae |
| Central Bank of the UAE | https://www.centralbank.ae + rulebook at https://rulebook.centralbank.ae |
| Dubai Land Department | https://dubailand.gov.ae |
| Dubai Pulse Open Data | https://www.dubaipulse.gov.ae |
| Dubai Development Authority | https://dda.gov.ae |
| Virtual Assets Regulatory Authority (VARA) | https://www.vara.ae + rulebooks at https://rulebooks.vara.ae |
| Department of Economy & Tourism (DET) | https://det.gov.ae |
| DIFC — Innovation Licence | https://www.difc.com/business/establish-a-business/innovation-licence |
| DIFC — Commissioner of Data Protection | https://www.difc.com/business/registrars-and-commissioners/commissioner-of-data-protection |
| ADGM | https://www.adgm.com |
| TDRA | https://tdra.gov.ae |
| UAE Financial Intelligence Unit (goAML) | https://www.uaefiu.gov.ae |
| UAE Legislation Portal | https://uaelegislation.gov.ae |

---

**End of research document.**
*Validate with licensed Dubai counsel before any operational action. Re-verify all figures, fines, and licence costs on the day of action — UAE regulation moves monthly, not yearly.*
