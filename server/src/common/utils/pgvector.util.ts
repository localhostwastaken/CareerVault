// pgvector helpers. Prisma models the vector columns as Unsupported(...), so embeddings
// are written/read with raw SQL. A pgvector literal is `[v1,v2,...]` cast to ::vector.

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export function parseVectorLiteral(literal: string | null): number[] {
  if (!literal) return [];
  return literal
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .filter((part) => part.length > 0)
    .map(Number);
}
