import {
  createAppError,
  err,
  ok,
  type AppError,
  type EventBus,
  type Result
} from "@logiscore/core";
import type {
  BoxClosingSummary,
  GrossProfit,
  KardexEntry,
  ReportsActorContext,
  ReportsTenantContext,
  SalesByDay,
  SalesByProduct,
  SecurityAuditLog
} from "../types/reports.types";

export interface ReportsDb {
  listSalesByDay(tenantId: string): Promise<SalesByDay[]>;
  listSalesByProduct(tenantId: string): Promise<SalesByProduct[]>;
  listKardex(tenantId: string, warehouseLocalId?: string): Promise<KardexEntry[]>;
  listGrossProfit(tenantId: string): Promise<GrossProfit[]>;
  listBoxClosings(tenantId: string): Promise<BoxClosingSummary[]>;
  createAuditLog(log: Omit<SecurityAuditLog, "localId">): Promise<void>;
  listAuditLogs(tenantId: string, eventType?: string): Promise<SecurityAuditLog[]>;
}

export interface ReportsService {
  getSalesByDay(
    tenant: ReportsTenantContext
  ): Promise<Result<SalesByDay[], AppError>>;
  getSalesByProduct(
    tenant: ReportsTenantContext
  ): Promise<Result<SalesByProduct[], AppError>>;
  getKardex(
    tenant: ReportsTenantContext,
    warehouseLocalId?: string
  ): Promise<Result<KardexEntry[], AppError>>;
  getGrossProfit(
    tenant: ReportsTenantContext
  ): Promise<Result<GrossProfit[], AppError>>;
  getBoxClosings(
    tenant: ReportsTenantContext
  ): Promise<Result<BoxClosingSummary[], AppError>>;
  logSecurityEvent(
    tenant: ReportsTenantContext,
    actor: ReportsActorContext,
    event: {
      eventType: string;
      targetTable?: string;
      targetLocalId?: string;
      success: boolean;
      details?: Record<string, unknown>;
    }
  ): Promise<Result<void, AppError>>;
  getAuditLogs(
    tenant: ReportsTenantContext,
    actor: ReportsActorContext,
    eventType?: string
  ): Promise<Result<SecurityAuditLog[], AppError>>;
}

interface CreateReportsServiceDependencies {
  db: ReportsDb;
  eventBus: EventBus;
  clock?: () => Date;
}

export const createReportsService = ({
  db,
  eventBus,
  clock = () => new Date()
}: CreateReportsServiceDependencies): ReportsService => {
  const getSalesByDay: ReportsService["getSalesByDay"] = async (tenant) => {
    try {
      const data = await db.listSalesByDay(tenant.tenantSlug);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_SALES_BY_DAY_FAILED",
          message: "No se pudo obtener el reporte de ventas por dia.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getSalesByProduct: ReportsService["getSalesByProduct"] = async (tenant) => {
    try {
      const data = await db.listSalesByProduct(tenant.tenantSlug);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_SALES_BY_PRODUCT_FAILED",
          message: "No se pudo obtener el reporte de ventas por producto.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getKardex: ReportsService["getKardex"] = async (tenant, warehouseLocalId) => {
    try {
      const data = await db.listKardex(tenant.tenantSlug, warehouseLocalId);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_KARDEX_FAILED",
          message: "No se pudo obtener el reporte de kardex.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getGrossProfit: ReportsService["getGrossProfit"] = async (tenant) => {
    try {
      const data = await db.listGrossProfit(tenant.tenantSlug);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_GROSS_PROFIT_FAILED",
          message: "No se pudo obtener el reporte de utilidad bruta.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getBoxClosings: ReportsService["getBoxClosings"] = async (tenant) => {
    try {
      const data = await db.listBoxClosings(tenant.tenantSlug);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_BOX_CLOSINGS_FAILED",
          message: "No se pudo obtener el resumen de cierres de caja.",
          retryable: false,
          cause
        })
      );
    }
  };

  const logSecurityEvent: ReportsService["logSecurityEvent"] = async (
    tenant,
    actor,
    event
  ) => {
    if (actor.role !== "owner" && actor.role !== "super_admin" && !actor.permissions.canViewReports) {
      return err(
        createAppError({
          code: "AUDIT_PERMISSION_DENIED",
          message: "No tiene permisos para registrar eventos de auditoria.",
          retryable: false
        })
      );
    }

    try {
      await db.createAuditLog({
        tenantId: tenant.tenantSlug,
        userId: actor.userId ?? "system",
        eventType: event.eventType,
        targetTable: event.targetTable ?? "",
        targetLocalId: event.targetLocalId ?? "",
        success: event.success,
        details: event.details ?? {},
        createdAt: clock().toISOString()
      });

      eventBus.emit("SECURITY.AUDIT_LOG_CREATED", {
        tenantId: tenant.tenantSlug,
        eventType: event.eventType,
        userId: actor.userId
      });

      return ok(undefined);
    } catch (cause) {
      return err(
        createAppError({
          code: "AUDIT_LOG_FAILED",
          message: "No se pudo registrar el evento de auditoria.",
          retryable: true,
          cause
        })
      );
    }
  };

  const getAuditLogs: ReportsService["getAuditLogs"] = async (
    tenant,
    actor,
    eventType
  ) => {
    if (actor.role !== "owner" && actor.role !== "super_admin" && !actor.permissions.canViewReports) {
      return err(
        createAppError({
          code: "AUDIT_PERMISSION_DENIED",
          message: "No tiene permisos para ver auditoria.",
          retryable: false
        })
      );
    }

    try {
      const data = await db.listAuditLogs(tenant.tenantSlug, eventType);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "AUDIT_LIST_FAILED",
          message: "No se pudo listar los logs de auditoria.",
          retryable: false,
          cause
        })
      );
    }
  };

  return {
    getSalesByDay,
    getSalesByProduct,
    getKardex,
    getGrossProfit,
    getBoxClosings,
    logSecurityEvent,
    getAuditLogs
  };
};