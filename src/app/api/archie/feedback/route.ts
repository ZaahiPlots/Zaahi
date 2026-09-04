// Archie feedback channel — Wave 3b (2026-06-10).
//
// POST /api/archie/feedback  body: { category, text, context? }
//
// Called by the submit_feedback Archie tool (src/lib/archie-tools.ts).
// Re-uses sendTelegramToAdmins from src/lib/telegram.ts so feedback fans
// out to the same admin chat IDs as registration applications — no new
// transport, no new env vars.
//
// Founder spec (docs/research/archie-top25-2026-06-10.md §Feature B):
//   - Categories: BUG | IDEA | COMPLAINT (only three — the prior research
//     doc proposed six but founder ratified three).
//   - Storage: Telegram-only ship-first. No Prisma Feedback model in this
//     wave (prisma/schema.prisma is founder-gated).
//   - Defence-in-depth against LLM-driven abuse:
//       • Rate limit 3/hour/user (in-memory)
//       • 24h dedup on (userId, lowercased text)
//       • Required non-empty text (≥3 chars, ≤2000)
//
// In-memory state notes:
//   The rate-limit and dedup tables live in module-scope. They reset on
//   every cold start / redeploy — acceptable for the founder's Telegram-
//   only stance. If we move to a Prisma Feedback model later, the
//   per-row createdAt + userId already give us authoritative rate-limit
//   data without this in-memory shim.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUserId } from "@/lib/auth";
import { sendTelegramToAdmins } from "@/lib/telegram";
import { summariseDelivery } from "@/lib/telegram-delivery";
import { debugLog } from "@/lib/debug";

export const runtime = "nodejs";

const FEEDBACK_CATEGORIES = ["BUG", "IDEA", "COMPLAINT"] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const Body = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  text: z.string().trim().min(3).max(2000),
  context: z.string().trim().max(1000).optional(),
  /**
   * Idempotency key, one per USER MESSAGE — see PART 24, 2026-08-27:
   *
   *   "A single message from me, sent once with no retry and no rate-limit
   *    error, produced TWO separate POST calls to /api/archie/feedback, both
   *    returning 200, from one conversational turn."
   *
   * The agent loop re-queries /api/archie after each tool batch, so the model
   * can emit submit_feedback again on a later iteration of the same turn. The
   * text-based dedup below does not catch that, because the model rarely
   * phrases it identically the second time — and a re-worded duplicate is
   * still a duplicate.
   *
   * Optional, so an older client is accepted rather than rejected. It simply
   * falls back to the weaker text dedup.
   */
  submissionId: z.string().trim().min(8).max(64).optional(),
});

// ── Shared throttle state ─────────────────────────────────────────
//
// These three guards — the hourly rate limit, the 24h text dedup and the
// per-message idempotency key — used to be module-scope Maps. On Vercel that
// meant they reset on every cold start AND were invisible to every other
// concurrent lambda, so none of them actually held. The 429s the founder hit
// during QA were instance affinity, not policy (docs/BACKLOG.md §8).
//
// They now live in one Postgres table, reached through the existing Prisma
// client. The decision logic is in src/lib/feedback-throttle.ts, which has no
// database in it and is covered by scripts/feedback-throttle.test.ts; this
// route only wires it up.
import {
  FeedbackThrottle,
  RATE_LIMIT_PER_HOUR,
} from "@/lib/feedback-throttle";
import { prismaThrottleStore } from "@/lib/feedback-throttle-prisma";

const throttle = new FeedbackThrottle(prismaThrottleStore);

/**
 * Housekeeping, run opportunistically rather than on a schedule — there is no
 * cron in this deployment and a table that only grows is a slow leak. Roughly
 * one request in twenty pays for it, and never on the path that matters: it is
 * fired after the response is decided and its failure is swallowed, because a
 * failed sweep must never turn into a failed submission.
 */
function maybeSweep(): void {
  if (Math.random() > 0.05) return;
  void throttle
    .sweep()
    .then((n) => { if (n > 0) debugLog(`[archie/feedback] swept ${n} expired throttle rows`); })
    .catch((e) => console.error("[archie/feedback] throttle sweep failed:", e));
}

// ── HTML escape for Telegram parse_mode=HTML ──────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function emojiFor(category: FeedbackCategory): string {
  switch (category) {
    case "BUG": return "🐛";
    case "IDEA": return "💡";
    case "COMPLAINT": return "📣";
  }
}

// ── Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getApprovedUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }
  const { category, text, context, submissionId } = parsed.data;
  const now = Date.now();

  // One call decides all three guards, against state every instance shares.
  // Order is unchanged: idempotency key first, so a duplicate turn never
  // spends the user's hourly quota; then the text dedup; then the rate limit.
  let decision;
  try {
    decision = await throttle.admit({ userId, text, submissionId });
  } catch (e) {
    // The throttle is now a database call, so it can fail in ways a Map could
    // not. Fail CLOSED: a feedback note is not worth sending if we cannot tell
    // whether it is a duplicate or whether the user is over quota — and the
    // user is told plainly rather than given a false confirmation.
    console.error("[archie/feedback] throttle unavailable:", e);
    return NextResponse.json(
      {
        ok: false,
        message:
          "I couldn't reach the ZAAHI team just now — your note has NOT been sent. " +
          "Please try again in a moment.",
      },
      { status: 503 },
    );
  }

  if (decision.kind === "collapsed") {
    debugLog(`[archie/feedback] collapsed repeat submissionId user=${userId.slice(0, 8)}…`);
    maybeSweep();
    return NextResponse.json({
      ok: true,
      deduped: true,
      collapsedBy: "submissionId",
      message: "Already sent that one — the team has it.",
    });
  }
  if (decision.kind === "deduped") {
    debugLog(`[archie/feedback] dedup user=${userId.slice(0, 8)}…`);
    maybeSweep();
    return NextResponse.json({
      ok: true,
      deduped: true,
      message: "I already sent this one earlier — the team has it.",
    });
  }
  if (decision.kind === "rateLimited") {
    debugLog(`[archie/feedback] rate-limited user=${userId.slice(0, 8)}…`);
    maybeSweep();
    return NextResponse.json(
      {
        ok: false,
        rateLimited: true,
        limitPerHour: RATE_LIMIT_PER_HOUR,
        message:
          "You've sent a lot of feedback in the last hour — give the team a moment to read it.",
      },
      { status: 429 },
    );
  }
  const throttleRowId = decision.rowId;

  // Pull user identity for the Telegram message — best-effort. If the
  // User row is missing (a stale auth session beat /api/users/sync) we
  // still send the feedback, just without nickname/role.
  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      select: { nickname: true, email: true, role: true, name: true },
    })
    .catch(() => null);

  const handle = user?.nickname
    ? `@${user.nickname}`
    : user?.email
      ? user.email
      : `user ${userId.slice(0, 8)}…`;
  const roleLine = user?.role ? `\nRole: ${esc(user.role)}` : "";

  const html =
    `${emojiFor(category)} <b>${esc(category)}</b> from ${esc(handle)}` +
    roleLine +
    (context ? `\nContext: ${esc(context)}` : "") +
    `\n\n${esc(text)}` +
    `\n\n<i>(via Archie · ${new Date(now).toISOString().slice(0, 16).replace("T", " ")} UTC)</i>`;

  // Reported 2026-08-27 (PART 5): "'sent to founders' confirmations can be
  // false". They could. This used to be `void sendTelegramToAdmins(...)` —
  // fire-and-forget — followed unconditionally by "I've sent your note to the
  // ZAAHI team". Every failure mode returned that same sentence:
  //
  //   • TELEGRAM_ADMIN_CHAT_IDS unset  -> chatIds is empty, nothing is sent
  //     at all, and sendTelegramToAdmins returns [] without touching the network
  //   • TELEGRAM_BOT_TOKEN unset       -> every result is { skipped: true }
  //   • Telegram 4xx/5xx, network drop -> every result carries an error
  //
  // A feedback channel that cannot tell you whether it delivered is worse than
  // no channel: the user stops reporting because they believe someone is
  // reading, and nobody is.
  const results = await sendTelegramToAdmins({
    text: html,
    parseMode: "HTML",
    disablePreview: true,
  }).catch((e: unknown) => {
    // sendTelegramToAdmins already catches per-chat; this guards the
    // Promise.all itself so a throw cannot become a false success.
    console.error("[archie/feedback] telegram fan-out threw:", e);
    return [] as Awaited<ReturnType<typeof sendTelegramToAdmins>>;
  });

  const summary = summariseDelivery(results);
  const delivered = summary.delivered;

  if (!summary.anyDelivered) {
    // Nothing reached anyone. Say so, and hand back the throttle state this
    // request consumed so the user can genuinely retry — otherwise the dedup
    // cache would answer their second attempt with "I already sent this one".
    // Give back everything this submission consumed. Without it the retry is
    // answered with "I already sent this one earlier" — the false confirmation
    // twice over — and three failures on our side would lock the user out of
    // the channel entirely.
    await throttle.refund(throttleRowId).catch((e) =>
      console.error("[archie/feedback] refund failed:", e),
    );

    console.error(
      `[archie/feedback] NOT DELIVERED category=${category} user=${userId.slice(0, 8)}… reason=${summary.reason}`,
    );

    return NextResponse.json(
      {
        ok: false,
        delivered: 0,
        category,
        message:
          "I couldn't reach the ZAAHI team just now — your note has NOT been sent. " +
          "Nothing was saved, so please try again in a moment.",
      },
      { status: 502 },
    );
  }

  if (summary.partial) {
    // Partial fan-out: at least one founder has it, so this is a success for
    // the user, but the gap must not be silent on our side.
    console.error(
      `[archie/feedback] partial delivery ${delivered}/${summary.total} — ${summary.reason}`,
    );
  }

  debugLog(
    `[archie/feedback] sent category=${category} user=${userId.slice(0, 8)}… ` +
      `len=${text.length} delivered=${delivered}/${summary.total}`,
  );

  return NextResponse.json({
    ok: true,
    delivered,
    category,
    message: "Thanks — I've sent your note to the ZAAHI team. They'll see it on Telegram.",
  });
}
