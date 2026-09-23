import {
  explorerAddressUrl,
  explorerBlockUrl,
  explorerTxUrl,
  networkName,
} from './chain-explorer.js';

// These strings are what a verifier sees in the credential and on the verification page,
// so a local simulator must never be presented as a public chain, and only chains with a
// real public explorer may produce a link.

const TX = `0x${'ab'.repeat(32)}`;
const ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

describe('networkName', () => {
  it.each([
    [80002, 'polygon-amoy'],
    [137, 'polygon'],
    [31337, 'hardhat-local'],
    [null, 'local-simulator'],
    [11155111, 'chain-11155111'],
  ])('names chain %p "%s"', (chainId, name) => {
    expect(networkName(chainId)).toBe(name);
  });
});

describe('explorer links', () => {
  it('links Polygon Amoy to amoy.polygonscan.com', () => {
    expect(explorerTxUrl(80002, TX)).toBe(
      `https://amoy.polygonscan.com/tx/${TX}`,
    );
    expect(explorerAddressUrl(80002, ADDRESS)).toBe(
      `https://amoy.polygonscan.com/address/${ADDRESS}`,
    );
    expect(explorerBlockUrl(80002, 123)).toBe(
      'https://amoy.polygonscan.com/block/123',
    );
  });

  it('links Polygon mainnet to polygonscan.com', () => {
    expect(explorerTxUrl(137, TX)).toBe(`https://polygonscan.com/tx/${TX}`);
    expect(explorerAddressUrl(137, ADDRESS)).toBe(
      `https://polygonscan.com/address/${ADDRESS}`,
    );
    expect(explorerBlockUrl(137, 7)).toBe('https://polygonscan.com/block/7');
  });

  it.each([null, 31337, 11155111])(
    'has no explorer for chain %p',
    (chainId) => {
      expect(explorerTxUrl(chainId, TX)).toBeNull();
      expect(explorerAddressUrl(chainId, ADDRESS)).toBeNull();
      expect(explorerBlockUrl(chainId, 123)).toBeNull();
    },
  );

  it('returns null when there is nothing to link to', () => {
    expect(explorerTxUrl(80002, null)).toBeNull();
    expect(explorerAddressUrl(80002, null)).toBeNull();
    expect(explorerBlockUrl(80002, null)).toBeNull();
  });
});
