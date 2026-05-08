export interface ShapWeight {
  factor: string;
  contribution: number;
  description: string;
}

export interface CandidateExperience {
  org: string;
  role: string;
  startDate: string;
  endDate?: string;
  documentId: string;
  anchored: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  headline: string;
  city: string;
  yearsOfExperience: number;
  verifiedSkills: string[];
  totalDocuments: number;
  trustScore: number;
  experiences: CandidateExperience[];
  openToOpportunities: boolean;
  recencyDays: number;
}

export interface MatchResult {
  candidateId: string;
  totalScore: number;
  skillMatchPct: number;
  recencyScore: number;
  trustScore: number;
  shap: ShapWeight[];
  matchedSkills: string[];
  missingSkills: string[];
}
