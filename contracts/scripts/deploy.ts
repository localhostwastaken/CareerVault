import { ethers, network } from 'hardhat'
import * as fs from 'node:fs'
import * as path from 'node:path'

const AMOY_CHAIN_ID = 80002n
const AMOY_CONFIRMATIONS = 5

async function main() {
  const { chainId } = await ethers.provider.getNetwork()

  if (network.name === 'amoy' && chainId !== AMOY_CHAIN_ID) {
    throw new Error(`Expected Polygon Amoy (chainId ${AMOY_CHAIN_ID}), got chainId ${chainId} on network "${network.name}"`)
  }

  const [deployer] = await ethers.getSigners()
  const factory = await ethers.getContractFactory('AnchorRegistry')
  const registry = await factory.deploy()
  await registry.waitForDeployment()

  const address = await registry.getAddress()
  const deployTx = registry.deploymentTransaction()
  if (!deployTx) {
    throw new Error('Missing deployment transaction')
  }

  // Amoy readers (PolygonScan, the server adapter) want extra confirmations before
  // trusting the deployed code is final; other networks just need the standard 1.
  const receipt = network.name === 'amoy' ? await deployTx.wait(AMOY_CONFIRMATIONS) : await deployTx.wait()
  if (!receipt) {
    throw new Error('Missing deployment receipt')
  }

  const record = {
    network: network.name,
    chainId: Number(chainId),
    address,
    txHash: deployTx.hash,
    blockNumber: receipt.blockNumber,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  }

  const deploymentsDir = path.join(__dirname, '..', 'deployments')
  fs.mkdirSync(deploymentsDir, { recursive: true })
  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`)
  fs.writeFileSync(deploymentFile, `${JSON.stringify(record, null, 2)}\n`)

  console.log(`AnchorRegistry deployed to: ${address}`)
  if (network.name === 'amoy') {
    console.log(`PolygonScan: https://amoy.polygonscan.com/address/${address}`)
    console.log(`Deployment tx: https://amoy.polygonscan.com/tx/${deployTx.hash}`)
  }
  console.log(`Deployment record written to: ${deploymentFile}`)
  console.log(`ANCHOR_REGISTRY_ADDRESS=${address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
