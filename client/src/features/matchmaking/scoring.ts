import type { Candidate, MatchResult, ShapWeight } from "./types";

export function scoreCandidate(c: Candidate, requiredSkills: string[]): MatchResult {
  const required = new Set(requiredSkills.map((s) => s.toLowerCase()));
  const verified = new Set(c.verifiedSkills.map((s) => s.toLowerCase()));

  const matchedSkills = c.verifiedSkills.filter((s) => required.has(s.toLowerCase()));
  const missingSkills = requiredSkills.filter((s) => !verified.has(s.toLowerCase()));

  const skillMatchPct = required.size === 0 ? 0 : (matchedSkills.length / required.size) * 100;

  // Recency: 0–100, exponential decay over 365 days
  const recencyScore = Math.max(0, Math.min(100, 100 * Math.exp(-c.recencyDays / 240)));

  // Trust score from issuer
  const trust = c.trustScore;

  const totalScore = 0.5 * skillMatchPct + 0.3 * recencyScore + 0.2 * trust;

  // SHAP-style decomposition: positive contributions for matched skills,
  // recency, and trust; small negative for missing skills.
  const shap: ShapWeight[] = [];
  matchedSkills.forEach((s) => {
    const w = (50 / Math.max(1, required.size)) * 1;
    shap.push({ factor: `Verified "${s}" skill`, contribution: +w, description: `Cryptographically verified in candidate's career documents.` });
  });
  missingSkills.forEach((s) => {
    const w = (50 / Math.max(1, required.size)) * -1;
    shap.push({ factor: `Missing "${s}"`, contribution: w, description: `Not present in any verified document. Could still be self-reported elsewhere.` });
  });
  shap.push({
    factor: `Document recency (${c.recencyDays}d)`,
    contribution: +recencyScore * 0.3,
    description: `More recent documents weight higher. Decay over ~240 days.`,
  });
  shap.push({
    factor: `Issuer trust (${matchedSkills.length ? "verified org" : "—"})`,
    contribution: +trust * 0.2,
    description: `Trust score of the most recent issuing organisation.`,
  });
  shap.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    candidateId: c.id,
    totalScore: Math.round(totalScore),
    skillMatchPct: Math.round(skillMatchPct),
    recencyScore: Math.round(recencyScore),
    trustScore: trust,
    shap,
    matchedSkills,
    missingSkills,
  };
}

export function rankCandidates(candidates: Candidate[], requiredSkills: string[]): Array<{ candidate: Candidate; match: MatchResult }> {
  return candidates
    .filter((c) => c.openToOpportunities)
    .map((c) => ({ candidate: c, match: scoreCandidate(c, requiredSkills) }))
    .sort((a, b) => b.match.totalScore - a.match.totalScore);
}
