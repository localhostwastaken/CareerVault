import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className }: Props) => (
  <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center", className)}>
    {Icon ? (
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon className="size-6" strokeWidth={2} />
      </div>
    ) : null}
    <h3 className="text-base font-semibold text-text">{title}</h3>
    {description ? <p className="mt-1 max-w-md text-sm text-text-muted">{description}</p> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
