import type { AppError, SyncStatus } from "@logiscore/core";

export interface TenantContext {
  tenantUuid: string;
  tenantSlug: string;
  userId: string;
}

export interface SubscriptionState {
  isActive: boolean;
  plan?: string;
}

export interface CoreUiState {
  isBootstrapping: boolean;
  isBlocked: boolean;
  tenantSlug: string | null;
  syncStatus: SyncStatus;
  lastError: AppError | null;
}
