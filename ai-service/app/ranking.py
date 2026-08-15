"""Explainable talent ranking.

HONESTY NOTE — THIS MODEL HAS LEARNED NOTHING FROM REAL DATA.

There is no trained model here and no labelled dataset behind it. `_fit_booster` fits
LightGBM on uniform random noise whose labels are generated from `_WEIGHTS`, the
hand-tuned coefficients below. The tree ensemble therefore only re-derives, to within
its fitting error, the weighted sum a human wrote by hand — it adds no real-world
signal, learns no interaction that was not synthesised into the labels, and its ranking
carries exactly the authority of those six hand-picked numbers and no more.

Why keep it at all: TreeSHAP over a tree ensemble yields per-feature contributions in
the response shape the client's explainability panel already consumes, and it keeps the
serving path identical to the one a genuinely trained booster will use. It is
scaffolding with a real interface, not a model.

Consequently `model_version` is deliberately self-describing — `heuristic-lgbm-approx-*`,
never a bare `lightgbm-<version>` string, which would imply a trained model to every API
consumer that logs or displays it.

NOTE(phase5): the intended label source for real training is `MessageResponse`
(INTERESTED / NOT_INTERESTED) on recruiter outreach — i.e. recruiter-confirmed positives
per (job_opening, holder) pair, joined to the feature row computed at match time. Until
enough of those accumulate to train and validate on held-out data, do NOT retrain and do
NOT relabel this as a learned model.

Primary path: the LightGBM approximation described above, persisted to disk and reloaded
as static weights on every subsequent start. Explanations use LightGBM's native TreeSHAP
(`predict(pred_contrib=True)`) — the same TreeSHAP the `shap` package delegates to for
tree models, but computed inside LightGBM so there is no second native extension to
segfault under the server's worker threads. Contributions + base reconcile to the score.
Fallback: the same hand-tuned weights applied directly as a transparent weighted sum,
used when LightGBM is unavailable.

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

# Hand-tuned weights. These are the ONLY real content of the ranker: they synthesise the
# training labels the booster is fit against, and they drive the fallback directly. They
# were chosen by judgement, not estimated from outcomes.
_WEIGHTS = {
    "embedding_similarity": 0.40,
    "skill_overlap": 0.25,
    "seniority_fit": 0.15,
    "industry_overlap": 0.10,
    "years_exp_fit": 0.07,
    "recency": 0.03,
}

# Version strings are contract-visible (the server surfaces them as `modelVersion`), so they
# must not overstate what produced the score. Neither name may be changed to a bare
# framework version: "heuristic"/"approx" and "weighted-sum" are the honest signal that no
# training data was involved. Bump these only when the WEIGHTS or the scoring shape change.
_APPROX_VERSION = "heuristic-lgbm-approx-0.1.0"
_FALLBACK_VERSION = "weighted-sum-0.1.0"

_model = None
_version = _FALLBACK_VERSION


def _fit_booster():
    """Fit the regressor on deterministic synthetic noise and return its native Booster.

    NOT training in any meaningful sense: `x` is uniform random and `y` is `x @ _WEIGHTS`
    plus small jitter, so the ensemble can only rediscover the hand-tuned weights. This
    exists to produce a tree structure TreeSHAP can attribute over, not to learn anything.

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
        # Report the approximation, not `lightgbm-<version>`: the framework version would
        # read as provenance for a trained model, and there isn't one. The runtime version
        # is logged instead, where it is useful for debugging without reaching the API.
        _version = _APPROX_VERSION
        _logger.info(
            "Ranking: hand-tuned weight approximation (%s) via lightgbm %s; not trained on real outcomes",
            _version,
            lgb.__version__,
        )
    except Exception as exc:  # noqa: BLE001 - fall back to the transparent weighted sum
        _logger.warning("Ranking model unavailable, using weighted-sum fallback: %s", exc)
        _model = None
        _version = _FALLBACK_VERSION


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
