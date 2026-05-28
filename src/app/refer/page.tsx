'use client';

// Ambassador / Referral landing — placeholder Coming Soon screen until
// the real referral funnel lands (Phase 2). The /join URL permanently
// 308s here (next.config.ts), and WelcomeTour points here too. Until
// the program ships we still want a friendly destination instead of a
// raw 404 — this page is that destination.

import Link from 'next/link';
import LegalNavbar from '@/components/LegalNavbar';
import Footer from '@/components/Footer';

const GOLD = '#C8A96E';
// Tokens unified against login reference (src/app/page.tsx).
const BG = 'linear-gradient(180deg, #0A1628 0%, #050B18 100%)';
const TEXT = '#FFFFFF';
const TEXT_DIM = 'rgba(255,255,255,0.5)';

export default function ReferPage() {
  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
      <LegalNavbar />

      <main
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '96px 24px 48px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            border: `1px solid ${GOLD}`,
            borderRadius: 4,
            fontSize: 10,
            letterSpacing: '0.14em',
            color: GOLD,
            background: 'rgba(200, 169, 110, 0.12)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Coming Soon
        </span>

        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 20px',
            lineHeight: 1.15,
          }}
        >
          Ambassador Program
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: TEXT_DIM,
            margin: '0 0 12px',
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Invite brokers and investors. Earn{' '}
          <span style={{ color: GOLD, fontWeight: 700 }}>20%</span> from every closed deal
          commission.
        </p>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: TEXT_DIM,
            margin: '0 0 40px',
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          The full referral flow — personal link, dashboard, payout schedule — is in
          development. Sign up to the platform now and you&apos;ll be ready the moment
          the program opens.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/parcels/map"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: 8,
              border: `1px solid ${GOLD}`,
              background: GOLD,
              color: '#0A1628',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'background 150ms ease, transform 150ms ease',
            }}
          >
            Open the map
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid rgba(200, 169, 110, 0.3)',
              background: 'rgba(10, 22, 40, 0.4)',
              color: GOLD,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'border-color 150ms ease, background 150ms ease',
            }}
          >
            My dashboard
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
