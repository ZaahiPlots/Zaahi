// GET /api/sold-plots/[id] — card for one sold plot (history, registered project,
// derived figures). Founders + ADMIN only (getAdminUserId). Prices are integer fils.
// One literal data path so Next bundles the file with this function.

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth";
import { PRIVATE, soldPlotsDenied } from "@/lib/sold-plots-gate";

export const runtime = "nodejs";

const CARDS_FILE = path.join(process.cwd(), "data", "sold-plots", "cards.json");
const ID = /^[A-Za-z0-9:_-]{1,40}$/;

let cache: { asof: unknown; cards: Record<string, unknown> } | null = null;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = soldPlotsDenied(await getAdminUserId(req));
  if (denied) return denied;

  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400, headers: PRIVATE });
  cache ??= JSON.parse(fs.readFileSync(CARDS_FILE, "utf8"));
  const card = Object.hasOwn(cache!.cards, id) ? cache!.cards[id] : undefined;
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404, headers: PRIVATE });
  return NextResponse.json({ asof: cache!.asof, card }, { headers: PRIVATE });
}
