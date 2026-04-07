import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { supabase } from './supabase';

/**
 * Verify the Bearer token from the Authorization header against Supabase Auth
 * and return the user id, or null if missing/invalid.
 *
 * Works in both `route.ts` handlers (pass the NextRequest) and server
 * components / server actions (omit it — falls back to next/headers).
 */
export async function getSessionUserId(req?: NextRequest): Promise<string | null> {
  const authHeader = req
    ? req.headers.get('authorization')
    : (await headers()).get('authorization');

  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
