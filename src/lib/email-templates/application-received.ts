// ── Candidate confirmation: application received ─────────────────
import {
  emailLayout,
  escapeHtml,
  goldButton,
  getBaseUrl,
  kv,
  sectionTitle,
  EMAIL_COLORS as C,
} from "./_layout";

export interface ApplicationReceivedArgs {
  name: string;
  plan: "SILVER" | "GOLD" | "PLATINUM";
  amountAed: number;
  txHash: string;
  applicationId: string;
}

export function renderApplicationReceivedEmail(a: ApplicationReceivedArgs): {
  subject: string;
  html: string;
} {
  const base = getBaseUrl();
  const body = `
    ${sectionTitle(`Thank you, ${escapeHtml(a.name.split(" ")[0] || a.name)}.`)}
    <div style="font-size:14px;color:${C.textDim};line-height:1.7;margin-bottom:22px;">
      We have received your <strong style="color:${C.gold};">${a.plan}</strong>
      ambassador application. Our team is verifying your
      <strong>${a.amountAed.toLocaleString("en-US")} AED</strong> USDT transfer
      on TRON now. This usually takes under 24 hours; most approvals happen the
      same business day.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 22px 0;">
      ${kv("Tier", a.plan)}
      ${kv("Amount", `${a.amountAed.toLocaleString("en-US")} AED`)}
      ${kv("TX hash", escapeHtml(a.txHash), { mono: true })}
      ${kv("Reference", escapeHtml(a.applicationId), { mono: true })}
    </table>
    <div style="font-size:13px;color:${C.textDim};line-height:1.7;margin-bottom:22px;">
      Once approved, you will receive a welcome email containing your personal
      referral link, dashboard access, and onboarding instructions.
    </div>
    <div style="font-size:12px;color:${C.textMuted};line-height:1.6;border-top:1px solid ${C.line};padding-top:16px;">
      Questions? Just reply to this email or reach us at
      <a href="mailto:admin@zaahi.io" style="color:${C.gold};text-decoration:none;">admin@zaahi.io</a>.
    </div>
    <div style="text-align:center;margin-top:24px;">
      ${goldButton("VISIT ZAAHI", base)}
    </div>
  `;
  return {
    subject: "We received your ZAAHI Ambassador application",
    html: emailLayout({
      preheader: `Your ${a.plan} application is being reviewed — typically within 24 hours.`,
      bodyHtml: body,
      eyebrow: "Application received",
    }),
  };
}
