# ABU DHABI MIGRATION PROPOSAL — ZAAHI

**Дата:** 2026-04-16
**Статус:** 🟡 RESEARCH ONLY. Никакого кода, никаких изменений. Требуется
founder approval перед любым этапом реализации.
**Автор:** Claude Code agent

---

## 0. Executive Summary

**Что сегодня:**
Vercel (Next.js hosting, auto-deploy from `main`) + Supabase eu-central-1
Frankfurt (Postgres, Auth, Storage) + ~169 MB of pre-built PMTiles served
from `public/tiles/` (behind Vercel's CDN / Cloudflare). Data shipped with
the deploy: 2.0 GB of KML/GeoJSON under `data/` + 431 MB `.next` build.
External services: Anthropic (Claude), Polygon (blockchain audit),
Resend (email), Telegram (admin), no Stripe, no user-facing webhooks.
Background `zaahi-agent` systemd service on a separate Ubuntu box.

**Что даёт переезд в Abu Dhabi:**
1. **Latency.** UAE users сегодня ходят через Frankfurt → Dubai ≈ 110-130ms
   round-trip. Из Abu Dhabi DC в Dubai/AD/AlAin — 3-15ms. На плотных
   map-interactions (PMTiles тайлы, fly-to, parcel details) это заметно.
2. **Data residency.** PDPL + TDRA не запрещают публичные geographic данные
   в иностранном облаке, но для owner PII (phone, title deed, Emirates ID
   photos) в-стране хранение — политически правильно, legally safer,
   founder-control проще.
3. **Independence.** Уход с Vercel proprietary deploy + Supabase vendor lock.
   CLAUDE.md "Sovereignty Readiness Rules" уже требуют этого — сегодня код
   почти portable, только два hard-dep'a: Supabase Auth + Storage SDK в
   одном месте (AddPlotModal uploads).
4. **Cost control.** На 114 parcels сегодня Vercel+Supabase ~$50-200/mo.
   На росте Vercel compute-hours ползут быстро; UAE VPS с managed Postgres
   даёт flat predictable bill.

**Рекомендуемое направление (TL;DR, детали в §5-§6):**

- **Архитектура:** Вариант C (Hybrid, Phase 1) → Вариант A (full lift) в
  Phase 3. Держим Vercel для frontend первые 6 месяцев, переносим DB +
  PMTiles + API backend в UAE.
- **Hosting:** Oracle Cloud UAE Central (Abu Dhabi) — единственный
  hyperscaler с двумя UAE регионами + свободной production-grade
  generous free tier (4 OCPU ARM, 24 GB RAM, 200 GB), plus published
  pricing. Azure UAE Central is strong alternative if G42 partnership
  matters (same DC operator — Khazna — under the hood).
- **DB:** OCI Base Database или managed Azure PostgreSQL Flexible в том же
  регионе. DO NOT roll your own Postgres on VM для Phase 1 (backups,
  replication, PITR — отдельный DevOps скилсет, которого нет).
- **Storage:** S3-compatible (OCI Object Storage or Azure Blob) + Cloudflare
  в front для кэширования PMTiles/KML globally.
- **Auth:** Migrate off Supabase Auth (single PoF на Vercel сегодня). Two
  options: (a) own JWT on Postgres (Lucia-style, ~1 week work), (b) Clerk
  (managed, $25/mo base). See §8 Q1.
- **Timeline:** 8-12 weeks phased (§6). No big bang.
- **Cost:** Current estimated ~$75-180/mo → projected $180-320/mo in UAE
  during hybrid phase, $220-400/mo in full-lift phase (§7). **Не дешевле
  — это плата за sovereignty + latency, не оптимизация бюджета.**

**Ключевое non-negotiable:** все P0 риски — миграция данных БД и
auth cutover — нужны зеркальные runs в staging до DNS flip. Zero-downtime
достижим для content, но Supabase Auth → self-auth потребует
session-reset window (log-out all users, ~5 min). Детали в §6.3.

**Что founder должен решить до старта:** §9 Open Questions Q1-Q8.

---

## 1. Текущая инфраструктура — полный аудит

### 1.1 База данных
- **Provider:** Supabase Postgres 15.x, region `eu-central-1` (Frankfurt)
- **Models:** 10 (User, Parcel, Deal, DealMessage, DealAuditEvent,
  AffectionPlan, Document, Commission, AmbassadorApplication, ReferralClick)
- **Known rows:** 114 parcels (111 LISTED, 3 VACANT) + some users, deals,
  commissions (exact counts not catalogued)
- **Schema complexity:** BigInt для фин-полей (fils), Json для GeoJSON
  geometry и affection plan raw — **native Postgres, portable**
- **Migrations:** 12 файлов, все через `prisma/migrations/`. Последняя —
  2026-04-16 (ambassador admin review fields)
- **RLS:** enabled on all tables (per CLAUDE.md). **НЕТ зависимости от
  Supabase-specific RLS syntax для самих правил** — код проверяет auth в
  API route, не в DB. То есть RLS можно "деактивировать" при переезде
  и ничего не сломается, защита — в `getApprovedUserId()`.

### 1.2 API surface
- **~280 route handlers** под `src/app/api/`
- **226 public layer routes** (`/api/layers/*`) — все GET, no auth,
  отдают KML/GeoJSON с диска
- **54 authenticated routes** — parcels, deals, ambassador, chat, users/sync
- **Middleware:** minimal — Bearer check on non-public, matcher `/api/:path*`
- **7 routes explicitly `runtime = 'nodejs'`** — `chat`, `parse-title-deed`,
  `submit`, `pending`, `seed-dda`, `plot-guidelines`, `review`. Остальные
  default runtime — Next.js выбирает, но **нет ни одного явного edge
  runtime** (good for migration).
- **No Vercel-only APIs** (Edge Config, KV, Blob) — good

### 1.3 Static data footprint
- `data/` — **2.0 GB** on disk; ships with deploy (Next.js per-route file
  tracing подключает только нужный KML/GeoJSON к route, not full 2 GB)
- `public/tiles/` — **169 MB** PMTiles (4 files: DDA 22 MB, AD-adm 59 MB,
  AD-other 78 MB, Oman 18 MB)
- `public/audio/` — **58 MB** (4 MP3s; optional feature)
- `.next/` build — **431 MB**
- **Total shippable:** ~2.6 GB. Fine для VM deploy, no S3 required для
  content. (Optional optimization — moving PMTiles to S3-compat+CDN.)

### 1.4 External dependencies
| Service | Package | Role | Self-host-friendly? |
|---|---|---|---|
| Supabase Auth | `@supabase/supabase-js` | User JWT + approval gate | ⚠️ Single hard dep; needs replacement |
| Supabase Storage | same | Document uploads (title deeds, ID) | ✅ Replace with S3 API |
| Supabase Postgres | via Prisma | Main DB | ✅ Prisma abstracts — works with any Postgres |
| Anthropic Claude | implied via API | Chat + Archibald + agents | ✅ External REST — no change |
| Polygon / ethers | `ethers`, `@openzeppelin` | Blockchain audit, NFT | ✅ External RPC — no change |
| Resend | `resend@6.12.0` | Transactional email | ✅ External REST; any provider works |
| Telegram Bot | plain fetch | Admin notifications | ✅ External REST |

### 1.5 Env vars (16 distinct)
Required for boot: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Required for features: `ANTHROPIC_API_KEY`,
`POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`, `ADMIN_EMAIL`. Optional /
silent-skip: `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
`FROM_EMAIL`.

### 1.6 Cron / background / webhooks
- **No in-app cron** (no `/api/cron/*`, no `vercel.json`)
- **No webhooks** (no Stripe, no payment provider webhook path — ambassadors
  pay via manual USDT tx hash verification)
- **`zaahi-agent` systemd service** (per CLAUDE.md) — Python long-running
  agent (`agent.py`) on the dev Ubuntu box. Not on Vercel, not in Next.js
  runtime. Already self-hosted.

### 1.7 File uploads
- Path: `AddPlotModal.tsx → uploadDoc() → Supabase Storage bucket "documents"`
- Max 10 MB per file, PDF/JPEG/PNG/WebP allowed
- Storage path: `{userId}/{plotNumber}/{kind}-{timestamp}.{ext}`
- Public URL stored in `Document.fileUrl`
- **Single code path to update** for S3 migration — small work

### 1.8 Observability
- **None integrated.** No Sentry/Datadog/OTel. console.log/warn only.
- Vercel catches everything via platform logs today. **Self-host требует
  добавить structured logging + exporter** (Phase 2 prerequisite).

### 1.9 Estimated current traffic / cost
- Traffic: ~low-mid thousands of pageviews/month (114 parcels × handful of
  interested viewers per month). PMTiles requests spike on parcel hover
  (~30-50 tile requests per session). **Exact numbers unknown — no
  analytics yet** (Phase 0 prerequisite to estimate scale).
- **Assumed bill:**
  - Vercel Pro: $20/mo base (user has Pro assumed for team features)
  - Vercel bandwidth: minimal at current traffic, within free-tier 100 GB
  - Vercel build minutes: 3-5 builds/day × 2 min ≈ free-tier OK
  - Supabase Pro: $25/mo (if on Pro; could be free-tier $0)
  - Supabase bandwidth/compute: minimal
  - **Total estimate: $45-75/mo today**, up to $200/mo if on Pro tiers
    with some buffer

---

## 2. Варианты hosting в UAE

Источники: провайдер-сайты, CloudPrice, Vantage, DataCenterDynamics,
`cloud.oracle.com/ae`, `microsoft.com/mea/uae-datacenters/`, industry reports
(поиск 2026-04-16, sources §11). **Цены published on-demand — индикативные,
RFQ для enterprise почти всегда дешевле на 20-40%.**

### 2.1 AWS Middle East (`me-south-1` Bahrain, `me-central-1` UAE)

| Item | Spec | ~USD/mo (on-demand, me-south-1) | Notes |
|---|---|---|---|
| EC2 t3.medium | 2 vCPU, 4 GB | ~$39 | Good for staging |
| EC2 m6i.large | 2 vCPU, 8 GB | ~$85 | Production app node |
| EC2 c7g.xlarge (ARM) | 4 vCPU, 8 GB | ~$121 | Cheap per core |
| RDS db.t3.medium PG | 2 vCPU, 4 GB | ~$59 + storage | Dev/staging |
| RDS db.m6g.large PG | 2 vCPU, 8 GB, ARM | ~$133 + storage | Production |
| S3 Standard | per-GB/mo | ~$0.025 | PMTiles storage |
| Egress | per-GB out | ~$0.12 | ×UAE premium ~10% |

**Pros:** broadest service catalog, SOC2/ISO27k certifications, Terraform/
Pulumi support.
**Cons:** Bahrain region (me-south-1) not UAE soil — for strict PDPL/TDRA
data-residency play, need me-central-1 (UAE). me-central-1 is live but has
**smaller service catalog** (RDS PG availability confirmed, but not every
DB engine). ~10% regional markup vs. us-east-1.
**Verdict:** solid option if the team already knows AWS. Not cheapest. Not
specifically UAE-branded.

### 2.2 Microsoft Azure (UAE North Dubai, UAE Central Abu Dhabi)

| Item | Spec | ~USD/mo (on-demand, UAE North) | Notes |
|---|---|---|---|
| B2s VM | 2 vCPU, 4 GB | ~$38 | Burstable, good dev |
| D2s_v5 | 2 vCPU, 8 GB | ~$88 | General purpose |
| D4s_v5 | 4 vCPU, 16 GB | ~$175 | Production size |
| Flexible PG B2s | 2 vCPU, 4 GB | ~$60 | Managed |
| Flexible PG D2s_v3 | 2 vCPU, 8 GB | ~$200 | Production-tier |
| Blob Storage hot | per-GB/mo | ~$0.021 | |
| Egress | per-GB out | ~$0.087 after free tier | |

**Pros:** two UAE regions (Dubai + Abu Dhabi) — great for DR. Behind the
scenes is Khazna/G42, i.e. same DC real estate as G42 Cloud. Azure AD
integration if ZAAHI ever needs enterprise SSO. Pre-approved by UAE
government procurement.
**Cons:** ~5-10% pricier than AWS for equivalent specs. Slow onboarding
vs. AWS for solo-founder.
**Verdict:** strongest UAE-native play. Same DC as G42 but with polished
APIs, mature managed services, stable pricing.

### 2.3 Oracle Cloud (UAE Central Abu Dhabi, UAE East Dubai)

| Item | Spec | ~USD/mo | Notes |
|---|---|---|---|
| VM.Standard.E4.Flex | 2 OCPU, 16 GB | ~$54 | Flex — pay per-OCPU |
| VM.Standard.A1.Flex (ARM) | 4 OCPU, 24 GB | **$0** — Always Free | 2 instances, 24 GB total |
| Base DB VM | 2 OCPU | ~$127 + storage | Managed Postgres not GA everywhere; Oracle DB or self-host PG on VM common |
| Object Storage | per-GB/mo | ~$0.0255 | |
| Egress | first 10 TB | **free** | Then ~$0.085/GB |

**Pros:** **generous Always Free tier — realistic для ZAAHI Phase 1
staging stack за $0**: 4 OCPU ARM + 24 GB RAM + 200 GB block. First
hyperscaler in UAE (2019), two local regions. 10 TB egress free changes
cost equation meaningfully for PMTiles hosting.
**Cons:** smaller ecosystem, fewer third-party integrations, Managed
PostgreSQL service (OCI Database with PostgreSQL) availability in UAE
regions needs verification before commit. Console UX less polished.
**Verdict:** **best price-per-dollar for Phase 1-2**. The Always Free tier
alone can host staging + small prod for indefinite time. Recommended unless
team-AWS-expertise dominates the calc.

### 2.4 G42 Cloud / Khazna (Abu Dhabi)

**Published pricing:** none. RFQ only.
**What's known:**
- G42 operates Khazna Data Centers — largest in the region
- Microsoft + G42 = 200 MW joint expansion 2026
- Stargate UAE (G42 + OpenAI + Oracle) — 1 GW AI supercluster, 200 MW Phase 1 live 2026
- Targeted primarily at: government, enterprise AI workloads, research
**Pros:** Sovereign UAE cloud, genuinely in-country, AI-compute capacity
near-unlimited. Political signal (UAE-native provider).
**Cons:** **Not set up for single-founder self-serve sign-up.** SaaS-style
console is minimal; expect account manager, PO, multi-week onboarding.
Pricing likely high-enterprise (think 2-3× Azure UAE for equivalent).
**Verdict:** **skip for now**. Revisit when ZAAHI hits $10K MRR and G42
becomes a strategic partnership conversation rather than a credit-card
commit.

### 2.5 Etisalat (e&) / du Business Cloud

**Published pricing:** none (packages starting from 1,500 AED/mo per
their SMB pages, but not itemized).
**What's known:**
- Both operate managed cloud + data center services
- Etisalat (e&) is Azure Gold Partner — some offerings are Azure resold
- du Business Cloud — VMware-based stack, traditional hosting
**Pros:** local provider, local support, local billing in AED, supports
TDRA compliance claims naturally.
**Cons:** legacy pricing model (fixed packages, not pay-per-hour), minimal
DevOps tooling, VMware means older stack, poor Terraform story. Harder to
iterate.
**Verdict:** **skip**. Better for traditional enterprises, not fit for
iteration-speed startups.

### 2.6 Alibaba Cloud Dubai

**Pricing:** ~$40-90/mo for similar-spec VMs, Managed PG ~$60-120
**Pros:** China-Middle-East trade pipeline — if ZAAHI expands to Chinese
investors, native integrations with Alipay, WeChat, etc.
**Cons:** compliance concerns w/ US-adjacent customers, governance story
harder to sell to European buyers.
**Verdict:** **skip Phase 1**. Revisit if CN market becomes priority.

### 2.7 Hetzner (EU — Germany/Finland) — baseline, NOT UAE

| Item | Spec | ~EUR/mo | USD equiv |
|---|---|---|---|
| AX41-NVMe | 6-core Ryzen, 64 GB RAM, 2×512 GB NVMe | €45 | ~$48 |
| AX42-U | 8-core Ryzen PRO, 64 GB, 2×512 GB NVMe Gen4 | €59 | ~$64 |
| AX102-U | 16-core, 128 GB, 2×1.92 TB | €119 | ~$129 |

**Pros:** 3-5× cheaper raw compute than any UAE hyperscaler. Dedicated
hardware (not shared). Excellent network.
**Cons:** **NOT in UAE — 130ms+ latency to Dubai, defeats the point**.
Listed here only as a cost floor for the "raw server" scenario.
**Verdict:** **DO NOT use for UAE-serving prod**. Valid only for non-user-
facing workloads (background batch, agent, heavy compute) if ever needed.

### 2.8 Комплексное сравнение (Phase 1 target spec)

Target spec for Phase 1: 1 app node (2-4 vCPU, 8 GB), 1 managed Postgres
(2 vCPU, 4 GB, 50 GB SSD), ~200 GB object storage, ~500 GB egress/mo.

| Provider | Region | App VM | Managed PG | Storage (200 GB) | Egress | **Total ~USD/mo** |
|---|---|---|---|---|---|---|
| AWS | me-south-1 Bahrain | $85 | $95 (t3.med + 50 GB) | $5 | $60 | **~$245** |
| Azure | UAE North Dubai | $88 | $80 (Flex B2s + 50 GB) | $4 | $40 | **~$212** |
| Oracle | UAE Central AD | $54 | $130 (VM + self-PG or Oracle DB) | $5 | **$0** (under 10 TB free) | **~$190** |
| Oracle (Always Free) | UAE Central | **$0** | self-host PG on Free ARM | $0 (200 GB free) | **$0** | **~$0** (staging only) |
| G42 Cloud | Abu Dhabi | RFQ | RFQ | RFQ | RFQ | ~$400-600 estimated |
| Etisalat | UAE | ~$150+ package | bundled | custom | bundled | ~$300+ |
| Hetzner (NOT UAE) | Germany | $64 (AX42) | self-host | 0 (on-box) | 1 Gbps free | ~$64 ref only |

**Top 3 for ZAAHI Phase 1:**
1. **Oracle UAE Central** — $0 staging via Free tier, $190/mo prod
2. **Azure UAE North** — $212/mo, strongest ecosystem
3. **AWS me-central-1 UAE** — $245/mo, broadest tooling

---

## 3. Архитектурные варианты

### 3.1 Вариант A — Lift and shift (pure self-host)

```
┌──────────────────────────────────────────────────────┐
│  Cloudflare (global CDN — PMTiles, static assets)    │
└──────┬───────────────────────────────────────────────┘
       │
┌──────▼────────────┐   ┌───────────────────────┐
│  Next.js Docker   │   │ Managed Postgres      │
│  on VM (UAE)      │───│ (Oracle DB / Azure    │
│  pm2 or systemd   │   │  Flexible PG)         │
└──────┬────────────┘   └───────────────────────┘
       │
       ├─→ Object Storage (S3-compat) — uploads, PMTiles
       ├─→ Anthropic API (external)
       ├─→ Polygon RPC (external)
       └─→ Resend / Telegram (external)
```

**Pros:**
- Full control
- Predictable flat bill
- Sovereignty readiness ✓✓✓
- Simplest conceptually (1 VM + 1 DB)

**Cons:**
- No auto-scaling
- Ops skill needed: patching, backups, cert renewal, log rotation, uptime
- Single AZ ⇒ SPOF

**Fit:** Phase 3 end-state when latency matters more than velocity.

### 3.2 Вариант B — Managed Kubernetes

```
AKS (Azure UAE) / OKE (Oracle UAE) / EKS (AWS UAE)
  ├── Next.js deployment (2+ replicas)
  ├── Managed Postgres (cloud-native)
  ├── Managed Redis (cache)
  └── Managed CDN + WAF
```

**Pros:**
- Industry-standard ops patterns
- Horizontal auto-scaling
- Rolling deploys, zero-downtime built-in
- Compliance certifications inherit from provider

**Cons:**
- **Massive overkill** for 114 parcels + single-digit team
- K8s ops non-trivial (one bad `kubectl apply` = outage)
- Per-cluster control-plane fee ($70-75/mo) before a single pod runs
- Needs ≥1 FTE who lives K8s (we don't have this)

**Fit:** **Skip until >100k MAU**. Revisit at Series A.

### 3.3 Вариант C — Hybrid (Vercel stays, DB + storage move)

```
   UAE users                  Rest of world
       ↓                            ↓
   ┌───────────────────────────────────┐
   │  Vercel (Next.js, global edge)   │  ← stays
   │  No code changes                 │
   └──────┬─────────────────────┬──────┘
          │                     │
      (queries)            (uploads, PMTiles)
          │                     │
          ▼                     ▼
   ┌──────────────┐     ┌──────────────────┐
   │ UAE Postgres │     │ UAE Object Store │
   │ (Azure/OCI)  │     │ + Cloudflare CDN │
   └──────────────┘     └──────────────────┘
```

**Pros:**
- **Lowest-risk first step.** Zero Next.js code changes initially.
- Test UAE latency first, measure, then decide on full lift
- DB + uploads + tiles в-стране ⇒ PDPL/TDRA win immediately
- Preserves Vercel's global edge для marketing / landing / non-UAE browsers

**Cons:**
- Cross-border hop for DB queries (Vercel-region → UAE) adds 80-130ms
  per authenticated request. **Noticeable on /api/parcels/map if map
  loads 114 parcels via one authenticated call** (one-time ≤ 150ms).
- Still pay Vercel ($20+/mo) AND UAE services
- Supabase Auth needs migration regardless (SPoF на Vercel side)

**Fit:** **Phase 1 recommendation.** Low risk, measurable, reversible.

### 3.4 Вариант D — Self-hosted Supabase

```
   UAE VM(s)
   ├── Supabase stack (Postgres + GoTrue + Storage + Kong + Studio)
   │   via docker-compose or K8s Helm chart
   ├── Next.js container
   └── Cloudflare in front
```

**Pros:**
- **Zero application-code changes** — Supabase SDK keeps working
- Keep `@supabase/supabase-js` as-is (auth, storage)
- Same `getApprovedUserId()` flow
- Supabase is OSS (Apache-2.0 mostly), hostable

**Cons:**
- Self-hosting the whole Supabase stack = 7 services (Postgres, GoTrue,
  PostgREST, Storage API, Realtime, Kong, Studio) — **significantly more
  ops than Vertical A**
- No one in ZAAHI team has done this. Production Supabase self-host is
  non-trivial (docs acknowledge it, patches frequent)
- Harder to scale individual components
- Storage service has its own quirks vs. S3

**Fit:** Tempting because of "zero code change", but **ops tax is too high
for solo/duo team**. Skip.

### 3.5 Матрица вариантов

| Criterion (1-5, 5=best) | A Lift | B K8s | C Hybrid | D Self-SB |
|---|---|---|---|---|
| Time to Phase 1 ship | 3 | 1 | **5** | 2 |
| Ongoing ops burden (5=low) | 2 | 1 | **4** | 1 |
| UAE latency improvement | **5** | **5** | 3 | **5** |
| PDPL/TDRA compliance | **5** | **5** | 4 | **5** |
| Cost control | 3 | 2 | 3 | 3 |
| Rollback safety | 3 | 2 | **5** | 3 |
| Fit for 1-person DevOps | 3 | 1 | **4** | 1 |
| **Total** | 24 | 17 | **28** | 20 |

**Рекомендация:** **Start with C (Hybrid), evolve to A (Full lift) in
Phase 3.** Never do B or D for a team of this size.

---

## 4. Compliance — UAE Specifics

### 4.1 UAE PDPL (Federal Decree-Law No. 45 of 2021)
- Applies to all personal data of UAE residents
- Cross-border transfer **allowed** if destination country has adequate
  protection (EU, most of Americas), or with explicit user consent, or
  under specific business justification
- **No hard "must be in UAE" requirement для общего real-estate data**
- **In practice:** for Emirates ID copies, passport scans, DLD documents
  — strong preference to store in UAE. Political/reputational risk >
  strict legal risk

### 4.2 TDRA (Telecom & Digital Gov Regulatory Authority)
- Regulates telecoms, public-sector workloads
- **Не относится к private real-estate platform** напрямую
- Но: если ZAAHI ever обрабатывает данные, полученные от government APIs
  (DLD, RERA, Oqood), DLD's data-sharing agreement typically mandates
  in-country storage

### 4.3 DIFC / ADGM special frameworks
- Both free zones have own data protection (DIFC DPL, ADGM Data Protection)
- More stringent than Federal PDPL — **matters if ZAAHI ever registers a
  DIFC/ADGM entity**
- Currently ZAAHI likely not registered in either free zone — flag if wrong

### 4.4 Bottom line
- **Phase 1 Hybrid (DB + uploads in UAE via Azure/Oracle, Vercel still
  hosts Next.js runtime in Frankfurt): PDPL-compliant, no legal blocker.**
- **Full lift to UAE: stronger compliance posture, required if ZAAHI later
  signs DLD API data-sharing agreement.**
- Specialised legal review needed if handling DLD/RERA data in volume
  (§8 Q6).

---

## 5. Рекомендация

**Выбор:** Phase 1 = **Hybrid (Вариант C)** on **Azure UAE North** OR
**Oracle UAE Central**, evolving to Phase 3 = **Lift (Вариант A)** same
provider.

### Why Azure vs. Oracle — fork

| | Azure UAE North | Oracle UAE Central |
|---|---|---|
| Phase 1 cost | ~$212/mo | ~$190/mo (paid) / **$0** (free tier for staging) |
| Free tier for staging | None meaningful | **4 OCPU ARM + 24 GB RAM + 200 GB always free** |
| Managed PG availability | **Mature** (Flexible Server GA everywhere) | In-region availability should be verified; Oracle DB always works |
| Ecosystem | Dominant, broadest 3rd-party | Narrower |
| Egress pricing | ~$0.087/GB (after free) | **10 TB free** per month |
| UAE-branded partnership | Yes (G42 joint) | Yes (first-mover) |
| Pulumi/Terraform support | Mature | Mature |
| Gov / enterprise procurement | Simpler | Simpler |

**My recommendation:** **Oracle UAE Central**.
- Cheaper baseline + generous free tier means staging + small prod at
  near-$0 during Phase 1-2
- 10 TB egress free removes PMTiles/tile-serving cost anxiety entirely
- Two UAE regions (east Dubai, central AD) for future DR
- **Verify Managed PG-for-Postgres (OCI Database with PostgreSQL) in UAE
  Central** before commit (§9 Q3) — if not GA, fall back to Azure

**Fork if founder prefers:** Azure is not wrong. Stronger when:
- Team is going to hire anyone from MSFT ecosystem
- ZAAHI sells into enterprise / gov where Azure procurement is the default

---

## 6. Migration plan — phased, 8-12 weeks

### Phase 0 — Prerequisites (Week 1)

**Goal:** know what we're measuring.

- [ ] Turn on basic analytics (Plausible / Umami / Vercel Analytics — all
  PDPL-friendly) to get **real traffic numbers** — pageviews, API calls,
  egress GB
- [ ] Add structured logging (`pino` → stdout, captured by Vercel today,
  by Loki/Papertrail self-host later)
- [ ] Baseline performance: measure p50/p95 TTFB for `/api/parcels/map`,
  `/api/layers/communities`, map page load, from Dubai ISP
- [ ] **Decide Oracle vs. Azure** (§9 Q2)
- [ ] Founder approval for Phase 1 scope + schema of acceptance criteria

**Exit:** real numbers in hand; provider chosen; green light to proceed.

### Phase 1 — Hybrid cutover (Weeks 2-5)

**Goal:** DB + uploads + tiles in UAE. Vercel still runs Next.js.

Week 2 — UAE infra stand-up:
- [ ] Provision Oracle/Azure tenancy, UAE region
- [ ] Managed Postgres instance (1 primary, daily backup)
- [ ] Object Storage bucket (S3-compat or Azure Blob)
- [ ] Cloudflare in front of tile bucket
- [ ] Terraform/Pulumi the whole thing — repo `zaahi-infra`

Week 3 — DB migration dry-run:
- [ ] `pg_dump --format=custom` из Supabase → staging DB in UAE
- [ ] Run prisma migrations against staging UAE DB
- [ ] Connect staging Vercel preview to staging UAE DB via env override —
  smoke-test entire app
- [ ] Measure Vercel→UAE DB query latency from Frankfurt (expect ~110-130ms
  per query; acceptable for low-traffic app)

Week 4 — Uploads migration:
- [ ] Write one-shot script: for each `Document.fileUrl` in production,
  download from Supabase Storage, upload to new bucket, rewrite URL
- [ ] Run in dry-run mode first, then live with a 1-hour maintenance window
  (or rolling if FE can tolerate mixed URLs)
- [ ] Update `AddPlotModal.tsx` → abstract upload to `src/lib/storage.ts`
  per CLAUDE.md Sovereignty Rules (already required)
- [ ] Deploy FE change to Vercel

Week 5 — DB cutover:
- [ ] Setup Supabase → UAE PG logical replication (if Supabase allows it —
  some plans don't; fallback: schedule a 10-min read-only window)
- [ ] Final pg_dump → restore at cutover time; flip `DATABASE_URL`
- [ ] **Keep Supabase DB live as cold fallback for 72 hours** (no writes,
  but available for rollback)
- [ ] Migrate Supabase Auth → either (a) own JWT+Postgres (see §9 Q1) or
  (b) Clerk. This is the big item — see §6.3.

**Exit:** Vercel still hosts Next.js; DB + storage + auth all in UAE.

### Phase 2 — Observability + hardening (Weeks 6-7)

- [ ] Production-grade logging pipeline: app → Papertrail / Better Stack
  / Loki. No PII in logs (CLAUDE.md)
- [ ] Uptime monitoring (UptimeRobot / Better Stack)
- [ ] Backup verification drill: restore latest PG backup to isolated
  instance, verify row counts
- [ ] Load test: `k6` or `autocannon` baseline, 50 req/s against /api/parcels/map
- [ ] Security review: RLS still on, `getApprovedUserId()` still the only
  gate for sensitive routes

**Exit:** We can see things break before users do.

### Phase 3 — Full lift (Weeks 8-11, optional)

**Only if Phase 1-2 metrics say latency matters for revenue** (i.e.
UAE users convert noticeably better when full stack is in-country).

- [ ] Next.js in Docker (official `node:20-alpine` base, standalone output)
- [ ] Deploy to UAE VM (single VM initially, can grow to 2 behind load
  balancer)
- [ ] Cloudflare DNS: flip `zaahi.io` A record (or proxy) to UAE VM —
  **this is the one high-risk moment**
- [ ] Run both Vercel and UAE prod in parallel for 72 hours (Cloudflare
  WLB or weighted routing 10% / 50% / 100%)
- [ ] Decommission Vercel deploy; keep git integration for CI/CD to UAE
  via `docker build + docker push`

**Exit:** full sovereignty; Vercel is gone; Next.js lives in UAE.

### 6.3 The Auth cutover — hardest step

**Problem:** Supabase Auth issues JWTs signed with a key we don't hold.
We can't "migrate" sessions — all users will be signed out.

**Options:**

- **A. Rip-and-replace (single migration night).** Export user emails +
  hashed passwords from Supabase (possible for password grant), import
  into new auth provider (Clerk / self-rolled Lucia). Send password-reset
  email to all users asking them to reset. Window: 1-2 hours. Users: ~
  low-dozens today, all approved manually, founder knows them all.
  **Feasible now, hard at 10k users.**

- **B. Parallel auth period.** Run both Supabase + new provider for 30
  days. New logins go through new provider; existing Supabase JWTs stay
  valid until expiry (7 days typical). Gradually bleed off.
  **More complex code-wise** — two code paths in `getApprovedUserId()`.

- **C. Stay on Supabase Auth, self-host just the database + storage.**
  Keep Supabase's Auth hosted by them (small Auth-only plan ~$25/mo).
  Everything else moves. **Lowest-friction path.** Partial sovereignty.
  **Strongly recommend for Phase 1.** If founder later wants full break,
  do it Phase 4.

**My recommendation:** **C.** Supabase Auth isolated как service, database
самой уже в UAE. Dependency shrinks from "whole Supabase" to "only Auth".
Phase 4 optional.

### 6.4 Rollback plan (every phase)
- Phase 1 DB cutover: keep Supabase DB warm for 72h. Flip DATABASE_URL
  back = rollback.
- Phase 1 uploads: mixed-URL-tolerant FE; Document rows carry full URLs,
  both old and new buckets served in parallel for 7 days.
- Phase 3 DNS flip: 10% traffic split first; if error rate spikes, revert
  DNS (Cloudflare propagates in <60s).

---

## 7. Cost comparison

**Assumption:** ~low-mid thousands of pageviews/mo today; 500 GB egress/mo
for all tile + API traffic; 50 GB Postgres DB; 20 GB object storage.
**All figures approximate.**

### Current (Vercel + Supabase)

| Item | ~USD/mo |
|---|---|
| Vercel (Pro, 1 seat) | $20 |
| Vercel bandwidth (within free 100 GB) | $0 |
| Vercel build minutes | $0 |
| Supabase Pro | $25 |
| Supabase compute add-on | $0-15 |
| Supabase egress | $0 |
| **Total today** | **$45-60** |

### Phase 1 Hybrid (Vercel + UAE DB + UAE Storage + Supabase Auth)

| Item | ~USD/mo |
|---|---|
| Vercel Pro | $20 |
| Vercel bandwidth | $0-30 (if traffic grows) |
| Oracle UAE compute (not needed Phase 1) | $0 |
| Oracle UAE Managed Postgres (or VM+PG) | $60-130 |
| Oracle UAE Object Storage 20 GB + free egress | $0-5 |
| Supabase (Auth-only, Free/Pro) | $0-25 |
| Cloudflare (if Pro plan) | $0-20 |
| **Phase 1 total** | **~$110-240** |

### Phase 3 Full-lift (UAE-only)

| Item | ~USD/mo |
|---|---|
| Oracle UAE VM (2 OCPU A1 ARM) | $0 (free tier) or $50-60 paid |
| Oracle UAE Managed Postgres | $80-130 |
| Object Storage + egress | $0-15 |
| Cloudflare | $0-20 |
| Uptime / logs (Better Stack / Papertrail) | $10-30 |
| Supabase Auth (if kept) | $0-25 |
| **Phase 3 total** | **~$125-280** |

### Break-even / when does this pay off?

- **Break-even is NOT the framing.** This migration does not save money in
  year 1. Costs go **UP**, not down, at current scale.
- **The value is:** latency improvement for UAE users (measurable via
  conversion-on-first-visit), sovereignty (required for DLD/RERA data),
  and removing vendor-lock risk.
- **Cost becomes advantageous** once Vercel Team plan ($20 × 4 seats = $80)
  + Supabase Team ($99) + egress overages kick in, roughly at ~10K+ MAU.
  Below that: self-host is a tax we pay for independence.

---

## 8. Risk matrix

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | DB migration corrupts data | P0 | Low | pg_dump roundtrip in staging first; keep Supabase warm 72h; row-count checksum |
| R2 | Auth cutover locks out users | P0 | Medium | Option C (keep Supabase Auth) — no cutover required |
| R3 | UAE provider outage | P1 | Low | DR: cross-region replication (UAE East ↔ Central); weekly PG backup offsite |
| R4 | DNS propagation bug → split-brain | P1 | Low | Cloudflare low TTL 60s; rollback-ready, validated |
| R5 | Next.js cold-start on VM ≥ Vercel edge | P2 | Medium | Use `standalone` output; pm2 keeps process warm; negligible on VM |
| R6 | PMTiles cache misses → egress bill shock | P2 | Medium | Cloudflare aggressive caching; monitor daily; pick Oracle (10 TB free) |
| R7 | Self-auth migration bug (if we go Option A) | P0 | High | Don't go Option A Phase 1. Keep Supabase Auth (Option C) |
| R8 | Observability blind spot during cutover | P1 | Medium | Install logging Phase 0, before cutover |
| R9 | UAE provider cost creep | P2 | Low | Terraform everything; monthly review; Oracle free tier hedge |
| R10 | PDPL/TDRA audit fails post-migration | P1 | Very Low | Providers certified; keep data-processing record; free-zone legal review before DLD integration |
| R11 | Founder-loss / bus factor | P0 | Medium | **Document everything in CLAUDE.md + infra repo**. Make Dymo (co-founder) co-admin of cloud account + domain registrar |
| R12 | Agent (`agent.py`) breaks during transition | P2 | Low | Agent is already self-hosted on Ubuntu box — unrelated. Move agent to UAE same VM in Phase 3. |

---

## 9. Open Questions

### Q1. Auth direction — keep Supabase Auth, replace with Clerk, or roll our own?
**My pick:** keep Supabase Auth (Option C in §6.3). Free tier is enough
for <50K MAU. Zero code change. Focus energy on DB + tiles.
- **A. Keep Supabase Auth** ✓ recommended
- B. Clerk ($25/mo + per-user) — polished, but adds vendor
- C. Self-rolled (Lucia/Auth.js + Postgres) — 1-2 weeks work, brittle

### Q2. Oracle or Azure?
**My pick:** Oracle. Free tier + 10 TB egress + two UAE regions = best
match for Phase 1.
- **A. Oracle UAE Central** ✓ recommended
- B. Azure UAE North — tie; choose if team leans MSFT

### Q3. Managed PG verification
Before commit: confirm OCI Database with PostgreSQL is GA in UAE Central.
If not: (a) self-host PG on OCI VM (adds ops), or (b) fall back to Azure
Flexible Server UAE North (proven GA). **Needs 1-day discovery call.**

### Q4. Phase 1 go / no-go criteria
At Phase 0 end, what Dubai-origin p95 TTFB on `/api/parcels/map` should
trigger "yes, migrate"?
- **Suggestion:** if UAE-origin p95 > 800ms today, migrate. Below 400ms,
  sovereignty is the driver, not latency.

### Q5. Budget ceiling
What monthly spend is acceptable? My estimates: $110-240 Phase 1,
$125-280 Phase 3. **Hard cap?**

### Q6. DLD / RERA data integration plans
Is there a concrete timeline to consume DLD API / RERA data directly?
If yes, **full lift (Phase 3)** becomes mandatory, not optional — data-
sharing agreements require in-country storage.

### Q7. Who operates this?
Today: founder-managed Vercel. Post-migration: someone needs to patch
the VM, check PG backups, rotate certs. Options:
- **A. Founder + Claude Code agent** (current model, extended)
- B. Hire 1 part-time SRE ($1-2k/mo)
- C. Managed service add-on (e.g., Oracle OS management)
- **D. Stay on Vercel** — don't migrate (also valid answer!)

### Q8. Timeline pressure
Is there a deadline (investor demo, partnership launch, DLD MOU signing)
that forces Phase 3 completion by a specific date? **If yes, add 4-week
buffer; if no, go at comfortable 8-12 week pace.**

### Q9. `zaahi-agent` — same migration or separate?
Python agent currently on its own Ubuntu box (per CLAUDE.md). Does it
migrate to UAE in Phase 3, or stay where it is?
- **Suggestion:** move to same UAE VM in Phase 3; one location, one bill.

---

## 10. Recommended next steps (if approved)

**Immediately (this week):**
1. Founder decides Q1, Q2, Q5, Q7 from §9.
2. Phase 0 kickoff: install analytics + structured logging.
3. Book 1-hour discovery call with Oracle UAE account team (or Azure) —
   confirm Q3 (Managed PG in UAE Central GA status).
4. Create infra repo `zaahi-infra` (Terraform/Pulumi scaffold).

**Weeks 2-3:**
5. Provision UAE staging environment (DB + storage + Cloudflare in front).
6. pg_dump roundtrip dry run; Vercel-preview connects to UAE staging DB.

**Week 4:**
7. Phase 1 Go / No-Go decision based on staging metrics.
8. Schedule 1-hour production maintenance window for Phase 1 cutover.

**Parallel (any time):**
9. Abstract `AddPlotModal.tsx` upload to `src/lib/storage.ts` per CLAUDE.md
   Sovereignty Rules — this is independently useful regardless of timeline.
10. Move Dymo to co-admin of Vercel + Supabase + domain registrar
    (**bus-factor fix, do today regardless of migration**).

---

## 11. Sources

- [AWS Pricing Calculator](https://calculator.aws/)
- [Amazon RDS for PostgreSQL Pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [AWS Regions Comparison — CloudPrice](https://cloudprice.net/aws/regions)
- [Amazon RDS Pricing — CloudZero 2026 guide](https://www.cloudzero.com/blog/rds-pricing/)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Azure Database for PostgreSQL Flexible Server — pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/)
- [Azure UAE North — CloudPrice region page](https://cloudprice.net/region/uaenorth)
- [Microsoft Azure UAE datacenters official](https://www.microsoft.com/mea/uae-datacenters/default.aspx)
- [Azure UAE Central region info — AzureSpeed](https://www.azurespeed.com/Information/AzureRegions/UAECentral)
- [Oracle Cloud Abu Dhabi Region](https://www.oracle.com/ae/cloud/cloud-regions/abu-dhabi/)
- [Oracle Cloud Public Regions](https://www.oracle.com/ae/cloud/public-cloud-regions/)
- [G42 Data Centers](https://www.g42.ai/our-offerings/data-centers)
- [G42 Cloud home](https://www.g42cloud.com/)
- [Microsoft + G42 UAE 200 MW expansion — DCD](https://www.datacenterdynamics.com/en/news/microsoft-and-g42-expand-data-center-capacity-plans-in-uae-by-200mw/)
- [Stargate UAE — Digital Dubai](https://www.digitaldubai.ai/dubai-updates/stargate-uae-g42-openai-oracle-ai-data-center-2026)
- [Etisalat UAE Data Servers & Storage](https://www.etisalat.ae/en/smb/products/digital-products/collaboration/data-servers-and-storage.html)
- [Top Cloud Providers UAE — Serverspace](https://serverspace.us/about/blog/top-cloud-providers-in-the-uae-2026/)
- [UAE PDPL Comprehensive Guide — SecurePrivacy](https://secureprivacy.ai/blog/uae-data-protection-law-guide)
- [UAE PDPL 2026 Guide — bshsoft](https://bshsoft.com/uae-data-protection-law-2026-guide)
- [Data Residency UAE Guide — iConnectITBS](https://www.iconnectitbs.com/data-residency-in-the-uae/)
- [GCC Sovereign Cloud & Data Residency Guide — Mak IT](https://makitsol.com/gcc-sovereign-cloud-and-data-residency-guide/)
- [AWS UAE Data Privacy](https://aws.amazon.com/compliance/uae_data_privacy/)
- [Hetzner Dedicated Root Server AX matrix](https://www.hetzner.com/dedicated-rootserver/matrix-ax/)

---

**End of Proposal.**

*Документ — результат research-only прохода. Никаких изменений в коде
или инфраструктуре не внесено. Ждёт founder decisions по §9 Open
Questions.*
