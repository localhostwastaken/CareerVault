// How each of the server's six checks works (verification.service.ts, anchor-check.ts),
// keyed by the check's `key`. Plain sentences, because the evidence panel is read aloud in
// demos and by verifiers who have never heard of JCS.
export const CHECK_EXPLANATIONS: Record<string, string> = {
  exists:
    'Looks the hash up in the register. Only an issued document counts (or one later revoked or expired). The hash of a draft or a returned request never passes.',
  integrity:
    'Decrypts the stored content and salt, puts the content in canonical form (RFC 8785 JCS), appends the salt and recomputes SHA-256. It must equal the document hash, so changing one character anywhere fails this check.',
  issuerSignature:
    'Rebuilds the manager’s statement, SHA-256 of {v:1, documentHash, role: MANAGER, memberId}, and checks its RS256 signature against the issuer public key pinned to this document when it was signed.',
  approverSignature:
    'The same check for HR’s separate statement (role: HR, HR’s membership). It is signed with the same organisation key, but the statement is different, so it is a separate signature.',
  anchor:
    'Folds the document’s Merkle proof up to its batch root, then asks the AnchorRegistry contract on Polygon whether that root exists. Pending means the next batch has not run yet or the chain is unreachable. That does not affect validity.',
  status:
    'Reads revocation and expiry from the register, which has the final say. If the hash is also flagged on-chain, that is noted here.',
}

// The six checks in the order the server runs and returns them.
export const VERIFICATION_CHECKS = [
  { key: 'exists', label: 'Document on record' },
  { key: 'integrity', label: 'Content integrity' },
  { key: 'issuerSignature', label: 'Issuer signature' },
  { key: 'approverSignature', label: 'Approver signature' },
  { key: 'anchor', label: 'Blockchain anchor' },
  { key: 'status', label: 'Revocation status' },
] as const
