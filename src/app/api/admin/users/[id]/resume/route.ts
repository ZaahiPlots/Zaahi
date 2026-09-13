// POST /api/admin/users/[id]/resume — reopen a paused user's access
// (admin only). One click, no data change beyond the status fields and
// the append-only audit row. Body: { reason?: string (≤ 500) }.
//
//   200 { ok: true, user }
//   400 bad_reason · 403 forbidden | self | founder_protected ·
//   404 not_found · 409 not_paused

import { NextRequest, NextResponse } from "next/server";
import { AccessAction } from "@prisma/client";
import { z } from "zod";
import { getAdminUserId } from "@/lib/auth";
import { PAUSE_REASON_MAX, setUserAccess } from "@/lib/user-access";
import { serialize } from "@/lib/serialize";

export const runtime = "nodejs";

const BodySchema = z.object({
  reason: z.string().trim().max(PAUSE_REASON_MAX).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminUserId(req);
  if (!adminId) {
    return NextResponse.json({ ok: false, code: "forbidden", message: "Admin required." }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema> = {};
  try {
    const raw = await req.text();
    body = BodySchema.parse(raw ? JSON.parse(raw) : {});
  } catch {
    return NextResponse.json({ ok: false, code: "bad_reason", message: "Invalid body." }, { status: 400 });
  }

  const { id } = await ctx.params;
  const result = await setUserAccess({
    targetId: id,
    actorId: adminId,
    action: AccessAction.RESUME,
    reason: body.reason,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: result.status });
  }
  return NextResponse.json(serialize({ ok: true, user: result.user }));
}
