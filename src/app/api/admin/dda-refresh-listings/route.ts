// POST /api/admin/dda-refresh-listings
//
// Admin-gated bulk DDA refresh for public ZAAHI listings (LISTED /
// VERIFIED / IN_DEAL). Streams NDJSON progress so the admin UI can
// render live counts during the ~5-10 min batch.
//
// Wire-up over the existing CLI scripts/refresh-all-dda.ts (founder
// spec 2026-05-31). Safety inherits from src/lib/refresh-dda.ts —
// geometry + AffectionPlan only, NEVER currentValuation / status /
// ownerId / verifiedOwnerUserId / PlotClaim. Re-running is safe
// because writeAffectionPlan appends a new row (CLAUDE.md "NEVER
// deleteMany on AffectionPlan").
//
// Vercel runtime note: requires Pro plan with Fluid Functions
// (maxDuration=800). On Hobby (10 s cap) only the first ~3 plots
// finish before the function is killed; each per-plot commit is
// independent so partial progress is persisted. Re-running picks
// up via the staleness window.

import { NextRequest, NextResponse } from "next/server";
import { ParcelStatus } from "@prisma/client";
import { getAdminUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshDdaForParcel } from "@/lib/refresh-dda";

export const runtime = "nodejs";
export const maxDuration = 800;

const PUBLIC_STATUSES: ParcelStatus[] = [
  ParcelStatus.LISTED,
  ParcelStatus.VERIFIED,
  ParcelStatus.IN_DEAL,
];
const DEFAULT_STALE_DAYS = 30;
const SLEEP_MS_BETWEEN_PARCELS = 1_000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { sinceISO?: string; district?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — defaults apply.
  }

  const since = body.sinceISO
    ? new Date(body.sinceISO)
    : new Date(Date.now() - DEFAULT_STALE_DAYS * 86_400_000);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "invalid_since" }, { status: 400 });
  }

  const where: { status: { in: ParcelStatus[] }; district?: string } = {
    status: { in: PUBLIC_STATUSES },
  };
  if (body.district) where.district = body.district;

  const candidates = await prisma.parcel.findMany({
    where,
    select: {
      id: true,
      plotNumber: true,
      district: true,
      affectionPlans: {
        select: { fetchedAt: true },
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  type Job = { id: string; plotNumber: string };
  const jobs: Job[] = [];
  let skippedFresh = 0;
  for (const p of candidates) {
    const latest = p.affectionPlans[0]?.fetchedAt ?? null;
    if (latest && latest > since) {
      skippedFresh++;
      continue;
    }
    jobs.push({ id: p.id, plotNumber: p.plotNumber });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      send({
        kind: "start",
        candidates: candidates.length,
        total: jobs.length,
        skippedFresh,
        sinceISO: since.toISOString(),
        startedAt: new Date().toISOString(),
      });

      if (jobs.length === 0) {
        send({ kind: "done", ok: 0, failed: 0, failures: [] });
        controller.close();
        return;
      }

      let ok = 0;
      let failed = 0;
      const failures: Array<{ plotNumber: string; reason: string }> = [];

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const res = await refreshDdaForParcel(job.id, job.plotNumber);
        if (res.ok) ok++;
        else {
          failed++;
          failures.push({ plotNumber: job.plotNumber, reason: res.reason });
        }
        send({
          kind: "progress",
          i: i + 1,
          n: jobs.length,
          plotNumber: job.plotNumber,
          ok,
          failed,
          durationMs: res.durationMs,
          reason: res.reason,
        });
        if (i < jobs.length - 1) await sleep(SLEEP_MS_BETWEEN_PARCELS);
      }

      send({ kind: "done", ok, failed, failures: failures.slice(0, 50) });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
