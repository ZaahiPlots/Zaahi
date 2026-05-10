// Shared style tokens for /register. Stays consistent with the
// landing page brand language (Georgia for logo/headings,
// system-ui body, gold #C8A96E accent over navy glass).

import type { CSSProperties } from "react";

export const GOLD = "#C8A96E";
export const GOLD_DIM = "rgba(200, 169, 110, 0.6)";
export const NAVY = "#0A0F1E";
export const TEXT = "rgba(245, 241, 232, 0.85)";
export const TEXT_DIM = "rgba(245, 241, 232, 0.55)";
export const ERROR = "#ff6b6b";

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: TEXT,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 150ms ease",
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: TEXT_DIM,
  marginBottom: 6,
  fontWeight: 600,
};

export const helperStyle: CSSProperties = {
  fontSize: 11,
  color: TEXT_DIM,
  marginTop: 4,
  lineHeight: 1.5,
};

export const errorStyle: CSSProperties = {
  fontSize: 11,
  color: ERROR,
  marginTop: 4,
};

export const primaryButtonStyle: CSSProperties = {
  padding: "12px 20px",
  background: GOLD,
  color: NAVY,
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.1em",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "opacity 150ms ease, background 150ms ease",
};

export const ghostButtonStyle: CSSProperties = {
  padding: "12px 20px",
  background: "transparent",
  color: TEXT,
  border: `1px solid rgba(255,255,255,0.18)`,
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "border-color 150ms ease, background 150ms ease",
};
