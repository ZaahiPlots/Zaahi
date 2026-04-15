import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from './prisma';
import { supabase } from './supabase';

const FOUNDER_EMAILS = new Set(['zhanrysbayev@gmail.com', 'd.tsvyk@gmail.com']);

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
  return data.user.id;
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

  const email = data.user.email?.toLowerCase() ?? '';
  if (FOUNDER_EMAILS.has(email)) return data.user.id;

  const prismaUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });
  if (prismaUser?.role === UserRole.ADMIN) return data.user.id;
  return null;
}
