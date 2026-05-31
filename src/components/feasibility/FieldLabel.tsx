'use client';

// ZAAHI Feasibility v6 — field label with optional hover tooltip.
//
// Hover-only on desktop, tap-to-show on touch (Sprint 10 a11y pass).
// Tooltip body is looked up from src/lib/feasibility-v6/tooltips.ts by key.
// Visuals: `var(--text-secondary)` label + `ⓘ` glyph; popup uses
// `.zaahi-glass-deep` token equivalent (rgba navy 0.96 + blur 16px).

import { useState } from 'react';
import { getTooltip } from '@/lib/feasibility-v6/tooltips';

const LINE_HARD = 'rgba(200, 169, 110, 0.30)';
const TXT = '#f5f1e8';
const DIM = 'rgba(245, 241, 232, 0.70)';
const SUBTLE = 'rgba(245, 241, 232, 0.55)';

export interface FieldLabelProps {
  label: string;
  tooltipKey?: string;
}

export default function FieldLabel({ label, tooltipKey }: FieldLabelProps) {
  const [hover, setHover] = useState(false);
  const tip = tooltipKey ? getTooltip(tooltipKey) : undefined;
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ color: DIM, fontSize: 11, letterSpacing: 0.3 }}>{label}</span>
      {tip && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `1px solid ${LINE_HARD}`,
            color: SUBTLE,
            fontSize: 9,
            cursor: 'help',
          }}
        >
          i
        </span>
      )}
      {tip && hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: '120%',
            left: 0,
            zIndex: 30,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: TXT,
            fontSize: 11,
            padding: '8px 10px',
            border: `1px solid ${LINE_HARD}`,
            borderRadius: 8,
            width: 280,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            lineHeight: 1.4,
            pointerEvents: 'none',
          }}
        >
          {tip}
        </span>
      )}
    </span>
  );
}
