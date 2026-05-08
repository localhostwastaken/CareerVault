import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LandingCta = () => (
  <section className="bg-primary py-16 sm:py-24">
    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Stop trusting on faith. Start verifying with proof.
      </h2>
      <p className="mt-4 text-lg text-primary-soft">
        Free for employees. Free to issue. $0.01 per blockchain anchor — no matter how many documents.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to="/auth/register">
          <Button size="lg" variant="secondary">
            Create free account
            <ArrowRight />
          </Button>
        </Link>
        <Link to="/verify/abc-123-def-456">
          <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
            See a verified document
          </Button>
        </Link>
      </div>
    </div>
  </section>
);

export const LandingFooter = () => (
  <footer className="border-t border-border bg-bg py-8">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-text-muted sm:flex-row sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="size-4 text-white" strokeWidth={2.5} />
        </span>
        <span className="font-bold text-text">CareerVault</span>
        <span className="text-text-subtle">· KJ Somaiya School of Engineering · 2026</span>
      </div>
      <div className="flex gap-5 text-xs text-text-subtle">
        <span>Web 2.5 · PostgreSQL + Polygon</span>
        <span>GDPR-ready</span>
      </div>
    </div>
  </footer>
);
