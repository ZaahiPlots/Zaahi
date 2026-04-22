# Bus Factor Recovery — pre-Rudi-wire governance · actionable checklist

**Status:** ACTIVE v1.0 · 2026-04-22
**Classification:** CONFIDENTIAL — operations document
**Parent:** `docs/audits/WEB_PLATFORM_CURRENT_STATE_2026-04-22.md` (commit `51c926d`) §6 Bus Factor finding
**Depends on:** `docs/governance/AUTONOMY_PROTOCOL_2026-04-22.md` v1.0 · `docs/specs/phase-1/06-SECRETS_ROTATION_POLICY.md` v1.0 (this session)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Prepared by:** Agent · Opus 4.7 · 2026-04-22
**Prepared for:** Zhan Ryspayev (Founder/CEO/CTO · primary admin today) · Dymo Tsvyk (Co-founder · secondary admin target) · Rudi Belin (Board · informational)
**Execution target:** 3-4 hour founder co-working session · complete BEFORE Rudi AED 1M wire 2026-05-08.

---

## §0 Purpose

**ZAAHI bus factor = 1 today.** Audit 2026-04-22 §6 finding: Zhan is sole admin on Vercel · Supabase · GitHub · Namecheap · Anthropic · Resend. If Zhan becomes unreachable > 48 hours (laptop theft · illness · travel emergency), platform ops are blocked. Rudi has 0% admin access. Dymo has admin access only to USDT Ambassador wallet.

**Before Rudi AED 1M wire (2026-05-08)** this must become **bus factor 2** · with documented recovery procedures for both-founders-unreachable edge case.

**This document provides the 3-4 hour execution checklist that accomplishes that fix.**

**Authority tier:** GREEN per AUTONOMY_PROTOCOL §1.1 — this doc is advisory ops procedure · no `src/**` changes · no production actions · founders execute via their own admin consoles at vendor websites.

---

## §1 Bus factor assessment (from audit 2026-04-22 §6)

### §1.1 Current state

**Zhan = single admin on:**
- Vercel (production deploy pipeline) — deploy fails if Zhan unreachable · no emergency hotfix possible.
- Supabase (DB + Auth project owner) — DB dashboard access blocked · cannot check data health · cannot rotate secrets.
- GitHub `ZaahiPlots/Zaahi` repo — cannot merge PRs · cannot create branches · cannot add collaborators.
- Namecheap (DNS registrar) — cannot change DNS · blocks cutover · blocks emergency redirect.
- Anthropic Console — cannot check API usage · cannot rotate key · cannot manage DPA.
- Resend — cannot check email delivery · cannot rotate key.

**Dymo = single admin on:**
- TRON USDT wallet (`TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7`) — Ambassador treasury. Zhan has seed location (per CLAUDE.md "Zhan has seed offline per usual practice") but formal custody policy not yet documented.

**Rudi = no admin access anywhere.**
- No Vercel · no Supabase · no GitHub · no Namecheap · no Anthropic · no Resend.
- No wallet access.
- Only MOU commercial authority.

### §1.2 Risks enumerated

| Scenario | Likelihood | Impact | MTTR (today) |
|---|:-:|:-:|---|
| Zhan laptop theft | Low | Medium | Hours (if cloud-synced tokens revokable) to weeks (if local-only creds lost) |
| Zhan illness > 48h unreachable | Medium | High | Full ops paused · no deploys · no emergency fixes |
| Zhan traveling + no connectivity | Medium | Medium | Deploy pipeline down · non-emergency ops pause |
| Dymo illness > 48h unreachable | Medium | Low | Wallet operations pause · no Ambassador payouts · Agency BD pauses |
| Both founders unreachable > 48h | Low | Critical | Platform operates on last deploy · no new pushes · users see cached state |
| Both founders unreachable > 7d | Very low | Critical | Rudi counsel envelope (per §6) activates · platform continuity plan kicks in |
| Malicious actor gains Zhan creds | Low | Critical | Prod DB + deploy pipeline at risk · need immediate rotation (Spec 06 §2.2 event-triggered) |
| Rudi needs investor reporting | High (monthly) | Medium | Can only get reports via Zhan · Rudi cannot self-serve |

### §1.3 Pre-MOU-signing fix mandatory — rationale

Rudi is wiring AED 1M. The MOU (commercial framework) + Term Sheet (investor protections) will be executed around this fix window. Rudi's enterprise governance expectation = bus factor ≥ 2 with documented recovery. If we enter MOU signing with bus factor 1:
- Rudi risk: his AED 1M is exposed to single-admin-unreachable scenario.
- Negotiation friction: Rudi's legal counsel will flag this as red-flag governance · might delay signing or attach conditions.
- Post-MOU: fixing bus factor AFTER signing = more cumbersome (requires amendments · signatures · legal review).

**Fixing bus factor pre-MOU = simple operational task (3-4 hours) with zero governance overhead.**

---

## §2 Account sharing plan per vendor (sequential · acceptance criteria · time estimate)

### §2.1 Vercel — add Dymo as Owner

**Current state:** Zhan sole Team Owner.

**Action:**
1. Vercel dashboard → Team Settings → Members.
2. Click "Invite Member".
3. Enter `d.tsvyk@gmail.com`.
4. Role: **Owner** (full admin access · not Member which is limited).
5. Send invite.
6. Dymo checks email · accepts invite · sets up Vercel account with 2FA enabled.

**Acceptance criteria:**
- [ ] Dymo sees `ZAAHI` team in Vercel dashboard.
- [ ] Dymo can access production deployment logs.
- [ ] Dymo can see environment variables (but NOT modify without Zhan confirmation for safety per AUTONOMY_PROTOCOL YELLOW tier).
- [ ] 2FA enabled on Dymo Vercel account.

**Time:** 10 minutes.

### §2.2 Supabase — add Dymo as Admin (Organization-level)

**Current state:** Zhan sole Organization Owner · ZAAHI project solo-managed.

**Action:**
1. Supabase dashboard → Organization Settings → Team.
2. Click "Invite Member".
3. Enter `d.tsvyk@gmail.com`.
4. Role: **Admin** (full project access · can manage secrets · can read DB).
5. Send invite.
6. Dymo accepts · creates Supabase account with 2FA.

**Acceptance criteria:**
- [ ] Dymo sees ZAAHI organization in Supabase dashboard.
- [ ] Dymo can access Database section · Auth section · Storage section · API section.
- [ ] Dymo can view (not necessarily modify · at Dymo's discretion) environment secrets.
- [ ] 2FA enabled on Dymo Supabase account.

**Time:** 10 minutes.

### §2.3 GitHub — add Dymo as Admin to ZaahiPlots/Zaahi repo

**Current state:** `ZaahiPlots` is Zhan-owned GitHub organization · `Zaahi` repo is private.

**Action:**
1. GitHub → ZaahiPlots organization → People.
2. Invite new member: Dymo's GitHub username (confirm with Dymo).
3. Role: **Organization Owner** OR **Repo Admin** for Zaahi (recommended: Repo Admin to avoid over-privileged org-wide access · adjustable).
4. Dymo accepts invite · sets up 2FA on GitHub account.

**Acceptance criteria:**
- [ ] Dymo can see `ZaahiPlots/Zaahi` repo in their GitHub account.
- [ ] Dymo can approve PRs · push to main (deferred to YELLOW tier per AUTONOMY_PROTOCOL for non-emergency).
- [ ] Dymo's GitHub personal access token NOT yet generated (deferred until rotation cadence or emergency).
- [ ] 2FA enabled.

**Time:** 5 minutes.

### §2.4 Namecheap — add Dymo co-owner OR shared credentials via 1Password

**Current state:** Zhan sole Namecheap account owner. Namecheap does NOT support team admin for individual accounts (only for hosting resellers).

**Action (two options):**

**Option A (recommended if Dymo comfortable with shared-account model):**
1. Generate strong new password for Namecheap account.
2. Store password in 1Password "ZAAHI Shared" vault (see §3).
3. Both founders can log in via 1Password password-fill.
4. Enable 2FA on Namecheap account · store 2FA backup codes in 1Password Emergency vault.

**Option B (if Dymo prefers separate account · more complex):**
1. Transfer `zaahi.io` domain to a new Namecheap account in ZAAHI's name (business account if available).
2. Invite Dymo as authorized contact.
3. Additional ~AED 50 transfer fee + 1-7 days transfer processing.

**Recommended: Option A** for speed and operational simplicity. Option B for Phase 2+ if domain control needs separation.

**Acceptance criteria:**
- [ ] Password rotated · stored in 1Password.
- [ ] 2FA enabled on Namecheap.
- [ ] 2FA backup codes in 1Password Emergency vault.
- [ ] Both founders confirm they can log in via 1Password password-fill.

**Time:** 15 minutes.

### §2.5 Anthropic Console — add Dymo OR shared credentials via 1Password

**Current state:** Zhan sole Anthropic account holder. Anthropic Console supports team management under enterprise plans.

**Action (two options):**

**Option A (recommended for current pricing tier):**
- Same as Namecheap §2.4 Option A — shared credentials via 1Password.

**Option B (if upgraded to Anthropic Team tier later):**
- Invite Dymo to organization · role Admin.
- Requires Team-tier subscription.

**Acceptance criteria:**
- [ ] Password rotated.
- [ ] 2FA enabled.
- [ ] Credentials in 1Password.

**Time:** 10 minutes.

### §2.6 Resend — add Dymo (after Zhan env-var setup task today)

**Current state:** Being set up today (per Zhan's current task per audit 2026-04-22 immediate actions). Fresh account.

**Action:**
1. Resend dashboard → Team Settings → Invite Team Member.
2. Invite `d.tsvyk@gmail.com`.
3. Role: **Admin**.
4. Dymo accepts · creates Resend account with 2FA.

**Acceptance criteria:**
- [ ] Dymo sees ZAAHI team in Resend.
- [ ] Dymo can access API keys (but not modify without Zhan approval per YELLOW tier).
- [ ] 2FA enabled.

**Time:** 5 minutes (after Zhan finishes current env-var setup).

### §2.7 Telegram Bot — document BotFather access

**Current state:** Bot created via BotFather · bot token held by Zhan.

**Action:**
1. Document that ZAAHI bot was created under Zhan's Telegram account.
2. Add Zhan's Telegram username + bot name to 1Password (for recovery reference).
3. Note in this doc: bot-token rotation via BotFather requires access to Zhan's Telegram account.
4. If recovery needed: Dymo cannot rotate bot token without Zhan's Telegram account access (BotFather is per-user · no team feature).

**Accept this limitation for Phase 1.** Workaround for emergency: create a NEW bot under Dymo's Telegram account · update `TELEGRAM_BOT_TOKEN` env var · users on old bot won't get messages (acceptable — admin notifications only).

**Acceptance criteria:**
- [ ] BotFather access documented in 1Password.
- [ ] Emergency procedure noted: "if Zhan unreachable + bot token rotation needed · create new bot under Dymo's Telegram · update env var · accept brief notification outage".

**Time:** 10 minutes.

---

## §3 1Password Family setup

### §3.1 Upgrade to 1Password Family tier

**Current state:** individual founder accounts (if any).

**Action:**
1. Sign up for 1Password Family plan at `1password.com/families`.
2. Cost: ~AED 20/month (5 users included).
3. Create ZAAHI Family owned by Zhan.
4. Invite Dymo as Family member.
5. Reserve 3 empty slots for emergency use (see §3.2).

**Acceptance criteria:**
- [ ] Both Zhan + Dymo signed into 1Password Family.
- [ ] Both have 1Password desktop + mobile apps installed.
- [ ] Biometric unlock enabled on both devices.

**Time:** 15 minutes.

### §3.2 Vault structure

Create the following vaults in 1Password Family:

| Vault name | Access | Contents |
|---|---|---|
| **Production** | Zhan read-write · Dymo read-only | Live production secrets · DB URLs · API keys · bot tokens |
| **Staging** | Zhan read-write · Dymo read-write | Staging environment secrets |
| **Emergency** | Zhan + Dymo read-write · Rudi counsel optional read-only | Last-resort recovery credentials · 2FA backup codes · emergency contacts |
| **Recovery** | Reserved for Rudi counsel sealed envelope contents (see §6) | Platform continuity plan · credential locations · activation triggers |

**Vault operational rules:**
- **Never share secrets outside vaults.** No Slack DMs · no email · no SMS.
- **Update on every rotation** per Spec 06 — old value version-history preserved 90 days by 1Password default.
- **Audit log review:** 1Password audit log shows all access events · review monthly.

### §3.3 What goes in each vault

**Production vault:**
- DATABASE_URL (production Supabase)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
- RESEND_API_KEY
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_CHAT_ID
- TELEGRAM_FOUNDER_CHAT_ID
- Vercel deployment token
- GitHub personal access token (Zhan's · Dymo's separately)
- Namecheap account creds (shared)
- Anthropic account creds (shared)
- Anthropic zero-retention DPA key

**Staging vault:**
- All of above but staging variants.

**Emergency vault:**
- Zhan's emergency contact info (wife · parent · friend)
- Dymo's emergency contact info
- 2FA backup codes for all accounts (Namecheap · Anthropic · etc.)
- Laptop recovery keys (Zhan's FileVault / BitLocker · Dymo's)
- SSH key backups (Zhan's)
- 1Password Emergency Kit (printed · stored offline · referenced here)
- TRON wallet seed location (Zhan's per CLAUDE.md · Shamir-split per SV-6 Month 6-7)

**Recovery vault (if §6 implemented):**
- Rudi counsel sealed envelope contents copy.

### §3.4 Enable 2FA on master accounts

Master account 2FA MUST be enabled (1Password master account · not per-vault).

**Both founders:**
- [ ] 2FA enabled via authenticator app (Authy · 1Password authenticator · Google Authenticator).
- [ ] Backup codes generated · printed · stored in physical safe location.
- [ ] Tested 2FA login works · backup code works.

**Time:** 15 minutes.

### §3.5 Documentation of which vault holds what

Create 1Password note (or append to this doc) mapping each credential to its vault. When rotating, update the vault entry · version-history preserves old value for 90 days.

---

## §4 Billing alerts

### §4.1 Vendor-specific billing alerts

**Configure billing alerts that notify BOTH founders:**

1. **Vercel:** Team Settings → Billing → Notifications.
   - Alert at 50% / 80% / 100% of monthly budget.
   - Both `zhanrysbayev@gmail.com` + `d.tsvyk@gmail.com` on distribution.
   - Budget threshold: ~AED 200/mo (current low usage) · raise as traffic scales.

2. **Supabase:** Organization → Billing → Usage.
   - Supabase alerts at 75% / 90% / 100% of plan tier.
   - Both founders notified.

3. **Anthropic:** Console → Usage & Billing.
   - Anthropic supports monthly budget + alert thresholds.
   - Set budget to AED 5 000/mo initially · alerts at 50% / 80%.
   - Both founders on notification list.

4. **Namecheap:** Domain Renewal Alerts.
   - zaahi.io auto-renewal enabled.
   - Renewal reminder 60/30/7 days before expiry.
   - Both founders on email.

5. **Resend:** Settings → Notifications.
   - Usage alerts at 80% / 100%.
   - Both founders notified.

**Action:**
- [ ] Log into each vendor console · configure alerts per above.
- [ ] Verify alerts fire via test (e.g., temporarily lower Vercel threshold · confirm email arrives).

**Time:** 20 minutes total across all vendors.

### §4.2 Alert review cadence

**Monthly:** Zhan + Dymo review all billing dashboards (15 min).
**Quarterly:** Pull 90-day usage summary · share with Rudi per D-38 weekly call.

---

## §5 Recovery runbook

### §5.1 If Zhan unreachable > 48 hours

**Step 1: Escalation confirmation.**
- Dymo attempts Telegram · SMS · phone · email to Zhan.
- No response after 48 hours → invoke §5.1 procedure.

**Step 2: 1Password access.**
- Dymo accesses Production vault via 1Password Family.
- Zhan's laptop / devices may be unreachable · 1Password is cloud-synced · Dymo access independent.

**Step 3: Emergency contact.**
- Check Emergency vault for Zhan's emergency contact (wife · parent · friend).
- Reach out · determine situation (illness · travel · other).
- Estimate unreachable duration.

**Step 4: Assume tech admin role (if >7 day absence expected).**
- Dymo assumes production access via shared credentials.
- No new features deployed (per AUTONOMY_PROTOCOL §5 scope).
- Emergency hotfixes only (CLAUDE.md security rules) · via documented procedure.
- Weekly status update to Rudi (per D-38).

**Step 5: Production push policy during Zhan absence.**
- Dymo pauses all non-emergency development.
- Emergency fixes: Dymo + agent (Claude Code via Opus 4.7) pair-programming · Dymo reviews + approves each commit.
- Production deploys: Dymo-approved via Vercel dashboard with 2FA.
- Smoke-test checklist (from `CLAUDE.md` SMOKE TEST) mandatory before every push.

**Step 6: Zhan return.**
- Zhan resumes full admin.
- Dymo's deployments reviewed post-return.
- Lessons-learned memo filed.

### §5.2 If Dymo unreachable > 48 hours

**Primary concern: TRON USDT wallet access (Ambassador treasury).**

**Step 1: Escalation confirmation.** Same as §5.1 Step 1 (Dymo side).

**Step 2: Wallet access.**
- **Pre-multisig (today):** Zhan has seed location per CLAUDE.md · can access wallet if absolutely necessary. Should be rare · Ambassador payouts within 30-day SLA · brief Dymo absence doesn't require wallet access.
- **Post-multisig (SV-7 Month 5-6):** 2-of-3 multisig means Zhan can sign with one additional signer (Rudi counsel if wet-ink authority granted). Dymo not single point of failure.
- **Post-Shamir split (SV-6 Month 6-7):** seed phrase 3-of-5 Shamir · Zhan + 2 trusted shards can reconstruct if absolutely necessary.

**Step 3: Agency operations during Dymo absence.**
- Zhan pauses BD pipeline (Dymo is lead).
- Existing deals preserved (no new signings).
- Plot 1 closing (Fri 2026-06-19) — if falls during Dymo absence · Rudi notified · deal postponement via agency acceptable.

**Step 4: Ambassador support during Dymo absence.**
- Ambassador signups paused (no new tier activations).
- Existing ambassadors served via automated platform (no wallet operations needed for read-only).

### §5.3 If both unreachable > 7 days

**Step 1: Rudi confirms via independent channels.**
- Rudi attempts to reach both via known emergency contacts.
- Rudi has Zhan + Dymo family contact info (see §6 counsel envelope).

**Step 2: Rudi counsel sealed envelope activation (if implemented per §6).**
- Rudi's legal counsel opens sealed envelope.
- Contains: credential locations · 1Password emergency codes · investor continuity plan · 30-day platform-continuity protocol.

**Step 3: Platform auto-runs on last deploy.**
- No new pushes.
- User traffic served from cached Vercel deployment.
- API routes continue executing (Supabase + Anthropic + Resend still running).
- Users experience graceful degradation:
  - New sign-ups still accepted · admin approval pending (no one to approve).
  - Existing users continue using platform normally.
  - Ambassador payouts paused.
  - No new parcels added.
  - Customer support: auto-reply "Platform in maintenance · contact [Rudi counsel email]."

**Step 4: 30-day platform-continuity plan.**
- Rudi counsel holds sealed envelope per §6.
- Envelope contents enable Rudi counsel to:
  - Continue vendor subscriptions (auto-renew via existing billing).
  - Pay domain renewal (if within 30 days).
  - Communicate with users via pre-authorized message.
- Beyond 30 days: formal founder-replacement procedure per MOU (requires Rudi initiative · NOT automated).

**Step 5: Founder return.**
- If founders return within 30 days: resume normal ops · audit any actions taken by Rudi counsel · update runbook.
- If founders do not return within 30 days: MOU-specified continuity procedure activates (separate document per MOU_RUDI.md).

---

## §6 Rudi counsel sealed envelope (OPTIONAL · founder decision)

### §6.1 Purpose

An envelope held by Rudi's legal counsel · contents sealed until activation trigger · provides continuity instructions if both founders unreachable > 7 days.

**This is a belt-and-suspenders measure.** Phase 1 ZAAHI is small · both-founders-unreachable scenario is very low probability · envelope represents institutional-grade governance not always expected at pre-Series-A stage.

### §6.2 Contents (if implemented)

- **Credential locations.** Where 1Password master keys are stored · how to access Emergency vault.
- **1Password Emergency Kit** printouts (PDF · each founder's).
- **Vendor contact information.** Named account reps at Vercel · Supabase · Anthropic · Resend · Namecheap for continuity conversations.
- **User communication template.** Pre-approved message to post on zaahi.io in extended absence.
- **30-day continuity protocol.** What Rudi counsel can / cannot do:
  - Can: pay vendor subscriptions · renew domain · post pre-authorized user message.
  - Cannot: deploy code · access user data · communicate with specific users · authorize Ambassador payouts · modify data.
- **Re-activation procedure.** What to do when one/both founders return.

### §6.3 Storage

- Sealed envelope in Rudi counsel safe deposit box.
- Paper copies only (no digital · avoid cloud exposure).
- Two-person rule for opening (Rudi + one counsel partner · requires both signatures).

### §6.4 Activation trigger

**Activation requires ALL of:**
1. Both founders unreachable > 7 days (documented via §5.1 / §5.2 escalation failures).
2. Rudi independently confirms unreachable via emergency contacts.
3. Rudi formally requests counsel to open envelope (in writing).

### §6.5 Founder decision required

**Options:**

**Option A — Implement envelope pre-MOU signing.**
- Additional AED ~5-10k legal fees for counsel to draft and store.
- Adds 1-2 weeks to pre-MOU timeline.
- Strong governance signal to Rudi.

**Option B — Defer envelope to Phase 2.**
- Phase 1 continues without envelope.
- BUS_FACTOR 2 achieved via §2 + §3 + §5 suffices for Phase 1 risk profile.
- Revisit at Series A prep (2027 Q3) when formal investor governance expectations harden.

**Option C — Skip envelope indefinitely.**
- Accept residual risk of both-founders-unreachable > 7 days.
- Platform auto-runs on last deploy · 30-day gracefull degradation acceptable.

**OPEN QUESTION for founder decision:** which option? Agent recommends **Option B** — defer envelope to Phase 2. Rationale: BUS_FACTOR 2 via §2+§3+§5 suffices for Phase 1 risk · envelope overhead exceeds value until Series A governance stage · Phase 2 can add as part of formal investor governance hardening.

---

## §7 Execution checklist

**Founder co-working session target duration: 3-4 hours.**

**Pre-session:**
- [ ] Both founders present (in person or video call · screen-share required).
- [ ] Stable internet connection.
- [ ] Both laptops with authenticator apps installed.
- [ ] Phones available for 2FA SMS fallback.
- [ ] This document open in browser for reference.

**Session tasks (sequential):**

**Hour 1 — 1Password setup (§3):**
- [ ] §3.1 1Password Family account created · both founders joined.
- [ ] §3.2 Four vaults created (Production · Staging · Emergency · Recovery).
- [ ] §3.4 2FA enabled on both master accounts.
- [ ] §3.5 Initial vault population (start with Production · populate during §2 work).

**Hour 2 — Vendor account shares (§2):**
- [ ] §2.1 Vercel — Dymo added as Owner · 2FA confirmed.
- [ ] §2.2 Supabase — Dymo added as Admin · 2FA confirmed.
- [ ] §2.3 GitHub — Dymo added as Repo Admin · 2FA confirmed.
- [ ] §2.4 Namecheap — credentials rotated + shared via 1Password · 2FA enabled.
- [ ] §2.5 Anthropic — credentials shared via 1Password · 2FA enabled.
- [ ] §2.6 Resend — Dymo added as Admin · 2FA confirmed.
- [ ] §2.7 Telegram BotFather — access documented.

**Hour 3 — Billing alerts (§4):**
- [ ] §4.1 All 5 vendor billing alerts configured · both founders on distribution.
- [ ] Test alert fires (temporarily lower threshold · verify email).

**Hour 4 — Recovery runbook walk-through (§5):**
- [ ] Both founders read §5 recovery runbook aloud together.
- [ ] Questions / clarifications captured.
- [ ] Any procedure changes agreed · this doc updated.
- [ ] §6 envelope decision made (Option A / B / C per agent recommendation B).

**Verification (end of session):**
- [ ] Each founder test-logs-in to EACH vendor via shared/invited access.
- [ ] Each founder accesses 1Password Production vault · reads a secret.
- [ ] Each founder confirms 2FA works on all their accounts.

**Sign-off:**
- [ ] Memo filed `docs/decisions/bus-factor-fix-YYYY-MM-DD.md` (template in §8).
- [ ] Memo signed by both founders.
- [ ] Rudi notified: "Bus factor fix complete as of YYYY-MM-DD · BUS_FACTOR = 2 · recovery runbook documented · pre-MOU governance milestone achieved."

---

## §8 Sign-off block

**Memo template for `docs/decisions/bus-factor-fix-YYYY-MM-DD.md`:**

```markdown
# Bus Factor Fix — YYYY-MM-DD

## Status
COMPLETED

## Prior state
- BUS_FACTOR = 1 (audit 2026-04-22 §6 finding)
- Zhan sole admin on Vercel · Supabase · GitHub · Namecheap · Anthropic · Resend

## Fix executed per BUS_FACTOR_RECOVERY.md v1.0

### Vendor shares (§2)
- [x] Vercel — Dymo added as Owner
- [x] Supabase — Dymo added as Admin
- [x] GitHub — Dymo added as Repo Admin
- [x] Namecheap — shared via 1Password · Option A chosen
- [x] Anthropic — shared via 1Password
- [x] Resend — Dymo added as Admin
- [x] Telegram — BotFather limitation documented

### 1Password Family (§3)
- [x] Family plan active
- [x] 4 vaults created
- [x] 2FA on both master accounts

### Billing alerts (§4)
- [x] 5 vendor billing alerts configured
- [x] Test alert fired successfully

### Recovery runbook (§5)
- [x] Read aloud
- [x] No changes needed

### Rudi counsel envelope (§6)
- Decision: [Option A / B / C]
- [Rationale]

## Post-fix state
- BUS_FACTOR = 2
- Both founders admin on all production systems
- Recovery runbook documented and reviewed
- Rudi pre-wire governance milestone achieved

## Signatures

Zhan Ryspayev: ______________________  Date: ____________

Dymo Tsvyk: ______________________  Date: ____________

## Distribution
- [x] Zhan
- [x] Dymo
- [x] Rudi (notification sent)
- [x] Filed at docs/decisions/bus-factor-fix-YYYY-MM-DD.md
```

---

## §9 Post-fix maintenance

### §9.1 Quarterly review

**Cadence:** every 3 months · aligns with Spec 06 CRITICAL secret rotation.

**Scope:**
- [ ] Review 1Password audit log for anomalies.
- [ ] Confirm both founders still have active access to all vendors.
- [ ] Test recovery runbook: one founder temporarily simulates unreachable · other executes §5 steps · measures MTTR.
- [ ] Update this doc if any vendor changes access model (e.g., Vercel adds new role tier).

### §9.2 Onboarding new admins (Phase 2+)

When new admins join (e.g., Chief of Staff Month 8 · Community Manager Month 12):

- Add to relevant vaults (not necessarily Production · likely Staging + Emergency read-only).
- Update this doc §2 + §3.
- Offboarding procedure triggered on role change (per Spec 06 §2.2 event-triggered rotation).

### §9.3 Post-G42 cutover updates

After Month 9-10 cutover:
- Retire Vercel + Supabase from vendor list.
- Add Core42 / Azure as new admin shares.
- Update 1Password vaults with new secret values (per Spec 06 §6 pre-G42 ritual).

---

## §10 Cross-references

- `docs/audits/WEB_PLATFORM_CURRENT_STATE_2026-04-22.md` (commit `51c926d`) — §6 Bus Factor finding (source).
- `docs/governance/AUTONOMY_PROTOCOL_2026-04-22.md` v1.0 (commit `d286277`) — tier authority for admin-access-related actions.
- `docs/specs/phase-1/06-SECRETS_ROTATION_POLICY.md` v1.0 — §3 1Password storage coordinates with this doc.
- `docs/specs/phase-1/05-AUTH_ABSTRACTION_SPEC.md` v1.0 — Azure AD B2C post-cutover admin model.
- `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` v1.0 — §2.5 bus factor state · §5.1 T-7 checklist requires bus factor fix complete.
- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.3 — SV-7 multisig Month 5-6 (addresses Dymo wallet bus factor separately).
- `docs/investor-package/MOU_RUDI.md` — investor governance baseline.
- `CLAUDE.md` — AGENT RULES + FOUNDER CONTACTS preserved.

---

**End of Bus Factor Recovery v1.0.**

Execution target: 3-4 hour founder co-working session · complete BEFORE Rudi AED 1M wire 2026-05-08. Post-fix BUS_FACTOR = 2 · quarterly review cadence established · Phase 2 admin onboarding procedure documented.

**Agent recommendation:** schedule this session for 2026-04-28 (Rudi weekly Sunday call day) OR 2026-05-03 (Saturday co-working day) · 2-4 weekdays before Rudi wire to allow buffer for any follow-up issues.
