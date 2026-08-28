// Archie Bridge — logging with unconditional secret redaction.
//
// Every log line and every outbound Telegram message passes through redact().
// The bot token is the obvious case, but the same guard covers anything added
// to config.secrets() later. A token in a log file is a leaked token.

import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { LOG_DIR, secrets } from "./config.js";

let logFile = null;

export function initLogFile(name = "bridge.log") {
  mkdirSync(LOG_DIR, { recursive: true });
  logFile = resolve(LOG_DIR, name);
}

export function redact(input) {
  let s = typeof input === "string" ? input : JSON.stringify(input);
  if (s === undefined) return "undefined";
  for (const secret of secrets()) {
    // Also catch the "<id>:<hash>" bot-token shape even if only the hash half
    // appears, and any URL that embeds the token.
    s = s.split(secret).join("«REDACTED»");
    const half = secret.includes(":") ? secret.split(":")[1] : null;
    if (half && half.length >= 8) s = s.split(half).join("«REDACTED»");
  }
  // Belt and braces: any bot<digits>:<token> pattern that slipped through.
  return s.replace(/bot\d{6,}:[A-Za-z0-9_-]{20,}/g, "bot«REDACTED»");
}

function write(level, msg, extra) {
  const line =
    `${new Date().toISOString()} ${level.padEnd(5)} ${redact(msg)}` +
    (extra === undefined ? "" : ` ${redact(extra)}`);
  if (level === "ERROR") console.error(line);
  else console.log(line);
  if (logFile) {
    try {
      appendFileSync(logFile, line + "\n");
    } catch {
      /* logging must never take the process down */
    }
  }
}

export const log = {
  info: (msg, extra) => write("INFO", msg, extra),
  warn: (msg, extra) => write("WARN", msg, extra),
  error: (msg, extra) => write("ERROR", msg, extra),
  /** Security-relevant events: rejected senders, suspicious reports, rate limits. */
  audit: (msg, extra) => write("AUDIT", msg, extra),
};
