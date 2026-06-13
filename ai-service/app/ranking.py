"""Explainable talent ranking.

Primary: a LightGBM regressor trained at import (main thread) on synthetic
feature/label data. Explanations use LightGBM's native TreeSHAP
(`predict(pred_contrib=True)`) — the same TreeSHAP the `shap` package delegates to for
tree models, but computed inside LightGBM so there is no second native extension to
segfault under the server's worker threads. Contributions + base reconcile to the score.
Fallback: a transparent weighted sum (same feature set) if LightGBM is unavailable.
"""

from __future__ import annotations

from .schemas import Candidate, RankResponse, RankedCandidate, ShapContribution

FEATURES = [
    "embedding_similarity",
    "skill_overlap",
    "seniority_fit",
    "industry_overlap",
    "years_exp_fit",
    "recency",
]

# Ground-truth weights used to synthesize training labels; the learned model recovers
# their relative importance, and these also drive the deterministic fallback.
_WEIGHTS = {
    "embedding_similarity": 0.40,
    "skill_overlap": 0.25,
    "seniority_fit": 0.15,
    "industry_overlap": 0.10,
    "years_exp_fit": 0.07,
    "recency": 0.03,
}

_model = None
_version = "weighted-sum-0.1.0"


def _train() -> None:
    global _model, _version
    try:
        import lightgbm as lgb
        import numpy as np

        rng = np.random.default_rng(42)
        x = rng.random((2000, len(FEATURES)))
        weights = np.array([_WEIGHTS[name] for name in FEATURES])
        y = np.clip(x @ weights + rng.normal(0, 0.02, x.shape[0]), 0.0, 1.0)

        model = lgb.LGBMRegressor(
            n_estimators=200, num_leaves=31, learning_rate=0.05, min_child_samples=20, verbosity=-1
        )
        model.fit(x, y)
        _model = model
        _version = f"lightgbm-{lgb.__version__}+treeshap"
    except Exception:  # noqa: BLE001 - fall back to the transparent weighted sum
        _model = None
        _version = "weighted-sum-0.1.0"


def _skill_overlap(required: set[str], candidate_skills: list[str]) -> float:
    if not required:
        return 0.0
    have = {s.lower() for s in candidate_skills}
    return len(required & have) / len(required)


def _features(candidate: Candidate, overlap: float) -> list[float]:
    return [
        candidate.embedding_similarity,
        overlap,
        candidate.seniority_fit,
        candidate.industry_overlap,
        candidate.years_exp_fit,
        candidate.recency,
    ]


def _rank_weighted(required: set[str], candidates: list[Candidate]) -> list[RankedCandidate]:
    ranked = []
    for candidate in candidates:
        row = _features(candidate, _skill_overlap(required, candidate.skills))
        contributions = [
            ShapContribution(feature=name, value=row[i], shap_value=row[i] * _WEIGHTS[name])
            for i, name in enumerate(FEATURES)
        ]
        score = sum(c.shap_value for c in contributions)
        ranked.append(
            RankedCandidate(holder_id=candidate.holder_id, match_score=round(score, 4), base_value=0.0, contributions=contributions)
        )
    return ranked


def _rank_model(required: set[str], candidates: list[Candidate]) -> list[RankedCandidate]:
    import numpy as np

    matrix = np.array([_features(c, _skill_overlap(required, c.skills)) for c in candidates], dtype=float)
    # pred_contrib returns [...per-feature SHAP..., base_value] per row (TreeSHAP).
    contrib = _model.predict(matrix, pred_contrib=True)

    ranked = []
    for index, candidate in enumerate(candidates):
        row = contrib[index]
        base = float(row[len(FEATURES)])
        contributions = [
            ShapContribution(feature=name, value=float(matrix[index][i]), shap_value=float(row[i]))
            for i, name in enumerate(FEATURES)
        ]
        score = base + sum(c.shap_value for c in contributions)
        ranked.append(
            RankedCandidate(
                holder_id=candidate.holder_id,
                match_score=round(score, 4),
                base_value=round(base, 4),
                contributions=contributions,
            )
        )
    return ranked


def rank(job_required_skills: list[str], candidates: list[Candidate]) -> RankResponse:
    required = {s.lower() for s in job_required_skills}
    if _model is not None and candidates:
        ranked = _rank_model(required, candidates)
    else:
        ranked = _rank_weighted(required, candidates)
    ranked.sort(key=lambda r: r.match_score, reverse=True)
    return RankResponse(ranked=ranked, model_version=_version)


# Train once at import (main thread, during server startup) so request handlers only predict.
_train()
