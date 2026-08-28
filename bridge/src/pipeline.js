// Archie Bridge — the state machine.
//
//   intake → triage → [gate 1: Approve/Reject/Discuss]
//          → implementation → gates → [gate 2: Merge/Discard] → main
//
// Two invariants this file exists to hold:
//   1. Nothing from an un-allowlisted chat is ever acted on. Checked once, at
//      the top of handleUpdate, for both messages and button presses.
//   2. Implementation is serial. One session at a time, queued, so a burst of
//      approvals cannot run concurrent sessions over the same working tree.

import { config, channelFor } from "./config.js";
import { log } from "./log.js";
import {
  STATES,
  createTask,
  loadTask,
  updateTask,
  listTasks,
  newTaskId,
  slugify,
  markSeen,
  alreadySeen,
  rateLimitCheck,
  rateLimitRecord,
  isPaused,
  setPaused,
} from "./queue.js";
import { triagePrompt, triageSystemPrompt, implPrompt, implSystemPrompt } from "./prompts.js";
import { runTriage, runImplementation, extractResultText, extractJsonBlock } from "./claude.js";
import { runGates, summariseGates } from "./gates.js";
import * as git from "./git.js";
import { sendDecisionEmail } from "./email.js";

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const clip = (s, n = 500) => {
  const t = String(s ?? "");
  return t.length > n ? t.slice(0, n) + "…" : t;
};

export function createPipeline({ transport, runners = {} } = {}) {
  // Injectable so the dry run can substitute scripted sessions and gate results
  // without touching the orchestration under test.
  const doTriage = runners.runTriage ?? runTriage;
  const doImpl = runners.runImplementation ?? runImplementation;
  const doGates = runners.runGates ?? runGates;
  const vcs = runners.git ?? git;
  const doEmail = runners.sendDecisionEmail ?? sendDecisionEmail;

  /** Serial implementation lock: a promise chain, never concurrent. */
  let implChain = Promise.resolve();
  let implBusy = false;

  const notifyChat = () =>
    config.notifyChatId ?? config.founderChatIds[0] ?? config.publicChatIds[0];

  async function say(chatId, text, buttons) {
    return transport.sendMessage(chatId, text, buttons ? { buttons } : {});
  }

  // ── Gate 1 ───────────────────────────────────────────────────────────────
  async function postPlan(task) {
    const t = task.triage;
    const suspicious = t.suspicious === true || t.classification === "suspicious";

    if (suspicious) {
      updateTask(task.id, { state: STATES.SUSPICIOUS }, "triage flagged suspicious");
      log.audit(`[security] task ${task.id} flagged suspicious`, t.suspicious_reason);
      await say(
        task.chatId,
        [
          `🚨 <b>Suspicious report — no action taken</b>`,
          `<code>${esc(task.id)}</code>`,
          ``,
          `The report contains text that reads as an instruction to the agent, so it was`,
          `classified as suspicious and <b>nothing was planned or executed</b>.`,
          ``,
          `<b>Flagged fragment:</b> <code>${esc(clip(t.suspicious_reason, 300))}</code>`,
          ``,
          `No buttons are offered. If this is a genuine report, rephrase it and send again.`,
        ].join("\n"),
      );
      return;
    }

    const lines = [
      `📋 <b>Triage complete</b> — <code>${esc(task.id)}</code>`,
      ``,
      `<b>Type:</b> ${esc(t.classification)}   <b>Risk:</b> ${esc(t.risk)}`,
      `<b>Summary:</b> ${esc(clip(t.summary, 400))}`,
      `<b>Area:</b> ${esc(clip(t.likely_area, 200))}`,
      ``,
      `<b>Files:</b>`,
      ...(t.files?.length ? t.files.slice(0, 8).map((f) => `• <code>${esc(f)}</code>`) : ["• (none identified)"]),
      ``,
      `<b>Plan:</b>`,
      ...(t.plan?.length ? t.plan.slice(0, 6).map((s, i) => `${i + 1}. ${esc(clip(s, 200))}`) : ["(none)"]),
      ``,
      `<b>Risk notes:</b> ${esc(clip(t.risk_notes, 300))}`,
      `<b>Triage recommends:</b> ${esc(t.recommend)}`,
    ];

    // ── The one behavioural difference between the channels ─────────────────
    // FOUNDER: the message is itself the authorisation, so GATE 1 is skipped and
    // the plan is posted as an FYI with no buttons. This is a separate branch on
    // task.channel — a value fixed at intake by channelFor() — not a relaxation
    // of the public path, which is untouched below.
    //
    // Note what is NOT skipped: the report was still fenced as untrusted data, a
    // suspicious classification already returned above (terminal on BOTH
    // channels), the session still has no git tools, and GATE 2 still stands
    // between this and main.
    if (task.channel === "founder") {
      // Skipping GATE 1 removes the human who would otherwise notice that a
      // message is not a work request at all. Without this guard a "hello", a
      // question, or spam in the founder chat would spawn a full implementation
      // session against an empty plan — burning the hourly budget and opening a
      // branch for nothing. Only an actionable classification proceeds; anything
      // else is reported and parked for the human to restate.
      const actionable =
        t.recommend === "implement" && ["bug", "feature"].includes(t.classification);

      if (!actionable) {
        lines.push("");
        lines.push(
          `<i>Founder channel — but this is classified <b>${esc(t.classification)}</b> ` +
            `(triage says “${esc(t.recommend)}”), so no implementation was started.</i>`,
        );
        lines.push(`<i>Rephrase it as a concrete change request to queue work.</i>`);
        await say(task.chatId, lines.join("\n"));
        updateTask(task.id, { state: STATES.DISCUSS }, `founder channel — not actionable (${t.classification})`);
        log.audit(`[gate1] SKIPPED but NOT actionable ${task.id}`, t.classification);
        return;
      }

      lines.push("");
      lines.push(`<i>Founder channel — proceeding to implementation without approval.</i>`);
      await say(task.chatId, lines.join("\n"));
      updateTask(task.id, { state: STATES.APPROVED }, "founder channel — gate 1 skipped");
      log.audit(`[gate1] SKIPPED (founder channel) ${task.id}`, task.chatId);
      enqueueImplementation(task.id);
      return;
    }

    const buttons = [
      [
        { text: "✅ Approve", callback_data: `a1:approve:${task.id}` },
        { text: "❌ Reject", callback_data: `a1:reject:${task.id}` },
        { text: "💬 Discuss", callback_data: `a1:discuss:${task.id}` },
      ],
    ];

    const sentMsg = await say(task.chatId, lines.join("\n"), buttons);
    updateTask(
      task.id,
      { state: STATES.AWAITING_PLAN_APPROVAL, gate1MessageId: sentMsg?.message_id ?? null },
      "awaiting gate 1",
    );
  }

  /**
   * Emails the CTO and reports the outcome to chat. Called once a branch is
   * pushed with green gates, and also when a session concludes DO NOT SHIP.
   *
   * A negative recommendation is never suppressed, and a delivery failure never
   * loses it: after the retries in email.js, the full text is posted to chat and
   * the task is marked email_failed.
   */
  async function emailDecision(taskId) {
    const task = loadTask(taskId);
    const res = await doEmail(task);

    if (res.ok) {
      updateTask(taskId, { email: { ok: true, verdict: res.rendered.verdict, at: new Date().toISOString() } });
      await say(
        task.chatId,
        `📧 Decision request emailed to the CTO — <b>${esc(res.rendered.verdict)}</b>`,
      );
      return res;
    }

    log.error(`[email] falling back to chat for ${taskId}`, res.error);
    updateTask(
      taskId,
      { email: { ok: false, error: res.error, verdict: res.rendered.verdict, at: new Date().toISOString() } },
      "email delivery failed — posting full text to chat instead",
    );
    // Post the whole thing so the decision is not lost to a flaky mail server.
    await say(
      task.chatId,
      [
        `⚠️ <b>Could not email the CTO</b> (${esc(clip(res.error, 200))}).`,
        `Full text below so nothing is lost — task marked <code>email_failed</code>.`,
        ``,
        `<b>${esc(res.rendered.subject)}</b>`,
        `<pre>${esc(res.rendered.text)}</pre>`,
      ].join("\n"),
    );
    return res;
  }

  // ── Triage ───────────────────────────────────────────────────────────────
  async function triageTask(taskId) {
    const task = loadTask(taskId);
    if (!task) return;
    log.info(`[pipeline] triaging ${taskId}`);

    const res = await doTriage({
      prompt: triagePrompt({
        taskId: task.id,
        source: task.source,
        receivedAt: task.receivedAt,
        text: task.text,
      }),
      systemPrompt: triageSystemPrompt(),
    });

    if (!res.ok) {
      updateTask(taskId, { state: STATES.FAILED, error: res.error }, "triage failed");
      await say(task.chatId, `⚠️ Triage failed for <code>${esc(taskId)}</code>: ${esc(res.error)}`);
      return;
    }

    const parsed = extractJsonBlock(extractResultText(res.stdout));
    if (!parsed || !parsed.classification) {
      updateTask(taskId, { state: STATES.FAILED, error: "triage returned no usable JSON" }, "triage unparseable");
      await say(task.chatId, `⚠️ Triage for <code>${esc(taskId)}</code> returned no usable result.`);
      return;
    }

    updateTask(taskId, { triage: parsed }, "triage parsed");
    await postPlan(loadTask(taskId));
  }

  // ── Implementation + gates ───────────────────────────────────────────────
  async function implementTask(taskId) {
    const task = loadTask(taskId);
    if (!task) return;

    const branch = `archie/${task.id}-${slugify(task.triage.summary || task.triage.likely_area || "task")}`;
    updateTask(taskId, { state: STATES.IMPLEMENTING, branch }, "implementation started");
    await say(task.chatId, `🔨 Implementing <code>${esc(taskId)}</code> on <code>${esc(branch)}</code>…`);

    const br = await vcs.createBranch(branch);
    if (!br.ok) {
      updateTask(taskId, { state: STATES.FAILED, error: br.err }, "branch creation failed");
      await say(task.chatId, `❌ Could not start <code>${esc(taskId)}</code>: ${esc(br.err)}`);
      return;
    }

    const res = await doImpl({
      prompt: implPrompt({
        taskId: task.id,
        plan: task.triage.plan ?? [],
        summary: task.triage.summary ?? "",
        likelyArea: task.triage.likely_area ?? "",
        files: task.triage.files ?? [],
        text: task.text,
      }),
      systemPrompt: implSystemPrompt(),
    });

    if (!res.ok) {
      await vcs.resetHard();
      await vcs.checkoutMain();
      updateTask(taskId, { state: STATES.FAILED, error: res.error }, "implementation session failed");
      await say(task.chatId, `❌ Implementation failed for <code>${esc(taskId)}</code>: ${esc(res.error)}`);
      return;
    }

    const implJson = extractJsonBlock(extractResultText(res.stdout)) ?? {};
    if (implJson.status === "stopped") {
      await vcs.resetHard();
      await vcs.checkoutMain();
      updateTask(
        taskId,
        {
          state: STATES.FAILED,
          impl: implJson,
          decision: implJson,
          branch: null,
          error: implJson.stopped_reason ?? "session stopped",
        },
        "session stopped deliberately",
      );
      await say(
        task.chatId,
        `🛑 <code>${esc(taskId)}</code> stopped without changes: ${esc(clip(implJson.stopped_reason, 400))}`,
      );
      // A deliberate "this should not ship" is a RESULT, not an error, and it is
      // exactly the case where suppressing the email would be worst. Send it.
      await emailDecision(taskId);
      return;
    }

    const gates = await doGates();
    updateTask(taskId, { impl: implJson, gates }, "gates run");

    if (!gates.ok) {
      await say(
        task.chatId,
        [
          `❌ <b>Gates failed</b> — <code>${esc(taskId)}</code>`,
          summariseGates(gates),
          ``,
          `Failed at <b>${esc(gates.failedAt)}</b>:`,
          `<pre>${esc(clip(gates.results[gates.failedAt]?.tail, 700))}</pre>`,
          ``,
          `Branch <code>${esc(branch)}</code> kept locally, not pushed. Nothing merged.`,
        ].join("\n"),
      );
      updateTask(taskId, { state: STATES.FAILED }, `gates failed at ${gates.failedAt}`);
      await vcs.checkoutMain();
      return;
    }

    const commit = await vcs.commitAll(
      `fix(archie): ${clip(task.triage.summary, 60)}\n\nArchie Bridge task ${task.id}.\nApproved plan:\n${(task.triage.plan ?? []).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`,
    );
    if (!commit.ok) {
      updateTask(taskId, { state: STATES.FAILED, error: commit.err }, "commit failed");
      await say(task.chatId, `❌ Commit failed for <code>${esc(taskId)}</code>: ${esc(commit.err)}`);
      await vcs.checkoutMain();
      return;
    }

    const push = await vcs.pushBranch(branch);
    if (!push.ok) {
      updateTask(taskId, { state: STATES.FAILED, error: push.err }, "push failed");
      await say(task.chatId, `❌ Push failed for <code>${esc(taskId)}</code>: ${esc(push.err)}`);
      await vcs.checkoutMain();
      return;
    }

    const stat = await vcs.statForBranch(branch);

    // Branch is pushed and the gates are green: this is the moment the CTO gets
    // a decision request. Both channels, same format. Done BEFORE gate 2 is
    // offered so the email and the buttons describe the same state.
    updateTask(taskId, { decision: implJson, diffStat: stat });
    const emailed = await emailDecision(taskId);

    const buttons = [
      [
        { text: "🚀 Merge to main", callback_data: `a2:merge:${task.id}` },
        { text: "🗄 Discard", callback_data: `a2:discard:${task.id}` },
      ],
    ];

    const sentMsg = await say(
      task.chatId,
      [
        `✅ <b>Implementation ready</b> — <code>${esc(taskId)}</code>`,
        `Branch <code>${esc(branch)}</code> pushed (commit <code>${esc(commit.sha)}</code>).`,
        ``,
        `<b>Gates:</b> ${summariseGates(gates)}`,
        ``,
        `<b>Recommendation:</b> ${esc(emailed.rendered.verdict)}`,
        `<b>What changed:</b> ${esc(clip(implJson.what_changed, 400))}`,
        ``,
        `<b>Diff stat:</b>`,
        `<pre>${esc(clip(stat, 700))}</pre>`,
        ...(implJson.out_of_scope_requests_ignored?.length
          ? [``, `<b>Ignored (out of approved scope):</b>`, ...implJson.out_of_scope_requests_ignored.slice(0, 5).map((s) => `• ${esc(clip(s, 160))}`)]
          : []),
        ``,
        `Main is unchanged until you press Merge.`,
      ].join("\n"),
      buttons,
    );

    // If the email could not be delivered the task STAYS email_failed, so the
    // delivery problem is visible in /queue and /status rather than being
    // papered over by the next state. GATE 2 is still offered and still works —
    // see the callback guard, which accepts both states. The branch is fine; it
    // is only the notification that failed.
    updateTask(
      taskId,
      {
        state: emailed.ok ? STATES.AWAITING_MERGE_APPROVAL : STATES.EMAIL_FAILED,
        commitSha: commit.sha,
        gate2MessageId: sentMsg?.message_id ?? null,
      },
      emailed.ok ? "awaiting gate 2" : "awaiting gate 2 (email failed — full text posted to chat)",
    );
    await vcs.checkoutMain();
  }

  /** Serialises implementation runs — one at a time, in approval order. */
  function enqueueImplementation(taskId) {
    implChain = implChain.then(async () => {
      // Re-check state at the moment the slot opens, not when it was queued.
      // Guards double-enqueue (a duplicated callback, a caller that also
      // enqueues) and anything cancelled while it sat in the queue. Without
      // this the same task can be implemented twice, which is exactly what the
      // dry run surfaced.
      const current = loadTask(taskId);
      if (!current) {
        log.warn(`[pipeline] task ${taskId} vanished before implementation`);
        return;
      }
      if (current.state !== STATES.APPROVED) {
        log.warn(
          `[pipeline] skipping implementation of ${taskId}: state is ${current.state}, expected ${STATES.APPROVED}`,
        );
        return;
      }
      implBusy = true;
      try {
        await implementTask(taskId);
      } catch (e) {
        log.error(`[pipeline] implementation threw for ${taskId}`, String(e));
        try {
          updateTask(taskId, { state: STATES.FAILED, error: String(e) }, "unhandled error");
        } catch {
          /* task may not exist */
        }
      } finally {
        implBusy = false;
      }
    });
    return implChain;
  }

  // ── Intake ───────────────────────────────────────────────────────────────
  async function handleMessage(msg) {
    const chatId = String(msg.chat?.id);
    const text = (msg.text ?? "").trim();
    if (!text) return;

    // Commands first — they are control, not content.
    if (text.startsWith("/")) return handleCommand(chatId, text);

    if (isPaused()) {
      log.info("[pipeline] paused — intake ignored");
      await say(chatId, `⏸ Bridge is paused. <code>/resume</code> to accept tasks again.`);
      return;
    }

    const key = `${chatId}:${msg.message_id}`;
    if (alreadySeen(key)) {
      log.info(`[pipeline] duplicate message ignored: ${key}`);
      return;
    }
    markSeen(key);

    const rate = rateLimitCheck();
    if (!rate.allowed) {
      log.audit(`[rate-limit] intake refused (${rate.used}/${rate.limit} this hour)`, chatId);
      await say(
        chatId,
        `🚦 Rate limit reached (${rate.limit}/hour). This report was <b>not</b> queued. Try again later.`,
      );
      return;
    }
    rateLimitRecord();

    const id = newTaskId();
    // Channel is decided ONCE, here, from the chat id, and is then immutable on
    // the task file. Nothing downstream re-derives it from message content.
    const channel = channelFor(chatId);
    createTask({
      id,
      text,
      source: `telegram:${chatId}:${msg.from?.username ?? msg.from?.id ?? "unknown"}`,
      chatId,
      channel,
      messageId: msg.message_id,
    });
    log.info(`[pipeline] queued task ${id} on the ${channel} channel`);
    await say(
      chatId,
      `📥 Queued <code>${esc(id)}</code> (${esc(channel)} channel) — triaging…`,
    );
    await triageTask(id);
  }

  async function handleCommand(chatId, text) {
    const [cmd, arg] = text.split(/\s+/, 2);
    switch (cmd) {
      case "/queue": {
        const tasks = listTasks();
        if (!tasks.length) return say(chatId, "Queue is empty.");
        const rows = tasks
          .slice(-20)
          .map(
            (t) =>
              `• <code>${esc(t.id)}</code> [${esc(t.channel ?? "?")}] — ${esc(t.state)}` +
              `${t.branch ? ` (${esc(t.branch)})` : ""}`,
          );
        return say(chatId, [`<b>Queue</b> (${tasks.length} total, showing last ${rows.length})`, ...rows].join("\n"));
      }
      case "/status": {
        if (!arg) return say(chatId, "Usage: <code>/status &lt;id&gt;</code>");
        const t = loadTask(arg.trim());
        if (!t) return say(chatId, `No task <code>${esc(arg.trim())}</code>.`);
        return say(
          chatId,
          [
            `<b>${esc(t.id)}</b> — ${esc(t.state)}`,
            `Channel: ${esc(t.channel ?? "unknown")}`,
            t.email ? `Email: ${t.email.ok ? "sent" : "FAILED"} — ${esc(t.email.verdict ?? "?")}` : null,
            t.branch ? `Branch: <code>${esc(t.branch)}</code>` : null,
            t.triage ? `Type: ${esc(t.triage.classification)} · Risk: ${esc(t.triage.risk)}` : null,
            t.gates ? `Gates: ${summariseGates(t.gates)}` : null,
            t.error ? `Error: ${esc(clip(t.error, 300))}` : null,
            ``,
            `<b>History</b>`,
            ...t.history.map((h) => `• ${esc(h.at)} → ${esc(h.state)}${h.note ? ` (${esc(h.note)})` : ""}`),
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
      case "/pause":
        setPaused(true);
        log.audit("[control] paused", chatId);
        return say(chatId, "⏸ Paused. New reports will be ignored until <code>/resume</code>.");
      case "/resume":
        setPaused(false);
        log.audit("[control] resumed", chatId);
        return say(chatId, "▶️ Resumed.");
      case "/start":
        return say(
          chatId,
          [
            `Archie Bridge is listening.`,
            `<b>This chat id is <code>${esc(chatId)}</code></b>.`,
            `Channel: <b>${esc(channelFor(chatId) ?? "not configured")}</b> — set it in <code>PUBLIC_CHAT_ID</code> or <code>FOUNDER_CHAT_ID</code>.`,
            ``,
            `Send a plain message to file a report. Commands: /queue /status &lt;id&gt; /pause /resume`,
          ].join("\n"),
        );
      default:
        return say(chatId, `Unknown command. Try /queue, /status &lt;id&gt;, /pause, /resume.`);
    }
  }

  // ── Button presses ───────────────────────────────────────────────────────
  async function handleCallback(cb) {
    const chatId = String(cb.message?.chat?.id);
    const data = String(cb.data ?? "");
    const [gate, action, taskId] = data.split(":");
    const task = loadTask(taskId);

    if (!task) {
      await transport.answerCallbackQuery(cb.id, "Task not found.");
      return;
    }

    // Buttons are removed once used, so a decision cannot be replayed.
    await transport.clearButtons(chatId, cb.message.message_id);

    if (gate === "a1") {
      if (task.state !== STATES.AWAITING_PLAN_APPROVAL) {
        await transport.answerCallbackQuery(cb.id, `Already ${task.state}.`);
        return;
      }
      if (action === "approve") {
        updateTask(taskId, { state: STATES.APPROVED }, `approved by ${cb.from?.username ?? cb.from?.id}`);
        log.audit(`[gate1] APPROVED ${taskId}`, String(cb.from?.id));
        await transport.answerCallbackQuery(cb.id, "Approved.");
        await say(chatId, `✅ <code>${esc(taskId)}</code> approved. Queued for implementation.`);
        enqueueImplementation(taskId);
        return;
      }
      if (action === "reject") {
        updateTask(taskId, { state: STATES.REJECTED }, `rejected by ${cb.from?.username ?? cb.from?.id}`);
        log.audit(`[gate1] REJECTED ${taskId}`, String(cb.from?.id));
        await transport.answerCallbackQuery(cb.id, "Rejected.");
        await say(chatId, `❌ <code>${esc(taskId)}</code> rejected. Nothing was changed.`);
        return;
      }
      updateTask(taskId, { state: STATES.DISCUSS }, `discuss by ${cb.from?.username ?? cb.from?.id}`);
      await transport.answerCallbackQuery(cb.id, "Marked for discussion.");
      await say(
        chatId,
        `💬 <code>${esc(taskId)}</code> parked for discussion. Re-send a refined report to open a new task.`,
      );
      return;
    }

    if (gate === "a2") {
      // email_failed is a delivery problem, not a code problem: the branch is
      // pushed and reviewable, so Merge and Discard must both still work.
      if (task.state !== STATES.AWAITING_MERGE_APPROVAL && task.state !== STATES.EMAIL_FAILED) {
        await transport.answerCallbackQuery(cb.id, `Already ${task.state}.`);
        return;
      }
      if (action === "merge") {
        await transport.answerCallbackQuery(cb.id, "Merging…");
        const merge = await vcs.mergeToMain(
          task.branch,
          `Merge branch '${task.branch}'\n\nArchie Bridge task ${task.id}, approved at both gates.`,
        );
        if (!merge.ok) {
          updateTask(taskId, { state: STATES.FAILED, error: merge.err }, "merge failed");
          await say(chatId, `❌ Merge failed for <code>${esc(taskId)}</code>: ${esc(merge.err)}\nBranch is untouched.`);
          return;
        }
        updateTask(taskId, { state: STATES.MERGED, mergeSha: merge.sha }, `merged by ${cb.from?.username ?? cb.from?.id}`);
        log.audit(`[gate2] MERGED ${taskId} → ${config.mainBranch}`, merge.sha);
        await say(
          chatId,
          `🚀 <code>${esc(taskId)}</code> merged to <b>${esc(config.mainBranch)}</b> and pushed (<code>${esc(merge.sha)}</code>).`,
        );
        return;
      }
      // Discard keeps the branch — "discard" is a decision about main, not a delete.
      updateTask(taskId, { state: STATES.DISCARDED }, `discarded by ${cb.from?.username ?? cb.from?.id}`);
      log.audit(`[gate2] DISCARDED ${taskId}`, String(cb.from?.id));
      await transport.answerCallbackQuery(cb.id, "Discarded.");
      await say(
        chatId,
        `🗄 <code>${esc(taskId)}</code> discarded. <b>Branch <code>${esc(task.branch)}</code> is kept</b> for review — nothing was deleted, main is unchanged.`,
      );
    }
  }

  // ── Entry point for one update ───────────────────────────────────────────
  async function handleUpdate(update) {
    const msg = update.message;
    const cb = update.callback_query;
    const chatId = String(msg?.chat?.id ?? cb?.message?.chat?.id ?? "");

    // THE allowlist check. Both content and control paths pass through here, and
    // channelFor() is the only thing that decides trust: "founder", "public", or
    // null. A null is dropped without a reply — replying would confirm the bot
    // exists. There is no path by which an unlisted id becomes either channel.
    const channel = channelFor(chatId);
    if (channel === null) {
      log.audit(
        `[security] ignored update from non-allowlisted chat`,
        JSON.stringify({ chatId, from: msg?.from?.id ?? cb?.from?.id, kind: msg ? "message" : "callback" }),
      );
      return;
    }

    if (msg) return handleMessage(msg);
    if (cb) return handleCallback(cb);
  }

  return {
    handleUpdate,
    triageTask,
    implementTask,
    enqueueImplementation,
    /** Resolves when the serial implementation chain has drained. */
    whenIdle: () => implChain,
    isImplBusy: () => implBusy,
    _notifyChat: notifyChat,
  };
}
