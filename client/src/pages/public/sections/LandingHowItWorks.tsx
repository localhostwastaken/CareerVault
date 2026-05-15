import { Anchor, FileSignature, KeyRound, Link2, Mail, ShieldCheck, type LucideIcon } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { icon: Mail,           title: "Request",      body: "An employee asks for a letter. The platform sends a magic link to the right manager." },
  { icon: FileSignature,  title: "Sign",         body: "The manager fills the content and signs digitally. AI extracts skills automatically." },
  { icon: KeyRound,       title: "Approve",      body: "HR cross-checks the dates and co-signs. Two-person integrity prevents fraud." },
  { icon: Anchor,         title: "Anchor",       body: "Every night at midnight, all new documents are batched into a Merkle tree and anchored on Polygon." },
  { icon: Link2,          title: "Share",        body: "The holder generates a share link. Optional one-time fee or premium subscription." },
  { icon: ShieldCheck,    title: "Verify",       body: "Recruiter opens the link and sees a six-step cryptographic verification report. No login required." },
];

export const LandingHowItWorks = () => (
  <section className="border-b border-border bg-surface py-16 sm:py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">
          From "trust me" to "verify me" in six steps.
        </h2>
        <p className="mt-3 text-base text-text-muted">
          A traditional database for speed. A public blockchain for trust. We call it <span className="font-semibold text-text">Web 2.5</span>.
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border-strong sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative bg-surface p-6">
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-text-subtle tnum">
              Step {String(i + 1).padStart(2, "0")}
            </span>
            <div className="mt-3 flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <step.icon className="size-5" strokeWidth={2} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-text">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
