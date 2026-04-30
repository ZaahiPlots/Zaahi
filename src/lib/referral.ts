// ── ZAAHI Referral (Phase A — Coming Soon stub) ─────────────────────
//
// Replaces the prior 3-tier paid Ambassador program (retired 2026-04-30).
// The new program is single-tier, free signup, no subscription, paid out
// of the ZAAHI Service Fee. Final rate ratified at 20 % of the Service
// Fee but **not yet implemented** — Phase A is only a "Coming Soon" landing
// (`/refer`) plus an email waitlist. Commission calculation, attribution,
// and payout flows are paused pending UAE counsel sign-off.
//
// This file intentionally exports only the bare constants the rest of the
// app still depends on (`computePlatformFee` is still used by
// `/api/deals/[id]` to freeze the Service Fee onto the Deal row).
// Do NOT import REFERRAL_RATE in user-facing copy — public messaging
// must not state a specific %.

/** ZAAHI Service Fee as a fraction of agreed deal value (founder 2026-04-15). */
export const ZAAHI_SERVICE_FEE_RATE = 0.02;

/**
 * Future flat referral commission rate — % of ZAAHI Service Fee paid to
 * the referrer of a closing user. Ratified by founder 2026-04-30 but NOT
 * wired up. Phase B (post-counsel) will use this constant.
 */
export const REFERRAL_RATE = 0.20;

/**
 * Compute ZAAHI Service Fee for a given agreed price. Returns BigInt fils.
 * Service fee = agreedPrice × 2 %. Used by deal completion to freeze
 * `Deal.platformFeeFils`. Integer math to avoid floating-point drift.
 */
export function computePlatformFee(agreedPriceFils: bigint): bigint {
  // 0.02 = 200 / 10_000.
  return (agreedPriceFils * BigInt(200)) / BigInt(10000);
}
