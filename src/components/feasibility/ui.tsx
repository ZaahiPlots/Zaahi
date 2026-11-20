'use client';

// ZAAHI Feasibility v6 — shared presentational pieces for the calculator.
// Moved verbatim out of FeasibilityV6Calculator.tsx (2026-11-20) so the
// calculator file holds layout and wiring only.

import { useState, useEffect, useRef } from 'react';
import { fmtInputNumber, parseNumberInput } from '@/lib/feasibility';
import FieldLabel from './FieldLabel';
// imported in production. Sprint 7 fullscreen-route work was dropped per
// founder-corrected plan (2026-05-06). Reintroduce when v6 visual surface
// includes a viewport-overlay mode that doesn't conflict with SidePanel.

// ── Palette (CLAUDE.md UI STYLE GUIDE) ───────────────────────────────
export const GOLD = '#C8A96E';
export const NAVY = '#1A1A2E';
export const TXT = '#f5f1e8';
export const DIM = 'rgba(245, 241, 232, 0.70)';
export const SUBTLE = 'rgba(245, 241, 232, 0.55)';
export const LINE = 'rgba(200, 169, 110, 0.15)';
export const LINE_HARD = 'rgba(200, 169, 110, 0.30)';
export const AMBER = '#E67E22';


// ── Debounce hook ────────────────────────────────────────────────────
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// FieldLabel + DiffBadge are now standalone components in src/components/feasibility/
// (extracted in Sprint 0 of v6 implementation). Tooltip lookup is internal to
// FieldLabel; diffTone live in src/lib/feasibility-v6/diffBadge.ts.

// ── NumberInput (mirrors v5 pattern, glass styling) ──────────────────
// `fullWidth` makes the input stretch to its container (used in sidepanel
// stacked-Row mode so unit suffixes like "AED/sqft" never truncate).
export function NumberInput({
  value,
  onChange,
  unit,
  readonly,
  widthPx,
  fullWidth,
  ariaLabel,
}: {
  value: number;
  onChange?: (n: number) => void;
  unit?: string;
  readonly?: boolean;
  widthPx?: number;
  fullWidth?: boolean;
  /** Accessible name — the visible label sits in a sibling element. */
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState<string>(fmtInputNumber(value));
  const lastExternal = useRef(value);
  useEffect(() => {
    if (!focused && lastExternal.current !== value) {
      setRaw(fmtInputNumber(value));
      lastExternal.current = value;
    }
  }, [value, focused]);

  return (
    <div
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: readonly ? 'transparent' : 'rgba(255,255,255,0.04)',
        border: readonly ? '1px solid transparent' : `1px solid ${LINE}`,
        borderRadius: 8,
        transition: 'border-color 150ms ease, background 150ms ease',
        width: fullWidth ? '100%' : undefined,
        minWidth: fullWidth ? undefined : (widthPx ?? 130),
      }}
    >
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        readOnly={readonly}
        value={focused ? raw : fmtInputNumber(value)}
        onFocus={(e) => {
          setFocused(true);
          setRaw(String(value));
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          onChange?.(parseNumberInput(raw));
        }}
        onChange={(e) => {
          const s = e.target.value;
          setRaw(s);
          if (onChange) onChange(parseNumberInput(s));
        }}
        style={{
          flex: 1,
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: readonly ? DIM : TXT,
          fontFamily: 'inherit',
          fontSize: 13,
          textAlign: 'right',
          padding: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      />
      {unit && (
        <span
          style={{
            color: SUBTLE,
            fontSize: 10,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────
// `stacked` mode (sidepanel) places label on top and the input below it,
// preventing unit truncation in narrow ~350-px containers (founder fix #3).
// Inline mode (fullscreen) keeps label-left / input-right.
export function Row({
  label,
  tooltipKey,
  badge,
  children,
  stacked,
}: {
  label: string;
  tooltipKey?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '8px 0',
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FieldLabel label={label} tooltipKey={tooltipKey} />
          {badge}
        </div>
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '7px 0',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <FieldLabel label={label} tooltipKey={tooltipKey} />
        {badge}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── ResultRow ────────────────────────────────────────────────────────
export function ResultRow({
  label,
  value,
  hero,
  bold,
  gold,
}: {
  label: string;
  value: string;
  hero?: boolean;
  bold?: boolean;
  gold?: boolean;
}) {
  const size = hero ? 24 : bold ? 14 : 12;
  const weight = hero ? 800 : bold ? 700 : 400;
  const color = gold ? GOLD : TXT;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
        gap: 10,
      }}
    >
      <span
        style={{
          color: DIM,
          fontSize: hero ? 11 : 11,
          letterSpacing: hero ? 0.5 : 0.2,
          textTransform: hero ? 'uppercase' : 'none',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color,
          fontSize: size,
          fontWeight: weight,
          letterSpacing: hero ? '-0.02em' : 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────────────
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: GOLD,
        fontFamily: 'Georgia, serif',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginTop: 16,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottom: `1px solid ${LINE_HARD}`,
      }}
    >
      {children}
    </div>
  );
}

// ── Engine selector disclosure ───────────────────────────────────────
// Hides the full selector behind one click — the current engine label
// stays visible so the user always knows what's driving defaults, but
// the dropdown only shows when explicitly opened. Saves ~80 px of header
// real estate above the panels (founder scroll-reduction 2026-06-08).
export function EngineSelectorDisclosure({
  currentLabel,
  currentValidated,
  children,
  inert = false,
}: {
  currentLabel: string;
  currentValidated: boolean;
  children: React.ReactNode;
  /** The engine cannot be changed here (mixed-use plot, D-18). The
   *  disclosure still opens — the explanation is what is inside it — but the
   *  affordance says "why" rather than "change". */
  inert?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${LINE}`,
          borderRadius: 8,
          padding: '8px 10px',
          color: TXT,
          fontFamily: 'inherit',
          fontSize: 11,
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>
          <span style={{ color: SUBTLE, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Engine{' '}
          </span>
          <span style={{ color: GOLD, fontWeight: 700 }}>{currentLabel}</span>
          {!currentValidated && (
            <span style={{ color: SUBTLE, fontSize: 9, marginLeft: 6, fontStyle: 'italic' }}>
              research-default
            </span>
          )}
        </span>
        <span style={{ color: SUBTLE, fontSize: 11 }}>
          {open ? '▾ close' : inert ? '▸ why' : '▸ change'}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Collapsible Panel (sidepanel-mode at-a-glance hierarchy) ─────────
// Founder fix #5: each panel header shows a primary metric inline so the
// broker sees BUA / Land Cost / Construction total / Revenue total without
// expanding. Default closed in sidepanel; default open in fullscreen.
export function Panel({
  title,
  metric,
  defaultOpen,
  changed,
  children,
}: {
  title: string;
  metric?: string;
  defaultOpen?: boolean;
  // True when user has overridden a default value inside this panel — header
  // shows a small gold dot next to the chevron. Founder Sprint 1.6 spec.
  changed?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div
      style={{
        // Same measurement as the verdict block above — a panel floating over
        // the light basemap needs an opaque-enough ground for its own text.
        background: 'rgba(10, 22, 40, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 150ms ease',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: TXT,
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              color: GOLD,
              fontFamily: 'Georgia, serif',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
          {metric && (
            <span
              style={{
                color: SUBTLE,
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              · {metric}
            </span>
          )}
          {changed && (
            <span
              aria-label="modified"
              title="You have overridden defaults inside this panel"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: GOLD,
                flexShrink: 0,
              }}
            />
          )}
        </span>
        <span style={{ color: SUBTLE, fontSize: 11, transition: 'transform 150ms ease', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px 14px', borderTop: `1px solid ${LINE}` }}>
          {children}
        </div>
      )}
    </div>
  );
}
