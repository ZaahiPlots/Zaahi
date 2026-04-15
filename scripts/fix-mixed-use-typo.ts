/**
 * Fix the `"MIXED USE"` → `"MIXED_USE"` land-use typo in
 * AffectionPlan.landUseMix rows.
 *
 * Background:
 *   The night audit (NIGHT_REPORT.md) flagged two AffectionPlan rows where a
 *   `landUseMix[i].category` value was stored as the string `"MIXED USE"`
 *   (space) instead of the canonical `"MIXED_USE"` (underscore). The 9
 *   canonical land-use categories all use underscore, so these rows silently
 *   fall out of every category filter / legend lookup. Founder approved this
 *   narrowly-scoped DB write; nothing else is touched.
 *
 * Scope:
 *   - Only rewrites the exact string "MIXED USE" to "MIXED_USE" inside
 *     category fields of landUseMix entries.
 *   - No schema changes, no new categories, no other data mutated.
 *
 * Idempotent:
 *   Re-running after the fix updates 0 rows (the query will find none).
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/fix-mixed-use-typo.ts \
 *     dotenv_config_path=.env.local
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

type Entry = { category?: string; sub?: string; areaSqm?: number } & Record<string, unknown>;

async function main() {
  // Small table — scan every AffectionPlan row and filter landUseMix in
  // memory rather than constructing a JSON-path query.
  const rows = await prisma.affectionPlan.findMany({
    select: { id: true, parcelId: true, plotNumber: true, landUseMix: true },
  });

  const affected: Array<{
    id: string;
    parcelId: string;
    plotNumber: string;
    before: Entry[];
    after: Entry[];
  }> = [];

  for (const row of rows) {
    const mix = row.landUseMix as unknown;
    if (!Array.isArray(mix)) continue;

    let dirty = false;
    const after = (mix as Entry[]).map((entry) => {
      if (entry && typeof entry === 'object' && entry.category === 'MIXED USE') {
        dirty = true;
        return { ...entry, category: 'MIXED_USE' };
      }
      return entry;
    });

    if (dirty) {
      affected.push({
        id: row.id,
        parcelId: row.parcelId,
        plotNumber: row.plotNumber,
        before: mix as Entry[],
        after,
      });
    }
  }

  console.log(`Scanned ${rows.length} AffectionPlan rows.`);
  console.log(`Rows with 'MIXED USE' typo: ${affected.length}`);

  if (affected.length === 0) {
    console.log('Nothing to fix. Exiting.');
    await prisma.$disconnect();
    return;
  }

  for (const a of affected) {
    console.log('---');
    console.log(`id=${a.id}  parcelId=${a.parcelId}  plotNumber=${a.plotNumber}`);
    console.log('  before:', JSON.stringify(a.before));
    console.log('  after: ', JSON.stringify(a.after));
  }

  // Persist the rewrites.
  for (const a of affected) {
    await prisma.affectionPlan.update({
      where: { id: a.id },
      data: { landUseMix: a.after as unknown as Prisma.InputJsonValue },
    });
  }

  // Verify — re-scan and confirm zero remaining occurrences.
  const verifyRows = await prisma.affectionPlan.findMany({
    select: { id: true, landUseMix: true },
  });
  let stillBad = 0;
  for (const row of verifyRows) {
    const mix = row.landUseMix as unknown;
    if (!Array.isArray(mix)) continue;
    for (const entry of mix as Entry[]) {
      if (entry && typeof entry === 'object' && entry.category === 'MIXED USE') {
        stillBad += 1;
        console.error(`STILL BAD: row=${row.id}`);
      }
    }
  }
  console.log('---');
  console.log(`Post-update verification: ${stillBad} rows still contain 'MIXED USE'.`);
  if (stillBad !== 0) process.exit(1);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
