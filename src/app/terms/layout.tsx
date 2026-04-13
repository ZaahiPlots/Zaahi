import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — ZAAHI Real Estate OS',
  description: 'Terms of Service for ZAAHI Real Estate OS, land intelligence platform for UAE & Saudi Arabia.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
