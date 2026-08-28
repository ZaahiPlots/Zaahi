// Archie Bridge — real Telegram transport.
//
// Long-polling only: getUpdates against api.telegram.org. No webhook, no public
// endpoint, nothing listening on this box. Node 22's global fetch is the only
// HTTP client, so the bridge has zero runtime dependencies.
//
// The token appears in the URL path (that is how the Bot API works), which is
// exactly why every log line goes through redact() and no URL is ever logged.

import { config } from "./config.js";
import { log, redact } from "./log.js";

const API = "https://api.telegram.org";

async function call(method, body, { timeoutMs } = {}) {
  const url = `${API}/bot${config.botToken}/${method}`;
  const ac = new AbortController();
  const timer = timeoutMs ? setTimeout(() => ac.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: ac.signal,
    });
    const json = await res.json();
    if (!json.ok) {
      // json.description can echo request content; redact before it is logged.
      throw new Error(`telegram ${method} failed: ${redact(json.description ?? res.status)}`);
    }
    return json.result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createTelegramTransport() {
  return {
    name: "telegram",

    /** Long-poll. Resolves with an array of updates (possibly empty). */
    async getUpdates(offset) {
      const timeout = config.pollTimeoutSec;
      return call(
        "getUpdates",
        {
          offset,
          timeout,
          // We only care about these two; anything else is dropped server-side
          // so a media flood cannot fill the queue.
          allowed_updates: ["message", "callback_query"],
        },
        // Give the HTTP call headroom over the long-poll window itself.
        { timeoutMs: (timeout + 15) * 1000 },
      );
    },

    async sendMessage(chatId, text, { buttons } = {}) {
      const body = {
        chat_id: chatId,
        text: redact(text),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };
      if (buttons) body.reply_markup = { inline_keyboard: buttons };
      return call("sendMessage", body, { timeoutMs: 30_000 });
    },

    /** Clears the button spinner in the client. */
    async answerCallbackQuery(id, text) {
      try {
        return await call(
          "answerCallbackQuery",
          { callback_query_id: id, text: text ? redact(text) : undefined },
          { timeoutMs: 15_000 },
        );
      } catch (e) {
        // A stale callback id is normal (user pressed twice); never fatal.
        log.warn("[telegram] answerCallbackQuery failed", String(e));
        return null;
      }
    },

    /** Removes the inline keyboard so a decision cannot be double-pressed. */
    async clearButtons(chatId, messageId) {
      try {
        return await call(
          "editMessageReplyMarkup",
          { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } },
          { timeoutMs: 15_000 },
        );
      } catch (e) {
        log.warn("[telegram] clearButtons failed", String(e));
        return null;
      }
    },
  };
}
