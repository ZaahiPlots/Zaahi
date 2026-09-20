"use client";
import { GOLD } from "@/lib/design-tokens";
// WebGL context-loss overlay (perf-2026-08-21 item 5). Without this
// the canvas simply goes blank under fully interactive chrome, which
// is indistinguishable from a hang. zIndex clears every panel.
export function ContextLostOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "rgba(10, 22, 40, 0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: GOLD,
        fontFamily: 'Georgia, "Times New Roman", serif',
        letterSpacing: "0.08em",
      }}
      role="alert"
      aria-live="assertive"
    >
      <div style={{ fontSize: 14, fontWeight: 700 }}>MAP INTERRUPTED</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.8,
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          letterSpacing: "normal",
          maxWidth: 380,
          textAlign: "center",
        }}
      >
        The map failed to load — the browser dropped its graphics context.
        Trying to restore it automatically.
      </div>
      {/* A retry the user can actually press. Automatic restoration depends
          on the browser firing webglcontextrestored, which it may never do:
          on a GPU reset under memory pressure the context can stay dead. The
          reported case was a blank map with every control live and nothing
          to click, so the recovery path must not be invisible OR passive. */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: 4,
          padding: "8px 18px",
          borderRadius: 6,
          border: `1px solid ${GOLD}`,
          background: "rgba(200, 169, 110, 0.12)",
          color: GOLD,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          transition: "background 150ms ease, border-color 150ms ease",
        }}
      >
        Retry
      </button>
    </div>
  );
}
