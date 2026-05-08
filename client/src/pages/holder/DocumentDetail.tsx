import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Link2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge, AnchorBadge } from "@/components/shared/StatusBadge";
import { HashChip } from "@/components/shared/HashChip";
import { DocumentPreview } from "@/features/documents/components/DocumentPreview";
import { SixStepCheck } from "@/features/verification/components/SixStepCheck";
import { evaluateSteps } from "@/features/verification/buildSteps";
import { findDocument } from "@/mocks/documents";
import { mockMerkleRoots, polygonScanUrl } from "@/mocks/merkleRoots";
import { DOCUMENT_TYPE_LABEL } from "@/features/documents/types";

const DocumentDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doc = findDocument(id);
  const root = useMemo(
    () => (doc?.merkleProof ? mockMerkleRoots.find((r) => r.id === doc.merkleProof?.rootId) : undefined),
    [doc],
  );
  const results = useMemo(() => (doc ? evaluateSteps(doc) : []), [doc]);

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-sm text-text-muted">Document not found.</p>
        <Link to="/holder/documents" className="mt-4 inline-block">
          <Button variant="outline">Back to documents</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <PageHeader
        title={DOCUMENT_TYPE_LABEL[doc.type]}
        description={`${doc.content.role} · Document ${doc.id}`}
        actions={
          <>
            <StatusBadge status={doc.status} />
            {doc.status === "anchored" ? <AnchorBadge /> : null}
            {doc.status === "anchored" || doc.status === "issued" ? (
              <Link to="/holder/links">
                <Button>
                  <Link2 />
                  Generate share link
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <DocumentPreview doc={doc} />

          {doc.pdfUrl ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <a href={doc.pdfUrl} download>
                  <Download /> Download PDF
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href={`/verify/abc-123-def-456`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open public verifier
                </a>
              </Button>
              {doc.status !== "revoked" && doc.status !== "expired" ? (
                <Button variant="ghost" className="text-revoked hover:bg-revoked-soft">
                  <ShieldOff /> Request revocation
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Verification report</h2>
              <p className="mt-1 text-xs text-text-muted">Six-step cryptographic check</p>
              <div className="mt-4">
                <SixStepCheck results={results} autoPlay={false} />
              </div>
            </CardContent>
          </Card>

          {root ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Blockchain anchor</h2>
                  <a
                    href={polygonScanUrl(root.polygonTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Polygonscan <ExternalLink className="size-3" />
                  </a>
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label="Block">
                    <span className="font-mono text-xs tnum">{root.blockNumber.toLocaleString()}</span>
                  </Row>
                  <Row label="Anchored">{root.date}</Row>
                  <Row label="Documents in batch">{root.documentCount}</Row>
                  <Row label="Tx hash"><HashChip hash={root.polygonTxHash} /></Row>
                  <Row label="Merkle root"><HashChip hash={root.rootHash} /></Row>
                  <Row label="Document hash"><HashChip hash={doc.contentHash} /></Row>
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-xs uppercase tracking-wider text-text-subtle">{label}</dt>
    <dd className="text-text">{children}</dd>
  </div>
);

export default DocumentDetail;
