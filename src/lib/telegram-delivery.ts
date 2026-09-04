// Was anything actually delivered?
//
// sendTelegramToAdmins fans a message out to every configured admin chat and
// returns one result per chat. Until 2026-09-04 the feedback route discarded
// that array with `void` and told the user "I've sent your note to the ZAAHI
// team" regardless — so every one of these produced the same confirmation:
//
//   • TELEGRAM_ADMIN_CHAT_IDS unset -> empty array, nothing sent, no network
//     call made at all
//   • TELEGRAM_BOT_TOKEN unset      -> every result { skipped: true }
//   • Telegram 4xx/5xx or a network drop -> every result carries an error
//
// Founder report, PART 5, 2026-08-27: "'sent to founders' confirmations can be
// false." A feedback channel that cannot tell you whether it delivered is
// worse than no channel at all: people stop reporting because they believe
// someone is reading, and nobody is.
//
// This lives in its own module rather than inline in the route so the decision
// that governs whether we tell the user the truth is testable without a
// database, a network, or a Next request context.

/** The per-chat shape sendTelegramToAdmins returns. */
export interface AdminFanoutLike {
  chatId: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export interface DeliverySummary {
  /** How many admin chats actually received the message. */
  delivered: number;
  /** How many were attempted. Zero means nothing was even configured. */
  total: number;
  /** True when at least one human can now see the message. */
  anyDelivered: boolean;
  /** True when some, but not all, chats received it. */
  partial: boolean;
  /**
   * Operator-facing reason, for logs. Never shown to a user — it can name
   * configuration and upstream errors.
   */
  reason: string;
}

export function summariseDelivery(results: readonly AdminFanoutLike[]): DeliverySummary {
  const total = results.length;
  const delivered = results.filter((r) => r.ok).length;
  const anyDelivered = delivered > 0;

  let reason: string;
  if (total === 0) {
    reason = "no admin chat configured";
  } else if (delivered === total) {
    reason = "ok";
  } else if (results.every((r) => !r.ok && r.skipped)) {
    reason = "bot token missing";
  } else {
    const failures = results
      .filter((r) => !r.ok)
      .map((r) => `${r.chatId}:${r.skipped ? "skipped" : (r.error ?? "unknown")}`);
    reason = failures.join("; ");
  }

  return {
    delivered,
    total,
    anyDelivered,
    partial: anyDelivered && delivered < total,
    reason,
  };
}
