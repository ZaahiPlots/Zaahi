// Zod schemas for the public /register flow. Shared between client UX
// (live validation) and the /api/registration/submit handler.

import { z } from "zod";

export const COHORT_APPLICANT_ROLES = [
  "OWNER",
  "BROKER",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "BUYER",
  "ARCHITECT",
  "POA",
  "INTERMEDIARY",
  "RELATIVE",
  "REFERRAL",
  "OTHER",
] as const;

export type CohortApplicantRole = (typeof COHORT_APPLICANT_ROLES)[number];

// Display labels — single source for the role select dropdown + admin queue.
export const ROLE_LABELS: Record<CohortApplicantRole, string> = {
  OWNER: "Owner — landowner / titleholder",
  BROKER: "Broker — RERA-licensed real-estate broker",
  PROJECT_MANAGER: "Project Manager — coordinating a development project",
  DEVELOPER: "Developer — DLD-registered developer",
  BUYER: "Buyer — looking to acquire land",
  ARCHITECT: "Architect — licensed architect",
  POA: "POA — acting on behalf of an owner",
  INTERMEDIARY: "Intermediary — facilitator between parties",
  RELATIVE: "Relative — family member of a participant",
  REFERRAL: "Referral — introduced by another participant",
  OTHER: "Other — describe in notes",
};

// Nickname constraints (spec §6.2):
//   - 2-40 chars
//   - alphanumeric + `_-`
export const NICKNAME_REGEX = /^[A-Za-z0-9_-]{2,40}$/;

// Phone — required from 2026-06-10 (founder backlog #30). Format is
// loose enough to accept iOS Contacts paste — parentheses around area
// codes, dots between groups, NBSP / LTR-marks injected by Arabic
// locale clipboards. Same shape the vault OwnerContact accepted after
// the 2026-06-08 mobile-400 incident; preventing a regression here
// when we flip from optional → required.
//   - leading +, optional
//   - digits, plus ( ) . - space, NBSP ( ), LTR/RTL marks (‎/F)
//   - 7..32 chars total (32 covers "+971 (50) 123-4567 ext. 99" + a bit)
const PHONE_REGEX = /^\+?[\d\s().\- ‎‏]{7,32}$/;
const PHONE_FORMAT_MSG = "Phone format: digits with + ( ) . space - allowed.";
const PHONE_REQUIRED_MSG = "Phone is required.";

// Step 1 client schema: what /register Step 1 collects before moving on.
export const Step1BasicsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email."),
    phone: z
      .string()
      .trim()
      .min(1, PHONE_REQUIRED_MSG)
      .regex(PHONE_REGEX, PHONE_FORMAT_MSG),
    nickname: z
      .string()
      .trim()
      .regex(NICKNAME_REGEX, "2-40 chars; letters, digits, _ or - only."),
    role: z.enum(COHORT_APPLICANT_ROLES),
    referralPath: z
      .object({
        directContact: z.boolean(),
        intermediariesCount: z.union([
          z.literal(0),
          z.literal(1),
          z.literal(2),
          z.literal(3),
        ]),
      })
      .optional(),
  })
  .refine(
    (d) => d.role !== "REFERRAL" || d.referralPath !== undefined,
    {
      message: "Referral path required for REFERRAL role.",
      path: ["referralPath"],
    },
  );

export type Step1Basics = z.infer<typeof Step1BasicsSchema>;

// One uploaded-file metadata entry (kind + Supabase Storage path + originals).
// Stored as RegistrationApplication.documentsJson per spec §5.3.
export const DocumentMetaSchema = z.object({
  kind: z.string().min(1).max(64),
  path: z.string().min(1).max(512), // <userId>/<kind>-<ts>.<ext>
  originalName: z.string().min(1).max(256),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024 + 1024),
  contentType: z.string().min(1).max(96),
  uploadedAt: z.string().datetime(),
});

export type DocumentMeta = z.infer<typeof DocumentMetaSchema>;

export const ReferralPathSchema = z.object({
  directContact: z.boolean(),
  intermediariesCount: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
});

// Server-side full-application schema, after files are uploaded.
// /api/registration/submit validates the multipart text fields against this
// (documents are reconstructed from the multipart File parts separately).
export const SubmitTextSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email."),
    phone: z
      .string()
      .trim()
      .min(1, PHONE_REQUIRED_MSG)
      .regex(PHONE_REGEX, PHONE_FORMAT_MSG),
    nickname: z
      .string()
      .trim()
      .regex(NICKNAME_REGEX, "Nickname format invalid."),
    role: z.enum(COHORT_APPLICANT_ROLES),
    referralPath: ReferralPathSchema.optional(),
    confirmAccurate: z.literal(true),
  })
  .refine(
    (d) => d.role !== "REFERRAL" || d.referralPath !== undefined,
    {
      message: "Referral path required when role=REFERRAL.",
      path: ["referralPath"],
    },
  );

export type SubmitText = z.infer<typeof SubmitTextSchema>;
