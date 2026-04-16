"use client";
/**
 * ZAAHI Map Terms-Accept Gate.
 *
 * Renders a blocking glassmorphism overlay over /parcels/map on first visit.
 * The user must check the Terms of Service AND Privacy Policy boxes before
 * the [I ACCEPT] button unlocks. Once accepted the choice is persisted in
 * localStorage under `zaahi-terms-accepted=true` and the modal never shows
 * again on this device.
 *
 * The overlay sits at z-index 9000 with `pointer-events: auto` so it
 * captures all map interactions (clicks, scroll, keyboard) until accepted.
 *
 * SSR-safe: localStorage is only read in useEffect, default state is hidden.
 * React 19 / Next 15 strict double-mount safe via a `disposed` flag-style
 * cleanup.
 *
 * Approved 2026-04-15.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "zaahi-terms-accepted";
const GOLD = "#C8A96E";
const NAVY = "#1A1A2E";
const TXT = "#FFFFFF";
const DIM = "rgba(255, 255, 255, 0.72)";
const SUBTLE = "rgba(255, 255, 255, 0.55)";
const LINE = "rgba(255, 255, 255, 0.12)";

export default function TermsAcceptModal() {
  // visible: undefined (loading), false (accepted), true (must show).
  // Start undefined so we don't flash on hydration.
  const [visible, setVisible] = useState<boolean | undefined>(undefined);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  useEffect(() => {
    let disposed = false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!disposed) setVisible(stored !== "true");
    } catch {
      // localStorage may be unavailable (private mode) — show modal.
      if (!disposed) setVisible(true);
    }
    return () => {
      disposed = true;
    };
  }, []);

  // Lock body scroll while visible.
  useEffect(() => {
    if (visible !== true) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (visible !== true) return null;

  const canAccept = agreeTerms && agreePrivacy;

  function handleAccept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore — still dismiss for the session */
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-accept-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "rgba(10, 22, 40, 0.85)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: "1px solid rgba(200, 169, 110, 0.25)",
          borderRadius: 16,
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          padding: 32,
          color: TXT,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            color: GOLD,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          ZAAHI Platform
        </div>
        <h2
          id="terms-accept-title"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 24,
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          Terms &amp; Privacy
        </h2>
        <p
          style={{
            color: DIM,
            fontSize: 14,
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          By using the ZAAHI platform you agree to our Terms &amp; Conditions
          and Privacy Policy.
        </p>

        <CheckRow
          checked={agreeTerms}
          onToggle={() => setAgreeTerms((v) => !v)}
          label={
            <>
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noreferrer"
                style={{ color: GOLD, textDecoration: "underline" }}
              >
                Terms &amp; Conditions
              </Link>
            </>
          }
        />
        <CheckRow
          checked={agreePrivacy}
          onToggle={() => setAgreePrivacy((v) => !v)}
          label={
            <>
              I agree to the{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                style={{ color: GOLD, textDecoration: "underline" }}
              >
                Privacy Policy
              </Link>
            </>
          }
        />

        <button
          type="button"
          onClick={handleAccept}
          disabled={!canAccept}
          style={{
            width: "100%",
            marginTop: 20,
            background: canAccept ? GOLD : "rgba(255, 255, 255, 0.06)",
            color: canAccept ? NAVY : SUBTLE,
            border: `1px solid ${canAccept ? GOLD : LINE}`,
            borderRadius: 10,
            padding: "14px 24px",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: canAccept ? "pointer" : "not-allowed",
            transition: "background 150ms ease, color 150ms ease, transform 150ms ease",
            fontFamily: "inherit",
          }}
        >
          I Accept
        </button>
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        marginBottom: 8,
        background: checked ? "rgba(200, 169, 110, 0.06)" : "transparent",
        border: `1px solid ${checked ? GOLD + "55" : LINE}`,
        borderRadius: 10,
        padding: "12px 14px",
        textAlign: "left",
        cursor: "pointer",
        color: checked ? TXT : DIM,
        fontSize: 14,
        lineHeight: 1.5,
        transition: "background 150ms ease, border-color 150ms ease",
        fontFamily: "inherit",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          flexShrink: 0,
          marginTop: 1,
          background: checked ? GOLD : "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${checked ? GOLD : LINE}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      >
        {checked && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={NAVY}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
