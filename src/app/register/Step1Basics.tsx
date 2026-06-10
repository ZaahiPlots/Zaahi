"use client";

// Step 1 — basic info collection (spec §6.2 + founder backlog 2026-06-10):
//   email, phone (required as of 2026-06-10), nickname (live unique-check),
//   role select, referralPath sub-form when role===REFERRAL.

import { useEffect, useRef, useState } from "react";
import {
  Step1BasicsSchema,
  ROLE_LABELS,
  COHORT_APPLICANT_ROLES,
  type Step1Basics,
} from "@/lib/registration-validation";
import {
  inputStyle,
  labelStyle,
  helperStyle,
  errorStyle,
  primaryButtonStyle,
  GOLD,
  TEXT_DIM,
} from "./styles";

export interface Step1Props {
  initial: Partial<Step1Basics>;
  onNext: (basics: Step1Basics) => void;
}

type NicknameState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid_format" }
  | { status: "error" };

export function Step1Basics({ initial, onNext }: Step1Props) {
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [role, setRole] = useState<Step1Basics["role"]>(initial.role ?? "OWNER");
  const [referralDirect, setReferralDirect] = useState(initial.referralPath?.directContact ?? false);
  const [referralCount, setReferralCount] = useState<0 | 1 | 2 | 3>(
    (initial.referralPath?.intermediariesCount as 0 | 1 | 2 | 3) ?? 1,
  );
  const [nickState, setNickState] = useState<NicknameState>({ status: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live nickname check: debounce 400 ms after the field changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!nickname || nickname.length < 2) {
      setNickState({ status: "idle" });
      return;
    }
    setNickState({ status: "checking" });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/registration/check-nickname?n=${encodeURIComponent(nickname)}`,
        );
        const json = (await res.json()) as { available: boolean; code?: string };
        if (!res.ok && res.status !== 200) {
          setNickState({ status: "error" });
          return;
        }
        if (json.available) setNickState({ status: "available" });
        else if (json.code === "invalid_format") setNickState({ status: "invalid_format" });
        else setNickState({ status: "taken" });
      } catch {
        setNickState({ status: "error" });
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Step1BasicsSchema.safeParse({
      email,
      // Pass the trimmed value (not undefined-on-empty) so the schema's
      // min(1, "Phone is required.") error fires for blank input.
      phone: phone.trim(),
      nickname,
      role,
      referralPath:
        role === "REFERRAL"
          ? { directContact: referralDirect, intermediariesCount: referralCount }
          : undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const key = i.path.join(".") || "_form";
        if (!next[key]) next[key] = i.message;
      }
      setErrors(next);
      return;
    }
    if (nickState.status !== "available") {
      setErrors({ nickname: "Pick an available nickname before continuing." });
      return;
    }
    setErrors({});
    onNext(parsed.data);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          color: GOLD,
        }}
      >
        Tell us about you
      </h2>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: -10, lineHeight: 1.5 }}>
        Step 1 of 3 — basic info. Nothing is submitted yet.
      </div>

      <div>
        <label style={labelStyle} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={inputStyle}
        />
        {errors.email && <div style={errorStyle}>{errors.email}</div>}
      </div>

      <div>
        <label style={labelStyle} htmlFor="phone">
          Phone <span style={{ color: GOLD }}>*</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="+971 50 123 4567"
          required
          aria-required="true"
          style={inputStyle}
        />
        {errors.phone && <div style={errorStyle}>{errors.phone}</div>}
      </div>

      <div>
        <label style={labelStyle} htmlFor="nickname">
          Nickname
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.trim())}
          required
          autoComplete="username"
          minLength={2}
          maxLength={40}
          style={{
            ...inputStyle,
            borderColor:
              nickState.status === "available"
                ? GOLD
                : nickState.status === "taken" || nickState.status === "invalid_format"
                  ? "#ff6b6b"
                  : inputStyle.borderColor,
          }}
        />
        <NicknameStatus state={nickState} />
        {errors.nickname && <div style={errorStyle}>{errors.nickname}</div>}
        <div style={helperStyle}>
          Public-facing handle. 2-40 chars; letters, digits, _ or -. Real name stays private.
        </div>
      </div>

      <div>
        <label style={labelStyle} htmlFor="role">
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Step1Basics["role"])}
          style={inputStyle}
        >
          {COHORT_APPLICANT_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {errors.role && <div style={errorStyle}>{errors.role}</div>}
      </div>

      {role === "REFERRAL" && (
        <div style={{ borderLeft: `2px solid ${GOLD}`, paddingLeft: 14, marginTop: -4 }}>
          <div style={labelStyle}>How did you reach the owner?</div>
          {[
            { v: "direct" as const, label: "Direct contact with the owner" },
            { v: 1 as const, label: "1 intermediary between me and the owner" },
            { v: 2 as const, label: "2 intermediaries" },
            { v: 3 as const, label: "3 or more intermediaries" },
          ].map((opt) => {
            const checked =
              opt.v === "direct"
                ? referralDirect
                : !referralDirect && referralCount === opt.v;
            return (
              <label
                key={String(opt.v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: "6px 0",
                }}
              >
                <input
                  type="radio"
                  name="referral-path"
                  checked={checked}
                  onChange={() => {
                    if (opt.v === "direct") {
                      setReferralDirect(true);
                      setReferralCount(0);
                    } else {
                      setReferralDirect(false);
                      setReferralCount(opt.v);
                    }
                  }}
                  style={{ accentColor: GOLD }}
                />
                {opt.label}
              </label>
            );
          })}
          {errors.referralPath && <div style={errorStyle}>{errors.referralPath}</div>}
        </div>
      )}

      <button
        type="submit"
        style={{
          ...primaryButtonStyle,
          marginTop: 12,
          opacity: nickState.status === "available" ? 1 : 0.6,
        }}
        disabled={nickState.status !== "available" || !email || !nickname}
      >
        NEXT — DOCUMENTS →
      </button>
    </form>
  );
}

function NicknameStatus({ state }: { state: NicknameState }) {
  let text = "";
  let color = TEXT_DIM;
  if (state.status === "checking") text = "Checking availability…";
  else if (state.status === "available") {
    text = "✓ Available";
    color = GOLD;
  } else if (state.status === "taken") {
    text = "Already taken";
    color = "#ff6b6b";
  } else if (state.status === "invalid_format") {
    text = "Invalid format (2-40 chars; letters / digits / _ / -)";
    color = "#ff6b6b";
  } else if (state.status === "error") {
    text = "Could not verify — try again";
    color = "#ff6b6b";
  }
  if (!text) return null;
  return <div style={{ fontSize: 11, color, marginTop: 4 }}>{text}</div>;
}
