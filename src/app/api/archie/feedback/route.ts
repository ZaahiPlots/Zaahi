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

export const runtime = "nodejs";

const FEEDBACK_CATEGORIES = ["BUG", "IDEA", "COMPLAINT"] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const Body = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  text: z.string().trim().min(3).max(2000),
  context: z.string().trim().max(1000).optional(),
});

// ── In-memory throttle state ──────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const RATE_LIMIT_PER_HOUR = 3;

/** userId → ascending list of send-timestamps within the last hour. */
const rateBuckets = new Map<string, number[]>();
/** `${userId}::${hash(text)}` → timestamp of last identical submission. */
const dedupCache = new Map<string, number>();

function pruneOlderThan(now: number, list: number[], windowMs: number): number[] {
  // Drop entries older than the window. The list is append-only by
  // construction, so the cutoff is monotonic and a simple findIndex is fine.
  const cutoff = now - windowMs;
  let i = 0;
  while (i < list.length && list[i] < cutoff) i++;
  return i === 0 ? list : list.slice(i);
}

function withinRateLimit(userId: string, now: number): boolean {
  const list = pruneOlderThan(now, rateBuckets.get(userId) ?? [], HOUR_MS);
  if (list.length >= RATE_LIMIT_PER_HOUR) {
    rateBuckets.set(userId, list);
    return false;
  }
  list.push(now);
  rateBuckets.set(userId, list);
  return true;
}

function dedupKey(userId: string, text: string): string {
  // Lowercase + collapse whitespace — same paraphrase shouldn't slip
  // through "BROKEN!" vs "broken !" etc.
  const norm = text.trim().toLowerCase().replace(/\s+/g, " ");
  return `${userId}::${norm}`;
}

function isDuplicate(userId: string, text: string, now: number): boolean {
  const key = dedupKey(userId, text);
  const last = dedupCache.get(key);
  if (last && now - last < DAY_MS) return true;
  dedupCache.set(key, now);
  // Lazy GC: drop anything older than 2 days at insert time so the
  // cache doesn't grow unbounded.
  if (dedupCache.size > 1000) {
    const stale = now - 2 * DAY_MS;
    for (const [k, t] of dedupCache) if (t < stale) dedupCache.delete(k);
  }
  return false;
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
  const { category, text, context } = parsed.data;
  const now = Date.now();

  // Dedup before rate-limit so a repeated submit doesn't count against
  // the per-hour quota — the user pressing "send again" is intent, not
  // abuse, but the message itself is noise.
  if (isDuplicate(userId, text, now)) {
    console.log(`[archie/feedback] dedup user=${userId.slice(0, 8)}…`);
    return NextResponse.json({
      ok: true,
      deduped: true,
      message: "I already sent this one earlier — the team has it.",
    });
  }
  if (!withinRateLimit(userId, now)) {
    console.log(`[archie/feedback] rate-limited user=${userId.slice(0, 8)}…`);
    return NextResponse.json(
      {
        ok: false,
        rateLimited: true,
        message: "You've sent a lot of feedback in the last hour — give the team a moment to read it.",
      },
      { status: 429 },
    );
  }

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

  void sendTelegramToAdmins({
    text: html,
    parseMode: "HTML",
    disablePreview: true,
  });

  console.log(
    `[archie/feedback] sent category=${category} user=${userId.slice(0, 8)}… len=${text.length}`,
  );

  return NextResponse.json({
    ok: true,
    category,
    message: "Thanks — I've sent your note to the ZAAHI team. They'll see it on Telegram.",
  });
}
