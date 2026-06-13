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

    address public owner;
    uint256 public anchorCount;
    uint256 public revokedCount;

    event RootAnchored(bytes32 indexed rootHash, uint256 documentCount, uint256 anchoredAt, address indexed anchoredBy);
    event DocumentRevoked(bytes32 indexed documentHash, uint256 revokedAt, address indexed revokedBy);
    event AnchorAuthorization(address indexed account, bool authorized);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedAnchors[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedAnchors[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AnchorAuthorization(msg.sender, true);
    }

    // ── Anchoring ──────────────────────────────────────────────────────────────

    function anchorRoot(bytes32 rootHash, uint256 documentCount) public onlyAuthorized {
        require(rootHash != bytes32(0), "Zero root");
        require(!anchors[rootHash].exists, "Root exists");
        anchors[rootHash] = AnchorRecord(rootHash, documentCount, block.timestamp, msg.sender, true);
        anchorCount += 1;
        emit RootAnchored(rootHash, documentCount, block.timestamp, msg.sender);
    }

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

    function revokeDocument(bytes32 documentHash) public onlyAuthorized {
        require(documentHash != bytes32(0), "Zero hash");
        if (revokedDocuments[documentHash] == 0) {
            revokedDocuments[documentHash] = block.timestamp;
            revokedCount += 1;
            emit DocumentRevoked(documentHash, block.timestamp, msg.sender);
        }
    }

    function batchRevokeDocuments(bytes32[] calldata documentHashes) external onlyAuthorized {
        for (uint256 i = 0; i < documentHashes.length; i++) {
            revokeDocument(documentHashes[i]);
        }
    }

    // ── Views ──────────────────────────────────────────────────────────────────

    function verifyRoot(bytes32 rootHash) external view returns (bool exists, AnchorRecord memory record) {
        record = anchors[rootHash];
        exists = record.exists;
    }

    function isRevoked(bytes32 documentHash) external view returns (bool revoked, uint256 revokedAt) {
        revokedAt = revokedDocuments[documentHash];
        revoked = revokedAt != 0;
    }

    function getAnchorCount() external view returns (uint256) {
        return anchorCount;
    }

    function getRevokedCount() external view returns (uint256) {
        return revokedCount;
    }

    // ── Access control ───────────────────────────────────────────────────────────

    function addAuthorizedAnchor(address account) external onlyOwner {
        authorizedAnchors[account] = true;
        emit AnchorAuthorization(account, true);
    }

    function removeAuthorizedAnchor(address account) external onlyOwner {
        authorizedAnchors[account] = false;
        emit AnchorAuthorization(account, false);
    }

    function isAuthorizedAnchor(address account) external view returns (bool) {
        return authorizedAnchors[account];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
