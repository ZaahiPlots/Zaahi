# Staging Supabase Spinup — Day 13 UAT prep

**Audience:** Zhan, execute step-by-step.
**Outcome:** an isolated Supabase project + Vercel preview that hosts
`feat/vault-mvp` against a vault-only DB, ready for the UAT script
to run end-to-end without touching prod.
**Total estimated time:** **~45–60 minutes** of execution + ~5 min
of waiting (Supabase provisioning, Vercel build).

---

## Blockers to resolve before starting

Confirm these BEFORE step 1 to avoid mid-flight surprises:

| Blocker | How to check | Resolution if failing |
|---|---|---|
| **Supabase CLI reachable** | `pnpm dlx supabase --version` — should print `2.98.2` or newer | Already verified on this box. If on a different machine: `npm i -g supabase` or use `pnpm dlx supabase` throughout |
| **`supabase login` is current** | `pnpm dlx supabase projects list` — should show prod project, not "Please login" | Run `pnpm dlx supabase login` and paste the access token from <https://supabase.com/dashboard/account/tokens> |
| **Supabase plan slot** | Free tier = **2 active projects max**. Prod uses one; staging would be the second. Check at <https://supabase.com/dashboard/projects> | If the slot is taken by an old test project, pause or delete it first |
| **Vercel plan** | Per-branch env-var overrides (needed for step 6) require **Pro tier ($20/mo)**. Hobby tier shares one env-var set across all preview branches | If Hobby: either upgrade temporarily, OR create a separate Vercel project pointing at `feat/vault-mvp` exclusively, OR accept that other PRs will use staging env during UAT and revert after |
| **`gh auth status`** | Should show authenticated to `ZaahiPlots/Zaahi` | `gh auth login` |
| **Local `.env.local` readable** | `ls -la .env.local` — confirm exists, not the rotation backup | If only `.env.local.backup-...` exists, restore from password manager |
| **Postgres client on dev box** | `psql --version` — needed for step 4 and seed | `sudo apt install postgresql-client` on Ubuntu |

If any row fails, stop and resolve before continuing — every later step
assumes them all pass.

---

## Section 1 — Pre-checks (~5 min)

Run these read-only commands from the repo root to confirm the env
this walkthrough was written against still matches reality:

```bash
git rev-parse --abbrev-ref HEAD                   # expect: feat/vault-mvp
git log --oneline -1                              # expect HEAD on feat branch
pnpm dlx supabase --version                       # expect >= 2.98.2
psql --version                                    # any 14+ is fine
test -s .env.local && echo "env present" || echo "MISSING .env.local"
```

If `feat/vault-mvp` isn't checked out:

```bash
git fetch origin feat/vault-mvp:feat/vault-mvp
git checkout feat/vault-mvp
```

Note the **5 commits** that comprise the vault MVP work being tested:

```bash
git log --oneline main..feat/vault-mvp | head -20
```

You should see (newest first):
- `bdf33ce` fix(vault): 403 → 404 anti-fishing (G7)
- `5058815` chore(vault): drop dead notification union members (G5, G6)
- `d28a9a2` fix(vault): strip conflictedFields for share recipients (G8)
- `27a4c9c` fix(vault): wire AddPlotWizard launcher (G1)
- `de2f41c` docs(vault): diagnostic
- `9ee4f7f` … `0e8e4f6` — Days 1-12 vault work

---

## Section 2 — Create staging Supabase project (~5 min + ~3 min Supabase provisioning)

### 2.1 Generate a strong DB password

The DB password is the only secret you'll need to keep — paste it
into your password manager **before** running the create command.
Supabase doesn't surface it again after project creation.

```bash
# 40-char URL-safe random — matches the bcrypt-cost rule from the CLAUDE
# rotation playbook. Save the output immediately.
openssl rand -base64 32 | tr -d '/+=' | cut -c1-40
```

Paste output into 1Password / equivalent under entry:
**`zaahi-staging-vault — Supabase DB password (2026-05-14)`**

### 2.2 Create the project

```bash
# Adjust ORG_ID by listing first; ZAAHI has one production org.
pnpm dlx supabase orgs list
# Copy the org id from the printed table.

pnpm dlx supabase projects create zaahi-staging-vault \
  --org-id <ORG_ID> \
  --region eu-central-1 \
  --db-password '<PASTE_40CHAR_PASSWORD>' \
  --plan free
```

- **Region `eu-central-1` (Frankfurt)** — matches prod per CLAUDE.md
  "DEPLOYMENT" section. Don't pick a different region; latency
  between staging Supabase and Vercel `iad1` doesn't matter for
  UAT, but matching prod avoids "works on staging, fails in prod"
  surprises later.
- **Plan: free** — vault MVP touches 4 small tables; the free tier's
  500 MB DB + 50 K MAU is overkill. Step 7 has the keep-or-delete
  decision.

The command returns within ~15 s but the DB itself takes **~2–3 min**
to be reachable. Wait until:

```bash
pnpm dlx supabase projects api-keys --project-ref <STAGING_REF>
```

prints both `anon` and `service_role` keys (not "Project not yet
ready"). The project ref is the 20-char ID at the end of the
project dashboard URL — `pnpm dlx supabase projects list` shows it.

### 2.3 Note the staging connection strings

From `https://supabase.com/dashboard/project/<STAGING_REF>/settings/database`:

- **Connection pooling URI** (port 6543) → goes into `DATABASE_URL`
- **Direct connection URI** (port 5432) → goes into `DIRECT_URL`
  (Prisma uses this for `migrate deploy`)

Both use the DB password from step 2.1.

---

## Section 3 — Build `.env.staging` (~10 min)

Create `.env.staging` in the repo root (it's in `.gitignore` next to
`.env.local`; never commit).

```bash
touch .env.staging
chmod 600 .env.staging
```

Open in your editor and fill from prod values + staging Supabase:

```ini
# ── Database (staging Supabase, NOT prod) ────────────────────────
DATABASE_URL=postgresql://postgres.<STAGING_REF>:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.<STAGING_REF>:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres

# ── Supabase auth (staging, NOT prod) ────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<STAGING_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY_FROM_2.2>
SUPABASE_SERVICE_ROLE_KEY=<STAGING_SERVICE_ROLE_KEY_FROM_2.2>

# ── Misc app-side env vars (copy from prod .env.local as-is) ─────
# These are public/cosmetic — keeping prod values is fine for staging
# because they don't reach back to prod systems.
# (None of these affect vault; listing for completeness.)
```

### 3.1 What NOT to copy from prod

The vault feature talks to Postgres and Supabase Auth only. **Do not**
copy these prod env vars into `.env.staging` — leave them empty so
any accidental code path that needs them fails loudly:

| Prod env var | Why skip |
|---|---|
| `ANTHROPIC_API_KEY` | Vault doesn't call Cat AI / Claude API |
| `RESEND_API_KEY` (if set) | Vault doesn't send email; in-app notifications only |
| `STRIPE_*`, `STRIPE_SECRET_KEY` (if set) | No payments in vault flow |
| `MAPTILER_KEY` / `PROTOMAPS_KEY` (if set) | Map basemap loads via existing public PMTiles in `/public/tiles/` |
| `OPENAI_*` (if set) | Same as Anthropic — not in vault path |
| `SENTRY_*` (if set) | UAT logs are local, no need to spam staging logs to prod Sentry project |
| `VERCEL_*` (auto-injected) | Vercel sets these per environment automatically — never paste manually |

Quick verification that .env.staging has exactly what's needed:

```bash
grep -c '=' .env.staging                  # expect 5 entries
grep -E '^(DATABASE_URL|DIRECT_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.staging | wc -l
# expect 5
```

---

## Section 4 — Apply the vault migration to staging (~2–3 min)

The migration file already lives in
`prisma/migrations/20260513230047_vault_mvp/migration.sql` — 136
lines, 4 tables + 2 enums + 11 indexes + 8 FKs (see diagnostic §1).
`prisma migrate deploy` will apply it AND every prior migration in
the `prisma/migrations/` directory, bringing staging up to current
schema.

```bash
# Load .env.staging into the shell, then run migrate deploy via DIRECT_URL.
# pnpm exec is critical — `pnpm dlx prisma` would fetch a fresh CLI and
# skip our installed version.
set -a; source .env.staging; set +a
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy
```

Expected output:

```
Applying migration `<earlier migrations>` ...
Applying migration `20260513230047_vault_mvp`
The following migration(s) have been applied:
  ...
All migrations have been successfully applied.
```

### 4.1 Verify schema landed

```bash
psql "$DIRECT_URL" -c '\dt "Vault*"'
```

Expected — 4 rows:

```
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+----------
 public | VaultActivity     | table | postgres
 public | VaultEntry        | table | postgres
 public | VaultPriceHistory | table | postgres
 public | VaultShare        | table | postgres
```

```bash
psql "$DIRECT_URL" -c '\d "VaultEntry"' | grep -E '"VaultEntry_.*_(idx|key)"' | wc -l
# expect 6 (5 non-unique + 1 unique on VaultEntry alone)
```

Total vault-table index count: `5 (VaultEntry) + 2 (VaultShare) + 1 (VaultShare unique) + 1 (VaultActivity) + 1 (VaultPriceHistory) + 1 (VaultEntry unique) = 11` ✓

```bash
psql "$DIRECT_URL" -c "SELECT typname FROM pg_type WHERE typname IN ('VaultStage', 'VaultSharePermission');"
# expect both rows
```

If any verification fails: STOP, capture the error, do NOT proceed to
step 5. Most likely cause is a partial migration — `prisma migrate
status` shows the divergence.

---

## Section 5 — Seed minimal UAT data (~10–15 min)

The seed needs **two approved Supabase auth users** + **one sample
parcel**. Auth users are created in the Supabase dashboard (Prisma
can't write to `auth.users` directly); the Prisma User rows + Parcel
row are then created via SQL.

### 5.1 Create two auth users in staging

Open `https://supabase.com/dashboard/project/<STAGING_REF>/auth/users`:

1. Click **Add user** → **Create new user**
   - Email: `zhan-staging@zaahi.io` (or your real address — staging only)
   - Password: generate a strong throwaway, save to password manager
   - Auto-confirm user: **YES** (skip email verification)
2. After creation, click the user row → **User Metadata** tab:
   - Add raw user meta: `{ "approved": true, "role": "ADMIN" }`
3. Note the user's UUID from the row.
4. Repeat for `broker-staging@zaahi.io`:
   - Different password
   - User meta: `{ "approved": true, "role": "BROKER" }`
   - Note the UUID.

### 5.2 Run the seed SQL

Open `docs/specs/phase-2/private-plot-vault/staging-seed.sql` and
replace the two placeholder UUIDs at the top:

```sql
\set FOUNDER_AUTH_ID '\'<UUID_FROM_5.1_STEP_1>\''
\set BROKER_AUTH_ID  '\'<UUID_FROM_5.1_STEP_4>\''
```

Run:

```bash
psql "$DIRECT_URL" -f docs/specs/phase-2/private-plot-vault/staging-seed.sql
```

Expected: `BEGIN`, `INSERT 0 2`, `INSERT 0 1` (or `INSERT 0 0` if the
Parcel ON CONFLICT skipped — fine), `COMMIT`.

### 5.3 Verify seed

```bash
psql "$DIRECT_URL" <<'SQL'
SELECT id, email, role, nickname FROM "User" WHERE email LIKE '%-staging@zaahi.io';
SELECT id, "plotNumber", district, status, "ownerId" FROM "Parcel" WHERE "plotNumber" = '6457940';
SELECT COUNT(*) AS empty_vault FROM "VaultEntry";
SQL
```

Expected:
- 2 `User` rows with ADMIN + BROKER
- 1 `Parcel` row (the seed or an upsert-resolved existing one)
- `empty_vault = 0`

---

## Section 6 — Vercel preview deploy with staging env (~10–15 min)

This is where you decide between two paths depending on your Vercel
plan (see blocker table at top).

### Path A — Vercel Pro: per-branch env-var override

1. Open `https://vercel.com/<team>/zaahi/settings/environment-variables`
2. For each of the 5 env vars in `.env.staging`:
   - Click **Add** (or **Edit** if it already exists for "Preview")
   - **Environment:** Preview
   - **Branch:** `feat/vault-mvp` ← critical: only this branch
   - **Value:** the staging value from `.env.staging`
3. Push the branch tip (if not already pushed):
   ```bash
   git push origin feat/vault-mvp
   ```
4. Watch the deploy in the Vercel dashboard. URL pattern:
   `https://zaahi-git-feat-vault-mvp-<team>.vercel.app`
5. Verify `/vault` loads, `/parcels/map` shows the Layers panel
   with a "My Vault" category.

### Path B — Vercel Hobby: separate "staging" Vercel project

Hobby tier shares one Preview env across all PRs. To avoid breaking
unrelated preview builds:

1. Create a new Vercel project: **Import Git Repository** → same
   `ZaahiPlots/Zaahi` repo → name it `zaahi-staging-vault`
2. **Production branch:** set to `feat/vault-mvp` (so every push to
   that branch deploys to this staging project's production URL)
3. Under Environment Variables → Production scope, paste the 5
   staging env vars.
4. Trigger first deploy: push or "Redeploy" from the dashboard.
5. URL: `https://zaahi-staging-vault.vercel.app`

### 6.1 Smoke-test the preview

Visit the preview URL, sign in as `zhan-staging@zaahi.io`:

- [ ] `/vault` loads, EmptyState renders "Your vault is empty"
- [ ] "+ Add to vault" button (top-right) is visible
- [ ] Click it → AddPlotWizard modal opens (Step 1 PlotLookup)
- [ ] Layers panel on `/parcels/map` shows a "My Vault" category
      with two toggles
- [ ] `GET /api/me/vault/entries` → 200 with `items: []`
- [ ] `GET /api/me/vault/map` → 200 with `features: []`

If any smoke check fails → STOP, capture the failure, do not start
the UAT script. The failure goes into the bug list before re-spinning.

---

## Section 7 — Teardown plan

### 7.1 Keep-or-delete decision matrix

| Question | Keep staging | Delete staging |
|---|---|---|
| Will we run more cohort UATs in next 2 weeks? | Yes | No |
| Free-tier slot needed for anything else? | No | Yes |
| Cost tolerance | $0 free tier (pauses after 7d inactivity) | $0 |
| Risk of accidental writes from local dev | Mitigated by separate password | Eliminated |

**Default recommendation: delete staging immediately after Day 14
prod deploy succeeds.** Re-spin is cheap (~10 min total) when the
next UAT comes. Staging databases that linger drift away from prod
and become misleading.

### 7.2 Delete steps

```bash
pnpm dlx supabase projects delete --project-ref <STAGING_REF>
```

(Confirm `Y` at the prompt — Supabase asks for explicit project name
confirmation.)

In Vercel:
- **Path A:** delete the 5 branch-scoped env vars from the prod
  project's Environment Variables panel.
- **Path B:** delete the `zaahi-staging-vault` Vercel project
  entirely.

Locally:

```bash
rm .env.staging
# .env.staging entry in .gitignore stays — it's still ignored if
# you re-create it later.
```

### 7.3 Cost if kept

| Plan | Monthly cost | What you get |
|---|---|---|
| Free | **$0** | 2 active projects, 500 MB DB, 50 K MAU, pauses after 7 days of inactivity |
| Pro | $25 | 4 active projects, no auto-pause, daily backups, 8 GB DB |

For staging, **Free is correct** — the 7-day auto-pause is a feature
(reminds you to delete unused staging). If you keep it past 7 days
without traffic, Supabase pauses it; un-pause is one click in the
dashboard and re-warms in ~30 s.

---

## Section 8 — Rollback if UAT fails

UAT failures **do not** require destructive action on prod or
`feat/vault-mvp`. The blast radius is fully isolated:

| Failed component | What stays safe | Rollback action |
|---|---|---|
| Migration didn't apply | Prod DB untouched (no `migrate deploy` ran against prod) | `pnpm dlx supabase projects delete --project-ref <STAGING_REF>` + re-spin from step 2 |
| Auth users misconfigured | Prod auth users untouched | Delete + re-create the two staging users in the dashboard |
| Seed data wrong | Prod data untouched | `psql "$DIRECT_URL"` → manual `DELETE FROM "User" WHERE email LIKE '%-staging@zaahi.io'` then re-run section 5 |
| Preview deploy crashes | `main` branch + prod deploy untouched | Roll the branch's HEAD back (`git revert <commit>` or push a fix) — Vercel auto-deploys preview again |
| UAT scenario S1–S11 fails on real bug | `feat/vault-mvp` keeps the failing code as a known reference point | File the fix on `feat/vault-mvp`, push, preview redeploys, re-run only the failing scenario |
| Founder wants the whole vault feature shelved | `main` HEAD `5864859` untouched | Walk away from `feat/vault-mvp` — no merge happened, nothing rolls back |

### 8.1 The two destructive moments to NEVER do during UAT

1. **`prisma migrate deploy` against prod DB** — this is Day 14, not
   Day 13. If staging is set up correctly, `DATABASE_URL` always
   points to staging during UAT.
2. **Merge `feat/vault-mvp` → `main`** — this is Day 14. Vercel will
   auto-deploy prod on merge. Do not merge until UAT report is green
   and you've explicitly approved Day 14.

If either happens by mistake, that's a real rollback scenario — `git
revert` the merge commit, force-push only with explicit founder sign-
off (CLAUDE.md AGENT RULES § force-push prohibition).

---

## Execution summary checklist

Tick off as you go. Total target ~60 min, including 5-min Supabase
provision wait.

- [ ] Section 1 pre-checks pass (5 min)
- [ ] Supabase project `zaahi-staging-vault` created (5 min + 3 min wait)
- [ ] DB password saved to password manager
- [ ] `.env.staging` populated, 5 entries (10 min)
- [ ] `prisma migrate deploy` succeeded, 4 vault tables verified (3 min)
- [ ] 2 auth users created + approved in Supabase dashboard (10 min)
- [ ] `staging-seed.sql` ran, User + Parcel rows verified (5 min)
- [ ] Vercel preview deploy live, smoke-test passed (10 min)
- [ ] **Ready to start UAT script S1**

When the last box ticks, ping me and I'll walk through the UAT
script scenario by scenario — or you run it solo and just report
the pass/fail summary at the end.
