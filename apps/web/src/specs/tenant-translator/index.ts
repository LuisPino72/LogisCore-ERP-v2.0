import { z } from "zod";
import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import { createAppError } from "@logiscore/core";
import { TenantTranslatorErrors } from "./errors";

export { TenantTranslatorErrors };

const tenantMappingSchema = z.object({
  tenantSlug: z.string().regex(/^[a-z0-9-]+$/, "Slug debe tener solo minúsculas, números y guiones"),
  tenantUuid: z.string().uuid(),
  tenantName: z.string().min(1),
  ownerUserId: z.string().uuid().optional()
});

const _translationInputSchema = z.object({
  tenantSlug: z.string().regex(/^[a-z0-9-]+$/),
  payload: z.record(z.unknown()).optional()
});

const tenantValidationInputSchema = z.object({
  payloadTenantSlug: z.string().regex(/^[a-z0-9-]+$/),
  sessionTenantSlug: z.string().regex(/^[a-z0-9-]+$/)
});

export const validateTenantMapping = (
  data: unknown
): Result<unknown, AppError> => {
  const result = tenantMappingSchema.safeParse(data);
  if (!result.success) {
    return err(createAppError({
      code: "TENANT_MAPPING_VALIDATION_FAILED",
      message: `TenantMapping inválido: ${result.error.message}`,
      retryable: false,
      context: { errors: result.error.errors }
    }));
  }
  return ok(result.data);
};

export const validateTranslationInput = (
  tenantSlug: string
): Result<string, AppError> => {
  const result = z.string().regex(/^[a-z0-9-]+$/).safeParse(tenantSlug);
  if (!result.success) {
    return err(TenantTranslatorErrors.INVALID_SLUG_FORMAT);
  }
  return ok(tenantSlug);
};

export const validateTenantMatch = (
  payloadTenantSlug: string,
  sessionTenantSlug: string
): Result<void, AppError> => {
  const result = tenantValidationInputSchema.safeParse({
    payloadTenantSlug,
    sessionTenantSlug
  });
  
  if (!result.success) {
    return err(createAppError({
      code: "TENANT_VALIDATION_INPUT_INVALID",
      message: "Input de validación de tenant inválido",
      retryable: false
    }));
  }

  if (payloadTenantSlug !== sessionTenantSlug) {
    return err(TenantTranslatorErrors.TENANT_MISMATCH);
  }

  return ok(undefined);
};

export const validateTenantUuidFormat = (
  uuid: string
): Result<string, AppError> => {
  const result = z.string().uuid().safeParse(uuid);
  if (!result.success) {
    return err(createAppError({
      code: "TENANT_UUID_INVALID_FORMAT",
      message: "El UUID del tenant tiene formato inválido",
      retryable: false,
      context: { provided: uuid }
    }));
  }
  return ok(uuid);
};

export const TENANT_TRANSLATOR_VALIDATORS = {
  validateTenantMapping,
  validateTranslationInput,
  validateTenantMatch,
  validateTenantUuidFormat
} as const;

export type { };