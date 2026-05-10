"use client";

// Detail modal for one non-OWNER PENDING PlotClaim
// (BROKER / DEVELOPER / ARCHITECT / POA). Verify or reject (with reason).

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  primaryBtn,
  ghostBtn,
  dangerBtn,
  inputStyle,
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
} from "./styles";
import type { PlotClaimDetailResponse } from "./types";

const MAX_REASON = 500;

const ROLE_LABEL: Record<PlotClaimDetailResponse["claim"]["roleAtClaim"], string> = {
  BROKER: "Broker",
  DEVELOPER: "Developer",
  ARCHITECT: "Architect",
  POA: "Power of Attorney",
};

export function PlotClaimDetail({
  claimId,
  onClose,
  onChanged,
}: {
  claimId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<PlotClaimDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "verify" | "reject">(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Esc → close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch detail
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/admin/plot-claims/${claimId}`);
        if (!res.ok) {
          setError(`Failed to load (${res.status})`);
          return;
        }
        const json = (await res.json()) as PlotClaimDetailResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  async function verify() {
    if (!data || busy) return;
    setError(null);
    setActionMsg(null);
    setBusy("verify");
    const res = await apiFetch(`/api/admin/plot-claims/${claimId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      setError(j.message ?? `Verify failed (${res.status})`);
      return;
    }
    setActionMsg("Claim verified. Email + Telegram dispatched.");
    onChanged();
    setTimeout(onClose, 700);
  }

  async function reject() {
    if (!data || busy) return;
    if (rejectReason.trim().length < 1) {
      setError("Rejection reason cannot be empty.");
      return;
    }
    setError(null);
    setActionMsg(null);
    setBusy("reject");
    const res = await apiFetch(`/api/admin/plot-claims/${claimId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason.trim() }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      setError(j.message ?? `Reject failed (${res.status})`);
      return;
    }
    setActionMsg("Claim rejected. Email dispatched.");
    onChanged();
    setTimeout(onClose, 700);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0F1A30",
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 24,
          color: TEXT,
        }}
      >
        {!data && !error && (
          <div style={{ padding: 24, textAlign: "center", color: TEXT_DIM, fontSize: 12 }}>
            Loading…
          </div>
        )}
        {error && !data && (
          <div style={{ padding: 24, color: "#ffb1b1", fontSize: 13 }}>
            {error}
            <div style={{ marginTop: 18 }}>
              <button onClick={onClose} style={ghostBtn}>
                Close
              </button>
            </div>
          </div>
        )}

        {data && (
          <>
            <Header data={data} onClose={onClose} />
            <Body data={data} />

            {actionMsg && (
              <div style={{ fontSize: 12, color: "#7DC79A", marginTop: 12 }}>{actionMsg}</div>
            )}
            {error && <div style={{ fontSize: 12, color: "#ff8a92", marginTop: 12 }}>{error}</div>}

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {data.claim.status !== "PENDING" ? (
                <div style={{ fontSize: 12, color: TEXT_DIM }}>
                  Claim is {data.claim.status}.{" "}
                  {data.claim.verifiedAt && new Date(data.claim.verifiedAt).toLocaleString()}.
                </div>
              ) : !showRejectInput ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button onClick={onClose} style={ghostBtn} disabled={busy !== null}>
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    style={dangerBtn}
                    disabled={busy !== null}
                  >
                    REJECT
                  </button>
                  <button
                    onClick={verify}
                    style={{
                      ...primaryBtn,
                      opacity: busy !== null ? 0.5 : 1,
                      cursor: busy !== null ? "not-allowed" : "pointer",
                    }}
                    disabled={busy !== null}
                  >
                    {busy === "verify"
                      ? "VERIFYING…"
                      : `VERIFY ${ROLE_LABEL[data.claim.roleAtClaim].toUpperCase()}`}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (visible to claimant; max 500 chars)"
                    maxLength={MAX_REASON}
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectReason("");
                      }}
                      style={ghostBtn}
                      disabled={busy !== null}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={reject}
                      style={dangerBtn}
                      disabled={rejectReason.trim().length === 0 || busy !== null}
                    >
                      {busy === "reject" ? "REJECTING…" : "CONFIRM REJECT"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Header({
  data,
  onClose,
}: {
  data: PlotClaimDetailResponse;
  onClose: () => void;
}) {
  const roleLabel = ROLE_LABEL[data.claim.roleAtClaim] ?? data.claim.roleAtClaim;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 22,
            color: GOLD,
            fontWeight: 400,
          }}
        >
          {data.claim.user.nickname ?? data.claim.userId.slice(0, 8)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: TEXT_DIM,
            marginTop: 4,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {roleLabel} claim · Plot {data.parcel.plotNumber} · {data.parcel.district}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          background: "transparent",
          border: "none",
          color: TEXT_DIM,
          fontSize: 24,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function Body({ data }: { data: PlotClaimDetailResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Row label="Real name" value={data.claim.user.name ?? "—"} />
      <Row label="Email" value={data.claim.user.email ?? "—"} />
      <Row label="Submitted" value={new Date(data.claim.createdAt).toLocaleString()} />
      <Row
        label="Stated price"
        value={`AED ${(Number(data.claim.priceAed) / 100).toLocaleString("en-US")}`}
      />
      <Row label="Plot" value={`${data.parcel.plotNumber} · ${data.parcel.projectName}`} />
      {data.parcel.plotAreaSqft && (
        <Row
          label="Plot area"
          value={`${data.parcel.plotAreaSqft.toLocaleString("en-US")} sqft`}
        />
      )}
      <Row
        label="Verified owner"
        value={
          data.parcel.verifiedOwnerUserId ? (
            <span style={{ color: "#7DC79A" }}>
              {data.parcel.verifiedOwnerUserId.slice(0, 8)}…
            </span>
          ) : (
            <span style={{ color: TEXT_DIM }}>— (not yet verified)</span>
          )
        }
      />

      <div>
        <div
          style={{
            fontSize: 11,
            color: TEXT_DIM,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Role documents
        </div>
        {data.documents.length === 0 ? (
          <div style={{ fontSize: 12, color: TEXT_DIM }}>No documents attached.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.documents.map((d, i) => (
              <DocLink key={`${d.kind}-${i}`} doc={d} />
            ))}
          </div>
        )}
      </div>

      {data.claim.status === "REJECTED" && data.claim.rejectionReason && (
        <div
          style={{
            background: "rgba(230,57,70,0.06)",
            border: "1px solid rgba(230,57,70,0.2)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#ff8a92",
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>Rejection reason</strong>
          {data.claim.rejectionReason}
        </div>
      )}
    </div>
  );
}

function DocLink({
  doc,
}: {
  doc: PlotClaimDetailResponse["documents"][number];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      <span style={{ color: GOLD, fontWeight: 600 }}>{doc.kind}</span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          color: TEXT_FADE,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {doc.originalName ?? "(no name)"}{" "}
        {doc.sizeBytes != null && (
          <span style={{ color: TEXT_FADE }}>({Math.round(doc.sizeBytes / 1024)} KB)</span>
        )}
      </span>
      {doc.signedUrl ? (
        <a
          href={doc.signedUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            color: GOLD,
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 11,
            letterSpacing: "0.06em",
          }}
        >
          OPEN ↗
        </a>
      ) : (
        <span style={{ color: "#ff8a92", fontSize: 11 }}>(unavailable)</span>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div
        style={{
          width: 110,
          flexShrink: 0,
          fontSize: 11,
          color: TEXT_DIM,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          paddingTop: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: TEXT, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
