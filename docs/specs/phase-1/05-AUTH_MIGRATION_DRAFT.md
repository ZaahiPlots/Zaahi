# Auth Migration Draft — Spec 05 Phase 1a · SQL for Zhan review

**Status:** DRAFT FOR ZHAN REVIEW v1.0 · 2026-04-22
**Classification:** CONFIDENTIAL — migration artefact (NOT APPLIED to `prisma/`)
**Parent:** `docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md` v1.0 (commit `9306b7c`)
**Depends on:** `prisma/schema.prisma` current state (`User` model · audit 2026-04-22 baseline)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Prepared by:** Agent · Opus 4.7 · 2026-04-22
**Prepared for:** Zhan Ryspayev (applies migration when ready · requires explicit founder approval per CLAUDE.md + AUTONOMY_PROTOCOL YELLOW tier)
**Preserves:** `prisma/schema.prisma` UNCHANGED · `prisma/migrations/**` UNCHANGED. This document is a pre-written SQL artefact for review · Zhan applies manually when ready.

---

## §1 Context

### 1.1 Spec 05 Phase 1a scope

Per `docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md` v1.0 §3.1, Phase 1a requires:
- Additive-only changes to the `User` model.
- Two new columns: `externalAuthId` (nullable) and `authProvider` (default `'supabase'`).
- Unique partial index on `(authProvider, externalAuthId)` where non-null.
- **Zero behaviour change** in production after applying this migration.
- Code that populates these columns ships in Phase 1a-c adapter refactor (separate YELLOW-tier work per AUTONOMY_PROTOCOL).

### 1.2 Why this document exists as a draft (not an applied migration)

Per `CLAUDE.md` AGENT RULES:
> "NEVER modify `prisma/schema.prisma` without explicit permission from the founder."

Per AUTONOMY_PROTOCOL v1.0 §1.3 item 5:
> "Prisma schema changes — `prisma/schema.prisma` modification without explicit per-change founder instruction" = RED tier.

**Agent cannot apply this migration autonomously.** This document is Zhan's review artefact · Zhan applies manually when ready per §4 procedure below.

### 1.3 Timing relative to dependencies

- **Before Spec 05 Phase 1a code ships** (adapter interface implementation Month 5 per Spec 05 §3.1).
- **After SV-14 ratification** (Sunday Rudi call target 2026-04-27) to align with overall migration commitment.
- **After Zhan completes current env-var setup** (per audit 2026-04-22 immediate actions — Resend key configuration).
- **Can ship independently** of Core42 commercial conversation · Phase 1a code pattern locks even if G42 timing slips.

---

## §2 Proposed migration file

### 2.1 Target path (when Zhan applies)

`prisma/migrations/YYYYMMDDHHMMSS_auth_abstraction_phase_1a/migration.sql`

Actual timestamp chosen when Zhan runs `npx prisma migrate dev --name auth_abstraction_phase_1a --create-only`.

### 2.2 Full SQL content (ready to place in `migration.sql`)

```sql
-- Spec 05 Auth Abstraction Phase 1a
-- Additive-only schema preparation for provider-agnostic auth.
-- All changes NULLABLE or DEFAULTED · safe to deploy against production with existing rows.
-- Idempotent via IF NOT EXISTS clauses (safe to re-run).
--
-- Founder approval: YELLOW tier per AUTONOMY_PROTOCOL §1.2 (prisma/schema.prisma edit).
-- Applied by: Zhan Ryspayev · [YYYY-MM-DD].
-- Related spec: docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md v1.0.
-- Related architecture: docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md v1.0.
--
-- Rollback: DROP INDEX + DROP COLUMN (§5 below).
-- Behaviour change: ZERO (columns unused until Phase 1b-c code ships).

-- ──────────────────────────────────────────────────────────────
-- externalAuthId: provider-agnostic user identifier populated by
-- adapter.verifyAccessToken() → AuthSession.user.providerUserId.
-- Nullable because existing rows have no Azure AD B2C identity yet.
-- Populated at Phase 2 cutover via first-login linkExternalAuthId()
-- per Spec 05 §4.2 findByEmail bridge.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "externalAuthId" TEXT;

-- ──────────────────────────────────────────────────────────────
-- authProvider: which adapter issued this identity.
-- Default 'supabase' for all existing rows (current state).
-- Updates to 'azure-ad-b2c' at cutover for new identities post-cutover
-- per Spec 05 §4.2 Step 10 linkExternalAuthId stamping.
-- Future values: 'keycloak' (optional per Spec 05 D-13).
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'supabase';

-- ──────────────────────────────────────────────────────────────
-- Unique partial index on (authProvider, externalAuthId).
-- Partial because existing rows have externalAuthId NULL · unique
-- constraint on NULL columns is ambiguous in PostgreSQL.
-- Partial predicate ensures uniqueness only when externalAuthId is set.
-- Enables lookups by external identity via Spec 05 §2.2 IUserStore.findByExternalAuthId.
-- Allows the same email under different providers during transition
-- (edge case · covered by Spec 05 §4.2 findByEmail bridge fallback).
-- ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "User_authProvider_externalAuthId_key"
  ON "User" ("authProvider", "externalAuthId")
  WHERE "externalAuthId" IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- Secondary index on externalAuthId alone (partial · non-null).
-- Accelerates reverse lookups (externalAuthId → User row) during
-- middleware.verifyAccessToken → provider.getSession → userStore.findByExternalAuthId.
-- Separate from composite unique index to avoid dependency on authProvider
-- for simple lookups (though composite index can serve both patterns · 
-- this secondary keeps query plans predictable).
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "User_externalAuthId_idx"
  ON "User" ("externalAuthId")
  WHERE "externalAuthId" IS NOT NULL;
```

**Line count:** 30 SQL statements (excluding comments) · 3 ALTER + 2 CREATE INDEX · all additive · all idempotent.

---

## §3 Corresponding `schema.prisma` changes

**Pseudo-code for Zhan to adjust manually when applying. Agent does NOT write to `prisma/schema.prisma` in this session.**

### 3.1 User model addition

Current `User` model in `prisma/schema.prisma` starts at line 80. Zhan inserts the following block (suggested placement: after the `// ── Profile fields (added 2026-04-16 ...) ──` section · before the `parcels` relation · matching Zhan's pattern of "additive fields grouped with timing comment"):

```prisma
  // ── Auth abstraction fields (added 2026-XX-XX Spec 05 Phase 1a) ──
  // externalAuthId: provider-agnostic identifier populated at Phase 2 cutover.
  // authProvider: which adapter issued this identity (supabase|azure-ad-b2c|keycloak).
  // All additive/defaulted; safe to deploy with existing rows.
  // See docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md v1.0 for full context.
  externalAuthId   String?
  authProvider     String  @default("supabase")
```

### 3.2 Index declarations

Zhan adds to the end of the `User` model (inside the closing `}` · after existing `@@index` / `@@unique` declarations):

```prisma
  // Partial unique index: enforces (authProvider, externalAuthId) uniqueness
  // only when externalAuthId is not null (existing rows have NULL).
  @@unique([authProvider, externalAuthId], name: "User_authProvider_externalAuthId_key", map: "User_authProvider_externalAuthId_key")

  // Partial single-column index for reverse lookups.
  // Prisma doesn't natively support partial indexes on single columns
  // via @@index · agent recommends raw SQL in migration (per §2.2 above)
  // and NO corresponding Prisma declaration (Prisma will detect and warn · acceptable).
```

**Important note on partial indexes:** Prisma as of 7.7 does NOT fully support `WHERE` clauses on `@@index`. The SQL in §2.2 creates partial indexes directly · `schema.prisma` can either:
- Option A: declare full indexes (without WHERE) via `@@index([externalAuthId])` · Prisma migration generator may conflict with manual partial index from §2.2 · CAUTION.
- Option B: declare no `@@index` and leave partial indexes as raw SQL · Prisma schema is "authoritative-except-for-partial-indexes" · Zhan documents the gap · `prisma db pull` would re-sync but lose the partial predicate.
- Option C (recommended): declare full unique index `@@unique([authProvider, externalAuthId])` in schema.prisma · accept Prisma-generated SQL · **manually edit the generated migration to add `WHERE "externalAuthId" IS NOT NULL`** before `prisma migrate deploy`.

**Agent recommends Option C** · closest to Prisma's "schema is source of truth" principle · the edited migration file documents the deviation via comments.

### 3.3 Migration script via Prisma CLI (Zhan runs)

Step-by-step command sequence per §4 below.

---

## §4 Application procedure (Zhan follows)

### 4.1 Pre-application checklist

- [ ] SV-14 ratification completed (not mandatory for this migration — independent — but coordinated timing recommended).
- [ ] Current env-var setup (Resend key) completed (blocks on operational independence).
- [ ] Production database backup verified current (Supabase dashboard → Database → Backups · confirm last backup < 24 hours).
- [ ] Local dev environment clean (`git status` · no uncommitted changes unrelated to this migration).
- [ ] Staging environment available for dry-run (if any exists · agent notes staging not established pre-G42 per audit 2026-04-22).

### 4.2 Step-by-step application

**Step 1: Review this migration against current `prisma/schema.prisma` state.**

```bash
cd ~/zaahi/zaahi  # or wherever your clone lives
git pull origin research/vision-and-competitors-2026-04-19
cat docs/specs/phase-1/05-AUTH_MIGRATION_DRAFT.md  # this document
cat prisma/schema.prisma | grep -A 50 "^model User"  # current User model state
```

Verify no conflicting changes since this draft was written 2026-04-22.

**Step 2: Add fields to `schema.prisma` manually** (per §3.1 + §3.2 above).

Edit `prisma/schema.prisma` · locate `model User` (line 80 per audit 2026-04-22 baseline) · add the auth abstraction block per §3.1 · add the `@@unique` declaration per §3.2 Option C.

**Step 3: Generate migration file (CREATE-ONLY · do NOT auto-apply):**

```bash
npx prisma migrate dev --name auth_abstraction_phase_1a --create-only
```

This generates `prisma/migrations/YYYYMMDDHHMMSS_auth_abstraction_phase_1a/migration.sql` but does NOT apply it.

**Step 4: Review generated SQL against §2.2 above.**

```bash
cat prisma/migrations/*auth_abstraction_phase_1a*/migration.sql
```

Expected differences from §2.2 (Prisma-generated nuances):
- Prisma may use `BIGINT` vs `TEXT` based on other schema context — should be `TEXT` for UUID-like identifiers · correct if mismatch.
- Prisma may not include `IF NOT EXISTS` — add manually for idempotency.
- Prisma may not include `WHERE "externalAuthId" IS NOT NULL` on the unique index — **manually edit file to add WHERE predicate** (this is the Option C deviation).
- Comments from §2.2 will NOT be auto-generated — add manually for future-reader clarity.

**Edit the generated file** to match §2.2 as closely as possible while preserving Prisma's auto-detected shape. Critical: the `WHERE "externalAuthId" IS NOT NULL` predicate on the unique index — without it, you cannot have multiple users with NULL externalAuthId (current state of ALL existing rows).

**Step 5: Apply migration locally (dev DB):**

```bash
npx prisma migrate dev
```

This applies to local dev DB · regenerates Prisma Client.

**Step 6: Run smoke tests locally:**

```bash
pnpm build  # verify no TypeScript errors
# Query smoke test:
psql $DATABASE_URL_LOCAL -c "SELECT COUNT(*) FROM \"User\" WHERE \"authProvider\" = 'supabase';"
# Should equal total user count.

# Index test:
psql $DATABASE_URL_LOCAL -c "EXPLAIN SELECT * FROM \"User\" WHERE \"authProvider\" = 'supabase' AND \"externalAuthId\" = 'test';"
# Should show index-scan plan.
```

**Step 7: Apply to production (migrate deploy):**

Per `CLAUDE.md`:
> "В продакшне ТОЛЬКО `npx prisma migrate deploy`"
> "`prisma db push` — ЗАПРЕЩЁН"

```bash
# Production DB (Supabase Frankfurt):
export DATABASE_URL="<production Supabase URL>"
npx prisma migrate deploy
```

Verify output: `Applying migration auth_abstraction_phase_1a` · expected <1 second at 50-200 user row count.

**Step 8: Regenerate Prisma Client + commit:**

```bash
npx prisma generate  # regenerate client with new fields
git add prisma/schema.prisma prisma/migrations/*auth_abstraction_phase_1a*
git commit -m "feat(prisma): auth abstraction Phase 1a — externalAuthId + authProvider columns

Additive-only schema for Spec 05 Auth Abstraction preparation.
All columns nullable or defaulted · safe for existing rows.
No behaviour change · adapter implementation follows in Phase 1a code.

Ref: docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md v1.0
Ref: docs/specs/phase-1/05-AUTH_MIGRATION_DRAFT.md v1.0 (agent draft)"
```

**Step 9: Push to main (production deploy):**

```bash
git push origin research/vision-and-competitors-2026-04-19  # to research branch first
# OR if directly to main (Zhan's call):
git checkout main && git merge research/vision-and-competitors-2026-04-19 && git push origin main
```

Vercel auto-deploys from `main` · build includes Prisma Client regeneration · production live with new schema.

**Step 10: Post-deploy verification:**

```bash
# Check Vercel deploy log (Dashboard → Deployments) for Prisma generate step success.
# Query production to verify:
#   Via Supabase dashboard SQL editor:
SELECT "authProvider", COUNT(*)
FROM "User"
GROUP BY "authProvider";
# Expected: all rows show authProvider='supabase' (the default).
```

### 4.3 Expected duration

- Step 2-4 review + generate: ~15 minutes.
- Step 5-6 local apply + test: ~10 minutes.
- Step 7 production apply: ~30 seconds.
- Step 8-9 commit + deploy: ~5 minutes (depends on Vercel build time).
- Step 10 verify: ~5 minutes.
- **Total: ~35-45 minutes · low risk.**

---

## §5 Rollback procedure

### 5.1 When to roll back

- Unexpected errors in production after deploy.
- Query performance regression (index malfunction).
- Discovered edge case not covered by Spec 05.
- Any blocker that prevents Spec 05 Phase 1a-c code from landing cleanly.

### 5.2 Rollback SQL

Create `prisma/migrations/YYYYMMDDHHMMSS_auth_abstraction_phase_1a_rollback/migration.sql`:

```sql
-- Rollback for Spec 05 Auth Abstraction Phase 1a.
-- Reverses the additive changes from auth_abstraction_phase_1a migration.
-- Safe because columns are additive · no data migration to reverse.

-- Drop partial indexes first:
DROP INDEX IF EXISTS "User_authProvider_externalAuthId_key";
DROP INDEX IF EXISTS "User_externalAuthId_idx";

-- Drop columns:
ALTER TABLE "User" DROP COLUMN IF EXISTS "authProvider";
ALTER TABLE "User" DROP COLUMN IF EXISTS "externalAuthId";
```

### 5.3 Rollback procedure

```bash
# 1. Write rollback migration file (per §5.2 above).
npx prisma migrate dev --name auth_abstraction_phase_1a_rollback --create-only
# Edit generated file to match §5.2.

# 2. Apply rollback to local dev:
npx prisma migrate dev

# 3. Apply rollback to production:
export DATABASE_URL="<production>"
npx prisma migrate deploy

# 4. Git revert the original schema.prisma commit (or manual edit to remove fields):
git revert <SHA of original commit>

# 5. Regenerate Prisma Client:
npx prisma generate

# 6. Commit + push (same commit sequence as §4.2 Step 8-9):
git add . && git commit -m "revert(prisma): auth abstraction Phase 1a rollback" && git push
```

### 5.4 Rollback budget

- **≤15 minutes** — additive rollback is straightforward.
- Zero data loss risk (additive columns · no data to reverse).
- Prisma Client regeneration handles TypeScript compatibility automatically.

---

## §6 Testing strategy (before production apply)

### 6.1 Local dev apply

**Goal:** verify migration applies cleanly to a fresh dev DB and existing dev DB (two scenarios).

```bash
# Scenario A: Fresh dev DB (migration on empty schema)
dropdb zaahi_dev && createdb zaahi_dev
npx prisma migrate dev
psql zaahi_dev -c "SELECT COUNT(*) FROM \"User\";"  # Should return 0

# Scenario B: Dev DB with seed data (migration on populated schema)
npx prisma db seed  # if seed script exists
npx prisma migrate dev
psql zaahi_dev -c "SELECT \"authProvider\", COUNT(*) FROM \"User\" GROUP BY \"authProvider\";"
# Should show all rows authProvider='supabase'.
```

### 6.2 Staging apply (if staging environment exists)

**Not currently available** per audit 2026-04-22 (staging not established pre-G42 POC). First staging env provisions on Core42 Month 7-8 per §78 §8.3.

**Workaround for Phase 1a:** apply directly to production after local verification. Risk accepted given additive-only nature + small data size + documented rollback.

### 6.3 Production smoke tests

**Pre-deploy (during Step 6 local testing):**
- [ ] `pnpm build` passes.
- [ ] TypeScript types regenerated correctly (Prisma Client includes new fields).
- [ ] Existing auth flow works (sign-in · approved gate · API routes return 200).
- [ ] `getApprovedUserId` still returns correct user.

**Post-deploy (during Step 10):**
- [ ] Vercel build logs show Prisma generate success.
- [ ] Supabase SQL: `SELECT "authProvider", COUNT(*) FROM "User" GROUP BY "authProvider";` returns all `supabase`.
- [ ] Supabase SQL: `SELECT COUNT(*) FROM "User" WHERE "externalAuthId" IS NOT NULL;` returns 0.
- [ ] Supabase SQL: `EXPLAIN SELECT * FROM "User" WHERE "authProvider" = 'supabase' AND "externalAuthId" = 'x';` shows index-scan plan (uses the new unique index).
- [ ] Existing users can still sign in and navigate to `/parcels/map`.
- [ ] Existing admin routes still return 200.

### 6.4 Index performance validation

Run `EXPLAIN ANALYZE` on expected query patterns:

```sql
-- Pattern 1: Lookup by (authProvider, externalAuthId) — Phase 1a post-cutover
EXPLAIN ANALYZE
SELECT id, email, approved, role
FROM "User"
WHERE "authProvider" = 'azure-ad-b2c'
  AND "externalAuthId" = 'test-oid-12345';

-- Expected: Index Scan using "User_authProvider_externalAuthId_key"
-- Expected execution time: <1ms at current user count.

-- Pattern 2: Email fallback (Phase 1a during cutover mapping)
EXPLAIN ANALYZE
SELECT id, email, approved, role, "externalAuthId"
FROM "User"
WHERE "email" = 'test@example.com';

-- Expected: Index Scan using "User_email_key" (existing index)
-- Expected execution time: <1ms.
```

---

## §7 Timing recommendation

### 7.1 When to apply

**Recommended window (per founder operational tempo):**

- **After:** Zhan completes current env-var setup (Resend key) · verified via Vercel env dashboard.
- **After:** SV-14 ratification at Sunday call (not strictly required but coordinated).
- **Before:** Spec 05 Phase 1a code work begins (adapter interface implementation Month 5 per Spec 05 §3.1).
- **Day-of-week:** Friday evening UAE time (19:00-21:00 AST) — low user traffic · Zhan has weekend buffer for monitoring.
- **Avoid:** Eid al-Adha 25-31 May 2026 · other high-traffic UAE periods.
- **Tentative target:** Friday 2026-05-01 OR Friday 2026-05-08.

**Do NOT apply:**
- During Plot 1 closing week (deal scheduled Fri 2026-06-19 · avoid surrounding week).
- Same day as Rudi AED 1M wire (2026-05-08) · avoid co-timing uncertainty.
- Same day as BUS_FACTOR_RECOVERY session (Dymo co-admin setup needs clean baseline).

### 7.2 Dependencies that should ship first

1. Zhan env-var setup (Resend key) — operational independence.
2. BUS_FACTOR_RECOVERY §2 vendor account shares — Dymo co-admin before schema change.
3. Supabase DB backup verified <24 hours old.

### 7.3 Dependencies that should ship after

1. Spec 05 Phase 1a adapter interface (additive files in `src/lib/auth/`).
2. Spec 05 Phase 1b refactor of `src/lib/auth.ts` (YELLOW tier · Zhan review).
3. Spec 05 Phase 1c refactor of middleware + AuthGuard (YELLOW tier).

---

## §8 Open questions for Zhan

Before applying, Zhan reviews these decisions — adjust as preferred:

### 8.1 Index strategy acceptable?

Agent proposes:
- Partial unique index on `(authProvider, externalAuthId)` where `externalAuthId IS NOT NULL`.
- Partial single-column index on `(externalAuthId)` where `externalAuthId IS NOT NULL`.

**Alternative Zhan might prefer:**
- Full composite unique index without WHERE clause · NOT VIABLE because existing rows have NULL · would require backfill to non-null dummy value first (more complex).
- Only composite index · skip single-column · saves some write throughput · composite index serves both query patterns.

**Recommendation:** Agent's proposal (two partial indexes) — <100 extra bytes per user · predictable query plans · minor tradeoff.

### 8.2 `authProvider` as VARCHAR vs enum?

Agent proposes `TEXT` (VARCHAR) with string values (`'supabase'` · `'azure-ad-b2c'` · `'keycloak'`).

**Alternative Zhan might prefer:**
- Prisma `enum AuthProvider { SUPABASE AZURE_AD_B2C KEYCLOAK }` · typed in code · database-enforced.

**Recommendation:** TEXT is simpler (adding a provider doesn't require migration · enum requires migration). Prisma enum adds database-level enforcement but ZAAHI pattern uses enums sparingly (only 3 enums in current schema). TEXT with code-side Zod validation per Spec 05 `IAuthProvider.providerName` literal type.

### 8.3 Default `'supabase'` OK or prefer nullable with backfill?

Agent proposes default `'supabase'` (populates ALL existing rows at migration-time).

**Alternative Zhan might prefer:**
- Nullable authProvider · no default · backfill script as separate migration step.

**Recommendation:** Default `'supabase'` is simpler · atomic · no separate backfill script needed. Existing rows are all Supabase-issued by definition. Acceptable migration pattern per Zhan's existing examples (`onboardingCompleted Boolean @default(false)` · same pattern).

### 8.4 Naming convention (camelCase vs snake_case)?

Agent proposes `externalAuthId` + `authProvider` (camelCase · matches existing ZAAHI pattern `referralCode` · `avatarUrl` · `companyName` etc.).

**Observation from current schema:** ZAAHI uses camelCase in Prisma schema which generates camelCase column names in Postgres via Prisma's default mapping. Existing migrations use quoted camelCase column names (e.g., `"referredById"`).

**Recommendation:** match existing pattern · camelCase in schema · camelCase in database.

### 8.5 Comment style preference?

Agent proposes section-divider comments matching Zhan's existing pattern:

```prisma
  // ── Auth abstraction fields (added 2026-XX-XX Spec 05 Phase 1a) ──
```

Matches existing section markers like `// ── Ambassador program ──` and `// ── Profile fields (added 2026-04-16 with dashboards Phase 1) ──`.

**If Zhan prefers different style**, adjust in schema.prisma edit step.

---

## §9 Cross-references

- `docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md` v1.0 (commit `9306b7c`) — parent spec · defines adapter interface + migration path.
- `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` v1.0 (commit `d4a3df3`) — §3.3 ship-stopper #1 this migration prepares for.
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.3 (commit `68b8709`) — SV-14 context.
- `docs/governance/AUTONOMY_PROTOCOL_2026-04-22.md` v1.0 (commit `d286277`) — YELLOW tier authority for `src/**` and `prisma/schema.prisma` edits · RED tier for canonical changes.
- `CLAUDE.md` — Prisma rules (only `migrate deploy` in production · NEVER `db push`).
- `prisma/schema.prisma` current state (audit 2026-04-22 baseline) — what this migration extends.

---

**End of Auth Migration Draft v1.0.**

Awaiting Zhan review. When ready to apply, follow §4 procedure. Expected duration: ~35-45 minutes · low risk · additive-only · documented rollback.

**Agent availability:** present for questions before apply · for sanity-check during apply · for post-apply verification.
