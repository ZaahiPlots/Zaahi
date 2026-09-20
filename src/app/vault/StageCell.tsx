"use client";

// ZAAHI Vault — inline stage select. Pill styling from stagePillStyle,
// optimistic update, revert + inline error on failed PATCH.

import { useState } from "react";
import { patchVaultEntry } from "./patchEntry";
import { stagePillStyle } from "./stagePill";
import { VAULT_STAGE_LABELS, type VaultStage } from "./types";

interface Props {
  entryId: string;
  stage: VaultStage;
  onSaved: (stage: VaultStage) => void;
}

export function StageCell({ entryId, stage, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function change(next: VaultStage) {
    if (next === stage) return;
    setError(null);
    onSaved(next); // optimistic
    const err = await patchVaultEntry(entryId, { stage: next });
    if (err) {
      onSaved(stage); // revert
      setError(err);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <select
        aria-label="Stage"
        data-testid="stage-select"
        value={stage}
        onChange={(e) => void change(e.target.value as VaultStage)}
        style={{
          ...stagePillStyle(stage),
          appearance: "none",
          WebkitAppearance: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
      >
        {(Object.keys(VAULT_STAGE_LABELS) as VaultStage[]).map((s) => (
          <option key={s} value={s} style={{ background: "#1A1A2E", color: "#f5f1e8" }}>
            {VAULT_STAGE_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <span style={{ color: "#E63946", fontSize: 11 }}>{error}</span>}
    </div>
  );
}
