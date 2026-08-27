# ZAAHI — secrets audit of the full git history

**Repo:** `ZaahiPlots/Zaahi` — **confirmed PUBLIC** (two independent methods, below)
**Audited:** 2026-08-28 · **Scope:** every object in the repository's object database
**Mode:** READ-ONLY. No history rewrite, no force-push, no deletion, no key rotation.

## Headline

**No live credential was found anywhere in the repository's history.** Every pattern
hit that survived scanning is a placeholder, a documentation template, or a redaction
regex. One valid on-chain address is present in history — a public receiving address,
not a credential (finding L-1).

There is one **coverage limit you should know about before treating this as clean**:
seven secrets could not be tested by literal value because this machine does not hold
them. See [Coverage and its limits](#coverage-and-its-limits).

---

## Method

Three independent passes. A finding had to survive at least two to be reported.

| # | Method | Covers | Independent of |
|---|---|---|---|
| **1** | Format/regex scan of **every blob in the object database** — 4,934 blobs, reachable *and* unreachable, via `git cat-file --batch-all-objects` | any secret whose *shape* is known | knowing the value |
| **2** | Literal-value search of the live secrets from `.env.local`: `git log --all -S<value>` (pickaxe) **and** a separate streaming substring scan of every blob | any secret whose *value* is known, whatever its shape | knowing the format |
| **3** | Shannon-entropy scan (H ≥ 4.2, length ≥ 28) over all blobs, benign contexts filtered | a credential nobody wrote a pattern for | both format and value |

Method 1 covered 4,934 blobs. Method 2 covered 7 live values. Method 3 surfaced 667
distinct high-entropy tokens, all but one of which were file paths and identifiers.

Object database as audited: **1,451 commits · 5,064 blobs · 6,644 trees · 1 tag ·
122 refs · 41 unreachable objects** (9 unreachable blobs, individually inspected).

---

## Findings

| ID | What | File | Commit | Date | Branch | At HEAD? | Type | Live? | Severity |
|---|---|---|---|---|---|---|---|---|---|
| **L-1** | TRON mainnet address `TELiib…N4j7` — Ambassador USDT receiving wallet | `CLAUDE.md`, `docs/architecture/78_G42_MIGRATION_ARCHITECTURE.md` | `5662357` (+4 others) | 2026-04-25 | multiple, incl. historical `main` | **No** — retired by `9c0c845` | Public on-chain address | **Valid** (base58check passes, version byte `0x41` = TRON mainnet) | **LOW — not a credential** |

### L-1 in full

A receiving address is *designed* to be shared; publishing one discloses no ability to
spend. Verified there is no private key, mnemonic, or seed phrase anywhere near it in
any commit. It was removed from `HEAD` when the Ambassador system was retired
(`9c0c845`), but it remains in history, and history is world-readable.

The residual issue is **linkage, not compromise**: the address is now permanently tied
to ZAAHI in a public repo, so anyone can inspect its full transaction history on-chain
and infer volumes and counterparties. That is an opsec/privacy consideration for the
founders, not a rotation item. If that linkage is unwanted, the answer is a fresh
address for future use — not a history rewrite, which would not un-publish anything
already indexed.

---

## Per-category results

Every category from the brief, stated explicitly.

| Category | Result |
|---|---|
| Supabase **anon** key | **NOTHING FOUND** — 0 JWT-shaped hits in any blob; live value absent from history by both literal methods |
| Supabase **service_role** key | **NOTHING FOUND** by format (0 JWT-shaped hits anywhere). ⚠️ Literal value untestable — see coverage limits |
| `DATABASE_URL` / Postgres connection strings | **NOTHING FOUND** — 4 distinct matches, all non-secret: 2 are `sed` **redaction regexes** in ops scripts, 2 are documentation templates (`{project-ref}`, `<PASSWORD>`). Live `DATABASE_URL` and `DIRECT_URL` absent from history by both literal methods |
| Telegram bot tokens | **NOTHING FOUND** — 0 matches for `\d{8,10}:[A-Za-z0-9_-]{35}`. The only token-shaped strings are the documented placeholders `123456789:AAExample…`, `1234567890:ABCDEF…` and `999999:DRYRUN-FAKE-TOKEN-NEVER-REAL` |
| SMTP credentials | **NOTHING FOUND** — 0 `SMTP_PASS`-style assignments with a real value; the only occurrence is `replace-me` in `bridge/.env.example` |
| Vercel / GitHub tokens | **NOTHING FOUND** — 0 `ghp_`/`gho_`/`ghu_`/`ghs_`/`ghr_`/`github_pat_` matches, 0 `VERCEL_TOKEN=` assignments. Live `VERCEL_OIDC_TOKEN` (1,192 chars) absent from history |
| Committed `.env` / `.env.local` / `.env.production` | **NOTHING FOUND** — no secret-bearing env file was **ever** added, on any branch, in 1,451 commits. The single env-shaped path in history is `bridge/.env.example`, the intentional template (placeholders only) |
| Private keys (`BEGIN … PRIVATE KEY`) | **NOTHING FOUND** — 0 matches in any blob, reachable or unreachable |
| Mapbox / MapTiler / other API keys | **NOTHING FOUND** — 0 Mapbox `pk./sk.` tokens, 0 OpenAI `sk-`, 0 Anthropic `sk-ant-`, 0 Resend `re_`, 0 AWS `AKIA`, 0 Slack `xox*`, 0 Stripe `[sr]k_live/test`. The only API-key line is `API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — a variable reference, not a value |
| Unreachable / dangling objects | **NOTHING FOUND** — all 9 unreachable blobs inspected individually; none contains a JWT, connection string, bot token, private key, or `sk-` key |

---

## Coverage and its limits

Read this before treating the audit as a clean bill of health.

`.env.local` on this machine has **seven secrets stored as the literal string
`[REDACTED]`** — verified without disclosing them: all seven are 11 characters with the
identical SHA-256 prefix `3930fb7a` and the character shape `[AAAAAAAAA]`.

> `SUPABASE_SERVICE_ROLE_KEY` · `TELEGRAM_BOT_TOKEN` · `RESEND_API_KEY` ·
> `TELEGRAM_ADMIN_CHAT_IDS` · `ADMIN_NOTIFICATION_EMAIL` · `FROM_EMAIL` ·
> `NEXT_PUBLIC_TILES_BASE_URL`

Their real values live in the Vercel environment, not on this box, so **method 2 could
not test them.** What *does* cover them is method 1: their formats — Supabase JWT,
Telegram `\d{8,10}:…`, Resend `re_…` — were scanned across all 4,934 blobs with **zero
hits**. Method 3 would also have caught them on entropy alone and did not.

So: strong format-level and entropy-level evidence, no value-level confirmation. If you
want that last check, run method 2 on a machine that holds the real values, or paste
them into a local pickaxe — **do not** paste them anywhere networked.

Two further notes on scope:

- **The Supabase anon key is public by design.** `NEXT_PUBLIC_*` variables are inlined
  into the client bundle at build time, so the anon key is readable by anyone loading
  `zaahi.io`. That is how Supabase is meant to work — it is Row Level Security, not the
  key, that protects the data. It is not a leak and needs no rotation. It *does* mean
  RLS correctness is load-bearing.
- **`git log --all --name-only` only sees reachable commits.** The path-based check is
  therefore backed by method 1, which reads the object database directly and does cover
  unreachable objects.

---

## `.gitignore` coverage

Verified with `git check-ignore -v` per path — not by reading the file — with a control
(`src/app/page.tsx` correctly **not** ignored, so a false "everything is ignored" result
is ruled out).

| Path | Ignored? | Rule |
|---|---|---|
| `.env` | ✅ | `.gitignore:45:.env*` |
| `.env.local` | ✅ | `.gitignore:45:.env*` |
| `.env.production` | ✅ | `.gitignore:45:.env*` |
| `.env.development` | ✅ | `.gitignore:45:.env*` |
| `.env.local.backup-x` | ✅ | `.gitignore:45:.env*` |
| **`bridge/.env`** | ✅ | `bridge/.gitignore:2:.env` |
| `bridge/logs/bridge.log` | ✅ | `bridge/.gitignore:12:logs/` |
| `bridge/state/offset.json` | ✅ | `bridge/.gitignore:11:state/` |
| `bridge/queue/*.json` | ✅ | `bridge/.gitignore:10:queue/*.json` |
| `id_rsa` | ❌ **not ignored** | — |
| `secrets.json` | ❌ **not ignored** | — |
| `.npmrc` | ❌ **not ignored** | — |

The three gaps are **hardening, not findings**: none of those files exists in the repo
or its history. `bridge/.env.example` is force-included past the blanket `.env*` rule
and was re-verified un-stageable for a real `bridge/.env`.

---

## Repository exposure

**Public — confirmed twice, by different mechanisms:**

1. Anonymous REST API: `private: false`, `visibility: "public"`.
2. Anonymous `git ls-remote` over HTTPS with credentials disabled
   (`GIT_TERMINAL_PROMPT=0`) returned `HEAD` = `2254758` — i.e. the full history is
   clonable by anyone.

| Surface | State | Exposes |
|---|---|---|
| Code + full history | public | everything above |
| Issues | **enabled**, 0 open | nothing today; anyone can open one |
| Wiki | **enabled** | empty |
| Pages | **enabled**, failing | see Phase 2 |
| Forks / stars | 0 / 0 | no third party holds a copy yet |
| Actions runs | 394, **all** `pages build and deployment` **failures** | run/step names public; **log contents returned HTTP 403 anonymously** |

**On Actions logs — a limit, stated plainly.** The brief asked whether the failing Pages
runs leak echoed env vars. I could not read log *content*: the API returns 403 without a
token, and I have none. What I *can* prove is that they cannot contain repo secrets by
construction: **no workflow file has ever been committed** (0 paths under `.github/` in
1,451 commits), and the API reports the running workflow as
`dynamic/pages/pages-build-deployment` — GitHub's auto-generated Jekyll workflow, created
by the Pages *setting*, not by repo code. That workflow receives only `GITHUB_TOKEN`; it
has no access to repository secrets, and the run fails at *Build with Jekyll*, before any
deploy step. Risk assessed **low by construction, not verified by inspection.** If you
want it verified, open one failed run in the browser while signed in.

---

## Rotation order

**No rotation is required by this audit.** Nothing was found to have leaked.

If you want to rotate anyway — reasonable given the repo is public and was audited only
now — this is the order, most-damaging-if-wrong first:

| # | Credential | Why this position | Blast radius |
|---|---|---|---|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` | bypasses RLS entirely; full read/write on every table | total data compromise |
| 2 | `DATABASE_URL` / `DIRECT_URL` password | direct Postgres, bypasses the API layer | total data compromise |
| 3 | `TELEGRAM_BOT_TOKEN` | with the bridge live, controls a bot that can reach an agent with repo write access | supply-chain into `main` |
| 4 | `SMTP_PASS` | send mail as ZAAHI | phishing in your name |
| 5 | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | metered spend | financial |
| 6 | `RESEND_API_KEY` | transactional mail | phishing in your name |
| 7 | `VERCEL_OIDC_TOKEN` | short-lived, auto-rotates | low |
| — | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **do not rotate** | public by design; rotating changes nothing an attacker can do — audit RLS instead |

Rotate `SUPABASE_SERVICE_ROLE_KEY` and the DB password **together**, and update Vercel
before invalidating the old values, or production drops.

---

## Recommendations (none is remediation; all are yours to action)

1. **Nothing urgent.** No leak, no forced rotation.
2. **Extend `.gitignore`** with `id_rsa*`, `*.pem`, `secrets.json`, `.npmrc`, `.netrc` —
   cheap, closes the three gaps above before they matter.
3. **Add a pre-commit secret scan** (`gitleaks` or `git-secrets`). This audit is a
   snapshot; a hook is continuous. The repo being public makes any future mistake
   immediate and irreversible.
4. **Consider whether the repo needs to be public at all.** It carries the full
   investor package, P&L, competitor analysis, migration architecture, and founder
   decision docs. None of that is a *credential* leak, but all of it is commercially
   sensitive and world-readable today. This is a business decision, flagged not argued.
5. **RLS is the security boundary**, since the anon key is public by design. Worth a
   dedicated review — it is doing the job people assume the key is doing.
6. **L-1**: if the on-chain linkage is unwanted, use a fresh receiving address going
   forward. A history rewrite would not un-publish it.

---

## What was NOT done

Per instruction: no history rewrite, no force-push, no deletion, no key rotation, no
repo settings changed, no GitHub API writes. Read-only throughout. The
`pre-merge-2026-08-26` tag is untouched.
