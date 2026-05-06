'use client';

// ZAAHI Feasibility v6 — fullscreen toggle button.
//
// Ghost button that flips into the gold primary CTA when fullscreen is active.
// Same toggle pattern as the existing 2D / 3D switch on /parcels/map. The
// actual layout response (collapsed padding, expanded grid columns) is the
// parent calculator's concern; this component is purely presentational +
// emits the on/off boolean.
//
// Sprint 7 will extend this to optionally call `requestFullscreen()` on the
// browser-native API for true OS-level fullscreen during client meetings.
// Sprint 0 keeps it as a CSS-only state toggle.

const GOLD = '#C8A96E';
const DIM = 'rgba(245, 241, 232, 0.70)';
const LINE_HARD = 'rgba(200, 169, 110, 0.30)';

export interface FullscreenToggleProps {
  active: boolean;
  onToggle: () => void;
}

export default function FullscreenToggle({ active, onToggle }: FullscreenToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      style={{
        background: active ? 'rgba(200,169,110,0.18)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${active ? GOLD : LINE_HARD}`,
        color: active ? GOLD : DIM,
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
    >
      {active ? 'Exit fullscreen' : 'Fullscreen'}
    </button>
  );
}
