import 'dotenv/config'
import type { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // Polygon Amoy testnet (used only when BLOCKCHAIN_DRIVER=amoy on the server).
    amoy: {
      url: process.env.POLYGON_RPC_URL ?? '',
      accounts: process.env.ANCHOR_PRIVATE_KEY ? [process.env.ANCHOR_PRIVATE_KEY] : [],
      chainId: 80002,
    },
    // A persistent node (`npx hardhat node`), unlike the ephemeral in-process
    // `hardhat` network — used by deploy:localhost and Task 5's server e2e test.
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
  },
  etherscan: {
    // A single string selects Etherscan's V2 API in hardhat-verify 2.1.3, which
    // already knows polygonAmoy (80002) — no customChains entry needed.
    apiKey: process.env.ETHERSCAN_API_KEY ?? '',
  },
  sourcify: {
    enabled: false,
  },
}

export default config
