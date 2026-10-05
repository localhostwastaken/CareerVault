import { Wallet } from 'ethers';
import { LocalAnchorService } from '../services/blockchain/local-anchor.service.js';
import { PolygonAnchorService } from '../services/blockchain/polygon-anchor.service.js';
import { SystemStatusService } from './system-status.service.js';

/**
 * The public trust-configuration endpoint. It is unauthenticated, so beyond the shape it
 * must never carry a secret: the RPC URL can embed an API key, and the private key and
 * master key must never leave the server. Both real adapters are used so the wallet address
 * really comes from BlockchainService.describe().
 */

const REGISTRY = '0x483f9FF4B7444c60e93808Ea0e9b72a14b8Cb12a';
const WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/alchemy-api-key-123';
const PRIVATE_KEY = Wallet.createRandom().privateKey;
const MASTER_KEY = 'm'.repeat(64);

function config(values: Record<string, unknown>) {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`${key} missing`);
      return values[key];
    },
  };
}

function amoy() {
  const settings = config({
    BLOCKCHAIN_DRIVER: 'amoy',
    POLYGON_RPC_URL: RPC_URL,
    ANCHOR_PRIVATE_KEY: PRIVATE_KEY,
    KMS_MASTER_KEY: MASTER_KEY,
    ANCHOR_REGISTRY_ADDRESS: REGISTRY,
    ANCHOR_CHAIN_ID: 80002,
    ANCHOR_CONFIRMATIONS: 2,
    ANCHOR_MIN_PRIORITY_FEE_GWEI: 30,
    ANCHOR_TX_TIMEOUT_MS: 120_000,
    FIELD_ENCRYPTION_STRICT: true,
    AI_SERVICE_URL: 'https://careervault-ai.onrender.com',
  });
  const chain = { wallet: { address: WALLET } };
  const blockchain = new PolygonAnchorService(
    settings as never,
    chain as never,
  );
  return new SystemStatusService(settings as never, blockchain);
}

function local(values: Record<string, unknown> = {}) {
  const settings = config({ STORAGE_LOCAL_DIR: './storage', ...values });
  const blockchain = new LocalAnchorService(settings as never);
  return new SystemStatusService(settings as never, blockchain);
}

describe('SystemStatusService', () => {
  it('describes a Polygon Amoy deployment with explorer links', () => {
    const status = amoy().status();

    expect(status.blockchain).toEqual({
      driver: 'amoy',
      network: 'polygon-amoy',
      chainId: 80002,
      contractAddress: REGISTRY,
      walletAddress: WALLET,
      explorerContractUrl: `https://amoy.polygonscan.com/address/${REGISTRY}`,
      explorerWalletUrl: `https://amoy.polygonscan.com/address/${WALLET}`,
    });
    expect(status.encryption.strict).toBe(true);
    expect(status.ai).toEqual({ configured: true });
  });

  it('never exposes the RPC URL, private key or master key', () => {
    const body = JSON.stringify(amoy().status());

    expect(body).not.toContain('alchemy');
    expect(body).not.toContain(PRIVATE_KEY);
    expect(body).not.toContain(PRIVATE_KEY.slice(2));
    expect(body).not.toContain(MASTER_KEY);
  });

  it('describes the local simulator with no chain, wallet or links', () => {
    const status = local({ BLOCKCHAIN_DRIVER: 'local' }).status();

    expect(status.blockchain).toEqual({
      driver: 'local',
      network: 'local-simulator',
      chainId: null,
      contractAddress: null,
      walletAddress: null,
      explorerContractUrl: null,
      explorerWalletUrl: null,
    });
  });

  it('falls back to the local driver and non-strict reads when unset', () => {
    const status = local().status();

    expect(status.blockchain.driver).toBe('local');
    expect(status.encryption.strict).toBe(false);
  });

  it('lists the encrypted columns from ENCRYPTED_FIELDS', () => {
    expect(local().status().encryption).toEqual({
      strict: false,
      scheme: 'AES-256-GCM envelope (cvenc:v1)',
      encryptedFields: [
        'Document.contentJson',
        'Document.salt',
        'Document.managerSignature',
        'Document.hrSignature',
        'Document.revocationReasonText',
        'DocumentVersion.contentJson',
        'DocumentVersion.changeSummary',
      ],
    });
  });

  it.each([
    [undefined, false],
    ['', false],
    ['   ', false],
    ['http://localhost:9910', true],
  ])('reports AI_SERVICE_URL %p as configured=%p', (url, configured) => {
    expect(local({ AI_SERVICE_URL: url }).status().ai).toEqual({ configured });
  });

  it('stamps generatedAt as an ISO timestamp', () => {
    const { generatedAt } = local().status();

    expect(new Date(generatedAt).toISOString()).toBe(generatedAt);
  });
});
