// Custodial document-signing abstraction (R3). Callers depend only on this token;
// the concrete driver (LocalKms today, AwsKms later) is selected by ConfigService.
export interface OrgKeyPair {
  kmsKeyId: string;
  publicKeyPem: string;
}

export abstract class KeyManagementService {
  /** Create an RSA signing key pair for an org; returns a key reference + public key (PEM). */
  abstract generateOrgKeyPair(orgId: string): Promise<OrgKeyPair>;

  /** Sign a document hash (hex) with the org's private key. Returns base64 (RS256). */
  abstract sign(kmsKeyId: string, documentHashHex: string): Promise<string>;

  /** Verify a base64 signature over a document hash (hex) using a public key (PEM). */
  abstract verify(
    publicKeyPem: string,
    documentHashHex: string,
    signatureB64: string,
  ): Promise<boolean>;
}
