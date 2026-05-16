import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ExplainCandidateResponse } from "../../../../../server/src/contracts/explainability";

interface Props {
  explanation?: ExplainCandidateResponse;
  isLoading?: boolean;
  isError?: boolean;
}

export const ExplainableAiPanel = ({ explanation, isLoading, isError }: Props) => {
  return (
    <Card className="border-border/70 bg-surface-2/60 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Explainable AI</p>
            <p className="text-sm font-medium text-text-muted">
              Groq narrative layered on top of deterministic scoring
            </p>
          </div>
          <Badge tone={explanation?.source === "groq" ? "verified" : "neutral"}>
            {explanation?.source === "groq" ? `Groq · ${explanation.model}` : "Local fallback"}
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-text-muted">Generating explanation…</p>
        ) : null}

        {isError ? (
          <p className="text-sm text-revoked">Explanation request failed. Showing the deterministic fallback above.</p>
        ) : null}

        {explanation ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-text">{explanation.summary}</p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subtle">Strengths</p>
                <ul className="space-y-1.5 text-sm text-text-muted">
                  {explanation.strengths.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subtle">Concerns</p>
                <ul className="space-y-1.5 text-sm text-text-muted">
                  {explanation.concerns.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subtle">Recommendation</p>
              <p className="text-sm text-text-muted">{explanation.recommendation}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Evidence</p>
              <div className="space-y-2">
                {explanation.evidence.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-surface px-3 py-2">
                    <p className="text-xs font-semibold text-text">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};