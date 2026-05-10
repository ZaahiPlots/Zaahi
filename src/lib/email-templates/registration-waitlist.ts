// Sent to applicant on /register submit, status WAITLIST (cap reached
// for the requested role). Spec §11.3.

import { emailLayout, escapeText } from "./_layout";

export interface RegistrationWaitlistArgs {
  nickname: string;
  role: string;
  applicationId: string;
  verificationLink: string;
}

export function registrationWaitlist(a: RegistrationWaitlistArgs): {
  subject: string;
  html: string;
} {
  const subject = "ZAAHI cohort is full — you're on the waitlist";
  const html = emailLayout({
    preheader: "We received your application. Cohort 1 is full; you're on the waitlist for Cohort 2.",
    heading: "You're on the waitlist",
    bodyHtml: `
      <p>Hi ${escapeText(a.nickname)},</p>
      <p>Thanks for applying. <strong style="color:#C8A96E">${escapeText(a.role)}</strong>
      slots in this cohort are full, so your application has been moved to the waitlist
      for the next cohort.</p>

      <p>If a slot opens before then, we'll move you up automatically and let you know.
      No action needed from your side — but please verify your email so we can reach you:</p>

      <div style="background: rgba(200,169,110,0.08); border-left: 2px solid #C8A96E; padding: 12px 16px; margin: 18px 0; font-size: 13px;">
        <strong>Verify your email</strong><br>
        Tap the button below to confirm this address. Verification keeps you eligible
        when a slot becomes available.
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: rgba(245,241,232,0.55);">
        Application ID: <code style="color: #C8A96E">${escapeText(a.applicationId)}</code>
      </div>
    `,
    cta: { url: a.verificationLink, label: "VERIFY EMAIL" },
    footnoteHtml: `If you didn't apply for ZAAHI, you can ignore this email — no account will be created without email verification.`,
  });
  return { subject, html };
}
