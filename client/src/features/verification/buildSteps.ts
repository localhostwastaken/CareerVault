import type { CareerDocument } from "@/features/documents/types";
import type { VerificationCheck } from "./types";

export const SIX_STEPS: VerificationCheck[] = [
  { id: "hash",        title: "Content hash",       description: "Re-compute SHA-256 of canonical JSON-LD + salt; compare against stored hash." },
  { id: "manager_sig", title: "Manager signature",  description: "Verify the issuing manager's RSA signature with the org public key." },
  { id: "hr_sig",      title: "HR co-signature",    description: "Verify the HR approver's RSA signature confirming the document was finalised." },
  { id: "merkle_proof", title: "Merkle proof",      description: "Recompute the Merkle root from the document leaf and sibling hashes." },
  { id: "on_chain",    title: "On-chain anchor",    description: "Confirm the Merkle root exists in the AnchorRegistry contract on Polygon." },
  { id: "revocation",  title: "Revocation & expiry", description: "Check both database and on-chain revocation flags; check expiry date." },
];

export interface StepResult {
  id: VerificationCheck["id"];
  state: "passed" | "failed";
  meta?: string;
}

export const evaluateSteps = (doc: CareerDocument): StepResult[] => {
  const isAnchored = doc.status === "anchored";
  const isRevoked = doc.status === "revoked";
  const isExpired = doc.status === "expired";

  return [
    { id: "hash", state: doc.contentHash ? "passed" : "failed", meta: doc.contentHash ? "SHA-256 match" : "missing" },
    { id: "manager_sig", state: doc.managerSignature ? "passed" : "failed", meta: doc.managerSignature ? doc.managerSignature.byName : "missing" },
    { id: "hr_sig", state: doc.hrSignature ? "passed" : "failed", meta: doc.hrSignature ? doc.hrSignature.byName : "missing" },
    { id: "merkle_proof", state: doc.merkleProof ? "passed" : "failed", meta: doc.merkleProof ? `leaf #${doc.merkleProof.leafIndex}` : "n/a" },
    { id: "on_chain", state: isAnchored ? "passed" : "failed", meta: isAnchored ? "Polygon · confirmed" : "not anchored" },
    {
      id: "revocation",
      state: isRevoked || isExpired ? "failed" : "passed",
      meta: isRevoked ? "Revoked" : isExpired ? "Expired" : "Active",
    },
  ];
};
