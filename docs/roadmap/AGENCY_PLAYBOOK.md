# AGENCY PLAYBOOK — Dubai Mainland Operations

**Document:** Operational playbook for the ZAAHI Agency (Dubai Mainland LLC).
**Prepared for:** Dymo (Co-founder, Ops Principal, primary broker), Zhan (Founder, occasional deal support), future agents (Month 6+).
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Parent document:** `docs/roadmap/MASTER_IMPLEMENTATION_PLAN.md`
**Classification:** CONFIDENTIAL

---

## How to use this playbook

This is the operational handbook for the human side of the Agency. The platform at `zaahi.io` is the technical side; this document is the sales, negotiation, compliance, and client-management side. Every agent who joins the Agency reads this document on Day 1 and follows it until the platform is mature enough to automate any given step (Phase 2+ autonomy per MASTER_TREE_AUTONOMY_PROPOSALS).

Six sections:

1. **Deal sourcing** — how leads arrive.
2. **Deal execution** — how deals close.
3. **Client management** — how relationships deepen.
4. **Commission tracking** — who gets paid what, and when.
5. **Compliance** — RERA / DLD / Trakheesi / AML discipline.
6. **Pipeline management** — CRM discipline before Phase 2 automation.

---

## §1 DEAL SOURCING

Agency Y1 base case: 12 premium land plots + 2 off-plan floor-level sales. That's ~14 deals across 12 months — roughly 1.2 deals / month. At 20–30 % pipeline conversion, Agency needs 4–6 active prospects at any given time, and 10+ cumulative leads / month entering the top of funnel.

Five sourcing channels, ranked by expected Y1 contribution:

### 1.1 Dymo's Equilibrium network (primary — 60 % of Y1 deals)

**Thesis:** Dymo has 7+ years in Dubai real estate and co-runs Equilibrium Advisory Group. His direct network and warm-intro network is the Agency's primary lead flow for Year 1.

**Activation:**
- Week 1 — reactivate 30+ warmest relationships via WhatsApp / LinkedIn.
- Messaging tone: warm, personal, not salesy. Example: "Happy to share that I've co-founded ZAAHI Real Estate — building something different for premium Dubai. If you or anyone in your network is evaluating a plot between AED 15–100 M, I'd love to run a 3D walk-through. zaahi.io."
- Cadence: 10 reach-outs / week. Expected response rate 30 % → 3 live conversations / week.
- Conversion path: warm conversation → qualification (budget / timeline / language) → 3D platform demo → viewing → offer.

**Template:** see WEEKLY_CADENCE.md Appendix A.

### 1.2 Owner outreach (secondary — 20 % of Y1 deals)

Target: UAE plot owners currently not listed publicly — especially those in Dymo's immediate network who hold underperforming plots and might consider listing.

**Process:**
- Identify 50–100 plot owners in priority districts (Jumeirah Bay, Palm Jumeirah, Emirates Hills, Dubai Hills, Al Barari, District One, Nad Al Sheba).
- Data sources: DLD public data, Dymo's prior transaction records, referrals from lawyers / bankers / consultants.
- Cold outreach via: LinkedIn InMail (for HNWI with profiles), warm-intro via mutual contact, property management company referrals.
- Value proposition to owners: professional representation + 3D listing that no other UAE platform provides + Ambassador network amplification.

**Scripts** (English; translate to AR / RU / UK as needed):

> "Mr / Ms [Last Name] — Dymo Tsvyk, Co-founder of ZAAHI Real Estate. I'm reaching out because your plot at [District] fits the premium-tier specialisation we focus on. If you're open to a confidential conversation about current market conditions (Q1 2026 Dubai transaction volume was AED 252 B, +31 % YoY), I'd be happy to share how we'd approach positioning your plot — with a 3D ZAAHI Signature render that no other platform provides. 15 minutes at your convenience. No commitment. d.tsvyk@gmail.com"

### 1.3 Developer partnerships (secondary — 15 % of Y1 deals; 70 % of Y1 commission value due to higher per-deal commission)

Target: mid-tier Dubai developers (not DAMAC / Emaar / Aldar — too large to partner with a seed-stage brokerage) with off-plan floor-level inventory.

**Types of developers to pursue:**
- Specialist niche developers (boutique hospitality, wellness, ultra-luxury).
- Re-developers of acquired secondary stock.
- Family-office-backed single-project developers.

**Value proposition:**
- ZAAHI Signature 3D on every floor.
- Feasibility Calculator demonstrates commitment to buyer value.
- Multilingual Archibald pre-qualifies buyers 24 / 7 in 6 languages.
- Tier subscription revenue share for developers who commit inventory.

**Process:**
- Dymo identifies 20 target developers Week 3–6.
- First meeting: coffee + Feasibility Calc demo + sample 3D render of one of their plots (Zhan generates in advance).
- Deal structure: exclusive marketing rights to 1–3 floors, 3–5 % commission on sale.

### 1.4 HNWI buyer acquisition (via inbound — 10 % of Y1 deals)

**Inbound channels:**
- `zaahi.io` direct traffic (SEO + social).
- LinkedIn (Dymo + Zhan content reach).
- Videographer's content on Instagram / YouTube / TikTok.
- Archibald chat qualifies inbound leads in 6 languages 24 / 7.

**Qualification gate** (Archibald Phase 2 automates this; Phase 1 is Dymo-manual):
- Budget declared (AED minimum).
- Residency status (UAE / foreign resident / non-resident).
- Financing need (cash / mortgage).
- Timeline (immediate / within 3 months / exploring).
- Asset preference (plot / apartment / villa / off-plan / commercial).

A lead scoring BANT ≥ 80 routes to Dymo's Calendly; BANT 40–79 routes to a warm-up email sequence; BANT < 40 to content nurturing.

### 1.5 Referral network activation (background — 5 % of Y1 deals, scaling to 20 % + Y2)

**Ambassador program** (already architected per `CLAUDE.md` Ambassador Program Rules):
- Silver AED 1 k → 5 % / 2 % / 1 % L1 / L2 / L3 commission on downline deals.
- Gold AED 5 k → 10 % / 4 % / 1 %.
- Platinum AED 15 k → 15 % / 6 % / 1 %.

**Y1 target:** 50 paid ambassadors. Every active ambassador is a sourcing multiplier. A Gold ambassador closing one referral deal AED 50 M × 2 % ZAAHI Service Fee = AED 1 M × 10 % L1 = AED 100 k commission to the ambassador.

**Activation sequence:**
- Dymo hand-picks top 20 brokers from his network.
- Each gets a personalised pitch: "Gold tier is AED 5 k one-time, lifetime. Your first deal at AED 50 M earns you AED 100 k back. Worth it?"
- Expected conversion: 5–10 Gold signups in first 3 months.

**Maintenance:**
- Monthly ambassador newsletter (AI-generated per Autonomy §5.5).
- Quarterly in-person meetup (Dubai coffee, no paid venue Y1).
- Leaderboard published at `/ambassador/leaderboard` (A5 in build plan) to drive FOMO.

---

## §2 DEAL EXECUTION

### 2.1 Lead qualification process

Every lead goes through qualification before consuming Dymo's time. Phase 1 is manual; Phase 2 is Archibald-automated.

**Qualification checklist (5 minutes with prospect):**
1. **Name + contact details** — EID or passport number requested only at offer-stage.
2. **Budget range** — "AED 20–35 M for a plot" is acceptable specificity.
3. **Residency** — UAE resident / non-resident (affects mortgage LTV + Golden Visa).
4. **Timeline** — "within 3 months" = active; "exploring" = nurture.
5. **Financing** — cash / mortgage / JV.
6. **Language preference** — EN / AR / RU / UK / SQ / FR.
7. **Prior UAE real estate transactions** — first-time buyer needs more hand-holding.

**Output:** Pipeline entry in `agency-pipeline.xlsx` (Phase 1) → CRM record (Phase 2).

### 2.2 Viewing coordination

**Pre-viewing:**
- Send prospect: platform link (`/parcels/[id]`) with 3D render, Archibald intro chat, district heatmap. 48 hours ahead.
- Confirm attendees. If HNWI brings a lawyer / consultant, prep Dymo with their LinkedIn / track record.
- Videographer briefed (if appropriate — most HNWI decline being filmed; capture drone footage instead).

**At viewing:**
- Welcome pack (branded folder): plot brochure + affection plan PDF + DDA site plan + district market report + Feasibility Calc output (for plots with development potential) + business card.
- Duration: 60–90 minutes. First 15 minutes = platform walk-through on iPad; then physical walk of plot; then 30 minutes of Q&A with Archibald supporting.
- No commitments asked at viewing — invitation to follow-up in 3–5 days.

**Post-viewing:**
- Thank-you message within 24 hours (personalised, not templated).
- Next-step scheduled in pipeline: "Follow-up call Thu Jun 12, 15:00."

### 2.3 Offer structuring

**Structuring principles:**
- Offers are written, signed by buyer, countersigned by Dymo on behalf of seller if authorised.
- Form F (MOU) is the Dubai-standard offer instrument. BSA holds templates in EN + AR.
- Deposit: 10 % standard. Escrow: Agency's bank account (or dedicated escrow account at DDA-registered bank).
- Conditions precedent: DLD Title Deed verification, NOC issuance, bank pre-approval (if mortgage), material damage / flooding / disputes.
- Commission: 2 % plots (1 % seller + 1 % buyer typical; Agency can capture both sides if unrepresented).

**Offer template elements:**
- Buyer name + EID / passport.
- Seller name + title deed reference.
- Plot reference + DLD plot number + district.
- Price in AED (numeric + written).
- Deposit amount + date.
- Balance payment schedule.
- Conditions precedent.
- Closing date (typically 30–60 days from MOU).
- Governing law: UAE / Dubai Courts (or DIFC for expats).
- Broker commission clause — protects Agency if deal closes outside platform.

### 2.4 Negotiation playbook

**Principles:**
- Never lie. HNWI deals are reputation-gated; one false claim ends 3 years of trust-building.
- Show the data. When counter-offers come, open `/parcels/[id]` on iPad, show the DLD heatmap, show the Feasibility Calc output. Let the data argue.
- Silence is a tool. After presenting a counter, don't fill the silence. Let the buyer / seller think.
- Escrow is your leverage. A 10 % deposit in escrow = a committed buyer. Unserious buyers don't wire 10 %.

**Common counter-offer scenarios and responses:**

| Scenario | Response |
|---|---|
| Seller says "I can get more from Bayut" | Response: "Bayut gives listings; ZAAHI gives qualified cash buyers with 10 % deposit ready. Let me know if a specific listing comp would change your mind." Pull DLD comp that validates your price. |
| Buyer says "Dymo, I'll go direct to the seller without you" | Response: "Understood. The seller retains me as exclusive agent until close, so any direct communication will run through me. I'd rather serve the deal and you than create friction." Form F with broker clause protects Agency. |
| Buyer says "Your commission is 1 %, not 2 %" | Response: "Our standard is 2 % to properly represent you with the full ZAAHI platform + BSA legal review + post-close support. If you want a 1 % deal, that's Bayut-tier service." Don't negotiate below 1.5 % for premium deals. |
| Seller wants "as-is, no Title Deed attestation" | Response: "Due diligence is non-negotiable. I can't represent you if I haven't seen the title. This protects you more than me." |

### 2.5 Close-out procedures

**Pre-DLD submission checklist:**
- [ ] Buyer funds confirmed (full purchase price + 4 % transfer fee = ~104 % of sale price).
- [ ] NOC from DDA issued (3–7 business days typical).
- [ ] Title Deed from seller's Emirates verified.
- [ ] Buyer's Emirates ID / Passport copy current.
- [ ] Seller's Passport / EID current.
- [ ] Power of Attorney (if any party represented) notarised by UAE notary.
- [ ] Form F final signed + countersigned.
- [ ] Trakheesi advertising permit (if listing was advertised).
- [ ] Commission invoice prepared (in AED, with TRN, PCD-compliant).

**At DLD appointment:**
- Arrive 30 min early. All parties bring originals of all documents above.
- DLD officer verifies, runs title transfer.
- Transfer fee (4 % of sale price) paid by buyer by bank transfer or banker's cheque.
- Registration fee AED 580 paid (often lumped by seller as part of closing costs).
- New Title Deed issued in buyer's name within 2–4 hours.

**Post-DLD:**
- Commission payable to Agency — seller typically pays on closing day.
- Agency issues Tax Invoice to seller for commission + 5 % VAT.
- Commission settled to Agency bank account same day or next business day.
- Deal marked `COMPLETED` in Deal Engine (Phase 2+).

---

## §3 CLIENT MANAGEMENT

### 3.1 Onboarding process

**First contact (within 4 hours of lead):**
- Acknowledge. Introduce yourself. Ask 3 qualifying questions (budget, timeline, language).
- Propose a 20-minute platform walk-through call in 24–72 hours.

**Platform walk-through call:**
- 20 minutes on Zoom or WhatsApp Video.
- Screen-share `/parcels/map`. Show map, 3D, filters, Archibald.
- Qualify the lead live (full BANT).
- If qualified, schedule first viewing within 14 days.

**First viewing → offer → close:**
- See §2 above.

**Post-close:**
- Welcome to ZAAHI network. Invite to Ambassador tier (at Silver minimum — many buyers of AED 50 M+ properties are also potential referrers).
- Refer for after-sale services (property management, insurance, renovation) — Missing Branches §5 post-Phase 2.

### 3.2 Communication cadence

Client expectations differ by segment:

| Segment | Typical cadence | Channel |
|---|---|---|
| HNWI (>AED 30 M deal) | 2–3 touches / week during active deal; monthly post-close | WhatsApp (preferred), email, phone |
| Family office | Weekly during active; quarterly post-close | Email, occasional Zoom |
| Developer partnership | Weekly during listing; monthly post-close | Email, quarterly in-person |
| Tier ambassador | Monthly newsletter; ad-hoc for hot leads | Email, Telegram |
| First-time buyer | 3–5× per week during active deal; biannual post-close | WhatsApp, platform chat |

### 3.3 Document management

Phase 1: all deal documents stored in a structured OneDrive folder:
```
/deals/YYYY-MM-DD_[plot-ref]_[buyer-last-name]/
  01_initial-inquiry/
  02_platform-demo-recording/
  03_kyc-documents/
  04_offer/
  05_form-f-mou/
  06_deposit-receipt/
  07_noc/
  08_title-deed-pre/
  09_dld-submission/
  10_title-deed-post/
  11_commission-invoice/
  12_post-close/
```

Phase 2: migrate to Supabase-backed document manager with per-deal access controls, shared with buyer / seller / BSA / bank.

### 3.4 Transaction milestones (Deal Engine state machine)

Per `MASTER_TREE §31`:
- `INITIATED` → buyer expresses interest, no deposit.
- `DEPOSIT_PENDING` → Form F signed, deposit requested.
- `DEPOSIT_RECEIVED` → 10 % in escrow.
- `AGREEMENT_SIGNED` → final contract signed.
- `DOCUMENTS_COLLECTION` → all 10 document types gathered.
- `GOV_VERIFICATION` → DDA + RERA checks.
- `NOC_PENDING` → NOC filed.
- `TRANSFER_FEE_PAYMENT` → buyer funds ready.
- `DLD_SUBMISSION` → DLD appointment scheduled.
- `DLD_APPROVED` → title transferred.
- `COMPLETED` → commission received, post-close handoff.
- (or `DISPUTED` / `CANCELLED` as terminal states).

Each state transition should be logged in the system (Phase 2 auto; Phase 1 manual pipeline.xlsx).

### 3.5 After-sale handoff

Post-Phase 2, every closed deal gets automated handoff to:
- Property management partner (Asteco / ServeU / Better Homes PM).
- Insurance quote request (Orient / Oman / AXA).
- Interior design referral (if ZAAHI Architect tier active).
- Ambassador tier upgrade invite (first-time buyers become ambassadors).

Phase 1: Dymo manually routes within 30 days of close.

---

## §4 COMMISSION TRACKING

### 4.1 Deal economics spreadsheet template

`commission-tracker.xlsx` on OneDrive, one row per closed deal:

| Column | Type | Notes |
|---|---|---|
| Deal ID | ZAAHI-2026-NN | Auto-numbered |
| Plot reference | DDA number | 7-digit for DDA plots |
| Sale price | AED | Integer |
| Commission % | % | 2 % plot standard |
| Commission gross | AED | Sale × % |
| VAT on commission | 5 % of commission | Agency registers for VAT post-AED 375 k turnover |
| Commission net | AED | Gross − VAT payable |
| Seller-side / buyer-side | ratio | 1 % / 1 % or 2 % / 0 % |
| Ambassador referral? | Y/N + ambassador ID | If Y, downline walker runs |
| L1 ambassador commission | AED | Per `awardCommissions()` |
| L2 / L3 commissions | AED | Per `awardCommissions()` |
| Agency net of referrals | AED | Gross − referrals |
| Service Fee to Platform (70 %) | AED | Agency profit × 70 % |
| Agency retained (30 %) | AED | For quarterly distributions |
| Closing date | Date | DLD approval date |
| CT reserve | AED | 9 % of (AED 500 k + Agency retained) |
| Distributable | AED | Agency retained − CT reserve |
| Rudi 10 % | AED | Quarterly |
| Dymo 10 % | AED | Quarterly |
| Zhan 10 % | AED | Quarterly |

### 4.2 Commission split rules

**Pre-Sunset (Months 1–36 typical):**
- Agency commission gross → 70 % Service Fee to Platform / 30 % retained in Agency.
- Agency retained 30 % → 10 % Rudi / 10 % Dymo / 10 % Zhan quarterly after CT reserve.
- Rudi's 80 % equity does **not** give him 80 % of distributable profit — profit split is 10 / 10 / 10 (the residual 70 % is the inter-company Service Fee). This is explicit in MOU.

**Post-Sunset (triggered by earlier of AED 2 M cumulative Rudi distributions OR 5 years):**
- Agency equity rebalances: 80/10/10 → 33.34/33.33/33.33 automatically.
- Distribution percentages (70/10/10/10) unchanged for lifetime — pre- and post-Sunset.

**Platform (ADGM HoldCo):**
- 70 % Service Fee from Agency accumulates in Platform Dev Fund.
- Zhan 80 % / Dymo 10 % / Rudi 10 % — perpetual, no Sunset mechanic.
- Platform has no profit distribution in early years (all cash re-invested in development); Rudi's 10 % Platform upside realises at Series A / B / C / IPO events.

### 4.3 Payment terms

- **Commission from seller**: on DLD approval day, by bank transfer or certified cheque. Agency deposits same business day.
- **Commission from buyer side** (if any): same day or within 3 business days.
- **Ambassador payouts**: minimum AED 1 000 threshold, within 30 business days of `DEAL_COMPLETED`.
- **Service Fee to Platform**: monthly invoicing; settlement within 15 business days of invoice.
- **Quarterly distributions**: last business day of March / June / September / December. Calculation reviewed by bookkeeper; signed by all 3 shareholders.

### 4.4 Tax handling

- **Corporate Tax (Federal Decree-Law 47/2022):** 9 % on Agency profit above AED 375 k / year. No SBR relief applicable Y1 (revenue > AED 3 M SBR threshold).
- **VAT (Federal Decree-Law 8/2017):** 5 % on commissions. Agency registers for VAT once turnover crosses AED 375 k threshold (likely early Month 2).
- **Transfer Pricing:** 70 % Service Fee Agency → Platform requires arm's-length documentation (TP study, AED 120 k, Q3 2026). See MASTER_TREE_SAFETY_PROPOSALS §5.4.

### 4.5 Escrow arrangements

- **Standard 10 % deposit**: into Agency bank account (safe-harbour escrow sub-account) until DLD closing.
- **Large deposits (>AED 2 M)**: into DDA-registered bank escrow account (ENBD Trust Escrow Services or equivalent) — protects both buyer and seller.
- **Cross-border wire**: allow 3–5 business days for correspondent banking clearance. Plan DLD appointments accordingly.

---

## §5 COMPLIANCE

### 5.1 RERA requirements per transaction

Every deal where Agency acts as broker:
- [ ] Dymo's RERA broker card active + valid.
- [ ] BRN displayed on all advertising (per RERA regulation).
- [ ] Trakheesi advertising permit obtained before any listing publication.
- [ ] Form F (MOU) filed with DLD within required window.
- [ ] Client consent form signed (RERA client-broker relationship disclosure).
- [ ] Retain all documents for 5 years per RERA record-keeping.

### 5.2 DLD registration process

Step-by-step for every closed deal:
1. **Pre-submission: all documents assembled** (see §2.5 checklist above).
2. **DLD appointment** booked via Dubai REST app (or DLD Trustee Office for assisted filings).
3. **At appointment:** all parties present with originals, EIDs, passports.
4. **Transfer fee payment:** 4 % of sale price + AED 580 registration + AED 4 200 admin.
5. **Title Deed issued:** typically same-day at premium DLD Trustee Offices, or 1–3 days at standard DLD offices.
6. **Post-close:** copies to buyer, seller, Agency archive, BSA archive.

### 5.3 Trakheesi permits

Per `MASTER_TREE §62 Legal Engine`:
- Every advertised listing requires a Trakheesi permit from Dubai Economy & Tourism (DET).
- Permit number must appear on the listing (website, print, social).
- Fee: AED 100–200 per permit, 3-month validity, renewable.
- Phase 2 autonomy: auto-Trakheesi API integration (AUTONOMY §3.2). Phase 1: manual application per listing.

### 5.4 KYC / AML procedures

Per Federal Law 10/2025 (AML):
- [ ] Client Emirates ID / Passport verified (UAE Pass Phase 2; manual Phase 1).
- [ ] Source of Funds declaration for deals >AED 500 k (written, signed).
- [ ] Source of Wealth for deals >AED 2 M.
- [ ] PEP (Politically Exposed Person) screening via commercial database (Refinitiv, Dow Jones, LexisNexis).
- [ ] Sanctions screening via UN / OFAC / EU / UK lists.
- [ ] Transaction monitoring — flag unusual patterns.
- [ ] Retain records 5 years minimum.

### 5.5 Record keeping

- All deal documents: OneDrive + Agency DLD archive.
- All client communications: WhatsApp / email archived quarterly.
- All financial: Agency accounting system (Xero / QuickBooks / Zoho Books).
- All compliance: dedicated `compliance/` folder in OneDrive with quarterly snapshots.
- Retention: 7 years for financial, 5 years for transactional, per UAE CT + AML rules.

---

## §6 PIPELINE MANAGEMENT

### 6.1 CRM setup (before Platform)

**Phase 1 tool:** `agency-pipeline.xlsx` (Excel / OneDrive).

Columns:
1. Lead ID (auto).
2. Date lead created.
3. Source (Dymo network / developer partner / ambassador / inbound / cold outreach / ...).
4. Lead name.
5. Contact (phone + email).
6. Language preference.
7. Budget range.
8. Asset preference (plot / apartment / villa / off-plan / ...).
9. Timeline (immediate / 3-month / exploring).
10. BANT score (0–100; Dymo assigns subjectively Phase 1).
11. Current state (Initiated / Qualified / Viewing scheduled / Viewing done / Offer prep / Offer submitted / Counter-offer / Closing / Closed / Lost).
12. Next action date.
13. Next action owner (Dymo / Zhan / videographer / Archibald).
14. Notes (free text).
15. Probability of close (%) — updated weekly.
16. Expected close date.
17. Expected commission AED.

Weighted pipeline = Σ (expected commission × probability). Weekly review asks: is weighted pipeline ≥ AED 2 M? If yes, monthly close target AED 650 k is supported.

### 6.2 Lead scoring

Phase 1 BANT (manual):
- **Budget** — declared in AED (scale: 0 = undeclared, 100 = specific range).
- **Authority** — decision-maker (0 = unclear, 100 = principal confirmed).
- **Need** — specific asset spec (0 = vague, 100 = specific plot / district / size).
- **Timeline** — when they'll transact (0 = >12 months, 100 = within 3 months).

Sum / 4 = BANT composite. ≥ 80 = hot (Dymo priority); 40–79 = warm (nurture); <40 = cold (automation).

Phase 2 BANT (Autonomy §1.3): Archibald conducts structured intake, assigns BANT, routes.

### 6.3 Conversion metrics

Target Y1 ratios:

| Stage | Ratio | Means |
|---|:-:|---|
| Lead → Qualified | 40 % | Initial contact becomes real conversation |
| Qualified → Viewing | 50 % | Warm lead visits plot |
| Viewing → Offer | 40 % | Attended a viewing, submitted an offer |
| Offer → Closed | 50 % | Offer accepted and closed |
| **Overall Lead → Closed** | **~4 %** | One close per ~25 leads |

Expected Y1: 14 closes → 350–400 leads / year → ~30 / month.

### 6.4 Forecast methodology

**Weekly forecast** (Dymo updates Monday):
- Closed YTD.
- In-closing (expected close next 30 days): weighted 80 %.
- Offer-stage (expected close next 45 days): weighted 50 %.
- Viewing-stage (expected close next 60 days): weighted 25 %.
- Qualified-stage (expected close next 90 days): weighted 10 %.
- Total weighted pipeline / quarter.

**Monthly forecast** (Dymo + Zhan review first Saturday):
- Closed actual / planned vs base case AED 650 k / month.
- Gap analysis if <80 % of plan: what action closes the gap in 30 days?
- Recommendations to Zhan on product / platform changes if pipeline friction identified.

**Quarterly forecast** (Rudi included):
- Closed quarter vs plan.
- Rolling 12-month forecast vs base case AED 7.8 M Y1.
- Early warning if rolling forecast <AED 6 M (base case minus 25 %).

---

## Appendix A — First-90-days targets

| Item | M1 | M2 | M3 | Cumulative |
|---|:-:|:-:|:-:|:-:|
| Leads created | 10 | 15 | 20 | 45 |
| Qualified leads | 4 | 6 | 8 | 18 |
| Viewings conducted | 2 | 3 | 4 | 9 |
| Offers submitted | 1 | 2 | 2 | 5 |
| Deals closed | 0 | 0 | 1–2 | 1–2 |
| Commission received (AED) | 0 | 0 | 790 k – 1.35 M | 790 k – 1.35 M |

## Appendix B — Agent onboarding (post-Month 6)

When Agency hires additional agent (target Month 6–9):

**Day 1:**
- Read MASTER_IMPLEMENTATION_PLAN, AGENCY_PLAYBOOK, CLAUDE.md (engineering side).
- RERA broker card application started (if not already held).
- Introduced to Dymo's network (select segment).

**Days 2–5:**
- Shadow Dymo on 2 viewings + 1 platform demo call.
- Trained on Archibald, 3D, Feasibility Calc.
- BSA briefing on compliance + KYC.

**Week 2:**
- First own lead conversation (with Dymo nearby).
- First viewing solo (with Dymo debrief).

**Week 3+:**
- Independent pipeline with weekly review with Dymo.
- Target: first close by Month 9 onboard.

Commission split for junior agent: 40 % to agent / 60 % to Agency. After 1-year tenure with ≥ 3 closes: 50 % / 50 %.

---

**End of AGENCY_PLAYBOOK.md.** Contact: `d.tsvyk@gmail.com` · `zhanrysbayev@gmail.com` · `zaahi.io`.
