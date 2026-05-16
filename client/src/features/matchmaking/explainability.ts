import type {
  ExplainCandidateRequest,
  ExplainCandidateResponse,
  ExplainEvidence,
} from "./types";

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 4500;

export async function explainCandidate(
  request: ExplainCandidateRequest,
): Promise<ExplainCandidateResponse> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  const model = (import.meta.env.VITE_GROQ_MODEL as string) || DEFAULT_MODEL;

  if (!apiKey) return buildFallback(request, model);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an explainable AI assistant for recruiter ranking. Return only valid JSON with summary, strengths, concerns, recommendation, and evidence fields. Do not mention protected attributes or demographic inference.",
          },
          { role: "user", content: buildPrompt(request) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return buildFallback(request, model);

    const payload = (await response.json()) as GroqChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return buildFallback(request, model);

    const parsed = parseJsonResponse(content);
    if (!parsed) return buildFallback(request, model);

    return {
      source: "groq",
      model,
      summary: parsed.summary || defaultSummary(request),
      strengths: ensureStringArray(parsed.strengths, deriveStrengths(request)),
      concerns: ensureStringArray(parsed.concerns, deriveConcerns(request)),
      recommendation: parsed.recommendation || defaultRecommendation(request),
      evidence: ensureEvidenceArray(parsed.evidence, deriveEvidence(request)),
    };
  } catch {
    return buildFallback(request, model);
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildPrompt(request: ExplainCandidateRequest): string {
  const payload = {
    candidate: {
      id: request.candidate.id,
      name: request.candidate.name,
      headline: request.candidate.headline,
      city: request.candidate.city,
      yearsOfExperience: request.candidate.yearsOfExperience,
      verifiedSkills: request.candidate.verifiedSkills,
      trustScore: request.candidate.trustScore,
      recencyDays: request.candidate.recencyDays,
    },
    requiredSkills: request.requiredSkills,
    match: request.match,
  };

  return [
    "Explain why this candidate received the given recruiter score.",
    "Use only the provided structured data. Keep the output concise and recruiter-friendly.",
    "Return JSON with the exact keys: summary, strengths, concerns, recommendation, evidence.",
    "Each evidence item must be an object with label and detail.",
    `Input: ${JSON.stringify(payload)}`,
  ].join(" ");
}

function parseJsonResponse(
  content: string,
): Partial<ExplainCandidateResponse> | null {
  const trimmed = content.trim();
  const normalized = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
    : trimmed;

  try {
    return JSON.parse(normalized) as Partial<ExplainCandidateResponse>;
  } catch {
    return null;
  }
}

function buildFallback(
  request: ExplainCandidateRequest,
  model: string,
): ExplainCandidateResponse {
  return {
    source: "fallback",
    model,
    summary: defaultSummary(request),
    strengths: deriveStrengths(request),
    concerns: deriveConcerns(request),
    recommendation: defaultRecommendation(request),
    evidence: deriveEvidence(request),
  };
}

function defaultSummary(request: ExplainCandidateRequest): string {
  const { candidate, match } = request;
  return `${candidate.name} ranks at ${match.totalScore}/100 because ${match.matchedSkills.length} verified skills align with the target profile, with strong trust and recent documentation.`;
}

function defaultRecommendation(request: ExplainCandidateRequest): string {
  return request.match.missingSkills.length
    ? `Good fit for the target role. Confirm the gaps in ${request.match.missingSkills.slice(0, 2).join(" and ")} if they are must-have requirements.`
    : "Strong fit for the target role with no material skill gaps in the current search.";
}

function deriveStrengths(request: ExplainCandidateRequest): string[] {
  return [
    `${request.match.matchedSkills.length} verified matching skills`,
    `Trust score ${request.match.trustScore}/100 from anchored issuers`,
    `Document recency score ${request.match.recencyScore}/100`,
  ];
}

function deriveConcerns(request: ExplainCandidateRequest): string[] {
  if (!request.match.missingSkills.length) {
    return ["No required skill gaps in the current search"];
  }
  return request.match.missingSkills
    .slice(0, 3)
    .map((skill) => `Missing verified evidence for ${skill}`);
}

function deriveEvidence(request: ExplainCandidateRequest): ExplainEvidence[] {
  return [
    {
      label: "Matched skills",
      detail: request.match.matchedSkills.join(", ") || "None",
    },
    {
      label: "Missing skills",
      detail: request.match.missingSkills.join(", ") || "None",
    },
    {
      label: "Recency",
      detail: `${request.candidate.recencyDays} days since latest verified document`,
    },
    {
      label: "Trust",
      detail: `${request.match.trustScore}/100 issuer trust score`,
    },
  ];
}

function ensureStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : fallback;
}

function ensureEvidenceArray(
  value: unknown,
  fallback: ExplainEvidence[],
): ExplainEvidence[] {
  if (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { detail?: unknown }).detail === "string",
    )
  ) {
    return value as ExplainEvidence[];
  }
  return fallback;
}
