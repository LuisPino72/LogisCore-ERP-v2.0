/**
 * Hook personalizado para gestionar los reportes.
 * Provee estado y métodos para:
 * - Cargar reportes de ventas, kardex, utilidad bruta y cierres de caja
 * - Registrar eventos de auditoría
 * - Cargar logs de auditoría
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState, useRef, useEffect } from "react";
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
  const serviceRef = useRef(service);
  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    serviceRef.current = service;
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [service, tenant, actor]);

  const loadSalesByDay = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await serviceRef.current.getSalesByDay(tenantRef.current);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, salesByDay: result.data }));
  }, []);

  const loadSalesByProduct = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await serviceRef.current.getSalesByProduct(tenantRef.current);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, salesByProduct: result.data }));
  }, []);

  const loadKardex = useCallback(
    async (warehouseLocalId?: string) => {
      setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
      const result = await serviceRef.current.getKardex(tenantRef.current, warehouseLocalId);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
        return;
      }
      setState((previous) => ({ ...previous, isLoading: false, kardex: result.data }));
    },
    []
  );

  const loadGrossProfit = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await serviceRef.current.getGrossProfit(tenantRef.current);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, grossProfit: result.data }));
  }, []);

  const loadBoxClosings = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const result = await serviceRef.current.getBoxClosings(tenantRef.current);
    if (!result.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: false, boxClosings: result.data }));
  }, []);

  const logSecurityEvent = useCallback(
    async (event: {
      eventType: string;
      targetTable?: string;
      targetLocalId?: string;
      success: boolean;
      details?: Record<string, unknown>;
    }) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.logSecurityEvent(tenantRef.current, actorRef.current, event);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return false;
      }
      setState((previous) => ({ ...previous, isSubmitting: false }));
      return true;
    },
    []
  );

  const loadAuditLogs = useCallback(
    async (eventType?: string) => {
      setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
      const result = await serviceRef.current.getAuditLogs(tenantRef.current, actorRef.current, eventType);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isLoading: false, lastError: result.error }));
        return;
      }
      setState((previous) => ({ ...previous, isLoading: false, auditLogs: result.data }));
    },
    []
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