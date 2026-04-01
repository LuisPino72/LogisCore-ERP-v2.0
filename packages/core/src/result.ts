import type { AppError } from "./errors";

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never, E = AppError>(error: E): Result<T, E> => ({
  ok: false,
  error
});
