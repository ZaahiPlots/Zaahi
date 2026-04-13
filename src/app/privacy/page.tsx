'use client';

import LegalNavbar from '@/components/LegalNavbar';
import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';

const GOLD = '#C8A96E';
const BG = '#0A0F1E';
const TEXT = 'rgba(255,255,255,0.85)';
const TEXT_DIM = 'rgba(255,255,255,0.55)';

const sections = [
  { id: 'introduction', num: '1', title: 'Introduction' },
  { id: 'information-collected', num: '2', title: 'Information We Collect' },
  { id: 'how-we-use', num: '3', title: 'How We Use Your Information' },
  { id: 'legal-basis', num: '4', title: 'Legal Basis for Processing' },
  { id: 'data-sharing', num: '5', title: 'Data Sharing and Disclosure' },
  { id: 'data-retention', num: '6', title: 'Data Retention' },
  { id: 'your-rights', num: '7', title: 'Your Rights Under UAE PDPL' },
  { id: 'cookies', num: '8', title: 'Cookies and Tracking Technologies' },
  { id: 'international-transfers', num: '9', title: 'International Data Transfers' },
  { id: 'children', num: '10', title: "Children's Privacy" },
  { id: 'security', num: '11', title: 'Security Measures' },
  { id: 'changes', num: '12', title: 'Changes to This Privacy Policy' },
  { id: 'contact', num: '13', title: 'Contact Information' },
];

export default function PrivacyPage() {
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
                transition: 'all 0.2s ease',
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
              Privacy Policy
            </h1>
            <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.6 }}>
              <span>Last Updated: April 13, 2026</span>
              <span style={{ margin: '0 12px' }}>|</span>
              <span>Effective Date: April 13, 2026</span>
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'inline-block',
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: GOLD,
                background: 'rgba(200, 169, 110, 0.08)',
                border: '1px solid rgba(200, 169, 110, 0.2)',
                borderRadius: 4,
                letterSpacing: 0.5,
              }}
            >
              UAE PDPL Compliant
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

          {/* 1. INTRODUCTION */}
          <h2 id="introduction" style={h2}>1. Introduction</h2>

          <h3 style={h3}>1.1 Overview</h3>
          <p style={p}>
            ZAAHI Real Estate OS (&ldquo;ZAAHI,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting the privacy and security of your personal data. This Privacy Policy describes how we collect, use, process, store, share, and protect your personal information when you access or use the ZAAHI platform, including our website at zaahi.io, mobile applications, APIs, and all related services (collectively, the &ldquo;Platform&rdquo;).
          </p>

          <h3 style={h3}>1.2 Scope</h3>
          <p style={p}>
            This Privacy Policy applies to all personal data collected through the Platform, regardless of the device, browser, or method you use to access it. This policy also applies to personal data we receive from third-party sources in connection with providing the Service. It does not apply to information collected by third-party websites, services, or applications that may be linked to or integrated with the Platform, each of which may have their own privacy policies and practices.
          </p>

          <h3 style={h3}>1.3 Legal Framework</h3>
          <p style={p}>
            This Privacy Policy has been prepared in accordance with the UAE Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data (the &ldquo;PDPL&rdquo;), its implementing regulations, and other applicable data protection laws and regulations in the United Arab Emirates, including the DIFC Data Protection Law (DIFC Law No. 5 of 2020) and the ADGM Data Protection Regulations 2021, to the extent applicable. Where we process the personal data of individuals located in the European Union or European Economic Area, we also comply with the General Data Protection Regulation (EU) 2016/679 (&ldquo;GDPR&rdquo;) to the extent applicable.
          </p>

          <h3 style={h3}>1.4 Data Controller</h3>
          <p style={p}>
            ZAAHI Real Estate OS, operating from Dubai, United Arab Emirates, is the data controller responsible for your personal data processed through the Platform. As data controller, we determine the purposes and means of processing your personal data and are accountable for ensuring that such processing complies with applicable data protection laws.
          </p>

          {/* 2. INFORMATION WE COLLECT */}
          <h2 id="information-collected" style={h2}>2. Information We Collect</h2>

          <h3 style={h3}>2.1 Account Registration Data</h3>
          <p style={p}>
            When you create an account on the Platform, we collect the following personal information: your full name, email address, password (stored in encrypted/hashed form), phone number (if provided), company or organization name (if applicable), professional role or title (if provided), and such other information as may be required during the registration process. This information is necessary to create and maintain your account, verify your identity, and provide you with access to the Platform&apos;s features.
          </p>

          <h3 style={h3}>2.2 Usage Data</h3>
          <p style={p}>
            We automatically collect information about your interactions with the Platform, including: pages and features you access; properties, parcels, and listings you view, search for, or save; filters, parameters, and search queries you use; feasibility calculator inputs and configuration selections; deal management activities; time spent on various pages and features; clickstream data and navigation patterns; referral sources and exit pages; and frequency and duration of your visits. This usage data helps us understand how the Platform is being used and allows us to improve our services.
          </p>

          <h3 style={h3}>2.3 Device and Technical Data</h3>
          <p style={p}>
            We collect technical information about the device and connection you use to access the Platform, including: your device type, model, and operating system; browser type and version; screen resolution and display settings; IP address; approximate geographic location derived from your IP address (city or region level); language preferences; time zone settings; and unique device identifiers. This information is collected through standard web technologies and helps us optimize the Platform&apos;s performance across different devices and configurations.
          </p>

          <h3 style={h3}>2.4 Location Data</h3>
          <p style={p}>
            With your consent, we may collect precise location data from your device to provide location-based features such as nearby parcel search, map centering, and location-relevant property recommendations. You can control location sharing through your device settings or browser permissions at any time. We also derive approximate location information from your IP address, which does not require separate consent and is used for analytics, security, and compliance purposes.
          </p>

          <h3 style={h3}>2.5 Communication Data</h3>
          <p style={p}>
            When you contact us through email, support channels, or other communication methods, we collect and retain the content of your messages, your contact information, and any attachments or supporting materials you provide. If you participate in surveys, promotions, or feedback programs, we collect the information you provide in connection with those activities. This data is used to respond to your inquiries, improve our services, and maintain records of our communications.
          </p>

          <h3 style={h3}>2.6 Cookies and Similar Technologies</h3>
          <p style={p}>
            We use cookies, local storage, session storage, and similar tracking technologies to collect and store certain information when you use the Platform. For detailed information about the types of cookies we use and how to manage your cookie preferences, please refer to Section 8 (Cookies and Tracking Technologies) of this Privacy Policy.
          </p>

          {/* 3. HOW WE USE */}
          <h2 id="how-we-use" style={h2}>3. How We Use Your Information</h2>

          <h3 style={h3}>3.1 Platform Delivery and Operations</h3>
          <p style={p}>
            We use your personal data to: create and manage your account; authenticate your identity and authorize access to the Platform; provide, operate, and maintain the Platform&apos;s features and functionality; process transactions and manage billing (for paid subscriptions); deliver personalized property recommendations and search results; generate feasibility reports and analytics based on your inputs; facilitate deal management and portfolio tracking; send transactional communications such as account verification, password resets, billing confirmations, and service notifications; and provide customer support and respond to your inquiries.
          </p>

          <h3 style={h3}>3.2 Platform Improvement and Development</h3>
          <p style={p}>
            We use aggregated and anonymized usage data to: analyze trends, usage patterns, and user behavior to improve the Platform; develop new features, products, and services; conduct internal research and analysis; test and optimize Platform performance, including user interface design, page load times, and feature effectiveness; and train and improve our data models and algorithms. When used for these purposes, data is aggregated in a manner that does not identify individual users.
          </p>

          <h3 style={h3}>3.3 Communications</h3>
          <p style={p}>
            We may use your email address and other contact information to send you: service-related notifications and updates (account activity, security alerts, policy changes); product announcements and feature updates; market insights, property alerts, and industry reports (with your consent); promotional materials and offers related to ZAAHI services (with your consent); and surveys and feedback requests. You may opt out of non-essential communications at any time by clicking the unsubscribe link in any email or by contacting us at info@zaahi.io.
          </p>

          <h3 style={h3}>3.4 Security and Fraud Prevention</h3>
          <p style={p}>
            We process personal data as necessary to: detect, prevent, and investigate security incidents, fraud, and unauthorized access; monitor for suspicious activity, abnormal usage patterns, and potential abuse of the Platform; enforce our Terms of Service and other policies; verify user identity and prevent account takeover; comply with anti-money laundering (AML), counter-terrorism financing (CTF), and know-your-customer (KYC) requirements; and maintain the security, integrity, and availability of the Platform.
          </p>

          <h3 style={h3}>3.5 Legal Compliance</h3>
          <p style={p}>
            We process personal data as necessary to comply with applicable legal obligations, including: responding to lawful requests from law enforcement authorities, courts, and regulatory agencies; fulfilling reporting obligations under UAE law and regulations; maintaining records as required by applicable tax, accounting, and corporate governance laws; exercising and defending legal claims; and complying with the requirements of the PDPL and other applicable data protection laws.
          </p>

          {/* 4. LEGAL BASIS */}
          <h2 id="legal-basis" style={h2}>4. Legal Basis for Processing</h2>

          <h3 style={h3}>4.1 Consent</h3>
          <p style={p}>
            For certain processing activities, we rely on your explicit consent as the legal basis for processing your personal data. This includes: sending you marketing and promotional communications; collecting precise location data from your device; using non-essential cookies and tracking technologies; and processing sensitive personal data, if any. Where consent is the basis for processing, you have the right to withdraw your consent at any time. Withdrawal of consent does not affect the lawfulness of processing that occurred prior to such withdrawal.
          </p>

          <h3 style={h3}>4.2 Contractual Necessity</h3>
          <p style={p}>
            We process your personal data where it is necessary for the performance of the contract between you and ZAAHI (i.e., our Terms of Service), including: creating and managing your account; providing access to the Platform&apos;s features; processing payments for subscription services; providing customer support; and sending essential service-related communications. Without this processing, we would not be able to provide you with the requested services.
          </p>

          <h3 style={h3}>4.3 Legitimate Interests</h3>
          <p style={p}>
            We process your personal data where it is necessary for our legitimate interests or the legitimate interests of a third party, provided that such interests are not overridden by your data protection rights and freedoms. Our legitimate interests include: improving and optimizing the Platform; analyzing usage patterns and user behavior for service improvement; detecting and preventing fraud, security threats, and abuse; maintaining the security and integrity of our systems; and conducting business analytics and research.
          </p>

          <h3 style={h3}>4.4 Legal Obligation</h3>
          <p style={p}>
            We process your personal data where it is necessary for compliance with a legal obligation to which ZAAHI is subject, including: complying with applicable UAE laws and regulations; responding to lawful requests from law enforcement and regulatory authorities; maintaining records as required by tax, accounting, and corporate governance laws; and reporting obligations under AML, CTF, and sanctions legislation.
          </p>

          {/* 5. DATA SHARING */}
          <h2 id="data-sharing" style={h2}>5. Data Sharing and Disclosure</h2>

          <h3 style={h3}>5.1 No Sale of Personal Data</h3>
          <p style={p}>
            ZAAHI does not sell, rent, trade, or otherwise monetize your personal data to third parties for their independent use. We only share your personal data in the limited circumstances described in this section.
          </p>

          <h3 style={h3}>5.2 Service Providers</h3>
          <p style={p}>
            We share personal data with trusted third-party service providers who assist us in operating and delivering the Platform. These service providers include: Supabase (database hosting and authentication services, hosted in Frankfurt, EU-Central-1); Vercel (website hosting and content delivery, global edge network); email service providers for transactional and marketing communications; payment processors for subscription billing; analytics providers for aggregated usage analysis; and cloud infrastructure providers for data storage and computing. All service providers are contractually bound to protect your personal data and may only use it for the purposes specified by ZAAHI. We conduct due diligence on all service providers to ensure they maintain appropriate security measures and data protection standards.
          </p>

          <h3 style={h3}>5.3 Legal Requirements</h3>
          <p style={p}>
            We may disclose your personal data to third parties when we believe in good faith that such disclosure is necessary to: comply with applicable law, regulation, legal process, or governmental request; enforce our Terms of Service, Privacy Policy, or other agreements; protect the rights, property, or safety of ZAAHI, our users, or the public; detect, prevent, or address fraud, security issues, or technical problems; or respond to an emergency that poses a threat to the rights, property, or personal safety of any person.
          </p>

          <h3 style={h3}>5.4 Business Transfers</h3>
          <p style={p}>
            In the event of a merger, acquisition, reorganization, sale of assets, joint venture, assignment, transfer, or other disposition of all or any portion of ZAAHI&apos;s business, assets, or operations (including in connection with any bankruptcy or similar proceedings), your personal data may be among the assets transferred. In such circumstances, we will take reasonable steps to ensure that the successor entity is bound by privacy protections at least as protective as those in this Privacy Policy, and we will notify you of such transfer.
          </p>

          <h3 style={h3}>5.5 Anonymized and Aggregated Data</h3>
          <p style={p}>
            We may share anonymized, aggregated, or de-identified data that cannot reasonably be used to identify you with third parties for research, analytics, market reporting, industry benchmarking, and other purposes. This data does not constitute personal data and is not subject to the restrictions of this Privacy Policy.
          </p>

          {/* 6. DATA RETENTION */}
          <h2 id="data-retention" style={h2}>6. Data Retention</h2>

          <h3 style={h3}>6.1 Retention Periods</h3>
          <p style={p}>
            We retain your personal data for as long as your account is active and as necessary to fulfill the purposes for which it was collected, as described in this Privacy Policy. Specifically: account registration data is retained for the duration of your account and for a period of twelve (12) months after account deletion to comply with legal and regulatory requirements; usage data and analytics are retained in identifiable form for up to twenty-four (24) months, after which they are anonymized; communication records are retained for up to thirty-six (36) months after the date of the communication; and technical and device data are retained for up to twelve (12) months.
          </p>

          <h3 style={h3}>6.2 Account Deletion</h3>
          <p style={p}>
            Upon receiving a valid account deletion request, we will: deactivate your account within five (5) business days; delete or anonymize your personal data within thirty (30) calendar days of the deactivation date, except where retention is required by law; and confirm the deletion to you via email. Please note that certain data may be retained in encrypted backup systems for a reasonable period following deletion, after which it will be permanently removed through normal backup rotation cycles.
          </p>

          <h3 style={h3}>6.3 Legal Retention Requirements</h3>
          <p style={p}>
            Notwithstanding the above, we may retain certain personal data for longer periods as required by applicable law, including: financial and transaction records as required by UAE tax and accounting laws; data required for ongoing legal proceedings or disputes; records necessary for compliance with AML, CTF, and sanctions regulations; and data retained pursuant to a valid legal hold or preservation notice from a law enforcement authority or court. Anonymized data that cannot be used to identify individuals may be retained indefinitely for statistical, research, and analytics purposes.
          </p>

          {/* 7. YOUR RIGHTS */}
          <h2 id="your-rights" style={h2}>7. Your Rights Under UAE PDPL</h2>

          <p style={p}>
            Under the UAE Personal Data Protection Law (PDPL) and, where applicable, other data protection regulations, you have the following rights with respect to your personal data:
          </p>

          <h3 style={h3}>7.1 Right of Access</h3>
          <p style={p}>
            You have the right to request confirmation of whether we process your personal data and, if so, to obtain access to that data along with information about the purposes of processing, the categories of data processed, the recipients to whom data has been disclosed, and the retention periods applicable to your data.
          </p>

          <h3 style={h3}>7.2 Right to Rectification</h3>
          <p style={p}>
            You have the right to request that we correct any inaccurate personal data we hold about you and to have incomplete data completed. You can update much of your personal information directly through your account settings on the Platform.
          </p>

          <h3 style={h3}>7.3 Right to Erasure</h3>
          <p style={p}>
            You have the right to request the deletion of your personal data in certain circumstances, including where the data is no longer necessary for the purposes for which it was collected, where you withdraw consent (and consent was the basis for processing), or where the data has been processed unlawfully. This right is subject to our legal obligations to retain certain data as described in Section 6 (Data Retention).
          </p>

          <h3 style={h3}>7.4 Right to Data Portability</h3>
          <p style={p}>
            You have the right to receive a copy of your personal data in a structured, commonly used, and machine-readable format and to transmit that data to another controller without hindrance from ZAAHI, where technically feasible. This right applies to personal data you have provided to us and that we process based on your consent or for the performance of a contract.
          </p>

          <h3 style={h3}>7.5 Right to Restrict Processing</h3>
          <p style={p}>
            You have the right to request that we restrict the processing of your personal data in certain circumstances, including where you contest the accuracy of the data, where the processing is unlawful but you do not want the data deleted, or where you have objected to processing pending verification of our legitimate grounds for continuing to process.
          </p>

          <h3 style={h3}>7.6 Right to Object</h3>
          <p style={p}>
            You have the right to object to the processing of your personal data in certain circumstances, including where we process data on the basis of legitimate interests. If you object, we will cease processing your data unless we demonstrate compelling legitimate grounds that override your interests, rights, and freedoms, or the processing is necessary for the establishment, exercise, or defense of legal claims.
          </p>

          <h3 style={h3}>7.7 Right to Withdraw Consent</h3>
          <p style={p}>
            Where our processing of your personal data is based on your consent, you have the right to withdraw that consent at any time. You can withdraw consent by: adjusting your communication preferences in your account settings; disabling cookies and tracking technologies through your browser settings or our cookie management tool; contacting us at info@zaahi.io; or using the specific opt-out mechanisms provided in our communications.
          </p>

          <h3 style={h3}>7.8 Right to Lodge a Complaint</h3>
          <p style={p}>
            If you believe that our processing of your personal data violates applicable data protection laws, you have the right to lodge a complaint with the UAE Data Office or other competent supervisory authority. We encourage you to first contact us at info@zaahi.io so that we can address your concerns before you escalate to a regulatory authority.
          </p>

          <h3 style={h3}>7.9 Exercising Your Rights</h3>
          <p style={p}>
            To exercise any of the above rights, please contact us at info@zaahi.io with a clear description of your request. We will respond to your request within thirty (30) calendar days and may ask you to verify your identity before processing your request. In certain circumstances, we may charge a reasonable fee for requests that are manifestly unfounded or excessive, or we may refuse to act on such requests, as permitted by applicable law.
          </p>

          {/* 8. COOKIES */}
          <h2 id="cookies" style={h2}>8. Cookies and Tracking Technologies</h2>

          <h3 style={h3}>8.1 Essential Cookies</h3>
          <p style={p}>
            We use essential cookies that are strictly necessary for the operation of the Platform. These cookies enable core functionality such as user authentication, session management, security features, and load balancing. Essential cookies cannot be disabled as the Platform cannot function properly without them. These cookies do not collect personal data for marketing or analytics purposes.
          </p>

          <h3 style={h3}>8.2 Analytics Cookies</h3>
          <p style={p}>
            With your consent, we may use analytics cookies to collect information about how you interact with the Platform, including pages visited, features used, time spent on pages, and navigation patterns. This information is used in aggregate to understand usage trends and improve the Platform. Analytics cookies may be provided by third-party analytics services that process data on our behalf.
          </p>

          <h3 style={h3}>8.3 Functional Cookies</h3>
          <p style={p}>
            Functional cookies enable enhanced functionality and personalization, such as remembering your map preferences, display settings, language preferences, and saved search filters. While not strictly necessary, these cookies improve your experience on the Platform. You may disable functional cookies through your browser settings, but this may limit certain personalization features.
          </p>

          <h3 style={h3}>8.4 Local Storage</h3>
          <p style={p}>
            In addition to cookies, we use browser local storage and session storage to store certain data locally on your device for performance and functionality purposes. This includes map state data, user interface preferences, cached data for offline access, and temporary session data. Local storage data remains on your device until cleared through your browser settings.
          </p>

          {/* 9. INTERNATIONAL TRANSFERS */}
          <h2 id="international-transfers" style={h2}>9. International Data Transfers</h2>

          <h3 style={h3}>9.1 Transfer Destinations</h3>
          <p style={p}>
            Your personal data may be transferred to and processed in countries outside the United Arab Emirates as part of our use of third-party service providers. Specifically: our database infrastructure is hosted by Supabase in Frankfurt, Germany (EU-Central-1 region); our website is hosted on Vercel&apos;s global edge network, which may process requests in various geographic locations; and other service providers may process data in their respective operating jurisdictions. These transfers are necessary for the operation of the Platform and the delivery of our services.
          </p>

          <h3 style={h3}>9.2 Transfer Safeguards</h3>
          <p style={p}>
            Where we transfer personal data outside the UAE, we ensure that appropriate safeguards are in place in accordance with the PDPL and other applicable data protection laws. These safeguards include: contractual protections through data processing agreements with our service providers that incorporate standard contractual clauses or equivalent transfer mechanisms; verification that recipient jurisdictions maintain adequate levels of data protection; implementation of supplementary technical and organizational security measures, including encryption in transit (TLS/SSL) and at rest; and regular assessments of the data protection practices of our service providers. We will not transfer your personal data to any country or organization that does not ensure an adequate level of data protection without implementing appropriate additional safeguards.
          </p>

          {/* 10. CHILDREN */}
          <h2 id="children" style={h2}>10. Children&apos;s Privacy</h2>

          <p style={p}>
            The ZAAHI Platform is not intended for use by individuals under the age of eighteen (18) years. We do not knowingly collect, solicit, or maintain personal data from anyone under the age of eighteen. If we become aware that we have collected personal data from a child under eighteen without verification of parental consent, we will take immediate steps to delete that information from our servers. If you are a parent or guardian and believe that your child has provided us with personal data without your consent, please contact us immediately at info@zaahi.io and we will promptly remove such data.
          </p>

          {/* 11. SECURITY */}
          <h2 id="security" style={h2}>11. Security Measures</h2>

          <h3 style={h3}>11.1 Technical Safeguards</h3>
          <p style={p}>
            We implement robust technical security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. These measures include: encryption of data in transit using Transport Layer Security (TLS/SSL) protocols; encryption of sensitive data at rest using industry-standard encryption algorithms; secure password hashing using modern cryptographic algorithms; implementation of Row-Level Security (RLS) policies in our database to ensure users can only access data they are authorized to view; regular security assessments and vulnerability testing; intrusion detection and prevention systems; and automated monitoring for unauthorized access attempts.
          </p>

          <h3 style={h3}>11.2 Organizational Safeguards</h3>
          <p style={p}>
            We maintain organizational security measures including: role-based access controls that limit access to personal data to authorized personnel on a need-to-know basis; security awareness practices for all team members with access to personal data; incident response procedures for detecting, reporting, and responding to security breaches; regular review and updating of security policies and procedures; data minimization practices that limit the collection and retention of personal data to what is necessary; and contractual security requirements for all third-party service providers.
          </p>

          <h3 style={h3}>11.3 Incident Response</h3>
          <p style={p}>
            In the event of a personal data breach that poses a risk to your rights and freedoms, we will: take immediate steps to contain and mitigate the breach; notify the relevant supervisory authority within seventy-two (72) hours of becoming aware of the breach, as required by applicable law; notify affected individuals without undue delay where the breach is likely to result in a high risk to their rights and freedoms; document the breach, including its effects and the remedial action taken; and conduct a post-incident review to prevent similar breaches in the future.
          </p>

          <h3 style={h3}>11.4 Your Responsibilities</h3>
          <p style={p}>
            While we take extensive measures to protect your data, security is a shared responsibility. You are responsible for: maintaining the confidentiality of your account credentials; using a strong, unique password for your ZAAHI account; logging out of your account when using shared or public devices; immediately notifying us if you suspect unauthorized access to your account; and keeping your device and browser software up to date with the latest security patches.
          </p>

          {/* 12. CHANGES */}
          <h2 id="changes" style={h2}>12. Changes to This Privacy Policy</h2>

          <h3 style={h3}>12.1 Right to Update</h3>
          <p style={p}>
            We reserve the right to update, modify, or replace this Privacy Policy at any time at our sole discretion. We will indicate the date of the latest revision by updating the &ldquo;Last Updated&rdquo; date at the top of this page. For material changes that significantly affect how we collect, use, or share your personal data, we will provide prominent notice through one or more of the following methods: posting a notice on the Platform; sending an email to the address associated with your account; displaying an in-app notification; or any other method we deem reasonably likely to bring the changes to your attention.
          </p>

          <h3 style={h3}>12.2 Your Acceptance</h3>
          <p style={p}>
            Your continued use of the Platform following the posting of any changes to this Privacy Policy constitutes your acceptance of such changes. If you do not agree with any modified policy, you should discontinue your use of the Platform and request deletion of your account. We encourage you to periodically review this Privacy Policy to stay informed about how we protect your personal data.
          </p>

          {/* 13. CONTACT */}
          <h2 id="contact" style={h2}>13. Contact Information</h2>

          <p style={p}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data protection practices, please contact our Data Protection Officer:
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
              ZAAHI Real Estate OS — Data Protection Officer
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
            <p style={{ ...p, marginBottom: 6 }}>
              Response Time: Within thirty (30) calendar days
            </p>
            <p style={{ ...p, marginBottom: 0 }}>
              Jurisdiction: Dubai, United Arab Emirates
            </p>
          </div>

          <p style={{ ...p, color: TEXT_DIM, fontSize: 13, marginTop: 32, fontStyle: 'italic' }}>
            By using ZAAHI, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and processing of your personal data as described herein.
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
