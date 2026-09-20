"use client";
export type Toast = { message: string; sub?: string; kind: "success" | "error" };

export function MapToast({ toast, setToast }: {
  toast: Toast;
  setToast: React.Dispatch<React.SetStateAction<Toast | null>>;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 80,
        right: 20,
        zIndex: 60,
        maxWidth: 320,
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(10, 22, 40, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${toast.kind === "error" ? "rgba(230, 57, 70, 0.55)" : "rgba(200, 169, 110, 0.45)"}`,
        color: "rgba(255, 255, 255, 0.92)",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: 14,
          fontWeight: 700,
          color: toast.kind === "error" ? "#E63946" : "#C8A96E",
          letterSpacing: "-0.01em",
          marginBottom: toast.sub ? 4 : 0,
        }}>
          {toast.kind === "error" ? "✕" : "✓"} {toast.message}
        </div>
        {toast.sub && (
          <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.4 }}>
            {toast.sub}
          </div>
        )}
      </div>
      <button
        onClick={() => setToast(null)}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255, 255, 255, 0.55)",
          cursor: "pointer",
          fontSize: 16,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
