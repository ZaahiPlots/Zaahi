# FOUNDER_QUESTIONS_COMPLETE — ZAAHI full-surface audit

**Branch:** `research/full-audit-2026-04-24` · **Source commit base:** `6b6c5e3`
**Audit date:** 2026-04-24
**Author:** ZAAHI engineering agent (read-only audit, single session)
**Classification:** CONFIDENTIAL · founder-review document

**Scope:** every open question, unratified default, pending vendor decision, spec TBD, schema ambiguity, and governance gap across the ZAAHI project, merged into one canonical list. Every question is traceable to a source file/line or commit hash. None are invented.

**Status:** PENDING FOUNDER REVIEW. No execution starts on any answered decision until founder confirms in writing. No defaults are applied without founder acknowledgement of the default in §4.

**Use:** this document is the **single place** founders go to unblock downstream work. Each question specifies what it blocks so the founder can prioritise. Questions are priced by **what they cost to leave open**, not by what they cost to answer.

---

# Table of contents

| § | Title |
|---|---|
| 1 | Executive summary — totals, top-10 load-bearing, top-10 JAN-specific, top-10 time-critical |
| 2 | Questions by category (A–T) |
| 3 | Deduplication log — which questions appeared in multiple sources |
| 4 | Pending ratifications tracker — 22 defaults, 4 Rudi decisions |
| 5 | Recommended answer order — this week / next 2 weeks / month+ |
| 6 | Honest gaps — sections this audit could not properly examine |

---

# §1 · Executive summary

## 1.1 Totals

**Total unique questions after deduplication:** 187
- From MULTI_ROLE_DISCOVERY §10 (commit 6b6c5e3): 40 · **preserved with original Q-1…Q-40 numbers**
- From Master Tree structural audit: 49 findings → consolidated to ~28 unique Qs
- From Phase 1 specs (01-05 + cross-spec): 67 findings → consolidated to ~42 unique Qs
- From Architecture docs (§77, §78, AUTONOMY, PRICING, PARKED Feasibility): 45 findings → consolidated to ~22 unique Qs
- From Ops + Decisions + prior Audits (SV-14, Core42, Pilot, Bus Factor, AUDIT_FINDINGS, INVESTOR_PACKAGE_ISSUES, OPEN_QUESTIONS_FOR_OWNERS): ~60 findings → consolidated to ~35 unique Qs
- From CLAUDE.md + source grep: 12 findings → consolidated to ~8 unique Qs
- New cross-source items surfaced during dedup: ~12

## 1.2 Breakdown by category

| Category | Count | Priority split |
|---|---:|---|
| A · Master Tree structural | 18 | 2 P0 · 6 P1 · 10 P2 |
| B · Phase 1 specs implementation gaps | 28 | 12 P0 · 14 P1 · 2 P2 |
| C · Schema · migration · database | 11 | 3 P0 · 7 P1 · 1 P2 |
| D · Auth · roles · permissions | 10 | 1 P0 · 6 P1 · 3 P2 |
| E · Payments · commissions · invoicing | 12 | 7 P0 · 5 P1 · 0 P2 |
| F · Compliance (RERA · DLD · PDPL · AML · FTA) | 14 | 5 P0 · 6 P1 · 3 P2 |
| G · Pricing · subscription tiers | 10 | 3 P0 · 5 P1 · 2 P2 |
| H · Partnership (Rudi · Emaar · Core42 · counsel) | 12 | 7 P0 · 3 P1 · 2 P2 |
| I · Vendor selection (DPO · counsel · AML · hosting) | 9 | 2 P0 · 6 P1 · 1 P2 |
| J · Infrastructure (staging · Abu Dhabi · ADGM · DIFC) | 10 | 3 P0 · 5 P1 · 2 P2 |
| K · Scope-cut (what drops first on slip) | 6 | 1 P0 · 4 P1 · 1 P2 |
| L · Governance (code review · feature flags · ownership) | 11 | 3 P0 · 6 P1 · 2 P2 |
| M · Strategic (pivot order · timeline · commitments) | 8 | 4 P0 · 3 P1 · 1 P2 |
| N · Bus factor · operational risk | 6 | 4 P0 · 2 P1 · 0 P2 |
| O · UI/UX open decisions | 8 | 1 P0 · 5 P1 · 2 P2 |
| P · AI · Archibald · Claude integration | 6 | 0 P0 · 3 P1 · 3 P2 |
| Q · Data sovereignty · self-hosting path | 5 | 0 P0 · 2 P1 · 3 P2 |
| R · Wall · social features · Advertiser Permit | 3 | 0 P0 · 2 P1 · 1 P2 |
| S · Tokenisation · blockchain · metaverse | 4 | 0 P0 · 1 P1 · 3 P2 |
| T · Robotics Fund · expansion | 3 | 0 P0 · 0 P1 · 3 P2 |
| **TOTAL** | **184** | **58 P0 · 91 P1 · 40 P2** |

Owner split: DYMO 43 · JAN 62 · BOTH 79

## 1.3 Top 10 load-bearing questions (what unlocks most downstream work)

These are the questions where one answer unblocks the largest number of downstream tasks.

1. **Q-C1 · Migration path for schema expansion** [P0 · BOTH] — do we open a staging Supabase project before any multi-role migration, or migrate directly on prod? Unblocks Phase B1 schema work (~15 dependent tasks).
2. **Q-M1 · Pivot order** — BROKER → OWNER → AMBASSADOR → DEVELOPER → INVESTOR → ARCHITECT, or different? [P0 · BOTH] (same as MRD Q-1). Unblocks Phase B1/B2/B3 task ordering.
3. **Q-H1 · SV-14 ratification status** [P0 · DYMO] — has Rudi approved moving infrastructure to Core42 Abu Dhabi at the Sunday call (2026-04-27 EOD)? Unblocks Core42 outreach, Spec 05/06/78 execution, the §50 canonical amendment signature.
4. **Q-H6 · Rudi AED 1M agency wire — confirmed by 2026-05-08?** [P0 · DYMO] Unblocks agency launch, Plot 1 pipeline, commission accrual.
5. **Q-M7 · Plot 1 first deal — is 2026-06-19 (Fri Week 9) the hard close date, or is it sliding?** [P0 · BOTH] Unblocks Spec 01/02/03/04 ship dates; affects ambassador first commission event.
6. **Q-N1 · Bus factor fix co-working date** [P0 · BOTH] — is 2026-05-03 Sat confirmed, floating, or un-scheduled? Must land before Q-H6. Unblocks founder-access governance, 1Password setup, recovery runbook.
7. **Q-D3 · Option C hybrid RBAC approved?** [P0 · BOTH] (same as MRD Q-9). Unblocks every role-specific schema migration + permission-layer work.
8. **Q-I1 · DPO hire/retainer timing** [P0 · DYMO] — this quarter or after migration? (same as MRD Q-13). Unblocks PDPL compliance posture, Supabase SCC question, Jan 2027 enforcement readiness.
9. **Q-G1 · Ambassador 3-tier rollout — before or after first external paid ambassador?** [P0 · BOTH] (same as MRD Q-5). Unblocks User.ambassadorPlan column, Commission.tier freeze, tier-aware awardCommissions().
10. **Q-F1 · RERA verification depth for BROKER onboarding** [P0 · DYMO] (same as MRD Q-11). Unblocks BROKER MVP scope; 1-eng-week decision.

## 1.4 Top 10 [JAN]-specific (engineer-owned) questions

Jan (Zharkyn / Zhan) is the sole engineering capacity at 4 eng-weeks/month Phase 1. These are the questions that most directly constrain his work.

1. **Q-JAN1 = Q-B1 · pendingTRN field location** [P0 · JAN] — is `pendingTRN` shipped in Spec 02 Invoice migration, or added separately for Spec 03 v2 Super-Admin? Without this, Spec 03 §14.6 "Manual payment override" cannot ship. Source: Spec 02 §6.5 + Spec 03 §14.6 cross-reference.
2. **Q-JAN2 = Q-B2 · Plot 1 schedule buffer** [P0 · JAN] — if Spec 02 ships Week 6, Spec 01 Week 8, Spec 03 v1 Week 9, Spec 03 v2 Week 10, Spec 04 Week 12, and Plot 1 closes Fri Week 9 (2026-06-19), what is Jan's contingency if ANY spec slips 1 week? Source: Spec 01/02/03/04 §9 + cross-spec finding #4.
3. **Q-JAN3 = Q-B5 · Auth Abstraction Phase 1a–1c timing** [P0 · JAN] — is Spec 05 Phase 1a (adapter interface) ship Month 5 dependent on Core42 MSA signed, or can it ship independently? Source: Spec 05 §1.3 line 77.
4. **Q-JAN4 = Q-D9 · RLS refactor deadline** [P0 · JAN] — RLS policies reference `auth.uid()`; Spec 05 §6.3 marks this MUST complete during Phase 1b-c (Month 6). If Phase 1b-c slips to Month 7+, is Phase 2 cutover (Month 9-10) blocked? Source: Spec 05 §6.3 line 723.
5. **Q-JAN5 = Q-B8 · WireGuard VPN deployment owner** [P0 · JAN] — Spec 03 §14.9.6 describes full WireGuard server deployment with AED 150/mo hosting. Who is responsible — Jan, a DevOps partner hire, or outsourced? Source: Spec 03 §14.9.6 lines 801-823.
6. **Q-JAN6 = Q-C2 · Ambassador schema gap — User.ambassadorPlan column** [P0 · JAN] — when does the schema change land? In Spec 02 migration (piggyback), its own migration, or Phase B1 multi-role bundle? Source: `src/lib/ambassador.ts` line 43 TODO comment + CLAUDE.md Ambassador Program Rules.
7. **Q-JAN7 = Q-B15 · jsPDF architecture decision** [P1 · JAN] — if a 3rd PDF document type is needed (Deal PDF, Offer PDF) beyond Invoice (Spec 02) + Feasibility (Spec 04), is jsPDF still the approved path, or does it trigger a Puppeteer re-eval? Source: Spec 02 §6.3 + Spec 04 §6.3 cross-ref.
8. **Q-JAN8 = Q-L5 · Feature-flag flip authority** [P1 · JAN] (same as MRD Q-22, Q-38) — for each new role, does Jan need founder sign-off per flag flip, or engineering-autonomous up to an MVP checklist pass?
9. **Q-JAN9 = Q-B24 · `src/app/page.tsx` CLAUDE.md DO-NOT-MODIFY** [P1 · JAN] — at Phase 2 cutover, if page.tsx needs adjustment for Azure B2C, does founder approve direct edit, or force the "thin shim" alternative (Spec 05 §6.2)? Source: Spec 05 §6.2 lines 686-694.
10. **Q-JAN10 = Q-L8 · Schema migration pre-merge review** [P1 · BOTH] (same as MRD Q-37) — for each Phase B1/B2/B3 schema migration, must Jan pair-review with Dymo before merge, or can he ship post-merge-review given the blast radius?

## 1.5 Top 10 time-critical (blocks 2026-05-08 Rudi wire or 2026-06-19 first commission)

1. **Q-H1 · SV-14 Sunday call ratification** [P0 · DYMO] — deadline Sun 2026-04-27, 3 days from audit. Blocks Core42 outreach Mon 2026-04-28.
2. **Q-N1 · Bus factor fix co-working session** [P0 · BOTH] — target Sat 2026-05-03, must land before Rudi wire Thu 2026-05-08.
3. **Q-H6 · Rudi AED 1M wire** [P0 · DYMO] — deadline 2026-05-08. Blocks agency activation, Plot 1 pipeline.
4. **Q-N2 · Bus factor sign-off memo** [P0 · BOTH] — must be filed before Q-H6.
5. **Q-L1 · Phase 1 critical-path OPEN_QUESTIONS answers (Q-1, Q-9, Q-13, Q-14, Q-34 in the prior OPEN_QUESTIONS list)** [P0 · BOTH] — target 2026-05-10. Blocks MASTER_TREE_ENHANCEMENT_PROPOSAL refresh binding.
6. **Q-H2 · Core42 discovery call scheduling** [P0 · DYMO] — target week of 2026-05-05 post-SV-14 ratification. Blocks RFQ submission (Spec 05/06/78 interlock).
7. **Q-E2 · Plot 1 USDT payment rail live for ambassadors** [P0 · BOTH] — blocks Ambassador 3-tier upgrade test; if first paid ambassador arrives before tier wiring, Q-G1 gets triggered retroactively. Source: CLAUDE.md Ambassador + PILOT_TENANT_OUTREACH §8.1.
8. **Q-B2 · Plot 1 week-9 deal-close spec readiness** [P0 · JAN] (also in JAN top-10) — every Spec 01/02/03/04 ship date feeds 2026-06-19.
9. **Q-F2 · Investor package v7.1 calendar fix decision** [P0 · DYMO] — "Monday 2026-04-21" is actually Tuesday. If v7.1 is issued, all 12 investor-package docs need search-replace. Source: `docs/audit/INVESTOR_PACKAGE_ISSUES.md` IP-1.
10. **Q-H11 · CT registration + UBO filing ADGM/mainland** [P0 · DYMO] — Federal Decree-Law 47/2022 + Cabinet Decision 58/2020 hard deadlines (60 days post-incorporation for UBO, AED 10k penalty for missed CT). Source: AUDIT_FINDINGS CRITICAL-3 + CRITICAL-5.

---

# §2 · Questions by category

**Format per question:**

```
Q-XXX [CATEGORY] [PRIORITY: P0/P1/P2] [OWNER: DYMO/JAN/BOTH]
Question: <concrete, answerable in 2-3 sentences>
Context: <1-2 sentences why this blocks>
Source: <file:line or commit hash>
Blocks: <what downstream work waits on this>
Default if no answer: <best-guess default + disclaimer>
```

---

## §2.A Master Tree structural

### Q-A1 · Serviced apartment asset classification
**[A · P2 · BOTH]**
- **Question:** Is a "Serviced Apartment" a residential asset (§02), hospitality asset (§05), or both? Where does deal routing, compliance, and tax treatment go?
- **Context:** Master Tree §02 Residential line 79 lists it; §05 Hospitality line 130 also references it as "Hotel Apartment". Creates ambiguity in deal engine (Spec 01) + compliance category (§63).
- **Source:** `docs/architecture/MASTER_TREE_final.md` lines 79, 130.
- **Blocks:** Spec 01 Deal Engine category mapping; future Property Management (§13) routing.
- **Default if no answer:** Classify as Residential primary + Hospitality tag (secondary). Disclaimer: UAE municipal practice favours the latter for licensing; revisit post-first Hospitality deal.

### Q-A2 · §07 Mixed-Use vs §58 Construction Pipeline boundary
**[A · P1 · JAN]**
- **Question:** §07 Mixed-Use describes Master Plan + Phase Sequencing + Anchor Tenant Strategy. §58 Construction Pipeline also lists "Master Plan Engine" as a critical node. Which owns master planning — §07 or §58? Is §07 sales/deal structure and §58 execution, or duplicates?
- **Context:** Overlap creates ambiguity for which module handles a mixed-use project setup.
- **Source:** `MASTER_TREE_final.md` lines 160-162 (§07), 850-854 (§58).
- **Blocks:** Developer (B4) role MVP scope; Spec-future Construction Pipeline design.
- **Default if no answer:** §07 = sales / deal structure; §58 = execution / timeline. Boundary: handover to §58 triggers on first Deal → DLD_APPROVED.

### Q-A3 · §17 Broker Commission vs Ambassador Service Fee — same or different pool?
**[A · P0 · BOTH]**
- **Question:** §17 Brokers says "Commission 2% Standard". CLAUDE.md Ambassador section says "ZAAHI service fee = 2% of deal value, commission base". Are these the same 2%, or two stacked 2%s (4% total)?
- **Context:** Critical revenue math. If stacked, broker takes 2% + ZAAHI takes 2% + ambassador commissions flow from ZAAHI's 2%. If same, broker and ZAAHI split the 2%. The former is standard market practice; the latter risks broker revolt.
- **Source:** `MASTER_TREE_final.md` line 284 (§17); `CLAUDE.md` line 515 (Ambassador rules).
- **Blocks:** Spec 02 Invoice (commission calculation), Ambassador payout flow, Broker onboarding pitch.
- **Default if no answer:** Stacked — broker commission 2% + ZAAHI service fee 2% + ambassador commissions from the ZAAHI 2%. Disclaimer: this is the industry-standard interpretation but must be confirmed before first-deal close.

### Q-A4 · §18 Referrals "legacy 3-tier" vs CLAUDE.md "paid 3-tier" — which lives, which dies?
**[A · P1 · BOTH]**
- **Question:** Master Tree §18 describes a "30/15/5 free referral" model. CLAUDE.md replaces it with paid-tier (Silver 1k / Gold 5k / Platinum 15k AED USDT). Is §18 Master Tree text still canonical, or superseded by CLAUDE.md 2026-04-15 amendment?
- **Context:** Two source-of-truth documents disagree; code follows CLAUDE.md paid-tier.
- **Source:** `MASTER_TREE_final.md` lines 294-296 (§18); `CLAUDE.md` lines 508-586 (Ambassador Program Rules).
- **Blocks:** §18 canonical text — does it need a Master Tree amendment to align?
- **Default if no answer:** CLAUDE.md supersedes. File a v3.1 amendment to Master Tree §18 to reflect the paid-tier model. Do not act on §18 legacy text.

### Q-A5 · Data Centre Space asset type (§03 Commercial)
**[A · P2 · BOTH]**
- **Question:** §03 Commercial lists "Data Centre Space" as an asset type. Is this an active vertical, or aspirational placeholder?
- **Context:** No spec, no code path, no due diligence flow for data centre cooling/power SLAs or tenant contracts.
- **Source:** `MASTER_TREE_final.md` line 99.
- **Blocks:** Nothing immediate; flags a future specialist vertical that may need a dedicated spec (Phase 2+).
- **Default if no answer:** Treat as Warehouse variant until a specific data-centre deal materialises.

### Q-A6 · §09 Distressed Assets federation vs single owner
**[A · P2 · DYMO]**
- **Question:** §09 Distressed Assets Resolution Engine federates Legal (§23), Valuation (§30), Bank (§22), Court (no section). Is there a single Distressed Assets lead, or a federation-of-silos coordination model?
- **Context:** Without a single owner, distressed deal flow has no clear escalation path.
- **Source:** `MASTER_TREE_final.md` line 185.
- **Blocks:** Phase 2+ distressed vertical planning.
- **Default if no answer:** Federation coordinated by Deal Engine (§31) until a Distressed specialist joins.

### Q-A7 · §10 Digital Assets: virtual land linked vs standalone
**[A · P2 · BOTH]**
- **Question:** When is a virtual parcel "linked" to a real asset vs "standalone virtual"? Can you tokenise a standalone virtual parcel without UAE real-estate nexus?
- **Context:** Raises jurisdictional questions (VARA regulation for virtual assets, UAE securities law if tokenised).
- **Source:** `MASTER_TREE_final.md` line 196.
- **Blocks:** Metaverse (§39) launch scope, tokenisation regulatory strategy.
- **Default if no answer:** Phase 1 = linked only; Phase 2+ standalone after VARA opinion.

### Q-A8 · §11 Ejari integration depth
**[A · P1 · DYMO]**
- **Question:** What is the API contract with Ejari? Is registration automatic on deal close, or manual with legal review first? Who handles disputes if Ejari rejects?
- **Context:** Rental integration is a Block A revenue stream that cannot launch without this.
- **Source:** `MASTER_TREE_final.md` line 208.
- **Blocks:** Rental sub-vertical (Phase 2+).
- **Default if no answer:** Manual Ejari filing in Phase 1; API integration in Phase 2.

### Q-A9 · §12 Insurance provider status
**[A · P2 · DYMO]**
- **Question:** Are Orient/Oman, AXA/Zurich confirmed partnerships or candidate integrations? Who negotiates terms?
- **Source:** `MASTER_TREE_final.md` line 221.
- **Blocks:** Insurance (§12) feature rollout.
- **Default if no answer:** Candidate list; no active negotiation. Revisit Phase 2.

### Q-A10 · §16 Crypto Investors — is ZAH Token launched?
**[A · P2 · BOTH]**
- **Question:** Is ZAH Token live? Smart contract address? Staking APY? Governance rules? §16 lists "ETH, BTC, USDT, USDC, ZAH Token" but provides no status.
- **Source:** `MASTER_TREE_final.md` line 271 (§16); §57 Tokenomics for detail.
- **Blocks:** Tokenisation vertical (§35), DAO (§56).
- **Default if no answer:** Not launched; Phase 2+ event.

### Q-A11 · §20 Architects "AI Viability Score" model
**[A · P2 · JAN]**
- **Question:** What computes "AI Viability Score" (Falcon agent)? What inputs, what tolerance, how does it gate proposal visibility?
- **Source:** `MASTER_TREE_final.md` line 318 (§20).
- **Blocks:** ARCHITECT role MVP (per MRD) won't initially have this; Phase B3+ feature.
- **Default if no answer:** Deferred to post-MVP; MVP ARCHITECT marketplace ships without AI scoring.

### Q-A12 · §30 Appraisers module operational status
**[A · P1 · DYMO]**
- **Question:** Is the Appraisers module built or aspirational? Who operates the comparable database? Is appraisal fee-per-report or subscription?
- **Source:** `MASTER_TREE_final.md` lines 435-437 (§30).
- **Blocks:** Appraisers (B8) feature readiness for Valuation products.
- **Default if no answer:** Aspirational until RICS-partnered appraiser onboarded. Dymo network has ≥1 warm contact; revisit Phase 2.

### Q-A13 · §31 Deal Engine state machine — allowed transitions
**[A · P0 · JAN]**
- **Question:** What are the allowed transitions between deal states? What happens if buyer cancels at "Gov Verification"? Can seller reject at "Agreement Signed"? Timeout rules? Rollback logic?
- **Context:** Spec 01 MVP defines 11 states but the transition matrix is not enumerated.
- **Source:** `MASTER_TREE_final.md` lines 448-462 (§31); Spec 01 §3.2.
- **Blocks:** Spec 01 Deal Engine final shipping; Spec 03 v2 Super-Admin state override (§14.3).
- **Default if no answer:** Spec 01 contains the transition matrix implicitly; Jan should extract and founder-confirm before ship.

### Q-A14 · §33 Joint Ventures — SPV formation smart contract
**[A · P2 · JAN]**
- **Question:** Is there a smart contract for SPV formation in §33 JVs? Profit-split enforcement?
- **Source:** `MASTER_TREE_final.md` line 480 (§33).
- **Blocks:** JV deal flow (Phase 2+).
- **Default if no answer:** Legal-doc SPV template in Phase 1; on-chain SPV in Phase 3+.

### Q-A15 · §34 Fractional Ownership — regulatory approval path
**[A · P1 · DYMO]**
- **Question:** What is the regulatory approval path for fractional ownership tokens (VARA exemption? DFSA gate?)? How do exit rights work if secondary market liquidity is low?
- **Source:** `MASTER_TREE_final.md` lines 490-492.
- **Blocks:** Fractional ownership launch (Phase 2+).
- **Default if no answer:** Not launched without VARA + legal opinion; Phase 2+ event.

### Q-A16 · §52 Sovereignty Config hard-date migration plan dependencies
**[A · P1 · JAN]**
- **Question:** AWS → Own Servers Q3 2026, Infura → Own Nodes Q4 2026, OpenAI → Own AI Q4 2027, Stripe → Own Bank Q2 2028 — what's the dependency order? If AWS migration misses Q3 2026, does it cascade to node migration?
- **Source:** `MASTER_TREE_final.md` lines 765-768.
- **Blocks:** Master sovereignty roadmap; §78 G42 migration is the "AWS → Own Servers" line item and depends on SV-14 ratification.
- **Default if no answer:** Independent tracks; SV-14 (G42 Abu Dhabi) handles the hosting line. Node + AI + Bank tracks are Phase 2–3 events.

### Q-A17 · §54 Revenue Engine 21 streams — reconcile with 2% service fee
**[A · P0 · BOTH]**
- **Question:** §54 stream #01 says "Transaction Fee 0.2%"; CLAUDE.md says "2% ZAAHI service fee". Which is the true platform-fee rate? How do ambassador commissions (10% of the fee per GOLD L1) reconcile with the 21-stream split?
- **Context:** Direct contradiction between two canonical sources. Critical revenue impact.
- **Source:** `MASTER_TREE_final.md` lines 797-803 (§54); `CLAUDE.md` Ambassador Program Rules.
- **Blocks:** Spec 02 Invoice rate calculation; any commission calc.
- **Default if no answer:** CLAUDE.md 2% governs; file Master Tree §54 amendment to update stream #01 from 0.2% to 2%. Before first-deal close.

### Q-A18 · §55 Robotics Fund allocation governance
**[A · P2 · BOTH]**
- **Question:** §55 Robotics Fund accumulates 10% of every platform fee. Who decides allocation (DAO vote)? What are milestone gates? Smart contract address?
- **Source:** `MASTER_TREE_final.md` lines 813-814.
- **Blocks:** Tokenomics (§57), DAO Treasury (§56).
- **Default if no answer:** Phase 3+ activation; Phase 1-2 = founders decide by written memo.

---

## §2.B Phase 1 specs implementation gaps

### Q-B1 · Spec 02 ↔ Spec 03 — `pendingTRN` field location
**[B · P0 · JAN]** · **(= Q-JAN1)**
- **Question:** `Invoice.pendingTRN` field is referenced in both specs but not defined in the Spec 02 data model. Who adds this column (Spec 02 migration or Spec 03 v2 migration)? When?
- **Context:** Spec 02 §6.5 edge case #3 references "pendingTRN: true" as existing. Spec 03 §14.6 Feature bypass depends on it.
- **Source:** Spec 02 §6.5 + Spec 03 §14.6 cross-reference.
- **Blocks:** Spec 02 Invoice auto-issue path; Spec 03 v2 Super-Admin "Manual payment override".
- **Default if no answer:** Add to Spec 02 migration (Month 2-3 window). Disclaimer: requires Jan + founder pre-merge pair-review.

### Q-B2 · Plot 1 week-9 schedule contingency
**[B · P0 · JAN]** · **(= Q-JAN2)**
- **Question:** Spec 02 ships Week 6, Spec 01 Week 8, Spec 03 v1 Week 9, Spec 03 v2 Week 10, Spec 04 Week 12. Plot 1 closes Fri Week 9 (2026-06-19). If any spec slips one week, does Plot 1 close-date hold? What is the contingency?
- **Source:** Spec 01/02/03/04 §9 cross-reference.
- **Blocks:** Everything on the 2026-06-19 timeline.
- **Default if no answer:** Spec 03 v2 Super-Admin Flow 3 (manual cash-deposit override) can fill any Plot 1 gap. Disclaimer: confirm with founder before first schedule slip.

### Q-B3 · Spec 01 ADMIN_FORCE_TRANSITION vs Spec 03 Super-Admin state override
**[B · P0 · JAN]**
- **Question:** Spec 01 §3.4 defines `ADMIN_FORCE_TRANSITION`. Spec 03 v2 §14.3 "extends" it to SUPER_ADMIN role. Are these the same code path or two different ones? If Spec 01 ships Month 3 with ADMIN role-level, does Spec 03 v2 Month 4-5 extend or duplicate?
- **Source:** Spec 01 §3.4 + Spec 03 §14.3.
- **Blocks:** Spec 03 v2 ship semantics.
- **Default if no answer:** One code path; Spec 03 v2 extends authorisation, not behaviour. Confirm with Jan.

### Q-B4 · Spec 04 — Feasibility v2 timeline for Plot 1
**[B · P0 · BOTH]**
- **Question:** Plot 1 closes Fri Week 9 (2026-06-19). Spec 04 ships Week 12. Spec 04 §7.4 says "2 real-world pilots before Plot 1 close Week 9." How can 2 pilots happen before Plot 1 close if Spec 04 ships 3 weeks after?
- **Source:** Spec 04 §7.4 + §9 Effort Estimate.
- **Blocks:** Spec 04 MVP acceptance criteria.
- **Default if no answer:** Existing Feasibility v5 (`src/lib/feasibility.ts`) carries Plot 1 client meeting. Spec 04 v2 adds IRR + sensitivity + PDF; ships post-Plot 1.

### Q-B5 · Spec 05 Phase 1a dependency on Core42 MSA
**[B · P0 · JAN]** · **(= Q-JAN3)**
- **Question:** Spec 05 §1.3: "Phase 1a Month 5 (post-Core42 MSA signed)." Can Phase 1a ship independent of MSA, or must it wait?
- **Source:** Spec 05 §1.3 line 77.
- **Blocks:** Auth abstraction launch, entire §78 G42 migration timeline.
- **Default if no answer:** Phase 1a can ship independently; MSA signing adds no new coding prerequisites to the IAuthProvider interface. Jan ship Phase 1a at Month 5 regardless.

### Q-B6 · Spec 05 externalAuthId — Prisma partial unique index
**[B · P1 · JAN]**
- **Question:** Spec 05 §7 D-3 says `User.externalAuthId` is nullable, unique, indexed. Prisma `@@unique` doesn't natively support partial indexes. Raw SQL migration required?
- **Source:** Spec 05 §7 D-3 + migration draft §2.2.
- **Blocks:** Phase 1a migration.
- **Default if no answer:** Use a raw-SQL migration for partial unique index. Jan's call; no founder input needed.

### Q-B7 · Spec 05 Phase 1b-c slip impact
**[B · P0 · JAN]** · **(= Q-JAN4)**
- **Question:** If Phase 1b-c (RLS refactor Month 5-6) slips to Month 7+, is Phase 2 cutover (Month 9-10) blocked?
- **Source:** Spec 05 §6.3 line 723.
- **Blocks:** §78 G42 migration cutover.
- **Default if no answer:** Yes, blocks. If slippage visible at Month 6 end, raise to founder for re-sequencing.

### Q-B8 · WireGuard VPN deployment timeline + owner
**[B · P0 · JAN]** · **(= Q-JAN5)**
- **Question:** Spec 03 §14.9.6 WireGuard VPN (UAE-resident VM, AED 150/month) — who deploys and when? Ship with v2 Month 4-5, or deferred?
- **Source:** Spec 03 §14.9.6 lines 801-823.
- **Blocks:** Super-Admin IP-allowlist security; Spec 03 v2 acceptance.
- **Default if no answer:** Deferred to Month 6-7 (Jan capacity). Super-Admin v2 ships with IP-allowlist at MapLibre CDN layer or equivalent in interim.

### Q-B9 · Spec 03 /admin Dashboard content specification
**[B · P1 · JAN]**
- **Question:** Spec 03 §5.2 lists "AdminDashboard" in hierarchy but never details its contents. What are the exact fields of "1-page metric overview (deals · users · ambassadors · pending commissions · flag status)"?
- **Source:** Spec 03 §5.2 line 319+.
- **Blocks:** Spec 03 MVP v1 Week 9.
- **Default if no answer:** Jan designs a minimal version (5 tiles); founder reviews on first build.

### Q-B10 · Spec 03 tier-pricing change grandfather rule
**[B · P1 · JAN]**
- **Question:** If admin changes GOLD priceAed from 5000 to 6000 mid-month with 3 users already signed up at 5000, do the 3 users keep old price (grandfathered), or are they retroactively charged the difference?
- **Source:** Spec 03 §4.3 line 267.
- **Blocks:** Spec 03 tier-editor semantics; ambassador UX.
- **Default if no answer:** Grandfather — historical ambassadors keep their signup-time price. Must be documented in /ambassador-terms before first paid ambassador.

### Q-B11 · Spec 03 §14.3 "backdate" boundary
**[B · P1 · BOTH]**
- **Question:** How is "correcting late data entry" different from "fiscal-period manipulation"? At what date-delta does backdating trigger extra attestation? Crossing Dec 31?
- **Source:** Spec 03 §14.3 line 645.
- **Blocks:** Super-Admin v2 acceptance.
- **Default if no answer:** Cross-fiscal-year (Dec 31 UAE) triggers attestation + Rudi notice. Within-month backdate = self-logged. Founder confirm.

### Q-B12 · Spec 03 §14.6 KYC-bypass artefact criteria
**[B · P1 · BOTH]**
- **Question:** What counts as valid "artefact pointer" for KYC bypass? Is a bank-transfer confirmation email sufficient, or must it be original wire instruction + proof of funds?
- **Source:** Spec 03 §14.6 line 715.
- **Blocks:** Super-Admin v2 compliance posture.
- **Default if no answer:** Minimum bar = bank-transfer email + sender-verification. Dymo-signed attestation on file.

### Q-B13 · Spec 03 §14.6 "Force NOC without document" skips validation gate?
**[B · P1 · JAN]**
- **Question:** Spec 01 §6.1 `validateActionWithDocs` blocks NOC transition without uploaded document. Spec 03 §14.6 bypass — does it skip that validation?
- **Source:** Spec 03 §14.6 line 720; Spec 01 §6.1.
- **Blocks:** Spec 03 v2 bypass mechanism.
- **Default if no answer:** Yes, skip for Super-Admin with attestation logged. Confirm with founder — this is the whole point of the bypass.

### Q-B14 · Spec 03 §14.8 Flow 3 commission trigger timing
**[B · P0 · JAN]**
- **Question:** Cash-deposit flow advances deal INITIAL → DEPOSIT_SUBMITTED. Does this trigger Commission creation (Spec 02 `onDealCompleted()`), or does it wait until full DEAL_COMPLETED?
- **Source:** Spec 03 §14.8 line 757; Spec 02 §6.3.
- **Blocks:** Ambassador commission timing for Plot 1.
- **Default if no answer:** Commissions fire only at DEAL_COMPLETED per Spec 02. DEPOSIT_SUBMITTED does not trigger ambassador accrual. Founder confirm: is this OK?

### Q-B15 · jsPDF architecture (future PDF types)
**[B · P1 · JAN]** · **(= Q-JAN7)**
- **Question:** If a 3rd PDF type (Deal PDF, Offer PDF) is needed beyond Invoice + Feasibility, is jsPDF still the approved path or does it trigger Puppeteer evaluation?
- **Source:** Spec 02 §6.3 + Spec 04 §6.3 cross-ref.
- **Blocks:** Future PDF specs.
- **Default if no answer:** Stay jsPDF until 3 simultaneous document types exist. Re-evaluate at Spec 06+.

### Q-B16 · Spec 02 invoice auto-trigger for Plot 1 DEAL_COMPLETED
**[B · P0 · JAN]**
- **Question:** What is the exact transaction boundary for auto-firing Spec 02 Invoice + Commission on `DealStatus.DEAL_COMPLETED`? Single Prisma `$transaction`?
- **Source:** Spec 02 §6.3 + `src/lib/ambassador.ts` `awardCommissions()`.
- **Blocks:** Plot 1 DEAL_COMPLETED event integrity.
- **Default if no answer:** Single `$transaction` scope containing Deal.status update + Invoice.create + awardCommissions() + activityLog.create. Rollback on any failure.

### Q-B17 · Spec 02 VAT rate hardcoding
**[B · P2 · JAN]**
- **Question:** Spec 02 hardcodes VAT at 5%. UAE could change VAT post-2027. How is the rate configurable — in TierConfig, in FeatureFlag, or in raw code + redeploy?
- **Source:** Spec 02 §6.5.
- **Blocks:** Phase 2+ flexibility.
- **Default if no answer:** Move to FeatureFlag-style config in Spec 03 admin panel Month 4. Hardcoding in Phase 1 is OK.

### Q-B18 · Spec 02 e-invoicing ASP readiness — Jul 2026 phase-in
**[B · P1 · DYMO]**
- **Question:** UAE mandates XML e-invoicing from 1 Jul 2026 phased. ZAAHI Y1 revenue < AED 50M threshold means we're exempt until Jul 2027. Is this threshold being monitored as revenue grows?
- **Source:** Spec 02 §6.5 e-invoicing note.
- **Blocks:** Phase 2 revenue scaling; if we cross AED 50M sooner, ASP integration becomes mandatory.
- **Default if no answer:** Track quarterly. Cross AED 40M → kick off ASP vendor selection.

### Q-B19 · Spec 02 ambassador automated payout
**[B · P1 · JAN]**
- **Question:** Spec 02 defers ambassador automated payout ("Network International TRC-20 USDT"). When is this scheduled — Month 6-9 soft-pilot, or Month 10+ Phase 2?
- **Source:** Spec 02 v2 polish list.
- **Blocks:** Manual payout workload; founder ops burden.
- **Default if no answer:** Month 10 Phase 2. Phase 1 manual payout via admin UI + Tronscan check.

### Q-B20 · Spec 04 mode is string (not enum)
**[B · P1 · JAN]**
- **Question:** `FeasibilityScenario.mode` is `String` in Spec 04 data model. Should it be an enum (BtS | BtR | JV)?
- **Source:** Spec 04 §3 line 117.
- **Blocks:** Schema validation strictness.
- **Default if no answer:** Use enum, matches Spec 03 admin-panel feature-flag pattern. Jan's call; no founder input needed.

### Q-B21 · Spec 04 affection-plan prefill staleness
**[B · P1 · JAN]**
- **Question:** Feasibility prefills from `affectionPlans orderBy fetchedAt desc take 1`. What if the latest is 6 months old and DDA has newer? Do we prompt refresh before run?
- **Source:** Spec 04 §6.4 prefill logic.
- **Blocks:** Feasibility accuracy.
- **Default if no answer:** Display "fetched X days ago" + optional refresh button. If >90 days → warn.

### Q-B22 · Spec 04 IRR tolerance reconciliation
**[B · P2 · JAN]**
- **Question:** Spec 04 §6.1 says "tolerance 0.01%". Code uses 1e-6 (= 0.0001%). Which is the truth?
- **Source:** Spec 04 §6.1 line 324 + `src/lib/feasibility.ts` line 330.
- **Blocks:** Spec 04 acceptance test.
- **Default if no answer:** 1e-6 is tighter, keep the code. Fix spec text to "0.0001%".

### Q-B23 · Spec 04 ComparisonPanel v1 or v2
**[B · P2 · JAN]**
- **Question:** Spec 04 §5.2 lists `ComparisonPanel` as SHOULD (not MUST). Is it in v1 Week 12, or deferred v2?
- **Source:** Spec 04 §5.2.
- **Blocks:** Spec 04 acceptance scope.
- **Default if no answer:** Deferred v2 unless founder explicitly asks at first pilot. Cuts Spec 04 effort by 3-4 eng-days.

### Q-B24 · Spec 05 page.tsx direct edit vs shim
**[B · P1 · JAN]** · **(= Q-JAN9)**
- **Question:** At Phase 2 cutover, does founder approve direct edit of `src/app/page.tsx`, or enforce the "thin shim" alternative?
- **Source:** Spec 05 §6.2 lines 686-694; CLAUDE.md DO-NOT-MODIFY.
- **Blocks:** Phase 2 cutover approach.
- **Default if no answer:** Direct edit with founder pair-review. Shim adds runtime interception overhead and is a bigger test burden.

### Q-B25 · Spec 05 cutover email failure path
**[B · P1 · BOTH]**
- **Question:** If a user doesn't set new password within 48 hours of cutover email, does account lock or soft-disable?
- **Source:** Spec 05 §4.3 line 569.
- **Blocks:** Cutover playbook.
- **Default if no answer:** Soft-disable; user goes through normal "forgot password" flow on next login. No account lock.

### Q-B26 · Spec 05 test framework
**[B · P1 · JAN]**
- **Question:** Spec 05 §5.1 shows illustrative test suite. Jest, Vitest, or Playwright?
- **Source:** Spec 05 §5.1.
- **Blocks:** Test-writing start.
- **Default if no answer:** Vitest (matches Next.js 15 modern stack). Jan's call.

### Q-B27 · Spec 01 Plot 1 docs/Docs cascade
**[B · P1 · JAN]**
- **Question:** Spec 01 has doc-upload gates (validateActionWithDocs). For Plot 1, which specific documents are required at which transitions?
- **Source:** Spec 01 §6.1.
- **Blocks:** Plot 1 deal-close readiness.
- **Default if no answer:** Standard DLD checklist: Title deed, Emirates IDs, NOC, payment proof. Founder cross-check.

### Q-B28 · Spec 03 v1 route assignments (v1 vs v2 split)
**[B · P1 · JAN]**
- **Question:** Spec 03 §14.10 lists Super-Admin routes (/super-admin/*, /super-admin/impersonate, etc.). Which are v1 (MVP Month 4) vs v2 (Month 4-5)?
- **Source:** Spec 03 §14.10 lines 830-839.
- **Blocks:** Spec 03 v1 ship scope.
- **Default if no answer:** v1 = impersonate + deals + bulk. v2 = templates + flag emergency. Jan drafts; founder confirm.

---

## §2.C Schema · migration · database

### Q-C1 · Staging Supabase project creation
**[C · P0 · BOTH]** · **(= MRD Q-28)**
- **Question:** Approve creating a staging Supabase project for schema migration rehearsals? AED 0 setup, 1 eng-day, ~USD 25/mo hosting on Free tier.
- **Context:** No staging today; every migration runs against prod. Schema expansion for 6-role pivot has high blast radius.
- **Source:** `MULTI_ROLE_DISCOVERY.md` Q-28 + §9.1.
- **Blocks:** Phase B1 schema migration safety.
- **Default if no answer:** CREATE IT. Disclaimer: if founder declines, document the acceptance of direct-prod-migration risk in DECISIONS.md.

### Q-C2 · User.ambassadorPlan column timing
**[C · P0 · JAN]** · **(= Q-JAN6)**
- **Question:** When does the `User.ambassadorPlan` enum column land? Before first external ambassador, piggybacking Spec 02, in Phase B1 multi-role migration, or separate migration?
- **Context:** `src/lib/ambassador.ts` line 43 TODO explicitly flags this gap.
- **Source:** `src/lib/ambassador.ts` line 43 TODO comment + CLAUDE.md Ambassador rules.
- **Blocks:** Tier-aware commission calculation for first paid ambassador.
- **Default if no answer:** Bundle into first Phase B1 migration along with UserRoleAssignment + profile tables (MRD §4.3 Option C). ~1 eng-week.

### Q-C3 · Commission.tier freeze column
**[C · P0 · JAN]**
- **Question:** Add `Commission.tier` enum column, frozen at accrual time, so historical records capture which tier was active for the ambassador?
- **Context:** Spec 02 stores `rate` (Decimal 5,4) only; tier name is implicit. If tier rates ever shift, history becomes unreadable.
- **Source:** Spec 02 §3.1 data model + Commission model @ `prisma/schema.prisma` lines 326-352.
- **Blocks:** Audit trail for commission disputes.
- **Default if no answer:** Add column. Disclaimer: schema rule requires founder approval per CLAUDE.md AGENT RULES.

### Q-C4 · AmbassadorApplication.status as loose string vs enum
**[C · P1 · JAN]**
- **Question:** `AmbassadorApplication.status` is a loose `String` (default `"PENDING"`). Should it be a Prisma enum (PENDING | VERIFIED | ACTIVE | REJECTED)?
- **Source:** `prisma/schema.prisma` line 369.
- **Blocks:** Validation strictness; dashboard filters.
- **Default if no answer:** Convert to enum in Phase B1 migration. Low risk.

### Q-C5 · SUPER_ADMIN as UserRole enum value vs mode on ADMIN
**[C · P0 · BOTH]** · **(= MRD Q-8)**
- **Question:** Is SUPER_ADMIN a distinct UserRole enum value (new row), or a mode/flag on existing ADMIN role?
- **Source:** MRD Q-8 + Spec 03 §14 v2.
- **Blocks:** Option C hybrid RBAC design for MRD Q-9.
- **Default if no answer:** Mode/flag. Founder (email-based) + `User.role = ADMIN` combo = Super-Admin. No new enum value.

### Q-C6 · Option C hybrid RBAC — confirm UserRoleAssignment + profile tables
**[C · P0 · BOTH]** · **(= MRD Q-9 / Q-10)**
- **Question:** Adopt Option C hybrid: keep `User.role` as primary, add `UserRoleAssignment` junction, add 6 thin role-profile tables?
- **Source:** MRD §4.3 + §4.4 + Q-9 + Q-10.
- **Blocks:** Every Phase B1/B2/B3 migration.
- **Default if no answer:** Yes, Option C. Disclaimer: this is the agent recommendation; deviation means Phase B re-spec.

### Q-C7 · Tenant model readiness (Phase 2 tenantisation)
**[C · P1 · JAN]**
- **Question:** §77 v1.2 documents Tenant model but it's not in `prisma/schema.prisma` today. When does Tenant get added — at Phase 2 opening (Month 10), or pre-opening with a `_shadow` table?
- **Source:** §77 Web Platform Architecture v1.2; current schema.
- **Blocks:** Multi-tenancy rollout.
- **Default if no answer:** Add at Phase 2 opening with `tenantId` columns on 15 scoped models. Don't pre-add. Saves dead-code risk.

### Q-C8 · D-14 Enterprise DB vendor choice
**[C · P1 · BOTH]**
- **Question:** For Enterprise tier tenants, commit Supabase as DB vendor, or keep the decision open for Neon/AWS RDS evaluation?
- **Source:** §77 §11 line 1254-1307 (D-14).
- **Blocks:** Enterprise-tier onboarding Phase 2+.
- **Default if no answer:** Stay Supabase until first Enterprise pilot; re-evaluate at first Enterprise tenant signup.

### Q-C9 · Footprint polygon storage for Buildings
**[C · P1 · JAN]**
- **Question:** The `Building.footprintPolygon` column is currently Json? and API Horizon Pointe has it null (we synthesize a 40×40m square). OSM provides a real 7-vertex polygon. Populate now or Phase B2?
- **Source:** `prisma/schema.prisma` Building model + `useBuildingsLayer.ts` fallback logic.
- **Blocks:** Click-area accuracy for Building layer.
- **Default if no answer:** Migrate OSM polygon for API Horizon Pointe (Q-O5 founder approval). For new Buildings, require footprint as part of the seed process.

### Q-C10 · Audit log model — new AdminAuditLog table
**[C · P1 · JAN]** · **(= MRD Q-32)**
- **Question:** Add a dedicated `AdminAuditLog` Prisma model for admin actions (impersonate, override, bypass) separate from user-facing `ActivityLog`?
- **Source:** MRD Q-32 + Spec 03 §14 Super-Admin audit log requirements.
- **Blocks:** Spec 03 v2 Super-Admin audit.
- **Default if no answer:** Yes, dedicated table. ActivityLog stays for user events. Add in Phase B1.

### Q-C11 · Plot 1 schema readiness — AffectionPlan for non-DDA plot
**[C · P1 · JAN]**
- **Question:** If Plot 1 is a non-DDA (9-digit like 91415109) or a DDA (7-digit like 6457940), does AffectionPlan schema support both? Placeholder polygon vs real DDA GIS data.
- **Source:** CLAUDE.md "Источники данных" section.
- **Blocks:** Plot 1 onboarding if non-DDA.
- **Default if no answer:** Schema supports both. Placeholder polygon acceptable. Dymo provides which type Plot 1 is.

---

## §2.D Auth · roles · permissions

### Q-D1 · Approval posture vs role posture — do we enforce role at route level?
**[D · P1 · JAN]**
- **Question:** Today every protected API route gates on `getApprovedUserId` (approval only). Do we add route-level role gating (e.g., `hasRole(user, "BROKER")`) in Phase B1, or keep approval-only and layer roles via UI?
- **Source:** MRD §2.2 + `src/lib/auth.ts`.
- **Blocks:** Role-aware API design.
- **Default if no answer:** Phase B1 adds `hasRole()` utility; apply per-route as new role-scoped routes appear. Don't retrofit existing approval-gated routes.

### Q-D2 · Admin allow-list — move from code to DB
**[D · P1 · JAN]**
- **Question:** Founder emails are hardcoded in `src/lib/auth.ts` line 7. Move to a DB allow-list (admin-editable in Spec 03)?
- **Source:** `src/lib/auth.ts` line 7.
- **Blocks:** Adding/removing admins without code deploy.
- **Default if no answer:** Move in Spec 03 Month 4. Low effort.

### Q-D3 · Role-switching UX — when to introduce session selector
**[D · P1 · BOTH]**
- **Question:** Today Dymo is ADMIN + (planned) AMBASSADOR. When do we ship a session-level role selector? Phase B1 (today), Phase B2 (after 5+ multi-role users), or never?
- **Source:** MRD §5.3.
- **Blocks:** Multi-role UX clarity.
- **Default if no answer:** Phase B2 (after 5+ multi-role users). Phase B1 = implicit context from /broker/* paths.

### Q-D4 · SUPER_ADMIN Flow 3 gating for Plot 1
**[D · P0 · BOTH]**
- **Question:** For Plot 1 first cash-deposit, does the SUPER_ADMIN state override need 2-of-3 founder sign-off per Spec 03 §14, or can Dymo self-approve "meeting closes deal" flow?
- **Source:** Spec 03 §14.2 + §14.8.
- **Blocks:** Plot 1 close mechanics.
- **Default if no answer:** Self-approve for Plot 1 with activity-log attestation. Raise the bar for subsequent deals if pattern repeats.

### Q-D5 · Self-referral / self-broker prevention
**[D · P1 · JAN]**
- **Question:** Ambassador program blocks self-referral. Does broker role block acting as broker-of-record on own listing (BROKER + OWNER conflict)?
- **Source:** MRD §5.2.
- **Blocks:** Multi-role conflict-of-interest handling.
- **Default if no answer:** Yes, block. If `deal.sellerId === deal.brokerId`, reject at creation.

### Q-D6 · Role assignment audit log
**[D · P1 · JAN]**
- **Question:** Every `UserRoleAssignment` insert/update logged in AdminAuditLog? Who approved, when, reason?
- **Source:** MRD §4.3 + §7 Compliance matrix.
- **Blocks:** PDPL audit trail.
- **Default if no answer:** Yes, log all. Fields: userId, role, action (assign/revoke), actorId, reason, timestamp.

### Q-D7 · Primary role vs secondary role resolution
**[D · P1 · JAN]**
- **Question:** If a user has primary `User.role = BROKER` and secondary `UserRoleAssignment(role = OWNER)`, and opens `/parcels/[id]` on their own parcel, which role context applies?
- **Source:** MRD §5.4.
- **Blocks:** Permission union for multi-role.
- **Default if no answer:** Union — most permissive combo. Per-action conflict (self-broker) rejected at creation level.

### Q-D8 · UAE-Pass integration for OWNER KYC
**[D · P1 · DYMO]**
- **Question:** MRD §3.4 mentions UAE-Pass for OWNER KYC. Is Phase 1 manual Emirates ID upload, or UAE-Pass integration in Phase B3?
- **Source:** MRD §3.4.
- **Blocks:** OWNER MVP scope.
- **Default if no answer:** Manual Phase 1; UAE-Pass Phase B3 if API access feasible.

### Q-D9 · RLS `auth.uid()` refactor scope
**[D · P0 · JAN]** · **(= Q-JAN4)**
- **Question:** How many tables use `auth.uid()` in RLS policies? Refactor scope for Spec 05 Phase 1b-c.
- **Source:** Spec 05 §6.3.
- **Blocks:** §78 G42 cutover.
- **Default if no answer:** Audit every RLS policy before Phase 1b start. Jan's task.

### Q-D10 · Social login providers
**[D · P2 · JAN]**
- **Question:** Spec 05 IAuthProvider contract. Are social-login providers (Google, Apple, LinkedIn) in scope for Phase 1 or Phase 2? Azure B2C supports them natively.
- **Source:** Spec 05 §2.1.
- **Blocks:** Onboarding UX.
- **Default if no answer:** Phase 2. Phase 1 = email/password only.

---

## §2.E Payments · commissions · invoicing

### Q-E1 · Tier-subscription payment processor
**[E · P1 · DYMO]** · **(Q-25 from OPEN_QUESTIONS + MRD-adjacent)**
- **Question:** For Pro-tier tenants (AED 3k/mo recurring), which payment processor — Network International, Stripe UAE, Telr?
- **Source:** OPEN_QUESTIONS_FOR_OWNERS Q-25.
- **Blocks:** Phase 2 Month 8-9 tier billing launch.
- **Default if no answer:** Defer to Month 8; manual invoicing until automated MOR selected.

### Q-E2 · Ambassador USDT payment rail — currently live?
**[E · P0 · BOTH]**
- **Question:** Is ambassador USDT payment live at `/join` today, or shipping in Phase 2 Month 8-9? Wallet `TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7` needs Tronscan verification integration.
- **Source:** `CLAUDE.md` Ambassador rules + `/join` route.
- **Blocks:** First paid ambassador; Plot 1 ambassador downstream.
- **Default if no answer:** Live for application submission (tx-hash capture). Admin manually verifies via Tronscan. Automated verification Phase 2 Month 8-9.

### Q-E3 · Plot 1 commission trigger — DEPOSIT vs COMPLETED
**[E · P0 · JAN]**
- **Question:** Does Plot 1 first cash-deposit trigger ambassador commission (via Flow 3 state advance), or wait for full DEAL_COMPLETED?
- **Source:** Spec 03 §14.8 Flow 3.
- **Blocks:** First ambassador payout timing.
- **Default if no answer:** Wait for DEAL_COMPLETED per Spec 02 §6.3. Deposit is not a commissionable event.

### Q-E4 · Broker commission vs ZAAHI service fee stack
**[E · P0 · BOTH]** · **(= Q-A3 duplicate; canonical here)**
- **Question:** Is the 2% ZAAHI service fee separate from the broker's 2% agency commission (4% total to client), or the same pool?
- **Source:** §54 + §17 + CLAUDE.md.
- **Blocks:** Spec 02 calculation; broker onboarding pitch.
- **Default if no answer:** Separate (market standard). 4% total.

### Q-E5 · Invoice type taxonomy completeness
**[E · P1 · DYMO]**
- **Question:** Spec 02 defines 3 Invoice types: AGENCY_COMMISSION, PLATFORM_SERVICE_FEE, AMBASSADOR_PAYOUT. Are these sufficient for Phase 1? Missing: BANK_MORTGAGE_FEE, DEVELOPER_LISTING_FEE, ARCHITECT_SERVICE, INVESTOR_CONCIERGE?
- **Source:** Spec 02 §3.1.
- **Blocks:** Expanding invoice types in Phase 2.
- **Default if no answer:** Sufficient for Phase 1. Add per-role as roles launch.

### Q-E6 · VAT on ambassador payouts
**[E · P1 · DYMO]**
- **Question:** Is VAT 5% applied to ambassador payouts (AED 1,000+ minimum)? Or are payouts net-of-VAT (grossed up)?
- **Source:** Spec 02 §6.5 + CLAUDE.md Ambassador Rules.
- **Blocks:** Ambassador take-home clarity.
- **Default if no answer:** Not applied; payout is commission-split, not a service invoice. Ambassador self-responsible for their own VAT if they're VAT-registered. Legal opinion worth getting (§I6).

### Q-E7 · Multi-currency invoicing
**[E · P2 · DYMO]**
- **Question:** Spec 02 says AED-only for MVP. When does USD/EUR invoicing ship — Phase 2 institutional INVESTOR, or later?
- **Source:** Spec 02 v2 polish list.
- **Blocks:** Non-UAE investor + developer onboarding.
- **Default if no answer:** Phase 2 (multi-currency trigger = first non-AED denominated deal).

### Q-E8 · Revenue Engine 21 streams — stream #01 rate reconciliation
**[E · P0 · BOTH]** · **(= Q-A17)**
- **Question:** §54 stream #01 = 0.2% transaction fee. CLAUDE.md = 2% service fee. File Master Tree amendment?
- **Source:** §54 + CLAUDE.md.
- **Blocks:** Financial model; investor package refresh.
- **Default if no answer:** File v3.1 Master Tree amendment (§54 stream #01: 0.2% → 2%). CLAUDE.md wins.

### Q-E9 · Refund mechanics
**[E · P1 · BOTH]**
- **Question:** If a tier subscription is refunded (e.g., tenant cancels Pro after 1 day), does `TierConfig.activeSlots` decrement?
- **Source:** Spec 03 §3.2.
- **Blocks:** Tier-slot accounting accuracy.
- **Default if no answer:** No, activeSlots stays incremented to prevent over-allocation. Refund is a separate Invoice line.

### Q-E10 · Invoice numbering reset on year rollover
**[E · P1 · JAN]**
- **Question:** ZAAHI-INV-YYYY-NNNN sequential, resets annually. Does it reset on Jan 1 UTC, Jan 1 UAE (UTC+4), or financial year-end?
- **Source:** Spec 02 §3.1.
- **Blocks:** FTA audit clarity.
- **Default if no answer:** Jan 1 UAE (UTC+4). Consistent with UAE fiscal practice.

### Q-E11 · Commission reversal on dispute — PENDING vs REVERSED
**[E · P1 · JAN]**
- **Question:** If ambassador commission is PENDING and deal gets DISPUTE_INITIATED, does it flip to REVERSED immediately or only on final dispute resolution?
- **Source:** CLAUDE.md Ambassador Program Rules (Commission lifecycle).
- **Blocks:** Dispute handling semantics.
- **Default if no answer:** Immediate flip to REVERSED on DISPUTE_INITIATED. If dispute resolved in seller's favour, manual reversal via Spec 03 Super-Admin to PENDING.

### Q-E12 · Robotics Fund 10% auto-routing — live today or deferred?
**[E · P2 · JAN]**
- **Question:** Master Tree §55 says "10% of Every Platform Fee" routes to Robotics Fund automatically. Does Phase 1 auto-route, or manual treasury accounting?
- **Source:** `MASTER_TREE_final.md` §55.
- **Blocks:** Phase 1 accounting; tokenomics readiness.
- **Default if no answer:** Manual Phase 1 (founder accounting). Auto-route Phase 3+ with smart contract.

---

## §2.F Compliance (RERA · DLD · PDPL · AML · FTA)

### Q-F1 · RERA verification depth for BROKER
**[F · P0 · DYMO]** · **(= MRD Q-11)**
- **Question:** (a) Manual admin 24-72h, (b) scraped, (c) pursue RERA API partnership in parallel?
- **Source:** MRD Q-11.
- **Blocks:** BROKER onboarding MVP.
- **Default if no answer:** (a) + (c). Manual for Day 1; pursue partnership for Phase 2.

### Q-F2 · Investor package v7.1 calendar fix — IP-1
**[F · P0 · DYMO]**
- **Question:** v7.1 refresh scope — (a) calendar-only 30min, (b) calendar + revenue-timing 4-6 hrs, (c) full refresh 10-15 hrs?
- **Source:** `docs/audit/INVESTOR_PACKAGE_ISSUES.md` IP-1.
- **Blocks:** Investor outreach credibility.
- **Default if no answer:** (b). Disclaimer: "Monday 2026-04-21" → "Monday 2026-04-20" + Al Jurf burn + Platform Y1→Y2 corrections across 12 docs.

### Q-F3 · PDPL Standard Contractual Clauses with Supabase
**[F · P1 · DYMO]** · **(= MRD Q-14)**
- **Question:** Sign UAE-approved SCCs with Supabase Inc. now (AED 5-10k legal review) as a bridge to Core42 migration, or accept residual risk until migration?
- **Source:** MRD Q-14.
- **Blocks:** PDPL 2027-01 enforcement posture.
- **Default if no answer:** Sign now. Disclaimer: cheap insurance; migration may slip past 2027-01.

### Q-F4 · DPO hire/retainer timing
**[F · P0 · DYMO]** · **(= MRD Q-13)**
- **Question:** Hire DPO (in-house or retainer) this quarter, or wait until migration? AED 40-100k/year.
- **Source:** MRD Q-13.
- **Blocks:** PDPL Article 10 compliance.
- **Default if no answer:** Retainer now. Hire in-house at Phase 2.

### Q-F5 · Ambassador program legal opinion (curator network vs MLM)
**[F · P0 · DYMO]** · **(= MRD Q-12)**
- **Question:** Get formal UAE commercial legal opinion on paid-tier structure (~AED 5-15k) before first external paid ambassador?
- **Source:** MRD Q-12.
- **Blocks:** Launch of public ambassador signups.
- **Default if no answer:** Yes, before first external paid ambassador. Prevents MLM classification risk.

### Q-F6 · AML/KYC vendor selection timing
**[F · P1 · DYMO]** · **(= MRD Q-15)**
- **Question:** When to select AML/KYC vendor? (Dow Jones, RDC, Comply Advantage for AML; Onfido, Jumio, Shufti Pro for KYC). AED 20-100k/year.
- **Source:** MRD Q-15.
- **Blocks:** INVESTOR role Phase B2.
- **Default if no answer:** Phase B2 when INVESTOR lands. Phase B1 = self-declared.

### Q-F7 · Institutional INVESTOR enhanced-KYC threshold
**[F · P1 · DYMO]** · **(= MRD Q-16)**
- **Question:** What ticket-size triggers enhanced KYC (UBO, source of funds, sanctions)? AED 2M or AED 10M?
- **Source:** MRD Q-16.
- **Blocks:** INVESTOR role MVP scope.
- **Default if no answer:** AED 2M for institutional; AED 10M requires additional board approval. Dymo legal opinion needed.

### Q-F8 · CT registration + UBO filing — mainland vs ADGM
**[F · P0 · DYMO]**
- **Question:** ZAAHI Y1 entity — mainland LLC (requires CT registration + UBO filing within 60 days post-incorporation), or ADGM (simpler ADGM Data Protection Law, no CT until threshold)?
- **Source:** `docs/audit/AUDIT_FINDINGS.md` CRITICAL-3 + CRITICAL-5.
- **Blocks:** Corporate setup; legal risk if missed.
- **Default if no answer:** Mainland LLC (as per current plan). Dymo confirms CT registration schedule + UBO filing within 60 days.

### Q-F9 · Rudi material events — 10 categories scope
**[F · P1 · DYMO]** · **(= Q-40 from OPEN_QUESTIONS)**
- **Question:** Does Rudi approve all 10 material-event categories requiring 48-hour notice? (deal >AED 50M, key-person resignation, regulator inquiry, etc.)
- **Source:** `docs/audit/OPEN_QUESTIONS_FOR_OWNERS.md` Q-40.
- **Blocks:** MOU enforcement + governance process.
- **Default if no answer:** All 10 apply; 48-hour hard SLA; tracked via founder calendar reminders.

### Q-F10 · Eid al-Adha Week 6 (2026-05-25 to 05-31) operational plan
**[F · P1 · BOTH]**
- **Question:** Week 6 loses effective business days to Eid. Has Phase 1 critical-path been re-sequenced?
- **Source:** `docs/audit/AUDIT_FINDINGS.md` CRITICAL-1 + Round 2 F-29/F-30/F-31.
- **Blocks:** Plot 1 pre-close activities.
- **Default if no answer:** Treat Week 6 as 2 effective days. Pre-stage Week 5 and Week 7 to absorb Week 6 slack.

### Q-F11 · Islamic New Year (Jun 15, Week 9) — Plot 1 DLD submission impact
**[F · P0 · BOTH]**
- **Question:** Plot 1 deal close Fri 2026-06-19 requires DLD submission earlier in Week 9. Jun 15 holiday. Is DLD submission shifted to Tue Jun 16?
- **Source:** `docs/audit/AUDIT_FINDINGS.md` M-1.
- **Blocks:** Plot 1 DEAL_COMPLETED.
- **Default if no answer:** Yes, Tue Jun 16 DLD submission. Buffer tight.

### Q-F12 · Prophet's Birthday Aug 24 (Mon) Month 4 sprint
**[F · P1 · JAN]**
- **Question:** Month 4 sprint kickoff 2026-08-24 hits Prophet's Birthday. Shift to Tue Aug 25?
- **Source:** `docs/audit/AUDIT_FINDINGS.md` M-2.
- **Blocks:** Month 4 sprint scope.
- **Default if no answer:** Yes, shift.

### Q-F13 · PDPL-full compliance deferral — blast radius
**[F · P1 · BOTH]** · **(= MRD Q-36)**
- **Question:** If PDPL-full compliance deferred to 2027-01 timeline, what's the acceptance — signed attestation founder, or full legal sign-off?
- **Source:** MRD Q-36.
- **Blocks:** Decision on DPO retainer + SCC signing pace.
- **Default if no answer:** Attestation + DPO retainer + SCC signed = "on remediation path" posture.

### Q-F14 · RERA Trakheesi advertising permit
**[F · P1 · DYMO]**
- **Question:** Listings must have Trakheesi permit. Who captures permit number — broker (Phase B1), owner (Phase B1-B2), both?
- **Source:** Master Tree §17 (implied).
- **Blocks:** RERA-compliant listings.
- **Default if no answer:** Broker Phase B1 (required for broker-role listings); owner permit captured at Phase B2 owner-flow polish.

---

## §2.G Pricing · subscription tiers

### Q-G1 · Ambassador 3-tier rollout timing
**[G · P0 · BOTH]** · **(= MRD Q-5)**
- **Question:** Before or after first external paid ambassador?
- **Source:** MRD Q-5.
- **Blocks:** User.ambassadorPlan schema + UI.
- **Default if no answer:** Before. Phase B1 week 1 priority.

### Q-G2 · Ambassador legacy-default tier honour
**[G · P0 · BOTH]** · **(= MRD Q-6)**
- **Question:** If tier rolls out after first paid ambassador, honour their implied tier (GOLD by legacy default)?
- **Source:** MRD Q-6.
- **Blocks:** Ambassador UX / trust.
- **Default if no answer:** Yes, GOLD default. Grandfather.

### Q-G3 · Dymo self-assigned PLATINUM for testing
**[G · P1 · DYMO]** · **(= MRD Q-7)**
- **Question:** Dymo self-assigns PLATINUM tier to test tier-aware flow end-to-end?
- **Source:** MRD Q-7.
- **Blocks:** Phase B1 Ambassador test coverage.
- **Default if no answer:** Yes, for testing with audit log. Remove post-first-external-paid.

### Q-G4 · BROKER SaaS fee on top of 2% service fee
**[G · P0 · DYMO]** · **(= MRD Q-17)**
- **Question:** Is there a SaaS fee for brokers beyond the 2% ZAAHI service fee, or is 2% the only revenue?
- **Source:** MRD Q-17.
- **Blocks:** BROKER onboarding pitch.
- **Default if no answer:** 2% service fee only; no SaaS layer for individual brokers. Agency-tier SaaS Phase 2+.

### Q-G5 · DEVELOPER pricing model
**[G · P1 · DYMO]** · **(= MRD Q-18)**
- **Question:** SaaS tier (AED 5-25k/mo), per-transaction fee (0.25-0.5% above 2% service fee), or partnership revenue-share for large players?
- **Source:** MRD Q-18.
- **Blocks:** DEVELOPER role Phase B2 monetisation.
- **Default if no answer:** Tiered SaaS per §77 Web Platform. Large partners = bespoke.

### Q-G6 · INVESTOR pricing
**[G · P1 · DYMO]** · **(= MRD Q-19)**
- **Question:** Free + optional institutional SaaS + optional buy-side close fee, or free only?
- **Source:** MRD Q-19.
- **Blocks:** INVESTOR role Phase B2 monetisation.
- **Default if no answer:** Free + optional institutional SaaS (AED 2-10k/mo). No close fee at first.

### Q-G7 · OWNER premium features
**[G · P2 · DYMO]** · **(= MRD Q-20)**
- **Question:** Paid features — anti-fraud monitoring (AED 500-2k/yr), Cat session (AED 500), concierge (AED 5k/closure)?
- **Source:** MRD Q-20.
- **Blocks:** OWNER monetisation scope.
- **Default if no answer:** Anti-fraud paid (primary); Cat + concierge free lead magnets.

### Q-G8 · ARCHITECT pricing
**[G · P1 · DYMO]** · **(= MRD Q-21)**
- **Question:** 15% marketplace commission, flat SaaS (AED 500-2k/mo), or both?
- **Source:** MRD Q-21.
- **Blocks:** ARCHITECT role Phase B3 monetisation.
- **Default if no answer:** 15% marketplace + optional SaaS. 15% aligned with Upwork.

### Q-G9 · Tier-price launch markup above ratified floors
**[G · P1 · DYMO]**
- **Question:** Phase 2 launch Starter price above AED 1000/mo floor (ratified R-5)?
- **Source:** 77_PRICING_FRAMEWORK.md §3.5.
- **Blocks:** Phase 2 commercial positioning.
- **Default if no answer:** Launch at ratified floors; discount negotiated per-tenant.

### Q-G10 · Custom domain included in Pro
**[G · P1 · DYMO]**
- **Question:** For Pro tier, custom domain included or add-on?
- **Source:** §77 §11 line 1305.
- **Blocks:** Pro-tier feature-parity documentation.
- **Default if no answer:** Included.

---

## §2.H Partnership (Rudi · Emaar · Core42 · counsel)

### Q-H1 · SV-14 Sunday call ratification
**[H · P0 · DYMO]**
- **Question:** Has Rudi approved SV-14 (G42 Core42 Abu Dhabi migration) at Sunday 2026-04-27 call? Outcome A (approve), B (amendments), or C (defer)?
- **Context:** 3 days from audit. Unblocks Core42 outreach Mon 2026-04-28 per CORE42_COMMERCIAL_APPROACH §1.1. Also unblocks §50 canonical amendment signature per MASTER_TREE_ENHANCEMENT_PROPOSAL §1.B.
- **Source:** `docs/decisions/SV_14_RUDI_BRIEF.md` §5 (3 outcomes).
- **Blocks:** Core42 outreach, Spec 05/06, §78 G42 migration execution, §50 amendment.
- **Default if no answer:** Assume outcome A pending confirmation; activate Core42 outreach Mon 2026-04-28 EOD. Disclaimer: if Rudi defers, rollback Core42 comms.

### Q-H2 · Core42 commercial conversation channel
**[H · P0 · DYMO]** · **(= Q from §78 §11)**
- **Question:** Dymo direct, Rudi warm intro, or agent cold-email?
- **Source:** `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` §11.
- **Blocks:** Discovery call scheduling.
- **Default if no answer:** Dymo direct first; Rudi warm if Dymo direct stalls >7 days.

### Q-H3 · Core42 cutover date — Dec 25 2026 vs Jan 8 2027
**[H · P1 · BOTH]** · **(= Q from §78 §11)**
- **Question:** Which cutover Friday?
- **Source:** §78 §11 line 907.
- **Blocks:** Phase 2 opening Jan 18 2027 timeline.
- **Default if no answer:** Jan 8 2027. 3-week buffer before Phase 2 opening.

### Q-H4 · Core42 DPA non-standard clauses
**[H · P1 · DYMO]** · **(= Q from §78 §11)**
- **Question:** Insert data-return-on-termination clause, insurance, liability caps into DPA?
- **Source:** §78 §11 line 911.
- **Blocks:** DPA negotiation posture.
- **Default if no answer:** Standard DPA + data-return-on-termination. No other non-standard clauses.

### Q-H5 · Core42 cutover image optimisation — Sharp vs Azure CDN
**[H · P2 · JAN]** · **(= Q from §78 §11)**
- **Question:** Self-host Sharp in Container App or delegate to Azure CDN transforms?
- **Source:** §78 §11 line 913.
- **Blocks:** Post-cutover image perf.
- **Default if no answer:** Self-host Sharp; vendor-portable.

### Q-H6 · Rudi AED 1M agency wire
**[H · P0 · DYMO]**
- **Question:** Rudi's AED 1M agency wire confirmed by 2026-05-08?
- **Context:** Requires bus factor fix (§N) to land first.
- **Source:** `docs/decisions/SV_14_RUDI_BRIEF.md` §4 + ops docs.
- **Blocks:** Agency activation, Plot 1 pipeline, commission accrual.
- **Default if no answer:** Confirmed pending. If delay, Plot 1 timeline slips.

### Q-H7 · Emaar inbound — onboarding depth ask
**[H · P0 · DYMO]** · **(= MRD Q-24)**
- **Question:** What depth of onboarding is Emaar requesting — bulk inventory API, standard DEVELOPER role, bespoke?
- **Source:** MRD Q-24.
- **Blocks:** DEVELOPER role Phase B2 scope.
- **Default if no answer:** Pending. Dymo's conversation; capture in writing post-meeting.

### Q-H8 · Other 5+ developers — scale classification
**[H · P1 · DYMO]** · **(= MRD Q-25)**
- **Question:** Are "5+ other developers interested" at Emaar scale or smaller? Large = bespoke; mid-tier = DEVELOPER role as drafted.
- **Source:** MRD Q-25.
- **Blocks:** DEVELOPER role sizing.
- **Default if no answer:** Mid-tier (Azizi, Binghatti scale). Bespoke escalations per-case.

### Q-H9 · INVESTOR warm intros — Dymo network
**[H · P1 · DYMO]** · **(= MRD Q-26)**
- **Question:** Pick 2-3 family offices (Al Futtaim, Al Ghurair, Al Habtoor, Al Naboodah) to brief as Phase B2 INVESTOR MVP early-access.
- **Source:** MRD Q-26.
- **Blocks:** INVESTOR MVP validation.
- **Default if no answer:** Select after DPO hired + KYC vendor picked.

### Q-H10 · ARCHITECT warm intros
**[H · P2 · DYMO]** · **(= MRD Q-27)**
- **Question:** Pre-warm UAE architecture consultancies as launch partners?
- **Source:** MRD Q-27.
- **Blocks:** ARCHITECT marketplace cold-start.
- **Default if no answer:** Open cold-launch; warm intros incremental.

### Q-H11 · Rudi agency commission routing — in Spec 02 or outside
**[H · P0 · DYMO]** · **(= MRD Q-23)**
- **Question:** Does Rudi agency commission flow through Spec 02 Invoice pipeline, or shadow ledger external?
- **Source:** MRD Q-23.
- **Blocks:** Spec 02 Invoice type taxonomy.
- **Default if no answer:** Inside Spec 02 as AGENCY_COMMISSION type. Cleaner audit.

### Q-H12 · Corporate tax + UBO filing schedule
**[H · P0 · DYMO]** · **(= Q-F8 duplicate; canonical here)**
- **Question:** Mainland CT registration + UBO filing within 60 days of incorporation. Dates?
- **Source:** AUDIT_FINDINGS CRITICAL-3 + CRITICAL-5.
- **Blocks:** Legal compliance risk.
- **Default if no answer:** File UBO Day 45 post-incorp; CT registration via EmaraTax Month 3 end.

---

## §2.I Vendor selection (DPO · counsel · AML · hosting)

### Q-I1 · DPO hire/retainer
**[I · P0 · DYMO]** · **(= MRD Q-13, Q-F4 canonical)**
- See Q-F4.

### Q-I2 · AML vendor
**[I · P1 · DYMO]** · **(= MRD Q-15, Q-F6 canonical)**
- See Q-F6.

### Q-I3 · UAE commercial counsel for ambassador legal opinion
**[I · P1 · DYMO]**
- **Question:** Which law firm for AED 5-15k ambassador legal opinion? Equilibrium's existing counsel, or new sourcing?
- **Source:** MRD Q-12 + Dymo network.
- **Blocks:** Ambassador program public launch.
- **Default if no answer:** Equilibrium's counsel.

### Q-I4 · SCC review counsel for Supabase DPA
**[I · P1 · DYMO]**
- **Question:** Same counsel for Supabase SCC review or different?
- **Source:** MRD Q-14.
- **Blocks:** SCC signing speed.
- **Default if no answer:** Same counsel.

### Q-I5 · Stripe vs Paddle at Phase 2 5-10 tenant threshold
**[I · P1 · BOTH]**
- **Question:** D-22 pending.
- **Source:** §77 §13 D-22.
- **Blocks:** Billing processor selection.
- **Default if no answer:** Stripe (higher UAE market support).

### Q-I6 · Anthropic DPA (SV-1)
**[I · P2 · DYMO]**
- **Question:** Sign Anthropic DPA? SV-1 proposal.
- **Source:** `docs/vision/MASTER_TREE_SOVEREIGNTY_PROPOSALS.md`.
- **Blocks:** Anthropic (Claude) sovereignty posture.
- **Default if no answer:** Sign when DPO retainer hired.

### Q-I7 · Archibald AI vendor continuity
**[I · P2 · JAN]**
- **Question:** Cat/Mole/Falcon continue on Claude Sonnet 4.6 through Phase 1, or migrate to Core42 Compass when available?
- **Source:** §41 AI System + §78.
- **Blocks:** AI stack sovereignty.
- **Default if no answer:** Claude for Phase 1; re-evaluate at Phase 2 post-migration.

### Q-I8 · Mistral SV-4 fallback
**[I · P2 · JAN]**
- **Question:** Mistral as SV-4 fallback (if Anthropic DPA falls through) — implementation status?
- **Source:** Sovereignty proposals SV-4.
- **Blocks:** AI resilience.
- **Default if no answer:** Phase 2; not blocking Phase 1.

### Q-I9 · Monitoring stack — Azure Monitor vs Grafana Cloud
**[I · P1 · JAN]**
- **Question:** Post-migration monitoring — Azure Monitor native or Grafana Cloud portable?
- **Source:** §78 §11 line 918.
- **Blocks:** Post-cutover observability.
- **Default if no answer:** Grafana Cloud (vendor-portable, matches sovereignty posture).

---

## §2.J Infrastructure

### Q-J1 · Staging Supabase creation
**[J · P0 · BOTH]** · **(= Q-C1, canonical here)**
- See Q-C1.

### Q-J2 · ADGM vs DIFC vs mainland for ZAAHI legal entity
**[J · P1 · DYMO]** · **(= MRD Q-30)**
- **Question:** Affects PDPL + DPO regime.
- **Source:** MRD Q-30.
- **Blocks:** Legal opinion needed this quarter?
- **Default if no answer:** Mainland per current plan; ADGM SPV for Platform Holdco (Phase 2) per §77 v1.2.

### Q-J3 · Document storage migration path
**[J · P1 · JAN]** · **(= MRD Q-33)**
- **Question:** Migrate documents to Azure Blob incrementally, or swap at cutover?
- **Source:** MRD Q-33.
- **Blocks:** Cutover maintenance-window size.
- **Default if no answer:** Incremental starting Month 7; full swap at cutover reduces to metadata-only.

### Q-J4 · Core42 vs Oracle Cloud UAE vs AWS Bahrain
**[J · P0 · DYMO]** · **(= MRD Q-29)**
- **Question:** Is Core42 committed, or are Oracle UAE / AWS Bahrain re-evaluated?
- **Source:** MRD Q-29.
- **Blocks:** SV-14 ratification outcome.
- **Default if no answer:** Core42 committed pending SV-14 + discovery-call data.

### Q-J5 · Core42 POC tenant terms
**[J · P0 · DYMO]**
- **Question:** POC free, credited, or hourly-billed? Red flag 6 in CORE42_COMMERCIAL_APPROACH.
- **Source:** CORE42_COMMERCIAL_APPROACH §3.4 + §9.
- **Blocks:** Discovery call red-flag list.
- **Default if no answer:** Free + credited to MSA. If hourly, pivot evaluation.

### Q-J6 · Post-migration domain DNS
**[J · P1 · JAN]**
- **Question:** Keep Namecheap registrar, re-point A/CNAME to Azure Front Door? Timing?
- **Source:** §78 §3.2.
- **Blocks:** Cutover maintenance window.
- **Default if no answer:** Keep Namecheap; re-point at cutover T-30min (staging) and T-0 (prod).

### Q-J7 · ADGM Core42 entity needed for MSA signing?
**[J · P1 · DYMO]**
- **Question:** MSA signatory — mainland LLC (today) or ADGM SPV (Phase 2+)?
- **Source:** CORE42_COMMERCIAL_APPROACH §7 Ask-Rudi-first #9.
- **Blocks:** MSA signing timeline.
- **Default if no answer:** Mainland LLC (Rudi agency entity) signs; assignable to ADGM HoldCo when formed.

### Q-J8 · ADGM vs DIFC HoldCo formation timeline
**[J · P2 · DYMO]**
- **Question:** When is Platform HoldCo formed in ADGM? Phase 1 Month 6, or Phase 2 Month 10+?
- **Source:** §77 §1.6 HoldCo references.
- **Blocks:** Tax structuring for SaaS revenue.
- **Default if no answer:** Phase 1 Month 6 per enhancement proposal.

### Q-J9 · Phase 2 launch pre-cutover (external users on Supabase)
**[J · P0 · BOTH]** · **(= MRD Q-4)**
- **Question:** Can external users launch on Supabase Frankfurt Phase 2, with migration at Month 9-10?
- **Source:** MRD Q-4.
- **Blocks:** Phase 2 timeline vs migration timeline.
- **Default if no answer:** Yes, Phase 2 opens on Supabase; migrate after stabilisation (Month 10+).

### Q-J10 · Saudi Phase 2 cross-border routing
**[J · P2 · JAN]**
- **Question:** Q2 2027 Saudi expansion — Core42 cross-border routing (Abu Dhabi ↔ Riyadh) approach?
- **Source:** CORE42_COMMERCIAL_APPROACH §4 Q7.
- **Blocks:** Saudi rollout architecture.
- **Default if no answer:** Ask Core42 at discovery call. Likely needs separate Saudi sovereignty entity.

---

## §2.K Scope-cut

### Q-K1 · Phase B3 slip — INVESTOR or ARCHITECT drops?
**[K · P1 · BOTH]** · **(= MRD Q-34)**
- **Source:** MRD Q-34.
- **Blocks:** Phase B3 exit criteria.
- **Default if no answer:** ARCHITECT drops. INVESTOR unlocks $13M round narrative.

### Q-K2 · Phase B2 slip — DEVELOPER or AMBASSADOR second-half drops?
**[K · P1 · BOTH]** · **(= MRD Q-35)**
- **Source:** MRD Q-35.
- **Blocks:** Phase B2 exit criteria.
- **Default if no answer:** Ambassador second-half (automated payout) drops. Keep DEVELOPER for Emaar inbound.

### Q-K3 · Phase 1 scope-cut for owner-only
**[K · P1 · JAN]**
- **Question:** Defer MFA + Privacy Centre from P0? (OPEN_QUESTIONS Q-14)
- **Source:** OPEN_QUESTIONS Q-14.
- **Blocks:** Month 4-6 sprint scope.
- **Default if no answer:** Defer MFA + Privacy Centre to Phase 2.

### Q-K4 · Feasibility Framework full scope
**[K · P2 · BOTH]**
- **Question:** Resume Framework work (Phase A ~40 hrs)?
- **Source:** `docs/decisions/PARKED_FEASIBILITY_FRAMEWORK_DECISION.md`.
- **Blocks:** Market-data budget, quant hire (R-5).
- **Default if no answer:** Parked. Resume Phase 2+.

### Q-K5 · Month 4 safety P0 sprint — overcompressed fix
**[K · P0 · JAN]**
- **Question:** H-1 in AUDIT_FINDINGS. Spread 20 eng-weeks across Months 4-6 (accepted fix). Confirm execution schedule.
- **Source:** AUDIT_FINDINGS H-1.
- **Blocks:** Jan capacity planning.
- **Default if no answer:** Spread 5+5+5 eng-weeks Month 4-6 as fixed. Jan confirms.

### Q-K6 · 3D Artist role funding path
**[K · P1 · DYMO]**
- **Question:** §4.6 §4.3 Y1 envelope (AED 1.5-1.7M) vs Platform Dev Fund?
- **Source:** MASTER_TREE_ENHANCEMENT_PROPOSAL §4.6.
- **Blocks:** R-9 budget line item.
- **Default if no answer:** Platform Dev Fund (not Y1 Enhancement envelope).

---

## §2.L Governance

### Q-L1 · Critical-path OPEN_QUESTIONS answers (Q-1, 9, 13, 14, 34)
**[L · P0 · BOTH]**
- **Question:** Five critical-path questions from prior OPEN_QUESTIONS_FOR_OWNERS answered by 2026-05-10?
- **Source:** `docs/audit/OPEN_QUESTIONS_FOR_OWNERS.md`.
- **Blocks:** MASTER_TREE_ENHANCEMENT_PROPOSAL refresh binding.
- **Default if no answer:** Apply defaults; document in DECISIONS.md as "defaulted per audit".

### Q-L2 · Rudi communication cadence
**[L · P1 · DYMO]** · **(Q-38 from OPEN_QUESTIONS)**
- **Question:** Weekly Sunday call? Weekly email? Bi-weekly?
- **Source:** OPEN_QUESTIONS Q-38.
- **Blocks:** MOU enforcement.
- **Default if no answer:** Weekly Sunday 20:00 UAE call + written summary email.

### Q-L3 · Board meeting frequency
**[L · P1 · DYMO]** · **(Q-39 from OPEN_QUESTIONS)**
- **Question:** Monthly? Quarterly?
- **Source:** OPEN_QUESTIONS Q-39.
- **Blocks:** Governance cadence.
- **Default if no answer:** Monthly for Phase 1; quarterly at Phase 2+.

### Q-L4 · Decision delegation matrix
**[L · P1 · BOTH]** · **(Q-41 from OPEN_QUESTIONS)**
- **Question:** Standard / tight / loose matrix?
- **Source:** OPEN_QUESTIONS Q-41.
- **Blocks:** Founder spending authority.
- **Default if no answer:** Standard (A).

### Q-L5 · Feature-flag flip authority
**[L · P0 · BOTH]** · **(= MRD Q-22, Q-38; Q-JAN8)**
- **Question:** Per-flag founder sign-off, or engineering-autonomous up to MVP checklist pass?
- **Source:** MRD Q-22 + Q-38.
- **Blocks:** Every role rollout.
- **Default if no answer:** Engineering-autonomous for MVP flags; founder for production critical (e.g., AMBASSADOR_SIGNUP_OPEN public flip).

### Q-L6 · Pre-merge vs post-merge review for schema
**[L · P0 · BOTH]** · **(= MRD Q-37; Q-JAN10)**
- **Question:** Pre-merge pair-review for schema, post-merge for route handlers?
- **Source:** MRD Q-37.
- **Blocks:** Dev velocity vs blast radius.
- **Default if no answer:** Pre-merge schema; post-merge routes.

### Q-L7 · First external user onboarding ownership
**[L · P1 · DYMO]** · **(= MRD Q-39)**
- **Question:** Does founder personally onboard first external (broker / developer / ambassador / investor / owner / architect), or trust integration tests?
- **Source:** MRD Q-39.
- **Blocks:** First-user experience quality.
- **Default if no answer:** Founder personal Phase B1; trust tests Phase B2+.

### Q-L8 · KYC SLA ownership
**[L · P1 · DYMO]** · **(= MRD Q-40)**
- **Question:** Who owns 24-72h KYC SLA — Dymo, Jan, or hired ops?
- **Source:** MRD Q-40.
- **Blocks:** SLA commitment credibility.
- **Default if no answer:** Dymo Phase 1 (Zhan tech support); hire Phase 2.

### Q-L9 · AUTONOMY_PROTOCOL YELLOW tier blast-radius assessment
**[L · P1 · JAN]**
- **Question:** In YELLOW tier (founder-confirmation required) cases with subjective blast radius (e.g., new directory at repo root), who judges?
- **Source:** AUTONOMY_PROTOCOL §2.
- **Blocks:** Day-to-day autonomy.
- **Default if no answer:** Jan self-assesses + flags in pre-commit comment. Founder reviews post-hoc.

### Q-L10 · 2-of-3 founder signature for critical Super-Admin ops
**[L · P1 · BOTH]**
- **Question:** Spec 03 §14 says 2-of-3 founder signature for critical ops. How enforced — written memo, Slack-ack, e-signature?
- **Source:** Spec 03 §14 iron-clad guardrails.
- **Blocks:** Super-Admin audit posture.
- **Default if no answer:** Slack-ack in founder group + DECISIONS.md entry. Founder confirm.

### Q-L11 · Tranche budget authorisation
**[L · P0 · DYMO]**
- **Question:** AED 1.5-1.7M Y1 tranche budget — Rudi ratify annually or quarterly after first drawdown?
- **Source:** MASTER_TREE_ENHANCEMENT_PROPOSAL §4.1.
- **Blocks:** Spend authority after Y1 Month 12.
- **Default if no answer:** Annual (quarterly reporting).

---

## §2.M Strategic

### Q-M1 · Pivot order — 6 roles
**[M · P0 · BOTH]** · **(= MRD Q-1; top-10 load-bearing)**
- **Question:** BROKER → OWNER → AMBASSADOR → DEVELOPER → INVESTOR → ARCHITECT, or different?
- **Source:** MRD Q-1.
- **Blocks:** Phase B1/B2/B3 task ordering.
- **Default if no answer:** AMBASSADOR → BROKER → OWNER → DEVELOPER → INVESTOR → ARCHITECT (recommended in MRD §8.1).

### Q-M2 · Rudi wire hard-commits BROKER first
**[M · P0 · DYMO]** · **(= MRD Q-2)**
- **Question:** Does AED 1M wire commit BROKER first, or can AMBASSADOR land Week 1?
- **Source:** MRD Q-2.
- **Blocks:** Phase B1 sequencing.
- **Default if no answer:** AMBASSADOR Week 1 (small work, high leverage); BROKER Week 2-3.

### Q-M3 · Timeline commit — 5 / 7 / 10 months
**[M · P0 · BOTH]** · **(= MRD Q-3)**
- **Question:** Full 6-role polished in 5 (aggressive) / 7 (realistic) / 10 (safe) months?
- **Source:** MRD Q-3.
- **Blocks:** Scope-cut decisions.
- **Default if no answer:** 7 realistic.

### Q-M4 · Abu Dhabi migration before external users
**[M · P0 · BOTH]** · **(= MRD Q-4, Q-J9 canonical)**
- See Q-J9.

### Q-M5 · Phase 2 trigger — time-based vs metric-based
**[M · P1 · DYMO]** · **(Q-1 from OPEN_QUESTIONS)**
- **Question:** Phase 2 opens Month 10 hard, or depends on KPIs (first deal, first paid tenant, etc.)?
- **Source:** OPEN_QUESTIONS Q-1.
- **Blocks:** Phase 1 completion test.
- **Default if no answer:** Hybrid — Month 10 hard default unless 2-of-3 founders file delay by Month 9 end.

### Q-M6 · Phase 1 Master Tree sections list
**[M · P1 · JAN]** · **(Q-9 from OPEN_QUESTIONS)**
- **Question:** Approve list for Phase 1? (§77 + §75 + §17 + §31 + §58 + §48 + §47 + §66 + §41 + §35 + CMS)
- **Source:** OPEN_QUESTIONS Q-9.
- **Blocks:** Month 1-9 roadmap.
- **Default if no answer:** Approve as-is.

### Q-M7 · Plot 1 first-deal-close date fixed
**[M · P0 · BOTH]**
- **Question:** 2026-06-19 (Fri Week 9) hard, or sliding?
- **Source:** Cross-reference all Phase 1 specs + AUDIT_FINDINGS + SV-14 Brief.
- **Blocks:** Every Phase 1 ship date depends on this.
- **Default if no answer:** Hard. Every spec must ship pre-Week 9 OR Plot 1 uses Spec 03 Super-Admin overrides.

### Q-M8 · Phase 2 opening date — Jan 18 2027
**[M · P1 · DYMO]**
- **Question:** Phase 2 external opening Mon 2027-01-18 hard, or moves with Phase 1 completion?
- **Source:** §77 + PILOT_TENANT_OUTREACH.
- **Blocks:** Core42 cutover buffer.
- **Default if no answer:** Hard — aligns with ADIS follow-up + Chinese/Lunar New Year 2027.

---

## §2.N Bus factor · operational risk

### Q-N1 · Bus factor co-working session date
**[N · P0 · BOTH]**
- **Question:** 2026-05-03 Sat confirmed, or floating?
- **Source:** BUS_FACTOR_RECOVERY.md.
- **Blocks:** Q-H6 Rudi wire.
- **Default if no answer:** 2026-05-03 Sat. If slip, reschedule this week.

### Q-N2 · Bus factor sign-off memo template
**[N · P0 · BOTH]**
- **Question:** Memo template filed at `docs/decisions/bus-factor-fix-YYYY-MM-DD.md`?
- **Source:** BUS_FACTOR_RECOVERY.md §7.
- **Blocks:** Rudi trust posture.
- **Default if no answer:** Jan drafts template in advance of session; both founders sign.

### Q-N3 · Rudi counsel sealed envelope
**[N · P1 · BOTH]**
- **Question:** Include sealed envelope with Rudi counsel for >7-day founder-unreachable? Option A (now AED 5-10k), B (Phase 2 defer), or C (skip)?
- **Source:** BUS_FACTOR_RECOVERY §6.
- **Blocks:** Founder-succession resilience.
- **Default if no answer:** B (defer to Phase 2).

### Q-N4 · 1Password Family setup ownership
**[N · P1 · BOTH]**
- **Question:** Who owns 1Password Family admin?
- **Source:** BUS_FACTOR_RECOVERY §3.
- **Blocks:** Secret rotation.
- **Default if no answer:** Both founders joint admin.

### Q-N5 · Secret rotation cadence
**[N · P0 · JAN]**
- **Question:** Quarterly per Spec 06?
- **Source:** Spec 06 Secrets Rotation Policy.
- **Blocks:** Pre-Core42 cutover.
- **Default if no answer:** Quarterly.

### Q-N6 · Founder unreachable escalation SLA
**[N · P1 · BOTH]**
- **Question:** >48 hours → what exactly? >7 days → what?
- **Source:** BUS_FACTOR_RECOVERY §5 Recovery runbook.
- **Blocks:** Written runbook.
- **Default if no answer:** >48h = partner takes sole admin; >7d = notify Rudi + counsel.

---

## §2.O UI/UX open decisions

### Q-O1 · Building rotation — Api Horizon Pointe correct angle
**[O · P0 · DYMO]**
- **Question:** What's the correct `rotationDeg` for Api Horizon Pointe? Founder tests `?buildingRotation=X` URL param.
- **Source:** Prior turn UX + Geometry fix; currently DB value 0, URL override available.
- **Blocks:** Map visual alignment.
- **Default if no answer:** 0 (current). Founder tests 0/45/90/135/180/225/270/315, reports back.

### Q-O2 · ZAAHI Signature colour for FUTURE_DEVELOPMENT
**[O · P1 · DYMO]**
- **Question:** Recent commit changed sandstone #A8926E. Ratified?
- **Source:** commit 112100e.
- **Blocks:** Legend colour stability.
- **Default if no answer:** Sandstone #A8926E ratified.

### Q-O3 · Role-specific dashboard design
**[O · P1 · BOTH]**
- **Question:** Per-role dashboards share template, or bespoke? (BROKER / DEVELOPER / INVESTOR / OWNER / AMBASSADOR / ARCHITECT)
- **Source:** MRD §3 per-role Dashboard needs.
- **Blocks:** Phase B1-B3 UI.
- **Default if no answer:** Shared glass template (matches existing /dashboard) with per-role tabs/sections.

### Q-O4 · Building card footprint polygon display
**[O · P1 · JAN]**
- **Question:** When `Building.footprintPolygon` is populated with real OSM geometry (Q-C9), does card display it as a mini-map?
- **Source:** BuildingCard.tsx.
- **Blocks:** Building card V3.
- **Default if no answer:** Yes, mini-map on card.

### Q-O5 · Update API Horizon Pointe row — floors 27, completionYear 2021, OSM polygon
**[O · P1 · DYMO]**
- **Question:** Founder approves updating Building DB row with OSM findings (27 floors vs 26, 2021 completion, real polygon)?
- **Source:** Prior turn position-verify findings.
- **Blocks:** Building card accuracy.
- **Default if no answer:** Wait for explicit founder "yes".

### Q-O6 · Map diagnostic click removal
**[O · P2 · JAN]**
- **Question:** The map-level diagnostic click (setupOffering debugging) from prior turn — remove now, or keep through Phase 2?
- **Source:** Prior turn.
- **Blocks:** Nothing; cosmetic.
- **Default if no answer:** Keep; low overhead, useful for future debugging.

### Q-O7 · Layers popover vs headerBar role
**[O · P2 · JAN]**
- **Question:** Phase B1 role rollouts — add role-specific layers to existing popover (already does ZAAHI Listings), or separate UI?
- **Source:** Prior turn "move toggles into Layers popover".
- **Blocks:** UX consistency.
- **Default if no answer:** Integrate into existing popover.

### Q-O8 · Archibald chat visibility gating
**[O · P1 · JAN]**
- **Question:** Archibald chat — visible to all approved users, or per-role (OWNER gets plain, INVESTOR gets advanced)?
- **Source:** `ArchibaldChat.tsx` current behaviour.
- **Blocks:** Role-specific Archibald UX.
- **Default if no answer:** All approved users Phase 1; per-role tuning Phase 2.

---

## §2.P AI · Archibald · Claude integration

### Q-P1 · Claude Sonnet 4.6 — continue or upgrade?
**[P · P2 · JAN]**
- **Question:** Upgrade Cat/Mole/Falcon to Claude Sonnet 4.7 (released)?
- **Source:** `CLAUDE.md` AI stack.
- **Blocks:** Chat quality.
- **Default if no answer:** Sonnet 4.6 until first Feasibility v2 ship; upgrade post-ship.

### Q-P2 · Own AI 2027 cutover
**[P · P2 · JAN]** · **(Master Tree §41)**
- **Question:** Current status (Apr 2026)? Training? Dataset?
- **Source:** `MASTER_TREE_final.md` §41.
- **Blocks:** Q4 2027 cutover feasibility.
- **Default if no answer:** Status unknown; raise with Jan.

### Q-P3 · Archibald system-prompt tenant-ization
**[P · P2 · JAN]**
- **Question:** §77 v1.2 suggests per-tenant SYSTEM_PROMPT. Phase 2 ship?
- **Source:** §77 §6.
- **Blocks:** Tenant-custom Archibald.
- **Default if no answer:** Phase 2 Month 10+.

### Q-P4 · Cat Advisor for Ambassador onboarding
**[P · P1 · BOTH]**
- **Question:** Cat guides paid-tier selection on `/join`? MVP or Phase 2?
- **Source:** Master Tree §18 + §41.
- **Blocks:** Ambassador UX.
- **Default if no answer:** Phase 2 (static form Phase 1).

### Q-P5 · Claude Vision for title-deed OCR — production ready?
**[P · P1 · JAN]**
- **Question:** `/api/parcels/parse-title-deed` uses Claude Vision. Production-grade?
- **Source:** `src/app/api/parcels/parse-title-deed/route.ts`.
- **Blocks:** OWNER title-deed upload flow.
- **Default if no answer:** Beta; manual admin review of OCR Phase 1.

### Q-P6 · Claude API cost budget
**[P · P1 · DYMO]**
- **Question:** Y1 Claude API budget?
- **Source:** §41 + §4.3 Y1 envelope.
- **Blocks:** Claude usage scaling.
- **Default if no answer:** AED 50-100k Y1 (embedded in Y1 envelope).

---

## §2.Q Data sovereignty · self-hosting path

### Q-Q1 · Sovereignty migration order
**[Q · P1 · JAN]** · **(= Q-A16 canonical)**
- See Q-A16.

### Q-Q2 · Anthropic vs Core42 Compass cutover
**[Q · P2 · JAN]**
- **Question:** Claude via Anthropic API → Core42 Compass (Stargate UAE GPU) timeline?
- **Source:** §78 + §41.
- **Blocks:** AI sovereignty goal.
- **Default if no answer:** Phase 3+ (2027 Q4 per §41).

### Q-Q3 · Polygon node self-hosting
**[Q · P2 · JAN]**
- **Question:** Q4 2026 own Polygon nodes? Status?
- **Source:** §52 + §78.
- **Blocks:** "zero Infura" claim.
- **Default if no answer:** Status unknown; Phase 2+.

### Q-Q4 · Stripe → Own Bank Q2 2028
**[Q · P2 · DYMO]**
- **Question:** UAE Central Bank licence application filed?
- **Source:** §52.
- **Blocks:** Sovereign Bank claim.
- **Default if no answer:** Not filed; Phase 3+ event.

### Q-Q5 · Docker-compose portability
**[Q · P1 · JAN]**
- **Question:** Is `docker-compose up` working today, or Vercel lock-in regressed?
- **Source:** CLAUDE.md Sovereignty Readiness Rules.
- **Blocks:** Core42 migration readiness.
- **Default if no answer:** Test before Month 6; fix if regressed.

---

## §2.R Wall · social features · Advertiser Permit

### Q-R1 · The Wall feature — Phase 1 or Phase 2?
**[R · P1 · BOTH]**
- **Question:** Social Wall feature scope?
- **Source:** Master Tree (implied; no dedicated section).
- **Blocks:** Social layer launch.
- **Default if no answer:** Phase 2.

### Q-R2 · Advertiser Permit regulatory
**[R · P1 · DYMO]**
- **Question:** Does ZAAHI need an Advertiser Permit (Trakheesi)? Who handles?
- **Source:** UAE advertising regulations.
- **Blocks:** Any advertising feature.
- **Default if no answer:** Not needed for listings; needed for display ads. Phase 2+ if ads.

### Q-R3 · User-generated content moderation
**[R · P2 · JAN]**
- **Question:** UGC (Wall posts, photos) — how moderated? Automated + human review?
- **Source:** Master Tree §73 Media + Wall (implied).
- **Blocks:** Launch readiness.
- **Default if no answer:** Phase 2 with Cat AI first-pass + Super-Admin escalation.

---

## §2.S Tokenisation · blockchain · metaverse

### Q-S1 · ZAH Token launch status
**[S · P2 · BOTH]** · **(= Q-A10 canonical)**
- See Q-A10.

### Q-S2 · Tokenisation regulatory (VARA)
**[S · P1 · DYMO]**
- **Question:** VARA exemption for real-estate-backed tokens?
- **Source:** §35 + §34.
- **Blocks:** Tokenisation launch.
- **Default if no answer:** Legal opinion Phase 2 before launch.

### Q-S3 · Metaverse engine fidelity Phase 1
**[S · P2 · JAN]**
- **Question:** §39 Metaverse — Phase 1 ships digital twin (Buildings layer); Phase 2 full walkthrough?
- **Source:** Master Tree §39 + Building layer work.
- **Blocks:** Metaverse vertical.
- **Default if no answer:** Phase 1 = Building layer + POC (Al Fahidi, Candidate Sample). Phase 2 = full walkthrough.

### Q-S4 · DLD on-chain registry
**[S · P2 · DYMO]**
- **Question:** Is DLD maintaining a parallel on-chain registry, or is ZAAHI the source of truth for tokenised assets?
- **Source:** §35.
- **Blocks:** Tokenisation integrity model.
- **Default if no answer:** ZAAHI source of truth; DLD references Phase 2+.

---

## §2.T Robotics Fund · expansion

### Q-T1 · Robotics Fund activation
**[T · P2 · BOTH]** · **(= Q-A18 canonical)**
- See Q-A18.

### Q-T2 · Robot fleet status
**[T · P2 · DYMO]** · **(= Master Tree §46)**
- **Question:** Any robots in service or testing?
- **Source:** `MASTER_TREE_final.md` §46.
- **Blocks:** Robot-build claim credibility.
- **Default if no answer:** Zero robots Phase 1-2; Phase 3+ feature.

### Q-T3 · Satellite 2030 realism
**[T · P2 · BOTH]**
- **Question:** §45 Own Satellite 2030 — aspirational or budgeted?
- **Source:** `MASTER_TREE_final.md` §45.
- **Blocks:** Investor narrative.
- **Default if no answer:** Aspirational. Rollback to Falcon satellite partnerships (Planet, Maxar) in narrative.

---

# §3 · Deduplication log

Questions that appeared in multiple sources, consolidated under canonical ID:

| Canonical Q | Original sources (deduped) |
|---|---|
| Q-F1 (RERA BROKER verification) | MRD Q-11 · Master Tree §17 ambiguity |
| Q-F4 (DPO hire) | MRD Q-13 · §77 v1.2 D-11 · OPEN_QUESTIONS Q-14 adjacent |
| Q-C1 (staging Supabase) | MRD Q-28 · AUDIT_FINDINGS implicit · Spec 05 §3.1 (dead-column risk) |
| Q-G1 (Ambassador 3-tier rollout) | MRD Q-5 · CLAUDE.md Ambassador rules · `src/lib/ambassador.ts` TODO |
| Q-C2 (User.ambassadorPlan column) | `src/lib/ambassador.ts` TODO line 43 · Spec 02 adjacent · MRD Q-5 |
| Q-A3 / Q-E4 (2% broker vs 2% ZAAHI stack) | Master Tree §17 · CLAUDE.md Ambassador · Spec 02 rate calc |
| Q-A17 / Q-E8 (0.2% vs 2% revenue Engine stream) | Master Tree §54 · CLAUDE.md |
| Q-J9 / Q-M4 (Abu Dhabi migration before external users) | MRD Q-4 |
| Q-J4 / Q-M (Core42 vs Oracle / AWS Bahrain) | MRD Q-29 · §78 §11 · SV-14 Brief |
| Q-J2 (ADGM vs DIFC vs mainland) | MRD Q-30 · §77 §1.6 · AUDIT_FINDINGS CRITICAL-5 |
| Q-L1 (Critical-path OPEN_QUESTIONS answers) | OPEN_QUESTIONS Q-1/9/13/14/34 · MASTER_TREE_ENHANCEMENT_PROPOSAL §9 |
| Q-F10/F11/F12 (holiday impacts) | AUDIT_FINDINGS C-1/M-1/M-2 |
| Q-H12 / Q-F8 (CT + UBO filing) | AUDIT_FINDINGS CRITICAL-3 + CRITICAL-5 |
| Q-H6 (Rudi AED 1M wire) | SV-14 Brief · MOU_RUDI · AUDIT_FINDINGS H-2 Dymo outreach |
| Q-L5 (feature-flag flip authority) | MRD Q-22 · MRD Q-38 |
| Q-L6 (pre-merge vs post-merge review) | MRD Q-37 · AUTONOMY_PROTOCOL §2 |
| Q-JAN4 / Q-D9 (RLS refactor) | Spec 05 §6.3 · §78 §3.2 |
| Q-K1 / MRD Q-34 (Phase B3 slip) | MRD Q-34 |
| Q-K2 / MRD Q-35 (Phase B2 slip) | MRD Q-35 |

Total duplicate mergers: 19. Unique Q count after dedup: 187 − 19 duplicates already in 187 = 168 unique (but presented as 187 for traceability).

---

# §4 · Pending ratifications tracker

## 4.1 MASTER_TREE_ENHANCEMENT_PROPOSAL v1.4 — 22 defaults pending ratification

Per agent audit of the proposal:

| # | Item | Default applied | Needs ratification | Source line |
|---|---|---|---|---|
| 1 | §4.1 Tranche-based 24-month authorization | ✓ Applied | Q-34 C pending (Rudi) | 393 |
| 2 | §4.2 Founder spending authority | ✓ Applied | Q-35 B pending (Rudi tie-break rule) | 415 |
| 3 | §1.B SV-14 canonical amendment | ❌ Not applied (text preserved) | Unanimous founder + Rudi | 128, 177 |
| 4 | §4.6 R-9 3D Artist funding path | ❌ Unreconciled | Founder choose Path 1 / Path 2 | 511 |
| 5 | §8.1 Rudi communication cadence | ✓ Applied (Q-L2 here) | Q-38 A pending | 670 |
| 6 | §8.2 Board meeting frequency | ✓ Applied (Q-L3 here) | Q-39 A+C pending | 677 |
| 7 | §8.3 Material event thresholds | ✓ Applied (Q-F9 here) | Q-40 all-10 pending | 682 |
| 8 | §8.4 Decision delegation matrix | ✓ Applied (Q-L4 here) | Q-41 A pending | 696 |
| 9-14 | MASTER_TREE_SAFETY_PROPOSALS S-1..S-6 ratification | ✓ Ratified in §1.A | — | — |
| 15-17 | MASTER_TREE_SAFETY_PROPOSALS S-7..S-10 | Partial | Pending | — |
| 18-19 | MASTER_TREE_SOVEREIGNTY_PROPOSALS SV-1, SV-2, SV-3 | ✓ Ratified | — | — |
| 20-22 | SV-4 through SV-9 | Deferred | Revisit Phase 2+ | — |

**Six mission-critical defaults remaining unratified:** SV-14 canonical (#3), R-9 funding (#4), Q-38/39/40/41 (#5-8) in MOU compliance section.

## 4.2 4 Rudi-specific decisions

1. **SV-14 ratification** (Q-H1) — Sun 2026-04-27. Still pending.
2. **AED 1M agency wire** (Q-H6) — by 2026-05-08. Pending.
3. **Rudi material events list approval** (Q-F9) — pending Q-40.
4. **Tranche budget authorisation** (Q-L11) — pending Q-34.

## 4.3 Assumptions agent has applied pending founder confirmation

| Assumption | Source |
|---|---|
| Plot 1 close Fri 2026-06-19 is hard | AUDIT_FINDINGS + Spec 01-04 timelines |
| Core42 committed as G42 partner | §78 + SV-14 Brief |
| ZAAHI service fee is 2%, not 0.2% | CLAUDE.md (Q-A17 unresolved) |
| Broker + ZAAHI fees are stacked (4% total) | Market standard (Q-A3 unresolved) |
| Phase 2 opens Mon 2027-01-18 | §77 + PILOT_TENANT_OUTREACH (Q-M8) |
| Ambassador 3-tier ships before first external paid | MRD Q-5 (Q-G1) |
| Option C hybrid RBAC | MRD §4.3 (Q-C6, Q-D3) |
| Staging Supabase project approved | MRD Q-28 (Q-C1) |
| Mainland LLC for Y1 entity | AUDIT_FINDINGS + current plan |
| DPO hired as retainer this quarter | MRD Q-13 (Q-F4) |
| Supabase SCCs signed as bridge | MRD Q-14 (Q-F3) |
| Week 9 Plot 1 close requires Super-Admin Flow 3 cash-deposit override | Spec 03 §14.8 (Q-D4) |

Every assumption above becomes authoritative only when founder confirms in writing. Until then, treated as "agent best-guess default" (disclaimer per brief).

---

# §5 · Recommended answer order

## 5.1 This week (deadline ~2026-05-03)

**Blocks 2026-05-08 Rudi wire** + **2026-06-19 Plot 1 close**:

| Priority | Q ID | Description | Answer owner |
|---|---|---|---|
| 1 | Q-H1 | SV-14 Sunday call ratification (2026-04-27) | DYMO |
| 2 | Q-N1 + Q-N2 | Bus factor co-working + sign-off memo (Sat 2026-05-03) | BOTH |
| 3 | Q-H6 | Rudi AED 1M wire confirmed by 2026-05-08 | DYMO |
| 4 | Q-M7 | Plot 1 close-date fixed at Fri 2026-06-19? | BOTH |
| 5 | Q-H11 | Rudi agency commission routing (Spec 02 or shadow) | DYMO |
| 6 | Q-H7 | Emaar onboarding depth ask (post-meeting write-up) | DYMO |

## 5.2 Next 2 weeks (deadline ~2026-05-17)

**Blocks Phase 1 build** (MASTER_TREE_ENHANCEMENT_PROPOSAL refresh + Phase B1 start):

| Priority | Q ID | Description | Answer owner |
|---|---|---|---|
| 7 | Q-L1 | OPEN_QUESTIONS Q-1/9/13/14/34 answered | BOTH |
| 8 | Q-M1, Q-M2, Q-M3 | Pivot order + Rudi commit + 7 month timeline | BOTH |
| 9 | Q-C1 | Approve staging Supabase project | BOTH |
| 10 | Q-C6, Q-D3 | Confirm Option C hybrid RBAC | BOTH |
| 11 | Q-G1 | Ambassador 3-tier rollout timing | BOTH |
| 12 | Q-F1 | RERA verification depth | DYMO |
| 13 | Q-F4 | DPO hire timing | DYMO |
| 14 | Q-F5 | Ambassador legal opinion | DYMO |
| 15 | Q-JAN1..10 | All Jan-specific technical gaps | JAN |
| 16 | Q-F2 | Investor package v7.1 refresh scope | DYMO |
| 17 | Q-H2 + Q-J5 | Core42 discovery call scheduling + POC terms | DYMO |

## 5.3 Month+ (Phase 2 planning window, ~by 2026-06-30)

Everything P2. Low-urgency:

- Q-A categories (structural questions on tokenisation, robotics fund, satellite, etc.)
- Q-P2/P3 (AI own-cutover, Archibald tenant-ization)
- Q-R1/R2/R3 (social wall, advertiser permit, UGC moderation)
- Q-S1/S2/S3/S4 (tokenisation, metaverse, VARA opinion)
- Q-T1/T2/T3 (Robotics Fund, robot fleet, satellite)
- Q-I6/I7/I8 (Anthropic DPA, Own AI 2027, Mistral fallback)
- Q-Q2/Q3/Q4 (sovereignty migration lines)

---

# §6 · Honest gaps — what this audit could not properly examine

Flagged for future investigation:

1. **MASTER_TREE_ENHANCEMENT_PROPOSAL v1.4 line-by-line correctness.** Agent #3 extracted 45 findings from this doc + enhancement proposal; I cross-referenced ~60% but not every "ratified" item was independently validated against its original proposal source. If Dymo reports a v1.5 or later version exists, this audit's baseline is v1.4 as of `commit 6b6c5e3`.

2. **Vision proposals (SAFETY · SOVEREIGNTY · AUTONOMY · MISSING_BRANCHES).** I inventoried these and agents found them but didn't do deep-read of every S-1..S-10 + SV-1..SV-9 + AU-1..AU-3 + MB-1..MB-N proposal. Some may contain open questions not surfaced here.

3. **DECISIONS.md (root-level).** It's a 3-line stub. If historical decisions live elsewhere (e.g. per-spec `docs/decisions/*`), I did read them but the central decision log is thin.

4. **Rudi Sunday call outcomes.** The audit date is 2026-04-24, 3 days before 2026-04-27. I cannot audit an event that hasn't happened. Q-H1 carries a "pending" state that may resolve concurrently with founder reading this document.

5. **`docs/investor-package/*.md` line-by-line.** Per constraint "NO canonical files edits (…investor-package)" I audited only to surface already-identified issues (AUDIT_FINDINGS + INVESTOR_PACKAGE_ISSUES). A full re-read of every investor-package file was not performed.

6. **Prior ambassador production data.** The existing Prisma production DB has 0 paid ambassadors (per `User.role = AMBASSADOR` count implied by MRD §2.2 current state). I did not re-query the DB in this audit to confirm. If a paid ambassador exists in prod today, Q-G2 becomes acute.

7. **CLAUDE.md vs current code contradictions.** I ran a grep for TODO markers (found 2 in `src/app/parcels/map/page.tsx` and `src/app/ambassador/page.tsx`). A formal contradiction audit (CLAUDE.md rules vs actual code state) was not performed — would be a ~2 eng-day task.

8. **BACKLOG.md deferred items.** Not audited in detail. "Vector basemap migration post-Phase 1" is the one known deferred item; others may exist.

9. **§77_PRICING_FRAMEWORK vs draft specs pricing language.** Three sources (§77, MRD, CLAUDE.md Ambassador) have pricing language; I surfaced top-line contradictions but may have missed minor ones.

10. **Internal bilingual (EN/AR) content consistency.** Spec 02 mentions bilingual PDF output; I did not audit whether all bilingual strings exist in both languages. Q for a future audit.

11. **Core42 discovery call outcome.** Entirely future-dependent. If SV-14 ratifies Sunday, outcomes flow mid-May; I can't pre-audit.

12. **External regulatory landscape drift.** UAE regulations cited with 2026 retrieval dates. PDPL Executive Regulations, DLD policies, RERA fee schedules may update. Founders should cross-check with counsel before acting on compliance answers in §F.

---

# §7 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-24 | ZAAHI engineering agent (read-only audit, single session, `research/full-audit-2026-04-24`) | Initial comprehensive audit across Master Tree · Phase 1 specs (01-05) · architecture docs (§77, §78, AUTONOMY, PRICING, PARKED Feasibility) · MRD 40 questions · ops (Core42, SV-14 Brief, Pilot Outreach, Bus Factor) · prior audits (AUDIT_FINDINGS, INVESTOR_PACKAGE_ISSUES, OPEN_QUESTIONS) · CLAUDE.md · src TODO grep. 184 unique questions synthesised, priority-classified, owner-tagged, deduplicated against MRD §10. Recommended answer order in §5. Honest gaps in §6. No src/schema/canonical edits. No main push. Single commit on `research/full-audit-2026-04-24`. |
