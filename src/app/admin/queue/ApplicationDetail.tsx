"use client";

// Detail modal/sheet for one RegistrationApplication.
// Mobile: full-screen sheet (max-width: 100vw). Desktop: centered modal
// (max-width: 720). Click outside to dismiss; Esc as well.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { ROLE_LABELS } from "@/lib/registration-validation";
import {
  primaryBtn,
  ghostBtn,
  dangerBtn,
  inputStyle,
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
  STATUS_COLORS,
} from "./styles";
import type { DetailResponse } from "./types";

export function ApplicationDetail({
  applicationId,
  onClose,
  onChanged,
}: {
  applicationId: string;
  onClose: () => void;
  onChanged: () => void; // call after approve/reject so list refreshes
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "approve" | "reject" | "resend">(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [realName, setRealName] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmExceedsCap, setConfirmExceedsCap] = useState(false);

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
        const res = await apiFetch(`/api/admin/registration/${applicationId}`);
        if (!res.ok) {
          setError(`Failed to load (${res.status})`);
          return;
        }
        const json = (await res.json()) as DetailResponse;
        if (!cancelled) {
          setData(json);
          if (json.realName) setRealName(json.realName);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  async function approve() {
    if (!data || busy) return;
    if (realName.trim().length < 2) {
      setError("Real name (≥ 2 chars) required to approve.");
      return;
    }
    setError(null);
    setActionMsg(null);
    setBusy("approve");
    const res = await apiFetch(`/api/admin/registration/${applicationId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        realName: realName.trim(),
        confirmExceedsCap,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      if (j.code === "cap_exceeded_unconfirmed") {
        setError(`${j.message} Tick "Approve over cap" and retry.`);
        return;
      }
      setError(j.message ?? `Approve failed (${res.status})`);
      return;
    }
    setActionMsg("Approved. Email + Telegram dispatched.");
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
    const res = await apiFetch(`/api/admin/registration/${applicationId}/reject`, {
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
    setActionMsg("Rejected. Email dispatched.");
    onChanged();
    setTimeout(onClose, 700);
  }

  async function resend() {
    if (busy) return;
    setError(null);
    setActionMsg(null);
    setBusy("resend");
    const res = await apiFetch(
      `/api/admin/registration/${applicationId}/resend-verification`,
      { method: "POST" },
    );
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      setError(j.message ?? `Resend failed (${res.status})`);
      return;
    }
    setActionMsg("Verification email re-sent.");
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
              <button onClick={onClose} style={ghostBtn}>Close</button>
            </div>
          </div>
        )}

        {data && (
          <>
            <Header data={data} onClose={onClose} />
            <Body
              data={data}
              realName={realName}
              setRealName={setRealName}
              actionMsg={actionMsg}
              error={error}
            />
            <Footer
              data={data}
              busy={busy}
              showRejectInput={showRejectInput}
              setShowRejectInput={setShowRejectInput}
              rejectReason={rejectReason}
              setRejectReason={setRejectReason}
              confirmExceedsCap={confirmExceedsCap}
              setConfirmExceedsCap={setConfirmExceedsCap}
              onApprove={approve}
              onReject={reject}
              onResend={resend}
              realName={realName}
              onClose={onClose}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Header({ data, onClose }: { data: DetailResponse; onClose: () => void }) {
  const status = STATUS_COLORS[data.application.status];
  const roleLabel = data.application.roleApplied
    ? ROLE_LABELS[data.application.roleApplied].split(" — ")[0]
    : "—";
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
          {data.application.nickname}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              padding: "2px 6px",
              background: "rgba(200,169,110,0.10)",
              color: GOLD,
              border: "1px solid rgba(200,169,110,0.3)",
              borderRadius: 4,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {roleLabel}
          </span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              padding: "2px 8px",
              background: status.bg,
              color: status.fg,
              border: `1px solid ${status.border}`,
              borderRadius: 4,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {status.label}
          </span>
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

function Body({
  data,
  realName,
  setRealName,
  actionMsg,
  error,
}: {
  data: DetailResponse;
  realName: string;
  setRealName: (s: string) => void;
  actionMsg: string | null;
  error: string | null;
}) {
  const a = data.application;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Submitted" value={new Date(a.createdAt).toLocaleString()} />
      <Field
        label="Email"
        value={
          <span>
            {a.email}{" "}
            {data.emailVerified ? (
              <span style={{ color: "#7DC79A" }}>(verified ✓)</span>
            ) : (
              <span style={{ color: "#ff8a92" }}>(not verified)</span>
            )}
          </span>
        }
      />
      <Field
        label="Real name"
        value={
          a.status === "PENDING_REVIEW" || a.status === "WAITLIST" ? (
            <input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="Enter real name from uploaded ID (admin-only)"
              style={inputStyle}
            />
          ) : (
            <span style={{ color: TEXT }}>{data.realName ?? "—"}</span>
          )
        }
      />
      {a.referralPath && (
        <Field
          label="Referral path"
          value={
            a.referralPath.directContact
              ? "Direct contact with owner"
              : `${a.referralPath.intermediariesCount}${
                  a.referralPath.intermediariesCount === 3 ? "+" : ""
                } intermediar${a.referralPath.intermediariesCount === 1 ? "y" : "ies"}`
          }
        />
      )}

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
          Documents (signed URLs · TTL 7d)
        </div>
        {data.documents.length === 0 && (
          <div style={{ fontSize: 12, color: TEXT_DIM }}>No documents attached.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.documents.map((d) => (
            <div
              key={d.path}
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
              <span style={{ color: GOLD, fontWeight: 600 }}>{d.kind}</span>
              <span style={{ flex: 1, minWidth: 0, color: TEXT_FADE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.originalName ?? "(no name)"}{" "}
                {d.sizeBytes && (
                  <span style={{ color: TEXT_FADE }}>({Math.round(d.sizeBytes / 1024)} KB)</span>
                )}
              </span>
              {d.signedUrl ? (
                <a
                  href={d.signedUrl}
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
          ))}
        </div>
      </div>

      {a.rejectionReason && (
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
          {a.rejectionReason}
        </div>
      )}

      {actionMsg && (
        <div style={{ fontSize: 12, color: "#7DC79A" }}>{actionMsg}</div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: "#ff8a92" }}>{error}</div>
      )}
    </div>
  );
}

function Footer({
  data,
  busy,
  showRejectInput,
  setShowRejectInput,
  rejectReason,
  setRejectReason,
  confirmExceedsCap,
  setConfirmExceedsCap,
  onApprove,
  onReject,
  onResend,
  realName,
  onClose,
}: {
  data: DetailResponse;
  busy: null | "approve" | "reject" | "resend";
  showRejectInput: boolean;
  setShowRejectInput: (v: boolean) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  confirmExceedsCap: boolean;
  setConfirmExceedsCap: (v: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onResend: () => void;
  realName: string;
  onClose: () => void;
}) {
  const a = data.application;

  if (a.status === "APPROVED") {
    return (
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12,
          color: TEXT_DIM,
        }}
      >
        Approved {a.approvedAt && new Date(a.approvedAt).toLocaleString()}.
      </div>
    );
  }
  if (a.status === "REJECTED") {
    return (
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: 12,
          color: TEXT_DIM,
        }}
      >
        Rejected {a.rejectedAt && new Date(a.rejectedAt).toLocaleString()}.
      </div>
    );
  }

  // Pending or Waitlist
  const verifyBlocks = !data.emailVerified;
  const realNameOk = realName.trim().length >= 2;

  return (
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
      {verifyBlocks && (
        <div
          style={{
            background: "rgba(230,126,34,0.08)",
            border: "1px solid rgba(230,126,34,0.3)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#FFD9A8",
          }}
        >
          <strong>Approve disabled — email not verified.</strong>{" "}
          User must click their verification link first.{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={busy !== null}
            style={{
              background: "transparent",
              border: "none",
              color: GOLD,
              fontWeight: 600,
              cursor: busy === null ? "pointer" : "wait",
              textDecoration: "underline",
              fontSize: 12,
              padding: 0,
            }}
          >
            {busy === "resend" ? "Re-sending…" : "Re-send verification email"}
          </button>
        </div>
      )}

      {a.status === "WAITLIST" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={confirmExceedsCap}
            onChange={(e) => setConfirmExceedsCap(e.target.checked)}
            style={{ accentColor: GOLD }}
          />
          Approve even if cap is exceeded (this row is in WAITLIST)
        </label>
      )}

      {!showRejectInput ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
            onClick={onApprove}
            style={{ ...primaryBtn, opacity: verifyBlocks || !realNameOk || busy !== null ? 0.5 : 1, cursor: verifyBlocks || !realNameOk || busy !== null ? "not-allowed" : "pointer" }}
            disabled={verifyBlocks || !realNameOk || busy !== null}
            title={
              verifyBlocks
                ? "Email not verified"
                : !realNameOk
                  ? "Enter real name first"
                  : undefined
            }
          >
            {busy === "approve" ? "APPROVING…" : "APPROVE"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason (visible to applicant; max 500 chars)"
            maxLength={500}
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
              onClick={onReject}
              style={dangerBtn}
              disabled={rejectReason.trim().length === 0 || busy !== null}
            >
              {busy === "reject" ? "REJECTING…" : "CONFIRM REJECT"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
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
