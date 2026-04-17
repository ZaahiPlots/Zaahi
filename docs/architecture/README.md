# ZAAHI Architecture — Master Tree (final)

**Status:** Canonical source of truth for ZAAHI platform architecture
**Version:** 3.0 OPTIMIZED | March 2026
**Last updated:** 2026-04-17
**Owner:** Dymo (founder)

---

## What this is

`MASTER_TREE_final.md` is **the main document** for ZAAHI — the complete 10+ year vision for building the sovereign real estate operating system for UAE and beyond.

It contains **85 sections** organized into **12 blocks** (A through L):

- **Block A — Assets** (13 sections): Land, Residential, Commercial, Industrial, Hospitality, Infrastructure, Mixed-Use, Off-Plan, Distressed, Digital, Rental, Insurance, Property Management
- **Block B — Participants** (17 sections): Owners, Buyers, Crypto Investors, Brokers, Referrals, Developers, Architects, Contractors, Banks, Legal, Government, Private Structures, Brands, Consultants, Robot Operators, Media, Appraisers
- **Block C — Transactions** (8 sections): Deal Engine, Escrow, Joint Ventures, Fractional Ownership, Tokenization, Auction, Payment Gateway, Dispute Resolution
- **Block D — Technology** (11 sections): Metaverse Engine, Digital Twin, AI System, Blockchain, Web3/Wallet, IoT, Satellite, Robotics OS, Notifications, Search, Translation
- **Block E — Infrastructure** (3 sections): Data Centres, Sovereign Network, Sovereignty Config
- **Block F — Finance** (5 sections): Sovereign Bank, Revenue Engine, Robotics Fund, DAO Treasury, ZAH Tokenomics
- **Block G — Development & Construction** (4 sections): Construction Pipeline, Materials & Supply, Brand Integration, Procurement
- **Block H — Governance** (4 sections): Legal Engine, Compliance, Golden Visa & Immigration, ESG & Sustainability
- **Block I — Intelligence** (5 sections): Market Intelligence, Price Prediction, Risk Management, Fraud Detection, Analytics Engine
- **Block J — Ecosystem** (6 sections): Brand Marketplace, Education & Certification, Media & Documentary, Community, Support & Helpdesk, Onboarding Flow
- **Block K — Access Platforms** (5 sections): Web Platform, Mobile App, Desktop App, VR/AR, API Marketplace
- **Block L — Operations** (4 sections): Monitoring, CI/CD Pipeline, Data Privacy, Accessibility

---

## How to read it

Each section has:
- **Tree structure** — list of features/sub-modules under that section
- **CRITICAL NODES** — the non-negotiable core that must be built first
- **SCALING MODULES** — optional extensions that become products in themselves

Example (Section 01 LAND):
```
├── Plot Types
│   ├── Freehold / Фрихолд
│   ├── Leasehold / Лизхолд (25/50/99)
│   ├── Musataha / Мусатаха
│   ├── Usufruct / Узуфрукт
│   └── Government Allocated / Госнадел
├── Status (Vacant / Under Development / Permitted / Listed for Sale / ...)
├── Data Layers (Public / Private / Full Deal Room)
├── Government Documents (Title Deed / Affection Plan / Site Plan / DCR / Zoning / NOC / DEWA / Environmental)
├── Subsurface Intelligence — Mole
├── Satellite Intelligence — Falcon
├── Valuation (AI Price / Comparables / Price per Sqft / Growth / Investment Grade)
└── Controls (Add/Edit/Delete / Upload Documents / Verify / List / Tokenize)

CRITICAL NODES: Title Deed · Subsurface Layer · Valuation AI · DLD Sync · Status Machine
SCALING MODULES: Land Verification SaaS · Subsurface API · Valuation Engine
```

---

## How this relates to what's built today

The current [zaahi.io](https://www.zaahi.io) is the **demo version** — approximately 0.5% of the full master tree:

- ✅ **Built (MVP phase):** Section 01 LAND (partial — plot types, status machine, affection plan, site plan); Section 41 AI SYSTEM (Archibald chat, partial); Section 15 BUYERS (partial — buyer dashboard); Section 17 BROKERS (partial — broker profile); Section 18 REFERRALS (Ambassador program 3-tier MLM)
- 🟡 **In progress:** Section 31 DEAL ENGINE (offer flow started, notifications broken); Section 20 ARCHITECTS (research complete, portal not built); Section 14 OWNERS (dashboard partial)
- 🔜 **Not started:** Most of 85 sections

The demo version is **validated in production** (2026-04-17 investor demo passed). Master tree v3 is the target we're building towards over the next 3-10 years.

---

## How agents should use this document

1. **Read it fully before any architectural decision.** Every new feature, every API, every schema change must align with the master tree vision.
2. **When building a feature**, find its section in master tree first. Know which block, which dependencies, which critical nodes.
3. **When in doubt about scope**, check the master tree. If something isn't in master tree v3 — propose adding it via PR (additive only, never delete existing branches).
4. **Research tasks** should output structured markdown in `docs/architecture/research/BLOCK_{X}_{NAME}.md` format.
5. **Build tasks** should reference the master tree section they're implementing in commit messages (e.g. "feat(land): add Title Deed upload — Section 01 CRITICAL NODE").

---

## Editing rules

**Additive only.** Never delete existing branches from master tree. If a section needs to change:

1. **Mark deprecated** — add `⚠️ DEPRECATED` note, don't remove
2. **Add superseded-by** — point to new section
3. **Preserve history** — commit message explains why

**New sections require founder approval** (Dymo). Submit as PR with:
- Justification (why it should be in the platform vision)
- Which block it belongs to
- Dependencies on existing sections
- Effort estimate (MVP / V2 / V3 / R&D)

---

## Document history

- **v1.0** — Initial sketch (private, not in repo)
- **v2.0** — Expanded tree (partial, superseded)
- **v3.0** — Current canonical version (this file, 85 sections, March 2026)
- **v3.1+** — Reserved for future additive improvements

---

## Related documents

- `docs/demo/INVESTOR_DEMO_SCRIPT_2026_04_17.md` — Demo script for 2026-04-17 investor meeting
- `docs/audit/PRE_DEMO_AUDIT_2026_04_16.md` — Pre-demo production audit (GREEN)
- `docs/audit/POST_MIGRATION_VERIFY_2026_04_16.md` — Phase 1 migration verification
- `docs/backlog/POST_DEMO_BACKLOG_2026_04_16.md` — 39-item post-demo backlog (P0-P3 + P-LEGAL)
- `docs/research/ARCHITECT_PORTAL.md` — Architect Portal design (Block B #20)
- `docs/research/WALL_ARCHIBALD_SYSTEM.md` — Wall + Archibald unified system design (parked, Block D #41)
- `docs/research/GOV_API_AUDIT_UAE.md` — UAE government API availability audit
- `docs/research/UAE_COMPLIANCE_DRAFT.md` — UAE compliance baseline (Block H #62-65)

---

## Contact

Questions, proposals, challenges → founder@zaahi.io (or direct to Dymo)
