import type { Organization, OrgMember } from "@/features/org/types";

export const mockOrgs: Organization[] = [
  {
    id: "org_google",
    name: "Google LLC",
    domain: "google.com",
    logoBg: "#1E3A8A",
    initials: "GO",
    verificationState: "verified",
    dnsToken: "cv-verify-9f8a2bc1",
    verifiedAt: "2025-11-04T09:23:00Z",
    trustScore: 98,
    documentsIssued: 412,
    subscriptionTier: "enterprise",
    city: "Mountain View, CA",
    industry: "Technology",
  },
  {
    id: "org_tcs",
    name: "Tata Consultancy Services",
    domain: "tcs.com",
    logoBg: "#0F766E",
    initials: "TC",
    verificationState: "verified",
    dnsToken: "cv-verify-2d8e7c4a",
    verifiedAt: "2025-09-12T14:01:00Z",
    trustScore: 92,
    documentsIssued: 1280,
    subscriptionTier: "enterprise",
    city: "Mumbai, IN",
    industry: "Consulting",
  },
  {
    id: "org_acme",
    name: "Acme Corp",
    domain: "acme.io",
    logoBg: "#B45309",
    initials: "AC",
    verificationState: "pending_dns",
    dnsToken: "cv-verify-7b1e9aa3",
    trustScore: 0,
    documentsIssued: 0,
    subscriptionTier: "starter",
    city: "Austin, TX",
    industry: "SaaS",
  },
];

export const findOrg = (id: string) => mockOrgs.find((o) => o.id === id);

export const mockMembers: OrgMember[] = [
  { id: "m_1", orgId: "org_google", userId: "u_james", name: "James Walsh", email: "james.walsh@google.com", role: "admin", active: true, invitedAt: "2025-09-01T10:00:00Z", lastActive: "2026-05-08T08:12:00Z" },
  { id: "m_2", orgId: "org_google", userId: "u_linda", name: "Linda Rao", email: "linda.rao@google.com", role: "hr", active: true, invitedAt: "2025-09-02T10:00:00Z", lastActive: "2026-05-08T07:55:00Z" },
  { id: "m_3", orgId: "org_google", userId: "u_mark", name: "Mark Johnson", email: "mark.johnson@google.com", role: "manager", active: true, invitedAt: "2025-09-03T10:00:00Z", lastActive: "2026-05-07T18:30:00Z" },
  { id: "m_4", orgId: "org_google", userId: "u_diane", name: "Diane Wu", email: "diane.wu@google.com", role: "manager", active: true, invitedAt: "2025-10-15T10:00:00Z", lastActive: "2026-05-07T11:22:00Z" },
  { id: "m_5", orgId: "org_google", userId: "u_carlos", name: "Carlos Mendes", email: "carlos.mendes@google.com", role: "hr", active: false, invitedAt: "2025-11-01T10:00:00Z" },
  { id: "m_6", orgId: "org_google", userId: "u_robert", name: "Robert Quinn", email: "robert.quinn@google.com", role: "manager", active: true, invitedAt: "2025-12-05T10:00:00Z", lastActive: "2026-05-06T14:00:00Z" },
];
