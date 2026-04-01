import { useCallback, useState } from "react";
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

export const useSales = ({
  service,
  tenant,
  actor
}: UseSalesOptions) => {
  const [state, setState] = useState<SalesUiState>(initialState);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [salesResult, suspendedResult, closingsResult] = await Promise.all([
      service.listSales(tenant),
      service.listSuspendedSales(tenant),
      service.listBoxClosings(tenant)
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
  }, [service, tenant]);

  const createSuspendedSale = useCallback(
    async (input: CreateSuspendedSaleInput) => {
      const result = await service.createSuspendedSale(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const createPosSale = useCallback(
    async (input: CreatePosSaleInput) => {
      const result = await service.createPosSale(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const restoreSuspendedSale = useCallback(
    async (suspendedLocalId: string): Promise<RestoreSuspendedSaleResult | null> => {
      const result = await service.restoreSuspendedSale(
        tenant,
        actor,
        suspendedLocalId
      );
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, lastError: null }));
      return result.data;
    },
    [actor, service, tenant]
  );

  const closeBox = useCallback(
    async (input: CloseBoxInput) => {
      const result = await service.closeBox(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const openBox = useCallback(
    async (input: OpenBoxInput) => {
      const result = await service.openBox(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
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
