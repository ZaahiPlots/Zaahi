# ZAAHI — Codebase State Audit · 2026-05-03

**Trigger:** production incident 2026-05-03 (Supabase t4g.nano resource
exhaustion → `ECHECKOUTTIMEOUT` on all Prisma endpoints, healed by restart).

**Audience:** founder (Zhan) — pre-meeting prep for investor (Tue) + Rudi
wire (Thu).

**Method:** read-only inspection of working tree, git, agent memory.
No code changes, no `git push`, no destructive operations.

**Scope of repo audited:** `/home/zaahi/zaahi` (Next.js 15, Prisma 7,
Supabase, Vercel). Branch: `research/audit-codebase-state-2026-05-03`,
forked from `feat/referral-coming-soon` @ `49af892`.

---

## 1. Continuity from prior sessions

What I (the agent) carry from memory:

- **Most recent saved memory** (16 days old, 2026-04-16):
  *"Phase 1 User Dashboards is the next engineering phase, blocked on
  founder approval for the schema migration."* See
  `~/.claude/projects/-home-zaahi/memory/project_current_phase.md`.
- The memory is **stale relative to git** — looking at the actual log,
  Phase 1 schema work has already shipped: commit `8e4df1b feat: user
  dashboards Phase 1 — Schema + OWNER section functional` (visible in
  `git log` ancestry of `main`) and migration
  `prisma/migrations/20260416160000_user_dashboards_phase_1/` exists.
  Memory needs updating after this audit.
- Last commit I (the agent) was definitely involved in producing, by
  pattern of recent activity: **`49af892` — "feat(referral): retire
  3-tier Ambassador, ship /refer Coming Soon + waitlist (Phase A)"**,
  authored **2026-04-30 22:30** (+04:00). It's the head of
  `feat/referral-coming-soon` and is **NOT yet merged to `main`** and
  **NOT pushed to `origin`** — see §2.

Open / unfinished items I stopped on:

- **`feat/referral-coming-soon` is not merged.** `main` is one commit
  behind: `main` = `165b8ca` (Apr 24), `feat/referral-coming-soon` =
  `49af892` (Apr 30). The 3-tier Ambassador retirement + `/refer`
  Coming Soon + waitlist code lives only locally.
- Audio assets still missing: per CLAUDE.md §"Что осталось",
  `public/audio/ambient.mp3` is 0 bytes, `ambient2.mp3` does not exist.
  Confirmed today: those filenames in `public/audio/` are absent;
  the two `quietphase-*.mp3` files that ARE present don't match the
  filenames the playlist code references.
- Hospital plot 6854566 left on standard single-building render —
  awaiting founder direction (per CLAUDE.md §"Что осталось").
- Phase B of referral program is paused on UAE-counsel sign-off
  (per CLAUDE.md "REFERRAL PROGRAM — PHASE A").

Decisions / assumptions I made that founder may not know about:

- I treated `data/raw/brokers/` and `data/land-monitor/cache.json` as
  reference scratch and left them untracked. They are not in
  `.gitignore`. Founder may want them either committed (audit value)
  or explicitly ignored.
- I did **not** test that `pnpm dev` / `pnpm build` actually run
  today — this is a read-only audit and CLAUDE.md forbids running
  `pnpm build` while a dev server may be live on the same checkout.
- I did **not** open Vercel, Supabase, GitHub web consoles — see
  "НЕИЗВЕСТНО" markers in §6 for items that need the founder to
  check those manually before the investor meeting.

---

## 2. Repo state

```
Branch (audit):    research/audit-codebase-state-2026-05-03
Forked from:       feat/referral-coming-soon @ 49af892
Working tree:      DIRTY (untracked only — no modified tracked files)
Untracked items:   .env.local.backup-2026-04-28-rotation
                   data/land-monitor/        (cache.json)
                   data/raw/                 (brokers JSON + audit log)
Stash entries:     none
```

**Last 10 commits on `main`** (oldest at bottom):

| Hash      | Date (UTC+4) | Subject |
|-----------|--------------|---------|
| `165b8ca` | 2026-04-24   | ux(buildings): footprint-polygon click area + URL override |
| `44dcd61` | 2026-04-24   | fix(buildings): kill residual FBO warnings + restore pin clickability |
| `f675ba2` | 2026-04-24   | fix(buildings): CustomLayer FBO collision with fill-extrusion |
| `2e5ed69` | 2026-04-24   | feat(buildings): API Horizon Pointe · V2 artist delivery |
| `b279eb8` | 2026-04-24   | fix(buildings): re-render on fetch · toggles into Layers popover |
| `c9eb8e3` | 2026-04-24   | feat(buildings): digital-twin Buildings layer + first seed |
| `352736a` | 2026-04-23   | feat(render): FUTURE_DEVELOPMENT pattern, sandstone, single block |
| `fdf2863` | 2026-04-23   | feat(parcels): add 9235849 · Al Yalayis 3 · 484k sqm |
| `9f2e2a3` | 2026-04-23   | feat(parcels): add TB02 · Dubai Water Canal · AED 1.2B |
| `40e8858` | 2026-04-16   | docs: register parked research artifacts |

**`main` vs `origin/main`:** identical at `165b8ca`. Nothing to
push, nothing to pull.

**All local branches with last-commit date** (newest first):

| Last commit (local TZ) | Branch | On origin? |
|------------------------|--------|------------|
| 2026-04-30 22:30 | `feat/referral-coming-soon` | **NO** |
| 2026-04-30 20:52 | `research/ambassador-to-referral` | **NO** |
| 2026-04-30 15:35 | `research/email-setup-docs` | **NO** |
| 2026-04-30 03:32 | `research/blender-mcp-eval` | **NO** |
| 2026-04-29 11:57 | `research/full-city-3d-2026-04-29` | **NO** |
| 2026-04-29 11:22 | `research/founder-decision-pack-2026-04-29` | **NO** |
| 2026-04-29 01:21 | `feature/install-cog-export-2026-04-30` | **NO** |
| 2026-04-29 01:10 | `research/vara-adgm-2026-04-28` | **NO** |
| 2026-04-28 19:18 | `research/innovation-hubs-2026-04-28` | **NO** |
| 2026-04-28 19:09 | `research/bugs-batch-2026-04-28` | **NO** |
| 2026-04-26 23:05 | `research/getac-hardware-fit-2026-04-27` | **NO** |
| 2026-04-26 22:55 | `research/dld-legitimate-access-2026-04-27` | **NO** |
| 2026-04-26 20:45 | `research/broker-registry-2026-04-26` | **NO** |
| 2026-04-26 14:25 | `research/mole-data-2026-04-26` | **NO** |
| 2026-04-26 10:52 | `research/launch-research-2026-04-25` | **NO** |
| 2026-04-24 23:36 | `research/founder-directive-2026-04-24` | **NO** |
| 2026-04-24 22:51 | `research/full-audit-2026-04-24` | **NO** |
| 2026-04-24 22:33 | `research/vision-and-competitors-2026-04-19` | **NO** |
| 2026-04-24 21:48 | `main` | yes (in sync) |
| 2026-04-19 13:43 | `drafts/investor-package-v7` | **NO** |
| 2026-04-18 → 2026-04-19 | five other `drafts/investor-package-*` | mostly NO |
| 2026-04-18 12:30 | `research/investor-package` | yes |
| 2026-04-18 02:12 | `research/blockchain-deep-dive` | yes |
| 2026-04-18 01:45 | `docs/master-tree-v3` | yes |
| 2026-04-16 → 2026-04-19 | demo/audit/backlog/fix branches | mixed |

**Branches NOT pushed to `origin` (28 of ~46 local):** all listed above
as "**NO**". This is a real bus-factor risk — if this dev box dies,
roughly a month of research, the only copy of the referral retirement,
five investor-package draft variants, and ~20 research branches
disappear. See §8 / §9 / §10.

**Stash:** empty.

**Working-tree size:** 4.2 GB.

| Path           | Size   | Notes |
|----------------|--------|-------|
| `data/`        | 2.1 GB | raw GeoJSON, master-plan KML/KMZ/PDF, dld-lands.csv |
| `node_modules/`| 985 MB | rebuildable from `pnpm-lock.yaml` |
| `.git/`        | 894 MB | full history |
| `public/`      | 227 MB | mostly `public/tiles/*.pmtiles` (169 MB) |
| `.next/`       | 43 MB  | dev cache only — last touched 2026-04-30 22:06 |

`.next/` is small + recent → suggests the last `pnpm dev` / `pnpm
build` succeeded; no stale 500-MB build cache.

---

## 3. Where the code lives

### `src/app/api/*` — 260 route files (`route.ts`)

Of those, **226 are per-district `/api/layers/dda/<slug>` and
`/api/layers/masterplans/<slug>` endpoints** that wrap a single GeoJSON
or KML from `data/layers/`. The remaining **34 routes** are the actual
business logic (one-line purpose each):

| Route | Purpose |
|-------|---------|
| `admin/me` | role check for admin UI gate |
| `buildings`, `buildings/[id]` | digital-twin Building list / detail (Apr-24 layer) |
| `cat/chat` | Cat AI assistant proxy (Anthropic) |
| `chat` | second chat surface |
| `deals`, `deals/[id]`, `deals/[id]/messages` | Deal Room |
| `layers/communities`, `…/abu-dhabi-*`, `…/uae-districts`, `…/saudi-governorates`, `…/riyadh-zones`, `…/metro`, `…/roads`, `…/dubai-islands`, `…/dda-projects`, `…/dda-freezones` | top-level GeoJSON layers (public) |
| `me`, `me/complete-onboarding` | current-user profile read + onboarding |
| `me/favorites`, `me/favorites/[parcelId]` | SavedParcel CRUD (Phase 1 dashboards) |
| `me/notifications`, `…/[id]/read`, `…/read-all` | Notification bell |
| `me/plots` | plots-I-own list for OWNER dashboard |
| `me/saved-searches`, `…/[id]` | Saved search CRUD |
| `modules` | platform module registry |
| `notify-admin` | **PUBLIC** signup-pending notification (allow-listed) |
| `parcels`, `parcels/map`, `parcels/[id]` | parcel list / map feed / detail |
| `parcels/[id]/affection-plan/refresh` | DLD/DDA proxy refresh |
| `parcels/[id]/pdf` | parcel PDF export |
| `parcels/[id]/plot-guidelines` | DDA plot-details PDF proxy |
| `parcels/[id]/review` | admin review |
| `parcels/[id]/view` | analytics / view counter |
| `parcels/parse-title-deed` | OCR/parse uploaded title deed |
| `parcels/pending` | admin pending-review queue |
| `parcels/seed-dda` | dev / admin: seed parcel from DDA GIS |
| `parcels/submit` | user-submitted plot |
| `referral-waitlist` | **PUBLIC** Phase A waitlist POST (only on `feat/referral-coming-soon`) |
| `users/sync` | first-login Supabase → Prisma user upsert |

### `src/lib/*` — 31 files

- **Auth / data:** `auth.ts` (Bearer → Supabase verify, `getApprovedUserId`
  is the gate), `prisma.ts` (PrismaClient + `PrismaPg` adapter on
  `DATABASE_URL`), `supabase.ts` / `supabase-browser.ts`,
  `api-fetch.ts`.
- **Domain:** `activity.ts` (ActivityLog writers), `deal-flow.ts`,
  `referral.ts` (`ZAAHI_SERVICE_FEE_RATE = 0.02`, `REFERRAL_RATE = 0.20`
  Phase B placeholder, `computePlatformFee`), `valuation.ts`,
  `feasibility.ts`, `heights.ts`, `dda.ts`, `kml-parser.ts`,
  `projection.ts`, `serialize.ts`, `constants.ts`.
- **Integrations:** `email.ts` + `email-templates/`, `telegram.ts`,
  `blockchain.ts` (Polygon/ethers), `notes-rewriter.ts`.
- **Map / 3D:** `basemaps.ts`, `drone-controls.ts`.
- **Files / output:** `download.ts`, `document-hash.ts`,
  `generate-site-plan-pdf.ts`, `sound.ts`.

### `prisma/schema.prisma` — 23 entities, edited 2026-04-30 21:41

- **17 models:** `User`, `Parcel`, `Deal`, `DealMessage`,
  `DealAuditEvent`, `AffectionPlan`, `Document`, `Commission`
  (dormant), `AmbassadorApplication` (dormant), `ReferralClick`
  (dormant), `ReferralWaitlist`, `SavedParcel`, `ParcelView`,
  `Notification`, `ActivityLog`, `SavedSearch`, `Building`.
- **6 enums:** `UserRole` (OWNER/BUYER/BROKER/INVESTOR/DEVELOPER/
  ARCHITECT/ADMIN), `ParcelStatus`, `DealStatus`, `DocumentType`,
  `CommissionStatus`, `BuildingStatus`.
- **Datasource:** `provider = "postgresql"` only — runtime URL is
  injected via `src/lib/prisma.ts` (`process.env.DATABASE_URL` through
  the `PrismaPg` adapter); migrate URL is in `prisma.config.ts`
  (`process.env.DIRECT_URL`). This split is correct (pooler for
  runtime, direct for migrations) but see §9 for the missing
  `pgbouncer=true&connection_limit=1` query params.
- **15 migrations** in `prisma/migrations/`, oldest `20260407182139_init`,
  newest `20260430120000_referral_waitlist_init`. The latter only
  exists in working tree if you're on `feat/referral-coming-soon`;
  on `main` the newest migration is `20260424120000_add_building_table`.

### `public/`

- `public/tiles/*.pmtiles` — 4 files, 169 MB total: `dda-land.pmtiles`
  (21 MB, Apr 14), `ad-land-adm.pmtiles` (57 MB, Apr 14),
  `ad-land-other.pmtiles` (75 MB, Apr 14), `oman-land.pmtiles`
  (17 MB, Apr 15).
- `public/audio/` — four MP3s, but the playlist code in
  `src/app/parcels/map/page.tsx` references `ambient.mp3` /
  `ambient2.mp3` (not present) — see §1 / §9.
- `public/models/` — two `.glb` files (`6110279_lod3.glb`,
  `candidate-sample.glb`).

### `docs/` — surprisingly thin

- `docs/architecture/BUILDINGS_PIPELINE.md` (191 lines, 2026-04-24)
  — the single architecture doc.
- `docs/research/PARKED_PROJECTS.md` (60 lines).
- **What's missing from `docs/`:** runbooks (incident, rollback,
  Supabase paused, Vercel rollback, Prisma drift), onboarding,
  deployment, DR plan. **None of those exist anywhere in the repo.**

The bulk of the project's documentation actually lives in **root-level
markdown files**, not in `docs/`:

| File | Lines | Role |
|------|-------|------|
| `CLAUDE.md` | 606 | the operating manual — security, deploy, agent rules, smoke test, referral phase A, founder contacts |
| `NIGHT_REPORT.md` | 1017 | last full sweep / status report |
| `USER_DASHBOARDS_RESEARCH.md` | 896 | Phase 1–4 roadmap |
| `ABU_DHABI_MIGRATION.md` | 830 | next-region migration plan |
| `LAYERS_RBAC_PROPOSAL.md` | 643 | layer access tiers |
| `BACKLOG.md` | 31 | parked vector-basemap work |
| `DECISIONS.md` | 2 | empty stub |
| `ZAAHI_PROMPT_FINAL.md` | unread | original prompt |

The canonical files mentioned in the audit task (`MASTER_TREE_final.md`,
`docs/investor-package/*`) **do not exist on `feat/referral-coming-soon`
or `main`**. They appear in `drafts/investor-package-*` branches and
`docs/master-tree-v3` — those branches are a separate persistence
target, see §8.

---

## 4. Where the data lives

### Database — Supabase Postgres

- **Region:** `eu-central-1` (Frankfurt) — per CLAUDE.md §DEPLOYMENT.
- **Project ref:** stored only in `.env.local` /
  Vercel env vars; **not committed**, so I cannot quote it without
  reading the secret. The browser-public ref *is* embedded in the
  client bundle at runtime via `NEXT_PUBLIC_SUPABASE_URL`, but per
  audit constraints I am not extracting it from `.env.local` here.
- **Hostnames in `.env.local`:** `DATABASE_URL` resolves to a
  `*.pooler.supabase.com:6543` hostname (transaction pooler);
  `DIRECT_URL` resolves to the direct `*.supabase.co:5432` hostname.
  See §9 for the missing pooler query params.
- **Compute size during incident:** `t4g.nano` (per task
  description) — Supabase's smallest free-tier instance, ~0.5 GB RAM.
  This is **not documented anywhere in the repo** (CLAUDE.md says
  only "Supabase PostgreSQL, Frankfurt"). НЕИЗВЕСТНО whether the
  current size is still nano or has been bumped post-incident — that
  state lives in the Supabase dashboard, not in the repo.

### Storage buckets (Supabase Storage)

Single bucket referenced in code: **`documents`**, in
`src/app/parcels/map/AddPlotModal.tsx:17` (constant
`DOCUMENTS_BUCKET = "documents"`). Used for user-uploaded title-deed /
plot-document PDFs, `getPublicUrl` for retrieval. **No avatar bucket
appears to exist yet** — Phase 1 plan (in `USER_DASHBOARDS_RESEARCH.md`)
calls for one with a 2 MB cap; this is unfulfilled in code and means
Phase 1 profile-avatar feature is incomplete.

### PMTiles

`public/tiles/`, served as static files (not via API):

| File | Size | Modified |
|------|------|----------|
| `ad-land-adm.pmtiles` | 57 MB | 2026-04-14 |
| `ad-land-other.pmtiles` | 75 MB | 2026-04-14 |
| `dda-land.pmtiles` | 21 MB | 2026-04-14 |
| `oman-land.pmtiles` | 17 MB | 2026-04-15 |

Build pipeline: `scripts/prepare-tiles.ts` + `scripts/update-tiles.sh`.
Source GeoJSON in `data/layers/{dda-plots,ad-plots,oman-plots}/` —
those subdirs are gitignored (`.gitignore` lines for `data/layers/dda-plots/`,
`data/layers/ad-plots/`, `data/layers/oman-plots/`). **The PMTiles
themselves are committed to git** (in `public/tiles/`), so Vercel
serves them; the raw plot-level GeoJSON is local-only.

### Excel imports for parcel data

- `data/plots-prices.xlsx` (8 KB).
- `data/dld-lands.csv` (16 MB), `data/dld-transactions.csv` (1.5 MB).
- No live `update-prices-from-excel.ts` script in `scripts/` —
  CLAUDE.md §"Сделано сегодня (2026-04-15)" item 7 references it as
  the *style*, but the actual file is not present. Founder-driven
  price updates are currently one-off seed scripts (`seed-*.ts`,
  `update-polygons-from-affection-plans.ts`).

### Other local data

- `data/affection-plans/` — 3.3 MB of source PDFs (e.g.
  `9235849.pdf`, `tb02.pdf`).
- `data/master-plans/{archive,kadastr}/` — 17 MB of KML/KMZ master
  plans; `kadastr/` is gitignored.
- `data/raw/brokers/` — `pf_brokers_raw_2026-04-26.json`,
  `pf_agents_raw_2026-04-26.json`, `pdpl_audit.log`. **Untracked.**
- `data/land-monitor/cache.json` — **untracked.**
- `data/meydan/` (87 MB) — gitignored reference PDFs.

### Local SQLite / json fixtures

- **No SQLite databases** anywhere in the repo (`*.sqlite`, `*.db`
  search clean).
- **No JSON fixtures** under `src/`, `tests/`, or `__fixtures__/`.

---

## 5. What prevents accidental breakage

### Active rules in `CLAUDE.md`

The file is a 606-line operating manual. The defenses that actually
matter for this audit:

- **§AGENT RULES** — explicit prohibitions: never force-push, never
  delete `data/`, never modify `prisma/schema.prisma` without founder
  approval, never modify `.env.local`, always `pnpm build` before
  push, never run `pnpm build` while `pnpm dev` is up on the same
  checkout, no `@ts-ignore` to silence build failures.
- **§SECURITY RULES — DO NOT MODIFY** — auth flow contract: every
  protected page wrapped in `<AuthGuard>`, every protected API uses
  `getApprovedUserId` (not `getSessionUserId`), `PUBLIC_API` allow
  list in `src/middleware.ts` is intentionally tiny (`/api/auth`,
  `/api/notify-admin`, `/api/referral-waitlist` on the feature
  branch), `/api/layers/*` MUST stay public.
- **§NEVER delete parcels — ever / NEVER add duplicate parcels** —
  destructive Prisma ops on `Parcel` blocked without explicit
  per-plot founder instruction; pre-flight duplicate check by
  `plotNumber` required for any seeder.
- **§SMOKE TEST — ОБЯЗАТЕЛЬНО ПОСЛЕ КАЖДОГО ИЗМЕНЕНИЯ** — manual
  checklist (build, /parcels/map render, ZAAHI Plots visible, layers
  toggle, drone-mode, auth flow, two API spot-checks). Manual,
  human-run, not automated.

### Read-only paths — declared

- `src/app/page.tsx` auth flow: do-not-modify without founder
  permission (per §SECURITY RULES).
- `prisma/schema.prisma`: do-not-modify without founder permission
  (per §AGENT RULES).
- `data/**`: never delete/overwrite (per §AGENT RULES).
- Dormant referral-program tables (`Commission`,
  `AmbassadorApplication`, `ReferralClick`): never drop (per
  §REFERRAL PROGRAM "Не трогать без founder approval").

For this audit I additionally treat as read-only: `src/**`,
`prisma/schema.prisma`, the canonical investor docs (which are not
in this branch anyway).

### Pre-commit hooks

- **None.** No `.husky/`, no `lint-staged`, no `prepare` /
  `precommit` script in `package.json`. `.git/hooks/` contains only
  `*.sample` files.
- The smoke-test discipline lives entirely in human memory + the
  CLAUDE.md checklist.

### Smoke test scripts

- The checklist in CLAUDE.md is the closest thing.
- **No automated smoke tests** in the repo — no `*.test.ts`, no
  Playwright/Jest setup, no `pnpm test` script (the only scripts in
  `package.json` are `dev`, `dev:clean`, `build`, `start`, `agent`).

### Branch protection rules (`.github/`)

- **`.github/` directory does not exist.** No `CODEOWNERS`, no
  workflows, no PR template, no Dependabot. So:
  - No required-checks branch protection enforced *from the repo* —
    if branch protection exists on GitHub, it's configured in the
    GitHub web UI, not in source control. НЕИЗВЕСТНО — needs founder
    to verify in GitHub Settings → Branches.
  - No CI = the only build verification before deploy is the local
    `pnpm build` step in CLAUDE.md §AGENT RULES + Vercel's own
    build step (`npx prisma generate && pnpm run build`).

### Vercel deployment protection

- Visible in code: build command `npx prisma generate && pnpm run
  build` (CLAUDE.md §DEPLOYMENT).
- Auto-deploy: every push to `main` → production. Per CLAUDE.md.
- Preview deployments / password-protect / SSO: НЕИЗВЕСТНО — only
  visible in Vercel dashboard.
- The Vercel-Hobby 50 MB-per-function limit is documented in
  `next.config.ts` (the comment block above
  `outputFileTracingIncludes`) — that's a real prior-incident
  scar tissue.

---

## 6. Rollback paths — if something breaks now

### Last known-good `main`

- **`main` HEAD = `origin/main` HEAD = `165b8caed3d5049d237be17a40509d661aacd6a7`**
  ("ux(buildings): footprint-polygon click area + ?buildingRotation
  URL override", 2026-04-24 21:48 +04).
- This is also the last commit auto-deployed to Vercel by virtue of
  CLAUDE.md §DEPLOYMENT ("every push to `main` auto-deploys"). No
  later push has happened — the referral Phase A work is sitting on
  the unpushed `feat/referral-coming-soon` branch.

### Reference: last successful Vercel deploy

- **НЕИЗВЕСТНО** in the repo. Vercel deploy IDs are not committed
  anywhere I could find (no `.vercel/`, no deploy logs, no
  notes). The newest `main` push (`165b8ca`) is the inferred
  last-good production deploy, but the actual Vercel deployment ID
  + timestamp lives only in the Vercel dashboard / `vercel ls`.
- **Action for founder:** before the investor meeting, run
  `vercel ls --prod` (or visit the Vercel project page) and
  paste the deploy ID + URL into a paragraph at the top of
  `CLAUDE.md` — single source of truth for "last green deploy".

### How to roll back

```bash
# Option A — revert at the git level, push, let Vercel auto-deploy.
#   "Hard rollback" = move main back; "soft" = revert commits.
#   Soft is safer because it doesn't lose the new commits' history.
git checkout main
git revert <bad-sha>..HEAD --no-commit
git commit -m "revert: roll back to <last-good-sha>"
git push origin main          # Vercel auto-deploys the revert
```

```bash
# Option B — promote a previous Vercel deploy directly without git.
#   Faster (no rebuild). Requires Vercel CLI logged in.
vercel rollback <deployment-url-or-id> --scope <team>
# or in the Vercel dashboard: Deployments → "..." → Promote to Production
```

The May-3 incident did **not** require a code rollback (it healed on
restart), so Option B is the right pattern for "deploy that broke
prod" → revert is for "code that broke prod".

### What is lost in a rollback

- **Code:** whatever commits are reverted. No silent data side effects
  in the recent `main` window — all 10 most-recent commits are render
  / parcel-seed / building-layer changes; none touch `prisma/schema`.
- **Schema migrations:** the only "active" migration risk window is
  the Phase 1 dashboards migration (`20260416160000_…`), which is
  already on production and additive (new tables, no drops). A `main`
  revert would NOT roll back the database — Prisma migrations don't
  reverse automatically. If a future revert touches schema, the
  schema must be reverted manually with `prisma migrate resolve` or
  by writing a counter-migration. There is no documented procedure
  for this; flag in §10.
- **Env changes:** none in code; env lives in Vercel dashboard.
- **Data:** none — `data/` is read-only on prod and not regenerable
  (per CLAUDE.md §AGENT RULES). PMTiles are committed; user-uploaded
  documents in the `documents` bucket persist independently.

### Estimated full-rollback time

| Path | Time |
|------|------|
| Vercel deploy promotion (Option B) | **2–5 min** (no rebuild) |
| `git revert` + push + Vercel rebuild | **8–15 min** (build ≈ 6–10 min on Vercel) |
| Schema rollback (write counter-migration + apply) | **30–90 min**, manual, no runbook |
| DB-level recovery from Supabase point-in-time | Free tier = **NO PITR**. Daily backups only — see §7. |

---

## 7. Recovery procedures — what's documented

### Supabase paused / restarted

- **In repo:** **NOT DOCUMENTED.** No runbook anywhere covers
  "Supabase free-tier paused after 7 days of inactivity" or
  "Supabase restart → reconnect Prisma pool". The May-3 incident
  proved this gap exists.
- **What actually fixed it (per task description):** restart. That
  works because Vercel functions are stateless and re-establish
  connections on cold start, and once Supabase is back up, the
  pooler accepts new connections.
- **Why it happened (most likely root cause):** see §9 — `DATABASE_URL`
  points at the transaction pooler (port 6543) but **lacks
  `?pgbouncer=true&connection_limit=1`** query params. Prisma
  treats the connection like a long-lived TCP pool, so under any
  burst across many serverless invocations the pool-of-pools
  exhausts → `ECHECKOUTTIMEOUT`. On a t4g.nano (≈0.5 GB RAM, ~60
  Postgres connections cap), this fails sooner.

### Vercel deploy fails

- **In repo:** partially documented — `next.config.ts` comments
  warn about the 50 MB function size limit (the prior incident
  where `outputFileTracingIncludes` bloated layer functions and
  every `/api/layers/*` returned 500 ENOENT). CLAUDE.md says "red
  build NEVER reaches main".
- **NOT documented:** the actual recovery sequence (where to look
  in Vercel logs, how to re-run a build, when to roll back vs.
  forward-fix). Founder muscle memory only.

### Prisma client out of sync with DB

- **In repo:** **NOT DOCUMENTED.** No procedure for "DB has columns
  the client doesn't know about" or "client expects columns DB
  doesn't have yet". The Vercel build runs `npx prisma generate`
  every deploy, so a stale client is unlikely *on prod*; the more
  realistic failure is "I edited `schema.prisma` locally, ran the
  app, but didn't run `prisma migrate dev` so the DB still has the
  old shape" — and that mode is not flagged anywhere.

### Migration conflicts

- **In repo:** **NOT DOCUMENTED.** With 15 sequential migrations
  and a single dev box working on multiple branches at once
  (`feat/referral-coming-soon` adds `20260430120000_referral_waitlist_init`,
  but Phase 1 dashboards work might add another `2026043x_…`),
  any drift would have to be resolved manually with `prisma
  migrate resolve --applied/--rolled-back`. No runbook.

### Where this is documented (or flag)

- **CLAUDE.md** is the only ops-style doc, and it covers code
  contracts, not infra recovery.
- **`docs/architecture/BUILDINGS_PIPELINE.md`** documents one
  pipeline only.
- **No `docs/runbooks/`, `docs/ops/`, or `docs/incidents/`
  directory exists.** Every recovery procedure above is "founder
  knows it" or "agent recreates it from the docs in the moment".
  This is a §10 recommendation.

---

## 8. Bus factor

Single points of knowledge that don't survive losing one of: Zhan,
Dymo, this dev box, this agent's memory.

### Only Zhan knows (not in code / docs)

- **Vercel project / team / billing account.** No deployment IDs
  or project URL beyond `zaahi.io` are committed.
- **Supabase project ref + service-role key + dashboard credentials.**
  Only in `.env.local` (this box) and Vercel env vars.
- **Anthropic API key**, **Resend API key** — only in `.env.local` and
  Vercel.
- **GitHub repo admin** for `ZaahiPlots/Zaahi`.
- **Namecheap DNS** account for `zaahi.io`.
- **Polygon/Ethereum signing keys** if any (not seen in `.env.local`
  keys, but blockchain code in `src/lib/blockchain.ts` exists).
- The May-3 incident root-cause hypothesis above is mine — Zhan saw
  the actual logs.
- The **decision to ship the referral retirement** lives only as
  commit `49af892` on a local branch.

### Only Dymo knows

- **UAE counsel relationship** that gates Phase B referral commission
  (per CLAUDE.md §"Не трогать без founder approval").
- **DLD / RERA / VARA / ADGM contacts** (per recent research
  branches `research/dld-legitimate-access-2026-04-27`,
  `research/vara-adgm-2026-04-28`).
- **Equilibrium Advisory Group + investor introductions** — including,
  presumably, Rudi (referenced in `drafts/investor-package-monday`
  commit subjects but never named in code).
- **Veto over strategic decisions** is encoded only in CLAUDE.md
  §FOUNDER CONTACTS.

### Only the agent (me) holds, from sessions

- Memory file at `~/.claude/projects/-home-zaahi/memory/project_current_phase.md`
  — the "Phase 1 next" pointer. **Lost if this Claude account /
  device dies.** Not in repo.
- The narrative arc of which research branches were exploratory vs.
  green-lit. Most are encoded in branch names + commit dates, but
  the *decision* (e.g. "park `research/wall-archibald-system`
  pending legal review") lives in commit messages, not in a single
  decision log (`DECISIONS.md` is empty).

### Single points of knowledge

- **The 28 unpushed local branches are this dev box only.** Loss
  of disk = loss of a month of research and the entire referral-
  retirement work (Phase A is local-only).
- **`.env.local`** is the only on-disk copy of dev DB credentials.
- **Memory file** is the only durable cross-session memory of what
  the agent thought it was doing.

---

## 9. Red flags

### Branch / push hygiene

- **28 unpushed local branches** spanning 2026-04-16 → 2026-04-30
  (§2). If the dev box dies before Tue, the work is gone. This
  is the single biggest immediate risk.
- **`feat/referral-coming-soon` is not on `origin`.** The whole
  Phase A retirement + waitlist infrastructure is one rotational
  hard-drive failure away from re-doing.

### Secrets / env

- **`.env.local.backup-2026-04-28-rotation` is NOT covered by any
  `.gitignore` pattern.** `.gitignore` ignores `.env`,
  `.env.local`, `.env.*.local` — none of those match
  `.env.local.backup-2026-04-28-rotation` (the trailing
  `-rotation` breaks the `.env.*.local` glob, which requires
  `.local` at the end). It is currently untracked; if anyone runs
  `git add -A` or `git add .env*`, **it will be committed and
  contain rotated secrets.** The file lives at:
  - `/home/zaahi/zaahi/.env.local.backup-2026-04-28-rotation`
- **`.claudeignore`** is similarly narrow (`.env`,
  `.env.production`, `.env.*.local`) — also misses the backup.

### DB connection config (likely root cause of the May-3 incident)

- `src/lib/prisma.ts` initialises `PrismaPg` with
  `connectionString: process.env.DATABASE_URL`.
- `DATABASE_URL` (per `.env.local`) points at a Supabase
  **transaction pooler** (host `*.pooler.supabase.com:6543`).
- The connection string **does not include
  `?pgbouncer=true&connection_limit=1`** (verified by grepping for
  those tokens in the URL — absent). Without those params, Prisma
  prepares statements and assumes long-lived connections; the
  transaction pooler can't honour that, and under burst load
  Prisma's internal pool times out waiting for a checkout →
  `ECHECKOUTTIMEOUT`. This pattern matches the May-3 symptom
  exactly. **Highest-priority fix.** See §10.
- Even with the params right, **t4g.nano** is undersized for any
  real demo load. Recommend pre-investor: bump to at least
  `micro` (or whichever Supabase calls the next tier) for the
  meeting window.

### CI / quality gates

- **Zero automated tests** (no `*.test.ts`, no `pnpm test` script).
- **No CI** — `.github/` does not exist.
- **No pre-commit hook** to run `pnpm build` or `tsc --noEmit`
  locally — the protection is "the agent is supposed to remember"
  per CLAUDE.md §AGENT RULES.
- **No type-check-only script** in `package.json` (no
  `typecheck: tsc --noEmit`); `tsconfig.tsbuildinfo` is committed
  but stale (last touched Apr 24).

### Outdated / risky deps

`package.json` shows mostly modern majors:
- `next ^15.3.1`, `react ^19.0.0`, `prisma ^7.7.0`,
  `@prisma/client ^7.7.0` — all bleeding edge. Prisma 7.x is new;
  the `PrismaPg` adapter pattern in `src/lib/prisma.ts` is the
  recommended path.
- `ethers ^6.16.0`, `@openzeppelin/contracts ^5.6.1` — fine.
- **`zod ^4.3.6`** — Zod 4 is a major rewrite from Zod 3. If any
  `.parse()` / `.safeParse()` call relies on Zod 3 semantics, it
  may have silently changed behaviour. Worth a search before the
  investor demo. (I did not audit usage in this pass.)
- **`three ^0.183.2`** + `@react-three/fiber ^9.5.0` —
  fast-moving stack; the FBO collision fixes in the recent
  commits (`f675ba2`, `44dcd61`) suggest active drift.

### Hardcoded "secrets" in committed code (file paths only — no values)

- `src/lib/auth.ts:7` — `FOUNDER_EMAILS` set is hardcoded with two
  email addresses. Not secret per se (already in CLAUDE.md
  §FOUNDER CONTACTS), but worth flagging that role gating uses an
  in-code allow-list, not a DB column. If a third founder is ever
  added the gate has to be redeployed.
- `src/app/parcels/map/AddPlotModal.tsx:17` — bucket name
  `"documents"` hardcoded. Fine.
- No API keys / tokens grep-able in `src/`. Did not find anything
  that would leak in a public-repo flip.

### Migration / drift signals

- The `feat/referral-coming-soon` branch adds migration
  `20260430120000_referral_waitlist_init`. Prod is on `main`
  which doesn't have this migration. **If `main` is rebuilt
  before this is merged, the `ReferralWaitlist` table either
  doesn't exist on prod or was created out-of-band.** If the
  table was created out-of-band on Supabase ("`CREATE TABLE
  referral_waitlist`" via the SQL editor), then `prisma migrate`
  on a fresh DB will conflict.
- Memory says "blocked on founder approval for schema migration"
  but the Phase 1 migration (`20260416160000_user_dashboards_phase_1`)
  is already on `main` and presumably on prod. Stale memory; I'll
  update after this audit.

### UX / asset gaps surfaced during audit

- `public/audio/ambient.mp3` and `ambient2.mp3` referenced by
  player code but **do not exist** in the directory. The two
  `quietphase-*.mp3` files that are there have different
  filenames. Player skips silently → no music in prod.
- Hospital plot 6854566 single-building stub still pending
  founder direction.

### CLAUDE.md drift

- `## SESSION STATUS — 2026-04-15` block at the bottom of
  `CLAUDE.md` is stale (today is 2026-05-03; that block is
  18 days old).
- "Parcels: 114 total (111 LISTED, 3 VACANT)" — current count
  НЕИЗВЕСТНО without a DB query, which I am not running per
  read-only constraint.

---

## 10. Recommendations

### Top 5 — fix THIS WEEK before Tue (investor) + Thu (Rudi)

1. **Push every local branch to `origin` today.** `git push -u
   origin <branch>` for the 28 unpushed branches in §2 — even
   `wip/`-style ones. One terminal, 5 minutes. Removes the
   biggest single failure mode (dev-box-dies-before-meeting).
2. **Add `?pgbouncer=true&connection_limit=1` to the production
   `DATABASE_URL` in Vercel** (NOT in `.env.local` on this box —
   change it where it matters). This is the most plausible root
   cause of the May-3 ECHECKOUTTIMEOUT and the cheapest fix. Test
   with a fresh deploy; verify with a smoke hit on `/api/me`.
3. **Bump Supabase compute to at least the next tier above
   t4g.nano for the demo window.** Free-tier nano cannot survive
   even a small concurrent demo (RAM cap → process kill →
   restart). Reverting after the meeting is one click.
4. **Move `.env.local.backup-2026-04-28-rotation` out of the
   repo directory** (e.g. to `~/secure/zaahi-env-backups/`) and
   tighten `.gitignore` to also match `.env.local.backup*`. One
   accidental `git add -A` away from leaking rotated secrets.
5. **Merge `feat/referral-coming-soon` to `main`, OR park the
   branch with a tag.** Right now Phase A retirement is in a
   half-shipped state — the new constants and code are local,
   and `main` still has the old behaviour from a Vercel
   perspective. Either ship it (push to `main`, smoke test
   `/refer` POST) or tag the branch and add a `WIP:` note to
   `CLAUDE.md` so the next session doesn't trip.

### Top 5 — fix THIS MONTH

1. **Write `docs/runbooks/`** with five files: `supabase-paused.md`,
   `vercel-deploy-failed.md`, `prisma-migration-conflict.md`,
   `db-rollback.md`, `incident-template.md`. The May-3 incident
   would have been a 30-second response with a runbook. Each
   should be ≤80 lines, recipe form ("when X, do Y").
2. **Stand up a minimum CI:** `.github/workflows/build.yml` runs
   `pnpm install --frozen-lockfile && npx prisma generate &&
   pnpm build` on PR + push to `main`. Branch-protect `main`
   to require it. ~1 hour of work, removes the "red build
   reaches main" risk that CLAUDE.md §AGENT RULES tries to
   prevent with discipline alone.
3. **Add a `pnpm typecheck` script** (`tsc --noEmit`) and run
   it in CI. Faster than `pnpm build`, catches the bulk of
   regression-class bugs.
4. **Smoke-test script.** Even one `scripts/smoke.sh` that hits
   `/api/me` (expect 401 without auth), `/api/layers/dda/dubai-hills`
   (expect 200), `/api/parcels/map` (expect 401), and one DB
   round-trip (e.g. `prisma migrate status`) and exits non-zero
   on any miss. Run it before every push and from CI.
5. **Database backup discipline.** Free-tier Supabase has only
   daily snapshots and no PITR. For the investor / Rudi window,
   take a manual `pg_dump` via `DIRECT_URL` once a day to a
   private S3 / Drive folder. Document the command in the new
   runbook.

### What I recommend creating (docs / tests / hooks)

- **Decision log discipline.** `DECISIONS.md` is currently 2 lines.
  Every founder approval (schema change, public copy, Phase B
  unblock) should land here as a one-line entry with date + commit
  pointer. Replaces "in the agent's memory".
- **`docs/audits/`** — keep this audit, write the next one before
  the Rudi wire (Thu) showing what changed.
- **Pre-commit hook** (lightweight, no Husky needed): a 10-line
  `.git/hooks/pre-commit` that blocks commits matching `.env*`
  and warns on `*.backup`. Stop the env-leak class entirely.
- **Replace `FOUNDER_EMAILS` hardcode** in `src/lib/auth.ts:7`
  with a `User.role === 'ADMIN'` (or `FOUNDER`) check sourced from
  Prisma. Same flexibility that doesn't require a redeploy to
  add a third trusted email.
- **Tests for the deal / parcel / referral flows** — even five
  Vitest cases on `computePlatformFee()`, `getApprovedUserId()`
  (with mock token), and the parcel duplicate-check guard.
  Investor / due-diligence will ask "do you have tests?" — having
  even three is dramatically better than zero.

---

## Appendix A — what I confirmed by direct inspection

- `git status` (untracked-only dirty), `git branch --show-current`,
  `git log --oneline -10`, `git rev-parse main origin/main`
  (identical at `165b8caed3d5049d237be17a40509d661aacd6a7`),
  per-branch last-commit dates via `git for-each-ref`.
- `du -sh` for working-tree breakdown (4.2 GB, 2.1 GB in `data/`).
- `find src/app/api -name 'route.ts'` (260 routes, 226 layer
  scaffolds, 34 logic routes).
- `grep -c '^model ' prisma/schema.prisma` = 17, `^enum ` = 6.
- `ls prisma/migrations/` = 14 directories + `migration_lock.toml`.
- `.env.local` keys (5 vars) — values redacted, never quoted.
- `DATABASE_URL` host = `*.pooler.supabase.com:6543`, no
  `pgbouncer` / `connection_limit` query params.
- `DIRECT_URL` host = `*.supabase.co:5432`.
- `.gitignore` content + `git check-ignore` test confirming
  `.env.local.backup-2026-04-28-rotation` is **not** ignored.
- `package.json` scripts (no `test`, no `typecheck`, no `prepare`).
- Memory file at `~/.claude/projects/-home-zaahi/memory/project_current_phase.md`
  read directly (16 days old, contains the "Phase 1 next" pointer).

## Appendix B — what I deliberately did NOT do

- Did not run `pnpm dev`, `pnpm build`, `prisma migrate status`,
  or any DB-touching command (read-only audit).
- Did not push any branch (no `git push`).
- Did not modify `src/**`, `prisma/schema.prisma`, or any
  canonical doc.
- Did not open a Vercel / Supabase / GitHub web console.
- Did not extract or quote any secret value from `.env.local` —
  only structural facts (which keys exist, host/port of URLs)
  appear in this report.
- Did not write to memory yet; will update
  `project_current_phase.md` after the founder confirms the new
  phase pointer post-meeting.
