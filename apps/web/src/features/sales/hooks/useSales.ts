/**
 * Hook de ventas
 * Coordina el estado de UI para ventas POS, suspended sales y caja
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { eventBus } from "@/lib/core/runtime";
import type { SalesService } from "../services/sales.service";
import type {
  CloseBoxInput,
  CreatePosSaleInput,
  CreateSuspendedSaleInput,
  OpenBoxInput,
  RestoreSuspendedSaleResult,
  SalesActorContext,
  SalesTenantContext,
  SalesUiState
} from "../types/sales.types";

const initialState: SalesUiState = {
  isLoading: false,
  sales: [],
  suspendedSales: [],
  boxClosings: [],
  lastError: null
};

interface UseSalesOptions {
  service: SalesService;
  tenant: SalesTenantContext;
  actor: SalesActorContext;
}

/**
 * Hook para gestionar ventas
 */
export const useSales = ({
  service,
  tenant,
  actor
}: UseSalesOptions) => {
  const [state, setState] = useState<SalesUiState>(initialState);
  const serviceRef = useRef(service);
  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    serviceRef.current = service;
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [service, tenant, actor]);

  /**
   * Refresca ventas, ventas suspendidas y cierres de caja
   */
  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [salesResult, suspendedResult, closingsResult] = await Promise.all([
      serviceRef.current.listSales(tenantRef.current),
      serviceRef.current.listSuspendedSales(tenantRef.current),
      serviceRef.current.listBoxClosings(tenantRef.current)
    ]);

    if (!salesResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: salesResult.error
      }));
      return;
    }
    if (!suspendedResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: suspendedResult.error
      }));
      return;
    }
    if (!closingsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: closingsResult.error
      }));
      return;
    }

    setState({
      isLoading: false,
      sales: salesResult.data,
      suspendedSales: suspendedResult.data,
      boxClosings: closingsResult.data,
      lastError: null
    });
  }, []);

  /**
   * Escucha eventos de sincronización para refrescar la UI (Regla de Oro #4)
   */
  useEffect(() => {
    const featureTables = ["sales", "suspended_sales", "box_closings"];
    
    const offSync = eventBus.on<{ table: string }>("SYNC.REFRESH_TABLE", (payload) => {
      if (featureTables.includes(payload.table)) {
        void refresh();
      }
    });

    const offSales = eventBus.on("SALE.COMPLETED", () => void refresh());
    const offSuspended = eventBus.on("SALE.SUSPENDED", () => void refresh());
    const offRestored = eventBus.on("SALE.SUSPENDED_RESTORED", () => void refresh());
    const offBoxClosed = eventBus.on("POS.BOX_CLOSED", () => void refresh());
    const offBoxOpened = eventBus.on("POS.BOX_OPENED", () => void refresh());
    const offStock = eventBus.on("INVENTORY.STOCK_MOVEMENT_RECORDED", () => void refresh());

    return () => {
      offSync();
      offSales();
      offSuspended();
      offRestored();
      offBoxClosed();
      offBoxOpened();
      offStock();
    };
  }, [refresh]);

  /**
   * Crea una venta suspendida (ticket)
   */
  const createSuspendedSale = useCallback(
    async (input: CreateSuspendedSaleInput) => {
      const result = await serviceRef.current.createSuspendedSale(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  /**
   * Crea una venta POS completada
   */
  const createPosSale = useCallback(
    async (input: CreatePosSaleInput) => {
      const result = await serviceRef.current.createPosSale(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  /**
   * Restaura una venta suspendida y la convierte en venta POS
   * @returns Datos para restaurar el carrito, o null si falla
   */
  const restoreSuspendedSale = useCallback(
    async (suspendedLocalId: string): Promise<RestoreSuspendedSaleResult | null> => {
      const result = await serviceRef.current.restoreSuspendedSale(
        tenantRef.current,
        actorRef.current,
        suspendedLocalId
      );
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, lastError: null }));
      return result.data;
    },
    []
  );

  /**
   * Cierra una caja
   */
  const closeBox = useCallback(
    async (input: CloseBoxInput) => {
      const result = await serviceRef.current.closeBox(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  /**
   * Abre una caja
   */
  const openBox = useCallback(
    async (input: OpenBoxInput) => {
      const result = await serviceRef.current.openBox(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  return {
    state,
    refresh,
    createSuspendedSale,
    createPosSale,
    restoreSuspendedSale,
    openBox,
    closeBox
  };
};