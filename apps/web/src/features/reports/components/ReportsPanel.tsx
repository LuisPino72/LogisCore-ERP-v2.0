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
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Reportes y Auditoria</h2>
      {state.lastError ? <p style={{ color: "#b91c1c" }}>{state.lastError.message}</p> : null}

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handleTabChange("sales-day")}
          style={{
            padding: "8px 12px",
            background: activeTab === "sales-day" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "sales-day" ? "white" : "black",
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
            background: activeTab === "sales-product" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "sales-product" ? "white" : "black",
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
            background: activeTab === "kardex" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "kardex" ? "white" : "black",
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
            background: activeTab === "profit" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "profit" ? "white" : "black",
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
            background: activeTab === "box" ? "#3b82f6" : "#e2e8f0",
            color: activeTab === "box" ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Cierres de Caja
        </button>
        {actor.role === "owner" || actor.role === "super_admin" ? (
          <button
            type="button"
            onClick={() => handleTabChange("audit")}
            style={{
              padding: "8px 12px",
              background: activeTab === "audit" ? "#3b82f6" : "#e2e8f0",
              color: activeTab === "audit" ? "white" : "black",
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
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Fecha</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Transacciones</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Subtotal</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Impuesto</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {state.salesByDay.map((row) => (
                  <tr key={row.saleDate}>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.saleDate}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                      {row.totalTransactions}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                      {row.totalSubtotal.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                      {row.totalTax.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
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
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Producto</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Cantidad</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {state.salesByProduct.map((row) => (
                  <tr key={row.productLocalId}>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.productLocalId}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                      {row.totalQty.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
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
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Producto</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Bodega</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Entrada</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Salida</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {state.kardex.map((row) => (
                  <tr key={`${row.productLocalId}-${row.warehouseLocalId}`}>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.productName || row.productLocalId}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.warehouseName || row.warehouseLocalId}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.totalIn.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.totalOut.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.currentBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "profit" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Fecha</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Venta</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Costo</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Utilidad</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>% Margen</th>
                </tr>
              </thead>
              <tbody>
                {state.grossProfit.map((row) => (
                  <tr key={row.saleLocalId}>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.createdAt.split("T")[0]}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.saleTotal.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.totalCost.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.grossProfit.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.profitMarginPercent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "box" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Fecha</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Bodega</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Esperado</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Contado</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>Diferencia</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {state.boxClosings.map((row) => (
                  <tr key={row.localId}>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.closedAt.split("T")[0]}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.warehouseLocalId}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.expectedAmount.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.countedAmount.toFixed(2)}</td>
                    <td style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{row.differenceAmount.toFixed(2)}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "audit" && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Fecha</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Evento</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Tabla</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Usuario</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {state.auditLogs.map((log) => (
                  <tr key={log.localId}>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{log.createdAt.split("T")[0]}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{log.eventType}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{log.targetTable || "-"}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0" }}>{log.userId || "Sistema"}</td>
                    <td style={{ borderBottom: "1px solid #e2e8f0", color: log.success ? "green" : "red" }}>
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