import { Anchor, CalendarX, Check, Clock, FileText, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_LABEL, STATUS_HELP, COPY } from "@/lib/labels";
import type { DocStatus } from "@/features/documents/types";

const ICON: Record<DocStatus, React.ReactNode> = {
  draft: <FileText />,
  pending_hr: <Clock />,
  issued: <Check />,
  anchored: <ShieldCheck />,
  revoked: <XCircle />,
  expired: <CalendarX />,
};

const TONE: Record<DocStatus, "neutral" | "pending" | "verified" | "revoked" | "expired"> = {
  draft: "neutral",
  pending_hr: "pending",
  issued: "verified",
  anchored: "verified",
  revoked: "revoked",
  expired: "expired",
};

interface Props {
  status: DocStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: Props) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge tone={TONE[status]} className={className}>
        {ICON[status]}
        {STATUS_LABEL[status]}
      </Badge>
    </TooltipTrigger>
    <TooltipContent>{STATUS_HELP[status]}</TooltipContent>
  </Tooltip>
);

export const AnchorBadge = ({ className }: { className?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge tone="anchor" className={className}>
        <Anchor />
        {COPY.onChain}
      </Badge>
    </TooltipTrigger>
    <TooltipContent>Hash recorded in CareerVault's daily Merkle batch on Polygon.</TooltipContent>
  </Tooltip>
);
