import { err, ok, type Result } from "./result";
import { createAppError, type AppError } from "./errors";

export class AsyncLock {
  private locks: Map<string, Promise<unknown>> = new Map();

  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<Result<T, AppError>> {
    const currentLock = this.locks.get(key);

    if (currentLock) {
      try {
        await currentLock;
      } catch {
        // Ignorar errores de ejecuciones anteriores
      }
    }

    const executionPromise = fn().finally(() => {
      this.locks.delete(key);
    });

    this.locks.set(key, executionPromise);

    try {
      const result = await executionPromise;
      return ok(result);
    } catch (error) {
      this.locks.delete(key);
      return err(
        createAppError({
          code: "ASYNC_LOCK_ERROR",
          message: error instanceof Error ? error.message : "Error en ejecución bloqueada",
          retryable: false,
          cause: error
        })
      );
    }
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  getLockedCount(): number {
    return this.locks.size;
  }

  clear(): void {
    this.locks.clear();
  }
}

export const globalAsyncLock = new AsyncLock();