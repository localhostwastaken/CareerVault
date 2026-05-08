import { mockOrgs } from "@/mocks/orgs";

const STATS = [
  { value: "30%", label: "Of resumes contain falsified employment claims" },
  { value: "$30–100", label: "Cost per traditional background verification" },
  { value: "Days", label: "Wait time when companies don't respond" },
  { value: "<1s", label: "CareerVault verification — anyone, anywhere" },
];

export const LandingTrust = () => (
  <section className="border-b border-border bg-bg py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-3xl font-extrabold tracking-tight text-primary tnum">{s.value}</p>
            <p className="mt-1 text-sm text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-text-subtle">
          Trusted by verified organisations
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {mockOrgs
            .filter((o) => o.verificationState === "verified")
            .map((o) => (
              <div key={o.id} className="flex items-center gap-2 text-text-muted">
                <span
                  className="flex size-8 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ background: o.logoBg }}
                >
                  {o.initials}
                </span>
                <span className="text-sm font-semibold">{o.name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  </section>
);
