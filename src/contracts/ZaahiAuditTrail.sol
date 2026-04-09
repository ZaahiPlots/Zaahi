// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZaahiAuditTrail
 * @notice Write-only immutable audit trail for ZAAHI deal events.
 * @dev No state storage — events only. Cheap calls on Polygon.
 *      Each call costs ~30k gas (~$0.001 on Polygon mainnet).
 *      Verification is done off-chain by reading event logs by txHash.
 */
contract ZaahiAuditTrail {
    event AuditEvent(
        bytes32 indexed dealId,
        string eventType,
        bytes32 documentHash,
        uint256 timestamp,
        address indexed sender
    );

    /**
     * @notice Record an audit event for a deal.
     * @param dealId      Hashed deal identifier (bytes32, e.g. keccak256 of cuid).
     * @param eventType   Human-readable event tag (OFFER_SUBMITTED, MOU_SIGNED, etc.).
     * @param documentHash SHA-256 of the related document, or 0x0 if none.
     */
    function recordEvent(
        bytes32 dealId,
        string calldata eventType,
        bytes32 documentHash
    ) external {
        emit AuditEvent(dealId, eventType, documentHash, block.timestamp, msg.sender);
    }
}
