-- AlterEnum
-- Postgres 12+ supports ALTER TYPE ADD VALUE inside a transaction.
-- Supabase production runs Postgres 15+ (aws-1-eu-central-1.pooler),
-- so this is safe to apply via `prisma migrate deploy`. Additive only —
-- no existing rows touched.
ALTER TYPE "ParcelStatus" ADD VALUE 'VAULT_PRIVATE';
