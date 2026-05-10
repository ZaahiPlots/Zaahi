"use client";

import { GOLD, TEXT_DIM, TEXT } from "./styles";

export type TabKey =
  | "all"
  | "pending"
  | "waitlist"
  | "approved"
  | "rejected"
  | "title_deed"
  | "plot_claim";

export interface TabSpec {
  key: TabKey;
  label: string;
  count?: number; // optional pill counter
  disabled?: boolean;
  disabledReason?: string;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabSpec[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: 6,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => !t.disabled && onChange(t.key)}
            disabled={t.disabled}
            title={t.disabled ? t.disabledReason : undefined}
            style={{
              padding: "8px 12px",
              background: isActive ? "rgba(200,169,110,0.12)" : "transparent",
              border: isActive ? `1px solid ${GOLD}55` : "1px solid transparent",
              borderRadius: 6,
              color: isActive ? GOLD : t.disabled ? TEXT_DIM : TEXT,
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: isActive ? 700 : 500,
              cursor: t.disabled ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: t.disabled ? 0.5 : 1,
              whiteSpace: "nowrap",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>({t.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
