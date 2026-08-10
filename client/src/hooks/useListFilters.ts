import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/** A param set to '' or null is removed from the URL. */
export type ParamChanges = Record<string, string | null>

interface UseListFiltersResult {
  search: string
  status: string
  sort: string
  setSearch: (value: string) => void
  setStatus: (value: string) => void
  setSort: (value: string) => void
  /** Read any extra URL param (e.g. `page`, `tier`) — reactive, unlike window.location. */
  param: (key: string, fallback?: string) => string
  /**
   * Apply several param changes in ONE navigation. React Router's setSearchParams
   * closes over the params from the current render, so two calls in the same event
   * handler both read stale values and the last silently wins — dropping the first
   * change. Anything touching more than one param must go through here.
   */
  update: (changes: ParamChanges) => void
  clear: (alsoClear?: string[]) => void
  isFiltered: boolean
}

/**
 * List state lives in the URL, not component state, so a filtered view can be
 * bookmarked, shared and restored by the back button. Params are omitted when they
 * hold their default, keeping clean URLs for the common case.
 */
export function useListFilters(defaultSort = 'newest'): UseListFiltersResult {
  const [params, setParams] = useSearchParams()

  const search = params.get('q') ?? ''
  const status = params.get('status') ?? ''
  const sort = params.get('sort') ?? defaultSort

  const update = useCallback(
    (changes: ParamChanges) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        // Typing in a filter should not stack history entries to click back through.
        { replace: true },
      )
    },
    [setParams],
  )

  return useMemo(
    () => ({
      search,
      status,
      sort,
      setSearch: (value: string) => update({ q: value }),
      setStatus: (value: string) => update({ status: value }),
      setSort: (value: string) => update({ sort: value === defaultSort ? null : value }),
      param: (key: string, fallback = '') => params.get(key) ?? fallback,
      update,
      clear: (alsoClear: string[] = []) =>
        update(Object.fromEntries(['q', 'status', 'sort', ...alsoClear].map((key) => [key, null]))),
      isFiltered: Boolean(search || status) || sort !== defaultSort,
    }),
    [search, status, sort, update, defaultSort, params],
  )
}
