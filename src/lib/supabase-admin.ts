// Service-role Supabase client for server-side privileged operations:
//   - auth.admin.createUser / generateLink (no user session)
//   - storage.from('registration-docs').upload (RLS-bypass, server-side)
//
// NEVER import this from any browser-rendered React component. The
// service-role key gives full bypass — keep it inside route handlers
// and lib helpers that only run on the Node.js runtime.
//
// Returns null when the env var is missing — callers must check.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export function isSupabaseAdminAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
