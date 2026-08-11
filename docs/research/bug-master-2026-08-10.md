# ZAAHI — Master Bug List (consolidated)

**Compiled:** 2026-08-10 · **Branch:** `research/bug-consolidation-2026-08-10` · **Baseline:** `main` @ `e5300af`
**Read-only.** No `src/**` edits, no DB writes, no push to `main`.

Every item below was re-verified against **current `main`**. Nothing is called fixed without a commit SHA; nothing is called broken without a `path:line` or a live HTTP result. Where I could not prove either way, the row says **UNKNOWN** and names what would settle it.

> **Baseline note:** this branch is cut from `main`, so the four Phase-B control fixes are *not* in this tree. They live on `fix/dead-controls-2026-08-10` (pushed, unmerged). Items fixed only on that branch are marked **STILL BROKEN on main · fix pending merge** with the SHA — because until it merges, production still has the bug.

---

## Counts

| Class | Count |
|---|---:|
| **STILL BROKEN — P0** | **3** |
| **STILL BROKEN — P1** | **11** |
| **STILL BROKEN — P2** | **19** |
| **STILL BROKEN — total** | **33** |
| ALREADY FIXED (SHA cited) | 16 |
| STALE (no longer applies) | 4 |
| UNKNOWN (needs browser / repro / founder) | 5 |
| Not re-litigated (~440 statically-wired controls) | — |

Sources merged: `backlog-full-extract-2026-08-10.md` (90 items) · `zaahi-diagnostic-2026-08-10.md` · `dead-controls-2026-08-10.md` (on `fix/` branch) · the 39-item `POST_DEMO_BACKLOG_2026_04_16.md` (history-only, branch `backlog/post-demo-2026-04-16`, never triaged) · `docs/research/*` on main.

---

## P0 — data loss, security, or user-facing total failure

| id | description | sev | effort | blocker | proof |
|---|---|---|---|---|---|
| **BUG-001** | **Production Supabase DB password never rotated after exposure.** `.env.local` — containing production `DATABASE_URL` and `DIRECT_URL` — was echoed into a session transcript on 2026-04-29. Rotation was raised then and has no recorded action. **104 days open.** | P0 | S | founder + Supabase dashboard access | `founder-decision-pack-2026-04-29.md` Q-B1 (history-only): *"Rotate Supabase DB password — `.env.local` was echoed into bugs-batch session transcript (production `DATABASE_URL` / `DIRECT_URL` exposed)."* No rotation commit or note exists on any branch. |
| **BUG-002** | **Next.js 15.5.14 is below every security patch line.** Middleware/proxy bypass (needs ≥15.5.18), SSRF in Server Actions and rewrites (≥15.5.21), DoS (≥15.5.16). Critical here because `src/middleware.ts` **is** the Bearer-presence gate for all 303 API routes — a middleware bypass is the exact primitive that defeats it. Mitigating: handlers independently re-verify, so a bypass alone yields no data (one exception, BUG-015). | P0 | S bump / M with regression | none | `package.json:25` → `"next": "^15.3.1"`, resolving to **15.5.14** (build banner: `▲ Next.js 15.5.14`). `pnpm audit`: 28 high, incl. 7 distinct `next` advisories. |
| **BUG-003** | **Prisma schema has drifted from production — next `migrate dev` reverses cascade rules.** 7 FKs carry different referential actions in the live DB than `schema.prisma` declares (`ActivityLog.userId`, `Notification.userId`, `ParcelView.parcelId`/`userId`, `SavedParcel.userId`/`parcelId`, `SavedSearch.userId`), plus `AmbassadorApplication.updatedAt` default. Prod has `ON DELETE CASCADE`/`SET NULL`; schema implies `RESTRICT`. Any developer running `prisma migrate dev` generates a "corrective" migration that **flips production's delete semantics on six user-owned tables**. | P0 | M | needs a scratch/staging DB (shadow-DB check is a write — skipped) | `prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --exit-code` → **exit 2 (drift)**, run 2026-08-10. `prisma migrate status` misleadingly reports *"Database schema is up to date!"* — all 21 migrations applied. Also recorded independently in `BACKLOG.md:7-55` (dated 2026-05-22, still open). |

---

## P1 — feature broken for all users

| id | description | sev | effort | blocker | proof |
|---|---|---|---|---|---|
| **BUG-004** | **Start Negotiation notifies the counterparty through no channel at all.** Submitting an offer creates the `Deal` row and stops. No email, no Telegram, no in-app `Notification`, no SMS. Reported 2026-04-16 as P0-9; **117 days open**. | P1 | M (email) / L (+SMS) | SMS provider decision + credentials | `src/app/api/deals/route.ts` is 114 lines and contains **0** occurrences of `sendEmail`, `sendTelegram`, or `prisma.notification` (grep count 0). No SMS provider exists anywhere in `src/` (`twilio`/`SMS_` → no matches). `src/lib/email.ts` exists and works — this route simply never calls it. |
| **BUG-005** | **`pnpm build` fails from a clean checkout.** pnpm 11 ignores `package.json`'s `pnpm.onlyBuiltDependencies`, so Prisma's postinstall never runs and webpack dies on `Module not found: Can't resolve '.prisma/client/index-browser'`. Blocks CI, onboarding, and every local verification. Production unaffected (Vercel injects `prisma generate`). | P1 | S | **fix pending merge** | On main: `package.json:8` → `"build": "next build"` (no generate) and `package.json:35-40` still carries the dead `pnpm` field. **Fixed on `fix/dead-controls-2026-08-10` @ `10b2ced`**, proven by clean-clone `INSTALL_EXIT=0` / `BUILD_EXIT=0`. |
| **BUG-006** | **"Download Official PDF" on the plot detail page is a guaranteed 401.** Plain `<a href>` to an auth-gated API cannot send a Bearer token. | P1 | S | **fix pending merge** | On main: `src/app/parcels/[id]/page.tsx:54-61`. Route gated at `src/app/api/parcels/[id]/pdf/route.ts:10` (`getApprovedUserId`); `src/middleware.ts` 401s `/api/*` without a Bearer header. `src/lib/download.ts:7-9` documents this exact failure. **Fixed on `fix/` @ `ad9ecbd`.** Note the *map SidePanel* copy of this control was already correct — see FIXED-06. |
| **BUG-007** | **"Open in 3D →" links to a route that does not exist** → 404 whenever it renders. | P1 | S | **fix pending merge** | On main: `src/app/parcels/[id]/page.tsx:62-69` → `/parcels/[id]/3d`. Only directory under `src/app/parcels/[id]/` is `feasibility/`. **Fixed on `fix/` @ `5384cfd`.** |
| **BUG-008** | **Email authentication incomplete — apex has no SPF, DMARC unenforced.** Default sender is `noreply@zaahi.io`. Apex publishes no SPF at all; DMARC is `p=none` with **no `rua=`**, so the domain is neither enforced nor observable. DKIM is fine. | P1 | S + DNS propagation | DNS registrar access | Live DNS 2026-08-10: `zaahi.io TXT` → google-site-verification only, no `v=spf1`. `_dmarc.zaahi.io TXT` → `"v=DMARC1; p=none;"`. `resend._domainkey.zaahi.io` → present. `send.zaahi.io TXT` → `v=spf1 include:amazonses.com ~all`. Sender default at `src/lib/email.ts:58`. |
| **BUG-009** | **Six `.env.local` values are the literal string `[SENSITIVE]`, silently degrading local dev.** `vercel env pull` redacts vars marked Sensitive. Consequences: `/api/registration/submit` returns 503 locally; all email and Telegram silently no-op; **the map cannot load tiles at all locally** (`NEXT_PUBLIC_TILES_BASE_URL` resolves to `[SENSITIVE]/tiles/...`). Production unaffected. | P1 | S | Vercel project admin | Values 11 chars each = `len("[SENSITIVE]")`: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_IDS`, `FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_TILES_BASE_URL`. Header of `.env.local`: `# Created by Vercel CLI`. |
| **BUG-010** | **Feasibility Calculator returns wrong ROI for some land-use × building-style combinations.** Founder-reported regression from the v5.0 pass. | P1 | M–L | **needs founder repro case** (one plot, expected vs actual) | `POST_DEMO_BACKLOG_2026_04_16.md` P0-5. **UNKNOWN against current main** — no failing case in hand, and the calculator has since been rewritten (`src/components/feasibility/FeasibilityV6Calculator.tsx`). Cannot confirm or clear without the repro. |
| **BUG-011** | **Layers panel conflict — Plot Numbers vs DDA Districts produce conflicting visual output** when both are toggled on. | P1 | M | **NEEDS BROWSER** | `POST_DEMO_BACKLOG_2026_04_16.md` P0-12. Not statically provable — it is a render-order / minzoom interaction. Both layers still exist (`src/app/parcels/map/page.tsx:1462` `metro`/base category registry). |
| **BUG-012** | **Geometry wrong — Dubai Islands plot 1010469.** `WRONG_GEOMETRY_UNKNOWN_SOURCE`; seed script synthesised a rectangle from grid-tick bounds. | P1 | S once unblocked | **founder must supply** DIA-RE-0167 affection plan PDF *or* 4 corner coords | `POST_DEMO_BACKLOG_2026_04_16.md` P0-10, sourced from `prisma/migrations/manual/20260416_geometry_misalignment_fix/README.md` (branch `fix/geometry-misalignment`). Still listed as blocked; no corrective commit on any branch. |
| **BUG-013** | **Geometry — 4 further misaligned plots from the founder audit, never identified.** | P1 | M | **founder must name the 4 plot numbers** | `POST_DEMO_BACKLOG_2026_04_16.md` P0-11: *"founder reported misalignments on plots beyond the 5 already investigated… founder needs to name them."* Unresolved 117 days. |
| **BUG-014** | **`src/lib/vault-permission.ts` — the spec-referenced vault access-gate helper — is imported by nothing.** Its header cites *"Spec §4 … Resolves the caller's relationship to a VaultEntry: owner / …"*. With no consumer, the owner-vs-shared rule is re-derived inline across ~12 vault routes, so nothing guarantees they agree. This is an authorisation-consistency risk, not merely dead code. | P1 | M (audit) | decision on which behaviour is canonical | `grep -rl "vault-permission" src/` returns only the file itself → **0 importers** (re-verified on main 2026-08-10). |

---

## P2 — degraded / cosmetic / hygiene

| id | description | sev | effort | blocker | proof |
|---|---|---|---|---|---|
| **BUG-015** | `/api/modules` is an unauthenticated `fs.readdir` endpoint. `src/middleware.ts` only checks that a Bearer header *exists*; the handler has no verification. Discloses nothing today because `core/` is not deployed — but it is the only route with zero handler-level auth. | P2 | S | none | `src/app/api/modules/route.ts` — no `getApprovedUserId`, no `NextRequest` param (grep → no match). Live: `curl -H "Authorization: Bearer notarealtoken" https://www.zaahi.io/api/modules` → **200 `{"files":[]}`** while `/api/me` → 401 with the same token. |
| **BUG-016** | No `robots.txt` / `app/robots.ts` — no crawler directive at all. | P2 | S | none | `src/app/robots.ts` MISSING, `public/robots.txt` MISSING. |
| **BUG-017** | No `app/sitemap.ts`. | P2 | S | none | `src/app/sitemap.ts` MISSING. |
| **BUG-018** | No `app/opengraph-image.tsx` — ZAAHI links render as blank tiles on LinkedIn / X. | P2 | S | none | `src/app/opengraph-image.tsx` MISSING. |
| **BUG-019** | No `generateMetadata` on `/parcels/[id]` — no per-plot title/description. | P2 | S | none | `grep -c generateMetadata src/app/parcels/[id]/page.tsx` → **0**. |
| **BUG-020** | No `openGraph` / Twitter meta on the root layout. | P2 | S | none | `grep -c openGraph src/app/layout.tsx` → **0**. |
| **BUG-021** | No per-district landing pages (`/district/[slug]`). | P2 | M | none | `src/app/district/` MISSING. |
| **BUG-022** | "Upload Document" renders as a full-strength gold CTA with `cursor: pointer` and silently does nothing — no `onClick`, no `disabled`. Every other stub in the file signals inertness. | P2 | S | **fix pending merge** | On main: `src/app/dashboard/page.tsx:1489` → `<GoldBtn>Upload Document</GoldBtn>`; `GoldBtn:416` has optional `onClick`, and `:423/:424/:429` show the un-disabled styling. **Fixed on `fix/` @ `fe334ec`.** |
| **BUG-023** | `src/components/Navbar.tsx` holds 4 `<a href="#">` dead links. **Zero importers** — never mounts, so no user can reach them. | P2 | S | **fix pending merge** | On main: `src/components/Navbar.tsx:8-11`. `grep -rn "Navbar"` excluding `LegalNavbar` and the file itself → no import, no require, no `<Navbar` JSX. **Deleted on `fix/` @ `935a942`.** |
| **BUG-024** | **30 MB of byte-identical duplicate audio shipped on every deploy.** Not merely unreferenced — exact duplicates. | P2 | S | none | `md5sum public/audio/*.mp3`: `quietphase-deep-instrumental-496353.mp3` = `b20ef114408b87f4803fff1e3ed49a58` = **identical to** `ambient.mp3`; `quietphase-meditation-instrumental-486835.mp3` = `9b732992e5d3d382b2547af2ef974575` = **identical to** `ambient2.mp3`. Only `ambient.mp3` / `ambient2.mp3` are referenced in `src/`. |
| **BUG-025** | ~44 MB of GLB building models unreferenced in `src/` (6 of 18 files). | P2 | S + verify | read-only `SELECT` on `Building` to confirm they aren't referenced by URL from DB rows | `binghatti-royal` (14M), `burj-vista-1` (8.2M), `five-jvh` (5.7M), `burj-royale` (5.3M), `vida-residence-downtown` (5.3M), `royal-atlantis` (5.2M) — none appear in `src/` or anywhere outside `public/`. |
| **BUG-026** | `/api/parcels/seed-dda` is gated at `getApprovedUserId` (not admin) with **no rate limiting** — any approved user can drive unbounded global `Parcel` upserts plus outbound fetches to `gis.dda.gov.ae`. By design (the map's Add Plot launcher calls it), but unthrottled. | P2 | M | product decision | `src/app/api/parcels/seed-dda/route.ts:26` uses `getApprovedUserId`; `grep -c "rateLimit"` in that file → **0**. Rate limiting exists in only 3 files repo-wide, all Archie/LLM paths. |
| **BUG-027** | 28 outdated packages; `next`, `maplibre-gl`, `typescript`, `@types/node` are majors behind; `@types/proj4` is **published as Deprecated**; `@next/eslint-plugin-next` is on v16 while `next` is v15. | P2 | M staged | none | `pnpm outdated`, 2026-08-10. |
| **BUG-028** | 12 ESLint warnings (0 errors); 6 are `react-hooks/exhaustive-deps` concentrated in `src/app/parcels/map/page.tsx`, which is 5,200+ lines and is the worst file on every metric measured. | P2 | S (5 auto-fixable) + L spike | none | `pnpm exec eslint src/` → `✖ 12 problems (0 errors, 12 warnings)`; 5 are unused `eslint-disable` directives, auto-fixable. |
| **BUG-029** | 8 further orphaned modules never imported: `constants.ts` (holds live-looking `ZAAHI_FEE_RATE`, `ROBOTICS_FUND_RATE`, `DEPOSIT_RATE`, `TOKEN_SYMBOL`), `basemaps.ts`, `heights.ts`, `document-hash.ts`, `DealTimeline.tsx`, `ParcelCard.tsx`, `GeneralNotes.tsx`, `FullscreenToggle.tsx`. | P2 | S | none | Import scan, 2026-08-10. (`vault-permission.ts` is tracked separately as BUG-014 — it carries authorisation semantics.) |
| **BUG-030** | `/parcels/map` ships heavy with **no code splitting** — `next/dynamic` and `lazy(` appear **0 times** in the file. `/vault` 492 kB and `/parcels/[id]` 378 kB First Load are 4–5× the 102 kB shared baseline. | P2 | M | none | `grep -c "next/dynamic\|lazy(" src/app/parcels/map/page.tsx` → **0**. Build route table, 2026-08-10. |
| **BUG-031** | **`CLAUDE.md`'s founder-approved land-use palette no longer matches the code.** CLAUDE.md pins the table as *"НЕ менять без явного согласия основателя"*, yet all sampled categories differ. Either a re-palette was approved and the doc was never updated, or this drifted. Governance question, not a code fix. | P2 | S (doc) | **founder ratification** — and canonical docs are out of scope for edits | CLAUDE.md: Residential `#FFD700`, Commercial `#4A90D9`, Hotel `#E67E22`, Healthcare `#E74C3C`. Code `src/app/parcels/map/page.tsx:291-300`: Residential `#2D6A4F`, Commercial `#1B3A5C`, Hotel `#7B1E2B`, Healthcare `#E63946`. |
| **BUG-032** | `/admin`, `/admin/queue`, `/dashboard`, `/vault` return **200 unauthenticated** — client-gated shells only. No data leaks (verified), but there is no server-side gate. | P2 | M | none | Live 2026-08-10: all four → HTTP 200. `/admin` shell is 8,305 bytes with zero PII/data tokens; its data fetches 401. |
| **BUG-033** | `/login` resolves to `/` in production despite `src/app/login/page.tsx` existing — the route redirects away. Possibly intentional (login modal lives on `/`), but unconfirmed. | P2 | S | confirm intent | Live: `curl -sSL -w '%{url_effective}' https://zaahi.io/login` → `https://www.zaahi.io/` (2 hops). `src/app/login/page.tsx` exists. |

---

## ALREADY FIXED — 16 (SHA or path:line cited)

| # | Original item | Verdict | Proof |
|---|---|---|---|
| F-01 | **P0-1 · 3D duplication on listing plots** — PMTiles rendered a second building over ZAAHI listings; `zaahiPlotNumbersRef` was populated but never used in a filter | FIXED | `src/app/parcels/map/page.tsx:3967-3978` — `buildPmtilesFilter` now composes `["!", ["in", ["get","plotNumber"], ["literal", [...excludeSet]]]]`; applied to all 9 tile layers by `applyZaahiExclusionToTileLayers:4049`, called at `:3242`, `:3736`, `:5254`. SHAs `78ac49a` → `82d26dc` → `757313c`. |
| F-02 | **P0-3 · Hospital vs Hotel colours indistinguishable** | FIXED | `page.tsx:294` HOTEL `#7B1E2B` (burgundy) vs `:300` HEALTHCARE `#E63946` (bright red) — clearly separated. SHA `4f8072f`. *(But see BUG-031: the doc was not updated.)* |
| F-03 | **P0-4 · Map state lost navigating away and back** | FIXED | `loadSavedMapView` `page.tsx:1549-1572` / `saveMapView:1575-1582` persist `center`/`zoom`/`bearing`/`pitch` under `zaahi-map-view`. SHA `958f6ba`. (Implementation uses `localStorage` with no TTL; the spec suggested `sessionStorage` + 30 min — symptom resolved either way.) |
| F-04 | **P0-2 · `_prisma_migrations` bookkeeping row missing** | FIXED | `prisma migrate status` 2026-08-10 → *"21 migrations found… Database schema is up to date!"* with no pending entries. |
| F-05 | **P0-7 · Affection Plan download broken (map SidePanel path)** | FIXED | `src/app/parcels/map/SidePanel.tsx:914` calls `downloadFile('/api/parcels/${data.id}/plot-guidelines', …)`; the sibling Affection Plan button at `:877` likewise. SHAs `94eb15a`, `eb361ad`. *(The `/parcels/[id]` page copy is still broken — BUG-006.)* |
| F-06 | NIGHT_REPORT · `/api/cat/chat` unauthenticated dead placeholder | FIXED | Route deleted — `src/app/api/cat/chat/route.ts` does not exist. SHA `ea430de`. |
| F-07 | NIGHT_REPORT · dead `src/hooks/useAuth.ts` | FIXED | Directory `src/hooks/` no longer exists. SHA `a9ab56e` — *"remove unused useAuth.ts hook (0 consumers, referenced non-existent endpoints)"*. |
| F-08 | NIGHT_REPORT mobile #9 · no explicit viewport meta | FIXED | `src/app/layout.tsx:23` — `export const viewport: Viewport = {…}`. |
| F-09 | NIGHT_REPORT mobile #1–3 · 260 px legal sidebars compress content below 520 px | FIXED | `src/app/disclaimer/page.tsx:104` (and privacy / terms equivalents) — the `<aside>` now carries `display: 'none'`, so it cannot compress narrow viewports. |
| F-10 | NIGHT_REPORT mobile #4 · dashboard fixed 220 px sidebar | FIXED | `src/app/dashboard/page.tsx:165` — now `fixed md:static … w-[220px] … ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`, i.e. a responsive drawer. |
| F-11 | CLAUDE.md · audio files missing (`ambient.mp3` 0 bytes, `ambient2.mp3` absent) | FIXED | `public/audio/ambient.mp3` 17,326,915 B and `ambient2.mp3` 12,929,985 B both present. *(Duplicates shipped alongside — BUG-024.)* |
| F-12 | Founder backlog **#4** · hardcoded "114" listings counter | FIXED | SHA `e5300af` — *"dynamic listings counter — replace hardcoded '114'"*. |
| F-13 | Founder backlog **#11** · listing status not shown | FIXED | SHA `36b9ea9` — *"show listing status in SidePanel + hover card"*. |
| F-14 | Founder backlog **#9** · hover card behaviour | FIXED | SHA `f1bcd9a` — *"hover lights plot outline; cards move to click"*. |
| F-15 | Founder backlog **#7, #10, #13, #33** | FIXED **on an unmerged branch** | `feat/backlog-batch-2` @ `e27bb84` — area 1:1 no rounding, Floors row, PMTiles search, UI sounds. ⚠️ **Branch never merged** (last commit 2026-06-12); these four are not on `main`. |
| F-16 | Diagnostic · no hardcoded secrets / service-role key in client code | CONFIRMED CLEAN | `SUPABASE_SERVICE_ROLE_KEY` read in exactly 2 server files; all 8 importers of `supabase-admin` are route handlers or lib — none carries `'use client'`. No `.env*` tracked by git. |

---

## STALE — 4

| # | Item | Why it no longer applies |
|---|---|---|
| S-01 | **P0-6 · DCR documents no longer visible in SidePanel** | There is no `DCR` member in the `DocumentType` enum (`prisma/schema.prisma:70-81`: TITLE_DEED, PASSPORT, EMIRATES_ID, NOC, SPA, OQOOD, EJARI, POWER_OF_ATTORNEY, VALUATION_REPORT, OTHER). "DCR" today means the Abu Dhabi affection-plan equivalent consumed by `/api/parcels/parse-affection-plan` — an *input* document type, not a per-plot rendered one. The item as written maps to nothing in the current model. |
| S-02 | **P0-13 · `ANTHROPIC_API_KEY` is the placeholder `sk-ant-REPLACE_ME`** | `.env.local` now carries a real 108-character key. *Partially unresolved:* the **Vercel Production** value remains unverified from here — see UNKNOWN U-05. |
| S-03 | NIGHT_REPORT open question 1 · *"CLAUDE.md SESSION STATUS says 101 parcels; DB has 114"* | CLAUDE.md § SESSION STATUS now reads **114 total (111 LISTED, 3 VACANT)**. |
| S-04 | NIGHT_REPORT open question 7 · `"MIXED_USE"` vs `"MIXED USE"` category typo | `scripts/fix-mixed-use-typo.ts` exists in the tree, indicating the normalisation was actioned. *(Not DB-verified — read-only audit, no query run.)* |

---

## UNKNOWN — 5 (cannot classify without more)

| # | Item | What would settle it |
|---|---|---|
| U-01 | BUG-010 Feasibility Calculator ROI regression | One concrete failing case from founder/Dymo: plot, land use, mode, expected vs actual |
| U-02 | BUG-011 Layers panel conflict (Plot Numbers × DDA Districts) | Browser session at zoom 12–20 with both layers on |
| U-03 | ~440 statically-wired interactive controls | Browser passes — priority order in `dead-controls-2026-08-10.md` |
| U-04 | Whether `prisma/migrations/` alone reproduces `schema.prisma` | Shadow-DB diff against a scratch database (a write — deliberately not run against prod) |
| U-05 | Whether Vercel **Production** `ANTHROPIC_API_KEY` is real | Vercel dashboard, or an authenticated `/api/archie` call |

---

## Cross-cutting observations

1. **Two unmerged branches hold real fixes.** `fix/dead-controls-2026-08-10` (BUG-005/006/007/022/023) and `feat/backlog-batch-2` (F-15, four founder items, stalled since 2026-06-12). Merging these clears 9 of the 33 open items with zero new engineering.
2. **The 39-item post-demo backlog was never triaged.** Its own closing line schedules triage for 2026-04-19/20; that never happened. Re-verifying it today, **5 of its 13 P0s were fixed incidentally** (F-01…F-05) without anyone closing the ticket, 1 is stale (S-01), 1 is stale-with-caveat (S-02), and **6 remain genuinely open** (BUG-004, 010, 011, 012, 013, plus P0-1's sibling). Work is happening; tracking is not.
3. **The oldest open items are all blocked on founder input**, not engineering: BUG-010 (repro case), BUG-012/013 (plot numbers and coordinates), BUG-031 (palette ratification). These cannot move without a decision.
4. **`DECISIONS.md` is still an unused 2-line stub**, despite `CLAUDE.md`'s working cycle mandating a log entry per task. That is the mechanism that would have prevented observation #2.
