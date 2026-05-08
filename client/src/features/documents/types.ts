import type { DocStatus } from "@/components/shared/StatusBadge";

export type { DocStatus };

export type DocumentType = "experience" | "salary_proof" | "recommendation";

export interface DocumentSignature {
  byUserId: string;
  byName: string;
  byTitle: string;
  signedAt: string;
}

export interface DocumentContent {
  role: string;
  startDate: string;
  endDate?: string;
  body: string;
  rating?: "Excellent" | "Above Average" | "Average";
  salary?: { amount: number; currency: "USD" | "INR"; period: "year" | "month" };
}

export interface MerkleProof {
  leafIndex: number;
  path: string[];
  rootId: string;
}

export interface CareerDocument {
  id: string;
  type: DocumentType;
  status: DocStatus;
  holderId: string;
  holderName: string;
  holderEmail: string;
  orgId: string;
  signerId?: string;
  approverId?: string;
  managerSignature?: DocumentSignature;
  hrSignature?: DocumentSignature;
  content: DocumentContent;
  contentHash: string;
  salt: string;
  skills: string[];
  issuedAt?: string;
  anchoredAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  merkleProof?: MerkleProof;
  pdfUrl?: string;
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  experience: "Experience letter",
  salary_proof: "Salary proof",
  recommendation: "Letter of recommendation",
};
