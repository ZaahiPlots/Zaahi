// Archie Bridge — minimal SMTP client, zero dependencies.
//
// Node's `net` and `tls` are enough for the one thing the bridge needs: send a
// single plain-text message to a couple of recipients over an authenticated,
// encrypted connection. Nodemailer would work too, but this is ~200 lines and
// keeps the bridge's dependency count at zero, which was the stated preference.
//
// Supports the two deployment shapes that actually occur:
//   SMTP_SECURE=true   → implicit TLS from the first byte (port 465)
//   SMTP_SECURE=false  → plain connect, EHLO, STARTTLS upgrade (port 587)
//
// AUTH PLAIN is preferred, AUTH LOGIN is the fallback; whichever the server
// advertises. Credentials are only ever written to the socket — never returned,
// never logged, and log.js redacts SMTP_PASS from every line regardless.

import net from "node:net";
import tls from "node:tls";
import { randomBytes } from "node:crypto";

const CRLF = "\r\n";

class SmtpError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "SmtpError";
    this.code = code ?? null;
  }
}

/** Wraps a socket in a promise-based read/write of SMTP replies. */
function conversation(socket) {
  let buffer = "";
  const waiters = [];

  socket.setEncoding("utf8");
  socket.on("data", (chunk) => {
    buffer += chunk;
    // An SMTP reply ends with "NNN <text>CRLF"; continuation lines use "NNN-".
    for (;;) {
      const match = buffer.match(/^(?:\d{3}-[^\r\n]*\r\n)*(\d{3}) ([^\r\n]*)\r\n/);
      if (!match) break;
      const raw = buffer.slice(0, match[0].length);
      buffer = buffer.slice(match[0].length);
      const reply = { code: Number(match[1]), text: raw.trim() };
      const w = waiters.shift();
      if (w) w.resolve(reply);
    }
  });

  const fail = (err) => {
    while (waiters.length) waiters.shift().reject(err);
  };
  socket.on("error", fail);
  socket.on("close", () => fail(new SmtpError("connection closed by server")));

  return {
    read: () => new Promise((resolve, reject) => waiters.push({ resolve, reject })),
    write: (line) => socket.write(line + CRLF),
    writeRaw: (data) => socket.write(data),
  };
}

function withTimeout(promise, ms, what) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new SmtpError(`timed out waiting for ${what}`)), ms);
    }),
  ]);
}

function expect(reply, ok, what) {
  const codes = Array.isArray(ok) ? ok : [ok];
  if (!codes.includes(reply.code)) {
    throw new SmtpError(`${what} failed: ${reply.text}`, reply.code);
  }
  return reply;
}

const isLoopback = (host) =>
  ["127.0.0.1", "::1", "localhost"].includes(String(host).toLowerCase());

/**
 * Sends one message. Resolves on a 250 after the final dot; throws otherwise.
 *
 * @param {object} opts
 * @param {string}   opts.host
 * @param {number}   opts.port
 * @param {boolean}  opts.secure       implicit TLS
 * @param {boolean}  opts.allowInsecure  skip STARTTLS — loopback only
 * @param {string=}  opts.user
 * @param {string=}  opts.pass
 * @param {string}   opts.from
 * @param {string[]} opts.to
 * @param {string[]} opts.cc
 * @param {string}   opts.subject
 * @param {string}   opts.text
 */
export async function sendMail(opts) {
  const {
    host,
    port,
    secure = false,
    allowInsecure = false,
    user,
    pass,
    from,
    to = [],
    cc = [],
    subject,
    text,
    timeoutMs = 30_000,
  } = opts;

  if (!host) throw new SmtpError("SMTP host is not configured");
  if (!from) throw new SmtpError("SMTP from address is not configured");
  if (!to.length) throw new SmtpError("no recipients");

  // Refuse to send unencrypted anywhere but loopback, whatever the config says.
  const insecureOk = allowInsecure && isLoopback(host);
  if (allowInsecure && !insecureOk) {
    throw new SmtpError(
      `SMTP_ALLOW_INSECURE is set but host ${host} is not loopback — refusing to send credentials in clear`,
    );
  }

  let socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  await withTimeout(
    new Promise((resolve, reject) => {
      socket.once(secure ? "secureConnect" : "connect", resolve);
      socket.once("error", reject);
    }),
    timeoutMs,
    "connection",
  );

  let c = conversation(socket);
  const ehloName = "archie-bridge.local";

  try {
    expect(await withTimeout(c.read(), timeoutMs, "greeting"), 220, "greeting");

    c.write(`EHLO ${ehloName}`);
    let ehlo = expect(await withTimeout(c.read(), timeoutMs, "EHLO"), 250, "EHLO");

    // ── STARTTLS upgrade ────────────────────────────────────────────────────
    if (!secure && !insecureOk) {
      if (!/STARTTLS/i.test(ehlo.text)) {
        throw new SmtpError("server does not advertise STARTTLS and SMTP_SECURE is false");
      }
      c.write("STARTTLS");
      expect(await withTimeout(c.read(), timeoutMs, "STARTTLS"), 220, "STARTTLS");

      const plain = socket;
      plain.removeAllListeners("data");
      plain.removeAllListeners("error");
      plain.removeAllListeners("close");

      socket = tls.connect({ socket: plain, host, servername: host });
      await withTimeout(
        new Promise((resolve, reject) => {
          socket.once("secureConnect", resolve);
          socket.once("error", reject);
        }),
        timeoutMs,
        "TLS handshake",
      );
      c = conversation(socket);

      c.write(`EHLO ${ehloName}`);
      ehlo = expect(await withTimeout(c.read(), timeoutMs, "EHLO after STARTTLS"), 250, "EHLO");
    }

    // ── AUTH ────────────────────────────────────────────────────────────────
    if (user && pass) {
      if (/AUTH[^\r\n]*PLAIN/i.test(ehlo.text)) {
        const token = Buffer.from(`\0${user}\0${pass}`, "utf8").toString("base64");
        c.write(`AUTH PLAIN ${token}`);
        expect(await withTimeout(c.read(), timeoutMs, "AUTH PLAIN"), 235, "AUTH");
      } else if (/AUTH[^\r\n]*LOGIN/i.test(ehlo.text)) {
        c.write("AUTH LOGIN");
        expect(await withTimeout(c.read(), timeoutMs, "AUTH LOGIN"), 334, "AUTH");
        c.write(Buffer.from(user, "utf8").toString("base64"));
        expect(await withTimeout(c.read(), timeoutMs, "AUTH username"), 334, "AUTH username");
        c.write(Buffer.from(pass, "utf8").toString("base64"));
        expect(await withTimeout(c.read(), timeoutMs, "AUTH password"), 235, "AUTH");
      } else {
        throw new SmtpError("credentials configured but server advertises no supported AUTH mechanism");
      }
    }

    // ── Envelope ────────────────────────────────────────────────────────────
    c.write(`MAIL FROM:<${from}>`);
    expect(await withTimeout(c.read(), timeoutMs, "MAIL FROM"), 250, "MAIL FROM");

    for (const rcpt of [...to, ...cc]) {
      c.write(`RCPT TO:<${rcpt}>`);
      expect(await withTimeout(c.read(), timeoutMs, "RCPT TO"), [250, 251], `RCPT TO ${rcpt}`);
    }

    // ── Body ────────────────────────────────────────────────────────────────
    c.write("DATA");
    expect(await withTimeout(c.read(), timeoutMs, "DATA"), 354, "DATA");

    const messageId = `<${randomBytes(12).toString("hex")}@archie-bridge>`;
    const headers = [
      `From: ${from}`,
      `To: ${to.join(", ")}`,
      ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
      `Subject: ${encodeHeader(subject)}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "X-Archie-Bridge: 1",
    ].join(CRLF);

    // Dot-stuffing: a line that is just "." would end DATA early.
    const body = String(text).replace(/\r?\n/g, CRLF).replace(/^\./gm, "..");
    c.writeRaw(headers + CRLF + CRLF + body + CRLF + "." + CRLF);
    expect(await withTimeout(c.read(), timeoutMs, "end of DATA"), 250, "message body");

    c.write("QUIT");
    await withTimeout(c.read(), 5_000, "QUIT").catch(() => {});
    return { ok: true, messageId };
  } finally {
    socket.destroy();
  }
}

/** RFC 2047 encode a subject if it is not plain ASCII. */
export function encodeHeader(value) {
  const s = String(value ?? "");
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}

export { SmtpError };
