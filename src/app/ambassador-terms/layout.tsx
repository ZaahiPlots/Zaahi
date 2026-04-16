import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ambassador Agreement — ZAAHI Real Estate OS',
  description: 'Ambassador Program terms — commission structure, payouts, conduct, and termination rules for ZAAHI ambassadors.',
};

export default function AmbassadorTermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
