// Reports - Servicio para generar reportes de ventas, kardex y ganancias
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
  BalanceSheetReport,
  FinanceReport,
  GrossProfit,
  KardexEntry,
  KardexEntryExtended,
  LotLayer,
  ReportsActorContext,
  ReportsKpis,
  ReportsTenantContext,
  SaleWithDetails,
  SalesByDay,
  SalesByProduct,
  SecurityAuditLog,
  CashFlowReport
} from "../types/reports.types";

export interface ReportsDb {
  listSalesByDay(tenantId: string): Promise<SalesByDay[]>;
  listSalesByProduct(tenantId: string): Promise<SalesByProduct[]>;
  listKardex(tenantId: string, warehouseLocalId?: string): Promise<KardexEntry[]>;
  listKardexWithLayers(tenantId: string, warehouseLocalId?: string): Promise<KardexEntryExtended[]>;
  listGrossProfit(tenantId: string): Promise<GrossProfit[]>;
  listBoxClosings(tenantId: string): Promise<BoxClosingSummary[]>;
  createAuditLog(log: Omit<SecurityAuditLog, "localId">): Promise<void>;
  listAuditLogs(tenantId: string, eventType?: string): Promise<SecurityAuditLog[]>;
  getReportsKpis(tenantId: string): Promise<ReportsKpis>;
  getLotLayers(tenantId: string, productLocalId?: string): Promise<LotLayer[]>;
  listSalesWithDetails(tenantId: string, warehouseLocalId?: string): Promise<SaleWithDetails[]>;
  getFinanceReport(tenantId: string, startDate?: string, endDate?: string): Promise<FinanceReport[]>;
  getBalanceSheet(tenantId: string, startDate?: string, endDate?: string): Promise<BalanceSheetReport[]>;
  getCashFlowReport(tenantId: string, startDate?: string, endDate?: string): Promise<CashFlowReport[]>;
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
  getKardexWithLayers(
    tenant: ReportsTenantContext,
    warehouseLocalId?: string
  ): Promise<Result<KardexEntryExtended[], AppError>>;
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
  getReportsKpis(
    tenant: ReportsTenantContext
  ): Promise<Result<ReportsKpis, AppError>>;
  getLotLayers(
    tenant: ReportsTenantContext,
    productLocalId?: string
  ): Promise<Result<LotLayer[], AppError>>;
  listSalesWithDetails(
    tenant: ReportsTenantContext,
    warehouseLocalId?: string
  ): Promise<Result<SaleWithDetails[], AppError>>;
  getFinanceReport(
    tenant: ReportsTenantContext,
    startDate?: string,
    endDate?: string
  ): Promise<Result<FinanceReport[], AppError>>;
  getBalanceSheet(
    tenant: ReportsTenantContext,
    startDate?: string,
    endDate?: string
  ): Promise<Result<BalanceSheetReport[], AppError>>;
  getCashFlowReport(
    tenant: ReportsTenantContext,
    startDate?: string,
    endDate?: string
  ): Promise<Result<CashFlowReport[], AppError>>;
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
    if (actor.role !== "owner" && actor.role !== "admin" && !actor.permissions.canViewReports) {
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
    if (actor.role !== "owner" && actor.role !== "admin" && !actor.permissions.canViewReports) {
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

  const getReportsKpis: ReportsService["getReportsKpis"] = async (tenant) => {
    try {
      const data = await db.getReportsKpis(tenant.tenantSlug);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_KPIS_FAILED",
          message: "No se pudieron obtener los KPIs de reportes.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getLotLayers: ReportsService["getLotLayers"] = async (
    tenant,
    productLocalId
  ) => {
    try {
      const data = await db.getLotLayers(tenant.tenantSlug, productLocalId);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_LOT_LAYERS_FAILED",
          message: "No se pudieron obtener las capas de inventario.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getKardexWithLayers: ReportsService["getKardexWithLayers"] = async (
    tenant,
    warehouseLocalId
  ) => {
    try {
      const data = await db.listKardexWithLayers(tenant.tenantSlug, warehouseLocalId);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_KARDEX_LAYERS_FAILED",
          message: "No se pudo obtener el kardex con capas.",
          retryable: false,
          cause
        })
      );
    }
  };

  const listSalesWithDetails: ReportsService["listSalesWithDetails"] = async (
    tenant,
    warehouseLocalId
  ) => {
    try {
      const data = await db.listSalesWithDetails(tenant.tenantSlug, warehouseLocalId);
      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_SALES_DETAILS_FAILED",
          message: "No se pudieron obtener las ventas con detalles.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getFinanceReport: ReportsService["getFinanceReport"] = async (
    tenant,
    startDate,
    endDate
  ) => {
    try {
      const data = await db.getFinanceReport(tenant.tenantSlug, startDate, endDate);

      if (data.length === 0) {
        return ok([
          {
            period: "2026-01",
            totalSales: 0,
            subtotal: 0,
            taxTotal: 0,
            discountTotal: 0,
            totalCost: 0,
            cogs: 0,
            purchasesConfirmed: 0,
            purchasesReceived: 0,
            grossProfit: 0,
            operatingProfit: 0,
            profitMarginPercent: 0,
            ivaCollected: 0,
            igtfCollected: 0,
            exchangeRateUsed: 36.0,
            totalTransactions: 0,
            totalItems: 0
          }
        ]);
      }

      const report = data[0]!;
      if (!report.exchangeRateUsed || report.exchangeRateUsed <= 0) {
        return err(
          createAppError({
            code: "EXCHANGE_RATE_NOT_FOUND",
            message: "No se encontró tasa de cambio para el período seleccionado.",
            retryable: false,
            context: { period: report.period }
          })
        );
      }

      eventBus.emit("SECURITY.AUDIT_LOG_CREATED", {
        tenantId: tenant.tenantSlug,
        eventType: "FINANCE_REPORT_GENERATED",
        targetTable: "finance",
        success: true,
        details: {
          period: report.period,
          totalSales: report.totalSales,
          cogs: report.cogs,
          operatingProfit: report.operatingProfit,
          exchangeRate: report.exchangeRateUsed
        }
      });

      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_FINANCE_FAILED",
          message: "No se pudo obtener el reporte financiero.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getBalanceSheet: ReportsService["getBalanceSheet"] = async (
    tenant,
    startDate,
    endDate
  ) => {
    try {
      const data = await db.getBalanceSheet(tenant.tenantSlug, startDate, endDate);

      if (data.length === 0) {
        return ok([
          {
            period: "2026-01",
            assets: { inventory: 0, cash: 0, accountsReceivable: 0, total: 0 },
            liabilities: { accountsPayable: 0, taxObligations: 0, total: 0 },
            equity: { retainedEarnings: 0, total: 0 },
            balanceCheck: true,
            liquidityIndex: 0,
            exchangeRateUsed: 36.0
          }
        ]);
      }

      const report = data[0]!;
      if (!report.exchangeRateUsed || report.exchangeRateUsed <= 0) {
        return err(
          createAppError({
            code: "EXCHANGE_RATE_NOT_FOUND",
            message: "No se encontró tasa de cambio para el período seleccionado.",
            retryable: false,
            context: { period: report.period }
          })
        );
      }

      if (!report.balanceCheck) {
        return err(
          createAppError({
            code: "BALANCE_SHEET_IMBALANCED",
            message: "El balance general no cuadra: Activos ≠ Pasivos + Patrimonio.",
            retryable: false,
            context: {
              assets: report.assets.total,
              liabilities: report.liabilities.total,
              equity: report.equity.total
            }
          })
        );
      }

      eventBus.emit("SECURITY.AUDIT_LOG_CREATED", {
        tenantId: tenant.tenantSlug,
        eventType: "BALANCE_SHEET_GENERATED",
        targetTable: "balance_sheet",
        success: true,
        details: {
          period: report.period,
          totalAssets: report.assets.total,
          totalLiabilities: report.liabilities.total,
          equity: report.equity.total,
          liquidityIndex: report.liquidityIndex,
          exchangeRate: report.exchangeRateUsed
        }
      });

      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_BALANCE_FAILED",
          message: "No se pudo obtener el balance general.",
          retryable: false,
          cause
        })
      );
    }
  };

  const getCashFlowReport: ReportsService["getCashFlowReport"] = async (
    tenant,
    startDate,
    endDate
  ) => {
    try {
      const data = await db.getCashFlowReport(tenant.tenantSlug, startDate, endDate);

      if (!data || data.length === 0) {
        return ok([]);
      }

      const report = data[0]!;

      if (report.exchangeRateUsed <= 0) {
        return err(
          createAppError({
            code: "EXCHANGE_RATE_NOT_FOUND",
            message: "No se encontró la tasa de cambio para el período.",
            retryable: false,
            context: { period: report.period }
          })
        );
      }

      eventBus.emit("SECURITY.AUDIT_LOG_CREATED", {
        tenantId: tenant.tenantSlug,
        eventType: "REPORTS.CASH_FLOW_GENERATED",
        targetTable: "cash_flow",
        success: true,
        details: {
          period: report.period,
          initialBalance: report.initialBalance,
          inflows: report.inflows.total,
          outflows: report.outflows.total,
          netFlow: report.netFlow,
          finalBalance: report.finalBalance,
          exchangeRate: report.exchangeRateUsed
        }
      });

      return ok(data);
    } catch (cause) {
      return err(
        createAppError({
          code: "REPORT_CASH_FLOW_FAILED",
          message: "No se pudo obtener el flujo de caja.",
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
    getKardexWithLayers,
    getGrossProfit,
    getBoxClosings,
    logSecurityEvent,
    getAuditLogs,
    getReportsKpis,
    getLotLayers,
    listSalesWithDetails,
    getFinanceReport,
    getBalanceSheet,
    getCashFlowReport
  };
};