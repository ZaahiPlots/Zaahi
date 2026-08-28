// Archie Bridge — gate runner.
//
// tsc, next build, eslint, then pnpm test:e2e. All four must pass before a
// branch is offered for merge. They run in order and stop at the first failure,
// because a type error makes the later gates meaningless noise.
//
// Note the build/e2e ordering hazard from CLAUDE.md: never build while a server
// is serving the same .next. The e2e config starts and stops its own server, so
// running build first and e2e second is the safe order.

import { spawn } from "node:child_process";
import { config, REPO_DIR } from "./config.js";
import { log } from "./log.js";

function runCommand(command, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn("bash", ["-lc", command], {
      cwd: REPO_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    });

    let out = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, code: -1, out: `spawn failed: ${err.message}`, ms: Date.now() - started });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: !timedOut && code === 0,
        code: timedOut ? -1 : code,
        out: timedOut ? out + `\n[gate] timed out after ${timeoutMs}ms` : out,
        ms: Date.now() - started,
      });
    });
  });
}

/** Last ~25 lines — enough to explain a failure without flooding the chat. */
export function tailOf(out, lines = 25) {
  return out.trim().split("\n").slice(-lines).join("\n");
}

export async function runGates() {
  const order = [
    ["tsc", config.gateCommands.tsc],
    ["build", config.gateCommands.build],
    ["eslint", config.gateCommands.eslint],
    ["e2e", config.gateCommands.e2e],
  ];

  const results = {};
  for (const [name, command] of order) {
    log.info(`[gates] running ${name}`);
    const r = await runCommand(command, config.gateTimeoutMs);
    results[name] = { ok: r.ok, code: r.code, ms: r.ms, tail: r.ok ? null : tailOf(r.out) };
    log.info(`[gates] ${name} ${r.ok ? "PASS" : "FAIL"} (${r.ms}ms)`);
    if (!r.ok) {
      // Everything after a failure is unreliable; mark the rest as skipped so
      // the chat summary does not imply they passed.
      for (const [later] of order.slice(order.findIndex(([n]) => n === name) + 1)) {
        results[later] = { ok: null, code: null, ms: 0, tail: null, skipped: true };
      }
      return { ok: false, failedAt: name, results };
    }
  }
  return { ok: true, failedAt: null, results };
}

export function summariseGates(gates) {
  const icon = (r) => (r?.skipped ? "⏭" : r?.ok ? "✅" : "❌");
  return ["tsc", "build", "eslint", "e2e"]
    .map((k) => `${icon(gates.results[k])} ${k}`)
    .join("  ");
}
