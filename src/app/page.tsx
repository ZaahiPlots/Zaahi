'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabaseBrowser } from '@/lib/supabase-browser';

const GOLD = '#C8A96E';

type Mode = 'login' | 'register';
type Role = 'Owner' | 'Buyer' | 'Broker' | 'Investor' | 'Developer';

export default function AuthPage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('Owner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Background map (blurred)
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
          },
        },
        layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
      },
      center: [55.27, 25.2],
      zoom: 12,
      pitch: 45,
      bearing: -17,
      interactive: false,
      attributionControl: false,
    });
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
      if (mode === 'login') {
        const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: { data: { name, phone, role } },
        });
        if (error) throw error;
      }
      router.push('/parcels/map');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(10,22,40,0.4)',
    border: `1px solid ${GOLD}33`,
    borderRadius: 6,
    color: '#E8E0D0',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0A1628' }}>
      {/* Blurred map background */}
      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'blur(8px) brightness(0.7)',
          transform: 'scale(1.05)',
        }}
      />

      {/* Centered auth card */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '32px 28px',
            background: 'rgba(10, 22, 40, 0.78)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${GOLD}`,
            borderRadius: 12,
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            color: '#E8E0D0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 36,
                fontWeight: 300,
                letterSpacing: '0.15em',
                color: GOLD,
                lineHeight: 1,
              }}
            >
              ZAAHI
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                letterSpacing: '0.25em',
                color: '#7a8a9c',
                textTransform: 'uppercase',
              }}
            >
              Sovereign Real Estate Infrastructure
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${GOLD}33`,
              marginBottom: 20,
            }}
          >
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === m ? `2px solid ${GOLD}` : '2px solid transparent',
                  color: mode === m ? GOLD : '#7a8a9c',
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {m === 'login' ? 'ВОЙТИ' : 'РЕГИСТРАЦИЯ'}
              </button>
            ))}
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
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
            {mode === 'register' && (
              <>
                <input
                  type="text"
                  placeholder="Имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={inputStyle}
                />
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
              </>
            )}

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: '#ff8a8a',
                  background: 'rgba(255,80,80,0.1)',
                  border: '1px solid rgba(255,80,80,0.3)',
                  borderRadius: 6,
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
                marginTop: 4,
                padding: '12px',
                background: GOLD,
                color: '#0A1628',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.1em',
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {busy ? '...' : mode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ'}
            </button>
          </form>

          <div
            style={{
              marginTop: 20,
              textAlign: 'center',
              fontSize: 10,
              color: '#7a8a9c',
              letterSpacing: '0.05em',
            }}
          >
            <a href="/terms" style={{ color: GOLD, textDecoration: 'none' }}>
              Пользовательское соглашение
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
