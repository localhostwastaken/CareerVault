import { ShieldCheck } from 'lucide-react'

const LoadingScreen = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-raised">
        <ShieldCheck className="size-7" />
      </div>
      <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  </div>
)

export default LoadingScreen
