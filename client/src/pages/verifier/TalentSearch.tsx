import { useMemo, useState } from "react";
import { Building2, MapPin, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { mockCandidates } from "@/mocks/matches";
import { rankCandidates } from "@/features/matchmaking/scoring";
import { ShapBreakdown } from "@/features/matchmaking/components/ShapBreakdown";

const SUGGESTED = ["React", "TypeScript", "AWS", "System Design", "Python", "Kubernetes"];

const TalentSearch = () => {
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript", "AWS", "System Design"]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>("u_sarah");

  const ranked = useMemo(() => rankCandidates(mockCandidates, skills), [skills]);
  const active = ranked.find((r) => r.candidate.id === selected) ?? ranked[0];

  const addSkill = (s: string) => {
    if (!s.trim()) return;
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    setSkills([...skills, s.trim()]);
    setInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <PageHeader
        title="Talent search"
        description="Find candidates by cryptographically verified skills. Every match is backed by signed, anchored documents."
      />

      <Card className="mt-8">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Search className="size-4 text-text-muted" />
            {skills.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => removeSkill(s)}
                className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white"
              >
                {s} <X className="size-3" />
              </button>
            ))}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addSkill(input);
                if (e.key === "Backspace" && !input && skills.length) setSkills(skills.slice(0, -1));
              }}
              placeholder="Add a skill and press Enter"
              className="min-w-40 flex-1 bg-transparent text-sm focus:outline-none"
            />
            <Button onClick={() => addSkill(input)} size="sm" disabled={!input.trim()}>
              Add
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="text-xs text-text-subtle">Try:</span>
            {SUGGESTED.filter((s) => !skills.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted hover:bg-border"
              >
                + {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-subtle tnum">
            {ranked.length} verified candidates · sorted by match score
          </p>
          <div className="grid grid-cols-1 gap-3">
            {ranked.map(({ candidate, match }) => {
              const isActive = candidate.id === active?.candidate.id;
              return (
                <button
                  key={candidate.id}
                  onClick={() => setSelected(candidate.id)}
                  className={`text-left rounded-xl border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isActive ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>{candidate.name.split(" ").map((p) => p[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-text">{candidate.name}</p>
                        <p className="text-base font-bold text-primary tnum">{match.totalScore}<span className="text-xs font-medium text-text-muted">/100</span></p>
                      </div>
                      <p className="text-xs text-text-muted">{candidate.headline}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-text-subtle">
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{candidate.city}</span>
                        <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{candidate.yearsOfExperience}y experience</span>
                        <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3 text-verified" />{candidate.totalDocuments} verified docs</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {match.matchedSkills.slice(0, 5).map((s) => (
                          <Badge key={s} tone="verified">{s}</Badge>
                        ))}
                        {match.missingSkills.slice(0, 2).map((s) => (
                          <Badge key={s} tone="revoked">missing {s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {active ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Avatar>
                    <AvatarFallback>{active.candidate.name.split(" ").map((p) => p[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">{active.candidate.name}</p>
                    <p className="truncate text-xs text-text-muted">{active.candidate.headline}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-anchor-soft px-2 py-0.5 text-[10px] font-semibold text-anchor">
                    <Sparkles className="size-3" /> XAI breakdown
                  </span>
                </div>
                <ShapBreakdown shap={active.match.shap} totalScore={active.match.totalScore} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TalentSearch;
