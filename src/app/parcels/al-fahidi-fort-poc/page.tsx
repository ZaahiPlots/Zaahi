"use client";

// POC — real-world building 3D rendered at real coordinates on zaahi.io.
//
// Subject: Al Fahidi Fort (Dubai Museum) · built 1787 · Dubai Municipality.
// Legal posture: architectural copyright expired · public-domain structure.
// Selection rationale + supporting evidence:
//   docs/specs/phase-1/07-ICONIC_BUILDING_POC_SPEC.md
//
// This route is an ADDITION to ZAAHI Signature, NOT a replacement. ZAAHI
// Signature code in src/app/parcels/map/page.tsx is untouched and protected
// by CLAUDE.md "NEVER change ZAAHI Signature 3D".

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { createFortLayer } from "./FortLayer";
import { FORT_LOCATION, CAMERA } from "./constants";

const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap contributors",
    },
  },
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

export default function AlFahidiFortPoc() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [fortVisible, setFortVisible] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE,
      center: [FORT_LOCATION.lng, FORT_LOCATION.lat],
      zoom: CAMERA.initialZoom,
      pitch: CAMERA.initialPitch,
      bearing: CAMERA.initialBearing,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addLayer(createFortLayer());
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle fort visibility: add/remove the custom layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const layerId = "al-fahidi-fort-3d";
    if (fortVisible) {
      if (!map.getLayer(layerId)) {
        map.addLayer(createFortLayer());
      }
    } else {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
  }, [fortVisible]);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#e5e7eb",
        background: "#0a1628",
      }}
    >
      {/* Map */}
      <div
        ref={mapContainerRef}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Header */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "14px 20px",
          background: "rgba(10, 22, 40, 0.7)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <Link
            href="/"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#C8A96E",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            ZAAHI
          </Link>
          <span style={{ fontSize: 11, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Real-building 3D POC
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setFortVisible((v) => !v)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              background: fortVisible ? "rgba(200, 169, 110, 0.25)" : "rgba(255, 255, 255, 0.06)",
              color: "#C8A96E",
              border: `1px solid ${fortVisible ? "#C8A96E" : "rgba(200, 169, 110, 0.3)"}`,
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            {fortVisible ? "✓ Fort visible" : "Show fort"}
          </button>
          <button
            onClick={() => setInfoOpen((v) => !v)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              background: "rgba(255, 255, 255, 0.06)",
              color: "#C8A96E",
              border: "1px solid rgba(200, 169, 110, 0.3)",
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            {infoOpen ? "Hide info" : "Show info"}
          </button>
        </div>
      </header>

      {/* Info panel */}
      {infoOpen && (
        <aside
          style={{
            position: "absolute",
            top: 70,
            left: 20,
            width: 320,
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
            padding: 20,
            background: "rgba(10, 22, 40, 0.4)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            zIndex: 9,
          }}
        >
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: 8,
              color: "#e5e7eb",
            }}
          >
            {FORT_LOCATION.name}
          </h1>
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, marginBottom: 14 }}>
            ZAAHI 3D real-building capability demo · rendered procedurally at exact coordinates.
          </p>

          <Row label="Built" value={String(FORT_LOCATION.yearBuilt)} />
          <Row label="Owner" value={FORT_LOCATION.owner} />
          <Row label="Location" value={FORT_LOCATION.neighborhood} />
          <Row
            label="Coordinates"
            value={`${FORT_LOCATION.lat.toFixed(4)}°N · ${FORT_LOCATION.lng.toFixed(4)}°E`}
          />
          <Row label="IP status" value={FORT_LOCATION.status} />

          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: 11,
              color: "#9ca3af",
              lineHeight: 1.6,
            }}
          >
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: "#C8A96E" }}>Technical demo:</strong> Three.js scene
              rendered via MapLibre CustomLayer · shares WebGL context · coordinates mapped via
              MercatorCoordinate transform.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: "#C8A96E" }}>Note:</strong> geometry is LOD2
              approximation · recognisable silhouette · not surveyed architecture. Fort plan
              simplified to rectangular footprint with three corner towers.
            </p>
            <p>
              <strong style={{ color: "#C8A96E" }}>Addition:</strong> this is an addition to
              ZAAHI Signature (the generative 3D on zaahi.io parcels) · not a replacement.
            </p>
          </div>
        </aside>
      )}

      {/* Footer credit */}
      <footer
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          padding: "6px 12px",
          fontSize: 10,
          color: "#9ca3af",
          background: "rgba(10, 22, 40, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 6,
          zIndex: 9,
          maxWidth: 400,
          textAlign: "right",
        }}
      >
        3D geometry: agent-authored procedural · subject building: Al Fahidi Fort (Dubai
        Municipality · public domain · built 1787). Basemap: © CARTO · © OpenStreetMap
        contributors.
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        fontSize: 12,
        gap: 12,
      }}
    >
      <span style={{ color: "#9ca3af", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}>
        {label}
      </span>
      <span style={{ color: "#e5e7eb", textAlign: "right", flexShrink: 0 }}>{value}</span>
    </div>
  );
}
