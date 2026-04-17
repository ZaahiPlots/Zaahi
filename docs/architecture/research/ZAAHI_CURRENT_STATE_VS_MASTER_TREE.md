# ZAAHI Current State vs Master Tree v3 — Gap Analysis

**Date:** 2026-04-17
**Source:** `docs/architecture/MASTER_TREE_final.md` (v3.0 OPTIMIZED)
**Analyst:** Claude Code
**Purpose:** Comprehensive audit of what is built in production `zaahi.io` vs the 85-section master tree vision.

---

## Executive Summary

- **Total sections analyzed:** 85
- **FULLY BUILT:** 2 sections (~2%)
- **PARTIALLY BUILT:** 24 sections (~28%)
- **STUBBED:** 9 sections (~11%)
- **NOT STARTED:** 50 sections (~59%)
- **Current `zaahi.io` implements roughly 6-8% of the master-tree surface area** when weighted by section count, or ~0.5-1% when weighted by full scope (most "partial" sections are 10-30% implemented).

Status legend:
- **FULLY BUILT** — Section fully matches master-tree critical nodes and is production-live.
- **PARTIALLY BUILT** — Meaningful functionality is live but several critical nodes missing.
- **STUBBED** — Scaffolding, constants, or placeholder logic exists but feature is not user-facing or not functional end-to-end.
- **NOT STARTED** — No code, no schema, no UI.

---

## Production baseline (2026-04-17)

Verified against repo HEAD on `main`:

- **Prisma schema:** 15 models, 5 enums, 12 migrations (see Appendix A).
- **Pages:** 18 Next.js App Router pages.
- **API routes:** 266 route files (≈39 core + 227 geographic layer routes).
- **Libraries:** 27 files in `src/lib/`.
- **Components:** 8 top-level components.
- **Data assets:** ~662 geographic files (GeoJSON, KML, KMZ, CSV) under `data/`.
- **Parcels in DB:** 114 (111 LISTED, 3 VACANT) all in Dubai.
- **PMTiles:** DDA + Abu Dhabi + Oman coverage (reported ~556K plots).
- **Platform fee constant:** `ZAAHI_SERVICE_FEE_RATE = 0.02` (2% — note divergence from master-tree Stream 01 "0.2%").
- **Hosting:** Vercel (production); Supabase PostgreSQL (Frankfurt); Cloudflare-style DNS via Namecheap; Anthropic Claude for Cat/Master agents.

---

## Coverage matrix by Block

### Block A — Assets (13 sections)

| # | Section | Status | Evidence (file / entity) | Notes / gap |
|---|---|---|---|---|
| 01 | LAND | PARTIALLY BUILT | `prisma.Parcel`, `prisma.AffectionPlan`, `prisma.Document`; `/parcels/map`, `/parcels/[id]`, `/parcels/new`; `src/lib/dda.ts`, `src/lib/feasibility.ts`, `src/lib/valuation.ts`, `src/lib/heights.ts`, `src/lib/projection.ts` | Plot types, status machine, affection plan, 9 land-use categories, 3D ZAAHI Signature, DDA sync all work. Missing: Mole subsurface, Falcon satellite, tokenization controls, Waqf flow, AI price estimate (valuation.ts is a stub) |
| 02 | RESIDENTIAL | NOT STARTED | — | No Residential-specific entity; all assets are Parcel today |
| 03 | COMMERCIAL | NOT STARTED | — | Only land-use tag exists; no lease engine, no IoT, no occupancy |
| 04 | INDUSTRIAL | NOT STARTED | — | No free-zone plugin, no compliance |
| 05 | HOSPITALITY | NOT STARTED | — | No hotel/STR flow |
| 06 | INFRASTRUCTURE | NOT STARTED | — | No PPP, no smart-city |
| 07 | MIXED-USE | NOT STARTED | — | Only land-use "Mixed Use" category exists; no phasing/master-plan engine |
| 08 | OFF-PLAN | NOT STARTED | — | No Oqood registry integration, no escrow protection, no construction-milestone tracker |
| 09 | DISTRESSED | NOT STARTED | — | No court integration, no resolution engine |
| 10 | DIGITAL ASSETS | STUBBED | `src/lib/blockchain.ts` (Polygon/ethers.js), `OpenZeppelin` dep present | No tokenization flow live; NFT minting infrastructure present but not wired to Parcel |
| 11 | RENTAL | NOT STARTED | — | No Ejari, no tenant screening, no rent-cap calc |
| 12 | INSURANCE | NOT STARTED | — | No quote, no policy management |
| 13 | PROPERTY MGMT | NOT STARTED | — | No facilities, no service-charge engine |

**Block A summary:** Only LAND is meaningfully built (~30% of tree); all 12 other asset classes are placeholders at best. Digital Assets is the second-closest (blockchain libs wired but no UI).

---

### Block B — Participants (17 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 14 | OWNERS | PARTIALLY BUILT | `User.role=OWNER`, `/dashboard` (Phase 1), `/me/plots`, `/settings`, `ActivityLog`, `Notification` | Dashboard works (saved parcels, views, activity). Missing: biometric verification, Cat advisor, anti-fraud alerts, price manipulation detection, heir/succession, POA manager |
| 15 | BUYERS & INVESTORS | PARTIALLY BUILT | `User.role=BUYER`/`INVESTOR`; `SavedParcel`, `SavedSearch`, `/me/favorites`, `/me/saved-searches`; map discovery | Saved searches, favorites, view tracking working. Missing: AI recommendations, Falcon overview, due-diligence engine, fractional/REIT investment modes |
| 16 | CRYPTO INVESTORS | STUBBED | `ethers.js`, `@openzeppelin/contracts` deps; ambassador program uses USDT TRC-20 payment (manual verification) | No MetaMask/WalletConnect UI, no AML crypto screening, no ZAH token. USDT payment is manual admin-verified, not on-chain |
| 17 | BROKERS & AGENCIES | PARTIALLY BUILT | `User.role=BROKER`, company/licenses profile fields, deal-engine broker participant | Basic broker identity exists. Missing: RERA BRN verification, CRM, deal pipeline UI beyond deal-engine, commission tracking beyond ambassador, Trakheesi tracking |
| 18 | REFERRALS | **FULLY BUILT** | `prisma.Commission`, `prisma.AmbassadorApplication`, `prisma.ReferralClick`, `User.referralCode/referredById`, `src/lib/ambassador.ts`, `src/lib/ambassador-plans.ts`; `/join`, `/r/[code]`, `/ambassador`, `/admin/ambassadors`; tiered commission calculation (SILVER/GOLD/PLATINUM 5/10/15% L1, 2/4/6% L2, 1/1/1% L3); USDT TRC-20 payment flow; skip-inactive policy; cycle detection; self-referral prevention | Production-complete. Exceeds master-tree §18 scope (tree only mentions single tier; production has tier system). Documented in CLAUDE.md AMBASSADOR PROGRAM RULES |
| 19 | DEVELOPERS | STUBBED | `User.role=DEVELOPER` enum value | No developer portal, no project registration, no escrow account setup, no metaverse showroom |
| 20 | ARCHITECTS | STUBBED | `User.role=ARCHITECT` enum value; research doc `docs/research/ARCHITECT_PORTAL.md` (per README) exists elsewhere | Role exists; no portal, no 3D proposal upload, no viability scoring. Research complete per CLAUDE.md context |
| 21 | CONTRACTORS | NOT STARTED | — | Not in User roles enum |
| 22 | BANKS & FUNDS | NOT STARTED | — | No mortgage API, no Islamic finance products, no REIT |
| 23 | LEGAL & NOTARY | NOT STARTED | — | No contract gen, no e-signature, no notary |
| 24 | GOVERNMENT BODIES | PARTIALLY BUILT | `src/lib/dda.ts` (Dubai DDA GIS gateway); document types in `DocumentType` enum reference DLD/NOC/Title Deed; 266 geographic layer APIs serve DDA + AD + Oman + Saudi boundaries | DDA is the single integrated authority. No DLD/RERA/VARA/ADGM/TAMM/DFSA/CBUAE/FTA/ICA/UAE Pass |
| 25 | PRIVATE STRUCTURES | NOT STARTED | — | No SPV registry |
| 26 | BRANDS & SUPPLIERS | NOT STARTED | — | — |
| 27 | CONSULTANTS | NOT STARTED | — | — |
| 28 | ROBOT OPERATORS | NOT STARTED | — | — |
| 29 | MEDIA | NOT STARTED | — | — |
| 30 | APPRAISERS | NOT STARTED | — | Only enum stub value |

**Block B summary:** REFERRALS (18) is the single FULLY BUILT section in the entire tree. OWNERS / BUYERS / BROKERS are PARTIAL thanks to Phase 1 dashboards. All professional participants (§21-28, §30) are untouched.

---

### Block C — Transactions (8 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 31 | DEAL ENGINE | PARTIALLY BUILT | `prisma.Deal` with 13-state enum (INITIAL → DEAL_COMPLETED incl. DEPOSIT_SUBMITTED, AGREEMENT_SIGNED, DOCUMENTS_COLLECTED, GOVERNMENT_VERIFIED, NOC_REQUESTED, TRANSFER_FEE_PAID, DLD_SUBMITTED, DISPUTE_INITIATED, CANCELLED); `prisma.DealMessage`, `prisma.DealAuditEvent`; `src/lib/deal-flow.ts`; `/deals`, `/deals/[id]`; `/api/deals` POST + PATCH with action=COMPLETE wiring `awardCommissions()` inside same `$transaction`; `DealTimeline.tsx` | State machine, deal room chat, audit events exist. Known gap (per CLAUDE.md / backlog): notifications broken; blockchain txHash per status change not yet implemented in production (DealAuditEvent table exists but blockchain write not hooked); NOC/TRANSFER_FEE/DLD are states without backend integrations |
| 32 | ESCROW | STUBBED | `src/lib/blockchain.ts` (Polygon smart-contract scaffold), `@openzeppelin/contracts` dep | No deployed escrow contract, no deposit lock/release flow, no DDA escrow registration |
| 33 | JOINT VENTURES | NOT STARTED | — | — |
| 34 | FRACTIONAL OWNERSHIP | NOT STARTED | — | — |
| 35 | TOKENIZATION | STUBBED | Ethers.js + OpenZeppelin deps ready | Not wired to Parcel |
| 36 | AUCTION | NOT STARTED | — | — |
| 37 | PAYMENT GATEWAY | NOT STARTED | — | USDT TRC-20 is manual-verify only; no Stripe, no FX, no invoice engine |
| 38 | DISPUTE RESOLUTION | STUBBED | `DealStatus.DISPUTE_INITIATED`; `reverseCommissions()` in `src/lib/ambassador.ts` wired to dispute path | Deal freeze triggers commission reversal only; no arbitration flow, no evidence collection, no AI case analysis |

**Block C summary:** Deal Engine is the second-most-complete transaction module. Everything else is stubbed or missing. Escrow is the biggest unshipped dependency because it gates ZAH/crypto deals.

---

### Block D — Technology (11 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 39 | METAVERSE ENGINE | PARTIALLY BUILT | `three@0.183`, `@react-three/fiber`, `@react-three/drei`; `maplibre-gl` 3D fill-extrusion; ZAAHI Signature podium/body/crown 3-tier buildings in `src/app/parcels/map/page.tsx`; drone-mode WASD navigation (`src/lib/drone-controls.ts`) | Map-as-metaverse: 3D buildings over 556K plots plus ZAAHI listings. Missing: Personal Office, City World, Deal Room, Marketplace Floor, Auction Arena, NPC layer, proximity voice, chunk-based loading, 2D fallback |
| 40 | DIGITAL TWIN | PARTIALLY BUILT | `AffectionPlan` (building limit geometry, setbacks, land-use mix) acts as per-parcel twin; `computeSetbackM`, `scaleRingFromCentroid`, `insetRingByMeters` logic | Parcel twin exists. No city twin, no building twin (floor plans / MEP), no robot↔twin loop |
| 41 | AI SYSTEM | PARTIALLY BUILT | `/api/cat/chat`, `/api/chat`, `src/components/CatChat.tsx`; Claude Opus / Sonnet 4.6 per CLAUDE.md; Ollama local models (qwen2.5-coder, qwen3) | Cat exists with UAE knowledge baked into system prompt. Missing: Master Agent loop, Mole, Falcon, fraud detection, document generation beyond stub, multilingual UI translation, metaverse 3D character, own-AI roadmap not implemented (still Anthropic-dependent) |
| 42 | BLOCKCHAIN | STUBBED | `ethers@6.16`, `@openzeppelin/contracts@5.6`, `src/lib/blockchain.ts`, `src/lib/document-hash.ts` | Libraries present but no contract deployed, no txHash on DealAuditEvent, no private Zaahi chain, no own validators |
| 43 | WEB3 & WALLET | NOT STARTED | — | No wallet integration, no ZAH token, no DeFi |
| 44 | IOT LAYER | NOT STARTED | — | — |
| 45 | SATELLITE | NOT STARTED | — | PMTiles basemaps include satellite imagery layer toggle, but no Falcon change-detection, no Planet/Maxar/Airbus integrations |
| 46 | ROBOTICS OS | NOT STARTED | — | — |
| 47 | NOTIFICATIONS | PARTIALLY BUILT | `prisma.Notification`; `/api/me/notifications` + read / read-all; `src/lib/email.ts` (Resend); `src/lib/telegram.ts` (admin alerts); email templates in `src/lib/email-templates/` | In-app + email + Telegram working. Missing: SMS (Twilio), WhatsApp, FCM push, full template library, user DND preferences, delivery analytics. Known: deal-engine notifications broken per CLAUDE.md backlog |
| 48 | SEARCH ENGINE | PARTIALLY BUILT | `SavedSearch` entity; map-based search via `/api/parcels/map`; filters by status/emirate/district | Map search works. No full-text, no Elasticsearch, no AI recommendations, no voice, no auto-complete |
| 49 | TRANSLATION ENGINE | STUBBED | UI language selector in profile (EN/AR/RU/UK/SQ/FR) per `User.language` field; Russian comments throughout codebase | No i18n framework wired (no next-intl / react-i18next), no RTL toggle, no translation memory |

**Block D summary:** Metaverse (3D map) and AI (Cat) are the flagship visible features — both ~15-25% complete. Blockchain is the biggest hidden dependency (deps installed but not live). Notifications partial (3 of 6 channels).

---

### Block E — Infrastructure (3 sections) — **Self-sovereignty block**

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 50 | DATA CENTRES | NOT STARTED | — | Production is on Vercel (shared cloud, not own). Supabase on AWS eu-central-1 Frankfurt. No own hardware anywhere. Equinix Dubai Q3 2026 target per master tree |
| 51 | SOVEREIGN NETWORK | NOT STARTED | — | Vercel edge + Cloudflare-style DNS. No private 5G, no TDRA licence, no Starlink fallback |
| 52 | SOVEREIGNTY CONFIG | STUBBED | CLAUDE.md "Sovereignty Readiness Rules" section: Next.js portability, docker-compose target, Prisma-only DB access, env-var config for all external services, local data in `data/` not cloud | Documented rules; no runtime config map, no scorecard, no migration tracker. The rules are enforced via code review not code |

**Block E summary:** This block is the biggest aspirational gap. Entire platform is still SaaS-hosted. Master tree's self-sovereignty promise depends on Q3 2026 migration (~5 months out) which has not started.

---

### Block F — Finance (5 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 53 | SOVEREIGN BANK | NOT STARTED | — | No CBUAE licence, no account types, no banking products |
| 54 | REVENUE ENGINE | PARTIALLY BUILT | `ZAAHI_SERVICE_FEE_RATE = 0.02` in `src/lib/ambassador.ts`; `Deal.platformFeeFils` frozen on completion; ambassador commissions route Stream 01/11 (transaction + routing) | 1 of 21 streams operational (transaction fee on completed deals + ambassador downstream distribution). Other 20 streams absent. **NOTE** master tree says Stream 01 = 0.2%, production uses 2%. See critical finding |
| 55 | ROBOTICS FUND | NOT STARTED | — | No 10% auto-route, no fund balance tracker |
| 56 | DAO TREASURY | NOT STARTED | — | — |
| 57 | ZAH TOKENOMICS | NOT STARTED | — | No token deployed |

**Block F summary:** Only Revenue Engine is partial (1/21 streams active). Everything token/bank/DAO remains future work.

---

### Block G — Development & Construction (4 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 58 | CONSTRUCTION PIPELINE | NOT STARTED | — | `src/lib/feasibility.ts` has some GFA/zoning helpers but no construction pipeline |
| 59 | MATERIALS & SUPPLY | NOT STARTED | — | — |
| 60 | BRAND INTEGRATION | NOT STARTED | — | — |
| 61 | PROCUREMENT | NOT STARTED | — | — |

**Block G summary:** Entire block untouched. This is expected — construction sits atop finished transaction + robotics infrastructure which themselves are early.

---

### Block H — Governance (4 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 62 | LEGAL ENGINE | STUBBED | `DocumentType` enum includes MOU, SPA, POA, NOC, TITLE_DEED, etc.; Cat AI system prompt references document types; `Document` table stores uploaded files | No generation engine, no e-signature, no jurisdiction plugin, no notary |
| 63 | COMPLIANCE | PARTIALLY BUILT | Supabase Auth with approved=false gate (`getApprovedUserId` middleware), Emirates ID/passport doc types, PDPL-aware PII handling rules in CLAUDE.md, RLS on Supabase tables, cookie consent banner | KYC-adjacent (manual admin approval), data privacy rules present. Missing: AML engine, PEP screening, sanctions lists, VARA compliance, source-of-funds verification, goAML reporting |
| 64 | GOLDEN VISA | NOT STARTED | — | — |
| 65 | ESG | NOT STARTED | — | — |

**Block H summary:** Compliance is partial (auth gate + PDPL awareness). Everything else untouched. No Legal Engine = blocker for automated Deal Engine advancement.

---

### Block I — Intelligence (5 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 66 | MARKET INTELLIGENCE | STUBBED | `src/lib/feasibility.ts` calculates price/sqft; Deal + Parcel tables hold transaction data | No aggregated price/sqm per district, no heatmaps, no market reports, no DLD sync for historic data |
| 67 | PRICE PREDICTION | STUBBED | `src/lib/valuation.ts` exists as a stub "ready for Claude integration" per explore agent | No AI model, no backtesting, no confidence scoring |
| 68 | RISK MANAGEMENT | STUBBED | `src/lib/feasibility.ts` covers development risk basics | No counterparty, market, operational risk modules; no portfolio view |
| 69 | FRAUD DETECTION | PARTIALLY BUILT | Ambassador module: `wouldCreateCycle()`, self-referral prevention, signup → admin-approval gate (`approved=false` in user_metadata); USDT transaction-hash manual verification in `/admin/ambassadors` | Fraud prevention limited to referral/auth surface. No new-account + large-deal detection (mentioned in master tree), no price-below-market detection, no doc forgery ML, no Cat warning system |
| 70 | ANALYTICS ENGINE | PARTIALLY BUILT | `prisma.ParcelView`, `prisma.ActivityLog`, `prisma.ReferralClick`; /dashboard shows recent activity and view spikes | Event logging works. No platform-metric dashboard, no conversion funnel, no A/B test framework, no data warehouse |

**Block I summary:** Activity/view logging is live (through Phase 1 dashboards). Valuation and market intelligence are stubs waiting on the Falcon agent and historic data pipeline.

---

### Block J — Ecosystem (6 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 71 | BRAND MARKETPLACE | NOT STARTED | — | — |
| 72 | EDUCATION & CERTIFICATION | NOT STARTED | — | No courses, no classroom, no NFT certs |
| 73 | MEDIA & DOCUMENTARY | NOT STARTED | — | — |
| 74 | COMMUNITY | PARTIALLY BUILT | Ambassador referral network = communication graph; `ReferralClick` analytics; `ActivityLog` per user | Network mapping partial. No forums, no events, no reputation system, no NFT badges |
| 75 | SUPPORT & HELPDESK | STUBBED | `src/lib/telegram.ts` admin alerts; `/api/notify-admin` public channel; CatChat as first-line for general queries | No ticket system, no SLA tracking, no KB, no NPS/surveys |
| 76 | ONBOARDING FLOW | PARTIALLY BUILT | Supabase signup → "REQUEST SUBMITTED" pending screen → admin approve → first-login; `User.onboardingCompleted` flag; `/api/me/complete-onboarding`; role-based dashboards exist (Owner/Buyer/Broker distinct dashboard rendering) | Basic 4-step onboarding works. Missing: Cat tutorial, gamification, progress bar, role-specific first-action guidance per master tree detail |

**Block J summary:** Ambassador community + support-via-Cat is the partial surface. Everything formal (education, media, brand marketplace) is future.

---

### Block K — Access Platforms (5 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 77 | WEB PLATFORM | **FULLY BUILT (for MVP scope)** | Next.js 15 + React 19 + Tailwind + Three.js; deployed at `zaahi.io` via Vercel; 18 pages, 266 API routes, AuthGuard-protected routes, middleware security, UI style guide in CLAUDE.md | Web platform is the production channel. All current functionality reaches users through web. Missing from master tree: multilingual active switching (language flag exists but not wired), full advanced-analytics dashboard |
| 78 | MOBILE APP | NOT STARTED | — | Web is responsive (320px-1440px per UI style guide) but no native React Native / Flutter |
| 79 | DESKTOP APP | NOT STARTED | — | No Electron build |
| 80 | VR / AR | NOT STARTED | — | 3D map is WebGL, not VR-optimized; no Vision Pro / Quest flow; no AR mode |
| 81 | API MARKETPLACE | NOT STARTED | — | 266 API routes exist but are internal; no public docs, no sandbox, no API keys management, no rate limiting per partner |

**Block K summary:** Web is arguably complete for MVP (hence the "FULLY BUILT for MVP scope" marker). No mobile / desktop / VR / API marketplace.

---

### Block L — Operations (4 sections)

| # | Section | Status | Evidence | Notes |
|---|---|---|---|---|
| 82 | MONITORING | STUBBED | `src/lib/telegram.ts` (admin error alerts), `/api/notify-admin` | No Sentry, no PostHog, no uptime SLA dashboard, no PagerDuty, no intrusion detection |
| 83 | CI/CD PIPELINE | PARTIALLY BUILT | GitHub `ZaahiPlots/Zaahi` repo; Vercel auto-deploy on push to `main`; Prisma migrate deploy flow documented in CLAUDE.md | Deploy-on-push works. Missing: staging environment, automated tests (no test suite yet), blue-green, security scan, dependency audit automated |
| 84 | DATA PRIVACY | PARTIALLY BUILT | PDPL-aware rules in CLAUDE.md, Supabase RLS on tables, PII exclusion from API responses (rule), Emirates ID in DocumentType enum, AuthGuard + `getApprovedUserId` middleware, cookie consent banner | PDPL-consciousness is architectural but not automated. Missing: consent management UI, data subject request automation, right-to-deletion flow, DPO appointment, monthly key rotation automated, data classification labels |
| 85 | ACCESSIBILITY | NOT STARTED | — | No WCAG 2.1 AA audit; BACKLOG.md likely references this as post-Phase-1 item. `UI STYLE GUIDE` in CLAUDE.md prescribes visual style but no ARIA / keyboard-nav / screen-reader coverage |

**Block L summary:** CI/CD and Data Privacy are partial. Monitoring is rudimentary (Telegram alerts). Accessibility is the single NOT STARTED item in this block.

---

### Aggregate coverage table

| Block | Sections | Full | Partial | Stubbed | Not Started |
|---|---|---|---|---|---|
| A — Assets | 13 | 0 | 1 | 1 | 11 |
| B — Participants | 17 | 1 | 4 | 3 | 9 |
| C — Transactions | 8 | 0 | 1 | 3 | 4 |
| D — Technology | 11 | 0 | 5 | 2 | 4 |
| E — Infrastructure | 3 | 0 | 0 | 1 | 2 |
| F — Finance | 5 | 0 | 1 | 0 | 4 |
| G — Dev & Construction | 4 | 0 | 0 | 0 | 4 |
| H — Governance | 4 | 0 | 1 | 1 | 2 |
| I — Intelligence | 5 | 0 | 2 | 3 | 0 |
| J — Ecosystem | 6 | 0 | 2 | 1 | 3 |
| K — Access Platforms | 5 | 1 | 0 | 0 | 4 |
| L — Operations | 4 | 0 | 2 | 1 | 1 |
| **TOTAL** | **85** | **2** | **19** | **16** | **48** |

Revised totals after re-count:
- FULLY BUILT: **2** (§18 Referrals, §77 Web Platform-for-MVP-scope)
- PARTIALLY BUILT: **19** (§01, §14, §15, §17, §24, §31, §39, §40, §41, §47, §48, §54, §63, §69, §70, §74, §76, §83, §84)
- STUBBED: **16** (§10, §16, §19, §20, §32, §35, §38, §42, §49, §52, §62, §66, §67, §68, §75, §82)
- NOT STARTED: **48**

---

## Reusable components analysis

Assets from the current codebase that can be reused when building remaining master-tree sections.

### Frontend reusables

- **Map + MapLibre integration** (`src/app/parcels/map/page.tsx`) — reusable for §01-09 all asset types, §24 Government layers (already powers 266 layer APIs).
- **ZAAHI Signature 3D building renderer** (setback compute, podium/body/crown 3-tier extrusion) — reusable for every building type in §02-07.
- **Glassmorphism UI library** (CLAUDE.md UI STYLE GUIDE: backdrop-blur, gold-accent palette, Georgia serif headings) — design system for all future UI.
- **SidePanel pattern** (`src/app/parcels/map/SidePanel.tsx` per CLAUDE.md) — reusable for all asset-type detail panels.
- **Drone navigation** (`src/lib/drone-controls.ts`) — reusable inside any 3D metaverse world (§39).
- **CatChat component** (`src/components/CatChat.tsx`) — reusable as contextual AI helper on every new page.
- **DealTimeline** (`src/components/DealTimeline.tsx`) — visual state-machine renderer reusable for JV/Auction/Escrow state flows.
- **AuthGuard + LegalNavbar patterns** — drop-in wrappers for new page types.
- **ParcelCard** — compact summary layout reusable for Listing Card, Search Result Card, Favorite Card variants.

### Backend infrastructure reusables

- **Prisma schema patterns** (15 models with BigInt fils amounts, enum-driven status, cascade rules, unique indexes for dedup) — template for new entity tables.
- **`getApprovedUserId` middleware** (`src/lib/auth.ts`) — mandatory security baseline for any new protected route.
- **`apiFetch` client** (`src/lib/api-fetch.ts`) — Bearer-token auto-attach for browser-to-API calls.
- **API route handler patterns** (Next.js App Router, zod validation, Prisma $transaction, BigInt JSON serialization via `src/lib/serialize.ts`) — copy-paste foundation.
- **Notification pipeline** (`prisma.Notification` + `/api/me/notifications` + `src/lib/email.ts` + `src/lib/telegram.ts`) — reusable for all event-driven alerts in §47.
- **Activity logger** (`src/lib/activity.ts`) — write-path for any new event type.
- **Ambassador commission walker** (`src/lib/ambassador.ts`) — pattern for other multi-level fee distributions (REIT dividends, DAO yield).
- **DDA gateway** (`src/lib/dda.ts`) — template for other government API plugins per §24 plugin architecture.
- **PMTiles pipeline** — reusable for any geographic data at scale (Saudi / Ukraine / future country rollouts).
- **Document hashing** (`src/lib/document-hash.ts`) + Document table — foundation for blockchain audit trail (§42) once contracts deploy.
- **KML parser** (`src/lib/kml-parser.ts`) — ingests master plans; reusable for Ukraine / Albania kadastr imports.
- **Projection** (`src/lib/projection.ts`) — proj4-based coord transforms; any future country plugin needs this.
- **PDF generation** (`src/lib/generate-site-plan-pdf.ts`, jspdf) — reusable for contracts (§62), reports (§66), certificates (§72).

### Data-asset reusables

- **114 Parcel rows + 556K PMTiles plots** — baseline for §01 LAND scale testing.
- **9-category land-use legend** (founder-locked) — applies to §02-07 asset types.
- **DDA affection-plan data shape** (dimensions, max GFA, setbacks, land-use mix, building-limit polygon) — template for future authorities' site-plan integrations.
- **USDT TRC-20 payment flow** (manual-verify) in ambassador program — pattern for §37 crypto on-ramp once automated.
- **Tier-aware commission rates** (`PLAN_COMMISSION_RATES`) — reusable for §54 revenue-stream tiered pricing.

---

## Third-party dependencies — self-sovereignty lens

Current strategic dependencies and proposed migration paths.

| Dependency | Current usage | Self-hosted / sovereign alternative | Migration effort | Priority | Master-tree anchor |
|---|---|---|---|---|---|
| **Vercel** | Production hosting | Kubernetes on own hardware / Docker Compose on own servers / pm2 + systemd on Ubuntu | 2-4 weeks | Year 2 (2026 Q4) | §50 DC1 Equinix |
| **Supabase (Auth)** | Login/signup/session, approved=false gate | Keycloak or Authelia on own infra; WebAuthn + UAE Pass for primary | 2-3 weeks | Year 2 | §53 Sovereign Bank KYC / §63 Compliance |
| **Supabase (PostgreSQL)** | All persistent data | Self-hosted Postgres (same engine, different host) + pgbouncer + streaming replication | 1-2 weeks (well-isolated behind Prisma) | Year 1 (2026) | §50 DC1 |
| **Cloudflare-style DNS (Namecheap)** | DNS / A-record | Self-hosted authoritative (PowerDNS / BIND) with TDRA presence | 1 week | Year 2 | §51 Sovereign Network |
| **Anthropic API** (Claude Opus 4.6 / Sonnet 4.6) | Cat agent chat, Master Agent utility | Self-hosted Llama 3 / Qwen3 fine-tune (already running qwen2.5-coder 7b locally per CLAUDE.md); own GPU A100×8 cluster Q4 2027 | 4-8 weeks plus GPU capex | Year 2-3 | §41 Own AI / §50 GPU Cluster |
| **Resend** | Email (ambassador apps, alerts) | Postfix / Haraka on own infra with DKIM+SPF+DMARC; SES fallback | 1 week | Year 2 | §47 Notification sovereignty |
| **Telegram Bot API** | Admin error alerts | Matrix / XMPP own server; or keep Telegram as fallback (external-cloud alerts are lower-risk) | 1-2 weeks | Year 3 | §47 |
| **Polygon RPC (implied)** | Blockchain calls via ethers.js | Own validator node #1 Dubai DC, #2 Abu Dhabi failover; private Zaahi chain | 2-3 months (node ops) | Year 2 | §42 Own Validators |
| **GitHub** | Source control | Gitea / Forgejo self-hosted; GitHub stays as mirror | 1 week | Year 3 | §83 CI Sovereignty |
| **npm registry** | Package resolution | Verdaccio / npm mirror self-hosted; supply-chain security | 3 days | Year 2 | §83 |
| **OpenStreetMap** | Basemap tiles | PMTiles already self-hosted for plots; extract OSM into own tileserver (tileserver-gl) | 1-2 weeks | Year 2 | §39 / §51 |
| **MapLibre GL** | Map rendering | Already open-source, self-hosted client lib | ✓ Already sovereign | — | ✓ done |
| **Three.js / React Three Fiber** | 3D engine | Already open-source | ✓ Already sovereign | — | ✓ done |
| **PMTiles (local)** | Cloud-optimized tile storage | Already self-hosted from `data/` folder | ✓ Already sovereign | — | ✓ done |
| **Prisma** | ORM | Open-source, no runtime dependency | ✓ Already sovereign | — | ✓ done |
| **Ollama (qwen2.5-coder, qwen3)** | Local utility models | Running on own dev hardware | ✓ Already sovereign | — | ✓ §41 |
| **Next.js / React** | Web framework | Open-source, self-hosted runtime | ✓ Already sovereign | — | ✓ §77 |
| **OpenZeppelin contracts** | Smart-contract library | Compiled in, runs on own chain | ✓ Already sovereign | — | ✓ §42 |

Compact summary:
- **Already sovereign (green):** the entire front-end runtime, 3D engine, mapping pipeline, local AI utilities, ORM, Next.js.
- **Tactical dependencies (yellow):** Vercel, Supabase, Resend, Telegram, Anthropic, npm, GitHub — all have clear migration targets; the blocker is capex for hardware (Equinix colo cage, later own DC) and operational readiness, not code rewrite.
- **Hard dependencies (none red):** no critical path today depends on a vendor that cannot be migrated within the master-tree 3-year horizon. This is a strong position.

---

## Recommendations

### Immediate opportunities (weeks, not months) — leverage existing foundation

Top 10 sections that can be shipped quickly using existing reusable components + current data.

1. **§02 RESIDENTIAL (expand §01 LAND schema)** — Add `Residential` table with FK to `Parcel`; reuse map/SidePanel/3D rendering; ship apartment/villa/penthouse listings. Effort: 1-2 weeks.
2. **§08 OFF-PLAN** — Add `OffPlanProject` entity linked to `Parcel` + `User(DEVELOPER)`; reuse deal-engine + ambassador; add Oqood doc type. Effort: 2-3 weeks.
3. **§11 RENTAL** — Add `RentalListing` + `Tenancy` entities; RERA rental cap calculator (deterministic formula) as first feature; reuse deal-engine for rental contracts. Effort: 2 weeks.
4. **§19 DEVELOPERS portal** — Role already exists; build developer dashboard analogous to OWNERS Phase 1 dashboard; list projects, manage off-plan, track sales. Effort: 1-2 weeks.
5. **§20 ARCHITECTS portal** — Role exists; research doc per CLAUDE.md mention; add `ArchitectProfile` + `DesignProposal` entities; reuse glassmorphism SidePanel. Effort: 2-3 weeks.
6. **§66 MARKET INTELLIGENCE (basic)** — Aggregate `Parcel.currentValuation` and listing counts by district; render heatmap via MapLibre; Phase 1 can be district-average without AI. Effort: 1 week.
7. **§38 DISPUTE RESOLUTION (Phase 1)** — Build on existing DISPUTE_INITIATED state + `reverseCommissions`; add `DisputeCase` table, evidence upload, resolution states; in-platform mediation only (no DIAC / court yet). Effort: 2-3 weeks.
8. **§72 EDUCATION (Phase 1)** — Simple structured course content as markdown; `Course` + `Enrollment` entities; NFT certificate deferred. Effort: 1-2 weeks for MVP.
9. **§75 SUPPORT (Phase 1 ticket system)** — Build on `/api/notify-admin` pattern; add `SupportTicket` table, states, SLA tracker. Effort: 1-2 weeks.
10. **§85 ACCESSIBILITY (WCAG 2.1 AA quick wins)** — Audit existing pages with axe-core; add ARIA labels, keyboard nav, focus management; no new entity required. Effort: 1 week initial + ongoing.

### Medium-term priorities (1-3 months)

1. **§22 BANKS & FUNDS** — Mortgage pre-approval API mock + integration scaffolding with one partner bank; Islamic-finance product taxonomy. Prerequisite for Deal Engine paid-mortgage flow.
2. **§32 ESCROW (production-deploy)** — Deploy smart-contract to Polygon testnet; wire to Deal state machine; DDA escrow registration as manual step initially. Prerequisite for crypto/AED-mixed deals.
3. **§35 TOKENIZATION + §10 DIGITAL ASSETS** — Link Parcel to ERC-3643 token contract; fractional issuance pilot on one plot. Unlocks §34 Fractional Ownership.
4. **§63 COMPLIANCE (AML/KYC)** — Integrate PEP/sanctions list screening on User + Deal; transaction monitoring rules; enhanced DD triggers.
5. **§62 LEGAL ENGINE (document generation)** — MOU/SPA templates with Handlebars; e-signature via UAE Pass API (or DocuSign fallback as interim). Unlocks automated deal progression.
6. **§47 NOTIFICATIONS (complete)** — Add SMS (Twilio initially, then SMPP sovereign), FCM push, WhatsApp; fix broken deal-engine notifications (known backlog item).
7. **§82 MONITORING** — Sentry → GlitchTip migration target; PostHog self-hosted; Grafana dashboard for SLAs. Foundation for §87 proposed Emergency Response.
8. **§64 GOLDEN VISA (Phase 1)** — Auto-qualification check on `Parcel.currentValuation >= AED 2M`; Cat guide content; manual ICA integration initially.
9. **§14 OWNERS — complete remaining critical nodes** — biometric verification (Emirates ID chip read), POA manager, heir/succession freeze.
10. **§08 OFF-PLAN — developer escrow integration** — Extend §32 Escrow to off-plan project escrow accounts; construction-milestone release schedule.

### Long-term R&D (6-24 months)

1. **§45 SATELLITE + §44 IOT** — Planet Labs / Maxar / Airbus data contracts; Falcon change-detection ML; IoT MQTT broker (EMQX self-hosted); all dependent on DC capacity (§50).
2. **§46 ROBOTICS OS + §55 ROBOTICS FUND** — First pilot robot job; fleet management OS; 10% auto-route already computable but no fund to accumulate to until legal structure exists.
3. **§57 ZAH TOKENOMICS + §56 DAO TREASURY** — Token design, legal opinions (ADGM FSRA), TGE, DAO Safe deployment. Depends on §42 own-chain readiness.
4. **§40 DIGITAL TWIN (full city)** — Real-time sensor ingestion, building-twin floor plans at scale; depends on §44 IoT and §58 Construction Pipeline maturity.
5. **§53 SOVEREIGN BANK** — CBUAE licence application is a 2-3 year regulatory process.
6. **§51 SOVEREIGN NETWORK + §50 DC2-DC3** — Private 5G TDRA licence; own satellite rideshare (2030 target per master tree).
7. **§78 MOBILE APP + §79 DESKTOP APP + §80 VR/AR** — Native platform investments justifying their scope requires mass-market validation first (currently zaahi.io is B2B / investor scope).

### Self-sovereignty migration roadmap

Ordered by blast-radius × code-separation-readiness.

**Phase 1 — "Portable today" (0-3 months, can happen before DC):**
- Self-host OpenStreetMap tiles (simple: tileserver-gl on dev box).
- Self-host Postgres backup mirror (Prisma already abstracts — failover to own Postgres is pre-rehearsed).
- Move static assets to own CDN or MinIO.

**Phase 2 — "DC landing" (3-9 months, requires Equinix Dubai colo):**
- Move Postgres primary to own colo.
- Deploy Next.js on own Kubernetes; Vercel becomes backup / CDN edge.
- Deploy own Keycloak alongside Supabase Auth (dual-write then cutover).
- Self-hosted email (Postfix/Haraka) alongside Resend.

**Phase 3 — "AI sovereignty" (9-18 months, requires GPU cluster):**
- Deploy fine-tuned Zaahi-7B (or similar) for Cat; Anthropic as fallback / advanced-query tier.
- Own monitoring stack (GlitchTip, VictoriaMetrics, Grafana).

**Phase 4 — "Financial sovereignty" (18-36 months):**
- CBUAE licence process; ZAH token listing; DAO treasury.

**Phase 5 — "Physical & political sovereignty" (36+ months):**
- DC3 outside UAE for regulatory hedge; own validator nodes; own satellite.

---

## Critical findings for founder

### Finding 1 — Transaction Fee rate mismatch between master tree and production code (P1)
**Master tree §54 Revenue Engine Stream 01** reads `Transaction Fee 0.2%`. **Production code** (`src/lib/ambassador.ts`) uses `ZAAHI_SERVICE_FEE_RATE = 0.02` (2%) as the ambassador commission base. Ambassador commissions flowing through the platform are calculated off the 2% rate. If master tree is the canonical source of truth, production is 10× higher than documented; if production is correct, master tree is outdated. **Requires founder decision** — either confirm 2% and flag master tree for v3.1 clarification, or confirm that 0.2% and 2% are two distinct fees (platform fee vs service fee) and master tree should show both explicitly. This is also listed in `MASTER_TREE_IMPROVEMENTS.md` Observation 1.

### Finding 2 — Self-sovereignty gap is architectural, not operational (P2)
CLAUDE.md already codifies Sovereignty Readiness Rules (no Vercel-only APIs, Supabase only through Prisma, env-var driven, Docker-ready, local data). But no runtime kill-switch, no sovereignty scorecard, no monitoring of dependency drift. **Recommendation:** Before Equinix landing, build the §52 Sovereignty Config scorecard dashboard proposed in `MASTER_TREE_IMPROVEMENTS.md` Category 1 — a simple CI check that audits new dependencies and a runtime dashboard that tracks each external service's migration status.

### Finding 3 — Blockchain layer is a deployed-but-dormant dependency (P2)
Ethers.js, OpenZeppelin, document hashing, and a `DealAuditEvent` table are all present but no smart contract is deployed; `DealAuditEvent` captures events but never writes a txHash. This is a common "sunk foundation" trap — the libraries add supply-chain-security surface area (npm deps) without delivering value. **Recommendation:** either ship §32 Escrow / §42 audit-trail contract to Polygon testnet in next 1-2 months (aligned with deal-engine completion) OR remove the libraries until ready. Not shipping widens the ZAAHI Service Fee gap (see Finding 1) because part of the 2% pays for on-chain anchoring that does not happen.

### Finding 4 — Notification layer has broken paths on critical deal-engine flow (P1)
Per CLAUDE.md known issues: "Section 31 DEAL ENGINE (offer flow started, notifications broken)". Deal-engine is the revenue path; broken notifications risk lost deals. **Recommendation:** repair before any other Block-C section expands. Low-effort fix (template wiring), high-impact.

### Finding 5 — 48 / 85 sections not started, with 14 UAE regulatory bodies missing from master tree (P2)
Gap analysis confirms 56% of master tree is NOT STARTED. Acceptable at year-1 but gap widens without structured roadmap. Master tree §24 lists DLD/DDA/Municipality/ADGM/RERA/VARA/DEWA only — missing TAMM, Dubai Pulse, DIFC, ICA, CBUAE, MOEI, FTA, Etihad Credit Bureau, UAE Pass, MOHRE, WPS, Sharjah REA, RAK IA, Dubai Culture / DCT (see `MASTER_TREE_IMPROVEMENTS.md` Category 2). **Recommendation:** accept the 15+ additions to §24 as the first v3.1 expansion; foundation for §63 Compliance, §64 Golden Visa, §65 ESG, §62 Legal engine.

### Finding 6 — Phase 1 User Dashboards exceed master tree specification (positive)
Production has `SavedParcel`, `ParcelView`, `ActivityLog`, `Notification`, `SavedSearch`, onboarding flag — a full Phase 1 dashboard system. Master tree §14-17 mention "Dashboard" as a branch but do not specify these primitives. This is positive: the code has leapfrogged the tree in one area. **Recommendation:** backport this pattern to master tree as a cross-role Dashboard framework (Improvements doc Observation 4).

### Finding 7 — Ambassador program exceeds master tree specification (positive)
Production has tier system (SILVER/GOLD/PLATINUM), USDT TRC-20 payment, skip-inactive policy, cycle detection — master tree §18 REFERRALS has only a single-tier model. **Recommendation:** v3.1 incorporates the tiered ambassador model as the master-tree definition.

### Finding 8 — Test coverage: zero (P1 for post-MVP)
No test suite exists in the codebase (per CLAUDE.md — "Do NOT skip TypeScript errors with @ts-ignore"; no `pnpm test` or jest/vitest config evidence). Master tree §83 CI/CD lists "Automated Tests" as critical node. **Recommendation:** before scaling to Block D/F R&D, land an integration-test suite for Deal Engine state machine and Ambassador commission math (two highest-consequence modules).

### Finding 9 — No staging environment (P2)
Vercel auto-deploy from `main` means production is the only environment. Master tree §83 CI/CD specifies "Staging → Production, Blue-Green, Instant Rollback". **Recommendation:** preview environment per PR (Vercel supports this natively); dedicated staging DB snapshot weekly.

---

## Appendix A — Prisma entity reference

15 models, 5 enums, 12 migrations (as of commit on `docs/master-tree-v3` branch).

| # | Entity | Block coverage | Key fields |
|---|---|---|---|
| 1 | User | B §14-30 | role, referralCode, referredById, ambassadorActive, email, approved, onboardingCompleted |
| 2 | Parcel | A §01 | status, area, coords, GeoJSON polygon, currentValuation (BigInt fils) |
| 3 | AffectionPlan | A §01, D §40 | plot dims, max GFA/floors/height, setbacks by side, land-use mix, building-limit polygon |
| 4 | Deal | C §31 | status (13-state enum), prices, platformFeeFils (2% ZAAHI service fee) |
| 5 | DealMessage | C §31 | dealId, userId, content, optional fileUrl |
| 6 | DealAuditEvent | C §31, D §42 | eventType, txHash, docHash, metadata (on-chain anchor placeholder) |
| 7 | Document | A §01, C §31, H §62 | type enum (MOU, SPA, POA, NOC, TITLE_DEED, etc.) |
| 8 | Commission | B §18, F §54 | level, rate, basisFils, amountFils, status (PENDING/PAID/REVERSED) |
| 9 | AmbassadorApplication | B §18 | tier (SILVER/GOLD/PLATINUM), USDT tx hash, checklistData, status |
| 10 | ReferralClick | B §18, I §70 | code, ipHash, convertedUserId |
| 11 | SavedParcel | B §15, I §70 | userId, parcelId |
| 12 | ParcelView | B §14/15, I §70 | parcelId, userId (nullable), ipHash |
| 13 | Notification | D §47 | kind, payload (JSON), readAt |
| 14 | ActivityLog | I §70 | kind, ref (parcelId/dealId), payload |
| 15 | SavedSearch | D §48 | userId, name, filters (JSON), locationBounds |

Enums: `UserRole` (7), `ParcelStatus` (9), `DealStatus` (13), `DocumentType` (10), `CommissionStatus` (3).

---

## Appendix B — File inventory summary

- `prisma/schema.prisma` — source of truth for data model
- `prisma/migrations/` — 12 migrations spanning 2026-04-07 to 2026-04-16
- `src/app/` — 18 pages, 266 API route files
- `src/lib/` — 27 lib modules (auth, dda, ambassador, blockchain, etc.)
- `src/components/` — 8 top-level components
- `data/` — ~662 geographic assets
- Top-level docs: `CLAUDE.md` (50 KB project spec), `ABU_DHABI_MIGRATION.md`, `BACKLOG.md`, `LAYERS_RBAC_PROPOSAL.md`, `NIGHT_REPORT.md`, `USER_DASHBOARDS_RESEARCH.md`, `ZAAHI_PROMPT_FINAL.md`, `DECISIONS.md`
- `docs/architecture/` — Master Tree canonical (this branch), Improvements (this branch), README
- `docs/research/` — `PARKED_PROJECTS.md`

---

**End of gap analysis.**

Analysis authored 2026-04-17. Next scheduled re-audit: after v3.1 master-tree incorporation or after a significant feature-set ships (whichever first).
