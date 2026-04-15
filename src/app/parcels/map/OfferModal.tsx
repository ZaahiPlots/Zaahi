"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const GOLD = "#C8A96E";
const TXT = "#FFFFFF";
const SUBTLE = "rgba(255,255,255,0.55)";
const LINE = "rgba(255,255,255,0.1)";

interface Props {
  parcelId: string;
  askingPriceAed: number | null;
  onClose: () => void;
}

export default function OfferModal({ parcelId, askingPriceAed, onClose }: Props) {
  const router = useRouter();
  const [price, setPrice] = useState<string>(askingPriceAed ? String(Math.round(askingPriceAed)) : "");
  const [paymentType, setPaymentType] = useState("CASH");
  const [closingDays, setClosingDays] = useState(90);
  const [conditions, setConditions] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const offerNum = Number(price);
  const diff = useMemo(() => {
    if (!askingPriceAed || !Number.isFinite(offerNum) || offerNum <= 0) return null;
    const delta = offerNum - askingPriceAed;
    const pct = (delta / askingPriceAed) * 100;
    return { delta, pct };
  }, [offerNum, askingPriceAed]);

  async function submit() {
    setError(null);
    if (!Number.isFinite(offerNum) || offerNum <= 0) {
      setError("Enter a valid offer price");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabaseBrowser.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        setError("Please sign in first");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parcelId,
          offerPriceAed: offerNum,
          paymentType,
          closingDays,
          conditions: conditions.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to submit offer");
        setSubmitting(false);
        return;
      }
      const { id } = await res.json();
      router.push(`/deals/${id}`);
    } catch (e: any) {
      setError(e.message || "Network error");
      setSubmitting(false);
    }
  }

  const fmtMoney = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toFixed(0);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,15,25,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(10, 22, 40, 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${LINE}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          color: TXT,
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Submit Offer</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Start Negotiation</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: 0, fontSize: 22, color: SUBTLE, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, fontSize: 13 }}>
          <Field label="Offer Price (AED)">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 5000000"
              style={inputStyle}
            />
            {askingPriceAed != null && (
              <div style={{ fontSize: 11, color: SUBTLE, marginTop: 4 }}>
                Asking: {fmtMoney(askingPriceAed)} AED
                {diff && (
                  <span style={{ marginLeft: 8, color: diff.delta >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                    {diff.delta >= 0 ? "+" : ""}
                    {fmtMoney(diff.delta)} ({diff.pct >= 0 ? "+" : ""}{diff.pct.toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </Field>

          <Field label="Payment Type">
            <div style={{ display: "flex", gap: 8 }}>
              {["CASH", "MORTGAGE", "INSTALLMENT"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPaymentType(t)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${paymentType === t ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
                    background: paymentType === t ? "rgba(200,169,110,0.25)" : "rgba(255,255,255,0.06)",
                    color: paymentType === t ? GOLD : TXT,
                    fontWeight: 600,
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "border-color 150ms ease, background 150ms ease",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Closing Timeline">
            <select
              value={closingDays}
              onChange={(e) => setClosingDays(Number(e.target.value))}
              style={inputStyle}
            >
              {[30, 60, 90, 120].map((d) => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </Field>

          <Field label="Conditions (optional)">
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              placeholder="e.g. Subject to clean title verification"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          <Field label="Message to Seller (optional)">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Hi, I'm interested in your plot..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          {error && (
            <div style={{ color: "#FCA5A5", fontSize: 12, padding: 8, background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.35)", borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "12px 18px",
              borderRadius: 8,
              border: 0,
              background: submitting ? SUBTLE : GOLD,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: submitting ? "wait" : "pointer",
              boxShadow: "0 4px 12px rgba(200,169,110,0.3)",
            }}
          >
            {submitting ? "Submitting…" : "Submit Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  fontSize: 13,
  color: TXT,
  background: "rgba(255,255,255,0.04)",
  fontFamily: "inherit",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: SUBTLE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
