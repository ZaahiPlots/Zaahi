// Archie Bridge — headless Claude Code session runner.
//
// Capability, not just wording, is how the untrusted-input rule is enforced:
//
//   triage  → --permission-mode plan  (read-only; cannot edit or write)
//   impl    → --permission-mode acceptEdits, with every git-write, network and
//             package-manager tool explicitly denied.
//
// The bridge performs all git operations itself, after the gates pass. So even
// a session that decided to obey an injected "push to main" has no tool that
// could carry it out.

import { spawn } from "node:child_process";
import { config, REPO_DIR } from "./config.js";
import { log } from "./log.js";

/**
 * Tools denied to the implementation session. Anything that could publish code,
 * reach the network, change dependencies, or touch the database.
 */
const IMPL_DENIED_TOOLS = [
  "Bash(git push:*)",
  "Bash(git commit:*)",
  "Bash(git merge:*)",
  "Bash(git rebase:*)",
  "Bash(git reset:*)",
  "Bash(git checkout:*)",
  "Bash(git branch:*)",
  "Bash(git tag:*)",
  "Bash(git remote:*)",
  "Bash(gh:*)",
  "Bash(curl:*)",
  "Bash(wget:*)",
  "Bash(npm:*)",
  "Bash(pnpm add:*)",
  "Bash(pnpm remove:*)",
  "Bash(psql:*)",
  "Bash(prisma:*)",
  "Bash(npx prisma:*)",
  "WebFetch",
  "WebSearch",
];

const TRIAGE_DENIED_TOOLS = [...IMPL_DENIED_TOOLS, "Edit", "Write", "NotebookEdit"];

function runClaude({ prompt, systemPrompt, permissionMode, maxTurns, timeoutMs, deniedTools, label }) {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--permission-mode",
    permissionMode,
    "--max-turns",
    String(maxTurns),
    "--append-system-prompt",
    systemPrompt,
    "--disallowedTools",
    ...deniedTools,
  ];

  return new Promise((resolve) => {
    const started = Date.now();
    log.info(`[claude] ${label} starting (mode=${permissionMode}, maxTurns=${maxTurns})`);

    const child = spawn(config.claudeBin, args, {
      cwd: REPO_DIR,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `spawn failed: ${err.message}`, stdout, stderr, ms: Date.now() - started });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const ms = Date.now() - started;
      if (timedOut) {
        resolve({ ok: false, error: `timed out after ${timeoutMs}ms`, stdout, stderr, ms });
        return;
      }
      if (code !== 0) {
        // The CLI still emits its JSON envelope on failure. Surfacing subtype
        // turns a useless "exited 1" in the chat into "hit the turn limit",
        // which tells the operator whether to raise a cap or fix a prompt.
        resolve({ ok: false, error: describeFailure(code, stdout), stdout, stderr, ms });
        return;
      }
      resolve({ ok: true, stdout, stderr, ms });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Turns the CLI's failure envelope into something an operator can act on. */
export function describeFailure(code, stdout) {
  try {
    const j = JSON.parse(stdout);
    const subtype = j.subtype ?? null;
    const errs = Array.isArray(j.errors) && j.errors.length ? `: ${j.errors.join("; ")}` : "";
    if (subtype === "error_max_turns") {
      return `session hit the turn limit${errs} — raise TRIAGE_MAX_TURNS / IMPL_MAX_TURNS or narrow the plan`;
    }
    if (subtype) return `session failed (${subtype})${errs}`;
  } catch {
    /* not JSON — fall through */
  }
  return `exited ${code}`;
}

/** Pulls the assistant's final text out of `--output-format json`. */
export function extractResultText(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    if (typeof parsed.result === "string") return parsed.result;
    if (typeof parsed.text === "string") return parsed.text;
    return stdout;
  } catch {
    return stdout;
  }
}

/**
 * Finds the last fenced ```json block. Last, not first, because a session may
 * quote an example earlier in its answer; the contract block is always final.
 */
export function extractJsonBlock(text) {
  const fences = [...text.matchAll(/```json\s*\n([\s\S]*?)```/g)];
  const candidate = fences.length ? fences[fences.length - 1][1] : null;
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* fall through to the bare-object attempt */
    }
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export async function runTriage({ prompt, systemPrompt }) {
  return runClaude({
    prompt,
    systemPrompt,
    permissionMode: "plan",
    maxTurns: config.triageMaxTurns,
    timeoutMs: config.triageTimeoutMs,
    deniedTools: TRIAGE_DENIED_TOOLS,
    label: "triage",
  });
}

export async function runImplementation({ prompt, systemPrompt }) {
  return runClaude({
    prompt,
    systemPrompt,
    permissionMode: "acceptEdits",
    maxTurns: config.implMaxTurns,
    timeoutMs: config.implTimeoutMs,
    deniedTools: IMPL_DENIED_TOOLS,
    label: "implementation",
  });
}

export const _internals = { IMPL_DENIED_TOOLS, TRIAGE_DENIED_TOOLS };
