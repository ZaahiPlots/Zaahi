"use client";
/**
 * ZAAHI Ambassador Dashboard
 *
 * Lets any approved user activate ambassador mode to get a unique
 * 8-char referral code + shareable link (zaahi.io/r/XXXXXXXX).
 *
 * Shows:
 *   - The referral link + QR + copy button
 *   - Downline counts (L1/L2/L3) + total
 *   - Earnings (pending / paid / last 30 days) in AED
 *   - 3-level downline tree (names + join dates only)
 *   - Full commission history
 *
 * Style: matches /dashboard — white cards on #FAFAFA, gold accent, Georgia headings.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";
const BG = "#FAFAFA";
const GREEN = "#2D6A4F";

// ── Types ──

interface Stats {
  referralCode: string | null;
  ambassadorActive: boolean;
  downlineL1: number;
  downlineL2: number;
  downlineL3: number;
  totalDownline: number;
  earningsPendingFils: string;
  earningsPaidFils: string;
  earningsTotalFils: string;
  commissionCount: number;
  last30DaysFils: string;
}

interface TreeNode {
  id: string;
  name: string;
  joinedAt: string;
  level: number;
  children: TreeNode[];
}

interface Commission {
  id: string;
  dealId: string;
  level: number;
  amountFils: string;
  basisFils: string;
  rate: string;
  status: "PENDING" | "PAID" | "REVERSED";
  createdAt: string;
  paidAt: string | null;
}

// ── Format helpers ──

function filsToAed(filsStr: string): string {
  const fils = BigInt(filsStr || "0");
  const HUNDRED = BigInt(100);
  const aed = Number(fils / HUNDRED) + Number(fils % HUNDRED) / 100;
  if (aed >= 1_000_000) return `AED ${(aed / 1_000_000).toFixed(2)}M`;
  if (aed >= 1_000) return `AED ${(aed / 1_000).toFixed(1)}K`;
  return `AED ${aed.toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Page ──

function AmbassadorInner() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, c] = await Promise.all([
        apiFetch("/api/ambassador/stats").then((r) => r.ok ? r.json() : null),
        apiFetch("/api/ambassador/tree").then((r) => r.ok ? r.json() : { tree: [] }),
        apiFetch("/api/ambassador/commissions?limit=100").then((r) => r.ok ? r.json() : { items: [] }),
      ]);
      setStats(s);
      setTree(t.tree || []);
      setCommissions(c.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const activate = async () => {
    setActivating(true);
    try {
      const r = await apiFetch("/api/ambassador/activate", { method: "POST" });
      if (r.ok) {
        await loadAll();
      } else {
        alert("Activation failed. Try again.");
      }
    } finally {
      setActivating(false);
    }
  };

  const copyLink = () => {
    if (!stats?.referralCode) return;
    const url = `${window.location.origin}/r/${stats.referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: SUBTLE, fontFamily: "-apple-system, Segoe UI, sans-serif" }}>
        Loading...
      </div>
    );
  }

  const referralUrl = stats?.referralCode
    ? (typeof window !== "undefined" ? `${window.location.origin}/r/${stats.referralCode}` : `/r/${stats.referralCode}`)
    : "";

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "24px 20px", fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif", color: TXT }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <Link href="/dashboard" style={{ fontSize: 12, color: SUBTLE, textDecoration: "none" }}>← Back to Dashboard</Link>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: GOLD, margin: "6px 0 0", letterSpacing: "0.05em" }}>
              AMBASSADOR PROGRAM
            </h1>
            <div style={{ fontSize: 13, color: SUBTLE, marginTop: 4 }}>
              Earn commission on every deal from your 3-level network
            </div>
          </div>
        </div>

        {/* Not activated — show CTA */}
        {!stats?.ambassadorActive && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, border: `1px solid ${LINE}`, marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌟</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 8px", color: TXT }}>Become a ZAAHI Ambassador</h2>
            <p style={{ color: SUBTLE, maxWidth: 560, margin: "0 auto 20px", fontSize: 14, lineHeight: 1.6 }}>
              Activate ambassador mode to get your personal referral link. Share it, and earn commissions on every deal closed by people you bring to ZAAHI — across 3 levels.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
              <RateCard level={1} rate="30%" desc="Direct referrals" />
              <RateCard level={2} rate="15%" desc="2nd generation" />
              <RateCard level={3} rate="5%" desc="3rd generation" />
            </div>
            <button
              onClick={activate}
              disabled={activating}
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, #B8975E 100%)`,
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: activating ? "wait" : "pointer",
                boxShadow: `0 4px 14px rgba(200, 169, 110, 0.35)`,
                opacity: activating ? 0.7 : 1,
              }}
            >
              {activating ? "Activating..." : "Activate Ambassador Mode"}
            </button>
          </div>
        )}

        {/* Activated — show link + QR + stats */}
        {stats?.ambassadorActive && stats.referralCode && (
          <>
            {/* Referral link card */}
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: `1px solid ${LINE}`, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Your Referral Link
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <code style={{
                      background: `${GOLD}11`,
                      border: `1px solid ${GOLD}33`,
                      padding: "10px 14px",
                      borderRadius: 6,
                      fontFamily: "'SF Mono', Menlo, monospace",
                      fontSize: 14,
                      fontWeight: 600,
                      color: TXT,
                      flex: 1,
                      minWidth: 260,
                    }}>{referralUrl}</code>
                    <button
                      onClick={copyLink}
                      style={{
                        background: copied ? GREEN : GOLD,
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "10px 18px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >{copied ? "✓ Copied" : "Copy"}</button>
                  </div>
                  <div style={{ fontSize: 11, color: SUBTLE }}>
                    Code: <b style={{ color: GOLD, fontFamily: "'SF Mono', Menlo, monospace" }}>{stats.referralCode}</b>
                    {" · "}Share anywhere — WhatsApp, Instagram, email
                  </div>
                </div>
                {/* QR */}
                <div style={{ textAlign: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/ambassador/qr/${stats.referralCode}`}
                    alt="QR"
                    width={130}
                    height={130}
                    style={{ border: `1px solid ${LINE}`, borderRadius: 6 }}
                  />
                  <div style={{ fontSize: 9, color: SUBTLE, marginTop: 4 }}>Scan to open</div>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <StatCard label="Total Downline" value={stats.totalDownline.toString()} sub={`L1 ${stats.downlineL1} · L2 ${stats.downlineL2} · L3 ${stats.downlineL3}`} />
              <StatCard label="Total Earned" value={filsToAed(stats.earningsTotalFils)} sub={`${stats.commissionCount} commissions`} color={GOLD} />
              <StatCard label="Pending Payout" value={filsToAed(stats.earningsPendingFils)} sub="awaiting admin" />
              <StatCard label="Last 30 days" value={filsToAed(stats.last30DaysFils)} sub="accrued" color={GREEN} />
            </div>

            {/* Downline tree */}
            <Section title="Your Network">
              {tree.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: SUBTLE, fontSize: 13 }}>
                  No referrals yet. Share your link to start building your network.
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  {tree.map((node) => <TreeNodeRow key={node.id} node={node} />)}
                </div>
              )}
            </Section>

            {/* Commission history */}
            <Section title="Commission History">
              {commissions.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: SUBTLE, fontSize: 13 }}>
                  No commissions yet. You&apos;ll earn when someone in your network closes a deal.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left", color: SUBTLE }}>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Date</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Level</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Basis</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Rate</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Amount</th>
                      <th style={{ padding: "8px 12px", fontWeight: 600, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${LINE}` }}>
                        <td style={{ padding: "10px 12px" }}>{formatDate(c.createdAt)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: `${GOLD}22`, color: GOLD, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>L{c.level}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: SUBTLE }}>{filsToAed(c.basisFils)}</td>
                        <td style={{ padding: "10px 12px", color: SUBTLE }}>{(parseFloat(c.rate) * 100).toFixed(0)}%</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: GOLD }}>{filsToAed(c.amountFils)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <StatusPill status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ──

function RateCard({ level, rate, desc }: { level: number; rate: string; desc: string }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 20px", minWidth: 140 }}>
      <div style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>Level {level}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: GOLD, margin: "4px 0" }}>{rate}</div>
      <div style={{ fontSize: 11, color: SUBTLE }}>{desc}</div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? TXT, margin: "4px 0", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: SUBTLE }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 10, border: `1px solid ${LINE}`, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${LINE}`, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Georgia, serif" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function TreeNodeRow({ node }: { node: TreeNode }) {
  return (
    <div style={{ marginLeft: (node.level - 1) * 20, padding: "6px 8px", borderLeft: node.level > 1 ? `2px solid ${GOLD}33` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ background: `${GOLD}22`, color: GOLD, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>L{node.level}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{node.name}</span>
        <span style={{ fontSize: 11, color: SUBTLE, marginLeft: "auto" }}>{formatDate(node.joinedAt)}</span>
      </div>
      {node.children.map((c) => <TreeNodeRow key={c.id} node={c} />)}
    </div>
  );
}

function StatusPill({ status }: { status: "PENDING" | "PAID" | "REVERSED" }) {
  const palette = {
    PENDING: { bg: "#F9F5EC", color: GOLD, label: "Pending" },
    PAID: { bg: "#E7F5EE", color: GREEN, label: "Paid" },
    REVERSED: { bg: "#FBEAEA", color: "#C74B4B", label: "Reversed" },
  }[status];
  return (
    <span style={{ background: palette.bg, color: palette.color, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
      {palette.label}
    </span>
  );
}

export default function AmbassadorPage() {
  return <AuthGuard><AmbassadorInner /></AuthGuard>;
}
