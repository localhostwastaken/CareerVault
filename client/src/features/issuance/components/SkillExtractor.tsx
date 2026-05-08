import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useDebounced } from "@/hooks/useDebounced";
import { extractSkills, SKILLS_ONTOLOGY } from "@/mocks/skillsOntology";
import { cn } from "@/lib/cn";

interface Props {
  text: string;
  className?: string;
}

export const SkillExtractor = ({ text, className }: Props) => {
  const debounced = useDebounced(text, 350);
  const [extracting, setExtracting] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!debounced.trim()) {
      setSkills([]);
      return;
    }
    setExtracting(true);
    const t = setTimeout(() => {
      setSkills(extractSkills(debounced));
      setExtracting(false);
    }, 220);
    return () => clearTimeout(t);
  }, [debounced]);

  return (
    <div className={cn("rounded-xl border border-border bg-surface-2 p-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className={cn("size-4 text-anchor", extracting && "animate-pulse")} />
        <p className="text-xs font-semibold uppercase tracking-wider text-anchor">
          AI skill extraction
        </p>
        {extracting ? (
          <span className="ml-auto text-xs text-text-muted">Analysing…</span>
        ) : (
          <span className="ml-auto text-xs text-text-muted tnum">
            {skills.length} / {SKILLS_ONTOLOGY.length} ontology matches
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-text-muted">
        These skills are extracted from your draft and embedded into the JSON-LD before hashing.
        They become part of the cryptographically verified record.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5 min-h-9">
        {skills.length === 0 && !extracting ? (
          <p className="text-xs text-text-subtle">Start typing — skills will appear here as we recognise them.</p>
        ) : null}
        {skills.map((s) => (
          <span
            key={s}
            className="rounded-full border border-anchor/30 bg-anchor-soft px-2.5 py-1 text-xs font-medium text-anchor"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};
