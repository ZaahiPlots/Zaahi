// SidePanel drag-resize constants + helpers (founder spec 2026-05-31).
//
// Founder asked for a draggable left edge on the right-side panel so
// wider screens can give Feasibility / Documents more room without
// touching panel chrome.
//
// MIN_W is locked to 320 (the historical fixed width). Lowering it
// below 320 breaks Feasibility V6's 2-column NumberInput grid: each
// input has minWidth 160, gap ~10, plus 28 px panel padding, so the
// minimum non-overflow width is ~358. At 320 the V6 inputs already
// pop a horizontal scrollbar inside the panel; the founder accepts
// this for now because the V1 calculator (single column) is the
// default surface. Pushing MIN below 320 would surface the V6 issue
// on V1 too.
//
// MAX_W combines a hard px cap (so 4K monitors don't get a 2400 px
// panel) with a viewport ratio (so smaller screens still see the
// map). Whichever is smaller wins.

export const PANEL_WIDTH_MIN = 320;
export const PANEL_WIDTH_MAX_PX = 720;
export const PANEL_WIDTH_MAX_VW = 0.6;
export const PANEL_WIDTH_DEFAULT = 320;
export const PANEL_WIDTH_STORAGE_KEY = "zaahi-sidepanel-width";

export function clampPanelWidth(w: number, viewportPx: number): number {
  const maxByVw = viewportPx * PANEL_WIDTH_MAX_VW;
  const upper = Math.min(PANEL_WIDTH_MAX_PX, maxByVw);
  if (!Number.isFinite(w)) return PANEL_WIDTH_DEFAULT;
  if (w < PANEL_WIDTH_MIN) return PANEL_WIDTH_MIN;
  if (w > upper) return upper;
  return w;
}
