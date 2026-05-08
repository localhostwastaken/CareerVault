import { Link } from "react-router-dom";
import { Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, AnchorBadge } from "@/components/shared/StatusBadge";
import { findOrg } from "@/mocks/orgs";
import { formatDate } from "@/lib/format";
import { DOCUMENT_TYPE_LABEL, type CareerDocument } from "../types";

interface Props {
  doc: CareerDocument;
  to?: string;
}

export const DocumentCard = ({ doc, to }: Props) => {
  const org = findOrg(doc.orgId);
  const href = to ?? `/holder/documents/${doc.id}`;

  return (
    <Link
      to={href}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: org?.logoBg }}
              >
                {org?.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {DOCUMENT_TYPE_LABEL[doc.type]}
                </p>
                <p className="truncate text-xs text-text-muted">{org?.name}</p>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
          </div>

          <p className="mt-3 line-clamp-2 text-sm text-text">{doc.content.role}</p>

          {doc.content.startDate ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar className="size-3.5" />
              <span className="tnum">
                {formatDate(doc.content.startDate, "MMM yyyy")} →{" "}
                {doc.content.endDate ? formatDate(doc.content.endDate, "MMM yyyy") : "Present"}
              </span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={doc.status} />
            {doc.status === "anchored" ? <AnchorBadge /> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
