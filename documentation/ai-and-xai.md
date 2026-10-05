# AI and XAI Subsystem

This document describes the **IMPLEMENTED** AI and Explainable AI (XAI) subsystem for CareerVault, located in `ai-service/`.

## Architecture Overview

The AI service is an independent Python FastAPI service (`http://localhost:9910`) that performs two primary tasks:
1. **Skill Extraction (NLP):** Extracts skills, job titles, seniority, and years of experience from document content.
2. **Talent Matchmaking (Ranking & XAI):** Ranks candidates against a job description and provides feature-level attribution using SHAP.

## 1. Skill Extraction

The skill extraction pipeline takes the plain text of a career document (or an array of text fields) and uses a deterministic or NLP-based approach to extract:
- `skillsJson`: Array of identified skills.
- `jobTitle`, `seniority`, `yearsOfExperience`.
- `embedding`: A 384-dimensional dense vector representing the document.

The extracted information is stored in the `extracted_skills` database table in PostgreSQL. The `embedding` field uses the `pgvector` extension for efficient similarity searches.

## 2. Talent Ranking and Matchmaking

When an HR recruiter queries for talent, the system matches `RecruiterJobOpening` required skills and embeddings against the `extracted_skills` of candidates.

The candidate matching happens in two stages:
1. **Candidate Retrieval:** Vector similarity search (HNSW or L2) via `pgvector` in PostgreSQL fetches candidates based on semantic closeness to the job opening.
2. **Feature Engineering & Ranking:** The `ai-service` applies a trained LightGBM gradient boosting model to assign a definitive `matchScore` to the candidate.

## 3. Explainable AI (XAI) with SHAP

CareerVault implements authentic Explainable AI through **TreeSHAP**, providing rigorous, deterministic feature attribution rather than LLM-generated heuristic text.

### Implementation Details
- The ranking model is a LightGBM booster (`lgb.Booster`).
- Feature attribution is calculated natively via LightGBM's `predict(pred_contrib=True)`, which delegates to the exact TreeSHAP algorithm used in the standard `shap` package.
- The model computes SHAP values across the engineered features (e.g., years of experience delta, vector similarity score, skill overlap count).

### Outputs
For every matched candidate, a `shapExplanationJson` payload is returned and persisted in the `talent_matches` table. This payload contains:
- `base_value`: The baseline score.
- `contributions`: An array of `ShapContribution` objects, each detailing:
  - `feature`: The feature name.
  - `value`: The raw input value.
  - `shap_value`: The positive or negative impact on the final score.

The frontend consumes these exact values to render an explainability panel, providing the recruiter with a mathematically sound attribution of why a specific candidate ranked highly.

## Status

- **NLP Extraction:** IMPLEMENTED
- **Embeddings and Vector Search:** IMPLEMENTED
- **Candidate Ranking (LightGBM):** IMPLEMENTED
- **Feature Attribution (TreeSHAP):** IMPLEMENTED
- **LLM Reasoning:** NOT IMPLEMENTED (CareerVault uses deterministic tree-based SHAP, not LLM proxies).
