import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Wallet } from 'ethers';
import { PolygonAnchorService } from './polygon-anchor.service.js';

/**
 * The AnchorRegistry adapter (R2) against fakes. Nothing here talks to a chain: the real
 * contract round-trip runs end to end in e2e's `npm run test:chain` against a local
 * Hardhat node.
 */

const GWEI = 10n ** 9n;
const ROOT = 'ab'.repeat(32);
const ROOT_BYTES32 = `0x${ROOT}`;
const DOC = 'cd'.repeat(32);
const DOC_BYTES32 = `0x${DOC}`;
const REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const BLOCK_TIME = 1_760_000_000;

type Receipt = { status: number; blockNumber: number };
const MINED: Receipt = { status: 1, blockNumber: 42 };
const API_KEY = 'alchemy-api-key-123';
type FeeData = {
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

// What ethers throws for an HTTP failure: the full message serializes the request, RPC URL
// (and so its API key) included; only `shortMessage` is safe to show.
function leakyRpcError(status = 503) {
  return Object.assign(
    new Error(
      `server response ${status} (info={ "requestUrl": "https://polygon-amoy.g.alchemy.com/v2/${API_KEY}" }, code=SERVER_ERROR)`,
    ),
    { shortMessage: `server response ${status}` },
  );
}

function settings(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    POLYGON_RPC_URL: 'http://127.0.0.1:1',
    ANCHOR_REGISTRY_ADDRESS: REGISTRY,
    ANCHOR_PRIVATE_KEY: Wallet.createRandom().privateKey,
    ANCHOR_CHAIN_ID: 80002,
    ANCHOR_CONFIRMATIONS: 2,
    ANCHOR_MIN_PRIORITY_FEE_GWEI: 30,
    ANCHOR_TX_TIMEOUT_MS: 120_000,
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`${key} missing`);
      return values[key];
    },
  };
}

function capture(service: PolygonAnchorService) {
  const lines: string[] = [];
  const logger = {
    log: (message: string) => lines.push(`LOG ${message}`),
    warn: (message: string) => lines.push(`WARN ${message}`),
    error: (message: string) => lines.push(`ERROR ${message}`),
  };
  Object.assign(service, { logger });
  return lines;
}

function fakeChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    sent: [] as { method: string; args: unknown[]; hash: string }[],
    // How each send lands, in order; with none queued it is mined at block 42. 'pending'
    // leaves it unmined until the test sets its receipt.
    outcomes: [] as (Receipt | 'pending')[],
    receipts: new Map<string, Receipt>(),
    // Block 42 plus one: MINED has the 2 confirmations the default settings ask for.
    head: 43,
    feeData: {
      maxFeePerGas: 61n * GWEI,
      maxPriorityFeePerGas: GWEI,
    } as FeeData,
    roots: new Map<string, { documentCount: bigint; anchoredAt: bigint }>(),
    rootReads: 0,
    revoked: new Map<string, bigint>(),
    revocationReads: 0,
  };
  // Deliberately no `wait()`: confirmations must come from the adapter's own polling.
  const transaction = (method: string, args: unknown[]) => {
    const hash = `0x${String(chain.sent.length + 1).padStart(64, '0')}`;
    chain.sent.push({ method, args, hash });
    const outcome = chain.outcomes.shift() ?? MINED;
    if (outcome !== 'pending') chain.receipts.set(hash, outcome);
    return Promise.resolve({ hash });
  };
  // Deliberately no `on`/`once`: the adapter must not use ethers subscriptions at all.
  const provider = {
    getFeeData: () => Promise.resolve(chain.feeData),
    getBlock: (blockNumber: number) =>
      Promise.resolve({ number: blockNumber, timestamp: BLOCK_TIME }),
    getBlockNumber: () => Promise.resolve(chain.head),
    getTransactionReceipt: (hash: string): Promise<Receipt | null> =>
      Promise.resolve(chain.receipts.get(hash) ?? null),
    send: (): Promise<unknown> => Promise.resolve('0x13882'),
    getCode: (): Promise<string> => Promise.resolve('0x6080604052'),
    getBalance: (): Promise<bigint> => Promise.resolve(10n ** 18n),
  };
  const contract = {
    anchorRoot: (...args: unknown[]) => transaction('anchorRoot', args),
    revokeDocument: (...args: unknown[]) => transaction('revokeDocument', args),
    verifyRoot: (root: string): Promise<unknown> => {
      chain.rootReads++;
      const record = chain.roots.get(root);
      return Promise.resolve(
        record
          ? [true, record]
          : [false, { documentCount: 0n, anchoredAt: 0n }],
      );
    },
    isRevoked: (hash: string) => {
      chain.revocationReads++;
      const at = chain.revoked.get(hash);
      return Promise.resolve(at ? [true, at] : [false, 0n]);
    },
    isAuthorizedAnchor: (): Promise<boolean> => Promise.resolve(true),
  };
  const service = new PolygonAnchorService(
    settings(overrides) as never,
    { provider, wallet: { address: WALLET }, contract } as never,
    0, // poll for receipts without pausing
  );
  return { chain, provider, contract, service };
}

describe('PolygonAnchorService', () => {
  describe('fees', () => {
    it.each([
      // ethers' Amoy fallback (1 gwei tip on 2 × 30 gwei base) is raised to the floor.
      [61n * GWEI, GWEI, 30n * GWEI, 90n * GWEI],
      // A suggestion already above the floor is kept.
      [100n * GWEI, 40n * GWEI, 40n * GWEI, 100n * GWEI],
      // No EIP-1559 data at all: the floor alone.
      [null, null, 30n * GWEI, 30n * GWEI],
    ])(
      'maxFee %p / tip %p is sent as tip %p and maxFee %p',
      async (maxFeePerGas, maxPriorityFeePerGas, tip, maxFee) => {
        const { chain, service } = fakeChain();
        chain.feeData = { maxFeePerGas, maxPriorityFeePerGas };

        await service.anchorRoot(ROOT, 3);

        // Both fields: with only the tip overridden, ethers fills a max fee that can land
        // below the tip, and the node rejects the transaction.
        expect(chain.sent[0].args[2]).toEqual({
          maxPriorityFeePerGas: tip,
          maxFeePerGas: maxFee,
        });
      },
    );
  });

  describe('hex handling', () => {
    it('sends 64-hex input as a 0x-prefixed bytes32', async () => {
      const { chain, service } = fakeChain();

      await service.anchorRoot(ROOT.toUpperCase(), 3);
      await service.revokeDocument(DOC);

      expect(chain.sent[0].args.slice(0, 2)).toEqual([ROOT_BYTES32, 3]);
      expect(chain.sent[1].args[0]).toBe(DOC_BYTES32);
    });

    it.each(['', 'ab'.repeat(31), ROOT_BYTES32, 'zz'.repeat(32)])(
      'rejects %p before touching the chain',
      async (bad) => {
        const { chain, service } = fakeChain();

        await expect(service.anchorRoot(bad, 1)).rejects.toThrow(/64 hex/);
        await expect(service.revokeDocument(bad)).rejects.toThrow(/64 hex/);
        await expect(service.verifyRoot(bad)).rejects.toThrow(/64 hex/);
        await expect(service.isRevoked(bad)).rejects.toThrow(/64 hex/);
        expect(chain.sent).toHaveLength(0);
        expect(chain.rootReads + chain.revocationReads).toBe(0);
      },
    );
  });

  describe('writes', () => {
    it('waits for the configured confirmations and dates the anchor by its block', async () => {
      const { chain, service } = fakeChain();
      chain.head = 42; // mined in the latest block: 1 of the 2 confirmations
      let settled = false;
      const write = service.anchorRoot(ROOT, 3).finally(() => (settled = true));

      await flush();
      await flush();
      expect(settled).toBe(false);

      chain.head = 43;
      expect(await write).toEqual({
        txHash: chain.sent[0].hash,
        blockNumber: 42,
        anchoredAt: new Date(BLOCK_TIME * 1000),
        chainId: 80002,
        contractAddress: REGISTRY,
      });
    });

    it('keeps polling through a receipt poll that fails mid-wait, and the write still resolves', async () => {
      const { chain, provider, service } = fakeChain();
      chain.outcomes.push('pending');
      const poll = provider.getTransactionReceipt;
      let polls = 0;
      provider.getTransactionReceipt = (hash: string) => {
        polls++;
        if (polls === 2) return Promise.reject(leakyRpcError());
        if (polls === 3) chain.receipts.set(hash, MINED); // it lands meanwhile
        return poll(hash);
      };
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', onUnhandled);
      try {
        const receipt = await service.anchorRoot(ROOT, 3);
        await flush();

        expect(receipt).toMatchObject({
          txHash: chain.sent[0].hash,
          blockNumber: 42,
        });
        expect(polls).toBe(3);
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });

    it('gives up after ANCHOR_TX_TIMEOUT_MS, keeping only the short form of the last RPC error', async () => {
      const { chain, provider, service } = fakeChain({
        ANCHOR_TX_TIMEOUT_MS: 30,
      });
      chain.outcomes.push('pending');
      provider.getTransactionReceipt = () => Promise.reject(leakyRpcError());

      const error = await service.anchorRoot(ROOT, 3).catch((e: unknown) => e);

      expect(String(error)).toMatch(
        new RegExp(
          `Timed out after 30 ms waiting for ${chain.sent[0].hash} to confirm.*server response 503`,
        ),
      );
      expect(String(error)).not.toContain(API_KEY);
    });

    it('sends the second transaction only after the first has resolved', async () => {
      const { chain, service } = fakeChain();
      chain.outcomes.push('pending');

      const first = service.anchorRoot(ROOT, 3);
      const second = service.revokeDocument(DOC);
      await flush();
      expect(chain.sent.map((tx) => tx.method)).toEqual(['anchorRoot']);

      chain.receipts.set(chain.sent[0].hash, MINED);
      await first;
      await second;
      expect(chain.sent.map((tx) => tx.method)).toEqual([
        'anchorRoot',
        'revokeDocument',
      ]);
    });

    it('does not let a failed write block the next one', async () => {
      const { contract, service } = fakeChain();
      contract.anchorRoot = () => Promise.reject(new Error('nonce too low'));

      await expect(service.anchorRoot(ROOT, 3)).rejects.toThrow(
        'nonce too low',
      );
      await expect(service.revokeDocument(DOC)).resolves.toMatchObject({
        blockNumber: 42,
      });
    });

    it('throws when the receipt reports a failed transaction (status 0)', async () => {
      const { chain, service } = fakeChain();
      chain.outcomes.push({ status: 0, blockNumber: 42 });

      await expect(service.anchorRoot(ROOT, 3)).rejects.toThrow(/reverted/);
    });

    it('rethrows RPC failures without the request dump ethers puts in its message', async () => {
      const { contract, service } = fakeChain();
      contract.anchorRoot = () => Promise.reject(leakyRpcError(401));

      const error = await service.anchorRoot(ROOT, 3).catch((e: unknown) => e);

      expect(String(error)).toContain('server response 401');
      expect(String(error)).not.toContain(API_KEY);
    });
  });

  describe('verifyRoot', () => {
    it('shares one contract call between concurrent checks and caches a positive answer', async () => {
      const { chain, service } = fakeChain();
      chain.roots.set(ROOT_BYTES32, {
        documentCount: 3n,
        anchoredAt: BigInt(BLOCK_TIME),
      });

      const [a, b] = await Promise.all([
        service.verifyRoot(ROOT),
        service.verifyRoot(ROOT),
      ]);
      await service.verifyRoot(ROOT);

      expect(chain.rootReads).toBe(1);
      expect(a).toEqual({
        exists: true,
        documentCount: 3,
        anchoredAt: new Date(BLOCK_TIME * 1000),
        chainId: 80002,
        contractAddress: REGISTRY,
      });
      expect(b).toEqual(a);
    });

    it('does not cache a negative answer — the root may be anchored a moment later', async () => {
      const { chain, service } = fakeChain();

      expect(await service.verifyRoot(ROOT)).toEqual({ exists: false });
      chain.roots.set(ROOT_BYTES32, {
        documentCount: 3n,
        anchoredAt: BigInt(BLOCK_TIME),
      });

      expect((await service.verifyRoot(ROOT)).exists).toBe(true);
      expect(chain.rootReads).toBe(2);
    });

    it('surfaces the remembered tx after a wait timeout, so a retry can still record it', async () => {
      const { chain, service } = fakeChain({ ANCHOR_TX_TIMEOUT_MS: 30 });
      chain.outcomes.push('pending');
      await expect(service.anchorRoot(ROOT, 3)).rejects.toThrow(/Timed out/);
      const txHash = chain.sent[0].hash;

      // The transaction landed after the wait gave up.
      chain.roots.set(ROOT_BYTES32, {
        documentCount: 3n,
        anchoredAt: BigInt(BLOCK_TIME),
      });
      chain.receipts.set(txHash, { status: 1, blockNumber: 77 });

      expect(await service.verifyRoot(ROOT)).toMatchObject({
        exists: true,
        txHash,
        blockNumber: 77,
      });
    });

    it('reports the submission that landed, not a later resend that reverted', async () => {
      const { chain, service } = fakeChain({ ANCHOR_TX_TIMEOUT_MS: 30 });
      chain.head = 100;
      chain.outcomes.push('pending', { status: 0, blockNumber: 78 });
      await expect(service.anchorRoot(ROOT, 3)).rejects.toThrow(/Timed out/);
      await expect(service.anchorRoot(ROOT, 3)).rejects.toThrow(/reverted/);
      const [landed, resend] = chain.sent.map((tx) => tx.hash);
      chain.roots.set(ROOT_BYTES32, {
        documentCount: 3n,
        anchoredAt: BigInt(BLOCK_TIME),
      });
      chain.receipts.set(landed, { status: 1, blockNumber: 77 });
      chain.receipts.set(resend, { status: 0, blockNumber: 78 });

      expect(await service.verifyRoot(ROOT)).toMatchObject({
        txHash: landed,
        blockNumber: 77,
      });
    });
  });

  describe('isRevoked', () => {
    const realNow = Date.now;
    let now: number;
    beforeEach(() => {
      now = 1_000_000;
      Date.now = () => now;
    });
    afterEach(() => {
      Date.now = realNow;
    });

    it('caches the answer for 60 seconds', async () => {
      const { chain, service } = fakeChain();
      chain.revoked.set(DOC_BYTES32, BigInt(BLOCK_TIME));

      expect(await service.isRevoked(DOC)).toEqual({
        revoked: true,
        revokedAt: new Date(BLOCK_TIME * 1000),
      });
      now += 59_999;
      await service.isRevoked(DOC);
      expect(chain.revocationReads).toBe(1);

      now += 1;
      await service.isRevoked(DOC);
      expect(chain.revocationReads).toBe(2);
    });
  });

  describe('onModuleInit self-check', () => {
    it('logs the wallet address and each passing check', async () => {
      const { service } = fakeChain();
      const lines = capture(service);

      await service.selfCheck();

      expect(lines.some((l) => l.includes(WALLET))).toBe(true);
      expect(lines.filter((l) => l.startsWith('ERROR'))).toEqual([]);
      expect(lines.filter((l) => l.includes('OK'))).toHaveLength(3);
    });

    it('logs an ERROR per misconfiguration and warns on a low balance, but keeps serving', async () => {
      const { provider, contract, service } = fakeChain();
      provider.send = () => Promise.resolve('0x7a69');
      provider.getCode = () => Promise.resolve('0x');
      provider.getBalance = () => Promise.resolve(10n ** 16n);
      contract.isAuthorizedAnchor = () => Promise.resolve(false);
      const lines = capture(service);

      await expect(service.selfCheck()).resolves.toBeUndefined();

      expect(lines.filter((l) => l.startsWith('ERROR'))).toHaveLength(3);
      expect(lines.filter((l) => l.startsWith('WARN'))).toEqual([
        expect.stringContaining('0.01 POL'),
      ]);
    });

    it('does not block or throw when the RPC is unreachable', async () => {
      const { provider, service } = fakeChain();
      provider.send = () => Promise.reject(new Error('connect ECONNREFUSED'));
      const lines = capture(service);

      expect(service.onModuleInit()).toBeUndefined();
      await flush();

      expect(lines).toContainEqual(
        expect.stringMatching(/^ERROR.*ECONNREFUSED/),
      );
    });
  });

  describe('construction', () => {
    // Stands in for the RPC so the test can count what reaches it.
    async function rpcServer() {
      let requests = 0;
      const server = createServer((req, res) => {
        requests++;
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        req.on('end', () => {
          const payload = JSON.parse(body) as { id: number };
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: payload.id,
              error: { code: -32000, message: 'unavailable' },
            }),
          );
        });
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      const { port } = server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${port}`,
        requests: () => requests,
        close: () => {
          server.closeAllConnections();
          return new Promise<void>((resolve) => server.close(() => resolve()));
        },
      };
    }

    it('does no network I/O until the adapter is used', async () => {
      const rpc = await rpcServer();
      try {
        const service = new PolygonAnchorService(
          settings({ POLYGON_RPC_URL: rpc.url }) as never,
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(rpc.requests()).toBe(0);

        // Control: the same instance does reach this server once it is used.
        await service.isRevoked(DOC).catch(() => undefined);
        expect(rpc.requests()).toBeGreaterThan(0);
      } finally {
        await rpc.close();
      }
    });

    it('logs the wallet address during the self-check, never the private key', async () => {
      const rpc = await rpcServer();
      const key = Wallet.createRandom().privateKey;
      try {
        const service = new PolygonAnchorService(
          settings({
            POLYGON_RPC_URL: rpc.url,
            ANCHOR_PRIVATE_KEY: key,
          }) as never,
        );
        const lines = capture(service);

        await service.selfCheck();

        expect(lines.join('\n')).toContain(new Wallet(key).address);
        expect(lines.join('\n')).not.toContain(key.slice(2));
      } finally {
        await rpc.close();
      }
    });
  });
});
