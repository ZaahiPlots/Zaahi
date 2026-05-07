// Server-side signed-URL issuance for the registration-docs bucket.
// Spec §12.3: TTL = 7 days, regenerated on every admin queue detail
// modal open. The Prisma row stores `path` only; signed URLs never
// hit the DB.
//
// Caller MUST be admin-gated (getAdminUserId) before invoking — this
// helper assumes the security check happened upstream.

import { getSupabaseAdmin } from "./supabase-admin";

const BUCKET = "registration-docs";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SignedDoc {
  path: string;
  signedUrl: string;
  expiresAt: string; // ISO timestamp ~7d from now
}

/**
 * Generate a signed URL for one bucket path. Returns null if the
 * service-role client is unavailable or the path doesn't exist.
 */
export async function signRegistrationDoc(
  path: string,
): Promise<SignedDoc | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.warn(`[signRegistrationDoc] failed for ${path}:`, error?.message);
    return null;
  }
  return {
    path,
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
  };
}

/**
 * Batch-sign multiple paths. Returns the same array length, with null
 * entries where signing failed (caller can render "could not load" UI).
 */
export async function signRegistrationDocs(
  paths: string[],
): Promise<(SignedDoc | null)[]> {
  return Promise.all(paths.map((p) => signRegistrationDoc(p)));
}
