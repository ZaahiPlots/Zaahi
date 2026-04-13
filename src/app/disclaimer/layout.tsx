import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investment Disclaimer — ZAAHI Real Estate OS',
  description: 'Investment Disclaimer for ZAAHI Real Estate OS. Not financial or investment advice.',
};

export default function DisclaimerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
