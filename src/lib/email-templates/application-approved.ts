// ── Welcome: application approved ──────────────────────────────────
import {
  emailLayout,
  escapeHtml,
  goldButton,
  outlineButton,
  getBaseUrl,
  sectionTitle,
  EMAIL_COLORS as C,
} from "./_layout";

export interface ApplicationApprovedArgs {
  name: string;
  plan: "SILVER" | "GOLD" | "PLATINUM";
  referralCode: string;
}

const PLAN_RATES: Record<string, { L1: string; L2: string; L3: string }> = {
  SILVER: { L1: "5%", L2: "2%", L3: "1%" },
  GOLD: { L1: "10%", L2: "4%", L3: "1%" },
  PLATINUM: { L1: "15%", L2: "6%", L3: "1%" },
};

const PLAN_PERKS: Record<string, string[]> = {
  SILVER: [
    "Lifetime ambassador access",
    "Personal referral link + QR",
    "3-level commission tree",
    "Dashboard with live earnings",
  ],
  GOLD: [
    "Everything in Silver",
    "Priority access to new plots",
    "Downloadable site-plan PDFs",
    "Priority support",
  ],
  PLATINUM: [
    "Everything in Gold",
    "Direct founder line",
    "Co-branding opportunities",
    "Quarterly strategy calls",
  ],
};

export function renderApplicationApprovedEmail(a: ApplicationApprovedArgs): {
  subject: string;
  html: string;
} {
  const base = getBaseUrl();
  const referralLink = `${base}/r/${a.referralCode}`;
  const dashHref = `${base}/ambassador`;
  const rates = PLAN_RATES[a.plan];
  const perks = PLAN_PERKS[a.plan] || [];

  const perksHtml = perks
    .map(
      (p) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:${C.textDim};"><span style="color:${C.gold};margin-right:10px;">&#9670;</span>${escapeHtml(p)}</td></tr>`,
    )
    .join("");

  const body = `
    ${sectionTitle(`Welcome to ZAAHI, ${escapeHtml(a.name.split(" ")[0] || a.name)}.`)}
    <div style="font-size:14px;color:${C.textDim};line-height:1.7;margin-bottom:24px;">
      Your <strong style="color:${C.gold};">${a.plan}</strong> ambassador
      application has been approved. Your lifetime membership is now active
      and commissions will accrue on every closed deal in your 3-level downline.
    </div>

    <div style="background:rgba(200,169,110,0.08);border:1px solid ${C.line};border-radius:10px;padding:20px;margin:16px 0 24px 0;">
      <div style="font-size:10px;letter-spacing:0.2em;color:${C.textMuted};text-transform:uppercase;margin-bottom:8px;">Your referral link</div>
      <div style="font-family:SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;color:${C.gold};word-break:break-all;margin-bottom:14px;">${escapeHtml(referralLink)}</div>
      <div style="font-size:12px;color:${C.textMuted};line-height:1.6;">
        Share this link anywhere — social, WhatsApp, email. When someone signs up
        through it, they are attributed to you forever.
      </div>
    </div>

    <div style="font-family:Georgia,serif;font-size:15px;color:${C.text};margin:22px 0 10px 0;letter-spacing:-0.01em;">Your commission rates</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
      <tr>
        <td style="padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:10px;letter-spacing:0.16em;color:${C.textMuted};text-transform:uppercase;">Level 1</div>
          <div style="font-size:22px;color:${C.gold};font-weight:700;margin-top:4px;">${rates.L1}</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:10px;letter-spacing:0.16em;color:${C.textMuted};text-transform:uppercase;">Level 2</div>
          <div style="font-size:22px;color:${C.gold};font-weight:700;margin-top:4px;">${rates.L2}</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:10px;letter-spacing:0.16em;color:${C.textMuted};text-transform:uppercase;">Level 3</div>
          <div style="font-size:22px;color:${C.gold};font-weight:700;margin-top:4px;">${rates.L3}</div>
        </td>
      </tr>
    </table>
    <div style="font-size:12px;color:${C.textMuted};line-height:1.6;margin-bottom:22px;">
      Rates apply to the ZAAHI service fee (2% of deal value), split seller-side
      and buyer-side. Minimum payout 1,000 AED, SLA 30 business days post-close.
    </div>

    <div style="font-family:Georgia,serif;font-size:15px;color:${C.text};margin:22px 0 4px 0;letter-spacing:-0.01em;">Your ${a.plan.toLowerCase()} tier perks</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${perksHtml}</table>

    <div style="font-family:Georgia,serif;font-size:15px;color:${C.text};margin:28px 0 10px 0;letter-spacing:-0.01em;">How to earn</div>
    <ol style="margin:0 0 22px 20px;padding:0;color:${C.textDim};font-size:13px;line-height:1.7;">
      <li>Sign in with the same email you applied with — your referral code will be linked on first sync.</li>
      <li>Share your link with landowners, buyers, brokers, investors.</li>
      <li>When a deal closes, commissions auto-accrue in your dashboard.</li>
      <li>Request payout any time after crossing the 1,000 AED minimum.</li>
    </ol>

    <div style="text-align:center;margin-top:28px;">
      ${goldButton("OPEN DASHBOARD", dashHref)}
      <div style="height:12px;"></div>
      ${outlineButton("COPY REFERRAL LINK", referralLink)}
    </div>
  `;
  return {
    subject: `Welcome to ZAAHI Ambassadors — your ${a.plan} tier is live`,
    html: emailLayout({
      preheader: `Your referral link is ready. Share to earn.`,
      bodyHtml: body,
      eyebrow: "Application approved",
    }),
  };
}
