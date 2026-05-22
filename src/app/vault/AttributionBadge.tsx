"use client";

// ZAAHI Vault — small badge showing "Added by you" or "From @nickname"
// per spec §16.1.

const GOLD = "#C8A96E";
const TEAL = "#1B4965";
const TEXT_DIM = "rgba(255, 255, 255, 0.55)";

interface Props {
  addedByUserId: string | null;
  addedByNickname: string | null;
  /** The caller's own userId — used to discriminate "you" vs. someone else. */
  selfUserId: string;
}

export function AttributionBadge({ addedByUserId, addedByNickname, selfUserId }: Props) {
  const isSelf = !addedByUserId || addedByUserId === selfUserId;
  const label = isSelf ? "Added by you" : `From @${addedByNickname ?? "—"}`;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: 10,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderRadius: 4,
        background: isSelf ? "rgba(200, 169, 110, 0.12)" : "rgba(27, 73, 101, 0.18)",
        color: isSelf ? GOLD : TEAL,
        border: `1px solid ${isSelf ? "rgba(200, 169, 110, 0.3)" : "rgba(27, 73, 101, 0.4)"}`,
        whiteSpace: "nowrap",
      }}
      title={isSelf ? undefined : `Originally added by @${addedByNickname ?? "—"}`}
    >
      {label}
    </span>
  );
}

// Re-export so the file isn't tree-shaken when only the badge is imported via styles.
export const ATTRIBUTION_BADGE_DIM_COLOR = TEXT_DIM;
