import { SkillService } from './skill.service.js';
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

describe('SkillService lifecycle logging and extraction', () => {
  const documentId = 'ec775677-9407-4a97-9fbd-e2d541bcc93a';
  const sampleContentJson = {
    credentialSubject: {
      candidateName: 'Alice Secret',
      email: 'alice@secret.example',
      phone: '+1234567890',
      basicPaise: 5000000,
      annualCtcPaise: 60000000,
      designation: 'Intern',
    },
  };

  function createFixture(overrides?: {
    doc?: Record<string, unknown> | null;
    extractSkillsResult?: {
      skills: string[];
      jobTitle?: string;
      seniority?: string;
    };
    extractSkillsError?: Error;
    embedResult?: number[];
  }) {
    const logs: string[] = [];
    const errors: string[] = [];
    const warns: string[] = [];
    let extractSkillsCalls = 0;
    let embedCalls = 0;
    let upsertCalls = 0;
    let rawQueryCalls = 0;

    const doc =
      overrides?.doc !== undefined
        ? overrides.doc
        : {
            id: documentId,
            status: 'ISSUED',
            enableSkillExtraction: true,
            contentJson: sampleContentJson,
          };

    const prisma = {
      document: {
        findUnique: () => Promise.resolve(doc),
      },
      extractedSkill: {
        upsert: () => {
          upsertCalls++;
          return Promise.resolve({ id: 'skill-uuid-1' });
        },
      },
      $executeRaw: () => {
        rawQueryCalls++;
        return Promise.resolve(1);
      },
    };

    const extractionError = overrides?.extractSkillsError;
    const ai = {
      extractSkills: extractionError
        ? () => {
            extractSkillsCalls++;
            return Promise.reject(extractionError);
          }
        : () => {
            extractSkillsCalls++;
            return Promise.resolve(
              overrides?.extractSkillsResult ?? {
                skills: ['TypeScript', 'Node.js'],
                jobTitle: 'Software Engineer Intern',
                seniority: 'JUNIOR',
              },
            );
          },
      embed: () => {
        embedCalls++;
        return Promise.resolve(
          overrides?.embedResult ?? new Array(384).fill(0.01),
        );
      },
    };

    const service = new SkillService(prisma as never, ai as never);
    Object.assign(service, {
      logger: {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
        warn: (msg: string) => warns.push(msg),
      },
    });

    return {
      service,
      logs,
      errors,
      warns,
      getExtractSkillsCalls: () => extractSkillsCalls,
      getEmbedCalls: () => embedCalls,
      getUpsertCalls: () => upsertCalls,
      getRawQueryCalls: () => rawQueryCalls,
    };
  }

  it('logs extraction started and completed on success with document ID, text length, and skill count', async () => {
    const {
      service,
      logs,
      errors,
      warns,
      getExtractSkillsCalls,
      getUpsertCalls,
    } = createFixture();

    await service.extractForDocument(documentId);

    expect(logs).toEqual([
      `Skill extraction started for ${documentId} (text length: 6)`,
      `Skill extraction completed for ${documentId}: 2 skill(s) extracted`,
    ]);
    expect(errors).toHaveLength(0);
    expect(warns).toHaveLength(0);
    expect(getExtractSkillsCalls()).toBe(1);
    expect(getUpsertCalls()).toBe(1);
  });

  it('logs extraction started and failed on AI service failure and re-throws the error', async () => {
    const aiError = new ServiceUnavailableException(
      'AI service is unavailable',
    );
    const { service, logs, errors, getExtractSkillsCalls, getUpsertCalls } =
      createFixture({
        extractSkillsError: aiError,
      });

    await expect(service.extractForDocument(documentId)).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(logs).toEqual([
      `Skill extraction started for ${documentId} (text length: 6)`,
    ]);
    expect(errors).toEqual([
      `Skill extraction failed for ${documentId}: AI service is unavailable`,
    ]);
    expect(getExtractSkillsCalls()).toBe(1);
    expect(getUpsertCalls()).toBe(0);
  });

  it('never logs document text, salaries, names, emails, phone numbers, or contentJson', async () => {
    const { service, logs, errors } = createFixture();

    await service.extractForDocument(documentId);

    const allOutput = [...logs, ...errors].join('\n');
    expect(allOutput).not.toContain('Alice Secret');
    expect(allOutput).not.toContain('alice@secret.example');
    expect(allOutput).not.toContain('+1234567890');
    expect(allOutput).not.toContain('5000000');
    expect(allOutput).not.toContain('60000000');
    expect(allOutput).not.toContain('credentialSubject');
    // Notice that while text length is 6, the raw text itself ('Intern') is not logged
    expect(allOutput).not.toContain('text: Intern');
  });

  it('returns early without logging start or completion when extractable text is empty', async () => {
    const { service, logs, errors, getExtractSkillsCalls } = createFixture({
      doc: {
        id: documentId,
        status: 'ISSUED',
        enableSkillExtraction: true,
        contentJson: {
          credentialSubject: {
            basicPaise: 5000000,
          },
        },
      },
    });

    await service.extractForDocument(documentId);

    expect(logs).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(getExtractSkillsCalls()).toBe(0);
  });

  it('enforces consent guard before starting extraction', async () => {
    const { service, logs, getExtractSkillsCalls } = createFixture({
      doc: {
        id: documentId,
        status: 'ISSUED',
        enableSkillExtraction: false,
        contentJson: sampleContentJson,
      },
    });

    await expect(service.extractForDocument(documentId)).rejects.toThrow(
      ForbiddenException,
    );
    expect(logs).toHaveLength(0);
    expect(getExtractSkillsCalls()).toBe(0);
  });

  it('enforces status guard before starting extraction', async () => {
    const { service, logs, getExtractSkillsCalls } = createFixture({
      doc: {
        id: documentId,
        status: 'DRAFT',
        enableSkillExtraction: true,
        contentJson: sampleContentJson,
      },
    });

    await expect(service.extractForDocument(documentId)).rejects.toThrow(
      ConflictException,
    );
    expect(logs).toHaveLength(0);
    expect(getExtractSkillsCalls()).toBe(0);
  });

  it('throws NotFoundException if document does not exist', async () => {
    const { service, logs, getExtractSkillsCalls } = createFixture({
      doc: null,
    });

    await expect(service.extractForDocument(documentId)).rejects.toThrow(
      NotFoundException,
    );
    expect(logs).toHaveLength(0);
    expect(getExtractSkillsCalls()).toBe(0);
  });
});
