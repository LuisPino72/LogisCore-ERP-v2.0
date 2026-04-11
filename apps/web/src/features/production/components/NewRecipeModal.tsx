import { useState, useMemo } from "react";
import type { Product } from "@/features/products/types/products.types";
import type { CreateRecipeInput } from "../types/production.types";
import { Modal } from "@/common/components/Modal";
import { Badge } from "@/common/components/Badge";
import { FormField, Select, Input } from "@/common";
import { Plus, X, Beaker, Scale } from "lucide-react";

interface IngredientInput {
  productLocalId: string;
  requiredQty: number;
  isWeighted: boolean;
}

interface NewRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSubmit: (input: CreateRecipeInput) => Promise<void>;
  isSubmitting: boolean;
}

export function NewRecipeModal({
  isOpen,
  onClose,
  products,
  onSubmit,
  isSubmitting,
}: NewRecipeModalProps) {
  const [productLocalId, setProductLocalId] = useState("");
  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState("1");
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [ingredientProductId, setIngredientProductId] = useState("");
  const [ingredientQty, setIngredientQty] = useState("1");
  const [isWeighted, setIsWeighted] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      productLocalId.trim() &&
      name.trim() &&
      Number(yieldQty) > 0 &&
      ingredients.length > 0 &&
      ingredients.every((i) => i.requiredQty > 0 && i.productLocalId.trim())
    );
  }, [productLocalId, name, yieldQty, ingredients]);

  const handleAddIngredient = () => {
    if (!ingredientProductId || Number(ingredientQty) <= 0) return;

    const qty = isWeighted
      ? Number(Number(ingredientQty).toFixed(4))
      : Number(ingredientQty);

    setIngredients((prev) => [
      ...prev,
      {
        productLocalId: ingredientProductId,
        requiredQty: qty,
        isWeighted,
      },
    ]);
    setIngredientProductId("");
    setIngredientQty("1");
    setIsWeighted(false);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    const input: CreateRecipeInput = {
      productLocalId,
      name: name.trim(),
      yieldQty: Number(yieldQty),
      ingredients: ingredients.map((i) => {
        const ing: { productLocalId: string; requiredQty: number; isWeighted?: boolean } = {
          productLocalId: i.productLocalId,
          requiredQty: i.isWeighted ? Number(i.requiredQty.toFixed(4)) : i.requiredQty,
        };
        if (i.isWeighted) {
          ing.isWeighted = true;
        }
        return ing;
      }),
    };

    await onSubmit(input);

    setProductLocalId("");
    setName("");
    setYieldQty("1");
    setIngredients([]);
    onClose();
  };

  const getProductName = (localId: string) => {
    return products.find((p) => p.localId === localId)?.name || localId.slice(0, 8);
  };

  const availableIngredients = useMemo(() => {
    return products.filter((p) => p.localId !== productLocalId);
  }, [products, productLocalId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Receta (BOM)"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? "Guardando..." : "Guardar Receta"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Producto Terminado" htmlFor="productLocalId" required>
          <Select
            value={productLocalId}
            onChange={(value) => setProductLocalId(String(value))}
            options={products.map(p => ({ value: p.localId, label: p.name }))}
            placeholder="Seleccionar producto..."
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nombre de la Receta" htmlFor="recipeName" required>
            <Input
              id="recipeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pan Francés Grande"
            />
          </FormField>
          <FormField label="Rendimiento (qty)" htmlFor="yieldQty" required>
            <Input
              id="yieldQty"
              type="number"
              min="0.0001"
              step="0.0001"
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
            />
          </FormField>
        </div>

        <div className="border-t border-surface-200 pt-4">
          <label className="label flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Ingredientes
          </label>

          <div className="grid grid-cols-12 gap-2 mb-3">
            <div className="col-span-5">
              <select
                value={ingredientProductId}
                onChange={(e) => setIngredientProductId(e.target.value)}
                className="input"
              >
                <option value="">Producto...</option>
                {availableIngredients.map((p) => (
                  <option key={p.localId} value={p.localId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                min="0.0001"
                step={isWeighted ? "0.0001" : "0.01"}
                value={ingredientQty}
                onChange={(e) => setIngredientQty(e.target.value)}
                className="input"
              />
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWeighted}
                  onChange={(e) => setIsWeighted(e.target.checked)}
                  className="rounded"
                />
                <Scale className="w-3 h-3" />
                Pesable
              </label>
            </div>
            <div className="col-span-1">
              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={!ingredientProductId || Number(ingredientQty) <= 0}
                className="btn btn-secondary p-2"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {ingredients.length > 0 && (
            <div className="space-y-2 mt-3">
              {ingredients.map((ing, index) => (
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
                        4 decimals
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {ing.requiredQty.toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-state-error hover:bg-red-50 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ingredients.length === 0 && (
            <p className="text-sm text-content-tertiary text-center py-4">
              Agrega al menos un ingrediente
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
