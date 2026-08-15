import type { ReactNode } from 'react'

/** Which heading element to render. Callers pick the level that fits their nesting. */
export type HeadingLevel = 1 | 2 | 3

interface HeadingProps {
  level: HeadingLevel
  className?: string
  children: ReactNode
}

// Shared state components (EmptyState, ErrorState, SuccessPanel) sit at different
// depths depending on the page, so their heading element has to be caller-chosen.
// Hardcoding h3 produced h1→h3 jumps on every page whose whole body was an empty
// state, which breaks heading navigation for screen-reader users.
export function Heading({ level, className, children }: HeadingProps) {
  const Tag = `h${level}` as const
  return <Tag className={className}>{children}</Tag>
}
