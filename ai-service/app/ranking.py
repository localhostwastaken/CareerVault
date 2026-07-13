"""Explainable talent ranking.

Primary: a LightGBM regressor fit once on synthetic feature/label data, persisted to
disk, and reloaded as static weights on every subsequent start. Explanations use
LightGBM's native TreeSHAP (`predict(pred_contrib=True)`) — the same TreeSHAP the `shap`
package delegates to for tree models, but computed inside LightGBM so there is no second
native extension to segfault under the server's worker threads. Contributions + base
reconcile to the score.
Fallback: a transparent weighted sum (same feature set) if LightGBM is unavailable.

`load_model()` is invoked from the FastAPI lifespan (see `app/main.py`), never at import:
training at module scope makes every uvicorn worker re-fit its own model on startup, which
wastes CPU and balloons memory. Persisting the booster means at most one fit ever happens;
all later starts (and all extra workers) just read the saved weights.
"""

from __future__ import annotations

import logging
from pathlib import Path

from .schemas import Candidate, RankResponse, RankedCandidate, ShapContribution

_logger = logging.getLogger(__name__)

# Saved booster (LightGBM text format). Gitignored — generated on first run, not committed, so the checked-in artifact can never drift from the LightGBM version actually installed.
_MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "ranking_model.txt"

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


def _fit_booster():
    """Fit the regressor on deterministic synthetic data and return its native Booster.

    The booster (not the sklearn wrapper) is what we persist and predict with: TreeSHAP via
    `Booster.predict(pred_contrib=True)` needs no sklearn state, and the text format is stable.
    """
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
    return model.booster_


def load_model() -> None:
    """Load the persisted booster, fitting and saving it once if it is not on disk yet.

    Called from the FastAPI lifespan startup, so the work happens per process at most once.
    The save is atomic (temp file + rename) so concurrent first-boot workers can't observe a
    half-written model. Any failure falls back to the transparent weighted sum.
    """
    global _model, _version
    if _model is not None:
        return
    try:
        import lightgbm as lgb

        if _MODEL_PATH.exists():
            booster = lgb.Booster(model_file=str(_MODEL_PATH))
        else:
            booster = _fit_booster()
            _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            tmp = _MODEL_PATH.with_suffix(".txt.tmp")
            booster.save_model(str(tmp))
            tmp.replace(_MODEL_PATH)
        _model = booster
        _version = f"lightgbm-{lgb.__version__}+treeshap"
    except Exception as exc:  # noqa: BLE001 - fall back to the transparent weighted sum
        _logger.warning("Ranking model unavailable, using weighted-sum fallback: %s", exc)
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
