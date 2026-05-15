import { CalendarX, Check, Clock, FileText, ShieldCheck, XCircle, type LucideIcon } from "lucide-react";
import { STATUS_LABEL, STATUS_HELP } from "@/lib/labels";
import type { DocStatus } from "@/features/documents/types";
import { cn } from "@/lib/cn";

const ICON: Record<DocStatus, LucideIcon> = {
  draft: FileText,
  pending_hr: Clock,
  issued: Check,
  anchored: ShieldCheck,
  revoked: XCircle,
  expired: CalendarX,
};

const TONE: Record<DocStatus, string> = {
  draft: "bg-surface-2 text-text-muted border-border",
  pending_hr: "bg-pending-soft text-pending border-pending/30",
  issued: "bg-verified-soft text-verified border-verified/30",
  anchored: "bg-verified-soft text-verified border-verified/30",
  revoked: "bg-revoked-soft text-revoked border-revoked/30",
  expired: "bg-expired-soft text-expired border-expired/30",
};

const FLOW: DocStatus[] = ["draft", "pending_hr", "issued", "anchored"];

interface Props {
  highlight?: DocStatus[];
  compact?: boolean;
  className?: string;
}

export const DocumentLifecycle = ({ highlight, compact = false, className }: Props) => {
  const isLit = (s: DocStatus) => !highlight || highlight.includes(s);

  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          Document lifecycle
        </p>
        <p className="text-[11px] text-text-subtle">
          Hover any badge for the full definition
        </p>
      </div>
      <ol className="flex flex-wrap items-center gap-2">
        {FLOW.map((s, i) => {
          const Icon = ICON[s];
          const lit = isLit(s);
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity",
                  TONE[s],
                  lit ? "opacity-100" : "opacity-40",
                )}
                title={STATUS_HELP[s]}
              >
                <Icon className="size-3.5" />
                {STATUS_LABEL[s]}
              </span>
              {i < FLOW.length - 1 ? (
                <span className="text-text-subtle" aria-hidden>→</span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {!compact ? (
        <p className="mt-3 text-xs text-text-muted">
          <span className="font-medium text-text">Issued</span> means HR approved and the document is
          valid. <span className="font-medium text-text">Anchored</span> means its hash has joined a
          Polygon Merkle batch (added overnight). A document can also be{" "}
          <span className="font-medium text-revoked">Revoked</span> or{" "}
          <span className="font-medium text-expired">Expired</span> at any time after issuance.
        </p>
      ) : null}
    </div>
  );
};
