import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — ZAAHI',
};

const GOLD = '#C8A96E';

const sectionTitle: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 22,
  color: GOLD,
  marginTop: 40,
  marginBottom: 12,
};

const paragraph: React.CSSProperties = {
  color: 'rgba(255,255,255,0.75)',
  fontSize: 14,
  lineHeight: 1.8,
  marginBottom: 16,
};

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E', padding: '60px 20px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 36,
            color: GOLD,
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Terms of Service
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 40 }}>
          Effective Date: April 12, 2026
        </p>

        <h2 style={sectionTitle}>1. Acceptance of Terms</h2>
        <p style={paragraph}>
          By accessing or using ZAAHI Real Estate OS (&quot;Platform&quot;), available at zaahi.io, you agree to be bound by
          these Terms of Service. If you do not agree, you must not use the Platform.
        </p>

        <h2 style={sectionTitle}>2. Platform Description</h2>
        <p style={paragraph}>
          ZAAHI provides a land intelligence platform covering the United Arab Emirates and Saudi Arabia. The
          Platform aggregates publicly available data from sources including the Dubai Development Authority (DDA),
          Dubai Land Department (DLD), and MyLand Abu Dhabi to offer information on land parcels, zoning, feasibility
          analysis, and market intelligence.
        </p>

        <h2 style={sectionTitle}>3. Use License</h2>
        <p style={paragraph}>
          ZAAHI grants you a limited, non-exclusive, non-transferable, revocable license to access and use the
          Platform for your personal or internal business purposes, subject to these Terms. You may not copy,
          modify, distribute, sell, or lease any part of the Platform or its data without prior written consent.
        </p>

        <h2 style={sectionTitle}>4. User Accounts</h2>
        <p style={paragraph}>
          Access to the Platform requires registration and approval. You are responsible for maintaining the
          confidentiality of your account credentials and for all activity under your account. You must provide
          accurate information during registration.
        </p>

        <h2 style={sectionTitle}>5. Disclaimers</h2>
        <p style={paragraph}>
          The Platform is provided &quot;as is&quot; and &quot;as available.&quot; ZAAHI does not guarantee the accuracy,
          completeness, or timeliness of any data displayed. Information on the Platform does not constitute
          investment, financial, legal, or tax advice. Users should consult licensed professionals before making
          investment decisions.
        </p>

        <h2 style={sectionTitle}>6. Limitation of Liability</h2>
        <p style={paragraph}>
          To the maximum extent permitted by applicable law, ZAAHI and its founders, officers, employees, and
          agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
          including but not limited to loss of profits, data, or business opportunities, arising from your use of
          the Platform. In no event shall ZAAHI&apos;s total liability exceed the amount you paid to ZAAHI in the
          twelve (12) months preceding the claim.
        </p>

        <h2 style={sectionTitle}>7. Assumption of Risk</h2>
        <p style={paragraph}>
          You acknowledge that real estate investment involves substantial risk. All feasibility calculations,
          IRR/NPV estimates, and market data presented on the Platform are for informational purposes only. You
          accept full responsibility for any decisions made based on information obtained through the Platform.
        </p>

        <h2 style={sectionTitle}>8. Intellectual Property</h2>
        <p style={paragraph}>
          All content, features, and functionality of the Platform — including but not limited to text, graphics,
          logos, 3D models, algorithms, and software — are owned by ZAAHI and are protected by intellectual
          property laws.
        </p>

        <h2 style={sectionTitle}>9. Termination</h2>
        <p style={paragraph}>
          ZAAHI reserves the right to suspend or terminate your access to the Platform at any time, with or
          without cause, and with or without notice. Upon termination, your right to use the Platform ceases
          immediately.
        </p>

        <h2 style={sectionTitle}>10. Governing Law</h2>
        <p style={paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates.
          Any disputes arising from or relating to these Terms or the Platform shall be subject to the exclusive
          jurisdiction of the Dubai International Financial Centre (DIFC) Courts.
        </p>

        <h2 style={sectionTitle}>11. Changes to Terms</h2>
        <p style={paragraph}>
          ZAAHI reserves the right to modify these Terms at any time. Continued use of the Platform after
          modifications constitutes acceptance of the updated Terms.
        </p>

        <h2 style={sectionTitle}>12. Contact</h2>
        <p style={paragraph}>
          For questions about these Terms, contact us at{' '}
          <a href="mailto:info@zaahi.io" style={{ color: GOLD, textDecoration: 'none' }}>
            info@zaahi.io
          </a>
          .
        </p>
      </div>
      <Footer />
    </div>
  );
}
