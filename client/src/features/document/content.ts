// Flattens a document's flat contentJson into labelled display fields.
// Money is stored as integer paise under `*Paise` keys — rendered here as ₹ amounts.
// Server-injected bookkeeping keys (schemaVersion, currency, minorUnit) are noise, hidden.

import { formatDate, formatInr } from '@/lib/format'

export interface ContentField {
  label: string
  value: string
}

const HIDDEN_KEYS = new Set(['schemaVersion', 'currency', 'minorUnit'])
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ACRONYMS: Record<string, string> = {
  Ctc: 'CTC',
  Hra: 'HRA',
  Pf: 'PF',
  Tds: 'TDS',
  Lta: 'LTA',
  Esi: 'ESI',
  Pan: 'PAN',
  Uan: 'UAN',
  Id: 'ID',
}

function humanizeLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
    .split(' ')
    .map((word) => ACRONYMS[word] ?? word)
    .join(' ')
}

// SCREAMING_SNAKE enum values → readable text (FIXED_TERM_CONTRACT → "Fixed term contract").
function humanizeValue(value: string): string {
  if (/^[A-Z][A-Z_]+$/.test(value)) {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
  }
  return value
}

function formatField(key: string, value: unknown): ContentField | null {
  if (key.endsWith('Paise') && typeof value === 'number') {
    return { label: humanizeLabel(key.slice(0, -'Paise'.length)), value: formatInr(value) }
  }
  if (value == null || typeof value === 'object') return null
  if (typeof value === 'boolean') return { label: humanizeLabel(key), value: value ? 'Yes' : 'No' }
  const str = String(value)
  const display = ISO_DATE_RE.test(str) ? formatDate(str) : humanizeValue(str)
  return { label: humanizeLabel(key), value: display }
}

export function extractContentFields(contentJson: Record<string, unknown> | null | undefined): ContentField[] {
  if (!contentJson || typeof contentJson !== 'object') return []
  // Accept a legacy credentialSubject wrapper; the current server stores a flat subject.
  const subject = contentJson.credentialSubject
  const source = subject && typeof subject === 'object' ? (subject as Record<string, unknown>) : contentJson
  const fields: ContentField[] = []
  for (const [key, value] of Object.entries(source)) {
    if (HIDDEN_KEYS.has(key)) continue
    const field = formatField(key, value)
    if (field) fields.push(field)
  }
  return fields
}
