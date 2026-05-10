// Sent to the claimant when an admin rejects their PlotClaim — covers
// both Title Deed (OWNER) rejections and other-role rejections in the
// PlotClaimVerification tab. Spec §10 — same shape as
// registration-rejected but plot-scoped, with the rejection reason
// rendered verbatim so the user knows what to fix.

import { emailLayout, escapeText } from "./_layout";

export interface ClaimRejectedArgs {
  nickname: string;
  roleLabel: string;
  plotNumber: string;
  district: string;
  reason: string;
}

export function claimRejected(a: ClaimRejectedArgs): {
  subject: string;
  html: string;
} {
  const subject = `Your ${a.roleLabel} claim on plot ${a.plotNumber} — update`;
  const html = emailLayout({
    preheader: `Plot ${a.plotNumber} · ${a.roleLabel} claim could not be verified`,
    heading: "Claim could not be verified",
    bodyHtml: `
      <p style="margin: 0 0 12px;">Hi ${escapeText(a.nickname)},</p>
      <p style="margin: 0 0 12px;">
        We reviewed your <strong>${escapeText(a.roleLabel)}</strong> claim
        on plot <strong>${escapeText(a.plotNumber)}</strong>${a.district ? ` in ${escapeText(a.district)}` : ""}
        and weren&rsquo;t able to verify it.
      </p>
      <div style="margin: 16px 0; padding: 14px 16px; background: rgba(230,57,70,0.08); border: 1px solid rgba(230,57,70,0.25); border-radius: 8px; font-size: 13px;">
        <strong style="display: block; margin-bottom: 6px; color: #ff8a92;">Reason</strong>
        ${escapeText(a.reason)}
      </div>
      <p style="margin: 0 0 12px;">
        You can submit a new claim with corrected documents from the plot
        page at any time. If you believe this was decided in error, reply
        to this email and our team will take a second look.
      </p>
    `,
  });
  return { subject, html };
}
