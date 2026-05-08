import { Link } from "react-router-dom";
import { Briefcase, ClipboardCheck, Search, ShieldCheck, User, type LucideIcon } from "lucide-react";

interface Persona {
  icon: LucideIcon;
  label: string;
  blurb: string;
  to: string;
  cta: string;
}

const PERSONAS: Persona[] = [
  { icon: User, label: "An employee", blurb: "Build a career wallet you own — proof of every job, salary, and reference.", to: "/auth/register?role=holder", cta: "Start your wallet" },
  { icon: Briefcase, label: "A manager", blurb: "Sign letters in 60 seconds with a magic link. No new password to remember.", to: "/auth/register?role=manager", cta: "Sign documents" },
  { icon: ClipboardCheck, label: "An HR team", blurb: "Cross-check, finalise, and bulk-issue letters with full compliance trail.", to: "/auth/register?role=hr", cta: "Approve & issue" },
  { icon: ShieldCheck, label: "An organisation", blurb: "Verify your domain in minutes; issue tamper-proof career documents at scale.", to: "/auth/register?role=admin", cta: "Onboard your org" },
  { icon: Search, label: "A recruiter", blurb: "Search candidates by cryptographically verified skills. No more LinkedIn lies.", to: "/auth/register?role=verifier", cta: "Find verified talent" },
];

export const LandingRoleSelector = () => (
  <section className="border-b border-border bg-bg py-16 sm:py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">I am a…</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
          One platform. Five workflows. Every role does less work, with more proof.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PERSONAS.map((p) => (
          <Link
            key={p.label}
            to={p.to}
            className="group flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <p.icon className="size-5" strokeWidth={2} />
            </span>
            <p className="mt-4 text-sm font-semibold text-text">{p.label}</p>
            <p className="mt-1 flex-1 text-sm text-text-muted">{p.blurb}</p>
            <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {p.cta} <span aria-hidden>→</span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  </section>
);
