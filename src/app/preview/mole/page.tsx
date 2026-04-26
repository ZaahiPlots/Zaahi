'use client';

// ZAAHI · §41 Mole Agent · Phase 1 v0.1 INTERNAL PREVIEW route
//
// LOCALHOST-ONLY by intent. Production deploy returns 404 via molePreviewGuard.
// All 4 Mole layers (geology, groundwater, stability, subsidence) loaded from
// /data/mole/*.geojson (copies of data/processed/mole/*.geojson per
// docs/research/mole-data-acquisition-log.md). Style + z-ordering + zoom rules
// follow the integration spec at log §3 verbatim.
//
// Reference (read-only): src/app/parcels/map/page.tsx for the MapLibre + CARTO
// basemap initialisation pattern. ZAAHI Signature 3D listings are NOT rendered
// here — that requires importing the 270-line loadZaahiPlots function which is
// inline in the restricted parcels/map module. The preview's purpose is
// underground-layer UX evaluation; surface listings are out of scope.

import { useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import maplibregl, {
  Map as MLMap,
  StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import AuthGuard from '@/components/AuthGuard';
import MoleLayersPanel, {
  type MoleLayerId,
  type MoleLayersState,
} from './MoleLayersPanel';
import { IS_PRODUCTION_DEPLOY } from './molePreviewGuard';

// CARTO light basemap — same pattern as src/app/parcels/map/page.tsx STYLES.light
// (lines 40-56 of that file). Inlined here because the constant is not exported.
const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors',
    },
  },
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

// Source + layer IDs — naming follows the parcels/map convention (kebab-case).
const SRC = {
  geology: 'mole-geology-src',
  groundwater: 'mole-groundwater-src',
  stability: 'mole-stability-src',
  subsidence: 'mole-subsidence-src',
} as const;

const LAYER = {
  geology: 'mole-geology-fill',
  groundwater: 'mole-groundwater-fill',
  stability: 'mole-stability-fill',
  stabilityPulse: 'mole-stability-pulse',
  subsidence: 'mole-subsidence-points',
} as const;

const FEATURE_FILES: Record<MoleLayerId, string> = {
  geology: '/data/mole/geology_zones.geojson',
  groundwater: '/data/mole/groundwater_depth.geojson',
  stability: '/data/mole/stability_zones.geojson',
  subsidence: '/data/mole/subsidence_velocity.geojson',
};

type ClickPopup = {
  lng: number;
  lat: number;
  title: string;
  rows: { label: string; value: string }[];
  citation?: string;
};

export default function MolePreviewPage() {
  // Production deploy guard — see molePreviewGuard.ts for the env-var matrix.
  // notFound() throws and is caught by Next.js to render the 404 page.
  if (IS_PRODUCTION_DEPLOY) {
    notFound();
  }

  return (
    <AuthGuard>
      <MolePreviewClient />
    </AuthGuard>
  );
}

function MolePreviewClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [layerState, setLayerState] = useState<MoleLayersState>({
    geology: false,
    groundwater: false,
    stability: false,
    subsidence: false,
  });
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [popup, setPopup] = useState<ClickPopup | null>(null);

  // Init MapLibre once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [55.2708, 25.2048], // Dubai centroid per spec
      zoom: 9,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');

    map.on('load', () => {
      addAllSources(map);
      addAllLayers(map);
      attachClickHandlers(map, setPopup);
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply layer visibility when toggle state changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    setLayerVisibility(map, LAYER.geology, layerState.geology);
    setLayerVisibility(map, LAYER.groundwater, layerState.groundwater);
    setLayerVisibility(map, LAYER.stability, layerState.stability);
    setLayerVisibility(map, LAYER.stabilityPulse, layerState.stability);
    setLayerVisibility(map, LAYER.subsidence, layerState.subsidence);
  }, [layerState, mapReady]);

  const handleToggle = (id: MoleLayerId, on: boolean) => {
    setLayerState((prev) => ({ ...prev, [id]: on }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A1628' }}>
      <PreviewBanner />
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 44,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <MoleLayersPanel
        state={layerState}
        onToggle={handleToggle}
        collapsed={panelCollapsed}
        onCollapseToggle={() => setPanelCollapsed((c) => !c)}
      />
      {popup && (
        <FeaturePopup popup={popup} onClose={() => setPopup(null)} />
      )}
    </div>
  );
}

function PreviewBanner() {
  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        background: 'rgba(230, 57, 70, 0.95)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textAlign: 'center',
        padding: '0 16px',
        zIndex: 30,
        borderBottom: '1px solid rgba(0,0,0,0.2)',
        userSelect: 'none',
      }}
    >
      ⚠️ INTERNAL PREVIEW · APPROXIMATE DATA · DO NOT SHARE EXTERNALLY · Mole Agent Phase 1 v0.1 · founder-review only
    </div>
  );
}

function FeaturePopup({ popup, onClose }: { popup: ClickPopup; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 380,
        background: 'rgba(10, 22, 40, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(200, 169, 110, 0.3)',
        borderRadius: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        color: '#E8E0D0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 25,
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#C8A96E',
            letterSpacing: '0.03em',
            flex: 1,
          }}
        >
          {popup.title}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(200, 169, 110, 0.3)',
            borderRadius: 6,
            color: '#C8A96E',
            cursor: 'pointer',
            padding: '2px 8px',
            fontSize: 14,
            transition: 'border-color 150ms ease, background 150ms ease',
          }}
        >
          ×
        </button>
      </div>
      <dl style={{ margin: '10px 0 0 0' }}>
        {popup.rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              gap: 10,
              padding: '4px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              fontSize: 12,
            }}
          >
            <dt
              style={{
                opacity: 0.55,
                width: 130,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: 10,
              }}
            >
              {r.label}
            </dt>
            <dd style={{ margin: 0, flex: 1 }}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {popup.citation && (
        <a
          href={popup.citation}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 10,
            color: '#C8A96E',
            textDecoration: 'underline',
            fontSize: 11,
          }}
        >
          Open citation ↗
        </a>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Map plumbing
// ────────────────────────────────────────────────────────────────────────────

function addAllSources(map: MLMap) {
  (Object.keys(FEATURE_FILES) as MoleLayerId[]).forEach((id) => {
    const srcId = SRC[id];
    if (map.getSource(srcId)) return;
    map.addSource(srcId, {
      type: 'geojson',
      data: FEATURE_FILES[id],
    });
  });
}

function addAllLayers(map: MLMap) {
  // Layer order per docs/research/mole-data-acquisition-log.md §3.1
  // (lower in z-stack first; Mole layers all sit BELOW any future ZAAHI
  // Signature 3D layers — sacred per CLAUDE.md).

  // Layer 2 — Geology (broadest, lowest opacity)
  map.addLayer({
    id: LAYER.geology,
    type: 'fill',
    source: SRC.geology,
    minzoom: 6,
    maxzoom: 15,
    layout: { visibility: 'none' }, // OFF by default per CLAUDE.md
    paint: {
      'fill-color': [
        'match',
        ['get', 'zone_type'],
        'COASTAL_SABKHA', '#E63946',
        'INTERIOR_SABKHA', '#E63946',
        'RUB_AL_KHALI_DUNES', '#FFD700',
        'HAJAR_OPHIOLITE', '#708090',
        'COASTAL_SAND', '#F4A460',
        '#888888',
      ],
      'fill-opacity': 0.2,
      'fill-outline-color': 'rgba(255,255,255,0.3)',
    },
  });

  // Layer 3 — Groundwater
  map.addLayer({
    id: LAYER.groundwater,
    type: 'fill',
    source: SRC.groundwater,
    minzoom: 7,
    maxzoom: 15,
    layout: { visibility: 'none' },
    paint: {
      'fill-color': [
        'match',
        ['get', 'depth_class'],
        'SHALLOW', '#1B4965',
        'MODERATE', '#84CC16',
        'DEEP', '#84CC16',
        'DECLINING_FAST', '#E67E22',
        'DEPLETED', '#E63946',
        '#888888',
      ],
      'fill-opacity': 0.25,
      'fill-outline-color': 'rgba(255,255,255,0.4)',
    },
  });

  // Layer 4 — Stability classes (narrower, higher emphasis)
  map.addLayer({
    id: LAYER.stability,
    type: 'fill',
    source: SRC.stability,
    minzoom: 8,
    maxzoom: 18,
    layout: { visibility: 'none' },
    paint: {
      'fill-color': [
        'match',
        ['get', 'stability_class'],
        'STABLE', '#2D6A4F',
        'CAUTION', '#FFD700',
        'WARNING', '#E67E22',
        'CRITICAL', '#E63946',
        '#888888',
      ],
      'fill-opacity': 0.4,
      'fill-outline-color': '#FFFFFF',
    },
  });

  // Animated halo on CRITICAL stability zones only (line outline)
  map.addLayer({
    id: LAYER.stabilityPulse,
    type: 'line',
    source: SRC.stability,
    filter: ['==', ['get', 'stability_class'], 'CRITICAL'],
    minzoom: 10,
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#E63946',
      'line-width': 2,
      'line-opacity': 0.8,
    },
  });

  // Layer 1 — Subsidence velocity points (high zoom only)
  map.addLayer({
    id: LAYER.subsidence,
    type: 'circle',
    source: SRC.subsidence,
    minzoom: 11,
    maxzoom: 22,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        11, 3,
        16, 8,
      ],
      'circle-color': [
        'case',
        ['<', ['abs', ['get', 'velocity_los_mm_yr']], 2], '#2D6A4F',
        ['<', ['abs', ['get', 'velocity_los_mm_yr']], 5], '#FFD700',
        ['<', ['abs', ['get', 'velocity_los_mm_yr']], 10], '#E67E22',
        '#E63946',
      ],
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 1,
      'circle-opacity': 0.85,
    },
  });
}

function setLayerVisibility(map: MLMap, layerId: string, visible: boolean) {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}

function attachClickHandlers(
  map: MLMap,
  setPopup: (p: ClickPopup | null) => void,
) {
  const clickableLayers: { id: string; build: (props: Record<string, unknown>) => Omit<ClickPopup, 'lng' | 'lat'> }[] = [
    {
      id: LAYER.geology,
      build: (p) => ({
        title: String(p.name ?? p.zone_type ?? 'Geology zone'),
        rows: [
          { label: 'Zone type', value: String(p.zone_type ?? '—') },
          { label: 'Foundation risk', value: String(p.foundation_risk ?? '—') },
          { label: 'Precision', value: String(p.precision ?? '—') },
          { label: 'Description', value: String(p.description ?? '—') },
          { label: 'Source', value: String(p.source ?? '—') },
        ],
      }),
    },
    {
      id: LAYER.groundwater,
      build: (p) => ({
        title: String(p.zone_id ?? 'Groundwater zone'),
        rows: [
          { label: 'Depth class', value: String(p.depth_class ?? '—') },
          { label: 'Depth (m)', value: String(p.depth_estimate_m ?? '—') },
          { label: 'Decline (m/yr)', value: String(p.decline_rate_m_per_year ?? '—') },
          { label: 'Implication', value: String(p.foundation_implication ?? '—') },
          { label: 'Source', value: String(p.source ?? '—') },
        ],
      }),
    },
    {
      id: LAYER.stability,
      build: (p) => ({
        title: String(p.zone_id ?? 'Stability zone'),
        rows: [
          { label: 'Class', value: String(p.stability_class ?? '—') },
          { label: 'Max velocity (mm/yr)', value: String(p.max_velocity_los_mm_yr ?? '—') },
          { label: 'Source', value: String(p.data_source ?? '—') },
          { label: 'Note', value: String(p.note ?? '—') },
        ],
        citation: typeof p.citation === 'string' ? p.citation : undefined,
      }),
    },
    {
      id: LAYER.subsidence,
      build: (p) => ({
        title: String(p.point_id ?? 'Subsidence point'),
        rows: [
          { label: 'Velocity (mm/yr)', value: String(p.velocity_los_mm_yr ?? '—') },
          { label: 'Uncertainty', value: String(p.velocity_uncertainty_mm_yr ?? '—') },
          { label: 'Class', value: String(p.stability_class ?? '—') },
          { label: 'Source', value: String(p.data_source ?? '—') },
          { label: 'Period', value: `${String(p.observation_period_start ?? '?')} → ${String(p.observation_period_end ?? '?')}` },
          { label: 'Note', value: String(p.note ?? '—') },
        ],
        citation: typeof p.citation === 'string' ? p.citation : undefined,
      }),
    },
  ];

  clickableLayers.forEach(({ id, build }) => {
    map.on('click', id, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const built = build(props);
      setPopup({
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        ...built,
      });
    });
    map.on('mouseenter', id, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', id, () => {
      map.getCanvas().style.cursor = '';
    });
  });
}

