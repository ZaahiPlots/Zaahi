# MASTER TREE — MISSING BRANCHES

**Document:** Gap Analysis + Proposed New Branches / Sections (advisory; does not amend the Master Tree)
**Prepared for:** Zhan (Founder/CEO/CTO), Dymo (Co-founder), Rudi (Investor/Board)
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Relation to Master Tree v3:** This document analyses what's **missing** or **underdeveloped** in the current 85-section canon. Existing sections remain untouched. Proposals here are candidates for a future v3.1 or v4; this document neither renumbers nor removes anything.
**Classification:** CONFIDENTIAL

---

## Executive summary

The Master Tree v3 covers 85 sections across 12 blocks and scores very high on completeness for the **supply-side** of the market (assets, participants, transactions, technology, infrastructure). Where it's thinnest is on **lifecycle continuity** — what happens to a buyer / owner / tenant / broker *after* the first transaction, across multiple years, across multiple properties, across generational wealth transfer.

Four genuine gaps stand out, ranked by Y3–Y5 revenue potential:

1. **After-sale lifecycle** — property management (§13 exists but shallow), maintenance, renovation financing, concierge. Same user, multiple revenue touches over 10+ years.
2. **Cross-border journey** — Golden Visa (§64 exists but shallow), international tax, currency hedging, inheritance, multi-jurisdiction estate planning. Critical for HNWI / family office / SWF customer.
3. **Risk management** — §68 exists but is a block-level stub; credit risk, market risk, operational risk, compliance risk each deserve dedicated sub-sections.
4. **Explicit journey maps** — developer journey, investor journey, owner journey, tenant journey are *implicit* (the 85 sections support them) but never *explicit* (no canonical page saying "the developer's 24-month journey in 6 phases").

Six further areas are "underdeveloped, not missing" — they exist but could be deepened:
- ESG / sustainability (§65 exists but shallow).
- Education (§72 exists, mostly placeholder).
- Community (§74 exists, mostly placeholder).
- Auction / distressed (§09 + §36 fragmented — could consolidate into "Secondary / Distressed" block).
- Insurance + estate / disaster / claims (§12 exists but emergency-response gap).
- Private estate planning (no section at all — pure gap).

This document proposes 9 new branches plus 1 meta-section (explicit journey documentation). Combined Y5 revenue potential: AED 50–90 M at platform maturity, mostly from after-sale + cross-border + private estate.

---

## §1 Risk Management branch (proposed new block or expanded §68)

### Current state

Master Tree §68 Risk Management exists as a single section. Its sub-headings are: Deal Risk, Market Risk, Operational Risk, Risk Dashboard. Good bones, but one section can't carry the depth a real risk framework needs for ZAAHI at scale (AED 5 B+ transaction volume Y3).

### Gap

Five risk disciplines are missing or fragmented across other sections:

1. **Credit risk** — for the mortgage routing (§22), tier subscription revenue, commissions receivable from external brokers. How do we price the probability that an external broker defaults on a split?
2. **Market risk** — stub exists, needs hedging strategy (FX for cross-border, interest-rate for mortgage origination, property-price for fractional ownership).
3. **Operational risk** — stub exists, should split out technology failure, supplier failure, key-person failure, fraud.
4. **Compliance risk** — not separated out; belongs as a distinct risk category (AML findings, VARA rule changes, PDPL enforcement, transfer-pricing disallowance, etc.).
5. **Currency risk** — foreign buyers pay in USD / EUR / GBP / RUB / CNY. AED peg to USD is stable but cross-currency (EUR ↔ AED, GBP ↔ AED) is not. For multi-million-AED deals with a 30-day settlement window, even 1 % FX move is meaningful.

### Proposed structure

If re-opened, "Block I — Intelligence" would split §68 into a dedicated risk sub-block (or new Block M Risk). Minimum viable expansion:

- **§68.1 Credit risk** — counterparty ratings, ambassador downline default modelling, mortgage-origination credit scoring.
- **§68.2 Market risk** — real estate price indices, FX exposure, interest-rate sensitivity, sensitivity dashboard.
- **§68.3 Operational risk** — tech failure tiers, supplier concentration, key-person insurance, fraud heatmap.
- **§68.4 Compliance risk** — regulatory change tracker (DLD / RERA / VARA / PDPL / tax), jurisdictional monitor.
- **§68.5 Currency risk** — FX hedging products (when Sovereign Bank §53 is live), multi-currency invoice engine, settlement-timing optimisation.
- **§68.6 Risk dashboard** (existing) — executive view with alert thresholds.

### Priority: **P1** (risk is IPO-level due diligence material; gap is visible in pitch decks today).
### Revenue potential: indirect — AED 20–40 M / yr Y5 in *preserved revenue* (losses avoided, audit-savings).
### Implementation complexity: medium — 8 engineer-weeks for MVP risk dashboard; FX hedging is §53 Sovereign Bank dependent.
### Dependencies: §22 Banks, §53 Sovereign Bank, §63 Compliance, §69 Fraud Detection.
### Comparable: Bloomberg Terminal / MSCI real estate risk feeds; for proptech, Yardi + CoStar have risk modules.

---

## §2 ESG / Sustainability branch (expand §65)

### Current state

§65 ESG & Sustainability exists with sub-headings: Building Ratings (LEED, Estidama, BREEAM), Energy Efficiency, Water Management, ESG Reporting, Green Finance. The structure is adequate; the depth is thin.

### Gap

UAE has committed to net-zero by 2050. Dubai 2040 Urban Master Plan has explicit sustainability targets. Foreign capital, especially European family-office money and UAE sovereign wealth (Mubadala, ADQ, ADIA), increasingly mandates ESG scoring in real estate allocations. ZAAHI has the map, the 3D, the building-level data — it can compute ESG scores natively where every listings competitor just links to a PDF certificate.

### Proposed additions

- **Building-level ESG score AI model.** For each parcel, compute: carbon footprint (materials × floor area × grid carbon intensity), solar potential (satellite-derived irradiance × roof area), water efficiency (from building spec), walkability / transit score. Output a ZAAHI ESG score 0–100 per parcel.
- **Green Building Certification tracker.** Integrate LEED / Estidama / Mostadam (Saudi) / BREEAM status per parcel where available. Public-data pulls where possible; owner-submitted where not.
- **UN SDG alignment reporting.** Investor report module: for this fractional-ownership portfolio, map the contribution to SDG 11 (Sustainable Cities), SDG 13 (Climate Action), SDG 7 (Affordable & Clean Energy).
- **Carbon offset marketplace.** Owners can offset their building's annual carbon via verified UAE offsets (mangrove restoration via EAD Abu Dhabi, for example). ZAAHI takes 3–5 % commission on offset purchases.
- **ESG-focused fund routing.** Investors filtering for "ESG-aligned only" get a curated subset of listings. Revenue impact: green-bond-eligible portfolios are a growing segment of sovereign mandates.

### Priority: **P2** (not blocking agency revenue, but IPO-narrative multiplier).
### Revenue potential: AED 5–15 M / yr Y5 (offsets 3 % + ESG fund routing 1 % + ESG report subscription AED 5 k / yr × developer tier).
### Implementation complexity: medium — 10 engineer-weeks + one data-science engineer for ESG model.
### Dependencies: §45 Satellite, §66 Market Intelligence.
### Comparable: Measurabl (US ESG-tech, raised $93 M), Arcadis ESG advisory, Yardi ESG module.

---

## §3 Education branch (expand §72)

### Current state

§72 Education & Certification has: Courses, Metaverse Classroom, Certification, NFT Certificates. Intent is good; execution is placeholder (no courses ship, no instructors booked).

### Gap

Education is a *content* play, not a software play. It requires instructor time, course production, marketing. For ZAAHI, education has three distinct customer paths that merit separate strategy:

1. **Pre-license broker training** — RERA prep course (mandatory), Trakheesi permit basics, DLD workflow. Target: would-be UAE brokers. Revenue: AED 1 500–3 000 per student × 500 / yr = AED 750 k – 1.5 M / yr.
2. **Investor education** — first-time UAE buyers (foreign HNWI, expat residents). Modules: Transfer Fee mechanics, NOC, Oqood vs. Ready Property, mortgage basics, Golden Visa implications, tax residency. Target: 2 000 / yr × AED 500 = AED 1 M / yr.
3. **Developer / architect technical education** — feasibility modelling, GFA optimisation, robotic construction readiness. Target: 200 / yr × AED 5 000 = AED 1 M / yr.

### Proposed additions

- **ZAAHI Academy branding.** A distinct learning surface at `/academy` with 3 tracks: Broker, Investor, Developer.
- **Partnerships with UAE training-licensed providers.** Dubai Real Estate Institute (DREI) for RERA prep; Dubai Future Academy for proptech modules; local universities (American University of Sharjah, Zayed University) for academic accreditation.
- **Content production** via Dymo's videographer (already retained) — cinematic, 60-second hooks, 15-minute deep dives. Same crew, new output surface.
- **NFT certificates on Polygon** per §72.
- **Referral tie-in.** Graduates of ZAAHI Broker Academy get fast-tracked Gold-tier Ambassador status (saves the AED 5 k purchase).

### Priority: **P2** (revenue path + brand multiplier; not blocking first-year targets).
### Revenue potential: AED 2.5–5 M / yr Y3, scaling to AED 10–20 M / yr Y5 (if Saudi expansion ships).
### Implementation complexity: low on software (LMS is a solved problem — Teachable, Thinkific, or self-host Moodle) — high on content production.
### Dependencies: §49 Translation, §76 Onboarding, §18 Referrals.
### Comparable: Udemy Business ($600 M+ revenue), Coursera proptech track, real-estate-specific academies in US (Aceable, Kaplan Real Estate Education).

---

## §4 Community branch (expand §74)

### Current state

§74 Community has: Forums, Market Discussions, Deal Sourcing, Expert Q&A, Reputation System (NFT badges), Metaverse Events. Good structure; no traction.

### Gap

Community in real estate is either a social feed (low engagement) or a genuine trust network (high engagement, hard to build). UAE proptech communities today are fragmented across WhatsApp groups (unsearchable, un-moderated), LinkedIn DMs (broker-to-broker only), and conferences (Cityscape — once a year).

### Proposed additions

- **Cityscape Global integration.** ZAAHI sponsors a booth / digital presence at Cityscape Global Dubai. In-platform event subpages with pre-scheduled meetings between ambassadors, brokers, and investors. Ticket sale integration (commission share).
- **Expert Q&A with Dymo + invited experts.** Weekly 30-min live sessions in Metaverse (when ready) or Zoom-embedded (short-term). Record, transcribe, index. Builds authority; drives SEO.
- **Deal-sourcing network for Platinum-tier ambassadors.** Private channel where Platinum ambassadors post off-market opportunities. Zaahi takes finder's fee on closed introductions.
- **Regional chapters.** Abu Dhabi, Dubai, Sharjah, RAK — each gets a community lead (unpaid volunteer Platinum ambassador). Quarterly in-person meetups (coffee, not paid).
- **Reputation score.** Composite: deal history, community contribution (answers given, events attended), ambassador downline performance. Gated visibility — only ambassadors see each other's scores.

### Priority: **P3** (brand / moat-builder; slow revenue).
### Revenue potential: AED 2–5 M / yr Y5 (event sponsorships, deal-sourcing commissions, community-led referrals).
### Implementation complexity: medium — software is simple, sustained community management is a headcount question (1 FTE community manager, AED 15–25 k / month).
### Dependencies: §39 Metaverse (for live events), §18 Ambassador.
### Comparable: Compass "partnership" model, Zillow community forums, LinkedIn Real Estate groups.

---

## §5 After-sale / Property Management branch (expand §13)

### Current state

§13 Property Management has: Facilities (building maintenance, common areas, security, cleaning & landscaping), Financial (service charge collection, budget planning, expense reporting), Tenant Relations, IoT Integration. Structure is solid but shallow; entire sub-category deserves deeper treatment.

### Gap

This is the **largest revenue-under-Master-Tree gap**. Post-transaction, a property owner faces 10+ years of ongoing decisions: who manages the property, who insures it, who fixes the AC, who re-lets it when the tenant leaves, who refurbishes when the style dates, who sells it when the owner is ready to exit. ZAAHI captures the transaction but not the decade. Every touchpoint here is a 3–10 % margin opportunity.

### Proposed structure — "Block M — After-sale lifecycle" (proposed new block):

- **§13.1 Facilities management partnership network** — Better Homes PM, Asteco, Cushman & Wakefield, ServeU. ZAAHI routes owner's PM request to partner, takes finder's fee (3–5 %) + ongoing % (1–2 % of annual fees).
- **§13.2 Maintenance marketplace** — plumber, electrician, AC technician. Uber-style dispatch, pre-vetted contractors, ZAAHI takes 10–15 % commission on the call-out.
- **§13.3 Renovation financing** — when owner wants to renovate (AED 200 k–2 M spend), partner with Mashreq or RakBank for renovation loans. ZAAHI refers, takes AED 3–8 k / loan origination.
- **§13.4 Interior design marketplace** — architects / designers (per §20) pitch their services on owner's property. ZAAHI takes 10–15 % design commission.
- **§13.5 Tenancy management** — Ejari auto-registration (§11 ticks this), rent collection, eviction support, deposit management. Subscription: AED 500–2 000 / unit / yr.
- **§13.6 Concierge / lifestyle** — cleaner, pool service, garden, pet care. Partner with Justmop / Matic / similar. Commission share.
- **§13.7 Short-term rental dynamic pricing.** For owners using Airbnb / Booking.com — plug in dynamic-pricing service, take split.

### Priority: **P1** (largest Y3+ revenue opportunity per Master Tree gap).
### Revenue potential: AED 15–40 M / yr Y5 (at 10 000 managed units × AED 1 500 avg annual share).
### Implementation complexity: high — many integrations, many partners. 30+ engineer-weeks cumulative; 2–3 business-development full-time hires.
### Dependencies: §11 Rental, §18 Ambassador, §22 Banks, §20 Architects, §26 Brands.
### Comparable: Airbnb ecosystem, Smartbnb, Turo-for-property-management startups. Middle East: Property Finder tried this with their Qanat acquisition (agent CRM); no one has cracked the full after-sale loop.

---

## §6 Secondary / Distressed market branch (consolidate §09 + §36)

### Current state

§09 Distressed Assets (court-ordered, bank foreclosure, abandoned, mortgaged) and §36 Auctions exist separately. There's no *secondary market* framing as a distinct channel.

### Gap

Secondary-market secondary-sales and distressed-sales are related channels — same asset, different intermediation. Allsopp & Allsopp built a AED 77 M / yr business on secondary Dubai; DAMAC + Emaar dominate off-plan but leave secondary largely to independents. ZAAHI's map-first approach is differentially strong in secondary (every plot has history, every district has comps).

### Proposed structure

A "Secondary / Distressed" sub-block would unify:

- **§36.1 Secondary resale platform** — ready-property listings with automated valuation (§67), comp-based pricing, anti-price-manipulation (§14 Owners).
- **§36.2 Distressed asset marketplace** — abandoned, mortgaged, court-ordered (per §09). Partner with banks for foreclosure-flow routing.
- **§36.3 Auction engine** (existing §36) — English, Dutch, Sealed Bid, Metaverse Auction Room.
- **§36.4 Commercial leasing** — office / retail / warehouse secondary (currently fragmented across §03 + §11).
- **§36.5 Bulk sale facilitation** — investor exits a 10+ unit portfolio. Specialised workflow.

### Priority: **P2** (ready revenue path, but not a Y1 unlock).
### Revenue potential: AED 5–20 M / yr Y5 (commission on secondary deals flowing through Platform, partner referral with banks on foreclosure flow).
### Implementation complexity: medium — most sub-sections already architected in §09 / §36. Consolidation is editorial, not engineering.
### Dependencies: §22 Banks, §31 Deal Engine.
### Comparable: Ten-X (US commercial auction), Auction.com (foreclosure), Allsopp & Allsopp secondary model, PRYPCO Mint secondary (tokenised).

---

## §7 Cross-border branch (expand §64 + new sections)

### Current state

§64 Golden Visa & Immigration (NEW in Master Tree v3): Eligibility (AED 2M+), Process, Integration (DLD Verification, Property Value Check, Auto-Qualification), Advisory (Cat Golden Visa Guide, Consultant Matching). Good start for visas.

### Gap

The complete cross-border journey for a foreign buyer has 5 pillars — only 1 (visa) is in Master Tree:

1. **Visa & immigration (§64)** — present.
2. **Cross-border mortgage** — UAE mortgage for non-resident buyer. Huspy does this domestically; the foreign-buyer variant is thinner. Offshore banking introduction (Mashreq International, HSBC International) is undocumented.
3. **Currency conversion & hedging** — USD / EUR / GBP / SGD / RUB / CNY in, AED out. 30–60 day settlement windows. Wise / Revolut Business for individuals, FX forwards for >$1 M. No section.
4. **International tax advisory** — US FATCA, UK ATED, Indian LRS, Russian CRS, CRS exchange of information. A foreign buyer's tax position affects whether they should buy directly, via ADGM SPV, via DIFC foundation, or via offshore holding. No section (§25 Private Structures exists but stops at UAE jurisdictions).
5. **Inheritance & estate planning** — cross-border succession. Critical for HNWI. UAE non-Muslim expats can register DIFC Will or ADJD Will, but 90 % don't know this — their UAE property defaults to Sharia distribution if they die intestate. No section.

### Proposed additions

Expand §64 to a mini-block:

- **§64.1 Golden Visa advisory** (existing).
- **§64.2 Cross-border mortgage routing** — partner with Mashreq International, HSBC Expat, Standard Chartered Priority. Commission per origination: AED 5–15 k.
- **§64.3 FX & treasury** — partner with Wise Business / Revolut Business for <$100 k transfers; bank FX desk for >$1 M; forward contracts for settlement windows. Revenue: FX markup share ~0.2–0.5 %.
- **§64.4 International tax advisory marketplace** — curated partners (Charltons, Crowe UAE, KPMG Private Client). ZAAHI takes referral fee AED 2–10 k.
- **§64.5 Estate & succession planning** — see §9 below (dedicated section warranted).

### Priority: **P1** (HNWI segment is Dymo's pipeline; serving end-to-end raises avg commission per client).
### Revenue potential: AED 10–25 M / yr Y5 (FX markup + advisory referrals + Golden Visa advisory fee).
### Implementation complexity: high on partnerships, medium on software. 15 engineer-weeks + substantial business development.
### Dependencies: §22 Banks, §25 Private Structures, §27 Consultants.
### Comparable: Knight Frank International Private Wealth, JLL Private Residential, Sotheby's International Realty — all offer some version of this.

---

## §8 Disaster / Emergency branch (expand §12 + new section)

### Current state

§12 Insurance (NEW in Master Tree v3): Types (property, title, construction, professional liability, rental guarantee), Integration (auto-quote on deal, policy management, claims processing), Providers (local Orient / Oman, global AXA / Zurich, parametric smart contract).

### Gap

Insurance handles the **financial** dimension of disaster. The **operational** dimension (what happens immediately after a fire, flood, structural issue) is absent. Dubai has had notable building fires (Torch Tower 2015 / 2017, Address Downtown 2015, Marina Torch 2017) — each time the affected residents had no coordinated platform for: temporary accommodation, claims-triage, contractor dispatch, insurance-adjuster coordination, rebuilding sequencing.

### Proposed additions

A sub-section "§12.X Disaster response coordination":

- **§12.X.1 Property insurance claims dashboard** — filing, tracking, adjuster scheduling, payout status. Integrates with §12 insurance providers.
- **§12.X.2 Damage assessment AI** — user photos + AI preliminary damage estimation (leverage §45 satellite for exterior imagery).
- **§12.X.3 Temporary accommodation routing** — partner with Airbnb / serviced-apartment providers for immediate shelter during repair.
- **§12.X.4 Rebuild coordination** — contractor dispatch, permit re-acquisition (DM / Dubai Civil Defence), insurance-funded rebuild progress tracking.
- **§12.X.5 Emergency contacts directory** — Dubai Civil Defence (997), Dubai Ambulance (998), Dubai Police (999), Dubai Municipality hotline, building-specific emergency contacts (concierge / security).

### Priority: **P2** (low-probability high-severity events; not Y1 revenue, but reputation-protective).
### Revenue potential: AED 1–5 M / yr Y5 (insurance partnership share + contractor commission on rebuilds).
### Implementation complexity: medium — 6 engineer-weeks + partnership BD.
### Dependencies: §12 Insurance, §21 Contractors, §26 Brands (for replacement appliances).
### Comparable: Lemonade (US insurtech claims automation), Matterport / Hover (damage assessment), emergency-response apps (few mature examples in UAE).

---

## §9 Estate planning branch (new section — pure gap)

### Current state

**No section.** §25 Private Structures covers Family Office, Holding Company, SPV, Foundation — the corporate-vehicle layer. Nothing on wills, succession, inheritance tax, generational transfer.

### Gap

For UAE HNWI buyers, estate planning around UAE property is a major unserved need. The legal landscape:

- **Default:** UAE follows Sharia law for inheritance. Non-Muslim expats have options since 2022 (Federal Decree-Law 41/2022 on Civil Personal Status).
- **Non-Muslim options:** register a Will with DIFC Wills Service (common-law principles, complete testamentary freedom, English-language probate via DIFC Courts), Abu Dhabi Judicial Department (ADJD — accepts both Muslim and non-Muslim), or Dubai Courts (through Notary Public, AED 2 020 fee).
- **Muslim expats:** can register a Sharia-compliant Will via Notary Public / DIFC Wills Service, but distribution follows Sharia shares.
- **Critical gap for non-Muslim expats:** If they die intestate, their UAE property defaults to *waqf* (charitable endowment) if no legally identifiable heirs, or to Sharia distribution otherwise. Most foreign HNWI do not know this.

### Proposed new section — "§25.X Estate & succession planning":

- **§25.X.1 Will registration advisory** — guided walkthrough: are you Muslim or non-Muslim? UAE national or expat? Which registration venue (DIFC Wills Service / ADJD / Notary Public)? Refer to registered advocates for drafting (AED 2–10 k / will).
- **§25.X.2 Beneficiary mapping per parcel** — owner's dashboard shows each owned parcel with assigned beneficiary from the Will; updates as Will is updated.
- **§25.X.3 Inheritance-tax-free structuring** — UAE has no inheritance tax today, but home country tax (US estate tax, UK IHT, Indian LRS) may apply. Refer to specialised international estate counsel.
- **§25.X.4 Digital asset succession.** For tokenised ZAAHI holdings (§35), Open Zaahi wallet (§43), NFT certificates — beneficiary-designated smart-contract succession. Novel category; patent candidate.
- **§25.X.5 Generational wealth transfer** — structured-gift, SPV migration, foundation establishment. Heavy advisory; high-margin.
- **§25.X.6 Executor / trustee services** — partner with DIFC-licensed trust companies for post-mortem estate administration.

### Priority: **P2** (slow-burn revenue, but high-margin and sticky; differentiating for HNWI segment).
### Revenue potential: AED 3–10 M / yr Y5 (will-drafting referrals + ongoing trust advisory + digital-succession tokenisation adjacent).
### Implementation complexity: medium software, high content. 8 engineer-weeks + heavy legal content production + advisor partnerships.
### Dependencies: §25 Private Structures, §62 Legal Engine.
### Comparable: Kaanun, iWillWrite (online will drafting), DIFC Wills Service itself, international private-client law firms (Charles Russell Speechlys, Withers).

---

## §10 Explicit Journey Maps (meta-section)

### Current state

Journeys are implicit. A reader of the Master Tree can, in principle, assemble the 6-phase developer journey or the 4-phase buyer journey by mentally stitching sections from Blocks A–L. In practice, nobody does this — the Master Tree reads as a functional taxonomy (what the platform does), not an experiential narrative (what the user goes through).

### Gap

For investor pitches, partner onboarding, internal product planning, and user research — an **explicit journey map** per user archetype is enormously valuable. It forces the team to answer: which sections does this user encounter in which order? What fraction of sections are LIVE for this user today? What's the most-friction step?

### Proposed — "docs/journeys/" directory with one document per journey:

1. **Developer journey** (24-month, 6 phases):
    1. Land acquisition (§01 + §24 Gov Bodies + §22 Banks + §27 Consultants)
    2. Design & approvals (§20 Architects + §24 Gov + §62 Legal)
    3. Construction (§58 Pipeline + §21 Contractors + §46 Robotics + §44 IoT)
    4. Sales launch (§08 Off-Plan + §19 Developers + §17 Brokers + §47 Notifications)
    5. Handover (§31 Deal Engine + §24 DLD + §60 Brand Integration)
    6. Post-handover (§13 PM + §11 Rental + §12 Insurance)

2. **Investor journey** (4 phases):
    1. Discovery (§15 Buyers + §39 Metaverse + §45 Satellite + §66 Market Intel + §67 Price Prediction)
    2. Due diligence (§01 Land + §06 Infra + §07 Mixed-Use + §23 Legal + §27 Consultants + §68 Risk)
    3. Transaction (§31 Deal + §32 Escrow + §33 JV + §34 Fractional + §35 Tokenisation + §62 Legal)
    4. Exit (§01 Land listing + §11 Rental yield + §34 Fractional secondary + §36 Auction)

3. **Owner journey** (5 phases):
    1. Purchase (§15 + §31 + §22 Banks + §12 Insurance)
    2. Hold (§14 Owners + §66 Market Intel + §12 Insurance + §13 PM)
    3. Improve (§20 Architects + §21 Contractors + §26 Brands + §60 Brand Integration)
    4. Monetise (§11 Rental + §34 Fractional)
    5. Exit (§01 list + §17 Broker + §31 Deal + §36 Auction)

4. **Tenant journey** (4 phases):
    1. Search (§15 + §11 Rental + §48 Search)
    2. Lease (§11 Ejari + §62 Legal + §32 Escrow for deposit)
    3. Live (§13 PM + §44 IoT + §75 Support)
    4. Exit or renew (§11 Rental management + §13 PM + §15 for next search)

5. **Broker journey** (3 phases × lifecycle):
    1. Onboard (§17 + §18 + §76 + §72 Education + §72 Certification)
    2. Operate (§17 CRM + §15 leads + §20 listing prep + §31 Deal + §47 Notifications + §66 Market Intel)
    3. Grow (§18 Ambassador downline + §66 quarterly reports + §72 continuing education)

Each journey document: phases × sections-touched × LIVE-status × friction-points × upsell-opportunities.

### Priority: **P1** (cheap, pure-documentation lift; useful for every investor / partner / employee / product meeting).
### Revenue potential: indirect — sharpens product planning (fewer wasted sprints), improves Pitch Deck Slide 7.
### Implementation complexity: low. 2–3 engineer-days per journey document. ~1 week total.
### Dependencies: none.
### Comparable: Stripe's user-journey documentation is widely cited as best-in-class.

---

## Ranking — Top 5 proposed new / expanded branches by revenue

| Rank | Proposal | Y5 Revenue Potential | Priority | Effort |
|:-:|---|---:|:-:|---|
| **1** | §5 After-sale / Property Management expansion | AED 15–40 M / yr | **P1** | 30+ eng-weeks + 2–3 BD |
| **2** | §7 Cross-border branch (mortgage + FX + estate) | AED 10–25 M / yr | **P1** | 15 eng-weeks + BD |
| **3** | §3 Education (ZAAHI Academy) | AED 10–20 M / yr | P2 | Low software, high content |
| **4** | §6 Secondary / Distressed consolidation | AED 5–20 M / yr | P2 | Medium (editorial + partnership) |
| **5** | §2 ESG / Sustainability expansion | AED 5–15 M / yr | P2 | 10 eng-weeks + data science |

Top 5 cumulative: **AED 45–120 M / yr Y5** revenue opportunity, on top of the existing Master Tree's 21 streams. This is meaningful — it's ~50–100 % of the Platform Y10 revenue target in the investor package.

---

## Ranking — proposed additions by implementation priority (all 10)

P1 = ship as v3.1 expansion during Y1:
- §5 After-sale / PM expansion (highest ROI).
- §7 Cross-border (Dymo's HNWI pipeline).
- §1 Risk Management sub-sections (IPO due diligence table stakes).
- §10 Explicit journey maps (cheap lift, high clarity value).

P2 = ship as v3.1 during Y2:
- §2 ESG expansion.
- §3 Education / ZAAHI Academy.
- §6 Secondary / Distressed consolidation.
- §8 Disaster / Emergency.
- §9 Estate planning.

P3 = Y3+:
- §4 Community deepening (slow-burn brand).

---

## What was explicitly considered and *not* added to this list

- **"Affordable housing" branch.** Important for UAE policy but outside the AED 30 M+ premium / HNWI segment ZAAHI Agency targets. Consider in Y3+ if Saudi / Ukraine expansion goes mass-market.
- **"Sports / entertainment venues" branch.** Niche; covered under §07 Mixed-Use Components (Full Community) and §05 Hospitality. No dedicated branch warranted.
- **"Agricultural / farm" branch.** Covered under §01 Land Use (Agricultural / Farm category). UAE agricultural real estate is small segment; not a gap.
- **"Infrastructure-as-asset" branch** (beyond §06). Airports, roads, bridges as tradable assets — too specialised for ZAAHI's current scope.
- **"Government asset management" branch.** Public property management for UAE government — interesting B2G opportunity but multi-year BD cycle.

These are *not gaps* — they are scope-exclusion calls.

---

## Sources

- [UAE Inheritance Law (Federal Decree-Law 41/2022 on Civil Personal Status)](https://www.uaeexperthub.com/sharia-law-property-inheritance-uae/)
- [DIFC Wills Service overview](https://elnaggarlegal.com/journal/difc-wills-in-dubai)
- [Estate planning for non-Muslims UAE — Withers Worldwide](https://www.withersworldwide.com/en-gb/insight/read/estate-planning-for-non-muslims-and-residents-in-the-uae)
- [UAE inheritance law 2026 guide](https://alkabban.com/news/uae-law-expat-assets-no-heirs-charity-2026/)
- [Master Tree v3 (`docs/architecture/MASTER_TREE_final.md`)](../architecture/MASTER_TREE_final.md) — canonical reference
- `docs/research/COMPETITOR_DEEP_DIVE_2026.md` — Allsopp $77.8 M secondary-market revenue benchmark; Huspy 25–30 % UAE mortgage share

---

**End of MASTER_TREE_MISSING_BRANCHES.md.** For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com`.
