// ── Rejection notification ────────────────────────────────────────
import {
  emailLayout,
  escapeHtml,
  goldButton,
  sectionTitle,
  EMAIL_COLORS as C,
} from "./_layout";

export interface ApplicationRejectedArgs {
  name: string;
  plan: "SILVER" | "GOLD" | "PLATINUM";
  reason: string;
}

export function renderApplicationRejectedEmail(
  a: ApplicationRejectedArgs,
): { subject: string; html: string } {
  const body = `
    ${sectionTitle(`Application update`)}
    <div style="font-size:14px;color:${C.textDim};line-height:1.7;margin-bottom:22px;">
      Hi ${escapeHtml(a.name.split(" ")[0] || a.name)},<br/><br/>
      Thank you for applying to the ZAAHI Ambassador Program. After reviewing
      your <strong style="color:${C.gold};">${a.plan}</strong> application,
      we are unable to approve it at this time.
    </div>

    <div style="background:rgba(230,57,70,0.08);border:1px solid rgba(230,57,70,0.25);border-radius:10px;padding:20px;margin:16px 0 22px 0;">
      <div style="font-size:10px;letter-spacing:0.2em;color:rgba(230,57,70,0.85);text-transform:uppercase;margin-bottom:8px;">Reason</div>
      <div style="font-size:13px;color:${C.text};line-height:1.7;white-space:pre-wrap;">${escapeHtml(a.reason)}</div>
    </div>

    <div style="font-size:13px;color:${C.textDim};line-height:1.7;margin-bottom:22px;">
      If the reason relates to a verification issue (e.g. USDT transfer not yet
      confirmed or sent to the wrong wallet), please reply to this email with
      the correct transaction hash and we will re-open the review.
    </div>
    <div style="font-size:12px;color:${C.textMuted};line-height:1.6;border-top:1px solid ${C.line};padding-top:16px;">
      Questions or want to reapply? Email
      <a href="mailto:admin@zaahi.io" style="color:${C.gold};text-decoration:none;">admin@zaahi.io</a>.
    </div>
    <div style="text-align:center;margin-top:24px;">
      ${goldButton("VISIT ZAAHI", "https://zaahi.io")}
    </div>
  `;
  return {
    subject: "Update on your ZAAHI Ambassador application",
    html: emailLayout({
      preheader: `We were unable to approve your application — here's why.`,
      bodyHtml: body,
      eyebrow: "Application status",
    }),
  };
}
