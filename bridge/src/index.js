// Archie Bridge — poller entrypoint.
//
// Long-polls getUpdates forever. No server, no open port, no webhook: the box
// makes outbound HTTPS calls and nothing else. Run under systemd with
// Restart=on-failure (see archie-bridge.service).

import { config, assertRunnableConfig, allowedChatIds } from "./config.js";
import { log, initLogFile } from "./log.js";
import { getOffset, setOffset } from "./queue.js";
import { createTelegramTransport } from "./telegram.js";
import { createPipeline } from "./pipeline.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  initLogFile();
  assertRunnableConfig();

  log.info(
    `[bridge] starting — ${config.publicChatIds.length} public + ${config.founderChatIds.length} founder ` +
      `chat(s) (${allowedChatIds().length} allowed), rate=${config.maxTasksPerHour}/h, ` +
      `poll=${config.pollTimeoutSec}s, email=${config.email.host ? "on" : "OFF"}`,
  );

  const transport = createTelegramTransport();
  const pipeline = createPipeline({ transport });

  let offset = getOffset();
  let backoffMs = 1000;
  let stopping = false;

  // ── Stale-backlog guard ───────────────────────────────────────────────────
  // Telegram holds unfetched updates for ~24h. A bridge that has been down
  // therefore starts with a queue of decisions taken in a context that no
  // longer exists — and on 2026-08-28 that is exactly what happened: the first
  // poll after enabling the unit drained a backlog of old Approve presses,
  // auto-approved three tasks and launched an unsupervised implementation
  // session, out of the agreed order. Telegram itself rejected the
  // acknowledgements ("query is too old"), which is the tell.
  //
  // Buttons are decisions, and a decision made an hour ago against a plan
  // someone has since re-prioritised is not consent to act now. So by default
  // the poller fast-forwards past anything already queued at startup and says
  // how much it skipped. Nothing is lost: the tasks keep their state and the
  // buttons can be pressed again against the live bridge.
  //
  // ARCHIE_DRAIN_BACKLOG=1 opts back in, for the case where you genuinely do
  // want the queue processed after a restart.
  if (process.env.ARCHIE_DRAIN_BACKLOG === "1") {
    log.warn("[bridge] ARCHIE_DRAIN_BACKLOG=1 — processing the existing backlog");
  } else {
    try {
      const pending = await transport.getUpdates(offset);
      if (pending.length) {
        const maxId = Math.max(...pending.map((u) => u.update_id));
        const messages = pending.filter((u) => u.message).length;
        const callbacks = pending.filter((u) => u.callback_query).length;
        offset = maxId + 1;
        setOffset(offset);
        log.audit(
          `[bridge] skipped ${pending.length} stale update(s) queued while offline ` +
            `(${messages} message(s), ${callbacks} button press(es)). They were NOT acted on. ` +
            `Re-send or re-press anything still wanted. Set ARCHIE_DRAIN_BACKLOG=1 to process instead.`,
        );
      } else {
        log.info("[bridge] no backlog — starting clean");
      }
    } catch (e) {
      log.warn("[bridge] backlog check failed; continuing", String(e));
    }
  }

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      if (stopping) process.exit(1);
      stopping = true;
      log.info(`[bridge] ${sig} — finishing current poll, then exiting`);
    });
  }

  while (!stopping) {
    try {
      const updates = await transport.getUpdates(offset);
      backoffMs = 1000;

      for (const update of updates) {
        // Advance the offset BEFORE handling. A crash mid-handle must not
        // replay the same update forever — the task file is the record of
        // what happened, and re-running triage on a redelivered report would
        // burn tokens on work already done.
        offset = update.update_id + 1;
        setOffset(offset);
        try {
          await pipeline.handleUpdate(update);
        } catch (e) {
          log.error("[bridge] handler threw", String(e?.stack ?? e));
        }
      }
    } catch (e) {
      // Network blips, Telegram 5xx, DNS. Back off, never hot-loop.
      log.warn(`[bridge] poll failed, retrying in ${backoffMs}ms`, String(e));
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 60_000);
    }
  }

  log.info("[bridge] stopped");
  process.exit(0);
}

main().catch((e) => {
  log.error("[bridge] fatal", String(e?.stack ?? e));
  process.exit(1);
});
