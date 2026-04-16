// ── ZAAHI Ambassador Program ─────────────────────────────────────
// 3-level paid-tier ambassador program. Approved by founder 2026-04-15.
//
// REPLACES the prior 30/15/5 free-referral model. Ambassadors now buy into
// one of three lifetime-membership tiers (SILVER / GOLD / PLATINUM) via a
// one-time USDT TRC-20 payment. Commission rates depend on the tier.
//
// Plan-aware rates (per level):
//   SILVER   — L1 5% / L2 2% / L3 1%
//   GOLD     — L1 10% / L2 4% / L3 1%
//   PLATINUM — L1 15% / L2 6% / L3 1%
//
// Commission BASE is the ZAAHI service fee = 2% of deal value (NOT the old
// 0.25% platform fee). This is frozen onto Deal.platformFeeFils at
// DEAL_COMPLETED. The fee is split into seller-half and buyer-half, and each
// half walks the referral chain independently through 3 levels.
//
// All amounts stored in fils (1 AED = 100 fils) as BigInt.
// Commissions are IMMUTABLE once created — never updated or deleted.
// Use status=REVERSED to claw back on deal cancellation.

import type { PrismaClient, Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

// ── Constants ──

// Plan-aware commission rates. Keep in sync with CLAUDE.md § Ambassador Program.
export const PLAN_COMMISSION_RATES = {
  SILVER:   { L1: 0.05, L2: 0.02, L3: 0.01 },
  GOLD:     { L1: 0.10, L2: 0.04, L3: 0.01 },
  PLATINUM: { L1: 0.15, L2: 0.06, L3: 0.01 },
} as const;

export type AmbassadorPlan = keyof typeof PLAN_COMMISSION_RATES;

// ZAAHI service fee as fraction of deal value (2% per founder 2026-04-15).
export const ZAAHI_SERVICE_FEE_RATE = 0.02;

// ── Legacy exports (replaced 2026-04-15) ──
// The old flat COMMISSION_RATES / PLATFORM_FEE_RATE are kept exported for
// backward compatibility with the existing /ambassador dashboard + commission
// awarder. The values here are the GOLD-tier defaults — the new awardCommissions
// flow should look up rates via PLAN_COMMISSION_RATES[plan] once the User
// model grows an `ambassadorPlan` column. Until then, any user flagged
// `ambassadorActive=true` without an explicit plan is treated as GOLD.
// DO NOT import COMMISSION_RATES in new code — use PLAN_COMMISSION_RATES.
export const COMMISSION_RATES = [
  PLAN_COMMISSION_RATES.GOLD.L1,
  PLAN_COMMISSION_RATES.GOLD.L2,
  PLAN_COMMISSION_RATES.GOLD.L3,
] as const;
export const MAX_LEVEL = 3;

// Kept for backward compatibility. New callers should use ZAAHI_SERVICE_FEE_RATE.
export const PLATFORM_FEE_RATE = ZAAHI_SERVICE_FEE_RATE;

// Referral code format: 8 chars, uppercase alphanumeric, no 0/O/1/I/L for readability.
const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;

// ── Helpers ──

/**
 * Generate an 8-char referral code from a readable alphabet.
 * Uses crypto-strong randomness. Caller must check uniqueness against DB.
 */
export function generateReferralCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    out += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Hash an IP address for dedup-safe click tracking.
 * Uses a per-deployment salt from env to prevent rainbow-table re-identification.
 */
export function hashIp(ip: string): string {
  const salt = process.env.REFERRAL_IP_SALT || "zaahi-default-salt";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

/**
 * Compute ZAAHI service fee for a given agreed price. Returns BigInt fils.
 * Service fee = agreedPrice × 2% (founder 2026-04-15 — replaces old 0.25%).
 * Function name kept for backward compatibility with existing callers.
 */
export function computePlatformFee(agreedPriceFils: bigint): bigint {
  // 0.02 = 200 / 10000. Use integer math to avoid floating point drift.
  return (agreedPriceFils * BigInt(200)) / BigInt(10000);
}

// ── Referral code resolution ──

/**
 * Validate a referral code and return the owning user if it's a live
 * ambassador. Returns null if code is invalid, user not approved, or
 * ambassador not active.
 */
export async function resolveReferrer(
  prisma: PrismaClient,
  code: string,
): Promise<{ id: string; name: string } | null> {
  if (!code || !/^[A-Z0-9]{8}$/.test(code)) return null;
  const user = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, name: true, ambassadorActive: true },
  });
  if (!user || !user.ambassadorActive) return null;
  return { id: user.id, name: user.name };
}

/**
 * Check whether setting `referredById = ancestorId` on user `userId`
 * would create a cycle in the referral graph. Walks up the ancestor
 * chain looking for userId. Prevents A→B→A loops.
 */
export async function wouldCreateCycle(
  prisma: PrismaClient,
  userId: string,
  ancestorId: string,
): Promise<boolean> {
  if (userId === ancestorId) return true;
  let current: string | null = ancestorId;
  for (let i = 0; i < 10; i++) {
    if (!current) return false;
    if (current === userId) return true;
    const node: { referredById: string | null } | null =
      await prisma.user.findUnique({
        where: { id: current },
        select: { referredById: true },
      });
    current = node?.referredById ?? null;
  }
  return false;
}

// ── Ambassador activation ──

/**
 * Mark a user as an active ambassador. Generates a unique referralCode
 * if they don't already have one. Idempotent: calling twice on an
 * already-active ambassador is a no-op.
 *
 * Returns the user's referralCode (new or existing).
 */
export async function activateAmbassador(
  prisma: PrismaClient,
  userId: string,
): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, ambassadorActive: true },
  });
  if (!existing) throw new Error("User not found");

  if (existing.referralCode && existing.ambassadorActive) {
    return existing.referralCode;
  }

  let code = existing.referralCode;
  if (!code) {
    // Generate a unique code. Retry on collision (extremely rare with 31^8 ≈ 852B codes).
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateReferralCode();
      const clash = await prisma.user.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (!clash) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Could not generate unique referral code");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code, ambassadorActive: true },
  });

  return code;
}

// ── Commission calculation ──

interface Upline {
  ambassadorId: string;
  level: number; // 1..MAX_LEVEL
  rate: number;
}

/**
 * Walk up the referral chain starting from `userId` up to MAX_LEVEL.
 * Returns the list of ambassadors eligible for commission, skipping
 * inactive ambassadors but still consuming their level slot (so a
 * deactivated L1 means L2 and L3 still get counted from grand-parent).
 *
 * Actually — skipping inactive does NOT consume the slot. Only active
 * ambassadors count toward the 3-level cap. Inactive ambassadors are
 * "passed through" as if they didn't exist in the chain. This rewards
 * active community building.
 */
async function walkUpline(
  prisma: PrismaClient,
  userId: string,
): Promise<Upline[]> {
  const upline: Upline[] = [];
  let currentId: string | null = userId;

  // Walk up to 20 hops max (defensive limit against pathological chains).
  for (let hop = 0; hop < 20 && upline.length < MAX_LEVEL; hop++) {
    const node: {
      referredById: string | null;
      referredBy: { id: string; ambassadorActive: boolean } | null;
    } | null = await prisma.user.findUnique({
      where: { id: currentId! },
      select: {
        referredById: true,
        referredBy: { select: { id: true, ambassadorActive: true } },
      },
    });
    if (!node?.referredBy) break;
    if (node.referredBy.ambassadorActive) {
      const level = upline.length + 1;
      upline.push({
        ambassadorId: node.referredBy.id,
        level,
        rate: COMMISSION_RATES[level - 1],
      });
    }
    currentId = node.referredById;
  }

  return upline;
}

/**
 * Award commissions for a completed deal.
 *
 * Strategy: split the platform fee in half (seller-side and buyer-side).
 * For each side, walk the user's referral chain up to 3 levels and
 * award level-based commissions to each active ambassador.
 *
 * This function is called inside the same transaction as the Deal status
 * update to keep the fee freeze and commission accrual atomic.
 *
 * Returns count of Commission rows created.
 */
export async function awardCommissions(
  tx: Prisma.TransactionClient,
  dealId: string,
  sellerId: string,
  buyerId: string,
  platformFeeFils: bigint,
): Promise<number> {
  const ZERO = BigInt(0);
  if (platformFeeFils <= ZERO) return 0;

  // Split fee in half (seller side + buyer side)
  const halfFee = platformFeeFils / BigInt(2);
  if (halfFee <= ZERO) return 0;

  let created = 0;

  for (const sourceUserId of [sellerId, buyerId]) {
    // Re-use walkUpline via tx — cast tx as any to satisfy the PrismaClient type
    // (TransactionClient has the same shape but different types).
    const upline = await walkUpline(tx as unknown as PrismaClient, sourceUserId);
    for (const u of upline) {
      // Integer math: amountFils = halfFee × rate.
      // rate is one of 0.30, 0.15, 0.05 → multiply by 10000 → 3000, 1500, 500.
      const rateInt = BigInt(Math.round(u.rate * 10000));
      const amountFils = (halfFee * rateInt) / BigInt(10000);
      if (amountFils <= ZERO) continue;

      // Defense-in-depth: unique constraint on (dealId, ambassadorId, level,
      // sourceUserId) prevents duplicates. A P2002 error here means a race
      // slipped past the caller's optimistic concurrency check — we silently
      // skip because the winning request already created this commission.
      try {
        await tx.commission.create({
          data: {
            dealId,
            ambassadorId: u.ambassadorId,
            level: u.level,
            sourceUserId,
            amountFils,
            basisFils: halfFee,
            // Prisma Decimal accepts string for precision.
            rate: u.rate.toFixed(4),
            status: "PENDING",
          },
        });
        created++;
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err?.code !== "P2002") throw e;
        // Duplicate — ignore. The winning concurrent request already
        // recorded this commission.
      }
    }
  }

  return created;
}

/**
 * Reverse all commissions for a deal (on CANCELLED/DISPUTED).
 * Flips status to REVERSED. Keeps rows for audit.
 * Returns count reversed.
 */
export async function reverseCommissions(
  tx: Prisma.TransactionClient,
  dealId: string,
): Promise<number> {
  const result = await tx.commission.updateMany({
    where: { dealId, status: "PENDING" },
    data: { status: "REVERSED" },
  });
  return result.count;
}

// ── Dashboard queries ──

export interface AmbassadorStats {
  referralCode: string | null;
  ambassadorActive: boolean;
  downlineL1: number;
  downlineL2: number;
  downlineL3: number;
  totalDownline: number;
  earningsPendingFils: string; // BigInt as string for JSON safety
  earningsPaidFils: string;
  earningsTotalFils: string;
  commissionCount: number;
  last30DaysFils: string;
}

/**
 * Fetch ambassador stats for dashboard. Returns 0-counts for inactive
 * ambassadors. BigInt values are serialized to strings for JSON.
 */
export async function getAmbassadorStats(
  prisma: PrismaClient,
  userId: string,
): Promise<AmbassadorStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, ambassadorActive: true },
  });
  if (!user) throw new Error("User not found");

  // Downline counts — 3 levels deep
  const l1 = await prisma.user.findMany({
    where: { referredById: userId },
    select: { id: true },
  });
  const l1Ids = l1.map((u) => u.id);

  const l2 = l1Ids.length > 0
    ? await prisma.user.findMany({
        where: { referredById: { in: l1Ids } },
        select: { id: true },
      })
    : [];
  const l2Ids = l2.map((u) => u.id);

  const l3 = l2Ids.length > 0
    ? await prisma.user.findMany({
        where: { referredById: { in: l2Ids } },
        select: { id: true },
      })
    : [];

  // Earnings
  const commissions = await prisma.commission.findMany({
    where: { ambassadorId: userId },
    select: { amountFils: true, status: true, createdAt: true },
  });

  let pending = BigInt(0);
  let paid = BigInt(0);
  let last30 = BigInt(0);
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  for (const c of commissions) {
    if (c.status === "PENDING") pending += c.amountFils;
    if (c.status === "PAID") paid += c.amountFils;
    if (c.status !== "REVERSED" && c.createdAt >= cutoff) last30 += c.amountFils;
  }

  return {
    referralCode: user.referralCode,
    ambassadorActive: user.ambassadorActive,
    downlineL1: l1.length,
    downlineL2: l2.length,
    downlineL3: l3.length,
    totalDownline: l1.length + l2.length + l3.length,
    earningsPendingFils: pending.toString(),
    earningsPaidFils: paid.toString(),
    earningsTotalFils: (pending + paid).toString(),
    commissionCount: commissions.filter((c) => c.status !== "REVERSED").length,
    last30DaysFils: last30.toString(),
  };
}

export interface ReferralTreeNode {
  id: string;
  name: string;
  joinedAt: string; // ISO
  level: number;
  children: ReferralTreeNode[];
}

/**
 * Build a downline tree for the given user, up to MAX_LEVEL depth.
 * Names only, no email/phone. Safe to return to the ambassador.
 */
export async function buildReferralTree(
  prisma: PrismaClient,
  userId: string,
  depth: number = MAX_LEVEL,
): Promise<ReferralTreeNode[]> {
  async function recurse(parentId: string, level: number): Promise<ReferralTreeNode[]> {
    if (level > depth) return [];
    const kids = await prisma.user.findMany({
      where: { referredById: parentId },
      select: { id: true, name: true, referredAt: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const out: ReferralTreeNode[] = [];
    for (const k of kids) {
      out.push({
        id: k.id,
        name: k.name,
        joinedAt: (k.referredAt ?? k.createdAt).toISOString(),
        level,
        children: await recurse(k.id, level + 1),
      });
    }
    return out;
  }
  return recurse(userId, 1);
}
