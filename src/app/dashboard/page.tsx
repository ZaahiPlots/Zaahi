"use client";
/**
 * ZAAHI Dashboard — personal cabinet for every approved user.
 *
 * Phase 1 (2026-04-16): hydrates from /api/me, persists profile via PATCH,
 * OWNER "My Properties" section backed by /api/me/plots with view stats,
 * Favorites / Notifications / Saved Searches all real-data. Sections that
 * are still placeholder carry a "Phase 2" badge so users know what's
 * live vs. coming soon.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api-fetch";
import AuthGuard from "@/components/AuthGuard";

const GOLD = "#C8A96E";
const GOLD_TEXT = "#e8d5a8";
const TXT = "#f5f1e8";
const SUBTLE = "rgba(245, 241, 232, 0.55)";
const DIM = "rgba(245, 241, 232, 0.75)";
const LINE = "rgba(200, 169, 110, 0.15)";
const BG = "linear-gradient(180deg, #0A1628 0%, #050B18 100%)";

type Role = "OWNER" | "BUYER" | "BROKER" | "INVESTOR" | "DEVELOPER" | "ARCHITECT" | "ADMIN";

// Shape returned by GET /api/me. Narrow subset — fields we actually render.
interface MeUser {
  id: string;
  email: string;
  role: Role;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  currency: string | null;
  companyName: string | null;
  reraLicense: string | null;
  brnNumber: string | null;
  onboardingCompleted: boolean;
  referralCode: string | null;
  ambassadorActive: boolean;
}

function useMe(): { user: MeUser | null; reload: () => Promise<void>; error: string | null } {
  const [user, setUser] = useState<MeUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const r = await apiFetch("/api/me");
      if (!r.ok) { setError(`HTTP ${r.status}`); return; }
      setUser(await r.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { user, reload, error };
}

function initialsFromName(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

type SectionKey =
  | "overview" | "profile" | "properties" | "favorites" | "savedSearches"
  | "deals" | "documents" | "financials" | "notifications"
  | "pending" | "settings";

const NAV: Array<{ key: SectionKey; icon: string; label: string; rolesOnly?: Role[] }> = [
  { key: "overview", icon: "📊", label: "Overview" },
  { key: "profile", icon: "👤", label: "Profile" },
  { key: "properties", icon: "🏗️", label: "My Properties", rolesOnly: ["OWNER", "BROKER", "INVESTOR", "DEVELOPER"] },
  { key: "favorites", icon: "❤️", label: "Favorites" },
  { key: "savedSearches", icon: "🔍", label: "Saved Searches" },
  { key: "deals", icon: "📋", label: "My Deals" },
  { key: "documents", icon: "📄", label: "Documents" },
  { key: "financials", icon: "💰", label: "Financials", rolesOnly: ["BROKER"] },
  { key: "notifications", icon: "🔔", label: "Notifications" },
  { key: "pending", icon: "🧾", label: "Pending Reviews", rolesOnly: ["OWNER", "ADMIN"] },
  { key: "settings", icon: "⚙️", label: "Settings" },
];

function DashboardInner() {
  const [section, setSection] = useState<SectionKey>("overview");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [unreadNotif, setUnreadNotif] = useState<number>(0);
  const { user, reload } = useMe();
  const currentRole: Role = user?.role ?? "BUYER";
  const visibleNav = useMemo(
    () => NAV.filter((n) => !n.rolesOnly || n.rolesOnly.includes(currentRole)),
    [currentRole],
  );

  // Pre-fetch the PENDING_REVIEW queue size so the sidebar can show a
  // badge without waiting for the user to click into the section. API
  // returns 401 for non-admin callers — swallow silently so non-admin
  // sessions don't spam the console.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch("/api/parcels/pending");
        if (!r.ok) return;
        const data = (await r.json()) as { count?: number };
        if (alive && typeof data.count === "number") setPendingCount(data.count);
      } catch {
        /* non-admin or offline — silently ignore */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Pre-fetch unread notification count for the sidebar badge.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch("/api/me/notifications?unread=1");
        if (!r.ok) return;
        const data = (await r.json()) as { unreadCount?: number };
        if (alive && typeof data.unreadCount === "number") setUnreadNotif(data.unreadCount);
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, display: "flex", fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          background: "rgba(10, 22, 40, 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRight: `1px solid ${LINE}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: "0.22em", color: GOLD }}>
            ZAAHI
          </div>
          <div style={{ fontSize: 9, color: SUBTLE, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>
            Real Estate OS
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleNav.map((n) => {
            const active = n.key === section;
            return (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  background: active ? "rgba(200,169,110,0.12)" : "transparent",
                  border: 0,
                  borderLeft: `3px solid ${active ? GOLD : "transparent"}`,
                  borderRadius: 4,
                  color: active ? GOLD : TXT,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 14 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {((n.key === "pending" && pendingCount != null && pendingCount > 0) ||
                  (n.key === "notifications" && unreadNotif > 0)) && (
                  <span
                    style={{
                      minWidth: 20,
                      height: 18,
                      padding: "0 6px",
                      borderRadius: 10,
                      background: GOLD,
                      color: "#0A1628",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {n.key === "pending" ? pendingCount : unreadNotif}
                  </span>
                )}
              </button>
            );
          })}
          {/* External link to the Ambassador Program dashboard */}
          <Link
            href="/ambassador"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderLeft: `3px solid transparent`,
              color: TXT,
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "none",
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>🌟</span>
            Ambassador
          </Link>
        </nav>

        <Link
          href="/parcels/map"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            borderTop: `1px solid ${LINE}`,
            color: SUBTLE,
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          🗺️ Back to Map
        </Link>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header user={user} />
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {section === "overview" && <Overview user={user} />}
          {section === "profile" && <Profile user={user} onSaved={reload} />}
          {section === "properties" && <Properties />}
          {section === "favorites" && <Favorites />}
          {section === "savedSearches" && <SavedSearches />}
          {section === "deals" && <Deals />}
          {section === "documents" && <Documents />}
          {section === "financials" && <Financials />}
          {section === "notifications" && <Notifications onUnreadChange={setUnreadNotif} />}
          {section === "pending" && <PendingReviews onCount={setPendingCount} />}
          {section === "settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────
function Header({ user }: { user: MeUser | null }) {
  const initials = initialsFromName(user?.name);
  return (
    <div
      style={{
        height: 56,
        background: "rgba(10, 22, 40, 0.5)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        borderBottom: `1px solid ${LINE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.2 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{user?.name ?? "…"}</span>
        <span style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {user?.role ?? ""}
          {user?.ambassadorActive && <span style={{ color: GOLD, marginLeft: 6 }}>· Ambassador</span>}
        </span>
      </div>
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={initials} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${LINE}` }} />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: GOLD,
            color: "#0A1628",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Reusable atoms ─────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "rgba(10, 22, 40, 0.4)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: GOLD, margin: "0 0 4px", letterSpacing: 0.5 }}>
      {children}
    </h1>
  );
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1.4, margin: "0 0 10px" }}>
      {children}
    </h2>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: SUBTLE, margin: "0 0 20px" }}>{children}</p>;
}
function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: string }) {
  return (
    <Card>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ?? TXT, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: SUBTLE, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      {children}
    </label>
  );
}
function input(): React.CSSProperties {
  return {
    width: "100%",
    fontSize: 12,
    padding: "8px 10px",
    border: `1px solid ${LINE}`,
    borderRadius: 6,
    background: "rgba(255,255,255,0.04)",
    color: TXT,
    outline: "none",
    fontFamily: "inherit",
  };
}
function GoldBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        background: disabled ? "rgba(200, 169, 110, 0.3)" : GOLD,
        color: disabled ? "rgba(255,255,255,0.6)" : "white",
        fontSize: 12,
        fontWeight: 700,
        border: 0,
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </button>
  );
}

// Small banner used across sections that aren't fully live yet.
function ComingSoonBanner({ text, accent = GOLD }: { text: string; accent?: string }) {
  return (
    <div
      style={{
        background: "rgba(200, 169, 110, 0.08)",
        border: `1px solid rgba(200, 169, 110, 0.25)`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 11,
        color: DIM,
        lineHeight: 1.5,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ color: accent, fontWeight: 700, letterSpacing: "0.08em", fontSize: 10, textTransform: "uppercase" }}>Phase</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
}

// Toast for inline success/error feedback in forms.
function Toast({ kind, text }: { kind: "ok" | "err"; text: string }) {
  const bg = kind === "ok" ? "rgba(45, 106, 79, 0.2)" : "rgba(230, 57, 70, 0.2)";
  const fg = kind === "ok" ? "#4ADE80" : "#F87171";
  return (
    <div
      role="status"
      style={{
        padding: "8px 12px",
        border: `1px solid ${fg}40`,
        background: bg,
        color: fg,
        borderRadius: 8,
        fontSize: 11,
        marginTop: 8,
      }}
    >
      {text}
    </div>
  );
}

// ─── Section: Overview ──────────────────────────────────────────────
function Overview({ user }: { user: MeUser | null }) {
  const role = user?.role ?? "BUYER";
  const stats = STATS_BY_ROLE[role] ?? STATS_BY_ROLE.BUYER ?? [];
  const firstName = (user?.name ?? "").split(" ")[0] || "there";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <H1>Welcome back, {firstName}</H1>
        <Sub>
          You are signed in as {role.toLowerCase()}.
          {user?.ambassadorActive && <span style={{ color: GOLD }}> · Ambassador active</span>}
        </Sub>
      </div>
      <ComingSoonBanner text="Portfolio stats below are placeholder figures — live data lands in Phase 2 (OWNER analytics, BROKER commissions). Your Plots + Favorites + Saved Searches sections are fully live." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Archibald advice */}
      <Card style={{ borderColor: GOLD, background: "rgba(200,169,110,0.05)" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 32 }}>🐱</div>
          <div>
            <div style={{ color: GOLD, fontWeight: 700, fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              Archibald says
            </div>
            <p style={{ fontSize: 12, color: TXT, margin: 0, lineHeight: 1.5 }}>
              {ROLE_TIPS[role] ?? ROLE_TIPS.BUYER}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent activity — placeholder until Phase 2 ActivityLog pipeline lands */}
      <div>
        <H2>Recent Activity</H2>
        <Card style={{ padding: 0 }}>
          {RECENT_ACTIVITY.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 14px",
                borderBottom: i < RECENT_ACTIVITY.length - 1 ? `1px solid ${LINE}` : "none",
                fontSize: 12,
              }}
            >
              <span style={{ fontSize: 14 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div>{a.text}</div>
                <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>{a.when}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

const STATS_BY_ROLE: Partial<Record<Role, Array<{ label: string; value: string; icon: string; accent?: string }>>> = {
  OWNER: [
    { label: "My Properties", value: "—", icon: "🏗️" },
    { label: "Active Deals", value: "—", icon: "🤝" },
    { label: "Portfolio Value", value: "— AED", icon: "💰", accent: GOLD },
    { label: "Views This Month", value: "—", icon: "👁️" },
  ],
  BROKER: [
    { label: "Active Listings", value: "—", icon: "🏗️" },
    { label: "Pending Deals", value: "—", icon: "📋" },
    { label: "Commission Earned", value: "— AED", icon: "💰", accent: GOLD },
    { label: "Commission Pending", value: "— AED", icon: "⏳" },
  ],
  BUYER: [
    { label: "Saved Properties", value: "—", icon: "❤️" },
    { label: "Active Offers", value: "—", icon: "📋" },
    { label: "Feasibility Reports", value: "—", icon: "📊" },
    { label: "Viewed This Month", value: "—", icon: "👁️" },
  ],
  DEVELOPER: [
    { label: "Projects", value: "—", icon: "🏗️" },
    { label: "Plots Under Dev", value: "—", icon: "🚧" },
    { label: "Pipeline Value", value: "— AED", icon: "💰", accent: GOLD },
    { label: "Active Tenders", value: "—", icon: "📑" },
  ],
  INVESTOR: [
    { label: "Portfolio Plots", value: "—", icon: "🏗️" },
    { label: "Total Invested", value: "— AED", icon: "💰", accent: GOLD },
    { label: "Projected ROI", value: "—%", icon: "📈" },
    { label: "Watchlist", value: "—", icon: "👁️" },
  ],
  ARCHITECT: [
    { label: "Active Projects", value: "—", icon: "🏗️" },
    { label: "Feasibility Reports", value: "—", icon: "📊" },
    { label: "Client Proposals", value: "—", icon: "📋" },
    { label: "Templates", value: "—", icon: "📄" },
  ],
};

const ROLE_TIPS: Partial<Record<Role, string>> = {
  OWNER: "Use \"My Properties\" to see live view counts and who's opening your Site Plan PDF. Detailed analytics land in Phase 2.",
  BROKER: "RERA Q1 data shows villa transactions up 18% in Dubai South. Pipeline view lands in Phase 3.",
  BUYER: "Save your favourite plots and run feasibility reports — comparing ROI across 3-4 districts refines your buy thesis.",
  DEVELOPER: "Mixed-use plots near Expo City are seeing strong absorption. Project tracking lands in Phase 5.",
  INVESTOR: "Watchlist + ROI projections land in Phase 5. For now, save interesting plots to Favorites.",
  ARCHITECT: "Template library + saved feasibility calculations land in Phase 5.",
  ADMIN: "Use /admin/ambassadors to manage applications. Platform analytics land in Phase 7.",
};

const RECENT_ACTIVITY = [
  { icon: "👁️", text: "Plot 6457940 viewed 12 times today", when: "2 hours ago" },
  { icon: "✅", text: "Listing 6457940 verified by ZAAHI team", when: "Yesterday" },
  { icon: "📊", text: "Feasibility report generated for plot 6457940 (ROI 24.1%)", when: "Yesterday" },
  { icon: "🐱", text: "Archibald answered 4 questions about Dubai RE", when: "2 days ago" },
  { icon: "🏗️", text: "Plot 6457940 added to ZAAHI", when: "3 days ago" },
];

// ─── Section: Profile ───────────────────────────────────────────────
function Profile({ user, onSaved }: { user: MeUser | null; onSaved: () => Promise<void> }) {
  // Local form state, hydrated from the prop on mount and on prop change.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [reraLicense, setReraLicense] = useState("");
  const [brnNumber, setBrnNumber] = useState("");
  const [language, setLanguage] = useState("EN");
  const [currency, setCurrency] = useState("AED");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
    setBio(user.bio ?? "");
    setCompanyName(user.companyName ?? "");
    setReraLicense(user.reraLicense ?? "");
    setBrnNumber(user.brnNumber ?? "");
    setLanguage(user.language ?? "EN");
    setCurrency(user.currency ?? "AED");
  }, [user]);

  const isBroker = user?.role === "BROKER";
  const initials = initialsFromName(user?.name);

  async function save() {
    if (!user) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await apiFetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          companyName: companyName.trim() || null,
          reraLicense: reraLicense.trim() || null,
          brnNumber: brnNumber.trim() || null,
          language,
          currency,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setToast({ kind: "err", text: `Save failed: ${body.error ?? res.status}` });
      } else {
        setToast({ kind: "ok", text: "Saved." });
        await onSaved();
      }
    } catch (e) {
      setToast({ kind: "err", text: `Network error: ${e instanceof Error ? e.message : "unknown"}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <H1>Profile</H1>
      <Sub>Personal information and verification documents.</Sub>

      <Card>
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 18 }}>
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={initials} style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: `1px solid ${LINE}` }} />
          ) : (
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: GOLD,
                color: "#0A1628",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 28,
              }}
            >
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name ?? "—"}</div>
            <div style={{ fontSize: 11, color: SUBTLE }}>{user?.email ?? "—"}</div>
            <div style={{ marginTop: 6, fontSize: 10, color: SUBTLE, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Avatar upload — Phase 2
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Full Name">
            <input value={name} onChange={(e) => setName(e.target.value)} style={input()} />
          </Field>
          <Field label="Email (verified)">
            <input value={user?.email ?? ""} disabled style={{ ...input(), background: "rgba(255,255,255,0.05)", color: SUBTLE }} />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 …" style={input()} />
          </Field>
          <Field label="Role">
            <input value={user?.role ?? ""} disabled style={{ ...input(), background: "rgba(255,255,255,0.05)", color: SUBTLE }} />
          </Field>
          <Field label="Company Name">
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="(optional)" style={input()} />
          </Field>
          <Field label={isBroker ? "RERA License #" : "RERA License # (broker)"}>
            <input value={reraLicense} onChange={(e) => setReraLicense(e.target.value)} disabled={!isBroker} style={{ ...input(), opacity: isBroker ? 1 : 0.5 }} />
          </Field>
          <Field label={isBroker ? "BRN Number" : "BRN Number (broker)"}>
            <input value={brnNumber} onChange={(e) => setBrnNumber(e.target.value)} disabled={!isBroker} style={{ ...input(), opacity: isBroker ? 1 : 0.5 }} />
          </Field>
          <Field label="Preferred Language">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={input()}>
              <option value="EN">EN</option>
              <option value="AR">AR</option>
              <option value="RU">RU</option>
              <option value="UK">UK</option>
              <option value="SQ">SQ</option>
              <option value="FR">FR</option>
            </select>
          </Field>
          <Field label="Preferred Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={input()}>
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Bio / About">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell ZAAHI about your real estate background…" style={{ ...input(), resize: "vertical" }} />
          </Field>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
          <GoldBtn onClick={save} disabled={saving || !user}>
            {saving ? "Saving…" : "Save Changes"}
          </GoldBtn>
        </div>
        {toast && <Toast kind={toast.kind} text={toast.text} />}
      </Card>
    </div>
  );
}

// ─── Section: Properties (OWNER / BROKER / INVESTOR / DEVELOPER) ─────
// Backed by GET /api/me/plots — returns every parcel where ownerId = me
// plus 30-day view stats. "Who viewed my plot" aggregate is privacy-
// preserving: we show counts, not visitor identities.

interface MyPlotRow {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  area: number;
  currentValuation: string | null;
  status: string;
  createdAt: string;
  stats: {
    viewsAllTime: number;
    views30d: number;
    uniqueViewers30d: number;
    lastViewedAt: string | null;
  };
}

// ParcelStatus enum → friendly label + badge colour (dark glass safe).
const PARCEL_STATUS_BADGE: Record<string, { fg: string; bg: string }> = {
  VACANT: { fg: "rgba(245,241,232,0.6)", bg: "rgba(255,255,255,0.05)" },
  PENDING_REVIEW: { fg: "#E67E22", bg: "rgba(230,126,34,0.15)" },
  VERIFIED: { fg: "#60A5FA", bg: "rgba(27,73,101,0.25)" },
  LISTED: { fg: "#4ADE80", bg: "rgba(45,106,79,0.2)" },
  IN_DEAL: { fg: "#B4E5FF", bg: "rgba(180,229,255,0.15)" },
  SOLD: { fg: "#9CA3AF", bg: "rgba(255,255,255,0.08)" },
  REJECTED: { fg: "#F87171", bg: "rgba(230,57,70,0.15)" },
  DISPUTED: { fg: "#F87171", bg: "rgba(230,57,70,0.15)" },
  FROZEN: { fg: "rgba(245,241,232,0.5)", bg: "rgba(255,255,255,0.05)" },
};

function fmtAedFromFils(filsStr: string | null): string {
  if (!filsStr) return "—";
  try {
    const aed = Number(BigInt(filsStr)) / 100;
    if (aed >= 1_000_000) return `${(aed / 1_000_000).toFixed(1)}M AED`;
    if (aed >= 1_000) return `${(aed / 1_000).toFixed(0)}K AED`;
    return `${aed.toFixed(0)} AED`;
  } catch {
    return "—";
  }
}

function Properties() {
  const [rows, setRows] = useState<MyPlotRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "LISTED" | "VACANT" | "IN_DEAL" | "SOLD">("ALL");

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/api/me/plots");
        if (!r.ok) { setErr(`HTTP ${r.status}`); return; }
        const data = (await r.json()) as { items: MyPlotRow[] };
        setRows(data.items);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "unknown");
      }
    })();
  }, []);

  const visible = rows
    ? (filter === "ALL" ? rows : rows.filter((p) => p.status === filter))
    : [];

  const total = rows?.length ?? 0;
  const totalViews30 = rows?.reduce((a, r) => a + r.stats.views30d, 0) ?? 0;
  const totalUniqueViewers = rows?.reduce((a, r) => a + r.stats.uniqueViewers30d, 0) ?? 0;
  const totalValueFils = rows?.reduce((a, r) => {
    try { return a + (r.currentValuation ? BigInt(r.currentValuation) : BigInt(0)); } catch { return a; }
  }, BigInt(0)) ?? BigInt(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <H1>My Properties</H1>
          <Sub>{rows === null ? "Loading…" : `${total} listing(s) registered with ZAAHI.`}</Sub>
        </div>
        <Link href="/parcels/new" style={{ ...actionBtnStyle(), padding: "8px 16px", fontSize: 12, fontWeight: 700, textDecoration: "none", background: GOLD, color: "#0A1628", border: `1px solid ${GOLD}` }}>
          + Add New Property
        </Link>
      </div>

      {rows !== null && rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <StatCard label="My Properties" value={String(total)} icon="🏗️" accent={GOLD} />
          <StatCard label="Portfolio Value" value={fmtAedFromFils(totalValueFils.toString())} icon="💰" accent={GOLD} />
          <StatCard label="Views (30d)" value={totalViews30.toLocaleString("en-US")} icon="👁️" />
          <StatCard label="Unique Viewers (30d)" value={totalUniqueViewers.toLocaleString("en-US")} icon="🔍" />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["ALL", "LISTED", "VACANT", "IN_DEAL", "SOLD"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              borderRadius: 999,
              border: `1px solid ${filter === f ? GOLD : LINE}`,
              background: filter === f ? "rgba(200,169,110,0.25)" : "rgba(255,255,255,0.04)",
              color: filter === f ? GOLD : TXT,
              cursor: "pointer",
              fontWeight: filter === f ? 700 : 500,
              fontFamily: "inherit",
              letterSpacing: "0.05em",
            }}
          >
            {f === "ALL" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {err && <Toast kind="err" text={`Failed to load: ${err}`} />}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)", color: SUBTLE, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              <Th>Plot</Th><Th>District</Th><Th>Area</Th><Th>Price</Th><Th>Status</Th><Th>Views (30d)</Th><Th>Unique</Th><Th>Last view</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: SUBTLE }}>Loading…</td></tr>
            )}
            {rows !== null && visible.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 30, textAlign: "center", color: SUBTLE, fontSize: 12 }}>
                  {total === 0
                    ? <>No plots yet. <Link href="/parcels/new" style={{ color: GOLD }}>Add your first plot →</Link></>
                    : "No properties match this filter."}
                </td>
              </tr>
            )}
            {visible.map((p) => {
              const b = PARCEL_STATUS_BADGE[p.status] ?? PARCEL_STATUS_BADGE.VACANT;
              return (
                <tr key={p.id} style={{ borderTop: `1px solid ${LINE}` }} className="hover-row">
                  <Td><span style={{ color: GOLD, fontWeight: 700 }}>{p.plotNumber}</span></Td>
                  <Td><span style={{ fontSize: 11 }}>{p.district}</span><div style={{ fontSize: 9, color: SUBTLE }}>{p.emirate}</div></Td>
                  <Td>{Math.round(p.area).toLocaleString("en-US")} sqft</Td>
                  <Td><span style={{ color: GOLD }}>{fmtAedFromFils(p.currentValuation)}</span></Td>
                  <Td>
                    <span style={{ padding: "2px 8px", borderRadius: 4, background: b.bg, color: b.fg, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", fontFamily: 'Georgia, "Times New Roman", serif' }}>
                      {p.status.replace("_", " ")}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 700, color: p.stats.views30d > 0 ? GOLD : SUBTLE }}>
                      {p.stats.views30d}
                    </span>
                  </Td>
                  <Td>{p.stats.uniqueViewers30d}</Td>
                  <Td style={{ fontSize: 10, color: SUBTLE }}>
                    {p.stats.lastViewedAt ? new Date(p.stats.lastViewedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/parcels/${p.id}`} style={{ ...actionBtnStyle(), textDecoration: "none" }}>View</Link>
                      <Link href="/parcels/map" style={{ ...actionBtnStyle(), textDecoration: "none" }}>Map</Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {rows !== null && rows.length > 0 && (
        <ComingSoonBanner text="Per-plot detail: visitor-source breakdown, PDF download counts, inquiry lifecycle — Phase 2. Price-drop / relisting actions — Phase 2." />
      )}

      <style jsx>{`
        .hover-row:hover { background: rgba(200, 169, 110, 0.05); }
      `}</style>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600 }}>{children}</th>;
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px 14px", verticalAlign: "middle", ...style }}>{children}</td>;
}
function actionBtnStyle(): React.CSSProperties {
  return {
    fontSize: 10,
    padding: "3px 8px",
    border: `1px solid rgba(200, 169, 110, 0.3)`,
    borderRadius: 4,
    background: "rgba(255,255,255,0.06)",
    color: GOLD,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
function ActionBtn({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      style={{
        ...actionBtnStyle(),
        color: danger ? "#B91C1C" : TXT,
        borderColor: danger ? "#FCA5A5" : LINE,
      }}
    >
      {children}
    </button>
  );
}

// ─── Section: Favorites ─────────────────────────────────────────────

interface FavoriteRow {
  id: string;
  createdAt: string;
  parcel: {
    id: string;
    plotNumber: string;
    emirate: string;
    district: string;
    area: number;
    currentValuation: string | null;
    status: string;
  };
}

function Favorites() {
  const [rows, setRows] = useState<FavoriteRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await apiFetch("/api/me/favorites");
      if (!r.ok) { setErr(`HTTP ${r.status}`); return; }
      const data = (await r.json()) as { items: FavoriteRow[] };
      setRows(data.items);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "unknown");
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function unsave(parcelId: string) {
    try {
      await apiFetch(`/api/me/favorites/${parcelId}`, { method: "DELETE" });
      void reload();
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <H1>Favorites</H1>
      <Sub>Plots you&apos;ve saved from the map. Click ❤ on any plot in the map or Side Panel to add it here.</Sub>

      {err && <Toast kind="err" text={`Failed to load: ${err}`} />}

      {rows === null ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>Loading…</Card>
      ) : rows.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>
          No favourites yet. Browse the <Link href="/parcels/map" style={{ color: GOLD }}>map</Link> and click the ❤ on a plot to save it.
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {rows.map((f) => (
            <Card key={f.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>Plot {f.parcel.plotNumber}</span>
                <button
                  onClick={() => unsave(f.parcel.id)}
                  title="Remove from favourites"
                  style={{ background: "none", border: 0, fontSize: 16, cursor: "pointer", color: "#F87171" }}
                >
                  ❤
                </button>
              </div>
              <div style={{ fontSize: 11, color: SUBTLE, marginBottom: 4 }}>
                {f.parcel.district} · {f.parcel.emirate}
              </div>
              <div style={{ color: GOLD, fontSize: 16, fontWeight: 800 }}>
                {fmtAedFromFils(f.parcel.currentValuation)}
              </div>
              <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>
                {Math.round(f.parcel.area).toLocaleString("en-US")} sqft · {f.parcel.status.replace("_", " ")}
              </div>
              <div style={{ fontSize: 9, color: SUBTLE, marginTop: 8 }}>
                Saved {new Date(f.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <Link href={`/parcels/${f.parcel.id}`} style={{ ...actionBtnStyle(), textDecoration: "none" }}>View</Link>
                <Link href="/parcels/map" style={{ ...actionBtnStyle(), textDecoration: "none" }}>Map</Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ComingSoonBanner text="Side-by-side comparison tool and Dream Board — Phase 4." />
    </div>
  );
}

// ─── Section: Deals ─────────────────────────────────────────────────
interface DealRow {
  id: string;
  status: string;
  priceInFils: string;
  agreedPriceInFils: string | null;
  offerPriceInFils: string | null;
  updatedAt: string;
  parcel: { id: string; plotNumber: string; district: string; emirate: string };
}
const STATUS_LABEL: Record<string, string> = {
  INITIAL: "Offer Submitted",
  DEAL_INITIATED: "Awaiting Deposit",
  DEPOSIT_SUBMITTED: "Deposit Confirmed",
  AGREEMENT_SIGNED: "MOU Signed",
  DOCUMENTS_COLLECTED: "Documents",
  GOVERNMENT_VERIFIED: "Gov Verified",
  NOC_REQUESTED: "NOC Pending",
  TRANSFER_FEE_PAID: "Fees Paid",
  DLD_SUBMITTED: "Submitted to DLD",
  DEAL_COMPLETED: "Completed",
  DEAL_CANCELLED: "Cancelled",
  DISPUTE_INITIATED: "Disputed",
};
function fmtAedShort(fils: string | null): string {
  if (!fils) return "—";
  const aed = Number(BigInt(fils)) / 100;
  if (aed >= 1_000_000) return `${(aed / 1_000_000).toFixed(2)}M AED`;
  if (aed >= 1_000) return `${(aed / 1_000).toFixed(0)}K AED`;
  return `${aed.toFixed(0)} AED`;
}
function Deals() {
  const [deals, setDeals] = useState<DealRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setErr("Sign in to see your deals"); return; }
      const res = await fetch("/api/deals", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setErr("Failed to load"); return; }
      setDeals(await res.json());
    })();
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <H1>My Deals</H1>
      <Sub>Track each transaction from the first MOU to DLD completion.</Sub>
      {err && <Card style={{ color: SUBTLE, padding: 20 }}>{err}</Card>}
      {!err && deals === null && <Card style={{ color: SUBTLE, padding: 20 }}>Loading…</Card>}
      {!err && deals && deals.length === 0 && (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>
          No deals yet. Open the map and click <strong style={{ color: GOLD }}>Start Negotiation</strong> on any plot to begin.
        </Card>
      )}
      {!err && deals && deals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {deals.map((d) => {
            const price = d.agreedPriceInFils ?? d.offerPriceInFils ?? d.priceInFils;
            const cancelled = d.status === "DEAL_CANCELLED" || d.status === "DISPUTE_INITIATED";
            return (
              <Link key={d.id} href={`/deals/${d.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Card style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>Plot {d.parcel.plotNumber}</div>
                    <div style={{ fontSize: 11, color: SUBTLE }}>{d.parcel.district} · {d.parcel.emirate}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "4px 10px", borderRadius: 12,
                      background: cancelled ? "#fee2e2" : "rgba(200,169,110,0.15)",
                      color: cancelled ? "#dc2626" : GOLD,
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
                    }}>{STATUS_LABEL[d.status] ?? d.status}</span>
                    <div style={{ fontSize: 9, color: SUBTLE, marginTop: 4 }}>{new Date(d.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: TXT }}>{fmtAedShort(price)}</div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Section: Documents ─────────────────────────────────────────────
const DOC_GROUPS = [
  { title: "Title Deeds", items: [] as Array<{ name: string; date: string }> },
  { title: "Contracts (Form A/B, MOU, SPA)", items: [] },
  { title: "NOC", items: [] },
  { title: "Affection Plans", items: [{ name: "6457940 — Affection Plan.pdf", date: "3 days ago" }] },
  { title: "Passports / IDs", items: [] },
];
function Documents() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <H1>Documents</H1>
          <Sub>All paperwork attached to your account, organised by type.</Sub>
        </div>
        <GoldBtn>Upload Document</GoldBtn>
      </div>
      <ComingSoonBanner text="Document management (upload, preview, share links, expiry tracking) — Phase 2. The list below is illustrative placeholder data." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {DOC_GROUPS.map((g) => (
          <Card key={g.title} style={{ padding: 0 }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${LINE}`, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>
              {g.title} ({g.items.length})
            </div>
            {g.items.length === 0 ? (
              <div style={{ padding: 14, color: SUBTLE, fontSize: 11 }}>No documents in this category.</div>
            ) : (
              g.items.map((d) => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: `1px solid ${LINE}`, fontSize: 12 }}>
                  <div>
                    📄 {d.name}
                    <div style={{ fontSize: 10, color: SUBTLE }}>{d.date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <ActionBtn>Download</ActionBtn>
                    <ActionBtn danger>Delete</ActionBtn>
                  </div>
                </div>
              ))
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Financials (broker only) ─────────────────────────────
function Financials() {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const data = [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...data);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <H1>Financials</H1>
      <Sub>Commission tracking across all your deals.</Sub>
      <ComingSoonBanner text="Commission pipeline + payout requests — Phase 3 (BROKER dashboard). Ambassador commissions are live on /ambassador." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatCard label="Earned" value="0 AED" icon="💰" accent={GOLD} />
        <StatCard label="Pending" value="0 AED" icon="⏳" />
        <StatCard label="Paid Out" value="0 AED" icon="✅" />
      </div>
      <Card>
        <H2>Last 7 Months</H2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, paddingTop: 8 }}>
          {data.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: `${(v / max) * 100}%`, minHeight: 2, background: GOLD, borderRadius: "4px 4px 0 0", opacity: v > 0 ? 1 : 0.15 }} />
              <span style={{ fontSize: 10, color: SUBTLE }}>{months[i]}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.05)", color: SUBTLE, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              <Th>Date</Th><Th>Deal</Th><Th>Amount</Th><Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} style={{ padding: 30, textAlign: "center", color: SUBTLE, fontSize: 12 }}>
                No commission transactions yet.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Section: Notifications ─────────────────────────────────────────
// Live inbox backed by Notification table. Email/push delivery lands in
// Phase 6 — right now the table is populated by server-side triggers
// only (deal events, view spikes) that haven't been wired yet either.
// So for new users this list will typically be empty — that's expected.

interface NotifRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// Nice human labels for known `kind` strings. Unknown kinds fall through.
const NOTIF_LABELS: Record<string, { icon: string; title: (p: Record<string, unknown>) => string }> = {
  PLOT_VIEW_SPIKE: {
    icon: "👁️",
    title: (p) => `Your plot ${p.plotNumber ?? ""} saw ${p.count ?? "many"} views ${p.window ?? "today"}`,
  },
  NEW_OFFER: {
    icon: "💌",
    title: (p) => `New offer on plot ${p.plotNumber ?? ""}: ${p.priceAed ?? "—"} AED`,
  },
  LISTING_APPROVED: {
    icon: "✅",
    title: (p) => `Your listing ${p.plotNumber ?? ""} is now live on the map`,
  },
  LISTING_REJECTED: {
    icon: "⚠",
    title: (p) => `Listing ${p.plotNumber ?? ""} was rejected — ${p.reason ?? "see details"}`,
  },
  SAVED_SEARCH_MATCH: {
    icon: "🔍",
    title: (p) => `New plot matches your saved search "${p.searchName ?? ""}"`,
  },
  AMBASSADOR_COMMISSION: {
    icon: "💰",
    title: (p) => `You earned ${p.amountAed ?? "—"} AED commission`,
  },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function Notifications({ onUnreadChange }: { onUnreadChange: (n: number) => void }) {
  const [rows, setRows] = useState<NotifRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await apiFetch("/api/me/notifications");
      if (!r.ok) { setErr(`HTTP ${r.status}`); return; }
      const data = (await r.json()) as { items: NotifRow[]; unreadCount: number };
      setRows(data.items);
      onUnreadChange(data.unreadCount);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "unknown");
    }
  }, [onUnreadChange]);
  useEffect(() => { void reload(); }, [reload]);

  async function markRead(id: string) {
    try {
      await apiFetch(`/api/me/notifications/${id}/read`, { method: "POST" });
      void reload();
    } catch { /* ignore */ }
  }
  async function markAllRead() {
    try {
      await apiFetch("/api/me/notifications/read-all", { method: "POST" });
      void reload();
    } catch { /* ignore */ }
  }

  const unread = rows?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <H1>Notifications</H1>
          <Sub>{unread > 0 ? `${unread} unread` : "All caught up"}</Sub>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            style={{ fontSize: 11, color: GOLD, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {err && <Toast kind="err" text={`Failed to load: ${err}`} />}

      {rows === null ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>Loading…</Card>
      ) : rows.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>
          No notifications yet. When someone views your plot, makes an offer, or a saved search matches a new listing — you&apos;ll see it here.
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {rows.map((n, i) => {
            const meta = NOTIF_LABELS[n.kind];
            const icon = meta?.icon ?? "🔔";
            const title = meta ? meta.title(n.payload) : n.kind.replace(/_/g, " ");
            const isUnread = !n.readAt;
            return (
              <button
                key={n.id}
                onClick={() => isUnread && markRead(n.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px",
                  borderTop: i > 0 ? `1px solid ${LINE}` : "none",
                  background: isUnread ? "rgba(200,169,110,0.06)" : "transparent",
                  fontSize: 12, width: "100%", textAlign: "left",
                  border: 0, color: "inherit", cursor: isUnread ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isUnread ? 700 : 400, color: isUnread ? TXT : DIM }}>{title}</div>
                  <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                </div>
                {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, marginTop: 6 }} />}
              </button>
            );
          })}
        </Card>
      )}

      <ComingSoonBanner text="Email + web-push delivery of these notifications — Phase 6. Preferences toggles below are UI-only." />

      <Card>
        <H2>Notification Preferences</H2>
        <Sub>In-app, email, and push channels per event — Phase 6 persistence.</Sub>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, marginTop: 12 }}>
          {["New views on my listings", "New inquiries", "Listing status changes", "Saved search matches", "Ambassador commissions"].map((p) => (
            <label key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: DIM }}>{p}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: SUBTLE }}><input type="checkbox" defaultChecked style={{ accentColor: GOLD }} />Email</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: SUBTLE }}><input type="checkbox" defaultChecked style={{ accentColor: GOLD }} />Push</span>
              </span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Saved Searches (new in Phase 1) ───────────────────────
// Max 10 per user (enforced API-side). Simple filters: emirate, price
// range, area range. Alert delivery (email/push on matches) — Phase 6.

interface SavedSearchRow {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  locationBounds: unknown | null;
  lastNotifiedAt: string | null;
  createdAt: string;
}

function SavedSearches() {
  const [rows, setRows] = useState<SavedSearchRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emirate, setEmirate] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [landUse, setLandUse] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await apiFetch("/api/me/saved-searches");
      if (!r.ok) { setErr(`HTTP ${r.status}`); return; }
      const data = (await r.json()) as { items: SavedSearchRow[] };
      setRows(data.items);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "unknown");
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    setToast(null);
    try {
      const filters: Record<string, unknown> = {};
      if (emirate.trim()) filters.emirate = emirate.trim();
      if (landUse.trim()) filters.landUse = landUse.trim();
      const mn = parseInt(minPrice, 10);
      const mx = parseInt(maxPrice, 10);
      if (Number.isFinite(mn) && mn > 0) filters.minPriceAed = mn;
      if (Number.isFinite(mx) && mx > 0) filters.maxPriceAed = mx;
      const res = await apiFetch("/api/me/saved-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), filters }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setToast({ kind: "err", text: "You've reached the maximum of 10 saved searches." });
        } else {
          setToast({ kind: "err", text: `Save failed: ${body.error ?? res.status}` });
        }
      } else {
        setName(""); setEmirate(""); setMinPrice(""); setMaxPrice(""); setLandUse("");
        setToast({ kind: "ok", text: "Saved." });
        void reload();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/me/saved-searches/${id}`, { method: "DELETE" });
      void reload();
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <H1>Saved Searches</H1>
      <Sub>Up to 10 saved filters. When a new plot matches, you&apos;ll get a notification (email delivery — Phase 6).</Sub>

      {err && <Toast kind="err" text={`Failed to load: ${err}`} />}

      <Card>
        <H2>New saved search</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meydan residential under 80M" style={input()} /></Field>
          <Field label="Emirate"><input value={emirate} onChange={(e) => setEmirate(e.target.value)} placeholder="Dubai / Abu Dhabi / …" style={input()} /></Field>
          <Field label="Land use">
            <select value={landUse} onChange={(e) => setLandUse(e.target.value)} style={input()}>
              <option value="">(any)</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Mixed Use">Mixed Use</option>
              <option value="Hotel">Hotel</option>
              <option value="Industrial">Industrial</option>
              <option value="Educational">Educational</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Agricultural">Agricultural</option>
            </select>
          </Field>
          <Field label="Min / Max price (AED)">
            <div style={{ display: "flex", gap: 6 }}>
              <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="min" style={{ ...input(), width: "50%" }} />
              <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="max" style={{ ...input(), width: "50%" }} />
            </div>
          </Field>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <GoldBtn onClick={create} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save search"}
          </GoldBtn>
        </div>
        {toast && <Toast kind={toast.kind} text={toast.text} />}
      </Card>

      {rows === null ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>Loading…</Card>
      ) : rows.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>
          No saved searches yet. Create one above to get alerted when a new plot matches.
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {rows.map((s, i) => (
            <div key={s.id} style={{ display: "flex", gap: 12, padding: "12px 14px", borderTop: i > 0 ? `1px solid ${LINE}` : "none", fontSize: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: GOLD }}>{s.name}</div>
                <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>
                  {Object.entries(s.filters).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 8 }}><span style={{ color: DIM }}>{k}:</span> {String(v)}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => remove(s.id)}
                style={{ background: "transparent", border: 0, color: "#F87171", cursor: "pointer", fontSize: 14 }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── Section: Settings ─────────────────────────────────────────────
function Settings() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <H1>Settings</H1>
      <Sub>Personalise how ZAAHI behaves for you.</Sub>

      <Card>
        <H2>Default Map View</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Latitude"><input defaultValue="25.20" style={input()} /></Field>
          <Field label="Longitude"><input defaultValue="55.27" style={input()} /></Field>
          <Field label="Zoom"><input defaultValue="12" style={input()} /></Field>
          <Field label="Style">
            <select style={input()}><option>Light</option><option>Dark</option><option>Satellite</option></select>
          </Field>
          <Field label="Default mode">
            <select style={input()}><option>3D</option><option>2D</option></select>
          </Field>
        </div>
      </Card>

      <ComingSoonBanner text="Map defaults, language/currency switching live in UI but aren't wired yet — Phase 2. Use Profile → Preferred Language / Currency for the persisted copy (those ARE live)." />

      <Card style={{ borderColor: "rgba(248, 113, 113, 0.35)" }}>
        <H2>Danger Zone</H2>
        <p style={{ fontSize: 11, color: SUBTLE, margin: "0 0 12px" }}>
          Deleting your account is permanent and cannot be undone. All listings will be unpublished.
          PDPL data export + account deletion flow — Phase 7.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => alert("PDPL data export flow not yet implemented (Phase 7). Email privacy@zaahi.io to request manually.")}
            style={{ padding: "8px 14px", border: `1px solid rgba(200, 169, 110, 0.3)`, borderRadius: 6, background: "rgba(255,255,255,0.06)", color: GOLD, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >
            Export My Data (PDPL)
          </button>
          <button
            onClick={() => alert("Account deletion flow not yet implemented (Phase 7). Email privacy@zaahi.io to request manually.")}
            style={{ padding: "8px 14px", background: "rgba(230,57,70,0.8)", color: "white", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Delete Account
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Pending Reviews (admin / owner only) ─────────────────
interface PendingDoc {
  kind: "title_deed" | "id_doc" | "rera_contract";
  url: string;
  name: string;
  size?: number;
  contentType?: string;
}
interface PendingRaw {
  flow?: "broker" | "owner";
  broker?: { reraPermit?: string; contractRef?: string | null } | null;
  owner?: { fullName?: string; phone?: string; email?: string } | null;
  description?: string | null;
  askingPriceAed?: number;
  documents?: PendingDoc[];
  submittedAt?: string;
  submittedBy?: string;
}
interface PendingItem {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  area: number;
  currentValuation: string | null;
  status: string;
  createdAt: string;
  owner: { id: string; email: string; name: string; role: string } | null;
  affectionPlans: Array<{
    source: string;
    fetchedAt: string;
    landUseMix: unknown;
    notes: string | null;
    raw: PendingRaw | null;
  }>;
}

function PendingReviews({ onCount }: { onCount: (n: number) => void }) {
  const [items, setItems] = useState<PendingItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useMemo(() => async () => {
    setErr(null);
    try {
      const r = await apiFetch("/api/parcels/pending");
      if (r.status === 401) { setErr("Admin access required."); setItems([]); return; }
      if (!r.ok) { setErr("Failed to load pending reviews"); return; }
      const data = (await r.json()) as { items: PendingItem[]; count: number };
      setItems(data.items);
      onCount(data.count);
    } catch {
      setErr("Network error");
    }
  }, [onCount]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "APPROVE" | "REJECT") {
    if (!confirm(`${action === "APPROVE" ? "Approve" : "Reject"} this listing?`)) return;
    setBusy(id);
    try {
      const r = await apiFetch(`/api/parcels/${id}/review`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error ?? "Action failed");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <H1>Pending Reviews</H1>
        <Sub>
          Listings submitted through the map wizard. Approve publishes them
          to the public map; Reject keeps the row but marks it as rejected.
        </Sub>
      </div>
      {err && <Card style={{ color: "#FCA5A5" }}>{err}</Card>}
      {!err && items === null && <Card style={{ color: SUBTLE, padding: 20 }}>Loading…</Card>}
      {!err && items && items.length === 0 && (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>
          No listings waiting for review.
        </Card>
      )}
      {!err && items && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => {
            const plan = it.affectionPlans[0];
            const sub = plan?.raw;
            const priceAed = it.currentValuation ? Number(BigInt(it.currentValuation)) / 100 : 0;
            const priceStr = priceAed >= 1_000_000
              ? `${(priceAed / 1_000_000).toFixed(1)}M AED`
              : priceAed >= 1_000
                ? `${(priceAed / 1_000).toFixed(0)}K AED`
                : `${priceAed.toFixed(0)} AED`;
            const flow = sub?.flow ?? "—";
            const submitter = sub?.flow === "broker"
              ? sub?.broker?.reraPermit ?? it.owner?.email ?? it.owner?.id
              : sub?.owner?.fullName ?? it.owner?.name ?? it.owner?.email;
            const docs = sub?.documents ?? [];
            return (
              <Card key={it.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: GOLD }}>
                      Plot {it.plotNumber}
                    </div>
                    <div style={{ fontSize: 11, color: SUBTLE, marginTop: 2 }}>
                      {it.district} · {it.emirate} · {Math.round(it.area).toLocaleString()} ft²
                    </div>
                    <div style={{ fontSize: 11, color: SUBTLE, marginTop: 2 }}>
                      Submitted {new Date(it.createdAt).toLocaleString()} by{" "}
                      <span style={{ color: TXT }}>{submitter || "unknown"}</span>{" "}
                      <span style={{ textTransform: "uppercase", letterSpacing: 0.8, color: GOLD }}>
                        [{flow}]
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>{priceStr}</div>
                    <div style={{ fontSize: 9, color: SUBTLE, textTransform: "uppercase", letterSpacing: 1 }}>
                      Asking
                    </div>
                  </div>
                </div>

                {sub?.description && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginBottom: 10, padding: 10, background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
                    {sub.description}
                  </div>
                )}

                {docs.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {docs.map((d, i) => (
                      <a
                        key={i}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 11,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: `1px solid rgba(200, 169, 110, 0.3)`,
                          background: "rgba(255,255,255,0.06)",
                          color: GOLD,
                          textDecoration: "none",
                        }}
                      >
                        📎 {d.kind.replace("_", " ")} — {d.name}
                      </a>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => act(it.id, "APPROVE")}
                    disabled={busy === it.id}
                    style={{
                      padding: "9px 18px",
                      background: busy === it.id ? "rgba(255,255,255,0.1)" : GOLD,
                      color: "white",
                      border: 0,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      cursor: busy === it.id ? "wait" : "pointer",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => act(it.id, "REJECT")}
                    disabled={busy === it.id}
                    style={{
                      padding: "9px 18px",
                      background: "rgba(255,255,255,0.06)",
                      color: "#F87171",
                      border: "1px solid rgba(248,113,113,0.35)",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      cursor: busy === it.id ? "wait" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Reject
                  </button>
                  <Link
                    href="/parcels/map"
                    style={{
                      padding: "9px 18px",
                      background: "rgba(255,255,255,0.06)",
                      color: GOLD,
                      border: "1px solid rgba(200, 169, 110, 0.3)",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      letterSpacing: 0.5,
                    }}
                  >
                    View on Map
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardInner />
    </AuthGuard>
  );
}
