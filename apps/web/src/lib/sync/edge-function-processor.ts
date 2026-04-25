import { createAppError, err, ok, type Result, type AppError } from "@logiscore/core";
import { supabase } from "@/lib/supabase/client";
import type { SyncQueueItem } from "@logiscore/core";
import { tenantTranslator } from "./tenant-translator";

export interface SyncProcessor {
  process(item: SyncQueueItem): Promise<Result<void, AppError>>;
}

const TRANSLATIONAL_TABLES = new Set([
  "sales",
  "sale_items",
  "sale_payments",
  "stock_movements",
  "purchases",
  "purchase_items",
  "purchase_received_items",
  "receivings",
  "receiving_items",
  "receiving_received_items",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "production_orders",
  "production_logs",
  "production_ingredients",
  "recipes",
  "recipe_ingredients",
  "inventory_counts",
  "inventory_movements",
  "categories",
  "products",
  "product_presentations",
  "suppliers",
  "warehouses"


]);

const isTranslationRequired = (table: string): boolean => {
  return TRANSLATIONAL_TABLES.has(table);
};

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
      const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        try {
          const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
          const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
          const json = atob(padded);
          return JSON.parse(json) as Record<string, unknown>;
        } catch {
          return null;
        }
      };

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        return err(
          createAppError({
            code: "SYNC_NO_SESSION",
            message: "No hay sesion activa para sincronizar.",
            retryable: false
          })
        );
      }

      let accessToken = sessionData.session.access_token;
      if (!accessToken) {
        return err(
          createAppError({
            code: "SYNC_NO_ACCESS_TOKEN",
            message: "No hay access token en la sesion activa.",
            retryable: false
          })
        );
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      if (!supabaseUrl || !anonKey) {
        return err(
          createAppError({
            code: "SYNC_ENV_MISSING",
            message: "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY para sincronizar.",
            retryable: false
          })
        );
      }

      const urlRef = (() => {
        try {
          return new URL(supabaseUrl).host.split(".")[0] ?? "";
        } catch {
          return "";
        }
      })();

      const tokenPayload = decodeJwtPayload(accessToken);
      const tokenIss = typeof tokenPayload?.iss === "string" ? tokenPayload.iss : "";
      const tokenRefFromIss = tokenIss.includes("/auth/v1") ? tokenIss.split("https://")[1]?.split(".")[0] : "";
      const anonPayload = decodeJwtPayload(anonKey);
      const anonRef = typeof anonPayload?.ref === "string" ? anonPayload.ref : "";

      if ((tokenRefFromIss && tokenRefFromIss !== urlRef) || (anonRef && anonRef !== urlRef)) {
        return err(
          createAppError({
            code: "SYNC_PROJECT_REF_MISMATCH",
            message: `Mismatch de proyecto Supabase (urlRef=${urlRef}, tokenRef=${tokenRefFromIss || "n/a"}, anonRef=${anonRef || "n/a"}).`,
            retryable: false
          })
        );
      }

      // Valida token actual y fuerza refresh si expiró.
      const tokenValidation = await supabase.auth.getUser(accessToken);
      if (tokenValidation.error) {
        const refreshResult = await supabase.auth.refreshSession();
        const refreshedToken = refreshResult.data.session?.access_token;
        if (!refreshedToken) {
          return err(
            createAppError({
              code: "SYNC_SESSION_REFRESH_FAILED",
              message: refreshResult.error?.message ?? "No se pudo refrescar la sesion.",
              retryable: true
            })
          );
        }
        accessToken = refreshedToken;
      }

      const functionCandidates = ["sync_table_item", "sync-table-item-hardened-2026"];
      let rawResponse: Response | null = null;
      let responseBody: { error?: string; details?: string } | null = null;

      for (let i = 0; i < functionCandidates.length; i++) {
        const functionName = functionCandidates[i]!;
        const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
        
        let enrichedPayload = item.payload;
        
        if (isTranslationRequired(item.table)) {
          const translationResult = await tenantTranslator.translatePayloadAsync(
            item.payload as Record<string, unknown>,
            item.tenantId
          );
          
          if (!translationResult.ok) {
            const errorResult = translationResult.error;
            return err(
              createAppError({
                code: "TENANT_TRANSLATION_FAILED",
                message: errorResult.message,
                retryable: false,
                context: {
                  table: item.table,
                  tenantSlug: item.tenantId,
                  localId: item.localId
                }
              })
            );
          }
          
          enrichedPayload = translationResult.data;
        }
        
        rawResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": anonKey
          },
          body: JSON.stringify({
            table: item.table,
            operation: item.operation,
            localId: item.localId,
            payload: enrichedPayload
          })
        });

        try {
          responseBody = (await rawResponse.json()) as { error?: string; details?: string };
        } catch {
          responseBody = null;
        }

        const shouldFallback =
          rawResponse.status === 401 &&
          i < functionCandidates.length - 1;

        if (!shouldFallback) {
          break;
        }
      }

      if (!rawResponse) {
        return err(
          createAppError({
            code: "SYNC_FUNCTION_NO_RESPONSE",
            message: "No se obtuvo respuesta de la Edge Function de sincronizacion.",
            retryable: true
          })
        );
      }

      if (!rawResponse.ok) {
        const errorMessage =
          responseBody?.error ??
          `HTTP_${rawResponse.status}`;
        const errorDetails = responseBody?.details;

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
