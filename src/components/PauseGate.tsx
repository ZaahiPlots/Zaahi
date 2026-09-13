'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, PAUSE_RECHECK_EVENT } from '@/lib/api-fetch';
import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * Subscription-pause gate — sibling of AuthGuard's "not allowed" path
 * (2026-09-13). AuthGuard has already proven a session with
 * user_metadata.approved === true; this component asks
 * /api/me/access-status once and either renders the page or the
 * "subscription paused" screen.
 *
 * - First render holds the page until the probe answers, so a paused
 *   user never sees a flash of dashboard content.
 * - Probe failure (network, 5xx) fails OPEN: the server-side gate in
 *   getApprovedUserId still denies every data call, so nothing leaks;
 *   the user just sees empty panels instead of the pause copy.
 * - apiFetch broadcasts PAUSE_RECHECK_EVENT on any 401, so an account
 *   paused mid-session is cut on its next API call, not on reload.
 * - AuthGuard's redirect logic is untouched; sign-out here goes through
 *   the same supabaseBrowser.auth.signOut() + '/' as everywhere else.
 */
type GateState =
  | { kind: 'checking' }
  | { kind: 'active' }
  | { kind: 'paused'; pausedAt: string | null };

const GOLD = '#C8A96E';

export default function PauseGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'checking' });

  const probe = useCallback(async () => {
    try {
      const res = await apiFetch('/api/me/access-status');
      if (!res.ok) {
        setState((s) => (s.kind === 'checking' ? { kind: 'active' } : s));
        return;
      }
      const body = (await res.json()) as { status?: string; pausedAt?: string | null };
      if (body.status === 'PAUSED') {
        setState({ kind: 'paused', pausedAt: body.pausedAt ?? null });
      } else {
        setState({ kind: 'active' });
      }
    } catch {
      setState((s) => (s.kind === 'checking' ? { kind: 'active' } : s));
    }
  }, []);

  useEffect(() => {
    probe();
    const onAuth401 = () => { probe(); };
    window.addEventListener(PAUSE_RECHECK_EVENT, onAuth401);
    return () => window.removeEventListener(PAUSE_RECHECK_EVENT, onAuth401);
  }, [probe]);

  if (state.kind === 'checking') {
    // Same splash AuthGuard shows while the session resolves.
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: GOLD,
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          letterSpacing: '0.2em',
        }}
      >
        ZAAHI
      </div>
    );
  }

  if (state.kind === 'paused') {
    return <PausedScreen pausedAt={state.pausedAt} />;
  }

  return <>{children}</>;
}

function PausedScreen({ pausedAt }: { pausedAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      router.replace('/');
    }
  }

  const since = pausedAt
    ? new Date(pausedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      role="alert"
      data-testid="subscription-paused"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'linear-gradient(180deg, #0A1628 0%, #050B18 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Same glass card as the auth screens (src/app/page.tsx pending panel). */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 'clamp(20px, 5vw, 40px)',
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          boxShadow: '0 16px 64px rgba(0,0,0,0.4)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: '0.22em',
            marginBottom: 20,
          }}
        >
          ZAAHI
        </div>
        <h2
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 18,
            color: '#FFFFFF',
            marginBottom: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Subscription paused
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
          Your subscription is paused. Contact us at{' '}
          <a href="mailto:dymo@zaahi.io" style={{ color: GOLD, textDecoration: 'none' }}>
            dymo@zaahi.io
          </a>{' '}
          to resume.
        </p>
        {since && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.06em', marginBottom: 24 }}>
            PAUSED SINCE {since.toUpperCase()}
          </p>
        )}
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          style={{
            marginTop: since ? 0 : 16,
            padding: '10px 22px',
            background: 'rgba(255,255,255,0.06)',
            color: GOLD,
            border: '1px solid rgba(200, 169, 110, 0.3)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 150ms ease, border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(200, 169, 110, 0.25)';
            e.currentTarget.style.borderColor = GOLD;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(200, 169, 110, 0.3)';
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
