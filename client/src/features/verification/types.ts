export interface MerkleRoot {
  id: string;
  date: string;
  rootHash: string;
  polygonTxHash: string;
  ipfsCid: string;
  githubCommit: string;
  documentCount: number;
  blockNumber: number;
  gasUsedWei: string;
}

export type ShareLinkStatus = "active" | "expired" | "revoked";

export interface ShareLink {
  id: string;
  token: string;
  documentId: string;
  documentTitle: string;
  recipientLabel?: string;
  createdAt: string;
  expiresAt?: string;
  maxViews?: number;
  views: number;
  status: ShareLinkStatus;
  cents: number;
  type: "premium" | "one_time";
}

export type CheckId =
  | "hash"
  | "manager_sig"
  | "hr_sig"
  | "merkle_proof"
  | "on_chain"
  | "revocation";

export interface VerificationCheck {
  id: CheckId;
  title: string;
  description: string;
  meta?: string;
}
