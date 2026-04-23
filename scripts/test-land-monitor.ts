// Ad-hoc smoke test for Spec 09 descoped MVP · Land Monitor ingest.
// Run with: pnpm tsx scripts/test-land-monitor.ts (env loaded from .env.local)
// This script is a one-off and is not part of the shipped product surface.

import "dotenv/config";
import { runIngest } from "../src/lib/land-monitor/ingest";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY missing");
    process.exit(1);
  }
  console.log("Starting ingest…");
  const r = await runIngest({ anthropicKey: apiKey, maxLlmCalls: 15 });
  console.log("\n=== Stats ===");
  console.log(JSON.stringify(r.stats, null, 2));
  console.log("\n=== First 3 items with extraction ===");
  const extracted = r.items.filter((i) => i.extracted).slice(0, 3);
  console.log(JSON.stringify(extracted, null, 2));
  console.log("\n=== Matched items ===");
  const matched = r.items.filter((i) => i.match);
  console.log(`${matched.length} items matched to plots/communities`);
  matched.slice(0, 5).forEach((i) => {
    console.log(`- ${i.sourceLabel}: ${i.title.slice(0, 80)}`);
    if (i.match) {
      console.log(
        `  tier=${i.match.tier} conf=${i.match.confidence} community=${i.match.community}`,
      );
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
