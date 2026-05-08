import { cn } from "@/lib/cn";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, actions, className }: Props) => (
  <header className={cn("flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </header>
);
