"use client";

// ── Admin panel: Ambassador Applications ──────────────────────────────
// Main page listing all applications with filter tabs (All / Pending /
// Approved / Rejected / Active), search, and per-row Approve / Reject /
// View actions. Glassmorphism ZAAHI style — navy base, gold accents.
// All mutations go through /api/admin/ambassador-applications/*.
//
// The layout guard (src/app/admin/layout.tsx) verifies admin access
// before rendering this page — no extra client check needed here.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-fetch";
import { ApplicationDetailModal } from "./ApplicationDetailModal";
import { ApproveConfirmModal } from "./ApproveConfirmModal";
import { RejectModal } from "./RejectModal";
import { PLAN_PRICES_AED, type AmbassadorPlan } from "@/lib/ambassador-plans";

const GOLD = "#C8A96E";

export type AmbassadorApp = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  experience: string | null;
  plan: string; // SILVER | GOLD | PLATINUM
  txHash: string;
  status: string; // PENDING | APPROVED | ACTIVE | REJECTED
  checklistData: Record<string, boolean> | null;
  referralCode: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  active: number;
  totalRevenueAed: number;
};

type Tab = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE";

type Toast = { kind: "ok" | "warn" | "error"; text: string } | null;

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "ACTIVE", label: "Active" },
  { key: "REJECTED", label: "Rejected" },
];

export default function AmbassadorAdminPage() {
  const [applications, setApplications] = useState<AmbassadorApp[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, active: 0, totalRevenueAed: 0 });
  const [tab, setTab] = useState<Tab>("PENDING");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<AmbassadorApp | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AmbassadorApp | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", tab);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "200");
      const res = await apiFetch(`/api/admin/ambassador-applications?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setApplications(json.applications || []);
        setStats(json.stats || { pending: 0, approved: 0, rejected: 0, active: 0, totalRevenueAed: 0 });
      } else {
        setToast({ kind: "error", text: `Failed to load (${res.status})` });
      }
    } catch (e) {
      setToast({ kind: "error", text: `Network error: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const detailApp = useMemo(
    () => applications.find((a) => a.id === detailId) ?? null,
    [applications, detailId],
  );

  async function handleApprove(app: AmbassadorApp) {
    try {
      const res = await apiFetch(`/api/admin/ambassador-applications/${app.id}/approve`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setToast({ kind: "error", text: `Not pending (current: ${json.currentStatus}). Refreshing…` });
      } else if (!res.ok) {
        setToast({ kind: "error", text: `Approve failed: ${json.error || res.status}` });
      } else {
        const warnBits: string[] = [];
        if (!json.emailSent) warnBits.push("email not sent");
        if (!json.telegramSent) warnBits.push("telegram not sent");
        if (warnBits.length > 0) {
          setToast({
            kind: "warn",
            text: `Approved — but ${warnBits.join(" & ")}. Check env vars.`,
          });
        } else {
          setToast({ kind: "ok", text: `Approved. Code: ${json.referralCode}` });
        }
      }
    } catch (e) {
      setToast({ kind: "error", text: `Approve error: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setApproveTarget(null);
      await reload();
    }
  }

  async function handleReject(app: AmbassadorApp, reasonType: string, reasonText: string) {
    try {
      const res = await apiFetch(`/api/admin/ambassador-applications/${app.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reasonType, reasonText }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setToast({ kind: "error", text: `Not pending (current: ${json.currentStatus}). Refreshing…` });
      } else if (!res.ok) {
        setToast({ kind: "error", text: `Reject failed: ${json.error || res.status}` });
      } else {
        const warnBits: string[] = [];
        if (!json.emailSent) warnBits.push("email not sent");
        if (!json.telegramSent) warnBits.push("telegram not sent");
        if (warnBits.length > 0) {
          setToast({
            kind: "warn",
            text: `Rejected — but ${warnBits.join(" & ")}. Check env vars.`,
          });
        } else {
          setToast({ kind: "ok", text: "Rejected." });
        }
      }
    } catch (e) {
      setToast({ kind: "error", text: `Reject error: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setRejectTarget(null);
      await reload();
    }
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "rgba(10, 22, 40, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "18px 20px",
          marginBottom: 20,
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Ambassador Applications
            </div>
            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.55)", marginTop: 2, letterSpacing: "0.04em" }}>
              Approve, reject, and monitor ZAAHI ambassador signups
            </div>
          </div>
          <Link
            href="/parcels/map"
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              textDecoration: "none",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "6px 12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 6,
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            ← Back to map
          </Link>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 16 }}>
          <StatCard label="Pending" value={stats.pending} accent="#E67E22" />
          <StatCard label="Approved" value={stats.approved} accent="#2D6A4F" />
          <StatCard label="Active" value={stats.active} accent="#1B4965" />
          <StatCard label="Rejected" value={stats.rejected} accent="#E63946" />
          <StatCard
            label="Total revenue"
            value={stats.totalRevenueAed.toLocaleString("en-US")}
            suffix="AED"
            accent={GOLD}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: 14, overflowX: "auto" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: "transparent",
                border: 0,
                padding: "10px 16px",
                color: active ? GOLD : "rgba(255, 255, 255, 0.55)",
                cursor: "pointer",
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 700,
                fontFamily: 'Georgia, "Times New Roman", serif',
                borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                marginBottom: -1,
                transition: "color 150ms ease",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
              {t.key === "PENDING" && stats.pending > 0 ? ` (${stats.pending})` : ""}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or tx hash…"
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.92)",
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 150ms ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: "rgba(10, 22, 40, 0.5)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <Th>Date</Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>TX</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "rgba(255, 255, 255, 0.4)" }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && applications.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "rgba(255, 255, 255, 0.4)" }}>
                    No applications match this filter.
                  </td>
                </tr>
              )}
              {!loading && applications.map((app) => (
                <tr
                  key={app.id}
                  style={{
                    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Td>{formatDate(app.createdAt)}</Td>
                  <Td>{app.name}</Td>
                  <Td mono>{app.email}</Td>
                  <Td><PlanBadge plan={app.plan as AmbassadorPlan} /></Td>
                  <Td>{formatPriceAed(app.plan as AmbassadorPlan)}</Td>
                  <Td><TxCell txHash={app.txHash} /></Td>
                  <Td><StatusBadge status={app.status} /></Td>
                  <Td align="right">
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <RowButton onClick={() => setDetailId(app.id)}>View</RowButton>
                      {app.status === "PENDING" && (
                        <>
                          <RowButton onClick={() => setApproveTarget(app)} accent="#2D6A4F">Approve</RowButton>
                          <RowButton onClick={() => setRejectTarget(app)} accent="#E63946">Reject</RowButton>
                        </>
                      )}
                      {(app.status === "APPROVED" || app.status === "ACTIVE") && app.referralCode && (
                        <span
                          title="Referral code"
                          style={{
                            padding: "3px 8px",
                            border: `1px solid ${GOLD}`,
                            borderRadius: 4,
                            color: GOLD,
                            fontFamily: '"SF Mono", Menlo, monospace',
                            fontSize: 11,
                            background: "rgba(200, 169, 110, 0.1)",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {app.referralCode}
                        </span>
                      )}
                      {app.status === "REJECTED" && app.rejectionReason && (
                        <span
                          title={app.rejectionReason}
                          style={{
                            padding: "3px 8px",
                            color: "rgba(230, 57, 70, 0.8)",
                            fontSize: 11,
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {app.rejectionReason}
                        </span>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.kind === "ok" ? "rgba(45, 106, 79, 0.9)" :
              toast.kind === "warn" ? "rgba(230, 126, 34, 0.9)" :
              "rgba(230, 57, 70, 0.9)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#FFFFFF",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 12,
            letterSpacing: "0.02em",
            zIndex: 50,
            boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4)",
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Modals */}
      {detailApp && (
        <ApplicationDetailModal
          app={detailApp}
          onClose={() => setDetailId(null)}
          onApprove={() => { setApproveTarget(detailApp); setDetailId(null); }}
          onReject={() => { setRejectTarget(detailApp); setDetailId(null); }}
        />
      )}
      {approveTarget && (
        <ApproveConfirmModal
          app={approveTarget}
          onCancel={() => setApproveTarget(null)}
          onConfirm={() => handleApprove(approveTarget)}
        />
      )}
      {rejectTarget && (
        <RejectModal
          app={rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reasonType, reasonText) => handleReject(rejectTarget, reasonType, reasonText)}
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function StatCard({ label, value, suffix, accent }: { label: string; value: string | number; suffix?: string; accent: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 9, color: "rgba(255, 255, 255, 0.5)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent, marginTop: 3, letterSpacing: "-0.01em" }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6, fontWeight: 600, letterSpacing: "0.02em" }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "10px 12px",
        fontSize: 9,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(255, 255, 255, 0.5)",
        fontWeight: 700,
        fontFamily: 'Georgia, "Times New Roman", serif',
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono, align = "left" }: { children: React.ReactNode; mono?: boolean; align?: "left" | "right" }) {
  return (
    <td
      style={{
        padding: "10px 12px",
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.85)",
        fontFamily: mono ? '"SF Mono", Menlo, monospace' : "inherit",
        textAlign: align,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

function RowButton({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: string }) {
  const color = accent || "rgba(255, 255, 255, 0.7)";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        background: "transparent",
        border: `1px solid ${accent ? accent + "80" : "rgba(255, 255, 255, 0.15)"}`,
        borderRadius: 4,
        color,
        cursor: "pointer",
        transition: "background 150ms ease, border-color 150ms ease",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = accent ? `${accent}25` : "rgba(255, 255, 255, 0.06)";
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = accent ? accent + "80" : "rgba(255, 255, 255, 0.15)";
      }}
    >
      {children}
    </button>
  );
}

function PlanBadge({ plan }: { plan: AmbassadorPlan | string }) {
  const styles: Record<string, { bg: string; fg: string; border: string }> = {
    SILVER: { bg: "rgba(192, 192, 192, 0.15)", fg: "#E0E0E0", border: "rgba(192, 192, 192, 0.4)" },
    GOLD: { bg: "rgba(200, 169, 110, 0.15)", fg: GOLD, border: "rgba(200, 169, 110, 0.5)" },
    PLATINUM: { bg: "rgba(229, 228, 226, 0.15)", fg: "#E5E4E2", border: "rgba(229, 228, 226, 0.5)" },
  };
  const s = styles[plan] || styles.SILVER;
  return (
    <span
      style={{
        padding: "2px 8px",
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        borderRadius: 3,
        fontSize: 10,
        letterSpacing: "0.12em",
        fontWeight: 700,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: "rgba(230, 126, 34, 0.15)", fg: "#E67E22" },
    APPROVED: { bg: "rgba(45, 106, 79, 0.2)", fg: "#4ADE80" },
    ACTIVE: { bg: "rgba(27, 73, 101, 0.25)", fg: "#60A5FA" },
    REJECTED: { bg: "rgba(230, 57, 70, 0.15)", fg: "#F87171" },
  };
  const s = styles[status] || { bg: "rgba(255,255,255,0.1)", fg: "rgba(255,255,255,0.6)" };
  return (
    <span
      style={{
        padding: "2px 8px",
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.fg}40`,
        borderRadius: 3,
        fontSize: 10,
        letterSpacing: "0.12em",
        fontWeight: 700,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {status}
    </span>
  );
}

function TxCell({ txHash }: { txHash: string }) {
  const short = txHash.length > 14 ? `${txHash.slice(0, 8)}…${txHash.slice(-4)}` : txHash;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontFamily: '"SF Mono", Menlo, monospace', fontSize: 11 }}>{short}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(txHash)}
        title="Copy tx hash"
        style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0, fontSize: 12 }}
      >
        ⎘
      </button>
      <a
        href={`https://tronscan.org/#/transaction/${txHash}`}
        target="_blank"
        rel="noreferrer noopener"
        title="Open on Tronscan"
        style={{ color: GOLD, fontSize: 11, textDecoration: "none" }}
      >
        ↗
      </a>
    </span>
  );
}

function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${month} ${hh}:${mm}`;
}

function formatPriceAed(plan: AmbassadorPlan | string): string {
  const price = PLAN_PRICES_AED[plan as AmbassadorPlan];
  return price ? `${price.toLocaleString("en-US")} AED` : "—";
}
