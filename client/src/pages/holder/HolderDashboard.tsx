import { Link } from "react-router-dom";
import { ArrowRight, FileSignature, FileText, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DocumentCard } from "@/features/documents/components/DocumentCard";
import { ACTIVE_HOLDER } from "@/mocks/users";
import { documentsByHolder } from "@/mocks/documents";
import { mockShareLinks } from "@/mocks/shareLinks";
import { mockCandidates } from "@/mocks/matches";

const HolderDashboard = () => {
  const docs = documentsByHolder(ACTIVE_HOLDER.id);
  const anchored = docs.filter((d) => d.status === "anchored");
  const pending = docs.filter((d) => d.status === "pending_hr" || d.status === "draft");
  const trustScore = mockCandidates.find((c) => c.id === ACTIVE_HOLDER.id)?.trustScore ?? 0;
  const recent = [...docs].sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? "")).slice(0, 3);
  const activeLinks = mockShareLinks.filter((l) => l.status === "active");

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title={`Welcome back, ${ACTIVE_HOLDER.name.split(" ")[0]}`}
        description="Your verifiable career history, all in one wallet."
        actions={
          <>
            <Link to="/holder/request">
              <Button>
                <FileSignature />
                Request a document
              </Button>
            </Link>
            <Link to="/holder/links">
              <Button variant="outline">
                <Link2 />
                Generate share link
              </Button>
            </Link>
          </>
        }
      />

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Anchored documents" value={anchored.length} icon={ShieldCheck} tone="verified" hint="On Polygon" />
        <StatCard label="Awaiting HR" value={pending.length} icon={FileText} tone="pending" hint="In review" />
        <StatCard label="Active share links" value={activeLinks.length} icon={Link2} tone="neutral" />
        <StatCard label="Trust score" value={`${trustScore}/100`} icon={Sparkles} tone="verified" hint="Top 6% globally" />
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">Recent documents</h2>
            <Link to="/holder/documents" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recent.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-anchor">Anchor activity</p>
            <h3 className="mt-1 text-base font-semibold text-text">All checks passing</h3>
            <p className="mt-1 text-sm text-text-muted">
              Your {anchored.length} anchored documents are healthy. Last anchor 8 hours ago.
            </p>
            <div className="mt-4 space-y-2">
              {anchored.slice(0, 3).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{d.content.role}</p>
                    <p className="text-xs text-text-muted">{d.id}</p>
                  </div>
                  <span className="rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-semibold text-verified">
                    OK
                  </span>
                </div>
              ))}
            </div>
            <Link to="/holder/documents" className="mt-4 inline-flex w-full">
              <Button variant="outline" className="w-full">
                Manage wallet
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default HolderDashboard;
