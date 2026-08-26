// ZAAHI — DEBUG-gated logging.
//
// Production shipped a verbose `[ZAAHI]` / `[BUILDINGS]` / `[GLB]` trace to
// every visitor's browser console: record counts, internal layer ids and
// per-frame GLB progress. That leaks data volumes and internal structure, and
// it buries any real error in noise (audit 1.7 / 5.8, 2026-08-18).
//
// Rules, applied across src/:
//   - console.log      → debugLog  (silent unless DEBUG is on)
//   - console.warn on an expected/recoverable path → debugWarn (same gate)
//   - console.warn on a genuine failure            → console.error, kept
//   - console.error    → untouched
//
// Enabling DEBUG, either of:
//   1. NEXT_PUBLIC_ZAAHI_DEBUG=true at build time (server + browser), or
//   2. ?debug=1 on the URL — browser only, no rebuild, so support can ask a
//      user to reload with it and read back the same trace.
//
// The URL check is evaluated once per module load and wrapped, because this
// module is also imported by server code where `window` does not exist.

const ENV_DEBUG = process.env.NEXT_PUBLIC_ZAAHI_DEBUG === "true";

function urlDebug(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("debug") === "1";
  } catch {
    // Malformed URL or a locked-down embedding context — stay quiet.
    return false;
  }
}

export const IS_DEBUG: boolean = ENV_DEBUG || urlDebug();

/** Diagnostic trace. Silent unless DEBUG is on. Never use for failures. */
export function debugLog(...args: unknown[]): void {
  if (IS_DEBUG) console.log(...args);
}

/**
 * Warning on an expected, recoverable path (optional env var absent, 401 for
 * a signed-out visitor, a duplicate the code intends to swallow). Silent
 * unless DEBUG is on. If the operation actually failed, use console.error.
 */
export function debugWarn(...args: unknown[]): void {
  if (IS_DEBUG) console.warn(...args);
}
