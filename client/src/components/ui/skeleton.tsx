import { cn } from '@/lib/utils'

// Skeletons, not spinners: they hold the eventual layout so nothing reflows when
// data lands. Marked aria-hidden — QueryBoundary announces loading via aria-busy.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-surface-2', className)} {...props} />
}

export { Skeleton }
