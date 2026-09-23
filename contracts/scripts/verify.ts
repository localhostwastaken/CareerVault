import { ethers, network, run } from 'hardhat'
import * as fs from 'node:fs'
import * as path from 'node:path'

interface DeploymentRecord {
  network: string
  chainId: number
  address: string
}

async function main() {
  const deploymentFile = path.join(__dirname, '..', 'deployments', `${network.name}.json`)
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment record at ${deploymentFile}. Deploy first, e.g. npm run deploy:${network.name}.`)
  }

  // Parsed from disk, so treat every field as untrusted until validated below —
  // this file is what hardhat verify --network amoy $(node -p "...address") used
  // to splice straight into a shell command (argument injection if tampered with).
  const record = JSON.parse(fs.readFileSync(deploymentFile, 'utf8')) as Partial<DeploymentRecord>

  if (typeof record.address !== 'string' || !ethers.isAddress(record.address)) {
    throw new Error(`Deployment record at ${deploymentFile} has an invalid address: ${JSON.stringify(record.address)}`)
  }

  const { chainId } = await ethers.provider.getNetwork()
  if (typeof record.chainId !== 'number' || BigInt(record.chainId) !== chainId) {
    throw new Error(
      `Deployment record chainId ${record.chainId} does not match the live network's chainId ${chainId}`,
    )
  }

  try {
    await run('verify:verify', {
      address: record.address,
      constructorArguments: [],
    })
    console.log(`Verified: ${record.address}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('already verified')) {
      console.log(`Already verified: ${record.address}`)
    } else {
      throw error
    }
  }

  if (network.name === 'amoy') {
    console.log(`PolygonScan: https://amoy.polygonscan.com/address/${record.address}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
