"use client";

// Post-submit confirmation panel (spec §6.4 confirmation page).
// Replaces the form on the same page when /api/registration/submit
// returned 2xx. Status badge, application ID, email-verify reminder,
// expected SLA copy, link back home.

import { GOLD, TEXT_DIM } from "./styles";
import type { SubmitResult } from "./Step3Review";

export function Confirmation({ result }: { result: SubmitResult }) {
  const isWaitlist = result.status === "WAITLIST";
  const sla = new Date(result.expectedReviewByDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: GOLD,
          color: "#0A0F1E",
          fontSize: 36,
          fontWeight: 700,
          marginBottom: 18,
        }}
      >
        ✓
      </div>

      <h2
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          fontSize: 24,
          fontWeight: 400,
          color: GOLD,
        }}
      >
        Application received
      </h2>

      <div
        style={{
          marginTop: 16,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: isWaitlist ? "rgba(230, 126, 34, 0.16)" : "rgba(45, 106, 79, 0.16)",
          border: isWaitlist
            ? "1px solid rgba(230, 126, 34, 0.5)"
            : "1px solid rgba(45, 106, 79, 0.5)",
          color: isWaitlist ? "#E67E22" : "#7DC79A",
          fontSize: 11,
          letterSpacing: "0.08em",
          fontWeight: 700,
          borderRadius: 4,
          textTransform: "uppercase",
        }}
      >
        {isWaitlist ? "Waitlist (Cohort 2)" : "Pending Review"}
      </div>

      <div
        style={{
          marginTop: 22,
          fontSize: 13,
          color: "rgba(245,241,232,0.85)",
          lineHeight: 1.6,
          maxWidth: 420,
          marginInline: "auto",
        }}
      >
        Hi <strong style={{ color: GOLD }}>{result.nickname}</strong>,{" "}
        {isWaitlist
          ? "Cohort 1 is full so you're on the waitlist for the next cohort."
          : "your application is in queue for review."}
      </div>

      <div
        style={{
          marginTop: 18,
          padding: "14px 16px",
          background: "rgba(200,169,110,0.06)",
          border: "1px solid rgba(200,169,110,0.20)",
          borderRadius: 8,
          fontSize: 12,
          color: "rgba(245,241,232,0.85)",
          lineHeight: 1.6,
          textAlign: "left",
        }}
      >
        <strong style={{ color: GOLD, display: "block", marginBottom: 6 }}>
          Check your inbox — verify your email
        </strong>
        We just sent a verification link. Your application can't be approved until you verify
        the address. The email may take a minute to arrive; check your spam folder if you
        don't see it.
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: TEXT_DIM,
          lineHeight: 1.6,
        }}
      >
        Expected review by <strong style={{ color: GOLD }}>{sla}</strong>{" "}
        (typically 2-3 business days)
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 11,
          color: TEXT_DIM,
        }}
      >
        Application ID: <code style={{ color: GOLD }}>{result.applicationId}</code>
      </div>

      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: 24,
          fontSize: 12,
          color: GOLD,
          textDecoration: "none",
          fontWeight: 600,
          letterSpacing: "0.06em",
        }}
      >
        ← Back to home
      </a>
    </div>
  );
}
