import {
  AiClientService,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from './ai-client.service.js';
import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Render's fromService `property: hostport` (used to reach the AI service over the
 * private network — see render.yaml) resolves to a bare "host:port", not a URL. The
 * client must add a scheme itself rather than passing that straight to fetch(), which
 * rejects a schemeless target.
 */

function serviceWithConfiguredUrl(url: string | undefined) {
  const config = {
    get: (key: string) => (key === 'AI_SERVICE_URL' ? url : undefined),
  };
  return new AiClientService(config as never);
}

function requestedUrl(service: AiClientService): Promise<string> {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: string) => {
    calls.push(input);
    return Promise.resolve(
      new Response(JSON.stringify({ embedding: [] }), { status: 200 }),
    );
  }) as typeof fetch;
  return service
    .embed('text')
    .then(() => calls[0])
    .finally(() => {
      globalThis.fetch = originalFetch;
    });
}

describe('AiClientService base URL', () => {
  it('prepends http:// to a bare host:port from fromService hostport', async () => {
    const service = serviceWithConfiguredUrl('careervault-ai-service:9910');
    await expect(requestedUrl(service)).resolves.toBe(
      'http://careervault-ai-service:9910/embed',
    );
  });

  it('leaves an already-schemed URL untouched', async () => {
    const service = serviceWithConfiguredUrl('https://ai.example.com');
    await expect(requestedUrl(service)).resolves.toBe(
      'https://ai.example.com/embed',
    );
  });

  it('defaults to http://localhost:9910 when unset', async () => {
    const service = serviceWithConfiguredUrl(undefined);
    await expect(requestedUrl(service)).resolves.toBe(
      'http://localhost:9910/embed',
    );
  });
});

describe('AiClientService timeout', () => {
  it('defaults to 90,000 ms when AI_REQUEST_TIMEOUT_MS is unset', () => {
    const service = new AiClientService({
      get: () => undefined,
    } as never);
    expect(service.timeoutMs).toBe(DEFAULT_REQUEST_TIMEOUT_MS);
    expect(service.timeoutMs).toBe(90_000);
  });

  it('reads numeric AI_REQUEST_TIMEOUT_MS when configured', () => {
    const service = new AiClientService({
      get: (key: string) =>
        key === 'AI_REQUEST_TIMEOUT_MS' ? 60000 : undefined,
    } as never);
    expect(service.timeoutMs).toBe(60_000);
  });

  it('parses string AI_REQUEST_TIMEOUT_MS when configured', () => {
    const service = new AiClientService({
      get: (key: string) =>
        key === 'AI_REQUEST_TIMEOUT_MS' ? '120000' : undefined,
    } as never);
    expect(service.timeoutMs).toBe(120_000);
  });

  it('falls back to default when AI_REQUEST_TIMEOUT_MS is invalid or non-positive', () => {
    const negativeService = new AiClientService({
      get: (key: string) =>
        key === 'AI_REQUEST_TIMEOUT_MS' ? -500 : undefined,
    } as never);
    expect(negativeService.timeoutMs).toBe(90_000);

    const nonNumericService = new AiClientService({
      get: (key: string) =>
        key === 'AI_REQUEST_TIMEOUT_MS' ? 'invalid' : undefined,
    } as never);
    expect(nonNumericService.timeoutMs).toBe(90_000);
  });

  it('aborts request and throws ServiceUnavailableException when timeout triggers', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_url: string, options?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }
      });
    }) as typeof fetch;

    try {
      const service = new AiClientService({
        get: (key: string) =>
          key === 'AI_REQUEST_TIMEOUT_MS' ? 20 : undefined,
      } as never);

      await expect(service.embed('test')).rejects.toThrow(
        ServiceUnavailableException,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
