import { Copy } from "lucide-react";
import { useState } from "react";
import { shortHash } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Props {
  hash: string;
  prefix?: string;
  className?: string;
}

export const HashChip = ({ hash, prefix = "0x", className }: Props) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };
  const display = hash.startsWith(prefix) ? hash : `${prefix}${hash}`;
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : `Copy hash ${display}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted tnum",
        "hover:bg-border hover:text-text transition-colors",
        className,
      )}
    >
      <span>{shortHash(display, 8, 6)}</span>
      <Copy className="size-3" />
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
};
