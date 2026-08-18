// Custodial document-signing abstraction (R3). Callers depend only on this token;
// the concrete driver (LocalKms today, AwsKms later) is selected by ConfigService.
export interface OrgKeyPair {
  kmsKeyId: string;
  publicKeyPem: string;
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
}
