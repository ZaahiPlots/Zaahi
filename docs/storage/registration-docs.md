# Storage bucket: `registration-docs`

KYC documents uploaded by cohort applicants during the public `/register`
flow. Spec source: spec-05 §6.3, §12.

## Properties

| Property | Value |
|---|---|
| Bucket name | `registration-docs` |
| Visibility | **Private** (no anonymous access) |
| Path pattern | `<userId-from-Supabase-Auth>/<kind>-<timestamp>.<ext>` |
| Max file size | 10 MiB per file (enforced client + RLS bucket setting) |
| Allowed MIME | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |

`<userId>` is the Supabase Auth `auth.uid()` UUID (matches `User.id` in
Prisma — see `prisma/schema.prisma`).

`<kind>` examples: `emirates-id-front`, `emirates-id-back`,
`title-deed`, `rera-card`, `agency-licence`, `passport`, `poa`,
`architect-licence`, `trade-licence`, `dld-developer-registration`.
The exact kind list lives in `src/lib/registration-doc-requirements.ts`
(introduced in Step 6).

## RLS model

Policies live in `supabase/migrations/20260507120000_registration_docs.sql`.

| Operation | Who | Constraint |
|---|---|---|
| `INSERT` | authenticated user | only into own folder (`auth.uid()`) |
| `SELECT` | authenticated user | only own files |
| `UPDATE` | authenticated user | only own files |
| `DELETE` | authenticated user | only own files |
| anonymous | — | no access |
| service-role (admin queue) | bypasses RLS | issues signed URLs (TTL 7 days) |

### Why no public SELECT
Real-name leak surface: KYC docs contain real names, photos, sensitive IDs.
Per spec §12.4 / CLAUDE.md PDPL rules, never expose. Admins read via signed
URLs generated server-side with the service-role key (RLS-bypass), which
have a 7-day TTL and can be re-issued on every admin queue detail-modal
open per spec §12.3.

## Apply procedure

The migration is **self-contained** — it both creates the bucket
(`INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING`) and applies
the four RLS policies. Run it once, re-run safely.

Spec-05 §12.2 originally called for Dashboard-based bucket creation;
founder approved 2026-05-07 to do it via SQL after a permission probe
confirmed the application Postgres user has `INSERT` on `storage.buckets`
and `CREATE POLICY` on `storage.objects`. This keeps the migration
self-contained and reproducible.

### Initial apply (already done 2026-05-07)
The migration was applied via a temporary apply script that read the
SQL file and ran it through the Prisma adapter. Verification (V1–V5)
all green; see the commit message for the audit trail.

### Re-applying (e.g., after a Supabase environment reset)

Either path works since the SQL is idempotent:

**Path A — Supabase SQL Editor:**
```bash
cat supabase/migrations/20260507120000_registration_docs.sql
```
Paste into SQL editor → Run.

**Path B — application connection** (whatever currently has the same
`DATABASE_URL` that Prisma uses):
```bash
psql "$DATABASE_URL" -f supabase/migrations/20260507120000_registration_docs.sql
```
or run the SQL through any Prisma raw-query path.

### Verification queries (in the SQL editor)

```sql
-- a) bucket exists, private
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'registration-docs';

-- b) 4 policies, all role=authenticated
SELECT polname, polcmd::text, polroles::regrole[]::text AS roles
FROM pg_policy WHERE polname LIKE 'registration_docs_%' ORDER BY polname;

-- c) negative — no anon policy
SELECT polname FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass
  AND 'anon'::regrole = ANY(polroles)
  AND polqual::text LIKE '%registration-docs%';
```

Expected: (a) 1 row `public=false`; (b) 4 rows insert/select/update/delete
all `{authenticated}`; (c) 0 rows.

## Re-applying / re-deploying

The migration file is idempotent. If RLS gets desynced (e.g., bucket
recreated, or a manual policy edit), re-running the file restores the
canonical state.

If the bucket is dropped from Dashboard, the policies remain in
`storage.objects` but are inert (they reference a `bucket_id` that
doesn't match anything). Recreate the bucket with the same name and
they re-activate.

## See also
- spec-05 §6.3 (file constraints, path pattern)
- spec-05 §12 (PDPL: bucket structure, RLS, signed URLs, real-name leaks)
- `prisma/schema.prisma` — `RegistrationApplication.documentsJson` stores
  the array of `{ kind, signedUrl, originalName, sizeBytes, contentType, uploadedAt }`
  per spec §5.3.
