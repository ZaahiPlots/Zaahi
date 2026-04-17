# Master Tree v3 — Proposed Improvements (Additive Only)

**Source:** `docs/architecture/MASTER_TREE_final.md` (v3.0 OPTIMIZED, March 2026)
**Analyst:** Claude Code
**Date:** 2026-04-17
**Status:** Draft awaiting founder review — incorporation into v3.1 is gated by explicit founder approval per `docs/architecture/README.md` editing rules.

---

## Summary

- **Total improvements proposed:** 187
- **New sub-branches under existing sections:** 156
- **New sections proposed (86–91):** 6
- **Critical gaps flagged for founder attention:** 9
- **Cross-block dependencies added:** 22

All proposals are **additive only**. No existing branch, critical node, or scaling module is removed. Deprecations (when eventually needed) must use a `⚠️ DEPRECATED · superseded-by §XX` marker instead of deletion.

---

## Improvement categories

### Category 1 — Self-Sovereignty Enhancements

The master tree already has excellent sovereignty language (Section 52 Sovereignty Config is a strong anchor). These proposals close remaining gaps where a third-party dependency is implicit but no migration path is documented.

| Section | Current dependency | Proposed addition |
|---|---|---|
| 41 AI SYSTEM | Claude Opus/Sonnet 4.6 (Anthropic) for Master/Cat/Mole/Falcon | Add branch "Model Abstraction Layer" with providers {Anthropic, OpenAI, self-hosted Qwen/Llama/Mistral, fine-tuned Zaahi-7B (2028)}; add "Prompt-level routing rules" sub-branch so a switch stays additive |
| 44 IOT LAYER | No MQTT broker / stream sovereignty discussed | Add "Data Plane Sovereignty" branch: own MQTT (EMQX/Mosquitto), own time-series DB (TimescaleDB/InfluxDB self-hosted), edge gateway sovereignty |
| 45 SATELLITE | Planet/Maxar/Airbus/ICEYE | Already has "Own Satellite 2030" — add intermediate branch "Hybrid Period (2026-2029)" documenting data licensing terms, cache-and-reuse rights, per-image retention policy |
| 47 NOTIFICATION ENGINE | Twilio, Resend, FCM | Add "Sovereign Channel Migration" sub-branch: own SMPP gateway (Jasmin/Kannel), own SMTP (Postfix/Haraka), own push (Web Push + self-hosted FCM alternative UnifiedPush) |
| 48 SEARCH ENGINE | Elasticsearch mentioned as tech but no sovereignty note | Add sub-branch "Self-hosted first" — OpenSearch (Apache 2 fork) as primary; Meilisearch for lightweight paths |
| 50 DATA CENTRES | Equinix Dubai Q3 2026 (colocation, not owned) | Add phased branch: "DC Ownership Ladder" Phase 1 colocation → Phase 2 rented cage → Phase 3 private suite → Phase 4 owned facility. Document DC bond/sukuk financing path |
| 37 PAYMENT GATEWAY | Stripe | Add "Acquiring Independence" sub-branch — path to own payment institution licence under CBUAE 2028 (already hinted in §53); fallback domestic acquirers (Network International, Telr, Magnati) |
| 62 LEGAL ENGINE | DocuSign fallback | Add "Own E-Signature Stack" — ETA 2021 (UAE Electronic Transactions) compliant self-hosted signing (DocuSeal/BlueInk-equivalent or in-house) with UAE Pass integration |
| 63 COMPLIANCE | No AML vendor named but PEP screening typically needs one | Add "AML Data Sovereignty" branch — own PEP/sanctions list aggregation (UN 1267, OFAC, UK HMT, EU, UAE local), cached + diffed daily; vendor API as fallback only |
| K-platforms (77-81) | Vercel (currently hosts production) | Add "Deployment Target Matrix" at Section 77 — Vercel (current), Kubernetes on own hardware (target), Docker-compose (dev/self-host fallback). Already partially in CLAUDE.md Sovereignty Readiness Rules but not in master tree |
| 82 MONITORING | Sentry (SaaS), PostHog (can be self-hosted) | Add explicit "Self-hosted first" — GlitchTip (Sentry-compatible open source), self-hosted PosHog, VictoriaMetrics + Grafana, Alertmanager |
| 83 CI/CD | GitHub (vendor) | Add "CI Sovereignty Plan" sub-branch — Gitea + Woodpecker or Forgejo + self-hosted runners as escape hatch from GitHub |
| 84 DATA PRIVACY | Encryption mentioned but not key management | Add "Key Management Sovereignty" — own HSM cluster, KMS (Vault / OpenBao), per-tenant customer-managed keys for institutional clients |

**Cross-cutting:** Propose new root branch under §52 SOVEREIGNTY CONFIG called `Sovereignty Scorecard` — a per-component 0-100 rating (Dependent / Hybrid / Sovereign / Autonomous) auto-computed and published on an internal dashboard.

---

### Category 2 — UAE Regulatory Coverage

The master tree captures DLD, RERA, DDA, VARA, PDPL, AML Federal Law No.10/2025 — the big ones. Gaps below are real-world UAE layers that will bite if not planned.

| Regulatory body / concept | Currently in tree? | Proposed placement |
|---|---|---|
| **TAMM** (Abu Dhabi unified gov services portal — Pulse equivalent for AD) | No | Add to §24 GOVERNMENT BODIES → UAE branch |
| **Dubai Pulse** (Dubai open-data portal) | No | Add to §24 → UAE branch; integration target for §66 MARKET INTELLIGENCE |
| **MOEI** (Ministry of Energy & Infrastructure — federal construction regs) | No | Add to §24 |
| **FTA** (Federal Tax Authority — VAT registration, property VAT 5% exemptions for residential, commercial VAT applicability) | No | Add to §24 + new branch under §63 COMPLIANCE: "VAT on Real Estate (FTA)" |
| **Etihad Credit Bureau** (UAE credit scoring) | No | Add to §22 BANKS & FUNDS → Mortgage sub-branch; also §63 AML/KYC sub-branch for enhanced DD |
| **Emirates ID (EIDA)** integration | Not mentioned explicitly | Add to §14 OWNERS, §15 BUYERS, §17 BROKERS, §23 LEGAL, §63 COMPLIANCE. Section 14 already has "Biometric Verification" — add sub-branch "Emirates ID Chip Read + ICA API" |
| **UAE Pass** (national digital identity) | No | Add to §14 and §62 LEGAL ENGINE (e-signature); UAE Pass is the sovereign-aligned alternative to DocuSign |
| **CBUAE** (Central Bank) — beyond §53 licence hint | Licence mentioned in §53 only | Add CBUAE to §24 GOV BODIES explicitly; add §63 sub-branch "CBUAE Reporting (goAML, goSTR)" |
| **MOHRE** (Ministry of HR & Emiratisation — construction labour regs) | No | Add to §24 + §58 CONSTRUCTION PIPELINE sub-branch "Labour Compliance (MOHRE, WPS)" |
| **WPS** (Wage Protection System) for contractor labour | No | Sub-branch of §21 CONTRACTORS + §58 |
| **ADGM** (Abu Dhabi Global Market) — already mentioned | Yes in §24 | Expand into own sub-tree: ADGM Registration, ADGM Courts, ADGM SPVs, DIFC vs ADGM decision tree |
| **DIFC** (Dubai International Financial Centre) — not in tree by name, only implied | No | Add to §24 and §25 PRIVATE STRUCTURES; DIFC Foundations are a primary Zaahi wealth-structuring tool |
| **Oqood** | Mentioned in §08 and §41 Cat | ✓ already present — propose elevating to full sub-branch in §08 OFF-PLAN |
| **Ejari** | Mentioned in §11 | ✓ already present |
| **Trakheesi** (Dubai ad permit) | Mentioned in §17 and §41 Cat | ✓ already present |
| **DM** (Dubai Municipality) building permits | "Municipality" mentioned in §24 generic | Elevate to specific sub-branch |
| **Sharjah Real Estate Regulatory Authority** | No | Add — Sharjah has its own regulator distinct from RERA |
| **RAK Investment Authority** | No | Add to §24; RAK is a major target for foreign-held land structures |
| **Abu Dhabi Municipal System & Transport (ADMST / Municipality AD)** | No | Add |
| **Abu Dhabi Department of Municipalities and Transport (DMT)** / **Department of Urban Planning and Municipalities (DPM)** | No | Add |
| **DAFZA / JAFZA / DMCC / DIFC / ADGM** — Free Zones distinct legal regime | §04 lists "JAFZA, DAFZA, DIFC" as free-zone unit types | Expand §04 and §24 into Free Zone Authority plugin tree — each free zone is a separate jurisdiction |
| **Golden Visa AED thresholds & specific categories** | §64 exists | Deepen §64 — add sub-branches: AED 2M property (10-yr), AED 5M public investment (10-yr), Entrepreneur track, Specialised Talent track, dependent eligibility |
| **Zakat** (Islamic wealth tax) — relevant to KSA expansion | No | Add as sub-branch under §63 COMPLIANCE when KSA plugin ships |
| **Kafala / WPS sponsorship** for construction labour | No | §21 CONTRACTORS and §28 ROBOT OPERATORS |

---

### Category 3 — Missing Critical Nodes

Sections where the **CRITICAL NODES** line is arguably under-specified.

1. **§02 RESIDENTIAL** — Critical nodes currently list `Off-Plan Registry · Metaverse Walk-through · Rental Engine`. Proposed additions: `Emirates ID Ownership Link`, `Community/HOA Integration`, `DEWA/SEWA/ADDC Account Handover`.
2. **§03 COMMERCIAL** — Add `Trade Licence Linkage` (every commercial tenant has a DED / free-zone trade licence; platform should link tenancy to licence expiry to warn on lease renewals).
3. **§09 DISTRESSED ASSETS** — Add `Dubai Courts Integration` and `Rental Dispute Center (RDC) Integration` as critical nodes, not just generic "Court Integration".
4. **§16 CRYPTO INVESTORS** — Add `VARA Virtual Asset Service Provider Registration` as critical. Operating a crypto-RE exchange without a VARA VASP licence is illegal in Dubai.
5. **§19 DEVELOPERS** — Add `Escrow Account Setup with Accredited Bank` and `Project Registration Number (PRN)` as critical nodes.
6. **§26 BRANDS & SUPPLIERS** — Add `Customs Integration` (if goods imported) and `Warranty Registry` as critical.
7. **§31 DEAL ENGINE** — Add `Anti-Money-Laundering Gate Before Transfer` and `Source of Funds Verification (>AED 55k cash trigger)`.
8. **§34 FRACTIONAL OWNERSHIP** — Add `SCA (Securities & Commodities Authority) Approval` or `ADGM FSRA Approval` depending on tokenisation jurisdiction. Missing from current critical nodes.
9. **§42 BLOCKCHAIN** — Add `Merkle Proof Publisher` and `Layer 2 Anchor Strategy` (we will need LayerZero/Polygon zkEVM etc. as an option).
10. **§46 ROBOTICS OS** — Add `Remote Kill Switch` and `Geofence Enforcement` — regulatory prerequisites before autonomous construction robotics are allowed on UAE sites.
11. **§51 SOVEREIGN NETWORK** — Add `TDRA Spectrum Allocation` as its own critical node (not just licence; spectrum band allocation is separate).
12. **§62 LEGAL ENGINE** — Add `UAE Pass Signature` + `Notary Public Federal Decree-Law 22/2023`.
13. **§64 GOLDEN VISA** — Add `ICA (Federal Authority for Identity, Citizenship, Customs & Port Security) API` as critical node (Status Tracking relies on ICA).
14. **§65 ESG** — Add `Estidama Pearl Rating (Abu Dhabi)` and `Al Safat (Dubai)` specifically — the tree mentions LEED/BREEAM (international) but UAE-local ratings are mandatory for new builds.
15. **§84 DATA PRIVACY** — Add `Cross-Border Transfer Mechanism (PDPL Art. 22)` — critical for any data leaving UAE; has implications for §50 DC location decisions.

---

### Category 4 — Cross-Block Dependencies

Master tree reads as 12 silos. In reality, blocks couple through runtime flows. Proposal: add a section under §52 SOVEREIGNTY CONFIG or as a new annex called **"Cross-Block Coupling Map"** that encodes these dependencies so they are maintainable:

1. **§18 REFERRALS ↔ §31 DEAL ENGINE ↔ §54 REVENUE ENGINE** — Ambassador commissions (already implemented in production code) split the platform fee at `DEAL_COMPLETED`. Tree should show: platform fee (§54 stream 01) → commission walker (§18 logic) → 3-level upline distribution. Currently implied, not explicit.
2. **§31 DEAL ENGINE ↔ §32 ESCROW ↔ §37 PAYMENT GATEWAY** — State machine transitions trigger escrow lock/release which trigger payment gateway calls. Add arrow notation.
3. **§40 DIGITAL TWIN ↔ §44 IOT ↔ §46 ROBOTICS OS** — Current tree has Digital Twin ↔ Robot loop but omits IoT as the continuous data feed. Add IoT → Digital Twin → Robot decision triangle.
4. **§42 BLOCKCHAIN ↔ all document-producing sections** — Every signed doc (§62), every deal state change (§31), every escrow release (§32) must write a txHash. Add a "Blockchain Anchor Contract" branch under §42 that enumerates callers.
5. **§55 ROBOTICS FUND ↔ §54 REVENUE ENGINE** — 10% auto-route is mentioned but the exact tap point per revenue stream is not. Add table of which streams feed the fund.
6. **§12 INSURANCE ↔ §38 DISPUTE RESOLUTION ↔ §31 DEAL ENGINE** — Claims trigger dispute flow; disputes can trigger escrow freeze. Add arrows.
7. **§66 MARKET INTELLIGENCE ↔ §67 PRICE PREDICTION ↔ §01 LAND valuation** — Valuation AI (§01) should consume §67 output which is trained on §66 data. Add explicit flow.
8. **§69 FRAUD DETECTION ↔ §31 DEAL ENGINE ↔ §41 Cat Agent** — Fraud events trigger Cat warnings (already noted) AND deal freeze (also noted in §69) but the feedback loop (Cat dialog → user action → fraud model retrain) is missing.
9. **§63 COMPLIANCE ↔ §14-17 all participant onboarding** — KYC/AML is referenced per participant but the shared compliance pipeline (Participant → KYC queue → approval → re-verification schedule) is not shown.
10. **§41 AI SYSTEM ↔ §61 PROCUREMENT** — Cat can propose procurement on deal close; the auto-procurement chain (Deal close event → Cat prompt → Owner approve → §61 execute → §26 brand integration) is implied but not drawn.
11. **§64 GOLDEN VISA ↔ §22 BANKS (mortgage)** — Mortgage disqualifies pure-cash Golden Visa path; platform should warn. Add conditional branch.
12. **§75 SUPPORT ↔ §82 MONITORING** — Incidents detected in monitoring should auto-create support tickets. Missing.
13. **§58 CONSTRUCTION PIPELINE ↔ §59 MATERIALS ↔ §61 PROCUREMENT ↔ §21 CONTRACTORS** — Phase transitions trigger material orders, robot dispatch, contractor call-outs. Add pipeline arrow.
14. **§76 ONBOARDING ↔ §14-17 participant types** — Role-specific onboarding is mentioned in §76; the per-role script should reference the target dashboard in §14, §15, §17 etc.
15. **§72 EDUCATION ↔ §17 BROKERS ↔ §28 ROBOT OPERATORS** — Certification path should flow from §72 course completion to §17/§28 licence issuance. Already partially drawn; add §23 (LEGAL — continuing education) as additional downstream.
16. **§73 MEDIA ↔ §29 MEDIA (participant) ↔ §41 Cat** — Documentary auto-recording mentioned in both §29 and §73; Cat could narrate. Add link.
17. **§43 WEB3 ↔ §16 CRYPTO INVESTORS ↔ §56 DAO TREASURY ↔ §57 TOKENOMICS** — ZAH token utility spans four sections with no coupling diagram.
18. **§85 ACCESSIBILITY ↔ §77-81 all access platforms** — WCAG compliance is mentioned once as a section but must be applied at each platform. Add "Accessibility cross-check" as criterion in §77-81 critical nodes.
19. **§82 MONITORING ↔ §52 SOVEREIGNTY CONFIG** — When Migration Plan target flips from Dependent→Sovereign, monitoring thresholds should change too.
20. **§50 DATA CENTRES ↔ §84 DATA PRIVACY ↔ §63 COMPLIANCE** — DC location (UAE vs Bahrain vs KSA vs Ukraine) changes cross-border-transfer regime. Add dependency arrow.
21. **§08 OFF-PLAN ↔ §19 DEVELOPERS ↔ §32 ESCROW** — Oqood registration, developer escrow, payment plan all interlock. Current tree shows each piece but not the glue.
22. **§65 ESG ↔ §12 INSURANCE** — ESG score impacts insurance premium (parametric green insurance). Missing link.

---

### Category 5 — Deep Breakdown Opportunities

Sections where sub-trees can go 2–3 levels deeper without inventing new concepts.

#### §01 LAND — expand "Government Documents"
Current: `Title Deed / Affection Plan / Site Plan / DCR / Zoning / NOC / DEWA / Environmental`
Proposed additions (UAE-specific doc types):
- `Khulasat al-Qaid` (title summary)
- `Initial Contract / Contract F` (pre-completion SPA)
- `Musataha Certificate` (usufruct/long-lease register entry)
- `Waqf Registration` (Islamic endowment, irrevocable)
- `Irrigation / Falaj rights` (Al Ain & inland AD)
- `Military/Airport Clearance Zone Certificate` (for plots near DXB, DWC, Al Dhafra)
- `Archaeological NOC` (Dubai Culture / DCT Abu Dhabi for heritage areas)
- `Shoreline Setback Certificate` (for waterfront plots)
- `Desalination / Cooling Concession` (for island plots)
- `Building Height Restriction Letter` (DCAA aviation)

#### §01 LAND — expand "Plot Types"
Add: `Gift Deed property (Hiba)`, `Inherited (Irth)`, `Waqf`, `Court-Sale`, `Musataha-to-Freehold conversion eligible`.

#### §14 OWNERS — expand "Protections"
Add: `Succession planning beneficiary designation` (links §23 notary wills); `Power of Attorney Management (active POAs, revocation log)`; `Freeze-on-death trigger (waits for heirs)`.

#### §22 BANKS & FUNDS — expand "Services"
Current Islamic mentions only Murabaha. Add:
- `Ijara` (lease-to-own)
- `Musharaka Mutanaqisah` (diminishing partnership)
- `Istisna` (construction finance)
- `Salam` (forward purchase)
Plus:
- `Home Finance Takaful` (Islamic insurance for mortgage)
- `Offplan Home Finance` (specific product, limits lower)

#### §31 DEAL ENGINE — expand "Lifecycle"
Current is linear. Add branches:
- `NOC Sub-States` (requested / issued / rejected / re-submitted)
- `DLD Sub-States` (booked / pending / approved / rejected / waiting-transfer-fee)
- `Currency-switch event` (buyer in USDT, gov needs AED — escrow FX conversion step)
- `Escrow multi-party release` (when >2 parties share the escrow)

#### §41 AI SYSTEM — expand "Cat Agent"
Current fee list is Dubai only. Add emirate-specific branches:
- Abu Dhabi: Transfer fee 2%, registration different
- Sharjah: Transfer fee 2% (foreigner-leasehold only)
- RAK / Ajman: separate fee schedules
Add "Role-aware Cat persona" — Cat-for-Owner vs Cat-for-Broker vs Cat-for-Developer vs Cat-for-Architect is implied but not a formal branch.

#### §42 BLOCKCHAIN — expand "Smart Contracts"
Add:
- `Upgrade Proxy Pattern` (transparent vs UUPS)
- `Pause Guardian` (emergency halt)
- `Multi-sig Owner (Gnosis Safe / Zaahi Safe)`
- `Formal Verification target list`
- `Audit Provider Roster` (Certik / Trail of Bits / Halborn)

#### §46 ROBOTICS OS — expand "Quality Control"
Add:
- `Digital Twin Divergence Alert` (as-built vs as-designed)
- `Photogrammetry Ground Truth Capture`
- `Human-in-the-loop Override Log`

#### §50 DATA CENTRES — expand with physical-sec branches
Current branch is only logical. Add:
- `Physical Security Ladder` (mantrap, biometric, 24/7 CCTV, guard)
- `Fire Suppression` (FM-200 / Novec / inert gas)
- `Power Redundancy` (N+1, 2N, dual-feed utility, diesel, fuel-cell)
- `Cooling Strategy` (CRAC/CRAH, hot-aisle containment, liquid-cool for GPU row)
- `Tier Rating Target` (Uptime Institute Tier III initial, Tier IV future)
- `Environmental Certifications` (ISO 27001, PCI-DSS scope, SOC 2 if selling DC-as-a-service)

#### §53 SOVEREIGN BANK — expand
Add:
- `Islamic Banking Window` (Shariah board, product approval)
- `Correspondent Banking Network` (SWIFT partners)
- `Cross-border settlement rail (Aani, Buna, mBridge)` — CBUAE is building an instant payments rail
- `Reserve Requirements` per CBUAE
- `Deposit Insurance Scheme`

#### §54 REVENUE ENGINE — expand each stream
Each of 21 streams should have a child sub-tree: `Pricing model`, `Target segment`, `Current stream status (active / planned / deprecated)`, `Responsible Block owner`. Currently single-line bullets.

#### §57 TOKENOMICS ZAH — expand
Add:
- `Emission Schedule`
- `Token Burn Mechanism`
- `Inflation Cap`
- `Anti-dump Rules (vesting + cliff)`
- `Treasury Rebalance Policy`

#### §63 COMPLIANCE — expand AML/KYC
Add:
- `Transaction Monitoring Rulebook` (thresholds, aggregation window)
- `Customer Risk Rating (low/medium/high/PEP)`
- `Enhanced DD Triggers`
- `goAML XML Report Generation`

#### §64 GOLDEN VISA — expand tiers
- `5-year Investor Visa (AED 750k property)`
- `10-year Golden Visa (AED 2M property OR AED 5M investment OR specialised talent)`
- `Virtual Working Programme`
- `Retirement Visa (55+, AED 1M property OR AED 1M savings OR AED 20k income)`

---

## Detailed improvements by Block

### Block A — Assets (13 sections)

#### §01 LAND
- Subsurface (Mole): add **Seismic microzonation data** (UAE is low-seismicity but fault-line inventory matters for insurance), **Soil chemistry** (gypsum content — DXB is gypsiferous), **Ground-gas (methane/radon) screening**, **Archaeological core samples**.
- Satellite (Falcon): add **Shoreline accretion/erosion** tracking (waterfront plots), **Dust-storm impact index**, **Urban heat-island delta** (feeds ESG §65).
- Valuation: add **Tokenization-adjusted price** (fractional liquidity premium/discount), **ESG-adjusted price**.
- Controls: add **Waqf declaration** (irrevocable, special flow), **Heir assignment**.

#### §02 RESIDENTIAL
- Types: add **Penthouse (Duplex/Triplex)**, **Sky Villa**, **Townhouse Cluster**, **Branded Residence** (Armani/Bulgari/Bugatti/Cavalli — critical UAE segment).
- Amenities: add **Community Chilled-Water Scheme fees** (Empower/Emicool), **District Cooling billing transparency**.
- Add new branch: **Community Governance** (HOA/Master Community fees, Association meetings, service-charge audit rights).

#### §03 COMMERCIAL
- Types: add **Free Zone Office (DMCC/DIFC flexi)**, **Last-Mile Distribution Hub**, **Dark Kitchen**.
- Lease terms: add **Gross vs Net lease**, **Triple-Net**, **Rent-Free Fit-Out period**.
- Smart Building: add **Tenant Sub-metering**, **Carbon Reporting per Tenant**.

#### §04 INDUSTRIAL
- Already lists JAFZA/DAFZA/DIFC — add: **KIZAD** (Khalifa), **RAKEZ**, **SHAMS** (Sharjah), **SPC Free Zone**, **Meydan Free Zone** (licence+address), **IFZA**.
- Compliance: add **Hazardous Materials Licence** (MOEI/Civil Defence).
- Integration: add **Customs Bonded Zone Linkage**.

#### §05 HOSPITALITY
- Types: add **Branded Hotel Residence** (Hotel + Residential hybrid, growing category).
- Management: add **Franchise vs Managed distinction**, **HMA (Hotel Management Agreement) terms**.
- Add **DTCM (Dept of Tourism & Commerce Marketing) Classification** branch.

#### §06 INFRASTRUCTURE
- Add **Data Infrastructure** (cable landing stations, terrestrial fibre ROW, internet exchange points — IXUAE).
- Add **Water Infrastructure** sub-tree distinct from utilities (desal plants, STPs — relevant for own-utility strategy).
- Add **Renewable Assets** (solar farms, Mohammed bin Rashid Solar Park plots).

#### §07 MIXED-USE
- Add **Phasing Risk** (developer-financed phase 1 sales fund phase 2 — mitigation via Oqood).
- Add **Anchor Tenant Coupling** (pre-lease commitments).

#### §08 OFF-PLAN
- Registry: add **Pre-Registration / Expression of Interest (EOI) flow** (pre-Oqood).
- Payment plans: add **Construction-linked**, **Handover-linked**, **Post-Handover 5-year**, **DLD-Fee Waiver promo**.
- Risk: add **Developer Solvency Indicator** (from Etihad Credit Bureau / financial filings).

#### §09 DISTRESSED
- Types: add **Under-Construction Stalled Project** (RERA-taken-over projects).
- Resolution: add **RERA Committee path** (specific to stalled projects).
- Add **Project Completion Fund** access flow.

#### §10 DIGITAL ASSETS
- Add **Royalty Enforcement** (ERC-2981 on-chain, OpenSea compatibility).
- Add **Real-World Asset (RWA) Standard Compliance** (Circle RWA framework / ERC-3643).
- Add **Tokenized Mortgage/Receivable** sub-branch.

#### §11 RENTAL
- Add **Rent Dispute Center (RDC) filing path**.
- Add **Dubai rental cap calculator** (RERA rental increase calculator — legally binding).
- Add **Tourism rental licence** (DTCM holiday homes).
- Add **Deposit scheme** (currently informal; propose formal escrow-backed deposit).

#### §12 INSURANCE
- Add **Takaful (Islamic insurance)** as first-class alternative to conventional.
- Add **Event-specific** — Construction All Risks (CAR), Erection All Risks (EAR), Delay-in-Start-Up (DSU), Professional Indemnity for architects.
- Add **Parametric index-based products** (typhoon, earthquake, flood — already hinted with "Parametric Smart Contract", expand).

#### §13 PROPERTY MANAGEMENT
- Add **Reserve Fund Management** (mandated by DLD for strata buildings).
- Add **Owners Association (OA) Management** — distinct profession, requires MOLLAK registration in Dubai.
- Add **Sinking Fund Accounting**.

---

### Block B — Participants (17 sections)

#### §14 OWNERS
- Registration: add **Emirates ID chip read**, **UAE Pass**, **Iqama for GCC residents**, **Passport + Entry Stamp for foreign**.
- Dashboard: add **Estate Plan view** (heirs, Sharia vs DIFC will), **Zakat calculator** (KSA-ready), **Carbon footprint of portfolio**.
- Actions: add **Declare as Waqf**, **Assign POA**, **Gift (Hiba) Deed**.
- Protections: add **Succession Freeze on Death** (triggers §23 flow), **Minor Heir Trustee Appointment**.

#### §15 BUYERS & INVESTORS
- Types: add **Free Zone Investor (tax-resident status distinct)**, **GCC National (special RE rights)**, **Diplomatic Corps (sovereign-immune flow)**.
- Discovery: add **Saved Search Alerts**, **Off-Market Deal Flow**.
- Due Diligence: add **Structural Survey**, **Chain of Title** (especially secondary from pre-2015 plots).
- Investment Modes: add **Sukuk (Islamic bond) linked to RE**, **Rent-to-Own**.

#### §16 CRYPTO INVESTORS
- Critical: elevate **VARA VASP Licence** as explicit critical node.
- Add **Stablecoin rails** (USDT TRC-20 — already in ambassador flow, USDC on Solana, ZAH on Polygon).
- Add **Travel Rule Compliance** (VARA Rulebook Part V).
- Add **Proof of Reserves** (for any custodial offering).

#### §17 BROKERS & AGENCIES
- Licensing: add **Trakheesi Permit Per-Listing**, **RERA Broker Card Renewal reminder**.
- Tools: add **Listing duplication detection** (prevent same plot listed by 3 brokers), **Co-broke agreement templates**.
- Training: add **CPD (Continuing Professional Development) tracker** (RERA mandates annual hours).

#### §18 REFERRALS
- **Already implemented in production** — propose master tree codifies the production model:
  - Add explicit **Tier system** (Silver / Gold / Platinum, matches AMBASSADOR PROGRAM RULES in CLAUDE.md).
  - Add **Commission base = 2% ZAAHI service fee** as sub-branch.
  - Add **Skip-inactive policy** as formal branch.
  - Add **Self-referral prevention** branch (already in code).
  - Add **Cycle detection** branch.

#### §19 DEVELOPERS
- Registration: add **DED Licence**, **VAT Registration**, **Escrow Account Accreditation** as distinct critical nodes.
- Lifecycle: add **Sales Launch Approval by RERA**, **Advertising Campaign Trakheesi per channel**.
- Add **Developer Solvency Score** branch (distinct from Zaahi Rating).

#### §20 ARCHITECTS
- Already well-specified in tree and design doc exists (`docs/research/ARCHITECT_PORTAL.md`).
- Add: **Authority Approval Coordinator role** (DM/DDA/ADM/etc submission is part of architect job in UAE).

#### §21 CONTRACTORS
- Types: add **Specialist subs** (Swimming pool, lift, elevator, facade, joinery).
- Certification: add **ICV (In-Country Value) score** (required for AD gov-linked projects), **Emiratisation ratio**.
- Add **PQ (Pre-Qualification) Document Vault** — shared across projects.

#### §22 BANKS & FUNDS
- See Category 5 expansions above.
- Add **Priority Banking / Wealth tier** alongside mass-market.
- Add **SME Project Finance** product branch.

#### §23 LEGAL & NOTARY
- Services: add **UAE Pass Notarization** (Federal Decree-Law 22/2023 enables fully digital notary for some acts).
- Trustee: add **DIFC Foundation Trusteeship**, **ADGM Foundation**, **Trust (DIFC)**, **Charity Waqf Trusteeship**.
- Add **Sharia-compliant Will drafting** separate from civil-law will.

#### §24 GOVERNMENT BODIES
- See Category 2 table above — a lot to add.
- Structural proposal: restructure §24 as a **Plugin Manifest** — each authority gets its own sub-branch with {API endpoint, auth method, rate limit, SLA, fallback}.

#### §25 PRIVATE STRUCTURES
- Types: add **ADGM Foundation**, **DIFC Foundation**, **RAK ICC International Company**, **JAFZA Offshore**, **ADGM Private Interest Foundation**.
- Add **Ownership Transparency Layer** (who's on the register vs who's UBO — AML/FATF).
- Add **Beneficial Ownership Register filing** (UAE MOE mandate).

#### §26 BRANDS & SUPPLIERS
- Add **Certification Registry** (G-Mark, ESMA, Emirates Quality Mark, IEC, IGBC Green Pro).
- Add **Warranty Registry** (per-product serial number linked to property).

#### §27 CONSULTANTS
- Types: add **Sharia Scholar** (for Islamic structuring), **Forensic Valuer** (dispute-valuation).
- Tools: add **Engagement Letter templates per type**.

#### §28 ROBOT OPERATORS
- Certification: add **Civil Defence Operator Licence** (for autonomous construction eq.).
- Add **Incident Reporting Chain** branch (GCAA for drones, Civil Defence for ground robots).

#### §29 MEDIA
- Types: add **Content Creator with IP assignment**, **Drone Photography/Videography Operator (GCAA licence)**.
- Access: add **Embedded Access** (long-term project embedding).

#### §30 APPRAISERS
- Add **Rotation rule** (bank panel valuer rotation) — some banks require rotation every 3rd report.
- Add **Red Book (RICS) compliance indicator per report**.

---

### Block C — Transactions (8 sections)

#### §31 DEAL ENGINE
- See Category 3 and 5 deep dives above.
- Add: **Retry/Resubmit Flow** for DLD rejections.
- Add: **Currency-conversion Event** with FX-lock window.
- Add: **Concurrent Offer Handling** (multiple offers on same plot) — business rule TBD.

#### §32 ESCROW
- Add **Multi-currency Escrow** (AED + USDT + USD simultaneously for same deal).
- Add **Partial Release Rules** (e.g., 70% on transfer, 10% on hand-over, 20% after dispute-window).
- Add **Beneficiary Re-assignment Protection** (anti-fraud on escrow beneficiary change).

#### §33 JOINT VENTURES
- Add **Capital Call Automation** (smart contract).
- Add **Drag-Along / Tag-Along rights**.
- Add **IP / Brand Licensing** (when one party contributes brand).

#### §34 FRACTIONAL OWNERSHIP
- Add **Fund Administrator role** (3rd-party or Zaahi-internal).
- Add **NAV Calculation methodology**.
- Add **Redemption Queue & Gating rules** (prevent bank-run on illiquid fund).

#### §35 TOKENIZATION
- Add **Jurisdictional Template Library** (ADGM RWA, VARA, DIFC, SCA, FSRA, etc.).
- Add **Token Holder Communication Portal** (disclosures per SCA rulebook).
- Add **Retirement / Buy-back / Redemption flows**.

#### §36 AUCTION
- Add **Soft close** (bid in last N seconds extends auction).
- Add **Reserve price reveal mechanics**.
- Add **Post-auction Title Transfer SLA**.

#### §37 PAYMENT GATEWAY
- See Category 1 above.
- Add **Refund Engine** with policy branches.
- Add **Chargeback Handling** (fiat only).
- Add **Crypto On-Ramp / Off-Ramp** with KYC tiers.

#### §38 DISPUTE RESOLUTION
- Add **Mediation Tier** before arbitration (de-escalation).
- Add **Class-Action-like Collective Dispute** mode (all off-plan buyers of stalled project).
- Add **Appeal Layer**.

---

### Block D — Technology (11 sections)

#### §39 METAVERSE ENGINE
- Core: add **Streaming Model (cloud-rendered / Pixel Streaming)** for low-end devices.
- Worlds: add **Sandbox World** (user-builders), **Documentary Capture World**.
- Social: add **Voice-isolation / moderation AI**, **Parental controls**.
- Add **Persistent State Sync (CRDT/OT)** — will matter at 1k+ concurrent users in a world.

#### §40 DIGITAL TWIN
- Add **Historical Twin** (time-sliced twin — see building in 2020 vs 2025).
- Add **Counterfactual Twin** (what-if simulator).
- Add **Federated Twin Integration** (ingest 3rd-party twins: DDA twin, Smart Dubai twin).

#### §41 AI SYSTEM
- See Category 1 (sovereignty) and Category 5 (Cat expansion) above.
- Add **Model Evaluation Harness** (accuracy/latency/cost per model per task).
- Add **Hallucination Guardrails** (for Cat on legal/price statements).
- Add **Prompt Version Control & Replay** (trace any response to exact prompt+model).
- Add **User-facing AI Disclosure** (banner "Cat is AI, not legal advice" per §84).

#### §42 BLOCKCHAIN
- Add **Layer 2 rollup strategy**, **Data Availability choice** (on-chain / DA layer), **Cross-chain messaging** (CCIP / LayerZero / Axelar risk analysis).
- Add **MEV Protection** for any on-chain auction (§36).

#### §43 WEB3 & WALLET
- Add **Social Recovery** (Zaahi Embedded wallet loss).
- Add **Account Abstraction (ERC-4337)** — sponsor gas for non-crypto users.
- Add **ZK-identity proof** (prove KYC without exposing PII).

#### §44 IOT LAYER
- See Category 1 (sovereignty data plane).
- Add **Edge AI** (on-device anomaly detection to reduce backhaul).
- Add **Device Lifecycle** (provision, rotate credentials, decommission).
- Add **OT/IT Segmentation** (industrial network security).

#### §45 SATELLITE
- Add **On-board ML** (for 2030+ own satellite).
- Add **Ground-station Strategy** (UAE Space Agency MBRSC partnership).
- Add **Data Retention & Deletion Policy** (image retention years).

#### §46 ROBOTICS OS
- Add **Fleet Energy Management** (charging schedule, battery health).
- Add **Over-the-Air Update** pipeline.
- Add **Safety Case Documentation** (per-model, per-site).

#### §47 NOTIFICATION ENGINE
- Add **Transactional vs Marketing Segregation** (anti-spam compliance).
- Add **Delivery Receipt Blockchain Log** for deal-critical notifications.
- Add **Escalation Paths** (if SMS not delivered, call; if call unanswered, dispatch broker).

#### §48 SEARCH ENGINE
- Add **Semantic Search** (embedding-based), distinct from keyword.
- Add **Private Search** (owner sees more facets than guest).
- Add **Voice Search in native language**.

#### §49 TRANSLATION ENGINE
- Add **Legal Translation Certification workflow** (MOJ-certified translator wet-signature for court-submissible docs).
- Add **Glossary Management** per-jurisdiction.
- Add **Review Queue** with human approver gate.

---

### Block E — Infrastructure (3 sections)

**Special founder attention area** — self-sovereignty cornerstone.

#### §50 DATA CENTRES
- See Category 5 physical-security deep breakdown above.
- Add **Site Selection Matrix** (risk: earthquake, sea-level, political, power, connectivity).
- Add **Modular / Containerized DC option** (scaling via shipping-container pods).
- Add **Telco / Cloud Neighbour Map** (who else is in same facility — sovereignty risk).
- Add **Decommissioning Plan** (end-of-life data sanitization, hardware disposal chain of custody).

#### §51 SOVEREIGN NETWORK
- Add **DWDM Backbone** (own dark fibre between DCs).
- Add **Satellite Backup** (Starlink mentioned — add Yahsat/Thuraya as UAE-sovereign alt).
- Add **BGP Peering Strategy** (AS number registration with TDRA).
- Add **DDoS Mitigation Fabric** (on-net scrubbing).

#### §52 SOVEREIGNTY CONFIG
- Propose **Cross-Block Coupling Map** (see Category 4).
- Propose **Sovereignty Scorecard dashboard** (see Category 1).
- Add **Kill-switch Inventory** (every external API must have a local fallback or documented degradation mode).
- Add **Data Localization Enforcement** (enforce PDPL Art. 22 at infra level — deny cross-border writes by policy).

---

### Block F — Finance (5 sections)

#### §53 SOVEREIGN BANK
- See Category 5 deep breakdown.
- Add **Regulatory Capital Calculator** (Basel III implementation for CBUAE).
- Add **Liquidity Coverage Ratio monitor**.
- Add **Treasury Operations** (fiat+crypto balance sheet management).

#### §54 REVENUE ENGINE
- See Category 5 deep breakdown.
- Add **Stream 22+** reserved for future — e.g., Insurance Premium Commission (§12), Visa Advisory Fee (§64), Support Enterprise Plan (§75).
- Clarify **Current Transaction Fee rate** — tree says 0.2%; ambassador code says 2% ZAAHI service fee. Alignment required. (**This is a critical finding — see below.**)

#### §55 ROBOTICS FUND
- Add **Fund Policy Document** branch (investment policy, risk tolerance, allocation bands).
- Add **External Co-investor programme**.

#### §56 DAO TREASURY
- Add **Conviction Voting** as alternative mechanism.
- Add **Delegation Scheme**.
- Add **Vote-Buying Mitigation** (snapshot-based).
- Add **Sybil Resistance** (proof-of-personhood).

#### §57 TOKENOMICS ZAH
- See Category 5 deep breakdown.
- Add **Regulatory Classification per Jurisdiction** (utility vs security).
- Add **Exchange Listing Strategy**.

---

### Block G — Development & Construction (4 sections)

#### §58 CONSTRUCTION PIPELINE
- Add **Value Engineering Phase** (between design and construction).
- Add **As-Built Documentation** handover.
- Add **O&M (Operations & Maintenance) Manual** generation.
- Add **Commissioning & Testing** phase with sub-branches per system.

#### §59 MATERIALS & SUPPLY
- Add **Local content / ICV preference** branch.
- Add **Material Lifecycle** (embodied carbon tracking feeds §65 ESG).
- Add **Surplus / Waste Marketplace**.

#### §60 BRAND INTEGRATION
- Add **Returns / Exchange** flow.
- Add **After-sales Service** linkage.

#### §61 PROCUREMENT
- Add **RFQ/RFP workflow** for large orders.
- Add **Approved Supplier List Management**.
- Add **Supplier Onboarding KYC**.

---

### Block H — Governance (4 sections)

#### §62 LEGAL ENGINE
- See Category 1 (UAE Pass) and Category 3 (Federal Decree-Law 22/2023 notary).
- Add **Governing Law / Forum Selection UI** per contract.
- Add **Translation at Signing** (bilingual contracts standard in UAE).
- Add **Contract Lifecycle Management** (renewals, amendments, terminations).

#### §63 COMPLIANCE
- See Category 2 and Category 5 deep breakdowns.
- Add **Sanctions Real-time Screening** (every transaction).
- Add **Adverse Media Screening**.
- Add **Regulatory Change Monitoring** (subscribe to DLD/RERA/VARA/CBUAE circular feeds).

#### §64 GOLDEN VISA
- See Category 2 (ICA) and Category 5 (tiers).
- Add **Family Sponsorship** sub-tree.
- Add **Renewal Tracker**.
- Add **Revocation Triggers** (criminal conviction etc.).

#### §65 ESG
- See Category 3 (Estidama, Al Safat).
- Add **Social: Labour Standards audit** (Kafala reform compliance).
- Add **Governance: Board Diversity metrics**.
- Add **Reporting Standards** (GRI, SASB, TCFD).
- Add **Green Building Financing incentives** (UAE Central Bank green loan rates).

---

### Block I — Intelligence (5 sections)

#### §66 MARKET INTELLIGENCE
- Add **Shadow Market Tracking** (off-market deals estimation).
- Add **Supply Pipeline** (approved-not-yet-built inventory).
- Add **Comparative Advantage Report** per district.
- Add **Macro Feed Integration** (oil price, tourism arrivals — correlates with UAE RE).

#### §67 PRICE PREDICTION
- Add **Ensemble Model Voting**.
- Add **Uncertainty Quantification** (prediction intervals, not just point estimates).
- Add **Counterfactual Explainer** (SHAP values per plot).

#### §68 RISK MANAGEMENT
- Add **Concentration Risk** (portfolio).
- Add **Climate Risk** (sea-level, heat-island, sandstorm frequency).
- Add **Reputational Risk** (social media sentiment).

#### §69 FRAUD DETECTION
- Add **Graph Anomaly Detection** (wallet network analysis).
- Add **Deep-fake / Document Forgery Detection ML**.
- Add **Collusion Ring Detection**.

#### §70 ANALYTICS ENGINE
- Add **Product Analytics Events Standard** (event schema registry).
- Add **Consent-aware Analytics** (honour §84 PDPL consent).
- Add **Data Warehouse** (separate from OLTP Supabase).

---

### Block J — Ecosystem (6 sections)

#### §71 BRAND MARKETPLACE
- Add **Sample & Showroom Booking**.
- Add **Customization / Made-to-Order**.
- Add **Trade-in / Upgrade Programme**.

#### §72 EDUCATION & CERTIFICATION
- Add **KHDA (Dubai regulator) recognition** for formal qualifications.
- Add **RERA-approved broker courses** alignment.
- Add **Apprenticeship programme** (robotics operators).

#### §73 MEDIA & DOCUMENTARY
- Add **IP Rights Framework** (participant release forms, minor-consent).
- Add **Distribution Partners** (Netflix, Amazon, regional OSN).
- Add **Behind-the-scenes Archive**.

#### §74 COMMUNITY
- Add **Moderation Layer** (AI + human).
- Add **Reputation Decay** (reputation lowers with inactivity).
- Add **Community Fund** (grants for community-led initiatives).

#### §75 SUPPORT & HELPDESK
- Add **Multi-tenant Support Tiers** (SLA for enterprise / Golden / Platinum ambassadors).
- Add **After-hours On-call rotation**.
- Add **Post-Mortem Publication** (transparency for incidents).

#### §76 ONBOARDING FLOW
- Add **Re-engagement flow** for dormant users.
- Add **Progressive Disclosure** (don't overwhelm — stage reveal).
- Add **Verified-Email + Phone + EID triple-gate** before listing/deal actions.

---

### Block K — Access Platforms (5 sections)

#### §77 WEB PLATFORM
- Add **PWA (Progressive Web App) capabilities**.
- Add **Offline-first API Design**.
- Add **Bandwidth-adaptive mode** (low-bandwidth UAE remote areas, 2G fallback for agents in field).

#### §78 MOBILE APP
- Add **Code Signing & Distribution Sovereignty** (risk of app-store removal — plan for sideload APK / direct IPA distribution in sanctioned scenarios).
- Add **Biometric Vault** for documents.
- Add **Offline Doc Sign & Queue**.

#### §79 DESKTOP APP
- Add **Plugin Ecosystem** (architect brings own BIM plugin).
- Add **High-DPI / Colour-accurate mode** (architects).

#### §80 VR / AR
- Add **Motion Sickness Mitigation** standards.
- Add **Accessibility for VR** (seated mode, subtitles, colour-blind mode).
- Add **Privacy** (spatial recording is PII-sensitive).

#### §81 API MARKETPLACE
- Add **SDK per language** (JS, Python, PHP, Go, Kotlin for mobile).
- Add **Webhook Delivery SLA**.
- Add **API Versioning & Deprecation policy** (N-1 support minimum).

---

### Block L — Operations (4 sections)

#### §82 MONITORING
- See Category 1 (self-hosted GlitchTip / VictoriaMetrics).
- Add **Synthetic Monitoring** (headless-browser happy-path checks every 5 min).
- Add **Cost Observability** (per-module cloud spend — even pre-sovereignty).
- Add **SLO/SLA Dashboard** per critical node in §1203 TOP 15.

#### §83 CI/CD
- Add **Supply Chain Security** (SLSA level 3 target, SBOM per build, signed artifacts).
- Add **Ephemeral Preview Environments** per PR.
- Add **Feature Flag Infrastructure** (documented as non-sovereignty-threatening).

#### §84 DATA PRIVACY
- See Category 1 (Key Management) and Category 3 (Cross-border transfer).
- Add **Data Subject Request Automation** (PDPL right-to-know, right-to-delete).
- Add **Consent Ledger** on-chain (auditable consent trail).
- Add **Privacy Engineering Review Gate** in CI for any schema change touching PII.

#### §85 ACCESSIBILITY
- Add **Audit Cadence** (annual 3rd-party audit + quarterly internal).
- Add **Assistive Technology Test Matrix** (JAWS, NVDA, VoiceOver, TalkBack).
- Add **Plain Language mode** (simplify legal copy).

---

## Proposed NEW sections (block-level additions)

Six candidate sections are proposed for v3.1 incorporation subject to founder approval. Each is accompanied by justification, target block, dependencies, and effort class.

### §86 HERITAGE & WAQF ASSETS (propose Block A extension)

**Justification:** UAE has a large Waqf (Islamic endowment) property portfolio managed by Awqaf authorities (Dubai Awqaf, Abu Dhabi General Authority for Islamic Affairs). These assets are irrevocable, non-saleable, but leaseable, and they represent a large off-platform RE pool. Additionally, heritage-listed buildings (Dubai Culture, DCT Abu Dhabi) have altered regulatory status (no demolition, restoration-only). Zaahi cannot call itself the OS of UAE RE without handling these.

**Dependencies:** §01 LAND (asset), §22 BANKS (Islamic finance structuring), §62 LEGAL (Waqf declaration, Sharia-law precedence), §63 COMPLIANCE (Awqaf authority reporting), §65 ESG (heritage preservation score).

**Proposed tree:**
```
├── Asset Types (Awqaf Khayri public-benefit, Awqaf Ahli family, Heritage Listed)
├── Registry Integration (Dubai Awqaf, GAIAA Abu Dhabi, Sharjah Awqaf)
├── Lifecycle (Declaration, Administration, Beneficiary Distribution, Reversion)
├── Leaseability Rules (Long-lease permitted, sale forbidden, restoration-only for heritage)
└── Reporting (Quarterly Awqaf authority report, Public transparency register)
```

**Effort:** R&D → V3 (product). Needs Sharia scholar and cultural authority engagement.

---

### §87 EMERGENCY RESPONSE & INCIDENT MANAGEMENT (propose Block L extension)

**Justification:** Platform with 50-year verifiability needs formal incident response beyond "Alerts" in §82. Data breach, key compromise, smart-contract exploit, robot safety incident, physical DC outage — each has a distinct playbook. UAE Central Bank expects financial institutions to have documented BCP/DR.

**Dependencies:** §82 MONITORING (detect), §84 DATA PRIVACY (breach notification), §63 COMPLIANCE (regulatory reporting), §41 AI (Cat as comms channel), §73 MEDIA (public statement).

**Proposed tree:**
```
├── Incident Classes (Security, Data, Financial, Physical, Reputational, Regulatory)
├── Severity Matrix (SEV-0 through SEV-4 with on-call tiers)
├── Runbooks (per incident class, maintained as code)
├── Communication Plan (internal Slack/Telegram → exec → users → regulators → media)
├── Post-Incident Review (blameless PIR, corrective action tracking)
└── Regulatory Breach Notification (PDPL 72-hour notify, CBUAE reporting channels)
```

**Effort:** MVP (runbooks can be markdown); matures across years.

---

### §88 ACADEMIC RESEARCH & R&D PARTNERSHIPS (propose Block J extension)

**Justification:** Long-horizon platform (10-year vision) needs institutional research partnerships to stay on frontier: Khalifa University (robotics), MBZUAI (AI), AUS (construction tech), UAEU (climate), Mohammed Bin Rashid Space Centre (satellite). Research grants also unlock non-equity capital that keeps founder control high.

**Dependencies:** §41 AI, §46 ROBOTICS, §45 SATELLITE, §56 DAO (research grants), §72 EDUCATION.

**Proposed tree:**
```
├── Partner Registry (MBZUAI, Khalifa U, AUS, MBRSC, UAE Space Agency, international)
├── Programmes (PhD sponsorship, post-doc, joint papers, dataset sharing)
├── IP Framework (joint-ownership defaults, publication rights, patent coordination)
├── Grant Management (UAE research grants, EU Horizon, ISEF)
└── Open Science Policy (data release cadence, reproducibility standards)
```

**Effort:** V2 / V3 (relationships take years to build).

---

### §89 ENVIRONMENTAL & CLIMATE INTELLIGENCE (propose Block I extension)

**Justification:** UAE-specific climate risks (sea-level, heat, sandstorm, flash flood — 2024 April rains event made this acute) should be a first-class module, not buried under §45 Satellite. Impacts valuation (§67), insurance pricing (§12), construction planning (§58), ESG (§65), and design (§20).

**Dependencies:** §45 SATELLITE, §44 IOT, §65 ESG, §12 INSURANCE, §67 PRICE PREDICTION, §01 LAND (risk overlay).

**Proposed tree:**
```
├── Data Sources (NCM National Center of Meteorology, NASA/ESA climate, local IoT)
├── Hazard Models (Flash Flood zones, Storm Surge, Heat Island, Sandstorm frequency, Seismic)
├── Per-Parcel Risk Score (feeds §01 valuation overlay, §12 insurance pricing)
├── Historical Event Log (2024 April rains, past cyclones, heatwaves)
├── Climate Projection (2030/2050/2100 scenarios)
└── Adaptation Recommendations (flood defences, shade infrastructure, green cover)
```

**Effort:** V2.

---

### §90 OPEN SOURCE & DEVELOPER RELATIONS (propose Block J extension)

**Justification:** §81 API MARKETPLACE exists. But "developer ecosystem" is larger — open-source the non-differentiating pieces (plugin SDK, country-plugin template, SDK libraries) to recruit external contributions, reduce maintenance burden, and establish Zaahi as a technical standard-setter ("ZAAHI Standard for Tokenized RE"). Also critical for sovereignty: open-source = fewer licensing risks.

**Dependencies:** §81 API MARKETPLACE, §56 DAO (grants for contributors), §42 BLOCKCHAIN (standards).

**Proposed tree:**
```
├── OSS Repository (github.com/zaahi-platform/<repos>)
├── Licence Strategy (MIT/Apache core, commercial add-ons)
├── CLA/DCO (Contributor License Agreement)
├── Bounty Programme (security, features)
├── Standards Authorship (ZAAHI RE-Tokenization Standard, ZAAHI Country-Plugin Spec)
└── Developer Evangelism (conferences, workshops, ambassador dev programme)
```

**Effort:** V2 (pick first OSS project strategically).

---

### §91 ARCHIVE & HISTORICAL RECORD INGESTION (propose Block A or Block L extension)

**Justification:** UAE has decades of RE transactions pre-platform. For the "50-year verifiable" vision (§42), the platform needs ingestion pipelines to digitize historical DLD, RERA, municipality records. This differs from §73 MEDIA archive (which is platform-native events); §91 is retroactive external-data ingestion.

**Dependencies:** §24 GOV BODIES, §42 BLOCKCHAIN (anchor historical records), §01 LAND (title-chain), §09 DISTRESSED (provenance disputes).

**Proposed tree:**
```
├── Sources (Paper-records scanning, microfilm, legacy gov databases, broker CRMs)
├── OCR & Arabic NLP pipeline (handwritten title deeds, stamp recognition)
├── Entity Resolution (name variants, plot-number format changes over time)
├── Title Chain Construction (back to 1971 foundation of UAE)
├── Blockchain Anchoring (batched merkle roots)
└── Public Research Portal (§73 + §88 overlap)
```

**Effort:** R&D → V3 (gov cooperation needed).

---

## Critical observations (founder attention required)

These findings warrant explicit founder review before v3.1 incorporation.

### Observation 1 — Revenue Engine fee rate mismatch
**§54 Revenue Engine Stream 01 lists "Transaction Fee 0.2%".** The ambassador program (CLAUDE.md + `src/lib/ambassador.ts`) uses **ZAAHI service fee 2%** as commission base. Either:
- Master tree is outdated and should read 2% → **but this is an edit, not additive**. Needs founder decision to deprecate old fee-rate reference or clarify that 0.2% is a different stream than the 2% service fee.
- Or there are two distinct fees (0.2% platform fee + 2% service fee) — in which case tree should show both.

**Recommendation:** founder confirms which interpretation; v3.1 captures both as distinct streams if applicable.

### Observation 2 — "DLD" used as verb, but DDA is the actual land regulator for DDA plots
Tree uses "DLD" (Dubai Land Department) as blanket term. Actual regulatory authorities depend on area: **DLD** (freehold areas), **DDA** (Dubai Development Authority — TECOM, Dubai Hills, Jumeirah Lake Towers etc.), **ADGM RA** (Reem), **Abu Dhabi DMT**, **Sharjah Real Estate**, **RAK/Ajman/UAQ/FUJ authorities**. Current master tree risks Dubai-centric bias. Already partially mitigated by §24 plugin architecture; propose **stronger enforcement** — replace most "DLD" references with "Land Authority (per emirate plugin)" as the canonical term, and document the mapping in §24.

### Observation 3 — Vercel / Supabase / Anthropic lock-in risk vs sovereignty promise
Production (per CLAUDE.md) runs on Vercel + Supabase + Anthropic Claude. Master tree §52 says migration to own DC is Q3 2026. Between now and then, **every new feature added to production increases the migration surface area**. Proposal: each new section/feature PR should include a "Sovereignty Impact Statement" — does it add new third-party dep, or can it run on own infra? Enforced at CI.

### Observation 4 — Phase 1 User Dashboards (current work) is outside master tree
The current memory / CLAUDE.md session status indicates Phase 1 User Dashboards for OWNERS/BUYERS/BROKERS. This maps to §14, §15, §17 in master tree. Master tree does not explicitly name the "dashboard" component per role — it is implied under each participant's "Dashboard" branch. Propose: add explicit **cross-role Dashboard framework** under §76 ONBOARDING or as a sub-module in §77 WEB PLATFORM, so new participant types (§18-30) can inherit consistent dashboard patterns rather than reinventing.

### Observation 5 — §52 Sovereignty Config migration plan is partial
§52 lists AWS→Own Q3 2026, Infura→Own Q4 2026, OpenAI→Own Q4 2027, Stripe→Own Bank Q2 2028. Missing migrations: **Vercel→Own**, **Supabase→Own PostgreSQL+Keycloak**, **Cloudflare R2→MinIO**, **GitHub→Gitea/Forgejo**, **Anthropic→Own Qwen/Llama fine-tune**, **Twilio→Own SMPP**, **Resend→Own SMTP**, **Sentry→GlitchTip**. These are named in Category 1 above but should be formalized in §52.

### Observation 6 — Identity / KYC duplication across participants
Every participant (§14-30) lists its own verification flow. In practice, **one identity per legal person** should be verified once and referenced across roles. Propose: **§63 COMPLIANCE** should own the shared KYC/AML service, and §14-30 consume it. Currently implied but not drawn — risks each participant team building duplicate KYC.

### Observation 7 — No explicit data model section
Master tree is architectural / module-level but has no **canonical data model** (entities + relationships). Prisma schema in `prisma/schema.prisma` is the current source-of-truth, but long-term platform needs an **explicit entity-relationship layer** that is part of master tree governance. Propose: new branch under §52 SOVEREIGNTY CONFIG or new section "§92 Canonical Data Model" (optional).

### Observation 8 — Internationalization depth
Tree mentions EN/AR/RU/UK/SQ/FR consistently. Missing: **target-market deep cuts** — Urdu and Hindi (Indian/Pakistani expat buyers = largest foreign-buyer segment in Dubai), Chinese (Singapore/HK/Mainland investors), German (European luxury), Farsi (Iranian diaspora, sensitive). Propose tiered approach under §49.

### Observation 9 — No Security & Key-Management master branch
Security is scattered across §42 Blockchain, §44 IoT, §63 Compliance, §82 Monitoring, §84 Data Privacy. Propose consolidating **Security Strategy** as a cross-cutting annex under §52 or a new section, to prevent drift.

---

## Review process

Per `docs/architecture/README.md`:

> **Additive only.** Never delete existing branches from master tree. [...] **New sections require founder approval** (Dymo). Submit as PR with justification, block, dependencies, effort.

This document is the PR justification. Incorporation into `MASTER_TREE_final.md` as v3.1 is a separate PR, and requires founder (Dymo) explicit approval.

Once approved, changes are applied in this order:

1. Category 4 — cross-block dependencies (lowest risk, no new concepts).
2. Category 5 — deep breakdowns (expands existing branches).
3. Category 3 — critical-node additions (annotations, not new branches).
4. Category 2 — UAE regulatory additions (factual, well-scoped).
5. Category 1 — self-sovereignty enhancements (largest scope, most strategic).
6. New sections 86-91 — one at a time, each with its own founder sign-off.

Observations 1-9 block categories as noted and are resolved via direct founder decisions.

---

**End of improvements document.**
