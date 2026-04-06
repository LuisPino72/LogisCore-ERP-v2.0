import type { AppError, SyncStatus } from "@logiscore/core";

/**
 * Contexto del tenant para el módulo core.
 */
export interface TenantContext {
  tenantUuid: string;
  tenantSlug: string;
  tenantName: string;
  userId: string;
}

/**
 * Estado de la suscripción del tenant.
 */
export interface SubscriptionState {
  isActive: boolean;
  plan?: string;
}

/**
 * Estado de la UI para el módulo core.
 */
export interface CoreUiState {
  isBootstrapping: boolean;
  isBlocked: boolean;
  tenantSlug: string | null;
  tenantName: string | null;
  syncStatus: SyncStatus;
  lastError: AppError | null;
}
