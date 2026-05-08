import { useEffect, useState } from "react";
import { FileCheck, Fingerprint, GitMerge, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { VerificationStep, type VerificationState } from "@/components/shared/VerificationStep";
import { SIX_STEPS, type StepResult } from "../buildSteps";

const ICONS = [Fingerprint, KeyRound, KeyRound, GitMerge, Link2, ShieldCheck, FileCheck] as const;

interface Props {
  results: StepResult[];
  autoPlay?: boolean;
  stepDurationMs?: number;
}

export const SixStepCheck = ({ results, autoPlay = true, stepDurationMs = 600 }: Props) => {
  const [activeIndex, setActiveIndex] = useState<number>(autoPlay ? -1 : SIX_STEPS.length);

  useEffect(() => {
    if (!autoPlay) return;
    let cancelled = false;
    const tick = (i: number) => {
      if (cancelled) return;
      setActiveIndex(i);
      if (i < SIX_STEPS.length) setTimeout(() => tick(i + 1), stepDurationMs);
    };
    setTimeout(() => tick(0), 250);
    return () => { cancelled = true; };
  }, [autoPlay, stepDurationMs]);

  return (
    <ol className="flex flex-col">
      {SIX_STEPS.map((step, i) => {
        const result = results.find((r) => r.id === step.id);
        const Icon = ICONS[i];
        let state: VerificationState = "idle";
        if (autoPlay) {
          if (i < activeIndex) state = result?.state ?? "passed";
          else if (i === activeIndex) state = "running";
        } else {
          state = result?.state ?? "passed";
        }
        return (
          <VerificationStep
            key={step.id}
            index={i + 1}
            title={step.title}
            description={step.description}
            state={state}
            icon={Icon}
            meta={state === "passed" || state === "failed" ? result?.meta : undefined}
          />
        );
      })}
    </ol>
  );
};
