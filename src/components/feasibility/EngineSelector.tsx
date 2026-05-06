'use client';

// ZAAHI Feasibility v6 — engine selector (dropdown + blurb + source line).
//
// Switches the active engine. Re-seeding of psf defaults happens in the parent
// calculator's effect (so manual overrides are preserved when the user toggles
// back). Visual tokens: navy glass background, gold-tinted border, system-font
// inherit. Same dropdown pattern as the existing community filter on /dashboard.

import { ENGINES, ENGINE_ORDER, type EngineId } from '@/lib/feasibility-v6/engines';
import FieldLabel from './FieldLabel';

const GOLD = '#C8A96E';
const NAVY = '#1A1A2E';
const TXT = '#f5f1e8';
const SUBTLE = 'rgba(245, 241, 232, 0.55)';
const LINE_HARD = 'rgba(200, 169, 110, 0.30)';

export interface EngineSelectorProps {
  value: EngineId;
  onChange: (id: EngineId) => void;
}

export default function EngineSelector({ value, onChange }: EngineSelectorProps) {
  const engine = ENGINES[value];
  return (
    <div>
      <div
        style={{
          color: GOLD,
          fontFamily: 'Georgia, serif',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: `1px solid ${LINE_HARD}`,
        }}
      >
        <FieldLabel label="Engine" tooltipKey="engine" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EngineId)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${LINE_HARD}`,
          borderRadius: 8,
          color: TXT,
          padding: '8px 10px',
          fontSize: 13,
          fontFamily: 'inherit',
          appearance: 'none',
        }}
      >
        {ENGINE_ORDER.map((id) => (
          <option key={id} value={id} style={{ background: NAVY }}>
            {ENGINES[id].label}
          </option>
        ))}
      </select>
      <div style={{ color: SUBTLE, fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
        {engine.blurb}
        <div style={{ marginTop: 4, color: 'rgba(245,241,232,0.4)', fontSize: 10 }}>
          source: {engine.source}
        </div>
      </div>
    </div>
  );
}
