import { NextRequest, NextResponse } from "next/server";
import { getApprovedUserId } from "@/lib/auth";
import { readCache } from "@/lib/land-monitor/storage";
import type { FeedItem } from "@/lib/land-monitor/types";

// GET /api/land-monitor/feed
// Returns the cache.json contents with PII stripped per Spec 09 §4.5.
// Broker phone is stored server-side for audit but is NEVER returned in
// the API response.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitise(item: FeedItem): FeedItem {
  if (!item.extracted) return item;
  return {
    ...item,
    extracted: {
      ...item.extracted,
      brokerPhone: null, // PDPL display-reduction
    },
  };
}

export async function GET(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const cache = await readCache();
    return NextResponse.json({
      ok: true,
      lastIngestedAt: cache.lastIngestedAt,
      stats: cache.stats,
      items: cache.items.map(sanitise),
    });
  } catch (e) {
    console.error("[land-monitor:feed] failed:", e);
    return NextResponse.json({ error: "read_failed", detail: String(e) }, { status: 500 });
  }
}
