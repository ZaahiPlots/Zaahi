// ZAAHI drone — single source of truth for all tuning constants.
// Founder ratified 2026-06-10. Adjust here only; every consumer reads
// from this module.

// ── Mouse look ────────────────────────────────────────────────────
export const MOUSE_SENSITIVITY_DEG_PER_PX = 0.1;
export const MAX_PITCH_DEG = 85;

// ── Flight ────────────────────────────────────────────────────────
// Base velocity in metres per second at altitude ~120 m. Velocity scales
// linearly with altitude so high-altitude traversal feels brisk and
// rooftop drift feels deliberate.
export const BASE_SPEED_MPS = 18;
export const SPEED_ALTITUDE_GAIN = 0.10; // +10% per 100m altitude
export const SPEED_FLOOR_MPS = 5;        // never below this
export const SPRINT_MULTIPLIER = 3;
// Velocity lerp factor per frame for smooth ramp / stop. 0.18 = ~80ms to
// reach 90% of target velocity at 60fps.
export const VELOCITY_LERP = 0.18;

// ── Altitude ──────────────────────────────────────────────────────
export const FLOOR_HEIGHT_M = 20;        // min altitude above ground (terrain proxy)
export const CEILING_M = 4000;           // hard cap, well above any UAE tower
// At max pitch, mouse-look-up converts to climb. Pixels per metre of
// climb (the floor-clamp workaround).
export const CLIMB_PIXELS_PER_METRE = 6;

// ── FOV / cinematic ──────────────────────────────────────────────
export const BASE_FOV_DEG = 38;
export const SPRINT_FOV_DEG = 44;
export const FOV_LERP = 0.10;

// ── Mode transitions ─────────────────────────────────────────────
export const ENTRY_TRANSITION_MS = 800;
export const ENTRY_PITCH_DEG = 85;
export const ENTRY_ALT_POP_M = 25; // tiny altitude pop on enter
export const HUD_MODE_BANNER_MS = 3000;

// ── Tooltip / intel debounce ─────────────────────────────────────
export const CROSSHAIR_QUERY_THROTTLE_MS = 100;
export const INTEL_REVERSE_DEBOUNCE_MS = 500;
export const INTEL_AUTO_COLLAPSE_MS = 5000;

// ── Bookmarks ────────────────────────────────────────────────────
export const BOOKMARKS_MAX = 20;
export const BOOKMARKS_STORAGE_KEY = "zaahi-drone-bookmarks";
export const BOOKMARK_FLY_MS = 1500;

// ── Overview (R key) ─────────────────────────────────────────────
export const OVERVIEW_FLY_MS = 1200;
export const OVERVIEW_PADDING_PCT = 0.10; // bbox padding around the community
export const OVERVIEW_PITCH_RANGE_DEG: [number, number] = [45, 60];

// ── Glassmorphism tokens (mirror CLAUDE.md UI STYLE GUIDE) ────────
export const GLASS_BG = "rgba(10, 22, 40, 0.4)";
export const GLASS_BORDER = "rgba(255, 255, 255, 0.1)";
export const GLASS_BLUR = "blur(16px)";
export const GOLD = "#C8A96E";
export const GOLD_HOVER = "rgba(200, 169, 110, 0.25)";
export const TRANSITION_FAST = "150ms ease";

// ── Status display palette (for Intel card stacked bar) ──────────
export const STATUS_PALETTE = {
  completed: "#2D6A4F",         // muted green
  underConstruction: "#E67E22", // amber
  preConstruction: "#E1A500",   // dim gold
  suspended: "#9B59B6",         // muted purple
  empty: "#6B7280",             // neutral grey
};

// ── Key bindings reference ───────────────────────────────────────
// Documented here so the page-level handler stays grep-able.
export const KEY_BINDINGS = {
  forward: "KeyW",
  back: "KeyS",
  left: "KeyA",
  right: "KeyD",
  sprint: "ShiftLeft", // also ShiftRight; checked via e.shiftKey
  overview: "KeyR",
  bookmarkSave: "KeyB",
  exit: "Escape",
  filter1: "Digit1",
  filter2: "Digit2",
  filter3: "Digit3",
  filter4: "Digit4",
  filter5: "Digit5",
  filterReset: "Digit0",
} as const;
