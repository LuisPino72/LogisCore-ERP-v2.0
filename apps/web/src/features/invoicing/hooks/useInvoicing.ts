/**
 * Hook personalizado para gestionar la facturación.
 * Provee estado y métodos para:
 * - Listar facturas, reglas fiscales y tipos de cambio
 * - Crear facturas desde ventas
 * - Anular facturas
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { eventBus } from "@/lib/core/runtime";
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
  const serviceRef = useRef(service);
  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    serviceRef.current = service;
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [service, tenant, actor]);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [invoicesResult, taxRulesResult, exchangeRatesResult] = await Promise.all([
      serviceRef.current.listInvoices(tenantRef.current),
      serviceRef.current.listTaxRules(tenantRef.current),
      serviceRef.current.listExchangeRates(tenantRef.current)
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
  }, []);

  useEffect(() => {
    const featureTables = ["invoices", "tax_rules", "exchange_rates"];

    const offSync = eventBus.on<{ table: string }>("SYNC.REFRESH_TABLE", (payload) => {
      if (featureTables.includes(payload.table)) {
        void refresh();
      }
    });

    const offInvoice = eventBus.on("INVOICE.CREATED", () => void refresh());
    const offInvoiceUpd = eventBus.on("INVOICE.UPDATED", () => void refresh());
    const offInvoiceDel = eventBus.on("INVOICE.DELETED", () => void refresh());

    return () => {
      offSync();
      offInvoice();
      offInvoiceUpd();
      offInvoiceDel();
    };
  }, [refresh]);

  const createInvoiceFromSale = useCallback(
    async (input: CreateInvoiceFromSaleInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.createInvoiceFromSale(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const voidInvoice = useCallback(
    async (input: VoidInvoiceInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.voidInvoice(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  return {
    state,
    refresh,
    createInvoiceFromSale,
    voidInvoice
  };
};