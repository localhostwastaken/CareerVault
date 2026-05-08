import * as React from "react";
import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm",
        "placeholder:text-text-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-revoked aria-[invalid=true]:focus-visible:ring-revoked",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
