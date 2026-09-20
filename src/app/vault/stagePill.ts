export function stagePillStyle(stage: string): React.CSSProperties {
  const color = {
    LEAD: "#1B4965",
    CONTACTED: "#E67E22",
    NEGOTIATING: "#C8A96E",
    AGREEMENT_SIGNED: "#2D6A4F",
    PROMOTED: "#9B2226",
    LOST: "#6B7280",
    CLOSED: "#1A1A2E",
  }[stage] ?? "#888";
  return {
    display: "inline-block",
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderRadius: 4,
    background: `${color}22`,
    color,
    border: `1px solid ${color}55`,
    whiteSpace: "nowrap",
  };
}
