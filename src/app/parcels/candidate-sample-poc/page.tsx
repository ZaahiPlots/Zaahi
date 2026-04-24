"use client";

// POC — candidate 3D-artist evaluation page on zaahi.io.
//
// Purpose: render an external candidate's submitted building model (FBX/OBJ
// from 3ds Max · converted to glTF via scripts/convert_candidate_sample.py)
// at a fixed pin near the Dubai Water Canal · isolated from production
// ZAAHI Signature geometry so the TB02 tower and the main parcels map stay
// untouched.
//
// This route is an ADDITION to ZAAHI Signature · NOT a replacement. ZAAHI
// Signature code in src/app/parcels/map/page.tsx is untouched and protected
// by CLAUDE.md "NEVER change ZAAHI Signature 3D".

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import {
  createCandidateBuildingLayer,
  CANDIDATE_BUILDING_LAYER_ID,
} from "./CandidateBuildingLayer";
import { SAMPLE_LOCATION, CAMERA, MODEL_METRICS } from "./constants";

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

export default function CandidateSamplePoc() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [buildingVisible, setBuildingVisible] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_STYLE,
      center: [SAMPLE_LOCATION.lng, SAMPLE_LOCATION.lat],
      zoom: CAMERA.initialZoom,
      pitch: CAMERA.initialPitch,
      bearing: CAMERA.initialBearing,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.jumpTo({
        center: [SAMPLE_LOCATION.lng, SAMPLE_LOCATION.lat],
        zoom: CAMERA.initialZoom,
        pitch: CAMERA.initialPitch,
        bearing: CAMERA.initialBearing,
      });
      map.addLayer(
        createCandidateBuildingLayer(
          () => setLoadState("ready"),
          () => setLoadState("error"),
        ),
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (buildingVisible) {
      if (!map.getLayer(CANDIDATE_BUILDING_LAYER_ID)) {
        map.addLayer(
          createCandidateBuildingLayer(
            () => setLoadState("ready"),
            () => setLoadState("error"),
          ),
        );
      }
    } else {
      if (map.getLayer(CANDIDATE_BUILDING_LAYER_ID)) {
        map.removeLayer(CANDIDATE_BUILDING_LAYER_ID);
      }
    }
  }, [buildingVisible]);

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
      <div
        ref={mapContainerRef}
        style={{ position: "absolute", inset: 0 }}
      />

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
          <span
            style={{
              fontSize: 11,
              color: "#9ca3af",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            3D artist candidate · sample review
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setBuildingVisible((v) => !v)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              background: buildingVisible
                ? "rgba(200, 169, 110, 0.25)"
                : "rgba(255, 255, 255, 0.06)",
              color: "#C8A96E",
              border: `1px solid ${buildingVisible ? "#C8A96E" : "rgba(200, 169, 110, 0.3)"}`,
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            {buildingVisible ? "✓ Building visible" : "Show building"}
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

      {infoOpen && (
        <aside
          style={{
            position: "absolute",
            top: 70,
            left: 20,
            width: 340,
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
            {SAMPLE_LOCATION.name}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "#9ca3af",
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            External candidate submission rendered at real-world scale · for
            evaluation of modelling quality · mesh organisation · material
            choices.
          </p>

          <Row label="Submitted" value={SAMPLE_LOCATION.submittedBy} />
          <Row label="Pin" value={SAMPLE_LOCATION.neighborhood} />
          <Row
            label="Coordinates"
            value={`${SAMPLE_LOCATION.lat.toFixed(4)}°N · ${SAMPLE_LOCATION.lng.toFixed(4)}°E`}
          />
          <Row label="Source" value={SAMPLE_LOCATION.sourceFormat} />
          <Row label="Converted" value={SAMPLE_LOCATION.convertedTo} />
          <Row label="Status" value={SAMPLE_LOCATION.status} />

          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#9ca3af",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Model metrics
            </div>
            <Row
              label="Mesh objects"
              value={`${MODEL_METRICS.rawMeshObjects} → ${MODEL_METRICS.mergedMeshGroups} (draw calls)`}
            />
            <Row
              label="Vertices"
              value={MODEL_METRICS.vertices.toLocaleString("en-US")}
            />
            <Row
              label="Triangles"
              value={MODEL_METRICS.triangles.toLocaleString("en-US")}
            />
            <Row label="Materials" value={String(MODEL_METRICS.materials)} />
            <Row
              label="Size (glb)"
              value={`${MODEL_METRICS.glbKilobytes} KB`}
            />
            <Row
              label="Dimensions"
              value={`${MODEL_METRICS.dimensionsM.x} × ${MODEL_METRICS.dimensionsM.y} × ${MODEL_METRICS.dimensionsM.z} m`}
            />
          </div>

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
              <strong style={{ color: "#C8A96E" }}>Conversion:</strong>{" "}
              {MODEL_METRICS.pbr}. {MODEL_METRICS.textures}.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: "#C8A96E" }}>Controls:</strong> drag to
              pan · wheel to zoom · right-click + drag to rotate / pitch. The
              same MapLibre navigation as the main ZAAHI map.
            </p>
            <p>
              <strong style={{ color: "#C8A96E" }}>Addition:</strong> this POC
              does not touch the TB02 tower or the main parcels map. Separate
              pin north of TB02.
            </p>
          </div>
        </aside>
      )}

      {loadState !== "ready" && (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 16px",
            fontSize: 11,
            color: loadState === "error" ? "#E63946" : "#C8A96E",
            background: "rgba(10, 22, 40, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: `1px solid ${loadState === "error" ? "rgba(230, 57, 70, 0.4)" : "rgba(200, 169, 110, 0.3)"}`,
            borderRadius: 8,
            letterSpacing: "0.04em",
            zIndex: 11,
          }}
        >
          {loadState === "error"
            ? "Model load failed — check /models/candidate-sample.glb"
            : "Loading glTF model…"}
        </div>
      )}

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
          maxWidth: 420,
          textAlign: "right",
        }}
      >
        3D geometry: external candidate submission · converted via
        trimesh 4.12 (OBJ → glTF 2.0). Basemap: © CARTO · © OpenStreetMap
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
      <span
        style={{
          color: "#9ca3af",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: 10,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "#e5e7eb",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}
