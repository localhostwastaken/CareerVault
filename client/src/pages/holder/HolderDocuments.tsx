import { useState } from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DocumentCard } from "@/features/documents/components/DocumentCard";
import { documentsByHolder } from "@/mocks/documents";
import { ACTIVE_HOLDER } from "@/mocks/users";
import { DOCUMENT_TYPE_LABEL, type DocumentType } from "@/features/documents/types";

type Filter = "all" | "anchored" | "pending" | "expired_revoked";

const matchesFilter = (status: string, f: Filter): boolean => {
  if (f === "all") return true;
  if (f === "anchored") return status === "anchored" || status === "issued";
  if (f === "pending") return status === "pending_hr" || status === "draft";
  return status === "expired" || status === "revoked";
};

const HolderDocuments = () => {
  const allDocs = documentsByHolder(ACTIVE_HOLDER.id);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<DocumentType | "all">("all");

  const filtered = allDocs.filter((d) => {
    if (!matchesFilter(d.status, filter)) return false;
    if (type !== "all" && d.type !== type) return false;
    if (query && !d.content.role.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title="My documents"
        description={`${allDocs.length} career documents · ${
          allDocs.filter((d) => d.status === "anchored").length
        } anchored on Polygon`}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by role, manager, or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-md"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DocumentType | "all")}
          className="h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All types</option>
          {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All ({allDocs.length})</TabsTrigger>
          <TabsTrigger value="anchored">Verified ({allDocs.filter((d) => matchesFilter(d.status, "anchored")).length})</TabsTrigger>
          <TabsTrigger value="pending">In progress ({allDocs.filter((d) => matchesFilter(d.status, "pending")).length})</TabsTrigger>
          <TabsTrigger value="expired_revoked">Inactive ({allDocs.filter((d) => matchesFilter(d.status, "expired_revoked")).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents match"
              description="Try adjusting filters or request a new document from your manager."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => (
                <DocumentCard key={d.id} doc={d} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HolderDocuments;
