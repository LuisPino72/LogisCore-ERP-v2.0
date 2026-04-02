/**
 * Servicio para gestionar relaciones: comisiones, proveedores preferidos, límites de crédito
 */

import {
  createAppError,
  err,
  ok,
  type AppError,
  type EventBus,
  type Result,
  type SyncEngine
} from "@logiscore/core";
import type {
  CreateSalesCommissionInput,
  CustomerCreditLimit,
  CustomerCreditLimitInput,
  ProductPreferredSupplier,
  ProductPreferredSupplierInput,
  SalesCommission
} from "../types/relation.types";

export interface RelationsDb {
  createSalesCommission(commission: SalesCommission): Promise<void>;
  listSalesCommissions(tenantId: string): Promise<SalesCommission[]>;
  createProductPreferredSupplier(supplier: ProductPreferredSupplier): Promise<void>;
  listProductPreferredSuppliers(tenantId: string): Promise<ProductPreferredSupplier[]>;
  createCustomerCreditLimit(credit: CustomerCreditLimit): Promise<void>;
  listCustomerCreditLimits(tenantId: string): Promise<CustomerCreditLimit[]>;
}

export interface RelationsService {
  createSalesCommission(
    tenantSlug: string,
    input: CreateSalesCommissionInput
  ): Promise<Result<SalesCommission, AppError>>;
  listSalesCommissions(
    tenantSlug: string
  ): Promise<Result<SalesCommission[], AppError>>;
  createProductPreferredSupplier(
    tenantSlug: string,
    input: ProductPreferredSupplierInput
  ): Promise<Result<ProductPreferredSupplier, AppError>>;
  listProductPreferredSuppliers(
    tenantSlug: string
  ): Promise<Result<ProductPreferredSupplier[], AppError>>;
  createCustomerCreditLimit(
    tenantSlug: string,
    input: CustomerCreditLimitInput
  ): Promise<Result<CustomerCreditLimit, AppError>>;
  listCustomerCreditLimits(
    tenantSlug: string
  ): Promise<Result<CustomerCreditLimit[], AppError>>;
}

interface RelationsServiceDependencies {
  db: RelationsDb;
  syncEngine: SyncEngine;
  eventBus: EventBus;
  clock?: () => Date;
  uuid?: () => string;
}

export const createRelationsService = ({
  db,
  syncEngine,
  eventBus,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: RelationsServiceDependencies): RelationsService => {
  const createSalesCommission: RelationsService["createSalesCommission"] = async (
    tenantSlug,
    input
  ) => {
    if (!input.saleLocalId.trim()) {
      return err(
        createAppError({
          code: "COMMISSION_SALE_REQUIRED",
          message: "La venta es requerida para la comisión.",
          retryable: false
        })
      );
    }
    if (!input.salesPersonId.trim()) {
      return err(
        createAppError({
          code: "COMMISSION_PERSON_REQUIRED",
          message: "El vendedor es requerido para la comisión.",
          retryable: false
        })
      );
    }
    if (input.commissionRate <= 0 || input.commissionRate > 1) {
      return err(
        createAppError({
          code: "COMMISSION_RATE_INVALID",
          message: "La tasa de comisión debe estar entre 0 y 1.",
          retryable: false
        })
      );
    }
    if (input.commissionAmount < 0) {
      return err(
        createAppError({
          code: "COMMISSION_AMOUNT_INVALID",
          message: "El monto de comisión no puede ser negativo.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const commission: SalesCommission = {
      id: uuid(),
      tenantId: tenantSlug,
      saleLocalId: input.saleLocalId,
      salesPersonId: input.salesPersonId,
      commissionRate: input.commissionRate,
      commissionAmount: input.commissionAmount,
      paid: false,
      createdAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "sales_commissions",
      operation: "create",
      payload: {
        id: commission.id,
        tenant_slug: tenantSlug,
        sale_local_id: commission.saleLocalId,
        sales_person_id: commission.salesPersonId,
        commission_rate: commission.commissionRate,
        commission_amount: commission.commissionAmount,
        paid: commission.paid,
        created_at: commission.createdAt
      },
      localId: commission.id,
      tenantId: tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createSalesCommission(commission);
    eventBus.emit("COMMISSION.CREATED", {
      tenantId: tenantSlug,
      localId: commission.id
    });
    return ok(commission);
  };

  const listSalesCommissions: RelationsService["listSalesCommissions"] = async (
    tenantSlug
  ) => ok(await db.listSalesCommissions(tenantSlug));

  const createProductPreferredSupplier: RelationsService["createProductPreferredSupplier"] = async (
    tenantSlug,
    input
  ) => {
    if (!input.productId.trim()) {
      return err(
        createAppError({
          code: "SUPPLIER_PRODUCT_REQUIRED",
          message: "El producto es requerido.",
          retryable: false
        })
      );
    }
    if (!input.supplierName.trim()) {
      return err(
        createAppError({
          code: "SUPPLIER_NAME_REQUIRED",
          message: "El nombre del proveedor es requerido.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const supplier: ProductPreferredSupplier = {
      id: uuid(),
      tenantId: tenantSlug,
      productId: input.productId,
      supplierName: input.supplierName.trim(),
      priority: input.priority ?? 1,
      createdAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "product_preferred_suppliers",
      operation: "create",
      payload: {
        id: supplier.id,
        tenant_slug: tenantSlug,
        product_id: supplier.productId,
        supplier_name: supplier.supplierName,
        priority: supplier.priority,
        created_at: supplier.createdAt
      },
      localId: supplier.id,
      tenantId: tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createProductPreferredSupplier(supplier);
    eventBus.emit("SUPPLIER.PREFERRED_CREATED", {
      tenantId: tenantSlug,
      localId: supplier.id
    });
    return ok(supplier);
  };

  const listProductPreferredSuppliers: RelationsService["listProductPreferredSuppliers"] = async (
    tenantSlug
  ) => ok(await db.listProductPreferredSuppliers(tenantSlug));

  const createCustomerCreditLimit: RelationsService["createCustomerCreditLimit"] = async (
    tenantSlug,
    input
  ) => {
    if (!input.customerId.trim()) {
      return err(
        createAppError({
          code: "CREDIT_CUSTOMER_REQUIRED",
          message: "El cliente es requerido.",
          retryable: false
        })
      );
    }
    if (input.limitAmount <= 0) {
      return err(
        createAppError({
          code: "CREDIT_LIMIT_INVALID",
          message: "El límite de crédito debe ser mayor a cero.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const credit: CustomerCreditLimit = {
      id: uuid(),
      tenantId: tenantSlug,
      customerId: input.customerId,
      limitAmount: input.limitAmount,
      currentBalance: 0,
      currency: input.currency ?? "VES",
      active: true,
      createdAt: now,
      updatedAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "customer_credit_limits",
      operation: "create",
      payload: {
        id: credit.id,
        tenant_slug: tenantSlug,
        customer_id: credit.customerId,
        limit_amount: credit.limitAmount,
        current_balance: credit.currentBalance,
        currency: credit.currency,
        active: credit.active,
        created_at: credit.createdAt,
        updated_at: credit.updatedAt
      },
      localId: credit.id,
      tenantId: tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createCustomerCreditLimit(credit);
    eventBus.emit("CREDIT.LIMIT_CREATED", {
      tenantId: tenantSlug,
      localId: credit.id
    });
    return ok(credit);
  };

  const listCustomerCreditLimits: RelationsService["listCustomerCreditLimits"] = async (
    tenantSlug
  ) => ok(await db.listCustomerCreditLimits(tenantSlug));

  return {
    createSalesCommission,
    listSalesCommissions,
    createProductPreferredSupplier,
    listProductPreferredSuppliers,
    createCustomerCreditLimit,
    listCustomerCreditLimits
  };
};
