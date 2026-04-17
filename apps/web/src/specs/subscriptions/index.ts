/**
 * Spec-Driven Development: Subscriptions Module
 * Validadores basados en specs/subscriptions/schema.json
 * Única Fuente de Verdad para el módulo de Suscripciones
 */

import { z } from "zod";
import { ok, err, type Result, type AppError } from "@logiscore/core";
import { SubscriptionErrors } from "./errors";

export { SubscriptionErrors };
export type { SubscriptionErrorCode } from "./errors";

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.enum(["Basic", "Pro"]),
  description: z.string().nullable(),
  price: z.number().min(0),
  features: z.object({
    production: z.boolean(),
    multi_warehouse: z.boolean(),
    invoicing: z.boolean(),
    reports: z.boolean(),
  }),
  maxUsers: z.number().int().min(0),
  maxProducts: z.number().int().min(1),
  isActive: z.boolean(),
  trialDays: z.number().int().min(0).nullable(),
  createdAt: z.string().datetime().optional(),
});

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  planId: z.string().uuid().nullable(),
  status: z.enum(["active", "suspended", "expired", "trial"]),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  billingCycle: z.enum(["monthly", "quarterly", "annual"]).nullable(),
  features: z.object({
    production: z.boolean(),
    multi_warehouse: z.boolean(),
    invoicing: z.boolean(),
    reports: z.boolean(),
  }).nullable(),
  createdAt: z.string().datetime().optional(),
});

export const PLANS_DEFINITION = {
  Basic: {
    maxUsers: 3,
    maxProducts: 500,
    features: {
      production: false,
      multi_warehouse: false,
      invoicing: true,
      reports: true,
    },
    trialDays: 15,
  },
  Pro: {
    maxUsers: 10,
    maxProducts: 5000,
    features: {
      production: true,
      multi_warehouse: true,
      invoicing: true,
      reports: true,
    },
    trialDays: 30,
  },
} as const;

export type Plan = z.infer<typeof PlanSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type PlanName = "Basic" | "Pro";

export function validatePlan(data: unknown): Result<Plan, AppError> {
  const result = PlanSchema.safeParse(data);
  if (!result.success) {
    const error: AppError = {
      code: "PLAN_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    };
    return err(error);
  }
  return ok(result.data);
}

export function validateSubscription(data: unknown): Result<Subscription, AppError> {
  const result = SubscriptionSchema.safeParse(data);
  if (!result.success) {
    const error: AppError = {
      code: "SUBSCRIPTION_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    };
    return err(error);
  }
  return ok(result.data);
}

export function getPlanLimits(planName: PlanName) {
  return PLANS_DEFINITION[planName];
}

export function canAccessProduction(subscription: Subscription): boolean {
  if (subscription.status === "expired" || subscription.status === "suspended") {
    return false;
  }
  const features = subscription.features ?? PLANS_DEFINITION.Basic.features;
  return features.production;
}

export function canAddUser(
  subscription: Subscription,
  currentUserCount: number
): Result<boolean, AppError> {
  if (subscription.status === "expired" || subscription.status === "suspended") {
    return err({
      code: SubscriptionErrors.EXPIRED.code,
      message: SubscriptionErrors.EXPIRED.message,
      retryable: false,
    });
  }

  const planLimits = PLANS_DEFINITION.Basic;

  if (planLimits.maxUsers === 0) {
    return ok(true);
  }

  if (currentUserCount >= planLimits.maxUsers) {
    return err({
      code: SubscriptionErrors.MAX_USERS_EXCEEDED.code,
      message: SubscriptionErrors.MAX_USERS_EXCEEDED.message,
      retryable: false,
    });
  }

  return ok(true);
}

export function canAddProduct(
  subscription: Subscription,
  currentProductCount: number
): Result<boolean, AppError> {
  if (subscription.status === "expired" || subscription.status === "suspended") {
    return err({
      code: SubscriptionErrors.EXPIRED.code,
      message: SubscriptionErrors.EXPIRED.message,
      retryable: false,
    });
  }

  const planLimits = PLANS_DEFINITION.Basic;

  if (currentProductCount >= planLimits.maxProducts) {
    return err({
      code: SubscriptionErrors.MAX_PRODUCTS_EXCEEDED.code,
      message: SubscriptionErrors.MAX_PRODUCTS_EXCEEDED.message,
      retryable: false,
    });
  }

  return ok(true);
}