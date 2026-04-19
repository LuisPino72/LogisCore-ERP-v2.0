import { useState, useMemo } from "react";
import type { Recipe } from "../types/production.types";
import type { Product } from "@/features/products/types/products.types";
import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import { Badge } from "@/common/components/Badge";
import { FormField, Select, Input } from "@/common";
import { Scale } from "lucide-react";

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  products: Product[];
  warehouses: { localId: string; name: string }[];
  onSubmit: (recipeLocalId: string, warehouseLocalId: string, plannedQty: number) => Promise<void>;
  isSubmitting: boolean;
}

export function NewOrderModal({
  isOpen,
  onClose,
  recipes,
  products,
  warehouses,
  onSubmit,
  isSubmitting,
}: NewOrderModalProps) {
  const [recipeLocalId, setRecipeLocalId] = useState("");
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [plannedQty, setPlannedQty] = useState("1");

  const selectedRecipe = useMemo(() => {
    return recipes.find((r) => r.localId === recipeLocalId);
  }, [recipes, recipeLocalId]);

  const getProductName = (localId: string) => {
    return products.find((p) => p.localId === localId)?.name || localId.slice(0, 8);
  };

  const canSubmit = useMemo(() => {
    return (
      recipeLocalId.trim() &&
      warehouseLocalId.trim() &&
      Number(plannedQty) > 0
    );
  }, [recipeLocalId, warehouseLocalId, plannedQty]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    await onSubmit(recipeLocalId, warehouseLocalId, Number(plannedQty));
    setRecipeLocalId("");
    setWarehouseLocalId("");
    setPlannedQty("1");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Orden de Producción"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear Orden"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Receta (BOM)" htmlFor="recipeLocalId" required>
          <Select
            value={recipeLocalId}
            onChange={(value) => setRecipeLocalId(String(value))}
            options={recipes.map(r => ({ value: r.localId, label: `${r.name} (${getProductName(r.productLocalId)})` }))}
            placeholder="Seleccionar receta..."
          />
        </FormField>

        {selectedRecipe && (
          <div className="bg-surface-50 p-3 rounded-lg">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Producto:</span>
                <span>{getProductName(selectedRecipe.productLocalId)}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Rendimiento:</span>
                <span className="font-mono">{selectedRecipe.yieldQty.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Ingredientes:</span>
                <span>{selectedRecipe.ingredients.length}</span>
                {selectedRecipe.ingredients.some((i) => i.isWeighted) && (
                  <Badge variant="warning">
                    <Scale className="w-3 h-3 mr-1" />
                    Con pesables
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <FormField label="Bodega" htmlFor="warehouseLocalId" required>
          <Select
            value={warehouseLocalId}
            onChange={(value) => setWarehouseLocalId(String(value))}
            options={warehouses.map(w => ({ value: w.localId, label: w.name }))}
            placeholder="Seleccionar bodega..."
          />
        </FormField>

        <FormField label="Cantidad Planificada" htmlFor="plannedQty" required>
          <Input
            id="plannedQty"
            type="number"
            min="0.0001"
            step="0.0001"
            value={plannedQty}
            onChange={(e) => setPlannedQty(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}
