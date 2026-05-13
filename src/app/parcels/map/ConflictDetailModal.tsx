"use client";

// ZAAHI Vault — Conflict comparison modal.
//
// Shows ALL VaultEntry rows for a plot tuple, server-redacted to
// public-facing facts only (no brokerNotes, no ownerContact, no
// nextFollowUpAt). The caller's own row is labelled "Your data".
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.7, §15.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const BG_DEEP = "rgba(10, 22, 40, 0.92)";
const BORDER = "rgba(255, 255, 255, 0.12)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface ConflictEntry {
  isYours: boolean;
  addedByUserId: string;
  addedByNickname: string | null;
  addedByRole: string | null;
  priceFils: string | null;
  area: number | null;
  landUse: string | null;
  createdAt: string;
}

interface ConflictDetail {
  plotNumber: string;
  emirate: string;
  district: string;
  entries: ConflictEntry[];
}

interface Props {
  emirate: string;
  district: string;
  plotNumber: string;
  onClose: () => void;
}

export function ConflictDetailModal({ emirate, district, plotNumber, onClose }: Props) {
  const [data, setData] = useState<ConflictDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const qs = new URLSearchParams({ emirate, district }).toString();
        const r = await apiFetch(
          `/api/me/vault/conflicts/${plotNumber}?${qs}`,
        );
        if (cancelled) return;
        if (!r.ok) {
          setError(`Couldn't load comparison (${r.status})`);
          return;
        }
        const d = (await r.json()) as ConflictDetail;
        setData(d);
      } catch (e) {
        console.error("[ConflictDetailModal] fetch:", e);
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [emirate, district, plotNumber]);

  return (
    <div onClick={onClose} style={backdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Plot comparison
            </div>
            <h2 style={titleStyle}>
              {plotNumber} · {district}
            </h2>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">×</button>
        </div>

        {loading && <div style={subduedStyle}>Loading comparison…</div>}
        {error && <div style={{ ...subduedStyle, color: "#E63946" }}>{error}</div>}

        {data && (
          <>
            <div style={tableContainerStyle}>
              <div style={tableHeaderRowStyle}>
                <div>User</div>
                <div>Asking price (AED)</div>
                <div>Area (sqft)</div>
                <div>Land use</div>
              </div>
              {data.entries.map((e, i) => {
                const priceAed =
                  e.priceFils !== null ? Number(BigInt(e.priceFils) / BigInt(100)) : null;
                return (
                  <div
                    key={`${e.addedByUserId}-${i}`}
                    style={{
                      ...tableRowStyle,
                      background: e.isYours ? "rgba(200, 169, 110, 0.08)" : "transparent",
                      borderColor: e.isYours ? "rgba(200, 169, 110, 0.3)" : BORDER,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: e.isYours ? 700 : 500, color: e.isYours ? GOLD : TEXT_PRIMARY }}>
                        {e.isYours ? "Your data" : `@${e.addedByNickname ?? "unknown"}`}
                      </div>
                      {!e.isYours && e.addedByRole && (
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                          {e.addedByRole.toLowerCase()}
                        </div>
                      )}
                    </div>
                    <div>{priceAed !== null ? priceAed.toLocaleString() : "—"}</div>
                    <div>{e.area !== null ? e.area.toLocaleString() : "—"}</div>
                    <div>{e.landUse ?? "—"}</div>
                  </div>
                );
              })}
            </div>

            <div style={privacyNoteStyle}>
              Other users&apos; broker notes and owner contacts are private — only
              public facts (price, area, land use) are shown here.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ──

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
};

const panelStyle: React.CSSProperties = {
  background: BG_DEEP,
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 22,
  maxWidth: 700,
  width: "100%",
  maxHeight: "85vh",
  overflowY: "auto",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 18,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  marginTop: 2,
  letterSpacing: "-0.01em",
};

const closeButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_DIM,
  borderRadius: 6,
  width: 30,
  height: 30,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const subduedStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 13,
  padding: 14,
};

const tableContainerStyle: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  overflow: "hidden",
};

const tableHeaderRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
  gap: 14,
  padding: "10px 16px",
  background: "rgba(255, 255, 255, 0.03)",
  borderBottom: `1px solid ${BORDER}`,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TEXT_DIM,
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
  gap: 14,
  padding: "12px 16px",
  borderBottom: `1px solid ${BORDER}`,
  fontSize: 13,
  alignItems: "center",
};

const privacyNoteStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 14px",
  background: "rgba(200, 169, 110, 0.05)",
  border: `1px solid rgba(200, 169, 110, 0.2)`,
  borderRadius: 8,
  fontSize: 12,
  color: TEXT_DIM,
  lineHeight: 1.5,
};
