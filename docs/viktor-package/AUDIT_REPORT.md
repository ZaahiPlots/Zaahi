# Investor Package Audit — 2026-05-05

**Trigger:** Tue 5 May meeting with Viktor Jordán (senior fundraising
lead candidate, NDA signed at meeting); Wed 6 May meeting with Rudi.
Audit precedes branded-PDF generation (Phase C, paused pending
founder go-ahead).

**Branch:** `research/viktor-package-2026-05-05` (forked from
`drafts/investor-package-v7` @ `8415842`).

**Scope:** 14 markdown files (12 in `docs/investor-package/`, 1 in
`docs/investor-package/research/`, 1 in `docs/research/`). Task brief
asked for 15 — see CRITICAL #6 for the gap.

---

## Headline signoff

**Status: NEEDS WORK before external (Viktor) distribution.**

Two structural issues block external release:

1. The package is dated **2026-04-19** ("Sunday at Al Jurf"). Today is
   2026-05-05. The new ratified milestone timeline (Apr 22 / May 5 /
   May 8 / Jun 19 / Aug 14 / Jan 18 2027 / Q1-Q2 2028) is not in any
   document. **All 14 docs are calendar-stale.** Out of scope to
   auto-fix per task constraint — flagged for founder action.
2. The instrument is described as **Post-Money SAFE** in seven
   documents. Task brief says the "Rudi loan pivot" is not yet
   ratified — meaning structural revision is pending. Out of scope to
   auto-fix per task constraint — flagged for founder action.

For internal (founder + Rudi) distribution, the package is **READY
with caveats** — the substance, numbers, and reconciliation across
documents are tight; the issues above are calendar / structural and
already known to both founders.

Phase B fixes (typos, refs, AI patterns, names/titles) have been
applied — see §6.

---

## 1. Cross-document number consistency — table

All figures in AED unless noted. ✓ = consistent across all docs.

| Metric | README | EXEC_SUMMARY | PITCH_DECK | TERM_SHEET | MOU_RUDI | FIN_MODEL | LAUNCH_PLAN | PROFIT_DIST | P_AND_L | Q_AND_A | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Y1 Total revenue | 8.31 M | 8.31 M | 8.31 M | — | — | 8.31 M | 8.31 M | n/a | 8.31 M | — | ✓ |
| Y1 Agency revenue | 7.8 M | 7.8 M | 7.8 M | — | — | 7.8 M | 7.8 M | 7.8 M | 7.8 M | 7.8 M | ✓ |
| Y1 Platform revenue | 0.51 M | 0.51 M | 0.51 M | — | — | 0.51 M | 0.51 M | n/a | 0.51 M | — | ✓ |
| Y1 EBITDA | — | 5.0 M | 5.0 M | — | — | 5.0 M | 5.0 M | n/a | 4.9 M (build) / 5.0 M (rounded) | — | ✓ (5 % presentation rounding documented in P&L §3.5 Note) |
| Y1 Distributable Net Profit | — | 4.07 M | 4.07 M | — | — | 4.068 M | 4.068 M | 4.068 M | 4.068 M | 4.07 M | ✓ |
| Y1 Rudi 10 % distribution | — | 407 k | 407 k | — | — | 407 k | 407 k | 407 k (worked example) | 407 k | 407 k | ✓ |
| Y5 Total revenue | — | 190 M | 190 M | — | — | 190 M | — | n/a | 190 M | — | ✓ |
| Y5 Platform revenue | — | 60 M | 60 M | — | — | 60 M | — | n/a | 60 M | — | ✓ |
| Y10 Platform revenue (target) | — | — | — | — | — | — | — | — | 800 M | — | ✓ |
| Y10 Platform IPO valuation (Base) | — | 5.6 B | 5.6 B | — | — | 5.6 B | — | n/a | 5.6 B | 5.6 B | ✓ |
| Rudi 10-year MOIC (Base) | — | 437× | 437× | — | — | 437× | 437× | n/a | 437× | 437× | ✓ |
| Rudi 10-year total return (Base) | — | 437 M | 437 M | — | — | 437 M | 437 M | n/a | 437 M | — | ✓ |
| Sunset Financial Trigger | 2 M | 2 M | 2 M | 2 M | 2 M | 2 M | 2 M | 2 M | 2 M | 2 M | ✓ |
| Sunset Time Trigger | 5 yr | 5 yr | 5 yr | 5 yr | 5 yr | 5 yr | 5 yr | 5 yr | 5 yr | 5 yr | ✓ |
| Sunset = earlier of (a) (b) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Base-case Financial Trigger timing | mid-Y3 | mid-Y3 | mid-Y3 | — | — | mid-Y3 | mid-Y3 | mid-Y3 | mid-Y3 | mid-Y3 | ✓ |
| Profit split 70/10/10/10 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Agency cap pre-Sunset 80/10/10 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| Agency cap post-Sunset 33.34/33.33/33.33 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ |
| Platform cap (perpetual) Z80/D10/R10 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ |
| Y1 deals (12 plots + 2 floors) | — | — | 14 (12+2) | — | — | 14 | 14 | — | 14 | ✓ | ✓ |
| Avg plot commission | — | — | 450 k | — | — | 450 k | — | — | 450 k | 450 k | ✓ |
| Avg floor commission | — | — | 1.2 M | — | — | 1.2 M | — | — | 1.2 M | 1.2 M | ✓ |
| **Y1 budget (use of funds)** | **1.0 M** | **—** | **1.0 M** | **—** | **—** | **1.0 M** | **517 k cumulative spend (out of 1.0 M)** | — | — | — | **⚠ Mismatches task brief 1.5–1.7 M** |
| **Phase 1 burn / month** | not stated | not stated | not stated | not stated | not stated | not stated | not stated | not stated | 270 k/mo Y1 OpEx run-rate (P&L §7.2) | not stated | **⚠ "61.5 k/mo" from task brief not present** |
| **Founder authority AED 100k / 500k** | not stated | not stated | not stated | 100k/500k as Material-Event thresholds (TERM_SHEET §12(d)) — not authority limits | not stated | not stated | not stated | not stated | not stated | not stated | **⚠ Founder authority threshold not encoded** |
| Agency CT post-SBR Y1 | — | 9 % above 375 k, ~2 % effective | — | 9 %, ~2 % effective | — | 9 % | — | 9 % above 375 k, ~2.1 % effective | 9 %, ~2.1 % effective Y1 | 9 %, ~2 % effective | ✓ |
| Combined effective tax rate | — | 2–4 % | — | 2–4 % | — | 2–4 % | — | 2–4 % | ~2 % Y1 → ~3 % Y5 | 2–4 % | ✓ |

Reconciliation table at P_AND_L §11 (line 605 of `P_AND_L_STATEMENT.md`)
also independently verifies the cross-doc numerical consistency. The
internal P&L numbers all reconcile.

---

## 2. Date consistency

### Current package state — all 14 docs

Every document is dated **`2026-04-19`** (header) and references
**"Sunday 2026-04-19, Al Jurf"** as the meeting date. The MOU
signature block reads "Signed at Al Jurf, UAE, on Sunday, 19 April
2026." The Term Sheet §23 references the MOU "dated Sunday 19 April
2026."

### Task brief — new ratified timeline

| Date | Milestone |
|---|---|
| 2026-04-22 (Wed) | Day 1 |
| **2026-05-05 (today)** | **Trade licence** |
| 2026-05-08 (Fri) | Rudi wire |
| 2026-06-19 (Fri) | Plot 1 |
| 2026-08-14 (Fri) | ADGM HoldCo |
| 2027-01-18 (Mon) | Phase 2 |
| 2028-Q1–Q2 | Series A |

### Conflicts vs current package

| Doc | Current text | New ratified |
|---|---|---|
| All 14 | Date "2026-04-19" | Should reflect 2026-05-05 (audit-as-of date) or be undated |
| README §"Sunday 2026-04-19 Al Jurf meeting — agenda" | MOU signing event Apr 19 | Per "Day 1 = Apr 22" reading, MOU was signed Apr 22 (not Apr 19) |
| README §"Signing sequence" | "Monday 2026-04-21 → Agency formation documents submitted" | Conflicts: trade licence May 5 (so formation submission earlier) |
| EXEC_SUMMARY §Timeline | "Monday 2026-04-21 — Agency formation documents submitted" | Same conflict |
| PITCH_DECK Slide 6 | "Apr 17 demo · Apr 18 commitment · Apr 19 MOU signed" | Day 1 = Apr 22 implies different sequence |
| TERM_SHEET §1 | "Dubai Mainland LLC; formation documents submitted Monday 2026-04-21" | Trade licence May 5 implies a different formation date |
| MOU_RUDI §8 Timeline | "Sunday 2026-04-19 (today)" | MOU signature date is now historical, not "today" |
| MOU_RUDI signature block | "Signed at Al Jurf, UAE, on Sunday, 19 April 2026" | If actual signing was Apr 22, this is wrong |
| FIN_MODEL Tab 4 | "Year 1 begins May 2026" | ✓ approximately consistent with new May 8 wire |
| LAUNCH_PLAN Phase 1 Day 0 | "Sunday 2026-04-19" Day 0 | Should be Apr 22 if Day 1 = Apr 22 |
| LAUNCH_PLAN Phase 1 Day 1 | "Monday 2026-04-21" | Trade licence May 5 implies submission later |
| PROFIT_DIST §1.2 | "First distribution target: after the first closed agency deal (expected July – August 2026)" | New "Plot 1 = Jun 19" implies first distribution earlier |
| LAUNCH_PLAN Phase 4 | "First agency deal closed (DLD transfer certificate issued) — TARGET: June – July 2026" | Adjust to "Jun 19 2026 target" |
| LAUNCH_PLAN Phase 5 | "Abu Dhabi expansion ... Year 1 Q4 or Year 2 Q1" / "ADGM HoldCo formation triggered upon first closed deal" | New ratified ADGM Aug 14 — preconditions from first deal need re-aligning |
| Q_AND_A | No explicit dates apart from inheritance from inputs | Indirectly affected |

### Sunset wording

**Sunset = earlier of AED 2 M cumulative to Rudi OR 5 years** —
**verified consistent in all 10 docs that mention it** (README,
EXEC_SUMMARY, PITCH_DECK, TERM_SHEET, MOU_RUDI, FIN_MODEL,
LAUNCH_PLAN, PROFIT_DIST, P_AND_L, Q_AND_A). ✓

Task brief says: "Sunset = earlier of AED 2M cumulative to Rudi or 5
years" — **matches package.** ✓

### Pre-Sunset window labelling — minor inconsistency

| Doc | Wording |
|---|---|
| MOU_RUDI §2 | "pre-Sunset (Years 0–5 or until Financial Trigger)" |
| EXEC_SUMMARY §Equity | "(pre-Sunset, Years 0–3 or until Financial Trigger)" |
| PITCH_DECK Slide 9 | "pre-Sunset (Years 0–3 or until AED 2 M cumulative to Rudi)" |
| TERM_SHEET §3, §4 | Pre-Sunset → Sunset triggers per §4 (no "Years 0–X" label) |
| Z/D PROTECTIONS | "pre-Sunset" / "post-Sunset" without Year range |

**Issue:** "Years 0–3" (in EXEC_SUMMARY, PITCH_DECK) is the *base-case
Financial Trigger* window. "Years 0–5" (in MOU_RUDI) is the *time-cap
backstop*. Both are technically right — the labels differ by
viewpoint (base case vs worst case). **Flag for founder** — readers
may notice the discrepancy. Suggested wording: "Years 0 – Sunset
(base case mid-Year 3; backstop Year 5)".

### Conclusion

**14 / 14 documents need date updates.** All are authored as if Sunday
April 19 2026 is "today". Auto-fixing dates is **out of Phase B
scope**. Founder must confirm:
- The new MOU signing date (Apr 22 ratified, or different?)
- Whether to re-date all docs to 2026-05-05 (audit-as-of) or leave
  individual document dates as historical execution dates.

---

## 3. Names and titles

### Three principal names — verified

| Name | Long form | Short ("scare-quote") | Role | Status |
|---|---|---|---|---|
| Founder | **Zharkyn Ryspayev** | "**Zhan**" | Founder, CEO/CTO | ✓ all 14 docs consistent |
| Co-founder | **Dmytro Tsvyk** | "**Dymo**" | Co-founder, Operations Principal | ✓ all 14 docs consistent |
| Investor | **Rodolphe Belin** | "**Rudi**" | Principal Investor, Board Member | ✓ all 14 docs consistent |

### Equilibrium Advisory Group attribution — CONFLICT

Task brief: **"Equilibrium Advisory Group = Rudi only."**

The package, however, attributes EAG inconsistently:

| Doc / line | Attribution | Status vs task brief |
|---|---|---|
| EXECUTIVE_SUMMARY line 37 | "Dymo Tsvyk — ... **Partner at Equilibrium Advisory Group**" | ❌ wrong |
| PITCH_DECK Slide 6 line 104 | "deal pipeline from **Dymo's Equilibrium Advisory network**" | ❌ wrong |
| PITCH_DECK Slide 14 line 241 | "**Rudi** — ... **Partner at Equilibrium Advisory Group**" | ✓ correct |
| PITCH_DECK Slide 15 line 274 | "founder-confirmed deal pipeline from **Dymo's Equilibrium Advisory network**" | ❌ wrong |
| P_AND_L §4.5 line 295 | "**Dymo's Equilibrium Advisory network** + Zhan's plot-sourcing" | ❌ wrong |
| P_AND_L §9 line 572 | "**Dymo's Equilibrium Advisory Group** + Zhan's 17-year network" | ❌ wrong |
| P_AND_L §16 line 867 | "Dymo (**Equilibrium Advisory Group network**) and Zhan" | ❌ wrong |

**Phase B action:** EAG misattribution corrected per task brief —
Dymo's mention of EAG removed; pipeline-source phrasing reworked to
"Dymo's Dubai real-estate network" (more accurate, RERA-license-
based). PITCH_DECK Slide 14 (Rudi at EAG) preserved. See §6.

---

## 4. Master Tree §NN references

Per task instruction "every citation must resolve" against
`docs/architecture/MASTER_TREE_final.md` (canonical, on
`docs/master-tree-v3` branch).

| Cited section | Doc | Resolves? |
|---|---|---|
| §02 Residential | LAUNCH_PLAN Phase 5; PITCH_DECK Slide 18 | ✓ `knowledge/A_ASSETS/02_Residential/` |
| §08 Off-Plan | LAUNCH_PLAN Phase 5; PITCH_DECK Slide 18 | ✓ `knowledge/A_ASSETS/08_Off_Plan/` |
| §18 Referrals | (referenced in MASTER_TREE only) | ✓ `knowledge/B_PARTICIPANTS/18_Referrals/` |
| §41 AI | (referenced in MASTER_TREE only) | ✓ `knowledge/D_TECHNOLOGY/41_AI_System/` |
| §42 Blockchain | LAUNCH_PLAN Phase 5 | ✓ `knowledge/D_TECHNOLOGY/42_Blockchain/` |
| §47 Notifications | (referenced in MASTER_TREE only) | ✓ `knowledge/D_TECHNOLOGY/47_Notification_Engine/` |
| §77 Web Platform | (referenced in MASTER_TREE only) | ✓ `knowledge/K_ACCESS_PLATFORMS/77_Web_Platform/` |
| Master Tree v3 generally | README, EXEC_SUMMARY, PITCH_DECK Slide 7, MOU_RUDI §7, TERM_SHEET §16 | ✓ |

**All Master Tree section citations resolve.** No fix needed. ✓

---

## 5. Internal "see Section X" references — one bug

Cross-document references generally resolve, with one exception.

### Bug: Tax Efficiency section number in PROFIT_DISTRIBUTION_MECHANICS

`PROFIT_DISTRIBUTION_MECHANICS.md` has a numbering mismatch.

The main heading is `## 9. Tax Efficiency Design (three-layer
strategy)` (line 264), but the subsections under it are numbered
`### 8.1 Layer 1`, `### 8.2 Layer 2`, ..., `### 8.5` (lines 268–310).
Subsection numbers and parent section number do not match.

External docs that reference §8 of PROFIT_DISTRIBUTION_MECHANICS
expecting Tax Efficiency:

| Source | Reference | Resolves to |
|---|---|---|
| README §"Q&A · On tax" | "Dividend Policy §3 and §8 Tax Efficiency Design and ... Profit & Loss Statement §12" | Doc has `## 8. Sunset mechanics`, not Tax. **Broken.** |
| EXEC_SUMMARY line 124 | "Full detail in the Dividend Policy §3 and §8 Tax Efficiency Design" | Same break |
| TERM_SHEET §20 line 333 | "three-layer strategy documented in the Profit Distribution Mechanics addendum §3 and §8" | Same break |
| MOU_RUDI §3 line 95 | "see the Dividend Policy §3 and §8 for the tax-efficient structure" | Same break |
| Q_AND_A_PREP §5 line 35 | "Full detail in the Dividend Policy §3 and §8" | Same break |

**Phase B action:** Subsection numbers in PROFIT_DISTRIBUTION_MECHANICS
§9 corrected to `9.1 / 9.2 / 9.3 / 9.4 / 9.5`, AND every external
reference updated from `§8 Tax Efficiency` → `§9 Tax Efficiency`. See §6.

### Other cross-references — verified

| Source → Target | Resolves? |
|---|---|
| ZHAN_PROTECTIONS §4 → DYMO_PROTECTIONS | ✓ symmetric, no broken xref |
| DYMO_PROTECTIONS §4 → ZHAN_PROTECTIONS §4 | ✓ |
| ZHAN_PROTECTIONS table → MOU_RUDI §2, §4, §6, §7 | ✓ |
| DYMO_PROTECTIONS table → MOU_RUDI §2, §4, §6 | ✓ |
| Q_AND_A → MOU_RUDI | ✓ |
| EXEC_SUMMARY → P&L §6 | ✓ |
| PITCH_DECK Slide 11 references "266 API routes" | Stale (audit found 260 today; close enough). Not in scope. |
| MOU_RUDI §6 → "Founder vesting (the Memorandum of Understanding §6)" | Self-reference, ✓ |
| TERM_SHEET §15 → ZHAN_PROTECTIONS / DYMO_PROTECTIONS addenda | ✓ |
| TERM_SHEET §4 Sunset → §10 Reserved Matters | ✓ |
| FIN_MODEL Tab 5 → reconciles with P&L §3, §4 | ✓ |
| FIN_MODEL Tab 8 → "Term Sheet §12(e) Sunset ledger" | ✓ |
| P&L §11 reconciliation table → all docs | ✓ |
| LAUNCH_PLAN Phase 4 → "Profit Distribution Mechanics quarterly cadence" | ✓ |
| LAUNCH_PLAN Risk → "Zhan Protections addendum §1 / Dymo Protections addendum §1" | ✓ |

**Internal cross-references all resolve apart from the Tax-Efficiency
§8 vs §9 bug noted above.**

---

## 6. AI-pattern writing flags

Task lists rejected patterns: **triadic parallelism · triple
negations · setup-payoff · time reversals**. Audit flagged below;
**Phase B does NOT auto-rewrite the rhetoric** — these are pitch-
deck device choices the founder may want preserved.

| Pattern | Doc / line | Excerpt | Disposition |
|---|---|---|---|
| Triadic with negation | PITCH_DECK Slide 5 (line 82) | "Not a mock. Not a wireframe. A working platform." | **Flag** — classic AI cadence (¬ A · ¬ B · C). Keep if founder wants the punchiness; rewrite if "Working platform — not a mock or wireframe" reads cleaner to him. |
| Triadic / setup-payoff | PITCH_DECK Slide 8 presenter (line 145) | "Without the agency, the platform starves. Without the platform, the agency is just another Dubai brokerage. Together, they are ZAAHI." | **Flag** — borderline. Strong rhetoric, but textbook AI rhythm. |
| "X is the Y" parallelism | PITCH_DECK Slide 8 (line 141) | "The agency is the cash. The platform is the asset." | **Flag** — clean, defensible. |
| "X is Y, A is B" | PITCH_DECK Slide 17 presenter (line 380) | "Platform is the IPO path, Agency is the cash engine." | **Flag** — same shape, defensible. |
| Triadic of timing | EXEC_SUMMARY one-hook (line 19) | "AED 1,000,000 takes controlling investor position ... converts to ... and grants Rudi 10 % of the Platform for life." | **Flag** — long sentence, three-clause; arguably defensible because it carries genuine information, not rhetoric. |
| Setup-payoff | PITCH_DECK Slide 5 presenter (line 95) | "The product you saw operating on the screen last week is what is on this slide. It is not going to be; it is." | **Flag** — "It is not going to be; it is" = textbook AI emotional-payoff pattern. Strong candidate for rewrite. |
| Negation-affirmation | PITCH_DECK Slide 11 presenter (line 198) | "Do not round. Speak them precisely. Rudi respects specificity." | **Flag** — borderline. Three short imperatives. |
| Three-noun lists | PITCH_DECK Slide 1 emotional beat (line 29) | "Trust and poise. 5 seconds. Pause." | Defensible — stage direction style. |
| "Defensible" triplets | PITCH_DECK Slide 12 line 211 | "(Bayut listings / Huspy mortgages / PRYPCO tokenisation)" | Defensible — accurate competitor characterisation, not rhetoric. |

**Phase B disposition:** flagged-for-founder-review only. **No rewrite
applied** — the pitch-deck rhythms feel deliberate (Zhan / Dymo are
the speakers; the founder voice is theirs). If founder wants any of
these flattened, he can mark and we re-touch in a follow-up.

---

## 7. UK English, ZAAHI uppercase, AED/UAE consistency

### Locale: UK English ratified

**Inconsistency: "monetization" vs "monetisation".**

| Spelling | Occurrences |
|---|---|
| `monetisation` (UK ✓) | P_AND_L §3.5; P_AND_L §4 / §6 / §13 / §16 |
| `monetization` (US ✗) | LAUNCH_PLAN Phase 5; PITCH_DECK Slide 10 (header + body); PITCH_DECK Slide 12 (header) |

**Phase B action:** all `monetization` → `monetisation`. Done in §6.

**Inconsistency: "labor card" (US) — should be UK.**

| Doc | Wording |
|---|---|
| LAUNCH_PLAN Phase 2 line 86 / PITCH_DECK Slide 16 | "Employee registration ... visa, Emirates ID, medical insurance, **labor card**" |

UK spelling is "labour card". UAE official terminology can use either
(MOHRE uses "Labour Card" historically; some forms now use "Work
Permit"). **Phase B action:** `labor card` → `labour card`. Done in §6.

**Other UK / US scans (clean):**
- "favourable" — TERM_SHEET §8 ✓
- "minimise" — PROFIT_DIST §3.1 ✓
- "organisation" — not present
- "behaviour" — not present
- "centre" / "center" — both forms appear: "centred on the Plot"
  (PITCH_DECK ✓) and "ADGM Arbitration **Centre**" (TERM_SHEET ✓);
  no `center` typos found
- "Realised" / "realised" — used (P&L); ✓
- "pre-operational", "post-Sunset" — hyphenation consistent

### ZAAHI uppercase

**`ZAAHI` is uppercase in 100 % of references** in all 14 documents
(spot-checked manually). ✓

### AED / UAE

- `AED` always written without spaces in number (e.g. `AED 1,000,000`,
  `AED 7.8 M`). ✓
- `UAE` always uppercase, no `U.A.E.` or `Uae` typos. ✓

---

## 8. Typos and grammar

### Confirmed typos — all corrected in Phase B

| Doc / line | Typo | Fix |
|---|---|---|
| TERM_SHEET §Defined Terms (line 379) | `**Founders.** Zhan (Zharkyn Ryspayev) and Dmytro Tsvyk), collectively.` — extra `)` after `Tsvyk` | Remove the extra `)`. |
| PROFIT_DISTRIBUTION_MECHANICS §9 subsections numbered 8.1–8.5 under heading "## 9" | Subsection / parent mismatch | Renumber to 9.1–9.5 |
| README, EXEC_SUMMARY, TERM_SHEET, MOU_RUDI, Q_AND_A | Reference to "§8 Tax Efficiency" in PROFIT_DIST | Update each to "§9 Tax Efficiency" |
| LAUNCH_PLAN Phase 2 / PITCH_DECK Slide 16 | `labor card` | `labour card` |
| LAUNCH_PLAN Phase 5 / PITCH_DECK Slide 10 / PITCH_DECK Slide 12 | `monetization` | `monetisation` |
| EXEC_SUMMARY line 37 | `Dymo Tsvyk — ... Partner at Equilibrium Advisory Group` | Remove EAG attribution from Dymo |
| PITCH_DECK Slide 6, Slide 15 | `Dymo's Equilibrium Advisory network` | `Dymo's Dubai real-estate network` |
| P_AND_L §4.5, §9, §16 | `Dymo's Equilibrium Advisory network` / `Dymo (Equilibrium Advisory Group network)` | Same — re-attribute or remove |

### Borderline (not auto-fixed)

| Doc / line | Note | Disposition |
|---|---|---|
| PITCH_DECK Slide 4 line 64 | "**AED 2+ trillion** asset market. **AED 761 billion** transaction flow." conflicts with same slide line 67 "AED 760+ billion" | Cosmetic — `760` vs `761` is the same year, different rounding. Out of scope (numbers). |
| PITCH_DECK Slide 11 line 190 | "266 API routes"; live count today (audit branch) is 260 | Stale by 6 routes. Out of Phase B scope (numbers). |
| PITCH_DECK Slide 1 line 27 | `Confidential — Prepared for Rudi · Sunday 2026-04-19 · Al Jurf` (cover-page boilerplate) | Date staleness — out of Phase B scope (dates). |
| MOU_RUDI line 162 | "MOU signed | Sunday 2026-04-19 (today)" — **(today)** is now factually wrong | Out of Phase B scope (dates). |
| PROFIT_DIST §1.1 line 34 | References "UAE Federal Decree-Law 32/2021 (Commercial Companies Law)" — this is correct (replaced 2/2015) | ✓ |
| TERM_SHEET §20 line 333 | "Federal Decree-Law 47/2022 (Corporate Tax)" | ✓ |
| TERM_SHEET §20 line 333 | "Federal Decree-Law 8/2017 (VAT)" | ✓ |
| MOU_RUDI §2 line 48 | "Years 0–5 or until Financial Trigger" — see §2 of this report; differs from EXEC_SUMMARY "Years 0–3" | Flag, see §2. Not auto-fixed. |

---

## 9. CRITICAL findings (hard blockers for Viktor distribution)

### 9.1 — Date staleness (out of Phase B scope; flag for founder)

All 14 documents authored as of 2026-04-19. Today is 2026-05-05.
Every "Sunday 2026-04-19, Al Jurf" reference, every "Monday 2026-04-21
formation" reference, every "(today)" within MOU_RUDI is now
historical or incorrect. The new ratified milestone schedule (Apr 22 /
May 5 / May 8 / Jun 19 / Aug 14 / Jan 18 2027 / Q1-Q2 2028) is **not
in any document.**

**Disposition:** founder must approve a date-rebase pass. Suggested
approach: keep individual document "Date" header at original drafting
date for historical accuracy; add a **"Audit-as-of: 2026-05-05"**
header on every doc; insert a **revised milestone table** in EXEC_SUMMARY
§Timeline + LAUNCH_PLAN Phase 1 + MOU_RUDI §8 reflecting Apr 22 / May 5 /
May 8 / Jun 19 / Aug 14 / Jan 18 2027 / Q1-Q2 2028. This is a 30–60 min
edit pass once founder confirms exact dates.

### 9.2 — Loan vs SAFE structural conflict (out of Phase B scope; flag)

Seven documents describe Rudi's instrument as **"Post-Money SAFE"**:
TERM_SHEET §1, EXEC_SUMMARY one-hook, PITCH_DECK Slide 17, MOU_RUDI
preamble, FINANCIAL_MODEL_V1 header, PROFIT_DIST §1, P_AND_L header.
README §3 "Term Sheet" row in document index also says "Post-Money
SAFE."

Task brief says: "Rudi loan pivot not yet ratified. Flag only."

**Disposition:** if Rudi's instrument changes from SAFE to loan, the
following sections of the package need a re-write (not just date
update):

- TERM_SHEET §2 ("Investment Amount" — single-tranche purchase
  remains) and §3 ("Equity at Conversion" — replaced by loan +
  separate share-issuance mechanism) and §6 (1× liquidation preference
  — re-anchor to loan principal vs equity) and §7 (Anti-dilution —
  unchanged for Platform; Agency unchanged) and §21 (Conditions
  Precedent — replace SAFE-conversion language).
- PROFIT_DIST §1.1 (legal framework — loan repayment vs dividend
  hierarchy).
- FINANCIAL_MODEL_V1 Tab 5 (distribution waterfall — loan-repayment
  schedule layered onto Sunset trigger).
- README, EXEC_SUMMARY, PITCH_DECK, MOU_RUDI, P_AND_L — instrument
  references throughout.

**This is ~40 % of TERM_SHEET, ~25 % of FINANCIAL_MODEL, plus headers/
references in the other docs.** Founder must ratify the loan pivot
before any text change.

### 9.3 — Y1 budget mismatch with task brief

Task brief: "Y1 budget AED 1.5–1.7 M".

Package: Y1 use-of-funds total in PITCH_DECK Slide 16 + LAUNCH_PLAN +
EXEC_SUMMARY + FINANCIAL_MODEL = **AED 1.0 M** (Rudi's investment).
LAUNCH_PLAN cumulative spend through Phase 4 = **AED 517 k** (still
inside the AED 1 M envelope).

**Possible reading 1:** new "Y1 budget AED 1.5–1.7 M" includes
revenue-funded spend in Months 6–12 (sales agent + platform engineer
hires from agency revenue, per LAUNCH_PLAN Phase 5). On the base
case, Y1 OpEx + CoR = AED 3.41 M (P&L §3.5) — far above 1.5–1.7 M.
On the Conservative case, Y1 OpEx + CoR = AED 2.5 M (sensitivity
table) — still above. So "1.5–1.7 M" doesn't cleanly map to any
existing P&L total.

**Possible reading 2:** task brief refers to "Y1 cash burn" = AED 1.5–
1.7 M, i.e. the Rudi AED 1 M plus first ~AED 500–700 k in agency-
funded launch operations. This roughly aligns with LAUNCH_PLAN Phase
5 narrative ("Up to 2 additional hires in Year 1, budgeted from Q2–Q4
agency revenue"), but no document contains a single AED 1.5–1.7 M
figure.

**Disposition:** founder must clarify which envelope is meant. **Out
of Phase B scope** (numbers).

### 9.4 — Phase 1 burn AED 61.5 k/mo not encoded

Task brief: "Phase 1 burn AED 61.5 k/mo".

P&L §7.2 has Y1-end monthly OpEx run-rate of AED 270 k (i.e. ~AED 270
k/month). LAUNCH_PLAN doesn't break down monthly burn explicitly; it
gives cumulative phase totals. **No document contains AED 61.5 k/mo.**

**Possible derivation:** if "Phase 1" means "before the LLC is
operating" (Apr 22 → trade licence May 5 = ~2 weeks), the AED 61.5
k/mo figure could correspond to founder dry-powder draw before the
agency starts paying salaries and rent. But this is interpretation —
no doc states it.

**Disposition:** founder must confirm definition. **Out of Phase B
scope.**

### 9.5 — Founder authority AED 100 k / 500 k thresholds

Task brief: "founder authority AED 100k / 500k".

No document encodes founder spending / commitment thresholds at AED
100 k / 500 k. The closest existing references:

- TERM_SHEET §12(d) — Material Event notification thresholds (not
  authority): "**any litigation or regulatory action involving the
  Company in excess of AED 100,000** in dispute value; **any financing
  transaction in excess of AED 500,000**".
- TERM_SHEET §10 Reserved Matters — only three categories (SHA / AoA
  amendment, dissolution, sale).

**Disposition:** founder must specify: is "AED 100 k / 500 k" (a) a
new layer of Reserved Matters that needs a new SHA clause; (b) a
founder-discretion ceiling (e.g. founders can commit up to AED 100 k
without Board approval, AED 500 k without shareholder approval); or
(c) an alignment of Material-Event thresholds to a different number?
**Out of Phase B scope.**

### 9.6 — Document count gap (15 task brief vs 14 found)

Task brief calls for "internal/ — 15 PDFs" and "external/ — 12 PDFs"
(15 − 3 = 12; the 3 omitted are DYMO_PROTECTIONS, ZHAN_PROTECTIONS,
PARKED_PROJECTS).

`drafts/investor-package-v7` has only **12 markdown files** in
`docs/investor-package/` plus **1 in `docs/investor-package/research/`**
(P_AND_L_RESEARCH.md), plus **PARKED_PROJECTS.md** in
`docs/research/`. Total: **14**.

The 15th file is most likely `docs/architecture/MASTER_TREE_final.md`
(canonical, lives on `docs/master-tree-v3` branch, READ-ONLY per task
constraint). If MASTER_TREE_final.md is intended to be PDF-rendered as
the 15th internal document, it would be checked out to this branch
without modification at Phase C time. **Founder confirmation needed.**

If the 15 ↔ 14 gap is a different doc the founder has in mind that
doesn't exist on `drafts/investor-package-v7` yet, that doc must be
written before Phase C. **Out of Phase B scope.**

---

## 10. HIGH findings (correctable in Phase B; applied)

| # | Issue | Fix applied |
|---|---|---|
| H1 | `PROFIT_DIST` §9 subsections numbered `8.1–8.5` (mismatch with parent `## 9`) | Renumbered subsections to `9.1–9.5` |
| H2 | External refs "see §8 Tax Efficiency" in PROFIT_DIST broke after H1 fix | Updated to `§9 Tax Efficiency` in README, EXEC_SUMMARY, TERM_SHEET, MOU_RUDI, Q_AND_A |
| H3 | `TERM_SHEET` Defined Terms — extra `)` after `Dmytro Tsvyk` | Removed extra `)` |
| H4 | `monetization` (US) used in 4 places | Replaced with `monetisation` (UK) |
| H5 | `labor card` used in 2 places | Replaced with `labour card` |
| H6 | `EXEC_SUMMARY` line 37: Dymo "Partner at Equilibrium Advisory Group" | Removed EAG attribution from Dymo's bio (per task brief: EAG = Rudi only) |
| H7 | `PITCH_DECK` Slide 6, 15: "Dymo's Equilibrium Advisory network" | Reworded to "Dymo's Dubai real-estate network" |
| H8 | `P_AND_L_STATEMENT` §4.5, §9, §16: "Dymo's Equilibrium Advisory network/Group" | Same — reworded |

---

## 11. Changes outside Phase B scope — flagged for founder

| # | Issue | Why deferred |
|---|---|---|
| F1 | Date rebase across all 14 docs | Out of Phase B scope (item 1: dates) |
| F2 | New milestone timeline encoding (Apr 22 / May 5 / May 8 / Jun 19 / Aug 14 / Jan 18 2027 / Q1-Q2 2028) | Out of Phase B scope (item 2: dates) |
| F3 | Loan vs SAFE structural conflict in TERM_SHEET, PROFIT_DIST, FINANCIAL_MODEL_V1 (and references in 4 other docs) | Per task constraint: "Rudi loan pivot not yet ratified. Flag only." |
| F4 | Y1 budget AED 1.5–1.7 M target — no single doc contains this figure | Out of Phase B scope (item 1: numbers) |
| F5 | Phase 1 burn AED 61.5 k/mo — not encoded anywhere | Out of Phase B scope (item 1: numbers) |
| F6 | Founder authority AED 100 k / 500 k thresholds — not encoded as authority limits anywhere | Out of Phase B scope — possibly requires new SHA clause |
| F7 | Pre-Sunset window labelled "Years 0–3" (EXEC_SUMMARY, PITCH_DECK) vs "Years 0–5" (MOU_RUDI) | Out of Phase B scope (item 2: dates) |
| F8 | 15-PDF vs 14-found gap | Out of Phase B scope — clarify intent before Phase C |
| F9 | AI-pattern flags (PITCH_DECK Slide 5/8/17 rhetorical triplets) | Borderline; pitch-deck device choice; not auto-rewritten |
| F10 | "266 API routes" in PITCH_DECK Slide 11 (live count today: 260) | Out of Phase B scope (item 1: numbers) |

---

## 12. Documents — short individual notes

| Doc | Lines | Notes |
|---|---|---|
| `README.md` | 236 | Index + agenda. Date-stale. Tax-efficiency §8 → §9 ref fixed. |
| `EXECUTIVE_SUMMARY.md` | 143 | Date-stale. Dymo EAG attribution removed. §8 → §9 ref fixed. |
| `PITCH_DECK_v1.md` | 420 | Date-stale on cover; rhetorical triadics flagged; "monetization" → "monetisation"; "Dymo's Equilibrium Advisory" → "Dymo's Dubai real-estate"; "labor card" → "labour card". |
| `TERM_SHEET.md` | 422 | Date-stale; SAFE structural-conflict flag; Defined Terms typo fixed; §8 → §9 ref fixed. |
| `MOU_RUDI.md` | 245 | Date-stale; signature block dated 19 April 2026 — must update if actual signing was 22 April. §8 → §9 ref fixed. |
| `FINANCIAL_MODEL_V1.md` | 392 | Date-stale; SAFE-structural conflict in tab structure; numbers internally consistent. |
| `LAUNCH_PLAN.md` | 242 | Date-stale (Day 0 = Apr 19); "monetization" → "monetisation"; "labor card" → "labour card". |
| `PROFIT_DISTRIBUTION_MECHANICS.md` | 335 | Date-stale; SAFE-structural conflict in §1; **§9 subsections renumbered**. |
| `P_AND_L_STATEMENT.md` | 879 | Date-stale; SAFE-structural; reconciliation table (§11) is the authoritative cross-doc-numbers source; "Dymo's Equilibrium Advisory" → "Dymo's Dubai real-estate" in 3 places. |
| `Q_AND_A_PREP.md` | 51 | §8 → §9 ref fixed. |
| `ZHAN_PROTECTIONS.md` | 142 | Clean. Date-stale (header). |
| `DYMO_PROTECTIONS.md` | 131 | Clean. Date-stale (header). |
| `research/P_AND_L_RESEARCH.md` | 261 | Research / sources document; not for external distribution. Internal-only. |
| `docs/research/PARKED_PROJECTS.md` | 60 | Research/ops doc; internal-only. |

---

## 13. Recommendation to founder

### Ready to circulate INTERNALLY (founder + Rudi) as-is

Substance, numbers, structure are tight. Both founders and Rudi
already know the timing has shifted; the calendar staleness is
recoverable by a 30-second verbal "you'll see Sunday April 19
throughout — that was the original draft date; the actual signing
moved to [Apr 22 / your decision]; everything substantive is current".

### NOT ready to circulate EXTERNALLY (Viktor) until

1. **Date rebase** — F1, F2 above. ~30–60 min once you confirm exact
   dates.
2. **Loan vs SAFE decision** — F3 above. If pivoting to loan, ~1–2 hr
   text re-write across 7 docs. If staying SAFE, no change needed.
3. **Confirm 15-doc set** — F8 above. Most likely action: render
   `MASTER_TREE_final.md` from `docs/master-tree-v3` as the 15th
   internal-only doc.
4. **(Optional)** Resolve F4 / F5 / F6 — Y1 budget / burn / authority
   numbers — if Viktor will be shown the financial detail at Tuesday's
   meeting beyond the headline.

After your green-light on the audit, Phase C generates branded PDFs
(toolchain choice + branding spec in `BRANDING_NOTES.md` to be
written at Phase C time).

---

*End of audit report. Phase B fixes applied to the 14 markdown files
on this branch; PDFs not yet generated.*
