// ── ZAAHI email wrapper — Resend ───────────────────────────────────────
// Optional integration: if `RESEND_API_KEY` is missing/empty, every call
// silent-skips (warn-once) and returns `{ok: false, skipped: true}`.
// Never throws — email failures must never bubble up to user-facing flows.
//
// Usage:
//   import { sendEmail } from '@/lib/email';
//   await sendEmail({ to: 'x@y.com', subject: '...', html: '...' });
//
// Env:
//   RESEND_API_KEY   — required for the call to actually send.
//   FROM_EMAIL       — optional, default 'noreply@zaahi.io'.

import { Resend } from "resend";

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

let warnedMissing = false;
let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === "") {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn("[email] RESEND_API_KEY missing — skipping");
    }
    return null;
  }
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
}

/**
 * Send a transactional email via Resend.
 *
 * - Missing API key → silent skip, warn once.
 * - API error → logged (no key leak) + `{ok:false, error}`.
 * - Success → `{ok:true, id}`.
 *
 * Never throws.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) return { ok: false, skipped: true };

  const from = args.from || process.env.FROM_EMAIL || "noreply@zaahi.io";

  try {
    const { data, error } = await client.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });

    if (error) {
      // `error` is Resend's structured error — log the name/message only,
      // never the client key.
      const msg =
        (error as { message?: string })?.message ||
        (error as { name?: string })?.name ||
        "unknown";
      console.error("[email] resend returned error:", msg);
      return { ok: false, error: msg };
    }

    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[email] send failed:", msg);
    return { ok: false, error: msg };
  }
}
