'use client';

import Link from 'next/link';

const GOLD = '#C8A96E';

export default function Footer() {
  return (
    <footer
      style={{
        width: '100%',
        padding: '20px 24px',
        background: 'rgba(10, 15, 30, 0.9)',
        borderTop: '1px solid rgba(200, 169, 110, 0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        zIndex: 50,
      }}
    >
      <span>&copy; 2026 ZAAHI Real Estate OS. All rights reserved.</span>
      <span style={{ margin: '0 4px' }}>|</span>
      <Link href="/terms" style={{ color: GOLD, textDecoration: 'none' }}>
        Terms
      </Link>
      <span style={{ margin: '0 2px' }}>|</span>
      <Link href="/privacy" style={{ color: GOLD, textDecoration: 'none' }}>
        Privacy
      </Link>
      <span style={{ margin: '0 2px' }}>|</span>
      <Link href="/disclaimer" style={{ color: GOLD, textDecoration: 'none' }}>
        Disclaimer
      </Link>
    </footer>
  );
}
