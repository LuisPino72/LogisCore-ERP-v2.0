/**
 * Hook personalizado para gestionar la facturación.
 * Provee estado y métodos para:
 * - Listar facturas, reglas fiscales y tipos de cambio
 * - Crear facturas desde ventas
 * - Anular facturas
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState } from "react";
import { invoicingService } from "../services/invoicing.service.instance";
import type { InvoicingService } from "../services/invoicing.service";
import type {
  CreateInvoiceFromSaleInput,
  InvoicingActorContext,
  InvoicingTenantContext,
  InvoicingUiState,
  VoidInvoiceInput
} from "../types/invoicing.types";

const initialState: InvoicingUiState = {
  isLoading: false,
  isSubmitting: false,
  invoices: [],
  taxRules: [],
  exchangeRates: [],
  lastError: null
};

interface UseInvoicingOptions {
  service?: InvoicingService;
  tenant: InvoicingTenantContext;
  actor: InvoicingActorContext;
}

export const useInvoicing = ({
  service = invoicingService,
  tenant,
  actor
}: UseInvoicingOptions) => {
  const [state, setState] = useState<InvoicingUiState>(initialState);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [invoicesResult, taxRulesResult, exchangeRatesResult] = await Promise.all([
      service.listInvoices(tenant),
      service.listTaxRules(tenant),
      service.listExchangeRates(tenant)
    ]);

    if (!invoicesResult.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: invoicesResult.error }));
      return;
    }
    if (!taxRulesResult.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: taxRulesResult.error }));
      return;
    }
    if (!exchangeRatesResult.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: exchangeRatesResult.error }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: false,
      invoices: invoicesResult.data,
      taxRules: taxRulesResult.data,
      exchangeRates: exchangeRatesResult.data,
      lastError: null
    }));
  }, [service, tenant]);

  const createInvoiceFromSale = useCallback(
    async (input: CreateInvoiceFromSaleInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.createInvoiceFromSale(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  const voidInvoice = useCallback(
    async (input: VoidInvoiceInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.voidInvoice(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  return {
    state,
    refresh,
    createInvoiceFromSale,
    voidInvoice
  };
};