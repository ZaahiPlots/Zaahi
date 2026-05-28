"use client";
import { useEffect, useState } from "react";

const GOLD = "#C8A96E";
const TEAL = "#1B4965";
const GREEN = "#2D6A4F";
const RED = "#E63946";
const SUBTLE = "#6B7280";

export type DdaFetchPhase = "idle" | "fetching" | "parsing" | "saving" | "done" | "error";

// Three-stage progress bar used by SidePanel while a parcel's affection
// plan is being (re)fetched from DDA. Mirrors the visual language of
// PdfProgressBar but carries a labelled phase rather than a single busy
// flag — DDA fetches have observable steps the founder asked us to
// surface.
//
// Phase widths are linear: fetching → 33%, parsing → 66%, saving → 95%,
// done → 100% (then auto-hides via the parent setting phase to idle).
const PHASE_WIDTH: Record<DdaFetchPhase, number> = {
  idle: 0,
  fetching: 33,
  parsing: 66,
  saving: 95,
  done: 100,
  error: 100,
};

const PHASE_LABEL: Record<DdaFetchPhase, string> = {
  idle: "",
  fetching: "Fetching from DDA…",
  parsing: "Parsing plan…",
  saving: "Saving…",
  done: "Done ✓",
  error: "Failed",
};

export function DdaFetchProgress({ phase, error }: { phase: DdaFetchPhase; error?: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase !== "idle") setVisible(true);
  }, [phase]);

  if (!visible) return null;

  const isError = phase === "error";
  const isDone = phase === "done";
  const fill = isError ? RED : isDone ? GREEN : GOLD;
  const width = PHASE_WIDTH[phase];

  return (
    <div
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={PHASE_LABEL[phase]}
      style={{
        marginTop: 6,
        fontSize: 10,
        fontFamily: '"SF Mono", Menlo, monospace',
        color: SUBTLE,
        transition: "opacity 200ms ease",
        opacity: phase === "idle" ? 0 : 1,
      }}
      onTransitionEnd={() => {
        // Once the parent flips phase back to idle, hide the bar
        // entirely so it doesn't keep a layout footprint.
        if (phase === "idle") setVisible(false);
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 3,
      }}>
        <span style={{ color: isError ? RED : isDone ? GREEN : TEAL, letterSpacing: "0.04em" }}>
          {isError && error ? `${PHASE_LABEL.error}: ${error}` : PHASE_LABEL[phase]}
        </span>
        <span>{width}%</span>
      </div>
      <div style={{
        position: "relative", height: 4, background: "rgba(255,255,255,0.08)",
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${width}%`, background: fill,
          transition: "width 350ms ease, background 200ms ease",
        }} />
      </div>
    </div>
  );
}
