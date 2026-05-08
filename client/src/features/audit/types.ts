export type AuditTier = "STANDARD" | "COMPLIANCE";
export type AuditAction =
  | "USER_LOGIN"
  | "DOC_DRAFT"
  | "DOC_MANAGER_SIGN"
  | "DOC_HR_APPROVE"
  | "DOC_HR_REJECT"
  | "DOC_ANCHOR"
  | "DOC_REVOKE"
  | "DOC_EXPIRE"
  | "LINK_GENERATE"
  | "LINK_VIEW"
  | "DNS_VERIFIED"
  | "MEMBER_INVITE"
  | "MEMBER_ROLE_CHANGE"
  | "GDPR_DELETE";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  target: string;
  ip: string;
  tier: AuditTier;
  metadata?: Record<string, string | number>;
}
