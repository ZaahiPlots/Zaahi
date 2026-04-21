# POST-MEETING BUILD PLAN — Top 5 × 3

**Document:** What to build after the Rudi Sunday 2026-04-19 Al Jurf meeting for maximum Agency revenue impact in 12 months.
**Prepared for:** Zhan (Founder/CEO/CTO), Dymo (Co-founder), Rudi (Investor, Board)
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Horizon:** 2026-04-20 → 2027-04-19 (52 weeks post-MOU; Day 1 = Mon Apr 20 2026 per corrected calendar)
**Classification:** CONFIDENTIAL

---

## Executive summary

Three lists of 5. For each item: **why critical · complexity · time · dependencies · risk if not built.** Read this straight through in 10 minutes; act from it for 52 weeks.

- **List A — Master Tree sections** that unlock the most Agency deal value.
- **List B — Competitive features** that defend against Huspy / Bayut / Property Finder / PRYPCO.
- **List C — Data integrations** that widen the data moat.

Ordering within each list is priority-ranked. Build top-of-list first.

---

## Legend

| Symbol | Meaning |
|:-:|---|
| 🟢 | Simple (<1 dev-week) |
| 🟡 | Medium (1–4 dev-weeks) |
| 🔴 | Complex (>4 dev-weeks, multi-stakeholder) |

---

## List A — Top 5 Master Tree sections that unlock the most Agency deals

Ranked by **marginal AED per deal × probability of closing a Dymo pipeline deal in next 12 months.**

### A1. §31 Deal Engine — DLD submission + state machine + escrow release path

**Why critical.** Every premium land plot deal we close today gets stuck at "Deposit Received → NOC → Transfer Fee → DLD Submission." The broker manually shepherds it across 4 systems (WhatsApp, email, bank portal, DLD trustee visit). Each stuck deal is AED 450 k–1.6 M of commission sitting in limbo. Shipping a clean Deal Engine state machine + DLD submission integration (even as a "Generate DLD-ready PDF package + e-track trustee visit") captures ~30 % of that friction.

**Technical complexity.** 🟡 Medium.
- State machine already scaffolded in Deal Room migration `20260409173345_deal_room`.
- Need: state transitions, document uploader per transition, DLD Form F generator (leverages Archibald), notification triggers at each state.
- DLD direct API is gated on DLD partnership (see List C). v1 = "DLD-ready package" not "DLD submit via API."

**Time estimate.** 3–4 weeks (1 engineer full-time, Zhan).

**Dependencies.**
- Notifications engine §47 (partial — needs SMS/email flow).
- Document storage (working, `data/` + Supabase storage fallback).
- Archibald document generation (LIVE for MOU).

**Risk if not built.** Every deal slowed by 10–20 days. Broker burnout. First-year commission target (AED 7.8 M) slips by 15–25 %. Competitor Allsopp / E&V close first because their back-office is battle-tested.

### A2. §58 Construction Pipeline — Feasibility Calculator v2 for off-plan developer deals

**Why critical.** Off-plan floor-level deals pay AED 1.2 M avg commission (vs. AED 450 k for land plots). Y1 target is 2 off-plan deals (AED 2.4 M of Agency's AED 7.8 M — 30 %). Feasibility Calc v1 is live; v2 needs:
- DDA affection-plan setback auto-apply (half done in `computeSetbackM`).
- Saleable ratio by land use (residential 75 %, commercial 85 %, mixed-use blended).
- Finance cost + timeline sensitivity toggles.
- Scenario save + share (so client can replay the meeting).

**Feasibility Calc v2 inputs:** plot area · GFA ratio · setbacks (from affection plan) · floor count · saleable ratio · build cost / sqft · sell price / sqft · finance cost · timeline (months).

**Feasibility Calc v2 outputs:** total cost · total revenue · gross margin · IRR · break-even floor count · ±20 % sensitivity band · PDF download.

**Technical complexity.** 🟡 Medium.
- Pure computation, no external API.
- UI is the work (glassmorphism, sliders, IRR chart).
- PDF export for client takeaway.

**Time estimate.** 2–3 weeks.

**Dependencies.** None hard. Leverages existing affection plan data on 114 parcels.

**Risk if not built.** Developer deal cycle drags 4–8 weeks longer. Competitor (consultant's Excel, or Emaar internal) closes first. AED 1.2 M commission per missed deal.

### A3. §22 Banks & Funds — Mortgage pre-approval widget (ENBD + ADCB pilot)

**Why critical.** Buyer conversion rises from ~20 % to ~50 % when a pre-approval number is visible *before* the plot inspection. This is Huspy's entire moat. For ZAAHI's buyer-side deals (every off-plan deal has a buyer needing a mortgage), a pre-approval widget directly on the plot page is a 2.5× conversion uplift. Pure revenue impact: more buyers qualified = more deals closed.

**Technical complexity.** 🔴 Complex (stakeholder risk, not code risk).
- **Partnership is the hard part.** Need an Emirates NBD or ADCB MOU signed for API access. Dymo has the relationships; timeline ~6–10 weeks to MOU.
- Code itself: simple widget (form → bank API → return pre-approval number).
- AML / KYC layer (§63) must be clean — do NOT log PII.

**Time estimate.** 10–16 weeks end-to-end (partnership + build + UAT).

**Dependencies.**
- Dymo → bank relationship outreach (start now).
- §63 Compliance KYC/AML outline (shared with Banking).
- §47 Notifications (bank-side approval confirmation).

**Risk if not built.** Huspy continues to eat the mortgage conversion layer. ZAAHI is positioned as "discovery only" — which is a much smaller TAM.

### A4. §66 Market Intelligence — DLD live sales overlay + plot-level price history

**Why critical.** Every buyer negotiation ends with "what did neighbours actually pay?" Today, Dymo manually pulls from Property Monitor + DLD public portals. Shipping a plot-level sales overlay (last 12 months of comps, price/sqft, sales velocity) **closes objections in 15 seconds instead of 2 hours of Excel**. Multiple deal cycles per month accelerate.

Also: this is the data moat. Every deal ZAAHI closes adds a data point the competition doesn't have.

**Technical complexity.** 🟡 Medium.
- DLD public transaction API exists (limited rate, JSON). Mirror it locally.
- Heatmap overlay UI — extend the existing DLD heatmap that's partially live.
- Plot → nearest-N-comps matching algorithm.

**Time estimate.** 3 weeks.

**Dependencies.** DLD public API access (no partnership required for public data tier).

**Risk if not built.** Competitor Bayut / Property Finder ship monthly reports — they become the default authority. ZAAHI's 114-parcel depth advantage is masked by their breadth advantage.

### A5. §18 Ambassador — downline dashboard + commission analytics + leaderboard

**Why critical.** Ambassador sign-ups = **subscription revenue without Agency deal work.** Every Gold ambassador (AED 5 k) is AED 5 000 cash and a multiplier on deal flow via their downline. Target 50 Gold + 10 Platinum in 12 months = AED 400 k subscription revenue + ~AED 10 M amplified deal flow via their referrals.

The engine is LIVE. What's missing: **dashboard polish that makes ambassadors brag about their earnings publicly.** Screenshots on LinkedIn = free user acquisition.

**Technical complexity.** 🟢 Simple.
- Downline tree visualisation (already partially done in `/ambassador`).
- Commission earnings per level, per status (PENDING / PAID / REVERSED).
- Leaderboard (top 10 ambassadors by downline revenue).
- Share-card generator ("I earned AED 12 K on ZAAHI last month").

**Time estimate.** 1 week.

**Dependencies.** None — fully internal.

**Risk if not built.** Ambassadors sign up, see a plain dashboard, don't brag, don't refer. Viral loop broken. AED 400 k subscription revenue halved.

---

## List B — Top 5 competitive features that kill competitors

Ranked by **how much of a competitor's distinct moat we erase.**

### B1. Bank mortgage widget (kills Huspy's USP on ZAAHI properties)

**Why critical.** Huspy's sole USP is mortgage convenience. The moment ZAAHI's plot pages display a pre-approval button that returns a number in 60 seconds, Huspy's distinctive advantage evaporates *on ZAAHI traffic*. They still have brand and scale — but their differentiation disappears from our surface.

**Technical complexity.** 🔴 Complex (same as A3 — partnership gated).

**Time estimate.** 10–16 weeks.

**Dependencies.** Bank MOU (Dymo).

**Risk if not built.** Huspy continues to siphon buyers who arrive at ZAAHI then bounce to Huspy for the mortgage step. Lost funnel conversion.

### B2. Plot-level 3D walkthrough in VR (kills Bayut / Property Finder's 2D lock-in)

**Why critical.** A buyer in Monaco using Apple Vision Pro can walk the proposed building on a Dubai plot. Nobody else in UAE ships this. Premium-plot buyers (AED 50 M+) are exactly the Apple Vision Pro demographic. This is the top-of-funnel brand moment that converts to "only ZAAHI can show me this."

**Technical complexity.** 🟡 Medium.
- Three.js + React Three Fiber already powers the 3D map.
- Apple Vision Pro native support via WebXR.
- Quality threshold: 60 FPS in Vision Pro, 30 FPS Meta Quest.

**Time estimate.** 3–4 weeks for v1 walkthrough (browser-based); +2 weeks for Vision Pro native mode.

**Dependencies.**
- Existing ZAAHI Signature geometry (reuse).
- Parcel-centric camera rigging.
- Apple Vision Pro test device (procurement: AED ~15 k).

**Risk if not built.** Premium HNWI demo falls flat against Emaar's in-person showroom. Deal advantage lost.

### B3. Ambassador tier-locked content (Gold gets affection-plan PDFs; Platinum gets founder line) — kills Allsopp / Better Homes training advantage

**Why critical.** Allsopp's moat is agent training. Better Homes' moat is property management scale. Neither has figured out how to turn external brokers into *paying affiliates*. ZAAHI already has the tier-subscription engine LIVE — just needs the content gating to bite.

Today: tier flags exist (Silver / Gold / Platinum) but gating of features is partial. Shipping hard gates (Gold = affection plans visible; Platinum = direct Dymo Calendly) makes the tiers non-commoditisable.

**Technical complexity.** 🟢 Simple.
- Middleware check on API routes (`getUserTier(req)`).
- UI conditional rendering based on tier.
- Upgrade CTA on blocked content.

**Time estimate.** 1 week.

**Dependencies.** None — fully internal.

**Risk if not built.** External brokers pay Silver (AED 1 k) and get everything Gold buyers get. Tier economics collapse.

### B4. Plot-level tokenisation pilot (neutralises PRYPCO's DLD exclusivity)

**Why critical.** PRYPCO owns tokenisation for *ready properties* with DLD. ZAAHI can occupy **tokenisation for land plots** — a parallel category PRYPCO doesn't serve. Shipping 1 tokenised plot pilot in DLD's Real Estate Sandbox gives us a press moment ("ZAAHI becomes the second DLD sandbox tokenisation platform, first for land plots").

**Technical complexity.** 🔴 Complex (regulatory + smart contract).
- Apply to DLD Real Estate Sandbox (~8 weeks).
- Smart contract on Polygon (architect with DIFC counsel).
- VARA compliance attestation.
- Primary issuance UI + KYC-gated buy flow.
- Manual secondary market v0 (no secondary trading in v1).

**Time estimate.** 16–24 weeks.

**Dependencies.**
- DLD sandbox acceptance (Dymo → DLD).
- Legal counsel (DIFC / ADGM — AED 50–150 k fees).
- VARA virtual asset attestation.

**Risk if not built.** PRYPCO expands from ready properties into plots (easy pivot). We lose the category before occupying it.

### B5. Multilingual SEO long-tail page generation — 1000 plot-detail pages with full schema markup

**Why critical.** Bayut / Property Finder beat us on SEO. But they index **buildings**, not **plots**. If every one of our 114 + 556 K PMTiles plots has a dedicated URL with schema.org markup (`RealEstateListing`, `Place`, `LocalBusiness`), we own Google for every long-tail plot query ("Dubai Hills plot 6457940 price", "Downtown Dubai commercial plot 2 BR GFA"). This is free customer acquisition forever.

**Technical complexity.** 🟡 Medium.
- Next.js 15 dynamic route per plot (already exists: `/parcels/[id]`).
- Schema.org JSON-LD injection.
- sitemap.xml generation (all 556 K plots).
- Hreflang tags for EN/AR/RU/UK/SQ/FR.
- OpenGraph cards with 3D render thumbnail.

**Time estimate.** 2 weeks.

**Dependencies.**
- Indexing budget (Google Search Console submission of 556 K URLs).
- Translation engine §49 (LIVE for UI; needs to cover plot pages).

**Risk if not built.** Bayut / PF continue to dominate Google. ZAAHI brand remains niche.

---

## List C — Top 5 data integrations that widen the moat

Ranked by **data uniqueness × deal-velocity impact.**

### C1. DLD Transaction API — live sales feed + plot comps

**Why critical.** DLD's public transaction data is the single most valuable data source in UAE real estate. Feeding it into the plot-detail page (last 12 months of comps within 1 km) makes every plot page a decision-ready product. This is the data flywheel: every deal our Agency closes, every DLD transaction feeds back into the platform, growing the comp library faster than any competitor.

**Technical complexity.** 🟡 Medium.
- DLD public API (rate-limited).
- Data ingestion worker (cron, nightly pull).
- Local Postgres mirror + full-text index.
- Plot → geospatial KNN on comp lookup.

**Time estimate.** 2–3 weeks.

**Dependencies.** DLD public API access (no partnership needed for public tier).

**Risk if not built.** Market Intelligence §66 remains shallow. Property Finder / Bayut own the "market data" narrative.

### C2. TAMM (Abu Dhabi) plot data — Abu Dhabi migration

**Why critical.** Abu Dhabi is 2× the addressable market of Dubai for long-term investors (Abu Dhabi oil-money + sovereign wealth). ZAAHI is Dubai-only today. Shipping Abu Dhabi PMTiles + TAMM plot data 2× the platform's addressable market in Q3 2026. (`ABU_DHABI_MIGRATION.md` already in repo — work started.)

**Technical complexity.** 🟡 Medium.
- PMTiles for Abu Dhabi districts (partly LIVE — `src/app/api/layers/abu-dhabi-*/*`).
- TAMM land plot API (partnership required).
- Multi-emirate UI (country → emirate → district picker).
- Currency / zoning / land use adaptation (same 9 categories map).

**Time estimate.** 6–8 weeks (including TAMM partnership).

**Dependencies.** TAMM partnership (Dymo → ADDA relationship). PMTiles already partly ingested.

**Risk if not built.** Competition (PRYPCO, Emaar, Aldar via Etihad Estate) occupy Abu Dhabi alone.

### C3. Commercial satellite imagery (Planet Labs or Maxar) — Falcon agent foundation

**Why critical.** Per Master Tree §45, Falcon needs satellite imagery for change detection, construction monitoring, thermal / NDVI. Today: zero satellite integration. Shipping a Planet Labs contract (AED ~60 k / yr for Dubai coverage) unlocks:
- **Construction progress verification** — for off-plan developer deals, "show me the live construction status" is a AED 400 k commission-preserving feature.
- **Change detection** — flag parcels with new construction started = new listings opportunities for Agency.
- **Thermal** — energy efficiency grade input for §65 ESG.

**Technical complexity.** 🟡 Medium.
- Planet / Maxar API integration.
- Image storage pipeline.
- Change-detection ML model v1 (classic CV diff, not neural).

**Time estimate.** 4–6 weeks (inc. contract negotiation).

**Dependencies.** Contract + budget (AED 60 k is within Agency Y1 cashflow).

**Risk if not built.** Falcon §41 remains aspirational. No construction verification = off-plan deal risk higher.

### C4. Bank mortgage API (ENBD or ADCB) — mortgage pre-approval

**Why critical.** Same as A3 / B1. Ships pre-approval widget. Every closed mortgage = ~AED 30 k bank origination fee + funnel conversion + Huspy's moat erased on ZAAHI traffic.

**Technical complexity.** 🔴 Complex (partnership gated).

**Time estimate.** 10–16 weeks.

**Dependencies.** Bank MOU.

**Risk if not built.** See A3.

### C5. RERA broker license verification API — real-time "verified broker" badge

**Why critical.** Every broker on ZAAHI claims to be RERA-licensed. Today we trust-on-faith. A live RERA API check (broker enters BRN, platform verifies against RERA DB in real time) gives:
- **Trust badge** on every broker profile (fraud prevention).
- **Compliance** for DDA requirements.
- **Competitive parity with Bayut** (who was "first platform fully DLD-compliant" — marketing coup).

**Technical complexity.** 🟡 Medium.
- RERA public verification page exists; we scrape initially, then seek formal API access.
- Nightly re-verification cron.
- Trust badge on broker profile + listing cards.

**Time estimate.** 2 weeks (v1 via scrape, v2 via partnership Q3 2026).

**Dependencies.** None for scrape-based v1. RERA partnership for v2.

**Risk if not built.** A single fraudulent listing (unverified broker, fake price) damages reputation long before competitors notice.

---

## Sequencing — 52-week calendar

Quarterly breakdown of what ships when.

### Q1 (weeks 1–12) — "Close the Agency's first-year pipeline"
- **Week 1–4:** A1 Deal Engine + A2 Feasibility Calc v2 — direct commission enablers.
- **Week 1–3:** A5 Ambassador dashboard polish — viral subscription moat (parallel, fast-ship).
- **Week 3–5:** C1 DLD Transaction API + A4 Market Intel — data moat.
- **Week 2–14:** C4 Bank partnership + A3 Mortgage widget — Huspy kill shot (partnership first).
- **Week 4–6:** C5 RERA verification + B3 Tier gating.

### Q2 (weeks 13–26) — "Expand to Abu Dhabi + defend against Huspy"
- **Week 13–20:** C2 Abu Dhabi / TAMM migration.
- **Week 13–16:** B5 SEO long-tail plot pages.
- **Week 15–22:** B2 VR walkthrough v1 (web) + Vision Pro native.
- **Week 17–22:** C3 Planet satellite contract + Falcon foundation.
- **Week 18–26:** A3 + B1 mortgage widget live (UAT + launch).

### Q3 (weeks 27–39) — "Tokenise + scale ambassadors"
- **Week 27–44:** B4 Plot tokenisation pilot (DLD sandbox + VARA + smart contract).
- **Week 27–32:** LeadingRE Global referral network application + onboarding.
- **Week 32–40:** Saudi plugin architecture (§24 plugin pattern, Riyadh PMTiles).
- **Week 36–39:** First DLD sandbox tokenised plot listing live.

### Q4 (weeks 40–52) — "Build the IPO story"
- **Week 40–48:** §66 Market Intelligence quarterly report v1.
- **Week 40–48:** §50 Data Centre 1 (Equinix Dubai) migration — first sovereign infra step.
- **Week 45–52:** Series A prep deck (Platform) + investor pipeline outreach.
- **Week 48–52:** Year-in-review — 50 Gold + 10 Platinum + 2 tokenised plots + 1 Abu Dhabi deal + AED 7.8 M+ Agency revenue booked.

---

## Risk register (highest → lowest)

| Risk | Severity | Likelihood | Mitigation |
|---|:-:|:-:|---|
| Bank partnership delayed (A3 / B1 / C4 stall) | H | M | Start outreach Week 1; pursue 3 banks in parallel (ENBD, ADCB, Mashreq). |
| DLD sandbox application rejected (B4 stall) | H | M | Apply Week 1; Dymo direct-line to DLD Smart Services. Backup: Propy-like title/escrow vertical integration. |
| Huspy launches listings portal (our differentiation erodes) | M | M | Partner Huspy defensively (A3/B1 embed widget); keep plot-level moat running ahead. |
| Allsopp copies ambassador tier model | M | M | Ship A5 fast + network effect scale before they can replicate (12-month window). |
| PRYPCO expands to tokenising plots (B4 collapsed) | M | L | Occupy plot-level tokenisation category before they notice (B4 Q3 shipment). |
| Founder bandwidth (Zhan codes; Dymo sells; who does partnerships?) | H | H | Hire Chief of Staff Week 4 post-Rudi. Partnership outreach is a full-time job. |
| Abu Dhabi TAMM partnership harder than Dubai DLD | M | M | Start conversations Week 1. v1 ships with public PMTiles + manual data entry as fallback. |
| Vercel sovereignty migration (E-block) delays | L | M | Tracked separately; not blocker for Y1 revenue. |
| VARA regulatory changes break tokenisation pilot | M | L | Stay in DLD sandbox — safe-harbour by design. |
| Bayut / PF counter-fund marketing blitz after our Series A | L | H | Year 1 pre-empts via SEO + ambassador network; Series A gives us our own ad budget. |

---

## Founder decisions needed (Rudi sign-off)

These are the architectural / budget calls Zhan + Dymo need from the Board post-MOU:

1. **Approve C3 Planet Labs satellite contract** (AED 60 k / yr) — Week 6.
2. **Approve hiring Chief of Staff** (AED 30 – 45 k / mo — Dubai market rate for senior ops lead; AED 360 – 540 k / yr) — Week 4. Original AED 20 k figure was below-market and set up bad-hire / fast-attrition risk.
3. **Approve AED 150 k legal budget** for B4 tokenisation DIFC / ADGM counsel — Week 10.
4. **Approve Apple Vision Pro procurement** (AED 15 k) for B2 — Week 15.
5. **Approve LeadingRE annual fee** (USD 5–25 k) for C (international referrals) — Week 20.
6. **Approve Saudi plugin expansion budget** (Q3 budget AED 300 k for translation / legal / market-entry) — Week 30.

Total Y1 optional-capex ask: **~AED 800 k – 1.2 M** against AED 7.8 M Agency revenue. 10–15 % reinvestment rate — well within the 70 % platform-fund flow.

---

## What we are NOT building (and why)

Explicitly de-scoped for Y1 to preserve focus:

- **Metaverse full world (§39)** — beyond 3D parcel view. Interesting but not revenue-adjacent in Y1. Shelve to Y2.
- **DAO Treasury (§56)** — no token launch Y1. Risk > reward pre-Series A.
- **Own blockchain nodes (§42 own-chain)** — dependency path, not revenue path. Q4 2026 placeholder, not Q1.
- **Robotics OS (§46)** — Y3+. Robotics Fund accumulates 10 % per deal; first deployment is 2028.
- **VR/AR full (§80) beyond walkthrough demo** — shelved to Y2.
- **Desktop Electron app (§79)** — no demand yet. Web + mobile covers 95 % of ICP.
- **Mobile native app (§78)** — Y2 priority. Y1 mobile is responsive web.
- **Open Zaahi creator economy (§43 Open Zaahi SDK)** — ambitious; Y3+.

Each of these is worth building eventually; none ships in Y1.

---

## Definition of Year-1 success

At Week 52 (Mon 2027-04-19, exactly 52 weeks after Day 1 Mon 2026-04-20), the following must be true:

- ✅ Agency: **AED 7.8 M+ revenue booked**, 12+ premium plot deals closed, 2+ off-plan floor deals.
- ✅ Platform: **50+ Gold + 10+ Platinum ambassadors**, AED 400 k+ subscription revenue.
- ✅ Bank: **1 mortgage partnership live** (ENBD or ADCB).
- ✅ Abu Dhabi: **first Abu Dhabi plot listed**, TAMM data partially integrated.
- ✅ DLD: **sandbox acceptance**, first tokenised plot listing.
- ✅ Data: **DLD transaction API live**, satellite imagery on ≥50 % of 114 parcels.
- ✅ SEO: **top-3 Google rank** on 10+ long-tail plot queries.
- ✅ Deal Engine: **100 % of live deals move through state machine** (no more manual shepherding).
- ✅ Master Tree: **~20 % sections LIVE** (up from 10.5 % today).

If any of these 9 boxes is unchecked at Week 52, the team rereads this document and re-plans.

---

## References

- `docs/architecture/MASTER_TREE_final.md` — full 85-section source of truth.
- `docs/vision/ZAAHI_VISION_CLARITY.md` — strategic narrative.
- `docs/research/COMPETITOR_DEEP_DIVE_2026.md` — competitor partnership / gap analysis.
- `docs/investor-package/EXECUTIVE_SUMMARY.md` — deal structure.
- `docs/investor-package/FINANCIAL_MODEL_V1.md` — financial targets.
- `CLAUDE.md` — engineering rules + UI style guide.
- `ABU_DHABI_MIGRATION.md` — Abu Dhabi migration state.

---

**End of POST_MEETING_BUILD_PLAN.md.** For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com`.
