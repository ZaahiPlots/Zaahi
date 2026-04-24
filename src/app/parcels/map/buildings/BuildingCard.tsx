"use client";

// Detail card for the digital-twin Buildings layer — opens when the user
// clicks a pin on /parcels/map. Covers both COMPLETED and UNDER_CONSTRUCTION
// variants in one component (the only structural difference is the date
// line + a progress note for UC). Visual language mirrors the standalone
// candidate-sample-poc card — glassmorphism navy, ZAAHI gold accents,
// Georgia serif titles — so it reads as one family with the rest of the
// platform. See CLAUDE.md "UI STYLE GUIDE".

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { BuildingDTO } from "./types";

const GOLD = "#C8A96E";
const TXT = "#f5f1e8";
const DIM = "rgba(245, 241, 232, 0.75)";
const SUBTLE = "rgba(245, 241, 232, 0.55)";
const LINE = "rgba(200, 169, 110, 0.15)";

interface Props {
  buildingId: string | null;
  onClose: () => void;
}

export default function BuildingCard({ buildingId, onClose }: Props) {
  const [data, setData] = useState<BuildingDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/buildings/${buildingId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/buildings/${buildingId} ${res.status}`);
        const json = (await res.json()) as BuildingDTO;
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  if (!buildingId) return null;

  const isUC = data?.status === "UNDER_CONSTRUCTION";
  const tagline = data
    ? data.status === "COMPLETED"
      ? data.completionYear
        ? `Completed ${data.completionYear}`
        : "Completed"
      : isUC
        ? data.expectedCompletion
          ? `Under construction · expected ${data.expectedCompletion}`
          : "Under construction"
        : "Planned"
    : "";

  return (
    <aside
      style={{
        position: "fixed",
        top: 56,
        right: 12,
        width: 360,
        maxHeight: "calc(100vh - 72px)",
        overflowY: "auto",
        padding: 20,
        background: "rgba(10, 22, 40, 0.72)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        boxShadow: "0 6px 22px rgba(0,0,0,0.35)",
        color: TXT,
        fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
        zIndex: 30,
      }}
      aria-label="Building detail"
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "1px solid rgba(200, 169, 110, 0.3)",
          background: "rgba(255, 255, 255, 0.06)",
          color: GOLD,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = GOLD;
          e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
      </button>

      {loading && (
        <div style={{ fontSize: 12, color: SUBTLE, letterSpacing: "0.04em" }}>
          Loading…
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: "#E63946" }}>
          Could not load building — {error}
        </div>
      )}

      {data && (
        <>
          <div style={{ marginBottom: 16, paddingRight: 28 }}>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                margin: 0,
                color: TXT,
              }}
            >
              {data.name}
            </h1>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: GOLD,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {tagline}
            </div>
          </div>

          {Array.isArray(data.photos) && data.photos.length > 0 && (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${LINE}`,
                background: "rgba(0,0,0,0.2)",
              }}
            >
              {/* Raw <img> — external CDN domains; Next.js Image would need
                  next.config.ts domain allow-list which we prefer not to
                  touch for a read-only card. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.photos[0].url}
                alt={data.photos[0].alt ?? data.name}
                style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            </div>
          )}

          <Row label="Developer" value={data.developer} />
          <Row label="Architect" value={data.architect} />
          <Row label="Community" value={data.community} />
          <Row label="Master plan" value={data.masterPlan} />
          <Row
            label="Plot number"
            value={data.plotNumber ?? "—"}
            hint={data.plotNumber ? undefined : "Not yet matched in DDA"}
          />
          <Row
            label="Type"
            value={data.buildingType ? capitalize(data.buildingType) : null}
          />
          <Row label="Floors" value={fmtNum(data.floors)} />
          <Row
            label="Height"
            value={data.heightM ? `${data.heightM.toFixed(1)} m` : null}
          />
          <Row label="Units" value={fmtNum(data.totalUnits)} />
          <Row
            label="Coordinates"
            value={`${data.centroidLat.toFixed(4)}°N · ${data.centroidLng.toFixed(4)}°E`}
          />

          {data.description && (
            <p
              style={{
                marginTop: 14,
                fontSize: 12,
                lineHeight: 1.65,
                color: DIM,
              }}
            >
              {data.description}
            </p>
          )}

          {Array.isArray(data.amenities) && data.amenities.length > 0 && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${LINE}`,
              }}
            >
              <SectionLabel>Amenities</SectionLabel>
              <ul
                style={{
                  margin: "6px 0 0",
                  padding: "0 0 0 16px",
                  color: DIM,
                  fontSize: 12,
                  lineHeight: 1.65,
                }}
              >
                {data.amenities.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(data.photos) && data.photos.length > 1 && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${LINE}`,
              }}
            >
              <SectionLabel>More photos</SectionLabel>
              <div
                style={{
                  marginTop: 6,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 6,
                }}
              >
                {data.photos.slice(1).map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt={p.alt ?? data.name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: 90,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: `1px solid ${LINE}`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {Array.isArray(data.sources) && data.sources.length > 0 && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${LINE}`,
              }}
            >
              <SectionLabel>Sources</SectionLabel>
              <ul
                style={{
                  margin: "6px 0 0",
                  padding: "0 0 0 16px",
                  color: DIM,
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                {data.sources.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ color: GOLD, textDecoration: "none" }}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${LINE}`,
              fontSize: 10,
              color: SUBTLE,
              lineHeight: 1.6,
            }}
          >
            {data.modelPath
              ? `3D model by ${data.modelProvider ?? "artist"} · rendered at ${data.scaleFactor === 0.01 ? "1 cm = 1 unit (source scale)" : `${data.scaleFactor}× scale`}.`
              : "No 3D model yet — procedural placeholder will follow."}{" "}
            Data confidence: {data.confidenceLevel}.
          </div>
        </>
      )}
    </aside>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  hint?: string;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: `1px solid ${LINE}`,
        fontSize: 12,
        gap: 12,
      }}
    >
      <span
        style={{
          color: SUBTLE,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: 10,
        }}
      >
        {label}
      </span>
      <span style={{ color: TXT, textAlign: "right", flexShrink: 0 }}>
        {value}
        {hint ? (
          <span style={{ display: "block", fontSize: 9, color: SUBTLE, marginTop: 2 }}>
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: SUBTLE,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function fmtNum(n: number | null): string | null {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("en-US");
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
