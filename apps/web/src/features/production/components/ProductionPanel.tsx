/**
 * Panel Maestro de Producción MRP.
 * Gestiona el ciclo completo: Recetas (BOM), Órdenes y Trazabilidad.
 */

import { useEffect, useState, useMemo } from "react";
import type { Product } from "@/features/products/types/products.types";
import type { ProductionActorContext, ProductionOrder, CreateRecipeInput, CreateProductionOrderInput } from "../types/production.types";
import { eventBus } from "@/lib/core/runtime";
import { useProduction } from "../hooks/useProduction";
import { productionService } from "../services/production.service.instance";
import { KpiHeader } from "./KpiHeader";
import { RecipesTab } from "./RecipesTab";
import { ProductionOrdersTab } from "./ProductionOrdersTab";
import { ProductionLogsTab } from "./ProductionLogsTab";
import { NewRecipeModal } from "./NewRecipeModal";
import { NewOrderModal } from "./NewOrderModal";
import { CompleteOrderModal } from "./CompleteOrderModal";
import { Tabs } from "@/common/components/Tabs";
import { AlertCircle } from "lucide-react";

interface ProductionPanelProps {
  tenantSlug: string;
  actor: ProductionActorContext;
  products: Product[];
  warehouses?: { localId: string; name: string }[];
}

const defaultWarehouses = [
  { localId: "default-warehouse", name: "Bodega Principal" },
];

export function ProductionPanel({ tenantSlug, actor, products, warehouses = defaultWarehouses }: ProductionPanelProps) {
  const [, setActiveTab] = useState("orders");
  const [showNewRecipeModal, setShowNewRecipeModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const {
    state,
    refresh,
    createRecipe,
    createProductionOrder,
    startProductionOrder,
    completeProductionOrder
  } = useProduction({
    service: productionService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = eventBus.on("PRODUCTION.ORDER_CREATED", () => void refresh());
    const offStarted = eventBus.on("PRODUCTION.STARTED", () => void refresh());
    const offCompleted = eventBus.on("PRODUCTION.COMPLETED", () => void refresh());
    return () => {
      offCreated();
      offStarted();
      offCompleted();
    };
  }, [refresh]);

  const selectedRecipe = useMemo(() => {
    if (!selectedOrder) return undefined;
    return state.recipes.find((r) => r.localId === selectedOrder.recipeLocalId);
  }, [selectedOrder, state.recipes]);

  const handleCreateRecipe = async (input: CreateRecipeInput) => {
    const result = await createRecipe(input);
    if (result) {
      setShowNewRecipeModal(false);
    }
  };

  const handleCreateOrder = async (recipeLocalId: string, warehouseLocalId: string, plannedQty: number) => {
    const input: CreateProductionOrderInput = {
      recipeLocalId,
      warehouseLocalId,
      plannedQty,
    };
    const result = await createProductionOrder(input);
    if (result) {
      setShowNewOrderModal(false);
    }
  };

  const handleStartOrder = async (orderLocalId: string) => {
    await startProductionOrder({ productionOrderLocalId: orderLocalId });
  };

  const handleCompleteOrder = async (producedQty: number) => {
    if (!selectedOrder) return;
    await completeProductionOrder({
      productionOrderLocalId: selectedOrder.localId,
      producedQty,
    });
    setSelectedOrder(null);
  };

  const tabs = useMemo(() => [
    {
      id: "orders",
      label: "Órdenes",
      content: (
        <ProductionOrdersTab
          orders={state.orders}
          recipes={state.recipes}
          warehouses={warehouses}
          isLoading={state.isLoading}
          onStartOrder={handleStartOrder}
          onCompleteOrder={setSelectedOrder}
          onCreateOrder={() => setShowNewOrderModal(true)}
          isSubmitting={state.isSubmitting}
        />
      ),
    },
    {
      id: "recipes",
      label: "Recetas",
      content: (
        <RecipesTab
          recipes={state.recipes}
          products={products}
          isLoading={state.isLoading}
          onCreateRecipe={() => setShowNewRecipeModal(true)}
        />
      ),
    },
    {
      id: "logs",
      label: "Historial",
      content: (
        <ProductionLogsTab
          logs={state.logs}
          recipes={state.recipes}
          products={products}
          isLoading={state.isLoading}
        />
      ),
    },
  ], [state, products, warehouses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">Producción MRP</h1>
        <p className="text-content-secondary mt-1">
          Gestiona recetas, órdenes y trazabilidad de producción
        </p>
      </div>

      <KpiHeader
        orders={state.orders}
        logs={state.logs}
        recipes={state.recipes}
      />

      {state.lastError && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{state.lastError.message}</p>
          </div>
        </div>
      )}

      <Tabs
        items={tabs}
        defaultTab="orders"
        onChange={setActiveTab}
        variant="underline"
      />

      <NewRecipeModal
        isOpen={showNewRecipeModal}
        onClose={() => setShowNewRecipeModal(false)}
        products={products}
        onSubmit={handleCreateRecipe}
        isSubmitting={state.isSubmitting}
      />

      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        recipes={state.recipes}
        products={products}
        warehouses={warehouses}
        onSubmit={handleCreateOrder}
        isSubmitting={state.isSubmitting}
      />

      <CompleteOrderModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        recipe={selectedRecipe}
        products={products}
        onSubmit={handleCompleteOrder}
        isSubmitting={state.isSubmitting}
      />
    </div>
  );
}
