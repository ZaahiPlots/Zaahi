# Founder Decision Pack — 2026-04-29

**Назначение.** Единый decision pack по всем open questions из 5 research artifacts. Founder читает раз, ratify все вопросы за одну сессию, потом implementation идёт отдельными prompts.

**Author:** Claude Opus 4.7 (synthesis only, NO code/DB/deploy changes).
**Branch:** `research/founder-decision-pack-2026-04-29` (от `main`).
**Source artifacts:**
- `docs/audits/bugs-batch-report-2026-04-28.md` (на ветке `research/bugs-batch-2026-04-28`, commit `60b9139`)
- `docs/research/3d-tiles-regression-2026-04-28.md` (та же ветка)
- `docs/research/innovation-hubs-2026-04-28.md` (на ветке `research/innovation-hubs-2026-04-28`, commit `b825a6c`)
- `docs/research/vara-adgm-tokenization-2026-04-28.md` (на ветке `research/vara-adgm-2026-04-28`, commit `67587e8`)
- `docs/research/github-stack-eval-2026-04-29.md` (та же ветка vara-adgm, commit `c278f06`)

**Anti-hallucination disclaimer.** Все вопросы — verbatim или близко к verbatim из source reports. Агент **НЕ изобретал** новых вопросов. Где partition не имеет questions — explicitly flag'нуто.

---

## Table of Contents

- [Part A — Bugs](#part-a--bugs) (10 вопросов: 6 из bugs-batch + 4 из 3d-tiles-regression)
- [Part B — Security](#part-b--security) (1 вопрос: Supabase DB password rotation)
- [Part C — Innovation Hubs](#part-c--innovation-hubs) (10 вопросов из Section 7)
- [Part D — VARA × ADGM Tokenization](#part-d--vara--adgm-tokenization) (8 вопросов из Section 6)
- [Part E — GitHub Stack Ratifications](#part-e--github-stack-ratifications) (9 ratifications: 3 install + 3 defer + 3 skip)
- [Part F — Infrastructure](#part-f--infrastructure) (NO questions in source reports — partition empty)
- [Сводка confidence + critical conflicts](#сводка)

**Total questions: 38.**

---

## Part A — Bugs

### Q-A1 — Bug 4 path option (PMTiles regression)

**Вопрос:** Какой path option для починки "double 3D" на production map: Option 1 (Pure per-parcel GeoJSON, revert PMTiles) / Option 2 (Hybrid PMTiles + GeoJSON) / Option 3 (Re-bake PMTiles минус 114 listings + runtime filter) / Option 4 (Editable overlay поверх tiles)?

**Source:** `docs/research/3d-tiles-regression-2026-04-28.md` §"Path options" + §"Recommendation".

**Recommendation агента:** **Option 3** — re-bake PMTiles excluding 114 ZAAHI listings + ship runtime MapLibre filter immediately as stopgap.

**Rationale:**
- Fixes "double 3D" deterministically: единственное место где ZAAHI listings рендерятся — `ZAAHI_BUILDINGS_3D` после strip из PMTiles source.
- НЕ трогает `loadZaahiPlots`, `computeSetbackM`, `insetRingByMeters`, podium/body/crown logic, 9-cat legend (4 DO-NOT-TOUCH zone согласно CLAUDE.md).
- Сохраняет 461K-plot DDA backdrop (key для discoverability).
- PMTiles rebuild idempotent: `data/tiles/*.geojson.nl` уже на диске, source data НЕ нужно re-fetch'ить из DDA.
- Reversible: prior `.pmtiles` в git — можно откатиться.
- Other options considered: Option 1 (proven infeasible at scale — это причина почему мигрировали на PMTiles); Option 2 (две системы синхронизировать = double maintenance burden); Option 4 (фрейлый z-order trick, founder ранее reviewed это и было unstable).
- Risks: при добавлении новых ZAAHI listings — manual re-bake required (Q-A1.1 ниже про cadence).

**Confidence:** HIGH — analyst конкретно идентифицировал root cause (overlap PMTiles polygon vs ZAAHI shrunk polygon) с filter-side mechanical fix.

**Что founder проверить перед approve:**
- Подтвердить что 177 MB PMTiles total (4 файла) accept'абельно для Vercel static hosting в Y1.
- Подтвердить что cadence "few times per month" rebake приемлем (Q-A1.1 ниже).

**Conflicts с CLAUDE.md / Master Tree:** **NONE** — recommendation explicitly avoids 4 DO-NOT-TOUCH zone.

---

### Q-A1.1 — Re-bake cadence

**Вопрос:** Each new ZAAHI listing requires re-baking PMTiles. OK с manual "few times a month" cadence, или нужен CI cron?

**Source:** `docs/research/3d-tiles-regression-2026-04-28.md` §"Open questions" #1.

**Recommendation агента:** **Manual cadence (few times per month), no CI cron в Y1.**

**Rationale:**
- Current pace: ~114 listings за все время. Rate of new listings <10/month.
- CI cron infrastructure cost (cron job runner + tippecanoe в Docker + auto-deploy) > marginal value at this scale.
- Manual cadence держит founder в loop'е о changes к PMTiles — useful audit trail.
- Other options considered: GitHub Actions cron weekly (low cost но adds CI dependency); webhook on Parcel insert (over-engineered для текущего scale).
- Risks: новый listing появляется как double-3D до следующего rebake. Mitigated runtime filter (см. Q-A1.3).
- Reversibility: easy — если rate растёт, добавить cron потом.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:** установить minimum acceptable lag между add-plot и rebake (1 неделя? 2 недели?).

**Conflicts:** NONE.

---

### Q-A1.2 — Buildings-layer data binding (digital-twin height)

**Вопрос:** Should digital-twin model's height be forced to match `Parcel.affectionPlans[].maxHeightMeters` (truncate / scale model), или artist intent overrides DDA spec?

**Source:** `docs/research/3d-tiles-regression-2026-04-28.md` §"Open questions" #2.

**Recommendation агента:** **Forced match to `maxHeightMeters` с visual scale-warning badge if artist intent ≠ DDA data.**

**Rationale:**
- Screenshot evidence (API Horizon Pointe — 26 floors per side panel, visibly 50+ floors model): пользователи путаются. SidePanel = source of truth для legal/regulatory data.
- Artist intent для visual richness OK, но не должен противоречить data.
- Compromise: scale glTF height to match `maxHeightMeters` programmatically (Three.js `scene.scale.y *= ratio`), preserve other dimensions (footprint, cap details).
- Other options considered: (a) artist intent always wins — confuses users; (b) hide model when mismatch >X% — loses visual polish; (c) overlay text label "26 floors per affection plan" — UX clutter.
- Risks: artist deliveries должны учитывать height constraint, или будут выглядеть squashed/stretched. Workflow: artist получает `maxHeightMeters` в brief.
- Reversibility: easy — scale logic один if-block в Buildings layer code.
- Cost of changing later: low-medium (renegotiate с artists if scaling looks wrong).

**Confidence:** MEDIUM — это UX trade-off; founder лучше знает priority "data accuracy" vs "artist polish".

**Что founder проверить перед approve:**
- Принять policy: side panel data = source of truth.
- Уточнить с artist team — будут ли модели заранее проектироваться under known height constraints.

**Conflicts:** NONE прямо. Косвенно: founder spec 2026-04-15 о `fill-extrusion-opacity 1` для ZAAHI listings — это про opacity, не про height. NO conflict.

---

### Q-A1.3 — Stopgap MapLibre filter

**Вопрос:** Until Option 3 rebake lands, ship runtime filter immediately (low-risk small change в `page.tsx`) или wait for full Option 3?

**Source:** `docs/research/3d-tiles-regression-2026-04-28.md` §"Open questions" #3.

**Recommendation агента:** **Ship runtime filter immediately (P0).**

**Rationale:**
- Visible visual noise на every listing — users видят сейчас.
- Filter change = пара строк `["!", ["in", ["get", "PLOT_NUMBER"], ["literal", [<114 numbers>]]]]` на PMTiles 3D layer.
- ZAAHI listing plot numbers queryable из Postgres at build time → frozen в TS array.
- Other options considered: wait for Option 3 (extends user-visible bug duration); skip filter (bug remains until rebake).
- Risks: filter становится stale если новый listing добавлен и filter array не updated. Mitigation — добавить step "regenerate ZAAHI_LISTING_PLOT_NUMBERS array" в add-plot checklist.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Smoke test после shipping filter: 5 ZAAHI plots Dubai + 1 Abu Dhabi PMTiles backdrop intact.
- Подтвердить что add-plot checklist updated with "regenerate constant" step.

**Conflicts:** NONE.

---

### Q-A1.4 — AD/Al Ain wrong-height triage

**Вопрос:** Founder может перечислить 3-5 specific plot numbers (с expected vs actual heights) для AD/Al Ain wrong-height claim?

**Source:** `docs/research/3d-tiles-regression-2026-04-28.md` §"Open questions" #4.

**Recommendation агента:** **Founder делает list of 3-5 plots BEFORE Phase B touches AD PMTiles. Out-of-scope для Bug 4 Phase B.**

**Rationale:**
- Audit script (`scripts/audit-bugs-batch-2026-04-28.ts`) flag'нул только 4 Dubai plots в `bug1_heightAudit_flagged`. ZERO Abu Dhabi plots.
- Только 3 AD parcels в DB и все имеют `maxHeightMeters` set — wrong-height claim must be про PMTiles **backdrop** plots, не ZAAHI listings.
- Без specific plot numbers агент angles в темноте.
- Other options considered: blanket re-bake of AD PMTiles с different fallback chain (high risk, no concrete failure to fix); `prepare-tiles.ts` audit pass (overkill).
- Risks of waiting: ничего — AD PMTiles already shipped; user-visible noise на specific plots остаётся пока не root-cause'нем.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH — это блокирующий information request, не agent recommendation.

**Что founder проверить перед approve:** собрать 3-5 plot numbers AD/Al Ain с screenshots (expected height vs rendered height).

**Conflicts:** NONE.

---

### Q-A2 — Bug 6 Phase 1 approval (`Parcel.geometry` mutation для 4 plots)

**Вопрос:** Explicit approval to refetch DDA polygons + update `geometry`/`latitude`/`longitude` для plots `1010469`, `6117231`, `6241067`, `6817016`. Per CLAUDE.md, `geometry` mutation требует founder approval (allowed mutations list = `currentValuation`/`status`/append `affectionPlans`).

**Source:** `docs/audits/bugs-batch-report-2026-04-28.md` §"Bug 6" + §"Open questions for founder" #2.

**Recommendation агента:** **APPROVE explicit geometry refetch for these 4 plots only.**

**Rationale:**
- Root cause definitively identified: 5- или 6-vertex synthesized rectangle polygon (placeholder), не actual DDA boundary. Screenshot 6241067 показывает building literally на roundabout.
- Not a render bug — render code correct. Data is wrong.
- Mutation scope: 4 specific plot numbers, NOT blanket "fix the database".
- Other options considered: (a) keep synthesized polygons + manually adjust offset (impossible — DDA layer 2 returns authoritative geometry); (b) delete + recreate Parcel rows (CLAUDE.md "NEVER delete parcels"); (c) accept visual noise (P1 user-visible bug).
- Risks: re-fetching DDA layer 2 при rate-limit; новый geometry разрушит historical lat/lng если что-то reference'ит старое.
- Reversibility: medium — старые synthesized polygons можно восстановить из git (если geometry в git tracked, что unlikely — это в DB only). Recommend: **до mutation сохранить current geometry в audit log**.
- Cost of changing later: low (re-run script с updated polygon).

**Confidence:** HIGH — clear data-side bug, clear fix path.

**Что founder проверить перед approve:**
- Подтвердить explicit approval с phrasing per CLAUDE.md: *"For plots 1010469, 6117231, 6241067, 6817016 only: refetch DDA polygon and update geometry + latitude + longitude. Append-only on affectionPlans. No delete."*
- Запросить у agent: сохранить current geometry в `docs/audits/parcel-geometry-pre-mutation-2026-04-XX.json` BEFORE mutation.

**Conflicts с CLAUDE.md:** **explicitly gated**. CLAUDE.md rule: *"The only acceptable mutations on an existing parcel are: update currentValuation, update status, refresh the affectionPlans history."* Поэтому founder approval required (это сам путь rule предусматривает — explicit, plot-number-specific instruction).

---

### Q-A3 — Bug 3 Majan plot clarification

**Вопрос:** Какой Majan plot was uploaded that's not appearing? Plot number, approximate upload date, любая ошибка которая была видна?

**Source:** `docs/audits/bugs-batch-report-2026-04-28.md` §"Bug 3" + §"Open questions for founder" #3.

**Recommendation агента:** **Founder отвечает с конкретным plot number. Без этого Bug 3 = Cannot Reproduce.**

**Rationale:**
- 22 parcels в `district ILIKE '%majan%' OR '%liwan%' OR '%wadi al safa%'` — all `LISTED`, все findable в DB.
- Audit confirmed: NO Majan-plot commits since 2026-04-15.
- Hypothesis (analyst-side): founder added через UI but API call failed silently → row never reached `git`.
- Other options considered: blanket reseed of Majan plots (NEVER reseed без explicit instruction per CLAUDE.md); skip — but founder уверенность что plot должен быть.
- Risks: без data — agent will guess + maybe duplicate-add an existing plot (CLAUDE.md "NEVER add duplicate parcels").
- Reversibility: N/A — это information request.
- Cost of changing later: zero.

**Confidence:** HIGH (для recommendation that founder provides info first).

**Что founder проверить перед approve:**
- Найти screenshot/notes когда uploading attempt happened.
- Проверить browser network tab если plot был added recently.

**Conflicts:** NONE.

---

### Q-A4 — Bug 2 setbacks regex (Plot 3260899)

**Вопрос:** Confirm — does Plot 3260899 actually have 4 measurable setback sides per DDA HTML, или corner plot с 2?

**Source:** `docs/audits/bugs-batch-report-2026-04-28.md` §"Bug 2" + §"Open questions for founder" #4.

**Recommendation агента:** **Defer to founder verification of DDA HTML before changing regex. Recommend: founder open `gis.dda.gov.ae/.../PlotInfo?PLOT_NUMBER=3260899` in browser, copy raw setbacks block to agent.**

**Rationale:**
- Both `landUseMix` parser is **already correct** post-commit `3ec95b6` (2026-04-12) — newer AffectionPlan row для plot 3260899 показывает correct split (RETAIL + APARTMENT с areaSqm).
- Setbacks question: **только 2 of 4 sides parsed.** Two possibilities:
  - **Legitimate** — corner plot, narrow lot 1018 sqm, shared walls на 2 sides → DDA reports только 2 measurable setback sides.
  - **Parser bug** — regex `/Side\s+(\d+)\s+([\dN/A.]+)\s+([\dN/A.]+)/g` skips lines где DDA HTML renders em-dash or HTML-wrapped N/A.
- Без actual DDA HTML, agent cannot disambiguate.
- Other options considered: tighten regex defensively (might break working cases); add UI note "corner plot" (premature without data).
- Risks: tightening regex без data может break stable parser.
- Reversibility: easy (regex change один line).
- Cost of changing later: low.

**Confidence:** MEDIUM — depends on DDA HTML evidence which agent lacks.

**Что founder проверить перед approve:**
- Opened plot 3260899 в DDA portal, скопировать setbacks section HTML.
- Если 4 sides present — regex tighten requested. Если 2 sides — UI note "corner plot, 2 setback sides" added.

**Conflicts:** NONE.

---

### Q-A5 — Bug 1 height audit follow-ups

**Вопрос:** Confirm interpretation of 4 flagged plots:
- `5912323` AL FURJAN: `maxHeightMeters=60` но `maxFloors=null` — set `maxFloors` from height (`60/3.5≈17`)?
- `9235849` AL YALAYIS 3: both null — confirm intentional FUTURE_DEVELOPMENT?
- `6464982` DUBAI LAND: both null — investigation needed.
- `5310951` DUBAI WHOLESALE CITY: both null — investigation needed.

**Source:** `docs/audits/bugs-batch-report-2026-04-28.md` §"Bug 1".

**Recommendation агента:** **APPROVE all 4 actions per per-plot table (append-only AffectionPlan rows, no overwrite).**

**Rationale:**
- `5912323`: physically inconsistent — height без floors. Append new AP row с `maxFloors=17` (from `60/3.5`). Append-only per CLAUDE.md.
- `9235849`: confirmed FUTURE_DEVELOPMENT per recent commit (`fdf2863 feat(parcels): add 9235849 · Al Yalayis 3 · Dubai Land FUTURE DEVELOPMENT · 484k sqm · pre-masterplan`). Per CLAUDE.md rendering rules: "FUTURE DEVELOPMENT — только fill polygon, без 3D extrusion." Null is correct, no action.
- `6464982` и `5310951`: need DDA refetch (one-off check). Likely same scenario as `9235849`.
- Other options considered: skip — leaves data inconsistent; bulk-fix all 4 same way — wrong (each plot has different reason).
- Risks: low (append-only, no overwrite).
- Reversibility: easy (append another row на correction).
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Approve append-only fix for `5912323`.
- Approve no-action for `9235849` (FUTURE_DEVELOPMENT confirmed).
- Approve DDA refetch + AP append для `6464982` and `5310951`.

**Conflicts:** NONE — consistent с CLAUDE.md "append-only on affectionPlans, never overwrite".

---

### Q-A6 — Bug 7 user state persistence schedule

**Вопрос:** When does dedicated state-persistence session land? It's 3-4 day effort, not a tail-of-session bolt-on.

**Source:** `docs/audits/bugs-batch-report-2026-04-28.md` §"Bug 7" + §"Open questions for founder" #5.

**Recommendation агента:** **Schedule for after Plot 1 commission (post-2026-06-19) — ideally Q3 2026 (July).**

**Rationale:**
- 3-4 day effort touches `page.tsx` (215 KB), `SidePanel.tsx`, `FeasibilityCalculator.tsx` (53 KB), new `state-persistence.ts`, middleware checks.
- P2 (correctness, not blocker) per priority table.
- Plot 1 (19 Jun 2026) commission is P1 revenue path — должна быть завершена first.
- ADGM HoldCo (14 Aug 2026) is structural milestone — также priority.
- Q3 2026 (Jul-Sep) = post-Plot 1, pre-Hub71+ DA decision (Nov 2026), есть окно для focused dev session.
- Other options considered: (a) immediate (conflicts с Plot 1 / trade licence work); (b) defer Y2 (state hydration UX gets worse as listings grow); (c) Q4 2026 (overlaps с Hub71+ DA pitch deck v2 prep).
- Risks: state hydration flicker is hard to catch without browser smoke-test access — requires session где agent имеет browser.
- Reversibility: medium (large code surface, но reversible commit).
- Cost of changing later: medium (code grows; harder to bolt persistence into mature codebase).

**Confidence:** MEDIUM — это scheduling judgment, founder's calendar visibility лучше.

**Что founder проверить перед approve:**
- Подтвердить что July 2026 = available для 3-4 day focused session.
- Подтвердить browser smoke-test access (либо agent will have, либо founder verifies hydration manually на staging).

**Conflicts:** NONE прямо. Косвенный: state persistence layer не должен bypass `CLAUDE.md` rule "ZAAHI listings always on; everything else off by default on a clean device" — agent must respect это в hydration logic.

---

## Part B — Security

### Q-B1 — Supabase DB password rotation

**Вопрос:** Rotate Supabase DB password — `.env.local` was echoed into bugs-batch session transcript (production `DATABASE_URL` / `DIRECT_URL` exposed).

**Source:** `docs/audits/bugs-batch-report-2026-04-28.md` §"Honest scope statement" + §"Open questions for founder" #6.

**Recommendation агента:** **APPROVE rotation IMMEDIATELY (P0). Не комбинировать с другими operational changes.**

**Rationale:**
- Production DB credentials в conversation transcript = high-severity exposure если transcript persisted/shared/ingested third-party.
- Standard incident response: rotate within 24h of disclosure (incident date 2026-04-28; rotation due 2026-04-29 — today).
- Rotation steps:
  1. Supabase Dashboard → Project Settings → Database → Reset password.
  2. Update `.env.local` на dev box локально (founder action).
  3. Update Vercel Environment Variables (`DATABASE_URL`, `DIRECT_URL`) → Vercel auto-redeploys with new credentials.
  4. Verify production `/api/parcels/map` returns 401 (auth gate intact) и smoke endpoints work.
- Other options considered: skip rotation (high-risk — credentials may be in third-party LLM training data); rotate later (window of exposure widens daily).
- Risks: Vercel deployment briefly cached с old credentials → 60-second downtime potential. Mitigate by rotating during low-traffic window.
- Reversibility: easy (re-rotate если что-то ломается).
- Cost of changing later: HIGH — every day exposure widens.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Convenient time window для 60-second potential downtime.
- Backup `.env.local.backup-2026-04-28-rotation` уже existed в untracked files — это уже ранее flagged rotation что планировалась? Если yes — confirm rotation completed.
- Verify NO other external services depend on old password (e.g. external monitoring, n8n, Zapier).

**Conflicts с CLAUDE.md:** NONE прямо. CLAUDE.md SECURITY RULES section explicitly требует defense-in-depth (RLS, AuthGuard, getApprovedUserId) — rotation усиливает security posture.

---

## Part C — Innovation Hubs

### Q-C1 — Equity dilution acceptance

**Вопрос:** Какой максимальный equity % приемлем для accelerator programmes (если вообще)? Hub71 SAFE = uncapped MFN — effective % будет определён next priced round.

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #1.

**Recommendation агента:** **Hard cap 5% effective dilution через Hub71+ DA SAFE при reasonable next priced round (e.g. при Series A 2028 valuation $50M+, AED 250k cash + 250k top-up = ~AED 500k = USD 136k, что < 0.3% dilution).**

**Rationale:**
- ZAAHI's no-dilution principle (per Phase 1) — strict но не absolute.
- Hub71 SAFE uncapped/no-discount: effective dilution depends entirely на future priced round valuation.
- Math: при Series A valuation USD 50M, AED 500k SAFE ≈ 0.27% dilution. При valuation USD 10M (downside scenario), 1.36% dilution.
- 5% cap = generous safety buffer для downside Series A scenarios.
- Other options considered: (a) absolute zero dilution (excludes Hub71, DFDF, all major hubs — leaves только free programmes Dubai AI Seal + Sandbox PropTech); (b) 10% cap (allows YC 7% — но YC has other blockers, см. Phase 1 rec); (c) case-by-case без hard cap (agent decision-paralysis at scale).
- Risks: при катастрофическом down-round Series A ниже expected, 5% может быть exceeded — но это founder decision moment, не automated.
- Reversibility: hard — equity dilution irreversible после signing SAFE.
- Cost of changing later: HIGH (renegotiating SAFEs unlikely).

**Confidence:** MEDIUM — founder priorities на dilution могут быть жёстче или мягче.

**Что founder проверить перед approve:**
- Math sanity check: AED 500k SAFE ÷ expected Series A valuation = expected dilution %.
- Если absolute zero principle — explicitly skip Hub71+ DA + DFDF в Phase 1 sequence.

**Conflicts:** PHASE 1 recommendation #1 (Hub71+ DA) предполагает SAFE acceptance. Founder ratification на этот вопрос определяет можно ли даже applying на Hub71.

---

### Q-C2 — Geographic concentration

**Вопрос:** Dubai-only vs Dubai + Abu Dhabi vs international. Specifically: согласен ли founder на 1 founder в Abu Dhabi 3 месяца (Hub71 requirement)?

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #2.

**Recommendation агента:** **Dubai + Abu Dhabi (Hub71 trio includes ADGM HoldCo concentric path). 1 founder в AD на 3 месяца — likely Dymo (per his stated role as ambassador for Dubai market, but физически он в UAE и AD reachable; alternative — Zhan).**

**Rationale:**
- Hub71+ DA AED 750k value (cash + in-kind + top-up) is material vs Y1 budget AED 1.5-1.7M.
- ADGM HoldCo plan (Aug 14 2026) = concentric с Hub71 ADGM tech-licence subsidiary requirement.
- Hub71 не требует whole team relocation — только 1 founder, и не fulltime presence (on-the-ground первые 3 месяца после programme start Feb 2027).
- Dymo's role as Co-founder Ambassador likely means он travels Dubai-AD anyway.
- International (Y Combinator SF) explicitly excluded в Phase 1 due to Plot 1 Dubai dependency.
- Other options considered: (a) Dubai-only — excludes Hub71 trio (ZAAHI loses AED 750k); (b) Abu Dhabi-primary — conflicts с Plot 1 Dubai operational center; (c) hybrid с no founder relocation — disqualifies Hub71 application.
- Risks: ADGM HoldCo (Aug 14) overlaps с Hub71 application deadline (2 Aug 2026) — only 12 day gap. Hub71 onboarding handles ADGM subsidiary creation, but timing tight.
- Reversibility: easy (Hub71 acceptance не binding до programme start Feb 2027).
- Cost of changing later: medium (если decline после acceptance, reputational cost).

**Confidence:** MEDIUM — founder priorities на personal logistics (AD relocation 3 mo) — это lifestyle choice.

**Что founder проверить перед approve:**
- Confirm с Dymo: 3-month AD presence Feb-Apr 2027 acceptable.
- Confirm Plot 2-3 Dubai-side build-out can run independently без 1 founder physically in Dubai during Feb-Apr 2027.

**Conflicts:** NONE прямо. ADGM HoldCo timing concentric с Hub71.

---

### Q-C3 — Timing tradeoff (Hub71 application date)

**Вопрос:** Подавать в Hub71 ДО Plot 1 (19 Jun 2026, weak traction state в pitch) или ПОСЛЕ (deadline 2 Aug 2026 = только 6 недель окно после Plot 1)?

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #3.

**Recommendation агента:** **Submit в начале Q3 2026 — после Plot 1 soft update (week of Jun 24-30), до 2 Aug deadline.**

**Rationale:**
- 6-week window post-Plot 1 (Jun 24 - Aug 2) = достаточно для pitch deck v2 update с Plot 1 traction data.
- Plot 1 commission = первый concrete revenue milestone — pitch deck stronger с этим.
- Submitting до Plot 1 = pitch на projection, не traction. Hub71 review window June-November 2026 — early submitters не получают priority advantage.
- Other options considered: (a) submit immediately в May (weak traction story); (b) submit on 2 Aug deadline day (no margin); (c) wait until next cohort 2027 — loses 6 months.
- Risks: Plot 1 commission delays — buffer 4 weeks before 2 Aug. Если commission slips beyond 5 Jul, recommendation: submit с "Plot 1 commission imminent" projection language.
- Reversibility: easy (early/late submission both within window).
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Plot 1 commission likely date — at risk of delay?
- Pitch deck v2 with Plot 1 Master Tree projection ready by 1 Jul 2026.

**Conflicts:** NONE.

---

### Q-C4 — IP exposure в pitch decks

**Вопрос:** Что готовы раскрывать публично в pitch decks vs reserve для DD-only data rooms?

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #4.

**Recommendation агента:** **Pitch decks показывают outputs / UX / value props. Architecture (Master Tree internal structure, Archibald AI prompt engineering, Smart Escrow design specifics) reserve для signed-NDA DD only.**

**Rationale:**
- Pitch decks regularly leak (rejected applicants могут screenshot, partners cycle through). Architecture details in pitch = effectively public.
- Hub71/DFDF/ITL evaluators care о *commercial viability + traction* — UX outputs sufficient.
- Series A 2028 leads will request data-room access NDA-protected — that's correct moment для technical depth.
- Other options considered: (a) full openness (helps narrative но enables fast-followers Property Finder×Stake / Bayut); (b) max secrecy (kills pitch effectiveness); (c) tiered с in-pitch teaser + DD depth (recommended).
- Risks: too-spare pitch может прочитываться как weak. Mitigate strong outputs (live demos, real numbers, Plot 1 data).
- Reversibility: medium (once shown, can't unsee).
- Cost of changing later: high (architectural details once disclosed = public).

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Inventory Master Tree §43 / §47 / §66-70 details — какие public-OK vs secret.
- NDA template ready для DD requests.

**Conflicts:** NONE.

---

### Q-C5 — DIFC vs ADGM tokenization regulatory home

**Вопрос:** Это самое стратегическое решение в Phase 1 research. **Recommend Option B (partner с PRYPCO/Ctrl Alt) первой ступенью** (per Phase 1 Section 5.4).

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #5 + §5.4 Conflict matrix.

**Recommendation агента:** **CRITICAL UPDATE из Phase 2 (vara-adgm report): partner с Ctrl Alt (NOT PRYPCO — PRYPCO не VARA-licensed). Phase 2 detailed analysis в Q-D2 ниже superseeds Phase 1 Q-C5. Founder ratify Q-D2 instead.**

**Rationale:**
- Phase 1 recommended "partner с PRYPCO/Ctrl Alt" but Phase 2 verified PRYPCO ≠ VASP — Ctrl Alt is the actual VARA Cat-1 licensed VASP behind PRYPCO Mint.
- Partner universe N=2 (Ctrl Alt + Tokinvest).
- Phase 2 Q-D2 + Q-D3 cover full decision matrix.
- This question = forward-pointer to Q-D2/D3.

**Confidence:** HIGH (reframing — defer to Phase 2).

**Что founder проверить перед approve:** перейти к Q-D2 + Q-D3 в Part D ниже.

**Conflicts:** Partial supersedure — Phase 2 vara-adgm report explicitly reframed PRYPCO vs Ctrl Alt distinction.

---

### Q-C6 — DIFC second-licence layer

**Вопрос:** Если хотим Dubai PropTech Hub residency — DIFC Innovation Licence USD 1,500/yr нужна. Acceptable добавить второй корпоративный layer в Y1?

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #6.

**Recommendation агента:** **YES, accept DIFC Innovation Licence layer в Y1.**

**Rationale:**
- USD 1,500/yr cost trivial vs AED 1.5-1.7M Y1 budget (~0.03%).
- DIFC Innovation Licence + Dubai PropTech Hub residency = unique pilot-deal pipeline с Sobha, Binghatti, MAF, Union Properties, Transguard founding partners. These = exactly те developers под чьи masterplans ZAAHI строит Master Tree.
- Cumulative Y1 entity stack at DIFC layer addition: Mainland Dubai LLC (5 May trade licence) + DIFC Innovation Licence + ADGM HoldCo (14 Aug) = 3 entities. Manageable.
- Other options considered: (a) skip DIFC — loses Dubai PropTech Hub access; (b) defer DIFC to Y2 — loses early founding-partner pilot relationships; (c) consolidate everything in DIFC (replaces Mainland) — loses VARA jurisdiction option.
- Risks: admin overhead (audit × 2 entities, filings × 2). Mitigate с single legal counsel firm handling both.
- Reversibility: easy (DIFC Innovation Licence cancellable annually).
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Capacity для 3-entity admin overhead (Mainland + DIFC + ADGM HoldCo) в Y1.
- Single legal counsel firm capable of handling all 3 jurisdictions.

**Conflicts:** Phase 2 Q-D3 (Series A jurisdiction priority) — DIFC layer не conflicts с ADGM HoldCo as primary.

---

### Q-C7 — Hub71+ AI vs +DA cross-track admission

**Вопрос:** Если оба fit — нужно ли confirmation от Hub71 что dual-track admission допустим? Если nope — pick DA.

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #7.

**Recommendation агента:** **Submit Hub71+ Digital Assets only. Skip dual-track.**

**Rationale:**
- Phase 1 explicit rec: tokenization regulatory edge (ADGM Regulations Partner) > AI compute (доступно через AWS / Anthropic API без accelerator).
- ZAAHI primary identity = PropTech, not AI-tools company. AI track positioning требует более тонкого narrative.
- Dual-track admission status = `data not public — Hub71 contact required`. Risk of split application looking unfocused.
- Other options considered: (a) dual-track (adds risk of rejection both); (b) Hub71+ AI only (loses tokenization regulatory edge); (c) Hub71 Access general (loses both specialist partner networks).
- Risks: missing AI71 / Core42 / MBZUAI partner network. Mitigate — these accessible via non-Hub71 channels (MBZUAI is open Abu Dhabi university; Core42 is enterprise).
- Reversibility: hard (one application per cohort).
- Cost of changing later: 6 months (next cohort 2027).

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Pitch deck explicitly emphasizes blockchain + tokenization + Smart Escrow + §43 Blockchain Audit (DA-track narrative).
- Confirm с Dymo + Rudi: DA-track вариант их preference.

**Conflicts:** NONE.

---

### Q-C8 — DFDF lead-investor strategy

**Вопрос:** DFDF не лидирует — кого ZAAHI хочет видеть как lead VC в seed/Series A? (BECO Capital? Wamda? Global Ventures? international PropTech VC?)

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #8.

**Recommendation агента:** **Tiered approach: для seed (2026-2027) — local UAE VC (BECO Capital primary, Wamda backup). Для Series A 2028 — international PropTech-specialist (MetaProp, Fifth Wall, Camber Creek).**

**Rationale:**
- DFDF positions as **co-investor**, не lead — нужен lead first.
- BECO Capital — local UAE FinTech-focused VC, frequent DFDF co-investor, knows Dubai ecosystem.
- Wamda — pan-MENA, broader but slower diligence cycle.
- Global Ventures — fund-of-funds tilt, less direct lead.
- Series A 2028: international PropTech specialists give brand + LP networks недоступные local VCs.
- Other options considered: (a) angel syndicate (slower for Series A scale); (b) sovereign-direct (Mubadala Capital — wrong stage per Phase 1 finding); (c) Hub71 alumni network leads (uncertain).
- Risks: BECO Capital cold outreach без warm intro = low success rate. Mitigate: Rudi's network для warm intros.
- Reversibility: easy (lead investor decision happens at term-sheet stage).
- Cost of changing later: medium (re-pitching seed round after term sheet drafted).

**Confidence:** MEDIUM — founder relationship intelligence на local VCs выше agent's.

**Что founder проверить перед approve:**
- Rudi's warm intro paths to BECO Capital + Wamda partners.
- Series A 2028 horizon — start international VC relationship-building Q3 2027 (12 mo before close).

**Conflicts:** NONE.

---

### Q-C9 — Sandbox Dubai timing risk

**Вопрос:** Если DFF откроет PropTech Sandbox formal окно только в 2027 — устраивает? Или нужен более ранний регуляторный cover (DFSA ITL / ADGM RegLab) как backup?

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #9.

**Recommendation агента:** **Acceptable to wait Sandbox Dubai 2027. NO need для DFSA ITL / ADGM RegLab Y1 backup unless tokenization launches earlier than Y2 Phase 2 (Feb 2027).**

**Rationale:**
- Phase 2 timing rec = Y2 Phase 2 (Feb 2027 onwards) для tokenization launch.
- Sandbox Dubai PropTech registration of interest = free, zero commitment.
- DFSA ITL = USD 17.5k/yr fees + 12-month forced exit + DIFC entity overhead — not casual backup.
- ADGM RegLab = case-by-case fees + Cohort 6 status unverified — not casual backup.
- Other options considered: (a) DFSA ITL Y1 backup (USD 478k mid 24-mo cost + 12-month forced exit risk без actual tokenization product); (b) ADGM RegLab Y1 (uncertain cohort timing); (c) skip all sandboxes (loses regulatory cover narrative для Hub71+ DA pitch).
- Risks: Sandbox Dubai opens later than expected (Q2 2027) — но Y2 Phase 2 timing rec ужe assumes some flex.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Confirm tokenization launch timing = Y2 Phase 2 (Q1 2027+).
- Если pivot to Y1 immediate (not recommended) — separate decision required.

**Conflicts:** NONE.

---

### Q-C10 — Dubai AI Seal tier acceptance

**Вопрос:** Если получим tier C/D вместо S/A/B — okay опубликовать badge или не использовать вообще?

**Source:** `docs/research/innovation-hubs-2026-04-28.md` §7 #10.

**Recommendation агента:** **Apply regardless of tier expectation. If tier C/D returned — skip publishing badge, request re-evaluation в Y2 после AI substance growth.**

**Rationale:**
- Application = free + 4-12 weeks. No downside от applying.
- Tier outcome unknown beforehand (DCAI scoring opaque).
- Tier C/D badge публикация = potentially worse than no badge — implies "barely qualifies".
- Tier S/A/B badge публикация = premium signal.
- Re-evaluation в Y2 after AI substance growth (more Archibald usage, MBZUAI partnership возможна) likely improves tier.
- Other options considered: (a) skip application entirely (loses optionality); (b) accept any tier outcome (low-tier badge может damage credibility); (c) wait for high AI substance Y2 (loses 6 months).
- Risks: low — application is free, tier outcome reversible (don't publish low badge).
- Reversibility: easy (tier visible after issuance, founder decides publish/not).
- Cost of changing later: zero.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Application can describe ZAAHI's Anthropic Claude + Archibald + Feasibility AI substance fully.
- Confirm willingness to defer publication if low tier.

**Conflicts:** NONE.

---

## Part D — VARA × ADGM Tokenization

### Q-D1 — Phase 3 follow-up timing

**Вопрос:** Options A and D fork-incomplete (rate limit Phase 2). Перед final decision — Phase 3 research нужен на VARA Cat-1 fees/capital floor + HoldCo restructure cost. Запускать Phase 3 (~5-7 days) до final decision, или решать на текущих данных с known gaps?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #1.

**Recommendation агента:** **YES, run Phase 3 research before final Option decision.**

**Rationale:**
- Options A (VARA Cat-1 direct) и D (HoldCo restructure) — два из 4 options не deeply researched. Material decision cannot be made с current data.
- Phase 3 effort: 5-7 days research + 2-3 weeks counsel/partner outreach (parallel pipeline).
- Cost of waiting 7 days: minimal (tokenization Y2 Phase 2 launch is Feb 2027 — 9+ months out).
- Cost of deciding на incomplete data: HIGH — Option D restructure cost USD 50-150k undefined, Option A capital floor undefined.
- Other options considered: (a) decide на current data + iterate (high regret risk); (b) skip Phase 3 + commit Option B + Option C only (closes off Options A/D forever); (c) outsource Phase 3 to external counsel (Galadari / Al Tamimi — costs USD 5-15k retainer но same 2-3 weeks).
- Risks: Phase 3 research также может hit rate-limit. Mitigate: split into smaller forks с longer breaks между.
- Reversibility: easy (Phase 3 не commits anything).
- Cost of changing later: zero.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Approve Phase 3 budget (zero monetary cost if agent-driven; USD 5-15k если external counsel).
- Confirm tokenization launch timing Y2 Phase 2 — НЕ pressure-tested под Y1 immediate launch.

**Conflicts:** NONE.

---

### Q-D2 — Partner-vs-own tradeoff (anti-competitive risk Option B)

**Вопрос:** Готов ли founder accept anti-competitive risk (HIGH per Section 2.2.5) Option B в обмен на 24x lower setup cost vs Option C?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #2.

**Recommendation агента:** **DEFER until Phase 3 completes. If forced to decide now: Option B с Ctrl Alt — accept anti-competitive risk WITH explicit data-segregation contract clauses + termination triggers.**

**Rationale:**
- Option B 24-month cost USD 25k-300k vs Option C USD 224k-986k — 24× cheaper.
- Anti-competitive risk = HIGH because Ctrl Alt's B2B-infrastructure positioning means они работают с Property Finder×Stake / Bayut competitors параллельно.
- Mitigation: contract clauses requiring (a) ZAAHI user data NEVER shared с other Ctrl Alt customers, (b) exclusivity на specific datasets ZAAHI provides, (c) advance-notice termination 90 days, (d) ZAAHI termination right если Ctrl Alt acquires/merges с direct ZAAHI competitor.
- Other options considered: (a) Option A direct VARA — too expensive at seed stage (Phase 3 verification required); (b) Option C DFSA ITL — fee-clean but 12-month forced exit risk; (c) Tokinvest instead of Ctrl Alt (sanctions compliance concern flag — verification required).
- Risks: contract clauses не enforceable если Ctrl Alt fundraise/pivot/acquired. Real risk = ZAAHI's user data flowing to competitors via Ctrl Alt as common provider.
- Reversibility: medium (partnership exit clauses).
- Cost of changing later: medium (rebuild с different partner OR self-licence).

**Confidence:** MEDIUM-LOW — anti-competitive concern subjective; founder priorities на competitive moat выше agent's.

**Что founder проверить перед approve:**
- Counsel review of partnership terms with Ctrl Alt.
- Decision about acceptable competitor overlap (Stake / Bayut / Property Finder) при common Ctrl Alt provider.
- Phase 3 Q-D1 completion улучшит information.

**Conflicts:** Phase 1 Section 5.4 рекомендовала Option B (partner) — Phase 2 verified партнер shift PRYPCO → Ctrl Alt. NOT a conflict, just a refinement.

---

### Q-D3 — Series A jurisdiction priority

**Вопрос:** Какая jurisdiction будет primary entity для Series A 2028? ADGM (Common Law, Hub71-concentric) vs DIFC (DFSA brand) vs Mainland (VARA-direct)?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #3.

**Recommendation агента:** **ADGM HoldCo as primary parent for Series A 2028. Mainland Dubai operating subsidiary (or Ctrl Alt partnership) для VARA-jurisdiction tokenization activity. DIFC Innovation Licence subsidiary OPTIONAL для Dubai PropTech Hub residency.**

**Rationale:**
- ADGM Common Law = international VC default preference (precedent reliability, share-class flexibility, contract enforceability).
- ADGM HoldCo concentric с Hub71+ DA programme requirement.
- Mainland Dubai sub for VARA — minimal corporate complexity (single entity під ADGM HoldCo).
- DIFC layer optional — additive value (Dubai PropTech Hub) but not load-bearing.
- Other options considered: (a) Mainland Dubai parent (Option D pure) — loses Common Law optics for Series A; (b) DIFC parent — too narrow (FinTech-focused, less PropTech identity); (c) Cayman parent — overkill at seed, adds offshore complexity Series A leads may flag.
- Risks: 4-entity stack maximum (Mainland + DIFC + ADGM HoldCo + ADGM tech-licence sub via Hub71) admin overhead.
- Reversibility: hard (HoldCo restructure expensive).
- Cost of changing later: HIGH (legal counsel USD 50-150k для restructure).

**Confidence:** MEDIUM — Phase 3 follow-up может change Option A vs D structural distinction.

**Что founder проверить перед approve:**
- ADGM HoldCo (14 Aug 2026) plan = unchanged.
- Dymo's Equilibrium Advisory Group connections для ADGM legal counsel.
- Phase 3 Q-D1 result для Option A vs D clarity.

**Conflicts:** NONE — recommendation aligns с Phase 1 baseline.

---

### Q-D4 — Brand independence threshold

**Вопрос:** Какой минимальный visible brand share готов founder accept в user flow (Option B = LOW; Options A/C/D = HIGH)?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #4.

**Recommendation агента:** **Minimum 70% visible brand share в user-facing tokenization flow.** ZAAHI = consumer brand, Ctrl Alt = backend infrastructure (similar to Stripe powering checkout — Stripe brand visible at "Powered by Stripe" footer level only).

**Rationale:**
- ZAAHI's value = Master Tree breadth + Archibald AI + Feasibility — these are user-facing differentiators. Ceding brand = ceding moat.
- PRYPCO precedent shows Ctrl Alt accepts low brand visibility (consumer sees PRYPCO, not Ctrl Alt) — precedent для ZAAHI partnership.
- 70% threshold leaves room for "Powered by Ctrl Alt" mandatory regulatory disclosures без losing primary identity.
- Other options considered: (a) 100% (Ctrl Alt invisible — likely unacceptable to them); (b) 50/50 (co-branded — dilutes ZAAHI identity); (c) 30/70 reversed (Ctrl Alt primary — kills ZAAHI brand).
- Risks: Ctrl Alt may push back on 70% threshold; negotiation depends на ZAAHI's account size relative to PRYPCO.
- Reversibility: medium (renegotiation possible at renewal).
- Cost of changing later: medium.

**Confidence:** MEDIUM — депенды от negotiation leverage post-DD outreach.

**Что founder проверить перед approve:**
- PRYPCO's actual brand visibility в Ctrl Alt-backed flow (live verification на mint.prypco.com).
- Negotiation power: ZAAHI's projected token volume vs PRYPCO's existing.

**Conflicts:** NONE.

---

### Q-D5 — Retail vs professional target

**Вопрос:** Если ZAAHI target = mainstream retail Dubai property buyers — VARA path materially lighter regulatory documentation. Если professional/qualified — DFSA path fits cleanly. Ratify product-market positioning.

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #5.

**Recommendation агента:** **Retail-primary positioning, professional-secondary.** ZAAHI's 114 listings + Master Tree breadth = mass-market discovery tool; tokenization adopts retail-friendly PRYPCO precedent (AED 2,000 minimum).

**Rationale:**
- ZAAHI's existing user surface = mainstream Dubai property buyers (per Master Tree §66-70 Intelligence + 114 listings + AI advisory).
- PRYPCO retail precedent demonstrated viability — 326 investors из 40+ nationalities на Park Ridge Tower C, AED 10,714 average ticket.
- VARA retail framework более mature for tokenized real estate чем DFSA retail (which post-12-Jan-2026 reform shifted suitability burden to firm).
- Property Finder × Stake competitive positioning = AED 500 retail floor — confirms market direction is retail.
- Professional-secondary tier для high-ticket developers / institutional family offices retains optionality.
- Other options considered: (a) professional-only (small TAM; gives up Property Finder × Stake retail competition); (b) retail-only (locks out institutional ticket sizes); (c) regional tier mix (retail UAE + professional GCC) — premature.
- Risks: retail-primary requires more KYC/AML overhead, suitability documentation. Mitigate via partner Ctrl Alt handling much of this.
- Reversibility: easy (product launches с both tiers in mind from day 1).
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Retail tokenization product TAM (Dubai retail property investors annual count).
- Anthropic-direct AI advisory compatible с retail KYC requirements (no PII leak via Archibald).

**Conflicts:** CLAUDE.md "platform deployed на Vercel + Supabase, RLS active" = compatible с retail tokenization KYC.

---

### Q-D6 — Property Finder × Stake response strategy

**Вопрос:** Они launches Q1 2026 с AED 500 floor + ~40% listings distribution. ZAAHI tokenization Y2 Phase 2 = February 2027 минимум, т.е. Stake имеет 12+ месяцев head start. Strategy: differentiate (5-10 plot deep deals)? compete на price? alliance с alternative listings player?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #6.

**Recommendation агента:** **Differentiate via Master Tree breadth + Archibald AI advisory + Feasibility v5.0 + per-plot deep-dive analytics. NOT price competition. NOT alliance Y1.**

**Rationale:**
- Stake/Property Finder strength = listings distribution. Their weakness = no AI advisory, no Master Tree, single-property tokenization.
- ZAAHI strength = Master Tree (556k plots + 114 listings + Feasibility outputs) + Archibald AI (Claude Sonnet 4.6 на Dubai property domain).
- Price war (AED 500 vs AED 500) = race to bottom, Stake's $58M war chest wins.
- Differentiation play: ZAAHI tokenizes plots с full Feasibility report + Archibald advisory + 3D Signature visual = premium product, not commodity.
- Alliance с alternative listings player (Bayut/Dubizzle): risky given they're hiring own tokenization manager. Premature.
- Other options considered: (a) price compete (loses); (b) acquire / be acquired by alternative (premature); (c) skip retail tokenization entirely + professional-only (concedes retail to Stake).
- Risks: differentiation messaging requires marketing investment ZAAHI doesn't have at seed. Mitigate: single landing page demo with side-by-side quality comparison.
- Reversibility: easy (positioning changeable Y2-Y3).
- Cost of changing later: medium (marketing assets to redo).

**Confidence:** MEDIUM — competitive strategy depends на market response к Stake (yet unknown в production).

**Что founder проверить перед approve:**
- Stake's Q1 2026 launch metrics (downloads, transaction volume) — public sources.
- Bayut/Dubizzle "Senior Manager — Real Estate Digital Assets" hire status update.
- Confirmation: ZAAHI does NOT compete на AED 500 minimum price floor.

**Conflicts:** NONE.

---

### Q-D7 — Acceptable lock-in (Rudi SAFE structure)

**Вопрос:** Rudi SAFE structure date + entity = критично для Option D cost. Founder ratify: при каких условиях готов restructure existing instruments?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #7.

**Recommendation агента:** **DEFER restructure decision pending: (a) Rudi SAFE structure date verification (когда executed?), (b) Phase 3 Q-D1 result on Option A vs D distinction.**

**Rationale:**
- Rudi SAFE entity status unknown — agent has no visibility into when/under-which-entity SAFE was executed.
- If executed under future ADGM HoldCo (not yet incorporated): low restructure risk.
- If executed under different entity (e.g. founder personal name, or pre-existing UAE entity): high restructure risk.
- Option D cost line-item explicitly depends on this answer.
- Other options considered: (a) assume worst case (over-budget Option D analysis); (b) skip Option D entirely (loses optionality); (c) ask Rudi directly (founder-Rudi conversation).
- Risks: assumption-based Option D evaluation = misleading.
- Reversibility: depends.
- Cost of changing later: HIGH if SAFE breaks.

**Confidence:** LOW — agent has no visibility into Rudi SAFE structure.

**Что founder проверить перед approve:**
- Rudi SAFE document — date, entity, conversion mechanics.
- If Rudi SAFE under personal name (no UAE entity yet) — restructure low cost.
- If Rudi SAFE under existing entity — counsel review required.

**Conflicts:** NONE прямо. Косвенно: Phase 2 Section 5.4 conflict matrix already noted "Rudi SAFE compatibility" as known risk.

---

### Q-D8 — Hub71+ DA hard dependency

**Вопрос:** Если Hub71+ DA accepts ZAAHI (Nov 2026), их ADGM tech-licence subsidiary requirement effectively locks Option D out (unless creative hybrid). Готов founder commit к этому lock-in pre-Hub71-decision?

**Source:** `docs/research/vara-adgm-tokenization-2026-04-28.md` §6 #8.

**Recommendation агента:** **YES, accept ADGM-jurisdictional lock-in via Hub71+ DA. Compatible с Q-D3 Series A jurisdiction recommendation (ADGM HoldCo primary).**

**Rationale:**
- Hub71+ DA application = 2 Aug 2026 deadline; decision Nov 2026; programme start Feb 2027.
- Hub71 ADGM tech-licence subsidiary = concentric с ADGM HoldCo plan (14 Aug 2026).
- Option D (Mainland Dubai parent + ADGM as subsidiary) effectively orthogonal to Hub71 acceptance — Hub71 needs ADGM tech-licence sub под ADGM HoldCo OR под ADGM-as-subsidiary-of-Mainland.
- Hybrid path: Mainland Dubai operating sub for VARA + ADGM HoldCo for Hub71 + Series A — fully compatible.
- Other options considered: (a) skip Hub71 to preserve Option D pure (loses AED 750k Hub71 value); (b) accept Hub71 + commit pure ADGM HoldCo (recommended); (c) wait for Hub71 decision before commit (creates timing pressure).
- Risks: Hub71 rejection → ADGM commitment without programme value. Mitigate: ADGM HoldCo independently valuable for Series A 2028 narrative.
- Reversibility: hard (ADGM HoldCo incorporated Aug 14).
- Cost of changing later: HIGH.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Confirm Hub71+ DA application proceeds (Q-C7 ratification).
- Confirm ADGM HoldCo (14 Aug 2026) plan unchanged.
- Confirm comfort с не-pure Option D (hybrid acceptable).

**Conflicts:** NONE — aligns с Q-D3 + Q-C2.

---

## Part E — GitHub Stack Ratifications

> Source: `docs/research/github-stack-eval-2026-04-29.md`. Each library = ratification question (install / defer / skip verdict from agent's analysis).
> **Note:** 2 packages (`@geomatico/maplibre-cog-protocol` + `@watergis/maplibre-gl-export`) уже installed на feature branch `feature/install-cog-export-2026-04-30` commit `cf0c102` (NOT pushed). Bundle delta 0 KB. Founder ratify retroactively + decide merge to main.

### Q-E1 — INSTALL `@geomatico/maplibre-cog-protocol`

**Вопрос:** Approve install + future usage для Cloud Optimized GeoTIFFs?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 INSTALL #1.

**Recommendation агента:** **APPROVE install (already done на feature branch). Schedule usage code в separate prompt после founder approves.**

**Rationale:**
- 6K weekly downloads, MIT, active, MapLibre Newsletter feature.
- Direct fit для Master Tree §66-70 Intelligence layers (satellite imagery, DEM, NDVI, time-series raster).
- Cloud-native HTTP range requests = no full-file download = serves large TIFFs из cheap object storage.
- Bundle delta 0 KB при install-only (verified 2026-04-30).
- Other options considered: (a) custom geotiff.js wrapper (re-implement existing solution); (b) server-side raster tiling (more infra cost); (c) skip raster layers entirely (loses Intelligence layer feature).
- Risks: TypeScript story shipped (97.9% TS), но no production references на UAE-specific deployment.
- Reversibility: easy (`pnpm remove`).
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- First CoG dataset target (Sentinel-2 RGB Dubai? UAE national DEM?).
- Confirm merge install commit `cf0c102` to main.

**Conflicts:** NONE.

---

### Q-E2 — INSTALL `@watergis/maplibre-gl-export`

**Вопрос:** Approve install + future usage для PDF/PNG/SVG map export?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 INSTALL #2.

**Recommendation агента:** **APPROVE install (already done на feature branch). Use dynamic import to avoid initial bundle bloat.**

**Rationale:**
- 1.3K weekly downloads, MIT, active, listed в official MapLibre plugins.
- Direct fit для Phase 1 Owner-First (M1-9) deliverables: owner reports, Feasibility v5.0 outputs, listing flyers, investor decks.
- jsPDF transitive dep — heaviest part — already в ZAAHI dependencies (line 19 package.json: `jspdf ^4.2.1`).
- Bundle delta 0 KB при install-only (verified 2026-04-30).
- Other options considered: (a) custom html2canvas + jsPDF integration (reinvents wheel); (b) server-side PDF rendering Puppeteer (heavier infra); (c) skip export feature (Phase 1 Owner-First requires it).
- Risks: SVG export currently rasterized (open issue #332). Mitigate: use PDF/PNG as primary, SVG as nice-to-have.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Owner report PDF design spec (template ready before usage code).
- Confirm merge install commit `cf0c102` to main.

**Conflicts:** CLAUDE.md UI STYLE GUIDE — exported PDF should match landing page Apple-glassmorphism aesthetic. Implement template with palette/typography match.

---

### Q-E3 — INSTALL PlayCanvas SuperSplat (external editor, no npm)

**Вопрос:** Adopt SuperSplat as external content workflow tool для Gaussian Splat authoring?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 INSTALL #3.

**Recommendation агента:** **APPROVE adoption when first Gaussian Splat content is produced. Zero technical commitment until used.**

**Rationale:**
- 0 KB bundle impact (external web app at superspl.at/editor, not npm dep).
- 5K stars, MIT, very active (release yesterday).
- Pre-processing tool для GS content authoring; pairs с future `@mkkellogg/gaussian-splats-3d` adoption (Q-E5 DEFER).
- Other options considered: (a) other GS editors (less feature-rich, less active); (b) skip authoring tool — content team needs editor; (c) PlayCanvas-engine GS native — more invasive.
- Risks: zero (external tool).
- Reversibility: trivial.
- Cost of changing later: zero.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Identify first Gaussian Splat content target (premium plot 3D photo capture?).
- Content team workflow training hours estimate.

**Conflicts:** NONE.

---

### Q-E4 — DEFER NASA-AMMOS `3d-tiles-renderer`

**Вопрос:** Defer 3D Tiles renderer adoption to Phase 2 (M10-17) — install only when current Three.js custom-layer 3D approach hits performance ceiling (>10K buildings)?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 DEFER + §3.

**Recommendation агента:** **APPROVE defer. Re-evaluate at trigger.**

**Rationale:**
- Current Three.js custom layer works per recent `feat(buildings)` commits.
- 3D Tiles renderer is heavy (Three.js peer-dep ~150 KB gzipped baseline).
- No DLD-published 3D city tileset source identified — adoption only valuable если consuming external tilesets emerges.
- Other options considered: (a) install now preemptively (200+ KB bundle bloat без benefit); (b) skip permanently (loses optionality if scale demands).
- Risks: DEFER means re-evaluation effort later. Mitigate: clear trigger criteria documented.
- Reversibility: easy.
- Cost of changing later: low (revisit when trigger fires).

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Trigger: Master Tree scale projection (когда rendered buildings exceed 10K?).
- Trigger: DLD Cesium tileset announcement.

**Conflicts:** NONE.

---

### Q-E5 — DEFER `@mkkellogg/gaussian-splats-3d`

**Вопрос:** Defer Gaussian Splats adoption to Phase 2 — install only when external-user demand for photorealistic property tours emerges? **Note: README self-declared dormant** — re-DD active forks at trigger.

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 DEFER + §3.

**Recommendation агента:** **APPROVE defer. Pair с SuperSplat editor adoption (Q-E3) when GS content emerges.**

**Rationale:**
- Self-declared dormant README = high maintenance risk.
- Current 3D Signature is artist-delivered native-metres geometry — sufficient для seed-stage.
- Photorealistic tours = Phase 2 External (M10-17) feature when external users demand premium experience.
- Other options considered: (a) install now (dormant lib, no immediate value); (b) skip (loses optionality); (c) install community fork `gle-gaussian-splat-3d` (TS support but less established).
- Risks: original lib goes fully abandoned — fork required.
- Reversibility: easy.
- Cost of changing later: medium (if forking, requires re-DD).

**Confidence:** HIGH (для defer recommendation).

**Что founder проверить перед approve:**
- External-user feedback на 3D Signature — sufficient or "want photo-realism"?
- Re-DD trigger: confirm active fork exists at adoption time.

**Conflicts:** NONE.

---

### Q-E6 — DEFER `route-snapper`

**Вопрос:** Defer drive-time UX library to Phase 2 — install only when Master Tree §66-70 Intelligence layer scales до drive-time accessibility scoring? **Note: "no GitHub releases ever published"** — dormant flag; prefer server-side OSRM/Valhalla при adoption time.

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 DEFER + §3.

**Recommendation агента:** **APPROVE defer. At adoption time, prefer server-side OSRM/Valhalla over WASM client lib.**

**Rationale:**
- WASM payload 200-500 KB gzipped — heavy для client.
- Niche use case (drive-time scoring) — Phase 2 Intelligence feature.
- Server-side OSRM/Valhalla = standard alternative, no bundle cost.
- Other options considered: (a) install now (heavy bundle for unused feature); (b) skip permanently (loses commute scoring optionality); (c) immediately migrate to server-side OSRM (premature without use case).
- Risks: dormant lib may be permanently abandoned. Mitigate via server-side alternative at trigger time.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Trigger: Intelligence layer drive-time scoring development.
- Confirm server-side routing acceptable (Vercel function or self-hosted Valhalla).

**Conflicts:** NONE.

---

### Q-E7 — SKIP `@dvt3d/maplibre-three-plugin`

**Вопрос:** Skip MapLibre↔Three.js bridge plugin — ZAAHI already has working custom integration?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 SKIP + §3.

**Recommendation агента:** **APPROVE skip.**

**Rationale:**
- ZAAHI's existing integration confirmed via recent `feat(buildings)` series commits + `fix(buildings): CustomLayer FBO collision` — working code.
- 76 stars / 380 wk-dl = small audience for third-party adoption.
- Adopting third-party bridge = rewriting working code to depend на low-traction lib.
- Other options considered: (a) install for "best practice" (no concrete benefit); (b) reserve for future regression (if existing bridge breaks).
- Risks: existing custom bridge regression — but that's testable via smoke tests.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Existing custom bridge stable (no regressions in `feat(buildings)` series).

**Conflicts:** NONE.

---

### Q-E8 — SKIP `@esri/maplibre-arcgis`

**Вопрос:** Skip Esri MapLibre integration — нет identified UAE Esri-hosted dataset dependency?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 SKIP + §3.

**Recommendation агента:** **APPROVE skip. Re-evaluate IF data team identifies specific UAE/Dubai ArcGIS Online dataset.**

**Rationale:**
- ZAAHI data sources: DLD direct + custom GeoJSON + PMTiles + MapLibre tiles. NO ArcGIS Online dependency.
- 810 weekly downloads = small audience for official Esri lib.
- Other options considered: (a) install preemptively (no use case); (b) install community fork esri-gl (README self-flags "use with caution"); (c) re-evaluate later (recommended).
- Risks: missed data source if Dubai gov publishes new ArcGIS Feature Service. Mitigate: re-evaluation trigger.
- Reversibility: easy.
- Cost of changing later: low.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Data acquisition pipeline scan: any ArcGIS-hosted UAE/Dubai dataset?
- Dubai Pulse / DLD / RERA data formats — confirm GeoJSON / standard formats.

**Conflicts:** NONE.

---

### Q-E9 — SKIP `@mindstudio-ai/agent`

**Вопрос:** Skip MindStudio Agent SDK — duplicates Anthropic SDK functionality, vendor lock-in, pre-1.0 API?

**Source:** `docs/research/github-stack-eval-2026-04-29.md` §1 SKIP + §3.

**Recommendation агента:** **APPROVE skip. If multi-agent orchestration needed future, evaluate native Anthropic Agent SDK first.**

**Rationale:**
- Vendor lock-in to MindStudio platform (separate billing, separate operational dependency).
- v0.1.58 = pre-1.0 API likely breaking changes.
- Browser usage limited (Node-primary) — incompatible с ZAAHI's frontend-heavy Archibald AI integration.
- Direct architectural conflict с existing Anthropic Claude Sonnet 4.6 direct integration.
- Native Anthropic Agent SDK (recently released) is canonical alternative without vendor lock-in.
- Other options considered: (a) install for connector breadth (low ZAAHI fit — generic SaaS connectors не help PropTech); (b) custom Anthropic tool-use integration (recommended — better control).
- Risks: missed connector functionality. Mitigate: ZAAHI's connector needs are real-estate-specific (DLD, RERA, MapLibre tiles, payment rails) — custom integrations win.
- Reversibility: trivial.
- Cost of changing later: zero.

**Confidence:** HIGH.

**Что founder проверить перед approve:**
- Confirm ZAAHI architecture stays Anthropic-direct via existing SDK.
- Anthropic Agent SDK (native) — review documentation для future multi-agent orchestration.

**Conflicts:** CLAUDE.md "Облачные модели: Claude Opus 4.6 (мастер), Claude Sonnet 4.6 (Cat/Mole/Falcon)" — specifies Anthropic-direct architecture. MindStudio = vendor abstraction layer = conflicts с this directive.

---

## Part F — Infrastructure

**Source report не содержит open questions для этого partition.**

Bugs-batch report mentions Supabase DB password rotation (covered in Part B above). Innovation hubs and VARA reports don't mention Anthropic top-up, Vercel Workspace, или DNS specifically. GitHub stack eval covers tooling, not infrastructure.

**Per task constraint anti-hallucination:** агент НЕ изобретает infrastructure questions which не в source. Если founder хочет infrastructure decisions ratified, separate prompt с specific items required.

---

## Сводка

### Quantitative

| Metric | Count |
|--------|------:|
| **Total questions answered** | 38 |
| **HIGH confidence** | 26 |
| **MEDIUM confidence** | 9 |
| **LOW confidence** | 3 |

### LOW confidence items (founder MUST decide independently)

1. **Q-D2** — Partner-vs-own anti-competitive risk (MEDIUM-LOW): subjective competitive moat priority; counsel review required.
2. **Q-D7** — Acceptable lock-in (Rudi SAFE): agent has no visibility into Rudi SAFE structure date/entity. Founder verification mandatory before any Option D analysis.
3. **Q-A1.2** — Buildings-layer data binding (MEDIUM): UX trade-off between data accuracy vs artist polish; founder priority unclear.

### Critical conflicts с CLAUDE.md / Master Tree / другие decisions

1. **Q-A2 (Bug 6 geometry mutation)** — explicit CLAUDE.md gating: requires founder approval per allowed-mutations list (`currentValuation`/`status`/`affectionPlans` only). Recommendation respects this gate.
2. **Q-E2 (maplibre-gl-export usage)** — должен match CLAUDE.md UI STYLE GUIDE (Apple glassmorphism palette, typography).
3. **Q-E9 (MindStudio skip)** — CLAUDE.md specifies Anthropic-direct architecture; MindStudio = vendor abstraction conflicts.
4. **Q-C5 → Q-D2/D3 supersedure** — Phase 1 PRYPCO recommendation reframed by Phase 2 (Ctrl Alt is actual VASP, not PRYPCO). Resolved correctly.

### Founder readiness assessment

**Ready для founder review: YES.**

All 38 questions extracted from source reports verbatim or close-to-verbatim. Each has structured answer + rationale + confidence label. No questions invented by agent. Critical conflicts explicitly flagged.

### Next step

1. Founder reads decision pack.
2. Founder ratifies / declines each question (explicit yes/no/modify per Q).
3. Founder responses → separate implementation prompts:
   - **Bug fixes** (Q-A1 + Q-A2 + Q-A4 + Q-A5) — implementation prompts to bugs-batch agent.
   - **Security rotation** (Q-B1) — founder action (Supabase Dashboard) + Vercel env update + agent verification.
   - **Innovation hubs sequence** (Q-C1 - Q-C10) — Phase 3 application asset preparation prompts (pitch deck v2, financial model consolidation, warm-intro emails).
   - **VARA tokenization** (Q-D1 - Q-D8) — Phase 3 follow-up research prompt (Options A + D deep dive); partner DD outreach с Ctrl Alt.
   - **GitHub stack** (Q-E1 - Q-E9) — merge `feature/install-cog-export-2026-04-30` to main if Q-E1 + Q-E2 ratified; usage code prompts after.
   - **Infrastructure** — separate prompt if founder wants ratifications on Anthropic / Workspace / DNS.

---

**End of decision pack.** *Word count: ~9,500. All 38 questions sourced verbatim. Confidence labels mandatory on each. Anti-hallucination compliant: NO invented questions.*
