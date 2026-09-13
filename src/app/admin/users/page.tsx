"use client";

// /admin/users — platform user list with Pause / Resume subscription
// access (2026-09-13). AdminLayout (src/app/admin/layout.tsx) gates
// entry; the API re-checks getAdminUserId on every call and refuses
// self-pause and founder-pause server-side, so the disabled buttons
// here are a courtesy, not the guard.
//
// Flow per row: Pause → inline confirm (optional reason) → POST
// /api/admin/users/[id]/pause → list refresh. Resume mirrors it.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-fetch";
import {
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
  card,
  inputStyle,
  ghostBtn,
  primaryBtn,
  dangerBtn,
} from "../queue/styles";

type AccessStatus = "ACTIVE" | "PAUSED";

interface UserRow {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
  role: string;
  accessStatus: AccessStatus;
  pausedAt: string | null;
  pausedById: string | null;
  pausedByEmail: string | null;
  pauseReason: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  isFounder: boolean;
  isSelf: boolean;
}

interface ListResponse {
  items: UserRow[];
  nextCursor: string | null;
  total: number;
  selfId: string;
}

const STATUS_STYLE: Record<AccessStatus, { bg: string; fg: string; border: string }> = {
  ACTIVE: { bg: "rgba(45, 106, 79, 0.16)", fg: "#7DC79A", border: "rgba(45, 106, 79, 0.5)" },
  PAUSED: { bg: "rgba(230, 57, 70, 0.12)", fg: "#ff8a92", border: "rgba(230, 57, 70, 0.4)" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | AccessStatus>("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        params.set("limit", "50");
        if (cursor) params.set("cursor", cursor);
        const res = await apiFetch(`/api/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ListResponse;
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setNextCursor(data.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [q, status],
  );

  useEffect(() => {
    const t = setTimeout(() => { load(null); }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  function onChanged(updated: UserRow) {
    setItems((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, marginBottom: 2, letterSpacing: "-0.02em" }}>
            Users
          </h1>
          <div style={{ color: TEXT_DIM, fontSize: 12 }}>
            {loading && items.length === 0 ? "Loading…" : `${total.toLocaleString("en-US")} users`}
          </div>
        </div>
        <Link href="/admin" style={{ color: GOLD, fontSize: 12, textDecoration: "none", letterSpacing: "0.06em" }}>
          ← Admin
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, nickname…"
          aria-label="Search users"
          style={{ ...inputStyle, maxWidth: 360 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"; }}
        />
        <div role="group" aria-label="Status filter" style={{ display: "flex", gap: 4 }}>
          {(["", "ACTIVE", "PAUSED"] as const).map((s) => {
            const active = status === s;
            return (
              <button
                key={s || "all"}
                type="button"
                onClick={() => setStatus(s)}
                style={{
                  ...ghostBtn,
                  padding: "8px 14px",
                  background: active ? "rgba(200,169,110,0.12)" : "transparent",
                  borderColor: active ? `${GOLD}55` : "rgba(255,255,255,0.18)",
                  color: active ? GOLD : TEXT,
                  transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
                }}
              >
                {s === "" ? "All" : s === "ACTIVE" ? "Active" : "Paused"}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ ...card, padding: 14, color: "#ff8a92", fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((u) => (
          <Row key={u.id} user={u} onChanged={onChanged} />
        ))}
        {!loading && items.length === 0 && !error && (
          <div style={{ padding: "32px 0", color: TEXT_DIM, fontSize: 12, textAlign: "center" }}>
            No users match this filter.
          </div>
        )}
      </div>

      {nextCursor && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button type="button" style={ghostBtn} disabled={loading} onClick={() => load(nextCursor)}>
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ user, onChanged }: { user: UserRow; onChanged: (u: UserRow) => void }) {
  const [confirming, setConfirming] = useState<"pause" | "resume" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const paused = user.accessStatus === "PAUSED";
  const st = STATUS_STYLE[user.accessStatus];
  const locked = user.isFounder || user.isSelf;
  const lockTitle = user.isSelf ? "You cannot change your own access" : user.isFounder ? "Founder accounts cannot be paused" : undefined;

  async function submit(action: "pause" | "resume") {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = (await res.json()) as { ok: boolean; user?: UserRow; message?: string };
      if (!res.ok || !data.ok || !data.user) {
        setErr(data.message ?? `HTTP ${res.status}`);
        return;
      }
      onChanged({ ...user, ...data.user });
      setConfirming(null);
      setReason("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="user-row"
      data-user-id={user.id}
      style={{
        ...card,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        borderColor: paused ? "rgba(230, 57, 70, 0.35)" : "rgba(255, 255, 255, 0.15)",
        transition: "border-color 150ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </div>
          <div style={{ fontSize: 11, color: TEXT_DIM }}>
            {user.name}{user.nickname ? ` · @${user.nickname}` : ""}
          </div>
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: TEXT_FADE, minWidth: 90 }}>
          {user.role}
        </div>
        <span
          data-testid="access-status"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            padding: "4px 10px",
            borderRadius: 999,
            background: st.bg,
            color: st.fg,
            border: `1px solid ${st.border}`,
          }}
        >
          {user.accessStatus}
        </span>
        <div style={{ fontSize: 11, color: TEXT_FADE, minWidth: 120 }}>
          seen {fmtDate(user.lastSeenAt)}
        </div>
        {confirming === null && (
          paused ? (
            <button
              type="button"
              style={{ ...ghostBtn, color: "#7DC79A", borderColor: "rgba(45, 106, 79, 0.5)", opacity: locked ? 0.4 : 1 }}
              disabled={locked || busy}
              title={lockTitle}
              onClick={() => setConfirming("resume")}
            >
              Resume
            </button>
          ) : (
            <button
              type="button"
              style={{ ...dangerBtn, opacity: locked ? 0.4 : 1 }}
              disabled={locked || busy}
              title={lockTitle}
              onClick={() => setConfirming("pause")}
            >
              Pause
            </button>
          )
        )}
      </div>

      {paused && (
        <div style={{ fontSize: 11, color: TEXT_DIM, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span>Paused {fmtDate(user.pausedAt)}</span>
          <span>by {user.pausedByEmail ?? user.pausedById ?? "—"}</span>
          {user.pauseReason && <span style={{ color: TEXT_FADE }}>“{user.pauseReason}”</span>}
        </div>
      )}

      {confirming && (
        <div
          data-testid="confirm-step"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontSize: 12, color: TEXT }}>
            {confirming === "pause"
              ? <>Pause <strong>{user.email}</strong>? Access closes on their next request. Data, listings and vault stay intact.</>
              : <>Resume <strong>{user.email}</strong>? Access reopens immediately.</>}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Reason (optional, recorded in the audit trail)"
            aria-label="Reason"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"; }}
          />
          {err && <div style={{ fontSize: 12, color: "#ff8a92" }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={ghostBtn} disabled={busy} onClick={() => { setConfirming(null); setErr(null); }}>
              Cancel
            </button>
            <button
              type="button"
              style={confirming === "pause" ? { ...dangerBtn, fontWeight: 700 } : primaryBtn}
              disabled={busy}
              onClick={() => submit(confirming)}
            >
              {busy ? "Working…" : confirming === "pause" ? "Confirm pause" : "Confirm resume"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
