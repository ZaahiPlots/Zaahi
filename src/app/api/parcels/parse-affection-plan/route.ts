// POST /api/parcels/parse-affection-plan
//
// Founder spec docs/specs/non-dda-plot-entry-DESIGN.md, "document-first"
// wave A (2026-06-02). Mirrors the parse-title-deed pattern (Claude
// Sonnet 4.6 vision → structured JSON) but the schema is
// affection-plan / DCR-shaped:
//   - coords block:  corner points + projection + source ("table" |
//                    "diagram" | null). Diagrams without a text
//                    coordinate table return null points and the
//                    wizard falls back to manual CoordsEntry.
//   - data block:    plot area, GFA, FAR, floors, height code,
//                    setbacks, land use, plan dates, project
//                    metadata. Each field independent and nullable
//                    so the wizard can mix parsed + manual values.
//   - confidence:    high | partial | low — drives the review-UI
//                    "verify this" warnings.
//   - warnings:      short strings the user sees verbatim.
//
// Body: { fileBase64, mediaType, emirate? }
//   - mediaType: image/png | image/jpeg | image/webp | application/pdf
//   - emirate is informational — the parser doesn't gate on it but
//     it ends up in the cache key + future evolution.
//
// Auth: getApprovedUserId (same gate as parse-title-deed).
//
// Caching: in-memory FIFO Map keyed by SHA-256 of the base64 payload
// + mediaType. Identical uploads return the cached parse — saves
// the Claude round-trip when a user re-uploads or the same file
// gets parsed during a Continue-after-edit cycle. Cleared on
// process restart; deliberately not persisted (PII-safe).
//
// PDF support: Claude's "document" content type accepts PDFs
// directly. No server-side pdfjs dependency needed; the
// switch between { type: "image" } and { type: "document" } based
// on mediaType happens inline below.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getApprovedUserId } from "@/lib/auth";

export const runtime = "nodejs";

// One prompt for both Dubai DDA Affection Plans and Abu Dhabi DCRs
// (founder Q5 — single prompt, Claude handles both vocabularies).
// Multilingual: documents are routinely English + Arabic side by
// side.
const SYSTEM = `You are extracting structured plot data from a UAE land affection plan or DCR (Design & Construction Requirements) document.

Documents may be:
- Dubai DDA "Affection Plan" (typically English, sometimes with Arabic)
- Abu Dhabi DMT "DCR" (English / Arabic / mixed)

The user uploads a PDF or image. Return ONLY a JSON object — no prose, no markdown, no code fences.

Schema:
{
  "coords": {
    "points": [[number, number], ...] | null,
    "projection": "DLTM" | "UTM40N" | "WGS84" | null,
    "source": "table" | "diagram" | null
  },
  "data": {
    "plotAreaSqft": number | null,
    "plotAreaSqm": number | null,
    "maxGfaSqft": number | null,
    "maxGfaSqm": number | null,
    "far": number | null,
    "maxFloors": number | null,
    "maxHeightCode": string | null,
    "maxHeightMeters": number | null,
    "landUseCategory": "RESIDENTIAL" | "COMMERCIAL" | "MIXED_USE" | "HOTEL" | "INDUSTRIAL" | "EDUCATIONAL" | "HEALTHCARE" | "AGRICULTURAL" | "FUTURE_DEVELOPMENT" | null,
    "setbacks": [{"side": number, "building": number | null, "podium": number | null}, ...] | null,
    "sitePlanIssue": string | null,
    "sitePlanExpiry": string | null,
    "projectName": string | null,
    "community": string | null,
    "masterDeveloper": string | null
  },
  "confidence": "high" | "partial" | "low",
  "warnings": [string, ...]
}

Coordinate extraction rules:
- coords.points: extract from a coordinate / vertex table in the document. Each row typically has a vertex number, an X (Easting) and a Y (Northing) in metres, e.g. "1  497981.778  2775845.719". Return points as [[X, Y], ...] in the same order as the document — vertex 1 first. Skip the vertex number column.
- If only a graphic site plan diagram is present without a text coordinate table, return null for coords.points and append a warning like "Site plan shown graphically — coordinate table not found, manual entry needed."
- coords.projection: ONLY set if the document explicitly names it. Look for "DLTM", "Dubai Local TM", "EPSG:3997", "UTM Zone 40N", "EPSG:32640", "WGS84", or "lat/lng". If not stated, return null and add a warning "Projection not stated — verify before saving."
- coords.source: "table" when extracted from a text table; "diagram" when you can read labelled corner points off a diagram (still high error risk — add a warning); null when no points were extracted.

Data extraction rules:
- Numbers: plain JSON numbers, no commas, no units. Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to Latin (0123456789) before returning.
- plotAreaSqm + plotAreaSqft: typically labelled in the affection plan / DCR header. Some plans give one, some both. Return what's visible.
- maxGfaSqm + maxGfaSqft: same.
- maxHeightCode: raw form like "G+15+R" or "B+G+7+R". Preserve casing.
- maxFloors: Ground + N → N+1 (e.g. G+7 → 8). G+0 → 1. If the document only states a code, derive the count.
- landUseCategory: pick the dominant land-use bucket from the supplied enum. If "RESIDENTIAL — VILLA / TOWNHOUSE" → RESIDENTIAL. If the plan is mixed across categories → MIXED_USE. If unsure → null.
- setbacks: side numbers 1-4 (per affection plan convention), building + podium in metres. Skip "SEE NOTES" / "N/A" values (return null for that field).
- sitePlanIssue / sitePlanExpiry: ISO YYYY-MM-DD if a date is visible.
- projectName / community / masterDeveloper: header / footer text.

Confidence rule:
- "high"  → coords.points AND most data fields extracted with high certainty
- "partial" → coords XOR data extracted (not both), or low-certainty values
- "low"  → very little extracted — document is mostly graphic / scan / unreadable

Warnings:
- Short user-readable strings explaining anything the user should verify (projection assumed, coords from diagram not table, ambiguous land use, partially cropped page, …).

Never invent values. If unsure, return null and add a warning.
Output ONLY the JSON object, nothing else.`;

const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;

interface CacheEntry {
  parsed: unknown;
  insertedAt: number;
}
// FIFO bounded cache — cleared on process restart. Keyed by SHA-256
// of (mediaType + base64). 50 entries is plenty for the V1 usage
// pattern (manual submissions, not bulk).
const CACHE_MAX = 50;
const cache = new Map<string, CacheEntry>();

function cacheKey(mediaType: string, base64: string): string {
  return createHash("sha256")
    .update(mediaType)
    .update(":")
    .update(base64)
    .digest("hex");
}

function cacheGet(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.parsed;
}

function cachePut(key: string, parsed: unknown): void {
  if (cache.size >= CACHE_MAX) {
    // FIFO eviction — drop the oldest entry.
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { parsed, insertedAt: Date.now() });
}

const SUPPORTED_MEDIA = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  const callerId = await getApprovedUserId(req);
  if (!callerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("REPLACE_ME")) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  let body: {
    fileBase64?: string;
    mediaType?: string;
    emirate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.fileBase64 || typeof body.fileBase64 !== "string") {
    return NextResponse.json(
      { error: "fileBase64 required" },
      { status: 400 },
    );
  }
  const mediaType = body.mediaType ?? "application/pdf";
  if (!SUPPORTED_MEDIA.has(mediaType)) {
    return NextResponse.json(
      { error: "unsupported_media_type", got: mediaType },
      { status: 400 },
    );
  }

  // Cache check.
  const key = cacheKey(mediaType, body.fileBase64);
  const cached = cacheGet(key);
  if (cached !== null) {
    return NextResponse.json({ fields: cached, cached: true });
  }

  // Build the Claude content block. PDFs use the "document" type;
  // images use "image". Both wrap a base64 source identically.
  const contentBlock =
    mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf",
            data: body.fileBase64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: body.fileBase64,
          },
        };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: "Extract the affection plan / DCR fields as JSON per the schema.",
              },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("[parse-affection-plan] anthropic:", r.status, errText);
      return NextResponse.json(
        { error: `anthropic_${r.status}` },
        { status: 502 },
      );
    }

    const data = (await r.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
    // Strip ```json fences if the model adds them despite the rule.
    const jsonText = raw.replace(/```json\s*|\s*```/g, "").trim();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "parse_failed", raw },
        { status: 502 },
      );
    }

    cachePut(key, parsed);
    return NextResponse.json({ fields: parsed, cached: false });
  } catch (e) {
    console.error("[parse-affection-plan] failed:", e);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}
