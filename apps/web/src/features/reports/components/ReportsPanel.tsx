/**
 * Componente principal del panel de reportes.
 * Muestra diferentes reportes del sistema:
 * - Ventas por día
 * - Ventas por producto
 * - Kardex de productos
 * - Utilidad bruta
 * - Cierres de caja
 * - Auditoría (solo para owner y admin)
 * Utiliza el hook useReports para cargar y mostrar los datos.
 */

import { useState } from "react";
import { useReports } from "../hooks/useReports";
import type { ReportsActorContext } from "../types/reports.types";

interface ReportsPanelProps {
  tenantSlug: string;
  actor: ReportsActorContext;
}

export function ReportsPanel({ tenantSlug, actor }: ReportsPanelProps) {
  const [activeTab, setActiveTab] = useState<
    | "sales-day"
    | "sales-product"
    | "kardex"
    | "profit"
    | "box"
    | "audit"
  >("sales-day");

  const {
    state,
    loadSalesByDay,
    loadSalesByProduct,
    loadKardex,
    loadGrossProfit,
    loadBoxClosings,
    loadAuditLogs
  } = useReports({
    tenant: { tenantSlug },
    actor
  });

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    switch (tab) {
      case "sales-day":
        void loadSalesByDay();
        break;
      case "sales-product":
        void loadSalesByProduct();
        break;
      case "kardex":
        void loadKardex();
        break;
      case "profit":
        void loadGrossProfit();
        break;
      case "box":
        void loadBoxClosings();
        break;
      case "audit":
        void loadAuditLogs();
        break;
    }
  };

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Reportes y Auditoria</h2>
      {state.lastError ? <p className="text-red-700">{state.lastError.message}</p> : null}

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handleTabChange("sales-day")}
          style={{
            padding: "8px 12px",
            background: activeTab === "sales-day" ? "var(--color-state-info)" : "var(--color-surface-100)",
            color: activeTab === "sales-day" ? "white" : "var(--color-content-primary)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Ventas por Dia
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("sales-product")}
          style={{
            padding: "8px 12px",
            background: activeTab === "sales-product" ? "var(--color-state-info)" : "var(--color-surface-100)",
            color: activeTab === "sales-product" ? "white" : "var(--color-content-primary)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Ventas por Producto
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("kardex")}
          style={{
            padding: "8px 12px",
            background: activeTab === "kardex" ? "var(--color-state-info)" : "var(--color-surface-100)",
            color: activeTab === "kardex" ? "white" : "var(--color-content-primary)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Kardex
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("profit")}
          style={{
            padding: "8px 12px",
            background: activeTab === "profit" ? "var(--color-state-info)" : "var(--color-surface-100)",
            color: activeTab === "profit" ? "white" : "var(--color-content-primary)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Utilidad Bruta
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("box")}
          style={{
            padding: "8px 12px",
            background: activeTab === "box" ? "var(--color-state-info)" : "var(--color-surface-100)",
            color: activeTab === "box" ? "white" : "var(--color-content-primary)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Cierres de Caja
        </button>
        {actor.role === "owner" || actor.role === "admin" ? (
          <button
            type="button"
            onClick={() => handleTabChange("audit")}
            style={{
              padding: "8px 12px",
              background: activeTab === "audit" ? "var(--color-state-info)" : "var(--color-surface-100)",
              color: activeTab === "audit" ? "white" : "var(--color-content-primary)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Auditoria
          </button>
        ) : null}
      </div>

      {state.isLoading ? (
        <p>Cargando...</p>
      ) : (
        <>
          {activeTab === "sales-day" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Fecha</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Transacciones</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Subtotal</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Impuesto</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {state.salesByDay.map((row) => (
                  <tr key={row.saleDate}>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.saleDate}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                      {row.totalTransactions}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                      {row.totalSubtotal.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                      {row.totalTax.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                      {row.totalSales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "sales-product" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Producto</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Cantidad</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {state.salesByProduct.map((row) => (
                  <tr key={row.productLocalId}>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.productLocalId}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                      {row.totalQty.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>
                      {row.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "kardex" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Producto</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Bodega</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Entrada</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Salida</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {state.kardex.map((row) => (
                  <tr key={`${row.productLocalId}-${row.warehouseLocalId}`}>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.productName || row.productLocalId}</td>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.warehouseName || row.warehouseLocalId}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.totalIn.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.totalOut.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.currentBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "profit" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Fecha</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Venta</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Costo</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Utilidad</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>% Margen</th>
                </tr>
              </thead>
              <tbody>
                {state.grossProfit.map((row) => (
                  <tr key={row.saleLocalId}>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.createdAt.split("T")[0]}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.saleTotal.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.totalCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.grossProfit.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.profitMarginPercent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "box" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Fecha</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Bodega</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Esperado</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Contado</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>Diferencia</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {state.boxClosings.map((row) => (
                  <tr key={row.localId}>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.closedAt.split("T")[0]}</td>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.warehouseLocalId}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.expectedAmount.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.countedAmount.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid var(--border)" }}>{row.differenceAmount.toFixed(2)}</td>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "audit" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Fecha</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Evento</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Tabla</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Usuario</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {state.auditLogs.map((log) => (
                  <tr key={log.localId}>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{log.createdAt.split("T")[0]}</td>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{log.eventType}</td>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{log.targetTable || "-"}</td>
                    <td style={{ borderBottom: "1px solid var(--border)" }}>{log.userId || "Sistema"}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", color: log.success ? "var(--color-state-success)" : "var(--color-state-error)" }}>
                      {log.success ? "Exito" : "Fallo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}