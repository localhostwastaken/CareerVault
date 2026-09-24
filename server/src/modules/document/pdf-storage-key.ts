// Where an issued document's PDF lives in StorageService. One definition, so GDPR erasure
// deletes exactly the object that issuance and anchoring wrote.
export function pdfStorageKey(documentId: string): string {
  return `documents/${documentId}.pdf`;
}
