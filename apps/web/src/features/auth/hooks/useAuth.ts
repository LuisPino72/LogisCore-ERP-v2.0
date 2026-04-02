/**
 * Hook de autenticación
 * Coordina el estado de UI para operaciones de auth (login, carga de sesión)
 */

import { useCallback, useState } from "react";
import type { AuthService } from "../services/auth.service";
import type { AuthUiState } from "../types/auth.types";

/** Estado inicial sin sesión */
const initialState: AuthUiState = {
  isLoading: false,
  session: null,
  lastError: null
};

interface UseAuthOptions {
  service: AuthService;
}

/**
 * Hook para gestionar autenticación
 * @param service - Servicio de auth inyectado (para testing)
 * @returns state, loadSession, signIn
 */
export const useAuth = ({ service }: UseAuthOptions) => {
  const [state, setState] = useState<AuthUiState>(initialState);

  /**
   * Carga la sesión activa del usuario
   * Llama a getActiveSession del servicio
   */
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

  /**
   * Inicia sesión con email y password
   * Llama a signIn del servicio
   */
  const signIn = useCallback(async (email: string, password: string) => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await service.signIn(email, password);
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

  return { state, loadSession, signIn };
};
