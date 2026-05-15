import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { sleep } from "@/lib/sleep";
import { DOCUMENT_TYPE_LABEL, type DocumentType } from "@/features/documents/types";

interface Row {
  email: string;
  name: string;
  role: string;
  start: string;
  end: string;
  type: DocumentType;
  valid: boolean;
  errors?: string;
}

const SAMPLE_ROWS: Row[] = [
  { email: "alex.patel@example.com", name: "Alex Patel", role: "Frontend Engineer", start: "2023-09-01", end: "2026-01-30", type: "experience", valid: true },
  { email: "jin.tanaka@example.com", name: "Jin Tanaka", role: "Backend Engineer", start: "2022-04-12", end: "2026-03-08", type: "experience", valid: true },
  { email: "maria.gonzalez@example.com", name: "Maria Gonzalez", role: "Senior Full-Stack Engineer", start: "2020-09-01", end: "2026-04-30", type: "experience", valid: true },
  { email: "ravi.sharma@example.com", name: "Ravi Sharma", role: "Senior Engineer", start: "2018-06-01", end: "2026-04-30", type: "recommendation", valid: true },
  { email: "missing-email", name: "Anonymous", role: "Engineer", start: "2024-01-01", end: "2026-04-30", type: "experience", valid: false, errors: "Invalid email format" },
  { email: "lina.kapoor@example.com", name: "Lina Kapoor", role: "Frontend Tech Lead", start: "2022-01-15", end: "2025-11-30", type: "experience", valid: true },
  { email: "devon.brooks@example.com", name: "Devon Brooks", role: "Cloud Platform Engineer", start: "2021-04-01", end: "2026-03-10", type: "salary_proof", valid: true },
];

type Step = "upload" | "preview" | "issuing" | "done";

const BulkIssuance = () => {
  const [step, setStep] = useState<Step>("upload");
  const [progress, setProgress] = useState(0);

  const handleUpload = () => setStep("preview");

  const handleIssue = async () => {
    setStep("issuing");
    setProgress(0);
    const valid = SAMPLE_ROWS.filter((r) => r.valid);
    for (let i = 0; i < valid.length; i++) {
      await sleep(380);
      setProgress(((i + 1) / valid.length) * 100);
    }
    setStep("done");
  };

  const validCount = SAMPLE_ROWS.filter((r) => r.valid).length;
  const invalidCount = SAMPLE_ROWS.length - validCount;

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <PageHeader
        title="Bulk issuance"
        description="Issue dozens of documents at once via CSV. Each row gets manager + HR signatures, then joins tonight's anchor batch."
      />

      {step === "upload" ? (
        <Card className="mt-8">
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UploadCloud className="size-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-text">Drop your CSV here</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
              Columns: <code className="font-mono">email, full_name, role, start_date, end_date, doc_type</code>. Up to 500 rows per upload.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button onClick={handleUpload}>
                <FileSpreadsheet />
                Use sample CSV (demo)
              </Button>
              <a href="#" className="text-xs font-medium text-primary hover:underline">Download CSV template</a>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "preview" ? (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <Badge tone="verified">{validCount} valid</Badge>
            {invalidCount ? <Badge tone="revoked">{invalidCount} invalid</Badge> : null}
            <Badge tone="neutral">{SAMPLE_ROWS.length} total rows</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-subtle">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Holder</th>
                      <th className="px-4 py-2 text-left font-medium">Role</th>
                      <th className="px-4 py-2 text-left font-medium">Period</th>
                      <th className="px-4 py-2 text-left font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-2.5">
                          {r.valid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-verified">
                              <Check className="size-3.5" strokeWidth={3} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-revoked" title={r.errors}>
                              <X className="size-3.5" strokeWidth={3} /> {r.errors}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-text">{r.name}</p>
                          <p className="text-xs text-text-muted">{r.email}</p>
                        </td>
                        <td className="px-4 py-2.5 text-text">{r.role}</td>
                        <td className="px-4 py-2.5 text-xs text-text-muted tnum">{r.start} → {r.end}</td>
                        <td className="px-4 py-2.5 text-text">{DOCUMENT_TYPE_LABEL[r.type]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft />
              Back
            </Button>
            <Button onClick={handleIssue} disabled={validCount === 0}>
              Issue {validCount} documents
              <ArrowRight />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "issuing" ? (
        <Card className="mt-8">
          <CardContent className="p-10 text-center">
            <p className="text-sm font-semibold text-text">Issuing documents…</p>
            <Progress value={progress} className="mx-auto mt-4 max-w-md" />
            <p className="mt-2 text-xs text-text-muted tnum">{Math.round(progress)}% — signing &amp; queueing for anchor</p>
          </CardContent>
        </Card>
      ) : null}

      {step === "done" ? (
        <Card className="mt-8 border-verified">
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-verified-soft text-verified">
              <Check className="size-7" strokeWidth={2.5} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-text">{validCount} documents queued</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
              All documents will be anchored to Polygon at tonight's midnight UTC batch run.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={() => setStep("upload")}>Issue another batch</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default BulkIssuance;
