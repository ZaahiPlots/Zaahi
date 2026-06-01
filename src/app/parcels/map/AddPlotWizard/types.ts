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
    /** Full AffectionPlan from PlotInfo HTML — Phase 2 of vault refactor.
     *  Null when DDA returns "SEE NOTES" / master plot / parse failure. */
    plan?: unknown;
    /** Building-limit polygon (MapServer/8). Null when missing for the plot. */
    buildingLimit?: unknown;
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
  /** Full AffectionPlan from /api/me/vault/plot-lookup — passed through
   *  to /api/me/vault/entries so ensureVaultPrivateParcel doesn't have
   *  to re-fetch from DDA. Phase 2/3 of vault refactor. */
  plan: unknown | null;
  /** Building-limit polygon from /api/me/vault/plot-lookup — same
   *  passthrough rationale as `plan`. */
  buildingLimit: unknown | null;
  landUse: LandUse | null;

  // Step 1 manual-entry additions — Sprint 1 non-DDA pipeline
  // (founder spec, docs/specs/non-dda-plot-entry-DESIGN.md). All
  // four are nullable so the DDA path can leave them untouched.
  /** Floor count for 3D extrusion. Vault: optional — without it the
   *  map renders a flat polygon (D7). */
  maxFloors: number | null;
  /** Raw height code from the affection plan, e.g. "G+15". Either
   *  this or maxFloors enables 3D tiers in loadZaahiPlots. */
  maxHeightCode: string | null;
  /** Floor Area Ratio. Optional for vault; recommended for accurate
   *  GFA derivation. */
  far: number | null;
  /** Supabase Storage path of the uploaded Affection Plan PDF.
   *  Mandatory for non-DDA Vault entries (Sprint 1). Stored on the
   *  AffectionPlan.raw blob server-side; not parsed in Sprint 1
   *  (Sprint 3 wires Claude vision). */
  affectionPlanPath: string | null;

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
  plan: null,
  buildingLimit: null,
  landUse: null,
  maxFloors: null,
  maxHeightCode: null,
  far: null,
  affectionPlanPath: null,
  askingPriceFils: null,
  stage: "LEAD",
  followUpSource: null,
  nextFollowUpAt: null,
  ownerContact: null,
  brokerNotes: null,
};
