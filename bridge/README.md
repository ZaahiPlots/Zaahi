# Archie Bridge

Turns platform feedback arriving in Telegram into an approved, reviewed code change.

```
Telegram message
      │
      ▼
  intake ──► dedupe ──► rate limit ──► queue/<id>.json
      │
      ▼
  TRIAGE  (claude -p, --permission-mode plan, READ-ONLY)
      │      classify · locate · draft plan · risk
      ▼
  ┌─ GATE 1 ─────────────────────────────┐
  │  [Approve]  [Reject]  [Discuss]      │   ◄── a human presses this
  └──────────────────────────────────────┘
      │ Approve
      ▼
  IMPLEMENT (claude -p, edits only, no git tools) on archie/<id>-<slug>
      │
      ▼
  GATES: tsc → next build → eslint → playwright e2e   (all four must pass)
      │
      ▼  bridge commits + pushes THE BRANCH ONLY
  ┌─ GATE 2 ─────────────────────────────┐
  │  [Merge to main]  [Discard]          │   ◄── a human presses this
  └──────────────────────────────────────┘
      │ Merge
      ▼
   main (merge commit, pushed)
```

**No public endpoint.** The bridge long-polls `getUpdates`. Nothing listens on this
box; there is no webhook, no open port, no inbound traffic.

---

## Security model

The point of the bridge is that untrusted text ends up near an agent with repository
write access. Four things stand between a hostile message and a bad commit.

### 1. Untrusted text is data, never instructions

The rule in `src/prompts.js` (`UNTRUSTED_INPUT_RULE`) is embedded **verbatim in both
session prompts**, and is also injected at *system* level via `--append-system-prompt`
so it outranks anything in the report body. A report containing "ignore previous
instructions", "run this command", "push to main" and the like must be classified
`suspicious`, acted on in no way, and flagged.

When triage returns `suspicious`, the bridge posts the flag **with no buttons at all** —
there is no control offered that could advance it. Verified live: see `DRYRUN.md`.

### 2. The report cannot break out of its block

Each report is fenced inside a per-task random nonce
(`<<<UNTRUSTED_REPORT_<nonce> … <nonce>_UNTRUSTED_REPORT>>>`), so the text cannot close
its own delimiter and continue as if it were prompt.

### 3. Capability is removed, not just discouraged

Wording is not a control. So:

| Session | Permission mode | Denied |
|---|---|---|
| triage | `plan` (read-only) | `Edit`, `Write`, `NotebookEdit`, plus everything below |
| implementation | `acceptEdits` | every `git` write, `gh`, `curl`, `wget`, `npm`, `pnpm add/remove`, `psql`, `prisma`, `WebFetch`, `WebSearch` |

**The model never runs git.** Branch creation, commit, push and merge are done by
`src/git.js`, in the bridge, after the gates pass and a human has pressed a button. A
session that decided to obey an injected "push to main" would find it has no tool that
can. `src/git.js` additionally refuses any argument matching `--force`.

### 4. Only allowlisted chats are honoured

Every update — message *and* button press — is checked against `ALLOWED_CHAT_IDS` at
the top of `handleUpdate`. Anything else is ignored and written to the audit log, with
no reply at all (replying would confirm the bot exists). An empty allowlist means
"trust nobody": the bridge refuses to start rather than run open.

### Other limits

- **Rate limit** — `MAX_TASKS_PER_HOUR`, enforced *before* any session is spawned, so a
  spam flood is dropped without burning tokens.
- **Serial execution** — one implementation session at a time, in approval order, so a
  burst of approvals cannot run concurrent sessions over one working tree.
- **Dedupe** — on `chat:message_id`, so a redelivered update never re-triages.
- **Single-use buttons** — the keyboard is removed when pressed, and the handler
  re-checks task state, so a decision cannot be replayed.
- **Secrets never surface** — every log line and every outbound message passes through
  `redact()`. The token is never echoed to a log or to Telegram.

---

## Setup

### 1. Create the bot

Talk to [@BotFather](https://t.me/BotFather):

```
/newbot
→ name:     ZAAHI Archie Bridge
→ username: zaahi_archie_bridge_bot
```

BotFather replies with a token like `123456789:AAE…`. That token is a credential.

If the bot will live in a **group**, also send BotFather `/setprivacy` → *Disable*, so
it can see ordinary messages rather than only commands.

### 2. Find the chat id

Add the bot to the chat, then send `/start`. It replies with the id:

```
Archie Bridge is listening.
This chat id is -1001234567890 — put it in ALLOWED_CHAT_IDS.
```

(That reply is the one thing the bridge answers before the allowlist is configured, so
you can bootstrap. Until the id is in `ALLOWED_CHAT_IDS`, nothing else is honoured.)

### 3. Configure

```bash
cd ~/zaahi/bridge
cp .env.example .env
$EDITOR .env          # token, ALLOWED_CHAT_IDS, NOTIFY_CHAT_ID
chmod 600 .env
```

`bridge/.env` is gitignored. Verify before your first commit:

```bash
git check-ignore -v bridge/.env    # must print a match
```

There are **no dependencies to install** — the bridge uses only Node's standard library
and global `fetch`. Node ≥ 20.

### 4. Try it without a token

```bash
node bridge/src/dryrun.js            # prints the transcript
node bridge/src/dryrun.js --write    # regenerates bridge/DRYRUN.md
```

Exits non-zero if the full cycle does not complete, so it is usable as a CI check.

### 5. Install the service

```bash
mkdir -p ~/.config/systemd/user
cp ~/zaahi/bridge/archie-bridge.service ~/.config/systemd/user/
systemctl --user daemon-reload
```

**Start it yourself when you are ready** — this repository's agents do not enable it:

```bash
systemctl --user enable --now archie-bridge
journalctl --user -u archie-bridge -f
```

To keep it running after logout: `loginctl enable-linger zaahi`.

---

## Using it

Send a plain message to the chat. That is a report.

| Command | Effect |
|---|---|
| `/queue` | last 20 tasks with their states |
| `/status <id>` | one task: state, branch, gates, full history |
| `/pause` | stop accepting new reports (buttons still work) |
| `/resume` | accept again |
| `/start` | prints this chat's id |

### Task states

`triaging` → `awaiting_plan_approval` → `approved` → `implementing` →
`awaiting_merge_approval` → `merged`

Off-ramps: `rejected`, `discuss` (gate 1), `discarded` (gate 2), `suspicious`
(injection flagged), `failed` (session error or a gate went red).

**Discard deletes nothing.** The branch stays pushed for review; only `main` is left
alone.

---

## Operating notes

- **Where things are.** Tasks: `bridge/queue/<id>.json` — plain JSON, `cat`-able, one
  file per task, with a full state history. Runtime: `bridge/state/` (Telegram offset,
  dedupe keys, rate window, pause flag). Logs: `bridge/logs/bridge.log` plus journald.
  All are gitignored.
- **A stuck task** can be inspected with `/status <id>` or by reading its JSON. States
  are advanced only by button presses, so a task sitting in `awaiting_*` is waiting for
  a human, not wedged.
- **Gates take real time** — a full `tsc` + `next build` + `eslint` + Playwright run is
  several minutes. `GATE_TIMEOUT_SEC` applies per gate.
- **Do not run `pnpm build` by hand while the bridge is running a gate.** Both write
  `.next`, and the loser serves stale chunks. Same hazard CLAUDE.md flags for
  `pnpm dev`.
- **The bridge never touches the database.** Reads or writes. It runs git and the gate
  commands, nothing else.
- **CLAUDE.md applies to every implementation session** — the implementation system
  prompt says so explicitly, and names the founder-locked invariants (land-use
  categories, 3D opacity literals, manual prices, never delete parcels).

## Layout

```
bridge/
  src/
    index.js          poller loop (entrypoint)
    pipeline.js       state machine, both gates, allowlist
    prompts.js        the two prompts + UNTRUSTED_INPUT_RULE
    claude.js         headless session runner + tool denial
    gates.js          tsc / build / eslint / e2e
    git.js            the only place git runs; refuses --force
    queue.js          task files, dedupe, rate limit, pause
    telegram.js       long-poll transport
    mock-telegram.js  in-memory transport for the dry run
    config.js         .env loading, validation
    log.js            logging with unconditional redaction
    dryrun.js         offline end-to-end exercise
  archie-bridge.service
  .env.example
  DRYRUN.md
```
