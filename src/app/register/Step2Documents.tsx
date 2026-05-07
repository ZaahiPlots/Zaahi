"use client";

// Step 2 — role-specific document upload (spec §6.3).
// Multi-file per kind. Drag-drop OR click. Files held in memory until
// /register Step 3 submit (no upload here).

import { useState } from "react";
import {
  REGISTRATION_DOC_REQUIREMENTS,
  DOC_KIND_LABELS,
  DOC_KIND_HINTS,
  MAX_FILE_BYTES,
  ALLOWED_MIME,
  type DocKind,
} from "@/lib/registration-doc-requirements";
import type { CohortApplicantRole } from "@/lib/registration-validation";
import {
  ghostButtonStyle,
  primaryButtonStyle,
  GOLD,
  GOLD_DIM,
  TEXT_DIM,
  errorStyle,
} from "./styles";

export type DocFile = { kind: DocKind; file: File; id: string };

export interface Step2Props {
  role: CohortApplicantRole;
  initial: DocFile[];
  onBack: () => void;
  onNext: (files: DocFile[]) => void;
}

export function Step2Documents({ role, initial, onBack, onNext }: Step2Props) {
  const [files, setFiles] = useState<DocFile[]>(initial);
  const [error, setError] = useState<string | null>(null);

  const req = REGISTRATION_DOC_REQUIREMENTS[role];

  function addFiles(kind: DocKind, raw: FileList | File[]) {
    setError(null);
    const list = Array.from(raw);
    const accepted: DocFile[] = [];
    for (const f of list) {
      if (f.size > MAX_FILE_BYTES) {
        setError(`'${f.name}' exceeds 10 MiB.`);
        continue;
      }
      if (!ALLOWED_MIME.has(f.type)) {
        setError(`'${f.name}' has unsupported type '${f.type || "unknown"}'.`);
        continue;
      }
      accepted.push({
        kind,
        file: f,
        id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function tryNext() {
    const present = new Set<DocKind>(files.map((f) => f.kind));
    const missing =
      req.mode === "AND"
        ? req.kinds.filter((k) => !present.has(k))
        : req.kinds.some((k) => present.has(k))
          ? []
          : req.kinds;
    if (missing.length > 0) {
      setError(
        req.mode === "AND"
          ? `Still missing: ${missing.map((k) => DOC_KIND_LABELS[k]).join(", ")}.`
          : `At least one of these is required: ${req.kinds.map((k) => DOC_KIND_LABELS[k]).join(" or ")}.`,
      );
      return;
    }
    setError(null);
    onNext(files);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: GOLD,
        }}
      >
        Verification documents
      </h2>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: -10, lineHeight: 1.5 }}>
        Step 2 of 3 —{" "}
        {req.mode === "AND"
          ? `provide every document below.`
          : `provide at least one of the documents below.`}{" "}
        Files stay on your device until you submit.
      </div>

      {req.kinds.map((kind) => (
        <DropZone
          key={kind}
          kind={kind}
          files={files.filter((f) => f.kind === kind)}
          onAdd={(fs) => addFiles(kind, fs)}
          onRemove={removeFile}
        />
      ))}

      {error && <div style={errorStyle}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
        <button type="button" onClick={onBack} style={ghostButtonStyle}>
          ← BACK
        </button>
        <button type="button" onClick={tryNext} style={primaryButtonStyle}>
          NEXT — REVIEW →
        </button>
      </div>
    </div>
  );
}

function DropZone({
  kind,
  files,
  onAdd,
  onRemove,
}: {
  kind: DocKind;
  files: DocFile[];
  onAdd: (raw: FileList) => void;
  onRemove: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const inputId = `file-${kind}`;
  return (
    <div>
      <div style={{ fontSize: 12, color: GOLD, fontWeight: 600, marginBottom: 6 }}>
        {DOC_KIND_LABELS[kind]}
      </div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          if (e.dataTransfer.files.length > 0) onAdd(e.dataTransfer.files);
        }}
        style={{
          display: "block",
          padding: 16,
          border: `1px dashed ${hover ? GOLD : GOLD_DIM}`,
          borderRadius: 10,
          background: hover ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)",
          cursor: "pointer",
          fontSize: 12,
          color: hover ? GOLD : TEXT_DIM,
          textAlign: "center",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
      >
        <div style={{ fontSize: 13 }}>Drop files here or click to choose</div>
        <div style={{ fontSize: 10, marginTop: 4 }}>
          {DOC_KIND_HINTS[kind]} · PDF / JPG / PNG / WEBP · 10 MiB max
        </div>
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
      {files.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((f) => (
            <li
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.file.name}{" "}
                <span style={{ color: TEXT_DIM, fontSize: 10 }}>
                  ({Math.round(f.file.size / 1024)} KB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: TEXT_DIM,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
                aria-label={`Remove ${f.file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
