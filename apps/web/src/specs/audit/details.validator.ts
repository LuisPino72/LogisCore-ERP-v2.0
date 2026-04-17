/**
 * Spec-Driven Development: Audit Details Module
 * Validadores basados en specs/audit/details.schema.json
 * Única Fuente de Verdad para Detalles de Auditoría
 */

import { z } from "zod";
import { ok, err, type Result, type AppError } from "@logiscore/core";

export const AuditDetailsErrors = {
  DETAILS_MISMATCH: {
    code: "AUDIT_DETAILS_MISMATCH",
    message: "El campo details no coincide con el esquema del evento",
    retryable: false,
  },
  REASON_REQUIRED: {
    code: "AUDIT_REASON_REQUIRED",
    message: "Motivo requerido para acciones sensibles",
    retryable: false,
  },
  ACTOR_REQUIRED: {
    code: "AUDIT_ACTOR_REQUIRED",
    message: "Actor requerido para log de auditoría",
    retryable: false,
  },
} as const;

export type AuditDetailsErrorCode = keyof typeof AuditDetailsErrors;

export const SensitiveActionDetailsSchema = z.object({
  oldValue: z.unknown(),
  newValue: z.unknown(),
  reason: z.string().min(1),
});

export const TenantChangeDetailsSchema = z.object({
  fromTenant: z.string(),
  toTenant: z.string(),
  authorizedBy: z.string(),
});

export const PlanUpgradeDetailsSchema = z.object({
  oldPlan: z.string(),
  newPlan: z.string(),
  transactionId: z.string(),
});

export const PriceChangeDetailsSchema = z.object({
  productId: z.string(),
  oldPrice: z.number(),
  newPrice: z.number(),
  reason: z.string().optional(),
});

export const UserDeletedDetailsSchema = z.object({
  userId: z.string(),
  deletedBy: z.string(),
  role: z.string(),
});

export const InvoiceVoidDetailsSchema = z.object({
  invoiceId: z.string(),
  reason: z.string().min(1),
  voidedBy: z.string(),
  originalTotal: z.number().optional(),
});

export const InventoryAdjustmentDetailsSchema = z.object({
  lotId: z.string(),
  oldQuantity: z.number(),
  newQuantity: z.number(),
  adjustedBy: z.string(),
  reason: z.string().optional(),
});

export const LoginSuccessDetailsSchema = z.object({
  userId: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const LoginFailedDetailsSchema = z.object({
  email: z.string(),
  reason: z.enum(["invalid_credentials", "account_locked", "account_inactive"]),
  ipAddress: z.string().optional(),
});

export type SensitiveActionDetails = z.infer<typeof SensitiveActionDetailsSchema>;
export type TenantChangeDetails = z.infer<typeof TenantChangeDetailsSchema>;
export type PlanUpgradeDetails = z.infer<typeof PlanUpgradeDetailsSchema>;
export type PriceChangeDetails = z.infer<typeof PriceChangeDetailsSchema>;
export type UserDeletedDetails = z.infer<typeof UserDeletedDetailsSchema>;
export type InvoiceVoidDetails = z.infer<typeof InvoiceVoidDetailsSchema>;
export type InventoryAdjustmentDetails = z.infer<typeof InventoryAdjustmentDetailsSchema>;
export type LoginSuccessDetails = z.infer<typeof LoginSuccessDetailsSchema>;
export type LoginFailedDetails = z.infer<typeof LoginFailedDetailsSchema>;

export type AuditEventType =
  | "SENSITIVE_ACTION"
  | "TENANT_CHANGE"
  | "PLAN_UPGRADE"
  | "PRICE_CHANGE"
  | "USER_DELETED"
  | "INVOICE_VOID"
  | "INVENTORY_ADJUSTMENT"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED";

export const AuditDetailsSchemas: Record<
  AuditEventType,
  z.ZodType<unknown>
> = {
  SENSITIVE_ACTION: SensitiveActionDetailsSchema,
  TENANT_CHANGE: TenantChangeDetailsSchema,
  PLAN_UPGRADE: PlanUpgradeDetailsSchema,
  PRICE_CHANGE: PriceChangeDetailsSchema,
  USER_DELETED: UserDeletedDetailsSchema,
  INVOICE_VOID: InvoiceVoidDetailsSchema,
  INVENTORY_ADJUSTMENT: InventoryAdjustmentDetailsSchema,
  LOGIN_SUCCESS: LoginSuccessDetailsSchema,
  LOGIN_FAILED: LoginFailedDetailsSchema,
};

export function validateAuditDetails(
  eventType: AuditEventType,
  details: unknown
): Result<unknown, AppError> {
  const schema = AuditDetailsSchemas[eventType];
  if (!schema) {
    return err({
      code: "AUDIT_DETAILS_MISMATCH",
      message: `Tipo de evento desconocido: ${eventType}`,
      retryable: false,
    });
  }

  const result = schema.safeParse(details);
  if (!result.success) {
    return err({
      code: "AUDIT_DETAILS_MISMATCH",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    });
  }

  return ok(result.data);
}

export function validateReasonRequired(
  details: unknown,
  eventType: AuditEventType
): Result<boolean, AppError> {
  const sensitiveEvents: AuditEventType[] = [
    "SENSITIVE_ACTION",
    "PRICE_CHANGE",
    "INVOICE_VOID",
    "INVENTORY_ADJUSTMENT",
  ];

  if (!sensitiveEvents.includes(eventType)) {
    return ok(true);
  }

  const detailsObj = details as { reason?: string };
  if (!detailsObj.reason || detailsObj.reason.length === 0) {
    return err(AuditDetailsErrors.REASON_REQUIRED);
  }

  return ok(true);
}

export function requiresReason(eventType: AuditEventType): boolean {
  const sensitiveEvents: AuditEventType[] = [
    "SENSITIVE_ACTION",
    "PRICE_CHANGE",
    "INVOICE_VOID",
    "INVENTORY_ADJUSTMENT",
  ];
  return sensitiveEvents.includes(eventType);
}

export function createAuditDetails(
  eventType: AuditEventType,
  data: unknown
): Result<unknown, AppError> {
  const validation = validateAuditDetails(eventType, data);
  if (!validation.ok) {
    return validation;
  }

  const reasonCheck = validateReasonRequired(data, eventType);
  if (!reasonCheck.ok) {
    return reasonCheck;
  }

  return ok(validation.data);
}