"use client";

// /register — public 3-step cohort-pilot registration (spec-05 §6).
// Replaces the legacy stub redirect. Step state is React-local; URL
// stays /register throughout (no /register/step-1 sub-routes). Avoids
// back-button + state-loss issues, keeps forms simple, and lets the
// user navigate freely between steps.

import { useState } from "react";
import { RegisterShell, type RegisterStep } from "./RegisterShell";
import { Step1Basics } from "./Step1Basics";
import { Step2Documents, type DocFile } from "./Step2Documents";
import { Step3Review, type SubmitResult } from "./Step3Review";
import { Confirmation } from "./Confirmation";
import type { Step1Basics as Step1BasicsType } from "@/lib/registration-validation";

export default function RegisterPage() {
  const [step, setStep] = useState<RegisterStep>(1);
  const [basics, setBasics] = useState<Partial<Step1BasicsType>>({});
  const [files, setFiles] = useState<DocFile[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);

  return (
    <RegisterShell step={step}>
      {step === 1 && (
        <Step1Basics
          initial={basics}
          onNext={(b) => {
            setBasics(b);
            setStep(2);
          }}
        />
      )}

      {step === 2 && basics.role && (
        <Step2Documents
          role={basics.role}
          initial={files}
          onBack={() => setStep(1)}
          onNext={(f) => {
            setFiles(f);
            setStep(3);
          }}
        />
      )}

      {step === 3 && basics.email && basics.nickname && basics.role && (
        <Step3Review
          basics={basics as Step1BasicsType}
          files={files}
          onBack={() => setStep(2)}
          onSubmitted={(r) => {
            setResult(r);
            setStep("done");
          }}
        />
      )}

      {step === "done" && result && <Confirmation result={result} />}
    </RegisterShell>
  );
}
