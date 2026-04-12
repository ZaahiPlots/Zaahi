'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#C8A96E';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('zaahi_cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('zaahi_cookie_consent', 'accepted');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '14px 24px',
        background: 'rgba(10, 15, 30, 0.95)',
        borderTop: `1px solid ${GOLD}33`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
      }}
    >
      <span>
        We use cookies to improve your experience.{' '}
        <Link href="/privacy" style={{ color: GOLD, textDecoration: 'none' }}>
          Learn more
        </Link>
      </span>
      <button
        onClick={accept}
        style={{
          padding: '6px 20px',
          background: GOLD,
          color: '#1A1A2E',
          border: 'none',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        ACCEPT
      </button>
    </div>
  );
}
