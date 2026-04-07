import { headers } from 'next/headers';

/**
 * Returns the current authenticated user id, or null.
 *
 * TODO: replace dev header fallback with Supabase Auth (cookies → SSR client).
 * Until that step is done, the route reads `x-user-id` so we can integration-test
 * the parcels CRUD without blocking on auth wiring.
 */
export async function getSessionUserId(): Promise<string | null> {
  const h = await headers();
  const devUserId = h.get('x-user-id');
  return devUserId && devUserId.length > 0 ? devUserId : null;
}
