import { useMemo } from "react";
import type { Product } from "@/features/products/types/products.types";
import type { Recipe } from "../types/production.types";
import { DataTable } from "@/common/components/DataTable";
import { Badge } from "@/common/components/Badge";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Plus, Beaker } from "lucide-react";

interface RecipesTabProps {
  recipes: Recipe[];
  products: Product[];
  isLoading: boolean;
  onCreateRecipe: () => void;
}

export function RecipesTab({
  recipes,
  products,
  isLoading,
  onCreateRecipe,
}: RecipesTabProps) {
  const getProductName = (localId: string) => {
    return products.find((p) => p.localId === localId)?.name || localId.slice(0, 8);
  };

  const hasWeightedIngredients = (recipe: Recipe) => {
    return recipe.ingredients.some((i) => i.isWeighted === true);
  };

  const columns = useMemo(() => [
    {
      key: "name",
      header: "Receta",
      render: (_: unknown, row: Recipe) => (
        <div className="font-medium text-content-primary">{row.name}</div>
      ),
    },
    {
      key: "productLocalId",
      header: "Producto",
      render: (_: unknown, row: Recipe) => (
        <span className="text-content-secondary">{getProductName(row.productLocalId)}</span>
      ),
    },
    {
      key: "yieldQty",
      header: "Rendimiento",
      align: "right",
      render: (value: unknown) => (
        <span className="font-mono text-sm">{Number(value).toFixed(4)}</span>
      ),
    },
    {
      key: "ingredients",
      header: "Ingredientes",
      align: "center",
      render: (_: unknown, row: Recipe) => (
        <span className="text-content-secondary">{row.ingredients.length}</span>
      ),
    },
    {
      key: "isWeighted",
      header: "Pesables",
      align: "center",
      render: (_: unknown, row: Recipe) =>
        hasWeightedIngredients(row) ? (
          <Badge variant="warning">Sí</Badge>
        ) : (
          <Badge variant="default">No</Badge>
        ),
    },
  ], [products, getProductName, hasWeightedIngredients]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary">Recetas (BOM)</h3>
        <button onClick={onCreateRecipe} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Nueva Receta
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Cargando recetas..." />
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={<Beaker className="w-12 h-12 text-content-tertiary" />}
          title="No hay recetas"
          description="Crea tu primera receta para comenzar a gestionar tu producción."
          action={
            <button onClick={onCreateRecipe} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Crear Receta
            </button>
          }
        />
      ) : (
        <DataTable columns={columns as never} data={recipes} emptyMessage="No hay recetas disponibles" />
      )}
    </div>
  );
}
