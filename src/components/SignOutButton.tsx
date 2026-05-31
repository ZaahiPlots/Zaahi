"use client";

// Sign-out control with global-scope revocation. Spec — Phase C
// Step 12 founder-added requirement: signOut({ scope: 'global' })
// invalidates ALL active sessions for this user across every device,
// not just the current browser. Confirmation dialog is mandatory
// (one accidental click and you log out of every device you own).
//
// Two visual variants share the same logic:
//   "compact" — 28×28 icon button matching the map HeaderBar control
//               style (gold border, navy translucent fill, hover lift)
//   "full"    — card-shaped button for the Dashboard Settings panel
//               with explanatory copy
//
// Locked surface — AuthGuard.tsx local signOut() in /home/zaahi/zaahi/
// src/components/AuthGuard.tsx and the inline signOut() at
// src/app/page.tsx:81 are intentional and remain byte-identical.
// This component is the new entry point for *user-initiated*
// global sign-out from anywhere inside the authenticated app.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

const GOLD = "#C8A96E";
const TXT = "#f5f1e8";
const SUBTLE = "rgba(255,255,255,0.55)";
const RED = "#E63946";

type Variant = "compact" | "full";

export function SignOutButton({ variant }: { variant: Variant }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Esc closes the confirmation while it's open.
  useEffect(() => {
    if (!confirmOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, busy]);

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      const { error: signOutErr } = await supabaseBrowser.auth.signOut({ scope: "global" });
      if (signOutErr) {
        setError(signOutErr.message);
        setBusy(false);
        return;
      }
      setSuccess(true);
      // Brief "signed out everywhere" beat before redirect so the user
      // sees the action took effect rather than feeling teleported.
      setTimeout(() => {
        router.replace("/");
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign out failed");
      setBusy(false);
    }
  }

  const trigger = variant === "compact" ? <CompactTrigger onClick={() => setConfirmOpen(true)} /> : <FullTrigger onClick={() => setConfirmOpen(true)} />;

  return (
    <>
      {trigger}
      {confirmOpen && (
        <ConfirmDialog
          busy={busy}
          error={error}
          success={success}
          onCancel={() => {
            if (busy) return;
            setConfirmOpen(false);
            setError(null);
          }}
          onConfirm={handleSignOut}
        />
      )}
    </>
  );
}

function CompactTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Sign out"
      aria-label="Sign out"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 6,
        border: "1px solid rgba(200, 169, 110, 0.3)",
        background: "rgba(0, 0, 0, 0.3)",
        color: GOLD,
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        cursor: "pointer",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)";
        e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
      }}
    >
      {/* Door-arrow-out glyph; matches the minimalist SVG language of the
          rest of the HeaderBar buttons. */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
        <path d="M11 11l3-3-3-3" />
        <path d="M14 8H6" />
      </svg>
    </button>
  );
}

function FullTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(200, 169, 110, 0.3)",
        borderRadius: 8,
        color: GOLD,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "border-color 150ms ease, background 150ms ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = GOLD;
        e.currentTarget.style.background = "rgba(200, 169, 110, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)";
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
        <path d="M11 11l3-3-3-3" />
        <path d="M14 8H6" />
      </svg>
      SIGN OUT
    </button>
  );
}

function ConfirmDialog({
  busy,
  error,
  success,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string | null;
  success: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(200, 169, 110, 0.25)",
          borderRadius: 14,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          color: TXT,
          boxShadow: "0 16px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 18,
                color: GOLD,
                marginBottom: 10,
                letterSpacing: "0.02em",
              }}
            >
              Signed out everywhere
            </div>
            <div style={{ fontSize: 12, color: SUBTLE, lineHeight: 1.5 }}>
              All active sessions on this account have been revoked. Redirecting…
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                color: GOLD,
                marginBottom: 8,
                letterSpacing: "0.02em",
              }}
            >
              Sign out from all devices?
            </div>
            <div style={{ fontSize: 12, color: SUBTLE, lineHeight: 1.55, marginBottom: 18 }}>
              This will revoke every active session for your account — every browser,
              every phone, every computer. You&rsquo;ll need to sign in again everywhere.
            </div>
            {error && (
              <div
                style={{
                  fontSize: 11,
                  color: "#ff8a92",
                  background: "rgba(230,57,70,0.08)",
                  border: "1px solid rgba(230,57,70,0.3)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  marginBottom: 12,
                }}
              >
                ✕ {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                style={{
                  padding: "10px 18px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 8,
                  color: TXT,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: busy ? 0.5 : 1,
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                style={{
                  padding: "10px 18px",
                  background: busy ? "rgba(230,57,70,0.4)" : RED,
                  border: 0,
                  borderRadius: 8,
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor: busy ? "wait" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {busy ? "SIGNING OUT…" : "SIGN OUT EVERYWHERE"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
