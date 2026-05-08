import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Anchor, ExternalLink, ShieldCheck, ShieldX, Clock4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HashChip } from "@/components/shared/HashChip";
import { findShareLinkByToken } from "@/mocks/shareLinks";
import { findDocument } from "@/mocks/documents";
import { mockMerkleRoots, polygonScanUrl, ipfsGatewayUrl } from "@/mocks/merkleRoots";
import { evaluateSteps } from "@/features/verification/buildSteps";
import { SixStepCheck } from "@/features/verification/components/SixStepCheck";
import { MerkleProofViz } from "@/features/verification/components/MerkleProofViz";
import { DocumentPreview } from "@/features/documents/components/DocumentPreview";
import { formatDate } from "@/lib/format";

const Verify = () => {
  const { token = "abc-123-def-456" } = useParams<{ token: string }>();
  const link = findShareLinkByToken(token) ?? findShareLinkByToken("abc-123-def-456");
  const doc = link ? findDocument(link.documentId) : undefined;
  const root = useMemo(
    () => (doc?.merkleProof ? mockMerkleRoots.find((r) => r.id === doc.merkleProof?.rootId) : undefined),
    [doc],
  );
  const results = useMemo(() => (doc ? evaluateSteps(doc) : []), [doc]);
  const allPass = results.every((r) => r.state === "passed");

  if (!link || !doc) return <NotFound token={token} />;

  return (
    <div className="min-h-screen bg-bg">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Verdict allPass={allPass} doc={doc} />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text">
                  Six-step verification
                </h2>
              </div>
              <SixStepCheck results={results} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <DocumentPreview doc={doc} />

            {doc.merkleProof && root ? (
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Anchor className="size-4 text-anchor" />
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-text">
                        Cryptographic proof
                      </h2>
                    </div>
                    <a
                      href={polygonScanUrl(root.polygonTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      View on Polygon
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <MerkleProofViz
                    rootHash={root.rootHash}
                    proofPath={doc.merkleProof.path.length ? doc.merkleProof.path : ["0x1f", "0x4a", "0x9c"]}
                    leafHash={doc.contentHash}
                    leafIndex={doc.merkleProof.leafIndex}
                  />
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <Detail label="Anchored on" value={formatDate(root.date, "MMM d, yyyy")} />
                    <Detail label="Block #" value={root.blockNumber.toLocaleString()} mono />
                    <Detail label="Documents in batch" value={root.documentCount.toString()} />
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span>Merkle tx</span>
                    <HashChip hash={root.polygonTxHash} />
                    <span>· IPFS</span>
                    <a
                      href={ipfsGatewayUrl(root.ipfsCid)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      <HashChip hash={root.ipfsCid} prefix="" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-text-subtle">
          Verified by CareerVault · Public verification powered by the Polygon blockchain · No login required
        </footer>
      </main>
    </div>
  );
};

const Verdict = ({ allPass, doc }: { allPass: boolean; doc: ReturnType<typeof findDocument> }) => {
  if (!doc) return null;
  if (doc.status === "revoked") {
    return (
      <Banner tone="revoked" icon={<ShieldX className="size-5" />} title="This document has been revoked">
        Reason: {doc.revokedReason ?? "No reason provided"}. Revoked on{" "}
        {doc.revokedAt ? formatDate(doc.revokedAt) : "unknown date"}.
      </Banner>
    );
  }
  if (doc.status === "expired") {
    return (
      <Banner tone="expired" icon={<Clock4 className="size-5" />} title="This document has expired">
        Documents older than 90 days expire automatically. Ask the holder to refresh.
      </Banner>
    );
  }
  return (
    <Banner tone={allPass ? "verified" : "revoked"} icon={<ShieldCheck className="size-5" />} title={allPass ? "Document verified" : "Verification failed"}>
      {allPass
        ? "All six cryptographic checks passed. This document is authentic, untampered, and anchored on Polygon."
        : "One or more verification steps failed. See the breakdown below for details."}
    </Banner>
  );
};

const Banner = ({
  tone,
  icon,
  title,
  children,
}: {
  tone: "verified" | "revoked" | "expired";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => {
  const styles = {
    verified: "bg-verified-soft border-verified text-verified",
    revoked: "bg-revoked-soft border-revoked text-revoked",
    expired: "bg-expired-soft border-expired text-expired",
  } as const;
  return (
    <div className={`rounded-xl border-2 px-5 py-4 ${styles[tone]}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <h1 className="text-base font-bold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-sm opacity-90">{children}</p>
        </div>
      </div>
    </div>
  );
};

const Detail = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">{label}</p>
    <p className={`text-sm font-semibold text-text ${mono ? "font-mono tnum" : ""}`}>{value}</p>
  </div>
);

const PublicHeader = () => (
  <header className="border-b border-border bg-surface">
    <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="size-4 text-white" strokeWidth={2.5} />
        </span>
        <span className="text-sm font-bold tracking-tight text-text">CareerVault</span>
      </Link>
      <Link to="/auth/register">
        <Button size="sm" variant="outline">
          Get verified documents
        </Button>
      </Link>
    </div>
  </header>
);

const NotFound = ({ token }: { token: string }) => (
  <div className="flex min-h-screen items-center justify-center p-4">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-text">Link not found</h1>
      <p className="mt-2 text-sm text-text-muted">No document is associated with token {token}.</p>
      <Link to="/" className="mt-4 inline-block">
        <Button>Back to home</Button>
      </Link>
    </div>
  </div>
);

export default Verify;
