# DEPENDENCIES MAP

**Document:** Visual dependency trees (Mermaid) showing what blocks what across the 24-month plan.
**Prepared for:** Zhan, Dymo, Rudi, BSA, future hires.
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Parent:** `docs/roadmap/MASTER_IMPLEMENTATION_PLAN.md` §5
**Classification:** CONFIDENTIAL

---

## How to read these diagrams

Each diagram is a directed acyclic graph (DAG). An arrow `A → B` reads as **"A must complete before B can start."** Node labels include the month when the item is expected to land under the base case.

Four diagrams:

1. **Legal / regulatory dependency tree** — the critical path from Day 1 DED filing to full regulated operations.
2. **Product / engineering dependency tree** — what product milestones unblock what.
3. **Partnership dependency tree** — how relationship chains unlock revenue.
4. **Revenue dependency tree** — the cash conversion graph from Rudi's capital to Platform IPO.

All diagrams render natively in VS Code Markdown Preview and on GitHub / Gitea.

---

## §1 Legal / regulatory dependency tree

The hard critical path. If any node here slips 2 weeks, every downstream node slips with it. This is why Week 1 Day 1 is DED submission, not a deal call.

```mermaid
flowchart TD
    A["Apr 21<br/>DED Mainland LLC<br/>application submitted"]:::critical
    A --> B["Apr 24<br/>DED initial approval"]
    B --> C["May 5<br/>Trade licence issued"]
    C --> D["May 5<br/>MoA + SAFE<br/>executed"]
    C --> E["May 8<br/>RERA broker card<br/>for Dymo"]
    C --> F["May 8<br/>Ejari virtual office<br/>registered"]
    D --> G["May 8<br/>Rudi AED 1 M wired"]
    E --> H["Jun 20<br/>First deal Form F<br/>+ DLD submission"]
    F --> H
    G --> H
    H --> I["Jun 20<br/>First commission<br/>AED 790 k received"]:::critical
    I --> J["Jul 8<br/>ADGM HoldCo<br/>incorporation triggered"]:::critical
    J --> K["Aug 15<br/>ADGM HoldCo<br/>incorporated"]
    K --> L["Aug 20<br/>Services Fee<br/>Agreement executed"]
    L --> M["Aug 31<br/>First 70% fee<br/>transferred to Platform"]
    M --> N["Sep 15<br/>Platform Dev Fund<br/>active — build begins"]:::critical
    K --> O["Sep 1<br/>VARA counsel<br/>engaged"]
    O --> P["Mar 2027<br/>DLD sandbox<br/>tokenisation pilot"]
    K --> Q["Dec 2026<br/>Transfer pricing<br/>study delivered"]

    A -.->|"also Apr 24"| T["Trademark filed<br/>UAE + WIPO"]
    T --> U["Q4 2026+<br/>IP registration<br/>complete"]

    classDef critical fill:#C8A96E,stroke:#1A1A2E,stroke-width:2px,color:#1A1A2E
```

### 1.1 Critical-path insight

The shortest end-to-end chain is:

**DED submission (Apr 21) → trade licence (May 5) → RERA card (May 8) → first deal closes (Jun 20) → first commission (Jun 20) → ADGM triggered (Jul 8) → ADGM incorporated (Aug 15) → Services Fee executed (Aug 20) → Platform Dev Fund active (Sep 15).**

That's **~22 weeks from Day 1 to Platform build funded.** Any single node delayed by 2 weeks pushes the whole chain 2 weeks. Three nodes delayed = 6-week push into Phase 2 start.

### 1.2 Mitigations on the legal critical path

- **DED approval delay** → fast-track via formation agent (AED 5–8 k premium) compresses timeline 5 days.
- **Trade licence delay** → rare if formation agent is engaged; 99 % ship within stated window.
- **RERA card delay for Dymo** → Dymo's existing BRN transfers faster than a fresh issue; mitigation built in.
- **First deal delay** → 5-deal pipeline reduces probability of >1-month slip to < 10 %.
- **ADGM incorporation delay** → BSA starts filing in parallel with last 2 weeks of Phase 1; absorbs up to 2 weeks first-deal slip.

---

## §2 Product / engineering dependency tree

What product nodes unblock what. Nodes coloured by criticality to revenue.

```mermaid
flowchart TD
    subgraph Phase1["PHASE 1 — Already LIVE on zaahi.io"]
        P1A["114 parcels<br/>3D ZAAHI Signature"]
        P1B["Archibald AI<br/>(Cat agent)"]
        P1C["556 K PMTiles plots"]
        P1D["Ambassador tier system"]
        P1E["Owner / Buyer / Broker<br/>Phase 1 dashboards"]
    end

    subgraph Phase2["PHASE 2 — Month 4–9 shipping"]
        P2A["§31 Deal Engine<br/>state machine"]:::high
        P2B["§58 Feasibility<br/>Calc v2"]:::high
        P2C["UAE Pass + MFA"]:::critical
        P2D["Audit log<br/>§3.1"]:::critical
        P2E["PDPL Privacy Centre"]:::critical
        P2F["Rate limiting"]
        P2G["Security headers<br/>+ CSP"]
        P2H["CI/CD + Dependabot"]
        P2I["§66 Market Intel<br/>DLD nightly"]:::high
        P2J["Support chatbot"]:::high
        P2K["Tier gating<br/>(Gold / Platinum)"]:::high
        P2L["A5 Ambassador<br/>dashboard polish"]:::high
    end

    subgraph Phase3["PHASE 3 — Month 10–24"]
        P3A["Mistral fallback<br/>+ local LLM"]
        P3B["Fine-tune<br/>ZAAHI-RE-v1"]:::high
        P3C["Column encryption<br/>PII"]
        P3D["Network Intl<br/>payment gateway"]
        P3E["ENBD mortgage<br/>widget live"]:::critical
        P3F["DLD sandbox<br/>tokenised plot"]:::high
        P3G["Platform GA<br/>public launch"]:::critical
        P3H["ZAAHI Academy<br/>launched"]
        P3I["Cross-border<br/>mortgage + FX"]:::high
        P3J["After-sale PM<br/>module v1"]:::high
        P3K["Equinix DX1<br/>hardware migration"]
    end

    P1A --> P2A
    P1A --> P2B
    P1B --> P2J
    P1C --> P2I
    P1D --> P2K
    P1D --> P2L
    P1E --> P2A
    
    P2A --> P3E
    P2A --> P3F
    P2C --> P3G
    P2D --> P3G
    P2E --> P3G
    P2F --> P3G
    P2G --> P3G
    P2I --> P3I
    P2I --> P3J
    P2J --> P3G
    P2K --> P3G
    
    P3B --> P3G
    P3D --> P3E
    P3E --> P3I
    P3K --> P3G

    classDef critical fill:#E63946,stroke:#1A1A2E,stroke-width:2px,color:#FFFFFF
    classDef high fill:#C8A96E,stroke:#1A1A2E,stroke-width:2px,color:#1A1A2E
```

### 2.1 Key product insights

- **Platform GA depends on 7 P2 items shipping first.** If any slips, GA slips. Monitor all 7 at weekly product review.
- **ENBD mortgage widget needs Deal Engine + payment gateway.** 4-node prerequisite chain. If ENBD MOU signs Nov 2026 and all prerequisites shipped, widget launches by Jan–Feb 2027.
- **Tokenised plot needs Deal Engine + VARA counsel + smart contract.** Even with DLD sandbox acceptance, 3-node prerequisite. Plan accordingly.
- **Fine-tune ZAAHI-RE-v1 unblocks GA quality bar.** Without fine-tune, Archibald uses Claude-only path at higher cost. GA can launch without it; fine-tune deepens the moat post-launch.

---

## §3 Partnership dependency tree

How relationship unlocks cascade — from Rudi's capital to each major partnership outcome.

```mermaid
flowchart LR
    A["Rudi AED 1 M capital<br/>+ Board seat<br/>May 5"] --> B["Dubai Mainland LLC<br/>operational<br/>May 12"]
    B --> C["RERA broker card<br/>May 8"]
    C --> D["Bank account<br/>ENBD active<br/>May 12"]
    D --> E["First deal<br/>closes<br/>Jun 20"]
    E --> F["ADGM HoldCo<br/>incorporated<br/>Aug 15"]
    F --> G["Platform credibility<br/>(ADGM entity signals<br/>institutional seriousness)"]

    G --> H["ENBD CRE<br/>introduction<br/>Aug-Sep"]
    G --> I["DLD sandbox<br/>application<br/>Sep"]
    G --> J["TAMM Abu Dhabi<br/>exploration<br/>Oct"]
    G --> K["LeadingRE<br/>membership<br/>Sep"]
    G --> L["Mubadala Capital<br/>intro (Series A prep)<br/>Q3 2027"]

    H --> M["ENBD mortgage MOU<br/>signed<br/>Nov 2026"]:::critical
    M --> N["Pre-approval widget<br/>live on platform<br/>Feb 2027"]
    N --> O["Mortgage conversion<br/>lift 2.5×<br/>Q2 2027+"]

    I --> P["Sandbox acceptance<br/>Dec 2026"]
    P --> Q["VARA compliance<br/>review + smart contract<br/>Q1 2027"]
    Q --> R["First tokenised plot<br/>Mar 2027"]:::critical
    R --> S["Press moment:<br/>second DLD sandbox<br/>tokenisation platform"]

    J --> T["TAMM API access<br/>Q4 2026+"]
    T --> U["Abu Dhabi parcel<br/>listings live<br/>Q1 2027"]

    K --> V["International<br/>HNWI referrals<br/>Q4 2026+"]

    L --> W["Mubadala first<br/>meeting<br/>Q4 2027+"]
    W --> X["Series A first close<br/>target Q1 2028"]:::critical

    subgraph Dymo["Dymo's personal network (parallel track, not blocked)"]
        D1["Equilibrium partnerships"]
        D2["Developer conversations"]
        D3["Ambassador sign-ups"]
        D4["HNWI buyer introductions"]
    end
    
    D -.-> D1
    D -.-> D2
    D -.-> D3
    D -.-> D4
    D1 --> E
    D2 --> E
    D3 -.->|amplifies| V

    classDef critical fill:#C8A96E,stroke:#1A1A2E,stroke-width:2px,color:#1A1A2E
```

### 3.1 Partnership insights

- **Every bank / gov / ADGM / sovereign partnership depends on the ADGM HoldCo existing.** This is why Phase 1's "first deal → ADGM incorporation" is the single most important trigger in the first 6 months.
- **Dymo's network (dashed) runs in parallel — it doesn't need ADGM to produce Phase 1 revenue.** This is the key risk mitigation: even if ADGM / partnerships slip, Agency cash flow continues on Dymo's relationships.
- **Series A (Mubadala / BECO / Class 5 / 4DX) is the end of Phase 3.** Every earlier partnership is a compounding signal. No partnership = no VC interest. 5 partnerships = warm Series A pipeline.
- **IMKAN / Al Jurf is not in this diagram** — it's Rudi's venue, not a partner. Content moment, not revenue-dependency node.

---

## §4 Revenue dependency tree

From capital in to IPO out — the full cash conversion graph. Scaled to fit.

```mermaid
flowchart TD
    A["Rudi AED 1 M SAFE<br/>May 5"] --> B["Operational runway<br/>12–18 months<br/>at AED 45–100 k burn"]
    B --> C["Dymo network<br/>activation<br/>Apr–May"]
    C --> D["Agency pipeline<br/>5–10 active deals<br/>May–Jul"]
    D --> E["First deal closes<br/>AED 790 k commission<br/>Jun 20"]
    E --> F["Monthly Agency revenue<br/>trajectory AED 500 k–1.5 M<br/>Month 3+"]

    F --> G["Agency retained 30%<br/>AED 150–450 k / month"]
    F --> H["Platform Dev Fund 70%<br/>AED 350 k–1 M / month"]:::platform

    G --> I["Agency dividends<br/>10% each to<br/>Rudi / Dymo / Zhan"]
    I --> J["Rudi cumulative<br/>Y1: AED 407 k<br/>Y2: AED 1.5 M<br/>Sunset fires Month 23-28"]
    I --> K["Dymo + Zhan<br/>cumulative Y1: AED 407 k each"]

    H --> L["Platform build:<br/>P0 safety + sovereignty<br/>Aug–Oct 2026"]:::platform
    H --> M["Tier subscriptions<br/>50 Gold + 10 Platinum<br/>target Y1<br/>AED 400 k subscription"]:::platform
    H --> N["Ambassador commission<br/>ledger growing"]:::platform
    H --> O["Platform Y2 feature<br/>ships: ENBD widget,<br/>tokenisation, after-sale"]:::platform
    
    L --> O
    M --> P["Platform Y2 revenue<br/>AED 2–4 M / yr"]:::platform
    N --> P
    O --> P

    P --> Q["Platform Series A<br/>Q1 2028<br/>AED 500–800 M valuation"]:::critical
    K --> Q
    J --> Q

    Q --> R["Platform Series B + C<br/>Year 4–7<br/>scaling revenue to AED 60 M Y5"]:::critical
    R --> S["Platform IPO ADGM<br/>Year 7–10<br/>AED 4.8–7.2 B valuation"]:::critical
    S --> T["Rudi IPO proceeds<br/>~AED 322 M<br/>at 5.8% post-dilution"]:::critical
    S --> U["Zhan IPO proceeds<br/>~AED 2.6 B<br/>at 46% post-dilution"]:::critical
    S --> V["Dymo IPO proceeds<br/>~AED 322 M<br/>at 5.8% post-dilution"]:::critical

    classDef platform fill:#1B4965,stroke:#FFFFFF,stroke-width:2px,color:#FFFFFF
    classDef critical fill:#C8A96E,stroke:#1A1A2E,stroke-width:3px,color:#1A1A2E
```

### 4.1 Revenue insights

- **Rudi's AED 1 M becomes AED 437 M on base case 437× MOIC.** That's the investor package thesis. Visible in this graph as A → J (dividends) + A → T (IPO proceeds).
- **Platform Dev Fund (blue) is the compounding engine.** Every Agency deal funds Platform investment. Year 2 Platform revenue is the first engine that can self-fund without Agency cash flow.
- **Sunset triggers (Rudi cumulative ≥ AED 2 M) fires around Month 23–28 on base case.** Before that, Rudi has 80 % Agency control; after, equal 33.34 %. Platform equity (80/10/10 Zhan / Dymo / Rudi) never rebalances.
- **IPO proceeds are the largest single cash event.** Prepare for it starting Phase 3 Q3 2027; 2-year runway to Series A means ~Year 4 Series B means ~Year 7 IPO earliest.

---

## §5 Integrated master dependency map

The full picture on one diagram. Simplified to top-20 nodes.

```mermaid
flowchart TD
    START["Apr 19<br/>Al Jurf MOU"]:::moment
    START --> DED["Apr 21<br/>DED application"]:::legal
    START --> VID["Apr 21<br/>Videographer retainer"]:::brand
    START --> ANT["Apr 22<br/>Anthropic zero-retention"]:::sov
    
    DED --> LIC["May 5<br/>Trade licence"]:::legal
    LIC --> SAFE["May 5<br/>SAFE + MoA executed"]:::legal
    SAFE --> WIRE["May 8<br/>AED 1 M wired"]:::legal
    LIC --> RERA["May 8<br/>RERA broker card"]:::legal
    LIC --> BANK["May 12<br/>ENBD account"]:::legal
    
    WIRE --> PIPE["May–Jun<br/>Pipeline activated"]:::biz
    RERA --> PIPE
    BANK --> PIPE
    VID --> CONTENT["Weekly<br/>Content machine"]:::brand
    CONTENT --> PIPE
    
    PIPE --> DEAL1["Jun 20<br/>First deal closed<br/>AED 790 k"]:::moment
    DEAL1 --> ADGM["Aug 15<br/>ADGM HoldCo<br/>incorporated"]:::legal
    ADGM --> PDFUND["Sep 2026<br/>Platform Dev Fund<br/>active"]:::moment
    
    PDFUND --> P0["Sep–Oct 2026<br/>P0 Safety + Sovereignty<br/>UAE Pass + MFA + PDPL"]:::tech
    P0 --> UAEPASS["Oct 2026<br/>UAE Pass live"]:::tech
    UAEPASS --> ENBDMOU["Nov 2026<br/>ENBD mortgage MOU"]:::biz
    UAEPASS --> SANDBOX["Dec 2026<br/>DLD sandbox accepted"]:::biz
    
    PDFUND --> CORE["Nov–Dec 2026<br/>Core engine + autonomy<br/>(Deal Engine, Feasibility,<br/>Support bot, Market Intel)"]:::tech
    CORE --> GA["Apr 2027<br/>Platform public GA"]:::moment
    
    ENBDMOU --> WIDGET["Feb 2027<br/>Mortgage widget live"]:::biz
    SANDBOX --> TOK["Mar 2027<br/>First tokenised plot"]:::biz
    WIDGET --> GA
    TOK --> GA
    
    GA --> SCALE["Q3 2027 - Q1 2028<br/>Scale: Abu Dhabi + After-sale<br/>+ Cross-border + Academy"]:::biz
    SCALE --> SUNSET["Q1-Q2 2028<br/>Sunset Trigger fires<br/>Equity rebalances"]:::moment
    SUNSET --> SERIES["Q2 2028<br/>Series A first close"]:::moment
    
    classDef legal fill:#1B4965,stroke:#FFFFFF,color:#FFFFFF
    classDef tech fill:#C8A96E,stroke:#1A1A2E,color:#1A1A2E
    classDef biz fill:#2D6A4F,stroke:#FFFFFF,color:#FFFFFF
    classDef brand fill:#E67E22,stroke:#1A1A2E,color:#1A1A2E
    classDef sov fill:#9B59B6,stroke:#FFFFFF,color:#FFFFFF
    classDef moment fill:#C8A96E,stroke:#1A1A2E,stroke-width:3px,color:#1A1A2E
```

### 5.1 Pattern recognition

Moments (gold): the 5 irreversible milestones. Everything bends around these:
1. **Al Jurf MOU** — starting gun.
2. **First deal closed** — validates the revenue thesis.
3. **Platform Dev Fund active** — Platform build can begin.
4. **Platform public GA** — revenue model changes from agency-only to dual-engine.
5. **Sunset trigger fires → Series A** — investment thesis proven, Platform scaling begins.

Colour families:
- **Legal (blue)** — the critical path; any slippage cascades.
- **Tech (gold)** — the engineering build; on Zhan.
- **Biz (green)** — the partnerships + sales; on Dymo.
- **Brand (orange)** — the content machine; on videographer.
- **Sovereignty (purple)** — the independence work; background-threaded.

Zhan has hands on tech + sovereignty. Dymo has hands on biz + brand. Legal sits between them, counsel-driven. Each of the five can proceed with ~70 % parallelism if the single point of coordination (Monday stand-up + weekly Rudi update) is disciplined.

---

## Appendix — Rendering notes

- All Mermaid diagrams render in VS Code (with Mermaid extension), GitHub preview, Gitea preview.
- For high-resolution export: open this document in `docs/roadmap/DEPENDENCIES_MAP.md`, enable Mermaid rendering, screenshot or export via browser print.
- To publish in an investor deck: paste diagrams into mermaid.live → export PNG → drop into Keynote / Figma.

---

**End of DEPENDENCIES_MAP.md.** Parent: `MASTER_IMPLEMENTATION_PLAN.md`. Companion: `WEEKLY_CADENCE.md`, `AGENCY_PLAYBOOK.md`, `IMPLEMENTATION_CHECKLIST.md`.
