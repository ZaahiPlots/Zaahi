// ZAAHI — toggleable WASD drone navigation for the parcels map.
//
// `installDroneControls(map, opts?)` wires listeners once, but they're
// gated by an internal `enabled` flag that the caller flips via the
// returned controller. Default is OFF. The map page renders a toggle
// button on the chrome (near 2D/3D) and calls `enable()` / `disable()`
// when the user clicks it.
//
// Controls when enabled (founder spec 2026-06-03 refresh):
//   Mouse    — free-look. Pointer is locked on enable() so cursor
//              disappears; movement rotates bearing + pitch (0..85)
//              directly, no button held. The HUD crosshair is now the
//              aim point.
//   W/A/S/D  — fly in look direction. W/S blend horizontal pan with a
//              zoom delta so a downward-tilted camera descends as it
//              moves "forward"; A/D stay pure strafing (independent of
//              pitch). Uses e.code so AZERTY users get the same
//              physical-key bindings as QWERTY.
//   Space    — ascend  (zoom out by 0.05 per frame)
//   Shift    — descend (zoom in  by 0.05 per frame) — ONLY when no WASD
//   Shift+W/A/S/D — ×3 speed (turbo)
//   Escape   — exit drone mode (calls opts.onExit if provided)
//
// Rules:
//   - When disabled: keyboard + mouse handlers early-return. WASD/Space
//     don't move the map, mouse movement falls through to the browser /
//     MapLibre default behaviour.
//   - Never interferes with left-click parcel handlers. In pointer-lock
//     state, the click is registered at the locked center, so the
//     existing MapLibre click handler still opens the parcel under the
//     crosshair (intentional — "aim and click").
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
  /** True on desktop (mouse + keyboard), false on touch / coarse-pointer
   *  devices. Callers can use this to hide UI affordances on mobile. */
  isAvailable(): boolean;
  destroy(): void;
};

export interface DroneControlsOptions {
  /** Called when the user presses Escape (founder spec 2026-06-03:
   *  ESC must exit drone mode entirely, not just release pointer lock).
   *  React side wires this to setDroneEnabled(false). */
  onExit?: () => void;
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
    // ESC exits drone mode entirely. The browser also auto-releases
    // pointer lock on Escape (always, regardless of preventDefault),
    // so disable() can safely run here too.
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

  function onContextMenu(e: MouseEvent) {
    if (!enabled) return;
    // Suppress browser context menu over the map while flying — right-
    // click is otherwise meaningless in drone mode (no longer the lock
    // trigger; lock is auto-acquired in enable()).
    e.preventDefault();
  }

  function requestLock() {
    try {
      container.requestPointerLock();
    } catch {
      /* some browsers reject outside user gesture — silent. The user
       * can re-trigger by toggling the button again, which is a fresh
       * gesture. We also log nothing — pointerlockerror handler trips
       * the same lock=false state. */
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
    // MapLibre pitch: 0 = looking straight DOWN (top-down 2D view),
    // 85 = looking nearly horizontal (toward the horizon). For "fly
    // toward the crosshair":
    //   horizontalScale = sin(pitch) → 0 when looking down, ~1 when
    //     looking forward (the look direction has more horizontal).
    //   verticalScale   = cos(pitch) → 1 when looking down, ~0 when
    //     looking forward (the look direction has more downward).
    // W blends horizontal pan with a zoom-in (=descend); S reverses.
    // A/D stay pure strafing — independent of pitch.
    const pitchRad = (map.getPitch() * Math.PI) / 180;
    const horizontalScale = Math.sin(pitchRad);
    const verticalScale = Math.cos(pitchRad);
    const zoomFactor = Math.pow(2, Math.min(SPEED_ZOOM_CAP, 20 - zoom));
    const speed = BASE_SPEED * zoomFactor;

    const hasMoveKey = keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d");
    const shiftHeld = keys.has("shift");
    const mult = shiftHeld && hasMoveKey ? 3 : 1;

    let tLng = 0;
    let tLat = 0;
    let tZoom = 0;

    if (keys.has("w")) {
      tLng += Math.sin(bearingRad) * speed * horizontalScale;
      tLat += Math.cos(bearingRad) * speed * horizontalScale;
      tZoom += ZOOM_STEP * verticalScale; // +zoom = camera closer = descend
    }
    if (keys.has("s")) {
      tLng -= Math.sin(bearingRad) * speed * horizontalScale;
      tLat -= Math.cos(bearingRad) * speed * horizontalScale;
      tZoom -= ZOOM_STEP * verticalScale;
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

  rafId = requestAnimationFrame(tick);

  return {
    enable() {
      if (disposed) return;
      enabled = true;
      // Acquire pointer lock immediately so the mouse free-looks the
      // moment drone mode starts. The toggle-button click is the user
      // gesture that authorises the request; React's useEffect runs
      // synchronously after the click commits, so most browsers honour
      // the request. If it fails (some browsers reject outside a fresh
      // gesture), the user can simply toggle the button again or rely
      // on the next click on the canvas re-acquiring it.
      requestLock();
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
    isAvailable: () => true,
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
      } catch {
        /* container may already be gone if map.remove() ran first */
      }
      releasePointerLock();
      keys.clear();
    },
  };
}
