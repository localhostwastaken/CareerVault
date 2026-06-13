import { ethers } from 'hardhat'

async function main() {
  const factory = await ethers.getContractFactory('AnchorRegistry')
  const registry = await factory.deploy()
  await registry.waitForDeployment()
  const address = await registry.getAddress()
  console.log(`AnchorRegistry deployed to: ${address}`)
  console.log('Set ANCHOR_REGISTRY_ADDRESS in the server .env to this address.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
