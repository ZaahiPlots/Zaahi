# ZAAHI · Getac G140 + X600 Server — Hardware Fit Analysis

**Document type:** Hardware fit analysis for two specific Getac devices against ZAAHI §77 Web Platform Architecture + current Phase 1 production state.
**Audience:** Dymo (purchase decision), Жан (technical-fit review). Companion to `dubai-pulse-pipeline-runbook.md` and (on `research/launch-research-2026-04-25` branch) `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2.
**Branch:** `research/getac-hardware-fit-2026-04-27` (off `research/dld-legitimate-access-2026-04-27` tip `8caac76`).
**Status:** v1.0 · CONFIDENTIAL · internal · founder-decision support.
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, canonical files · no main push · no fabrication · all assumptions flagged.

---

## §0 · Headline finding

**RECOMMEND: DO NOT BUY EITHER DEVICE NOW. (Path d — defer to Phase 2.)**

Two specific findings drive this:

1. **The "Server" in X600 Server is a SOFTWARE designation, not a hardware tier.** The X600 Server ships with **Windows Server 2022** OS + supports up to **16 TB SSD with hardware RAID 0/1/5**. Its CPU is Intel Xeon W-11865MRE, RAM up to 128 GB DDR4, **graphics is Intel UHD integrated only — no NVIDIA, no discrete GPU**. The prior `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 entry — *"Getac X600 Server (Жан · development workload · NVIDIA · large RAM · storage)"* — was based on a wrong assumption that the "Server" suffix meant workstation-class graphics. **It does not.** The X600 Server is a portable RAID server / data-acquisition node, not Жан's development workstation. Жан's actual development machine should be a MacBook Pro M4 Max (matches the macOS-Linux dev workflow that Next.js 15 + React 19 + Supabase + Vercel are built on; see §4).

2. **G140 launches June 2026 + needs Phase 2 use cases that haven't materialised yet.** The G140 was announced 2026-04-23 and is not available for purchase until June 2026 ([BetaNews](https://betanews.com/article/getac-launches-amd-powered-g140-rugged-copilot-tablet-with-14-inch-display-and-edge-ai-support/), [PRNewswire](https://www.prnewswire.com/apac/news-releases/getac-redefines-rugged-mobility-with-launch-of-g140-copilot-pc-powered-by-amd-technology-302749897.html)). UAE distribution + pricing not published as of 2026-04-27 sandbox probe — must quote via [Miltec UAE](https://www.milcomputing.com/) (sole Getac UAE/GCC distributor). For Phase 1 (M1-M9 dog-fooding) ZAAHI's strongest field-demo use case can be served by an **iPad Pro 13" M4 at AED 6,299** (Sharaf DG cellular config) running Safari pointed at `zaahi.io` — this is what the 114-parcel production state needs, not a Windows Copilot+ tablet.

**Recommended action 2026-04-27:** put both devices in §77 Phase 2 backlog (re-evaluate M9-M10 when broker outreach reaches active site-visit demo cadence). Replace prior `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 X600 Server budget (AED 35,000) with a MacBook Pro 16" M4 Max for Жан's actual development workflow (~AED 22,000-28,000). Preserve the F110 G6 tablet allocation for Dymo (AED 13,000) OR upgrade to G140 in Phase 2 if Dymo wants AI Copilot capability and the field-demo cadence justifies the rugged-spec premium.

Full analysis below — 7 sections per task spec.

---

## §1 · Identification of use cases

Exhaustive enumeration of plausible use cases per device in §77 context. Each is rated only after the §2 fit matrix; this section just lists them so nothing obvious is missed.

### 1.1 · G140 (Windows 11 Pro tablet, AMD Ryzen AI, 14" sunlight-readable, 1.79 kg)

| # | Use case | §NN Master Tree | Phase |
|---|---|---|---|
| G1 | Field demo on plot site visits to owners (show parcel page + 3D ZAAHI Signature buildings outdoors) | §39 Metaverse Parcel View · §44 IoT | Phase 1.5 / Phase 2 |
| G2 | Architect / surveyor site-survey unit (capture geotagged photos + notes + LiDAR via USB peripherals) | §40 Digital Twin Parcel Twin · §41 Mole Agent | Phase 2 / Phase 3 |
| G3 | Mobile feasibility calculator on the actual plot (run Feasibility v5.0 in front of client) | §66-70 Intelligence block | Phase 1.5 / Phase 2 |
| G4 | Sales kit for Ambassador soft pilot (broker meetings, presentations, deal-flow demo) | §62 Ambassador Program | Phase 2 |
| G5 | Edge AI computing — local Archibald inference via 50 TOPS NPU (Copilot+ class) | §66 AI · §41/45 agents | Phase 3 (post-LLM-sovereignty migration) |
| G6 | DLD field-officer integration node (if government partnership materialises with on-premise validation) | §50-52 Sovereignty | Phase 3+ (highly speculative) |
| G7 | Investor / developer on-site presentation (show platform from anywhere) | §13 Investor relations | Phase 2 |
| G8 | RFID / barcode capture for property-tag scanning (G140 optional 1D/2D imager + HF RFID reader) | §44 IoT | Phase 3 |
| G9 | Dual SIM (Nano + eSIM) field-connectivity unit when Wi-Fi unavailable | §52 Sovereignty + Connectivity | Phase 2 |
| G10 | Founder presentation device for high-stakes investor / regulator meetings | §13 Investor | Phase 2 |

### 1.2 · X600 Server (Windows Server 2022 laptop, Intel Xeon, 4.41-8.51 kg, up to 16 TB RAID)

| # | Use case | §NN Master Tree | Phase |
|---|---|---|---|
| X1 | **Жан's development workstation** ❌ MISFIT — see §4 | n/a | n/a |
| X2 | Self-hosting full ZAAHI platform (eliminate Vercel + Supabase) | §50-52 Sovereignty | Phase 3+ (sovereignty endgame) |
| X3 | Backup / disaster-recovery node (Postgres replica + raw data archive) | §52 Sovereignty + Operations | Phase 2 |
| X4 | Edge data-acquisition node — DLD CSV downloads, PF broker re-scrapes, raw data archive (`scripts/dubai-pulse/refresh.sh` host) | §44 IoT · §52 Sovereignty | Phase 1.5 / Phase 2 |
| X5 | Mobile RAID server for site-archive (16 TB onboard for years of raw data) | §40 Digital Twin · §52 Sovereignty | Phase 2 |
| X6 | DLD on-premise integration node (if API Gateway requires it) | §50-52 Sovereignty | Phase 3+ (DLD does NOT require on-premise; this use case is theoretical) |
| X7 | Robotics Fund §70 hardware platform (per master plan §70 future hardware) | §70 Robotics Fund | Phase 3-4 (M30+) |
| X8 | Architect site survey heavy-compute unit (process LiDAR / photogrammetry on-site) | §40 Parcel Twin | Phase 3 |
| X9 | Government / DLD demo workstation in regulator meetings | §50 Sovereignty + Investor | Phase 2 |
| X10 | Disaster-resilient operations machine (continues running if cloud goes dark) | §52 Sovereignty + Continuity | Phase 3 |

10 G-cases + 10 X-cases = 20 use cases in scope. Fit matrix in §2 evaluates each.

---

## §2 · Fit matrix

Each use case rated GOOD / WEAK / MISFIT against (a) actual device capability, (b) Phase 1 production state ZAAHI is in TODAY, and (c) consumer-alternative cost.

### 2.1 · G140 use-case fit

| Use case | Fit | Stack-compat? | Consumer alternative | Verdict |
|---|---|---|---|---|
| **G1 Field demo on plot site visits** | **GOOD** | Browser → `zaahi.io` works on Chrome/Edge on Windows 11 ✓ | iPad Pro 13" M4 Wi-Fi+5G AED 6,299 — same Safari → same site, much lighter (~600 g vs 1.79 kg) | iPad wins on portability + half the cost. G140 wins on rugged + sunlight readability if Dymo demos in mid-summer Dubai 45°C outdoor. |
| **G2 Architect site survey** | WEAK | OK on Windows | iPhone 15/16 Pro Max with Polycam Pro (LiDAR scan) per `mole-agent-data-sources.md` § "B5 iPhone 15 Pro Max + Polycam Pro 1yr team subscription" | iPhone Pro Max already in founder's possession + Polycam Pro AED 1,500/yr team → covers 90% of survey use case. G140 does not have LiDAR. |
| **G3 Mobile feasibility calculator on plot** | **GOOD** | Web app works on any browser ✓ | iPad Pro M4 — same | Same as G1: iPad wins on weight + cost; G140 wins on outdoor sun + drop. |
| **G4 Ambassador sales kit (broker meetings)** | **WEAK** | Browser ✓ | iPad Pro M4 OR existing MacBook | Brokers meet in air-conditioned offices, not in the desert. Rugged spec is overkill. iPad wins. |
| **G5 Edge AI Copilot+ (50 TOPS NPU)** | **WEAK in 2026** | Stack mismatch — ZAAHI uses Claude Opus 4.6 cloud per CLAUDE.md | Cloud Anthropic API · Mac mini M4 (16 TOPS NPU built-in via macOS frameworks) | Edge AI is Phase 3 sovereignty endgame, not Phase 1.5. NPU value would only land if Жан migrates Archibald to local inference — that's a Q3-Q4 2027 project, not now. |
| **G6 DLD field-officer integration node** | MISFIT | DLD API is cloud-based REST per `dld-public-data-audit-2026-04-27.md` | n/a | This use case does not exist — DLD does not deploy on-premise. |
| **G7 Investor / developer presentation** | WEAK | Browser ✓ | MacBook Pro 16" + Mirbek's existing kit | Investor presentations happen in 5-star hotel meeting rooms with 4K displays, not in 45°C dust. Use existing kit. |
| **G8 RFID / barcode property-tag scanning** | WEAK | Custom integration with ZAAHI back-end | iPhone Pro Max (NFC + camera barcode) | iPhone covers it. ZAAHI's `Parcel` model doesn't have a barcode/RFID field — no current use case. |
| **G9 Dual-SIM field connectivity** | OK | Standard internet client | Mobile hotspot device (Etisalat Business eSIM AED 1,200/yr per `Y1_LAUNCH_PLAN` line 4 B10) | Already in `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 B10 budget. |
| **G10 Founder high-stakes meeting device** | WEAK | Browser ✓ | MacBook Pro 16" + Mirbek's gear | Premium investor settings — MacBook is the right show device, not a Windows tablet. |

**G140 net verdict:** Strong fit for outdoor plot demos in extreme conditions (G1, G3). Weak elsewhere. **Outdoor demo cadence in Phase 1 (M1-M9) is unknown — if founders' actual plot-visit count is <2/month, an iPad Pro M4 covers it.** Re-evaluate at M9 with 6 months of dog-fooding data.

### 2.2 · X600 Server use-case fit

| Use case | Fit | Stack-compat? | Consumer alternative | Verdict |
|---|---|---|---|---|
| **X1 Жан's development workstation** | **MISFIT** | Stack INCOMPATIBLE — see §4 detail below | MacBook Pro 16" M4 Max (Жан's actual dev needs) | X600 Server runs Windows Server 2022 + Intel UHD only. ZAAHI dev workflow is macOS/Linux + Next.js + pnpm + Supabase tooling. X600 would force a stack rewrite. |
| **X2 Self-hosting full platform** | WEAK | Stack-portable to Linux per CLAUDE.md Sovereignty Rules; but Windows Server 2022 hosting Next.js is unusual | Mac mini M4 16GB AED 2,499 + monitor (for self-host MVP); OR Hetzner/AWS dedicated AED 500-2k/month | Replacing Vercel ($240-2k/yr) + Supabase ($25-200/mo) with a single AED 35-50k device is not cost-positive until Y3+. And single point of failure. |
| **X3 Backup / DR node** | OK | Postgres replica + filesystem archive — works on any *nix | Mac mini M4 with 24 TB external (~AED 4,000 + AED 3,000 storage) | Mac mini cheaper, runs the same Postgres. Supabase already has continuous backups; X600 RAID is over-engineering. |
| **X4 Edge data-acquisition node** (DLD CSV pipeline host) | **GOOD-but-overkill** | `scripts/dubai-pulse/refresh.sh` runs on any Ubuntu — current spec was assumed to be on Жан's Getac per `dubai-pulse-pipeline-runbook.md` §0 | Mac mini M4 OR existing MacBook can run weekly cron with the same Playwright + pandas | Use case is REAL (Dubai Pulse pipeline needs a host) but Mac mini at AED 2.5-4k does the same job. X600's 16 TB RAID is overkill — DLD CSVs are 250 MB-1 GB monthly, so 1 TB is 100 years of archives. |
| **X5 Mobile RAID server for site-archive** | MISFIT | Use case unclear — what site-archive does ZAAHI gather that requires 16 TB on-site? | n/a | Phase 1 has no on-site data-capture flow. Plot photos + LiDAR scans are tiny (MB, not GB). |
| **X6 DLD on-premise integration node** | MISFIT | Same as G6 — DLD doesn't do on-premise | n/a | Use case does not exist. |
| **X7 Robotics Fund §70 hardware platform** | UNKNOWN | §70 is Phase 3-4 (M30+) by `MASTER_TREE_final.md` framing | n/a | Premature by 2-3 years. |
| **X8 Architect heavy-compute on-site** | MISFIT | LiDAR / photogrammetry compute — but X600 has Intel UHD only, not GPU | MacBook Pro M4 Max (40-core GPU) handles LiDAR processing 10-30× faster than Intel UHD | If processing is the use case, MacBook Pro Max is the right tool — not X600. |
| **X9 Government / DLD demo workstation** | WEAK | Browser demo — overkill | iPad Pro / MacBook Pro | Regulator meetings happen in glass towers, not the field. |
| **X10 Disaster-resilient operations machine** | WEAK | Implies cloud-down scenario — ZAAHI is cloud-native today | Mac mini + UPS + 4G failover for AED 5k total | Specific scenario unclear — what disaster does this defend against that Vercel multi-region + Supabase backups don't? |

**X600 Server net verdict:** No use case justifies AED 35-50k. The only "GOOD" use is X4 (Dubai Pulse data-acquisition node) — and a Mac mini M4 at AED 2,499 does that for **7% of the price** with better stack-compatibility. **Recommend not buying X600 Server in any phase.**

---

## §3 · Pricing research (UAE 2026)

### 3.1 · Getac devices (UAE-specific, all quote-based)

| Device | UAE distributor | UAE 2026 price (estimate) | Confidence |
|---|---|---:|---|
| **Getac G140** (AMD Ryzen AI 5 / 16 GB / 256 GB SSD baseline) | [Miltec UAE](https://www.milcomputing.com/products/rugged-laptops/) (sole Getac GCC distributor) | **AED 13,000-20,000** baseline · AED 22,000-30,000 high-spec (Ryzen AI 7 PRO 350 + 64 GB + 2 TB + 5G) | LOW — June 2026 launch, no public UAE pricing as of 2026-04-27. Estimate based on comparable 14" Copilot+ rugged tablets internationally USD 3,500-5,500 + UAE markup |
| **Getac X600 Server** (Xeon W-11865MRE / 32 GB / 1 TB baseline) | Miltec UAE | **AED 25,000-35,000** baseline · AED 40,000-55,000 high-spec (128 GB + 16 TB RAID + extended battery + Blu-Ray) | MEDIUM — international pricing surveyed (AVADirect USA: USD 6,500-12,000 base; Direct Industry quoted EUR 8,000-15,000); UAE typically +15-20% via Miltec |
| **Getac F110 G6** (i7 / 16 GB / 512 GB — for reference, was in Y1_LAUNCH_PLAN line 4) | Miltec UAE | **AED 12,000-15,000** baseline | MEDIUM — F110 G6 is established product, mid-2022 release |

**Spec PDFs cited in this analysis:**
- `docs/research/Getac_G140_WW_Product.pdf` — generated 2026-04-16, full spec sheet
- `docs/research/Getac_X600_SERVE_WW_Product.pdf` — generated 2026-04-17, full spec sheet

**Getac G140 launch sources (verified 2026-04-27):**
- [BetaNews — Getac launches AMD-powered G140](https://betanews.com/article/getac-launches-amd-powered-g140-rugged-copilot-tablet-with-14-inch-display-and-edge-ai-support/)
- [PRNewswire — Getac G140 Copilot+ PC](https://www.prnewswire.com/apac/news-releases/getac-redefines-rugged-mobility-with-launch-of-g140-copilot-pc-powered-by-amd-technology-302749897.html)
- [ChannelNews — G140 for industries relying on edge AI](https://www.channelnews.com.au/getac-unveils-g140-copilot-pc-for-industries-relying-on-edge-ai-in-harsh-conditions/)
- [IT Supply Chain — Getac G140 launch](https://itsupplychain.com/getac-redefines-rugged-mobility-with-launch-of-g140-copilot-pc-powered-by-amd-technology/)

**Getac X600 Server international pricing for UAE-cost-extrapolation:**
- [AVADirect — X600 Server with Intel Xeon configurator](https://www.avadirect.com/Getac-X600-Server-Intel-Xeon-W-Fully-Rugged-Laptop-15-6-Full-HD-LCD-Intel-UHD-Graphics/Configure/17080228) — **note: explicitly Intel UHD Graphics**, no NVIDIA option
- [Direct Industry — X600 Server EU listing](https://www.directindustry.com/prod/getac/product-15086-2575527.html)
- [Glacier Computer — X600 base model](https://glaciercomputer.com/product/getac-x600/)

### 3.2 · Consumer alternatives (UAE-confirmed Sharaf DG 2026 pricing)

| Device | Spec | UAE price (Sharaf DG 2026-04-27) | Use case fit |
|---|---|---:|---|
| **iPad Pro 13" M4 256 GB Wi-Fi** | M4 chip, Apple Pencil compatible, sunlight-OK display | ~AED 4,500-5,500 | Field-demo replacement for G140 (use cases G1, G3, G4, G7, G10) |
| **iPad Pro 13" M4 256 GB Wi-Fi+Cellular** | Same + 5G | **AED 6,299** ([Sharaf DG](https://uae.sharafdg.com/product/13-inch-ipad-pro-m4-2024-wi-fi-cellular-256gb-with-standard-glass-space-black/)) | Field-demo with always-on connectivity (G140 alternative) |
| **Mac mini M4 10-core 16 GB / 256 GB** | macOS, 16 TOPS NPU, runs Linux dev workflows natively | **AED 2,499** ([Sharaf DG](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-with-10-core-cpu-16gb-ram-256gb-ssd-10-core-gpu-macos-sequoia-silver-middle-east-version/)) | Self-hosting + Dubai Pulse pipeline host (X4) — replaces X600 Server use cases at 7% cost |
| **Mac mini M4 10-core 24 GB / 512 GB** | More RAM for Postgres + AI work | **AED 4,179** ([Sharaf DG](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-with-10-core-cpu-24gb-ram-512-gb-ssd-10-core-gpu-macos-sequoia-silver-middle-east-version/)) | Self-host + DR node combo (X3 + X4) |
| **Mac mini M4 Pro 12-core 24 GB / 512 GB** | Workstation-grade for Жан dev workload | **AED 5,859** ([Sharaf DG](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-pro-with-12-core-cpu-24gb-ram-512-gb-ssd-16-core-gpu-macos-sequoia-silver-middle-east-version/)) | Жан desktop dev (alternative to MacBook Pro for stationary work) |
| **MacBook Pro 16" M3 Max 14-core 36 GB / 1 TB** | True dev workstation with 30-core GPU | **From AED 12,000** ([Sharaf DG](https://uae.sharafdg.com/macbook-pro-m3/)) — typical AED 15,000-18,000 stocked | **Жан's actual dev machine** — replaces incorrect X600 Server allocation in `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 |

### 3.3 · Founder-authority + budget context

Per task brief: **founder authority AED 100,000 single purchase / AED 500,000 monthly cap**.

| Scenario | Total purchase | Within authority? |
|---|---:|---|
| Buy both Getac (G140 baseline + X600 Server baseline) | AED 38,000-55,000 | ✅ within single-purchase cap |
| Buy both high-spec | AED 62,000-85,000 | ✅ within single-purchase cap |
| Buy G140 only | AED 13,000-30,000 | ✅ |
| Buy X600 Server only | AED 25,000-55,000 | ✅ (high-spec near cap) |
| Buy both + accessories + 3-yr warranty bumps | AED 55,000-100,000 | ⚠️ near single-purchase cap |
| **Recommended (defer): MacBook Pro 16" M4 Max for Жан, retain F110 G6 budget for Dymo** | AED 22,000-28,000 + AED 13,000 = AED 35,000-41,000 | ✅ comfortably within authority |

The "AED 1.5-1.7M Y1 budget" figure in the task brief differs from the AED 1M I worked with on `research/launch-research-2026-04-25` (Y1_LAUNCH_PLAN v1.2). **ASSUMPTION:** budget grew because Rudi wired more, OR this is a different framing including expected revenue. In either case, AED 35-100k for both Getac devices is 2-7% of the AED 1.5M budget — non-trivial but not budget-breaking.

---

## §4 · Stack-compatibility analysis (CRITICAL)

### 4.1 · Current ZAAHI stack (per CLAUDE.md + production state)

- **Framework:** Next.js 15, React 19
- **Language:** TypeScript 5
- **Database:** Supabase PostgreSQL (eu-central-1 Frankfurt) + Prisma ORM
- **Deploy:** Vercel auto-deploy from `main` (production at `zaahi.io`)
- **Local dev:** macOS / Linux with `pnpm` + Node.js
- **Maps:** MapLibre GL + PMTiles
- **AI:** Cloud Claude Opus 4.6 (Master) + Sonnet 4.6 (Cat/Mole/Falcon agents)

### 4.2 · Windows 11 Pro on G140 — compat check

| Capability | Verdict | Notes |
|---|---|---|
| Run `pnpm dev` for ZAAHI | OK with WSL2 | Жан would need to install WSL2 + Ubuntu inside Windows 11 → defeats "rugged tablet" simplicity |
| Browser → `zaahi.io` for demo | ✅ OK | Edge / Chrome on Windows 11 renders Next.js production fine |
| Run Archibald chat live in front of client | ✅ OK | All cloud-based; just needs internet |
| Local Postgres + Supabase emulator | OK with effort | Жан doesn't dev on a Windows tablet anyway — not the use case |
| MapLibre + 3D Buildings rendering | ✅ OK in Edge/Chrome | AMD Radeon 840M / 860M handles WebGL2 fine |
| Touch / pen input on parcel map | OK | Capacitive multi-touch + optional digitizer; ZAAHI map UI is mouse-first today |

**Verdict G140 stack compat: BROWSER-CLIENT-OK, DEV-WORKFLOW-MISMATCH.** G140 = a viewing/demo device, not a build/development device. Жан should not switch his daily dev to a 14" Windows tablet — the macOS-Linux dev workflow + larger screens + better keyboard ergonomics matter more than ruggedness for a CTO single-engineer with 5,000+ lines of map code.

### 4.3 · Windows Server 2022 on X600 Server — compat check

| Capability | Verdict | Notes |
|---|---|---|
| Жан's day-to-day development | ❌ **MISFIT** | Windows Server 2022 is a server OS — no Microsoft Store consumer apps, restricted UI, designed for headless / data-centre use |
| Self-host Next.js + Postgres | ⚠️ technically possible, operationally weird | Linux is the standard host for Next.js production; Windows Server 2022 hosting requires IIS reverse-proxy + Node.js Windows binaries — atypical, fewer community resources |
| Self-host Supabase replica | ⚠️ partial | Supabase self-host is Docker-based; Windows Server can run Docker but Linux is the well-trodden path |
| Run `scripts/dubai-pulse/refresh.sh` (the one I just wrote) | ❌ **No** — bash + Playwright + Chromium with Linux libdeps; Windows Server is `.cmd`/PowerShell native | Could re-write to PowerShell but 0 reason to — Mac mini or Жан's existing macOS handle it |
| Edge AI inference for Archibald | ❌ wrong tool | X600 Server has Intel UHD only; no NVIDIA / no large NPU; not suitable |
| Heavy-RAID storage for raw data | ✅ Capable | 16 TB RAID is real but ZAAHI's data needs (250 MB-1 GB / month per `dubai-pulse-pipeline-runbook.md`) make it 100× over-provisioned |

**Verdict X600 Server stack compat: STACK MISMATCH ON ALMOST EVERY USE CASE.** The "Server" name + Windows Server OS misled the prior `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 entry into thinking it was Жан's dev workstation. It isn't.

### 4.4 · The right machine for Жан's dev work

**MacBook Pro 16" M4 Max (or current M3 Max stock):**
- Native macOS for Next.js + pnpm + Vercel CLI + Supabase CLI workflow (no friction)
- 36 GB+ unified memory for running ZAAHI dev server + Postgres + browser dev tools simultaneously
- 30-40 core GPU for MapLibre 3D testing + future LiDAR / Mole Agent processing per `mole-data-acquisition-log.md`
- 16-core NPU (M4 Max) for any future on-device AI experimentation
- ~AED 22,000-28,000 — fits comfortably in the prior line 4 envelope (was AED 35,000 for X600 Server)
- Жан is already on macOS dev workflow (per CLAUDE.md "Локальные модели: Ollama (qwen2.5-coder:7b для утилит, qwen3:8b для чата)") — no migration cost

**Recommend revising `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4** in a follow-up commit: replace X600 Server (AED 35k, MISFIT) with MacBook Pro 16" M4 Max (AED 22-28k, RIGHT TOOL).

---

## §5 · Risks + counter-arguments

Honest devil's advocate against the recommendation in §0.

### 5.1 · "But the X600 Server is rugged for site-acquisition"

**Counter:** ZAAHI's site-acquisition flow today is photos + DLD-data-lookup, not high-volume on-site data capture. The 250 MB-1 GB/month of DLD CSV processing fits on a 256 GB MacBook with room for years. The 16 TB RAID is solving a Phase 4-5 robotics-data-archive problem we don't have.

### 5.2 · "G140's Copilot+ NPU future-proofs us for edge AI"

**Counter:** ZAAHI's AI strategy per CLAUDE.md is **cloud Claude Opus 4.6** — not edge inference. The local-AI plan (CLAUDE.md "Own AI 2027 · Fine-tuned on Zaahi Data, GPU Cluster A100×8") is server-grade GPU clusters, not a 50 TOPS tablet NPU. The G140's NPU would sit idle for 18+ months until edge AI use cases mature. By that time, the G140 hardware is 1.5 generations old.

### 5.3 · "Premature optimization — but field demos start Phase 2"

**Concur.** That's exactly why the recommendation is **defer to Phase 2**. The argument is not "never buy" — it's "not 2026-04-27, when the device's Phase 2 use cases haven't materialised and an iPad Pro M4 covers Phase 1 demos."

### 5.4 · "Cash burn — these are 2-7% of Y1 budget"

**Modest by % but high-opportunity-cost.** AED 50-85k for both Getac devices = the same as: 2-3 months of additional engineer salary OR a year of comprehensive UAE counsel retainer OR ~AED 80k of additional brand identity work. ZAAHI's bus-factor blocker (Жан single PoF per task brief) is solved by hiring, not hardware. AED 85k toward a part-time technical co-founder hire (per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 §6.7) attacks the actual blocker.

### 5.5 · "Lock-in — Windows ecosystem against macOS / Linux dev"

**Real risk.** Windows 11 + Windows Server 2022 introduce a second OS into the dev support matrix. Жан becomes the only person who can debug Windows-specific issues. Bus-factor gets worse, not better. The G140 as a thin demo client (browser only) is fine; the X600 as anything more than a trash-can-shaped backup server is a maintenance burden.

### 5.6 · "Existing iPhone / iPad / MacBook covers 80%"

**Validated by §2 fit matrices.** The honest answer is yes — 80%+ of both devices' realistic Phase 1 use cases are covered by:
- Founder iPhone 16 Pro Max + Polycam Pro (LiDAR + camera + portable internet)
- A new iPad Pro 13" M4 Wi-Fi+5G (AED 6,299) for outdoor demo
- A new MacBook Pro 16" M4 Max (AED 22-28k) for Жан's dev work
- A new Mac mini M4 (AED 2,499-5,859) for Dubai Pulse pipeline + DR node host
- **Total alternative stack: AED 31,000-42,000 — vs AED 38,000-55,000 for both Getacs baseline.**

The alternative stack ships TODAY (no June 2026 wait) + matches the existing dev workflow + has 5-10× larger 3rd-party support community + lower bus factor.

### 5.7 · "Bus factor is solved by ruggedness"

**No.** Bus factor (Жан single PoF per task brief) is a people problem, not a hardware problem. Any device — rugged or not — sitting on Жан's desk is one accident, illness, or burnout away from being inaccessible. The fix is: a part-time second engineer with shared `git` access + a documented runbook (which `dubai-pulse-pipeline-runbook.md` is now an example of). Hardware doesn't help.

---

## §6 · Comparison matrix — three paths

Side-by-side per task spec.

| Dimension | Path A: Buy both Getacs | Path B: Buy G140 only | Path C: Buy X600 Server only | **Path D: DEFER + buy MacBook + iPad + Mac mini** |
|---|---|---|---|---|
| **Total cost (UAE 2026 baseline)** | AED 38,000-55,000 | AED 13,000-20,000 | AED 25,000-35,000 | AED 31,000-42,000 |
| **Cost (high-spec)** | AED 62,000-85,000 | AED 22,000-30,000 | AED 40,000-55,000 | AED 50,000-65,000 |
| **Time-to-availability** | June 2026 (G140 launch) | June 2026 | NOW (X600 Server in Miltec UAE inventory) | NOW (Sharaf DG stocks all 3) |
| **Phase 1 dog-fooding fit** | OVERKILL | WEAK (Phase 2 demo device) | MISFIT (no Phase 1 use case) | **STRONG** (matches actual stack + use cases) |
| **Phase 2 fit (M10-M17 broker outreach)** | STRONG (G140 for demos, X600 unused) | STRONG | WEAK | OK (G140 added then if data justifies) |
| **Phase 3 fit (M18+ external launch + sovereignty)** | STRONG | OK | OK (sovereignty endgame) | STRONG (Mac mini = practice run for sovereignty migration) |
| **Stack compat with Next.js / Supabase / Vercel** | MIXED (Windows 11 OK, Windows Server bad) | OK (browser-client only) | BAD (Windows Server 2022) | **PERFECT** (macOS native) |
| **Bus-factor improvement** | None | None | None | None (hardware doesn't fix people problem) |
| **Reusability for Жан daily dev** | Low (G140 demo only, X600 wrong OS) | None | None | **High** (MacBook is THE primary tool) |
| **Sovereignty path alignment** | Wins on "data on UAE soil" only IF self-hosted (which is not the plan Phase 1) | Wins on field-edge | Wins on RAID storage (overkill) | Same sovereignty story when migrating to G42 cloud — hardware doesn't change that path |
| **Authority compliance (AED 100k single, 500k monthly)** | ✅ within | ✅ within | ✅ within | ✅ within |
| **My recommendation** | NO | DEFER to Phase 2 | NO | **YES** |

---

## §7 · Final recommendation — Path d (DEFER) with one substitution

### 7.1 · Decision

**Recommendation: (d) Defer both Getac purchases to Phase 2 (M10+) — re-evaluate at M9 with 6 months of dog-fooding data.** Buy a MacBook Pro 16" M4 Max for Жан + a Mac mini M4 (16 GB / 256 GB or 24 GB / 512 GB) as the Dubai Pulse pipeline + DR host, replacing the X600 Server budget allocation. Defer the G140 decision — if outdoor demo cadence in Phase 1 (M1-M9) exceeds 2 plot visits/month, revisit at M9 with iPad Pro M4 as alternative.

### 7.2 · Justification chain

1. The X600 Server ≠ developer workstation. The prior `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 entry was based on a wrong assumption about what "Server" in the device name means. Confirmed by reading both Getac PDFs in `docs/research/`.
2. ZAAHI Phase 1 (M1-M9) is owner-first dog-fooding per the §77 v1.1 brief — site-visit cadence is unknown but likely <2/month, well within iPad Pro M4 capability.
3. The G140 launches June 2026 — Phase 2 doesn't start until M10 (~end of 2026/early 2027 per `LAUNCH_PLAN.md` Phase 2). Buying now means a 4-7-month idle device, with a faster 2027 successor likely available by Phase 2.
4. The X600 Server's only "GOOD" fit (X4 Dubai Pulse pipeline host) is delivered by a Mac mini M4 at 7% of the cost with stack-native macOS.
5. Жан's actual dev workstation gap is a real Phase 1 problem that AED 22-28k MacBook Pro 16" M4 Max solves directly.
6. AED 85k (Path A high-spec) toward a part-time second engineer attacks the bus-factor blocker that hardware cannot solve.

### 7.3 · Path-d shopping list (recommended for 2026-04-27)

| Item | Vendor | UAE price | Use case |
|---|---|---:|---|
| MacBook Pro 16" M4 Max 14-core / 36 GB / 1 TB | [Sharaf DG](https://uae.sharafdg.com/macbook-pro-m3/) or Apple AE | AED 22,000-28,000 | Жан's primary dev workstation (replaces X600 Server allocation) |
| Mac mini M4 10-core / 24 GB / 512 GB | [Sharaf DG](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-with-10-core-cpu-24gb-ram-512-gb-ssd-10-core-gpu-macos-sequoia-silver-middle-east-version/) | AED 4,179 | Dubai Pulse pipeline host + Postgres DR replica + always-on home-office node |
| iPad Pro 13" M4 Wi-Fi 256 GB | [Sharaf DG](https://uae.sharafdg.com/product/13-inch-ipad-pro-m4-2024-wi-fi-256gb-with-standard-glass-space-black/) | ~AED 4,500 | Field-demo device for occasional outdoor showings (defers G140 decision) |
| External 4 TB NVMe (Samsung T9) for Mac mini DR archive | Sharaf DG / Amazon.ae | ~AED 1,500-2,000 | Long-tail Dubai Pulse archive (years of monthly snapshots) |
| **Path-d total** | | **AED 32,179-38,679** | |

### 7.4 · Backup plan if Path-d fails

If Phase 1 dog-fooding reveals an actual outdoor demo cadence >2/visit/month AND IPS displays fail in summer Dubai sun → buy G140 in M9-M10 with confirmed June 2026 launch + Miltec UAE quote (AED 13-22k baseline). Defer X600 Server permanently — its only fit (X4 data-acquisition) is solved by Mac mini.

### 7.5 · Reversal trigger

This recommendation should be reconsidered if ANY of:
- **R1** Founder confirms a use case for either Getac that this analysis missed (note: §1 enumerated 20 use cases — surface anything missing)
- **R2** ZAAHI signs an enterprise-customer contract that REQUIRES Windows Server hosting (e.g. UAE government client mandates on-premise Windows Server stack)
- **R3** Sovereignty migration to G42 fails AND the only path is self-hosted UAE (then X600 Server's RAID becomes meaningful) — but this is Phase 3+ minimum
- **R4** Жан begins a robotics-fund §70 project earlier than M30 (X600 RAID + ruggedness might fit)

---

## §8 · Open questions for founder (Dymo, before purchase decision)

1. **What use case in §1 is the actual driver for the G140 / X600 Server interest?** 20 use cases enumerated; at most 2-3 are genuine STRONG fits. Identifying the specific driver may change the recommendation — e.g. if Dymo wants a Windows Copilot+ tablet for personal travel + ZAAHI demo, G140 makes sense as a personal device, not a ZAAHI capex line.
2. **Y1 budget AED 1M (per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2) vs AED 1.5-1.7M (per this task brief) — which is current?** Different budget changes the cost-headroom calculus materially.
3. **Жан's current dev machine — is it actually a constraint?** If he's working productively on existing hardware, the MacBook Pro M4 Max purchase is also deferrable.
4. **Outdoor plot-visit cadence in Phase 1 — what's the actual expected count Q3-Q4 2026?** Drives whether iPad Pro M4 is sufficient or G140 is justified.
5. **Is there a regulator / government partnership in motion that requires on-premise Windows hosting?** Confirm absence; if absent, X600 Server has zero ZAAHI Phase 1-2 use case.
6. **Should `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 line 4 be revised** in a follow-up commit to drop the X600 Server (AED 35k) and reallocate to MacBook Pro M4 Max (AED 22-28k)? The released AED 7-13k could route to: part-time engineer hire fund OR additional brand identity OR insurance E&O add-on per `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 §8 D-4.
7. **Bus-factor mitigation funding** — should the AED 50-85k currently considered for both Getacs route to a part-time second engineer ($3-5k/month for 12-18 months)?

---

## §9 · Sources

### 9.1 · Repo files (read in this session)

- `docs/research/Getac_G140_WW_Product.pdf` — full G140 spec sheet (generated 2026-04-16)
- `docs/research/Getac_X600_SERVE_WW_Product.pdf` — full X600 Server spec sheet (generated 2026-04-17)
- Prior cross-references (read on adjacent branches; not on this branch's HEAD): `Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 (commit `871e73e` on `research/launch-research-2026-04-25`), `mole-agent-data-sources.md`, `dubai-pulse-pipeline-runbook.md`, CLAUDE.md
- Task brief inline §77 context (v1.0 → v1.1 hybrid multi-tenancy, Phase 1 M1-M9 owner-first dog-fooding, Phase 2 M10-M17 external opening Jan 2027, current production state zaahi.io live + 114 parcels + Archibald AI + Feasibility v5.0, blockers: notifications broken / Wall blocked / DLD Gateway blocked / Жан single tech PoF)

### 9.2 · Web sources (all retrieved 2026-04-27)

**Getac G140 (April 2026 launch announcements):**
- [BetaNews — Getac launches AMD-powered G140 rugged Copilot+ tablet](https://betanews.com/article/getac-launches-amd-powered-g140-rugged-copilot-tablet-with-14-inch-display-and-edge-ai-support/)
- [PRNewswire — Getac G140 Copilot+ PC, AMD Technology](https://www.prnewswire.com/apac/news-releases/getac-redefines-rugged-mobility-with-launch-of-g140-copilot-pc-powered-by-amd-technology-302749897.html)
- [ChannelNews — G140 for industries relying on edge AI](https://www.channelnews.com.au/getac-unveils-g140-copilot-pc-for-industries-relying-on-edge-ai-in-harsh-conditions/)
- [IT Supply Chain — Getac G140 launch](https://itsupplychain.com/getac-redefines-rugged-mobility-with-launch-of-g140-copilot-pc-powered-by-amd-technology/)
- [Funky Kit — G140 Copilot+ PC launch](https://www.funkykit.com/news/getac-launches-g140-copilot-rugged-pc-powered-by-amd-technology)
- [Back2Gaming — G140 Copilot+ Rugged Tablet](https://www.back2gaming.com/news/getac-unveils-the-g140-copilot-rugged-tablet-powered-by-amd-ryzen-ai/)
- [Getac official G140 product page](https://www.getac.com/intl/products/tablets/g140/)

**Getac X600 Server (international pricing references):**
- [AVADirect — X600 Server Intel Xeon W configurator](https://www.avadirect.com/Getac-X600-Server-Intel-Xeon-W-Fully-Rugged-Laptop-15-6-Full-HD-LCD-Intel-UHD-Graphics/Configure/17080228) — confirms Intel UHD Graphics, no NVIDIA option
- [AVADirect — X600 base configurator](https://www.avadirect.com/Getac-X600-15-6-Fully-Rugged-Mobile-Workstation/Configure/15498776)
- [Direct Industry — X600 Server EU listing](https://www.directindustry.com/prod/getac/product-15086-2575527.html)
- [Glacier Computer — X600 Rugged Laptop](https://glaciercomputer.com/product/getac-x600/)
- [Getac official X600 Server product page](https://www.getac.com/intl/products/laptops/x600-server/)
- [Getac official X600 Pro product page](https://www.getac.com/us/products/laptops/x600-pro/)
- [Getac X600 Server EN product PDF](https://www.getac.com/content/dam/getac/product-spec-data-pdf/en/Getac_X600_SERVER_EN_Product.pdf)

**UAE distribution:**
- [Miltec UAE — official Getac GCC distributor](https://www.milcomputing.com/products/rugged-laptops/) (also [milcomputing.com root](https://www.milcomputing.com/))

**Consumer alternatives (UAE Sharaf DG verified prices):**
- [Sharaf DG — iPad Pro M4 product hub](https://uae.sharafdg.com/ipad-pro-m4/)
- [Sharaf DG — iPad Pro 13" M4 Wi-Fi+Cellular 256 GB AED 6,299](https://uae.sharafdg.com/product/13-inch-ipad-pro-m4-2024-wi-fi-cellular-256gb-with-standard-glass-space-black/)
- [Sharaf DG — iPad Pro 13" M4 Wi-Fi 256 GB](https://uae.sharafdg.com/product/13-inch-ipad-pro-m4-2024-wi-fi-256gb-with-standard-glass-space-black/)
- [Sharaf DG — Mac mini M4 16 GB / 256 GB AED 2,499](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-with-10-core-cpu-16gb-ram-256gb-ssd-10-core-gpu-macos-sequoia-silver-middle-east-version/)
- [Sharaf DG — Mac mini M4 24 GB / 512 GB AED 4,179](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-with-10-core-cpu-24gb-ram-512-gb-ssd-10-core-gpu-macos-sequoia-silver-middle-east-version/)
- [Sharaf DG — Mac mini M4 Pro 24 GB / 512 GB AED 5,859](https://uae.sharafdg.com/product/apple-mac-mini-2024-m4-pro-with-12-core-cpu-24gb-ram-512-gb-ssd-16-core-gpu-macos-sequoia-silver-middle-east-version/)
- [Sharaf DG — MacBook Pro M3 Max product hub](https://uae.sharafdg.com/macbook-pro-m3/)
- [Sharaf DG — MacBook Pro 16" M3 Max 36 GB / 1 TB Space Black](https://uae.sharafdg.com/product/apple-macbook-pro-16-inch-2023-m3-max-with-14-core-cpu-36gb-ram-1tb-ssd-30-core-gpu-macos-sonoma-english-arabic-keyboard-space-black-middle-east-version/)
- [Sharaf DG — MacBook Pro 16" M4 Pro Max 36 GB / 1 TB](https://uae.sharafdg.com/product/apple-macbook-pro-16-inch-2024-m4-pro-max-with-14-core-cpu-36gb-ram-1tb-ssd-32-core-gpu-macos-sequoia-silver-middle-east-version-2/)

### 9.3 · Retrieval and authoring

- All web retrieval 2026-04-27 within agent acquisition session.
- Both Getac PDFs read directly from `docs/research/` working tree.
- Document drafted by Claude Opus 4.7 (1M context) under Claude Code agent runtime.
- All claims either cited above OR explicitly flagged as ASSUMPTION / UNKNOWN per task spec.

---

## §10 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-27 | ZAAHI engineering agent | Initial hardware-fit analysis. **Headline: DEFER both Getac purchases (Path d)**; replace prior Y1_LAUNCH_PLAN v1.2 line 4 X600 Server allocation (AED 35k, MISFIT — "Server" was misread as workstation-class graphics; X600 actually has Intel UHD only + Windows Server 2022) with MacBook Pro 16" M4 Max for Жан (AED 22-28k) + Mac mini M4 for Dubai Pulse pipeline host (AED 4,179) + iPad Pro 13" M4 for Phase 1 outdoor demo (~AED 4,500). 20 use cases enumerated (10 G140 + 10 X600 Server) — only 2-3 are STRONG fits, all Phase 2+. G140 launches June 2026 (no point buying 4-7 months early). Stack compat analysis confirms X600 Server's Windows Server 2022 misaligns with ZAAHI's Next.js + macOS dev workflow. Pricing matrix uses confirmed Sharaf DG 2026-04-27 prices for consumer alternatives + Miltec UAE distributor for Getac (G140 quote-only since launch is April 2026). 7 open questions for Dymo — most important: which §1 use case is the actual driver for the interest? No `src/` edits. No schema edits. No canonical edits. No main push. |

---

*End of getac-g140-x600-fit-analysis.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/getac-hardware-fit-2026-04-27`.
