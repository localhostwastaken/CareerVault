// Flattens a document's contentJson into labelled display fields.
// Mirrors the server's PDF renderer: prefer `credentialSubject`, else the root;
// keep only primitive values, humanize the keys.

export interface ContentField {
  label: string
  value: string
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function extractContentFields(contentJson: Record<string, unknown> | null | undefined): ContentField[] {
  if (!contentJson || typeof contentJson !== 'object') return []
  const subject = contentJson.credentialSubject
  const source =
    subject && typeof subject === 'object' ? (subject as Record<string, unknown>) : contentJson
  return Object.entries(source)
    .filter(([, value]) => value != null && typeof value !== 'object')
    .map(([key, value]) => ({ label: humanize(key), value: String(value) }))
}
