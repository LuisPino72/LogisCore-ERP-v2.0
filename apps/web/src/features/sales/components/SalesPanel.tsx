/**
 * Componente principal del panel de ventas (POS).
 * Permite crear ventas, suspenderlas, restaurarlas, abrir y cerrar caja.
 * Escucha eventos del bus para actualización automática.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { eventBus } from "@/lib/core/runtime";
import type { Product } from "@/features/products/types/products.types";
import { useSales } from "../hooks/useSales";
import { salesService } from "../services/sales.service.instance";
import type {
  SaleItem,
  SalePayment,
  SalesActorContext,
  SalesCurrency
} from "../types/sales.types";

interface SalesPanelProps {
  tenantSlug: string;
  actor: SalesActorContext;
  products: Product[];
}

export function SalesPanel({
  tenantSlug,
  actor,
  products
}: SalesPanelProps) {
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [productLocalId, setProductLocalId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [saleCurrency, setSaleCurrency] = useState<SalesCurrency>("VES");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<SalePayment["method"]>("cash");
  const [paymentCurrency, setPaymentCurrency] = useState<SalesCurrency>("VES");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [restoredSourceLocalId, setRestoredSourceLocalId] = useState<string | null>(
    null
  );

  const {
    state,
    refresh,
    createSuspendedSale,
    createPosSale,
    restoreSuspendedSale,
    openBox,
    closeBox
  } = useSales({
    service: salesService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offSaleCompleted = eventBus.on("SALE.COMPLETED", () => {
      void refresh();
    });
    const offBoxClosed = eventBus.on("POS.BOX_CLOSED", () => {
      void refresh();
    });
    const offBoxOpened = eventBus.on("POS.BOX_OPENED", () => {
      void refresh();
    });
    const offSuspended = eventBus.on("SALE.SUSPENDED", () => {
      void refresh();
    });
    return () => {
      offSaleCompleted();
      offBoxClosed();
      offBoxOpened();
      offSuspended();
    };
  }, [refresh]);

  const removeCartItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCartItem = useCallback((index: number, field: "qty" | "unitPrice", value: number) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const removePayment = useCallback((index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0),
    [cart]
  );

  const openBoxSession = useMemo(() => {
    return state.boxClosings.find(
      (item) =>
        item.status === "open" &&
        item.warehouseLocalId === warehouseLocalId &&
        !item.deletedAt
    );
  }, [state.boxClosings, warehouseLocalId]);

  const exchangeRateNumber = Number(exchangeRate);
  const safeExchangeRate = Number.isFinite(exchangeRateNumber) && exchangeRateNumber > 0
    ? exchangeRateNumber
    : 1;

  const totalPaidEquivalent = useMemo(() => {
    const toSaleCurrency = (payment: SalePayment): number => {
      if (payment.currency === saleCurrency) {
        return payment.amount;
      }
      if (saleCurrency === "VES") {
        return payment.amount * safeExchangeRate;
      }
      return payment.amount / safeExchangeRate;
    };
    return payments.reduce((acc, payment) => acc + toSaleCurrency(payment), 0);
  }, [payments, safeExchangeRate, saleCurrency]);

  const expectedChange = useMemo(
    () => Math.max(0, totalPaidEquivalent - subtotal),
    [subtotal, totalPaidEquivalent]
  );

  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Ventas + POS</h2>
      {state.lastError ? (
        <p style={{ color: "#b91c1c" }}>{state.lastError.message}</p>
      ) : null}

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <input
          value={warehouseLocalId}
          onChange={(event) => setWarehouseLocalId(event.target.value)}
          placeholder="Warehouse localId (ej: wh-1)"
        />
        <input
          type="number"
          min="0"
          step="0.0001"
          value={openingAmount}
          onChange={(event) => setOpeningAmount(event.target.value)}
          placeholder="Monto apertura caja"
        />
        <select
          value={saleCurrency}
          onChange={(event) => setSaleCurrency(event.target.value as SalesCurrency)}
        >
          <option value="VES">Moneda venta: VES</option>
          <option value="USD">Moneda venta: USD</option>
        </select>
        <input
          type="number"
          min="0.0001"
          step="0.0001"
          value={exchangeRate}
          onChange={(event) => setExchangeRate(event.target.value)}
          placeholder="Tasa VES por USD"
        />
        <select
          value={productLocalId}
          onChange={(event) => setProductLocalId(event.target.value)}
        >
          <option value="">Seleccionar producto</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0.0001"
          step="0.0001"
          value={qty}
          onChange={(event) => setQty(event.target.value)}
          placeholder="Cantidad"
        />
        <input
          type="number"
          min="0"
          step="0.0001"
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          placeholder="Precio unitario"
        />
        <button
          type="button"
          onClick={() => {
            if (!productLocalId) {
              return;
            }
            setCart((previous) => [
              ...previous,
              {
                productLocalId,
                qty: Number(qty),
                unitPrice: Number(unitPrice)
              }
            ]);
          }}
        >
          Agregar linea
        </button>
        <div style={{ display: "grid", gap: "8px", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
          <strong>Pagos</strong>
          <select
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as SalePayment["method"])
            }
          >
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="mobile">Pago movil</option>
            <option value="mixed">Mixto</option>
          </select>
          <select
            value={paymentCurrency}
            onChange={(event) =>
              setPaymentCurrency(event.target.value as SalesCurrency)
            }
          >
            <option value="VES">VES</option>
            <option value="USD">USD</option>
          </select>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            placeholder="Monto pago"
          />
          <button
            type="button"
            onClick={() => {
              const amount = Number(paymentAmount);
              if (amount <= 0) {
                return;
              }
              setPayments((prev) => [
                ...prev,
                {
                  method: paymentMethod,
                  currency: paymentCurrency,
                  amount
                }
              ]);
              setPaymentAmount("0");
            }}
          >
            Agregar pago
          </button>
        </div>
      </div>

      <ul>
        {cart.map((item, index) => (
          <li key={`${item.productLocalId}-${index}`} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
            <span>{item.productLocalId}</span>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={item.qty}
              onChange={(e) => updateCartItem(index, "qty", Number(e.target.value))}
              style={{ width: "80px" }}
            />
            <input
              type="number"
              min="0"
              step="0.0001"
              value={item.unitPrice}
              onChange={(e) => updateCartItem(index, "unitPrice", Number(e.target.value))}
              style={{ width: "100px" }}
            />
            <span>{(item.qty * item.unitPrice).toFixed(4)}</span>
            <button
              type="button"
              onClick={() => removeCartItem(index)}
              style={{ color: "#b91c1c", padding: "2px 6px" }}
            >
              X
            </button>
          </li>
        ))}
      </ul>

      <p>
        Subtotal:
        {" "}
        <strong>{subtotal.toFixed(4)}</strong>
      </p>
      <p>
        Pagado equivalente ({saleCurrency}):
        {" "}
        <strong>{totalPaidEquivalent.toFixed(4)}</strong>
      </p>
      <p>
        Cambio esperado ({saleCurrency}):
        {" "}
        <strong>{expectedChange.toFixed(4)}</strong>
      </p>
      <ul>
        {payments.map((payment, index) => (
          <li key={`${payment.method}-${payment.currency}-${index}`} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span>
              {payment.method}
              {" | "}
              {payment.currency}
              {" | "}
              {payment.amount.toFixed(4)}
            </span>
            <button
              type="button"
              onClick={() => removePayment(index)}
              style={{ color: "#b91c1c", padding: "2px 6px" }}
            >
              X
            </button>
          </li>
        ))}
      </ul>
      {restoredSourceLocalId ? (
        <p>
          Origen suspendido activo:
          {" "}
          <strong>{restoredSourceLocalId.slice(0, 8)}</strong>
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() =>
            openBox({
              warehouseLocalId,
              openingAmount: Number(openingAmount)
            })
          }
          disabled={Boolean(openBoxSession)}
        >
          Abrir caja
        </button>
        <button
          type="button"
          onClick={async () => {
            await createSuspendedSale({
              warehouseLocalId,
              cart
            });
            setCart([]);
            setRestoredSourceLocalId(null);
          }}
        >
          Suspender venta
        </button>
        <button
          type="button"
          onClick={async () => {
            const saleInput = {
              warehouseLocalId,
              currency: saleCurrency,
              exchangeRate: safeExchangeRate,
              subtotal,
              taxTotal: 0,
              discountTotal: 0,
              total: subtotal,
              items: cart,
              payments
            };
            if (restoredSourceLocalId) {
              Object.assign(saleInput, { suspendedSourceLocalId: restoredSourceLocalId });
            }
            await createPosSale(saleInput);
            setCart([]);
            setPayments([]);
            setRestoredSourceLocalId(null);
          }}
        >
          Finalizar venta
        </button>
        <button
          type="button"
          onClick={() =>
            closeBox({
              warehouseLocalId,
              countedAmount: subtotal
            })
          }
          disabled={!openBoxSession}
        >
          Cerrar caja
        </button>
      </div>
      {openBoxSession ? (
        <p>
          Caja abierta:
          {" "}
          <strong>
            {openBoxSession.localId.slice(0, 8)}
            {" | apertura "}
            {openBoxSession.openingAmount.toFixed(4)}
          </strong>
        </p>
      ) : (
        <p>Sin caja abierta para esta bodega.</p>
      )}

      <h3>Ventas completadas</h3>
      <ul>
        {state.sales.map((sale) => (
          <li key={sale.localId}>
            {sale.localId.slice(0, 8)}
            {" | "}
            {sale.warehouseLocalId}
            {" | "}
            {sale.total.toFixed(4)}
          </li>
        ))}
      </ul>

      <h3>Ventas suspendidas</h3>
      <ul>
        {state.suspendedSales.map((sale) => (
          <li key={sale.localId}>
            {sale.localId.slice(0, 8)}
            {" | "}
            {sale.status}
            {" "}
            {(sale.status === "open" || sale.status === "resumed") ? (
              <button
                type="button"
                onClick={async () => {
                  const restored = await restoreSuspendedSale(sale.localId);
                  if (!restored) {
                    return;
                  }
                  setWarehouseLocalId(restored.warehouseLocalId);
                  setCart(restored.cart);
                  setRestoredSourceLocalId(restored.sourceLocalId);
                }}
                style={{ marginLeft: "8px" }}
              >
                Restaurar
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <h3>Cierres de caja</h3>
      <ul>
        {state.boxClosings.map((closing) => (
          <li key={closing.localId}>
            {closing.localId.slice(0, 8)}
            {" | "}
            {closing.status}
            {" | diff "}
            {(closing.differenceAmount ?? 0).toFixed(4)}
          </li>
        ))}
      </ul>
    </section>
  );
}
