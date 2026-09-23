import { expect } from 'chai'
import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'

const ROOT = ethers.keccak256(ethers.toUtf8Bytes('root-1'))
const ROOT_2 = ethers.keccak256(ethers.toUtf8Bytes('root-2'))
const DOC = ethers.keccak256(ethers.toUtf8Bytes('doc-1'))
const DOC_2 = ethers.keccak256(ethers.toUtf8Bytes('doc-2'))

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

  describe('input validation', () => {
    it('rejects a zero root', async () => {
      const { registry } = await loadFixture(deploy)
      await expect(registry.anchorRoot(ethers.ZeroHash, 1n)).to.be.revertedWith('Zero root')
    })

    it('rejects a zero document hash', async () => {
      const { registry } = await loadFixture(deploy)
      await expect(registry.revokeDocument(ethers.ZeroHash)).to.be.revertedWith('Zero hash')
    })
  })

  describe('batchAnchorRoots', () => {
    it('anchors every root in the batch and emits RootAnchored per root', async () => {
      const { registry, owner } = await loadFixture(deploy)
      await expect(registry.batchAnchorRoots([ROOT, ROOT_2], [1n, 2n]))
        .to.emit(registry, 'RootAnchored')
        .withArgs(ROOT, 1n, anyValue, owner.address)
        .and.to.emit(registry, 'RootAnchored')
        .withArgs(ROOT_2, 2n, anyValue, owner.address)

      const [existsFirst] = await registry.verifyRoot(ROOT)
      const [existsSecond] = await registry.verifyRoot(ROOT_2)
      expect(existsFirst).to.equal(true)
      expect(existsSecond).to.equal(true)
      expect(await registry.getAnchorCount()).to.equal(2n)
    })

    it('reverts with Length mismatch when the arrays differ in length', async () => {
      const { registry } = await loadFixture(deploy)
      await expect(registry.batchAnchorRoots([ROOT], [1n, 2n])).to.be.revertedWith('Length mismatch')
    })

    it('reverts with Root exists when the batch contains a duplicate root', async () => {
      const { registry } = await loadFixture(deploy)
      await expect(registry.batchAnchorRoots([ROOT, ROOT], [1n, 1n])).to.be.revertedWith('Root exists')
    })
  })

  describe('batchRevokeDocuments', () => {
    it('revokes every document in the batch and emits DocumentRevoked per document', async () => {
      const { registry, owner } = await loadFixture(deploy)
      await expect(registry.batchRevokeDocuments([DOC, DOC_2]))
        .to.emit(registry, 'DocumentRevoked')
        .withArgs(DOC, anyValue, owner.address)
        .and.to.emit(registry, 'DocumentRevoked')
        .withArgs(DOC_2, anyValue, owner.address)

      const [revokedFirst] = await registry.isRevoked(DOC)
      const [revokedSecond] = await registry.isRevoked(DOC_2)
      expect(revokedFirst).to.equal(true)
      expect(revokedSecond).to.equal(true)
      expect(await registry.getRevokedCount()).to.equal(2n)
    })
  })

  describe('authorization', () => {
    it('reverts an unauthorized revoke with Not authorized', async () => {
      const { registry, outsider } = await loadFixture(deploy)
      await expect(registry.connect(outsider).revokeDocument(DOC)).to.be.revertedWith('Not authorized')
    })

    it('blocks anchoring after removeAuthorizedAnchor revokes access', async () => {
      const { registry, anchor } = await loadFixture(deploy)
      await registry.addAuthorizedAnchor(anchor.address)
      await expect(registry.removeAuthorizedAnchor(anchor.address))
        .to.emit(registry, 'AnchorAuthorization')
        .withArgs(anchor.address, false)

      expect(await registry.isAuthorizedAnchor(anchor.address)).to.equal(false)
      await expect(registry.connect(anchor).anchorRoot(ROOT, 1n)).to.be.revertedWith('Not authorized')
    })

    it('guards addAuthorizedAnchor, removeAuthorizedAnchor and transferOwnership with onlyOwner', async () => {
      const { registry, outsider } = await loadFixture(deploy)
      await expect(registry.connect(outsider).addAuthorizedAnchor(outsider.address)).to.be.revertedWith('Not owner')
      await expect(registry.connect(outsider).removeAuthorizedAnchor(outsider.address)).to.be.revertedWith(
        'Not owner',
      )
      await expect(registry.connect(outsider).transferOwnership(outsider.address)).to.be.revertedWith('Not owner')
    })
  })

  describe('transferOwnership', () => {
    it('transfers ownership and emits OwnershipTransferred', async () => {
      const { registry, owner, outsider } = await loadFixture(deploy)
      await expect(registry.transferOwnership(outsider.address))
        .to.emit(registry, 'OwnershipTransferred')
        .withArgs(owner.address, outsider.address)
      expect(await registry.owner()).to.equal(outsider.address)
    })

    it('reverts with Zero owner when transferring to the zero address', async () => {
      const { registry } = await loadFixture(deploy)
      await expect(registry.transferOwnership(ethers.ZeroAddress)).to.be.revertedWith('Zero owner')
    })
  })

  describe('unknown lookups', () => {
    it('reports exists=false for a root that was never anchored', async () => {
      const { registry } = await loadFixture(deploy)
      const [exists] = await registry.verifyRoot(ROOT)
      expect(exists).to.equal(false)
    })

    it('reports revoked=false for a document hash that was never revoked', async () => {
      const { registry } = await loadFixture(deploy)
      const [revoked] = await registry.isRevoked(DOC)
      expect(revoked).to.equal(false)
    })
  })
})
