"use client";
import { useEffect, useState } from "react";
import FeasibilityCalculator from "./FeasibilityCalculator";
import OfferModal from "./OfferModal";
import { supabaseBrowser } from "@/lib/supabase-browser";

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";

const LANDUSE_COLORS: Record<string, string> = {
  RESIDENTIAL: "#FFD700",
  COMMERCIAL: "#3B82F6",
  HOTEL: "#F97316",
  HOSPITALITY: "#F97316",
  RETAIL: "#EC4899",
  INDUSTRIAL: "#6B7280",
  "FUTURE DEVELOPMENT": "#84CC16",
};

function fmtMonthYear(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface Plan {
  projectName: string | null;
  community: string | null;
  masterDeveloper: string | null;
  oldNumber: string | null;
  plotAreaSqm: number | null;
  plotAreaSqft: number | null;
  maxGfaSqm: number | null;
  maxGfaSqft: number | null;
  maxHeightCode: string | null;
  maxFloors: number | null;
  maxHeightMeters: number | null;
  far: number | null;
  setbacks: Array<{ side: number; building: number | null; podium: number | null }> | null;
  landUseMix: Array<{ category: string; sub: string; areaSqm: number | null }> | null;
  sitePlanIssue: string | null;
  sitePlanExpiry: string | null;
  source: string;
  fetchedAt: string;
}

interface ParcelDetail {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  status: string;
  area: number;
  currentValuation: string | null;
  affectionPlans: Plan[];
}

function aedFromFils(fils: string | null): number | null {
  if (!fils) return null;
  return Number(BigInt(fils)) / 100;
}
function fmtBigAed(aed: number | null): string {
  if (aed == null) return "—";
  if (aed >= 1_000_000) return `${(aed / 1_000_000).toFixed(1)}M AED`;
  if (aed >= 1_000) return `${(aed / 1_000).toFixed(0)}K AED`;
  return `${aed} AED`;
}

export default function SidePanel({ parcelId, onClose }: { parcelId: string | null; onClose: () => void }) {
  const [data, setData] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [feasOpen, setFeasOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!parcelId) return;
    setLoading(true);
    setData(null);
    setDocsOpen(false);
    setFeasOpen(false);
    fetch(`/api/parcels/${parcelId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [parcelId]);

  const open = parcelId != null;
  const plan = data?.affectionPlans?.[0] ?? null;
  const aed = aedFromFils(data?.currentValuation ?? null);
  const pricePerSqft = aed != null && data?.area ? aed / data.area : null;

  return (
    <aside
      style={{
        maxHeight: "100vh",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderLeft: `1px solid ${LINE}`,
        color: TXT,
      }}
      className={`absolute top-0 right-0 h-full w-[350px] z-20 overflow-y-auto transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div
        className="sticky top-0 px-4 py-2 flex items-center gap-2"
        style={{
          background: "rgba(255,255,255,0.95)",
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <button
          onClick={onClose}
          style={{ color: SUBTLE, fontSize: 18, lineHeight: 1, background: "none", border: 0, cursor: "pointer" }}
        >
          ×
        </button>
        <div className="flex-1 min-w-0">
          {data ? (
            <>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, lineHeight: 1.1 }} className="truncate">
                Plot {data.plotNumber}
              </div>
              <div style={{ color: SUBTLE, fontSize: 10 }} className="truncate">
                {data.district} · {data.emirate}
              </div>
            </>
          ) : (
            <div style={{ color: SUBTLE, fontSize: 11 }}>{loading ? "Loading…" : ""}</div>
          )}
        </div>
      </div>

      {data && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
          {/* Price block */}
          <div style={{ paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>
              {fmtBigAed(aed)}
            </div>
            {pricePerSqft != null && (
              <div style={{ color: SUBTLE, fontSize: 10, marginTop: 2 }}>
                {pricePerSqft.toLocaleString("en-US", { maximumFractionDigits: 0 })} AED/sqft
              </div>
            )}
          </div>

          {plan ? (
            <>
              <Section title="Project">
                <Row label="Name" v={plan.projectName} />
                <Row label="Community" v={plan.community} />
                <Row label="Master Dev" v={plan.masterDeveloper} />
              </Section>

              <Section title="Dimensions">
                <Row label="Plot" v={plan.plotAreaSqft ? `${Math.round(plan.plotAreaSqft).toLocaleString()} ft²` : null} />
                <Row label="Max GFA" v={plan.maxGfaSqft ? `${Math.round(plan.maxGfaSqft).toLocaleString()} ft²` : null} />
                <Row label="FAR" v={plan.far?.toString()} />
                <Row label="Height" v={plan.maxHeightCode ? `${plan.maxHeightCode} · ${plan.maxFloors}f · ~${plan.maxHeightMeters}m` : null} />
              </Section>

              {/* Land Use with colored indicator */}
              {plan.landUseMix && plan.landUseMix.length > 0 && (
                <Section title="Land Use">
                  <ul style={{ display: "flex", flexDirection: "column", gap: 3, margin: 0, padding: 0, listStyle: "none" }}>
                    {plan.landUseMix.map((u, i) => {
                      const color = LANDUSE_COLORS[u.category.toUpperCase().trim()] ?? GOLD;
                      return (
                        <li key={i} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: 2,
                            background: color, flexShrink: 0,
                          }} />
                          <span style={{ color: TXT, fontWeight: 600 }}>{u.category}</span>
                          <span style={{ color: SUBTLE }}>· {u.sub}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {/* Affection Plan dates */}
              {(plan.sitePlanIssue || plan.sitePlanExpiry) && (
                <Section title="Affection Plan">
                  <div style={{ fontSize: 11, color: TXT }}>
                    {fmtMonthYear(plan.sitePlanIssue)}
                    {plan.sitePlanIssue && plan.sitePlanExpiry && " → "}
                    {fmtMonthYear(plan.sitePlanExpiry)}
                  </div>
                </Section>
              )}

              {/* Feasibility Calculator — ALWAYS visible. Manual GFA / price entry
                  is supported when DDA data is missing. */}
              <div>
                <button
                  onClick={() => setFeasOpen((v) => !v)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    fontSize: 11,
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: `1px solid ${GOLD}`,
                    background: "rgba(200,169,110,0.08)",
                    color: GOLD,
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  <span>Feasibility Calculator</span>
                  <span>{feasOpen ? "▾" : "▸"}</span>
                </button>
                {feasOpen && (
                  <div style={{ marginTop: 8 }}>
                    <FeasibilityCalculator
                      plotAreaSqft={data.area}
                      plotPriceAed={aed ?? 0}
                      gfaSqft={plan.maxGfaSqft ?? 0}
                      far={plan.far}
                      landUseMix={plan.landUseMix}
                      landUse={
                        plan.landUseMix && plan.landUseMix.length > 1
                          ? "MIXED_USE"
                          : (plan.landUseMix?.[0]?.category ?? "RESIDENTIAL")
                      }
                    />
                  </div>
                )}
              </div>

              {/* Documents */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => setDocsOpen((v) => !v)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    fontSize: 11,
                    padding: "6px 10px",
                    borderRadius: 4,
                    background: "white",
                    border: `1px solid ${LINE}`,
                    color: TXT,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span>Documents</span>
                  <span style={{ color: SUBTLE }}>{docsOpen ? "▾" : "▸"}</span>
                </button>
                {docsOpen && (
                  <div style={{ paddingLeft: 8, borderLeft: `1px solid ${LINE}` }}>
                    <a
                      href={`/api/parcels/${data.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "block", fontSize: 10, color: GOLD, padding: "4px 8px", textDecoration: "none" }}
                    >
                      📄 Affection Plan (PDF)
                    </a>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 9, color: "#9CA3AF", paddingTop: 6, borderTop: `1px solid ${LINE}` }}>
                Source: {plan.source} · {plan.fetchedAt.slice(0, 10)}
              </div>
              {/* Spacer so sticky CTA never covers the last row */}
              <div style={{ height: 72 }} />
            </>
          ) : (
            <p style={{ color: SUBTLE }}>No affection plan loaded for this parcel.</p>
          )}
        </div>
      )}

      {/* Sticky Start Negotiation CTA — always visible at bottom of panel */}
      {data && signedIn && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 12,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(8px)",
            borderTop: `1px solid ${LINE}`,
            boxShadow: "0 -4px 14px rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => setOfferOpen(true)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 8,
              border: 0,
              background: `linear-gradient(135deg, ${GOLD} 0%, #B8975E 100%)`,
              color: "white",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(200,169,110,0.35)",
            }}
          >
            Start Negotiation
          </button>
        </div>
      )}

      {offerOpen && data && (
        <OfferModal
          parcelId={data.id}
          askingPriceAed={aed}
          onClose={() => setOfferOpen(false)}
        />
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string | null | undefined }) {
  if (v == null) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, lineHeight: 1.4 }}>
      <span style={{ color: SUBTLE }}>{label}</span>
      <span style={{ color: TXT, textAlign: "right" }}>{v}</span>
    </div>
  );
}
