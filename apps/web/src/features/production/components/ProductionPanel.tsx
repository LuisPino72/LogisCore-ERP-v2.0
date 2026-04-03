/**
 * Componente principal del panel de producción MRP.
 * Gestiona la creación de recetas (BOM), órdenes de producción,
 * e inicio/completado de órdenes. Escucha eventos del bus para actualización automática.
 */

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/features/products/types/products.types";
import { eventBus } from "@/lib/core/runtime";
import { useProduction } from "../hooks/useProduction";
import { productionService } from "../services/production.service.instance";
import type { ProductionActorContext, RecipeIngredient } from "../types/production.types";

interface ProductionPanelProps {
  tenantSlug: string;
  actor: ProductionActorContext;
  products: Product[];
}

export function ProductionPanel({ tenantSlug, actor, products }: ProductionPanelProps) {
  const [recipeProductLocalId, setRecipeProductLocalId] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [recipeYieldQty, setRecipeYieldQty] = useState("1");
  const [ingredientProductLocalId, setIngredientProductLocalId] = useState("");
  const [ingredientQty, setIngredientQty] = useState("1");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedRecipeLocalId, setSelectedRecipeLocalId] = useState("");
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [plannedQty, setPlannedQty] = useState("1");
  const [producedQtyByOrder, setProducedQtyByOrder] = useState<Record<string, string>>({});

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
    const offCreated = eventBus.on("PRODUCTION.ORDER_CREATED", () => {
      void refresh();
    });
    const offStarted = eventBus.on("PRODUCTION.STARTED", () => {
      void refresh();
    });
    const offCompleted = eventBus.on("PRODUCTION.COMPLETED", () => {
      void refresh();
    });
    return () => {
      offCreated();
      offStarted();
      offCompleted();
    };
  }, [refresh]);

  const selectedRecipe = useMemo(
    () => state.recipes.find((item) => item.localId === selectedRecipeLocalId),
    [selectedRecipeLocalId, state.recipes]
  );

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "12px",
        marginTop: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Produccion MRP</h2>
      {state.lastError ? <p className="text-red-700">{state.lastError.message}</p> : null}

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <h3 style={{ margin: 0 }}>Crear receta</h3>
        <select
          value={recipeProductLocalId}
          onChange={(event) => setRecipeProductLocalId(event.target.value)}
        >
          <option value="">Producto terminado</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          value={recipeName}
          onChange={(event) => setRecipeName(event.target.value)}
          placeholder="Nombre receta"
        />
        <input
          type="number"
          min="0.0001"
          step="0.0001"
          value={recipeYieldQty}
          onChange={(event) => setRecipeYieldQty(event.target.value)}
          placeholder="Rendimiento"
        />

        <div style={{ display: "grid", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
          <strong>Ingredientes</strong>
          <select
            value={ingredientProductLocalId}
            onChange={(event) => setIngredientProductLocalId(event.target.value)}
          >
            <option value="">Producto ingrediente</option>
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
            value={ingredientQty}
            onChange={(event) => setIngredientQty(event.target.value)}
            placeholder="Cantidad ingrediente"
          />
          <button
            type="button"
            onClick={() => {
              if (!ingredientProductLocalId) {
                return;
              }
              setRecipeIngredients((previous) => [
                ...previous,
                {
                  productLocalId: ingredientProductLocalId,
                  requiredQty: Number(ingredientQty)
                }
              ]);
            }}
          >
            Agregar ingrediente
          </button>
          <ul>
            {recipeIngredients.map((ingredient, index) => (
              <li key={`${ingredient.productLocalId}-${index}`}>
                {ingredient.productLocalId} | {ingredient.requiredQty.toFixed(4)}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={async () => {
            const created = await createRecipe({
              productLocalId: recipeProductLocalId,
              name: recipeName,
              yieldQty: Number(recipeYieldQty),
              ingredients: recipeIngredients
            });
            if (created) {
              setRecipeProductLocalId("");
              setRecipeName("");
              setRecipeYieldQty("1");
              setRecipeIngredients([]);
            }
          }}
        >
          Guardar receta
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <h3 style={{ margin: 0 }}>Crear orden de produccion</h3>
        <select
          value={selectedRecipeLocalId}
          onChange={(event) => setSelectedRecipeLocalId(event.target.value)}
        >
          <option value="">Seleccionar receta</option>
          {state.recipes.map((recipe) => (
            <option key={recipe.localId} value={recipe.localId}>
              {recipe.name}
            </option>
          ))}
        </select>
        <input
          value={warehouseLocalId}
          onChange={(event) => setWarehouseLocalId(event.target.value)}
          placeholder="Warehouse localId"
        />
        <input
          type="number"
          min="0.0001"
          step="0.0001"
          value={plannedQty}
          onChange={(event) => setPlannedQty(event.target.value)}
          placeholder="Cantidad planificada"
        />
        {selectedRecipe ? (
          <p style={{ margin: 0 }}>
            Receta: <strong>{selectedRecipe.name}</strong>
          </p>
        ) : null}
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={() => {
            void createProductionOrder({
              recipeLocalId: selectedRecipeLocalId,
              warehouseLocalId,
              plannedQty: Number(plannedQty)
            });
          }}
        >
          Crear orden
        </button>
      </div>

      <h3>Ordenes</h3>
      <ul>
        {state.orders.map((order) => (
          <li key={order.localId}>
            {order.localId.slice(0, 8)} | {order.status} | plan {order.plannedQty.toFixed(4)}
            {order.status === "draft" ? (
              <button
                type="button"
                onClick={() => {
                  void startProductionOrder({ productionOrderLocalId: order.localId });
                }}
                style={{ marginLeft: "8px" }}
              >
                Iniciar
              </button>
            ) : null}
            {order.status === "in_progress" ? (
              <>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={producedQtyByOrder[order.localId] ?? String(order.plannedQty)}
                  onChange={(event) =>
                    setProducedQtyByOrder((prev) => ({
                      ...prev,
                      [order.localId]: event.target.value
                    }))
                  }
                  style={{ width: "120px", marginLeft: "8px" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    void completeProductionOrder({
                      productionOrderLocalId: order.localId,
                      producedQty: Number(
                        producedQtyByOrder[order.localId] ?? String(order.plannedQty)
                      )
                    });
                  }}
                  style={{ marginLeft: "8px" }}
                >
                  Completar
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      <h3>Logs de produccion</h3>
      <ul>
        {state.logs.map((log) => (
          <li key={log.localId}>
            {log.localId.slice(0, 8)} | orden {log.productionOrderLocalId.slice(0, 8)} | prod {" "}
            {log.producedQty.toFixed(4)} | var {log.variancePercent.toFixed(2)}%
          </li>
        ))}
      </ul>
    </section>
  );
}
