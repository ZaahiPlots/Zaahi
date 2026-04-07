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

function fmtAed(fils: string | null): string {
  if (!fils) return "—";
  const aed = Number(BigInt(fils)) / 100;
  return aed.toLocaleString("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });
}

export default function SidePanel({ parcelId, onClose }: { parcelId: string | null; onClose: () => void }) {
  const [data, setData] = useState<ParcelDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parcelId) return;
    setLoading(true);
    setData(null);
    fetch(`/api/parcels/${parcelId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [parcelId]);

  const open = parcelId != null;
  const plan = data?.affectionPlans?.[0] ?? null;

  return (
    <aside
      className={`absolute top-0 right-0 h-full w-[420px] bg-gray-950/95 backdrop-blur border-l border-gray-800 text-white z-20 overflow-y-auto transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-5 py-4 flex items-center gap-3">
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        <div className="flex-1 min-w-0">
          {data ? (
            <>
              <div className="text-amber-400 font-bold truncate">Plot {data.plotNumber}</div>
              <div className="text-xs text-gray-400 truncate">{data.district} · {data.emirate}</div>
            </>
          ) : (
            <div className="text-gray-500 text-sm">{loading ? "Loading…" : ""}</div>
          )}
        </div>
        {data?.currentValuation && (
          <div className="text-amber-400 text-sm font-semibold whitespace-nowrap">
            {fmtAed(data.currentValuation)}
          </div>
        )}
      </div>

      {data && (
        <div className="p-5 space-y-5 text-sm">
          {plan ? (
            <>
              <Section title="Project">
                <Row label="Name" v={plan.projectName} />
                <Row label="Community" v={plan.community} />
                <Row label="Master Dev" v={plan.masterDeveloper} />
                <Row label="Old #" v={plan.oldNumber} />
              </Section>

              <Section title="Dimensions">
                <Row label="Plot Area" v={plan.plotAreaSqm ? `${plan.plotAreaSqm.toLocaleString()} m² (${plan.plotAreaSqft?.toLocaleString()} ft²)` : null} />
                <Row label="Max GFA" v={plan.maxGfaSqm ? `${plan.maxGfaSqm.toLocaleString()} m²` : null} />
                <Row label="FAR" v={plan.far?.toString()} />
                <Row label="Max Height" v={plan.maxHeightCode ? `${plan.maxHeightCode} · ${plan.maxFloors}f · ~${plan.maxHeightMeters}m` : null} />
                <Row label="Site Plan" v={plan.sitePlanIssue ? `${plan.sitePlanIssue.slice(0,10)} → ${plan.sitePlanExpiry?.slice(0,10) ?? "—"}` : null} />
              </Section>

              {plan.setbacks && plan.setbacks.length > 0 && (
                <Section title="Setbacks (m)">
                  <table className="w-full text-xs">
                    <thead className="text-gray-500">
                      <tr><th className="text-left">Side</th><th className="text-left">Building</th><th className="text-left">Podium</th></tr>
                    </thead>
                    <tbody>
                      {plan.setbacks.map((s) => (
                        <tr key={s.side}><td>Side {s.side}</td><td>{s.building ?? "N/A"}</td><td>{s.podium ?? "N/A"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {plan.landUseMix && plan.landUseMix.length > 0 && (
                <Section title="Land Use Mix">
                  <ul className="text-xs space-y-0.5">
                    {plan.landUseMix.map((u, i) => (
                      <li key={i}>
                        <span className="text-amber-400">{u.category}</span> · {u.sub}
                        {u.areaSqm != null && ` (${u.areaSqm.toLocaleString()} m²)`}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <div className="flex gap-2">
                <a
                  href={`/api/parcels/${data.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center text-xs px-3 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400"
                >
                  Download Official PDF
                </a>
                <button
                  disabled
                  title="DWG export — coming next"
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
                >
                  Download DWG
                </button>
              </div>

              <div className="text-[10px] text-gray-600 pt-2 border-t border-gray-800">
                Source: {plan.source} · {plan.fetchedAt.slice(0, 19)}Z
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
      <div className="text-amber-400 font-semibold text-xs uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-800/60 pb-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-right">{v ?? "—"}</span>
    </div>
  );
}
