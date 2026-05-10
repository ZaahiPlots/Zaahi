// Read-only pre-checks for the @@unique([parcelId, userId]) migration.
// Run via `npx tsx /tmp/plotclaim-precheck.ts` from the project root.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    // 1. Total rows (expected: 118)
    const total = await prisma.plotClaim.count();
    console.log(`PlotClaim total rows: ${total}`);

    // 2. Duplicate (parcelId, userId) tuples — must be 0
    const dupes = await prisma.$queryRaw<
      Array<{ parcelId: string; userId: string; n: bigint }>
    >`
      SELECT "parcelId", "userId", COUNT(*) AS n
      FROM "PlotClaim"
      GROUP BY "parcelId", "userId"
      HAVING COUNT(*) > 1
      ORDER BY n DESC
      LIMIT 50;
    `;
    console.log(`Duplicate (parcelId, userId) tuples: ${dupes.length}`);
    if (dupes.length > 0) {
      console.log(JSON.stringify(dupes.map((d) => ({ ...d, n: Number(d.n) })), null, 2));
    }

    // 3. NULL guard sanity (parcelId, userId are NOT NULL by schema, but
    //    confirm — adding a unique on a column that has NULLs would still
    //    work in PG but we want to know).
    const nulls = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n
      FROM "PlotClaim"
      WHERE "parcelId" IS NULL OR "userId" IS NULL;
    `;
    console.log(`Rows with NULL parcelId or userId: ${Number(nulls[0]?.n ?? 0n)}`);

    // 4. Existing indexes / constraints on PlotClaim (so we can see what's
    //    there before we add a new one).
    const indexes = await prisma.$queryRaw<
      Array<{ indexname: string; indexdef: string }>
    >`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'PlotClaim'
      ORDER BY indexname;
    `;
    console.log(`Existing PlotClaim indexes (${indexes.length}):`);
    for (const ix of indexes) {
      console.log(`  ${ix.indexname}\n    ${ix.indexdef}`);
    }

    // 5. Roles distribution — confirm only ADMIN claims exist today
    //    (matches the audit "118 backfilled" claim).
    const roles = await prisma.$queryRaw<Array<{ roleAtClaim: string; n: bigint; statuses: string }>>`
      SELECT "roleAtClaim",
             COUNT(*) AS n,
             string_agg(DISTINCT "status"::text, ',') AS statuses
      FROM "PlotClaim"
      GROUP BY "roleAtClaim"
      ORDER BY n DESC;
    `;
    console.log(`PlotClaim by role:`);
    for (const r of roles) {
      console.log(`  ${r.roleAtClaim}: ${Number(r.n)} (status: ${r.statuses})`);
    }

    // 6. PG server version + table size — context for lock-duration risk.
    const version = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version();
    `;
    console.log(`PG version: ${version[0]?.version?.slice(0, 80)}…`);

    const sz = await prisma.$queryRaw<Array<{ pretty: string; rows_estimate: bigint }>>`
      SELECT pg_size_pretty(pg_total_relation_size('"PlotClaim"')) AS pretty,
             reltuples::bigint AS rows_estimate
      FROM pg_class
      WHERE relname = 'PlotClaim';
    `;
    console.log(`PlotClaim size: ${sz[0]?.pretty} (~${Number(sz[0]?.rows_estimate ?? 0n)} rows)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
