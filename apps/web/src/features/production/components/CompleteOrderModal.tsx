import { useState, useMemo } from "react";
import type { ProductionOrder, Recipe } from "../types/production.types";
import type { Product } from "@/features/products/types/products.types";
import { Modal } from "@/common/components/Modal";
import { Badge } from "@/common/components/Badge";
import { AlertTriangle, Scale, Package } from "lucide-react";

interface CompleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  recipe: Recipe | undefined;
  products: Product[];
  onSubmit: (producedQty: number) => Promise<void>;
  isSubmitting: boolean;
}

export function CompleteOrderModal({
  isOpen,
  onClose,
  order,
  recipe,
  products,
  onSubmit,
  isSubmitting,
}: CompleteOrderModalProps) {
  const [producedQty, setProducedQty] = useState("");

  const scaledIngredients = useMemo(() => {
    if (!order || !recipe) return [];
    const factor = order.plannedQty / recipe.yieldQty;
    return recipe.ingredients.map((ing) => ({
      ...ing,
      requiredQty: Number((ing.requiredQty * factor).toFixed(4)),
    }));
  }, [order, recipe]);

  const handleSubmit = async () => {
    if (!order || !producedQty || Number(producedQty) <= 0) return;
    await onSubmit(Number(producedQty));
    setProducedQty("");
    onClose();
  };

  const getProductName = (localId: string) => {
    return products.find((p) => p.localId === localId)?.name || localId.slice(0, 8);
  };

  const variance = useMemo(() => {
    if (!order || !producedQty) return 0;
    return Number(
      (((Number(producedQty) - order.plannedQty) / order.plannedQty) * 100).toFixed(2)
    );
  }, [order, producedQty]);

  const varianceClass = useMemo(() => {
    if (variance > 5) return "text-state-error";
    if (variance > 0) return "text-state-warning";
    if (variance < -5) return "text-state-error";
    return "text-state-success";
  }, [variance]);

  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completar Orden de Producción"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!producedQty || Number(producedQty) <= 0 || isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? "Completando..." : "Completar Orden"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-surface-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-content-tertiary">Orden:</span>
              <span className="font-mono ml-2">{order.localId.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-content-tertiary">Receta:</span>
              <span className="font-medium ml-2">{recipe?.name || "—"}</span>
            </div>
            <div>
              <span className="text-content-tertiary">Planificado:</span>
              <span className="font-mono ml-2">{order.plannedQty.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-content-tertiary">Producto:</span>
              <span className="ml-2">{getProductName(recipe?.productLocalId || "")}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <Package className="w-4 h-4" />
            Cantidad Producida
          </label>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={producedQty}
            onChange={(e) => setProducedQty(e.target.value)}
            placeholder="Ingrese la cantidad produced"
            className="input"
          />
          {producedQty && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-content-tertiary">Varianza:</span>
              <span className={`font-mono text-sm font-medium ${varianceClass}`}>
                {variance > 0 ? "+" : ""}{variance}%
              </span>
              {Math.abs(variance) > 5 && (
                <Badge variant="error">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Alerta
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-surface-200 pt-4">
          <label className="label flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Ingredientes a Consumir
          </label>
          <div className="space-y-2 mt-2">
            {scaledIngredients.map((ing, index) => (
              <div
                key={`${ing.productLocalId}-${index}`}
                className="flex items-center justify-between bg-surface-50 px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {getProductName(ing.productLocalId)}
                  </span>
                  {ing.isWeighted && (
                    <Badge variant="warning">
                      <Scale className="w-3 h-3 mr-1" />
                      Pesable
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-sm">
                  {ing.requiredQty.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-state-info shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Al completar esta orden se registrará la salida de los ingredientes del inventario
            y la entrada del producto terminado. Verifique que el stock sea suficiente.
          </p>
        </div>
      </div>
    </Modal>
  );
}
