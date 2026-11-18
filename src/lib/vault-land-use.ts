import { z } from "zod";

/**
 * Max length of a plot land-use string. DDA mixed-use plots carry long
 * free-text values (e.g. "COMMERCIAL : OFFICES, RETAIL HOSPITALITY : HOTEL
 * RESIDENTIAL : APARTMENT", ~75 chars); the DB column is TEXT, so this is
 * only a sanity bound against abuse.
 */
export const LAND_USE_MAX_LENGTH = 512;

export const landUseSchema = z.string().trim().max(LAND_USE_MAX_LENGTH);
