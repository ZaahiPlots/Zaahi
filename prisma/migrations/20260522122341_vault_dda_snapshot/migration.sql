-- Phase 2.1 Vault — store live DDA snapshot for entries resolved via the
-- plot-lookup live-fallback path. Nullable; only set when the lookup hit
-- live DDA (BASIC_LAND_BASE) and the entry was created via Path 1.
-- See src/app/api/me/vault/plot-lookup/route.ts and
-- src/app/api/me/vault/entries/route.ts.

ALTER TABLE "VaultEntry" ADD COLUMN "ddaSnapshot" JSONB;
