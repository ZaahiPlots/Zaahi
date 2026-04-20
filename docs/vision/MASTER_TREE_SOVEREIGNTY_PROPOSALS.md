# MASTER TREE — SOVEREIGNTY PROPOSALS

**Document:** Sovereignty Improvement Proposals (advisory; does not amend the Master Tree)
**Prepared for:** Zhan (Founder/CEO/CTO), Dymo (Co-founder), Rudi (Investor/Board)
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Relation to Master Tree v3:** This document extends §50 Data Centres, §51 Sovereign Network, §52 Sovereignty Config, §41 AI (Own AI 2027 roadmap), §42 Blockchain (own validator nodes), and §53 Sovereign Bank. It does **not** modify them — existing sections stand as canonical.
**Priority rationale:** Sovereignty is ranked P1 in this batch because: (a) ZAAHI positions itself as UAE-first infrastructure, and trust of government + sovereign wealth counterparties depends on data residency claims; (b) the US administration has demonstrated willingness to use sanctions / CFIUS / cloud restrictions as foreign-policy levers, creating material business-continuity risk for a platform built on Vercel (US), Supabase (EU but US parent), and Anthropic API (US); (c) UAE's own sovereign stack (G42, Core42, Khazna, UAE Pass, DLD, TAMM) has matured materially in 2025–2026 — migration cost has dropped while strategic value has risen.
**Classification:** CONFIDENTIAL

---

## Executive summary

ZAAHI today depends on seven US-origin or US-parent vendors for its production stack: **Vercel (hosting), Supabase (database + auth, US-HQ parent), Anthropic (AI), OpenAI via Archibald fallback, GitHub (source control, Microsoft-owned), Stripe (future payments), and Namecheap (DNS, US-HQ).** Seven US dependencies is seven levers a hostile foreign-policy event could pull. The mitigation is **phased migration to UAE-sovereign or UAE-resident equivalents**, not a single overnight cut-over.

The Master Tree already names the destination (§52 Sovereignty Config: AWS → own servers Q3 2026, Infura → own nodes Q4 2026, OpenAI → own AI Q4 2027, Stripe → own bank Q2 2028). This document proposes the **intermediate steps** between today and those destinations — specifically the UAE-resident options that exist in 2026 and reduce US exposure without waiting for the "own everything" end-state.

Seven sovereignty domains are covered:

1. **Infrastructure sovereignty** — hosting, datacentres, network.
2. **Data sovereignty** — where our bytes live, who can subpoena them, replication.
3. **Payment sovereignty** — how money moves in and out.
4. **Identity sovereignty** — who says a user is who they say.
5. **AI sovereignty** — who owns the model that serves ZAAHI answers.
6. **Code sovereignty** — where our source is hosted, who can revoke it.
7. **Knowledge sovereignty** — IP, patents, trade secrets, defensive publication.

Each domain is structured: current dependency → risk → phased plan → cost → strategic importance.

---

## §1 Infrastructure sovereignty

### 1.1 Current dependency

- **Vercel** (hosting). Next.js 15 app auto-deploys from `main`; Vercel is a US Delaware C-corp with production infra spanning AWS / GCP / private datacentres. All HTTP traffic terminates at Vercel edge.
- **Supabase** (PostgreSQL + Storage + Auth). Frankfurt region (`eu-central-1`) — EU data residency, but Supabase Inc. is a US Delaware C-corp incorporated 2020, backed by US VCs (Felicis, Accel, Coatue). Parent can be compelled to disclose / disable accounts under US process.
- **Namecheap** (DNS for `zaahi.io`). US-HQ'd registrar.
- **GitHub Actions** (CI/CD, Vercel-mediated). Microsoft-owned, US.
- **Cloudflare** (CDN fallback on some static assets). US.

### 1.2 Risk

- **Geopolitical.** A US sanctions designation (unlikely for UAE-registered entity today, but non-zero tail risk if GCC posture shifts) suspends every one of the above simultaneously. Recovery: 30–90 days of new-vendor onboarding + DNS propagation + data migration = platform down for weeks.
- **Data residency for government counterparties.** DLD, RERA, TAMM, ADGM partnerships will ask "where does UAE citizen PII reside?" Frankfurt is acceptable under GDPR-adequacy but inferior to UAE-resident for a UAE sovereign counterparty negotiation. Property Finder's AED 170 M Mubadala round signalled that UAE state capital favours UAE-resident stacks.
- **Performance.** Round-trip Dubai → Frankfurt is ~120 ms. Dubai → Abu Dhabi G42 datacentre is <10 ms. Metaverse (§39) demands <30 ms for WebGL interactivity at scale.
- **Currency risk.** Vercel + Supabase + Anthropic all bill USD. AED / USD peg is stable at 3.67, but *any* US-resident invoice is a FinCEN reporting surface for >$10 k cumulative.

### 1.3 Phased plan

#### Phase 1 — UAE-resident cloud evaluation (Q3 2026, 2–4 weeks)

Three serious candidates for evaluation, in descending order of strategic fit:

1. **G42 Core42 / Khazna Data Centers** (Abu Dhabi, Ajman, Dubai). G42's 200 MW of operational capacity came online in 2026 under the Stargate UAE partnership with Microsoft + OpenAI + Oracle, targeting 1 GW at $10 B+ investment. Sovereign-by-design: "sovereign data never leaves UAE borders" is an explicit product claim. Core42 offers Kubernetes, bare metal, and sovereign Azure regions. **Strategic fit: highest** — G42 is Mubadala-linked, aligns with UAE sovereign AI positioning, gives ZAAHI a door into future G42 GPU capacity for Own AI (§41).
2. **du Datamena / Injazat** (Etisalat / e& group). Legacy UAE telco datacentres, fiber-primary, TIER III / IV certified. Lower sovereign-AI positioning than G42 but deeper physical presence (one datacentre per emirate). **Strategic fit: high** for non-AI workloads.
3. **Etisalat Cloud / Moro Hub** (Dubai). Dubai-operated, strong government-services lineage (Moro Hub is Dubai Electronic Security Center's approved Tier 4). **Strategic fit: high** for DLD / RERA integration negotiations.

Output of Phase 1: a three-vendor evaluation memo (one engineer × 2 weeks + founder meetings with G42 / du / Etisalat sales). No migration yet.

#### Phase 2 — UAE colocation for non-latency-critical workloads (Q4 2026 – Q1 2027, 8–12 weeks)

Move **backups, audit logs, archived transaction blockchain records, and read-only DLD / DDA data mirrors** to UAE-resident object storage (Khazna S3-compatible or Etisalat). Keep live app on Vercel for now — but reduce the "irrecoverable data in US" surface to zero. Cost: ~AED 3 k–8 k / month for the storage tier + nightly sync worker.

#### Phase 3 — Own hardware pilot at Equinix Dubai DX1 (Q3 2027 target per Master Tree §50)

Master Tree §50 specifies: "DC1 Equinix Dubai Q3 2026 (3 App Servers, 2 DB Servers, Cache+Backup, Blockchain Nodes ×2)." Adhere to that destination; this document adds the **pre-flight** — Phase 1 + 2 establish the supplier relationships, data-residency patterns, and monitoring discipline that make Phase 3 a clean cut-over instead of a scramble.

Hardware spec for DC1 (refining §50):

- 3× app servers: Dell PowerEdge R760 or equivalent, 2× Xeon Platinum, 512 GB RAM, 8× 3.84 TB NVMe, dual 25 GbE. ~AED 80 k each.
- 2× DB servers: Dell PowerEdge R760xa, 2× Xeon, 1 TB RAM, 16× 7.68 TB NVMe RAID-10, dual 100 GbE, streaming replication master ↔ replica. ~AED 140 k each.
- 2× blockchain validator nodes: mid-tier R660, 256 GB RAM, 2× 3.84 TB NVMe. ~AED 40 k each.
- Networking: 2× Arista / Cisco Nexus 10 Gbps switches, 1× firewall pair (Palo Alto or FortiGate). ~AED 100 k total.
- Rack + power: Equinix DX1 half-rack ~AED 6 k / month.
- 3-year refresh schedule. Total CapEx year 1 ~AED 600–800 k. OpEx ~AED 150 k / yr.

#### Phase 4 — Multi-country replication (2028)

DC2 Abu Dhabi or Bahrain (per §50). 60-second auto-failover per §52. Bahrain is attractive because it offers data-residency-in-GCC without being in UAE (regulatory diversification for the day a UAE authority disagrees with a specific deal).

#### Phase 5 — Own dark fibre backbone (2030+, ambitious)

Not a near-term move. Only relevant if ZAAHI is operating at scale across Dubai + Abu Dhabi + Riyadh + Manama + Doha and the inter-site traffic exceeds what carrier-grade MPLS / GCP interconnect can deliver cost-effectively. Reference architecture: Etisalat / du dark-fibre IRU leases — no need to dig trenches.

### 1.4 Cost implications

| Phase | Timeline | CapEx | OpEx / yr | Migration effort |
|---|---|---:|---:|---|
| 1 — UAE cloud evaluation | Q3 2026 | AED 0 | AED 20 k | 2 eng-weeks |
| 2 — Backup / mirror co-location | Q4 2026 | AED 15 k | AED 60–100 k | 6 eng-weeks |
| 3 — Equinix DX1 own hardware | Q3 2027 | AED 600–800 k | AED 150 k | 16 eng-weeks |
| 4 — DC2 Abu Dhabi / Bahrain | 2028 | AED 500 k | AED 120 k | 8 eng-weeks |
| 5 — Dark fibre IRU lease | 2030+ | AED 2–5 M | AED 400 k | 12 mo partnership |

Total 4-year sovereignty CapEx: **~AED 1.2–1.5 M**; OpEx steady-state ~AED 300 k / yr. Comparable to current Vercel + Supabase spend by Year 3 scale (projected ~AED 400–600 k / yr at Master Tree target of 50 K+ DAU).

### 1.5 Strategic importance: **CRITICAL**

Without UAE-resident infrastructure, ZAAHI cannot credibly hold government partnership conversations with DLD / RERA / TAMM / ADGM at scale. Every one of those counterparties will eventually ask "where does the data live?" and "EU-Frankfurt via US-HQ vendor" is a slower, weaker answer than "Abu Dhabi, G42 datacentre, sovereign cloud." Phase 1 + 2 cost almost nothing and give ZAAHI a yes-answer within 6 months.

---

## §2 Data sovereignty

### 2.1 Current dependency

- **Supabase Frankfurt** — primary OLTP Postgres. Auth tables (PII), Parcel tables (valuations, owner links), Deal tables (transaction data), Ambassador tables (commission ledger).
- **Anthropic API (US)** — every Archibald turn sends user prompt + relevant context to Claude Sonnet / Opus in US-hosted inference. Prompt content is logged on Anthropic side for 30 days by default (zero-retention tier available).
- **OpenAI API (US, fallback)** — currently unused but latent fallback path.
- **Vercel edge / function logs** — request logs (IP, user-agent, path) retained on Vercel.
- **PMTiles (public geographic data)** — cached on CDN edge, not PII, low risk.

### 2.2 Risk

- **Subpoena surface.** US legal process (e.g., CLOUD Act) can compel Supabase, Anthropic, Vercel to disclose user data — even data physically in Frankfurt — if the parent company is US-incorporated. This is not a theoretical attack surface; CLOUD Act subpoenas have issued against Microsoft, Google for EU-resident data.
- **Zero-retention discipline.** Anthropic offers a zero-retention tier but requires explicit opt-in via API header / enterprise agreement. If ZAAHI has not enabled this, every user prompt is a potential subpoena target.
- **AI training data leakage.** Default OpenAI consumer API retains prompts for training unless explicitly opted out. Anthropic default is *not* to train on API inputs, but this is a contract term that can change.
- **Frankfurt data residency sufficient for GDPR, insufficient for UAE PDPL "sensitive data" categories** — UAE PDPL Federal Decree-Law 45/2021 has transferred-data approval requirements that Frankfurt currently satisfies (UAE has adequacy reasoning), but for *DLD-shared government data* ZAAHI cannot host outside UAE.

### 2.3 Phased plan

#### Phase 1 — Anthropic enterprise zero-retention agreement (Week 1, <1 day of work)

Email Anthropic enterprise sales, sign zero-retention data processing agreement, confirm via API header test (`anthropic-beta: zero-retention-v1` or equivalent). Verify no prompt content logged. **Cost: free** for enterprise tier contracts. **Blocking for: PDPL sensitive-data handling.**

#### Phase 2 — Locally-hosted LLM for non-sensitive workloads (Q3 2026, 4 weeks)

Per `CLAUDE.md` the team already runs `qwen2.5-coder:7b` (code) and `qwen3:8b` (chat, multilingual) locally via Ollama. Elevate this from "dev utility" to production path for queries that don't require Claude's reasoning quality:

- Translation (§49) — Qwen 2.5 handles EN / AR / RU reliably for UI strings.
- Routine Archibald Q&A (Form F, Transfer Fee, Trakheesi) — lookup-style, no reasoning.
- Parcel description generation — templated with Qwen fill-in.

Keep Claude Sonnet / Opus for: fraud detection reasoning, complex deal-room mediation, investor reports.

Routing: a simple tier router in `src/lib/ai-router.ts` that selects by task complexity + sensitivity.

#### Phase 3 — Fine-tune UAE real estate LLM on proprietary data (Q1–Q2 2027, 12 weeks, gated on data volume)

Once ZAAHI has accumulated ≥5 000 closed-deal transcripts, ≥114 × 10 = 1 140 parcel Q&A pairs from Archibald, and ≥50 full MOU / SPA / POA document templates, fine-tune a 7B / 13B open-weights base (Qwen 2.5, Llama 3.3, or Mistral) on the corpus. Output: **ZAAHI-RE-v1** — our own UAE real estate expert model, runs on 1 × A100 80 GB, inference latency <500 ms.

This aligns with Master Tree §41 "Own AI 2027" but arrives as a fine-tuned variant rather than a from-scratch train.

#### Phase 4 — Own Arabic embedding model (Q4 2027, 8 weeks)

Commercial embedding models (OpenAI `text-embedding-3-large`, Cohere Multilingual) are trained predominantly on English corpora. UAE Arabic real estate vocabulary (عقار, مسطح الأرض, صك الملكية, بطاقة التعريف) performs poorly. Train a domain-specific embedding (sentence-transformer base + triplet loss on Arabic RE corpus) to outperform OpenAI on UAE-Arabic retrieval tasks.

#### Phase 5 — Own satellite imagery license (2028)

Master Tree §45 already names Planet Labs / Maxar / Airbus Pleiades / ICEYE as providers. Current state: zero integrated. Phase 5 is to contract directly with Planet (~AED 60 k / yr for Dubai coverage, ~AED 200 k / yr for UAE full) and Maxar for on-demand high-res. Owning the license (not re-licensing through a broker like Descartes Labs) means full data residency + no third-party usage restrictions on ZAAHI's products.

#### Phase 6 — Own smallsat (2030+, ambitious per Master Tree §45)

Partner with UAE Space Agency / MBRSC on a SpaceX rideshare launch. AED 40–80 M capital cost for a 50 kg optical imaging smallsat. Beyond this document's horizon; noted here to align with §45.

### 2.4 Cost implications

| Phase | Timeline | One-time | OpEx / yr | Effort |
|---|---|---:|---:|---|
| 1 — Anthropic zero-retention | Week 1 | 0 | 0 | 4 hours |
| 2 — Local LLM production routing | Q3 2026 | AED 5 k (1× workstation GPU) | AED 20 k | 4 eng-weeks |
| 3 — Fine-tune ZAAHI-RE-v1 | Q1 2027 | AED 80–120 k (GPU time, data labelling) | AED 60 k | 12 eng-weeks |
| 4 — Own Arabic embeddings | Q4 2027 | AED 30 k | AED 12 k | 8 eng-weeks |
| 5 — Planet Labs UAE license | 2028 | AED 10 k onboarding | AED 200–400 k | 4 eng-weeks |
| 6 — Own smallsat | 2030+ | AED 40–80 M | AED 2–3 M | 24-month program |

### 2.5 Strategic importance: **CRITICAL**

Phase 1 (zero-retention with Anthropic) is blocking for any PDPL-sensitive conversation the user has with Archibald. It costs nothing and takes a day — **this should ship this week, independently of anything else in this document.**

---

## §3 Payment sovereignty

### 3.1 Current dependency

- **Future Stripe** — not yet integrated. Master Tree §52 names "Stripe → own bank Q2 2028" as destination.
- **USDT TRC-20 via wallet `TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7`** — used for Ambassador lifetime-tier payments. This is a manual flow: user sends USDT, submits tx-hash, admin verifies. No automated gateway.
- **Manual bank transfers** — Agency deal commissions flow via Emirates NBD / ADCB agency account direct, outside any gateway.

### 3.2 Risk

- **Stripe US incorporation.** Once ZAAHI adds Stripe for subscription tier payments (Developer / Broker / Architect / Investor / Owner tiers per §54), we gain a US-compelled payment layer. Stripe has historically frozen funds for perceived AML / sanctions risk without notice; our USDT-TRC-20-to-Sajwani-family demographic overlap with PRYPCO could be misread by a Stripe risk algorithm.
- **Crypto custody.** The Ambassador wallet is a self-custodial TRON address — if the seed phrase is lost or compromised, all accrued USDT is irrecoverable. This is known; Zhan has the seed offline per usual practice, but a formal custody policy is not documented.
- **Currency mismatch.** Tier subscriptions priced in AED but accepted in USDT (1 AED ≈ 0.272 USDT at current peg). Exchange-rate slippage between purchase and on-chain confirmation ranges 0.5–2 %; nobody currently accounts for this in commission base calculation.

### 3.3 Phased plan

#### Phase 1 — UAE payment gateway (Q3 2026, 4–6 weeks)

Three mainstream UAE-resident options:

1. **Network International (post-Magnati merger, largest MENA processor)**. The October 2025 merger of Network International with Magnati created Network International LLC — the largest MENA payment processor spanning 50+ markets. N-Genius Online is their e-commerce gateway, AED / USD / EUR / GBP / SAR supported, PCI-DSS compliant, 3D Secure 2, Apple Pay, Google Pay. **Strategic fit: highest** — largest scale, local settlement, FAB-owned Magnati integration.
2. **Telr** (Dubai-based). Smaller, but Dubai-resident, local support, fast onboarding (~2 weeks for a registered LLC). Used by mid-market UAE e-commerce.
3. **PayTabs** (Saudi-built, MENA-operational). Strong if Saudi expansion arrives on schedule; weaker UAE-only.

Choose Network International for primary, Telr as secondary/fallback. Rate: ~1.8–2.5 % per transaction, better than Stripe international (2.9 % + 30 cents).

Integration: N-Genius redirect or direct-API. ~4 weeks of engineering.

#### Phase 2 — Direct bank integration (Q4 2026 – Q1 2027, 12 weeks, partnership-gated)

Once the Agency has meaningful deal volume (10+ closed plots / quarter), negotiate a direct bank API with Emirates NBD or ADCB Commercial Banking:

- ZAAHI holds an escrow-registered corporate account.
- Incoming buyer deposits land directly in the escrow account; bank sends webhook to ZAAHI Deal Room on receipt.
- Outgoing commission payouts to ambassadors via bank virtual-account API (same Emirates NBD or ADCB Business Direct).
- Completely bypasses Stripe / Network International for high-value deal flows.

This is the precursor to the "own bank 2028" Master Tree §53 destination — we prove the operational discipline with a bank partnership before we attempt our own license.

#### Phase 3 — Blockchain payment rail (ongoing, ZAAHI-owned)

Today: TRC-20 USDT for Ambassador tier. Expand:

- Add USDC on Polygon (Master Tree §42 primary chain) for deal-related escrow payments in tokenisation pilots (§35).
- Add native AED-pegged stablecoin *once one exists*; as of 2026-04 there is no production AED stablecoin, but VARA has signalled licensing paths. Monitor AE Coin (ADQ initiative), Adex / ADGM pilots.
- Self-custody upgrade: move from single-signature EOA to 3-of-5 multisig (Gnosis Safe) signed by Zhan / Dymo / Rudi / legal / ops. Eliminates single-point-of-failure risk on the AED 2 M + accumulating Ambassador treasury.

#### Phase 4 — Own settlement layer (2028+, ambitious; converges with Master Tree §53 Sovereign Bank)

Only practicable after Master Tree §53 UAE Central Bank License (2028 target). Not for this horizon.

### 3.4 Cost implications

| Phase | Timeline | One-time | OpEx / yr | Effort |
|---|---|---:|---:|---|
| 1 — Network International gateway | Q3 2026 | AED 5 k onboarding | Per-tx ~2.0 % | 4 eng-weeks |
| 2 — Direct bank integration | Q4 2026 | AED 20 k legal + integration | Per-tx <0.5 % | 12 eng-weeks + partnership |
| 3 — Multisig + Polygon USDC | Q4 2026 | AED 10 k legal + audit | ~AED 20 k / yr gas + custody | 3 eng-weeks |
| 4 — Own settlement | 2028+ | Part of §53 budget | — | — |

### 3.5 Strategic importance: **HIGH**

Payment sovereignty is less urgent than infrastructure or AI (Phase 1 of those is this month; Phase 1 of payment can wait for Q3 2026 when Tier subscriptions scale). **But the multisig upgrade (Phase 3) should happen before the Ambassador treasury crosses AED 500 k** — we are currently ~AED 50 k of accumulated subscription + commission, so this is ~3–6 months out.

---

## §4 Identity sovereignty

### 4.1 Current dependency

- **Supabase Auth** — email + password, session cookies, manual admin-approval gate (per `CLAUDE.md` security rules). Google OAuth wired but admin-approval still gates entry.
- **No MFA today.** No second factor, no TOTP, no passkeys.
- **No UAE Pass integration.** Identity is self-asserted (email + admin approves).

### 4.2 Risk

- **Government partnership blocker.** Every UAE government-facing service (DLD, RERA, TAMM, MOHRE) requires UAE Pass integration in 2026. Without it, ZAAHI cannot claim to be a UAE-sovereign platform, cannot sign MOUs at sovereign-counterparty level, and cannot offer e-signature on DIFC / ADGM-hosted contracts.
- **Phishing risk.** Password-only auth on an admin-approval portal is a weak trust anchor for AED 50 M+ plot deals. One broker's reused password + a phishing site = full takeover.
- **PDPL Article 5 (accurate data).** PDPL requires controllers to maintain accurate, up-to-date personal data. Self-asserted Emirates ID / passport without gov verification is legally thin.

### 4.3 Phased plan

#### Phase 1 — UAE Pass integration (Q2 2026, 4 weeks)

UAE Pass is the UAE national digital ID — Emirates citizens, residents, and visitors. Used by gov services (ICP, MOHRE, TAMM, DLD), banks (e-signing mortgage docs), and a growing list of private apps. Integration:

- Register ZAAHI as an SP in the UAE Pass developer portal.
- OAuth 2.0 / OpenID Connect flow — user clicks "Sign in with UAE Pass," is redirected to UAE Pass, approves, returns with verified Emirates ID + name + nationality + address claims.
- Integrated e-signature for MOU / SPA / POA — native UAE Pass digital-signing widget, legally binding per Federal Law 46/2021 Electronic Transactions.

UAE Pass SDK supports native Android / iOS; for Next.js web we use the REST API flow directly.

**Architectural fit:** add "Sign in with UAE Pass" as a *third* tab next to existing Sign In / Sign Up tabs on `/` (the auth page that is explicitly protected by `CLAUDE.md` security rules). The existing approval gate remains — UAE Pass auto-verifies identity, admin still approves platform access.

#### Phase 2 — Emirates ID digital verification (Q3 2026, 2 weeks)

For Ambassador tier sign-ups, parcel ownership verification, and high-value deal KYC, add Emirates ID live scan + biometric face match via ICP (Federal Authority for Identity, Citizenship, Customs & Port Security) API. UAE Pass Phase 1 gives us the EID number; Phase 2 adds the *live verification* on top.

#### Phase 3 — Passkeys / WebAuthn / FIDO2 (Q3 2026, 3 weeks)

By end-2025 nearly 70 % of users had at least one passkey registered on some service; 2026 is the tipping point for passwordless. Implement passkeys as **the default second factor** — or, where UAE Pass is used, as a replacement for the second trip through UAE Pass.

Architecture:
- `@simplewebauthn/server` or Supabase-compatible WebAuthn library.
- Registration: after first UAE Pass login, prompt the user to register a platform authenticator (Face ID, Touch ID, Windows Hello) or a roaming authenticator (YubiKey for admin roles).
- Login: UAE Pass for first login of the device; passkey for subsequent logins on that device.
- Recovery: UAE Pass always works as recovery path.

Enterprise best-practice per NIST SP 800-63-4 (July 2025 update): AAL2 requires phishing-resistant MFA. Syncable passkeys qualify. Apply "passkey-first" UX — make the passkey registration path the most visually prominent option post-UAE-Pass sign-in. eBay case study reported +102 % adoption from this UX change alone.

#### Phase 4 — Self-sovereign identity (DID + verifiable credentials, Q2 2027, exploratory)

Once the Master Tree §43 Open Zaahi ID (blockchain identity, `yourname.zaahi.eth`) is real, map UAE Pass-verified identity to a DID (did:zaahi:0x…) with verifiable credentials (RERA broker license, Emirates ID verification, Ambassador tier) issued as signed JWTs / VCs that can be revoked. Positions ZAAHI for the next generation of cross-border identity (W3C VC standard is converging; EU Digital Identity Wallet arrives 2026–2027).

#### Phase 5 — Own identity provider (2028+, post-Sovereign-Bank)

Once ZAAHI has a UAE Central Bank license (§53), ZAAHI can issue its own EID-linked identity under a FinTech license. At that point, ZAAHI-issued identity is as valid as any UAE bank's customer ID for KYC-sharing purposes. Far horizon.

### 4.4 Cost implications

| Phase | Timeline | One-time | OpEx / yr | Effort |
|---|---|---:|---:|---|
| 1 — UAE Pass integration | Q2 2026 | AED 5–15 k partnership fee | AED 0 (free tier) | 4 eng-weeks |
| 2 — Emirates ID verify | Q3 2026 | Per-verification ~AED 5–10 | scaling with volume | 2 eng-weeks |
| 3 — Passkeys | Q3 2026 | AED 0 | AED 0 | 3 eng-weeks |
| 4 — DID + VC | Q2 2027 | AED 40 k legal + smart contracts | AED 15 k gas | 10 eng-weeks |
| 5 — Own IdP | 2028+ | Bundled with §53 | — | — |

### 4.5 Strategic importance: **CRITICAL**

Phase 1 (UAE Pass) is the single most revenue-unlocking sovereignty move. **No gov counterparty conversation (DLD, RERA, TAMM, ADGM) can formally MOU a platform without UAE Pass.** Phase 3 (passkeys) is cheap, table-stakes security hygiene. Ship both in Q2–Q3 2026.

---

## §5 AI sovereignty

### 5.1 Current dependency

- **Anthropic Claude Opus 4.6 (Master), Claude Sonnet 4.6 (Cat / Mole / Falcon)** per `CLAUDE.md`. US-incorporated provider.
- **Local Ollama models** (`qwen2.5-coder:7b`, `qwen3:8b`) for dev utility. Not in production path.
- **No fine-tuned model** specific to UAE real estate.
- **No backup AI provider** — if Anthropic API is down or restricted, Archibald goes silent.

### 5.2 Risk

- **Single-provider concentration.** Anthropic outage or access restriction = Archibald silence = platform functionality degraded by ~40 % (Archibald is on every page, drives qualification, fraud detection, document generation).
- **Training-data jurisdiction.** Claude's training corpus and model weights are US-residency. For UAE gov partnerships, "your AI thinks in US" is a subtle but real negotiating weakness.
- **Cost scaling.** Anthropic Opus at ~$15 / million output tokens. At 50 K DAU × average 3 Archibald turns × 1 k tokens = 150 M tokens / day ≈ $2 250 / day ≈ $820 K / yr. Own model infra runs ~$60–120 K / yr for same throughput.
- **Model deprecation risk.** Anthropic discontinues older models on ~12-month cycle. Our production prompts tuned for Sonnet 4.6 may behave differently on Sonnet 5.0. Migration cost recurs.

### 5.3 Phased plan

#### Phase 1 — Anthropic zero-retention + Mistral fallback (Q3 2026, 2 weeks)

(Phase 1 already described in §2.3.1 — Anthropic zero-retention.)

Add **Mistral** (French-incorporated, EU-resident inference) as a secondary provider. Mistral Large 2 / Small 3 is a credible Claude Sonnet replacement for many Archibald tasks (Arabic is middling; French + English + Russian + Ukrainian are strong). Writing a provider-abstraction layer (`src/lib/ai-provider.ts` with Anthropic / Mistral / local-Ollama backends) is a 1-week task and pays off every future migration.

Why Mistral: EU jurisdiction is the nearest non-US major AI jurisdiction, EU AI Act compliance regime is more mature than any other, and Mistral's French commercial stance is explicitly pro-sovereignty.

#### Phase 2 — Local LLM production path (Q3 2026, 4 weeks, same as §2.3.2)

Route 40–60 % of traffic (simple Q&A, translation, template generation) to locally-hosted Qwen / Llama. Keep Claude for reasoning-heavy.

#### Phase 3 — Fine-tune ZAAHI-RE-v1 (Q1–Q2 2027, 12 weeks, same as §2.3.3)

Our own UAE real estate LLM on 7B / 13B open-weights base.

#### Phase 4 — Own embedding models (Q4 2027, 8 weeks, same as §2.3.4)

Arabic RE-specialised embedding model.

#### Phase 5 — Train from scratch (2029+, very ambitious)

Training a foundation model from scratch currently requires AED ~40–80 M capital (GPU-time + data labelling + research team). This is a non-starter for ZAAHI until Platform Series B (AED 300 M+ raise) or until G42 makes training-compute available to UAE tech companies at subsidised rate (rumoured but not confirmed as of 2026-04).

Alternative path: **partner with G42 or TII** (Technology Innovation Institute, Abu Dhabi, makers of Falcon LLM). TII released Falcon 180B openly; later Falcon-Mamba, Falcon3. Partnering with TII to fine-tune Falcon on ZAAHI RE corpus could achieve "own model" status at 10 % of the cost of from-scratch training.

### 5.4 Cost implications

| Phase | Timeline | One-time | OpEx / yr | Effort |
|---|---|---:|---:|---|
| 1 — Zero-retention + Mistral fallback | Q3 2026 | 0 | AED 40–80 k inference | 2 eng-weeks |
| 2 — Local LLM production | Q3 2026 | AED 5 k | AED 20 k | 4 eng-weeks |
| 3 — Fine-tune ZAAHI-RE-v1 | Q1 2027 | AED 80–120 k | AED 60 k | 12 eng-weeks |
| 4 — Own Arabic embeddings | Q4 2027 | AED 30 k | AED 12 k | 8 eng-weeks |
| 5 — From-scratch (via TII partnership) | 2029+ | AED 5–10 M partnership | AED 1–2 M | Multi-year |

### 5.5 Strategic importance: **HIGH**

Phase 1 (zero-retention + Mistral fallback) is a 2-week project that removes the single-provider risk for the cost of adding an API key. Phase 3 (ZAAHI-RE-v1) is the sovereignty moment — once we have our own model, every competitor trying to license Claude starts paying Anthropic; we do not.

---

## §6 Code sovereignty

### 6.1 Current dependency

- **GitHub** (`ZaahiPlots/Zaahi`, private) — Microsoft-owned (US), subject to DMCA, CFIUS, sanctions.
- **GitHub Actions** — CI runs on GitHub-hosted runners (US / EU).
- **pnpm / npm registry** (npmjs.com, US) — every `pnpm install` downloads from US-hosted mirrors.
- **Docker Hub / container registries** — if used, US-hosted.

### 6.2 Risk

- **Repository takedown.** A DMCA complaint (or a sanctions listing, or an export-controls designation) can disable a GitHub repository within 48 hours. Recovery = losing git history on the primary remote, rebuilding from local clones.
- **Source-code confidentiality.** GitHub is a highly hardened target, but US legal process can compel Microsoft to disclose private repo contents. This is not hypothetical — the DMCA takedown of youtube-dl (Oct 2020) demonstrated the process.
- **Supply-chain attack.** Every `pnpm install` is trust in the npm registry + ~400 transitive dependencies. A compromised npm package (like event-stream 2018, ua-parser-js 2021, node-ipc 2022) can ship malicious code through our CI.

### 6.3 Phased plan

#### Phase 1 — Self-hosted Gitea mirror (Q3 2026, 1 week)

Stand up Gitea (or Forgejo, the Codeberg fork) on a UAE VM (cheap — AED 100 / month from du or Etisalat). Configure `origin` = GitHub (primary push target), `uae-mirror` = Gitea (automatic mirror via GitHub Actions post-push). Zero workflow change for the dev team; instantly gains a UAE-resident authoritative backup.

If GitHub goes dark, switch `origin` = Gitea, keep shipping.

#### Phase 2 — Dual-primary Git hosting (Q4 2026, 2 weeks)

Move beyond mirror to dual-primary: Gitea as the primary development remote, GitHub as the publishing mirror (for open-source contributions and visibility). All PRs reviewed on Gitea. CI runs on UAE-resident self-hosted Gitea Actions (or Forgejo Actions, or a fresh Jenkins — many options).

Cost: +AED 400 / month for a stronger VM to run the CI runner.

#### Phase 3 — Private npm registry / package proxy (Q4 2026, 2 weeks)

Set up Verdaccio or Sonatype Nexus as a private npm registry that proxies npmjs.com, caches packages locally, and can host internal `@zaahi/` scoped packages. Benefits:
- Builds survive npm registry outage (caches all used versions).
- Compromised-package incidents (bad publish) can be scanned / quarantined before production install.
- `pnpm install` performance improves 2–4× on UAE VMs (Dubai ↔ Dubai instead of Dubai ↔ US East Coast).

#### Phase 4 — Own distributed VCS (ambitious, non-urgent)

Git is already distributed — this is where the "own DVCS" framing usually collapses. What is actually meaningful is **owning the hosting authoritative layer**, which Phase 1–3 accomplishes. No further action needed until ZAAHI exceeds 100 engineers (a long way off).

### 6.4 Cost implications

| Phase | Timeline | One-time | OpEx / yr | Effort |
|---|---|---:|---:|---|
| 1 — Gitea UAE mirror | Q3 2026 | AED 2 k setup | AED 1 200 | 1 eng-week |
| 2 — Dual-primary + CI migration | Q4 2026 | AED 5 k | AED 5 000 | 2 eng-weeks |
| 3 — Private npm registry | Q4 2026 | AED 2 k | AED 1 200 | 2 eng-weeks |
| 4 — Own DVCS | N/A | N/A | N/A | Not warranted |

Total CapEx: ~AED 9 k. Total OpEx: ~AED 7 k / yr. Lowest-cost sovereignty domain by far.

### 6.5 Strategic importance: **MEDIUM**

Code sovereignty rarely fails gracefully — it fails in the middle of a production incident. The mitigation cost is trivial (AED 9 k one-time, AED 7 k / yr) and the recovery-from-GitHub-disable value is enormous. **Recommend shipping Phase 1–3 by end of Q4 2026.**

---

## §7 Knowledge sovereignty

### 7.1 Current dependency

- **Master Tree v3** — owned, under CLAUDE.md repo — no patent, no trademark, no defensive publication registered.
- **ZAAHI Signature 3D algorithm** (podium / body / crown + `scaleRingFromCentroid` + `computeSetbackM`) — proprietary implementation, no patent filed, no trade-secret marking.
- **DLD heatmap overlay** — derived from public DLD data but with proprietary enrichment — no IP strategy.
- **Archibald UAE real estate knowledge base** — proprietary curated content, no copyright registration, no defensive publication.
- **ZAAHI brand marks** — website logo, gold palette, Georgia serif + glass UI — no trademark registration visible in repo.

### 7.2 Risk

- **Competitor replication with IP cover.** A well-funded competitor (Property Finder with its $835 M cash, Bayut with Dubizzle's Saudi expansion) could reverse-engineer the 3D ZAAHI Signature engine and ship a competing product within 6–9 engineer-months. Without patent or defensive publication, ZAAHI has no legal recourse.
- **Trademark squatting.** If a third party registers "ZAAHI" / "Zaahi" as trademarks in UAE Class 36 (real estate), Class 9 (software), Class 42 (SaaS) before ZAAHI does, the founders must either license from the squatter or rebrand.
- **Trade-secret leakage.** Contractors, future employees, ambassadors see parts of the architecture. No NDA framework visible in the repo.
- **Loss of research docs.** This very directory (`docs/`) contains months of strategic thinking. A repo loss (see §6 risks) without IP registration means the research is irrecoverable even if the code is rebuilt.

### 7.3 Phased plan

#### Phase 1 — Trademark registration (Q2 2026, 3 months wall-clock, low effort)

File "ZAAHI" / "Zaahi" trademarks with UAE Ministry of Economy across classes:
- **Class 9** — software / SaaS.
- **Class 36** — real estate services, insurance, financial.
- **Class 41** — education (for the Ambassador / Education section).
- **Class 42** — technology services, SaaS hosting.

Via a UAE IP counsel (AED 20–40 k total fees across 4 classes, 3-month processing). Also file in ADGM and DIFC where they have separate IP regimes.

Parallel: WIPO Madrid Protocol filing for international coverage (US, EU, UK, KSA, India) — AED 40–80 k.

#### Phase 2 — Defensive publication of ZAAHI Signature (Q3 2026, 2 weeks)

Rather than patent (expensive, slow — 3+ years, AED 100 k+ per jurisdiction), file a defensive publication in the IP.com / Research Disclosure database. Defensive publications are low-cost (~AED 3–5 k per disclosure), fast (weeks), and establish prior art that blocks competitors from patenting the same technique.

Publish the following as disclosures:
- "Podium / Body / Crown 3D massing algorithm using scaleRingFromCentroid and inset ring by meters" — the geometric technique.
- "Real estate plot graph with 14-participant edges and blockchain audit trail" — the data architecture.
- "Affection-plan setback defaults by land-use category for UAE DDA parcels" — the default mapping table.

#### Phase 3 — Patent strategy for core moat (Q4 2026 – Q2 2027, optional, selective)

Patents are expensive and slow, but a single UAE patent + PCT filing on the ZAAHI Signature algorithm could be worth AED 10–50 M at acquisition. Filter candidates:

- ✅ Patentable: ZAAHI Signature geometric 3D method (novel, non-obvious, concrete algorithm).
- ❌ Not patentable: Master Tree architecture (too abstract, not a method), tier-subscription model (business method, UAE patent office weak on business methods).

Recommendation: file one PCT patent on ZAAHI Signature (AED 120–200 k including US, EU, UAE national phases).

#### Phase 4 — Trade-secret discipline (Q2 2026, 1 month, process + docs)

Establish formal trade-secret policy:
- Clean-desk review of what is trade secret (DLD heatmap algorithm, fraud-detection rules, pricing recommendation inputs, Archibald training data).
- NDA template for all new contractors / employees (AED 500 standard form from UAE counsel).
- Access-control audit: who has read access to `src/`, `data/`, `docs/` today and why.
- Exit interviews + access revocation checklist.

#### Phase 5 — Copyright registration (Q3 2026, 1 week, cheap)

UAE copyright is automatic under Berne Convention, but registering with UAE Ministry of Economy produces a certificate useful in enforcement. Register:
- All docs in `docs/investor-package/`.
- `docs/architecture/MASTER_TREE_final.md`.
- `docs/vision/ZAAHI_VISION_CLARITY.md` and the 4 other vision docs.
- Website content (home page, parcel pages, branded copy).

Cost: AED 300–600 per registration, bundle for ~AED 3 k total.

### 7.4 Cost implications

| Phase | Timeline | One-time | OpEx / yr | Effort |
|---|---|---:|---:|---|
| 1 — Trademark (UAE + WIPO) | Q2 2026 | AED 60–120 k | AED 10 k renewal cycle | Founder time + counsel |
| 2 — Defensive publication | Q3 2026 | AED 10 k | AED 0 | 2 eng-weeks |
| 3 — Patent (1 PCT) | Q4 2026 – Q2 2027 | AED 120–200 k | AED 15 k maintenance | Counsel + founder |
| 4 — Trade-secret policy + NDA | Q2 2026 | AED 5 k | AED 2 k | 1 founder-week |
| 5 — Copyright registration | Q3 2026 | AED 3 k | AED 0 | 1 eng-day |

Total Knowledge Sovereignty 24-month budget: **AED 200–340 k**.

### 7.5 Strategic importance: **HIGH**

Phase 1 + 2 + 4 + 5 total ~AED 80 k and ~4 weeks of focused work. They convert the current fragile IP position (nothing registered, nothing marked, nothing defensible) into a credible IP portfolio that adds 5–10 % to the Platform IPO valuation purely by existence. **Ship Phase 1 (trademarks) this quarter — even 3-month processing time means we lose 3 months of priority every month we wait.**

---

## Sovereignty roadmap — integrated 24-month view

| Quarter | Sovereignty moves shipping |
|---|---|
| **Q2 2026** | Anthropic zero-retention (§2.1 · 1 day). UAE Pass integration Phase 1 (§4.1 · 4 weeks). Trademark filings UAE + WIPO (§7.1 · 3 months). Trade-secret policy + NDA template (§7.4). Agency multisig treasury (§3.3 Phase 3 start). |
| **Q3 2026** | Mistral fallback provider (§5.1 · 2 weeks). Gitea UAE mirror (§6.1 · 1 week). Local LLM production routing (§2.3.2 · 4 weeks). UAE cloud vendor evaluation (§1.3 Phase 1 · 2 weeks). Network International gateway (§3.3 Phase 1 · 4 weeks). Emirates ID verify (§4.3 Phase 2). Passkeys (§4.3 Phase 3). Defensive publication (§7.3 Phase 2). Copyright registration (§7.5). |
| **Q4 2026** | UAE colocation for backups (§1.3 Phase 2 · 8 weeks). Dual-primary Git + Gitea CI (§6.3 Phase 2). Private npm registry (§6.3 Phase 3). Direct bank integration start (§3.3 Phase 2 partnership). Patent PCT filing begins (§7.3 Phase 3). |
| **Q1 2027** | Fine-tune ZAAHI-RE-v1 (§5.3 Phase 3 + §2.3.3 · 12 weeks). Direct bank integration completes. USDC on Polygon for tokenisation escrow. |
| **Q2 2027** | DID + VC exploratory (§4.3 Phase 4). Patent PCT national phase entry. |
| **Q3 2027** | Equinix DX1 own hardware migration (Master Tree §50 destination, aligned). |
| **Q4 2027** | Own Arabic embeddings (§5.3 Phase 4 + §2.3.4). |
| **2028** | DC2 Abu Dhabi / Bahrain. Planet Labs UAE license. Sovereign Bank application under §53. |
| **2029+** | TII partnership for foundation-model training. Own smallsat partnership. |
| **2030+** | Own dark fibre (if warranted). Own identity provider (post-§53). |

Total 24-month sovereignty CapEx: **~AED 1.5–2.2 M**. Total 24-month OpEx steady-state: **~AED 400–600 k / yr**. Comparable to current SaaS vendor spend by Year 3 scale.

---

## Priority ranking — sovereignty moves by strategic importance

Ranked P0 / P1 / P2 / P3, in execution order:

| Priority | Item | Effort | Why |
|:-:|---|---|---|
| **P0** | Anthropic zero-retention DPA | 4 hours | Blocks PDPL-sensitive Archibald use; free; today. |
| **P0** | UAE Pass integration | 4 weeks | Blocks DLD / RERA / TAMM partnership conversations. |
| **P0** | Trademark registration UAE + WIPO | 3 months wall-clock | Every month of delay is a month of squatter risk. |
| **P1** | Gitea UAE mirror + GitHub backup | 1 week | Cheapest-per-risk move in the entire document. |
| **P1** | Passkeys / WebAuthn | 3 weeks | Table-stakes security hygiene, deflects account takeover. |
| **P1** | Mistral fallback AI provider | 2 weeks | Removes single-provider concentration risk. |
| **P1** | Defensive publication of ZAAHI Signature | 2 weeks | Blocks competitor IP claims on our own algorithm. |
| **P2** | UAE cloud vendor evaluation | 2 weeks | Prep work for Q3 2027 Equinix migration. |
| **P2** | Network International payment gateway | 4 weeks | Prep work for tier-subscription scaling. |
| **P2** | Local LLM production routing | 4 weeks | Cost savings + partial sovereignty; not blocking. |
| **P2** | Emirates ID live verification | 2 weeks | Partnership-unlock for bank + gov integrations. |
| **P2** | Copyright registration | 1 eng-day | Cheap insurance. |
| **P2** | Multisig treasury (Ambassador + Agency funds) | 3 eng-weeks | Eliminates single-SPOF on custody. |
| **P3** | Patent PCT filing (ZAAHI Signature) | 6 months | Nice-to-have; large cost; only if Platform Series A closes. |
| **P3** | Fine-tune ZAAHI-RE-v1 | 12 weeks | High-value but gated on data volume — wait until 2027. |
| **P3** | DID + VC self-sovereign identity | 10 weeks | Future-positioning; no near-term revenue impact. |
| **P3** | DC2 Abu Dhabi / Bahrain | 2028 | Per Master Tree §50; gated on DC1 completing first. |
| **P3** | Own satellite / dark fibre / from-scratch model | 2029+ | Aligns with Master Tree; not actionable in 24-month horizon. |

---

## Sources

- [G42 Stargate UAE + 200 MW operational 2026 + Digital Embassies](https://www.g42.ai/resources/news/g42-introduces-digital-embassies-and-greenshield-make-ai-sovereignty-portable)
- [Microsoft + G42 200 MW UAE datacentre expansion via Khazna](https://news.microsoft.com/source/emea/2025/11/microsoft-and-g42-accelerate-uaes-digital-future-with-major-data-centre-expansion/)
- [UAE Pass SDK integration guide](https://docs.uaepass.ae/feature-guides/authentication/mobile-application/sdk-integration)
- [UAE Pass e-signature integration for real estate](https://www.esignglobal.com/blog/uae-pass-digital-identity-integrated-esignature-api)
- [Dubai Digital Authority iPaaS Developer Portal](https://developer.dubai.gov.ae/portal/)
- [UAE PDPL Federal Decree-Law 45/2021 overview](https://securiti.ai/uae-personal-data-protection-law/)
- [ADGM Data Protection Regulations 2021](https://assets.adgm.com/download/assets/ADGM+Data+Protection+Regulations+2021+Updated.pdf/146aa34858b011efb99a36e29b0f3a63)
- [Network International + Magnati merger (October 2025)](https://en.wikipedia.org/wiki/Network_International)
- [N-Genius Online payment gateway](https://www.network.ae/en/merchant-solutions/ecommerce-payments/n-genius-online)
- [FIDO Alliance Passkeys](https://fidoalliance.org/passkeys/)
- [Passkeys at Scale enterprise playbook 2026](https://securityboulevard.com/2026/03/passkeys-at-scale-the-complete-enterprise-deployment-playbook-2026/)
- [GCC Sovereign Cloud and Data Residency Guide](https://makitsol.com/gcc-sovereign-cloud-and-data-residency-guide/)

---

**End of MASTER_TREE_SOVEREIGNTY_PROPOSALS.md.** For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com`.
