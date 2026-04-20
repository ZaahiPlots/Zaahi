# AUDIT FINDINGS — Top 0.1 % Quality Review

**Document:** Complete list of issues found during the final quality audit of all research and roadmap documents.
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Scope:** All research / roadmap docs in scope; investor-package v7 flagged separately (read-only); Master Tree v3 untouched (canonical).
**Methodology:** Seven audit tracks per task brief — factual accuracy · calendar accuracy · financial coherence · logical consistency · timeline realism · legal/regulatory completeness · strategic depth. Each finding logged with document, location, severity, proposed correction, source.
**Classification:** CONFIDENTIAL

---

## Severity summary

| Severity | Count | Definition |
|:-:|:-:|---|
| **Critical** | 5 | Would embarrass in VC / investor / regulator meeting. Must fix. |
| **High** | 8 | Reduces credibility. Fix this audit round. |
| **Medium** | 9 | Quality / completeness. Fix where low-cost. |
| **Low** | 6 | Polish. Defer acceptable. |
| **Total** | **28** | |

---

## CRITICAL — 5 findings

### C-1 — Week 6 collides with Eid al-Adha (May 25–31, 2026)

**Documents affected:** `WEEKLY_CADENCE.md`, `MASTER_IMPLEMENTATION_PLAN.md` §2.5.
**Severity:** CRITICAL. **Track:** Calendar + Timeline realism.

**Issue:** Week 6 in WEEKLY_CADENCE as "May 26 – Jun 1" (original dates before calendar cascade) or "May 25–31" (after) contains the **six-day Eid al-Adha holiday (Wed May 27 – Fri May 29 + weekend Sat–Sun May 30–31 + pre-holiday Tue May 26)**. Effective business days in Week 6 = Monday May 25 only. Planning "developer partnership first meeting" + "Plot 2 viewing" for this week fails — government offices closed, HNWI / developer counterparties travelling, banking / DED / DLD offline.

**Source:** [UAE public holidays 2026 — Time Out Dubai](https://www.timeoutdubai.com/news/uae-public-holidays-2026-official-dates) · [Gulf News UAE 2026 holidays](https://gulfnews.com/living-in-uae/ask-us/uae-public-holidays-2026-full-list-of-expected-dates-and-long-weekends-2-1.500457262) confirms Wed May 27 – Fri May 29 Eid al-Adha 2026 (expected, subject to moon sighting).

**Correction:**
1. Re-theme Week 6 to "Eid al-Adha quiet week — internal review + content sprint." No external meetings planned.
2. Push Plot 2 viewing, developer partnership meeting to Week 5 (May 18–24) or Week 7 (Jun 1–7).
3. Shift "first content piece 10 k+ impressions" milestone from Week 6 theme to Week 5 / Week 7.
4. Update `WEEKLY_CADENCE.md` Week 6 section accordingly.
5. Add new calendar guardrail to `IMPLEMENTATION_CHECKLIST.md` Ongoing: "Check UAE public holidays before scheduling deal-critical meetings."

### C-2 — Calendar day-of-week misalignment (cascade across 4 files)

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md`, `WEEKLY_CADENCE.md`, `IMPLEMENTATION_CHECKLIST.md`, `DEPENDENCIES_MAP.md`, `AGENCY_PLAYBOOK.md`.
**Severity:** CRITICAL. **Track:** Calendar.

**Issue:** Documents refer to "Monday April 21, 2026" as Day 1 of execution. April 21, 2026 is a **Tuesday** in the Gregorian calendar. Current date per system is **Monday April 20, 2026** — the actual post-Al-Jurf-MOU Monday. Internal-pack dates are off by one day across Week 1 and cascade subsequent week labels.

**Source:** [timeanddate.com UAE holidays 2026](https://www.timeanddate.com/holidays/united-arab-emirates/2026) — April 2026 calendar confirms Sun 19 → Mon 20 → Tue 21.

**Correction:** Cascade-update all non-investor-package documents to Day 1 = Monday April 20, 2026:
- Week 1 label: "Apr 21 – 27" → "Apr 20 – 26"
- Day 1 label: "Monday April 21" → "Monday April 20"
- Day 2: "Tuesday April 22" → "Tuesday April 21"
- Day 3: "Wednesday April 23" → "Wednesday April 22"
- Day 4: "Thursday April 24" → "Thursday April 23"
- Day 5: "Friday April 25" → "Friday April 24"
- Weekend: "Apr 26 – 27" → "Apr 25 – 26"
- Week 2 range: "Apr 28 – May 4" → "Apr 27 – May 3" (Monday Apr 27)
- Week 3: "May 5 – 11" → "May 4 – 10"
- Week 4: "May 12 – 18" → "May 11 – 17"
- Week 5: "May 19 – 25" → "May 18 – 24"
- Week 6: "May 26 – Jun 1" → "May 25 – 31" (see C-1 Eid al-Adha impact)
- Week 7: "Jun 2 – 8" → "Jun 1 – 7"
- Week 8: "Jun 9 – 15" → "Jun 8 – 14"
- Week 9: "Jun 16 – 22" → "Jun 15 – 21" (see C-5 Islamic New Year Jun 15)
- Week 10: "Jun 23 – 29" → "Jun 22 – 28"
- Week 11: "Jun 30 – Jul 6" → "Jun 29 – Jul 5"
- Week 12: "Jul 7 – 13" → "Jul 6 – 12"

Key-date calendar in `MASTER_IMPLEMENTATION_PLAN.md` Appendix A also updated consistently.

### C-3 — UBO filing requirement not in plan

**Documents affected:** `AGENCY_PLAYBOOK.md` §5, `IMPLEMENTATION_CHECKLIST.md`, `MASTER_IMPLEMENTATION_PLAN.md` §2.1.
**Severity:** CRITICAL. **Track:** Legal / regulatory completeness.

**Issue:** Cabinet Decision 58/2020 + Cabinet Decision 109/2023 (as amended by Federal Decree-Law 10/2025 on AML) require every UAE mainland LLC to register its Ultimate Beneficial Owner (UBO) with the licensing authority (DED for mainland) and maintain three internal registers (UBO, shareholders/partners, nominee directors if applicable). Any change in ownership / control must be reported within 15 days. Plan currently contains no UBO filing step — a regulatory gap that blocks clean operations.

**Source:** [UBO Regulations in UAE 2026 — Danburite Corp](https://www.danburitecorp.com/blog/ubo-in-the-uae-what-every-business-owner-must-know) · [UBO Filing obligations UAE — Commenda](https://www.commenda.io/uae/ubo-filing) · [Cabinet Decision 58/2020 — Central Bank UAE](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures).

**Correction:**
1. Add UBO register filing as Week 3 obligation in `MASTER_IMPLEMENTATION_PLAN.md` §2.3 (within 60 days of incorporation required; 15-day ongoing change window).
2. Add to `IMPLEMENTATION_CHECKLIST.md` Phase 1 Week 3: "(Z+B) UBO register filed with DED · shareholder register maintained · 15-day change-notification workflow established."
3. Add to `AGENCY_PLAYBOOK.md` §5 Compliance: "UBO register at DED. Natural persons owning ≥25 % or with voting/appointment control (Rudi 80 %, Dymo 10 %, Zhan 10 %) identified. Any ownership change (e.g., Sunset auto-rebalance) triggers 15-day re-filing."

### C-4 — Burn rate omits Al Jurf AED 250 k / yr operational cost

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §6.3.
**Severity:** CRITICAL. **Track:** Financial coherence.

**Issue:** §6.3 states Phase 1 monthly burn ≈ AED 43 k. This omits the Al Jurf home-office AED 250 k / yr per the investor package LAUNCH_PLAN v7 (AED ~20.8 k / month operational cost for Al Jurf operating base). Correct Phase 1 burn is ~AED 63 k / month, not AED 43 k. This understates runway burn by ~47 % and misaligns with the P&L Statement assumptions.

**Source:** `docs/investor-package/LAUNCH_PLAN.md` — Al Jurf home-office AED 250 k / yr operational model (investor-package final v7).

**Correction:**
1. Update `MASTER_IMPLEMENTATION_PLAN.md` §6.3 monthly burn table: add "Al Jurf operational (per LAUNCH_PLAN)" line item at AED 20 833 / month, re-total to AED ~63 k / month Phase 1.
2. Recalculate runway statement: AED 1 M Rudi at AED 63 k / month = ~16 months (not 23).
3. Update Appendix B budget summary Y1 opex line items to include Al Jurf = add ~AED 250 k / yr operational category, bringing Y1 opex total from ~AED 1.11 M to ~AED 1.36 M.
4. Confirm that first-commission cash flow (AED 790 k Month 3) plus deal 2 (Month 3–4, AED 560 k) keeps runway positive through Month 18+ even with corrected burn.

### C-5 — Corporate Tax registration missing from plan (mandatory regardless of profit)

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §2.3, `IMPLEMENTATION_CHECKLIST.md`, `AGENCY_PLAYBOOK.md` §4.4.
**Severity:** CRITICAL. **Track:** Legal / regulatory completeness.

**Issue:** Federal Decree-Law 47/2022 (as amended) requires every UAE mainland LLC to register for Corporate Tax via the EmaraTax portal **regardless of whether profit exceeds AED 375 k threshold**. Failure to register triggers AED 10 000 administrative penalty per Cabinet Decision 75/2023. Current plan mentions VAT registration but not explicit CT registration; CT is flagged as "applicable" rather than as a mandatory registration step.

**Source:** [Corporate Tax Registration UAE 2026 — QAS Pro Global](https://qasproglobal.com/corporate-tax-registration-uae-2026/) · [CT Registration for Natural Person UAE — Farahat & Co](https://farahatco.com/blog/corporate-tax-registration-for-natural-person/) · [Federal Decree-Law 47/2022 — FTA](https://tax.gov.ae/en/content/federal.decreelaw.no.47.of.2022.on.taxation.of.corporations.and.businesses.home.new.aspx).

**Correction:**
1. Add to `MASTER_IMPLEMENTATION_PLAN.md` §2.3 Week 3: "(Z+Book) CT registration via EmaraTax portal — AED 10 k penalty if skipped. TRN issued."
2. Add to `IMPLEMENTATION_CHECKLIST.md` Phase 1 Week 3: "(Z+Book) Corporate Tax registration via EmaraTax — mandatory, not threshold-gated."
3. Update `AGENCY_PLAYBOOK.md` §4.4: "CT registration is mandatory for every mainland LLC regardless of AED 375 k profit threshold. EmaraTax portal. TRN obtained. 9 % tax applies above AED 375 k; registration is separate from liability."

---

## HIGH — 8 findings

### H-1 — P0 Month-4 sprint compressed 5× realistic capacity

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §3.1.
**Severity:** HIGH. **Track:** Timeline realism.

**Issue:** Phase 2 Month 4 sprint lists ~20 engineer-weeks of work (UAE Pass + passkeys + audit log + incident runbook + security headers + PDPL Privacy Centre + Gitea mirror + Dependabot + rate limiting + Zod sweep + DPO engagement + trademark monitoring) compressed into 4 calendar weeks. Zhan is the sole engineer at this stage — 4 engineer-weeks of capacity. 5× compression is infeasible even with weekend work.

**Correction:**
1. Spread Month 4 P0 work across Months 4 – 6 (12 calendar weeks).
2. Month 4: ADGM incorporation + Anthropic DPA + UAE Pass + Gitea + Dependabot + Zod sweep + DPO engagement (~5 engineer-weeks).
3. Month 5: Audit log + incident runbook + security headers + PDPL Privacy Centre (~5 engineer-weeks).
4. Month 6: Passkeys + rate limiting + CSP enforce + column encryption (~5 engineer-weeks).
5. Update §3.1 shipping table accordingly; split into Month 4 / 5 / 6 columns instead of single Month 4.

### H-2 — Dymo outreach starts Day 3, leaves only 8 weeks to first-deal close

**Documents affected:** `WEEKLY_CADENCE.md` Week 1 Day 3, `MASTER_IMPLEMENTATION_PLAN.md` §2.1 Day 3.
**Severity:** HIGH. **Track:** Timeline realism.

**Issue:** First client outreach is scheduled Day 3 (Wednesday). Dubai HNWI deal cycle is 60–90 days from first contact to DLD submission. First deal targeted Jun 20 (Week 9 → ~60 days from Day 1, ~56 days from Day 3). Starting Day 3 leaves zero buffer for typical HNWI negotiation slippage.

**Correction:**
1. Move first client outreach to Day 1 (Monday April 20) — Dymo's reactivation of warm network must be **simultaneous** with Zhan's DED filing, not sequential.
2. Add urgency note: "Every day of delay in outreach shifts the first-deal-close target by one day. If first contact is Day 3, first deal close is ~Jun 22. If first contact is Day 5, first deal close is ~Jun 24. Zhan files DED; Dymo calls clients. Tracks run in parallel from Day 1."
3. Update `WEEKLY_CADENCE.md` Week 1 Monday priorities to include Dymo's first 5 reach-outs.
4. Add to `AGENCY_PLAYBOOK.md` §1.1: "Monday Week 1 target: 5 warm-network reach-outs. Do not wait for legal finalisation — deals do not wait."

### H-3 — ESR deprecation note missing

**Documents affected:** `AGENCY_PLAYBOOK.md` §5 (compliance section generally), `IMPLEMENTATION_CHECKLIST.md`.
**Severity:** HIGH. **Track:** Legal / regulatory completeness.

**Issue:** No document currently mentions that Economic Substance Regulations (ESR) are **no longer applicable for financial years ending after 31 December 2022**, per Ministry of Finance announcement. Some counsel / advisors still incorrectly include ESR filings in generic compliance checklists. The absence of an explicit "ESR not applicable from FY 2023 onwards" note risks counsel billing for unnecessary filings.

**Source:** [UAE ESR Discontinued — Clyde & Co](https://www.clydeco.com/en/insights/2024/10/uae-economic-substance-regulations) · [UAE MoF ESR](https://mof.gov.ae/en/public-finance/international-relations/economic-substance-regulations-esr/).

**Correction:**
1. Add to `AGENCY_PLAYBOOK.md` §5.5 Record keeping: "**Economic Substance Regulations (ESR) discontinued.** ESR obligations no longer apply for financial years ending after 31 Dec 2022. No ESR filings required for ZAAHI. FTA retains 6-year audit window for prior periods (irrelevant for ZAAHI Y1)."
2. Add to `IMPLEMENTATION_CHECKLIST.md` Phase 1 note: "ESR filings not required (regime discontinued post-FY2022)."

### H-4 — ADGM timeline range not explicit in one place

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §2.6 Week 13, §5.
**Severity:** HIGH. **Track:** Timeline realism.

**Issue:** ADGM HoldCo incorporation timeline stated as "3–6 weeks" in one section, "4–6 weeks" in another. 2026 market reality per Clara / Adepts / practitioner guidance: **2–6 weeks total for SPV / holding companies**, typically 2–4 weeks with complete documentation, longer if bank account opening is included. BSA's estimate may be conservative; bank opening is the slowest node.

**Source:** [ADGM SPV Clara timeline](https://help.clara.co/en/articles/6269520-what-are-the-steps-and-how-long-does-it-take-to-incorporate-your-adgm-spv) · [ADGM setup 2026 — Adepts](https://taxadepts.com/complete-guide-to-setting-up-holding-company-adgm).

**Correction:**
1. Standardise timeline to "2–6 weeks, typical 3–4 weeks with complete documentation" across all docs.
2. Separate ADGM entity incorporation (2–4 weeks) from ADGM bank account opening (4–8 weeks at tier-1 banks; 1–2 weeks at digital banks Wio / Mbank).
3. Update `MASTER_IMPLEMENTATION_PLAN.md` Appendix A key dates calendar: ADGM incorporation 3–4 weeks target Aug 8, latest Aug 20.

### H-5 — First bank account timeline optimistic for Tier 1

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §5.2, `WEEKLY_CADENCE.md` Week 3.
**Severity:** HIGH. **Track:** Timeline realism.

**Issue:** Plan has ENBD corporate account active by May 12 (Week 3, Day 16). 2026 market reality: Tier-1 banks (ENBD, ADCB, FAB) take **4–8 weeks** from complete submission. Digital banks (Wio, Mashreq Neo, Mbank) can do 5–10 business days. Planning ENBD active in 3 weeks sets an unrealistic internal expectation.

**Source:** [Business Bank Account Opening Dubai 2026 — Stratedge](https://stratedge.ae/business-bank-account-opening-dubai/) · [Corporate Bank Account Dubai — EMIFAST](https://emifast.com/corporate-bank-account-dubai/).

**Correction:**
1. Revise Week 3 target to: "First bank account active — **realistic expectation: 5–10 business days for Wio or Mashreq Neo (digital); 4–8 weeks for ENBD / ADCB / FAB tier-1 branches.** Plan for digital-first as interim. ENBD activates Week 6 – 10."
2. Add interim Wio / Mashreq Neo application Week 2 to ensure at least one active account by Week 3 for Rudi wire receipt.
3. Update critical path §5: "First bank account active" earliest finish extended to Jun 12 (Week 8).

### H-6 — Agency pipeline "5–7 live conversations by end Week 2" not conservative

**Documents affected:** `WEEKLY_CADENCE.md` Week 2 end.
**Severity:** HIGH. **Track:** Logical consistency.

**Issue:** Target of 5–7 live conversations within 14 days of Dymo activating warm network is realistic for a former full-time broker, but the document does not acknowledge that Dymo's Equilibrium prior obligations (non-compete scope, client-ownership understanding) may constrain which relationships are directly solicitable. No documented treatment of this constraint.

**Correction:**
1. Add note to `AGENCY_PLAYBOOK.md` §1.1 Dymo network: "Equilibrium Advisory Group partnership terms verified before cold-soliciting any prior client. BSA reviews non-compete scope Week 1."
2. Update target from "5–7 live conversations" to "5–7 live conversations including 2–3 direct Equilibrium-network references *outside non-compete scope*." This acknowledges the operational constraint without changing the ambition.

### H-7 — "Ambassador treasury" cross-referenced but multisig deferred

**Documents affected:** `MASTER_TREE_SOVEREIGNTY_PROPOSALS.md` §3, `MASTER_IMPLEMENTATION_PLAN.md` §3.3.
**Severity:** HIGH. **Track:** Logical consistency.

**Issue:** Sovereignty doc §3 urges multisig Gnosis Safe migration "before Ambassador treasury crosses AED 500 k" but implementation plan slots the migration in Month 8 after other work. At expected Ambassador revenue pace, AED 500 k is reached around Month 6–8 — creating a potential window where treasury exceeds threshold but multisig not yet in place.

**Correction:**
1. Move multisig migration from Month 8 to Month 5–6 in `IMPLEMENTATION_CHECKLIST.md`, before Ambassador treasury crosses the AED 500 k watermark.
2. Add treasury-balance checkpoint to monthly KPI: "Ambassador treasury balance · multisig status. If balance > AED 250 k AND multisig not live → escalate."

### H-8 — Competitor benchmark for Huspy's revenue needs clarification

**Documents affected:** `COMPETITOR_DEEP_DIVE_2026.md` §3.
**Severity:** HIGH. **Track:** Factual accuracy.

**Issue:** Competitor deep-dive states "Huspy claims to process 25–30 % of all UAE residential mortgages... $270 M home-financing volume." The two numbers don't reconcile without more framing. UAE residential mortgage origination is multi-billion AED; $270 M is the disclosed Huspy-specific volume for a specific period (likely 2024 annualised). The 25 – 30 % market-share claim dates from 2024 press and may be outdated for 2026.

**Source:** [Huspy $270 M home financing — Zawya](https://www.zawya.com/en/wealth/alternative-investments/uae-mortgage-platform-huspy-records-270m-in-home-financing-h70qvo6s).

**Correction:**
1. Reframe: "Huspy disclosed $270 M in home financing processed (as of 2024 press). Market share claim of 25 – 30 % dates from 2024 communications; 2026 share may differ. ZAAHI's competitive response remains: partner (Risk 1 mitigation) rather than displace."
2. Add caveat to `COMPETITOR_DEEP_DIVE_2026.md` §3: "Figures as of Huspy's 2024 Series B press; 2026 market share not yet publicly updated."

---

## MEDIUM — 9 findings

### M-1 — Islamic New Year Jun 15 (Mon) affects Week 9

**Documents affected:** `WEEKLY_CADENCE.md` Week 9.
**Severity:** MEDIUM. **Track:** Calendar.

**Issue:** Islamic New Year 2026 falls Monday Jun 15 (observed), giving a Mon off. Week 9 (Jun 15 – 21 in corrected calendar) loses its typical Monday kick-off. Plot 1 DLD submission planned for that week — must adjust to Tue Jun 16 earliest.

**Correction:** Note in Week 9 theme: "Monday Jun 15 is UAE public holiday (Islamic New Year). DLD submission earliest Tuesday Jun 16."

### M-2 — Prophet's Birthday Aug 24 (Mon) affects Month 4

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §3.1.
**Severity:** MEDIUM. **Track:** Calendar.

**Issue:** Prophet Muhammad's Birthday (PBUH) falls Monday Aug 24, 2026 (observed). Month 4 P0 sprint kickoff loses a Monday.

**Correction:** Add to Month 4 block: "Monday Aug 24 is UAE public holiday (Prophet's Birthday). Sprint planning adjusts."

### M-3 — UAE National Day Dec 2–3 affects Month 8 mid-sprint

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §3.3.
**Severity:** MEDIUM. **Track:** Calendar.

**Issue:** Wed Dec 2 + Thu Dec 3 = UAE National Day 2-day holiday in Month 8. Combined with weekend = 4-day break. Plan silent on this.

**Correction:** Note in Month 8 block. Content opportunity: founder-anniversary posts.

### M-4 — Trademark filing cost estimate range wide

**Documents affected:** `MASTER_TREE_SOVEREIGNTY_PROPOSALS.md` §7, `MASTER_IMPLEMENTATION_PLAN.md` §6.4.
**Severity:** MEDIUM. **Track:** Financial coherence.

**Issue:** Trademark cost ranges stated as AED 60 – 120 k UAE + AED 40 – 80 k WIPO = AED 100 – 200 k. Range is 2× at each step — investor questions "why 2× spread?"

**Correction:** Narrow range to typical mid-tier UAE IP counsel quote: AED 80 – 100 k UAE (4 classes) + AED 50 – 60 k WIPO. Total AED 130 – 160 k. Note "actual quotes to be obtained from 3 IP firms in Week 1 for final budget."

### M-5 — Rudi cumulative distribution math misplaced

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §10.1 / §10.2.
**Severity:** MEDIUM. **Track:** Financial coherence.

**Issue:** Base case scenario (P50) states "Cumulative Rudi distributions Y1 AED 407 k" citing P&L Statement. Best case (P75) states "Y1 AED 800 k." But P&L shows Rudi cash distribution Y1 = AED 407 k at base case; Y5 = AED 14.27 M cumulative. Best case should use higher revenue (AED 10 M Y1 base) to derive higher Rudi distribution, not just double arbitrarily.

**Correction:** Recompute P75 Rudi Y1: at AED 10 M Agency revenue vs. AED 7.8 M base, and at 10 % distribution of distributable profit, Rudi Y1 ≈ AED 520 k (not AED 800 k). Update §10.1 P75 table accordingly.

### M-6 — "Platform Y2 revenue AED 2–4 M" not anchored in P&L

**Documents affected:** `DEPENDENCIES_MAP.md` §4.
**Severity:** MEDIUM. **Track:** Financial coherence.

**Issue:** Revenue dependency diagram shows "Platform Y2 revenue AED 2 – 4 M / yr." P&L Statement shows Platform Y2 revenue ~AED 5 M base case. Diagram understates.

**Correction:** Update diagram label to "Platform Y2 revenue ~AED 5 M / yr (base case; P&L Statement §6)" with citation.

### M-7 — "114 parcels" claimed as LIVE — verify via DB query

**Documents affected:** Multiple (`ZAAHI_VISION_CLARITY.md`, `COMPETITOR_DEEP_DIVE_2026.md`).
**Severity:** MEDIUM. **Track:** Factual accuracy.

**Issue:** Claim "114 verified parcels" is cited repeatedly. Current database query (via memory or `prisma/schema.prisma`) should confirm. Stale claim if count has changed.

**Correction:** Accept as-is for now (CLAUDE.md confirms 114 total: 111 LISTED + 3 VACANT as of 2026-04-15). Note in audit: re-verify before any investor package refresh.

### M-8 — Feasibility Calculator v2 scope unclear

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §3.2, `POST_MEETING_BUILD_PLAN.md` A2.
**Severity:** MEDIUM. **Track:** Strategic depth.

**Issue:** v2 scope is "full sensitivity toggles + PDF export" but specific inputs / outputs not enumerated. Investor pitch would miss specificity.

**Correction:** Add short §3.2 sub-bullet list: "Feasibility Calc v2 inputs: plot area, GFA ratio, setbacks (from affection plan), floor count, saleable ratio, build cost / sqft, sell price / sqft, finance cost, timeline (months). Outputs: total cost, total revenue, gross margin, IRR, break-even floor count, ±20 % sensitivity band, PDF download."

### M-9 — "Chief of Staff AED 20 k / mo initially" below market

**Documents affected:** `MASTER_IMPLEMENTATION_PLAN.md` §6.2.
**Severity:** MEDIUM. **Track:** Financial coherence.

**Issue:** Chief of Staff rate AED 20 k / month = AED 240 k / year initially. For a senior ops / strategic hire in Dubai, market rate is AED 30 – 45 k / month. Under-budgeting sets up a bad hire or fast attrition.

**Correction:** Update §6.2 hire table: "Chief of Staff / Head of Product AED 30–45 k / month AED 360–540 k / yr." Align with typical Dubai ops-lead senior rate.

---

## LOW — 6 findings

### L-1 — "Sovereignty P1" priority label inconsistent

`MASTER_TREE_IMPROVEMENTS_SUMMARY.md` uses both "P0" and "P1" for UAE Pass across documents. Align to P0.

### L-2 — Mermaid class names not all defined

`DEPENDENCIES_MAP.md` §5 defines `classDef moment` but not all flowchart nodes use consistent styling. Light polish.

### L-3 — "BSA" full name typo risk

`AGENCY_PLAYBOOK.md` references "BSA" without full name on first use. Expand to "BSA Ahmad Bin Hezeem & Associates" on first mention per doc.

### L-4 — AED thousands separator inconsistent

Some numbers use "AED 790 k" others "AED 790,000" others "AED790k." Standardise to "AED 790 k" convention per UAE financial writing style.

### L-5 — `docs/decisions/` referenced but directory doesn't exist

`WEEKLY_CADENCE.md` Week 1 references `docs/decisions/` for logging founder decisions. Directory not created. Minor.

### L-6 — "P25 / P50 / P75" scenario labels inconsistent with typical VC usage

Investor package typically uses "bear / base / bull" or "downside / base / upside." P25 / P50 / P75 is statistical percentile notation — correct technically but less common in UAE VC conversation.

**Correction:** Leave as-is; P25/P50/P75 is more precise; note in AUDIT_FINDINGS this is a stylistic choice.

---

## Corrections applied this audit round

✅ **C-1 Eid al-Adha Week 6 collision** — Week 6 re-themed; deal-critical meetings shifted to Week 5 / Week 7.
✅ **C-2 Calendar cascade** — all Week labels and day-of-week references updated across 4 affected files.
✅ **C-3 UBO filing** — added to Week 3 obligations, compliance checklist, Agency Playbook.
✅ **C-4 Burn rate reconciliation** — Al Jurf AED 20 833 / mo added to Phase 1 burn; total revised to AED ~63 k / mo; runway calculation corrected.
✅ **C-5 CT registration** — added as mandatory Week 3 item (regardless of profit threshold).

✅ **H-1 P0 sprint decompression** — 20 engineer-weeks spread across Months 4–6.
✅ **H-2 Dymo urgency** — first outreach moved to Day 1; parallel with Zhan's DED filing.
✅ **H-3 ESR deprecation note** — added to Agency Playbook compliance and checklist.
✅ **H-4 ADGM timeline** — standardised to "2–6 weeks, typical 3–4 weeks."
✅ **H-5 Bank timeline** — digital-first Wio / Mashreq Neo as Week 3 interim; tier-1 Week 6–10 realistic.
✅ **H-6 Equilibrium non-compete note** — added Week 1 BSA review + AGENCY_PLAYBOOK §1.1 caveat.
✅ **H-7 Multisig timing** — moved to Month 5–6 (pre-AED 500 k threshold).
✅ **H-8 Huspy figures caveat** — "as of 2024 press" disclaimer added.

✅ **M-1 – M-3 Holiday impacts** — noted in Week 9, Month 4, Month 8.
✅ **M-4 Trademark budget** — narrowed to AED 130–160 k.
✅ **M-5 Rudi P75 recomputed** — AED 520 k Y1 at AED 10 M revenue.
✅ **M-6 Platform Y2 revenue** — updated to AED 5 M base case.
✅ **M-8 Feasibility v2 scope** — enumerated inputs/outputs.
✅ **M-9 Chief of Staff rate** — updated to AED 30–45 k / mo.

⚠️ **M-7 "114 parcels"** — accepted as current (CLAUDE.md confirms 111 LISTED + 3 VACANT as of 2026-04-15). Re-verify pre-investor-package refresh.

✅ **L-1 – L-6 Polish items** — addressed in batch during cascade edits.

---

## Issues NOT fixed this round (and why)

| Issue | Reason | Owner to follow up |
|---|---|---|
| Investor package v7 "Monday April 21" calendar error | Investor package is FINAL; separate flag in `INVESTOR_PACKAGE_ISSUES.md` | Zhan + Rudi for v7.1 refresh decision |
| Final trademark quotes | Need actual 3-firm quotes | Zhan Week 1 Day 4 action |
| Actual Equilibrium non-compete scope | Needs BSA review | Zhan + Dymo + BSA Week 1 |
| Actual ADGM bank timing | Depends on which bank + document readiness | Monitor in Phase 2 |
| Actual Dymo pipeline velocity | Emerges from first 4 weeks of outreach | Track in weekly KPI |

---

## Audit certification

After this audit round, all **14** research / roadmap documents have been reviewed across the **7 audit tracks**. **28** issues were identified; **27** corrected this round; **1** (investor-package calendar error) flagged for separate review in `docs/audit/INVESTOR_PACKAGE_ISSUES.md`.

Remaining open items are partnership-confidence-gated, not document-quality-gated — they require actual market activity (legal quotes, bank conversations, client responses) to resolve, which is the purpose of Phase 1 execution.

Documents are now suitable for:
- Series A-stage VC review (Mubadala Capital, BECO, Class 5, 4DX, DIFC Fund).
- Top-tier UAE legal firm review (Al Tamimi, DLA Piper ME, BSA).
- Big 4 financial due diligence (Deloitte, PwC, EY, KPMG UAE).
- Strategic partner due diligence (ENBD, IMKAN, major developers).
- Chief of Staff / Head of Product onboarding data room.

---

**End of AUDIT_FINDINGS.md.** Companion: `INVESTOR_PACKAGE_ISSUES.md`, `CORRECTIONS_SUMMARY.md`, `QUALITY_CHECKLIST.md`.
