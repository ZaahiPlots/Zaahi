"use client";

// ZAAHI Vault — empty-state prompt for first-visit and filtered-no-results.

const GOLD = "#C8A96E";
const TEXT_PRIMARY = "rgba(255, 255, 255, 0.92)";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  kind: "no-entries" | "no-shared" | "no-conflicts" | "filtered-empty";
  onAddClick?: () => void;
}

const COPY: Record<Props["kind"], { title: string; body: string; ctaLabel?: string }> = {
  "no-entries": {
    title: "Your vault is empty",
    body:
      "Add your first plot to start tracking. Brokers and developers use this to keep their daily pipeline organised in one place.",
    ctaLabel: "Add a plot",
  },
  "no-shared": {
    title: "Nothing shared with you yet",
    body:
      "When another vault user shares a plot with you, it'll appear here.",
  },
  "no-conflicts": {
    title: "No conflicts on your plots",
    body:
      "When another vault user has a plot you're tracking with different data, it'll surface here as an info banner.",
  },
  "filtered-empty": {
    title: "No matches",
    body:
      "Try adjusting the filters — different stage, broader search, or clear them entirely.",
  },
};

export function EmptyState({ kind, onAddClick }: Props) {
  const copy = COPY[kind];
  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{copy.title}</div>
      <div style={bodyStyle}>{copy.body}</div>
      {copy.ctaLabel && onAddClick && (
        <button onClick={onAddClick} style={buttonStyle}>
          {copy.ctaLabel}
        </button>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: 48,
  textAlign: "center",
  color: TEXT_PRIMARY,
  fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const bodyStyle: React.CSSProperties = {
  color: TEXT_DIM,
  fontSize: 13,
  marginTop: 8,
  maxWidth: 460,
  marginLeft: "auto",
  marginRight: "auto",
  lineHeight: 1.5,
};

const buttonStyle: React.CSSProperties = {
  background: "rgba(200, 169, 110, 0.15)",
  border: `1px solid ${GOLD}`,
  color: GOLD,
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 18,
  transition: "background 150ms ease, border-color 150ms ease",
};
