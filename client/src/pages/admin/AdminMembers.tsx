import { useState } from "react";
import { Mail, MoreHorizontal, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockMembers } from "@/mocks/orgs";
import { formatRelative } from "@/lib/format";
import type { MemberRole } from "@/features/org/types";
import { sleep } from "@/lib/sleep";

const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Admin",
  manager: "Manager",
  hr: "HR Approver",
};

const ROLE_TONE: Record<MemberRole, "primary" | "verified" | "anchor"> = {
  admin: "anchor",
  manager: "primary",
  hr: "verified",
};

const AdminMembers = () => {
  const [wildcard, setWildcard] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("manager");
  const [submitting, setSubmitting] = useState(false);

  const handleInvite = async () => {
    setSubmitting(true);
    await sleep(700);
    setSubmitting(false);
    setInviteOpen(false);
    setInviteEmail("");
  };

  const grouped = {
    admin: mockMembers.filter((m) => m.role === "admin"),
    hr: mockMembers.filter((m) => m.role === "hr"),
    manager: mockMembers.filter((m) => m.role === "manager"),
  };

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="Members & allowlist"
        description="Authorised managers and HR approvers can issue documents on behalf of Google."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus />
            Invite member
          </Button>
        }
      />

      <Card className="mt-8">
        <CardContent className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-text">Wildcard allowlist</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Allow any email ending in <code className="font-mono">@google.com</code> to be invited automatically.
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-pending-soft px-2 py-0.5 text-pending">
                <ShieldCheck className="size-3" /> Use with caution
              </span>
            </p>
          </div>
          <Switch checked={wildcard} onCheckedChange={setWildcard} aria-label="Wildcard allowlist" />
        </CardContent>
      </Card>

      {(["admin", "hr", "manager"] as const).map((role) => (
        <section key={role} className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">
              {ROLE_LABEL[role]}s <span className="ml-1 text-sm font-normal text-text-muted">({grouped[role].length})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grouped[role].map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar>
                    <AvatarFallback>{m.name.split(" ").map((p) => p[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{m.name}</p>
                    <p className="truncate text-xs text-text-muted">{m.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={m.active ? ROLE_TONE[m.role] : "expired"}>
                      {m.active ? ROLE_LABEL[m.role] : "Inactive"}
                    </Badge>
                    {m.lastActive ? (
                      <span className="text-[10px] text-text-subtle">{formatRelative(m.lastActive)}</span>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Member actions">
                    <MoreHorizontal />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {grouped[role].length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setInviteRole(role);
                  setInviteOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface px-4 py-6 text-sm text-text-muted hover:bg-surface-2"
              >
                <Plus className="size-4" /> Invite a {ROLE_LABEL[role].toLowerCase()}
              </button>
            ) : null}
          </div>
        </section>
      ))}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
            <DialogDescription>
              They'll receive a magic link valid for 15 minutes to set up their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@google.com"
                type="email"
              />
              <p className="mt-1 text-xs text-text-muted">Email must end in @google.com.</p>
            </div>
            <div>
              <Label className="mb-1.5 block">Role</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="manager">Manager — can sign documents</option>
                <option value="hr">HR Approver — can finalise issuance</option>
                <option value="admin">Admin — full org control</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} isLoading={submitting} disabled={!inviteEmail}>
              <Mail /> Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMembers;
