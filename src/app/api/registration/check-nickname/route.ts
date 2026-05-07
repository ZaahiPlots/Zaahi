// GET /api/registration/check-nickname?n=foo
//
// Public endpoint (in PUBLIC_API allow-list, no auth). Used by /register
// Step 1 to live-validate nickname uniqueness on input blur per spec §6.4
// step 2: nickname must not collide with User.nickname OR with any
// RegistrationApplication.nickname whose status is not REJECTED.
//
// Returns:
//   200 { available: true, nickname }                — green to proceed
//   200 { available: false, code: 'invalid_format' } — fails regex
//   200 { available: false, code: 'taken' }          — collision found
//
// Always 200 (even for "taken" / "invalid_format") so the client can
// surface a friendly inline message without treating it as a network
// error. 4xx is reserved for malformed requests.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NICKNAME_REGEX } from "@/lib/registration-validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const n = req.nextUrl.searchParams.get("n");
  if (!n || n.length === 0) {
    return NextResponse.json(
      { available: false, code: "missing", error: "missing 'n' query param" },
      { status: 400 },
    );
  }
  const nickname = n.trim();
  if (!NICKNAME_REGEX.test(nickname)) {
    return NextResponse.json({ available: false, code: "invalid_format", nickname });
  }

  // Case-insensitive match. nickname column is unique-indexed by Prisma
  // (storage normalizes case sensitivity at the application layer);
  // we use Prisma's `mode: "insensitive"` so 'Founder' and 'founder'
  // collide.
  const userHit = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: "insensitive" } },
    select: { id: true },
  });
  if (userHit) {
    return NextResponse.json({ available: false, code: "taken", nickname });
  }

  const appHit = await prisma.registrationApplication.findFirst({
    where: {
      nickname: { equals: nickname, mode: "insensitive" },
      status: { not: "REJECTED" },
    },
    select: { id: true },
  });
  if (appHit) {
    return NextResponse.json({ available: false, code: "taken", nickname });
  }

  return NextResponse.json({ available: true, nickname });
}
