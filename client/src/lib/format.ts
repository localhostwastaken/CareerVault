// Shared formatting — the single source for dates/times/amounts/hashes.
// All date/time output uses the viewer's LOCAL timezone (Intl default).

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const relativeFmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

type DateInput = string | number | Date | null | undefined

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value: DateInput, fallback = '—'): string {
  const d = toDate(value)
  return d ? dateFmt.format(d) : fallback
}

export function formatDateTime(value: DateInput, fallback = '—'): string {
  const d = toDate(value)
  return d ? dateTimeFmt.format(d) : fallback
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000_000],
  ['month', 2_592_000_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1_000],
]

export function formatRelativeTime(value: DateInput, fallback = '—'): string {
  const d = toDate(value)
  if (!d) return fallback
  const diff = d.getTime() - Date.now()
  for (const [unit, ms] of RELATIVE_STEPS) {
    if (Math.abs(diff) >= ms || unit === 'second') {
      return relativeFmt.format(Math.round(diff / ms), unit)
    }
  }
  return fallback
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined).format(value)
}

/** Shorten a hash/token for display: `0xabc123…def456`. Pair with the `tnum` class. */
export function truncateHash(hash: string | null | undefined, lead = 6, tail = 6): string {
  if (!hash) return '—'
  if (hash.length <= lead + tail + 1) return hash
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`
}
