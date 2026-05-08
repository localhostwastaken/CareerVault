import { shortHash } from "@/lib/format";

interface Props {
  rootHash: string;
  proofPath: string[];
  leafHash: string;
  leafIndex: number;
}

const Hash = ({ value, tone = "muted" }: { value: string; tone?: "muted" | "leaf" | "root" }) => {
  const colors: Record<string, string> = {
    muted: "border-border bg-surface-2 text-text-muted",
    leaf: "border-primary bg-primary-soft text-primary",
    root: "border-anchor bg-anchor-soft text-anchor",
  };
  return (
    <div className={`inline-flex items-center rounded-md border px-2 py-1 font-mono text-[11px] tnum ${colors[tone]}`}>
      {shortHash(value, 6, 4)}
    </div>
  );
};

export const MerkleProofViz = ({ rootHash, proofPath, leafHash, leafIndex }: Props) => (
  <div className="rounded-xl border border-border bg-surface-2 p-5">
    <div className="flex flex-col items-center gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-anchor">Merkle root (on Polygon)</p>
      <Hash value={rootHash} tone="root" />

      <svg width="2" height="20" viewBox="0 0 2 20" aria-hidden>
        <line x1="1" y1="0" x2="1" y2="20" stroke="currentColor" className="text-border-strong" strokeWidth="1" strokeDasharray="2 2" />
      </svg>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">Sibling hashes (proof path)</p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {proofPath.map((hash, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Hash value={hash} tone="muted" />
              {i < proofPath.length - 1 ? <span className="text-text-subtle">+</span> : null}
            </div>
          ))}
        </div>
      </div>

      <svg width="2" height="20" viewBox="0 0 2 20" aria-hidden>
        <line x1="1" y1="0" x2="1" y2="20" stroke="currentColor" className="text-border-strong" strokeWidth="1" strokeDasharray="2 2" />
      </svg>

      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
          This document · leaf #{leafIndex}
        </p>
        <Hash value={leafHash} tone="leaf" />
      </div>
    </div>

    <p className="mt-4 border-t border-border pt-3 text-center text-xs text-text-muted">
      The leaf hash + sibling hashes recompute the root above. The root is recorded on Polygon — anyone can verify independently.
    </p>
  </div>
);
