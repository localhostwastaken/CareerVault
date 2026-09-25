// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AnchorRegistry
 * @notice Immutable trust anchor for CareerVault. Stores daily Merkle roots and
 *         per-document revocation flags on Polygon. Only 32-byte roots / hashes are
 *         kept on-chain; all document data stays off-chain (PostgreSQL/S3). (R2)
 * @dev Off-chain DB status remains authoritative for revocation; the on-chain
 *      registry is a tamper-evident audit trail (R7).
 */
contract AnchorRegistry {
    /// @notice A single anchored Merkle root and the metadata recorded alongside it.
    struct AnchorRecord {
        bytes32 rootHash;
        uint256 documentCount;
        uint256 anchoredAt;
        address anchoredBy;
        bool exists;
    }

    mapping(bytes32 => AnchorRecord) private anchors;
    mapping(bytes32 => uint256) private revokedDocuments; // documentHash => revokedAt (0 = not revoked)
    mapping(address => bool) private authorizedAnchors;

    /// @notice The account that can manage authorized anchors and transfer ownership.
    address public owner;
    /// @notice Running count of roots anchored via `anchorRoot`/`batchAnchorRoots`.
    uint256 public anchorCount;
    /// @notice Running count of documents revoked via `revokeDocument`/`batchRevokeDocuments`.
    uint256 public revokedCount;

    /// @notice Emitted when a Merkle root is anchored on-chain.
    /// @param rootHash The anchored Merkle root.
    /// @param documentCount Number of documents covered by this root.
    /// @param anchoredAt Block timestamp the root was anchored at.
    /// @param anchoredBy The authorized anchor that submitted the transaction.
    event RootAnchored(bytes32 indexed rootHash, uint256 documentCount, uint256 anchoredAt, address indexed anchoredBy);
    /// @notice Emitted when a document hash is revoked on-chain.
    /// @param documentHash The revoked document's hash.
    /// @param revokedAt Block timestamp the revocation was recorded at.
    /// @param revokedBy The authorized anchor that submitted the transaction.
    event DocumentRevoked(bytes32 indexed documentHash, uint256 revokedAt, address indexed revokedBy);
    /// @notice Emitted when an account's anchor authorization is granted or revoked.
    /// @param account The account whose authorization changed.
    /// @param authorized True if the account is now authorized to anchor/revoke.
    event AnchorAuthorization(address indexed account, bool authorized);
    /// @notice Emitted when contract ownership is transferred.
    /// @param previousOwner The prior owner.
    /// @param newOwner The new owner.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /// @notice Restricts a function to the contract owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Restricts a function to accounts authorized to anchor and revoke.
    modifier onlyAuthorized() {
        require(authorizedAnchors[msg.sender], "Not authorized");
        _;
    }

    /// @notice Deploys the registry, making the deployer the owner and first authorized anchor.
    constructor() {
        owner = msg.sender;
        authorizedAnchors[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AnchorAuthorization(msg.sender, true);
    }

    // ── Anchoring ──────────────────────────────────────────────────────────────

    /// @notice Anchors a single Merkle root on-chain.
    /// @dev Reverts on a zero root or a root that was already anchored.
    /// @param rootHash The Merkle root to anchor; must be non-zero and not previously anchored.
    /// @param documentCount Number of documents covered by this root, recorded for audit purposes.
    function anchorRoot(bytes32 rootHash, uint256 documentCount) public onlyAuthorized {
        require(rootHash != bytes32(0), "Zero root");
        require(!anchors[rootHash].exists, "Root exists");
        anchors[rootHash] = AnchorRecord(rootHash, documentCount, block.timestamp, msg.sender, true);
        anchorCount += 1;
        emit RootAnchored(rootHash, documentCount, block.timestamp, msg.sender);
    }

    /// @notice Anchors multiple Merkle roots in a single transaction.
    /// @dev Reverts with "Length mismatch" if the arrays differ in length. Each root is
    ///      anchored via `anchorRoot`, so a duplicate anywhere in the batch reverts the whole call.
    /// @param rootHashes The Merkle roots to anchor.
    /// @param documentCounts Document counts, one per root, matched by index.
    function batchAnchorRoots(bytes32[] calldata rootHashes, uint256[] calldata documentCounts)
        external
        onlyAuthorized
    {
        require(rootHashes.length == documentCounts.length, "Length mismatch");
        for (uint256 i = 0; i < rootHashes.length; i++) {
            anchorRoot(rootHashes[i], documentCounts[i]);
        }
    }

    // ── Revocation ─────────────────────────────────────────────────────────────

    /// @notice Revokes a document on-chain. Idempotent: revoking an already-revoked
    ///         document hash is a silent no-op.
    /// @dev The off-chain database remains the authoritative revocation status (R7);
    ///      this is a tamper-evident audit trail.
    /// @param documentHash The document hash to revoke; must be non-zero.
    function revokeDocument(bytes32 documentHash) public onlyAuthorized {
        require(documentHash != bytes32(0), "Zero hash");
        if (revokedDocuments[documentHash] == 0) {
            revokedDocuments[documentHash] = block.timestamp;
            revokedCount += 1;
            emit DocumentRevoked(documentHash, block.timestamp, msg.sender);
        }
    }

    /// @notice Revokes multiple documents in a single transaction.
    /// @param documentHashes The document hashes to revoke.
    function batchRevokeDocuments(bytes32[] calldata documentHashes) external onlyAuthorized {
        for (uint256 i = 0; i < documentHashes.length; i++) {
            revokeDocument(documentHashes[i]);
        }
    }

    // ── Views ──────────────────────────────────────────────────────────────────

    /// @notice Looks up an anchored Merkle root.
    /// @param rootHash The Merkle root to look up.
    /// @return exists True if the root has been anchored.
    /// @return record The stored anchor record; zero-valued if `exists` is false.
    function verifyRoot(bytes32 rootHash) external view returns (bool exists, AnchorRecord memory record) {
        record = anchors[rootHash];
        exists = record.exists;
    }

    /// @notice Looks up a document's revocation status.
    /// @param documentHash The document hash to look up.
    /// @return revoked True if the document has been revoked.
    /// @return revokedAt Block timestamp of the revocation; 0 if not revoked.
    function isRevoked(bytes32 documentHash) external view returns (bool revoked, uint256 revokedAt) {
        revokedAt = revokedDocuments[documentHash];
        revoked = revokedAt != 0;
    }

    /// @notice Returns the total number of roots anchored so far.
    /// @return The anchor count.
    function getAnchorCount() external view returns (uint256) {
        return anchorCount;
    }

    /// @notice Returns the total number of documents revoked so far.
    /// @return The revoked count.
    function getRevokedCount() external view returns (uint256) {
        return revokedCount;
    }

    // ── Access control ───────────────────────────────────────────────────────────

    /// @notice Grants an account permission to anchor roots and revoke documents.
    /// @param account The account to authorize.
    function addAuthorizedAnchor(address account) external onlyOwner {
        authorizedAnchors[account] = true;
        emit AnchorAuthorization(account, true);
    }

    /// @notice Revokes an account's permission to anchor roots and revoke documents.
    /// @param account The account to deauthorize.
    function removeAuthorizedAnchor(address account) external onlyOwner {
        authorizedAnchors[account] = false;
        emit AnchorAuthorization(account, false);
    }

    /// @notice Checks whether an account is authorized to anchor roots and revoke documents.
    /// @param account The account to check.
    /// @return True if the account is authorized.
    function isAuthorizedAnchor(address account) external view returns (bool) {
        return authorizedAnchors[account];
    }

    /// @notice Transfers contract ownership to a new address.
    /// @dev Reverts with "Zero owner" if `newOwner` is the zero address.
    /// @param newOwner The new owner; must be non-zero.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
