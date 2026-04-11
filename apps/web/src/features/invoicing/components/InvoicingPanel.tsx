/**
 * Panel Maestro de Facturación Fiscal.
 * Gestiona el ciclo completo de facturas, emisiones y configuración SENIAT.
 */

import { useEffect, useState, useMemo } from "react";
import type { InvoicingActorContext, Invoice, CreateInvoiceFromSaleInput, VoidInvoiceInput } from "../types/invoicing.types";
import { eventBus } from "@/lib/core/runtime";
import { useInvoicing } from "../hooks/useInvoicing";
import { invoicingService } from "../services/invoicing.service.instance";
import { InvoicingKpiHeader } from "./InvoicingKpiHeader";
import { InvoicesTab } from "./InvoicesTab";
import { IssueInvoiceTab } from "./IssueInvoiceTab";
import { SalesBookTab } from "./SalesBookTab";
import { ConfigTab } from "./ConfigTab";
import { InvoiceModal } from "./InvoiceModal";
import { VoidInvoiceModal } from "./VoidInvoiceModal";
import { Tabs } from "@/common/components/Tabs";
import { AlertCircle } from "lucide-react";

interface InvoicingPanelProps {
  tenantSlug: string;
  actor: InvoicingActorContext;
}

interface SaleForInvoice {
  localId: string;
  customerId?: string;
  customerName?: string;
  customerRif?: string;
  status: "draft" | "completed" | "voided" | "refunded";
  subtotal: number;
  taxTotal: number;
  igtfAmount?: number;
  total: number;
  createdAt: string;
}

export function InvoicingPanel({ tenantSlug, actor }: InvoicingPanelProps) {
  const [, setActiveTab] = useState("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);

  const mockSales: SaleForInvoice[] = [];

  const {
    state,
    refresh,
    createInvoiceFromSale,
    voidInvoice
  } = useInvoicing({
    service: invoicingService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = eventBus.on("INVOICE.CREATED", () => void refresh());
    const offIssued = eventBus.on("INVOICE.ISSUED", () => void refresh());
    const offVoided = eventBus.on("INVOICE.VOIDED", () => void refresh());
    return () => {
      offCreated();
      offIssued();
      offVoided();
    };
  }, [refresh]);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleVoidInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowVoidModal(true);
  };

  const handleCreateInvoice = async (input: CreateInvoiceFromSaleInput) => {
    await createInvoiceFromSale(input);
  };

  const handleVoidSubmit = async (reason: string) => {
    if (!selectedInvoice) return;
    const input: VoidInvoiceInput = {
      invoiceLocalId: selectedInvoice.localId,
      reason,
    };
    await voidInvoice(input);
    setShowVoidModal(false);
    setSelectedInvoice(null);
  };

  const canVoid = actor.role === "owner" || actor.role === "admin" || actor.permissions.canVoidInvoice;

  const tabs = useMemo(() => [
    {
      id: "invoices",
      label: "Facturas",
      content: (
        <InvoicesTab
          invoices={state.invoices}
          isLoading={state.isLoading}
          onViewInvoice={handleViewInvoice}
          onVoidInvoice={handleVoidInvoice}
          canVoid={canVoid}
        />
      ),
    },
    {
      id: "issue",
      label: "Emitir",
      content: (
        <IssueInvoiceTab
          sales={mockSales}
          taxRules={state.taxRules}
          onCreateInvoice={handleCreateInvoice}
          isSubmitting={state.isSubmitting}
          lastError={state.lastError?.message || null}
        />
      ),
    },
    {
      id: "salesbook",
      label: "Libro de Ventas",
      content: (
        <SalesBookTab
          invoices={state.invoices}
          taxRules={state.taxRules}
        />
      ),
    },
    {
      id: "config",
      label: "Configuración",
      content: (
        <ConfigTab
          taxRules={state.taxRules}
          exchangeRates={state.exchangeRates}
          isLoading={state.isLoading}
        />
      ),
    },
  ], [state, mockSales, canVoid]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">Facturación SENIAT</h1>
        <p className="text-content-secondary mt-1">
          Gestiona facturas, impuestos y cumplimiento fiscal
        </p>
      </div>

      <InvoicingKpiHeader
        invoices={state.invoices}
        taxRules={state.taxRules}
      />

      {state.lastError && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{state.lastError.message}</p>
          </div>
        </div>
      )}

      <Tabs
        items={tabs}
        defaultTab="invoices"
        onChange={setActiveTab}
        variant="underline"
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={selectedInvoice}
      />

      <VoidInvoiceModal
        isOpen={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onVoid={handleVoidSubmit}
        isSubmitting={state.isSubmitting}
      />
    </div>
  );
}
