/**
 * Módulo de Autenticación
 * Maneja login, logout y sesión de usuarios via Supabase Auth
 */

import type { AppError } from "@logiscore/core";

/**
 * Sesión activa del usuario
 * userId: ID único del usuario en auth.users
 * email: Correo electrónico del usuario (opcional)
 */
export interface AuthSession {
  userId: string;
  email?: string;
}

/**
 * Estado de la UI para el módulo de autenticación
 * isLoading: Indica si hay una operación en curso
 * session: Sesión actual del usuario (null si no hay sesión)
 * lastError: Último error ocurrido (null si no hay error)
 */
export interface AuthUiState {
  isLoading: boolean;
  session: AuthSession | null;
  lastError: AppError | null;
}
