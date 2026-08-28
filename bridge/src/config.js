// Archie Bridge — configuration.
//
// Everything secret lives in bridge/.env, which is gitignored. bridge/.env.example
// is the committed template. Nothing in this file ever logs a token value.

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const BRIDGE_DIR = resolve(HERE, "..");
export const REPO_DIR = resolve(BRIDGE_DIR, "..");
export const QUEUE_DIR = resolve(BRIDGE_DIR, "queue");
export const STATE_DIR = resolve(BRIDGE_DIR, "state");
export const LOG_DIR = resolve(BRIDGE_DIR, "logs");

/** Minimal .env reader — no dependency, no interpolation, no surprises. */
function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = parseEnvFile(resolve(BRIDGE_DIR, ".env"));
/** process.env wins over the file so systemd/CI can override without editing it. */
const env = (key, fallback) => process.env[key] ?? fileEnv[key] ?? fallback;

/** Comma-separated list → trimmed, de-duplicated, empties dropped. */
function csv(raw) {
  return [...new Set(String(raw ?? "").split(",").map((x) => x.trim()).filter(Boolean))];
}

function intEnv(key, fallback) {
  const raw = env(key);
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    throw new Error(`[config] ${key} must be an integer, got ${JSON.stringify(raw)}`);
  }
  return n;
}

export const config = {
  botToken: env("TELEGRAM_BOT_TOKEN", ""),

  /**
   * PUBLIC channel — untrusted user reports relayed by Archie. Full pipeline:
   * triage → GATE 1 (a human approves the plan) → implement → gates → GATE 2.
   * ALLOWED_CHAT_IDS is accepted as the legacy name for this list.
   */
  publicChatIds: csv(env("PUBLIC_CHAT_ID", "") || env("ALLOWED_CHAT_IDS", "")),

  /**
   * FOUNDER channel — messages here are authorised work requests, so GATE 1 is
   * skipped and triage flows straight into implementation.
   *
   * This raises trust in ONE dimension only: who is allowed to authorise work.
   * It does not lower any other defence. The report body is still fenced as
   * untrusted data, the implementation session still has no git tools, a
   * suspicious classification is still terminal, and GATE 2 still requires a
   * human before anything reaches main. See channelFor().
   */
  founderChatIds: csv(env("FOUNDER_CHAT_ID", "")),

  /** Chat the bot posts plans and results into. Defaults to the first allowed id. */
  notifyChatId: env("NOTIFY_CHAT_ID", "") || null,

  /** Spam brake: at most this many NEW tasks accepted per rolling hour. */
  maxTasksPerHour: intEnv("MAX_TASKS_PER_HOUR", 10),

  /** Long-poll timeout handed to getUpdates (seconds). */
  pollTimeoutSec: intEnv("POLL_TIMEOUT_SEC", 30),

  /** Hard ceilings so a runaway session cannot burn the budget. */
  triageTimeoutMs: intEnv("TRIAGE_TIMEOUT_SEC", 300) * 1000,
  implTimeoutMs: intEnv("IMPL_TIMEOUT_SEC", 1800) * 1000,
  triageMaxTurns: intEnv("TRIAGE_MAX_TURNS", 30),
  implMaxTurns: intEnv("IMPL_MAX_TURNS", 80),

  /** Gate commands, run from the repo root. Overridable for testing. */
  gateCommands: {
    tsc: env("GATE_TSC", "./node_modules/.bin/tsc --noEmit -p tsconfig.json"),
    build: env("GATE_BUILD", "./node_modules/.bin/next build"),
    eslint: env("GATE_ESLINT", "./node_modules/.bin/eslint src/"),
    e2e: env("GATE_E2E", "./node_modules/.bin/playwright test"),
  },
  gateTimeoutMs: intEnv("GATE_TIMEOUT_SEC", 1800) * 1000,

  /** Branch that gate 2 merges into. */
  mainBranch: env("MAIN_BRANCH", "main"),

  claudeBin: env("CLAUDE_BIN", "claude"),

  /** Email hand-off to the CTO. See bridge/src/email.js. */
  email: {
    to: env("CTO_EMAIL", "") || null,
    cc: env("FOUNDER_EMAIL", "") || null,
    from: env("SMTP_FROM", "") || null,
    host: env("SMTP_HOST", "") || null,
    port: intEnv("SMTP_PORT", 587),
    user: env("SMTP_USER", "") || null,
    pass: env("SMTP_PASS", "") || null,
    /** true → implicit TLS (465). false → plain connect then STARTTLS (587). */
    secure: String(env("SMTP_SECURE", "false")).toLowerCase() === "true",
    /**
     * Escape hatch for the offline dry run's mock server ONLY. Honoured just
     * for loopback hosts, so it can never be used to send real mail in clear.
     */
    allowInsecure: String(env("SMTP_ALLOW_INSECURE", "false")).toLowerCase() === "true",
    retries: intEnv("SMTP_RETRIES", 2),
  },
};

/** Union of both channels — this is the allowlist the poller enforces. */
export function allowedChatIds() {
  return [...new Set([...config.publicChatIds, ...config.founderChatIds])];
}

/**
 * Sole classifier of trust. Returns "founder", "public", or null.
 *
 * Founder is checked FIRST and returns immediately, so a chat id can only take
 * the founder path by literally appearing in FOUNDER_CHAT_ID. Everything else
 * that is allowlisted is public; everything else at all is null and is dropped
 * by the caller. There is no third outcome and no default-to-founder branch.
 */
export function channelFor(chatId) {
  const id = String(chatId);
  if (config.founderChatIds.includes(id)) return "founder";
  if (config.publicChatIds.includes(id)) return "public";
  return null;
}

/** Values that must never reach a log line or a Telegram message. */
export function secrets() {
  return [config.botToken, config.email.pass].filter((s) => s && s.length >= 8);
}

export function assertRunnableConfig() {
  const problems = [];
  if (!config.botToken) problems.push("TELEGRAM_BOT_TOKEN is empty");
  if (allowedChatIds().length === 0) {
    problems.push(
      "PUBLIC_CHAT_ID and FOUNDER_CHAT_ID are both empty — the bridge would trust nobody and do nothing",
    );
  }
  // Fail closed on an ambiguous id. If the same chat were in both lists the
  // channel would depend on lookup order, which is exactly the kind of quiet
  // privilege escalation this config must never have.
  const overlap = config.publicChatIds.filter((id) => config.founderChatIds.includes(id));
  if (overlap.length) {
    problems.push(
      `chat id(s) ${overlap.join(", ")} appear in BOTH PUBLIC_CHAT_ID and FOUNDER_CHAT_ID — ` +
        `a chat must belong to exactly one channel`,
    );
  }
  if (config.founderChatIds.length && !config.email.host) {
    problems.push("FOUNDER_CHAT_ID is set but SMTP_HOST is empty — the email hand-off would fail on every task");
  }
  if (config.email.host && !config.email.to) {
    problems.push("SMTP_HOST is set but CTO_EMAIL is empty — there is nobody to send the decision request to");
  }
  if (problems.length) {
    throw new Error(
      `[config] not runnable:\n  - ${problems.join("\n  - ")}\n` +
        `Copy bridge/.env.example to bridge/.env and fill it in (see bridge/README.md).`,
    );
  }
}
