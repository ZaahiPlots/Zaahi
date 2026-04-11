'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * Client-side guard for protected pages.
 *
 * - Reads the Supabase session from localStorage.
 * - If there is no session → redirects to '/'.
 * - If there is a session but user_metadata.approved !== true → signs the user
 *   out and redirects to '/' (admin has not approved them yet).
 *
 * Supabase stores its session in localStorage (see src/lib/supabase-browser.ts),
 * so Next.js middleware cannot see it. This component is the source of truth
 * for "is this user allowed to view a protected page".
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabaseBrowser.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const session = data.session;
      if (!session) {
        router.replace('/');
        return;
      }
      const approved = session.user?.user_metadata?.approved === true;
      if (!approved) {
        await supabaseBrowser.auth.signOut();
        router.replace('/');
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#C8A96E',
          fontFamily: 'Georgia, serif',
          fontSize: 14,
          letterSpacing: '0.2em',
        }}
      >
        ZAAHI
      </div>
    );
  }
  return <>{children}</>;
}
