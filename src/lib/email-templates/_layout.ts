// Brand-wrapped HTML email layout for ZAAHI transactional emails.
// Single source for cohort-pilot templates (registration-received,
// registration-waitlist, admin-new-application, …).
//
// Visual language follows the landing page: navy background, gold
// accent (#C8A96E), Georgia serif heading, system-ui body. Plain HTML
// table-free layout — modern Gmail / Apple Mail / Outlook 365 render
// it correctly. Older Outlook may show simplified styling, which is
// acceptable for cohort-pilot reach.

export interface EmailLayoutArgs {
  preheader?: string; // hidden preview text shown in inbox snippet
  heading: string;
  bodyHtml: string;
  cta?: { url: string; label: string };
  footnoteHtml?: string;
}

const GOLD = "#C8A96E";
const NAVY = "#0A0F1E";
const NAVY_CARD = "#101830";
const TEXT = "rgba(245, 241, 232, 0.85)";
const TEXT_DIM = "rgba(245, 241, 232, 0.55)";

export function emailLayout({
  preheader,
  heading,
  bodyHtml,
  cta,
  footnoteHtml,
}: EmailLayoutArgs): string {
  const ctaBlock = cta
    ? `
    <div style="margin: 28px 0 4px; text-align: center;">
      <a href="${escapeAttr(cta.url)}"
         style="display: inline-block; padding: 12px 24px; background: ${GOLD}; color: ${NAVY}; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.1em; border-radius: 6px; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;">
        ${escapeText(cta.label)}
      </a>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeText(heading)}</title>
</head>
<body style="margin: 0; padding: 0; background: ${NAVY}; color: ${TEXT}; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.55;">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:0">${escapeText(preheader)}</div>`
      : ""
  }
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="font-family: Georgia, serif; font-size: 32px; font-weight: 300; letter-spacing: 0.18em; color: ${GOLD};">ZAAHI</div>
      <div style="margin-top: 6px; font-size: 10px; letter-spacing: 0.2em; color: ${TEXT_DIM}; text-transform: uppercase;">Real Estate OS</div>
    </div>

    <div style="background: ${NAVY_CARD}; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 32px;">
      <h1 style="margin: 0 0 16px; font-family: Georgia, serif; font-size: 22px; font-weight: 400; color: ${GOLD}; letter-spacing: 0.01em;">
        ${escapeText(heading)}
      </h1>
      <div style="font-size: 14px; color: ${TEXT};">
        ${bodyHtml}
      </div>
      ${ctaBlock}
    </div>

    ${
      footnoteHtml
        ? `<div style="margin-top: 24px; font-size: 11px; color: ${TEXT_DIM}; text-align: center; line-height: 1.6;">${footnoteHtml}</div>`
        : ""
    }

    <div style="margin-top: 24px; font-size: 10px; color: ${TEXT_DIM}; text-align: center; line-height: 1.6;">
      © ${new Date().getFullYear()} ZAAHI Real Estate OS. All rights reserved.<br>
      <a href="https://www.zaahi.io/terms" style="color: ${GOLD}; text-decoration: none;">Terms</a> ·
      <a href="https://www.zaahi.io/privacy" style="color: ${GOLD}; text-decoration: none;">Privacy</a> ·
      <a href="https://www.zaahi.io/disclaimer" style="color: ${GOLD}; text-decoration: none;">Disclaimer</a>
    </div>
  </div>
</body>
</html>`;
}

/** HTML-attribute-safe escape (used for href values). */
export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** HTML-text-safe escape. */
export function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
