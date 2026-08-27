// Archie Bridge — email hand-off to the CTO.
//
// This is a DECISION REQUEST, not a changelog. Someone opens it on a phone and
// has to decide ship / don't ship without reading a diff. So: fixed six-section
// structure, plain English, product terms before file names, no diffs inline,
// and a recommendation that is never hedged.
//
// The recommendation may be negative, and a negative result is never suppressed.
// If the implementation session concluded the change should not ship, the email
// still goes out — saying so, with the reasoning. Suppressing that would make
// the channel untrustworthy in exactly the case where it matters most.

import { config } from "./config.js";
import { log } from "./log.js";
import { sendMail } from "./smtp.js";

/** The only three verdicts. Anything else is a bug and is normalised loudly. */
export const VERDICTS = ["SHIP IT", "DO NOT SHIP", "SHIP WITH CAVEATS"];

/**
 * Coerces whatever the session returned into exactly one of the three verdicts.
 * An unrecognised or missing verdict becomes DO NOT SHIP, never a pass: if the
 * agent could not state a clear position, a human should look before shipping.
 */
export function normaliseVerdict(raw) {
  const v = String(raw ?? "").trim().toUpperCase();
  if (VERDICTS.includes(v)) return { verdict: v, coerced: false };
  if (/^SHIP\s*IT$/.test(v)) return { verdict: "SHIP IT", coerced: false };
  if (/DO\s*NOT\s*SHIP|DONT\s*SHIP|DON'T\s*SHIP/.test(v)) return { verdict: "DO NOT SHIP", coerced: false };
  if (/CAVEAT/.test(v)) return { verdict: "SHIP WITH CAVEATS", coerced: false };
  return { verdict: "DO NOT SHIP", coerced: true };
}

function fileList(files, max = 10) {
  const list = (files ?? []).filter(Boolean);
  if (!list.length) return "  (no files changed)";
  const shown = list.slice(0, max).map((f) => `  - ${f}`);
  if (list.length > max) shown.push(`  +${list.length - max} more`);
  return shown.join("\n");
}

function para(text, fallback = "(not provided)") {
  const s = String(text ?? "").trim();
  return s || fallback;
}

/**
 * Renders the email. Pure — no I/O — so the dry run can assert on the exact
 * bytes a human would receive.
 */
export function renderEmail(task) {
  const d = task.decision ?? {};
  const { verdict, coerced } = normaliseVerdict(d.recommendation);
  const branch = task.branch ?? "(no branch — nothing was built)";
  const oneLine = para(d.one_line, task.triage?.summary ?? "change request");

  const subject = `[ZAAHI] Decision needed: ${oneLine}${task.branch ? ` (branch ${task.branch})` : ""}`;

  const lines = [];

  lines.push("1. WHAT WAS ASKED");
  lines.push("");
  lines.push(para(d.what_was_asked, task.triage?.summary));
  lines.push("");
  lines.push(`Source: ${task.channel === "founder" ? "founder channel" : "public channel (user report via Archie)"}`);
  lines.push(`Task: ${task.id}`);
  lines.push("");

  lines.push("2. WHAT I BUILT");
  lines.push("");
  if (d.status === "stopped" || !task.branch) {
    lines.push("Nothing was built. The implementation session stopped before making changes.");
    lines.push("");
    lines.push(para(d.what_i_built, d.stopped_reason));
  } else {
    lines.push(para(d.what_i_built, task.impl?.what_changed));
    lines.push("");
    lines.push("Files changed:");
    lines.push(fileList(d.changed_files ?? task.impl?.changed_files));
  }
  lines.push("");

  lines.push("3. RECOMMENDATION");
  lines.push("");
  lines.push(verdict);
  lines.push("");
  lines.push(para(d.recommendation_reasoning));
  if (coerced) {
    lines.push("");
    lines.push(
      "(The session did not return a recognisable verdict. Defaulted to DO NOT SHIP " +
        "so a human decides rather than a blank field passing for approval.)",
    );
  }
  lines.push("");

  lines.push("4. RISK");
  lines.push("");
  lines.push(para(d.risk, task.triage?.risk_notes));
  const untested = (d.untested ?? []).filter(Boolean);
  if (untested.length) {
    lines.push("");
    lines.push("Untested / deliberately left out:");
    untested.slice(0, 8).forEach((u) => lines.push(`  - ${u}`));
  }
  lines.push("");

  lines.push("5. HOW TO CHECK");
  lines.push("");
  if (task.branch) {
    lines.push(`  git fetch origin && git checkout ${branch}`);
    lines.push("  pnpm install && pnpm build");
    lines.push("  pnpm test:e2e");
    lines.push("");
  }
  lines.push(para(d.how_to_check, "Run the gates above and exercise the area by hand."));
  if (task.gates) {
    lines.push("");
    lines.push(
      "Gates on this branch: " +
        ["tsc", "build", "eslint", "e2e"]
          .map((k) => `${k} ${task.gates.results?.[k]?.ok ? "PASS" : task.gates.results?.[k]?.skipped ? "skipped" : "FAIL"}`)
          .join(", "),
    );
  }
  lines.push("");

  lines.push("6. WHAT HAPPENS IF WE DO NOTHING");
  lines.push("");
  lines.push(para(d.cost_of_inaction));
  lines.push("");

  lines.push("--");
  lines.push("Archie Bridge. Nothing reaches main until a human presses Merge in Telegram.");
  if (task.branch) lines.push(`Branch ${task.branch} is pushed and waiting; discarding it deletes nothing.`);

  return { subject, text: lines.join("\n"), verdict };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends the decision request. Retries twice on failure; the caller is expected
 * to post the rendered text into the founder chat if this still fails, so a
 * negative recommendation can never be lost to a flaky mail server.
 *
 * @param transport injectable for the dry run; defaults to the real SMTP client
 */
export async function sendDecisionEmail(task, { transport } = {}) {
  const send = transport ?? sendMail;
  const rendered = renderEmail(task);

  const to = (config.email.to ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const cc = (config.email.cc ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const from = config.email.from ?? config.email.user ?? "archie-bridge@localhost";

  if (!to.length) {
    return { ok: false, rendered, error: "CTO_EMAIL is not configured" };
  }

  const attempts = Math.max(1, config.email.retries + 1);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await send({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        allowInsecure: config.email.allowInsecure,
        user: config.email.user,
        pass: config.email.pass,
        from,
        to,
        cc,
        subject: rendered.subject,
        text: rendered.text,
      });
      log.info(`[email] sent to ${to.join(", ")} (${rendered.verdict}) for ${task.id}`);
      return { ok: true, rendered, messageId: res?.messageId ?? null, attempts: attempt };
    } catch (e) {
      lastError = String(e?.message ?? e);
      log.warn(`[email] attempt ${attempt}/${attempts} failed for ${task.id}`, lastError);
      if (attempt < attempts) await sleep(2000 * attempt);
    }
  }

  log.error(`[email] giving up after ${attempts} attempts for ${task.id}`, lastError);
  return { ok: false, rendered, error: lastError, attempts };
}
