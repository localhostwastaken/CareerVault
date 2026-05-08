import { useState } from "react";
import { Activity, Anchor, ClipboardCheck, FileSignature, KeyRound, LogIn, ShieldOff, Trash2, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { mockAuditLogs } from "@/mocks/auditLogs";
import { formatDate, formatRelative } from "@/lib/format";
import type { AuditAction } from "@/features/audit/types";

const ICON_BY_ACTION: Record<AuditAction, LucideIcon> = {
  USER_LOGIN: LogIn,
  DOC_DRAFT: FileSignature,
  DOC_MANAGER_SIGN: FileSignature,
  DOC_HR_APPROVE: ClipboardCheck,
  DOC_HR_REJECT: ShieldOff,
  DOC_ANCHOR: Anchor,
  DOC_REVOKE: ShieldOff,
  DOC_EXPIRE: Activity,
  LINK_GENERATE: Activity,
  LINK_VIEW: Activity,
  DNS_VERIFIED: KeyRound,
  MEMBER_INVITE: ClipboardCheck,
  MEMBER_ROLE_CHANGE: ClipboardCheck,
  GDPR_DELETE: Trash2,
};

const PRETTY: Record<AuditAction, string> = {
  USER_LOGIN: "User signed in",
  DOC_DRAFT: "Drafted document",
  DOC_MANAGER_SIGN: "Manager signed document",
  DOC_HR_APPROVE: "HR approved document",
  DOC_HR_REJECT: "HR rejected document",
  DOC_ANCHOR: "Documents anchored on Polygon",
  DOC_REVOKE: "Document revoked",
  DOC_EXPIRE: "Document expired",
  LINK_GENERATE: "Generated share link",
  LINK_VIEW: "Share link viewed",
  DNS_VERIFIED: "Domain ownership verified",
  MEMBER_INVITE: "Member invited",
  MEMBER_ROLE_CHANGE: "Member role changed",
  GDPR_DELETE: "GDPR deletion request",
};

type Filter = "all" | "compliance" | "standard";

const AuditLogPage = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = mockAuditLogs.filter((e) => {
    if (filter === "compliance" && e.tier !== "COMPLIANCE") return false;
    if (filter === "standard" && e.tier !== "STANDARD") return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      e.actorName.toLowerCase().includes(q) ||
      e.actorEmail.toLowerCase().includes(q) ||
      e.target.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="Audit log"
        description="Compliance-tier events retained 7 years. Standard-tier events retained 90 days."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by actor, action, or target id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-md"
        />
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All ({mockAuditLogs.length})</TabsTrigger>
            <TabsTrigger value="compliance">7y compliance ({mockAuditLogs.filter((e) => e.tier === "COMPLIANCE").length})</TabsTrigger>
            <TabsTrigger value="standard">90d standard ({mockAuditLogs.filter((e) => e.tier === "STANDARD").length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ol className="mt-6 space-y-2.5">
        {filtered.map((e) => {
          const Icon = ICON_BY_ACTION[e.action];
          return (
            <li key={e.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text">{PRETTY[e.action]}</p>
                  <Badge tone={e.tier === "COMPLIANCE" ? "anchor" : "neutral"}>
                    {e.tier === "COMPLIANCE" ? "7-year" : "90-day"}
                  </Badge>
                  <span className="text-xs text-text-subtle tnum">{formatRelative(e.timestamp)}</span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  <span className="font-medium text-text">{e.actorName}</span>{" "}
                  <span className="text-text-subtle">({e.actorEmail})</span>
                  {" · "}
                  Target <code className="font-mono text-[11px] tnum">{e.target}</code>
                  {" · "}
                  IP <span className="font-mono tnum">{e.ip}</span>
                </p>
                {e.metadata ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(e.metadata).map(([k, v]) => (
                      <span key={k} className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                        {k}={String(v)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-xs text-text-subtle tnum">
                {formatDate(e.timestamp, "MMM d, HH:mm")}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AuditLogPage;
