import { useCallback, useState } from "react";
import type { AuthService } from "../services/auth.service";
import type { AuthUiState } from "../types/auth.types";

const initialState: AuthUiState = {
  isLoading: false,
  session: null,
  lastError: null
};

interface UseAuthOptions {
  service: AuthService;
}

export const useAuth = ({ service }: UseAuthOptions) => {
  const [state, setState] = useState<AuthUiState>(initialState);

  const loadSession = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await service.getActiveSession();
    if (!result.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: result.error
      }));
      return;
    }

    setState({
      isLoading: false,
      session: result.data,
      lastError: null
    });
  }, [service]);

  return { state, loadSession };
};
