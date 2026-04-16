// ZAAHI Ambassador Agreement — public legal page.
//
// Server component (no interactivity). Style mirrors /terms and /privacy:
// dark navy background, gold accents, Georgia serif headings, glassmorphism
// container. Approved 2026-04-15 — replaces the prior free 30/15/5 referral
// model with a paid-tier (Silver / Gold / Platinum) lifetime membership.
//
// Source of truth for tier rates: src/lib/ambassador.ts (PLAN_COMMISSION_RATES)
// and CLAUDE.md § AMBASSADOR PROGRAM RULES — APPROVED 2026-04-15.

import LegalNavbar from '@/components/LegalNavbar';
import Footer from '@/components/Footer';

const GOLD = '#C8A96E';
const BG = '#0A0F1E';
const TEXT = 'rgba(255,255,255,0.85)';
const TEXT_DIM = 'rgba(255,255,255,0.55)';

const sections: { num: string; id: string; title: string }[] = [
  { num: '1', id: 'overview', title: 'Overview & Acceptance' },
  { num: '2', id: 'membership', title: 'Lifetime Membership & Tiers' },
  { num: '3', id: 'commission', title: 'Commission Structure' },
  { num: '4', id: 'payouts', title: 'Payouts' },
  { num: '5', id: 'conduct', title: 'Ambassador Conduct' },
  { num: '6', id: 'modifications', title: 'Modifications & Termination' },
  { num: '7', id: 'inactivity', title: 'Inactivity Policy' },
  { num: '8', id: 'tax', title: 'Tax Responsibility' },
  { num: '9', id: 'governing-law', title: 'Governing Law' },
];

export default function AmbassadorTermsPage() {
  const h2: React.CSSProperties = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 22,
    fontWeight: 700,
    color: GOLD,
    marginTop: 48,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: '1px solid rgba(200, 169, 110, 0.15)',
    scrollMarginTop: 80,
  };

  const p: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.8,
    color: TEXT,
    marginBottom: 14,
  };

  const li: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.8,
    color: TEXT,
    marginBottom: 8,
  };

  const tableWrap: React.CSSProperties = {
    overflowX: 'auto',
    border: '1px solid rgba(200, 169, 110, 0.18)',
    borderRadius: 10,
    background: 'rgba(200, 169, 110, 0.04)',
    margin: '12px 0 18px',
  };

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    color: GOLD,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(200, 169, 110, 0.15)',
  };

  const td: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 14,
    color: TEXT,
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  };

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <LegalNavbar />

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >
        <main style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h1
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 36,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 8,
              }}
            >
              Ambassador Agreement
            </h1>
            <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
              <span>Last Updated: April 15, 2026</span>
              <span style={{ margin: '0 12px' }}>|</span>
              <span>Effective Date: April 15, 2026</span>
            </div>
          </div>

          {/* TOC */}
          <details
            style={{
              marginBottom: 32,
              background: 'rgba(200, 169, 110, 0.05)',
              border: '1px solid rgba(200, 169, 110, 0.15)',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <summary
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: GOLD,
                cursor: 'pointer',
                listStyle: 'none',
              }}
            >
              Table of Contents
            </summary>
            <div style={{ marginTop: 12 }}>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    display: 'block',
                    padding: '6px 0',
                    fontSize: 13,
                    color: TEXT_DIM,
                    textDecoration: 'none',
                  }}
                >
                  {s.num}. {s.title}
                </a>
              ))}
            </div>
          </details>

          {/* 1. Overview */}
          <h2 id="overview" style={h2}>1. Overview & Acceptance</h2>
          <p style={p}>
            This Ambassador Agreement (the &quot;Agreement&quot;) governs your
            participation in the ZAAHI Ambassador Program (the
            &quot;Program&quot;). By purchasing a tier and submitting an
            application via <code style={{ color: GOLD }}>/join</code>, you
            confirm that you have read, understood, and accepted this
            Agreement, the Terms &amp; Conditions, and the Privacy Policy.
          </p>
          <p style={p}>
            ZAAHI may verify your USDT payment on-chain before activating your
            account. Activation typically occurs within 24 hours of payment
            confirmation. Once activated, your status, referral code, and
            commission history are visible on the ambassador dashboard.
          </p>

          {/* 2. Membership */}
          <h2 id="membership" style={h2}>2. Lifetime Membership & Tiers</h2>
          <p style={p}>
            Each tier is a one-time, non-recurring purchase paid in USDT on the
            TRON (TRC-20) network. Once verified, your tier is granted for the
            lifetime of your ZAAHI account — there are no renewal fees.
          </p>
          <div style={tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Tier</th>
                  <th style={th}>AED</th>
                  <th style={th}>USDT (≈)</th>
                  <th style={th}>L1</th>
                  <th style={th}>L2</th>
                  <th style={th}>L3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>Silver</td>
                  <td style={td}>1,000</td>
                  <td style={td}>272</td>
                  <td style={td}>5%</td>
                  <td style={td}>2%</td>
                  <td style={td}>1%</td>
                </tr>
                <tr>
                  <td style={td}>Gold</td>
                  <td style={td}>5,000</td>
                  <td style={td}>1,361</td>
                  <td style={td}>10%</td>
                  <td style={td}>4%</td>
                  <td style={td}>1%</td>
                </tr>
                <tr>
                  <td style={td}>Platinum</td>
                  <td style={td}>15,000</td>
                  <td style={td}>4,084</td>
                  <td style={td}>15%</td>
                  <td style={td}>6%</td>
                  <td style={td}>1%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={p}>
            <strong>The registration fee is non-refundable.</strong> USDT
            quotations are approximate and subject to market fluctuation; the
            AED price is binding and the USDT figure is for convenience only.
          </p>

          {/* 3. Commission */}
          <h2 id="commission" style={h2}>3. Commission Structure</h2>
          <p style={p}>
            Commissions are calculated from the <strong>ZAAHI service fee
            equal to 2% of the agreed deal value</strong>. The fee is split
            into a seller-half and a buyer-half; each half walks the upline
            chain independently across three (3) levels:
          </p>
          <ul>
            <li style={li}><strong>Level 1</strong> — your direct referral.</li>
            <li style={li}><strong>Level 2</strong> — a referral of your direct referral.</li>
            <li style={li}><strong>Level 3</strong> — a referral one tier deeper.</li>
          </ul>
          <p style={p}>
            The level rate that applies is determined by <em>your</em> active
            tier at the time the deal is recorded as <code>DEAL_COMPLETED</code>.
            If an upline ambassador is inactive, that slot is skipped and the
            next eligible upline takes the level (skip-inactive policy).
          </p>
          <p style={p}>
            <strong>No self-referral.</strong> Ambassadors may purchase plots
            on the platform but receive no commission on their own deals.
          </p>

          {/* 4. Payouts */}
          <h2 id="payouts" style={h2}>4. Payouts</h2>
          <ul>
            <li style={li}>
              <strong>Minimum payout:</strong> AED 1,000. Balances below this
              threshold are carried forward indefinitely.
            </li>
            <li style={li}>
              <strong>Payout SLA:</strong> within thirty (30) business days
              after the underlying deal is completed and ZAAHI has received
              its 2% service fee in cleared funds.
            </li>
            <li style={li}>
              Payout currency is at ZAAHI&apos;s discretion (bank transfer in
              AED, ZAH token, or USDT).
            </li>
            <li style={li}>
              If the underlying deal is later cancelled or disputed, the
              corresponding commission is reversed (clawback) per the
              Commission lifecycle policy.
            </li>
          </ul>

          {/* 5. Conduct */}
          <h2 id="conduct" style={h2}>5. Ambassador Conduct</h2>
          <p style={p}>
            You agree to represent ZAAHI honestly and professionally. The
            following are prohibited and may result in suspension or
            termination of your ambassador status without refund:
          </p>
          <ul>
            <li style={li}>
              <strong>Misrepresentation</strong> — making false or misleading
              statements about ZAAHI, the platform, plots, returns, or the
              ambassador program itself.
            </li>
            <li style={li}>
              Spam, deceptive marketing, paid traffic schemes that violate
              third-party platform rules, or impersonation of ZAAHI staff.
            </li>
            <li style={li}>
              Manipulating the referral attribution system (e.g. cookie
              stuffing, fake accounts, self-referral chains).
            </li>
            <li style={li}>
              Any breach of the Terms &amp; Conditions or Privacy Policy.
            </li>
          </ul>

          {/* 6. Modifications */}
          <h2 id="modifications" style={h2}>6. Modifications & Termination</h2>
          <p style={p}>
            ZAAHI may modify the commission rates or program structure at any
            time with thirty (30) days prior written notice (email to your
            registered address is sufficient). Changes apply prospectively to
            deals completed after the effective date — already-vested
            commissions are unaffected.
          </p>
          <p style={p}>
            ZAAHI may suspend or terminate your ambassador status immediately
            for cause (violation of this Agreement, fraud, or misconduct).
            Termination forfeits any unpaid commissions related to the
            violation but does not retroactively unwind paid commissions
            already received in good faith.
          </p>

          {/* 7. Inactivity */}
          <h2 id="inactivity" style={h2}>7. Inactivity Policy</h2>
          <p style={p}>
            If your account shows no qualifying activity for twelve (12)
            consecutive months, your ambassador status is frozen and you are
            skipped in the upline chain (per the skip-inactive policy).
            Reactivation is free and instant — log in and submit a
            reactivation request. No fees apply.
          </p>

          {/* 8. Tax */}
          <h2 id="tax" style={h2}>8. Tax Responsibility</h2>
          <p style={p}>
            You are solely responsible for declaring and paying any taxes,
            duties, or levies owed in your jurisdiction on commissions
            received from the Program. ZAAHI does not withhold taxes on your
            behalf and provides no tax advice.
          </p>

          {/* 9. Governing law */}
          <h2 id="governing-law" style={h2}>9. Governing Law</h2>
          <p style={p}>
            This Agreement is governed by the laws of the United Arab
            Emirates. Any dispute arising out of or relating to this Agreement
            shall be subject to the exclusive jurisdiction of the Dubai
            Courts.
          </p>

          <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', color: TEXT_DIM, fontSize: 13, lineHeight: 1.7 }}>
            Questions about the Ambassador Program? Contact us at{' '}
            <a href="mailto:ambassadors@zaahi.io" style={{ color: GOLD }}>ambassadors@zaahi.io</a>.
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
