"use client";

// ZAAHI Vault — inline follow-up date. Shows toLocaleDateString() until
// focused; a date input saves on change and is clearable to null.

import { useEffect, useRef, useState } from "react";
import { patchVaultEntry } from "./patchEntry";

const GOLD = "#C8A96E";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";

interface Props {
  entryId: string;
  nextFollowUpAt: string | null;
  onSaved: (iso: string | null) => void;
}

export function FollowUpCell({ entryId, nextFollowUpAt, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function change(v: string) {
    const prev = nextFollowUpAt;
    const next = v ? new Date(`${v}T00:00:00.000Z`).toISOString() : null;
    if (next === prev) return;
    setError(null);
    onSaved(next); // optimistic
    const err = await patchVaultEntry(entryId, { nextFollowUpAt: next });
    if (err) {
      onSaved(prev);
      setError(err);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {editing ? (
        <input
          ref={ref}
          type="date"
          data-testid="followup-input"
          aria-label="Next follow-up"
          defaultValue={nextFollowUpAt ? nextFollowUpAt.slice(0, 10) : ""}
          onChange={(e) => void change(e.target.value)}
          onBlur={() => setEditing(false)}
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${GOLD}`,
            color: TEXT_PRIMARY,
            borderRadius: 4,
            padding: "4px 6px",
            fontSize: 12,
            fontFamily: "inherit",
            outline: "none",
            colorScheme: "dark",
          }}
        />
      ) : (
        <button
          data-testid="followup-display"
          onClick={() => setEditing(true)}
          title="Click to edit"
          style={{
            background: "transparent",
            border: "1px solid transparent",
            color: TEXT_DIM,
            padding: "4px 8px",
            borderRadius: 4,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            textAlign: "left",
            transition: "border-color 150ms ease, background 150ms ease",
          }}
        >
          {nextFollowUpAt ? new Date(nextFollowUpAt).toLocaleDateString() : "—"}
        </button>
      )}
      {error && <span style={{ color: "#E63946", fontSize: 11 }}>{error}</span>}
    </div>
  );
}
