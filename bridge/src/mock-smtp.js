// Archie Bridge — a real, tiny SMTP server for the offline dry run.
//
// Not a stub of the transport: it speaks the actual protocol on loopback, so the
// dry run exercises the real bridge/src/smtp.js client end to end — EHLO, AUTH,
// envelope, DATA, dot-unstuffing — and captures exactly the bytes a mail server
// would have received. A stubbed sendMail would have proved only that email.js
// renders a string.
//
// Loopback only, no TLS. bridge/src/smtp.js refuses to send unencrypted to
// anything that is not loopback, whatever SMTP_ALLOW_INSECURE says, so this
// cannot be repurposed to leak real credentials.

import net from "node:net";

const CRLF = "\r\n";

export function startMockSmtp({ port = 0, requireAuth = true, failFirst = 0 } = {}) {
  /** Every accepted message, in order. */
  const received = [];
  let connections = 0;
  let remainingFailures = failFirst;

  const server = net.createServer((socket) => {
    connections += 1;
    let buffer = "";
    let inData = false;
    let dataLines = [];
    let envelope = { from: null, to: [] };
    let authed = !requireAuth;
    let expectAuthUser = false;
    let expectAuthPass = false;

    // Simulated transient failure, so the dry run can prove the retry path.
    const shouldFail = remainingFailures > 0;
    if (shouldFail) remainingFailures -= 1;

    const send = (line) => socket.write(line + CRLF);
    send("220 mock.archie.local ESMTP ready");

    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      for (;;) {
        const idx = buffer.indexOf(CRLF);
        if (idx === -1) break;
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + CRLF.length);

        if (inData) {
          if (line === ".") {
            inData = false;
            const raw = dataLines.join("\n");
            received.push({ ...envelope, raw, ...parseMessage(raw) });
            dataLines = [];
            envelope = { from: null, to: [] };
            send("250 2.0.0 Ok: queued as MOCK1");
            continue;
          }
          // Undo dot-stuffing exactly as a real server does.
          dataLines.push(line.startsWith("..") ? line.slice(1) : line);
          continue;
        }

        const [verb, ...rest] = line.split(" ");
        const arg = rest.join(" ");

        if (expectAuthUser) { expectAuthUser = false; expectAuthPass = true; send("334 UGFzc3dvcmQ6"); continue; }
        if (expectAuthPass) { expectAuthPass = false; authed = true; send("235 2.7.0 Authentication successful"); continue; }

        switch (verb.toUpperCase()) {
          case "EHLO":
          case "HELO":
            // Multi-line reply, which is the shape the client must parse.
            socket.write(`250-mock.archie.local${CRLF}`);
            socket.write(`250-SIZE 10485760${CRLF}`);
            socket.write(`250-AUTH PLAIN LOGIN${CRLF}`);
            socket.write(`250 8BITMIME${CRLF}`);
            break;
          case "AUTH": {
            const mech = (rest[0] ?? "").toUpperCase();
            if (mech === "PLAIN") { authed = true; send("235 2.7.0 Authentication successful"); }
            else if (mech === "LOGIN") { expectAuthUser = true; send("334 VXNlcm5hbWU6"); }
            else send("504 5.5.4 Unrecognized authentication type");
            break;
          }
          case "MAIL":
            if (shouldFail) { send("451 4.3.0 Temporary failure (mock)"); break; }
            if (!authed) { send("530 5.7.0 Authentication required"); break; }
            envelope.from = extractAddr(arg);
            send("250 2.1.0 Ok");
            break;
          case "RCPT":
            envelope.to.push(extractAddr(arg));
            send("250 2.1.5 Ok");
            break;
          case "DATA":
            inData = true;
            send("354 End data with <CR><LF>.<CR><LF>");
            break;
          case "QUIT":
            send("221 2.0.0 Bye");
            socket.end();
            break;
          case "RSET":
            envelope = { from: null, to: [] };
            send("250 2.0.0 Ok");
            break;
          default:
            send("502 5.5.2 Command not implemented");
        }
      }
    });

    socket.on("error", () => {});
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      resolve({
        port: server.address().port,
        received,
        connectionCount: () => connections,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

function extractAddr(arg) {
  const m = String(arg).match(/<([^>]*)>/);
  return m ? m[1] : String(arg).replace(/^[A-Z]+:/i, "").trim();
}

/** Splits headers from body so the dry run can assert on both. */
function parseMessage(raw) {
  const sep = raw.indexOf("\n\n");
  const headerBlock = sep === -1 ? raw : raw.slice(0, sep);
  const body = sep === -1 ? "" : raw.slice(sep + 2);
  const headers = {};
  for (const line of headerBlock.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, subject: headers.subject ?? "", body };
}
