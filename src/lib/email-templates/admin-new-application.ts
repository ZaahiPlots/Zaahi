// Sent to admins (Жан + Dymo) on every new RegistrationApplication.
// Spec §11.3 / §11.4 — concise, action-oriented, links to /admin/queue.

import { emailLayout, escapeText } from "./_layout";

export interface AdminNewApplicationArgs {
  nickname: string;
  role: string;
  applicationId: string;
  status: "PENDING_REVIEW" | "WAITLIST";
  email: string;
  queueLink: string; // typically https://www.zaahi.io/admin/queue
  submittedAt: string; // pre-formatted timestamp
}

export function adminNewApplication(a: AdminNewApplicationArgs): {
  subject: string;
  html: string;
} {
  const subject = `[ZAAHI] New ${a.role} application from ${a.nickname}`;
  const html = emailLayout({
    preheader: `${a.role} • ${a.status} • applicant ${a.nickname}`,
    heading: "New cohort application",
    bodyHtml: `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55); width: 110px;">Nickname</td>
          <td style="padding: 6px 0; color: #C8A96E; font-weight: 600;">${escapeText(a.nickname)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Role</td>
          <td style="padding: 6px 0;">${escapeText(a.role)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Email</td>
          <td style="padding: 6px 0;">${escapeText(a.email)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Status</td>
          <td style="padding: 6px 0;">${escapeText(a.status)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Submitted</td>
          <td style="padding: 6px 0;">${escapeText(a.submittedAt)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55); vertical-align: top;">Application ID</td>
          <td style="padding: 6px 0;"><code style="color: #C8A96E; font-size: 12px;">${escapeText(a.applicationId)}</code></td>
        </tr>
      </table>
    `,
    cta: { url: a.queueLink, label: "OPEN ADMIN QUEUE" },
  });
  return { subject, html };
}
