import { AiClientService } from './ai-client.service.js';

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
