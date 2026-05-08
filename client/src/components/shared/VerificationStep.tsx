import { Check, X, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type VerificationState = "idle" | "running" | "passed" | "failed";

interface Props {
  index: number;
  title: string;
  description: string;
  state: VerificationState;
  icon?: LucideIcon;
  meta?: string;
}

export const VerificationStep = ({ index, title, description, state, icon: Icon, meta }: Props) => {
  const stateStyles: Record<VerificationState, string> = {
    idle: "border-border bg-surface-2 text-text-subtle",
    running: "border-pending bg-pending-soft text-pending animate-pulse",
    passed: "border-verified bg-verified-soft text-verified",
    failed: "border-revoked bg-revoked-soft text-revoked",
  };

  return (
    <li className="flex gap-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
          stateStyles[state],
        )}
        aria-label={`Step ${index} ${state}`}
      >
        {state === "passed" && <Check className="size-5" strokeWidth={3} />}
        {state === "failed" && <X className="size-5" strokeWidth={3} />}
        {state === "running" && <Loader2 className="size-5 animate-spin" />}
        {state === "idle" && Icon ? <Icon className="size-5" /> : null}
        {state === "idle" && !Icon ? <span className="text-sm font-semibold">{index}</span> : null}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text">{title}</h4>
          {meta ? <span className="font-mono text-xs text-text-subtle tnum">{meta}</span> : null}
        </div>
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      </div>
    </li>
  );
};
