"use client";

// ZAAHI — keyboard navigation for the normal /parcels/map view.
//
// 2026-06-11 (Phase 2 feat/keyboard-nav). Replaces the removed drone
// mode (postmortem: docs/research/drone-fps-postmortem-2026-06-11.md).
// MapLibre's tethered camera can't deliver true FPS free-flight, so
// we ship plain keyboard nav on top of the normal map instead. Real
// free-flight waits for the Three.js Signature migration (Plan A).
//
// Design:
//   • Always-on while installed. No modes, no pointer-lock, no HUD.
//   • Runs ALONGSIDE MapLibre's default mouse/touch handlers — drag,
//     scroll-zoom, click, hover, dragRotate all keep working. The
//     loop reads camera state FRESH each frame so a concurrent mouse
//     pan never fights with the keyboard.
//   • MapLibre's own keyboard handler is disabled at construction
//     (keyboard:false) so arrow keys + +/- don't conflict.
//   • One rAF loop, held-keys Set, delta-time integration.
//
// Bindings — see KEY_BINDINGS at the top. All tuning constants
// (speeds, lerp rates, scale-with-zoom curve) sit in TUNING at the
// top of the file in one block.
//
// Guards (all four):
//   1. INPUT / TEXTAREA / contentEditable focus → ignore keys.
//   2. Open modal in DOM ([role="dialog"] or [data-archie-chat-open])
//      → ignore keys.
//   3. BUTTON / A / [role="button"] focus + Space|Enter → ignore
//      (don't block button activation).
//   4. Window blur → clear held-keys Set (no stuck flying after
//      Alt-Tab away).
//
// Camera writes:
//   Each tick computes a target velocity vector (forward + strafe in
//   m/s, bearing-rate, pitch-rate, zoom-rate) from held keys, lerps
//   current velocity toward target, then applies the delta as a
//   single map.jumpTo() per frame. We do NOT cache the camera —
//   pose state is read at the top of each frame so mouse-drag pans
//   are preserved.

import type maplibregl from "maplibre-gl";

// ─────────────────────────────────────────────────────────────────
// KEY BINDINGS — KeyboardEvent.code values (layout-independent, so
// AZERTY / Cyrillic etc. all work without remapping).
// ─────────────────────────────────────────────────────────────────

const KEY_BINDINGS = {
  forward:   ["KeyW", "ArrowUp"],
  back:      ["KeyS", "ArrowDown"],
  strafeLeft:  ["KeyA", "ArrowLeft"],
  strafeRight: ["KeyD", "ArrowRight"],
  yawCcw:    ["KeyQ"],
  yawCw:     ["KeyE"],
  ascend:    ["Space"],
  descend:   ["KeyC"],
  pitchUp:   ["KeyR"],
  pitchDown: ["KeyF"],
  sprintModifier: ["ShiftLeft", "ShiftRight"],
} as const;

// ─────────────────────────────────────────────────────────────────
// TUNING — all rates / scales / lerp coefficients live here.
// ─────────────────────────────────────────────────────────────────

const TUNING = {
  // Base pan speed in metres per second at zoom 12. Scales up with
  // zoom — "выше zoom = быстрее" (founder spec 2026-06-11).
  // 2026-06-11 retune after founder smoke: 90 → 350 (city flight
  // should feel brisk, not crawling).
  basePanMps: 350,
  // Per-zoom-level multiplier above the baseline.
  // 0.18 → 0.35 so streets actually whoosh at z16-18 instead of crawl.
  //   z=12 → 1.00x  ( 350 m/s)
  //   z=14 → 1.70x  ( 595 m/s)
  //   z=16 → 2.40x  ( 840 m/s)
  //   z=18 → 3.10x  (1085 m/s)
  // Sprint stacks on top (×3) so z=18 Shift+W ≈ 3250 m/s — proper
  // drone-low feel.
  zoomSpeedGain: 0.35,
  zoomSpeedBaseline: 12,
  // Sprint multiplier when Shift is held alongside any movement.
  sprintMultiplier: 3.0,

  // Bearing rotation rate, degrees per second (Q / E).
  // 90 → 120 so 360° is ≈3 s (was 4 s) — snappier yaw.
  bearingDegPerSec: 120,
  // Pitch rate, degrees per second (R / F). MapLibre's maxPitch
  // is read live from the map so we never push past it.
  // 45 → 60 so 0→70° is ≈1.2 s (was 1.6 s).
  pitchDegPerSec: 60,
  // Zoom rate, zoom-levels per second (Space / C).
  // 1.5 → 2.5 so Space takes you out 5 zoom-steps in 2 s (was 3.3 s).
  zoomPerSec: 2.5,

  // Velocity lerp rate. 0 = no smoothing (instant snap), 1 = no
  // movement. 0.18 → 0.35 — faster response to press/release. At
  // 60 fps this is ~64% closing per 100 ms (≈99% in ~250 ms), still
  // smooth but no perceptible lag before the camera starts moving.
  velocityLerp: 0.35,

  // dt clamp — single-frame integration step never exceeds this.
  // Protects against tab-stalls where dt would otherwise spike.
  maxDtSec: 0.05,
} as const;

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

export interface KeyboardNavController {
  destroy(): void;
}

export function installKeyboardNav(
  map: maplibregl.Map,
): KeyboardNavController {
  const heldKeys = new Set<string>();
  let rafId: number | null = null;
  let lastTs = 0;
  // Body-local velocities. velY = forward, velX = strafe-right.
  let velX = 0;
  let velY = 0;
  let destroyed = false;

  // ─── Guard helpers ───

  function isTextInputFocused(): boolean {
    const ae = document.activeElement as HTMLElement | null;
    if (!ae) return false;
    const tag = ae.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    if (ae.isContentEditable) return true;
    // <select>, range slider etc. are not "text" — let them through.
    return false;
  }

  function isModalOpen(): boolean {
    // role="dialog" covers our a11y-tagged modals (TermsAcceptModal,
    // AddPlotWizardModal, SignOut confirm, OfferModal + AddPlotModal
    // once tagged), the Archie nudge bubble, and any other future
    // dialog that follows the platform a11y convention.
    if (document.querySelector('[role="dialog"]')) return true;
    // ArchibaldChat panel doesn't behave as a true modal (you can
    // pan the map underneath), but founder spec calls it out
    // explicitly. Signalled by a data attribute on the open panel.
    if (document.querySelector('[data-archie-chat-open="true"]')) return true;
    return false;
  }

  function isButtonFocused(): boolean {
    const ae = document.activeElement as HTMLElement | null;
    if (!ae) return false;
    const tag = ae.tagName;
    if (tag === "BUTTON" || tag === "A") return true;
    if (ae.getAttribute("role") === "button") return true;
    return false;
  }

  function isAnyKeyBinding(code: string): boolean {
    for (const arr of Object.values(KEY_BINDINGS)) {
      for (const k of arr) if (k === code) return true;
    }
    return false;
  }

  // ─── Event handlers ───

  function onKeyDown(e: KeyboardEvent): void {
    if (destroyed) return;
    if (!isAnyKeyBinding(e.code)) return;
    // Guards 1 + 2: text input or modal → don't capture anything.
    if (isTextInputFocused() || isModalOpen()) return;
    // Guard 3: BUTTON/A focus + Space/Enter → let the activation
    // through. Enter isn't bound to nav either, but include for safety.
    if ((e.code === "Space" || e.code === "Enter") && isButtonFocused()) return;
    // Space would scroll the page if not prevented. We capture it
    // for zoom-out; the modifiers are user-typing-friendly because
    // of guards 1+3 above.
    if (e.code === "Space") e.preventDefault();
    heldKeys.add(e.code);
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (destroyed) return;
    heldKeys.delete(e.code);
  }

  function onBlur(): void {
    // Guard 4: window blur → drop everything held. Otherwise an
    // Alt-Tab during W would leave the camera flying forever.
    heldKeys.clear();
    velX = 0;
    velY = 0;
  }

  // ─── Loop ───

  function held(arr: readonly string[]): boolean {
    for (const k of arr) if (heldKeys.has(k)) return true;
    return false;
  }

  function loop(now: number): void {
    if (destroyed) return;
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(TUNING.maxDtSec, Math.max(0, (now - lastTs) / 1000));
    lastTs = now;
    if (dt <= 0) return;

    // Read camera state FRESH — mouse drag may have moved the camera
    // between frames; we don't fight it.
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearingDeg = map.getBearing();
    const pitchDeg = map.getPitch();

    // Modifier first so it gates speed for the rest of the frame.
    const sprint = held(KEY_BINDINGS.sprintModifier);

    // ── Translation (W/A/S/D / arrows) ──
    let fwd = 0;
    let strafe = 0;
    if (held(KEY_BINDINGS.forward)) fwd += 1;
    if (held(KEY_BINDINGS.back)) fwd -= 1;
    if (held(KEY_BINDINGS.strafeRight)) strafe += 1;
    if (held(KEY_BINDINGS.strafeLeft)) strafe -= 1;
    // Normalize so diagonal isn't 1.41x faster.
    const mag = Math.hypot(fwd, strafe);
    if (mag > 1) {
      fwd /= mag;
      strafe /= mag;
    }

    const speedScale =
      1 + Math.max(0, zoom - TUNING.zoomSpeedBaseline) * TUNING.zoomSpeedGain;
    const speedMps = TUNING.basePanMps * speedScale * (sprint ? TUNING.sprintMultiplier : 1);

    const targetVelY = fwd * speedMps;
    const targetVelX = strafe * speedMps;
    velY += (targetVelY - velY) * TUNING.velocityLerp;
    velX += (targetVelX - velX) * TUNING.velocityLerp;

    // Project body-local velocity onto world ENU using bearing.
    // bearing=0 → forward looks north (+lat). bearing=90 → forward
    // looks east (+lng). Right-strafe is bearing + 90°.
    const yawRad = (bearingDeg * Math.PI) / 180;
    const fwdLngDir = Math.sin(yawRad);
    const fwdLatDir = Math.cos(yawRad);
    const rgtLngDir = Math.sin(yawRad + Math.PI / 2);
    const rgtLatDir = Math.cos(yawRad + Math.PI / 2);

    const dEastMps = velY * fwdLngDir + velX * rgtLngDir; // east meters/sec
    const dNorthMps = velY * fwdLatDir + velX * rgtLatDir; // north meters/sec
    const dEast = dEastMps * dt;
    const dNorth = dNorthMps * dt;

    // Meters → degrees at this latitude. mpdLng varies with cos(lat).
    const mpdLat = 111_132;
    const mpdLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);
    const newLng = mpdLng > 0 ? center.lng + dEast / mpdLng : center.lng;
    const newLat = mpdLat > 0 ? center.lat + dNorth / mpdLat : center.lat;

    // ── Rotation (Q / E) ──
    let yawInput = 0;
    if (held(KEY_BINDINGS.yawCw)) yawInput += 1;
    if (held(KEY_BINDINGS.yawCcw)) yawInput -= 1;
    const newBearing = bearingDeg + yawInput * TUNING.bearingDegPerSec * dt;

    // ── Pitch (R / F) ──
    let pitchInput = 0;
    if (held(KEY_BINDINGS.pitchUp)) pitchInput += 1;
    if (held(KEY_BINDINGS.pitchDown)) pitchInput -= 1;
    // MapLibre's maxPitch is configurable at construction; read it
    // live so we always respect the page's cap (currently 70°).
    const maxPitch = map.getMaxPitch();
    const newPitch = Math.max(
      0,
      Math.min(maxPitch, pitchDeg + pitchInput * TUNING.pitchDegPerSec * dt),
    );

    // ── Zoom (Space / C) ──
    let zoomInput = 0;
    if (held(KEY_BINDINGS.ascend)) zoomInput -= 1;  // Space = up = zoom out
    if (held(KEY_BINDINGS.descend)) zoomInput += 1; // C     = down = zoom in
    const minZoom = map.getMinZoom();
    const maxZoom = map.getMaxZoom();
    const newZoom = Math.max(
      minZoom,
      Math.min(maxZoom, zoom + zoomInput * TUNING.zoomPerSec * dt),
    );

    // Idle short-circuit — nothing changed, skip the jumpTo. Avoids
    // gratuitous movestart/moveend events when the user isn't touching
    // anything but the loop is still running.
    if (
      Math.abs(velX) < 0.05 && Math.abs(velY) < 0.05 &&
      yawInput === 0 && pitchInput === 0 && zoomInput === 0
    ) {
      return;
    }

    map.jumpTo({
      center: [newLng, newLat],
      bearing: newBearing,
      pitch: newPitch,
      zoom: newZoom,
    });
  }

  // ─── Wiring ───

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  // Some browsers fire `pagehide` instead of `blur` on tab close — clear
  // the same way to be safe.
  window.addEventListener("pagehide", onBlur);

  lastTs = performance.now();
  rafId = requestAnimationFrame(loop);

  return {
    destroy(): void {
      destroyed = true;
      heldKeys.clear();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onBlur);
    },
  };
}
