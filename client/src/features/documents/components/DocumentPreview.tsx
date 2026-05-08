import { Building2, FileSignature, Calendar, BadgeCheck } from "lucide-react";
import { findOrg } from "@/mocks/orgs";
import type { CareerDocument } from "../types";
import { DOCUMENT_TYPE_LABEL } from "../types";
import { formatDate, formatUSD } from "@/lib/format";

interface Props {
  doc: CareerDocument;
}

export const DocumentPreview = ({ doc }: Props) => {
  const org = findOrg(doc.orgId);
  return (
    <article className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-10">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex size-12 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: org?.logoBg }}
          >
            {org?.initials}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-subtle">
              Issued by
            </p>
            <p className="text-base font-semibold text-text">{org?.name}</p>
            <p className="text-xs text-text-muted">{org?.domain}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-text-subtle">Document</p>
          <p className="text-sm font-semibold text-text">{DOCUMENT_TYPE_LABEL[doc.type]}</p>
          <p className="text-xs text-text-muted tnum">ID: {doc.id}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
        <Field icon={<Building2 className="size-3.5" />} label="Holder" value={doc.holderName} sub={doc.holderEmail} />
        <Field icon={<FileSignature className="size-3.5" />} label="Role" value={doc.content.role} />
        <Field
          icon={<Calendar className="size-3.5" />}
          label="Period"
          value={`${formatDate(doc.content.startDate, "MMM yyyy")} → ${
            doc.content.endDate ? formatDate(doc.content.endDate, "MMM yyyy") : "Present"
          }`}
        />
        {doc.content.salary ? (
          <Field
            icon={<BadgeCheck className="size-3.5" />}
            label="Compensation"
            value={`${formatUSD(doc.content.salary.amount * 100)} / ${doc.content.salary.period}`}
          />
        ) : doc.content.rating ? (
          <Field icon={<BadgeCheck className="size-3.5" />} label="Performance rating" value={doc.content.rating} />
        ) : null}
      </div>

      {doc.content.body ? (
        <section className="rounded-lg bg-surface-2 p-5 text-sm leading-relaxed text-text">
          {doc.content.body}
        </section>
      ) : null}

      {doc.skills.length ? (
        <section className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-subtle">
            Verified skills extracted from this document
          </p>
          <div className="flex flex-wrap gap-1.5">
            {doc.skills.map((s) => (
              <span key={s} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-6 sm:grid-cols-2">
        {doc.managerSignature ? (
          <Signature title="Issued by manager" sig={doc.managerSignature} />
        ) : null}
        {doc.hrSignature ? <Signature title="Approved by HR" sig={doc.hrSignature} /> : null}
      </footer>
    </article>
  );
};

const Field = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <div>
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-subtle">
      {icon}
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    {sub ? <p className="text-xs text-text-muted">{sub}</p> : null}
  </div>
);

const Signature = ({ title, sig }: { title: string; sig: NonNullable<CareerDocument["managerSignature"]> }) => (
  <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-4">
    <p className="text-xs font-medium uppercase tracking-wider text-text-subtle">{title}</p>
    <p className="mt-1.5 font-[cursive] text-lg italic text-primary">{sig.byName}</p>
    <p className="text-xs text-text-muted">{sig.byTitle}</p>
    <p className="mt-1 font-mono text-[10px] text-text-subtle tnum">
      Digitally signed · {formatDate(sig.signedAt, "MMM d, yyyy h:mm a")}
    </p>
  </div>
);
