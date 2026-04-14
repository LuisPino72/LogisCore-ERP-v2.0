/**
 * Spec-Driven Development: Audit Module
 * Validadores basados en specs/audit/schema.json
 * Única Fuente de Verdad para auditoría e inviolabilidad
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  AUDIT_ERROR_CODES,
  type AuditErrorCode,
  createAuditError,
  EVENT_TYPE_REGEX,
  APPROVED_EVENTS,
  validateEventType,
  isEventApproved,
  validateTenantId,
  validateTimestamp,
  validateDetails,
  validateTargetTable,
} from "./errors";

export {
  AUDIT_ERROR_CODES,
  type AuditErrorCode,
  APPROVED_EVENTS,
  validateEventType,
  isEventApproved,
  validateTargetTable,
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

export const auditLogSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  user_id: z.string().uuid("Usuario debe ser UUID válido"),
  event_type: z.string().regex(EVENT_TYPE_REGEX, "Formato: MODULO.ACCION"),
  target_table: z.string().min(1, "Tabla objetivo es obligatoria"),
  target_local_id: z.string().uuid().nullable().optional(),
  ip_address: z.string().ip().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  success: z.boolean("Campo 'success' es obligatorio"),
  details: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().datetime({ message: "Debe ser UTC ISO 8601" }),
});

export type AuditLogInput = z.infer<typeof auditLogSchema>;

export const createAuditSchema = auditLogSchema.omit({ id: true, created_at: true }).extend({
  event_type: z.string().regex(EVENT_TYPE_REGEX, "Formato: MODULO.ACCION"),
  success: z.boolean("Campo 'success' es obligatorio"),
  details: z.record(z.unknown()).nullable().optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditSchema>;

export function validateAuditLog(input: unknown): Result<AuditLogInput, AppError> {
  const result = auditLogSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    return err(createAuditError(
      AUDIT_ERROR_CODES.MISSING_REQUIRED_FIELDS,
      {
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validateAuditForCreation(input: unknown): Result<CreateAuditLogInput, AppError> {
  const result = createAuditSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    if (firstIssue?.path?.includes("event_type")) {
      if (!EVENT_TYPE_REGEX.test(String(firstIssue?.message))) {
        return err(createAuditError(
          AUDIT_ERROR_CODES.EVENT_INVALID,
          { providedValue: firstIssue?.message }
        ));
      }
    }
    
    return err(createAuditError(
      AUDIT_ERROR_CODES.MISSING_REQUIRED_FIELDS,
      {
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  const data = result.data;
  
  if (!isEventApproved(data.event_type)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.EVENT_NOT_WHITELISTED,
      { eventType: data.event_type }
    ));
  }
  
  return ok(data);
}

export function validateEventTypeForAudit(eventType: string): Result<void, AppError> {
  if (!validateEventType(eventType)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.EVENT_INVALID,
      { eventType }
    ));
  }
  
  if (!isEventApproved(eventType)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.EVENT_NOT_WHITELISTED,
      { eventType }
    ));
  }
  
  return ok(undefined);
}

export function validateAuditImmutability(
  action: "update" | "delete"
): Result<void, AppError> {
  return err(createAuditError(
    AUDIT_ERROR_CODES.IMMUTABLE_VIOLATION,
    { providedValue: action }
  ));
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!validateTenantId(tenantId)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.TENANT_ID_MUST_BE_SLUG,
      { providedValue: tenantId }
    ));
  }
  return ok(undefined);
}

export function validateAuditTimestamp(timestamp: string): Result<void, AppError> {
  if (!validateTimestamp(timestamp)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.TIMESTAMP_INVALID,
      { providedValue: timestamp }
    ));
  }
  return ok(undefined);
}

export function validateAuditDetails(details: unknown): Result<void, AppError> {
  if (!validateDetails(details)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.DETAILS_INVALID,
      { providedValue: details }
    ));
  }
  return ok(undefined);
}

export function validateTargetTableForAudit(targetTable: string): Result<void, AppError> {
  if (!validateTargetTable(targetTable)) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.MISSING_REQUIRED_FIELDS,
      { targetTable }
    ));
  }
  return ok(undefined);
}

export interface AuditQueryFilters {
  tenantId?: string;
  userId?: string;
  eventType?: string;
  targetTable?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
}

export function validateAuditQueryFilters(filters: unknown): Result<AuditQueryFilters, AppError> {
  const schema = z.object({
    tenantId: z.string().regex(SLUG_REGEX).optional(),
    userId: z.string().uuid().optional(),
    eventType: z.string().regex(EVENT_TYPE_REGEX).optional(),
    targetTable: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    success: z.boolean().optional(),
  });
  
  const result = schema.safeParse(filters);
  
  if (!result.success) {
    return err(createAuditError(
      AUDIT_ERROR_CODES.MISSING_REQUIRED_FIELDS,
      { fields: result.error.issues.map(i => i.message) }
    ));
  }
  
  return ok(result.data);
}

export const auditConfig = {
  maxDetailsSize: 10000,
  retentionDays: 365,
  indexableFields: ["tenant_id", "user_id", "event_type", "target_table", "created_at"],
} as const;