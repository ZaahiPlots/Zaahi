// ZAAHI — toggleable auto-rotate camera for the parcels map.
//
// `installAutoRotate(map)` wires a passive rAF loop + interaction listeners
// once, but rotation is gated by an internal `enabled` flag that the caller
// flips via the returned controller. The map page renders a toggle button
// on the chrome (under the drone-mode button) and calls `enable()` /
// `disable()` when the user clicks it. Mutually exclusive with drone mode
// (caller enforces).
//
// Behaviour when enabled:
//   - rotates camera CLOCKWISE (bearing decreases) at 6 °/sec
//     → full revolution every 60 seconds
//   - any user input (mousedown / touchstart / wheel / keydown) or any
//     externally-driven camera op (drag, flyTo, easeTo from elsewhere in
//     the app) pauses rotation for 3 s; the timer resets on each new
//     interaction. After 3 s of true idle, rotation resumes.
//   - rotation is gated by minimum zoom (11) and minimum pitch (30°).
//     Below these thresholds the rAF tick runs but doesn't move the
//     camera (still cheap; avoids spinning a flat 2D view that doesn't
//     showcase 3D).
//   - while the tab is hidden, rotation pauses (battery-friendly).
//   - if MapLibre is in the middle of its own transition (`isEasing()` —
//     e.g. an easeTo for 2D↔3D, flyToBuilding, or the page's tilt-on-
//     enable), the tick skips setBearing for that frame to avoid
//     cancelling the in-progress transition.
//
// Self vs external camera ops:
//   Each setBearing tick fires movestart/move/moveend synchronously.
//   A `selfDriven` flag is set during the call so the movestart handler
//   ignores our own ticks. External movestart (user drag, programmatic
//   flyTo / easeTo) has selfDriven=false → resets the pause timer.

import type maplibregl from "maplibre-gl";

const SECONDS_PER_REVOLUTION = 60;
const DEG_PER_MS = 360 / (SECONDS_PER_REVOLUTION * 1000);
const IDLE_RESUME_MS = 5000;
const MIN_ZOOM = 11;
const MIN_PITCH = 30;

export type AutoRotateController = {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  destroy(): void;
};

export function installAutoRotate(map: maplibregl.Map): AutoRotateController {
  let enabled = false;
  let disposed = false;
  let rafId: number | null = null;
  let selfDriven = false;
  let pauseUntil = 0;

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  let lastT = now();

  const container = map.getCanvasContainer();

  function bumpPause() {
    pauseUntil = now() + IDLE_RESUME_MS;
  }

  function shouldRotate(t: number): boolean {
    if (!enabled) return false;
    if (t < pauseUntil) return false;
    if (typeof document !== "undefined" && document.hidden) return false;
    // Don't fight in-progress easeTo / flyTo (incl. our caller's tilt-to-3D).
    if (map.isEasing()) return false;
    if (map.getPitch() < MIN_PITCH) return false;
    if (map.getZoom() < MIN_ZOOM) return false;
    return true;
  }

  function tick() {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    const t = now();
    const dt = t - lastT;
    lastT = t;
    if (!shouldRotate(t)) return;
    const step = dt * DEG_PER_MS;
    selfDriven = true;
    try {
      // Clockwise: bearing decreases. MapLibre normalises to (-180, 180].
      map.setBearing(map.getBearing() - step);
    } finally {
      selfDriven = false;
    }
  }

  // External movestart (user drag, programmatic flyTo / easeTo elsewhere)
  // pauses rotation. Our own setBearing also fires movestart but
  // selfDriven gates it out.
  function onMoveStart() {
    if (selfDriven) return;
    bumpPause();
  }
  function onMoveEnd() {
    if (selfDriven) return;
    bumpPause();
  }

  // Preemptive pause on raw user input — slightly smoother than waiting
  // for MapLibre to begin handling the drag.
  function onUserInput() {
    bumpPause();
  }

  function onVisibilityChange() {
    if (document.hidden) {
      pauseUntil = Number.POSITIVE_INFINITY;
    } else {
      // Reset frame timer + give a 3 s grace on tab return so the camera
      // doesn't snap straight into rotation after a long absence.
      lastT = now();
      bumpPause();
    }
  }

  map.on("movestart", onMoveStart);
  map.on("moveend", onMoveEnd);
  container.addEventListener("mousedown", onUserInput);
  container.addEventListener("touchstart", onUserInput, { passive: true });
  container.addEventListener("wheel", onUserInput, { passive: true });
  window.addEventListener("keydown", onUserInput);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  rafId = requestAnimationFrame(tick);

  return {
    enable() {
      if (disposed) return;
      enabled = true;
      // Reset frame timer so the first tick after enable starts from
      // "now" and doesn't apply a stale dt.
      lastT = now();
    },
    disable() {
      if (disposed) return;
      enabled = false;
    },
    isEnabled: () => enabled,
    destroy() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      map.off("movestart", onMoveStart);
      map.off("moveend", onMoveEnd);
      try {
        container.removeEventListener("mousedown", onUserInput);
        container.removeEventListener("touchstart", onUserInput);
        container.removeEventListener("wheel", onUserInput);
      } catch {
        /* container may already be gone if map.remove() ran first */
      }
      window.removeEventListener("keydown", onUserInput);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    },
  };
}
