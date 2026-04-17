/**
 * Spec-Driven Development: Auth Module
 * Validadores basados en specs/auth/schema.json
 * Única Fuente de Verdad para Autenticación y Sesiones
 */

import { z } from "zod";
import { ok, err, type Result, type AppError } from "@logiscore/core";
import { AuthErrors } from "./errors";

export { AuthErrors };
export type { AuthErrorCode } from "./errors";

export const TenantContextSchema = z.object({
  tenantId: z.string().min(1),
  tenantIdUuid: z.string().uuid().nullable(),
  role: z.enum(["owner", "admin", "manager", "cashier", "viewer"]),
  permissions: z.array(z.string()),
});

export const SessionSchema = z.object({
  id: z.string().uuid().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().nullable(),
  expiresIn: z.number().int().min(60).max(604800),
  expiresAt: z.number().int().min(1),
  userId: z.string().uuid(),
  email: z.string().email().nullable(),
  scopes: z.array(z.enum(["read", "write", "admin", "audit", "billing"])),
  tenantContext: TenantContextSchema.nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "manager", "cashier", "viewer"]),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  failedAttempts: z.number().int().min(0).default(0),
  lockedUntil: z.number().int().nullable(),
  createdAt: z.string().datetime().optional(),
});

export const PLANS_CONFIG = {
  Basic: {
    maxRefreshTokenAge: 86400,
    maxConcurrentSessions: 1,
  },
  Pro: {
    maxRefreshTokenAge: 604800,
    maxConcurrentSessions: 3,
  },
} as const;

export type Session = z.infer<typeof SessionSchema>;
export type TenantContext = z.infer<typeof TenantContextSchema>;
export type User = z.infer<typeof UserSchema>;
export type PlanName = "Basic" | "Pro";

export function validateSession(data: unknown): Result<Session, AppError> {
  const result = SessionSchema.safeParse(data);
  if (!result.success) {
    const error: AppError = {
      code: "SESSION_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    };
    return err(error);
  }
  return ok(result.data);
}

export function validateUser(data: unknown): Result<User, AppError> {
  const result = UserSchema.safeParse(data);
  if (!result.success) {
    const error: AppError = {
      code: "USER_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    };
    return err(error);
  }
  return ok(result.data);
}

export function validateTenantContext(data: unknown): Result<TenantContext, AppError> {
  const result = TenantContextSchema.safeParse(data);
  if (!result.success) {
    const error: AppError = {
      code: "TENANT_CONTEXT_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    };
    return err(error);
  }
  return ok(result.data);
}

export function isSessionExpired(session: Session): boolean {
  const now = Date.now();
  return now >= session.expiresAt;
}

export function isSessionExpiringSoon(session: Session, thresholdSeconds: number = 300): boolean {
  const now = Date.now();
  const threshold = thresholdSeconds * 1000;
  return session.expiresAt - now <= threshold;
}

export function hasScope(session: Session, requiredScope: string): boolean {
  return session.scopes.includes(requiredScope as never);
}

export function canAccessTenant(
  session: Session,
  requiredRole: TenantContext["role"]
): boolean {
  if (!session.tenantContext) {
    return false;
  }
  const roleHierarchy: Record<TenantContext["role"], number> = {
    viewer: 1,
    cashier: 2,
    manager: 3,
    admin: 4,
    owner: 5,
  };
  return roleHierarchy[session.tenantContext.role] >= roleHierarchy[requiredRole];
}

export function getAuthError(
  code: keyof typeof AuthErrors
): AppError {
  const errorConfig = AuthErrors[code];
  return {
    code: errorConfig.code,
    message: errorConfig.message,
    retryable: errorConfig.retryable,
  };
}

export function createSessionFromSupabase(
  supabaseSession: unknown
): Result<Session, AppError> {
  if (!supabaseSession || typeof supabaseSession !== "object") {
    return err(AuthErrors.TOKEN_INVALID);
  }

  const sessionObj = supabaseSession as {
    access_token?: string;
    expires_in?: number;
    user?: { id: string; email?: string };
    refresh_token?: string;
  };

  if (!sessionObj.access_token) {
    return err(AuthErrors.TOKEN_INVALID);
  }

  const now = Date.now();
  const expiresIn = sessionObj.expires_in ?? 3600;
  const expiresAt = now + expiresIn * 1000;

  const session: Session = {
    accessToken: sessionObj.access_token,
    refreshToken: sessionObj.refresh_token ?? null,
    expiresIn,
    expiresAt: Math.floor(expiresAt / 1000),
    userId: sessionObj.user?.id ?? "",
    email: sessionObj.user?.email ?? null,
    scopes: ["read", "write"],
    tenantContext: null,
    createdAt: new Date().toISOString(),
  };

  return validateSession(session);
}

export function getTokenExpiryDate(expiresIn: number): Date {
  const now = new Date();
  return new Date(now.getTime() + expiresIn * 1000);
}

export function shouldRefreshSession(session: Session): boolean {
  return isSessionExpiringSoon(session, 300);
}