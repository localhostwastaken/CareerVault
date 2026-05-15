import { useState } from "react";
import { Copy, ExternalLink, Eye, Link2, Plus, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { PaywallDialog } from "@/features/billing/components/PaywallDialog";
import { mockShareLinks } from "@/mocks/shareLinks";
import { documentsByHolder } from "@/mocks/documents";
import { ACTIVE_HOLDER } from "@/mocks/users";
import { formatDate, formatRelative } from "@/lib/format";
import { COPY } from "@/lib/labels";
import { DOCUMENT_TYPE_LABEL } from "@/features/documents/types";

const HolderShareLinks = () => {
  const docs = documentsByHolder(ACTIVE_HOLDER.id);
  const docIds = new Set(docs.map((d) => d.id));
  const links = mockShareLinks.filter((l) => docIds.has(l.documentId));
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);

  const eligible = docs.filter((d) => d.status === "anchored" || d.status === "issued");
  const firstEligible = eligible[0];

  const handlePaid = () => {
    setPaywallOpen(false);
    const token = `cv-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 8)}`;
    setGenerated(`${window.location.origin}/verify/${token}`);
  };

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title={COPY.shareLinks}
        description="Generate links recruiters can open without an account. Each opens a six-step verification report."
        actions={
          <Button onClick={() => setPaywallOpen(true)} disabled={eligible.length === 0}>
            <Plus />
            {COPY.generateShareLink}
          </Button>
        }
      />

      {generated ? (
        <Card className="mt-6 border-verified">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-verified-soft text-verified">
                <Link2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">Share link generated</p>
                <p className="truncate font-mono text-xs text-text-muted tnum">{generated}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(generated)}>
              <Copy /> Copy
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {links.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Link2}
          title="No share links yet"
          description="Generate your first share link to send a recruiter a verification report."
          action={
            <Button onClick={() => setPaywallOpen(true)} disabled={eligible.length === 0}>
              <Plus /> {COPY.generateShareLink}
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {links.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text">{l.documentTitle}</p>
                      <Badge tone={l.status === "active" ? "verified" : l.status === "expired" ? "expired" : "revoked"}>
                        {l.status === "active" ? "Active" : l.status === "expired" ? "Expired" : "Revoked"}
                      </Badge>
                      {l.type === "premium" ? <Badge tone="primary">Premium</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {l.recipientLabel ?? "No recipient note"} · created {formatRelative(l.createdAt)}
                    </p>
                    <p className="mt-2 inline-flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" /> {l.views}{l.maxViews ? ` / ${l.maxViews}` : ""} views
                      </span>
                      {l.expiresAt ? <span>Expires {formatDate(l.expiresAt)}</span> : <span>No expiry</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={`/verify/${l.token}`} target="_blank" rel="noreferrer">
                        <ExternalLink /> Open
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigator.clipboard?.writeText(`${window.location.origin}/verify/${l.token}`)
                      }
                    >
                      <Copy /> Copy
                    </Button>
                    {l.status === "active" ? (
                      <Button size="sm" variant="ghost" className="text-revoked hover:bg-revoked-soft">
                        <ShieldOff /> Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        documentTitle={firstEligible ? DOCUMENT_TYPE_LABEL[firstEligible.type] : "your document"}
        onPaid={handlePaid}
      />
    </div>
  );
};

export default HolderShareLinks;
