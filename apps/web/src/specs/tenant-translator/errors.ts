import { createAppError } from "@logiscore/core";

export const TenantTranslatorErrors = {
  TRANSLATION_FAILED: createAppError({
    code: "SYNC_TENANT_TRANSLATION_FAILED",
    message: "No se puede resolver el UUID para el tenant. Ejecute bootstrapSession primero.",
    retryable: false
  }),
  TENANT_NOT_FOUND: createAppError({
    code: "TENANT_NOT_FOUND",
    message: "El tenant con el slug especificado no existe",
    retryable: false
  }),
  TENANT_ACCESS_DENIED: createAppError({
    code: "TENANT_ACCESS_DENIED",
    message: "El usuario actual no tiene acceso al tenant",
    retryable: false,
    context: { reason: "owner_mismatch" }
  }),
  TENANT_MISMATCH: createAppError({
    code: "TENANT_MISMATCH",
    message: "El payload pertenece a un tenant diferente",
    retryable: false
  }),
  SUPABASE_UNAVAILABLE: createAppError({
    code: "SYNC_TENANT_TRANSLATION_FAILED",
    message: "Cliente Supabase no disponible",
    retryable: false
  }),
  INVALID_SLUG_FORMAT: createAppError({
    code: "TENANT_INVALID_SLUG_FORMAT",
    message: "El slug del tenant debe contener solo minúsculas, números y guiones",
    retryable: false,
    context: { pattern: "^[a-z0-9-]+$" }
  }),
  CACHE_MISS: createAppError({
    code: "TENANT_CACHE_MISS",
    message: "No hay tenant en caché. Ejecute bootstrapSession para cargar el contexto.",
    retryable: false
  })
} as const;

export type TenantTranslatorErrorCode = keyof typeof TenantTranslatorErrors;