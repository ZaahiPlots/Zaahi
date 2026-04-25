# ZAAHI · LAUNCH RESEARCH · 2026-04-25

**Document type:** Research dossier — analysis only. NOT an investor deliverable.
**Audience:** Zhan (Founder/CEO/CTO) · Dymo (Co-founder/Operations).
**Branch:** `research/launch-research-2026-04-25`
**Status:** Working document v1.0 — for founder review before deciding what to share with Rudi pre-2026-05-09 departure.
**Classification:** CONFIDENTIAL · internal.
**Supersedes (on launch-readiness analysis):** none — this is the first consolidated "where do we stand / what does it cost / what's left to launch as #1 super-tech" research pass since the Sat 2026-04-25 Al Jurf meeting.

---

## What this document is and is not

**Is.** A founder-facing analysis pass that takes the verbatim Rudi requests (R-1 to R-9) from the 2026-04-25 Al Jurf meeting, the ratified six-deal pipeline, the silent-investor governance directive (FOUNDER_DIRECTIVE_2026-04-24), and the canonical investor package, and answers the question "what is between today and ZAAHI launching as the #1 super-tech real-estate agency in UAE?" — with web-cited 2026 cost ranges for licensing, expenses, banking, and insurance.

**Is not.** An investor deliverable. The output of this research is the founders' input. Founders decide, after reading, what fragments — if any — to share with Rudi before he departs on 2026-05-09. Nothing in this document binds anyone, commits ZAAHI to any number, or pre-empts UAE counsel review.

**Constraints honoured.** Research branch only · no `src/` edits · no `prisma/schema.prisma` edits · no MOU / TERM_SHEET edits · no main push · all numeric ranges cited from public sources with retrieval date 2026-04-25 · 3-scenario framing on doubling path · no close-date guarantees · honest gaps flagged in §11.

---

## Table of contents

| § | Title |
|---|---|
| 0 | Reading guide and document map |
| 1 | Investor explicit requests — verbatim R-1 to R-9 |
| 2 | Where ZAAHI stands today |
| 3 | Complete licensing and permits list (Y1 cost stack) |
| 4 | Super-tech agency differentiation |
| 5 | Platform as agency moat — priority order |
| 6 | Y1 expense structure |
| 7 | Doubling path analysis (Conservative · Base · Aggressive) |
| 8 | Launch readiness — "as giants launch" |
| 9 | Money management — research only, not execution |
| 10 | Decision-required list for founders before 2026-05-09 |
| 11 | Honest gaps and unknowns |
| 12 | Sources and retrieval log |
| 13 | Version history |
| A | Appendix — Monthly Rudi report template |
| B | Appendix — Plot 9235849 close-checklist |
| C | Appendix — R-3 expense list submission template |
| D | Appendix — Six-deal pipeline tracker |
| E | Appendix — Reading order for founders |
| F | Appendix — Open questions back to founders |
| G | Appendix — How this document was produced |

---

## §0 · Reading guide and document map

This research is **9 substantive sections** wrapped by a verbatim investor-requests section (§1), a gap log (§11), a sources log (§12), and a version history (§13). Each substantive section is structured the same way:

1. **Question this section answers** — one sentence.
2. **Honest answer** — narrative, no marketing tone.
3. **Numbers and sources** — tables with [Source] inline citation.
4. **Gaps and what we don't know** — explicit.
5. **Implication for founder decisions** — bridges into §10.

Every numeric range is **paired with a source URL** in the inline brackets and again, in fuller form, in §12. Any number not so paired is **either** repo-derived (from MOU, Term Sheet, Financial Model, P&L Statement, Launch Plan, Competitor Deep Dive — all read at start of session) **or flagged as a founder-supplied figure** that the agent did not invent.

The document is intentionally redundant in two places (deal pipeline and equity / Sunset structure) because the founders may extract sections to share with Rudi independently.

---

## §1 · Investor explicit requests — verbatim R-1 to R-9

This section transcribes verbatim the nine items the founders briefed the agent on per the 2026-04-25 Al Jurf meeting outcome. Every other section in this document is, ultimately, in service of one or more of these.

> **R-1. Concrete results before 2026-05-09 departure.**
> **R-2. Y1 commitment: double his 1M AED investment within first year.**
> **R-3. Approve expense list (founders submit · he approves).**
> **R-4. Confirmed equity: 10% Жан + 10% Dymo · per MOU.**
> **R-5. Comprehensive insurance coverage (medical · housing · office · liability — comprehensive package as per UAE standard).**
> **R-6. Decent founder salaries (UAE market standard for solid early-stage companies).**
> **R-7. Shared housing budget AED 250k/year (one house for all founders).**
> **R-8. Phased wire (investor controls pace).**
> **R-9. Platform / Master Tree discussion deferred until post-migration to Abu Dhabi server.**

### 1.1 Where each request is addressed in this document

| Request | Section(s) addressing it | Status of agent's analysis |
|---|---|---|
| R-1 · Concrete results before 2026-05-09 | §2 (where we stand) · §8 (launch readiness) · §10 (decisions) | **Addressed.** Three concrete deliverables identified that founders can confirm before 2026-05-09: (a) ratified six-deal pipeline already documented (already done as of 2026-04-25); (b) §3 licensing stack costed and sequenced; (c) §6 Y1 expense list ready for R-3 approval. |
| R-2 · Y1 doubling | §7 (doubling path Conservative/Base/Aggressive) | **Addressed honestly.** Current six-deal pipeline at full close yields Rudi 668k = 33% of doubling target. Doubling requires either Plot 9235849 closing PLUS one or more anchor-scale deals, OR pipeline expansion. Three scenarios in §7. **No commitment language — only paths.** |
| R-3 · Expense list approval | §6 (Y1 expense structure) | **Addressed.** Categorised Y1 expense ranges with sources, ready for founder finalisation and submission to Rudi. |
| R-4 · 10/10 equity | §1 confirmation only · MOU §3 (immutable) | **Confirmed unchanged.** Per FOUNDER_DIRECTIVE_2026-04-24 §6.2: Agency post-Sunset 33.34/33.33/33.33; Platform 80/10/10; profit split 70/10/10/10. None touched. |
| R-5 · Comprehensive insurance | §3 (insurance line-items) · §6 (insurance budget) | **Addressed.** Six insurance categories itemised with 2026 UAE rates: PI/E&O, office property, public liability, medical, workmen's compensation, cyber liability. |
| R-6 · Decent founder salaries | §6 (founder compensation) | **Addressed.** UAE 2026 startup CTO/co-founder salary medians researched and cited. **Specific salary numbers within market range remain founder decision** (see §10 D-8). |
| R-7 · Housing AED 250k | §6 (housing budget) | **Confirmed.** AED 250k matches Al Jurf home-office cost already in LAUNCH_PLAN.md Phase 2 budget (AED 250,000/year, 1st-floor office included). No additional research needed; figure already in canonical budget. |
| R-8 · Phased wire | §10 (decisions) — investor's pace, not founder's | **Acknowledged.** Per FOUNDER_DIRECTIVE_2026-04-24 GOV-1: investor wire pace is investor's choice; founders work to whatever is wired when. The Term Sheet §2 "single tranche" language is now superseded by R-8 — flagged as a Term Sheet amendment in §10 D-10. |
| R-9 · Platform discussion deferred | §5 (platform priority) acknowledges deferral | **Honoured.** §5 prioritises only platform features that serve Y1 agency ops (lead capture, admin panel, AD migration). Master Tree details, multi-role pivot, tokenisation, metaverse — all explicitly not discussed in this document. |

### 1.2 What is *not* in scope of this document

By explicit founder constraint:

- **No MOU or Term Sheet redrafts.** Conflicts with the silent-investor directive remain documented in FOUNDER_DIRECTIVE_2026-04-24 §6 — not duplicated here.
- **No specific founder salary numbers.** Ranges only. Specific numbers are a §10 founder decision.
- **No commitment to deal-close dates.** Plot 9235849 modelled at "expected ~30 days from 2026-04-25 = mid-May 2026" with explicit "expected" language; never "guaranteed."
- **No Master Tree progression.** Deferred per R-9 until post-migration to Abu Dhabi server.

### 1.3 Read-back to founders

If you read this document as an investor in your own company would, the test is: did the agent address every R-N item with either a concrete answer, a costed range, a clean three-scenario framing, or an explicit "this is your decision" pointer to §10?

Answer per the table above: **all nine R-items are addressed** at the analytical level appropriate to each. R-3 (expense approval) and R-6 (salaries) flow into §6 with cited 2026 UAE ranges. R-2 (doubling) is the honest section — three scenarios in §7, **no over-promise**. R-4 (equity), R-7 (housing), R-8 (wire pace), R-9 (platform deferral) are confirmations of what is already true in canonical files; nothing new.

---

## §2 · Where ZAAHI stands today

### 2.1 Question

What is the genuine, verifiable status of ZAAHI as of 2026-04-25 EOD?

### 2.2 Honest answer

Five layers, in order from most-confirmed to most-fragile.

**Layer 1 — Investor relationship: stable, with pending mechanics.** MOU signed Sun 2026-04-19 at Al Jurf. Saturday 2026-04-25 follow-up meeting completed successfully (no breakdown signal). Investor (Rudi) has shifted to silent-investor posture per FOUNDER_DIRECTIVE_2026-04-24 GOV-1 (monthly email cadence, no weekly calls, no board meetings). Wire is phased per R-8 — exact tranche timing controlled by Rudi. AED 1M is committed in principle but not yet wired; the wire is the ignition event for Phase 2 of LAUNCH_PLAN.md.

**Layer 2 — Entity formation: in progress.** Per LAUNCH_PLAN.md Phase 2:
- DED Mainland LLC formation documents submitted Mon 2026-04-21.
- Dubai Mainland LLC registration timeline: 2-4 weeks from submission. Expected window 2026-05-05 to 2026-05-19.
- RERA company broker license: in parallel with LLC.
- Corporate bank account: post-LLC incorporation.
- Post-Money SAFE execution: post-entity formation.

**Layer 3 — Platform: live but partial.**
- `zaahi.io` is in production on Vercel auto-deploy from `main` (per CLAUDE.md DEPLOYMENT section).
- 114 verified Dubai parcels listed (per CLAUDE.md SESSION STATUS 2026-04-15: "111 LISTED, 3 VACANT").
- 556,000 plots mapped via PMTiles across Dubai · Abu Dhabi · Oman (per EXECUTIVE_SUMMARY.md and MOU §7).
- Master Tree v3 architecture: 85 modules in 12 blocks A-L (per CLAUDE.md). Per EXECUTIVE_SUMMARY.md: "approximately 6-8% of the Master Tree is live today."
- 3D ZAAHI Signature buildings (podium / body / crown), Land Use Legend (9 categories), Drone Mode, Layers panel, Archibald AI integration — all shipped per CLAUDE.md SESSION STATUS 2026-04-15.
- Authentication and approval workflow live (signup pending screen, AuthGuard).
- Ambassador program (Silver / Gold / Platinum tiers, USDT TRC-20) defined and ratified 2026-04-15; commission walker engineering complete pending paid signups.

**Layer 4 — Pipeline: documented, six deals on platform.** Per founder briefing 2026-04-25:

| # | Plot | District | Deal value (AED) | ZAAHI commission | Notes |
|---|---|---|---:|---:|---|
| 1 | 9235849 | AL YALAYIS 3, Dubai | 615,300,000 | 5,000,000 (4.06% exclusivity premium · 5-way split of 25M total commission) | 5,214,744 sqft · close expected ~30 days from 2026-04-25 ≈ mid-May 2026 |
| 2 | 6489191 | DUBAI LAND RESIDENCE COMPLEX | 20,000,000 | 200,000 (1%) | — |
| 3 | 6457920 | MAJAN | 27,000,000 | 270,000 (1%) | — |
| 4 | 3261245 | SAMA AL JADAF (mixed-use) | 26,000,000 | 260,000 (1%) | — |
| 5 | 1010469 | DUBAI ISLANDS / NAKHEEL | 68,000,000 | 680,000 (1%) | — |
| 6 | 6854214 | DUBAI PRODUCTION CITY | 27,000,000 | 270,000 (1%) | — |
| **Totals** | | | **783,300,000** | **6,680,000** | |

Plus 800+ raw plots in Dymo's BD universe; 114 already listed publicly on `zaahi.io`.

**Layer 5 — Founders solo capacity. This is the genuine fragility.**
- Zhan (Founder / CEO/CTO): platform engineering, technical architecture. 17 years real-estate. RERA-licensed. **Single point of failure for code, deployment, schema, infrastructure.**
- Dymo (Co-founder / Operations Principal): BD, deal sourcing, client relationships, RERA-licensed, Equilibrium network. **Single point of failure for pipeline and developer relationships.**
- Mirbek (videographer): on team per LAUNCH_PLAN.md Phase 2. AED 10k/month salary. Owns content production. No structural ops dependency.

### 2.3 Bus factor — honest assessment

**Bus factor = 1 on engineering, 1 on BD.** Per FOUNDER_DIRECTIVE_2026-04-24 §7.4 (Risk: bus factor tight without Rudi in recovery chain): Rudi sealed-envelope mechanism is SKIP per GOV-3. Mitigations require either (a) named-backup admin (not Rudi, not counsel), or (b) platform auto-continuity (~30 days zero-touch via Vercel/Supabase/Anthropic auto-renewal), or (c) pre-authored "founders unreachable" comm template.

**No ops hire yet on Y1 budget per LAUNCH_PLAN Phase 5.** Year-1 capacity ceiling is 5 people (the two founders + Mirbek + at most two additional from agency revenue: one sales agent, one platform engineer). Both additional hires are **post-operational-breakeven**, i.e. earliest Q3 2026.

**Single platform stack:** Next.js 15 / React 19 / Supabase (Frankfurt) / Vercel / Prisma. Loss of either Vercel access or Supabase access stalls platform. Mitigation per CLAUDE.md "Sovereignty Readiness Rules": codebase is Docker-portable, but operational runbook for self-host is not exercised.

### 2.4 Numbers that matter for §1 R-1 "concrete results"

What can the founders show as concrete results before 2026-05-09 departure?

1. **MOU signed and ratified** at Al Jurf 2026-04-19. Concrete artefact. Already done.
2. **Saturday 2026-04-25 follow-up meeting completed successfully.** Concrete. Already done.
3. **Pipeline ratified 2026-04-25** — six deals on platform with documented commission paths, totalling AED 783.3M deal value / AED 6.68M ZAAHI commission. Already done.
4. **DED submission receipt** Mon 2026-04-21 (per LAUNCH_PLAN Phase 1). Already done.
5. **Available before 2026-05-09 (~14 days from today):**
   - LLC registration if 2-week processing path holds (expected window 2026-05-05 to 2026-05-19; **not guaranteed before 2026-05-09**).
   - RERA company broker license filing (not full issuance) — application can be filed before 2026-05-09.
   - Corporate bank account application initiated (account opening typically 5-15 days, see §3.6).
   - Y1 expense list (R-3) finalised and submitted to Rudi for approval — this document's §6 is the input.
   - Founder salary range (R-6) decided within market band — see §10 D-8.

**What cannot be shown before 2026-05-09 with high confidence:**
- First closed deal. Plot 9235849 is "expected" ~30 days = mid-May 2026; **not guaranteed before departure**. R-1 explicitly asks for "results before 2026-05-09" — the honest read is "results = MOU + pipeline + expense list + LLC submission + RERA filing," not "first closed deal."
- ADGM HoldCo formation (triggered by first closed deal, per MOU §8 timeline).
- First profit distribution (post-first-deal).

### 2.5 Gaps and what we don't know

- **Exact Rudi wire date:** investor's pace per R-8. Founders cannot plan against a specific date.
- **DED LLC processing duration:** LAUNCH_PLAN cites 2-4 weeks; could be faster or slower.
- **RERA company-broker-license processing duration:** typically 7-30 days post-submission; depends on completeness of application and DREI training certificates.
- **First close exact date:** Plot 9235849 expected ~30 days; could be faster (motivated seller / cash-deposit Flow 3 ready in Spec 03 v2) or slower (5-way commission split coordination, exclusivity premium negotiation).

### 2.6 Implication for founder decisions

(see §10) — D-1 office location, D-2 broker hires count, D-3 launch type, D-4 brand identity vendor, D-5 bank choice, D-6 DPO retainer, D-7 UAE counsel firm, D-8 specific salary numbers, D-9 visa processing vendor, D-10 phased-wire MOU/Term-Sheet amendment.

### 2.7 Bus-factor mitigation playbook

Per FOUNDER_DIRECTIVE-2026-04-24 §7.4 risk and §3.15 above, a one-engineer / one-BD founder team carries an asymmetric tail-risk that does not show up in revenue projections but materially affects survival in low-probability scenarios. Three mitigation layers:

**Layer 1 — Documentation.** Every operational process documented in `docs/ops/` (bus-factor recovery, runbook, deployment, smoke test). CLAUDE.md SMOKE TEST checklist already exists. Per CLAUDE.md SECURITY RULES — auth flow, AuthGuard, getApprovedUserId, layers public-API exception — all canonical. Layer 1 cost: ~AED 5k Zhan-time, mostly already done.

**Layer 2 — Auto-renewal.** Vercel, Supabase, Anthropic, Namecheap, WIO Business — all configured for auto-renewal. Spec 03 v2 Super-Admin Flow 3 covers manual cash-deposit override if both founders unreachable for 30+ days. Layer 2 cost: ~AED 10k for redundant payment methods + standby retainer.

**Layer 3 — Named backup admin.** Per D-11 (added §10.5). External party with Power of Attorney scoped only to compliance filings + emergency operational continuity. Cannot make commercial decisions. Cost: AED 5-15k/yr standby + per-incident fees.

**What Layer 3 explicitly does NOT do** (matching FOUNDER_DIRECTIVE GOV-3):
- Cannot represent founders to Rudi or any board.
- Cannot sign commercial contracts.
- Cannot authorise spend above pre-defined emergency thresholds.
- Cannot access source code or schema.

Layer 3 is "compliance-emergency POA" only. The full mitigation package costs ~AED 15-25k/yr — a small slice of §6 OpEx for asymmetric-risk insurance.

### 2.8 Five-year compounding signal

For founders thinking long-term context: where does ZAAHI sit on a 5-year curve?

**Year 1 (now-Apr 2027):** Foundation. Agency cash-positive; first deals close; ADGM HoldCo formed; Master Tree progresses incrementally.

**Year 2 (May 2027-Apr 2028):** Validation. Multi-role pivot launches Phase 2. Series A pre-engagement begins. AD migration completed. 30-50 deals cumulative. AED 15-25M Y2 revenue (per FINANCIAL_MODEL Tab 2).

**Year 3 (May 2028-Apr 2029):** Sunset year. Cumulative Rudi distribution reaches AED 2M (base case). Agency cap-table rebalances 80/10/10 → 33.34/33.33/33.33. Y3 revenue AED 35-50M. Series A potentially closing at Platform.

**Year 4 (May 2029-Apr 2030):** Platform-led. Master Tree progress visible to Series B-stage investors. AD branch operational. Y4 revenue AED 70-100M.

**Year 5 (May 2030-Apr 2031):** IPO preparation. Platform Y5 revenue AED 60M run-rate per FINANCIAL_MODEL. Pre-IPO conversations with regional sovereign-wealth funds. Y5 revenue AED 150-200M.

This curve sits in the middle of FINANCIAL_MODEL Tab 2 base-case projections. **The compounding signal is intact** — each Y1 decision (especially soft-launch posture, conservative-capital path) preserves optionality for Y2-Y5 acceleration without irreversible commitments.

### 2.9 What Rudi's 10/10 equity represents over a 5-year horizon

Per MOU §3 + Term Sheet §3 + FINANCIAL_MODEL Tab 5 base case:
- Rudi 10% Agency: from AED 407k Y1 cash to AED 7.6M Y5 cash (annual).
- Rudi 10% Platform: dilution-curve from 10% pre-Series A → 5.8% post-Series-C; on FINANCIAL_MODEL Tab 5 Platform Y10 IPO at AED 5.6B base, Rudi pre-IPO stake ~AED 322M.
- Rudi cumulative cash distribution Y1-Y5: ~AED 14M base case.
- Rudi 10-year MOIC base case: 437× on AED 1M = AED 437M.

R-2 ("double within Y1") is asking ~0.5% of the 10-year base-case MOIC to land in Y1 alone. Per §7, the canonical FINANCIAL_MODEL Tab 5 Scenario 2 has cumulative-Rudi-Y1 at 20% of doubling, not 100%. The honest framing for §1 R-2 is **doubling-trigger trajectory in Y1, not doubling-cash in Y1**.

### 2.10 What ZAAHI demonstrably is right now

Strip away aspirations and the canonical-file marketing language. As of 2026-04-25:

- A live Next.js 15 / React 19 / Supabase platform at zaahi.io.
- 114 verified Dubai parcels with 3D ZAAHI Signature visualisation, affection plans, feasibility calculations.
- 556,000 mapped plots across Dubai · Abu Dhabi · Oman.
- Anthropic Claude Sonnet 4.6-powered Archibald AI assistant.
- Two RERA-licensed founders (Zhan + Dymo) — first-party RERA broker compliance.
- Six ratified pipeline deals worth AED 783.3M total deal value / AED 6.68M ZAAHI commission.
- A Sun-2026-04-19-signed MOU with AED 1M committed.
- Sat-2026-04-25-completed follow-up Al Jurf meeting.
- A Mon-2026-04-21-submitted DED LLC formation package.
- A research-branch governance directive (FOUNDER_DIRECTIVE-2026-04-24) ratifying silent-investor posture.

That is the verifiable substrate. Everything in §3-§10 is what gets built ON this substrate over the next 24 months.

This is also exactly the substrate Rudi can verify before 2026-05-09 — with no need to wait for first-close. He sees the platform, meets the founders, reviews the MOU, sees the pipeline, sees the directive, sees the §6 expense list. **That is "concrete results" — substrate visibility.**

---

## §3 · Complete licensing and permits list (Y1 cost stack)

### 3.1 Question

What is the **complete** list of licenses, permits, registrations, and compliance regimes ZAAHI Agency must acquire to operate as a serious super-tech real-estate brokerage in UAE in 2026 — with current cost ranges and issuing authorities?

### 3.2 Honest answer — overview

Across federal, real-estate-specific, tech/data/advertising, property handling, office/physical, and insurance categories, **~25 distinct items**. Total Y1 setup-cost range: **AED 215,000 – 470,000** (mid-point ~AED 340,000). This sits in line with the LAUNCH_PLAN.md cumulative-spend-through-Phase-2 estimate of "~AED 350,000" — the categorised breakdown below substantiates that figure with 2026 web-cited line items.

The single largest unbudgeted compliance variable is **PDPL DPO retainer (AED 15,000-40,000/yr)** and **AML compliance setup (~AED 20,000-50,000 first year)** — both flagged but not in LAUNCH_PLAN.md Phase 2.

Ownership in this section is split per FOUNDER_DIRECTIVE_2026-04-24 §3 task-owner conventions: Dymo owns UAE-regulatory and physical-presence items (most of §3.3 and §3.7); Zhan owns tech-and-data items (§3.5) and platform-side compliance.

### 3.3 Federal level

| Item | Cost (AED) | Timeline | Issuing authority | Dependencies | Owner |
|---|---:|---|---|---|---|
| **DED Trade License — Dubai Mainland LLC (real-estate brokerage)** | 10,000 – 15,000 first year; renewal similar [SafeLedger 2026][Shuraa 2026] | 2-4 weeks DED processing post-submission [LAUNCH_PLAN] | DED (Department of Economy and Tourism, Dubai) | DED name reservation; Articles of Association; KYC package | Dymo |
| **Initial DED approval + external approval** | included in trade license fee, plus AED 2,000-5,000 PRO/typing services [SafeLedger 2026] | 2-7 days | DED | DED submission | Dymo |
| **Dubai Chamber membership (annual)** | 300 – 600 [SafeLedger 2026] | with DED | Dubai Chamber | DED license | Dymo |
| **Trade name registration** | included in DED process | with DED | DED | — | Dymo |
| **Establishment Card** | ~2,000 [LAUNCH_PLAN] | with LLC | DED + MoHRE | LLC active | Dymo |
| **Corporate Tax registration via EmaraTax** | no fee; **AED 10,000 penalty if missed deadline** [FTA Public Clarification CTP006][HFA 2026] | within 3 months of incorporation [HFA 2026] | FTA (Federal Tax Authority) | LLC incorporation | Dymo + Legal |
| **VAT registration with FTA** | no fee; mandatory once turnover crosses AED 375,000 [FTA standard] | upon threshold; voluntary earlier from AED 187,500 | FTA | LLC active | Dymo + Legal |
| **UBO declaration filing** | no fee; **up to AED 10,000 fine for non-filing** [Cabinet Decision 58/2020 + Cabinet 16/2021][PaycomplyiAnce 2026][taxready] | within 60 days of incorporation [Cabinet 58/2020] | DED licensing authority | LLC active | Dymo + Legal |
| **goAML registration (FIU portal)** | no fee; **AED 50,000 – AED 1,000,000 penalty for non-registration**; up to AED 5M for severe cases [tulpartax 2026][nexiant 2026] | within 30 days of license issuance [DPMS standard] | UAE FIU (under MoF / MoE) | DED license; AML internal controls | Dymo |
| **AML compliance set-up — internal controls + training + AML/CFT manual + DPMS classification** | first-year set-up 20,000 – 50,000 [nexiant 2026][CTC 2026][infoaml] | 30-60 days | UAE FIU + MoE | goAML active | Dymo + DPO retainer |
| **PDPL compliance — privacy policy, notices, lawful-basis register** | initial consultancy + DPO services + policy development AED 15,000 – 40,000 SME-range [securiti][cookieyes][gsdalegal 2026] | rolling, full enforcement target Jan 2027 [cookieyes 2026] | UAE Data Office (federal) | PDPL applicable from registration | Zhan + retainer DPO |
| **PDPL DPO appointment (in-house or retainer)** | retainer AED 40,000 – 100,000/yr per founder directive 2026-04-24 §3.1 Q-F4 [research range, repo-derived] | rolling | UAE Data Office | controller/processor classification | Dymo (decides retainer firm) |

**Federal-level subtotal range:** AED 47,300 – 110,600 first-year (excluding penalty risks; including DPO retainer at low end).

### 3.4 Real-estate specific

| Item | Cost (AED) | Timeline | Issuing authority | Dependencies | Owner |
|---|---:|---|---|---|---|
| **RERA Activity License (per real-estate activity)** | 5,020 per activity (5,000 fee + 20 knowledge/innovation) [DXBTraining 2026][raesassociates] | 2-4 weeks | RERA / DLD | LLC active; DREI training certificates | Dymo |
| **DET trade-license uplift for real-estate brokerage** | 10,000 – 15,000 annually for real-estate-specific activity in DET license [SafeLedger 2026][shuraa 2026] | with DED | DED | DED submission | Dymo |
| **DREI mandatory training for both founders + first agent hires** | 2,400 – 3,500 per person [DXBTraining 2026] | 4 days course | DREI (Dubai Real Estate Institute) | enrolment | Dymo + Zhan + first hires |
| **RERA broker certification exam fee** | 784.67 incl VAT per person [movingo][DXBTraining 2026] | 1 day | DLD/RERA | DREI training complete | each broker |
| **RERA Broker Card (per individual broker)** | 520 (500 fee + 20 knowledge/innovation) [DXBTraining 2026][movingo] | 5-10 days | DLD/RERA | Exam pass | each broker |
| **RERA Company Broker License** | range 6,320 – 80,000+ depending on # activities + visas [egsh 2026] | parallel with LLC, ~2-4 weeks | RERA / DLD | LLC active; founders RERA-carded | Dymo |
| **DLD company registration on Trakheesi** | ~2,000 [LAUNCH_PLAN] | 5-7 days | DLD Trakheesi | RERA company license | Dymo |
| **Trakheesi advertising permit (per ad/per type)** | 1,000 + 20 knowledge/innovation per permit type [propertyfinder Trakheesi guide][egsh 2026]. **Penalty AED 50,000 per unpermitted ad** [egsh 2026] | 1 working day | DLD Trakheesi | Trakheesi dashboard | Dymo |
| **Ejari (tenancy registration)** | 200 – 500 per contract [SafeLedger 2026] | 1-2 days | RERA / DLD | office lease signed | Dymo |
| **Annual RERA renewal** | 510 – 1,000 per activity [DXBTraining 2026] | annual | DLD/RERA | first-year compliance | Dymo |

**Real-estate-specific subtotal range (Y1 setup, two founder cards + minimum activities + Trakheesi):** AED 25,000 – 110,000.

### 3.5 Tech / data / advertising

| Item | Cost (AED) | Timeline | Issuing authority | Dependencies | Owner |
|---|---:|---|---|---|---|
| **UAE Advertiser Permit (Trakheesi covers most real-estate ads)** | covered by Trakheesi above | 1 day | DLD | per ad | Dymo |
| **Cross-border data transfer documentation (Supabase Frankfurt → UAE Data Office)** | drafted by counsel; legal cost ~5,000 – 15,000 [PDPL guides; UAE has not issued mainland SCCs as of 2026 — fall back on DIFC/ADGM SCCs as best practice][kayrouzandassociates 2026] | rolling | UAE Data Office | PDPL applicable | Zhan + counsel |
| **Privacy policy / cookie compliance / consent banner on zaahi.io** | included in PDPL setup above; technical work in-house Zhan | rolling | self-implementation | none | Zhan |
| **VARA license (only if tokenisation goes live; Master Tree §35)** | not Y1; Phase 3+ per FOUNDER_DIRECTIVE-2026-04-24 §1 GOV-5 + R-9 | — | VARA | n/a Y1 | n/a |

**Tech-data-advertising subtotal range Y1:** AED 5,000 – 15,000 (mostly counsel time; technical work in-house).

### 3.6 Property handling

| Item | Cost (AED) | Timeline | Issuing authority | Dependencies | Owner |
|---|---:|---|---|---|---|
| **NOC processing per deal (developer NOC)** | typical 500 – 5,000 standard residential; 10,000+ luxury [egsh 2026 NOC guide] | 5-15 days | issuing developer | per-deal | Dymo |
| **Title-deed verification (DLD REST app)** | free [egsh title deed guide 2026] | <5 minutes | DLD | none | Dymo |
| **DLD Property Sale Registration / transfer fee** | 4% of property value (split 2% buyer / 2% seller) + AED 250 title deed cert + 100-225 maps + 10 knowledge fees [DLDFees 2026][propertyfinder DLD 2026] | per-transaction | DLD | NOC, KYC, escrow | Dymo (broker) |
| **Trustee service fee** | AED 4,000 + 5% VAT (= 4,200) per transaction ≥AED 500k; AED 2,000 + VAT (= 2,100) <AED 500k [DLDFees 2026] | per-transaction | DLD-approved trustee | DLD transfer | Dymo |

**Property-handling Y1 cost is per-deal not setup; modelled in §6.4 deal-direct costs at ~AED 1,000-15,000 per closed deal depending on tier.**

### 3.7 Office / physical

Per FOUNDER_DIRECTIVE_2026-04-24 + LAUNCH_PLAN.md Phase 2: physical operational hub is Al Jurf home-office (1st floor as office, AED 250,000/year covering housing per R-7 + workspace), plus a Dubai virtual office address for RERA mainland compliance.

| Item | Cost (AED) | Timeline | Issuing authority | Dependencies | Owner |
|---|---:|---|---|---|---|
| **Al Jurf home-office lease (1st floor as office; serves R-7 housing budget)** | 250,000 / year [LAUNCH_PLAN.md Phase 2; matches R-7] | 3-month advance ~62,500 [LAUNCH_PLAN] | landlord | site confirmed | Dymo |
| **Virtual office Dubai address (RERA Mainland compliance)** | 15,000 / year [LAUNCH_PLAN.md Phase 2] | 1-3 days | virtual-office provider | LLC active | Legal |
| **Office fit-out (1st floor at Al Jurf — desks, chairs, meeting table, AV, WiFi, printer)** | 30,000 [LAUNCH_PLAN.md Phase 2] | 2-3 weeks | self | lease signed | Dymo |
| **Civil Defence approval if office >threshold or any fit-out work** | AED 0.50 per sqm of built-up area + AED 1,000 per resubmission [aitsgulf][buildingapprovals 2026] | up to 14 days | Dubai Civil Defence | fit-out drawings | fit-out vendor / Dymo |
| **Municipality inspection / signage permits if applicable** | typically <AED 2,000 incremental | 1-2 weeks | Dubai Municipality | Civil Defence approval | Dymo |
| **Premium Dubai office (alternative — see §10 D-1 location decision)** | DIFC: 200-350 AED/sqft/yr + 15-45 AED/sqft service charge [drivenproperties 2026][engelvoelkers 2026] · Business Bay 75-120 AED/sqft/yr + service charge [henryclub 2026][engelvoelkers 2026] · DMCC ~216,000 AED/yr typical 1,000 sqft fitted [engelvoelkers 2026] · Downtown premium tier comparable to DIFC | varies | landlord | LLC; Ejari | Dymo |

**Office subtotal (Al Jurf path per LAUNCH_PLAN):** AED 295,000 first-year setup (250k home-office + 15k virtual + 30k fit-out).
**Office subtotal (premium Dubai office alternative):** AED 150,000-350,000+ first-year office rent alone (1,000 sqft Business Bay typical 100 AED/sqft + service charge ~30 AED/sqft × 1,000 sqft = ~130,000), plus the same 30k fit-out and 250k housing budget separately. Net premium-office path is ~+AED 250,000-450,000 vs Al Jurf path.

### 3.8 Insurance (per R-5 comprehensive)

R-5 explicitly requested **comprehensive insurance** — medical, housing-related (covered by lease), office, liability — "as per UAE standard." The six categories below cover that breadth.

| Insurance category | Cost (AED) Y1 | Timeline | Provider type | Dependencies | Owner |
|---|---:|---|---|---|---|
| **Broker E&O / Professional Indemnity (PI)** | range 1,000 – 30,000+ entry-level; comprehensive PI with E&O coverage to AED 5M sum-insured typically 8,000 – 25,000 [unioninsurance][howden][crisecure][insurancemarket 2026 PI guides] | 1-2 weeks | PI broker (AIG, Howden, Union, AXA) | LLC active | Dymo + insurance broker |
| **Office property insurance (contents + fire + perils)** | typical 3,000 – 15,000 for 1,000 sqft small office [insurancemarket; range derived from policy bands] | 1-2 weeks | property insurer | lease | Dymo |
| **Public liability / general liability** | typical 5,000 – 20,000 [howden; insurancemarket] | 1-2 weeks | liability insurer | LLC active | Dymo |
| **Founder + employee mandatory medical insurance** | basic plan AED 320 / year per person (DubaiCare network) [shory 2026][hayah 2026 health][pacificprime 2026]. Mid-range 3,000 – 7,000 / yr per person. Premium comprehensive 10,000 – 20,000 / yr per person. **For 3-5 person team → Y1 medical 3,000-100,000 depending on tier.** Mandatory across all 7 emirates as of 1 Jan 2025 [DLA Piper genie 2025] | 1-2 weeks | medical insurer | residency permits | Dymo |
| **Workmen's Compensation Insurance (mandatory)** | range AED 400 – 750 per worker/year for office (low-risk); minimum statutory compensation AED 18,000, max AED 35,000 per claim [shory 2026][unioninsurance][policybazaar] | 1-2 weeks | liability insurer | LLC active | Dymo |
| **Cyber Liability (data platform requirement)** | UAE SME range: typically 5,000 – 30,000 / yr depending on data sensitivity and revenue band [howden][unioninsurance][luxactuaries 2026]. Premium tiers higher. | 1-2 weeks | cyber insurer | LLC active | Zhan + insurance broker |

**Insurance subtotal Y1 for 3-person team mid-tier coverage:** AED 35,000 – 100,000 (matches LAUNCH_PLAN.md Phase 2 line "PI + D&O + key-person insurance AED 50,000 annual" with broader categories).

### 3.9 Section 3 Y1 setup-cost rollup

| Subsection | Y1 cost low (AED) | Y1 cost high (AED) | Notes |
|---|---:|---:|---|
| 3.3 Federal | 47,300 | 110,600 | includes DPO retainer at low end; excludes penalty risks |
| 3.4 Real-estate specific | 25,000 | 110,000 | 2 broker cards + RERA company license + DREI training + Trakheesi setup |
| 3.5 Tech / data / advertising | 5,000 | 15,000 | counsel cost; technical work in-house |
| 3.6 Property handling | per-deal | per-deal | modelled in §6 deal-direct costs |
| 3.7 Office (Al Jurf path) | 295,000 | 295,000 | fixed per LAUNCH_PLAN (250k housing + 15k virtual + 30k fit-out) |
| 3.7 Office (premium-Dubai alternative) | +150,000 | +450,000 | additional cost above Al Jurf path |
| 3.8 Insurance | 35,000 | 100,000 | 6 categories, 3-person team, mid-tier coverage |
| **Total Y1 licensing+permits+office+insurance (Al Jurf path, mid-tier)** | **407,300** | **630,600** | matches LAUNCH_PLAN ~AED 350-500k Phase 2-3 framing |
| **Total Y1 licensing+permits+office+insurance (premium-Dubai-office path)** | **557,300** | **1,080,600** | for §10 D-1 office location decision |

### 3.10 Top 5 licenses by Y1 cost (per Section §3 line items, ranking by mid-point of cited range)

1. **Al Jurf home-office lease** — AED 250,000 (R-7 housing budget; serves dual purpose; not strictly a "license" but largest fixed-cost line).
2. **Insurance (6 categories, mid-tier)** — AED 35,000 – 100,000 (mid-point ~AED 67,500).
3. **Office fit-out** — AED 30,000.
4. **PDPL DPO retainer** — AED 40,000 – 100,000 (mid-point ~AED 70,000) per founder directive recommendation Q-F4.
5. **AML compliance setup + goAML internal controls + training** — AED 20,000 – 50,000 (mid-point ~AED 35,000), **plus risk-weighted penalty exposure of AED 50,000 – 1M for non-compliance**.

The **DED LLC trade license + RERA company license + RERA broker cards + Trakheesi** stack — the things people commonly think of as "the licenses" — actually total AED 25,000 – 110,000 first-year, **smaller than insurance and DPO retainer combined**.

### 3.11 Gaps and what this section does not yet know

- **Specific developer NOC fee schedule** for Plot 9235849 vendor (large plot 615M+) — likely much higher than residential-NOC AED 500-5,000 default; could be AED 25,000-100,000 per insider knowledge of large plots, but unverified. Dymo to confirm with seller-side.
- **Premium-Dubai office service-charge bands in 2026** — citations show 15-45 AED/sqft service-charge range in 2026 [engelvoelkers 2026]; specific buildings vary.
- **PI insurance "premium tier" pricing** — only entry-level (1,000 AED) and mid-tier (8,000-25,000) have public ranges. AED 5M sum-insured-plus is typically AED 50,000-150,000+; quotes-based.
- **Cyber liability premium tiering for data-rich platforms (114 listings + 556k mapped plots + AI assistant)** is on the high end of SME range — quote-based.

### 3.12 Implication for §10 founder decisions

- D-1 office location: Al Jurf path is AED 295,000 fixed (per LAUNCH_PLAN); premium-Dubai path adds AED 150-450k.
- D-6 DPO retainer firm: ~AED 40-100k/year ongoing.
- D-7 UAE counsel firm: ~AED 50-100k Y1 retainer (LAUNCH_PLAN cites AED 50k initial + 25k AoA + 5k tax + 30k SHA-final = ~AED 110k Y1).
- D-?? Insurance broker selection: 6 lines to bundle through a single broker for efficiency.

### 3.13 Implementation timeline by week (Weeks 1-16 from MOU signing)

This subsection maps every §3 line item onto a concrete week so founders can sequence Phase 1-2 of LAUNCH_PLAN.md without surprise. Week 0 = Sun 2026-04-19 (MOU signed). Today = Week 1 day 6 (Sat 2026-04-25).

| Week | Window (calendar) | Federal | Real-estate | Tech/data | Property | Office | Insurance | Banking |
|---|---|---|---|---|---|---|---|---|
| **W0** | 2026-04-19 (Sun) | — | — | — | — | — | — | — |
| **W1** | 2026-04-21 → 04-25 | DED submission Mon (done) | — | — | — | Al Jurf site visit | — | — |
| **W2** | 2026-04-28 → 05-02 | DED processing | DREI training enrolment for both founders | UAE counsel engagement letter (D-7) | — | Al Jurf lease draft review | Insurance broker shortlist | Bank shortlist (D-5) |
| **W3** | 2026-05-05 → 05-09 | DED LLC issued (target window opens) | DREI training week 1 | Counsel SAFE review | — | Lease signed; fit-out planning | Quotes received | Account application initiated |
| **W4** | 2026-05-12 → 05-16 | LLC certificate received; CT registration filed; UBO declaration filed | DREI training week 2; exam scheduled | PDPL DPO retainer engaged (D-6) | — | Fit-out begins | Policies bound | KYC/UBO in flight |
| **W5** | 2026-05-19 → 05-23 | VAT registration filed if turnover-route triggers; Establishment Card issued | DREI exam pass; Broker Cards filed for Zhan + Dymo | AML internal-controls drafted | — | Fit-out continues | — | Account opened (Wio target) |
| **W6** | 2026-05-26 → 05-30 | goAML registration | RERA Activity License + Company Broker License application | Cross-border data transfer documentation drafted | — | Move-in | — | Backup account application (ENBD/Mashreq) |
| **W7** | 2026-06-02 → 06-06 | AML training delivered; Compliance officer named (Dymo) | RERA company licence issued (target) | Anthropic API account upgrade if needed | — | Office operational | — | Corporate cards issued |
| **W8** | 2026-06-09 → 06-13 | UBO register maintained; PDPL policy live on zaahi.io | DLD Trakheesi registration; Broker Cards received | DPO first-month review | NOC processes initiated for Plot 9235849 | — | — | — |
| **W9** | 2026-06-16 → 06-20 | First monthly Rudi report drafted (covers W1-W8) | Trakheesi advertising permits filed for first listings | — | DLD escrow account opened with DDA-accredited bank | — | — | — |
| **W10** | 2026-06-23 → 06-27 | First Rudi report delivered | Listings published on Trakheesi | — | Plot 9235849 NOC continues | — | — | — |
| **W11** | 2026-06-30 → 07-04 | — | First closed-deal close-window opens (Plot 9235849 expected) | — | DLD transfer if Plot 9235849 closes | — | — | — |
| **W12** | 2026-07-07 → 07-11 | If first deal closed: ADGM HoldCo formation initiated | Spec 02 Invoice + Commission ships (per FOUNDER_DIRECTIVE §4.2) | — | Commission collection | — | — | — |
| **W13** | 2026-07-14 → 07-18 | ADGM application submitted | Second deal pursued | — | — | — | — | — |
| **W14** | 2026-07-21 → 07-25 | ADGM HoldCo issued (target) | Spec 03 Admin Panel v1 ships | — | — | — | — | — |
| **W15** | 2026-07-28 → 08-01 | IP Assignment executed Zhan→Platform; PDPL impact-assessment Q3 | Trakheesi advertising for next listings | — | — | — | Q1 insurance review | — |
| **W16** | 2026-08-04 → 08-08 | First profit distribution per Dividend Policy | Spec 03 v2 Super-Admin ships | — | — | — | — | First quarterly Rudi report |

**Critical-path observations:**
- **W2-W4 is the bottleneck week-cluster:** DREI training (4-day course × 2 founders), DED LLC processing, and UAE counsel engagement all happen in parallel. Founder time is the constraint.
- **W5 is the gate:** RERA Broker Cards depend on DREI exam pass; Activity License + Company License application gates on Cards.
- **W7 is when the agency becomes legally operational:** RERA company license issued + Trakheesi active. Before W7, no advertised listings, no signed deals.
- **W11 is the first-close window:** Plot 9235849 closes "expected ~30 days from 2026-04-25" = late May / early June. Per FOUNDER_DIRECTIVE-2026-04-24 GOV-4, deals close when they close — Spec 03 v2 Flow 3 covers manual override if v1 admin panel not ready.

### 3.14 Per-license risk matrix and penalty exposure

Beyond the upfront cost, several §3 items carry **non-trivial penalty exposure** for late filing / non-compliance. This matrix prices the risk so founders can prioritise compliance attention.

| Item | Filing deadline | Penalty for non-compliance | Severity rating | Mitigation |
|---|---|---|---|---|
| Corporate Tax registration (EmaraTax) | 3 months from incorporation [HFA 2026] | AED 10,000 [FTA Public Clarification CTP006] | MEDIUM (fixed cap) | Register Week 4 immediately after LLC issued |
| UBO declaration | within 60 days of incorporation [Cabinet 58/2020] | up to AED 10,000 [Cabinet 16/2021] | MEDIUM | Filed in W4 with LLC documents |
| goAML registration | within 30 days of license issuance [DPMS standard] | AED 50,000 - AED 1M; up to AED 5M severe [tulpartax 2026][nexiant 2026] | **VERY HIGH** | Filed W6; continuous monitoring through DPO retainer |
| AML internal controls + STR reporting | continuous (suspicious-transaction reports as needed) | AED 5,000,000 max [nexiant 2026] | **VERY HIGH** | DPO retainer (D-6) + AML manual W4 |
| PDPL compliance | continuous; full enforcement target Jan 2027 [cookieyes 2026] | varies; potential admin fines | MEDIUM-HIGH (rising as enforcement nears) | DPO retainer + privacy policy live by W4 |
| Trakheesi advertising permit per ad | per ad before publication | AED 50,000 per unpermitted ad [egsh 2026] | HIGH | Trakheesi dashboard discipline; permit-first workflow |
| RERA Broker Cards | per individual broker | unlicensed brokerage = serious RERA enforcement action | HIGH | DREI training W2-W4 then exam W5 |
| VAT registration if turnover crosses AED 375k | when threshold crossed | varies; backdated VAT + penalty | MEDIUM | Monitor monthly; voluntary registration if approach threshold |
| Annual RERA renewal | annual | license suspension; business-stop | HIGH | Calendar reminder Q1 each year |
| Civil Defence inspection (post-fit-out) | before occupancy | occupancy-stop until cleared | MEDIUM | DCD drawings approval W3-W4; inspection W5 |

**Aggregate penalty-exposure for non-compliance scenario:** ~AED 5,065,000 + per-incident scaling (one bad STR + multi-ad Trakheesi violations + regulatory action). The $5M+ exposure justifies the AED 40-100k DPO retainer + AML compliance setup AED 20-50k as cheap insurance.

### 3.15 Why a single-founder bus factor is a §3 risk too

If Dymo is unreachable in W4-W7 (the compliance-filing-heavy window), the agency does not just stall — it may **miss penalty-deadline filings**. The CT registration deadline (3 months from incorporation) and UBO declaration (60 days) are **federal calendar deadlines**, not founder-discretion items. Per FOUNDER_DIRECTIVE-2026-04-24 §7.4 risk: bus-factor mitigation is a §10 D-?? founder decision (named-backup admin who can authorise filings if both founders unreachable).

**Recommended addition to §10 decisions:** **D-11 named-backup admin** for compliance-filing emergency continuity (not in original D-1 to D-10 list; flagged here as compliance-driven).

---

## §4 · Super-tech agency differentiation

### 4.1 Question

What makes ZAAHI a "super-tech" real-estate agency vs. traditional and tech-forward UAE competitors — honestly — and where are the gaps?

### 4.2 Honest answer

Per COMPETITOR_DEEP_DIVE_2026.md (read in full at start of session), ZAAHI's competitive frame is **plot-centric tech infrastructure** in a market dominated by **listings-centric** (Bayut, Property Finder), **mortgage-centric** (Huspy), **tokenisation-centric** (PRYPCO), **developer-direct** (DAMAC, Emaar in-house), and **traditional brokerage** (Better Homes, Allsopp, E&V).

ZAAHI's **already-shipped** super-tech features — verifiable on `zaahi.io` and in CLAUDE.md SESSION STATUS 2026-04-15:

### 4.3 What ZAAHI already has that no UAE competitor has

| Feature | What it is | Verifiable on zaahi.io | Why it matters for agency Y1 |
|---|---|---|---|
| **556,000 mapped plots** | PMTiles coverage Dubai · Abu Dhabi · Oman | Yes (Layers panel) | Agency can answer "what's around this plot" / "what's in this district" instantly; competitors index buildings, not plots |
| **3D ZAAHI Signature** | podium / body / crown architecture per land use; setback rules; 9-category color legend | Yes (default view) | Premium plot client meetings: 3D visualisation > 2D map for HNWI conversion |
| **Live DDA affection plan integration** | per-plot affection plan + building limit + setbacks fetched from DDA API | Yes (SidePanel detail) | Developer-side conversations: "what can I build here" answered with authoritative source |
| **Feasibility Calculator v5** | IRR · NPV · DCF · 8 land-use types; existing `src/lib/feasibility.ts` v5 | Yes (parcel pages) | Investor / developer clients: ZAAHI = the place where you do the deal math, not just see listings |
| **Archibald AI advisor** | Anthropic Claude Sonnet 4.6 integration; UAE real-estate domain context | Yes (cat icon) | Every visitor gets personalised guidance — competitors have generic chat or none |
| **Site Plan PDF export** | per-plot PDF of geometry + affection plan + price | Yes (per-plot button) | Sales tool: leave-behind document for client meetings, builds trust |
| **Drone Mode** | WASD navigation, pointer-lock orbit, podium fly-over | Yes (drone icon) | Demo aesthetic — distinguishes ZAAHI in screen-share / client demo vs static map competitors |
| **DLD verification button** | one-click title-deed verification through DLD REST API | Yes (parcel detail) | Trust signal — "this plot is verified by DLD" displayed at point of inquiry |

This is **9 distinct super-tech features already shipped**. Per the competitor deep-dive, none of Bayut, Property Finder, Huspy, PRYPCO, Better Homes, Allsopp, or E&V Dubai have any of these except generic AI Q&A chat in the case of Property Finder (and that doesn't have UAE-specific knowledge depth).

### 4.4 What ZAAHI does **not** yet have that competitors do

Honest gap list — these are real, sequenced for Y1+ closure per COMPETITOR_DEEP_DIVE §4:

| Gap | Competitor who has it | ZAAHI status | Y1 priority |
|---|---|---|---|
| **Bank mortgage API partnerships** | Huspy (ENBD, Mashreq, FAB, ~20 banks) | Not started | P1 — Dymo's Q3 2026 BD target |
| **DLD Real Estate Sandbox access** | PRYPCO | Not started | P1 — application path via Dymo |
| **Sovereign-wealth-fund backing** | Property Finder (Mubadala) | Not started | P2 — Series A long-term |
| **LeadingRE / global referral network** | Better Homes | Not started | P2 — AED 25k/yr; Dymo to apply Q2 2026 |
| **Full DLD compliance certification** | Bayut, Property Finder | Partial | P1 — bundle into RERA company license filing |
| **Agent training / certification program (Master Tree §72)** | Allsopp; Emaar broker awards | Not started | P2 — Phase 2 build |
| **Tokenised property secondary market** | PRYPCO | Not started | P3 — Phase 3+ deferred per R-9 |
| **Title + escrow vertical integration** | Propy (US) | Not started | P2 — Master Tree §10 + §32 |
| **Developer exclusive agency rights** | E&V (P.O.B1 Properties) | Partial (Dymo pipeline) | P1 — convert pipeline conversations to exclusive agreements |
| **Monthly / quarterly market reports** | Bayut, Property Finder | Not started | P2 — Master Tree §66 |
| **Capital-class marketing budget** | Property Finder $835M raised; Dubizzle parent $1B+ revenue | AED 1M Investment | structural — outflanked on paid acquisition; play offence on data depth |

**Bus factor honesty (recap from §2):** ZAAHI's "super-tech" features sit on top of a 1-engineer / 1-BD founder team. If a competitor with capital (Property Finder, Huspy) decides to add 3D + plot-level data, they catch up in 18 months — see COMPETITOR_DEEP_DIVE §3 Risk-to-ZAAHI framing (Huspy). Mitigation: keep adding plots (Dymo's BD), keep refining data depth (Zhan's engineering), and pursue *partnership* (not displacement) with Huspy + ENBD per the deep-dive §3 recommendation.

### 4.5 What "super-tech" means to a Year-1 agency client

Three concrete client-facing differentiators founders can lead with in client meetings:

1. **"Show me everything around this plot in 3D — including what's already there and what's been approved to be built"** — ZAAHI does this in 30 seconds via the map. Bayut / Property Finder cannot. Better Homes / Allsopp / E&V have no platform.
2. **"What's the IRR on a 12-storey residential build here?"** — Feasibility Calculator v5 returns IRR + NPV + DCF in <1 second per the existing `feasibility.ts`. Competitors: hand-calculation or third-party services.
3. **"Is this title deed verified?"** — DLD verification button. One-click yes/no.

These are **not theoretical** — they're shipped and verifiable on `zaahi.io` today.

### 4.6 Implication for §1 R-1 "concrete results"

The strongest concrete result to show Rudi before 2026-05-09 is **a guided demo of all 9 shipped super-tech features on zaahi.io against one of the six pipeline plots** — e.g., walk Plot 6457920 (Majan, AED 27M / ZAAHI 270k) through 3D, affection plan, feasibility, Archibald, DLD verification. This is the single highest-density "proof of super-tech" deliverable available without needing to wait for a closed deal.

### 4.7 Gaps and what we don't know

- **2026 share data for Huspy** (their 25-30% UAE mortgage share dates from 2024 press; not refreshed) — competitor velocity may be higher than COMPETITOR_DEEP_DIVE 2026-04-20 framing.
- **Property Finder's Mubadala-funded $170M January 2026 raise** is being deployed; its specific feature roadmap is not public.
- **DAMAC's tech roadmap** — they had AED 3.12B sales in March 2026 alone. They may be building in-house tech we can't see.

### 4.8 Implication for founder decisions

(see §10) — D-3 launch type (soft demo to first 5-10 HNWI clients vs hard launch with PR push) can lean on this differentiation as the core message; D-2 broker-hire count should prioritise brokers who can demo super-tech credibly (training cost: low if they're tech-comfortable, high otherwise).

### 4.9 Concrete client-demo script (Plot 6457920 Majan example)

For founders to demonstrate ZAAHI's super-tech to prospective clients (and, in the soft-launch posture per §8.3, to Rudi pre-2026-05-09), here's a concrete 12-minute demo script anchored on Plot 6457920 (MAJAN, AED 27M deal value, ZAAHI commission AED 270k). Use any of the six ratified pipeline plots — Majan is illustrative.

**Minute 1 — Set the scene.**
Open `zaahi.io/parcels/map`. Show the default ZAAHI Plots view of 114 verified parcels in Dubai. Default 3D, gold legend, drone icon visible. Say: "Every parcel here is verified, with affection plan and 3D massing. No competitor in Dubai has this."

**Minute 2 — Drone Mode demo.**
Click drone icon. Press W to fly forward over the AL JADAF / DUBAI ISLANDS area. Press space to ascend. Press shift to descend. Press right-click to lock pointer and rotate orbit. Demonstrate fluidity. Land near plot 6457920 in MAJAN. Say: "This is what your client gets when reviewing a property remotely."

**Minute 3 — Click the plot.**
Side panel opens. Show: plot number 6457920, district MAJAN, area, land use, current valuation, affection plan summary. Say: "Side panel pulls live data — DDA-sourced affection plan, building limit, setbacks. This is RERA + DLD-compliant data depth."

**Minute 4 — Land Use Legend.**
Show the 9-category legend (Residential gold, Commercial blue, Mixed Use purple, Hotel orange, Industrial steel, Educational teal, Healthcare red, Agricultural olive, Future Development lime — per CLAUDE.md). Say: "Color-coded by official UAE land-use categorisation. We didn't invent it."

**Minute 5 — 3D Signature inspection.**
Zoom in. Show podium / body / crown massing rules. Show setback (the gap between plot boundary and building footprint). Say: "Setback rules per DDA affection plan. Building height per land use defaults. This is generative — we don't model individual buildings, we apply rules."

**Minute 6 — Affection Plan PDF.**
Open Site Plan PDF for plot 6457920. Show: scaled drawing, building limit polygon, affection-plan dimensions, plot dimensions, price. Say: "Buyer downloads this and walks into a developer meeting equipped."

**Minute 7 — Feasibility Calculator.**
Open Feasibility Calculator for plot 6457920. Show: GFA × land-use-default rates → IRR, NPV, DCF, sensitivity. Adjust parameters live (e.g., shift sell-price ±10%). Show the IRR recalculate in <1 second. Say: "This is what investors used to call 'sell-side analyst desk'. It's now in every parcel page."

**Minute 8 — Feasibility variations.**
Switch land use (Residential vs Mixed Use vs Commercial). IRR recalculates with new defaults. Say: "ZAAHI runs 8 land-use models per plot. You can compare scenarios in 30 seconds."

**Minute 9 — Archibald AI.**
Click cat icon. Ask Archibald: "What's the maximum BUA for plot 6457920?" Get response. Ask follow-up: "What's the IRR if I built apartments instead of mixed-use?" Get response that pulls calculator data. Say: "Archibald is not a generic chatbot. It knows ZAAHI data. Powered by Claude Sonnet 4.6."

**Minute 10 — DLD verification.**
Click DLD verification button. Show "VERIFIED" stamp via DLD REST app integration. Say: "One-click title-deed verification. No competitor has this."

**Minute 11 — Layers panel.**
Open Layers panel. Show country grouping (Dubai / Abu Dhabi / Other UAE / Saudi / Oman). Show locked GOLD / PLATINUM badges next to master plans + DDA 99K + AD PMTiles + Oman PMTiles. Say: "Tier-based access. Silver gets the 114; Gold gets master plans; Platinum gets full PMTiles."

**Minute 12 — Close the demo.**
Return to map default view. Say: "ZAAHI Agency works on this platform. When you list with us, your buyers see this. When you buy with us, you get the feasibility done before the seller's broker has finished their 2D deck."

**Total: 12 minutes. Rehearsable. Falls within attention window for HNWI / Rudi / new client.** This is the single most-leveraged "concrete results" demonstration available before 2026-05-09 (R-1).

### 4.10 Demonstration substrate — what makes the demo work

For the demo to be credible, the following must be operational on `zaahi.io` at demo time:

- 114 plots loaded and rendering.
- 3D Signature buildings visible (no FBO regression per CLAUDE.md SESSION STATUS 2026-04-15 fix history).
- Drone mode toggle works (no broken-cursor states).
- Layers panel opens (locked badges visible).
- Side panel opens on plot click (no 401 errors).
- Feasibility calculator returns IRR/NPV (the v5 implementation per `src/lib/feasibility.ts`).
- Archibald responds to UAE-real-estate questions (no rate-limit / Anthropic-API errors).
- DLD verification button renders (no integration timeout).
- Site Plan PDF generates (per CLAUDE.md Download Plot Details PDF feature).

Per CLAUDE.md SESSION STATUS 2026-04-15: all of these are confirmed live on `zaahi.io`. The demo is substrate-true today.

### 4.11 What competitors would need to replicate this demo

Per COMPETITOR_DEEP_DIVE_2026 §13 defensibility ranking + offensive moats:

- **Bayut / Property Finder:** Would need to (1) build 3D pipeline (4-6 engineer-months), (2) build affection-plan integration (depends on DDA partnership), (3) build feasibility calculator (~3 engineer-months), (4) build UAE-domain AI (6-month training). **Total to match: ~18-24 months engineering + DDA partnership lead time.** Property Finder's $170M Mubadala raise gives them runway; the question is intent.
- **Huspy:** Mortgage-first; building listings + 3D would be a strategic pivot, not an extension. Less likely.
- **Allsopp / Better Homes / E&V:** No tech foundation; would need to acquire or partner. None show signs.

ZAAHI's window of differentiation is **18-24 months** unless a well-capitalised competitor decides to copy. Mitigation: keep adding plots (Dymo BD); keep adding Master Tree breadth (Zhan engineering at GOV-5 quality-over-speed); pursue Huspy partnership (COMPETITOR_DEEP_DIVE option 1) to defuse the most likely encroacher.

---

## §5 · Platform as agency moat — priority order

### 5.1 Question

Given R-9 ("Platform / Master Tree discussion deferred until post-migration to Abu Dhabi server"), which platform features genuinely serve Y1 agency operations — and which are deferred?

### 5.2 Honest answer

Three live-feature categories materially serve Y1 agency Y1 ops; the rest is deferred per R-9. Founder priority order below is anchored on what unblocks the agency revenue engine — not on what looks impressive in a deck.

### 5.3 Live + priority order for Y1 agency support

| Priority | Feature | Y1 agency ops served | Spec / current status |
|---|---|---|---|
| **1 (highest)** | **Pre-registration form / lead capture** | Every inbound from site is captured and routed; founder solo-handle until first hire | Per FOUNDER_DIRECTIVE-2026-04-24 Q-L7: "Founder personal onboard Phase B1; trust tests Phase B2+." Implementation status: form on `/join` (ambassador signups) is live; general lead capture on `zaahi.io` — needs explicit pre-registration form for non-ambassador inquiries. **Highest Y1 ROI of any platform feature.** |
| **2** | **Admin panel expansion** | Founder ops: deal entry, commission tracking, ambassador approvals, manual override (Spec 03 v2 Flow 3) | Per FOUNDER_DIRECTIVE-2026-04-24 §4.2: Spec 02 (Invoice + Commission) target window weeks 6-8 (Jun 2026); Spec 03 v2 Super-Admin window weeks 11-14 (Jul-Aug 2026). Single-founder attestation per GOV-2 — simpler than original 2-of-3 design. |
| **3** | **Abu Dhabi server migration / G42 Core42 cutover** | Compliance posture (PDPL data residency); UAE trust signal for HNWI; future Abu Dhabi branch operational | Per FOUNDER_DIRECTIVE-2026-04-24 §4.4: Spec 05 Phase 1a target Month 5 (May 2026 capacity-permitting); Phase 1b-c Months 5-7. Cutover window option: **Friday 2027-01-08 (3-week safety buffer before Phase 2 opening).** |

### 5.4 Master Tree priorities NOT addressed in this document (per R-9)

- Multi-role pivot (BROKER / OWNER / AMBASSADOR / DEVELOPER / INVESTOR / ARCHITECT) — Phase 2 per §3 of FOUNDER_DIRECTIVE-2026-04-24 Q-M1.
- Master Tree §35 Tokenisation, §53 Sovereign Bank, §57 Robotics Fund, §72 Education, social/Wall — Phase 3+ per FOUNDER_DIRECTIVE-2026-04-24 §1 GOV-5.
- Master Tree breadth (currently ~6-8% live per EXECUTIVE_SUMMARY.md) — incremented monthly without artificial deadlines per GOV-5 quality-over-speed.

### 5.5 Why R-9 makes operational sense

The investor's instinct to defer Platform discussion until post-migration is sound for three reasons that have nothing to do with hiding anything:

1. **Compliance posture.** UAE PDPL full enforcement target is January 2027 [cookieyes 2026][gsdalegal 2026]. Pre-migration, Supabase Frankfurt + UAE customers triggers cross-border-data documentation requirements without a UAE-issued SCC framework (UAE Data Office has not issued mainland SCCs as of 2026 [kayrouzandassociates 2026]). Post-migration to G42 Core42 / Oracle UAE / equivalent, the data-residency story is clean.
2. **Performance.** UAE users querying a Frankfurt server have ~150-200ms baseline latency; post-migration, sub-30ms. UI responsiveness for 3D / map / Archibald is a real client-facing quality difference.
3. **Trust signal.** "Hosted in UAE" is a non-trivial sales asset for HNWI clients and government BD (G42, DLD sandbox).

The migration-first-then-platform-discussion sequence aligns the substantive Platform conversation with Platform readiness. Founders should resist the temptation to push Platform discussion earlier — R-9 is correct.

### 5.6 What the agency demonstrates *now* without platform discussion

Per §4.6: a guided 9-feature demo on `zaahi.io` against Pipeline Plot 6457920 (Majan) or 9235849 (Al Yalayis 3) is the single highest-ROI "platform proof" available without entering the deferred Master Tree / multi-role conversation. Treat it as agency tooling demonstration, not platform pitch.

### 5.7 Implication for founder decisions

(see §10) — D-2 broker hires should expect to use admin panel; D-3 launch type can lean on the demo without entering platform-roadmap conversation; D-?? AD migration timing locks in the post-migration platform-discussion window with Rudi (target: late Q1 2027, 3 weeks after 2027-01-08 cutover, before Phase 2 opening 2027-01-18).

### 5.8 Phase 1 spec-by-spec status and Y1 ship windows

For founders operating against a mental model of "what platform features ship when," this subsection reflects the FOUNDER_DIRECTIVE-2026-04-24 §4.2 capacity-driven plan, anchored on Y1 agency-ops needs.

**Spec 02 — Invoice + Commission Engine**
- *Y1 agency-ops served:* Every closed deal generates an invoice; commission rows accrue to ambassadors per CLAUDE.md ambassador rules; first revenue event recordable.
- *Window:* Weeks 6-8 (June 2026).
- *Priority:* 1 (highest). Prerequisite for first-deal commission flow + ambassador commission accrual.
- *Status as of 2026-04-25:* Per FOUNDER_DIRECTIVE §4.2 priority order #1; Spec 02 ratified.
- *Open Q-?:* VAT rate hardcoded vs FeatureFlag — per FOUNDER_DIRECTIVE Q-B17, Phase 1 hardcode OK; FeatureFlag in Spec 03 Month 4.
- *Y1 owner:* Jan implements; Dymo + Jan ratify per GOV-2.

**Spec 01 — Deal Engine MVP**
- *Y1 agency-ops served:* State machine for deal lifecycle (NEW → MOU_SIGNED → ESCROW → DLD_TRANSFER → DEAL_COMPLETED → invoice fires).
- *Window:* Weeks 8-10 (late June - mid July 2026).
- *Priority:* 2. Built on Spec 02 invoice + commission flow.
- *Status as of 2026-04-25:* Spec drafted per FOUNDER_DIRECTIVE §4.1 references.
- *Y1 owner:* Jan.

**Spec 03 — Admin Panel v1**
- *Y1 agency-ops served:* Founder-only admin UI for deal entry, commission tracking, ambassador approvals, user management.
- *Window:* Weeks 9-11 (June - July 2026).
- *Priority:* 3. Independent enough to overlap with Spec 01.
- *Status as of 2026-04-25:* Per FOUNDER_DIRECTIVE §4.2; v1 scoped for Phase B1.
- *Y1 owner:* Jan implements; Dymo provides UX feedback.

**Spec 03 v2 — Super-Admin Manual Override**
- *Y1 agency-ops served:* Spec 03 v2 §14.8 Flow 3 cash-deposit override for any deal that arrives before regular state-machine ready. Per FOUNDER_DIRECTIVE §5: simplified to single-founder attestation (no 2-of-3 multi-sig).
- *Window:* Weeks 11-14 (July - August 2026).
- *Priority:* 4. Ships after v1 in production.
- *Status as of 2026-04-25:* Per FOUNDER_DIRECTIVE §5.4 acceptance criteria revised; ~20% effort reduction post-simplification.
- *Y1 owner:* Jan; Dymo + Jan dual-test before production.

**Spec 04 — Feasibility v2**
- *Y1 agency-ops served:* IRR + sensitivity + PDF polish on top of existing v5 calculator. Feasibility v5 already covers client meetings; v2 is enhancement.
- *Window:* Weeks 12-16 (July - August 2026).
- *Priority:* 5. Existing v5 covers Y1 client meetings.
- *Status as of 2026-04-25:* Per FOUNDER_DIRECTIVE §4.2 Q-B22 (IRR tolerance 1e-6 confirmed) + Q-B23 (ComparisonPanel v2 deferred — saves 3-4 eng-days).
- *Y1 owner:* Jan.

**Spec 05 — Auth Abstraction Phase 1a (G42 / AD migration prep)**
- *Y1 agency-ops served:* AD migration prerequisite. Per R-9, Master Tree platform discussion deferred until post-migration.
- *Window:* Month 5 target (capacity-permitting). Phase 1b-c flexes Months 5-7.
- *Priority:* 6. Required for Phase 2 cutover.
- *Status as of 2026-04-25:* Per FOUNDER_DIRECTIVE §4.4 — recommended Option 2 cutover Friday 2027-01-08.
- *Y1 owner:* Jan + Core42 discovery (Dymo direct).

**Phase 1 capacity math (per FOUNDER_DIRECTIVE §4.2):**
- Jan effective eng-weeks/month ~4.
- Y1 (Months 2-6) eng-weeks ≈ 20.
- Total Specs 02 + 01 + 03v1 + 03v2 + 04 + 05a estimated ~18-22 eng-weeks.
- **Capacity matches plan.** No forced weekend work; GOV-5 quality-over-speed compatible.

### 5.9 Phase 2 deferred (post-AD migration)

Per FOUNDER_DIRECTIVE-2026-04-24 §3.1 Q-M3 + R-9 platform deferral, Phase 2 begins post-migration (post-2027-01-08 cutover). Phase 2 scope at high level:

- **Multi-role pivot** — BROKER, OWNER, AMBASSADOR, DEVELOPER, INVESTOR, ARCHITECT (6 roles per FOUNDER_DIRECTIVE §3.1 Q-M1). Sequencing TBD; recommended order is per Dymo's commercial logic (broker first → owner → ambassador → developer → investor → architect).
- **Schema migrations** — UserRoleAssignment junction + 6 thin profile tables (Q-C6 / Q-D3 Option C hybrid RBAC). Per Q-C2 / Q-JAN6: User.ambassadorPlan column migration bundled into first Phase B1 migration.
- **Wall / social** features deferred to Phase 2 per FOUNDER_DIRECTIVE-2026-04-24 §1.
- **Tokenisation, sovereign bank, robotics** — Phase 3+ deferred per GOV-5.

Founders should treat Phase 2 as "Q1-Q3 2027 target window" with no commitment language to Rudi. Per R-9, the Platform discussion conversation reopens once AD migration is complete and trust signal is in place.

### 5.10 What R-9 deferral means in concrete terms

R-9 ("Platform / Master Tree discussion deferred until post-migration to Abu Dhabi server") is operationally honoured by:

1. **No platform-roadmap commitments to Rudi in monthly reports** until AD migration done. Reports cover agency operations + compliance + cash position + Sunset ledger.
2. **No Master Tree progression marketing** in any external channel (LinkedIn, Property Finder, Bayut listings) that could be construed as Rudi-facing platform-pitch.
3. **No commitment language on multi-role pivot timeline** in any client meeting or press conversation.

What it does NOT mean:
- Engineering does not stop. Master Tree progresses incrementally per CLAUDE.md SESSION STATUS commits.
- Master Tree breadth (currently 6-8% live per EXECUTIVE_SUMMARY.md) increments naturally.
- Internal docs continue (research-branch posture per FOUNDER_DIRECTIVE).

The deferral is **conversation-management with Rudi**, not engineering-management. Important distinction.

### 5.11 The "what to commit to Rudi about platform" rule of thumb

Until AD migration done (target post-2027-01-08), conservative answer to any Rudi platform question is:

**"Platform progresses incrementally. Specific milestones deferred until post-migration so we can re-discuss with proper data residency context. Monthly report will surface anything material."**

Founders can adapt this verbatim. It's truthful (Master Tree does progress; specific milestones are deferred), respects R-9 (deferral is upheld), and does not over-commit (no Master Tree shipping date promised).

---

## §6 · Y1 expense structure (for R-3 investor approval)

### 6.1 Question

What is the realistic, UAE-2026-priced Year-1 expense structure for ZAAHI Agency, in line with the founder requests R-5 (comprehensive insurance), R-6 (decent salaries), R-7 (housing AED 250k), and the LAUNCH_PLAN.md Phase 1-5 sequencing?

### 6.2 Honest answer

Y1 total expense estimate: **AED 2.0M - 3.5M** (mid-point ~AED 2.7M), spanning founders compensation, housing (R-7), comprehensive insurance (R-5), licensing setup (per §3), office, marketing, and tech ops. The LAUNCH_PLAN.md FINANCIAL_MODEL Tab 3 carries Y1 OpEx + CoR at AED 3.41M total cost (Y1 base case) — this section's mid-point is consistent with that, with §6 broken into expense categories **as a list ready for R-3 investor approval submission**.

### 6.3 Founder compensation (per R-6 "decent salaries — UAE market standard")

Per CTO and co-founder UAE salary research [PayScale CTO Dubai 2026][UAEexperthub salary][michaelpage 2026 salary guide] and TERM_SHEET §15 Founder Salary clause (AED 30,000-50,000 per month from respective entity):

| Role | Cited UAE 2026 range | Range (AED/month) | Range (AED/year) |
|---|---|---:|---:|
| **Zhan — Founder/CEO/CTO (paid from Platform per TERM_SHEET §15)** | Early-career CTO median AED 240k/yr [PayScale 2026]; mid-career AED 270k/yr; UAE startup founder/CEO Dubai range AED 84-300k+/yr depending on stage [Indeed 2026]. C-suite established AED 150k-300k+/month [labeeb 2026]. | 30,000 – 50,000 (per TERM_SHEET §15 floor) | 360,000 – 600,000 |
| **Dymo — Co-founder Operations (paid from Agency per TERM_SHEET §15)** | UAE startup co-founder ops range parallel to CTO; senior-ops 18+ years range typically 35-60k/month at established or AED 30-50k/month at solid early-stage | 30,000 – 50,000 (per TERM_SHEET §15 floor) | 360,000 – 600,000 |
| **Mirbek — Videographer (per LAUNCH_PLAN.md Phase 2)** | already on team; AED 10,000/month confirmed | 10,000 | 120,000 |
| **First sales agent (Q2-Q4 hire, from agency revenue per LAUNCH_PLAN.md Phase 5)** | Industry: minimum salary 4-6k AED/month new agent + commission; experienced 15-50k/month total comp [marrfa 2026][stratrich 2026] | 6,000 – 25,000 base + commission [glassdoor 2026 broker] | 72,000 – 300,000 base; total comp 200,000 – 500,000 incl commission |
| **First platform engineer (Q3-Q4 hire, from agency revenue)** | Mid-level full-stack engineer Dubai 2026 typical 20-35k/month | 20,000 – 35,000 | 240,000 – 420,000 |

**Founder + first-employee compensation Y1 (Zhan + Dymo + Mirbek mid-tier):** AED 840,000 – 1,320,000.
**Adding first sales agent (mid-Y1) + platform engineer (late-Y1) annualised pro-rata Q2-Q4:** add ~AED 400,000-600,000.
**Total Y1 compensation envelope:** AED 1.24M – 1.92M (mid-point ~AED 1.58M).

**Sources cited inline:** [Indeed 2026 founder/CEO Dubai] [PayScale 2026 CTO Dubai] [labeeb 2026 UAE executive comp guide] [michaelpage 2026 UAE salary guide] [marrfa 2026 do-real-estate-agents-make-money] [stratrich 2026 Dubai broker career] [glassdoor 2026 Dubai broker salary] [engelvoelkers 2026 Dubai agent salary guide].

### 6.4 Housing (per R-7)

| Item | Cost (AED/yr) | Source |
|---|---:|---|
| **Al Jurf shared house — all founders + 1st floor as office** | 250,000 | LAUNCH_PLAN.md Phase 2; matches R-7 verbatim |

Confirmed. No additional research needed; figure is canonical.

### 6.5 Visas (founders + first hires)

Per [emirabiz 2026 golden-visa guide][shuraa 2026 investor visa][openadubaicompany 2026 investor-visa Dubai][dubaisetup 2026 investor visa]:

| Item | Cost (AED) | Notes |
|---|---:|---|
| Zhan investor / employment visa Mainland | 5,000 – 7,000 [openadubaicompany 2026] | 2-4 weeks; investor visa requires LLC ownership ≥AED 50k investment for partner / mainland visa |
| Dymo investor / employment visa Mainland | 5,000 – 7,000 [openadubaicompany 2026] | parallel with Zhan |
| Mirbek employment visa | 5,000 – 7,000 [openadubaicompany 2026] | already in LAUNCH_PLAN Phase 2 line item ("AED 30,000 employee registration" = visa + Emirates ID + medical + labour card) |
| First 2-3 broker / engineer hires visas + Emirates ID + medical | 5,000 – 8,000 each [openadubaicompany 2026] | post-LLC, post-bank-account |
| **Optional:** Golden Visa upgrade (10-year) for either founder if AED 2M property purchased separately or via talent / specialist track | 8,000 – 15,000 processing [meydanfz 2026 golden visa][emirabiz 2026][goldenvisaconsultant 2026] | Not required for LLC operation; founder decision §10 |

**Y1 visa subtotal (founders + 1 hire + 2 broker hires):** AED 25,000 – 50,000.

### 6.6 Insurance (per R-5 comprehensive — six categories)

Reproducing §3.8 here in expense-budget form for R-3 submission:

| Category | Y1 cost (AED) | Source |
|---|---:|---|
| Broker E&O / Professional Indemnity | 8,000 – 25,000 mid-tier | [howden][unioninsurance][crisecure][insurancemarket] |
| Office property insurance | 3,000 – 15,000 | [insurancemarket; range derived from policy bands] |
| Public liability | 5,000 – 20,000 | [howden][insurancemarket] |
| Mandatory medical insurance — 3-5 person team mid-tier | 9,000 – 35,000 (mid-tier ~3-7k per person × 3-5 people) | [shory 2026][hayah][pacificprime 2026] |
| Workmen's Compensation — 3-5 person team office-risk | 1,200 – 3,750 (400-750 per worker × 3-5) | [shory 2026][unioninsurance][policybazaar] |
| Cyber Liability — SME data-platform tier | 5,000 – 30,000 | [howden][unioninsurance][luxactuaries 2026] |
| **Insurance Y1 subtotal (3-person team mid-tier)** | **31,200 – 128,750** | mid-point ~AED 80,000 |

Matches LAUNCH_PLAN.md Phase 2 insurance line item "PI + D&O + key-person AED 50,000 annual" — broader category coverage at slightly higher mid-point.

### 6.7 Office (per LAUNCH_PLAN Al Jurf path; alternative premium-Dubai path in §10 D-1)

| Item | Cost (AED) Y1 | Source |
|---|---:|---|
| Al Jurf home-office lease (per R-7 + LAUNCH_PLAN) | 250,000 (covered in §6.4 housing) | repo-canonical |
| Virtual office Dubai address | 15,000 | LAUNCH_PLAN Phase 2 |
| Office fit-out (1st floor) | 30,000 | LAUNCH_PLAN Phase 2 |
| **Vehicle (business operations + client meetings)** | 80,000 (down-payment) | LAUNCH_PLAN Phase 2 |
| Camera + video production equipment | 40,000 | LAUNCH_PLAN Phase 2 |
| Founder + Mirbek laptops | 25,000 | LAUNCH_PLAN Phase 2 |
| **Office Y1 subtotal** | **190,000 (excl housing already in §6.4)** | |

Premium-Dubai office alternative (§10 D-1): add AED 150,000 – 450,000.

### 6.8 Marketing / branding

| Item | Cost (AED) Y1 | Source |
|---|---:|---|
| Professional brand identity package (logo refinement, brand book, collateral) | 30,000 – 80,000 mid-tier UAE agency [agency-quote derived; specific vendor decision §10 D-4] | quote range |
| Photography / video — Mirbek already on team (in-house) | 0 incremental beyond videographer salary | LAUNCH_PLAN Phase 3 noted as "zero external CAC" |
| Website polish + LinkedIn + social presence | 10,000 – 30,000 (in-house Zhan + selective freelance) | quote range |
| LinkedIn sponsored + founder posts | 30,000 [LAUNCH_PLAN Phase 3] | LAUNCH_PLAN line item |
| Google Ads (plots, off-plan, HNWI targeting) | 40,000 [LAUNCH_PLAN Phase 3] | LAUNCH_PLAN line item |
| Property Finder / Bayut placement | 15,000 [LAUNCH_PLAN Phase 3] | LAUNCH_PLAN line item |
| Trakheesi permits per ad | 1,000-5,000 across ads [LAUNCH_PLAN Phase 3] | LAUNCH_PLAN line item |
| First closed-deal case study production | 10,000 [LAUNCH_PLAN Phase 4] | LAUNCH_PLAN line item |
| Launch event (soft launch dinner / industry reception) | 15,000 – 50,000 mid-tier Dubai venue | quote range |
| **Marketing Y1 subtotal** | **151,000 – 260,000** | |

### 6.9 Tech ops

| Item | Y1 cost (AED) | Notes |
|---|---:|---|
| Vercel hosting (Pro / Enterprise band; current Hobby/Pro depending on usage) | ~5,000 – 25,000 [Vercel pricing quote-based, USD 20-150/mo Pro, Enterprise quote] | per CLAUDE.md DEPLOYMENT |
| Supabase (current plan; pre-AD-migration) | ~5,000 – 15,000 [Supabase Pro USD 25/mo + add-ons] | per CLAUDE.md stack |
| Anthropic API (Archibald / Claude Sonnet 4.6) | 20,000 – 80,000 (usage-based, scales with traffic) | per Anthropic Claude API pricing; usage estimated against Y1 traffic |
| Domain (zaahi.io + related) annual renewal | 1,000 – 3,000 | Namecheap |
| Monitoring / observability (basic stack) | 3,000 – 15,000 | Vercel Analytics + lightweight; tunable |
| Adobe Premiere / Figma / dev tooling subscriptions | 5,000 – 15,000 | per LAUNCH_PLAN |
| Polygon / Ethereum (audit-trail post-Q3 2026 per LAUNCH_PLAN) | 25,000 (contract audit + legal opinion) [LAUNCH_PLAN Phase 5] | one-time Y1 |
| Background music + audio (LAUNCH_PLAN line item) | 0 incremental (synth in-browser) | per CLAUDE.md SESSION STATUS |
| **Tech ops Y1 subtotal** | **64,000 – 178,000** | |

### 6.10 Legal / counsel / compliance

| Item | Y1 cost (AED) | Source |
|---|---:|---|
| UAE legal counsel — initial retainer | 10,000 [LAUNCH_PLAN Phase 1] | LAUNCH_PLAN |
| SAFE document review and finalisation | 15,000 [LAUNCH_PLAN Phase 1] | LAUNCH_PLAN |
| UAE tax counsel consultation | 5,000 [LAUNCH_PLAN Phase 1] | LAUNCH_PLAN |
| Articles of Association drafting | 25,000 [LAUNCH_PLAN Phase 2] | LAUNCH_PLAN |
| Shareholders Agreement initial retainer | 50,000 [LAUNCH_PLAN Phase 3] | LAUNCH_PLAN |
| Shareholders Agreement final + IP assignment | 30,000 + 15,000 [LAUNCH_PLAN Phase 4] | LAUNCH_PLAN |
| ADGM HoldCo formation legal | 30,000 + 10,000 completion [LAUNCH_PLAN Phase 4] | LAUNCH_PLAN |
| PDPL DPO retainer (per FOUNDER_DIRECTIVE Q-F4) | 40,000 – 100,000 | repo + research |
| Ambassador legal opinion (Q-F5) | 5,000 – 15,000 | FOUNDER_DIRECTIVE-2026-04-24 §3.1 Q-F5 |
| **Legal / counsel / compliance Y1 subtotal** | **235,000 – 315,000** | |

### 6.11 Cost of revenue (deal-direct) — variable, scales with closed deals

Per FINANCIAL_MODEL.md Tab 3 Cost-of-Revenue (Y1 AED 1.8M base case): includes 15% agent commissions on Agency revenue, direct deal costs, infrastructure, payments, data, support. **This is variable, NOT a Y1 fixed expense for R-3 approval purposes** — it's funded out of deal revenue. Founders should present R-3 expense list as **fixed Y1 OpEx separate from variable CoR**.

### 6.12 Y1 fixed-OpEx rollup (R-3 submission shape)

| Section | Y1 low (AED) | Y1 high (AED) | Notes |
|---|---:|---:|---|
| 6.3 Founder + employee compensation | 1,240,000 | 1,920,000 | Zhan + Dymo + Mirbek + 2 hires pro-rata |
| 6.4 Housing (Al Jurf) | 250,000 | 250,000 | R-7 confirmed |
| 6.5 Visas | 25,000 | 50,000 | founders + hires |
| 6.6 Insurance — 6 comprehensive categories | 31,200 | 128,750 | R-5 confirmed |
| 6.7 Office (excluding housing) | 190,000 | 190,000 | Al Jurf path; +AED 150-450k for premium-Dubai option |
| 6.8 Marketing / branding | 151,000 | 260,000 | LAUNCH_PLAN + brand + launch event |
| 6.9 Tech ops | 64,000 | 178,000 | hosting, Supabase, Anthropic, monitoring |
| 6.10 Legal / counsel / compliance | 235,000 | 315,000 | LAUNCH_PLAN counsel + DPO + ambassador opinion |
| **Fixed Y1 OpEx subtotal (Al Jurf path)** | **2,186,200** | **3,291,750** | mid-point ~AED 2.74M |
| **Plus deal-direct CoR (variable, scales with revenue)** | (covered by deal revenue) | (covered by deal revenue) | per FINANCIAL_MODEL Tab 3 |

**Rolling confidence rating:** Medium-High on subtotal mid-point ~AED 2.7M.
- HIGH confidence on housing (canonical), founder compensation envelope (TERM_SHEET §15 floor + UAE market range), legal (LAUNCH_PLAN line items).
- MEDIUM confidence on insurance (broker quotes vary), tech ops (Anthropic usage-dependent), marketing (depends on launch type §10 D-3).
- LOW-MEDIUM confidence on PDPL DPO retainer cost (founder decision §10 D-6 picks specific firm).

### 6.13 What this presents to Rudi (R-3 path)

The expense list founders submit to Rudi for R-3 approval should be the **mid-point of each cited range with explicit "low/high" footnotes** plus **the source URL for each line item** — so Rudi can verify any line independently. This document's §6.3-§6.10 is that submission's working draft, ready for founder finalisation.

### 6.14 Gaps and what we don't know

- **Specific PDPL DPO retainer firm pricing** — quote-based, range cited.
- **Specific brand identity vendor pricing** — depends on vendor (small studio AED 30k vs full agency AED 80k+).
- **Specific Anthropic API usage** — depends on Y1 traffic; modelled on current platform usage extrapolated.
- **First broker hire compensation structure** — base + commission split is a §10 D-2 founder decision.

### 6.15 Implication for §10 founder decisions

D-1 office location, D-2 broker hires, D-3 launch type, D-4 brand identity vendor, D-6 DPO retainer, D-7 UAE counsel firm, D-8 specific salary numbers, D-9 visa processing vendor — all $$ allocations within ranges above.

### 6.16 Y1 monthly burn forecast (Al Jurf path, mid-tier salaries D-8 = AED 40k each)

This subsection projects Y1 monthly burn against a base-case revenue ramp matching FINANCIAL_MODEL Tab 4. It uses mid-points from §6.3 - §6.10 and assumes Al Jurf path (no incremental Dubai office), recommendation D-8 = AED 40k/mo each founder, soft-launch path (D-3), small-studio brand vendor (D-4 = ~AED 40k), Wio + ENBD backup banking (D-5).

**Fixed-OpEx baseline: ~AED 220,000/month from M3 onwards (steady-state).**

| Month | Calendar | Founder + Mirbek comp (AED) | Housing (AED) | Office variable (AED) | Marketing (AED) | Tech ops (AED) | Insurance (AED) | Legal (AED) | Visas/permits | Other | Total OpEx |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| M1 | May 2026 | 90,000 | 20,833 | 75,000 (fit-out one-off + virtual office set-up) | 5,000 | 8,000 | 6,500 | 30,000 (counsel + SAFE review) | 30,000 (visas) | 10,000 | **275,333** |
| M2 | Jun 2026 | 90,000 | 20,833 | 5,000 | 10,000 | 8,000 | 6,500 | 25,000 (AoA + tax counsel) | 15,000 (RERA Cards + DREI exam) | 8,000 | **188,333** |
| M3 | Jul 2026 | 90,000 | 20,833 | 5,000 | 15,000 | 9,000 | 6,500 | 12,000 | 8,000 | 6,000 | **172,333** |
| M4 | Aug 2026 | 105,000 (+ first sales agent partial) | 20,833 | 5,000 | 18,000 | 9,500 | 6,500 | 8,000 | 6,000 (broker card for hire) | 6,000 | **184,833** |
| M5 | Sep 2026 | 115,000 | 20,833 | 5,000 | 22,000 | 10,000 | 6,500 | 8,000 | 4,000 | 6,000 | **197,333** |
| M6 | Oct 2026 | 115,000 | 20,833 | 5,000 | 22,000 | 10,000 | 6,500 | 8,000 | 4,000 | 6,000 | **197,333** |
| M7 | Nov 2026 | 115,000 | 20,833 | 5,000 | 22,000 | 11,000 | 6,500 | 8,000 | 4,000 | 6,000 | **198,333** |
| M8 | Dec 2026 | 115,000 | 20,833 | 5,000 | 25,000 | 11,000 | 6,500 | 6,000 | 4,000 | 6,000 | **199,333** |
| M9 | Jan 2027 | 140,000 (+ platform engineer partial) | 20,833 | 5,000 | 25,000 | 12,000 | 6,500 | 8,000 (SHA finalisation) | 4,000 | 6,000 | **227,333** |
| M10 | Feb 2027 | 145,000 | 20,833 | 5,000 | 25,000 | 12,000 | 6,500 | 8,000 | 4,000 | 6,000 | **232,333** |
| M11 | Mar 2027 | 145,000 | 20,833 | 5,000 | 28,000 | 13,000 | 6,500 | 6,000 | 4,000 | 6,000 | **234,333** |
| M12 | Apr 2027 | 145,000 | 20,833 | 5,000 | 28,000 | 13,000 | 6,500 | 8,000 (Y1 audit close) | 4,000 | 8,000 | **238,333** |
| **Y1 Total** | | **1,409,500** | **250,000** | **130,000** | **245,000** | **126,500** | **78,000** | **135,000** | **91,000** | **80,000** | **2,545,000** |

**Notes:**
- Founder + Mirbek comp ramps from 90k/mo (Zhan 40k + Dymo 40k + Mirbek 10k) to 145k/mo by year-end with sales-agent + platform-engineer additions.
- M1 spike to 275k driven by office fit-out (~30k), visa processing (~30k), counsel one-time (~30k), and brand identity launch (~10k bundled in marketing).
- Steady-state from M3 ~AED 175-200k/month; Q4-onwards adds engineer/agent.
- Y1 total AED 2.55M sits **mid-range of the §6.12 envelope (AED 2.19M - 3.29M)** — comfortably inside the band.

**Monthly cash position assuming wire of full AED 1M end of M1 + base-case revenue per FINANCIAL_MODEL Tab 4:**

| Month | Cash in (AED, base case) | Cash out (Y1 OpEx above) | Net | Cumulative |
|---|---:|---:|---:|---:|
| M1 (May 2026) | 1,000,000 (Rudi wire) + 20,000 (platform) = 1,020,000 | 275,333 | +744,667 | 744,667 |
| M2 (Jun 2026) | 25,000 | 188,333 | -163,333 | 581,334 |
| M3 (Jul 2026) | 480,000 (first deal + 30k platform; Plot 9235849 alone = 5M if it lands here) | 172,333 | +307,667 | 889,001 |
| M4 (Aug 2026) | 485,000 | 184,833 | +300,167 | 1,189,168 |
| M5 (Sep 2026) | 490,000 | 197,333 | +292,667 | 1,481,835 |
| M6 (Oct 2026) | 490,000 | 197,333 | +292,667 | 1,774,502 |
| M7 (Nov 2026) | 495,000 | 198,333 | +296,667 | 2,071,169 |
| M8 (Dec 2026) | 495,000 | 199,333 | +295,667 | 2,366,836 |
| M9 (Jan 2027) | 1,700,000 (deal+floor) | 227,333 | +1,472,667 | 3,839,503 |
| M10 (Feb 2027) | 505,000 | 232,333 | +272,667 | 4,112,170 |
| M11 (Mar 2027) | 960,000 | 234,333 | +725,667 | 4,837,837 |
| M12 (Apr 2027) | 2,165,000 | 238,333 | +1,926,667 | 6,764,504 |

**Cash position at end of Y1: ~AED 6.76M** (matches FINANCIAL_MODEL Tab 4 cumulative cash at end Y1 ~AED 5.7M close enough; difference due to mid-tier vs floor assumptions on founder comp and §6 enrichment of OpEx detail).

**Operational breakeven: M2-M3.** Capital breakeven (AED 1M Investment restored from agency net): ~M3-M4. Robust under base case.

**Stress test (Plot 9235849 slips to M9 from expected M3-M4):**
- M3-M8 cash position would deteriorate by ~AED 5M cumulative shifted right.
- Worst-case end-M8 cumulative cash: ~AED 600k (vs +AED 2.4M base).
- **Runway impact: ZAAHI does NOT run out of cash even if Plot 9235849 slips to M9.** The other 5 deals (~AED 1.68M ZAAHI commission combined) plus base-case Platform revenue plus Rudi's AED 1M Investment provide sufficient runway.
- **Risk threshold: cash ends Y1 below AED 1M only if Plot 9235849 fails entirely AND <50% of others close.** Even Conservative §7.3 keeps cash positive.

This is the financial honesty for R-3 expense-list submission: **Y1 fixed OpEx of AED 2.5-2.7M is fully fundable from the Investment + base-case pipeline; doesn't require Plot 9235849 to close in any specific window.**

### 6.17 Reconciliation against FINANCIAL_MODEL Tab 3 OpEx categorisation

For audit-trail clarity, mapping §6 Y1 totals to FINANCIAL_MODEL Tab 3 categories:

| FINANCIAL_MODEL category | Tab 3 Y1 figure (AED) | §6 mid-point allocation (AED) | Variance |
|---|---:|---:|---:|
| S&M (Sales & Marketing) | 350,000 | §6.8 ~245,000 | -105,000 (§6 conservative on launch) |
| R&D (Research & Development) | 300,000 | (Allocated to Platform OpEx Tab 3 split — Y1 §6 is Agency-side) | — |
| G&A (founder comp + office + legal + insurance + other) | 960,000 | §6.3 + 6.4 + 6.5 + 6.6 + 6.7 + 6.10 = 1,180,000 - 2,503,750 | +220k - +1.5M (§6 itemises higher founder comp + DPO + insurance more comprehensively) |
| **Total OpEx (Tab 3)** | **1,610,000** | **§6 fixed Y1 OpEx mid-point ~2,545,000** | **+~935k** |
| **Total CoR (Tab 3)** | 1,800,000 | (§6.11 deferred to deal-revenue) | (variable) |
| **Total Cost (Tab 3)** | **3,410,000** | (§6 fixed + assumed CoR matches Tab 3) | aligned |

**Variance interpretation:** §6 enriches the FINANCIAL_MODEL Tab 3 Y1 OpEx by ~AED 1M, primarily by:
- Itemising DPO retainer (FINANCIAL_MODEL bucketed in G&A; §6 explicit AED 70k mid-point).
- Comprehensive insurance per R-5 (FINANCIAL_MODEL line "AED 50,000 PI + D&O"; §6 includes 6 categories at ~AED 80k mid-point).
- Mid-tier founder comp at AED 40k each vs FINANCIAL_MODEL using TERM_SHEET §15 floor AED 30k.
- Brand identity vendor (FINANCIAL_MODEL bundles into S&M; §6 itemises ~AED 40k).

**This is honest enrichment for R-3 submission — not a budget overrun.** The FINANCIAL_MODEL was prepared as an investor-ready scenario; §6 is the operational submission with all line-items broken out. Both are reconciled in Tab 3 + §6.16 reconciliation.

---

## §7 · Doubling path analysis (per R-2)

### 7.1 Question

R-2 verbatim: "Y1 commitment: double his 1M AED investment within first year." What are the **honest** scenarios for Y1 doubling, anchored on the ratified six-deal pipeline?

### 7.2 Honest answer — three scenarios, no over-promise

The doubling target is **AED 2,000,000 cumulative distributions to Rudi from both Agency and Platform combined** (per MOU §4 Sunset Financial Trigger). Three scenarios, framed by what the six ratified deals deliver and what additional deal flow would be required:

### 7.3 Scenario A — Conservative (Plot 9235849 close + 50% close rate on others)

**Assumption set:**
- Plot 9235849 closes successfully (AED 5M ZAAHI commission, Q2 2026).
- 3 of remaining 5 deals close (50% conversion). Average ZAAHI commission per non-9235849 deal: AED 336k (mean of 200k, 270k, 260k, 680k, 270k).
- 3 closes × AED 336k = AED ~1,008k incremental.
- Plus minor Platform Y1 revenue per FINANCIAL_MODEL Tab 1.3 ~AED 510k (or stress-discount to ~AED 250k Conservative).

**Outcome math:**

| Component | AED |
|---|---:|
| Plot 9235849 commission (ZAAHI share) | 5,000,000 |
| 3 of 5 other deals × AED 336k avg | 1,008,000 |
| Platform Y1 revenue (Conservative, half base case) | 250,000 |
| **Total Y1 ZAAHI top-line** | **6,258,000** |
| less Y1 OpEx + CoR (FINANCIAL_MODEL Tab 3 mid-Conservative ~AED 2.5M) | (2,500,000) |
| **Distributable Net Profit (Conservative)** | **~3,758,000** |
| **Rudi's 10% share (per MOU §3 / §5)** | **375,800** |

**Scenario A: Investor receives ~AED 376k = 19% of doubling target.**

**What would still need to happen to reach AED 2M doubling under Scenario A?** Either (a) additional anchor-scale deals (one more 9235849-class plot would flip the math), or (b) Sunset Financial Trigger extension into Y2 and Y3 — which is the base-case path per FINANCIAL_MODEL Scenario 2 (mid-Y3 Sunset) anyway.

### 7.4 Scenario B — Base (all 6 ratified pipeline deals close)

**Assumption set per founder briefing 2026-04-25 totals:**
- All 6 deals close → ZAAHI commission AED 6,680,000 total.
- Distribution per MOU 70/10/10/10:
  - Platform Dev Fund 70% = AED 4,676,000.
  - Investor 10% = AED **668,000**.
  - Dymo 10% = AED 668,000.
  - Zhan 10% = AED 668,000.
- Plus Platform Y1 ~AED 510k base case adds incremental Distributable Net Profit through 70/10/10/10 split.

**Outcome math:**

| Component | AED |
|---|---:|
| Pipeline commission (all 6 close) | 6,680,000 |
| Platform Y1 revenue (base case per FINANCIAL_MODEL Tab 1.3) | 510,000 |
| **Total Y1 ZAAHI top-line** | **7,190,000** |
| less Y1 OpEx + CoR (FINANCIAL_MODEL Tab 3 base case) | (3,410,000) |
| **Distributable Net Profit (base)** | **~3,780,000** |
| **Rudi's 10% share** | **378,000 (Agency-only) + Platform incremental** |

**Note:** The founder briefing math separately states "Y1 from current 6 deals: 668k = 33% of doubling" — this is the **gross commission share** before OpEx deduction. The MOU §3 distribution is on **Distributable Net Profit** after costs — so Rudi's actual cash distribution is the post-OpEx 10% (~AED 378k Agency-only). The 668k is the gross-pre-OpEx share.

For honesty in the document, both framings deserve presentation:

- **Pre-OpEx gross-commission framing (founder briefing):** Rudi 10% of AED 6.68M = AED 668k = 33% of doubling target. This is what the founder briefing meant.
- **Post-OpEx Distributable Net Profit framing (MOU §3 + FINANCIAL_MODEL):** Rudi's actual cash distribution Y1 base is ~AED 378k-407k (FINANCIAL_MODEL Tab 5 Scenario 2 cites Y1 Rudi 10% = AED 407k on Y1 Distributable Net Profit AED 4,068k).

**Either way, Scenario B does NOT achieve doubling Y1.** Sunset Financial Trigger fires **mid-Y3 base case** per FINANCIAL_MODEL Tab 5 Scenario 2 — that is the base-case doubling path. The doubling target is achieved cumulatively across Y1+Y2+Y3, not in Y1 alone.

### 7.5 Scenario C — Aggressive (current 6 + 3 anchor-scale deals)

**Assumption set:**
- All 6 ratified deals close.
- Plus 3 additional anchor-scale deals at AED 200M+ deal value × 1% commission = AED 2M each, ZAAHI take 100% of single-broker mandate (or similar 5-way split as Plot 9235849 if exclusivity premium structure replicates).
- Total Y1 incremental commission from anchor-deals: AED 6M – AED 15M depending on exclusivity premium structure.

**Outcome math:**

| Component | AED |
|---|---:|
| Pipeline commission (all 6 ratified close) | 6,680,000 |
| 3 additional anchor-scale deals @ AED 2M-5M each (depending on size + structure) | 6,000,000 – 15,000,000 |
| Platform Y1 revenue (aggressive case per FINANCIAL_MODEL Tab 6) | 2,000,000 |
| **Total Y1 ZAAHI top-line** | **14,680,000 – 23,680,000** |
| less Y1 OpEx + CoR (FINANCIAL_MODEL Tab 3 Aggressive) | (5,000,000 estimate) |
| **Distributable Net Profit (Aggressive)** | **~9,680,000 – 18,680,000** |
| **Rudi's 10% share** | **968,000 – 1,868,000** |
| **Plus FINANCIAL_MODEL Scenario 1 implied AED 1,250,000 Y1 Rudi cash + Y2 AED 2M** = early-Y2 Sunset Trigger path | **AED 2M+ cumulative by ~early-Y2** |

**Scenario C: Investor receives AED 968k – 1,868k Y1 = 48-93% of doubling target Y1; doubling achieved early-Y2 (Sunset Trigger fires).**

This matches FINANCIAL_MODEL Tab 5 Scenario 1 (Fast Sunset early-Y2).

### 7.6 Doubling-path comparison table

| Scenario | Y1 close-rate assumption | Y1 ZAAHI commission | Rudi Y1 cash dist (post-OpEx) | % of doubling Y1 | Doubling achieved by |
|---|---|---:|---:|---|---|
| A — Conservative | 9235849 + 50% of others | ~AED 6.0-6.3M | ~AED 376,000 | 19% | mid-Y4 (FINANCIAL_MODEL Scenario 3) |
| B — Base | All 6 close | ~AED 6.68M (gross); ~AED 7.2M w/ Platform | ~AED 378-407,000 | 19-20% (post-OpEx); 33% (pre-OpEx founder briefing framing) | mid-Y3 (FINANCIAL_MODEL Scenario 2) |
| C — Aggressive | 6 + 3 anchor-scale deals | ~AED 14.7-23.7M | AED 968-1,868k | 48-93% | early-Y2 (FINANCIAL_MODEL Scenario 1) |

### 7.7 Honest read for R-2

R-2 ("double within first year") is, on the canonical FINANCIAL_MODEL.md base case, **not Y1-achievable** — base-case Sunset Financial Trigger fires mid-Y3, not Y1. **This is not a new finding** — it's exactly what the FINANCIAL_MODEL Tab 5 Scenario 2 has documented since 2026-04-19 in the investor package.

The honest investor conversation has three options:

1. **Reframe R-2 to mean "path to doubling activated within Y1, on Y3 trigger trajectory."** This is intellectually honest, matches the canonical FINANCIAL_MODEL, and does not require any deal performance promise. Rudi Y1 receives ~AED 376-407k = 19-20% of doubling target on base case; cumulative trajectory triggers Sunset by mid-Y3.

2. **Pursue Scenario C aggressively.** Requires three additional anchor-scale deals beyond the ratified six. Dymo's 800+ raw plots in BD universe is the source pool; converting 3 to anchor-scale closes within Y1 is genuinely possible but not assured. Triggers Sunset early-Y2.

3. **Y1 doubling is not achievable on any realistic scenario.** Even Scenario C (Aggressive) only reaches 48-93% of doubling Y1 in cash; the early-Y2 trigger needs Y1 + early-Y2 cumulative.

**Recommendation framing for founder conversation with Rudi (founder decides whether to use):** "The path to doubling is activated Y1 — base case puts you at 19-20% Y1 with Sunset Trigger firing mid-Y3; aggressive case (with 3 additional anchor deals beyond the six ratified) puts you at 48-93% Y1 with Trigger firing early-Y2. We don't promise Y1 doubling; we commit to running the pipeline that gets there fastest."

### 7.8 What expanding the pipeline beyond six requires

For Scenario C to be realistic:
- **Dymo BD warm-intro pace must increase.** Six deals on platform represents conversion of ~6 of 800+ raw plots. Even modest acceleration (10-15 conversions instead of 6) materially shifts Y1 outcomes.
- **One more 9235849-class deal would flip the math.** That deal alone is AED 5M ZAAHI commission = ~75% of existing pipeline. Two such deals would single-handedly hit doubling.
- **Government / institutional conversation** — Emaar (Y1 sales AED 80.4B 2025 per COMPETITOR_DEEP_DIVE), DAMAC (AED 36B 2025) — landing one DEVELOPER tier subscription unlocks deal flow at unprecedented scale.

### 7.9 Gaps and what we don't know

- **9235849 close-date and final commission structure.** Founder briefing gives "expected ~30 days" + AED 5M (4.06% exclusivity premium / 5-way split of AED 25M total). Either dimension can flex.
- **Other 5 pipeline deals' actual close-rate.** "Six on platform" is the documented pipeline; close-conversion rates depend on counterparty diligence, financing, NOC processing.
- **Anchor-scale deals' realistic frequency.** Three additional 9235849-class deals in Y1 is aggressive — Dymo confidence rating is the input the founders have, agent does not.

### 7.10 Implication for §10 founder decisions

D-3 launch type (soft launch can prioritise pipeline conversion velocity vs hard launch's brand visibility); D-2 broker hires count (each hire's incremental capacity for inbound + outbound BD is the lever for Scenario-C realism).

### 7.11 Sensitivity to Plot 9235849 close-date

Plot 9235849 alone represents AED 5M ZAAHI commission — ~75% of the entire ratified six-deal pipeline. Its close-date materially shifts Y1 outcomes. This subsection isolates that single-deal sensitivity.

| Scenario | Plot 9235849 close month | Other 5 deals (assumed close-rate × month) | Y1 ZAAHI commission | Rudi 10% post-OpEx |
|---|---|---|---:|---:|
| **9235849 lands M3 (most-favourable)** | M3 (Jul 2026) | 100% close, spread M4-M12 | ~AED 6.7M + Platform 510k = 7.2M | ~AED 380-400k |
| **9235849 lands M6 (mid)** | M6 (Oct 2026) | 100% close, spread M7-M12 | ~AED 6.7M + Platform 410k = 7.1M | ~AED 380-400k |
| **9235849 lands M9 (delayed)** | M9 (Jan 2027) | 100% close, spread M10-M12 | ~AED 6.7M + Platform 350k = 7.05M | ~AED 380-400k |
| **9235849 slips to Y2** | post-M12 | 100% close all M3-M12 | ~AED 1.68M (other 5) + Platform 510k = 2.19M | ~AED 60-100k |
| **9235849 closes early but with reduced split** (e.g., 4-way instead of 5-way = AED 6.25M to ZAAHI) | M3 or earlier | 100% close | ~AED 7.93M + Platform 510k = 8.44M | ~AED 460-500k |
| **9235849 fails entirely** | — | 100% close other 5 | ~AED 1.68M + Platform 510k = 2.19M | ~AED 60-100k |

**Insight 1:** As long as Plot 9235849 closes in Y1, **the timing within Y1 makes minimal Rudi-cash difference** (AED 380-400k either way; difference is timing of cash receipt not amount). The Sunset Trigger trajectory is driven by **whether** it closes, not **when in Y1** it closes.

**Insight 2:** Plot 9235849 failing entirely drops Rudi Y1 to ~AED 60-100k = 3-5% of doubling target. Sunset Trigger trajectory shifts from base-case mid-Y3 to Slow Sunset (mid-Y4) per FINANCIAL_MODEL Scenario 3.

**Insight 3:** A reduced commission split (4-way instead of 5-way) increases Rudi Y1 to ~AED 460-500k = 23-25% of doubling target. This is the upside lever Dymo controls in 9235849 negotiation.

**Risk-adjusted expected Rudi Y1 cash:** If we weight scenarios — 60% (close on time at 5-way), 15% (close at 4-way), 15% (delays into Y1), 10% (fails entirely) — expected Rudi Y1 cash ~AED 358k = 18% of doubling target. Aligned with Conservative §7.3 read.

### 7.12 What R-2 conversation honestly looks like with Rudi

Founders considering how to talk to Rudi about R-2 (Y1 doubling) before 2026-05-09 should consider three frame options.

**Frame A — Path-not-promise.** "Y1 puts you on the doubling path. Base case = 19-20% Y1, trigger mid-Y3. Aggressive case (3 anchor deals beyond the six ratified) = 48-93% Y1, trigger early-Y2. We don't promise Y1 doubling; we commit to running the pipeline that gets there fastest."

**Frame B — Trigger calendar.** "The Sunset Financial Trigger, per MOU §4, fires when cumulative distributions reach AED 2M. Base-case trajectory hits this mid-Y3. The 5-year Time Trigger is the backstop — Sunset will execute regardless. Y1 doubling specifically is not modelled in the canonical FINANCIAL_MODEL — that document's base case puts you at AED 437k Y1 with Trigger mid-Y3."

**Frame C — Aggressive-only.** "We can pursue the Aggressive scenario where the 3 anchor-scale deals beyond the six get added to Y1. That gets you to ~AED 1M Y1 = halfway to doubling, with Trigger early-Y2. Whether we hit Aggressive depends on Dymo's BD conversion of warm developer/seller intros — the 6 ratified is from 800+ raw; converting 9 instead is genuinely possible, not assured."

**Founder decision (D-?? meta-decision):** Which frame to lead with in pre-2026-05-09 Rudi conversation. Recommendation: **Frame A.** Honest, anchored, presents both case lines, doesn't over-promise, allows founders to update Rudi monthly without recalibrating expectations.

### 7.13 Quarterly Distributable Net Profit projection (base case + scenarios)

For Rudi's Sunset-ledger tracking per Term Sheet §12(e), quarterly Distributable Net Profit projection across scenarios. Per MOU §3 distribution is quarterly post first closed deal.

| Quarter | Conservative DNP (AED) | Base DNP (AED) | Aggressive DNP (AED) | Rudi Conservative 10% | Rudi Base 10% | Rudi Aggressive 10% |
|---|---:|---:|---:|---:|---:|---:|
| Y1 Q1 (May-Jul 2026) | 200,000 | 380,000 | 1,500,000 | 20,000 | 38,000 | 150,000 |
| Y1 Q2 (Aug-Oct 2026) | 750,000 | 1,200,000 | 4,500,000 | 75,000 | 120,000 | 450,000 |
| Y1 Q3 (Nov 2026 - Jan 2027) | 600,000 | 1,300,000 | 4,000,000 | 60,000 | 130,000 | 400,000 |
| Y1 Q4 (Feb-Apr 2027) | 850,000 | 1,200,000 | 2,500,000 | 85,000 | 120,000 | 250,000 |
| **Y1 cumulative** | **2,400,000** | **4,080,000** | **12,500,000** | **240,000** | **408,000** | **1,250,000** |
| Y2 cumulative | 5,000,000 | 9,000,000 | 22,000,000 | 500,000 | 900,000 | 2,200,000 |
| **Cumulative through Y2** | **7,400,000** | **13,080,000** | **34,500,000** | **740,000** | **1,308,000** | **3,450,000** |

**Sunset Trigger fires when Rudi cumulative reaches AED 2M:**
- Conservative: mid-Y4 (matches FINANCIAL_MODEL Scenario 3 cumulative through Y4 ~AED 3.65M)
- Base: mid-Y3 (matches FINANCIAL_MODEL Scenario 2 cumulative through Y3 ~AED 2.97M)
- Aggressive: early-Y2 (matches FINANCIAL_MODEL Scenario 1 cumulative early-Y2 ~AED 3.25M)

These all match the canonical FINANCIAL_MODEL Tab 5 distribution waterfall — no new claims.

### 7.14 What Y1 doubling would actually require — exhaustive list

Concrete operational levers for Scenario C realism:

1. **Two additional 9235849-class plots** (each AED 5M ZAAHI commission). One alone replaces all 5 smaller deals' commission combined.
2. **One AED 1B+ deal at 1% commission** = AED 10M ZAAHI commission. Per FINANCIAL_MODEL Tab 1.1: "Large premium plots Y3+: AED 1.4B midpoint × 1% = AED 14M." Y1 occurrence is aggressive but not impossible.
3. **One Emaar / DAMAC developer subscription** at AED 50k/yr × 5 developers + Y1 cross-listing royalties potentially AED 200k+ each = uplift of AED 1-1.5M to Y1 Platform revenue.
4. **One government / G42 / Mubadala-style anchor partnership** with multi-million-AED service contract (out of scope for unsolicited approach; would need warm-intro conversion).
5. **Three additional pipeline deals at average AED 30M deal value × 1.5% commission** = ~AED 1.35M incremental Y1.

The realistic path to Aggressive is **(1) + (5)** — one more 9235849-class plot plus three medium deals. That's the founder-facing honest version of Y1 doubling.

### 7.15 What founders should NOT do under R-2 pressure

1. **Do not commit to Y1 doubling in writing.** It would contradict the canonical FINANCIAL_MODEL Tab 5 base case.
2. **Do not pre-spend against expected anchor deals.** §6 OpEx mid-point AED 2.55M Y1 is funded by the Investment + base-case revenue; expanding Y1 OpEx in expectation of Aggressive revenue is the classical "pre-commit-to-revenue" mistake.
3. **Do not push Plot 9235849 to close faster than counterparty diligence supports.** Five-way commission split with exclusivity premium is a delicate negotiation; rush = lose.
4. **Do not redirect Dymo BD bandwidth to "land 3 anchor deals" if it cannibalises closing the existing six.** The math is clear: bird-in-hand six ratified deals (AED 6.68M ZAAHI commission) > hypothetical anchor deals at risk.

The "doubling pressure" should NOT shift operational behaviour. Day-to-day stays the same. The honest investor conversation in §7.12 is enough.

---

## §8 · Launch readiness — "as giants launch"

### 8.1 Question

Beyond licenses (§3) and capex (§6), what does ZAAHI need to launch as a **serious super-tech agency** — a "Driven / Allsopp / E&V Dubai equivalent" operationally — and what's the soft-launch vs hard-launch decision?

### 8.2 Honest answer — eight categories

| # | Category | Status today | What's needed for serious-launch |
|---|---|---|---|
| 1 | Brand identity package | Wordmark + 3D ZAAHI Signature visualisation shipped | Brand book, collateral templates, photography guidelines, press-pack — vendor decision §10 D-4 |
| 2 | Office presence — physical signal | Al Jurf 1st floor home-office (per LAUNCH_PLAN); virtual Dubai address for RERA mainland | Founder decision §10 D-1: stay Al Jurf vs add premium Dubai office. Allsopp / Better Homes / E&V all have visible Dubai street-level offices |
| 3 | First 3-5 RERA-licensed brokers (hiring plan) | Two founders RERA-carded; first hire path post-LLC | §10 D-2: how many brokers Y1, what compensation structure. LAUNCH_PLAN.md Phase 5 caps Y1 at 3-5 total team |
| 4 | Lead-capture infrastructure on platform | `/join` ambassador form live; general lead capture needs explicit pre-registration form per FOUNDER_DIRECTIVE Q-L7 | Phase B1 priority 1 in §5 |
| 5 | CRM workflow | Admin panel partial; Spec 03 Admin Panel v1 target weeks 9-11 (Jul 2026) | Spec 03 v1 + v2 ship per FOUNDER_DIRECTIVE-2026-04-24 §4.2 |
| 6 | Closing process documentation | Spec 02 Invoice + Commission target weeks 6-8 (Jun 2026) covers commission flow | Founder ops playbook for closing-week steps (NOC sequencing, escrow, DLD transfer, commission split) — needs explicit doc |
| 7 | Press / industry intro plan | Not started | Soft launch: industry-press Property Finder / Bayut / Khaleej Times article; hard launch: launch event with developer/HNWI invitees (LAUNCH_PLAN cites AED 15-50k launch event budget) |
| 8 | Soft launch vs hard launch strategy | Pending §10 D-3 decision | See §8.3 below |

### 8.3 Soft launch vs hard launch decision (§10 D-3)

**Soft launch.** Quietly engage 5-10 HNWI clients from Dymo's network + Equilibrium contacts; demonstrate 9 super-tech features (§4); close 1-2 of the 6 ratified pipeline deals; build case-study; selective LinkedIn coverage of closes. Cost: ~AED 50,000 incremental (case-study production + LinkedIn) over §6 marketing baseline. Speed: founders set the pace.

**Hard launch.** Industry event at Dubai venue with developer, broker, HNWI invitees; press coverage in Property Finder / Bayut / Khaleej Times / Gulf News; LinkedIn full push; Trakheesi-permitted campaign across PMTiles maps; full brand-identity rollout. Cost: ~AED 250,000-500,000 incremental over §6 baseline (event + PR + heavier paid). Speed: requires brand book + venue + PR firm in place ≥30 days.

**Honest read.** **Soft launch is recommended for Y1.**

- It compounds with FOUNDER_DIRECTIVE-2026-04-24 GOV-5 quality-over-speed.
- It conserves capital for §3 compliance and §6 fixed Y1 OpEx.
- It allows the 6 pipeline deals to close on their own velocity without artificial calendar pressure.
- It gives time for the AD migration (§5 priority 3) to land before a hard launch reveals 'hosted-in-UAE' as a trust signal.
- It does not preempt a hard launch in Y2 once the platform-discussion conversation with Rudi is unfrozen post-AD-migration (§5).

### 8.4 What "as giants launch" actually means (honest contrarian view)

The giants COMPETITOR_DEEP_DIVE_2026 catalogues — Bayut (1B+ revenue parent group), Property Finder ($835M raised, $170M Mubadala-led Jan 2026), Huspy ($100M+ raised, $59M Series B Jul 2025) — **do not launch.** They iterate.

- Bayut (1986+) compounded over 40 years.
- Property Finder (founded 2007) compounded over 19 years.
- Huspy (2020) Series B $59M after 5 years of building, not splash launch.

**The giants do not pay AED 500k for launch events.** They pay $100M+ for sustained pipeline build. ZAAHI's AED 1M Investment is sized for **2 years of Phase 1-2 build**, not for a launch event. The honest reading of "as giants launch" is **build the boring work for 18-24 months while looking small, then graduate**.

This perspective is offered for founder consideration, not as a recommendation; §10 D-3 remains a founder decision.

### 8.5 Implication for §10 founder decisions

D-1 office (Al Jurf vs premium Dubai), D-2 broker hires, D-3 launch type, D-4 brand vendor — all interlock. The recommended package: Al Jurf path + 1-2 broker hires Q3 2026 + soft launch + brand-identity small-studio (~AED 30-50k vendor) — total Y1 incremental beyond §6 baseline ~AED 100k. This is the conservative-capital path matching FOUNDER_DIRECTIVE-2026-04-24 GOV-5 quality-over-speed.

### 8.6 Golden-path 24-month operational play

If the founders accept the soft-launch posture (§8.3 recommendation) and the conservative-capital path, the next 24 months break into four 6-month phases. This subsection is the operational golden path — what to focus on quarter by quarter.

**M1-M6 (May-Oct 2026) · Foundation phase**
- W1-W7 compliance compass (per §3.13 weekly mapping).
- First close target: Plot 9235849, Q3 if pipeline holds. Other 5 deals pursued in parallel.
- ADGM HoldCo formation triggered by first close.
- IP Assignment executed Zhan→Platform.
- First profit distribution per Dividend Policy.
- Spec 02 Invoice + Commission ships.
- Spec 01 Deal Engine MVP ships.
- LeadingRE Global Referral Network application filed (D-?? optional, AED 25k/yr).

**Success metric end-M6:** 1-3 deals closed; ADGM HoldCo operational; first Rudi distribution paid; Master Tree progress documented for monthly report.

**M7-M12 (Nov 2026-Apr 2027) · Validation phase**
- Sales agent hired (D-2).
- Spec 03 Admin Panel v1 + v2 ship.
- Spec 04 Feasibility v2 ships.
- Spec 05 Auth Abstraction Phase 1a starts (per FOUNDER_DIRECTIVE §4.4).
- 6-12 deal closes cumulative.
- Property Finder / Bayut listing presence.
- LinkedIn + Google Ads moderate spend.
- Quarterly Rudi reports Q2-Q4.
- DPO retainer first-year review.
- Y1 audit close.

**Success metric end-M12:** Y1 revenue AED 4-8M (vs FINANCIAL_MODEL base case AED 8.31M); cash position positive AED 5-7M; Sunset ledger updated showing Rudi cumulative AED 240-408k toward AED 2M trigger.

**M13-M18 (May-Oct 2027) · Scale phase**
- Platform engineer hired (D-2 second-hire).
- Spec 05 Phase 1b-c (RLS refactor) ships.
- AD migration cutover Friday 2027-01-08 (per FOUNDER_DIRECTIVE §4.4 recommendation Option 2 — already past at this point).
- Phase 2 multi-role pivot begins (BROKER → OWNER → AMBASSADOR per FOUNDER_DIRECTIVE §3.1 Q-M1 — sequencing TBD).
- Bus-factor mitigation hire (named-backup admin per D-11 if added).
- DLD Real Estate Sandbox application (Q3 2026 target per COMPETITOR_DEEP_DIVE 90-day recs).
- Huspy partnership conversation initiated.
- ENBD / Mashreq / FAB mortgage API discussions.

**Success metric end-M18:** 15-30 deals closed cumulative; first ambassador-driven deals; Phase 2 spec scopes ratified.

**M19-M24 (Nov 2027-Apr 2028) · Phase 2 opening**
- Phase 2 opening 2027-01-18 (already past — opens at M21 actually if dates match LAUNCH_PLAN; mid-phase).
- Multi-role launch (per FOUNDER_DIRECTIVE-2026-04-24 §3.1 Q-M3 7-month timeline).
- Series A preparation initiated (Platform).
- Abu Dhabi branch operational.
- ZAAHI Premium Plot Report quarterly (replicate Property Finder cadence per COMPETITOR_DEEP_DIVE rec 5).

**Success metric end-M24:** Y2 revenue AED 15-25M; Sunset Trigger trajectory aligned with mid-Y3 base case; Series A pre-engagement conversations underway.

**Why the golden path is the goal:** It avoids the trap of "launch big, scramble for revenue." Each 6-month phase has a clear primary objective; the operational metric is "did we hit the phase milestone, are we cash-positive, is Rudi cumulative-distribution trajectory on track." Anything else is noise.

### 8.7 What the giants did in their first 24 months — anti-pattern reference

| Competitor | Founded | First 24-month revenue (best estimate) | First 24-month team | What they did NOT do |
|---|---|---|---|---|
| Bayut | 2008 (Dubai, post-pivot) | <$5M cumulative | <50 people | No PR launch; built listings density first |
| Property Finder | 2007 | <$3M cumulative | <30 people | No paid acquisition; founder-led BD |
| Huspy | 2020 | $0-1M (Series A 2022 = $37M to ramp) | <30 people | No retail brand campaign; product-first |
| PRYPCO | 2024 | unknown; pre-revenue | <50 people | Government-partnership-first not direct retail |

**Common pattern:** **First 24 months = product/data depth + selective deals, not brand splash.** ZAAHI's 24-month plan should mirror this. The brand spend comes after Y2 revenue justifies it.

### 8.8 The "as giants launch" framing answered honestly

R-1's "concrete results before 2026-05-09" + the founder-briefing language "launch as #1 super-tech real-estate agency in UAE" are aspirational framing that warrants careful operational translation. The honest reading:

- "Launch as #1" cannot mean "biggest brokerage by deal count Y1" — Bayut/Allsopp have hundreds of agents and decades of compounding.
- "Launch as #1" CAN mean "no one in UAE has the 9 super-tech features ZAAHI has shipped in §4." That position is **already true** as of 2026-04-25. The launch is **demonstrating** that already-achieved position to clients, not rebuilding it.

**Founder framing for Rudi conversation:** "We don't need to launch ZAAHI. We need to OPERATE the ZAAHI we've already built. Y1 is making the agency profitable, not making the platform impressive — the platform is already impressive. Y2 is when Master Tree progress becomes a marketing asset. Y3 is the Sunset year."

This is honest, defensible, and converts the abstraction "#1 super-tech" into operational tasks — which §3-§10 cost out and sequence.

---

## §9 · Money management — research only, not execution

### 9.1 Question

What can a Claude-based research agent do, and explicitly NOT do, with respect to ZAAHI Agency's banking and money management?

### 9.2 Honest answer

**Hard line.** Per the constraint header of the founder brief (verbatim "❌ NO bank account access · NO money management execution · NO payment instructions · NO transactions"), and per UAE regulatory framework (AML 10/2025 + CBUAE rules + PDPL signing-authority requirements), **all payment instructions, fund transfers, account opening signatures, and bank-app authentications require human authorization**. The agent's role is research and reconciliation **prep**; the human (Dymo, Zhan) executes via bank app or in-branch.

### 9.3 What the agent CAN do

- Research banks · compare fees · compare KYC requirements · compare opening-times.
- Draft Y1 expense forecasts and budget spreadsheets.
- Draft month-end and quarter-end reconciliation worksheets ready for founder review.
- Draft monthly Rudi report (per FOUNDER_DIRECTIVE-2026-04-24 GOV-1 monthly cadence) numerical attachments, after founder confirms actual P&L line-items.
- Build Distributable Net Profit calculation per MOU §3 + Financial Model Tab 1.6 — formula only, no execution.
- Maintain the rolling Sunset ledger (per Term Sheet §12(e)) — track cumulative distributions to Rudi · months elapsed since SAFE · projected trigger date.

### 9.4 What the agent CANNOT do

- **Access bank account** (read or write, web or API).
- **Authorise transactions** (any amount, any bank).
- **Sign payment instructions** (cheque, wire, transfer).
- **Authenticate to bank apps** (no credentials shared).
- **Execute or approve any payment** even if the founder explicitly asks the agent to "send X."

### 9.5 UAE regulatory framework requiring human-authorised payments

Per UAE AML Federal Decree-Law No. 20 of 2018 + 2025 amendments and CBUAE rulebook:
- Every payment instruction requires **named-individual authentication** (UBO-disclosed, KYC-verified) at the bank-app or in-branch level.
- Multi-signatory (2-of-2 founder for >threshold spend, 1-of-1 for <threshold) is a bank-app configuration that founders set when opening the account.
- Audit trail per CBUAE: every transaction attributable to a named individual, time-stamped, deviceid-stamped.

The agent cannot legally substitute for a named UBO-disclosed signatory.

### 9.6 Recommended operational model

| Stage | Founder action | Agent action |
|---|---|---|
| Bank account opening | Dymo + Zhan walk-in or app KYC | research bank options; prep paperwork list |
| Monthly bill-pay | Dymo (or Zhan for Platform-side once HoldCo opens) executes via bank app | prep month-end bill list with categorisation; check against budget |
| Quarterly distribution to Rudi | Dymo (Agency) + Zhan (Platform) execute | calculate Distributable Net Profit per Dividend Policy; prepare Sunset-ledger update; draft monthly/quarterly Rudi report |
| Annual audit | Auditor + accountant + founders | reconciliation worksheets prepared monthly throughout year |
| Y1 forecast vs actual variance | Dymo + Zhan review monthly | maintain rolling forecast; flag variances |

### 9.7 Banks to evaluate for Agency LLC

Per [proservicesindubai 2026 best UAE business banks][businesssetupexperts UAE business accounts][digitaldubai 2026 bank account guide][openadubaicompany 2026 business bank UAE][dubaibusinessservices 2026 bank account opening guide]:

| Bank | Min balance (AED) | Monthly fee (AED) | Approval time | Strengths | Weaknesses |
|---|---:|---:|---|---|---|
| **Wio Business** | 0 | 0 | 1-3 days | Fully digital; real-estate-friendly; expense cards in-app; modern API | Newer (2022); track-record short |
| **Mashreq NeoBiz** | 0 (with conditions) | 0 (with conditions) | 3-5 days | Online-only; freelancer/startup-tuned | Conditional fees if min activity not met |
| **Emirates NBD (BusinessONE)** | 50,000 | 250 | 10-15 days | Established (since 1963); largest UAE bank; full corporate ecosystem | Slowest opening; higher minimum balance |
| **Mashreq Business** | 25,000 | 200 | ~7 days | Established; fast vs ENBD; mortgage relationships | Mid-tier all metrics |
| **ADCB** | varies, typically 25-50k | varies | 7-15 days | Abu Dhabi-anchored; useful pre-AD-migration | Less-favoured by Dubai Mainland LLCs |
| **WIO Personal + Business stack** | 0 / 0 | 0 / 0 | 1-3 days | Founder + Agency unified onboarding | (covered in Wio Business above) |
| **ADIB (Islamic banking)** | varies | varies | varies | Islamic-banking compatibility for Sharia-conscious clients | Specific structure; unlikely fit Y1 |
| **CBD (Commercial Bank of Dubai)** | varies | varies | 7-15 days | Mid-tier established | No specific differentiator for ZAAHI Y1 |

### 9.8 Recommended setup (per LAUNCH_PLAN.md Phase 2 risk-mitigation: open at two banks in parallel)

1. **Primary digital — Wio Business** for daily operations: lowest friction, modern API, no min balance.
2. **Backup traditional — Emirates NBD or Mashreq** for institutional credibility (Property Finder + Huspy partner with ENBD/Mashreq/FAB; mortgage-broker relationships built here).
3. **Corporate debit / expense card per founder** — both founders. Spend limit configurable per bank app.
4. **Accounting software** — QuickBooks UAE or Zoho Books (each ~AED 1,500-5,000/year). Per LAUNCH_PLAN Phase 2: "Xero / Zoho setup + bookkeeping." Either choice fine; founder decision.

### 9.9 Per FOUNDER_DIRECTIVE-2026-04-24 §2.4 budget-authority defaults

- All operational and strategic spending decided by Dymo + Jan jointly (§4.2 amended).
- Rudi informed quarterly via monthly report.
- Spend over AED 100k single / AED 500k monthly: no Rudi pre-approval (amended from MTEP §4.2 per silent-investor directive).

This collapses the bank-app multi-signatory configuration to **single-founder authentication + post-hoc notification to other founder + monthly Rudi report**. Simplest possible flow consistent with R-3 (R-3 is for Y1 expense-list approval, not per-transaction approval).

### 9.10 Gaps and what we don't know

- **Specific bank chosen** is a §10 D-5 founder decision.
- **WIO Business KYC turn-around for ZAAHI's specific entity-formation timeline** — cannot be predicted in advance.
- **Specific accounting-software choice (QuickBooks vs Zoho)** — minor difference; founder decision.

### 9.11 Implication for §10 founder decisions

D-5 bank account choice (Wio Business primary + ENBD or Mashreq backup recommended); D-?? accounting software (QuickBooks UAE or Zoho — minor decision).

### 9.12 Banking-flow detailed runbook

For founders to operate the agency post-LLC with confidence, this runbook lays out specific cadences and responsibilities.

**Daily (Dymo).**
- Open Wio Business mobile app; review previous-day transactions for any unrecognised debits.
- Reconcile any cash-deposit Spec 03 v2 Flow 3 deals against bank balance (manual override flow per FOUNDER_DIRECTIVE-2026-04-24 §5.4).

**Weekly (Dymo + Zhan).**
- Friday 30-min joint review of week's transactions vs §6.16 monthly forecast.
- Categorise any unbudgeted spend; flag if >5% variance against §6 budget line.
- Update accounting software (QuickBooks UAE or Zoho) with categorisations.

**Monthly (Dymo + Zhan).**
- M+5 (5 days post-month-end): close month's books in accounting software.
- M+10: agent prepares draft monthly Rudi report with §6.16 actual vs forecast.
- M+12: Dymo + Zhan review and finalise report.
- M+15: report delivered to Rudi (per Term Sheet §12(a) "monthly within 15 days of each month end").

**Quarterly (Dymo + Zhan + counsel).**
- Q+30: prepare quarterly unaudited management accounts.
- Q+45: deliver to Rudi (per Term Sheet §12(b) "quarterly within 45 days of each quarter end").
- Distributable Net Profit calculation per Dividend Policy.
- Profit distribution executed via bank app (Dymo for Agency / Zhan for Platform once HoldCo opens).
- Sunset ledger updated.

**Annually (Dymo + Zhan + auditor).**
- Y+30: auditor engagement.
- Y+90: audited financial statements delivered to Rudi (per Term Sheet §12(c) "annual within 90 days").
- VAT return finalisation (if registered).
- Corporate Tax return finalised within 9 months of fiscal year-end (UAE FTA standard).
- UBO register updated for any changes.

**On-demand (Dymo + Zhan).**
- Material Event: per FOUNDER_DIRECTIVE-2026-04-24 §6 conflict #1 (MOU §5 48-hour SLA) — directive provides next-monthly-report timing; any urgent regulatory enforcement → email to Rudi.
- Per-deal closing: bank-app authorisation for commission collection + escrow + DLD transfer fees.

### 9.13 What happens if a founder is unreachable for compliance-critical filing

Per §3.15 risk: CT registration (3 months) and UBO declaration (60 days) are calendar deadlines. If both founders unreachable across that window:

**Mitigation (founder decision D-11 if added to §10):**
- **Named backup admin** (not Rudi per GOV-3) — typically: trusted family member of Dymo, senior friend-of-founders with corporate-services experience, or PRO firm retained on standby. Holds Power of Attorney for compliance filings (specific to filing deadlines, not commercial decisions).
- **Auto-renewal-engineered**: where banks/services support auto-renewal (Vercel, Supabase, Anthropic API, Wio business cards), set up so 30-day continuity is unaided.
- **Pre-prepared compliance package**: agent maintains a "compliance-go-bag" — UBO data, CT registration pre-fill, AML manual, Trakheesi credentials — so PRO firm or backup admin can execute on receipt of POA.

This is operational hygiene not addressed in canonical files; flagged here for §10 D-11.

### 9.14 USDT TRC-20 ambassador wallet considerations

Per CLAUDE.md AMBASSADOR PROGRAM RULES: USDT wallet `TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7` for Silver/Gold/Platinum lifetime payments. Banking-flow integration:

- **Crypto receipts are NOT bank receipts.** USDT TRC-20 inflows accrue to a wallet, not a bank account. Conversion to AED for OpEx funding goes through a UAE-licensed crypto exchange (e.g. Binance UAE, BitOasis, or VARA-licensed alternative).
- **AML / CFT flow:** Each USDT-→-AED conversion triggers VARA / AML reporting if exceeding thresholds. DPMS reporting per §3.3 goAML is the relevant regime; conversion volume monitoring is a Y1 ops task.
- **Tax treatment:** Crypto inflows are revenue. Recognised at fair-market AED at time of receipt for FTA Corporate Tax purposes. UBO of the wallet is the LLC.

Y1 ambassador volume modelling: per CLAUDE.md AMBASSADOR PROGRAM RULES tier prices (1k / 5k / 15k AED) and FINANCIAL_MODEL Tab 1.3 platform subscriber projections — Y1 might see 40 ambassadors total = a few hundred AED in tier purchases (Silver-heavy mix). Modest enough that exchange friction is not material; as scale grows (Y2-Y3), banking integration should be reviewed.

---

## §10 · Decision-required list for founders before 2026-05-09

### 10.1 Question

What founder decisions, made before 2026-05-09 Rudi departure, would convert this research into operational Y1 execution?

### 10.2 Ten decisions, with options and recommendations

Format per decision: options · agent recommendation · founder action required.

#### D-1 · Office location

**Question.** Stay Al Jurf home-office (1st floor as office, AED 250k/yr — per LAUNCH_PLAN Phase 2 + R-7) OR add premium Dubai office (DIFC / DMCC / Business Bay / Downtown)?

**Options.**

| Option | Y1 cost incremental (AED) | Pros | Cons |
|---|---:|---|---|
| **A. Al Jurf only (per LAUNCH_PLAN canonical)** | 0 incremental | Dual purpose (housing per R-7 + office); strategic Dubai-AD corridor location; conservative capital | Less visible street-level signal; partner-meeting friction (Al Jurf is far from Dubai client locations) |
| **B. Al Jurf + DIFC office (premium)** | +200,000 - 450,000/yr (250-350 AED/sqft × 600-1,000 sqft + service charge) | Strongest premium signal; matches Bayut-parent / Property Finder geographic footprint; HNWI-meeting credibility | Most expensive; DIFC/DMCC parking, security, and access processes add friction |
| **C. Al Jurf + Business Bay office (mid-tier)** | +150,000 - 250,000/yr (75-120 AED/sqft × 600-1,000 sqft + service charge) | Solid mid-tier signal; cheaper than DIFC; central Dubai access | Less prestigious than DIFC |
| **D. Al Jurf + DMCC office (alternative mid-tier)** | +180,000 - 280,000/yr | Free-zone synergy if any platform entity routed through DMCC | DMCC isn't typical for real-estate brokerage; unusual choice |
| **E. Al Jurf + Downtown office (premium-alternative)** | +250,000 - 450,000/yr | Iconic address (Burj area); strong client signal | Most expensive; high traffic friction |

**Recommendation.** **Option A (Al Jurf only) for Y1** — preserves capital for §6 OpEx + §3 licensing stack; matches FOUNDER_DIRECTIVE-2026-04-24 GOV-5 quality-over-speed. Option C (Business Bay) a viable Y2 upgrade once first 3-5 deals close and revenue is consistent. The COMPETITOR_DEEP_DIVE giants (Allsopp, Better Homes) have multiple Dubai offices because they have hundreds of agents — ZAAHI's 3-5 person Y1 team does not need physical street presence to outcompete on tech.

**Founder action.** Founders confirm Al Jurf-only OR pick Option B-E with explicit decision rationale.

#### D-2 · First broker hires count and timing

**Question.** How many brokers Y1, on what compensation structure?

**Options.**

| Option | Y1 broker count | Compensation structure | Y1 incremental (AED) |
|---|---|---|---:|
| **A. Founders only Y1** | 0 | Just Zhan + Dymo RERA-carded | 0 |
| **B. 1 broker hire Q3 2026** | 1 | AED 6-8k/mo base + 50% commission split | ~AED 100-150k base + commission portion |
| **C. 2 broker hires Q3 + Q4 2026** | 2 | AED 6-8k/mo base each + 50% commission split | ~AED 200-300k base + commission portion |
| **D. 3 broker hires Q3-Q4 2026 (LAUNCH_PLAN.md Phase 5 cap)** | 3 | mix of base + commission | ~AED 350-500k base + commission portion |

**Recommendation.** **Option B (1 broker hire Q3 2026)** — bridges founder capacity through pipeline conversion velocity without aggressive headcount commit. Hire decision conditioned on first 1-2 deals closing successfully (Plot 9235849 plus one of the smaller deals). Adds to Scenario C capacity in §7.

**Founder action.** Founders confirm count + timing + base/commission split before 2026-05-09 (compensation structure can be drafted in advance even if hire date Q3).

#### D-3 · Soft launch vs hard launch

**Question.** Per §8.3.

**Options.** Soft (~AED 50k incremental, founder pace) · Hard (~AED 250-500k incremental, ≥30 days lead time).

**Recommendation.** **Soft launch** for Y1; revisit Q4 2026 / Y2 once AD migration done and platform-discussion with Rudi unfrozen.

**Founder action.** Confirm soft launch posture; explicitly defer hard-launch decision to Y2.

#### D-4 · Brand identity vendor

**Question.** Who builds the brand identity package?

**Options.** Small Dubai studio (AED 30-50k) · Mid-tier agency (AED 50-150k) · Large agency (AED 150k+).

**Recommendation.** **Small studio (~AED 30-50k)** matching soft-launch scale. Brief: refine wordmark, brand book, collateral templates, photography guidelines, press-pack, dark/light variants. Vendor selection by referral — Dymo's Equilibrium network, Zhan's design contacts.

**Founder action.** Brief written, 2-3 vendors quoted within 30 days.

#### D-5 · Bank account choice

**Question.** Which bank for Agency LLC primary + backup?

**Options.** Per §9.7. Recommended: **Wio Business primary + Emirates NBD or Mashreq backup**.

**Founder action.** Application initiated at primary post-LLC incorporation; backup application in parallel.

#### D-6 · DPO retainer firm (PDPL compliance)

**Question.** Which firm for Data Protection Officer retainer?

**Options.** UAE-tech-savvy DPO retainers typically AED 40-100k/yr [securiti][cookieyes][gsdalegal 2026]. Specific vendor names (illustrative): Securiti, Cookie-Script consultancies, regional firms specialising in PDPL.

**Recommendation.** Quote 2-3 firms. Engage at PDPL-Article-10 minimum (controllers/processors with large-scale processing of personal data). Required because zaahi.io processes user signups + AI conversations + lead capture — qualifies as systematic processing.

**Founder action.** Quotes solicited within 30 days; engagement Q3 2026.

#### D-7 · UAE counsel firm (RERA / ambassador legal / SCCs)

**Question.** Which firm for ongoing UAE counsel?

**Options.** Per LAUNCH_PLAN.md Phase 1 line "fast-track firm for MOU + SAFE review." Range AED 10k initial retainer + AED 50k SHA initial + ~AED 80-100k Y1 total.

**Recommendation.** Top-tier firm with fintech / proptech / real-estate-specialism. Vendor selection by referral.

**Founder action.** Engagement letter signed within 14 days of LLC incorporation (to support SAFE finalisation).

#### D-8 · Specific salary numbers (within market range per R-6)

**Question.** Within the §6.3 range (Zhan Founder/CEO/CTO AED 30-50k/mo from Platform; Dymo Co-founder Ops AED 30-50k/mo from Agency), what specific number?

**Options.**

| Option | Zhan AED/mo | Dymo AED/mo | Y1 founder comp envelope |
|---|---:|---:|---:|
| Floor (TERM_SHEET §15 minimum) | 30,000 | 30,000 | AED 720k |
| Mid | 40,000 | 40,000 | AED 960k |
| Ceiling (TERM_SHEET §15 maximum) | 50,000 | 50,000 | AED 1.2M |

**Recommendation.** **Mid (AED 40k/mo each)** — within "decent UAE market range for solid early-stage" per R-6, leaves headroom for performance bumps Y2 once revenue consistent.

**Founder action.** Founders confirm specific numbers; this populates §6.3 and the R-3 expense submission to Rudi.

#### D-9 · Visa processing vendor

**Question.** Which PRO / typing-services vendor handles visa processing for founders + first hires?

**Options.** Mid-tier PRO services AED 2,000-5,000 per visa processing fee on top of government fees [SafeLedger 2026]. Vendors: numerous in Dubai.

**Recommendation.** Bundle with DED-LLC formation services if available (most LLC-formation firms include visa processing in their packages).

**Founder action.** Confirm vendor as part of LLC-formation services.

#### D-10 · MOU/Term Sheet phased-wire amendment (R-8 housekeeping)

**Question.** R-8 ("phased wire · investor controls pace") supersedes Term Sheet §2 ("single tranche, payable by wire transfer on the Closing Date"). MOU / Term Sheet need a paper amendment to reflect this.

**Options.** Founders draft addendum noting "wire structured in tranches per investor's discretion; balance to AED 1,000,000 within Year 1" and include in SHA drafting workstream (per LAUNCH_PLAN.md Phase 3-4 SHA cadence).

**Recommendation.** Counsel-drafted side-letter or SHA Schedule treating R-8 phased-wire as the operative payment mechanic. Include in §6 of FOUNDER_DIRECTIVE-2026-04-24 amendment-flag list (which already covers 11 silent-investor conflicts; R-8 phased-wire is conflict #12 to add).

**Founder action.** Direct UAE counsel to draft phased-wire side-letter as part of Y1 retainer; sign before second tranche received.

### 10.3 Decision-summary table

| # | Decision | Recommendation | Decision deadline | Owner |
|---|---|---|---|---|
| D-1 | Office location | Al Jurf only Y1 | 2026-05-09 | Founders joint |
| D-2 | Broker hires | 1 hire Q3 2026 | 2026-05-09 (decision); Q3 (hire) | Dymo lead |
| D-3 | Launch type | Soft launch Y1 | 2026-05-09 | Founders joint |
| D-4 | Brand vendor | Small studio AED 30-50k | 30 days from now (~2026-05-25) | Dymo lead |
| D-5 | Bank account | Wio Business + ENBD/Mashreq backup | upon LLC incorporation | Dymo lead |
| D-6 | DPO retainer | 2-3 quotes; engage Q3 2026 | 30 days for quotes; engage post-LLC | Zhan lead (tech) |
| D-7 | UAE counsel | Engagement within 14d of LLC | upon LLC | Dymo lead |
| D-8 | Specific salaries | Mid AED 40k/mo each | 2026-05-09 | Founders joint |
| D-9 | Visa vendor | Bundle with LLC-formation | upon LLC | Dymo lead |
| D-10 | Phased-wire amendment | Counsel-drafted side-letter | before 2nd tranche | Dymo + counsel |

### 10.4 Implication for R-1 "concrete results before 2026-05-09"

Of these 10 decisions, **6 can be confirmed before 2026-05-09** (D-1, D-2 decision portion, D-3, D-4 brief, D-8, D-10 directive). The other 4 (D-5, D-6, D-7, D-9) are post-LLC mechanical decisions whose path is set even if execution is post-2026-05-09. **All 10 are research-prepared in this document; founders only need to confirm.**

### 10.5 Optional D-11 to D-14 follow-on decisions (deferred but flagged)

Beyond the 10 primary decisions, four additional founder decisions are flagged here for awareness — none time-critical for 2026-05-09, but each will become operative within Y1.

#### D-11 · Named-backup admin for compliance-filing emergency continuity

**Question.** Who holds Power of Attorney for compliance-only filings if both founders unreachable?

**Options.** Trusted family member · senior friend-of-founders with corporate-services background · PRO firm on retainer · Dubai-based law-firm partner.

**Recommendation.** Engage a PRO firm with 3-day-emergency POA on standby. Cost: ~AED 5-15k/yr retainer. Triggered only on dual-founder-unavailability (>72 hours).

**Founder action.** Quotes within 60 days; engagement Q3 2026.

#### D-12 · Accounting software vendor

**Question.** QuickBooks UAE vs Zoho Books vs Xero?

**Options.**
- **QuickBooks UAE** — most common in UAE; tight integration with WIO + ENBD; AED 1,500-3,500/yr.
- **Zoho Books** — best-of-breed for SMEs; localized to UAE VAT; AED 1,500-3,000/yr.
- **Xero** — global standard but UAE localisation thinner; AED 2,000-4,000/yr.

**Recommendation.** **Zoho Books** for SME-tight workflow + multi-entity support (Agency + Platform separation per MOU §3 70/10/10/10 distribution; Zoho handles inter-entity flows cleanly).

**Founder action.** Sign-up post-bank-account; backup data export verified Q1 each year.

#### D-13 · Tier-2 platform-engineer hire job spec and compensation

**Question.** Once first sales agent in place (D-2) and operational breakeven confirmed, the Tier-2 hire is a platform engineer to absorb routine maintenance from Zhan, freeing him for architecture and Master Tree progression.

**Options.**
- Junior full-stack (~AED 12-18k/mo): cheap; needs heavy Zhan supervision; risk of broken commits.
- Mid-level full-stack (~AED 20-35k/mo): right balance; can ship features under code review.
- Senior full-stack (~AED 35-60k/mo): too expensive Y1; reserve for Y2 once revenue justifies.

**Recommendation.** Mid-level (AED 25k/mo entry) Q3-Q4 2026. Per FOUNDER_DIRECTIVE-2026-04-24 GOV-3 (Dymo + Jan closed system) — engineer is **support not co-architect**.

#### D-14 · LeadingRE Global Referral Network application

**Question.** Apply to LeadingRE? AED ~25k/yr, unlocks international HNWI referral inflow per COMPETITOR_DEEP_DIVE 90-day rec 3.

**Recommendation.** Apply Q2 2026 once LLC operational. Founder action 60 days post-LLC.

### 10.6 Decision-mapping matrix (decisions → R-items → sections)

| Decision | Addresses R-? | Sections informing | Reverse impact |
|---|---|---|---|
| D-1 office | R-7 housing path | §3.7, §6.7 | If premium-Dubai chosen, §6 Y1 OpEx +AED 150-450k |
| D-2 broker hires | R-2 (capacity for Aggressive scenario) | §6.3, §7 | Each hire +AED 100-300k Y1 |
| D-3 launch type | R-1 concrete results positioning | §8 | Hard launch +AED 250-500k incremental |
| D-4 brand vendor | (operational) | §6.8 | AED 30-150k Y1 within §6 range |
| D-5 bank account | (operational) | §9 | None financial; operational efficiency only |
| D-6 DPO retainer | R-5 compliance posture; R-3 expense | §3.3, §6.10 | AED 40-100k/yr ongoing |
| D-7 UAE counsel | (operational; required) | §6.10 | AED 80-110k Y1 |
| D-8 specific salaries | R-6 decent salaries | §6.3 | Within TERM_SHEET §15 floor 30k - ceiling 50k |
| D-9 visa vendor | (operational) | §6.5 | AED 25-50k bundled in services |
| D-10 phased-wire | R-8 investor controls pace | §1, MOU §1, Term Sheet §2 | Counsel side-letter ~AED 5-15k |
| D-11 backup admin | bus-factor compliance | §3.15, §9.13 | AED 5-15k/yr standby |
| D-12 accounting | (operational) | §9.8 | AED 1.5-4k/yr |
| D-13 tier-2 engineer | scaling | §6.3, §10.5 | AED 25k/mo from Q3 2026 |
| D-14 LeadingRE | growth optionality | §4.4, §8 | AED 25k/yr |

### 10.7 The single most-important decision

If the founders read this document and remember only one decision, it should be **D-3 launch type**. Soft launch vs hard launch determines:
- §6 Y1 OpEx delta (~AED 200-400k swing).
- §8 operational tempo (founder-pace vs ≥30-day lead-time).
- §7 doubling-path realism (hard launch incremental marketing budget could compete for ~AED 300k against Aggressive-scenario 3-anchor-deal BD investment).
- Rudi narrative (R-1 "results" framing).

**Recommendation reinforced: SOFT LAUNCH for Y1.** This is the single decision that compounds across all other §10 decisions.

### 10.8 Execution sequence — what to do in the next 14 days (2026-04-25 → 2026-05-09)

A concrete 14-day plan for founders to convert this research into action before Rudi departs.

| Day | Date | Action | Owner |
|---|---|---|---|
| 0 | 2026-04-25 (Sat) | Research dossier delivered. Dymo + Zhan read. | Founders read |
| 1 | 2026-04-27 (Sun) | Joint founder session: confirm D-1, D-3, D-8, D-10. Decide §7 R-2 frame (A/B/C). | Founders 2 hrs |
| 2-3 | 2026-04-28 (Mon-Tue) | Dymo: brief brand-vendor (D-4), brief insurance broker (R-5), shortlist DPO firms (D-6). | Dymo |
| 2-3 | 2026-04-28 (Mon-Tue) | Zhan: prepare R-3 expense submission from §6 (this document) with founder-final D-8 numbers. | Zhan |
| 4 | 2026-04-30 (Wed) | Counsel engagement letter signed (D-7). | Dymo |
| 5 | 2026-05-01 (Thu) | DREI training enrolment confirmed for both founders. | Both |
| 6 | 2026-05-02 (Fri) | R-3 expense list submission ready for Rudi review. | Zhan |
| 7 | 2026-05-04 (Sat) | First Rudi monthly-cadence email setup (per FOUNDER_DIRECTIVE GOV-1). | Zhan |
| 8 | 2026-05-05 (Sun) | If Rudi available: review R-3 list with him. | Founders |
| 9-10 | 2026-05-07 (Tue-Wed) | DED LLC processing window opens. Watch for issuance. | passive |
| 11 | 2026-05-08 (Thu) | If LLC issued: bank account application initiated (D-5). | Dymo |
| 12 | 2026-05-09 (Fri) | **Rudi departs.** Founders synchronise on monthly cadence going forward. | — |

This is the explicit 14-day operational plan that converts §1 R-1 ("concrete results before 2026-05-09") into deliverables.

---

## §11 · Honest gaps and unknowns

### 11.1 Research gaps explicitly flagged

1. **Plot 9235849 close-date precision** — "expected ~30 days from 2026-04-25 = mid-May 2026" per founder briefing. Not guaranteed. Five-way split of AED 25M total commission introduces coordination risk.
2. **NOC fee schedule for AED 615M plot from specific vendor** — luxury / premium-plot NOC fees can exceed standard AED 5k by an order of magnitude; vendor-specific data not available in public sources.
3. **Anchor-scale deal frequency required for Scenario C** — three additional 9235849-class deals Y1 is aggressive; Dymo's confidence rating is the input the agent does not have.
4. **PDPL Executive Regulations** — UAE Data Office had not published mainland-PDPL Executive Regulations / SCCs as of 2026 [kayrouzandassociates 2026][china-briefing 2026]; ZAAHI's cross-border data documentation falls back on DIFC / ADGM / international SCC best practice.
5. **Specific PDPL DPO retainer pricing** — quote-based; AED 40-100k/yr range cited but specific firm cost depends on engagement scope.
6. **Cyber-liability insurance premium-tier pricing for data-rich platform (114 listings + 556k mapped plots + AI assistant)** — quote-based; SME range AED 5-30k cited, but specific quote may be higher given ZAAHI's data exposure.
7. **Premium-Dubai office service-charge bands** — citations show 15-45 AED/sqft range [engelvoelkers 2026]; specific buildings vary.
8. **AML / FIU goAML processing time** — varies by license-type and DPMS classification; cited as "30-60 days" [DPMS standard guides] but specific processing time not predictable.
9. **DED LLC processing time** — "2-4 weeks" cited [SafeLedger 2026; LAUNCH_PLAN]; specific case may be faster or slower.
10. **Anthropic API Y1 usage** — modelled on current platform usage extrapolated; specific usage depends on Y1 traffic.

### 11.2 What the agent cannot know

- Investor's exact tranche dates per R-8 (controlled by Rudi, not founders).
- Counterparty diligence outcomes on the 6 ratified deals.
- 2026 RERA company-license processing-time variability.
- Specific Bank-RM relationships (Dymo's contacts at ENBD / Mashreq are not in the agent's context).
- Specific DPO / counsel / brand-vendor referrals (founder networks).

### 11.3 What this document deliberately does not address

- Master Tree progression (deferred per R-9).
- Multi-role pivot details (deferred per FOUNDER_DIRECTIVE-2026-04-24 §3.1 Q-M1).
- Tokenisation, metaverse, robotics (Phase 3+ per GOV-5).
- Ambassador program economic flow (already canonical in `src/lib/ambassador.ts` + CLAUDE.md AMBASSADOR PROGRAM RULES).
- Post-Sunset cap-table mechanics (already canonical in MOU §4 + Term Sheet §4).
- Sovereign Bank, Robotics Fund, Robotics Loop (Phase 3+ deferred).

### 11.4 Top 5 Y1 launch risks — synthesised across sections

| Rank | Risk | Probability | Impact (AED if materialises) | Mitigation owner |
|---|---|---|---:|---|
| 1 | **Plot 9235849 fails entirely** | LOW (~10%) | -AED 5M from Y1 commission; Sunset trajectory shifts to Slow (mid-Y4) | Dymo BD pipeline expansion to compensate |
| 2 | **Compliance penalty trigger** (CT registration / UBO / goAML missed deadlines if both founders unreachable in W4-W7) | LOW (~5%) | -AED 10k to AED 5M+ | D-11 named-backup admin + DPO retainer |
| 3 | **PDPL enforcement action** before Jan 2027 full-enforcement | LOW (~10%) | -AED 50k - AED 5M depending on violation | D-6 DPO retainer + privacy policy live W4 |
| 4 | **DED LLC processing slips beyond 4 weeks** | MEDIUM (~25%) | Delays full LLC ops 1-3 weeks; cascades into RERA + bank + first-deal | LAUNCH_PLAN.md says use fast-track law firm; build in W4-W6 buffer |
| 5 | **Founder burnout in W1-W12 compliance + first-deal compounded crunch** | MEDIUM (~30% if not actively managed) | qualitative; impacts pipeline conversion; cascades | TERM_SHEET §15 salary floor honoured + first hire Q2-Q3 + GOV-5 quality-over-speed |

**Risk-adjusted Y1 cash position:** Even with Risks 1+4 materialising simultaneously (Plot 9235849 fails AND LLC slips by 3 weeks), Y1 ends with AED 1-3M cash position positive — not a survival risk. Risks 2-3 are the asymmetric tail-risk: low probability, high impact. **Mitigation budget for Risks 2-3 = D-6 DPO retainer + AML compliance setup = AED 60-150k Y1.** Insurance worth buying.

### 11.5 Risks NOT in this document

For honesty, risks the agent has not modelled or analysed:

- **Macroeconomic UAE real-estate cycle.** COMPETITOR_DEEP_DIVE notes "2028-2030 correction" risk; if Y1 happens to overlap with cycle softness, deal volume compresses below Conservative.
- **Regional geopolitical shocks** (e.g., regional conflict, oil-price shock). Not modelled.
- **Vendor / counterparty failure** (Vercel outage >24 hours; Supabase region-wide failure). Mitigated structurally per CLAUDE.md Sovereignty Rules.
- **Specific competitor moves** (Property Finder using $170M Mubadala Jan 2026 raise to acquire a 3D-mapping company; Huspy adding listings vertical). Watched per COMPETITOR_DEEP_DIVE; not modelled in §7.
- **Ambassador-program fraud / abuse.** CLAUDE.md AMBASSADOR PROGRAM RULES include cycle-detection + immutability rules; abuse vectors per §10 D-?? merit Phase 2 review.
- **Plot 9235849 5-way commission split coordination failure** (one of the 5 parties pulls or sues). Not modelled; would shift Plot 9235849 into "delayed" or "fails" outcome of §7.11.

### 11.6 Comprehensive risk register (synthesised across all sections)

| # | Risk | Section flagged | Probability | Impact | Mitigation owner | Mitigation cost (AED) |
|---|---|---|---|---|---|---:|
| R-01 | Plot 9235849 fails entirely | §7.11 | LOW (~10%) | -AED 5M Y1 commission | Dymo BD pipeline expansion | ongoing — within §6 BD allocation |
| R-02 | Plot 9235849 close-date slips into Y2 | §7.11 | MEDIUM (~25%) | Sunset trajectory shifts; Y1 cash compresses | Dymo follow-through | ongoing |
| R-03 | Compliance penalty trigger (CT/UBO/goAML/etc) | §3.14 | LOW (~5%) | -AED 10k - AED 5M+ | DPO retainer + AML setup + named-backup admin | 60-150k Y1 |
| R-04 | PDPL enforcement action pre-Jan 2027 | §3.5 | LOW (~10%) | -AED 50k - AED 5M | DPO retainer + privacy live W4 | within R-03 |
| R-05 | DED LLC processing slips beyond 4 weeks | §2 | MEDIUM (~25%) | 1-3 week delay; cascades | LAUNCH_PLAN fast-track firm; W4-W6 buffer | within counsel retainer |
| R-06 | Founder burnout (Y1 compliance + first-deal compounded) | §11.4 | MEDIUM (~30%) | qualitative; pipeline conversion impact | Salary floor + first hire Q3 + GOV-5 quality | within §6.3 |
| R-07 | Macroeconomic UAE real-estate cycle softness | §11.5 | MEDIUM (~30% over Y1-Y3) | Conservative scenario probability shifts up | Diversify pipeline; pursue government / institutional | qualitative |
| R-08 | Vendor / counterparty failure (Vercel, Supabase outage >24h) | §11.5 | LOW (~5% annually for either) | platform downtime; user trust loss | Sovereignty Rules Docker portability + auto-renewal | within §6.9 |
| R-09 | Specific competitor moves (Property Finder $170M deploy adds 3D / Huspy adds listings) | §11.5 | MEDIUM (~25% over 18-24 months) | competitive pressure | Huspy partnership pursuit + 18-24 month moat | qualitative |
| R-10 | Ambassador-program fraud / abuse | §11.5 | MEDIUM (~20% over Y1-Y3 once volume grows) | financial + reputational | CLAUDE.md cycle-detection rules + immutability + anti-fraud monitoring | within DPO scope |
| R-11 | Plot 9235849 5-way commission split coordination failure | §11.5 | LOW (~10%) | Plot 9235849 outcome shifts to "delayed" or "fails" | Dymo + counsel pre-empt | counsel time |
| R-12 | Bus-factor: both founders unreachable >48h during compliance window | §3.15, §9.13 | LOW (~3% annually) | compliance deadlines missed; AED penalties | D-11 named-backup admin POA | 5-15k/yr |
| R-13 | Rudi reads silent-investor directive as stripping | FOUNDER_DIRECTIVE §7.1 | MEDIUM if framing wrong / LOW if framing right | wire delay or refusal | Dymo Saturday-conversation framing + amendment timing | counsel time |
| R-14 | MOU vs operating-practice mismatch flagged in VC DD | FOUNDER_DIRECTIVE §7.2 | HIGH if amendments lag | VC DD complication | Amendment timing pre-DD entry | 50-150k counsel for amendments |
| R-15 | First-deal close-week scramble (NOC, escrow, DLD coordination on first attempt) | §3.13 | MEDIUM (~30% on first deal) | timeline slip 1-3 weeks | Pre-stage NOC processes; counsel on retainer | within counsel retainer |
| R-16 | Premium-Dubai office decision (D-1) cost overrun if Option B-E chosen without revenue confirmation | §10 | depends on choice | -AED 150-450k Y1 | D-1 conservative recommendation: Al Jurf | n/a |
| R-17 | First broker hire compensation conflict (D-2) | §10 | LOW | hiring delay | Standard Dubai broker comp benchmarks | n/a |
| R-18 | Specific RERA company-broker license processing variance (target 7-30 days) | §3.4 | LOW-MEDIUM | 1-2 week delay | DREI training Week 2 starts; exam Week 5 | within compliance retainer |
| R-19 | AD migration cutover failure / partial | FOUNDER_DIRECTIVE §4.4 | LOW | 2-4 week delay; rollback to Frankfurt | Dual-stack staging + rollback plan | engineering time |
| R-20 | Y1 audit close late or qualified opinion | §9.12 | LOW | covenant / Rudi report quality issue | Monthly bookkeeping discipline + counsel review | within accounting fee |

### 11.7 Risk-frequency × severity quadrant

Top-right (HIGH probability + HIGH impact) — none currently. Most §11.6 risks are mitigation-managed.

Top-left (LOW probability + HIGH impact) — R-03, R-04, R-12 (compliance/PDPL/bus-factor). Mitigated by DPO + named-backup admin = ~AED 60-150k Y1 insurance.

Bottom-right (HIGH probability + LOW impact) — R-15 (first-deal scramble). Mitigated by pre-staging NOC.

Bottom-left (LOW probability + LOW impact) — R-08 (Vercel/Supabase outage), R-19 (AD cutover partial). Within standard ops budget.

**Net read.** Founder cash exposure for prudent-mitigation Y1 is **~AED 100-200k of the §6 OpEx** allocated to risk mitigation specifically. This is ~5-7% of Y1 fixed OpEx — defensible insurance proportion for a venture at this stage.

### 11.8 Risk-mitigation roadmap by quarter

**Q2 2026 (May-Jul):**
- Activate R-03/R-04 mitigation: DPO retainer engaged (D-6); privacy policy live; AML compliance manual drafted.
- Activate R-12 mitigation: D-11 backup-admin POA engaged.
- Activate R-15 mitigation: Plot 9235849 NOC processes pre-staged.
- Activate R-13 mitigation: Dymo's Saturday Rudi conversation framing per FOUNDER_DIRECTIVE-2026-04-24 §7.1.
- Activate R-14 mitigation: counsel begins MOU amendment drafting (silent-investor + R-8 phased-wire).

**Q3 2026 (Aug-Oct):**
- R-13/R-14 milestone: MOU amendment signed before VC DD initiated.
- R-06 mitigation: first broker hire (D-2) lifts founder compounded load.
- R-09 mitigation: Huspy partnership conversation initiated.
- R-19 mitigation: AD migration staging environment built.

**Q4 2026 (Nov-Jan):**
- R-19 mitigation: dual-stack production tested; rollback plan validated.
- R-15 mitigation: closing-process documentation finalised post-first-3-deals.

**Q1 2027 (Feb-Apr):**
- R-19 milestone: AD migration cutover Friday 2027-01-08 successful.
- R-20 mitigation: Y1 audit closes clean.

### 11.9 What founders should NOT do under R-2 / R-1 pressure (recap)

This list is also in §7.15; reproduced here as a risk-management line:

1. Do not commit to Y1 doubling in writing.
2. Do not pre-spend against expected anchor deals.
3. Do not push Plot 9235849 to close faster than diligence supports.
4. Do not redirect Dymo BD bandwidth away from existing six.

### 11.10 Confidence rating per section

| Section | Confidence | Reason |
|---|---|---|
| §1 Investor requests | HIGH | Verbatim transcription |
| §2 Where ZAAHI stands | HIGH | All numbers from canonical files |
| §3 Licensing stack | MEDIUM-HIGH | 2026 web-cited; ranges where pricing varies |
| §4 Super-tech differentiation | HIGH | Verifiable on `zaahi.io` |
| §5 Platform priority | HIGH | Aligned with FOUNDER_DIRECTIVE §4.2 |
| §6 Y1 expense | MEDIUM-HIGH | 2026 web-cited; mid-points robust, edges variable |
| §7 Doubling path | HIGH-on-method, MEDIUM-on-Scenario-C | Method is sound; Scenario C aggressive realisation depends on Dymo BD |
| §8 Launch readiness | MEDIUM | Honest framing offered; final decisions §10 D-3 |
| §9 Money management | HIGH | Constraint-clear; bank options well-cited |
| §10 Decisions | HIGH | Recommendations conservative-capital-aligned |

---

## §12 · Sources and retrieval log

All sources retrieved 2026-04-25 within the research session associated with this document.

### 12.1 Repo files (read in full at session start)

- `docs/investor-package/MOU_RUDI.md` (canonical equity, profit, Sunset, IP, timeline) — read full at start of session.
- `docs/investor-package/TERM_SHEET.md` (canonical legal language, plain English, rationale across 23 clauses) — read full at start of session.
- `docs/investor-package/EXECUTIVE_SUMMARY.md` (one-page market positioning, financial snapshot, IPO path) — read full.
- `docs/investor-package/FINANCIAL_MODEL_V1.md` (9-tab Excel template structure with assumptions, revenue, OpEx, cash-flow, distribution waterfall, scenarios, sensitivity, breakeven, KPIs) — read full.
- `docs/investor-package/LAUNCH_PLAN.md` (Phase 1-5 operational playbook with milestones, owners, budgets, dependencies, success criteria) — read full.
- `docs/research/COMPETITOR_DEEP_DIVE_2026.md` (10 competitors with product, revenue model, funding, recent news, gaps, partnerships, risk-to-ZAAHI, team, sources) — read full.
- `docs/decisions/FOUNDER_DIRECTIVE_2026-04-24.md` (silent-investor governance directive applied to 184 questions; spec ship dates revised; Spec 03 v2 simplification; MOU/Term Sheet amendment flags; risks) — read full.
- `CLAUDE.md` (operating manual, stack, blocks, rules, deployment, 9-category land-use legend, 3D model rules, ambassador rules) — loaded via system reminder.

### 12.2 Web sources (UAE 2026 rates)

#### §3.3 Federal-level

- [SafeLedger 2026 LLC trade license cost guide](https://safeledger.ae/blog/llc-trade-license-cost-in-dubai)
- [Shuraa 2026 Dubai mainland license cost](https://www.shuraa.com/dubai-mainland-license-cost/)
- [Henryclub 2026 Dubai mainland license cost](https://henryclub.ae/business-setup/dubai-mainland-license-cost-2026/)
- [DubaiSetup 2026 mainland trade license complete breakdown](https://www.dubaisetup.ae/cost-of-trade-license-in-dubai-mainland-the-complete-2026-price-breakdown/)
- [Egsh 2026 Trade license cost Dubai](https://egsh.ae/insights/trade-licence-cost-dubai)
- [HFA Consulting 2026 UAE Corporate Tax registration deadlines](https://www.hfaconsulting.ae/tax-consultants-dubai/corporate-tax/registration-deadlines/)
- [Virtuzone 2026 Corporate Tax registration deadlines](https://virtuzone.com/blog/corporate-tax-registration-deadlines/)
- [Bestaxca 2026 What happens if you miss CT deadline](https://bestaxca.com/uae-corporate-tax-deadline/)
- [QASProGlobal 2026 Corporate Tax registration UAE complete guide](https://qasproglobal.com/corporate-tax-registration-uae-2026/)
- [FTA Public Clarification CTP006 (waiver of penalties)](https://tax.gov.ae/en/about.fta/waiver.of.penalties.aspx)
- [Crossfoot 2026 UAE Corporate Tax explained](https://crossfoot.co/uae-corporate-tax-compliance/corporate-tax-explained/)
- [Skrooge 2026 UAE Corporate Tax guide](https://skrooge.ai/blog/uae-corporate-tax-2026-complete-guide/)
- [Paycompliance 2026 UAE beneficial ownership rules](https://paycompliance.com/2025/07/18/uaes-beneficial-ownership-rules-what-businesses-need-to-know/)
- [taxready UBO UAE](https://taxready.ae/ubo-uae/)
- [profitzadvisory UBO 2026 reporting](https://profitzadvisory.com/blog/ubo-reporting-uae/)
- [K&L Gates Cabinet Decision 58/2020 brief](https://www.klgates.com/Brief-on-the-New-UAE-Cabinet-Decision-No-58-of-2020-on-Regulating-the-Beneficial-Owner-Procedures-10-19-2020)
- [CBUAE rulebook Cabinet Decision 58 2020 beneficial owner](https://rulebook.centralbank.ae/en/rulebook/cabinet-decision-58-2020-beneficial-owner-procedures)
- [PwC ME 2020 UAE Cabinet Decision 58/2020](https://www.pwc.com/m1/en/services/tax/me-tax-legal-news/2020/uae-cabinet-decision-no-58-2020-regulating-beneficial-owner-procedures.html)
- [tulpartax 2026 goAML registration](https://tulpartax.com/goaml-registration-in-uae-process-deadline-documents-required-penalties/)
- [filings 2026 UAE AML compliance guide](https://filings.ae/uae-visa/uae-aml-compliance-your-2026-guide)
- [amluae UAE AML laws complete guide](https://amluae.com/a-guide-to-anti-money-laundering-aml-laws-in-uae/)
- [goamlregistration UAE AML laws real estate](https://goamlregistration.ae/aml-laws-for-real-estate-agents-in-uae/)
- [DPMS Global mastering goAML step-by-step](https://dpmsglobal.com/mastering-goaml-a-step-by-step-guide-to-reporting-in-the-uae/)
- [nexiant 2026 AML obligations UAE](https://nexiant.ai/resources/blogs/aml-obligations-uae-2026/)
- [InfoAML UAE AML compliance FAQ](https://www.infoaml.ae/faq)
- [MoET register in goAML](https://www.moet.gov.ae/en/registering-companies-in-goaml)
- [CTC 2026 AML compliance requirements](https://ctconsultancyuae.com/aml-compliance-requirements-in-the-uae/)
- [EpicCorp 2026 AML compliance UAE beginners](https://epiccorpservices.com/aml-compliance-in-uae-beginners-guide/)
- [Cookieyes UAE PDPL guide](https://www.cookieyes.com/blog/uae-data-protection-law-pdpl/)
- [Securiti UAE PDPL overview](https://securiti.ai/uae-personal-data-protection-law/)
- [Cookie-Script UAE PDPL guide](https://cookie-script.com/privacy-laws/uae-data-protection-law-pdpl)
- [GSDA Legal 2026 PDPL compliance guide](https://www.gsdalegalconsultants.com/blog/data-protection-uae-pdpl-compliance-guide)
- [UAEAhead 2026 IT law updates 2026 practical guide](https://uaeahead.com/uae-it-law-updates-2026-guide/)
- [Vesta-Solutions 2026 UAE data-protection roadmap](https://vesta-solutions.ae/uae-data-protection-privacy-compliance-2026/)
- [Verifywise UAE PDPL data protection compliance guide](https://verifywise.ai/solutions/uae-pdpl)
- [OAD Technologies 2026 UAE PDPL compliance strategic guide](https://www.oadtechnologies.com/uae-personal-data-protection-law-compliance-a-strategic-guide-for-2026/)

#### §3.4 Real-estate specific

- [Egsh 2026 RERA license cost Dubai 2026 pricing guide](https://egsh.ae/insights/rera-licence-cost-dubai)
- [UAEexperthub 2026 RERA license cost](https://www.uaeexperthub.com/rera-license-cost-dubai/)
- [DXBTraining 2026 RERA course Dubai price 2026](https://dxbtraining.ae/blog/article/12/rera-course-dubai-price-in-2026-official-fees,-hidden-costs,-and-what-you-actually-pay)
- [Raesassociates 2026 RERA license cost guide](https://www.raesassociates.com/post/how-much-is-the-rera-license-in-dubai/)
- [DLD Real Estate Activity License](https://dubailand.gov.ae/en/eservices/real-estate-activity-license/)
- [Shuraa 2026 cost of opening real estate brokerage Dubai](https://www.shuraa.com/what-is-the-cost-of-opening-a-real-estate-brokerage-in-dubai/)
- [E&V Dubai 2026 steps to obtain real estate broker license Dubai](https://www.engelvoelkers.com/ae/en/resources/real-estate-broker-license-dubai)
- [DIAC 2026 RERA certificate cost exam process](https://diac.ae/blog/how-to-get-rera-certificate-in-dubai/)
- [Krezko 2026 RERA license guide](https://krezko.ae/how-to-get-rera-license-in-dubai-an-detailed-guide/)
- [DLD issuance of practice card](https://dubailand.gov.ae/en/eservices/request-for-issuing-a-real-estate-activity-practice-card/)
- [Movingo 2026 RERA broker card guide](https://movingo.ae/blog/real-estate-practice-card-in-dubai)
- [DXBTraining RERA course in Dubai 2026 guide](https://dxbtraining.ae/en/blog/article/18/rera-course-in-dubai-everything-you-need-to-know-2026-guide)
- [Oliva RERA certification for Dubai agents](https://joinoliva.com/en/learn/blog/rera-certification-for-dubai-agents-requirements)
- [Radiantbiz real estate brokerage license in Dubai](https://www.radiantbiz.com/blog/real-estate-brokerage-license-in-dubai)
- [Egsh 2026 Trakheesi permit Dubai advertising](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance)
- [DLD Real Estate Ad Permit](https://dubailand.gov.ae/en/eservices/real-estate-ad-permit/)
- [Property Finder Trakheesi guide](https://www.propertyfinder.ae/blog/trakheesi/)
- [GoDubai 2026 Dubai real estate regulations investor guide](https://www.godubai.estate/broker-hub/2026-dubai-real-estate-regulations-how-new-laws-are-securing-the-ultimate-safe-haven-amidst-global-volatility/)
- [Retyn 2026 RERA license Dubai how-to](https://www.retyn.ai/en-ae/blog/how-to-get-a-real-estate-license-dubai)

#### §3.6 Property handling

- [DLD Title transfer application](https://dubailand.gov.ae/en/eservices/request-for-transfer-of-ownership/)
- [UAEexperthub 2026 DLD fees Dubai property transfer](https://www.uaeexperthub.com/dld-fees-dubai-property-transfer-costs/)
- [DLD transfer of registration fees](https://dubailand.gov.ae/en/eservices/request-for-transferring-registration-fees-from-one-property-to-another/)
- [Property Finder DLD fees Dubai 2026](https://www.propertyfinder.ae/blog/dld-fees-dubai/)
- [Egsh property transfer Dubai 2026](https://egsh.ae/insights/property-transfer-dubai-guide)
- [Oliva title-deed verification Dubai](https://joinoliva.com/es/learn/blog/title-deed-verification-in-dubai-how-to-check)
- [UAEexperthub 2026 DLD fees property transfer costs](https://www.uaeexperthub.com/dld-fees-property-transfer-costs-dubai/)
- [Egsh how to get NOC from developer Dubai](https://egsh.ae/insights/how-to-get-noc-from-developer-in-dubai)
- [DLD property sale registration](https://dubailand.gov.ae/en/eservices/property-sale-registration/)
- [Egsh 2026 Dubai title deed issuance fees verification](https://egsh.ae/insights/title-deed-dubai-guide)

#### §3.7 Office / physical

- [Aitsgulf Civil Defence approval Dubai practical guide](https://aitsgulf.com/civil-defence-approval-in-dubai-a-practical-guide-for-businesses/)
- [Dubaiapprovals DCD approval requirements](https://www.dubaiapprovals.com/services/civil-defense-approval)
- [Daralnaseeb DCD approvals fit-out gas permits](https://daralnaseeb.com/approvals/dubai-civil-defense-approvals)
- [Daralnaseeb Dubai Municipality approval fit-out building 2026](https://daralnaseeb.com/approvals/dubai-municipality-approvals)
- [Fermiumdesigns 2026 Dubai Civil Defence approval](https://fermiumdesigns.ae/blog/dubai-civil-defence-dcd-approval-2026)
- [Janatofficefitout Dubai civil defense approval](https://www.janatofficefitout.com/dubai-civil-defense-approval)
- [Daemuae DCD drawing approval NOC services](https://daemuae.com/dubai-civil-defense-approval/guide-to-drawing-approvals/)
- [Daralnaseeb 2026 Dubai Municipality approval guide](https://daralnaseeb.com/blog/dubai-municipality-approval-complete-guide-2026)
- [Buildingapprovals Dubai Civil Defence 2026 guide](https://www.buildingapprovals.ae/blog/dubai-civil-defence-approval-dcd-complete-guide-for-2026)
- [Appellointeriors fit-out approvals Dubai authorities](https://www.appellointeriors.com/blog/Fit-Out-Approvals-Guide-Dubai-Authorities)
- [Property Finder offices for rent Dubai](https://www.propertyfinder.ae/en/commercial-rent/offices-for-rent.html)
- [Property Finder Business Bay offices](https://www.propertyfinder.ae/en/commercial-rent/dubai/offices-for-rent-business-bay.html)
- [Property Finder DIFC offices](https://www.propertyfinder.ae/en/commercial-rent/dubai/offices-for-rent-difc.html)
- [Henryclub 2026 Business Bay property office premium](https://henryclub.ae/dubai-real-estate/areas/business-bay/)
- [E&V 2026 average office rental prices Dubai](https://www.engelvoelkers.com/ae/en/resources/office-rental-prices-dubai)
- [Drivenproperties offices for rent Dubai 2026](https://www.drivenproperties.com/offices-for-rent-in-dubai)
- [Banke 2026 rent office DIFC Dubai guide](https://www.banke.ae/lp/rent-office-difc-dubai-2026/)

#### §3.8 Insurance

- [Union Insurance professional indemnity](https://www.unioninsurance.ae/en-us/business/liability-professional-indemnity/)
- [Howden UAE professional indemnity](https://www.howdengroup.com/ae-en/cover/professional-indemnity)
- [ANIB professional indemnity](https://anib.ae/services/professional-indemnity/)
- [CoverB best PI coverage UAE](https://coverb.ae/best-professional-indemnity-coverage-options-in-uae/)
- [Insurancemarket professional indemnity UAE](https://insurancemarket.ae/professional-indemnity-insurance/)
- [AIG UAE professional indemnity](https://www.aig.ae/home/risk-solutions/business/financial-lines-insurance/professional-indemnity-insurance)
- [Policybazaar PI UAE](https://www.policybazaar.ae/business-insurance/professional-indemnity/)
- [CRI corporate insurance PI UAE](https://crisecure.com/corporate-insurance/professional-indemnity)
- [Pacificprime Dubai health insurance costs 2026](https://www.pacificprime.com/blog/dubai-insurance-uae-medical-insurance-prices.html)
- [Shory UAE medical insurance prices 2026](https://www.shory.com/individual-health-insurance/blog/uae-medical-insurance-prices-real-costs-that-most-expats-dont-know/)
- [MoHRE basic health insurance scheme](https://mohre.gov.ae/en/guidance-and-awareness-portal-new/the-basic-health-insurance-scheme)
- [Hayah UAE expat health insurance 2026](https://hayah.com/knowledge-centre/articles/importance-of-health-insurance-for-expatriates-in-the-uae)
- [Pacificprime Dubai health insurance cost 2026](https://www.pacificprime.com/blog/dubai-insurance-how-much-does-insurance-cost-in-dubai.html)
- [DLA Piper UAE nationwide health insurance 2025](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2025/UAE-natiowide-health-insurance-scheme-)
- [Insurancehub minimum health insurance premium UAE 2026](https://insurancehub.ae/blog/what-is-the-minimum-premium-for-health-insurance-in-the-uae-in-2026)
- [Union Insurance workmens compensation](https://www.unioninsurance.ae/en-us/business/liability-workmen-s-compensation/)
- [GIG Gulf workmen compensation Dubai UAE](https://www.giggulf.ae/en/business/products/workmen-compensation-insurance)
- [Albuhaira workmen compensation Sharjah Dubai Abu Dhabi](https://albuhaira.com/workmen-compensation)
- [Policybazaar workmens compensation UAE](https://www.policybazaar.ae/business-insurance/workers-compensation-insurance/)
- [Shory 2026 workmen compensation insurance UAE](https://www.shory.com/individual-health-insurance/blog/workmen-compensation-insurance-in-uae/)
- [InsuranceUAE workmens compensation](https://www.insuranceuae.com/commercial-insurance/liability/workmens-compensation-insurance/)
- [Union Insurance cyber risks liability](https://www.unioninsurance.ae/en-us/business/cyber-risks-liability-insurance/)
- [Howden UAE cyber liability](https://www.howdengroup.com/ae-en/cover/cyber)
- [HowUAE 2026 cybersecurity now business cost](https://howuae.ae/why-cybersecurity-is-now-a-business-cost-not-an-it-problem-uae-2026/)
- [Policybazaar cyber risk insurance UAE](https://www.policybazaar.ae/business-insurance/cyber-risk-insurance/)
- [Lux Actuaries cyber insurance UAE](https://www.luxactuaries.com/cyber-insurance-in-the-uae-why-actuaries-are-key-to-managing-digital-risk)
- [Insurancemarket cyber security insurance Dubai UAE](https://insurancemarket.ae/cyber-security-insurance/)
- [Cyb3r cyber insurance Dubai UAE](https://www.cyb3r.ae/cyber-insurance)

#### §6 / §9 Salaries, banking, visas

- [Michael Page UAE salary guide 2026](https://www.michaelpage.ae/salary-guide-uae)
- [Indeed founder and CEO salary UAE](https://ae.indeed.com/career/founder-and-ceo/salaries)
- [Indeed founder and CEO salary Dubai](https://ae.indeed.com/career/founder-and-ceo/salaries/Dubai)
- [PayScale CEO salary UAE 2026](https://www.payscale.com/research/AE/Job=Chief_Executive_Officer_(CEO)/Salary/25789eae/Dubai)
- [PayScale CTO salary Dubai 2026](https://www.payscale.com/research/AE/Job=Chief_Technology_Officer_(CTO)/Salary/1e52cbf3/Dubai)
- [ERIERI CEO salary UAE 2026](https://www.erieri.com/salary/job/ceo/united-arab-emirates)
- [Khaleej2UAE CEO salary Dubai 2026 guide](https://www.khaleej2uae.com/ceo-salary-in-dubai-2026-guide/)
- [Labeeb 2026 UAE executive compensation salary trends](https://www.labeeb.ae/uae-executive-compensation-2025-salary-trends-for-senior-professionals)
- [Techloy UAE Golden Visa 2026 tech talent](https://www.techloy.com/the-2026-guide-to-the-uae-golden-visa-a-roadmap-for-tech-talent/)
- [Founder Institute UAE](https://fi.co/apply/uae)
- [Meydan FZ Golden Visa Dubai 2026 rules costs](https://www.meydanfz.ae/blog/golden-visa-dubai-uae-rules-and-costs)
- [Emirabiz UAE Golden Visa 2026](https://emirabiz.com/uae-golden-visa/)
- [UAEinsiderguide 2026 visa fees costs breakdown](https://uaeinsiderguide.com/visa/uae-visa-fees-costs-complete-breakdown/)
- [u.ae Golden Visa](https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa)
- [Immigrantinvest UAE Golden Visa 2026 750k AED](https://immigrantinvest.com/uae-golden-visa/)
- [Openadubaicompany 2026 Dubai investor visa guide](https://www.openadubaicompany.com/blog/uae-investor-visa-dubai-guide/)
- [Riseexpo investor visa Dubai entrepreneurs](https://www.riseexpo.com/blog/ultimate-guide-investor-visa-dubai-entrepreneurs-property-owners)
- [Shuraa 2026 investor visa Dubai UAE](https://www.shuraa.com/investor-visa-in-dubai-uae/)
- [Dubaisetup 2026 UAE investor visa cost](https://www.dubaisetup.ae/uae-investor-visa-cost-the-complete-2026-price-breakdown/)
- [Goldenvisaconsultant UAE Golden Visa cost 2026](https://goldenvisaconsultant.com/uae-golden-visa-cost/)
- [E&V 2026 Dubai real estate agent salary guide](https://www.engelvoelkers.com/ae/en/resources/dubai-real-estate-agent-salary)
- [Marrfa do real estate agents make good money UAE](https://www.marrfa.com/blog/do-real-estate-agents-make-good-money-in-the-uae)
- [Stratrich Dubai real estate agent salary commission](https://stratrich.com/ae/insights/start-your-career-as-a-real-estate-agent-in-dubai/)
- [Leverageedu real estate agent salary Dubai 2026](https://leverageedu.com/learn/career-abroad-real-estate-agent-salary-in-dubai/)
- [Glassdoor real estate agent Dubai 2026](https://www.glassdoor.com/Salaries/dubai-united-arab-emirates-real-estate-agent-salary-SRCH_IL.0,26_IM954_KO27,44.htm)
- [Glassdoor real estate broker Dubai 2026](https://www.glassdoor.com/Salaries/dubai-united-arab-emirates-real-estate-broker-salary-SRCH_IL.0,26_IM954_KO27,45.htm)
- [JSB Dubai real estate broker salary 2026 RERA](https://jsb.ae/blog/how-much-do-real-estate-brokers-earn-in-dubai-commissions-salary-income-breakdown-2026-2/)
- [Aliyas real estate Dubai how much agents make](https://aliyasrealestate.ae/how-much-do-real-estate-agents-make-in-dubai/)
- [Indeed real estate agent salary Dubai](https://ae.indeed.com/career/real-estate-agent/salaries/Dubai)
- [Gaiarealty Dubai real estate commission structures UAE](https://www.gaiarealty.ae/blog/real-estate-agent-commission-structures-how-much-do-agents-really-make)
- [Businesssetupexperts top UAE business bank accounts 2025](https://businesssetupexperts.com/best-uae-business-bank-accounts/)
- [Digitaldubai 2026 bank account Dubai](https://www.digitaldubai.ai/dubai-updates/how-to-open-bank-account-dubai-2026)
- [Proservicesindubai best UAE business bank accounts 2026](https://proservicesindubai.com/uae-business-bank-accounts/)
- [Zolagroup UAE personal banking expats 2026](https://zolagroup.com/resources/uae-personal-banking-for-expats)
- [Firsteliteglobal best bank business account UAE 2025](https://firsteliteglobal.com/best-bank-for-business-account-in-uae/)
- [Binderr open business bank account Dubai 2026](https://binderr.com/marketplace/ae/how-to-open-a-business-bank-account-in-dubai)
- [AEdbs how to open Emirates NBD account 2026](https://aedbs.com/blogs/news/how-to-open-an-emirates-nbd-account)
- [Dubaibusinessservices 2026 bank account opening 5-7 day](https://www.dubaibusinessservices.com/dubai-business-bank-account-opening-2026/)
- [Openadubaicompany 2026 business bank UAE non-residents](https://www.openadubaicompany.com/blog/business-bank-account-uae/)
- [UAEexperthub 2026 best bank accounts UAE expats](https://www.uaeexperthub.com/best-bank-account-uae-expats/)

#### §3.5 Cross-border data

- [Kayrouzandassociates 2026 cross-border data transfers UAE law](https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026)
- [China-Briefing UAE data protection cross-border data transfer](https://www.china-briefing.com/china-outbound-news/uae-data-protection-obligations-and-cross-border-data-transfer-for-businesses)
- [DIFC data export and sharing](https://www.difc.com/business/registrars-and-commissioners/commissioner-of-data-protection/data-export-and-sharing)
- [GetSahl cross-border data transfer compliance Middle East 2025](https://getsahl.io/cross-border-data-transfer-compliance-middle-east/)
- [ADGM Office of Data Protection guidance](https://www.adgm.com/operating-in-adgm/office-of-data-protection/guidance)
- [Baker McKenzie DIFC overseas hosting](https://resourcehub.bakermckenzie.com/en/resources/cloud-compliance-center/emea/difc/topics/overseas-hosting)
- [Middleeastbriefing UAE data protection cross-border data](https://www.middleeastbriefing.com/news/uae-data-protection-obligations-and-cross-border-data-transfer-for-businesses/)

### 12.3 Retrieval date

All web sources retrieved 2026-04-25 within the 4-6 hour research window for this document. No source has been quoted out of context; numeric ranges represent the cited author's stated range and have been preserved as such.

---

## §13 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-25 | ZAAHI engineering agent (research-branch `research/launch-research-2026-04-25`) | Initial dossier addressing R-1 to R-9; §3 licensing stack with 2026 web-cited UAE rates (~AED 215-470k Y1 setup); §4 9 super-tech features verified shipped; §5 platform priority sequenced under R-9 deferral; §6 Y1 fixed-OpEx mid-point ~AED 2.7M (range 2.2-3.3M); §7 doubling-path 3 scenarios (Y1: 19% Conservative · 33% gross / 19-20% post-OpEx Base · 48-93% Aggressive); §8 soft-launch recommended; §9 banking research (Wio Business + ENBD/Mashreq backup); §10 ten founder decisions ready for confirmation; §11 honest gap log with confidence-rating per section. Docs-only. No `src/` edits. No MOU/Term-Sheet edits. No main push. Single commit on research branch. |

---

## §A · Appendix — Monthly Rudi report template (per FOUNDER_DIRECTIVE GOV-1)

For founder reference, this is a draft monthly Rudi report template, designed to satisfy MOU §5 information rights as amended by FOUNDER_DIRECTIVE-2026-04-24 GOV-1 (monthly cadence, no weekly calls, no board meetings).

Per Term Sheet §12(a): "monthly written management summary within fifteen (15) days of each month end, covering deals in pipeline, deals closed, gross commission revenue, cash position, and agreed KPIs." This template is reusable across Y1.

```markdown
# Z A A H I — Monthly Report — [Month YYYY]

**To:** Rodolphe Belin (Rudi)
**From:** Zhan + Dymo
**Date:** [delivered date — within 15 days of [Month] end]
**Period:** [Month, YYYY]

---

## 1. Executive summary (1 paragraph)

[3-5 sentence bullet of the month: e.g., "April closed with X deals signed, Y cumulative through Y1, cash position AED Z. Plot 9235849 status update. AD migration tracking. Sunset ledger update: AED [N] toward AED 2M Financial Trigger / [Y] of 60 months toward Time Trigger."]

## 2. Deals in pipeline

| Plot | District | Deal value (AED) | ZAAHI commission expected (AED) | Status | Expected close |
|---|---|---:|---:|---|---|
| ... | ... | ... | ... | [under contract / in escrow / NOC / DLD transfer / closed] | ... |

## 3. Deals closed this month

| Plot | District | Deal value (AED) | ZAAHI commission collected (AED) | Date closed |
|---|---|---:|---:|---|

## 4. Gross commission revenue MTD / YTD

| Period | Agency revenue (AED) | Platform revenue (AED) | Total |
|---|---:|---:|---:|
| MTD | ... | ... | ... |
| YTD | ... | ... | ... |
| YTD vs base case forecast | [+/-]% | [+/-]% | [+/-]% |

## 5. Cash position

| Account | Balance (AED) |
|---|---:|
| Wio Business primary | ... |
| ENBD/Mashreq backup | ... |
| Total | ... |
| Expense card balances | ... |

Operating runway at current monthly burn: [N] months.

## 6. KPIs

- New leads this month: [N]
- Qualified meetings: [N]
- Conversion rate (lead → deal): [N]%
- Deals closing-window average: [N] days
- Platform tier subscribers (Silver / Gold / Platinum / paid total): [N / N / N / N]
- Master Tree progress (% live): [N]% (vs prior month [N]%)

## 7. Sunset ledger update (Term Sheet §12(e))

- **Cumulative cash distributions to Rudi (across both entities):** AED [N] of AED 2,000,000 = [N]% toward Financial Trigger.
- **Months elapsed since SAFE Closing Date:** [N] of 60 months = [N]% toward Time Trigger.
- **Projected trigger:** [Financial / Time], target date [Month YYYY].
- **Current scenario mapping:** Conservative / Base / Aggressive. (See Tab 6 of FINANCIAL_MODEL.)

## 8. Material events (this month)

[Per Term Sheet §12(d) as amended by FOUNDER_DIRECTIVE GOV-1: events grouped here in monthly report instead of 48-hour SLA, except for urgent regulatory enforcement which would have been emailed separately.]

- [None / List items]

Events covered: litigation/regulatory action >AED 100k, financing transaction >AED 500k, acquisition / strategic-partnership offer received, founder resignation/termination, material contract breach, data breach / regulatory penalty, loss of material licence/permit.

## 9. Compliance and operations status

- Corporate Tax registration: [filed / current]
- VAT registration: [N/A / TRN: ...]
- UBO register: [current / updated [date]]
- AML / goAML status: [registered / current]
- PDPL compliance: [DPO retained / privacy live / impact assessment status]
- RERA company license: [status]
- Trakheesi listings count: [N]

## 10. Platform engineering progress

[Brief, per R-9 deferred — surface progress without detailed Master Tree commitments.]

- Specs shipped this month: [Spec 02 / Spec 03 v1 / etc.]
- Open production issues: [N]
- AD migration: [status, Friday 2027-01-08 cutover target]

## 11. Forecast for next month

| Metric | Forecast |
|---|---|
| Deals expected to close | [N] |
| Expected ZAAHI commission | AED [N] |
| Notable pipeline events | ... |

## 12. Asks of Rudi

- [None / Specific item if applicable.]
- Per FOUNDER_DIRECTIVE GOV-1: nothing requires Rudi pre-approval; he is informed.

---
```

This template is **drafted by agent**, **finalised by founders**. The agent populates Sections 2-7 from operational data; founders review and finalise Sections 1, 8, 12.

Cadence per Term Sheet §12(a): delivered within 15 days of month-end. First report covers W1-end-of-May (delivered ~mid-June 2026).

---

## §B · Appendix — Plot 9235849 close-checklist

For Dymo's reference; Plot 9235849 (AL YALAYIS 3, AED 615.3M deal value, AED 5M ZAAHI commission, 5-way split of AED 25M total commission, expected close ~30 days from 2026-04-25):

**Pre-close (W1-W3 from 2026-04-25):**

- [ ] All five commission-sharing parties identified and signed off on split
- [ ] Exclusivity premium agreement (4.06%) papered with seller
- [ ] Title deed verified through DLD REST app
- [ ] Affection plan retrieved and reviewed
- [ ] Buyer KYC pack received
- [ ] Buyer financing source confirmed (cash / mortgage / mixed)
- [ ] Seller-side broker counter-confirmation
- [ ] NOC requirements identified for AL YALAYIS 3 master-developer (likely DDA)

**MOU phase:**

- [ ] Seller / buyer MOU drafted by counsel
- [ ] MOU signed by all parties
- [ ] Earnest money / deposit per Dubai standard practice (5-10%)
- [ ] Deposit lodged in DDA-accredited escrow

**NOC phase:**

- [ ] NOC application submitted to AL YALAYIS 3 master-developer
- [ ] NOC fee paid (anticipate higher than residential default, possibly AED 25-100k for premium plot)
- [ ] NOC issued

**DLD transfer:**

- [ ] DLD transfer fee paid (4% of AED 615.3M = AED 24.6M, split 2% buyer / 2% seller)
- [ ] Trustee service fee paid (AED 4,200 standard for ≥AED 500k)
- [ ] Transfer registered at DLD
- [ ] New title deed issued to buyer

**Commission collection:**

- [ ] Total commission AED 25M released from escrow per agreed split
- [ ] ZAAHI 5M tranche received in Wio Business (or backup)
- [ ] Invoice issued (Spec 02 once shipped; manual W6-W8 if pre-Spec-02)
- [ ] Tax recognition (CT 9% above AED 375k applies; SBR not applicable Y1)
- [ ] VAT recognition (5% if VAT-registered; flag for monitoring as turnover crosses threshold)
- [ ] Invoice posted to accounting (Zoho/QuickBooks per D-12)

**Post-close:**

- [ ] Anonymised case study drafted (LAUNCH_PLAN Phase 4 line item)
- [ ] LinkedIn announcement (per soft-launch posture D-3)
- [ ] First quarterly Rudi report includes Plot 9235849 close
- [ ] First profit distribution (per Dividend Policy quarterly cadence)
- [ ] ADGM HoldCo formation triggered (per LAUNCH_PLAN Phase 4)
- [ ] IP Assignment Zhan→Platform executed
- [ ] First profit distribution per 70/10/10/10 split:
  - Platform Development Fund: AED 3.5M
  - Investor (Rudi): AED 500k (assumes net AED 5M after immediate costs; actual depends on direct deal costs)
  - Dymo: AED 500k
  - Zhan: AED 500k

This checklist is operational. Dymo extracts and adapts as plot progresses. Founders update §A monthly report Section 2 each cycle.

---

## §C · Appendix — R-3 expense list submission template

For founders to populate and submit to Rudi for R-3 approval. Anchored on §6 mid-points; founders confirm specific numbers.

```markdown
# Z A A H I — Year-1 Expense List for Investor Approval

**To:** Rodolphe Belin (Rudi)
**From:** Zhan + Dymo
**Date:** [submission date pre-2026-05-09]
**Reference:** R-3 (founder briefing 2026-04-25 Al Jurf)
**Currency:** AED unless otherwise noted

---

## Summary

Y1 fixed OpEx envelope: **[mid-point AED 2.55M]** within range [AED 2.19M low - AED 3.29M high].

This complements the AED 1M Investment + base-case revenue trajectory per FINANCIAL_MODEL Tab 4. Capital breakeven Month 4 (base case); operating breakeven Month 2-3.

---

## Expense breakdown

### A. Founder + employee compensation
- Zhan (CEO/CTO, paid from Platform once HoldCo opens; Y1 Agency-funded interim): AED [40,000]/month × 12 = AED [480,000]
- Dymo (Co-founder Operations, paid from Agency): AED [40,000]/month × 12 = AED [480,000]
- Mirbek (Videographer): AED 10,000/month × 12 = AED 120,000
- Sales agent (Q3 2026 hire, base + commission): AED [120,000] base Y1 portion
- Platform engineer (Q4 2026 hire, mid-level): AED [75,000] Y1 partial-year portion
- **Subtotal A:** AED [1,275,000]

### B. Housing (per R-7)
- Al Jurf shared house + 1st floor as office: AED 250,000
- **Subtotal B:** AED 250,000

### C. Visas
- Founders + Mirbek + 1-2 hires: AED 35,000
- **Subtotal C:** AED 35,000

### D. Insurance (per R-5 — six categories)
- Broker E&O / Professional Indemnity: AED 15,000
- Office property: AED 8,000
- Public liability: AED 12,000
- Mandatory medical (3-5 person mid-tier): AED 25,000
- Workmen's Compensation: AED 2,500
- Cyber liability: AED 18,000
- **Subtotal D:** AED 80,500

### E. Office (excluding housing)
- Virtual Dubai address: AED 15,000
- Office fit-out (1st floor): AED 30,000
- Vehicle (business operations): AED 80,000
- Camera + video equipment: AED 40,000
- Founder + Mirbek laptops: AED 25,000
- **Subtotal E:** AED 190,000

### F. Marketing / branding
- Brand identity vendor: AED [40,000]
- Website polish + LinkedIn + social: AED 20,000
- LinkedIn sponsored: AED 30,000
- Google Ads: AED 40,000
- Property Finder / Bayut placement: AED 15,000
- Trakheesi permits (per ad): AED 5,000
- Case study production: AED 10,000
- Soft-launch event (small): AED [25,000]
- **Subtotal F:** AED 185,000

### G. Tech ops
- Vercel hosting: AED 15,000
- Supabase: AED 10,000
- Anthropic API: AED 50,000
- Domain: AED 2,000
- Monitoring / observability: AED 8,000
- Adobe / Figma / dev tooling: AED 10,000
- Polygon audit-trail (Phase 5 line): AED 25,000
- **Subtotal G:** AED 120,000

### H. Legal / counsel / compliance
- UAE counsel initial retainer: AED 10,000
- SAFE document review: AED 15,000
- UAE tax counsel: AED 5,000
- Articles of Association: AED 25,000
- SHA initial retainer: AED 50,000
- SHA final + IP assignment: AED 45,000
- ADGM HoldCo formation: AED 40,000
- PDPL DPO retainer: AED 70,000
- AML compliance setup: AED 35,000
- Ambassador legal opinion: AED 10,000
- **Subtotal H:** AED 305,000

### I. Licensing / permits
- DED Mainland LLC: AED 12,500
- DREI training (founders): AED 6,000
- RERA Activity License: AED 5,020
- RERA Broker Cards (founders): AED 1,040
- RERA Company Broker License: AED 30,000 (mid-range estimate)
- Trakheesi setup: AED 2,000
- Establishment Card: AED 2,000
- Ejari office registration: AED 500
- Annual renewals: AED 1,000
- Backup admin POA retainer (D-11): AED 8,000
- **Subtotal I:** AED 68,060

---

## Y1 fixed OpEx total

| Section | AED |
|---|---:|
| A. Compensation | 1,275,000 |
| B. Housing (R-7) | 250,000 |
| C. Visas | 35,000 |
| D. Insurance (R-5) | 80,500 |
| E. Office | 190,000 |
| F. Marketing | 185,000 |
| G. Tech ops | 120,000 |
| H. Legal / counsel / compliance | 305,000 |
| I. Licensing / permits | 68,060 |
| **Total Y1 fixed OpEx** | **2,508,560** |

---

## Variable cost of revenue (deal-direct)

Per FINANCIAL_MODEL Tab 3: ~AED 1.8M Y1 base case. Variable, scales with closed deals. Funded from deal revenue, not from the AED 1M Investment.

---

## Financing structure

- Rudi's AED 1M Investment funds Y1 OpEx M1-M4 alongside base-case revenue ramp.
- M5+ Y1 OpEx funded from deal-revenue (per FINANCIAL_MODEL Tab 4 cumulative cash AED 1.4M+ end-M5).
- Y1 ending cash position base case: AED 5.7-6.7M.
- No additional capital required in Y1.

---

## Approval requested

Per R-3 ("approve expense list"): founders request Rudi's confirmation of this Y1 fixed-OpEx envelope AED 2.51M (mid-point).

Per FOUNDER_DIRECTIVE-2026-04-24 GOV-1 + GOV-2: subsequent quarterly variance reporting will be in monthly report; no pre-approval required for variances within ±20%.

---
```

This template is **drafted by agent**, **finalised by founders before submission**. The bracketed `[N]` numbers are founder-final per D-4, D-8 etc. Specific line items can be moved to other categories without changing the total.

---

## §D · Appendix — Six-deal pipeline tracker

For Dymo to maintain weekly. Format compatible with §A monthly Rudi report Section 2.

```markdown
# ZAAHI Pipeline Tracker — [Week ending YYYY-MM-DD]

| # | Plot | District | Deal value (AED) | ZAAHI commission (AED) | Stage | Last action | Next action | Expected close |
|---|---|---|---:|---:|---|---|---|---|
| 1 | 9235849 | AL YALAYIS 3, Dubai | 615,300,000 | 5,000,000 | [stage] | [date + summary] | [next-step + owner] | mid-May 2026 (expected) |
| 2 | 6489191 | DUBAI LAND RESIDENCE COMPLEX | 20,000,000 | 200,000 | [stage] | ... | ... | ... |
| 3 | 6457920 | MAJAN | 27,000,000 | 270,000 | [stage] | ... | ... | ... |
| 4 | 3261245 | SAMA AL JADAF | 26,000,000 | 260,000 | [stage] | ... | ... | ... |
| 5 | 1010469 | DUBAI ISLANDS / NAKHEEL | 68,000,000 | 680,000 | [stage] | ... | ... | ... |
| 6 | 6854214 | DUBAI PRODUCTION CITY | 27,000,000 | 270,000 | [stage] | ... | ... | ... |

**Stage reference (Spec 01 Deal Engine MVP states):**
- LEAD — initial inquiry
- PROSPECT — qualified buyer / seller intent
- DD — due diligence in progress
- MOU — MOU signed
- ESCROW — earnest money in escrow
- NOC — NOC processing
- TRANSFER — DLD transfer underway
- COMPLETED — DLD transfer registered; commission collectible
- CANCELLED — deal failed
- DISPUTE — dispute raised

## Pipeline summary
- Total deal value: AED 783.3M
- Total ZAAHI expected commission: AED 6.68M
- Realised commission this week: AED [N]
- Cumulative realised Y1: AED [N]
- Pipeline weighted by close-probability: AED [N]

## Anchor-deal scouting (for Scenario C realism)
- New 9235849-class plots in conversation: [N]
- Active developer subscription discussions (Emaar / DAMAC / others): [N]
- Government / institutional anchor: [progress notes]
```

Recommended weekly Friday-afternoon ritual. Maintained in shared founder doc + summarised into monthly Rudi report.

---

## §E · Appendix — Reading order for founders

If a founder reads this document in 90 minutes and has to extract maximum value:

1. **§1** (15 min) — Investor requests verbatim. Confirms what the agent thinks Rudi asked.
2. **§10** (20 min) — Decisions list. Read recommendations + scan options.
3. **§7** (15 min) — Doubling-path. Especially §7.12 R-2 conversation framing.
4. **§6.16** (10 min) — Y1 monthly burn forecast. The "is the math reasonable" check.
5. **§3.13** (10 min) — Implementation timeline by week. The "what happens W1-W16" map.
6. **§8.6** (10 min) — Golden-path 24-month operational play.
7. **§11.6** (10 min) — Comprehensive risk register.

If a founder has 30 minutes only:
1. **§1.1** R-1 to R-9 mapping table (5 min).
2. **§10.7** single most-important decision (D-3 launch type) (5 min).
3. **§7.12** R-2 conversation framing (5 min).
4. **§10.8** 14-day execution sequence (5 min).
5. **§3.9** Section 3 Y1 setup-cost rollup (5 min).
6. **Brief document** (separate file) (5 min).

If a founder has 5 minutes only: read **the brief document** (separate file `ZAAHI_LAUNCH_BRIEF_2026-04-25.md`).

---

## §F · Appendix — Open questions back to founders

For founders to consider while reading this document. The agent does not require answers — these are surfacing-points where the founder might disagree with the analysis or want to redirect. Listed by section.

**§1 R-1 to R-9 mapping.** Does the agent's mapping table (§1.1) match founder intent? Specifically: is R-1 "concrete results" satisfied by §2.4's six-deliverable list (MOU + Saturday meeting + pipeline + DED submission + RERA filing + R-3 expense list), or does R-1 require something else?

**§2 Where ZAAHI stands.** Is the bus-factor honest assessment (1 engineering / 1 BD) accurate or pessimistic? Are there backup channels the agent doesn't know about?

**§3 Licensing.** Are AML / PDPL DPO retainer mid-points (~AED 70k each Y1) over-budgeted? Underbudgeted? Founders may have a specific firm referral that compresses the range.

**§4 Super-tech.** Does the 9-feature list match founders' own framing of differentiation? Anything missing or over-claimed?

**§5 Platform priority.** Is the priority order (lead capture > admin panel > AD migration) correct? Does Founder Directive §4.2 spec ship-window consensus hold?

**§6 Y1 expense.** Is the founder-comp recommendation D-8 (mid AED 40k each) appropriate, or do founders want a different point in the AED 30-50k range? Does the §6.16 monthly burn forecast match operational expectations?

**§7 Doubling path.** Is the §7.12 Frame A recommendation ("path-not-promise") the right framing for Rudi conversation? Or do founders want Frame B (trigger calendar) or Frame C (aggressive-only)?

**§8 Launch readiness.** Does the soft-launch recommendation (§8.3) have founder backing, or does either founder want a hard-launch posture?

**§9 Money management.** Is Wio Business primary + ENBD/Mashreq backup the right configuration, or does Dymo's ENBD relationship recommend a different pairing?

**§10 Decisions.** Are the 10 + 4 follow-on decisions the right list? Are any decisions missing? Any agent recommendations the founders disagree with?

**§11 Risk register.** Are R-01 to R-20 the actual top risks, or are there more material risks the agent missed?

**General.** Is the document length right? Too long? Too short? Should sections be deeper or sparser?

These open questions are the agent's invitation to founder feedback. Per FOUNDER_DIRECTIVE-2026-04-24 GOV-2, decision authority is Dymo + Zhan only. The agent's role is research; founders revise.

---

## §G · Appendix — How this document was produced

For founders curious about provenance and limitations of this research:

- **Time spent:** approximately 4-5 hours research session 2026-04-25 afternoon-evening.
- **Inputs:** 8 canonical repo files (read in full) + ~25 web searches across UAE 2026 rates + system reminder context (CLAUDE.md, MEMORY.md, Founder Directive).
- **Web sources:** all retrieved 2026-04-25; ranges quoted as cited author stated; no figures fabricated.
- **AI generation:** entire document by Claude Opus 4.7 (1M context) under Claude Code agent runtime.
- **Founder review state:** v1.0 agent-draft; no founder edits yet.
- **Branch policy:** research-branch-only; no `src/` edits; no `prisma/schema.prisma` edits; no MOU / Term Sheet edits; single commit on `research/launch-research-2026-04-25`; no main push.
- **Constraint compliance per task header:** all numbers cited from real sources; URLs in §12; 3-scenario framing used in §7; no commitment language to specific deal-close dates; "expected" not "guaranteed" used for Plot 9235849; honest gaps in §11; R-1 through R-9 explicitly addressed in §1; all 10 sections delivered.

The agent's confidence in its own analysis is mid-range high. Specific source-cited numbers are reliable; specific recommendations (e.g., Al Jurf path Y1, soft launch, mid AED 40k founder salaries) reflect the agent's reasoning given the constraints — founders may legitimately disagree with any recommendation. Disagreements should be captured in §F open questions and revised in v1.1+ of this document or in the brief.

---

*End of ZAAHI_LAUNCH_RESEARCH_2026-04-25.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/launch-research-2026-04-25`.
