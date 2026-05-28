// Shared style tokens + small helpers for /admin/queue.
// Same brand language as the rest of cohort-pilot (gold #C8A96E,
// navy bg, glass cards, Georgia serif headings).

import type { CSSProperties } from "react";

// Tokens unified against login reference (src/app/page.tsx). NAVY is
// retained as a solid colour for chip / primary-button on-colour
// contrast (gold-on-navy CTA reads better than gold-on-gradient).
export const GOLD = "#C8A96E";
export const NAVY = "#0A1628";
export const NAVY_CARD = "rgba(255,255,255,0.04)";
export const TEXT = "#FFFFFF";
export const TEXT_DIM = "rgba(255, 255, 255, 0.5)";
export const TEXT_FADE = "rgba(255, 255, 255, 0.35)";
export const ERROR = "#ff6b6b";
export const AMBER = "#E67E22";
export const RED = "#E63946";
export const GREEN = "#2D6A4F";

export const card: CSSProperties = {
  background: "rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: 12,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 16px 64px rgba(0,0,0,0.4)",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255, 255, 255, 0.12)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: 8,
  color: TEXT,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

export const primaryBtn: CSSProperties = {
  padding: "10px 18px",
  background: GOLD,
  color: NAVY,
  border: "none",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  cursor: "pointer",
  fontFamily: "inherit",
};

export const ghostBtn: CSSProperties = {
  padding: "10px 18px",
  background: "transparent",
  color: TEXT,
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  cursor: "pointer",
  fontFamily: "inherit",
};

export const dangerBtn: CSSProperties = {
  ...ghostBtn,
  borderColor: "rgba(230, 57, 70, 0.5)",
  color: "#ff8a92",
};

export type RegistrationStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WAITLIST";

export const STATUS_COLORS: Record<RegistrationStatus, { bg: string; fg: string; border: string; label: string }> = {
  PENDING_REVIEW: {
    bg: "rgba(200, 169, 110, 0.12)",
    fg: GOLD,
    border: "rgba(200, 169, 110, 0.4)",
    label: "PENDING",
  },
  WAITLIST: {
    bg: "rgba(230, 126, 34, 0.14)",
    fg: AMBER,
    border: "rgba(230, 126, 34, 0.5)",
    label: "WAITLIST",
  },
  APPROVED: {
    bg: "rgba(45, 106, 79, 0.16)",
    fg: "#7DC79A",
    border: "rgba(45, 106, 79, 0.5)",
    label: "APPROVED",
  },
  REJECTED: {
    bg: "rgba(230, 57, 70, 0.12)",
    fg: "#ff8a92",
    border: "rgba(230, 57, 70, 0.4)",
    label: "REJECTED",
  },
};

/** Cap counter colour per spec §7.3. */
export function capCounterColor(count: number, cap: number): {
  fg: string;
  bg: string;
  warn: boolean;
} {
  if (count > cap) return { fg: RED, bg: "rgba(230,57,70,0.12)", warn: true };
  if (count === cap) return { fg: RED, bg: "rgba(230,57,70,0.08)", warn: false };
  if (count >= 8) return { fg: AMBER, bg: "rgba(230,126,34,0.10)", warn: false };
  return { fg: TEXT_DIM, bg: "rgba(255,255,255,0.04)", warn: false };
}
