// API JSON shapes consumed by /admin/queue UI.

import type { RegistrationStatus } from "./styles";
import type { CohortApplicantRole } from "@/lib/registration-validation";

export interface ListItem {
  id: string;
  userId: string | null;
  email: string;
  nickname: string;
  roleApplied: CohortApplicantRole | null;
  status: RegistrationStatus;
  autoMigrated: boolean;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  emailVerified: boolean;
  emailConfirmedAt: string | null;
}

export interface ListResponse {
  items: ListItem[];
  nextCursor: string | null;
  total: number;
}

export interface CapCountsResponse {
  counts: Record<CohortApplicantRole, number>;
  capPerRole: number;
}

export interface DetailDoc {
  kind: string;
  path: string;
  originalName?: string;
  sizeBytes?: number;
  contentType?: string;
  uploadedAt?: string;
  signedUrl: string | null;
  expiresAt: string | null;
}

export interface DetailResponse {
  application: ListItem & {
    documentsJson: unknown;
    referralPath: { directContact: boolean; intermediariesCount: 0 | 1 | 2 | 3 } | null;
    approvedById: string | null;
    rejectedById: string | null;
  };
  emailVerified: boolean;
  emailConfirmedAt: string | null;
  realName: string | null;
  documents: DetailDoc[];
}

// ── Step 10: Title Deed + Plot Claim verification queues ─────────────

export interface ClaimDocSigned {
  kind: string;
  originalName: string | null;
  sizeBytes: number | null;
  contentType: string | null;
  signedUrl: string | null;
  expiresAt: string | null;
  source: "registration-docs" | "documents";
}

export interface TitleDeedListItem {
  parcelId: string;
  plotNumber: string;
  district: string;
  emirate: string;
  projectName: string;
  creatorNickname: string | null;
  claims: Array<{
    claimId: string;
    userId: string;
    nickname: string | null;
    priceAed: string; // BigInt-serialised
    createdAt: string;
  }>;
}

export interface TitleDeedListResponse {
  items: TitleDeedListItem[];
  total: number;
}

export interface TitleDeedDetailResponse {
  parcel: {
    id: string;
    plotNumber: string;
    emirate: string;
    district: string;
    projectName: string;
    plotAreaSqft: number | null;
    community: string | null;
    masterDeveloper: string | null;
    ownerId: string;
    creator: {
      id: string;
      nickname: string | null;
      name: string;
      email: string;
      role: string;
    } | null;
    verifiedOwnerUserId: string | null;
    verifiedAt: string | null;
  };
  claims: Array<{
    id: string;
    userId: string;
    priceAed: string;
    status: "PENDING" | "VERIFIED" | "REJECTED" | "SELF_DECLARED";
    createdAt: string;
    verifiedAt: string | null;
    rejectionReason: string | null;
    user: {
      id: string;
      nickname: string | null;
      name: string;
      email: string;
      role: string;
    };
    documents: ClaimDocSigned[];
  }>;
  pendingCount: number;
}

export interface PlotClaimListItem {
  id: string;
  userId: string;
  roleAtClaim: "BROKER" | "DEVELOPER" | "ARCHITECT" | "POA";
  priceAed: string;
  createdAt: string;
  user: { id: string; nickname: string | null };
  parcel: {
    id: string;
    plotNumber: string;
    district: string;
    emirate: string;
    verifiedOwnerUserId: string | null;
  };
}

export interface PlotClaimListResponse {
  items: PlotClaimListItem[];
  total: number;
}

export interface PlotClaimDetailResponse {
  claim: {
    id: string;
    userId: string;
    roleAtClaim: "BROKER" | "DEVELOPER" | "ARCHITECT" | "POA";
    priceAed: string;
    status: "PENDING" | "VERIFIED" | "REJECTED" | "SELF_DECLARED";
    createdAt: string;
    verifiedAt: string | null;
    verifiedById: string | null;
    rejectionReason: string | null;
    user: {
      id: string;
      nickname: string | null;
      name: string;
      email: string;
      role: string;
    };
  };
  parcel: {
    id: string;
    plotNumber: string;
    emirate: string;
    district: string;
    projectName: string;
    plotAreaSqft: number | null;
    community: string | null;
    ownerId: string;
    verifiedOwnerUserId: string | null;
  };
  documents: ClaimDocSigned[];
}
