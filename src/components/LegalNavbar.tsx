'use client';

import Link from 'next/link';

const GOLD = '#C8A96E';

export default function LegalNavbar() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        background: 'rgba(10, 15, 30, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid rgba(200, 169, 110, 0.15)`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Link
        href="/"
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: 3,
          }}
        >
          ZAAHI
        </span>
      </Link>

      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 500,
          color: GOLD,
          textDecoration: 'none',
          border: `1px solid rgba(200, 169, 110, 0.3)`,
          borderRadius: 6,
          transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(200, 169, 110, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(200, 169, 110, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(200, 169, 110, 0.3)';
        }}
      >
        <span style={{ fontSize: 14 }}>&larr;</span>
        <span>Back to ZAAHI</span>
      </Link>
    </nav>
  );
}
