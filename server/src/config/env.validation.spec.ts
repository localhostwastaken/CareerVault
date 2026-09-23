import { envValidationSchema } from './env.validation.js';

/**
 * Boot-time validation of the anchoring settings. With BLOCKCHAIN_DRIVER=amoy a missing or
 * malformed setting must stop the boot rather than surface later as a failed transaction;
 * with the local driver the same settings stay optional so the dev stack needs none of them.
 */

const DATABASE = { DATABASE_URL: 'postgresql://localhost:5432/careervault' };
const AMOY = {
  ...DATABASE,
  BLOCKCHAIN_DRIVER: 'amoy',
  POLYGON_RPC_URL: 'https://rpc-amoy.polygon.technology',
  ANCHOR_REGISTRY_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ANCHOR_PRIVATE_KEY: `0x${'1'.repeat(64)}`,
};

const validate = (env: Record<string, unknown>) => {
  const result = envValidationSchema.validate(env, { abortEarly: false });
  return {
    error: result.error,
    value: result.value as Record<string, unknown>,
  };
};

describe('env validation — anchoring', () => {
  it('keeps the chain settings optional, and allows them empty, on the local driver', () => {
    const { error, value } = validate({
      ...DATABASE,
      POLYGON_RPC_URL: '',
      ANCHOR_REGISTRY_ADDRESS: '',
      ANCHOR_PRIVATE_KEY: '',
    });

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      BLOCKCHAIN_DRIVER: 'local',
      ANCHOR_CHAIN_ID: 80002,
      ANCHOR_CONFIRMATIONS: 2,
      ANCHOR_MIN_PRIORITY_FEE_GWEI: 30,
      ANCHOR_TX_TIMEOUT_MS: 120000,
    });
  });

  it('accepts a complete amoy configuration', () => {
    expect(validate(AMOY).error).toBeUndefined();
  });

  it.each(['POLYGON_RPC_URL', 'ANCHOR_REGISTRY_ADDRESS', 'ANCHOR_PRIVATE_KEY'])(
    'requires %s on the amoy driver',
    (key) => {
      expect(validate({ ...AMOY, [key]: undefined }).error?.message).toContain(
        key,
      );
      expect(validate({ ...AMOY, [key]: '' }).error?.message).toContain(key);
    },
  );

  it.each([
    ['POLYGON_RPC_URL', 'ws://localhost:8545'],
    ['POLYGON_RPC_URL', 'rpc-amoy.polygon.technology'],
    ['ANCHOR_REGISTRY_ADDRESS', '0x5FbDB2315678afecb367f032d93F642f64180aa'],
    ['ANCHOR_REGISTRY_ADDRESS', '5FbDB2315678afecb367f032d93F642f64180aa3'],
    ['ANCHOR_PRIVATE_KEY', '1'.repeat(64)],
    ['ANCHOR_PRIVATE_KEY', `0x${'1'.repeat(63)}`],
  ])('rejects a malformed %s (%s) on the amoy driver', (key, value) => {
    expect(validate({ ...AMOY, [key]: value }).error?.message).toContain(key);
  });

  it('never echoes a malformed private key into the boot error', () => {
    const key = 'ab'.repeat(32); // the right length, but missing its 0x prefix

    const message = validate({ ...AMOY, ANCHOR_PRIVATE_KEY: key }).error
      ?.message;

    expect(message).toContain('ANCHOR_PRIVATE_KEY');
    expect(message).not.toContain(key);
  });

  it('converts the numeric settings from their env strings', () => {
    const { error, value } = validate({
      ...AMOY,
      ANCHOR_CHAIN_ID: '31337',
      ANCHOR_CONFIRMATIONS: '1',
      ANCHOR_MIN_PRIORITY_FEE_GWEI: '0',
      ANCHOR_TX_TIMEOUT_MS: '5000',
    });

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      ANCHOR_CHAIN_ID: 31337,
      ANCHOR_CONFIRMATIONS: 1,
      ANCHOR_MIN_PRIORITY_FEE_GWEI: 0,
      ANCHOR_TX_TIMEOUT_MS: 5000,
    });
  });

  it.each([
    ['ANCHOR_CHAIN_ID', '80002.5'],
    ['ANCHOR_CONFIRMATIONS', '0'],
    ['ANCHOR_MIN_PRIORITY_FEE_GWEI', '-1'],
    ['ANCHOR_TX_TIMEOUT_MS', 'soon'],
  ])('rejects %s=%s', (key, value) => {
    expect(validate({ ...AMOY, [key]: value }).error?.message).toContain(key);
  });
});

describe('env validation — production driver warning', () => {
  const PRODUCTION = {
    ...DATABASE,
    NODE_ENV: 'production',
    KMS_MASTER_KEY: Buffer.alloc(32, 7).toString('base64'),
  };
  const realWarn = console.warn;
  let warnings: string[];

  beforeEach(() => {
    warnings = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join(' '));
    };
  });
  afterEach(() => {
    console.warn = realWarn;
  });

  it('flags simulated anchoring on the local driver', () => {
    validate({ ...PRODUCTION, BLOCKCHAIN_DRIVER: 'local' });

    expect(warnings.join('\n')).toContain(
      'BLOCKCHAIN_DRIVER=local — anchoring is SIMULATED — Merkle roots go to a local JSON ledger, not Polygon',
    );
  });

  it('does not flag anchoring on the amoy driver', () => {
    validate({ ...PRODUCTION, ...AMOY });

    expect(warnings.join('\n')).not.toContain('BLOCKCHAIN_DRIVER');
  });
});
