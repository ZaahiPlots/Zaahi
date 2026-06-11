"use client";

// ZAAHI drone — Neighborhood Intel card (founder spec 2026-06-10).
//
// Floating glassmorphism card top-right. Polls reverse-district at the
// camera centre (debounced INTEL_REVERSE_DEBOUNCE_MS), looks the matched
// community up in the static aggregate, and surfaces hero numbers + a
// stacked status bar. Cross-fades on community change. Auto-collapses to
// the name pill after INTEL_AUTO_COLLAPSE_MS of pose stability.
//
// Calm analytics-dashboard aesthetic — no game / military fonts.

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  GLASS_BG,
  GLASS_BORDER,
  GLASS_BLUR,
  GOLD,
  INTEL_AUTO_COLLAPSE_MS,
  INTEL_REVERSE_DEBOUNCE_MS,
  STATUS_PALETTE,
} from "@/lib/drone/constants";
import {
  type AggregateFile,
  type CommunityRow,
  findCommunity,
  loadAggregate,
} from "@/lib/drone/aggregate";

export interface IntelCardProps {
  visible: boolean;
  centre: { lng: number; lat: number } | null;
  /** Fired whenever a community is resolved so parent can use the name
   *  for bookmark auto-naming and R-key overview fly. */
  onCommunityChange: (info: {
    name: string;
    polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
    bounds: [[number, number], [number, number]] | null;
  } | null) => void;
}

interface ReverseDistrictResponse {
  name: string;
  source: string;
  level: string;
  bounds: [[number, number], [number, number]];
  polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

function fmtSqft(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}
function fmtPlots(n: number): string {
  return n.toLocaleString("en-US");
}

// Tween a number with cubic-out easing.
function useCountUp(target: number, duration = 800): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    fromRef.current = val;
    startRef.current = performance.now();
    const from = val;
    const to = target;
    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export default function DroneIntelCard({ visible, centre, onCommunityChange }: IntelCardProps) {
  const [agg, setAgg] = useState<AggregateFile | null>(null);
  const [community, setCommunity] = useState<{
    row: CommunityRow | null;
    emirate: string;
    name: string;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const lastCentreRef = useRef<{ lng: number; lat: number } | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  // Load aggregate once.
  useEffect(() => {
    if (!visible) return;
    void loadAggregate().then(setAgg).catch(() => setAgg(null));
  }, [visible]);

  // Debounced reverse-district lookup whenever centre moves.
  useEffect(() => {
    if (!visible || !centre) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const r = await apiFetch(
            `/api/archie/reverse-district?lng=${centre.lng}&lat=${centre.lat}`,
          );
          if (!r.ok) {
            setCommunity(null);
            onCommunityChange(null);
            return;
          }
          const data = (await r.json()) as ReverseDistrictResponse;
          const emirate = data.source.startsWith("ad") ? "Abu Dhabi" : "Dubai";
          const row = agg ? findCommunity(agg, emirate, data.name) : null;
          setCommunity({ row, emirate, name: data.name });
          setCollapsed(false);
          onCommunityChange({
            name: data.name,
            polygon: data.polygon ?? null,
            bounds: data.bounds ?? null,
          });
        } catch {
          /* swallow — non-critical */
        }
      })();
    }, INTEL_REVERSE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [visible, centre?.lng, centre?.lat, agg, onCommunityChange, centre]);

  // Idle auto-collapse.
  useEffect(() => {
    if (!visible || !community) return;
    if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
    // If centre moved significantly since last frame, reset the timer.
    if (centre && lastCentreRef.current) {
      const dx = centre.lng - lastCentreRef.current.lng;
      const dy = centre.lat - lastCentreRef.current.lat;
      if (Math.hypot(dx, dy) > 0.0005) setCollapsed(false);
    }
    if (centre) lastCentreRef.current = centre;
    idleTimerRef.current = window.setTimeout(() => setCollapsed(true), INTEL_AUTO_COLLAPSE_MS);
    return () => {
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
    };
  }, [visible, centre, community]);

  if (!visible) return null;

  // Always render the shell; cross-fade content on community change.
  return (
    <div
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => {
        // Restart the idle timer on mouse leave.
        if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(() => setCollapsed(true), INTEL_AUTO_COLLAPSE_MS);
      }}
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        minWidth: collapsed ? 160 : 280,
        maxWidth: 320,
        padding: collapsed ? "8px 14px" : "14px 16px",
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: 12,
        color: "#fff",
        fontFamily: '-apple-system, Segoe UI, Roboto, sans-serif',
        zIndex: 36,
        pointerEvents: "auto",
        transition: "min-width 200ms ease, padding 200ms ease",
      }}
    >
      {community ? (
        <>
          <div
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {community.emirate}
          </div>
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 400,
              fontSize: collapsed ? 14 : 18,
              lineHeight: 1.2,
              marginTop: 2,
              transition: "font-size 200ms ease",
            }}
          >
            {community.name}
          </div>
          {!collapsed && (
            <IntelBody row={community.row} />
          )}
        </>
      ) : (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
          Locating district…
        </div>
      )}
    </div>
  );
}

function IntelBody({ row }: { row: CommunityRow | null }) {
  // Hooks must be called unconditionally.
  const tweenedPlots = useCountUp(row?.totalPlots ?? 0);
  const tweenedAreaSqft = useCountUp(row?.totalAreaSqft ?? 0);

  if (!row) {
    return (
      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
        No aggregate data for this community yet — re-run the aggregator after
        the next tile rebake.
      </div>
    );
  }

  const total = Object.values(row.byStatus).reduce((s, v) => s + v, 0);
  const order: Array<keyof typeof STATUS_PALETTE> = ["completed", "underConstruction", "preConstruction", "suspended", "empty"];

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        <Stat label="Area" value={`${fmtSqft(tweenedAreaSqft)} sqft`} />
        <Stat label="Plots" value={fmtPlots(tweenedPlots)} />
      </div>

      {/* Stacked status bar. */}
      {total > 0 && (
        <>
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
              marginTop: 14,
              background: "rgba(255,255,255,0.05)",
            }}
            aria-label="Plots by construction status"
          >
            {order.map((k) => {
              const pct = (row.byStatus[k] / total) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={k}
                  title={`${k} · ${row.byStatus[k].toLocaleString()}`}
                  style={{
                    width: `${pct}%`,
                    background: STATUS_PALETTE[k],
                    transition: "width 400ms ease",
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 6,
              marginTop: 8,
              fontSize: 10,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {order.map((k) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    background: STATUS_PALETTE[k],
                    marginBottom: 2,
                  }}
                />
                <span style={{ color: "#fff", fontWeight: 600 }}>
                  {row.byStatus[k].toLocaleString()}
                </span>
                <span>{labelFor(k)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function labelFor(k: keyof typeof STATUS_PALETTE): string {
  switch (k) {
    case "completed": return "Completed";
    case "underConstruction": return "Under constr.";
    case "preConstruction": return "Pre-constr.";
    case "suspended": return "Suspended";
    case "empty": return "Empty";
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span
        style={{
          color: GOLD,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontWeight: 400,
          fontSize: 22,
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
