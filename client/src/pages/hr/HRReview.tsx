import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DocumentPreview } from "@/features/documents/components/DocumentPreview";
import { findDocument } from "@/mocks/documents";
import { findUser } from "@/mocks/users";
import { sleep } from "@/lib/sleep";

const REJECT_REASONS = [
  "Wrong employment dates",
  "Role title doesn't match HR records",
  "Salary figure incorrect",
  "Holder is not eligible (e.g. probation period)",
  "Other (describe below)",
] as const;

const HRReview = () => {
  const { id = "doc_005" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doc = findDocument(id);
  const holder = doc ? findUser(doc.holderId) : undefined;
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REJECT_REASONS)[number]>(REJECT_REASONS[0]);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    await sleep(1000);
    setApproving(false);
    navigate("/hr");
  };

  const handleReject = async () => {
    setRejecting(true);
    await sleep(900);
    setRejecting(false);
    setRejectOpen(false);
    navigate("/hr");
  };

  if (!doc || !holder) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <p className="text-sm text-text-muted">Document not found.</p>
        <Link to="/hr" className="mt-4 inline-block">
          <Button variant="outline">Back to queue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Back to queue
      </button>

      <PageHeader
        title="Review document"
        description={`From ${doc.managerSignature?.byName} (${doc.managerSignature?.byTitle}) for ${holder.name}`}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <DocumentPreview doc={doc} />

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Cross-check against HR records</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                <CheckItem ok label={`Holder identity: ${holder.name}, ${holder.email}`} />
                <CheckItem ok label={`Employment record: ${doc.content.startDate} to ${doc.content.endDate}`} />
                <CheckItem ok label={`Role: ${doc.content.role}`} />
                <CheckItem ok label="Manager is on the authorised allowlist" />
              </ul>
              <p className="mt-4 text-xs text-text-muted">
                Cross-checks pulled from your HR system of record. Override and reject if anything looks off.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text">Your decision</h2>
              <div className="mt-3 flex flex-col gap-2">
                <Button onClick={handleApprove} isLoading={approving} size="lg">
                  <ShieldCheck />
                  Approve &amp; finalise issuance
                </Button>
                <Button variant="outline" onClick={() => setRejectOpen(true)} size="lg">
                  <X />
                  Reject &amp; return to manager
                </Button>
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Approving co-signs the document and queues it for tonight's blockchain anchor. Rejecting notifies both
                the manager and the holder.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this document</DialogTitle>
            <DialogDescription>
              The manager and holder will be notified with your reason. They can revise and resubmit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Reason</Label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REJECT_REASONS)[number])}
                className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block">Note to manager (optional)</Label>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sarah's actual end date in our records is May 1, not April 15." />
            </div>
            <div className="rounded-lg bg-revoked-soft px-3 py-2 text-xs text-revoked">
              <span className="inline-flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> Rejecting reverts the document to <code className="font-mono">DRAFT</code> for revision.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} isLoading={rejecting}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
  <li className="flex items-center gap-2">
    <span
      className={`flex size-5 items-center justify-center rounded-full ${
        ok ? "bg-verified-soft text-verified" : "bg-revoked-soft text-revoked"
      }`}
    >
      {ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
    </span>
    <span className="text-text">{label}</span>
  </li>
);

export default HRReview;
