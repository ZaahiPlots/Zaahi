// Sent to the OWNER claimant when an admin verifies their Title Deed.
// Spec §11.3 + §10. Subject: "Your plot ownership is verified".

import { emailLayout, escapeText } from "./_layout";

export interface TitleDeedVerifiedArgs {
  nickname: string;
  plotNumber: string;
  district: string;
  parcelLink: string; // public parcel URL
}

export function titleDeedVerified(a: TitleDeedVerifiedArgs): {
  subject: string;
  html: string;
} {
  const subject = `Your plot ownership is verified — Plot ${a.plotNumber}`;
  const html = emailLayout({
    preheader: `Plot ${a.plotNumber} · ${a.district} · OWNER verified`,
    heading: "Your ownership is verified",
    bodyHtml: `
      <p style="margin: 0 0 12px;">Hi ${escapeText(a.nickname)},</p>
      <p style="margin: 0 0 12px;">
        We&rsquo;ve confirmed your Title Deed for plot
        <strong>${escapeText(a.plotNumber)}</strong>${a.district ? ` in ${escapeText(a.district)}` : ""}.
        Your OWNER role on this plot is now <strong>verified</strong> and
        you&rsquo;ll appear as the owner across ZAAHI surfaces.
      </p>
      <p style="margin: 0 0 12px;">
        You can update price, status, or documents from your plot page at any time.
      </p>
    `,
    cta: { url: a.parcelLink, label: "VIEW MY PLOT" },
  });
  return { subject, html };
}
