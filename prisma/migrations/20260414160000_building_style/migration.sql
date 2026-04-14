-- Add data-driven 3D building style flag to AffectionPlan.
-- NULL or "SIGNATURE" → default ZAAHI podium/body/crown tiering.
-- "FLAT"            → single-block extrusion at full footprint and height.
-- Per-plot opt-in keeps renderer free of hardcoded plot-number overrides
-- (per CLAUDE.md rule).
ALTER TABLE "AffectionPlan" ADD COLUMN "buildingStyle" TEXT;
