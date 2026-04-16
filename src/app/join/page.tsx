"use client";
/**
 * ZAAHI Ambassador — public join page.
 *
 * No auth. Marketing hero + 3 pricing tiers (Silver / Gold / Platinum) +
 * earnings calculator + terms. Clicking a tier opens a payment modal with:
 *   - Wallet address (USDT TRC-20) + copy + QR code
 *   - Registration form (name, email, phone, company, experience, txHash)
 *   - POSTs to /api/ambassador/register
 *
 * Style: ZAAHI UI Style Guide — Apple-like glassmorphism over navy gradient,
 * gold accents, Georgia serif headings. Matches landing page (src/app/page.tsx).
 *
 * Approved by founder 2026-04-15. Replaces the prior free 30/15/5 referral model.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

// ── Palette (from CLAUDE.md UI Style Guide) ──
const GOLD = "#C8A96E";
const GOLD_BRIGHT = "#E8C77A";
const NAVY = "#1A1A2E";
const TEAL = "#1B4965";
const TXT = "#f5f1e8";
const DIM = "rgba(245, 241, 232, 0.72)";
const SUBTLE = "rgba(245, 241, 232, 0.55)";
const LINE = "rgba(200, 169, 110, 0.15)";
const GREEN = "#2D6A4F";

// ── Wallet / payment constants (founder 2026-04-15) ──
const WALLET_ADDRESS = "TELiibGkn3sg4EVzGYczzj2kkiAVfVN4j7";
const WALLET_NETWORK = "TRON (TRC-20)";
const WALLET_TOKEN = "USDT";

// ── Social links (placeholders — replace with real handles when ready) ──
const ZAAHI_SOCIAL_INSTAGRAM = "#";
const ZAAHI_SOCIAL_LINKEDIN = "#";
const ZAAHI_SOCIAL_TWITTER = "#";
const ZAAHI_SOCIAL_TELEGRAM = "#";

// ── Onboarding checklist (10 items, ALL required) ──
// Keys MUST stay in sync with src/app/api/ambassador/register/route.ts.
type ChecklistKey =
  | "paymentSent"
  | "agreeTerms"
  | "agreePrivacy"
  | "agreeAmbassadorTerms"
  | "followInstagram"
  | "followLinkedIn"
  | "followTwitter"
  | "joinTelegram"
  | "understandNonRefundable"
  | "confirmAccurate";

interface ChecklistItem {
  key: ChecklistKey;
  label: React.ReactNode;
}

const CHECKLIST: ChecklistItem[] = [
  { key: "paymentSent", label: "I have sent the USDT payment to the wallet address above" },
  {
    key: "agreeTerms",
    label: (
      <>I agree to the <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>Terms &amp; Conditions</a></>
    ),
  },
  {
    key: "agreePrivacy",
    label: (
      <>I agree to the <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>Privacy Policy</a></>
    ),
  },
  {
    key: "agreeAmbassadorTerms",
    label: (
      <>I agree to the <a href="/ambassador-terms" target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>Ambassador Agreement</a></>
    ),
  },
  {
    key: "followInstagram",
    label: (
      <>I have followed ZAAHI on <a href={ZAAHI_SOCIAL_INSTAGRAM} target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>Instagram</a></>
    ),
  },
  {
    key: "followLinkedIn",
    label: (
      <>I have followed ZAAHI on <a href={ZAAHI_SOCIAL_LINKEDIN} target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>LinkedIn</a></>
    ),
  },
  {
    key: "followTwitter",
    label: (
      <>I have followed ZAAHI on <a href={ZAAHI_SOCIAL_TWITTER} target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>X (Twitter)</a></>
    ),
  },
  {
    key: "joinTelegram",
    label: (
      <>I have joined the <a href={ZAAHI_SOCIAL_TELEGRAM} target="_blank" rel="noreferrer" style={{ color: "#C8A96E" }}>ZAAHI Telegram</a> group</>
    ),
  },
  { key: "understandNonRefundable", label: "I understand that the registration fee is non-refundable and commission is based on ZAAHI's 2% deal fee" },
  { key: "confirmAccurate", label: "I confirm that all information provided is accurate" },
];

// ── Plan definitions ──

type PlanId = "SILVER" | "GOLD" | "PLATINUM";

interface Plan {
  id: PlanId;
  name: string;
  aed: number;
  usdt: number;
  rates: { l1: number; l2: number; l3: number };
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "SILVER",
    name: "Silver",
    aed: 1000,
    usdt: 272,
    rates: { l1: 5, l2: 2, l3: 1 },
    features: [
      "Early platform access",
      "Personal referral link",
      "Ambassador dashboard",
      "Commission: L1 5% / L2 2% / L3 1%",
    ],
  },
  {
    id: "GOLD",
    name: "Gold",
    aed: 5000,
    usdt: 1361,
    rates: { l1: 10, l2: 4, l3: 1 },
    features: [
      "Everything in Silver",
      "Priority access to new plots",
      "Site Plan PDF downloads",
      "Commission: L1 10% / L2 4% / L3 1%",
    ],
    popular: true,
  },
  {
    id: "PLATINUM",
    name: "Platinum",
    aed: 15000,
    usdt: 4084,
    rates: { l1: 15, l2: 6, l3: 1 },
    features: [
      "Everything in Gold",
      "Direct line to founders",
      "Co-branding materials",
      "Commission: L1 15% / L2 6% / L3 1%",
    ],
  },
];

// ── Shared glass card style ──
const GLASS: React.CSSProperties = {
  background: "rgba(10, 22, 40, 0.5)",
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: "1px solid rgba(200, 169, 110, 0.15)",
  borderRadius: 14,
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
  color: TXT,
};

// ── Helpers ──

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US");
}

function emailValid(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ── Main page ──

export default function JoinPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at top, ${TEAL} 0%, ${NAVY} 55%, #0B0D1C 100%)`,
        color: TXT,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <Hero />
      <PricingSection onSelect={(p) => setSelectedPlan(p)} />
      <HowItWorks />
      <EarningsCalculator />
      <TermsSection />
      <Footer />
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </main>
  );
}

// ── Hero ──

function Hero() {
  return (
    <section style={{ padding: "96px 24px 48px", textAlign: "center", maxWidth: 960, margin: "0 auto" }}>
      <div style={{
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: 999,
        border: `1px solid ${GOLD}66`,
        background: "rgba(200, 169, 110, 0.08)",
        color: GOLD,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 600,
        marginBottom: 24,
      }}>Ambassador Program · Lifetime Membership</div>
      <h1 style={{
        fontFamily: "Georgia, serif",
        fontSize: "clamp(36px, 6vw, 64px)",
        margin: "0 0 20px",
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
      }}>Become a ZAAHI Ambassador</h1>
      <p style={{
        color: DIM,
        fontSize: "clamp(15px, 2vw, 19px)",
        lineHeight: 1.6,
        maxWidth: 680,
        margin: "0 auto",
      }}>
        Earn commission on every land deal in Dubai, Abu Dhabi &amp; beyond.
        Pay once, earn for life.
      </p>
    </section>
  );
}

// ── Pricing ──

function PricingSection({ onSelect }: { onSelect: (p: Plan) => void }) {
  return (
    <section style={{ padding: "32px 24px 72px", maxWidth: 1280, margin: "0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        {PLANS.map((plan) => (
          <PricingCard key={plan.id} plan={plan} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

function PricingCard({ plan, onSelect }: { plan: Plan; onSelect: (p: Plan) => void }) {
  const popular = !!plan.popular;
  return (
    <div
      style={{
        ...GLASS,
        position: "relative",
        padding: popular ? 36 : 28,
        border: popular
          ? `2px solid ${GOLD_BRIGHT}`
          : `1px solid rgba(200, 169, 110, 0.15)`,
        boxShadow: popular
          ? `0 16px 48px rgba(232, 199, 122, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)`
          : "0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        transform: popular ? "scale(1.02)" : "none",
        transition: "transform 200ms ease, box-shadow 200ms ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {popular && (
        <div style={{
          position: "absolute",
          top: -12,
          left: "50%",
          transform: "translateX(-50%)",
          background: GOLD_BRIGHT,
          color: NAVY,
          padding: "4px 14px",
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>★ Most Popular</div>
      )}
      <div style={{
        color: popular ? GOLD_BRIGHT : GOLD,
        fontSize: 11,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontWeight: 700,
        marginBottom: 12,
      }}>{plan.name}</div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: popular ? 44 : 38, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
          <span style={{ opacity: 0.6, fontSize: "0.55em", marginRight: 6 }}>AED</span>
          {fmtMoney(plan.aed)}
        </div>
        <div style={{ color: SUBTLE, fontSize: 12, marginTop: 6, letterSpacing: "0.04em" }}>
          ≈ {fmtMoney(plan.usdt)} USDT · one-time · lifetime
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "8px 0",
            color: DIM,
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={popular ? GOLD_BRIGHT : GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(plan)}
        style={{
          background: popular ? GOLD_BRIGHT : "rgba(200, 169, 110, 0.15)",
          color: popular ? NAVY : GOLD,
          border: `1px solid ${popular ? GOLD_BRIGHT : GOLD}`,
          borderRadius: 10,
          padding: "14px 20px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "background 150ms ease, color 150ms ease, transform 150ms ease",
        }}
        onMouseEnter={(e) => {
          if (popular) return;
          e.currentTarget.style.background = GOLD;
          e.currentTarget.style.color = NAVY;
        }}
        onMouseLeave={(e) => {
          if (popular) return;
          e.currentTarget.style.background = "rgba(200, 169, 110, 0.15)";
          e.currentTarget.style.color = GOLD;
        }}
      >
        Select Plan
      </button>
    </div>
  );
}

// ── How it works ──

function HowItWorks() {
  const steps = [
    {
      title: "Choose & pay with crypto",
      desc: "Pick your tier and send USDT on TRON (TRC-20) — one-time payment, lifetime access.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 3v4M8 3v4M2 11h20" />
        </svg>
      ),
    },
    {
      title: "Get your referral link",
      desc: "Once verified, you get a unique ZAAHI link and ambassador dashboard to track your downline.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      title: "Earn on every deal",
      desc: "Commission is paid on the 2% ZAAHI service fee of every deal your network closes — across 3 levels.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
  ];
  return (
    <section style={{ padding: "72px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeading kicker="The Flow" title="How it works" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20,
        marginTop: 40,
      }}>
        {steps.map((s, i) => (
          <div key={i} style={{ ...GLASS, padding: 28 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(200, 169, 110, 0.1)",
              border: `1px solid ${GOLD}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 18,
            }}>{s.icon}</div>
            <div style={{ color: SUBTLE, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>Step {i + 1}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em" }}>{s.title}</div>
            <div style={{ color: DIM, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Earnings calculator ──

function EarningsCalculator() {
  const [dealSize, setDealSize] = useState(50_000_000);
  const [deals, setDeals] = useState(3);

  const earnings = useMemo(() => {
    // Formula: dealSize × ZAAHI_SERVICE_FEE (0.02) × L1 × deals
    // We only compute L1 earnings here (most representative for direct referrals).
    const fee = dealSize * 0.02;
    return PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      popular: p.popular,
      amount: Math.round(fee * (p.rates.l1 / 100) * deals),
    }));
  }, [dealSize, deals]);

  return (
    <section style={{ padding: "72px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <SectionHeading kicker="Earnings Estimate" title="Calculate your potential" />
      <div style={{ ...GLASS, padding: 36, marginTop: 40 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}>
          <LabelledInput
            label="Average deal size (AED)"
            value={dealSize}
            onChange={(v) => setDealSize(Math.max(0, v))}
          />
          <LabelledInput
            label="Deals per year (from your referrals)"
            value={deals}
            onChange={(v) => setDeals(Math.max(0, v))}
          />
        </div>
        <div style={{ color: SUBTLE, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
          Annual L1 earnings (before any L2/L3 bonus)
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}>
          {earnings.map((e) => (
            <div key={e.id} style={{
              padding: 20,
              borderRadius: 12,
              background: e.popular ? "rgba(232, 199, 122, 0.08)" : "rgba(255,255,255,0.03)",
              border: e.popular ? `1px solid ${GOLD_BRIGHT}66` : `1px solid ${LINE}`,
            }}>
              <div style={{ color: e.popular ? GOLD_BRIGHT : GOLD, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                {e.name}
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
                <span style={{ opacity: 0.55, fontSize: "0.55em", marginRight: 6 }}>AED</span>
                {fmtMoney(e.amount)}
              </div>
              <div style={{ color: SUBTLE, fontSize: 11, marginTop: 8 }}>per year</div>
            </div>
          ))}
        </div>
        <div style={{ color: SUBTLE, fontSize: 11, marginTop: 20, lineHeight: 1.6 }}>
          Formula: deal × 2% ZAAHI service fee × L1 rate × deals/year. Actual
          earnings include L2 / L3 commissions from your wider network.
        </div>
      </div>
    </section>
  );
}

function LabelledInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ color: SUBTLE, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          color: TXT,
          fontSize: 16,
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 150ms ease",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
        onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
      />
    </label>
  );
}

// ── Terms ──

function TermsSection() {
  const items = [
    "Lifetime membership — pay once, earn forever",
    "Commission is based on ZAAHI's 2% service fee per deal",
    "Minimum payout: 1,000 AED",
    "Payouts within 30 business days after deal completion",
    "Ambassadors may purchase plots but cannot self-refer",
  ];
  return (
    <section style={{ padding: "48px 24px 72px", maxWidth: 900, margin: "0 auto" }}>
      <SectionHeading kicker="Terms" title="The fine print" />
      <div style={{ ...GLASS, padding: 32, marginTop: 32 }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((t, i) => (
            <li key={i} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 0",
              borderBottom: i < items.length - 1 ? `1px solid ${LINE}` : "none",
              color: DIM,
              fontSize: 14,
              lineHeight: 1.6,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: GOLD, flexShrink: 0, marginTop: 8,
              }} />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      padding: "48px 24px 64px",
      textAlign: "center",
      color: SUBTLE,
      fontSize: 12,
      borderTop: `1px solid ${LINE}`,
      marginTop: 40,
    }}>
      ZAAHI — Autonomous Real-Estate OS · zaahi.io
    </footer>
  );
}

// ── Section heading ──

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>{kicker}</div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 4vw, 40px)", margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
    </div>
  );
}

// ── Payment modal ──

function PaymentModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState("");
  const [txHash, setTxHash] = useState("");

  // 10-item onboarding checklist — all must be true to enable submit.
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>(
    () => Object.fromEntries(CHECKLIST.map((c) => [c.key, false])) as Record<ChecklistKey, boolean>,
  );

  const checklistDone = useMemo(
    () => CHECKLIST.reduce((n, c) => n + (checklist[c.key] ? 1 : 0), 0),
    [checklist],
  );

  const formReady =
    name.trim().length > 0 &&
    emailValid(email) &&
    phone.trim().length > 0 &&
    txHash.trim().length > 0;

  const allChecked = checklistDone === CHECKLIST.length;
  const submitEnabled = formReady && allChecked && !submitting;

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate QR client-side (avoid SSR).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(WALLET_ADDRESS, {
      margin: 1,
      width: 192,
      color: { dark: "#1A1A2E", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        /* silent — QR is a nice-to-have */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while modal open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [onClose, submitting]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WALLET_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — select text so user can copy manually.
      const sel = window.getSelection();
      const range = document.createRange();
      const el = document.getElementById("zaahi-wallet-address");
      if (el && sel) {
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setErrorMsg(null);
    // Client validation (server re-validates the same rules + checklist).
    if (!name.trim()) return setErrorMsg("Name is required.");
    if (!emailValid(email)) return setErrorMsg("Please enter a valid email.");
    if (!phone.trim()) return setErrorMsg("Phone is required.");
    if (!txHash.trim()) return setErrorMsg("Transaction hash is required.");
    if (!allChecked)
      return setErrorMsg("Please complete all 10 onboarding items before submitting.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/ambassador/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim() || undefined,
          experience: experience.trim() || undefined,
          plan: plan.id,
          txHash: txHash.trim(),
          checklistData: checklist,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setSubmitting(false);
      // Auto-dismiss after 5s — also dismissable by user click.
      closeTimer.current = setTimeout(() => onClose(), 5000);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setSubmitting(false);
    }
  }, [name, email, phone, company, experience, txHash, plan.id, checklist, allChecked, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      onClick={() => !submitting && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 20px",
        overflowY: "auto",
        zIndex: 999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "rgba(10, 22, 40, 0.85)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(200, 169, 110, 0.25)",
          borderRadius: 16,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          padding: 32,
          color: TXT,
          position: "relative",
        }}
      >
        <button
          onClick={() => !submitting && onClose()}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,0.06)",
            color: TXT,
            fontSize: 18,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.4 : 0.8,
            transition: "opacity 150ms ease",
          }}
        >×</button>

        {success ? (
          <SuccessPanel onClose={onClose} />
        ) : (
          <>
            <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
              {plan.name} Tier · Payment
            </div>
            <h3 id="payment-modal-title" style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Pay AED {fmtMoney(plan.aed)}
            </h3>
            <div style={{ color: SUBTLE, fontSize: 13, marginBottom: 24 }}>
              Send <strong style={{ color: TXT }}>{fmtMoney(plan.usdt)} USDT</strong> on <strong style={{ color: TXT }}>{WALLET_NETWORK}</strong>
            </div>

            {/* Wallet + QR */}
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}>
              <div style={{
                width: 112, height: 112, borderRadius: 10, background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 6, flexShrink: 0,
              }}>
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="Wallet QR code" width={100} height={100} />
                ) : (
                  <div style={{ color: NAVY, fontSize: 10 }}>Loading…</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: SUBTLE, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Wallet address</div>
                <div
                  id="zaahi-wallet-address"
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                    fontSize: 12,
                    wordBreak: "break-all",
                    color: TXT,
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >{WALLET_ADDRESS}</div>
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? GREEN : "rgba(200, 169, 110, 0.15)",
                    color: copied ? TXT : GOLD,
                    border: `1px solid ${copied ? GREEN : GOLD}`,
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "background 150ms ease, color 150ms ease",
                  }}
                >{copied ? "Copied ✓" : "Copy address"}</button>
              </div>
            </div>

            <div style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(230, 126, 34, 0.08)",
              border: "1px solid rgba(230, 126, 34, 0.3)",
              fontSize: 12,
              color: "#F1C27D",
              lineHeight: 1.5,
              marginBottom: 24,
            }}>
              <strong>⚠ Send only {WALLET_TOKEN} on {WALLET_NETWORK}.</strong> Any other token or network will result in permanent loss of funds.
            </div>

            {/* Form */}
            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 20 }}>
              <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>
                After payment, register here
              </div>
              <Field label="Full name *" value={name} onChange={setName} disabled={submitting} />
              <Field label="Email *" value={email} onChange={setEmail} type="email" disabled={submitting} />
              <Field label="Phone *" value={phone} onChange={setPhone} disabled={submitting} />
              <Field label="Company" value={company} onChange={setCompany} disabled={submitting} />
              <Field label="Experience (optional)" value={experience} onChange={setExperience} multiline disabled={submitting} />
              <Field label="Transaction hash *" value={txHash} onChange={setTxHash} placeholder="0x…" disabled={submitting} />
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: SUBTLE, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Selected plan</div>
                <div style={{
                  padding: "10px 14px",
                  background: "rgba(200, 169, 110, 0.1)",
                  border: `1px solid ${GOLD}55`,
                  borderRadius: 10,
                  color: GOLD,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}>{plan.name.toUpperCase()} · AED {fmtMoney(plan.aed)} · {fmtMoney(plan.usdt)} USDT</div>
              </div>

              {/* 10-item onboarding checklist */}
              <ChecklistPanel
                checklist={checklist}
                done={checklistDone}
                onToggle={(key) =>
                  setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
                }
                disabled={submitting}
              />

              {errorMsg && (
                <div style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(230, 57, 70, 0.1)",
                  border: "1px solid rgba(230, 57, 70, 0.4)",
                  color: "#FFC1C6",
                  fontSize: 12,
                  marginBottom: 16,
                }}>{errorMsg}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!submitEnabled}
                style={{
                  width: "100%",
                  background: submitEnabled
                    ? GOLD
                    : "rgba(255,255,255,0.06)",
                  color: submitEnabled ? NAVY : SUBTLE,
                  border: submitEnabled
                    ? `1px solid ${GOLD}`
                    : `1px solid ${LINE}`,
                  borderRadius: 10,
                  padding: "14px 24px",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: submitEnabled ? "pointer" : submitting ? "wait" : "not-allowed",
                  transition: "background 150ms ease, color 150ms ease, transform 150ms ease",
                  transform: submitEnabled ? "translateY(0)" : "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  if (submitEnabled) e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {submitting
                  ? "Submitting…"
                  : !formReady
                    ? "Fill required fields"
                    : !allChecked
                      ? `Complete checklist (${checklistDone}/${CHECKLIST.length})`
                      : "Submit Registration"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const common: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255, 255, 255, 0.04)",
    border: `1px solid ${LINE}`,
    borderRadius: 8,
    color: TXT,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 150ms ease",
    opacity: disabled ? 0.6 : 1,
  };
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ color: SUBTLE, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          disabled={disabled}
          style={{ ...common, resize: "vertical", minHeight: 48 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={common}
          onFocus={(e) => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
        />
      )}
    </label>
  );
}

function ChecklistPanel({
  checklist,
  done,
  onToggle,
  disabled,
}: {
  checklist: Record<ChecklistKey, boolean>;
  done: number;
  onToggle: (key: ChecklistKey) => void;
  disabled?: boolean;
}) {
  const total = CHECKLIST.length;
  const pct = (done / total) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
            Onboarding checklist
          </div>
          <div style={{ color: SUBTLE, fontSize: 11, letterSpacing: "0.08em" }}>
            {done}/{total} completed
          </div>
        </div>
        <div style={{
          height: 6,
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          overflow: "hidden",
        }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: GOLD,
              borderRadius: 999,
              transition: "width 200ms ease",
            }}
          />
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {CHECKLIST.map((item) => {
          const checked = !!checklist[item.key];
          return (
            <li key={item.key} style={{ marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => !disabled && onToggle(item.key)}
                disabled={disabled}
                aria-pressed={checked}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  width: "100%",
                  background: checked ? "rgba(200, 169, 110, 0.06)" : "transparent",
                  border: `1px solid ${checked ? GOLD + "55" : LINE}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  textAlign: "left",
                  cursor: disabled ? "not-allowed" : "pointer",
                  color: checked ? TXT : DIM,
                  fontSize: 13,
                  lineHeight: 1.5,
                  transition: "background 150ms ease, border-color 150ms ease",
                  fontFamily: "inherit",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    flexShrink: 0,
                    marginTop: 1,
                    background: checked ? GOLD : "rgba(255,255,255,0.04)",
                    border: `1px solid ${checked ? GOLD : LINE}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 120ms ease, border-color 120ms ease",
                  }}
                >
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SuccessPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 8px" }}>
      <div style={{
        width: 56, height: 56, margin: "0 auto 16px",
        borderRadius: "50%",
        background: "rgba(45, 106, 79, 0.2)",
        border: `2px solid ${GREEN}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
        Application submitted!
      </h3>
      <p style={{ color: DIM, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
        We&apos;ll verify your payment and activate your account within 24 hours.
        You&apos;ll receive an email with your referral link.
      </p>
      <button
        onClick={onClose}
        style={{
          background: "rgba(200, 169, 110, 0.15)",
          color: GOLD,
          border: `1px solid ${GOLD}`,
          borderRadius: 8,
          padding: "10px 24px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >Close</button>
    </div>
  );
}
