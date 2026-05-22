"use client";

// ZAAHI Vault — Upload Wizard root container.
//
// 3-step state machine for adding a plot to the caller's vault:
//   Step 1 PlotLookup → Step 2 Details → Step 3 Confirm
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.1.
//
// Standalone component for Day 6 Pass-A. Pass-B (gated on founder
// approval) integrates this into the existing AddPlotModal in
// src/app/parcels/map/AddPlotModal.tsx.
//
// Public API:
//   <AddPlotWizard
//     onCreated={(entryId) => …}      // a new VaultEntry was created
//     onCancel={() => …}              // user backed out of the wizard
//     onExistingFound={(id) => …}     // caller already has this plot — let
//                                     // the parent navigate to the existing entry
//   />

import { useState } from "react";
import { Step1PlotLookup } from "./Step1PlotLookup";
import { Step2Details } from "./Step2Details";
import { Step3Confirm, type CreatedCoords } from "./Step3Confirm";
import { INITIAL_WIZARD_STATE, type WizardState } from "./types";

export type { CreatedCoords };

interface Props {
  onCreated: (entryId: string, coords: CreatedCoords) => void;
  onCancel: () => void;
  onExistingFound?: (existingId: string) => void;
  /** Optional channel for submit-side errors — caller can show a toast. */
  onError?: (message: string) => void;
}

export function AddPlotWizard({ onCreated, onCancel, onExistingFound, onError }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE);

  function patch(p: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...p }));
  }

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      <StepIndicator step={step} />
      {step === 1 && (
        <Step1PlotLookup
          state={state}
          onComplete={(p) => {
            patch(p);
            setStep(2);
          }}
          onExistingFound={(id) => onExistingFound?.(id)}
        />
      )}
      {step === 2 && (
        <Step2Details
          state={state}
          onComplete={(p) => {
            patch(p);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step3Confirm
          state={state}
          onBack={() => setStep(2)}
          onCreated={onCreated}
          onCancel={onCancel}
          onError={onError}
        />
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Plot", "Your data", "Confirm"];
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 14, justifyContent: "center" }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isDone = n < step;
        return (
          <div
            key={label}
            style={{
              flex: 1,
              padding: "8px 12px",
              textAlign: "center",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: isActive ? "#C8A96E" : isDone ? "rgba(200, 169, 110, 0.5)" : "rgba(255, 255, 255, 0.35)",
              borderBottom: `2px solid ${isActive ? "#C8A96E" : "rgba(255, 255, 255, 0.1)"}`,
              fontWeight: isActive ? 600 : 400,
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            {n}. {label}
          </div>
        );
      })}
    </div>
  );
}
