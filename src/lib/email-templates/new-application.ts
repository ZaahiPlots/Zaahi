// ── Admin notification: new ambassador application ────────────────
import {
  emailLayout,
  escapeHtml,
  getBaseUrl,
  goldButton,
  kv,
  outlineButton,
  sectionTitle,
  EMAIL_COLORS as C,
} from "./_layout";

export interface NewApplicationArgs {
  applicationId: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  experience?: string | null;
  plan: "SILVER" | "GOLD" | "PLATINUM";
  amountAed: number;
  txHash: string;
  submittedAt: Date;
  checklistData?: Record<string, boolean> | null;
}

function planBadge(plan: string): string {
  const color =
    plan === "PLATINUM" ? "#E5E4E2" : plan === "GOLD" ? C.gold : "#C0C0C0";
  return `<span style="background:${color}22;color:${color};padding:3px 10px;border-radius:4px;font-size:11px;letter-spacing:0.12em;font-weight:700;">${plan}</span>`;
}

function renderChecklist(data?: Record<string, boolean> | null): string {
  if (!data) return "";
  const items = Object.entries(data);
  if (items.length === 0) return "";
  const rows = items
    .map(([k, v]) => {
      const icon = v
        ? `<span style="color:#2D6A4F;">&#10003;</span>`
        : `<span style="color:#E63946;">&#10007;</span>`;
      const label = k
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase());
      return `<tr>
        <td style="padding:4px 0;font-size:12px;width:22px;">${icon}</td>
        <td style="padding:4px 0;font-size:12px;color:${C.textDim};">${escapeHtml(label)}</td>
      </tr>`;
    })
    .join("");
  return `<div style="margin-top:20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`;
}

export function renderNewApplicationEmail(a: NewApplicationArgs): {
  subject: string;
  html: string;
} {
  const base = getBaseUrl();
  const adminHref = `${base}/admin/ambassadors#${a.applicationId}`;
  const tronscanHref = `https://tronscan.org/#/transaction/${encodeURIComponent(a.txHash)}`;

  const body = `
    ${sectionTitle(`New ambassador application`)}
    <div style="font-size:14px;color:${C.textDim};line-height:1.6;margin-bottom:20px;">
      ${escapeHtml(a.name)} just submitted a <strong style="color:${C.gold};">${planBadge(a.plan)}</strong>
      application. Payment claimed: <strong>${a.amountAed.toLocaleString("en-US")} AED</strong>.
      Verify the USDT transfer on Tronscan before approving.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      ${kv("Name", escapeHtml(a.name))}
      ${kv("Email", `<a href="mailto:${encodeURIComponent(a.email)}" style="color:${C.gold};text-decoration:none;">${escapeHtml(a.email)}</a>`)}
      ${kv("Phone", `<a href="tel:${encodeURIComponent(a.phone)}" style="color:${C.gold};text-decoration:none;">${escapeHtml(a.phone)}</a>`)}
      ${a.company ? kv("Company", escapeHtml(a.company)) : ""}
      ${kv("Plan", planBadge(a.plan))}
      ${kv("Amount (AED)", `<strong>${a.amountAed.toLocaleString("en-US")}</strong>`)}
      ${kv("TX hash", escapeHtml(a.txHash), { mono: true })}
      ${kv("Submitted", a.submittedAt.toISOString().replace("T", " ").slice(0, 19) + " UTC")}
      ${kv("Application ID", escapeHtml(a.applicationId), { mono: true })}
    </table>
    ${a.experience ? `<div style="margin-top:8px;"><div style="font-size:10px;letter-spacing:0.16em;color:${C.textMuted};text-transform:uppercase;margin-bottom:6px;">Experience</div><div style="font-size:13px;color:${C.textDim};line-height:1.6;white-space:pre-wrap;">${escapeHtml(a.experience)}</div></div>` : ""}
    ${renderChecklist(a.checklistData)}
    <div style="margin-top:28px;text-align:center;">
      ${goldButton("OPEN ADMIN PANEL", adminHref)}
      <div style="height:12px;"></div>
      ${outlineButton("VERIFY ON TRONSCAN", tronscanHref)}
    </div>
  `;

  return {
    subject: `[ZAAHI] New ambassador application — ${a.plan} · ${a.name}`,
    html: emailLayout({
      preheader: `${a.plan} application from ${a.name} — ${a.amountAed.toLocaleString("en-US")} AED`,
      bodyHtml: body,
      eyebrow: "Admin · Ambassador",
    }),
  };
}
