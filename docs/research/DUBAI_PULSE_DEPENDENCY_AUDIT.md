# Dubai Pulse & Makani Dependency Audit — 2026-04-16

Branch: `research/dubai-pulse-audit`
Type: Research only — no code changes
Triggered by: `docs/research/GOV_API_AUDIT_UAE.md` red flags
(Dubai Pulse host-level 301 + Makani scheduled-maintenance on 2026-04-16).

Hypothesis going in: ZAAHI may be fetching Dubai Pulse legacy permalinks
that now silently return the `data.dubai` home page HTML, and/or resolving
Makani address codes via a live `makani.ae` endpoint that was offline
during the audit window.

---

## Findings

### 1. Dubai Pulse — zero matches

Case-insensitive search of the entire repo (excludes only `.git/` via `Grep`):

| Pattern | Matches |
|---|---:|
| `dubaipulse` | 0 |
| `dubai-pulse` | 0 |
| `pulse.gov` | 0 |
| `dp.gov` | 0 |

No source file, no script, no doc, no config, no env var, no dependency
references Dubai Pulse in any form. This is a **negative finding —
nothing is broken because nothing points at it**.

### 2. Makani — zero live references, only metadata literals

| Pattern | Matches |
|---|---:|
| `makani.ae` | 0 |
| `makani` (case-insensitive) | 8 |

All 8 `makani` matches are **in seed scripts only** — not in `src/`, not in
`prisma/schema.prisma`, not in API routes, not in UI, not in lib code.
The field is a **static metadata string** transcribed manually from the
founder's notes per plot; it is never fetched from any endpoint.

| File | Line | Context | Runtime behaviour |
|---|---:|---|---|
| `scripts/seed-dubai-islands-1010469.ts` | 117 | `makani: null as string | null,` — type annotation in `PlotSpec` literal; value is `null` because no Makani code was known for this plot | Dead — null is just persisted into `AffectionPlan.raw` JSON blob at seed time |
| `scripts/seed-dubai-islands-1010469.ts` | 267 | `makani: SPEC.makani,` — copies the (null) value from spec into the `AffectionPlan.raw` JSON blob on seed | Dead — null round-trips into Postgres JSONB |
| `scripts/seed-new-listings.ts` | 156 | `makani: string | null;` — field declaration in `PlotSpec` type | Dead — type only |
| `scripts/seed-new-listings.ts` | 190 | `makani: '12214 68441',` — hardcoded Makani code for plot 5912323 (Al Furjan) | Dead — string literal, not fetched |
| `scripts/seed-new-listings.ts` | 197 | `'… Makani 12214 68441. …'` — human-readable notes string (duplicates the code for display) | Dead — string inside a `notes:` field; never parsed |
| `scripts/seed-new-listings.ts` | 237 | `makani: '30873 86003',` — hardcoded Makani code for the second plot in this script | Dead — string literal, not fetched |
| `scripts/seed-new-listings.ts` | 246 | `'… Makani 30873 86003. …'` — human-readable notes string | Dead — string inside `notes:` |
| `scripts/seed-new-listings.ts` | 426, 432 | `makani: spec.makani,` — two places (DDA-present and DDA-absent branches) writing the literal into `AffectionPlan.raw` JSON blob at seed time | Dead — plain value copy into JSONB |

**Downstream persistence trail**

- `scripts/seed-new-listings.ts:420-434` writes `{ ..., makani: spec.makani, ... }` into `AffectionPlan.raw` (Prisma `Json` column). This runs at seed time, not request time.
- `src/` does not reference `makani` anywhere — grep returns zero. So no API route, no UI component, no service reads the value back. It is stored in JSONB and never consumed by application code.
- `prisma/schema.prisma` has no `makani` column. The value only exists inside the untyped `raw` JSON blob on `AffectionPlan`.

**What this means**: the Makani codes in ZAAHI are **record-keeping**, not
a runtime integration. They would not even surface as broken if
`makani.ae` disappeared permanently. If anyone were ever to add a
`"View on Makani"` button later, it would need to be built from scratch —
and should be built as a link-out to `maps.google.com` or
`makani.gov.ae` (if revived), not as a fetch.

### 3. Environment variables — clean

```
.env* files present: .env.local
```

Grep over `.env.local` for `DUBAI_PULSE`, `DUBAIPULSE`, `MAKANI`, `DP_GOV`,
case-insensitive: **no matches**.

No `.env.example` is tracked in this checkout (repo-level convention —
every env is documented inline in code that reads `process.env.*`, and
the production env lives in Vercel, see `CLAUDE.md` §DEPLOYMENT).
Audit implication: **no Dubai Pulse or Makani env-var plumbing exists**.

### 4. Dependencies — clean

- `package.json` — grep for `pulse` / `makani`: 0 matches.
- `pnpm-lock.yaml` — grep for `pulse` / `makani`: 0 matches.

No npm package named `dubai-pulse-client`, `pulse-api`, `makani-sdk` or
similar is installed or declared. ZAAHI does not carry a client library
for either system.

---

## Impact assessment

| System | Exposure | Severity | Silent-fail risk | Notes |
|---|---|---|---|---|
| Dubai Pulse (`dubaipulse.gov.ae`) | **None** | — | **None** | Not referenced anywhere |
| Makani (`makani.ae`) | **None at runtime** | — | **None** | Only static string literals in two seed specs; never fetched |
| DLD heatmap (tangentially called out in research doc) | Static PMTiles/extracts only (see `CLAUDE.md` §Слои) | Low | — | Served from our own assets, not Pulse |
| Abu Dhabi admin units (2,083), DDA Projects (209), Free Zones (209) | Static PMTiles | Low | — | Served from our own assets |

**Conclusion**: ZAAHI is operationally insulated from the Dubai Pulse
restructuring and from Makani's maintenance status on 2026-04-16.
The red flags raised in the Gov API audit describe external availability
issues, **not current ZAAHI dependencies**. Nothing is silently returning
HTML in place of JSON, because nothing is fetching those URLs in the
first place.

### What this audit does NOT cover

- Third-party services (Vercel, Supabase, Mapbox / MapTiler, Esri tile
  CDN) — out of scope; none of those resolve via Pulse or Makani.
- Historical git branches — the audit only inspects the checked-out
  working tree at HEAD of `main` (the base of `research/dubai-pulse-audit`).
  If a prior branch added Pulse integration and was later reverted, a
  residual reference on some feature branch is theoretically possible
  but irrelevant to production.
- Future intent — if founder or Dymo plans to integrate Pulse/Makani,
  that integration must now be scoped against the new `data.dubai`
  portal, not the legacy Pulse endpoints.

---

## Recommended actions

### For the current finding (none is urgent)

1. **No code change required.** There is nothing to fix. Do not delete
   the `makani: '12214 68441'` literals — they are authoritative record
   data for the two plots and the only place this information is kept
   in the repo today. If anything, they should eventually be promoted
   out of `AffectionPlan.raw` JSONB into a typed `makaniCode` column on
   `Parcel` or `AffectionPlan` so the value is addressable — but that is
   a *data-model improvement*, not a Pulse/Makani fix, and belongs in
   a separate schema-change task.

2. **Guard against future regressions.** When new seed scripts or API
   integrations are added for Dubai data, reviewers should check that
   no code targets `dubaipulse.gov.ae/*` paths. The Gov API audit
   (`docs/research/GOV_API_AUDIT_UAE.md` §Dubai Pulse) explains why:
   every deep link returns the `data.dubai` home page HTML with a 200
   status, which passes a naive `response.ok` check and poisons any
   downstream parser.

3. **If a "View on Makani" feature is ever requested**, build it as a
   static URL composer first (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`
   is sovereignty-safe and resolves with zero uptime risk) and treat
   a direct `makani.ae` integration as a separate spike with its own
   uptime SLA verification.

### For `PARKED_PROJECTS.md`

**Do not add a new section.** `PARKED_PROJECTS.md` tracks paused projects
pending a founder decision or external dependency. This audit found no
project to park — the codebase is clean. The audit itself is a one-off
verification, not a deferred initiative. The existing "UAE Government
API Audit" entry in `PARKED_PROJECTS.md` already captures the parent
context; this audit is a direct follow-up and its result reduces
scope on that parked item rather than extending it.

If the founder wants to retain a breadcrumb in `PARKED_PROJECTS.md`,
the lowest-friction option is to append a single note under the
existing "UAE Government API Audit" entry saying "Codebase dependency
audit 2026-04-16 — clean; see `DUBAI_PULSE_DEPENDENCY_AUDIT.md`".
That is a one-line edit on `main` and can be done post-review.

---

## If no findings

**ZAAHI is clean. No Dubai Pulse or Makani dependencies exist in the
codebase** — no fetches, no env vars, no packages, no imports.

The only traces of the word "makani" are eight instances in two seed
scripts where it serves as a static metadata field on a plot spec
(two plots have manually transcribed Makani codes; one plot has
`makani: null`). These values round-trip into a Postgres JSONB blob on
`AffectionPlan.raw` at seed time and are never read back by any code
in `src/`. They would survive the permanent shutdown of `makani.ae`
without a single broken feature.

---

## Method — exact commands used (for reproducibility)

```
# Ran via the Claude Code Grep tool (ripgrep semantics), case-insensitive,
# over the working tree at HEAD of research/dubai-pulse-audit
# (freshly branched from main at commit d73f0e0).

grep -irn "dubaipulse"       # 0 matches
grep -irn "dubai-pulse"      # 0 matches
grep -irn "pulse\.gov"       # 0 matches
grep -irn "makani"           # 8 matches (scripts/ only)
grep -irn "makani\.ae"       # 0 matches
grep -irn "dp\.gov"          # 0 matches

# Narrow searches
grep -in "makani" prisma/*   # 0 matches
grep -irn "makani" src/      # 0 matches
grep -irn "\.makani|raw\.makani" src/   # 0 matches (no reads)

# Env + deps
ls .env*                     # only .env.local present
grep -iE "dubai_pulse|dubaipulse|makani|dp_gov" .env.local   # 0 matches
grep -iE "pulse|makani" package.json                         # 0 matches
grep -iE "pulse|makani" pnpm-lock.yaml                       # 0 matches
```

All findings reproducible by running the same queries on the same HEAD.
