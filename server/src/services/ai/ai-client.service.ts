import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Typed HTTP client for the Python ai-service (skill extraction, embeddings, ranking + SHAP).
export interface ExtractedSkillResult {
  skills: string[];
  jobTitle?: string;
  seniority?: string;
  yearsOfExperience?: number;
  certifications?: string[];
  industries?: string[];
  confidenceScores?: Record<string, number>;
}

// Render's free tier spins down the standalone ai-service on idle, requiring up to 60-90s for container boot + model initialization. 90,000ms ensures cold starts can complete before the client aborts, while keeping timeouts configurable via AI_REQUEST_TIMEOUT_MS.
export const DEFAULT_REQUEST_TIMEOUT_MS = 90_000;

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl: string;
  private readonly serviceSecret?: string;
  private readonly requestTimeoutMs: number;

  constructor(config: ConfigService) {
    const configured =
      config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:9910';
    // Render's fromService `property: hostport` (used to reach the AI service over the
    // private network) resolves to a bare "host:port", not a URL — fetch() requires a
    // scheme, so add one when it's missing rather than requiring every deploy target to
    // spell out "http://" itself.
    this.baseUrl = /^https?:\/\//.test(configured)
      ? configured
      : `http://${configured}`;
    this.serviceSecret = config.get<string>('AI_SERVICE_SECRET') || undefined;

    const timeoutRaw = config.get<string | number>('AI_REQUEST_TIMEOUT_MS');
    const parsedTimeout =
      typeof timeoutRaw === 'number'
        ? timeoutRaw
        : typeof timeoutRaw === 'string' && timeoutRaw.trim() !== ''
          ? Number(timeoutRaw)
          : NaN;
    this.requestTimeoutMs =
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : DEFAULT_REQUEST_TIMEOUT_MS;
  }

  get timeoutMs(): number {
    return this.requestTimeoutMs;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.serviceSecret
            ? { 'x-service-secret': this.serviceSecret }
            : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`ai-service ${path} -> ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      this.logger.error(`ai-service call failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('AI service is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
