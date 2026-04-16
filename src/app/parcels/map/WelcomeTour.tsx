"use client";

// ── First-login welcome tour ────────────────────────────────────────
// 4 skippable steps shown once per user. Persistence:
// User.onboardingCompleted flips to true on finish OR skip, so the
// user never sees the tour again from any device.
//
// Activation: rendered from /parcels/map, self-decides whether to
// show by probing /api/me on mount. If the user isn't approved yet
// or already completed onboarding, the component renders null.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const BG_BLUR = "blur(24px) saturate(150%)";

const STEPS: Array<{ title: string; body: string; icon: string }> = [
  {
    icon: "👋",
    title: "Welcome to ZAAHI",
    body: "You're on the first autonomous real-estate OS for Dubai. Every plot you see on the map is a real, verifiable listing with DDA-grade data.",
  },
  {
    icon: "🏗",
    title: "Click any plot to explore",
    body: "Tap a 3D building to open its SidePanel — plot number, price, area, max GFA, land use, and downloadable Site Plan PDF.",
  },
  {
    icon: "📊",
    title: "Run feasibility in seconds",
    body: "Inside any plot's SidePanel you'll find a ROI calculator (BtS / BtR / JV modes). Free for everyone in Phase 1.",
  },
  {
    icon: "🏆",
    title: "Earn as an Ambassador",
    body: "Invite friends via your referral link, earn commissions on every closed deal. Visit /join to pick a tier.",
  },
];

export default function WelcomeTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/me");
        if (!r.ok) return;
        const u = (await r.json()) as { onboardingCompleted?: boolean };
        if (!cancelled && u.onboardingCompleted === false) setShow(true);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function complete() {
    setShow(false);
    try {
      await apiFetch("/api/me/complete-onboarding", { method: "POST" });
    } catch { /* ignore — best effort */ }
  }

  if (!show) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={complete}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, calc(100vw - 32px))",
          background: "rgba(10, 22, 40, 0.85)",
          backdropFilter: BG_BLUR,
          WebkitBackdropFilter: BG_BLUR,
          border: "1px solid rgba(200, 169, 110, 0.25)",
          borderRadius: 16,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          color: "#f5f1e8",
          padding: 26,
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ fontSize: 48, textAlign: "center", lineHeight: 1 }}>{s.icon}</div>
        <h2
          id="welcome-title"
          style={{
            margin: "16px 0 8px",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 22,
            fontWeight: 700,
            color: GOLD,
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          {s.title}
        </h2>
        <p style={{ fontSize: 13, color: "rgba(245, 241, 232, 0.75)", lineHeight: 1.6, textAlign: "center", margin: "0 0 20px" }}>
          {s.body}
        </p>

        {/* Dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 22 }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? GOLD : "rgba(200, 169, 110, 0.25)",
                transition: "width 200ms ease, background 200ms ease",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button
            onClick={complete}
            style={{
              background: "transparent",
              border: 0,
              color: "rgba(245, 241, 232, 0.55)",
              fontSize: 11,
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "inherit",
            }}
          >
            Skip
          </button>
          <button
            onClick={() => (isLast ? complete() : setStep(step + 1))}
            style={{
              padding: "10px 22px",
              background: GOLD,
              color: "#0A1628",
              border: 0,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: 'Georgia, "Times New Roman", serif',
              boxShadow: "0 8px 20px rgba(200, 169, 110, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
            }}
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
