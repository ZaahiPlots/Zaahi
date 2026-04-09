/**
 * Deal flow — single source of truth for the Deal Room UI + API.
 *
 * The Prisma `DealStatus` enum (12 values) is the legal state machine and matches
 * `backend/services/deal_engine.ts`. The user-facing timeline is 11 steps that map
 * onto those statuses (plus boolean flags for sub-states).
 */
import { DealStatus } from "@prisma/client";

export interface TimelineStep {
  key: string;
  status: DealStatus;
  label: string;
  short: string;
}

/**
 * 11 user-visible steps in order. Index = step number - 1.
 * `status` is the Prisma enum value the deal sits at while this step is "current".
 */
export const TIMELINE: TimelineStep[] = [
  { key: "INITIATED",            status: "INITIAL",             label: "Offer Submitted",      short: "Offer" },
  { key: "DEPOSIT_PENDING",      status: "DEAL_INITIATED",      label: "Awaiting Deposit",     short: "Deposit Pending" },
  { key: "DEPOSIT_RECEIVED",     status: "DEPOSIT_SUBMITTED",   label: "Deposit Confirmed",    short: "Deposit Received" },
  { key: "AGREEMENT_SIGNED",     status: "AGREEMENT_SIGNED",    label: "MOU Signed",           short: "Agreement" },
  { key: "DOCUMENTS_COLLECTION", status: "DOCUMENTS_COLLECTED", label: "Documents Collection", short: "Documents" },
  { key: "GOV_VERIFICATION",     status: "GOVERNMENT_VERIFIED", label: "Government Verified",  short: "Gov Check" },
  { key: "NOC_PENDING",          status: "NOC_REQUESTED",       label: "NOC Pending",          short: "NOC" },
  { key: "TRANSFER_FEE",         status: "TRANSFER_FEE_PAID",   label: "Transfer Fees Paid",   short: "Fees" },
  { key: "DLD_SUBMISSION",       status: "DLD_SUBMITTED",       label: "Submitted to DLD",     short: "DLD Filed" },
  { key: "DLD_APPROVED",         status: "DLD_SUBMITTED",       label: "DLD Approved",         short: "DLD Approved" }, // distinguished by deal.dldApproved flag
  { key: "COMPLETED",            status: "DEAL_COMPLETED",      label: "Completed",            short: "Done" },
];

/** Resolve the current 1-based step index for a deal. */
export function currentStepIndex(deal: { status: DealStatus; dldApproved: boolean }): number {
  if (deal.status === "DEAL_COMPLETED") return 11;
  if (deal.status === "DEAL_CANCELLED" || deal.status === "DISPUTE_INITIATED") return -1;
  if (deal.status === "DLD_SUBMITTED") return deal.dldApproved ? 10 : 9;
  // first matching step in order
  const idx = TIMELINE.findIndex((s) => s.status === deal.status);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Allowed actions and the (status, flag) transitions they cause.
 * Each action declares which role may invoke it and the resulting status.
 */
export type DealAction =
  | "ACCEPT"           // seller accepts offer → DEAL_INITIATED
  | "COUNTER"          // seller counter-offers → stays INITIAL, updates offerPrice
  | "REJECT"           // seller rejects → DEAL_CANCELLED
  | "DEPOSIT"          // buyer marks deposit paid → DEPOSIT_SUBMITTED
  | "SIGN_MOU"         // both sign MOU → AGREEMENT_SIGNED
  | "DOCS_COMPLETE"    // documents collected → DOCUMENTS_COLLECTED
  | "GOV_VERIFIED"     // government check passed → GOVERNMENT_VERIFIED
  | "NOC_REQUEST"      // NOC requested from developer → NOC_REQUESTED
  | "NOC_RECEIVED"     // NOC received → TRANSFER_FEE_PAID stage
  | "FEES_PAID"        // transfer fees paid → TRANSFER_FEE_PAID
  | "DLD_SUBMIT"       // submitted to DLD → DLD_SUBMITTED
  | "DLD_APPROVE"      // DLD approved → still DLD_SUBMITTED but dldApproved=true
  | "COMPLETE"         // marked completed → DEAL_COMPLETED
  | "CANCEL"           // either party cancels (allowed early states)
  | "DISPUTE";         // dispute → DISPUTE_INITIATED

export type Role = "buyer" | "seller" | "broker";

interface ActionDef {
  fromStatuses: DealStatus[];
  toStatus: DealStatus;
  role: Role[];
  eventType: string;
  /** Optional flag mutations on the deal row */
  setFlags?: Partial<{
    depositPaid: boolean;
    mouSigned: boolean;
    nocReceived: boolean;
    dldApproved: boolean;
  }>;
}

export const ACTIONS: Record<DealAction, ActionDef> = {
  ACCEPT:        { fromStatuses: ["INITIAL"],             toStatus: "DEAL_INITIATED",      role: ["seller"],          eventType: "OFFER_ACCEPTED" },
  COUNTER:       { fromStatuses: ["INITIAL"],             toStatus: "INITIAL",             role: ["seller", "buyer"], eventType: "COUNTER_OFFER" },
  REJECT:        { fromStatuses: ["INITIAL"],             toStatus: "DEAL_CANCELLED",      role: ["seller"],          eventType: "CANCELLED" },
  DEPOSIT:       { fromStatuses: ["DEAL_INITIATED"],      toStatus: "DEPOSIT_SUBMITTED",   role: ["buyer"],           eventType: "DEPOSIT_PAID",    setFlags: { depositPaid: true } },
  SIGN_MOU:      { fromStatuses: ["DEPOSIT_SUBMITTED"],   toStatus: "AGREEMENT_SIGNED",    role: ["buyer", "seller"], eventType: "MOU_SIGNED",      setFlags: { mouSigned: true } },
  DOCS_COMPLETE: { fromStatuses: ["AGREEMENT_SIGNED"],    toStatus: "DOCUMENTS_COLLECTED", role: ["buyer", "seller", "broker"], eventType: "DOCS_COMPLETE" },
  GOV_VERIFIED:  { fromStatuses: ["DOCUMENTS_COLLECTED"], toStatus: "GOVERNMENT_VERIFIED", role: ["broker", "seller"], eventType: "GOV_VERIFIED" },
  NOC_REQUEST:   { fromStatuses: ["GOVERNMENT_VERIFIED"], toStatus: "NOC_REQUESTED",       role: ["seller", "broker"], eventType: "NOC_REQUESTED" },
  NOC_RECEIVED:  { fromStatuses: ["NOC_REQUESTED"],       toStatus: "NOC_REQUESTED",       role: ["seller", "broker"], eventType: "NOC_RECEIVED",    setFlags: { nocReceived: true } },
  FEES_PAID:     { fromStatuses: ["NOC_REQUESTED"],       toStatus: "TRANSFER_FEE_PAID",   role: ["buyer"],           eventType: "FEES_PAID" },
  DLD_SUBMIT:    { fromStatuses: ["TRANSFER_FEE_PAID"],   toStatus: "DLD_SUBMITTED",       role: ["broker", "seller"], eventType: "DLD_SUBMITTED" },
  DLD_APPROVE:   { fromStatuses: ["DLD_SUBMITTED"],       toStatus: "DLD_SUBMITTED",       role: ["broker", "seller"], eventType: "DLD_APPROVED",    setFlags: { dldApproved: true } },
  COMPLETE:      { fromStatuses: ["DLD_SUBMITTED"],       toStatus: "DEAL_COMPLETED",      role: ["buyer", "seller", "broker"], eventType: "COMPLETED" },
  CANCEL:        { fromStatuses: ["INITIAL", "DEAL_INITIATED", "DEPOSIT_SUBMITTED"], toStatus: "DEAL_CANCELLED", role: ["buyer", "seller"], eventType: "CANCELLED" },
  DISPUTE:       { fromStatuses: ["DEPOSIT_SUBMITTED", "AGREEMENT_SIGNED", "DOCUMENTS_COLLECTED", "GOVERNMENT_VERIFIED", "NOC_REQUESTED", "TRANSFER_FEE_PAID", "DLD_SUBMITTED"], toStatus: "DISPUTE_INITIATED", role: ["buyer", "seller", "broker"], eventType: "DISPUTED" },
};

export function getRole(deal: { sellerId: string; buyerId: string; brokerId: string | null }, userId: string): Role | null {
  if (deal.sellerId === userId) return "seller";
  if (deal.buyerId === userId) return "buyer";
  if (deal.brokerId === userId) return "broker";
  return null;
}

export interface ValidatedAction {
  def: ActionDef;
  action: DealAction;
}

export function validateAction(
  deal: { status: DealStatus; sellerId: string; buyerId: string; brokerId: string | null; dldApproved: boolean },
  userId: string,
  action: DealAction
): { ok: true; def: ActionDef; role: Role } | { ok: false; error: string } {
  const role = getRole(deal, userId);
  if (!role) return { ok: false, error: "Forbidden: not a participant" };

  const def = ACTIONS[action];
  if (!def) return { ok: false, error: "Unknown action" };
  if (!def.role.includes(role)) return { ok: false, error: `Action ${action} not allowed for role ${role}` };
  if (!def.fromStatuses.includes(deal.status)) {
    return { ok: false, error: `Cannot ${action} from status ${deal.status}` };
  }
  // DLD_APPROVE only valid if not yet approved
  if (action === "DLD_APPROVE" && deal.dldApproved) {
    return { ok: false, error: "DLD already approved" };
  }
  return { ok: true, def, role };
}

/** AED display helper for Deal lists. */
export function fmtAed(fils: bigint | number | null | undefined): string {
  if (fils == null) return "—";
  const aed = Number(fils) / 100;
  if (aed >= 1_000_000) return `${(aed / 1_000_000).toFixed(2)}M AED`;
  if (aed >= 1_000) return `${(aed / 1_000).toFixed(0)}K AED`;
  return `${aed.toFixed(0)} AED`;
}
