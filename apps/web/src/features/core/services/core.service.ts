/**
 * Interfaz del servicio core.
 * Define las operaciones de negocio principales: bootstrap, sincronización y tenant.
 * Todas las funciones retornan Result<T, AppError> para manejo de errores.
 */

import { createAppError, err, ok, type AppError, type CoreDb, type EventBus, type Result, type SyncEngine, type SyncStatus } from "@logiscore/core";
import type { TenantContext } from "../types/core.types";

interface SupabaseSessionResponse {
  data: { session: { user: { id: string } } | null };
  error: { message: string } | null;
}

interface SupabaseRowResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SupabaseLike {
  auth: {
    getSession: () => Promise<SupabaseSessionResponse>;
  };
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Promise<SupabaseRowResponse<T>>;
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: <T>() => Promise<SupabaseRowResponse<T>>;
        order: (column: string, options?: { ascending?: boolean }) => {
          eq: (column: string, value: string) => {
            order: (column: string, options?: { ascending?: boolean }) => Promise<SupabaseRowResponse<unknown[]>>;
          };
        };
      };
    };
  };
}

interface CatalogRecord {
  localId?: string;
  id?: string;
  tenantId: string;
  name?: string;
  sku?: string;
  visible?: boolean;
  isWeighted?: boolean;
  unitOfMeasure?: string;
  categoryId?: string;
  defaultPresentationId?: string;
  productLocalId?: string;
  factor?: number;
  price?: number;
  barcode?: string;
  isDefault?: boolean;
  size?: string;
  color?: string;
  skuSuffix?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Campos para productos globales
  isGlobal?: boolean;
  businessTypeId?: string;
}

interface CatalogsDb {
  bulkPut(table: "categories" | "products" | "product_presentations" | "product_size_colors" | "warehouses", records: CatalogRecord[]): Promise<void>;
}

export interface CoreService {
  bootstrapSession(): Promise<
    Result<
      {
        tenantContext: TenantContext;
        subscriptionActive: boolean;
      },
      AppError
    >
  >;
  resolveTenantContext(userId: string): Promise<Result<TenantContext, AppError>>;
  startSync(): Result<SyncStatus, AppError>;
  checkSubscription(tenantSlug: string): Promise<Result<boolean, AppError>>;
  pullCatalogs(tenantSlug: string): Promise<Result<void, AppError>>;
  getTimingMetrics(): { operation: string; durationMs: number; timestamp: string; success: boolean }[];
  getSlaMetrics(operation?: string): { operation: string; avgMs: number; minMs: number; maxMs: number; count: number }[];
}

interface CoreServiceDependencies {
  db: CoreDb;
  syncEngine: SyncEngine;
  supabase: SupabaseLike | null;
  eventBus: EventBus;
  catalogsDb?: CatalogsDb;
  clock?: () => Date;
  uuid?: () => string;
}

export const createCoreService = ({
  db,
  syncEngine,
  supabase,
  eventBus,
  catalogsDb,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: CoreServiceDependencies): CoreService => {
  const supabaseClient = supabase ?? null;

  interface TimingMetric {
    operation: string;
    durationMs: number;
    timestamp: string;
    success: boolean;
  }

  const timingMetrics: TimingMetric[] = [];

  const getTimingMetrics = (): TimingMetric[] => [...timingMetrics];

  const getSlaMetrics = (operation?: string): { operation: string; avgMs: number; minMs: number; maxMs: number; count: number }[] => {
    const filtered = operation
      ? timingMetrics.filter(m => m.operation === operation)
      : timingMetrics;

    const grouped = filtered.reduce((acc, m) => {
      if (!acc[m.operation]) {
        acc[m.operation] = [];
      }
      acc[m.operation].push(m.durationMs);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).map(([op, durations]) => ({
      operation: op,
      avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 100) / 100,
      minMs: Math.round(Math.min(...durations) * 100) / 100,
      maxMs: Math.round(Math.max(...durations) * 100) / 100,
      count: durations.length
    }));
  };

  const resolveTenantContext: CoreService["resolveTenantContext"] = async (
    userId
  ) => {
    if (!supabaseClient) {
      return err(
        createAppError({
          code: "TENANT_RESOLVE_FAILED",
          message: "No hay conexión a Supabase.",
          retryable: false,
          context: { userId }
        })
      );
    }

    const tenantQuery = await supabaseClient
      .from("tenants")
      .select("id, slug, name, business_type_id")
      .eq("owner_user_id", userId)
      .maybeSingle<{ id: string; slug: string; name: string; business_type_id: string | null }>();
    
    // Bypass for admins who don't own a tenant but need to bootstrap
    if (!tenantQuery.data) {
      const roleResult = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle<{ role: string }>();

      if (roleResult.data?.role === "admin") {
        return ok({
          tenantUuid: "__global__",
          tenantSlug: "__global__",
          tenantName: "Global Admin",
          userId,
          businessTypeId: undefined
        });
      }
    }

    if (tenantQuery.error || !tenantQuery.data) {

      return err(
        createAppError({
          code: "TENANT_RESOLVE_FAILED",
          message:
            tenantQuery.error?.message ??
            "No se pudo resolver el tenant para el usuario.",
          retryable: false,
          context: { userId }
        })
      );
    }

    const tenantContext: TenantContext = {
      tenantUuid: tenantQuery.data.id,
      tenantSlug: tenantQuery.data.slug,
      tenantName: tenantQuery.data.name,
      userId,
      businessTypeId: tenantQuery.data.business_type_id ?? undefined
    };
    eventBus.emit("TENANT.RESOLVED", tenantContext);
    return ok(tenantContext);
  };

  const checkSubscription: CoreService["checkSubscription"] = async (
    tenantSlug
  ) => {
    if (!supabaseClient) {
      return err(
        createAppError({
          code: "SUBSCRIPTION_CHECK_FAILED",
          message: "No hay conexión a Supabase.",
          retryable: true,
          context: { tenantSlug }
        })
      );
    }

    const subscriptionQuery = await supabaseClient.rpc<{
      isActive: boolean;
      status?: string;
    }>("check_subscriptions", {
      p_tenant_slug: tenantSlug
    });

    if (subscriptionQuery.error) {
      const tenantLookup = await supabaseClient
        .from("tenants")
        .select("id")
        .eq("slug", tenantSlug)
        .maybeSingle<{ id: string }>();

      if (tenantLookup.error || !tenantLookup.data) {
        return err(
          createAppError({
            code: "SUBSCRIPTION_CHECK_FAILED",
            message: subscriptionQuery.error.message,
            retryable: true,
            context: { tenantSlug, fallback: "tenant_lookup_failed" }
          })
        );
      }

      const fallbackSubscription = await supabaseClient
        .from("subscriptions")
        .select("status")
        .eq("tenant_id", tenantLookup.data.id)
        .maybeSingle<{ status: string }>();

      if (fallbackSubscription.error) {
        return err(
          createAppError({
            code: "SUBSCRIPTION_CHECK_FAILED",
            message: fallbackSubscription.error.message,
            retryable: true,
            context: { tenantSlug, fallback: "subscriptions_table_failed" }
          })
        );
      }

      const fallbackIsActive = fallbackSubscription.data?.status === "active";
      if (!fallbackIsActive) {
        eventBus.emit("SUBSCRIPTION.BLOCKED", { tenantSlug });
      }
      return ok(fallbackIsActive);
    }

    const subscriptionData = Array.isArray(subscriptionQuery.data) 
      ? subscriptionQuery.data[0] 
      : subscriptionQuery.data;
    
    const isActive = subscriptionData?.is_active ?? subscriptionData?.isActive;
    
    if (isActive === undefined || typeof isActive !== "boolean") {
      return err(
        createAppError({
          code: "SUBSCRIPTION_RESPONSE_INVALID",
          message: "Respuesta invalida de check_subscriptions.",
          retryable: true,
          context: { tenantSlug }
        })
      );
    }

    if (!isActive) {
      eventBus.emit("SUBSCRIPTION.BLOCKED", { tenantSlug });
    }
    return ok(isActive);
  };

  const startSync: CoreService["startSync"] = () => {
    syncEngine.startPeriodicSync();
    const status = syncEngine.getStatus();
    return ok(status);
  };

  const pullCatalogs: CoreService["pullCatalogs"] = async (tenantSlug) => {
    if (!catalogsDb || !supabaseClient) {
      return ok<void>(undefined);
    }

    const tenantInfoQuery = await supabaseClient
      .from("tenants")
      .select("id, business_type_id")
      .eq("slug", tenantSlug)
      .maybeSingle<{ id: string; business_type_id: string | null }>();
    const tenantId = tenantInfoQuery.data?.id;
    const businessTypeId = tenantInfoQuery.data?.business_type_id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabaseClient as any;

    const fetchCategories = async () => {
      const table = "categories";
      const columns = "local_id, name, created_at, updated_at, deleted_at, is_global";
      
      if (tenantId) {
        const [tenantResponse, globalResponse] = await Promise.all([
          supabaseAny.from(table).select(columns).eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: true }),
          supabaseAny.from(table).select(columns).eq("is_global", true).is("deleted_at", null).order("created_at", { ascending: true })
        ]);

        const dedup = new Map<string, Record<string, unknown>>();
        [...(tenantResponse.data || []), ...(globalResponse.data || [])].forEach((row) => {
          const key = row.local_id as string;
          if (key) dedup.set(key, row);
        });
        return { data: Array.from(dedup.values()), error: tenantResponse.error };
      }
      return { data: [], error: null };
    };

    const fetchProducts = async () => {
      const table = "products";
      const columns = "local_id, name, sku, visible, is_weighted, unit_of_measure, category_id, default_presentation_id, is_global, business_type_id, created_at, updated_at, deleted_at";
      
      if (businessTypeId) {
        const [tenantResponse, globalResponse] = await Promise.all([
          tenantId
            ? supabaseAny.from(table).select(columns).eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: true })
            : supabaseAny.from(table).select(columns).eq("tenant_slug", tenantSlug).is("deleted_at", null).order("created_at", { ascending: true }),
          supabaseAny.from(table).select(columns).eq("is_global", true).eq("business_type_id", businessTypeId).is("deleted_at", null).order("created_at", { ascending: true })
        ]);

        const dedup = new Map<string, Record<string, unknown>>();
        (tenantResponse.data || []).forEach((row: Record<string, unknown>) => {
          const key = row.local_id as string;
          if (key) dedup.set(key, row);
        });
        (globalResponse.data || []).forEach((row: Record<string, unknown>) => {
          const key = row.local_id as string;
          if (key && !dedup.has(key)) dedup.set(key, row);
        });
        return { data: Array.from(dedup.values()), error: tenantResponse.error };
      }
      return tenantId
        ? await supabaseAny.from(table).select(columns).eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: true })
        : await supabaseAny.from(table).select(columns).eq("tenant_slug", tenantSlug).is("deleted_at", null).order("created_at", { ascending: true });
    };

    const fetchRelatedData = async () => {
      if (!businessTypeId || !tenantId) {
        return { presentations: [], sizeColors: [], warehouses: [] };
      }

      const [tenantProducts, globalProducts] = await Promise.all([
        supabaseAny.from("products").select("local_id").eq("tenant_id", tenantId).is("deleted_at", null),
        supabaseAny.from("products").select("local_id").eq("is_global", true).eq("business_type_id", businessTypeId).is("deleted_at", null)
      ]);

      const allProductLocalIds = new Set<string>([
        ...(tenantProducts.data || []).map((p: Record<string, unknown>) => p.local_id as string),
        ...(globalProducts.data || []).map((p: Record<string, unknown>) => p.local_id as string)
      ]);

      if (allProductLocalIds.size === 0) {
        return { presentations: [], sizeColors: [], warehouses: [] };
      }

      const productIdsArray = Array.from(allProductLocalIds);
      const presColumns = "id, product_local_id, name, factor, price, barcode, is_default, created_at, deleted_at";
      const scColumns = "local_id, product_local_id, size, color, sku_suffix, barcode, created_at, deleted_at";

      const [presentationsResponse, sizeColorsResponse] = await Promise.all([
        supabaseAny.from("product_presentations").select(presColumns).in("product_local_id", productIdsArray).is("deleted_at", null).order("created_at", { ascending: true }),
        supabaseAny.from("product_size_colors").select(scColumns).in("product_local_id", productIdsArray).is("deleted_at", null).order("created_at", { ascending: true })
      ]);

      return {
        presentations: presentationsResponse.data || [],
        sizeColors: sizeColorsResponse.data || []
      };
    };

    const fetchWarehouses = async () => {
      const table = "warehouses";
      const columns = "local_id, name, created_at, updated_at, deleted_at";
      
      if (tenantId) {
        const response = await supabaseAny.from(table).select(columns).eq("tenant_id", tenantId).is("deleted_at", null).order("created_at", { ascending: true });
        if ((response.data?.length ?? 0) > 0) {
          return response;
        }
      }
      return { data: [], error: null };
    };

    const tables = [
      { name: "categories", fetch: fetchCategories },
      { name: "products", fetch: fetchProducts },
      { name: "product_presentations", fetch: async () => ({ data: (await fetchRelatedData()).presentations, error: null }) },
      { name: "product_size_colors", fetch: async () => ({ data: (await fetchRelatedData()).sizeColors, error: null }) },
      { name: "warehouses", fetch: fetchWarehouses }
    ];

    const results = await Promise.all(tables.map(t => t.fetch()));

    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i]!.name;
      const response = results[i]!;

      const data = response.data;
      const error = response.error;

      if (error || !data) {
        continue;
      }

      const records: CatalogRecord[] = data.map((row: Record<string, unknown>) => {
        const record: CatalogRecord = {
          tenantId: tenantSlug,
          createdAt: (row.created_at as string) ?? new Date().toISOString(),
          updatedAt: (row.updated_at as string) ?? new Date().toISOString()
        };

        if (tableName === "product_presentations") {
          record.id = row.id as string;
          record.productLocalId = row.product_local_id as string;
          record.name = row.name as string;
          if (row.factor !== undefined) record.factor = Number(row.factor);
          if (row.price !== undefined) record.price = Number(row.price);
          if (row.barcode) record.barcode = row.barcode as string;
          if (row.is_default !== undefined) record.isDefault = row.is_default as boolean;
        } else if (tableName === "product_size_colors") {
          record.localId = row.local_id as string;
          record.productLocalId = row.product_local_id as string;
          if (row.size) record.size = row.size as string;
          if (row.color) record.color = row.color as string;
          if (row.sku_suffix) record.skuSuffix = row.sku_suffix as string;
          if (row.barcode) record.barcode = row.barcode as string;
        } else if (tableName === "products") {
          record.localId = row.local_id as string;
          record.name = row.name as string;
          record.sku = row.sku as string;
          record.visible = row.visible as boolean;
          record.isWeighted = (row.is_weighted as boolean) ?? false;
          record.unitOfMeasure = (row.unit_of_measure as string) ?? 'unidad';
          if (row.category_id) record.categoryId = row.category_id as string;
          if (row.default_presentation_id) record.defaultPresentationId = row.default_presentation_id as string;
          if (row.is_global === true) {
            record.tenantId = "__global__";
            record.isGlobal = true;
            if (row.business_type_id) record.businessTypeId = row.business_type_id as string;
          } else {
            record.tenantId = tenantSlug;
            record.isGlobal = false;
          }
        } else {
          record.localId = row.local_id as string;
          record.name = row.name as string;
        }

        if (row.deleted_at) record.deletedAt = row.deleted_at as string;
        return record;
      });

      if (records.length > 0) {
        await catalogsDb.bulkPut(tableName as "categories" | "products" | "product_presentations" | "product_size_colors" | "warehouses", records);
      }
    }

    eventBus.emit("CATALOG.GLOBAL_PRODUCTS_HYDRATED", { tenantSlug });
    eventBus.emit("CORE.CATALOGS_PULLED", { tenantSlug });
    return ok<void>(undefined);
  };

  const bootstrapSession: CoreService["bootstrapSession"] = async () => {
    eventBus.emit("CORE.BOOTSTRAP_STARTED", {
      startedAt: clock().toISOString()
    });

    if (!supabaseClient) {
      const authError = createAppError({
        code: "AUTH_SESSION_MISSING",
        message: "No hay conexión a Supabase.",
        retryable: false
      });
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: authError });
      return err(authError);
    }

    const sessionResponse = await supabaseClient.auth.getSession();
    if (sessionResponse.error || !sessionResponse.data.session?.user.id) {
      const authError = createAppError({
        code: "AUTH_SESSION_MISSING",
        message:
          sessionResponse.error?.message ??
          "No hay una sesion valida para bootstrap.",
        retryable: false
      });
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: authError });
      return err(authError);
    }

    const userId = sessionResponse.data.session.user.id;
    
    const tenantResult = await resolveTenantContext(userId);
    if (!tenantResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: tenantResult.error });
      return err(tenantResult.error);
    }

    const subscriptionResult = await checkSubscription(
      tenantResult.data.tenantSlug
    );
    if (!subscriptionResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: subscriptionResult.error });
      return err(subscriptionResult.error);
    }

    const pullResult = await pullCatalogs(tenantResult.data.tenantSlug);
    if (!pullResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: pullResult.error });
      return err(pullResult.error);
    }

    const queueResult = await syncEngine.enqueue({
      id: uuid(),
      table: "security_audit_log",
      operation: "create",
      payload: {
        eventType: "BOOTSTRAP",
        userId,
        tenantId: tenantResult.data.tenantSlug,
        success: true
      },
      localId: uuid(),
      tenantId: tenantResult.data.tenantSlug,
      createdAt: clock().toISOString(),
      attempts: 0
    });

    if (!queueResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: queueResult.error });
      return err(queueResult.error);
    }

    await db.saveBootstrapState({
      id: `${tenantResult.data.tenantSlug}:${userId}`,
      tenantId: tenantResult.data.tenantSlug,
      userId,
      bootstrappedAt: clock().toISOString()
    });

    eventBus.emit("SECURITY.AUDIT_LOG_REQUESTED", {
      eventType: "BOOTSTRAP",
      tenantId: tenantResult.data.tenantSlug
    });
    eventBus.emit("CORE.BOOTSTRAP_COMPLETED", {
      tenantSlug: tenantResult.data.tenantSlug
    });

    return ok({
      tenantContext: tenantResult.data,
      subscriptionActive: subscriptionResult.data
    });
  };

    return {
      bootstrapSession,
      resolveTenantContext,
      startSync,
      checkSubscription,
      pullCatalogs,
      getTimingMetrics,
      getSlaMetrics
    };
};
