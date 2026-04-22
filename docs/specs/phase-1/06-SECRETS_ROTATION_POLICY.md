# Spec 06 — Secrets Rotation Policy · pre-G42 ritual · Azure Key Vault target

**Status:** DRAFT v1.0 · 2026-04-22
**Classification:** CONFIDENTIAL — security policy
**Parent:** `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` v1.0 (this session · §2.4 secrets inventory)
**Depends on:** `docs/audits/WEB_PLATFORM_CURRENT_STATE_2026-04-22.md` (commit `51c926d` §1.5 env vars finding · §3 secrets-rotation gap) · Spec 03 v2.0 Admin §14.9 AuditLog append-only pattern (commit `0cd6542`)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Prepared by:** Agent · Opus 4.7 · 2026-04-22
**Prepared for:** Zhan (Founder · rotation executor) · Dymo (Co-admin · backup rotation executor post-BUS_FACTOR fix) · Rudi (informational · quarterly audit review)
**Preserves:** `.env.local` NEVER committed · `prisma/schema.prisma` READ-ONLY this spec · `src/**` READ-ONLY this spec.

---

## §0 Purpose + scope

This document specifies:
1. **Secrets inventory** · full enumeration of ZAAHI environment variables (per audit 2026-04-22 §1.5).
2. **Rotation cadence** · quarterly / semi-annual / annual by blast radius.
3. **Event-triggered rotation** · admin offboarding · suspected leak · laptop theft · vendor breach.
4. **Per-secret rotation procedure** · step-by-step · zero-downtime where possible.
5. **Secret storage evolution** · Vercel env vars (today) → 1Password Teams (short-term) → Azure Key Vault (post-G42 cutover).
6. **Audit logging** · every rotation event recorded via AuditLog append-only pattern per Spec 03 v2.0 §14.9.
7. **Pre-G42 rotation ritual** · clean-state secret rotation before cutover · documented in §78 G42 Migration Architecture §5 cutover procedure.

**Target ship:**
- v1.0 policy in force today (docs only · establishes discipline immediately).
- Short-term storage (1Password Teams) upgrade: Month 3 (~AED 20/mo recurring).
- First scheduled quarterly rotation: Month 6 (Q3 2026 cycle).
- Pre-G42 rotation ritual: Month 8-9 (T-30 to T-0 per §78 §5.1 cutover checklist).
- Azure Key Vault migration: Month 9-10 cutover (per §78 §3.2 row 13).

---

## §1 Secrets inventory

### §1.1 Current env vars enumerated (per audit 2026-04-22 §1.5)

**9 environment variables across 5 classifications:**

| # | Name | Classification | Purpose | Consumer |
|:-:|---|:-:|---|---|
| 1 | `DATABASE_URL` | **CRITICAL** | Supabase PostgreSQL connection string (includes password) | Prisma client (server-side only) |
| 2 | `NEXT_PUBLIC_SUPABASE_URL` | HIGH | Public Supabase project URL | Supabase JS client (browser + server) |
| 3 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | HIGH | Public anonymous API key (restricted by RLS) | Supabase JS client (browser + server) |
| 4 | `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL** | Full-privilege admin API key (bypasses RLS) | Server-side admin operations only |
| 5 | `ANTHROPIC_API_KEY` | **CRITICAL** | Claude API key (billed against ZAAHI account) | `src/app/api/chat/route.ts` (Archibald endpoint) |
| 6 | `RESEND_API_KEY` | HIGH | Email service API key (being added today per Zhan env-var task) | `src/lib/email.ts` |
| 7 | `TELEGRAM_BOT_TOKEN` | MEDIUM | Telegram bot API token | `src/lib/telegram.ts` |
| 8 | `TELEGRAM_ADMIN_CHAT_ID` | MEDIUM | Admin notification chat ID | `src/lib/telegram.ts` |
| 9 | `TELEGRAM_FOUNDER_CHAT_ID` | MEDIUM | Founder personal notification chat ID | `src/lib/telegram.ts` |

**Additional secrets (not env vars · inventoried for completeness):**

| # | Secret | Classification | Storage today | Migration |
|:-:|---|:-:|---|---|
| 10 | TRON USDT wallet seed phrase (Ambassador treasury) | **CRITICAL** | Offline · Zhan's storage (per CLAUDE.md) | SV-7 multisig Month 5-6 · Shamir-split per SV-6 |
| 11 | Vercel deployment token | **CRITICAL** | Vercel account · OAuth-scoped | Post-cutover: retire (no Vercel) |
| 12 | GitHub personal access token (Zhan) | HIGH | Zhan's GitHub settings | Rotate quarterly · unchanged location |
| 13 | Namecheap API key (if used) | MEDIUM | Namecheap account | Audit whether in use · rotate if yes |
| 14 | Google OAuth client secret (Supabase-configured) | HIGH | Supabase console | Migrate to Azure AD B2C console at cutover |
| 15 | Anthropic zero-retention DPA key (SV-1) | **CRITICAL** | Anthropic enterprise account | Retain · rotate quarterly |

**Total: 15 distinct secret artefacts across environment variables + adjacent credentials.**

### §1.2 Classification by blast radius

**CRITICAL (5 items · rotate quarterly · or immediate on suspected compromise):**
- DATABASE_URL (full DB access · PII exposure)
- SUPABASE_SERVICE_ROLE_KEY (bypasses RLS · PII + commission ledger)
- ANTHROPIC_API_KEY (billable · attacker drains budget)
- TRON USDT wallet seed (treasury theft · irreversible)
- Vercel deployment token (production deploy · code injection)
- Anthropic enterprise DPA key (bypasses zero-retention · PDPL impact)

**HIGH (5 items · rotate semi-annually):**
- NEXT_PUBLIC_SUPABASE_URL (discoverable but enumerable)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS-limited · but still API surface)
- RESEND_API_KEY (spam from ZAAHI domain · reputation damage)
- GitHub personal access token (code read · secret exposure via commits)
- Google OAuth client secret (OAuth impersonation · user account takeover)

**MEDIUM (3 items · rotate annually):**
- TELEGRAM_BOT_TOKEN (notification spam · admin channel hijack)
- TELEGRAM_ADMIN_CHAT_ID (not secret but operationally sensitive)
- TELEGRAM_FOUNDER_CHAT_ID (not secret but operationally sensitive)
- Namecheap API key (if used · DNS takeover surface)

**Blast radius rationale:**
- CRITICAL = direct access to production data OR direct financial loss OR direct production code execution.
- HIGH = requires additional exploitation step (RLS bypass exists but requires chained vulnerability · or reputation damage without immediate data loss).
- MEDIUM = operational annoyance · recovery is hours not days.

---

## §2 Rotation cadence

### §2.1 Scheduled rotation cadence

| Classification | Cadence | Mechanism | Owner |
|:-:|:-:|:-:|:-:|
| CRITICAL | **90 days (quarterly)** | Manual Q1 · Automated post-G42 (Azure Key Vault auto-rotation) | Zhan primary · Dymo backup |
| HIGH | **180 days (semi-annual)** | Manual · calendar-scheduled | Zhan primary · Dymo backup |
| MEDIUM | **365 days (annual)** | Manual · calendar-scheduled | Zhan primary · Dymo backup |

**Calendar anchor dates (2026-2027 · adjusted for Eid / Ramadan):**

| Quarter | Target rotation window | CRITICAL? | HIGH? | MEDIUM? |
|:-:|:-:|:-:|:-:|:-:|
| Q1 2026 | Already past (pre-this-spec) | — | — | — |
| Q2 2026 | **2026-07-15 (Month 6)** — first scheduled rotation | ✓ | — | — |
| Q3 2026 | **2026-10-15 (Month 9)** — pre-G42 cutover ritual + quarterly CRITICAL | ✓ (all) | ✓ (all) | — |
| Q4 2026 | **2026-12-20 (Month 11 · post-cutover)** — quarterly CRITICAL · Key Vault era | ✓ | — | — |
| Q1 2027 | **2027-03-20 (Month 14)** — quarterly CRITICAL + annual MEDIUM | ✓ | — | ✓ |
| Q2 2027 | **2027-06-20 (Month 17)** — quarterly + semi-annual HIGH | ✓ | ✓ | — |

### §2.2 Event-triggered rotation (mandatory · same-day execution)

**Rotation triggers with 24-hour SLA:**

1. **Admin offboarding.** Any time an admin (Zhan · Dymo · Rudi · future hires) loses admin status for any reason. Rotate all CRITICAL secrets same-day. Remove admin from 1Password + Azure Key Vault + Vercel + Supabase + GitHub + Namecheap.

2. **Suspected leak.** Audit log anomaly · unexpected API call patterns · commits containing secret-looking strings · any security-researcher contact. 1-hour rotation target · notify Dymo + Rudi.

3. **Laptop theft.** Stolen or lost device with secret material cached. Same-day rotation of all secrets that device accessed (most likely: all CRITICAL). 1-hour target.

4. **Vendor breach disclosure.** Supabase · Anthropic · Resend · Vercel · Namecheap · GitHub public disclosure of incident affecting credentials. Rotate affected vendor's secrets within 24 hours of disclosure awareness.

5. **Founder call.** Either founder can request rotation for any reason · no justification needed · same-day execution.

**Event log.** Each triggered rotation logs reason · timestamp · rotator · via AuditLog per §5.

---

## §3 Rotation procedure per secret type

Each procedure designed for **zero-downtime where possible** (some CRITICAL secrets = unavoidable brief disruption).

### §3.1 DATABASE_URL (Supabase PostgreSQL · pre-cutover · CRITICAL)

**Mechanism:** Supabase allows rotating DB password via dashboard. Connection URL format: `postgres://postgres.{project-ref}:{new-password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`.

**Zero-downtime procedure:**
1. Generate new password via Supabase dashboard (Auth → Settings → Database).
2. Construct new DATABASE_URL with new password (keep old open).
3. Add new URL to Vercel env vars as `DATABASE_URL_NEW`.
4. Deploy Vercel app with both `DATABASE_URL` (old) and `DATABASE_URL_NEW` (new) available.
5. Update Prisma client lib to prefer `DATABASE_URL_NEW` if set (feature flag).
6. Deploy.
7. Verify traffic on new URL (Supabase logs show connections from Vercel).
8. Delete `DATABASE_URL` env var (old URL).
9. Rename `DATABASE_URL_NEW` to `DATABASE_URL`.
10. Deploy.
11. Revoke old password via Supabase dashboard (Auth → Settings → Database → terminate sessions).

**Effort:** ~30 minutes · zero downtime.

**Post-G42 equivalent:** Azure Database for PostgreSQL Flex Server password rotation via Azure portal + Key Vault rotation policy · same zero-downtime pattern with dual-key window.

### §3.2 SUPABASE_SERVICE_ROLE_KEY (CRITICAL · full-privilege admin)

**Mechanism:** Supabase rotates service role key via dashboard.

**Zero-downtime procedure:**
1. Supabase dashboard → API → Reset `service_role` key.
2. Copy new key.
3. Update Vercel env var `SUPABASE_SERVICE_ROLE_KEY` with new value.
4. Deploy (Vercel redeploys app with new env).
5. Verify admin operations still work (try one admin API call).
6. Old key immediately invalid · no cleanup needed.

**Effort:** ~15 minutes · brief deployment downtime (~60s).

**Post-G42:** N/A — Supabase service role retired at cutover (replaced by Azure AD B2C admin credentials).

### §3.3 ANTHROPIC_API_KEY (CRITICAL · billable)

**Mechanism:** Anthropic console · create new key · revoke old key.

**Procedure (with SV-4 Mistral fallback resilience):**
1. Anthropic console → API Keys → Create new key.
2. Copy new key.
3. Add to Vercel env as `ANTHROPIC_API_KEY_NEW`.
4. Deploy with feature flag to prefer new key.
5. Verify Archibald endpoint serves via new key (Anthropic dashboard shows usage).
6. Remove old key from Vercel env.
7. Rename NEW → primary.
8. Deploy.
9. Revoke old key in Anthropic console.

**If SV-4 Mistral fallback is live (Month 7-8+):** brief Anthropic disruption acceptable · Mistral handles Archibald traffic during swap window.

**Effort:** ~20 minutes · zero user-visible downtime with SV-4 fallback.

### §3.4 RESEND_API_KEY (HIGH · email continuity)

**Mechanism:** Resend dashboard · create new key · revoke old.

**Procedure:**
1. Resend dashboard → API Keys → Create new.
2. Copy new key.
3. Update Vercel env `RESEND_API_KEY`.
4. Deploy.
5. Verify by sending test transactional email (e.g., `notify-admin` test).
6. Revoke old key in Resend dashboard.

**Effort:** ~15 minutes · no downtime (silent-skip pattern in `src/lib/email.ts` means failed emails just skip gracefully).

### §3.5 TELEGRAM_BOT_TOKEN (MEDIUM · notification continuity)

**Mechanism:** Contact BotFather on Telegram · `/revoke` current token · `/token` generates new.

**Procedure:**
1. Open Telegram · chat with @BotFather.
2. `/revoke` → select ZAAHI bot → confirm.
3. `/token` → select ZAAHI bot → receive new token.
4. Update Vercel env `TELEGRAM_BOT_TOKEN`.
5. Deploy.
6. Verify by triggering test admin notification.

**Effort:** ~10 minutes · brief notification interruption (deploy window).

### §3.6 Supabase Auth JWT secret (CRITICAL · coordinates with session invalidation)

**Mechanism:** Supabase dashboard → Auth → Advanced → JWT Secret (requires caution · invalidates all sessions).

**Use case:** only rotate if JWT secret leak suspected · NOT part of regular cadence.

**Procedure:**
1. Announce to all signed-in users 24h ahead: "Session expiration forthcoming."
2. Supabase dashboard → rotate JWT secret.
3. All sessions immediately invalidated · users forced to re-sign-in.
4. No Vercel env update needed (Supabase verifies internally).

**Post-G42:** N/A — Azure AD B2C signing keys rotated via B2C dashboard · similar pattern.

### §3.7 Vercel deployment token (CRITICAL · post-cutover retired)

**Pre-cutover procedure:**
1. Vercel dashboard → Settings → Tokens → Create new.
2. Update CI/CD workflow with new token.
3. Test deploy via CI.
4. Revoke old token.

**Post-cutover:** Vercel retired · new token = Azure service principal credentials managed by Azure RBAC · different rotation mechanism.

### §3.8 Common procedure template (for any secret)

```markdown
# Rotation: [SECRET_NAME]

## Actor
Zhan (primary) OR Dymo (backup)

## Trigger
- [ ] Scheduled quarterly (date: YYYY-MM-DD)
- [ ] Admin offboarding
- [ ] Suspected leak
- [ ] Laptop theft
- [ ] Vendor breach
- [ ] Founder call

## Pre-rotation
- [ ] Identify vendor dashboard URL
- [ ] Confirm rotator has admin access to vendor
- [ ] Check dependent services for scheduled downtime tolerance
- [ ] Notify co-founder rotation is happening (Slack / WhatsApp)

## Rotation
- [ ] Generate new secret at vendor
- [ ] Record new secret hash (last 4 chars) for audit log
- [ ] Update Azure Key Vault (or Vercel env pre-cutover)
- [ ] Deploy app with new secret
- [ ] Verify behaviour unchanged (smoke test)
- [ ] Revoke old secret at vendor

## Post-rotation
- [ ] Append AuditLog row per §5.2
- [ ] Confirm dependent services still healthy
- [ ] Update BUS_FACTOR_RECOVERY.md if recovery procedure changes

## Rollback (if rotation fails)
- [ ] Restore old secret value from Azure Key Vault version history (Key Vault retains 90 days)
- [ ] Redeploy
- [ ] Document root cause · file incident memo
```

---

## §4 Secret storage

### §4.1 Today (pre-G42) — Vercel Environment Variables UI

**Characteristics:**
- UI-based · no API rotation.
- Single-admin access (Zhan only · fixed by BUS_FACTOR_RECOVERY Month 2).
- No rotation automation.
- No audit log of secret access.
- Secrets visible to anyone with Vercel dashboard access.

**Limitations acknowledged.** Acceptable for Phase 1 pre-external-launch · not acceptable for Phase 2+ scale.

### §4.2 Short-term (pre-G42 · Month 3) — 1Password Teams vault

**Migration:** set up 1Password Teams account (~AED 20/mo per user · recommended 5-user tier for safety margin).

**Vault structure:**
- **Production** — live env vars (read-only for Dymo · read-write for Zhan).
- **Staging** — staging env vars (read-write both).
- **Emergency** — last-resort recovery creds · sealed to 3-of-3 founders access.
- **Recovery** — Rudi counsel sealed envelope contents (if implemented per BUS_FACTOR_RECOVERY §6).

**Access:** Zhan + Dymo primary · Rudi read-only Emergency vault · 2 emergency slots reserved.

**Value:** pre-G42 upgrade in audit discipline · dual-admin access · 1Password audit logs access events · templates for per-secret rotation.

### §4.3 G42 migration (Month 9-10+) — Azure Key Vault

**Target:** Azure Key Vault (Premium tier for HSM-backed storage of CRITICAL secrets).

**Vault structure:**
- `kv-zaahi-production` — production secrets · accessed by Azure Container App via Managed Identity (no key-material in env vars).
- `kv-zaahi-staging` — staging secrets.
- Access policies: Zhan + Dymo full access · Azure Container App managed identity: read-only for specific secrets.

**Rotation automation:**
- Azure Key Vault supports **rotation policies** for Azure-native secrets (Database password · Storage keys · etc.).
- Quarterly auto-rotation for CRITICAL secrets (DATABASE_URL · ANTHROPIC_API_KEY via custom automation).
- 90-day version retention allows rollback.

**Monitoring:**
- Azure Monitor alerts on unauthorized access attempts.
- AuditLog entries on every secret access (Azure Monitor → ZAAHI AuditLog sync via Logic Apps).

**Pre-cutover action (Spec 06 §6 ritual):** Key Vault provisioned during Month 7-8 provisioning phase · all secrets rotated and loaded fresh · old Vercel env vars retired at cutover.

### §4.4 Sealed-secrets pattern (Phase 2+ consideration)

**Sealed Secrets / SOPS** — encrypt secrets at rest in git repo · decrypted at deploy time via key material held in Key Vault.

**Benefit:** secrets version-controlled alongside code · auditable diff history.

**Tradeoff:** operational complexity · team must manage SOPS key rotation.

**Decision:** defer to Phase 3 evaluation · not blocking for G42 cutover · not blocking for Phase 2 tenantization.

---

## §5 Audit logging

### §5.1 Audit log integration

Per Spec 03 v2.0 §14.9 (commit `0cd6542`) · ZAAHI operates an append-only `AuditLog` Prisma table. Every rotation event = one new AuditLog row.

**AuditLog schema (from Spec 03):**
```prisma
model AuditLog {
  id              String   @id @default(cuid())
  actorUserId     String   // Zhan or Dymo internal User.id
  action          String   // 'SECRET_ROTATION' for this spec's events
  targetType      String   // 'Secret'
  targetId        String   // secret-id (not the secret itself · stable identifier)
  metadata        Json     // per §5.2 required fields
  createdAt       DateTime @default(now())
  @@index([action, createdAt])
  @@index([actorUserId, createdAt])
}
```

### §5.2 Required fields for SECRET_ROTATION events

Every SECRET_ROTATION AuditLog.metadata MUST contain:

```json
{
  "secretId": "DATABASE_URL",
  "classification": "CRITICAL",
  "oldSecretHash": "last 4 chars of SHA-256 hash of old secret",
  "newSecretHash": "last 4 chars of SHA-256 hash of new secret",
  "rotatorUserId": "User.id of rotator (Zhan or Dymo)",
  "trigger": "scheduled_quarterly | admin_offboarding | suspected_leak | laptop_theft | vendor_breach | founder_call",
  "reason": "short free-text reason · ≥20 characters",
  "rotationDurationMs": 900000,
  "rollbackRequired": false,
  "timestamp": "2026-07-15T10:30:00+04:00"
}
```

**Constraints:**
- `reason` ≥ 20 chars (matches Spec 03 §14.9 pattern for all sensitive audit entries).
- Full secret value NEVER logged.
- Hash = last 4 chars of SHA-256 of secret · non-reversible · helps rotator confirm correct old+new pairing in audit review.

### §5.3 Review cadence

**Quarterly audit by Dymo** (BusFactor = 2 means Dymo has admin access post-BUS_FACTOR fix).

**Review scope:**
- All SECRET_ROTATION events since last audit.
- Any rotation outside scheduled cadence = justified by reason?
- Any gap in expected rotations? (e.g., quarterly CRITICAL missed).
- Any anomalous rotator (unexpected User.id performing rotation)?

**Audit memo filed** `docs/audits/secrets-audit-YYYY-Q.md` (quarterly cadence) · 1-page summary · shared with Rudi per D-38 weekly sync.

---

## §6 Pre-G42 rotation ritual

### §6.1 Purpose

**Clean-state secret rotation before cutover** ensures:
- Zero legacy secret material carries over post-cutover.
- Pre-cutover security baseline = known-fresh.
- Post-cutover investigation (if any incident) has clean starting point.
- All new secrets land in Azure Key Vault from day 1 · no migration-contamination of old secret values.

### §6.2 Ritual timing

**T-30 days pre-cutover (Month 8 Week 4):**
- Azure Key Vault provisioned (per §78 §8.3 Month 7-8 provisioning).
- New secret generation begins.

**T-14 days pre-cutover (Month 9 Week 2):**
- Generate new values for all 9 env vars + adjacent secrets.
- Load into Azure Key Vault as drafts.
- Staging `staging.zaahi.io` configured to consume from Key Vault · verifies Managed Identity + secret retrieval works.

**T-7 days pre-cutover (per §78 §5.1):**
- Final rotation rehearsal on staging.
- Production still on Vercel env vars (unchanged).
- Smoke test suite green on staging.

**T-0 cutover window:**
- Azure Container App configured to pull from Key Vault (Managed Identity already granted · just needs Container App env var reference to Key Vault secret).
- App deploys · reads secrets from Key Vault at runtime.
- No secret material in Azure env vars UI (only Key Vault references).

**T+7 days post-cutover:**
- Supabase secrets kept available (rollback insurance).
- Monitor for 7 days · no rollback invoked → purge Supabase credentials.
- Vercel env vars purged (Vercel project archived but credentials removed).

### §6.3 Pre-cutover rotation scope

**CRITICAL (rotated per ritual · new values in Key Vault):**
- DATABASE_URL — Azure PostgreSQL connection string (new DB · new password · written to Key Vault).
- SUPABASE_SERVICE_ROLE_KEY — **RETIRED post-cutover** (not in new stack).
- ANTHROPIC_API_KEY — rotate · new value in Key Vault.
- TRON USDT wallet — SV-7 multisig Month 5-6 · migrated separately · Shamir-split seed in 1Password Emergency vault.
- Vercel deployment token — **RETIRED post-cutover**.
- Anthropic enterprise DPA key — rotate · new value in Key Vault.

**HIGH (rotated per ritual):**
- NEXT_PUBLIC_SUPABASE_URL — **RETIRED post-cutover** (Azure AD B2C uses different URL structure).
- NEXT_PUBLIC_SUPABASE_ANON_KEY — **RETIRED post-cutover**.
- RESEND_API_KEY — rotate · new value in Key Vault.
- GitHub personal access token — rotate · stored in 1Password.
- Google OAuth client secret — migrate from Supabase console to Azure AD B2C console · rotate in process.

**MEDIUM (rotated per ritual):**
- TELEGRAM_BOT_TOKEN — rotate · new value in Key Vault.
- TELEGRAM_*_CHAT_ID — unchanged (not secret · operational config).
- Namecheap API key — audit usage · rotate if in use.

**Net effect post-ritual:**
- 6 legacy Supabase/Vercel secrets RETIRED.
- 9 new/rotated secrets in Azure Key Vault.
- All AuditLog entries logged.
- Clean baseline for Phase 2+ operations.

### §6.4 Ritual checklist

**T-30 days:**
- [ ] Azure Key Vault `kv-zaahi-production` provisioned.
- [ ] Azure Container App Managed Identity granted read access.
- [ ] 1Password Teams vault populated with staging secrets (dress rehearsal).

**T-14 days:**
- [ ] New CRITICAL secrets generated · loaded to Key Vault.
- [ ] New HIGH secrets generated · loaded to Key Vault.
- [ ] Staging app consuming from Key Vault verified.

**T-7 days:**
- [ ] Full rotation rehearsal on staging (per §5.2 template).
- [ ] 1Password Emergency vault populated.
- [ ] BUS_FACTOR_RECOVERY §5 runbook confirmed.

**T-0 cutover:**
- [ ] Production app deploys to Azure Container App with Key Vault references.
- [ ] Smoke tests pass.
- [ ] AuditLog rows appended for each rotation event.

**T+7 days:**
- [ ] No rollback invoked → purge Supabase secrets.
- [ ] Purge Vercel env vars.
- [ ] 1Password vault structure finalized (drop staging-dress-rehearsal entries).
- [ ] Ritual complete · memo filed `docs/decisions/pre-g42-rotation-ritual-YYYY-MM-DD.md`.

---

## §7 Decision tracker

| ID | Decision | Rationale | Alternatives rejected |
|:-:|---|---|---|
| **D-1** | Rotation cadence 90-day CRITICAL · 180-day HIGH · 365-day MEDIUM | NIST SP 800-57 guidance · balances operational burden with security hygiene · matches industry SaaS norms | 30-day CRITICAL (excessive operational burden · 12 rotations/yr for 5 CRITICAL items) · no cadence (accumulated risk) |
| **D-2** | Hash last-4-chars in AuditLog metadata (not full hash) | Sufficient for rotator visual confirmation · minimizes any leak value · consistent with industry pattern | Full hash (still marginally more info in audit leaks) · no hash (loses audit verification value) |
| **D-3** | Short-term storage = 1Password Teams (Month 3) | Low-cost (~AED 20/mo) · established UX · audit logs · cross-device · Zhan + Dymo already Apple-ecosystem users | HashiCorp Vault self-hosted (ops burden) · Bitwarden Teams (comparable · less polish) · .env files (unacceptable) |
| **D-4** | Post-cutover storage = Azure Key Vault Premium | HSM-backed for CRITICAL · Managed Identity integration · sovereign-region · rotation automation supported | AWS Secrets Manager (US parent · defeats sovereignty) · HashiCorp Vault self-hosted (ops burden) · Key Vault Standard tier (no HSM for CRITICAL) |
| **D-5** | Zero-downtime rotation where possible · dual-key window pattern | Minimize user-visible impact · aligned with §78 cutover procedure | Big-bang rotation (downtime per rotation) · out-of-band rotation (doesn't actually remove old secret) |
| **D-6** | Event-triggered rotation 24-hour SLA for admin offboarding / leak / theft / vendor breach | Industry-standard incident response cadence · 24h matches PDPL notification obligations | 1-hour SLA (too aggressive for manual rotation at current scale) · 7-day SLA (excessive risk exposure) |
| **D-7** | Pre-G42 ritual = clean-state rotation before cutover | Clean baseline · no legacy material carries over · enables post-cutover investigation integrity | Migrate existing secrets (contaminated baseline) · no ritual (security hygiene gap) |
| **D-8** | Quarterly audit by Dymo · memo filed per quarter | Dual-admin oversight · Rudi sync per D-38 · operational accountability | Annual audit (too infrequent) · Zhan self-audit (no independent check) |
| **D-9** | Sealed-secrets pattern DEFERRED to Phase 3 | YAGNI at current scale · Key Vault + Managed Identity adequate · adds ops complexity | Implement now (premature · team not familiar with SOPS) |
| **D-10** | 6 legacy Supabase/Vercel secrets RETIRED at cutover · not rotated | Retired credentials ≠ rotated credentials · retire is cleaner than "rotate then retire" | Rotate before retiring (wasted effort) · keep alive for rollback window (done per D-11) |
| **D-11** | Supabase secrets kept for 7 days post-cutover as rollback insurance | Matches §78 rollback procedure window · balances cutover safety with hygiene | Purge immediately post-cutover (breaks rollback) · keep 30 days (unnecessary hygiene burden) |
| **D-12** | `.env.local` stays gitignored per CLAUDE.md · never committed | Unchanged invariant · separate line of defense | Commit encrypted `.env` (complicates workflow · Key Vault preferred) |
| **D-13** | TRON USDT wallet seed Shamir-split per SV-6 (3-of-5) | Multi-party recovery · no single-point-of-failure · aligns with SV-7 multisig | Single-custodian (bus factor risk) · hardware wallet only (loss risk) |

---

## §8 Appendices

### Appendix A — Quarterly rotation calendar template

Copy this template to `docs/decisions/secrets-rotation-YYYY-Q.md` each quarter.

```markdown
# Secrets Rotation — YYYY-Q (Quarter Name)

**Rotator:** Zhan (primary) · Dymo (backup)
**Date:** YYYY-MM-DD
**Trigger:** scheduled_quarterly

## Pre-rotation checklist
- [ ] Co-founder notified
- [ ] Smoke test baseline green
- [ ] AuditLog accessible
- [ ] Key Vault reachable

## Rotations executed
- [ ] DATABASE_URL → new value generated · hash `xxxx` → `yyyy`
- [ ] SUPABASE_SERVICE_ROLE_KEY (pre-cutover only) · hash `xxxx` → `yyyy`
- [ ] ANTHROPIC_API_KEY · hash `xxxx` → `yyyy`
- [ ] Anthropic DPA key · hash `xxxx` → `yyyy`

## Post-rotation smoke tests
- [ ] Sign-in works
- [ ] DB queries work
- [ ] Archibald works
- [ ] Email sends

## Audit entries
- AuditLog IDs logged: [list]

## Anomalies / Issues
(none OR describe)

## Sign-off
- Zhan: signature + date
- Dymo (review): signature + date
```

### Appendix B — Emergency rotation playbook (< 1 hour timeline)

```markdown
# EMERGENCY ROTATION — T+0

**Trigger:** [admin_offboarding | suspected_leak | laptop_theft | vendor_breach]
**Actor:** first-available admin (Zhan OR Dymo)

## T+0 to T+5 minutes
- [ ] Announce in founder channel
- [ ] Access Key Vault (or Vercel env pre-cutover)
- [ ] Generate new secrets at vendor

## T+5 to T+30 minutes
- [ ] Update secret storage with new values
- [ ] Deploy app with new secrets
- [ ] Verify behavior

## T+30 to T+60 minutes
- [ ] Revoke old secrets at vendor
- [ ] AuditLog append with full metadata
- [ ] Notify co-founder + Rudi (via Telegram or SMS)

## Post-emergency (next day)
- [ ] Incident memo `docs/decisions/emergency-rotation-YYYY-MM-DD.md`
- [ ] Root cause analysis
- [ ] Preventive measure identified
- [ ] Update this spec if procedure needs improvement
```

### Appendix C — Secret hash function (non-reversible)

Use SHA-256 with last-4-character output for audit log entries:

```typescript
// ILLUSTRATIVE · for reference · to be implemented in rotation utility
import { createHash } from 'crypto';

function secretHash(secret: string): string {
  return createHash('sha256')
    .update(secret)
    .digest('hex')
    .slice(-4);
}

// Usage: secretHash('sk-ant-api03-...') → 'a3f2'
```

**Purpose:** visual confirmation in audit logs without exposing secret material. If rotator logs old+new hashes, reviewer can confirm they differ (rotation actually happened) without knowing either secret.

**Non-reversible:** 4 chars × 4 bits = 16 bits = 65 536 possible values. Full secret space = way larger. Preimage attack infeasible.

---

**End of Spec 06 Secrets Rotation Policy v1.0 DRAFT.**

Policy in force 2026-04-22. First scheduled CRITICAL rotation: Month 6 (2026-07-15). Pre-G42 rotation ritual: Month 8-9 per §6 timeline. Azure Key Vault migration: Month 9-10 cutover.

**Cross-references:**
- `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` v1.0 — §2.4 secrets inventory · §5 cutover procedure integration.
- `docs/specs/phase-1/03-ADMIN_PANEL_SPEC.md` v2.0 — §14.9 AuditLog append-only pattern.
- `docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md` v1.0 — §6.4 JWT signing key rotation coordinates with this spec.
- `docs/ops/BUS_FACTOR_RECOVERY.md` v1.0 — §3 1Password Family setup · §5 recovery runbook.
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.3 — SV-1 Anthropic zero-retention (affected secret) · SV-7 multisig (TRON seed Shamir).
- `CLAUDE.md` — `.env.local` gitignored invariant preserved.
