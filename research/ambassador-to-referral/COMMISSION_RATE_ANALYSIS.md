# Commission rate analysis — single-tier referral program for ZAAHI

**Branch:** `research/ambassador-to-referral`
**Date:** 2026-04-30
**Status:** Research / decision-support only. Phase B (implementation) blocked on founder choice.

---

## TL;DR (read this first)

**Recommendation: 20 % of ZAAHI Service Fee, paid lifetime per closed referred deal, rolled out at this single rate from day one.**

| | |
|---|---|
| Why 20 % and not 25 %  | Industry-anchored (US standard 25 %, Dubai broker-to-broker 25-50 %, PropTech affiliate 15-40 %), but 5 pts below the anchor — gives ZAAHI a defensible margin buffer that legal / investors / replatforming all benefit from. Still substantially above the PropTech affiliate floor (15 %), so the program reads as "premium vetted referral" not "consumer affiliate". |
| Why 20 % and not 15 %  | At 15 %, on a typical 100 M AED off-plan deal the referrer earns 300 k AED — competitive against doing it themselves through a licensed brokerage where they would clear 25 % × 2 M = 500 k. At 20 %, they earn 400 k — the gap shrinks enough that ZAAHI's leverage (no license, no chasing buyers, no contracts) wins. |
| Why flat, not tiered or hybrid  | Simpler explanation = higher signup conversion. Tiered-by-deal-size and milestone-bonus structures both score higher on theoretical optimisation but lower on legal-defensibility ("this is a software referral, not graduated brokerage commission") and lower on referrer comprehension. Optimise for adoption first; revisit the structure in Phase 2 once we have ≥ 100 closed referred deals of attribution data. |

**Y1 / Y5 P&L impact at 20 %, base scenario** (10 deals avg 50 M Y1 → 400 deals avg 100 M Y5, 30 % referral attribution): **Y1 ≈ 600 k AED commission cost · Y5 ≈ 48 M AED**, equal to ~6 % of Y5 Service Fee revenue.

**Top risk: RERA exposure.** Paying unlicensed individuals a commission denominated as a percentage of a real-estate transaction can be re-characterised as unlicensed brokerage activity. Mitigation requires structuring the fee in contract as "platform referral fee for software customer acquisition" — not as a share of brokerage commission. **Founder must legal-review before launch; this is not a research-doc decision.**

---

## 1. What is ratified (do not re-litigate)

Per founder direction 2026-04-18:

- 3-tier MLM (Silver/Gold/Platinum + USDT membership) → **retired** (replaced)
- New model: **single-tier**, **free signup**, **no subscription**
- Commission is paid out of **2 % ZAAHI Service Fee**
- **Lifetime attribution** (referrer earns on every future closing the referred user makes, with no expiry)
- Payout minimum: **1,000 AED**
- Payout SLA: **within 30 days of closing**
- **No self-referral** (anti-cycle, anti-fraud)

**Open: the % of Service Fee paid to the referrer.** This document analyses options for that single number.

---

## 2. Methodology

1. Survey of comparable referral / affiliate / broker-referral programs (Dubai-specific + global).
2. Unit-economics calculation on representative ZAAHI deal sizes (50 M, 100 M, 200 M, 500 M AED).
3. P&L impact across Y1-Y5 under three volume scenarios (low / base / aggressive).
4. Sensitivity analysis on referral-attribution share, average deal size, and closing rate.
5. Risk classification (regulatory / tax / financial / strategic).
6. Recommendation + rationale.

All AED figures are gross of 5 % VAT unless stated. Service Fee = 2 % of agreed deal value, frozen at `DEAL_COMPLETED`.

---

## 3. Industry benchmarks

### 3.1 US / global real-estate broker-to-broker referrals

- **Industry standard: 25 % of gross commission** earned by the receiving agent (theclose.com; housingwire.com; givereferrals.com).
- **Typical range: 20-35 %**, with 25 % being the published baseline. Lower end (20 %) for high-volume relationships; upper end (35 %) for retiring agents handing off books of business.
- Negotiable but always explicit in writing. Form-mediated in jurisdictions that require it.

### 3.2 Dubai-specific real-estate referrals

- **Standard residential commission: 2 % of sale price** (gaiarealty.ae; propertyfinder.ae).
- **Broker-to-broker referrals: 25 % to 50 %** of total commission (gaiarealty.ae).
- **Off-plan dedicated referral programs: up to 80 %** of sales commission for certain projects (gaiarealty.ae; propphy.com).
- **All commissions subject to 5 % VAT** under UAE law (bayut.com; propertyfinder.ae).
- **RERA disclosure obligation**: commission arrangements must be disclosed in writing to all parties; Form I formalises commission split between cooperating agents (drivenproperties.com).

### 3.3 PropTech / SaaS affiliate programs

- **General SaaS affiliate range: 10-30 %**; top-tier programs (≥ 1 M USD ARR) average **24.5 %** (rewardful.com).
- **Real-estate-specific affiliate platforms: 5-15 %** — lower because attribution is one-touch and lead quality is unvetted.
- **Outliers**: HomeSage.ai pays up to 40 % recurring (homesage.ai); newer platforms 15-40 % to bootstrap partner networks.
- **Median for newer PropTech: 20-25 %** (rewardful.com; getlasso.co).

### 3.4 Synthesis

| Comp set | Observed range | Median / standard |
|---|---|---|
| US broker-to-broker | 20-35 % | **25 %** |
| Dubai broker-to-broker | 25-50 % | **35 %** (but with 25 % seen on consumer referral programs) |
| PropTech affiliate (general) | 5-40 % | 15-25 % |
| SaaS affiliate (top-tier) | 10-30 % | **24.5 %** |
| Real-estate-only affiliate | 5-15 % | 10 % |

**ZAAHI's referrer profile** sits between "broker handing off vetted lead" and "satisfied user telling a friend" — closer to the former than the latter (the referred user is signing up to transact 50 M+ AED on the platform, not buying a 50 AED SaaS subscription). Industry-anchor that fits is **20-25 %**, biased toward the lower end because referrers do not hold RERA licenses and are not bearing brokerage liability.

---

## 4. Options on the table

Five candidates, evaluated below. A, B, C are the founder-suggested fixed rates. D and E are research-suggested alternatives.

### Option A — Flat 25 % of Service Fee
- Industry-aligned with US broker referral standard.
- Highest payout to referrer per deal → strongest acquisition incentive.
- Highest cost to ZAAHI; most exposure to RERA re-characterisation risk (mirrors brokerage commission ratios).

### Option B — Flat 20 % of Service Fee
- Slightly below industry anchor. Reads as "competitive but not aggressive".
- Clean number for marketing copy ("earn 20 % for life on every deal you refer").
- Defensible vs. legal review: not a 1:1 mirror of brokerage commission.

### Option C — Flat 15 % of Service Fee
- At the low end of competitive PropTech affiliate.
- Lowest cost to ZAAHI, largest margin buffer.
- Risk: under-motivates referrers vs. the alternative of becoming a licensed broker themselves (where they could earn the full broker commission of 2 %, of which 25 % is 0.5 % vs. ZAAHI's 15 % × 2 % = 0.30 %).

### Option D — Tiered by deal size (research-suggested)
**25 % on Service Fee for deals < 100 M AED · 15 % for deals 100-500 M · 10 % for deals > 500 M.**

- Caps payout on whales while keeping competitive incentive on the mainstream-deal segment.
- Rationale: marginal effort to refer a 500 M whale is not 5× the effort of a 100 M deal, but flat-rate would pay 5×. Tiering corrects the asymmetry.
- Drawback: **harder to explain** in landing-page copy. Conversion-rate hit on signup likely outweighs unit-economics gain at early scale.
- Drawback: invites perception of bait-and-switch ("you said 25 %, but my deal is 500 M, why am I getting 10 %?"). Need defensible, prominent disclosure.
- More legally defensible than flat 25 % — graduated rates de-coupled from a single brokerage-commission ratio.

### Option E — Hybrid base + activity bonus (research-suggested)
**Base 15 % of Service Fee on every deal · +5 % bonus rate (= 20 % total) once the referrer has 5+ closed referred deals in any rolling 12-month window.**

- Self-selects committed referrers (not one-shot affiliates).
- Lower introductory rate at signup ("up to 20 %" headline, "starts at 15 %" fine print) — softer optical commitment.
- Drawback: **complex to explain, complex to compute, complex to dispute.** Adds a dimension to the data model (rolling-window aggregations on Commission table).
- Drawback: punishes the 1-deal referrer who happens to bring in a whale — bad word-of-mouth risk.
- Best use case: post-Phase-2 optimisation once we have steady-state data.

---

## 5. Unit economics — payout per deal

ZAAHI Service Fee = 2 % of agreed deal value. Commission = (rate) × Service Fee. All figures AED, gross of VAT.

| Deal value | Service Fee (2 %) | A. 25 % | B. 20 % | C. 15 % | D. Tiered | E. Hybrid (base 15 %) |
|---:|---:|---:|---:|---:|---:|---:|
| 50 M | 1.0 M | 250,000 | 200,000 | 150,000 | 250,000 | 150,000 |
| 100 M | 2.0 M | 500,000 | 400,000 | 300,000 | 300,000 | 300,000 |
| 200 M | 4.0 M | 1,000,000 | 800,000 | 600,000 | 600,000 | 600,000 |
| 500 M | 10.0 M | 2,500,000 | 2,000,000 | 1,500,000 | 1,000,000 | 1,500,000 |
| 1 B (off-plan whale) | 20.0 M | 5,000,000 | 4,000,000 | 3,000,000 | 2,000,000 | 3,000,000 |

**Reading:** Option D caps the whale payout at 2 M (vs 5 M flat 25 %) — protects ZAAHI margin on the long tail. Option E matches Option C on first deals; it only diverges from C after the 5-deal threshold and equals B from then on.

### 5.1 Referrer's competitive baseline

A referrer's outside option is to become a RERA-licensed broker themselves (cost ~9-12 k AED, ~3 weeks of training + exam) and capture the full 2 % broker commission. On a 100 M deal that's 2 M AED gross, of which they keep typically 50-70 % after agency split = 1-1.4 M AED.

For the referral path to dominate that outside option, ZAAHI must offer a payout that beats `(broker commission × keep ratio) - (effort of brokering)`. The "effort of brokering" includes chasing the buyer, doing inspections, handling RERA forms, taking liability — substantial. Empirically, casual referrers (lawyers, accountants, satisfied owners) are willing to take **≤ 40-50 %** of what a full broker would clear, in exchange for not doing the work and not bearing the liability.

| Rate option | Payout on 100 M deal | % of broker-equivalent clear (assume 1 M AED) |
|---|---:|---:|
| A. 25 % | 500 k | **50 %** |
| B. 20 % | 400 k | **40 %** |
| C. 15 % | 300 k | **30 %** |
| D. Tiered (15 % at 100 M) | 300 k | 30 % |
| E. Hybrid base 15 % | 300 k | 30 % |

Options A and B sit cleanly in the 40-50 % "casual referrer accepts this" band. Options C, D, E sit at 30 % — borderline. At < 30 % the program risks being ignored.

---

## 6. P&L scenarios Y1-Y5

### 6.1 Volume assumptions

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Total closed deals (low) | 5 | 15 | 40 | 100 | 200 |
| Total closed deals (base) | 10 | 30 | 80 | 200 | 400 |
| Total closed deals (aggr.) | 20 | 60 | 150 | 400 | 800 |
| Avg deal size (low / base / aggr.) | 50 M | 75 M | 100 M | 100 M | 100 M |
| Referral attribution share | 30 % | 30 % | 30 % | 30 % | 30 % |

Attribution share = of all closed deals, fraction where the buyer was introduced by an active referrer. 30 % is a moderate assumption for a marketplace that is invested in the program; 50 %+ would be ambitious.

### 6.2 Service Fee revenue (base scenario)

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---:|---:|---:|---:|---:|
| Total volume (AED) | 500 M | 2.25 B | 8 B | 20 B | 40 B |
| Service Fee @ 2 % | 10 M | 45 M | 160 M | 400 M | 800 M |
| Referred-deal Service Fee (30 %) | 3 M | 13.5 M | 48 M | 120 M | 240 M |

### 6.3 Commission cost by option (base scenario, 30 % attribution)

| | Y1 | Y2 | Y3 | Y4 | Y5 | Y5 % of Service Fee |
|---|---:|---:|---:|---:|---:|---:|
| A. Flat 25 % | 750 k | 3.4 M | 12 M | 30 M | 60 M | **7.5 %** |
| **B. Flat 20 %** | **600 k** | **2.7 M** | **9.6 M** | **24 M** | **48 M** | **6.0 %** |
| C. Flat 15 % | 450 k | 2.0 M | 7.2 M | 18 M | 36 M | 4.5 % |
| D. Tiered (mix-weighted ~17 %) | 510 k | 2.3 M | 8.2 M | 20 M | 41 M | 5.1 % |
| E. Hybrid (≈ 17 % blended) | 510 k | 2.3 M | 8.2 M | 20 M | 41 M | 5.1 % |

D and E converge on roughly 17 % blended once steady-state mix is reached (assuming ~50 % of referred-deal volume comes from referrers who eventually hit the 5-deal threshold or from < 100 M deals). Effective rates differ by < 1 pt between D and E in steady state — not enough to choose between them on cost alone.

### 6.4 Aggressive scenario (sanity check)

If volumes 2× the base and avg deal size lifts to 150 M Y5, Y5 commission cost at 20 % becomes ~144 M AED. That's still 6 % of an aggressive-scenario Y5 Service Fee revenue of 2.4 B AED. The cost-as-fraction-of-revenue is invariant to scale; what matters is the ratio.

---

## 7. Sensitivity analysis

### 7.1 Closing-rate sensitivity

If only 50 % of "expected to close" deals actually close in the year, **revenue halves and commission halves in lockstep** — both are post-closing. **Cost-as-% of revenue is unchanged.** The closing-rate variable does not stress the rate decision; it stresses cash-flow timing.

### 7.2 Attribution-share sensitivity (this is the real risk)

| Attribution share | Y5 commission (flat 20 %) | Y5 % of Service Fee |
|---:|---:|---:|
| 10 % | 16 M | 2.0 % |
| 20 % | 32 M | 4.0 % |
| **30 % (base)** | **48 M** | **6.0 %** |
| 50 % | 80 M | 10.0 % |
| 70 % | 112 M | 14.0 % |

If the referral program drives the majority of deals (50 %+), the rate matters significantly. At 70 % attribution, 20 % rate consumes 14 % of revenue — still healthy but worth modelling against alternative rates:

| Rate at 70 % attribution | Y5 commission | Y5 % of Service Fee |
|---:|---:|---:|
| 25 % | 140 M | 17.5 % |
| **20 %** | **112 M** | **14.0 %** |
| 15 % | 84 M | 10.5 % |

**At 70 % attribution and 25 % rate, commissions take 17.5 % of revenue** — still investor-defensible (real-estate marketplaces routinely run 15-25 % marketing/sales-as-% of revenue), but tight enough to flag as a sensitivity. At 20 % rate this drops to 14 % — clear margin.

### 7.3 Whale-skew sensitivity

If referred deals are systematically larger than non-referred (referrers tend to introduce HNW peers), avg deal size on the referred slice could be 1.5-2× the platform average. Effect on cost: linear, ratio invariant. Effect on _referrer concentration risk_: real (a single whale-referrer earning 5 M AED in one deal creates concentration in commissions payable). Tiered (Option D) is the only structure that mitigates this directly.

---

## 8. Top 3 risks

### 8.1 RERA / unlicensed brokerage exposure (REGULATORY · CRITICAL)

**Description.** UAE Federal Law and Dubai Executive Council resolutions regulate "real estate brokerage activity". Practising real-estate brokerage without a RERA license is a regulatory violation; both the unlicensed individual and any party engaging them are liable (egsh.ae; godubai.estate).

**Where ZAAHI's referral program brushes up against this.** A program that pays a non-licensed individual a percentage of a real-estate transaction's value — denominated in a way that mirrors brokerage commission ratios (e.g. "25 % of the 2 % commission") — can plausibly be re-characterised by a regulator as commission-sharing with an unlicensed broker.

**Mitigation strategy.** Structure the legal basis of the fee as **a software customer-acquisition payment**, not a share of a brokerage commission:

- The fee is paid by ZAAHI (the platform) to the referrer for "introducing a new user to the ZAAHI platform" (a software service), not for "broking a property transaction".
- The fee amount is _calculated_ as a percentage of the platform's Service Fee — but the legal characterisation is software-referral, not brokerage-referral.
- The user agreement (referrer's T&Cs) must explicitly prohibit the referrer from acting as a broker, agent, or intermediary in any transaction; ZAAHI provides the brokerage activity.
- Include an explicit no-RERA-license-required statement in the program T&Cs, with legal sign-off.
- Alternative framing: cap the absolute AED amount per individual referrer per year so the total never approaches a broker's annual income (signals "this is not their job").

**This requires UAE counsel sign-off before launch.** A research doc cannot resolve it. Flag and escalate.

### 8.2 VAT and tax treatment (TAX · MODERATE)

**Description.** UAE 5 % VAT applies to brokerage commission. Treatment for referral fees paid by a platform to individuals is grey: depending on the legal characterisation (see 8.1), the payment may or may not be VATable. If the referrer is a UAE-resident individual not registered for VAT (most are not — the threshold is 375 k AED annual turnover), no VAT obligation arises on the receipt side, but ZAAHI's expense treatment differs case to case.

**Mitigation.**
- Structure the contract so the AED amount stated _is_ the gross-to-referrer amount; ZAAHI absorbs any VAT-equivalent on its own books.
- For corporate-entity referrers (RERA-licensed brokers who choose to participate as referrers rather than as primary agents), require a tax invoice with VAT line — pay them gross-of-VAT.
- Annual review with UAE tax counsel; monitor Federal Tax Authority guidance for updates on platform-economy referral payments.

### 8.3 Investor perception of "% of revenue going to referrers" (FINANCIAL · MODERATE)

**Description.** SaaS-style investor underwriting of real-estate marketplaces benchmarks "sales & marketing as % of revenue" against comparable PropTech businesses. Industry-standard benchmark for early-stage marketplaces is 20-30 % S&M-as-% of revenue, declining to 10-15 % at maturity (Finro PropTech valuation report 2025).

**At 20 % rate × 30 % attribution = 6 % of Service Fee** going to referrers. Adds to other S&M (paid acquisition, content, brand) which would otherwise total ~10-15 %. **Total S&M-as-% of revenue lands in the 16-21 % range — well within investor benchmark.**

At 25 % rate × 30 % attribution = 7.5 %. Still healthy but closer to the upper bound. At 25 % rate × 50 % attribution = 12.5 % — that's the level at which an investor will start asking pointed questions.

**Mitigation.** Pick a rate that keeps total S&M < 25 % of revenue across the modelled scenarios. **Option B (20 %) keeps that constraint comfortably; Option A (25 %) only does so if attribution stays moderate.**

---

## 9. Recommendation

**Option B — flat 20 % of ZAAHI Service Fee, lifetime per closed referred deal, single rate at launch.**

### 9.1 Why 20 %

1. **Market-competitive without being market-leading.** 20 % sits 5 pts below the US broker-to-broker industry standard (25 %), within the SaaS top-tier affiliate band (24.5 % median), and substantially above the real-estate-only affiliate floor (10-15 %). Reads as "premium vetted referral program" without paying premium-vetted-referral cost.

2. **Defensible in legal review.** The 5-pt gap below 25 % means we are not 1:1-mirroring the published broker-to-broker referral ratio. That gap supports the legal characterisation of the fee as a software-referral payment, not a brokerage-commission share.

3. **Investor-defensible at scale.** At 30 % attribution (base case), total S&M-as-% of revenue stays below 20 % through Y5. At 70 % attribution stress-test, it stays below 20 % too. No future awkward-conversation risk on the cap table.

4. **Referrer-compelling.** On a 100 M AED deal the referrer earns 400 k AED — 40 % of what they would clear by becoming a licensed broker themselves. That's the empirical "casual referrer accepts this" band; below 40 % (i.e. at < 20 % rate) the program starts being ignored.

5. **Operationally simple.** Single number, single calculation, no rolling-window aggregations, no tier thresholds, no "actually, your deal qualified for the lower tier" disputes. Lower implementation cost in the Commission table. Higher signup conversion. Easier to explain to a new user in 30 seconds.

### 9.2 What we are explicitly not recommending and why

- **Not Option A (25 %).** Mirrors the broker-to-broker ratio too precisely; weaker legal-characterisation defence; tightens investor margin at higher attribution shares without buying meaningful additional referrer motivation (the marginal referrer doesn't sign up at 25 % when they wouldn't at 20 %).
- **Not Option C (15 %).** Underpays the casual-referrer-accept band. Risks low program uptake. The 5-pt cost saving over 20 % is real (Y5 ~12 M AED) but is purchased at the price of the program working at all.
- **Not Option D (tiered).** Best on theoretical cost-cap. Worst on signup-conversion and on dispute risk. Revisit only after we have ≥ 100 closed referred deals of attribution-by-size data to validate the threshold choice.
- **Not Option E (hybrid base + bonus).** Punishes the 1-deal whale-referrer; rewards the high-volume retail-referrer. Wrong incentive direction for ZAAHI's deal-size distribution. Adds data-model complexity for marginal savings.

### 9.3 Phase B follow-up (when founder approves)

If the founder accepts 20 %:

1. **Legal review** with UAE counsel on RERA characterisation. Document the legal-basis framing in the user T&Cs. Block launch until cleared.
2. **Revise `src/lib/ambassador.ts`** constants: replace `PLAN_COMMISSION_RATES` with a single `REFERRAL_RATE = 0.20`. Drop tier-aware logic. Remove `MAX_LEVEL` (or set to 1).
3. **Schema migration** (Prisma): drop `AmbassadorApplication`, drop tier-related fields from `User`, simplify `Commission` to single-level. Migration name: `single_tier_referral`.
4. **Routes**: `/join` is no longer payment-gated; becomes a simple "create account, copy referral link" flow. `/ambassador` renamed to `/refer` (or kept for continuity at founder discretion).
5. **CLAUDE.md update**: replace the Ambassador Program block with a simpler Referral Program block.
6. **Re-test** the commission lifecycle (`PENDING` → `PAID` / `REVERSED`) end-to-end on a deal flow.
7. **Rate review** scheduled at 12 months post-launch with ≥ 100 referred-deal sample; revisit Options A / D / E with real attribution data instead of assumptions.

---

## 10. Summary table for founder decision

| | A. 25 % | **B. 20 %** | C. 15 % | D. Tiered | E. Hybrid |
|---|---:|---:|---:|---:|---:|
| Y5 commission cost (base) | 60 M | **48 M** | 36 M | 41 M | 41 M |
| Y5 % of Service Fee | 7.5 % | **6.0 %** | 4.5 % | 5.1 % | 5.1 % |
| Referrer payout on 100 M deal | 500 k | **400 k** | 300 k | 300 k | 300 k |
| RERA exposure | High | **Moderate** | Low | Low | Low |
| Referrer motivation | Strong | **Strong** | Borderline | Borderline | Borderline |
| Implementation complexity | Low | **Low** | Low | Medium | High |
| Investor perception | Aggressive | **Healthy** | Conservative | Healthy | Complex |
| **Score (subjective)** | 7/10 | **9/10** | 6/10 | 7/10 | 6/10 |

---

## 11. Sources

All accessed 2026-04-30.

- Gaia Realty (Dubai). "How Real Estate Commission Structures Work in Dubai and the UAE." [https://www.gaiarealty.ae/blog/real-estate-agent-commission-structures-how-much-do-agents-really-make]
- Propphy. "Real Estate Referral Fees Guide 2026 for Agents." [https://www.propphy.com/blog/real-estate-referral-fees-guide-2026]
- Property Finder. "How Much Is Real Estate Commission in Dubai? Official Rates for Rent, Purchase, and Off-Plan." [https://www.propertyfinder.ae/blog/how-much-is-real-estate-commission-dubai/]
- Bayut Agent Portal. "All about real estate commissions in Dubai." [https://www.bayut.com/agentportal/demystifying-real-estate-commissions-in-dubai-who-pays-and-how-much/]
- Driven Properties. "Everything You Need to Know About RERA." [https://www.drivenproperties.com/blog/everything-you-need-to-know-about-rera]
- GoDubai Portal. "Dubai Real Estate Regulations for Brokers — DLD & RERA Rules." [https://www.godubai.estate/broker-hub/dubai-real-estate-regulations-for-brokers-dld-rera-rules/]
- EGSH. "RERA Broker License in Dubai." [https://egsh.ae/services/rera-broker-license]
- The Close. "The Complete Guide to Real Estate Referral Fees 2026." [https://theclose.com/real-estate-referral-fees/]
- HousingWire. "Real Estate Referral Fees: The Ultimate Guide for 2026." [https://www.housingwire.com/articles/real-estate-referral-fees/]
- General Referral. "Referral Fees: a Guide for Real Estate Agents." [https://www.generalreferral.com/blog/referral-fees]
- GiveReferrals. "Real Estate Referral Fees: 25% Standard Rate & How to Calculate." [https://www.givereferrals.com/post/real-estate-referral-fees]
- Rewardful. "SaaS Affiliate Program Benchmarks by Industry (2025 Report)." [https://www.rewardful.com/articles/saas-affiliate-program-benchmarks]
- HomeSage AI. "Earn Up To 40 % Commission: Why Join This Real Estate Platform's Affiliate Program In 2025." [https://homesage.ai/earn-up-to-40-commission-real-estate-affiliate-program/]
- Finro Capital. "Proptech Valuation Multiples: 2025 Insights & Trends." [https://www.finrofca.com/news/proptech-valuation-multiples-2025]
- Qubit Capital. "PropTech SaaS Benchmarks: Churn Rate." [https://qubit.capital/blog/proptech-saas-kpi-benchmarks]
- Get Lasso. "23 Best Real Estate Affiliate Programs — 2025 Commission Rates." [https://getlasso.co/niche/real-estate/]

---

## 12. Scope flags

- This document is research-only. No code, schema, or canonical-doc changes were made.
- All AED figures are scenario-modelled, not committed forecasts.
- All regulatory characterisation in §8.1 requires UAE counsel sign-off before any program goes live.
- Phase B (implementation) is gated on founder choice from §10.

**End of analysis. PAUSE for founder decision.**
