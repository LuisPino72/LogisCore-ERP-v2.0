import { createAppError, err, ok, type Result, type AppError } from "@logiscore/core";
import { supabase } from "@/lib/supabase/client";
import type { SyncQueueItem } from "@logiscore/core";

export interface SyncProcessor {
  process(item: SyncQueueItem): Promise<Result<void, AppError>>;
}

export const createEdgeFunctionSyncProcessor = (): SyncProcessor => ({
  async process(item: SyncQueueItem): Promise<Result<void, AppError>> {
    if (!supabase) {
      return err(
        createAppError({
          code: "SYNC_NO_CLIENT",
          message: "Supabase client no disponible en entorno de test.",
          retryable: false
        })
      );
    }

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        return err(
          createAppError({
            code: "SYNC_NO_SESSION",
            message: "No hay sesion activa para sincronizar.",
            retryable: false
          })
        );
      }

      const response = await supabase.functions.invoke("sync_table_item", {
        body: {
          table: item.table,
          operation: item.operation,
          localId: item.localId,
          payload: item.payload
        }
      });

      if (response.error) {
        const errorMessage =
          response.data?.error ?? response.error.message ?? "Unknown error";
        const errorDetails = response.data?.details;

        const isConflict =
          errorMessage.includes("CONFLICT") ||
          errorMessage.includes("DUPLICATE") ||
          errorMessage.includes("UNIQUE");

        return err(
          createAppError({
            code: isConflict ? "SYNC_CONFLICT" : "SYNC_FUNCTION_ERROR",
            message: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
            retryable: !isConflict,
            context: {
              table: item.table,
              operation: item.operation,
              localId: item.localId
            }
          })
        );
      }

      return ok(undefined);
    } catch (cause) {
      if (cause instanceof Error) {
        return err(
          createAppError({
            code: "SYNC_EXCEPTION",
            message: cause.message,
            retryable: true,
            cause
          })
        );
      }

      return err(
        createAppError({
          code: "SYNC_UNKNOWN",
          message: "Error desconocido al sincronizar.",
          retryable: true,
          cause
        })
      );
    }
  }
});