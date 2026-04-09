"use client";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!parcelId) return;
    setLoading(true);
    setData(null);
    setDocsOpen(false);
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
      style={{ maxHeight: "100vh" }}
      className={`absolute top-0 right-0 h-full w-[350px] bg-gray-950/95 backdrop-blur border-l border-gray-800 text-white z-20 overflow-y-auto transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-2 flex items-center gap-2">
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
        <div className="flex-1 min-w-0">
          {data ? (
            <>
              <div className="text-amber-400 font-bold text-[13px] leading-tight truncate">Plot {data.plotNumber}</div>
              <div className="text-[10px] text-gray-400 truncate">{data.district} · {data.emirate}</div>
            </>
          ) : (
            <div className="text-gray-500 text-xs">{loading ? "Loading…" : ""}</div>
          )}
        </div>
      </div>

      {data && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }} className="text-[11px]">
          {/* Price block */}
          <div className="pb-2 border-b border-gray-800">
            <div className="text-amber-400 font-bold" style={{ fontSize: 20, lineHeight: 1.1 }}>
              {fmtBigAed(aed)}
            </div>
            {pricePerSqft != null && (
              <div className="text-gray-500" style={{ fontSize: 10, marginTop: 2 }}>
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
                <Row label="Plot" v={plan.plotAreaSqft ? `${Math.round(plan.plotAreaSqft).toLocaleString()} ft² (${plan.plotAreaSqm?.toLocaleString()} m²)` : null} />
                <Row label="Max GFA" v={plan.maxGfaSqft ? `${Math.round(plan.maxGfaSqft).toLocaleString()} ft²` : null} />
                <Row label="FAR" v={plan.far?.toString()} />
                <Row label="Height" v={plan.maxHeightCode ? `${plan.maxHeightCode} · ${plan.maxFloors}f · ~${plan.maxHeightMeters}m` : null} />
              </Section>

              {plan.landUseMix && plan.landUseMix.length > 0 && (
                <Section title="Land Use">
                  <ul className="text-[11px] space-y-0.5">
                    {plan.landUseMix.map((u, i) => (
                      <li key={i}>
                        <span className="text-amber-400">{u.category}</span> · {u.sub}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-1 pt-0.5">
                <button
                  onClick={() => setDocsOpen((v) => !v)}
                  className="w-full text-left text-[11px] px-2.5 py-1.5 rounded bg-gray-900 border border-gray-800 hover:border-amber-500/60 flex items-center justify-between"
                >
                  <span>Documents</span>
                  <span className="text-gray-500">{docsOpen ? "▾" : "▸"}</span>
                </button>
                {docsOpen && (
                  <div className="flex flex-col gap-1 pl-2 border-l border-gray-800">
                    <a
                      href={`/api/parcels/${data.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-gray-900/60"
                    >
                      📄 Affection Plan (PDF)
                    </a>
                  </div>
                )}
              </div>

              <div className="text-[9px] text-gray-600 pt-2 border-t border-gray-800">
                Source: {plan.source} · {plan.fetchedAt.slice(0, 10)}
              </div>
            </>
          ) : (
            <p className="text-gray-500">No affection plan loaded for this parcel.</p>
          )}
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-amber-400 font-semibold text-[9px] uppercase tracking-wider mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string | null | undefined }) {
  if (v == null) return null;
  return (
    <div className="flex justify-between gap-2" style={{ fontSize: 11, lineHeight: 1.4 }}>
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-200">{v}</span>
    </div>
  );
}
