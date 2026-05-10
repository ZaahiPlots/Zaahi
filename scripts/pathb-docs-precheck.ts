// Read-only pre-check for the Path B → registration-docs bucket
// migration (Step 11 §12.1). Counts the Path B documents that
// currently sit in the public `documents` bucket (uploaded by
// /api/parcels/submit + AddPlotModal Broker / Owner flows pre-Step-9).
//
// Sources of Path B doc URLs:
//   1. AffectionPlan.raw.documents[]  ← from /api/parcels/submit
//      (every submission's payload is appended as a fresh AP row).
//   2. PlotClaim.documentsJson[] with `.url` field (Path B writes the
//      claim alongside the parcel; Path C uses `.path` instead).
//
// We surface counts + a sample of paths so we can plan the move.
// Nothing is mutated.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" });

interface DocLike {
  url?: string;
  path?: string;
  kind?: string;
  name?: string;
  originalName?: string;
}

function parseUrlForBucketPath(url: string): { bucket: string; path: string } | null {
  // Supabase public URL shape:
  // https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    // ── 1. AffectionPlan rows that came from the submit flow ─────────
    const aps = await prisma.affectionPlan.findMany({
      where: { source: { startsWith: "submission:" } },
      select: { id: true, parcelId: true, source: true, raw: true, fetchedAt: true },
      orderBy: { fetchedAt: "asc" },
    });
    console.log(`Submission AffectionPlan rows: ${aps.length}`);
    let apDocs = 0;
    let apDocsByBucket = new Map<string, number>();
    const apSample: Array<{ apId: string; parcelId: string; bucket: string; path: string }> = [];
    for (const ap of aps) {
      const raw = ap.raw as { documents?: DocLike[] } | null;
      const docs = raw?.documents ?? [];
      for (const d of docs) {
        if (typeof d.url === "string") {
          apDocs++;
          const parsed = parseUrlForBucketPath(d.url);
          const bucket = parsed?.bucket ?? "unparseable";
          apDocsByBucket.set(bucket, (apDocsByBucket.get(bucket) ?? 0) + 1);
          if (parsed && apSample.length < 5) {
            apSample.push({ apId: ap.id, parcelId: ap.parcelId, bucket: parsed.bucket, path: parsed.path });
          }
        }
      }
    }
    console.log(`AffectionPlan.raw.documents items: ${apDocs}`);
    for (const [b, n] of apDocsByBucket) console.log(`  bucket "${b}": ${n}`);
    if (apSample.length > 0) {
      console.log(`Sample AP doc paths:`);
      for (const s of apSample) console.log(`  AP=${s.apId.slice(0, 8)}… parcel=${s.parcelId.slice(0, 8)}… bucket=${s.bucket} path=${s.path}`);
    }

    // ── 2. PlotClaim.documentsJson with .url shape (Path B claims) ──
    const claims = await prisma.plotClaim.findMany({
      where: { documentsJson: { not: { equals: null } } },
      select: { id: true, parcelId: true, userId: true, roleAtClaim: true, documentsJson: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    let claimUrlDocs = 0;
    let claimPathDocs = 0;
    const claimUrlSample: Array<{ claimId: string; parcelId: string; bucket: string; path: string }> = [];
    let claimsWithUrlShape = 0;
    let claimsWithPathShape = 0;
    for (const c of claims) {
      const docs = (c.documentsJson as DocLike[] | null) ?? [];
      let hasUrl = false;
      let hasPath = false;
      for (const d of docs) {
        if (typeof d.url === "string") {
          claimUrlDocs++;
          hasUrl = true;
          const parsed = parseUrlForBucketPath(d.url);
          if (parsed && claimUrlSample.length < 5) {
            claimUrlSample.push({ claimId: c.id, parcelId: c.parcelId, bucket: parsed.bucket, path: parsed.path });
          }
        }
        if (typeof d.path === "string") {
          claimPathDocs++;
          hasPath = true;
        }
      }
      if (hasUrl) claimsWithUrlShape++;
      if (hasPath) claimsWithPathShape++;
    }
    console.log(`PlotClaim with documentsJson: ${claims.length}`);
    console.log(`  using .url (Path B): ${claimUrlDocs} docs across ${claimsWithUrlShape} claims`);
    console.log(`  using .path (Path C): ${claimPathDocs} docs across ${claimsWithPathShape} claims`);
    if (claimUrlSample.length > 0) {
      console.log(`Sample Path B claim doc paths:`);
      for (const s of claimUrlSample)
        console.log(`  claim=${s.claimId.slice(0, 8)}… parcel=${s.parcelId.slice(0, 8)}… bucket=${s.bucket} path=${s.path}`);
    }

    // ── 3. Cross-check: verifiedOwnerUserId column state ───────────
    const verifiedParcels = await prisma.parcel.count({ where: { verifiedOwnerUserId: { not: null } } });
    const allParcels = await prisma.parcel.count();
    console.log(`Parcels with verifiedOwnerUserId set: ${verifiedParcels} / ${allParcels}`);

    // ── 4. Q1: Deals where seller != verified owner ────────────────
    const totalDeals = await prisma.deal.count();
    let mismatch = 0;
    if (totalDeals > 0) {
      const mismatchRows = await prisma.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*) AS n
        FROM "Deal" d
        JOIN "Parcel" p ON p.id = d."parcelId"
        WHERE p."verifiedOwnerUserId" IS NOT NULL
          AND p."verifiedOwnerUserId" != d."sellerId";
      `;
      mismatch = Number(mismatchRows[0]?.n ?? 0n);
    }
    console.log(`Deal rows: ${totalDeals}; rows with sellerId != verifiedOwnerUserId: ${mismatch}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
