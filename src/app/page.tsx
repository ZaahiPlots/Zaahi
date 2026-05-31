'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const GOLD = '#C8A96E';

export default function AuthPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  // Forgot-password flow uses Supabase's built-in resetPasswordForEmail.
  // This is a SEPARATE auth method from signInWithPassword — the existing
  // sign-in flow is untouched (per CLAUDE.md SECURITY rule).
  const [resetMessage, setResetMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  // Auto-redirect if already signed in AND admin-approved.
  useEffect(() => {
    let cancelled = false;
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const approved = data.session?.user?.user_metadata?.approved === true;
      if (data.session && approved && !(window as any).__zaahiPending) {
        router.replace('/parcels/map');
      } else {
        setCheckingSession(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Initialize MapLibre — CARTO Positron (light_all). Unified basemap
  // across the whole platform per founder style audit 2026-05-23. The
  // login page used to render Esri satellite; we now match the rest
  // of the product so the visual transition into /parcels/map is
  // seamless (no abrupt basemap switch on sign-in).
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© CARTO © OpenStreetMap contributors',
          },
        },
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
      },
      center: [55.27, 25.20], // Dubai center
      zoom: 12,
      pitch: 45,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  async function onForgotPassword() {
    setResetMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setResetMessage({ kind: 'error', text: 'Enter your email first' });
      return;
    }
    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) {
        setResetMessage({ kind: 'error', text: error.message });
        return;
      }
      setResetMessage({ kind: 'info', text: 'Check your email for the reset link.' });
    } catch (err) {
      setResetMessage({ kind: 'error', text: (err as Error).message });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const approved = data.user?.user_metadata?.approved === true;
      if (!approved) {
        await supabaseBrowser.auth.signOut();
        (window as any).__zaahiPending = true;
        setPending(true);
        setBusy(false);
        return;
      }
      // Approved user — make sure a matching Prisma User row exists.
      const meta = data.user?.user_metadata ?? {};
      const token = data.session?.access_token;
      if (token && meta.role && meta.name) {
        fetch('/api/users/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: meta.role, name: meta.name, phone: meta.phone }),
        }).catch(() => {});
      }
      router.replace('/parcels/map');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {/* Layer 1 — Live satellite map (interactive) */}
      <div
        ref={mapContainer}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      />

      {/* Layer 2 — Full-screen blur overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(10, 15, 30, 0.35)',
          pointerEvents: 'none',
        }}
      />

      {/* Layer 3 — Auth card */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {pending && (
          <div style={{
            width: '100%', maxWidth: 400, padding: 'clamp(20px, 5vw, 40px)',
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            boxShadow: '0 16px 64px rgba(0,0,0,0.4)',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'auto',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22, color: '#FFFFFF', marginBottom: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>REQUEST SUBMITTED</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Thank you for your interest in ZAAHI.<br/>
              Our team will review your application and contact you shortly.
            </p>
            <p style={{ color: GOLD, fontSize: 13 }}>
              You will receive an email once your account is approved.
            </p>
          </div>
        )}
        {!checkingSession && !pending && (
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              padding: 'clamp(20px, 5vw, 40px)',
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 16,
              boxShadow: '0 16px 64px rgba(0,0,0,0.4)',
              color: '#FFFFFF',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              pointerEvents: 'auto',
            }}
          >
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 44,
                  fontWeight: 300,
                  letterSpacing: '0.18em',
                  color: GOLD,
                  lineHeight: 1,
                }}
              >
                ZAAHI
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                }}
              >
                Real Estate OS
              </div>
            </div>

            {/* Sign In only — no tabs needed */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 22, paddingBottom: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 12, letterSpacing: '0.1em', color: GOLD, fontWeight: 600 }}>
                SIGN IN
              </span>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 10,
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    // eye-off SVG
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A10.05 10.05 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // eye SVG
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: GOLD,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {resetMessage && (
                <div
                  style={{
                    fontSize: 12,
                    color: resetMessage.kind === 'error' ? '#ff6b6b' : GOLD,
                    background: resetMessage.kind === 'error'
                      ? 'rgba(255,107,107,0.1)'
                      : 'rgba(200,169,110,0.12)',
                    border: `1px solid ${
                      resetMessage.kind === 'error'
                        ? 'rgba(255,107,107,0.25)'
                        : 'rgba(200,169,110,0.3)'
                    }`,
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  {resetMessage.text}
                </div>
              )}

              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#ff6b6b',
                    background: 'rgba(255,107,107,0.1)',
                    border: '1px solid rgba(255,107,107,0.25)',
                    borderRadius: 8,
                    padding: '8px 10px',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: 6,
                  padding: '13px',
                  background: 'rgba(200, 169, 110, 0.9)',
                  color: '#1A1A2E',
                  border: `1px solid ${GOLD}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!busy) e.currentTarget.style.background = 'rgba(200, 169, 110, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(200, 169, 110, 0.9)';
                }}
              >
                {busy ? '...' : 'SIGN IN'}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                textAlign: 'center',
                fontSize: 12,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'inherit',
              }}
            >
              New to ZAAHI?{' '}
              <a
                href="/register"
                onClick={(e) => { e.preventDefault(); router.push('/register'); }}
                style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}
              >
                REGISTER →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 24px',
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'auto',
        }}
      >
        <span>&copy; 2026 ZAAHI Real Estate OS. All rights reserved.</span>
        <span>|</span>
        <a href="/terms" style={{ color: GOLD, textDecoration: 'none' }}>Terms</a>
        <span>|</span>
        <a href="/privacy" style={{ color: GOLD, textDecoration: 'none' }}>Privacy</a>
        <span>|</span>
        <a href="/disclaimer" style={{ color: GOLD, textDecoration: 'none' }}>Disclaimer</a>
      </div>
    </div>
  );
}
