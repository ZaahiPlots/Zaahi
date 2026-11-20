'use client';

// ZAAHI Feasibility v6.1 — small presentational pieces shared by the saved-
// studies surfaces (StudiesBar, /feasibility/studies, /feasibility/compare).
// Styling follows .claude/rules/ui-style-guide.md: navy glass, gold accent,
// palette colours only, explicit transition properties, no native chrome.

import { useState } from 'react';
import type { VersionHeadline } from '@/lib/feasibility-v6/studyRules';
import { AMBER, DIM, GOLD, LINE, SUBTLE, TXT } from './ui';

export const RED = '#E63946';
export const GREEN = '#2D6A4F';
/** Palette GREEN as a wash — the green itself is too dark to be text on navy. */
export const GREEN_WASH = 'rgba(45, 106, 79, 0.35)';
export const BODY_FONT = "-apple-system, 'Segoe UI', Roboto, sans-serif";
export const SERIF = 'Georgia, serif';

export const glassCard: React.CSSProperties = {
  background: 'rgba(10, 22, 40, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
};

export const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 8,
  padding: '8px 10px',
  color: TXT,
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 150ms ease',
};

export const labelStyle: React.CSSProperties = {
  color: SUBTLE,
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

/** Text input / textarea with the gold focus ring the style guide asks for. */
export function Field({
  value,
  onChange,
  placeholder,
  maxLength,
  multiline,
  ariaLabel,
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  ariaLabel: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [focus, setFocus] = useState(false);
  const style: React.CSSProperties = { ...fieldStyle, borderColor: focus ? GOLD : 'rgba(255, 255, 255, 0.1)' };
  const common = {
    value,
    placeholder,
    maxLength,
    'aria-label': ariaLabel,
    autoFocus,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
  };
  return multiline ? (
    <textarea {...common} rows={2} onChange={(e) => onChange(e.target.value)} style={{ ...style, resize: 'vertical' }} />
  ) : (
    <input
      {...common}
      type="text"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) onEnter();
      }}
      style={style}
    />
  );
}

type BtnTone = 'gold' | 'quiet' | 'danger';

const btnBase: React.CSSProperties = {
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'border-color 150ms ease, background 150ms ease, color 150ms ease, opacity 150ms ease',
};

function btnStyle(tone: BtnTone, hover: boolean, disabled: boolean, small: boolean): React.CSSProperties {
  const accent = tone === 'danger' ? RED : GOLD;
  const quiet = tone === 'quiet';
  return {
    ...btnBase,
    ...(small ? { padding: '4px 8px', fontSize: 10, borderRadius: 6 } : {}),
    background: hover && !disabled ? (tone === 'danger' ? 'rgba(230, 57, 70, 0.18)' : 'rgba(200, 169, 110, 0.25)') : 'rgba(255, 255, 255, 0.06)',
    border: `1px solid ${hover && !disabled ? accent : quiet ? 'rgba(255, 255, 255, 0.1)' : tone === 'danger' ? 'rgba(230, 57, 70, 0.4)' : 'rgba(200, 169, 110, 0.3)'}`,
    color: quiet && !(hover && !disabled) ? DIM : accent,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

/** Button, or a link styled as one when `href` is given. */
export function Btn({
  children,
  onClick,
  href,
  newTab,
  tone = 'gold',
  disabled = false,
  small = false,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  newTab?: boolean;
  tone?: BtnTone;
  disabled?: boolean;
  small?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const [hover, setHover] = useState(false);
  const style = btnStyle(tone, hover, disabled, small);
  const hoverProps = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };
  if (href && !disabled) {
    return (
      <a
        href={href}
        title={title}
        aria-label={ariaLabel}
        style={style}
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...hoverProps}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel} style={style} {...hoverProps}>
      {children}
    </button>
  );
}

/** A check box that does not look like the browser's. */
export function Check({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name — the box itself shows no text. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        padding: 0,
        borderRadius: 4,
        border: `1px solid ${checked ? GOLD : 'rgba(255, 255, 255, 0.25)'}`,
        background: checked ? 'rgba(200, 169, 110, 0.25)' : 'rgba(255, 255, 255, 0.04)',
        color: GOLD,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'border-color 150ms ease, background 150ms ease, opacity 150ms ease',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: checked ? 1 : 0, transition: 'opacity 150ms ease' }}>
        <polyline points="2.5 6.5 5 9 9.5 3.5" />
      </svg>
    </button>
  );
}

type NoticeTone = 'info' | 'warn' | 'error';

/** Inline notice. `warn` is the staleness banner; `error` a failed save. */
export function Notice({ tone = 'info', children }: { tone?: NoticeTone; children: React.ReactNode }) {
  const c = tone === 'error' ? RED : tone === 'warn' ? AMBER : GOLD;
  const bg = tone === 'error' ? 'rgba(230, 57, 70, 0.10)' : tone === 'warn' ? 'rgba(230, 126, 34, 0.10)' : 'rgba(200, 169, 110, 0.08)';
  const br = tone === 'error' ? 'rgba(230, 57, 70, 0.4)' : tone === 'warn' ? 'rgba(230, 126, 34, 0.4)' : 'rgba(200, 169, 110, 0.25)';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        background: bg,
        border: `1px solid ${br}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 8,
        padding: '8px 10px',
        color: TXT,
        fontSize: 11,
        lineHeight: 1.45,
        animation: 'zaahiStudiesFade 200ms ease-in-out',
      }}
    >
      {children}
    </div>
  );
}

/** Keyframes used by the studies surfaces. Render once per surface. */
export function StudiesKeyframes() {
  return <style>{'@keyframes zaahiStudiesFade{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}'}</style>;
}

/** Verdict tone (src/lib/feasibility-v6/verdict.ts) → accent + wash, palette only. */
export function toneColors(tone: string | null | undefined): { accent: string; wash: string } {
  switch (tone) {
    case 'strong':
      return { accent: GREEN, wash: GREEN_WASH };
    case 'moderate':
      return { accent: GOLD, wash: 'rgba(200, 169, 110, 0.18)' };
    case 'weak':
    case 'check':
    case 'indicative':
      return { accent: AMBER, wash: 'rgba(230, 126, 34, 0.18)' };
    default:
      return { accent: 'rgba(255, 255, 255, 0.25)', wash: 'rgba(255, 255, 255, 0.06)' };
  }
}

export function VerdictPill({ label, tone }: { label: string; tone: string | null | undefined }) {
  const c = toneColors(tone);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 999,
        border: `1px solid ${c.accent}`,
        background: c.wash,
        color: TXT,
        fontSize: 10,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label.split(' — ')[0]}
    </span>
  );
}

const pct = (n: number | null): string => (n == null ? '—' : `${n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`);

/** "IRR 22.1% · ROI 31.0% [Strong]" — what a saved version is recognised by. */
export function HeadlineText({ h }: { h: VersionHeadline }) {
  if (h.status !== 'ok') return <span style={{ color: AMBER }}>No result — inputs incomplete</span>;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ color: SUBTLE }}>IRR </span>
      <span style={{ color: TXT, fontWeight: 700 }}>{pct(h.irrPct)}</span>
      <span style={{ color: SUBTLE }}> · ROI </span>
      <span style={{ color: TXT, fontWeight: 700 }}>{pct(h.roiPct)}</span>
      {h.verdictLabel && (
        <>
          {' '}
          <VerdictPill label={h.verdictLabel} tone={h.verdictTone} />
        </>
      )}
    </span>
  );
}

export function fmtTime(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d: Date | string): string {
  return `${fmtDate(d)}, ${fmtTime(d)}`;
}

export const divider = `1px solid ${LINE}`;
