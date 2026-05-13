"use client";

// ZAAHI Vault — "Add to my vault" button for shared-with-me entries.
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.6.
//
// Single button. Click → POST /api/vault/shared-with-me/[shareId]/import.
// On success, calls onImported with the new vault entry id so the
// caller can navigate / refresh.

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";

interface Props {
  shareId: string;
  onImported: (newVaultEntryId: string) => void;
  /** Optional disabled state from caller (e.g. while another action is in flight). */
  disabled?: boolean;
}

export function ImportFromShareButton({ shareId, onImported, disabled }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await apiFetch(`/api/vault/shared-with-me/${shareId}/import`, {
        method: "POST",
      });
      if (r.status === 409) {
        setError("You already have this plot in your vault.");
        return;
      }
      if (r.status === 410) {
        setError("This share has been revoked or expired.");
        return;
      }
      if (!r.ok) {
        setError(`Import failed (${r.status})`);
        return;
      }
      const d = (await r.json()) as { newVaultEntryId: string };
      onImported(d.newVaultEntryId);
    } catch (e) {
      console.error("[ImportFromShareButton] post:", e);
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <button
        onClick={handleImport}
        disabled={disabled || submitting}
        style={{
          background: "rgba(200, 169, 110, 0.15)",
          border: `1px solid ${GOLD}`,
          color: GOLD,
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 600,
          cursor: disabled || submitting ? "not-allowed" : "pointer",
          opacity: disabled || submitting ? 0.5 : 1,
          width: "100%",
          transition: "background 150ms ease, border-color 150ms ease",
        }}
      >
        {submitting ? "Adding to vault…" : "Add to my vault"}
      </button>
      {error && (
        <p style={{ color: "#E63946", fontSize: 12, marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
