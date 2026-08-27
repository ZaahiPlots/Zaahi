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
   * Allowlist. Every message and every button press is checked against this.
   * Anything else is ignored and logged — see pipeline.js. An empty allowlist
   * means "trust nobody", which is the correct default: a misconfigured bridge
   * must be inert, not open.
   */
  allowedChatIds: (env("ALLOWED_CHAT_IDS", "") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

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
};

/** Values that must never reach a log line or a Telegram message. */
export function secrets() {
  return [config.botToken].filter((s) => s && s.length >= 8);
}

export function assertRunnableConfig() {
  const problems = [];
  if (!config.botToken) problems.push("TELEGRAM_BOT_TOKEN is empty");
  if (config.allowedChatIds.length === 0) {
    problems.push("ALLOWED_CHAT_IDS is empty — the bridge would trust nobody and do nothing");
  }
  if (problems.length) {
    throw new Error(
      `[config] not runnable:\n  - ${problems.join("\n  - ")}\n` +
        `Copy bridge/.env.example to bridge/.env and fill it in (see bridge/README.md).`,
    );
  }
}
