// Sent to applicant on /register submit, status PENDING_REVIEW.
// Spec §11.3.

import { emailLayout, escapeText } from "./_layout";

export interface RegistrationReceivedArgs {
  nickname: string;
  role: string; // human-readable label (use ROLE_LABELS)
  applicationId: string;
  verificationLink: string; // Supabase signup confirm action_link
  expectedSlaDays: number; // typical 2-3 business days per spec §6.4
}

export function registrationReceived(a: RegistrationReceivedArgs): {
  subject: string;
  html: string;
} {
  const subject = "Welcome to ZAAHI — your application is in review";
  const html = emailLayout({
    preheader: "Verify your email to activate your ZAAHI cohort application.",
    heading: "Application received",
    bodyHtml: `
      <p>Hi ${escapeText(a.nickname)},</p>
      <p>Your <strong style="color:#C8A96E">${escapeText(a.role)}</strong> application is in review.</p>

      <div style="background: rgba(200,169,110,0.08); border-left: 2px solid #C8A96E; padding: 12px 16px; margin: 18px 0; font-size: 13px;">
        <strong>One step left — verify your email.</strong><br>
        Tap the button below so we can confirm this address is yours.
        Your application can't be approved until you verify.
      </div>

      <p style="font-size: 13px; color: rgba(245,241,232,0.65);">
        After verification + cohort review (typically ${a.expectedSlaDays} business days),
        you'll receive an activation email with a link to set your password and sign in.
      </p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: rgba(245,241,232,0.55);">
        Application ID: <code style="color: #C8A96E">${escapeText(a.applicationId)}</code>
      </div>
    `,
    cta: { url: a.verificationLink, label: "VERIFY EMAIL" },
    footnoteHtml: `If you didn't apply for ZAAHI, you can ignore this email — no account will be created without email verification.`,
  });
  return { subject, html };
}
