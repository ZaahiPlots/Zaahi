import { NextRequest, NextResponse } from "next/server";
import { getApprovedUserId } from "@/lib/auth";
import { runIngest } from "@/lib/land-monitor/ingest";

// POST /api/land-monitor/ingest
// Triggers a one-shot ingestion: Reddit + DLD CSV → Claude Haiku extraction
// → plot matching → cache.json write. Returns summary stats.
// Auth: approved user only (same posture as /api/chat — the LLM call costs
// money, so don't let pending accounts spend it).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Vercel — give the LLM extraction enough headroom

export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("REPLACE_ME")) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const cache = await runIngest({ anthropicKey: apiKey });
    return NextResponse.json({
      ok: true,
      lastIngestedAt: cache.lastIngestedAt,
      stats: cache.stats,
      itemCount: cache.items.length,
    });
  } catch (e) {
    console.error("[land-monitor:ingest] failed:", e);
    return NextResponse.json({ error: "ingest_failed", detail: String(e) }, { status: 500 });
  }
}
