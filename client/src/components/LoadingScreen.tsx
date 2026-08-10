import { ShieldCheck } from 'lucide-react'

// Route-level suspense fallback, shown only while a lazy chunk downloads. Data
// loading inside a screen uses shape-matched skeletons instead.
const LoadingScreen = () => (
  <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-seal">
        <ShieldCheck className="size-6" />
      </div>
      <div className="size-5 animate-spin rounded-full border-2 border-border border-t-seal" />
      <span className="sr-only">Loading CareerVault…</span>
    </div>
  </div>
)

export default LoadingScreen
