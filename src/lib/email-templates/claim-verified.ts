// Sent to a non-OWNER claimant (BROKER / DEVELOPER / ARCHITECT / POA)
// when an admin verifies their PlotClaim. Spec §11.3 + §10.

import { emailLayout, escapeText } from "./_layout";

export interface ClaimVerifiedArgs {
  nickname: string;
  roleLabel: string; // human label, e.g. "Broker"
  plotNumber: string;
  district: string;
  parcelLink: string;
}

export function claimVerified(a: ClaimVerifiedArgs): {
  subject: string;
  html: string;
} {
  const subject = `Your role on plot ${a.plotNumber} is verified`;
  const html = emailLayout({
    preheader: `Plot ${a.plotNumber} · ${a.roleLabel} verified`,
    heading: `${a.roleLabel} role verified`,
    bodyHtml: `
      <p style="margin: 0 0 12px;">Hi ${escapeText(a.nickname)},</p>
      <p style="margin: 0 0 12px;">
        Your <strong>${escapeText(a.roleLabel)}</strong> claim on plot
        <strong>${escapeText(a.plotNumber)}</strong>${a.district ? ` in ${escapeText(a.district)}` : ""}
        is now verified. The plot page shows your role with a verified
        badge and your stated price is visible to potential counterparties.
      </p>
    `,
    cta: { url: a.parcelLink, label: "VIEW PLOT" },
  });
  return { subject, html };
}
