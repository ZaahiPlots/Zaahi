"use client";

// Detail modal for one Title Deed verification candidate. A parcel may
// have multiple PENDING OWNER claims — admin picks one and clicks
// "Verify OWNER", or rejects with a reason. Verifying assigns
// Parcel.verifiedOwnerUserId; rejecting only marks the single claim.

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
import type { TitleDeedDetailResponse } from "./types";

const MAX_REASON = 500;

export function TitleDeedDetail({
  parcelId,
  onClose,
  onChanged,
}: {
  parcelId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<TitleDeedDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "verify" | "reject">(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
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
        const res = await apiFetch(`/api/admin/title-deeds/${parcelId}`);
        if (!res.ok) {
          setError(`Failed to load (${res.status})`);
          return;
        }
        const json = (await res.json()) as TitleDeedDetailResponse;
        if (!cancelled) {
          setData(json);
          // Auto-pick the first PENDING claim, if any.
          const firstPending = json.claims.find((c) => c.status === "PENDING");
          if (firstPending) setSelectedClaimId(firstPending.id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parcelId]);

  async function verify() {
    if (!data || !selectedClaimId || busy) return;
    setError(null);
    setActionMsg(null);
    setBusy("verify");
    const res = await apiFetch(`/api/admin/title-deeds/${parcelId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId: selectedClaimId }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      setError(j.message ?? `Verify failed (${res.status})`);
      return;
    }
    setActionMsg("Owner verified. Email + Telegram dispatched.");
    onChanged();
    setTimeout(onClose, 700);
  }

  async function reject() {
    if (!data || !selectedClaimId || busy) return;
    if (rejectReason.trim().length < 1) {
      setError("Rejection reason cannot be empty.");
      return;
    }
    setError(null);
    setActionMsg(null);
    setBusy("reject");
    const res = await apiFetch(`/api/admin/title-deeds/${parcelId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId: selectedClaimId, reason: rejectReason.trim() }),
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

  const selectedClaim = data?.claims.find((c) => c.id === selectedClaimId) ?? null;
  const verifyDisabled =
    !selectedClaim || selectedClaim.status !== "PENDING" || busy !== null;

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
          maxWidth: 760,
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
            <Header parcel={data.parcel} onClose={onClose} />
            <ParcelInfo parcel={data.parcel} />

            {/* Claim selector — only shown when >1 PENDING claim. */}
            {data.claims.length > 1 && (
              <ClaimSelector
                claims={data.claims}
                selectedId={selectedClaimId}
                onSelect={setSelectedClaimId}
              />
            )}

            {selectedClaim && <ClaimSummary claim={selectedClaim} />}

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
              {!showRejectInput ? (
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
                    disabled={busy !== null || !selectedClaim || selectedClaim.status !== "PENDING"}
                  >
                    REJECT CLAIM
                  </button>
                  <button
                    onClick={verify}
                    style={{
                      ...primaryBtn,
                      opacity: verifyDisabled ? 0.5 : 1,
                      cursor: verifyDisabled ? "not-allowed" : "pointer",
                    }}
                    disabled={verifyDisabled}
                    title={
                      !selectedClaim
                        ? "Select a claim first"
                        : selectedClaim.status !== "PENDING"
                          ? "Only PENDING claims can be verified"
                          : undefined
                    }
                  >
                    {busy === "verify" ? "VERIFYING…" : "VERIFY OWNER"}
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
  parcel,
  onClose,
}: {
  parcel: TitleDeedDetailResponse["parcel"];
  onClose: () => void;
}) {
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
          Plot {parcel.plotNumber}
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
          Title Deed verification · {parcel.projectName}
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

function ParcelInfo({ parcel }: { parcel: TitleDeedDetailResponse["parcel"] }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <Row label="Project" value={parcel.projectName} />
      <Row label="District" value={`${parcel.district} · ${parcel.emirate}`} />
      {parcel.community && <Row label="Community" value={parcel.community} />}
      {parcel.plotAreaSqft && (
        <Row
          label="Plot area"
          value={`${parcel.plotAreaSqft.toLocaleString("en-US")} sqft`}
        />
      )}
      <Row
        label="Creator"
        value={
          parcel.creator?.nickname
            ? `${parcel.creator.nickname} (${parcel.creator.role})`
            : `${parcel.ownerId.slice(0, 8)}…`
        }
      />
      {parcel.verifiedOwnerUserId && (
        <Row
          label="Verified owner"
          value={
            <span style={{ color: "#7DC79A" }}>
              {parcel.verifiedOwnerUserId.slice(0, 8)}…
              {parcel.verifiedAt && ` · ${new Date(parcel.verifiedAt).toLocaleDateString()}`}
            </span>
          }
        />
      )}
    </div>
  );
}

function ClaimSelector({
  claims,
  selectedId,
  onSelect,
}: {
  claims: TitleDeedDetailResponse["claims"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
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
        Multiple claims — pick one to verify
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {claims.map((c) => {
          const selected = c.id === selectedId;
          const disabled = c.status !== "PENDING";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => !disabled && onSelect(c.id)}
              disabled={disabled}
              style={{
                background: selected ? "rgba(200,169,110,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected ? "rgba(200,169,110,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8,
                padding: "10px 12px",
                color: TEXT,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                fontFamily: "inherit",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontWeight: 700, color: GOLD, fontSize: 12 }}>
                {c.user.nickname ?? c.userId.slice(0, 8)}
              </span>
              <span style={{ fontSize: 10, color: TEXT_DIM }}>{c.status}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: TEXT_DIM }}>
                AED {(Number(c.priceAed) / 100).toLocaleString("en-US")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClaimSummary({ claim }: { claim: TitleDeedDetailResponse["claims"][number] }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: TEXT_DIM,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Claimant
      </div>
      <Row
        label="Nickname"
        value={
          <span style={{ color: GOLD, fontWeight: 700 }}>
            {claim.user.nickname ?? claim.userId.slice(0, 8)}
          </span>
        }
      />
      <Row label="Real name" value={claim.user.name ?? "—"} />
      <Row label="Email" value={claim.user.email ?? "—"} />
      <Row
        label="Stated price"
        value={`AED ${(Number(claim.priceAed) / 100).toLocaleString("en-US")}`}
      />
      <Row label="Submitted" value={new Date(claim.createdAt).toLocaleString()} />

      <div
        style={{
          fontSize: 11,
          color: TEXT_DIM,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginTop: 8,
          fontWeight: 600,
        }}
      >
        Title Deed documents
      </div>
      {claim.documents.length === 0 ? (
        <div style={{ fontSize: 12, color: TEXT_DIM }}>No documents attached.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {claim.documents.map((d, i) => (
            <DocLink key={`${d.kind}-${i}`} doc={d} />
          ))}
        </div>
      )}

      {claim.status === "REJECTED" && claim.rejectionReason && (
        <div
          style={{
            background: "rgba(230,57,70,0.06)",
            border: "1px solid rgba(230,57,70,0.2)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#ff8a92",
            marginTop: 8,
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>Rejection reason</strong>
          {claim.rejectionReason}
        </div>
      )}
    </div>
  );
}

function DocLink({
  doc,
}: {
  doc: TitleDeedDetailResponse["claims"][number]["documents"][number];
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
          paddingTop: 2,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 13, color: TEXT, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
