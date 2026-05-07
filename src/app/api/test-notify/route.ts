// ZAAHI Cohort Pilot — Phase C Step 1 — notification smoke endpoint.
//
// POST /api/test-notify
//
// Triple-gated (in order):
//   1. process.env.ENABLE_TEST_NOTIFY === '1'   — else 404 (opaque)
//   2. Method = POST                            — else 405
//   3. getAdminUserId(req) returns truthy       — else 403
//
// On all three passing, dispatches a test email via existing sendEmail
// and a test Telegram message via existing sendTelegramMessage. Both
// helpers silent-skip on missing env vars (per their internal logic;
// they never throw).
//
// The route file may remain in the repo after smoke. The env-flag gate
// keeps it inert in production whenever ENABLE_TEST_NOTIFY is unset.
// Spec reference: docs/specs/phase-1/spec-05-cohort-pilot-v1.md §11.5
// (CORR-4 in v1.1).
//
// Telegram fan-out: spec §11.2 calls for multi-recipient via
// TELEGRAM_ADMIN_CHAT_IDS (comma-separated). This handler reads that
// var first, falls back to the singular TELEGRAM_ADMIN_CHAT_ID for
// backwards-compat. Each chat id is dispatched independently and
// returned in the response payload.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserId } from '@/lib/auth';
import { sendEmail, type SendEmailResult } from '@/lib/email';
import { sendTelegramMessage, type SendTelegramResult } from '@/lib/telegram';

export const runtime = 'nodejs';

interface RequestBody {
  skipEmail?: boolean;
  skipTelegram?: boolean;
  testEmailTo?: string;
}

interface EmailOutcome {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

interface TelegramFanoutResult {
  chatId: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
  messageId?: number;
}

interface ResponseShape {
  email: EmailOutcome | { skipped: true; reason: 'requested' };
  telegram:
    | { ok: boolean; results: TelegramFanoutResult[]; error?: string }
    | { skipped: true; reason: 'requested' }
    | { ok: false; error: 'no_chat_ids_configured' };
  timestamp: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Gate 1: env flag ─────────────────────────────────────────────
  // Always 404 (no body) when off — production-safe even if the route
  // file ships unintended.
  if (process.env.ENABLE_TEST_NOTIFY !== '1') {
    return new NextResponse(null, { status: 404 });
  }

  // ── Gate 2: admin caller ─────────────────────────────────────────
  // getAdminUserId enforces approved=true + (founder email OR
  // User.role === ADMIN). Returns null when not authorised.
  const adminId = await getAdminUserId(req);
  if (!adminId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Parse optional JSON body. Empty body is fine — all fields optional.
  let body: RequestBody = {};
  try {
    const raw = await req.text();
    if (raw && raw.trim() !== '') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        body = parsed as RequestBody;
      }
    }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const timestamp = new Date().toISOString();

  // ── Email channel ────────────────────────────────────────────────
  let email: ResponseShape['email'];
  if (body.skipEmail) {
    email = { skipped: true, reason: 'requested' };
  } else {
    // Recipient resolution:
    //   1. body.testEmailTo (caller override, useful for staging tests)
    //   2. FROM_EMAIL env var (the noreply mailbox; typically deliverable
    //      to the founder if set up as a forwarder)
    //   3. fallback constant
    const to =
      (body.testEmailTo && body.testEmailTo.trim()) ||
      process.env.FROM_EMAIL ||
      'noreply@zaahi.io';
    const result: SendEmailResult = await sendEmail({
      to,
      subject: '[ZAAHI smoke] test-notify endpoint check',
      html:
        `<p>This is a smoke test from <code>/api/test-notify</code> at <code>${timestamp}</code>.</p>` +
        `<p>Triggered by admin <code>${adminId}</code>.</p>` +
        `<p>If you received this, the Resend integration works end-to-end from inside the Next.js app.</p>` +
        `<hr>` +
        `<p style="color:#888;font-size:11px">Notification infrastructure smoke — Cohort Pilot Phase C Step 1.</p>`,
    });
    if ('ok' in result && result.ok) {
      email = { ok: true, id: result.id };
    } else if ('skipped' in result && result.skipped) {
      email = { ok: false, skipped: true, error: 'RESEND_API_KEY missing' };
    } else if ('error' in result) {
      email = { ok: false, error: result.error };
    } else {
      email = { ok: false, error: 'unknown_email_result' };
    }
  }

  // ── Telegram channel ─────────────────────────────────────────────
  let telegram: ResponseShape['telegram'];
  if (body.skipTelegram) {
    telegram = { skipped: true, reason: 'requested' };
  } else {
    const plural = process.env.TELEGRAM_ADMIN_CHAT_IDS;
    const singular = process.env.TELEGRAM_ADMIN_CHAT_ID;
    const chatIds = (plural ?? singular ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (chatIds.length === 0) {
      telegram = { ok: false, error: 'no_chat_ids_configured' };
    } else {
      // Plain text via HTML parse mode — avoids MarkdownV2 escaping
      // pitfalls. Body intentionally contains no HTML special chars
      // (<, >, &) so the HTML parser leaves it untouched.
      const text =
        `ZAAHI smoke test (/api/test-notify)\n` +
        `\n` +
        `Triggered by admin ${adminId.slice(0, 8)}...\n` +
        `Time: ${timestamp}\n` +
        `\n` +
        `If you received this, Telegram bot integration works.`;
      const results = await Promise.all(
        chatIds.map(async (chatId): Promise<TelegramFanoutResult> => {
          const r: SendTelegramResult = await sendTelegramMessage({
            chatId,
            text,
            parseMode: 'HTML',
            disablePreview: true,
          });
          if ('ok' in r && r.ok) {
            return { chatId, ok: true, messageId: r.messageId };
          }
          if ('skipped' in r && r.skipped) {
            return {
              chatId,
              ok: false,
              skipped: true,
              error: 'TELEGRAM_BOT_TOKEN or chat id missing',
            };
          }
          if ('error' in r) {
            return { chatId, ok: false, error: r.error };
          }
          return { chatId, ok: false, error: 'unknown_telegram_result' };
        }),
      );
      const allOk = results.every((r) => r.ok);
      telegram = { ok: allOk, results };
    }
  }

  return NextResponse.json({
    email,
    telegram,
    timestamp,
  } satisfies ResponseShape);
}

export async function GET(): Promise<NextResponse> {
  // Respect the env-flag gate first so unconfigured production
  // instances stay opaque to GET probes too.
  if (process.env.ENABLE_TEST_NOTIFY !== '1') {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(
    { error: 'method_not_allowed', allow: ['POST'] },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
