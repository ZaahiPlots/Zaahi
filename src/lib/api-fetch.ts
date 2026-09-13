'use client';
import { supabaseBrowser } from './supabase-browser';

/**
 * Browser-side fetch wrapper that injects the current Supabase access token
 * as `Authorization: Bearer <token>`. Use it for every call to a protected
 * API route (everything under /api/ that is not in the middleware PUBLIC_API
 * allow-list).
 *
 * Returns the raw `Response` so callers can handle status codes themselves.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers ?? {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  // Subscription pause (2026-09-13): a signed-in user whose account was
  // paused mid-session gets 401 from every protected route on the next
  // call. Broadcast it so PauseGate can re-probe /api/me/access-status and
  // swap the page for the pause screen without waiting for a reload.
  // The probe itself is excluded so a paused probe can't loop.
  if (
    res.status === 401 &&
    token &&
    typeof window !== 'undefined' &&
    !String(input instanceof Request ? input.url : input).includes('/api/me/access-status')
  ) {
    window.dispatchEvent(new Event(PAUSE_RECHECK_EVENT));
  }
  return res;
}

/** DOM event name PauseGate listens for (see src/components/PauseGate.tsx). */
export const PAUSE_RECHECK_EVENT = 'zaahi:auth-401';
