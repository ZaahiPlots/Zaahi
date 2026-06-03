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
  EMPTY_FILTER_STATE,
  LAND_USE_OPTIONS,
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
const MOBILE_BREAKPOINT = 640;

// Lightweight viewport-width hook — SSR-safe (returns desktop width on
// the server then re-measures on mount). Used to switch the panel
// between desktop side-rail and mobile bottom-sheet layouts.
function useViewportWidth(): number {
  const [width, setWidth] = useState<number>(
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );
  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

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

// Parses a free-text range input. Strips commas and surrounding
// whitespace; returns null for empty / non-numeric / negative input.
// Decimals are accepted — areaSqft can be 5000.5 from DDA, the
// MapLibre numeric compare handles floats fine.
function parseRangeInput(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// Sentinel for the "no upper limit" side of a range. The filter
// expression is `<= max`, so substituting MAX_SAFE_INTEGER matches
// every numeric row — effectively the constraint disappears.
const OPEN_MAX = Number.MAX_SAFE_INTEGER;

function DualRange({
  value,
  onChange,
}: {
  value: NumberRange | null;
  onChange: (next: NumberRange | null) => void;
}) {
  const isActive = value !== null;

  // Display strings derived from the canonical value. Founder spec
  // 2026-06-03: no ceilings — plots reach 37M sqft and beyond, so
  // any fixed bound is misleading. Empty min text = 0, empty max
  // text = OPEN_MAX, both empty = null (filter not applied).
  const minDisplay =
    value && value.min > 0
      ? Math.round(value.min).toLocaleString("en-US")
      : "";
  const maxDisplay =
    value && value.max < OPEN_MAX
      ? Math.round(value.max).toLocaleString("en-US")
      : "";

  function applyTexts(rawMin: string, rawMax: string) {
    const minParsed = parseRangeInput(rawMin);
    const maxParsed = parseRangeInput(rawMax);
    if (minParsed === null && maxParsed === null) {
      onChange(null);
      return;
    }
    let minVal = minParsed ?? 0;
    let maxVal = maxParsed ?? OPEN_MAX;
    // min ≤ max invariant — swap on reversed entry so the filter
    // never degenerates to an empty intersection.
    if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal];
    onChange({ min: minVal, max: maxVal });
  }

  const handleTextMin = (raw: string) => applyTexts(raw, maxDisplay);
  const handleTextMax = (raw: string) => applyTexts(minDisplay, raw);

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    background: "rgba(255, 255, 255, 0.04)",
    border: `1px solid ${isActive ? "rgba(200, 169, 110, 0.45)" : "rgba(255, 255, 255, 0.1)"}`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "inherit",
    outline: "none",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        type="text"
        inputMode="decimal"
        value={minDisplay}
        onChange={(e) => handleTextMin(e.target.value)}
        placeholder="min"
        aria-label="Minimum"
        style={inputStyle}
      />
      <input
        type="text"
        inputMode="decimal"
        value={maxDisplay}
        onChange={(e) => handleTextMax(e.target.value)}
        placeholder="max (∞ if blank)"
        aria-label="Maximum"
        style={inputStyle}
      />
    </div>
  );
}

// Autocomplete district picker — typing filters the dropdown by
// substring (case-insensitive). Click an option to add it; selected
// districts render as removable chips above the input. Sources merged
// by the parent: 114 ZAAHI listing districts + ~224 DDA communities
// (via /api/layers/communities) + ~1.9K AD communities (via
// /api/layers/abu-dhabi-communities). The filter mechanism itself is
// unchanged — district still matches against Parcel.district on the
// 114 listings only (PMTiles base props don't carry district name).
// The "LISTINGS ONLY · 114" divider above this section keeps that
// honest in the UI.
function DistrictAutocomplete({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? options.filter((o) => o.toLowerCase().includes(q))
      : options;
    return pool.filter((o) => !selected.includes(o)).slice(0, 80);
  }, [options, query, selected]);

  function add(district: string) {
    if (selected.includes(district)) return;
    onChange([...selected, district]);
    setQuery("");
  }
  function remove(district: string) {
    onChange(selected.filter((d) => d !== district));
  }

  return (
    <div style={{ position: "relative" }}>
      {selected.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: 6,
          }}
        >
          {selected.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => remove(d)}
              title="Click to remove"
              style={{
                background: "rgba(200, 169, 110, 0.25)",
                border: "1px solid #C8A96E",
                color: "#FFFFFF",
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
                whiteSpace: "nowrap",
              }}
            >
              {d} <span style={{ opacity: 0.7, marginLeft: 4 }}>×</span>
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        // Defer close so click on a dropdown item fires before blur
        // tears the dropdown down.
        onBlur={() => window.setTimeout(() => setIsOpen(false), 160)}
        placeholder={
          options.length === 0
            ? "Loading districts…"
            : "Type district name…"
        }
        aria-label="District search"
        style={{
          width: "100%",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 12,
          color: "#FFFFFF",
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {isOpen && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            background: "rgba(10, 22, 40, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(200, 169, 110, 0.3)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            zIndex: 5,
          }}
        >
          {filtered.map((d) => (
            <button
              key={d}
              type="button"
              // Use onMouseDown — fires before blur, so the click
              // registers even if the input would lose focus first.
              onMouseDown={(e) => {
                e.preventDefault();
                add(d);
              }}
              style={{
                display: "block",
                width: "100%",
                background: "transparent",
                border: "none",
                color: "rgba(255, 255, 255, 0.85)",
                padding: "7px 10px",
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                outline: "none",
                transition: "background 100ms ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(200, 169, 110, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      {isOpen && query && filtered.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            padding: "8px 10px",
            background: "rgba(10, 22, 40, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 8,
            fontSize: 12,
            color: "rgba(255, 255, 255, 0.55)",
            zIndex: 5,
          }}
        >
          No matches
        </div>
      )}
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

  const vw = useViewportWidth();
  const isMobile = vw < MOBILE_BREAKPOINT;

  if (!open) return null;

  // Desktop = right-side rail (350px, 100px from top, near-full-height).
  // Mobile = bottom-sheet (full-width, 70vh max, rounded top corners).
  // Wave 5 will add snap points + drag handle; Wave 2 keeps it static.
  const positionStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        maxHeight: "70vh",
        borderRadius: "12px 12px 0 0",
      }
    : {
        position: "absolute",
        right: 60,
        top: 64,
        width: 350,
        maxHeight: "calc(100vh - 100px)",
        borderRadius: 12,
      };

  return (
    <div
      style={{
        ...positionStyle,
        background: "rgba(10, 22, 40, 0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
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
          <DualRange value={draft.areaRange} onChange={setAreaRange} />
        </div>

        {/* GFA */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>GFA · sqft</SectionLabel>
          <DualRange value={draft.gfaRange} onChange={setGfaRange} />
        </div>

        {/* FAR */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>FAR</SectionLabel>
          <DualRange value={draft.farRange} onChange={setFarRange} />
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
          <DualRange value={draft.priceRange} onChange={setPriceRange} />
        </div>

        {/* DISTRICT — Wave 2 follow-up: autocomplete instead of full
            scrolling checklist. Source pool is parent-merged
            (114 listings + DDA + AD community names ≈ 2,200
            options). Filter still applies LISTINGS ONLY — divider
            above this section is the honest UI gate. */}
        <div style={{ marginBottom: 6 }}>
          <SectionLabel>District</SectionLabel>
          <DistrictAutocomplete
            options={availableDistricts}
            selected={draft.districts}
            onChange={setDistricts}
          />
        </div>
      </div>
    </div>
  );
}
