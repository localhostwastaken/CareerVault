import { Anchor, CalendarX, Check, Clock, FileText, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type DocStatus = "draft" | "pending_hr" | "issued" | "anchored" | "revoked" | "expired";

const config: Record<DocStatus, { label: string; tone: "neutral" | "pending" | "verified" | "revoked" | "expired" | "anchor"; icon: React.ReactNode }> = {
  draft:      { label: "Draft",        tone: "neutral",  icon: <FileText /> },
  pending_hr: { label: "Pending HR",   tone: "pending",  icon: <Clock /> },
  issued:     { label: "Issued",       tone: "verified", icon: <Check /> },
  anchored:   { label: "Anchored",     tone: "verified", icon: <ShieldCheck /> },
  revoked:    { label: "Revoked",      tone: "revoked",  icon: <XCircle /> },
  expired:    { label: "Expired",      tone: "expired",  icon: <CalendarX /> },
};

interface Props {
  status: DocStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: Props) => {
  const c = config[status];
  return (
    <Badge tone={c.tone} className={className}>
      {c.icon}
      {c.label}
    </Badge>
  );
};

export const AnchorBadge = ({ className }: { className?: string }) => (
  <Badge tone="anchor" className={className}>
    <Anchor />
    On-chain
  </Badge>
);
