"use client";

// ZAAHI drone — FPS free-camera flight controller (founder spec 2026-06-10).
//
// SUPERSEDES src/lib/drone-controls.ts (cursor-tracking variant, military
// HUD) which is now deleted. Founder directive: military HUD replaced
// by glassmorphism; Space + click-to-fly removed; click is plot
// selection only.
//
// Implementation note (2026-06-10): MapLibre GL JS v5.x removed the
// public FreeCameraOptions API surface that earlier versions exposed.
// We drive the camera through the standard API instead — setCenter +
// setBearing + setPitch + setZoom — and translate altitude changes via
// a baseline-zoom altitude↔zoom mapping. This preserves the FPS feel
// (look down + W = descend, look up + W = climb) without depending on
// internal APIs that the upstream may break again. All maths is
// labelled and the constants live in src/lib/drone/constants.ts.
//
// Controls when enabled:
//   Mouse  — viewport is pointer-locked. dx/dy → bearing/pitch deltas
//            at MOUSE_SENSITIVITY_DEG_PER_PX. Pitch clamps to MAX_PITCH_DEG.
//            Excess "look up" past the ceiling converts to a climb command
//            (CLIMB_PIXELS_PER_METRE).
//   W      — forward along the full 3D look vector (bearing + pitch).
//   S      — reverse along the same vector.
//   A / D  — horizontal strafe perpendicular to bearing only (no vertical
//            component — strafes don't dive or climb).
//   Shift  — sprint × SPRINT_MULTIPLIER (smooth ramp via velocity lerp).
//   Esc    — exit pointer lock; controller calls opts.onExit.

import type maplibregl from "maplibre-gl";
import {
  BASE_SPEED_MPS,
  CEILING_M,
  CLIMB_PIXELS_PER_METRE,
  FLOOR_HEIGHT_M,
  KEY_BINDINGS,
  MAX_PITCH_DEG,
  MOUSE_SENSITIVITY_DEG_PER_PX,
  SPEED_ALTITUDE_GAIN,
  SPEED_FLOOR_MPS,
  SPRINT_MULTIPLIER,
  VELOCITY_LERP,
} from "./constants";

// ── Types ────────────────────────────────────────────────────────

export interface DroneFpsController {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  isAvailable(): boolean;
  destroy(): void;
  /** Called by external UI ("R" overview, bookmark fly) when it wants
   *  the controller to stop reading WASD input briefly (camera is being
   *  driven by an animation). Auto-resumes when the animation completes. */
  freeze(): void;
  unfreeze(): void;
  /** Programmatic camera set (used by overview + bookmark fly). Goes
   *  through the same camera path. Bypasses input — caller controls
   *  timing externally via map.flyTo / easeTo. */
  setCamera(opts: { lng: number; lat: number; altM: number; bearing: number; pitch: number }): void;
}

export interface DroneFpsOptions {
  onExit?: () => void;
  /** Fires every animation frame while in drone mode. */
  onCenterChange?: (s: {
    lng: number;
    lat: number;
    altM: number;
    bearing: number;
    pitch: number;
    speedMps: number;
  }) => void;
  onSprintChange?: (sprinting: boolean) => void;
}

// ── Math helpers ─────────────────────────────────────────────────

function deg2rad(d: number): number { return (d * Math.PI) / 180; }
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function wrapBearing(b: number): number {
  let x = b % 360;
  if (x < 0) x += 360;
  return x;
}

// Altitude ↔ zoom mapping. Calibrated against MapLibre's default 36°
// vertical FOV: at zoom 15 the camera sits ~340m above ground at our
// latitudes. Higher zoom = lower altitude. Exponential because zoom is a
// log scale. These are approximations sufficient for FPS pose; the
// actual MapLibre camera derives altitude from FOV/projection internally
// and stays consistent across the call. Drift on the order of a few
// metres is acceptable for the perceptual flight loop.
const Z_BASELINE = 15;
const ALT_AT_BASELINE_M = 340;
function altFromZoom(zoom: number): number {
  return ALT_AT_BASELINE_M * Math.pow(2, Z_BASELINE - zoom);
}
function zoomFromAlt(altM: number): number {
  const z = Z_BASELINE - Math.log2(Math.max(1, altM) / ALT_AT_BASELINE_M);
  return clamp(z, 9, 21);
}

// One degree of latitude / longitude in metres at a given latitude.
function metresPerDegLat(): number {
  return 111_132; // close enough — varies <0.6% across UAE
}
function metresPerDegLng(lat: number): number {
  return 111_320 * Math.cos(deg2rad(lat));
}

// ── Controller ───────────────────────────────────────────────────

export function installDroneFps(
  map: maplibregl.Map,
  opts: DroneFpsOptions = {},
): DroneFpsController {
  // Desktop + WebGL gate. Touch / coarse-pointer devices return a
  // no-op shell so the caller's code paths stay the same.
  const isAvailable = (() => {
    if (typeof window === "undefined") return false;
    try {
      if (window.matchMedia?.("(pointer: coarse)").matches) return false;
    } catch {
      /* ignore */
    }
    if ("ontouchstart" in window) return false;
    const mn = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints;
    if (typeof mn === "number" && mn > 0) return false;
    return true;
  })();
  if (!isAvailable) {
    return {
      enable() {},
      disable() {},
      isEnabled: () => false,
      isAvailable: () => false,
      destroy() {},
      freeze() {},
      unfreeze() {},
      setCamera() {},
    };
  }

  // ── State ──
  let enabled = false;
  let frozen = false; // overview / bookmark fly window
  let rafId: number | null = null;
  let lastFrameTs = 0;
  const heldKeys = new Set<string>();
  // Current and target velocity in body-local metres/sec.
  // Body-local axes: x=right, y=forward.
  let velX = 0, velY = 0;
  let targetVelX = 0, targetVelY = 0;
  // Pose state. We mirror these back into MapLibre each frame.
  let bearingDeg = 0;
  let pitchDeg = 0;
  let altM = 250;
  let lng = 55.27, lat = 25.2;

  // Snapshot of the user's pre-drone map handlers so we can restore on exit.
  const savedHandlers = {
    dragPan: true,
    dragRotate: true,
    scrollZoom: true,
    keyboard: true,
    boxZoom: true,
    doubleClickZoom: true,
    touchZoomRotate: true,
  };

  const canvas = map.getCanvas();

  function snapshotMapState(): void {
    const c = map.getCenter();
    lng = c.lng;
    lat = c.lat;
    bearingDeg = wrapBearing(map.getBearing());
    // MapLibre pitch is degrees below horizontal. Our FPS pitch is degrees
    // above horizon (0 = looking forward, 85 = looking nearly straight up).
    // Initial: convert MapLibre pitch (0-85) to FPS pitch.
    pitchDeg = clamp(map.getPitch(), 0, MAX_PITCH_DEG);
    // We invert MapLibre's pitch sign because MapLibre tilts the camera
    // *down* when you increase pitch (look at ground), whereas an FPS
    // perspective wants pitch=positive to look up. Wrap as needed.
    pitchDeg = -clamp(map.getPitch(), 0, MAX_PITCH_DEG); // start looking forward + down
    altM = altFromZoom(map.getZoom());
    if (!Number.isFinite(altM) || altM <= 0) altM = 250;
  }

  function silenceMapHandlers(): void {
    savedHandlers.dragPan = map.dragPan.isEnabled();
    savedHandlers.dragRotate = map.dragRotate.isEnabled();
    savedHandlers.scrollZoom = map.scrollZoom.isEnabled();
    savedHandlers.keyboard = map.keyboard.isEnabled();
    savedHandlers.boxZoom = map.boxZoom.isEnabled();
    savedHandlers.doubleClickZoom = map.doubleClickZoom.isEnabled();
    savedHandlers.touchZoomRotate = map.touchZoomRotate.isEnabled();
    map.dragPan.disable();
    map.dragRotate.disable();
    map.scrollZoom.disable();
    map.keyboard.disable();
    map.boxZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
  }
  function restoreMapHandlers(): void {
    if (savedHandlers.dragPan) map.dragPan.enable();
    if (savedHandlers.dragRotate) map.dragRotate.enable();
    if (savedHandlers.scrollZoom) map.scrollZoom.enable();
    if (savedHandlers.keyboard) map.keyboard.enable();
    if (savedHandlers.boxZoom) map.boxZoom.enable();
    if (savedHandlers.doubleClickZoom) map.doubleClickZoom.enable();
    if (savedHandlers.touchZoomRotate) map.touchZoomRotate.enable();
  }

  function applyCamera(): void {
    // MapLibre pitch ranges 0..max-pitch. Our internal pitchDeg ranges
    // [-MAX_PITCH_DEG, +MAX_PITCH_DEG] with sign convention "+ = up".
    // MapLibre wants "down tilt" (positive when looking down). For our
    // FPS we only allow upward look (climb workaround), so MapLibre
    // pitch is max(0, -pitchDeg) — but capped at 85 to match MapLibre's
    // hard limit.
    const mapLibrePitch = clamp(-pitchDeg, 0, 85);
    map.jumpTo({
      center: [lng, lat],
      bearing: bearingDeg,
      pitch: mapLibrePitch,
      zoom: zoomFromAlt(altM),
    });
  }

  // ── Mouse-look ──
  function onMouseMove(e: MouseEvent): void {
    if (!enabled || frozen) return;
    const dx = e.movementX;
    const dy = e.movementY;
    if (!dx && !dy) return;

    bearingDeg = wrapBearing(bearingDeg + dx * MOUSE_SENSITIVITY_DEG_PER_PX);
    // dy positive → mouse moved down → look up (pitch increases).
    const requestedPitch = pitchDeg + dy * MOUSE_SENSITIVITY_DEG_PER_PX;
    if (requestedPitch > MAX_PITCH_DEG) {
      // Past the ceiling — convert excess "look up" pixels into climb.
      const excessDeg = requestedPitch - MAX_PITCH_DEG;
      const excessPx = excessDeg / MOUSE_SENSITIVITY_DEG_PER_PX;
      const climbM = excessPx / CLIMB_PIXELS_PER_METRE;
      altM = clamp(altM + climbM, FLOOR_HEIGHT_M, CEILING_M);
      pitchDeg = MAX_PITCH_DEG;
    } else if (requestedPitch < -MAX_PITCH_DEG) {
      pitchDeg = -MAX_PITCH_DEG;
    } else {
      pitchDeg = requestedPitch;
    }
  }

  // ── Keyboard ──
  function onKeyDown(e: KeyboardEvent): void {
    if (!enabled) return;
    const ae = document.activeElement as HTMLElement | null;
    const tag = ae?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || ae?.isContentEditable) return;
    if (e.code === KEY_BINDINGS.exit) return; // pointer-lock subsystem handles Esc
    heldKeys.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent): void { heldKeys.delete(e.code); }

  // ── Pointer lock lifecycle ──
  function onLockChange(): void {
    if (document.pointerLockElement === canvas) {
      enabled = true;
      lastFrameTs = performance.now();
      silenceMapHandlers();
      if (rafId == null) rafId = requestAnimationFrame(loop);
    } else {
      heldKeys.clear();
      enabled = false;
      restoreMapHandlers();
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (opts.onExit) opts.onExit();
    }
  }

  // ── Animation loop ──
  function loop(now: number): void {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrameTs) / 1000));
    lastFrameTs = now;

    if (!frozen) {
      const w = heldKeys.has(KEY_BINDINGS.forward);
      const s = heldKeys.has(KEY_BINDINGS.back);
      const a = heldKeys.has(KEY_BINDINGS.left);
      const d = heldKeys.has(KEY_BINDINGS.right);
      const sprint =
        heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight");

      const altSpeedMult = 1 + (Math.max(0, altM - 120) / 100) * SPEED_ALTITUDE_GAIN;
      const speed = Math.max(SPEED_FLOOR_MPS, BASE_SPEED_MPS * altSpeedMult) * (sprint ? SPRINT_MULTIPLIER : 1);

      let fwd = 0;
      if (w) fwd += 1;
      if (s) fwd -= 1;
      let strafe = 0;
      if (d) strafe += 1;
      if (a) strafe -= 1;
      const mag = Math.hypot(fwd, strafe) || 1;
      fwd /= mag;
      strafe /= mag;

      targetVelY = fwd * speed;
      targetVelX = strafe * speed;

      if (opts.onSprintChange) opts.onSprintChange(sprint && (w || s || a || d));

      velX += (targetVelX - velX) * VELOCITY_LERP;
      velY += (targetVelY - velY) * VELOCITY_LERP;

      const yaw = deg2rad(bearingDeg);
      const tilt = deg2rad(pitchDeg);
      // Forward unit vector: x=east, y=north, z=up. With bearing=0 we
      // look north; bearing=90 looks east. pitch=positive looks up.
      const fwdE = Math.sin(yaw) * Math.cos(tilt);
      const fwdN = Math.cos(yaw) * Math.cos(tilt);
      const fwdU = Math.sin(tilt);
      // Strafe: bearing rotated +90° CW. Horizontal only.
      const strE = Math.sin(yaw + Math.PI / 2);
      const strN = Math.cos(yaw + Math.PI / 2);

      const dE = (velY * fwdE + velX * strE) * dt;
      const dN = (velY * fwdN + velX * strN) * dt;
      const dU = (velY * fwdU) * dt;

      // Apply horizontal motion.
      const mpdLat = metresPerDegLat();
      const mpdLng = metresPerDegLng(lat);
      if (mpdLng > 0) lng += dE / mpdLng;
      if (mpdLat > 0) lat += dN / mpdLat;
      altM = clamp(altM + dU, FLOOR_HEIGHT_M, CEILING_M);

      applyCamera();

      if (opts.onCenterChange) {
        opts.onCenterChange({
          lng, lat, altM, bearing: bearingDeg, pitch: pitchDeg,
          speedMps: Math.hypot(velX, velY),
        });
      }
    } else {
      // Frozen — emit current pose for HUD smoothness.
      const c = map.getCenter();
      lng = c.lng;
      lat = c.lat;
      bearingDeg = wrapBearing(map.getBearing());
      pitchDeg = -clamp(map.getPitch(), 0, MAX_PITCH_DEG);
      altM = altFromZoom(map.getZoom());
      if (opts.onCenterChange) {
        opts.onCenterChange({ lng, lat, altM, bearing: bearingDeg, pitch: pitchDeg, speedMps: 0 });
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  function enable(): void {
    if (enabled) return;
    snapshotMapState();
    try {
      canvas.requestPointerLock();
    } catch {
      /* lost user-gesture context */
    }
  }
  function disable(): void {
    if (!enabled) return;
    document.exitPointerLock();
  }
  function isEnabled(): boolean { return enabled; }
  function freeze(): void {
    frozen = true;
    heldKeys.clear();
    velX = 0; velY = 0;
  }
  function unfreeze(): void { frozen = false; }
  function setCamera(c: { lng: number; lat: number; altM: number; bearing: number; pitch: number }): void {
    lng = c.lng;
    lat = c.lat;
    altM = clamp(c.altM, FLOOR_HEIGHT_M, CEILING_M);
    bearingDeg = wrapBearing(c.bearing);
    pitchDeg = clamp(c.pitch, -MAX_PITCH_DEG, MAX_PITCH_DEG);
    applyCamera();
  }
  function destroy(): void {
    document.removeEventListener("pointerlockchange", onLockChange);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    if (rafId != null) cancelAnimationFrame(rafId);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    restoreMapHandlers();
  }

  document.addEventListener("pointerlockchange", onLockChange);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  return {
    enable, disable, isEnabled, isAvailable: () => true, destroy,
    freeze, unfreeze, setCamera,
  };
}
