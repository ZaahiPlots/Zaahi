import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly at first use rather than silently producing a broken client.
  // (We don't throw at module load so prisma generate / build don't crash if env is absent.)
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
}

/**
 * Anon-key client. Used for:
 *   - browser sign-up / sign-in (token issued to user)
 *   - server-side JWT verification via supabase.auth.getUser(token)
 *
 * RLS protects data — never use the service role key in user-facing code paths.
 */
export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
