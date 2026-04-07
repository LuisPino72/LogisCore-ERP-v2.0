import { useEffect, useState, useMemo } from "react";
import { Box, Folder, Scale, Shirt } from "lucide-react";
import { eventBus } from "@/lib/core/runtime";
import { useProducts } from "../hooks/useProducts";
import { productsService } from "../services/products.service.instance";
import type { ProductsActorContext, Product } from "../types/products.types";
import { exchangeRatesService } from "@/features/exchange-rates/services/exchange-rates.service.instance";
import { Tabs } from "@/common/components/Tabs";
import { KPIHeader } from "./KPIHeader";
import { ProductsDataTable } from "./ProductsDataTable";
import { ProductsFilters, type ProductsFiltersState } from "./ProductsFilters";
import { EmptyState } from "@/common/components/EmptyState";

const DEFAULT_EXCHANGE_RATE = 480;

interface ProductsCatalogProps {
  tenantSlug: string;
  actor: ProductsActorContext;
}

export function ProductsCatalog({ tenantSlug, actor }: ProductsCatalogProps) {
  const { state, refresh } = useProducts({
    service: productsService,
    tenant: { tenantSlug },
    actor
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [filters, setFilters] = useState<ProductsFiltersState>({
    search: "",
    categoryId: "",
    visible: "all",
    taxable: "all"
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const loadExchangeRate = async () => {
      const rateResult = await exchangeRatesService.getActiveRate(
        tenantSlug,
        "USD",
        "VES"
      );
      if (rateResult.ok && rateResult.data) {
        setExchangeRate(rateResult.data.rate);
      }
    };
    loadExchangeRate();
  }, [tenantSlug]);

  useEffect(() => {
    const offCreatedCategory = eventBus.on("CATALOG.CATEGORY_CREATED", () => {
      void refresh();
    });
    const offCreatedProduct = eventBus.on("CATALOG.PRODUCT_CREATED", () => {
      void refresh();
    });
    const offCreatedPresentation = eventBus.on(
      "CATALOG.PRESENTATION_CREATED",
      () => {
        void refresh();
      }
    );
    const offDeletedCategory = eventBus.on("CATALOG.CATEGORY_DELETED", () => {
      void refresh();
    });
    const offDeletedProduct = eventBus.on("CATALOG.PRODUCT_DELETED", () => {
      void refresh();
    });

    return () => {
      offCreatedCategory();
      offCreatedProduct();
      offCreatedPresentation();
      offDeletedCategory();
      offDeletedProduct();
    };
  }, [refresh]);

  const filteredProducts = useMemo(() => {
    let products = state.products.filter(p => !p.deletedAt);
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(p => 
        p.sku.toLowerCase().includes(searchLower) ||
        p.name.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.categoryId) {
      products = products.filter(p => p.categoryId === filters.categoryId);
    }
    
    if (filters.visible !== "all") {
      products = products.filter(p => 
        filters.visible === "visible" ? p.visible : !p.visible
      );
    }
    
    if (filters.taxable !== "all") {
      products = products.filter(p => 
        filters.taxable === "taxable" ? p.isTaxable : !p.isTaxable
      );
    }
    
    return products;
  }, [state.products, filters]);

  const handleEditProduct = (product: Product) => {
    console.log("Edit product:", product.localId);
  };

  const handlePriceProduct = (product: Product) => {
    console.log("Price product:", product.localId);
  };

  const handleDeleteProduct = (product: Product) => {
    console.log("Delete product:", product.localId);
  };

  const activeCategories = state.categories.filter(c => !c.deletedAt);

  const productsTab = (
    <div>
      <ProductsFilters
        categories={activeCategories}
        filters={filters}
        onChange={setFilters}
      />
      {filteredProducts.length > 0 ? (
        <ProductsDataTable
          products={state.products}
          categories={activeCategories}
          presentations={state.presentations}
          exchangeRate={exchangeRate}
          onEdit={handleEditProduct}
          onPrice={handlePriceProduct}
          onDelete={handleDeleteProduct}
        />
      ) : (
        <EmptyState
          icon={<Box className="w-12 h-12 text-content-tertiary" />}
          title="No hay productos"
          description="No se encontraron productos que coincidan con los filtros seleccionados."
        />
      )}
    </div>
  );

  const categoriesTab = (
    <div>
      {activeCategories.length > 0 ? (
        <div className="space-y-2">
          {activeCategories.map(category => (
            <div key={category.localId} className="card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-content-primary">{category.name}</h3>
                <p className="text-sm text-content-secondary">
                  {state.products.filter(p => p.categoryId === category.localId && !p.deletedAt).length} productos
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Folder className="w-12 h-12 text-content-tertiary" />}
          title="No hay categorías"
          description="Las categorías se crean desde el módulo de Compras."
        />
      )}
    </div>
  );

  const presentationsTab = (
    <div>
      {state.presentations.length > 0 ? (
        <div className="space-y-2">
          {state.presentations.map(presentation => {
            const product = state.products.find(p => p.localId === presentation.productLocalId);
            return (
              <div key={presentation.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-content-primary">{presentation.name}</h3>
                  <p className="text-sm text-content-secondary">
                    {product?.name ?? "Producto no encontrado"} (x{presentation.factor})
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-content-primary">
                    ${presentation.price?.toFixed(2) ?? "0.00"} USD
                  </p>
                  <p className="text-sm text-content-secondary">
                    {((presentation.price ?? 0) * exchangeRate).toLocaleString("es-VE")} Bs
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Scale className="w-12 h-12 text-content-tertiary" />}
          title="No hay presentaciones"
          description="Las presentaciones se crean desde el módulo de Compras."
        />
      )}
    </div>
  );

  const variantsTab = (
    <div>
      {state.sizeColors.length > 0 ? (
        <div className="space-y-2">
          {state.sizeColors.filter(sc => !sc.deletedAt).map(variant => {
            const product = state.products.find(p => p.localId === variant.productLocalId);
            return (
              <div key={variant.localId} className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-content-primary">{product?.name ?? "Producto no encontrado"}</h3>
                  <div className="flex gap-2 mt-1">
                    {variant.size && (
                      <span className="badge badge-info">{variant.size}</span>
                    )}
                    {variant.color && (
                      <span className="badge badge-warning">{variant.color}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {variant.skuSuffix && (
                    <p className="text-sm font-mono text-content-secondary">{variant.skuSuffix}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Shirt className="w-12 h-12 text-content-tertiary" />}
          title="No hay variantes"
          description="Las variantes (tallas/colores) se crean desde el módulo de Compras."
        />
      )}
    </div>
  );

  const tabItems = [
    { id: "products", label: "Todos los Productos", content: productsTab },
    { id: "categories", label: "Categorías", content: categoriesTab },
    { id: "presentations", label: "Presentaciones", content: presentationsTab },
    { id: "variants", label: "Variantes", content: variantsTab }
  ];

  return (
    <section className="p-6">
      {state.lastError ? (
        <div className="alert alert-error mb-4">
          {state.lastError.message}
        </div>
      ) : null}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-content-primary mb-1">Maestro de Catálogo</h1>
        <p className="text-content-secondary">Gestiona tus productos, categorías y presentaciones</p>
      </div>

      <KPIHeader
        products={state.products}
        categories={state.categories}
      />

      <Tabs
        items={tabItems}
        variant="pills"
        defaultTab="products"
      />
    </section>
  );
}
