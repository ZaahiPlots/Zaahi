"use client";

// Outer shell for the /register flow: dark navy backdrop, glassmorphism
// card centered, ZAAHI logotype + progress dots, footer with Terms /
// Privacy / Disclaimer + sign-in link. No live MapLibre map here —
// forms benefit from a still backdrop.

import { GOLD, NAVY, TEXT_DIM } from "./styles";

export type RegisterStep = 1 | 2 | 3 | "done";

export function RegisterShell({
  children,
  step,
}: {
  children: React.ReactNode;
  step: RegisterStep;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "auto",
        background: `radial-gradient(ellipse at top, #1A2547 0%, ${NAVY} 70%)`,
        color: "rgba(245,241,232,0.85)",
        fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 16px 48px",
        }}
      >
        <Header />
        {step !== "done" && <Progress step={step} />}
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            background: "rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            borderRadius: 16,
            boxShadow: "0 16px 64px rgba(0,0,0,0.4)",
            padding: "32px 28px",
            marginTop: 8,
          }}
        >
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(28px, 6vw, 38px)",
          fontWeight: 300,
          letterSpacing: "0.18em",
          color: GOLD,
          lineHeight: 1,
        }}
      >
        ZAAHI
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          letterSpacing: "0.2em",
          color: TEXT_DIM,
          textTransform: "uppercase",
        }}
      >
        Cohort Pilot Registration
      </div>
    </div>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const stepLabels = ["Basics", "Documents", "Review"];
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 24,
        alignItems: "center",
        fontSize: 11,
        color: TEXT_DIM,
        letterSpacing: "0.06em",
      }}
    >
      {[1, 2, 3].map((n) => {
        const active = n === step;
        const done = n < step;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: active || done ? GOLD : "rgba(255,255,255,0.06)",
                color: active || done ? NAVY : TEXT_DIM,
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "Georgia, serif",
                transition: "background 150ms ease",
              }}
            >
              {done ? "✓" : n}
            </span>
            <span
              style={{
                color: active ? GOLD : TEXT_DIM,
                fontWeight: active ? 600 : 400,
                textTransform: "uppercase",
              }}
            >
              {stepLabels[n - 1]}
            </span>
            {n < 3 && (
              <span
                style={{
                  display: "inline-block",
                  width: 24,
                  height: 1,
                  background: done ? GOLD : "rgba(255,255,255,0.12)",
                  margin: "0 4px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        marginTop: 32,
        textAlign: "center",
        fontSize: 11,
        color: TEXT_DIM,
        lineHeight: 1.6,
      }}
    >
      Already have an account?{" "}
      <a href="/" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>
        Sign in →
      </a>
      <div style={{ marginTop: 8, fontSize: 10 }}>
        <a href="/terms" style={{ color: GOLD, textDecoration: "none" }}>
          Terms
        </a>{" "}
        ·{" "}
        <a href="/privacy" style={{ color: GOLD, textDecoration: "none" }}>
          Privacy
        </a>{" "}
        ·{" "}
        <a href="/disclaimer" style={{ color: GOLD, textDecoration: "none" }}>
          Disclaimer
        </a>
      </div>
    </div>
  );
}
