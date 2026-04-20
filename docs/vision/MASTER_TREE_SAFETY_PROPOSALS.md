# MASTER TREE — SAFETY PROPOSALS

**Document:** Safety (Security + Compliance) Improvement Proposals (advisory; does not amend the Master Tree)
**Prepared for:** Zhan (Founder/CEO/CTO), Dymo (Co-founder), Rudi (Investor/Board)
**Prepared on:** 2026-04-20
**Branch:** `research/vision-and-competitors-2026-04-19`
**Relation to Master Tree v3:** This document extends §82 Monitoring, §83 CI/CD, §84 Data Privacy, §63 Compliance, §69 Fraud Detection, §47 Notification Engine, §62 Legal Engine, and §41 AI (fraud detection). It does **not** amend them — existing sections remain canonical.
**Priority rationale:** Safety is ranked P2 in this batch (after Sovereignty) because the regulatory surface hardens materially once ZAAHI moves into gov partnerships, tokenisation (VARA), and bank partnerships — and every new partner will ask for a security posture attestation. Investor trust at Series A level also requires a documented security programme. The cost of shipping safety improvements proactively is ~10 % of the cost of shipping them under regulator / auditor / incident pressure.
**Classification:** CONFIDENTIAL

---

## Executive summary

ZAAHI today operates a clean but incomplete security posture. Five of the items in `CLAUDE.md`'s SECURITY RULES are load-bearing and well-implemented: admin-approval gate on signup, `AuthGuard` wrapper on protected pages, `getApprovedUserId(req)` on all new API routes, `apiFetch` helper for bearer token attachment, narrow `PUBLIC_API` allow-list. This is a stronger baseline than most seed-stage proptech.

What's missing is the *scale of hardening* required for regulator-facing conversations: no MFA, no passkeys, no formal audit log, no documented incident-response plan, no bug-bounty programme, no dependency-vulnerability cadence, no written DPO designation, no encryption-at-rest attestation, no backup restore drill in the last 6 months. Each gap alone is survivable; together they fail a Mubadala / ADGM / DLD security questionnaire.

This document proposes five blocks of improvements:

1. **Data protection** — encryption at rest / in transit, PII handling, backup, DR, PDPL / GDPR right-to-deletion.
2. **Application security** — MFA, session hardening, rate limiting, input validation, security headers.
3. **Operational security** — audit logs, RBAC, secret management, dependency scanning, pen testing, bug bounty.
4. **Business continuity** — multi-region failover, RTO / RPO, incident response, incident communication.
5. **Legal / compliance** — PDPL, ADGM DP, VARA, transfer pricing, investor confidentiality.

Each proposal notes current state, gap, recommendation, priority, effort, and risk if not done.

---

## §1 Data protection

### 1.1 Encryption at rest

**Current state.** Supabase hosts PostgreSQL on AWS `eu-central-1` (Frankfurt). AWS RDS underlying storage is encrypted with AWS KMS managed keys by default. Application-level encryption of individual columns (e.g., Emirates ID number, phone, escrow routing details) is **not** in place. `data/` KML / GeoJSON / PDF assets live on the server disk with standard filesystem permissions.

**Gap.** For PDPL "sensitive data" categories (biometric data, health data, genetic data, criminal records), encryption at application level is effectively required. For KYC-relevant data (Emirates ID numbers, passport numbers, source-of-funds documents), column-level encryption is a defensible-disclosure safeguard.

**Proposed improvement.** Introduce an application-level AES-256-GCM column encryption helper (`src/lib/pii-encrypt.ts`) using envelope encryption: each row gets its own DEK, DEKs are wrapped by a KEK rotated monthly, KEK stored outside Supabase (e.g., AWS KMS today, Khazna KMS in Phase 2 per sovereignty plan). Apply to the 6 highest-sensitivity columns first: `User.emiratesId`, `User.passportNumber`, `User.sourceOfFunds`, `AmbassadorApplication.txHash`, `Deal.escrowAccountRef`, `Parcel.ownerContactPhone`.

**Priority.** P1 high.
**Effort.** 2 engineer-weeks (wrapper + migration + backfill).
**Dependencies.** None.
**Risk if not done.** PDPL Article 18 breach notification is triggered on any disclosure of sensitive data; without application-level encryption, "a database compromise" equals "all sensitive data disclosed." With encryption, the same compromise discloses cyphertext and KMS logs prove no KEK access.

### 1.2 Encryption in transit

**Current state.** `zaahi.io` served via Vercel with automatic TLS (Let's Encrypt + Vercel-managed certs). DNS via Namecheap. All Next.js API routes inherit HTTPS from Vercel edge. WebSocket connections for metaverse / 3D (future) use `wss://`.

**Gap.** No explicit HSTS preload policy. No cross-origin isolation headers for WebXR. No certificate pinning for mobile (future §78). No enforced TLS 1.3 minimum.

**Proposed improvement.** Add a `next.config.ts` security header block enforcing:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` + submit to HSTS preload list.
- `Cross-Origin-Opener-Policy: same-origin`.
- `Cross-Origin-Embedder-Policy: require-corp` (required for WebXR in §80).
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY` (no iframe embedding of ZAAHI).
- `Permissions-Policy: geolocation=(self), camera=(self), microphone=()`.

Minimum TLS version pinned to 1.3 via Vercel project settings.

**Priority.** P1 high.
**Effort.** 4 engineer-hours.
**Dependencies.** None.
**Risk if not done.** Trivial MITM vectors remain open; security questionnaires from banks / government counterparties fail.

### 1.3 Content Security Policy

**Current state.** Unclear from repo inspection — likely no CSP or a permissive default. Three.js / R3F requires `worker-src` + `connect-src` flexibility; PMTiles hosts tile data on external CDN.

**Gap.** Without a CSP, any XSS vector loads arbitrary remote JavaScript. A tight CSP is one of the highest-value / lowest-cost mitigations in modern web security.

**Proposed improvement.** Define a nonce-based CSP with:
- `default-src 'self'`.
- `script-src 'self' 'nonce-<per-request>'` (no `unsafe-inline`, no `unsafe-eval` — fix any violations in ZAAHI code first).
- `connect-src 'self' https://*.supabase.co https://*.anthropic.com https://api.mapbox.com https://tiles.zaahi.io https://api.uaepass.ae`.
- `img-src 'self' data: blob: https://*.zaahi.io`.
- `style-src 'self' 'nonce-<per-request>'`.
- `font-src 'self' data:`.
- `worker-src 'self' blob:`.
- `frame-ancestors 'none'`.
- `report-uri /api/csp-report` to track violations in production.

Deploy in **report-only** mode for 2 weeks to catch violations, then enforce.

**Priority.** P1 high.
**Effort.** 6 engineer-hours initial + 1 week monitoring violations.
**Dependencies.** Nonce injection in Next.js layout.
**Risk if not done.** A single stored-XSS in a user-generated field (parcel description, deal-room message) becomes a full credential-exfiltration vector.

### 1.4 PII handling policy

**Current state.** `CLAUDE.md` rule 5: "НЕ пиши PII в console.log никогда." And rule: "NEVER expose user emails, phone numbers, or other personal data in API responses to non-admin users. Strip PII fields server-side." These are discipline rules without automated enforcement.

**Gap.** No automated PII detection in logs, no test that fails if a PII field leaks in an API response, no data-minimisation enforcement.

**Proposed improvement.** Ship three automated enforcements:

1. **PII-aware logger** (`src/lib/log.ts`) that redacts known PII keys (email, phone, emiratesId, passportNumber, iban, pan) at the call site. Any `log({email: user.email})` gets serialised as `{email: "[REDACTED]"}`.
2. **Response-shape contract tests.** For each API route returning user data, a Jest test asserts the response does not contain PII fields when the caller is not the resource owner or an admin.
3. **PII classification comment** on every PII-bearing field in `prisma/schema.prisma` — a standard `/// PII:HIGH` or `/// PII:MEDIUM` convention that tooling can grep for, and that DPO can audit.

**Priority.** P1 high.
**Effort.** 1 engineer-week.
**Dependencies.** None.
**Risk if not done.** A single accidental PII leak in a log service (Sentry, Vercel logs) is a PDPL breach notification event.

### 1.5 Backup strategy + disaster recovery

**Current state.** Supabase provides daily automated backups (7-day retention on free / pro tiers, 30-day on team / enterprise). No restore drill has been performed. `data/` directory (KML, GeoJSON, PDFs) is under git LFS or plain git — not backed up independently of GitHub.

**Gap.** No documented RTO / RPO. No off-Supabase backup. No verified restore. Total reliance on Supabase for point-in-time recovery.

**Proposed improvement.** Define RTO = 4 hours and RPO = 1 hour as Year-1 targets (tighten over time). Implement:

1. **Daily `pg_dump` to UAE-resident object storage** (per sovereignty plan — Khazna S3-compatible) in addition to Supabase's own backup. 30-day retention. Encrypted with KMS key ZAAHI controls.
2. **Monthly restore drill.** Spin up a Postgres container, restore last daily dump, run smoke tests (`pnpm test:smoke`), verify tables are populated. Log result in `DECISIONS.md` per `CLAUDE.md` convention.
3. **`data/` directory snapshot.** Weekly tarball to Khazna S3; 12-week retention.
4. **Blockchain audit log mirror.** The §42 blockchain audit trail is the ultimate backup for deal-level transaction facts — ensure the on-chain txHashes for every `Deal.status` transition are present and verifiable.

**Priority.** P1 high.
**Effort.** 1 engineer-week initial + ongoing monthly drill (~4 hours / month).
**Dependencies.** Khazna or Etisalat object storage account.
**Risk if not done.** A single Supabase region outage (multi-hour AWS Frankfurt incident) is a total platform outage. A single "oops" DROP TABLE or `prisma db push` (explicitly forbidden in `CLAUDE.md` but still possible via a misconfigured script) is unrecoverable without off-site backup.

### 1.6 PDPL / GDPR compliance + right to deletion

**Current state.** No visible PDPL / GDPR compliance pages. No documented DPO. No right-to-deletion endpoint. No consent management.

**Gap.** UAE PDPL (Federal Decree-Law 45/2021) has moved from awareness to strict enforcement phase in 2026. It grants data-subject rights of access, rectification, erasure, and portability; controllers must respond within a statutory window. ADGM DP Regulations 2021 have similar GDPR-style obligations including 72-hour breach notification.

**Proposed improvement.** Ship the following during Q2–Q3 2026:

1. **Designate a DPO.** Given team size, Dymo or an external retained UAE DPO-as-a-Service. Publish contact on privacy page.
2. **Privacy Centre** at `/privacy-centre` for logged-in users — exposes rights of access (download my data), rectification (edit profile), erasure (request account deletion), portability (JSON export).
3. **Right-to-deletion flow.** User clicks "Delete my account" → 30-day grace period (deletion reversible) → permanent erasure. Important exception: data required to keep for legal / regulatory reasons (closed deals, AML records) is pseudonymised rather than deleted, and the user is informed.
4. **Consent management** for marketing emails / notifications (§47) — granular toggles per channel (email / SMS / WhatsApp / Telegram / in-app), persisted in `User.consent` JSON field.
5. **Data Processing Register** (Article 30-style GDPR record) documenting every data-processing activity: what data, from whom, legal basis, retention, recipients. Maintained in `docs/compliance/data-processing-register.md`.
6. **Privacy-by-design checklist** integrated into PR review — every PR touching user data requires a privacy tick.

**Priority.** P0 critical.
**Effort.** 4–6 engineer-weeks + 1 DPO-month.
**Dependencies.** DPO designation.
**Risk if not done.** PDPL fines up to AED 1 M per violation. ADGM DP fines up to USD 28 M for serious breaches. Beyond fines: zero credibility with ADGM / DLD / ICP counterparties.

---

## §2 Application security

### 2.1 Authentication hardening — MFA / passkeys

**Current state.** Email + password via Supabase Auth. Google OAuth wired. Admin-approval gate (per `CLAUDE.md` Security Rules). No MFA.

**Gap.** No second factor at all. Password-only auth on a platform handling AED 50 M+ plot deals is below the bar any bank partnership will demand.

**Proposed improvement.** (Cross-reference MASTER_TREE_SOVEREIGNTY_PROPOSALS.md §4.)

1. **UAE Pass as primary sign-in** — OIDC flow, government-verified identity. Replaces email + password for UAE residents.
2. **Passkeys / WebAuthn** as second factor (or sole factor post-UAE-Pass first login). NIST SP 800-63-4 AAL2-compliant. 2026 is the passkey tipping point; implementation is now 2–3 sprints, not 6 months.
3. **TOTP fallback** (authenticator app) for users without a platform authenticator. `@simplewebauthn` handles the coordinate layer; Supabase Auth supports TOTP factors natively.
4. **SMS fallback** only as last resort — SMS is the weakest MFA channel (SIM-swap risk); explicitly de-prioritise.
5. **Required MFA for high-risk roles** — admins, platinum-tier ambassadors, users with deal value > AED 10 M in the last 90 days.

**Priority.** P0 critical.
**Effort.** 3 engineer-weeks (passkey + TOTP), +4 engineer-weeks (UAE Pass, covered in sovereignty).
**Dependencies.** Sovereignty §4 Phase 1 (UAE Pass onboarding) runs in parallel.
**Risk if not done.** Account takeover + fraudulent deal → liability + reputation. A single successful phishing → AED 50 M deal → the Agency pays the 2 % commission to the wrong party.

### 2.2 Session management

**Current state.** Supabase Auth issues JWT access tokens + refresh tokens. Browser cookies managed by Supabase SSR helpers. `apiFetch` attaches Bearer token to protected API calls.

**Gap.** Unclear token rotation cadence. No explicit CSRF protection (JWT in header mitigates most; cookie-session routes are at risk). No step-up authentication for sensitive actions (delete account, change password, transfer parcel ownership, initiate escrow release).

**Proposed improvement.**

1. **Short-lived access tokens (5–15 min)** with silent refresh. Supabase defaults to 1-hour; tighten where practical.
2. **Refresh token rotation** with reuse detection — if a refresh token is ever used twice, revoke all sessions for that user. Standard anti-replay.
3. **Step-up authentication** — for high-risk mutations, require a fresh MFA challenge in the last 5 minutes. Implement a `requireFreshAuth({maxAgeSeconds: 300})` middleware wrapper on the route handlers for: parcel transfer, deal escrow release, admin user-metadata edit, account deletion, tier upgrade.
4. **Session table with device fingerprinting** — log each active session (user ID, device UA, IP, last seen) and expose to user at `/settings/sessions` with "revoke" per device.
5. **CSRF tokens** — double-submit cookie for any session-cookie-authenticated form. Not strictly needed where every mutation goes through `apiFetch` + Bearer header, but belt-and-braces for any future cookie-session routes.

**Priority.** P1 high.
**Effort.** 2 engineer-weeks.
**Dependencies.** MFA (2.1) for step-up.
**Risk if not done.** Token reuse / session hijacking is harder to detect; step-up gate for escrow release is the only thing standing between "compromised admin session" and "AED 50 M wire".

### 2.3 API rate limiting per tier

**Current state.** No visible rate limiting in middleware. Every public endpoint (e.g., `/api/layers/*`) is subject to whatever Vercel's edge does automatically. Archibald chat API (`/api/cat/chat`) is uncapped.

**Gap.** An unauthenticated scraper could exhaust layers bandwidth. An authenticated malicious user could flood Archibald with AED 50–100 / day of Claude API cost. No defence against credential stuffing on login endpoint.

**Proposed improvement.** Introduce per-route rate limits via Upstash Redis (or `@vercel/kv`; until sovereignty migration, Upstash works) with tiered limits:

| Route | Anonymous | Authenticated | Ambassador | Admin |
|---|:-:|:-:|:-:|:-:|
| `/api/layers/*` (public geo) | 60 / min | 600 / min | 600 / min | unlimited |
| `/api/cat/chat` (AI) | 10 / hour | 50 / hour | 200 / hour | unlimited |
| `/api/parcels/map` | blocked | 120 / min | 300 / min | unlimited |
| `/api/deals/*` write | n/a | 10 / min | 30 / min | unlimited |
| `/api/auth/*` login | 5 / min / IP | n/a | n/a | n/a |
| `/api/ambassador/register` | 3 / hour / IP | n/a | n/a | n/a |

Rate-limiter implementation: `src/middleware.ts` wraps each request with a per-route sliding-window counter.

**Priority.** P1 high.
**Effort.** 1 engineer-week.
**Dependencies.** Upstash or Redis-compatible backing store.
**Risk if not done.** AI cost blow-up ($100 → $10 000 in a night via abusive loop). Credential stuffing undetected.

### 2.4 Input validation / SQL injection

**Current state.** Prisma ORM exclusively for DB access — parameterised queries are the default, no raw-SQL in the codebase outside of migrations. Zod schema validation on API route inputs is partial (some routes validate, some use manual parsing).

**Gap.** Partial Zod coverage means some endpoints accept whatever shape the client sends. A missing validator on a sort-column parameter could enable order-by injection in a raw query.

**Proposed improvement.**

1. **Zod on every API route.** Standardise: every `app/api/**/route.ts` must declare `const BodySchema = z.object({...})` and call `BodySchema.parse(await req.json())` before proceeding.
2. **Query-parameter validation.** Same discipline for `searchParams`.
3. **CI check.** A lint rule (custom ESLint rule or a simple grep-based test) that fails build if a route handler has no Zod schema.
4. **Avoid raw Prisma `$queryRaw` except in migrations.** If needed at runtime, use the `Prisma.sql` tagged template literal (parameterised); review in PR.

**Priority.** P1 high.
**Effort.** 2 engineer-weeks for full sweep.
**Dependencies.** None.
**Risk if not done.** A single bad route invalidates ORM-level protections.

### 2.5 XSS / CSRF

**Current state.** React auto-escapes rendered content, mitigating stored XSS. `dangerouslySetInnerHTML` usage is rare but exists (needs audit). No explicit CSRF token strategy (Bearer-token model mostly suffices).

**Gap.** Any `dangerouslySetInnerHTML` for user-generated content (parcel description, deal messages, ambassador profile bio) is a stored-XSS surface.

**Proposed improvement.**

1. **Codebase sweep** for `dangerouslySetInnerHTML`. Replace user-content usage with sanitised markdown rendering (e.g., `react-markdown` + `rehype-sanitize`).
2. **CSP nonce-based script policy** (covered in §1.3 above) provides defence in depth.
3. **Content-Type headers** — every API response sets `Content-Type: application/json; charset=utf-8` explicitly (not relying on framework defaults).

**Priority.** P2 medium.
**Effort.** 3 engineer-days.
**Dependencies.** CSP deployment.
**Risk if not done.** Stored XSS in user-content fields.

### 2.6 Security headers audit

**Current state.** Unknown — needs audit via `curl -I https://zaahi.io` or `observatory.mozilla.org`.

**Gap.** Without baseline measurement, improvements are unmeasurable.

**Proposed improvement.** Run Mozilla Observatory + `securityheaders.com` against `zaahi.io` and all `api.zaahi.io` routes. Target grade A+ on Observatory (85+ score). Post-headers (§1.2, §1.3) should achieve this automatically.

**Priority.** P2 medium.
**Effort.** 1 engineer-day audit + fix iterations.
**Dependencies.** §1.2, §1.3.
**Risk if not done.** Security posture is unquantified. Investor / regulator questions go unanswered.

---

## §3 Operational security

### 3.1 Audit logging

**Current state.** `CLAUDE.md` states every deal-state change emits a blockchain `txHash` (§31, §42). No application-level audit log for admin actions (user approval, tier change, parcel deletion-attempt refusal).

**Gap.** No tamper-evident record of "admin X approved user Y at time T." A compromised admin session could approve a fraudulent user with no trace.

**Proposed improvement.**

1. **`AuditLog` Prisma model** — `id`, `actorUserId`, `actorRole`, `action` (enum: `USER_APPROVED`, `USER_BLOCKED`, `PARCEL_VALUATION_CHANGED`, `DEAL_STATE_TRANSITIONED`, `AMBASSADOR_TIER_CHANGED`, `COMMISSION_PAID`, `COMMISSION_REVERSED`), `targetEntity`, `targetId`, `before` (JSON), `after` (JSON), `ip`, `userAgent`, `createdAt`, `txHash` (optional — for high-stakes actions, mirror to blockchain).
2. **`logAudit(...)`** helper called from every mutation API route. Structured, unmissable.
3. **Admin dashboard audit view** — `/admin/audit` with filters by actor, target, time range.
4. **Append-only store** — `AuditLog` has RLS policy denying UPDATE / DELETE, only INSERT. Enforced in Supabase RLS.
5. **Monthly export to cold storage** (Khazna S3 per sovereignty plan) — 7-year retention to satisfy UAE AML record-keeping.

**Priority.** P0 critical.
**Effort.** 2 engineer-weeks.
**Dependencies.** None.
**Risk if not done.** Failed audit. Failed ADGM DP 72-hour breach notification (cannot prove what was accessed). Failed AML defence.

### 3.2 Access control — RBAC

**Current state.** `user_metadata.approved = true/false` is a binary gate. `AuthGuard` checks it. Admin endpoints "gated by role check, not just approval" (per `CLAUDE.md`) — unclear what role model exists today.

**Gap.** Without explicit roles, "admin" is informally defined. Ambassador tier (Silver / Gold / Platinum) is orthogonal to operational role. No least-privilege separation for support staff, DPO, auditor.

**Proposed improvement.** Define a formal role matrix in a `Role` enum (or JSON config):

| Role | Scope |
|---|---|
| `anon` | Public layers, landing, signup |
| `user` | Own profile, own parcels, own deals, browse parcels, chat with Cat |
| `ambassador_silver` / `_gold` / `_platinum` | + downline dashboard, tier-gated content |
| `broker_internal` (Dymo, future agents) | + CRM, lead routing, deal pipeline |
| `support` | Read-only on user records (no PII export), ticket management |
| `dpo` | Read user data for rights requests, write deletion records, no financial data |
| `auditor` | Read AuditLog, read financial records, no user chat |
| `admin` | User approval, user block, parcel admin actions |
| `founder` | Everything + role assignment |

Enforce via `getApprovedUserId` → `getRole(userId)` → route-level check `requireRole('admin')`. Store roles in a dedicated `UserRole` table, not `user_metadata` (which is unreliable for authorization per Supabase best practices).

**Priority.** P1 high.
**Effort.** 2 engineer-weeks.
**Dependencies.** None.
**Risk if not done.** Principle-of-least-privilege violated by default — any admin-privileged session is root-equivalent.

### 3.3 Secret management

**Current state.** Environment variables in Vercel Settings → Environment Variables. `.env.local` for dev, gitignored. `CLAUDE.md` rule: "NEVER commit `.env.local` — it is in `.gitignore` for a reason" — rule is clear and followed.

**Gap.** No rotation cadence documented. No dependency on a secret-management system (Vault, Doppler, AWS Secrets Manager) — secrets live in environment variables with no history or audit. Database credentials, API keys, wallet seeds are flat strings.

**Proposed improvement.**

1. **Doppler or Infisical** (both offer free tier, UAE-data-residency options via EU region) as a central secret store. Secrets referenced by name from Vercel runtime, never hard-coded.
2. **Rotation policy.** Database passwords + API keys rotated every 90 days. Anthropic / OpenAI / Mapbox API keys rotated on any team-member departure. Supabase Service Role key rotated on any admin action by a departing team member.
3. **Wallet seed custody policy.** TRC-20 Ambassador wallet seed: currently single-signer (Zhan). Move to 2-of-3 Shamir secret share (Zhan, Dymo, legal counsel) or hardware wallet with recovery seed in bank safe deposit box. Documented in a sealed-envelope runbook.
4. **Secrets in CI.** `$ANTHROPIC_API_KEY` et al in GitHub Actions (and future Gitea CI per sovereignty plan) come from Doppler / Infisical via OIDC federation — never plain-text in repo secrets UI.

**Priority.** P1 high.
**Effort.** 1 engineer-week for Doppler adoption + 1 week for Shamir migration.
**Dependencies.** None.
**Risk if not done.** A single lost laptop (for a founder holding Vercel session + `.env.local`) = total compromise. The USDT wallet SPOF is the single highest-dollar-value risk in the org.

### 3.4 Dependency vulnerability scanning

**Current state.** `pnpm install` pulls from npm registry. No automated `pnpm audit` in CI. No Dependabot or Renovate. No SBOM (software bill of materials).

**Gap.** 400+ transitive npm dependencies; a known-CVE package could land in production unnoticed. Supply-chain attacks (ua-parser-js, event-stream) have been the common vector in 2021–2023 proptech incidents.

**Proposed improvement.**

1. **GitHub Dependabot** enabled with daily polling for npm + GitHub Actions. Grouped PRs per week for low-severity; immediate for critical.
2. **Renovate** as backup / alternative — richer grouping rules, better auto-merge heuristics for patch updates.
3. **`pnpm audit --prod` in CI** — fails build on critical / high. `--audit-level=high` flag. (`pnpm audit-ci` library wraps this.)
4. **Trivy or Snyk** for deeper scanning — SBOM generation, license-compliance reporting, container scan (if / when we containerise).
5. **Subscribe to npm-registry advisory feed** (GitHub Security Advisories for `node` ecosystem) — ensure a human sees each disclosure within 24 hours.

**Priority.** P1 high.
**Effort.** 2 engineer-days initial + ongoing.
**Dependencies.** None.
**Risk if not done.** Missing a critical CVE = 0-day in production.

### 3.5 Penetration testing cadence

**Current state.** No pen test has been performed.

**Gap.** Every regulator and enterprise security questionnaire asks "last pen test date."

**Proposed improvement.**

1. **Annual external pen test** by a UAE-based firm (e.g., HackerOne's UAE network partners, Spiderlabs Dubai, Cybersec Dubai). Scope: `zaahi.io` web app + API + authentication. Approximate fee: AED 40–80 k per engagement, 1–2 week duration, full report.
2. **Quarterly internal automated scan** (OWASP ZAP, Nessus, or similar). AED 10–20 k / yr for tooling. Runs on staging environment.
3. **Post-major-feature security review.** Any feature touching authentication, payments, escrow, or tokenisation gets a focused review by a security specialist before production.

**Priority.** P1 high (first test once MFA + audit logs + right-to-deletion ship — Q4 2026 target).
**Effort.** 4 engineer-days of remediation per engagement (empirical average).
**Dependencies.** Production-ready baseline (MFA, audit, headers).
**Risk if not done.** First pen test under regulator pressure = multiple criticals to remediate during audit window.

### 3.6 Bug bounty programme

**Current state.** No bug bounty. Ad-hoc security-report email at best.

**Gap.** No incentive for external researchers to disclose responsibly. A discovered vulnerability is more likely to be sold on dark-web markets than reported to us.

**Proposed improvement.**

1. **Coordinated disclosure page** at `/security` with PGP-signed contact and a published CVD policy (90-day disclosure window, safe-harbour for good-faith research).
2. **Private bug bounty via HackerOne or Intigriti** — invite-only initially (top 10 MENA researchers) with AED 500 low / AED 2 k medium / AED 10 k high / AED 50 k critical bounty bands.
3. **Scope:** `zaahi.io` web, `api.zaahi.io` endpoints, `*.zaahi.io` subdomains. Out-of-scope: Supabase-managed infrastructure, third-party dependencies, social engineering, DoS.
4. **Promote to public programme** 6 months after private launch, once response SLA (<24 h acknowledgment) is proven.

**Priority.** P2 medium.
**Effort.** 1 engineer-week setup + ongoing triage budget ~10 hours / month.
**Dependencies.** Well-documented `/security` page.
**Risk if not done.** Researchers frustrated with no disclosure path = incidents become zero-days.

---

## §4 Business continuity

### 4.1 Multi-region failover

**Current state.** Single Supabase region (Frankfurt). Single Vercel project (global edge but single origin fails over to 5xx if the project is down). No standby.

**Gap.** RTO is effectively "however long until Supabase fixes their region" — typically 1–6 hours for a regional incident, but up to 24+ hours for a serious outage.

**Proposed improvement.** Interim (before sovereignty infrastructure migration):

1. **Supabase read replica** in `eu-west-1` (Ireland) — AED 1 k–3 k / month additional. Auto-failover via PgBouncer or Supabase's managed failover (enterprise tier required).
2. **Vercel preview deployments always running** on `staging.zaahi.io` — a warm fallback if production is misdeployed.

Long-term (post-sovereignty DC1, per §1.3 sovereignty):

3. **Active-passive UAE-resident standby** (Khazna Abu Dhabi + Etisalat Dubai). Real-time log shipping. RTO target 60 seconds per Master Tree §52.

**Priority.** P1 high (interim), aligned with Master Tree §52 for long-term.
**Effort.** 1 engineer-week for interim; long-term is the Equinix DX1 migration.
**Dependencies.** Budget for Supabase enterprise / read-replica.
**Risk if not done.** Any meaningful regional outage = platform down = broker deals stuck = AED loss proportional to deal in flight.

### 4.2 Database replication + RTO/RPO

**Current state.** Supabase daily backups, 7–30 day retention depending on tier.

**RTO / RPO targets (proposed).**

| Metric | Current | Y1 target | Y3 target |
|---|---|---|---|
| Recovery Time Objective (RTO) | ~24 h | 4 h | 60 s (active-passive, §52) |
| Recovery Point Objective (RPO) | 24 h | 1 h | 60 s |
| Maximum Tolerable Downtime (MTD) | n/a | 8 h | 4 h |
| Planned maintenance window | none | Sat 2 AM UAE | 0 (rolling deploy) |

**Proposed improvement.** See §1.5 backup strategy — daily `pg_dump` + monthly restore drill closes the gap from ~24 h RPO to 24 h with a verified restore process. Point-in-time recovery within Supabase closes it to <1 h for the window they support (typically 7 days PITR on paid tiers).

**Priority.** P1 high.
**Effort.** Captured in §1.5.
**Dependencies.** §1.5.
**Risk if not done.** Unverified backups are a bet. Restore drills are the only proof.

### 4.3 Incident response plan

**Current state.** No documented incident response plan. Informal "founders talk in Telegram" approach.

**Gap.** When an incident happens, the first hour is spent figuring out who does what — time that should be spent remediating.

**Proposed improvement.** Publish a one-page incident response runbook `docs/security/incident-response.md` covering:

1. **Severity matrix.** SEV-1 (platform down, data loss, breach suspected), SEV-2 (major feature broken, auth broken, fraud suspected), SEV-3 (minor bug, cosmetic), SEV-4 (nice-to-fix).
2. **On-call rotation.** Today: Zhan is always on-call (SPOF). Short-term: Zhan primary + Dymo secondary for business continuity. Long-term: Chief of Staff hire + 2 engineers, rotating weekly.
3. **Communication channels.** SEV-1 → Telegram group `#zaahi-incident` + founder phone call. Status page at `status.zaahi.io`. SEV-2 → Telegram + email. SEV-3 / 4 → GitHub issue.
4. **Escalation timeline.** 15 min acknowledgment (on-call), 30 min assessment, 1 h mitigation started, 4 h fix deployed or workaround in place, 24 h postmortem drafted.
5. **Postmortem template.** Blameless format: timeline, root cause, detection, mitigation, recurrence prevention. Posted in `docs/incidents/YYYY-MM-DD-slug.md`. Reviewed in weekly founder meeting.

**Priority.** P0 critical.
**Effort.** 1 engineer-week to draft runbook + set up status page + configure PagerDuty or Telegram bot.
**Dependencies.** PagerDuty subscription (AED 100–500 / month) or Telegram bot (free).
**Risk if not done.** First real incident is twice as expensive, three times as stressful.

### 4.4 Communication during incidents

**Current state.** No status page, no user-facing incident communication.

**Proposed improvement.**

1. **`status.zaahi.io`** — statically-hosted status page (Atlassian Statuspage or self-hosted cstate / Upptime). Shows service-component status (Web, API, AI Chat, Map, Auth), recent incidents, subscribe-to-updates email / RSS.
2. **In-app banner** for degraded service — a persistent top banner "Archibald is slow right now; we're looking at it" reduces support ticket volume dramatically.
3. **Transparency policy.** Publish a postmortem for every SEV-1 within 7 days, redacted of sensitive operational detail. Builds trust more than silence does.

**Priority.** P1 high.
**Effort.** 3 engineer-days.
**Dependencies.** None.
**Risk if not done.** Silent outages erode trust faster than the incident itself. Brokers discover their client-facing page is down via a client call.

---

## §5 Legal / compliance

### 5.1 UAE PDPL (Federal Decree-Law 45/2021)

**Current state.** No explicit PDPL compliance posture documented. Relying on "good practice" inherited from Supabase defaults.

**Gap.** Six PDPL obligations are in active enforcement in 2026:
- Lawful basis for processing (Article 4).
- Data-subject rights (Articles 13–21): access, rectification, erasure, portability, objection, automated-decision-making.
- Cross-border transfer approval (Articles 22–23) — currently Supabase Frankfurt qualifies under adequacy reasoning.
- Data protection impact assessment (Article 20) — for high-risk processing.
- Breach notification (Article 17) — to UAE Data Office within a statutory window.
- DPO designation (Article 10) — required if "large-scale processing of sensitive data" — arguably ZAAHI crosses this once 1000+ users sign up.

**Proposed improvement.** See §1.6. Additional:

1. **Privacy Impact Assessment** on Archibald AI agent (automated decision-making implications).
2. **Cross-border transfer register** documenting Supabase Frankfurt + Anthropic US (post-zero-retention).
3. **Quarterly compliance review** with a UAE privacy counsel (~AED 8–15 k / quarter for a retainer).

**Priority.** P0 critical.
**Effort.** See §1.6 + 2 founder-weeks for DPO designation + policy drafting.
**Dependencies.** None.
**Risk if not done.** PDPL strict-enforcement phase has begun in 2026. Fines AED 50 k – 1 M per violation.

### 5.2 ADGM Data Protection Regulations 2021

**Current state.** Platform HoldCo target domicile is ADGM (per investor package). ADGM DP is GDPR-style with 72-hour breach notification and written-consent requirements.

**Gap.** Once the Platform is an ADGM entity, ADGM DP compliance is mandatory for any processing by the ADGM entity. Agency is Dubai Mainland and falls under federal PDPL, not ADGM DP — dual compliance posture needed.

**Proposed improvement.**

1. **DPO designation** serves both Agency (PDPL) and Platform (ADGM DP). Single DPO, dual-law brief.
2. **Processing delineation.** Document which processing activities are performed by Agency vs. Platform. Where ambiguous, default to stricter of the two regimes.
3. **72-hour breach notification workflow.** On SEV-1 with suspected PII exposure: clock starts; DPO + legal counsel + Founder emergency call; draft notification to ADGM Commissioner of Data Protection (and UAE Data Office for PDPL); submit within 72 hours regardless of remediation status; follow up with complete facts once known.
4. **ADGM-compliant Privacy Notice** on `/privacy` — separate from Agency's PDPL privacy notice, or a single unified notice with jurisdiction-selector.

**Priority.** P0 critical (post-Platform ADGM incorporation Year 1).
**Effort.** Part of §1.6.
**Dependencies.** Platform ADGM incorporation (per MOU timeline).
**Risk if not done.** ADGM Data Protection fines up to USD 28 M for serious breaches.

### 5.3 VARA compliance (for tokenisation)

**Current state.** No tokenisation in production. §35 Tokenisation and §42 Blockchain are architected only.

**Gap.** When plot-level tokenisation launches (per `docs/roadmap/POST_MEETING_BUILD_PLAN.md` §B4 target Q3 2026), VARA (Virtual Assets Regulatory Authority) licensing becomes table stakes. Without VARA authorisation, issuing tokens referencing real estate is illegal in Dubai.

**Proposed improvement.**

1. **Do not launch tokenisation outside the DLD Real Estate Sandbox.** The sandbox provides safe-harbour. (This is also flagged in build plan risk register.)
2. **Engage DIFC / ADGM counsel** for VARA rulebook compliance review pre-launch.
3. **KYC / AML gate on token purchase.** Every buyer passes Emirates ID verification (§4.3 Phase 2) + source-of-funds declaration. Funds received only via regulated payment rail (Network International or bank API, not direct crypto from unknown wallet).
4. **Token custody policy.** Tokens issued to user-custody wallets (MetaMask / Zaahi Embedded) with KYC linkage. No escrowed tokens on ZAAHI.

**Priority.** P1 high (gated on tokenisation launch).
**Effort.** 4 founder-weeks + AED 50–150 k legal.
**Dependencies.** Sandbox acceptance, per build plan.
**Risk if not done.** Criminal liability for unlicensed virtual-asset issuance in Dubai.

### 5.4 Transfer pricing documentation

**Current state.** Investor package notes "Transfer Pricing: local file required from Year 1 (related-party transactions exceed AED 3.75 M threshold)." Zero transfer-pricing documentation currently exists.

**Gap.** Agency pays Platform a 70 % Service Fee (per MOU). This is a related-party transaction on a material amount. UAE Corporate Tax regulations require arm's-length pricing + documentation.

**Proposed improvement.**

1. **Transfer pricing study** commissioned from a Big-4 or UAE-specialist firm (Deloitte / PwC / EY / BDO UAE) — ~AED 60–120 k, delivered in ~3 months. Benchmarks the 70 % Service Fee against comparable SaaS-to-Operating-Co relationships.
2. **Master file + local file** per OECD BEPS Action 13 + UAE Corporate Tax Law. Kept under strict confidentiality (only Founder, auditor, CT advisor have access).
3. **Service Fee invoice discipline** — monthly invoices from Platform to Agency with itemised service descriptions (platform hosting, AI access, CRM, brand usage, IP license). Not a lump sum.

**Priority.** P1 high (before Year 1 CT filing due, mid-2027).
**Effort.** 3 months wall-clock + ongoing quarterly invoicing.
**Dependencies.** Agency + Platform entity formation.
**Risk if not done.** UAE Federal Tax Authority disallowance of Service Fee deduction = Agency effective tax rises from ~2 % to ~9 %; recouped by ZAAHI over years via restated filings + penalties.

### 5.5 Investor data confidentiality

**Current state.** Investor package under `docs/investor-package/` is in git repo. Classification label "CONFIDENTIAL" noted. No access-control separation between founders and future employees.

**Gap.** Anyone with repo read access sees Rudi's investment terms, Dymo's contact, financial projections. Not acceptable once the team grows beyond founders.

**Proposed improvement.**

1. **Separate private repo** `ZaahiPlots/Zaahi-Confidential` for investor, legal, HR material. Access limited to founders + board + legal counsel.
2. **`.gitignore` pattern** in main repo blocking any `investor-package/` or `confidential/` paths from being committed.
3. **NDA** for every future hire, contractor, advisor — standard UAE counsel template.
4. **Classification labels** on every doc in `docs/`: `PUBLIC` / `INTERNAL` / `CONFIDENTIAL` / `RESTRICTED` in frontmatter.
5. **Access review quarterly** — DPO runs a list-of-who-can-see-what and reports anomalies.

**Priority.** P1 high.
**Effort.** 1 engineer-week + legal.
**Dependencies.** None.
**Risk if not done.** Term-sheet leak damages Rudi relationship, future investor leverage, Platform Series A positioning.

---

## Integrated Safety roadmap — 12-month view

| Quarter | Safety moves shipping |
|---|---|
| **Q2 2026** | P0 Audit log (§3.1). P0 Incident response runbook (§4.3). P0 UAE Pass + MFA Phase 1 (§2.1). P0 PDPL Privacy Centre + right-to-deletion (§1.6). P0 DPO designated. Security headers + HSTS (§1.2). Dependabot + `pnpm audit` in CI (§3.4). `/security` page + private bug bounty invite (§3.6). |
| **Q3 2026** | Passkeys (§2.1). Rate limiting (§2.3). Zod on every API route (§2.4). Column encryption for sensitive fields (§1.1). CSP report-only → enforce (§1.3). Doppler / Infisical secret migration (§3.3). Monthly restore drill (§1.5). Quarterly pen test (§3.5). |
| **Q4 2026** | RBAC formalisation (§3.2). Step-up authentication (§2.2). Session table + device revoke (§2.2). Status page (§4.4). Transfer pricing study kickoff (§5.4). ADGM DP posture (post-Platform incorp) (§5.2). |
| **Q1 2027** | Annual external pen test + remediation. Public bug bounty. VARA readiness for tokenisation pilot (§5.3). Transfer pricing local file delivered. First postmortem retrospective in founder review. |

---

## Priority ranking — safety improvements

Top 10 by strategic urgency:

1. **P0 PDPL compliance + right-to-deletion + DPO** — regulator enforcement is active. (§1.6)
2. **P0 MFA + UAE Pass integration** — every bank / gov partnership requires it. (§2.1)
3. **P0 Audit log (append-only, tamper-evident)** — unrecoverable if missed early. (§3.1)
4. **P0 Incident response runbook + on-call rotation** — cheapest per unit of value. (§4.3)
5. **P1 Dependency scanning (Dependabot + `pnpm audit` in CI)** — supply-chain attacks are top-3 cause of proptech incidents 2021–2025. (§3.4)
6. **P1 Security headers + HSTS + CSP** — 1 day of work, massive security questionnaire lift. (§1.2, §1.3)
7. **P1 Backup strategy + monthly restore drill** — the only proof backups work. (§1.5)
8. **P1 Rate limiting** — prevents AI cost blow-up and credential stuffing. (§2.3)
9. **P1 Secret management (Doppler/Infisical) + Shamir for wallet seed** — eliminates SPOF on custody. (§3.3)
10. **P1 Zod on every API route** — completes ORM-level SQL-injection protection. (§2.4)

---

## Budget summary — 12-month safety

| Category | One-time | OpEx / yr | Notes |
|---|---:|---:|---|
| Engineering effort (~24 engineer-weeks total) | AED 0 direct | Included in headcount | ~15–20 % of Zhan's Y1 time or Chief-of-Staff engineering budget |
| DPO retainer (external, part-time) | 0 | 120 k | AED 10 k / month |
| External pen test (annual) | 80 k | 80 k | Recurring yearly |
| Bug bounty (private → public) | 5 k setup | 60 k | AED 5 k / month average bounty + triage |
| Privacy counsel (quarterly review) | 0 | 40 k | AED 10 k / quarter |
| Doppler / Infisical (free tier OK for now) | 0 | 0 | Free under 5 seats |
| Upstash Redis (rate limiting) | 0 | 6 k | Low volume tier |
| Supabase read replica (optional) | 0 | 36 k | AED 3 k / month for interim failover |
| Status page (Atlassian Statuspage basic) | 0 | 12 k | AED 1 k / month |
| Transfer pricing study | 120 k | — | Big 4 fee, one-time per policy change |
| Key rotation / audit tooling | 20 k | 10 k | Lightweight |
| **TOTAL** | **~AED 225 k** | **~AED 364 k / yr** | Well within Agency Y1 cash flow |

---

## Sources

- [UAE PDPL (Federal Decree-Law 45/2021) overview](https://securiti.ai/uae-personal-data-protection-law/)
- [UAE PDPL strategic 2026 guide](https://www.oadtechnologies.com/uae-personal-data-protection-law-compliance-a-strategic-guide-for-2026/)
- [ADGM Data Protection Regulations 2021](https://assets.adgm.com/download/assets/ADGM+Data+Protection+Regulations+2021+Updated.pdf/146aa34858b011efb99a36e29b0f3a63)
- [ADGM DP Regulations analysis (Gowling)](https://gowlingwlg.com/en/insights-resources/articles/2021/what-new-adgm-data-protection-regulations-mean)
- [UAE IT Law + cybersecurity 2026 practical guide](https://uaeahead.com/uae-it-law-updates-2026-guide/)
- [Passkeys at Scale enterprise playbook 2026](https://securityboulevard.com/2026/03/passkeys-at-scale-the-complete-enterprise-deployment-playbook-2026/)
- [FIDO Alliance Passkeys](https://fidoalliance.org/passkeys/)
- [NIST SP 800-63-4 AAL2 guidance](https://www.nist.gov/)

---

**End of MASTER_TREE_SAFETY_PROPOSALS.md.** For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com`.
