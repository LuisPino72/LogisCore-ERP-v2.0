/**
 * Componente principal del panel de inventario.
 * Orchestrates la carga de datos y subscripción a eventos del bus de eventos.
 * Escucha eventos de inventario para actualizar automáticamente la vista.
 */

import { useEffect } from "react";
import { eventBus } from "@/lib/core/runtime";
import type { Product } from "@/features/products/types/products.types";
import { InventoryForm } from "./InventoryForm";
import { InventoryList } from "./InventoryList";
import { useInventory } from "../hooks/useInventory";
import type { InventoryActorContext } from "../types/inventory.types";

interface InventoryPanelProps {
  tenantSlug: string;
  actor: InventoryActorContext;
  products: Product[];
}

export function InventoryPanel({ tenantSlug, actor, products }: InventoryPanelProps) {
  const {
    state,
    refresh,
    createWarehouse,
    createProductSizeColor,
    recordStockMovement,
    createInventoryCount,
    postInventoryCount,
    evaluateReorder
  } = useInventory({
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offWarehouse = eventBus.on("INVENTORY.WAREHOUSE_CREATED", () => {
      void refresh();
    });
    const offMovement = eventBus.on("INVENTORY.STOCK_MOVEMENT_RECORDED", () => {
      void refresh();
    });
    const offCountCreated = eventBus.on("INVENTORY.COUNT_CREATED", () => {
      void refresh();
    });
    const offCountPosted = eventBus.on("INVENTORY.COUNT_POSTED", () => {
      void refresh();
    });
    const offSizeColor = eventBus.on("INVENTORY.SIZE_COLOR_CREATED", () => {
      void refresh();
    });

    return () => {
      offWarehouse();
      offMovement();
      offCountCreated();
      offCountPosted();
      offSizeColor();
    };
  }, [refresh]);

  return (
    <section style={{ marginTop: "16px" }}>
      {state.lastError ? (
        <p style={{ color: "#b91c1c" }}>{state.lastError.message}</p>
      ) : null}
      <InventoryForm
        products={products}
        warehouses={state.warehouses}
        counts={state.counts}
        onCreateWarehouse={createWarehouse}
        onCreateSizeColor={createProductSizeColor}
        onRecordMovement={recordStockMovement}
        onCreateCount={createInventoryCount}
        onPostCount={postInventoryCount}
      />
      <div style={{ marginTop: "12px" }}>
        <button
          type="button"
          onClick={() => {
            void evaluateReorder({ minStock: 5, targetStock: 15 });
          }}
        >
          Evaluar reorden automatico
        </button>
      </div>
      <InventoryList
        warehouses={state.warehouses}
        movements={state.movements}
        counts={state.counts}
        sizeColors={state.sizeColors}
        balances={state.balances}
        reorderSuggestions={state.reorderSuggestions}
      />
    </section>
  );
}
