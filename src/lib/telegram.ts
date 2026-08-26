// ── ZAAHI Telegram wrapper ────────────────────────────────────────────
// Optional integration: if `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ADMIN_CHAT_ID`
// is missing, every call silent-skips (warn-once) and returns
// `{ok: false, skipped: true}`. Never throws.
//
// Uses plain `fetch` against the Telegram Bot HTTP API — no SDK dependency.
//
// Parse mode: default 'MarkdownV2'. Escape helper provided for user-supplied
// strings. Callers that don't want the escaping dance can pass
// parseMode: undefined to send plain text.

import { debugWarn } from "@/lib/debug";

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface SendTelegramArgs {
  chatId?: string | number;
  text: string;
  parseMode?: "MarkdownV2" | "Markdown" | "HTML";
  disablePreview?: boolean;
  inlineKeyboard?: InlineKeyboardButton[][];
}

export type SendTelegramResult =
  | { ok: true; messageId?: number }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

let warnedMissing = false;

/**
 * Escape a plain string for Telegram MarkdownV2.
 *
 * MarkdownV2 reserves: `_*[]()~` \` `>#+-=|{}.!`
 * Inside code blocks different rules apply — this helper is intended for
 * regular body text.
 */
export function escapeMarkdownV2(input: string): string {
  // Order matters: the backslash must come first in the character class
  // so we escape it before we accidentally double-escape another char.
  return input.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Send a message to a Telegram chat. Non-blocking: never throws.
 */
export async function sendTelegramMessage(
  args: SendTelegramArgs,
): Promise<SendTelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const chatId = args.chatId ?? envChatId;

  if (!token || token.trim() === "" || !chatId) {
    if (!warnedMissing) {
      warnedMissing = true;
      debugWarn(
        "[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing — skipping",
      );
    }
    return { ok: false, skipped: true };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  type TgPayload = {
    chat_id: string | number;
    text: string;
    parse_mode?: string;
    disable_web_page_preview?: boolean;
    reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
  };

  const body: TgPayload = {
    chat_id: chatId,
    text: args.text,
    parse_mode: args.parseMode ?? "MarkdownV2",
    disable_web_page_preview: args.disablePreview ?? true,
  };

  if (args.inlineKeyboard && args.inlineKeyboard.length > 0) {
    body.reply_markup = { inline_keyboard: args.inlineKeyboard };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    };
    if (!res.ok || !json.ok) {
      const desc = json.description || `HTTP ${res.status}`;
      console.error("[telegram] API error:", desc);
      return { ok: false, error: desc };
    }
    return { ok: true, messageId: json.result?.message_id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[telegram] send failed:", msg);
    return { ok: false, error: msg };
  }
}

export interface AdminFanoutResult {
  chatId: string;
  ok: boolean;
  messageId?: number;
  skipped?: boolean;
  error?: string;
}

/**
 * Multi-recipient broadcast to all admin chats (per spec §11.2).
 *
 * Reads the comma-separated `TELEGRAM_ADMIN_CHAT_IDS` env first; falls
 * back to the singular `TELEGRAM_ADMIN_CHAT_ID` for backwards-compat.
 * Returns one result per chatId. Empty list when neither env is set.
 *
 * Each chat dispatches independently — one failing recipient doesn't
 * stop the others. Never throws.
 */
export async function sendTelegramToAdmins(
  args: Omit<SendTelegramArgs, "chatId">,
): Promise<AdminFanoutResult[]> {
  const plural = process.env.TELEGRAM_ADMIN_CHAT_IDS;
  const singular = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const chatIds = (plural ?? singular ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (chatIds.length === 0) return [];
  return Promise.all(
    chatIds.map(async (chatId): Promise<AdminFanoutResult> => {
      const r = await sendTelegramMessage({ ...args, chatId });
      if ("ok" in r && r.ok) return { chatId, ok: true, messageId: r.messageId };
      if ("skipped" in r && r.skipped)
        return { chatId, ok: false, skipped: true, error: "token missing" };
      return {
        chatId,
        ok: false,
        error: "error" in r ? r.error : "unknown",
      };
    }),
  );
}
