import { useEffect, useState, useMemo, useRef } from "react";
import { Box, Folder, Scale, Shirt, Download, Loader2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { eventBus } from "@/lib/core/runtime";
import { useProducts } from "../hooks/useProducts";
import { productsService } from "../services/products.service.instance";
import { adminService } from "@/features/admin/services/admin.service.instance";
import type { ProductsActorContext, Product } from "../types/products.types";
import { Tabs } from "@/common/components/Tabs";
import { Alert } from "@/common/components/Alert";
import { Button } from "@/common/components/Button";
import { Card } from "@/common/components/Card";
import { Badge } from "@/common/components/Badge";
import { Checkbox } from "@/common";
import { KPIHeader } from "./KPIHeader";
import { ProductsDataTable } from "./ProductsDataTable";
import { ProductsFilters, type ProductsFiltersState } from "./ProductsFilters";
import { EmptyState } from "@/common/components/EmptyState";
import { Modal } from "@/common/components/Modal";
import type { GlobalProduct } from "@/features/admin/types/admin.types";
import { useToast } from "@/common/stores/toastStore";

const DEFAULT_EXCHANGE_RATE = 480;

function VirtualizedGlobalProductList({
  products,
  selectedProducts,
  onToggle,
  containerRef
}: {
  products: GlobalProduct[];
  selectedProducts: Set<string>;
  onToggle: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 72,
    overscan: 10
  });

  return (
    <div
      ref={containerRef}
      className="max-h-96 overflow-y-auto border border-surface-200 rounded"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative"
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const product = products[virtualRow.index];
          if (!product) return null;
          return (
            <div
              key={product.id}
              data-index={virtualRow.index}
              className="flex items-center gap-3 p-3 hover:bg-surface-50 border-b border-surface-100 absolute w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  label=""
                  checked={selectedProducts.has(product.id)}
                  onChange={() => onToggle(product.id)}
                />
              </label>
              <div className="flex-1">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-content-secondary">
                  SKU: {product.sku} | Presentaciones: {product.presentations.length}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProductsCatalogProps {
  tenantSlug: string;
  actor: ProductsActorContext;
  exchangeRate?: number;
  businessTypeId?: string | undefined;
  maxProducts?: number | undefined;
  features?: Record<string, boolean> | undefined;
}

export function ProductsCatalog({ tenantSlug, actor, exchangeRate: exchangeRateFromApp, businessTypeId, maxProducts, features }: ProductsCatalogProps) {
  const tenantContext = useMemo(() => ({ tenantSlug, maxProducts, features }), [tenantSlug, maxProducts, features]);
  const { state, refresh } = useProducts({
    service: productsService,
    tenant: tenantContext,
    actor
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [filters, setFilters] = useState<ProductsFiltersState>({
    search: "",
    categoryId: "",
    visible: "all",
    taxable: "all"
  });

  const toast = useToast();
  const [showImportModal, setShowImportModal] = useState(false);
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [globalProductsLoading, setGlobalProductsLoading] = useState(false);
  const [globalProductsCount, setGlobalProductsCount] = useState<number>(0);
  const [selectedGlobalProducts, setSelectedGlobalProducts] = useState<Set<string>>(new Set());
  const [importingProducts, setImportingProducts] = useState(false);
  const globalProductsContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { refresh(); }, [refresh]);

  const [prevRate, setPrevRate] = useState(exchangeRateFromApp);
  if (exchangeRateFromApp !== prevRate) {
    setExchangeRate(exchangeRateFromApp ?? DEFAULT_EXCHANGE_RATE);
    setPrevRate(exchangeRateFromApp);
  }

  useEffect(() => {
    if (!businessTypeId) return;
    let cancelled = false;
    void (async () => {
      const result = await adminService.listGlobalProducts(businessTypeId);
      if (!cancelled && result.ok) {
        setGlobalProductsCount(result.data.length);
      }
    })();
    return () => { cancelled = true; };
  }, [businessTypeId]);

  useEffect(() => {
    const offCreatedCategory = eventBus.on("CATEGORY.CREATED", () => {
      void refresh();
    });
    const offCreatedProduct = eventBus.on("PRODUCT.CREATED", () => {
      void refresh();
    });
    const offCreatedPresentation = eventBus.on(
      "PRESENTATION.CREATED",
      () => {
        void refresh();
      }
    );
    const offDeletedCategory = eventBus.on("CATEGORY.DELETED", () => {
      void refresh();
    });
    const offDeletedProduct = eventBus.on("PRODUCT.DELETED", () => {
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

  const handleOpenImportModal = async () => {
    setShowImportModal(true);
    setGlobalProductsLoading(true);
    try {
      const result = await adminService.listGlobalProducts(businessTypeId);
      if (result.ok) {
        setGlobalProducts(result.data);
        setGlobalProductsCount(result.data.length);
      }
    } finally {
      setGlobalProductsLoading(false);
    }
  };

  const handleToggleGlobalProduct = (productId: string) => {
    setSelectedGlobalProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleImportSelected = async () => {
    if (selectedGlobalProducts.size === 0) {
      toast.warning("Seleccione al menos un producto");
      return;
    }

    setImportingProducts(true);
    try {
      const productsToImport = globalProducts.filter((p) => selectedGlobalProducts.has(p.id));

      const importData = productsToImport.map((p) => {
        const item = {
          id: p.id,
          name: p.name,
          sku: p.sku,
          isWeighted: p.isWeighted,
          unitOfMeasure: p.unitOfMeasure,
          isTaxable: p.isTaxable,
          isSerialized: p.isSerialized,
          visible: p.visible,
          presentations: p.presentations.map((pres) => {
            const pItem: Record<string, unknown> = {
              name: pres.name,
              factor: pres.factor,
              price: pres.price,
              isDefault: pres.isDefault
            };
            if (pres.barcode) pItem.barcode = pres.barcode;
            return pItem as { name: string; factor: number; price: number; isDefault: boolean; barcode?: string };
          })
        };

        if (p.description) (item as Record<string, unknown>).description = p.description;
        if (p.categoryId) (item as Record<string, unknown>).categoryId = p.categoryId;
        if (p.weight) (item as Record<string, unknown>).weight = p.weight;
        if (p.length) (item as Record<string, unknown>).length = p.length;
        if (p.width) (item as Record<string, unknown>).width = p.width;
        if (p.height) (item as Record<string, unknown>).height = p.height;

        return item as Parameters<typeof productsService.importGlobalProducts>[1][number];
      });

      const result = await productsService.importGlobalProducts({ tenantSlug }, importData);

      if (result.ok) {
        toast.success(
          `Importados ${result.data.importedProducts} productos con ${result.data.importedPresentations} presentaciones`
        );
        setShowImportModal(false);
        setSelectedGlobalProducts(new Set());
        await refresh();
      } else {
        toast.error(`Error al importar: ${result.error.message}`);
      }
    } finally {
      setImportingProducts(false);
    }
  };

  const handleEditProduct = async (_product: Product) => {
  };

  const handlePriceProduct = async (_product: Product) => {
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `¿Eliminar producto "${product.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    
    try {
      await productsService.deleteProduct(
        { tenantSlug },
        actor,
        product.localId
      );
      eventBus.emit("PRODUCT.DELETED", { localId: product.localId });
      await refresh();
    } catch { /* Silently ignore delete errors, UI shows toast from hook */ }
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
            <Card key={category.localId} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-content-primary">{category.name}</h3>
                <p className="text-sm text-content-secondary">
                  {state.products.filter(p => p.categoryId === category.localId && !p.deletedAt).length} productos
                </p>
              </div>
            </Card>
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
              <Card key={presentation.id} className="flex items-center justify-between">
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
              </Card>
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
              <Card key={variant.localId} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-content-primary">{product?.name ?? "Producto no encontrado"}</h3>
                  <div className="flex gap-2 mt-1">
                    {variant.size && (
                      <Badge variant="info">{variant.size}</Badge>
                    )}
                    {variant.color && (
                      <Badge variant="warning">{variant.color}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {variant.skuSuffix && (
                    <p className="text-sm font-mono text-content-secondary">{variant.skuSuffix}</p>
                  )}
                </div>
              </Card>
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
        <Alert variant="error" className="mb-4">
          {state.lastError.message}
        </Alert>
      ) : null}
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content-primary mb-1">Maestro de Catálogo</h1>
            <p className="text-content-secondary">Gestiona tus productos, categorías y presentaciones</p>
          </div>
          <Button
            onClick={handleOpenImportModal}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Importar del Catálogo Global
          </Button>
        </div>
      </div>

      <KPIHeader
        products={state.products}
        categories={state.categories}
        globalProductsCount={globalProductsCount}
      />

      <Tabs
        items={tabItems}
        variant="pills"
        defaultTab="products"
      />

      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Importar del Catálogo Global"
          size="lg"
        >
          <div className="space-y-4">
            {globalProductsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                <span className="ml-2">Cargando productos globales...</span>
              </div>
            ) : globalProducts.length === 0 ? (
              <p className="text-content-secondary text-center p-4">
                No hay productos globales disponibles.
              </p>
            ) : (
              <>
                <div className="text-sm text-content-secondary mb-2">
                  Seleccione los productos a importar: {selectedGlobalProducts.size} seleccionados
                </div>
                {globalProducts.length > 100 ? (
                  <VirtualizedGlobalProductList
                    products={globalProducts}
                    selectedProducts={selectedGlobalProducts}
                    onToggle={handleToggleGlobalProduct}
                    containerRef={globalProductsContainerRef}
                  />
                ) : (
                  <div className="max-h-96 overflow-y-auto border border-surface-200 rounded">
                    {globalProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 hover:bg-surface-50 border-b border-surface-100"
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            label=""
                            checked={selectedGlobalProducts.has(product.id)}
                            onChange={() => handleToggleGlobalProduct(product.id)}
                          />
                        </label>
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-content-secondary">
                            SKU: {product.sku} | Presentaciones: {product.presentations.length}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

             <div className="flex justify-end gap-2 pt-4">
               <Button
                 onClick={() => setShowImportModal(false)}
                 variant="ghost"
                 disabled={importingProducts}
               >
                 Cancelar
               </Button>
               <Button
                 onClick={handleImportSelected}
                 disabled={selectedGlobalProducts.size === 0 || importingProducts}
                 variant="primary"
                 className="flex items-center gap-2"
               >
                 {importingProducts ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Importando...
                   </>
                 ) : (
                   <>
                     <Download className="w-4 h-4" />
                     Importar ({selectedGlobalProducts.size})
                   </>
                 )}
               </Button>
             </div>

          </div>
        </Modal>
      )}
    </section>
  );
}
