# ZAAHI — active backlog

**Maintained from:** 2026-09-04 · **Reflects `main` @ `bea3fbe`**

This file exists because the product's priority order lived only in a Telegram
thread. It is now in the repo, and it is updated as part of doing the work — not
afterwards, and not from memory.

## Two backlogs, deliberately

| File | Holds | Rule |
|---|---|---|
| **`docs/BACKLOG.md`** (this file) | The **active queue** — reported defects, decisions pending, risks with a clock, dependency debt | Updated every time a task changes state |
| **`/BACKLOG.md`** (repo root) | **Parked** work — things explicitly deferred until a founder says otherwise (Prisma FK/default drift, vector-basemap migration) | Untouched unless a founder un-parks an item |

`CLAUDE.md` currently points only at the root file. **Founder decision needed:**
add a pointer here too, or fold one into the other. Not changed unilaterally.

---

## Provenance — read this before trusting a number in the ID column

The founder's QA sweep of 2026-08-27 was submitted through Archie in numbered
parts and discussed in Telegram, where the issue numbers and the approved
implementation order were assigned. **Those numbers were never written to the
repo.** Reconstructing them exactly is not possible from here.

What IS anchored in the repo, and is therefore authoritative:

| ID | Anchor |
|---|---|
| **#1** | `mixedUse.ts` — *"the same distinction the land-price guard draws in #1"* → unpriced-plot guard |
| **#2**, **#3** | `584c4c5` — *"Branch 1 of 2 for issues #2 and #3"* → mix inputs inert; composite totals contradict |
| **#23** | `bridge/queue/…-044101-b6b707.json` — *"that is issue #23, later in the queue"* → parcel-navigator empty label |
| **#25** | `ef1371f` — *"issue #25 … is sixth in the approved order"* → duplicate feedback submissions |

Every other row below is keyed by **bridge task id**, which is unambiguous, and
by **PART number** where the founder used one. No issue number is invented. If
you paste the numbered list back, the ID column can be completed in one pass.

**Note on `#19`:** `51c926d` mentions "Email/SMS issue #19". That belongs to an
older §77 white-label audit, not this sequence. Do not conflate them.
**Note on `backlog #4 / #9 / #11`:** a third, separate founder-backlog sequence
(`e5300af`, `f1bcd9a`, `36b9ea9`). Also not this sequence.

### What the raw record contains

16 reports on disk (`~/reports.txt` 13 + `~/reports2.txt` 3), 14 bridge tasks.
The two reports with no task are the founder **resubmitting PART 3 (14:52 UTC)
and PART 4 (15:16 UTC)** — item-for-item duplicates of tasks that were created.
Nothing was lost. One intake was refused by the bridge's 3/hour rate limit
(`bridge.log`, 04:51:36Z), which is what those resubmissions ran into.

**Part numbers present: 1, 3, 4, 5, 20, 23, 24.** The sweep reached at least
PART 24 and the text references a PART 21 that is not on disk. **Parts 2 and
6–19, 21, 22 were never received by the bridge.** If they were sent, they are
only in Telegram. This is the single biggest known gap in this file.

---

## 1 · Shipped since the sweep

| ID / Task | What | Landed |
|---|---|---|
| **#1** `…-031907-72a9fc` | An unpriced plot can no longer report a positive ROI | `616df6d` |
| **#2 / #3** `…-032043-793308` | Mixed-use model completed (branch 1 — no number moved) | `9f89a9c` |
| **#2 / #3** — | **Mix now drives the headline** (branch 2). Every published mixed-use ROI moves; founder reviewed and accepted the deltas | `bea3fbe` |
| PART 3 `…-032226-e597e0` | Dark basemap off CARTO → Esri Dark Gray Canvas | `b7fde30` |
| PART 20 `…-043937-9664e3` | Retry affordance on WebGL context loss + post-paint re-measure | `0f45e82` |
| PART 23 (composer half) `…-044101-b6b707` | Archie composer reachable on a short viewport | `f0b381c` |
| — | **Light basemap off CARTO** + five other CARTO call sites; dead `src/lib/basemaps.ts` deleted | `26c1312` |
| — | `next` 15.5.14 → 15.5.25, closing 22 advisories | `789a022` |

---

## 2 · Open — awaiting founder approval

All eight have been sitting at `awaiting_plan_approval` since **2026-08-28**.
The bridge is running and idle; these advance only on a button press.

Order below is **my triage-severity ranking, not the founder's approved order** —
that order is in Telegram. Confirm or override it.

| # | ID / Task | What | Blocked on |
|---|---|---|---|
| 1 | `…-033112-e6366e` | Hospitality engine on Build-to-Rent zeroes every KPI (Yield 0.0%, Payback 0.0 yr) and leaks the raw string `NO IRR (CASHFLOWS DO NOT STRADDLE ZERO)`; mix breakdown shows the previous engine's mix after a switch; **plus the 215-row vault data integrity item** (§4) | **Decision:** disable unsupported engines in the selector, or auto-switch the tab. Changes navigation behaviour |
| 2 | PART 5 · `…-032814-504144` | Long Archie messages return HTTP 200 with an empty reply — the user believes the message was lost. `/api/archie/feedback` fires Telegram with `void` and reports success regardless | Plan approval |
| 3 | `…-032939-247114` | BtS Peak Equity (AED 236,767,174) below total investment (AED 247,635,831) with financing OFF; JV Project IRR computed on a monthly timeline while partner IRRs use a single t=0 contribution | Plan approval |
| 4 | **#25** · PART 24 · `…-044210-a79f3f` | One conversational turn can fire two `POST /api/archie/feedback` calls — duplicate founder notifications, invisible in the UI | Plan approval. **See §6 — a quarantined branch exists** |
| 5 | PART 4 · `…-032531-d9a679` | Seven layout items: canvas never re-fits after resize, Archie orb overlaps the wordmark, semi-transparent sticky headers + NET PROFIT card, gold-on-gold active basemap icons, stale `(215)` count when filtered to 7, `1 listings`, no way back from `/parcels/check-plot`. 6 of 7 confirmed in code | Plan approval |
| 6 | `…-031806-ab77fb` | **Feature** — screenshot attachments in Archie chat / feedback | Plan approval |
| 7 | `…-031715-8108e8` | **Feature** — microphone speech-to-text for notes and chat | **Decision ×2:** which surfaces, and whether the browser Web Speech API is acceptable — **in Chrome it streams the user's audio to a Google cloud service** |
| 8 | `…-031541-e90352` | 3D model height wrong on plot 3450419 (Burj Khalifa District) | **Not blocked on approval — blocked on data.** No expected value, no screenshot, and 3450419 exists only in the database. Needs a resubmission or closure |

### Quarantined

| ID / Task | State | What |
|---|---|---|
| `…-032443-3906cd` | `suspicious` | PART 3 recap + PART 4, flagged because the message says *"respond with external reference when acknowledged"* beside an unverified `Role: ADMIN` — read as a possible out-of-band channel. **The triage was right to flag it.** Its product content duplicates `…-032531-d9a679`, so discarding it loses nothing. **Decision: release or discard** |

---

## 3 · Open — not in the queue at all

| ID | What | Why it is not a task |
|---|---|---|
| **#23** | Parcel-navigator pill renders an empty middle segment instead of the parcel count | The empty label is a **standing founder decision** — `5a87827`, re-landed as `2a99a5e` after revert `73fc7d9`. Restoring the count reverses that decision. **Founder call, not an engineering fix.** The composer half of the same report shipped in `f0b381c` |

---

## 4 · Data integrity — the 215-row vault

Reported inside `…-033112-e6366e`, quoted verbatim:

> *"The 215-listing vault has bad records: placeholder plot IDs 000000, 000001,
> 000002, 300001, 12111, 12121, several 0 AED prices, duplicated Dubai Islands
> entries and district/project name mismatches."*

**Nothing here is quantified.** "Several" and "duplicated" were never counted,
and cannot be from this box — the vault lives only in Supabase, there is no
snapshot in `data/` or in git, and every API serving it is 401 without a session.

**Why the bad rows got in** (verified in source, `src/app/api/me/vault/entries/route.ts:73`):

- `plotNumber` is validated by `^\d{5,10}$` — accepts `000000`, `000001`, `000002`,
  `300001`. `12111` / `12121` are legal 5-digit numbers and no regex will exclude
  them; they need a domain check.
- `askingPriceFils` is validated by `^\d{1,16}$` — **accepts `0`**.
- Uniqueness is `(ownerId, emirate, district, plotNumber)`, so the same plot under
  a different district label is not a duplicate. That is exactly the reported
  "duplicated Dubai Islands entries + district mismatch" pattern.

**Run this before any write.** Read-only, against a replica or a read-only role:

```sql
SELECT
  count(*)                                             AS total,
  count(*) FILTER (WHERE "askingPriceFils" IS NULL
                      OR "askingPriceFils" = 0)        AS zero_or_null_price,
  count(*) FILTER (WHERE "plotNumber" ~ '^0+[0-9]*$')  AS leading_zero_placeholder,
  count(*) FILTER (WHERE "plotNumber" IN
        ('000000','000001','000002','300001','12111','12121')) AS named_placeholders
FROM "VaultEntry";

SELECT "plotNumber", count(*) AS n, array_agg(DISTINCT "district") AS districts
FROM "VaultEntry" GROUP BY "plotNumber" HAVING count(*) > 1 ORDER BY n DESC;
```

**Standing rule, from the triage and from `CLAUDE.md`:** no vault row is deleted
or rewritten without per-row founder approval. Produce the read-only audit first.

---

## 5 · Risks with a clock

### R-1 · Esri legacy endpoint — **filed, deliberately not acted on**

**What:** all four basemaps (Light, Dark, Satellite, Hybrid) now serve from
`server.arcgisonline.com`, via `src/lib/basemap-tiles.ts`.

**The risk:** these are **legacy** ArcGIS tile services. Esri's developer
documentation places `services.arcgisonline.com` / `server.arcgisonline.com` in
**"mature status"** — no longer updated — and Esri's guidance is that
applications should have migrated to the authenticated ArcGIS basemap services
(API key / ArcGIS Location Platform account) **by 2022-04-30**. Attribution of
both basemap *and* data is a stated condition.

**So:** on 2026-08-28 Dark moved off CARTO the week CARTO began requiring a key,
onto a provider that has required one on paper for four years and simply has not
enforced it on the legacy endpoint. On 2026-09-04 Light followed. That is the
same failure mode, one step later, and it is now the whole map rather than one
basemap.

**Status:** serving fine (probed 2026-09-04, all four → HTTP 200, LOD 23).
**No shutdown date is announced — UNVERIFIED whether Esri intends one.**

**Options when it matters:** an Esri Location Platform account + API key (keeps
the current look); a keyed CARTO account (free tier: 5M tile requests/month, key
issued instantly without an account); or self-hosting vector tiles, which also
removes `fonts.openmaptiles.org` (R-3) and is already parked in the root backlog
as "Vector basemap migration".

**Trigger to act:** any Esri deprecation notice, any watermark or 4xx on an
arcgisonline tile, or the vector-basemap migration being un-parked. The e2e
check `(h)` catches a CARTO regression but **does not** catch Esri degrading —
it asserts Esri tiles return 200, so a watermark would pass silently.

### R-2 · Cloudflare `r2.dev` serving production PMTiles

`NEXT_PUBLIC_TILES_BASE_URL` → `https://pub-eb193cdc5fe84cc6aac0373ef3dfa069.r2.dev`.
Cloudflare documents r2.dev public bucket URLs as **rate-limited and "should only
be used for development purposes"**; no cache, access-management or bot-management
features, and CNAMEing to it is an unsupported access path. No expiry — the risk
is a throttle that arrives exactly when traffic does. **Fix: a custom domain
(`tiles.zaahi.io`) on the same bucket.** All three assets serve today (HTTP 206).

### R-3 · `fonts.openmaptiles.org`

Every basemap style sets `glyphs:` to this free community host. No key, no
published quota, no SLA, no contract. If it stops, every text label on the map
disappears while tiles keep painting — a silent partial failure. Self-hosting the
glyph set is a one-off ~10 MB upload to the bucket already serving the tiles.

### R-4 · Dated items

| Item | Date | Action |
|---|---|---|
| **Domain `zaahi.io`** | expires **2027-04-09** | Confirm auto-renew at Namecheap, and that the registrant contact still receives mail. 2 minutes; a lapsed `.io` is not gracefully recoverable |
| TLS (apex / www) | 2026-11-10 / 11-12 | None. Let's Encrypt via Vercel, auto-renews ~30 d out. Breaks silently only if DNS moves off Vercel |
| Node 22 | EOL **2027-04-30** | In maintenance since 2025-10-21. Plan the Node 24 move for Q1 2027 |
| DNSSEC | — | `zaahi.io` is unsigned (`delegationSigned: false`). Hardening, not urgent |

---

## 6 · Branches

### Quarantined — decision needed

**`archie/20260828-044210-a79f3f-one-conversational-turn-with-arc` @ `ef1371f`**
— **local only, never pushed.** 3 files, +120/−5. Gates never run, never
reviewed. Produced when the poller drained a backlog of stale Approve presses on
startup and began implementing **#25** sixth-out-of-order, then was killed
mid-run. Root cause already fixed by `888f9ce`. **Re-run the task properly when
#25 comes up, or delete the branch.** It is invisible to anyone else and cannot
be merged by accident.

### Unmerged, worth a decision

| Branch | Head | What |
|---|---|---|
| `feat/backlog-batch-2` | `d36ecd4` | **Founder backlog #7, #10, #13, #33** — area 1:1 no rounding, Floors row, PMTiles search, UI sounds. Complete since 2026-06-12, never merged. **Assessment requested — pending** |
| `research/landuse-archetypes` | `ecefe7f` | **FROZEN by founder** — merge-ready, deferred pending a 3D-method decision |
| `fix/tsx-guard-2026-08-12` | `6392bb2` | Gates DB-writing scripts behind `ALLOW_PROD_WRITE`, adds a real typecheck |
| `fix/plot-lookup-2026-08-19` | `085ab05` | Likely superseded by `84d7aae` — verify before deleting |
| `docs/secrets-audit-2026-08-27` | `df13cd9` | The audit document itself is still not on `main` |
| `docs/landuse-palette-2026-08-10` | `4181a6c` | Ratifies the in-code palette, supersedes the 2026-04-11 table |
| `research/bug-consolidation-2026-08-10` | `cb5ab5f` | Consolidated master bug list — 33 open, 16 fixed, 4 stale |
| `research/full-audit-2026-08-20` | `efdf2a3` | Full-surface audit of uncovered areas |

Merged and safe to delete: the five `archie/2026-08-28-*` branches, plus
`fix/light-basemap-esri-2026-09-03`, `feat/mixeduse-headline-2026-09-04`,
`fix/next-security-2026-08-10`.

Rollback tags on origin: `pre-merge-2026-08-26`, `pre-merge-2026-09-03`.

---

## 7 · Dependency advisories — 24 high, 38 moderate, 7 low

`pnpm audit` on `main` @ `bea3fbe`, 597 dependencies. **0 critical.** The 22
`next` advisories are closed (`789a022`). Everything remaining is **transitive** —
none is a direct dependency of ours, so none can be fixed by editing
`package.json` alone.

| Module | High | Mod | Low | Reached via | Assessment |
|---|---|---|---|---|---|
| `fast-uri` | 7 | — | — | `prisma` → `@prisma/dev` → `ajv` | SSRF / host confusion. **Build-time and dev-server only** — `@prisma/dev` is not in the request path. Waits on a Prisma release |
| `brace-expansion` | 3 | — | — | `eslint`, `eslint-plugin-react-hooks` | **Dev-only.** DoS via exponential expansion. No production exposure |
| `nanoid` | 3 | — | — | `next` → `postcss` | Build-time CSS pipeline. Not a runtime id generator for us |
| `postcss` | 2 | 2 | — | `next`, `@tailwindcss/postcss` | Arbitrary file read via crafted CSS. **Build-time**, on our own stylesheets |
| `image-size` | 2 | — | — | `@deck.gl/mesh-layers` | Parser DoS. Only reachable if we decode untrusted images through deck.gl — we do not |
| `browserslist` | 2 | — | — | `next` → `styled-jsx` → `@babel/core` | Unbounded memory from untrusted `browserslist-stats.json`. Build-time, our own config |
| `hono` | 1 | 19 | 2 | `prisma` → `@prisma/dev` | CORS reflection. **Prisma's dev server, never deployed** |
| `ws` | 1 | 1 | — | `@supabase/supabase-js`, `ethers` | Memory-exhaustion DoS. **The one with a plausible runtime path** — worth confirming whether either opens a socket in production |
| `mysql2` | 1 | 1 | — | `prisma` | Auth-plugin downgrade leaking plaintext credentials. **We use PostgreSQL — the MySQL driver is never loaded** |
| `sharp` | 1 | — | — | `next` | libvips CVEs via Next image optimisation |
| `deepmerge-ts` | 1 | — | — | `prisma` → `@prisma/dev` | Stack exhaustion. Dev-server only |
| `dompurify` | — | 10 | 4 | `jspdf` | XSS in sanitisation. `jspdf` builds the feasibility PDF **from our own values, not user HTML** |
| `@hono/node-server`, `valibot` | — | 3 | — | `prisma` → `@prisma/dev` | Dev-server only |
| `uuid` | — | 1 | — | `resend` | — |
| `fflate` | — | 1 | — | `pmtiles`, `jspdf`, `@types/three` | Infinite loop on malformed ZIP64. PMTiles reads **our own** tiles |
| `esbuild` | — | — | 1 | `tsx` | Dev-only |

**Honest read:** the large majority sit behind `@prisma/dev` (a dev server that
is never deployed), the ESLint toolchain, or the build pipeline. `ws` is the one
worth a look. **None of this is a reason to hold a release**, and none is
individually actionable today — they clear when Prisma, Next and ESLint publish
updated trees.

**Re-check trigger:** run `pnpm audit` after any Prisma or Next upgrade, and act
if anything appears that is (a) critical, or (b) high **and** on a request path.
`next@16` is available and is a separate major — not scheduled.

---

## 8 · Engineering debt

Carried from `docs/HEALTH_2026-08-28.md`; the items closed today are removed.

| Item | Where | Note |
|---|---|---|
| **GitHub Pages fails on every push** | repo settings | 402 consecutive failed runs on a **public** repo. No workflow was ever committed — it is GitHub's dynamic Pages workflow, created by the Pages *setting*, and it gets no repo secrets. **Fix: Settings → Pages → Source: None.** One setting, zero value lost |
| **Bridge CTO email has never delivered** | `bridge/.env` | `SMTP_HOST` unset. All five merged tasks carry `email: {ok:false, "SMTP host is not configured"}`. The Telegram fallback works, so nothing was lost — but a channel named "email hand-off to the CTO" should either work or stop being described that way |
| **`/api/archie/feedback` rate limit is not enforced** | `route.ts:49-92` | `RATE_LIMIT_PER_HOUR = 3` and the 24h dedup both live in module-scope `Map`s. On Vercel they reset on every cold start and are not shared across lambdas. The 429s seen during QA were instance affinity, not policy. Either move the counter to Postgres — the `createdAt`+`userId` rows the code's own comment calls "authoritative" already exist — or drop the pretence |
| **Bridge intake rate limit drops founder reports** | `bridge/.env` | `MAX_TASKS_PER_HOUR=3` refused an intake during the QA sweep. Logged and auditable, but the report does not resurface on its own. Consider queueing over refusing |
| **12 eslint warnings** | — | 5 are stale `eslint-disable` directives (`--fix` clears them, zero risk) and camouflage the other 7. 1 is `mapRef.current` read in an effect cleanup (`useBuildingsLayer.ts:431`) — the shape that removes a layer from the wrong map after a basemap swap. 6 are `exhaustive-deps`; the four in `page.tsx` are deliberate mount-once effects — **do not auto-fix** |
| **`FeasibilityV6Calculator.tsx:808 / :1543`** | — | Missing-dependency warnings on a `useMemo` and a `useCallback`, in the component where inputs were reported as inert. Pre-existing (`ac7ce70`), almost certainly unrelated — cheap to rule out |
| **Double map init** | `page.tsx:5142-5145` | Still the largest load-time cost on `/parcels/map`. 4-line fix, full analysis in `docs/research/perf-2026-08-21.md`. Deferred because it changes map init and wanted its own smoke test — **the harness now exists, so that reason has expired** |
| **`MiniMap.tsx` is dead code** | — | Unmounted 2026-06-01 by founder spec, zero render sites (BUG-029). Converted off CARTO rather than deleted, because deleting it is a separate call. **Delete?** |
| **Esri attribution incomplete** | `basemap-tiles.ts` | Label sources carry no `attribution`; Satellite credits only "© Esri World Imagery" where World_Imagery's own line is "Esri, Maxar, Earthstar Geographics". A stated licence condition — two lines |
| **`.gitignore` gaps + no secret scan** | — | Add `id_rsa*`, `*.pem`, `secrets.json`, `.npmrc`, `.netrc`; add `gitleaks` or `git-secrets` pre-commit. The audit is a snapshot; a hook is continuous, and the repo is public |
| **Only Chromium is installed** | `~/.cache/ms-playwright` | Cross-engine verification is currently impossible. `npx playwright install firefox` |

---

## 9 · Decisions waiting on a founder

| # | Decision |
|---|---|
| D-1 | **The approved order for §2.** Mine is triage severity; yours is in Telegram |
| D-2 | Task `…-032443-3906cd` (suspicious): release for triage, or discard |
| D-3 | `ef1371f`: re-run properly when #25 comes up, or delete |
| D-4 | **#23** — keep the empty parcel-navigator label (standing decision), or reverse it |
| D-5 | Mic feature: which surfaces, and is Web Speech API (audio → Google) acceptable |
| D-6 | Engine selector: disable unsupported engines, or auto-switch the tab |
| D-7 | Vault: produce the read-only 215-row audit first? No row is touched without per-row approval |
| D-8 | Plot 3450419: supply expected height + screenshot, or close as not actionable |
| D-9 | GitHub Pages: turn it off |
| D-10 | **Repo public or private.** It carries the investor package, P&L, competitor analysis and founder decision docs, all world-readable. No credential leak — a commercial exposure question |
| D-11 | Rotate any credentials? The secrets audit forces nothing. If you want to anyway: service_role → DB password → Telegram token → SMTP → AI keys → Resend |
| D-12 | `feat/backlog-batch-2`: merge or retire |
| D-13 | `MiniMap.tsx`: delete the dead component |
| D-14 | Does `CLAUDE.md` point here as well as at the root backlog? |

---

## 10 · Unverified — needs a dashboard or a credential

Nothing below can be checked from this machine. Each names exactly where to look.

| Item | Where |
|---|---|
| Vercel plan, build minutes, bandwidth, function limits, warnings | vercel.com → ZAAHI → Settings → Usage / Billing |
| Supabase plan, row / storage / egress limits, deprecation notices | dashboard → project `sydmaxwjmwwnzbwvhrhn` → Settings → Billing |
| `SUPABASE_SERVICE_ROLE_KEY` age | same → Settings → API (the JWT's `iat`) |
| `RESEND_API_KEY` validity + quota | resend.com → API Keys |
| OpenAI + Anthropic spend and rate limits | platform.openai.com · console.anthropic.com |
| **`POLYGON_PRIVATE_KEY` — is it set on Vercel?** | Settings → Environment Variables. **If it is, it is a spendable key** and belongs at the top of any rotation list |
| `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` | Settings → Environment Variables. Inferred `true` from the shipped bundle; `REGRESSION_REPORT.md` says it defaults false |
| `zaahi.io` auto-renew + registrant contact | namecheap.com → Domain List |
| The 215 vault rows (§4) | A read-only DB session |
| Anything behind `AuthGuard` | A staging account, or the e2e harness pointed at production |
| GitHub Actions log contents | Anonymous API returns 403 — open a failed run while signed in |

---

## Keeping this current

1. A task changes state → update §1 or §2 **in the same commit** as the work.
2. A new founder report arrives → add a row keyed by bridge task id, with the
   PART number if there is one. Do not invent an issue number.
3. A risk in §5 fires, or its trigger condition is met → move it to §2 with a date.
4. `pnpm audit` after any Prisma / Next / ESLint upgrade → refresh §7.
5. A decision in §9 is answered → record the answer and the date, then delete the row.

The failure this file exists to prevent: on 2026-08-28 the record said issues
#2/#3 were fixed while the product still behaved exactly as reported. State lived
in a chat log, the commit said "branch 1 of 2", and nothing reconciled the two
for a week. A backlog that is not updated as part of the work is a backlog that
lies.
