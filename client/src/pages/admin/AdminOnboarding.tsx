import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Globe2, RotateCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { mockOrgs } from "@/mocks/orgs";
import { sleep } from "@/lib/sleep";
import { cn } from "@/lib/cn";

const ACME = mockOrgs.find((o) => o.id === "org_acme")!;
const GOOGLE = mockOrgs.find((o) => o.id === "org_google")!;

type CheckState = "idle" | "checking" | "verified" | "failed";

const AdminOnboarding = () => {
  const [state, setState] = useState<CheckState>("idle");
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    setState("checking");
    await sleep(1800);
    setState("verified");
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="Organisation"
        description={`${GOOGLE.name} · ${GOOGLE.domain}`}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified-soft px-3 py-1 text-xs font-semibold text-verified">
            <ShieldCheck className="size-3.5" />
            Domain verified · Enterprise tier
          </span>
        }
      />

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Documents issued" value={GOOGLE.documentsIssued} icon={ShieldCheck} tone="verified" hint="All-time" />
        <StatCard label="Trust score" value={`${GOOGLE.trustScore}/100`} tone="verified" />
        <StatCard label="Subscription" value={GOOGLE.subscriptionTier} tone="neutral" />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold text-text">DNS verification</h2>
        <p className="text-sm text-text-muted">
          Domain ownership is proven via a TXT record. This prevents impersonation — only someone with admin access
          to your DNS can register {GOOGLE.domain} on CareerVault.
        </p>

        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Step 1 — Add this TXT record</p>
                <div className="mt-3 rounded-lg border border-border bg-surface-2 p-4 font-mono text-xs">
                  <div className="grid grid-cols-[80px_1fr] gap-y-1 gap-x-3 tnum">
                    <span className="text-text-subtle">Host:</span>
                    <span className="text-text">_careervault.{ACME.domain}</span>
                    <span className="text-text-subtle">Type:</span>
                    <span className="text-text">TXT</span>
                    <span className="text-text-subtle">TTL:</span>
                    <span className="text-text">300</span>
                    <span className="text-text-subtle">Value:</span>
                    <span className="text-primary">{ACME.dnsToken}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(ACME.dnsToken ?? "");
                      setCopied(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-muted hover:bg-surface-2"
                  >
                    <Copy className="size-3" />
                    {copied ? "Copied" : "Copy token"}
                  </button>
                </div>
                <p className="mt-3 text-xs text-text-subtle">
                  Most providers (Cloudflare, Route 53, GoDaddy) propagate within 5 minutes. Some take up to 24 hours.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Step 2 — Verify ownership</p>
                <div className="mt-3 space-y-3">
                  <DnsLine icon={Globe2} label={`Resolving _careervault.${ACME.domain}`} active={state === "checking"} done={state === "verified"} />
                  <DnsLine icon={ShieldCheck} label={`Matching value against ${ACME.dnsToken?.slice(0, 16)}…`} active={state === "checking"} done={state === "verified"} />
                  <DnsLine icon={Check} label="Verified ownership · ready to issue" done={state === "verified"} />
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={handleVerify}
                  isLoading={state === "checking"}
                  disabled={state === "verified"}
                >
                  {state === "verified" ? <><ShieldCheck /> Verified</> : <><RotateCw /> Run DNS check</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-text">Public transparency profile</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Anyone can confirm your organisation issued a document by checking our public registry.
                </p>
              </div>
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open public page <ExternalLink className="size-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

const DnsLine = ({
  icon: Icon,
  label,
  active,
  done,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  done?: boolean;
}) => (
  <div className="flex items-center gap-2 text-sm">
    <span
      className={cn(
        "flex size-6 items-center justify-center rounded-full transition-colors",
        done ? "bg-verified-soft text-verified" : active ? "bg-pending-soft text-pending animate-pulse" : "bg-surface-2 text-text-muted",
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
    </span>
    <span className={done ? "text-text" : "text-text-muted"}>{label}</span>
  </div>
);

export default AdminOnboarding;
