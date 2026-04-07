/**
 * Parse Dubai building height codes into floors + meters.
 *
 * Format examples:
 *   "G"             → ground only
 *   "G+1"           → ground + 1 above
 *   "G+15"          → ground + 15 above
 *   "B+G+5P+30"     → basement + ground + 5 podium + 30 tower
 *   "2B+G+8P+74"    → 2 basement + ground + 8 podium + 74 tower
 *   "2B+1P+G+6"     → 2 basement + 1 podium + ground + 6 above (Meydan variant)
 *
 * Heights (default storeys):
 *   ground:  4.0 m
 *   podium:  4.5 m
 *   tower:   3.5 m
 *
 * Basements aren't counted in `aboveGroundFloors`/`heightMeters`.
 */

const M_GROUND = 4.0;
const M_PODIUM = 4.5;
const M_TOWER = 3.5;

export interface HeightParse {
  raw: string;
  basements: number;
  podium: number;
  tower: number;
  /** Includes ground (1) + podium + tower. */
  aboveGroundFloors: number;
  heightMeters: number;
}

export function parseHeightCode(input: string): HeightParse | null {
  const code = input.replace(/\s+/g, '').toUpperCase();
  if (!code) return null;
  if (!/G/.test(code)) return null;

  let basements = 0;
  let podium = 0;
  let tower = 0;

  // Walk the parts split by '+'
  const parts = code.split('+');
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    // Basement: "B" or "2B"
    let m = p.match(/^(\d*)B$/);
    if (m) {
      basements += m[1] ? parseInt(m[1], 10) : 1;
      continue;
    }
    // Podium: "5P" or "P"
    m = p.match(/^(\d*)P$/);
    if (m) {
      podium += m[1] ? parseInt(m[1], 10) : 1;
      continue;
    }
    // Ground (no number) — counted implicitly
    if (p === 'G') continue;
    // Plain integer = tower floors above podium (or above ground if no podium part)
    m = p.match(/^(\d+)$/);
    if (m) {
      tower += parseInt(m[1], 10);
      continue;
    }
    // Unknown token → bail
    return null;
  }

  const aboveGroundFloors = 1 + podium + tower; // ground counts as 1
  const heightMeters = M_GROUND + podium * M_PODIUM + tower * M_TOWER;

  return { raw: input, basements, podium, tower, aboveGroundFloors, heightMeters };
}
