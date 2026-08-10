import type { ReactNode } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'
import type { HeadingLevel } from '@/components/shared/Heading'

/** The subset of an RTK Query result this boundary needs. */
export interface QueryLike<T> {
  data?: T
  isLoading: boolean
  isError: boolean
  error?: unknown
  refetch?: () => void
}

interface QueryBoundaryProps<T> {
  query: QueryLike<T>
  /** Shape-matched placeholder — see components/shared/Skeletons.tsx. */
  skeleton: ReactNode
  /** Rendered when the request succeeded but returned nothing. */
  empty?: ReactNode
  /** Defaults to treating an empty array as empty. */
  isEmpty?: (data: T) => boolean
  errorTitle?: string
  /**
   * Heading level for the error state this boundary renders. The `empty` node is the
   * caller's own element and sets its own level; without this the error state was the
   * one heading on the page no call site could correct. 3 under a Section's h2,
   * 1 when the boundary is the whole page (no PageHeader above it).
   */
  headingLevel?: HeadingLevel
  children: (data: T) => ReactNode
}

function defaultIsEmpty<T>(data: T): boolean {
  return Array.isArray(data) && data.length === 0
}

// One place that decides loading vs error vs empty vs content. Before this, 13 of
// 16 data screens ignored isError entirely and rendered their empty state instead,
// so a failed request was indistinguishable from having no data.
export function QueryBoundary<T>({
  query,
  skeleton,
  empty,
  isEmpty = defaultIsEmpty,
  errorTitle,
  headingLevel,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isLoading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading…</span>
        {skeleton}
      </div>
    )
  }

  if (query.isError || query.data === undefined) {
    return <ErrorState title={errorTitle} error={query.error} onRetry={query.refetch} headingLevel={headingLevel} />
  }

  if (empty && isEmpty(query.data)) return <>{empty}</>

  return <>{children(query.data)}</>
}
