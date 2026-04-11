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
  return fetch(input, { ...init, headers });
}
