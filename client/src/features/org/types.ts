export type OrgVerificationState = "verified" | "pending_dns" | "unverified";

export interface Organization {
  id: string;
  name: string;
  domain: string;
  logoBg: string;
  initials: string;
  verificationState: OrgVerificationState;
  dnsToken?: string;
  verifiedAt?: string;
  trustScore: number;
  documentsIssued: number;
  subscriptionTier: "free" | "starter" | "enterprise";
  city?: string;
  industry?: string;
}

export type MemberRole = "admin" | "manager" | "hr";

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  active: boolean;
  invitedAt: string;
  lastActive?: string;
}
