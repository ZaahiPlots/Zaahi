# INVESTOR PACKAGE — Issues Flagged (Read-Only Pack)

**Document:** Issues discovered in `docs/investor-package/*` during the 2026-04-20 quality audit. Investor package is FINAL v7 and out-of-scope for direct correction by this audit. Items here require founder decision on whether to issue a v7.1 refresh.
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Investor package in scope (read-only):** `EXECUTIVE_SUMMARY.md`, `PITCH_DECK_v1.md`, `P_AND_L_STATEMENT.md`, `LAUNCH_PLAN.md`, `MOU_RUDI.md`, `TERM_SHEET.md`, `PROFIT_DISTRIBUTION_MECHANICS.md`, `Q_AND_A_PREP.md`, `ZHAN_PROTECTIONS.md`, `DYMO_PROTECTIONS.md`, `FINANCIAL_MODEL_V1.md`, `README.md`.
**Classification:** CONFIDENTIAL

---

## Executive summary

Two issues. One is a **calendar error** affecting every date-ordered narrative; it is cosmetic in investor reading (an investor glancing at "Monday April 21, 2026" does not compute the Gregorian weekday on sight) but embarrassing if a lawyer, CFO, or VC partner does compute it. The other is a **documented practice question** that surfaces now that the Agency has operational compliance items to handle.

Both are low-cost to fix if a v7.1 refresh is issued. Both are non-critical to hold up the Al Jurf MOU execution.

---

## Issue IP-1 — "Monday 2026-04-21" calendar error (multiple files)

### Affected files

- `EXECUTIVE_SUMMARY.md` §Timeline line "Monday 2026-04-21 — Agency formation documents submitted"
- `LAUNCH_PLAN.md` (likely) — timeline references to Monday April 21
- `PITCH_DECK_v1.md` Slide 6 — "Apr 19 · Demo delivered" (correct) — check if April 21 referenced
- Any other dated reference to "Monday April 21, 2026"

### Severity
MEDIUM for investor-facing reading; HIGH for legal / financial partner review.

### Issue detail

April 21, 2026 is a **Tuesday** in the Gregorian calendar. April 20, 2026 is the Monday. The MOU was signed Sunday 2026-04-19 at Al Jurf (correctly stated); Monday is therefore 2026-04-20, not 2026-04-21.

A reader who notices this asks: "If the team cannot get a calendar date right in the Executive Summary, what else have they missed?" The reputational delta is asymmetric — everyone expects calendar accuracy, nobody is impressed when you get it right, but a visible error erodes trust.

### Recommended correction for v7.1 refresh

Two options:

**Option A (preferred, minimal change):** Change "Monday 2026-04-21" → "Monday 2026-04-20" everywhere. This preserves the semantic meaning (the Monday immediately after Sunday MOU) and aligns to the Gregorian calendar.

**Option B:** Change "Monday 2026-04-21" → "Tuesday 2026-04-21." Preserves the date, corrects the day-of-week. Works if the team actually intended Tuesday for submission rather than Monday.

Recommended: Option A. It matches the investor-package narrative ("immediately the Monday after") and is consistent with research-pack / roadmap documents which now use April 20 as Day 1.

### Scope of refresh

Search-and-replace affected strings:
- "Monday 2026-04-21" → "Monday 2026-04-20"
- "Monday April 21, 2026" → "Monday April 20, 2026"
- Any "Mon Apr 21" → "Mon Apr 20"
- Downstream dates in Timeline that cascade from Day 1 — verify they still read correctly.

Estimated edit effort: 30 minutes if using Find/Replace across the 12 investor-package files; 1 hour if re-rendering any PDFs.

### Rationale for v7.1 vs. leaving as-is

- **Leave as-is:** Risk is reputational only; meeting-materials often have this kind of minor slip. Rudi has already seen + signed. Zero operational impact.
- **Refresh v7.1:** Low-cost, high-polish. Any future VC data-room submission (Series A Q1 2028) would include these docs; a v7.1 is preferable to a visible v7 error in a data room. Also: ADGM / Big 4 / strategic partner due-diligence packs would use investor-package contents.

**Recommendation:** issue v7.1 **before** the first material external circulation (e.g., first bank partnership MOU draft, first VC conversation, first strategic partner data room). Until then, v7 acceptable.

---

## Issue IP-2 — Corporate Tax + UBO filing obligations absent from Launch Plan

### Affected files

- `LAUNCH_PLAN.md` — operational launch sequence / compliance sub-sections
- `EXECUTIVE_SUMMARY.md` §Tax efficiency — mentions CT rates but not **registration obligation**
- `FINANCIAL_MODEL_V1.md` — CT calculations present; registration step implicit only

### Severity
HIGH if LaunchPlan serves as an operational briefing for the DPO or Chief of Staff. MEDIUM for investor reading.

### Issue detail

Two UAE regulatory obligations are mandatory for the Dubai Mainland LLC but not explicitly named in the investor package:

1. **Corporate Tax registration via EmaraTax portal** — mandatory for every UAE mainland LLC regardless of profit. Penalty AED 10 000 per Cabinet Decision 75/2023 if not registered. Source: Federal Decree-Law 47/2022.
2. **Ultimate Beneficial Owner (UBO) filing with DED** — mandatory within 60 days of incorporation per Cabinet Decision 58/2020 as amended by Cabinet Decision 109/2023. Any ownership change (e.g., Sunset auto-rebalance) triggers 15-day refile.

Neither appears in the `LAUNCH_PLAN.md` or the `EXECUTIVE_SUMMARY.md` timeline. Either's absence from an external-facing legal review would look like a gap in operational readiness.

**Note:** The research-pack `MASTER_IMPLEMENTATION_PLAN.md` + `IMPLEMENTATION_CHECKLIST.md` + `AGENCY_PLAYBOOK.md` have been updated in this audit round to include both obligations. The investor package is the one remaining gap.

### Recommended correction for v7.1 refresh

Add to `LAUNCH_PLAN.md` operational launch sequence:
- Week 3: "CT registration via EmaraTax portal (mandatory — AED 10 k penalty if skipped regardless of profit)."
- Week 3: "UBO register filed with DED. Shareholders / nominee-directors registers maintained. Internal 15-day change-notification workflow established."

Add to `EXECUTIVE_SUMMARY.md` §Tax efficiency footnote:
- "CT registration is mandatory for every mainland LLC (AED 10 k penalty if skipped). Separate from the 9 % CT liability that applies only above AED 375 k threshold. UBO register maintained per Cabinet Decision 58/2020."

Estimated edit effort: 1 hour.

---

## Issues surveyed and NOT flagged

- **Financial projections accuracy.** P&L base case (AED 7.8 M Y1 → AED 190 M Y5) reviewed against public-data benchmarks (Allsopp $77.8 M; Property Finder $614.8 M revenue; Emaar AED 49.6 B revenue). Projections are aggressive but defensible — not an "issue" per se.
- **Rudi equity mechanics.** Pre-Sunset 80/10/10, post-Sunset 33.34/33.33/33.33, Platform perpetual 80/10/10, profit distribution 70/10/10/10 fixed-for-lifetime — internally consistent and legally sound (BSA-prepared).
- **Tax positioning.** SBR ("Small Business Relief") correctly noted as not applicable Y1 due to AED 3 M threshold. Transfer pricing "local file from Y1" correctly flagged. "Target ~2–4 % effective tax burden" defensible given inter-company Service Fee mechanism.
- **IPO valuation AED 4.8 – 7.2 B target.** 8–9× revenue multiple on AED 600 – 800 M Y10 Platform revenue. Aggressive but within VC-comfortable range for a vertical SaaS + marketplace hybrid.
- **Competitive positioning.** `PITCH_DECK_v1.md` slide 7 "Master Tree" narrative is accurate and compelling; no factual gap vs. `COMPETITOR_DEEP_DIVE_2026.md`.

---

## Proposed v7.1 refresh scope (if founders approve)

### Minimal refresh (recommended)
- IP-1: calendar corrections (search-and-replace Monday April 21 → Monday April 20).
- IP-2: add CT registration + UBO filing to Launch Plan + Executive Summary footnotes.

Estimated effort: ~2 hours total. Ship as v7.1 with changelog at top: "Calendar corrections + explicit Corporate Tax registration + UBO filing obligations."

### Full refresh (if triggered by external event)
- Above + any numbers that have changed by Month X (e.g., first-deal commission actual vs projected).
- Visual re-render if investor-pack PDFs are branded differently for different audiences.

---

## Timing recommendation

- **Before first external circulation (first bank MOU draft, first VC conversation, first data room):** issue v7.1.
- **If no external circulation in next 6 months:** leave v7 as-is; any necessary refresh absorbed into future v8 (for Series A data room).

---

**End of INVESTOR_PACKAGE_ISSUES.md.** Companion: `AUDIT_FINDINGS.md` (research / roadmap docs), `CORRECTIONS_SUMMARY.md`, `QUALITY_CHECKLIST.md`.
