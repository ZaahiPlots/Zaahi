#!/usr/bin/env node
// Archie Bridge — pre-flight check.
//
//   node bridge/setup-check.js
//
// Validates bridge/.env, proves the token works, proves the bot can read
// updates, and prints the resolved channel routing. It NEVER prints the token
// or the SMTP password: every line goes through redact(), and the token is
// additionally reported only as a fingerprint (bot id + a SHA-256 prefix).
//
// Read-only. Sends no message, changes no state, and does not consume the
// update queue (getUpdates is called with offset 0 and timeout 0, so pending
// updates stay pending for the real poller).

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config, allowedChatIds, channelFor, BRIDGE_DIR } from "./src/config.js";
import { redact } from "./src/log.js";

const ok = (m) => console.log(`  ✅ ${redact(m)}`);
const bad = (m) => console.log(`  ❌ ${redact(m)}`);
const warn = (m) => console.log(`  ⚠️  ${redact(m)}`);
const info = (m) => console.log(`     ${redact(m)}`);

let failures = 0;
const fail = (m) => { bad(m); failures++; };

console.log("\nArchie Bridge — setup check\n" + "=".repeat(60));

// ── 1. .env present ────────────────────────────────────────────────────────
console.log("\n1. Configuration file");
const envPath = resolve(BRIDGE_DIR, ".env");
if (!existsSync(envPath)) {
  fail(`bridge/.env not found — copy bridge/.env.example and fill it in`);
  console.log("\nCannot continue without it.\n");
  process.exit(1);
}
ok("bridge/.env present");

// ── 2. Required keys ───────────────────────────────────────────────────────
console.log("\n2. Required settings");
if (config.botToken) {
  // Fingerprint only. The bot id before the colon is not secret (it is public
  // in the bot's username lookup); the secret half is never shown.
  const botId = config.botToken.split(":")[0] ?? "?";
  const fp = createHash("sha256").update(config.botToken).digest("hex").slice(0, 12);
  ok(`TELEGRAM_BOT_TOKEN set — bot id ${botId}, fingerprint sha256:${fp}… (token itself never printed)`);
  if (!/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(config.botToken)) {
    warn("token does not match the usual Telegram shape — check for stray quotes or whitespace");
  }
} else fail("TELEGRAM_BOT_TOKEN is empty");

const pub = config.publicChatIds;
const fnd = config.founderChatIds;
if (!pub.length && !fnd.length) fail("PUBLIC_CHAT_ID and FOUNDER_CHAT_ID are both empty — the bridge would trust nobody");
else ok(`${pub.length} public + ${fnd.length} founder chat id(s) configured`);

const overlap = pub.filter((id) => fnd.includes(id));
if (overlap.length) fail(`chat id(s) in BOTH channels: ${overlap.join(", ")} — the bridge refuses to start`);
else if (pub.length && fnd.length) ok("no chat id appears in both channels");

console.log("\n   Resolved routing:");
for (const id of allowedChatIds()) {
  const ch = channelFor(id);
  info(`${id.padEnd(18)} → ${ch === "founder" ? "FOUNDER (GATE 1 skipped)" : "PUBLIC  (GATE 1 required)"}`);
}
info(`anything else      → ignored and logged`);

// ── 3. Email ───────────────────────────────────────────────────────────────
console.log("\n3. Email hand-off");
if (!config.email.host) warn("SMTP_HOST empty — no decision emails will be sent");
else {
  ok(`SMTP ${config.email.host}:${config.email.port} (${config.email.secure ? "implicit TLS" : "STARTTLS"})`);
  info(`user ${config.email.user ?? "(none)"} · password ${config.email.pass ? "set (never printed)" : "NOT SET"}`);
  if (!config.email.to) fail("CTO_EMAIL is empty — nobody to send the decision request to");
  else ok(`to ${config.email.to}${config.email.cc ? ` · cc ${config.email.cc}` : ""}`);
  if (!config.email.from) warn("SMTP_FROM empty — will fall back to SMTP_USER");
}

// ── 4. Limits ──────────────────────────────────────────────────────────────
console.log("\n4. Limits");
info(`MAX_TASKS_PER_HOUR = ${config.maxTasksPerHour}`);
info(`triage ${config.triageMaxTurns} turns / ${config.triageTimeoutMs / 1000}s · impl ${config.implMaxTurns} turns / ${config.implTimeoutMs / 1000}s`);
info(`gate timeout ${config.gateTimeoutMs / 1000}s per gate · merges into "${config.mainBranch}"`);

// ── 5. Live connectivity ───────────────────────────────────────────────────
console.log("\n5. Telegram connectivity");
if (!config.botToken) {
  fail("skipped — no token");
} else {
  const api = (m, body) =>
    fetch(`https://api.telegram.org/bot${config.botToken}/${m}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(20_000),
    }).then((r) => r.json());

  try {
    const me = await api("getMe");
    if (!me.ok) fail(`getMe rejected: ${me.description}`);
    else {
      ok(`getMe → @${me.result.username} (id ${me.result.id}, "${me.result.first_name}")`);
      info(`can join groups: ${me.result.can_join_groups} · reads all group messages: ${me.result.can_read_all_group_messages}`);
      if (me.result.can_read_all_group_messages === false) {
        warn("privacy mode is ON — in GROUPS the bot only sees commands and replies, not ordinary messages.");
        warn("Fix: BotFather → /setprivacy → Disable, then REMOVE and RE-ADD the bot to the group.");
      }
    }

    const wh = await api("getWebhookInfo");
    if (wh.ok) {
      if (wh.result.url) {
        fail(`a webhook is set (${wh.result.url}) — getUpdates will fail until it is deleted`);
      } else {
        ok("no webhook set — long polling is available");
        info(`pending updates queued right now: ${wh.result.pending_update_count}`);
        if (wh.result.pending_update_count === 0) {
          warn("zero pending updates. Telegram only retains ~24h of unfetched updates,");
          warn("so messages older than that are NOT retrievable via getUpdates — see below.");
        }
      }
    }

    // offset 0 + timeout 0 = peek without consuming.
    const up = await api("getUpdates", { offset: 0, timeout: 0, limit: 100 });
    if (!up.ok) fail(`getUpdates rejected: ${up.description}`);
    else {
      ok(`getUpdates → ${up.result.length} update(s) readable now (queue NOT consumed)`);
      const chats = new Map();
      for (const u of up.result) {
        const c = u.message?.chat ?? u.callback_query?.message?.chat;
        if (c) chats.set(String(c.id), c);
      }
      if (chats.size) {
        console.log("\n   Chats seen in the readable window:");
        for (const [id, c] of chats) {
          const ch = channelFor(id);
          const label = ch ? ch.toUpperCase() : "NOT CONFIGURED — would be ignored";
          info(`${id.padEnd(18)} ${(c.title ?? c.username ?? c.type).slice(0, 28).padEnd(30)} ${label}`);
        }
      }
      const oldest = up.result[0]?.message?.date;
      if (oldest) {
        const ageH = ((Date.now() / 1000 - oldest) / 3600).toFixed(1);
        info(`\n   oldest readable message is ${ageH}h old`);
      }
    }
  } catch (e) {
    fail(`network error talking to Telegram: ${e.message}`);
  }
}

// ── 6. Verdict ─────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(60));
if (failures) {
  console.log(`\n❌ ${failures} problem(s) — the bridge will not run correctly.\n`);
  process.exit(1);
}
console.log("\n✅ Ready. Start in the foreground with:  node bridge/src/index.js\n");
