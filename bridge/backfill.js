#!/usr/bin/env node
// Archie Bridge — backfill recovered reports from a file.
//
//   ARCHIE_BACKFILL=1 node bridge/backfill.js /path/to/reports.txt [--dry]
//
// Telegram only retains ~24h of unfetched updates, so a chat's older history is
// unrecoverable through the Bot API. This feeds a recovered transcript through
// the SAME intake path a live message takes — pipeline.handleUpdate() — so the
// allowlist, dedupe, rate limit, triage and GATE-1 parking all apply exactly as
// they would have. Nothing here bypasses the pipeline; it only supplies input.
//
// Run it with ARCHIE_BACKFILL=1 so every task parks at GATE 1 for batch review
// instead of auto-implementing on the founder channel.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { config, channelFor } from "./src/config.js";
import { log, initLogFile } from "./src/log.js";
import { markSeen, alreadySeen, listTasks } from "./src/queue.js";
import { createTelegramTransport } from "./src/telegram.js";
import { createPipeline } from "./src/pipeline.js";

const file = process.argv[2];
const DRY = process.argv.includes("--dry");
if (!file) {
  console.error("usage: ARCHIE_BACKFILL=1 node bridge/backfill.js <file> [--dry]");
  process.exit(1);
}

/**
 * Splits an Archie transcript into submissions. Each begins with an emoji
 * header line and ends with the "(via Archie · <ts> UTC)" footer.
 */
export function parseSubmissions(raw) {
  // Tolerant of a mangled header. reports2.txt arrived with its first line
  // truncated to "UG from @dymo" — the emoji and the leading B were lost in
  // transit. An emoji-anchored regex silently skipped that whole submission,
  // which for a recovery path is the worst failure mode available: a dropped
  // report that nobody notices. Anchor on "from @<user>" at end of line and
  // treat whatever precedes it as an optional, possibly-damaged label.
  const HEADER = /^\s*\S{0,3}\s*[A-Za-z]*\s*from\s+@(\S+)\s*$/u;
  const FOOTER = /^\(via Archie · (.+?) UTC\)\s*$/u;
  const out = [];
  let cur = null;
  for (const line of raw.split("\n")) {
    const h = line.match(HEADER);
    if (h) {
      if (cur) out.push(cur);
      cur = { from: h[1], kind: /BUG|UG\b/.test(line) ? "BUG" : line.includes("IDEA") ? "IDEA" : "OTHER", lines: [], ts: null };
      continue;
    }
    if (!cur) continue;
    const f = line.match(FOOTER);
    if (f) {
      cur.ts = f[1];
      out.push(cur);
      cur = null;
      continue;
    }
    cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out.map((s) => ({ ...s, text: s.lines.join("\n").trim() })).filter((s) => s.text.length > 0);
}

/** Token set for near-duplicate detection. */
function tokens(t) {
  return new Set(
    String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2),
  );
}
function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

// Threshold chosen from the measured distribution of this corpus, not guessed.
// Pairwise Jaccard over the 13 recovered submissions produced exactly three
// candidate pairs: 0.875 and 0.769 (the same Part re-sent with a word or a typo
// changed — true duplicates) and 0.526 (Part 1 restated, but the second copy
// ADDS the long-message failure, so it carries new information and must NOT be
// dropped). 0.70 sits in the clear gap between 0.526 and 0.769.
const NEAR_DUP = 0.70;

async function main() {
  initLogFile("backfill.log");

  if (process.env.ARCHIE_BACKFILL !== "1") {
    console.error(
      "REFUSING: set ARCHIE_BACKFILL=1. Without it, founder-channel reports would\n" +
        "auto-implement on ingest — twenty branches before anyone reads the list.",
    );
    process.exit(1);
  }

  const chatId = config.founderChatIds[0] ?? config.publicChatIds[0];
  if (!chatId) {
    console.error("REFUSING: no chat id configured; the allowlist would drop every task.");
    process.exit(1);
  }
  const channel = channelFor(chatId);

  const subs = parseSubmissions(readFileSync(file, "utf8"));
  console.log(`\nparsed ${subs.length} submission(s) from ${file}`);
  console.log(`target chat ${chatId} → ${channel} channel · backfill mode ON (all park at GATE 1)\n`);

  const transport = createTelegramTransport();
  const pipeline = createPipeline({ transport });

  const accepted = [];
  const exactDupes = [];
  const nearDupes = [];

  // Synthetic message ids are derived from the content hash, not from a counter
  // that restarts at a fixed number every run. A fixed counter made the second
  // backfill collide with the first: reports2 got ids 900000-900002, which the
  // pipeline's own chat:message_id dedupe had already seen from reports.txt, so
  // all three reports were silently discarded as duplicates. Hashing means the
  // id is stable for a given report and distinct across different ones — and
  // the pipeline's dedupe then reinforces the content dedupe instead of
  // fighting it.
  const synthMsgId = (h) => 900_000 + (parseInt(h.slice(0, 8), 16) % 9_000_000);

  for (const [i, s] of subs.entries()) {
    const hash = createHash("sha256").update(s.text.replace(/\s+/g, " ").trim()).digest("hex");
    const key = `backfill:${chatId}:${hash}`;
    const label = `#${i + 1} ${s.ts ?? "no-ts"} ${s.kind}`;

    // (a) exact duplicate — the real dedupe store, keyed on content rather than
    // message id, because a recovered transcript has no stable message ids.
    if (alreadySeen(key)) {
      exactDupes.push({ label, why: "identical text already ingested" });
      console.log(`  ⏭  ${label} — exact duplicate, dropped`);
      continue;
    }

    // (b) near duplicate — the same report re-sent with a word changed. Exact
    // hashing cannot see these, and triaging each would burn a session per copy.
    const t = tokens(s.text);
    const near = accepted.find((a) => jaccard(a.tokens, t) >= NEAR_DUP);
    if (near) {
      nearDupes.push({ label, of: near.label, sim: jaccard(near.tokens, t).toFixed(3) });
      console.log(`  ⏭  ${label} — near-duplicate of ${near.label} (similarity ${jaccard(near.tokens, t).toFixed(3)}), dropped`);
      if (!DRY) markSeen(key);
      continue;
    }

    // --dry must not touch the dedupe store. It did, and the consequence was
    // that a dry run "used up" every submission: the next real run saw its own
    // preview as prior ingestion and dropped all three reports as duplicates.
    // A preview that mutates the thing it is previewing is worse than no
    // preview at all.
    if (DRY) {
      accepted.push({ label, tokens: t, text: s.text });
      console.log(`  ✓  ${label} — would ingest (${s.text.length} chars)`);
      continue;
    }

    markSeen(key);
    accepted.push({ label, tokens: t, text: s.text });

    console.log(`  ▶  ${label} — ingesting…`);
    await pipeline.handleUpdate({
      update_id: 800_000 + i,
      message: {
        message_id: synthMsgId(hash),
        from: { id: Number(chatId), username: s.from },
        chat: { id: Number(chatId), type: "private" },
        date: Math.floor(Date.parse(`${s.ts ?? "2026-08-27 00:00"}Z`) / 1000) || Math.floor(Date.now() / 1000),
        text: s.text,
      },
    });
    await pipeline.whenIdle();
  }

  const tasks = listTasks();
  const byState = tasks.reduce((m, t) => ((m[t.state] = (m[t.state] ?? 0) + 1), m), {});

  console.log("\n" + "=".repeat(62));
  console.log(`submissions parsed        ${subs.length}`);
  console.log(`ingested (tasks created)  ${accepted.length}`);
  console.log(`exact duplicates dropped  ${exactDupes.length}`);
  console.log(`near duplicates dropped   ${nearDupes.length}`);
  for (const n of nearDupes) console.log(`    ${n.label} ≈ ${n.of} (${n.sim})`);
  console.log(`\ntasks by state: ${JSON.stringify(byState)}`);
  const suspicious = tasks.filter((t) => t.state === "suspicious");
  console.log(`flagged suspicious        ${suspicious.length}`);
  for (const s of suspicious) console.log(`    ${s.id}: ${s.triage?.suspicious_reason?.slice(0, 100)}`);
  console.log("=".repeat(62) + "\n");
}

main().catch((e) => {
  log.error("[backfill] fatal", String(e?.stack ?? e));
  process.exit(1);
});
