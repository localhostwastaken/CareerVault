import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface ListFilters {
  /** Free-text query, matched by each list against its own fields. */
  search: string
  /** Active status key, or '' for all. */
  status: string
  /** Sort key, list-specific. Defaults to the caller's `defaultSort`. */
  sort: string
}

interface UseListFiltersResult extends ListFilters {
  setSearch: (value: string) => void
  setStatus: (value: string) => void
  setSort: (value: string) => void
  /** Read an extra URL param (e.g. `page`, `tier`) — reactive, unlike window.location. */
  param: (key: string, fallback?: string) => string
  /** Write an extra URL param. Pass the fallback to drop it when it holds the default. */
  setParam: (key: string, value: string, fallback?: string) => void
  clear: () => void
  isFiltered: boolean
}

/**
 * List state lives in the URL, not component state, so a filtered view can be
 * bookmarked, shared and restored by the back button.
 *
 * Params are omitted when they hold their default, keeping clean URLs for the
 * common case.
 */
export function useListFilters(defaultSort = 'newest'): UseListFiltersResult {
  const [params, setParams] = useSearchParams()

  const search = params.get('q') ?? ''
  const status = params.get('status') ?? ''
  const sort = params.get('sort') ?? defaultSort

  const set = useCallback(
    (key: string, value: string, fallback = '') => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!value || value === fallback) next.delete(key)
          else next.set(key, value)
          return next
        },
        // Typing in a filter should not stack history entries the user must click back through.
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const key of ['q', 'status', 'sort']) next.delete(key)
      return next
    }, { replace: true })
  }, [setParams])

  return useMemo(
    () => ({
      search,
      status,
      sort,
      setSearch: (value: string) => set('q', value),
      setStatus: (value: string) => set('status', value),
      setSort: (value: string) => set('sort', value, defaultSort),
      param: (key: string, fallback = '') => params.get(key) ?? fallback,
      setParam: (key: string, value: string, fallback = '') => set(key, value, fallback),
      clear,
      isFiltered: Boolean(search || status) || sort !== defaultSort,
    }),
    [search, status, sort, set, clear, defaultSort, params],
  )
}
