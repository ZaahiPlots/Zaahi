'use client';

// ZAAHI Feasibility v6.0 — General Notes visual block (B2 2026-06-06).
//
// Hybrid presentation per founder direction:
//   • Parking provision  → table of Dubai Municipality regulations
//   • Required NOCs      → checklist derived from landUseMix + district keywords
//   • Design & reference → callout pulling design-theme hints from the DDA notes
//   • Toggle             → reveal the full raw DDA notes string
//
// All three blocks are visual + skim-friendly so brokers actually read them,
// instead of a wall of plain DDA text.

import { useState } from 'react';

const GOLD = '#C8A96E';
const TXT = '#f5f1e8';
const DIM = 'rgba(245, 241, 232, 0.70)';
const SUBTLE = 'rgba(245, 241, 232, 0.55)';
const LINE = 'rgba(200, 169, 110, 0.15)';
const LINE_HARD = 'rgba(200, 169, 110, 0.30)';

export interface NocItem {
  label: string;
  reason: string;
}

// Generate NOC checklist from landUseMix + district / community keywords.
// Pure function so callers can reuse for PDF if needed.
export function deriveNocs(
  landUseMix: Array<{ category?: string; sub?: string }>,
  district: string,
  community: string | null,
): NocItem[] {
  const items: NocItem[] = [
    { label: 'Dubai Civil Defence', reason: 'Fire safety design pre-approval — all new builds.' },
    { label: 'DEWA', reason: 'Utility connections for electricity + water.' },
    { label: 'Etisalat / du', reason: 'Telecoms infrastructure NOC.' },
  ];

  const locText = `${district} ${community ?? ''}`.toLowerCase();
  const isCoastal = /waterfront|beach|coast|marina|palm|harbour|harbor|island/.test(locText);
  const isAirportPath = /jadaf|jaddaf|garhoud|deira|qusais|airport|al jadaf/.test(locText);

  if (isCoastal) {
    items.push({
      label: 'Coastal Zone authority',
      reason: 'Plot is in a coastal / waterfront zone — environmental + shoreline NOC required.',
    });
  }
  if (isAirportPath) {
    items.push({
      label: 'General Civil Aviation Authority',
      reason: 'Plot sits within an airport approach / height-controlled zone.',
    });
  }

  for (const m of landUseMix ?? []) {
    const cat = (m?.category ?? '').toUpperCase();
    if (cat.includes('HEALTH') && !items.find((i) => i.label === 'DHA / DHCC')) {
      items.push({
        label: 'DHA / DHCC',
        reason: 'Healthcare facility licensing approval.',
      });
    }
    if (cat.includes('EDUCATION') && !items.find((i) => i.label === 'KHDA')) {
      items.push({
        label: 'KHDA',
        reason: 'Education provider licence approval.',
      });
    }
    if (cat.includes('HOTEL') || cat.includes('HOSPITALITY')) {
      if (!items.find((i) => i.label === 'Department of Economy & Tourism')) {
        items.push({
          label: 'Department of Economy & Tourism',
          reason: 'Hotel / hospitality classification + operator licensing.',
        });
      }
    }
  }

  return items;
}

interface ParkingRow {
  type: string;
  ratio: string;
}

// Standard Dubai Municipality parking provision — captures the founder's
// four headline rules. Exposed as data so PDF can reuse identical text.
export const DUBAI_PARKING_RULES: ParkingRow[] = [
  { type: 'Residential unit ≤ 150 m²', ratio: '1 bay per unit' },
  { type: 'Residential unit > 150 m²', ratio: '2 bays per unit' },
  { type: 'Retail GFA', ratio: '1 bay per 70 m²' },
  { type: 'Office GFA', ratio: '1 bay per 50 m²' },
];

// Pull a candidate "design theme" hint from the rewritten DDA notes.
// We look for phrases like "Jaddaf Waterfront theme", "Madinat Jumeirah
// theme", or sentences beginning with "Design" / "Theme:". If nothing
// surfaces, we return null and the callout is hidden.
export function deriveDesignTheme(notes: string | null): string | null {
  if (!notes) return null;
  const t = notes;
  const themeMatch = t.match(/([A-Z][\w\s]+?)\s+(?:theme|architectural\s+theme|design\s+theme)/i);
  if (themeMatch) return themeMatch[0].trim();
  const designLine = t
    .split(/[\.\n]/)
    .map((s) => s.trim())
    .find((s) => /design|theme|reference/i.test(s) && s.length < 220);
  return designLine ?? null;
}

export interface GeneralNotesProps {
  landUseMix: Array<{ category: string; sub?: string }>;
  district: string;
  community: string | null;
  notes: string | null;
}

export default function GeneralNotes({
  landUseMix,
  district,
  community,
  notes,
}: GeneralNotesProps) {
  const [showFull, setShowFull] = useState(false);
  const nocs = deriveNocs(landUseMix, district, community);
  const designTheme = deriveDesignTheme(notes);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Parking provision table ──────────────────────────────────── */}
      <section>
        <h3
          style={{
            color: GOLD,
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 6px 0',
            paddingBottom: 4,
            borderBottom: `1px solid ${LINE_HARD}`,
          }}
        >
          Parking provision
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${LINE}` }}>
              <th style={cellHead}>Use</th>
              <th style={{ ...cellHead, textAlign: 'right' }}>Required bays</th>
            </tr>
          </thead>
          <tbody>
            {DUBAI_PARKING_RULES.map((r) => (
              <tr key={r.type} style={{ borderBottom: `1px solid ${LINE}` }}>
                <td style={cellBody}>{r.type}</td>
                <td style={{ ...cellBody, textAlign: 'right', color: TXT, fontWeight: 600 }}>
                  {r.ratio}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ color: SUBTLE, fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
          Source: Dubai Municipality parking provision regulations (standard for new builds).
        </div>
      </section>

      {/* ── Required NOC checklist ───────────────────────────────────── */}
      <section>
        <h3
          style={{
            color: GOLD,
            fontFamily: 'Georgia, serif',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 6px 0',
            paddingBottom: 4,
            borderBottom: `1px solid ${LINE_HARD}`,
          }}
        >
          Required NOCs
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nocs.map((n) => (
            <li
              key={n.label}
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11, lineHeight: 1.45 }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  border: `1.5px solid ${GOLD}`,
                  borderRadius: 3,
                  flexShrink: 0,
                  marginTop: 1,
                  position: 'relative',
                }}
              />
              <div>
                <div style={{ color: TXT, fontWeight: 600 }}>{n.label}</div>
                <div style={{ color: DIM }}>{n.reason}</div>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ color: SUBTLE, fontSize: 10, marginTop: 6, fontStyle: 'italic' }}>
          Indicative — confirm with DDA / master developer per actual plot guidelines.
        </div>
      </section>

      {/* ── Design & reference callout ───────────────────────────────── */}
      {designTheme && (
        <section>
          <h3
            style={{
              color: GOLD,
              fontFamily: 'Georgia, serif',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 6px 0',
              paddingBottom: 4,
              borderBottom: `1px solid ${LINE_HARD}`,
            }}
          >
            Design & reference
          </h3>
          <div
            style={{
              borderLeft: `3px solid ${GOLD}`,
              paddingLeft: 12,
              color: TXT,
              fontSize: 12,
              lineHeight: 1.55,
              fontStyle: 'italic',
              background: 'rgba(200, 169, 110, 0.06)',
              padding: '10px 12px',
              borderRadius: 4,
            }}
          >
            {designTheme}
            <div style={{ color: DIM, fontSize: 10, marginTop: 6, fontStyle: 'normal' }}>
              Read together with the plot guidelines PDF in Documents.
            </div>
          </div>
        </section>
      )}

      {/* ── Toggle full raw DDA notes ────────────────────────────────── */}
      {notes && notes.trim() && (
        <section>
          <button
            type="button"
            onClick={() => setShowFull((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: GOLD,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            {showFull ? '← hide full notes' : 'Show full DDA notes →'}
          </button>
          {showFull && (
            <div
              style={{
                marginTop: 8,
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${LINE}`,
                borderRadius: 6,
                padding: '10px 12px',
                fontSize: 11,
                color: DIM,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {notes.trim()}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const cellHead: React.CSSProperties = {
  color: DIM,
  fontSize: 9,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  padding: '6px 4px',
  textAlign: 'left',
  fontWeight: 700,
};
const cellBody: React.CSSProperties = {
  color: DIM,
  fontSize: 11,
  padding: '6px 4px',
};
