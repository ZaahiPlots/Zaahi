import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BuildingViewer from "./BuildingViewer";

export const dynamic = "force-dynamic";

export default async function Parcel3DPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parcel = await prisma.parcel.findUnique({
    where: { id },
    include: { affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });
  if (!parcel) notFound();

  const plan = parcel.affectionPlans[0];
  if (!plan?.maxFloors) notFound();

  const plot = parcel.geometry as unknown as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  const building = (plan.buildingLimitGeometry as unknown as GeoJSON.Polygon | null) ?? null;

  return (
    <div className="relative w-screen h-screen bg-black text-white">
      <div className="absolute inset-0">
        <BuildingViewer plot={plot} building={building} floors={plan.maxFloors} storeyHeight={4} />
      </div>

      <div className="absolute top-4 left-4 bg-gray-900/90 px-4 py-3 rounded-xl border border-gray-800 z-10 max-w-xs">
        <Link href={`/parcels/${parcel.id}`} className="text-amber-400 text-sm hover:underline">
          ← Plot {parcel.plotNumber}
        </Link>
        <div className="font-bold mt-1">{plan.projectName}</div>
        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
          <div>{plan.maxHeightCode} · {plan.maxFloors} floors · {plan.maxHeightMeters} m</div>
          <div>Plot {plan.plotAreaSqm?.toLocaleString()} m²</div>
          <div>GFA {plan.maxGfaSqm?.toLocaleString()} m²</div>
          <div>FAR {plan.far}</div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-gray-900/90 px-3 py-2 rounded-lg border border-gray-800 text-xs text-gray-400 z-10">
        Drag to orbit · scroll to zoom · right-click to pan
      </div>
    </div>
  );
}
