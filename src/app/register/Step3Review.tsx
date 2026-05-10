"use client";

// Step 3 — review + submit (spec §6.4).
// Shows a recap of Step 1/2 entries and posts multipart/form-data to
// /api/registration/submit on confirm. On 4xx the server's `code` is
// surfaced inline so the user can correct without losing state.

import { useState } from "react";
import {
  ROLE_LABELS,
  type Step1Basics,
} from "@/lib/registration-validation";
import { DOC_KIND_LABELS } from "@/lib/registration-doc-requirements";
import {
  ghostButtonStyle,
  primaryButtonStyle,
  GOLD,
  TEXT_DIM,
  errorStyle,
} from "./styles";
import type { DocFile } from "./Step2Documents";

export interface SubmitResult {
  applicationId: string;
  status: "PENDING_REVIEW" | "WAITLIST";
  nickname: string;
  expectedReviewByDate: string;
}

export interface Step3Props {
  basics: Step1Basics;
  files: DocFile[];
  onBack: () => void;
  onSubmitted: (r: SubmitResult) => void;
}

export function Step3Review({ basics, files, onBack, onSubmitted }: Step3Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  // Group files by kind for the review display
  const grouped = new Map<string, DocFile[]>();
  for (const f of files) {
    const arr = grouped.get(f.kind) ?? [];
    arr.push(f);
    grouped.set(f.kind, arr);
  }

  async function submit() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.append(
      "data",
      JSON.stringify({
        email: basics.email,
        phone: basics.phone || undefined,
        nickname: basics.nickname,
        role: basics.role,
        referralPath: basics.referralPath ?? undefined,
        confirmAccurate: true,
      }),
    );
    files.forEach((f, idx) => {
      body.append(`file_${f.kind}_${idx}`, f.file, f.file.name);
    });

    try {
      const res = await fetch("/api/registration/submit", { method: "POST", body });
      const json = (await res.json()) as
        | { ok: true; applicationId: string; status: "PENDING_REVIEW" | "WAITLIST"; nickname: string; expectedReviewByDate: string }
        | { ok: false; code: string; message: string };
      if (!res.ok || !("ok" in json) || !json.ok) {
        const errCode = "code" in json ? json.code : "unknown";
        const errMsg = "message" in json ? json.message : "Something went wrong. Please try again.";
        setError({ code: errCode, message: errMsg });
        setSubmitting(false);
        return;
      }
      onSubmitted({
        applicationId: json.applicationId,
        status: json.status,
        nickname: json.nickname,
        expectedReviewByDate: json.expectedReviewByDate,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError({ message: msg });
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: GOLD,
        }}
      >
        Review your application
      </h2>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: -10, lineHeight: 1.5 }}>
        Step 3 of 3 — confirm everything looks right, then submit.
      </div>

      <Section title="Basics">
        <Row label="Email" value={basics.email} />
        {basics.phone && <Row label="Phone" value={basics.phone} />}
        <Row label="Nickname" value={basics.nickname} />
        <Row label="Role" value={ROLE_LABELS[basics.role]} />
        {basics.referralPath && (
          <Row
            label="Referral path"
            value={
              basics.referralPath.directContact
                ? "Direct contact with owner"
                : `${basics.referralPath.intermediariesCount}${
                    basics.referralPath.intermediariesCount === 3 ? "+" : ""
                  } intermediar${
                    basics.referralPath.intermediariesCount === 1 ? "y" : "ies"
                  }`
            }
          />
        )}
      </Section>

      <Section title="Documents">
        {grouped.size === 0 && <div style={{ fontSize: 12, color: TEXT_DIM }}>No files attached.</div>}
        {[...grouped.entries()].map(([kind, list]) => (
          <Row
            key={kind}
            label={DOC_KIND_LABELS[kind as keyof typeof DOC_KIND_LABELS] ?? kind}
            value={`${list.length} file${list.length === 1 ? "" : "s"}`}
          />
        ))}
      </Section>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          fontSize: 12,
          lineHeight: 1.5,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ accentColor: GOLD, marginTop: 3 }}
        />
        <span>
          I confirm the information above is accurate and the documents I'm submitting are
          authentic. ZAAHI may verify with the relevant authorities.
        </span>
      </label>

      {error && (
        <div
          style={{
            ...errorStyle,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.2)",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#ffb1b1",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error.message}
          {error.code && (
            <span style={{ display: "block", marginTop: 4, opacity: 0.6, fontSize: 11 }}>
              (code: {error.code})
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
        <button
          type="button"
          onClick={onBack}
          style={ghostButtonStyle}
          disabled={submitting}
        >
          ← BACK
        </button>
        <button
          type="button"
          onClick={submit}
          style={{
            ...primaryButtonStyle,
            opacity: !confirmed || submitting ? 0.6 : 1,
            cursor: !confirmed || submitting ? "wait" : "pointer",
          }}
          disabled={!confirmed || submitting}
        >
          {submitting ? "SUBMITTING…" : "SUBMIT APPLICATION →"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: TEXT_DIM,
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
      <div style={{ width: 120, flexShrink: 0, color: TEXT_DIM }}>{label}</div>
      <div style={{ flex: 1, color: "rgba(245,241,232,0.95)", wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}
