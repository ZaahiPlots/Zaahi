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
