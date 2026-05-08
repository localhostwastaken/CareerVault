import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { mockOrgs } from "@/mocks/orgs";
import { DOCUMENT_TYPE_LABEL, type DocumentType } from "@/features/documents/types";
import { sleep } from "@/lib/sleep";

type Step = "form" | "review" | "sent";

const RequestDocument = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [orgId, setOrgId] = useState(mockOrgs[0].id);
  const [type, setType] = useState<DocumentType>("experience");
  const [managerEmail, setManagerEmail] = useState("mark.johnson@google.com");
  const [role, setRole] = useState("Senior Software Engineer");
  const [start, setStart] = useState("2022-08");
  const [end, setEnd] = useState("2026-04");
  const [submitting, setSubmitting] = useState(false);

  const org = mockOrgs.find((o) => o.id === orgId);

  const handleNext = () => setStep("review");
  const handleSubmit = async () => {
    setSubmitting(true);
    await sleep(800);
    setSubmitting(false);
    setStep("sent");
  };

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <PageHeader
        title="Request a document"
        description="Send a magic-link request to your former manager. They sign in 60 seconds — no password needed."
      />

      <Stepper step={step} />

      {step === "form" ? (
        <Card className="mt-8">
          <CardContent className="space-y-5 p-6">
            <Field label="Organisation">
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {mockOrgs.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.verificationState !== "verified"}>
                    {o.name} {o.verificationState !== "verified" ? "(unverified)" : ""}
                  </option>
                ))}
              </select>
              {org?.verificationState === "verified" ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-verified">
                  <ShieldCheck className="size-3.5" /> Domain {org.domain} is verified
                </p>
              ) : null}
            </Field>

            <Field label="Document type">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      type === t
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border-strong bg-surface text-text hover:bg-surface-2"
                    }`}
                  >
                    {DOCUMENT_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Manager email">
              <Input value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} type="email" placeholder={`name@${org?.domain ?? "company.com"}`} />
              <p className="mt-1 text-xs text-text-muted">
                Must end in <span className="font-mono">@{org?.domain ?? "..."}</span> to match the verified domain.
              </p>
            </Field>

            <Field label="Role / title">
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start (YYYY-MM)">
                <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="2022-08" />
              </Field>
              <Field label="End (YYYY-MM, blank if current)">
                <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="2026-04" />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button onClick={handleNext}>
                Review
                <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "review" ? (
        <Card className="mt-8">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-base font-semibold text-text">Review your request</h2>
            <ReviewRow label="Organisation" value={org?.name ?? ""} />
            <ReviewRow label="Type" value={DOCUMENT_TYPE_LABEL[type]} />
            <ReviewRow label="Manager" value={managerEmail} />
            <ReviewRow label="Role" value={role} />
            <ReviewRow label="Period" value={`${start} → ${end || "Present"}`} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("form")}>Back</Button>
              <Button onClick={handleSubmit} isLoading={submitting}>
                <Mail />
                Send magic link
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "sent" ? (
        <Card className="mt-8 border-verified">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-verified-soft text-verified">
              <Check className="size-6" strokeWidth={2.5} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-text">Magic link sent to {managerEmail}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
              Your manager has 7 days to sign. We'll notify you the moment HR finalises the document.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/holder/documents">
                <Button>View documents</Button>
              </Link>
              <Button variant="outline" onClick={() => setStep("form")}>
                Request another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

const Stepper = ({ step }: { step: Step }) => {
  const steps: Step[] = ["form", "review", "sent"];
  const labels: Record<Step, string> = { form: "Details", review: "Review", sent: "Sent" };
  const idx = steps.indexOf(step);
  return (
    <ol className="mt-6 flex items-center gap-2">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
            i <= idx ? "bg-primary text-white" : "bg-surface-2 text-text-muted"
          }`}>{i + 1}</span>
          <span className={`text-sm ${i === idx ? "font-semibold text-text" : "text-text-muted"}`}>{labels[s]}</span>
          {i < steps.length - 1 ? <span className="h-px w-6 bg-border-strong" /> : null}
        </li>
      ))}
    </ol>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="mb-1.5 block">{label}</Label>
    {children}
  </div>
);

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b border-border py-2 last:border-b-0">
    <span className="text-xs uppercase tracking-wider text-text-subtle">{label}</span>
    <span className="text-sm font-medium text-text">{value}</span>
  </div>
);

export default RequestDocument;
