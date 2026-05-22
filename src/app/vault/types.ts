// Shared types for /vault route components.

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

export interface VaultEntrySummary {
  id: string;
  plotNumber: string;
  emirate: string;
  district: string;
  stage: VaultStage;
  askingPriceFils: string | null;
  source: string | null;
  nextFollowUpAt: string | null;
  shareCount: number;
  conflictsWithOthers: boolean;
  addedByUserId: string | null;
  addedByNickname: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEntryShareSummary {
  shareId: string;
  sharedBy: { id: string; nickname: string | null } | null;
  sharedAt: string;
  permission: string;
  expiresAt: string | null;
  entry: {
    id: string;
    plotNumber: string;
    emirate: string;
    district: string;
    stage: VaultStage;
    askingPriceFils: string | null;
    landUse: string | null;
    conflictsWithOthers: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export type TabKey = "mine" | "shared" | "conflicts";

export const TAB_LABELS: Record<TabKey, string> = {
  mine: "All entries",
  shared: "Shared with me",
  conflicts: "Conflicts",
};
