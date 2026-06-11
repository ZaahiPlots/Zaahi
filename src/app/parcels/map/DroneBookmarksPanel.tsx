"use client";

// ZAAHI drone — Bookmarks panel (founder spec 2026-06-10).
//
// Glassmorphism floating panel surfaced via the HUD. Lists localStorage
// bookmarks; click a row to fly there; delete via trailing "×" button.
// B-key save is handled in page.tsx and writes via bookmarks lib —
// this component just renders + re-loads the list.
//
// Pointer-events ENABLED — the panel is interactive. Only mounted when
// the controller is NOT pointer-locked (founder rule: re-lock requires
// a fresh click on the map after dismissing the panel).

import { useEffect, useState } from "react";
import {
  GLASS_BG,
  GLASS_BORDER,
  GLASS_BLUR,
  GOLD,
  GOLD_HOVER,
  TRANSITION_FAST,
} from "@/lib/drone/constants";
import {
  type DroneBookmark,
  deleteBookmark,
  loadBookmarks,
} from "@/lib/drone/bookmarks";

export interface BookmarksPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (b: DroneBookmark) => void;
  /** Bumped by the parent every time it adds a bookmark, so we reload. */
  refreshSignal: number;
}

export default function DroneBookmarksPanel({
  open,
  onClose,
  onSelect,
  refreshSignal,
}: BookmarksPanelProps) {
  const [items, setItems] = useState<DroneBookmark[]>([]);
  useEffect(() => {
    if (!open) return;
    setItems(loadBookmarks());
  }, [open, refreshSignal]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Drone bookmarks"
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 320,
        maxHeight: "60vh",
        padding: 14,
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: 12,
        color: "#fff",
        fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
        zIndex: 38,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            color: GOLD,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 13,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Bookmarks
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close bookmarks"
          style={{
            background: "transparent",
            border: 0,
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, padding: "8px 0" }}>
          No bookmarks yet. Press <span style={{ color: GOLD }}>B</span> while
          flying to save the current view.
        </div>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          overflowY: "auto",
          maxHeight: "44vh",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {items.map((b) => (
          <li
            key={b.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: `background ${TRANSITION_FAST}, border-color ${TRANSITION_FAST}`,
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(b)}
              style={{
                flex: 1,
                background: "transparent",
                border: 0,
                color: "#fff",
                fontSize: 12,
                textAlign: "left",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontWeight: 600 }}>{b.name}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>
                alt {Math.round(b.altM)} m · bearing {Math.round(b.bearing)}°
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                deleteBookmark(b.id);
                setItems(loadBookmarks());
              }}
              aria-label="Delete bookmark"
              style={{
                background: GOLD_HOVER,
                border: `1px solid ${GOLD}`,
                color: GOLD,
                cursor: "pointer",
                fontSize: 12,
                width: 24,
                height: 24,
                borderRadius: 4,
                padding: 0,
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
