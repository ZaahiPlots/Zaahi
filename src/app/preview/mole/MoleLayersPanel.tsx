'use client';

import { useState } from 'react';

// Per docs/research/mole-data-acquisition-log.md §3.4 — required by CC-BY licences
// of the underlying datasets. Surfaced inline as info tooltips per layer.
type LayerMeta = {
  id: MoleLayerId;
  label: string;
  subtitle: string;
  citation: string;
  citationUrl: string;
  precision: 'APPROXIMATE' | 'CITED';
};

export type MoleLayerId =
  | 'geology'
  | 'groundwater'
  | 'stability'
  | 'subsidence';

export type MoleLayersState = Record<MoleLayerId, boolean>;

const LAYERS: LayerMeta[] = [
  {
    id: 'geology',
    label: 'Geology zones',
    subtitle: 'sabkha · bedrock · sand',
    citation: 'USGS OFR 97-470B + IJERA UAE sabkha (CC0 / public-domain derivatives)',
    citationUrl: 'https://pubs.usgs.gov/publication/ofr97470B',
    precision: 'APPROXIMATE',
  },
  {
    id: 'groundwater',
    label: 'Groundwater depth + decline',
    subtitle: 'Quaternary aquifer',
    citation: 'MDPI Water 2021 (13:864) + 2025 (17:21), Springer Discover Sustainability 2025 (CC-BY 4.0)',
    citationUrl: 'https://www.mdpi.com/2073-4441/13/6/864',
    precision: 'APPROXIMATE',
  },
  {
    id: 'stability',
    label: 'Ground stability classes',
    subtitle: 'InSAR-derived · Phase 1 v0.1 seed',
    citation: 'Derived from Layer 1 (Remah PSI cited bowl)',
    citationUrl: 'https://www.sciencedirect.com/science/article/pii/S0048969721010135',
    precision: 'CITED',
  },
  {
    id: 'subsidence',
    label: 'Subsidence velocity points',
    subtitle: 'PS-InSAR · Phase 1 v0.1 seed',
    citation: 'ScienceDirect — Persistent scatterer interferometry, Remah UAE 40 mm/yr (CC-BY 4.0)',
    citationUrl: 'https://www.sciencedirect.com/science/article/pii/S0048969721010135',
    precision: 'CITED',
  },
];

interface Props {
  state: MoleLayersState;
  onToggle: (id: MoleLayerId, on: boolean) => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export default function MoleLayersPanel({
  state,
  onToggle,
  collapsed,
  onCollapseToggle,
}: Props) {
  const [openInfo, setOpenInfo] = useState<MoleLayerId | null>(null);

  return (
    <aside
      style={{
        position: 'absolute',
        top: 80,
        right: 16,
        width: collapsed ? 240 : 340,
        maxHeight: 'calc(100vh - 110px)',
        overflowY: 'auto',
        background: 'rgba(10, 22, 40, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
        color: '#E8E0D0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 20,
      }}
    >
      <header
        style={{
          padding: '14px 16px 10px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: '#C8A96E',
            }}
          >
            Subsurface Intelligence
          </div>
          <div
            style={{
              fontSize: 10,
              opacity: 0.6,
              marginTop: 2,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Mole Agent · Internal Preview
          </div>
        </div>
        <button
          type="button"
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(200, 169, 110, 0.3)',
            borderRadius: 6,
            color: '#C8A96E',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 12,
            transition: 'border-color 150ms ease, background 150ms ease',
          }}
        >
          {collapsed ? '⌄' : '×'}
        </button>
      </header>

      {!collapsed && (
        <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0 12px 0' }}>
          {LAYERS.map((layer) => {
            const on = state[layer.id];
            const infoOpen = openInfo === layer.id;
            return (
              <li
                key={layer.id}
                style={{
                  padding: '10px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => onToggle(layer.id, e.target.checked)}
                      style={{ accentColor: '#C8A96E', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.3 }}>{layer.label}</div>
                      <div
                        style={{
                          fontSize: 10,
                          opacity: 0.55,
                          marginTop: 2,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {layer.subtitle}
                      </div>
                    </span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Source for ${layer.label}`}
                    onClick={() => setOpenInfo(infoOpen ? null : layer.id)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: '1px solid rgba(200, 169, 110, 0.4)',
                      background: infoOpen ? 'rgba(200, 169, 110, 0.25)' : 'rgba(255,255,255,0.06)',
                      color: '#C8A96E',
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'background 150ms ease, border-color 150ms ease',
                    }}
                  >
                    ⓘ
                  </button>
                </div>
                {infoOpen && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        background: layer.precision === 'APPROXIMATE' ? 'rgba(230, 126, 34, 0.25)' : 'rgba(45, 106, 79, 0.25)',
                        border: `1px solid ${layer.precision === 'APPROXIMATE' ? '#E67E22' : '#2D6A4F'}`,
                        borderRadius: 4,
                        fontSize: 9,
                        letterSpacing: '0.08em',
                        marginBottom: 6,
                      }}
                    >
                      {layer.precision}
                    </div>
                    <div style={{ opacity: 0.85, marginBottom: 4 }}>{layer.citation}</div>
                    <a
                      href={layer.citationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#C8A96E', textDecoration: 'underline', fontSize: 10 }}
                    >
                      Open citation ↗
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!collapsed && (
        <footer
          style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: 9,
            opacity: 0.5,
            letterSpacing: '0.04em',
          }}
        >
          Data sources cited per CC-BY 4.0 / CC0. Full log:
          <br />
          docs/research/mole-data-acquisition-log.md
        </footer>
      )}
    </aside>
  );
}
