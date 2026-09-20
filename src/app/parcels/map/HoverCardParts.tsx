"use client";
import { GOLD } from "@/lib/design-tokens";
import { NUMBER_SMALL } from "@/lib/design-tokens";

// ── Hover-card helpers (PMTiles DDA/AD plot popup) ──
// Compact "+" icon button placed in the top-right of every hover card
// (ZAAHI listings + PMTiles parcels). Clicking it opens the vault
// wizard with the plot pre-filled — Step 1 then auto-fires its DDA
// lookup so the user lands on Step 2 / 3 (founder spec 2026-05-31).
// stopPropagation so the click never bubbles to the card's flyTo /
// SidePanel handler.
export function VaultAddButton({
  plotNumber,
  onClick,
}: {
  plotNumber: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title="Add to Vault"
      aria-label={`Add plot ${plotNumber} to your vault`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: "1px solid rgba(200, 169, 110, 0.4)",
        background: "rgba(200, 169, 110, 0.10)",
        color: GOLD,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        padding: 0,
        fontFamily: "inherit",
        flexShrink: 0,
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(ev) => {
        ev.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
        ev.currentTarget.style.borderColor = GOLD;
      }}
      onMouseLeave={(ev) => {
        ev.currentTarget.style.background = "rgba(200, 169, 110, 0.10)";
        ev.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.4)";
      }}
    >
      +
    </button>
  );
}

// One small row of label + value, used inside the ddaLandHover popup
// JSX. Style mirrors the rest of the hover card (Georgia / SF Mono).
export function PmtilesHoverRow({ label, value }: { label: string; value: string }) {
  // Phase A 2026-05-31: dropped the SF Mono monospace stack — it
  // visually clashed with the Inter body across the rest of the
  // platform. Inter's tabular-nums (NUMBER_SMALL) gives even digit
  // widths without the monospace look. Value sized at 14 px / 600
  // weight, label stays compact at 11 px uppercase.
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      gap: 8, marginTop: 3, lineHeight: 1.35,
    }}>
      <span style={{
        // Hover-card sub-labels ("Plot Area", "Max GFA", "FAR",
        // "Max Height", "Affection Plan", "Asking Price") — bumped
        // 0.55 → 0.8 so the left column reads against the navy
        // glass without looking ghosted. Right-side value stays at
        // 0.95 (set on its own span below) so the visual hierarchy
        // is preserved.
        opacity: 0.8, letterSpacing: "0.04em",
        textTransform: "uppercase", fontSize: 11,
      }}>{label}</span>
      <span style={{
        ...NUMBER_SMALL,
        color: "rgba(255,255,255,0.95)", textAlign: "right",
      }}>{value}</span>
    </div>
  );
}

// Light-touch status normalizer: ALL-CAPS → Title Case (with
// underscores spaced). Already-Title values pass through unchanged.
export function formatPmtilesStatus(raw: string): string {
  if (!raw || raw.trim() === "") return "";
  if (raw === raw.toUpperCase()) {
    return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/_/g, " ");
  }
  return raw;
}

// "2026-03-14T..." → "14 Mar 2026". Empty / invalid → "".
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatPlanDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate().toString().padStart(2, "0")} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
