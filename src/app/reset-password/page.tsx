"use client";

// /reset-password — landing target for the Supabase recovery link
// embedded in the registration-approved email (spec §7.4 step 4).
//
// Supabase recovery flow:
//   1. User clicks recovery link in approval email.
//   2. Supabase confirms the token and redirects here with a URL hash
//      `#access_token=...&refresh_token=...&type=recovery&...`.
//   3. We extract those, hand them to the browser client via
//      setSession, then let the user pick a new password.
//   4. supabase.auth.updateUser({ password }) sets the password.
//   5. User is now signed in (session is live) — redirect to
//      /parcels/map.
//
// Visual language: same dark navy gradient + glassmorphism + gold
// accent as /register, no live map (forms benefit from a still
// backdrop).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const GOLD = "#C8A96E";
const NAVY = "#0A0F1E";
const TEXT = "rgba(245,241,232,0.85)";
const TEXT_DIM = "rgba(245,241,232,0.55)";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: TEXT,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<
    "loading" | "no_token" | "ready" | "submitting" | "done" | "error"
  >("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Parse the URL hash on mount and call setSession so the rest of
  // the page can act on a live session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) {
      setPhase("no_token");
      return;
    }
    (async () => {
      const { error: setErr } = await supabaseBrowser.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) {
        setError(setErr.message);
        setPhase("error");
        return;
      }
      setPhase("ready");
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPhase("submitting");
    const { error: upErr } = await supabaseBrowser.auth.updateUser({ password });
    if (upErr) {
      setError(upErr.message);
      setPhase("ready");
      return;
    }
    setPhase("done");
    setTimeout(() => router.replace("/parcels/map"), 1400);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "auto",
        background: `radial-gradient(ellipse at top, #1A2547 0%, ${NAVY} 70%)`,
        color: TEXT,
        fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 16px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 38,
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
            Set your password
          </div>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.10)",
            borderRadius: 16,
            boxShadow: "0 16px 64px rgba(0,0,0,0.4)",
            padding: 32,
          }}
        >
          {phase === "loading" && <CenterMsg>Verifying recovery link…</CenterMsg>}

          {phase === "no_token" && (
            <CenterMsg tone="error">
              This link is missing the recovery token. It may have already been
              used or expired.
              <br />
              <a href="/" style={{ color: GOLD, textDecoration: "none", fontSize: 12 }}>
                Back to sign-in →
              </a>
            </CenterMsg>
          )}

          {phase === "error" && (
            <CenterMsg tone="error">
              {error ?? "Something went wrong."}
              <br />
              <a href="/" style={{ color: GOLD, textDecoration: "none", fontSize: 12 }}>
                Back to sign-in →
              </a>
            </CenterMsg>
          )}

          {(phase === "ready" || phase === "submitting") && (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "Georgia, serif",
                  fontSize: 22,
                  fontWeight: 400,
                  color: GOLD,
                }}
              >
                Choose a password
              </h2>
              <div style={{ fontSize: 12, color: TEXT_DIM, lineHeight: 1.5, marginTop: -8 }}>
                Minimum 8 characters. After saving you'll be taken to the platform.
              </div>

              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                  minLength={8}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: TEXT_DIM, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              </div>

              {error && (
                <div style={{ fontSize: 12, color: "#ff6b6b" }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={phase === "submitting"}
                style={{
                  marginTop: 6,
                  padding: "12px 20px",
                  background: "rgba(200, 169, 110, 0.9)",
                  color: NAVY,
                  border: `1px solid ${GOLD}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor: phase === "submitting" ? "wait" : "pointer",
                  fontFamily: "inherit",
                  opacity: phase === "submitting" ? 0.6 : 1,
                  transition: "background 150ms ease",
                }}
              >
                {phase === "submitting" ? "SAVING…" : "SAVE & SIGN IN"}
              </button>
            </form>
          )}

          {phase === "done" && (
            <CenterMsg>
              <div style={{ fontSize: 36, color: GOLD, marginBottom: 10 }}>✓</div>
              Password saved. Taking you in…
            </CenterMsg>
          )}
        </div>
      </div>
    </div>
  );
}

function CenterMsg({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <div
      style={{
        textAlign: "center",
        fontSize: 13,
        color: tone === "error" ? "#ffb1b1" : TEXT,
        lineHeight: 1.6,
        padding: "12px 0",
      }}
    >
      {children}
    </div>
  );
}
