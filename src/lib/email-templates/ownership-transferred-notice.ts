// Spec §11.3 + CORR-2 / R15. Sent to Parcel.ownerId (the creator)
// when an admin verifies a *different* user's OWNER claim, causing
// Parcel.verifiedOwnerUserId to diverge from Parcel.ownerId.
//
// The body is informational, not punitive — the creator's claim row
// remains active and visible on the plot page. This email tells them
// the public "Owner: X" label now points to a different user and
// nothing about their account changed.

import { emailLayout, escapeText } from "./_layout";

export interface OwnershipTransferredNoticeArgs {
  creatorNickname: string;
  verifiedNickname: string;
  creatorRoleAtClaim: string; // e.g. "BROKER", "INTERMEDIARY"
  plotNumber: string;
  district: string;
  parcelLink: string;
}

export function ownershipTransferredNotice(a: OwnershipTransferredNoticeArgs): {
  subject: string;
  html: string;
} {
  const subject = `Plot ${a.plotNumber} — ownership verified for another claimant`;
  const html = emailLayout({
    preheader: `Plot ${a.plotNumber} · OWNER verified to ${a.verifiedNickname}`,
    heading: "Plot ownership update",
    bodyHtml: `
      <p style="margin: 0 0 12px;">Hi ${escapeText(a.creatorNickname)},</p>
      <p style="margin: 0 0 12px;">
        Plot <strong>${escapeText(a.plotNumber)}</strong>${a.district ? ` in ${escapeText(a.district)}` : ""}
        has been verified to <strong>${escapeText(a.verifiedNickname)}</strong>
        as the OWNER. Your <strong>${escapeText(a.creatorRoleAtClaim)}</strong>
        claim remains active and visible on the plot page.
      </p>
      <p style="margin: 0 0 12px;">
        This is an informational notice — your account is unaffected.
        You can continue interacting with the plot in your role.
      </p>
    `,
    cta: { url: a.parcelLink, label: "VIEW PLOT" },
  });
  return { subject, html };
}
