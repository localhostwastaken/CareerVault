import { Link } from "react-router-dom";
import { ChevronRight, FileSignature, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { mockDocuments } from "@/mocks/documents";
import { findUser } from "@/mocks/users";
import { DOCUMENT_TYPE_LABEL } from "@/features/documents/types";
import { formatRelative } from "@/lib/format";

const MANAGER_ID = "u_mark";

const ManagerInbox = () => {
  const requests = mockDocuments.filter((d) => d.status === "draft");
  const submitted = mockDocuments.filter(
    (d) => d.status === "pending_hr" && d.managerSignature?.byUserId === MANAGER_ID,
  );
  const recent = mockDocuments.filter(
    (d) => (d.status === "issued" || d.status === "anchored") && d.managerSignature?.byUserId === MANAGER_ID,
  ).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="Manager inbox"
        description="Document requests waiting on your signature."
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending your signature" value={requests.length} icon={FileSignature} tone="pending" />
        <StatCard label="Submitted to HR" value={submitted.length} icon={Inbox} tone="neutral" />
        <StatCard label="Issued this month" value={recent.length} icon={FileSignature} tone="verified" />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-text">Requests waiting on you</h2>
        {requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Inbox zero"
            description="You're all caught up. Sit tight — when an employee requests a letter, it'll show up here with a magic link."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {requests.map((d) => {
              const holder = findUser(d.holderId);
              return (
                <Link
                  key={d.id}
                  to={`/manager/draft/${d.id}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
                >
                  <Card className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <CardContent className="flex items-center justify-between gap-4 p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pending-soft text-sm font-semibold text-pending">
                          {holder?.name.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text">
                            {holder?.name} requested {DOCUMENT_TYPE_LABEL[d.type]}
                          </p>
                          <p className="text-xs text-text-muted">
                            {d.content.role || "Role TBD"} · {formatRelative(d.issuedAt ?? "2026-05-08T08:00:00Z")}
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

      {submitted.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-base font-semibold text-text">Submitted — awaiting HR</h2>
          <div className="grid grid-cols-1 gap-3">
            {submitted.map((d) => {
              const holder = findUser(d.holderId);
              return (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {DOCUMENT_TYPE_LABEL[d.type]} for {holder?.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        Signed {formatRelative(d.managerSignature?.signedAt ?? "")} · waiting on HR
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default ManagerInbox;
