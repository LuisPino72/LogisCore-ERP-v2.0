import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import { createAppError } from "@logiscore/core";
import { supabase } from "../supabase/client";

interface TenantMapping {
  tenantSlug: string;
  tenantUuid: string;
  tenantName: string;
}

interface TenantTranslatorDeps {
  getCachedTenant: () => TenantMapping | null;
  setCachedTenant: (mapping: TenantMapping) => void;
  clearCachedTenant: () => void;
}

class TenantTranslator {
  private cache: Map<string, TenantMapping> = new Map();
  private currentMapping: TenantMapping | null = null;

  getCachedTenant(): TenantMapping | null {
    return this.currentMapping;
  }

  setCachedTenant(mapping: TenantMapping): void {
    this.currentMapping = mapping;
    this.cache.set(mapping.tenantSlug, mapping);
  }

  clearCachedTenant(): void {
    this.currentMapping = null;
    this.cache.clear();
  }

  resolveTenantUuid(
    tenantSlug: string
  ): Result<string, AppError> {
    const cached = this.cache.get(tenantSlug);
    if (cached) {
      return ok(cached.tenantUuid);
    }

    const current = this.currentMapping;
    if (current && current.tenantSlug === tenantSlug) {
      return ok(current.tenantUuid);
    }

    return err(
      createAppError({
        code: "TENANT_NOT_FOUND",
        message: `No se puede resolver el UUID para el tenant: ${tenantSlug}. Ejecute bootstrapSession primero.`,
        retryable: false,
        context: { tenantSlug }
      })
    );
  }

  async fetchTenantUuid(tenantSlug: string): Promise<Result<string, AppError>> {
    const cached = this.cache.get(tenantSlug);
    if (cached) {
      return ok(cached.tenantUuid);
    }

    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, tenant_slug")
      .eq("tenant_slug", tenantSlug)
      .single();

    if (error || !data) {
      return err(
        createAppError({
          code: "TENANT_NOT_FOUND",
          message: error?.message ?? `Tenant no encontrado: ${tenantSlug}`,
          retryable: false,
          context: { tenantSlug }
        })
      );
    }

    const mapping: TenantMapping = {
      tenantSlug: data.tenant_slug,
      tenantUuid: data.id,
      tenantName: data.name
    };

    this.setCachedTenant(mapping);
    return ok(mapping.tenantUuid);
  }

  translatePayload<T extends Record<string, unknown>>(
    payload: T,
    tenantSlug: string
  ): Result<T & { tenant_id: string }, AppError> {
    const uuidResult = this.resolveTenantUuid(tenantSlug);
    if (!uuidResult.ok) {
      return err(uuidResult.error);
    }

    return ok({
      ...payload,
      tenant_id: uuidResult.data
    });
  }

  async translatePayloadAsync<T extends Record<string, unknown>>(
    payload: T,
    tenantSlug: string
  ): Promise<Result<T & { tenant_id: string }, AppError>> {
    const uuidResult = await this.fetchTenantUuid(tenantSlug);
    if (!uuidResult.ok) {
      return err(uuidResult.error);
    }

    return ok({
      ...payload,
      tenant_id: uuidResult.data
    });
  }

  validatePayloadTenant(
    payloadTenantSlug: string,
    sessionTenantSlug: string
  ): Result<void, AppError> {
    if (payloadTenantSlug !== sessionTenantSlug) {
      return err(
        createAppError({
          code: "TENANT_MISMATCH",
          message: `El payload pertenece a un tenant diferente. Payload: ${payloadTenantSlug}, Sesión: ${sessionTenantSlug}`,
          retryable: false,
          context: {
            payloadTenant: payloadTenantSlug,
            sessionTenant: sessionTenantSlug
          }
        })
      );
    }

    return ok(undefined);
  }
}

export const tenantTranslator = new TenantTranslator();

export type { TenantMapping, TenantTranslatorDeps };