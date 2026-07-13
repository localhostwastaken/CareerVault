from app import embeddings


def test_hashing_fallback_produces_normalized_vector_of_expected_dim():
    # sentence-transformers isn't installed in this test environment, so this exercises the real fallback path rather than a mocked one.
    vector = embeddings.embed("Skilled backend engineer with distributed systems experience.")
    assert len(vector) == embeddings._DIM
    norm = sum(v * v for v in vector) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_hashing_fallback_is_deterministic():
    text = "Same input text should always hash to the same vector"
    assert embeddings.embed(text) == embeddings.embed(text)
