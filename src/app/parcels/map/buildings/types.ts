// Client-side types for the digital-twin Buildings layer. Mirror the
// shape returned by GET /api/buildings — keep in sync by hand (no Prisma
// client in the browser bundle).

export type BuildingStatusStr = "COMPLETED" | "UNDER_CONSTRUCTION" | "PLANNED";

export interface BuildingPhoto {
  url: string;
  credit?: string;
  alt?: string;
}

export interface BuildingSource {
  label: string;
  url: string;
  fetchedAt?: string;
  notes?: string;
}

export interface BuildingDTO {
  id: string;
  name: string;
  status: BuildingStatusStr;
  community: string;
  masterPlan: string | null;
  plotNumber: string | null;
  emirate: string;
  centroidLat: number;
  centroidLng: number;
  footprintPolygon: unknown | null;
  developer: string | null;
  architect: string | null;
  completionYear: number | null;
  expectedCompletion: number | null;
  constructionStarted: number | null;
  floors: number | null;
  heightM: number | null;
  totalUnits: number | null;
  buildingType: string | null;
  description: string | null;
  amenities: string[] | null;
  photos: BuildingPhoto[] | null;
  modelPath: string | null;
  rotationDeg: number;
  scaleFactor: number;
  modelProvider: string | null;
  propsearchUrl: string | null;
  sources: BuildingSource[] | null;
  confidenceLevel: "high" | "medium" | "low" | string;
}
