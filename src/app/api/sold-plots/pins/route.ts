// GET /api/sold-plots/pins — clustered-source GeoJSON for the "Sold plots" layer.
// Founders + ADMIN only (getAdminUserId). Ids and coordinates only — no price;
// the card route returns the history. NOT under /api/layers/* (that tree is
// public by middleware). The single literal path below is what makes Next's
// file tracing bundle the file into the function.

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/auth";
import { PRIVATE, soldPlotsDenied } from "@/lib/sold-plots-gate";

export const runtime = "nodejs";

const PINS_FILE = path.join(process.cwd(), "data", "sold-plots", "pins.json");

type Pin = { id: string; lng: number; lat: number; src: string; approx: boolean; n: number; last: string | null };
let cache: { asof: unknown; body: string } | null = null;

export async function GET(req: NextRequest) {
  const denied = soldPlotsDenied(await getAdminUserId(req));
  if (denied) return denied;

  if (!cache) {
    const raw = JSON.parse(fs.readFileSync(PINS_FILE, "utf8")) as { asof: unknown; pins: Pin[] };
    cache = {
      asof: raw.asof,
      body: JSON.stringify({
        type: "FeatureCollection",
        asof: raw.asof,
        features: raw.pins.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { id: p.id, src: p.src, approx: p.approx, n: p.n, last: p.last },
        })),
      }),
    };
  }
  return new NextResponse(cache.body, { headers: { ...PRIVATE, "content-type": "application/geo+json" } });
}
