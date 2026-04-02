/**
 * Hook personalizado para gestionar los reportes.
 * Provee estado y métodos para:
 * - Cargar reportes de ventas, kardex, utilidad bruta y cierres de caja
 * - Registrar eventos de auditoría
 * - Cargar logs de auditoría
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState } from "react";
import { reportsService } from "../services/reports.service.instance";
import type { ReportsService } from "../services/reports.service";
import type {
  ReportsActorContext,
  ReportsTenantContext,
  ReportsUiState
} from "../types/reports.types";

const initialState: ReportsUiState = {
  isLoading: false,
  isSubmitting: false,
  salesByDay: [],
  salesByProduct: [],
  kardex: [],
  grossProfit: [],
  boxClosings: [],
  auditLogs: [],
  lastError: null
};

interface UseReportsOptions {
  service?: ReportsService;
  tenant: ReportsTenantContext;
  actor: ReportsActorContext;
}

export const useReports = ({
  service = reportsService,
  tenant,
  actor
}: UseReportsOptions) => {
  const [state, setState] = useState<ReportsUiState>(initialState);

  const loadSalesByDay = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await service.getSalesByDay(tenant);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, salesByDay: result.data }));
  }, [service, tenant]);

  const loadSalesByProduct = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await service.getSalesByProduct(tenant);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, salesByProduct: result.data }));
  }, [service, tenant]);

  const loadKardex = useCallback(
    async (warehouseLocalId?: string) => {
      setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
      const result = await service.getKardex(tenant, warehouseLocalId);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
        return;
      }
      setState((previous) => ({ ...previous, isLoading: false, kardex: result.data }));
    },
    [service, tenant]
  );

  const loadGrossProfit = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await service.getGrossProfit(tenant);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, grossProfit: result.data }));
  }, [service, tenant]);

  const loadBoxClosings = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await service.getBoxClosings(tenant);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, boxClosings: result.data }));
  }, [service, tenant]);

  const logSecurityEvent = useCallback(
    async (event: {
      eventType: string;
      targetTable?: string;
      targetLocalId?: string;
      success: boolean;
      details?: Record<string, unknown>;
    }) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.logSecurityEvent(tenant, actor, event);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return false;
      }
      setState((previous) => ({ ...previous, isSubmitting: false }));
      return true;
    },
    [actor, service, tenant]
  );

  const loadAuditLogs = useCallback(
    async (eventType?: string) => {
      setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
      const result = await service.getAuditLogs(tenant, actor, eventType);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
        return;
      }
      setState((previous) => ({ ...previous, isLoading: false, auditLogs: result.data }));
    },
    [actor, service, tenant]
  );

  return {
    state,
    loadSalesByDay,
    loadSalesByProduct,
    loadKardex,
    loadGrossProfit,
    loadBoxClosings,
    logSecurityEvent,
    loadAuditLogs
  };
};