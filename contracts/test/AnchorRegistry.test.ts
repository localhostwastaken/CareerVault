import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'

const ROOT = ethers.keccak256(ethers.toUtf8Bytes('root-1'))
const DOC = ethers.keccak256(ethers.toUtf8Bytes('doc-1'))

async function deploy() {
  const [owner, anchor, outsider] = await ethers.getSigners()
  const factory = await ethers.getContractFactory('AnchorRegistry')
  const registry = await factory.deploy()
  await registry.waitForDeployment()
  return { registry, owner, anchor, outsider }
}

describe('AnchorRegistry', () => {
  it('anchors a root and reports it via verifyRoot', async () => {
    const { registry } = await loadFixture(deploy)
    await expect(registry.anchorRoot(ROOT, 5n)).to.emit(registry, 'RootAnchored')
    const [exists, record] = await registry.verifyRoot(ROOT)
    expect(exists).to.equal(true)
    expect(record.documentCount).to.equal(5n)
    expect(await registry.getAnchorCount()).to.equal(1n)
  })

  it('rejects duplicate roots', async () => {
    const { registry } = await loadFixture(deploy)
    await registry.anchorRoot(ROOT, 1n)
    await expect(registry.anchorRoot(ROOT, 1n)).to.be.revertedWith('Root exists')
  })

  it('records revocation idempotently', async () => {
    const { registry } = await loadFixture(deploy)
    await expect(registry.revokeDocument(DOC)).to.emit(registry, 'DocumentRevoked')
    await registry.revokeDocument(DOC) // no-op, no revert
    const [revoked] = await registry.isRevoked(DOC)
    expect(revoked).to.equal(true)
    expect(await registry.getRevokedCount()).to.equal(1n)
  })

  it('enforces anchor authorization', async () => {
    const { registry, outsider } = await loadFixture(deploy)
    await expect(registry.connect(outsider).anchorRoot(ROOT, 1n)).to.be.revertedWith('Not authorized')
  })

  it('lets the owner authorize a new anchor', async () => {
    const { registry, anchor } = await loadFixture(deploy)
    await registry.addAuthorizedAnchor(anchor.address)
    expect(await registry.isAuthorizedAnchor(anchor.address)).to.equal(true)
    await expect(registry.connect(anchor).anchorRoot(ROOT, 2n)).to.emit(registry, 'RootAnchored')
  })
})
