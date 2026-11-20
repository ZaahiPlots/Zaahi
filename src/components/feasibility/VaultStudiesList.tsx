'use client';

// ZAAHI Feasibility v6.1 — the saved studies attached to a vault entry, as
// the vault lists them (expanded /vault row and the map side panel).
//
// Read-only: name, latest version, last change. Opening / comparing happens
// in the calculator's Studies bar; this is the "there are studies here" cue.
// Renders nothing when there are none, or when v6 is switched off.

import { IS_FEASIBILITY_V6_ENABLED } from '@/lib/feasibility-v6/featureFlag';
import type { VaultStudyRefDto } from '@/lib/feasibility-v6/studyRules';

const GOLD = '#C8A96E';
const TEXT_PRIMARY = 'rgba(255, 255, 255, 0.92)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.55)';

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function VaultStudiesList({
  studies,
  owner,
}: {
  studies: VaultStudyRefDto[] | undefined;
  /** False for a share recipient: no link to their own "My studies" page here. */
  owner: boolean;
}) {
  if (!IS_FEASIBILITY_V6_ENABLED || !studies || studies.length === 0) return null;
  return (
    <div data-testid="vault-studies">
      {studies.map((s) => (
        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginTop: 3 }}>
          <span style={{ color: TEXT_PRIMARY, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
          <span style={{ color: TEXT_DIM, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {s.latestVersion > 0 ? <span style={{ color: GOLD }}>v{s.latestVersion}</span> : 'draft'} · {day(s.updatedAt)}
          </span>
        </div>
      ))}
      <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
        {owner ? 'Open or compare them from the Feasibility Calculator for this plot, or in ' : 'Shared with you, read-only. Open them from the Feasibility Calculator for this plot.'}
        {owner && (
          <a href="/feasibility/studies" style={{ color: GOLD, textDecoration: 'none', borderBottom: '1px solid rgba(200, 169, 110, 0.3)' }}>
            My studies
          </a>
        )}
        {owner && '.'}
      </div>
    </div>
  );
}
