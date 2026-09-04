'use client';

// ZAAHI Feasibility v6 — engine selector (dropdown + blurb + source line).
//
// Switches the active engine. Re-seeding of psf defaults happens in the parent
// calculator's effect (so manual overrides are preserved when the user toggles
// back). Visual tokens: navy glass background, gold-tinted border, system-font
// inherit. Same dropdown pattern as the existing community filter on /dashboard.
//
// Sprint 2-fast (2026-05-06) — all 13 engines unlocked. Engines whose defaults
// are research-only (not founder-ratified) are grouped under "RESEARCH DEFAULTS"
// with an italic caption noting the calibration state. Validated engines
// (Residential, Office at this commit) sit in a "VALIDATED" group at the top.
// As founder ratifies more engines, flip their `validated:` field to `true`
// in src/lib/feasibility-v6/engines.ts.

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
  // Restrict the dropdown to a subset of engines. Production now passes
  // undefined (full 13-engine catalogue with grouped optgroups). Kept for
  // future emergency fallback to a smaller set if a specific engine breaks.
  availableEngines?: EngineId[];
  /**
   * Render the dropdown inert.
   *
   * Used on MIXED USE plots, where the top-level engine does not drive the
   * headline — each use slice runs its own engine via shareToEngine(), and the
   * mix is the source of truth (founder decision D-18, 2026-09-04). A control
   * that changes nothing is worse than no control: the founder's own QA read
   * the unchanged numbers as a bug.
   */
  disabled?: boolean;
  /** Sentence explaining WHY it is inert. Required whenever `disabled`. */
  disabledNote?: string;
}

export default function EngineSelector({
  value,
  onChange,
  availableEngines,
  disabled = false,
  disabledNote,
}: EngineSelectorProps) {
  const engine = ENGINES[value];
  const ids: EngineId[] = availableEngines ?? ENGINE_ORDER;

  // Split into validated / research-only. Validated group preserves
  // ENGINE_ORDER for natural reading; research group sorted alphabetically by
  // label so users can find an asset class predictably.
  const validatedIds = ids.filter((id) => ENGINES[id].validated);
  const researchIds = ids
    .filter((id) => !ENGINES[id].validated)
    .sort((a, b) => ENGINES[a].label.localeCompare(ENGINES[b].label));

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
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? disabledNote : undefined}
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
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {validatedIds.length > 0 && (
          <optgroup label="VALIDATED" style={{ background: NAVY, color: GOLD }}>
            {validatedIds.map((id) => (
              <option key={id} value={id} style={{ background: NAVY, color: TXT }}>
                {ENGINES[id].label}
              </option>
            ))}
          </optgroup>
        )}
        {researchIds.length > 0 && (
          <optgroup label="RESEARCH DEFAULTS" style={{ background: NAVY, color: GOLD }}>
            {researchIds.map((id) => (
              <option key={id} value={id} style={{ background: NAVY, color: TXT }}>
                {ENGINES[id].label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {disabled && disabledNote && (
        <div
          role="note"
          style={{
            marginTop: 8,
            padding: '8px 10px',
            border: `1px solid ${LINE_HARD}`,
            borderRadius: 8,
            background: 'rgba(200, 169, 110, 0.06)',
            color: GOLD,
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {disabledNote}
        </div>
      )}
      <div style={{ color: SUBTLE, fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
        {engine.blurb}
        <div style={{ marginTop: 4, color: 'rgba(245,241,232,0.4)', fontSize: 10 }}>
          source: {engine.source}
        </div>
        {!engine.validated && (
          <div
            style={{
              marginTop: 4,
              color: 'rgba(245,241,232,0.45)',
              fontSize: 10,
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            Defaults from {engine.source.split('·')[0].trim()}. Founder validation
            in progress — verify against current local quotes for production decisions.
          </div>
        )}
      </div>
    </div>
  );
}
