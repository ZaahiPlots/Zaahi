// Archie Bridge — poller entrypoint.
//
// Long-polls getUpdates forever. No server, no open port, no webhook: the box
// makes outbound HTTPS calls and nothing else. Run under systemd with
// Restart=on-failure (see archie-bridge.service).

import { config, assertRunnableConfig } from "./config.js";
import { log, initLogFile } from "./log.js";
import { getOffset, setOffset } from "./queue.js";
import { createTelegramTransport } from "./telegram.js";
import { createPipeline } from "./pipeline.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  initLogFile();
  assertRunnableConfig();

  log.info(
    `[bridge] starting — allowlist=${config.allowedChatIds.length} chat(s), ` +
      `rate=${config.maxTasksPerHour}/h, poll=${config.pollTimeoutSec}s`,
  );

  const transport = createTelegramTransport();
  const pipeline = createPipeline({ transport });

  let offset = getOffset();
  let backoffMs = 1000;
  let stopping = false;

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
