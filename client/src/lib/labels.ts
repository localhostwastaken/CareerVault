/**
 * Canonical vocabulary — the SINGLE source of truth for user-facing labels.
 *
 * Rules:
 * - Status names are fixed: Draft, Pending HR, Issued, Anchored, Revoked, Expired.
 * - "Anchored" (not "Verified" or "On-chain") = the blockchain-anchored state.
 * - "Share link" (not "shareable link" or "verified link") = the public URL.
 * - "Recent anchors" (not "Anchor activity") = the listing of past anchors.
 * - Role names: Holder, Manager, HR, Org Admin, Recruiter.
 *
 * Document type labels live in `@/features/documents/types` (DOCUMENT_TYPE_LABEL)
 * to keep domain constants near domain types.
 */

import type { DocStatus } from "@/features/documents/types";

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  pending_hr: "Pending HR",
  issued: "Issued",
  anchored: "Anchored",
  revoked: "Revoked",
  expired: "Expired",
};

export const STATUS_HELP: Record<DocStatus, string> = {
  draft: "Manager is filling in the content.",
  pending_hr: "Manager signed. Awaiting HR approval.",
  issued: "HR approved. Joins tonight's anchor batch.",
  anchored: "Anchored on Polygon. Fully verifiable.",
  revoked: "Withdrawn by the issuing organisation.",
  expired: "Auto-expired after 90 days.",
};

export const COPY = {
  generateShareLink: "Generate share link",
  shareLink: "Share link",
  shareLinks: "Share links",
  anchoredOnChain: "Anchored on Polygon",
  onChain: "On-chain",
  recentAnchors: "Recent anchors",
  sixStepVerification: "Six-step verification",
  careerWallet: "Career wallet",
  myDocuments: "My documents",
  pendingHR: "Pending HR",
  approvedToday: "Approved today",
  rejectedThisWeek: "Rejected this week",
} as const;
