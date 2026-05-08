import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "verified" | "pending" | "revoked";
  className?: string;
}

const toneClasses: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-primary-soft text-primary",
  verified: "bg-verified-soft text-verified",
  pending: "bg-pending-soft text-pending",
  revoked: "bg-revoked-soft text-revoked",
};

export const StatCard = ({ label, value, hint, icon: Icon, tone = "neutral", className }: Props) => (
  <div className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-text tnum">{value}</p>
        {hint ? <p className="mt-1 text-xs text-text-subtle">{hint}</p> : null}
      </div>
      {Icon ? (
        <div className={cn("flex size-9 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="size-4" strokeWidth={2.25} />
        </div>
      ) : null}
    </div>
  </div>
);
