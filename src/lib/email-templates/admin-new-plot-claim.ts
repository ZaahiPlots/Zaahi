// Sent to admins (Жан + Dymo) on every new PENDING PlotClaim.
// Spec §11.3 / §8.4 — mirrors admin-new-application but for the
// per-plot multi-claim flow. SELF_DECLARED claims do not trigger this
// email (admins don't need to act on them); only the verifiable
// roles that land in PENDING.

import { emailLayout, escapeText } from "./_layout";

export interface AdminNewPlotClaimArgs {
  nickname: string;
  role: string; // human-readable label, e.g. "OWNER" or "Broker — RERA-licensed"
  claimId: string;
  parcelPlotNumber: string;
  parcelDistrict: string;
  priceAed: string; // already-formatted "18,500,000 AED"
  queueLink: string; // typically https://www.zaahi.io/admin/queue?tab=plotclaim
  submittedAt: string;
}

export function adminNewPlotClaim(a: AdminNewPlotClaimArgs): {
  subject: string;
  html: string;
} {
  const subject = `[ZAAHI] New ${a.role} claim on plot ${a.parcelPlotNumber} from ${a.nickname}`;
  const html = emailLayout({
    preheader: `${a.role} claim · plot ${a.parcelPlotNumber} · ${a.parcelDistrict}`,
    heading: "New plot claim — verification needed",
    bodyHtml: `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55); width: 110px;">Claimant</td>
          <td style="padding: 6px 0; color: #C8A96E; font-weight: 600;">${escapeText(a.nickname)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Role on plot</td>
          <td style="padding: 6px 0;">${escapeText(a.role)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Plot</td>
          <td style="padding: 6px 0;">${escapeText(a.parcelPlotNumber)} · ${escapeText(a.parcelDistrict)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Stated price</td>
          <td style="padding: 6px 0;">${escapeText(a.priceAed)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55);">Submitted</td>
          <td style="padding: 6px 0;">${escapeText(a.submittedAt)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: rgba(245,241,232,0.55); vertical-align: top;">Claim ID</td>
          <td style="padding: 6px 0;"><code style="color: #C8A96E; font-size: 12px;">${escapeText(a.claimId)}</code></td>
        </tr>
      </table>
    `,
    cta: { url: a.queueLink, label: "OPEN VERIFICATION QUEUE" },
  });
  return { subject, html };
}
