// Sent to applicant when admin rejects their RegistrationApplication
// (spec §11.3 / §7.4 reject action). Includes the rejection reason
// admin entered, plus a soft escalation path (support email).

import { emailLayout, escapeText } from "./_layout";

export interface RegistrationRejectedArgs {
  nickname: string;
  role: string;
  reason: string; // free-text from admin, max 500 chars
  supportEmail?: string; // defaults to founder Gmail
}

export function registrationRejected(a: RegistrationRejectedArgs): {
  subject: string;
  html: string;
} {
  const subject = "Your ZAAHI application — update";
  const support = a.supportEmail ?? "zhanrysbayev@gmail.com";
  const html = emailLayout({
    preheader: "Your ZAAHI application was not approved at this time.",
    heading: "Application update",
    bodyHtml: `
      <p>Hi ${escapeText(a.nickname)},</p>
      <p>Thank you for applying for the <strong style="color:#C8A96E">${escapeText(a.role)}</strong>
      cohort. After review, we're not able to approve your application
      at this time.</p>

      <div style="background: rgba(255, 107, 107, 0.06); border-left: 2px solid #E63946; padding: 12px 16px; margin: 18px 0; font-size: 13px; line-height: 1.6;">
        <strong style="display:block;margin-bottom:6px;">Reason from the admin team</strong>
        ${escapeText(a.reason).replace(/\n/g, "<br>")}
      </div>

      <p style="font-size: 13px; color: rgba(245,241,232,0.65); line-height: 1.6;">
        If you believe this was an error or you'd like to follow up,
        please reach the admin team at
        <a href="mailto:${escapeText(support)}" style="color: #C8A96E; text-decoration: none;">${escapeText(support)}</a>.
        Your account remains inactive — no further action is needed
        from your side.
      </p>
    `,
  });
  return { subject, html };
}
