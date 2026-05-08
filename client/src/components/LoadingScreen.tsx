import { ShieldCheck } from "lucide-react";

const LoadingScreen = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-bg)">
    <div className="flex flex-col items-center gap-4">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary shadow-md">
        <ShieldCheck className="size-7 text-white" strokeWidth={2.25} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
        <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "120ms" }} />
        <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "240ms" }} />
      </div>
      <p className="text-sm text-text-muted">Loading CareerVault…</p>
    </div>
  </div>
);

export default LoadingScreen;
