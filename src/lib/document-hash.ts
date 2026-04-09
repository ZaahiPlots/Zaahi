import { createHash } from "crypto";

/**
 * SHA-256 hash of a document buffer, returned as 0x-prefixed hex.
 * Used to anchor document integrity on the Polygon audit trail.
 */
export function hashDocument(file: Buffer | Uint8Array): string {
  const hash = createHash("sha256").update(file).digest("hex");
  return `0x${hash}`;
}

/**
 * Verify a document buffer matches a previously recorded hash.
 */
export function verifyDocumentHash(file: Buffer | Uint8Array, expected: string): boolean {
  return hashDocument(file).toLowerCase() === expected.toLowerCase();
}
