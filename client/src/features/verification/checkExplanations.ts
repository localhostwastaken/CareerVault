// What each of the server's five checks means, keyed by the check's `key`. Plain sentences
// for a verifier, and deliberately free of algorithm names: the verifier is told what was
// proven, not how to re-prove it (the server holds the keys that would need).
export const CHECK_EXPLANATIONS: Record<string, string> = {
  exists:
    'The document is in the issuer’s register and was actually issued. A draft or a returned request never passes.',
  integrity:
    'The server decrypts the stored record and rebuilds it byte by byte. Changing a single character anywhere, or moving it to another person, fails this check.',
  managerSignature:
    'The manager sealed the document with a personal key that only unlocks with their own answers, and the organisation’s signature covers that seal.',
  hrSignature:
    'HR co-signed separately with their own personal key, so the two signatures are two different people’s acts.',
  status:
    'Revocation and expiry come from the issuer’s register, which has the final say.',
}

// The five checks in the order the server runs and returns them.
export const VERIFICATION_CHECKS = [
  { key: 'exists', label: 'Issued document on record' },
  { key: 'integrity', label: 'Content unchanged since signing' },
  { key: 'managerSignature', label: 'Manager signature' },
  { key: 'hrSignature', label: 'HR co-signature' },
  { key: 'status', label: 'Not revoked or expired' },
] as const
