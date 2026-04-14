/**
 * Spec-Driven Development: Admin Module
 * Validadores basados en specs/admin/schema.json
 * Única Fuente de Verdad para entidades administrativas (tenants, usuarios, suscripciones)
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  ADMIN_ERROR_CODES,
  TENANT_ERROR_CODES,
  USER_ERROR_CODES,
  SUBSCRIPTION_ERROR_CODES,
  type AdminErrorCode,
  createTenantError,
  createUserError,
  createSubscriptionError,
  createAdminError,
  validateRifFormat,
  validateTenantSlug,
  validateSubscriptionStatus,
  validateUserRole,
  RIF_REGEX,
  TENANT_SLUG_REGEX,
  VALID_SUBSCRIPTION_STATUSES,
  VALID_USER_ROLES,
  SUBSCRIPTION_STATUS_ACTIVE,
  SUBSCRIPTION_STATUS_SUSPENDED,
  SUBSCRIPTION_STATUS_EXPIRED,
  SUBSCRIPTION_STATUS_TRIAL,
  USER_ROLE_OWNER,
  USER_ROLE_EMPLOYEE,
  type ValidSubscriptionStatus,
  type ValidUserRole,
} from "./errors";

export {
  ADMIN_ERROR_CODES,
  TENANT_ERROR_CODES,
  USER_ERROR_CODES,
  SUBSCRIPTION_ERROR_CODES,
  type AdminErrorCode,
  createTenantError,
  createUserError,
  createSubscriptionError,
  createAdminError,
  RIF_REGEX,
  TENANT_SLUG_REGEX,
  VALID_SUBSCRIPTION_STATUSES,
  VALID_USER_ROLES,
  SUBSCRIPTION_STATUS_ACTIVE,
  SUBSCRIPTION_STATUS_SUSPENDED,
  SUBSCRIPTION_STATUS_EXPIRED,
  SUBSCRIPTION_STATUS_TRIAL,
  USER_ROLE_OWNER,
  USER_ROLE_EMPLOYEE,
  type ValidSubscriptionStatus,
  type ValidUserRole,
  validateRifFormat,
  validateTenantSlug,
  validateSubscriptionStatus,
  validateUserRole,
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

export const tenantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nombre es requerido").max(255, "Nombre máximo 255 caracteres"),
  slug: z.string()
    .regex(SLUG_REGEX, "Slug inválido")
    .min(3, "Slug mínimo 3 caracteres")
    .max(50, "Slug máximo 50 caracteres"),
  rif: z.string().regex(RIF_REGEX, "RIF inválido. Formato: VJJXXXXXXXX"),
  isActive: z.boolean(),
  ownerUserId: z.string().uuid(" ownerUserId debe ser UUID válido"),
  businessTypeId: z.string().uuid().nullable().optional(),
  subscriptionStatus: z.enum(["active", "suspended", "expired", "trial"]),
  createdAt: z.string().datetime().optional(),
});

export type TenantInput = z.infer<typeof tenantSchema>;

export const createTenantSchema = tenantSchema
  .omit({ id: true, createdAt: true })
  .extend({
    name: z.string().min(1, "Nombre es requerido").max(255),
    slug: z.string()
      .regex(SLUG_REGEX, "Slug debe tener solo minúsculas, números y guiones")
      .min(3, "Slug mínimo 3 caracteres")
      .max(50, "Slug máximo 50 caracteres"),
    rif: z.string().regex(RIF_REGEX, "RIF inválido. Formato: VJJXXXXXXXX"),
    ownerUserId: z.string().uuid("ownerUserId debe ser UUID válido"),
  });

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const updateTenantSchema = tenantSchema.partial().extend({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .regex(SLUG_REGEX)
    .min(3)
    .max(50)
    .optional(),
  rif: z.string().regex(RIF_REGEX).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export const userSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email("Email inválido"),
  fullName: z.string().nullable().optional(),
  role: z.enum(["owner", "employee"]),
  tenantId: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)"),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type UserInput = z.infer<typeof userSchema>;

export const createUserSchema = userSchema
  .omit({ id: true, createdAt: true, lastLoginAt: true })
  .extend({
    email: z.string().email("Email inválido"),
    role: z.enum(["owner", "employee"], {
      errorMap: () => ({ message: "Rol debe ser 'owner' o 'employee'" }),
    }),
    tenantId: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)"),
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = userSchema.partial().extend({
  email: z.string().email().optional(),
  fullName: z.string().nullable().optional(),
  role: z.enum(["owner", "employee"]).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "suspended", "expired", "trial"]),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  billingCycle: z.enum(["monthly", "quarterly", "annual"]).nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export const createSubscriptionSchema = subscriptionSchema
  .omit({ id: true, createdAt: true })
  .extend({
    tenantId: z.string().uuid("tenantId debe ser UUID válido"),
    status: z.enum(["active", "suspended", "expired", "trial"], {
      errorMap: () => ({ message: "Estado de suscripción inválido" }),
    }),
    startDate: z.string().datetime().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
  });

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = subscriptionSchema.partial().extend({
  planId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "suspended", "expired", "trial"]).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  billingCycle: z.enum(["monthly", "quarterly", "annual"]).nullable().optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export function validateTenant(input: unknown): Result<TenantInput, AppError> {
  const result = tenantSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createTenantError(
        TENANT_ERROR_CODES.NOT_FOUND,
        firstIssue
          ? {
              providedValue: firstIssue.path?.join("."),
              expectedValue: firstIssue.message,
            }
          : undefined
      )
    );
  }

  return ok(result.data);
}

export function validateTenantForCreation(input: unknown): Result<CreateTenantInput, AppError> {
  const result = createTenantSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    if (firstIssue?.path?.includes("slug")) {
      return err(
        createTenantError(TENANT_ERROR_CODES.SLUG_INVALID, {
          providedValue: String(firstIssue.message),
        })
      );
    }

    if (firstIssue?.path?.includes("rif")) {
      return err(
        createTenantError(TENANT_ERROR_CODES.RIF_INVALID, {
          providedValue: String(firstIssue.message),
        })
      );
    }

    return err(
      createTenantError(TENANT_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
        expectedValue: issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
      })
    );
  }

  const data = result.data;

  if (!validateRifFormat(data.rif)) {
    return err(createTenantError(TENANT_ERROR_CODES.RIF_INVALID, { rif: data.rif }));
  }

  if (!validateTenantSlug(data.slug)) {
    return err(createTenantError(TENANT_ERROR_CODES.SLUG_INVALID, { slug: data.slug }));
  }

  return ok(data);
}

export function validateTenantForUpdate(input: unknown): Result<UpdateTenantInput, AppError> {
  const result = updateTenantSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createTenantError(TENANT_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
        expectedValue: issues.map((i) => i.message).join(", "),
      })
    );
  }

  const data = result.data;

  if (data.rif && !validateRifFormat(data.rif)) {
    return err(createTenantError(TENANT_ERROR_CODES.RIF_INVALID, { rif: data.rif }));
  }

  if (data.slug && !validateTenantSlug(data.slug)) {
    return err(createTenantError(TENANT_ERROR_CODES.SLUG_INVALID, { slug: data.slug }));
  }

  return ok(data);
}

export function validateUser(input: unknown): Result<UserInput, AppError> {
  const result = userSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createUserError(USER_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  return ok(result.data);
}

export function validateUserForCreation(input: unknown): Result<CreateUserInput, AppError> {
  const result = createUserSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    if (firstIssue?.path?.includes("email")) {
      return err(
        createUserError(USER_ERROR_CODES.EMAIL_INVALID, {
          email: String(firstIssue.message),
        })
      );
    }

    if (firstIssue?.path?.includes("role")) {
      return err(
        createUserError(USER_ERROR_CODES.INVALID_ROLE, {
          role: String(firstIssue.message),
        })
      );
    }

    return err(
      createUserError(USER_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
        expectedValue: issues.map((i) => i.message).join(", "),
      })
    );
  }

  const data = result.data;

  if (!validateUserRole(data.role)) {
    return err(createUserError(USER_ERROR_CODES.INVALID_ROLE, { role: data.role }));
  }

  return ok(data);
}

export function validateUserForUpdate(input: unknown): Result<UpdateUserInput, AppError> {
  const result = updateUserSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createUserError(USER_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  const data = result.data;

  if (data.role && !validateUserRole(data.role)) {
    return err(createUserError(USER_ERROR_CODES.INVALID_ROLE, { role: data.role }));
  }

  return ok(data);
}

export function validateSubscription(input: unknown): Result<SubscriptionInput, AppError> {
  const result = subscriptionSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createSubscriptionError(SUBSCRIPTION_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  return ok(result.data);
}

export function validateSubscriptionForCreation(
  input: unknown
): Result<CreateSubscriptionInput, AppError> {
  const result = createSubscriptionSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    if (firstIssue?.path?.includes("status")) {
      return err(
        createSubscriptionError(SUBSCRIPTION_ERROR_CODES.STATUS_INVALID, {
          status: String(firstIssue.message),
        })
      );
    }

    return err(
      createSubscriptionError(SUBSCRIPTION_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  const data = result.data;

  if (!validateSubscriptionStatus(data.status)) {
    return err(
      createSubscriptionError(SUBSCRIPTION_ERROR_CODES.STATUS_INVALID, { status: data.status })
    );
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      return err(createSubscriptionError(SUBSCRIPTION_ERROR_CODES.DATES_INVALID));
    }
  }

  return ok(data);
}

export function validateSubscriptionForUpdate(
  input: unknown
): Result<UpdateSubscriptionInput, AppError> {
  const result = updateSubscriptionSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createSubscriptionError(SUBSCRIPTION_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  const data = result.data;

  if (data.status && !validateSubscriptionStatus(data.status)) {
    return err(
      createSubscriptionError(SUBSCRIPTION_ERROR_CODES.STATUS_INVALID, { status: data.status })
    );
  }

  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      return err(createSubscriptionError(SUBSCRIPTION_ERROR_CODES.DATES_INVALID));
    }
  }

  return ok(data);
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!validateTenantSlug(tenantId)) {
    return err(
      createTenantError(TENANT_ERROR_CODES.ID_MUST_BE_SLUG, { providedValue: tenantId })
    );
  }
  return ok(undefined);
}

export function validateSubscriptionAccess(status: string): Result<void, AppError> {
  if (status === SUBSCRIPTION_STATUS_EXPIRED || status === SUBSCRIPTION_STATUS_SUSPENDED) {
    return err(createSubscriptionError(SUBSCRIPTION_ERROR_CODES.EXPIRED, { status }));
  }
  return ok(undefined);
}

export const adminConfig = {
  slugMinLength: 3,
  slugMaxLength: 50,
  nameMaxLength: 255,
  validSubscriptionStatuses: VALID_SUBSCRIPTION_STATUSES,
  validUserRoles: VALID_USER_ROLES,
} as const;