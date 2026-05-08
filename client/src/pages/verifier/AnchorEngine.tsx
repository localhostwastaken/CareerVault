import { useEffect, useState } from "react";
import { Anchor, ExternalLink, GitMerge, ShieldCheck, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { HashChip } from "@/components/shared/HashChip";
import { Progress } from "@/components/ui/progress";
import { mockMerkleRoots, polygonScanUrl } from "@/mocks/merkleRoots";
import { mockDocuments } from "@/mocks/documents";
import { formatDate } from "@/lib/format";

const AnchorEngine = () => {
  const pending = mockDocuments.filter((d) => d.status === "issued").length;
  const totalAnchored = mockDocuments.filter((d) => d.status === "anchored").length;
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(24, 0, 0, 0);
      const diff = next.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <PageHeader
        title="Anchor engine"
        description="Live status of CareerVault's daily Merkle anchor on Polygon."
      />

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Anchored to date" value={totalAnchored.toLocaleString()} icon={ShieldCheck} tone="verified" />
        <StatCard label="In tonight's batch" value={pending} icon={Timer} tone="pending" hint="Issued today" />
        <StatCard label="Avg. gas / anchor" value="$0.011" icon={Anchor} tone="neutral" hint="Polygon PoS" />
        <StatCard label="Next anchor in" value={countdown} icon={Timer} tone="neutral" hint="00:00 UTC daily" />
      </section>

      <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-text">Tonight's Merkle tree (preview)</h2>
            <p className="mt-1 text-sm text-text-muted">
              {pending} document{pending === 1 ? "" : "s"} ready to anchor at midnight UTC. Hashes are SHA-256 of canonical
              JSON-LD + per-document salt.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="rounded-lg border border-anchor bg-anchor-soft px-3 py-2 text-xs font-semibold text-anchor">
                Tonight's root (computed)
              </div>
              <HashChip hash="0xc7b1e9aa31f4a8d9cf8a2bc19e4d35a1c8b6e9f0a3d5c7b2e1f4a8d9cf8a2bc1" />
              <svg width="2" height="20" viewBox="0 0 2 20"><line x1="1" y1="0" x2="1" y2="20" className="text-border-strong" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" /></svg>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <NodePill label="Internal" />
                <span className="text-text-subtle">+</span>
                <NodePill label="Internal" />
              </div>
              <svg width="2" height="20" viewBox="0 0 2 20"><line x1="1" y1="0" x2="1" y2="20" className="text-border-strong" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" /></svg>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <NodePill key={i} label={`Doc #${i + 1}`} leaf />
                ))}
              </div>
              <Progress value={(pending / 200) * 100} className="mt-4 max-w-md" />
              <p className="text-[11px] text-text-subtle tnum">{pending} of ~200 docs · batch size grows until midnight</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-text">Recent anchors</h2>
            <p className="mt-1 text-xs text-text-muted">Last 7 daily Merkle roots written to Polygon.</p>
            <ol className="mt-4 space-y-2.5">
              {mockMerkleRoots.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-text">{formatDate(r.date, "EEE, MMM d")}</p>
                    <a
                      href={polygonScanUrl(r.polygonTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      Polygonscan <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                    <HashChip hash={r.rootHash} />
                    <span className="font-medium text-text-muted tnum">{r.documentCount} docs</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-text-subtle tnum">
                    Block #{r.blockNumber.toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-text-muted">
              <GitMerge className="mr-1 inline size-3.5" /> Each root is also pinned to IPFS and committed to a public GitHub
              transparency repo. If any two systems fail, proof can be reconstructed from the third.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

const NodePill = ({ label, leaf }: { label: string; leaf?: boolean }) => (
  <span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${leaf ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-muted"}`}>
    {label}
  </span>
);

export default AnchorEngine;
