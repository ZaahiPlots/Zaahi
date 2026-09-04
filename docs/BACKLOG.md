# ZAAHI — active backlog

**Maintained from:** 2026-09-04 · **Reflects `main` @ `a76c452`+**

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

**Backfill in progress (2026-09-04).** The founder is recovering what they can
from the Archie conversations and forwarding it. Anything forwarded that way is
**backfill, not a new report**: file it under its original PART number with the
original 2026-08-27 timestamp, mark the source as `backfill/telegram`, and do
NOT let it re-enter the bridge as a fresh task — the bridge would date it 2026-09
and the sequence would lie a second time.

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
| 1 | `…-033112-e6366e` | **Partly shipped 2026-09-04** — see §2a. Sub-item (1) done; (2) needs a decision; (3) needs DB access | See §2a |
| ~~2~~ | PART 5 · `…-032814-504144` | **SHIPPED 2026-09-04** — `fix/archie-silent-failures-2026-09-04`. Both halves: the empty-reply path and the false "sent to founders" confirmation. See §2b | — |
| 3 | `…-032939-247114` | BtS Peak Equity (AED 236,767,174) below total investment (AED 247,635,831) with financing OFF; JV Project IRR computed on a monthly timeline while partner IRRs use a single t=0 contribution | Plan approval |
| 4 | **#25** · PART 24 · `…-044210-a79f3f` | One conversational turn can fire two `POST /api/archie/feedback` calls — duplicate founder notifications, invisible in the UI | Plan approval. **See §6 — a quarantined branch exists** |
| 5 | PART 4 · `…-032531-d9a679` | Seven layout items: canvas never re-fits after resize, Archie orb overlaps the wordmark, semi-transparent sticky headers + NET PROFIT card, gold-on-gold active basemap icons, stale `(215)` count when filtered to 7, `1 listings`, no way back from `/parcels/check-plot`. 6 of 7 confirmed in code | Plan approval |
| 6 | `…-031806-ab77fb` | **Feature** — screenshot attachments in Archie chat / feedback | Plan approval |
| 7 | `…-031715-8108e8` | **Feature** — microphone speech-to-text for notes and chat | **Decision ×2:** which surfaces, and whether the browser Web Speech API is acceptable — **in Chrome it streams the user's audio to a Google cloud service** |
| 8 | `…-031541-e90352` | 3D model height wrong on plot 3450419 (Burj Khalifa District) | **Not blocked on approval — blocked on data.** No expected value, no screenshot, and 3450419 exists only in the database. Needs a resubmission or closure |


### 2a · `…-033112-e6366e` — status, 2026-09-04

Three sub-items in one report. One shipped, one turned out to need a decision
rather than a fix, one is blocked on database access.

**(1) Unsupported engine/mode — SHIPPED** (`fix/engine-mode-gate-2026-09-04`).
Hospitality is `modes: ['bts']`, so on Build-to-Rent every KPI rendered as a
zero — Yield 0.0%, Payback 0.0 yr, Monthly AED 0 — with the raw internal
string `No IRR (cashflows do not straddle zero)` underneath. A "Mode not
supported" panel existed but sat *below* the hero, so the first thing on
screen was a confident set of zeros.

The gate now replaces the hero, the result rows and the PDF hero, in both
layouts. Nothing numeric renders for a mode the engine does not model —
**a zero is a measurement, and nothing distinguished "this engine has no
rental model" from "this asset yields nothing"**, only one of which is a
reason not to buy a plot. Total Investment is deliberately kept: land and
construction are modelled correctly, it is only revenue and returns that do
not exist.

**(2) "Mix breakdown shows the previous engine's mix" — NOT a fix; needs a
decision (D-18).** The observation is accurate, the proposed fix is not, and
after the branch-2 headline switch it would now be actively harmful.

Verified in source: **nothing engine-level feeds the Mix breakdown.** Every
input to `computeMixedUseBtSV6` is parcel-level or user-level —
`parentArea`, `shares`, `commissionPct` / `marketingPct` / `devServicesPct`
(a fixed 8.5 / … default, *not* engine-seeded and *not* re-seeded on engine
change), `land`, `finance`. Per-slice construction and sales psf come from
`shareToEngine(share)` — each slice's own engine, never the selected one.

So switching the top-level engine correctly changes nothing in the panel.
The triage proposed re-seeding `mixShares` on engine change. Since
2026-09-04 those shares **drive the headline**, so re-seeding would silently
discard a user's inputs and move every published number on an engine switch.

**The real question is a product one:** on a MIXED USE plot, should the
top-level engine selector do anything at all? Today it seeds the
single-engine model, which is the fallback the mix overrides. Options: hide
the selector on mixed-use plots; or keep it and label it as the fallback; or
make it re-seed the mix and accept losing edits. Founder call — D-18.

**(3) The 215-row vault — unchanged**, still §4. Needs a read-only DB
session; the SQL is written and waiting.

**Still open on this task:** the EngineSelector behaviour (D-6) — whether to
disable unsupported engines for the active tab or auto-switch the tab. The
gate above makes the current state honest either way, so D-6 is now a
polish decision rather than a correctness one.


### 2b · PART 5 — Archie's two silent failures, shipped 2026-09-04

Both halves of `…-032814-504144`. The common thread: the product reported
success it had not earned.

**(a) A 200 with an empty reply.** `/api/archie` shipped
`{ reply: content ?? "" }`, and the client rendered `data.reply || "…"` — a
bare ellipsis, indistinguishable from a message that never arrived.

The cause is structural, not a typo: `gpt-5-nano` is a **reasoning** model, so
reasoning tokens are billed against `max_completion_tokens` (2000). A long
prompt can spend the entire budget thinking and return `finish_reason:
"length"` with empty content. That is a legitimate outcome — it just must
never reach a user as silence.

Fixed on both ends. The server now returns an explicit sentence, distinguishing
"ran out of room, send it in smaller pieces" from a generic failure, plus
`empty: true` and `finishReason` for logs and future client styling. It stays
HTTP 200 deliberately: nothing is broken, so an error toast would be the wrong
signal — what the user needs is a next step. The client keeps a belt-and-braces
guard, which is what the e2e exercises.

**Open, related:** `max_completion_tokens: 2000` is the reason this happens at
all. Raising it costs money per turn and is a tuning decision, not a bug fix —
not changed here.

**(b) "Sent to founders" could be false.** The feedback route fired the
Telegram fan-out with `void` and answered "I've sent your note to the ZAAHI
team" unconditionally. Three failure modes produced that same sentence:
`TELEGRAM_ADMIN_CHAT_IDS` unset (returns `[]` without touching the network),
`TELEGRAM_BOT_TOKEN` unset (every result `skipped`), and any Telegram or
network error.

The route now awaits the fan-out and tells the truth. Two details that matter
more than the await:

- **Throttle state is refunded when nothing was delivered.** `isDuplicate()`
  records on first sight, so a failed send would otherwise be treated as
  "already sent" for 24 hours and the user's retry answered with *"I already
  sent this one earlier — the team has it."* That is the false confirmation
  twice over. The rate-limit slot is refunded for the same reason: a
  submission that reached nobody must not spend the user's quota.
- **Partial delivery is a success for the user, a problem for us.** If one of
  two admin chats got it, a human has the message — so the user is not told it
  failed — but the gap is logged rather than swallowed.

The decision that governs whether we lie now lives in
`src/lib/telegram-delivery.ts` with 24 fixtures, rather than inline in a route
that needs a database and a request context to exercise.

**Note for §8:** this does NOT fix the in-memory rate limit being unenforceable
across Vercel lambdas — that is a separate item and still open.


### 2c · D-18 — the engine selector on a mixed-use plot, shipped 2026-09-04

**Decision:** disable the top-level engine selector on a mixed-use plot, with a
note that per-slice engines apply.

**Implemented with one deliberate narrowing, stated because it departs from the
literal instruction.** The gate is *"the mix is driving the headline"*, not
*"the plot is mixed use"*. The mixed-use model is **Build-to-Sell only** — on
Build-to-Rent and JV, and whenever the shares do not sum to 100, the headline
falls back to the single top-level engine, which then genuinely drives every
number. Disabling the control there would remove the only way to change
figures the user is looking at. The selector is now live exactly when it
matters and inert exactly when it does not.

The note names the actual per-slice engines and their shares — e.g. *"each use
runs its own engine — Residential 55%, Office 27%, Retail 17%"* — and points at
the Mix breakdown as the real control. The collapsed affordance reads **"▸ why"**
instead of "▸ change", so it does not offer something it cannot do.

Three e2e cases: inert while driving, live again on unbalanced shares, live on
a single-use plot.

This closes the loop on the second half of `…-033112-e6366e` (§2a item 2): the
founder saw an engine switch change nothing and reported it as staleness. The
numbers were right; the control was lying.

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
arcgisonline tile, or the vector-basemap migration being un-parked.

**Detection — closed 2026-09-04.** This used to read *"a watermark would pass
silently"*, because `(h)` only asserted status codes. New check **`(h2)`** now
decodes real tiles and fails on a watermarked 200. It reads the provider URLs
from `src/lib/basemap-tiles.ts`, so it re-points itself if the provider
changes, and it is provider-agnostic: it measures how much fixed artwork
appears on every tile regardless of location. Measured separation — clean
0.00–0.02%, CARTO keyless 0.43–1.38%, threshold 0.15%. Demonstrated by
pointing the constant at CARTO and watching it fail.

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

### Quarantined — resolved 2026-09-04

**`archie/…-044210-a79f3f` @ `ef1371f` — DELETED** on founder instruction.
Local only, never pushed. 3 files, +120/−5 across
`api/archie/feedback/route.ts`, `ArchibaldChat.tsx`, `archie-tools.ts`. Gates
never run, never reviewed; produced when the poller drained stale Approve
presses and began **#25** sixth-out-of-order, then was killed mid-run. Root
cause fixed by `888f9ce`.

The commit object survives in the reflog for the usual ~90 days
(`git show ef1371f`) but no branch points at it. **#25 is re-run from scratch
when it comes up** — nothing from that session is carried forward.

### Unmerged, worth a decision

| Branch | Head | What |
|---|---|---|
| `feat/backlog-batch-2` | `d36ecd4` | **Assessed 2026-09-04 — see §6a. Recommendation: do NOT merge as a unit; split.** |
| `research/landuse-archetypes` | `ecefe7f` | **FROZEN by founder** — merge-ready, deferred pending a 3D-method decision |
| `fix/tsx-guard-2026-08-12` | `6392bb2` | Gates DB-writing scripts behind `ALLOW_PROD_WRITE`, adds a real typecheck |
| `fix/plot-lookup-2026-08-19` | `085ab05` | Likely superseded by `84d7aae` — verify before deleting |
| `docs/secrets-audit-2026-08-27` | `df13cd9` | The audit document itself is still not on `main` |
| `docs/landuse-palette-2026-08-10` | `4181a6c` | Ratifies the in-code palette, supersedes the 2026-04-11 table |
| `research/bug-consolidation-2026-08-10` | `cb5ab5f` | Consolidated master bug list — 33 open, 16 fixed, 4 stale |
| `research/full-audit-2026-08-20` | `efdf2a3` | Full-surface audit of uncovered areas |

### 6a · `feat/backlog-batch-2` — assessment, 2026-09-04

**Recommendation: do not merge as a unit. Split it — take four items, re-author two.**

**What it is.** `d36ecd4`, three commits, last touched **2026-06-12**. Cut from
`40060d8`; `main` is now **58 commits ahead** of that base. It claims six
founder-backlog items, not the four previously recorded — the extra two are
**#9** and **#11**.

| Item | What | On `main` today? |
|---|---|---|
| **#7** | Area 1:1 with source, no rounding | No — `area-unit.ts` still `Math.round` |
| **#9** | Hover lights the gold outline; hover cards removed, panel on click | No — all three hover cards still present |
| **#10** | Floors row in SidePanel | No |
| **#11** | Status badge in SidePanel | No — no `StatusBadge` |
| **#13** | Search falls through to PMTiles sources | No |
| **#33** | Netflix-style UI click/tap sounds | No — no `uiClick`/`uiTap` |

So the work is genuinely unmerged and none of it has been superseded on `main`.

**But it does not merge cleanly, and the conflict is semantic.** A test merge
into `main` @ `a76c452` produced **one conflicted file, three hunks**, all in
`src/app/parcels/map/page.tsx`:

| Hunk | `main` side | branch side | What it is |
|---|---|---|---|
| 1 | 123 lines | 124 lines | The ZAAHI plot mousemove/mouseleave/click handlers |
| 2 | 272 lines | 7 lines | The three hover popup cards the branch deletes for #9 |
| 3 | 13 lines | 2 lines | `doFind` PMTiles fallback for #13 |

**Hunk 1 is the problem. Taking the branch side would revive two fixed P0s:**

1. It reintroduces `if (map.getLayer(ZAAHI_PLOTS_FILL)) {` around the handler
   binds — at the site where `552e708` deliberately removed it. That guard was
   always false, so *"the cursor stayed `grab` and clicking a plot did nothing,
   silently"* (audit 1.17).
2. It calls `setSelectedVaultEntry(...)` / `setSelectedParcelId(...)` directly.
   `main` routes 13 call sites through `openParcelPanel` / `openVaultPanel`,
   the mutex added by the May-parity **P0 1.1** fix. Bypassing it brings back
   two drawers open at once.

Neither is a textual accident — the branch predates both fixes.

**One item needs rework regardless of conflicts.** #7 as implemented is
`n.toLocaleString("en-US", { maximumFractionDigits: 20 })`. Measured on the
real sqm→sqft path:

```
4,500 sqm  ->  48,437.596875195006 sqft
2,426 sqm  ->  26,113.24667093846 sqft
```

That is twelve digits of **binary float noise**, not source precision — the
source carries one or two decimals at most. "1:1 with source, no rounding" is a
reasonable ask; this implementation does not deliver it, and it violates the
`CLAUDE.md` style rule that numbers are always formatted. Needs a decimal cap
(2–3) or a round-trip through the source string.

**Also worth knowing:** #9 and #11 have *rival* implementations on two other
unmerged branches — `research/backlog-hover9` (`f1bcd9a`) and
`research/backlog-wave1` (`36b9ea9`). Three branches, two of the same items.
Whichever route is taken, the other two branches should be closed so this does
not recur.

**Split executed 2026-09-04** on `feat/backlog-batch-2-split-2026-09-04`
(founder-approved). Status per item:

| Item | Status | Note |
|---|---|---|
| **#10** Floors row | **done** — cherry-picked | Verified rendering: `FAR 4 · Floors 12 · Max Height G+12 · ~42 m`. Floors moved out of the Max Height string into its own row |
| **#11** Status badge | **done** — cherry-picked | Verified rendering: `Plot 3261253 LISTED` |
| **#33** UI sounds | **done** — cherry-picked + re-wired | `sound.ts`, `SidePanel`, `FilterPanel` applied cleanly; the six `page.tsx` call sites were hand-wired against current `main`. The 2D/3D toggle's `sound.whoosh()` is replaced by `uiClick()` at that one site, per the branch's intent — the whooshes on panel open/close are untouched |
| **#7** Area 1:1 | **done** — reworked | Rewritten by provenance rather than taken as-is. Source values untouched, converted values capped at 2 decimals. 25 assertions in `scripts/area-format.test.ts` |
| **#13** PMTiles search | **done** — re-authored | Written fresh against current `main` as a parent callback (`findPlotInTiles`) passed to `HeaderBar`, rather than threading the map object into a presentational component |
| **#9** Hover cards | **HELD** — founder reviewing | Removes 272 lines of live hover UI. Decision D-16 |

**Not taken, and why:** `fmtInt` in `src/lib/feasibility.ts` is shared between
areas and **AED amounts** (35 call sites, ~11 of them currency). The original
branch reworked it, which would have changed money formatting across the
feasibility calculator and the site-plan PDF. Left alone — the feasibility
calculator's own GFA/SFA rounding is a separate decision, not part of #7.

**Retirement — inventoried 2026-09-04, NOT deleted.** The split merged as
`7dd9717`, so the "after the new branch is merged" condition is met. The
"nothing else unique lives on them" condition is **not** — all three still
carry unlanded work, and all three of them are coupled to the held **#9**:

| Branch | Still unique on it |
|---|---|
| `feat/backlog-batch-2` | The **#9** implementation. The `fmtInt` / `feasibility.ts` / `generate-site-plan-pdf.ts` area-rounding changes, deliberately not taken because `fmtInt` is shared with AED. `docs/research/handoff-2026-06-12.md` — 144 lines of June session context, the only handoff doc not on `main`, now largely superseded by §6a above |
| `research/backlog-hover9` | A **second, more aggressive #9** — `page.tsx` +152/−474, removing more than `feat/backlog-batch-2` does. Nothing else |
| `research/backlog-wave1` | A **Status row on the ZAAHI hover card**. `main` has no status there. Its SidePanel half is superseded by the richer `StatusBadge` that landed on 2026-09-04. Whether this survives depends on #9 — if the hover cards go, it goes with them |

**All three are tagged on origin so nothing is at risk:**
`archive/backlog-batch-2`, `archive/backlog-hover9`, `archive/backlog-wave1`.
The tag messages carry the same inventory. `git checkout archive/…` restores
any of them; deleting the branches later loses nothing.

**Recommendation:** delete all three **after** #9 is decided — the two rival
implementations are the material for that decision, and `wave1`'s hover-card
row is moot if the cards are removed.

**Original proposal, for the record**

| Take | Items | Why |
|---|---|---|
| **Cherry-pick onto a fresh branch off `main`** | **#10**, **#11**, **#33** | `SidePanel.tsx`, `FilterPanel.tsx`, `sound.ts` all auto-merged with zero conflicts. Self-contained, low risk |
| **Re-author against `main`** | **#9**, **#13** | Both live in the conflicted `page.tsx` hunks. The intent is fine; the code is written against a tree that no longer exists |
| **Rework then take** | **#7** | Fix the float-noise formatter first. Founder-visible on every area figure in the product |
| **Retire** | the branch itself | Once the above land, `feat/backlog-batch-2`, `research/backlog-hover9` and `research/backlog-wave1` all close |

Effort: the cherry-pick is small. #9 and #13 are a fresh implementation each —
#9 in particular deletes 272 lines of live UI and deserves its own review, since
"remove the hover cards" is a founder UX decision, not a bug fix.

**Founder decisions this raises:** confirm #9 is still wanted (it removes hover
cards entirely); confirm the decimal precision for #7.

---

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
| D-15 | `feat/backlog-batch-2` (§6a): approve the split — cherry-pick #10/#11/#33, re-author #9/#13, rework #7 |
| D-16 | **#9** — is removing the hover cards entirely still wanted? It deletes 272 lines of live UI |
| D-17 | **#7** — what decimal precision for areas? "No rounding" as written produces float noise |
| ~~D-18~~ | **ANSWERED 2026-09-04** — disable it with a note that per-slice engines apply. Shipped on `fix/mixeduse-engine-selector-2026-09-04`. Scoped to when the mix actually drives the headline, not to "the plot is mixed use" — see §2c |

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
