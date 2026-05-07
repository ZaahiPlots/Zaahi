-- ─────────────────────────────────────────────────────────────────
-- 20260507120000_registration_docs.sql — spec-05 §12 Storage RLS
--
-- Bucket + RLS policies for `registration-docs` Supabase Storage.
-- Self-contained and idempotent: re-running this file from the
-- SQL editor (or via the application Postgres connection) restores
-- the canonical state without errors.
--
-- Path convention (mirrors spec §6.3 / §12.1):
--   <userId-from-Supabase-Auth>/<kind>-<timestamp>.<ext>
--
-- Policy model:
--   - `INSERT`        — authenticated users may upload to their OWN
--                       folder only (folder name = auth.uid()).
--   - `SELECT` (own)  — authenticated users may read their own files.
--                       Useful for re-rendering already-uploaded docs
--                       inside /register before submit. Other users
--                       (including admins via the admin queue) read
--                       through service-role-issued signed URLs which
--                       bypass RLS.
--   - `UPDATE` (own)  — replace own files (re-upload before submit).
--   - `DELETE` (own)  — remove own files (correct typos before submit).
--   - Anonymous role: NO access whatsoever (default for private bucket).
--
-- Spec §12.2 originally specified Dashboard-based bucket creation;
-- founder approved 2026-05-07 to do it via SQL since the application
-- Postgres user has the required INSERT grant on storage.buckets,
-- making the migration self-contained.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. Create bucket (idempotent) ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'registration-docs',
    'registration-docs',
    false,                              -- private
    10485760,                           -- 10 MiB per file (spec §6.3)
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]::text[]
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. RLS policies on storage.objects (idempotent) ──────────────
DROP POLICY IF EXISTS "registration_docs_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "registration_docs_user_select_own" ON storage.objects;
DROP POLICY IF EXISTS "registration_docs_user_update_own" ON storage.objects;
DROP POLICY IF EXISTS "registration_docs_user_delete_own" ON storage.objects;


CREATE POLICY "registration_docs_user_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'registration-docs'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "registration_docs_user_select_own"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'registration-docs'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "registration_docs_user_update_own"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'registration-docs'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'registration-docs'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "registration_docs_user_delete_own"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'registration-docs'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );


-- ─── Verification queries (run after policies applied + bucket exists) ───
--
-- 1. Confirm the bucket exists and is private:
--    SELECT id, name, public, file_size_limit, allowed_mime_types
--    FROM storage.buckets WHERE id = 'registration-docs';
--    Expected: 1 row, public=false.
--
-- 2. Confirm the four policies are in place:
--    SELECT polname, polcmd, polroles::regrole[] FROM pg_policy
--    WHERE polname LIKE 'registration_docs_%' ORDER BY polname;
--    Expected: 4 rows (insert/select/update/delete), all roles=authenticated.
--
-- 3. Confirm anonymous role has NO access (negative check):
--    SELECT polname FROM pg_policy
--    WHERE polrelid = 'storage.objects'::regclass
--      AND 'anon'::regrole = ANY(polroles::regrole[])
--      AND polqual::text LIKE '%registration-docs%';
--    Expected: 0 rows.
