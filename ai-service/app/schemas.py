from pydantic import BaseModel, Field

# HTTP contract consumed by the NestJS AiClient. Keep field names in sync with
# server/src/services/ai/ai-client.service.ts.


class ExtractRequest(BaseModel):
    text: str


class ExtractResponse(BaseModel):
    skills: list[str] = Field(default_factory=list)
    job_title: str | None = None
    seniority: str | None = None
    years_of_experience: int | None = None
    certifications: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    confidence_scores: dict[str, float] = Field(default_factory=dict)


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


class Candidate(BaseModel):
    holder_id: str
    skills: list[str] = Field(default_factory=list)
    embedding_similarity: float = 0.0
    seniority_fit: float = 0.0
    industry_overlap: float = 0.0
    years_exp_fit: float = 0.0
    recency: float = 0.0


class RankRequest(BaseModel):
    job_required_skills: list[str] = Field(default_factory=list)
    candidates: list[Candidate] = Field(default_factory=list)


class ShapContribution(BaseModel):
    feature: str
    value: float
    shap_value: float


class RankedCandidate(BaseModel):
    holder_id: str
    match_score: float
    base_value: float
    contributions: list[ShapContribution]


class RankResponse(BaseModel):
    ranked: list[RankedCandidate]
    model_version: str
