"use client";

// ZAAHI Vault — expandable price-history table for a single entry.
// Loaded on demand when the user expands the row in the list view.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface HistoryRow {
  id: string;
  priceFils: string;
  setByUserId: string;
  source: string;
  note: string | null;
  createdAt: string;
}

interface EntryDetailResponse {
  priceHistory?: HistoryRow[];
}

interface Props {
  entryId: string;
  /** Optional pre-fetched rows — if provided, skip the round-trip. */
  initialRows?: HistoryRow[];
}

export function PriceHistoryDropdown({ entryId, initialRows }: Props) {
  const [rows, setRows] = useState<HistoryRow[] | null>(initialRows ?? null);
  const [loading, setLoading] = useState(!initialRows);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRows) return;
    let cancelled = false;
    async function load() {
      try {
        const r = await apiFetch(`/api/me/vault/entries/${entryId}`);
        if (cancelled) return;
        if (!r.ok) {
          setError(`Load failed (${r.status})`);
          return;
        }
        const d = (await r.json()) as EntryDetailResponse;
        setRows(d.priceHistory ?? []);
      } catch (e) {
        console.error("[PriceHistoryDropdown] fetch:", e);
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entryId, initialRows]);

  if (loading) return <div style={subduedStyle}>Loading history…</div>;
  if (error) return <div style={{ ...subduedStyle, color: "#E63946" }}>{error}</div>;
  if (!rows || rows.length === 0) return <div style={subduedStyle}>No price changes recorded.</div>;

  return (
    <div style={containerStyle}>
      {rows.map((r) => {
        const aed = Number(BigInt(r.priceFils) / BigInt(100));
        return (
          <div key={r.id} style={rowStyle}>
            <div style={dateStyle}>{new Date(r.createdAt).toLocaleString()}</div>
            <div style={valueStyle}>
              <span style={{ color: TEXT_DIM, fontSize: 10, marginRight: 4 }}>AED</span>
              {aed.toLocaleString()}
              {r.source !== "manual" && (
                <span style={{ color: TEXT_DIM, fontSize: 10, marginLeft: 8 }}>
                  · {r.source}
                </span>
              )}
            </div>
            {r.note && <div style={noteStyle}>{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: 12,
  background: "rgba(255, 255, 255, 0.02)",
  borderTop: `1px solid ${BORDER}`,
};

const subduedStyle: React.CSSProperties = {
  padding: 12,
  color: TEXT_DIM,
  fontSize: 12,
  fontStyle: "italic",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 140px 1fr",
  gap: 12,
  padding: "5px 0",
  fontSize: 12,
  alignItems: "center",
};

const dateStyle: React.CSSProperties = {
  color: TEXT_DIM,
};

const valueStyle: React.CSSProperties = {
  color: TEXT_PRIMARY,
  fontVariantNumeric: "tabular-nums",
};

const noteStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontStyle: "italic",
};
