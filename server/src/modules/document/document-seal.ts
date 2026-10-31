import type { DocumentIdentity } from '../../common/crypto/document-bytes.js';
import {
  employeeSeal,
  signingStatementHash,
} from '../../common/utils/crypto.util.js';
import type { KeyManagementService } from '../../services/key-management/key-management.service.js';
import type { UnlockedKey } from '../employee-key/employee-key.service.js';

// One signer's half of the dual signature (R3, C1), the same for the manager at sign and HR
// at approve:
//   seal      = HMAC-SHA256(signer's employee key, document bytes)
//   signature = RSA-2048 over SHA-256(statement(documentHash, seal, role, memberId, keyId))
// The employee key is wiped as soon as the seal exists; nothing else needs it.
export async function sealAndSign(
  kms: KeyManagementService,
  kmsKeyId: string,
  input: {
    bytes: Buffer;
    documentHash: string;
    unlocked: UnlockedKey;
    role: 'MANAGER' | 'HR';
    memberId: string;
  },
): Promise<{ seal: string; signature: string }> {
  const seal = employeeSeal(input.unlocked.key, input.bytes);
  input.unlocked.key.fill(0);
  const signature = await kms.sign(
    kmsKeyId,
    signingStatementHash({
      documentHash: input.documentHash,
      seal,
      role: input.role,
      memberId: input.memberId,
      employeeKeyId: input.unlocked.keyId,
    }),
  );
  return { seal, signature };
}

export function documentIdentity(doc: {
  id: string;
  type: string;
  organizationId: string;
  holderId: string;
}): DocumentIdentity {
  return {
    id: doc.id,
    type: doc.type,
    organizationId: doc.organizationId,
    holderId: doc.holderId,
  };
}
