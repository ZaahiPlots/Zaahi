# ZAAHI Investor Demo Script — 2026-04-17

Prepared: 2026-04-16 evening
Duration target: 10–15 minutes (incl. Q&A buffer)
Audience: Single investor (details unknown to preparer — founder to personalize live)
Presenter: Zhan (founder / CEO / CTO)
Production URL: https://www.zaahi.io

Source audits this script is built on:
- `docs/audit/PRE_DEMO_AUDIT_2026_04_16.md` (branch `audit/pre-demo-2026-04-16`, commit `cda3089`) — 2 original BLOCKERS, demo-journey status table, workarounds.
- `docs/audit/POST_MIGRATION_VERIFY_2026_04_16.md` (branch `audit/post-migration-verify`) — Phase 1 migration verified **APPLIED** via Supabase SQL Editor. 5 new tables + 11 User columns live. Original BLOCKER #1 resolved.
- `prisma/migrations/manual/20260416_geometry_misalignment_fix/README.md` (branch `fix/geometry-misalignment`) — only plot `1010469` (Dubai Islands) confirmed misaligned and blocked pending PDF. Plots `5912323` / `6117209` / `6117231` / `6817016` all **VERIFIED_CORRECT** against affection-plan PDFs.
- `docs/research/PARKED_PROJECTS.md` — Wall + Archibald unified system paused pending UAE Advertiser Permit legal review; do NOT promise it.
- `CLAUDE.md` — UI style guide, layer defaults (ZAAHI Plots ON, everything else OFF), ambassador tiers, 2% service fee.

---

## Current state snapshot (as of 2026-04-16 evening)

| Check | Status |
|---|---|
| Phase 1 migration on prod | **APPLIED** (via Supabase SQL Editor; `_prisma_migrations` bookkeeping INSERT still pending per §4 of POST_MIGRATION_VERIFY) |
| `ANTHROPIC_API_KEY` in Vercel prod | **MUST VERIFY** (see pre-demo checklist below) |
| npm run build | PASS on `audit/pre-demo-2026-04-16` |
| Production HTTP probes (`/`, `/parcels/map`, `/join`, `/dashboard`, `/api/me`) | All 200 / 401 as expected |
| Parcels in DB | 114 total (111 LISTED, 3 VACANT) — all Dubai |
| Users in DB | 1 (pre-launch, gated) |
| Layers default state | Only ZAAHI Plots ON. DDA / Communities / Roads / etc. OFF by default. **Do NOT toggle DDA Land Plots during demo** (3D duplication risk). |

---

## Pre-demo checklist (run **in order** — 60 minutes before the meeting)

Tick each box before moving to the next. Total time: ~20 minutes of focused work.

**T-60 min — environment**
- [ ] Close Slack, Telegram, WhatsApp desktop, any notification source
- [ ] Disable macOS/Windows OS notifications for the next 2 hours (Focus / Do Not Disturb)
- [ ] Restart Chrome (or Firefox) to a clean process — no background tabs
- [ ] Open https://www.zaahi.io in **one** tab, sign in as founder (`zhanrysbayev@gmail.com`)
- [ ] Run an internet speed test — need <50 ms latency and >20 Mbps down. If not: switch to ethernet / hotspot.

**T-45 min — verify BLOCKERS are resolved**
- [ ] Open https://www.zaahi.io/dashboard → Overview renders with real profile data (not "loading…" forever). If 500 → STOP, the `_prisma_migrations` INSERT may also be missing somewhere else; fall back to showing only `/parcels/map` and `/join`.
- [ ] Open Archibald chat widget (cat icon on `/parcels/map`). Send one test message ("hello" is fine). Wait for a real reply. **If you see "⚠️ Archibald is sleeping" → `ANTHROPIC_API_KEY` is not live on Vercel prod.** Open Vercel → Settings → Env Variables → paste real key → trigger redeploy → wait 2 min → retry. Do NOT demo Archibald live until this works.

**T-30 min — pre-stage the demo state**
- [ ] Navigate to `/parcels/map`. Default map center should already be Dubai. Manually pan to **Business Bay / Meydan area** (lat ≈ 25.18, lon ≈ 55.32). Keep altitude high — don't zoom past street level.
- [ ] Click plot **6117231** (Meydan / Bu Kadra, tilted rectangle). SidePanel should open. Click the ♡ heart icon — watch for it to fill. Refresh the page and confirm the heart is still filled (DB write verified).
- [ ] Click plot **5912323** (Al Furjan, reference plot). Click ♡ again.
- [ ] Close the SidePanel. Zoom back out to Dubai overview.
- [ ] Open `/join` in a second tab. Confirm Silver / Gold / Platinum cards render cleanly with USDT prices. Close the tab — keep it ready but not visible.

**T-15 min — warm production cache**
- [ ] From the demo laptop, issue three anonymous GETs (open in new incognito tab, then close):
  - https://www.zaahi.io/
  - https://www.zaahi.io/parcels/map
  - https://www.zaahi.io/join
  - This shaves first-hit latency from ~6 s cold to <1 s warm (per POST_MIGRATION_VERIFY §1).
- [ ] Back to the original signed-in tab. Leave it on `/parcels/map`, Business Bay view.

**T-5 min — final sanity**
- [ ] Check the URL bar reads `https://www.zaahi.io/parcels/map` (not `localhost`, not a preview deploy).
- [ ] Hide the browser bookmarks bar, extensions tray, any developer-tool panels.
- [ ] Full-screen (F11 / ⌘+Ctrl+F) for the demo — kills OS chrome and looks premium.
- [ ] Deep breath. One-sentence opening line ready: **"ZAAHI is the first land-intelligence OS for the UAE — you click a plot, you see what can be built, what it costs to build, and what it's worth."**

---

## Demo flow (4 acts, ~12 minutes)

### Act 1 — Opening (2 min): "What ZAAHI is"

**Screen:** Landing page `https://www.zaahi.io` (briefly) → click into `/parcels/map` signed in.

**Narrative:**
> "Dubai has 50,000+ land plots. Today, a developer or investor sifts through PDFs, scattered brokers, DLD portal, and affection-plan archives to answer one question: *what can I build on this piece of land, and will it make money?* We built ZAAHI to answer that in 30 seconds. Let me show you."

**What to do on screen:**
1. Land on `/parcels/map` already in Business Bay view (pre-staged).
2. Don't touch anything for 3 seconds — let the 3D buildings render. This is the "wow" moment.
3. Gentle orbit with mouse (no WASD — drone mode is OFF by default per `CLAUDE.md`; don't toggle live).
4. Point to the glassmorphism HeaderBar and SidePanel → "this is the ZAAHI Signature aesthetic — Apple-quality glassmorphism over the city."

**What NOT to say:**
- Do NOT name competitors by name. If anything, say "land is whitespace — the Property Finders and Bayuts of the world are indexing finished apartments, not developable plots."
- Do NOT say "we have X users" — see Act 4 below for the pivot.

---

### Act 2 — The Data (4 min): "Real plots, real affection plans, real math"

**Screen:** `/parcels/map`, clicking pre-verified plots.

**Narrative:**
> "Every plot you see is backed by the real DDA affection plan — the legal document that defines what you can build. No synthesized geometry, no sample data. Let me show you three."

**Plot 1 — Al Furjan `5912323`** (reference plot, pixel-accurate geometry).
- Click it. SidePanel opens.
- Point to: plot number, district, area in sqft, land use badge (Residential = yellow per `CLAUDE.md`).
- Point to the 3D model: "This is our Signature 3D — podium, body, crown layers computed from floor count. Setbacks are pulled from the affection plan directly. You can see the ground around the building — that's the real setback, not decorative."

**Plot 2 — Meydan / Bu Kadra `6117231`** (tilted rectangle, 24.6° CCW, pixel-extracted from the Meydan affection plan PDF).
- Click it. SidePanel opens.
- "Notice this one is tilted. That's because the real plot is tilted — we extracted the polygon from the actual affection plan PDF, calibrated to the local UTM grid. Your competitors show rectangles pulled from Google Maps. We show you the legal boundary."
- Show the filled ♡ — "I pre-saved this to my shortlist. That's our favorite feature — shipped today, in fact."

**Plot 3 — Bu Kadra `6117209`** (pentagon, 5 vertices).
- Click it. SidePanel opens.
- "This one isn't a rectangle at all — it's a pentagon. Real land isn't rectangular, and ZAAHI handles that natively."

**Safe plots verified in the geometry audit** (pick any 2–3 from this list — all pixel-extracted from PDFs or affection plans):

| Plot # | District | Why it's safe |
|---|---|---|
| 5912323 | Al Furjan | Clean axis-aligned rectangle, Nominatim confirmed "Jebel Ali 1 / Al Furjan" |
| 6117209 | Bu Kadra (Meydan) | Pentagon, 5 vertices, area matches declared to 0.2% |
| 6117231 | Bu Kadra (Meydan Horizon) | Tilted rectangle, pixel-extracted from MEYDAN AFFECTION PLAN.pdf |
| 6817016 | JVC / Al Barsha South 4 | Pixel-extracted from Trakhees site plan, exact 1700 m² area |

**Plots to AVOID clicking during the demo (not in the tour list):**

| Plot # | District | Reason |
|---|---|---|
| 1010469 | Dubai Islands (Nakhlat Deira) | **Confirmed misaligned.** Synthesized rectangle, source PDF `DIA-RE-0167` not in repo. Visible misalignment of ~3 km. |
| 3260899 | Jaddaf Waterfront | Founder-flagged as wrong polygon shape (unverified by geometry audit — assume unsafe). |
| 6457961 | Majan | Founder-flagged as needing alignment. |
| 6241067 | Warsan Fourth | Founder-flagged as misplaced. (Note: this contradicts an earlier audit that marked it safe — defer to founder's latest flag to be safe.) |
| 6854566 | Dubai Production City Hospital | Renders as single building; founder wanted multi-building but no source geometry — leave untouched per `CLAUDE.md` SESSION STATUS 2026-04-15. |

**If the investor spontaneously zooms to any of the "AVOID" plots**, see Emergency Handling section below.

---

### Act 3 — Intelligence (4 min): "Calculator + Archibald"

**Screen:** Still `/parcels/map`, SidePanel open on plot `6117231`.

**Narrative:**
> "Seeing a plot is step one. The real question is: *what's it worth to build on it?* That's where our feasibility calculator and AI assistant come in."

**Calculator v5.0 demo (2 min):**
1. Click the Feasibility Calculator button (in the SidePanel or floating action).
2. Calculator modal opens with three tabs: **Build-to-Sell**, **Build-to-Rent**, **Joint Venture**. (Confirmed working in PRE_DEMO_AUDIT, `FeasibilityCalculator.tsx:617–621`.)
3. Walk through Build-to-Sell first — show GFA, construction cost, sale price, profit. Point to the live update as you slide inputs.
4. Switch to Build-to-Rent — show yield %, payback period, 10-year NPV.
5. Switch to JV — show the developer-landowner split, upside share, minimum guarantee.
6. "Three modes, one plot, three exit strategies — this is the thinking every landowner and developer does on a napkin. We ran it in the cloud, server-side, in fils for precision."

**Archibald demo (2 min)** — ONLY if the T-45 warm-up confirmed the API key is live.

1. Close the calculator. Click the cat icon (Archibald) in the bottom-right.
2. Type a **safe question** from the approved list below. Do NOT freelance — the model can say anything, and we have no PR team to manage a screenshot.
3. Wait for the reply. Point to the glassmorphism chat window.
4. "Archibald is our land-knowledge assistant. He's tuned on UAE land-use policy, DDA affection-plan concepts, and plot-level economics. He doesn't give legal advice, but he can explain what a setback is, or whether a residential plot can host a mixed-use project."

**Safe Archibald questions (pre-approved, low-risk outputs):**
- "What's the difference between a podium and a tower setback in Dubai?"
- "How is GFA calculated from an affection plan?"
- "What does 'Mixed Use' mean in a DDA land-use category?"
- "What's a typical floor-to-floor height for a residential building in the UAE?"

**Questions to AVOID asking live:**
- Anything about pricing, ROI, or specific market forecasts (legal risk).
- Anything about a specific plot's buyability, legality, or investment quality (unlicensed advice).
- Anything about competitor platforms.
- Anything that could generate a screenshot-worthy hallucination.

**If Archibald doesn't answer in 5 seconds** — see Emergency Handling.

---

### Act 4 — Business Model (3 min): "How we monetize"

**Screen:** Open the second tab (pre-staged) → `/join`.

**Narrative:**
> "Now: how we make money. Two revenue streams, both live today."

**Stream 1 — Transaction fee (90 seconds):**
- "When a plot sells on ZAAHI, we take 2% of the deal value as a service fee." (Per `CLAUDE.md` ambassador section.)
- "On a typical 50M AED plot — that's 1M AED. After ambassador commissions, we retain ~78%."
- "Pipeline: 10 deals in conversation, target first close Q3 2026."

**Stream 2 — Ambassador membership (90 seconds):**
- Screen: `/join` page. Three glassmorphism tier cards — Silver (1K AED), Gold (5K AED, marked "MOST POPULAR"), Platinum (15K AED).
- "Lifetime membership, one-time payment, USDT on TRON. Three tiers unlock three different commission rates on a 3-level downline."
- "The investor-relevant number: we've priced the program to bootstrap our distribution. Every ambassador is a paid evangelist in their network. USDT so the funds land instantly, no banking friction."
- Hover over the Gold card — "Gold is our sweet spot — 10% L1 commission, priority access to new plots, site-plan PDFs. Designed for serious real-estate brokers."

**Don't click the Gold "Select Plan" button live** — the USDT payment modal is wired but the actual tx-hash submission flow hasn't been stress-tested with an investor watching. The card renders is the demo; the signup is for after the meeting.

---

## Answers to likely investor questions

### "How many users do you have?"
**Founder-delivered answer:**
> "We're in invitation-only closed beta. We're gating access while we validate our first cohort of listings with DLD. Each listing is verified against the real affection plan before it goes live — so we scale listing-quality-first, user-count-second. Once the DLD validation pipeline is formalized, we open up."

**What NOT to do:**
- Do NOT open `/admin/ambassadors` — it will show an empty list (PRE_DEMO_AUDIT W1: User count = 1 in prod DB).
- Do NOT open `/dashboard` → Notifications / Deals / Documents — all empty states, look pre-launch.

### "How does the revenue model work?"
> "Two streams. One: 2% service fee on every transaction closed on the platform — industry-standard, but we're taking it on land specifically, where the gross ticket is 10-100× apartment deals. Two: lifetime ambassador memberships — Silver, Gold, Platinum, priced 1K to 15K AED, one-time USDT payment. They earn a 3-level commission override on deals sourced through their network."

### "What's your tech moat?"
> "Three things. One: we have the only plot-level 3D engine in the UAE — custom Three.js, with per-plot setbacks from real affection plans, not marketing renders. Two: we have a feasibility calculator that runs three exit strategies — build-to-sell, build-to-rent, JV — in one click, server-side, in fils precision. Three: Archibald, our land-knowledge AI, tuned specifically on UAE planning vocabulary. No comp does all three."

### "Who are your competitors?"
> "Bayut and Property Finder are the big names, but they index finished apartments — ready properties, not developable land. Our whitespace is plot-level intelligence. Globally the closest analogue is LoopNet in the US — but pure-play land intelligence doesn't exist there either. We're creating the category."

### "When do you get to revenue?"
> "Pre-revenue today. Pipeline: 10 deals in conversation. First-close target Q3 2026. Ambassador membership revenue starts Q2 2026 as the /join page goes public-marketed post-demo. The platform is already transactional — we just haven't opened the faucet."

### "Is the AI just a GPT wrapper?"
> "Archibald runs on Claude, prompted against UAE-specific land-planning knowledge and our own plot data. It doesn't give legal or investment advice — it explains concepts. Architecture is sovereignty-ready: we can swap providers or self-host without code changes. Avoiding wrapper-risk by design."

### "What legal / regulatory risk do you carry?"
> "Three areas we're actively managing. One: UAE Advertiser Permit — new 2026 enforcement under Federal Decree-Law 55/2023. Our user-generated content features (what we're calling the 'Wall' internally) are paused pending legal counsel sign-off. Two: DLD listing validation — every plot on the platform is verified against the real affection plan before listing. Three: PDPL compliance — standard under Supabase Frankfurt region with RLS on every table. We're not taking shortcuts; we'd rather launch the right feature a month later than defend the wrong one in court." (Per `PARKED_PROJECTS.md`.)

### "What do you need from me?"
**FOUNDER: customize live based on the investor.** Do NOT recite a number you haven't aligned with Dymo. If pressed: "We're finalizing our round structure this week — can I send you the updated one-pager tonight with specifics?"

### "What could go wrong?"
**Be transparent — this builds trust faster than dodging:**
> "Three real risks. One: bus factor — I built most of this myself; we're bringing on Dymo as co-founder and hiring an architect this quarter. Two: regulatory pacing — the Advertiser Permit guidance is still evolving; we're conservative on UGC rollout. Three: data-quality scale — going from 114 plots to 10,000 means we need a data ops function, not just me manually pixel-extracting from PDFs. That's part of the use of funds."

### "Why you? Why now?"
> "I've been in UAE real estate for 17 years, full-stack engineering for the last decade. The tooling gap for land has been visible to me since 2018, and every year someone in our network asks me to 'just build a quick plot lookup.' In 2026 the stars aligned: DLD data is more openly available, 3D in the browser is production-grade, LLMs are good enough to handle planning vocabulary, and Dubai is hitting escape velocity on land supply. I'd rather be two years early than two weeks late."

---

## Emergency handling

### If Archibald doesn't respond within 5 seconds
**Say:** "Archibald's thinking — sometimes the first question of the session is a cold start. Let me show you something else while he catches up." **Do:** close the chat widget, navigate to `/dashboard`, show the Overview card (which hydrates from `/api/me` and should work). Come back to Archibald later if time allows; otherwise skip silently.

### If `/dashboard` shows 500 or blank
**Say:** "This is the dashboard we shipped literally today — let me show you the map instead, which is the primary experience." **Do:** navigate back to `/parcels/map`. Do not acknowledge the error further.

### If a plot shows wrong geometry (misalignment, weird polygon, missing 3D)
**Say nothing about the error.** Close the SidePanel. Pan to a different area (away from the problem plot). If the investor points at it directly: "Great catch — plot data is a continuous process. We refresh from DDA nightly, and a few edge cases are still in our cleanup queue. Let me show you one we've fully validated." → navigate to 5912323 Al Furjan.

### If the DDA Land Plots 3D duplication becomes visible
This only triggers if someone toggles the "DDA Land Plots" layer in the Layers panel (default OFF per `CLAUDE.md` and PRE_DEMO_AUDIT §Known Issues). **Do NOT open the Layers panel during the demo.** If investor asks to see it: open it, show the hierarchy (countries → categories → layers), point to the lock badges on premium layers, close it without toggling DDA Land Plots.

### If Archibald gives a weird / hallucinated / long answer
**Close the widget immediately.** Say: "He sometimes gets chatty — let me show you the calculator, which is more deterministic anyway." Navigate to the Calculator.

### If internet drops
**Say:** "One moment — let me share my screen from a local backup instead." **Do:** have a local screenshot folder pre-loaded with screens of `/parcels/map` (3D view), SidePanel, Calculator, `/join`. Walk through them verbally. Do NOT apologize more than once. Keep moving.

### If the investor asks to try the platform themselves mid-demo
**Say:** "Absolutely — let me send you a signed-in session tonight so you can explore. The public flow still has the DLD gate. Can I grab your email?" **Do NOT** hand over the laptop mid-demo. Too many live-click risks (favoriting breaks visually on slow DB writes, Archibald can hallucinate, layer toggles can expose the duplication bug).

### If a Russian-language comment flashes briefly in devtools / source view
Per PRE_DEMO_AUDIT I4: there are Russian comments in `src/app/parcels/map/page.tsx:189,2075,2999-3001` — but they're **in source code**, not in the rendered UI. The investor would have to right-click → View Page Source → Ctrl-F for Cyrillic to see them. Essentially zero risk. If asked: "Comments from early-stage development. The product UI is English-only."

---

## Features to AVOID clicking live (no matter what)

Per combined audit findings:

| Feature | Location | Why to avoid |
|---|---|---|
| **DDA Land Plots** layer toggle | Layers panel | 3D duplication bug. Layer is OFF by default; do NOT turn ON live. |
| **Start Negotiation → Submit Offer** | Deal flow on SidePanel | Email/SMS notification chain unverified end-to-end. |
| **Add Plot** flow | `/parcels/new` | Not on standard demo path; full end-to-end untested. |
| **Select Plan / USDT modal submit** on `/join` | Tier cards | Payment submission not stress-tested with investor watching. Show the cards, don't submit. |
| **Admin panel** (`/admin/ambassadors`) | Role-gated | Empty state + admin UI is not a pitch asset. |
| **Drone mode (WASD / Space / Shift)** | Map button (drone icon) | Default OFF per CLAUDE.md. Toggling ON during demo = cursor captures, right-click weirdness, easy to look broken. Keep map navigation on default mouse-drag. |
| **Audio button** | HeaderBar | Audio files in `public/audio/` are 0-byte placeholders per CLAUDE.md SESSION STATUS 2026-04-15. Button will fail silently but may show visual glitch. |
| **Dubai Islands region** | Map | Plot 1010469 is misaligned ~3 km. Keep camera out of the Deira / Nakhlat Deira area entirely. |
| **Clicking a plot at <100 m zoom** | Map | Z-fighting risk at extreme zoom between ZAAHI 3D (opacity 1.0) and PMTiles background (opacity 0.35). Stay above 500 m altitude during the plot showcase. |

---

## Closing the demo (2 min)

**Narrative:**
> "That's ZAAHI today — 114 verified plots live, real DDA data, real 3D, real economics, and two revenue streams turned on. We're raising to expand from Dubai to the full UAE, hire a data-ops team, and formalize our DLD validation pipeline. I'd like to put a follow-up deck in your inbox by tomorrow evening — can I get your best email?"

**Take the business card / contact.** Promise a follow-up deck within 48 h. If the investor wants deeper technical diligence, offer a private Slack or WhatsApp channel and a technical-architecture call with Dymo present.

**Do NOT:**
- Commit to a specific investment amount, valuation, or term.
- Commit to a specific cap table position.
- Promise a feature that isn't on the current roadmap (especially Wall / Archibald UGC — paused pending legal per `PARKED_PROJECTS.md`).

---

## Post-demo actions (within 2 hours, same day)

- [ ] Send thank-you email with the follow-up deck attached.
- [ ] Calendar hold for a follow-up call (7–10 days out).
- [ ] Record notes on what the investor said YES / NO / MAYBE to — this goes in the investor CRM (spreadsheet for now).
- [ ] Update the session-notes doc with anything the investor asked that we didn't cover — those are product gaps to close before the next pitch.
- [ ] If the `_prisma_migrations` INSERT SQL from POST_MIGRATION_VERIFY §4 was NOT run pre-demo, run it tonight so Prisma's bookkeeping is clean for the next engineering session.

---

## Document metadata

- **Branch:** `demo/investor-script-2026-04-17`
- **Source audits bundled into this script:** 3 (pre-demo, post-migration-verify, geometry-misalignment) + `CLAUDE.md` + `PARKED_PROJECTS.md`
- **Not merged to main.** This is a reference doc for the founder, not a code change.
- **Do not edit this doc during the demo.** If something needs updating mid-meeting, write it in a separate notes file and reconcile afterward.

— End of script.
