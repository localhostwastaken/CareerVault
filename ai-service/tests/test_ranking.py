from app import ranking
from app.schemas import Candidate


def test_weighted_sum_fallback_reconciles_to_match_score():
    # load_model() is never called here, so _model stays None (its module default) -  this is the transparent weighted-sum path, independent of whether lightgbm happens to be installed in the current environment.
    candidate = Candidate(
        holder_id="abc",
        skills=["python", "react"],
        embedding_similarity=0.8,
        seniority_fit=0.6,
        industry_overlap=0.5,
        years_exp_fit=0.7,
        recency=0.9,
    )
    response = ranking.rank(["python", "react", "aws"], [candidate])
    assert response.model_version == "weighted-sum-0.1.0"
    ranked = response.ranked[0]
    total_contrib = sum(c.shap_value for c in ranked.contributions)
    # match_score is rounded to 4dp (ranking.py) while the summed contributions aren't.
    assert abs(ranked.base_value + total_contrib - ranked.match_score) < 1e-3


def test_rank_sorts_candidates_by_match_score_descending():
    strong = Candidate(
        holder_id="strong",
        skills=["python"],
        embedding_similarity=0.9,
        seniority_fit=0.9,
        industry_overlap=0.9,
        years_exp_fit=0.9,
        recency=0.9,
    )
    weak = Candidate(
        holder_id="weak",
        skills=[],
        embedding_similarity=0.1,
        seniority_fit=0.1,
        industry_overlap=0.1,
        years_exp_fit=0.1,
        recency=0.1,
    )
    response = ranking.rank(["python"], [weak, strong])
    assert [c.holder_id for c in response.ranked] == ["strong", "weak"]
