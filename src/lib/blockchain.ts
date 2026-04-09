/**
 * ZAAHI Blockchain audit trail — Polygon Amoy testnet.
 *
 * Strategy:
 *  - If POLYGON_PRIVATE_KEY is configured AND a deployed contract address is set,
 *    we send a real on-chain tx via ZaahiAuditTrail.recordEvent().
 *  - Otherwise we no-op and return a "pending" marker. The DealAuditEvent row is
 *    still created in the DB; a backfill job can replay pending events later.
 *
 * Why this fallback exists: dev/preview must work without a funded wallet,
 * and we never want a deal flow to hard-fail because the chain is unreachable.
 */

import { ethers } from "ethers";

const RPC_URL = process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology";
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.POLYGON_AUDIT_CONTRACT;
const EXPLORER = process.env.POLYGON_EXPLORER || "https://amoy.polygonscan.com";

const ABI = [
  "function recordEvent(bytes32 dealId, string eventType, bytes32 documentHash) external",
  "event AuditEvent(bytes32 indexed dealId, string eventType, bytes32 documentHash, uint256 timestamp, address indexed sender)",
];

export const PENDING_TX = "pending";

let cachedContract: ethers.Contract | null = null;
let cachedProvider: ethers.JsonRpcProvider | null = null;

function getContract(): ethers.Contract | null {
  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) return null;
  if (cachedContract) return cachedContract;
  cachedProvider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, cachedProvider);
  cachedContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  return cachedContract;
}

/** Convert an arbitrary string id (e.g. cuid) into a bytes32 by keccak256. */
export function dealIdToBytes32(dealId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(dealId));
}

function normalizeDocHash(documentHash?: string | null): string {
  if (!documentHash) return ethers.ZeroHash;
  const hex = documentHash.startsWith("0x") ? documentHash : `0x${documentHash}`;
  // SHA-256 fits in 32 bytes — pad if shorter, error if longer.
  return ethers.zeroPadValue(hex, 32);
}

export interface RecordResult {
  txHash: string;
  pending: boolean;
}

/**
 * Record a deal event on-chain. Never throws — falls back to pending on failure.
 */
export async function recordDealEvent(
  dealId: string,
  eventType: string,
  documentHash?: string | null
): Promise<RecordResult> {
  const contract = getContract();
  if (!contract) {
    return { txHash: PENDING_TX, pending: true };
  }
  try {
    const tx = await (contract as any).recordEvent(
      dealIdToBytes32(dealId),
      eventType,
      normalizeDocHash(documentHash)
    );
    // Don't await receipt — fire & forget keeps API latency low.
    // Caller saves tx.hash; receipt confirmation can be checked later.
    return { txHash: tx.hash as string, pending: false };
  } catch (err) {
    // Never block a deal on chain failure. Log non-PII info only.
    console.warn("[blockchain] recordDealEvent failed, marking pending:", (err as Error).message);
    return { txHash: PENDING_TX, pending: true };
  }
}

export interface VerifiedEvent {
  dealId: string;
  eventType: string;
  documentHash: string;
  timestamp: number;
  sender: string;
  blockNumber: number;
}

/** Fetch and decode an AuditEvent by transaction hash. */
export async function verifyEvent(txHash: string): Promise<VerifiedEvent | null> {
  if (!txHash || txHash === PENDING_TX) return null;
  const contract = getContract();
  if (!contract || !cachedProvider) return null;

  const receipt = await cachedProvider.getTransactionReceipt(txHash);
  if (!receipt) return null;

  const iface = new ethers.Interface(ABI);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === "AuditEvent") {
        return {
          dealId: parsed.args.dealId,
          eventType: parsed.args.eventType,
          documentHash: parsed.args.documentHash,
          timestamp: Number(parsed.args.timestamp),
          sender: parsed.args.sender,
          blockNumber: receipt.blockNumber,
        };
      }
    } catch {
      // not our event
    }
  }
  return null;
}

/** URL to view a tx on the block explorer. */
export function explorerTxUrl(txHash: string): string | null {
  if (!txHash || txHash === PENDING_TX) return null;
  return `${EXPLORER}/tx/${txHash}`;
}

/**
 * Query all audit events for a deal directly from chain logs.
 * Note: production code should also keep its own DB index — this is a verification path.
 */
export async function getAuditTrail(dealId: string): Promise<VerifiedEvent[]> {
  const contract = getContract();
  if (!contract || !cachedProvider) return [];
  const filter = (contract as any).filters.AuditEvent(dealIdToBytes32(dealId));
  const logs = await (contract as any).queryFilter(filter, 0, "latest");
  return logs.map((l: any) => ({
    dealId: l.args.dealId,
    eventType: l.args.eventType,
    documentHash: l.args.documentHash,
    timestamp: Number(l.args.timestamp),
    sender: l.args.sender,
    blockNumber: l.blockNumber,
  }));
}
