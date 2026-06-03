// ZAAHI — toggleable WASD drone navigation for the parcels map.
//
// `installDroneControls(map, opts?)` wires listeners once, but they're
// gated by an internal `enabled` flag that the caller flips via the
// returned controller. Default is OFF. The map page renders a toggle
// button on the chrome and calls `enable()` / `disable()` when the
// user clicks it.
//
// Controls when enabled (founder spec 2026-06-03 v3 — cursor=crosshair):
//   Mouse    — cursor is the crosshair. Move the mouse anywhere on the
//              viewport; the map's bearing eases toward the cursor's
//              screen-angle from centre, so "up the screen" always
//              points at the cursor. Cursor at centre = no rotation
//              (deadzone 60 px). Strength scales with cursor distance.
//              NO pointer lock — the cursor stays visible (we hide the
//              native cursor via CSS and render DroneHUD's green
//              crosshair at the mouse position instead).
//   W/A/S/D  — fly. W is forward in the (now cursor-derived) bearing,
//              S is reverse, A/D are strafing perpendicular. Uses
//              e.code so AZERTY users get the same physical bindings.
//   Space    — ascend  (zoom out by 0.05 per frame)
//   Shift    — descend (zoom in  by 0.05 per frame) — ONLY when no WASD
//   Shift+W/A/S/D — ×3 speed (turbo)
//   Escape   — exit drone mode (calls opts.onExit if provided)
//
// Rules:
//   - When disabled: keyboard + mouse handlers early-return. WASD/Space
//     don't move the map, the cursor returns to its normal style, and
//     MapLibre's dragPan/dragRotate that were silenced for drone come
//     back to their previous state.
//   - Never interferes with left-click parcel handlers. MapLibre's
//     click event still fires under the cursor in drone mode, so
//     clicking a plot opens the SidePanel as usual.
//   - Ignores keys when an <input>/<textarea>/contenteditable has focus.
//   - Skips install on touch / coarse-pointer devices — the controller
//     is returned as a no-op so the caller's code path stays the same.
//   - Cleanup (`destroy`) is idempotent; React strict-mode safe.

import type maplibregl from "maplibre-gl";

const BASE_SPEED = 0.00002; // degrees per frame at zoom=20 baseline
const SPEED_ZOOM_CAP = 10;  // clamp (20-zoom) so we don't explode at zoom=0
const ZOOM_STEP = 0.05;     // per-frame zoom delta for Space/Shift
const EASING = 0.15;        // velocity easing factor per frame
const BEARING_DEADZONE_PX = 60;   // cursor distance from centre that triggers rotation
const BEARING_EASE_MAX_PX = 300;  // distance at which bearing ease reaches its max rate
const BEARING_EASE_MAX = 0.08;    // max bearing ease fraction toward target per frame

export type DroneController = {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  /** True on desktop (mouse + keyboard), false on touch / coarse-pointer
   *  devices. Callers can use this to hide UI affordances on mobile. */
  isAvailable(): boolean;
  destroy(): void;
};

export interface DroneControlsOptions {
  /** Called when the user presses Escape (founder spec 2026-06-03:
   *  ESC must exit drone mode entirely). React side wires this to
   *  setDroneEnabled(false). */
  onExit?: () => void;
  /** Called on every mousemove while drone mode is enabled, so the
   *  caller (page.tsx) can drive DroneHUD's crosshair position via
   *  React state. Receives viewport pixel coordinates (clientX/Y).
   *  Throttling is not needed — DroneHUD uses transform which is
   *  GPU-accelerated and React batches state updates. */
  onCursorMove?: (x: number, y: number) => void;
}

export function installDroneControls(
  map: maplibregl.Map,
  opts: DroneControlsOptions = {},
): DroneController {
  // Desktop-only gate. Store at setup time so nothing reacts to runtime
  // device changes (e.g. pairing a touchscreen mid-session).
  const isTouch = (() => {
    if (typeof window === "undefined") return true;
    try {
      if (window.matchMedia?.("(pointer: coarse)").matches) return true;
    } catch {
      /* ignore */
    }
    if ("ontouchstart" in window) return true;
    const mn = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints;
    if (typeof mn === "number" && mn > 0) return true;
    return false;
  })();
  if (isTouch) {
    return {
      enable() {},
      disable() {},
      isEnabled: () => false,
      isAvailable: () => false,
      destroy() {},
    };
  }

  let enabled = false;
  let disposed = false;
  let rafId: number | null = null;

  const keys = new Set<string>();

  // Smooth velocity — one value per axis, eased toward the target each frame.
  let vLng = 0;
  let vLat = 0;
  let vZoom = 0;

  // Cursor position in viewport pixels. Initial centre is the fallback
  // until the first mousemove fires (user hasn't moved the mouse yet).
  const cursor = {
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  };

  // MapLibre drag handlers we silence while drone is on so they don't
  // fight the cursor-driven bearing. We restore whatever state they
  // were in (someone else might have already disabled them) on exit.
  let savedDragPanEnabled = false;
  let savedDragRotateEnabled = false;

  function isTypingTarget(): boolean {
    const el = (typeof document !== "undefined" ? document.activeElement : null) as
      | (HTMLElement & { isContentEditable?: boolean })
      | null;
    if (!el) return false;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  // Use e.code so the mapping is layout-independent (AZERTY users get the
  // same physical-key bindings as QWERTY).
  function normalizeCode(e: KeyboardEvent): string | null {
    if (e.code === "Space") return " ";
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") return "shift";
    if (e.code === "KeyW") return "w";
    if (e.code === "KeyA") return "a";
    if (e.code === "KeyS") return "s";
    if (e.code === "KeyD") return "d";
    return null;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!enabled) return;
    if (isTypingTarget()) return;
    // ESC exits drone mode entirely.
    if (e.code === "Escape") {
      opts.onExit?.();
      return;
    }
    const k = normalizeCode(e);
    if (!k) return;
    if (k === " ") e.preventDefault(); // stop page-scroll on Space
    keys.add(k);
  }

  function onKeyUp(e: KeyboardEvent) {
    const k = normalizeCode(e);
    if (!k) return;
    keys.delete(k);
  }

  function clearKeys() {
    keys.clear();
  }

  function onMouseMove(e: MouseEvent) {
    if (!enabled) return;
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    opts.onCursorMove?.(e.clientX, e.clientY);
  }

  // Animation loop — runs always, but does nothing when disabled. Cheaper
  // than tearing down rAF on every toggle.
  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    if (!enabled) return;

    // ── Bearing tracking: ease toward the cursor's screen-angle from
    // viewport centre. Stable convergence — once cursor is at angle θ
    // and we set bearing = θ, the cursor's screen-angle is unchanged
    // (it's fixed in screen coordinates), so there's no oscillation.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dX = cursor.x - vw / 2;
    const dY = -(cursor.y - vh / 2); // invert Y so screen-up = math-up
    const cursorDist = Math.sqrt(dX * dX + dY * dY);
    if (cursorDist > BEARING_DEADZONE_PX) {
      // Target bearing: atan2(dX, dY) maps screen-up to 0 (north),
      // screen-right to +90 (east), matching MapLibre's bearing space.
      const targetBearing = (Math.atan2(dX, dY) * 180 / Math.PI + 360) % 360;
      const currentBearing = map.getBearing();
      let diff = targetBearing - currentBearing;
      // Shortest signed delta in [-180, 180].
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      // Ease factor scales with distance: at deadzone edge → 0,
      // at BEARING_EASE_MAX_PX → BEARING_EASE_MAX. Capped at the max.
      const distRatio = Math.min(
        1,
        (cursorDist - BEARING_DEADZONE_PX) / (BEARING_EASE_MAX_PX - BEARING_DEADZONE_PX),
      );
      const easeFactor = distRatio * BEARING_EASE_MAX;
      if (Math.abs(diff) > 0.01) {
        map.setBearing(currentBearing + diff * easeFactor);
      }
    }

    // ── WASD movement in the (just-updated) bearing direction.
    const zoom = map.getZoom();
    const bearingRad = (map.getBearing() * Math.PI) / 180;
    const zoomFactor = Math.pow(2, Math.min(SPEED_ZOOM_CAP, 20 - zoom));
    const speed = BASE_SPEED * zoomFactor;

    const hasMoveKey = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d");
    const shiftHeld = keys.has("shift");
    const mult = shiftHeld && hasMoveKey ? 3 : 1;

    let tLng = 0;
    let tLat = 0;
    let tZoom = 0;

    if (keys.has("w")) {
      tLng += Math.sin(bearingRad) * speed;
      tLat += Math.cos(bearingRad) * speed;
    }
    if (keys.has("s")) {
      tLng -= Math.sin(bearingRad) * speed;
      tLat -= Math.cos(bearingRad) * speed;
    }
    if (keys.has("a")) {
      tLng -= Math.cos(bearingRad) * speed;
      tLat += Math.sin(bearingRad) * speed;
    }
    if (keys.has("d")) {
      tLng += Math.cos(bearingRad) * speed;
      tLat -= Math.sin(bearingRad) * speed;
    }
    tLng *= mult;
    tLat *= mult;

    if (keys.has(" ")) tZoom -= ZOOM_STEP;
    if (shiftHeld && !hasMoveKey) tZoom += ZOOM_STEP;

    vLng += (tLng - vLng) * EASING;
    vLat += (tLat - vLat) * EASING;
    vZoom += (tZoom - vZoom) * EASING;

    const EPS = 1e-9;
    if (Math.abs(vLng) > EPS || Math.abs(vLat) > EPS) {
      const c = map.getCenter();
      map.setCenter([c.lng + vLng, c.lat + vLat]);
    }
    if (Math.abs(vZoom) > 1e-5) {
      const nextZ = Math.max(0, Math.min(22, map.getZoom() + vZoom));
      map.setZoom(nextZ);
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("visibilitychange", clearKeys);

  rafId = requestAnimationFrame(tick);

  return {
    enable() {
      if (disposed) return;
      enabled = true;
      // Silence MapLibre drag handlers so they don't fight the cursor-
      // driven bearing. We remember the prior state so an accidental
      // toggle doesn't permanently re-enable handlers the rest of the
      // app meant to leave off.
      savedDragPanEnabled = map.dragPan.isEnabled();
      savedDragRotateEnabled = map.dragRotate.isEnabled();
      map.dragPan.disable();
      map.dragRotate.disable();
    },
    disable() {
      if (disposed) return;
      enabled = false;
      // Reset velocity + key state so a re-enable starts from a clean slate.
      vLng = 0;
      vLat = 0;
      vZoom = 0;
      keys.clear();
      if (savedDragPanEnabled) map.dragPan.enable();
      if (savedDragRotateEnabled) map.dragRotate.enable();
    },
    isEnabled: () => enabled,
    isAvailable: () => true,
    destroy() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", clearKeys);
      // Best-effort restore drag handlers if we were the one that
      // disabled them.
      try {
        if (savedDragPanEnabled) map.dragPan.enable();
        if (savedDragRotateEnabled) map.dragRotate.enable();
      } catch {
        /* map may already be torn down */
      }
      keys.clear();
    },
  };
}
