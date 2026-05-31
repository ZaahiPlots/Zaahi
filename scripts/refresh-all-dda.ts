// Bulk DDA refresh CLI — public-listing parcels only.
//
// Founder spec 2026-05-31: one admin action to refresh DDA-derived data
// (polygon + latest affection plan) across the public ZAAHI listings
// catalogue. Replaces the per-plot UI button the founder removed
// (triggerDdaFetch in SidePanel.tsx is preserved for any future
// per-plot admin reuse, but no longer mounted on the user-facing card).
//
// Why a CLI and not an /api endpoint:
//   - Vercel function timeout (Hobby 10s, Pro 60s on legacy tier) can't
//     cover N × ~3-5s DDA round-trips for 100+ parcels in one invocation.
//   - Sequential rate-limiting (~1 req/s) is trivial in Node.
//   - Same workflow founder already runs for seed-6458042.ts — pull
//     prod env via `vercel env pull`, then `npx tsx -r dotenv/config`.
//
// Safety:
//   - Prod-host guard: refuses to run unless DATABASE_URL targets the
//     prod Supabase project (sydmaxwjmwwnzbwvhrhn). Same pattern as
//     scripts/backfill-vault-affection-plans.ts. Local .env.local
//     points at a different DB and has caused incidents before
//     (CLAUDE.md "Local .env.local DIRECT_URL ≠ Vercel prod", P2022
//     outage 2026-05-29).
//   - VAULT_PRIVATE parcels are intentionally NOT included: vault
//     entries are owner-private and each owner refreshes their own
//     plot through the vault wizard. This script touches only the
//     public listings surface (LISTED / VERIFIED / IN_DEAL).
//   - Per-parcel try/catch (inside refreshDdaForParcel): one failure
//     never halts the batch; failures are logged with the reason.
//   - Append-only AffectionPlan history per CLAUDE.md (NEVER
//     deleteMany). Re-running the script the next day picks up only
//     the rows that became stale again.
//
// Flags:
//   --since=2026-04-01    Override the default 30-day staleness window.
//                         Parcels whose latest fetchedAt is younger
//                         than the cutoff are skipped.
//   --district=ARJAN      Optional district scope. Case-sensitive,
//                         exact match against Parcel.district.
//
// Run (prod):
//   vercel env pull /tmp/.env.prod --environment=production
//   npx tsx -r dotenv/config scripts/refresh-all-dda.ts \
//     dotenv_config_path=/tmp/.env.prod
//
//   Optional scopes:
//     npx tsx -r dotenv/config scripts/refresh-all-dda.ts \
//       --since=2026-04-01 dotenv_config_path=/tmp/.env.prod
//     npx tsx -r dotenv/config scripts/refresh-all-dda.ts \
//       --district=ARJAN dotenv_config_path=/tmp/.env.prod

import { ParcelStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refreshDdaForParcel } from "@/lib/refresh-dda";

const PUBLIC_STATUSES: ParcelStatus[] = [
  ParcelStatus.LISTED,
  ParcelStatus.VERIFIED,
  ParcelStatus.IN_DEAL,
];

const DEFAULT_STALE_DAYS = 30;
const SLEEP_MS_BETWEEN_PARCELS = 1_000;

interface CliArgs {
  sinceISO: string;
  district: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  let sinceRaw: string | null = null;
  let district: string | null = null;
  for (const a of argv) {
    if (a.startsWith("--since=")) sinceRaw = a.slice("--since=".length);
    else if (a.startsWith("--district=")) district = a.slice("--district=".length);
  }
  const sinceISO =
    sinceRaw ??
    new Date(Date.now() - DEFAULT_STALE_DAYS * 86_400_000).toISOString();
  if (Number.isNaN(Date.parse(sinceISO))) {
    throw new Error(`Invalid --since=${sinceRaw} (expected ISO date)`);
  }
  return { sinceISO, district };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
  // Prod-host guard — same shape as backfill-vault-affection-plans.ts.
  const dbUrl = process.env.DATABASE_URL ?? "";
  const host = dbUrl.match(/@([^/]+)/)?.[1] ?? "(none)";
  if (!dbUrl.includes("sydmaxwjmwwnzbwvhrhn")) {
    throw new Error(
      `Refusing to run — DATABASE_URL host="${host}" does not contain "sydmaxwjmwwnzbwvhrhn"`,
    );
  }
  console.log("[refresh-all-dda] DB host:  ", host);

  const args = parseArgs(process.argv.slice(2));
  const since = new Date(args.sinceISO);
  console.log("[refresh-all-dda] since:    ", args.sinceISO);
  console.log("[refresh-all-dda] district: ", args.district ?? "(all)");
  console.log("[refresh-all-dda] statuses: ", PUBLIC_STATUSES.join(", "));

  const where: { status: { in: ParcelStatus[] }; district?: string } = {
    status: { in: PUBLIC_STATUSES },
  };
  if (args.district) where.district = args.district;

  const candidates = await prisma.parcel.findMany({
    where,
    select: {
      id: true,
      plotNumber: true,
      district: true,
      status: true,
      affectionPlans: {
        select: { fetchedAt: true },
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("[refresh-all-dda] candidates:", candidates.length);

  type Job = { id: string; plotNumber: string; latestISO: string };
  const jobs: Job[] = [];
  let skippedFresh = 0;
  for (const p of candidates) {
    const latest = p.affectionPlans[0]?.fetchedAt ?? null;
    if (latest && latest > since) {
      skippedFresh++;
      continue;
    }
    jobs.push({
      id: p.id,
      plotNumber: p.plotNumber,
      latestISO: latest ? latest.toISOString() : "(none)",
    });
  }
  console.log("[refresh-all-dda] stale:     ", jobs.length);
  console.log("[refresh-all-dda] fresh:     ", skippedFresh);
  console.log("");

  if (jobs.length === 0) {
    console.log("[refresh-all-dda] nothing to do.");
    return;
  }

  let ok = 0;
  let failed = 0;
  let i = 0;
  for (const job of jobs) {
    i++;
    const res = await refreshDdaForParcel(job.id, job.plotNumber);
    if (res.ok) {
      ok++;
      console.log(
        `[refresh-all-dda] ${i}/${jobs.length} OK   ${job.plotNumber}  ${res.durationMs}ms  ${res.reason}`,
      );
    } else {
      failed++;
      console.warn(
        `[refresh-all-dda] ${i}/${jobs.length} FAIL ${job.plotNumber}  ${res.durationMs}ms  ${res.reason}`,
      );
    }
    if (i < jobs.length) await sleep(SLEEP_MS_BETWEEN_PARCELS);
  }

  console.log("");
  console.log("=== Refresh summary ===");
  console.log("candidates:   ", candidates.length);
  console.log("skipped-fresh:", skippedFresh);
  console.log("processed:    ", jobs.length);
  console.log("  ok:         ", ok);
  console.log("  failed:     ", failed);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
