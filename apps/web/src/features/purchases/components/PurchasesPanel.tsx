/**
 * Componente principal del panel de compras.
 * Permite crear órdenes de compra, recibir compras y gestionar lotes de inventario.
 * Escucha eventos del bus para actualización automática.
 */

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/features/products/types/products.types";
import { eventBus } from "@/lib/core/runtime";
import { usePurchases } from "../hooks/usePurchases";
import { purchasesService } from "../services/purchases.service.instance";
import type { PurchaseItem, PurchasesActorContext } from "../types/purchases.types";

interface PurchasesPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
  products: Product[];
}

export function PurchasesPanel({ tenantSlug, actor, products }: PurchasesPanelProps) {
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [productLocalId, setProductLocalId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const { state, refresh, createPurchase, receivePurchase } = usePurchases({
    service: purchasesService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = eventBus.on("PURCHASE.CREATED", () => {
      void refresh();
    });
    const offReceived = eventBus.on("PURCHASE.RECEIVED", () => {
      void refresh();
    });
    return () => {
      offCreated();
      offReceived();
    };
  }, [refresh]);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.qty * item.unitCost, 0),
    [items]
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
      <h2 style={{ marginTop: 0 }}>Compras y Recepciones</h2>
      {state.lastError ? (
        <p style={{ color: "#b91c1c" }}>{state.lastError.message}</p>
      ) : null}

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <input
          value={warehouseLocalId}
          onChange={(event) => setWarehouseLocalId(event.target.value)}
          placeholder="Warehouse localId"
        />
        <input
          value={supplierName}
          onChange={(event) => setSupplierName(event.target.value)}
          placeholder="Proveedor"
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
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
          placeholder="Costo unitario"
        />
        <button
          type="button"
          onClick={() => {
            if (!productLocalId) {
              return;
            }
            setItems((previous) => [
              ...previous,
              {
                productLocalId,
                qty: Number(qty),
                unitCost: Number(unitCost)
              }
            ]);
          }}
        >
          Agregar item
        </button>
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={async () => {
            const input = {
              warehouseLocalId,
              items
            };
            if (supplierName.trim()) {
              Object.assign(input, { supplierName: supplierName.trim() });
            }
            const created = await createPurchase(input);
            if (created) {
              setItems([]);
              setSupplierName("");
            }
          }}
        >
          Crear compra
        </button>
      </div>

      <p>
        Total compra: <strong>{total.toFixed(4)}</strong>
      </p>

      <ul>
        {items.map((item, index) => (
          <li key={`${item.productLocalId}-${index}`}>
            {item.productLocalId} | {item.qty.toFixed(4)} x {item.unitCost.toFixed(4)}
          </li>
        ))}
      </ul>

      <h3>Compras</h3>
      <ul>
        {state.purchases.map((purchase) => (
          <li key={purchase.localId}>
            {purchase.localId.slice(0, 8)} | {purchase.status} | {purchase.total.toFixed(4)}
            {purchase.status === "draft" ? (
              <button
                type="button"
                onClick={() => {
                  void receivePurchase({ purchaseLocalId: purchase.localId });
                }}
                style={{ marginLeft: "8px" }}
              >
                Recibir
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <h3>Recepciones</h3>
      <ul>
        {state.receivings.map((receiving) => (
          <li key={receiving.localId}>
            {receiving.localId.slice(0, 8)} | {receiving.purchaseLocalId.slice(0, 8)} |{" "}
            {receiving.totalCost.toFixed(4)}
          </li>
        ))}
      </ul>

      <h3>Lotes de inventario</h3>
      <ul>
        {state.inventoryLots.map((lot) => (
          <li key={lot.localId}>
            {lot.localId.slice(0, 8)} | {lot.productLocalId} | {lot.quantity.toFixed(4)}
          </li>
        ))}
      </ul>
    </section>
  );
}
