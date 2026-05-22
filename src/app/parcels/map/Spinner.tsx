// Small rotating spinner — used inside wizard buttons during DDA lookup
// and entry creation to make in-flight state visually unmissable
// (button text alone is too subtle on a 1–2 s round trip).
//
// CSS keyframe `zaahi-spin` lives in src/app/globals.css.

interface Props {
  size?: number;
  color?: string;
}

export function Spinner({ size = 14, color = "#C8A96E" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        animation: "zaahi-spin 0.9s linear infinite",
        flexShrink: 0,
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="40 60"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
