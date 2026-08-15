import { useEffect } from 'react'

const SUFFIX = 'CareerVault'

/**
 * Sets the browser tab title for a screen. Every route previously shared the single
 * static title from index.html, so open tabs and history entries were indistinguishable.
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX
    return () => {
      document.title = previous
    }
  }, [title])
}
