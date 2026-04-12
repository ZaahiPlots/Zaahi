import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investment Disclaimer — ZAAHI',
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

export default function DisclaimerPage() {
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
          Investment Disclaimer
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 40 }}>
          Effective Date: April 12, 2026
        </p>

        <h2 style={sectionTitle}>Not a Licensed Financial Adviser</h2>
        <p style={paragraph}>
          ZAAHI Real Estate OS (&quot;Platform&quot;) is not a licensed financial adviser, broker-dealer, investment
          company, or registered investment adviser under the regulations of the UAE Securities and Commodities
          Authority (SCA) or any other regulatory body. The Platform does not provide personalized investment
          advice, financial planning, or portfolio management services.
        </p>

        <h2 style={sectionTitle}>Feasibility Calculator</h2>
        <p style={paragraph}>
          The Feasibility Calculator available on the Platform is an informational tool designed to provide
          general estimates based on publicly available data and standard industry assumptions. It is not a
          substitute for professional financial analysis. The calculator&apos;s outputs — including but not limited
          to Internal Rate of Return (IRR), Net Present Value (NPV), development cost estimates, and revenue
          projections — are estimates only and should not be treated as guarantees of future performance.
        </p>

        <h2 style={sectionTitle}>No Guarantees</h2>
        <p style={paragraph}>
          Past performance is not indicative of future results. Real estate markets are subject to significant
          volatility, regulatory changes, and macroeconomic factors that cannot be predicted. Any projections,
          forecasts, or estimates presented on the Platform are forward-looking statements that involve known
          and unknown risks and uncertainties.
        </p>

        <h2 style={sectionTitle}>Data Sources</h2>
        <p style={paragraph}>
          Market data, pricing information, zoning regulations, and feasibility parameters are sourced from
          publicly available databases including the Dubai Development Authority (DDA), Dubai Land Department
          (DLD), MyLand Abu Dhabi, and other government and industry sources. While we strive to provide
          accurate data, ZAAHI does not warrant the completeness, reliability, or accuracy of this information.
        </p>

        <h2 style={sectionTitle}>Professional Advice Required</h2>
        <p style={paragraph}>
          Before making any investment decisions, you should consult with qualified, licensed professionals
          including but not limited to: registered financial advisers, real estate lawyers, certified valuers,
          tax consultants, and other relevant experts authorized to practice in the UAE or Saudi Arabia.
        </p>

        <h2 style={sectionTitle}>SCA Disclosure</h2>
        <p style={paragraph}>
          In accordance with UAE Securities and Commodities Authority (SCA) regulations, ZAAHI hereby discloses
          that: the Platform is not registered with the SCA as an investment adviser or broker; no content on
          the Platform constitutes a solicitation to buy or sell securities or real estate; and all investment
          decisions are made solely at the user&apos;s own risk and discretion.
        </p>

        <h2 style={sectionTitle}>Limitation of Liability</h2>
        <p style={paragraph}>
          ZAAHI, its founders, employees, and affiliates shall not be held liable for any losses, damages, or
          costs arising from reliance on information provided through the Platform, including but not limited to
          financial losses from investment decisions made based on the Feasibility Calculator or any other
          feature of the Platform.
        </p>

        <h2 style={sectionTitle}>Contact</h2>
        <p style={paragraph}>
          For questions about this disclaimer, contact us at{' '}
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
