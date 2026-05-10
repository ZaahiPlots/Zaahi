"use client";

// One row per RegistrationApplication. Click → opens detail modal.

import {
  STATUS_COLORS,
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
} from "./styles";
import { ROLE_LABELS } from "@/lib/registration-validation";
import type { ListItem } from "./types";

export function ApplicationList({
  items,
  loading,
  onOpen,
}: {
  items: ListItem[];
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  if (loading) {
    return (
      <div style={{ padding: "24px 0", color: TEXT_DIM, fontSize: 12, textAlign: "center" }}>
        Loading…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div style={{ padding: "32px 0", color: TEXT_DIM, fontSize: 12, textAlign: "center" }}>
        No applications match this filter.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it) => (
        <Row key={it.id} item={it} onOpen={() => onOpen(it.id)} />
      ))}
    </div>
  );
}

function Row({ item, onOpen }: { item: ListItem; onOpen: () => void }) {
  const status = STATUS_COLORS[item.status];
  const roleLabel = item.roleApplied
    ? ROLE_LABELS[item.roleApplied].split(" — ")[0]
    : "—";
  const date = new Date(item.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const verifyBadge =
    item.status === "PENDING_REVIEW" || item.status === "WAITLIST"
      ? item.emailVerified
        ? null
        : { label: "✉ unverified", color: "#ff8a92" }
      : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        color: TEXT,
        fontFamily: "inherit",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(200,169,110,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: status.fg,
          flexShrink: 0,
        }}
        aria-hidden
      />
      <span style={{ fontWeight: 700, color: GOLD, fontSize: 13 }}>{item.nickname}</span>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          padding: "2px 6px",
          background: "rgba(200,169,110,0.10)",
          color: GOLD,
          border: "1px solid rgba(200,169,110,0.3)",
          borderRadius: 4,
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {roleLabel}
      </span>
      <span style={{ flex: 1, fontSize: 11, color: TEXT_FADE, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.email}
      </span>
      <span style={{ fontSize: 11, color: TEXT_DIM, whiteSpace: "nowrap" }}>{date}</span>
      {verifyBadge && (
        <span
          style={{
            fontSize: 10,
            color: verifyBadge.color,
            border: `1px solid ${verifyBadge.color}55`,
            padding: "2px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          {verifyBadge.label}
        </span>
      )}
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          padding: "2px 8px",
          background: status.bg,
          color: status.fg,
          border: `1px solid ${status.border}`,
          borderRadius: 4,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {status.label}
      </span>
    </button>
  );
}
