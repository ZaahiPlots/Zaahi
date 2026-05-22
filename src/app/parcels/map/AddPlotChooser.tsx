"use client";

// AddPlotChooser — entry-point modal triggered by the "+" button on
// /parcels/map. Two big card buttons:
//   • Listing → opens AddPlotModal (public sale, RERA/Title Deed required)
//   • Vault   → opens AddPlotWizardModal (private personal tracker)
//
// Navigation contract (per founder direction):
//   • Backdrop click / Esc / × button → onClose (exit out to the map).
//   • onPickListing / onPickVault → callers route to the chosen flow.
//   • Cancel inside the chosen flow goes BACK TO the chooser (the parent
//     handles that — this component just emits onPick / onClose).
//
// Visuals: glassmorphism navy panel, gold accents, Georgia headers,
// SVG icons (no emoji per CLAUDE.md UI guide).

import { useEscapeClose } from "./useEscapeClose";

const GOLD = "#C8A96E";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  onPickListing: () => void;
  onPickVault: () => void;
  onClose: () => void;
}

export function AddPlotChooser({ onPickListing, onPickVault, onClose }: Props) {
  useEscapeClose(onClose);
  return (
    <div onClick={onClose} style={backdropStyle}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Add a plot"
      >
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Add a plot</h2>
            <p style={subduedStyle}>Choose how you want to add it</p>
          </div>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close">
            ×
          </button>
        </div>

        <div style={cardsRowStyle}>
          <ChooserCard
            iconSvg={<MegaphoneIcon />}
            title="List your property"
            subtitle="Publish a public listing on ZAAHI"
            note="Requires RERA permit (broker) or Title Deed (owner)"
            onClick={onPickListing}
            ariaLabel="List your property — open the public-listing flow"
          />
          <ChooserCard
            iconSvg={<PadlockIcon />}
            title="Track in Vault"
            subtitle="Add to your private plot tracker"
            note="Only you see it — share with specific contacts later"
            onClick={onPickVault}
            ariaLabel="Track in Vault — open the private-vault wizard"
          />
        </div>
      </div>
    </div>
  );
}

function ChooserCard({
  iconSvg,
  title,
  subtitle,
  note,
  onClick,
  ariaLabel,
}: {
  iconSvg: React.ReactNode;
  title: string;
  subtitle: string;
  note: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} style={cardButtonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = "rgba(200, 169, 110, 0.16)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={cardIconWrapStyle}>{iconSvg}</div>
      <div style={cardTitleStyle}>{title}</div>
      <div style={cardSubtitleStyle}>{subtitle}</div>
      <div style={cardNoteStyle}>{note}</div>
    </button>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8a4 4 0 0 1 0 8" />
      <path d="M17 5a8 8 0 0 1 0 14" />
    </svg>
  );
}

function PadlockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ── styles ─────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: 20,
};

const panelStyle: React.CSSProperties = {
  background: "rgba(10, 22, 40, 0.92)",
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 22,
  maxWidth: 720,
  width: "100%",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 22,
  paddingBottom: 16,
  borderBottom: `1px solid ${BORDER}`,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-0.02em",
};

const subduedStyle: React.CSSProperties = {
  fontSize: 12,
  color: TEXT_DIM,
  margin: "4px 0 0 0",
};

const closeButtonStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT_DIM,
  borderRadius: 6,
  width: 30,
  height: 30,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const cardsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const cardButtonStyle: React.CSSProperties = {
  appearance: "none",
  background: "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "20px 18px",
  textAlign: "left",
  color: TEXT_PRIMARY,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "border-color 150ms ease, background 150ms ease, transform 150ms ease",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const cardIconWrapStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 9,
  border: `1px solid rgba(200, 169, 110, 0.3)`,
  background: "rgba(200, 169, 110, 0.12)",
  color: GOLD,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: TEXT_PRIMARY,
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: 13,
  color: TEXT_PRIMARY,
  opacity: 0.85,
  lineHeight: 1.4,
};

const cardNoteStyle: React.CSSProperties = {
  fontSize: 11,
  color: TEXT_DIM,
  lineHeight: 1.4,
  marginTop: 4,
};
