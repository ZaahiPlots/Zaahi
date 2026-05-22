// Shared types for the vault upload wizard (Day 6).
//
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.1.

export type Emirate =
  | "DUBAI"
  | "ABU_DHABI"
  | "SHARJAH"
  | "AJMAN"
  | "UAQ"
  | "RAK"
  | "FUJAIRAH";

export const EMIRATES: Emirate[] = [
  "DUBAI",
  "ABU_DHABI",
  "SHARJAH",
  "AJMAN",
  "UAQ",
  "RAK",
  "FUJAIRAH",
];

export const EMIRATE_LABELS: Record<Emirate, string> = {
  DUBAI: "Dubai",
  ABU_DHABI: "Abu Dhabi",
  SHARJAH: "Sharjah",
  AJMAN: "Ajman",
  UAQ: "Umm Al Quwain",
  RAK: "Ras Al Khaimah",
  FUJAIRAH: "Fujairah",
};

export type VaultStage =
  | "LEAD"
  | "CONTACTED"
  | "NEGOTIATING"
  | "AGREEMENT_SIGNED"
  | "PROMOTED"
  | "LOST"
  | "CLOSED";

export const VAULT_STAGE_LABELS: Record<VaultStage, string> = {
  LEAD: "Lead",
  CONTACTED: "Contacted",
  NEGOTIATING: "Negotiating",
  AGREEMENT_SIGNED: "Agreement signed",
  PROMOTED: "Promoted",
  LOST: "Lost",
  CLOSED: "Closed",
};

export type LandUse =
  | "RESIDENTIAL"
  | "COMMERCIAL"
  | "MIXED_USE"
  | "HOTEL"
  | "INDUSTRIAL"
  | "EDUCATIONAL"
  | "HEALTHCARE"
  | "AGRICULTURAL"
  | "FUTURE_DEVELOPMENT";

export const LAND_USE_LABELS: Record<LandUse, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  MIXED_USE: "Mixed Use",
  HOTEL: "Hotel / Hospitality",
  INDUSTRIAL: "Industrial / Warehouse",
  EDUCATIONAL: "Educational",
  HEALTHCARE: "Healthcare",
  AGRICULTURAL: "Agricultural / Farm",
  FUTURE_DEVELOPMENT: "Future Development",
};

/** Result from POST /api/me/vault/plot-lookup. */
export interface PlotLookupResponse {
  source: "dda" | "not_found";
  existing:
    | {
        id: string;
        plotNumber: string;
        district: string;
        emirate: string;
        stage: VaultStage;
        askingPriceFils: string | null;
        createdAt: string;
      }
    | null;
  ddaData?: {
    area: number | null;
    geometry: unknown | null;
    landUse: string | null;
    latitude: number | null;
    longitude: number | null;
    district: string;
    /** Raw DDA snapshot (BASIC_LAND_BASE feature). Present only on live DDA hits. */
    ddaSnapshot?: unknown;
  };
}

/** Accumulated wizard state — fed forward step by step. */
export interface WizardState {
  // Step 1 outputs — plot identity + facts
  emirate: Emirate;
  district: string;
  plotNumber: string;
  source: "dda" | "manual" | null;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
  geometry: unknown | null;
  /** Raw DDA snapshot persisted on the VaultEntry for Signature 3D render. */
  ddaSnapshot: unknown | null;
  landUse: LandUse | null;

  // Step 2 outputs — broker's own data
  askingPriceFils: string | null; // BigInt as string (matches API)
  stage: VaultStage;
  followUpSource: string | null;
  nextFollowUpAt: string | null; // ISO
  ownerContact: {
    name?: string;
    phone?: string;
    email?: string;
    role?: string;
    notes?: string;
  } | null;
  brokerNotes: string | null;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  emirate: "DUBAI",
  district: "",
  plotNumber: "",
  source: null,
  area: null,
  latitude: null,
  longitude: null,
  geometry: null,
  ddaSnapshot: null,
  landUse: null,
  askingPriceFils: null,
  stage: "LEAD",
  followUpSource: null,
  nextFollowUpAt: null,
  ownerContact: null,
  brokerNotes: null,
};
