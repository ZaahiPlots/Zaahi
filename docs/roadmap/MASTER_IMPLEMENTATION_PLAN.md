# MASTER IMPLEMENTATION PLAN — Agency-First Startup Model

**Document:** 24-Month Step-by-Step Execution Plan
**Prepared for:** Zhan (Founder/CEO/CTO), Dymo (Co-founder, Ambassador, Ops Principal), Rudi (Principal Investor, Board)
**Prepared on:** 2026-04-20 (one day after Al Jurf MOU signing)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Horizon:** 2026-04-21 → 2028-04-21
**Canonical reference:** `docs/architecture/MASTER_TREE_final.md` (85 sections, 12 blocks) — unchanged
**Related documents** (all final; this plan consolidates their execution):
- `docs/vision/ZAAHI_VISION_CLARITY.md`
- `docs/research/COMPETITOR_DEEP_DIVE_2026.md`
- `docs/roadmap/POST_MEETING_BUILD_PLAN.md`
- `docs/vision/MASTER_TREE_SAFETY_PROPOSALS.md`
- `docs/vision/MASTER_TREE_SOVEREIGNTY_PROPOSALS.md`
- `docs/vision/MASTER_TREE_AUTONOMY_PROPOSALS.md`
- `docs/vision/MASTER_TREE_MISSING_BRANCHES.md`
- `docs/vision/MASTER_TREE_IMPROVEMENTS_SUMMARY.md`
- `docs/investor-package/EXECUTIVE_SUMMARY.md`, `PITCH_DECK_v1.md`, `P_AND_L_STATEMENT.md`, `LAUNCH_PLAN.md`, `MOU_RUDI.md`, `TERM_SHEET.md`, `PROFIT_DISTRIBUTION_MECHANICS.md`
**Classification:** CONFIDENTIAL

---

## §1 EXECUTIVE SUMMARY

### 1.1 Agency-first model rationale

Every dollar in the Platform is a dollar the Agency has already earned. That single sentence is the financial architecture of ZAAHI. The Dubai Mainland LLC (Agency) sells premium plots and off-plan floors today, on 2–5 % commission, using the platform Zhan has built at `zaahi.io`. The ADGM HoldCo (Platform) incorporates only after the first Agency deal closes, funded by a 70 % inter-company Service Fee out of Agency net profit, and scales on a 5–10 year horizon toward a Series A/B/C and IPO on ADGM.

The thesis is that two revenue timelines coexist:

- **Agency:** weeks from entity formation to first commission; predictable cashflow; Year 1 AED 7.8 M base case (12 premium land plots + 2 off-plan floor-level sales).
- **Platform:** months to years to meaningful revenue; 21 architected streams; Year 5 AED 60 M base case scaling to Year 10 AED 800 M.

Neither engine survives alone: the Agency without the Platform is just another Dubai brokerage, and the Platform without the Agency starves during the 3–5 year build-out to scale revenue. Together, the Agency funds the Platform until the Platform can fund itself — and then the Agency continues as the operational truth-layer that keeps the Platform honest about real deal flow.

### 1.2 Three-phase approach

| Phase | Months | Primary goal | Success criteria |
|:-:|:-:|---|---|
| **Phase 1 — Agency foundation** | 1–3 (Apr–Jul 2026) | Register entity · RERA licence · bank account · first deal pipeline of 3–5 deals | Dubai Mainland LLC registered · RERA broker card issued to Dymo · ENBD account active · Rudi's AED 1 M wired · first deal under MOU |
| **Phase 2 — Platform MVP** | 4–9 (Aug 2026–Jan 2027) | ADGM Platform entity · P0 safety + sovereignty shipped · core Master Tree sections LIVE | ADGM HoldCo incorporated · UAE Pass + MFA live · audit log live · PDPL compliance + DPO · Deal Engine v1 · Feasibility v2 · 3–5 deals closed |
| **Phase 3 — Scale** | 10–24 (Feb 2027–Apr 2028) | Platform public beta → GA · revenue diversification · second office | 15+ deals cumulative · Equinix DX1 migrated · 1 bank partnership live · DLD sandbox accepted · Abu Dhabi branch opened · Series A ready |

### 1.3 Success criteria per phase

**Phase 1 non-negotiables:** Dubai Mainland LLC active. Dymo holds RERA broker card. Corporate bank account opened at ENBD or ADCB. Rudi SAFE executed and AED 1 M wired. Videographer onboarded as first operational hire. Agency pipeline has 3–5 named prospects with dated next-actions.

**Phase 2 non-negotiables:** ADGM HoldCo incorporated. UAE Pass + MFA + audit log + PDPL Privacy Centre + incident runbook shipped (P0 safety). Anthropic zero-retention DPA signed (P0 sovereignty). Trademark applications filed (UAE MoE + WIPO). Deal Engine state machine live. Feasibility Calculator v2 live. First Agency deal closed and first 70 % Service Fee transferred to Platform.

**Phase 3 non-negotiables:** Master Tree passes 20 % LIVE (from current ~10.5 %). First bank partnership signed (ENBD or ADCB). DLD Real Estate Sandbox accepted. Abu Dhabi parcel listed (TAMM data partially integrated). Platform user base passes 1 000 MAU. Series A prep deck delivered to at least 5 VCs (Mubadala Capital, BECO, Class 5 Global, 4DX Ventures, DIFC FinTech Fund).

### 1.4 Critical path items

Eight items sit on the critical path — if any slips two weeks, the dependent chain slips with it:

1. **DED Mainland LLC formation submission** (Day 1, Mon Apr 21 2026). Gates everything else legal.
2. **RERA broker card for Dymo** (Week 2–5). Gates Agency operations.
3. **ENBD / ADCB corporate account** (Week 2–4). Gates escrow and commission receivables.
4. **Rudi SAFE execution + AED 1 M wire** (Week 3–4). Gates operational runway.
5. **First Agency deal closed** (Month 3). Gates ADGM Platform entity formation per MOU condition.
6. **ADGM HoldCo incorporation** (Month 4). Gates Platform Dev Fund routing + sovereignty work.
7. **UAE Pass integration** (Month 4–5). Gates government partnership conversations.
8. **Bank mortgage partnership (ENBD CRE)** (Month 5–7). Gates §22 mortgage widget and unlocks 2.5× buyer conversion.

Items 1–4 must ship in 4 weeks. Items 5–8 depend on 1–4 and run across months 3–8.

---

## §2 PHASE 1 — AGENCY FOUNDATION (Month 1–3, April 21 – July 15, 2026)

The north star of Phase 1 is the **first closed commission.** Everything that does not move a deal toward close is deprioritised. The playbook is conventional Dubai brokerage — register entity, get licences, open bank account, land first client — executed faster than convention because the platform at `zaahi.io` is already live and the team has Rudi's demo-committed capital waiting for entity completion.

### 2.1 Week 1 — April 21–27, 2026

**Theme:** Legal foundation. Two parallel tracks — corporate formation (Zhan + counsel) and relationship outreach (Dymo). No software work this week; everything is administrative.

#### Day 1 — Monday April 21

**DED Agency formation submission.**
- Responsible: Zhan (Founder/CEO/CTO) with UAE corporate formation agent.
- Action: submit Dubai Mainland LLC application via DED (Dubai Economy & Tourism, formerly Dubai Economy Department) e-service portal or via formation agent.
- Required documents checklist:
    1. Trade name reservation (3 proposed names: ZAAHI Real Estate LLC, ZAAHI Properties LLC, ZAAHI Brokerage LLC). AED 620 reservation fee (AED 600 + AED 20 knowledge/innovation).
    2. Initial approval application — confirms the business activity is permitted. AED 235.
    3. Business activity selection: real estate brokerage (activity code 681020) + real estate leasing (code 681010) + property management (code 681030). Since 2023 these permit 100 % foreign ownership.
    4. Shareholders resolution (Zhan / Dymo / Rudi — exact split 10/10/80 pre-Sunset per MOU).
    5. Passport copies + Emirates ID copies + passport photos (three shareholders).
    6. Memorandum of Association draft (lawyer-prepared — see Day 2–3).
- Cost breakdown (summary): trade name AED 620, initial approval AED 235, MoA notarisation AED 900, DED licence issuance (post-approvals) AED 12 950, external ministry approval (RERA add-on) AED 5 020, foreign company fee / establishment card AED 2 000, additional activities AED 1 000, immigration card AED 1 250, total approximately **AED 24 000** for initial setup. Annual renewal ~AED 18 000.
- Expected timeline: initial approval 3 working days; full trade licence issuance 2–3 weeks from today assuming no requisites. Fast-track via formation agent (e.g., Shuraa, Creation Business Consultants, VirtueZone) can compress to 7–10 working days for AED 5–8 k additional fee.
- Parallel work Day 1: Zhan registers UAE Pass as founder (required for all subsequent gov portals).

**Videographer retainer activated.** Per LAUNCH_PLAN, Dymo's videographer is the first operational hire at AED 10 k / month. Activate the retainer this week — first deliverables due Week 2.

#### Day 2 — Tuesday April 22

**UAE legal counsel engagement.**
- Responsible: Zhan + Dymo jointly (two calls, same day).
- Scope of engagement (three tiers):
    1. **Tier A — corporate formation** (highest priority, Week 1–3). MoA, shareholders' agreement reflecting the 80/10/10 → 33.34/33.33/33.33 Sunset rebalancing mechanic, Rudi SAFE (Post-Money SAFE per MOU), founders' vesting (2-year with 6-month cliff for Dymo and Zhan; Rudi fully vested).
    2. **Tier B — regulatory** (Week 3+). RERA licence filing, DLD activity card application, Trakheesi permit rulebook, PDPL privacy notice.
    3. **Tier C — ongoing** (Month 2+). Transaction contracts (MOU / SPA / POA templates in EN + AR + RU), IP registration (see Day 4 trademark), employment / contractor agreements, founder NDAs.
- Candidate firms (three quotes obtained):
    - **Al Tamimi & Company** — 580 lawyers, 17 MENA offices, founded 1989. Largest full-service commercial firm MENA. Premium pricing (estimate AED 80–150 k for Tier A + Tier B full bundle). Strength: relationships with every UAE regulator; weakness: slow turnaround at this price band for a 3-shareholder LLC.
    - **DLA Piper Middle East** — international firm with Dubai + Abu Dhabi offices. Mid-premium pricing (AED 60–120 k bundle). Strength: US / UK dual-qualified; useful if Rudi wants home-country wrap on SAFE. Weakness: not as locally connected as Al Tamimi on DED / RERA procedural nuance.
    - **BSA Ahmad Bin Hezeem & Associates** — mid-market UAE-bred firm, strong real estate bench. Lower pricing (AED 30–60 k bundle). Strength: price + practical RERA experience. Weakness: thinner international-transaction expertise for future Platform ADGM / Series A work.
- **Recommendation:** go with **BSA for Tier A+B** (cost-effective, RERA-deep) and **Al Tamimi on retainer for Tier C + ADGM Platform incorporation** once the first commission lands. AED 30–60 k Tier A+B + AED 10 k / quarter Tier C retainer from Month 2.
- Deliverable this week: engagement letter signed with BSA, scope + fee confirmed in writing.

**Supabase + Anthropic compliance hygiene (parallel same day, 4 hours of Zhan's time).**
- Email Anthropic enterprise sales (`enterprise-sales@anthropic.com`) requesting zero-retention Data Processing Addendum. Expected turnaround: 3–7 business days. Once signed, update API config to emit zero-retention header on all Archibald prompts. This closes the #1 P0 sovereignty item flagged in MASTER_TREE_SOVEREIGNTY_PROPOSALS §2.1.
- Verify Supabase region is `eu-central-1` Frankfurt (per `CLAUDE.md`); confirm backup retention at highest tier available (daily, 30 days). This is interim; sovereignty plan moves to UAE colocation Phase 2 in Q4 2026.

#### Day 3 — Wednesday April 23

**Legal engagement letter returned signed. BSA starts MoA + SAFE drafting.**
- Responsible: BSA lawyer (primary), Zhan reviews drafts nightly.
- BSA drafts turnaround: MoA ready for review Day 5 (Friday); SAFE ready Day 7–10. Parallel: shareholders' agreement with Sunset mechanic (80/10/10 → 33.34/33.33/33.33 auto-rebalance on earlier of AED 2 M cumulative Rudi distributions or 5 years).

**Dymo activates first three client conversations.**
- Targets:
    1. Jumeirah Bay Island HNWI (Russian-speaking, known to Dymo's Equilibrium network) — AED 45 M plot interest.
    2. Al Barari HNWI family office — AED 28 M plot, family considering fractional.
    3. Developer partnership — mid-tier Dubai developer exploring off-plan floor-level sale via Agency.
- Dymo's tool today is WhatsApp + the live `zaahi.io` demo. CRM integration comes in Phase 2.
- Each conversation produces a next-action date logged in a simple shared spreadsheet (`agency-pipeline.xlsx`, OneDrive) — the CRM-before-CRM.

#### Day 4 — Thursday April 24

**Trademark filing starts.**
- Responsible: Zhan + IP counsel (either BSA IP team or a specialist such as Rouse / AJA / Dennemeyer).
- Filings:
    1. UAE Ministry of Economy — "ZAAHI" and "Zaahi" in Class 9 (software / SaaS), Class 36 (real estate, insurance, financial), Class 41 (education), Class 42 (technology services / SaaS hosting). Estimated fees AED 60–120 k across all classes including counsel.
    2. WIPO Madrid Protocol extension from UAE base — adds US, UK, EU, KSA, India at one submission. AED 40–80 k.
- Timeline: UAE MoE 2–4 month examination; WIPO 12–18 months for full coverage. Priority date establishes from filing day, so every day of delay is a day of competitor priority risk.
- This addresses P0 Sovereignty §7.1 (trademark registration).

**Corporate bank account prep (parallel).**
- Responsible: Zhan + formation agent.
- Four banks receive account-opening intake forms simultaneously (standard UAE practice — 2–3 approve, 1–2 decline for obscure AML reasons):
    1. **Emirates NBD** (ENBD) — preferred; strongest Commercial Real Estate team; Dymo has prior relationship.
    2. **ADCB** — strong alternative; good for Abu Dhabi exposure.
    3. **FAB** — largest balance sheet; potentially strongest for Agency escrow at scale.
    4. **Mashreq Bank** — excellent fintech-friendly interface; useful for Platform entity later.
- Submission requires: Dubai Mainland LLC trade licence (not yet issued — can submit conditional application), MoA draft, passports + Emirates IDs, shareholder KYC, business plan summary, 12-month cash flow projection (derivable from P_AND_L_STATEMENT.md base case).
- Expected timeline: 4–8 weeks from full submission (bank KYC is slow in UAE; 2024–2025 cycle lengthened further due to AML Federal Law No. 10/2025 compliance overhead).

#### Day 5 — Friday April 25

**MoA draft review + correction cycle with BSA.**
- Zhan reviews with Rudi by email (Rudi in Al Jurf, reachable by phone).
- Critical MoA clauses to lock:
    1. Shareholders 80 % Rudi / 10 % Dymo / 10 % Zhan (matching MOU).
    2. Sunset rebalance trigger language: earlier of (a) AED 2 M cumulative Rudi distributions OR (b) 5 years. Must be self-executing (no need for new shareholder resolution when trigger fires).
    3. Reserved Matters — categories requiring 2-of-3 shareholder vote post-Sunset + Rudi unilateral pre-Sunset (anti-dilution protection).
    4. Profit distribution — 70 % Platform Dev Fund / 10 % Rudi / 10 % Dymo / 10 % Zhan, fixed for lifetime, pre- and post-Sunset.
    5. Information rights — monthly financials, quarterly deep-dive, 48-hour material-event notices.
    6. Board composition — three directors (Rudi / Dymo / Zhan); simple majority at Board; Reserved Matters escalate to shareholder vote.
    7. Transfer restrictions — drag-along / tag-along / right-of-first-refusal.

**Agency pipeline document locked.**
- Responsible: Dymo.
- One-pager tracking: prospect name, plot of interest, budget, language, status, next action, date. Shared OneDrive. Serves as the Agency's operational source of truth until a proper CRM is live in Phase 2.

#### Day 6 — Saturday April 26

**LinkedIn activation for both founders.**
- Zhan: profile refresh emphasising Founder/CEO/CTO of ZAAHI, 17 years real estate + full-stack engineering. Post #1 — short announce of the Al Jurf MOU (no financial detail; relationship-level recognition of Rudi).
- Dymo: profile refresh emphasising Co-founder + Ambassador + Guardian Partner, Equilibrium Advisory Group partner, 18+ years global operations. Post #1 — about the vision of ZAAHI, in a warm, narrative tone.
- Neither founder posts more than once per week for Month 1 — scarcity builds curiosity. Cadence ramps to 2–3 / week by Month 3.

**Videographer content plan — 12-month outline.**
- Dymo + videographer meet Saturday morning. Output: a 12-month themed plan aligned with LAUNCH_PLAN.
- Month 1 (May): ZAAHI origin story + 3D platform demo (4-min master + 60s / 15s cuts).
- Month 2–3: first-plot video walkthrough (per first listing).
- Month 4–6: developer pitch videos, feasibility-calculator explainers.
- Month 7–12: closed-deal case studies + ambassador stories + quarterly market reports.

#### Day 7 — Sunday April 27

**Rest + strategic review.**
- Zhan + Dymo + Rudi dinner in Al Jurf (informal). Purpose: confirm alignment on Week 2 priorities, surface any surprises, reset emotional state before the execution-heavy weeks ahead.
- Deliverable: 3 top priorities for Week 2 written on paper over dinner. File in `docs/decisions/`.

### 2.2 Week 2 — April 28 – May 4, 2026

**Theme:** Regulatory approvals + banking + brand.

#### Monday April 28
- **DED initial approval certificate expected** (3 working days after Day 1 submission). On receipt, RERA broker licence application starts via Trakheesi portal.
- **RERA broker licence application for Dymo** (Dymo holds RERA credentials from his Equilibrium career; validate current status; apply for Dubai Mainland LLC BRN allocation).

#### Tuesday–Wednesday April 29–30
- **Bank account applications submitted** (ENBD + ADCB + FAB + Mashreq, four in parallel). Formation agent sends conditional applications; full submission upon trade licence.
- **Office virtual address Dubai** — Dubai Mainland LLCs require a physical registered address with Ejari-registered tenancy. Options:
    1. **IFZA or DMCC registered office package** — ~AED 6–10 k / yr, satisfies Ejari.
    2. **Al Jurf co-working** — Dymo's current base; if zoned for commercial use, can serve.
    3. **Business Centre in Business Bay / DIFC-adjacent** — AED 25–50 k / yr; premium address; signals seriousness.
- **Recommendation** from LAUNCH_PLAN: Al Jurf home-office AED 250 k / yr — but this is for operations, not for the registered DED address. Use a virtual office package AED 6–10 k / yr for DED registration; operational HQ remains Al Jurf.

#### Thursday–Friday May 1–2
- **SAFE negotiation final review.** BSA SAFE draft returned. Rudi's counsel reviews. Turnaround goal: Signature by Friday May 2.
- **Trade licence issuance** (expected per DED 2-3 week timeline — may arrive this week or early Week 3).

#### Weekend May 3–4
- **Website brand polish on zaahi.io** — no new features, only brand hygiene: updated "About" page, updated Founder profiles, legal / privacy / terms pages referencing the new Dubai Mainland LLC entity name (once trade licence issued). Zhan: 4-6 hours of Saturday work.

### 2.3 Week 3 — May 5–11, 2026

**Theme:** SAFE execution + first bank account + brand launch (soft).

#### Monday May 5
- **SAFE executed.** Rudi signs; founders counter-sign. Rudi wires AED 1 M to the escrow account (placeholder — Rudi's UAE legal counsel trust account until the corporate bank account is live).
- **Trade licence issued** (if not earlier). BSA confirms. Now unlocks: formal bank account opening, RERA broker card issuance, Ejari registration, VAT registration (threshold check: above AED 375 k annual turnover, CT applies — on track Y1).

#### Tuesday–Thursday May 6–8
- **First bank account active** — most likely ENBD based on prior Dymo relationship. AED 1 M from Rudi's escrow transfers to Agency corporate account. Operational runway begins.
- **RERA broker card for Dymo** — Dymo's BRN linked to the new Dubai Mainland LLC. Issued via Trakheesi. AED 520 card fee. Now Dymo can legally facilitate property transactions as an agent of the new LLC.
- **Trakheesi permit rulebook internalised** — every future ZAAHI listing must carry a Trakheesi permit number. Auto-Trakheesi integration is planned for Phase 2 autonomy (see MASTER_TREE_AUTONOMY_PROPOSALS §3.2); in Phase 1 it's manual via Trakheesi portal.

#### Friday May 9
- **First Agency prospecting week — close of week checkpoint.**
    - Dymo target: 5 live conversations, 2 scheduled viewings in next 7 days.
    - Reality check: if <3 live conversations at end of Week 3, escalate — is the post-MOU narrative landing? If not, reconvene Zhan + Dymo + Rudi to refine pitch.

#### Weekend May 10–11
- **ZAAHI soft-launch moment.** Zhan + Dymo post synchronised LinkedIn updates: "ZAAHI Real Estate LLC is now live. Premium Dubai plots, 3D-first. 114 verified parcels at zaahi.io. Let's talk." Dymo in English + Russian + Ukrainian. Zhan in English. First small public signal — not a full launch (that comes at Platform GA, Month 12+).

### 2.4 Week 4 — May 12–18, 2026

**Theme:** Pipeline acceleration + formal SAFE execution confirmation + first scheduled viewings.

- Pipeline of 3–5 active deals with dated next-actions.
- Two HNWI viewings scheduled Week 4–5. Videographer shoots at least one viewing for Month 2 content drop.
- All four banks have responded; at least one account operational. FAB's response often takes longest; Mashreq fastest.
- First 70 % Service Fee mechanic test — BSA drafts the inter-company Service Fee Agreement template, ready to deploy once ADGM HoldCo incorporates.

End of Week 4 scorecard:

| Criterion | Target | Red/Yellow/Green flag |
|---|:-:|:-:|
| Dubai Mainland LLC registered | Y | 🟢 |
| RERA broker card for Dymo | Y | 🟢 |
| Corporate bank account active | Y | 🟢 |
| SAFE executed + AED 1 M received | Y | 🟢 |
| Agency pipeline (named prospects) | ≥5 | 🟢 if 5+, 🟡 if 3–4, 🔴 if <3 |
| Videographer shooting | Y | 🟢 |
| Trademark applications filed | Y | 🟢 |
| Anthropic zero-retention DPA signed | Y | 🟢 |
| First viewing scheduled | Y | 🟢 |

If 2 or more flags are Red, Week 4 triggers a founder-Board review. Rudi is informed within 48 hours.

### 2.5 Month 2 — May 19 – June 15, 2026

**Theme:** Deal execution discipline. Pipeline deepens. Videographer ships content. Platform build quiet (no shipping; Zhan's bandwidth reserved for deal support).

#### Week 5 — May 19–25
- **HNWI viewing Week 1** — Jumeirah Bay Island plot. Videographer captures 60-second drone + 3D cut.
- **Second viewing scheduled** — Al Barari plot.
- **Ambassador first sign-up target** — first Gold-tier Ambassador (AED 5 k USDT) from Dymo's network warms up this week.

#### Week 6 — May 26 – June 1
- **Second HNWI viewing.** Offer structuring begins on the first plot — AED 45 M client signals interest around AED 40 M range.
- **Developer partnership first meeting.** Mid-tier developer (not DAMAC/Emaar tier — too big) exploring off-plan floor-level sale. Commission potential AED 800 k – 1.5 M on a AED 20–40 M floor deal. Feasibility Calculator v1 used in the meeting.

#### Week 7 — June 2–8
- **First offer submitted** on Plot 1 (Jumeirah Bay). Form F (MOU) drafted by Archibald, reviewed by BSA, sent. Seller counter-offers.
- **Second Ambassador sign-up.** Silver-tier (AED 1 k) from a Dymo referral.

#### Week 8 — June 9–15
- **Negotiation cycle on Plot 1** — expected close in late June per LAUNCH_PLAN. Buyer deposits AED 400 k into escrow (agency account or Form F escrow depending on structure).
- **First weekly investor update to Rudi** — format locked (see §9 below): P&L snapshot, pipeline, risks, next 7 days. Rudi gets this every Sunday evening from now on.

End of Month 2 scorecard:

- Agency pipeline: ≥ 5 active deals, 2 with offers in, 1 in late-stage negotiation.
- First commission expected in Month 3.
- Videographer content: 3 master videos + ~12 short cuts published across LinkedIn + IG.
- Ambassador sign-ups: 2–4 paid tiers active.
- Cash position: AED ~850 k remaining (after Month 1 legal/formation ~AED 60 k + Month 2 ops ~AED 40 k + videographer AED 20 k + office / misc AED 30 k). Runway: 6+ months at current burn even before first commission.

### 2.6 Month 3 — June 16 – July 15, 2026

**Theme:** First close. Platform entity triggered. Content scales.

#### Week 9 — June 16–22
- **Plot 1 negotiation closes at AED 39.5 M** (base case from VISION_CLARITY §3.1). Commission AED 790 k at 2 %.
- **Form F signed, deposit confirmed, NOC process starts.** Per Deal Engine §31: Initiated → Deposit Pending → Deposit Received → Agreement Signed → Documents Collection → Gov Verification → NOC Pending → Transfer Fee Payment → DLD Submission → Completed.
- **Second deal negotiation intensifies** on Plot 2 (Al Barari, ~AED 28 M, AED 560 k commission at 2 %).

#### Week 10 — June 23–29
- **NOC received on Plot 1** (typical 3–7 days from DLD). Transfer fee preparation — 4 % of AED 39.5 M = AED 1.58 M, paid by buyer at DLD submission.
- **Off-plan floor deal moves into negotiation** with mid-tier developer. Target close: Month 4–5.

#### Week 11 — June 30 – July 6
- **DLD submission Plot 1.** Transfer fee wired. DLD issues title deed transfer. Agency receives commission AED 790 k net of any split with buyer's broker (if buyer had own broker; Dymo's deal was direct so full 2 % lands). Assume AED 790 k gross.
- **Platform entity formation triggered per MOU** — "ADGM HoldCo (Platform) incorporated upon first closed deal." BSA initiates ADGM Registration Authority (RA) filing in parallel.

#### Week 12 — July 7–13
- **First commission hits Agency bank account.** AED 790 k.
- **First 70 % Platform Service Fee invoiced** — AED 790 k × 70 % = AED 553 k routed to ADGM HoldCo treasury once incorporated (delayed 3–6 weeks per ADGM incorporation timeline).
- **First quarterly distribution to shareholders per MOU:**
    - Total distributable Agency Q1 profit (after CT reserve): estimate AED 500 k of the AED 790 k (conservative).
    - Rudi 10 % = AED 50 k, Dymo 10 % = AED 50 k, Zhan 10 % = AED 50 k.
    - Platform Dev Fund 70 % = AED 350 k — seed capital for Platform build starting Month 4.
    - **But MOU notes "Base-case Financial Trigger timing: mid-Year 3."** So these distributions are tiny relative to Sunset trigger (AED 2 M cumulative to Rudi). On track.

#### Week 13 — July 14–15 (overlap into Month 4)
- **Plot 2 closes** (Al Barari AED 28 M, commission AED 560 k at 2 %).
- **Month 3 cumulative Agency revenue:** ~AED 1.35 M.
- **ADGM HoldCo incorporation in progress** — expect completion Week 16 (Month 4).

End of Phase 1 scorecard (Month 3):

| Criterion | Target | Reality anticipated | Status |
|---|:-:|:-:|:-:|
| Agency formed + licensed | Y | Y | 🟢 |
| Pipeline | 3–5 named | Likely 6–8 | 🟢 |
| Deals closed | 1 | 1–2 (Plots 1 + Al Barari) | 🟢 |
| Revenue cumulative | AED ~800 k | AED ~1.35 M | 🟢 (above base) |
| Platform Dev Fund started | — | AED ~550–900 k accrued | 🟢 |
| Rudi runway remaining | — | AED 700–800 k + deal-funded | 🟢 |
| Videographer content | 3–5 pieces | 5+ pieces | 🟢 |
| Ambassador sign-ups | 2–5 | 3–7 | 🟢 |
| ADGM HoldCo incorporation | Started | In progress | 🟡 (expected complete Month 4) |

---

## §3 PHASE 2 — PLATFORM MVP (Month 4–9, July 16 2026 – January 15 2027)

Phase 2 purpose: use the Agency's emerging cash flow to fund Platform build and ship the P0 items that make ZAAHI credible to the counterparties (banks, governments, sovereign investors) Phase 3 will depend on. Agency continues to close deals — 2–3 more in Phase 2 per LAUNCH_PLAN base case.

### 3.1 Month 4 — July 16 – August 15, 2026

**Platform entity incorporation + P0 safety + sovereignty sprint.**

Shipping milestones (aligned with previous research docs):

| Item | Source doc | Effort | Owner |
|---|---|---|---|
| ADGM HoldCo incorporation complete | MOU | 4–6 weeks | BSA + Zhan |
| ADGM Services Fee Agreement executed (Agency → Platform 70 %) | Investor package | Week 16 | BSA |
| Anthropic zero-retention DPA implementation verified in production | Sovereignty §2.1 | 4 hours | Zhan |
| UAE Pass integration Phase 1 (OIDC + signup tab) | Sovereignty §4.1, Safety §2.1 | 4 eng-weeks | Zhan |
| Passkeys / WebAuthn | Sovereignty §4.3, Safety §2.1 | 3 eng-weeks | Zhan |
| Audit log table + `logAudit()` helper + admin view | Safety §3.1 | 2 eng-weeks | Zhan |
| Incident response runbook + status page | Safety §4.3, §4.4 | 1 eng-week | Zhan |
| Security headers + HSTS + CSP report-only | Safety §1.2, §1.3 | 1 eng-week | Zhan |
| PDPL Privacy Centre (right to deletion / access / portability) | Safety §1.6 | 4–6 eng-weeks | Zhan |
| DPO engagement (external retainer) | Safety §1.6, §5.1 | Founder time | Dymo |
| Gitea UAE mirror | Sovereignty §6.1 | 1 eng-week | Zhan |
| Dependabot + pnpm audit in CI | Safety §3.4 | 2 eng-days | Zhan |
| Rate limiting per route per tier | Safety §2.3 | 1 eng-week | Zhan |
| Zod validation sweep | Safety §2.4 | 2 eng-weeks | Zhan |
| Trademark applications in examination (not shipped, monitoring) | Sovereignty §7.1 | — | Counsel |

Total engineering effort Month 4: ~20 engineer-weeks compressed into 4 calendar weeks via weekend work and parallel tracks. Zhan maintains ~30 % bandwidth on deal support (as-needed), ~70 % on shipping.

### 3.2 Months 5–6 — August 16 – October 15, 2026

**Core Master Tree sections live + first bank partnership warming.**

Shipping milestones (aligned with `docs/roadmap/POST_MEETING_BUILD_PLAN.md`):

| Item | Rank in Build Plan | Effort | Revenue unlock |
|---|:-:|---|---|
| §31 Deal Engine state machine + DLD-ready Form F generator | A1 | 3–4 eng-weeks | Every deal flows automatically |
| §58 Feasibility Calculator v2 | A2 | 2–3 eng-weeks | Developer deal AED 1.2 M commission |
| A5 Ambassador dashboard polish + leaderboard | A5 | 1 eng-week | Viral loop unlock |
| §17 / §18 Broker CRM + tier-gated content | B3 | 1 eng-week + content | Subscription moat |
| §66 Market Intelligence — DLD transaction overlay | A4 + C1 | 2–3 eng-weeks | AED 600 k / yr subscription path |
| §48 Long-tail SEO per plot + schema.org + sitemap | B5 | 2 eng-weeks | Free lead generation |
| §47 Notification Engine (Twilio SMS + Resend email + Telegram bot) | — | 2 eng-weeks | Deal transparency |
| §69 Fraud detection extended — Cat flags + doc forgery AI | — | 2 eng-weeks | AML defensibility |
| Support chatbot v1 (autonomy §1.10) | Autonomy §1.10 | 3 eng-weeks | AED 450 k / yr cost save |
| §63 Compliance outline (AML KYC) | — | 2 eng-weeks | Bank partnership blocker cleared |

Partnership tracks (Dymo primary, Zhan support):

- **ENBD CRE conversation** — 3-meeting cadence (intro → working session on API spec → MOU draft). Target: MOU signed Month 6.
- **DLD Real Estate Sandbox application** — submit Week 17 (Month 4); accepted Month 6–7. Target: plot-level tokenisation track (adjacent to PRYPCO's ready-property track).
- **LeadingRE membership application** — submit Month 5; onboarding Month 6.
- **UAE Pass + TAMM (Abu Dhabi) relationship** — informal exploratory Month 5, formal Month 6+.

Agency deals Phase 2:

- Month 4: off-plan floor deal closes (AED 25 M deal, 3–5 % commission = AED 750 k – 1.25 M).
- Month 5–6: one more premium plot deal (AED 35 M, commission AED 700 k at 2 %).
- Month 6–7: possibly second off-plan floor deal.

End of Month 6 cumulative revenue estimate: **AED 3.0 – 4.0 M** (vs base case annualised run-rate AED 7.8 M, on-track).

### 3.3 Months 7–9 — October 16, 2026 – January 15, 2027

**Top autonomy wins + local LLM + transfer pricing + deal velocity.**

Shipping:

| Item | Source | Effort |
|---|---|---|
| Market reports automation (weekly / monthly / quarterly) | Autonomy §5.2 | 4 eng-weeks |
| Buyer qualification agent v2 (BANT + lead routing) | Autonomy §1.3 | 4 eng-weeks |
| Content gen 6-lang for property descriptions | Autonomy §1.6 | 2 eng-weeks |
| Auto-detect new developments (satellite + web) | Autonomy §2.3 | 4 eng-weeks |
| Mistral fallback AI provider + provider abstraction | Sovereignty §5.1 | 2 eng-weeks |
| Local LLM production routing (Qwen + Llama) | Sovereignty §2.3 Phase 2 | 4 eng-weeks |
| Column encryption for sensitive PII fields | Safety §1.1 | 2 eng-weeks |
| Self-service broker onboarding (UAE Pass + Tronscan + RERA scrape) | Autonomy §3.1, §1.4 | 4 eng-weeks |
| Network International payment gateway integration | Sovereignty §3.3 Phase 1 | 4 eng-weeks |
| Transfer Pricing study commissioned (Big 4) | Safety §5.4 | External — 3 mo cycle |
| ENBD mortgage MOU signed + pre-approval widget pilot | Build Plan A3/B1/C4 | 10–12 eng-weeks |
| First pen test engagement | Safety §3.5 | 2 weeks execution + 4 weeks remediation |

Agency deals: 2–3 more in Phase 2 tail, targeting **cumulative 6–8 deals** at end of Month 9.

End of Month 9 cumulative Agency revenue estimate: **AED 5.0 – 6.5 M**. ADGM Platform Dev Fund (70 % of Agency profit) accrued: AED 1.5 – 2.5 M — enough to continue platform build without additional Rudi capital.

---

## §4 PHASE 3 — SCALE (Month 10–24, January 16 2027 – April 21 2028)

Phase 3 purpose: Platform transitions from private beta → public GA. Agency scales team. Geographic expansion begins (Abu Dhabi first). Revenue diversifies across Platform tier subscriptions + ambassador downline + data licensing.

### 4.1 Q4 2026 / Jan 16 – April 15, 2027 (Months 10–12)

**Master Tree v3.1 extensions + infrastructure migration + tokenisation readiness.**

- **After-sale / Property Management research begins** — Missing Branches §5. Product owner hired (first non-founder hire beyond videographer; could be a Chief of Staff / Head of Product candidate). Scope: partnership landscape (Asteco, Cushman, ServeU, Justmop, Matic), architecture for §13.1–§13.7.
- **Cross-border branch architecture** — Missing Branches §7. Partnerships scoped: Mashreq International, HSBC Expat, Wise Business, Charles Russell Speechlys (private client).
- **Equinix DX1 hardware migration** (Master Tree §50, aligned with Sovereignty §1.3 Phase 3). ~AED 600–800 k CapEx. 16 eng-weeks execution. Sets up DC2 Abu Dhabi / Bahrain for Q3 2027.
- **VARA tokenisation readiness** — DIFC counsel engaged; smart contract audit commissioned; plot tokenisation pilot candidate identified (single AED 50 M premium plot, AED 50 k fractional ticket).
- **Fine-tune ZAAHI-RE-v1** kicks off (Sovereignty §5.3 Phase 3) — data accumulation is sufficient (5 000+ Archibald interactions, 50+ deal documents, 114 + growing parcel records).
- **Agency deals: 5–10 cumulative by Month 12** — on base case trajectory to hit AED 7.8 M Y1 revenue target. LAUNCH_PLAN's "12 premium plots + 2 off-plan floors" specifically expected by end Month 12; actual performance likely 10–12 total deals.

### 4.2 Q1–Q2 2027 / April 16 – October 15, 2027 (Months 13–18)

**Platform public beta → GA. Cross-border phase 1 live. ZAAHI Academy launches.**

- **Platform public launch (GA)** — April 2027. Marketing push via Dymo network + Ambassador-amplified reach + PR. Target: 10 000 signups in first 90 days; 1 000 MAU by end Q2 2027.
- **Cross-border Phase 1** — mortgage routing (Mashreq International partnership), FX (Wise Business + Revolut Business embed), tax advisor marketplace (Charles Russell + Crowe UAE + KPMG Private Client referrals). Revenue potential Month 18+: AED 300 k – 1 M / yr initial; scales.
- **ZAAHI Academy launches** — 3 tracks (Broker / Investor / Developer). Partnership with DREI (Dubai Real Estate Institute) for RERA prep. Dymo + videographer produce hero content. First 100 students Q2 2027.
- **Fine-tune ZAAHI-RE-v1 ships to production** — Q2 2027. 40–60 % inference cost savings vs Claude-only path. Strategic sovereignty moment.
- **First tokenised plot pilot live in DLD sandbox** — single plot, AED 50 k ticket, 1 000 fractional shares. Press moment: "ZAAHI becomes second DLD-sandbox tokenisation platform, first for land plots."
- **Agency deals: 15–20 cumulative by Month 18.** Rudi cumulative distributions approach AED 1.5 M — Sunset Financial Trigger (AED 2 M) now visible on horizon.

### 4.3 Q3–Q4 2027 / October 16, 2027 – April 15, 2028 (Months 19–24)

**After-sale / Property Management live. Scale team. Second office.**

- **After-sale module v1 ships** — facilities management partnership (Asteco / ServeU), maintenance marketplace (Justmop / Matic), renovation financing (Mashreq). Revenue Month 20+: AED 500 k – 1.5 M / yr initial.
- **Scale agent team to 5–8 Dubai agents + 2–3 Abu Dhabi agents** (post-TAMM live). Agency revenue annualised run-rate: AED 12–18 M / yr.
- **Abu Dhabi branch opens** — Al Maryah Island or Yas Mall address. 2–3 agents. Aligned with Master Tree §7 geographic expansion.
- **Agency Sunset evaluation** — Month 22–24: cumulative Rudi distributions expected AED 1.8 – 2.2 M. Financial Trigger likely fires Month 23–25 (per investor package base case mid-Year 3 timing is conservative; actual may be earlier).
- **Series A preparation** — pitch deck v2, P&L v2, competitive moat update, investor outreach (Mubadala Capital, BECO, Class 5 Global, 4DX Ventures, DIFC FinTech Fund). Target first-close Month 28 or later; Phase 3 prepares only.

End of Month 24 scorecard:

| Criterion | Target | Status |
|---|:-:|:-:|
| Dubai Mainland Agency | Active, 8-10 agents | 🟢 |
| Platform public GA | ≥ 1 000 MAU | 🟢 |
| Master Tree LIVE % | 20%+ sections | 🟢 |
| Bank partnership | 1+ signed | 🟢 |
| DLD sandbox | Accepted + 1 tokenised plot | 🟢 |
| Abu Dhabi branch | Opened | 🟢 |
| Cumulative Rudi distribution | ≥ AED 2 M (Sunset trigger) | 🟢 or 🟡 |
| Series A prep | Deck + pipeline ready | 🟢 |

---

## §5 CRITICAL PATH DEPENDENCIES

### 5.1 Dependency table

| # | Item | Blocks | Blocked by | Earliest start | Latest finish |
|:-:|---|---|---|:-:|:-:|
| 1 | DED Mainland LLC formation submission | 2, 3, 5, 6, 7 | — | Apr 21 | Apr 21 (Day 1) |
| 2 | DED initial approval | 3 | 1 | Apr 24 | Apr 28 |
| 3 | Trade licence issued | 4, 5, 6 | 2 | May 5 | May 12 |
| 4 | MoA + SAFE executed | 5 | 3 + BSA drafting | May 5 | May 8 |
| 5 | Rudi AED 1 M wired | 6 | 4 | May 8 | May 12 |
| 6 | Corporate bank account (ENBD) | 7, 12 | 3, 5 | May 8 | Jun 12 |
| 7 | RERA broker card for Dymo | 8 | 3 | May 5 | May 22 |
| 8 | First viewing + offer | 9 | 7 | May 18 | Jun 15 |
| 9 | First deal closed | 10, 11 | 8 + seller + NOC | Jun 20 | Jul 15 |
| 10 | ADGM HoldCo incorporation | 11, 12, 16 | 9 (MOU condition) | Jul 8 | Aug 20 |
| 11 | Services Fee Agreement | 12 | 10 | Aug 5 | Aug 20 |
| 12 | First 70 % Service Fee transfer | 13 | 11 | Aug 20 | Aug 31 |
| 13 | Platform build capital available | 14, 15 | 12 | Aug 31 | Sep 15 |
| 14 | P0 safety + sovereignty ship | 15, 17 | 13 | Sep 1 | Oct 15 |
| 15 | UAE Pass integration live | 16, 17 | 14 | Oct 1 | Oct 30 |
| 16 | Gov partnership conversations serious | 17 | 15 | Oct 15 | Dec 15 |
| 17 | ENBD mortgage MOU signed | 18 | 16 | Nov 1 | Jan 15 |
| 18 | Mortgage widget live on plot pages | — | 17 | Dec 15 | Mar 1 |

### 5.2 Critical path visualisation

The visual dependency map is in `docs/roadmap/DEPENDENCIES_MAP.md` (separate deliverable).

Shortest critical path to first bank partnership live on platform: **36 weeks** (Apr 21 → Dec 30, if every dependency ships on schedule). Realistic with 2-week buffer at each node: **44 weeks** (Apr 21 → Feb 26, 2027).

### 5.3 Parallel tracks

Four tracks run in parallel so no single founder is the choke point:

- **Track A — Legal/Regulatory** (BSA + Zhan): DED → trade licence → RERA → trademark → Trakheesi → ADGM. Single-threaded, calendar-bound.
- **Track B — Commercial** (Dymo): prospecting → viewings → offers → closings. Single-threaded but high-activity; Dymo's primary daily work.
- **Track C — Engineering** (Zhan): Platform shipping. Single-threaded; Zhan's primary work when not supporting deals.
- **Track D — Brand/Content** (Dymo + videographer): 12-month content plan, LinkedIn, quarterly reports. Weekly cadence.

When Track B has a hot deal, Zhan diverts from Track C to support (especially Form F / negotiation tech-side). This is expected — Agency revenue is the Phase 1 priority.

### 5.4 Risk mitigation on critical path

Each critical-path node has a mitigation:

- DED formation delay → fast-track via formation agent (Shuraa / Creation / VirtueZone) adds AED 5–8 k to save 1 week.
- RERA card delay for Dymo → Dymo's existing RERA credentials (from Equilibrium) can be transferred in parallel to new BRN issuance, avoiding gap.
- Bank account delay → 4 banks applied simultaneously; at least 1 approves within 4 weeks.
- First-deal delay → pipeline of 5 deals, expected 1 close within 2 months at typical Dubai HNWI deal cycle.
- ADGM incorporation delay → BSA starts filing Week 12 (in parallel with first-deal negotiation); even if deal slips 2 weeks, ADGM arrives on time.
- UAE Pass partnership delay → exploratory application starts Month 3 regardless of formal engagement date. First OIDC registration often takes 4–8 weeks.
- Bank MOU delay → 3 banks approached in parallel (ENBD + ADCB + Mashreq); at least 1 signs within 6 months.

---

## §6 RESOURCE ALLOCATION

### 6.1 Human resources — founder time split

**Zhan (Founder/CEO/CTO, full-time).**

| Phase | Strategic | Engineering | Admin / Finance | Deal support |
|:-:|:-:|:-:|:-:|:-:|
| Phase 1 (Month 1–3) | 30 % | 15 % | 35 % (formation, legal, bank) | 20 % |
| Phase 2 (Month 4–9) | 15 % | 65 % | 10 % | 10 % |
| Phase 3 (Month 10–24) | 25 % | 50 % | 10 % | 15 % |

**Dymo (Co-founder, Ops Principal, Ambassador, full-time).**

| Phase | BD / Sales | Content / Brand | Operations | Partnerships |
|:-:|:-:|:-:|:-:|:-:|
| Phase 1 | 60 % | 10 % | 20 % | 10 % |
| Phase 2 | 40 % | 15 % | 20 % | 25 % |
| Phase 3 | 35 % | 20 % | 15 % | 30 % |

**Videographer (AED 10 k / month per LAUNCH_PLAN).**
- Month 1: onboarding + 12-month content plan + pilot content.
- Month 2–3: first listing videos + founder stories.
- Month 4+: full content cadence per plan.

### 6.2 Future hires (trigger events)

Hire when a specific trigger fires — not before:

| Role | Trigger | Month (expected) | Budget |
|---|---|:-:|---|
| Videographer | Day 1 | Month 1 (now) | AED 120 k / yr |
| Chief of Staff / Head of Product | 2nd agency deal closed + Platform bandwidth request from Rudi | Month 6–8 | AED 240–360 k / yr |
| 2nd engineer | Platform Dev Fund ≥ AED 1 M AND Zhan at 80 % capacity | Month 8–10 | AED 300–480 k / yr |
| 3rd agent (Dubai) | Agency pipeline > 10 active, Dymo at 90 % capacity | Month 6–9 | AED 180 k base + commission split |
| DPO (external retainer) | Platform user base crosses 1 000 | Month 4 | AED 120 k / yr |
| Community manager | 50+ Gold ambassadors active | Month 12–15 | AED 180 k / yr |
| Abu Dhabi agent | Abu Dhabi licence active | Month 18–24 | AED 180 k base + commission |

### 6.3 Capital deployment

**Monthly burn estimate (Phase 1):**

| Line | AED / month |
|---|---:|
| Videographer | 10 000 |
| Office (virtual AED 600 + Al Jurf operational) | 3 000 |
| Software subscriptions (Vercel, Supabase, Anthropic, Mapbox, misc) | 5 000 |
| Legal (BSA retainer from Month 2) | 10 000 |
| Accounting / bookkeeping | 5 000 |
| Misc (travel, meetings, comms) | 10 000 |
| **Total Phase 1 burn** | **~AED 43 000** |

Rudi AED 1 M runway: ~23 months at Phase 1 burn alone (excluding formation one-time AED 60 k, legal one-time AED 50 k, trademarks AED 100 k).

**One-time Phase 1 costs (~AED 300 k):**
- Entity formation + trade licence + RERA + Ejari: ~AED 60 k.
- Legal (BSA Tier A + B): ~AED 50 k.
- Trademark UAE + WIPO: ~AED 100 k (Class 9/36/41/42 UAE + Madrid).
- Miscellaneous setup (accounting system, equipment, contingency): ~AED 90 k.

**Expected Month-3 cash position:** AED 1 M – AED 300 k (one-time) – AED 130 k (3 months burn) + AED 790 k (first commission gross) – AED 350 k (70 % Platform fee accrued, not yet cash-out) = **AED 1.0–1.4 M** in Agency, plus ~AED 350 k in Platform Dev Fund accrual.

Phase 2 burn ramps to ~AED 80–100 k / month (Chief of Staff + 2nd engineer starts + higher OpEx). Agency cash flow from deal 3–6 funds it.

### 6.4 Time budget guardrail

`CLAUDE.md` rule: "Единственная метрика — платящий пользователь." Every week, each founder answers: what did I do that moved a paying user closer to payment? Bookkeeping that doesn't answer that question is admin slack, not progress.

---

## §7 KPI TRACKING

### 7.1 Agency KPIs (Y1 focus)

| KPI | Frequency | Target Y1 | Measurement |
|---|:-:|---|---|
| Deals in pipeline | Weekly | ≥ 5 active | Spreadsheet / CRM |
| Deals closed | Monthly | ≥ 12 plots + 2 floors | Supabase `Deal` status |
| Commission per deal (avg) | Per deal | AED 450 k plot / AED 1.2 M floor | Per deal log |
| Gross commission (monthly) | Monthly | AED 650 k average | Bank reconciliation |
| Client acquisition cost | Monthly | AED 20–40 k | Deal-level tracking |
| Time to close (first-contact → commission) | Per deal | 60–90 days | Deal log |
| Pipeline conversion | Monthly | 20–30 % | Closed / active |
| Viewing → offer rate | Monthly | 40 %+ | Viewing log |
| Offer → close rate | Monthly | 50 %+ | Offer log |

### 7.2 Platform KPIs (Y2+)

| KPI | Frequency | Target Y2 | Measurement |
|---|:-:|---|---|
| Monthly Active Users | Monthly | 1 000–5 000 | Analytics |
| Listings live | Monthly | 500–2 000 | Database |
| Broker subscriptions | Monthly | 50+ paid tiers | `AmbassadorApplication` |
| Feature adoption (Archibald usage) | Monthly | 30 %+ of sessions | Analytics |
| NPS | Quarterly | > 40 | In-app survey |
| Platform revenue | Monthly | AED 100–500 k / mo Y2 | Service Fee ledger |

### 7.3 Company KPIs

| KPI | Frequency | Target Y1 | Target Y2 |
|---|:-:|---|---|
| Revenue by stream | Monthly | Agency 95 %, Platform 5 % | Agency 80 %, Platform 20 % |
| Burn rate | Monthly | ≤ AED 45 k / mo Phase 1 | ≤ AED 120 k / mo Phase 2 |
| Cash runway (months) | Monthly | ≥ 12 at any time | ≥ 18 at any time |
| Team size | Monthly | 3–4 | 8–12 |
| LinkedIn followers (Zhan + Dymo combined) | Monthly | 5 000+ | 20 000+ |
| Press mentions | Quarterly | ≥ 2 | ≥ 10 |
| Ambassador active (Silver+) | Monthly | 5–10 | 100–200 |

### 7.4 KPI review cadence

- **Weekly:** Agency pipeline review (Mon). Deal status, pipeline conversion, viewings scheduled.
- **Weekly:** Rudi update email (Sun night). See §9.1.
- **Monthly:** Full KPI dashboard. Review Sat morning month-end. Posted to `docs/reports/YYYY-MM.md`.
- **Quarterly:** Strategic review Zhan + Dymo + Rudi. 2-hour call. Reset priorities, revise targets.

---

## §8 RISK REGISTER — Top 10 with mitigation

### Risk 1 — Huspy mortgage dominance expands to listings
**Probability:** Medium. **Impact:** High. Huspy's $100 M raised + 25–30 % UAE mortgage share positions them to add listings + 3D within 18 months.
**Mitigation:** Partner defensively Month 5–7 — embed their mortgage widget on ZAAHI plot pages as A3/B1/C4 in POST_MEETING_BUILD_PLAN. Frames us as discovery + them as finance, avoids direct collision.
**Trigger events:** Huspy product release announcing plots / 3D / listings.
**Response:** accelerate ENBD / ADCB own mortgage partnership and plot-level moat deepening (500+ parcels by Month 12).

### Risk 2 — RERA rule changes mid-cycle
**Probability:** Medium. **Impact:** Medium. RERA issues circulars 4–6× per year; any could shift commission caps, tier requirements, advertising rules.
**Mitigation:** Compliance monitoring agent (Autonomy §1.9) shipped Month 8. Dymo's Equilibrium relationships catch most changes pre-publication.
**Trigger events:** DLD / RERA publish new circular.
**Response:** 48-hour review by BSA, update product + policy, notify ambassadors.

### Risk 3 — UAE real estate market downturn
**Probability:** Low-Medium Y1, Medium Y2–3. **Impact:** High. Dubai Q1 2026 transaction volume +31 % YoY is acceleration; correction possible 2027–2028.
**Mitigation:** Revenue diversification (21 streams per Master Tree §54). Tier subscriptions are non-cyclical. Ambassador base amplifies deal flow even in slower markets.
**Trigger events:** Quarterly Dubai transaction volume drops >10 % QoQ.
**Response:** shift product emphasis to rental / property management / distressed (Missing Branches §5 and §6). Agency commission pressure reduced by subscription + data revenue.

### Risk 4 — Key hire departure (Dymo, Zhan, Chief of Staff)
**Probability:** Low (founders committed). **Impact:** Critical.
**Mitigation:** 2-year vesting with 6-month cliff (Dymo + Zhan). Single-point-of-failure audit: Zhan is engineering SPOF; Dymo is commercial SPOF. Post-Chief-of-Staff hire, Head of Product absorbs some Zhan engineering SPOF; second agent absorbs some Dymo commercial SPOF.
**Trigger events:** resignation / incapacity.
**Response:** insurance (key-person policy Month 6+). Emergency succession plan drafted Month 2 (BSA).

### Risk 5 — Cash runway exhaustion
**Probability:** Low. **Impact:** Critical.
**Mitigation:** Rudi AED 1 M + expected AED 1.35 M Month 3 commission = AED 2+ M cash at end of Month 3. Runway remains positive at least through Month 18 on base case. Burn rate disciplined, no speculative hiring.
**Trigger events:** 2 consecutive months with zero commission + burn > AED 50 k / mo.
**Response:** bridge capital from Rudi (subject to Reserved Matters) or emergency Series Seed at ADGM valuation mark.

### Risk 6 — Platform scaling issues (under load)
**Probability:** Low Y1, Medium Y2. **Impact:** Medium.
**Mitigation:** Vercel edge handles standard traffic; Supabase Frankfurt can handle 50 k+ DAU without tuning. Sovereignty migration to Equinix DX1 Q3 2027 pre-empts scale issues. Monitoring (Sentry, Vercel logs) fires on anomalies.
**Trigger events:** error rate > 1 % sustained, p95 latency > 800 ms.
**Response:** immediate engineering rotation to stability; defer feature work.

### Risk 7 — PDPL enforcement action
**Probability:** Medium. **Impact:** High. UAE Data Office entered strict enforcement phase 2026.
**Mitigation:** P0 safety items ship Month 4. DPO engaged Month 4. Privacy Centre live Month 4. See MASTER_TREE_SAFETY_PROPOSALS §1.6 and §5.1.
**Trigger events:** UAE Data Office inquiry, data-subject complaint.
**Response:** 24-hour legal response via BSA, DPO coordination, transparent remediation.

### Risk 8 — Bank partnership fall-through
**Probability:** Medium (bank sales cycles are long + unpredictable). **Impact:** Medium.
**Mitigation:** 3 banks in parallel conversation (ENBD + ADCB + Mashreq). Huspy widget embed as backup plan.
**Trigger events:** No MOU signed by Month 9.
**Response:** escalate ADCB Commercial (where competitive pressure from Huspy reseller model gives ADCB motivation to partner with an alternative). If none signs Month 12, deprioritise mortgage routing and double down on tier subscriptions.

### Risk 9 — Geopolitical events
**Probability:** Low-Medium. **Impact:** Varies.
**Mitigation:** Sovereignty roadmap reduces US-exposure. UAE-resident infrastructure migration (Sovereignty §1.3). Multi-bank / multi-country insulation. Multisig Ambassador treasury avoids SPOF.
**Trigger events:** major sanctions / regional conflict / currency crisis.
**Response:** accelerate sovereignty migration. Reassess targets if GCC demand shifts.

### Risk 10 — Videographer burnout / exit
**Probability:** Medium. **Impact:** Medium-High (brand machine depends on content).
**Mitigation:** 12-month content plan is front-loaded — scripts and plans pre-committed. Dymo takes content ownership from Month 3; videographer executes. Backup videographer identified (freelance pool).
**Trigger events:** videographer resignation / missed deliverables.
**Response:** freelance gap-fill Week 1; full-time search Month 2.

---

## §9 COMMUNICATION CADENCE

### 9.1 Rudi (Investor)

**Weekly update** — every Sunday 20:00 UAE time. Format:

```
Subject: ZAAHI — Week XX (dd MMM – dd MMM) — [🟢/🟡/🔴] summary

## Headline
One sentence on the week.

## Agency
- Pipeline: N active / M new this week
- Deals closed: N (cumulative Y1)
- Revenue cumulative: AED X M

## Platform
- Progress: what shipped
- Blockers: what didn't and why
- Partnerships: what moved

## Cash
- Start of week: AED X
- End of week: AED X
- Runway: N months

## Risks
- New or elevated (2-3 max)

## Next 7 days
- Top 3 priorities

(optional) Material events: any 48-hour notice-required event
```

**Monthly Board cadence** — first Monday of each month, 1-hour call. Agenda fixed: prior month KPIs → current quarter priorities → risks → Rudi questions. Agenda published Friday before; minutes published Tuesday after.

**Quarterly deep dive** — March, June, September, December. 2-hour video call + 10-page deep-dive doc sent 48 hours prior. Content: strategic review, KPI scorecard, roadmap adjustments, Series A prep progress (Phase 3).

**Ad-hoc material events** — 48-hour notice per MOU. Examples: deal >AED 50 M signed, key-person resignation, regulator inquiry, press event, funding offer, cyber incident.

### 9.2 Team (internal)

- **Daily stand-up** — 10:00 UAE time, 15 minutes. Format: yesterday / today / blockers. Founders + videographer. Once Chief of Staff joins, stand-up becomes 15 min 4 days / week (Fri skipped).
- **Weekly all-hands** — Friday 15:00, 45 minutes. Metrics review + celebrate wins + resolve friction. Founder-led.
- **Monthly company update** — end of month, 30 minutes, founders present KPI dashboard.
- **Quarterly strategy review** — Jan/Apr/Jul/Oct, 2 hours. OKR refresh, roadmap adjust, risk register refresh.

### 9.3 External (partners, press)

- **Videographer content** — 2 content pieces / week Phase 1, 3–4 / week Phase 2+. Published on LinkedIn + Instagram + X + YouTube.
- **LinkedIn cadence** — Zhan 1/week, Dymo 2–3/week. Tone: warm, expertise-first, no humble-brags.
- **Press release triggers** — first deal closed, ADGM incorporation, first bank partnership, DLD sandbox acceptance, first tokenised plot, Series A. 6 press moments Y1; more Y2.
- **Community engagement** — Dymo personally replies to every LinkedIn DM from a qualified lead within 4 business hours. This is a growth-hacking channel that dies if automated.

---

## §10 SUCCESS SCENARIOS

### 10.1 Best case (P75)

| Metric | Y1 | Y2 |
|---|---:|---:|
| Agency revenue | AED 10 M | AED 20 M |
| Deals closed | 15 | 35+ |
| Platform MAU | 2 000 by M12 | 15 000 |
| Bank partnerships | 2 (ENBD + ADCB) | 4 (add Mashreq + FAB) |
| Ambassador sign-ups (paid tiers) | 80+ | 300+ |
| Master Tree % LIVE | 25 % | 40 % |
| Cumulative Rudi distributions | AED 800 k | AED 2.5 M (Sunset fired M20) |
| Platform Dev Fund accumulated | AED 7 M | AED 16 M |

Implication: Platform Series A pursued Month 22–24 at AED 500–800 M valuation. Rudi 80 % Agency position converts early; Platform 10 % retained.

### 10.2 Base case (P50)

| Metric | Y1 | Y2 |
|---|---:|---:|
| Agency revenue | AED 7.8 M (per P&L) | AED 15 M |
| Deals closed | 12 plots + 2 floors | 25 |
| Platform MAU | 1 000 by M12 | 7 000 |
| Bank partnerships | 1 (ENBD or ADCB) | 2 |
| Ambassador sign-ups | 50 | 150 |
| Master Tree % LIVE | 20 % | 30 % |
| Cumulative Rudi distributions | AED 407 k (per P&L) | AED 1.5 M |
| Platform Dev Fund | AED 5.5 M | AED 12 M |

Implication: on-track to investor package base case. Sunset Financial Trigger fires Month 28–32. Platform Series A prep starts Month 24.

### 10.3 Worst case (P25)

| Metric | Y1 | Y2 |
|---|---:|---:|
| Agency revenue | AED 3–4 M | AED 8 M |
| Deals closed | 5 | 15 |
| Platform MAU | 500 | 2 500 |
| Bank partnerships | 0 | 1 |
| Ambassador sign-ups | 20 | 50 |
| Master Tree % LIVE | 15 % | 25 % |
| Cumulative Rudi distributions | AED 200 k | AED 700 k |
| Platform Dev Fund | AED 2 M | AED 5 M |

Implication: Sunset Time Trigger (5-year backstop) becomes relevant instead of Financial Trigger. Platform build slows. No Series A in horizon; bridge capital may be needed Year 3. Sunset re-assessment warranted — possibly 50 % amendment to Rudi / Dymo / Zhan split.

### 10.4 Decision framework per scenario

- At **end of Month 6**, evaluate actual vs base case. If tracking P50+: continue. If tracking below P25: founder emergency review — is it executional (fixable) or structural (market)? Adjust plan accordingly.
- At **end of Month 12**, formal Board review with Rudi. Best / Base / Worst reality check. Phase 3 commitments made with eyes open.
- At **end of Month 24**, Sunset evaluation. Has the Financial Trigger fired or is the Time Trigger approaching? If Financial Trigger: execute auto-rebalance; if Time Trigger approaching without Financial: renegotiate per MOU.

---

## Appendices

### Appendix A — Key dates calendar

| Date | Milestone |
|---|---|
| Sun 2026-04-19 | MOU signed Al Jurf |
| Mon 2026-04-21 | DED Mainland LLC formation submitted |
| Tue 2026-04-22 | BSA legal counsel engaged |
| Thu 2026-04-24 | Trademark filing begins UAE + WIPO |
| Mon 2026-05-05 | SAFE expected signed |
| Mon 2026-05-05 | Trade licence expected issued |
| Mon 2026-05-12 | ENBD corporate account active |
| Fri 2026-05-22 | RERA broker card for Dymo |
| Mon 2026-06-22 | First deal Form F signed |
| Wed 2026-07-15 | First commission received |
| Wed 2026-07-15 | ADGM HoldCo incorporation started |
| Fri 2026-08-15 | ADGM HoldCo incorporated |
| Fri 2026-10-15 | P0 safety + sovereignty shipped |
| Mon 2026-11-30 | ENBD mortgage MOU signed (target) |
| Sun 2027-01-15 | Phase 2 complete, 3–5 deals closed |
| Thu 2027-04-15 | Phase 3 begins, Platform public beta |
| Thu 2027-10-15 | Platform GA launch |
| Thu 2028-04-15 | Year 2 end — 15–20 deals cumulative, Abu Dhabi branch, Series A prep |

### Appendix B — Budget summary (Y1)

| Line item | AED |
|---|---:|
| Entity formation + trade licence + RERA + Ejari | 60 000 |
| Legal (BSA Tier A+B one-time + retainer Y1) | 150 000 |
| Trademark UAE + WIPO + IP counsel | 100 000 |
| Videographer (Y1 retainer) | 120 000 |
| Office + software + comms (Y1) | 180 000 |
| DPO external retainer (from Month 4) | 100 000 |
| Pen test + security tooling | 120 000 |
| Transfer pricing study | 120 000 |
| Accounting / bookkeeping / CT compliance | 60 000 |
| Contingency / emergency | 100 000 |
| **TOTAL Y1 opex** | **~AED 1 110 000** |

Against AED 1 M Rudi + AED 7.8 M Agency revenue base case = ample runway. Year 2 opex scales to ~AED 2.5 M (add Chief of Staff + 2nd engineer + DC migration).

### Appendix C — Stakeholder roles

| Person | Role | Key responsibilities |
|---|---|---|
| **Zhan** | Founder / CEO / CTO | Engineering, platform architecture, compliance |
| **Dymo** | Co-founder / Ops Principal / Ambassador | Commercial BD, partnerships, brand, content strategy |
| **Rudi** | Principal Investor / Board | AED 1 M capital, board seat, strategic sign-off, relationship opener at UAE HNWI level |
| **Videographer** (TBN) | Content | 12-month content calendar execution |
| **BSA (or equivalent)** | Legal counsel | Corporate, regulatory, transactional |
| **DPO** (TBN, Month 4) | Privacy | PDPL / ADGM DP compliance |
| **Chief of Staff** (TBN, Month 6–8) | Execution multiplier | Partnership management, comms cadence, KPI reporting |

---

## References

- `docs/architecture/MASTER_TREE_final.md` — 85 sections canonical
- `docs/vision/ZAAHI_VISION_CLARITY.md` — strategic narrative
- `docs/research/COMPETITOR_DEEP_DIVE_2026.md` — 10 competitors
- `docs/roadmap/POST_MEETING_BUILD_PLAN.md` — Top 5 × 3 features
- `docs/vision/MASTER_TREE_SAFETY_PROPOSALS.md` — P0/P1 safety ranked
- `docs/vision/MASTER_TREE_SOVEREIGNTY_PROPOSALS.md` — 7 sovereignty domains
- `docs/vision/MASTER_TREE_AUTONOMY_PROPOSALS.md` — 30+ autonomy wins
- `docs/vision/MASTER_TREE_MISSING_BRANCHES.md` — 10 proposed branches
- `docs/vision/MASTER_TREE_IMPROVEMENTS_SUMMARY.md` — rolled-up Top 10 × 4
- `docs/investor-package/*` — MOU, P&L, Pitch, Launch Plan, Financial Model
- Companion implementation documents in this same directory: `WEEKLY_CADENCE.md`, `AGENCY_PLAYBOOK.md`, `IMPLEMENTATION_CHECKLIST.md`, `DEPENDENCIES_MAP.md`

### External sources

- [Dubai DED mainland LLC formation guide 2026](https://www.dubaisetup.ae/llc-company-formation-in-dubai-the-complete-2026-guide/)
- [Dubai real estate brokerage formation cost 2026](https://www.shuraa.com/what-is-the-cost-of-opening-a-real-estate-brokerage-in-dubai/)
- [Dubai real estate license + RERA guide 2026](https://www.retyn.ai/en-ae/blog/how-to-get-a-real-estate-license-dubai)
- [RERA licence cost Dubai 2026](https://egsh.ae/insights/rera-licence-cost-dubai)
- [DLD real estate professional practice card](https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/)
- [Al Tamimi & Company corporate structuring](https://www.tamimi.com/client-services/practices/corporate-structuring/)
- [ADGM company formation 2026 cost + timeline](https://diac.ae/blog/adgm-company-formation-abu-dhabi/)
- [ADGM + Hub71 fintech setup 2026](https://henryclub.ae/business-setup/free-zones/adgm-company-setup-2026-cost-license-benefits/)
- [Comprehensive ADGM setup guide 2026](https://taxadepts.com/complete-guide-to-setting-up-holding-company-adgm)

---

**End of MASTER_IMPLEMENTATION_PLAN.md.** Contact: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · `zaahi.io`.
