import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
} from '../../common/utils/merkle.util.js';
import { NotificationService } from '../notification/notification.service.js';
import { PdfGenerationService } from '../document/pdf-generation.service.js';
import type { Prisma } from '../../generated/prisma/client.js';

const TYPE_LABEL: Record<string, string> = {
  EXPERIENCE_LETTER: 'experience letter',
  LETTER_OF_RECOMMENDATION: 'letter of recommendation',
  SALARY_PROOF: 'salary proof',
};

export interface BatchResult {
  anchored: number;
  rootHash: string | null;
  txHash: string | null;
}

@Injectable()
export class MerkleService {
  private readonly logger = new Logger(MerkleService.name);
  // In-process mutex: the cron and a manual /merkle/run on the same node must not
  // overlap (would double-anchor). Cross-process safety additionally rests on the
  // deterministic-root + verifyRoot idempotency guard below.
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
    private readonly notifications: NotificationService,
    private readonly pdf: PdfGenerationService,
  ) {}

  // Anchoring pipeline (R2/R7). Gathers unanchored ISSUED documents (optionally scoped
  // to one org), builds a Merkle tree over their R4 document hashes, anchors the root,
  // then atomically persists the MerkleRoot + per-document proofs and flips each to
  // ANCHORED. Idempotent: re-running over the same documents yields the same root, which
  // verifyRoot detects so we never double-anchor; a failed DB write self-heals next run.
  async runBatch(organizationId?: string): Promise<BatchResult> {
    if (this.running) {
      this.logger.warn(
        'Merkle batch already in progress; skipping overlapping run',
      );
      return { anchored: 0, rootHash: null, txHash: null };
    }
    this.running = true;
    try {
      const docs = await this.prisma.document.findMany({
        where: {
          status: 'ISSUED',
          documentHash: { not: null },
          merkleProof: { is: null },
          ...(organizationId ? { organizationId } : {}),
        },
        orderBy: [{ issuedAt: 'asc' }, { id: 'asc' }],
        select: { id: true, documentHash: true, holderId: true, type: true },
      });
      if (docs.length === 0) {
        this.logger.log('Merkle batch: nothing to anchor');
        return { anchored: 0, rootHash: null, txHash: null };
      }

      const leaves = docs.map((doc) => doc.documentHash as string);
      const tree = buildMerkleTree(leaves);
      const rootHash = merkleRootHex(tree);

      // Anchor on-chain only if this exact root isn't already anchored. This makes the
      // batch safe to retry after a partial failure without spending a second tx.
      const existing = await this.blockchain.verifyRoot(rootHash);
      const receipt = existing.exists
        ? null
        : await this.blockchain.anchorRoot(rootHash, docs.length);

      await this.prisma.$transaction(async (tx) => {
        const root = await tx.merkleRoot.create({
          data: {
            rootHash,
            polygonTxHash: receipt?.txHash ?? null,
            polygonBlockNumber: receipt ? BigInt(receipt.blockNumber) : null,
            documentCount: docs.length,
            anchoredAt: receipt?.anchoredAt ?? existing.anchoredAt ?? null,
          },
        });
        for (let index = 0; index < docs.length; index++) {
          await tx.documentMerkleProof.create({
            data: {
              documentId: docs[index].id,
              merkleRootId: root.id,
              proofPath: merkleProofFor(
                tree,
                leaves[index],
              ) as unknown as Prisma.InputJsonValue,
              leafIndex: index,
            },
          });
          await tx.document.update({
            where: { id: docs[index].id },
            data: { status: 'ANCHORED' },
          });
        }
      });

      // Post-commit side effects are best-effort and never authoritative (R7), so each
      // is independently guarded — one holder's failure must not abort the rest.
      const txHash = receipt?.txHash ?? null;
      for (const doc of docs) {
        await this.pdf
          .embedAnchorMetadata(doc.id, { rootHash, txHash: txHash ?? '' })
          .catch((error) =>
            this.logger.warn(`PDF anchor embed failed for ${doc.id}: ${error}`),
          );
        await this.notifyHolder(doc.holderId, doc.type).catch((error) =>
          this.logger.warn(
            `Anchor notification failed for ${doc.id}: ${error}`,
          ),
        );
      }

      this.logger.log(
        `Merkle batch: anchored ${docs.length} document(s) under root ${rootHash}`,
      );
      return { anchored: docs.length, rootHash, txHash };
    } finally {
      this.running = false;
    }
  }

  async listBatches(organizationId?: string, limit = 20) {
    const roots = await this.prisma.merkleRoot.findMany({
      where: organizationId
        ? { proofs: { some: { document: { organizationId } } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return roots.map((root) => ({
      id: root.id,
      rootHash: root.rootHash,
      txHash: root.polygonTxHash,
      blockNumber: root.polygonBlockNumber
        ? Number(root.polygonBlockNumber)
        : null,
      documentCount: root.documentCount,
      anchoredAt: root.anchoredAt,
      createdAt: root.createdAt,
    }));
  }

  private async notifyHolder(userId: string, type: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    await this.notifications.notify(
      userId,
      'DOCUMENT_ANCHORED',
      'Document anchored on-chain',
      `Your ${TYPE_LABEL[type] ?? 'document'} is now anchored and independently verifiable.`,
      user ? { emailTo: user.email } : undefined,
    );
  }
}
