# ZAAHI Agent Autonomy Protocol — Effective 2026-04-22

**Document:** Governance protocol defining agent authority tiers
**Version:** v1.0
**Effective:** 2026-04-22
**Ratified by:** Founder Dymo Tsvyk (co-founder · Ambassador · Guardian Partner · strategic veto)
**Co-signed:** Founder Zhan Ryspayev (founder · CEO/CTO · day-to-day engineering authority)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Classification:** CONFIDENTIAL — binding on all AI agent sessions operating on ZAAHI codebase
**Preserves:** `CLAUDE.md` AGENT RULES (this protocol is complementary — CLAUDE.md remains authoritative; this protocol layers decision-authority semantics on top).

---

## §0 Purpose

This protocol defines the three-tier authority framework — 🟢 **GREEN** / 🟡 **YELLOW** / 🔴 **RED** — governing what an AI agent operating on the ZAAHI codebase may do autonomously versus what requires explicit founder approval before action.

It exists because prior session reviews surfaced two failure modes:
1. **Over-permissive execution** — agent acted on ambiguous directives, produced work that required extensive rework.
2. **Over-cautious paralysis** — agent asked founder for routine approvals on obviously reversible changes, burning founder time on decisions within established scope.

This protocol draws the boundary. It is a **scope-of-authority contract**, not a substitute for founder judgement.

---

## §1 Tier definitions

### §1.1 🟢 GREEN LIGHT — autonomous execution permitted

Agent may proceed without pause. No founder confirmation required. Agent still commits atomically · logs reasoning · produces chat summary at end of session.

**Scope:**
1. **Spec writing · architecture documents · governance documents.** Markdown files in `docs/**`. No production code change, no schema change, no data mutation.
2. **Document amendments** — version bumps · decision tracker updates · cross-reference synchronisation · math corrections when the underlying data is unchanged but the summation was wrong.
3. **Safe research** — reading files · searching codebase · consulting external APIs via WebFetch · running read-only git commands (`status` · `log` · `diff` · `branch --show-current`).
4. **Branch-local experimentation** on a research branch that is NOT `main` AND does NOT touch `prisma/schema.prisma` OR `data/**` (immutable per CLAUDE.md AGENT RULES).
5. **Chained dependent tasks (up to 5 per session)** when the founder has granted GREEN LIGHT explicitly for a sequence of related amendments. Each task commits atomically; agent does NOT pause between them; chat summary at end covers all.
6. **Commits with descriptive messages** following CLAUDE.md conventional prefix rules (`feat:` · `fix:` · `docs:` · `refactor:` · `chore:`).
7. **Task tracking** via `TaskCreate` / `TaskUpdate` — operational discipline, not authority action.

**Constraint:** GREEN authority extends only to the domain explicitly granted. "Write spec X" does NOT authorise "also modify code Y." Scope-creep = YELLOW.

### §1.2 🟡 YELLOW LIGHT — founder confirmation required before action

Agent MUST pause and obtain explicit founder approval before proceeding. Message pattern: summary of proposed action → reason → potential blast radius → explicit "approve Y/N?" ask.

**Scope:**
1. **Production code changes** — any `src/**` modification · any `prisma/schema.prisma` modification · any `prisma/migrations/**` modification · any `public/**` asset modification.
2. **Dependency changes** — `package.json` · `pnpm-lock.yaml` · `requirements.txt` · any new install or upgrade of external library.
3. **CI/CD and infrastructure** — `.github/workflows/**` · `vercel.json` · environment-variable config · hook configuration · deployment targets.
4. **Test suite modifications** affecting test semantics (adding/removing/skipping tests; not formatting-only).
5. **Data seeding scripts** even on research branch when they touch production DB via Prisma client.
6. **Documentation changes to CLAUDE.md** — the source of truth for agent rules. Even typo fixes require founder OK.
7. **New directories** at repo root (e.g., creating `/home/zaahi/zaahi/pipelines/`) — establishes codebase topology.
8. **Scope expansion mid-task** — if the granted scope was "amend doc X" and agent discovers doc X references doc Y which also needs update, pause and ask.
9. **Commit message style departures** from established conventional prefix pattern.
10. **Cross-branch operations** — merging research branch to `main` · rebasing · any history rewrite.

**Founder-confirmation payload:**
```
PROBLEM: one line
WHAT I WILL DO: concrete action + file + scope
BLAST RADIUS: what changes / what could break / reversibility
WHY THIS IS NEEDED: one-sentence justification
APPROVE Y/N?
```

### §1.3 🔴 RED LIGHT — NEVER without explicit, specific, written founder instruction

Agent does NOT act on these EVER without founder explicitly writing the instruction in current conversation · NOT previous conversation · NOT inferred from context · NOT approved-by-silence.

**Scope (absolute prohibition without current-turn explicit instruction):**
1. **Destructive git operations** — `git push --force` / `--force-with-lease` · `git reset --hard` (when it destroys uncommitted or ahead-of-remote work) · `git rebase -i` · `git branch -D` on branches that may hold work · `git checkout .` / `git restore .` (destroying uncommitted changes) · `git clean -f`.
2. **Production deployment** — pushing to `main` · merging PR to `main` · triggering Vercel production deploy · Prisma `migrate deploy` against production DB.
3. **Data deletion** — ANY `prisma.*.delete` · `prisma.*.deleteMany` · SQL `DELETE` or `TRUNCATE` against production DB · file deletion in `data/**`.
4. **Parcel mutations beyond CLAUDE.md-permitted ones** — any Parcel row deletion (forbidden per CLAUDE.md "NEVER delete parcels" rule) · any Parcel reseeding · any affectionPlans deletion (append-only per CLAUDE.md).
5. **Prisma schema changes** — `prisma/schema.prisma` modification without explicit per-change founder instruction.
6. **Environment variable writes** — `.env.local` modification · Vercel Env var write · any secret material change.
7. **Public-internet actions** — sending email on behalf of ZAAHI · posting to Slack · creating GitHub issue · filing PR to external repos · publishing package · any action that leaves permanent public trace.
8. **Commission ledger mutations** — `Commission.amountFils` / `dealId` / `level` / `ambassadorId` / `basisFils` / `rate` writes after creation (immutable per CLAUDE.md Ambassador rules · only `status` / `payoutMethod` / `payoutRef` / `paidAt` writable).
9. **Hook bypass** — `git commit --no-verify` · `--no-gpg-sign` · any action that evades CI/CD quality gates.
10. **Ambassador tier/rate changes** — tier prices (AED 1k/5k/15k) · commission rates (5/2/1, 10/4/1, 15/6/1) · ZAAHI Service Fee 2% · USDT wallet address · MAX_LEVEL · immutability rules · skip-inactive policy. These require founder written approval per CLAUDE.md Ambassador rules.
11. **Land Use legend changes** — the 9-category founder-locked legend (CLAUDE.md 2026-04-11 decision).
12. **3D model geometry changes** — setback rules · `computeSetbackM` · `insetRingByMeters` · podium/body/crown constants · `FLOOR_H` · `PODIUM_TOP` · `CROWN_H` · footprint scale ratios. All founder-locked per CLAUDE.md.
13. **Auth flow changes** — `src/app/page.tsx` auth page · `AuthGuard` removal · `getApprovedUserId` bypass · `PUBLIC_API` allowlist expansion without written justification.
14. **Founder pricing ratifications** — ratified floors (R-5: 1k/3k/22k AED) · Enterprise deal-fee hard floor (R-6: 0.15%) · annual-prepay discount (R-7: 10%) · Ambassador opt-out compensation (R-8: +AED 5k OR +0.05%). Changing these requires founder explicit re-ratification.

**If an agent is uncertain whether an action falls RED: treat as RED.** Escalate. Do not act.

---

## §2 Decision matrix — rapid lookup

| Action | Tier |
|---|:-:|
| Read any file in repo | 🟢 |
| Edit `docs/**/*.md` (new or existing) | 🟢 |
| Create new document in `docs/**` (including sub-dirs) | 🟢 |
| Run `git status` · `git log` · `git diff` · `git branch` | 🟢 |
| Commit on current research branch with conventional message | 🟢 |
| Grep/glob/search codebase | 🟢 |
| Run read-only `WebFetch` / `WebSearch` | 🟢 |
| TaskCreate / TaskUpdate | 🟢 |
| Chained related doc amendments (≤5) under pre-granted scope | 🟢 |
| Edit any `src/**` file | 🟡 |
| Edit `prisma/schema.prisma` | 🔴 |
| Apply Prisma migration to production DB | 🔴 |
| Add dependency to `package.json` | 🟡 |
| Modify `.github/workflows/**` | 🟡 |
| Create new repo-root directory | 🟡 |
| Push to `main` | 🔴 |
| `git push --force` to any branch | 🔴 |
| `git reset --hard` destroying uncommitted work | 🔴 |
| Delete anything in `data/**` | 🔴 |
| Delete ANY Parcel row | 🔴 |
| Delete any Commission row or mutate core fields post-creation | 🔴 |
| Modify environment variables | 🔴 |
| Change Ambassador tier prices · rates · USDT wallet | 🔴 |
| Change Land Use legend (9 categories) | 🔴 |
| Change 3D setback / ZAAHI Signature geometry rules | 🔴 |
| Send email / Slack / Telegram via actual production webhook | 🔴 |
| Modify CLAUDE.md | 🟡 (typo) / 🔴 (rule) |
| Modify this AUTONOMY_PROTOCOL document | 🔴 |
| Change founder-ratified pricing (R-5/R-6/R-7/R-8) | 🔴 |
| Write new autonomy-protocol tier definitions | 🔴 |

When an action is not listed: **default DOWN one tier.** Unclear YELLOW → treat as RED. Unclear GREEN → treat as YELLOW.

---

## §3 Safety invariants — always-active

These invariants hold regardless of tier granted. No scope of GREEN authority overrides these.

1. **Preserve uncommitted founder work.** Before any action, `git status` first. If there are uncommitted changes agent did not introduce in current session, STOP. Do not proceed. Ask founder whose work it is.
2. **Never silently overwrite.** If a file to be modified has content agent did not author in current session · agent read the file first · explicit diff · never blind `Write` over unread content.
3. **Never skip hooks.** `--no-verify` is forbidden even on docs-only commits. Hooks exist for invariant enforcement.
4. **Never rewrite history on published commits.** Force-push is RED. Amending commits that have been pushed is RED (prefer new commit on top).
5. **Never commit secrets.** `.env.local` is gitignored for a reason. If agent observes secret material in any file about to be committed, STOP · warn founder.
6. **Never touch `data/**`.** Source of truth for plot data · NOT regenerable from code · per CLAUDE.md immutable.
7. **Never delete Parcel rows.** Per CLAUDE.md · NEVER · even stubs · even agent's own prior-batch creations · even "broken-looking" rows.
8. **Never bypass `<AuthGuard>`** or `getApprovedUserId(req)` in sensitive API routes.
9. **Never introduce Puppeteer for PDF.** jsPDF v4.2.1 is the established pipeline (corrected across Spec 02 / Spec 04 / FEASIBILITY_STYLE_GUIDE).
10. **Always maintain 5-layer defence-in-depth** for multi-tenancy when Phase 2 tenantization code ships (middleware · JWT claim · Postgres session · RLS · Prisma middleware).
11. **Always preserve PricingPlan runtime configurability.** No hardcoded prices in `src/**` · prices live in `PricingPlan` Prisma model (per `77_PRICING_FRAMEWORK.md` D-3).
12. **Always honour founder-ratified decisions.** Changing them is RED. Agent may recommend re-ratification but cannot enact without founder written consent.

---

## §4 Chained GREEN authority — multi-task protocol

When founder grants GREEN for a sequence of related tasks (typical pattern: "amend docs A, B, C; commit each; chat summary at end"), agent operates as follows:

1. **Scope confirmation** — agent restates what it understood as the scope before beginning. One sentence per task.
2. **Atomic commits** — each task = one commit. Never bundle unrelated changes.
3. **Safety check between tasks** — `git status` before each commit ensures previous task landed cleanly.
4. **Chat summary at the end** — single summary message covering all tasks · commits · blockers · next step.
5. **Upper bound: 5 dependent tasks per GREEN grant.** Beyond 5 → pause · request continuation · founder may extend.
6. **Scope excursion** — if agent discovers mid-execution that scope must extend (e.g., task 3 reveals doc D also needs update), pause at the excursion moment and escalate to YELLOW. Do NOT extend unilaterally.
7. **Error during chained execution** — any tool error · compile failure · test failure · pause immediately · escalate · do NOT attempt workarounds beyond trivial retries.

---

## §5 Escalation patterns

### §5.1 When agent discovers something unexpected

**Unexpected file / branch / uncommitted work:**
- STOP. Do NOT delete · overwrite · `reset --hard`.
- Investigate: `git log` · `git diff` · file content review.
- Report to founder: what is it · when did it appear · what would be required to integrate or set aside.
- Await explicit instruction.

**Unexpected schema state:**
- STOP. Do NOT apply migration · do NOT `prisma db push`.
- Read current `schema.prisma` · compare to migrations folder · identify drift.
- Report to founder.

**Unexpected production state:**
- STOP. Do NOT attempt "fix."
- Report · diagnose · await instruction.

### §5.2 When agent is uncertain about tier

Agent constructs the question:
```
CONTEXT: [what I observed]
PROPOSED ACTION: [what I want to do]
MY READ: [tier I think it is + why]
ALTERNATIVES: [what else I could do]
ASK: confirm tier, then approve or redirect
```

Founder replies; agent proceeds per reply.

### §5.3 When founder gives conflicting or ambiguous instruction

Agent does NOT pick one interpretation silently. Agent restates what it heard:
```
I heard: [interpretation A]
Alternative reading: [interpretation B]
Which is correct?
```

Founder clarifies; agent proceeds.

---

## §6 Amendment procedure for this protocol

This document is **governed** — changes require:

1. **Founder proposal** — Zhan OR Dymo writes proposed change in chat · states rationale.
2. **Counterparty review** — the other founder reviews · signs off OR objects.
3. **If both founders agree** — agent edits this document · bumps version · appends change-log entry at §7 below.
4. **If founders disagree** — document stays · discussion continues · no agent action.
5. **If only one founder available and change is urgent** — note is added under "Interim Override §7" below · ratified at next joint session · reverted if not ratified.

Agent CANNOT self-amend this document. Agent can PROPOSE amendments; it cannot ratify them. This is the fundamental check on agent authority drift.

---

## §7 Change log

### v1.0 · 2026-04-22

Initial ratification. Three-tier model (GREEN/YELLOW/RED) established. Safety invariants locked. Decision matrix seeded. Chained-GREEN protocol (up to 5 tasks) codified.

**Co-authored-by:** Zhan Ryspayev (founder/CEO/CTO) · Dymo Tsvyk (co-founder/Ambassador/strategic veto).
**Triggered by:** 2026-04-22 founder directive to expand agent autonomy for docs-only amendments without eroding safety boundaries on production code and data.
**Scope at ratification:** Phase 1 Owner-First discipline (no external tenants until Month 10) · Specs 01 / 02 / 03 / 04 published · Feasibility Framework parked · §77 ARCHITECTURE v1.2 + Pricing Framework v1.1 ratified in same session.

---

## §8 Cross-references

- **`CLAUDE.md`** — authoritative AGENT RULES · security rules · parcel rules · 3D model rules · Ambassador rules. This protocol layers decision-authority on top; CLAUDE.md operational rules remain binding.
- **`docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md`** v1.2 (commit `45f23f5`) — Phase 1 strategic decisions binding document.
- **`docs/architecture/77_WEB_PLATFORM_ARCHITECTURE.md`** v1.2 — §77 White-label architecture · D-17/D-18/D-19/D-20 founder-ratified pricing.
- **`docs/specs/phase-1/77_PRICING_FRAMEWORK.md`** v1.1 — pricing floors ratified · runtime `PricingPlan` model specification · governance rules.
- **`docs/specs/phase-1/03-ADMIN_PANEL_SPEC.md`** v2.0 (commit `0cd6542`) — §14 Super-Admin framework · dual audit log · WireGuard VPN.
- **`docs/decisions/PARKED_FEASIBILITY_FRAMEWORK_DECISION.md`** — parked decision artefact · example of agent-initiated documentation that respects tier boundaries.
- **`docs/research/PARKED_PROJECTS.md`** — pause/resume protocol for research threads.

---

**End of AUTONOMY_PROTOCOL v1.0.**

Effective 2026-04-22. Binding until amended per §6.

GREEN / YELLOW / RED authority tiers in effect. Agent operates within scope; founder holds ratification and override authority at all times.
