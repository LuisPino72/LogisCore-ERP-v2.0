import type { AppError } from "@logiscore/core";

export interface AuthSession {
  userId: string;
  email?: string;
}

export interface AuthUiState {
  isLoading: boolean;
  session: AuthSession | null;
  lastError: AppError | null;
}
