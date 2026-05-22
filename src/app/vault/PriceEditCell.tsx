"use client";

// ZAAHI Vault — inline price-edit cell for the /vault list view.
// Per spec §16.2 — click to enter edit mode, Enter saves via PATCH,
// Esc cancels, blur saves if changed.

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  entryId: string;
  /** Current asking price in fils (BigInt as string), or null. */
  askingPriceFils: string | null;
  /** Called after a successful save with the new fils value. */
  onSaved: (newPriceFils: string | null) => void;
  /** When true, renders as plain text (e.g. shared-with-me view). */
  readOnly?: boolean;
}

export function PriceEditCell({ entryId, askingPriceFils, onSaved, readOnly }: Props) {
  const initialAed = askingPriceFils
    ? String(BigInt(askingPriceFils) / BigInt(100))
    : "";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialAed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Sync local state when parent prop changes (e.g. after external refresh).
  useEffect(() => {
    if (!editing) setValue(initialAed);
  }, [initialAed, editing]);

  async function save() {
    const newAed = value.trim();
    // No change → exit edit mode without round-trip.
    if (newAed === initialAed) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const newPriceFils = newAed
        ? String(BigInt(Math.round(Number(newAed))) * BigInt(100))
        : null;
      const r = await apiFetch(`/api/me/vault/entries/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ askingPriceFils: newPriceFils }),
      });
      if (!r.ok) {
        setError(`Save failed (${r.status})`);
        return;
      }
      onSaved(newPriceFils);
      setEditing(false);
    } catch (e) {
      console.error("[PriceEditCell] save:", e);
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue(initialAed);
    setEditing(false);
    setError(null);
  }

  if (readOnly) {
    return (
      <span style={{ color: TEXT_PRIMARY }}>
        {initialAed ? `AED ${Number(initialAed).toLocaleString()}` : "—"}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Click to edit"
        style={{
          background: "transparent",
          border: `1px solid transparent`,
          color: TEXT_PRIMARY,
          padding: "4px 8px",
          borderRadius: 4,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          textAlign: "left",
          width: "100%",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)";
          e.currentTarget.style.background = "rgba(200, 169, 110, 0.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {initialAed ? (
          <>
            <span style={{ color: TEXT_DIM, fontSize: 11, marginRight: 4 }}>AED</span>
            {Number(initialAed).toLocaleString()}
          </>
        ) : (
          <span style={{ color: TEXT_DIM }}>+ Add price</span>
        )}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: TEXT_DIM, fontSize: 11 }}>AED</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            else if (e.key === "Escape") cancel();
          }}
          onBlur={() => {
            // Save on blur if changed; cancel if same as initial.
            if (!saving) void save();
          }}
          disabled={saving}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: `1px solid ${GOLD}`,
            color: TEXT_PRIMARY,
            borderRadius: 4,
            padding: "4px 6px",
            fontSize: 13,
            width: 140,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>
      {error && (
        <span style={{ color: "#E63946", fontSize: 11 }}>{error}</span>
      )}
    </div>
  );
}

// Marker export to keep TS module from being tree-shaken-empty
export const PRICE_EDIT_BORDER = BORDER;
