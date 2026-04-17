/**
 * Spec-Driven Development: Sync Module
 * Validadores basados en specs/sync/schema.json
 * Única Fuente de Verdad para Sincronización Incremental
 */

import { z } from "zod";
import { ok, err, type Result, type AppError } from "@logiscore/core";
import { SyncErrors } from "./errors";

export { SyncErrors };
export type { SyncErrorCode } from "./errors";

export const SyncMetadataSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  tableName: z.string().min(1),
  lastSyncTimestamp: z.string().datetime(),
  lastSyncVersion: z.number().int().min(0).optional(),
  lastSyncStatus: z.enum(["success", "pending", "error"]).optional(),
  pendingChanges: z.number().int().min(0).optional(),
  createdAt: z.string().datetime().optional(),
});

export const SyncConflictSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  tableName: z.string().min(1),
  localId: z.string().min(1),
  localData: z.record(z.unknown()),
  remoteData: z.record(z.unknown()),
  strategy: z.enum(["LWW", "SUM_MERGE", "MANUAL"]),
  resolvedData: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "resolved", "manual_required"]).optional(),
  createdAt: z.string().datetime().optional(),
});

export const SyncErrorSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  tableName: z.string().min(1),
  localId: z.string().optional(),
  operation: z.enum(["create", "update", "delete"]),
  errorCode: z.string().min(1),
  errorMessage: z.string().min(1),
  retryable: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
});

export type SyncMetadata = z.infer<typeof SyncMetadataSchema>;
export type SyncConflict = z.infer<typeof SyncConflictSchema>;
export type SyncError = z.infer<typeof SyncErrorSchema>;

export type ConflictStrategy = "LWW" | "SUM_MERGE" | "MANUAL";

export const CATALOG_TABLES = ["products", "categories", "warehouses", "tax_rules", "exchange_rates"] as const;
export const TRANSACTIONAL_TABLES = ["sales", "purchases", "stock_movements", "invoices"] as const;

export function validateSyncMetadata(data: unknown): Result<SyncMetadata, AppError> {
  const result = SyncMetadataSchema.safeParse(data);
  if (!result.success) {
    return err({
      code: "SYNC_METADATA_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    });
  }
  return ok(result.data);
}

export function validateSyncConflict(data: unknown): Result<SyncConflict, AppError> {
  const result = SyncConflictSchema.safeParse(data);
  if (!result.success) {
    return err({
      code: "SYNC_CONFLICT_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    });
  }
  return ok(result.data);
}

export function validateConflictStrategy(
  tableName: string,
  strategy: ConflictStrategy
): Result<boolean, AppError> {
  const isCatalog = CATALOG_TABLES.includes(tableName as typeof CATALOG_TABLES[number]);
  const isTransactional = TRANSACTIONAL_TABLES.includes(tableName as typeof TRANSACTIONAL_TABLES[number]);

  if (isCatalog && strategy !== "LWW") {
    return err({
      code: SyncErrors.CONFLICT_STRATEGY_INVALID.code,
      message: "Tablas de catálogo solo usan estrategia LWW",
      retryable: false,
    });
  }

  if (isTransactional && strategy === "LWW") {
    return err({
      code: SyncErrors.CONFLICT_STRATEGY_INVALID.code,
      message: "Tablas transactionales no pueden usar LWW",
      retryable: false,
    });
  }

  return ok(true);
}

export function resolveConflictLWW(localData: Record<string, unknown>, remoteData: Record<string, unknown>): Record<string, unknown> {
  return { ...localData, ...remoteData };
}

export function resolveConflictSumMerge(
  localData: Record<string, unknown>,
  remoteData: Record<string, unknown>,
  fieldsToSum: string[]
): Record<string, unknown> {
  const result = { ...localData };

  for (const field of fieldsToSum) {
    const localValue = localData[field];
    const remoteValue = remoteData[field];

    if (typeof localValue === "number" && typeof remoteValue === "number") {
      const sum = localValue + remoteValue;
      result[field] = parseFloat(sum.toFixed(4));
    }
  }

  return result;
}

export function validateTenantSlug(tenantId: string): Result<boolean, AppError> {
  const slugRegex = /^[a-z0-9-]+$/;

  if (!slugRegex.test(tenantId)) {
    return err({
      code: SyncErrors.TENANT_ID_MUST_BE_SLUG.code,
      message: "En sync, tenantId debe ser slug (solo minúsculas, números y guiones)",
      retryable: false,
    });
  }

  return ok(true);
}