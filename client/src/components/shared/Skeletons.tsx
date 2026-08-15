import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Shape-matched placeholders. Each mirrors the real component's geometry so the
// page does not jump when data arrives.

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </Card>
      ))}
    </div>
  )
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-12" />
        </Card>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-4 border-b border-rule-strong bg-surface-2/60 px-3 py-2.5">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-border px-3 py-3.5">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Card className="flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex flex-col gap-3 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-28" />
        </Card>
      ))}
    </div>
  )
}
