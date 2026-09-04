'use client';

// Preview-only parcel picker. Wraps the shared FeasibilityV6Calculator with a
// dropdown for swapping between the 5 mock parcels. Production
// /parcels/[id]/feasibility passes a single Prisma-fetched parcel and skips
// this picker entirely.

import { useState } from 'react';
import FeasibilityV6Calculator from '@/components/feasibility/FeasibilityV6Calculator';
import { fmtInt } from '@/lib/feasibility';
import { MOCK_PARCELS } from './mockData';

const NAVY = '#1A1A2E';
const GOLD = '#C8A96E';
const TXT = '#f5f1e8';
const SUBTLE = 'rgba(245, 241, 232, 0.55)';
const LINE_HARD = 'rgba(200, 169, 110, 0.30)';

export default function PreviewParcelPicker() {
  const [parcelId, setParcelId] = useState<string>(MOCK_PARCELS[0].id);
  const parcel = MOCK_PARCELS.find((p) => p.id === parcelId) ?? MOCK_PARCELS[0];
  // Layout density. The calculator defaults to 'fullscreen', but the canonical
  // production mount is the /parcels/map SidePanel, which is 'sidepanel' — and
  // several surfaces exist in one mode only (the Mix breakdown panel is
  // sidepanel-only). Without a switch here the preview route could not
  // exercise the layout most users actually see. Added 2026-09-04.
  const [mode, setMode] = useState<'sidepanel' | 'fullscreen'>('fullscreen');

  return (
    <>
      {/* Mock-parcel picker bar — preview only. Sticks just below the RED banner. */}
      <div
        style={{
          position: 'sticky',
          top: 32,
          zIndex: 40,
          background: 'rgba(10, 22, 40, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${LINE_HARD}`,
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            color: GOLD,
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Mock parcel
        </span>
        <select
          value={parcelId}
          onChange={(e) => setParcelId(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${LINE_HARD}`,
            borderRadius: 8,
            color: TXT,
            padding: '6px 10px',
            fontSize: 12,
            fontFamily: 'inherit',
            appearance: 'none',
            minWidth: 320,
          }}
        >
          {MOCK_PARCELS.map((p) => (
            <option key={p.id} value={p.id} style={{ background: NAVY }}>
              {p.plotNumber} — {p.district} — {p.landUse} — {fmtInt(p.plotAreaSqft)} sqft
            </option>
          ))}
        </select>
        <span
          style={{
            color: GOLD,
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Layout
        </span>
        <select
          aria-label="Layout mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'sidepanel' | 'fullscreen')}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${LINE_HARD}`,
            borderRadius: 8,
            color: TXT,
            padding: '6px 10px',
            fontSize: 12,
            fontFamily: 'inherit',
            appearance: 'none',
          }}
        >
          <option value="fullscreen" style={{ background: NAVY }}>
            fullscreen (/parcels/[id]/feasibility)
          </option>
          <option value="sidepanel" style={{ background: NAVY }}>
            sidepanel (/parcels/map — production)
          </option>
        </select>
        <span style={{ color: SUBTLE, fontSize: 10, letterSpacing: '0.04em' }}>
          (preview only — production loads from URL `/parcels/[id]/feasibility`)
        </span>
      </div>
      <div style={mode === 'sidepanel' ? { maxWidth: 380, padding: '0 12px' } : undefined}>
        <FeasibilityV6Calculator parcel={parcel} banner="preview" mode={mode} />
      </div>
    </>
  );
}
