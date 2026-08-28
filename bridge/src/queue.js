// Archie Bridge — task queue on disk.
//
// One JSON file per task in bridge/queue/<id>.json. Flat files rather than a
// database because the bridge must never own state that outlives a `rm -rf`, and
// because a human debugging a stuck task should be able to `cat` it.

import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { QUEUE_DIR, STATE_DIR, config } from "./config.js";
import { log } from "./log.js";

export const STATES = Object.freeze({
  TRIAGING: "triaging",
  AWAITING_PLAN_APPROVAL: "awaiting_plan_approval",
  REJECTED: "rejected",
  DISCUSS: "discuss",
  SUSPICIOUS: "suspicious",
  APPROVED: "approved",
  IMPLEMENTING: "implementing",
  AWAITING_MERGE_APPROVAL: "awaiting_merge_approval",
  MERGED: "merged",
  DISCARDED: "discarded",
  FAILED: "failed",
  /** Branch is good and pushed, but the decision email could not be delivered. */
  EMAIL_FAILED: "email_failed",
});

/** States that still need a human before anything else happens. */
export const TERMINAL = new Set([
  STATES.REJECTED,
  STATES.SUSPICIOUS,
  STATES.MERGED,
  STATES.DISCARDED,
  STATES.FAILED,
]);

function ensureDirs() {
  mkdirSync(QUEUE_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });
}

/** Atomic write — a half-written task file would strand the pipeline. */
function writeJson(path, obj) {
  const tmp = `${path}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  renameSync(tmp, path);
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    log.error(`[queue] corrupt JSON at ${path}`, String(e));
    return fallback;
  }
}

const seenPath = () => resolve(STATE_DIR, "seen.json");
const offsetPath = () => resolve(STATE_DIR, "offset.json");
const ratePath = () => resolve(STATE_DIR, "rate.json");
const pausePath = () => resolve(STATE_DIR, "paused.json");

// ── Telegram update offset (so restarts do not replay history) ──────────────
export function getOffset() {
  ensureDirs();
  return readJson(offsetPath(), { offset: 0 }).offset ?? 0;
}
export function setOffset(offset) {
  ensureDirs();
  writeJson(offsetPath(), { offset });
}

// ── Dedupe ─────────────────────────────────────────────────────────────────
/**
 * Telegram can redeliver an update if the ack is lost, and a user can forward
 * the same message twice. Key on chat+message id, and keep a bounded history.
 */
export function alreadySeen(key) {
  ensureDirs();
  const seen = readJson(seenPath(), { keys: [] });
  return seen.keys.includes(key);
}
export function markSeen(key) {
  ensureDirs();
  const seen = readJson(seenPath(), { keys: [] });
  if (seen.keys.includes(key)) return false;
  seen.keys.push(key);
  if (seen.keys.length > 2000) seen.keys = seen.keys.slice(-2000);
  writeJson(seenPath(), seen);
  return true;
}

// ── Rate limit (rolling hour) ──────────────────────────────────────────────
export function rateLimitCheck(now = Date.now()) {
  ensureDirs();
  const windowMs = 60 * 60 * 1000;
  const rate = readJson(ratePath(), { accepted: [] });
  const recent = rate.accepted.filter((t) => now - t < windowMs);
  if (recent.length >= config.maxTasksPerHour) {
    writeJson(ratePath(), { accepted: recent });
    return { allowed: false, used: recent.length, limit: config.maxTasksPerHour };
  }
  return { allowed: true, used: recent.length, limit: config.maxTasksPerHour };
}
export function rateLimitRecord(now = Date.now()) {
  ensureDirs();
  const windowMs = 60 * 60 * 1000;
  const rate = readJson(ratePath(), { accepted: [] });
  const recent = rate.accepted.filter((t) => now - t < windowMs);
  recent.push(now);
  writeJson(ratePath(), { accepted: recent });
}

// ── Pause / resume ─────────────────────────────────────────────────────────
export function isPaused() {
  ensureDirs();
  return readJson(pausePath(), { paused: false }).paused === true;
}
export function setPaused(paused) {
  ensureDirs();
  writeJson(pausePath(), { paused, at: new Date().toISOString() });
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export function newTaskId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `${stamp}-${randomBytes(3).toString("hex")}`;
}

export function taskPath(id) {
  return resolve(QUEUE_DIR, `${id}.json`);
}

export function createTask({ id, text, source, chatId, channel, messageId, receivedAt }) {
  ensureDirs();
  const task = {
    id,
    state: STATES.TRIAGING,
    source,
    /** "founder" | "public" — decided once, at intake, by config.channelFor(). */
    channel,
    chatId: String(chatId),
    messageId: messageId ?? null,
    receivedAt: receivedAt ?? new Date().toISOString(),
    // Raw, verbatim, never re-interpreted. Everything downstream treats this
    // field as untrusted data.
    text,
    history: [{ at: new Date().toISOString(), state: STATES.TRIAGING, note: "intake" }],
    triage: null,
    branch: null,
    impl: null,
    gates: null,
  };
  writeJson(taskPath(id), task);
  return task;
}

export function loadTask(id) {
  return readJson(taskPath(id), null);
}

export function saveTask(task) {
  writeJson(taskPath(task.id), task);
  return task;
}

export function updateTask(id, patch, note) {
  const task = loadTask(id);
  if (!task) throw new Error(`[queue] no such task: ${id}`);
  Object.assign(task, patch);
  if (patch.state) {
    task.history.push({ at: new Date().toISOString(), state: patch.state, note: note ?? null });
  }
  return saveTask(task);
}

export function listTasks() {
  ensureDirs();
  return readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(resolve(QUEUE_DIR, f), null))
    .filter(Boolean)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** Slug for the branch name — ASCII, short, and never able to escape the path. */
export function slugify(text, max = 32) {
  const s = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return s || "task";
}
