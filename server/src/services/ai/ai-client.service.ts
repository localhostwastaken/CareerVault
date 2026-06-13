import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Typed HTTP client for the Python ai-service (skill extraction, embeddings, ranking
// + SHAP). The ai-service is built in Phase 5; until then these throw a clear 503.
export interface ExtractedSkillResult {
  skills: string[];
  jobTitle?: string;
  seniority?: string;
  yearsOfExperience?: number;
  certifications?: string[];
  industries?: string[];
  confidenceScores?: Record<string, number>;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl =
      config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:9910';
  }

  async extractSkills(text: string): Promise<ExtractedSkillResult> {
    // The ai-service speaks snake_case; map it to our camelCase contract here.
    const r = await this.post<{
      skills?: string[];
      job_title?: string | null;
      seniority?: string | null;
      years_of_experience?: number | null;
      certifications?: string[];
      industries?: string[];
      confidence_scores?: Record<string, number>;
    }>('/extract', { text });
    return {
      skills: r.skills ?? [],
      jobTitle: r.job_title ?? undefined,
      seniority: r.seniority ?? undefined,
      yearsOfExperience: r.years_of_experience ?? undefined,
      certifications: r.certifications ?? [],
      industries: r.industries ?? [],
      confidenceScores: r.confidence_scores ?? {},
    };
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.post<{ embedding: number[] }>('/embed', { text });
    return result.embedding;
  }

  rank<T>(payload: unknown): Promise<T> {
    return this.post<T>('/rank', payload);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`ai-service ${path} -> ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      this.logger.error(`ai-service call failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI service is unavailable');
    }
  }
}
