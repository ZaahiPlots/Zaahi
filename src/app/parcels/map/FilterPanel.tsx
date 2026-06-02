"use client";

// FilterPanel — Wave 2 (2026-06-02).
//
// Right-anchored side panel (350px) that lets a realtor crank land
// use / status / area / GFA / FAR / price / district filters and see
// the map react over the full 461K-parcel registry + 114 ZAAHI
// listings. Mirrors the Layers panel position on the opposite side
// (anchored right: 60, top: 64) and follows the same CLAUDE.md
// glassmorphism tokens.
//
// Data flow: parent (page.tsx) owns the canonical FilterState. The
// panel keeps a local draft for slider drag responsiveness, then
// debounces commits to the parent via onChange. External mutations
// (Archie voice command → page.tsx setFilterState) flow back in via
// the `state` prop and rehydrate the draft automatically.
//
// Wave 2 deliberate omissions (Wave 3+):
//   • Sub-category buckets (school / nursery / villa) — needs new
//     PMTiles re-bake with subCategory field
//   • Max-floors / max-height-code filter — needs height field added
//     to the FILL/LINE tile properties (currently only on 3D tier
//     features)
//   • Saved presets, URL share, "dim others" toggle — Wave 5 polish

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AREA_BOUNDS,
  EMPTY_FILTER_STATE,
  FAR_BOUNDS,
  GFA_BOUNDS,
  LAND_USE_OPTIONS,
  PRICE_BOUNDS,
  STATUS_OPTIONS,
  countActiveFilters,
  type FilterState,
  type NumberRange,
  type UnifiedStatus,
} from "@/lib/filter-state";

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  /** Canonical filter state owned by the parent. */
  state: FilterState;
  /** Commit a new filter state. The panel debounces calls; the parent
   *  is expected to drive the map via this. */
  onChange: (next: FilterState) => void;
  /** Reset every filter dimension. Same effect as onChange(EMPTY)
   *  but exposed separately so the parent can log / instrument it. */
  onReset: () => void;
  /** Distinct district names available among the 114 ZAAHI listings.
   *  Built in page.tsx from the /api/parcels/map response. */
  availableDistricts: string[];
  /** Optional live counter — populated by parent via queryRendered
   *  Features (Wave 2 C3). undefined means "not measured yet". */
  visibleCount?: {
    listings: number;
    pmtiles: number;
  };
}

const COMMIT_DEBOUNCE_MS = 250;

// ── Helpers ───────────────────────────────────────────────────────

function toggleString(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function toggleStatus(
  arr: UnifiedStatus[],
  item: UnifiedStatus,
): UnifiedStatus[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function fmtThousands(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtAed(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtFar(n: number): string {
  return n.toFixed(1);
}

// ── Sub-components ────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "Georgia, serif",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "rgba(255, 255, 255, 0.55)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Chip({
  active,
  color,
  children,
  onClick,
  title,
}: {
  active: boolean;
  color?: string;
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  const accent = color ?? "#C8A96E";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? `${accent}40` : "rgba(255, 255, 255, 0.04)",
        border: `1px solid ${active ? accent : "rgba(255, 255, 255, 0.1)"}`,
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12,
        color: active ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
        cursor: "pointer",
        transition: "background 150ms ease, border-color 150ms ease",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        outline: "none",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function DualRange({
  bounds,
  value,
  onChange,
  format,
}: {
  bounds: { min: number; max: number; step: number };
  value: NumberRange | null;
  onChange: (next: NumberRange | null) => void;
  format: (n: number) => string;
}) {
  const v = value ?? { min: bounds.min, max: bounds.max };
  const isActive = value !== null;

  const handleMin = (n: number) => {
    const clamped = Math.min(n, v.max);
    const next: NumberRange = { min: clamped, max: v.max };
    if (next.min <= bounds.min && next.max >= bounds.max) onChange(null);
    else onChange(next);
  };
  const handleMax = (n: number) => {
    const clamped = Math.max(n, v.min);
    const next: NumberRange = { min: v.min, max: clamped };
    if (next.min <= bounds.min && next.max >= bounds.max) onChange(null);
    else onChange(next);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: isActive ? "#C8A96E" : "rgba(255, 255, 255, 0.65)",
          marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{format(v.min)}</span>
        <span>{format(v.max)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={v.min}
          onChange={(e) => handleMin(Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: "#C8A96E",
            cursor: "pointer",
          }}
          aria-label="Minimum"
        />
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={v.max}
          onChange={(e) => handleMax(Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: "#C8A96E",
            cursor: "pointer",
          }}
          aria-label="Maximum"
        />
      </div>
    </div>
  );
}

function MultiCheckList({
  options,
  selected,
  onChange,
  maxHeight = 180,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  maxHeight?: number;
}) {
  return (
    <div
      style={{
        maxHeight,
        overflowY: "auto",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 8,
        background: "rgba(255, 255, 255, 0.04)",
        padding: 4,
      }}
    >
      {options.length === 0 && (
        <div
          style={{
            padding: 8,
            fontSize: 12,
            color: "rgba(255, 255, 255, 0.45)",
            textAlign: "center",
          }}
        >
          No districts available
        </div>
      )}
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <label
            key={opt}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              cursor: "pointer",
              borderRadius: 4,
              fontSize: 12,
              color: isOn ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)",
              fontFamily: "inherit",
            }}
          >
            <input
              type="checkbox"
              checked={isOn}
              onChange={() => onChange(toggleString(selected, opt))}
              style={{ accentColor: "#C8A96E", cursor: "pointer" }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {opt}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────

export default function FilterPanel({
  open,
  onClose,
  state,
  onChange,
  onReset,
  availableDistricts,
  visibleCount,
}: FilterPanelProps) {
  // Local draft = state of the sliders mid-drag. Commits to parent
  // via onChange after COMMIT_DEBOUNCE_MS so we don't trigger
  // reapplyMapFilters() on every input tick.
  const [draft, setDraft] = useState<FilterState>(state);

  // Pull external state changes (Archie set a filter) into draft.
  useEffect(() => {
    setDraft(state);
  }, [state]);

  const commitTimerRef = useRef<number | null>(null);
  const updateDraft = useCallback(
    (next: FilterState) => {
      setDraft(next);
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
      }
      commitTimerRef.current = window.setTimeout(() => {
        onChange(next);
        commitTimerRef.current = null;
      }, COMMIT_DEBOUNCE_MS);
    },
    [onChange],
  );

  // Toggles + range setters all funnel through updateDraft.
  const toggleLandUse = (cat: string) =>
    updateDraft({ ...draft, landUse: toggleString(draft.landUse, cat) });
  const toggleStatusChip = (st: UnifiedStatus) =>
    updateDraft({
      ...draft,
      unifiedStatus: toggleStatus(draft.unifiedStatus, st),
    });
  const setAreaRange = (r: NumberRange | null) =>
    updateDraft({ ...draft, areaRange: r });
  const setGfaRange = (r: NumberRange | null) =>
    updateDraft({ ...draft, gfaRange: r });
  const setFarRange = (r: NumberRange | null) =>
    updateDraft({ ...draft, farRange: r });
  const setPriceRange = (r: NumberRange | null) =>
    updateDraft({ ...draft, priceRange: r });
  const setDistricts = (d: string[]) => updateDraft({ ...draft, districts: d });

  const activeCount = useMemo(() => countActiveFilters(draft), [draft]);

  const handleReset = () => {
    setDraft(EMPTY_FILTER_STATE);
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    onReset();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        top: 64,
        width: 350,
        maxHeight: "calc(100vh - 100px)",
        background: "rgba(10, 22, 40, 0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
        zIndex: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "0.04em",
            }}
          >
            FILTERS
          </div>
          {visibleCount !== undefined && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.55)",
                marginTop: 2,
                fontVariantNumeric: "tabular-nums",
              }}
              title="ZAAHI listings precisely counted from React state; PMTiles count is from queryRenderedFeatures inside the current viewport — actual matches outside view are unknown."
            >
              {fmtThousands(visibleCount.listings + visibleCount.pmtiles)} in view
              {" · "}
              <span style={{ opacity: 0.7 }}>
                {visibleCount.listings} listings + {fmtThousands(visibleCount.pmtiles)} registry
              </span>
            </div>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "1px solid rgba(200, 169, 110, 0.4)",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              color: "#C8A96E",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(200, 169, 110, 0.15)";
              e.currentTarget.style.borderColor = "#C8A96E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.4)";
            }}
          >
            Reset {activeCount > 0 && `(${activeCount})`}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.55)",
            cursor: "pointer",
            fontSize: 20,
            lineHeight: 1,
            padding: "2px 6px",
            fontFamily: "inherit",
          }}
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px 20px",
        }}
      >
        {/* STATUS */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Status</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STATUS_OPTIONS.map((s) => (
              <Chip
                key={s.key}
                active={draft.unifiedStatus.includes(s.key)}
                onClick={() => toggleStatusChip(s.key)}
                title={`Applies to: ${s.appliesTo}`}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* LAND USE */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Land use</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LAND_USE_OPTIONS.map((lu) => (
              <Chip
                key={lu.key}
                active={draft.landUse.includes(lu.key)}
                color={lu.color}
                onClick={() => toggleLandUse(lu.key)}
              >
                {lu.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* PLOT AREA */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Plot area · sqft</SectionLabel>
          <DualRange
            bounds={AREA_BOUNDS}
            value={draft.areaRange}
            onChange={setAreaRange}
            format={fmtThousands}
          />
        </div>

        {/* GFA */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>GFA · sqft</SectionLabel>
          <DualRange
            bounds={GFA_BOUNDS}
            value={draft.gfaRange}
            onChange={setGfaRange}
            format={fmtThousands}
          />
        </div>

        {/* FAR */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>FAR</SectionLabel>
          <DualRange
            bounds={FAR_BOUNDS}
            value={draft.farRange}
            onChange={setFarRange}
            format={fmtFar}
          />
          <div
            style={{
              fontSize: 10,
              color: "rgba(255, 255, 255, 0.4)",
              marginTop: 4,
              fontStyle: "italic",
            }}
          >
            Registry plots without GFA data are excluded from this filter.
          </div>
        </div>

        {/* Listings-only divider */}
        <div
          style={{
            margin: "20px 0 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "rgba(200, 169, 110, 0.25)",
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(200, 169, 110, 0.85)",
              fontFamily: "Georgia, serif",
            }}
          >
            Listings only · 114
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "rgba(200, 169, 110, 0.25)",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255, 255, 255, 0.5)",
            marginBottom: 14,
            lineHeight: 1.4,
          }}
        >
          ⓘ Price &amp; district apply only to the 114 ZAAHI listings — the
          461K DDA/AD registry has no price field and no district name in
          PMTiles (would need a tile re-bake).
        </div>

        {/* PRICE */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Price · AED</SectionLabel>
          <DualRange
            bounds={PRICE_BOUNDS}
            value={draft.priceRange}
            onChange={setPriceRange}
            format={fmtAed}
          />
        </div>

        {/* DISTRICT */}
        <div style={{ marginBottom: 6 }}>
          <SectionLabel>District</SectionLabel>
          <MultiCheckList
            options={availableDistricts}
            selected={draft.districts}
            onChange={setDistricts}
          />
        </div>
      </div>
    </div>
  );
}
