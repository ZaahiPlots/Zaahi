// Archie Bridge — every git operation in the pipeline.
//
// Deliberately the only place git runs. The implementation session is denied
// all git tools, so branch creation, commit, push and merge happen here, under
// the bridge's control, after gates pass and a human has pressed the button.
//
// Hard rules encoded below:
//   - never --force / --force-with-lease
//   - main is only written by mergeToMain(), which is only reachable from gate 2
//   - a dirty tree before implementation is a hard stop, never a silent stash

import { spawn } from "node:child_process";
import { REPO_DIR, config } from "./config.js";
import { log } from "./log.js";

function git(args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd: REPO_DIR, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, out, err: e.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, out: out.trim(), err: err.trim() });
    });
  });
}

/** Refuse anything that could rewrite published history. */
function assertSafeArgs(args) {
  const joined = args.join(" ");
  if (/--force|-f\b|--force-with-lease/.test(joined)) {
    throw new Error(`[git] refusing force operation: git ${joined}`);
  }
}

async function safeGit(args, opts) {
  assertSafeArgs(args);
  return git(args, opts);
}

export async function currentBranch() {
  const r = await safeGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  return r.ok ? r.out : null;
}

export async function isClean() {
  const r = await safeGit(["status", "--porcelain"]);
  return r.ok && r.out === "";
}

export async function createBranch(branch) {
  const clean = await isClean();
  if (!clean) {
    return { ok: false, err: "working tree is dirty — refusing to start implementation" };
  }
  const co = await safeGit(["checkout", config.mainBranch]);
  if (!co.ok) return { ok: false, err: `checkout ${config.mainBranch}: ${co.err}` };
  // Fast-forward only: if main has diverged locally, stop rather than guess.
  const pull = await safeGit(["pull", "--ff-only", "origin", config.mainBranch], { timeoutMs: 180_000 });
  if (!pull.ok) log.warn("[git] pull --ff-only failed (continuing on local main)", pull.err);
  const br = await safeGit(["checkout", "-b", branch]);
  if (!br.ok) return { ok: false, err: `checkout -b ${branch}: ${br.err}` };
  return { ok: true };
}

export async function diffStat() {
  const r = await safeGit(["diff", "--stat"]);
  return r.ok ? r.out : "";
}

export async function changedFiles() {
  const r = await safeGit(["diff", "--name-only"]);
  return r.ok && r.out ? r.out.split("\n").filter(Boolean) : [];
}

export async function commitAll(message) {
  const add = await safeGit(["add", "-A"]);
  if (!add.ok) return { ok: false, err: add.err };
  const staged = await safeGit(["diff", "--cached", "--name-only"]);
  if (staged.ok && staged.out === "") {
    return { ok: false, err: "nothing to commit — the session changed no files" };
  }
  const c = await safeGit(["commit", "-m", message]);
  if (!c.ok) return { ok: false, err: c.err || c.out };
  const sha = await safeGit(["rev-parse", "--short", "HEAD"]);
  return { ok: true, sha: sha.ok ? sha.out : null };
}

export async function pushBranch(branch) {
  const r = await safeGit(["push", "-u", "origin", branch], { timeoutMs: 300_000 });
  return r.ok ? { ok: true } : { ok: false, err: r.err || r.out };
}

export async function statForBranch(branch) {
  const r = await safeGit(["diff", "--stat", `${config.mainBranch}...${branch}`]);
  return r.ok ? r.out : "";
}

/**
 * Gate 2 only. Merges the approved branch into main with a merge commit and
 * pushes. No force, no rebase, no squash — matching the repo's existing rules.
 */
export async function mergeToMain(branch, message) {
  const clean = await isClean();
  if (!clean) return { ok: false, err: "working tree is dirty — refusing to merge" };

  const co = await safeGit(["checkout", config.mainBranch]);
  if (!co.ok) return { ok: false, err: `checkout ${config.mainBranch}: ${co.err}` };

  const pull = await safeGit(["pull", "--ff-only", "origin", config.mainBranch], { timeoutMs: 180_000 });
  if (!pull.ok) return { ok: false, err: `pull --ff-only: ${pull.err}` };

  const merge = await safeGit(["merge", "--no-ff", branch, "-m", message]);
  if (!merge.ok) {
    // Leave nothing half-merged behind for the next task to trip over.
    await safeGit(["merge", "--abort"]);
    return { ok: false, err: `merge failed (aborted): ${merge.err || merge.out}` };
  }

  const push = await safeGit(["push", "origin", config.mainBranch], { timeoutMs: 300_000 });
  if (!push.ok) return { ok: false, err: `push: ${push.err || push.out}` };

  const sha = await safeGit(["rev-parse", "--short", "HEAD"]);
  return { ok: true, sha: sha.ok ? sha.out : null };
}

export async function checkoutMain() {
  return safeGit(["checkout", config.mainBranch]);
}

export async function resetHard() {
  // Used only to clean up after a FAILED implementation, on the task branch,
  // never on main.
  return safeGit(["checkout", "--", "."]);
}

export const _internals = { assertSafeArgs };
