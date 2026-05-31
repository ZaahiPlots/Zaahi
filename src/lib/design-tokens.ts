/**
 * ZAAHI design tokens — single source of truth for the unified
 * glassmorphism style (founder spec 2026-05-29, audit 2026-05-31).
 *
 * Step 1 of platform-wide style unification: this file just declares
 * the tokens. Existing files keep their inline hex values. Steps 2-5
 * migrate page-by-page to import from here.
 *
 * Order of concerns: gold accent → panel surfaces → input fields →
 * ChromeBtn → page chrome → typography.
 *
 * Do not introduce variants of these tokens (e.g. "soft panel" with
 * different blur). If a surface genuinely needs different chrome,
 * raise it with the founder first — the whole point of unification
 * is one look across the app.
 */

// ── Gold accent ──────────────────────────────────────
// Brand gold. Used as border / text / icon, NOT as solid background
// (except for small accent dots/chips ≤ ~40px and the Archibald
// launcher CTA, both founder-approved exceptions).
export const GOLD = "#C8A96E";

// Translucent gold for borders on dark glass surfaces (Archibald
// launcher halo, vault avatars, gold-tinted ChromeBtn rest state).
export const GOLD_BORDER = "rgba(200, 169, 110, 0.5)";

// Hover / active background for any gold-accented affordance
// (ChromeBtn hover, sidebar item active, layer toggle on).
export const GOLD_25_BG = "rgba(200, 169, 110, 0.25)";

// Subtle gold tint for sidebar item rest state / inactive chip.
export const GOLD_TINT = "rgba(200, 169, 110, 0.12)";

// Softer gold for text on dark glass. Same hue family as GOLD but
// brighter / less saturated — improves legibility on rgba(0,0,0,0.3)
// without dropping the brand association. Use for "muted gold" labels
// (achievement counters, status hints).
export const GOLD_TEXT_SOFT = "#e8d5a8";

// ── Panel surfaces (the unified glassmorphism stack) ────────────
// Every card / aside / modal / dropdown / floating panel uses this
// quartet. No other bg + blur combination should exist on the
// platform after Step 5.
export const PANEL_BG = "rgba(0, 0, 0, 0.3)";
export const PANEL_BLUR = "blur(16px)";
export const PANEL_BORDER = "1px solid rgba(255, 255, 255, 0.15)";
export const PANEL_SHADOW = "0 16px 64px rgba(0, 0, 0, 0.4)";

// Panel hover state — used by interactive cards (sidebar items,
// vault list rows). Static panels never animate to these.
export const PANEL_HOVER_BG = GOLD_25_BG;
export const PANEL_HOVER_BORDER = `1px solid ${GOLD}`;

// Just the border-color half of the hover, for code that needs to
// flip border-color independently of the rest of the border
// shorthand (mouse-enter handlers etc.).
export const PANEL_HOVER_BORDER_COLOR = GOLD;
export const PANEL_BORDER_COLOR = "rgba(255, 255, 255, 0.15)";

// ── Inputs (text / number / textarea / select) ──────────────────
export const INPUT_BG = "rgba(255, 255, 255, 0.04)";
// Slight bump on focus — keeps the field visually anchored when the
// user starts typing.
export const INPUT_BG_FOCUS = "rgba(255, 255, 255, 0.06)";
export const INPUT_BORDER = "1px solid rgba(255, 255, 255, 0.15)";
export const INPUT_FOCUS_BORDER = `1px solid ${GOLD}`;
export const INPUT_PLACEHOLDER = "rgba(255, 255, 255, 0.4)";

// ── ChromeBtn (the unified glass button) ─────────────────────────
// Rest: transparent panel chrome. Hover: gold border + gold-25% bg
// + gold text. Active (toggle on): same as hover. Shadow lifts the
// button off floating-panel layers.
export const CHROME_BTN_BG = PANEL_BG;
export const CHROME_BTN_BORDER = PANEL_BORDER;
export const CHROME_BTN_BORDER_COLOR = PANEL_BORDER_COLOR;
export const CHROME_BTN_HOVER_BG = GOLD_25_BG;
export const CHROME_BTN_HOVER_BORDER = `1px solid ${GOLD}`;
export const CHROME_BTN_HOVER_BORDER_COLOR = GOLD;
export const CHROME_BTN_ACTIVE_BG = GOLD_25_BG;
export const CHROME_BTN_ACTIVE_BORDER = `1px solid ${GOLD}`;
export const CHROME_BTN_SHADOW = "0 8px 20px rgba(0, 0, 0, 0.3)";

// ── Page chrome ──────────────────────────────────────────────────
// Used by all non-map pages (auth, dashboard, vault, deals, refer,
// admin, settings, register) as the document-level background.
export const BG_GRADIENT = "linear-gradient(180deg, #0A1628 0%, #050B18 100%)";

// ── Typography ───────────────────────────────────────────────────
// Heading typeface — Georgia serif for ZAAHI section labels (uppercase
// + letter-spaced) and for product names ("ARCHIBALD", "ZAAHI PLOTS",
// "MY VAULT"). Body text uses BODY_FONT.
export const HEADING_FONT = 'Georgia, "Times New Roman", serif';
export const HEADING_LETTER_SPACING = "0.12em";

// Body typeface — system stack. Used for paragraph copy, button
// labels (when not section labels), table cells, input text.
export const BODY_FONT = '-apple-system, "Segoe UI", Roboto, sans-serif';

// Default text on glass surfaces.
export const TXT = "#FFFFFF";
// Muted body copy on glass — sub-labels, status hints, secondary
// row text. Founder spec 2026-05-31: bumped from 0.7 to 0.85
// because PANEL_BG dropped to rgba(0,0,0,0.3) and the old 0.7 read
// as glass against the gradient instead of as text.
export const TXT_DIM = "rgba(255, 255, 255, 0.85)";
// Faint placeholder / disabled label / micro-meta. Bumped 0.4 → 0.65
// in the same pass — the old value was below WCAG AA on PANEL_BG.
export const TXT_FAINT = "rgba(255, 255, 255, 0.65)";
// Iconography opacity — close-×, chevrons, search glyphs. Stays at
// 0.7 because they're glyph-shaped and don't need to read as body
// copy, but reads brighter than the old TXT_DIM.
export const TXT_ICON = "rgba(255, 255, 255, 0.7)";

// ── Transitions ──────────────────────────────────────────────────
// CLAUDE.md forbids `transition: all` — always name the properties.
// 150ms ease is the platform-wide default for hover/focus transitions.
export const TRANSITION_FAST =
  "border-color 150ms ease, background 150ms ease, color 150ms ease";
