# Feasibility v6.0 — Master Tree Alignment Proposal (NEW rev-2)

**Status:** ALIGNMENT PROPOSAL only — INPUT for a future `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v-bump amendment that the founder ratifies separately.
**Authority:** Zhan ratification 5 May 2026 Q5 — *"§70 ANALYTICS ENGINE sub-node 'Feasibility Modelling' with cross-refs to §17/§19/§20/§66. CRITICAL: do NOT modify MASTER_TREE_final.md (CANONICAL FILE per CLAUDE.md). Write the alignment proposal to: docs/specs/feasibility-v6/06_MASTER_TREE_ALIGNMENT.md."*
**As of:** 5 May 2026
**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `07_METHODOLOGY.md`

> **rev-2 — NEW file.** This document is the alignment proposal that informs a future amendment to `MASTER_TREE_final.md`. The canonical file is **NOT** modified by this rev. Founder ratifies separately when ready to publish the amendment.

---

## §1 Audit finding context

Per `05_AUDIT_REPORT.md` Pass 2 finding **MT-1**:

> *"None of the spec files explicitly map the Feasibility Calculator to a Master Tree section. The closest mappings: §17 BROKERS' 'Tools' (CRM, Listing, Market Reports) — but no 'Feasibility Calculator' is listed. §66 MARKET INTELLIGENCE, §67 PRICE PREDICTION, and §70 ANALYTICS ENGINE are conceptually adjacent but the Feasibility Calculator isn't a clean fit for any one of them."*

This file resolves MT-1.

---

## §2 Proposal — `§70 ANALYTICS ENGINE` sub-node "Feasibility Modelling"

Per Zhan ratification 5 May 2026, the Calculator lives as a new sub-node under **Master Tree §70 ANALYTICS ENGINE ⭐ NEW**, with explicit cross-references from §17 BROKERS, §19 DEVELOPERS, §20 ARCHITECTS & DESIGNERS, and §66 MARKET INTELLIGENCE.

### §2.1 Proposed §70 amendment

The current `MASTER_TREE_final.md` §70 reads (excerpted via `git show docs/master-tree-v3:docs/architecture/MASTER_TREE_final.md`):

```
## 70 ANALYTICS ENGINE / АНАЛИТИЧЕСКИЙ ДВИЖОК ⭐ NEW

├── Platform Metrics (DAU/MAU, Session Duration, Conversion Funnel)
├── Business Metrics (Revenue per Stream, Deals Closed, Average Deal Time, CLTV)
├── User Behaviour (Feature Heatmaps, Drop-off Points, A/B Tests)
└── Reporting (Real-time Dashboard, Scheduled Reports, Custom SQL Queries)

**CRITICAL NODES:** Real-time Dashboard · Conversion Funnel · Custom Queries
**SCALING MODULES:** Analytics-as-a-Service · BI Platform
```

**Proposed amendment** (to be applied via future `MASTER_TREE_ENHANCEMENT_PROPOSAL.md`):

```
## 70 ANALYTICS ENGINE / АНАЛИТИЧЕСКИЙ ДВИЖОК ⭐ NEW

├── Platform Metrics (DAU/MAU, Session Duration, Conversion Funnel)
├── Business Metrics (Revenue per Stream, Deals Closed, Average Deal Time, CLTV)
├── User Behaviour (Feature Heatmaps, Drop-off Points, A/B Tests)
├── Reporting (Real-time Dashboard, Scheduled Reports, Custom SQL Queries)
└── Feasibility Modelling ⭐ NEW (v6 spec set)
    ├── 13 Land-Use Engines (Residential, Office, Retail, Hospitality,
    │   Industrial/Logistics, Healthcare, Educational, Senior Living,
    │   Data Center, Mixed-Use, Infrastructure, Off-Plan, Land-Hold)
    ├── 2 Modifiers (Off-Plan timing wrapper · Fractional/VARA tokenisation)
    ├── Construction Cost Database (RICS NRM 1 / ICMS 3 elemental classification,
    │   quarterly refresh, 90-day public lag, paid-tier currentQuarter)
    ├── Live Diff Badge (4-tone: green ≤15% / amber 15-30 / amber-bold 30-50 / red >50%)
    ├── Hover Tooltip (4-section: Plain language / Used in / Source / UAE note)
    ├── Distribution (zaahi.io/feasibility public · Cloudflare anti-bot · 90-day data lag)
    ├── Tier 3 Moat (Archibald AI personalised advice — affection-plan-aware)
    └── Methodology (USALI 12th · IVS 2025 · Brueggeman & Fisher · Rushmore · HVS)

**CRITICAL NODES:** Real-time Dashboard · Conversion Funnel · Custom Queries ·
                   13-Engine Feasibility · Construction Cost Database · Live Diff Badge ·
                   Tier 3 AI Commentary
**SCALING MODULES:** Analytics-as-a-Service · BI Platform · Feasibility-as-a-Service ·
                    UAE Cost Database Subscription · Multi-Country Calculator (per Master Tree
                    plugin architecture)
```

### §2.2 Cross-references to other Master Tree sections

The Feasibility Calculator interfaces with multiple Master Tree sections. The proposal includes cross-reference annotations in those sections (additive, no removals):

#### §2.2.1 §17 BROKERS & AGENCIES — Tools

Current:
```
├── Tools (CRM, Listing Management, Deal Pipeline, Commission Tracking, Market Reports)
```

Proposed addition:
```
├── Tools (CRM, Listing Management, Deal Pipeline, Commission Tracking,
│         Market Reports, Feasibility Calculator → §70 Analytics Engine)
```

#### §2.2.2 §19 DEVELOPERS — Sales Tools

Current:
```
└── Sales Tools (Off-Plan Listings, Payment Plan Builder, Investor Relations,
                 Metaverse Showroom)
```

Proposed addition:
```
└── Sales Tools (Off-Plan Listings, Payment Plan Builder, Investor Relations,
                 Metaverse Showroom, Feasibility Modelling → §70)
```

Plus in the Lifecycle row:
```
├── Lifecycle (Land Acquisition, Design & Approvals, Construction, Sales Launch, Handover)
                ↑ Feasibility Modelling at Land Acquisition stage → §70
```

#### §2.2.3 §20 ARCHITECTS & DESIGNERS — Tools

Current:
```
├── Tools (glTF/GLB Upload, Interior Builder, Material & Brand Selection)
```

Proposed addition:
```
├── Tools (glTF/GLB Upload, Interior Builder, Material & Brand Selection,
          Feasibility / Cost Modelling → §70)
```

#### §2.2.4 §66 MARKET INTELLIGENCE

Current:
```
├── Market Reports (Weekly Digest, Quarterly Report, Country Reports)
```

Proposed addition:
```
├── Market Reports (Weekly Digest, Quarterly Report, Country Reports)
└── Cross-reference: Feasibility cost-database quarterly digest feeds Market
                     Reports → §70 Feasibility Modelling
```

The Construction Cost Database from `02_CONSTRUCTION_COST_DATABASE.md` § feeds quarterly into Market Reports (e.g. "Q2 2026 Dubai concrete prices +5 % YoY · steel rebar Ø 16 mm +14 % · prime office rent +14 %" — built from `CostPreset` table).

---

## §3 Why §70 ANALYTICS ENGINE — and not §66 / §67 / §17

### §3.1 Considered alternatives

**§66 MARKET INTELLIGENCE.** Has "Price Analytics", "Transaction Data", "Market Reports", "Heatmaps". The Calculator's *output* feeds Market Intelligence (e.g. aggregate diff-badge data → district pricing trends), but the Calculator itself is a *modelling tool* that uses Market Intelligence data, not Market Intelligence's natural home.

**§67 PRICE PREDICTION.** AI models for short / medium / long-term price prediction. The Calculator includes price-prediction input (district CAGR for Land-Hold engine) but isn't an AI prediction model — it's a deterministic formula calculator with AI commentary layered on (Tier 3).

**§17 BROKERS' Tools.** The Calculator is a broker tool but also an investor / developer / architect tool. Limiting it to §17 understates the audience.

**§70 ANALYTICS ENGINE.** Most appropriate because:
- The Calculator is a **modelling engine** with computed outputs.
- Its database (cost / cap-rate / RevPAR benchmarks) is by nature analytical.
- Its telemetry feeds the founder dashboard (Real-time Dashboard, Conversion Funnel) which is also §70.
- The Tier 3 Archibald AI commentary is consistent with §70's "Reporting" layer scaling toward "Analytics-as-a-Service".
- Adding a fourth bullet under §70 ("Reporting") naturally extends the existing taxonomy.

### §3.2 Alternative considered: New §86 module

Zhan's Q5 ratification considered a new dedicated §86 module — would push Master Tree from 85 → 86 sections.

**Why NOT §86 (rejected per Zhan ratification):**
- Breaks "85 sections" canonical line item across investor-package narrative (P&L §3.4, Pitch Deck Slide 7, Master Tree v3.0 declaration).
- Investor-package is publicly-circulated; changing 85 → 86 forces narrative re-rev across multiple branches and raises questions in due diligence ("when did this become 86? what changed?").
- §70 sub-node achieves the same conceptual placement without breaking the count.

§70 sub-node is the cleanest path forward.

---

## §4 Phase B / future amendment workflow

### §4.1 This file (06) is INPUT, not an amendment

`MASTER_TREE_final.md` is **NOT** modified by this rev-2 commit. The canonical file lives on `docs/master-tree-v3` branch, untouched by rev-2.

### §4.2 Amendment publication

When founder is ready to amend the Master Tree:

1. Founder reviews this file (06_MASTER_TREE_ALIGNMENT.md).
2. If approved, founder authorises a separate working session to author `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v[N+1] (continues the existing ENHANCEMENT_PROPOSAL pattern from prior research branches).
3. ENHANCEMENT_PROPOSAL captures:
   - The §70 sub-node addition per §2.1 above
   - The 4 cross-reference additions (§17 / §19 / §20 / §66) per §2.2
   - Version bump rationale
   - Publication timing (typically alongside Phase B implementation milestone)
4. Founder ratifies the ENHANCEMENT_PROPOSAL.
5. A separate commit on a new branch (e.g. `docs/master-tree-v4-enhancement` or `research/master-tree-feasibility-amendment`) modifies `MASTER_TREE_final.md` per the ratified proposal.

### §4.3 Backwards compatibility

The proposed amendment is **purely additive** — no removals, no semantic changes to existing sections. Backward-compatible with all references in the investor package and existing CLAUDE.md citations.

---

## §5 Technical mappings — engines to Master Tree sections

For implementation reference: each of the 13 v6 engines + 2 modifiers maps cleanly to existing Master Tree sections (these mappings inform tooltip text and platform integration but don't require Master Tree changes):

| v6 Engine | Master Tree section primary | Master Tree sections secondary |
|---|---|---|
| 1 Residential | §02 RESIDENTIAL | §03 COMMERCIAL (mixed-use overlap), §17 BROKERS |
| 2 Office | §03 COMMERCIAL | §17 BROKERS, §22 BANKS & FUNDS |
| 3 Retail | §03 COMMERCIAL | §17 BROKERS, §26 BRANDS & SUPPLIERS |
| 4 Hospitality | §05 HOSPITALITY | §17 BROKERS, §26 BRANDS & SUPPLIERS |
| 5 Industrial / Logistics | §04 INDUSTRIAL | §22 BANKS & FUNDS, §41 AI SYSTEM (logistics AI) |
| 6 Healthcare | (nascent — closest §02 RESIDENTIAL Health-adjacent — RATIFY proposed new sub-node) | §17 BROKERS, §22 BANKS, §63 COMPLIANCE (DHA / DHCC) |
| 7 Educational | (nascent — RATIFY proposed new sub-node) | §17 BROKERS, §63 COMPLIANCE (KHDA / ADEK) |
| 8 Senior Living | (nascent — RATIFY proposed new sub-node) | §02 RESIDENTIAL, §05 HOSPITALITY (operating-asset overlap) |
| 9 Data Center | (nascent — RATIFY proposed new sub-node) | §44 IOT LAYER, §50 DATA CENTRES (existing!) |
| 10 Mixed-Use | §07 MIXED USE | All component engines |
| 11 Infrastructure | (cross-cutting — Block H GOVERNANCE / §63 COMPLIANCE) | §22 BANKS & FUNDS, §62 LEGAL ENGINE |
| 12 Off-Plan modifier | §08 OFF-PLAN | §19 DEVELOPERS, §32 ESCROW |
| 13 Land-Hold | §01 LAND | §22 BANKS & FUNDS |
| Fractional / VARA modifier | §35 TOKENIZATION | §42 BLOCKCHAIN, §43 WEB3 WALLET, §63 COMPLIANCE |

**Master Tree §50 DATA CENTRES already exists** — well-aligned with v6 Engine 9 (Data Center). Engine 9 spec in `01 §9` cites JLL Global Data Center Outlook 2025; Master Tree §50 provides the platform-side complement (data-centre-as-a-zaahi-asset operations).

**Master Tree §35 TOKENIZATION** maps cleanly to the Fractional / VARA modifier (`01 §14`). The modifier surfaces VARA Category 1 issuer compliance fields, mapping to §35's tokenisation primitives.

---

## §6 RATIFY items in this file

| # | Section | Item | Ask |
|---|---|---|---|
| MT-1 | §2.1 | §70 sub-node "Feasibility Modelling" amendment text | RATIFY — confirm exact wording before publishing as MASTER_TREE_ENHANCEMENT_PROPOSAL |
| MT-2 | §2.2 | 4 cross-reference additions (§17 / §19 / §20 / §66) — confirm desired |
| MT-3 | §3.2 | Reject §86 path; commit to §70 sub-node | RATIFY (already confirmed by Zhan 5 May 2026 Q5) |
| MT-4 | §5 | Whether to add new sub-nodes for Healthcare / Educational / Senior Living / Data Center under existing Block A ASSETS, or accept they live as cross-cutting modules | RATIFY — Phase B impact: need either explicit asset categories or accept cross-cutting routing |
| MT-5 | §4.2 | Timing of Master Tree amendment publication — alongside Phase B v6 launch, or separately? | RATIFY |

---

## §99 References

This proposal is informed by:

- **MASTER_TREE_final.md** (read via `git show docs/master-tree-v3:docs/architecture/MASTER_TREE_final.md`) — canonical, NOT modified by this rev.
- **Zhan ratification 5 May 2026** (Q5 of Checkpoint 1 — `04_DISTRIBUTION_LEGAL_MOAT.md` §99 ref).
- **05_AUDIT_REPORT.md** §3.1 finding MT-1.
- Master Tree v3.0 Optimised structure (March 2026 — current canonical).

No external citations needed — this is a structural proposal internal to ZAAHI's documentation system.

---

*End of Master Tree alignment proposal. Founder review required before any change to canonical `MASTER_TREE_final.md`.*
