# MULTI_ROLE_DISCOVERY — 6-role platform pivot

**Status:** v1.0 discovery · 2026-04-24 · research-branch working document · **pending founder review + question-answers + approval before any execution**

**Author:** ZAAHI engineering agent (research + advisor role) · NOT builder in this turn

**Trigger:** external momentum ahead of plan — top-brokers meeting, Emaar inbound on platform equity pitch, Rudi AED 1M agency wire pending, 5+ developers interested. The founders-only dog-fooding platform needs to support 6 external roles operationally, with ability to migrate to an Abu Dhabi sovereign-cloud substrate soon after.

**Scope:** 6 external roles (BROKER · DEVELOPER · INVESTOR · OWNER · AMBASSADOR · ARCHITECT) plus the existing SUPER_ADMIN (founders). Master Tree participants B1–B8 is the canonical reference frame (§14–§30), and the four pre-existing draft specs ([Spec 02 Invoice](../specs/phase-1/02-INVOICE_COMMISSION_SPEC.md), [Spec 03 Admin Panel + Super-Admin](../specs/phase-1/03-ADMIN_PANEL_SPEC.md), [Spec 04 Feasibility v2](../specs/phase-1/04-FEASIBILITY_CALC_V2_SPEC.md), [Spec 05 Auth Abstraction](../specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md)) plus [§77 Web Platform Architecture v1.2](./77_WEB_PLATFORM_ARCHITECTURE.md) and [§78 G42 Migration Architecture v1.0](./78_G42_MIGRATION_ARCHITECTURE.md) carry most of the groundwork. This document synthesises, surfaces gaps, presents architecture choices, and lists the decisions that only founders can make.

**Not this document's job:** write the implementation specs. After founders answer §10 questions and pick an architecture in §4, separate execution specs (Phase B1 · B2 · B3 per §8) will be drafted.

---

# Table of contents

| § | Title |
|---|---|
| 1 | Executive summary + top 5 decisions + top 5 risks + effort estimate |
| 2 | Current state analysis — honest inventory of what exists |
| 3 | Role-by-role analysis — 7 roles, each with use cases / MVP / KYC / revenue / complexity |
| 4 | Technical architecture options — 3 approaches with pros/cons + recommendation |
| 5 | Multi-role user support — Dymo as ADMIN+AMBASSADOR, broker-as-owner, UI switching |
| 6 | Abu Dhabi migration readiness — what blocks, infra changes, timeline, cost |
| 7 | Compliance matrix — per role KYC / licences / AML / PDPL / audit logs |
| 8 | Execution plan recommendation — Phase B1 / B2 / B3 with dependencies |
| 9 | Risks + unknowns |
| 10 | Questions for founders (numbered, answerable in 2–3 sentences each) |
| 11 | References + sources |

---

# §1 · Executive summary

## 1.1 What the research shows

**The 6-role pivot is 35–40 % built.** The foundation is mostly in place: `User.role` enum already contains `OWNER · BUYER · BROKER · INVESTOR · DEVELOPER · ARCHITECT · ADMIN` (seven roles, of which only ADMIN and BROKER have any code branching today). Auth is approval-centric, not role-centric — every protected API route gates on `user_metadata.approved === true`, and only the admin path (`getAdminUserId()`) reads `User.role`. The Ambassador programme is implemented in the schema + `src/lib/ambassador.ts` but with a significant gap: a three-tier paid membership (SILVER / GOLD / PLATINUM) is documented in CLAUDE.md and drafted in `src/lib/ambassador-plans.ts`, but the `User.ambassadorPlan` column doesn't exist yet, and `awardCommissions()` still uses legacy GOLD-defaults regardless of the ambassador's actual tier. Phase 1 dashboards (2026-04-16) added BROKER-only fields (RERA, BRN) to `/dashboard`, but INVESTOR / DEVELOPER / ARCHITECT paths are enum placeholders with zero UI.

**A parallel white-label multi-tenancy architecture is already drafted** in [§77 v1.2](./77_WEB_PLATFORM_ARCHITECTURE.md) — shared DB + RLS for Starter/Pro tiers, dedicated DB for Enterprise, 15 tenant-scoped models + 4 shared. That's *white-label SaaS for brokerages*, not the same thing as the 6-role pivot — the pivot is about role-level functionality inside ZAAHI core, while §77 is about tenantisation for white-labelled brokerage deployments. Both pressures point to the same fork: do we RBAC-ify the User model now (single ZAAHI-core tenant, many roles) or wait until tenantisation forces the question (many tenants, many roles).

**Abu Dhabi migration is separately drafted** as [§78 G42 Migration Architecture v1.0](./78_G42_MIGRATION_ARCHITECTURE.md), targeting a Month 9–10 big-bang cutover from Vercel + Supabase Frankfurt to Core42 Abu Dhabi. Spec 05 Auth Abstraction and Spec 06 Secrets Rotation are the pre-cutover hard blockers. Neither requires the 6-role pivot to land first, and the 6-role pivot does not require migration to land first — but PDPL residency story becomes materially stronger once both have landed.

## 1.2 Recommended approach (1–2 sentences)

**Option C — hybrid schema** (§4.3): keep `User.role` as the dominant role (for UI + default-permission resolution) and add a `UserRole` junction table plus six lightweight role-profile tables (`BrokerProfile`, `DeveloperProfile`, `InvestorProfile`, `OwnerProfile`, `AmbassadorProfile`, `ArchitectProfile`) linked 1-to-1 by userId. This keeps `getApprovedUserId` fast, lets a user hold multiple roles without an N² permission-check rewrite, isolates licence / KYC documents per role, and survives the tenantisation wave later (each profile table just gets a `tenantId` column at §77 time) — at roughly half the migration cost of the fully-normalised alternative.

## 1.3 Top 5 critical founder decisions

These are ordered by how many downstream decisions they unblock. None of them are code-level — they're strategy, scope, and priority calls only founders can make.

1. **Pivot sequencing.** Is the order BROKER → OWNER → AMBASSADOR → DEVELOPER → INVESTOR → ARCHITECT, or different? Specifically: does the AED 1M Rudi wire commit us to BROKER-first (to power the agency's first-deal pipeline), or can the order follow external-demand signals (developers knocking on Emaar's wake, investors opening via pitch-deck)? See Q-1 to Q-4 in §10.
2. **Ambassador three-tier rollout timing.** The spec is documented, the Application table captures `plan`, but the User column + tier-aware `awardCommissions()` are unbuilt. Do we ship three-tier now (before the first paid ambassador appears), or defer to Phase B2? See Q-5 to Q-7.
3. **KYC / licence verification depth.** For BROKER verify RERA licence + BRN (manual now, API later?) — what depth of verification is required on Day 1 versus Day 90? Same for DEVELOPER (DLD + DET + Oqood), INVESTOR (accreditation threshold), ARCHITECT (SOE + Dubai Municipality). The range on this is a 4-week engineering difference. See Q-11 to Q-16.
4. **Abu Dhabi migration vs. 6-role pivot ordering.** Both are on the board. They can be done in either order, but doing them in the same quarter doubles engineering surface area. Which comes first — the role rollout on Vercel / Supabase, or the Core42 cutover, then role rollout on G42? See Q-20 to Q-22.
5. **Platform price model per role.** For each role, what's the monetisation — free (loss leader), freemium (feature gate), SaaS subscription, per-transaction fee, revenue share? Ambassador is already priced (1 k / 5 k / 15 k AED lifetime). BROKER, DEVELOPER, INVESTOR, ARCHITECT are open. See Q-23 to Q-27.

## 1.4 Top 5 risks identified

1. **Schema migration risk.** Adding one `User.ambassadorPlan` column is trivial. Adding six role-profile tables + a junction table + backfilling existing users with their implied roles is a real migration with downstream code changes in ~30 API routes. On the shared production DB (no separate staging), this is execution risk that wants a staging replica first — and ZAAHI doesn't have one today. See §9.1.
2. **Compliance risk — RERA / DLD verification as onboarding gates.** If we open BROKER onboarding without real-time RERA licence verification, unlicensed brokers can list. Unlicensed listings are a RERA violation for us, not just for them. The RERA Services Section provides a licence lookup but no public API (verification is a form-submit, manual). Building a verified-broker onboarding on Day 1 is ~1 eng-week; honest claim-it-ourselves with a promise-to-verify is ~2 eng-days. The latter is what most platforms do; the former is what the market probably expects. See §9.2 and §7.
3. **PDPL cross-border transfer risk.** Full PDPL enforcement lands 2027-01-01. ZAAHI today stores UAE citizen PII (email, phone, RERA licence data, title-deed scans) on Supabase Frankfurt — that's a cross-border transfer and requires either UAE-approved Standard Contractual Clauses with Supabase Inc. (US Delaware C-corp, a US-CLOUD-Act-compellable entity) or PDPL-approved binding corporate rules, neither of which is in place. The Abu Dhabi migration solves this; until then, we are one regulatory audit away from a finding. See §6 and §9.3.
4. **Bus factor on the ambassador programme.** Commission calculation, tier-aware rates, self-referral prevention, payment-method recording — all live in `src/lib/ambassador.ts` (452 lines) and `awardCommissions()` inside a Prisma transaction. A three-tier upgrade touches this file. If the test coverage is weaker than the production impact, one bad merge zeroes out L1/L2/L3 commissions for an open deal. See §9.4.
5. **Role-switching UX complexity.** Dymo is founder (SUPER_ADMIN) + an ambassador (referring agency deals) + a broker (eventually, post-agency-launch). If the UI doesn't clearly surface which role-hat the user is wearing on which screen, permission-check bugs become experience bugs. Huspy's and Bayut's broker-centric UIs sidestep this by having one role per user; our multi-role case is higher design difficulty. See §5 and §9.5.

## 1.5 Estimated total effort

Honest, pessimistic, assuming one engineering agent (me) + one founder reviewer, and assuming Abu Dhabi migration runs in parallel on the migration track:

| Track | Scope | Effort |
|---|---|---|
| **Phase B1** (schema + Ambassador tier + BROKER first-class) | User migration, 3-tier ambassador finish, BROKER onboarding + RERA field polish, role-aware dashboard fork | **3–4 eng-weeks** |
| **Phase B2** (OWNER + AMBASSADOR full, DEVELOPER MVP) | OWNER listing flow full wiring, Ambassador three-tier UI + payout admin, DEVELOPER application + dashboard MVP | **4–5 eng-weeks** |
| **Phase B3** (INVESTOR + ARCHITECT + polish) | INVESTOR data room + NDA flow, ARCHITECT service marketplace, onboarding KYC per-role finish, audit log + PDPL controls | **5–7 eng-weeks** |
| **Per-role MVP across the board** | All 6 roles to basic functional state (KYC stub, dashboard, permissions wired, not polished) | **~12 eng-weeks total** |
| **Polished + audit-ready for each role** | Full KYC verification integration, per-role invoicing, compliance surface, Super-Admin oversight | **~18–22 eng-weeks total** |
| **Abu Dhabi migration (parallel track)** | Spec 05 + Spec 06 + Core42 provisioning + cutover + observation | **6–8 eng-weeks** (per §78 v1.0) |

A single agent sequentially: 18–22 eng-weeks ≈ **4.5–5.5 months** for the role pivot alone, assuming no re-scoping. Running Abu Dhabi migration in the same window adds 6–8 weeks but is largely orthogonal (migration engineering is infra work, role pivot is app work). Realistic total: **5–7 months from go to full-6-role polished**, with BROKER + OWNER + AMBASSADOR operational by **~8–12 weeks** if sequenced front-loaded.

The counterpoint: a lot of the current codebase is already *close* to what we need — profile fields exist on User, protected routes gate on approval uniformly, Prisma + Supabase RLS are in place. It's the role-specific dashboards + KYC verification surfaces + per-role invoicing that eat the weeks. If founders accept "Day-1 honest MVP" (self-declared licence numbers, manual admin verification) the timeline is ~8 weeks. If they want API-verified licences + automated KYC + compliance-audit-ready before the first external user lands, it's ~20 weeks.

---

# §2 · Current state analysis

Honest inventory, from the live codebase as of commit `e70f311` on `research/vision-and-competitors-2026-04-19`.

## 2.1 What exists — schema

[`prisma/schema.prisma`](../../prisma/schema.prisma) is the canonical source. Relevant to the 6-role pivot:

**`User` model (lines 90–143):** single-table, Supabase-auth-backed, field set reflects a profile-oriented rather than RBAC-oriented design.

- Identity: `id` (mirrors Supabase auth UUID), `email` (unique), `role` (UserRole enum, single value), `name`, `phone`, `createdAt`.
- Ambassador: `referralCode` (unique 8-char), `referredById` (immutable direct upline), `referredAt`, `ambassadorActive` (bool).
- Profile (Phase 1 2026-04-16): `avatarUrl`, `bio`, `timezone`, `language`, `currency`, `companyName`, `reraLicense` (BROKER), `brnNumber` (BROKER), `lastSeenAt`, `notificationPrefs` (JSON), `onboardingCompleted`.
- Indexes: `@@index([role])`, `@@index([referredById])`.
- Relations: `parcels` (ParcelOwner), `dealsAsSeller`, `dealsAsBuyer`, `dealsAsBroker`, `dealMessages`, `referredBy`/`referrals`, `commissions`, Phase 1 dashboard relations.

**`UserRole` enum (lines 17–25):** `OWNER · BUYER · BROKER · INVESTOR · DEVELOPER · ARCHITECT · ADMIN`. Note: **no SUPER_ADMIN separate from ADMIN**. In CLAUDE.md's Admin Panel Spec (03), Super-Admin is a *mode* on founder accounts (founder email + `role = ADMIN`), not a distinct enum value.

**Ambassador-specific models:**
- `Commission` (lines 326–352) — immutable ledger: `dealId`, `ambassadorId`, `level` (1/2/3), `sourceUserId`, `amountFils`, `basisFils`, `rate` (Decimal 5,4), `status` (`PENDING | PAID | REVERSED`), `payoutMethod`, `payoutRef`, timestamps. Unique composite `[dealId, ambassadorId, level, sourceUserId]` prevents duplicate accrual. **No `tier` column — rate is stored as decimal, not tier name.**
- `AmbassadorApplication` (lines 360–384) — `plan` (string SILVER/GOLD/PLATINUM), `txHash`, `status` (loose string default `"PENDING"`, not an enum), admin review fields (approved/rejected by/at, rejection reason), `linkedUserId` (populated on approval), `checklistData` (JSON).
- `ReferralClick` (lines 388–398) — click analytics on `/r/[code]` landings.

**Non-role-specific, touched by the pivot later:**
- `Parcel`, `Deal`, `DealMessage`, `DealAuditEvent`, `AffectionPlan`, `Document`, `Building` (digital twin) — all currently tenant-less, single-company-scoped.
- Phase 1 dashboard models (`SavedParcel`, `ParcelView`, `Notification`, `ActivityLog`, `SavedSearch`) — per-user, no role gating beyond the `userId` foreign key.

## 2.2 What exists — auth + permission flow

[`src/middleware.ts`](../../src/middleware.ts) (66 lines) gates every `/api/*` request behind a Bearer token, with three explicit allow-lists:

- `PUBLIC_API`: `/api/auth` (reserved), `/api/notify-admin` (public "request access" form), `/api/ambassador/register` (public ambassador application).
- `/api/layers/*` public GET/HEAD (public geographic data — no PII, no prices).
- `/api/ambassador/qr/[code]` public GET (QR image generation; referral code itself is the share token).

[`src/lib/auth.ts`](../../src/lib/auth.ts) (84 lines) provides three gates:

- `getSessionUserId(req)` — Bearer token validates against Supabase Auth, returns user id. No approval check.
- **`getApprovedUserId(req)` — the primary gate for sensitive data.** Validates session AND `user_metadata.approved === true`. Returns null if unapproved.
- `getAdminUserId(req)` — approved + (founder email in hardcoded list OR `User.role === ADMIN`). The two founder emails are `zhanrysbayev@gmail.com` and `d.tsvyk@gmail.com`.

[`src/components/AuthGuard.tsx`](../../src/components/AuthGuard.tsx) (66 lines) is the client-side mirror: reads Supabase session, signs out + redirects if unapproved, waits for ready state before rendering children. Every protected page wraps in `<AuthGuard>`.

**The auth layer has no role gate beyond ADMIN.** No code path does `if (user.role === "INVESTOR")`. Role is primarily a UI flag today, used to show/hide BROKER-specific profile fields on `/dashboard`.

## 2.3 What exists — API surface

From the Explore agent's inventory: 40+ API routes under `src/app/api/`, plus ~250+ `/api/layers/` routes for public geographic data.

Grouped by namespace:

- **`/api/admin/*`** (4 routes) — admin-only (founder + ADMIN role): approve/reject ambassador applications, admin check.
- **`/api/ambassador/*`** (6 routes) — register (public), activate, stats, tree, commissions, qr (public).
- **`/api/deals/*`** (5 routes) — list / create offer / update status / deal-level messages. All `getApprovedUserId` gated; no role filter.
- **`/api/me/*`** (14 routes) — profile, plots owned, favourites, notifications, saved searches, onboarding completion. Each `getApprovedUserId`; writes are scoped to the caller.
- **`/api/parcels/*`** (11+ routes) — parcel listing, submit, detail, admin review, affection plan refresh, title-deed parse. Submit infers role (BROKER vs. OWNER) from a request flag.
- **`/api/buildings/*`** (2 routes) — the digital-twin Building layer endpoints (landed 2026-04-24).
- **`/api/users/sync`** — called on signup to mint the Prisma User row, consume `zaahi_ref` cookie for ambassador attribution.
- **`/api/modules`** — lists Python files in `core/`. Scaffolding for backend agents. Not a feature-flag system.
- **`/api/chat`, `/api/cat/chat`, `/api/land-monitor/*`, `/api/notify-admin`** — AI + notification support.
- **`/api/layers/*`** (~250 routes) — public geographic data, no PII.

**Key posture:** every non-layer route gates on `getApprovedUserId` uniformly. Only 4 routes require admin (`getAdminUserId`). No route checks `user.role === "BROKER"` to scope results. The `/api/parcels/submit` route infers role from a request parameter — this is the closest the codebase comes to role-aware logic beyond admin.

## 2.4 What exists — dashboards / protected routes

From `src/app/*` (non-API):

| Path | Guarded | Role-aware? | Notes |
|---|---|---|---|
| `/` | No | — | Auth page (signin / signup tabs) |
| `/dashboard` | AuthGuard | BROKER-only RERA+BRN fields | 1,822-line profile form |
| `/ambassador` | AuthGuard | No | Ambassador stats / tree / commissions dashboard |
| `/ambassador-terms` | No | — | Legal |
| `/admin/*` | Layout-level gate via `/api/admin/me` | Admin-only | Ambassador application review etc. |
| `/join` | No | — | Public ambassador application |
| `/register`, `/login` | No | — | Public auth pages |
| `/disclaimer`, `/terms`, `/privacy` | No | — | Legal |
| `/deals`, `/deals/[id]` | AuthGuard | Local seller/buyer/broker UI | Per-deal role variable, not User.role |
| `/parcels/map`, `/parcels/[id]`, `/parcels/new`, `/parcels/land-monitor` | AuthGuard | No | Layer lock badges are UX-only (Phase 3 will enforce) |
| `/parcels/al-fahidi-fort-poc`, `/parcels/candidate-sample-poc` | AuthGuard | No | POC demos |
| `/r/[code]` | No | — | Referral landing, cookie-sets + redirects |
| `/settings` | AuthGuard | Unknown | Not inspected in depth |

**Net effect:** **one** dashboard with role-aware rendering (`/dashboard` for BROKER), and the admin area. Every other page is role-agnostic.

## 2.5 What exists — Ambassador single-tier vs three-tier gap

The Ambassador programme is the largest concrete pre-existing pivot surface. CLAUDE.md (lines 508–586) documents the three-tier paid membership:

| Tier | AED | USDT (TRC-20) | L1 | L2 | L3 | Perks |
|---|---:|---:|---:|---:|---:|---|
| SILVER | 1,000 | 272 | 5 % | 2 % | 1 % | Platform access, referral link, dashboard |
| GOLD | 5,000 | 1,361 | 10 % | 4 % | 1 % | Silver + priority plots + site-plan PDFs |
| PLATINUM | 15,000 | 4,084 | 15 % | 6 % | 1 % | Gold + founder line + co-branding |

Lifetime membership, one-time USDT payment, 2 % ZAAHI service fee on deal value is the commission basis.

**What's in code vs. spec:**

| Aspect | Spec | Code reality |
|---|---|---|
| 3 tiers defined | yes | yes — `ambassador-plans.ts` has `PLAN_COMMISSION_RATES` + `PLAN_PRICES_AED` + `PLAN_PRICES_USDT` |
| User.ambassadorPlan column | implied by spec | **missing** — no field to freeze which tier a user purchased |
| Commission.tier freeze | implied | **missing** — `Commission` stores `rate` (decimal) but not the tier name at accrual time |
| awardCommissions() tier-aware | yes | **partial** — reads legacy `COMMISSION_RATES` (GOLD defaults) with a TODO comment |
| AmbassadorApplication.plan | yes | yes — captured at application time, never propagated to User |
| 2 % service fee | yes | yes — `ZAAHI_SERVICE_FEE_RATE = 0.02` |
| Referral code immutability + cycle detection | yes | yes — `src/lib/ambassador.ts` fully implements |
| Skip-inactive policy | yes | yes — `walkUpline()` skips inactive without consuming slot |
| Immutable commission rows | yes | yes — enforced by convention; Commission never updated except `status`, `payoutMethod`, `payoutRef`, `paidAt` |

**Gap to close for Ambassador Phase B1:** add `User.ambassadorPlan` (enum SILVER/GOLD/PLATINUM), add `Commission.tier` (same enum, frozen at accrual), update `awardCommissions()` to read the ambassador's plan before lookup. ~2–3 eng-days including a fresh migration + backfill of existing ambassador rows (currently 0 in production).

## 2.6 What's stub / scaffold / not connected

Things that look implemented but aren't load-bearing:

- **`/api/modules`** returns Python file list; no consumer front-end.
- **UserRole enum INVESTOR/DEVELOPER/ARCHITECT/BUYER** — enum values accepted, no UI surfaces or API routes branch on them.
- **Layer lock badges** on `/parcels/map` — visible as UX but do nothing on click; Phase 3 enforcement (`useAccess()` not yet built).
- **`src/app/settings`** — unknown content, not inspected.
- **SUPER_ADMIN** — referenced in Spec 03 as a mode, not a distinct role; the pivot brief refers to SUPER_ADMIN as a separate seventh role. Decision point (Q-8).
- **Tenant model** — documented in §77 v1.2 but not in `prisma/schema.prisma` today.

## 2.7 Honest summary

Schema + auth middleware are close to ready for a multi-role pivot. The gaps are:

1. `User.ambassadorPlan` field (days)
2. Role-specific profile tables or equivalent (1–2 weeks)
3. Role-aware route scoping / permission checks (2–3 weeks)
4. Per-role dashboards (2–4 weeks depending on role count)
5. KYC / licence verification per role (2–8 weeks depending on depth)
6. Audit log + PDPL controls (1–2 weeks if append-only via existing `ActivityLog`, more if a dedicated audit model)

None of the individual pieces are scary. The combinatorics are. Founder decisions in §10 narrow the decision space by ~60 % and unblock execution.

---

# §3 · Role-by-role analysis

Each role analysed in a uniform format: Master Tree mapping, top use cases, MVP vs. full feature set, dashboard needs, KYC / licensing in UAE, data-access permissions, revenue model, competitor reference, complexity estimate.

Complexity key: **S** = ≤ 3 eng-days · **M** = 1–2 eng-weeks · **L** = 2–4 eng-weeks · **XL** = 4–8 eng-weeks.

## 3.1 BROKER

- **Master Tree:** §17 Brokers & Agencies (Participants B3)
- **UAE regulatory:** RERA broker card — cannot be held by individual, must be employer-sponsored (no freelance brokers in Dubai). 6-step process (employer sponsorship · document submission · CTREB training 32 h · 100-question exam 70 % pass · background check · card issuance), 3–6 weeks, AED 10,000–13,000. Annual renewal AED 510–1,000. [`dubailand.gov.ae/en/rera`, retrieved 2026-04-24](https://dubailand.gov.ae/en/rera). Verification: RERA Services Section web form (name lookup), **no public API** — our options are self-declared + manual admin verification, or build a scraper/partnership with RERA.

### Core use cases (top 5)
1. Build listing inventory (submit plots on behalf of owners, with owner consent).
2. Manage client CRM (buyer profiles, saved searches, matched parcels, contact timeline).
3. Drive deals (offer submission, counter-offer, closure — as broker-of-record for seller or buyer).
4. Commission tracking (what's been earned, what's due, per deal, per period).
5. Market intelligence (price trends, DDA affection-plan access, feasibility on behalf of client).

### MVP vs. full
**MVP (Phase B1):** RERA licence field on profile (already exists), broker-flow submit (already exists in `/api/parcels/submit` via flow param), broker-deal view on `/deals`, commission earnings view on `/ambassador` (current) + dedicated `/broker/commissions` page.

**Full (Phase B2+):** structured broker agency linkage (broker belongs to agency, agency belongs to ZAAHI brokerage-relationship tier), CRM (`BrokerClient` table — buyers the broker is serving, contact log), deal-pipeline Kanban, per-period invoice generation, RERA API verification (if partnership or scraper lands), Trakheesi advertising permit linkage.

### Dashboard needs
New route `/broker` or a role-switched `/dashboard?role=broker`: active deals, pending deals, commission earnings YTD, RERA licence status + expiry (renewal reminder), clients list, saved searches, CTREB renewal tracker.

### KYC / verification
MVP: self-declared RERA licence number, BRN (broker registration number), uploaded RERA card PDF, admin approves within 24–72 h → sets `User.role = BROKER`, `User.approved = true`. Full: RERA card auto-verification (needs API or scraper), annual renewal reminder with auto-suspend if lapsed.

### Data access permissions
- Read: all LISTED parcels, own-agency parcels in any state, own deals, own clients, own commissions.
- Write: create parcel (broker flow), update own listings, create deals as broker-of-record, add clients.
- Forbidden: other brokers' clients, other brokers' commissions, non-consented owners' parcels.

### Revenue model
2 % service fee on deal value (ZAAHI service fee, per CLAUDE.md ambassador rules — same base). Broker earns their own commission from the traditional 2 % agency commission on sale (market standard). **Q to founder:** does ZAAHI charge brokers a separate SaaS fee on top of the 2 % service fee on closed deals? See Q-23.

### Competitor reference
Huspy (founded 2020, $47 M funded) operates an in-house-broker model — all Huspy brokers are Huspy employees. Bayut + PropertyFinder are classified-listings models — brokers pay per-listing or subscription. ZAAHI's position sits between: we host brokers as independent agents (like Bayut/PF) but offer deal-engine + commission infra they don't (approaching Huspy's model without employing brokers).

### Complexity
- MVP: **M** (~1–2 eng-weeks) — mostly wire-existing; schema adds are minimal
- Full: **L** (~3–4 eng-weeks)
- Full + RERA API verification: **XL** (~6–8 eng-weeks, most of the risk lives in the integration with a non-API-first regulator)

## 3.2 DEVELOPER

- **Master Tree:** §19 Developers (Participants B4)
- **UAE regulatory:** 3-stage process — DET commercial trade licence (activity = "real estate development") → land ownership via registered title deed → per-project Oqood registration with DLD. Ongoing: escrow account management, quarterly RERA/DLD progress reports, milestone audits by approved consultants. Setup: AED 15,000–50,000 per project; ADGM or DIFC SPV alternative $2,500–6,000 USD annual. [`diac.ae/blog/real-estate-development-license-dubai/`, retrieved 2026-04-24](https://diac.ae/blog/real-estate-development-license-dubai/).

### Core use cases (top 5)
1. Bulk listing of off-plan inventory (per project, payment plans, expected handover).
2. Partnership API / bulk data feed (developer → ZAAHI inventory sync for listings.)
3. Lead management (buyers interested in their projects).
4. Investor relations portal (construction progress, fund drawdowns, site photos).
5. Agency partnership routing (invite brokers to sell inventory).

### MVP vs. full
**MVP (Phase B2):** developer-role profile (company name, DDA licence number, Oqood references, escrow account detail), developer-flow parcel submit that allows bulk (CSV / API import), developer dashboard with inventory overview + lead list.

**Full (Phase B2-B3):** construction-progress portal, investor-relations view (document room, updates), partnership API (OAuth client credentials, webhook inventory push), metaverse showroom integration (per Master Tree §39), payment-plan builder + buyer-affordability engine, escrow-status dashboard.

### Dashboard needs
New route `/developer`: project portfolio, inventory by project (units, status, price), leads by project, agency partnerships, scheduled milestones, escrow account balance (if bank integration lands).

### KYC / verification
MVP: self-declared DET licence, DLD developer registration, upload company registration + Oqood references; admin approves → `role = DEVELOPER`. Full: bank / escrow integration per MTree §22 Banks, DLD API for developer-status real-time.

### Data access permissions
- Read: own-project inventory, leads on own projects, ZAAHI-sourced market intelligence (aggregate).
- Write: create/update own projects, bulk-import inventory, respond to leads.
- Forbidden: other developers' inventory, other developers' leads, buyer PII beyond anonymised / lead-appropriate fields.

### Revenue model
SaaS tier (AED 5–25 k / month per §77 Web Platform v1.2 Enterprise tier range). OR per-transaction fee on closed deals (0.25 %–0.5 % of deal value above the 2 % service fee). OR partnership revenue share (if Emaar-scale partners, bespoke). **Q to founder:** pricing model — see Q-24 + Q-25.

### Competitor reference
Emaar, Damac, Sobha, Meraas all run proprietary developer portals. ZAAHI's position is **platform-as-a-service** for mid-tier developers (20–500 unit projects) who can't afford to build bespoke. Large developers likely use us as a distribution channel, not an inventory system.

### Complexity
- MVP: **L** (~2–3 eng-weeks) — more fields, more UI, partnership API is new surface
- Full: **XL** (~6–10 eng-weeks — escrow integration + partnership API + investor-relations portal are each 1-2 weeks)

## 3.3 INVESTOR

- **Master Tree:** §15 Buyers & Investors (Participants B2)
- **UAE regulatory:** no platform-level "accredited investor" verification required for real-estate purchase (unlike securities). For REIT-style / fractional instruments (not in scope for Phase B1), ADGM / DIFC have qualified-investor thresholds — ADGM QI = net assets ≥ USD 2 M for individuals, DIFC = broadly similar. AML / source-of-funds per Federal Decree-Law 20/2018 applies to transactions; KYC tier escalates by ticket size. [`tamimi.com/law-update-articles/owning-properties-in-dubai-by-an-adgm-entity/`, retrieved 2026-04-24](https://www.tamimi.com/law-update-articles/owning-properties-in-dubai-by-an-adgm-entity/).

### Core use cases (top 5)
1. Data-room access (institutional-grade DD materials per plot — title deed scan, affection plan, feasibility PDF, price history, comparable transactions).
2. Investor dashboard (watchlist, pipeline, portfolio if already invested).
3. Direct offer submission (buy-side of deal engine).
4. NDA flow (required before accessing Enterprise-tier data rooms or Developer investor-relations portals).
5. Bulk DD report export (PDF package of all due-diligence materials for a plot, for offline review / advisor sharing).

### MVP vs. full
**MVP (Phase B2):** investor-role profile (investment focus — land / off-plan / REIT; ticket size range; sector preference), investor dashboard with watchlist + pipeline + saved searches; NDA-click-through for accessing deeper data.

**Full (Phase B3):** data-room per plot with gated access, DD bulk export, portfolio tracking (plots purchased or optioned), AI-recommendation engine (per MTree §41 Falcon agent), KYC tier verification (for non-individual buyers — company-structure diligence), fractional / REIT-mode (deferred to Phase C).

### Dashboard needs
New route `/investor`: watchlist, pipeline (deals in progress as buyer), portfolio (owned parcels / options), opportunities feed (ZAAHI-curated match with profile), data-room access log (NDAs signed, plots viewed).

### KYC / verification
MVP: self-declared profile (individual/institutional, ticket-size range, sector). Full: KYC tier by ticket size — individual buyer Emirates ID + passport (basic KYC), institutional buyer company registration + UBO verification + AML screening. Integration with AML databases (Dow Jones Risk, RDC) is M–L per vendor.

### Data access permissions
- Read: LISTED parcels (same as BROKER/OWNER), NDA-gated Enterprise data rooms, Developer investor-relations portals (NDA-gated), public DD materials.
- Write: saved searches, watchlist, offers (buy-side deals).
- Forbidden: other investors' portfolios, other investors' watchlists, Developer proprietary data not opted-in.

### Revenue model
**Free tier** (loss leader — most UAE platforms don't charge investors directly; developer-side monetisation subsidises). **Optional institutional tier** (AED 2–10 k / mo SaaS for prioritised opportunities + enhanced DD export + dedicated relationship manager). OR per-successful-close fee (buy-side 0.5 % of deal value — small, but closes the circle). **Q to founder:** free + optional institutional SaaS is the standard; Q-26 asks whether to charge institutional at all.

### Competitor reference
UAE investor platforms are mostly developer-run (Emaar Investor Portal, Damac Capital). Third-party platforms (PRYPCO fractional, Stake, SmartCrowd) target retail fractional investors — different segment. ZAAHI as an investor-side platform sits in a sparse market; competitive advantage = Falcon AI + Metaverse walkthrough + cross-developer inventory aggregation.

### Complexity
- MVP: **M** (~1–2 eng-weeks) — profile + watchlist + NDA click-through
- Full: **L–XL** (~4–6 eng-weeks) — data-room + KYC tiers + AI recommendation are real features

## 3.4 OWNER

- **Master Tree:** §14 Owners (Participants B1)
- **UAE regulatory:** property ownership — Emirates ID + title-deed verification. Land sale: DLD transfer, escrow if required by deal structure. No "owner licence" — every natural or legal person with a title deed is a potential owner. AML / source-of-funds (sell-side) applies for sales above AED-threshold (FATF / federal AML rules).

### Core use cases (top 5)
1. List owned land / property for sale (with or without a broker).
2. Valuation snapshot (get an AI + market-data estimate on their parcel).
3. Manage offers (receive, counter, accept, reject).
4. Signing + sale consent (digital signature on the sale consent form).
5. Anti-fraud watchlist (receive alert if someone attempts to list their plot without consent).

### MVP vs. full
**MVP (Phase B1-B2):** owner-flow submit (already exists), owner dashboard showing their parcels + offers + active deals, offer notifications (exists in notification scaffolding), anti-fraud alert on unauthorised listing attempts.

**Full (Phase B2-B3):** Cat advisor integration (AI guidance on pricing / timing / DD), biometric / UAE-Pass verification (per MTree §14), sale-consent e-signature (legal validity — DIFC e-signature standards apply), JV / partial-sale flows.

### Dashboard needs
Already exists as `/dashboard` + `/me/plots`. Needs: a cleaner "my properties" list, offer inbox, active-deal tracker, Cat advisor entry point. This is the lightest net-new work.

### KYC / verification
MVP: Emirates ID upload + title-deed upload per parcel; admin cross-reference with DLD (currently manual). Full: UAE-Pass integration (automated Emirates ID verification), DLD title-deed API (if/when available — currently no public API).

### Data access permissions
- Read: own parcels, offers on own parcels, own deals, Cat advisor outputs.
- Write: update own parcel price/status (already at `PATCH /api/parcels/[id]` with ownership check), accept/reject offers, add brokers to own listings.
- Forbidden: other owners' parcels / offers / deals.

### Revenue model
Free (loss leader — owner is supply-side, we need supply). Optional premium tier: anti-fraud monitoring (AED 500–2,000 / year per parcel), Cat advisor session (AED 500 one-off), sale-package concierge (AED 5,000 flat per successful closure). **Q-27:** is any of this paid-tier, or is the full owner surface free?

### Competitor reference
No direct analogue — UAE classifieds (Bayut / PF) treat owners as passive listing-submitters; developer platforms have no owner flow. ZAAHI's owner-first Phase 1 positioning is the current differentiator.

### Complexity
- MVP: **S–M** (~3–7 eng-days) — mostly already built
- Full: **L** (~3–4 eng-weeks) — biometric + e-signature + Cat advisor add real surface

## 3.5 AMBASSADOR

- **Master Tree:** not explicitly in §14–§30 Participants block; adjacent to §58 Growth (Referral Programme per Block H). CLAUDE.md documents the three-tier paid membership (verbatim reproduced in §2.5 above).
- **UAE regulatory:** referral / affiliate programmes — no bespoke UAE regulatory regime, but payout flows through AML if aggregate payouts cross thresholds. TRC-20 USDT payments — UAE's VARA (Virtual Assets Regulatory Authority) covers VASPs, not end-user transfers; we are not the VASP.

### Core use cases (top 5)
1. Purchase lifetime membership (SILVER / GOLD / PLATINUM) via USDT TRC-20.
2. Share referral link / QR code.
3. Track downline (L1 / L2 / L3 — who's joined, who's closed deals).
4. Track commission earnings (PENDING / PAID / REVERSED, per deal, per tier-rate).
5. Receive payout (every 30 business days post-deal-complete, minimum AED 1,000).

### MVP vs. full
**MVP (Phase B1):** three-tier membership with actual tier-aware rates at commission time. This means: ship `User.ambassadorPlan`, ship `Commission.tier` freeze, update `awardCommissions()` to read user's plan before lookup, update admin UI to mark payout per tier, update `/ambassador` dashboard to show current tier + L1/L2/L3 rates for that tier.

**Full (Phase B2-B3):** automated USDT payout (Network International or similar — currently manual per Spec 02 v1), tier-upgrade flow (SILVER → GOLD → PLATINUM with pro-rated pricing), mutual-referral conflict UI (already prevented in code — `wouldCreateCycle()`; needs UX surface for edge cases), co-branded landing pages for PLATINUM tier (per CLAUDE.md perks).

### Dashboard needs
Already exists at `/ambassador`. Phase B1 adds: tier badge, tier-specific rates displayed, tier-upgrade CTA, current-month / prior-month earnings breakdown per L1/L2/L3, payout history. Phase B2+: co-branded materials download (PLATINUM), founder-line contact form (PLATINUM).

### KYC / verification
MVP: USDT tx-hash verification (admin checks `TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7` wallet for inbound), approves application → activates ambassador (already implemented). Full: automated tx-verification via Tronscan API (~1 eng-day add).

### Data access permissions
- Read: own referral code / QR / link, own downline tree (no PII beyond name + join date, per spec), own commissions.
- Write: activate ambassador mode (one-time, idempotent), share referral code.
- Forbidden: other ambassadors' downlines, other ambassadors' commissions, raw PII of downline (names only, no email/phone per current implementation).

### Revenue model
**One-time USDT payment for lifetime membership** — AED 1,000 / 5,000 / 15,000 by tier. ZAAHI takes 100 % of the membership fee (no recurring). Commission sharing on deal-complete is per the tier-specific rates (SILVER 5/2/1, GOLD 10/4/1, PLATINUM 15/6/1). Base = 2 % ZAAHI service fee on deal value.

### Competitor reference
UAE real-estate referral programmes are mostly informal (agent-to-agent bounties). Formal three-tier paid-membership referral programmes are rare — most comparable is MLM-adjacent (Herbalife, Amway) which is not the intended positioning. **Founder should explicitly position** as "paid-curator" network, not MLM, to avoid regulatory grey zone (see Q-12).

### Complexity
- MVP tier upgrade: **S** (~3–5 eng-days — schema migration + `awardCommissions` update + dashboard polish)
- Full: **M** (~1–2 eng-weeks — automated payout + tier upgrade flow + co-branded pages)

## 3.6 ARCHITECT

- **Master Tree:** not in §14–§30 (reserved for "Participants B1-B8", which is 8 types: owners, buyers, brokers, developers, banks, legal, government, appraisers). ARCHITECT is a **new role proposed by the pivot** — architect-as-service-provider. Adjacent to §30 Appraisers (B8) in structure.
- **UAE regulatory:** architect practice — SOE (Society of Engineers) membership + Dubai Municipality DM approval + PQE (Professional Qualification Exam) 70 % pass required. Bachelor's in architecture + 3 years post-graduate + UAE MoFA attestation. Individual practice generally not allowed — architect must be linked to a registered consultancy office. [`soeuae.ae`, retrieved 2026-04-24](https://www.soeuae.ae/en/Default.aspx). [`dmcdubai.com/how-to-register-society-of-engineers-membership/`, retrieved 2026-04-24](https://www.dmcdubai.com/how-to-register-society-of-engineers-membership/).

### Core use cases (top 5)
1. Offer architectural services (design, feasibility, consultancy) via a marketplace.
2. Respond to owner / developer briefs (fixed-price or hourly).
3. Showcase portfolio (prior projects with images).
4. Bill clients (invoicing flow integrated with Spec 02).
5. Integrate with ZAAHI Feasibility (provide expert-reviewed feasibility reports for a premium above AI-generated).

### MVP vs. full
**MVP (Phase B3):** architect-role profile (SOE membership, DM licence, consultancy office affiliation), portfolio upload (images + project descriptions), service-listing marketplace (`/architects` index), brief-matching via tag search.

**Full (Phase B3+):** brief-response workflow (owner/developer posts brief → architects bid → award → deliverable upload + review), integrated feasibility collaboration (architect-reviewed feasibility = premium Spec 04 variant), recurring retainer contracts, review + rating system, certifications on-file (BIM, sustainability, etc.).

### Dashboard needs
New route `/architect`: portfolio (public + private drafts), active briefs, closed briefs + ratings, revenue YTD, SOE / DM licence status + renewal reminder.

### KYC / verification
MVP: self-declared SOE / DM licence + consultancy-office affiliation; admin approves. Full: SOE licence verification (SOE has no public API; LinkedIn-style public profile might suffice), DM DM-approval PDF scan.

### Data access permissions
- Read: public briefs, accepted briefs, own clients, own invoices, own portfolio.
- Write: create portfolio items, respond to briefs, deliver work, bill clients.
- Forbidden: other architects' briefs, other architects' clients, confidential-by-NDA briefs.

### Revenue model
**Platform commission on architect services — 15 % of gross billing.** (Comparable to Upwork / Thumbtack / Bark marketplaces; higher than ZAAHI's 2 % service fee on property deals, reflecting the margin on service-gig rather than capital-asset transactions.) OR SaaS-only (AED 500–2,000 / mo flat, no commission). **Q-27:** pricing model.

### Competitor reference
UAE architecture marketplace — sparse, mostly word-of-mouth. Adjacent platforms: Dubizzle's professionals directory, Huspy's "find an agent" (only for brokers, not architects). Globally: Houzz (consumer), Procore (contractor PM). **ZAAHI's position:** integrated with our feasibility + parcel data — an architect who reviews a Spec 04 feasibility has context no generalist platform offers.

### Complexity
- MVP: **L** (~3–4 eng-weeks) — portfolio CRUD + marketplace + brief flow are all net-new surface
- Full: **XL** (~6–10 eng-weeks — the brief-workflow + retainer + rating system is a real two-sided-marketplace problem)

## 3.7 SUPER_ADMIN

- **Master Tree:** not a public role; corresponds to founders (Zhan, Dymo) and any future trusted ops staff.
- **UAE regulatory:** n/a; internal controls only. PDPL implies audit-log + access-log for admin actions.

### Core use cases (top 5)
1. User management across all roles (approve / reject / suspend / reactivate).
2. Data / compliance overrides (Spec 03 Super-Admin §14 — state-machine override, invoice bypass, bulk ops).
3. Feature flag + tier-price configuration (Spec 03).
4. Direct data access (limited SQL query UI, PDPL-gated + audit-logged).
5. Emergency session intervention (force-logout, session inspection).

### MVP vs. full
**MVP:** already mostly exists. `/admin` layout + `/admin/ambassadors` page + `/api/admin/me` + `/api/admin/ambassador-applications/*` are operational. Spec 03 v2.0 adds the Super-Admin §14 mode on top.

**Full:** bulk ops, audit-log browser UI, 2-of-3 founder-signature workflow for critical actions (per Spec 03 Super-Admin §14 iron-clad guardrails), impersonation with audit trail, emergency feature-flag flip.

### Dashboard needs
Already scaffolded. Spec 03 MVP v1 completes the CRUD surface (User / Parcel / Deal / Ambassador / Commission + FeatureFlag + TierConfig). Super-Admin §14 mode adds the overlay.

### KYC / verification
Email whitelist (Dymo + Zhan) currently in `src/lib/auth.ts`. Deletion / addition of admin is a code change — should move to config or DB-backed allow-list (Spec 03 MVP).

### Data access permissions
- Read: everything.
- Write: everything. Actions audit-logged. Critical ops (data deletion, schema-level override, session force-logout) require 2-of-3 founder sign-off per Spec 03 Super-Admin §14.

### Revenue model
n/a — internal.

### Complexity
- MVP: **M** (~1–2 eng-weeks) — largely covered by Spec 03 MVP v1
- Full (Super-Admin §14): **L** (~2–4 eng-weeks) — Spec 03 v2 super-admin layer

---

## 3.8 Summary of role complexity

| Role | MVP effort | Full effort | Critical dependencies |
|---|---:|---:|---|
| BROKER | M (1–2w) | L (3–4w) / XL w/ RERA API | RERA verification approach |
| DEVELOPER | L (2–3w) | XL (6–10w) | Bank / escrow integration, partnership API |
| INVESTOR | M (1–2w) | L–XL (4–6w) | AML vendor, data-room spec |
| OWNER | S–M (3–7d) | L (3–4w) | UAE-Pass integration, e-signature |
| AMBASSADOR | S (3–5d) | M (1–2w) | Nothing blocking |
| ARCHITECT | L (3–4w) | XL (6–10w) | Two-sided-marketplace design (rare skill) |
| SUPER_ADMIN | M (1–2w) | L (2–4w) | Spec 03 shipping |

Total MVP across all 6 external roles (+ Super-Admin): ~12–15 eng-weeks sequentially (realistic ~4 months for a single agent). Total Full: ~30–40 eng-weeks (realistic ~7–10 months).

---

# §4 · Technical architecture options

Three approaches, compared honestly, then one recommendation.

## 4.1 Option A — single `User` table, `roles[]` array column

Keep one `User` table. Replace the single `role` field with a `roles String[]` array (Postgres-native) or a JSON `roles[]` column.

### Pros
- Minimal schema change — 1 column + a backfill migration.
- Permission checks trivially read: `if (user.roles.includes("BROKER"))`.
- No joins, fast at query time.
- Works today's dashboard: `roles[0]` is primary, check includes for feature gates.

### Cons
- No role-specific metadata — the RERA licence, BRN, Developer DET number, Architect SOE membership all need columns on User directly. User table bloats from 25 fields to 50+.
- Role-specific KYC docs / relations have no natural home. Where does `BrokerAgencyLink` live — on User? Awkward.
- Role-switching UI has no backing data: "you as BROKER" vs. "you as INVESTOR" need different profile contexts, and there's no per-role profile to switch between.
- Downstream tenantisation (§77) wants tenant-scoped roles; array fields are awkward to RLS-gate.
- Type-safety is weaker: Prisma `String[]` is less safe than an enum junction table.

### Migration complexity
Low — single column add, backfill `roles = [role]` for every existing row, dual-read during cutover (code reads both), single-write post-cutover. ~2–3 eng-days.

### Permission check implementation
```ts
// In every gated route:
if (!user.roles.includes("BROKER")) return 403;
```

Simple but unstructured — permissions not separated from identity.

## 4.2 Option B — role-specific profile tables + keep `User.role` as primary

Keep `User.role` (single primary role). Add six role-profile tables linked 1-to-1 by userId:

- `BrokerProfile` — RERA licence, BRN, agency affiliation, CRM opt-in, commission history pointer
- `DeveloperProfile` — DET licence, DLD developer registration, Oqood references, escrow account reference
- `InvestorProfile` — investment focus, ticket-size range, sector preference, NDAs signed
- `OwnerProfile` — (mostly already on User; could migrate to dedicated table for symmetry)
- `AmbassadorProfile` — tier (SILVER/GOLD/PLATINUM), activation date, tx-hash, payout history pointer
- `ArchitectProfile` — SOE membership, DM licence, consultancy affiliation, portfolio items relation

Each profile is **optional** — if you don't have one, you don't have that role. Primary role remains `User.role`.

### Pros
- Role-specific metadata lives in the right table — schema doesn't bloat.
- KYC document relations are natural: `BrokerProfile.documents[]`, `DeveloperProfile.licenses[]`.
- Multi-role support comes free — a user can have `BrokerProfile` AND `InvestorProfile` AND `AmbassadorProfile` without any issue; primary role resolution is `User.role`.
- RLS-friendly: each profile table can be gated independently.
- Tenantisation ready: each profile gets a `tenantId` at §77 time.

### Cons
- More tables to maintain (~6 new models).
- Permission checks are more involved: `if (user.brokerProfile && user.brokerProfile.licenseVerified)` — requires a join or an eager-loaded include.
- Migration adds 6 schema migrations (or 1 big one).
- "Primary role" concept may feel arbitrary to UX if users genuinely identify with multiple roles equally.

### Migration complexity
Medium — 6 new tables, backfill from existing `User.role` + `User.reraLicense`/`brnNumber`/`ambassadorActive` to their respective profile tables, dual-read migration window, single-write post-cutover. ~1–2 eng-weeks with thorough testing.

### Permission check implementation
```ts
// Helper in src/lib/auth.ts:
const user = await getUserWithProfiles(req);
if (!user.brokerProfile) return 403;

// Or route middleware style:
withRole("BROKER")(handler);
```

More structured, more boilerplate, more testable.

## 4.3 Option C — hybrid (RECOMMENDED): `User.role` + `UserRole` junction + thin role-profile tables

Keep `User.role` as the **primary / default** role (what most of the UI uses when no role-switch is explicit). Add a `UserRole` junction table for secondary roles. Add role-profile tables for role-specific metadata.

```prisma
model User {
  id              String     @id
  email           String     @unique
  role            UserRole   // primary role (what the user signed up as)
  // ... existing fields

  userRoles       UserRole[] @relation("UserSecondaryRoles") // see below
  brokerProfile   BrokerProfile?
  developerProfile DeveloperProfile?
  investorProfile InvestorProfile?
  ownerProfile    OwnerProfile?
  ambassadorProfile AmbassadorProfile?
  architectProfile ArchitectProfile?
}

model UserRoleAssignment {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  role        UserRole  // the secondary role this user also has
  assignedAt  DateTime  @default(now())
  assignedBy  String    // admin user id
  verified    Boolean   @default(false) // KYC verified for this role?

  @@unique([userId, role])
  @@index([userId])
}

model BrokerProfile {
  id              String @id @default(cuid())
  userId          String @unique
  user            User   @relation(fields: [userId], references: [id])
  reraLicense     String?
  brnNumber       String?
  agencyId        String?
  agency          Agency? @relation(fields: [agencyId], references: [id])
  licenseVerified Boolean @default(false)
  licenseVerifiedAt DateTime?
  licenseVerifiedBy String? // admin user id
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Similar minimal profile tables for Developer, Investor, Owner, Ambassador, Architect
```

### Pros
- **Keeps `User.role` — no breaking change for existing code paths.** Every `if (user.role === "ADMIN")` continues to work unchanged.
- Multi-role is natural: `UserRoleAssignment` junction makes it explicit (BROKER + OWNER, or AMBASSADOR + INVESTOR).
- Role-specific metadata lives in profile tables — clean.
- Verification state per role: `UserRoleAssignment.verified` OR `BrokerProfile.licenseVerified`.
- RLS-ready and tenantisation-ready (add `tenantId` to each table later).
- Audit log of role assignments is natural (`assignedAt`, `assignedBy`).
- Performance: the junction table is small (1 row per user per role), queries stay fast.

### Cons
- Slightly more complex than Option A.
- Need a helper `getUserWithRoles()` that returns `User + primary role + secondary roles + loaded profiles` in one query — this is a Prisma include with ~5 relations. Not painful but worth a utility.
- The "primary role" concept persists — some UX flows will ask "which role am I looking at?" and need a session-level role selector (see §5).

### Migration complexity
Medium. One migration adds `UserRoleAssignment` + 6 profile tables. Backfill: for every existing user, insert a `UserRoleAssignment` row mirroring `User.role`, create a corresponding profile table row (empty if no data available). Dual-write during the migration window is not strictly necessary if we backfill synchronously. ~1–2 eng-weeks including tests.

### Permission check implementation
```ts
// In src/lib/auth.ts:
export async function getUserWithRoles(req: NextRequest) {
  const userId = await getApprovedUserId(req);
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: true,
      brokerProfile: true,
      developerProfile: true,
      // ...
    },
  });
}

export function hasRole(user: UserWithRoles, role: UserRole): boolean {
  if (user.role === role) return true;
  return user.userRoles.some((ur) => ur.role === role && ur.verified);
}

// In routes:
const user = await getUserWithRoles(req);
if (!user || !hasRole(user, UserRole.BROKER)) return 403;
```

Structured, testable, explicit about verification state.

## 4.4 Recommendation

**Adopt Option C — hybrid.** The two key wins over Option A:
1. Role-specific metadata (RERA licence, DET licence, SOE membership, etc.) gets a clean home, not a bloated User table.
2. Multi-role support is explicit and queryable, not an array-include special case.

The two key wins over Option B:
1. We don't break existing `user.role` checks (admin path, dashboard BROKER field visibility) — zero code churn for the existing codebase on Day 1.
2. A user who's primarily BROKER but also an AMBASSADOR doesn't need a "choose your primary role" UX — their primary is BROKER (from signup), their secondary is AMBASSADOR (added via activation), and both are queryable independently.

Migration sequence (Phase B1):

1. Add `UserRoleAssignment` + 6 profile tables in one schema migration.
2. Backfill: for every existing user, insert a `UserRoleAssignment(userId, role = User.role, verified = true, assignedBy = "migration")`. For users with RERA licence data, create a `BrokerProfile`. For ambassadors (`ambassadorActive = true`), create an `AmbassadorProfile`. No data loss.
3. Add `getUserWithRoles()` helper + `hasRole()` utility.
4. Leave `User.role` as the canonical "primary role" — no code changes to existing routes.
5. New role-aware routes (e.g. `/api/broker/clients`) use `hasRole(user, "BROKER")`.

Effort: ~1–2 eng-weeks for the migration + helpers. No external-facing changes in Phase B1.

---

# §5 · Multi-role user support

## 5.1 Can Dymo be ADMIN + AMBASSADOR simultaneously?

Yes, under Option C. Dymo's `User.role = ADMIN` (primary), `UserRoleAssignment(role = AMBASSADOR, verified = true)` (secondary), `AmbassadorProfile(tier = PLATINUM)` linked.

The `getAdminUserId()` path continues to work: it checks `user.role === ADMIN` or founder email, both true for Dymo. The `/ambassador` dashboard reads `AmbassadorProfile + hasRole(user, "AMBASSADOR")`. Both surfaces coexist without conflict.

## 5.2 Can a broker also be an owner (list own land)?

Yes, under Option C. A broker who owns a plot has `User.role = BROKER` (primary), `UserRoleAssignment(role = OWNER)` (secondary), `OwnerProfile` (optional metadata). `/api/parcels/submit` allows both flows already; Option C adds the formal ownership check.

**Self-referral / self-commission concern:** the ambassador commission walker already skips self-referrals. The analogous concern here is a broker acting as broker-of-record on their own property — we should prevent that explicitly in deal creation: if `deal.sellerId === deal.brokerId`, reject.

## 5.3 UI role-switching mechanism

Three patterns, in order of complexity:

**A. No switcher — role context inferred from page.** `/broker/*` routes check `hasRole(user, "BROKER")`; `/investor/*` routes check `hasRole(user, "INVESTOR")`. Same user hitting either sees their respective dashboard with no explicit switch. Pro: simplest. Con: confusing for users who forget which role's data they're looking at.

**B. Session-level role selector.** A picker in the top-nav shows all of the user's assigned roles; selecting one sets a session-level active role and colours/badges the UI accordingly. Pro: clear context. Con: ~3 days of UI work and session state wiring.

**C. Role-specific subdomains or paths.** `broker.zaahi.io/dashboard` vs. `investor.zaahi.io/dashboard`. Strong visual separation. Con: complex DNS + subdomain auth; overkill for Phase B1.

Recommendation: **start with A, add B when the second multi-role user shows up.** Today the only multi-role user is Dymo. We don't need the switcher infrastructure for one user. When we have 5+ multi-role users, it becomes worth the session-level selector.

## 5.4 Permission overlap handling

A user is BOTH BROKER and OWNER and accesses `/parcels/[id]` for a plot they own. Which permission set applies?

Union by default: the user sees the most permissive combination of their assigned roles. For the parcel detail page:
- As OWNER: can see title-deed, edit price, accept offers.
- As BROKER: can see aggregate market data overlays.
- Combined: all of the above (more permissions, not fewer).

For conflicts (e.g. a BROKER who's also an INVESTOR submitting an offer on their own client's listing — classic conflict of interest), we enforce at the action level: reject the combination in the specific route, not in the general permission model.

---

# §6 · Abu Dhabi migration readiness

## 6.1 What blocks migration if not done first

Reading [§78 G42 Migration Architecture v1.0](./78_G42_MIGRATION_ARCHITECTURE.md): nothing in the 6-role pivot blocks migration, and nothing in migration blocks the pivot. They're orthogonal engineering tracks.

However:
- Spec 05 Auth Abstraction must land **before** migration (it's the cutover-enabler — Supabase Auth → Azure AD B2C).
- Spec 06 Secrets Rotation must land **before** migration.
- The 6-role pivot writes to the same `User` table that migration moves to Azure PostgreSQL. Doing them in opposite orders means migration just moves more data (acceptable — data volume is tiny, ~15 MB per §78).

Order matters for one thing only: **if we do pivot first + migration second, the existing pivot code paths (Supabase Auth) continue to work, we migrate, code paths switch to Azure AD B2C, no regression.** The reverse order (migration first + pivot on Azure) is also fine — Azure AD B2C has the same admin primitives.

**Sequencing recommendation:** Phase B1 + B2 + B3 in parallel with Spec 05 Auth Abstraction; migration cutover (Month 9–10 per §78) happens after all three B-phases have landed on Supabase first, then we migrate the lot.

## 6.2 Data residency per role

Not all roles have the same residency sensitivity:

| Role | PII sensitivity | Regulatory residency requirement | Implication |
|---|---|---|---|
| OWNER | High — title deeds, Emirates ID | UAE resident PII under PDPL 45/2021 | Must be in UAE post-Jan 2027 |
| BROKER | Medium-High — RERA licence + client data | UAE PII (broker is UAE resident) | UAE-resident post-2027 |
| DEVELOPER | Medium — company registration, escrow details | UAE entity data | UAE-resident post-2027 |
| INVESTOR (UAE-resident) | High — KYC, source of funds | PDPL + AML | UAE-resident post-2027 |
| INVESTOR (non-UAE) | Variable — depends on home jurisdiction | Home-country law may apply | Could stay in EU if non-UAE KYC |
| AMBASSADOR | Low-Medium — referral data, payout | PDPL if UAE resident | UAE-resident post-2027 |
| ARCHITECT | Medium — SOE licence, portfolio | PDPL | UAE-resident post-2027 |
| SUPER_ADMIN | Highest — admin logs, keys | PDPL + internal audit | UAE-resident always |

**Practical effect:** ~95 % of platform data is UAE-resident user data. Moving to Abu Dhabi (Core42) before 2027-01 is the PDPL-safe posture. Leaving it on Supabase Frankfurt beyond 2027-01 requires UAE-approved Standard Contractual Clauses with Supabase Inc. (US C-corp) AND a PDPL impact assessment AND likely a DPO sign-off — substantial legal overhead for a vendor we plan to swap anyway.

Verdict: **the 6-role pivot doesn't change the migration urgency, but it does increase the data surface subject to PDPL.** Not an argument to rush migration; an argument to not defer it past 2026-Q4 if possible.

## 6.3 Infrastructure changes needed

Per §78 v1.0:
- Application hosting: Vercel → Core42 Container Apps (or App Service)
- Primary DB: Supabase PostgreSQL Frankfurt → Azure Database for PostgreSQL Flex @ Abu Dhabi
- Auth: Supabase Auth → Azure AD B2C (Spec 05 enables)
- Object storage: Supabase Storage → Azure Blob Storage @ Abu Dhabi
- CDN: Cloudflare + Vercel Edge → Azure Front Door sovereign
- Secrets: Vercel Env Vars → Azure Key Vault (Spec 06)

The 6-role pivot adds no new infrastructure — all role-profile tables are standard Postgres, all KYC documents are standard object-storage, all role-aware APIs are standard Next.js routes.

## 6.4 Vendor swap plan

Sovereignty Readiness Rules (CLAUDE.md) already enforce the portability principles:
- No Vercel-only APIs (Edge Config, KV, Blob, Vercel Postgres)
- Supabase only via Prisma for data (never Supabase SDK)
- Supabase Auth isolated in `src/lib/supabase-browser.ts` + `src/lib/supabase.ts`
- File storage via `src/lib/storage.ts` abstraction
- Env vars for all external services
- Docker-ready (`docker-compose up`)

Adding roles doesn't violate any of these. Role-profile tables are pure Postgres. KYC documents go through `storage.ts`. Role-scoped APIs are standard Next.js.

## 6.5 Timeline constraints

Per §78 v1.0:
- Month 2–3 (now): Core42 commercial conversation
- Month 4–5: Spec 05 Auth Abstraction + Spec 06 Secrets Rotation
- Month 5–6: Dump/load rehearsal + RLS refactor
- Month 7–8: Production stack provisioned, staging on Core42, dual-run validation
- Month 9–10: **Big-bang cutover (60-minute maintenance window)**, aligned with Phase 2 opening
- Month 10+: Phase 2 tenantisation on G42

Per this discovery doc, 6-role pivot adds:
- Phase B1 (weeks 1–4): Schema + Ambassador tier + BROKER first-class + OWNER polish
- Phase B2 (weeks 5–10): DEVELOPER MVP + Ambassador three-tier full + INVESTOR MVP
- Phase B3 (weeks 11–20): INVESTOR full + ARCHITECT full + audit log + PDPL controls

Two tracks parallel:
- **Track 1 (pivot):** 20 weeks to full-6-role polished
- **Track 2 (migration):** 8 weeks to cutover-ready (Spec 05 + 06 + cutover)

Combined window: 20 weeks total if run in parallel by separate capacity, or 28 weeks sequential.

## 6.6 Cost estimate

Per §78 v1.0:
- POC tenant (1 month): AED 15 k
- Migration engineering (~6–8 eng-weeks): AED 80 k
- Y1 production hosting (3–4 months post-cutover): AED 60–120 k
- DPA legal review: AED 5–10 k
- **Total Y1 migration add-on: AED 160–200 k**

6-role pivot infrastructure cost is ~zero (same tables, same storage, same auth). Only added costs:
- KYC vendor (if we opt for API verification): AED 10–50 k / year depending on depth
- AML screening vendor (if we opt for API verification): AED 20–100 k / year
- Audit log retention + storage: AED 2–5 k / year
- DPO retainer (for PDPL Article 10 compliance): AED 40–100 k / year

**Combined total Y1 (migration + pivot): AED 230–455 k.** Within §77 ARCHITECTURE v1.2 Y1 Platform Dev Fund of AED 5.46 M (70 % of expected Agency revenue).

---

# §7 · Compliance matrix

Per role, the regulatory gates in Dubai / UAE, mapped to what we'd build.

| Role | KYC level | Documents | Professional licence | AML | PDPL data class | Audit log |
|---|---|---|---|---|---|---|
| BROKER | Enhanced | Passport + Emirates ID + RERA card + BRN | RERA broker card (annual) | Transactions > AED 55k threshold | Confidential — licence + BRN | Listings, deals, commissions |
| DEVELOPER | Enhanced | Passport (UBOs) + Emirates ID + DET trade licence + DLD developer registration + Oqood ref + escrow account | DET + DLD + per-project Oqood | Yes — source of funds for escrow inflows | Confidential — UBO + escrow | Project inventory, lead interactions |
| INVESTOR (individual) | Basic | Passport + Emirates ID (UAE) or passport (foreign) | None | Source of funds above AED-threshold | Confidential — nationality + UBO | Data-room access, offers |
| INVESTOR (institutional) | Enhanced | Company registration + UBO chart + AML screening | Home-country licence if financial-services | Yes — always | Confidential — UBO chart | Data-room access, offers |
| OWNER | Basic | Emirates ID + title deed | None (ownership alone) | Above AED-threshold at sale | Confidential — Emirates ID + deed | Listings, offers received |
| AMBASSADOR | Basic | Passport + USDT tx-hash | None | Above AED-threshold aggregate payout | Confidential — USDT wallet | Applications, payouts |
| ARCHITECT | Enhanced | SOE membership + DM licence + consultancy affiliation + bachelor's (MoFA-attested) + PQE pass | SOE + DM + PQE | None typically | Confidential — licences | Briefs responded, invoices |
| SUPER_ADMIN | Internal | Founder identity (trusted) | n/a | n/a | Highest — admin action audit | All admin actions |

### PDPL data classifications (ZAAHI internal)

- **Confidential** — personal data that identifies an individual + sensitive attributes (licence numbers, tx-hashes, Emirates ID numbers, UBO trees, source-of-funds evidence).
- **Internal** — personal data that identifies without sensitive attributes (name, email, phone).
- **Public** — platform-generated data without PII (parcel geometry, affection plan, map layers).

Per PDPL 45/2021, **Confidential data must have explicit consent + purpose-limitation + retention-policy + DPO oversight.** ZAAHI doesn't currently have a DPO; hiring or retaining one is a pre-2027-01 hard requirement (see Q-33).

### Audit log requirements (PDPL Article 10, Executive Regulations 2024)

- Every admin action (approve / reject / suspend / bypass / impersonate).
- Every role assignment (who, when, by whom, reason).
- Every KYC document upload + verification event.
- Every data-subject request (access / deletion / correction / objection).
- Every cross-border data transfer (if still happens post-migration — should be zero).
- Retention: minimum 6 years per UAE federal AML rules, 2 years per PDPL, **longer wins → 6 years.**

The existing `ActivityLog` model is per-user event stream — good for user-facing actions, not sufficient for admin / compliance audit. **Recommendation:** add a dedicated `AdminAuditLog` model for Phase B2 or B3 that captures admin actions separately from user activity.

---

# §8 · Execution plan recommendation

## 8.1 Role rollout order

Honest reasoning, accepting that this is a Q-1 / Q-2 / Q-3 decision for founders to ratify:

**My recommendation (order of rollout):**

1. **AMBASSADOR** (Phase B1, weeks 1–2) — smallest net-new work, highest revenue leverage, unblocks Rudi's agency-wire-dependent recruiting. The 3-tier upgrade is 5 days of work.
2. **BROKER** (Phase B1, weeks 2–4) — directly powered by Rudi's agency. The RERA licence surface needs polish but most of the scaffolding is in place.
3. **OWNER** (Phase B1-B2, weeks 3–5) — already mostly built; needs polish on the offer-inbox + Cat advisor entry point.
4. **DEVELOPER** (Phase B2, weeks 5–8) — responds to Emaar + 5+ inbound developer interest. Bulk-listing is the differentiator.
5. **INVESTOR** (Phase B2-B3, weeks 7–12) — unblocks the $13 M platform strategic round data-room story. NDAs + data rooms take time.
6. **ARCHITECT** (Phase B3, weeks 12–18) — marketplace is the latest in the value chain; not blocking revenue near-term.

**Critical path:** Ambassador 3-tier → BROKER first-class → OWNER polish is the first 4 weeks and sets up the agency's first-deal pipeline. Every other role plugs in after.

## 8.2 Phase breakdown

**Phase B1 (weeks 1–4): Foundation + Ambassador + Broker**

- Week 1: Schema migration — add `UserRoleAssignment`, 6 profile tables, `User.ambassadorPlan`, `Commission.tier`, backfill existing users.
- Week 1-2: `getUserWithRoles()` helper, `hasRole()` utility, permission layer in `src/lib/auth.ts`.
- Week 2: Ambassador tier-aware `awardCommissions()`, admin UI for tier pricing (already scoped in Spec 03).
- Week 3: BROKER profile + dashboard at `/broker` (or polished `/dashboard?tab=broker`), RERA renewal reminder, commission view.
- Week 4: OWNER polish — offer inbox, Cat advisor entry, clean `/me/plots` UX.
- Week 4: tsc + build + e2e test + staging dual-run.

**Phase B2 (weeks 5–10): Developer MVP + Ambassador full + Investor MVP**

- Week 5-7: DEVELOPER role profile + bulk-listing endpoint + developer dashboard MVP.
- Week 5-6: Ambassador three-tier UI polish (tier-upgrade flow, automated Tronscan verification).
- Week 8-10: INVESTOR role profile + NDA click-through + watchlist + pipeline dashboard.
- Week 10: Per-role audit log surface, integration tests.

**Phase B3 (weeks 11–20): Investor full + Architect + polish + compliance**

- Week 11-14: INVESTOR data-room per-plot gating, DD bulk export, AML/KYC vendor integration.
- Week 15-18: ARCHITECT role + portfolio CRUD + marketplace + brief flow.
- Week 19-20: Audit log completion, PDPL controls (consent, retention, DPO readiness), per-role integration tests, cutover-ready for Abu Dhabi.

## 8.3 Critical path analysis

The hard serial dependencies:

1. Schema migration (Week 1) blocks every subsequent role.
2. `hasRole()` + permission layer (Week 2) blocks every role-scoped route.
3. Ambassador tier upgrade (Week 2) blocks correct commission calculation on first post-upgrade deal.
4. BROKER first-class (Week 4) blocks the agency's first-deal end-to-end test.

Everything else can run in parallel with varying degrees of ordering freedom. INVESTOR can ship before or after DEVELOPER. ARCHITECT can ship any time after Phase B2 if the marketplace-design work is done in parallel.

## 8.4 Quick wins vs. deep work

**Quick wins (≤ 5 eng-days each):**
- Ambassador tier upgrade (if prioritised as the first Phase B1 task).
- OWNER offer-inbox polish.
- RERA licence renewal reminder.
- Admin UI for user role assignment.

**Deep work (3–6 eng-weeks each):**
- AML/KYC vendor integration.
- Developer partnership API.
- Architect brief-response workflow.
- INVESTOR data-room with per-plot NDA gating.
- Audit log + PDPL controls.

## 8.5 Testing strategy

Given the shared-DB posture (no staging), testing is the biggest risk-amplifier. Options:

- **Integration test suite per role** — write end-to-end flows (signup → role assignment → KYC → dashboard → action). Vitest + Playwright. ~3 eng-days per role × 6 = 18 eng-days of test authoring. Worth it.
- **Staging Supabase project** — duplicate the existing prod project under a new Supabase org slot, point dev env to it, use for destructive migration tests. ~1 eng-day setup. Strongly recommended.
- **Feature-flagged rollout** — each new role gated behind a Spec 03 feature flag (already scoped), flip on per-cohort, observe, roll back if needed. ~2 eng-hours per role.
- **Manual QA per role before production cutover** — founder-led smoke test with real UAE test accounts. Required.

---

# §9 · Risks + unknowns

## 9.1 Schema migration risk

Production Supabase has ~116 parcels, ~1 Building, a handful of users. A schema migration that adds 7 new tables + backfills 6 role-profile rows + 1 user-role-assignment row per user is trivial in size but non-trivial in blast radius (every API route touches User).

**Mitigations:**
- Run the migration on a **staging Supabase project first** (create one; ~1 eng-day setup).
- Backfill script is idempotent (re-runnable without duplicates).
- Dual-read pattern during cutover window (new code reads both `User.role` and `UserRoleAssignment`).
- Feature-flagged rollout: new role-scoped routes off by default.

## 9.2 Compliance risk — RERA / DLD verification

If we open BROKER onboarding without real-time licence verification, an unlicensed person could claim to be RERA-registered and list properties. Listings by unlicensed brokers are a RERA violation for which we (the platform) bear partial responsibility.

RERA's public licence lookup is a form-submit, not an API. Options:

1. **Manual admin verification, 24–72h turnaround.** Safe, slow. Ship Day 1.
2. **Scraped verification (RERA web form → scraped response).** Faster, brittle, legal grey zone (T&Cs may forbid scraping).
3. **Official RERA API partnership.** Requires RERA business relationship. Weeks to months of negotiation. Phase 2+.

**Recommendation:** ship manual (1), pursue (3) in parallel, never touch (2).

Same pattern for DLD developer registration and SOE architect licence.

## 9.3 PDPL cross-border transfer risk

Concrete: Supabase Inc. is a Delaware C-corp subject to US CLOUD Act. Frankfurt data is "cross-border" per PDPL. Full enforcement 2027-01-01. Until then, we're in a grace period — but an audit / complaint this year would still find the transfer is non-compliant (no SCCs in place, no DPIA, no DPO).

**Mitigations:**
- Abu Dhabi migration (Core42) resolves this post-cutover (Month 9–10 per §78).
- UAE-approved SCCs with Supabase Inc. — legally possible (Supabase offers them), requires 1–2 weeks of legal review + signed DPA. Cheap insurance until migration.
- DPO retainer — ~AED 40–100 k / year. Required per PDPL for any processor handling large volumes of PII.

## 9.4 Ambassador commission bus factor

`src/lib/ambassador.ts` is 452 lines, has one critical function (`awardCommissions()`), runs inside a single Prisma transaction inside `PATCH /api/deals/[id]` on action=COMPLETE. Test coverage is thin (unit tests for pure logic; integration tests for the transaction path are limited).

A tier upgrade that reads `user.ambassadorPlan` before rate lookup is a 20-line diff. The risk is that a merge that's not fully-tested silently zeroes out L1/L2/L3 accruals for a specific tier edge case.

**Mitigations:**
- Full unit-test coverage for `PLAN_COMMISSION_RATES` lookup per tier.
- Integration test: simulate DEAL_COMPLETED with L1=SILVER, L2=GOLD, L3=PLATINUM; assert correct per-level rates.
- Tier change audit log (who changed their own tier, when — only admin can; audit it).
- Monitor first 5 post-deploy DEAL_COMPLETED events manually.

## 9.5 Role-switching UX complexity

For the 1-2 multi-role users we have today (Dymo as ADMIN + AMBASSADOR), the role-switching UX is not a priority. For the dozens of multi-role users we'll have after Phase B2 (brokers who are also investors and ambassadors), it is.

**Mitigations:**
- Phase B1: no switcher. Just "you as BROKER" implicit from /broker/* paths.
- Phase B2: session-level role selector if multi-role user count > 5.
- Phase B3: explicit per-role colour / badge UX to reinforce context.

## 9.6 Unknowns / things requiring founder input or external discovery

- RERA API accessibility (partnership-dependent, not engineering-solvable).
- DLD developer verification API availability (same).
- Emaar / big-developer onboarding depth (do they want bulk-API partnership or do they want to be treated like every other developer?).
- Rudi's agency commission routing (does agency commission flow through the Invoice pipeline Spec 02, or outside?).
- ADGM vs. DIFC vs. mainland UAE hosting for ZAAHI entity (affects which PDPL + DPO regime applies).
- DPO hire / retainer arrangement (per-hour lawyer vs. in-house part-time vs. full-time).

---

# §10 · Questions for founders

**Format:** numbered, answerable in 2–3 sentences each. Grouped by type. Each unlocks a downstream decision.

## Strategic

**Q-1.** Is the 6-role pivot priority order BROKER → OWNER → AMBASSADOR → DEVELOPER → INVESTOR → ARCHITECT, or a different order? (My recommendation is AMBASSADOR first (3-tier upgrade is 5 days), BROKER second (agency dependency), OWNER third (already mostly built) — see §8.1.)

**Q-2.** Does the Rudi AED 1M agency wire hard-commit us to BROKER first? Or can AMBASSADOR go first and BROKER land in week 2-3?

**Q-3.** What's the founder-committed timeline — do we want full-6-role polished in 5 months (aggressive), 7 months (realistic), or 10 months (safe)?

**Q-4.** Is the Abu Dhabi migration required before external users land, or can external users launch on Supabase Frankfurt with a planned migration at Month 9–10?

**Q-5.** Ambassador three-tier rollout — before or after the first external paid ambassador appears? (If before, Phase B1 week 1; if after, Phase B2.)

**Q-6.** If the Ambassador three-tier rolls out after the first paid ambassador, how do we honour their originally-implied tier (GOLD by legacy default)?

**Q-7.** Does Dymo self-assign PLATINUM tier for testing, or stays ADMIN-only until a real third-party ambassador pays?

## Technical

**Q-8.** SUPER_ADMIN — is this a distinct UserRole enum value (new row in enum) or a mode / flag on existing ADMIN role? Spec 03 treats it as a mode; this brief treats it as a seventh role. Pick one.

**Q-9.** Option C hybrid (recommended) vs. Option A (roles array) vs. Option B (profile tables only) — agree with Option C, or prefer a different path?

**Q-10.** One `UserRoleAssignment` junction table vs. per-role assignment tables (e.g. `BrokerAssignment`, `DeveloperAssignment`) — I recommend one junction; confirm?

## Regulatory

**Q-11.** RERA verification approach for BROKER — (a) manual admin 24–72h, (b) scraped, (c) pursue RERA API partnership in parallel? I recommend (a) + (c).

**Q-12.** Ambassador programme — do we need a formal legal opinion from a UAE commercial lawyer on the paid-tier structure to confirm it's a curator network, not MLM? (~AED 5–15 k for the opinion; I recommend yes before first external paid ambassador.)

**Q-13.** PDPL compliance posture — do we hire a DPO (in-house or retainer) this quarter, or wait until migration closes? Retainer is AED 40–100 k / year. I recommend now.

**Q-14.** Supabase SCCs / DPA — do we sign with Supabase Inc. now (AED 5–10 k legal review) as a bridge to the Core42 migration, or skip and accept residual risk until migration?

**Q-15.** AML / KYC vendor — when do we pick? (Dow Jones, RDC, Comply Advantage for AML; Onfido, Jumio, Shufti Pro for KYC.) AED 20–100 k / year. Recommend picking during Phase B2 for INVESTOR role.

**Q-16.** Institutional INVESTOR tier — what's the ticket-size cutoff that triggers enhanced KYC (UBO, source of funds, sanctions screening)? Common thresholds are AED 2 M, AED 10 M. Pick a threshold.

## Business

**Q-17.** BROKER pricing — is there a SaaS fee on top of the 2 % service fee, or is 2 % the only platform revenue from brokers?

**Q-18.** DEVELOPER pricing — SaaS tier (AED 5–25 k/mo range per §77), per-transaction fee (0.25–0.5 % above 2 % service fee), or partnership revenue share for large players?

**Q-19.** INVESTOR pricing — free + optional institutional SaaS (AED 2–10 k/mo) + optional buy-side close fee (0.5 %)? Or free only?

**Q-20.** OWNER premium features — anti-fraud monitoring (AED 500–2k/yr per parcel), Cat advisor session (AED 500 one-off), concierge flat fee on closure (AED 5k)? Which of these, if any, are paid vs. free?

**Q-21.** ARCHITECT pricing — 15 % marketplace commission on service billing (like Upwork), flat SaaS (AED 500–2k/mo), or both?

**Q-22.** Feature-flag defaults — should new roles ship off-by-default and flip on via Spec 03 feature flag, or ship on-by-default with a kill switch?

## Partnership

**Q-23.** Rudi's agency — is the agency's commission routing inside ZAAHI's Invoice pipeline (Spec 02) or outside (shadow ledger)?

**Q-24.** Emaar — what onboarding depth are they asking for? Bulk inventory API, standard DEVELOPER role, something bespoke?

**Q-25.** The "5+ other developers interested" — are they at Emaar scale or smaller? Big players (Emaar, Damac, Sobha) may want bespoke. Mid-tier (Azizi, Binghatti, Nakheel land deals) fit the DEVELOPER role as drafted.

**Q-26.** INVESTOR warm intros — Dymo's network includes family offices (Al Futtaim, Al Ghurair, Al Habtoor, Al Naboodah). For Phase B2 INVESTOR MVP, pick 2–3 to brief as early-access users.

**Q-27.** ARCHITECT warm intros — do we have UAE architecture consultancies pre-warm as launch partners, or is this a cold-launch marketplace?

## Infrastructure

**Q-28.** Staging Supabase project — approve creating one? (~AED 0 setup cost; 1 eng-day; ~USD 25/mo hosting on Supabase Free tier.)

**Q-29.** Abu Dhabi migration commercial conversation — Dymo owns per §78. Is Core42 the committed choice, or is Oracle Cloud UAE / AWS Bahrain being re-evaluated?

**Q-30.** ADGM vs. DIFC vs. mainland for ZAAHI legal entity — affects PDPL + DPO regime and which jurisdiction's data-protection rules apply. Does this need a legal opinion this quarter?

**Q-31.** DPO retainer — hire existing Equilibrium partner / family relationship, or open the search?

**Q-32.** Audit log storage — dedicated `AdminAuditLog` table in Postgres, or external service (Datadog, Cloudwatch)? I recommend Postgres for simplicity.

**Q-33.** Documents storage during the migration window — can we migrate files to Azure Blob Storage incrementally (while still on Supabase Storage) via the `src/lib/storage.ts` abstraction, or do we swap at the cutover only?

## Scope-cut questions

**Q-34.** If Phase B3 slips, which role drops last — INVESTOR or ARCHITECT?

**Q-35.** If Phase B2 slips, which role drops from the plan — DEVELOPER or second half of AMBASSADOR (automated payout)?

**Q-36.** If PDPL-full compliance is deferred to 2027-01 timeline and not this quarter, what's the blast-radius acceptance — signed attestation from founders that we're on a remediation path, or full legal sign-off required now?

## Governance

**Q-37.** Code review policy for Phase B schema migrations — founder + engineering-agent pair-review before merge, or founder-reviewed post-merge? I recommend pre-merge for schema (blast radius), post-merge for route handlers (contained).

**Q-38.** Each new role goes live behind a Spec 03 feature flag — do we need founder-sign-off on flipping the flag to "on", or is engineering-agent-autonomous OK up to an MVP checklist pass?

**Q-39.** First external paid ambassador / broker / developer — does founder personally onboard to validate the flow end-to-end, or do we trust integration tests?

**Q-40.** When a role's KYC verification is manual (24–72 h admin review), who owns the SLA — Dymo, Zhan, or a delegated ops person we hire?

---

# §11 · References + sources

## ZAAHI internal documentation (cited)

- [`prisma/schema.prisma`](../../prisma/schema.prisma) — canonical schema
- [`src/middleware.ts`](../../src/middleware.ts) — auth gating
- [`src/lib/auth.ts`](../../src/lib/auth.ts) — getApprovedUserId, getAdminUserId
- [`src/lib/ambassador.ts`](../../src/lib/ambassador.ts) — ambassador logic (452 lines)
- [`src/lib/ambassador-plans.ts`](../../src/lib/ambassador-plans.ts) — three-tier rates + prices
- [`src/components/AuthGuard.tsx`](../../src/components/AuthGuard.tsx) — client-side approval gate
- [`CLAUDE.md`](../../CLAUDE.md) — Sovereignty Readiness Rules (lines 389–398), Ambassador Program Rules (lines 508–586)
- [`docs/architecture/MASTER_TREE_final.md`](./MASTER_TREE_final.md) — Participants §14–§30 (B1–B8)
- [`docs/architecture/77_WEB_PLATFORM_ARCHITECTURE.md`](./77_WEB_PLATFORM_ARCHITECTURE.md) — hybrid multi-tenancy v1.2
- [`docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md`](./78_G42_MIGRATION_ARCHITECTURE.md) — Abu Dhabi migration v1.0
- [`docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md`](./MASTER_TREE_ENHANCEMENT_PROPOSAL.md) — ratification document
- [`docs/specs/phase-1/02-INVOICE_COMMISSION_SPEC.md`](../specs/phase-1/02-INVOICE_COMMISSION_SPEC.md) — Invoice + commission spec
- [`docs/specs/phase-1/03-ADMIN_PANEL_SPEC.md`](../specs/phase-1/03-ADMIN_PANEL_SPEC.md) — Admin + Super-Admin §14 spec v2.0
- [`docs/specs/phase-1/04-FEASIBILITY_CALC_V2_SPEC.md`](../specs/phase-1/04-FEASIBILITY_CALC_V2_SPEC.md) — Feasibility v2
- [`docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md`](../specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md) — Auth abstraction + G42 cutover
- [`docs/decisions/PARKED_FEASIBILITY_FRAMEWORK_DECISION.md`](../decisions/PARKED_FEASIBILITY_FRAMEWORK_DECISION.md) — parked, pending founder Q1

## UAE regulatory (cited with retrieval dates)

- **PDPL 45/2021 + Executive Regulations 2024:**
  - [GSDA Legal — UAE Data Protection Law PDPL 2026: Business Compliance Guide](https://www.gsdalegalconsultants.com/blog/data-protection-uae-pdpl-compliance-guide) · retrieved 2026-04-24
  - [Securiti — Overview of UAE's Federal Decree-Law No. (45) of 2021 on PDPL](https://securiti.ai/uae-personal-data-protection-law/) · retrieved 2026-04-24
  - [Kayrouz & Associates — Cross-Border Data Transfers Under UAE Law In (2026)](https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026) · retrieved 2026-04-24
- **RERA Broker Licence:**
  - [Dubai Land Department — RERA](https://dubailand.gov.ae/en/rera) · retrieved 2026-04-24
  - [Oliva — RERA Certification for Dubai Agents: Requirements](https://joinoliva.com/en/learn/blog/rera-certification-for-dubai-agents-requirements) · retrieved 2026-04-24
  - [Movingo — How to Get a RERA Broker Card in Dubai: Full 2026 Guide](https://movingo.ae/blog/real-estate-practice-card-in-dubai) · retrieved 2026-04-24
- **DLD Developer Registration:**
  - [DIAC — Real Estate Development License Dubai 2026: RERA Registration and Full Process Guide](https://diac.ae/blog/real-estate-development-license-dubai/) · retrieved 2026-04-24
  - [Al Tamimi & Company — Owning Properties in Dubai by an ADGM Entity](https://www.tamimi.com/law-update-articles/owning-properties-in-dubai-by-an-adgm-entity/) · retrieved 2026-04-24
- **Architect / SOE:**
  - [SOE UAE — Official Society of Engineers portal](https://www.soeuae.ae/en/Default.aspx) · retrieved 2026-04-24
  - [Takhlees — UAE Engineering License 2026: Step-by-Step Guide for Abu Dhabi & Dubai](https://takhleesbusiness.com/blog/uae-engineering-license-2026-step-by-step-guide-for-abu-dhabi-and-dubai) · retrieved 2026-04-24
  - [Daem — DM Approval for Architects & Consultancy Offices](https://daemuae.com/dubai-municipality-license/dm-approval-for-architect-engineer-dubai/) · retrieved 2026-04-24

## Competitor / industry reference (cited)

- [Huspy Dubai](https://www.propertyfinder.ae/en/broker/huspy-dubai-7163) — in-house broker model, founded 2020, $47M funded · retrieved 2026-04-24
- [Bayut — UAE's Largest Real Estate Portal](https://www.bayut.com/) — classifieds marketplace · retrieved 2026-04-24
- [PropertyFinder — MENA's Proptech Powerhouse](https://www.reademergent.com/p/propertyfinder-menas-proptech-powerhouse) · retrieved 2026-04-24

## RBAC design patterns (cited)

- [WorkOS — How to design an RBAC model for multi-tenant SaaS](https://workos.com/blog/how-to-design-multi-tenant-rbac-saas) · retrieved 2026-04-24
- [Enterprise Ready — SaaS App Guide to Role Based Access Control (RBAC)](https://www.enterpriseready.io/features/role-based-access-control/) · retrieved 2026-04-24
- [Osohq — Top 5 Real-World RBAC Examples Explained](https://www.osohq.com/learn/rbac-examples) · retrieved 2026-04-24

## Gaps — what this document could not verify

Honest disclosure:

- **RERA public API for broker licence verification** — the research indicates no public API; the RERA Services Section is a web form. If there's a partnership-level API, I don't have access to confirm. The assumption in this doc is "manual verification Day 1, API partnership in parallel." If RERA has a partnership programme, the estimates in §3.1 compress.
- **DLD developer registration API** — same situation. Assumption is manual verification + admin workflow.
- **SOE architect licence API** — no public API. Assumption is self-declared + admin verification.
- **Emaar's specific asks on the platform equity pitch** — not disclosed to engineering yet. The DEVELOPER role MVP may need bespoke adjustments after the founder conversations conclude.
- **Rudi's agency commission routing** — the MOU details (80/10/10 equity, commission flow) are in `docs/investor-package/MOU_RUDI.md` but the specific Invoice-pipeline integration path (Spec 02 scope or external) is a Q-23 decision, not documented.
- **Actual multi-tenancy rollout timing vs. 6-role pivot** — §77 v1.2 targets Phase 2 opening (Month 10+). If external momentum pulls that forward, the role pivot and tenantisation overlap in a way this doc doesn't fully model.
- **Technical detail on Huspy's / Bayut's / PropertyFinder's internal role systems** — their public docs don't describe the internal schema. All competitor references in this doc are about product-facing behaviour, not implementation.
- **Abu Dhabi Core42 commercial terms** — per §78 v1.0, negotiation in progress (Dymo-led). Budget AED 160–200 k Y1 is indicative, not contracted.

These gaps are flagged so founders can prioritise which to unblock during the Q&A response to this document. None of them block writing Phase B1 scope; they all matter for Phase B2–B3.

---

# Document history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-24 | ZAAHI engineering agent (researcher + advisor role) | Initial discovery. 40 questions for founders. Recommended Option C hybrid architecture. Effort estimate: 12–22 eng-weeks across three phases. Abu Dhabi migration treated as orthogonal track. **Pending founder review + Q-answers + approval before any execution.** |
