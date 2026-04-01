export interface AppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  retryable: boolean;
  cause?: unknown;
}

export const createAppError = (input: AppError): AppError => ({
  ...input
});
