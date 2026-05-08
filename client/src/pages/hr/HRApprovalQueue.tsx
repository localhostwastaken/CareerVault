import { Link } from "react-router-dom";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { mockDocuments } from "@/mocks/documents";
import { findUser } from "@/mocks/users";
import { DOCUMENT_TYPE_LABEL } from "@/features/documents/types";
import { formatRelative } from "@/lib/format";

const HRApprovalQueue = () => {
  const orgId = "org_google";
  const pending = mockDocuments.filter((d) => d.orgId === orgId && d.status === "pending_hr");
  const recent = mockDocuments.filter((d) => d.orgId === orgId && d.status === "issued").slice(0, 5);
  const todayCount = mockDocuments.filter(
    (d) => d.orgId === orgId && d.hrSignature?.signedAt?.startsWith("2026-05-08"),
  ).length;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="HR approval queue"
        description="Documents signed by managers, awaiting your final approval."
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting approval" value={pending.length} icon={ClipboardCheck} tone="pending" />
        <StatCard label="Approved today" value={todayCount} tone="verified" />
        <StatCard label="Rejected this week" value={3} tone="revoked" />
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
                    <p className="text-sm font-semibold text-text">{DOCUMENT_TYPE_LABEL[d.type]} · {holder?.name}</p>
                    <p className="text-xs text-text-muted">
                      Approved by {d.hrSignature?.byName} · awaiting tonight's anchor
                    </p>
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
