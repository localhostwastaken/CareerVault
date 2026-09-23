import type { Logger } from '@nestjs/common';
import { formatEther, parseEther } from 'ethers';
import { type AnchorChain, shortMessage } from './anchor-chain.util.js';
import { networkName } from './chain-explorer.js';

const LOW_BALANCE = parseEther('0.05');

// PolygonAnchorService's boot diagnostics (R2): is the RPC on the configured chain, is the
// registry deployed there, may this wallet anchor, and can it pay? Every finding is only
// logged — a misconfigured chain degrades anchoring (R7), it never takes the API down. Only
// the wallet ADDRESS is logged; the key never leaves ethers' Wallet.
export async function anchorSelfCheck(
  { provider, wallet, contract }: AnchorChain,
  { chainId, contractAddress }: { chainId: number; contractAddress: string },
  logger: Pick<Logger, 'log' | 'warn' | 'error'>,
): Promise<void> {
  const report = (ok: boolean, what: string) => {
    if (ok) logger.log(`Self-check OK — ${what}`);
    else logger.error(`Self-check FAILED — ${what}`);
  };
  logger.log(
    `Anchoring to ${networkName(chainId)} (chainId ${chainId}) via AnchorRegistry ${contractAddress} from wallet ${wallet.address}`,
  );
  try {
    const rpcChainId = Number(await provider.send('eth_chainId', []));
    report(
      rpcChainId === chainId,
      `RPC chainId ${rpcChainId}, ANCHOR_CHAIN_ID ${chainId}`,
    );
    const code = await provider.getCode(contractAddress);
    report(code !== '0x', `contract code at ${contractAddress}`);
    const authorized = await contract.isAuthorizedAnchor(wallet.address);
    report(authorized, `wallet ${wallet.address} is an authorized anchor`);
    const balance = await provider.getBalance(wallet.address);
    const funds = `wallet balance ${formatEther(balance)} POL`;
    if (balance < LOW_BALANCE) logger.warn(`${funds} — below 0.05 POL`);
    else logger.log(funds);
  } catch (error) {
    logger.error(
      `Self-check could not reach the chain: ${shortMessage(error)} — anchors verify as pending until it does`,
    );
  }
}
