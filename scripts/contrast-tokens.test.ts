// Founder decision D-20 — the ratified surface tokens must stay legible over
// BOTH basemaps.
//
//   npx tsx scripts/contrast-tokens.test.ts
//
// Two production bugs came from the same root: a translucent surface floating
// over an arbitrary map was measured only against the dark basemap.
//
//   PART 4 item 3 — PANEL_BG at 0.45. Over the light basemap the gold NET
//                   PROFIT figure scored 1.45. Not faint. Invisible.
//   PART 4 item 4 — the active chrome button, gold on a gold tint: 1.71.
//
// Both passed review because over the DARK basemap they measure 14.26 and
// 3.85. A single-backdrop check cannot see this class of defect, which is why
// every assertion below runs against both.
//
// The spread assertion is the one that encodes "basemap-independent": a
// control over arbitrary imagery must not have its legibility decided by the
// imagery.

import {
  PANEL_BG,
  CHROME_BTN_BG,
  CHROME_BTN_ACTIVE_BG,
  CHROME_BTN_ACTIVE_FG,
  GOLD,
  TXT,
} from '../src/lib/design-tokens';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];
/** Parse "rgba(r, g, b, a)" or "#rrggbb" into colour + alpha. */
function parse(c: string): { rgb: RGB; a: number } {
  if (c.startsWith('#')) return { rgb: hex(c), a: 1 };
  const n = (c.match(/[\d.]+/g) ?? []).map(Number);
  return { rgb: [n[0], n[1], n[2]] as RGB, a: n[3] ?? 1 };
}
const over = (fg: RGB, a: number, bg: RGB): RGB =>
  fg.map((c, i) => c * a + bg[i] * (1 - a)) as RGB;
const lum = (c: RGB) => {
  const f = c.map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};
const contrast = (a: RGB, b: RGB) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Representative basemap backdrops: Esri Light Gray Canvas and Dark Gray
// Canvas, sampled over Dubai.
const LIGHT_BASEMAP = hex('#f2f2f0');
const DARK_BASEMAP = hex('#2b2b2b');
const AA = 4.5;

/** Contrast of `fg` over `surface` composited on each basemap. */
function bothBackdrops(surface: string, fg: string) {
  const { rgb, a } = parse(surface);
  const f = parse(fg).rgb;
  return {
    light: contrast(f, over(rgb, a, LIGHT_BASEMAP)),
    dark: contrast(f, over(rgb, a, DARK_BASEMAP)),
  };
}

console.log('\nratified surface tokens — contrast over both basemaps (D-20)');
console.log('='.repeat(66));

console.log('\n1. PANEL_BG — cards, panels, the sticky NET PROFIT block');
{
  const body = bothBackdrops(PANEL_BG, TXT);
  const gold = bothBackdrops(PANEL_BG, GOLD);
  console.log(`   body text  light ${body.light.toFixed(2)}   dark ${body.dark.toFixed(2)}`);
  console.log(`   gold hero  light ${gold.light.toFixed(2)}   dark ${gold.dark.toFixed(2)}`);
  check('body text clears AA over the light basemap', body.light >= AA, body.light.toFixed(2));
  check('body text clears AA over the dark basemap', body.dark >= AA, body.dark.toFixed(2));
  // The gold hero is 26px bold — large text, AA is 3.0 — but hold it to 4.5
  // anyway. It is the single most consequential number in the product.
  check('gold hero clears AA over the light basemap', gold.light >= AA, gold.light.toFixed(2));
  check('gold hero clears AA over the dark basemap', gold.dark >= AA, gold.dark.toFixed(2));
  check('the 0.45 regression cannot return', gold.light > 1.45 * 2, `gold@light ${gold.light.toFixed(2)}`);
}

console.log('\n2. CHROME_BTN_BG — idle map buttons, floating over arbitrary imagery');
{
  const body = bothBackdrops(CHROME_BTN_BG, TXT);
  const gold = bothBackdrops(CHROME_BTN_BG, GOLD);
  console.log(`   icon (TXT)  light ${body.light.toFixed(2)}   dark ${body.dark.toFixed(2)}`);
  console.log(`   icon (GOLD) light ${gold.light.toFixed(2)}   dark ${gold.dark.toFixed(2)}`);
  check('idle icon clears AA over the light basemap', body.light >= AA, body.light.toFixed(2));
  check('idle icon clears AA over the dark basemap', body.dark >= AA, body.dark.toFixed(2));
  check('gold-on-idle clears AA over both', gold.light >= AA && gold.dark >= AA,
    `${gold.light.toFixed(2)} / ${gold.dark.toFixed(2)}`);

  // "Basemap-independent" made testable. At the old 0.35 this spread was
  // 11.69 — legibility was decided by whatever the map happened to show.
  const spread = Math.abs(body.light - body.dark);
  console.log(`   spread between backdrops: ${spread.toFixed(2)} (was 11.69 at rgba(0,0,0,0.35))`);
  check('the surface is near basemap-independent', spread < 4, spread.toFixed(2));
}

console.log('\n3. CHROME_BTN_ACTIVE — the PART 4 item 4 fix');
{
  const { rgb, a } = parse(CHROME_BTN_ACTIVE_BG);
  check('active background is opaque, so the map cannot affect it', a >= 0.99, `alpha ${a}`);
  const c = contrast(parse(CHROME_BTN_ACTIVE_FG).rgb, rgb);
  console.log(`   active glyph on active background: ${c.toFixed(2)}`);
  check('active glyph clears AA', c >= AA, c.toFixed(2));
  check('active is not the gold-on-gold that was reported', c > 1.71 * 2, c.toFixed(2));
}

console.log('\n' + '='.repeat(66));
if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
console.log('\nall assertions passed\n');
