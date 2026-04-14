-- Defense-in-depth: unique constraint on Commission prevents duplicate
-- rows even if the optimistic concurrency check in /api/deals/[id] fails.
-- A given (deal, ambassador, level, sourceUser) tuple can only have one
-- commission row. A second INSERT attempt throws a unique violation.
CREATE UNIQUE INDEX "Commission_dealId_ambassadorId_level_sourceUserId_key"
  ON "Commission"("dealId", "ambassadorId", "level", "sourceUserId");
