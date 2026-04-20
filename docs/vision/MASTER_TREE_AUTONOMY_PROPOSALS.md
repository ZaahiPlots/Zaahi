# MASTER TREE — AUTONOMY PROPOSALS

**Document:** Autonomy / Automation Improvement Proposals (advisory; does not amend the Master Tree)
**Prepared for:** Zhan (Founder/CEO/CTO), Dymo (Co-founder), Rudi (Investor/Board)
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Relation to Master Tree v3:** Extends §41 AI System, §46 Robotics OS, §47 Notification Engine, §48 Search, §49 Translation, §54 Revenue Engine, §66 Market Intelligence, §70 Analytics Engine, §83 CI/CD, and §76 Onboarding. Canonical sections unchanged.
**Priority rationale:** Autonomy is ranked P4 in this batch (after Sovereignty + Safety + Missing Branches) because each autonomy wins is **incremental margin**, not strategic unlock. But cumulatively, autonomy is the difference between "ZAAHI needs 50 human operations staff at 10 000 DAU" and "ZAAHI needs 5 operations staff at 10 000 DAU" — a 10× cost structure variance at scale.
**Classification:** CONFIDENTIAL

---

## Executive summary

Autonomy is not an end in itself — it is the only way a platform with 21 revenue streams (per Master Tree §54) can operate at founder margins without a 50-person ops team. Every automated workflow is a compound saving: the first use saves a founder hour, the thousandth use saves fifty; by the ten-thousandth the workflow is a hidden employee on AED 0 / yr payroll.

ZAAHI already has meaningful autonomy today: Archibald answers multilingual queries; Vercel auto-deploys from `main`; the Ambassador commission walker runs without human intervention inside the `$transaction` per `CLAUDE.md`. The gap is **consistency** — many workflows are ~60 % automated, with a human filling the remaining 40 % (e.g., admin manually verifies USDT tx-hash before Ambassador activates). Closing that last 40 % is where autonomy compounds.

Five autonomy domains covered below, each with a current/proposed/effort/ROI breakdown:

1. **AI agent autonomy** — Archibald extensions + new single-purpose agents (intake, pricing, qualification, broker vetting, lead routing, content gen, 3D gen, market intel, compliance monitor, support bot).
2. **Data pipeline autonomy** — DLD sync, heatmap refresh, satellite-derived change detection, translation pipeline, DDA plot indexing, VAT / CT filing automation.
3. **Business process autonomy** — self-service broker onboarding, auto-Trakheesi permits, auto-escrow routing, auto-commission calculation, auto-dividend computation.
4. **Development autonomy** — CI/CD deepening, Dependabot, auto-security scans, AI PR review, auto-docs, auto-testing from production.
5. **Content autonomy** — property descriptions in 6 (→60) languages, market reports, neighbourhood guides, video scripts, social media.

Every proposal notes what a human does today vs. what the agent could do, with a concrete ROI estimate (hours / AED saved).

---

## §1 AI agent autonomy (without founder intervention)

Organised as ten single-purpose agents. Each has a clear input → output → guardrail contract. None replaces the founder's judgment on high-stakes decisions; each removes the founder from the loop for repeatable decisions.

### 1.1 Listing intake agent

**Human today.** When an owner adds a parcel via `/parcels/new`, the form captures plot number, price, photos, docs. A founder (Zhan) periodically reviews for data quality — are photos aligned with claimed address? Is price within plausible range? Is the title deed readable?

**Agent could.** On submission:
- Call DDA API (if 7-digit plot) to verify polygon matches declared address.
- Run OCR + AI read of title deed PDF; confirm owner name matches submitter's Emirates ID name.
- Compare declared price against §66 district heatmap; flag if >30 % outside district band (fraud-detection signal from `CLAUDE.md` §41 Cat Agent rules).
- Verify photos aren't duplicates from Bayut / Property Finder (reverse image search via pHash against a rolling index).
- Auto-generate suggested description in 6 languages (via §49 Translation pipeline).
- Assign an initial quality score; high-quality listings auto-publish, low-quality go to human review queue.

**Complexity.** 3 engineer-weeks. Most components exist (DDA API, §66 heatmap, Claude for OCR, Qwen for description generation).

**Cost savings per year.** At 114 parcels LIVE + 5–10 new / week = 260–520 / yr, founder spends ~15 minutes per listing on review = 65–130 hours / yr. AED 300 / hr founder-opportunity-cost = **AED 20–40 k / yr**.

**Risk profile.** Low — agent auto-publishes only high-confidence listings; human still reviews flagged ones. Failure mode is "too many human reviews" = cost of inaction, not cost of action.

### 1.2 Pricing suggestion agent

**Human today.** Owner sets price (per `CLAUDE.md` rule "Общая цена участка устанавливается только вручную"). Dymo occasionally advises on pricing during client meetings.

**Agent could.** NOT set the price (canonical rule). But *suggest* a range per plot, based on:
- DLD historical sales of adjacent parcels (§66).
- Current listing prices of comparable plots (§48 search).
- Affection plan GFA × district $/sqft (§58 feasibility).
- Satellite change detection signals (§45).

Output: "Suggested range AED 38.5–42.5 M. Your listing at AED 45 M is 8 % above district 90th percentile." Advisory only; owner can ignore.

**Complexity.** 2 engineer-weeks. Most data sources exist.

**Cost savings per year.** Indirect — better-priced listings close faster. Target: reduce avg days-on-market by 20 % on ZAAHI listings. At 12 plot deals / yr × AED 800 k commission, moving 2 extra deals forward 1 quarter = **AED 1.6 M in accelerated revenue** (cash-flow benefit, not P&L).

**Risk profile.** Low — advisory, owner authority preserved. Suggested ranges must be calibrated (backtest against actual sale prices before shipping).

### 1.3 Buyer qualification agent (Archibald enhanced)

**Human today.** Dymo pre-qualifies leads manually over WhatsApp / call: budget, visa status, financing need, timeline. Roughly 30 minutes per lead. At 3–5 leads / week, that's 6–10 hours / week.

**Agent could.** Archibald extension with qualification script:
- Triggered when a user dwells >5 min on any parcel detail page.
- Natural-language elicits: budget, visa status, residency, financing preference, timeline, comparable recent UAE purchases.
- Outputs a qualified lead record with BANT score (Budget / Authority / Need / Timeline) for broker dashboard.
- Routes hot leads (BANT ≥ 80) directly to Dymo's Calendly; warm (40–79) to an agent; cold (<40) to nurturing email sequence.

**Complexity.** 4 engineer-weeks. Builds on existing Archibald; adds a structured-conversation mode, BANT scorer, lead-routing logic.

**Cost savings per year.** Founder time: 6–10 hours / week × AED 300 / hr = **AED 90–150 k / yr**. Plus: qualification quality (a BANT-scored lead is 2–3× likelier to close than an unscored one) — indirect conversion lift worth **AED 300 k – 1 M / yr at Y1 scale**.

**Risk profile.** Medium — a bad qualification can annoy a valuable lead. Safety net: every BANT ≥ 80 lead gets a human warmth touch from Dymo within 24 hours regardless.

### 1.4 Broker vetting agent — RERA license verification

**Human today.** External broker applies to Gold / Platinum tier at `/join`. USDT payment comes in. Admin manually verifies the USDT tx-hash on Tronscan, cross-checks broker's claimed RERA BRN against RERA public registry, reviews brand consistency of their application. ~15 minutes per application.

**Agent could.**
- Parse USDT tx-hash from form, poll Tronscan API to confirm: `to == TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7`, amount matches tier, status confirmed.
- RERA BRN verified via RERA public page scrape (interim) or RERA API (post-partnership).
- Auto-activate ambassador on both conditions true; push to human review if either fails.

**Complexity.** 2 engineer-weeks. Tronscan is public API; RERA BRN scrape is stable.

**Cost savings per year.** Target 60 Gold + Platinum signups Y1 × 15 min = 15 hours = **AED 5 k / yr**. Small, but latency matters: ambassadors activating within seconds (instead of hours) are more likely to post their first referral link same-day.

**Risk profile.** Low if USDT check is strict. Mitigation: any amount mismatch → manual review.

### 1.5 Lead routing agent

**Human today.** Dymo manually routes leads to himself or other future agents based on language, asset-type preference, district, budget. At 3 agents this becomes 9 one-to-one matching decisions / week.

**Agent could.** Route based on:
- Lead's declared language → agent speaking that language.
- Lead's asset-type preference (land / off-plan / ready / rental) → agent specialty.
- Lead's district preference → agent geo coverage.
- Agent's current pipeline (round-robin within capacity).
- Fallback: Dymo receives overflow.

**Complexity.** 1 engineer-week.

**Cost savings per year.** Scales with agent count; at 5 agents it's ~5 hours / week × 52 weeks = **AED 75 k / yr in avoided routing labour**.

**Risk profile.** Low — misrouted lead is recoverable; agent can re-route to colleague within the platform.

### 1.6 Content generation agent — property descriptions

**Human today.** Dymo or future copywriter writes property descriptions, often reusing templates. ~30 minutes per description × 6 languages = 3 hours per listing. At 260 new listings / yr, that's ~780 hours.

**Agent could.** Generate descriptions in EN / AR / RU / UK / SQ / FR (and more, per sovereignty Phase 3 fine-tuned model) given:
- Parcel attributes (plot number, area, land use, price, GFA, floors permitted).
- District context (from §66).
- Owner-provided highlights (free text).
- Brand-tone calibration (1-shot prompt with 3 sample ZAAHI descriptions).

Output is first-draft quality; founder spot-checks top-tier listings, junior staff reviews mass-market.

**Complexity.** 2 engineer-weeks. Entirely existing LLM capability; the work is prompt engineering + brand-tone calibration + 6-language-quality verification.

**Cost savings per year.** 780 hours saved × AED 200 / hr (junior copywriter rate) = **AED 156 k / yr**. Moves 6-language translation from impossible-today to default-tomorrow.

**Risk profile.** Low — AI-generated descriptions can be factually wrong; every description is bound to a data source (DDA affection plan, owner declaration) so fabrications are caught on spot-check.

### 1.7 3D building generation agent — Builder / Converter / Texturer

**Human today.** Zhan has implemented ZAAHI Signature 3D via `loadZaahiPlots` + `scaleRingFromCentroid` + `computeSetbackM`. Geometry generates automatically from plot data — no human-generated 3D.

**Agent could (next tier).** Given more detail:
- **Builder agent**: generate interior floor plans from plot area + land use (e.g., 2 000 sqft plot + residential villa → 4BR layout with standard Dubai villa proportions).
- **Converter agent**: ingest developer-provided floor plan PDF, output a glTF / GLB scene graph for metaverse use (§39).
- **Texturer agent**: given a building's land-use category + adjacency, pick a ZAAHI-branded material palette (glass / concrete / stone — parametrised per region).

**Complexity.** 12 engineer-weeks (this is §41 AI + §39 Metaverse deepening). Gated on Master Tree §41 "Own AI 2027" maturity for quality, or external service (Masterpiece X, Blockade Labs for texture) for interim.

**Cost savings per year.** Indirect — removes the need for architects (§20) to upload 3D per listing. Assumes 50+ listings would need custom 3D; at ~AED 5 k per model externally, that's **AED 250 k / yr avoided vendor cost** at scale.

**Risk profile.** Medium — AI-generated 3D is currently inferior to human-crafted on premium listings. Use tier-gated: AI gen for bulk, human-crafted for AED 50 M+ flagships.

### 1.8 Market intelligence agent — daily DLD feed processing

**Human today.** DLD heatmap is refreshed manually on an as-needed basis. No cadence.

**Agent could.** Nightly cron:
- Pull DLD public transaction feed (last 24 hours).
- Deduplicate against existing records.
- Recompute district-level heatmap tiles.
- Update "Last 30 days median $/sqft" cache.
- Generate a weekly digest email for subscribers (§47).
- Alert agents when a parcel price shifts >5 % in its district.

**Complexity.** 3 engineer-weeks. Covered in `POST_MEETING_BUILD_PLAN.md` C1 (DLD Transaction API).

**Cost savings per year.** Zero labour saved today (no one is manually pulling DLD). But enables a **new revenue stream** — subscription to weekly district digest (AED 500 / month × 100 subscribers Y2 = AED 600 k / yr).

**Risk profile.** Low — DLD public API rate limits are the operational risk; a second data source (Property Monitor public digest) as fallback.

### 1.9 Compliance monitoring agent — RERA / DLD / VARA rule-change tracking

**Human today.** Dymo and Zhan ad-hoc read UAE regulatory news. Rule changes (RERA notices, DLD circulars, VARA rulebook updates) often discovered weeks late.

**Agent could.**
- Subscribe to RSS / HTML feeds from RERA / DLD / VARA / Dubai Pulse / ADGM.
- Daily parse; diff against prior day; flag changes.
- Summarise in plain English what changed and what ZAAHI should review.
- Route P0 (major rule change) to Dymo + Zhan immediately; P1–P3 to weekly digest.

**Complexity.** 2 engineer-weeks. LLM summarisation is mature; the work is identifying the right feeds + robust parsing.

**Cost savings per year.** Indirect — catching a RERA rule change 2 weeks earlier can save a deal (or avoid a compliance breach). Hard to quantify; assume **1 avoided incident / yr × AED 100 k** = AED 100 k / yr EV.

**Risk profile.** Low — agent is advisory; humans still execute on rule changes.

### 1.10 Support chatbot — multilingual query resolution

**Human today.** Support requests go to Dymo or via email (informal). No ticketing system. Most queries are repeats: "how do I add a parcel?", "how do I withdraw ambassador commission?", "what's Trakheesi?".

**Agent could.** Archibald support mode with:
- Structured handoff from general chat to support when user sentiment flags frustration or explicit help-seeking.
- Knowledge base lookup across 200+ FAQ articles (a library to be written).
- Multilingual (6 langs, per §49).
- Ticket creation for unresolved (escalate to human within SLA).
- NPS survey post-resolution.

**Complexity.** 3 engineer-weeks + knowledge-base authoring.

**Cost savings per year.** At 1 000 DAU Y1 × 5 % / week support rate × 20-min avg resolution = 4 300 hours / yr. Of those, 70 % resolvable by AI = 3 000 hours × AED 150 / hr support staff cost = **AED 450 k / yr avoided hiring cost**.

**Risk profile.** Medium — bad support chat = churn. Guardrail: NPS ≤ 7 auto-escalates to human; any financial-transaction query auto-escalates.

---

## §2 Data pipeline autonomy

### 2.1 Auto-sync with DLD (hourly / daily)

**Human today.** None; DLD data is refreshed ad-hoc.

**Agent could.** Cron job at 03:00 AE-time nightly:
- Pull DLD public transactions since last successful sync.
- Upsert into `DlDTransaction` table.
- Recompute `DistrictSummary` aggregates.
- Emit a Slack / Telegram status to Zhan.

**Complexity.** 2 engineer-weeks (reuse of C1 in build plan).

**ROI.** Enables §66 Market Intelligence at automated quality. See §1.8 above.

### 2.2 Auto-update heatmaps

**Human today.** Heatmap tile generation is a manual script run.

**Agent could.** Triggered by 2.1 completion: regenerate district-level heatmap tiles (vector MBTiles). Deploy to CDN. Invalidate browser cache.

**Complexity.** 1 engineer-week.

**ROI.** Always-fresh heatmap = always-fresh broker argument ("the district moved 3 % this week"). Agent closing velocity improvement ~5 %.

### 2.3 Auto-detect new developments (satellite + web)

**Human today.** Dymo occasionally scrolls Bayut / LinkedIn for new developer launches.

**Agent could.** Two signal sources:
- **Satellite (§45).** Weekly differencing: parcel without construction → parcel with construction. Raise an "opportunity" flag for the acquisitions / Agency team.
- **Web crawl.** Daily fetch of Emaar / DAMAC / Aldar / Meraas press releases + RERA project registrations. Deduplicate. Alert agents.

**Complexity.** 4 engineer-weeks (satellite CV + web crawler).

**ROI.** First-mover advantage on listing new developments. A first-listed new Emaar project has ~10× higher click-through than a later-listed one. **AED 500 k – 2 M / yr in accelerated commissions** at Y2 scale.

### 2.4 Auto-translation pipeline

**Human today.** UI strings translated manually or on ad-hoc basis. Parcel descriptions in EN only.

**Agent could.** Covered in §1.6 above (content gen) and §49 Translation. Cron job nightly:
- Scan source strings for new / changed EN content.
- Translate to AR / RU / UK / SQ / FR via tiered model routing (Qwen for simple, Claude for nuanced).
- Load translations into i18n dictionaries / parcel description multi-language fields.
- Quality threshold gate: <0.8 BLEU vs. prior version triggers human review.

**Complexity.** 3 engineer-weeks.

**ROI.** See §1.6. Plus: all 6 languages becomes sustainable (today 1–2 languages practically; rest aspirational).

### 2.5 Auto-index plots when DDA adds new ones

**Human today.** DDA adds plots periodically (new subdivisions, new districts). ZAAHI plots are manually added.

**Agent could.** Weekly DDA district polling:
- Query DDA plots endpoint per district.
- Detect new plot numbers (not in `Parcel` table).
- Create skeleton `Parcel` records with affection-plan auto-fetch, no listing yet.
- Zero automatic pricing (respecting `CLAUDE.md` "Цена участка — только вручную").
- Generate a weekly "new plots found: 43 this week" report.

**Complexity.** 2 engineer-weeks.

**ROI.** Catalogue-growth autopilot. Goes from ~114 parcels to 1 000+ indexed over 6–12 months without founder time. Indirect SEO lift from 1 000 × indexable plot pages.

### 2.6 Auto-VAT / CT filings pipeline

**Human today.** Year 1 will have a bookkeeper + Big-4 quarterly review. Manual filings.

**Agent could.** Medium-term, post-Sovereign-Bank (§53):
- Pull consolidated ledger from Sovereign Bank (or interim Agency / Platform bookkeeping tool).
- Compute UAE VAT (5 % on relevant services) and CT (9 % above AED 375 k per entity) liability.
- Prepare FTA (Federal Tax Authority) filing drafts.
- Route for bookkeeper / tax advisor sign-off.
- Auto-file via FTA's eServices integration (if partnership).

**Complexity.** 6 engineer-weeks + partnership. Y2+.

**ROI.** Bookkeeping labour: AED 60–120 k / yr saved at steady state. Plus: reduced compliance risk (consistent filings).

**Risk profile.** High if fully automated. Recommend human sign-off step retained until 3 consecutive quarters of clean filings.

---

## §3 Business process autonomy

### 3.1 Self-service broker onboarding

**Human today.** Ambassador applies at `/join`, pays USDT, admin manually verifies and activates. (See §1.4 above.)

**Agent could** (extending §1.4 with fuller workflow):
- USDT verification (§1.4).
- RERA BRN verification (§1.4).
- Emirates ID auto-verified via UAE Pass (per sovereignty Phase 4.3.2).
- ZAAHI Broker Academy short-course completion (per §72 education expansion) required for activation.
- Tier certificate NFT minting on activation (per §72 NFT certificates).
- Welcome email + Calendly link to Dymo onboarding call (15-min optional).

**Complexity.** 4 engineer-weeks cumulative (builds on §1.4 + UAE Pass + Academy).

**ROI.** Founder time per ambassador: 60 min → 5 min = 55 min × 60 ambassadors Y1 = 55 hours × AED 300 / hr = **AED 16 k / yr**. More importantly: activation latency drops from 24 h to <5 min, improving first-share-rate by ~2×.

### 3.2 Auto-Trakheesi permits (API integration)

**Human today.** Each listing that is advertised in Dubai requires a Trakheesi permit from DET (Dubai Economy & Tourism). Currently manual — broker applies per listing via Dubai Pulse portal, copies permit number back to ZAAHI listing. ~10 minutes per listing.

**Agent could.** Direct API integration with Trakheesi:
- Broker creates listing.
- Agent POSTs to Trakheesi API with listing details (plot ref, price, broker BRN, agency TRN).
- Poll for permit number (typically issued within minutes).
- Attach to listing; display on listing card per DET regulation.

**Complexity.** 3 engineer-weeks + DET partnership.

**ROI.** 10 min × 260 listings / yr = 43 hours × AED 200 / hr = **AED 9 k / yr**. More important: full-compliance claim ("every ZAAHI listing is Trakheesi-permitted automatically") matches Bayut's "first platform fully DLD-compliant" positioning.

### 3.3 Auto-escrow routing (bank partnership)

**Human today.** Escrow manual — agent instructs buyer on bank wire to dev escrow account, tracks receipt via screenshot, updates Deal Room manually.

**Agent could** (per POST_MEETING_BUILD_PLAN A3 / B1 / C4):
- Bank partnership (ENBD / ADCB) provides webhook on deposit to ZAAHI escrow account.
- Webhook payload matched to Deal by reference code (buyer-specific).
- Deal Engine auto-advances state: `Deposit Pending → Deposit Received`.
- Agent + buyer notified.

**Complexity.** 12 weeks end-to-end (bank partnership + build + UAT). Covered in build plan.

**ROI.** Per-deal savings: ~2 hours avoided reconciliation × 12 deals Y1 = 24 hours × AED 300 = AED 7 k / yr. Scales: at 50+ deals Y3, AED 30 k / yr. More important: **zero human data-entry error** on escrow (a deal-ending failure mode today).

### 3.4 Auto-commission calculation and payout

**Human today.** `awardCommissions()` runs in-transaction (per `CLAUDE.md`). Commission ledger is machine-generated. Payout status is manually marked by admin.

**Agent could.** Extend existing engine:
- On ambassador passes AED 1 000 minimum payout threshold (per ambassador program rules), auto-queue payout.
- Selected payout method (bank / USDT / ZAH token) per ambassador preference.
- For bank: USD / AED transfer via Sovereign Bank or partner API.
- For USDT: programmatic send via treasury multisig (requires 2-of-3 founder approval sign-off — same UX as manual Safe transaction).
- Ledger auto-updates to PAID on confirmation.

**Complexity.** 4 engineer-weeks + multisig set-up (per sovereignty §3.3 Phase 3).

**ROI.** Admin time saved: 5 min × 60 ambassadors × monthly = 5 hours / mo × AED 300 = AED 18 k / yr. Plus: ambassador experience (instant payout vs. 30-day manual wait) = retention lift.

### 3.5 Auto-referral commission tracking and disbursement

**Human today.** Handled already by existing `Commission` ledger + `awardCommissions()`.

**Agent could** (incremental):
- 3-level downline walker (existing) + skip-inactive policy (existing per `CLAUDE.md`).
- Auto-email ambassador when commission booked.
- Monthly statement PDF auto-generated.
- Annual summary for tax filing.

**Complexity.** 1 engineer-week (cosmetic / reporting).

**ROI.** Trust / transparency multiplier. Ambassadors who see per-deal attribution become more active referrers. Quantitative lift ~5–10 % on downline activity.

### 3.6 Auto-quarterly dividend calculations

**Human today.** Year 1 Dymo + bookkeeper calculates quarterly profit distribution (70 % to Platform Dev Fund, 10 % each to Rudi / Dymo / Zhan per investor package).

**Agent could.** Quarterly cron (aligned with CT / VAT filing cadence):
- Pull Agency P&L from accounting.
- Compute net distributable profit after CT + reserves.
- Apply 70/10/10/10 split.
- Generate payout instructions for each shareholder.
- Route 70 % to Platform HoldCo (tax-deductible Service Fee invoice generated).
- Email each shareholder with statement + payment reference.

**Complexity.** 3 engineer-weeks post-Platform incorporation (depends on bookkeeping system integration).

**ROI.** Founder time: 4 hours / quarter saved = 16 hours / yr × AED 300 = AED 5 k / yr. Plus: fiduciary transparency ("Rudi can see the calculation in real-time").

---

## §4 Development autonomy

### 4.1 CI/CD deepening

**Current state.** Vercel auto-deploys `main`. GitHub Actions runs `pnpm build`.

**Proposed.**
- **Staging pipeline** — every PR gets a Vercel Preview deployment (already default). Enforce: smoke tests must pass on preview before merge.
- **Migration gating** — any PR touching `prisma/schema.prisma` requires a migration file + preview runs `prisma migrate deploy` against a scratch DB.
- **Rollback automation** — one-command `zaahi rollback <sha>` that reverts Vercel + (future) runs down-migration if needed. Covered in Master Tree §83 Blue-Green.

**Complexity.** 2 engineer-weeks.

**ROI.** Deployment confidence = velocity. Empirical: teams with robust CI/CD ship 2–3× more frequently. Incremental effect over Y1 = 100–200 additional PRs shipped.

### 4.2 Auto-dependency updates (Dependabot / Renovate)

Covered in MASTER_TREE_SAFETY_PROPOSALS.md §3.4. Same mechanism benefits autonomy.

**ROI.** Engineer time saved vs. manual updates: 2–4 hours / week × AED 300 = AED 30–60 k / yr.

### 4.3 Auto-security scans

Covered in Safety §3.4. `pnpm audit --prod` in CI. Weekly Snyk / Trivy report.

### 4.4 Auto-PR review via AI

**Human today.** Zhan reviews every PR (self-review when shipping directly). When Chief of Staff + second engineer are hired, peer review.

**Agent could.** Pre-human review pass by AI (Claude or GPT):
- Codebase context from repo.
- Checks: does the PR follow CLAUDE.md rules? (No raw SQL, no `prisma db push`, auth guard preserved, no PII in logs, UI style guide for new components.)
- Suggests improvements; flags violations.
- Outputs comment on PR.

**Complexity.** 2 engineer-weeks (agent + GitHub webhook + comment bot).

**ROI.** Second engineer productivity: AI catches ~30 % of issues before human review, cutting review cycles by ~40 %. At 5 engineers Y3 × 20 PRs / week = 100 PRs / week → saving 10 hours / week = AED 150 k / yr.

**Risk profile.** Low — AI review is advisory; human still approves merge.

### 4.5 Auto-documentation updates

**Human today.** `CLAUDE.md` + `DECISIONS.md` + this `docs/` tree are hand-maintained.

**Agent could.** Weekly: scan recent merges, propose updates to `DECISIONS.md` + `ABU_DHABI_MIGRATION.md` + other living docs. Propose as PR; human reviews merge.

**Complexity.** 3 engineer-weeks.

**ROI.** Documentation freshness: Master Tree + design docs are perpetually 0–7 days stale instead of 30–90 days. Compounds as codebase grows.

**Risk profile.** Low — doc updates are low-stakes; agent proposes, human merges.

### 4.6 Auto-testing from production data

**Human today.** Tests written manually. Smoke test checklist in `CLAUDE.md` §SMOKE TEST.

**Agent could.**
- Record real user sessions (session-replay tool like PostHog / Sentry Replay) anonymised.
- Replay against staging, detect regressions.
- Generate Playwright tests from most-common user flows (propose, don't auto-commit).

**Complexity.** 4 engineer-weeks + PostHog / Sentry Replay licence.

**ROI.** Test coverage grows with usage without engineer effort. QA time per release: 4 hours → 1 hour = 3 × 50 releases = 150 hours / yr × AED 200 = AED 30 k / yr. Plus: confidence (harder to measure, worth more).

---

## §5 Content autonomy

### 5.1 AI-generated property descriptions (6 → 60 languages)

Covered in §1.6 above. Incremental note: scaling to 60 languages is bounded by translation quality of target language pair, not by additional engineer cost.

### 5.2 AI-generated market reports (weekly / monthly)

**Human today.** No reports currently ship.

**Agent could.** Templated digest:
- Weekly email: "7-day market update" — 3 districts moving, 5 new listings, 1 closed deal highlight.
- Monthly PDF: "ZAAHI Monthly Insight" — district heatmap, top 10 plots, interest-rate context, Dymo's commentary (human-written 300 words), auto-generated rest.
- Quarterly investor-grade report: 20 pages, data-heavy, distribution to 100+ family offices via email.

**Complexity.** 4 engineer-weeks + Dymo's commentary (ongoing 1 hour / week).

**ROI.** Subscriber revenue: 100 subs × AED 500 / mo × 12 = AED 600 k / yr. Plus: SEO lift from publishing 52 weekly digests / yr. Plus: brand authority (replicates Property Finder / Bayut report cadence).

### 5.3 AI-generated neighbourhood guides

**Human today.** None.

**Agent could.** For each of Dubai's ~150 communities:
- Overview (schools, mosques, metro, parks, amenities).
- Price history (from §66).
- Famous landmarks (from public data).
- Video (from §5.4 below + Dymo's videographer).
- SEO-optimised long-form (2 000+ words).

**Complexity.** 3 engineer-weeks + content review.

**ROI.** SEO: 150 indexable neighbourhood pages × 10 long-tail keywords each = 1 500 new ranked keywords. Organic traffic lift over 6 months: estimate 30–50 % on `/neighbourhoods/*`.

### 5.4 AI-generated video scripts for videographer

**Human today.** Dymo's videographer receives ad-hoc briefs.

**Agent could.**
- For each new listing (§1.6): generate a 60-second cinematic voiceover script in 2–3 variations. Highlights (3D render → aerial → interior → call-to-action).
- Videographer records B-roll; the voiceover is AI-generated or read by videographer.
- Output: 60-second vertical reel + 15-second short + 60-second YouTube landscape.

**Complexity.** 2 engineer-weeks + collaboration with videographer on workflow.

**ROI.** Videographer capacity per listing: 4 hours → 1 hour on prep. At 40 listings / yr requiring video = 120 hours saved × AED 150 / hr = AED 18 k / yr. Plus: video quality consistency.

### 5.5 AI-generated social media posts

**Human today.** Dymo posts on LinkedIn ad-hoc.

**Agent could.** For each new listing / market update / achievement:
- LinkedIn post (Dymo voice).
- Instagram caption with 3–5 branded hashtags.
- Twitter / X post.
- Telegram channel post.

All drafts; Dymo approves with single "yes" per post.

**Complexity.** 2 engineer-weeks + tone calibration.

**ROI.** Posts shipped: 2 / week currently → 5 / week automated. LinkedIn followers: 3× growth rate over 12 months (empirical benchmark from similar B2B platforms doubling cadence).

---

## Summary — cumulative autonomy ROI

Labour hours saved per year at Y1 scale (~1 000 DAU, ~260 listings, ~60 ambassadors):

| Category | Hours / yr saved | AED / yr saved |
|---|---:|---:|
| Listing intake (§1.1) | 65–130 | 20–40 k |
| Pricing suggestion (§1.2) | Indirect | 1 600 k accelerated |
| Buyer qualification (§1.3) | 300–520 | 90–150 k direct + 300–1 000 k conversion lift |
| Broker vetting (§1.4) | 15 | 5 k |
| Lead routing (§1.5) | 260 | 75 k |
| Content / descriptions (§1.6) | 780 | 156 k |
| 3D generation (§1.7) | Indirect | 250 k (at scale) |
| Market intel agent (§1.8) | 0 | 600 k new revenue |
| Compliance monitor (§1.9) | Indirect | 100 k EV |
| Support bot (§1.10) | 3 000 | 450 k |
| Auto dependency mgmt (§4.2) | 100–200 | 30–60 k |
| Auto-PR review (§4.4) | 500 | 150 k |
| Auto-testing (§4.6) | 150 | 30 k |
| **Total quantifiable** | **~5 400 hrs** | **~AED 1.4–2.2 M / yr** |

Plus compound effects (subscription revenue from §5.2, SEO lift from §5.3, retention lift from faster activation) estimated **additional AED 1–2 M / yr** at Y2 scale.

**Net autonomy ROI at Y1:** AED ~1.5 M / yr cost savings + AED ~1 M / yr new revenue = **AED ~2.5 M / yr**. Against total autonomy engineering investment (~50 engineer-weeks × AED 15 k / week = AED 750 k), payback period = **3–4 months**.

---

## Integrated autonomy roadmap — 12 months

| Quarter | Autonomy shipping |
|---|---|
| **Q2 2026** | §1.4 Broker vetting (fast win). §1.10 Support bot v1. §4.2 Dependabot + `pnpm audit`. §5.5 Social post drafting. §4.5 Doc-maintenance bot. |
| **Q3 2026** | §1.1 Listing intake agent. §1.2 Pricing suggestion. §1.3 Buyer qualification enhanced. §1.6 Content gen 6-lang. §2.4 Auto-translation pipeline. §3.1 Self-service broker onboarding + UAE Pass. §3.2 Auto-Trakheesi. §4.1 CI/CD deepening. §4.4 AI PR review. |
| **Q4 2026** | §1.5 Lead routing. §1.8 Market intel nightly. §1.9 Compliance monitor. §2.1/2.2 DLD sync + heatmap. §2.3 Auto-detect new developments. §2.5 Auto-index plots. §5.1–5.5 Full content autonomy. §4.6 Auto-testing. |
| **Q1 2027** | §3.3 Auto-escrow routing (post-bank partnership). §3.4 Auto-commission payout (post-multisig). §3.5 Downline commission reporting. §1.7 3D building generation v1 (gated on §41). §3.6 Auto-dividend calc (post-Platform incorporation). |

---

## Priority ranking — Top 10 autonomy wins by ROI

1. **§1.10 Support chatbot** — AED 450 k / yr, 3 eng-weeks. Highest absolute ROI.
2. **§5.2 Market reports automation** — AED 600 k / yr new revenue. Covers autonomy investment in one quarter.
3. **§1.3 Buyer qualification agent** — AED 90–150 k direct + AED 300 k – 1 M conversion lift. Strategic Dymo-time relief.
4. **§1.6 Property descriptions 6-lang** — AED 156 k / yr + unlocks 6-language reality.
5. **§4.4 AI PR review** — AED 150 k / yr at Y3 scale, compounds with team growth.
6. **§1.5 Lead routing** — AED 75 k / yr, scales with agent hiring.
7. **§2.3 Auto-detect new developments** — AED 500 k – 2 M / yr in accelerated commissions.
8. **§1.2 Pricing suggestion** — indirect but large; shortens days-on-market by ~20 %.
9. **§4.2 Dependabot + auto scans** — AED 30–60 k / yr + security-hygiene. Cheapest to ship.
10. **§1.4 Broker vetting** — AED 5 k / yr but activation latency dropped; viral-loop unlock.

---

## Risk guardrails for autonomy

Three non-negotiable guardrails apply across every autonomy proposal:

1. **Founder authority on prices.** Automated pricing agents (§1.2) only *suggest*; they never write `currentValuation` per `CLAUDE.md` rule. This is a canonical constraint.
2. **Never delete parcels automatically.** Per `CLAUDE.md` §NEVER delete parcels — ever. Autonomy agents must never call `prisma.parcel.delete` regardless of other logic.
3. **Human-in-the-loop for high-stakes.** Any agent action above AED 10 k financial impact (commission payout, dividend distribution, price change, deal state change past `DEAL_ACCEPTED`) requires human sign-off in production. Lower-stakes actions can be fully autonomous.

These guardrails ensure autonomy speeds ZAAHI up without ever speeding it into a destructive action.

---

## Sources

- [Archibald / Cat Agent rules in CLAUDE.md §41](../../CLAUDE.md) — prompt boundaries and fraud-detection heuristics
- Master Tree v3 §41 AI System (Master, Cat, Mole, Falcon agents) — [canonical file](../architecture/MASTER_TREE_final.md)
- `docs/roadmap/POST_MEETING_BUILD_PLAN.md` A3 / B1 / C4 — bank partnership dependency
- `docs/vision/MASTER_TREE_SOVEREIGNTY_PROPOSALS.md` §4 — UAE Pass + passkey integration enabling self-service onboarding
- [Dubai Digital Authority iPaaS Developer Portal](https://developer.dubai.gov.ae/portal/) — for Trakheesi API partnership
- [UAE Pass SDK integration guide](https://docs.uaepass.ae/feature-guides/authentication/mobile-application/sdk-integration) — ambassador-onboarding automation

---

**End of MASTER_TREE_AUTONOMY_PROPOSALS.md.** For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com`.
