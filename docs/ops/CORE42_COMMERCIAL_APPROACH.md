# Core42 Commercial Approach — 60-min discovery kit · ready to execute on SV-14 ratification

**Status:** READY TO EXECUTE v1.0 · 2026-04-22
**Classification:** CONFIDENTIAL — commercial playbook
**Parent:** `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` v1.0 (commit `d4a3df3` — target-stack mapping + 10 open questions)
**Ratification trigger:** `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.3 SV-14 D-50 unanimous ratification (Zhan + Dymo + Rudi per §9.4)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Prepared by:** Agent · Opus 4.7 · 2026-04-22
**Prepared for:** Dymo Tsvyk (commercial lead) · Zhan Ryspayev (technical lead · joins discovery call at T+15min)
**Preserves:** all canonical docs · no `src/**` touch · no external communications sent by agent (founder executes).

---

## §0 Purpose + scope

This document is a **ready-to-execute commercial playbook** that Dymo activates **within hours of SV-14 ratification** at Sunday Rudi call. No guessing · no prep work · just follow the kit.

Contents:
- §1 Contact strategy (3 channels · templates).
- §2 ZAAHI 1-pager (attachable to outreach).
- §3 Discovery call agenda (60-minute structured run-of-show).
- §4 The 10 questions to ask (from §78 §3.5 · expanded with red/green flag criteria).
- §5 RFQ requirements document template (what Core42 sales will ask for · pre-written).
- §6 Commercial negotiation cheatsheet (Azure-sovereign pricing patterns).
- §7 Ask-Rudi-first checklist (pre-outreach alignment).
- §8 Success criteria for the call.
- §9 Red flags (when to pivot).
- §10 Post-call action template.

**Execution readiness:** this document makes the agent's knowledge portable · if Dymo calls Core42 without Zhan available, the kit covers 95% of the conversation.

---

## §1 Contact strategy

### §1.1 Primary channel: Core42 web form + LinkedIn corporate outreach

**Verified as of 2026-04-22 (web-checked):**
- **Core42 Contact page:** `https://www.core42.ai/contact-us` — uses "Speak to an Expert" form widget · no public direct sales email published.
- **Core42 LinkedIn:** `https://www.linkedin.com/company/core42ai` — active corporate page · inbox reachable by connected members.
- **G42 parent contact:** `https://www.g42.ai/contact` — fallback route via parent company.
- **Core42 AI Cloud self-service portal:** `https://aicloud.core42.ai/` — different channel for pay-as-you-go AI inference · NOT the enterprise channel we want.

**Important:** agent did **not** find a public direct enterprise-sales email like `sales@core42.ai` or `enterprise@core42.ai` on the Core42 website. Outreach goes through the web form + LinkedIn messaging · NOT cold email.

**Recommended primary sequence:**
1. **Fill the "Speak to an Expert" form at `core42.ai/contact-us`** with the Dymo-written opener (see §1.4) — triggers their sales triage.
2. **LinkedIn outbound:** Dymo sends corporate-page DM + connection requests to named decision-makers identified via LinkedIn people-search (see §1.2).
3. **Parallel parent-company route:** G42.ai/contact form for visibility · lower priority but broad catch.

**Timing expectation for Core42 response:**
- Enterprise sales web-form triage typically: 24-48 hours to first response · 5-7 business days to scheduled discovery call.
- LinkedIn DM from a founder (Dymo's profile + Rudi backing) typically: 24-72 hours if decision-maker reached directly.

### §1.2 LinkedIn people-search — named roles to target

**DO NOT name individuals without web-verifying current status at the time of outreach.** Roles drift, people change jobs. Agent identified these role types via public web indicators (RocketReach, LinkedIn) but founder should re-verify before messaging:

**Likely target roles at Core42 (UAE / MENA):**
- **Enterprise Account Executive — UAE / GCC.** Quota-carrying sales rep · handles net-new Enterprise logos.
- **Director or Head — Sovereign Cloud MENA.** Product/commercial lead for sovereign cloud offering.
- **VP — Business Development** (confirmed public role exists at Core42 · role-level only · agent has not verified current holder).
- **VP — Alliances and Indirect Sales** (confirmed public role exists).
- **Regional Sales Director — Middle East.** Territory head.

**LinkedIn people-search query Dymo runs:**
```
site:linkedin.com/in "Core42" (sales OR "business development" OR enterprise OR sovereign) UAE
```

**Before messaging any individual:**
- Confirm current employment on their LinkedIn profile (headline should say Core42).
- Confirm role aligns (Sales / BD / Sovereign Cloud · NOT engineering / marketing / HR).
- Confirm location (UAE / Abu Dhabi / Dubai preferred · remote OK if MENA region).

### §1.3 Secondary channel: warm intro via Rudi's network

**Activation trigger:** primary channel no response after 5 business days.

**Rudi brief for activation:**
- ZAAHI exploring G42 Core42 as primary UAE sovereign cloud vendor.
- Need introduction to Core42 enterprise sales leadership.
- Direct outreach sent but no response · warm intro would accelerate.
- Rudi's UAE institutional network likely touches Mubadala / G42 leadership · one degree of separation to Core42 commercial side.

**Ask Rudi for:** 1-line introduction email OR LinkedIn connection bridge · not a heavy lift.

### §1.4 LinkedIn outreach template (Dymo — 2 paragraphs max)

```
Subject: UAE real estate platform → Core42 Sovereign Cloud — exploring partnership

Hi [Name],

I'm Dymo Tsvyk, co-founder of ZAAHI — a UAE-sovereign real estate operating 
system built on Next.js + PostgreSQL, currently live at zaahi.io with 114 
parcels under management and institutional backing (AED 1M committed from 
board investor). We're preparing a migration from Vercel + Supabase Frankfurt 
to sovereign UAE infrastructure ahead of our Phase 2 external-tenant launch 
in Q1 2027.

Core42's sovereign cloud positioning — Central Bank partnership, Abu Dhabi 
government scale, Azure feature parity — maps directly to our ICP 
(mid-tier UAE brokerages, government counterparties, sovereign-wealth LPs). 
Could we schedule a 60-minute discovery call to discuss service catalog, 
indicative pricing for our workload profile (100 DAU, 5GB storage, managed 
Postgres + Container Apps + Azure AD B2C), and POC provisioning timeline? 
Happy to send a technical brief ahead of the call.

Best,
Dymo Tsvyk
Co-founder, ZAAHI
d.tsvyk@gmail.com · +971-XXX (redacted · Dymo inserts)
```

**Usage notes:**
- Keep to 2 paragraphs · Core42 sales will skim.
- Lead with credibility (live product + institutional backing) not aspiration.
- End with specific ask (60-min discovery · technical brief attached) not open-ended.
- Attach: ZAAHI 1-pager from §2 (PDF · co-sign by Zhan for technical credibility).

### §1.5 Email outreach template (Zhan — longer · technical depth)

**When to use:** if Core42 sales asks for technical detail before scheduling call, OR if web form response asks for RFQ.

```
Subject: ZAAHI Platform — Core42 Sovereign Cloud Discovery Request

Hi [Core42 Sales Contact],

Following Dymo's LinkedIn outreach, attaching our technical brief for your 
pre-call review.

ZAAHI is a UAE-first real estate operating system:
- Live production at zaahi.io: 114 parcels, Archibald AI assistant, 
  Ambassador network program, Deal Engine state machine.
- Stack: Next.js 15, React 19, Prisma 7.7 ORM, PostgreSQL 16, Supabase Auth, 
  Anthropic Claude Sonnet 4.6 for Archibald.
- Current hosting: Vercel (US, Delaware C-corp) + Supabase Frankfurt 
  (EU, US parent). Migration target: UAE sovereign infrastructure.
- Institutional backing: Rudi Belin, AED 1M committed, board position.

Phase 1 (now → Month 9 / Jan 2027): platform completion to owner-first 
perfection on current stack. Agency Y1 revenue AED 7.8M.

Phase 2 (Month 10 onward / Jan 2027+): external-tenant launch. First 
Enterprise tier deployments require dedicated sovereign subscriptions 
per §77 architecture. G42 Core42 is our primary vendor target per SV-14 
sovereignty decision.

Specific asks for discovery call:
1. Azure Database for PostgreSQL Flex Server availability at Abu Dhabi 
   sovereign region.
2. Azure Container Apps vs App Service vs AKS recommendation for 
   Next.js 15 production at our scale.
3. Indicative monthly pricing: 100 DAU, 5GB storage, 50M Claude tokens/mo 
   via Compass (if applicable Phase 2), Burstable B2s Postgres + replica, 
   Container App 2 vCPU 4 GB min 1 max 3 replicas, Blob hot tier 150MB, 
   Azure AD B2C 500 MAU, Front Door Premium.
4. Azure AD B2C or External ID availability in sovereign tier.
5. Supabase → Azure PostgreSQL migration tooling support (Azure DMS?).
6. POC phase structure: cost, duration, conversion to production contract.
7. Data Processing Agreement template (PDPL 45/2021 three-party: 
   Data Controller tenant / Data Processor ZAAHI / Sub-Processor Core42).
8. ISO 27001 / 27017 / 27018 / 27701 + SOC 2 Type II formal certificate 
   references for UAE institutional-investor data-room.
9. Cross-border routing for Phase 2 Saudi expansion (Q2 2027): Riyadh 
   region availability, stc Cloud peering, ExpressRoute cost.
10. Core42 AI Cloud / Compass access for Phase 3 ZAAHI-RE-v1 fine-tune 
    (7B/13B on A100).

Additional context:
- Sovereignty rationale: we are building for PDPL 45/2021 aligned real 
  estate data + UAE Central Bank-adjacent workflows (regulated real estate 
  transactions, commission ledgers, RERA broker compliance).
- Commercial flexibility: willing to consider 3-year committed-spend 
  agreement for preferred pricing. Annual prepayment option preferred.
- Technical flexibility: we are Linux / Node.js / containerized. Azure 
  feature parity with public cloud is our primary concern · sovereign-tier 
  delta acceptable.

Proposed next steps:
- 60-minute discovery call within the next two weeks.
- Technical deep-dive with engineering reference architecture, pricing 
  indication, DPA template.

Attachments: ZAAHI Platform 1-pager (PDF).

Best,
Zharkyn (Zhan) Ryspayev
Founder, CEO, CTO — ZAAHI
zhanrysbayev@gmail.com · +971-XXX (redacted)
```

---

## §2 ZAAHI 1-pager for Core42 (pre-written · attachable PDF)

**Structure: single PDF, tight formatting, A4 landscape, Georgia serif headers per CLAUDE.md UI style guide.**

```
═══════════════════════════════════════════════════════════════════
ZAAHI — UAE SOVEREIGN REAL ESTATE OPERATING SYSTEM
═══════════════════════════════════════════════════════════════════

ONE-LINER
───────────────────────────────────────────────────────────────────
UAE-sovereign real estate platform · parcel intelligence · 
AI-powered deal engine · Ambassador network · Archibald AI assistant.

FOUNDERS & BACKING
───────────────────────────────────────────────────────────────────
Founder · CEO · CTO:    Zharkyn (Zhan) Ryspayev
                        17 years real estate · full-stack engineer · 
                        sole platform architect.

Co-founder · Ambassador · Guardian Partner:
                        Dmytro (Dymo) Tsvyk
                        18+ years global operations (Stolt-Nielsen, 
                        Bahri) · Dubai real estate since 2018 · 
                        partner Equilibrium Advisory Group.

Principal Investor · Board:
                        Rudi Belin
                        AED 1M committed (wire pending 2026-05-08).
                        Board position · strategic advisor · 
                        UAE institutional network.

CURRENT STATE (Apr 2026)
───────────────────────────────────────────────────────────────────
Production domain:      zaahi.io (Vercel · auto-deploy from main)
Parcels under management: 114 (Dubai Mainland · DLD-integrated)
Live features:          Deal Engine (5-state machine) · Feasibility 
                        Calculator v2 · Archibald AI · Ambassador 
                        tier system · 3D parcel buildings 
                        (ZAAHI Signature)
Admin panel:            MVP v1 + Super-Admin mode v2 (Spec 03)
Agency Y1 revenue:      AED 7.8M target (Dymo pipeline)

TECHNOLOGY STACK
───────────────────────────────────────────────────────────────────
Runtime:                Next.js 15 · React 19 · TypeScript 5
Database:               PostgreSQL 16 via Prisma 7.7 ORM
                        (currently Supabase Frankfurt · 19 models · 
                        13 migrations · ~15 MB OLTP footprint)
Auth:                   Supabase Auth (email + password + Google 
                        OAuth · admin-approval gated · migration to 
                        Azure AD B2C planned per Spec 05)
Object storage:         Supabase Storage → migration target 
                        Azure Blob Storage
AI inference:           Anthropic Claude Sonnet 4.6 (Archibald 
                        assistant) · Mistral Large 2 fallback 
                        (SV-4 provider abstraction)
CDN / edge:             Vercel Edge + Cloudflare → migration target 
                        Azure Front Door sovereign
3D rendering:           MapLibre GL + PMTiles (556k plots) · 
                        Three.js + R3F for ZAAHI Signature buildings
PDF generation:         jsPDF v4.2.1 client-side

WHY WE WANT CORE42
───────────────────────────────────────────────────────────────────
1. Sovereignty positioning — UAE government MOU conversations 
   (DLD, RERA, TAMM, ADGM) negotiate from stronger position when 
   data lives in Abu Dhabi vs Frankfurt.
2. PDPL 45/2021 alignment — Core42 explicitly markets PDPL 
   compliance · tenant / processor / sub-processor DPA model.
3. Latency — Dubai→Abu Dhabi <10ms vs Dubai→Frankfurt ~120ms. 
   Metaverse (3D interactivity) UX improves materially.
4. Institutional trust — UAE Central Bank partnership 2026-02 
   (Sovereign Financial Cloud) signals regulatory readiness for 
   real estate (banking-adjacent domain).
5. Stargate UAE alignment — Phase 3 Own AI 2027 roadmap needs 
   affordable training GPU · Core42 AI Cloud / Compass pipeline.
6. Microsoft underwriting — $1.5B direct investment + $15.2B 
   UAE plan = continuity confidence for 5-year commitment.

WHAT WE BRING TO CORE42
───────────────────────────────────────────────────────────────────
Reference UAE real estate tenant:
  First Core42 tenant in UAE real estate vertical · case study 
  for PDPL-aligned regulated-adjacent data handling · aligns with 
  Core42's government-services lineage.

Phase 2 SaaS multi-tenant expansion (Month 10+):
  White-label platform for UAE mid-tier brokerages · each 
  Enterprise tier = dedicated Core42 sovereign subscription per 
  §77 architecture D-14. Projected 3-5 Enterprise tenants Y2.

Ambassador network reach:
  Paid-tier ambassador program (Silver AED 1k · Gold AED 5k · 
  Platinum AED 15k) · distributed lead generation · each Phase 2 
  tenant inherits ambassador infrastructure.

Multi-year revenue trajectory:
  Y1 Agency AED 7.8M · Y5 Platform AED 60M · Y10 vision AED 800M 
  per investor package financial model.

INITIAL COMMITMENT SCOPE
───────────────────────────────────────────────────────────────────
Phase 1 (now → Month 9 / Dec 2026):
  POC tenant (Month 3-4) · spec preparation (Month 4-6) · 
  staging on Core42 (Month 7-8) · production cutover (Month 9).

Phase 2 (Month 10 / Jan 2027 →):
  First Enterprise tenant dedicated subscription.
  Scaling with external broker pilots (3-5 Y2 tenants).
  Phase 2 opening Mon 2027-01-18 default.

Long-term (Y3-Y5):
  Core42 AI Cloud for ZAAHI-RE-v1 fine-tune (Q1 2027).
  Multi-region expansion (Saudi Q2 2027 · CIS 2028+).
  Phase 3 tokenization integration (VARA-live).

REVENUE TRAJECTORY
───────────────────────────────────────────────────────────────────
Y1 2026: AED 7.8M Agency  | Platform: AED 50-100k pilot
Y2 2027: AED 15M Agency   | Platform: AED 500k-1M (first tenants)
Y3 2028: AED 30M Agency   | Platform: AED 3-5M
Y5 2030: AED 60M Platform (primary) + AED 30M Agency
Y10 2035: AED 800M Platform vision

G42 SPEND FORECAST:
Y1 AED 160-200k (3-4% Platform Dev Fund)
Y2 AED 200k recurring
Y5 AED 600k at scale
→ growing 3-4x by Y5 · reserved tier pricing preferred

COMPLIANCE STANCE
───────────────────────────────────────────────────────────────────
PDPL FDL 45/2021:       tenant = Data Controller · ZAAHI = 
                        Data Processor · Core42 = Sub-Processor.
                        DPA three-party model required.
VARA:                   awaiting licence · Phase 3 decision.
FATF / AML FDL 10/2025: existing compliance playbook (Spec 03 
                        v2.0 §14 Super-Admin guardrails).
FTA CT FDL 47/2022:     Y1 corporate tax filing Q2 2027.
VAT FDL 8/2017:         ZAAHI TRN registered · Tax Invoice 
                        pipeline live (Spec 02 v1.1).

CONTACT
───────────────────────────────────────────────────────────────────
Commercial:   Dmytro (Dymo) Tsvyk   d.tsvyk@gmail.com
Technical:    Zharkyn (Zhan) Ryspayev  zhanrysbayev@gmail.com
Web:          zaahi.io
═══════════════════════════════════════════════════════════════════
```

**Production note:** Zhan produces this as a PDF via Canva / Pages / LaTeX once ratification lands. 1-2 hours work. Attach to all outreach.

---

## §3 Discovery call agenda (60-minute structured run-of-show)

**Pre-call setup:**
- Dymo joins 5 minutes early · tests audio · confirms recording consent with Core42 (record for Zhan review if unable to attend live).
- Zhan joins at T+15min (technical phase) · Dymo handles intro + commercial phase.
- Rudi dial-in optional · agent recommends no (Dymo/Zhan can summarize for Rudi after).

### §3.1 T-0 to T+5 minutes: introductions + ZAAHI 2-minute pitch (Dymo leads)

**Dymo delivers:**
- Brief greeting · confirm agenda · ask if they've seen the 1-pager.
- 2-minute ZAAHI pitch:
  - "ZAAHI is a UAE-sovereign real estate operating system. Live at zaahi.io with 114 parcels, AI assistant, Ambassador network. Institutional backing AED 1M."
  - "Phase 1 through Month 9 2026 is platform completion. Phase 2 from Jan 2027 is external tenant launch — we're evaluating primary sovereign cloud vendors now."
  - "Core42 is our top candidate. 60 minutes today — service catalog, pricing direction, POC path, DPA. Decision framework: we want a 3-5 year partnership."

### §3.2 T+5 to T+15 minutes: Core42 service catalog walkthrough (Core42 leads)

**Listen for:**
- Which Azure services ARE available in Abu Dhabi sovereign region (not just "Azure" generally).
- Sovereign-controls platform (Insight) feature set.
- Core42-specific offerings on top of Azure (Compass AI, AI Cloud GPU).
- Reference customers in regulated sectors (name-drop anonymized if possible).

**Dymo questions during this phase (don't interrupt — save to end):**
- "What's the availability matrix at Abu Dhabi sovereign region specifically for our stack: PostgreSQL Flex, Container Apps, B2C, Blob, Front Door, Key Vault?"
- "What's included in the Insight sovereign-controls layer that isn't in Azure public cloud?"

### §3.3 T+15 to T+30 minutes: our use case · workload scale · compliance needs (Zhan joins · technical lead)

**Zhan presents:**
- Current zaahi.io stack (1-pager Technology Stack section).
- Data volumes (~15MB OLTP + ~150MB objects).
- Compliance requirements (PDPL · DLD proximity · Central Bank adjacency).
- Phase 2 tenantization model (§77 ARCHITECTURE hybrid multi-tenancy · Enterprise = dedicated subscription).
- Migration approach (Option A big-bang · tiny data · pre-external-launch window).

**Core42 questions expected:**
- "What's your current latency budget?"
- "How many concurrent users at peak?"
- "Archibald AI load pattern — what's the inference volume?"
- "Which Azure SDK versions are you using today?"

### §3.4 T+30 to T+45 minutes: commercial structure (Dymo + Zhan · sales lead)

**Discussion topics:**
- Indicative pricing for Phase 1 workload profile (§2 1-pager Revenue Trajectory).
- POC terms (free · credit · hourly-billed · duration).
- Reserved / committed-spend discount tiers (1-year vs 3-year).
- Annual prepayment vs monthly billing.
- Production SLA at sovereign tier (99.95% vs 99.99%).
- Multi-tenant subscription model (Enterprise dedicated · Starter/Pro shared).
- Dev/test environment billing separation.
- Data transfer egress charges.

**Dymo negotiation approach:**
- Start with "what's typical for a customer at our scale?" — avoid first-offer anchor.
- Reference: Y5 AED 600k trajectory = credible committed-spend signal.
- Red flag: Core42 quotes >AED 500k/yr Phase 1. Pivot per §9.

### §3.5 T+45 to T+55 minutes: migration path (Zhan leads)

**Discussion topics:**
- Supabase → Azure PostgreSQL tooling (Azure DMS · custom ETL · manual `pg_dump`).
- Azure AD B2C provisioning timeline (custom policies · Google federation · hours vs days vs weeks).
- Network readiness (ExpressRoute availability vs public internet · DNS flip · TTL pre-lowering).
- Managed Identity integration for Container App → Key Vault.
- POC provisioning timeline (order → live tenant: days vs weeks).
- DPA signing process (2-4 weeks typical · any blockers at Core42 side).

### §3.6 T+55 to T+60 minutes: next steps (Dymo closes)

**Wrap-up:**
- Confirm named point of contact at Core42 (email + phone).
- Agree on deliverables:
  - Core42 sends: proposal / pricing letter / reference architecture (7-14 day SLA).
  - ZAAHI sends: formal RFQ per §5 (same-day if call goes well).
- Schedule follow-up call (proposal review · 30-60 min · week of [TBD]).
- Exchange DPA draft for legal review.
- Agree on POC timing (Month 3-4 target).

**Dymo closing ask:**
"If today's conversation aligns on pricing and availability, we want to move to POC provisioning within 30 days and production cutover Month 9-10. Is that timeline realistic from your side?"

---

## §4 The 10 questions to ask (expanded from §78 §3.5)

### Q1: Azure Database for PostgreSQL Flex Server availability at Abu Dhabi sovereign region

**Ask:** "Is Azure Database for PostgreSQL Flex Server available in your Abu Dhabi sovereign region today? Specifically: Burstable B1ms / B2s / B4ms tiers for dev/staging, and General Purpose tiers for production. What PostgreSQL versions are supported — 15, 16?"

**Why it matters:** our primary OLTP database · we need Postgres 16 · B2s tier initial scale · cannot use Cosmos DB.

**Green-flag answer:** "Yes, all tiers available, Postgres 15 and 16 supported, including HA and replica options."

**Red-flag answer:** "We only support Postgres 13 at sovereign tier" OR "Flex Server not yet in sovereign region, only Single Server legacy."

**Fallback if unacceptable:** evaluate self-hosted Postgres on Azure VMs in Abu Dhabi region · more ops burden · +2 engineer-weeks migration effort.

### Q2: Azure Container Apps vs App Service vs AKS for Next.js 15

**Ask:** "For a Next.js 15 production workload — Dockerfile-based deploy, 2 vCPU / 4 GB RAM minimum, min 1 max 3 replicas, horizontal scaling — what's your recommendation: Container Apps, App Service, or AKS? Reference architecture if available."

**Why it matters:** deploy pipeline decision · Vercel-era `main` auto-deploy pattern needs equivalent.

**Green-flag answer:** "Container Apps is the standard recommendation for your profile — scale-to-zero, native Dockerfile, lower ops than AKS. We have reference architectures."

**Red-flag answer:** "Only AKS is supported at sovereign tier" (higher ops burden · +1 engineer-week learning curve).

**Fallback if unacceptable:** AKS viable but expensive in ops time · or App Service (less flexible but managed).

### Q3: Indicative pricing for 100 DAU · 5GB storage · 50M tokens/month profile

**Ask:** "Can you give an indicative monthly price for:
- Azure PostgreSQL Burstable B2s + B1ms replica
- Container App 2 vCPU / 4 GB min 1 max 3 replicas
- Blob Storage hot tier 200 GB + egress 1 TB
- Azure AD B2C 500 MAU
- Azure Front Door Premium
- Key Vault Premium tier
- Azure Monitor + Application Insights
- Standard Core42 support
Total AED/month at Phase 1 scale?"

**Why it matters:** fits into our AED 160-200k Y1 budget · AED 200k Y2 recurring · AED 600k Y5.

**Green-flag answer:** "Indicative ~AED 15-25k/month at that scale" — fits budget with headroom.

**Red-flag answer:** ">AED 40k/month just for compute + DB" — exceeds budget at Phase 1 scale.

**Fallback if unacceptable:** negotiate 3-year committed-spend (typical 20-40% discount) · OR pivot to du Datamena / Injazat as alternative UAE sovereign vendor.

### Q4: Azure AD B2C sovereign tier availability

**Ask:** "Is Azure AD B2C available in your sovereign cloud tier? Or is it only available as a global Azure service? We need identity management for external users (Phase 2 tenant external-user base) at Abu Dhabi-resident region."

**Why it matters:** Spec 05 Auth Abstraction ship-stopper resolver · AzureAdB2CAdapter is our primary migration target.

**Green-flag answer:** "Yes, B2C is available in sovereign tier with full feature set including custom policies and Google federation."

**Red-flag answer:** "B2C is global-only · sovereign equivalent is Azure External ID which is still GA'ing" (blocks Spec 05 primary adapter).

**Fallback if unacceptable:** implement `KeycloakAdapter` per Spec 05 §2.3 · self-host Keycloak on sovereign tier · +2 engineer-weeks ops burden.

### Q5: Blob Storage Abu Dhabi region pricing + API parity

**Ask:** "Blob Storage at Abu Dhabi sovereign region — confirm S3-compatible API endpoints, Managed Identity authentication support, hot/cool/archive tier pricing, zone-redundant storage (ZRS) availability."

**Why it matters:** our `src/lib/storage.ts` abstraction expects S3-like signed URL pattern · ZRS for durability.

**Green-flag answer:** "Full Azure Blob parity · S3-compatible endpoints via Blob REST API · Managed Identity via Azure RBAC · ZRS available."

**Red-flag answer:** "Only LRS (single-AZ) at sovereign · no ZRS yet" (durability concern but acceptable) OR "only REST API, no S3 compat" (more migration work).

**Fallback if unacceptable:** minor · we can tolerate LRS + rewrite Blob API adapter (~3 days).

### Q6: ISO/SOC specific certificate IDs

**Ask:** "For our UAE institutional-investor data-room (Series A preparation), we need formal certificate references. Can you share current ISO 27001, 27017, 27018, 27701, and SOC 2 Type II certificate IDs and their validity dates? Ideally via your compliance team email directly."

**Why it matters:** Series A diligence · Rudi Board expectation · PDPL third-party auditor references.

**Green-flag answer:** "Yes, our compliance team will share under NDA. Full Azure certificate stack inherited + Core42 Insight has its own SOC 2."

**Red-flag answer:** "We're still in audit for SOC 2" OR "Certificates aren't shared pre-contract" (blocks data-room readiness).

**Fallback if unacceptable:** request NDA + certificates at contract-signing stage · OR cite parent G42 / Microsoft Azure certificates as proxy.

### Q7: Cross-border routing Saudi (Phase 2 Q2 2027)

**Ask:** "Phase 2 expansion targets Saudi Arabia Q2 2027. Options: (a) deploy separate Core42 tenant at Saudi sovereign region if you have one, (b) peer to stc Cloud, (c) ExpressRoute from Abu Dhabi to Saudi. What's your recommendation for our cross-border pattern?"

**Why it matters:** Phase 2 expansion path · affects Saudi GTM decision.

**Green-flag answer:** "We have Saudi partnership with [local vendor] · or Core42 is opening Riyadh region in 2027" OR "ExpressRoute is the standard pattern."

**Red-flag answer:** "We only serve UAE · Saudi workloads go through US-regions" (defeats sovereignty).

**Fallback if unacceptable:** direct stc Cloud or Oracle Saudi Cloud engagement for Phase 2 Saudi tenant.

### Q8: Supabase → Azure PostgreSQL migration tooling

**Ask:** "Does Azure Database Migration Service (DMS) support Supabase as a source connector? Or is it standard `pg_dump` / `pg_restore` via public internet? Does Core42 offer migration assistance services?"

**Why it matters:** Month 5-6 dump-and-load rehearsal · Month 9 cutover execution.

**Green-flag answer:** "DMS supports any Postgres source · we have migration consultants at Core42 Professional Services who've done similar migrations."

**Red-flag answer:** "Azure DMS is preview-only at sovereign · manual migration required" (adds risk · longer rehearsal).

**Fallback if unacceptable:** manual `pg_dump` + `pg_restore` over public internet · acceptable given small data size · Month 5-6 rehearsal per §78 §8.2.

### Q9: Data-in-transit cutover path

**Ask:** "During our Frankfurt→Abu Dhabi cutover, data-in-transit (~165 MB total · Postgres dump + Blob objects) — does it go over public internet with TLS only, or can we use ExpressRoute for higher assurance? What's the one-time ExpressRoute setup cost if applicable?"

**Why it matters:** one-time PII-in-transit exposure window · compliance posture.

**Green-flag answer:** "For 165 MB, public internet TLS is adequate · ExpressRoute is overkill for one-time migration · recommend encrypt at rest + TLS in transit."

**Red-flag answer:** "ExpressRoute setup is 30 days + AED 100k one-time" (blocks timeline · exceeds budget).

**Fallback if unacceptable:** public internet TLS migration at 3 AM UAE time · DPO sign-off on transit exposure · ~15 minute window acceptable.

### Q10: Training GPU access (§41 Own AI 2027 roadmap)

**Ask:** "Long-term vision includes fine-tuning a 7B-13B model on UAE real estate corpus (Q1-Q2 2027). Core42 AI Cloud or Compass — what's access model for a 24-72 GPU-hour A100 80GB fine-tune job? Pay-as-you-go, reserved, enterprise commitment?"

**Why it matters:** §41 Own AI 2027 roadmap · aligns with SV-4 Mistral fallback + Compass evaluation.

**Green-flag answer:** "Core42 AI Cloud self-service NVIDIA compute, pay-as-you-go, A100 80GB available on-demand · ~USD X/GPU-hour."

**Red-flag answer:** "AI Cloud is enterprise-only with 12-month commit minimum AED 500k" (blocks iterative experimentation).

**Fallback if unacceptable:** Anthropic fine-tune API (once available) · OR Hugging Face + Modal · OR local Ollama for smaller experiments.

---

## §5 RFQ requirements document template (~150 lines · send to Core42 sales same-day)

**Title:** `docs/ops/CORE42_RFQ_2026-XX-XX.md` (create when needed · NOT created today)

**Template structure:**

```markdown
# Request for Quotation — Core42 Sovereign Public Cloud
**Requestor:** ZAAHI (Dubai Mainland LLC — in formation; ADGM HoldCo in formation)
**RFQ Reference:** ZAAHI-CORE42-2026-XX
**Date issued:** YYYY-MM-DD
**Response deadline:** YYYY-MM-DD (14 days from issue)
**Contact:** Dymo (commercial) · Zhan (technical)

## 1. Executive summary
ZAAHI is a UAE-sovereign real estate operating system · live production at 
zaahi.io · institutional backing AED 1M (Rudi Belin wire 2026-05-08) · 
evaluating primary sovereign cloud vendor for production cutover Month 9-10 · 
Phase 2 multi-tenant launch Jan 2027.

## 2. Workload profile (current + forecast)

### 2.1 Current state (Phase 1 · through Dec 2026)
- Compute: Next.js 15 · ~2 vCPU · 4 GB RAM · single region
- Database: PostgreSQL 16 · ~15 MB OLTP · ~19 tables · 114 parcels · 50-200 users
- Storage: ~150 MB object storage (PDFs) · ~5-50 GB packaged geodata
- Traffic: <100 DAU peak · <1 TB/month bandwidth
- AI: 50M-150M Claude tokens/month

### 2.2 Phase 2 forecast (Month 10-24 · Q1 2027 – Q1 2028)
- Compute: 2-6 replicas · 4 vCPU each at peak
- Database: 100 GB OLTP · General Purpose Gen5_2
- Storage: 1 TB objects · per-tenant growth
- Traffic: 5 000-10 000 DAU · 10 TB/month
- AI: 500M-1B tokens/month (migrate to Compass?)

### 2.3 Y5 forecast (Phase 3 · Q1 2030)
- Compute: 10+ replicas · 8 vCPU each
- Database: 500 GB OLTP · GP Gen5_4
- Storage: 10 TB objects
- Traffic: 50 000-100 000 DAU · 100 TB/month
- AI: 5B-10B tokens/month · fine-tuned ZAAHI-RE model inference

## 3. Compliance requirements
- PDPL FDL 45/2021 (UAE Data Protection)
- FTA CT FDL 47/2022 (Corporate Tax)
- VAT FDL 8/2017 (5-year record retention)
- AML FDL 10/2025 (Anti-Money Laundering)
- Future: DLD Gateway compliance (real estate transaction data integration)
- Future: VARA (tokenization Phase 3)
- Data residency: UAE strict (no cross-border transit except with explicit DPA approval)

## 4. Service requirements

### 4.1 Compute
- Azure Container Apps preferred (Dockerfile deploy) OR App Service (PaaS)
- Horizontal auto-scale min 1 max 6 replicas
- Managed Identity for all downstream Azure service access
- Zero-downtime deploy support

### 4.2 Database
- Azure Database for PostgreSQL Flex Server 16
- Burstable B2s Phase 1 · General Purpose Gen5_2+ Phase 2
- Automated backup + point-in-time recovery ≥7 days
- Zone-redundant HA ≥99.95%
- Read replica option Phase 2
- Connection pooling (pgBouncer or native)

### 4.3 Authentication
- Azure AD B2C tenant at sovereign region
- Custom policies for email+password + Google federation
- 500 MAU Phase 1 · 5 000 MAU Phase 2 · 50 000+ MAU Y5
- MFA support (SMS + authenticator app)
- Custom attribute schema (for our approved-flag pattern)

### 4.4 Object storage
- Azure Blob Storage hot tier
- S3-compatible API (or REST API + SDK)
- Managed Identity authentication
- Zone-redundant storage (ZRS) or GRS
- Signed URL generation support

### 4.5 CDN / edge
- Azure Front Door Premium tier
- WAF policy (OWASP top 10 rules)
- Rules Engine (match Vercel Edge Middleware capabilities)
- Multi-region ready for Phase 2 secondary region

### 4.6 Secrets management
- Azure Key Vault Premium (HSM-backed)
- Managed Identity integration
- Rotation automation support
- Audit logging

### 4.7 Monitoring
- Application Insights for APM
- Log Analytics workspace
- Azure Monitor alerts
- Integration with on-call notification (Telegram webhook)

### 4.8 CI/CD
- GitHub Actions integration
- Azure service principal for deploy
- Staging + production environment separation

## 5. SLA expectations
- Uptime: 99.9% Phase 1 · 99.95% Phase 2+
- RTO (recovery time objective): ≤30 min
- RPO (recovery point objective): ≤5 min
- Incident notification: ≤15 min for Sev-1
- Named Customer Success contact
- Support response: P0 ≤1 hour · P1 ≤4 hours · P2 ≤1 business day

## 6. Geographic requirements
- Phase 1 primary: Abu Dhabi sovereign region
- Phase 2 secondary (failover): Abu Dhabi second zone OR Bahrain
- Phase 2 expansion: Saudi (Riyadh / stc Cloud) Q2 2027
- Future: Kazakhstan / CIS 2028+

## 7. Commercial preferences
- POC phase (30-day) before production commitment
- Multi-year committed-spend discount (3-year target)
- Annual prepayment option (typical 10-15% discount · D-19 per §77 Pricing Framework)
- Separate dev/test billing line items
- Reserved instance pricing for baseline capacity
- Pay-as-you-go for burst capacity

## 8. Data Processing Agreement (DPA)
- Three-party model: tenant = Data Controller · ZAAHI = Data Processor · Core42 = Sub-Processor
- PDPL 45/2021 alignment
- Data residency attestation
- Incident notification timeline ≤72 hours (PDPL requirement)
- Right-to-audit clause
- Data portability / return on termination
- Signed before production cutover

## 9. Required deliverables from Core42
1. Service availability confirmation per §4 (yes/no/partial for each).
2. Indicative monthly pricing for §2.1 Phase 1 workload.
3. POC proposal: scope, duration, cost, success criteria.
4. Reference architecture diagram for ZAAHI-like workload.
5. DPA draft for legal review.
6. ISO / SOC certificate references (under NDA acceptable).
7. Migration support offering (Azure DMS access, Professional Services hours, etc.).
8. Named commercial contact (email + phone).

## 10. Timeline
- RFQ response: within 14 days.
- Follow-up call: within 21 days of RFQ issue.
- POC provisioning: Month 3-4 target.
- Production cutover: Month 9-10 target.

## 11. Signatures
Issued by: Dymo Tsvyk (Co-founder · Commercial · d.tsvyk@gmail.com)
Co-signed by: Zharkyn Ryspayev (Founder · Technical · zhanrysbayev@gmail.com)
```

---

## §6 Commercial negotiation cheatsheet

**Azure-sovereign pricing patterns (based on public Azure list pricing + publicly-known sovereign-tier premium):**

| Lever | Typical pattern | Our posture |
|---|---|---|
| Sovereign-tier premium | 30-50% over Azure public cloud | Accept · it's the cost of sovereignty |
| Reserved instance vs PAYG | 20-40% discount at 1-year commit · 40-60% at 3-year | Start 1-year · upgrade to 3-year at Month 18 if stable |
| Committed-spend agreement | AED X/yr commit → X+discount tier | Target: Y2 AED 200k commit = ~25% discount |
| POC phase | Usually free OR credited against production contract | Negotiate: free 30-day POC · credits if we sign within 60 days |
| Dev/test environment | Separate subscription · lower tier · different pricing | Dev on Basic/Burstable · staging on same tier as prod |
| Data egress | Can be expensive (~$0.087/GB out) | Front Door caching reduces · monitor actively |
| Sovereign controls add-on (Insight) | Premium for regulated sector controls | Yes we need this · confirm included vs add-on |
| DPA signing | 2-4 weeks typical · faster with NDA pre-signed | Pre-sign NDA before discovery call if possible |
| MSA length | 1-year initial common · multi-year favors vendor | Target: 1-year MSA · 3-year intent letter |

**Pricing targets from our budget (Platform Dev Fund-sourced):**
- Y1 (Sep-Dec 2026 partial · 4 months): AED 50-75k
- Y2 recurring: AED 200k
- Y3: AED 300k
- Y4: AED 450k
- Y5: AED 600k

**Negotiation red lines:**
- Upper bound Y1: AED 200k (absolute limit · beyond triggers D-11 Equinix contingency evaluation).
- Multi-year commit only if pricing reflects it (no commit without discount).
- MSA termination clause must allow 90-day notice + data portability.

**Phrases that work:**
- "Can we structure this as committed-spend so we both win?" (opens discount discussion).
- "What's typical for a customer at our scale entering sovereign tier?" (benchmarks without first-offer anchor).
- "Our Y5 vision is AED 600k · can we lock pricing now to reflect that trajectory?" (credible commitment signal).
- "POC phase is how we de-risk · what's your standard approach?" (non-adversarial).

**Phrases to avoid:**
- "This is our budget" (caps upside · commits us to ceiling).
- "We're evaluating alternatives" (can signal weakness · use sparingly · only if true).
- "We need this by [urgent date]" (weakens negotiation).

---

## §7 Ask-Rudi-first checklist

**Before Dymo initiates Core42 outreach (pre-Sunday-call ideally · post-ratification definitely):**

- [ ] **Existing Core42 / G42 relationship in Rudi's network?** One-line email to Rudi: "Do you have any direct or indirect relationship with Core42 or G42 leadership?"
- [ ] **Preferred intro path:** direct Dymo outreach · warm via Rudi · via counsel / BSA? Let Rudi choose · don't assume.
- [ ] **Budget authorization confirmed:** AED 160-200k Y1 from Platform Dev Fund per SV-14. Reconfirm with Rudi in Sunday call as part of ratification.
- [ ] **Timing sensitivities:** any UAE market events (Ramadan Feb 28–Mar 30 2026 · Eid al-Fitr · Eid al-Adha May 25-31 2026 · National Day Dec 2) we should avoid for major outreach? Rudi knows UAE calendar best.
- [ ] **ADGM entity readiness:** Core42 will ask for legal entity to sign MSA. Z-Hold LLC formation status? Agency LLC as signatory interim? Rudi legal counsel alignment.
- [ ] **NDA template:** does Rudi recommend a specific UAE-lawyer-drafted NDA we can pre-sign with Core42 to accelerate DPA discussion? Or use Core42's standard?
- [ ] **Communication cadence:** does Rudi want to be copied on all Core42 outreach · or summarized weekly · or only on decision points? Calibrate per his preference.

**Delivery: 1-paragraph email from Dymo to Rudi after Sunday call confirming ratification · asks the 7 items above as a bulleted list.**

---

## §8 Success criteria for the call

**Leaving the 60-minute discovery call, Dymo + Zhan should have:**

1. **Named Core42 point of contact** — email + phone + LinkedIn.
2. **Preliminary service availability confirmation** — yes/no on our 10 asks from §4.
3. **Indicative pricing range** — AED/month for Phase 1 profile per §2 1-pager.
4. **POC proposal outline** — scope · duration · cost · success criteria (formalized in writing within 7 days).
5. **Migration tooling confirmation** — Azure DMS + Professional Services offering · OR standard `pg_dump` path.
6. **DPA path confirmed** — template shared within 7 days · legal review 2-4 weeks.
7. **Follow-up meeting scheduled** — within 14 days · proposal review format.
8. **Red flags surfaced** — if any from §9 below · decision point to pivot.

**Failure criteria (trigger §9 pivot):**
- No service availability confirmation.
- Pricing >AED 500k/year at Phase 1 scale.
- POC not offered.
- DPA process >8 weeks.
- No migration support.

---

## §9 Red flags (when to pivot)

**If you hear any of these during the call, Core42 may not be our vendor and we need to pivot:**

**🚩 RED FLAG 1: Azure AD B2C NOT available in sovereign tier.**
- Blocks Spec 05 Auth Abstraction primary adapter.
- **Pivot:** self-hosted Keycloak (+2 engineer-weeks ops burden · still migration-compatible).
- **If also blocked:** pivot to du Datamena or Etisalat Cloud with self-hosted auth.

**🚩 RED FLAG 2: Abu Dhabi sovereign region NOT available for Azure PostgreSQL Flex Server.**
- Blocks deployment · cannot use Flex Server features (backup, HA, read replica).
- **Pivot:** Azure Single Server (legacy, deprecated 2024) NOT acceptable · or self-hosted Postgres on Azure VMs at sovereign tier (+1 engineer-week ops).
- **If also blocked:** pivot to du Datamena / stc Cloud.

**🚩 RED FLAG 3: Pricing >AED 500k/year at Phase 1 scale.**
- Exceeds Y1 budget AED 160-200k · exceeds even contingency.
- **Pivot:** ask for committed-spend (3-year) discount tier · if still >AED 350k, walk away.
- **If all options unacceptable:** evaluate du Datamena · Etisalat Cloud · Equinix DX1 contingency (D-11).

**🚩 RED FLAG 4: DPA signing process >8 weeks.**
- Blocks pre-cutover timeline (Month 7-8 DPA signing per §78 §8.3).
- **Pivot:** negotiate parallel track (pre-sign NDA → POC starts while DPA in legal review).
- **If Core42 rigid on 8+ weeks:** consider starting at T-3 months instead of T-2 per §78 timeline · delays cutover to Month 10-11.

**🚩 RED FLAG 5: No Supabase → Azure PostgreSQL migration tooling offered.**
- Forces manual migration · increases risk.
- **Pivot:** accept manual `pg_dump` path · small data volume makes this tolerable · +3 days rehearsal time.
- **If Core42 offers nothing and sees risk:** we absorb execution risk but proceed.

**🚩 RED FLAG 6: Core42 only engages Enterprise at 12-month commit minimum + AED 500k+ floor.**
- Phase 1 scale doesn't justify · can't commit before validation.
- **Pivot:** ask for POC → 30-day evaluation → 3-month initial → annual renewal path.
- **If Core42 rigid:** engage G42 parent contact · or pivot to du Datamena.

**🚩 RED FLAG 7: Core42 demonstrates low technical sophistication in call.**
- Sales rep can't answer Azure technical questions · no engineering involvement.
- **Pivot:** request technical architect joining follow-up call · escalate via LinkedIn to engineering leadership.
- **If quality stays low:** concern about post-sale support quality · pivot to alternative vendor.

**🚩 RED FLAG 8: Core42 aggressive on multi-year commitment without POC.**
- Pressure tactic · not aligned with our risk tolerance.
- **Pivot:** insist on POC phase · walk if they won't offer.

---

## §10 Post-call action items template

**Create after call:** `docs/ops/CORE42_CALL_NOTES_2026-XX-XX.md`

```markdown
# Core42 Discovery Call — YYYY-MM-DD

## Attendees
- ZAAHI: Dymo Tsvyk · Zharkyn Ryspayev
- Core42: [Name] [Role] · [Name] [Role]

## 10 questions status (from §4 above)
Q1 PostgreSQL Flex ADB: [answered / partial / unanswered] · [notes]
Q2 Container Apps recommendation: ...
Q3 Indicative pricing: ...
Q4 Azure AD B2C sovereign: ...
Q5 Blob Storage: ...
Q6 ISO/SOC certs: ...
Q7 Saudi Phase 2: ...
Q8 Migration tooling: ...
Q9 Data-in-transit: ...
Q10 Training GPU: ...

## Key takeaways
- [bullet points]

## Red flags detected (from §9)
- [None / Red flag N: description]

## Agreed next steps
- [Core42 to send: ...]
- [ZAAHI to send: RFQ per §5 within X days]
- [Follow-up call: YYYY-MM-DD at HH:MM UAE]

## Pricing indication (if disclosed)
- Phase 1 monthly: AED X-Y
- Phase 2 monthly: AED X-Y
- POC cost: ...
- Reserved discount: ...%

## Decision point
- GO / NO-GO / NEEDS MORE INFO
- Rationale: ...

## Rudi update
- [Summary email drafted · sent YYYY-MM-DD]
```

---

## §11 Cross-references

- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.3 (commit `68b8709`) — SV-14 ratification vehicle.
- `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` v1.0 (commit `d4a3df3`) — technical execution blueprint.
- `docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md` v1.0 (commit `9306b7c`) — Azure AD B2C migration path · informs Q4 ask.
- `docs/specs/phase-1/06-SECRETS_ROTATION_POLICY.md` v1.0 (commit `8ca495b`) — Azure Key Vault target · informs Q5+Q8 asks.
- `docs/ops/BUS_FACTOR_RECOVERY.md` v1.0 (commit `7c8bd57`) — pre-commercial governance · Core42 MSA signatory question.
- `docs/investor-package/MOU_RUDI.md` — Platform Dev Fund source for AED 160-200k Y1 budget.
- `CLAUDE.md` — founder contacts · 2% ZAAHI Service Fee baseline.

---

**End of Core42 Commercial Approach v1.0.**

Ready to execute. Awaits SV-14 ratification from Rudi Sunday call. Dymo activates within hours of confirmation.
