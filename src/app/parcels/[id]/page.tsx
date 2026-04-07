import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { filsToAed } from "@/lib/valuation";
import MapPreview from "./MapPreview";

export const dynamic = "force-dynamic";

type SetbackJson = { side: number; building: number | null; podium: number | null };
type LandUseJson = { category: string; sub: string; areaSqm: number | null };

export default async function ParcelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: {
      affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1 },
    },
  });
  if (!parcel) notFound();

  const plan = parcel.affectionPlans[0] ?? null;
  const setbacks = (plan?.setbacks as SetbackJson[] | null) ?? [];
  const landUse = (plan?.landUseMix as LandUseJson[] | null) ?? [];
  const plotGeom = parcel.geometry as unknown as GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  const buildingGeom = (plan?.buildingLimitGeometry as unknown as GeoJSON.Polygon | null) ?? null;
  const has3d = plan?.maxFloors != null && buildingGeom != null;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <Link href="/parcels/map" className="text-amber-400 hover:underline">← Map</Link>
        <h1 className="text-2xl font-bold">Plot {parcel.plotNumber}</h1>
        <span className="text-gray-400">{parcel.district}, {parcel.emirate}</span>
        <span className="ml-auto text-amber-400 font-bold">
          {parcel.currentValuation ? filsToAed(parcel.currentValuation) : "—"}
        </span>
      </header>

      <div className="grid md:grid-cols-2 gap-6 p-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden h-[420px]">
          {plotGeom ? (
            <MapPreview plot={plotGeom} building={buildingGeom} />
          ) : (
            <div className="p-6 text-gray-500">No geometry</div>
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-amber-400 font-bold">Affection Plan</h2>
            <div className="flex gap-2">
              <a
                href={`/api/parcels/${parcel.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
              >
                Download Official PDF
              </a>
              {has3d && (
                <Link
                  href={`/parcels/${parcel.id}/3d`}
                  className="text-xs px-3 py-1 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400"
                >
                  Open in 3D →
                </Link>
              )}
            </div>
          </div>

          {!plan ? (
            <p className="text-gray-500">No affection plan loaded yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <Row label="Project" value={plan.projectName} />
              <Row label="Community" value={plan.community} />
              <Row label="Master Developer" value={plan.masterDeveloper} />
              <Row label="Old Number" value={plan.oldNumber} />
              <Row
                label="Plot Area"
                value={plan.plotAreaSqm ? `${plan.plotAreaSqm.toLocaleString()} m² (${plan.plotAreaSqft?.toLocaleString()} ft²)` : null}
              />
              <Row
                label="Maximum GFA"
                value={plan.maxGfaSqm ? `${plan.maxGfaSqm.toLocaleString()} m² (${plan.maxGfaSqft?.toLocaleString()} ft²)` : null}
              />
              <Row label="FAR" value={plan.far?.toString()} />
              <Row
                label="Maximum Height"
                value={plan.maxHeightCode ? `${plan.maxHeightCode} (${plan.maxFloors} floors · ~${plan.maxHeightMeters} m)` : null}
              />
              <Row
                label="Site Plan"
                value={
                  plan.sitePlanIssue
                    ? `${plan.sitePlanIssue.toISOString().slice(0, 10)} → ${plan.sitePlanExpiry?.toISOString().slice(0, 10) ?? "—"}`
                    : null
                }
              />

              {setbacks.length > 0 && (
                <div>
                  <div className="text-gray-500 mb-1">Setbacks (m)</div>
                  <table className="w-full text-xs">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="text-left">Side</th>
                        <th className="text-left">Building</th>
                        <th className="text-left">Podium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {setbacks.map((s) => (
                        <tr key={s.side}>
                          <td>Side {s.side}</td>
                          <td>{s.building ?? "N/A"}</td>
                          <td>{s.podium ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {landUse.length > 0 && (
                <div>
                  <div className="text-gray-500 mb-1">Land Use Mix</div>
                  <ul className="text-xs space-y-0.5">
                    {landUse.map((u, i) => (
                      <li key={i}>
                        <span className="text-amber-400">{u.category}</span> · {u.sub}
                        {u.areaSqm != null && ` (${u.areaSqm.toLocaleString()} m²)`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-gray-800 text-[10px] text-gray-500">
                Source: {plan.source} · fetched {plan.fetchedAt.toISOString().slice(0, 19)}Z
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-800 pb-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}
