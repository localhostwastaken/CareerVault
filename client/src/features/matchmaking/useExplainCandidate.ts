import { useEffect, useRef, useState } from "react";
import { explainCandidate } from "./explainability";
import type {
  ExplainCandidateRequest,
  ExplainCandidateResponse,
} from "./types";

interface State {
  data?: ExplainCandidateResponse;
  isLoading: boolean;
  isError: boolean;
}

export function useExplainCandidate(request: ExplainCandidateRequest | null) {
  const [state, setState] = useState<State>({ isLoading: false, isError: false });
  const requestId = useRef(0);

  useEffect(() => {
    if (!request) return;

    const id = ++requestId.current;
    setState({ isLoading: true, isError: false });

    explainCandidate(request)
      .then((data) => {
        if (id !== requestId.current) return;
        setState({ data, isLoading: false, isError: false });
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setState({ isLoading: false, isError: true });
      });
  }, [
    request?.candidate.id,
    request?.match.totalScore,
    request?.requiredSkills.join(","),
  ]);

  return state;
}
