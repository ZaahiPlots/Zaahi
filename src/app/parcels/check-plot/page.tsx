"use client";

// /parcels/check-plot — Check DLD Plot Status entry point.
//
// Two-input form ([XXX] − [XXXX] = 7-digit plot number). On submit:
//   • Combine into the canonical 7-digit string.
//   • Copy to clipboard (so user can paste into DLD's form).
//   • Open the DLD inquiry page in a new tab. DLD's page does NOT accept
//     a query-string plotNumber, so we land the user on the form ready
//     to paste — same UX as the previous in-header behaviour.

"use strict";

import { useState, useRef, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";

const GOLD = "#C8A96E";
const BG_GLASS = "rgba(10, 22, 40, 0.5)";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

const DLD_INQUIRY_URL =
  "https://dubailand.gov.ae/en/eservices/inquiry-about-a-property-status/";

export default function CheckPlotPage() {
  return (
    <AuthGuard>
      <CheckPlotInner />
    </AuthGuard>
  );
}

function CheckPlotInner() {
  const [community, setCommunity] = useState(""); // first 3 digits
  const [plot, setPlot] = useState(""); // last 4 digits
  const [status, setStatus] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const plotRef = useRef<HTMLInputElement>(null);

  // Auto-focus first input on mount.
  const communityRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    communityRef.current?.focus();
  }, []);

  function onCommunityChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 3);
    setCommunity(digits);
    if (digits.length === 3) plotRef.current?.focus();
    if (status) setStatus(null);
  }

  function onPlotChange(v: string) {
    setPlot(v.replace(/\D/g, "").slice(0, 4));
    if (status) setStatus(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (community.length !== 3 || plot.length !== 4) {
      setStatus({ kind: "error", text: "Enter 3 community digits and 4 plot digits." });
      return;
    }
    const plotNumber = `${community}${plot}`;
    try {
      await navigator.clipboard?.writeText(plotNumber);
    } catch {
      /* clipboard not available — non-fatal */
    }
    window.open(DLD_INQUIRY_URL, "_blank", "noopener");
    setStatus({
      kind: "info",
      text: `Plot ${plotNumber} copied — paste it into the DLD form that just opened.`,
    });
  }

  const canSubmit = community.length === 3 && plot.length === 4;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={tinyLabelStyle}>DUBAI LAND DEPARTMENT</div>
        <h1 style={titleStyle}>Check Plot Status</h1>
        <p style={subduedStyle}>
          Enter the 7-digit DLD plot number split into community (first 3) and
          plot (last 4). We open the official DLD inquiry page in a new tab
          with the number copied to your clipboard.
        </p>

        <form onSubmit={onSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <input
              ref={communityRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              placeholder="123"
              value={community}
              onChange={(e) => onCommunityChange(e.target.value)}
              style={{ ...inputStyle, width: 90, textAlign: "center", letterSpacing: "0.15em" }}
              aria-label="Community number, 3 digits"
            />
            <span style={dashStyle}>—</span>
            <input
              ref={plotRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="4567"
              value={plot}
              onChange={(e) => onPlotChange(e.target.value)}
              style={{ ...inputStyle, width: 120, textAlign: "center", letterSpacing: "0.15em" }}
              aria-label="Plot number, 4 digits"
            />
          </div>

          <div style={previewStyle}>
            Full plot number:{" "}
            <span style={{ color: canSubmit ? GOLD : TEXT_DIM, fontWeight: 600 }}>
              {community.padEnd(3, "·")}{plot.padEnd(4, "·")}
            </span>
          </div>

          {status && (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                padding: "10px 12px",
                borderRadius: 8,
                color: status.kind === "error" ? "#ff6b6b" : GOLD,
                background:
                  status.kind === "error"
                    ? "rgba(255,107,107,0.1)"
                    : "rgba(200,169,110,0.1)",
                border:
                  status.kind === "error"
                    ? "1px solid rgba(255,107,107,0.25)"
                    : "1px solid rgba(200,169,110,0.3)",
              }}
            >
              {status.text}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{ ...submitButtonStyle, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            Check on DLD →
          </button>
        </form>

        <div style={hintStyle}>
          <strong style={{ color: GOLD }}>Tip:</strong> the DLD inquiry page opens
          in a new tab. After paste, DLD shows the plot's owner, area, project
          and status. ZAAHI does not submit or store anything here.
        </div>
      </div>
    </div>
  );
}

// ── styles (CLAUDE.md UI STYLE GUIDE) ──

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0A1628",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  background: BG_GLASS,
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: "28px 26px",
  color: TEXT_PRIMARY,
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
};

const tinyLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: GOLD,
  opacity: 0.8,
  marginBottom: 8,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 26,
  fontWeight: 700,
  margin: 0,
  marginBottom: 8,
  letterSpacing: "-0.02em",
};

const subduedStyle: React.CSSProperties = {
  fontSize: 13,
  color: TEXT_DIM,
  lineHeight: 1.55,
  marginBottom: 22,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const inputGroupStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 0",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 16,
  color: TEXT_PRIMARY,
  fontFamily: "inherit",
  outline: "none",
};

const dashStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 18,
};

const previewStyle: React.CSSProperties = {
  fontSize: 12,
  color: TEXT_DIM,
  textAlign: "center",
  fontFamily: "monospace",
  letterSpacing: "0.08em",
};

const submitButtonStyle: React.CSSProperties = {
  marginTop: 6,
  padding: "13px",
  background: GOLD,
  color: "#1A1A2E",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.1em",
  fontFamily: "inherit",
  textTransform: "uppercase",
  transition: "opacity 150ms ease",
};

const hintStyle: React.CSSProperties = {
  marginTop: 22,
  fontSize: 11,
  color: TEXT_DIM,
  lineHeight: 1.6,
  padding: "12px 14px",
  borderRadius: 8,
  background: "rgba(200, 169, 110, 0.06)",
  border: `1px solid rgba(200, 169, 110, 0.15)`,
};
