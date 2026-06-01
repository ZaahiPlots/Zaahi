"use client";

// CoordsEntry — shared coordinate-input + live-preview component.
//
// Used by both the Vault non-DDA wizard (Sprint 1) and — once Sprint 2
// lands — by the AddPlotModal listing flow. The contract is:
//
//   • Caller provides the current emirate (drives the default
//     projection) and an onChange callback.
//   • Component renders: projection dropdown + textarea + warnings.
//   • As the user types, we run buildPolygon and emit
//     onChange(polygon, areaSqft, warnings, error). null polygon
//     means the caller should keep its Continue button disabled.
//
// Live map preview is implemented by a self-contained MapLibre
// instance (raster basemap only, no 3D, no plots). Kept lightweight
// so it doesn't fight the main map when the wizard opens above it.
//
// Founder D-decisions referenced inline:
//   D1 — projection default per emirate; explicit override allowed.
//   D2 — three projections: WGS84 / DLTM / UTM40N.
//   D3 — min 3 corners, max 50.
//   D4 — bulk-paste textarea; auto-close ring.

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import {
  PROJECTIONS,
  defaultProjectionForEmirate,
  type ProjectionKey,
} from "@/lib/coords-projection";
import { buildPolygon, type PolygonBuild } from "@/lib/polygon-validation";

const GOLD = "#C8A96E";
const TEXT_PRIMARY = "#f5f1e8";
const TEXT_DIM = "rgba(245, 241, 232, 0.75)";
const LINE = "rgba(200, 169, 110, 0.15)";

// CARTO Positron — matches the rest of the platform's basemap
// language (same MiniMap used to use this).
const PREVIEW_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

const POLY_SRC = "coords-entry-poly";
const POLY_FILL = "coords-entry-poly-fill";
const POLY_LINE = "coords-entry-poly-line";
const POLY_DOTS = "coords-entry-poly-dots";

// Initial camera for the preview when there's nothing to show yet.
// Centred on Dubai because the founder's catalogue is Dubai-heavy;
// the preview pans to the actual polygon as soon as we have one.
const PREVIEW_CENTER: [number, number] = [55.27, 25.2];
const PREVIEW_ZOOM = 9;

export interface CoordsEntryResult {
  polygon: GeoJSON.Polygon | null;
  areaSqft: number;
  projection: ProjectionKey;
  rawText: string;
  warnings: string[];
  error: string | null;
}

export interface CoordsEntryProps {
  /** Drives the default projection (founder D1). Pass the current
   *  emirate from the wizard state. */
  emirate: string | null;
  /** Initial textarea content — non-empty if the wizard is being
   *  re-entered (e.g. user clicked Back). */
  initialText?: string;
  /** Initial projection — if omitted we derive from `emirate`. */
  initialProjection?: ProjectionKey;
  /** Fires every time the user changes input. Caller uses this to
   *  enable / disable Continue. */
  onChange: (result: CoordsEntryResult) => void;
}

export default function CoordsEntry({
  emirate,
  initialText = "",
  initialProjection,
  onChange,
}: CoordsEntryProps) {
  const [projection, setProjection] = useState<ProjectionKey>(
    initialProjection ?? defaultProjectionForEmirate(emirate),
  );
  // When the user picks a new emirate UPSTREAM (i.e. emirate prop
  // changes), we only swap the projection if the user hasn't
  // touched the dropdown themselves. `userPickedProjection` tracks
  // that. The default-picker behaviour matches the founder D1 "user
  // picks emirate first, projection follows but is overridable".
  const userPickedProjection = useRef(initialProjection != null);
  useEffect(() => {
    if (userPickedProjection.current) return;
    setProjection(defaultProjectionForEmirate(emirate));
  }, [emirate]);

  const [text, setText] = useState(initialText);
  const result = useMemo<PolygonBuild>(
    () => buildPolygon(text, projection, emirate),
    [text, projection, emirate],
  );

  // Hoist the result up to the wizard on every change.
  useEffect(() => {
    onChange({
      polygon: result.polygon,
      areaSqft: result.areaSqft,
      projection,
      rawText: text,
      warnings: result.warnings,
      error: result.error,
    });
    // onChange is intentionally not in the dep array — calling it on
    // every render is the contract; React-strict double-fire is fine
    // because the payload is the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, projection, text]);

  // ── Map preview ──────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  // Init once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const m = new maplibregl.Map({
      container: mapContainerRef.current,
      style: PREVIEW_STYLE,
      center: PREVIEW_CENTER,
      zoom: PREVIEW_ZOOM,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
    });
    mapRef.current = m;
    m.on("load", () => {
      m.addSource(POLY_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: POLY_FILL,
        type: "fill",
        source: POLY_SRC,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": GOLD, "fill-opacity": 0.25 },
      });
      m.addLayer({
        id: POLY_LINE,
        type: "line",
        source: POLY_SRC,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "line-color": GOLD, "line-width": 2 },
      });
      m.addLayer({
        id: POLY_DOTS,
        type: "circle",
        source: POLY_SRC,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 4,
          "circle-color": "#FFFFFF",
          "circle-stroke-color": GOLD,
          "circle-stroke-width": 2,
        },
      });
    });
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // Push polygon updates into the preview map.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const applyData = () => {
      const src = m.getSource(POLY_SRC) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) {
        m.once("load", applyData);
        return;
      }
      const features: GeoJSON.Feature[] = [];
      if (result.polygon) {
        features.push({
          type: "Feature",
          geometry: result.polygon,
          properties: {},
        });
        // Also render each vertex as a dot so the user can verify
        // corner order at a glance.
        const ring = result.polygon.coordinates[0];
        for (let i = 0; i < ring.length - 1; i++) {
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: ring[i] },
            properties: { idx: i },
          });
        }
      }
      src.setData({ type: "FeatureCollection", features });

      // Fit camera to the polygon.
      if (result.polygon) {
        const ring = result.polygon.coordinates[0];
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        for (const p of ring) {
          if (p[0] < minLng) minLng = p[0];
          if (p[1] < minLat) minLat = p[1];
          if (p[0] > maxLng) maxLng = p[0];
          if (p[1] > maxLat) maxLat = p[1];
        }
        if (Number.isFinite(minLng) && Number.isFinite(maxLng)) {
          m.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
            padding: 40,
            duration: 600,
            maxZoom: 18,
          });
        }
      }
    };
    if (m.isStyleLoaded()) applyData();
    else m.once("load", applyData);
  }, [result.polygon]);

  // ── UI ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label
          style={{
            display: "block",
            fontSize: 10,
            color: TEXT_DIM,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Coordinate system
        </label>
        <select
          value={projection}
          onChange={(e) => {
            userPickedProjection.current = true;
            setProjection(e.target.value as ProjectionKey);
          }}
          style={selectStyle}
        >
          {PROJECTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>
          {PROJECTIONS.find((p) => p.key === projection)?.hint}
        </div>
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: 10,
            color: TEXT_DIM,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Corner coordinates (3-50 points, one per line)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            projection === "WGS84"
              ? "25.123456, 55.234567\n25.123987, 55.234999\n25.124111, 55.234567\n25.123654, 55.234234"
              : "497981, 2775845\n497984, 2775853\n498011, 2775864\n498033, 2775813"
          }
          rows={8}
          style={textareaStyle}
        />
        <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>
          Format: <code>{projection === "WGS84" ? "lat, lng" : "X, Y"}</code> per
          line. Ring auto-closes — no need to repeat the first point.
        </div>
      </div>

      {/* Warnings / errors */}
      {result.error && (
        <div
          style={{
            padding: 10,
            borderRadius: 6,
            border: "1px solid rgba(230, 57, 70, 0.5)",
            background: "rgba(230, 57, 70, 0.08)",
            color: "#E63946",
            fontSize: 12,
          }}
        >
          ⚠ {result.error}
        </div>
      )}
      {!result.error && result.warnings.length > 0 && (
        <div
          style={{
            padding: 10,
            borderRadius: 6,
            border: "1px solid rgba(230, 126, 34, 0.5)",
            background: "rgba(230, 126, 34, 0.08)",
            color: "#E67E22",
            fontSize: 12,
          }}
        >
          {result.warnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}

      {/* Live preview */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: 10,
            color: TEXT_DIM,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Live preview
        </label>
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: 220,
            border: `1px solid ${LINE}`,
            borderRadius: 6,
            overflow: "hidden",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        />
        {result.polygon && (
          <div style={{ fontSize: 11, color: TEXT_PRIMARY, marginTop: 6 }}>
            Computed area: <strong>{result.areaSqft.toLocaleString()}</strong> sqft
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  background: "rgba(0, 0, 0, 0.3)",
  color: TEXT_PRIMARY,
  fontSize: 13,
  fontFamily: "inherit",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 140,
  padding: 10,
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  background: "rgba(0, 0, 0, 0.3)",
  color: TEXT_PRIMARY,
  fontFamily: '"SF Mono", Menlo, monospace',
  fontSize: 12,
  resize: "vertical",
  boxSizing: "border-box",
};
