'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Browser client. Persists session in localStorage and auto-refreshes the
 * access token. Use only inside `'use client'` components.
 */
export const supabaseBrowser = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
