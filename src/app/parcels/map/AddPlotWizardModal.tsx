"use client";

// Shared modal wrapper around <AddPlotWizard>. Adds the dialog chrome
// (glassmorphism backdrop, centered card, escape-to-close). The wizard
// itself renders its 3-step body without a backdrop.
//
// Used from:
//   • /vault page (AddPlotWizardModal opens directly when user clicks
//     "+ Add to vault" on the EmptyState or the header).
//   • /parcels/map "+" flow (opens via AddPlotChooser → Vault branch).
//
// Cancel / Esc / backdrop click → onCancel. Caller decides whether to
// go back to the previous screen (e.g. the chooser) or return all the
// way out — this component just emits the event.

import { AddPlotWizard } from "./AddPlotWizard";
import { useEscapeClose } from "./useEscapeClose";

const GOLD = "#C8A96E";
const BORDER = "rgba(255, 255, 255, 0.1)";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  onCreated: (entryId: string) => void;
  onCancel: () => void;
  onExistingFound: (existingId: string) => void;
  /** Override the small uppercase label in the modal header. */
  title?: string;
}

export function AddPlotWizardModal({
  onCreated,
  onCancel,
  onExistingFound,
  title = "Add a plot to your vault",
}: Props) {
  useEscapeClose(onCancel);
  return (
    <div onClick={onCancel} style={modalBackdropStyle}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalPanelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div style={modalHeaderStyle}>
          <div style={modalTinyLabelStyle}>{title}</div>
          <button onClick={onCancel} style={modalCloseButtonStyle} aria-label="Close">
            ×
          </button>
        </div>
        <AddPlotWizard
          onCreated={onCreated}
          onCancel={onCancel}
          onExistingFound={onExistingFound}
        />
      </div>
    </div>
  );
}

const modalBackdropStyle: React.CSSProperties = {
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

const modalPanelStyle: React.CSSProperties = {
  background: "rgba(10, 22, 40, 0.92)",
  backdropFilter: "blur(24px) saturate(150%)",
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: 22,
  maxWidth: 760,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: `1px solid ${BORDER}`,
};

const modalTinyLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: GOLD,
  opacity: 0.8,
};

const modalCloseButtonStyle: React.CSSProperties = {
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
