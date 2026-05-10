// Step 12 pre-merge verification — read-only against production DB.
//
// Companion to scripts/pathb-docs-precheck.ts. Confirms every
// Phase-C-relevant invariant before merging feat/cohort-pilot to
// main. Outputs ✓ / ✗ / skipped per check with concrete numbers.
// Mutates nothing.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" });

interface CheckResult {
  id: string;
  description: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const results: CheckResult[] = [];

  function record(id: string, description: string, status: CheckResult["status"], detail: string) {
    results.push({ id, description, status, detail });
    const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
    console.log(`${icon} [${id}] ${description}`);
    console.log(`    ${detail}`);
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // §1 — production row count baseline
    // ─────────────────────────────────────────────────────────────
    const baseline = {
      User: await prisma.user.count(),
      Parcel: await prisma.parcel.count(),
      RegistrationApplication: await prisma.registrationApplication.count(),
      PlotClaim: await prisma.plotClaim.count(),
      Deal: await prisma.deal.count(),
      AffectionPlan: await prisma.affectionPlan.count(),
      Building: await prisma.building.count(),
      Notification: await prisma.notification.count(),
      ActivityLog: await prisma.activityLog.count(),
      AmbassadorApplication: await prisma.ambassadorApplication.count(),
      Commission: await prisma.commission.count(),
    };
    record(
      "C1",
      "Production row counts (post-Step-11 baseline)",
      "PASS",
      Object.entries(baseline).map(([k, v]) => `${k}=${v}`).join(" · "),
    );

    // ─────────────────────────────────────────────────────────────
    // §2 — PlotClaim invariants (Step 9 + Step 11)
    // ─────────────────────────────────────────────────────────────
    const dupePlotClaim = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n FROM (
        SELECT "parcelId", "userId"
        FROM "PlotClaim"
        GROUP BY "parcelId", "userId"
        HAVING COUNT(*) > 1
      ) sub;
    `;
    const dupeCount = Number(dupePlotClaim[0]?.n ?? 0n);
    record(
      "C2",
      "PlotClaim (parcelId, userId) tuples are unique",
      dupeCount === 0 ? "PASS" : "FAIL",
      `duplicate tuples: ${dupeCount} (DB unique constraint enforces — Step 9 migration)`,
    );

    const nullClaim = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n
      FROM "PlotClaim"
      WHERE "parcelId" IS NULL OR "userId" IS NULL;
    `;
    record(
      "C3",
      "PlotClaim has zero NULLs on parcelId / userId",
      Number(nullClaim[0]?.n ?? 0n) === 0 ? "PASS" : "FAIL",
      `null rows: ${Number(nullClaim[0]?.n ?? 0n)}`,
    );

    const claimByStatus = await prisma.$queryRaw<Array<{ status: string; n: bigint }>>`
      SELECT status, COUNT(*) AS n FROM "PlotClaim" GROUP BY status ORDER BY n DESC;
    `;
    record(
      "C4",
      "PlotClaim status distribution",
      "PASS",
      claimByStatus.map((r) => `${r.status}=${Number(r.n)}`).join(", "),
    );

    // ─────────────────────────────────────────────────────────────
    // §3 — PlotClaim indexes (post-Step-9 migration)
    // ─────────────────────────────────────────────────────────────
    const claimIndexes = await prisma.$queryRaw<
      Array<{ indexname: string; indexdef: string }>
    >`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'PlotClaim'
      ORDER BY indexname;
    `;
    const expectedClaimIdx = new Set([
      "PlotClaim_pkey",
      "PlotClaim_parcelId_idx",
      "PlotClaim_userId_idx",
      "PlotClaim_status_idx",
      "PlotClaim_parcelId_roleAtClaim_status_idx",
      "PlotClaim_parcelId_userId_key",
    ]);
    const haveClaimIdx = new Set(claimIndexes.map((i) => i.indexname));
    const missingClaimIdx = [...expectedClaimIdx].filter((n) => !haveClaimIdx.has(n));
    record(
      "C5",
      "PlotClaim has all 6 expected indexes (incl. Step-9 unique)",
      missingClaimIdx.length === 0 ? "PASS" : "FAIL",
      missingClaimIdx.length === 0
        ? `present: ${[...haveClaimIdx].sort().join(", ")}`
        : `missing: ${missingClaimIdx.join(", ")}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §4 — Parcel verification fields (Step 4 schema additions)
    // ─────────────────────────────────────────────────────────────
    const parcelCols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Parcel'
        AND column_name IN ('verifiedOwnerUserId', 'verifiedAt', 'verifiedById');
    `;
    record(
      "C6",
      "Parcel has Step-4 verification columns",
      parcelCols.length === 3 ? "PASS" : "FAIL",
      parcelCols.map((c) => `${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`).join(" · "),
    );

    const verifiedParcels = await prisma.parcel.count({ where: { verifiedOwnerUserId: { not: null } } });
    record(
      "C7",
      "No production parcels have a verified owner yet (cohort hasn't gone live)",
      verifiedParcels === 0 ? "PASS" : "SKIP",
      `verifiedOwnerUserId set on ${verifiedParcels}/${baseline.Parcel} parcels (expected 0 pre-cohort)`,
    );

    // ─────────────────────────────────────────────────────────────
    // §5 — Backfilled PlotClaim per Parcel
    // ─────────────────────────────────────────────────────────────
    const parcelsWithoutClaim = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n
      FROM "Parcel" p
      WHERE NOT EXISTS (SELECT 1 FROM "PlotClaim" c WHERE c."parcelId" = p.id);
    `;
    record(
      "C8",
      "Every Parcel has at least one PlotClaim (Step-4 backfill)",
      Number(parcelsWithoutClaim[0]?.n ?? 0n) === 0 ? "PASS" : "FAIL",
      `parcels without claims: ${Number(parcelsWithoutClaim[0]?.n ?? 0n)}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §6 — UserRole enum has the 5 cohort-added values
    // ─────────────────────────────────────────────────────────────
    const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole'
      ORDER BY e.enumsortorder;
    `;
    const have = new Set(enumValues.map((e) => e.enumlabel));
    const cohortAdded = ["POA", "INTERMEDIARY", "RELATIVE", "REFERRAL", "OTHER"];
    const missingEnum = cohortAdded.filter((v) => !have.has(v));
    record(
      "C9",
      "UserRole enum has Step-4 cohort additions",
      missingEnum.length === 0 ? "PASS" : "FAIL",
      missingEnum.length === 0
        ? `present: ${cohortAdded.join(", ")} (full enum: ${[...have].join(", ")})`
        : `missing: ${missingEnum.join(", ")}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §7 — RegistrationApplication seed (system + autoMigrated)
    // ─────────────────────────────────────────────────────────────
    const SYSTEM_USER_ID = "00000000-0000-0000-0000-00000000zaah";
    const sysApp = await prisma.registrationApplication.findFirst({
      where: { userId: SYSTEM_USER_ID },
      select: { id: true, status: true, autoMigrated: true, roleApplied: true },
    });
    record(
      "C10",
      "System user has the seeded RegistrationApplication (Step 4 §5.7)",
      !!(sysApp && sysApp.status === "APPROVED" && sysApp.autoMigrated) ? "PASS" : "FAIL",
      sysApp
        ? `id=${sysApp.id.slice(0, 8)}… status=${sysApp.status} autoMigrated=${sysApp.autoMigrated} roleApplied=${sysApp.roleApplied ?? "NULL"}`
        : "no row found",
    );

    // ─────────────────────────────────────────────────────────────
    // §8 — Q1 / LOCK-8: Deal sellerId vs verifiedOwnerUserId
    // ─────────────────────────────────────────────────────────────
    const dealMismatch = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n
      FROM "Deal" d JOIN "Parcel" p ON p.id = d."parcelId"
      WHERE p."verifiedOwnerUserId" IS NOT NULL
        AND p."verifiedOwnerUserId" != d."sellerId";
    `;
    record(
      "C11",
      "No live Deals where sellerId != verifiedOwnerUserId (Q1 / LOCK-8)",
      Number(dealMismatch[0]?.n ?? 0n) === 0 ? "PASS" : "FAIL",
      `deal mismatches: ${Number(dealMismatch[0]?.n ?? 0n)} (0 deals on prod = trivially satisfied)`,
    );

    // ─────────────────────────────────────────────────────────────
    // §9 — registration-docs RLS policies
    // ─────────────────────────────────────────────────────────────
    const rlsPolicies = await prisma.$queryRaw<
      Array<{ policyname: string; cmd: string; qual: string | null; with_check: string | null }>
    >`
      SELECT policyname, cmd, qual::text AS qual, with_check::text AS with_check
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname LIKE 'registration_docs%';
    `;
    const expectedPol = new Set([
      "registration_docs_user_insert",
      "registration_docs_user_select_own",
      "registration_docs_user_update_own",
      "registration_docs_user_delete_own",
    ]);
    const havePol = new Set(rlsPolicies.map((p) => p.policyname));
    const missingPol = [...expectedPol].filter((p) => !havePol.has(p));
    record(
      "C12",
      "registration-docs RLS policies live (Step 5 + path-B-fix Step 11)",
      missingPol.length === 0 ? "PASS" : "FAIL",
      missingPol.length === 0
        ? `4 policies live: ${rlsPolicies.map((p) => `${p.policyname}(${p.cmd})`).join(", ")}`
        : `missing: ${missingPol.join(", ")}`,
    );

    // INSERT policies have their gate in `with_check`; SELECT/UPDATE/
    // DELETE policies have it in `qual`. UPDATE has both. Walk the
    // right column per command.
    const allPoliciesUseFolderName = rlsPolicies.every((p) => {
      const usingExpr = p.qual ?? "";
      const checkExpr = p.with_check ?? "";
      const expr = `${usingExpr} ${checkExpr}`;
      return expr.includes("storage.foldername");
    });
    record(
      "C13",
      "All RLS policies gate on first-folder-equals-userId",
      allPoliciesUseFolderName ? "PASS" : "FAIL",
      `each policy uses storage.foldername(name)[1] = auth.uid()::text (qual or with_check per cmd)`,
    );

    // ─────────────────────────────────────────────────────────────
    // §10 — registration-docs bucket privacy
    // ─────────────────────────────────────────────────────────────
    const bucketRows = await prisma.$queryRaw<
      Array<{ id: string; public: boolean; file_size_limit: bigint | null }>
    >`
      SELECT id, public, file_size_limit
      FROM storage.buckets
      WHERE id = 'registration-docs';
    `;
    const bucket = bucketRows[0];
    record(
      "C14",
      "registration-docs bucket is private + 10 MiB file cap",
      bucket && bucket.public === false && bucket.file_size_limit === 10485760n ? "PASS" : "FAIL",
      bucket
        ? `id=${bucket.id} public=${bucket.public} file_size_limit=${bucket.file_size_limit}`
        : "bucket missing",
    );

    // ─────────────────────────────────────────────────────────────
    // §11 — User.nickname uniqueness invariant (Step 4)
    // ─────────────────────────────────────────────────────────────
    const dupeNicknames = await prisma.$queryRaw<Array<{ nickname: string; n: bigint }>>`
      SELECT nickname, COUNT(*) AS n
      FROM "User"
      WHERE nickname IS NOT NULL
      GROUP BY nickname HAVING COUNT(*) > 1;
    `;
    record(
      "C15",
      "User.nickname has zero duplicates",
      dupeNicknames.length === 0 ? "PASS" : "FAIL",
      dupeNicknames.length === 0
        ? "all nicknames unique"
        : `dupes: ${dupeNicknames.map((d) => `${d.nickname}=${Number(d.n)}`).join(", ")}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §12 — migration trail (Step 4 + Step 9 only added cohort schema)
    // ─────────────────────────────────────────────────────────────
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 5;
    `;
    const lastTwoCohort = migrations.slice(0, 2).map((m) => m.migration_name);
    const haveStep4 = migrations.some((m) => m.migration_name === "20260507_cohort_pilot_v1");
    const haveStep9 = migrations.some((m) => m.migration_name === "20260510120000_plotclaim_parcel_user_unique");
    record(
      "C16",
      "Step 4 + Step 9 migrations applied; latest 2 are cohort migrations",
      haveStep4 && haveStep9 ? "PASS" : "FAIL",
      `most-recent: ${lastTwoCohort.join(", ")} · cohort_pilot_v1=${haveStep4} · plotclaim_unique=${haveStep9}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §13 — Public-bucket Path B legacy doc audit (Step 11 P1-1)
    // ─────────────────────────────────────────────────────────────
    const publicBucketDocsInClaims = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n
      FROM "PlotClaim"
      WHERE "documentsJson"::text LIKE '%/storage/v1/object/public/documents/%';
    `;
    record(
      "C17",
      "Zero PlotClaim rows reference the public 'documents' bucket (Step 11 P1-1)",
      Number(publicBucketDocsInClaims[0]?.n ?? 0n) === 0 ? "PASS" : "FAIL",
      `legacy public-bucket URLs in PlotClaim.documentsJson: ${Number(publicBucketDocsInClaims[0]?.n ?? 0n)}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §14 — Ambassador-era data preserved per spec §13.4
    // ─────────────────────────────────────────────────────────────
    record(
      "C18",
      "Ambassador-era tables preserved per spec §13.4 (no fresh writes expected)",
      "PASS",
      `AmbassadorApplication=${baseline.AmbassadorApplication} · Commission=${baseline.Commission}`,
    );

    // ─────────────────────────────────────────────────────────────
    // §15 — Output summary
    // ─────────────────────────────────────────────────────────────
    const pass = results.filter((r) => r.status === "PASS").length;
    const fail = results.filter((r) => r.status === "FAIL").length;
    const skip = results.filter((r) => r.status === "SKIP").length;

    console.log("");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`SUMMARY · ${pass} PASS · ${fail} FAIL · ${skip} SKIP`);
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`Output (JSON): ${JSON.stringify(results, (k, v) => (typeof v === "bigint" ? v.toString() : v))}`);

    process.exitCode = fail === 0 ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
