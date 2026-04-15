// ZAAHI — always-on WASD drone navigation for the parcels map.
//
// Installs desktop-only keyboard flight controls + right-click rotate on
// an existing MapLibre map instance. Call `installDroneControls(map)` on
// map mount; the returned cleanup function MUST be called on unmount.
//
// Controls:
//   W/A/S/D  — forward / strafe left / backward / strafe right
//   Space    — ascend   (zoom out by 0.05 per frame)
//   Shift    — descend  (zoom in  by 0.05 per frame) — ONLY when no WASD
//   Shift+W/A/S/D — ×3 speed
//   Right-click drag   — rotate bearing + pitch (pitch clamped 0..85)
//   Scroll / left-click / pinch — untouched, existing handlers intact
//
// Rules:
//   - Never interferes with left-click parcel handlers.
//   - Ignores keys when an <input>/<textarea>/contenteditable has focus.
//   - Skips install entirely on touch / coarse-pointer devices.
//   - Cleanup is idempotent (React strict-mode safe).

import type maplibregl from "maplibre-gl";

const BASE_SPEED = 0.00002; // degrees per frame at zoom=20 baseline
const SPEED_ZOOM_CAP = 10;  // clamp (20-zoom) so we don't explode at zoom=0
const ZOOM_STEP = 0.05;     // per-frame zoom delta for Space/Shift
const PITCH_MIN = 0;
const PITCH_MAX = 85;
const EASING = 0.15;        // velocity easing factor per frame
const ROTATE_BEARING_SENS = 0.3;  // deg per px
const ROTATE_PITCH_SENS = 0.3;    // deg per px

export function installDroneControls(map: maplibregl.Map): () => void {
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
    return () => {};
  }

  const keys = new Set<string>();
  let disposed = false;
  let rafId: number | null = null;

  // Smooth velocity — one value per axis, eased toward the target each frame.
  let vLng = 0;
  let vLat = 0;
  let vZoom = 0;

  // Right-click drag state.
  let rotating = false;
  let lastX = 0;
  let lastY = 0;

  const container = map.getCanvasContainer();

  function isTypingTarget(): boolean {
    const el = (typeof document !== "undefined" ? document.activeElement : null) as
      | (HTMLElement & { isContentEditable?: boolean })
      | null;
    if (!el) return false;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTypingTarget()) return;
    const k = normalizeKey(e);
    if (!k) return;
    // Prevent page scroll on Space / arrow-like keys while flying.
    if (k === " " || k === "shift" || ["w", "a", "s", "d"].includes(k)) {
      // Only preventDefault for Space — it scrolls the page. Letters
      // are already non-scrolling, Shift is a modifier we don't block.
      if (k === " ") e.preventDefault();
    }
    keys.add(k);
  }

  function onKeyUp(e: KeyboardEvent) {
    const k = normalizeKey(e);
    if (!k) return;
    keys.delete(k);
  }

  function clearKeys() {
    keys.clear();
  }

  function normalizeKey(e: KeyboardEvent): string | null {
    if (e.key === " " || e.code === "Space") return " ";
    if (e.key === "Shift") return "shift";
    const k = e.key.toLowerCase();
    if (k === "w" || k === "a" || k === "s" || k === "d") return k;
    return null;
  }

  // Right-click drag → rotate bearing + pitch. Left-click is untouched.
  function onContextMenu(e: MouseEvent) {
    // Suppress browser context menu over the map so right-drag works.
    e.preventDefault();
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 2) return; // right-button only
    rotating = true;
    lastX = e.clientX;
    lastY = e.clientY;
    // Capture pointer-ish behaviour: follow the mouse until mouseup even
    // if the cursor leaves the canvas.
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
  }

  function onWindowMouseMove(e: MouseEvent) {
    if (!rotating) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const nextBearing = map.getBearing() - dx * ROTATE_BEARING_SENS;
    const nextPitchRaw = map.getPitch() + dy * ROTATE_PITCH_SENS;
    const nextPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, nextPitchRaw));
    map.setBearing(nextBearing);
    map.setPitch(nextPitch);
  }

  function onWindowMouseUp(e: MouseEvent) {
    if (e.button !== 2 && rotating) {
      // Non-right-button mouseup; keep rotating only if the right button
      // is still down (rare). Simpler: end on any mouseup.
    }
    rotating = false;
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
  }

  // Animation loop — reads the key Set, eases velocity toward the target,
  // applies to map center / zoom each frame.
  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    const zoom = map.getZoom();
    const bearingRad = (map.getBearing() * Math.PI) / 180;
    const zoomFactor = Math.pow(2, Math.min(SPEED_ZOOM_CAP, 20 - zoom));
    const speed = BASE_SPEED * zoomFactor;

    const hasMoveKey = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d");
    const shiftHeld = keys.has("shift");
    const mult = shiftHeld && hasMoveKey ? 3 : 1;

    // Target velocity this frame.
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

    // Space → ascend (zoom out, smaller zoom value).
    // Shift alone (no WASD) → descend (zoom in, larger zoom value).
    if (keys.has(" ")) tZoom -= ZOOM_STEP;
    if (shiftHeld && !hasMoveKey) tZoom += ZOOM_STEP;

    // Easing.
    vLng += (tLng - vLng) * EASING;
    vLat += (tLat - vLat) * EASING;
    vZoom += (tZoom - vZoom) * EASING;

    // Dead-zone — when both target and velocity are tiny, skip the map
    // updates so we don't spam render requests while idle.
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

  // Wire everything up. Key listeners on window (so focus can be anywhere
  // on the page that isn't an input). Mouse listeners on the map canvas
  // container so we only intercept right-click over the map.
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", clearKeys);
  container.addEventListener("contextmenu", onContextMenu);
  container.addEventListener("mousedown", onMouseDown);

  // Start the loop. If the map isn't loaded yet, the first few frames
  // are cheap no-ops (getCenter/getBearing work pre-load).
  rafId = requestAnimationFrame(tick);

  return () => {
    if (disposed) return;
    disposed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearKeys);
    document.removeEventListener("visibilitychange", clearKeys);
    window.removeEventListener("mousemove", onWindowMouseMove);
    window.removeEventListener("mouseup", onWindowMouseUp);
    try {
      container.removeEventListener("contextmenu", onContextMenu);
      container.removeEventListener("mousedown", onMouseDown);
    } catch {
      /* container may already be gone if map.remove() ran first */
    }
    keys.clear();
  };
}
