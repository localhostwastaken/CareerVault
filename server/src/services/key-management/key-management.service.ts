// Custodial document-signing (R3) and field-encryption data-key (R10) abstraction. Callers
// depend only on this token; the concrete driver (LocalKms today, AwsKms later) is
// selected by ConfigService.
export interface OrgKeyPair {
  kmsKeyId: string;
  publicKeyPem: string;
}

/** A fresh data-encryption key: use `plaintext`, persist only `wrapped` + `keyId`. */
export interface DataKey {
  plaintext: Buffer;
  wrapped: string;
  keyId: string;
}

/**
 * A wrapped data key could not be unwrapped: it was wrapped under a key this deployment
 * does not hold (`keyId`, from the envelope, vs `expectedKeyId`, the one it is configured
 * with), or it failed authentication.
 *
 * Kept apart from a per-field decryption failure on purpose: a master-key mismatch breaks
 * every encrypted row at once and is fixed by configuration, not by touching the data.
 */
export class DataKeyUnavailableError extends Error {
  constructor(
    readonly keyId: string,
    readonly expectedKeyId: string,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DataKeyUnavailableError';
  }

  /**
   * The envelope names a key this deployment does not hold. That is what a wrong
   * KMS_MASTER_KEY looks like on every row, and one edited row looks the same, so it is
   * reported as a deployment fault. Under our own key id, only the row can be damaged.
   */
  get keyMismatch(): boolean {
    return this.keyId !== this.expectedKeyId;
  }
}

/**
 * The key reference resolved, but its material could not be read or decrypted.
 *
 * Distinct from a generic failure on purpose: this is an operational fault (the key store
 * was not persisted), not a caller mistake, and the feature layer turns it into a message
 * that says so rather than a bare 500.
 */
export class SigningKeyUnavailableError extends Error {
  constructor(
    readonly kmsKeyId: string,
    detail: string,
    readonly cause?: unknown,
  ) {
    super(`Signing key "${kmsKeyId}" is unavailable: ${detail}`);
    this.name = 'SigningKeyUnavailableError';
  }
}

export abstract class KeyManagementService {
  /** Create an RSA signing key pair for an org; returns a key reference + public key (PEM). */
  abstract generateOrgKeyPair(orgId: string): Promise<OrgKeyPair>;

  /** Sign a document hash (hex) with the org's private key. Returns base64 (RS256). */
  abstract sign(kmsKeyId: string, documentHashHex: string): Promise<string>;

  /**
   * Whether the key material behind `kmsKeyId` is actually reachable.
   *
   * The reference is stored in Postgres while the material lives wherever the driver puts
   * it, so the two can drift — a local driver on a container without a persistent disk
   * loses the material on every deploy while the DB pointer survives. Callers must check
   * this before signing instead of discovering the gap as an unhandled read error.
   */
  abstract hasKey(kmsKeyId: string): Promise<boolean>;

  /** Verify a base64 signature over a document hash (hex) using a public key (PEM). */
  abstract verify(
    publicKeyPem: string,
    documentHashHex: string,
    signatureB64: string,
  ): Promise<boolean>;

  // These two mirror AWS KMS GenerateDataKey / Decrypt, so field encryption (R10) moves
  // to AwsKms without FieldCipher or any stored envelope changing shape.
  abstract generateDataKey(): Promise<DataKey>;

  /** Rejects with DataKeyUnavailableError when this deployment cannot open `wrapped`. */
  abstract decryptDataKey(wrapped: string, keyId: string): Promise<Buffer>;
}
