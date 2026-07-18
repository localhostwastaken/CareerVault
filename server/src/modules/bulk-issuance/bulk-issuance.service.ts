import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KeyManagementService } from '../../services/key-management/key-management.service.js';
import { generateSalt, hashDocument } from '../../common/utils/crypto.util.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { MagicLinkService } from '../auth/magic-link.service.js';
import { DocumentService } from '../document/document.service.js';
import { EXPIRY_DAYS, TYPE_LABEL } from '../document/document.constants.js';
import { PdfGenerationService } from '../document/pdf-generation.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { parseAndValidateCsv, type BulkIssuanceRow } from './csv-row.util.js';
import type { UploadBulkIssuanceDto } from './dto/upload-bulk-issuance.dto.js';

type OrgLike = {
  id: string;
  name: string;
  domain: string;
  kmsKeyId: string | null;
};
type HrMember = { id: string; userId: string };

// Bulk issuance (SystemDesign §4.15/§6.4): HR uploads a CSV and the batch is issued straight to ISSUED, skipping PENDING_HR - HR acts as both signer and approver, so managerSignature and hrSignature are the same KMS signature.
@Injectable()
export class BulkIssuanceService {
  private readonly logger = new Logger(BulkIssuanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kms: KeyManagementService,
    private readonly pdf: PdfGenerationService,
    private readonly notifications: NotificationService,
    private readonly magicLink: MagicLinkService,
    private readonly documents: DocumentService,
  ) {}

  async upload(
    actor: AuthenticatedUser,
    dto: UploadBulkIssuanceDto,
    file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException('CSV file is required');
    }
    const hrMember = await this.documents.requireMember(
      actor.id,
      dto.organizationId,
      ['HR', 'ORG_ADMIN'],
    );
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: dto.organizationId },
    });
    if (!org.isVerified) {
      throw new UnprocessableEntityException(
        'Organization is not verified yet',
      );
    }

    const parsed = parseAndValidateCsv(file.buffer, dto.documentType);
    if (parsed.errors) {
      throw new UnprocessableEntityException({
        message: 'CSV validation failed',
        errors: parsed.errors,
      });
    }

    const batch = await this.prisma.bulkIssuanceBatch.create({
      data: {
        organizationId: org.id,
        initiatedById: hrMember.id,
        documentType: dto.documentType,
        totalRows: parsed.rows.length,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorType: 'USER',
        action: 'BULK_ISSUANCE_STARTED',
        entityType: 'ORGANIZATION',
        entityId: org.id,
        retentionTier: 'COMPLIANCE',
        newValue: { batchId: batch.id, totalRows: batch.totalRows },
      },
    });

    // No queue infra yet, so this runs in-process without blocking the response, mirroring the existing best-effort async style used for skill extraction in DocumentService.
    void this.processBatch(
      batch.id,
      parsed.rows,
      org,
      hrMember,
      dto.documentType,
    ).catch((error: unknown) =>
      this.logger.error(`Bulk batch ${batch.id} crashed: ${String(error)}`),
    );

    return this.present(batch.id);
  }

  async list(actor: AuthenticatedUser, organizationId: string) {
    await this.documents.requireMember(actor.id, organizationId, [
      'HR',
      'ORG_ADMIN',
    ]);
    const batches = await this.prisma.bulkIssuanceBatch.findMany({
      where: { organizationId },
      orderBy: { startedAt: 'desc' },
    });
    return batches.map((b) => this.toPublic(b));
  }

  async get(actor: AuthenticatedUser, id: string) {
    const batch = await this.prisma.bulkIssuanceBatch.findUnique({
      where: { id },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    await this.documents.requireMember(actor.id, batch.organizationId, [
      'HR',
      'ORG_ADMIN',
    ]);
    return this.toPublic(batch);
  }

  private async present(id: string) {
    const batch = await this.prisma.bulkIssuanceBatch.findUniqueOrThrow({
      where: { id },
    });
    return this.toPublic(batch);
  }

  private toPublic(batch: {
    id: string;
    organizationId: string;
    documentType: string;
    status: string;
    totalRows: number;
    processedRows: number;
    errorRows: number;
    errorsJson: unknown;
    startedAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: batch.id,
      organizationId: batch.organizationId,
      documentType: batch.documentType,
      status: batch.status,
      totalRows: batch.totalRows,
      processedRows: batch.processedRows,
      errorRows: batch.errorRows,
      errors: batch.errorsJson,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
    };
  }

  private async processBatch(
    batchId: string,
    rows: BulkIssuanceRow[],
    org: OrgLike,
    hrMember: HrMember,
    documentType: 'EXPERIENCE_LETTER' | 'SALARY_PROOF',
  ): Promise<void> {
    const kmsKeyId = await this.documents.ensureOrgKey(org);
    const errors: Array<{ row: number; email: string; error: string }> = [];
    let processed = 0;

    for (const [index, row] of rows.entries()) {
      try {
        await this.issueOne(row, org, hrMember, documentType, kmsKeyId);
        processed += 1;
      } catch (error) {
        errors.push({
          row: index + 2,
          email: row.employeeEmail,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      await this.prisma.bulkIssuanceBatch.update({
        where: { id: batchId },
        data: {
          processedRows: processed,
          errorRows: errors.length,
          errorsJson: errors,
        },
      });
    }

    await this.prisma.bulkIssuanceBatch.update({
      where: { id: batchId },
      data: {
        status: errors.length === rows.length ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: hrMember.userId,
        actorType: 'USER',
        action: 'BULK_ISSUANCE_COMPLETED',
        entityType: 'ORGANIZATION',
        entityId: org.id,
        retentionTier: 'COMPLIANCE',
        newValue: { batchId, processed, errors: errors.length },
      },
    });

    await this.notifications.notify(
      hrMember.userId,
      'DOCUMENT_ISSUED',
      'Bulk issuance complete',
      `${processed}/${rows.length} ${TYPE_LABEL[documentType]}s issued successfully.`,
    );
  }

  private async issueOne(
    row: BulkIssuanceRow,
    org: OrgLike,
    hrMember: HrMember,
    documentType: 'EXPERIENCE_LETTER' | 'SALARY_PROOF',
    kmsKeyId: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: row.employeeEmail },
    });
    const holder =
      existing ??
      (await this.prisma.user.create({
        data: { email: row.employeeEmail, fullName: row.fullName },
      }));

    const contentJson: Prisma.InputJsonObject = {
      employeeName: row.fullName,
      employeeEmail: row.employeeEmail,
      designation: row.designation,
      department: row.department,
      startDate: row.startDate,
      ...(row.endDate ? { endDate: row.endDate } : {}),
      ...(documentType === 'SALARY_PROOF' && row.salary
        ? { salary: row.salary }
        : {}),
    };
    const salt = generateSalt();
    const documentHash = hashDocument(contentJson, salt);
    // Dual-role signing (spec §6.4): HR is both signer and approver in bulk issuance,
    // so a single KMS signature fills both manager and HR signature fields.
    const signature = await this.kms.sign(kmsKeyId, documentHash);
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000);

    const doc = await this.prisma.document.create({
      data: {
        type: documentType,
        status: 'ISSUED',
        holderId: holder.id,
        organizationId: org.id,
        signerMemberId: hrMember.id,
        approverMemberId: hrMember.id,
        contentJson,
        salt,
        documentHash,
        managerSignature: signature,
        hrSignature: signature,
        issuedAt: new Date(),
        expiresAt,
      },
    });

    const pdfUrl = await this.pdf.generateAndStore(
      { id: doc.id, type: doc.type, documentHash, contentJson },
      { name: org.name, domain: org.domain },
    );
    await this.prisma.document.update({
      where: { id: doc.id },
      data: { renderedPdfUrl: pdfUrl },
    });

    if (!existing) {
      // New holder (R9-style): passwordless, needs a magic link to access their wallet.
      await this.magicLink.request(row.employeeEmail, 'EMAIL_VERIFY');
    } else {
      await this.notifications.notify(
        holder.id,
        'DOCUMENT_ISSUED',
        `Your ${TYPE_LABEL[documentType]} is ready`,
        `Your ${TYPE_LABEL[documentType]} from ${org.name} has been issued.`,
        { emailTo: holder.email },
      );
    }
  }
}
