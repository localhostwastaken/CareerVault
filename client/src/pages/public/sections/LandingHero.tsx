import { Link } from "react-router-dom";
import { Anchor, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LandingHero = () => (
  <section className="relative overflow-hidden border-b border-border bg-surface">
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-anchor-soft px-3 py-1 text-xs font-semibold text-anchor">
          <Anchor className="size-3.5" />
          Anchored on Polygon · 184 documents anchored today
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-text sm:text-5xl lg:text-6xl">
          Career documents you can <span className="text-primary">prove</span>, not just claim.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-text-muted">
          Tamper-proof experience letters, salary proofs, and recommendations — issued by your employer, anchored on
          a public blockchain, and verifiable in seconds without a single phone call.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/auth/register">
            <Button size="lg">
              Start free as an employee
              <ArrowRight />
            </Button>
          </Link>
          <Link to="/verify/abc-123-def-456">
            <Button size="lg" variant="outline">
              See a verified document
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-text-subtle">
          No wallet, no seed phrase, no crypto knowledge needed. Free to issue. $5/mo for unlimited shareable links.
        </p>
      </div>

      <div className="relative">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary-soft to-anchor-soft opacity-50 blur-2xl" />
        <div className="relative rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="size-5" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Sample report</p>
              <p className="text-sm font-semibold text-text">Senior Software Engineer · Google</p>
            </div>
            <span className="ml-auto rounded-full bg-verified-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase text-verified">
              Verified
            </span>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              "Content hash matches",
              "Manager signature valid",
              "HR co-signature valid",
              "Merkle proof reconstructs",
              "On-chain anchor confirmed",
              "Not revoked, not expired",
            ].map((label, i) => (
              <li
                key={label}
                className="flex items-center gap-2 text-text"
                style={{ animationDelay: `${i * 90}ms`, opacity: 1 }}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-verified-soft text-verified">
                  <svg className="size-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-3 font-mono text-[10px] text-text-subtle tnum">
            Merkle root 0x4f8b3e2a…b8c7d6e · Polygon block 64,829,341
          </p>
        </div>
      </div>
    </div>
  </section>
);
