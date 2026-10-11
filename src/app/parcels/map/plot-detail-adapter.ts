// Plot-detail adapter (spec docs/specs/sold-plots-layer.md §6): turns plot facts that are
// NOT a Parcel row (sold-plots card today; master-plan tile properties later) into the
// ParcelDetail shape SidePanel renders through `directData`. hasBackingParcel:false hides
// every control that calls /api/parcels/:id/*.

import type { ParcelDetail } from "./SidePanel";
import type { PlotHistory } from "./plot-history";

const SQFT_TO_SQM = 0.09290304;

export interface SoldPlotCard {
  id: string;
  pid: string | null;
  comm: string;
  area: string;
  master: string | null;
  landUse: string | null;
  sqft: number | null;
  dldLand: string | null;
  place: { src: "dda" | "mp" | "geo"; approx: boolean };
  sales: PlotHistory["sales"];
  mortgages: number;
  gifts: number;
  far: number | null;
  gfaSqft: number | null;
  gfaSrc: string | null;
  project: PlotHistory["project"];
}
export interface SoldPlotAsof { dxb: string; kit: string; registry: string; projects: string }

export function freshness(a: SoldPlotAsof, sales: PlotHistory["sales"]): string {
  const parts: string[] = [];
  if (sales.some((s) => s.src === "dxb")) parts.push(`DXB Interact exports to ${a.dxb.slice(0, 7)}`);
  if (sales.some((s) => s.src === "kit")) parts.push(`DLD registry xlsx to ${a.kit.slice(0, 7)}`);
  parts.push(`land registry ${a.registry.slice(0, 7)}`, `RERA projects ${a.projects.slice(0, 7)}`);
  return parts.join(" · ");
}

export function cardToParcelDetail(card: SoldPlotCard, asof: SoldPlotAsof): ParcelDetail {
  const last = card.sales[0];
  const sqft = card.sqft;
  const landUse = card.landUse ? [{ category: card.landUse, sub: "", areaSqm: null }] : null;
  return {
    id: `sold:${card.id}`,
    hasBackingParcel: false,
    plotNumber: card.id,
    district: card.master || card.area || card.comm,
    emirate: "DUBAI",
    status: "SOLD",
    area: sqft ?? 0,
    currentValuation: last ? String(last.p) : null,
    priceLabel: last ? `Last sale${last.d ? ` · ${last.d.slice(0, 7)}` : ""}` : undefined,
    latitude: null,
    longitude: null,
    geometry: null,
    history: {
      sales: card.sales,
      mortgages: card.mortgages,
      gifts: card.gifts,
      far: card.far,
      gfaSqft: card.gfaSqft,
      gfaSrc: card.gfaSrc,
      project: card.project,
      source: freshness(asof, card.sales),
    },
    affectionPlans: [
      {
        projectName: card.master,
        community: card.comm,
        masterDeveloper: null,
        oldNumber: null,
        plotAreaSqm: sqft ? Math.round(sqft * SQFT_TO_SQM * 100) / 100 : null,
        plotAreaSqft: sqft,
        // GFA / FAR here come from a master plan, not a DDA affection plan: shown (labelled
        // "derived") by the Transaction history block, not as "Max GFA" / "FAR".
        maxGfaSqm: null,
        maxGfaSqft: null,
        maxHeightCode: null,
        maxFloors: null,
        maxHeightMeters: null,
        far: null,
        setbacks: null,
        landUseMix: landUse,
        sitePlanIssue: null,
        sitePlanExpiry: null,
        notes: null,
        notesOriginal: null,
        plotGuidelinesUrl: null,
        source: "sold-plots",
        fetchedAt: new Date().toISOString(),
        raw: null,
      },
    ],
  };
}
