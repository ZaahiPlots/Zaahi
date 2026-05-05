# F3 Cascade Impact Report — 2026-05-05

**Trigger:** founder ratified four numbers in the F3 directive on
2026-05-05; this document flags the downstream impacts on documents
NOT directly edited, so the founder can decide whether and how to
recalculate the dependent figures.

**Scope:** flag-only. Per founder direction, no auto-recalculation
of the Rudi 437× MOIC, EBITDA margins, Sunset trigger timing, or
Y1–Y5 distributable net profit waterfall.

**Branch:** `research/viktor-package-2026-05-05`. F3 edits applied
in commit 4 (`docs(viktor-package): F3 ratified numbers + ...`).

---

## 1. F3 numbers — what was ratified

| # | Item | New ratified value | Replaces |
|---|---|---|---|
| F3-1 | Y1 budget envelope | **AED 1.5–1.7 M** | AED 1,000,000 (Rudi launch tranche only) |
| F3-2 | 24-month total budget envelope | **AED 3.1–4.5 M** | not previously stated |
| F3-3 | Phase 1 monthly cash burn | **AED 61.5 k base · AED 65 k ceiling** | not previously stated; closest existing number was P&L §7.2 Y1-end OpEx run-rate AED 270 k/mo |
| F3-4 | Founder authority limits | **AED 100 k single-event · AED 500 k cumulative monthly, jointly Zhan + Dymo** | TERM_SHEET §12(d) framed AED 100 k / AED 500 k as Material-Event notification thresholds only — now clarified to also serve as authority limits |

---

## 2. Documents updated in commit 4

| Doc | Change |
|---|---|
| `PITCH_DECK_v1.md` | Slide 16 header retitled "Use of Funds (Year 1 Budget Envelope AED 1.5–1.7 M)"; envelope composition note added above existing AED 1.0 M line-item table |
| `LAUNCH_PLAN.md` | Orientation paragraph updated with Y1 envelope + 24-mo total + Phase 1 burn; Phase 1 section gets explicit monthly burn line |
| `TERM_SHEET.md` | §12(d) extended to flag the dual purpose; new §12(f) codifies the joint Zhan + Dymo authority limits |

**Not auto-updated** (per founder "do not auto-recalculate"):
`P_AND_L_STATEMENT.md`, `FINANCIAL_MODEL_V1.md`,
`PROFIT_DISTRIBUTION_MECHANICS.md`, `EXECUTIVE_SUMMARY.md`,
`Q_AND_A_PREP.md`, `MOU_RUDI.md`.

---

## 3. Cascade impact — what may need recalculation

### 3.1 — The Y1 envelope expansion source is unspecified

F3-1 says Y1 budget = AED 1.5–1.7 M but Rudi's investment is AED
1.0 M. The AED 0.5–0.7 M delta has no documented source. Possible
readings:

- **Reading A:** Founder cash injection (Zhan / Dymo personal capital
  bridging the AED 0.5–0.7 M gap). If so, this changes the cap-table
  ramifications — founder personal capital injected pre-revenue could
  warrant a corresponding equity / loan adjustment, which is a
  TERM_SHEET / SHA matter.
- **Reading B:** First-deal revenue (Plot 1, target Jun 19) reinvested
  in Months 4–12 to hire the sales agent and platform engineer
  referenced in `LAUNCH_PLAN.md` Phase 5. The P&L Y1 cash flow
  (`FINANCIAL_MODEL_V1.md` Tab 4, Months 9–12 cumulative ~AED 5.7 M)
  easily supports AED 0.5–0.7 M reinvestment without external capital.
- **Reading C:** Bridge loan or deferred founder salaries — neither
  currently encoded.

I drafted the new PITCH_DECK Slide 16 + LAUNCH_PLAN orientation text
on **Reading B** (founder cash injection AND/OR first-deal agency
revenue reinvested). Founder should confirm which reading is correct
before the package goes external; the language is currently
deliberately ambiguous so it can be tightened in either direction.

### 3.2 — Y1 OpEx vs the AED 1.5–1.7 M envelope

P&L §3.2 + §3.4 + §3.5: Y1 Total Costs (CoR + OpEx) = **AED 3.41 M**.
P&L §7.2 Y1-end monthly OpEx run-rate = **AED 270 k/mo** = AED 3.24 M
annualised.

The AED 1.5–1.7 M envelope is ~half the P&L's Y1 cost base. Most
plausible reconciliation:

- The envelope = **fixed costs only** (founder comp + office + legal
  + insurance + tech + marketing) ≈ AED 1.6 M Y1 base. Excludes
  variable Cost of Revenue:
  - Agent commissions (15 % of Agency revenue) = AED 1.17 M Y1
  - Direct deal costs, payment processing, third-party data, support
    tooling = AED 0.63 M Y1
  - Total variable CoR = ~AED 1.8 M Y1, scales with deals closed
- Adding the variable CoR back: **AED 1.6 M envelope + AED 1.8 M
  CoR ≈ AED 3.4 M**, which **matches the existing P&L Y1 total**.

**If this reconciliation holds**, the F3 envelope is a re-presentation
(fixed-only view) of the existing P&L, NOT a downward revision.
Distributable Net Profit, EBITDA, Rudi's distribution, and the 437×
MOIC are **unchanged**.

**If the envelope IS a downward revision** (Y1 fixed costs cut from
~AED 1.6 M to AED 1.5–1.7 M is no change; but if the founder means
"AED 1.5–1.7 M is the all-in Y1 cash burn including variable CoR",
then the P&L needs material rework):

- Y1 OpEx + CoR drops from AED 3.41 M to AED 1.5–1.7 M
- Y1 EBITDA at AED 8.31 M revenue rises from AED 4.9 M to ~AED 6.6–
  6.8 M
- Y1 EBITDA Margin rises from 59 % to ~80 % (unrealistic for a
  hybrid brokerage-platform; would draw immediate investor
  scepticism)
- Distributable Net Profit Y1 rises from AED 4.07 M to ~AED 5.5–5.8 M
- Rudi 10 % Y1 distribution rises from AED 407 k to ~AED 550–580 k
- Cumulative trajectory accelerates: Sunset Financial Trigger could
  fire in **late-Y2 instead of mid-Y3**
- 10-year MOIC base case rises above 437× (proportional to
  per-year cash distribution increase)

**Founder must confirm definition of "Y1 budget envelope":**
- (i) fixed costs only — no P&L recalc needed; or
- (ii) all-in Y1 cash burn — material P&L rework required.

### 3.3 — 24-month total AED 3.1–4.5 M

By the same logic as 3.2:

- **Reading (i) — fixed-only:** Y1 fixed AED 1.6 M + Y2 fixed AED
  1.5–2.9 M = AED 3.1–4.5 M. Consistent with P&L §3.4 Y1 OpEx AED
  1.61 M + Y2 OpEx AED 4.45 M (the upper envelope at AED 4.5 M
  exceeds the Y2 OpEx but is in the right zone).
- **Reading (ii) — all-in:** AED 3.1–4.5 M for 24 months means
  ~AED 1.55–2.25 M per year all-in — below the P&L Y1 total of
  AED 3.41 M alone, let alone Y1+Y2 total of AED 12.16 M.
  Reading (ii) is **structurally inconsistent** with the existing
  scaling P&L unless the entire model scales down.

I encoded **Reading (i)** in the new LAUNCH_PLAN orientation text;
founder should confirm.

### 3.4 — Phase 1 burn AED 61.5 k/mo

This is the cleanest of the four numbers. Phase 1 (LAUNCH_PLAN
section) is defined as the pre-LLC window: MOU signed → agency
formation documents submitted → counsel engaged → entity registration
in progress. Per the new ratified milestone schedule (Apr 22 / May 5
trade licence / May 8 Rudi wire), Phase 1 spans roughly 2.5 weeks (Apr
22 → May 8). Phase 1 spend at AED 61.5 k/mo × 0.6 months ≈ **AED 37
k** total — a small fraction of either Rudi's AED 1 M tranche or the
AED 1.5–1.7 M envelope.

After Phase 1, monthly burn ramps as the Agency starts paying salaries
(LAUNCH_PLAN Phase 2: founders + videographer + 3-month rent advance =
~AED 200 k Month-1 Phase-2 spend), reaching the P&L §7.2 Y1-end run-
rate of AED 270 k/mo by Month 12.

**No cascade to MOIC** if Phase 1 is correctly scoped to the pre-LLC
window. The new Phase 1 burn figure is additive context, not
contradicting the ramping P&L profile.

### 3.5 — Founder authority §12(f)

Pure governance addition. Doesn't affect any number in the package.

What the new §12(f) implies for operational pace:

- Single-event commitments up to AED 100 k (e.g., a sales agent
  monthly retainer signing, a marketing campaign, a hardware purchase
  bundle) can move without Board pre-approval.
- Cumulative monthly spend up to AED 500 k can move without Board
  pre-approval.
- The Q1 (May–Jul 2026) cash-flow profile in `FINANCIAL_MODEL_V1.md`
  Tab 4 shows Y1 Month 1 OpEx AED 215 k, Month 2 AED 220 k, Month 3
  AED 335 k. **All three months sit comfortably below the AED 500 k
  monthly authority ceiling**, so founders can execute Phase 2 spend
  without Board pre-approvals throughout Q1.
- Q4 Y1 monthly OpEx reaches AED 470 k (Month 12) — still below the
  AED 500 k ceiling but tight. Y2 onward exceeds AED 500 k/mo, so
  Y2+ ordinary-course operations will require a different authority
  framework or a Board-resolution-driven monthly spend pre-approval.
- **Open item for SHA drafting:** does the AED 500 k/mo ceiling
  escalate with the operational scale of the Agency? E.g., AED 500 k
  at Y1, AED 1 M at Y2, AED 2 M at Y3+? Or stays fixed and Board
  pre-approval becomes a quarterly recurring item from Y2?

---

## 4. Specific docs that may need follow-up edits

| Doc | Section | What might need updating, contingent on Reading (i) vs (ii) above |
|---|---|---|
| `EXECUTIVE_SUMMARY.md` | §Financial Snapshot | Y1 EBITDA AED 5.0 M, Y1 Distributable Net Profit AED 4.07 M, Rudi 10 % Y1 distribution AED 407 k — change only if Reading (ii) confirmed |
| `PITCH_DECK_v1.md` | Slide 15 Financials | Same — entire Y1 column subject to recalc if Reading (ii) |
| `FINANCIAL_MODEL_V1.md` | Tab 1 §1.4 cost structure; Tab 3; Tab 4 Y1 monthly cashflow; Tab 6 Scenarios; Tab 8 KPIs | Wholesale recalc if Reading (ii) |
| `P_AND_L_STATEMENT.md` | §1, §3 (entire), §4 Scenario Analysis, §5 Quarterly Breakdown, §7 Cost Structure, §8 Rudi's Return Trajectory, §9 KPIs, §10 Sensitivity, §11 Reconciliation, §12 Tax, §13 Comparable Benchmarking, §15.1 Appendix | Document-wide recalc if Reading (ii); §11 Reconciliation table would need full re-build |
| `PROFIT_DISTRIBUTION_MECHANICS.md` | §2.3 Worked example, §2.4 detailed walkthrough Y1 | Recalc if Reading (ii) |
| `Q_AND_A_PREP.md` | Q3 (AED 407 k Y1 mention); Q6 (437× MOIC) | Recalc if Reading (ii) |
| `MOU_RUDI.md` | §4 Sunset definition references "AED 2,000,000 cumulative" — unchanged regardless | No change |
| `TERM_SHEET.md` | §4 Sunset / §12 / §15 / §22 — Authority §12(f) added; nothing else changes | Already updated |
| `LAUNCH_PLAN.md` | Phase 5 scaling — Y1 base target metrics include AED 7.8 M Agency revenue, AED 4.07 M Distributable Net Profit, AED 407 k Rudi distribution | Recalc if Reading (ii) |

---

## 5. Recommendation to founder

Before Phase C branding, please confirm:

1. **Reading (i) or Reading (ii)** for the AED 1.5–1.7 M Y1 envelope.
   - Reading (i) — fixed costs only — needs **no** further recalc.
   - Reading (ii) — all-in cash burn — triggers a **document-wide
     recalc** across at least 7 of the 14 docs. Materially
     impacts the 437× MOIC headline.
2. **Source of the AED 0.5–0.7 M Y1 envelope expansion** beyond
   Rudi's AED 1.0 M tranche (founder injection vs first-deal revenue
   reinvested vs bridge loan).
3. **Whether founder authority §12(f) ceiling scales** with operational
   maturity (Y1 AED 500 k/mo → Y2 AED 1 M/mo → Y3+ AED 2 M/mo) or
   stays fixed.
4. **F2 (loan vs SAFE)** — orthogonal to F3 but still pending
   post-Wed 6 May Rudi meeting.

After all four are answered, Phase C branding can run.

---

*End of cascade flag report. No mathematical recalculations have been
performed; this document inventories the dependencies so the founder
can scope the next step.*
