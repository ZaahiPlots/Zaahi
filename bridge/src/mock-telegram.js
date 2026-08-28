// Archie Bridge — in-memory Telegram transport for the dry run.
//
// Same interface as telegram.js, so pipeline.js cannot tell the difference. It
// exists so the whole cycle — intake, triage, gate 1, implementation, gates,
// gate 2 — can be exercised end to end with no bot token, no network, and no
// real chat. Scripted updates are handed out one poll at a time; everything the
// bridge sends is captured for the transcript.

export function createMockTransport({ scriptedUpdates = [] } = {}) {
  const queued = [...scriptedUpdates];
  /** Everything the bridge sent, in order — this becomes the DRYRUN transcript. */
  const sent = [];
  let nextMessageId = 1000;

  return {
    name: "mock",
    sent,

    /** Lets the driver inject a button press once it knows the message id. */
    push(update) {
      queued.push(update);
    },

    async getUpdates() {
      // Hand back everything currently queued, then nothing — the driver decides
      // when to inject more. Never blocks, so the dry run finishes promptly.
      const batch = queued.splice(0, queued.length);
      return batch;
    },

    async sendMessage(chatId, text, { buttons } = {}) {
      const message_id = nextMessageId++;
      sent.push({ kind: "message", chatId: String(chatId), text, buttons: buttons ?? null, message_id });
      return { message_id, chat: { id: chatId } };
    },

    async answerCallbackQuery(id, text) {
      sent.push({ kind: "answerCallback", id, text: text ?? null });
      return true;
    },

    async clearButtons(chatId, messageId) {
      sent.push({ kind: "clearButtons", chatId: String(chatId), messageId });
      return true;
    },
  };
}

/** Convenience builders for scripted updates. */
export function mockMessage({ updateId, chatId, messageId, text, from = "tester" }) {
  return {
    update_id: updateId,
    message: {
      message_id: messageId,
      from: { id: Number(chatId), username: from },
      chat: { id: Number(chatId), type: "group" },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}

export function mockCallback({ updateId, chatId, messageId, data, from = "tester" }) {
  return {
    update_id: updateId,
    callback_query: {
      id: `cb-${updateId}`,
      from: { id: Number(chatId), username: from },
      message: { message_id: messageId, chat: { id: Number(chatId) } },
      data,
    },
  };
}
