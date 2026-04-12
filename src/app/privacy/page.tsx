import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — ZAAHI',
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

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 40 }}>
          Effective Date: April 12, 2026
        </p>

        <p style={paragraph}>
          ZAAHI Real Estate OS (&quot;we,&quot; &quot;our,&quot; or &quot;Platform&quot;) is committed to protecting your
          privacy in accordance with UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data
          (PDPL) and applicable regulations.
        </p>

        <h2 style={sectionTitle}>1. Data We Collect</h2>
        <p style={paragraph}>
          <strong style={{ color: '#fff' }}>Account Information:</strong> Email address, name, phone number, and
          professional role — provided during registration.
        </p>
        <p style={paragraph}>
          <strong style={{ color: '#fff' }}>Usage Analytics:</strong> Pages visited, features used, session
          duration, device type, browser, and IP address — collected automatically to improve the Platform.
        </p>
        <p style={paragraph}>
          <strong style={{ color: '#fff' }}>Cookies:</strong> We use essential cookies to maintain your session and
          optional analytics cookies to understand Platform usage. See Section 6 below.
        </p>

        <h2 style={sectionTitle}>2. How We Use Your Data</h2>
        <p style={paragraph}>
          We use the data collected to: provide and maintain the Platform; authenticate your identity; improve
          features and user experience; communicate service updates; and comply with legal obligations.
        </p>

        <h2 style={sectionTitle}>3. Data Sharing</h2>
        <p style={paragraph}>
          We do not sell, rent, or trade your personal data to third parties. We may share data only with:
          service providers who assist in operating the Platform (e.g., hosting, analytics) under strict
          confidentiality agreements; or when required by law or legal process.
        </p>

        <h2 style={sectionTitle}>4. Data Retention</h2>
        <p style={paragraph}>
          We retain your personal data for as long as your account is active or as needed to provide services.
          If you request account deletion, we will remove your personal data within 30 days, except where
          retention is required by law.
        </p>

        <h2 style={sectionTitle}>5. Your Rights (PDPL)</h2>
        <p style={paragraph}>
          Under UAE PDPL, you have the right to: access your personal data held by us; request correction of
          inaccurate data; request deletion of your data; withdraw consent for data processing; and lodge a
          complaint with the UAE Data Office. To exercise these rights, contact{' '}
          <a href="mailto:info@zaahi.io" style={{ color: GOLD, textDecoration: 'none' }}>
            info@zaahi.io
          </a>
          .
        </p>

        <h2 style={sectionTitle}>6. Cookies Policy</h2>
        <p style={paragraph}>
          <strong style={{ color: '#fff' }}>Essential Cookies:</strong> Required for authentication and session
          management. These cannot be disabled.
        </p>
        <p style={paragraph}>
          <strong style={{ color: '#fff' }}>Analytics Cookies:</strong> Used to understand how users interact with
          the Platform. You may opt out via the cookie consent banner on your first visit.
        </p>

        <h2 style={sectionTitle}>7. Data Security</h2>
        <p style={paragraph}>
          We implement industry-standard security measures including encryption in transit (TLS), secure
          authentication, and row-level security on our database to protect your data. However, no method of
          transmission or storage is 100% secure.
        </p>

        <h2 style={sectionTitle}>8. International Transfers</h2>
        <p style={paragraph}>
          Your data may be processed on servers located outside the UAE. In such cases, we ensure appropriate
          safeguards are in place in compliance with PDPL requirements.
        </p>

        <h2 style={sectionTitle}>9. Changes to This Policy</h2>
        <p style={paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting
          the updated policy on the Platform with a revised effective date.
        </p>

        <h2 style={sectionTitle}>10. Contact</h2>
        <p style={paragraph}>
          For privacy-related inquiries, contact us at{' '}
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
