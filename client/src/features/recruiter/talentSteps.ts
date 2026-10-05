import type { ExplainerStep } from '@/components/shared/Explainer'

// The ai-service pipeline (documentation/ai-and-xai.md): retrieval by embedding
// similarity, LightGBM scoring, TreeSHAP attribution. No LLM writes the explanation.
export const TALENT_STEPS: ExplainerStep[] = [
  {
    title: 'Only consenting holders',
    body: 'Skills are extracted only from documents whose holders opted in to discovery. The source is verified credentials, not self-written CVs.',
  },
  {
    title: 'Retrieve by meaning',
    body: 'The role and each profile are 384-dimension embeddings. pgvector finds the nearest profiles inside PostgreSQL.',
  },
  {
    title: 'Score with LightGBM',
    body: 'A gradient-boosted model scores each candidate on engineered features: profile similarity, skill overlap, seniority and experience fit, recency.',
  },
  {
    title: 'Explain with TreeSHAP',
    body: 'Each feature’s exact contribution is computed from the model’s trees. The baseline plus the contributions adds up to the match score, and the same input always gives the same explanation.',
  },
]
