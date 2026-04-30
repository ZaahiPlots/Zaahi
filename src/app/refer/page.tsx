"use client";

/**
 * /refer — public Coming Soon landing for the ZAAHI referral program.
 *
 * Phase A only: marketing copy + email waitlist. Commission rate, attribution
 * mechanics, and payout flow are paused pending UAE counsel sign-off and
 * are deliberately NOT mentioned in copy. Form posts to
 * /api/referral-waitlist (public, rate-limited per IP hash).
 *
 * Style: glassmorphism over a navy background, GOLD (#C8A96E) accent —
 * consistent with the landing/auth page.
 */
import { useState } from "react";
import Link from "next/link";

const GOLD = "#C8A96E";

type Status = "idle" | "submitting" | "success" | "duplicate" | "rate_limited" | "error";

export default function ReferPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/referral-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.status === 200 || res.status === 201) {
        setStatus("success");
        return;
      }
      if (res.status === 409) {
        setStatus("duplicate");
        return;
      }
      if (res.status === 429) {
        setStatus("rate_limited");
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setErrorMsg(body?.error ?? `HTTP ${res.status}`);
      setStatus("error");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "network_error");
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #1A2D4A 0%, #0F1B2E 60%, #0A1428 100%)",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
      }}
    >
      <header
        style={{
          position: "absolute",
          top: 24,
          left: 24,
        }}
      >
        <Link
          href="/"
          style={{
            color: "rgba(255,255,255,0.6)",
            textDecoration: "none",
            fontSize: 13,
            letterSpacing: "0.04em",
          }}
          aria-label="К главной"
        >
          ← ZAAHI
        </Link>
      </header>

      <main
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(10, 22, 40, 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 999,
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Скоро
        </div>

        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: "0 0 12px",
          }}
        >
          Реферальная программа ZAAHI
        </h1>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.75)",
            margin: "0 0 28px",
          }}
        >
          Зарабатывайте на успешных сделках с земельными участками.
          Бесплатная регистрация, без подписки, RERA-compliant.
        </p>

        {status === "success" || status === "duplicate" ? (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 8,
              border: `1px solid ${GOLD}`,
              background: "rgba(200, 169, 110, 0.10)",
              color: "#FFFFFF",
              fontSize: 13,
              lineHeight: 1.5,
            }}
            role="status"
            aria-live="polite"
          >
            {status === "success"
              ? "Мы уведомим вас о запуске."
              : "Этот email уже в списке. Мы уведомим вас о запуске."}
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <label
              htmlFor="refer-email"
              style={{
                textAlign: "left",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Email
            </label>
            <input
              id="refer-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                color: "#FFFFFF",
                fontSize: 14,
                padding: "12px 14px",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 150ms ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = GOLD;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />

            {status === "rate_limited" && (
              <div
                style={{ fontSize: 12, color: "#E67E22", textAlign: "left" }}
                role="alert"
              >
                Слишком много попыток. Попробуйте позже.
              </div>
            )}
            {status === "error" && (
              <div
                style={{ fontSize: 12, color: "#E63946", textAlign: "left" }}
                role="alert"
              >
                Не удалось отправить{errorMsg ? ` (${errorMsg})` : ""}. Попробуйте ещё раз.
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting" || !email}
              style={{
                marginTop: 4,
                padding: "12px 20px",
                background: "rgba(200, 169, 110, 0.18)",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: status === "submitting" || !email ? "default" : "pointer",
                opacity: status === "submitting" || !email ? 0.6 : 1,
                transition: "background 150ms ease, border-color 150ms ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (status !== "submitting" && email) {
                  e.currentTarget.style.background = "rgba(200, 169, 110, 0.28)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(200, 169, 110, 0.18)";
              }}
            >
              {status === "submitting" ? "Отправка..." : "Уведомить меня"}
            </button>

            <p
              style={{
                margin: "12px 0 0",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.5,
              }}
            >
              Оставляя email, вы соглашаетесь получать одно письмо о запуске
              программы. Мы не рассылаем рекламу.
            </p>
          </form>
        )}
      </main>

      <footer
        style={{
          marginTop: 24,
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.04em",
        }}
      >
        ZAAHI · Dubai · 2026
      </footer>
    </div>
  );
}
