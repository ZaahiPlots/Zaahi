// Sent to applicant when admin approves their RegistrationApplication
// (spec §11.3 / §7.4 step 4). Includes the Supabase recovery link as
// the "Set your password" CTA — clicking it lands the user on
// /reset-password where they set a real password and gain a session.

import { emailLayout, escapeText } from "./_layout";

export interface RegistrationApprovedArgs {
  nickname: string;
  role: string; // human-readable role label
  recoveryLink: string; // Supabase recovery action_link
}

export function registrationApproved(a: RegistrationApprovedArgs): {
  subject: string;
  html: string;
} {
  const subject = "Your ZAAHI account is active";
  const html = emailLayout({
    preheader: `Welcome aboard, ${a.nickname}. Set your password to sign in.`,
    heading: "You're in",
    bodyHtml: `
      <p>Hi ${escapeText(a.nickname)},</p>
      <p>Your <strong style="color:#C8A96E">${escapeText(a.role)}</strong> application
      has been approved. Welcome to the cohort.</p>

      <div style="background: rgba(45, 106, 79, 0.10); border-left: 2px solid #2D6A4F; padding: 12px 16px; margin: 18px 0; font-size: 13px;">
        <strong>One more step — set your password.</strong><br>
        Tap the button below to choose a password. The link is valid for
        ~24&nbsp;hours; if it expires, you can request another from the
        sign-in page.
      </div>

      <p style="font-size: 13px; color: rgba(245,241,232,0.65); line-height: 1.6;">
        Once you've set your password, you can sign in at
        <a href="https://www.zaahi.io/" style="color: #C8A96E; text-decoration: none;">zaahi.io</a>
        and start using the platform. Your nickname
        <strong style="color: #C8A96E">${escapeText(a.nickname)}</strong> is
        public-facing; your real name and email stay private.
      </p>
    `,
    cta: { url: a.recoveryLink, label: "SET PASSWORD" },
    footnoteHtml:
      "If you didn't apply for ZAAHI, please ignore this message — your account stays inactive until you click the link above.",
  });
  return { subject, html };
}
