"""Text embeddings (384-dim).

Primary: sentence-transformers `all-MiniLM-L6-v2`. If the model or its heavy deps
(torch) are unavailable, fall back to a deterministic hashing embedding so the service
stays runnable and cosine similarity still reflects token overlap. The model loads once,
eagerly at import (main thread), so request handlers only ever read a fully-built model.
"""

from __future__ import annotations

import hashlib
import math
import re
import threading

from .config import get_settings

_settings = get_settings()
_DIM = _settings.embedding_dim

_model = None
_loaded = False
_lock = threading.Lock()
_token_re = re.compile(r"[a-z0-9]+")


def _load_model():
    global _model, _loaded
    if _loaded:
        return _model
    with _lock:
        if _loaded:
            return _model
        try:
            from sentence_transformers import SentenceTransformer

            model = SentenceTransformer(_settings.embedding_model)
        except Exception:  # noqa: BLE001 - any import/load failure falls back gracefully
            model = None
        _model = model
        _loaded = True  # set only after _model is assigned (no torn read)
    return _model


def _hashing_embedding(text: str) -> list[float]:
    """Deterministic bag-of-tokens projection into _DIM buckets, L2-normalized."""
    vec = [0.0] * _DIM
    for token in _token_re.findall(text.lower()):
        digest = hashlib.sha1(token.encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:4], "big") % _DIM
        sign = 1.0 if digest[4] & 1 else -1.0
        vec[bucket] += sign
    norm = math.sqrt(sum(value * value for value in vec))
    if norm == 0:
        return vec
    return [value / norm for value in vec]


def embed(text: str) -> list[float]:
    model = _load_model()
    if model is None:
        return _hashing_embedding(text)
    vector = [float(value) for value in model.encode(text or "", normalize_embeddings=True)]
    # Guard against model/config drift vs the fixed vector(384) DB column.
    if len(vector) != _DIM:
        return _hashing_embedding(text)
    return vector


def model_name() -> str:
    if not _loaded:
        return "loading"
    return _settings.embedding_model if _model is not None else "hashing-fallback-384"


# NOTE: the model loads lazily on first /embed (made race-safe by the lock above), NOT
# eagerly at import. Eager-loading torch here alongside LightGBM's import-time training
# loads two OpenMP runtimes during import and segfaults on macOS.
