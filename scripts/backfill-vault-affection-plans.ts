// One-shot backfill — vault entries whose linked Parcel has an
// AffectionPlan missing the fields the 3D renderer needs
// (buildingLimitGeometry, maxFloors, far, or maxHeightMeters).
//
// Phase 3.5 (2026-05-30). Cures vault entries added before the bug
// in ensureVaultPrivateParcel's early-return path was fixed —
// previously, when the Parcel already existed, the fresh client plan
// data was silently dropped, leaving the latest AffectionPlan row
// incomplete and the 3D building flat.
//
// What it does, per (caller-owned) VaultEntry with publicParcelId:
//   1. Fetch the parcel's latest AffectionPlan (top 1 desc fetchedAt).
//   2. If buildingLimitGeometry / maxFloors / far / maxHeightMeters
//      are all populated, skip.
//   3. Otherwise call maybeAppendAffectionPlan — which pulls fresh
//      data from DDA, compares against the latest, and appends a new
//      history row when it would improve coverage. Append-only per
//      CLAUDE.md.
//
// Safety:
//   - LOCK-8: never touches Parcel.ownerId.
//   - AffectionPlan: append-only, never deleteMany or update.
//   - VaultEntry: not touched.
//   - Prod-host guard: refuses to run unless DATABASE_URL points at
//     the prod Supabase project (sydmaxwjmwwnzbwvhrhn).
//   - Concurrency: serial. ~0.5–2s per entry (DDA round-trip).
//
// Run:
//   pnpm exec tsx scripts/backfill-vault-affection-plans.ts
//   (load prod env first — DATABASE_URL + DIRECT_URL pulled from
//    Vercel via `vercel env pull .env.local` per CLAUDE.md flow.)

import { prisma } from "@/lib/prisma";
import { maybeAppendAffectionPlan } from "@/lib/vault-affection-plan";

async function main() {
  // ── Prod-host guard ──
  // Matches the pattern in scripts/add-plot-1340498.ts. The hostname
  // of the prod pooler / direct URL contains the Supabase project
  // ref. If it's missing we refuse to run — local dev DBs differ
  // from prod and have caused incidents before
  // (see CLAUDE.md "Local .env.local DIRECT_URL ≠ Vercel prod").
  const dbUrl = process.env.DATABASE_URL ?? "";
  const host = dbUrl.match(/@([^/]+)/)?.[1] ?? "(none)";
  if (!dbUrl.includes("sydmaxwjmwwnzbwvhrhn")) {
    throw new Error(
      `Refusing to run — DATABASE_URL host="${host}" does not contain "sydmaxwjmwwnzbwvhrhn"`,
    );
  }
  console.log("[backfill] DB host:", host);

  // ── Candidate set ──
  // Caller-scope is intentional: we don't iterate across all owners,
  // because each vault row's publicParcel is shared and a single
  // append benefits every linked entry. We dedup parcels via Set so
  // we don't re-process when N users have the same plot in vault.
  const entries = await prisma.vaultEntry.findMany({
    where: { publicParcelId: { not: null } },
    select: { id: true, plotNumber: true, publicParcelId: true },
  });
  console.log("[backfill] vault entries with publicParcelId:", entries.length);

  const seen = new Set<string>();
  type Candidate = { parcelId: string; plotNumber: string };
  const queue: Candidate[] = [];
  for (const e of entries) {
    if (!e.publicParcelId) continue;
    if (seen.has(e.publicParcelId)) continue;
    seen.add(e.publicParcelId);
    queue.push({ parcelId: e.publicParcelId, plotNumber: e.plotNumber });
  }
  console.log("[backfill] unique parcels to evaluate:", queue.length);

  let evaluated = 0;
  let appended = 0;
  let skippedComplete = 0;
  let skippedNoPlan = 0;
  let errored = 0;

  for (const c of queue) {
    evaluated++;
    // Read the latest plan first so we can log what we found and
    // skip the DDA round-trip when the plan is already complete.
    const latest = await prisma.affectionPlan.findFirst({
      where: { parcelId: c.parcelId },
      orderBy: { fetchedAt: "desc" },
      select: {
        maxFloors: true,
        maxHeightMeters: true,
        far: true,
        buildingLimitGeometry: true,
      },
    });
    const complete =
      latest != null &&
      latest.buildingLimitGeometry != null &&
      latest.maxFloors != null &&
      latest.far != null &&
      latest.maxHeightMeters != null;
    if (complete) {
      skippedComplete++;
      continue;
    }

    const t0 = Date.now();
    const res = await maybeAppendAffectionPlan(c.parcelId, {
      plotNumber: c.plotNumber,
      clientPlan: null,
      clientBuildingLimit: null,
    });
    const ms = Date.now() - t0;

    if (res.appended) {
      appended++;
      console.log(
        `[backfill] APPEND  ${c.plotNumber}  parcel=${c.parcelId.slice(0, 8)}…  ${ms}ms`,
      );
    } else if (res.reason === "no-plan-data") {
      skippedNoPlan++;
      console.log(
        `[backfill] skip-no-data  ${c.plotNumber}  parcel=${c.parcelId.slice(0, 8)}…  ${ms}ms`,
      );
    } else if (res.reason === "latest-already-complete") {
      // Race: latest changed between our pre-read and the helper's
      // re-read. Count as complete.
      skippedComplete++;
    } else {
      errored++;
      console.warn(
        `[backfill] error  ${c.plotNumber}  parcel=${c.parcelId.slice(0, 8)}…  reason=${res.reason}  ${ms}ms`,
      );
    }
  }

  console.log("");
  console.log("=== Backfill summary ===");
  console.log("evaluated:        ", evaluated);
  console.log("appended:         ", appended);
  console.log("skipped (complete):", skippedComplete);
  console.log("skipped (no DDA): ", skippedNoPlan);
  console.log("errored:          ", errored);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
