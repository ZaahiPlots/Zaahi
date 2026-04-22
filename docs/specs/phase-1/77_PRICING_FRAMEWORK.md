# §77 Pricing Framework — Minimum Floors + Runtime Configurability

**Status:** DRAFT v1.1 · 2026-04-22 — **founder ratifications R-5 · R-6 · R-7 · R-8 incorporated**
**Supersedes:** v1.0 DRAFT (2026-04-22, commit `1dfbdcf`)
**Parent:** `docs/architecture/77_WEB_PLATFORM_ARCHITECTURE.md` v1.2 (D-16 Pricing philosophy · D-17 Floors ratified · D-18 Enterprise deal-fee hard floor 0.15% · D-19 annual-prepay 10% · D-20 Ambassador opt-out compensation)
**Depends on:** Spec 02 v1.1 Invoice (commit `0caf9de` · Tax Invoice PDF pipeline) · Spec 03 v2.0 Admin §14 (commit `0cd6542` · Super-Admin governance)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Classification:** CONFIDENTIAL
**Prepared by:** Agent · Opus 4.7 · 2026-04-22
**Prepared for:** Zhan (Founder) · Dymo (Ops) · Rudi (Board)
**Preserves:** `MASTER_TREE_final.md` canonical untouched · `src/**` · `prisma/schema.prisma` read-only (schema described illustratively, not applied).

**v1.1 change log (2026-04-22 founder ratifications):**
- **R-5 · D-7/D-8/D-9 elevated from Agent-recommendation to FOUNDER-RATIFIED.** Launch + scale floors locked: Starter AED 1 000 / 700 · Pro AED 3 000 / 2 500 · Enterprise AED 22 000 / 20 000 + 0.25% deal fee · Custom AED 40 000+.
- **R-6 · D-10 tightened.** Enterprise deal-fee hard floor raised from 0.10% → **0.15%** (0.10% unprofitable per §2 math).
- **R-7 · new D-16.** Annual-prepay discount 10% default across all tiers · applied to monthly fee only, not deal fee.
- **R-8 · new D-17 + new §3.6.** Enterprise Ambassador opt-out compensation: tenant choosing own Ambassador pays ZAAHI +AED 5 000/mo OR +0.05% deal fee · contract-time lock · 12-month minimum.
- **Appendix B seed values updated** to reflect ratified floors + 10% annual-prepay default across all tiers.
- **Prior pending D-16/D-17/D-18 renumbered** to D-18/D-19/D-20.

---

## §0 Purpose + scope

This document specifies:
1. The **minimum floor pricing** for §77 White-label tiers (Starter · Pro · Enterprise · Custom) grounded in honest unit-economics math.
2. The **runtime pricing architecture** — Prisma `PricingPlan` model + Super-Admin governance — enabling price changes without code deploy.
3. The **revenue model per tier** (D-17 from architecture v1.1 ratified — Pure SaaS for Starter+Pro; Hybrid SaaS + 0.25% deal fee floor for Enterprise).

**Not in scope:**
- Exact launch pricing (ratified separately at Phase 2 Month 10 based on first 3 pilot tenant negotiations).
- Marketing/pricing page design (§77_BUILD_SPEC Phase 2).
- Payment processor integration (Stripe/Paddle — per D-10 Phase 2 evaluation at 5-10 tenants).

**Target ship:** pricing architecture code ships in Phase 2 Month 10-13 tenantization cycle (per architecture v1.1 §12.3). This spec is the blueprint.

---

## §1 Philosophy

### §1.1 Why minimum floor pricing (not optimal · not aspirational)

ZAAHI is a new entrant in the UAE RE SaaS market. Competitors in this exact space are approximately zero (closest analogue: Argus Enterprise at USD 8-25 k/yr per seat — out of mid-tier broker budget). **Market-acceptance friction beats margin maximisation in Phase 1-2.**

**Why floor pricing (not mid-range, not premium):**
- **Lower barrier → faster ICP validation.** Every unit of pricing friction removed accelerates conversion from introduction → paid tenant.
- **Legacy grandfathering is cheap.** Raising prices for new tenants later does not alienate existing tenants (they stay on their original plan — see §5.3 governance).
- **Hard to lower without signal.** Cutting prices mid-lifecycle broadcasts "we misjudged demand" or "we are struggling." Once low, strategic lowering is nearly impossible without repositioning.
- **High ZAAHI gross margin long-term** absorbs floor pricing losses during ramp — MASTER_TREE_ENHANCEMENT_PROPOSAL §4 budget authorises Platform Dev Fund to cover Phase 2 investment.
- **Pilot tenants will pay a premium voluntarily** for early access — they accept higher-than-floor voluntarily for status / influence / product shaping. Floor is the floor; actual Phase 2 launch pricing can be ABOVE floor.

**Alternative philosophies considered + rejected:**
- **Premium positioning from Day 1** (Bloomberg Terminal pattern): rejected — requires market-established authority ZAAHI doesn't have yet.
- **Freemium** (Dropbox pattern): rejected — support cost on free users exceeds conversion value at mid-tier ICP; B2B SaaS freemium rarely works at this price band.
- **Per-seat pricing** (Salesforce pattern): rejected — mid-tier brokers vary 5-20 users; per-seat makes monthly bill unpredictable; tier-based is simpler.

### §1.2 Runtime configurability — prices must change without code deploy

**Drivers:**
1. **Market learning.** Phase 2 pilot pricing iterates with 3-5 tenant conversations. Hardcoding prices forces code-deploy cycle (Vercel + build + test) per change — slow + risky.
2. **Regional pricing (Phase 2+).** Saudi SAR · Kazakh KZT · UAE AED · USD for cross-border. Cannot hardcode AED-only.
3. **Per-tenant custom pricing (Enterprise).** Negotiated volume commitments · multi-year contracts · promotional discounts · grandfathering.
4. **Promotional campaigns.** Launch discount · annual-prepay discount · referral discount · partner discount.
5. **Deprecation flow.** New plans superseding old; existing tenants grandfathered on old plan while new signups default to new.

**Architectural consequence:** Prisma `PricingPlan` model (§4) + Super-Admin UI (§5) + runtime tenant-plan binding via `Tenant.currentPlanId` FK. Zero hardcoded prices anywhere in `src/**`. Billing cron reads `PricingPlan` rows at invoice-generation time.

---

## §2 Minimum floor calculation methodology

### §2.1 Cost inputs per tier (honest estimates · Phase 2 baseline)

All figures AED / month per tenant at Phase 2 launch (1-10 tenants · moderate-amortization scenario). Re-estimated §2.4 at scale.

**Infrastructure cost components:**

| Component | Unit cost | Starter (5 users · 50 listings · 5GB) | Pro (25 users · 300 listings · 50GB) | Enterprise (100 users · 1000+ listings · 500GB) |
|---|---|---:|---:|---:|
| Supabase shared DB (Team tier amortized) | $599/mo ÷ 10 tenants = $60/tenant → AED 220/tenant but actually shared = AED ~20/tenant if 30 tenants | 5-10 | 15-30 | N/A (dedicated) |
| Supabase dedicated project (Enterprise) | Team tier $599/mo | — | — | 2 200 |
| Vercel bandwidth + edge functions (Team $20/mo shared) | $20/mo → AED 74 ÷ N tenants | 5-10 | 20-60 | 50-150 |
| Anthropic API (Archibald Claude Sonnet 4.6) | Input $3/M tok · Output $15/M tok | ~4 (5 users × 20 chats × 1.5k tok) | ~50 (25 × 40 × 2k) | ~400 (100 × 60 × 2.4k) |
| Supabase Storage (`$0.021/GB-mo`) | AED 0.08/GB-mo | 0.40 (5GB) | 4 (50GB) | 40 (500GB) |
| Bandwidth egress (Vercel included mostly) | — | 5 | 30 | 150 |
| Email — Resend ($20/mo paid tier at Pro+) | Free tier 3k/mo Starter · paid tier Pro+ | 0 (free tier) | 75 | 250 |
| Monitoring / alerting (Sentry / Grafana basic) | AED 20-50 shared | 2-5 | 10-20 | 30-60 |
| Backup / DR (Supabase builtin) | Included (Team) | 0 | 0 | 50 (extra retention Enterprise) |
| **Infrastructure subtotal** | | **~20-35** | **~200-270** | **~3 170-3 300** |

**Support cost components:**

Effective blended rate for support hours = AED 300/hr (mix of Zhan at AED 500/hr for tech escalation · CoS at AED 250/hr for standard support · per Enhancement Proposal v1.2 §5.2 CoS AED 360-540 k/yr ÷ ~170 hrs/mo effective = AED 200-320/hr).

| Tier | Support hrs/mo | Support cost/mo |
|---|:-:|---:|
| Starter | ~0.5 hrs (docs-first, self-service) | 150 |
| Pro | ~2 hrs (email priority + onboarding call) | 600 |
| Enterprise | ~15 hrs (Slack Connect · dedicated Customer Success · ops) | 4 500 |

**Amortized platform dev cost:**

Phase 2 + 3 White-label build investment per architecture §12.7 = 36-57 eng-weeks × AED 14 000/wk (Zhan effective loaded rate) = **AED 500 k – 800 k one-time**. Amortize over 60 months and projected tenant count.

| Scenario | Tenant count | Amortized per tenant / month |
|---|:-:|---:|
| Launch Y2 | 10 avg | AED ~830 / mo / tenant (AED 500k / 10 / 60) |
| Y3 ramp | 30 avg | AED ~280 / mo / tenant |
| Y5 mature | 60 avg | AED ~140 / mo / tenant |
| Y10 plateau | 200+ avg | AED ~40 / mo / tenant |

**Phase 2 launch amortization is punishing** (AED 830/tenant/mo). This is why launch pricing above floor is economically necessary until tenant count crosses ~30.

### §2.2 Margin threshold + floor formula

**Industry SaaS benchmark:** 60% gross margin is the LOWER BOUND of investable SaaS. Below 60% = not a "real SaaS business" · VCs discount multiple heavily. 70-85% is where mature SaaS operates.

**ZAAHI target:** minimum floor margin = **60% (floor discipline)**. Aspirational margin at scale = **70-85%** (Y3+ when amortization drops).

**Floor formula:**
```
Floor Price = Total Cost ÷ (1 - 0.60) = Total Cost × 2.5
```
This yields exactly 60% gross margin at the floor. Any price above floor increases margin.

**Two floor variants calculated:**
1. **Scale floor** — at mature scale (60+ tenants) with negligible dev amortization. The LOWEST ZAAHI can ever charge sustainably.
2. **Launch floor** — Phase 2 Y2 (10 tenants average) with full dev amortization. This is the REALISTIC Phase 2 pricing floor.

### §2.3 Per-tier floor computation (show the math)

#### §2.3.1 Starter tier

**Cost breakdown:**
| Component | Scale | Launch |
|---|---:|---:|
| Supabase shared | 5 | 10 |
| Vercel edge | 5 | 10 |
| Archibald (5 users × 20 chats/mo × 1.5k tok) | 4 | 4 |
| Storage (5 GB) | 0.40 | 0.40 |
| Bandwidth egress | 5 | 5 |
| Email (Resend free tier) | 0 | 0 |
| Monitoring | 2 | 5 |
| Backup (included) | 0 | 0 |
| Infrastructure subtotal | **21** | **34** |
| Support (0.5 hr × AED 300) | 150 | 150 |
| Dev amortization | 40 (Y10) · 140 (Y5) · 280 (Y3) | 830 (Y2 launch) |
| **Scale total cost** (Y5+) | **~195 – 335** | — |
| **Launch total cost** (Y2, 10 tenants) | — | **~1 014** |

**Scale floor:** AED 195-335 × 2.5 = **AED 490 – 840 / month** — round to **AED 700 / month floor at scale**.

**Launch floor:** AED 1 014 × 2.5 = AED 2 535 — round to **AED 1 200 / month launch floor (partial amortization absorbed by Platform Dev Fund)** OR charge at Y3 scale floor AED 700 + 60% VC-discipline multiplier = ~**AED 1 000 / month** as a psychological AED floor.

**Recommended Starter launch price:** **AED 1 000 / month** (below full-amortization floor · absorbed by Platform Dev Fund during Y2-Y3 ramp · AED 1 000 is below psychological thousand-barrier · easy to raise to AED 1 200 · AED 1 500 later as tier matures).

#### §2.3.2 Pro tier

**Cost breakdown:**
| Component | Scale | Launch |
|---|---:|---:|
| Supabase shared | 15 | 30 |
| Vercel edge | 20 | 60 |
| Archibald (25 users × 40 × 2k) | 50 | 50 |
| Storage (50 GB) | 4 | 4 |
| Bandwidth egress | 30 | 30 |
| Email (Resend paid) | 75 | 75 |
| Monitoring | 10 | 20 |
| Backup | 0 | 0 |
| Infrastructure subtotal | **204** | **269** |
| Support (2 hr × AED 300) | 600 | 600 |
| Dev amortization | 40 (Y10) · 140 (Y5) · 280 (Y3) | 830 (Y2) |
| **Scale total cost** (Y5+) | **~844 – 1 124** | — |
| **Launch total cost** (Y2) | — | **~1 699** |

**Scale floor:** AED 844 – 1 124 × 2.5 = AED 2 110 – 2 810 → **AED 2 500 / month floor at scale**.

**Launch floor:** AED 1 699 × 2.5 = AED 4 247 → **AED 4 000 / month launch floor**.

**Recommended Pro launch price:** **AED 3 000 / month** (below full-amortization launch floor by AED 1 000/tenant · absorbed by Platform Dev Fund · psychologically accessible for mid-tier broker at mid-AED-3k/mo = ~AED 36 k/yr · easy pricing-lever increase to AED 3 500 · AED 4 000 post-pilot-validation).

#### §2.3.3 Enterprise tier

**Cost breakdown:**
| Component | Scale | Launch |
|---|---:|---:|
| Supabase dedicated project | 2 200 | 2 200 |
| Vercel edge | 50 | 150 |
| Archibald (100 users × 60 × 2.4k) | 400 | 400 |
| Storage (500 GB) | 40 | 40 |
| Bandwidth egress | 100 | 150 |
| Email (heavy Resend) | 200 | 250 |
| Monitoring + alerting | 40 | 60 |
| Compliance module amortization | 500 | 750 |
| Backup (extended retention) | 50 | 50 |
| Infrastructure subtotal | **3 580** | **4 050** |
| Support (15 hr × AED 300) | 4 500 | 4 500 |
| Dev amortization | 40 · 140 · 280 | 830 |
| **Scale total cost** (Y5+) | **~8 120 – 8 360** | — |
| **Launch total cost** (Y2) | — | **~9 380** |

**Scale floor:** AED 8 120 – 8 360 × 2.5 = AED 20 300 – 20 900 → **AED 20 000 / month floor at scale**.

**Launch floor:** AED 9 380 × 2.5 = AED 23 450 → **AED 22 000 / month launch floor**.

**Recommended Enterprise launch price:** **AED 22 000 – 25 000 / month floor** (negotiable upward based on tenant size · volume commitments · multi-year contracts · custom features). Less launch-discount for Enterprise because (a) dedicated infrastructure cost doesn't scale away, (b) Enterprise tenants accept premium pricing for dedicated infra.

**Plus Enterprise deal fee (D-17 Hybrid):** 0.25% of tenant's deal value, floor. Justification §3.3.

#### §2.3.4 Custom tier

**Bespoke · Phase 3+.** No floor specification here. Contract-time negotiation. Reference floor = Enterprise + premium (typically AED 40 000 – 100 000 / month range for sovereign-grade tenants with compliance / support / SLA requirements).

### §2.4 Sensitivity analysis — floor at different tenant counts

How minimum floor drops as scale amortizes dev cost:

| Tenant count | Dev amortization | Starter floor | Pro floor | Enterprise floor |
|:-:|---:|---:|---:|---:|
| 1 tenant | AED 8 333/mo (all on one tenant) | AED 22 000+ (not viable — won't launch with 1 tenant) | AED 25 000+ | AED 35 000+ |
| 5 tenants | AED 1 670/mo | AED 5 500 | AED 8 000 | AED 28 000 |
| **10 (Y2 launch baseline)** | **AED 830/mo** | **AED 1 200** | **AED 4 000** | **AED 22 000** |
| 30 (Y3) | AED 280/mo | AED 750 | AED 2 700 | AED 20 800 |
| 60 (Y5) | AED 140/mo | AED 625 | AED 2 475 | AED 20 350 |
| 200 (Y10 plateau) | AED 40/mo | AED 400 | AED 2 130 | AED 20 100 |

**Key insight:** Enterprise floor barely drops (dedicated Supabase cost dominates, not dev amortization). Starter/Pro floors drop meaningfully with scale. Founder should expect Starter+Pro pricing to be RAISED (not lowered) after Phase 2 launch once market pricing validates — floor protection is most useful BEFORE launch, not after.

**Pricing strategy implication:** Phase 2 launch at **launch floor** (above scale floor, below aspirational). As tenant count grows Y3 → Y5, actual margin improves (floor stays constant, costs drop). Don't cut prices during ramp — let the margin improvement capitalize.

---

## §3 Revenue model per tier (D-17 elaborated)

Full table also in `77_WEB_PLATFORM_ARCHITECTURE.md` v1.1 §9.3; expanded here with math.

### §3.1 Starter — Pure SaaS

**Model:** Monthly fee only. No deal fee. No setup fee.

**Rationale:**
- Small tenants (5 users · 50 listings) close maybe 10-15 deals/yr at AED 2-5 M average = AED 20-75 M total deal value/yr.
- 0.25% deal fee would yield AED 50 k – 190 k/yr — meaningful but adds billing complexity (deal-fee reconciliation · VAT on deal-fee line · invoice line-item extension).
- Starter tenants are self-service · price-sensitive · want predictability.
- Pure SaaS is clean at this tier.

**Recommended launch price:** **AED 1 000 / month** (Pure SaaS).

### §3.2 Pro — Pure SaaS Phase 1-2 · Hybrid option Phase 3

**Phase 1-2 Model:** Pure SaaS (monthly fee only).

**Rationale for Pure SaaS Phase 1-2:**
- Simpler billing (pilot tenants have enough complexity learning platform; don't need deal-fee reconciliation).
- Tenant predictability (knows exact monthly cost · easier budget approval).
- Aligns with founder "easy to change prices later" directive — adds hybrid option via PricingPlan field later without breaking existing tenants.
- Pilot data will reveal whether Hybrid is worth the complexity.

**Phase 3+ Hybrid option:**
- Post-§77_BUILD_SPEC Phase 2 pilot feedback, can add Hybrid variant to `PricingPlan` model.
- Lower monthly fee (AED 2 500) + 0.1% deal fee (of tenant's deal value).
- Mathematics: Pro tenant at 30-50 deals/yr × AED 10-30 M avg = AED 300 M – 1.5 B deal volume. 0.1% fee = AED 300 k – 1.5 M/yr ZAAHI revenue per Pro tenant (vs AED 36 k/yr Pure SaaS). 
- Attractive if deal volume predictable; friction-heavy if deals lumpy.

**Recommended launch price:** **AED 3 000 / month Pure SaaS**. Hybrid variant deferred to Phase 3 after validated.

### §3.3 Enterprise — Hybrid with deal fee floor 0.25%

**Model:** Hybrid = Monthly SaaS fee + 0.25% deal-fee floor (negotiable upward with volume commit).

**Deal fee floor math:**
- ZAAHI Agency (own deals) = 2% commission rate (CLAUDE.md source of truth).
- Enterprise tenant broker typically charges 2% commission to their seller-side client.
- Enterprise tenant deal fee to ZAAHI (Platform) = 0.25% of deal value = **12.5% of tenant's own 2% commission**.
- At AED 50 M deal, tenant earns AED 1 000 000 commission; ZAAHI earns AED 125 000 (deal fee) + ZAAHI's own share unrelated.
- **12.5% share is a reasonable platform-vs-broker split** — compares to Airbnb host fee ~15% of booking, Uber driver fee ~25% of ride; RE tenant keeps ~87.5% of commission, which is strong tenant economics.

**Volume-commitment negotiation (R-6 founder-ratified 2026-04-22 · D-10 tightened):**
- Default deal fee = 0.25% (ratified D-9).
- Enterprise tenant commits to minimum annual deal volume (e.g., AED 500 M) → deal fee drops to 0.20%.
- Enterprise tenant commits to multi-year (3+ years) → deal fee drops to 0.15% (AT THE HARD FLOOR).
- **HARD FLOOR = 0.15%** (tightened from prior 0.10% · below is unprofitable per §2 math · anything below 0.15% triggers Custom-tier bespoke contract instead of Enterprise).
- Negotiable range 0.15-0.30% · above 0.30% is politically untenable (reaches 15%+ of tenant's 2% commission).

**Alternatives rejected:**
- Pure SaaS Enterprise: rejected — Enterprise deal volume is where SaaS-margin upside lives; leaving 0% deal fee forfeits material Y3+ revenue.
- High deal fee (0.5%+): rejected — reaches 25%+ of tenant commission = politically untenable in Enterprise contracts.
- Tenant commission share model (ZAAHI takes 10% of tenant's commission): rejected — requires deep invoice visibility into tenant's ops; complexity explodes.

**Deal fee scope (critical):**
- Applies only to deals CLOSED via ZAAHI Deal Engine (full state machine transitions).
- Does NOT apply to deals tenant closes off-platform (fair — those deals don't use ZAAHI infrastructure).
- Does NOT touch Ambassador commission pool (ZAAHI Ambassador = 2% ZAAHI Service Fee per CLAUDE.md · completely separate ledger).
- Deal fee line on tenant's invoice = line-item #2 alongside monthly SaaS = line-item #1.
- VAT 5% applies to both line items.

**Ratified launch pricing (R-5/R-6 2026-04-22):**
- Starter Enterprise: **AED 22 000/mo** SaaS + **0.25%** deal fee (default).
- Mid Enterprise (volume-commit AED 500 M+): AED 20 000/mo + 0.20%.
- Large Enterprise (multi-year 3+ yr): AED 18 000/mo + 0.15% (AT HARD FLOOR).
- Sub-0.15% deal-fee contracts → escalate to Custom tier bespoke (NOT Enterprise · separate governance).
- Scale floor (Y5+): AED 20 000/mo.

### §3.4 Custom — bespoke (Phase 3+)

Out of Phase 1-2 scope per architecture v1.1 §1.4 + §5.4. Contract negotiated per deal with reference to Enterprise floor + premium.

### §3.5 Floor values summary table (R-5 FOUNDER-RATIFIED 2026-04-22)

| Tier | Monthly SaaS launch floor | Monthly SaaS scale floor (Y5+) | Deal fee default | Deal fee hard floor | Annual-prepay discount | Currency |
|---|---:|---:|:-:|:-:|:-:|---|
| Starter | **AED 1 000** | AED 700 | none (Pure SaaS) | n/a | 10% (D-16) | AED (others via PricingPlan) |
| Pro | **AED 3 000** | AED 2 500 | none Phase 1-2 · 0.1% Phase 3+ Hybrid variant | n/a | 10% (D-16) | AED |
| Enterprise | **AED 22 000** | AED 20 000 | **0.25%** (D-9) | **0.15%** (D-10 · R-6 tightened) | 10% on SaaS fee only (D-16) | AED |
| Custom | AED 40 000+ | — | bespoke | bespoke | bespoke | multi-currency |

**Floor = minimum; launch pricing CAN be above floor. Founder approves per-tenant custom pricing via Super-Admin §14.3 (governance §5.2 below).**

### §3.6 Enterprise Ambassador opt-out compensation (R-8 · D-17 ratified 2026-04-22 · NEW)

**Context:** Per architecture D-15, Enterprise tenants may elect to use their own Ambassador program instead of ZAAHI-shared (default). When a tenant opts out, ZAAHI loses the network-effect contribution that the tenant would otherwise provide (referral-link flows, tier upgrades of the tenant's users into the ZAAHI Ambassador ladder, brand extension). This section specifies the compensation mechanism.

**Compensation mechanisms (tenant elects ONE at contract signing):**

| Mechanism | Effect on pricing | Tenant profile fit |
|---|---|---|
| **A · Flat uplift** | Monthly SaaS fee floor +AED 5 000/mo → **AED 27 000/mo** minimum (from AED 22 000 base). Deal fee unchanged (0.25% default · 0.15% hard floor per D-10). | Tenant with uncertain deal volume · prefers predictable invoicing · prefers SaaS line-item cleanliness. |
| **B · Deal-fee uplift** | Monthly SaaS fee unchanged (AED 22 000/mo floor). Deal fee floor +0.05% → **0.30% default · 0.20% hard floor** (0.15% hard floor + 0.05% opt-out stack). | Tenant with high deal volume · ZAAHI earns more via volume-proportional comp · tenant earns more at low volume months. |

**Mechanism selection rules (governance):**
- Tenant chooses **at contract signing** — NOT mid-term toggleable (prevents gaming · audit integrity).
- 12-month minimum commitment per D-15 Ambassador program commitment — compensation sticks through full contract cycle.
- At contract renewal, tenant may switch mechanism with 60-day advance notice (aligned with D-15 Ambassador direction-change rule).
- If tenant later elects ZAAHI-shared Ambassador at renewal, opt-out compensation is **removed** at renewal date (not retroactive).

**Contract artefact:** Enterprise MSA includes explicit clause stating (1) Ambassador program election (ZAAHI-shared vs own), (2) if own: opt-out compensation mechanism A or B, (3) AED 5 000 uplift OR 0.05% deal-fee uplift applied to PricingPlan at contract activation.

**PricingPlan implementation (§4.1 extension):**
- New `PricingPlan.ambassadorOwnOptOutMechanism` enum column: `NONE | FLAT_UPLIFT_A | DEAL_FEE_UPLIFT_B`.
- When FLAT_UPLIFT_A: `baseMonthlyFeeSmallest` = 27 000 AED × 100 fils = `2 700 000` fils (AED 5 000 uplift baked into plan).
- When DEAL_FEE_UPLIFT_B: `dealFeePercent` = `0.0030` (0.30% = 0.25% default + 0.05% uplift) · hard floor on negotiation = 0.20%.
- Single source of truth: plan assignment at tenant onboarding locks compensation mechanism for the contract term.

**Rationale (why this structure):**
- Compensation reflects ZAAHI's foregone network effect — not arbitrary penalty.
- Two mechanisms (A · B) reflect different tenant deal-volume profiles — flexibility without complexity.
- Contract-time lock prevents mid-term gaming (tenant toggling to cheaper mechanism month-to-month).
- 12-month minimum aligns with D-15 Ambassador commitment — single governance window for both decisions.
- **Default remains ZAAHI-shared Ambassador** (D-15) — opt-out is explicit exception with explicit cost · preserves D-5 Ambassador scope invariant.

**Alternatives rejected:**
- **No compensation** — ZAAHI absorbs network loss · Enterprise free-rides on opt-out · rejected: breaks unit economics at scale.
- **Single mechanism (flat-only)** — reduces contract flexibility · rejected: mechanism B attractive for high-volume tenants.
- **Single mechanism (deal-fee-only)** — administrative complexity for low-volume tenants · rejected: mechanism A attractive for predictability.
- **Mid-term toggleable** — audit integrity risk · commission ledger reconciliation nightmare · rejected: toggling destroys grandfathering.
- **Shorter commitment (6 months)** — too short for network-effect cost-recovery · rejected: aligned with D-15 12-month minimum.

---

## §4 Runtime pricing architecture

### §4.1 Prisma `PricingPlan` model (specification)

```prisma
enum PricingPlanStatus {
  ACTIVE         // current default for new tenant assignments
  DEPRECATED     // not offered to new tenants; existing tenants grandfathered
  ARCHIVED       // neither new nor existing; retained for audit
}

enum PricingCurrency {
  AED   // default
  SAR   // Saudi Phase 2
  KZT   // Kazakhstan Phase 2
  USD   // international
  EUR   // optional
  // extend as jurisdictions added
}

model PricingPlan {
  id                     String               @id @default(cuid())
  name                   String               @unique     // e.g. "Starter-AED-v1", "Pro-AED-v2", "Enterprise-AED-launch"
  tier                   TenantTier                        // STARTER | PRO | ENTERPRISE | CUSTOM
  baseMonthlyFeeSmallest Int                                // in smallest currency unit (fils for AED, halala for SAR, tiyn for KZT, cents for USD/EUR)
  currency               PricingCurrency      @default(AED)
  dealFeePercent         Decimal              @db.Decimal(5, 4)   // e.g. 0.0025 = 0.25% · 0.0000 = no deal fee
  annualDiscountPct      Decimal              @db.Decimal(5, 4)   // 0.1000 = 10% discount vs monthly billing

  // Feature caps
  userCap                Int?                                      // null = unlimited (Enterprise default)
  listingCap             Int?
  storageGB              Int?
  customDomainIncluded   Boolean              @default(false)

  // Feature flags (tier-specific capability gates)
  featuresJson           Json                 @default("{}")       // { feasibilityV2: true, metaverse3D: true, apiAccess: false, ambassadorIncluded: true, ... }

  // Lifecycle
  status                 PricingPlanStatus    @default(ACTIVE)
  effectiveFrom          DateTime
  effectiveTo            DateTime?                                 // null = ongoing

  // Audit
  createdAt              DateTime             @default(now())
  updatedAt              DateTime             @updatedAt
  createdBy              String                                    // Super-Admin user.id
  deprecatedAt           DateTime?
  deprecatedBy           String?
  deprecationReason      String?

  // Relations
  tenants                Tenant[]                                  // 0..many tenants on this plan
  history                PricingPlanHistory[]

  @@index([tier, status])
  @@index([currency, status])
  @@index([status])
}

// Append-only history of PricingPlan changes — never updated, never deleted.
// Tracks every mutation for audit trail + grandfathering disputes.
model PricingPlanHistory {
  id                 String   @id @default(cuid())
  pricingPlanId      String
  pricingPlan        PricingPlan @relation(fields: [pricingPlanId], references: [id])
  changedField       String                                        // e.g. "baseMonthlyFeeSmallest", "dealFeePercent"
  previousValue      Json?                                         // old value (JSON to support any type)
  newValue           Json?
  changeReason       String                                        // mandatory ≥ 20 chars for audit (per Spec 03 v2.0 §14.3 pattern)
  changedBy          String                                        // Super-Admin user.id
  changedAt          DateTime @default(now())

  @@index([pricingPlanId, changedAt])
}

// Tenant extension (illustrative — full Tenant schema in architecture v1.1 §3.1)
model Tenant {
  // ... existing fields ...
  currentPlanId      String?
  currentPlan        PricingPlan? @relation(fields: [currentPlanId], references: [id])
  planAssignedAt     DateTime?
  planAssignedBy     String?
  customPricingJson  Json?                                         // per-tenant override for Enterprise · audit-logged
  promotionalOverrides Json?                                       // time-limited discount codes applied
}
```

### §4.2 Currency handling

**Base currency:** AED (ZAAHI default).

**Multi-currency support (Phase 2+):**
- Each `PricingPlan` row has a `currency` field. Separate plan rows per tier per currency (e.g., `Starter-AED-v1` and `Starter-SAR-v1`).
- Tenant's `currentPlanId` points to specific currency plan based on tenant's jurisdiction.
- Currency determined at tenant provisioning time (tenant's data region + registration country).

**FX rate source:**
- Phase 2 start: manual rate table updated weekly by Super-Admin (simple · no vendor dependency).
- Phase 3: automated via `currencyapi.com` ($50/mo) or `open-exchange-rates.org` free tier for reporting + dashboards.
- Billing always in tenant's plan currency (no FX conversion at invoice time · prevents rate-arbitrage disputes).

### §4.3 Per-tenant custom pricing override (Enterprise)

**Use case:** Enterprise tenant negotiates bespoke pricing (AED 18 k/mo + 0.18% deal fee + prepaid 3-year contract).

**Implementation:**
- New PricingPlan `Enterprise-Custom-<TenantSlug>-v1` created by Super-Admin.
- Assigned to tenant via `Tenant.currentPlanId`.
- Audit log: plan creation + assignment both logged per Spec 03 v2.0 §14.9.

**Alternative (lighter):**
- `Tenant.customPricingJson` field overrides specific fields on parent plan (e.g., `{ baseMonthlyFeeSmallest: 18_000_00 }` overrides the plan's base fee).
- Simpler for small tweaks; heavier tweaks warrant dedicated plan row.

**Audit:** every `customPricingJson` change writes `AuditLog` entry with compliance tag `CUSTOM_PRICING_OVERRIDE` per Spec 03 v2.0 §14.9.1. Cross-notifies other Super-Admin per §14.9.2.

### §4.4 Super-Admin UI for pricing management

Access: `/super-admin/pricing/plans` (per Spec 03 v2.0 §14.10).

**Actions available:**

1. **Create new plan** (clone from existing · edit fields · activate).
2. **Edit existing plan** — only for ACTIVE plans; changes write `PricingPlanHistory` row with mandatory reason.
3. **Deprecate plan** — new sign-ups blocked on this plan; existing tenants grandfathered. Reason required.
4. **Archive plan** — no tenants remaining on this plan; historical record only.
5. **Assign tenant to different plan** — requires reason + optional backdated effective date. Tenant notification (email + in-app) auto-fired.
6. **Create custom plan per tenant** (Enterprise) — clones existing plan + per-tenant tweaks · one-click.
7. **Bulk plan change with dry-run preview** — "move all Pro tenants on `Pro-AED-v1` to `Pro-AED-v2` effective Apr 1" · preview diff per tenant · confirm · execute atomically or rollback.

**UI wireframe (illustrative):**
```
[/super-admin/pricing/plans]

Active plans (7):
 • Starter-AED-v1 — 3 tenants, AED 1 000/mo, Pure SaaS
 • Pro-AED-v1 — 5 tenants, AED 3 000/mo, Pure SaaS
 • Enterprise-AED-v1 — 2 tenants, AED 22 000/mo + 0.25% deal fee
 • Enterprise-Custom-IMKAN-v1 — 1 tenant, AED 18 000/mo + 0.18% deal fee (3-yr contract)
 ...

Deprecated (1):
 • Starter-AED-v0 — 1 tenant grandfathered, AED 800/mo (below current floor; grandfathered)

[+ New Plan] [Deprecate...] [Bulk change...] [Pricing Analytics]
```

### §4.5 Promotional pricing

**Three promotional mechanisms:**

1. **Time-limited discount codes** — `DiscountCode` separate Prisma model · code · percentage-off OR fixed-amount-off · expiry date · usage cap. Tenant applies code at signup or billing cycle.

2. **Per-tenant promotional override** — `Tenant.promotionalOverrides` JSON field with expiry date. Example: `{ promoType: "LAUNCH_50_PCT_3_MONTHS", expiresAt: "2027-07-15", originalPrice: 3000, promoPrice: 1500 }`. Billing cron auto-applies then auto-removes on expiry.

3. **Plan-level promotional** — new `PricingPlan` row with `Launch-Promo-Pro-AED-v1` that has lower `baseMonthlyFeeSmallest` and `effectiveTo` date set. Tenants assigned to promo plan auto-migrate to regular plan at promo expiry (with 60-day advance notice per §5.3).

**Governance:** every promotional pricing requires Super-Admin approval per §5.2 below.

---

## §5 Pricing governance

### §5.1 Who can change prices (Super-Admin §14 authority)

Per Spec 03 v2.0 §14.1, SUPER_ADMIN role (Zhan + Dymo only) has authority. `TENANT_ADMIN` has read-only visibility of own tenant's plan.

### §5.2 Approval thresholds

| Action | Approval required |
|---|---|
| Price increase < 10% (any plan) | Single founder approval · audit logged |
| Price increase ≥ 10% (any plan) | **Dual founder cosign** (both Zhan AND Dymo click approve) |
| Any price decrease (signals concern) | **Dual founder cosign** (prevents panic-discount racing) |
| Create new plan | Single founder approval |
| Deprecate plan | Single founder approval · tenants notified 60 days advance |
| Custom Enterprise pricing (bespoke contract) | **Dual founder + CoS review** (contract-size implications) |
| Bulk plan migration (multiple tenants) | **Dual founder cosign** · dry-run preview mandatory · rollback plan ready |
| Promotional campaign launch | Single founder approval · expiry date set |
| Emergency rollback (price change caused tenant complaint wave) | SUPER_ADMIN emergency override per §14.7 · cross-notification immediate |

### §5.3 Tenant notification requirements

**Price increases:**
- **60 days advance notice** — legal best practice + goodwill. Email + in-app banner.
- Tenants have 60 days to accept OR cancel subscription.
- Grandfathered rate preserved for tenants on existing plan (existing plan deprecated; new plan issued).
- Exception: Enterprise bespoke contracts with annual/multi-year commits — rate locked until contract renewal.

**Price decreases:**
- Applied immediately at next billing cycle (benefits flow to tenant).
- No notice period required.
- Tenants on existing plan auto-migrated to new lower plan.

**Plan deprecation:**
- 60 days advance notice to tenants on plan being deprecated.
- Grandfathering minimum **12 months** from deprecation announcement (tenant on old plan can stay ≥ 12 months on old pricing).
- After 12 months, tenant auto-migrated to current plan at current pricing.

### §5.4 Audit trail (per Spec 03 v2.0 §14.9)

Every pricing action writes `AuditLog` entry with:
- `timestamp`, `actorId` (Super-Admin), `actionType` (one of PLAN_CREATE / PLAN_EDIT / PLAN_DEPRECATE / PLAN_ARCHIVE / TENANT_ASSIGN_PLAN / CUSTOM_PRICING_SET / PROMO_CREATE).
- `entityType: "PricingPlan"` or `"Tenant"`.
- `fromValue`, `toValue`, `reason` (mandatory ≥ 20 chars).
- Compliance tags: `PRICE_INCREASE_≥10%`, `CUSTOM_PRICING_OVERRIDE`, `PLAN_DEPRECATION_60_DAY_NOTICE`, etc.

Append-only. Never updated or deleted.

Cross-notification per §14.9.2:
- Daily digest for routine pricing changes.
- Immediate email for (a) price increases ≥ 10%, (b) price decreases, (c) custom Enterprise pricing, (d) bulk plan migration.

---

## §6 Tenant-facing pricing page generation

### §6.1 Dynamic pricing display

Tenant's public `<tenantSlug>.zaahi.io/pricing` page reads `PricingPlan` table at runtime (30-second cache per architecture v1.1 §4.2.2 feature-flag cache TTL pattern).

Pseudocode (illustrative, not applied):

```typescript
// src/app/[tenant]/pricing/page.tsx (Phase 2 Build)
async function PricingPage({ params }: { params: { tenant: string } }) {
  const tenant = await resolveTenant(params.tenant);
  const plans = await prisma.pricingPlan.findMany({
    where: {
      currency: tenant.currentPlan?.currency ?? "AED",
      status: "ACTIVE",
      tier: { in: ["STARTER", "PRO", "ENTERPRISE"] },
    },
    orderBy: { baseMonthlyFeeSmallest: "asc" },
  });

  return <PricingTable plans={plans} highlight="PRO" /* Pro highlighted as "most popular" */ />;
}
```

### §6.2 Per-region display

Visitor from Saudi Arabia → `Starter-SAR-v1` displayed instead of `Starter-AED-v1`. Detection via IP geolocation OR explicit currency switcher.

Arabic visitors (regardless of country) → AR-localised copy but currency can be AED or SAR based on jurisdiction.

### §6.3 Per-tenant embedded pricing (Phase 3+)

**Future consideration:** Pro+ tenants can show THEIR OWN sub-pricing to THEIR sub-customers (e.g., tenant runs Ambassador program for their agents with their own tier structure).

- Deferred to Phase 3 post-Enterprise tier ship.
- Implementation: `TenantPricingPage` separate tenant-scoped model.
- Independent of ZAAHI's tenant-pricing schema.

---

## §7 Integration with Revenue Engine (§55)

### §7.1 Monthly invoicing job (cron)

**Spec 02 v1.1 Invoice pipeline extended for tenant SaaS:**

New `InvoiceType` enum value: `TENANT_SUBSCRIPTION` (alongside existing `AGENCY_COMMISSION` · `PLATFORM_SERVICE_FEE` · `AMBASSADOR_PAYOUT`).

Cron schedule (new Prisma cron or Vercel Cron):
- Daily at 00:00 UAE time: check all tenants whose `currentCycleEnd` ≤ now + 7 days. Generate invoices in DRAFT status.
- Daily at 06:00 UAE time: Super-Admin reviews DRAFT invoices via `/super-admin/invoices` dashboard; auto-issue most; manual-review flagged ones.
- Invoices emailed via Resend (Spec 02 v1.1 pipeline).
- Payment confirmation (Phase 1 manual; Phase 2+ Stripe/Paddle webhook).

### §7.2 Pro-ration logic (mid-month plan changes)

Scenario: Starter tenant upgrades to Pro mid-month.

```
oldPlanDailyRate = oldPlan.monthlyFee / 30
newPlanDailyRate = newPlan.monthlyFee / 30
daysRemainingInCycle = currentCycleEnd - today
prorationCredit = oldPlanDailyRate * daysRemainingInCycle  // refund for unused Starter days
prorationCharge = newPlanDailyRate * daysRemainingInCycle  // charge for remaining days on Pro
netChargeAdjustment = prorationCharge - prorationCredit
// Issue invoice for netChargeAdjustment; next full cycle invoiced normally.
```

Complexity: pro-rated charge must reflect deal-fee scope changes too (if tenant was Pro without deal fee · now Enterprise with 0.25% · deal fee applies only to deals closed AFTER plan change, not retroactive).

### §7.3 Failed payment handling

- Day 1 after invoice due: soft reminder (email).
- Day 7: second reminder + in-app warning banner.
- Day 14: third reminder + Super-Admin alert (cross-notification).
- Day 30: tenant status → SUSPENDED (read-only access; per architecture v1.1 §3.2).
- Day 60-90: escalation + tenant admin call.
- Day 90: TERMINATED status (final).
- Recovery: tenant pays overdue → SUSPENDED → ACTIVE with 48-hr grace period.

### §7.4 Reference Spec 02 v1.1 Invoice pipeline

Tax Invoice PDF generation · ZAAHI-INV-YYYY-NNNN numbering · VAT 5% line · Amiri/Tajawal Arabic fonts · FTA-compliant layout — all reused from Spec 02 v1.1 `src/lib/generate-invoice-pdf.ts` (Phase 2 build · already specced).

New invoice type `TENANT_SUBSCRIPTION` differs only in:
- Line item #1: "SaaS subscription [tier] [period]"
- Line item #2 (Enterprise Hybrid only): "Deal fees at 0.25% of qualified deal value [period]"
- Customer = Tenant · Customer TRN from Tenant registration.

---

## §8 Migration path

### §8.1 From hardcoded to DB-driven (Phase 2 migration)

**Current state (2026-04-22):** No pricing in code (ZAAHI single-tenant has no tenant pricing). Only ambassador tier prices hardcoded in `src/lib/ambassador-plans.ts`.

**Phase 2 Month 10-13 tenantization:**
1. Create `PricingPlan` migration (add 3 models: PricingPlan · PricingPlanHistory · Tenant extensions).
2. Seed 3 initial plans: `Starter-AED-v1` · `Pro-AED-v1` · `Enterprise-AED-v1` at recommended launch floors (§2.3).
3. Each new tenant provisioning defaults to these plans (per tier).
4. Super-Admin UI at `/super-admin/pricing/plans` built in parallel.

### §8.2 From ZAAHI-only to multi-tenant sub-pricing (Phase 3+)

Tenant running own Ambassador / tier / user-group pricing. Separate scope · `TenantPricingPage` model added Phase 3. Deferred.

### §8.3 From AED-only to multi-currency

**Phase 2 Saudi expansion trigger:**
1. Add SAR to `PricingCurrency` enum (may require migration for enum extension).
2. Clone AED plans to SAR plans at equivalent floor (1 AED ≈ 1.00 SAR — near parity, so Saudi floor ≈ AED floor).
3. Saudi tenant provisioning defaults to SAR plans.

**Phase 2 Kazakhstan:**
- Add KZT. KZT ≈ AED 0.0018 · AED 1 000 ≈ KZT 555 000 · launch price in KZT = KZT 500 000 – 550 000.
- Recalibrate to local market benchmarks (Kazakhstan RE SaaS likely cheaper than Dubai).

Similar process per jurisdiction added.

---

## §9 Risks & open questions

### §9.1 Pricing too low risk

- **Floor below ZAAHI cost:** already ensured not possible by §2 floor methodology (60% GM minimum).
- **Floor below market's psychological minimum:** AED 1 000/mo Starter might be perceived as "not serious" — pricing psychology says "free < AED 1 000 < AED 5 000 < premium." Monitor during Phase 2 pilot conversations.
- **Deal fee fails to cover Deal Engine cost at Enterprise:** if Enterprise tenant's deal volume is low, 0.25% × AED 50 M / yr = AED 125 k — covers infrastructure but thin on dev amortization. Monitor; adjust to 0.30% floor if pattern emerges.

### §9.2 Pricing too high risk

- **Starter AED 1 000 > mid-tier broker budget:** possible in smallest tenants. Mitigation: promotional Starter tier AED 500 for first 10 tenants.
- **Pro AED 3 000 > competitive pressure if Bayut/Huspy/PRYPCO launch competing white-label:** monitor; current comparable product doesn't exist but fast-follower risk real.
- **Enterprise AED 22 000 vs Argus Enterprise licensing:** Argus is US-originated AED 30-90 k/seat/yr for small team · ZAAHI Enterprise AED 264 k/yr is higher BUT includes full platform not just valuation. Positioning needed: "ZAAHI Enterprise = Argus + listings + Deal Engine + compliance. Not a tool, a platform." Sales enablement spec deferred to §77_BUILD_SPEC.

### §9.3 Grandfathering complexity at scale

**Risk:** Phase 3 has 10+ Pro plan versions (Pro-AED-v1, Pro-AED-v2, Pro-AED-v3 etc.) with different grandfathered tenants. Billing UI becomes complex.

**Mitigation:**
- Cap plan version proliferation (max 3-4 active plan versions per tier).
- After 4 versions, force-migrate oldest grandfathered cohort to v2 (12-month notice preserved).
- Plan archival cleanup cron (every 6 months).

### §9.4 Tax implications (VAT 5% + CT 9%)

- SaaS subscription = VAT 5% for UAE B2B (chargeable to tenant).
- Zero-rated if tenant is outside GCC (export service).
- Tenant in SA · KW · non-UAE GCC = still VAT 5% (intra-GCC).
- Cross-border tenant (Kazakhstan · Europe) = reverse-charge VAT handled by Merchant-of-Record (Paddle when activated Phase 2 beyond 10 tenants).
- CT 9% applies on ZAAHI net profit from SaaS above AED 375 k annual threshold. Mostly Platform revenue book, not Agency.

### §9.5 Open questions for founder

🔴 **BLOCKING (before Phase 2 build starts):**
1. **Recommended launch pricing (Starter AED 1 000 / Pro AED 3 000 / Enterprise AED 22 000 floor) — approve as defaults for Phase 2?** Can be overridden per-tenant but sets the "default table." Reference only; adjustable runtime.
2. **Deal fee 0.25% floor for Enterprise — approve?** Or defer to Phase 2 launch negotiation?

🟡 **IMPORTANT (Phase 2 design):**
3. **Annual-prepay discount % — 10% default?** Founder ratify or recommend alternative.
4. **Promotional Starter AED 500 for first 10 tenants — approve as launch offer?** Helps conversion velocity.
5. **Free trial length — 14 days default** (industry norm · architecture v1.1 §9.6). Ratify?

🟢 **NICE-TO-KNOW:**
6. **Currency addition sequence post-Saudi: KZT (Kazakhstan) vs USD (international first)?**
7. **Tenant sub-pricing (Phase 3) — product marketing name?** ("White-label SaaS" vs "Platform" vs other).

---

## §10 Decision tracker

| ID | Decision | Date | Ratified by | Rationale |
|:-:|---|:-:|:-:|---|
| **D-1** | Minimum floor pricing philosophy (not optimal, not aspirational) | 2026-04-22 | Founder | Market-entry friction beats margin maximisation Phase 1-2 · legacy grandfathering · easy to raise not lower |
| **D-2** | 60% gross margin target as floor threshold | 2026-04-22 | Agent · industry SaaS benchmark | Industry floor for investable SaaS · below = VC discount |
| **D-3** | Runtime configurability via PricingPlan Prisma model | 2026-04-22 | Agent · founder directive | Market learning · multi-currency · per-tenant custom · promotional · deprecation · all require no-code-deploy updates |
| **D-4** | Grandfathering policy — existing tenants preserved on original plan for minimum 12 months after deprecation | 2026-04-22 | Agent | Trust · consistency · legal goodwill · prevents churn-in-response-to-price-change |
| **D-5** | Revenue model per tier: Starter + Pro = Pure SaaS · Enterprise = Hybrid (SaaS + 0.25% deal fee default) | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-5)** · agent recommendation | See §3 — deal-fee scope limited to Enterprise aligns ZAAHI incentive with tenant success without complicating Starter/Pro billing |
| **D-6** | Base currency AED · multi-currency via per-currency PricingPlan rows · billing always in tenant's plan currency (no FX at invoice) | 2026-04-22 | Agent · founder expansion directive | Prevents FX-rate disputes · simpler per-jurisdiction accounting · cleaner Phase 3 cross-border |
| **D-7** | **Starter launch floor: AED 1 000/mo** · scale floor AED 700/mo (Y5+) · below full-amortization AED 2 535 absorbed by Platform Dev Fund Y2-Y3 ramp | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-5)** — elevated from agent-recommendation | Psychologically accessible · launch below scale absorbs amortization during ramp · per §2.3.1 math |
| **D-8** | **Pro launch floor: AED 3 000/mo** · scale floor AED 2 500/mo · below full-amortization AED 4 247 | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-5)** — elevated from agent-recommendation | Accessible for mid-tier broker · launch below scale absorbs amortization · per §2.3.2 math |
| **D-9** | **Enterprise launch floor: AED 22 000/mo + 0.25% deal fee default** · scale floor AED 20 000/mo · slightly below full-amortization AED 23 450 | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-5)** — elevated from agent-recommendation | Dedicated infrastructure cost dominates · minimal amortization bypass · deal fee adds meaningful revenue upside · volume commitments allow lower SaaS fee negotiation · per §2.3.3 math |
| **D-10** | **Enterprise deal-fee default 0.25% · HARD FLOOR 0.15%** (tightened from prior 0.10% — unprofitable per §2 math) · negotiable range 0.15-0.30% per volume commit · sub-0.15% requires Custom tier contract | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-6)** — tightened hard floor | 0.25% = 12.5% of tenant's 2% commission · reasonable platform-vs-broker split · 0.15% covers Deal Engine + audit with minimal margin · 0.10% was below COGS (unprofitable) · sub-0.15% contracts escalate to Custom tier bespoke |
| **D-11** | Deal fee does NOT touch Ambassador commission pool (ZAAHI Ambassador = separate 2% ZAAHI Service Fee ledger per CLAUDE.md) | 2026-04-22 | Founder D-5 · agent preservation | Clean boundary · prevents commission double-counting · Ambassador program stays ZAAHI-scoped |
| **D-12** | Approval thresholds: <10% increase single-founder · ≥10% dual-cosign · any decrease dual-cosign · bulk migration dual-cosign | 2026-04-22 | Agent | Dual-cosign on dilutive actions prevents panic-discount · fast single approval for routine · governance aligned with Spec 03 v2.0 §14 |
| **D-13** | 60-day advance notice on price increases · immediate on decreases · 12-month grandfathering minimum on plan deprecation | 2026-04-22 | Agent · industry practice | Legal best practice · goodwill · prevents surprise-churn |
| **D-14** | Every pricing action → AuditLog append-only (per Spec 03 v2.0 §14.9) with mandatory reason ≥ 20 chars | 2026-04-22 | Agent · governance inheritance | Audit trail for disputes · grandfathering evidence · Super-Admin accountability |
| **D-15** | Phase 1 billing = manual Super-Admin invoicing via Spec 02 v1.1 pipeline · Phase 2 Stripe/Paddle evaluation at 5-10 tenants | 2026-04-22 | Founder R-4 ratified | Low volume doesn't justify 3-5% payment processor fee + complexity · Spec 02 v1.1 already produces FTA-compliant PDFs · migration path clean when Phase 2 threshold hits |
| **D-16** | **Annual-prepay discount 10% default across all tiers** · applied to monthly fee ONLY (not deal fee) · reviewable post-pilot | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-7)** | 10% is industry-standard SaaS annual-prepay (Salesforce · HubSpot · Shopify sit 10-20%) · low end chosen for Phase 1-2 conservatism · better to raise later than cut · applied to monthly fee only because Enterprise deal fee is variable by transaction volume · prepaying deal fee is operationally impossible · reviewable if 12-month prepay uptake low (raise to 12-15% Phase 3) |
| **D-17** | **Enterprise Ambassador opt-out compensation — NEW.** Tenant choosing own Ambassador (vs ZAAHI-shared default per architecture D-15) compensates ZAAHI via ONE mechanism (elected at contract signing): (A) +AED 5 000/mo flat uplift (monthly SaaS fee floor rises AED 22 000 → AED 27 000), OR (B) +0.05% deal-fee uplift (deal fee rises 0.25% default → 0.30% default · hard floor 0.15% → 0.20%). Contract-time lock · 12-month minimum · renewal-time switch with 60-day notice. | 2026-04-22 | **FOUNDER RATIFIED 2026-04-22 (R-8)** | Compensation reflects ZAAHI's foregone network-effect contribution when tenant opts out of shared Ambassador program · two mechanisms reflect different tenant deal-volume profiles · contract-time lock prevents mid-term gaming · 12-month minimum aligns with architecture D-15 · full spec §3.6 above |

Future decisions (pending):
- **D-18 (pending):** Promotional Starter launch discount (AED 500 first 10 tenants?).
- **D-19 (pending):** Currency expansion sequence post-Saudi (KZT next · USD next · EUR timing).
- **D-20 (pending):** Post-pilot review of D-16 annual-prepay 10% (raise to 12-15% if uptake insufficient).

---

## §11 Appendices

### Appendix A — Glossary

- **Floor price** — minimum sustainable price per tier at 60% gross margin (unit-economics threshold).
- **Launch floor** — floor at Phase 2 launch (10 tenants · partial amortization · Platform Dev Fund absorbs residual).
- **Scale floor** — floor at Y5+ (60+ tenants · negligible amortization).
- **MRR (Monthly Recurring Revenue)** — sum of all active tenants' monthly subscription fees.
- **ARPU (Average Revenue Per User)** — MRR ÷ active tenant count.
- **Grandfathering** — existing tenants stay on original plan when plan is deprecated/updated · minimum 12 months retention guarantee.
- **Deprecated plan** — not offered to new sign-ups · existing tenants grandfathered · eventual archival.
- **Archived plan** — no tenants remaining · historical-only.
- **Hybrid revenue model** — SaaS monthly fee + deal fee % of deal value.
- **Pure SaaS** — monthly fee only · no deal fee.
- **Deal fee** — percentage of tenant's deal value charged by ZAAHI on deals closed via Deal Engine (Enterprise tier).
- **Pro-ration** — partial-month charge calculation when tenant changes plan mid-cycle.

### Appendix B — Sample PricingPlan seed data (illustrative · v1.1 R-5/R-6/R-7/R-8 ratified)

```sql
-- Phase 2 Month 10 launch seed (illustrative — not applied)
-- v1.1 2026-04-22: FOUNDER-RATIFIED floors (R-5) · 10% annual-prepay default (D-16 · R-7) ·
-- Enterprise 0.25% deal fee default + 0.15% hard floor (D-10 · R-6) ·
-- Enterprise-AED-own-ambassador-{A,B} plans for opt-out compensation (D-17 · R-8 · §3.6).

INSERT INTO "PricingPlan" (name, tier, baseMonthlyFeeSmallest, currency, dealFeePercent, annualDiscountPct, userCap, listingCap, storageGB, customDomainIncluded, featuresJson, status, effectiveFrom, createdBy) VALUES

('Starter-AED-launch', 'STARTER', 100000, 'AED', 0.0000, 0.1000, 5, 50, 5, false,
  '{"feasibilityV2": false, "metaverse3D": false, "apiAccess": false, "ambassadorIncluded": true, "zaahiFooterRemovable": false, "ambassadorOwnOptOutMechanism": "NONE"}',
  'ACTIVE', '2026-12-20', '<zhan-user-id>'),
-- AED 1 000/mo = 100 000 fils · annual-prepay 10% (D-16)

('Pro-AED-launch', 'PRO', 300000, 'AED', 0.0000, 0.1000, 25, 300, 50, true,
  '{"feasibilityV2": true, "metaverse3D": true, "apiAccess": false, "ambassadorIncluded": true, "zaahiFooterRemovable": false, "ambassadorOwnOptOutMechanism": "NONE"}',
  'ACTIVE', '2026-12-20', '<zhan-user-id>'),
-- AED 3 000/mo = 300 000 fils · annual-prepay 10% (D-16)

('Enterprise-AED-launch', 'ENTERPRISE', 2200000, 'AED', 0.0025, 0.1000, NULL, NULL, 500, true,
  '{"feasibilityV2": true, "metaverse3D": true, "apiAccess": true, "complianceModule": true, "ambassadorIncluded": true, "ambassadorTenantOwnOptIn": true, "zaahiFooterRemovable": true, "dedicatedDB": true, "ambassadorOwnOptOutMechanism": "NONE"}',
  'ACTIVE', '2026-12-20', '<zhan-user-id>'),
-- AED 22 000/mo = 2 200 000 fils · 0.25% deal fee default · 10% annual-prepay (D-16 ratified — down from 15% in v1.0)
-- ZAAHI-shared Ambassador (default per architecture D-15)

('Enterprise-AED-own-ambassador-flat-A', 'ENTERPRISE', 2700000, 'AED', 0.0025, 0.1000, NULL, NULL, 500, true,
  '{"feasibilityV2": true, "metaverse3D": true, "apiAccess": true, "complianceModule": true, "ambassadorIncluded": false, "ambassadorTenantOwnOptIn": true, "zaahiFooterRemovable": true, "dedicatedDB": true, "ambassadorOwnOptOutMechanism": "FLAT_UPLIFT_A"}',
  'ACTIVE', '2026-12-20', '<zhan-user-id>'),
-- Enterprise w/ own Ambassador · Mechanism A (flat uplift) · AED 27 000/mo (22k + 5k) · 0.25% deal fee · 10% annual-prepay (D-17 · R-8)

('Enterprise-AED-own-ambassador-deal-B', 'ENTERPRISE', 2200000, 'AED', 0.0030, 0.1000, NULL, NULL, 500, true,
  '{"feasibilityV2": true, "metaverse3D": true, "apiAccess": true, "complianceModule": true, "ambassadorIncluded": false, "ambassadorTenantOwnOptIn": true, "zaahiFooterRemovable": true, "dedicatedDB": true, "ambassadorOwnOptOutMechanism": "DEAL_FEE_UPLIFT_B"}',
  'ACTIVE', '2026-12-20', '<zhan-user-id>');
-- Enterprise w/ own Ambassador · Mechanism B (deal-fee uplift) · AED 22 000/mo · 0.30% deal fee (0.25% + 0.05%) · 10% annual-prepay (D-17 · R-8)
-- Hard floor on negotiation: 0.20% deal fee (0.15% D-10 hard floor + 0.05% opt-out uplift)
```

### Appendix C — Comparable SaaS pricing benchmarks

Reference data points for positioning reconciliation:

| Tool / category | Monthly cost | Tier scope | Notes |
|---|---|---|---|
| **Argus Enterprise** (RE valuation) | USD 800-2 500 / seat (AED 2 900 – 9 200 / seat) | Enterprise · RE professionals | Industry standard for RE financial modeling; narrow scope (valuation only) |
| **Estate Master DF/EFM** | USD 500-1 500 / license | Enterprise · Australian origin · used in UAE | Development feasibility |
| **Bayut Agent Pro** | AED 2 000 – 5 000 / month (per subscription tier) | Broker listing platform | UAE direct · lower end of Pro tier |
| **Property Finder Agent Membership** | AED 3 000 – 10 000 / month | Same | UAE direct |
| **HubSpot Sales (US/global CRM)** | USD 50-1 500 / user / month | SMB to Enterprise | Per-seat pricing · not tier-based |
| **Salesforce Real Estate Cloud** | USD 150-300 / user / month | Enterprise | Industry-heavy customisation needed |
| **Shopify Plus (e-commerce analog)** | USD 2 000+ / month (base) + revenue % | Enterprise retail | Revenue-share model reference |

**Positioning:** ZAAHI is pricing slightly BELOW Bayut/Property Finder at Pro tier (AED 3 000 vs AED 3-10 k) · SIGNIFICANTLY LOWER than Argus at Enterprise · and adds Platform features (Deal Engine, Feasibility, Metaverse) none of the above offer in one package.

### Appendix D — Sample Prisma schema additions (illustrative)

Full PricingPlan + PricingPlanHistory + Tenant extensions per §4.1. Reference only; actual migration drafted in Phase 2 Month 10 tenantization cycle per architecture v1.1 §12.3. Do NOT apply today.

```prisma
// See §4.1 for full specification.

// Additional `InvoiceType` enum extension for Spec 02 v1.1:
enum InvoiceType {
  AGENCY_COMMISSION
  PLATFORM_SERVICE_FEE
  AMBASSADOR_PAYOUT
  TENANT_SUBSCRIPTION         // NEW · Phase 2 · SaaS monthly invoice to tenant
  TENANT_DEAL_FEE             // NEW · Phase 2 · Enterprise Hybrid · deal-fee line
}
```

---

**End of §77 Pricing Framework v1.1 DRAFT.**

v1.1 ratification status (2026-04-22):
- **D-5/D-7/D-8/D-9** — FOUNDER RATIFIED (R-5) · floors locked · Phase 2 Month 10 seed unblocked.
- **D-10** — FOUNDER RATIFIED (R-6) · hard floor tightened 0.10% → 0.15% · sub-0.15% contracts escalate to Custom tier.
- **D-16** — FOUNDER RATIFIED (R-7) · 10% annual-prepay default.
- **D-17** — FOUNDER RATIFIED (R-8) · Enterprise Ambassador opt-out compensation (new §3.6).
- **D-18/D-19/D-20** — PENDING · Phase 2 pilot tenant negotiations + post-pilot data.

Cross-references:
- `docs/architecture/77_WEB_PLATFORM_ARCHITECTURE.md` v1.2 — D-16 Pricing philosophy · D-17 Floors ratified · D-18 Enterprise deal-fee hard floor · D-19 annual-prepay 10% · D-20 Ambassador opt-out compensation; §9 references this spec.
- `docs/specs/phase-1/02-INVOICE_COMMISSION_SPEC.md` v1.1 (commit `0caf9de`) — Tax Invoice PDF pipeline · new TENANT_SUBSCRIPTION + TENANT_DEAL_FEE invoice types extend here.
- `docs/specs/phase-1/03-ADMIN_PANEL_SPEC.md` v2.0 (commit `0cd6542`) — §14 Super-Admin governance model applied to pricing authority.
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.2 (commit `45f23f5`) — Platform Dev Fund budget absorbs Phase 2 amortization residual.
- `docs/audits/WEB_PLATFORM_CURRENT_STATE_2026-04-22.md` (commit `51c926d`) — baseline audit informed amortization calculation.
- `CLAUDE.md` — Ambassador commission 2% ZAAHI Service Fee rule preserved (D-11 explicit).
