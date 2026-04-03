/**
 * Componente principal del panel de facturación.
 * Permite crear facturas desde ventas y anular facturas existentes.
 * Escucha eventos del bus para actualización automática.
 */

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/core/runtime";
import { useInvoicing } from "../hooks/useInvoicing";
import { invoicingService } from "../services/invoicing.service.instance";
import type { InvoicingActorContext, VoidInvoiceInput } from "../types/invoicing.types";

interface InvoicingPanelProps {
  tenantSlug: string;
  actor: InvoicingActorContext;
}

export function InvoicingPanel({ tenantSlug, actor }: InvoicingPanelProps) {
  const [saleLocalId, setSaleLocalId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRif, setCustomerRif] = useState("");
  const [invoiceLocalIdToVoid, setInvoiceLocalIdToVoid] = useState("");
  const [voidReason, setVoidReason] = useState("");

  const { state, refresh, createInvoiceFromSale, voidInvoice } = useInvoicing({
    service: invoicingService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = eventBus.on("INVOICE.CREATED", () => {
      void refresh();
    });
    const offVoided = eventBus.on("INVOICE.VOIDED", () => {
      void refresh();
    });
    return () => {
      offCreated();
      offVoided();
    };
  }, [refresh]);

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Facturacion SENIAT</h2>
      {state.lastError ? <p className="text-red-700">{state.lastError.message}</p> : null}

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <h3 style={{ margin: 0 }}>Crear factura desde venta</h3>
        <input
          value={saleLocalId}
          onChange={(event) => setSaleLocalId(event.target.value)}
          placeholder="Sale Local ID"
        />
        <input
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Nombre cliente"
        />
        <input
          value={customerRif}
          onChange={(event) => setCustomerRif(event.target.value)}
          placeholder="RIF cliente"
        />
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={async () => {
            const created = await createInvoiceFromSale({
              saleLocalId,
              customerName,
              customerRif
            });
            if (created) {
              setSaleLocalId("");
              setCustomerName("");
              setCustomerRif("");
            }
          }}
        >
          Crear factura
        </button>
      </div>

      {actor.permissions.canVoidInvoice ? (
        <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
          <h3 style={{ margin: 0 }}>Anular factura</h3>
          <input
            value={invoiceLocalIdToVoid}
            onChange={(event) => setInvoiceLocalIdToVoid(event.target.value)}
            placeholder="Invoice Local ID"
          />
          <input
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            placeholder="Razon"
          />
          <button
            type="button"
            disabled={state.isSubmitting}
            onClick={async () => {
              const input: VoidInvoiceInput = {
                invoiceLocalId: invoiceLocalIdToVoid,
                reason: voidReason
              };
              const voided = await voidInvoice(input);
              if (voided) {
                setInvoiceLocalIdToVoid("");
                setVoidReason("");
              }
            }}
          >
            Anular factura
          </button>
        </div>
      ) : null}

      <h3>Facturas</h3>
      <ul>
        {state.invoices.map((invoice) => (
          <li key={invoice.localId}>
            {invoice.invoiceNumber ?? invoice.localId.slice(0, 8)} |{" "}
            {invoice.customerName ?? "Sin cliente"} | {invoice.status} | Total:{" "}
            {invoice.total.toFixed(2)}
          </li>
        ))}
      </ul>

      <h3>Reglas de impuestos</h3>
      <ul>
        {state.taxRules.map((rule) => (
          <li key={rule.localId}>
            {rule.name} | {rule.type} | {rule.rate}% | {rule.isActive ? "Activo" : "Inactivo"}
          </li>
        ))}
      </ul>

      <h3>Tipos de cambio</h3>
      <ul>
        {state.exchangeRates.map((rate) => (
          <li key={rate.localId}>
            {rate.fromCurrency} → {rate.toCurrency} | {rate.rate}
          </li>
        ))}
      </ul>
    </section>
  );
}