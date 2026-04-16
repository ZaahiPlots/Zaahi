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

async function notifyAdmin(summary: {
  plan: string;
  name: string;
  emailRedacted: string;
  phoneRedacted: string;
  applicationId: string;
}): Promise<void> {
  // Best-effort admin notification. Matches the redacted-log shape used by
  // `src/app/api/notify-admin/route.ts`. Never throws — submit flow must
  // succeed even if notification isn't wired up.
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

    // Fire-and-forget admin notification. No await to keep p50 low.
    void notifyAdmin({
      plan: data.plan,
      name: data.name,
      emailRedacted: redactEmail(data.email),
      phoneRedacted: redactPhone(data.phone),
      applicationId: created.id,
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
