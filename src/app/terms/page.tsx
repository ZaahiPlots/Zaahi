'use client';

import LegalNavbar from '@/components/LegalNavbar';
import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';

const GOLD = '#C8A96E';
const BG = '#0A0F1E';
const TEXT = 'rgba(255,255,255,0.85)';
const TEXT_DIM = 'rgba(255,255,255,0.55)';

const sections = [
  { id: 'acceptance', num: '1', title: 'Acceptance of Terms' },
  { id: 'description', num: '2', title: 'Description of Service' },
  { id: 'account', num: '3', title: 'Account Registration and Security' },
  { id: 'license', num: '4', title: 'License and Access' },
  { id: 'conduct', num: '5', title: 'User Conduct' },
  { id: 'ip', num: '6', title: 'Intellectual Property' },
  { id: 'data-sources', num: '7', title: 'Data Sources and Accuracy' },
  { id: 'feasibility', num: '8', title: 'Feasibility Calculator Disclaimer' },
  { id: 'third-party', num: '9', title: 'Third-Party Services' },
  { id: 'payment', num: '10', title: 'Payment Terms' },
  { id: 'disclaimers', num: '11', title: 'Disclaimers and Limitation of Liability' },
  { id: 'indemnification', num: '12', title: 'Indemnification' },
  { id: 'governing-law', num: '13', title: 'Governing Law' },
  { id: 'disputes', num: '14', title: 'Dispute Resolution' },
  { id: 'modifications', num: '15', title: 'Modifications to Terms' },
  { id: 'termination', num: '16', title: 'Termination' },
  { id: 'severability', num: '17', title: 'Severability' },
  { id: 'entire-agreement', num: '18', title: 'Entire Agreement' },
  { id: 'contact', num: '19', title: 'Contact Information' },
];

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
              <span>Last Updated: April 13, 2026</span>
              <span style={{ margin: '0 12px' }}>|</span>
              <span>Effective Date: April 13, 2026</span>
            </div>
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

          <p style={p}>
            Welcome to ZAAHI (&ldquo;ZAAHI,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and ZAAHI Real Estate OS, a technology company registered and operating in the United Arab Emirates, governing your access to and use of the ZAAHI platform, including our website at zaahi.io, mobile applications, application programming interfaces (APIs), data feeds, and all related services (collectively, the &ldquo;Platform&rdquo; or &ldquo;Service&rdquo;).
          </p>
          <p style={p}>
            Please read these Terms carefully before accessing or using the Platform. By creating an account, accessing, or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, as well as our Privacy Policy and Investment Disclaimer, which are incorporated herein by reference. If you do not agree with any provision of these Terms, you must immediately discontinue use of the Platform and delete your account.
          </p>

          {/* 1. ACCEPTANCE */}
          <h2 id="acceptance" style={h2}>1. Acceptance of Terms</h2>

          <h3 style={h3}>1.1 Binding Agreement</h3>
          <p style={p}>
            By accessing or using the ZAAHI Platform in any manner, including but not limited to visiting or browsing the website, registering for an account, using data visualization tools, accessing land intelligence reports, operating the feasibility calculator, or utilizing any features of the Service, you expressly acknowledge and agree that you are entering into a legally binding contract with ZAAHI. These Terms apply to all users of the Platform, including without limitation users who are browsers, vendors, customers, merchants, subscribers, contributors, and developers.
          </p>

          <h3 style={h3}>1.2 Eligibility</h3>
          <p style={p}>
            You must be at least eighteen (18) years of age and possess the legal authority, right, and freedom to enter into these Terms as a binding agreement. You represent and warrant that you are of legal age to form a binding contract under the laws of your jurisdiction and meet all of the foregoing eligibility requirements. If you are using the Platform on behalf of a business, organization, or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms, in which case the terms &ldquo;you&rdquo; and &ldquo;your&rdquo; shall refer to that entity. If you do not have such authority, or if you do not agree with these Terms, you must not accept these Terms and must not use the Service.
          </p>

          <h3 style={h3}>1.3 Acceptance Methods</h3>
          <p style={p}>
            You accept these Terms by: (a) creating a ZAAHI account; (b) clicking &ldquo;I agree&rdquo; or similar acceptance mechanism when presented with these Terms; (c) continuing to access or use the Platform after being notified of changes to these Terms; or (d) otherwise using the Platform in any manner. Your continued use of the Service following the posting of any amendments or modifications to these Terms shall constitute your acceptance of such changes.
          </p>

          {/* 2. DESCRIPTION */}
          <h2 id="description" style={h2}>2. Description of Service</h2>

          <h3 style={h3}>2.1 Platform Overview</h3>
          <p style={p}>
            ZAAHI is a real estate operating system and land intelligence platform designed to serve the United Arab Emirates and Kingdom of Saudi Arabia markets. The Platform aggregates, organizes, and visualizes land parcel data, property information, development feasibility metrics, and market intelligence to provide users with comprehensive tools for real estate analysis, investment research, and decision support. ZAAHI currently covers over 100,000 land plots across Dubai, Abu Dhabi, and Saudi Arabia.
          </p>

          <h3 style={h3}>2.2 Core Features</h3>
          <p style={p}>
            The Platform provides, but is not limited to, the following features and functionalities: (a) interactive 3D map visualization of land parcels with detailed property overlays; (b) land parcel data including plot boundaries, dimensions, areas, zoning information, and land use classifications sourced from government registries; (c) affection plan data derived from the Dubai Development Authority (DDA), including building limits, setback requirements, and development guidelines; (d) feasibility calculators providing estimated development scenarios and financial projections; (e) deal management tools for tracking potential acquisitions, negotiations, and transactions; (f) property comparison and benchmarking analytics; (g) portfolio management and watchlist features; and (h) data export and reporting capabilities.
          </p>

          <h3 style={h3}>2.3 Data Sources</h3>
          <p style={p}>
            ZAAHI aggregates data from multiple sources including, but not limited to, the Dubai Land Department (DLD), Dubai Development Authority (DDA), Real Estate Regulatory Agency (RERA), Dubai Municipality, Abu Dhabi Department of Municipalities and Transport (DMT), MyLand portal, publicly available government registries, and other third-party data providers. While we strive to maintain data accuracy and timeliness, we do not guarantee that all information is complete, current, or error-free. Please refer to Section 7 (Data Sources and Accuracy) for detailed information about data limitations.
          </p>

          <h3 style={h3}>2.4 Service Availability</h3>
          <p style={p}>
            ZAAHI aims to provide continuous, uninterrupted access to the Platform; however, we do not guarantee that the Service will be available at all times. The Platform may be temporarily unavailable due to scheduled maintenance, system upgrades, server failures, telecommunications failures, acts of God, or other circumstances beyond our reasonable control. We reserve the right to modify, suspend, or discontinue any feature or component of the Service at any time with or without prior notice.
          </p>

          <h3 style={h3}>2.5 Geographic Scope</h3>
          <p style={p}>
            The Platform currently focuses on real estate markets within the United Arab Emirates (primarily Dubai and Abu Dhabi) and the Kingdom of Saudi Arabia. Coverage may expand to additional jurisdictions at our discretion. All property data, regulatory references, market analytics, and legal frameworks discussed on the Platform are specific to these covered jurisdictions unless explicitly stated otherwise. Users should not assume that information applicable to one jurisdiction applies equally to another.
          </p>

          {/* 3. ACCOUNT */}
          <h2 id="account" style={h2}>3. Account Registration and Security</h2>

          <h3 style={h3}>3.1 Account Creation</h3>
          <p style={p}>
            To access certain features of the Platform, you must create a ZAAHI account by providing accurate, current, and complete registration information as prompted by the registration form, including but not limited to your full legal name, valid email address, and such other information as may be required. All accounts are subject to approval by ZAAHI administration. Upon registration, your account will be placed in a pending approval status until reviewed and approved by our team. During the pending period, you will not have access to the Platform&apos;s protected features.
          </p>

          <h3 style={h3}>3.2 Account Security</h3>
          <p style={p}>
            You are solely responsible for maintaining the confidentiality of your account credentials, including your password and any other authentication information associated with your account. You agree to: (a) create a strong, unique password that you do not use for any other service; (b) immediately notify ZAAHI at info@zaahi.io of any unauthorized use of your account or any other breach of security; (c) ensure that you properly exit and log out from your account at the end of each session; and (d) not share your account credentials with any third party. ZAAHI shall not be liable for any loss or damage arising from your failure to comply with this provision.
          </p>

          <h3 style={h3}>3.3 Account Accuracy</h3>
          <p style={p}>
            You agree to maintain accurate, current, and complete information in your account profile at all times. Failure to do so may result in your inability to access and use the Platform or our termination of your account. You acknowledge that providing false, inaccurate, or misleading information constitutes a violation of these Terms and may result in immediate account termination. You may not create an account using a false identity or information, or on behalf of someone other than yourself without proper authorization.
          </p>

          <h3 style={h3}>3.4 One Account Per User</h3>
          <p style={p}>
            Each individual or entity is permitted only one active ZAAHI account unless otherwise authorized in writing by ZAAHI. Creating multiple accounts to circumvent restrictions, abuse promotional offers, or otherwise violate these Terms is strictly prohibited and may result in the termination of all associated accounts without prior notice.
          </p>

          {/* 4. LICENSE */}
          <h2 id="license" style={h2}>4. License and Access</h2>

          <h3 style={h3}>4.1 Limited License Grant</h3>
          <p style={p}>
            Subject to your compliance with these Terms, ZAAHI grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Platform solely for your internal business purposes or personal use in connection with real estate research, analysis, and investment evaluation. This license does not include any right to: (a) resell, redistribute, or commercially exploit the Platform or any portion thereof; (b) collect, aggregate, copy, duplicate, or display data from the Platform for the purpose of creating or contributing to a competing product or service; (c) use any data mining, robots, scrapers, or similar data-gathering or extraction methods on the Platform; or (d) modify, adapt, translate, decompile, disassemble, or reverse-engineer any aspect of the Platform.
          </p>

          <h3 style={h3}>4.2 Access Restrictions</h3>
          <p style={p}>
            Your access to and use of the Platform is conditioned upon your continued compliance with these Terms. ZAAHI reserves the right to revoke, suspend, or restrict your access at any time, with or without cause, and with or without prior notice. Without limiting the foregoing, ZAAHI specifically reserves the right to restrict access to any features, data, or functionalities that may be made available on a premium or paid subscription basis.
          </p>

          <h3 style={h3}>4.3 API Access</h3>
          <p style={p}>
            If ZAAHI provides you with access to application programming interfaces (APIs) or data feeds, such access is subject to additional terms, rate limits, and usage restrictions as communicated by ZAAHI. You may not exceed any rate limits imposed on your API access, and you must implement reasonable caching mechanisms to minimize redundant API calls. API keys and authentication tokens are confidential and must not be shared with unauthorized parties. ZAAHI reserves the right to throttle, suspend, or terminate API access at its sole discretion.
          </p>

          {/* 5. CONDUCT */}
          <h2 id="conduct" style={h2}>5. User Conduct</h2>

          <h3 style={h3}>5.1 Prohibited Activities</h3>
          <p style={p}>
            You agree not to engage in any of the following prohibited activities: (a) using the Platform for any illegal purpose or in violation of any local, state, national, or international law or regulation, including but not limited to laws governing anti-money laundering (AML), counter-terrorism financing (CTF), economic sanctions, and real estate transactions; (b) transmitting any viruses, worms, defects, Trojan horses, or any items of a destructive nature through the Platform; (c) attempting to gain unauthorized access to any portion of the Platform, other accounts, computer systems, or networks connected to the Platform through hacking, password mining, brute force, or any other means; (d) interfering with, disrupting, or placing an undue burden on the Platform or the networks or services connected to the Platform; (e) using automated means, including bots, crawlers, or scrapers, to access, monitor, or copy any content from the Platform without our prior written consent; (f) impersonating any person or entity, or falsely stating or otherwise misrepresenting your affiliation with a person or entity; (g) using the Platform to stalk, harass, bully, or harm another individual; (h) collecting or storing personal data about other users without their express consent; or (i) using the Platform in any manner that could disable, overburden, damage, or impair the site or interfere with any other party&apos;s use of the Platform.
          </p>

          <h3 style={h3}>5.2 Compliance with Laws</h3>
          <p style={p}>
            You agree to comply with all applicable laws, rules, and regulations in connection with your use of the Platform, including but not limited to the laws of the United Arab Emirates, the Dubai International Financial Centre (DIFC) regulations, the Abu Dhabi Global Market (ADGM) regulations, and any other applicable jurisdictional requirements. You are solely responsible for ensuring that your use of the Platform and any information obtained therefrom complies with all laws applicable to you.
          </p>

          <h3 style={h3}>5.3 User-Generated Content</h3>
          <p style={p}>
            To the extent the Platform allows you to submit, post, or share content (including but not limited to property listings, deal notes, comments, or other materials), you represent and warrant that: (a) you own or have the necessary rights and permissions to use and authorize the use of such content; (b) the content is accurate and not misleading; (c) the content does not violate these Terms or any applicable law; and (d) the content does not infringe upon the intellectual property, privacy, or other rights of any third party. You retain ownership of content you submit, but you grant ZAAHI a worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, modify, distribute, and display such content in connection with the operation and promotion of the Platform.
          </p>

          {/* 6. IP */}
          <h2 id="ip" style={h2}>6. Intellectual Property</h2>

          <h3 style={h3}>6.1 ZAAHI Ownership</h3>
          <p style={p}>
            The Platform and all of its content, features, and functionality (including but not limited to all information, software, source code, algorithms, data models, text, displays, images, video, audio, design, layout, look and feel, selection and arrangement thereof, 3D visualizations, map interfaces, the ZAAHI Signature building rendering system, and the underlying technology) are owned by ZAAHI, its licensors, or other providers and are protected by United Arab Emirates and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>

          <h3 style={h3}>6.2 Trademarks</h3>
          <p style={p}>
            The ZAAHI name, ZAAHI logo, ZAAHI Real Estate OS, and all related names, logos, product and service names, designs, and slogans are trademarks of ZAAHI or its affiliates. You must not use such marks without the prior written permission of ZAAHI. All other names, logos, product and service names, designs, and slogans on the Platform are the trademarks of their respective owners. Nothing in these Terms grants you any right to use any trademark, service mark, logo, or trade name of ZAAHI or any third party.
          </p>

          <h3 style={h3}>6.3 Data Visualization and Derived Works</h3>
          <p style={p}>
            The specific manner in which ZAAHI compiles, organizes, analyzes, visualizes, and presents data on the Platform (including 3D building models, map layers, color schemes, land use classifications, analytics dashboards, and feasibility reports) constitutes proprietary work product of ZAAHI. While underlying government data may be publicly available, the specific compilation, presentation, analytical framework, and visual representation created by ZAAHI are protected intellectual property.
          </p>

          <h3 style={h3}>6.4 Feedback</h3>
          <p style={p}>
            If you provide any feedback, suggestions, ideas, or recommendations to ZAAHI regarding the Platform or any of its features (&ldquo;Feedback&rdquo;), you hereby assign to ZAAHI all rights in and to such Feedback and agree that ZAAHI shall have the right to use and fully exploit such Feedback in any manner and for any purpose without obligation, restriction, or compensation to you. You agree that ZAAHI is not obligated to implement any Feedback you provide.
          </p>

          <h3 style={h3}>6.5 DMCA and Copyright Complaints</h3>
          <p style={p}>
            If you believe that any content on the Platform infringes upon your copyright or other intellectual property rights, please contact us at info@zaahi.io with a detailed description of the alleged infringement, including identification of the copyrighted work, the infringing material, and your contact information. We will investigate all claims of intellectual property infringement and take appropriate action in accordance with applicable law.
          </p>

          {/* 7. DATA SOURCES */}
          <h2 id="data-sources" style={h2}>7. Data Sources and Accuracy</h2>

          <h3 style={h3}>7.1 Government and Public Sources</h3>
          <p style={p}>
            The Platform incorporates data from various government and public sources, including but not limited to the Dubai Land Department (DLD), Dubai Development Authority (DDA), Real Estate Regulatory Agency (RERA), Dubai Municipality, the MyLand portal, Oqood registration system, Ejari rental registration system, and Abu Dhabi Department of Municipalities and Transport (DMT). Data from these sources is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We make no representation or warranty as to the accuracy, completeness, timeliness, reliability, or suitability of such data for any particular purpose.
          </p>

          <h3 style={h3}>7.2 Data Limitations</h3>
          <p style={p}>
            You acknowledge and agree that: (a) government data may contain errors, omissions, or outdated information; (b) property boundaries, plot dimensions, areas, and geographic coordinates as displayed on the Platform are approximate and may not reflect exact surveyed measurements; (c) zoning, land use classifications, and development permissions may have changed since the data was last updated; (d) property ownership information, valuations, and transaction histories may be incomplete or outdated; (e) regulatory requirements, building codes, and development guidelines are subject to change without notice; and (f) data synchronization between the Platform and government sources may be subject to delays. The Platform should not be relied upon as the sole basis for any real estate transaction, investment decision, or regulatory compliance determination.
          </p>

          <h3 style={h3}>7.3 No Professional Verification</h3>
          <p style={p}>
            ZAAHI does not independently verify the accuracy of data obtained from government or third-party sources. We do not employ licensed surveyors, appraisers, or valuers to validate the property data displayed on the Platform. Any property dimensions, areas, valuations, or other measurements displayed on the Platform should be independently verified by qualified professionals before being relied upon for any purpose, including but not limited to purchase decisions, financing, or development planning.
          </p>

          <h3 style={h3}>7.4 User Verification Obligation</h3>
          <p style={p}>
            You are solely responsible for independently verifying any and all information obtained from the Platform before making any decisions or taking any actions based on such information. This includes, without limitation, verifying property boundaries and dimensions with a licensed surveyor, confirming ownership status with the Dubai Land Department or relevant authority, validating zoning and land use classifications with the appropriate regulatory body, and obtaining professional legal, financial, and investment advice before entering into any transaction.
          </p>

          {/* 8. FEASIBILITY */}
          <h2 id="feasibility" style={h2}>8. Feasibility Calculator Disclaimer</h2>

          <h3 style={h3}>8.1 Estimation Tool Only</h3>
          <p style={p}>
            The ZAAHI Feasibility Calculator is provided as an estimation and scenario-planning tool for informational purposes only. It is designed to help users explore potential development scenarios by applying standardized assumptions and market benchmarks to property data. The calculator generates hypothetical projections based on the inputs provided and should not be construed as, or relied upon as, financial advice, investment advice, an appraisal, a valuation, or a recommendation to purchase, develop, or invest in any property.
          </p>

          <h3 style={h3}>8.2 Standardized Assumptions</h3>
          <p style={p}>
            The Feasibility Calculator uses standardized assumptions for construction costs, development timelines, financing rates, absorption rates, market rents, capitalization rates, and other variables that may not accurately reflect conditions specific to any particular property, location, or project. These assumptions are based on general market benchmarks and may differ significantly from actual conditions. Users should replace default assumptions with their own research and professional estimates before making any decisions based on calculator outputs.
          </p>

          <h3 style={h3}>8.3 Not Financial Advice</h3>
          <p style={p}>
            ZAAHI is not a licensed financial advisor, investment advisor, real estate broker, appraiser, or valuer. The Feasibility Calculator does not take into account your individual financial situation, risk tolerance, investment objectives, tax circumstances, or other personal factors. The projections generated by the calculator should not be treated as predictions of actual financial outcomes. Past market performance reflected in calculator assumptions does not guarantee or indicate future results. Always consult with qualified, licensed professionals before making any investment decisions.
          </p>

          <h3 style={h3}>8.4 Actual Results May Vary</h3>
          <p style={p}>
            Actual development costs, timelines, revenues, returns, and other financial outcomes may differ materially from the projections generated by the Feasibility Calculator due to factors including but not limited to: changes in market conditions, construction cost fluctuations, regulatory changes, unforeseen site conditions, financing availability and terms, interest rate changes, currency exchange fluctuations, force majeure events, and other risks inherent in real estate development. ZAAHI disclaims all liability for any losses, damages, or costs arising from reliance on the Feasibility Calculator&apos;s outputs.
          </p>

          {/* 9. THIRD PARTY */}
          <h2 id="third-party" style={h2}>9. Third-Party Services</h2>

          <h3 style={h3}>9.1 Third-Party Integrations</h3>
          <p style={p}>
            The Platform may contain links to, or integrations with, third-party websites, services, or applications (collectively, &ldquo;Third-Party Services&rdquo;), including but not limited to authentication providers (Supabase), hosting services (Vercel), mapping services (MapLibre), payment processors, and blockchain networks (Polygon, Ethereum). These Third-Party Services are not under the control of ZAAHI, and we are not responsible for the content, accuracy, availability, policies, or practices of any Third-Party Services. The inclusion of any link or integration does not imply endorsement, approval, or warranty by ZAAHI of the linked Third-Party Service.
          </p>

          <h3 style={h3}>9.2 Third-Party Terms</h3>
          <p style={p}>
            Your use of Third-Party Services is governed by the terms and conditions and privacy policies of those services, not by these Terms. We encourage you to read the terms and privacy policies of any Third-Party Services you access through the Platform. ZAAHI shall not be liable for any damages, losses, or expenses caused or alleged to be caused by or in connection with your use of, or reliance on, any Third-Party Services.
          </p>

          <h3 style={h3}>9.3 Government Portals</h3>
          <p style={p}>
            References to or data derived from government portals and registries (including DLD, DDA, RERA, MyLand, and similar authorities) on the Platform do not imply any affiliation with, endorsement by, or partnership with those government entities. ZAAHI is an independent technology platform and is not affiliated with, authorized by, or officially connected to any government authority or regulatory body in the UAE or Saudi Arabia unless explicitly stated otherwise.
          </p>

          {/* 10. PAYMENT */}
          <h2 id="payment" style={h2}>10. Payment Terms</h2>

          <h3 style={h3}>10.1 Subscription Plans</h3>
          <p style={p}>
            Certain features and functionalities of the Platform may be offered on a paid subscription basis. ZAAHI reserves the right to introduce, modify, or discontinue subscription plans, pricing tiers, and feature entitlements at any time. Current pricing and plan details will be made available on the Platform. By subscribing to a paid plan, you agree to pay the applicable fees as described at the time of your subscription.
          </p>

          <h3 style={h3}>10.2 Billing and Payment</h3>
          <p style={p}>
            Paid subscriptions will be billed in advance on a recurring basis (monthly or annually, as selected by you) at the then-current subscription rate. You authorize ZAAHI to charge your designated payment method for all applicable fees. All fees are exclusive of applicable taxes, levies, and duties, which you are responsible for paying. Prices are denominated in United Arab Emirates Dirhams (AED) or United States Dollars (USD) as indicated on the Platform.
          </p>

          <h3 style={h3}>10.3 Transaction Fees</h3>
          <p style={p}>
            In addition to subscription fees, ZAAHI may charge transaction-based fees for certain services, including but not limited to deal facilitation, document processing, API usage beyond free-tier limits, and premium data access. Transaction fees will be clearly disclosed before any chargeable action is initiated. The applicable fee schedule will be published on the Platform and may be updated from time to time.
          </p>

          <h3 style={h3}>10.4 Refund Policy</h3>
          <p style={p}>
            All subscription fees are non-refundable except as required by applicable law or as expressly provided in a separate written agreement between you and ZAAHI. If you cancel your subscription, you will continue to have access to the paid features until the end of your current billing period, after which your access will revert to the free tier. No partial refunds or credits will be provided for unused portions of a subscription period.
          </p>

          <h3 style={h3}>10.5 Late Payment and Suspension</h3>
          <p style={p}>
            If ZAAHI is unable to process payment through your designated payment method, we may suspend your access to paid features until payment is received. We may also charge late payment fees or interest on overdue amounts as permitted by applicable law. Accounts with outstanding balances for more than thirty (30) days may be terminated at ZAAHI&apos;s discretion.
          </p>

          {/* 11. DISCLAIMERS */}
          <h2 id="disclaimers" style={h2}>11. Disclaimers and Limitation of Liability</h2>

          <h3 style={h3}>11.1 Disclaimer of Warranties</h3>
          <p style={caps}>
            THE PLATFORM AND ALL CONTENT, DATA, INFORMATION, SERVICES, FEATURES, TOOLS, CALCULATIONS, PROJECTIONS, AND MATERIALS AVAILABLE THROUGH THE PLATFORM ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, TITLE, ACCURACY, COMPLETENESS, RELIABILITY, TIMELINESS, OR AVAILABILITY. ZAAHI DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>

          <h3 style={h3}>11.2 Limitation of Liability</h3>
          <p style={caps}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ZAAHI, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, CONTRACTORS, LICENSORS, SERVICE PROVIDERS, SUBCONTRACTORS, SUPPLIERS, INTERNS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, REVENUE, DATA, GOODWILL, USE, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE PLATFORM, REGARDLESS OF WHETHER SUCH DAMAGES ARE BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY, AND REGARDLESS OF WHETHER ZAAHI HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>

          <h3 style={h3}>11.3 Liability Cap</h3>
          <p style={caps}>
            IN NO EVENT SHALL THE TOTAL AGGREGATE LIABILITY OF ZAAHI TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR YOUR USE OF THE PLATFORM EXCEED THE GREATER OF: (A) THE TOTAL FEES PAID BY YOU TO ZAAHI DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM; OR (B) ONE HUNDRED UNITED STATES DOLLARS (USD $100.00). THE EXISTENCE OF MULTIPLE CLAIMS SHALL NOT ENLARGE THIS LIMITATION.
          </p>

          <h3 style={h3}>11.4 Basis of the Bargain</h3>
          <p style={p}>
            You acknowledge and agree that the limitations of liability set forth in this Section 11 are fundamental elements of the basis of the bargain between ZAAHI and you. ZAAHI would not be able to provide the Platform on an economically reasonable basis without such limitations. The limitations of liability in this section shall apply to the fullest extent permitted by applicable law in the applicable jurisdiction.
          </p>

          {/* 12. INDEMNIFICATION */}
          <h2 id="indemnification" style={h2}>12. Indemnification</h2>

          <h3 style={h3}>12.1 Your Indemnification Obligations</h3>
          <p style={p}>
            You agree to indemnify, defend, and hold harmless ZAAHI and its directors, officers, employees, agents, partners, contractors, licensors, service providers, subcontractors, suppliers, interns, and affiliates from and against any and all claims, demands, actions, suits, liabilities, losses, damages, judgments, settlements, penalties, fines, costs, and expenses (including without limitation reasonable attorneys&apos; fees and court costs) arising out of or related to: (a) your use of, or access to, the Platform; (b) your violation of these Terms or any applicable law or regulation; (c) your violation of any rights of a third party, including without limitation any intellectual property, privacy, or contractual rights; (d) any content you submit, post, or share through the Platform; (e) any real estate transaction, investment decision, or other action taken by you based on information obtained from the Platform; or (f) any negligent or wrongful act or omission by you in connection with your use of the Platform.
          </p>

          <h3 style={h3}>12.2 Indemnification Procedure</h3>
          <p style={p}>
            ZAAHI reserves the right to assume the exclusive defense and control of any matter subject to indemnification by you, in which event you agree to cooperate fully with ZAAHI in asserting any available defenses. You agree not to settle any claim that is subject to indemnification under this section without the prior written consent of ZAAHI. ZAAHI will make reasonable efforts to notify you of any such claim, action, or proceeding upon becoming aware of it.
          </p>

          {/* 13. GOVERNING LAW */}
          <h2 id="governing-law" style={h2}>13. Governing Law</h2>

          <h3 style={h3}>13.1 Applicable Law</h3>
          <p style={p}>
            These Terms and any disputes arising out of or related to these Terms or your use of the Platform shall be governed by and construed in accordance with the federal laws of the United Arab Emirates and the applicable local laws of the Emirate of Dubai, without regard to conflict of laws principles. To the extent that any provision of these Terms conflicts with mandatory provisions of UAE federal law, the mandatory provisions shall prevail.
          </p>

          <h3 style={h3}>13.2 Jurisdiction</h3>
          <p style={p}>
            Subject to Section 14 (Dispute Resolution), you agree that any legal action or proceeding relating to these Terms or your access to or use of the Platform shall be brought exclusively in the courts of the Dubai International Financial Centre (DIFC) or the competent courts of the Emirate of Dubai, United Arab Emirates. You hereby irrevocably consent to the personal jurisdiction and venue of such courts and waive any objection to such jurisdiction or venue on the grounds of inconvenient forum or otherwise.
          </p>

          {/* 14. DISPUTES */}
          <h2 id="disputes" style={h2}>14. Dispute Resolution</h2>

          <h3 style={h3}>14.1 Informal Resolution</h3>
          <p style={p}>
            Before initiating any formal dispute resolution proceedings, you agree to first attempt to resolve any dispute, controversy, or claim arising out of or relating to these Terms or the Platform (a &ldquo;Dispute&rdquo;) informally by contacting ZAAHI at info@zaahi.io. The parties shall use good faith efforts to resolve the Dispute informally within thirty (30) calendar days from the date of the initial communication.
          </p>

          <h3 style={h3}>14.2 Mediation</h3>
          <p style={p}>
            If the Dispute cannot be resolved through informal negotiation within the thirty (30) day period, either party may refer the Dispute to mediation administered by the DIFC-LCIA Arbitration Centre (or its successor) in accordance with its mediation rules then in effect. The mediation shall take place in Dubai, United Arab Emirates, and shall be conducted in the English language. The costs of mediation shall be shared equally between the parties unless otherwise agreed or determined by the mediator.
          </p>

          <h3 style={h3}>14.3 Arbitration</h3>
          <p style={p}>
            If the Dispute is not resolved through mediation within sixty (60) calendar days from the commencement of mediation proceedings (or such longer period as the parties may agree), either party may refer the Dispute to final and binding arbitration administered by the DIFC-LCIA Arbitration Centre in accordance with its arbitration rules then in effect. The arbitration shall be conducted by a sole arbitrator appointed in accordance with the rules of the DIFC-LCIA Arbitration Centre. The seat of arbitration shall be the Dubai International Financial Centre, Dubai, United Arab Emirates. The language of arbitration shall be English. The arbitrator&apos;s award shall be final, binding, and enforceable in any court of competent jurisdiction.
          </p>

          <h3 style={h3}>14.4 Exceptions</h3>
          <p style={p}>
            Notwithstanding the foregoing dispute resolution provisions, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of a party&apos;s copyrights, trademarks, trade secrets, patents, or other intellectual property rights. Nothing in this section shall prevent ZAAHI from seeking urgent interim or conservatory measures from any court of competent jurisdiction pending the final resolution of a Dispute through arbitration.
          </p>

          <h3 style={h3}>14.5 Class Action Waiver</h3>
          <p style={p}>
            To the fullest extent permitted by applicable law, you agree that any Dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. If for any reason a Dispute proceeds in court rather than through arbitration, you waive any right to a jury trial and agree that any such proceeding will be conducted solely on an individual basis.
          </p>

          {/* 15. MODIFICATIONS */}
          <h2 id="modifications" style={h2}>15. Modifications to Terms</h2>

          <h3 style={h3}>15.1 Right to Modify</h3>
          <p style={p}>
            ZAAHI reserves the right to modify, amend, or update these Terms at any time at its sole discretion. We will provide notice of material changes by posting the updated Terms on the Platform and updating the &ldquo;Last Updated&rdquo; date at the top of this page. For material changes that significantly affect your rights or obligations, we may also provide notice through email, in-app notifications, or other prominent means of communication.
          </p>

          <h3 style={h3}>15.2 Acceptance of Modifications</h3>
          <p style={p}>
            Your continued use of the Platform following the posting of any modifications to these Terms constitutes your acceptance of and agreement to such modifications. If you do not agree with any modified Terms, you must discontinue using the Platform and terminate your account. It is your responsibility to review these Terms periodically to stay informed of any updates. We recommend bookmarking this page and checking it regularly.
          </p>

          {/* 16. TERMINATION */}
          <h2 id="termination" style={h2}>16. Termination</h2>

          <h3 style={h3}>16.1 Termination by You</h3>
          <p style={p}>
            You may terminate your account and stop using the Platform at any time by contacting us at info@zaahi.io with a request to delete your account. Upon termination, your right to access and use the Platform will immediately cease. Termination of your account does not relieve you of any obligations incurred prior to termination, including but not limited to any outstanding payment obligations, indemnification obligations, and representations and warranties made during your use of the Platform.
          </p>

          <h3 style={h3}>16.2 Termination by ZAAHI</h3>
          <p style={p}>
            ZAAHI may suspend or terminate your account and access to the Platform at any time, with or without cause, and with or without notice. Without limiting the foregoing, ZAAHI may terminate or suspend your account if: (a) you breach any provision of these Terms; (b) you engage in fraudulent, abusive, or illegal activity; (c) we are required to do so by law or legal process; (d) we discontinue or materially modify the Platform; (e) continued provision of the Service to you is no longer commercially viable; or (f) your account has been inactive for a period exceeding twelve (12) consecutive months.
          </p>

          <h3 style={h3}>16.3 Effect of Termination</h3>
          <p style={p}>
            Upon termination: (a) your license to access and use the Platform is immediately revoked; (b) you must cease all use of the Platform; (c) any data associated with your account may be deleted after a reasonable retention period in accordance with our Privacy Policy; and (d) the following sections of these Terms shall survive termination: Sections 6 (Intellectual Property), 7 (Data Sources and Accuracy), 8 (Feasibility Calculator Disclaimer), 11 (Disclaimers and Limitation of Liability), 12 (Indemnification), 13 (Governing Law), 14 (Dispute Resolution), and this Section 16.3.
          </p>

          {/* 17. SEVERABILITY */}
          <h2 id="severability" style={h2}>17. Severability</h2>

          <p style={p}>
            If any provision of these Terms is held to be invalid, illegal, void, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, or if it cannot be so modified, it shall be deemed severed from these Terms without affecting the validity and enforceability of the remaining provisions. The remaining provisions of these Terms shall continue in full force and effect. The invalidity or unenforceability of any provision in a particular jurisdiction shall not affect the validity or enforceability of such provision in any other jurisdiction where it is valid and enforceable.
          </p>

          {/* 18. ENTIRE AGREEMENT */}
          <h2 id="entire-agreement" style={h2}>18. Entire Agreement</h2>

          <p style={p}>
            These Terms, together with the Privacy Policy and the Investment Disclaimer (each as updated from time to time), constitute the entire agreement between you and ZAAHI with respect to your access to and use of the Platform and supersede all prior or contemporaneous understandings, agreements, representations, and warranties, both written and oral, with respect to such subject matter. No waiver of any term or condition of these Terms shall be deemed a further or continuing waiver of such term or condition or a waiver of any other term or condition, and any failure of ZAAHI to assert a right or provision under these Terms shall not constitute a waiver of such right or provision. If any provision of these Terms is held by a court or other tribunal of competent jurisdiction to be invalid, illegal, or unenforceable for any reason, such provision shall be eliminated or limited to the minimum extent such that the remaining provisions of these Terms will continue in full force and effect.
          </p>

          {/* 19. CONTACT */}
          <h2 id="contact" style={h2}>19. Contact Information</h2>

          <p style={p}>
            If you have any questions, concerns, or comments about these Terms of Service, please contact us at:
          </p>

          <div
            style={{
              background: 'rgba(200, 169, 110, 0.06)',
              border: '1px solid rgba(200, 169, 110, 0.15)',
              borderRadius: 8,
              padding: '20px 24px',
              marginTop: 12,
              marginBottom: 24,
            }}
          >
            <p style={{ ...p, marginBottom: 6, fontWeight: 600, color: '#fff' }}>
              ZAAHI Real Estate OS
            </p>
            <p style={{ ...p, marginBottom: 6 }}>
              Email:{' '}
              <a href="mailto:info@zaahi.io" style={{ color: GOLD, textDecoration: 'none' }}>
                info@zaahi.io
              </a>
            </p>
            <p style={{ ...p, marginBottom: 6 }}>
              Website:{' '}
              <a href="https://zaahi.io" style={{ color: GOLD, textDecoration: 'none' }}>
                zaahi.io
              </a>
            </p>
            <p style={{ ...p, marginBottom: 0 }}>
              Jurisdiction: Dubai, United Arab Emirates
            </p>
          </div>

          <p style={{ ...p, color: TEXT_DIM, fontSize: 13, marginTop: 32, fontStyle: 'italic' }}>
            By using ZAAHI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, our Privacy Policy, and our Investment Disclaimer.
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
