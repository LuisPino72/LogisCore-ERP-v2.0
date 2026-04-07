import { SearchInput } from "@/common/components/SearchInput";
import { Select } from "@/common/components/Select";
import type { Category } from "../types/products.types";

export interface ProductsFiltersState {
  search: string;
  categoryId: string;
  visible: "all" | "visible" | "hidden";
  taxable: "all" | "taxable" | "non-taxable";
}

interface ProductsFiltersProps {
  categories: Category[];
  filters: ProductsFiltersState;
  onChange: (filters: ProductsFiltersState) => void;
}

const VISIBILITY_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Oculto" }
];

const TAXABLE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "taxable", label: "Gravable" },
  { value: "non-taxable", label: "No gravable" }
];

export function ProductsFilters({ categories, filters, onChange }: ProductsFiltersProps) {
  const handleSearchChange = (value: string) => {
    onChange({ ...filters, search: value });
  };

  const handleCategoryChange = (value: string | number) => {
    onChange({ ...filters, categoryId: String(value) });
  };

  const handleVisibilityChange = (value: string | number) => {
    onChange({ ...filters, visible: String(value) as ProductsFiltersState["visible"] });
  };

  const handleTaxableChange = (value: string | number) => {
    onChange({ ...filters, taxable: String(value) as ProductsFiltersState["taxable"] });
  };

  const categoryOptions = [
    { value: "", label: "Todas las categorías" },
    ...categories.map(c => ({ value: c.localId, label: c.name }))
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-4 p-4 bg-surface-50 rounded-lg border border-surface-200">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Buscar por SKU o nombre..."
        />
      </div>
      <div className="w-[180px]">
        <Select
          value={filters.categoryId}
          onChange={handleCategoryChange}
          options={categoryOptions}
        />
      </div>
      <div className="w-[140px]">
        <Select
          value={filters.visible}
          onChange={handleVisibilityChange}
          options={VISIBILITY_OPTIONS}
        />
      </div>
      <div className="w-[140px]">
        <Select
          value={filters.taxable}
          onChange={handleTaxableChange}
          options={TAXABLE_OPTIONS}
        />
      </div>
    </div>
  );
}
