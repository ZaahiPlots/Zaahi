import { z } from "zod";

/**
 * Max length of a plot land-use string. DDA mixed-use plots carry long
 * free-text values (e.g. "COMMERCIAL : OFFICES, RETAIL HOSPITALITY : HOTEL
 * RESIDENTIAL : APARTMENT", ~75 chars); the DB column is TEXT, so this is
 * only a sanity bound against abuse.
 */
export const LAND_USE_MAX_LENGTH = 512;

/**
 * DDA PlotInfo's "Land use ... General Notes" fallback span (src/lib/dda.ts)
 * leaks the Setbacks table into the land-use text on some plots, e.g.
 * "... RESIDENTIAL : APARTMENT, VILLA Setbacks Side Building Podium Side 1 ...".
 * Setback numbers live in AffectionPlan.setbacks — land-use text keeps only
 * the land-use part.
 */
export function stripSetbackTail(text: string): string {
  return text.split(/\s+Setbacks\s+Side\s+Building/i)[0].trim();
}

export const landUseSchema = z.string().trim().max(LAND_USE_MAX_LENGTH);

/** landUseSchema + setback-tail strip. Use where the value is stored; submit
 *  needs the plain string schema for `.min(1)`. */
export const landUseStoredSchema = landUseSchema.transform(stripSetbackTail);
