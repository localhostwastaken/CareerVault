import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileSignature, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { SkillExtractor } from "@/features/issuance/components/SkillExtractor";
import { findDocument } from "@/mocks/documents";
import { findUser } from "@/mocks/users";
import { findOrg } from "@/mocks/orgs";
import { DOCUMENT_TYPE_LABEL } from "@/features/documents/types";
import { sleep } from "@/lib/sleep";

const DraftDocument = () => {
  const { id = "doc_006" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doc = findDocument(id);
  const holder = doc ? findUser(doc.holderId) : undefined;
  const org = doc ? findOrg(doc.orgId) : undefined;

  const [body, setBody] = useState(
    "Sarah Chen worked with us as a Senior Software Engineer from August 2022 to April 2026. She owned our checkout pipeline migration to React and TypeScript, mentored four junior engineers, designed the AWS Lambda architecture for our cart service, and consistently delivered above-average results. Her code review and system design skills are exceptional.",
  );
  const [role, setRole] = useState(doc?.content.role || "Senior Software Engineer");
  const [start, setStart] = useState(doc?.content.startDate || "2022-08");
  const [end, setEnd] = useState(doc?.content.endDate || "2026-04");
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    setSigning(true);
    await sleep(1100);
    setSigning(false);
    navigate("/manager");
  };

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-sm text-text-muted">Draft not found.</p>
        <Link to="/manager" className="mt-4 inline-block">
          <Button variant="outline">Back to inbox</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Back to inbox
      </button>

      <PageHeader
        title={`Draft ${DOCUMENT_TYPE_LABEL[doc.type]}`}
        description={`For ${holder?.name} (${holder?.email}) at ${org?.name}`}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Role / title">
                <Input value={role} onChange={(e) => setRole(e.target.value)} />
              </Field>
              <div />
              <Field label="Start (YYYY-MM)">
                <Input value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End (YYYY-MM)">
                <Input value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>

            <Field label="Letter content">
              <Textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the body of the letter. Mention specific skills, projects, and achievements — the AI will extract and verify them."
              />
              <p className="mt-1 text-xs text-text-muted">
                {body.length} characters · Skills are extracted live as you type.
              </p>
            </Field>

            <div className="flex items-center justify-between rounded-lg border border-dashed border-border-strong bg-surface-2 p-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <KeyRound className="size-4 text-primary" />
                Signing key managed by HashiCorp Vault. Keys never leave secure hardware.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate("/manager")}>Cancel</Button>
              <Button onClick={handleSign} isLoading={signing}>
                <FileSignature />
                Sign &amp; submit to HR
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <SkillExtractor text={body} />

          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Two-step issuance</p>
              <ol className="mt-3 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">1</span>
                  <div>
                    <p className="font-medium text-text">You sign &amp; submit</p>
                    <p className="text-xs text-text-muted">Status moves to <code className="font-mono">PENDING_HR_APPROVAL</code>.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text-muted">2</span>
                  <div>
                    <p className="font-medium text-text">HR cross-checks &amp; finalises</p>
                    <p className="text-xs text-text-muted">Linda Rao verifies dates, then co-signs.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-text-muted">3</span>
                  <div>
                    <p className="font-medium text-text">Anchor at midnight UTC</p>
                    <p className="text-xs text-text-muted">Document hash joins tonight's Merkle batch on Polygon.</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="mb-1.5 block">{label}</Label>
    {children}
  </div>
);

export default DraftDocument;
