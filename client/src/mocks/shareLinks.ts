import type { ShareLink } from "@/features/verification/types";

export const mockShareLinks: ShareLink[] = [
  {
    id: "link_001",
    token: "abc-123-def-456",
    documentId: "doc_001",
    documentTitle: "Experience letter — Google",
    recipientLabel: "Reevv recruiting team",
    createdAt: "2026-04-25T10:30:00Z",
    expiresAt: "2026-07-25T10:30:00Z",
    maxViews: 10,
    views: 4,
    status: "active",
    cents: 200,
    type: "one_time",
  },
  {
    id: "link_002",
    token: "ghi-789-jkl-012",
    documentId: "doc_003",
    documentTitle: "Letter of recommendation — Google",
    recipientLabel: "Stripe (Senior SWE role)",
    createdAt: "2026-05-01T15:12:00Z",
    expiresAt: "2026-08-01T15:12:00Z",
    views: 12,
    status: "active",
    cents: 0,
    type: "premium",
  },
  {
    id: "link_003",
    token: "mno-345-pqr-678",
    documentId: "doc_002",
    documentTitle: "Salary proof — Google",
    recipientLabel: "Mortgage application — Wells Fargo",
    createdAt: "2026-04-30T09:00:00Z",
    expiresAt: "2026-05-07T09:00:00Z",
    maxViews: 3,
    views: 3,
    status: "expired",
    cents: 200,
    type: "one_time",
  },
  {
    id: "link_004",
    token: "stu-901-vwx-234",
    documentId: "doc_001",
    documentTitle: "Experience letter — Google",
    recipientLabel: "Linkedin recruiter — Anthropic",
    createdAt: "2026-05-05T14:45:00Z",
    expiresAt: "2026-08-05T14:45:00Z",
    views: 1,
    status: "active",
    cents: 0,
    type: "premium",
  },
  {
    id: "link_005",
    token: "yza-567-bcd-890",
    documentId: "doc_007",
    documentTitle: "Experience letter — TCS",
    createdAt: "2025-08-15T12:00:00Z",
    views: 23,
    status: "revoked",
    cents: 200,
    type: "one_time",
  },
  {
    id: "link_006",
    token: "efg-345-hij-678",
    documentId: "doc_009",
    documentTitle: "Experience letter — Google",
    recipientLabel: "Vercel hiring",
    createdAt: "2026-05-06T11:00:00Z",
    expiresAt: "2026-08-06T11:00:00Z",
    views: 0,
    status: "active",
    cents: 200,
    type: "one_time",
  },
];

export const findShareLinkByToken = (token: string) =>
  mockShareLinks.find((l) => l.token === token);

export const linksByDocument = (documentId: string) =>
  mockShareLinks.filter((l) => l.documentId === documentId);

export const linksByHolder = (holderId: string, allDocs: { id: string; holderId: string }[]) => {
  const docIds = new Set(allDocs.filter((d) => d.holderId === holderId).map((d) => d.id));
  return mockShareLinks.filter((l) => docIds.has(l.documentId));
};
