import { useState } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sleep } from "@/lib/sleep";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  onPaid: (type: "premium" | "one_time") => void;
}

export const PaywallDialog = ({ open, onOpenChange, documentTitle, onPaid }: Props) => {
  const [choice, setChoice] = useState<"premium" | "one_time">("premium");
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    setPaying(true);
    await sleep(900);
    setPaying(false);
    onPaid(choice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate a verified share link</DialogTitle>
          <DialogDescription>
            Choose how you'd like to share <span className="font-medium text-text">{documentTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setChoice("premium")}
            className={`relative flex flex-col rounded-xl border-2 p-4 text-left transition-colors ${
              choice === "premium" ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-anchor-soft px-2 py-0.5 text-[10px] font-semibold text-anchor">
              <Sparkles className="size-3" /> Best value
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Premium</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-text">$5<span className="text-sm font-medium text-text-muted">/mo</span></p>
            <ul className="mt-3 space-y-1 text-xs text-text-muted">
              <li className="flex items-center gap-1.5"><Check className="size-3 text-verified" /> Unlimited share links</li>
              <li className="flex items-center gap-1.5"><Check className="size-3 text-verified" /> Custom expiry & view caps</li>
              <li className="flex items-center gap-1.5"><Check className="size-3 text-verified" /> Recipient analytics</li>
            </ul>
          </button>

          <button
            type="button"
            onClick={() => setChoice("one_time")}
            className={`flex flex-col rounded-xl border-2 p-4 text-left transition-colors ${
              choice === "one_time" ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">One-time</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-text">$2<span className="text-sm font-medium text-text-muted"> / link</span></p>
            <ul className="mt-3 space-y-1 text-xs text-text-muted">
              <li className="flex items-center gap-1.5"><Check className="size-3 text-verified" /> One link, 90-day expiry</li>
              <li className="flex items-center gap-1.5"><Check className="size-3 text-verified" /> Pay once, no commitment</li>
            </ul>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePay} isLoading={paying}>
            <CreditCard />
            Pay & generate link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
