"use client";
/**
 * ZAAHI Dashboard — full personal cabinet, all sections behind a sidebar.
 *
 * Mock data only — wiring to Prisma/Supabase will come once the data shapes
 * stabilise. Style mirrors the map's SidePanel: white cards on #FAFAFA, gold
 * accents (#C8A96E), Georgia headings.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import AuthGuard from "@/components/AuthGuard";

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";
const BG = "#FAFAFA";

type Role = "OWNER" | "BROKER" | "BUYER" | "DEVELOPER";

// ─── Mock current user ──────────────────────────────────────────────
const USER = {
  name: "Zharkyn Ryspayev",
  email: "zhanrysbayev@gmail.com",
  role: "OWNER" as Role,
  phone: "+971 50 000 0000",
  avatar: "ZR",
};

type SectionKey =
  | "overview" | "profile" | "properties" | "favorites"
  | "deals" | "documents" | "financials" | "notifications" | "settings";

const NAV: Array<{ key: SectionKey; icon: string; label: string; rolesOnly?: Role[] }> = [
  { key: "overview", icon: "📊", label: "Overview" },
  { key: "profile", icon: "👤", label: "Profile" },
  { key: "properties", icon: "🏗️", label: "My Properties", rolesOnly: ["OWNER", "BROKER"] },
  { key: "favorites", icon: "❤️", label: "Favorites" },
  { key: "deals", icon: "📋", label: "My Deals" },
  { key: "documents", icon: "📄", label: "Documents" },
  { key: "financials", icon: "💰", label: "Financials", rolesOnly: ["BROKER"] },
  { key: "notifications", icon: "🔔", label: "Notifications" },
  { key: "settings", icon: "⚙️", label: "Settings" },
];

function DashboardInner() {
  const [section, setSection] = useState<SectionKey>("overview");
  const visibleNav = useMemo(
    () => NAV.filter((n) => !n.rolesOnly || n.rolesOnly.includes(USER.role)),
    [],
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, display: "flex", fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          background: "white",
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
                {n.label}
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
        <Header />
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {section === "overview" && <Overview />}
          {section === "profile" && <Profile />}
          {section === "properties" && <Properties />}
          {section === "favorites" && <Favorites />}
          {section === "deals" && <Deals />}
          {section === "documents" && <Documents />}
          {section === "financials" && <Financials />}
          {section === "notifications" && <Notifications />}
          {section === "settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────
function Header() {
  return (
    <div
      style={{
        height: 56,
        background: "white",
        borderBottom: `1px solid ${LINE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.2 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{USER.name}</span>
        <span style={{ fontSize: 10, color: SUBTLE, textTransform: "uppercase", letterSpacing: 1 }}>{USER.role}</span>
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: GOLD,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {USER.avatar}
      </div>
    </div>
  );
}

// ─── Reusable atoms ─────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${LINE}`,
        borderRadius: 10,
        padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
    background: "white",
    color: TXT,
    outline: "none",
  };
}
function GoldBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: GOLD,
        color: "white",
        fontSize: 12,
        fontWeight: 700,
        border: 0,
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Section: Overview ──────────────────────────────────────────────
function Overview() {
  const stats = STATS_BY_ROLE[USER.role];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <H1>Welcome back, {USER.name.split(" ")[0]}</H1>
        <Sub>You are signed in as {USER.role.toLowerCase()}.</Sub>
      </div>
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
              {ROLE_TIPS[USER.role]}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent activity */}
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

const STATS_BY_ROLE: Record<Role, Array<{ label: string; value: string; icon: string; accent?: string }>> = {
  OWNER: [
    { label: "My Properties", value: "1", icon: "🏗️" },
    { label: "Active Deals", value: "0", icon: "🤝" },
    { label: "Portfolio Value", value: "60.5M AED", icon: "💰", accent: GOLD },
    { label: "Views This Month", value: "127", icon: "👁️" },
  ],
  BROKER: [
    { label: "Active Listings", value: "0", icon: "🏗️" },
    { label: "Pending Deals", value: "0", icon: "📋" },
    { label: "Commission Earned", value: "0 AED", icon: "💰", accent: GOLD },
    { label: "Commission Pending", value: "0 AED", icon: "⏳" },
  ],
  BUYER: [
    { label: "Saved Properties", value: "0", icon: "❤️" },
    { label: "Active Offers", value: "0", icon: "📋" },
    { label: "Feasibility Reports", value: "0", icon: "📊" },
    { label: "Viewed This Month", value: "0", icon: "👁️" },
  ],
  DEVELOPER: [
    { label: "Projects", value: "0", icon: "🏗️" },
    { label: "Plots Under Dev", value: "0", icon: "🚧" },
    { label: "Pipeline Value", value: "0 AED", icon: "💰", accent: GOLD },
    { label: "Active Tenders", value: "0", icon: "📑" },
  ],
};

const ROLE_TIPS: Record<Role, string> = {
  OWNER: "Your plot 6457940 in Majan got 127 views this month — well above average for the district. Consider adjusting the asking price or highlighting the FAR 6 development potential to convert views into inquiries.",
  BROKER: "RERA Q1 data shows villa transactions up 18% in Dubai South. If your listings are mostly apartments, diversifying could capture this momentum. Always verify with DLD/RERA.",
  BUYER: "Save your favourite plots and run feasibility reports — comparing ROI across 3-4 districts is the fastest way to refine your buy thesis.",
  DEVELOPER: "Mixed-use plots near Expo City are seeing strong absorption. Pipeline visibility starts with adding tracked sites here. Always verify with DLD/RERA.",
};

const RECENT_ACTIVITY = [
  { icon: "👁️", text: "Plot 6457940 viewed 12 times today", when: "2 hours ago" },
  { icon: "✅", text: "Listing 6457940 verified by ZAAHI team", when: "Yesterday" },
  { icon: "📊", text: "Feasibility report generated for plot 6457940 (ROI 24.1%)", when: "Yesterday" },
  { icon: "🐱", text: "Archibald answered 4 questions about Dubai RE", when: "2 days ago" },
  { icon: "🏗️", text: "Plot 6457940 added to ZAAHI", when: "3 days ago" },
];

// ─── Section: Profile ───────────────────────────────────────────────
function Profile() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <H1>Profile</H1>
      <Sub>Personal information and verification documents.</Sub>

      <Card>
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 18 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: GOLD,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 28,
            }}
          >
            {USER.avatar}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{USER.name}</div>
            <div style={{ fontSize: 11, color: SUBTLE }}>{USER.email}</div>
            <button style={{ marginTop: 8, fontSize: 11, color: GOLD, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}>
              Change photo
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Full Name"><input defaultValue={USER.name} style={input()} /></Field>
          <Field label="Email (verified)"><input defaultValue={USER.email} disabled style={{ ...input(), background: "#F9FAFB", color: SUBTLE }} /></Field>
          <Field label="Phone"><input defaultValue={USER.phone} style={input()} /></Field>
          <Field label="Role">
            <input defaultValue={USER.role} disabled style={{ ...input(), background: "#F9FAFB", color: SUBTLE }} />
          </Field>
          <Field label="Emirates ID / Passport"><input placeholder="784-XXXX-…" style={input()} /></Field>
          <Field label="Company Name"><input placeholder="(optional)" style={input()} /></Field>
          <Field label="RERA License #"><input placeholder="(broker only)" style={input()} /></Field>
          <Field label="BRN Number"><input placeholder="(broker only)" style={input()} /></Field>
          <Field label="Preferred Language">
            <select style={input()} defaultValue="EN">
              <option>EN</option><option>AR</option><option>RU</option>
            </select>
          </Field>
          <Field label="Preferred Currency">
            <select style={input()} defaultValue="AED">
              <option>AED</option><option>USD</option><option>EUR</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Bio / About">
            <textarea rows={3} placeholder="Tell ZAAHI about your real estate background…" style={{ ...input(), resize: "vertical" }} />
          </Field>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <GoldBtn>Save Changes</GoldBtn>
        </div>
      </Card>
    </div>
  );
}

// ─── Section: Properties ────────────────────────────────────────────
const MOCK_PROPERTIES = [
  { plotNumber: "6457940", district: "MAJAN", area: 25199, priceAed: 60_500_000, status: "Published", views: 127 },
];
const STATUS_BADGE: Record<string, { color: string; bg: string; dot: string }> = {
  "Pending Review": { color: "#92400E", bg: "#FEF3C7", dot: "🟡" },
  "Published":      { color: "#065F46", bg: "#D1FAE5", dot: "🟢" },
  "Under Negotiation": { color: "#1E40AF", bg: "#DBEAFE", dot: "🔵" },
  "Sold":           { color: "#991B1B", bg: "#FEE2E2", dot: "🔴" },
  "Rejected":       { color: "#374151", bg: "#E5E7EB", dot: "⚫" },
};
function Properties() {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? MOCK_PROPERTIES : MOCK_PROPERTIES.filter((p) => p.status === filter);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <H1>My Properties</H1>
          <Sub>{MOCK_PROPERTIES.length} listing(s) registered with ZAAHI.</Sub>
        </div>
        <GoldBtn>+ Add New Property</GoldBtn>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {["All", "Pending Review", "Published", "Under Negotiation", "Sold"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              borderRadius: 999,
              border: `1px solid ${filter === f ? GOLD : LINE}`,
              background: filter === f ? "rgba(200,169,110,0.12)" : "white",
              color: filter === f ? GOLD : TXT,
              cursor: "pointer",
              fontWeight: filter === f ? 700 : 500,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F9FAFB", color: SUBTLE, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              <Th>Plot</Th><Th>District</Th><Th>Area</Th><Th>Price</Th><Th>Status</Th><Th>Views</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const b = STATUS_BADGE[p.status] ?? STATUS_BADGE.Published;
              return (
                <tr key={p.plotNumber} style={{ borderTop: `1px solid ${LINE}` }} className="hover-row">
                  <Td><span style={{ color: GOLD, fontWeight: 700 }}>{p.plotNumber}</span></Td>
                  <Td>{p.district}</Td>
                  <Td>{p.area.toLocaleString()} sqft</Td>
                  <Td>{(p.priceAed / 1_000_000).toFixed(1)}M AED</Td>
                  <Td>
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: b.bg, color: b.color, fontSize: 10, fontWeight: 700 }}>
                      {b.dot} {p.status}
                    </span>
                  </Td>
                  <Td>{p.views}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ActionBtn>Edit</ActionBtn>
                      <Link href="/parcels/map" style={{ ...actionBtnStyle(), textDecoration: "none" }}>Map</Link>
                      <ActionBtn>Docs</ActionBtn>
                      <ActionBtn danger>×</ActionBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 30, textAlign: "center", color: SUBTLE, fontSize: 12 }}>
                  No properties match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <style jsx>{`
        .hover-row:hover { background: rgba(200, 169, 110, 0.05); }
      `}</style>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>{children}</td>;
}
function actionBtnStyle(): React.CSSProperties {
  return {
    fontSize: 10,
    padding: "3px 8px",
    border: `1px solid ${LINE}`,
    borderRadius: 4,
    background: "white",
    color: TXT,
    cursor: "pointer",
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
const MOCK_FAVS = [
  { plot: "6457940", district: "MAJAN", price: "60.5M AED", landUse: "Residential", added: "2 days ago" },
];
function Favorites() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <H1>Favorites</H1>
      <Sub>Plots you've saved from the map. Click ❤️ on any plot to add it here.</Sub>

      {MOCK_FAVS.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40, color: SUBTLE }}>
          No favourites yet. Browse the <Link href="/parcels/map" style={{ color: GOLD }}>map</Link> and tap ❤️ on a plot to save it.
        </Card>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {MOCK_FAVS.map((f) => (
              <Card key={f.plot}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>{f.plot}</span>
                  <button style={{ background: "none", border: 0, fontSize: 16, cursor: "pointer", color: "#EF4444" }}>❤️</button>
                </div>
                <div style={{ fontSize: 11, color: SUBTLE, marginBottom: 4 }}>{f.district} · {f.landUse}</div>
                <div style={{ color: GOLD, fontSize: 16, fontWeight: 800 }}>{f.price}</div>
                <div style={{ fontSize: 9, color: SUBTLE, marginTop: 8 }}>Added {f.added}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <ActionBtn>View on Map</ActionBtn>
                  <ActionBtn>Feasibility</ActionBtn>
                </div>
              </Card>
            ))}
          </div>
          <div>
            <GoldBtn>Compare Selected</GoldBtn>
          </div>
        </>
      )}
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
            <tr style={{ background: "#F9FAFB", color: SUBTLE, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
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
const MOCK_NOTIFS = [
  { icon: "👁️", text: "Your property 6457940 was viewed 15 times today", when: "2h ago", read: false },
  { icon: "✅", text: "Your listing has been approved", when: "1d ago", read: false },
  { icon: "💌", text: "New inquiry for plot 6457940", when: "2d ago", read: true },
  { icon: "📉", text: "Price drop alert: a plot nearby reduced by 10%", when: "3d ago", read: true },
];
function Notifications() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <H1>Notifications</H1>
          <Sub>{notifs.filter((n) => !n.read).length} unread</Sub>
        </div>
        <button
          onClick={() => setNotifs(notifs.map((n) => ({ ...n, read: true })))}
          style={{ fontSize: 11, color: GOLD, background: "transparent", border: 0, cursor: "pointer" }}
        >
          Mark all as read
        </button>
      </div>
      <Card style={{ padding: 0 }}>
        {notifs.map((n, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              borderTop: i > 0 ? `1px solid ${LINE}` : "none",
              background: n.read ? "white" : "rgba(200,169,110,0.05)",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: n.read ? 400 : 700 }}>{n.text}</div>
              <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>{n.when}</div>
            </div>
            {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, marginTop: 6 }} />}
          </div>
        ))}
      </Card>
      <Card>
        <H2>Notification Preferences</H2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
          {["New views on my listings", "New inquiries", "Listing status changes", "Price alerts on favourites", "Archibald insights"].map((p) => (
            <label key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {p}
              <span style={{ display: "flex", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: SUBTLE }}><input type="checkbox" defaultChecked />Email</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: SUBTLE }}><input type="checkbox" defaultChecked />Push</span>
              </span>
            </label>
          ))}
        </div>
      </Card>
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

      <Card>
        <H2>Account</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Language"><select style={input()}><option>EN</option><option>AR</option><option>RU</option></select></Field>
          <Field label="Currency"><select style={input()}><option>AED</option><option>USD</option><option>EUR</option></select></Field>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <button style={{ padding: "8px 14px", border: `1px solid ${LINE}`, borderRadius: 6, background: "white", fontSize: 12, cursor: "pointer" }}>Change Password</button>
          <button style={{ padding: "8px 14px", border: `1px solid ${LINE}`, borderRadius: 6, background: "white", fontSize: 12, cursor: "pointer" }}>Export My Data (PDPL)</button>
        </div>
      </Card>

      <Card style={{ borderColor: "#FCA5A5" }}>
        <H2>Danger Zone</H2>
        <p style={{ fontSize: 11, color: SUBTLE, margin: "0 0 12px" }}>
          Deleting your account is permanent and cannot be undone. All listings will be unpublished.
        </p>
        <button
          onClick={() => alert("Confirmation flow not yet implemented.")}
          style={{ padding: "8px 14px", background: "#B91C1C", color: "white", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          Delete Account
        </button>
      </Card>
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
