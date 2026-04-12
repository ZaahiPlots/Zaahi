'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const GOLD = '#C8A96E';

type Mode = 'signin' | 'signup';
type Role = 'Owner' | 'Buyer' | 'Broker' | 'Investor' | 'Developer';

export default function AuthPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('Owner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

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

  // Initialize MapLibre satellite map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          esri: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '© Esri World Imagery',
          },
        },
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        layers: [{ id: 'esri', type: 'raster', source: 'esri' }],
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
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
      } else {
        const { error } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: { data: { name, phone, role, approved: false } },
        });
        if (error) throw error;
        await supabaseBrowser.auth.signOut();
        fetch('/api/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, role }),
        }).catch(() => {});
        (window as any).__zaahiPending = true;
        setPending(true);
        setBusy(false);
        return;
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
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
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
            width: '100%', maxWidth: 400, padding: 40,
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
            <h2 style={{ fontSize: 22, color: '#FFFFFF', marginBottom: 12, letterSpacing: 2 }}>REQUEST SUBMITTED</h2>
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
              padding: 40,
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
              <div
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                Land Intelligence Platform for UAE &amp; Saudi Arabia
              </div>
            </div>

            {/* Sign In only — no tabs needed */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 22, paddingBottom: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 12, letterSpacing: '0.1em', color: GOLD, fontWeight: 600 }}>
                SIGN IN
              </span>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'signup' && (
                <>
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </>
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
              />
              {mode === 'signup' && (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  style={inputStyle}
                >
                  <option value="Owner">Owner</option>
                  <option value="Buyer">Buyer</option>
                  <option value="Broker">Broker</option>
                  <option value="Investor">Investor</option>
                  <option value="Developer">Developer</option>
                </select>
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
                  background: GOLD,
                  color: '#1A1A2E',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {busy ? '...' : 'SIGN IN'}
              </button>
            </form>

            <div
              style={{
                marginTop: 24,
                textAlign: 'center',
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.6,
              }}
            >
              By continuing you agree to{' '}
              <a href="/terms" style={{ color: GOLD, textDecoration: 'none' }}>
                Terms of Service
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
