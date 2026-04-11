'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

const GOLD = '#C8A96E';

type Mode = 'signin' | 'signup';
type Role = 'Owner' | 'Buyer' | 'Broker' | 'Investor' | 'Developer';

export default function AuthPage() {
  const router = useRouter();

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
        // Best-effort: failure here should not block the redirect, the next
        // protected request will surface any real error.
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
        // Immediately sign out so the new account cannot enter the app
        // until an admin flips approved -> true.
        await supabaseBrowser.auth.signOut();
        // Send notification to admin
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
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(200,169,110,0.3)',
    borderRadius: 6,
    color: '#1A1A2E',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#f5f5f5' }}>
      {/* Live ZAAHI map as background */}
      <iframe
        src="/parcels/map"
        title="ZAAHI Platform"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          filter: 'blur(8px) brightness(0.7)',
          transform: 'scale(1.05)',
          pointerEvents: 'none',
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
        {pending && (
          <div style={{
            width: '100%', maxWidth: 400, padding: 40,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid #C8A96E',
            borderRadius: 12,
            boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontSize: 22, color: '#1A1A2E', marginBottom: 12, letterSpacing: 2 }}>REQUEST SUBMITTED</h2>
            <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Thank you for your interest in ZAAHI.<br/>
              Our team will review your application and contact you shortly.
            </p>
            <p style={{ color: '#C8A96E', fontSize: 13 }}>
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
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${GOLD}`,
              borderRadius: 12,
              boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
              color: '#1A1A2E',
              fontFamily: 'system-ui, -apple-system, sans-serif',
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
                  color: '#8892a0',
                  textTransform: 'uppercase',
                }}
              >
                Dubai Real Estate OS
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(200,169,110,0.25)', marginBottom: 22 }}>
              {(['signin', 'signup'] as Mode[]).map((m) => (
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
                    color: mode === m ? GOLD : '#8892a0',
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {m === 'signin' ? 'SIGN IN' : 'SIGN UP'}
                </button>
              ))}
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
                    color: '#c43d3d',
                    background: 'rgba(196,61,61,0.08)',
                    border: '1px solid rgba(196,61,61,0.2)',
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
                  marginTop: 6,
                  padding: '13px',
                  background: GOLD,
                  color: '#1A1A2E',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: busy ? 'wait' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {busy ? '...' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div
              style={{
                marginTop: 24,
                textAlign: 'center',
                fontSize: 11,
                color: '#8892a0',
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
    </div>
  );
}
