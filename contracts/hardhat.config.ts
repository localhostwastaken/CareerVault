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
    },
  },
}

export default config
