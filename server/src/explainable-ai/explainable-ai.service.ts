import { Injectable } from '@nestjs/common';
import type { ExplainCandidateRequest, ExplainCandidateResponse } from '../contracts/explainability';

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class ExplainableAiService {
  async explainCandidate(request: ExplainCandidateRequest): Promise<ExplainCandidateResponse> {
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return this.buildFallbackResponse(request, model);
    }

    const prompt = this.buildPrompt(request);
    const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 4500);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 450,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are an explainable AI assistant for recruiter ranking. Return only valid JSON with summary, strengths, concerns, recommendation, and evidence fields. Do not mention protected attributes or demographic inference.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return this.buildFallbackResponse(request, model);
      }

      const payload = (await response.json()) as GroqChatResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return this.buildFallbackResponse(request, model);
      }

      const parsed = this.parseJsonResponse(content);
      if (!parsed) {
        return this.buildFallbackResponse(request, model);
      }

      return {
        source: 'groq',
        model,
        summary: parsed.summary || this.defaultSummary(request),
        strengths: this.ensureStringArray(parsed.strengths, this.deriveStrengths(request)),
        concerns: this.ensureStringArray(parsed.concerns, this.deriveConcerns(request)),
        recommendation: parsed.recommendation || this.defaultRecommendation(request),
        evidence: this.ensureEvidenceArray(parsed.evidence, this.deriveEvidence(request)),
      };
    } catch {
      return this.buildFallbackResponse(request, model);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildPrompt(request: ExplainCandidateRequest): string {
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
      'Explain why this candidate received the given recruiter score.',
      'Use only the provided structured data. Keep the output concise and recruiter-friendly.',
      'Return JSON with the exact keys: summary, strengths, concerns, recommendation, evidence.',
      'Each evidence item must be an object with label and detail.',
      `Input: ${JSON.stringify(payload)}`,
    ].join(' ');
  }

  private parseJsonResponse(content: string): Partial<ExplainCandidateResponse> | null {
    const trimmed = content.trim();
    const normalized = trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim() : trimmed;

    try {
      return JSON.parse(normalized) as Partial<ExplainCandidateResponse>;
    } catch {
      return null;
    }
  }

  private buildFallbackResponse(request: ExplainCandidateRequest, model: string): ExplainCandidateResponse {
    return {
      source: 'fallback',
      model,
      summary: this.defaultSummary(request),
      strengths: this.deriveStrengths(request),
      concerns: this.deriveConcerns(request),
      recommendation: this.defaultRecommendation(request),
      evidence: this.deriveEvidence(request),
    };
  }

  private defaultSummary(request: ExplainCandidateRequest): string {
    const { candidate, match } = request;
    const skillCount = match.matchedSkills.length;
    return `${candidate.name} ranks at ${match.totalScore}/100 because ${skillCount} verified skills align with the target profile, with strong trust and recent documentation.`;
  }

  private defaultRecommendation(request: ExplainCandidateRequest): string {
    return request.match.missingSkills.length
      ? `Good fit for the target role. Confirm the gaps in ${request.match.missingSkills.slice(0, 2).join(' and ')} if they are must-have requirements.`
      : 'Strong fit for the target role with no material skill gaps in the current search.';
  }

  private deriveStrengths(request: ExplainCandidateRequest): string[] {
    return [
      `${request.match.matchedSkills.length} verified matching skills`,
      `Trust score ${request.match.trustScore}/100 from anchored issuers`,
      `Document recency score ${request.match.recencyScore}/100`,
    ];
  }

  private deriveConcerns(request: ExplainCandidateRequest): string[] {
    if (!request.match.missingSkills.length) {
      return ['No required skill gaps in the current search'];
    }

    return request.match.missingSkills.slice(0, 3).map((skill) => `Missing verified evidence for ${skill}`);
  }

  private deriveEvidence(request: ExplainCandidateRequest): Array<{ label: string; detail: string }> {
    return [
      {
        label: 'Matched skills',
        detail: request.match.matchedSkills.join(', ') || 'None',
      },
      {
        label: 'Missing skills',
        detail: request.match.missingSkills.join(', ') || 'None',
      },
      {
        label: 'Recency',
        detail: `${request.candidate.recencyDays} days since latest verified document`,
      },
      {
        label: 'Trust',
        detail: `${request.match.trustScore}/100 issuer trust score`,
      },
    ];
  }

  private ensureStringArray(value: unknown, fallback: string[]): string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]) : fallback;
  }

  private ensureEvidenceArray(
    value: unknown,
    fallback: Array<{ label: string; detail: string }>,
  ): Array<{ label: string; detail: string }> {
    if (
      Array.isArray(value) &&
      value.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          typeof (item as { label?: unknown }).label === 'string' &&
          typeof (item as { detail?: unknown }).detail === 'string',
      )
    ) {
      return value as Array<{ label: string; detail: string }>;
    }

    return fallback;
  }
}