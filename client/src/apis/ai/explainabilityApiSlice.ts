import { APISlice } from "../APISlice";
import type { ExplainCandidateRequest, ExplainCandidateResponse } from "../../../../server/src/contracts/explainability";

export const explainabilityApiSlice = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    explainCandidate: builder.mutation<ExplainCandidateResponse, ExplainCandidateRequest>({
      query: (body) => ({
        url: "/ai/explain",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useExplainCandidateMutation } = explainabilityApiSlice;