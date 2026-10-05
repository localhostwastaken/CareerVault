import type { CheckKind, CheckLine } from './types.ts'

export const checkLine = (
  key: string,
  label: string,
  kind: CheckKind,
  detail: string,
  explain: string[] = [],
): CheckLine => ({ key, label, kind, detail, explain })
