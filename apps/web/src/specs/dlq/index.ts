/**
 * Spec-Driven Development: DLQ Module
 * Validadores basados en specs/dlq/schema.json
 * Única Fuente de Verdad para Dead Letter Queue
 */

import { z } from "zod";
import { ok, err, type Result, type AppError } from "@logiscore/core";
import { DLQErrors } from "./errors";

export { DLQErrors };
export type { DLQErrorCode } from "./errors";

export const DLQEntrySchema = z.object({
  messageId: z.string().uuid(),
  originalPayload: z.record(z.unknown()),
  error: z.object({
    code: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }),
  retryCount: z.number().int().min(0).max(5),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  tenantId: z.string(),
  tableName: z.string(),
  operation: z.enum(["CREATE", "UPDATE", "DELETE", "SYNC"]),
});

export type DLQEntry = z.infer<typeof DLQEntrySchema>;

export function validateDLQEntry(data: unknown): Result<DLQEntry, AppError> {
  const result = DLQEntrySchema.safeParse(data);
  if (!result.success) {
    const error: AppError = {
      code: "DLQ_VALIDATION_FAILED",
      message: result.error.errors.map(e => e.message).join(", "),
      retryable: false,
    };
    return err(error);
  }
  return ok(result.data);
}

export function canRetry(entry: DLQEntry): boolean {
  return entry.retryCount < 5 && entry.resolvedAt === null;
}

export function isResolved(entry: DLQEntry): boolean {
  return entry.resolvedAt !== null;
}

export function createDLQEntry(
  payload: unknown,
  errorCode: string,
  errorMessage: string,
  tenantId: string,
  tableName: string,
  operation: "CREATE" | "UPDATE" | "DELETE" | "SYNC"
): DLQEntry {
  return {
    messageId: crypto.randomUUID(),
    originalPayload: payload as Record<string, unknown>,
    error: { code: errorCode, message: errorMessage },
    retryCount: 0,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    tenantId,
    tableName,
    operation,
  };
}