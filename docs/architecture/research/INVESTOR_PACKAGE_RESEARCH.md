# Investor Package Research — Unicorn-Tier Documentation for ZAAHI

**Target:** Rudolf (silent investor, 10%)
**Founders:** Dmytro (Dymo) Tsvyk — Co-founder, Ambassador, Guardian Partner (10%); Zharkyn (Zhan) Ryspayev — Founder & CEO/CTO (10%)
**Operating / Development pool:** 70%
**Analyst:** Claude Code
**Date:** 2026-04-18
**Branch:** `research/investor-package`
**Status:** Research document — NOT legal advice. Final documents must be reviewed by UAE-qualified counsel before signing.

---

## Executive Summary (TL;DR)

1. **Recommended entity: ADGM Tech Startup Licence + UAE Mainland operating company.** A two-entity structure where the IP-holding platform company is an ADGM SPV (cheap, English common-law, investor-friendly) and the brokerage/operating company is a Dubai Mainland LLC under DED (100% foreign ownership legal since 2021) with RERA broker licence. Cost: ~USD 1,500–4,000/year for ADGM tech licence; ~AED 21,000–30,000 one-off for Mainland RE company + licences. This is the pattern used by Huspy ($101M raised), Property Finder ($170M), and most regional proptech winners.

2. **Silent investor vehicle: Post-money SAFE (~AED 20–40k legal) for Monday close, followed by a formal priced equity round converting to preferred shares within 90 days.** Not a convertible note — a post-money SAFE (Y Combinator standard, 85% market adoption) is simpler, cheaper, faster to close, and preserves Rudolf's 10% stake cleanly at a fixed post-money cap. A full shareholders agreement in a freshly-formed ADGM entity takes 3–6 weeks minimum.

3. **Realistic Monday (2026-04-21) deliverable = MOU + SAFE + Term Sheet + Pitch Deck + Executive Summary.** Everything else (Articles of Association, Shareholders Agreement, Operating Agreement, Capital Table, Financial Model, Board Resolutions) is unrealistic to draft in 2 business days at unicorn quality without a law firm engaged in advance. Honest framing with Rudolf now ("here is the signed commitment, fully-papered entity close in 6–8 weeks") is better than rushed documents he or his counsel will later question.

4. **Total estimated cost for full close: AED 150,000–250,000** (entity setup AED 30k, legal fees AED 60–150k depending on firm tier, registrations AED 15k, translations AED 5k, contingency). More if DIFC rather than ADGM. Less if founder accepts mid-tier firm or template-based documents with spot legal review.

5. **Critical risk of rushing:** signing documents that Rudolf's lawyers later request to re-paper, leading to loss of trust; or signing binding terms that constrain future fundraising (e.g., heavy liquidation preference on a silent investor). **The correct pacing: SAFE + Term Sheet Monday, formal close in 6–8 weeks.** Most UAE tech unicorns did exactly this.

---

## Founder context (from CLAUDE.md and repo audit)

Verified against repo HEAD on `main` branch at 2026-04-18:

- **Founders:** Zhan (CEO/CTO, full-stack engineer, 17 yrs real estate, wrote the platform) and Dymo (Co-founder, Ambassador, Guardian Partner, 18+ yrs operations, RE Dubai since 2018).
- **Operational asset:** zaahi.io demo version live; 114 parcels in DB (note: prompt said 101 — code says 114 in CLAUDE.md SESSION STATUS); 266 API routes; Phase 1 user dashboards live; 9 land-use legend; ZAAHI Signature 3D buildings; Archibald / Cat AI; ambassador program tiered SILVER/GOLD/PLATINUM with commissions at 2% ZAAHI service fee base (not single-tier as prompt stated; `src/lib/ambassador.ts` `PLAN_COMMISSION_RATES`).
- **Master tree:** 85 sections / 12 blocks (A–L). Current coverage ~6–8% (per `docs/architecture/research/ZAAHI_CURRENT_STATE_VS_MASTER_TREE.md` on `docs/master-tree-v3` branch).
- **Blockchain:** recommended path per `docs/architecture/research/BLOCKCHAIN_DEEP_DIVE.md` is Option A "audit-trail only", not tokenization — materially simplifies investor narrative (no VARA regulator in path).
- **Planned cap table:** 10% Rudolf (silent) / 10% Dymo / 10% Zhan / 70% Operating & Platform pool.
- **Business lines:** (1) platform development per Master Tree (long-horizon tech), (2) parallel agency — plots + off-plan in Al Jurf (Abu Dhabi), where Dymo and Zhan hold personal RERA licences.

This context informs every recommendation below. Where the original prompt differed from repo reality, **I use repo reality and flag the divergence**.

---

## Part 1 — Benchmark Analysis

### 1.1 UAE Tech Unicorns: Case Studies

**Careem** (first Middle East unicorn outside Israel, acquired for $3.1B by Uber in Jan 2020, with $1.7B in convertible notes and $1.4B cash). Careem's structure included co-founder retention (Mudassir Sheikha stayed as CEO post-acquisition), board representation (3 Uber + 2 Careem), and a 2023 spinout to e& worth $400M where 50.03% was acquired. **Lesson for ZAAHI:** co-founder operational control can survive through multiple funding rounds and acquisitions if the shareholders agreement is well-drafted from the start. Sources indicate founders explicitly preserved CEO seat and board minority via SHA clauses.

**Huspy** (proptech, mortgage + brokerage, Dubai). Raised $37M Series A led by Sequoia Capital + Founders Fund + Fifth Wall. Series B $59M led by Balderton Capital, valued $236–354M. Total raised $101M+. **Lessons:**
- Huspy picked a **vertically integrated model** (brokerage + mortgage + tech) — similar to ZAAHI's platform+agency split.
- Tier-1 VC validation (Sequoia, Founders Fund) required English-common-law entity structure. Huspy is an ADGM-registered group.
- Recognised by industry (Bayut Fastest Growing Agency 2024) — operational metrics matter as much as tech narrative.

**Property Finder** (RE listings platform, Dubai). Secured $170M from UAE sovereign funds (Mubadala, ADIA-affiliated). Valuation ~$500M. **Lessons:**
- Category leader economics: Property Finder dominated listings in MENA before raising at scale.
- Sovereign investors require best-in-class corporate governance, ESG reporting, quarterly financials.

**Bayut / dubizzle** (RE listings, Dubai). Part of EMPG (Emerging Markets Property Group); merged with OLX MENA in 2020 at $1B+ combined valuation. **Lessons:**
- Consolidation is endgame in proptech; strong M&A exit path.

**Kitopi** ($1B+, cloud kitchens) and **Swvl** ($1.5B IPO via SPAC, transport). **Lessons:** rapid scaling + regional expansion + clear unit economics drive valuations. Swvl's post-SPAC performance (cash-burn, down-round) is the cautionary tale: project optimistic revenue, underdeliver, lose investor trust. Forecasts for ZAAHI should be conservative and defensible.

**Common unicorn close-stage patterns:**
1. **Parent company in a common-law free zone** (ADGM or DIFC) — required for tier-1 VC.
2. **Operational subsidiary on Mainland** with DED trade licence for local-facing business.
3. **Founder vesting over 4 years with 1-year cliff** — mandatory in investor eyes; protects all parties.
4. **Preferred equity for investors, common for founders** — even at 10% stake, Rudolf should have some preference (explained in Part 2.2 below).
5. **Board seat or observer rights** — silent 10% typically gets **observer rights only**, not a board seat.

### 1.2 Global Real Estate Tech

**Opendoor** (US, $8B SPAC valuation, iBuying model) — showed that RE tech can reach public markets but is capital-intensive. Heavy reliance on debt facilities. Founded on clear unit economics disclosures. **Lesson:** if ZAAHI later models agency-as-service (buying plots for resale), disclose unit economics transparently from day 1.

**Compass** (US, $2B public valuation) — brokerage tech. Rapid M&A of local agencies, tech layer on top. **Lesson:** parallel agency model is investor-legible if framed as "acquire local deal flow, digitize it, expand platform". Aligns with ZAAHI's Al Jurf office strategy.

**Zillow** (US, $15B at peak) — listings + data + iBuying (exited iBuying 2021). **Lesson:** multi-product expansion can destroy value if not disciplined; ZAAHI's Master Tree 85-section vision is ambitious — must show sequencing, not simultaneous attack.

**Propy** (blockchain RE, US/Ukraine) — tokenized transactions, NFT deeds in some US jurisdictions. $10M+ raised. **Lesson:** blockchain RE is plausible but niche; US adoption still early. ZAAHI's position (audit-trail only, not tokenization) is actually more defensible today than Propy's.

**PRYPCO** (Dubai, DLD-affiliated, XRP Ledger-based tokenization). $5M+ in secondary-market trades. **Lesson:** ZAAHI and PRYPCO are **complementary, not competitors** — PRYPCO tokenizes, ZAAHI builds the broader OS (listings, deals, escrow, intelligence). Frame Rudolf's conversation around this distinction: ZAAHI is the horizontal platform, PRYPCO is a vertical use case within it.

### 1.3 Infrastructure / Platform Unicorns (for pitch framing)

**Stripe** (payments infra, $70B private) — thesis: "we are the infrastructure layer every modern company will need." ZAAHI can position as "the infrastructure layer every UAE real estate participant will need."

**Databricks** ($43B, data platform) — thesis: "unified platform for data+AI." ZAAHI analog: "unified platform for real estate data + AI + transactions."

**Canva** ($40B, design platform) — thesis: "democratize professional-grade tools." ZAAHI analog: "democratize professional-grade real estate intelligence."

The common pitch arc: start in one use case (payments / design / analytics), expand horizontally. The Master Tree 85-section vision fits this arc perfectly — Block A Assets is the wedge, the other 11 blocks are the expansion.

---

## Part 2 — UAE Legal Framework Recommendations

### 2.1 Recommended Legal Entity: two-entity "HoldCo / OpCo" structure

**Parent (IP + Investment HoldCo): ADGM Tech Startup Licence.**
- **Why ADGM over DIFC:** ADGM's Tech Startup Licence is **USD 1,500/year** (DIFC Innovation is ~USD 4,500+). ADGM's English common-law framework is identical-quality for investor purposes. DIFC has slightly more-established infrastructure; ADGM has slightly more startup focus.
- **Why common-law free zone over Mainland:** tier-1 investors require English-common-law jurisdiction for SHA enforceability, share-class flexibility (founder common + investor preferred), and internationally-recognised dispute resolution. Mainland LLC SHAs are harder to enforce beyond statutory defaults.
- **What it holds:** all IP (Master Tree, codebase, brand, domain), share capital, Rudolf's investment, founder vesting shares.
- **Who files what:** ADGM Registrar for Companies + FSRA if any financial-services activity (not needed for pure tech + IP holding).
- **Audit requirement:** ADGM requires audited financials annually.

**Operating Subsidiary: Dubai Mainland LLC with DED Trade Licence + RERA Broker Licence.**
- Wholly-owned by the ADGM parent.
- **Why Mainland:** RERA broker licences are Dubai government licences; must be on Mainland LLC. Al Jurf is in Abu Dhabi so an Abu Dhabi Department of Municipal Affairs + ADREC (Abu Dhabi Real Estate Centre) licence path is also required if the office is physically there — or a Dubai Mainland LLC with a branch in Abu Dhabi.
- **100% foreign ownership:** legal for real estate brokerage since 2021 — Dymo and Zhan hold directly; no Emirati sponsor required.
- **Cost estimate:** AED 21,000–30,000 one-off for LLC + RERA + Broker Card + office lease deposit; annual renewals ~AED 12,000 for LLC + AED 5,000 for RERA.

**Why two entities?**
- Separates technology IP from regulated-activity risk. If a RERA dispute or DLD sanction ever hits OpCo, IP stays safe in ADGM.
- Clean tax treatment: ADGM as Qualifying Free Zone Person (QFZP) can earn 0% CT on qualifying IP licensing income; OpCo pays 9% UAE CT above AED 375,000 but likely qualifies for Small Business Relief (AED 3M revenue ceiling) in Year 1.
- Clean investor story: "Rudolf owns 10% of ADGM parent which holds 100% of OpCo."
- Exit optionality: easier to sell either entity independently in M&A.

**Alternative: single Mainland LLC.**
- Simpler, cheaper Year 1 (~AED 30k total vs ~AED 80k).
- Acceptable if Rudolf's investment is genuinely "silent and small" (≤10% minority with no follow-on institutional rounds planned in next 24 months).
- Trade-off: harder to add later investors; SHA less enforceable; sovereign-wealth-fund entry is difficult.
- **Verdict:** choose Mainland-only ONLY if founder explicitly commits to no VC fundraise in next 24 months.

**Jurisdictional comparison table:**

| Jurisdiction | Setup cost | Annual cost | Investor-SHA enforceability | Time to setup | Tax rate | Best for |
|---|---|---|---|---|---|---|
| ADGM Tech Startup | USD 1,500 | USD 1,500 | English common law, excellent | 4–8 weeks | QFZP 0% on qualifying income; 9% CT else | Tech / investor entity |
| DIFC Innovation | AED 16,515 (USD 4,500) | USD 1,500 (subsidised years 1–5) | English common law, excellent | 6–10 weeks | Same QFZP regime | Financial services / tech |
| IFZA | AED 12,500+ | AED 12,000+ | Limited (civil-law framework) | 2–3 weeks | 9% CT > 375k (QFZP if activities qualify) | Lean budget, not investor-optimised |
| RAKEZ | AED 6,200+ | AED 5,000+ | Limited | 1–2 weeks | 9% CT (QFZP for some activities) | Tax-efficient holding, not investor-optimised |
| Dubai Mainland LLC | AED 21,000+ | AED 12,000+ | Civil law + SHA overlay; moderate | 3 weeks | 9% CT > 375k; SBR available | Required for RERA brokerage + local operations |
| Abu Dhabi Mainland | AED 15,000+ | AED 10,000+ | Civil law; moderate | 3–4 weeks | Same | Al Jurf physical office path |

### 2.2 Term Sheet — ZAAHI-specific draft structure

Recommended instrument for **Monday 2026-04-21 signing with Rudolf: a Post-Money SAFE (YC 2018 standard) with AED 25–40k legal fee.**

**Why Post-Money SAFE over convertible note over straight equity:**
- Post-Money SAFE is the industry standard (85% market adoption in tech since 2018).
- Valuation cap guarantees Rudolf's 10% ownership on conversion regardless of round dilution.
- No interest rate, no maturity date — cleaner than a convertible note (which would force maturity negotiations in 12–24 months).
- Does not require formed entity on day of signing — can be signed against the ADGM entity after its formation 4–8 weeks out.
- YC Post-Money SAFE template is publicly available, minimises legal drafting time.

**Proposed term sheet key terms (indicative, not final):**

| Term | Proposed value | Rationale |
|---|---|---|
| Investment instrument | Post-Money SAFE, with optional conversion to Series Seed Preferred at founder's election within 12 months | Cleanest, fastest |
| Investor | Rudolf [legal name], [entity if investing via vehicle] | Flag: confirm investment vehicle (personal vs entity) |
| Investment amount | [TBD — needs to be set by founder] AED | Size the SAFE against valuation to yield 10% |
| Valuation cap | [TBD] AED post-money | Set such that investment / (cap) ≈ 10% |
| Discount | 0% (since cap is set) | Simpler; standard |
| Most-Favoured-Nation (MFN) | Yes | Protects Rudolf if later investor gets better terms within same round |
| Conversion trigger | Priced Equity Financing of ≥ AED 3.7M (~USD 1M) OR liquidity event | Standard |
| Liquidation preference (on conversion) | 1x non-participating | Market standard for early-stage |
| Pro-rata rights | Yes for next 2 priced rounds | Industry standard; preserves Rudolf's ability to maintain 10% |
| Information rights | Quarterly financials + annual budget + material event notice | Silent-investor-appropriate |
| Board seat | No | Silent investor — no board seat |
| Board observer | Optional — founder's discretion | Recommend offering to build trust |
| Transfer restrictions | ROFR to founders + Company; no transfer to competitors | Protects control |
| Drag-along | Founders (joint) may drag Rudolf in M&A above [threshold] | Market standard |
| Tag-along | Rudolf may tag onto founders' sale | Market standard |
| Founders | Dymo and Zhan — 4-year reverse vesting with 1-year cliff | **Mandatory** — protects Rudolf and company |
| Existing founder contributions | Explicitly assign all pre-existing IP (Master Tree, codebase, brand, 114 parcels data, ambassador program, Phase 1 dashboards) to new entity | Non-negotiable |
| Non-compete / non-solicitation | Both founders, during employment + 12 months after | Market standard |
| Governing law | ADGM law (or English law if ADGM entity not yet formed) | Common-law optionality |
| Dispute resolution | ADGM Courts / ADGMAC Arbitration | Faster than onshore |

**Crucial note:** do NOT sign a term sheet with unfilled `[TBD]` fields. Valuation and investment amount must be agreed in principle before Monday. **This is the first founder decision to make — see Part 8 recommendations.**

### 2.3 Shareholders Agreement draft structure (for 6–8 week close)

Post-SAFE, the formal SHA should be drafted once the ADGM + Mainland entities are incorporated. Key sections:

**Parties:** ADGM parent HoldCo, Dymo, Zhan, Rudolf, and any other founders/employees holding vested shares.

**1. Capital Structure**
- Authorised share capital: e.g., 10,000,000 shares of no-par-value ADGM Ltd.
- Issued: 9,000 Common to Dymo (10%), 9,000 Common to Zhan (10%), 9,000 Preferred to Rudolf (10%, Seed Preferred if upgraded from SAFE).
- Reserved: 63,000 shares = 70% **Operating Pool** — detailed in §4 below.

**2. Share Classes**
- **Common Shares:** held by founders; standard voting; last in liquidation waterfall.
- **Seed Preferred Shares:** held by Rudolf; 1x non-participating liquidation preference; pro-rata rights; information rights; anti-dilution weighted-average (broad-based) protection.
- **Option Pool Common:** for future hires (part of the 70% pool if founder decides to allocate).

**3. Founder Vesting**
- Founders' 9,000 shares each reverse-vest over 4 years with 1-year cliff starting retroactively from [date of existing platform work, e.g., Zhan's first commit], or from entity incorporation date (founder's choice — will negotiate with Rudolf; convention favours retroactive vesting giving credit for work already done).
- Acceleration: single-trigger on involuntary termination without cause; double-trigger on acquisition + termination.

**4. Operating & Development Pool (70%)**
This is the most unique feature of the proposed structure. Prompt stated "70% operating + platform development" — the SHA must make this concrete:
- **Option A — Company treasury reserve:** 70% held as treasury shares; issued at board approval; diluted on issuance.
- **Option B — Employee Option Pool (ESOP):** 20–30% formally as option pool for future hires (industry-typical).
- **Option C — Founder performance pool:** up to 20% additional founder shares vest on milestones (revenue, platform milestones).
- **Option D — Strategic partner reserve:** shares reserved for future strategic partners (master developers, PRYPCO-equivalent integrations, master community partners).
- **Recommended:** A-D hybrid — 20% ESOP for hires, 30% company treasury/platform development reserve, 10% founder performance, 10% strategic partner. Document in SHA schedule with clear issuance triggers.

**5. Board Composition**
- 3 directors: Dymo + Zhan (as founders), 1 independent OR founder-appointed.
- Rudolf: observer seat if he wants (silent-investor-appropriate).
- Quorum: 2 of 3 directors.
- Reserved matters (unanimous board OR Rudolf consent required): change share capital, issue new preferred, change business scope outside Master Tree, acquire >AED 5M external debt, related-party transactions, founder compensation changes beyond CPI + 10%, sale of all/substantially all assets.

**6. Deadlock Resolution**
- Mediation → ADGM Arbitration → escalation to Russian Roulette / Texas Shootout clauses as final resort.

**7. Transfer Restrictions**
- ROFR to Company then to other shareholders pro-rata.
- No transfer to competitors (defined list + broad sweeper).
- Permitted transfers (family trusts, estate planning) allowed with 30-day notice.

**8. Pre-emptive Rights**
- Rudolf has pro-rata pre-emptive rights on future issuances (prevents dilution below 10% without his capital).

**9. Tag-along / Drag-along**
- Tag: if founders sell >25% of their holdings, Rudolf can join proportionally.
- Drag: founders holding >60% collectively can drag Rudolf in an acquisition above a threshold price (e.g., >USD 5M valuation).

**10. Information Rights**
- Quarterly unaudited financials (30 days post quarter-end).
- Annual audited financials (90 days post year-end).
- Annual budget before fiscal year start.
- Notice of material events: litigation, regulator action, key-person departure, financing >AED 500k.

**11. IP Assignment**
- All pre-existing IP (platform codebase, Master Tree document, brand, parcels database, ambassador program, brand guidelines, 3D ZAAHI Signature) assigned to ADGM entity by Dymo and Zhan upon closing.
- All future IP created by founders and employees assigned to ADGM entity.
- Covenants against development of competing products.

**12. Non-Compete & Non-Solicit**
- During employment + 12 months post-departure.
- UAE + GCC geographic scope.
- Exception: Dymo's pre-existing real estate advisory / ambassador activities not at ZAAHI — must be scheduled out.

**13. Dividend Policy**
- No dividends for first 5 years; all profits reinvested into platform development per Master Tree.
- Post-5-year policy: board discretion.

**14. Exit Provisions**
- IPO: lock-up 180 days post-IPO for all parties.
- M&A: founders may not sell to competitors without unanimous consent.
- Buy-back: Company right to buy back Rudolf's shares at fair market value (determined by mutually-agreed valuer) after 5 years at 1x liquidation preference + 8% IRR floor.

**15. Governing Law & Dispute Resolution**
- ADGM law.
- ADGM Courts (first instance) + ADGMAC arbitration (appeal / enforcement).
- Enforcement across UAE through mutual-recognition treaties.

### 2.4 UAE Compliance Checklist (end-to-end)

**Entity formation:**
- [ ] ADGM HoldCo incorporated (name reservation, SPV or Tech Startup route, AoA, SPA, UBO filing)
- [ ] ADGM Registrar filing + ADGM FSRA determination (not financial-services)
- [ ] Mainland OpCo LLC incorporated via DED Dubai (name reservation, AoA, trade licence)
- [ ] Abu Dhabi branch if Al Jurf office physical presence

**Real estate licences:**
- [ ] RERA company broker licence (NOT transferable from individual — must be issued to the Mainland LLC; both founders re-apply for broker cards under the company)
- [ ] RERA Broker Cards for Dymo and Zhan under OpCo (2–4 weeks processing time each; old cards become void when individual stops practising solo)
- [ ] DLD company registration on Trakheesi system
- [ ] Abu Dhabi ADREC registration if operating AD plots
- [ ] Trakheesi per-listing advertising permits (Dubai; ongoing)

**Tax & financial:**
- [ ] Corporate Tax registration with FTA (within 3 months of incorporation; mandatory even if expect Small Business Relief)
- [ ] VAT registration if taxable supplies ≥ AED 375,000 (expected quickly once agency deals flow); voluntary registration at AED 187,500
- [ ] UBO declaration within 60 days of incorporation (Dymo + Zhan + Rudolf; update within 15 days of changes)
- [ ] Economic Substance Regulations: annual notification 6 months post-year-end; full report 12 months post-year-end if relevant activity
- [ ] FTA e-invoicing compliance (B2B/B2G rolls out July 2026)
- [ ] Corporate bank account (typically 6–8 weeks to open for new entity; Emirates NBD, Mashreq Neo, Wio, Zand Digital, Liv. are startup-friendly)

**Employment & visa:**
- [ ] Dymo and Zhan investor visas via ADGM HoldCo (shareholder visa) + Mainland employment visas via OpCo
- [ ] If founders hold Golden Visa via property AED 2M+ — verify no conflict with investor/employment visa structure
- [ ] MOHRE establishment registration for OpCo (employment entity)
- [ ] WPS (Wage Protection System) enrollment if employing staff

**Data & compliance:**
- [ ] PDPL (Federal Decree-Law 45/2021) Data Protection Officer designation (even if not mandatory, best practice)
- [ ] PDPL registration with UAE Data Office if required by volume/type
- [ ] GDPR controller obligations if serving EU users
- [ ] Privacy policy + cookie policy + terms of service (already exist per repo; update references to new legal entities)
- [ ] AML/CFT compliance program — mandatory for RE brokers per Federal Law No. 20/2018; register on goAML; appoint Compliance Officer

**Accounting & audit:**
- [ ] ADGM auditor appointed for annual audit (required)
- [ ] Accounting software (Xero / Zoho / QuickBooks) set up from day 1
- [ ] Bookkeeping discipline: all receipts, all invoices, all commissions traced

**Real estate specific:**
- [ ] Ejari contract for office premises (Al Jurf or Dubai branch)
- [ ] Professional indemnity insurance for broker activities (typical AED 15–30k/year)
- [ ] Deposit accounts at RERA-accredited escrow bank (for any client money)
- [ ] Annual RERA CPD (Continuing Professional Development) hours tracked

---

## Part 3 — Pitch Deck Recommendations

### 3.1 Structure — recommended 18-slide deck

For Rudolf's review AND for future tier-1 VC conversations, the same deck works with minor tailoring.

1. **Cover** — ZAAHI logo, tagline "The Sovereign Real Estate OS for UAE", confidentiality note.
2. **The problem** — fragmented data (DLD vs RERA vs DDA vs developer Excel), opaque transactions, 10+ apps per deal, foreign-buyer trust gap, no AI in UAE RE.
3. **The solution** — ZAAHI: one platform, 85 integrated modules, 9 land-use categories already mapped, 3D Signature visualization, AI agents (Cat, Mole, Falcon).
4. **Product demo** — 4 screenshots: map with 114 parcels → side-panel deal detail → ambassador program → Archibald AI chat. Include live URL (zaahi.io).
5. **Market size** — UAE RE 2025: AED 682.6B transactions + 215k sales (DLD data); projection for 2026: 200k+ transactions, AED 750B+. Dubai Q1 2026 alone AED 252B. TAM.
6. **SAM** — platform-addressable segment: UAE agencies (~3,000 brokerages), developers (~500), investors (institutional + HNWI + crypto-native). Conservative SAM: AED 30B of transaction value ZAAHI touches via platform fees.
7. **SOM** — Year 1 target: AED 100M agency transaction volume + 500 platform users. Year 3: AED 5B + 50,000 users.
8. **Business model** — two revenue lines:
   - **Platform (long-horizon):** 2% ZAAHI service fee on deals, SaaS subscriptions (owner/broker/developer), AI-agent premium access, ambassador tier fees (already live: SILVER AED 1k, GOLD AED 5k, PLATINUM AED 15k lifetime).
   - **Agency (near-term cash):** standard 2% brokerage commission on Al Jurf plots + off-plan.
9. **Traction** — what is built + what is validated.
   - 114 parcels live on zaahi.io.
   - 266 API routes, 556K plots via PMTiles (DDA, AD, Oman).
   - Phase 1 dashboards live; ambassador program live; 3D ZAAHI Signature buildings live.
   - 9 land-use categories mapped.
   - Successful investor demo 2026-04-17.
10. **Competition** — honest framing:
    - Listings: Bayut, Property Finder, dubizzle dominate. ZAAHI is NOT a listings portal.
    - Tokenization: PRYPCO Mint on XRP Ledger. ZAAHI audit-trail only; complementary, not competitor.
    - Brokerage tech: Huspy (mortgage + brokerage). ZAAHI is horizontal OS; Huspy is vertical.
    - Master-tree-scale OS: **no direct competitor exists globally for UAE RE**.
11. **Moat** —
    - 85-section Master Tree architecture (defensible scope).
    - 3D ZAAHI Signature visualization (founder-designed; unique UI).
    - Ambassador 3-tier network (SILVER/GOLD/PLATINUM) with revenue flywheel.
    - 17-year founder domain depth (Zhan) + 18-year global ops (Dymo) + RERA licences.
    - Self-sovereignty roadmap (unique strategic position).
12. **Technology** —
    - Next.js 15, React 19, Three.js, PostgreSQL, Prisma, MapLibre/PMTiles, Polygon audit trail (recommended, Option A, audit-only per blockchain research).
    - Self-sovereignty migration Phase 1–5.
13. **Go-to-market** —
    - Phase 1 (Months 1–6): Al Jurf agency deals generate revenue + market credibility + data for platform.
    - Phase 2 (Months 6–18): Platform SaaS for Dubai brokerages, freemium then paid.
    - Phase 3 (18–36 months): Developer + investor SaaS, full Master Tree §08 Off-Plan, §34 Fractional, §38 Dispute Resolution.
14. **Team** —
    - Zhan (CEO/CTO): 17 yrs RE, full-stack engineer, platform author.
    - Dymo (Co-founder, Ambassador, Guardian Partner): 18+ yrs global ops (Stolt-Nielsen, Bahri), Dubai RE since 2018, RERA-licensed, Equilibrium Advisory Group partner.
    - (Advisors if any — list them)
    - Hires planned: senior frontend engineer, senior broker, compliance officer (Year 1).
15. **Financials** — 3-year projection summary (full model as appendix):
    - Year 1: AED 500k revenue, AED -800k net (investment phase)
    - Year 2: AED 3M revenue, breakeven
    - Year 3: AED 12M revenue, AED 4M net
    - (Numbers are placeholders — must be built in the financial model.)
16. **Funding ask** — Rudolf's commitment (AED amount + 10%) + planned Seed round (AED 5–10M within 12 months to fund platform hires + Al Jurf expansion).
17. **Use of funds** — breakdown by OpEx / platform dev / agency operations / legal / reserves.
18. **Appendix / Q&A** — Master Tree deep dive, ambassador program detail, blockchain strategy, risk register.

### 3.2 Visual design standards

- **Font pair:** Georgia (headings, per CLAUDE.md UI style guide) + Inter or San Francisco (body).
- **Colour palette (per CLAUDE.md):** Gold `#C8A96E` as accent, Navy `#1A1A2E` for text/backgrounds, white/gold glassmorphism for cards. Matches zaahi.io visual language — consistency across product and deck is itself a signal of maturity.
- **One visual per slide.** No slide should be text-only.
- **Numbers as large, bold, typographic blocks.** Per CLAUDE.md number-formatting rules.
- **All screenshots from live product** (zaahi.io), not mocks.
- **Tools:** Figma + PDF export. Avoid PowerPoint for unicorn-tier decks; avoid Canva for anything other than one-pager variants.

### 3.3 One-pager variant

For Rudolf Monday meeting AND for cold intros, a one-pager condenses:
- Logo + tagline
- Problem (1 sentence)
- Solution (2 sentences)
- Traction (3 bullets)
- Team (2 names + one-liner credentials)
- Ask (investment amount + use of funds)
- Contact

Render as a single A4 PDF. Inspirable from Airbnb, Stripe Series A one-pagers.

---

## Part 4 — Business Plan Structure

Unicorn-tier business plans are typically 20–40 pages PDF. Here is a tailored ZAAHI outline.

**1. Executive Summary (1–2 pages)** — recap of problem, solution, market, traction, team, ask. One-paragraph "narrative" at the top.

**2. Problem Statement & Market Opportunity (3–4 pages)** —
- Dubai RE market: AED 682.6B sold in 2025 (215,060 transactions); AED 252B Q1 2026 (+31% YoY).
- Pain points: documentation fragmentation, broker-buyer trust deficit, no AI, no unified OS.
- Why now: DLD digital transformation (Prypco Mint milestone), VARA rulebook stabilising (2026), AI inflection point.

**3. Solution & Product Overview (4–5 pages)** —
- ZAAHI platform: 85-section Master Tree, ambassador program, Archibald AI, 3D Signature, parcels database.
- Screenshots from live product.
- Master Tree reference: link to `docs/architecture/MASTER_TREE_final.md`.

**4. Market Analysis (4–5 pages)** —
- TAM/SAM/SOM structured breakdown with sources (DLD, RERA statistics, Knight Frank, JLL, Property Finder reports).
- Segmentation: HNWI / Institutional / Crypto-native / Developer / Broker / Owner.
- Geographic expansion: Dubai → AD → KSA → EU phasing per Master Tree.

**5. Business Model & Unit Economics (3–4 pages)** —
- Revenue streams (21 per Master Tree §54; 2 active today: 2% service fee + ambassador tier fees).
- LTV / CAC estimates.
- Gross margin analysis: platform (~80%) vs agency (~30–60%).
- Cohort retention projections.

**6. Go-to-Market Strategy (3–4 pages)** —
- Phase 1 Al Jurf agency wedge.
- Phase 2 broker/developer SaaS.
- Phase 3 full platform.
- Sales motion: founder-led → SDR team (Year 2+).

**7. Competition & Moat (2–3 pages)** —
- Competitive matrix (per pitch deck slide 10).
- Moat narrative (per pitch deck slide 11).
- Defensibility of Master Tree architecture.

**8. Technology & IP (2–3 pages)** —
- Architecture overview.
- Self-sovereignty roadmap.
- IP ownership consolidation into ADGM parent.
- Blockchain strategy (audit-trail only Option A per `BLOCKCHAIN_DEEP_DIVE.md`).

**9. Team & Organisation (2 pages)** —
- Founder bios with demonstrable credentials.
- Org chart current + 12-month plan.
- Advisory board.

**10. Financial Projections (3–4 pages + Excel model)** —
- 3-year P&L, cash flow, balance sheet.
- Scenario analysis (base / bear / bull).
- Headcount plan.
- Capital requirements timeline.

**11. Funding Ask & Use of Funds (1 page)** —
- Rudolf Seed injection detail.
- Series Seed roadmap (6–12 months).
- Use of funds pie chart: tech hires 40%, agency ops 25%, marketing 15%, legal 10%, reserve 10%.

**12. Milestones & Risks (2 pages)** —
- 12-month milestone calendar.
- Risk register (per Part 7 below).

**13. Appendices** —
- Master Tree structure (from `MASTER_TREE_final.md`).
- Blockchain strategy (from `BLOCKCHAIN_DEEP_DIVE.md`).
- Gap analysis (from `ZAAHI_CURRENT_STATE_VS_MASTER_TREE.md`).
- Ambassador program rulebook.
- Sample SHA / term sheet.
- CVs.
- Legal entity documents.

---

## Part 5 — Financial Model Framework

Build in Google Sheets (shareable + collaborative) or Excel with PDF export. Template: the Financial Models Lab PropTech templates are solid starting points; adapt to UAE specifics.

**Sheet structure:**

1. **Assumptions** — pricing per service, CAC assumptions, conversion rates, FX rates, headcount salaries, office rent Al Jurf, platform infrastructure costs.
2. **Revenue Build** —
   - Platform revenue lines (ambassador fees, service fees, SaaS subscriptions, AI premium, future streams).
   - Agency revenue (plots + off-plan; per-deal commission × deals per month).
   - Total monthly → quarterly → annual.
3. **COGS & Gross Margin** — payment processing, third-party APIs, AWS/Vercel/Supabase fees, document storage, blockchain gas, legal/regulatory pass-through.
4. **Headcount plan** — founders compensation (flag: founder salaries AED 25–40k/mo typical early, ramp as revenue flows), engineer hires, broker hires, compliance, admin. Include benefits, bonuses, gratuity, visa costs.
5. **OpEx** — office (Al Jurf + Dubai branch), software (Notion, Linear, Figma, AWS), legal retainer, insurance, marketing (conferences, content, ads), travel.
6. **CapEx** — data-centre migration Phase 1–3 per Master Tree §50 (starts Q3 2026 Equinix colo).
7. **Cash Flow** — monthly + quarterly + annual; starting cash + Rudolf injection + later Seed + revenue - OpEx - CapEx.
8. **P&L** — standard three-year projection.
9. **Balance Sheet** — shareholder equity, retained earnings, assets.
10. **Breakeven analysis** — months to breakeven per scenario.
11. **Sensitivity analysis** — tornado chart: what if deals -50%, deals +2x, platform-fee -50%, headcount +50%, gas fees +10x. Investor scrutiny default questions.
12. **Waterfall 10/10/10/70** — on exit at various valuations (AED 30M, 100M, 500M, 2B), how much does each party receive after liquidation preferences? This is a **key slide for Rudolf** — transparency on what his 10% means at various exits.

Sample waterfall at AED 500M exit, 1x non-participating preference on Rudolf's AED X M investment:
- Rudolf gets max of (1x × AED X M) or (10% × AED 500M).
- Founders (20% combined) split AED 100M minus any preferred uplift.
- 70% pool distributed per vesting / ESOP / performance rules.

### Key metrics to track (KPI dashboard)

- Monthly active users (MAU) on zaahi.io
- Deals initiated per month
- Deals closed per month
- Deal completion rate
- Average deal size
- Platform fee per deal (2% ZAAHI service fee)
- Ambassador tier distribution (SILVER/GOLD/PLATINUM count)
- Ambassador-sourced deal %
- Listings added per month
- Parcels in DB (currently 114, trending)
- CAC per user type
- Gross margin %
- Monthly burn
- Runway (months)

---

## Part 6 — Launch Plan Framework (first 12 months)

**Week 1 (Apr 21–27, 2026): Investor close + entity setup kickoff.**
- Monday Apr 21: meet Rudolf; present deck + one-pager; sign SAFE + Term Sheet; receive initial tranche.
- Engage UAE law firm (see shortlist in Part 8.2).
- Start ADGM entity reservation process.
- Start Mainland LLC entity reservation.

**Week 2–4 (Apr 28–May 18): Entity formation in progress.**
- AoA and SPA drafting.
- RERA broker company application.
- Professional indemnity insurance quote.
- Accounting software + Xero/Zoho setup.
- Open corporate bank account (Mashreq Neo / Wio / Emirates NBD startup).
- Finalise pitch deck v2 + business plan v1.

**Week 5–8 (May 19–Jun 15): Entities live.**
- ADGM HoldCo incorporated; ownership transferred.
- Mainland OpCo incorporated; RERA broker licence issued; both founders' Broker Cards issued under OpCo.
- Abu Dhabi branch if Al Jurf office confirmed.
- UBO filings done; CT + VAT registered.
- Shareholders Agreement signed; SAFE converts to Preferred upon funding round OR founder exercises option to convert early.
- Office lease signed (Al Jurf).
- First external hire(s) — senior broker and/or senior frontend engineer.

**Month 3 (June–July): First revenue.**
- First agency deal (plot or off-plan) in Al Jurf.
- Platform improvements: repair deal-engine notifications (top P1 per gap analysis).
- Master Tree §02 Residential scaffolding.
- First Trakheesi-permitted public listing.

**Month 4–6 (August–October): Platform expansion + fundraise prep.**
- Master Tree §08 Off-Plan Phase 1.
- Master Tree §66 Market Intelligence (basic heatmap).
- Start conversations with tier-1 regional VCs (Sequoia MENA, Wamda, BECO, COTU Ventures, Shorooq).
- Draft Series Seed term sheet with preferred rights upgrade for Rudolf + new investors.

**Month 6–9: Series Seed close.**
- AED 5–10M Seed round.
- Team growth to 6–10 people.
- Blockchain audit-trail deployed on Polygon PoS (per `BLOCKCHAIN_DEEP_DIVE.md` Option A).

**Month 9–12: Self-sovereignty Phase 1.**
- Equinix Dubai colo (Master Tree §50 DC1 target).
- Move Postgres backup mirror to own infra.
- Blockchain validator node planning.

---

## Part 7 — Risk Register

### Market risks
1. **Dubai RE correction:** market down 20–30% in a cyclical correction. Mitigation: diversify to AD (Al Jurf), KSA later; platform-fee model is volume-sensitive but not price-sensitive.
2. **Foreign-buyer sentiment shift:** geopolitical events (Iran tensions, KSA-UAE rivalry) reducing HNWI appetite. Mitigation: local demand (Emirati + resident) still large; ambassador program creates referral flywheel.
3. **Tokenization compression:** PRYPCO + Ctrl Alt + DLD alliance captures institutional tokenization market before ZAAHI builds §34–§35. Mitigation: focus on orthogonal pieces (listings OS, AI agents, audit trail); partner with PRYPCO rather than compete.

### Technology risks
4. **Vercel / Supabase / Anthropic SaaS lock-in:** dependency migration is non-trivial; outages or policy changes could disrupt. Mitigation: Sovereignty Readiness Rules (CLAUDE.md) enforce portability; Phase 1 colo by Q3 2026.
5. **AI model drift / Anthropic API cost inflation:** Cat agent depends on Claude Opus/Sonnet; price or quality could shift. Mitigation: local Qwen/Ollama fallback already configured; fine-tuned Zaahi-7B target 2027.
6. **Scaling architecture:** Master Tree 85 sections is ambitious; execution risk. Mitigation: strict prioritisation per gap analysis (§18 Referrals + §01 Land + §31 Deal Engine + §14/15/17 Dashboards are solid; stay disciplined).

### Regulatory risks
7. **VARA scope expansion:** if VARA tightens rules to cover document-hash anchoring, audit-trail Option A becomes VA-regulated. Mitigation: proceed with legal opinion (AED 4k) before deploying per blockchain research; stay narrowly scoped.
8. **RERA compliance error:** founder broker cards must transfer correctly; Trakheesi permits must cover every listing. Mitigation: dedicated compliance officer by Month 3; automation of Trakheesi filing.
9. **PDPL / GDPR breach:** user data (PII) spans EU/GCC users. Mitigation: DPO designation; data classification per CLAUDE.md; privacy impact assessment per section.
10. **AML Federal Law 20/2018 & goAML:** RE brokers are AML-regulated; suspicious-transaction reporting mandatory. Mitigation: register on goAML; Compliance Officer; MLRO (Money Laundering Reporting Officer) designation; annual AML training.

### Key-person risks
11. **Founder dependency (Zhan codebase):** if Zhan is incapacitated, who operates the platform? Mitigation: documentation (CLAUDE.md), comprehensive commits, senior engineer hire by Month 2, key-person insurance AED 5–10M.
12. **Dymo relationship dependency (Rudolf):** if Dymo-Rudolf trust breaks down, investor may invoke protective provisions. Mitigation: transparent quarterly reporting; documented information rights; structural governance.
13. **Co-founder disagreement:** 10/10 split means 50/50 voting between founders; deadlock risk. Mitigation: pre-agreed tie-breaker (independent director vote, or CEO tiebreaker on ops matters only), shareholders agreement deadlock clause.

### Competition risks
14. **Bayut / Property Finder downward expansion:** incumbents launch AI + tokenization features. Mitigation: niche (deep AI agents, 3D Signature, master-tree depth) outruns breadth; differentiation in substance, not marketing.
15. **Huspy horizontal expansion into our lanes:** Huspy has capital and could launch listings. Mitigation: partnership discussion; different vertical (they are mortgage-first, we are platform-first).
16. **New entrants:** every week a new proptech launches. Mitigation: execution velocity + founder domain depth is the moat.

### Execution risks
17. **Capital runway miscalculation:** underestimate OpEx growth (especially post-hires). Mitigation: financial model sensitivity analysis; monthly CFO-level cash review; 18-month runway minimum at all times.
18. **Hiring velocity:** UAE tech talent scarce and expensive. Mitigation: remote-first hiring (Ukraine, Kazakhstan, India engineers); UAE hires only for regulated roles (broker, compliance).
19. **Scope creep:** Master Tree has 85 sections; easy to spread thin. Mitigation: ship one section at a time to production; public roadmap; quarterly OKRs.

---

## Part 8 — Recommendations for Founder

### 8.1 Document priority order — what to have ready

**Monday 2026-04-21 (must-have for Rudolf meeting):**
1. **Pitch deck v1** (18 slides, per Part 3 above) — can be drafted with Claude help + founder overnight; needs real product screenshots.
2. **Executive summary one-pager** — condenses deck; easier to share than full deck.
3. **Term Sheet** — using YC Post-Money SAFE template with ZAAHI-specific clauses pre-populated (see Appendix A below). **Legal review recommended before signing** — ~AED 10k for a 2-day turnaround by a mid-tier firm.
4. **Memorandum of Understanding (MOU)** — non-binding commitment document that lets Rudolf and founders confirm partnership intent without legal entity risk. Can be drafted in 1 evening.
5. **High-level Business Plan (6–8 page)** — not 40-page full plan; a condensed version is sufficient.

**First week (by Friday 2026-04-25):**
6. **Post-Money SAFE executed** — actual SAFE document; requires legal review; first funds transferred.
7. **Full Business Plan draft (20–30 pages)** — Rudolf's legal team will want this for their analysis.
8. **Financial Model v1** — Excel / Google Sheets with 3-year projection; even rough numbers are better than missing model.
9. **Legal counsel engaged** — MOU signed with UAE law firm for entity formation + SHA drafting over following 4–8 weeks.

**Month 1 (by 2026-05-21):**
10. **Entity formation in progress** — ADGM + Mainland applications filed.
11. **IP Assignment drafts** — founders assigning pre-existing platform IP to new entity.
12. **Employment Agreements** — founders' own agreements with the new OpCo (with 4-year reverse vesting on their equity).
13. **Non-disclosure, non-compete, non-solicit agreements**.
14. **Formal Articles of Association** — ADGM and Mainland.
15. **Founders' service agreements**.
16. **ESOP plan and option grants framework** (if 70% pool includes ESOP).

**Month 2–3 (by 2026-07-15):**
17. **Signed Shareholders Agreement** — the master document.
18. **Company stamps, letterheads, banking infrastructure**.
19. **Insurance policies** (PI, D&O, key-person).
20. **Operating manuals** — compliance, AML, data-privacy playbooks.

### 8.2 Recommended UAE Legal Counsel

Ranked by fit for this deal (technology + real estate + venture).

| Firm | Tier | Typical fee for Seed-stage package | Specialisation | Contact |
|---|---|---|---|---|
| **Al Tamimi & Company** | Top (regional leader) | AED 150–300k for full Seed package | Corporate + RE + TMT; strongest regional bench | tamimi.com; Dubai HQ + Abu Dhabi + 9 countries |
| **Baker McKenzie** | Top (global) | AED 200–400k | Corporate + M&A + VC; global reputation; premium | bakermckenzie.com; Dubai + Abu Dhabi |
| **Clyde & Co** | Top (global) | AED 150–300k | RE + Construction + Insurance focus; strong practical RE depth | clydeco.com; Dubai + Abu Dhabi |
| **Hadef & Partners** | Top local | AED 100–200k | Deep UAE law knowledge; strong local relationships; M&A + JV | hadefpartners.com; Dubai + Abu Dhabi |
| **BSA (Ahmad & Hammad Al Mulla)** | Mid-top local | AED 80–150k | Strong startup/RE practice; faster turnaround than Big Four | bsalaw.com; Dubai |
| **King & Spalding** | Top (global) | AED 180–350k | Corporate + M&A + project finance; ADGM digital assets | kslaw.com; Dubai |
| **DLA Piper** | Top (global) | AED 180–350k | Corporate + TMT + privacy | dlapiper.com; Dubai + Abu Dhabi |
| **Pinsent Masons** | Top (global) | AED 150–300k | TMT + finance + RE | pinsentmasons.com; Dubai + Doha |
| **Kayrouz & Associates** | Boutique | AED 50–120k | Tokenisation + financial services specialised | kayrouzandassociates.com; Dubai |
| **Crimson Legal** | Boutique | AED 40–100k | Startup VC focused; pragmatic pricing | crimson-legal.com |

**My recommendation: Al Tamimi OR Hadef & Partners for the formal package (AED 150–200k budget), with Crimson Legal OR Kayrouz for the Monday-only SAFE/Term Sheet review (AED 10–25k).**

Two-firm split is common: a boutique fast-turnaround firm does the Week-1 papers, a top-tier firm does the 6–8 week formal close. Saves 30–40% on total legal cost without sacrificing the formal documents' quality.

### 8.3 AI-assisted vs Human-only documents

| Document | AI-draft first? | Human attorney required? |
|---|---|---|
| Pitch deck | Yes (Claude + founder) | Optional visual review |
| Executive summary | Yes | No |
| MOU | Yes (Claude template) | Light review AED 2–5k |
| Term Sheet | Yes (YC template + Claude customisation) | **Yes** — mid-tier review AED 5–15k |
| Post-Money SAFE | Yes (YC template) | **Yes** — mid-tier review AED 5–15k |
| Business Plan | Yes (Claude + founder) | No |
| Financial Model | Yes (Claude builds structure, founder fills) | Finance advisor review (not lawyer) |
| Articles of Association (ADGM + Mainland) | **No** — jurisdiction-specific boilerplate | **Yes** — top-tier AED 30–60k |
| Shareholders Agreement | Outline AI, drafting human | **Yes** — top-tier AED 60–120k |
| IP Assignment | Yes (draft) | **Yes** — AED 15–30k |
| Employment Agreements | Yes (draft) | **Yes** — AED 5–10k each |
| Non-compete / Non-solicit | Yes (draft) | **Yes** — AED 5–10k each |
| Board Resolutions | Yes (draft) | Light review AED 2–5k each |
| UBO Declaration | Directly submitted via ADGM/DED portal | No lawyer needed |

**Principle:** for any document that has legal enforcement risk (SHA, AoA, SPA, employment), a UAE-qualified attorney must be the signatory on the advice. For support materials (deck, business plan, summary), Claude can first-draft and founder reviews.

### 8.4 Realistic timeline — honest assessment

| Deliverable | Realistic timing | Risk if rushed |
|---|---|---|
| Pitch deck v1 | 2 days | Low |
| MOU | 1 day | Low |
| Term Sheet | 2–3 days incl. legal review | Medium — terms misaligned with later round |
| Post-Money SAFE signed | 3–5 days incl. legal review | Medium — investor-side lawyer may re-paper |
| Business plan v1 | 3–5 days | Low |
| Financial model v1 | 3–5 days | Medium — unrealistic assumptions |
| Entity formation (ADGM + Mainland) | 4–8 weeks | High — cannot be compressed |
| RERA broker licence (company) | 3–6 weeks | High — cannot be compressed |
| Shareholders Agreement final signed | 6–10 weeks after entities form | High — hasty SHA = lifetime cost |
| Corporate bank account | 6–12 weeks | Very high — banks cannot be rushed |

**Honest recommendation:** for Monday, target **Pitch Deck + Exec Summary + Term Sheet + MOU + SAFE draft**. Close on SAFE by Friday 2026-04-25. Entity and SHA close on a realistic 6–8 week schedule post-Monday. Rudolf (silent 10%) is not exit-oriented; he will accept this timing if it is clearly articulated up front.

### 8.5 Costs breakdown — full package estimate

| Category | Budget range (AED) | Notes |
|---|---|---|
| **Legal fees** | | |
| Fast-track SAFE + Term Sheet review (Week 1) | 10,000–25,000 | Boutique firm |
| Full SHA + entity + AoA (6–8 weeks) | 100,000–200,000 | Top-tier firm (Al Tamimi / Hadef) |
| Employment + IP assignment + NDAs | 20,000–40,000 | Bundled with formal close |
| **Entity formation** | | |
| ADGM Tech Startup Licence | 5,500 (USD 1,500) | Year 1 |
| ADGM renewals | 5,500/year | Ongoing |
| Mainland LLC + DED trade licence | 15,000–25,000 | One-off |
| Abu Dhabi branch (if Al Jurf physical) | 8,000–15,000 | One-off |
| **Regulatory licences** | | |
| RERA company broker licence | 12,900 | One-off (quoted 2026) |
| RERA Broker Cards (2x founders) | 4,000 (2,000 each) | One-off; annual renewal |
| Trakheesi permits | ~500 per listing | Ongoing; variable |
| Abu Dhabi ADREC | TBD | If AD operations |
| **Tax & compliance** | | |
| Corporate Tax registration | 0 (free) | Mandatory |
| VAT registration | 0 (free) | When threshold met |
| UBO filing (self-service) | 0 | Within 60 days |
| ESR filings | 5,000–15,000/year | Through accountant |
| **Banking** | | |
| Corporate account opening fees | 5,000–15,000 | Varies by bank |
| **Insurance** | | |
| Professional Indemnity | 15,000–30,000/year | Real estate broker |
| D&O (Directors & Officers) | 10,000–25,000/year | Recommended |
| Key-person | 15,000–40,000/year | Recommended |
| **Accounting & Audit** | | |
| Accounting software | 500–1,500/month | Xero, Zoho, QB |
| Monthly bookkeeping | 5,000–15,000/month | If outsourced |
| Annual audit (ADGM requires) | 20,000–50,000/year | Top-4 firms higher |
| **Translations** | | |
| Arabic legal translations | 3,000–8,000 | Required for some docs |
| **Contingency (20%)** | 30,000–50,000 | Standard budgeting |
| **TOTAL YEAR 1 (one-off + first-year recurring)** | **AED 300,000–650,000** | Most will be mid-range ~AED 400k |
| **Of which needed for Monday + first week only** | **AED 25,000–50,000** | Legal review + initial deposits |

### 8.6 Top 5 risks if rushed

1. **Signing a Term Sheet with "1x participating" liquidation preference** by accident — gives Rudolf 2× return in M&A, destroying ~10% of founder proceeds. Mitigation: use 1x NON-participating (standard), lawyer must verify before signing.
2. **Wrong jurisdiction choice locks in** — if founder signs docs referencing Mainland-only entity, converting to ADGM/DIFC later requires SHA renegotiation with Rudolf and possible tax reclassification. Choose entity architecture BEFORE signing docs.
3. **IP not properly assigned from founders to entity** — if Master Tree, codebase, or brand is still personally owned by Zhan on Monday but the SHA implies company ownership, Rudolf's counsel will flag this as existential. Have the IP Assignment clause in the SAFE + Term Sheet from day 1.
4. **Missing reserved matters** — silent investor expects veto rights on certain matters (new founders added, business-scope change, related-party transactions). Forgetting to list these = re-negotiation later and erosion of trust.
5. **Founder vesting omitted** — without founder vesting, if Dymo or Zhan departs after Month 3, they keep 10% as "gift" and Rudolf's investment is partially unearned. Both founders MUST reverse-vest over 4 years.

### 8.7 Top 3 questions for Rudolf before finalising

1. **"Are you investing personally or through a family office / SPV / fund?"** This determines KYC requirements, tax reporting, fund-manager rules (if any), and AML due diligence. If via a fund, Rudolf's fund manager will drive document style; if personally, we control pace.

2. **"What is your investment amount, and are we setting the post-money valuation to yield exactly 10%?"** Even if the 10% allocation is verbally agreed, the specific valuation must be nailed down. This drives: Rudolf's AED commitment, founder dilution math on future rounds, Rudolf's pro-rata dollars needed to maintain 10%.

3. **"What information cadence and governance involvement do you want?"** Silent investor has a range: pure quiet (annual report), mid (quarterly call + financials), or active (monthly office hours). This shapes the SHA information-rights clause and saves endless back-and-forth on Month 12 reporting.

---

## Appendix A — Sample Term Sheet (annotated draft for ZAAHI)

> **DRAFT — NOT LEGALLY BINDING — FOR FOUNDER & INVESTOR DISCUSSION ONLY — REQUIRES UAE LEGAL COUNSEL REVIEW BEFORE SIGNING**

**TERM SHEET — ZAAHI PLATFORM**
**Date:** [2026-04-21]
**Parties:** Dmytro Tsvyk ("Dymo"), Zharkyn Ryspayev ("Zhan") (together the "Founders") and [Rudolf surname here] ("Investor").

The Founders are forming a UAE-incorporated entity (provisionally "ZAAHI Ltd", to be registered in Abu Dhabi Global Market) which will own 100% of a Dubai-incorporated operating subsidiary holding a RERA broker licence (provisionally "ZAAHI Brokerage LLC") (together the "Company").

This Term Sheet outlines the principal terms on which the Investor will invest in the Company via a Post-Money SAFE. It is NOT a binding agreement except for Clauses 14 (Confidentiality) and 15 (Exclusivity).

| Clause | Term |
|---|---|
| 1. Investment instrument | Post-Money Valuation Cap Simple Agreement for Future Equity ("SAFE"), Y Combinator 2018 template, adapted to ADGM law. |
| 2. Investment amount | AED [X], payable in full on signing by wire transfer to Founders' escrow account pending Company formation. |
| 3. Post-money valuation cap | AED [Y], designed to yield 10.00% ownership on conversion at next qualifying round, assuming standard dilution. |
| 4. Discount | None (cap governs). |
| 5. MFN | If the Company issues another SAFE or convertible security within 12 months on terms more favourable to that investor, Investor will automatically receive the benefit of those terms (lower cap, higher discount, MFN, etc.). |
| 6. Conversion triggers | (a) Priced equity financing of ≥ USD 1,000,000 ("Equity Financing"); (b) Liquidity Event (IPO, SPAC, change of control, asset sale); (c) Dissolution. |
| 7. Liquidation preference | 1x non-participating (on converted Preferred Shares). |
| 8. Pro-rata rights | Yes, for next 2 priced rounds. |
| 9. Information rights | Annual audited financials; quarterly management accounts (within 45 days); annual budget (before fiscal-year start); material event notice. |
| 10. Board rights | No board seat. Board observer seat at Investor's election (non-voting). |
| 11. Transfer restrictions | ROFR to Company then other shareholders (pro-rata) on any Investor transfer. No transfer to Restricted Parties (competitor list + sweeper; to be agreed). |
| 12. Drag-along | Founders (collectively) may drag Investor in a sale of ≥ 60% of the Company at any price above the post-money valuation cap. |
| 13. Tag-along | Investor may tag-along to any Founder sale of > 25% of their holdings. |
| 14. Confidentiality | Mutual; survives termination; 3 years. |
| 15. Exclusivity | For 30 days from signing, Founders will not negotiate equivalent terms with any other party. |
| 16. Founder vesting | Founders' existing and future shares in the Company to be subject to 4-year reverse vesting with 1-year cliff, starting from the Effective Date (defined below). Single-trigger acceleration on involuntary termination without cause; double-trigger acceleration (change-of-control + termination) on acquisition. |
| 17. IP Assignment | All pre-existing IP (software code, Master Tree v3 document, brand assets, 3D ZAAHI Signature, parcels database of 114 parcels, PMTiles coverage, ambassador program architecture, Phase 1 user dashboards, Archibald AI integration, domain zaahi.io, related domains and handles) to be irrevocably assigned by Founders to the Company on or before the Effective Date. Founders represent and warrant that they own all such IP free of encumbrance. |
| 18. Non-compete / non-solicit | Standard 12-month post-employment restriction, UAE + GCC geographic scope; exceptions scheduled. |
| 19. Representations | Founders make customary representations: ownership of IP, no pending litigation, full disclosure of material facts, accuracy of information provided to Investor. |
| 20. Governing law | Laws of Abu Dhabi Global Market (ADGM); English law to apply pending ADGM entity formation. |
| 21. Dispute resolution | ADGM Courts (first instance) and ADGM Arbitration Centre (appeal / enforcement). |
| 22. Effective date | The date on which the SAFE is signed and investment wired. |
| 23. Long-stop date | If the ADGM entity is not formed and the SAFE not formally executed within 90 days of this Term Sheet, either party may terminate with written notice. |

Signed:

Dmytro Tsvyk _________________________ Date: _____________

Zharkyn Ryspayev _____________________ Date: _____________

[Rudolf signatory] ______________________ Date: _____________

---

## Appendix B — Sample Executive Summary (annotated draft for ZAAHI)

> **DRAFT — FOR FOUNDER REFINEMENT — USE ACTUAL NUMBERS WHERE INDICATED**

**ZAAHI — The Sovereign Real Estate OS for UAE**
**Executive Summary | 2026-04-21**

**The Opportunity.** Dubai's real estate market recorded AED 682.6 billion in transaction volume in 2025 with 215,060 sales transactions — an 18% YoY increase. Q1 2026 alone logged AED 252 billion, tracking toward AED 1 trillion annualised. Yet the industry remains fragmented: DLD, RERA, DDA and developers operate in silos; AI adoption is nascent; and foreign buyers navigate 10+ disconnected tools to complete a single transaction. **The first platform to unify this market wins a generational opportunity.**

**The Product.** ZAAHI is a single-platform real estate operating system with a 10-year architecture: 85 integrated modules across 12 blocks (Assets, Participants, Transactions, Technology, Infrastructure, Finance, Development, Governance, Intelligence, Ecosystem, Access, Operations). Live today at **zaahi.io** with 114 parcels, 556,000 PMTiles-covered plots across UAE + Oman, a 3-tier ambassador network (SILVER / GOLD / PLATINUM) already generating platform fees, the Archibald AI agent, and a 3D signature visualization that is unmatched in the region.

**The Traction.** Platform in production since 2026. 18 pages, 266 API endpoints, Phase 1 user dashboards (Owner / Buyer / Broker) all live. Ambassador program paid, operational, revenue-generating. Successful investor demo 2026-04-17 led to your commitment letter.

**The Business Model.** Two revenue lines:
1. **Platform (long-horizon):** 2% ZAAHI service fee on transactions; tiered ambassador memberships; SaaS subscriptions (broker, developer, owner); AI-agent premium access; eventual data licensing. 21 revenue streams architected in Master Tree.
2. **Agency (near-term cash):** standard 2% brokerage commission on Al Jurf plots and off-plan units — gives immediate cash flow and market signal.

**The Moat.** (1) 85-section Master Tree architecture — defensibly broad scope. (2) 3D ZAAHI Signature visualization — founder-designed, unique. (3) Ambassador 3-tier network with revenue-aligned flywheel. (4) Founder domain depth: Zhan 17 years RE + full-stack engineer; Dymo 18+ years global operations + Dubai RE since 2018. (5) Self-sovereignty roadmap — migration path to own data centres, own AI, own blockchain validators — unique strategic position in UAE proptech.

**The Team.** **Zharkyn (Zhan) Ryspayev**, Founder & CEO/CTO, built the entire platform. **Dmytro (Dymo) Tsvyk**, Co-founder, Ambassador and Guardian Partner, leads commercial operations. Both RERA-licensed; both Dubai-based.

**The Ask.** AED [X] investment for 10% equity via Post-Money SAFE, convertible at priced Series Seed. Use of funds: senior engineering hires, Al Jurf office expansion, platform Master Tree Phase 1 (Residential, Off-Plan), legal + regulatory compliance, 18-month runway to Series Seed. Silent investor, observer rights, quarterly reporting.

**Next milestones (18 months):**
- Month 3: first AED 1M in agency revenue
- Month 6: Master Tree §02 Residential + §08 Off-Plan live; first major broker/developer SaaS pilot
- Month 12: Series Seed AED 5–10M; blockchain audit-trail live; Abu Dhabi office scaling
- Month 18: break-even on platform ops; expansion into Saudi Arabia and Oman

**Contact.** zhanrysbayev@gmail.com | d.tsvyk@gmail.com | zaahi.io

---

## Appendix C — Recommended Reading & References

### Books
- **"Venture Deals" by Brad Feld & Jason Mendelson** — canonical term-sheet reference; every founder reads this before signing.
- **"The Lean Startup" by Eric Ries** — frames Master Tree's phased roll-out.
- **"Secrets of Sand Hill Road" by Scott Kupor (Andreessen Horowitz)** — VC perspective on founder-investor dynamics.
- **"Zero to One" by Peter Thiel** — monopoly vs competition thinking; relevant for Master Tree positioning.
- **"Good to Great" by Jim Collins** — founder discipline + execution discipline.

### UAE-specific
- **ADGM Rulebook** — adgm.com/rulebook
- **VARA Rulebook** — rulebooks.vara.ae (for blockchain components per BLOCKCHAIN_DEEP_DIVE.md Option A)
- **DLD eServices** — dubailand.gov.ae/en/eservices
- **RERA Licensing** — dubailand.gov.ae/en/eservices/real-estate-activity-license
- **UAE Federal Tax Authority** — tax.gov.ae
- **DIFC business setup guides** — difc.ae/setup

### Tools to use
- **Figma** — pitch deck + one-pager
- **Google Sheets / Excel** — financial model
- **Notion or Linear** — founder / team task management
- **DocuSign / UAE Pass** — digital signatures (Federal Decree-Law 46/2021 grants wet-ink equivalence)
- **Juro or Ironclad** — contract lifecycle management (as Company scales)
- **Xero / Zoho Books / QuickBooks** — accounting from day 1
- **goAML** — mandatory for RE AML reporting
- **Cooley GO Y Combinator SAFE Generator** — cooleygo.com; free SAFE template generator

### YC templates (free, industry standard)
- Y Combinator SAFE documents: [https://www.ycombinator.com/documents](https://www.ycombinator.com/documents)
- YC post-money SAFE primer: [https://www.ycombinator.com/assets/ycdc/Primer for post-money safe v1.1](https://www.ycombinator.com/assets/ycdc/Primer%20for%20post-money%20safe%20v1.1-2af8129e12effd9638eeab383b7309142c8f415e5cdb0bc210d573f779177a1c.pdf)

---

## Sources

- [ADGM Tech Startup Licence — 10leaves guide](https://10leaves.ae/publications/difc/difc-adgm-tech-startup-licenses)
- [DIFC vs ADGM business setup comparison 2026](https://freezonecompare.com/compare/difc-vs-adgm/)
- [DIFC Business Setup Process, Costs & Requirements 2026 (Kayrouz & Associates)](https://www.kayrouzandassociates.com/insights/difc-business-setup)
- [Shareholder Agreements in UAE — Inlex Partners](https://inlex-partners.com/blog/shareholder-partnership-agreements/)
- [Shareholder Agreements in the UAE — Virtuzone](https://virtuzone.com/blog/shareholder-agreement/)
- [Why DIFC/ADGM SPVs Are Changing Global Investor UAE Property Holding](https://paolovolani.com/difc-adgm-spv-uae-property-investment/)
- [Huspy Series B $59M — FintechNews MENA](https://fintechnews.ae/26771/fintechdubai/huspy-raises-59m-series-b-expansion/)
- [Property Finder $170M funding round](https://www.onlinemarketplaces.com/articles/property-finder-secures-170m-as-uae-sovereign-funds-increase-exposure/)
- [Uber Careem $3.1B acquisition announcement](https://www.uber.com/newsroom/uber-careem/)
- [Careem $400M spinout to e&](https://www.cnbc.com/2023/04/10/uber-owned-careem-launches-spinout-with-400-million-investment-from-uaes-e.html)
- [Y Combinator SAFE financing documents](https://www.ycombinator.com/documents)
- [YC post-money SAFE primer v1.1](https://www.ycombinator.com/library/6m-understanding-safes-and-priced-equity-rounds)
- [SAFE Note definition & calculation (Wall Street Prep)](https://www.wallstreetprep.com/knowledge/safe-note/)
- [Al Tamimi & Company — leading corporate law MENA](https://www.tamimi.com/)
- [Law firm fee ranges UAE 2026](https://ahli-law.com/lawyers-charge-in-the-uae/)
- [Dubai RE brokerage 100% foreign ownership 2023+ (Avyanco)](https://avyanco.com/news/real-estate-company-license-with-100-foreign-ownership/)
- [Cost of opening RE brokerage Dubai 2026 (Shuraa)](https://www.shuraa.com/what-is-the-cost-of-opening-a-real-estate-brokerage-in-dubai/)
- [DLD Real Estate Activity Licence eService](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/)
- [DLD Licensed Real Estate Brokers database](https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/)
- [RERA Broker Card — not transferable between companies](https://movingo.ae/blog/real-estate-practice-card-in-dubai)
- [Venture capital investments UAE process (Lexology)](https://www.lexology.com/library/detail.aspx?g=5f195fb4-46c8-40a9-80ac-6a38352ed056)
- [Preferred and structured equity in UAE & KSA (White & Case)](https://www.whitecase.com/insight-alert/preferred-and-structured-equity-uae-and-saudi-arabia-key-opportunities-and-issues)
- [UAE Corporate Tax 2026 guide](https://diac.ae/blog/uae-corporate-tax-guide/)
- [UAE VAT registration threshold AED 375k](https://www.cleartax.com/ae/vat-in-uae)
- [UBO declaration UAE — Cabinet Resolution 109/2023](https://www.dubaibusinessservices.com/beneficial-owner-ubo-in-uae/)
- [UAE Compliance Calendar 2026 — ESR + VAT + CT deadlines](https://movingo.ae/blog/tax-and-compliance-calendar-for-uae-business)
- [Dubai RE market Q1 2026 — AED 252B transactions (Gulf News)](https://gulfnews.com/business/property/dubai-real-estate-transactions-jump-31-to-dh252b-in-q1-2026-1.500501756)
- [Dubai RE 2025 full-year — 215,060 sales AED 682.6B](https://famproperties.com/dubai-real-estate-performances)
- [PropTech Pitch Deck Strategies — Qubit Capital](https://qubit.capital/blog/proptech-pitch-deck-best-practices)
- [PropTech pitch deck template — Slidebean](https://slidebean.com/templates/proptech-pitch-deck-template)
- [Venture Capital legal UAE — Crimson Legal](https://www.crimson-legal.com/venture-capital-legal-uae-2/)

---

**End of research document.**

Next step: founder reviews this document, makes the three decisions in §8.7, and engages recommended counsel. Follow-up artefacts (pitch deck, exec summary draft, term sheet draft) can be produced by Claude on request once founder has validated this framework.
