// Shared safety gate for every script under scripts/ that writes to the
// database. Import it and call assertProdWriteAllowed() immediately after
// the imports — before the Prisma client is built, so an unflagged run
// exits before any connection is opened.
//
// Why this exists: commit 004f532 records a Burj Khalifa row landing in
// production because a "type check" was run with tsx. tsx EXECUTES the
// file it is given; it does not lint it. There is no flag that makes it
// lint. The guard turns that class of accident into a no-op exit.
//
// Run a writer deliberately:
//   ALLOW_PROD_WRITE=1 npx tsx scripts/seed-something.ts
//
// Check types without running anything:
//   pnpm typecheck:scripts        (tsc --noEmit over scripts/)
//
// Read-only scripts (counts, precheck, verify) deliberately do NOT call
// this — they are safe to run unflagged.

/** Host of the configured database, credentials stripped. "" when unknown. */
function targetHost(): string {
  const url = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/**
 * Exits the process unless ALLOW_PROD_WRITE=1 is set in the environment.
 * Call at module scope so it fires even when the file is executed by
 * accident (tsx, a stray `node --import tsx`, an editor "run file" action).
 */
export function assertProdWriteAllowed(): void {
  if (process.env.ALLOW_PROD_WRITE === "1") return;

  const script = process.argv[1]
    ? process.argv[1].replace(`${process.cwd()}/`, "")
    : "this script";
  const host = targetHost();

  const lines: (string | null)[] = [
    "",
    `  REFUSING TO RUN — ${script} writes to the database.`,
    "",
    "  Nothing was executed. No connection was opened.",
    host ? `  Configured target: ${host}` : null,
    "",
    "  To run it deliberately:",
    `    ALLOW_PROD_WRITE=1 npx tsx ${script}`,
    "",
    "  If you were checking types: tsx EXECUTES files, it does not lint",
    "  them. Use instead:",
    "    pnpm typecheck:scripts",
    "",
  ];
  console.error(lines.filter((line) => line !== null).join("\n"));
  process.exit(1);
}
