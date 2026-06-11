"use client";

// ZAAHI drone HUD — glassmorphism (founder spec 2026-06-10).
// SUPERSEDES the previous green-phosphor military overlay completely.
//
// Pieces:
//   - Centre crosshair dot (gold accent when over selectable plot)
//   - Bottom glassmorphism bar: altitude / speed / compass + "R" overview
//   - Vignette (radial gradient corners)
//   - Mode-entry banner that fades after HUD_MODE_BANNER_MS
//
// All elements are pointer-events: none EXCEPT the overview button which
// is clickable only when the camera is NOT pointer-locked (founder spec —
// re-lock must be a fresh click from the user).
//
// The HUD reads pose from the parent via props; the parent owns the
// controller state.

import { useEffect, useState } from "react";
import {
  GLASS_BG,
  GLASS_BORDER,
  GLASS_BLUR,
  GOLD,
  GOLD_HOVER,
  HUD_MODE_BANNER_MS,
  TRANSITION_FAST,
} from "@/lib/drone/constants";

export type StatusFilterId = "completed" | "underConstruction" | "preConstruction" | "suspended" | "empty";

interface DroneHUDProps {
  visible: boolean;
  isPointerLocked: boolean;
  /** True when the user opened a plot/panel mid-flight and the camera
   *  is waiting for a click on the map to resume. Renders a glassmorphism
   *  resume hint near the centre of the screen. */
  pausedHint: boolean;
  /** Currently-shown bearing 0-360. */
  bearing: number;
  /** Altitude in metres above terrain proxy. */
  altitudeM: number;
  /** Ground-relative speed in m/s. */
  speedMps: number;
  /** Whether the crosshair is currently over a selectable plot. Gold accent. */
  overSelectable: boolean;
  /** Active status filter chip (1-5) or null. */
  activeFilter: StatusFilterId | null;
  onOverviewClick: () => void;
}

const STATUS_LABEL: Record<StatusFilterId, string> = {
  completed: "Completed",
  underConstruction: "Under construction",
  preConstruction: "Pre-construction",
  suspended: "Suspended",
  empty: "Empty",
};

function fmtNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function compassLetters(bearing: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(((bearing % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

export default function DroneHUD({
  visible,
  isPointerLocked,
  pausedHint,
  bearing,
  altitudeM,
  speedMps,
  overSelectable,
  activeFilter,
  onOverviewClick,
}: DroneHUDProps) {
  // Mode banner fade
  const [bannerVisible, setBannerVisible] = useState(false);
  useEffect(() => {
    if (!visible) {
      setBannerVisible(false);
      return;
    }
    setBannerVisible(true);
    const t = window.setTimeout(() => setBannerVisible(false), HUD_MODE_BANNER_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Vignette — corner-weighted radial gradient. pointer-events:none. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 75% 60% at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          zIndex: 35,
        }}
      />

      {/* Crosshair (16px gold dot, ring on hover-over-selectable). */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: overSelectable ? 18 : 8,
          height: overSelectable ? 18 : 8,
          borderRadius: "50%",
          background: overSelectable ? "transparent" : "rgba(255,255,255,0.95)",
          border: overSelectable ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.7)",
          boxShadow: overSelectable
            ? `0 0 12px ${GOLD}, 0 0 24px rgba(200,169,110,0.4)`
            : "0 0 4px rgba(0,0,0,0.5)",
          pointerEvents: "none",
          zIndex: 36,
          transition: `width 150ms ${TRANSITION_FAST.split(" ")[1]}, height 150ms, background 150ms, border-color 150ms`,
        }}
      />

      {/* Bottom HUD strip — altitude / speed / compass + overview button + active filter chip. */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 24,
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 14px",
          background: GLASS_BG,
          backdropFilter: GLASS_BLUR,
          WebkitBackdropFilter: GLASS_BLUR,
          border: `1px solid ${GLASS_BORDER}`,
          borderRadius: 999,
          color: "#fff",
          fontFamily: '"SF Mono", Menlo, Consolas, monospace',
          fontSize: 12,
          letterSpacing: "0.04em",
          pointerEvents: "auto",
          zIndex: 37,
        }}
      >
        <HudCell label="ALT" value={`${fmtNumber(altitudeM)} m`} />
        <HudDivider />
        <HudCell label="SPD" value={`${fmtNumber(speedMps)} m/s`} />
        <HudDivider />
        <HudCell label={compassLetters(bearing)} value={`${fmtNumber(bearing)}°`} />
        <HudDivider />
        <button
          type="button"
          onClick={onOverviewClick}
          disabled={isPointerLocked}
          aria-label="Overview"
          title={isPointerLocked ? "Press R or exit lock to use" : "Press R or click for community overview"}
          style={{
            background: GOLD_HOVER,
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontFamily: "inherit",
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            cursor: isPointerLocked ? "default" : "pointer",
            opacity: isPointerLocked ? 0.55 : 1,
            transition: `background-color ${TRANSITION_FAST}, border-color ${TRANSITION_FAST}, opacity ${TRANSITION_FAST}`,
          }}
        >
          R · Overview
        </button>
        {activeFilter && (
          <>
            <HudDivider />
            <span
              style={{
                background: "rgba(200,169,110,0.12)",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              FILTER · {STATUS_LABEL[activeFilter]}
            </span>
          </>
        )}
      </div>

      {/* Paused hint — visible while drone is on but pointer-lock is
          released (a plot panel / bookmarks panel took over). */}
      {pausedHint && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "calc(50% + 40px)",
            transform: "translateX(-50%)",
            padding: "8px 14px",
            background: GLASS_BG,
            backdropFilter: GLASS_BLUR,
            WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid ${GLASS_BORDER}`,
            borderRadius: 999,
            color: "rgba(255,255,255,0.9)",
            fontSize: 11,
            letterSpacing: "0.05em",
            zIndex: 38,
            pointerEvents: "none",
          }}
        >
          Click map to resume drone flight
        </div>
      )}

      {/* Mode banner — fades after 3s. */}
      {bannerVisible && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 32,
            transform: "translateX(-50%)",
            padding: "6px 14px",
            background: GLASS_BG,
            backdropFilter: GLASS_BLUR,
            WebkitBackdropFilter: GLASS_BLUR,
            border: `1px solid ${GLASS_BORDER}`,
            borderRadius: 999,
            color: GOLD,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            zIndex: 38,
            opacity: 1,
            transition: "opacity 800ms ease",
            pointerEvents: "none",
          }}
        >
          DRONE MODE · ESC to exit
        </div>
      )}
    </>
  );
}

function HudCell({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, letterSpacing: "0.15em" }}>{label}</span>
      <span style={{ color: "#fff", fontWeight: 600 }}>{value}</span>
    </span>
  );
}
function HudDivider() {
  return <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} aria-hidden />;
}
