// ── ZAAHI Ambassador — public registration endpoint ─────────────────
// PUBLIC route (no auth). Receives ambassador applications from /join.
// Stores them as AmbassadorApplication rows with status=PENDING — admin
// verifies the USDT payment on-chain and activates the ambassador later.
//
// This route is intentionally public (listed alongside `/api/notify-admin`
// in `src/middleware.ts`). It handles user-supplied data with strict zod
// validation and never exposes PII back.
//
// Dedup is enforced by a UNIQUE constraint on (email): one application per
// address — if a duplicate slips past the pre-check we still return 409.
// The 10-item onboarding checklist must be 100% true to submit; the route
// re-validates server-side so a tampered client cannot bypass it.
//
// Approved by founder 2026-04-15.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendTelegramMessage, escapeMarkdownV2 } from "@/lib/telegram";
import { renderNewApplicationEmail } from "@/lib/email-templates/new-application";
import { renderApplicationReceivedEmail } from "@/lib/email-templates/application-received";
import { PLAN_PRICES_AED, type AmbassadorPlan } from "@/lib/ambassador";

// 10-item onboarding checklist. Keys MUST match what the /join modal sends.
// Every key has to come back as `true` for the application to be accepted.
const CHECKLIST_KEYS = [
  "paymentSent",
  "agreeTerms",
  "agreePrivacy",
  "agreeAmbassadorTerms",
  "followInstagram",
  "followLinkedIn",
  "followTwitter",
  "joinTelegram",
  "understandNonRefundable",
  "confirmAccurate",
] as const;

const ChecklistSchema = z
  .object(
    Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, z.boolean()])) as Record<
      (typeof CHECKLIST_KEYS)[number],
      z.ZodBoolean
    >,
  )
  .refine(
    (obj) => CHECKLIST_KEYS.every((k) => obj[k] === true),
    { message: "All 10 onboarding checklist items must be confirmed." },
  );

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(3).max(40),
  company: z.string().trim().max(200).optional(),
  experience: z.string().trim().max(2000).optional(),
  plan: z.enum(["SILVER", "GOLD", "PLATINUM"]),
  txHash: z.string().trim().min(6).max(200),
  checklistData: ChecklistSchema,
});

function redactEmail(e: string): string {
  const [local, domain] = e.split("@");
  if (!local || !domain) return "[bad-email]";
  return `${local.slice(0, 2)}***@${domain}`;
}

function redactPhone(p: string): string {
  if (p.length < 4) return "[bad-phone]";
  return `***${p.slice(-4)}`;
}

async function logAdminSummary(summary: {
  plan: string;
  name: string;
  emailRedacted: string;
  phoneRedacted: string;
  applicationId: string;
}): Promise<void> {
  // Redacted-log summary matching `src/app/api/notify-admin/route.ts`.
  // Vercel log is the fallback channel when Resend/Telegram aren't configured.
  try {
    console.log("=== NEW AMBASSADOR APPLICATION ===");
    console.log(`Plan: ${summary.plan}`);
    console.log(`Application ID: ${summary.applicationId}`);
    console.log(`Name: ${summary.name.slice(0, 40)}`);
    console.log(`Email: ${summary.emailRedacted}`);
    console.log(`Phone: ${summary.phoneRedacted}`);
    console.log("==================================");
  } catch {
    // swallow — notification is not revenue-path critical
  }
}

// Build a MarkdownV2-safe Telegram message for a new application.
function buildTelegramMessage(args: {
  applicationId: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  amountAed: number;
  txHash: string;
}): { text: string; keyboard: { text: string; url: string }[][] } {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://zaahi.io";
  const e = escapeMarkdownV2;
  const lines = [
    `*New ambassador application*`,
    ``,
    `${e("Plan:")} *${e(args.plan)}* \\(${e(args.amountAed.toLocaleString("en-US"))} AED\\)`,
    `${e("Name:")} ${e(args.name)}`,
    `${e("Email:")} ${e(args.email)}`,
    `${e("Phone:")} ${e(args.phone)}`,
    `${e("TX:")} \`${e(args.txHash)}\``,
    `${e("ID:")} \`${e(args.applicationId)}\``,
  ];
  return {
    text: lines.join("\n"),
    keyboard: [
      [
        { text: "Open admin panel", url: `${base}/admin/ambassadors#${args.applicationId}` },
        { text: "Tronscan", url: `https://tronscan.org/#/transaction/${args.txHash}` },
      ],
    ],
  };
}

async function fireNotifications(payload: {
  applicationId: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  experience?: string | null;
  plan: AmbassadorPlan;
  txHash: string;
  checklistData: Record<string, boolean>;
  submittedAt: Date;
}): Promise<void> {
  const amountAed = PLAN_PRICES_AED[payload.plan];
  const adminEmail = process.env.ADMIN_EMAIL || "admin@zaahi.io";

  const adminMail = renderNewApplicationEmail({
    applicationId: payload.applicationId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    company: payload.company,
    experience: payload.experience,
    plan: payload.plan,
    amountAed,
    txHash: payload.txHash,
    submittedAt: payload.submittedAt,
    checklistData: payload.checklistData,
  });

  const candidateMail = renderApplicationReceivedEmail({
    name: payload.name,
    plan: payload.plan,
    amountAed,
    txHash: payload.txHash,
    applicationId: payload.applicationId,
  });

  const tg = buildTelegramMessage({
    applicationId: payload.applicationId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    plan: payload.plan,
    amountAed,
    txHash: payload.txHash,
  });

  const results = await Promise.allSettled([
    sendEmail({ to: adminEmail, subject: adminMail.subject, html: adminMail.html, replyTo: payload.email }),
    sendEmail({ to: payload.email, subject: candidateMail.subject, html: candidateMail.html }),
    sendTelegramMessage({ text: tg.text, parseMode: "MarkdownV2", inlineKeyboard: tg.keyboard }),
  ]);
  const labels = ["admin-email", "candidate-email", "telegram"];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const v = r.value as { ok: boolean; skipped?: boolean; error?: string };
      if (v.ok) console.log(`[ambassador/register] ${labels[i]} ok`);
      else if (v.skipped) console.log(`[ambassador/register] ${labels[i]} skipped (env missing)`);
      else console.warn(`[ambassador/register] ${labels[i]} failed:`, v.error);
    } else {
      console.warn(`[ambassador/register] ${labels[i]} rejected:`, r.reason);
    }
  });
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    const json = await req.json();
    parsed = BodySchema.safeParse(json);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: first?.message || "Validation failed." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    // Pre-check: surface a clean 409 before hitting the unique-constraint path.
    const existing = await prisma.ambassadorApplication.findUnique({
      where: { email: data.email },
      select: { id: true, status: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Application already exists for this email. Contact support if you need to update transaction details.",
        },
        { status: 409 },
      );
    }

    const created = await prisma.ambassadorApplication.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        experience: data.experience,
        plan: data.plan,
        txHash: data.txHash,
        status: "PENDING",
        checklistData: data.checklistData,
      },
      select: { id: true },
    });

    // Fire-and-forget admin log + notifications. No await — keep p50 low.
    // Application row is the source of truth; notifications are additive.
    void logAdminSummary({
      plan: data.plan,
      name: data.name,
      emailRedacted: redactEmail(data.email),
      phoneRedacted: redactPhone(data.phone),
      applicationId: created.id,
    });
    void fireNotifications({
      applicationId: created.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company ?? null,
      experience: data.experience ?? null,
      plan: data.plan,
      txHash: data.txHash,
      checklistData: data.checklistData as Record<string, boolean>,
      submittedAt: new Date(),
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: unknown) {
    // P2002: unique constraint violation — race with the pre-check.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Application already exists for this email. Contact support if you need to update transaction details.",
        },
        { status: 409 },
      );
    }
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[ambassador/register] server error:", msg);
    return NextResponse.json(
      { ok: false, error: "Server error. Please try again in a moment." },
      { status: 500 },
    );
  }
}
