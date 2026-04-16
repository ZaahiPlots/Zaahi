// ── ZAAHI email base layout ──────────────────────────────────────
// Shared wrapper for all transactional emails. Dark theme, gold accent.
// All CSS inline — Gmail + Outlook strip <style>. No external fonts.
// Max-width 600px. Safe on iOS Mail, Gmail web/app, Outlook 2016+.

const GOLD = "#C8A96E";
const NAVY_BG = "#0A1628";
const NAVY_CARD = "#0F1E34";
const TEXT = "#FFFFFF";
const TEXT_DIM = "rgba(255,255,255,0.72)";
const TEXT_MUTED = "rgba(255,255,255,0.55)";
const LINE = "rgba(200,169,110,0.18)";

export const EMAIL_COLORS = {
  gold: GOLD,
  navyBg: NAVY_BG,
  navyCard: NAVY_CARD,
  text: TEXT,
  textDim: TEXT_DIM,
  textMuted: TEXT_MUTED,
  line: LINE,
} as const;

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://zaahi.io";
}

export interface LayoutArgs {
  /** Visible <title>/preheader — short summary shown in inbox preview. */
  preheader?: string;
  /** Body HTML (already inline-styled). Rendered inside the card. */
  bodyHtml: string;
  /** Optional eyebrow label above the ZAAHI wordmark (e.g., "Ambassador Program"). */
  eyebrow?: string;
}

/**
 * Wraps body HTML in the ZAAHI dark email shell: header with gold "ZAAHI"
 * wordmark + subtle divider, content card, footer with legal / unsubscribe
 * stub. All CSS is inline.
 */
export function emailLayout(args: LayoutArgs): string {
  const { preheader = "", bodyHtml, eyebrow = "Ambassador Program" } = args;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>ZAAHI</title>
</head>
<body style="margin:0;padding:0;background:${NAVY_BG};color:${TEXT};font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
<span style="display:none!important;opacity:0;color:transparent;visibility:hidden;max-height:0;max-width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY_BG};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:8px 0 24px 0;">
            <div style="font-family:Georgia,serif;font-size:28px;letter-spacing:0.28em;color:${GOLD};font-weight:400;">ZAAHI</div>
            <div style="margin-top:6px;font-size:10px;letter-spacing:0.24em;color:${TEXT_MUTED};text-transform:uppercase;">${escapeHtml(eyebrow)}</div>
          </td>
        </tr>
        <tr>
          <td style="background:${NAVY_CARD};border:1px solid ${LINE};border-radius:12px;padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 16px 0 16px;">
            <div style="font-size:11px;color:${TEXT_MUTED};letter-spacing:0.04em;line-height:1.6;">
              ZAAHI — Real Estate Intelligence Platform<br/>
              Dubai, UAE &middot; <a href="${getBaseUrl()}" style="color:${TEXT_MUTED};text-decoration:underline;">zaahi.io</a>
            </div>
            <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:10px;letter-spacing:0.04em;">
              You are receiving this email because you applied to the ZAAHI Ambassador Program.
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** HTML-escape a string for safe inline interpolation. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Primary gold CTA button. */
export function goldButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${GOLD};color:${NAVY_BG};padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.04em;">${escapeHtml(label)}</a>`;
}

/** Secondary outlined button. */
export function outlineButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:transparent;color:${GOLD};padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.04em;border:1px solid ${GOLD};">${escapeHtml(label)}</a>`;
}

/** Key/value row used in application detail summaries. */
export function kv(label: string, value: string, opts?: { mono?: boolean }): string {
  const valueStyle = opts?.mono
    ? `font-family:SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;word-break:break-all;`
    : `font-size:14px;`;
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid ${LINE};width:40%;vertical-align:top;">
      <div style="font-size:10px;letter-spacing:0.16em;color:${TEXT_MUTED};text-transform:uppercase;">${escapeHtml(label)}</div>
    </td>
    <td style="padding:8px 0;border-bottom:1px solid ${LINE};vertical-align:top;">
      <div style="color:${TEXT};${valueStyle}">${value}</div>
    </td>
  </tr>`;
}

/** Small section-header with gold underline. */
export function sectionTitle(text: string): string {
  return `<div style="font-family:Georgia,serif;font-size:18px;color:${TEXT};letter-spacing:-0.01em;margin:0 0 16px 0;">${escapeHtml(text)}</div>`;
}
