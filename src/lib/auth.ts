import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { AccessStatus, UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { supabase } from './supabase';

const FOUNDER_EMAILS = new Set(['zhanrysbayev@gmail.com', 'd.tsvyk@gmail.com']);

/** Founder accounts — never pausable, always admin. */
export function isFounderEmail(email: string | null | undefined): boolean {
  return !!email && FOUNDER_EMAILS.has(email.toLowerCase());
}

async function readBearer(req?: NextRequest): Promise<string | null> {
  const authHeader = req
    ? req.headers.get('authorization')
    : (await headers()).get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Verify the Bearer token from the Authorization header against Supabase Auth
 * and return the user id, or null if missing/invalid.
 *
 * Works in both `route.ts` handlers (pass the NextRequest) and server
 * components / server actions (omit it — falls back to next/headers).
 *
 * NOTE: this only proves the user has a valid Supabase session. It does NOT
 * check whether an admin has approved the account. For data routes that
 * should only serve approved users, use {@link getApprovedUserId}.
 */
export async function getSessionUserId(req?: NextRequest): Promise<string | null> {
  const token = await readBearer(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Same as {@link getSessionUserId} but additionally requires that the user has
 * been approved by an admin (`user_metadata.approved === true`). Returns null
 * if the token is missing/invalid OR the user is not yet approved.
 *
 * Use this in any handler that exposes sensitive data (parcels, deals,
 * documents, prices) or that consumes paid resources (Claude Vision, chat).
 */
export async function getApprovedUserId(req?: NextRequest): Promise<string | null> {
  const token = await readBearer(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.user_metadata?.approved !== true) return null;

  // Auto-create public.User row from Supabase auth metadata if missing.
  // Prevents Prisma P2003 (FK violation on User.id) on routes that write
  // VaultEntry / Deal / Notification / etc. for accounts that signed up
  // before /api/users/sync was wired (e.g. founders, legacy users).
  // Idempotent — `update: {}` makes this a no-op once the row exists.
  // Failure is swallowed (warn-only) so the caller can still serve
  // read-only data; the FK violation will surface clearly downstream.
  try {
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const rawName = typeof meta.name === "string" ? meta.name.trim() : "";
    const name = rawName.length > 0
      ? rawName
      : (data.user.email ?? "User").split("@")[0];
    const row = await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: data.user.email ?? "",
        role: UserRole.OTHER, // generic default — real role comes from /register
        name,
        // nickname intentionally left null — @unique constraint, collision-risky
      },
      update: {}, // no-op on subsequent calls
      select: { accessStatus: true },
    });
    // Subscription pause (2026-09-13): the ONE shared gate. A PAUSED user
    // keeps approved=true in Supabase, so sign-in and AuthGuard still
    // pass; every protected route denies here on the very next request
    // (this runs per request — no token-expiry wait). The pause screen
    // reads its state through getAccessState() / /api/me/access-status,
    // which deliberately does not go through this helper.
    if (row.accessStatus === AccessStatus.PAUSED) return null;
  } catch (e) {
    console.error(
      "[auth] auto-sync User upsert failed:",
      e instanceof Error ? e.message : String(e),
    );
  }

  return data.user.id;
}

export type AccessState = {
  userId: string;
  email: string | null;
  status: AccessStatus;
  pausedAt: Date | null;
};

/**
 * Session + approval + access status, WITHOUT the paused-denial that
 * {@link getApprovedUserId} applies. Only for the two places a paused
 * user is still allowed to reach: `/api/me/access-status` (the pause
 * screen's own probe) and the client-side sign-out path. Every other
 * route must keep using getApprovedUserId.
 */
export async function getAccessState(req?: NextRequest): Promise<AccessState | null> {
  const token = await readBearer(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.user_metadata?.approved !== true) return null;

  const row = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { accessStatus: true, pausedAt: true },
  });
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    // No Prisma row yet (first request before the auto-sync upsert ran)
    // → ACTIVE; getApprovedUserId creates the row as ACTIVE.
    status: row?.accessStatus ?? AccessStatus.ACTIVE,
    pausedAt: row?.pausedAt ?? null,
  };
}

/**
 * Same as {@link getApprovedUserId} but additionally requires ADMIN role
 * or a founder email (Zhan / Dymo). Returns the user id on success, null
 * otherwise — suitable for admin endpoints (pending-review queue,
 * approve / reject actions) where the caller's session alone is not
 * enough authority.
 *
 * Looks up the User row in Prisma rather than trusting user_metadata —
 * role lives in the database, not in the JWT.
 */
export async function getAdminUserId(req?: NextRequest): Promise<string | null> {
  const token = await readBearer(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (data.user.user_metadata?.approved !== true) return null;

  const prismaUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true, accessStatus: true },
  });
  // Paused admins lose the admin surface too (same single gate as
  // getApprovedUserId). Founders cannot be paused through the API, but
  // the check is uniform so a DB-side pause is honoured as well.
  if (prismaUser?.accessStatus === AccessStatus.PAUSED) return null;

  const email = data.user.email?.toLowerCase() ?? '';
  if (FOUNDER_EMAILS.has(email)) return data.user.id;

  if (prismaUser?.role === UserRole.ADMIN) return data.user.id;
  return null;
}
