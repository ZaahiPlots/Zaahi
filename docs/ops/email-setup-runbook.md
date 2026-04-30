# Email setup runbook — `zaahi.io` (Google Workspace + Namecheap DNS)

**Audience:** founder / on-call engineer doing the first-time email setup,
or coming back to it 6 months later to add a new sender.
**Domain:** `zaahi.io`
**DNS host:** Namecheap (Advanced DNS panel)
**Mail provider:** Google Workspace (primary)
**Future co-tenant:** Mailgun (transactional / outbound only)

This document is operational, not architectural. Follow the steps in order;
each step lists the verify command so you don't proceed on faith.

---

## 0. Scope and outcome

After completing this runbook you will have: MX records pointing to Google Workspace · single SPF authorising Google + Mailgun · 2048-bit DKIM for both providers · DMARC rolled out gradually (`none` → `quarantine` → `reject`) · standard alias map (founders, support, no-reply, security) · 2FA enforced workspace-wide · verified delivery via `mail-tester.com` · clean MXToolbox report.

Estimated wall time: **~3 hours active + 2 weeks DMARC observation window**. Do not skip the observation window.

---

## 1. Prerequisites

Before touching DNS:

| Prereq | Where | Verify |
|---|---|---|
| Domain registered | Namecheap | Login → Domain List → `zaahi.io` shows ACTIVE |
| Domain ownership verified in Workspace | admin.google.com → Account → Domains | Status `Verified` |
| Workspace subscription active | admin.google.com → Billing | Subscription status `Active` |
| Admin account has Super Admin role | admin.google.com → Directory → Users | `founder@zaahi.io` shows Super Admin badge |
| You can edit Namecheap DNS | Namecheap dashboard → Domain → Advanced DNS | "Add new record" button visible |
| `dig` available locally | `dig +version` | Returns BIND version line |

If any row fails, stop. Get it green before proceeding.

---

## 2. MX records — Google Workspace

Google now uses a single host for all MX traffic (deprecated the old 5-host setup).

### 2.1 Records to add (Namecheap → Advanced DNS → Mail Settings)

| Type | Host | Value | Priority | TTL |
|---|---|---|---|---|
| MX | `@` | `smtp.google.com` | 1 | 1 hour |

That is the only MX row. If Namecheap's UI is forcing the legacy 5-host setup, switch the dropdown from "Email Forwarding" to **"Custom MX"** and add the single row above.

### 2.2 Remove

- Any `@` MX rows pointing to `mail.namecheap.com` or other providers
- Any "Email Forwarding" entries (these silently override MX)

### 2.3 Verify

```
dig +short MX zaahi.io
```

Expected output (single line):

```
1 smtp.google.com.
```

Wait up to 1 hour for propagation if you don't see it immediately. Do not move on until this returns the right value from at least two DNS resolvers (`dig @8.8.8.8 MX zaahi.io` and `dig @1.1.1.1 MX zaahi.io`).

---

## 3. SPF — single record, room for Mailgun later

**One SPF record per domain. Period.** Multiple SPF records is the most common cause of silent SPF failure. If any tool tells you to "add a second SPF", it's wrong — merge into the existing one.

### 3.1 Final record (Google + Mailgun coexistence)

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.google.com include:mailgun.org ~all` | 1 hour |

Notes:

- `include:_spf.google.com` covers all Workspace sending IPs (Gmail web, IMAP/SMTP, send-as)
- `include:mailgun.org` is included **now** even before Mailgun is set up — pre-authorising the include is harmless and saves a future propagation cycle when transactional mail goes live
- `~all` (soft-fail) during rollout. Move to `-all` (hard-fail) only after **DMARC is at p=reject for 30 days** and you've audited reports for missed senders

### 3.2 What NOT to put in SPF

- Individual IP addresses for transactional senders (use the provider's `include:` instead — they rotate IPs)
- `+all` (allows the world to spoof you — never use)
- Multiple SPF records — the RFC says only the first is honoured, but in practice receivers reject ambiguous configurations

### 3.3 SPF lookup-count budget

SPF has a hard limit of **10 DNS lookups** per evaluation. Each `include:` typically costs 2-4. Budget:

- `_spf.google.com` → ~4 lookups
- `mailgun.org` → ~3 lookups
- Total: ~7 — leaves headroom for one more provider before you must "flatten"

If you ever reach 10, do **not** flatten by hand. Use a service like `easydmarc.com` or `dmarcian.com` to maintain a flattened record and update it on a schedule — IPs do change.

### 3.4 Verify

```
dig +short TXT zaahi.io | grep -i spf1
```

Expected:

```
"v=spf1 include:_spf.google.com include:mailgun.org ~all"
```

Cross-check lookup count:

```
https://mxtoolbox.com/SuperTool.aspx?action=spf%3azaahi.io
```

Look for: "PASS — Number of DNS lookups: N" where N ≤ 10.

---

## 4. DKIM — 2048-bit signing

DKIM lets receivers verify the message was actually sent (and not modified) by an authorised sender.

### 4.1 Generate the Google Workspace key

1. admin.google.com → **Apps → Google Workspace → Gmail → Authenticate email**
2. Domain dropdown: select `zaahi.io`
3. Click **Generate New Record**
4. **Key bit length: 2048** (default is 1024 — change it)
5. **Prefix selector: `google`** (default; only change if you already have a `google` selector in DNS)
6. Click **Generate**
7. Google shows a long `v=DKIM1; k=rsa; p=...` value — copy the entire value

### 4.2 Add to Namecheap DNS

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `google._domainkey` | (the entire `v=DKIM1; k=rsa; p=…` string Google generated) | 1 hour |

Namecheap may complain that the value is too long. The 2048-bit DKIM record is ~400 chars — Namecheap supports it; just paste it as a single TXT record (the Namecheap UI will show it in quotes; that's fine).

If your DNS host genuinely refuses long values, that's a host limitation and you'd need to switch to a host that supports it. Do **not** drop to 1024-bit DKIM as a workaround.

### 4.3 Activate in Workspace

1. Wait 1 hour for DNS propagation
2. admin.google.com → same page as 4.1 → click **Start Authentication**
3. Status changes to "Authenticating email with DKIM" within 24 hours
4. Header `DKIM-Signature: v=1; a=rsa-sha256; d=zaahi.io; s=google; …` appears on outbound mail

### 4.4 Mailgun DKIM (when transactional sending goes live)

Mailgun generates a separate selector — typically `pic._domainkey` and `mta._domainkey` — at 2048-bit by default. Two selectors coexist with Google's `google._domainkey` because each uses a different selector name. No conflict.

When Mailgun setup happens, repeat 4.1-4.3 swapping in Mailgun's values. Keep both DKIM selectors active permanently — receivers verify whichever selector signed the specific message.

### 4.5 Verify

```
dig +short TXT google._domainkey.zaahi.io
```

Expected: a long string starting with `"v=DKIM1; k=rsa; p="`. If you see `"NXDOMAIN"` or empty, propagation hasn't finished — wait.

End-to-end DKIM verify by sending a test message to a Gmail address you control, then in Gmail click "Show original" — look for `DKIM: 'PASS' with domain zaahi.io`.

---

## 5. DMARC — staged progression

DMARC tells receivers what to do when SPF or DKIM fails. **Do not start at `p=reject`** — you will silently lose legitimate mail from senders you forgot about.

### 5.1 Stage 0 — `p=none` (observation only, week 0)

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@zaahi.io; ruf=mailto:dmarc@zaahi.io; sp=none; aspf=r; adkim=r; pct=100` | 1 hour |

What this does:

- `p=none`: receivers honour SPF/DKIM but take no action on failures
- `rua=`: aggregate reports (XML, daily) sent to `dmarc@zaahi.io`
- `ruf=`: forensic reports (per-failure, redacted) sent to `dmarc@zaahi.io`
- `aspf=r`, `adkim=r`: relaxed alignment (allows subdomains)
- `pct=100`: policy applies to 100% of mail (only relevant once `p` ≠ `none`)

Set up `dmarc@zaahi.io` as an alias forwarding to a real human inbox (see §6) before publishing this. Aggregate reports start arriving within 24 hours.

### 5.2 Week 1 — review reports

Use `dmarcian.com` or `postmark.com` free DMARC analyser — feed it the aggregate XML files. Look for:

- **Unrecognised senders** that pass DKIM/SPF — these are legit (CRMs, Slack notifications etc) you forgot about → add them to SPF or set up DKIM for them
- **Recognised senders** that fail DKIM/SPF — usually a misconfigured forwarder or a third-party service sending "as you" without authorisation
- **Unrecognised senders** that fail — likely spoofing attempts. Confirm.

Do not promote DMARC until at least 7 consecutive days show ≥99% pass rate from recognised senders.

### 5.3 Week 2 — promote to `p=quarantine; pct=25`

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@zaahi.io; ruf=mailto:dmarc@zaahi.io; sp=quarantine; aspf=r; adkim=r; pct=25` | 1 hour |

`pct=25` means only 25% of failing mail gets quarantined — gives you a controlled rollout. Watch reports for 3 days. If clean, raise to `pct=50` for 3 days, then `pct=100`.

### 5.4 Week 3-4 — promote to `p=reject`

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=reject; rua=mailto:dmarc@zaahi.io; ruf=mailto:dmarc@zaahi.io; sp=reject; aspf=r; adkim=r; pct=100` | 1 hour |

Keep `pct=100` and `p=reject` permanent. Re-check reports weekly for the first month, then monthly.

### 5.5 If you must roll back

Failure mode is "legitimate mail bouncing". Rollback path:

1. Drop policy back to `p=none` (full DNS update; takes ≤ 1 hour to propagate)
2. Wait 24h for the bounce queue to drain
3. Identify the failing sender from DMARC aggregate reports
4. Fix SPF or DKIM for that sender
5. Re-promote through the stages — do not skip back to `reject` immediately

**Keep `rua=` and `ruf=` set permanently.** The reports are how you'll find new misconfigured senders before they cause an outage.

---

## 6. Aliases — standard pattern

Workspace supports both **alias addresses** (route to existing user mailbox) and **groups** (multi-recipient distribution). Use aliases for personal-name forwards, groups for role inboxes.

### 6.1 Standard alias map for `zaahi.io`

| Address | Type | Routes to | Purpose |
|---|---|---|---|
| `founder@zaahi.io` | User | (real mailbox) | Founder's main inbox |
| `cofounder@zaahi.io` | User | (real mailbox) | Co-founder's main inbox |
| `support@zaahi.io` | Group | founder + cofounder | Customer support |
| `security@zaahi.io` | Group | founder + cofounder | Security disclosures (RFC 9116) |
| `legal@zaahi.io` | Alias | founder | Legal notices |
| `dmarc@zaahi.io` | Alias | founder | DMARC aggregate/forensic reports |
| `abuse@zaahi.io` | Alias | founder | Required by RFC 2142 |
| `postmaster@zaahi.io` | Alias | founder | Required by RFC 2142 |
| `no-reply@zaahi.io` | User (suppress reception) | Sends only, drops inbound | Transactional outbound |

### 6.2 Where to set them

- Aliases on a user: admin.google.com → Directory → Users → click user → User information → **Email aliases** → Add alias
- Groups: admin.google.com → Directory → **Groups** → Create group → add members → set "Who can post" to "Anyone on the internet" for `support@` and `security@`

### 6.3 `no-reply@zaahi.io` setup

This one is special:

1. Create as a regular user
2. Disable inbound: User → Email → **Inbox** → Routing → drop messages addressed to this user (or set up a routing rule that bounces with a friendly "this address does not accept replies, write to support@zaahi.io")
3. Enable as send-as for application service accounts only — never give this credential to a human

### 6.4 Aliases that are RFC-required and must exist

- `postmaster@` (RFC 5321) — receivers may bounce mail if missing
- `abuse@` (RFC 2142) — required by most blacklists for delisting

Don't skip these even if you "don't need them" — they're failure-mode insurance.

### 6.5 Verify

```
dig +short MX zaahi.io
```

Then send test messages **from outside the org** to:

- `support@zaahi.io` → arrives in both founder and cofounder inboxes
- `security@zaahi.io` → arrives in both
- `no-reply@zaahi.io` → bounces or silently drops with the configured response
- `postmaster@zaahi.io` → arrives in founder

---

## 7. 2FA — workspace-wide enforcement

Single most effective protection. Enforce, don't just enable.

### 7.1 Configure

1. admin.google.com → **Security → Authentication → 2-step verification**
2. Section **Allow users to turn on 2-step verification** → check
3. Section **Enforcement**:
   - **On**: turn on
   - **Methods**: "Any" initially, raise to "Any except verification codes via text, phone call" after 14-day grace
   - **Enrolment period**: 14 days
4. Click Save

### 7.2 Per-user

Each admin/user gets a 14-day window to set up 2FA after first sign-in. Recommended order:

1. Founder enrols using a hardware key (YubiKey or equivalent — physical possession is the strongest factor)
2. Co-founder enrols same way
3. Backup codes printed and stored offline (paper, safe) — these are the recovery if a hardware key is lost
4. Recovery email/phone set to a number/address you actually control 5+ years from now

### 7.3 What to require

- Hardware security keys for super-admin accounts (founder, co-founder)
- TOTP (Authenticator app) for regular users
- **No SMS** for any account — SMS-OTP is bypassable via SIM swap

### 7.4 Service / API accounts

Workspace API access (e.g. for Calendar integration, Gmail send-as) should use **OAuth scopes via Service Accounts**, never a real user's password. 2FA does not apply to service accounts; security comes from the private key being non-exportable. Rotate Service Account keys every 12 months.

### 7.5 Verify

- admin.google.com → Reports → Audit log → Login → filter by `Login challenge: 2FA`
- All logins should show `2-step verification: Yes`

---

## 8. Verification & monitoring

### 8.1 First end-to-end test (within 1 hour of MX/SPF/DKIM going live)

Send a test from `founder@zaahi.io` to:

- `mail-tester+abc123@mail-tester.com` (visit the URL it gives you) — target score **≥ 9/10**
- a Gmail you control — open → ⋮ → **Show original** — header must show `SPF: PASS`, `DKIM: 'PASS' with domain zaahi.io`, `DMARC: 'PASS'`
- an Outlook you control — File → Properties — look for `Authentication-Results: spf=pass; dkim=pass; dmarc=pass`

### 8.2 MXToolbox

Open `https://mxtoolbox.com/domain/zaahi.io/` — single-page domain audit. Expected state:

- MX records: 1 row, `smtp.google.com`, no errors
- SPF: PASS, lookups ≤ 10
- DKIM: PASS for `google` selector
- DMARC: present, policy as expected for the current stage
- Blacklist check: 0 listings (across ~80 RBLs)

If any blacklist hits show up after first send: open a ticket with that RBL, request delisting, fix the underlying cause first (almost always: SPF misalignment or compromised key).

### 8.3 Ongoing monitoring

| What | How | Cadence |
|---|---|---|
| DMARC aggregate reports | dmarcian or postmark free analyser, fed by `dmarc@` inbox | Weekly while at `p=reject`, monthly thereafter |
| MXToolbox blacklist | `https://mxtoolbox.com/blacklists.aspx` for `zaahi.io` | Weekly first month, monthly thereafter |
| DKIM expiry / rotation | calendar reminder | Annually |
| Workspace login audit | admin.google.com → Reports → Audit | Weekly skim for unfamiliar IPs |
| 2FA enrolment status | admin.google.com → Security → 2SV report | Monthly |

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `dig MX zaahi.io` returns old `mail.namecheap.com` | Namecheap "Email Forwarding" still on | Switch dropdown to **Custom MX**, re-add Google MX |
| SPF returns multiple records | Stray TXT from a previous setup | Delete the extra TXT(s); merge into a single record |
| DKIM verification fails | DNS TTL not respected, or value truncated by Namecheap UI | Re-paste full value, wait 1h, retest. If truncated, contact Namecheap support — should not happen with current TXT length limits |
| DMARC reports empty | `rua=mailto:` address doesn't exist or rejects | Confirm `dmarc@zaahi.io` alias works (send test) |
| `mail-tester.com` score 7/10 with "no PTR" | rDNS for sending IP not set | This is a Google issue, not yours — for Workspace senders, ignore (Google manages PTR for `smtp.google.com`) |
| Sudden bounce-rate spike after `p=reject` | A legitimate sender wasn't covered by SPF/DKIM | Roll back to `p=quarantine`, identify from `rua` reports, fix sender, re-promote |
| `aspf=r adkim=r` causing third-party tools to fail | They're sending from a deeply nested subdomain | Switch to `aspf=s adkim=s` (strict) only if you have a specific reason — usually relaxed is correct |

---

## 10. Files, ownership, rollback

- Namecheap is the source of truth for DNS; this runbook documents intent
- DKIM private keys never leave Google's infrastructure — only the public half ends up in DNS
- Mailgun keys (when added) live in Vercel env vars, not in this repo
- Update this runbook whenever a new sender is authorised or a DMARC stage changes — `git log` is the audit trail
- **Owner:** Founder. Co-founder has read access to admin.google.com and DNS, not write.

**Switching mail providers (full back-out):**

1. Drop DMARC to `p=none`, wait 24h
2. Point MX at the new provider
3. Leave the old provider's SPF `include:` and `_domainkey` selector in place for 30 days — in-flight mail still verifies against historic headers
4. After 30 days, remove the old `include:` and selector
5. Never delete DKIM selectors immediately — receivers will fail verification on legitimate in-flight mail

Last reviewed: 2026-04-30.
