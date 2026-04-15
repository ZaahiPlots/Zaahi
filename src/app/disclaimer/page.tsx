'use client';

import LegalNavbar from '@/components/LegalNavbar';
import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';

const GOLD = '#C8A96E';
const BG = '#0A0F1E';
const TEXT = 'rgba(255,255,255,0.85)';
const TEXT_DIM = 'rgba(255,255,255,0.55)';

const sections = [
  { id: 'general', num: '1', title: 'General Disclaimer' },
  { id: 'not-financial', num: '2', title: 'Not Financial or Investment Advice' },
  { id: 'feasibility', num: '3', title: 'Feasibility Calculator' },
  { id: 'data-accuracy', num: '4', title: 'Data Accuracy and Limitations' },
  { id: 'market-risk', num: '5', title: 'Market Risk' },
  { id: 'professional', num: '6', title: 'Professional Advice' },
  { id: 'no-warranty', num: '7', title: 'No Warranty' },
  { id: 'liability', num: '8', title: 'Limitation of Liability' },
  { id: 'uae-regulatory', num: '9', title: 'UAE Regulatory Framework' },
  { id: 'acknowledgment', num: '10', title: 'Acknowledgment' },
];

export default function DisclaimerPage() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

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

  const h3: React.CSSProperties = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 17,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 28,
    marginBottom: 10,
  };

  const p: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.8,
    color: TEXT,
    marginBottom: 14,
  };

  const caps: React.CSSProperties = {
    ...p,
    textTransform: 'uppercase' as const,
    fontWeight: 600,
  };

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <LegalNavbar />

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          gap: 48,
          padding: '40px 24px 80px',
        }}
      >
        {/* Table of Contents — sidebar */}
        <aside
          style={{
            position: 'sticky',
            top: 80,
            alignSelf: 'flex-start',
            width: 260,
            minWidth: 260,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            paddingRight: 16,
            display: 'none',
          }}
          className="toc-sidebar"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              color: GOLD,
              marginBottom: 16,
            }}
          >
            Table of Contents
          </div>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: 'block',
                padding: '6px 0',
                fontSize: 13,
                lineHeight: 1.4,
                color: activeSection === s.id ? GOLD : TEXT_DIM,
                textDecoration: 'none',
                borderLeft: `2px solid ${activeSection === s.id ? GOLD : 'transparent'}`,
                paddingLeft: 12,
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              {s.num}. {s.title}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, maxWidth: 800 }}>
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
              Investment Disclaimer
            </h1>
            <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
              <span>Last Updated: April 13, 2026</span>
              <span style={{ margin: '0 12px' }}>|</span>
              <span>Effective Date: April 13, 2026</span>
            </div>
          </div>

          {/* Important Notice */}
          <div
            style={{
              background: 'rgba(231, 76, 60, 0.08)',
              border: '1px solid rgba(231, 76, 60, 0.2)',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: 20,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <strong style={{ color: '#E74C3C' }}>IMPORTANT NOTICE:</strong> ZAAHI is an informational technology platform only. It is not a licensed financial advisor, investment advisor, real estate broker, appraiser, or valuer. No information on this platform constitutes financial, investment, legal, or tax advice. Please read this disclaimer carefully before using the platform.
          </div>

          {/* Mobile TOC */}
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
            <div style={{ marginTop: 12, columns: 2, columnGap: 24 }}>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    display: 'block',
                    padding: '4px 0',
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

          {/* 1. GENERAL DISCLAIMER */}
          <h2 id="general" style={h2}>1. General Disclaimer</h2>

          <h3 style={h3}>1.1 Informational Purpose Only</h3>
          <p style={p}>
            The ZAAHI Real Estate OS platform (&ldquo;ZAAHI,&rdquo; the &ldquo;Platform&rdquo;) and all information, data, analytics, reports, visualizations, calculations, projections, and content provided through the Platform (collectively, &ldquo;Platform Content&rdquo;) are intended solely for general informational and educational purposes. The Platform is designed as a technology tool to help users research, explore, and analyze real estate data in the United Arab Emirates and the Kingdom of Saudi Arabia. Nothing on the Platform constitutes, or should be construed as, financial advice, investment advice, legal advice, tax advice, accounting advice, real estate brokerage services, property valuation or appraisal services, or any other form of professional advice or recommendation.
          </p>

          <h3 style={h3}>1.2 No Professional Relationship</h3>
          <p style={p}>
            Your use of the Platform does not create a fiduciary relationship, advisory relationship, professional-client relationship, broker-client relationship, or any other type of professional relationship between you and ZAAHI, its founders, employees, contractors, agents, or affiliates. ZAAHI does not act as your agent, broker, advisor, consultant, or representative in any capacity. Any decision you make based on information obtained from the Platform is made entirely at your own risk and discretion.
          </p>

          <h3 style={h3}>1.3 User Responsibility</h3>
          <p style={p}>
            You acknowledge and agree that you are solely responsible for evaluating the suitability, accuracy, completeness, and reliability of any information obtained from the Platform for your specific circumstances. You assume full responsibility for all risks associated with any decisions or actions you take based on Platform Content, including but not limited to property purchases, land acquisitions, development decisions, investment allocations, financing arrangements, and any other real estate-related transactions or activities. ZAAHI expressly disclaims any responsibility for losses, damages, costs, or expenses you may incur as a result of relying on Platform Content.
          </p>

          {/* 2. NOT FINANCIAL */}
          <h2 id="not-financial" style={h2}>2. Not Financial or Investment Advice</h2>

          <h3 style={h3}>2.1 Not Licensed or Regulated</h3>
          <p style={p}>
            ZAAHI is not licensed, registered, or regulated as a financial advisor, investment advisor, securities dealer, broker-dealer, or investment manager by any regulatory authority, including but not limited to the Securities and Commodities Authority (SCA) of the UAE, the Dubai Financial Services Authority (DFSA), the Financial Services Regulatory Authority (FSRA) of Abu Dhabi Global Market, the Capital Market Authority (CMA) of Saudi Arabia, or any other national or international financial regulatory body. ZAAHI does not hold any license to provide financial services, investment services, or securities-related services in any jurisdiction.
          </p>

          <h3 style={h3}>2.2 No Personalized Recommendations</h3>
          <p style={p}>
            The Platform does not provide personalized investment recommendations, financial planning, or portfolio management services. The information displayed on the Platform does not take into account your individual financial situation, investment experience, risk tolerance, investment objectives, liquidity needs, tax circumstances, legal restrictions, or any other personal factors that would be relevant to an investment decision. Any property data, market analytics, or financial projections displayed on the Platform are generic in nature and may not be appropriate for your specific circumstances.
          </p>

          <h3 style={h3}>2.3 Independent Decision-Making</h3>
          <p style={p}>
            You understand and agree that any investment or transaction decision you make in connection with real estate is your sole responsibility. ZAAHI does not make any recommendation or solicitation to buy, sell, hold, develop, or otherwise transact in any property or real estate asset. The display of any property, parcel, or investment opportunity on the Platform does not constitute an endorsement, recommendation, or solicitation by ZAAHI. You should make your own independent assessment and seek professional advice before entering into any real estate transaction.
          </p>

          <h3 style={h3}>2.4 Past Performance</h3>
          <p style={p}>
            Any historical data, market trends, past performance metrics, or historical analytics presented on the Platform are provided for informational and reference purposes only. Past performance is not indicative of future results. Historical data should not be relied upon as a guarantee, predictor, or forecast of future property values, market conditions, returns on investment, or other financial outcomes. Real estate markets are subject to significant volatility and past trends may not continue.
          </p>

          {/* 3. FEASIBILITY CALCULATOR */}
          <h2 id="feasibility" style={h2}>3. Feasibility Calculator</h2>

          <h3 style={h3}>3.1 Estimation Tool</h3>
          <p style={p}>
            The ZAAHI Feasibility Calculator is an estimation and scenario-modeling tool that generates hypothetical development projections based on user-provided inputs and standardized market assumptions. The calculator is designed to help users explore potential development scenarios and compare different project configurations. It is not a professional feasibility study, appraisal, valuation, financial model, or investment analysis. The outputs of the calculator are rough estimates only and should not be relied upon for making investment decisions, obtaining financing, or any other purpose.
          </p>

          <h3 style={h3}>3.2 Not an Investment Recommendation</h3>
          <p style={p}>
            The projections generated by the Feasibility Calculator do not constitute an investment recommendation, a financial forecast, an expression of opinion as to the merits or risks of any property or project, or a guarantee of any particular financial outcome. The calculator does not assess the creditworthiness, financial viability, regulatory compliance, or technical feasibility of any specific development project. Users should commission a professional feasibility study from qualified consultants before proceeding with any development project.
          </p>

          <h3 style={h3}>3.3 Standardized Assumptions</h3>
          <p style={p}>
            The Feasibility Calculator uses standardized default assumptions for key variables including but not limited to: construction costs per square foot, development timelines, financing costs and interest rates, market absorption rates, rental yields, capitalization rates, operating expense ratios, vacancy rates, and exit values. These defaults are based on general market benchmarks and may not accurately reflect conditions specific to any particular property, location, asset class, or time period. Users should replace default assumptions with their own professionally obtained estimates and conduct thorough sensitivity analysis on all outputs.
          </p>

          <h3 style={h3}>3.4 Material Variance</h3>
          <p style={p}>
            Actual development costs, timelines, revenues, returns, and other financial outcomes are likely to differ materially from the projections generated by the Feasibility Calculator due to numerous factors including but not limited to: construction cost escalation, material price volatility, labor market conditions, regulatory changes, permitting delays, unforeseen site conditions (soil contamination, archaeological findings, infrastructure limitations), changes in market demand, interest rate fluctuations, currency exchange rate movements, changes in tax laws, force majeure events, geopolitical risks, and other risks inherent in real estate development and investment. ZAAHI expressly disclaims all liability for any reliance placed on Feasibility Calculator outputs.
          </p>

          {/* 4. DATA ACCURACY */}
          <h2 id="data-accuracy" style={h2}>4. Data Accuracy and Limitations</h2>

          <h3 style={h3}>4.1 Data Sources</h3>
          <p style={p}>
            The Platform aggregates and displays data from various government and public sources including the Dubai Land Department (DLD), Dubai Development Authority (DDA), Real Estate Regulatory Agency (RERA), Dubai Municipality, MyLand portal, and other official and third-party data providers. While we endeavor to maintain accurate and current data, we do not independently verify the accuracy, completeness, timeliness, or reliability of data obtained from these sources. Data is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without any warranty or representation.
          </p>

          <h3 style={h3}>4.2 No Warranty on Data</h3>
          <p style={p}>
            ZAAHI makes no warranty, express or implied, regarding the accuracy, completeness, reliability, timeliness, or fitness for any particular purpose of any data displayed on the Platform. Property data including but not limited to plot boundaries, areas, dimensions, ownership information, transaction histories, zoning classifications, land use designations, development permissions, and building guidelines may contain errors, omissions, or outdated information. Data may not reflect the most recent government updates, regulatory changes, or market transactions.
          </p>

          <h3 style={h3}>4.3 Spatial Data Approximations</h3>
          <p style={p}>
            Geographic boundaries, plot outlines, parcel dimensions, and other spatial data displayed on the Platform&apos;s maps and visualizations are approximate representations and may not correspond to exact surveyed measurements. The Platform uses data from geographic information systems (GIS) and satellite imagery that may have inherent positional accuracy limitations. Map visualizations, including 3D building models, are artistic representations for illustrative purposes and do not constitute survey-grade or engineering-grade spatial data. Users should always obtain professional survey data from a licensed surveyor before relying on property boundaries or dimensions for any purpose.
          </p>

          <h3 style={h3}>4.4 Pricing Information</h3>
          <p style={p}>
            Property prices, valuations, and price-per-square-foot figures displayed on the Platform are derived from various sources and may represent asking prices, estimated values, historical transaction values, or user-submitted data. These figures are provided for reference purposes only and do not constitute an appraisal, valuation, or opinion of value by ZAAHI. Actual market values may differ significantly from the figures displayed on the Platform. Users should obtain an independent professional valuation from a licensed appraiser or surveyor before relying on any pricing information for transaction, financing, or investment purposes.
          </p>

          <h3 style={h3}>4.5 User Verification Obligation</h3>
          <p style={p}>
            You are solely and entirely responsible for independently verifying all information obtained from the Platform with the relevant official sources and qualified professionals before taking any action based on such information. This includes but is not limited to: verifying property ownership and encumbrances with the Dubai Land Department or relevant registration authority; confirming plot boundaries and dimensions with a licensed surveyor; validating zoning and land use classifications with the relevant planning authority; verifying building permits and development approvals with the relevant municipal authority; and obtaining up-to-date regulatory guidance from qualified legal counsel.
          </p>

          {/* 5. MARKET RISK */}
          <h2 id="market-risk" style={h2}>5. Market Risk</h2>

          <h3 style={h3}>5.1 Real Estate Market Volatility</h3>
          <p style={p}>
            Real estate markets, including the UAE and Saudi Arabia markets covered by the Platform, are subject to significant volatility and cyclical fluctuations. Property values, rental yields, development returns, and market liquidity can change rapidly and unpredictably due to macroeconomic conditions, interest rate changes, government policy changes, supply and demand dynamics, demographic shifts, geopolitical events, natural disasters, pandemics, and other factors beyond the control of ZAAHI or any individual market participant.
          </p>

          <h3 style={h3}>5.2 Past Performance Not Indicative</h3>
          <p style={p}>
            Historical property values, rental yields, market trends, and investment returns presented on the Platform are not indicative of, and do not guarantee, future performance. Markets that have appreciated in the past may decline in the future, and vice versa. You should not assume that historical trends will continue or that past market conditions are representative of current or future conditions. Real estate investments carry inherent risks, including the risk of partial or total loss of invested capital.
          </p>

          <h3 style={h3}>5.3 Forward-Looking Information</h3>
          <p style={p}>
            Any forward-looking statements, projections, estimates, or opinions about future market conditions, property values, development potential, or investment returns contained on the Platform or generated by the Feasibility Calculator are inherently uncertain and speculative. Such forward-looking information is based on current market conditions and assumptions that may prove to be incorrect. ZAAHI does not undertake any obligation to update or revise forward-looking information as conditions change. You should not place undue reliance on any forward-looking statements or projections.
          </p>

          <h3 style={h3}>5.4 Liquidity Risk</h3>
          <p style={p}>
            Real estate is an inherently illiquid asset class. Unlike publicly traded securities, real estate properties cannot be quickly sold at fair market value. The time and cost required to sell a property can be significant and may vary depending on market conditions, property type, location, condition, and other factors. You should consider liquidity risk carefully before making any real estate investment decision and should not invest funds that you may need to access quickly.
          </p>

          {/* 6. PROFESSIONAL ADVICE */}
          <h2 id="professional" style={h2}>6. Professional Advice</h2>

          <h3 style={h3}>6.1 Seek Qualified Professionals</h3>
          <p style={p}>
            ZAAHI strongly recommends that you consult with qualified, licensed professionals before making any real estate investment, purchase, development, or transaction decision. The following professionals should be consulted as appropriate for your specific situation:
          </p>
          <ul style={{ ...p, paddingLeft: 24 }}>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Licensed Real Estate Agents/Brokers</strong> — registered with RERA or the relevant regulatory authority — for property valuation guidance, market comparables, transaction assistance, and market insight
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Licensed Property Valuers/Appraisers</strong> — certified by RICS, TAQEEM, or equivalent — for independent property valuations and appraisals
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Financial Advisors</strong> — licensed by SCA, DFSA, FSRA, or equivalent — for investment suitability analysis, portfolio allocation, and financial planning
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Legal Counsel</strong> — qualified to practice in the relevant UAE jurisdiction — for contract review, legal due diligence, regulatory compliance, and dispute resolution
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Licensed Surveyors</strong> — for property boundary verification, topographic surveys, and land measurement
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Structural Engineers and Architects</strong> — for building condition assessments, development feasibility, and construction planning
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Tax Advisors</strong> — for understanding VAT implications, corporate tax obligations, and other tax considerations related to real estate transactions
            </li>
          </ul>

          <h3 style={h3}>6.2 ZAAHI Is Not a Substitute</h3>
          <p style={p}>
            The Platform is intended to complement, not replace, the advice and services of qualified professionals. No amount of data, analytics, or technology can substitute for the professional judgment, local expertise, regulatory knowledge, and fiduciary duty that licensed professionals provide. ZAAHI does not verify the qualifications, competence, or suitability of any professionals and makes no recommendations regarding specific professionals or firms.
          </p>

          {/* 7. NO WARRANTY */}
          <h2 id="no-warranty" style={h2}>7. No Warranty</h2>

          <p style={caps}>
            THE PLATFORM AND ALL PLATFORM CONTENT, INCLUDING BUT NOT LIMITED TO ALL DATA, INFORMATION, ANALYTICS, REPORTS, PROJECTIONS, CALCULATIONS, VISUALIZATIONS, MAPS, 3D MODELS, AND MATERIALS AVAILABLE THROUGH THE PLATFORM, ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT ANY WARRANTIES OR REPRESENTATIONS OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
          </p>
          <p style={caps}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZAAHI EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION: (A) ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, TITLE, ACCURACY, COMPLETENESS, RELIABILITY, TIMELINESS, OR AVAILABILITY; (B) ANY WARRANTIES ARISING FROM COURSE OF DEALING, USAGE, OR TRADE PRACTICE; (C) ANY WARRANTIES THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, VIRUS-FREE, OR FREE FROM HARMFUL COMPONENTS; (D) ANY WARRANTIES THAT DEFECTS WILL BE CORRECTED; AND (E) ANY WARRANTIES REGARDING THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE PLATFORM.
          </p>
          <p style={caps}>
            YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT YOUR USE OF THE PLATFORM IS AT YOUR SOLE RISK AND THAT THE ENTIRE RISK AS TO SATISFACTORY QUALITY, PERFORMANCE, ACCURACY, AND EFFORT IS WITH YOU. NO ORAL OR WRITTEN INFORMATION OR ADVICE GIVEN BY ZAAHI OR ITS AUTHORIZED REPRESENTATIVES SHALL CREATE A WARRANTY.
          </p>

          {/* 8. LIMITATION OF LIABILITY */}
          <h2 id="liability" style={h2}>8. Limitation of Liability</h2>

          <h3 style={h3}>8.1 Exclusion of Damages</h3>
          <p style={caps}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ZAAHI, ITS FOUNDERS, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, CONTRACTORS, LICENSORS, SERVICE PROVIDERS, SUBCONTRACTORS, SUPPLIERS, OR AFFILIATES (COLLECTIVELY, THE &ldquo;ZAAHI PARTIES&rdquo;) BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION: (A) DAMAGES FOR LOSS OF PROFITS, REVENUE, INCOME, BUSINESS OPPORTUNITIES, OR ANTICIPATED SAVINGS; (B) DAMAGES FOR LOSS OF DATA, GOODWILL, OR REPUTATION; (C) DAMAGES FOR BUSINESS INTERRUPTION OR LOSS OF USE; (D) DAMAGES FOR THE COST OF PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; (E) DAMAGES ARISING FROM OR RELATED TO ANY INVESTMENT DECISION, PROPERTY TRANSACTION, OR DEVELOPMENT PROJECT MADE BASED ON PLATFORM CONTENT; OR (F) ANY OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER SUCH DAMAGES ARE BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, STATUTE, OR ANY OTHER LEGAL THEORY, AND REGARDLESS OF WHETHER THE ZAAHI PARTIES HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h3 style={h3}>8.2 Aggregate Liability Cap</h3>
          <p style={caps}>
            IN NO EVENT SHALL THE TOTAL AGGREGATE LIABILITY OF THE ZAAHI PARTIES TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THE PLATFORM, THESE DISCLAIMERS, OR THE TERMS OF SERVICE EXCEED THE GREATER OF: (A) THE TOTAL FEES ACTUALLY PAID BY YOU TO ZAAHI DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100.00). THE EXISTENCE OF MULTIPLE CLAIMS SHALL NOT ENLARGE OR EXTEND THIS LIMITATION. THIS LIMITATION APPLIES REGARDLESS OF THE FORM OF ACTION, WHETHER IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE.
          </p>

          {/* 9. UAE REGULATORY */}
          <h2 id="uae-regulatory" style={h2}>9. UAE Regulatory Framework</h2>

          <h3 style={h3}>9.1 Securities and Commodities Authority (SCA)</h3>
          <p style={p}>
            ZAAHI is not registered with, licensed by, or regulated by the Securities and Commodities Authority (SCA) of the United Arab Emirates. The Platform does not constitute a securities offering, investment fund, collective investment scheme, or any other regulated financial product or service under UAE Federal Law No. 4 of 2000 Concerning the Emirates Securities and Commodities Authority and Market, as amended, or any other applicable securities legislation. No information on the Platform should be construed as an offer, solicitation, or recommendation to buy, sell, or hold any security or financial instrument.
          </p>

          <h3 style={h3}>9.2 Real Estate Regulatory Agency (RERA)</h3>
          <p style={p}>
            ZAAHI is not a licensed real estate broker, agent, property management company, or real estate developer under Dubai Law No. 2 of 2009 Regulating the Real Estate Sector in the Emirate of Dubai or any other applicable real estate regulation. The Platform does not provide real estate brokerage services, property management services, or development services. ZAAHI does not facilitate, mediate, negotiate, or close real estate transactions on behalf of users. Any transaction that a user enters into based on information obtained from the Platform is solely between the transacting parties and is not facilitated by ZAAHI.
          </p>

          <h3 style={h3}>9.3 Dubai Land Department (DLD)</h3>
          <p style={p}>
            While the Platform incorporates data sourced from the Dubai Land Department (DLD) and its affiliated systems, ZAAHI is not affiliated with, endorsed by, or officially connected to the DLD in any capacity. Data sourced from the DLD is displayed on the Platform for informational purposes only and may not reflect the most current records maintained by the DLD. For official and authoritative property records, ownership verification, and transaction registration, users must refer directly to the Dubai Land Department or its official online portals.
          </p>

          <h3 style={h3}>9.4 Anti-Money Laundering Compliance</h3>
          <p style={p}>
            ZAAHI is committed to complying with all applicable anti-money laundering (AML), counter-terrorism financing (CTF), and sanctions laws and regulations in the United Arab Emirates, including UAE Federal Decree-Law No. 20 of 2018 on Anti-Money Laundering and Combating the Financing of Terrorism and Illegal Organisations, as amended, and its implementing decisions and regulations. Users are required to comply with all applicable AML and CTF laws and regulations in connection with their use of the Platform and any transactions they enter into based on Platform Content.
          </p>

          {/* 10. ACKNOWLEDGMENT */}
          <h2 id="acknowledgment" style={h2}>10. Acknowledgment</h2>

          <h3 style={h3}>10.1 User Acknowledgment</h3>
          <p style={p}>
            By accessing or using the ZAAHI Platform, you expressly acknowledge and agree that:
          </p>
          <ul style={{ ...p, paddingLeft: 24 }}>
            <li style={{ marginBottom: 8 }}>You have read, understood, and agree to be bound by this Investment Disclaimer in its entirety;</li>
            <li style={{ marginBottom: 8 }}>The Platform is an informational technology tool and does not provide financial, investment, legal, tax, or any other professional advice;</li>
            <li style={{ marginBottom: 8 }}>You will not rely solely on Platform Content for any investment, transaction, or development decision;</li>
            <li style={{ marginBottom: 8 }}>You will seek independent professional advice from qualified, licensed professionals before making any real estate-related decisions;</li>
            <li style={{ marginBottom: 8 }}>You understand and accept the risks associated with real estate investment, including the risk of loss of capital;</li>
            <li style={{ marginBottom: 8 }}>You are solely responsible for independently verifying all information obtained from the Platform;</li>
            <li style={{ marginBottom: 8 }}>The Feasibility Calculator provides estimates only and actual results may differ materially;</li>
            <li style={{ marginBottom: 8 }}>ZAAHI is not responsible for any losses, damages, or costs arising from your use of or reliance on Platform Content; and</li>
            <li style={{ marginBottom: 8 }}>The limitations of liability and disclaimers in this document are fundamental elements of the basis upon which ZAAHI provides the Platform.</li>
          </ul>

          <h3 style={h3}>10.2 Assumption of Risk</h3>
          <p style={p}>
            You voluntarily assume all risks associated with your use of the Platform and any decisions or actions you take based on Platform Content. This includes, without limitation, the risk that data displayed on the Platform may be inaccurate, incomplete, or outdated; the risk that market conditions may change adversely; the risk that projections and estimates may not materialize; and the risk of financial loss resulting from real estate investments or transactions.
          </p>

          <h3 style={h3}>10.3 Waiver</h3>
          <p style={p}>
            To the maximum extent permitted by applicable law, you waive any claims, actions, or demands you may have against ZAAHI, its founders, directors, officers, employees, agents, and affiliates arising from or related to your reliance on Platform Content for investment, transaction, or other decisions. This waiver is intended to be as broad and inclusive as permitted by the laws of the United Arab Emirates and shall be interpreted in favor of ZAAHI.
          </p>

          {/* Contact */}
          <div
            style={{
              marginTop: 48,
              background: 'rgba(200, 169, 110, 0.06)',
              border: '1px solid rgba(200, 169, 110, 0.15)',
              borderRadius: 8,
              padding: '20px 24px',
            }}
          >
            <p style={{ ...p, marginBottom: 6, fontWeight: 600, color: '#fff' }}>
              Questions about this disclaimer?
            </p>
            <p style={{ ...p, marginBottom: 0 }}>
              Contact us at{' '}
              <a href="mailto:info@zaahi.io" style={{ color: GOLD, textDecoration: 'none' }}>
                info@zaahi.io
              </a>
            </p>
          </div>

          <p style={{ ...p, color: TEXT_DIM, fontSize: 13, marginTop: 32, fontStyle: 'italic' }}>
            This Investment Disclaimer is incorporated into and forms part of the ZAAHI Terms of Service. By using ZAAHI, you acknowledge that you have read, understood, and agree to be bound by this disclaimer, our Terms of Service, and our Privacy Policy.
          </p>
        </main>
      </div>

      <Footer />

      <style>{`
        @media (min-width: 900px) {
          .toc-sidebar { display: block !important; }
        }
      `}</style>
    </div>
  );
}
