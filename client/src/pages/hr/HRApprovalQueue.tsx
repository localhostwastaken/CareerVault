import { Link } from "react-router-dom";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { DocumentLifecycle } from "@/components/shared/DocumentLifecycle";
import { mockDocuments } from "@/mocks/documents";
import { mockAuditLogs } from "@/mocks/auditLogs";
import { findUser } from "@/mocks/users";
import { DOCUMENT_TYPE_LABEL } from "@/features/documents/types";
import type { CareerDocument } from "@/features/documents/types";
import { formatDate, formatRelative } from "@/lib/format";

const recentSubtitle = (d: CareerDocument): string => {
  const approver = d.hrSignature?.byName ?? "HR";
  if (d.status === "anchored") {
    return d.anchoredAt
      ? `Approved by ${approver} · anchored ${formatDate(d.anchoredAt, "MMM d, yyyy")}`
      : `Approved by ${approver} · anchored`;
  }
  if (d.status === "issued") {
    return `Approved by ${approver} · awaiting tonight's anchor`;
  }
  return `Approved by ${approver}`;
};

const HRApprovalQueue = () => {
  const orgId = "org_google";
  const pending = mockDocuments.filter((d) => d.orgId === orgId && d.status === "pending_hr");
  const recent = mockDocuments
    .filter((d) => d.orgId === orgId && (d.status === "issued" || d.status === "anchored"))
    .sort((a, b) => (b.hrSignature?.signedAt ?? "").localeCompare(a.hrSignature?.signedAt ?? ""))
    .slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = mockDocuments.filter(
    (d) => d.orgId === orgId && d.hrSignature?.signedAt?.startsWith(today),
  ).length;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const rejectedThisWeek = mockAuditLogs.filter(
    (e) => e.action === "DOC_HR_REJECT" && e.timestamp >= weekAgo,
  ).length;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="HR approval queue"
        description="Documents signed by managers, awaiting your final approval."
      />

      <section className="mt-6">
        <DocumentLifecycle highlight={["pending_hr", "issued", "anchored"]} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting approval" value={pending.length} icon={ClipboardCheck} tone="pending" />
        <StatCard label="Approved today" value={todayCount} tone="verified" />
        <StatCard label="Rejected this week" value={rejectedThisWeek} tone="revoked" />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-text">Pending review</h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Queue clear"
            description="No documents awaiting HR approval."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pending.map((d) => {
              const holder = findUser(d.holderId);
              return (
                <Link
                  key={d.id}
                  to={`/hr/review/${d.id}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                >
                  <Card className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <CardContent className="flex items-center justify-between gap-4 p-5">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pending-soft text-sm font-semibold text-pending">
                          {holder?.name.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">
                            {DOCUMENT_TYPE_LABEL[d.type]} · {holder?.name}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            Signed by {d.managerSignature?.byName} · {formatRelative(d.managerSignature?.signedAt ?? "")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={d.status} />
                        <ChevronRight className="size-4 text-text-subtle group-hover:text-text" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-text">Recently approved</h2>
        <div className="grid grid-cols-1 gap-3">
          {recent.map((d) => {
            const holder = findUser(d.holderId);
            return (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {DOCUMENT_TYPE_LABEL[d.type]} · {holder?.name}
                    </p>
                    <p className="text-xs text-text-muted">{recentSubtitle(d)}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HRApprovalQueue;
