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
// quartet. Phase 1 style unification (founder spec 2026-05-31):
// switched from rgba(0,0,0,0.3) + blur(16) to navy-tinted glass
// + blur(20) so the panel reads as "ZAAHI app surface" over both
// CartoDB Light (where the previous spec showed the basemap noise
// through the glass) and Dark. Navy 0.45 sits at the same hue as
// the BG_GRADIENT top stop (#0A1628), so the panel feels like part
// of the app rather than a black overlay.
export const PANEL_BG = "rgba(10, 22, 40, 0.45)";
export const PANEL_BLUR = "blur(20px)";
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

// ── Border-radius scale ─────────────────────────────────────────
// Four tiers that close every panel/card/pill/edge shape on the
// platform. Anything else is a special case worth its own variable.
export const RADIUS_PANEL = 12;   // Layers, MiniMap dock, large floating rectangles
export const RADIUS_CARD = 6;     // Hover popups, small floating cards
export const RADIUS_PILL = 999;   // ParcelsNav pill, capsule controls
export const RADIUS_EDGE = 0;     // SidePanel (full-height, flush to viewport edge)

// ── Inputs (text / number / textarea / select) ──────────────────
export const INPUT_BG = "rgba(255, 255, 255, 0.04)";
// Slight bump on focus — keeps the field visually anchored when the
// user starts typing.
export const INPUT_BG_FOCUS = "rgba(255, 255, 255, 0.06)";
export const INPUT_BORDER = "1px solid rgba(255, 255, 255, 0.15)";
export const INPUT_FOCUS_BORDER = `1px solid ${GOLD}`;
export const INPUT_PLACEHOLDER = "rgba(255, 255, 255, 0.4)";

// ── ChromeBtn (the unified glass button) ─────────────────────────
// Rest: slightly darker than PANEL_BG so the button reads as
// "indented" when it sits on a panel; on bare map it still has
// enough contrast against the gradient. Hover/active: gold border
// + gold-25% bg + gold icon. Shadow lifts the button off panels.
//
// Phase 1 split (founder spec 2026-05-31): CHROME_BTN_BG is
// intentionally NOT equal to PANEL_BG. Buttons-on-panel need
// contrast — same bg + border-only would feel like a flat
// affordance. 0.35 black-tint reads as "darker than the navy
// panel" while still glassy.
export const CHROME_BTN_BG = "rgba(0, 0, 0, 0.35)";
export const CHROME_BTN_BORDER = PANEL_BORDER;
export const CHROME_BTN_BORDER_COLOR = PANEL_BORDER_COLOR;
export const CHROME_BTN_HOVER_BG = GOLD_25_BG;
export const CHROME_BTN_HOVER_BORDER = `1px solid ${GOLD}`;
export const CHROME_BTN_HOVER_BORDER_COLOR = GOLD;
export const CHROME_BTN_ACTIVE_BG = GOLD_25_BG;
export const CHROME_BTN_ACTIVE_BORDER = `1px solid ${GOLD}`;
export const CHROME_BTN_SHADOW = "0 8px 20px rgba(0, 0, 0, 0.3)";

// ChromeBtn size variants — single radius (8) across both. Standard
// for primary affordances, compact for dense bars like HeaderBar
// where 32×32 would crowd.
export const CHROME_BTN_SIZE_DEFAULT = 32;
export const CHROME_BTN_SIZE_COMPACT = 28;
export const CHROME_BTN_RADIUS = 8;

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
