# Web Platform — Current State Audit (2026-04-22)

**Purpose:** Baseline snapshot of the live codebase BEFORE §77 White-label spec writing begins. Grounded in direct `src/` + `prisma/` reads on 2026-04-22, NOT in session memory of prior sprint reviews.
**Branch:** `research/vision-and-competitors-2026-04-19`
**Audit method:** read-only survey of `src/**` + `prisma/schema.prisma` + `package.json` + `src/middleware.ts` + target component samples. Zero writes.
**Classification:** CONFIDENTIAL — founder + agent reference
**Preparer:** Agent · Opus 4.7 · 2026-04-22
**Uses existing specs as forward-looking contract:** Spec 02 v1.1 · Spec 03 v2.0 · Spec 04 v1.1 · Enhancement Proposal v1.2 · FEASIBILITY_STYLE_GUIDE.md

---

## SECTION 1 — LIVE CODEBASE SNAPSHOT

### 1.1 `src/` tree (top level + immediate structure)

```
src/
├── app/                 ← Next.js 15 app router
│   ├── admin/           ← admin panel (ambassador applications only currently)
│   ├── ambassador/      ← ambassador dashboard (signed-in ambassador view)
│   ├── ambassador-terms/ ← legal page
│   ├── api/             ← API route handlers
│   ├── dashboard/       ← user dashboard (Phase 1 Common, 1822 lines)
│   ├── deals/           ← deal room (per-deal UI)
│   ├── disclaimer/      ← legal page
│   ├── globals.css      ← design tokens (founder-spec 2026-04-16)
│   ├── join/            ← public ambassador join landing (1178 lines)
│   ├── layout.tsx       ← root HTML shell (lang="en" hardcoded)
│   ├── login/           ← 11-line stub redirect
│   ├── page.tsx         ← auth page (landing, 477 lines, DO NOT MODIFY)
│   ├── parcels/         ← plot pages (map, [id], new)
│   ├── privacy/         ← legal page (555 lines)
│   ├── r/[code]/        ← ambassador referral link handler
│   ├── register/        ← 11-line stub redirect
│   ├── settings/        ← user settings
│   └── terms/           ← legal page (618 lines)
├── components/          ← 8 shared components (no UI library; all custom)
├── contracts/           ← Solidity: ZaahiAuditTrail.sol (blockchain audit)
├── lib/                 ← 24 utility libraries (feasibility, auth, ambassador, etc.)
└── middleware.ts        ← 65-line edge middleware (Bearer-token gate for /api/*)
```

### 1.2 All routes (public · auth-protected · admin · api)

**Public pages (no auth):**
- `/` — auth landing (sign-in · sign-up)
- `/join` — public ambassador join landing
- `/r/[code]` — referral code capture + redirect
- `/terms`, `/privacy`, `/disclaimer`, `/ambassador-terms` — legal

**Auth-protected pages (AuthGuard wrapper):**
- `/parcels/map` — THE flagship map (5 026 lines)
- `/parcels/[id]` — plot detail page (158 lines)
- `/parcels/new` — plot creation
- `/dashboard` — user dashboard (1 822 lines, 8 ComingSoon banners)
- `/deals/[id]` — deal room (546 lines)
- `/ambassador` — ambassador dashboard (431 lines)
- `/settings` — user settings

**Admin pages (admin role):**
- `/admin/ambassadors` — ambassador applications queue (644 lines)
- `/admin` layout — guard only; no dashboard root page yet

**API routes (45 non-layer + 207 layer routes):**

| Group | Routes | Purpose |
|---|---|---|
| **Auth / session** | `/api/auth`, `/api/users/sync`, `/api/me`, `/api/me/complete-onboarding`, `/api/me/favorites[/id]`, `/api/me/saved-searches[/id]`, `/api/me/notifications[/id]`, `/api/me/notifications/read-all`, `/api/me/plots` | User profile + Phase 1 dashboard CRUD |
| **Admin** | `/api/admin/me`, `/api/admin/ambassador-applications[/id][/approve][/reject]` | Admin queue |
| **Ambassador** | `/api/ambassador/register`, `/api/ambassador/activate`, `/api/ambassador/commissions`, `/api/ambassador/stats`, `/api/ambassador/tree`, `/api/ambassador/qr[/code]` | Ambassador ops |
| **Archibald AI** | `/api/chat` (101 lines, REAL) · `/api/cat/chat` (9 lines, PLACEHOLDER STUB) | ⚠️ **2 endpoints; stub is tech debt** |
| **Parcels** | `/api/parcels`, `/api/parcels/[id]`, `/api/parcels/[id]/affection-plan[/refresh]`, `/api/parcels/[id]/pdf`, `/api/parcels/[id]/plot-guidelines`, `/api/parcels/[id]/review`, `/api/parcels/[id]/view`, `/api/parcels/map`, `/api/parcels/parse-title-deed`, `/api/parcels/pending`, `/api/parcels/seed-dda`, `/api/parcels/submit` | Parcel CRUD + workflow |
| **Deals** | `/api/deals`, `/api/deals/[id]`, `/api/deals/[id]/messages` | Deal state machine |
| **Layers (public)** | `/api/layers/*` — 207 DDA districts + Communities + Abu Dhabi (3 variants) + Metro + Roads + Dubai Islands + Masterplans + UAE districts + Riyadh + Saudi governorates = **~214 layer routes** | Public geodata |
| **Misc** | `/api/modules`, `/api/notify-admin` | Misc + signup notifier |

### 1.3 Key components inventory

**`src/components/` (8 shared):**
- `AuthGuard.tsx` — wrap for protected pages
- `CatChat.tsx` — Archibald AI chat widget (shared surface)
- `CookieConsent.tsx` — PDPL cookie banner
- `DealTimeline.tsx` — 28-line 11-step timeline vis
- `Footer.tsx`, `LegalNavbar.tsx`, `Navbar.tsx` — 16-41 line stubs/refs
- `ParcelCard.tsx` — 28-line mini card

**`src/app/parcels/map/` (flagship, 9 components):**
- `page.tsx` — 5 026 lines (the map itself)
- `SidePanel.tsx` — plot detail side panel
- `FeasibilityCalculator.tsx` — 1 001 lines v5.0
- `ArchibaldChat.tsx` — chat UI, wired to `/api/chat`
- `AddPlotModal.tsx` — 2-flow listing wizard (broker · owner)
- `OfferModal.tsx` — make-offer form (deal creation)
- `TermsAcceptModal.tsx` — T&C acceptance gate
- `WelcomeTour.tsx` — first-login 4-step tour
- `MiniMap.tsx` — thumbnail map

**`src/app/admin/ambassadors/` (4 components):**
- `page.tsx` (644 lines) + ApplicationDetailModal · ApproveConfirmModal · RejectModal

### 1.4 `prisma/schema.prisma` (480 lines, 13 migrations, 19 models)

**Enums (5):** UserRole · ParcelStatus · DealStatus · DocumentType · CommissionStatus

**Models (19):**

| Model | Purpose | Notes |
|---|---|---|
| User | 19 fields · 6 Phase 1 profile fields · Ambassador fields | No `trn`, `taxpayerAddress` (Spec 02 v1.1 adds); no `SUPER_ADMIN` role (Spec 03 v2.0 adds); **NO `tenantId`** |
| Parcel | 14 fields + geometry Json + affectionPlans relation | No `tenantId`; soft-delete NOT present |
| Deal | 23 fields incl. platformFeeFils (comment still says "0.25%" pre-Spec 02 fix) | No `tenantId`; full 12-state enum present |
| DealMessage | chat per deal | — |
| DealAuditEvent | append-only ledger with txHash + documentHash | — |
| AffectionPlan | 18 fields · GFA · setbacks · building limit geometry | — |
| Document | generic doc pointer | — |
| Commission | **append-only ledger · immutable after create** | unique constraint [dealId, ambassadorId, level, sourceUserId] |
| AmbassadorApplication | public join form submission · admin review fields | — |
| ReferralClick | `/r/[code]` analytics · no PII (ipHash only) | — |
| **Phase 1 dashboard models (5)**: SavedParcel · ParcelView · Notification · ActivityLog · SavedSearch | User dashboard data | added 2026-04-16 migration |

**Gaps for White-label:**
- **No `Tenant` model** — fully single-tenant codebase.
- **No `tenantId` foreign key** on any model.
- **No `FeatureFlag` model** (Spec 03 v1 adds).
- **No `TierConfig` model** (Spec 03 v1 adds).
- **No `Invoice` model** (Spec 02 v1.1 adds).
- **No `FeasibilityScenario` model** (Spec 04 v1.1 adds).
- **No `AuditLog` model** (Enhancement Proposal S-1 adds).

### 1.5 `package.json` analysis

**Runtime deps (16):**
- **Next.js 15.3.1** · **React 19.0** · **Tailwind CSS 4.0** · **Zod 4.3.6** — latest
- `@prisma/client` 7.7 · `prisma` 7.7 · `@prisma/adapter-pg` 7.7
- `@supabase/supabase-js` 2.102.1
- `@react-three/drei` 10.7.7 · `@react-three/fiber` 9.5 · `three` 0.183.2 · `maplibre-gl` 5.22 · `pmtiles` 4.4.1 · `proj4` 2.20.8 — geo stack
- **`jspdf` 4.2.1** ✅ (correction confirmed — Spec 04/02 v1.1 extend this)
- `ethers` 6.16 · `@openzeppelin/contracts` 5.6.1 — blockchain
- `resend` 6.12 — email (✅ installed; requires RESEND_API_KEY env)
- `qrcode` 1.5.4 — QR generation

**Dev deps (12):** typescript 5 · tsx 4.21 · `@tailwindcss/postcss` 4.0 · pg 8.20 · dotenv 17.4 · @types/*

**NOT installed (flags for future specs):**
- ❌ No `framer-motion` (animations are CSS keyframes)
- ❌ No `shadcn/ui` or other component library
- ❌ No `next-intl` / i18n library
- ❌ No `@tanstack/react-query` (server state hand-rolled)
- ❌ No `@tanstack/react-table`
- ❌ No `recharts` / `d3` / `chart.js`
- ❌ No `date-fns` / `dayjs`
- ❌ No test framework (no Jest · Vitest · Playwright · @testing-library)
- ❌ No `xlsx` / `xlsx-js-style` for Excel export

### 1.6 Tech versions vs §77 spec expectations

| Tech | Installed | §77 spec target | Alignment |
|---|---|---|:-:|
| Next.js | 15.3.1 | 15.x app router | ✅ |
| React | 19.0.0 | 19 | ✅ |
| Tailwind | 4.0 (PostCSS plugin) | v4 CSS-first config | ✅ |
| Three.js | 0.183.2 | for 3D Signature | ✅ |
| Prisma | 7.7 | latest | ✅ |
| Supabase JS | 2.102.1 | latest | ✅ |
| jsPDF | 4.2.1 | client-side PDF | ✅ |
| MapLibre GL | 5.22 | v5.x | ✅ |
| Zod | 4.3.6 | v4 | ✅ |

All aligned. No version upgrades required.

### 1.7 Environment variables inventory (names only)

Known env vars used in codebase (grepped):
- `RESEND_API_KEY` — email (⚠️ **missing per issue #19 = email silent-skip**)
- `FROM_EMAIL` — optional (default `noreply@zaahi.io`)
- `ANTHROPIC_API_KEY` — Archibald (required; returns 500 if missing or contains "REPLACE_ME")
- `TELEGRAM_BOT_TOKEN` · `TELEGRAM_ADMIN_CHAT_ID` — Telegram notifications (⚠️ likely missing per issue #19)
- `DATABASE_URL` (Prisma) — Supabase Postgres
- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- Supabase service role key (inferred, for admin ops)

`.env.local` file exists at project root (674 bytes · 2026-04-14). Not committed to git (correct per `.gitignore`).

### 1.8 Middleware rules (`src/middleware.ts` · 65 lines)

**Public API allow-list** (no Authorization header required):
- `/api/auth`
- `/api/notify-admin` (anonymous signup notifier)
- `/api/ambassador/register` (public ambassador apply)

**Public reads via `/api/layers/*`** — GET/HEAD only, no body content restriction.

**Public reads via `/api/ambassador/qr/*`** — QR images are public share artefacts.

**Every other `/api/*` route** — requires `Authorization: Bearer <token>` header; middleware only presence-checks; route handlers call `getSessionUserId` / `getApprovedUserId` / `getAdminUserId` (in `src/lib/auth.ts`) to verify.

**Three-tier auth helpers (lib/auth.ts, 84 lines):**
1. `getSessionUserId` — valid Supabase session only.
2. `getApprovedUserId` — session + `user_metadata.approved === true`.
3. `getAdminUserId` — approved + `User.role === "ADMIN"` OR founder-email hardcoded (`zhanrysbayev@gmail.com`, `d.tsvyk@gmail.com`).

**Gap:** No `getSuperAdminUserId` yet (Spec 03 v2.0 §14.1 adds). No rate limiting in middleware (Enhancement Proposal S-7 adds).

---

## SECTION 2 — WHAT LIVES IN PRODUCTION (honest grades)

Each feature: Grade (1-10) · What 10/10 looks like · Known gaps · Master Tree §.

### 2.1 Map layer `/parcels/map` — **Grade 8/10**

**What exists (5 026 lines):**
- MapLibre GL + PMTiles integration.
- 207 DDA district layer API routes + 13 additional layer categories.
- ZAAHI Plots layer with 114 parcels (status LISTED · IN_DEAL · VACANT) + 3D ZAAHI Signature extrusion.
- 9 land use categories (approved founder 2026-04-11) with exact hex colors.
- Layer toggle system (Layers panel).
- Master plans: Meydan Horizon · Dubai Islands · D11 · Al Furjan · IC Phase 2&3 (per `data/master-plans/`).
- DDA parcel parsing (Affection Plan + Building Limit via `src/lib/dda.ts` 360 lines).
- WASD drone mode (toggleable, `src/lib/drone-controls.ts` 286 lines).
- Base map variants: light · dark · satellite (ESRI World Imagery).
- Hover mini-card + Side Panel plot data display.
- Add Plot modal with 2-flow wizard (broker · owner).
- Drone Mode toggle button.
- Check DLD button (popup + 7-digit validation).

**What 10/10 looks like:**
- Map renders < 1.5 s with all layers off to 3 s with all on.
- 114 → 1 000 → 10 000 parcels without perf degradation.
- Layer toggles persist per-user across sessions.
- Search bar with fuzzy-match across plot numbers, districts, master plans.
- RTL-aware when language switches to Arabic.
- Accessible keyboard navigation + screen-reader support.

**Known gaps / rough edges:**
- **5 026-line single file** = maintenance burden; hard to onboard new dev.
- No layer preference persistence (localStorage only for Drone Mode).
- No search bar at map level.
- PMTiles load is blocking (no skeleton).
- Performance at 1 000+ parcels unverified (Master Tree §77 target).

**Master Tree:** §77 Web Platform · §39 Metaverse (3D) · §40 Digital Twin · §01 Land · §02 Residential · §07 Commercial.

### 2.2 3D rendering (ZAAHI Signature) — **Grade 9/10**

**What exists:**
- Podium / body / crown tiering based on floor count (≤4 · 5-10 · >10).
- Footprint scale 1.00 / 0.70 / 0.50 via `scaleRingFromCentroid`.
- Per-land-use color (9 categories).
- ZAAHI listings `fill-extrusion-opacity: 1` (SOLID).
- PMTiles buildings `fill-extrusion-opacity: 0.35` (TRANSPARENT).
- Setback rules (setbacks = building-limit geometry OR defaults by land use).
- < 5 000 sqft bypass (footprint = plot boundary).
- Single layer architecture (all tiers one source, visual variance via footprint scale).

**What 10/10 looks like:**
- 1 000+ parcels at 60 FPS on M1 iPad.
- VR-ready (WebXR compatible).
- Shadow rendering at higher LOD zooms.

**Known gaps:** None material; this is the signature feature.

**Master Tree:** §40 Digital Twin · §39 Metaverse.

### 2.3 Side Panel (350 px) — **Grade 8.5/10**

**What exists:**
- Plot data display (district · plot # · area · FAR · GFA · land use · valuation).
- Feasibility Calculator embedded.
- Document links (affection plan PDF · plot guidelines PDF).
- "Make Offer" button → OfferModal.
- Hover mini-card preview (plot # · district · sqft · price · land use).

**What 10/10 looks like:**
- Save / favorite toggle from panel.
- Share plot URL (deep link).
- Side-by-side comparison (open 2 panels).
- Inline "Check DLD" result.

**Known gaps:**
- Share link not present.
- Compare tool deferred (Phase 4 per dashboard banner).

**Master Tree:** §01 Land · §77 Platform.

### 2.4 Feasibility Calculator v5.0 — **Grade 7.5/10**

**What exists (`FeasibilityCalculator.tsx` 1 001 lines + `src/lib/feasibility.ts` 500 lines):**
- Build-to-Sell · Build-to-Rent · Joint Venture tabs.
- BUA-based construction + SFA-based revenue.
- Editable Land Cost (prefills from DB `currentValuation`).
- FAR + GFA + setbacks pulled from AffectionPlan (editable).
- 9 land-use defaults (construction cost · brand premium · sales psf · rent psf).
- PDF download via `jsPDF` (already imported line 3).
- Collapsible sections · NumberInput with thousand separators · 300 ms debounce.
- Verdict badges (strong / moderate / below).

**What 10/10 looks like (per Spec 04 v1.1 + Framework Architecture when written):**
- IRR computation (Newton-Raphson).
- ±20 % sensitivity band (3 axes: cost · price · timeline).
- Branded PDF with AR / RU support.
- Scenario save / load (persist to DB per Spec 04 v1.1 FeasibilityScenario model).
- Goal-seek ("what build cost makes IRR ≥ 15 %?").
- Strategy compare (BtS vs BtR side-by-side).

**Known gaps:**
- No IRR (ROI % only).
- No sensitivity analysis.
- No scenario persistence (in-component state only).
- No Arabic / Russian PDF.
- Spec 04 v1.1 documents exactly what v2 adds (1.5-2 eng-weeks).

**Master Tree:** §58 Feasibility Calculator · §66 Market Intel (partial).

### 2.5 Archibald AI — **Grade 6/10**

**What exists:**
- Endpoint: `/api/chat` (101 lines, REAL) → Anthropic API · model `claude-sonnet-4-6` · max_tokens 500.
- SYSTEM_PROMPT with Dubai RE knowledge (DLD fees · VAT · Oqood · Ejari · Trakheesi · Freehold zones · Golden Visa · service charges).
- Multi-language ("respond in same language user writes — EN / AR / RU").
- Message history (last 20 messages).
- Auth-gated (`getApprovedUserId`).
- UI widget at `src/components/CatChat.tsx` + `src/app/parcels/map/ArchibaldChat.tsx`.

**What 10/10 looks like:**
- Rate limiting (per user / per tier · Enhancement Proposal S-7).
- Cost/token tracking per user per month (controls cost blow-up).
- Tool use (invoke `/parcels/[id]` lookup · Feasibility compute · DLD transaction query).
- Vector-search RAG against ZAAHI knowledge base + DLD open data.
- Streaming responses (SSE).
- Session memory across days (conversation persistence).
- Fine-tuned ZAAHI-RE-v1 model (Phase 3 target Q1 2027).

**Known gaps / tech debt:**
- ⚠️ **`/api/cat/chat` is a 9-line PLACEHOLDER STUB** (not Claude-powered) — tech debt. Remove or redirect.
- No rate limiting → cost risk.
- No tool use / structured actions.
- No caching of prompts (cache-breakthrough every message).
- 500 max_tokens is low for complex queries.
- No conversation persistence (client-side only).
- No RAG / knowledge retrieval.

**Master Tree:** §41 AI System · §51 Archibald Agent.

### 2.6 Auth & Identity (Supabase) — **Grade 9/10**

**What exists:**
- Supabase Auth signup → admin-approval gate (`user_metadata.approved` flag).
- `AuthGuard` wrapper on every protected page.
- 3-tier auth helpers (`getSessionUserId` / `getApprovedUserId` / `getAdminUserId`).
- Founder-email hardcoded override (Zhan + Dymo).
- RBAC: 7 roles (OWNER · BUYER · BROKER · INVESTOR · DEVELOPER · ARCHITECT · ADMIN).
- Middleware Bearer-token gate.
- `/api/layers/*` explicitly public (public-domain geo data).
- `/api/ambassador/register` + `/api/ambassador/qr/*` public (signed share tokens).

**What 10/10 looks like:**
- MFA (TOTP + passkeys) — Enhancement Proposal S-11 deferred to Phase 2.
- UAE Pass integration — Enhancement Proposal SV-6 Month 7-8.
- Session table with device list + revoke (Enhancement Proposal S-11).
- Step-up auth for high-risk ops (delete account · transfer parcel).
- SUPER_ADMIN role + WireGuard gate (Spec 03 v2.0 §14).
- Rate-limited login endpoint (credential-stuffing defence).

**Known gaps:**
- No MFA yet.
- No step-up auth.
- No SUPER_ADMIN.
- No rate-limit.

**Master Tree:** §63 Compliance · §84 Data Privacy.

### 2.7 User Dashboards Phase 1 (Common) — **Grade 7/10**

**What exists (`/dashboard`, 1 822 lines):**
- Overview + Profile (11 fields: avatar · bio · timezone · language · currency · companyName · reraLicense · brnNumber · phone · email · name).
- Favorites (SavedParcel CRUD).
- Saved Searches (SavedSearch with filters + location bounds).
- Notifications (Notification inbox + read/readAll).
- Activity Log (ActivityLog stream).
- Settings.

**Coming Soon banners (confirmed 8 in code):**
- Portfolio stats — placeholder (Phase 2: OWNER analytics · BROKER commissions).
- Per-plot detail analytics — Phase 2.
- Comparison tool + Dream Board — Phase 4.
- Document management — Phase 2.
- Commission pipeline — Phase 3 (BROKER).
- Email / web-push notification delivery — Phase 6. **← Issue #19**
- Map defaults + language/currency switching — Phase 2 (UI present, NOT wired).
- Price-drop / relisting actions — Phase 2.

**What 10/10 looks like:**
- All 8 ComingSoon banners replaced with live functionality.
- Role-specific dashboards (Broker · Developer · Owner · Investor · Architect).
- Real-time notification delivery (email · push · telegram · WhatsApp).
- Document upload + OCR + expiry tracking.
- Commission payout requests (BROKER).

**Known gaps:** 8 explicit Phase 2-6 deferrals.

**Master Tree:** §77 Web Platform Dashboard · §17/§18/§19/§20/§21 role dashboards.

### 2.8 Admin Panel (pre-§14) — **Grade 5/10**

**What exists (`/admin/ambassadors`, 644 lines):**
- Single admin page: ambassador applications review queue.
- Tabs: All · Pending · Approved · Rejected · Active.
- Search by name / email.
- Approve / Reject modals with reason capture.
- Detail modal (application full view).
- Glass UI consistent with FEASIBILITY_STYLE_GUIDE.
- Layout guard at `/admin/layout.tsx` (client-side probe of `/api/admin/me`).

**What 10/10 looks like (per Spec 03 v1 + v2):**
- v1: CRUD for 5 core entities (User · Parcel · Deal · Ambassador · Commission) + feature flags + tier editor.
- v2 Super-Admin §14: role impersonation · state override · bulk ops · SQL shell · feature bypass · session intervention · audit log browser · WireGuard gate.

**Known gaps:**
- No User CRUD UI.
- No Parcel CRUD UI.
- No Deal CRUD UI.
- No Commission payout UI.
- No feature flags.
- No tier editor.
- No Super-Admin mode.
- No audit log browser.

**Tech debt:** admin is 90 % unbuilt vs Spec 03 v2.0 target.

**Master Tree:** §75 Admin Panel.

### 2.9 Ambassador Program — **Grade 8/10**

**What exists:**
- `/join` public landing (1 178 lines) with Silver / Gold / Platinum tiers + USDT TRC-20 payment wallet + 10-item onboarding checklist.
- `AmbassadorApplication` Prisma model + admin review workflow.
- Admin queue at `/admin/ambassadors`.
- `/ambassador` signed-in dashboard (431 lines) — downline + commissions + QR share.
- Commission engine (`src/lib/ambassador.ts` 451 lines) with 3-level walker + immutable Commission ledger + `ZAAHI_SERVICE_FEE_RATE = 0.02` (2 %).
- `/r/[code]` referral click tracker.
- QR code generation (`qrcode` package).
- Tier-aware rates: 5/2/1 · 10/4/1 · 15/6/1.

**What 10/10 looks like:**
- Automated USDT transaction verification (Tronscan API).
- Live downline visualization (tree graph).
- Commission payout automation (Network International + TRC-20 auto-send).
- Leaderboard + share-card generator.
- Skip-inactive policy enforcement at runtime.

**Known gaps:**
- USDT tx manual-verify (admin opens Tronscan, looks up txHash manually).
- No payout automation (admin marks PAID manually).
- No leaderboard.
- No multisig yet on wallet (CLAUDE.md says single-sig `TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7` · Enhancement Proposal SV-7 Month 5-6 adds multisig).

**Master Tree:** §18 Ambassador · §32 Escrow.

### 2.10 Site Plan PDF — **Grade 9/10**

**What exists (`src/lib/generate-site-plan-pdf.ts` 423 lines):**
- jsPDF-based generation (NOT Puppeteer — confirms Style Guide finding).
- Plot geometry · affection plan · building limit · setbacks · 3D preview thumbnail.
- Consistent ZAAHI branding (gold + Georgia serif).
- Triggered from Side Panel "Download Site Plan" button.
- Plot Guidelines PDF proxy via `/api/parcels/[id]/plot-guidelines` + `/api/parcels/[id]/pdf`.

**What 10/10 looks like:**
- EN / AR / RU language toggle.
- Digital signature field (DLD-ready).
- QR code with deep-link to plot.
- Printable at A4 portrait or landscape.

**Known gaps:** English-only output.

**Master Tree:** §01 Land · §77 Platform.

### 2.11 Drone Mode — **Grade 9/10**

**What exists (`src/lib/drone-controls.ts` 286 lines):**
- WASD + Space + Shift + Shift-turbo navigation.
- Right-click pointer-lock for bearing + pitch rotation.
- Toggleable via UI button (under 2D/3D toggle).
- localStorage persistence (`zaahi-drone-mode`).
- Ignores keys when focus in `input` / `textarea` / contenteditable.
- Velocity-based easing physics.
- Desktop-only (disabled on touch).

**What 10/10 looks like:**
- Mobile gamepad support.
- Preset camera positions (bookmark views).
- Cinematic tours (auto-fly from plot A to plot B).

**Known gaps:** Desktop only.

**Master Tree:** §39 Metaverse · §77 Platform.

### 2.12 Check DLD button — **Grade 7/10**

**What exists:**
- Popup dialog with 7-digit plot number validation.
- External link to DLD public verification.
- Invoked from Side Panel for LISTED plots.

**What 10/10 looks like:**
- Inline result (fetch from DLD transaction API + display side-by-side with ZAAHI record).
- Comparable-deals list ("5 recent sales in this district").
- One-click "add to comparison basket."

**Known gaps:**
- No inline data — opens external link only.
- No DLD API integration (blocked: AED 30k/yr fee + RERA licence).

**Master Tree:** §66 Market Intelligence.

---

## SECTION 3 — PARTIAL / IN-PROGRESS

### 3.1 Email / SMS notifications (BROKEN — Issue #19) — **Grade 3/10**

**Integration points exist:**
- `src/lib/email.ts` (86 lines) — Resend wrapper with graceful degradation (silent skip if `RESEND_API_KEY` missing).
- `src/lib/telegram.ts` (109 lines) — Telegram Bot API wrapper (silent skip if `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID` missing).
- 4 email templates: `application-received` · `application-approved` · `application-rejected` · `new-application` (+ `_layout.ts`).
- Resend npm package v6.12 installed.
- Dashboard ComingSoon banner confirms: "Email + web-push delivery of these notifications — Phase 6. Preferences toggles below are UI-only."

**What's missing:**
- `RESEND_API_KEY` — **NOT SET in `.env.local`** (per Issue #19).
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` — likely NOT SET.
- SMS integration entirely absent (no Twilio / WhatsApp Business).
- Push notification system not built (Phase 6 per dashboard banner).
- Per-user preference wiring (UI present in Settings but doesn't drive real delivery).

**Fix effort:**
- Minimum viable email: set `RESEND_API_KEY` in Vercel env + verify 4 templates work · **~2 hours**.
- Telegram admin notifications: set bot token + chat ID · **~30 min** (code already present).
- SMS (Twilio): ~1 eng-week (new integration).
- Push notifications: ~2 eng-weeks.

### 3.2 Supabase Storage vs Cloudflare R2 migration — **Grade N/A (not started)**

**Current:**
- Supabase Storage used for PDFs (plot-guidelines, affection plans, site plans).
- `data/` directory (local) holds KML · PMTiles · plot-prices.xlsx · master-plans.

**Migration status:** Not started. Enhancement Proposal §1.B SV-3 references "Khazna / Etisalat" (UAE-resident) for backups; no Cloudflare R2 in current spec stack.

### 3.3 Phase 2 role-specific dashboards — **0 of 6 started**

Common Phase 1 is live. Role-specific dashboards per Master Tree §17/§18/§19/§20/§21:
- Owner Analytics — NOT STARTED (Phase 2 banner in code).
- Broker OS (profile · listings · commissions · clients) — NOT STARTED.
- Developer dashboard — NOT STARTED.
- Investor portal — NOT STARTED.
- Architect portal — NOT STARTED.

### 3.4 Broker OS — **Grade 0/10 (not started)**

Referenced in `/dashboard` ComingSoon banner: "Commission pipeline + payout requests — Phase 3 (BROKER dashboard)."
No broker-specific page, no commission UI (beyond ambassador dashboard).

### 3.5 Owner Analytics — **Grade 2/10 (placeholder)**

Dashboard has "Portfolio stats below are placeholder figures — live data lands in Phase 2 (OWNER analytics)". Numbers hardcoded for demo.

### 3.6 Contract generation · Counter-offer flow — **Grade 4/10 (partial)**

**What exists:**
- `DealMessage` model + deal room UI at `/deals/[id]` (546 lines).
- Deal state machine (12 states · 15 actions · `src/lib/deal-flow.ts` 140 lines).
- OfferModal on `/parcels/map` Side Panel.
- Counter-offer action (`COUNTER`) logged in ACTIONS matrix.

**What's missing:**
- Form F / MOU PDF auto-generation (Spec 01 Deal Engine MVP adds).
- Counter-offer UI flow (action exists in state machine, not surfaced in UI explicitly).
- Document templates library.

### 3.7 Other 🟡 state features in codebase

- **Dashboard language / currency switching** — UI present but "not wired yet" (Phase 2 banner). Persists to DB `User.language` / `User.currency` but doesn't affect UI rendering.
- **`/admin/ambassadors` stats card** — `totalRevenueAed` computed from active applications; doesn't reconcile to actual USDT received.
- **`/api/cat/chat`** — 9-line placeholder stub. Should be removed or redirected to `/api/chat`.

---

## SECTION 4 — MASTER TREE §77 GAP ANALYSIS

### 4.1 Full Dashboard (§77 critical node) — **~40 % done**

**Current:** Phase 1 Common dashboard live (7 tabs · 1 822 lines). Role-specific dashboards NOT started.

**What §77 requires:**
- Per-role dashboards for OWNER · BUYER · BROKER · INVESTOR · DEVELOPER · ARCHITECT · AMBASSADOR (7 total).
- Portfolio analytics · deal pipeline · document vault · notification delivery · commission pipeline · saved-search alerts.

**Gap:** 6 role-specific dashboards × ~1 000 lines each ≈ 6 000 lines + backend + notifications. **~12-18 engineer-weeks** to complete Phase 2.

### 4.2 Browser Metaverse (§77 + §39 + §40) — **~60 % done**

**Current:** 3D ZAAHI Signature via MapLibre fill-extrusion + R3F stack available. Podium/body/crown tiering live for 114 parcels.

**What §77 Metaverse requires:**
- Full 3D walkthrough (first-person · WASD on buildings).
- VR/AR ready (WebXR).
- Interior rendering (walk inside listed apartments).
- Collaborative multi-user sessions (see other users on map).

**Gap:** Interior rendering + WebXR + multi-user = **~20-30 engineer-weeks**. Phase 3 territory.

### 4.3 Advanced Analytics (§77 + §66-70) — **~20 % done**

**Current:** Feasibility Calculator v5.0 (partial — no IRR · no sensitivity).

**What §77 requires:**
- §66 Market Intelligence · DLD transaction comps · monthly reports.
- §67 Price Prediction (ML).
- §68 Risk Analysis (deal risk scoring).
- §69 Fraud Detection.
- §70 Investment Analytics.

**Gap:** 4 analytics nodes not started. DLD integration needs AED 30k/yr + RERA. **~25-40 engineer-weeks** across Phase 2-3.

### 4.4 White-label (§77 scaling) — **0 % done · DOES NOT EXIST**

**Current single-tenancy state:**
- Prisma schema: **NO `Tenant` model · NO `tenantId` foreign key on any of 19 models**.
- `src/app/layout.tsx` hardcodes `<html lang="en">` + "ZAAHI — Real Estate OS" title.
- `src/app/page.tsx` brands the landing page with GOLD `#C8A96E` hardcoded.
- `src/lib/constants.ts` + `src/lib/ambassador-plans.ts` + `globals.css` all hardcode ZAAHI palette + tier prices.
- No subdomain / custom-domain routing (zaahi.io + zaahi.vercel.app only).
- Supabase Auth is single-project; `user_metadata.approved` is platform-global.
- Middleware has no tenant-routing awareness.

**What §77 White-label requires:**
- `Tenant` model: id · slug · name · primaryColor · secondaryColor · logoUrl · customDomain · usdtWallet · tierPrices · (many more fields).
- `tenantId` foreign key on: User · Parcel · Deal · Invoice · Commission · AmbassadorApplication · Notification · ActivityLog · SavedParcel · SavedSearch · FeasibilityScenario (when added) — **~15 tables minimum**.
- Middleware: resolve tenant from subdomain or custom domain · set RLS context.
- Supabase Row-Level Security policies (per-tenant isolation) — huge data-access refactor.
- All hardcoded ZAAHI branding → tenant-scoped theme loader.
- Per-tenant admin panel slice.
- Per-tenant USDT wallet, payment routing.
- Tenant onboarding workflow.
- Cross-tenant data isolation tested.

**Effort to tenantize current codebase before layering White-label:**
- Schema migration (add Tenant + tenantId to 15 tables + data-backfill): **1-2 eng-weeks**.
- Middleware + RLS: **1-2 eng-weeks**.
- Theme system (runtime CSS custom property loading from Tenant): **1-2 eng-weeks**.
- Refactor hardcoded strings + palette to tenant-scoped (touches ~200 files): **2-3 eng-weeks**.
- Per-tenant admin UI: **2-3 eng-weeks**.
- Integration testing + multi-tenant end-to-end: **1-2 eng-weeks**.
- **Total: 8-14 engineer-weeks for foundation before any "White-label" features ship.**
- White-label-as-a-service marketing / onboarding / billing: **additional 4-8 eng-weeks**.
- **Grand total: 12-22 engineer-weeks for White-label layer.**

### 4.5 i18n · 6 languages (§49) — **~5 % done**

**Current:**
- `<html lang="en">` hardcoded.
- `User.language` stored (6 options: EN · AR · RU · UK · SQ · FR) but doesn't drive UI.
- Dashboard banner: "language/currency switching live in UI but aren't wired yet."
- Archibald prompt includes "respond in user's language (EN/AR/RU)" — Archibald ONLY.
- No `next-intl` · no `useTranslation` · no translation files.

**What §77 requires:**
- Full i18n with 6 languages (EN · AR · RU · UK · SQ · FR).
- RTL layout support for AR.
- Per-language landing pages (SEO-friendly).
- Language detection + per-user override.
- Translated legal pages (terms · privacy).

**Architecture required:**
- `next-intl` or similar library.
- Translation files per language (/messages/en.json, /messages/ar.json etc.).
- RTL-aware CSS (logical properties: `inline-start` vs `left`).
- Mirrored UI elements (arrows).
- Font embedding for AR (Amiri + Tajawal already planned in FEASIBILITY_STYLE_GUIDE §9.4).

**Effort:** 6-10 engineer-weeks for foundation + 2-4 per language for translation QA = **14-24 eng-weeks**.

---

## SECTION 5 — PERFECTION TRACK ASSESSMENT

Features with Grade < 9. Ordered by ROI (impact ÷ effort).

### Tier 1 — Quick wins (high ROI)

| Feature | Current | 10/10 looks like | Gap items | Effort | Priority |
|---|:-:|---|---|---|---|
| Email/SMS (§3.1) | 3/10 | Resend + Telegram firing on admin events | Set env vars · verify 4 templates | **2-4 hrs** | 🔴 Revenue-blocking (Ambassador program · Rudi wire notifications) |
| Admin stub removal | — | Delete `/api/cat/chat` placeholder | 1-file delete + route update | **15 min** | 🟢 Cleanup |
| Admin Panel v1 (§2.8) | 5/10 | 5-entity CRUD + feature flags + tier editor | Per Spec 03 v1 | **1.5-2 eng-weeks** | 🔴 Unblocks founder self-service |
| Invoice + Commission tracker | 0/10 | FTA-compliant PDFs · commission payout UI | Per Spec 02 v1.1 | **2 eng-weeks** | 🔴 Critical path: first commission Fri 2026-06-19 |
| Deal Engine MVP (5 milestones) | 4/10 | Per Spec 01 | Per Spec 01 | **2-3 eng-weeks** | 🔴 Plot 1 close support |

### Tier 2 — Perfection of existing (medium ROI)

| Feature | Current | 10/10 | Gap | Effort | Priority |
|---|:-:|---|---|---|---|
| Feasibility Calc v2 | 7.5/10 | Per Spec 04 v1.1 | IRR + sensitivity + scenario save + AR/RU PDF | **1.5-2 eng-weeks** | 🟡 Dymo client-meeting tool |
| Archibald AI | 6/10 | Rate limit + tool use + RAG + streaming + fine-tune | Multiple upgrades | **4-6 eng-weeks cumulative** | 🟡 Owner leverage |
| Side Panel | 8.5/10 | Share link · compare · inline DLD | 3 features | **1 eng-week** | 🟡 UX polish |
| Dashboard ComingSoons (8) | 7/10 | Live data replacing placeholders | Phase 2 OWNER analytics · Phase 2 BROKER commissions · Phase 6 notif delivery | **8-12 eng-weeks across Phases 2-6** | 🟡 User trust |
| Super-Admin §14 | 0/10 | Per Spec 03 v2.0 | 12 subsections | **2-2.5 eng-weeks** | 🔴 "Meeting closes deal" — must ship before Plot 1 |

### Tier 3 — Longer-term investments (lower ROI, strategic)

| Feature | Current | 10/10 | Effort | Priority |
|---|:-:|---|---|---|
| Role-specific dashboards (6) | 0/10 | Per Master Tree §17-§21 | 12-18 eng-weeks | 🟡 Phase 2 (external users) |
| i18n (§49) | 5 % | Full 6-lang + RTL | 14-24 eng-weeks | 🟢 Phase 2-3 |
| Metaverse interior walkthrough | 60 % | WebXR + multi-user | 20-30 eng-weeks | 🟢 Phase 3 |
| Advanced Analytics | 20 % | §66-§70 nodes | 25-40 eng-weeks | 🟢 Phase 2-3 |
| White-label foundation (multi-tenancy) | 0 % | Tenant + RLS + theme loader | 12-22 eng-weeks | 🔴🟡 THE §77 scaling blocker |

**Perfection track total effort to reach all features ≥ 9/10:** ~80-130 engineer-weeks across 3-5 years at single-engineer pace. Realistic scoping to Phase 1 + Phase 2: **~25-35 eng-weeks** covers Tier 1 + Tier 2 + White-label foundation.

---

## SECTION 6 — BUS FACTOR & OPERATIONAL RISKS

### 6.1 Single points of failure

| Asset | Single point | Risk if lost | Mitigation status |
|---|---|---|---|
| Vercel admin | Zhan (sole) | Deploy pipeline down until Zhan reachable | ❌ No 2nd admin |
| Supabase project ownership | Zhan | DB + Auth down | ❌ No 2nd owner |
| GitHub repo `ZaahiPlots/Zaahi` | Zhan | Code inaccessible | ❌ No Dymo access verified |
| Domain Namecheap (zaahi.io) | Zhan | DNS lost | ❌ No 2nd holder |
| Anthropic API key | Zhan .env.local | Archibald down | ⚠️ Key only in 1 place |
| USDT Ambassador wallet | Single-sig `TELiibG...N4j7` | Wallet drain if seed lost/stolen | ❌ Multisig not yet (Enhancement Proposal SV-7 Month 5-6) |
| Agency bank account (post-SAFE) | To be opened Week 3 | First commission stuck | ⚠️ Planned but not in place |

**Overall Bus Factor = 1 (Zhan).** Single departure / illness / death of Zhan = platform halt. Dymo = single money SPOF. Critical for pre-Rudi wire (Mon 2026-05-04 per MASTER_IMPLEMENTATION_PLAN.md).

### 6.2 Credentials management

- `.env.local` file at project root (674 bytes · 2026-04-14 last touched).
- Git-ignored correctly.
- No visible 1Password / Bitwarden shared vault referenced in docs.
- Recovery procedure: not documented.

### 6.3 Env var gaps (Ambassador program blocker)

Required for Ambassador program launch + Rudi-wire notification:
- ⚠️ `RESEND_API_KEY` — **MISSING** (Issue #19; email silent-skip)
- ⚠️ `TELEGRAM_BOT_TOKEN` — likely missing
- ⚠️ `TELEGRAM_ADMIN_CHAT_ID` — likely missing
- ✅ `ANTHROPIC_API_KEY` — presumed set (Archibald works)
- ✅ `DATABASE_URL` — set (Prisma works)
- ✅ Supabase keys — set

### 6.4 Mitigation plan (before Rudi AED 1M wire Mon 2026-05-04)

Prioritised for founder:
1. **Set `RESEND_API_KEY`** in Vercel env + test email flow — **30 min**.
2. **Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`** — **30 min**.
3. **Add Dymo as 2nd admin** on Vercel + Supabase + GitHub + Namecheap — **1-2 hrs total**.
4. **Set up 1Password Family vault** for Zhan + Dymo with all credentials — **1 hr**.
5. **Document emergency recovery procedures** (`docs/ops/recovery.md` outline) — **30 min**.
6. **Key-person insurance** (Enhancement Proposal §7 Risk 4) — **Month 6+ per plan**.
7. **Multisig wallet migration** — Month 5-6 per Enhancement Proposal SV-7.

**Total mitigation time before Rudi wire: ~5 hours. HIGH PRIORITY.**

---

## SECTION 7 — COMPLIANCE STATUS

### 7.1 UAE Advertiser Permit (Feb 2026 · fines up to AED 1 M)

- **Wall launch:** BLOCKED per `PARKED_PROJECTS.md` entry — legal review required.
- **Ambassador program:** needs review — public promotional activity · tier commissions · referral tracking.
- **ZAAHI own marketing:** needs review — content on `/`, `/join`, social LinkedIn posts.
- **Legal review status:** not initiated (no engagement letter signed with BSA yet per IMPLEMENTATION_CHECKLIST Week 1 Day 2).

### 7.2 PDPL FDL 45/2021 — data handling

**What's in place:**
- CookieConsent component (user-visible).
- Privacy policy page (555 lines).
- `ReferralClick.ipHash` (SHA-256 salted) · no raw IPs stored.
- PII fields present in User (email · phone · name) but no encryption at rest.

**Gaps (per Enhancement Proposal §1.A):**
- S-6 PII column encryption — NOT started.
- S-10 DPO designation + data-processing register — NOT started.
- S-10b Privacy Centre UI (right to access / deletion / portability) — NOT started.
- 72-hr breach notification process — not documented.

### 7.3 RERA compliance — broker licensing

**What exists:**
- `User.reraLicense` + `User.brnNumber` fields in schema.
- Broker role · BROKER = one of 7 UserRole enum values.

**Gaps:**
- No RERA verification API integration (would require formal RERA API access + probably BRN credentials per broker).
- No auto-validation of BRN format.
- No RERA credential expiry tracking.

### 7.4 VAT (5 %) + CT 9 % readiness

**What exists:**
- `Deal.platformFeeFils` stored as BigInt fils.
- Ambassador service-fee calculation at 2 %.

**Gaps (per Spec 02 v1.1):**
- NO `Invoice` Prisma model.
- NO Tax Invoice PDF generator.
- NO TRN field on User.
- NO VAT 5 % computation line on invoices.
- EmaraTax CT registration not done (Week 3 per IMPLEMENTATION_CHECKLIST).

---

## SECTION 8 — RECOMMENDED BUILD ORDER

### 8.1 Quick wins (< 1 eng-week each, high impact)

1. **Set RESEND_API_KEY + Telegram env** → unblocks Ambassador + Rudi notifications · **~1 hr total** 🔴
2. **Delete `/api/cat/chat` placeholder stub** → removes confusion · **15 min** 🟢
3. **Add Dymo as 2nd admin on Vercel + Supabase + GitHub** → bus factor mitigation · **~1-2 hrs** 🔴
4. **1Password Family vault setup** → recovery-proof credentials · **~1 hr** 🔴
5. **`docs/ops/recovery.md` emergency procedures** → **~30 min** 🟡
6. **Patch Prisma schema comment:** `Deal.platformFeeFils` (0.25 % → 2 %) per Spec 02 v1.1 §3.4 → **1-line edit** 🟢
7. **Remove 5 016-line map `page.tsx` one-file-ness** → extract top-level state into `hooks/` · NOT urgent but worth queuing · **3-5 eng-days** 🟡

### 8.2 Perfection track sequence (Tier 1 + Tier 2)

Order by critical path:
1. Email/SMS env fix (quick win) — 1 hr.
2. Spec 02 v1.1 Invoice + Commission (Month 2-3) — 2 eng-weeks. 🔴 Critical: Plot 1 commission Fri 2026-06-19.
3. Spec 01 Deal Engine MVP (Month 3-4) — 2-3 eng-weeks. 🔴 Plot 1 close.
4. Spec 03 v1 Admin Panel MVP (Month 4) — 1.5-2 eng-weeks.
5. **Spec 03 v2.0 Super-Admin §14 (Month 4-5, before Plot 1 commission)** — 2-2.5 eng-weeks. 🔴 "Каждая встреча = сделка."
6. Spec 04 v1.1 Feasibility v2 (Month 4-5) — 1.5-2 eng-weeks.
7. Archibald improvements (rate limit + tool use) — 2-3 eng-weeks (Month 6-8).
8. Dashboard ComingSoon cleanup (OWNER analytics · BROKER commissions) — 4-6 eng-weeks (Month 6-9).

**Tier 1 + Tier 2 total: ~16-22 eng-weeks across Months 2-9 (Phase 1).** At Zhan's 15 % eng allocation = ~14 hr/week eng capacity = 28-35 calendar weeks = **feasible within Phase 1 9-month window.**

### 8.3 Foundation for White-label (multi-tenancy preparation)

Must happen BEFORE any White-label UX / marketing / billing work:
1. Add `Tenant` Prisma model + migration.
2. Add `tenantId` foreign key to 15 core models.
3. Data backfill (all existing data → default ZAAHI tenant).
4. Middleware tenant resolution (subdomain → tenant ID).
5. Supabase RLS policies per-tenant.
6. Refactor hardcoded ZAAHI palette + brand strings → tenant-scoped loader.
7. Per-tenant admin UI slice.
8. Multi-tenant integration tests.

**Foundation effort: 8-14 eng-weeks.** Not Phase 1 work — Phase 2+.

### 8.4 §77 White-label layer build order

Sequenced after foundation:
1. Tenant signup / onboarding workflow.
2. Tenant admin panel (per-tenant settings · theme · tier editor · USDT wallet).
3. Custom domain support (Vercel domain-per-tenant).
4. Per-tenant billing (tenant subscription model).
5. Tenant marketing page (landing + pricing).
6. Tenant agreement legal docs.
7. Tenant support onboarding (docs · video · email).
8. First pilot tenant (internal test tenant).
9. 1-2 external pilot tenants.
10. GA launch.

**Layer effort: 4-8 eng-weeks.** Phase 3 Year 2 territory.

### 8.5 Dependencies map

```
[Env-var fix] → [Ambassador notifications work] → [Ambassador pilot Month 6-9]
                                                        ↓
[Spec 02 Invoice] → [Spec 01 Deal Engine] → [Plot 1 Fri Jun 19 first commission]
                                              ↓
                           [Spec 03 v1 Admin] → [Spec 03 v2 Super-Admin §14]
                                                        ↓
                               [Phase 1 complete Month 9 · Plot 1-2 closed]
                                                        ↓
                                [White-label foundation: Tenant + RLS]
                                                        ↓
                                        [Phase 2 · §77 scaling]
                                                        ↓
                                   [First pilot tenant · GA White-label]
```

### 8.6 Agent top-line recommendation

**BEFORE §77 spec writing, complete these 3 actions:**

1. **Fix env vars (RESEND + Telegram)** — 1 hr. Unblocks every Ambassador + Rudi-wire notification. Can't ship Ambassador pilot Month 6-9 without this.

2. **Mitigate bus factor** (Dymo as 2nd admin everywhere, 1Password vault, recovery docs) — ~5 hrs. Critical before Rudi AED 1 M wire Mon 2026-05-04. Rudi will not wire into a single-person-dependent system.

3. **Execute perfection track Tier 1** (Spec 02 + Spec 01 + Spec 03 v1 + v2) — ~8-10 eng-weeks across Months 2-5. This is the committed Phase 1 plan. NO §77 White-label work should start until these ship because: (a) White-label extends these systems, (b) Plot 1 commission Fri 2026-06-19 depends on these, (c) Super-Admin §14 is needed for "каждая встреча = сделка."

**Should founder write §77 spec now OR perfection cycle first?**

**Agent recommendation: Perfection cycle FIRST.** Specifically:
- Ship Tier 1 by Month 5 (Plot 1 first commission unblocked).
- During Months 6-9, write §77 spec IN PARALLEL with Ambassador soft-pilot running · real-world feedback informs White-label design.
- §77 spec activation target: Month 10 (Phase 2 opening).
- Frame for founder: §77 is a **Phase 2 deliverable spec**, not a Phase 1 build. Writing it now without Phase 1 production feedback risks speculative over-design.

**Counter-argument for "write §77 now":** if founder wants to include "White-label roadmap" in Series A data room / v7.1 investor-package refresh, the §77 spec as architectural document has investor value independent of build.

**Compromise:** 2-phase §77 spec.
- Phase 1 (now): **§77 ARCHITECTURE** doc (~1 500-2 000 lines, ~40 hours) — high-level framework, tenant model design, white-label sequencing. Usable in data room.
- Phase 2 (Month 10+): **§77 BUILD SPEC** (~2 000-4 000 lines) — per-module implementation once Phase 1 feedback is in.

---

## SECTION 9 — OPEN QUESTIONS FOR FOUNDER

### 🔴 BLOCKING (needed before §77 spec writing)

1. **§77 target audience — scaling model?** White-label to (a) other UAE brokerages · (b) sovereign real-estate arms (IMKAN · Aldar · Emaar) · (c) cross-border (GCC · CIS · Europe) · (d) SaaS marketplace open signup?
2. **Multi-tenancy approach?** (a) Shared DB + RLS · (b) DB-per-tenant · (c) Hybrid (RLS for small tenants, dedicated DB for enterprise). Huge architectural fork.
3. **Branding flexibility per tenant?** (a) Colors + logo only · (b) Fonts + colors + logo · (c) Full CSS override + custom components · (d) Full white-label (tenant sees no ZAAHI references at all).
4. **Does ZAAHI-the-brand remain visible under white-label?** "Powered by ZAAHI" footer (like Shopify) or invisible (like Salesforce white-label)?
5. **Pricing model?** SaaS monthly per-tenant? Revenue share on deals? Per-seat? Free for pilot + paid at scale?
6. **Should §77 spec write now or AFTER Phase 1 Tier 1 ships?** Agent recommends Phase 1 first; founder may prefer architecture-first for data-room.

### 🟡 IMPORTANT (needed in Phase 1)

7. **Bus factor mitigation timing?** Before or after Rudi wire Mon 2026-05-04?
8. **Env var blockers — who sets them?** Zhan alone? Dymo access to Vercel env?
9. **Archibald rate limiting — which tier gets what?** (e.g., Silver Ambassador 50 chats/month · Gold 200 · Platinum unlimited)
10. **DLD API integration — is AED 30k/yr + RERA licence in Phase 1 budget?** (Enhancement Proposal §4 allocates AED 1.5-1.7M Y1 but no DLD API line)
11. **Dashboard ComingSoon cleanup order** — which of 8 banners replaced first? Founder priority.
12. **Deal Engine MVP before Plot 1 Fri 2026-06-19** — confirm commitment; any slippage means Plot 1 runs on Excel + WhatsApp.

### 🟢 NICE-TO-KNOW (anytime)

13. **Split `/parcels/map/page.tsx` (5 026 lines)** into hooks + sub-components — schedule when?
14. **Remove `/api/cat/chat` placeholder** — schedule.
15. **i18n library choice** — `next-intl` vs custom vs Lingui?
16. **Test framework** — Jest, Vitest, or Playwright? Founder preference?
17. **Soft-delete pattern adoption** — Enhancement Proposal §1.E E-4 suggests soft-delete column convention; when adopted globally?
18. **Commit-to-Supabase-Storage vs Cloudflare R2 migration** — schedule?

---

**End of `WEB_PLATFORM_CURRENT_STATE_2026-04-22.md`.**

Next document if founder approves perfection-cycle-first: commit this audit · founder answers Q1-Q6 · §77 ARCHITECTURE spec or wait for Phase 1 completion per founder decision.

Source artefacts cross-referenced:
- `MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.2 (commit `45f23f5`)
- `docs/specs/phase-1/01-DEAL_ENGINE_MVP_SPEC.md` (commit `ff1dba6`)
- `docs/specs/phase-1/02-INVOICE_COMMISSION_SPEC.md` v1.1 (commit `0caf9de`)
- `docs/specs/phase-1/03-ADMIN_PANEL_SPEC.md` v2.0 (commit `0cd6542`)
- `docs/specs/phase-1/04-FEASIBILITY_CALC_V2_SPEC.md` v1.1 (commit `03b272b`)
- `docs/specs/phase-1/FEASIBILITY_STYLE_GUIDE.md` (commit `2f34899`)
- `docs/decisions/PARKED_FEASIBILITY_FRAMEWORK_DECISION.md` (commit `4f1dd23`)
- `CLAUDE.md` (engineering source-of-truth)
- Live codebase `src/**` + `prisma/schema.prisma` (read-only survey 2026-04-22)
