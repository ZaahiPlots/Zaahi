// ZAAHI — toggleable WASD drone navigation for the parcels map.
//
// `installDroneControls(map)` wires listeners once, but they're gated by
// an internal `enabled` flag that the caller flips via the returned
// controller. Default is OFF. The map page renders a toggle button on
// the chrome (near 2D/3D) and calls `enable()` / `disable()` when the
// user clicks it.
//
// Controls when enabled:
//   W/A/S/D  — forward / strafe left / backward / strafe right (uses e.code)
//   Space    — ascend   (zoom out by 0.05 per frame)
//   Shift    — descend  (zoom in  by 0.05 per frame) — ONLY when no WASD
//   Shift+W/A/S/D — ×3 speed (turbo)
//   Right-click on canvas → requestPointerLock → free rotation via
//     pointer-lock movementX/Y (bearing + pitch 0..85). Release with
//     Escape or by disabling drone mode.
//
// Rules:
//   - When disabled: keyboard + mouse handlers early-return. WASD/Space
//     don't move the map, right-click falls through to the browser
//     context menu / existing MapLibre behaviour.
//   - Never interferes with left-click parcel handlers.
//   - Ignores keys when an <input>/<textarea>/contenteditable has focus.
//   - Skips install on touch / coarse-pointer devices — the controller
//     is returned as a no-op so the caller's code path stays the same.
//   - Cleanup (`destroy`) is idempotent; React strict-mode safe.

import type maplibregl from "maplibre-gl";

const BASE_SPEED = 0.00002; // degrees per frame at zoom=20 baseline
const SPEED_ZOOM_CAP = 10;  // clamp (20-zoom) so we don't explode at zoom=0
const ZOOM_STEP = 0.05;     // per-frame zoom delta for Space/Shift
const PITCH_MIN = 0;
const PITCH_MAX = 85;
const EASING = 0.15;        // velocity easing factor per frame
const ROTATE_BEARING_SENS = 0.3;  // deg per px
const ROTATE_PITCH_SENS = 0.3;    // deg per px

export type DroneController = {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  destroy(): void;
};

export function installDroneControls(map: maplibregl.Map): DroneController {
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

  // Right-click / pointer-lock rotate state.
  let pointerLocked = false;

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

  function onContextMenu(e: MouseEvent) {
    if (!enabled) return;
    // Suppress browser context menu over the map while flying so right-drag
    // / pointer-lock rotation works.
    e.preventDefault();
  }

  function onMouseDown(e: MouseEvent) {
    if (!enabled) return;
    if (e.button !== 2) return; // right-button only
    e.preventDefault();
    // Request pointer lock on the canvas container. Browsers fire
    // pointerlockchange async; our movement listener is always-on and
    // gated by `pointerLocked`.
    try {
      container.requestPointerLock();
    } catch {
      /* some browsers reject outside user gesture — ignore */
    }
  }

  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === container;
  }

  function onPointerLockError() {
    pointerLocked = false;
  }

  function onLockedMouseMove(e: MouseEvent) {
    if (!enabled || !pointerLocked) return;
    const dx = e.movementX;
    const dy = e.movementY;
    if (!dx && !dy) return;
    const nextBearing = map.getBearing() - dx * ROTATE_BEARING_SENS;
    const nextPitchRaw = map.getPitch() + dy * ROTATE_PITCH_SENS;
    const nextPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, nextPitchRaw));
    map.setBearing(nextBearing);
    map.setPitch(nextPitch);
  }

  function releasePointerLock() {
    try {
      if (document.pointerLockElement === container) {
        document.exitPointerLock();
      }
    } catch {
      /* ignore */
    }
    pointerLocked = false;
  }

  // Animation loop — runs always, but does nothing when disabled. Cheaper
  // than tearing down rAF on every toggle.
  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    if (!enabled) return;

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
  document.addEventListener("visibilitychange", clearKeys);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("pointerlockerror", onPointerLockError);
  document.addEventListener("mousemove", onLockedMouseMove);
  container.addEventListener("contextmenu", onContextMenu);
  container.addEventListener("mousedown", onMouseDown);

  rafId = requestAnimationFrame(tick);

  return {
    enable() {
      if (disposed) return;
      enabled = true;
    },
    disable() {
      if (disposed) return;
      enabled = false;
      // Reset velocity + key state so a re-enable starts from a clean slate.
      vLng = 0;
      vLat = 0;
      vZoom = 0;
      keys.clear();
      releasePointerLock();
    },
    isEnabled: () => enabled,
    destroy() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", clearKeys);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("mousemove", onLockedMouseMove);
      try {
        container.removeEventListener("contextmenu", onContextMenu);
        container.removeEventListener("mousedown", onMouseDown);
      } catch {
        /* container may already be gone if map.remove() ran first */
      }
      releasePointerLock();
      keys.clear();
    },
  };
}
