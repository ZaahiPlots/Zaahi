# Feasibility v6.0 — Founder Ratification Packet (P0 Items)

**For:** Zhan (founder, RE expert, 17 years)
**As of:** 5 May 2026
**Time required:** ≤2 hours total — 8 questions × 5–15 min each
**Companion to:** `08_RATIFY_TRIAGE.md` (research-closed items) · `09_COUNSEL_OUTREACH.md` (counsel-bound items)

This packet covers the 8 P0 items remaining after Stream 1 research closures. Each item is one personal-judgment call. Mark choice + leave free-text rationale in the spaces provided. Anything you don't ratify in this round can be deferred — the spec will mark "FOUNDER RATIFY pending" and Phase B Sprint 1 will use the proposed default until you say otherwise.

> **How to use this document:**
>
> 1. Read each question (1–2 minutes).
> 2. Pick option or write free-text.
> 3. Optional: brief rationale (1 sentence, helps future Claude / Phase B implementer).
> 4. Hand back to me — I commit your choices into spec rev-3 + Phase B Sprint 1 seeds.

---

## Q0 — Awqaf 14th engine (yes / no / defer)

**Background.** Spec rev-2 ships with 13 base engines. Per Zhan ratification 5 May 2026 Q4: *"Religious / Awqaf cost-only: ADD as 14th engine if Zhan confirms (UAE has significant awqaf land use, often comes up in feasibility requests). If Zhan unsure, defer to v7."*

**Why it matters.** Awqaf land cannot be sold (Sharia perpetuity), so a feasibility model collapses to cost-only with rental yield against the awqaf trustee. Adding the engine unlocks UAE awqaf-land feasibility requests — which could be material if ZAAHI's pipeline includes them.

**Estimated build cost in Phase B:** ~12 agent-hours (smaller than typical engine because cost-only / no exit calc).

**Choose:**

- [ ] **Option A — ADD as Engine 14 in v6.0.** Phase B build adds 12 hours; spec rev-3 documents.
- [ ] **Option B — DEFER to v7.** Spec rev-3 explicitly documents deferral; v7 work in 6+ months.
- [ ] **Option C — DEFER but reserve engine slot.** Engine 14 placeholder in spec; build pulls in v6.1 (1–2 weeks post-launch) with minimum viable cost-only logic.

**Founder choice: ___**

**Rationale (optional): __________________________**

---

## Q1 — LU-21: Healthcare cost / bed default for Engine 6

**Background.** Engine 6 Healthcare needs a default `costPerBedAed`. Stream 1 research (`08 §1.6`) closes via Saudi proxy + UAE aggregate range:

| Hospital class | UAE cost / bed (researched) |
|---|---|
| Public / mid-range general | AED 1.5 – 2.5 M |
| Private 5★ (DHCC tier) | AED 3 – 5 M |
| Specialty hospital | AED 4 – 7 M |
| Ultra-premium (American Hospital tier) | AED 6 – 10 M |

**Why it matters.** Determines auto-fill default that the calculator shows. Wrong default → diff badge mis-flags user inputs.

**Choose default for "private mid-tier":**

- [ ] **Option A — AED 3.0 M / bed** (research midpoint, conservative)
- [ ] **Option B — AED 3.5 M / bed** (DHCC Phase 1 implied)
- [ ] **Option C — AED 4.0 M / bed** (premium-positioned default)
- [ ] **Option D — Other:** ____________________________

**Founder choice: ___**

**Rationale (optional): __________________________**

---

## Q2 — LU-23: Educational cost / student-capacity default for Engine 7

**Background.** Engine 7 Educational needs a default `costPerStudentAed`. Stream 1 research (`08 §1.7`) found:

| School class | Cost / student (researched) |
|---|---|
| Nursery | AED 60 – 120 k |
| K-12 mid-tier (Indian / French / Russian) | AED 150 – 300 k |
| K-12 mid-premium (UK / US / IB acceptable) | AED 250 – 450 k |
| K-12 ultra-premium (GEMS R&I tier) | AED 350 – 600 k |

**Why it matters.** Same as Q1 — auto-fill default for the most-common sub-class.

**Choose default for "UK curriculum mid-premium":**

- [ ] **Option A — AED 350,000 / student** (low-end mid-premium)
- [ ] **Option B — AED 400,000 / student** (research midpoint, proposed default)
- [ ] **Option C — AED 450,000 / student** (high-end mid-premium)
- [ ] **Option D — Other:** ____________________________

**Founder choice: ___**

**Rationale (optional): __________________________**

---

## Q3 — UX-3: Tooltip authoring approach for ~84 fields × EN+AR

**Background.** Every input field has a 4-section tooltip (definition + formula context + source + UAE note). Spec count: ~84 fields. Two languages = ~168 tooltip strings.

**Why it matters.** Phase B Sprint 3 (12–16 hours) — but the content authoring requires either Zhan's voice or external translator. Determines who writes what and when.

**Choose:**

- [ ] **Option A — Zhan authors EN, external translator does AR.** Highest quality but Zhan-time intensive (~1 day across the field set).
- [ ] **Option B — Claude (this agent) drafts EN per spec rev-2 templates; Zhan reviews / overrides; external translator does AR.** Lowest Zhan time (~2 hours review); quality depends on Claude template fidelity.
- [ ] **Option C — Hybrid: Zhan authors top 20 critical-field tooltips (FAR, BUA, GFA, cap rate, ADR, etc.); Claude drafts remaining 64; external translator does AR.** Balanced quality + Zhan time (~3 hours).
- [ ] **Option D — Defer all to v6.1, ship v6 without tooltips.** Lowest cost but undermines transparency moat (the entire reason for v6).

**Founder choice: ___**

**Rationale (optional): __________________________**

---

## Q4 — UX-6: WCAG AA accessibility — Phase B inclusion of all 10 items

**Background.** v5 calculator measures 3.8:1 contrast on small labels (fails WCAG AA 4.5:1). Spec `03 §5.2` lists 10 mandatory upgrades for v6 Phase B:

1. Label colour upgrade SUBTLE → DIM
2. Section button `aria-expanded` / `aria-controls`
3. Engine selector `role="listbox"`
4. NumberInput `<label htmlFor>`
5. Result panel `aria-live="polite"`
6. Focus indicators visible (2px gold outline)
7. Keyboard navigation full
8. Diff badge `aria-label` for screen readers
9. Tooltip `aria-describedby`
10. Colour-only signals + icon / text

**Why it matters.** Legal-procurement diligence (e.g. enterprise developer subscription) increasingly requires AODA / EN 301 549 compliance. Skipping items risks exclusion from corporate / government tenders.

**Choose:**

- [ ] **Option A — All 10 items in Phase B Sprint 6 (mandatory).** Confirms spec; ~10–14 agent-hours.
- [ ] **Option B — Items 1, 5, 6, 8, 10 in Sprint 6 (high-impact only); items 2, 3, 4, 7, 9 in v6.1.** Saves ~5 agent-hours but ships v6 short of full AA.
- [ ] **Option C — Skip a11y in v6, address in v7.** Cheapest but undermines institutional credibility.

**Founder choice: ___ [Strongly recommend Option A — 10 hours is small relative to the legal risk]**

**Rationale (optional): __________________________**

---

## Q5 — DLM-16: Public-launch checklist — sign-off on 18 items

**Background.** Spec `04 §8` lists 18 mandatory items before flipping `/feasibility` from staging to production. Items range from counsel sign-off (1, 2, 3) to Cloudflare WAF deployment (4) to QA cross-browser (16) to VARA Fractional pathway (17) to RU translation queue (18).

**Why it matters.** Skipping any item creates a launch risk. The checklist is the gating mechanism for Phase B → production transition.

**Choose:**

- [ ] **Option A — Confirm all 18 items as gating; no public launch until all green.** Strictest; longest timeline.
- [ ] **Option B — All 18 mandatory EXCEPT item 18 (RU translation) — ship EN+AR public, queue RU for v6.1 1–2 weeks later.** Faster public launch; aligned with Q6 of original ratification.
- [ ] **Option C — Allow soft-launch in private beta (auth-gated subscribers only) before all 18 items green; flip to public later.** Earliest revenue capture; risks if counsel returns adversely.

**Founder choice: ___ [Spec rev-2 assumes Option B implicitly — but please confirm]**

**Rationale (optional): __________________________**

---

## Q6 — LU-2: DDA FAR per district seed table

**Background.** Stream 1 research (`08 §1.1`) reduced LU-2 from P0 → P1, but founder ack still useful for Phase B Sprint 1 seed. Proposed 8-row indicative seed:

| District | FAR cap (residential) | FAR cap (commercial) |
|---|---|---|
| Dubai Hills Estate | 2.0 – 2.5 | 3.0 – 4.0 |
| Dubai Marina | 6.0 – 8.0 | 6.0 – 12.0 |
| Business Bay | 4.0 – 6.0 | 5.0 – 8.0 |
| JLT | 5.0 – 7.0 | 6.0 – 10.0 |
| Emaar South | up to 3.5 | varies |
| Downtown Dubai | 6.0 – 12.0 | 8.0 – 15.0 |
| DIFC | 8.0 – 12.0 | 10.0 – 15.0 |
| Dubai Creek Harbour | 4.0 – 6.0 | 6.0 – 10.0 |

**Why it matters.** Initial seed for the database. Per-parcel affection plan still overrides for any specific deal — this is just the auto-fill default when no parcel is yet selected.

**Choose:**

- [ ] **Option A — Approve seed table as proposed.** Ship rev-2.
- [ ] **Option B — Approve with Zhan's overrides:** _______________________
- [ ] **Option C — Add 5 more districts** (specify): _______________________
- [ ] **Option D — Reject table; rebuild from canonical DDA data only.** Phase B blocker — requires affection-plan ingest before Sprint 2.

**Founder choice: ___**

**Rationale (optional): __________________________**

---

## Q7 — LU-26: Data Center capex / MW default for Engine 9

**Background.** Stream 1 research (`08 §1.9`) closes via JLL benchmark + UAE adjustments:

| DC Tier | UAE-adjusted AED / MW |
|---|---|
| Tier 3 (typical colocation) | AED 33 – 41 M |
| Tier 4 (high-availability) | AED 44 – 55 M |
| AI-optimised (Khazna spec) | AED 48 – 66 M |
| Edge (small) | AED 26 – 33 M |

**Why it matters.** Engine 9 default for the most-common sub-class.

**Choose default for "Tier 3 colocation, mid-size":**

- [ ] **Option A — AED 38 M / MW** (mid-range)
- [ ] **Option B — AED 43 M / MW** (research midpoint, proposed default)
- [ ] **Option C — AED 48 M / MW** (premium / AI-ready)
- [ ] **Option D — Other:** ____________________________

**Founder choice: ___**

**Rationale (optional): __________________________**

---

## Q8 — Counsel firm selection (Stream 3 cross-reference)

**Background.** Stream 3 drafted two emails: Crimson Legal + Kayrouz & Associates. Both require founder choice on send sequence + budget allocation.

**Why it matters.** Phase B legal budget allocation (~AED 5–15 k retainer initial, AED 30–80 k full ToU rebuild if pre-approval required). Determines counsel relationship + ToU draft owner.

**Choose:**

- [ ] **Option A — Send to BOTH simultaneously, compare quotes + speed.** Higher engagement cost (~AED 5 k each for initial scope) but fastest counsel-onboard. Recommended if launch timeline tight.
- [ ] **Option B — Send Crimson first (startup-focused), Kayrouz only if Crimson decline / slow.** Sequential; lowest cost; risks 2-week delay if Crimson is unresponsive.
- [ ] **Option C — Send Kayrouz first (tokenisation specialist) — VARA fractional pathway makes their specialty more relevant.** Sequential; alternative ordering.
- [ ] **Option D — Personal counsel introduction via Dymo's network (instead of cold email).** Bypasses cold outreach; depends on Dymo's contacts.

**Founder choice: ___**

**Send timing:**

- [ ] Send today (5 May 2026)
- [ ] Send after Wed 6 May Rudi meeting (defer 1 day)
- [ ] Send after Q1–Q7 above ratified (defer to capture full scope)
- [ ] Other: ____________________________

**Rationale (optional): __________________________**

---

## §99 Summary

| Q | Item | Estimated Zhan time | Default if not ratified |
|---|---|---|---|
| Q0 | Awqaf 14th engine | 10 min | Defer to v7 (proposed default) |
| Q1 | Healthcare cost / bed | 5 min | AED 3.0 M (Option A) |
| Q2 | Educational cost / student | 5 min | AED 400 k (Option B) |
| Q3 | Tooltip authoring | 15 min | Option C hybrid (proposed) |
| Q4 | A11y 10 items | 5 min | Option A all 10 (proposed) |
| Q5 | Public-launch checklist | 10 min | Option B EN+AR ship (proposed) |
| Q6 | DDA FAR seed table | 15 min | Option A approve (proposed) |
| Q7 | Data Center capex | 5 min | AED 43 M / MW (Option B) |
| Q8 | Counsel firm | 10 min | Option A both simultaneously (proposed) |
| **Total** | **80 min ≤ 2 hours** | |

If Zhan answers all 8 questions, Phase B Sprint 1 unblocks within 24 hours.

If Zhan accepts proposed defaults across the board (i.e. signs blanket "all proposed defaults approved"), Phase B unblocks **immediately**.

---

*End of founder ratification packet. Hand back with choices marked; rev-3 commit follows.*
